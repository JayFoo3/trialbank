#!/usr/bin/env python3
"""upload_hsc_rw.py - swap official HSC questions for Trialbank's own versions (hsc_rw/).
Each question in hsc_rw/out/<slug>.json takes over the slot of the HSC question with the same id: it becomes a typed question with our
wording, numbers and worked answer, and the cropped picture of NESA's question (and of NESA's marking guidelines, once no question
still uses it) is deleted from storage. Questions not yet in the file are left as they are. Safe to run again.
Usage: python3 upload_hsc_rw.py hsc-ext1-2023        (keys come from ~/.trialbank_keys)
       python3 upload_hsc_rw.py hsc-ext1-2023 --dry  (say what would change, change nothing)"""
import json, os, sys, requests
import keys  # noqa: F401
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith('--')]; DRY = '--dry' in sys.argv
if len(args) != 1: sys.exit(__doc__)
slug = args[0]

def ok(r, what):
    if r.status_code >= 300: sys.exit(f'{what}: {r.status_code} {r.text[:300]}')
    return r

qs = json.load(open(os.path.join(HERE, 'hsc_rw', 'out', f'{slug}.json')))
paper = ok(requests.get(f'{URL}/rest/v1/papers?slug=eq.{slug}&select=id,difficulty', headers=H, timeout=60), 'paper').json()
if not paper: sys.exit(f'No paper called {slug}')
if paper[0]['difficulty'] != 'HSC': sys.exit(f'{slug} is not an HSC paper')
pid = paper[0]['id']
rows = {r['qid']: r for r in ok(requests.get(f'{URL}/rest/v1/questions?paper_id=eq.{pid}&select=id,qid,type,marks,image_path,solution_path,content&limit=500', headers=H, timeout=60), 'questions').json()}
old_paths, done, skipped = set(), 0, []
for q in qs:
    row = rows.get(q['qid'])
    if not row: skipped.append(f"{q['qid']}: no such question in {slug}"); continue
    marks = q.get('marks', 1)
    if row['type'] != q['type'] or (row['marks'] or 1) != marks:
        skipped.append(f"{q['qid']}: the paper has a {row['type']} worth {row['marks']}, the new version is a {q['type']} worth {marks}"); continue
    if q['type'] == 'mcq':
        content = {'kind': 'single', 'prompt': q['prompt'], 'options': q['options'], 'answer': q['answer'], 'why': q['why'], 'own': True}
    else:
        content = {'kind': 'proof', 'format': q['format'], 'typed': False, 'prompt': q['prompt'], 'solution': q['solution'], 'stmt_text': q['stmt_text'], 'sol_text': q['sol_text'], 'own': True}
    patch = {'content': content, 'answer': q.get('answer'), 'answer_source': None, 'image_path': None, 'solution_path': None, 'subparts': [], 'coarse': False,
             'text': (q.get('stmt_text') or '')[:4000], 'pages': None}
    old_paths.update(p for p in (row['image_path'], row['solution_path']) if p)
    if not DRY:
        ok(requests.patch(f'{URL}/rest/v1/questions?id=eq.' + requests.utils.quote(row['id'], safe=''), headers=H, data=json.dumps(patch), timeout=60), q['qid'])
    done += 1
# pictures no question points at any more
left = ok(requests.get(f'{URL}/rest/v1/questions?paper_id=eq.{pid}&select=qid,image_path,solution_path&limit=500', headers=H, timeout=60), 'questions').json()
swapped = {q['qid'] for q in qs} if DRY else set()
used = {p for r in left if r['qid'] not in swapped for p in (r['image_path'], r['solution_path']) if p}
gone = sorted(old_paths - used)
if gone and not DRY:
    r = requests.delete(f'{URL}/storage/v1/object/questions', headers=H, data=json.dumps({'prefixes': gone}), timeout=120)
    if r.status_code >= 300: print(f'Could not delete the old pictures: {r.status_code} {r.text[:200]}')
still = sum(1 for r in left if r['qid'] not in swapped and r['image_path'])
print(f"{slug}: {done} question{'s' if done != 1 else ''} {'would be' if DRY else 'now'} Trialbank versions, {len(gone)} old picture{'s' if len(gone) != 1 else ''} {'would be ' if DRY else ''}deleted, {still} still pictures of the HSC paper")
for s in skipped: print('  skipped', s)
