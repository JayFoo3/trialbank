#!/usr/bin/env python3
"""real_hsc.py - turn the cut official HSC Maths Advanced papers into the admin-only "Real HSC" set.

The public site only links out to NESA for HSC papers, so NESA's own questions can't sit in normal practice. This copies each cut
paper output/hsc-adv-<year>/ to output/hscreal-adv-<year>/ with slug hscreal-adv-<year> and subject 'AdvHSC'. That subject is never
offered to students, so the questions only show in the admin "Real HSC" card on Maths Advanced's Practise page (like Margaret).

Steps (Mac):  caffeinate -i python3 read_hsc.py --subject Adv          read the six papers with Claude Code (your plan)
     (Claude) python3 batch_readings.py "../Math Advanced/Exams"       cut them into output/hsc-adv-<year>/
              python3 real_hsc.py                                      make output/hscreal-adv-<year>/
     (Mac)    python3 real_hsc.py --upload                             upload them
"""
import json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'output')
done = []
for year in range(2020, 2026):
    src, dst = os.path.join(OUT, f'hsc-adv-{year}'), os.path.join(OUT, f'hscreal-adv-{year}')
    if not os.path.exists(os.path.join(src, 'manifest.json')):
        print(f'HSC {year}: not cut yet, skipped'); continue
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(src, dst)
    p = os.path.join(dst, 'manifest.json'); m = json.load(open(p))
    m.update(slug=f'hscreal-adv-{year}', subject='AdvHSC', school='HSC', difficulty='HSC')
    json.dump(m, open(p, 'w'), indent=1)
    done.append(m['slug']); print(f'HSC {year}: {m.get("questions")} questions -> {m["slug"]}')
if '--upload' in sys.argv and done:
    for slug in done:
        subprocess.run([sys.executable, os.path.join(HERE, 'upload.py'), '--only', slug], check=True)
