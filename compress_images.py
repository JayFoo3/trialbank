#!/usr/bin/env python3
"""compress_images.py - shrink the question and solution images in Supabase storage.

Rebuilds each image from the local cut (output/<slug>/*.png) as a lossless WebP with a small palette:
16 shades of grey for black-and-white pages, 48 colours when the page has colour (marker ticks, diagrams).
Text stays sharp and files come out about half the size. An image is only replaced when the new file is
at least 15% smaller than what's stored now, so nothing ever gets bigger. Safe to stop and run again.

  python3 compress_images.py --dry     how much it would save, uploads nothing
  python3 compress_images.py           do it
Needs SUPABASE_URL and SUPABASE_SERVICE_KEY (not needed for --dry)."""
import glob, io, json, os, sys, time
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image, ImageChops

URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
HERE = os.path.dirname(os.path.abspath(__file__))
BUCKET = 'questions'
DONE = os.path.join(HERE, 'compress_done.txt')
DRY = '--dry' in sys.argv


def encode(path):
    im = Image.open(path).convert('RGB')
    hsv = im.convert('HSV')
    sat = hsv.getchannel(1).point(lambda x: 255 if x > 70 else 0)
    val = hsv.getchannel(2).point(lambda x: 255 if x > 60 else 0)
    coloured = ImageChops.multiply(sat, val).histogram()[255] > im.width * im.height * 0.0003
    if coloured:
        out = im.quantize(48, method=Image.Quantize.FASTOCTREE).convert('RGB')
    else:
        out = im.convert('L').quantize(16, method=Image.Quantize.FASTOCTREE).convert('L')
    buf = io.BytesIO()
    out.save(buf, 'WEBP', lossless=True, method=3, quality=60)
    return buf.getvalue()


def stored_sizes(slug):
    r = requests.post(f'{URL}/storage/v1/object/list/{BUCKET}', headers=H,
                      json={'prefix': slug + '/', 'limit': 1000}, timeout=60)
    if r.status_code >= 300:
        return {}
    return {f'{slug}/{o["name"]}': int((o.get('metadata') or {}).get('size', 0)) for o in r.json() if o.get('name', '').endswith('.webp')}


def upload(path, data):
    for i in range(5):
        try:
            r = requests.post(f'{URL}/storage/v1/object/{BUCKET}/{path}', data=data, timeout=120,
                              headers={**H, 'Content-Type': 'image/webp', 'x-upsert': 'true', 'cache-control': 'max-age=3600'})
            if r.status_code < 300:
                return True
            if r.status_code < 500 and r.status_code != 429:
                print(f'  {path}: {r.status_code} {r.text[:120]}'); return False
        except requests.RequestException:
            pass
        time.sleep(3 * (i + 1))
    print(f'  {path}: gave up after 5 tries'); return False


def main():
    if not DRY and (not URL or not KEY):
        sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first (or use --dry).')
    done = set(open(DONE).read().split()) if os.path.exists(DONE) else set()
    mans = sorted(glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json')))
    before = after = changed = 0
    pool = ThreadPoolExecutor(8)
    for k, man in enumerate(mans, 1):
        m = json.load(open(man)); slug = m['slug']; folder = os.path.dirname(man)
        if slug in done and not DRY:
            continue
        files = []
        for q in m['questions']:
            for key in ('image', 'solution'):
                fn = q.get(key)
                if fn and os.path.exists(os.path.join(folder, fn)):
                    files.append((f'{slug}/{os.path.splitext(fn)[0]}.webp', os.path.join(folder, fn)))
        files = list(dict(files).items())
        sizes = {} if DRY else stored_sizes(slug)
        if not DRY and not sizes:
            print(f'[{k}/{len(mans)}] {slug}: not on the site, skipped'); continue
        jobs = []
        for path, src in files:
            old = sizes.get(path) if not DRY else None
            if not DRY and old is None:
                continue                                   # not uploaded under this name
            new = encode(src)
            ref = old if old else len(new)
            if DRY:
                b = io.BytesIO(); Image.open(src).convert('RGB').save(b, 'WEBP', quality=85, method=4); ref = b.tell()
            before += ref
            if len(new) < 0.85 * ref:
                after += len(new); changed += 1
                if not DRY:
                    jobs.append(pool.submit(upload, path, new))
            else:
                after += ref
        ok = all(j.result() for j in jobs)
        print(f'[{k}/{len(mans)}] {slug}: {len(jobs) if not DRY else ""} images  running total {before/1048576:.0f} MB -> {after/1048576:.0f} MB')
        if ok and not DRY:
            with open(DONE, 'a') as f: f.write(slug + '\n')
    pool.shutdown()
    print(f'{"Would save" if DRY else "Saved"} {(before - after)/1048576:.0f} MB '
          f'({before/1048576:.0f} MB -> {after/1048576:.0f} MB, {changed} images {"would change" if DRY else "replaced"}).')


if __name__ == '__main__':
    main()
