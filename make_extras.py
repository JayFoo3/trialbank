#!/usr/bin/env python3
"""make_extras.py - for every cut paper in output/, make what the site needs besides the questions:
  output/<slug>/paper.pdf   the paper without its solutions (what "Download PDF" serves)
  output/<slug>/thumb.webp  a small first-page picture for the Papers grid
Skips anything already made. Needs poppler (pdftoppm) and qpdf.  Usage: python3 make_extras.py [--root ~/Documents]"""
import glob, json, os, subprocess, sys, tempfile
from PIL import Image
from upload_pdfs import paper_end
HERE = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[sys.argv.index('--root') + 1] if '--root' in sys.argv else os.path.dirname(HERE)
FOLDERS = {'Ext1': 'Math Extension 1/Exams', 'Physics': 'Physics/Exams'}
made = 0
for man in sorted(glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json'))):
    d = os.path.dirname(man); m = json.load(open(man))
    need_pdf = not os.path.exists(os.path.join(d, 'paper.pdf')); need_thumb = not os.path.exists(os.path.join(d, 'thumb.webp'))
    if not (need_pdf or need_thumb):
        continue
    src = os.path.join(root, FOLDERS.get(m['subject'], ''), m['file'])
    if not os.path.exists(src):
        print('missing source', m['slug'], src); continue
    if need_pdf:
        end = paper_end(m)
        subprocess.run(['qpdf', src, '--pages', '.', f'1-{end}', '--', os.path.join(d, 'paper.pdf')], check=True)
    if need_thumb:
        with tempfile.TemporaryDirectory() as t:
            subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', '72', '-png', src, os.path.join(t, 'p')], check=True)
            im = Image.open(glob.glob(os.path.join(t, 'p*.png'))[0]).convert('RGB')
            im = im.resize((360, round(im.height * 360 / im.width)), Image.LANCZOS)
            im.save(os.path.join(d, 'thumb.webp'), quality=80, method=6)
    made += 1; print('made', m['slug'], 'paper.pdf' if need_pdf else '', 'thumb' if need_thumb else '')
print('done,', made, 'papers updated')
