#!/usr/bin/env python3
"""
stems.py  -  put each question's shared intro (the text/diagram between "Question 21" and "(a)") on top of
every part's image. The cutter starts each part at its "(a)" label, so the intro was being dropped.

    python3 stems.py [--only adv-amity-2022] [--prefix adv-]
Originals are kept in <paper>/_nostem/ (re-running is safe: it always builds from those).
Writes stems_changed.json (what changed) for upload_stems.py.
"""
import argparse, glob, json, os, re, shutil, sys, tempfile
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutter import parse_pages, render_page, page_body_bounds, PAD_TOP

HERE = os.path.dirname(os.path.abspath(__file__))
DPI = 150
BOILER = re.compile(r'(booklet|writing (page|space)|answer (page|sheet)|new (page|booklet)|attempt (question|this)|separate|^marks$|continued|^end of|'
                    r'^question\s+\d+\s*(\(\s*\d+\s*marks?\s*\))?\s*\.?$|^\(\s*\d+\s*marks?\s*\)$|^\d+\s*marks?$|'
                    r'answer (this|the) question|in the (space|lines) provided|^page \d+)', re.I)
HEADWORD = re.compile(r'^(question|\d{1,2}[.)]?|\(\d+|marks?\)?\.?|\(\d+\s*marks?\)\.?)$', re.I)


def running_heads(pages):
    """Header/footer lines that repeat on many pages (school name, course, page numbers)."""
    from collections import Counter
    c = Counter(re.sub(r'\d+', '#', l['text'].strip()).lower() for pg in pages for l in pg['lines'] if l['y0'] < 70 or l['y1'] > pg['height'] - 90)
    return {t for t, k in c.items() if k >= 3}


def stem_crops(pages, head, part, running=frozenset()):
    """[(page, y0, y1, boxes to whiten)] covering the intro, and the intro's text."""
    out, text = [], []
    for p in range(head['page'], part['page'] + 1):
        pg = pages[p]
        top, bot = page_body_bounds(pg)
        y0 = head['y'] - 2 if p == head['page'] else top
        y1 = part['y'] - PAD_TOP if p == part['page'] else bot
        if y1 - y0 < 6:
            continue
        white = []
        for l in pg['lines']:
            if l['y1'] < y0 or l['y0'] > y1:
                continue
            t = l['text'].strip()
            if p == head['page'] and abs(l['y0'] - head['y']) < 3:
                # the heading line: blank "Question 21 (3 marks)" but keep any intro text on the same line
                rest = [w for i, w in enumerate(l['words']) if not (i < 5 and HEADWORD.match(w[4]))]
                rest_t = ' '.join(w[4] for w in rest)
                drop_all = bool(BOILER.search(rest_t)) or len(rest) < 3
                for w in l['words']:
                    if drop_all or w not in rest:
                        white.append((w[0] - 1, w[1] - 1, w[2] + 1, w[3] + 1))
                if not drop_all:
                    text.append(rest_t)
                continue
            if (BOILER.search(t) and len(l['words']) <= 12) or (l['x0'] > pg['width'] * 0.78 and len(l['words']) == 1) or re.sub(r'\d+', '#', t).lower() in running:
                white.append((l['x0'] - 1, l['y0'] - 1, l['x1'] + 1, l['y1'] + 1))
            else:
                text.append(t)
        out.append((p, y0, y1, white))
    return out, ' '.join(text)


RE_HEAD = lambda n: re.compile(rf'^(question\s+{n}\b|{n}[.)]?$|{n}[.)]\s)', re.I)
RE_FIRST = lambda lab: re.compile(rf'^\(?{re.escape(lab)}[).]', re.I)   # (a)  a)  a.  (i)  i.


def locate(pages, n, pa, lab='a'):
    """The "Question n" heading and its "(a)" line, given the page (a) is on. (None, None) if not found."""
    if not (0 <= pa < len(pages)):
        return None, None
    for hp in (pa, pa - 1):
        if hp < 0:
            continue
        pg = pages[hp]
        heads = [l for l in pg['lines'] if l['x0'] < 0.3 * pg['width'] and RE_HEAD(n).match(l['text'].strip())
                 and not re.search(r'cont', l['text'], re.I)]
        if not heads:
            continue
        hl = heads[0]
        h = dict(page=hp, y=hl['y0'])
        for p in range(hp, pa + 1):
            for l in pages[p]['lines']:
                if (p, l['y0']) <= (hp, hl['y0']) or l['x0'] > 0.3 * pages[p]['width']:
                    continue
                if RE_FIRST(lab).match(l['words'][0][4]):
                    return (h, dict(page=p, y=l['y0'])) if p == pa else (None, None)
                if RE_HEAD(n + 1).match(l['text'].strip()):
                    return None, None
        return None, None
    return None, None


def render_stem(pdf, crops, cache, tmp):
    s = DPI / 72.0
    pieces = []
    for (p, y0, y1, white) in crops:
        img = render_page(pdf, p, DPI, cache, tmp).copy()
        d = ImageDraw.Draw(img)
        for (a, b, c, e) in white:
            d.rectangle([a * s, b * s, c * s, e * s], fill='white')
        W, H = img.size
        pc = img.crop((int(0.06 * W), int(y0 * s), int(0.97 * W), min(H, int(y1 * s))))
        bb = pc.convert('L').point(lambda v: 255 if v < 200 else 0).getbbox()
        if not bb:
            continue
        pieces.append(pc.crop((0, max(0, bb[1] - 8), pc.size[0], min(pc.size[1], bb[3] + 8))))
    if not pieces or sum(p.size[1] for p in pieces) < 20:
        return None
    w = max(p.size[0] for p in pieces)
    out = Image.new('RGB', (w, sum(p.size[1] for p in pieces) + 8 * (len(pieces) - 1)), 'white')
    y = 0
    for p in pieces:
        out.paste(p, (0, y)); y += p.size[1] + 8
    return out


def compose(stem, part):
    if stem.size[0] != part.size[0]:
        k = part.size[0] / stem.size[0]
        stem = stem.resize((part.size[0], max(1, round(stem.size[1] * k))))
    out = Image.new('RGB', (part.size[0], stem.size[1] + 14 + part.size[1]), 'white')
    out.paste(stem, (0, 0))
    ImageDraw.Draw(out).line([(int(part.size[0] * 0.04), stem.size[1] + 6), (int(part.size[0] * 0.96), stem.size[1] + 6)], fill=(215, 215, 215), width=1)
    out.paste(part, (0, stem.size[1] + 14))
    return out


_SRC = None
def source_pdf(m):
    """The original PDF for a paper cut without a copy (matched by file name, checked by sha256)."""
    global _SRC
    import hashlib
    if _SRC is None:
        _SRC = {}
        docs = os.path.dirname(HERE)
        for root, dirs, files in os.walk(docs):
            dirs[:] = [d for d in dirs if d not in ('output', 'node_modules', '.git', 'curseforge', 'Projects')]
            for f in files:
                if f.lower().endswith('.pdf'): _SRC.setdefault(f, []).append(os.path.join(root, f))
    for path in _SRC.get(m.get('file') or '', []):
        h = hashlib.sha256(open(path, 'rb').read()).hexdigest()
        if not m.get('sha256') or h == m['sha256']: return path
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only'); ap.add_argument('--prefix')
    ap.add_argument('--nocopy', action='store_true', help='only papers cut without a paper.pdf copy');
    ap.add_argument('--start', type=int, default=0); ap.add_argument('--count', type=int, default=100000)
    a = ap.parse_args()
    cj = os.path.join(HERE, 'stems_changed.json')
    done = json.load(open(cj)) if os.path.exists(cj) else {}
    changed = {}
    for mpath in sorted(glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json')))[a.start:a.start + a.count]:
        folder = os.path.dirname(mpath); slug = os.path.basename(folder)
        if (a.only and slug != a.only) or (a.prefix and not slug.startswith(a.prefix)):
            continue
        pdf = os.path.join(folder, 'paper.pdf')
        if a.nocopy and os.path.exists(pdf): continue
        m = json.load(open(mpath))
        if not os.path.exists(pdf): pdf = source_pdf(m) or pdf   # cut by the reader: use the original from the subject folders
        if not os.path.exists(pdf) or m.get('scanned'):
            continue
        try:
            pages = parse_pages(pdf)
        except Exception as e:
            print(f'{slug}: skipped ({e})', file=sys.stderr); continue
        byq = {}
        for q in m['questions']:
            if q.get('part') and q.get('image') and q.get('type') != 'mcq':
                byq.setdefault(q['number'], []).append(q)
        cache, running = {}, running_heads(pages)
        for k in [k for k in done if k.startswith(slug + '/')]:
            del done[k]                               # rebuild this paper from scratch
        if os.path.isdir(os.path.join(folder, '_nostem')):
            for fn in os.listdir(os.path.join(folder, '_nostem')):
                shutil.copy2(os.path.join(folder, '_nostem', fn), os.path.join(folder, fn))
        with tempfile.TemporaryDirectory() as tmp:
            for n, qs in byq.items():
                qa = next((q for q in qs if q.get('pages')), None)   # the question's first part, whatever it's called
                if not qa:
                    continue
                h, f = locate(pages, n, qa['pages'][0] - 1, str(qa['part']))
                if not h:
                    continue
                crops, text = stem_crops(pages, h, f, running)
                if len(text) < 15:
                    continue
                norm = lambda t: re.sub(r'\W+', '', t or '').lower()
                if norm(text)[:30] and norm(text)[:30] in norm(qa.get('text')):
                    continue   # this paper's (a) already shows the intro
                stem = render_stem(pdf, crops, cache, tmp)
                if stem is None:
                    continue
                os.makedirs(os.path.join(folder, '_nostem'), exist_ok=True)
                for q in qs:
                    src = os.path.join(folder, q['image']); keep = os.path.join(folder, '_nostem', q['image'])
                    if not os.path.exists(keep):
                        if not os.path.exists(src): continue
                        shutil.copy2(src, keep)
                    compose(stem, Image.open(keep).convert('RGB')).save(src, optimize=True)
                    changed[f"{slug}/{q['id']}"] = dict(image=os.path.relpath(src, HERE), stem_text=text[:1500])
        n_here = sum(1 for k in changed if k.startswith(slug + '/'))
        if n_here: print(f'{slug}: {n_here} parts got their intro', flush=True)
    done.update(changed)
    json.dump(done, open(cj, 'w'), indent=1, ensure_ascii=False)
    print(f'{len(changed)} part images updated this run; {len(done)} listed in stems_changed.json')


if __name__ == '__main__':
    main()
