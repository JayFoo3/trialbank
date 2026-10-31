#!/usr/bin/env python3
"""cut_textbook.py - cut a Maths in Focus (Margaret Grove) chapter PDF into one image per exercise question.
    python3 cut_textbook.py "01 Sequences and Series.pdf" out_dir
Writes out_dir/ex1.01-q03.png ... and out_dir/manifest.json [{id, exercise, number, pages, image}]."""
import json, os, re, subprocess, sys, tempfile
from PIL import Image
import numpy as np

DPI = 200; S = DPI / 72.0
TOP, BOTTOM = 70, 785          # page body, in points (header band above, footer legend below)
GAP = 42                       # a vertical gap this big (pt) ends a question's block


def words(pdf):
    xml = subprocess.run(['pdftotext', '-bbox', pdf, '-'], capture_output=True, text=True).stdout
    pages = []
    for pg in xml.split('<page ')[1:]:
        W = float(re.search(r'width="([\d.]+)"', pg).group(1)); H = float(re.search(r'height="([\d.]+)"', pg).group(1))
        ws = [dict(x0=float(a), y0=float(b), x1=float(c), y1=float(d), t=w)
              for a, b, c, d, w in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', pg)]
        pages.append(dict(W=W, H=H, words=ws))
    return pages


def lines(pg):
    """words grouped into lines by y"""
    out = []
    for w in sorted(pg['words'], key=lambda w: (round(w['y0'] / 3), w['x0'])):
        if out and abs(out[-1][0]['y0'] - w['y0']) < 3: out[-1].append(w)
        else: out.append([w])
    return out


def main(pdf, out):
    os.makedirs(out, exist_ok=True)
    pages = words(pdf)
    # exercises: "EXERCISE 1.03" headings
    heads = []
    for pi, pg in enumerate(pages):
        for i, w in enumerate(pg['words']):
            if w['t'] == 'EXERCISE' and i + 1 < len(pg['words']) and re.match(r'^\d+\.\d+$', pg['words'][i + 1]['t']):
                heads.append(dict(ex=pg['words'][i + 1]['t'], page=pi, y=w['y0']))
        txt = ' '.join(w['t'] for w in pg['words'])
        for i, w in enumerate(pg['words']):
            nxt2 = ' '.join(x['t'] for x in pg['words'][i:i + 2])
            if nxt2 == 'Test yourself': heads.append(dict(ex='test', page=pi, y=w['y0']))
            if nxt2 == 'Challenge exercise': heads.append(dict(ex='challenge', page=pi, y=w['y0']))
            if nxt2 == 'CHAPTER SUMMARY': heads.append(dict(ex=None, page=pi, y=w['y0']))
    for kind in ('test', 'challenge'):   # the real ones are at the end of the chapter; earlier mentions are in the intro or contents
        ks = [h for h in heads if h['ex'] == kind]
        if len(ks) > 1:
            last = max(ks, key=lambda h: (h['page'], h['y']))
            heads = [h for h in heads if h['ex'] != kind or h is last]
    heads.sort(key=lambda h: (h['page'], h['y']))
    seen = set(); heads = [h for h in heads if not ((h['ex'], h['page']) in seen or seen.add((h['ex'], h['page'])))]
    items = []
    for hi, h in enumerate(heads):
        if h['ex'] is None: continue
        stop = (heads[hi + 1]['page'], heads[hi + 1]['y']) if hi + 1 < len(heads) else (len(pages), 0)
        # question numbers: 1, 2, 3 ... as the first word of a line near the left of the exercise box
        cands = []
        for pi in range(h['page'], min(stop[0] + 1, len(pages))):
            for w in pages[pi]['words']:
                if (pi, w['y0']) <= (h['page'], h['y']) or (pi, w['y0']) >= stop: continue
                if re.fullmatch(r'\d{1,2}', w['t']) and w['x0'] < pages[pi]['W'] * 0.3: cands.append((pi, w))
        cands.sort(key=lambda c: (c[0], c[1]['y0']))
        # the longest run 1, 2, 3 ... where each side of the book keeps one x for its numbers (search all branchings)
        beams, found = [], []
        for idx, (pi, w) in enumerate(cands):
            v = int(w['t']); q = dict(n=v, page=pi, y=w['y0'], x=w['x0'])
            new = []
            if v == 1: new.append(([q], {pi % 2: w['x0']}))
            for ch, xs in beams:
                if ch[-1]['n'] == v - 1 and (pi % 2 not in xs or abs(w['x0'] - xs[pi % 2]) < 6):
                    new.append((ch + [q], {**xs, pi % 2: xs.get(pi % 2, w['x0'])}))
            beams += new
            keep = {}
            for ch, xs in beams:   # one chain per (length, x-pattern): the earliest is as good as any
                k = (len(ch), tuple(sorted((p, round(x)) for p, x in xs.items())))
                keep.setdefault(k, (ch, xs))
            beams = list(keep.values())
        for ch, xs in beams:
            if len(ch) > len(found): found = ch
        for qi, q in enumerate(found):
            nxt = found[qi + 1] if qi + 1 < len(found) else None
            # the block: lines from the number down, until the next number, a big gap, or the page bottom; may run onto the next page
            spans, pi, y0 = [], q['page'], q['y'] - 5
            while True:
                pg = pages[pi]
                end = nxt['y'] - 5 if nxt and nxt['page'] == pi else BOTTOM
                body = [w for w in pg['words'] if y0 <= w['y0'] < end and w['x0'] >= q['x'] - 6 and w['y0'] < BOTTOM]
                ys = sorted({round(w['y0']) for w in body}); last = y0
                for y in ys:
                    if y - last > GAP and not (nxt and nxt['page'] == pi): break
                    last = max(last, max(w['y1'] for w in body if round(w['y0']) == y))
                if nxt and nxt['page'] == pi: last = end
                spans.append((pi, y0, min(last + 6, end) if end != BOTTOM else last + 6, q['x'] - 8))   # a line starting just above the footer still ends below it
                if nxt and nxt['page'] == pi + 1 and nxt['y'] - TOP > 40 and last >= BOTTOM - GAP:
                    pi += 1; y0 = TOP
                    if nxt['page'] == pi and nxt['y'] - 5 - y0 < 12: break
                    continue
                break
            items.append(dict(ex=h['ex'], n=q['n'], spans=spans))
    # render
    cache = {}
    def page_img(pi):
        if pi not in cache:
            with tempfile.TemporaryDirectory() as t:
                subprocess.run(['pdftoppm', '-r', str(DPI), '-png', '-f', str(pi + 1), '-l', str(pi + 1), pdf, os.path.join(t, 'p')], check=True)
                cache[pi] = Image.open(os.path.join(t, sorted(os.listdir(t))[0])).convert('RGB')
        return cache[pi]
    man = []
    for it in items:
        pieces = []
        for (pi, y0, y1, x0) in it['spans']:
            if y1 - y0 < 6: continue   # an empty or back-to-front span (two numbers read out of order): nothing to cut
            im = page_img(pi); W, H = im.size
            xr = max([w['x1'] for w in pages[pi]['words'] if y0 <= w['y0'] < y1 and w['x0'] >= x0 and w['y0'] < BOTTOM] or [W / S * 0.86])
            right = max(int(x0 * S) + 40, min(int(W * 0.86), int((xr + 10) * S)))
            c = im.crop((int(x0 * S), int(y0 * S), right, int(y1 * S)))   # stop at the text, not the box's border
            a = np.asarray(c).astype(int); sat = (a.max(axis=2) - a.min(axis=2) > 70) & (a.min(axis=2) < 210)
            rows = np.where(sat.sum(axis=1) > max(0.55 * c.size[0], 500))[0]   # a coloured rule runs most of the page; the coloured number badge doesn't; rows = rows[rows > 30]
            if len(rows): c = c.crop((0, 0, c.size[0], int(rows[0]) - 2))
            g = np.asarray(c.convert('L')); ys, xs = np.where(g < 200)
            if not len(ys): continue
            pieces.append(c.crop((max(0, xs.min() - 12), max(0, ys.min() - 12), min(c.size[0], xs.max() + 14), min(c.size[1], ys.max() + 12))))
        if not pieces: continue
        Wd = max(p.size[0] for p in pieces); Hd = sum(p.size[1] for p in pieces) + 20 * (len(pieces) - 1)
        o = Image.new('RGB', (Wd, Hd), 'white'); y = 0
        for p in pieces: o.paste(p, (0, y)); y += p.size[1] + 20
        qid = (f"ex{it['ex']}" if it['ex'][0].isdigit() else it['ex']) + f"-q{it['n']:02d}"
        o.save(os.path.join(out, qid + '.png'), optimize=True)
        ws = [w for (pi, y0, y1, x0) in it['spans'] for w in sorted(pages[pi]['words'], key=lambda w: (w['y0'], w['x0'])) if y0 <= w['y0'] < y1 and w['x0'] >= x0]
        labels = {w['t'] for w in ws}; parts = 0
        while chr(97 + parts) in labels: parts += 1   # a, b, c ... each part is worth a mark
        man.append(dict(id=qid, exercise=it['ex'], number=it['n'], pages=sorted({s[0] + 1 for s in it['spans']}), image=qid + '.png',
                        marks=max(1, parts), text=' '.join(w['t'] for w in ws)[:1500]))
    json.dump(man, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
    from collections import Counter
    print(dict(Counter(m['exercise'] for m in man)), len(man), 'questions')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
