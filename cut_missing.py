#!/usr/bin/env python3
"""cut_missing.py  -  cut every Adv/Ext1 paper that has a reading but no output manifest yet (scans get OCR).
Usage: python3 cut_missing.py [--budget seconds] [--jobs 4]   Run again to carry on."""
import glob, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); DOCS = os.path.dirname(HERE)
T0 = time.time()
BUDGET = int(sys.argv[sys.argv.index('--budget') + 1]) if '--budget' in sys.argv else 10**9
JOBS = int(sys.argv[sys.argv.index('--jobs') + 1]) if '--jobs' in sys.argv else 4
RE = re.compile(r'^(?:\d+\s+)?\[(?P<diff>[^\]]+)\]\s+(?P<school>.+?)\s+(?P<year>\d{4})')
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
todo = []
for sub, pre in [('Math Extension 1', 'ext1'), ('Math Advanced', 'adv')]:
    for p in sorted(glob.glob(f'{DOCS}/{sub}/Exams/*.pdf')):
        m = RE.match(os.path.basename(p))
        if not m: continue
        s = pre + '-' + slug(f"{m['school']}-{m['year']}")
        if not os.path.exists(f'{HERE}/output/{s}/manifest.json'): todo.append((s, p))
print(len(todo), 'to cut', flush=True)
def run(t):
    s, p = t
    if time.time() - T0 > BUDGET: return None
    rd = [a for a in [f'{DOCS}/thsc-index/readings', f'{HERE}/readings']]
    for r in rd:
        out = subprocess.run([sys.executable, f'{HERE}/cut_reading.py', p, '--readings', r], capture_output=True, text=True)
        if out.returncode == 0: break
    line = (out.stdout.strip().splitlines() or [''])[-1] if out.returncode == 0 else 'ERROR ' + (out.stderr.strip().splitlines() or ['?'])[-1][:120]
    with open(f'{HERE}/cut_missing.log', 'a') as f: f.write(f'{s}\t{line}\n')
    return s
with ThreadPoolExecutor(JOBS) as ex: done = [x for x in ex.map(run, todo) if x]
print(len(done), 'cut this run;', len(todo) - len(done), 'left', flush=True)
