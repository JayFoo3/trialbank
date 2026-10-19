// Trialbank: start a Stripe Checkout for a pack of auto-marks or a Pro subscription, or open the billing portal.
// Returns the Stripe page URL.
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICES = {"10":"prod_...","25":"prod_...","60":"prod_..."} (product or price ids),
//          STRIPE_PRO_PRICES = {"monthly":"price_...","annual":"price_..."}
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const SITE = 'https://jayfoo3.github.io/trialbank/';
const ORIGINS = ['https://jayfoo3.github.io', 'http://localhost:8765'];
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function serviceKey() {
  let k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try { const ks = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); const v = ks.default ?? Object.values(ks)[0]; if (typeof v === 'string' && v) k = v; } catch { /* legacy */ }
  return k;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  let prices: Record<string, string> = {}, proPrices: Record<string, string> = {};
  try { prices = JSON.parse(Deno.env.get('STRIPE_PRICES') ?? '{}'); } catch { /* none */ }
  try { proPrices = JSON.parse(Deno.env.get('STRIPE_PRO_PRICES') ?? '{}'); } catch { /* none */ }
  if (!stripeKey) return json({ error: 'Payments are not set up yet.' }, 503);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: ures } = await admin.auth.getUser(token);
  const user = ures?.user;
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  let body: { pack?: string; plan?: string; portal?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const stripe = async (path: string, form?: URLSearchParams) => {
    const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: form ? 'POST' : 'GET', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    return { ok: r.ok, out: await r.json() };
  };
  const origin0 = req.headers.get('origin') ?? '';
  const base0 = ORIGINS.includes(origin0) ? (origin0 === 'https://jayfoo3.github.io' ? SITE : origin0 + '/') : SITE;
  const { data: sub } = await admin.from('subscriptions').select('customer, status, period_end').eq('user_id', user.id).maybeSingle();

  // manage an existing subscription: Stripe's billing portal (change plan, card, cancel)
  if (body.portal) {
    if (!sub?.customer) return json({ error: "You don't have a Pro subscription yet." }, 400);
    const { ok, out } = await stripe('billing_portal/sessions', new URLSearchParams({ customer: sub.customer, return_url: `${base0}#profile` }));
    if (!ok || !out.url) return json({ error: 'Could not open your subscription. Try again in a minute.' }, 502);
    return json({ url: out.url });
  }

  // Pro: monthly or annual subscription
  if (body.plan) {
    const plan = String(body.plan);
    const price = proPrices[plan];
    if (!price || !['monthly', 'annual'].includes(plan)) return json({ error: 'Pro is not set up yet.' }, 503);
    const { data: info } = await admin.rpc('access_info', { uid: user.id });
    const { data: st } = await admin.from('settings').select('value').eq('key', 'pro_sales').maybeSingle();
    const sale = st?.value ?? 'admin';
    if (sale !== 'on' && !(sale === 'admin' && info?.level === 'admin')) return json({ error: 'Pro opens soon.' }, 403);
    if (sub && ['active', 'trialing', 'past_due'].includes(sub.status ?? '') && new Date(sub.period_end) > new Date()) return json({ error: "You're already on Pro." }, 400);
    const form = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': price,
      'line_items[0][quantity]': '1',
      success_url: `${base0}?pro=${plan}#home`,
      cancel_url: `${base0}#home`,
      client_reference_id: user.id,
      'metadata[user_id]': user.id,
      'metadata[plan]': plan,
      'subscription_data[metadata][user_id]': user.id,
      'subscription_data[metadata][plan]': plan,
      allow_promotion_codes: 'true',
    });
    if (sub?.customer) form.set('customer', sub.customer); else if (user.email) form.set('customer_email', user.email);
    const { ok, out } = await stripe('checkout/sessions', form);
    if (!ok || !out.url) return json({ error: 'Could not start the payment. Try again in a minute.' }, 502);
    return json({ url: out.url });
  }

  // marking packs
  if (!Object.keys(prices).length) return json({ error: 'Buying marks is not set up yet.' }, 503);
  const { data: allowed } = await admin.rpc('can_buy_for', { uid: user.id });
  if (!allowed) return json({ error: "Marking packs aren't available on your account yet." }, 403);
  const pack = String(body.pack ?? '');
  let price = prices[pack];
  const marks = Number(pack);
  if (!price || !Number.isInteger(marks) || marks <= 0) return json({ error: 'Unknown pack' }, 400);
  if (price.startsWith('prod_')) {      // a product id: use its default price
    const pr = await fetch(`https://api.stripe.com/v1/products/${encodeURIComponent(price)}`, { headers: { Authorization: `Bearer ${stripeKey}` } });
    const p = await pr.json();
    price = typeof p.default_price === 'string' ? p.default_price : p.default_price?.id;
    if (!pr.ok || !price) return json({ error: 'That pack is not set up properly yet.' }, 503);
  }

  const origin = req.headers.get('origin') ?? '';
  const base = ORIGINS.includes(origin) ? (origin === 'https://jayfoo3.github.io' ? SITE : origin + '/') : SITE;
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${base}?bought=${marks}#home`,
    cancel_url: `${base}#home`,
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'metadata[marks]': String(marks),
    'payment_intent_data[metadata][user_id]': user.id,
    'payment_intent_data[metadata][marks]': String(marks),
  });
  if (user.email) form.set('customer_email', user.email);
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const out = await r.json();
  if (!r.ok || !out.url) return json({ error: 'Could not start the payment. Try again in a minute.' }, 502);
  return json({ url: out.url });
});
