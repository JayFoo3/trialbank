// Trialbank: the admin's test account. Admins only.
//   { action: 'switch' } -> makes the test account if needed and returns a one-time sign-in token for it
//   { action: 'reset' }  -> deletes the test account and everything on it (marks, purchases, attempts, level)
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

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
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: ures } = await admin.auth.getUser(token);
  const me = ures?.user;
  if (!me) return json({ error: 'Please sign in again.' }, 401);

  const { data: rows } = await admin.from('settings').select('key, value').in('key', ['admin_emails', 'test_email']);
  const s = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
  const admins = String(s.admin_emails ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes((me.email ?? '').toLowerCase())) return json({ error: 'Admins only' }, 403);
  const email = String(s.test_email ?? '').trim().toLowerCase();
  if (!email) return json({ error: 'No test_email in settings.' }, 500);

  let body: { action?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const { data: found } = await admin.rpc('admin_user_id', { target_email: email });
  if (body.action === 'reset') {
    if (found) { const { error } = await admin.auth.admin.deleteUser(String(found)); if (error) return json({ error: error.message }, 500); }
    return json({ ok: true, email });
  }
  if (body.action !== 'switch') return json({ error: 'Unknown action' }, 400);
  if (!found) {
    const { error } = await admin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { first_name: 'Test', subjects: ['Ext1', 'Adv'] },
    });
    if (error) return json({ error: error.message }, 500);
  }
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !link?.properties?.hashed_token) return json({ error: error?.message ?? 'Could not sign in as the test account.' }, 500);
  return json({ email, token_hash: link.properties.hashed_token });
});
