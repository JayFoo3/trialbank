#!/usr/bin/env python3
"""move_images_b2.py - move the question and solution images out of Supabase storage (free plan: 1 GB) into Backblaze B2.

  python3 move_images_b2.py            1. makes sure the B2 bucket lets the site load images (CORS)
                                       2. copies every question/solution image Supabase -> B2 (same path), checks each size
                                       Safe to stop and run again: anything already in B2 at the right size is skipped.
  (then the site and edge functions are deployed, and every image path gets 'b2:' in front, e.g. b2:hsc-ext2-2020/q11a.webp)
  python3 move_images_b2.py --switch   points every question at its B2 copy (only images B2 really has)
  python3 move_images_b2.py --delete   only once every row points at B2: deletes those images from Supabase storage

Needs SUPABASE_URL, SUPABASE_SERVICE_KEY, B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT (all in ~/.trialbank_keys)."""
import base64, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
import requests
import keys  # noqa: F401
import b2

URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
b2.need()
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
HERE = os.path.dirname(os.path.abspath(__file__))
DONE = os.path.join(HERE, 'moved_images.txt')
CTYPE = {'webp': 'image/webp', 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg'}


def rows():
    out = []
    for frm in range(0, 10**6, 1000):
        r = requests.get(f'{URL}/rest/v1/questions?select=id,image_path,solution_path&order=id', headers={**H, 'Range': f'{frm}-{frm + 999}'}, timeout=120)
        if r.status_code >= 300: sys.exit(f'questions: {r.status_code} {r.text[:200]}')
        out += r.json()
        if len(r.json()) < 1000: return out


CORS_HOW = ('Backblaze website > Buckets > your Trialbank bucket > CORS Rules > "Share everything in this bucket with all HTTPS origins",'
            ' tick "S3 Compatible API", Save. Then run this again.')


def cors_ok():
    """The site loads images with crossOrigin='anonymous' (to trim and draw them), so B2 has to answer with CORS headers.
    Tested with one real request for a file already in the bucket, as a browser on the site would make it."""
    have = b2.listing()
    if not have: return None
    key = next(iter(have))
    url, h = b2._sign('GET', key, {})
    r = requests.get(url, headers={**h, 'Origin': 'https://trialbank.com.au', 'Range': 'bytes=0-0'}, timeout=60)
    return bool(r.headers.get('Access-Control-Allow-Origin'))


def copy_all():
    rs = rows()
    paths = sorted({p for r in rs for p in (r['image_path'], r['solution_path']) if p and not p.startswith('b2:')})
    # B2's free tier caps lookups (about 2,500 a day), so never check files one by one: one bucket listing per 1,000 files instead
    have = b2.listing()
    todo = [p for p in paths if p not in have]
    print(f'{len(rs)} questions, {len(paths)} images still on Supabase, {len(paths) - len(todo)} already in B2, {len(todo)} to copy')
    lock, n, bad, t0, sizes = threading.Lock(), [0], [], time.time(), {}

    def one(p):
        for i in range(5):
            try:
                r = requests.get(f'{URL}/storage/v1/object/questions/{p}', headers=H, timeout=120)
                if r.status_code == 200: break
                if r.status_code in (400, 404): bad.append(f'{p}: not in Supabase ({r.status_code})'); return
            except requests.RequestException: pass
            time.sleep(2 * (i + 1))
        else:
            bad.append(f'{p}: download failed'); return
        b2.put(p, r.content, CTYPE.get(p.rsplit('.', 1)[-1].lower(), 'application/octet-stream'))   # stops the script if B2 refuses
        with lock:
            sizes[p] = len(r.content); n[0] += 1
            if n[0] % 250 == 0: print(f'  {n[0]}/{len(todo)}  ({(time.time() - t0) / 60:.0f} min)')
    with ThreadPoolExecutor(int(os.environ.get("B2_THREADS", "32"))) as ex: list(ex.map(one, todo))
    for b in bad[:30]: print('  !', b)
    print('Checking everything landed in B2...')
    have = b2.listing()
    wrong = [p for p in paths if p not in have or (p in sizes and have[p] != sizes[p])]
    with open(DONE, 'w') as log: log.write('\n'.join(p for p in paths if p not in wrong) + '\n')
    print(f'Copied {n[0]} this run. ' + ('ALL IMAGES ARE IN B2.' if not wrong else f'{len(wrong)} missing or wrong size (e.g. {wrong[0]}): run it again.'))
    c = cors_ok()
    if c: print('B2 CORS: on, the site can load images from B2.' + (' Tell Claude, so the site can switch over.' if not wrong else ''))
    else: print('B2 CORS: OFF. The site cannot load images from B2 until it is on. Turn it on: ' + CORS_HOW)


def delete():
    rs = rows()
    still = [p for r in rs for p in (r['image_path'], r['solution_path']) if p and not p.startswith('b2:')]
    if still: sys.exit(f'{len(still)} images still point at Supabase (e.g. {still[0]}). Nothing deleted.')
    moved = sorted({p[3:] for r in rs for p in (r['image_path'], r['solution_path']) if p})
    print(f'Checking {len(moved)} images are in B2 before deleting anything...')
    listing = b2.listing()
    missing = [p for p in moved if p not in listing]
    if missing: sys.exit(f'{len(missing)} are not in B2 (e.g. {missing[0]}). Nothing deleted.')
    gone = 0
    for i in range(0, len(moved), 500):
        r = requests.delete(f'{URL}/storage/v1/object/questions', headers={**H, 'Content-Type': 'application/json'}, json={'prefixes': moved[i:i + 500]}, timeout=120)
        if r.status_code >= 300: sys.exit(f'delete: {r.status_code} {r.text[:200]}')
        gone += len(r.json()); print(f'  deleted {gone}')
    print(f'Done: {gone} images removed from Supabase storage. Thumbs, profile pictures and uploads stay there.')


def switch():
    """Point every question at its B2 copy ('b2:' + path), but only for images that are in B2 at full size."""
    rs = rows()
    have = b2.listing()
    if not cors_ok(): sys.exit('B2 CORS is OFF, so the site could not load images from B2. Nothing switched. Turn it on: ' + CORS_HOW)
    todo, skipped = [], set()
    for r in rs:
        ch = {}
        for k in ('image_path', 'solution_path'):
            p = r[k]
            if not p or p.startswith('b2:'): continue
            if p in have: ch[k] = 'b2:' + p
            else: skipped.add(p)
        if ch: todo.append((r['id'], ch))
    print(f'{len(todo)} questions to switch to B2, {len(skipped)} images not in B2 yet (left on Supabase)')
    lock, n, bad = threading.Lock(), [0], []

    def one(item):
        qid, ch = item
        for i in range(5):
            try:
                x = requests.patch(f'{URL}/rest/v1/questions?id=eq.{qid}', headers={**H, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}, json=ch, timeout=60)
                if x.status_code < 300: break
            except requests.RequestException: pass
            time.sleep(2 * (i + 1))
        else:
            bad.append(qid); return
        with lock:
            n[0] += 1
            if n[0] % 1000 == 0: print(f'  {n[0]}/{len(todo)}')
    with ThreadPoolExecutor(16) as ex: list(ex.map(one, todo))
    print(f'Switched {n[0]} questions to B2.' + (f' {len(bad)} failed (e.g. id {bad[0]}): run --switch again.' if bad else ''))
    if skipped: print(f'{len(skipped)} images are not in B2 (e.g. {sorted(skipped)[0]}): run plain "python3 move_images_b2.py" to copy them, then --switch again.')
    if not bad and not skipped: print('Every question now uses B2. Check a few questions load on the site, then run --delete.')


if '--delete' in sys.argv: delete()
elif '--switch' in sys.argv: switch()
else: copy_all()
