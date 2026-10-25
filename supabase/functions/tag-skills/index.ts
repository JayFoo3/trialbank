// Trialbank: tag questions with the syllabus steps they need (admins only).
// The site sends a topic's steps in teaching order; each untagged question in that topic is read once by Claude
// and gets questions.skills = the step ids it needs. Students can then say how far into a topic their class is.
// Secrets: ANTHROPIC_API_KEY. SUPABASE_URL and the service key are provided automatically.
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const MODEL = Deno.env.get('TAG_MODEL') ?? 'claude-sonnet-5-5';
const PRICE = { in: 2, out: 10 };   // USD per million tokens (Sonnet 5.5)
const PER_CALL = 8;                 // questions per request, read in parallel
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const mediaType = (path: string, t?: string) =>
  t && t.startsWith('image/') ? t : path.endsWith('.webp') ? 'image/webp' : path.endsWith('.png') ? 'image/png' : 'image/jpeg';

const SYSTEM = (subject: string, topic: string, steps: { id: string; label: string }[]) => `You are an experienced NSW HSC ${subject} teacher.
A class learns the topic "${topic}" in these steps, in this order:
${steps.map((s) => `${s.id}: ${s.label}`).join('\n')}

You are shown one exam question (it may have several parts). List every step a student must have learnt to answer ALL of it fully.
- Include a step only if the question really needs it, not just because it is related.
- Earlier steps that the needed ones build on do not need listing; the app already assumes them.
- If part of the question needs something outside this topic, still list only steps from this list, and set outside=true.
Always reply by calling record_steps once.`;
const TOOL = {
  name: 'record_steps',
  description: 'Record the steps this question needs.',
  input_schema: {
    type: 'object',
    properties: {
      steps: { type: 'array', items: { type: 'string' }, description: 'ids of the steps the question needs' },
      outside: { type: 'boolean', description: 'true if part of the question needs content from another topic' },
    },
    required: ['steps', 'outside'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  let service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try { const ks = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); const k = ks.default ?? Object.values(ks)[0]; if (typeof k === 'string' && k) service = k; } catch { /* legacy key */ }
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'No API key set.' }, 503);
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: ures } = await admin.auth.getUser(token);
  const user = ures?.user;
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  const { data: srow } = await admin.from('settings').select('value').eq('key', 'admin_emails').maybeSingle();
  const me = user.email_confirmed_at ? String(user.email ?? '').trim().toLowerCase() : '';
  const isAdmin = !!me && String(srow?.value ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(me);
  if (!isAdmin) return json({ error: 'Admins only.' }, 403);

  let body: { subject?: string; subject_name?: string; topic?: string; steps?: { id: string; label: string }[]; retag?: string[] };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const steps = (body.steps ?? []).filter((s) => s && typeof s.id === 'string' && typeof s.label === 'string').slice(0, 20);
  if (!body.subject || !body.topic || !steps.length) return json({ error: 'Need subject, topic and steps.' }, 400);
  const ids = new Set(steps.map((s) => s.id));

  // this topic's questions in the subject; tag the untagged ones (or the ones asked to be redone)
  const { data: qs, error } = await admin.from('questions').select('id, image_path, skills, papers!inner(subject)')
    .eq('papers.subject', body.subject).eq('topic', body.topic).not('image_path', 'is', null).limit(2000);
  if (error) { console.error(error); return json({ error: 'Could not read the questions.' }, 500); }
  const redo = new Set((body.retag ?? []).map(String));
  const todo = (qs ?? []).filter((q) => redo.size ? redo.has(String(q.id)) : q.skills == null).slice(0, PER_CALL);
  let cost = 0, failed = 0;
  await Promise.all(todo.map(async (q) => {
    try {
      const { data: file, error: ferr } = await admin.storage.from('questions').download(q.image_path);
      if (ferr || !file) throw new Error('missing image');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM(body.subject_name || body.subject!, body.topic!, steps),
          tools: [TOOL], tool_choice: { type: 'tool', name: 'record_steps' },
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType(q.image_path, file.type), data: encodeBase64(new Uint8Array(await file.arrayBuffer())) } }, { type: 'text', text: 'Which steps does this question need?' }] }] }),
      });
      const out = await r.json();
      const u = out.usage ?? {};
      cost += ((u.input_tokens ?? 0) * PRICE.in + (u.output_tokens ?? 0) * PRICE.out) / 1e6;
      const t = (out.content ?? []).find((c: { type: string }) => c.type === 'tool_use')?.input;
      if (!r.ok || !t) throw new Error('no answer');
      const got = [...new Set((t.steps ?? []).map(String).filter((s: string) => ids.has(s)))];
      const skills = got.length ? got : [steps[0].id];
      if (t.outside) skills.push('outside');
      await admin.from('questions').update({ skills }).eq('id', q.id);
    } catch (e) { failed++; console.warn('tag', q.id, String(e)); }
  }));
  const left = (qs ?? []).filter((q) => q.skills == null).length - (redo.size ? 0 : todo.length - failed);
  return json({ done: todo.length - failed, failed, left: Math.max(0, left), total: (qs ?? []).length, cost_usd: Number(cost.toFixed(4)) });
});
