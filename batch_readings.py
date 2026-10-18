#!/usr/bin/env python3
"""Run cut_reading.py over every paper in a folder that has a reading. Resumable; respects a time budget.
Usage: python3 batch_readings.py "../Math Extension 1/Exams" [--budget 140]"""
import os, sys, glob, json, subprocess, time, re
here = os.path.dirname(os.path.abspath(__file__))
folder = sys.argv[1]
budget = int(sys.argv[sys.argv.index('--budget')+1]) if '--budget' in sys.argv else 10**9
t0 = time.time()
summary = os.path.join(here, 'cut_summary.tsv')
old = {}
if os.path.exists(summary):
    for line in open(summary):
        k, v = line.rstrip('\n').split('\t', 1); old[k] = v
rows = dict(old)
n_new = 0
# rows are keyed '<subject folder>/<file>' (subjects share file names like '[Medium] Caringbah 2024 (w. sol).pdf');
# older rows used the bare file name, which only these folders ever wrote
subj_dir = os.path.basename(os.path.dirname(os.path.abspath(folder)))
LEGACY = {'Math Extension 1', 'Physics', 'Math Advanced'}
for p in sorted(glob.glob(os.path.join(folder, '*.pdf'))):
    bare = os.path.basename(p)
    name = f'{subj_dir}/{bare}'
    prev = old.get(name) or (old.get(bare) if subj_dir in LEGACY else None)
    if prev and not prev.startswith('NO READING'):
        continue
    if time.time() - t0 > budget:
        print('BUDGET HIT'); break
    r = subprocess.run([sys.executable, os.path.join(here, 'cut_reading.py'), p], capture_output=True, text=True)
    if r.returncode == 3:
        rows[name] = 'NO READING'
    elif r.returncode != 0:
        rows[name] = 'ERROR ' + (r.stderr.strip().splitlines() or ['?'])[-1][:120]
    else:
        rows[name] = r.stdout.strip().split(': ', 1)[-1]
    n_new += 1
    with open(summary, 'w') as f:
        for k in sorted(rows): f.write(f'{k}\t{rows[k]}\n')
from collections import Counter
c = Counter('NO READING' if v.startswith('NO READING') else 'ERROR' if v.startswith('ERROR') else 'CUT' for v in rows.values())
print(dict(c), 'processed now:', n_new)
for k in sorted(rows):
    if rows[k].startswith('ERROR') or (' 0 coarse' not in rows[k] and not rows[k].startswith('NO')): print(k, '|', rows[k])
