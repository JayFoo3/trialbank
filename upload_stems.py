#!/usr/bin/env python3
"""
upload_stems.py  -  push the part images stems.py rebuilt (listed in stems_changed.json) to Supabase, replacing the
old ones in place. Also puts the intro at the front of each question's stored text (the tutor and search read it)
and clears its syllabus tags so they can be redone with the full question.

    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 upload_stems.py [--dry]
"""
import argparse, glob, json, os, sys, time
import requests
from upload import to_webp, put_object, URL, KEY, H, die

HERE = os.path.dirname(os.path.abspath(__file__))


def call(method, url, **kw):
    """requests with patience: the connection drops now and then (seen as SSL errors), so wait and retry."""
    for attempt in range(8):
        try:
            r = requests.request(method, url, timeout=60, **kw)
            if r.status_code < 500: return r
        except requests.exceptions.RequestException as e:
            if attempt == 7: raise
            print(f'  network hiccup ({type(e).__name__}), retrying...', flush=True)
        time.sleep(min(30, 2 * (attempt + 1)))
    return r


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    if not URL or not KEY:
        die('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
    changed = json.load(open(os.path.join(HERE, 'stems_changed.json')))
    done_path = os.path.join(HERE, 'stems_uploaded.json')
    done = set(json.load(open(done_path))) if os.path.exists(done_path) else set()
    todo = [k for k in changed if k not in done]
    # Sequences and Series first, then Projectile Motion, then the rest of Maths Advanced, then everything else
    topic = {}
    for mp in glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json')):
        m = json.load(open(mp))
        for q in m['questions']: topic[f"{m['slug']}/{q['id']}"] = q.get('topic')
    rank = lambda k: (0 if topic.get(k) == 'Sequences and Series' else 1 if topic.get(k) == 'Projectile Motion' else 2 if k.startswith('adv-') else 3)
    todo.sort(key=rank)
    print(f'{len(todo)} images to upload ({len(done)} already done)')
    rows = {}
    for i in range(0, len(todo), 40):   # look up where each image lives and its current text
        ids = ','.join('"' + k.replace('"', '') + '"' for k in todo[i:i + 40])
        r = call('GET', f'{URL}/rest/v1/questions', headers=H, params={'select': 'id,image_path,text', 'id': f'in.({ids})'})
        if r.status_code >= 300: die(f'lookup -> {r.status_code}: {r.text[:300]}')
        rows.update({q['id']: q for q in r.json()})
    n = 0
    for k in todo:
        q = rows.get(k)
        if not q or not q.get('image_path'):
            print(f'  {k}: not in the database, skipped'); continue
        info = changed[k]
        if a.dry:
            print(f'  {k} -> {q["image_path"]}'); continue
        put_object(q['image_path'], to_webp(os.path.join(HERE, info['image']), 85))
        stem = info['stem_text'].strip()
        text = q.get('text') or ''
        patch = {'skills': None}
        if stem and not text.startswith(stem[:40]):
            patch['text'] = (stem + '\n' + text)[:4000]
        r = call('PATCH', f'{URL}/rest/v1/questions', headers={**H, 'Content-Type': 'application/json'},
                 params={'id': f'eq.{k}'}, data=json.dumps(patch))
        if r.status_code >= 300: die(f'update {k} -> {r.status_code}: {r.text[:300]}')
        done.add(k); n += 1
        if n % 10 == 0:
            json.dump(sorted(done), open(done_path, 'w')); print(f'  {n} done', flush=True)
    json.dump(sorted(done), open(done_path, 'w'))
    print(f'uploaded {n}')


if __name__ == '__main__':
    main()
