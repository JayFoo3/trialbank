// Trialbank: nightly data clean-up, run by a scheduled job (see supabase/privacy.sql).
// Deletes uploaded photos older than 7 days, profile photos left by deleted accounts, and old page-visit logs.
// It takes no input and only removes what's already past its keep-by date, so it's safe for anyone to trigger.
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  let service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try { const ks = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); const k = ks.default ?? Object.values(ks)[0]; if (typeof k === 'string' && k) service = k; } catch { /* legacy key */ }
  const admin = createClient(url, service, { auth: { persistSession: false } });

  let removed = 0;
  for (let round = 0; round < 5; round++) {   // up to 5,000 files a night
    const { data, error } = await admin.rpc('expired_uploads', { lim: 1000 });
    if (error) { console.error(error); return json({ error: 'could not list files' }, 500); }
    const rows = (data ?? []) as { bucket: string; name: string }[];
    if (!rows.length) break;
    for (const bucket of ['submissions', 'profile']) {
      const names = rows.filter((r) => r.bucket === bucket).map((r) => r.name);
      for (let i = 0; i < names.length; i += 100) {
        const { error: rerr } = await admin.storage.from(bucket).remove(names.slice(i, i + 100));
        if (rerr) { console.error(rerr); return json({ error: 'could not remove files', removed }, 500); }
        removed += Math.min(100, names.length - i);
      }
    }
    if (rows.length < 1000) break;
  }
  const { data: logs } = await admin.rpc('privacy_cleanup');
  return json({ removed, ...(logs ?? {}) });
});
