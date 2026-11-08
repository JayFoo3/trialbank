#!/usr/bin/env python3
"""share_engstd.py - put English Advanced's Paper 1 trials on English Standard too.
Paper 1 (Common Module) is the same exam for both courses, so each engadv-*-p1 paper gets a twin, engstd-*-p1, with
subject EngStd. The twins point at the same question images and PDFs, so no storage is used twice. Safe to re-run:
it refreshes the twins from the Advanced papers (e.g. after a fix there).
Usage: python3 share_engstd.py [--dry]      (keys come from ~/.trialbank_keys)"""
import json, os, sys, requests
import keys  # noqa: F401  (loads ~/.trialbank_keys)
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first (or put them in ~/.trialbank_keys).')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
DRY = '--dry' in sys.argv
SKIP = {'id', 'created_at', 'updated_at'}   # made fresh for the twin


def rest(method, path, **kw):
    r = requests.request(method, f'{URL}/rest/v1/{path}', headers={**H, **kw.pop('headers', {})}, timeout=120, **kw)
    if r.status_code >= 300: sys.exit(f'{method} {path} -> {r.status_code}: {r.text[:300]}')
    return r.json() if r.text else None


src = rest('GET', 'papers?select=*&subject=eq.EngAdv&slug=like.engadv-*-p1&order=slug')
print(f'{len(src)} English Advanced Paper 1 trials')
total = 0
for p in src:
    slug = 'engstd-' + p['slug'][len('engadv-'):]
    twin = {k: v for k, v in p.items() if k not in SKIP}
    twin.update(slug=slug, subject='EngStd', sha256=None)   # sha256 must stay unique to the original
    qs = rest('GET', f'questions?select=*&paper_id=eq.{p["id"]}&order=id')
    total += len(qs)
    if DRY:
        print(f'  {slug}: {len(qs)} questions'); continue
    new = rest('POST', 'papers?on_conflict=slug', headers={'Prefer': 'resolution=merge-duplicates,return=representation'}, data=json.dumps(twin))[0]
    rows = []
    for q in qs:
        row = {k: v for k, v in q.items() if k not in SKIP | {'paper_id'}}
        row.update(id=f'{slug}/{q["qid"]}', paper_id=new['id'])
        rows.append(row)
    for i in range(0, len(rows), 100):
        rest('POST', 'questions?on_conflict=id', headers={'Prefer': 'resolution=merge-duplicates'}, data=json.dumps(rows[i:i + 100]))
    keep = {r['id'] for r in rows}
    for old in rest('GET', f'questions?paper_id=eq.{new["id"]}&select=id'):
        if old['id'] not in keep: rest('DELETE', 'questions?id=eq.' + requests.utils.quote(old['id'], safe=''))
    print(f'  {slug}: {len(rows)} questions')
print(f'done: {len(src)} papers, {total} questions' + (' (dry run, nothing written)' if DRY else ''))
