#!/usr/bin/env python3
"""
upload_fixes.py  -  put the hand-fixed flagged questions live, and close their flags.
  fixes/<slug>/<qid>.png      -> replaces that question's image (or gives it its own, if it shared a whole-page one)
  fixes/<slug>/sol_qNN.png    -> replaces that paper's solution image (every part of question NN uses it)
Also hides the written questions of papers listed in HIDE (their scan can't be cut reliably yet), so they stay out of practice.

    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 upload_fixes.py
"""
import glob, json, os, re, datetime
import requests
from upload import to_webp, put_object, URL, KEY, H, die

HERE = os.path.dirname(os.path.abspath(__file__))
HIDE = ['adv-sydney-boys-2025']   # text layer is scrambled: every part showed the whole question's pages


def main():
    if not URL or not KEY: die('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
    files = sorted(glob.glob(os.path.join(HERE, 'fixes', '*', '*.png')))
    closed = []
    for f in files:
        slug, name = f.split(os.sep)[-2], os.path.basename(f)[:-4]
        m = re.match(r'sol_q(\d+)$', name)
        if m:   # a solution image: find the path the paper's questions use
            r = requests.get(f'{URL}/rest/v1/questions', headers=H, params={'select': 'id,solution_path', 'paper_id': 'not.is.null', 'id': f'like.{slug}/q{int(m.group(1)):02d}*'}, timeout=60)
            paths = sorted({q['solution_path'] for q in r.json() if q.get('solution_path')})
            for p in paths: put_object(p, to_webp(f, 85)); print(f'  {slug}/{name} -> {p}')
            closed += [q['id'] for q in r.json()]
            continue
        qid = f'{slug}/{name}'
        r = requests.get(f'{URL}/rest/v1/questions', headers=H, params={'select': 'id,image_path', 'id': f'eq.{qid}'}, timeout=60)
        rows = r.json() if r.status_code < 300 else []
        if not rows or not rows[0].get('image_path'): print(f'  {qid}: not in the database, skipped'); continue
        path = rows[0]['image_path']
        if os.path.basename(path) != name + '.webp':   # it shared a whole-page image: give it its own, and it's no longer "whole page"
            path = f'{slug}/{name}.webp'
            put_object(path, to_webp(f, 85))
            r = requests.patch(f'{URL}/rest/v1/questions', headers={**H, 'Content-Type': 'application/json'}, params={'id': f'eq.{qid}'},
                               data=json.dumps({'image_path': path, 'coarse': False}), timeout=60)
            if r.status_code >= 300: print(f'  {qid}: could not point at its new image ({r.status_code})'); continue
        else:
            put_object(path, to_webp(f, 85))
        closed.append(qid); print(f'  {qid}')
    for slug in HIDE:
        r = requests.patch(f'{URL}/rest/v1/questions', headers={**H, 'Content-Type': 'application/json', 'Prefer': 'return=representation'},
                           params={'id': f'like.{slug}/*', 'type': 'eq.short'}, data=json.dumps({'image_path': None}), timeout=60)
        if r.status_code >= 300: die(f'hide {slug} -> {r.status_code}: {r.text[:300]}')
        ids = [q['id'] for q in r.json()]; closed += ids; print(f'  {slug}: {len(ids)} written questions hidden until it is re-cut')
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for i in range(0, len(closed), 60):
        ids = ','.join('"' + c + '"' for c in closed[i:i + 60])
        r = requests.patch(f'{URL}/rest/v1/question_flags', headers={**H, 'Content-Type': 'application/json'},
                           params={'question_id': f'in.({ids})', 'resolved_at': 'is.null'}, data=json.dumps({'resolved_at': now}), timeout=60)
        if r.status_code >= 300: print('  could not close flags:', r.status_code, r.text[:200])
    print(f'done: {len(files)} images, flags closed on {len(set(closed))} questions')


if __name__ == '__main__':
    main()
