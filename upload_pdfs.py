#!/usr/bin/env python3
"""upload_pdfs.py - upload the ORIGINAL paper PDFs so the site can offer the real thing.
Finds each source PDF by sha256 (searching --root, default ~/Documents), uploads
  <slug>/paper.pdf  (pages before the solutions)  and  <slug>/full.pdf (whole file, with solutions)
then records the paths on the papers table.
Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 upload_pdfs.py [--root DIR] [--only SLUG]"""
import argparse, glob, hashlib, json, os, subprocess, sys, tempfile
import requests

URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
HERE = os.path.dirname(os.path.abspath(__file__))
BUCKET = 'questions'


def put(path, data):
    r = requests.post(f'{URL}/storage/v1/object/{BUCKET}/{path}', headers={**H, 'Content-Type': 'application/pdf', 'x-upsert': 'true'}, data=data)
    if r.status_code >= 300:
        sys.exit(f'upload {path} -> {r.status_code}: {r.text[:300]}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=os.path.expanduser('~/Documents'))
    ap.add_argument('--only')
    a = ap.parse_args()
    if not URL or not KEY:
        sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
    want = {}
    for f in glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json')):
        m = json.load(open(f))
        if not a.only or m['slug'] == a.only:
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
        if sf and 1 < sf <= n:
            with tempfile.TemporaryDirectory() as t:
                out = os.path.join(t, 'paper.pdf')
                subprocess.run(['qpdf', src, '--pages', '.', f'1-{sf - 1}', '--', out], check=True)
                put(f'{slug}/paper.pdf', open(out, 'rb').read())
            patch['pdf_path'] = f'{slug}/paper.pdf'
        else:
            patch['pdf_path'] = f'{slug}/full.pdf'
        r = requests.patch(f'{URL}/rest/v1/papers?slug=eq.{slug}', headers={**H, 'Content-Type': 'application/json'}, data=json.dumps(patch))
        if r.status_code >= 300:
            sys.exit(f'PATCH {slug} -> {r.status_code}: {r.text[:300]}')
        print(f'{slug}: paper pages 1-{(sf - 1) if sf else n} of {n}')
    print('done')


if __name__ == '__main__':
    main()
