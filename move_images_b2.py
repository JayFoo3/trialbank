#!/usr/bin/env python3
"""move_images_b2.py - move the question and solution images out of Supabase storage (free plan: 1 GB) into Backblaze B2.

  python3 move_images_b2.py            1. makes sure the B2 bucket lets the site load images (CORS)
                                       2. copies every question/solution image Supabase -> B2 (same path), checks each size
                                       Safe to stop and run again: anything already in B2 at the right size is skipped.
  (then the site and edge functions are deployed, and every image path gets 'b2:' in front, e.g. b2:hsc-ext2-2020/q11a.webp)
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


def ensure_cors():
    """The site loads images with crossOrigin='anonymous' (to trim and draw them), so B2 must send CORS headers."""
    a = requests.get('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', auth=(b2.KEY_ID, b2.APP_KEY), timeout=60)
    if a.status_code >= 300: sys.exit(f'B2 sign-in failed: {a.status_code} {a.text[:200]}')
    a = a.json(); api = a['apiInfo']['storageApi']['apiUrl']; tok = {'Authorization': a['authorizationToken']}
    lb = requests.post(f'{api}/b2api/v3/b2_list_buckets', headers=tok, json={'accountId': a['accountId'], 'bucketName': b2.BUCKET}, timeout=60)
    if lb.status_code >= 300 or not lb.json().get('buckets'):
        return print('Could not read the bucket settings with this key. Set CORS by hand: Backblaze > Buckets > your bucket > CORS Rules >'
                     ' "Share everything in this bucket with all HTTPS origins", tick S3 compatible API, Save. Then run this again.') or False
    bk = lb.json()['buckets'][0]; rules = bk.get('corsRules') or []
    if any('*' in r.get('allowedOrigins', []) or 'https' in r.get('allowedOrigins', []) for r in rules if 's3_get' in r.get('allowedOperations', [])):
        print('B2 CORS: already set'); return True
    rules = rules + [{'corsRuleName': 'trialbankImages', 'allowedOrigins': ['https'], 'allowedHeaders': ['*'],
                      'allowedOperations': ['s3_get', 's3_head'], 'exposeHeaders': ['content-length'], 'maxAgeSeconds': 86400}]
    u = requests.post(f'{api}/b2api/v3/b2_update_bucket', headers=tok, json={'accountId': a['accountId'], 'bucketId': bk['bucketId'], 'corsRules': rules}, timeout=60)
    if u.status_code >= 300:
        print(f'Could not set CORS ({u.status_code} {u.text[:150]}). Set it by hand: Backblaze > Buckets > your bucket > CORS Rules >'
              ' "Share everything in this bucket with all HTTPS origins", tick S3 compatible API, Save. Then run this again.'); return False
    print('B2 CORS: set (images can load on the site)'); return True


def copy_all():
    if not ensure_cors(): sys.exit(1)
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
    with ThreadPoolExecutor(8) as ex: list(ex.map(one, todo))
    for b in bad[:30]: print('  !', b)
    print('Checking everything landed in B2...')
    have = b2.listing()
    wrong = [p for p in paths if p not in have or (p in sizes and have[p] != sizes[p])]
    with open(DONE, 'w') as log: log.write('\n'.join(p for p in paths if p not in wrong) + '\n')
    print(f'Copied {n[0]} this run. ' + ('ALL IMAGES ARE IN B2. Tell Claude, so the site can switch over.' if not wrong else f'{len(wrong)} missing or wrong size (e.g. {wrong[0]}): run it again.'))


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


delete() if '--delete' in sys.argv else copy_all()
