#!/usr/bin/env python3
"""cut_answers.py - cut one chapter's answers into one image per exercise (the marker finds the question number in it).
    python3 cut_answers.py Answers.pdf FIRST_PAGE LAST_PAGE out_dir      (1-based pages of that chapter's answers)
Writes out_dir/ans-ex1.01.png ... ans-test.png, ans-challenge.png"""
import os, re, subprocess, sys, tempfile
from PIL import Image
import numpy as np
DPI = 150; S = DPI / 72.0
pdf, first, last, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
os.makedirs(out, exist_ok=True)
xml = subprocess.run(['pdftotext', '-bbox', '-f', str(first), '-l', str(last), pdf, '-'], capture_output=True, text=True).stdout
pages = []
for pg in xml.split('<page ')[1:]:
    W = float(re.search(r'width="([\d.]+)"', pg).group(1)); H = float(re.search(r'height="([\d.]+)"', pg).group(1))
    ws = [dict(x0=float(a), y0=float(b), x1=float(c), y1=float(d), t=w) for a, b, c, d, w in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', pg)]
    pages.append(dict(W=W, H=H, words=ws))
# headings in reading order: page, column, y
heads = []
for pi, pg in enumerate(pages):
    ws = pg['words']
    for i, w in enumerate(ws):
        two = ' '.join(x['t'] for x in ws[i:i + 2])
        m = re.fullmatch(r'Exercise (\d+\.\d+)', two)
        key = 'ex' + m.group(1) if m else ('test' if two == 'Test yourself' else 'challenge' if two == 'Challenge exercise' else 'practice' if two == 'Practice set' else None)
        if key: heads.append(dict(key=key, page=pi, col=int(w['x0'] > pg['W'] * 0.45), y=w['y0'] - 4))
heads.sort(key=lambda h: (h['page'], h['col'], h['y']))
TOP, FOOT = 40, 40
def col_box(pi, col):
    W, H = pages[pi]['W'], pages[pi]['H']
    return (0.04 * W if col == 0 else 0.48 * W, TOP, 0.49 * W if col == 0 else 0.97 * W, H - FOOT)
cache = {}
def img(pi):
    if pi not in cache:
        with tempfile.TemporaryDirectory() as t:
            subprocess.run(['pdftoppm', '-r', str(DPI), '-png', '-f', str(first + pi), '-l', str(first + pi), pdf, os.path.join(t, 'p')], check=True)
            cache[pi] = Image.open(os.path.join(t, sorted(os.listdir(t))[0])).convert('RGB')
    return cache[pi]
for hi, h in enumerate(heads):
    end = heads[hi + 1] if hi + 1 < len(heads) else dict(page=len(pages) - 1, col=1, y=pages[-1]['H'] - FOOT)
    segs, (pi, col, y0) = [], (h['page'], h['col'], h['y'])
    while True:
        x0, top, x1, bot = col_box(pi, col)
        stop_here = (pi, col) == (end['page'], end['col'])
        segs.append((pi, x0, y0, x1, end['y'] if stop_here else bot))
        if stop_here or (pi, col) > (end['page'], end['col']): break
        pi, col = (pi, 1) if col == 0 else (pi + 1, 0)
        cx0, top, cx1, _ = col_box(pi, col)
        nums = [w['y0'] for w in pages[pi]['words'] if cx0 <= w['x0'] < cx0 + 0.06 * pages[pi]['W'] and re.fullmatch(r'\d{1,2}|[a-j]', w['t']) and w['y0'] > top]
        y0 = (min(nums) - 16) if nums else top   # where the answers carry on (skips a page title and intro)
    pieces = []
    for (pi, x0, y0, x1, y1) in segs:
        if y1 - y0 < 6: continue
        c = img(pi).crop((int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S)))
        g = np.asarray(c.convert('L')); ys, xs = np.where(g < 200)
        if len(ys) and ys.max() - ys.min() > 10: pieces.append(c.crop((max(0, xs.min() - 10), max(0, ys.min() - 8), min(c.size[0], xs.max() + 10), min(c.size[1], ys.max() + 8))))
    if not pieces: print(h['key'], 'empty'); continue
    Wd = max(p.size[0] for p in pieces); o = Image.new('RGB', (Wd, sum(p.size[1] + 16 for p in pieces)), 'white'); y = 0
    for p in pieces: o.paste(p, (0, y)); y += p.size[1] + 16
    o.save(os.path.join(out, f"ans-{h['key']}.png"), optimize=True); print(h['key'], o.size)
