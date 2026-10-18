// Trialbank: Stripe tells us a payment went through, and we add the marks to that student's balance.
// Deploy with --no-verify-jwt (Stripe can't sign in). Every request is checked against Stripe's signature instead.
// Secrets: STRIPE_WEBHOOK_SECRET (whsec_...)
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

function serviceKey() {
  let k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try { const ks = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); const v = ks.default ?? Object.values(ks)[0]; if (typeof v === 'string' && v) k = v; } catch { /* legacy */ }
  return k;
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
function same(a: string, b: string) {          // constant-time compare
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function verified(raw: string, header: string, secret: string) {
  const items = header.split(',').map((p) => p.split('='));
  const t = items.find(([k]) => k === 't')?.[1];
  const sigs = items.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;      // older than 5 minutes: replay
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)));
  return sigs.some((s) => same(s, mac));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('not set up', { status: 503 });
  const raw = await req.text();
  if (!(await verified(raw, req.headers.get('stripe-signature') ?? '', secret))) return new Response('bad signature', { status: 400 });

  const event = JSON.parse(raw);
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return new Response('ignored', { status: 200 });
  }
  const s = event.data?.object ?? {};
  if (s.payment_status !== 'paid') return new Response('not paid yet', { status: 200 });
  const uid = s.metadata?.user_id ?? s.client_reference_id;
  const marks = Number(s.metadata?.marks);
  if (!uid || !Number.isInteger(marks) || marks <= 0) return new Response('missing metadata', { status: 200 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } });
  const { error } = await admin.rpc('add_marks', {
    uid, n: marks, k: 'purchase', r: s.id,
    nt: `${marks} marks, ${(Number(s.amount_total) / 100).toFixed(2)} ${String(s.currency ?? '').toUpperCase()}`,
  });
  if (error) return new Response('could not add marks', { status: 500 });      // Stripe retries on 500
  return new Response('ok', { status: 200 });
});
