// Question and solution images live in Supabase storage ('questions' bucket) or, once moved to save space,
// in the private Backblaze B2 bucket. Moved images keep their path with a 'b2:' in front (b2:<slug>/q11a.webp).
// Secrets for B2: B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT (already set for pdf-url).
import { AwsClient } from 'npm:aws4fetch@1.0.20';

// same shape as supabase-js storage download(): { data: Blob | null, error }
// deno-lint-ignore no-explicit-any
export async function download(admin: any, bucket: string, path: string): Promise<{ data: Blob | null; error: unknown }> {
  if (!path.startsWith('b2:')) return await admin.storage.from(bucket).download(path);
  try {
    const keyId = Deno.env.get('B2_KEY_ID'), appKey = Deno.env.get('B2_APP_KEY');
    const b = Deno.env.get('B2_BUCKET'), endpoint = (Deno.env.get('B2_ENDPOINT') ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!keyId || !appKey || !b || !endpoint) return { data: null, error: new Error('B2 is not set up') };
    const aws = new AwsClient({ accessKeyId: keyId, secretAccessKey: appKey, service: 's3', region: endpoint.split('.')[1] ?? 'us-west-004' });
    const r = await aws.fetch(`https://${endpoint}/${b}/${path.slice(3).split('/').map(encodeURIComponent).join('/')}`);
    if (!r.ok) return { data: null, error: new Error(`B2 ${r.status}`) };
    return { data: await r.blob(), error: null };
  } catch (e) { return { data: null, error: e }; }
}
