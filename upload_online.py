#!/usr/bin/env python3
"""upload_online.py - put an online paper on Trialbank: the questions (stored as content, answered on screen)
and the printable PDFs. Reads online/<slug>.json, online/<slug>-paper.pdf and online/<slug>-full.pdf.
Run supabase/online.sql once first.
Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 upload_online.py trialbank-se-2026-a [more slugs]"""
import json, os, sys, requests
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
HERE = os.path.dirname(os.path.abspath(__file__))

def ok(r, what):
    if r.status_code >= 300: sys.exit(f'{what}: {r.status_code} {r.text[:300]}')
    return r

for slug in sys.argv[1:]:
    d = json.load(open(os.path.join(HERE, 'online', f'{slug}.json')))
    paper = {**d['paper'], 'slug': slug}
    r = ok(requests.post(f'{URL}/rest/v1/papers?on_conflict=slug', headers={**H, 'Prefer': 'resolution=merge-duplicates,return=representation'}, json=paper, timeout=60), 'paper')
    pid = r.json()[0]['id']
    ok(requests.delete(f'{URL}/rest/v1/questions?paper_id=eq.{pid}', headers=H, timeout=60), 'clear old questions')
    rows = [{'id': f"{slug}/{q['qid']}", 'paper_id': pid, 'qid': q['qid'], 'number': q['number'], 'type': q['type'], 'marks': q['marks'],
             'topic': q['topic'], 'answer': q.get('answer'), 'content': q['content']} for q in d['questions']]
    ok(requests.post(f'{URL}/rest/v1/questions', headers=H, json=rows, timeout=120), 'questions')
    print(f'{slug}: {len(rows)} questions, {sum(q["marks"] for q in rows)} marks')
    for part, name in (('paper', 'paper.pdf'), ('full', 'full.pdf')):
        with open(os.path.join(HERE, 'online', f'{slug}-{part}.pdf'), 'rb') as f:
            ok(requests.post(f'{URL}/storage/v1/object/questions/{slug}/{name}', headers={**H, 'Content-Type': 'application/pdf', 'x-upsert': 'true'}, data=f.read(), timeout=120), name)
    th = os.path.join(HERE, 'online', f'{slug}-thumb.webp')
    if os.path.exists(th):
        with open(th, 'rb') as f:
            ok(requests.post(f'{URL}/storage/v1/object/questions/{slug}/thumb.webp', headers={**H, 'Content-Type': 'image/webp', 'x-upsert': 'true'}, data=f.read(), timeout=60), 'thumb')
    ok(requests.patch(f'{URL}/rest/v1/papers?id=eq.{pid}', headers=H, json={'pdf_path': f'{slug}/paper.pdf', 'pdf_sol_path': f'{slug}/full.pdf'}, timeout=60), 'pdf paths')
    print(f'{slug}: PDFs uploaded')
