#!/usr/bin/env python3
"""upload_textbook.py - put a cut textbook chapter on Trialbank as a PRIVATE set (only admins can see it; run supabase/textbook.sql once first).
Reads textbook/<slug>/manifest.json (cut_textbook.py) and textbook/<slug>/ans-*.png (cut_answers.py).
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 upload_textbook.py margaret-ch01"""
import json, os, sys, requests
from upload import to_webp, put_object, URL, KEY, H, die
HERE = os.path.dirname(os.path.abspath(__file__))
CHAPTERS = {'margaret-ch01': dict(title='Sequences and Series', subject='Book', topic='Sequences and Series', induction='1.10')}

def ok(r, what):
    if r.status_code >= 300: die(f'{what}: {r.status_code} {r.text[:300]}')
    return r

for slug in sys.argv[1:]:
    ch, folder = CHAPTERS[slug], os.path.join(HERE, 'textbook', slug)
    man = json.load(open(os.path.join(folder, 'manifest.json')))
    paper = dict(slug=slug, subject=ch['subject'], school='Margaret', year=int(slug.split('ch')[-1]), difficulty='Medium', private=True)
    pid = ok(requests.post(f'{URL}/rest/v1/papers?on_conflict=slug', headers={**H, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=representation'},
                           data=json.dumps(paper), timeout=60), 'paper').json()[0]['id']
    answers = {}
    for f in sorted(os.listdir(folder)):
        if f.startswith('ans-') and f.endswith('.png'):
            path = f'{slug}/{f[:-4]}.webp'; put_object(path, to_webp(os.path.join(folder, f), 82)); answers[f[4:-4]] = path
    rows = []
    for i, q in enumerate(man):
        path = f'{slug}/{q["id"]}.webp'; put_object(path, to_webp(os.path.join(folder, q['image']), 85))
        key = 'ex' + q['exercise'] if q['exercise'][0].isdigit() else q['exercise']
        topic = 'Proof by Induction' if q['exercise'] == ch['induction'] else ch['topic']
        rows.append(dict(id=f'{slug}/{q["id"]}', paper_id=pid, qid=q['id'], number=i + 1, part=None, type='short', marks=q['marks'],
                         topic=topic, topics=[topic], image_path=path, solution_path=answers.get(key), text=q['text'], pages=q['pages']))
        print(f'\r  {i + 1}/{len(man)} questions', end='', flush=True)
    ok(requests.post(f'{URL}/rest/v1/questions?on_conflict=id', headers={**H, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'}, data=json.dumps(rows), timeout=120), 'questions')
    print(f'\n{slug}: {len(rows)} questions, {len(answers)} answer pages (private: only admins see it)')
