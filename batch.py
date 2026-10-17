#!/usr/bin/env python3
"""batch.py  -  run cutter.py over every paper in a folder and write a summary.
Usage: python3 batch.py "../Math Extension 1/Exams" [--limit N]"""
import json, os, subprocess, sys, glob, time, re
T0 = time.time()
BUDGET = int(sys.argv[sys.argv.index('--budget')+1]) if '--budget' in sys.argv else 10**9
folder = sys.argv[1]
limit = int(sys.argv[sys.argv.index('--limit')+1]) if '--limit' in sys.argv else None
here = os.path.dirname(os.path.abspath(__file__))
pdfs = sorted(glob.glob(os.path.join(folder, '*.pdf')))[:limit]
rows = []
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
done = set(os.listdir(os.path.join(here, 'output'))) if os.path.isdir(os.path.join(here, 'output')) else set()
subject = os.path.basename(os.path.dirname(os.path.abspath(folder)))
summary = os.path.join(here, 'batch_summary.tsv')
old = {l.split('\t')[0]: l.rstrip('\n') for l in open(summary)} if os.path.exists(summary) else {}
for p in pdfs:
    name = os.path.basename(p)
    if name in old:
        rows.append(tuple(old[name].split('\t'))); continue
    if time.time() - T0 > BUDGET:
        print('BUDGET HIT, resume later'); break
    r = subprocess.run([sys.executable, os.path.join(here, 'cutter.py'), p], capture_output=True, text=True)
    if r.returncode == 2:
        rows.append((name, 'SCANNED', 0, 0, 0)); continue
    if r.returncode != 0:
        rows.append((name, 'ERROR ' + r.stderr.strip().splitlines()[-1][:80], 0, 0, 0)); continue
    out = r.stdout.strip().split('-> ')[-1]
    m = json.load(open(os.path.join(out, 'manifest.json')))
    mcq = sum(1 for q in m['questions'] if q['type']=='mcq')
    parts = len(m['questions']) - mcq
    marks = sum(q['marks'] or 0 for q in m['questions'])
    status = 'OK' if (mcq == 10 and marks == 70) else 'CHECK'
    rows.append((name, status, mcq, parts, marks))
with open(os.path.join(here, 'batch_summary.tsv'), 'w') as f:
    for r in rows: f.write('\t'.join(map(str, r)) + '\n')
from collections import Counter
c = Counter(r[1].split()[0] for r in rows)
print(dict(c), 'of', len(pdfs))
for r in rows:
    if r[1] not in ('OK',): print(r)
