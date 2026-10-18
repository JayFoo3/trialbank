#!/usr/bin/env python3
"""hsc.py - the official NESA HSC papers (current syllabus) for Trialbank's HSC section.

  python3 hsc.py download    fetch each exam paper and its marking guidelines into hsc/<slug>/ (run on your Mac)
  python3 hsc.py thumbs      make hsc/<slug>/thumb.webp from page 1 (needs poppler; Claude runs this one)
  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 hsc.py upload    put them on the site

Papers come straight from NESA (nsw.gov.au), which publishes them free for HSC preparation."""
import glob, hashlib, json, os, subprocess, sys, tempfile, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'hsc')
NESA = 'https://www.nsw.gov.au/sites/default/files/noindex/'
# (subject, year, exam paper, marking guidelines)
PAPERS = [
    ('Ext1', 2020, '2025-05/2020-hsc-mathematics-extension-1.pdf', '2025-05/2020-hsc-mathematics-ext-1-mg.pdf'),
    ('Ext1', 2021, '2025-05/2021-hsc-mathematics-extension-1.pdf', '2025-05/2021-hsc-maths-ext-1-mg.pdf'),
    ('Ext1', 2022, '2025-05/2022-hsc-mathematics-extension-1.pdf', '2025-05/2022-hsc-maths-ext-1-mg.pdf'),
    ('Ext1', 2023, '2025-05/2023-hsc-maths-ext-1.pdf', '2025-05/2023-hsc-maths-ext-1-mg.pdf'),
    ('Ext1', 2024, '2025-05/2024-hsc-maths-ext-1.pdf', '2025-05/2024-hsc-maths-ext-1-mg.pdf'),
    ('Ext1', 2025, '2025-10/2025-hsc-maths-extension-1.pdf', '2025-11/2025-hsc-maths-extension-1-mg.pdf'),
    ('Physics', 2019, '2025-05/2019-hsc-physics.pdf', '2025-05/2019-hsc-physics-mg.pdf'),
    ('Physics', 2020, '2025-05/2020-hsc-physics.pdf', '2025-05/2020-hsc-physics-mg.pdf'),
    ('Physics', 2021, '2025-05/2021-hsc-physics.pdf', '2025-05/2021-hsc-physics-mg.pdf'),
    ('Physics', 2022, '2025-05/2022-hsc-physics.pdf', '2025-05/2022-hsc-physics-mg.pdf'),
    ('Physics', 2023, '2025-05/2023-hsc-physics.pdf', '2025-05/2023-hsc-physics-mg.pdf'),
    ('Physics', 2024, '2025-09/2024-hsc-physics.pdf', '2025-05/2024-hsc-physics-mg.pdf'),
    ('Physics', 2025, '2025-11/2025-hsc-physics.pdf', '2025-11/2025-hsc-physics-mg.pdf'),
]
slug_of = lambda s, y: f'hsc-{s.lower()}-{y}'


def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        return 'have'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Trialbank study site)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    if not data.startswith(b'%PDF'):
        raise ValueError('not a PDF')
    open(dest, 'wb').write(data)
    return f'{len(data) // 1024} KB'


def download():
    bad = 0
    for s, y, exam, mg in PAPERS:
        d = os.path.join(OUT, slug_of(s, y)); os.makedirs(d, exist_ok=True)
        for name, part in (('exam.pdf', exam), ('mg.pdf', mg)):
            try:
                print(f'{slug_of(s, y)}/{name}: {fetch(NESA + part, os.path.join(d, name))}')
            except Exception as ex:
                bad += 1; print(f'{slug_of(s, y)}/{name}: FAILED {ex}')
            time.sleep(0.5)
    print('done' + (f', {bad} failed' if bad else ', all downloaded'))


def thumbs():
    from PIL import Image
    for d in sorted(glob.glob(os.path.join(OUT, 'hsc-*'))):
        src, dest = os.path.join(d, 'exam.pdf'), os.path.join(d, 'thumb.webp')
        if not os.path.exists(src) or os.path.exists(dest):
            continue
        with tempfile.TemporaryDirectory() as t:
            subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', '72', '-png', src, os.path.join(t, 'p')], check=True)
            im = Image.open(glob.glob(os.path.join(t, 'p*.png'))[0]).convert('RGB')
            im.resize((360, round(im.height * 360 / im.width)), Image.LANCZOS).save(dest, quality=80, method=6)
        print('thumb', os.path.basename(d))


def upload():
    import requests
    url = os.environ.get('SUPABASE_URL', '').rstrip('/'); key = os.environ.get('SUPABASE_SERVICE_KEY', '')
    if not url or not key:
        sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
    H = {'apikey': key, 'Authorization': f'Bearer {key}'}

    def put(path, data, ctype):
        for i in range(5):
            r = requests.post(f'{url}/storage/v1/object/questions/{path}', headers={**H, 'Content-Type': ctype, 'x-upsert': 'true'}, data=data, timeout=120)
            if r.status_code < 300: return
            if r.status_code < 500 and r.status_code != 429: sys.exit(f'{path}: {r.status_code} {r.text[:200]}')
            time.sleep(3 * (i + 1))
        sys.exit(f'{path}: gave up')

    for s, y, _, _ in PAPERS:
        slug = slug_of(s, y); d = os.path.join(OUT, slug)
        exam, mg, th = (os.path.join(d, n) for n in ('exam.pdf', 'mg.pdf', 'thumb.webp'))
        if not os.path.exists(exam):
            print(slug, 'not downloaded, skipped'); continue
        raw = open(exam, 'rb').read()
        put(f'{slug}/paper.pdf', raw, 'application/pdf')
        if os.path.exists(mg): put(f'{slug}/mg.pdf', open(mg, 'rb').read(), 'application/pdf')
        if os.path.exists(th): put(f'{slug}/thumb.webp', open(th, 'rb').read(), 'image/webp')
        row = dict(slug=slug, subject=s, school='HSC', year=y, difficulty='HSC', sha256=hashlib.sha256(raw).hexdigest(),
                   pdf_path=f'{slug}/paper.pdf', pdf_sol_path=f'{slug}/mg.pdf' if os.path.exists(mg) else None)
        r = requests.post(f'{url}/rest/v1/papers?on_conflict=slug', headers={**H, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'}, data=json.dumps(row), timeout=60)
        if r.status_code >= 300: sys.exit(f'{slug}: {r.status_code} {r.text[:200]}')
        print('uploaded', slug)
    print('done')


if __name__ == '__main__':
    {'download': download, 'thumbs': thumbs, 'upload': upload}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: sys.exit(__doc__))()
