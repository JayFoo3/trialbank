#!/usr/bin/env python3
"""move_pdfs_b2.py - copy every paper PDF from Supabase storage into the Backblaze B2 bucket, check them, then (only
when asked) delete them from Supabase. Safe to run again: anything already in B2 at the right size is skipped.

  python3 move_pdfs_b2.py            copy what's missing, then check every file
  python3 move_pdfs_b2.py --delete   check every file again, and only if ALL match, delete the PDFs from Supabase
Needs SUPABASE_URL, SUPABASE_SERVICE_KEY, B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT."""
import os, sys, time
import requests
import b2

URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
BUCKET = 'questions'


def get(url, **kw):
    for i in range(5):
        try:
            r = requests.get(url, headers=H, timeout=180, **kw)
            if r.status_code < 500: return r
        except requests.RequestException:
            pass
        time.sleep(3 * (i + 1))
    sys.exit(f'Supabase GET failed: {url}')


def pdf_paths():
    r = get(f'{URL}/rest/v1/papers?select=slug,pdf_path,pdf_sol_path&or=(pdf_path.not.is.null,pdf_sol_path.not.is.null)')
    if r.status_code >= 300: sys.exit(f'papers -> {r.status_code}: {r.text[:200]}')
    return sorted({p for row in r.json() for p in (row['pdf_path'], row['pdf_sol_path']) if p})


def supabase_sizes(paths):
    """{path: size} from Supabase's own records, one listing per paper folder."""
    out = {}
    for folder in sorted({p.rsplit('/', 1)[0] for p in paths}):
        r = requests.post(f'{URL}/storage/v1/object/list/{BUCKET}', headers=H, json={'prefix': folder + '/', 'limit': 100}, timeout=60)
        for o in (r.json() if r.status_code < 300 else []):
            if o.get('name', '').endswith('.pdf') and o.get('metadata'):
                out[f'{folder}/{o["name"]}'] = int(o['metadata'].get('size', 0))
    return out


def main():
    if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
    b2.need()
    paths = pdf_paths()
    print(f'{len(paths)} PDFs listed on papers')
    sb = supabase_sizes(paths)
    paths = sorted(set(paths) | set(sb))     # also carry spare PDFs no paper points to, so nothing is lost
    have = b2.listing()
    gone = [p for p in paths if p not in sb and p not in have]
    if gone: print(f'  {len(gone)} listed on papers but in neither store (already missing): {gone[:5]}')

    if '--delete' not in sys.argv:
        todo = [p for p in paths if p in sb and have.get(p) != sb[p]]
        print(f'{len(paths) - len(todo)} already in B2, copying {len(todo)}')
        done_mb = 0
        for i, p in enumerate(todo, 1):
            r = get(f'{URL}/storage/v1/object/{BUCKET}/{p}')
            if r.status_code >= 300: print(f'  skip {p}: Supabase {r.status_code}'); continue
            b2.put(p, r.content); done_mb += len(r.content) / 1048576
            if i % 20 == 0 or i == len(todo): print(f'  {i}/{len(todo)}  ({done_mb:.0f} MB)')
        have = b2.listing()

    # check: every PDF Supabase holds must be in B2 at exactly the same size
    bad = [p for p in sb if have.get(p) != sb[p]]
    ok = len(sb) - len(bad)
    print(f'check: {ok} of {len(sb)} match in B2' + (f', {len(bad)} do not: {bad[:5]}' if bad else ' - all good'))
    if '--delete' not in sys.argv:
        if not bad: print('Next: switch the site over, then run with --delete to free the space in Supabase.')
        return
    if bad: sys.exit('Not deleting anything: fix the files above first (run without --delete).')
    keys = sorted(sb)
    for i in range(0, len(keys), 100):
        r = requests.delete(f'{URL}/storage/v1/object/{BUCKET}', headers=H, json={'prefixes': keys[i:i + 100]}, timeout=120)
        if r.status_code >= 300: sys.exit(f'delete -> {r.status_code}: {r.text[:200]}')
    print(f'deleted {len(keys)} PDFs from Supabase ({sum(sb.values()) / 1048576:.0f} MB freed)')


if __name__ == '__main__':
    main()
