// Trialbank: links to question and solution images that were moved to Backblaze B2 (private bucket), many at once.
// Only images of questions the student is allowed to see: the questions table's own rules decide.
// Each link stays the same for a whole day, so the browser keeps the image instead of downloading it again
// (B2's free tier counts every download). Secrets: B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT.
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
  if (!keyId || !appKey || !bucket || !endpoint) return json({ error: 'Image storage is not set up yet.' }, 503);

  let body: { paths?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const paths = [...new Set((Array.isArray(body.paths) ? body.paths : []).map(String))]
    .filter((p) => /^b2:[\w.-]+(\/[\w.-]+)+\.(webp|png|jpe?g)$/.test(p) && !p.includes('..')).slice(0, 400);
  if (!paths.length) return json({ urls: {} });

  // ask as the student, so row-level security only returns questions they can open
  const auth = req.headers.get('Authorization') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const allowed = new Set<string>();
  for (let i = 0; i < paths.length; i += 80) {
    const list = paths.slice(i, i + 80).map((p) => `"${p}"`).join(',');
    const { data, error } = await db.from('questions').select('image_path, solution_path')
      .or(`image_path.in.(${list}),solution_path.in.(${list})`).limit(2000);
    if (error) { console.error(error); return json({ error: 'Could not check those questions.' }, 500); }
    (data ?? []).forEach((r) => { if (r.image_path) allowed.add(r.image_path); if (r.solution_path) allowed.add(r.solution_path); });
  }

  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  const datetime = day.toISOString().replace(/[:-]|\.\d{3}/g, '');            // YYYYMMDDT000000Z: one link per image per day
  const aws = new AwsClient({ accessKeyId: keyId, secretAccessKey: appKey, service: 's3', region: endpoint.split('.')[1] ?? 'us-west-004' });
  const urls: Record<string, string> = {};
  await Promise.all(paths.filter((p) => allowed.has(p)).map(async (p) => {
    const url = new URL(`https://${endpoint}/${bucket}/${p.slice(3).split('/').map(encodeURIComponent).join('/')}`);
    url.searchParams.set('X-Amz-Expires', String(2 * 86400));                   // good until the end of tomorrow
    url.searchParams.set('response-cache-control', 'private, max-age=86400');
    const signed = await aws.sign(url.toString(), { method: 'GET', aws: { signQuery: true, datetime } });
    urls[p] = signed.url;
  }));
  return json({ urls });
});
