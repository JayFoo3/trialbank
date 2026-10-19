// Trialbank: a short-lived link to a paper PDF stored in Backblaze B2 (private bucket).
// The student must be signed in and allowed to see that paper (the papers table's own rules decide).
// Secrets: B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT (e.g. s3.us-west-004.backblazeb2.com)
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const keyId = Deno.env.get('B2_KEY_ID'), appKey = Deno.env.get('B2_APP_KEY');
  const bucket = Deno.env.get('B2_BUCKET'), endpoint = (Deno.env.get('B2_ENDPOINT') ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!keyId || !appKey || !bucket || !endpoint) return json({ error: 'PDF storage is not set up yet.' }, 503);

  let body: { path?: string; secs?: number; filename?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const path = String(body.path ?? '');
  if (!/^[\w.-]+\/[\w-]+\.pdf$/.test(path)) return json({ error: 'Bad path' }, 400);
  const secs = Math.max(60, Math.min(3600, Math.round(Number(body.secs) || 300)));

  // ask as the student: row-level security only returns papers they're allowed to open
  const auth = req.headers.get('Authorization') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!u?.user) return json({ error: 'Please sign in again.' }, 401);
  const { data: rows, error } = await sb.from('papers').select('id')
    .or(`pdf_path.eq.${path},pdf_sol_path.eq.${path}`).limit(1);
  if (error) return json({ error: error.message }, 500);
  if (!rows?.length) return json({ error: "That paper isn't open on your account." }, 403);

  const region = endpoint.split('.')[1] ?? 'us-west-004';          // s3.<region>.backblazeb2.com
  const url = new URL(`https://${endpoint}/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`);
  url.searchParams.set('X-Amz-Expires', String(secs));
  if (body.filename) {
    const name = String(body.filename).replace(/[^\w. -]/g, '').slice(0, 120) || 'paper.pdf';
    url.searchParams.set('response-content-disposition', `attachment; filename="${name}"`);
  }
  const aws = new AwsClient({ accessKeyId: keyId, secretAccessKey: appKey, service: 's3', region });
  const signed = await aws.sign(url.toString(), { method: 'GET', aws: { signQuery: true } });
  return json({ url: signed.url });
});
