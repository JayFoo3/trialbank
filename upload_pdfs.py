#!/usr/bin/env python3
"""upload_pdfs.py - upload the ORIGINAL paper PDFs so the site can offer the real thing.
Finds each source PDF by sha256 (searching --root, default ~/Documents), uploads
  <slug>/paper.pdf  (pages before the solutions)  and  <slug>/full.pdf (whole file, with solutions)
then records the paths on the papers table.
Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 upload_pdfs.py [--root DIR] [--only SLUG]"""
import argparse, shutil, time, glob, hashlib, json, os, subprocess, sys, tempfile
import requests

URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
HERE = os.path.dirname(os.path.abspath(__file__))
BUCKET = 'questions'


def put(path, data, tries=5, ctype='application/pdf'):
    for i in range(tries):
        try:
            r = requests.post(f'{URL}/storage/v1/object/{BUCKET}/{path}', headers={**H, 'Content-Type': ctype, 'x-upsert': 'true'}, data=data, timeout=120)
            if r.status_code < 300:
                return
            err = f'{r.status_code}: {r.text[:200]}'
            if r.status_code < 500 and r.status_code != 429:
                break
        except requests.RequestException as ex:
            err = str(ex)
        print(f'  {path}: retry {i + 1} after error {err[:60]}')
        time.sleep(3 * (i + 1))
    sys.exit(f'upload {path} -> {err}')


def paper_end(m):
    """Last page (1-based) of the paper itself, before the solutions.
    Albert's readings give solutionsFrom = number of paper pages; the OCR'd ones give the first solution page."""
    sf = m.get('solutions_from')
    last_q = max((pg for q in m['questions'] for pg in q.get('pages', [])), default=0)
    if not sf:                      # reading found no solutions: end at the last question's page
        return last_q if 0 < last_q < m['pages'] else m['pages']
    return max(1, min(m['pages'], max(last_q, sf - 1 if m.get('ocr') else sf)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=os.path.expanduser('~/Documents'))
    ap.add_argument('--only')
    ap.add_argument('--thumbs', action='store_true', help='only upload the first-page thumbnails')
    ap.add_argument('--all', action='store_true', help='re-upload PDFs for papers that already have them')
    a = ap.parse_args()
    if not URL or not KEY:
        sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
    if a.thumbs:
        n = 0
        for t in sorted(glob.glob(os.path.join(HERE, 'output', '*', 'thumb.webp'))):
            slug = os.path.basename(os.path.dirname(t))
            if a.only and slug != a.only:
                continue
            put(f'{slug}/thumb.webp', open(t, 'rb').read(), ctype='image/webp'); n += 1
        print(f'{n} thumbnails uploaded'); return
    have = set()
    if not a.all:                                   # skip papers whose PDFs are already up
        r = requests.get(f'{URL}/rest/v1/papers?select=slug&pdf_path=not.is.null', headers=H, timeout=60)
        if r.status_code < 300: have = {x['slug'] for x in r.json()}
    want = {}
    for f in glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json')):
        m = json.load(open(f))
        if (not a.only or m['slug'] == a.only) and (a.only or m['slug'] not in have):
            want[m['sha256']] = m
    found = {}
    for dp, dn, fn in os.walk(a.root):
        dn[:] = [d for d in dn if not d.startswith('.') and d != 'question-bank']
        for f in fn:
            if f.lower().endswith('.pdf'):
                p = os.path.join(dp, f)
                h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
                if h in want:
                    found[h] = p
    print(f'found {len(found)} of {len(want)} source PDFs')
    for h, m in sorted(want.items(), key=lambda kv: kv[1]['slug']):
        src = found.get(h)
        slug = m['slug']
        if not src:
            print(f'{slug}: source PDF not found, skipped')
            continue
        sf = m.get('solutions_from')
        n = m['pages']
        full = open(src, 'rb').read()
        patch = {}
        put(f'{slug}/full.pdf', full)
        patch['pdf_sol_path'] = f'{slug}/full.pdf'
        pre = os.path.join(HERE, 'output', slug, 'paper.pdf')   # pre-split paper-only file, if present
        if os.path.exists(pre):
            put(f'{slug}/paper.pdf', open(pre, 'rb').read())
            patch['pdf_path'] = f'{slug}/paper.pdf'
        elif paper_end(m) < n and shutil.which('qpdf'):
            with tempfile.TemporaryDirectory() as t:
                out = os.path.join(t, 'paper.pdf')
                subprocess.run(['qpdf', src, '--pages', '.', f'1-{paper_end(m)}', '--', out])
                put(f'{slug}/paper.pdf', open(out, 'rb').read())
            patch['pdf_path'] = f'{slug}/paper.pdf'
        else:
            patch['pdf_path'] = f'{slug}/full.pdf'
        r = requests.patch(f'{URL}/rest/v1/papers?slug=eq.{slug}', headers={**H, 'Content-Type': 'application/json'}, data=json.dumps(patch))
        if r.status_code >= 300:
            sys.exit(f'PATCH {slug} -> {r.status_code}: {r.text[:300]}')
        print(f'{slug}: paper pages 1-{paper_end(m)} of {n}')
    print('done')


if __name__ == '__main__':
    main()
