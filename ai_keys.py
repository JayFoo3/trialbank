#!/usr/bin/env python3
"""ai_keys.py - give every multiple-choice question that has no answer key an answer worked out by AI.

Run it after cutting and uploading new papers. For each paper, Claude answers its unkeyed questions twice, separately;
only answers both runs agree on are kept. They go into ai_keys.json (so re-uploads keep them) and into Supabase, marked
answer_source = 'ai' so the site can say the answer wasn't from the paper's own key.
  cd ~/Documents/question-bank && SUPABASE_URL=... SUPABASE_SERVICE_KEY=... caffeinate -i python3 ai_keys.py [--only SLUG] [--dry] [--push]"""
import glob, json, os, re, shutil, subprocess, sys, tempfile
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
DRY = '--dry' in sys.argv
ONLY = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
CLAUDE = shutil.which('claude') or os.path.expanduser('~/.local/bin/claude')
SUBJ = {'bio': 'Biology', 'econ': 'Economics', 'adv': 'Mathematics Advanced', 'ext1': 'Mathematics Extension 1', 'ext2': 'Mathematics Extension 2',
        'std2': 'Mathematics Standard 2', 'physics': 'Physics', 'eng': 'Engineering Studies', 'se': 'Software Engineering'}
PROMPT = """You are an expert NSW HSC {subject} teacher. Each image file in this folder is one multiple-choice question with options A-D:
{files}
Open every file with the Read tool and work out the correct option yourself, carefully (do any calculations properly).
If a question is unreadable or depends on a stimulus that isn't shown, give null.
Reply with ONLY a JSON object mapping each file name to "A", "B", "C", "D" or null, nothing else."""

if not DRY and (not URL or not KEY): sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first (or use --dry).')
path = os.path.join(HERE, 'ai_keys.json')
ai = json.load(open(path)) if os.path.exists(path) else {}
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}


def ask(folder, names, subject):
    run = subprocess.run([CLAUDE, '-p', '--model', 'sonnet', '--allowedTools', 'Read', '--permission-mode', 'dontAsk'],
                         input=PROMPT.format(subject=subject, files='\n'.join(names)), capture_output=True, text=True, cwd=folder, timeout=1200)
    m = re.search(r'\{[\s\S]*\}', run.stdout)
    if run.returncode != 0 or not m:
        raise RuntimeError((run.stderr + run.stdout)[-300:])
    return json.loads(m.group(0))


if '--push' in sys.argv:   # (re)send every saved AI answer to Supabase, e.g. after a batch worked out elsewhere
    for qid, ans in sorted(ai.items()):
        r = requests.patch(f'{URL}/rest/v1/questions?id=eq.{qid}&answer=is.null', headers=H, data=json.dumps({'answer': ans, 'answer_source': 'ai'}), timeout=60)
        if r.status_code >= 300: sys.exit(f'{qid}: {r.status_code} {r.text[:200]}')
    sys.exit(f'pushed {len(ai)} saved AI answers (questions that already had a key were left alone)')
added = 0
for mp in sorted(glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json'))):
    m = json.load(open(mp)); slug = m['slug']
    if ONLY and slug != ONLY: continue
    todo = [q for q in m['questions'] if q['type'] == 'mcq' and not q.get('answer') and f"{slug}/{q['id']}" not in ai and q.get('image')]
    if not todo: continue
    subject = SUBJ.get(slug.split('-')[0], m['subject'])
    with tempfile.TemporaryDirectory() as t:
        names = []
        for q in todo:
            n = f"{q['id']}.png"; shutil.copy(os.path.join(os.path.dirname(mp), q['image']), os.path.join(t, n)); names.append(n)
        try:
            a, b = ask(t, names, subject), ask(t, names, subject)
        except Exception as e:
            print(f'{slug}: Claude failed ({e}); run again later'); continue
    got = {}
    for q, n in zip(todo, names):
        x, y = str(a.get(n) or '').upper(), str(b.get(n) or '').upper()
        if x in ('A', 'B', 'C', 'D') and x == y: got[f"{slug}/{q['id']}"] = x
    for qid, ans in got.items():
        if not DRY:
            r = requests.patch(f'{URL}/rest/v1/questions?id=eq.{qid}', headers=H, data=json.dumps({'answer': ans, 'answer_source': 'ai'}), timeout=60)
            if r.status_code >= 300: sys.exit(f'{qid}: {r.status_code} {r.text[:200]}')
    if not DRY:
        ai.update(got); json.dump(ai, open(path, 'w'), indent=1, sort_keys=True)
    added += len(got)
    print(f'{slug}: {len(got)} of {len(todo)} answered (both runs agreed)')
print(f'done: {added} answers added')
