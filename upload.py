#!/usr/bin/env python3
"""
upload.py  -  push cut papers (output/<slug>/) to Supabase: images to the 'questions' bucket as WebP,
rows into papers / questions. Safe to re-run; already-uploaded papers are skipped unless --force.

Needs two environment variables (Supabase dashboard -> Project Settings -> API):
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY=...          (the service_role key: keep it private, never put it in the site)

Usage:  python3 upload.py [--only ext1-gosford-2026] [--force] [--dry]
"""
import argparse, glob, io, json, os, sys
import requests
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
BUCKET = 'questions'
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}


def die(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)


def rest(method, path, **kw):
    r = requests.request(method, f'{URL}/rest/v1/{path}', headers={**H, 'Content-Type': 'application/json', **kw.pop('headers', {})}, **kw)
    if r.status_code >= 300:
        die(f'{method} {path} -> {r.status_code}: {r.text[:300]}')
    return r.json() if r.text else None


def to_webp(png_path, quality):
    im = Image.open(png_path).convert('RGB')
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=quality, method=4)
    return buf.getvalue()


def put_object(path, data):
    r = requests.post(f'{URL}/storage/v1/object/{BUCKET}/{path}', headers={**H, 'Content-Type': 'image/webp', 'x-upsert': 'true'}, data=data)
    if r.status_code >= 300:
        die(f'upload {path} -> {r.status_code}: {r.text[:300]}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    if not a.dry and (not URL or not KEY):
        die('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')

    existing = set() if a.dry else {p['slug'] for p in rest('GET', 'papers?select=slug,questions(count)') if p['questions'][0]['count']}   # papers with questions already (an HSC paper uploaded as a PDF alone still gets its questions)
    manifests = sorted(glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json')))
    total_bytes = 0
    for mpath in manifests:
        m = json.load(open(mpath))
        slug = m['slug']
        if a.only and slug != a.only:
            continue
        if slug in existing and not a.force:
            continue
        folder = os.path.dirname(mpath)
        uploaded = {}
        for q in m['questions']:
            for key, quality in (('image', 85), ('solution', 78)):
                fn = q.get(key)
                if not fn or fn in uploaded or not os.path.exists(os.path.join(folder, fn)):
                    continue
                data = to_webp(os.path.join(folder, fn), quality)
                total_bytes += len(data)
                path = f'{slug}/{os.path.splitext(fn)[0]}.webp'
                if not a.dry:
                    put_object(path, data)
                uploaded[fn] = path
        if a.dry:
            print(f'{slug}: {len(m["questions"])} questions, {len(uploaded)} images')
            continue
        paper = rest('POST', 'papers?on_conflict=slug', headers={'Prefer': 'resolution=merge-duplicates,return=representation'},
                     data=json.dumps(dict(slug=slug, subject=m['subject'], school=m['school'], year=m['year'],
                                          difficulty=m['difficulty'], sha256=m['sha256'], pages=m['pages'],
                                          scanned=m.get('scanned', False))))[0]
        rows, seen = [], {}
        for q in m['questions']:
            qid = q['id']   # a reading can list the same part twice: keep both, the second as q16i-2
            seen[qid] = seen.get(qid, 0) + 1
            if seen[qid] > 1: qid = f'{qid}-{seen[qid]}'
            rows.append(dict(
                id=f'{slug}/{qid}', paper_id=paper['id'], qid=qid, number=q['number'], part=q.get('part'),
                type=q['type'], marks=q.get('marks'), topic=q.get('topic'), topics=q.get('topics') or ([q['topic']] if q.get('topic') else []),
                subparts=q.get('subparts') or [], answer=q.get('answer'),
                image_path=uploaded.get(q.get('image')), solution_path=uploaded.get(q.get('solution')),
                coarse=bool(q.get('coarse')), text=(q.get('text') or '')[:4000], pages=q.get('pages') or None))
        rest('POST', 'questions', headers={'Prefer': 'resolution=merge-duplicates'}, data=json.dumps(rows))
        keep = {r['id'] for r in rows}
        for old_q in rest('GET', f'questions?paper_id=eq.{paper["id"]}&select=id'):
            if old_q['id'] not in keep:
                rest('DELETE', 'questions?id=eq.' + requests.utils.quote(old_q['id'], safe=''))
        print(f'{slug}: {len(rows)} questions, {len(uploaded)} images')
    print(f'done, {total_bytes / 1e6:.1f} MB of images')


if __name__ == '__main__':
    main()
