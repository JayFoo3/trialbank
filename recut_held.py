"""recut_held.py - re-cut the papers listed in held_papers.txt with the improved cutter, one at a time.
Resumable: OCR pages are cached, and a paper is skipped once recut_done.txt lists it.
    python3 recut_held.py [--budget SECONDS]"""
import glob, json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); DOCS = os.path.dirname(HERE)
budget = float(sys.argv[sys.argv.index('--budget') + 1]) if '--budget' in sys.argv else 1e9
t0 = time.time()
done_f = os.path.join(HERE, 'recut_done.txt')
done = set(open(done_f).read().split()) if os.path.exists(done_f) else set()
for line in open(os.path.join(HERE, 'held_papers.txt')):
    slug = line.split('\t')[0].strip()
    if not slug or slug in done: continue
    left = budget - (time.time() - t0)
    if left < 20: print('out of time, run again to continue'); break
    m = json.load(open(os.path.join(HERE, 'output', slug, 'manifest.json')))
    folder = {'Adv': 'Math Advanced', 'Ext1': 'Math Extension 1', 'Ext2': 'Math Extension 2', 'Std2': 'Math Standard 2'}.get(m['subject'], '*')
    hits = glob.glob(os.path.join(DOCS, folder, 'Exams', glob.escape(m['file'])))
    if not hits: print(slug, 'PDF not found'); done.add(slug); continue
    try:
        r = subprocess.run([sys.executable, os.path.join(HERE, 'cut_reading.py'), hits[0]], capture_output=True, text=True, timeout=left)
    except subprocess.TimeoutExpired:
        print(slug, 'still going (OCR is cached, run again)'); break
    out = [l for l in (r.stdout + r.stderr).splitlines() if '->' in l]
    print(out[-1] if out else slug + ': ' + (r.stdout + r.stderr).strip()[-300:])
    done.add(slug); open(done_f, 'w').write('\n'.join(sorted(done)) + '\n')
