#!/usr/bin/env python3
"""upload_quick.py - put quick questions on Trialbank: short textbook-style multiple choice, marked as you tap.
They live in their own hidden 'paper' (slug quick-...), so they never show in the papers list or exam mode.
Reads quick/<slug>.json (made by quick/gen_*.py then quick/render.js).
Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 upload_quick.py quick-adv"""
import json, os, sys, requests
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
HERE = os.path.dirname(os.path.abspath(__file__))
TOPIC = {'wf': 'Working with Functions', 'gt': 'Graphing Techniques', 'tm': 'Trigonometry and Measure of Angles', 'tf': 'Trigonometric Functions and Graphs',
         'id': 'Introduction to Differentiation', 'dc': 'Differential Calculus', 'el': 'Exponential and Logarithmic Functions', 'ad': 'Applications of Differentiation',
         'ic': 'Integral Calculus', 'fm': 'Financial Mathematics', 'pr': 'Probability', 'dp': 'Discrete Probability Distributions',
         'ds': 'Descriptive Statistics and Bivariate Data', 'nd': 'The Normal Distribution',
         'ss': 'Sequences and Series', 'pi': 'Proof Induction', 'be': 'Binom. Exp.', 'pc': 'Perms/Combs', 'rf': 'Rem/Fact Th.', 'sp': 'Sum/Prod. Roots', 'it': 'Inverse Trig Fns'}
SUBJ = {'quick-adv': 'Adv', 'quick-ext1': 'Ext1'}
LEVEL = {'ss1': 1, 'ss2': 1, 'ss5': 1, 'ss3': 2, 'ss6': 2, 'ss4': 3, 'ss7': 3, 'ss8': 3,
         'be1': 1, 'pc1': 1, 'rf2': 1, 'sp1': 1, 'sp2': 1, 'it1': 1, 'it2': 1, 'pi3': 3, 'be3': 3, 'be4': 3, 'pc5': 3, 'sp4': 3, 'rf1': 3}

def ok(r, what):
    if r.status_code >= 300: sys.exit(f'{what}: {r.status_code} {r.text[:300]}')
    return r

for slug in sys.argv[1:]:
    qs = json.load(open(os.path.join(HERE, 'quick', f'{slug}.json')))
    paper = dict(slug=slug, subject=SUBJ[slug], school='Quick questions', year=2026, difficulty='Easier', online=True, release_pct=0)
    r = ok(requests.post(f'{URL}/rest/v1/papers?on_conflict=slug', headers={**H, 'Prefer': 'resolution=merge-duplicates,return=representation'}, json=paper, timeout=60), 'paper')
    pid = r.json()[0]['id']
    count, rows = {}, []
    for q in qs:
        count[q['step']] = count.get(q['step'], 0) + 1
        qid = f"{q['step']}-{count[q['step']]:02d}"
        rows.append({'id': f'{slug}/{qid}', 'paper_id': pid, 'qid': qid, 'number': len(rows) + 1, 'type': 'mcq', 'marks': 1,
                     'topic': TOPIC[q['step'][:2]], 'topics': [TOPIC[q['step'][:2]]], 'skills': [q['step']], 'level': LEVEL.get(q['step'], 2),
                     'answer': q['answer'], 'content': {'kind': 'single', 'quick': True, 'prompt': q['prompt'], 'options': q['options'], 'answer': q['answer'], 'why': q['why']}})
    for i in range(0, len(rows), 100):
        ok(requests.post(f'{URL}/rest/v1/questions?on_conflict=id', headers={**H, 'Prefer': 'resolution=merge-duplicates'}, json=rows[i:i + 100], timeout=120), 'questions')
    keep = ','.join(f'"{x["id"]}"' for x in rows)
    ok(requests.delete(f'{URL}/rest/v1/questions?paper_id=eq.{pid}&id=not.in.({keep})', headers=H, timeout=60), 'remove old questions')
    print(f'{slug}: {len(rows)} quick questions')
