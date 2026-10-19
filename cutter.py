#!/usr/bin/env python3
"""
cutter.py  -  split an HSC past paper PDF into individual questions.

Usage:
    python3 cutter.py "path/to/paper.pdf" [--out output_dir] [--dpi 150]

Output (one folder per paper):
    output/<slug>/manifest.json      metadata + text for every question
    output/<slug>/q01.png            Section I multiple choice, one image each
    output/<slug>/q11a.png           Section II parts, one image each
    output/<slug>/sol_p13.png ...    solution pages (whole page images)

Needs: poppler (pdftotext, pdftoppm, pdfinfo) and Pillow. No other deps.
"""
import argparse, json, os, re, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
from PIL import Image

HEADER_PT = 40      # ignore text above this (running headers)
FOOTER_PT = 60      # ignore text within this distance of page bottom (page numbers)
PAD_TOP = 6         # padding above a question's first line, in points
PAD_BOTTOM = 10

RE_QHEAD = re.compile(r'^Question\s+(\d+)\b', re.I)
RE_PART = re.compile(r'^\(([a-z])\)$')
RE_END_S1 = re.compile(r'end of section i\b', re.I)
RE_END_PAPER = re.compile(r'end of (paper|exam|examination|question \d+ and the paper)', re.I)
RE_SOLN = re.compile(r'(marking scheme|marking guidelines|marking criteria|solutions?|suggested answers?|sample answers?|answers|criteria|worked)', re.I)
RE_FILENAME = re.compile(r'^(?:\d+\s+)?\[(?P<diff>[^\]]+)\]\s+(?P<school>.+?)\s+(?P<year>20\d\d)')


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


def strip_ns(tag):
    return tag.split('}', 1)[-1]


def parse_pages(pdf):
    """Return list of pages; each page = dict(width, height, lines=[dict(x0,y0,x1,y1,words,text)])."""
    xml = run(['pdftotext', '-bbox-layout', pdf, '-'])
    xml = re.sub(r'[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\U00010000-\U0010FFFF]', '', xml)
    root = ET.fromstring(xml)
    pages = []
    for el in root.iter():
        if strip_ns(el.tag) != 'page':
            continue
        w, h = float(el.get('width')), float(el.get('height'))
        lines = []
        for ln in el.iter():
            if strip_ns(ln.tag) != 'line':
                continue
            words = [(float(wd.get('xMin')), float(wd.get('yMin')), float(wd.get('xMax')),
                      float(wd.get('yMax')), re.sub(r'[\u200b-\u200f\u2060\ufeff]', '', wd.text or '').strip())
                     for wd in ln if strip_ns(wd.tag) == 'word']
            words = [w for w in words if w[4]]   # zero-width characters (some Word exports put them after "1.") leave empty words
            if not words:
                continue
            y0 = float(ln.get('yMin')); y1 = float(ln.get('yMax'))
            if y1 < HEADER_PT or y0 > h - FOOTER_PT:
                continue
            lines.append(dict(x0=float(ln.get('xMin')), y0=y0, x1=float(ln.get('xMax')), y1=y1,
                              words=words, text=' '.join(w[4] for w in words)))
        lines.sort(key=lambda l: (round(l['y0']), l['x0']))
        pages.append(dict(width=w, height=h, lines=lines))
    return pages


def left_margin(pages, lo, hi):
    """Most common left x of lines in a page range (the body text margin)."""
    xs = [round(l['x0']) for p in pages[lo:hi] for l in p['lines']]
    top = max(xs.count(x) for x in set(xs)) if xs else 0
    common = [x for x in set(xs) if xs.count(x) >= max(3, 0.1 * top)]
    return min(common) if common else (min(xs) if xs else 56.0)


def marks_near(page, line):
    """Right-margin integer level with this line (within ~1.5 lines below) = marks for the part."""
    best = None
    for l in page['lines']:
        if l['y0'] < line['y0'] - 3 or l['y0'] > line['y0'] + 18:
            continue
        for x0, y0, x1, y1, t in l['words']:
            if x0 > page['width'] * 0.78 and re.fullmatch(r'\d{1,2}', t):
                if best is None or abs(l['y0'] - line['y0']) < best[0]:
                    best = (abs(l['y0'] - line['y0']), int(t))
    return best[1] if best else None


RE_SEC1 = re.compile(r'^SECTION\s+(I|1)\b(?!I)', re.I)
RE_SEC2 = re.compile(r'^SECTION\s+(II|2)\b', re.I)
RE_NUM = re.compile(r'^Q?(\d{1,2})[.)]?$', re.I)
RE_OPT = re.compile(r'^\(?([A-D])[.):]?$')
RE_PARTW = re.compile(r'^\(?([a-z])\)')


def level_text(plines, l):
    return any(abs(o['y0'] - l['y0']) < 5 and o['x0'] > l['x0'] + 10 for o in plines)


def find_sections(pages):
    sec1 = sec2 = None
    for pi, p in enumerate(pages):
        if pi == 0:
            continue
        for l in p['lines']:
            if l['y0'] > p['height'] * 0.25:
                continue
            t = l['text'].strip()
            if sec1 is None and RE_SEC1.match(t):
                sec1 = pi
            elif sec2 is None and RE_SEC2.match(t):
                sec2 = pi
    return sec1, sec2


def find_mcq_numbered(pages, lo, hi):
    cands = []
    for pi in range(lo, hi):
        plines = pages[pi]['lines']
        W = pages[pi]['width']
        for l in plines:
            m = RE_NUM.match(l['words'][0][4])
            if m and l['x0'] < 0.3 * W and (len(l['words']) > 1 or level_text(plines, l)):
                cands.append((pi, l['y0'], l['x0'], int(m.group(1))))
    if not cands:
        return []
    xs = [round(c[2] / 5) * 5 for c in cands]
    col = max(set(xs), key=xs.count)
    items = []
    expect = 1
    pos = (lo, -1)
    for c in sorted(cands):
        if c[3] == expect and abs(c[2] - col) < 15 and (c[0], c[1]) > pos:
            items.append(dict(kind='mcq', number=expect, part=None, page=c[0], y=c[1], marks=1))
            expect += 1
            pos = (c[0], c[1])
    return items


def find_mcq_by_options(pages, lo, hi):
    """Fallback when question numbers aren't in the text layer: use the (A)...(D) option markers."""
    A, D = [], []
    for pi in range(lo, hi):
        plines = pages[pi]['lines']
        W = pages[pi]['width']
        for l in plines:
            m = RE_OPT.match(l['words'][0][4])
            if m and l['x0'] < 0.3 * W:
                if m.group(1) == 'A':
                    A.append((pi, l['y0'], l['x0']))
                elif m.group(1) == 'D':
                    D.append((pi, l['y0'], l['x0']))
    if len(A) < 3:
        return []
    items = []
    prev_d = None
    for n, a in enumerate(A, start=1):
        # candidate start lines: body lines between previous D marker and this A marker
        lines = []
        for pi in range(a[0] if prev_d is None else prev_d[0], a[0] + 1):
            for l in pages[pi]['lines']:
                key = (pi, l['y0'])
                if prev_d is not None and key <= (prev_d[0], prev_d[1]):
                    continue
                if key >= (a[0], a[1]):
                    continue
                if l['x0'] <= a[2] + 2:
                    lines.append((pi, l['y0'], l['y1']))
        if not lines:
            continue
        if prev_d is None or lines[0][0] != prev_d[0]:
            # new page: question starts at the first body line on this page
            first = [x for x in lines if x[0] == a[0]]
            start = first[0] if first else lines[0]
        else:
            # same page: start after the largest vertical gap
            gaps = [(lines[i][1] - lines[i - 1][2], i) for i in range(1, len(lines))]
            gaps.append((lines[0][1] - prev_d[1], 0))
            start = lines[max(gaps)[1]]
        items.append(dict(kind='mcq', number=n, part=None, page=start[0], y=start[1], marks=1))
        prev_d = D[n - 1] if n - 1 < len(D) else a
    return items


def find_section2(pages, lo, hi, first_q):
    items = []
    cur_q = None
    expect_part = None
    end_markers = []
    for pi in range(lo, hi):
        p = pages[pi]
        W = p['width']
        for l in p['lines']:
            t = l['text'].strip()
            first = l['words'][0][4]
            m = RE_QHEAD.match(t)
            if m and l['x0'] < 0.35 * W and not re.search(r'cont', t, re.I):
                n = int(m.group(1))
                if (cur_q is None and n >= first_q) or (cur_q is not None and n == cur_q + 1):
                    cur_q = n
                    expect_part = 'a'
                    items.append(dict(kind='qhead', number=n, part=None, page=pi, y=l['y0'], marks=None))
                    continue
            if cur_q is None:
                # papers that just write "11" / "11." at the margin instead of "Question 11"
                mn = RE_NUM.match(first)
                if mn and int(mn.group(1)) == first_q and l['x0'] < 0.2 * W:
                    cur_q = first_q
                    expect_part = 'a'
                    items.append(dict(kind='qhead', number=cur_q, part=None, page=pi, y=l['y0'], marks=None))
                    continue
            elif RE_NUM.match(first) and int(RE_NUM.match(first).group(1)) == cur_q + 1 and l['x0'] < 0.2 * W \
                    and (len(l['words']) > 1 or level_text(p['lines'], l)) and not RE_QHEAD.match(t):
                cur_q += 1
                expect_part = 'a'
                items.append(dict(kind='qhead', number=cur_q, part=None, page=pi, y=l['y0'], marks=None))
                continue
            if cur_q is not None:
                pm = RE_PARTW.match(first)
                if pm and pm.group(1) == expect_part and l['x0'] < 0.25 * W:
                    items.append(dict(kind='part', number=cur_q, part=expect_part, page=pi, y=l['y0'], marks=None))
                    expect_part = chr(ord(expect_part) + 1)
            if RE_END_PAPER.search(t):
                end_markers.append((pi, l['y0']))
                return items, end_markers
    return items, end_markers


def find_structure(pages):
    sec1, sec2 = find_sections(pages)
    n = len(pages)
    lo = sec1 if sec1 is not None else 1
    if sec2 is None:
        for pi in range(lo + 1, n):
            W = pages[pi]['width']
            if any(RE_QHEAD.match(l['text'].strip()) and l['x0'] < 0.35 * W and int(RE_QHEAD.match(l['text'].strip()).group(1)) > 5
                   for l in pages[pi]['lines']):
                sec2 = pi
                break
    hi = sec2 if sec2 is not None else n
    mcq = find_mcq_numbered(pages, lo, hi)
    for i in range(1, len(mcq)):
        if mcq[i]['page'] - mcq[i - 1]['page'] > 2:
            mcq = mcq[:i]
            break
    if len(mcq) < 5:
        alt = find_mcq_by_options(pages, lo, hi)
        if len(alt) > len(mcq):
            mcq = alt
    if sec2 is None:
        sec2 = (mcq[-1]['page'] + 1) if mcq else 1
    first_q = (len(mcq) + 1) if mcq else 11
    s2, end_markers = find_section2(pages, sec2, n, first_q)
    # questions with a heading but no lettered parts -> split on the marks column
    heads = [it for it in s2 if it['kind'] == 'qhead']
    for hi_, h in enumerate(heads):
        if any(it['kind'] == 'part' and it['number'] == h['number'] for it in s2):
            continue
        nxt = heads[hi_ + 1] if hi_ + 1 < len(heads) else None
        letter = 'a'
        for pi in range(h['page'], (nxt['page'] + 1) if nxt else n):
            p = pages[pi]
            for l in p['lines']:
                key = (pi, l['y0'])
                if key <= (h['page'], h['y']) or (nxt and key >= (nxt['page'], nxt['y'])):
                    continue
                if len(l['words']) == 1 and l['x0'] > p['width'] * 0.8 and re.fullmatch(r'\d{1,2}', l['words'][0][4]):
                    # part starts at the leftmost body line level with this mark
                    lvl = [o for o in p['lines'] if abs(o['y0'] - l['y0']) < 6 and o['x0'] < p['width'] * 0.5]
                    y = min(o['y0'] for o in lvl) if lvl else l['y0']
                    s2.append(dict(kind='part', number=h['number'], part=letter, page=pi, y=y, marks=None))
                    letter = chr(ord(letter) + 1)
        s2.sort(key=lambda it: (it['page'], it['y']))
    items = mcq + s2
    end_markers += [(sec2, 0)]   # section I ends where section II begins

    last_item_page = max([it['page'] for it in items], default=0)
    paper_end = min([e[0] for e in end_markers if e[0] >= last_item_page], default=None)
    scan_from = max(last_item_page + 1, (paper_end + 1) if paper_end is not None else 0)
    sol_start = None
    for pi in range(scan_from, n):
        txt = ' '.join(l['text'] for l in pages[pi]['lines'])
        if RE_SOLN.search(txt):
            sol_start = pi
            break
    if sol_start is None:
        for pi in range(scan_from, n):
            txt = ' '.join(l['text'] for l in pages[pi]['lines'])
            if len(txt.strip()) < 20:
                sol_start = pi
                break
    if sol_start is None and paper_end is not None:
        sol_start = min(n, paper_end + 1)
    if sol_start is None:
        sol_start = min(n, last_item_page + 2)
    return items, end_markers, sol_start


def page_body_bounds(page):
    ys = [l['y0'] for l in page['lines']]
    ye = [l['y1'] for l in page['lines']]
    if not ys:
        return HEADER_PT, page['height'] - FOOTER_PT
    return max(HEADER_PT, min(ys) - PAD_TOP), min(page['height'] - FOOTER_PT, max(ye) + PAD_BOTTOM)


def build_regions(pages, items, end_markers, sol_start):
    """Turn start points into (page, y0, y1) crop lists per question unit."""
    starts = [it for it in items if it['kind'] in ('mcq', 'part')]
    # every item (incl. qheads) and end marker is a boundary
    bounds = sorted([(it['page'], it['y']) for it in items] + end_markers)
    limit_page = sol_start if sol_start is not None else len(pages)
    units = []
    for it in starts:
        nxt = next((b for b in bounds if b > (it['page'], it['y'])), None)
        if nxt is None or nxt[0] >= limit_page:
            nxt = (min(it['page'], limit_page - 1), None)   # run to end of this page
        crops = []
        p = it['page']
        while True:
            top, bot = page_body_bounds(pages[p])
            y0 = max(top, it['y'] - PAD_TOP) if p == it['page'] else top
            if p == nxt[0]:
                y1 = (nxt[1] - PAD_TOP) if nxt[1] is not None else bot
            else:
                y1 = bot
            if y1 - y0 > 8:
                crops.append((p, y0, y1))
            if p == nxt[0] or p >= limit_page - 1:
                break
            p += 1
        text = []
        region_marks = []
        for (cp, cy0, cy1) in crops:
            pw = pages[cp]['width']
            for l in pages[cp]['lines']:
                if l['y0'] >= cy0 - 1 and l['y1'] <= cy1 + 1:
                    text.append(l['text'])
                    if len(l['words']) == 1 and l['x0'] > pw * 0.8 and re.fullmatch(r'\d{1,2}', l['words'][0][4]):
                        region_marks.append(int(l['words'][0][4]))
        if it['kind'] == 'part' and region_marks:
            it['marks'] = sum(region_marks)
        if it['kind'] == 'part' and re.search(r'additional page', ' '.join(text), re.I):
            want = re.compile(rf"additional answer page for question\s*{it['number']}\s*\({it['part']}\)", re.I)
            for ap_i in range(it['page'] + 1, limit_page):
                if any(want.search(l['text']) for l in pages[ap_i]['lines']):
                    top, bot = page_body_bounds(pages[ap_i])
                    crops.append((ap_i, top, bot))
                    for l in pages[ap_i]['lines']:
                        text.append(l['text'])
                    break
        units.append(dict(item=it, crops=crops, text='\n'.join(text)))
    return units


def render_page(pdf, page_index, dpi, cache, tmpdir):
    if page_index in cache:
        return cache[page_index]
    prefix = os.path.join(tmpdir, f'p{page_index}')
    run(['pdftoppm', '-r', str(dpi), '-png', '-f', str(page_index + 1), '-l', str(page_index + 1),
         pdf, prefix])
    out = [f for f in os.listdir(tmpdir) if f.startswith(f'p{page_index}-') and f.endswith('.png')]
    img = Image.open(os.path.join(tmpdir, out[0])).convert('RGB')
    cache[page_index] = img
    return img


def crop_unit(pdf, pages, crops, dpi, cache, tmpdir):
    s = dpi / 72.0
    pieces = []
    for (p, y0, y1) in crops:
        img = render_page(pdf, p, dpi, cache, tmpdir)
        W, H = img.size
        box = (int(0.06 * W), int(y0 * s), int(0.97 * W), min(H, int(y1 * s)))
        pieces.append(img.crop(box))
    w = max(pc.size[0] for pc in pieces)
    h = sum(pc.size[1] for pc in pieces) + 8 * (len(pieces) - 1)
    out = Image.new('RGB', (w, h), 'white')
    y = 0
    for pc in pieces:
        out.paste(pc, (0, y))
        y += pc.size[1] + 8
    return out


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output'))
    ap.add_argument('--dpi', type=int, default=150)
    ap.add_argument('--subject', default=None, help='override subject (else taken from parent folder)')
    a = ap.parse_args()

    pdf = os.path.abspath(a.pdf)
    name = os.path.splitext(os.path.basename(pdf))[0]
    m = RE_FILENAME.match(name)
    meta = dict(file=os.path.basename(pdf),
                difficulty=m.group('diff') if m else None,
                school=m.group('school') if m else name,
                year=int(m.group('year')) if m else None)
    subject = a.subject or os.path.basename(os.path.dirname(os.path.dirname(pdf)))
    meta['subject'] = subject
    slug = slugify(f"{subject}-{meta['school']}-{meta['year']}")
    outdir = os.path.join(a.out, slug)
    os.makedirs(outdir, exist_ok=True)

    pages = parse_pages(pdf)
    text_chars = sum(len(l['text']) for p in pages for l in p['lines'])
    if text_chars < 200:
        print(f'SCANNED: {name} has almost no text layer; needs the OCR path.', file=sys.stderr)
        sys.exit(2)

    items, end_markers, sol_start = find_structure(pages)
    units = build_regions(pages, items, end_markers, sol_start)

    cache = {}
    with tempfile.TemporaryDirectory() as tmp:
        questions = []
        for u in units:
            it = u['item']
            qid = f"q{it['number']:02d}" + (it['part'] or '')
            img = crop_unit(pdf, pages, u['crops'], a.dpi, cache, tmp)
            img.save(os.path.join(outdir, qid + '.png'), optimize=True)
            questions.append(dict(
                id=qid, number=it['number'], part=it['part'],
                type='mcq' if it['kind'] == 'mcq' else 'short',
                marks=it['marks'],
                pages=sorted({c[0] + 1 for c in u['crops']}),
                image=qid + '.png',
                text=u['text'],
            ))
        sol_pages = []
        if sol_start is not None:
            for p in range(sol_start, len(pages)):
                img = render_page(pdf, p, a.dpi, cache, tmp)
                small = img.convert('L').resize((200, 280))
                dark = sum(1 for v in small.getdata() if v < 128) / (200 * 280)
                if dark < 0.002:
                    continue
                fn = f'sol_p{p + 1:02d}.png'
                img.save(os.path.join(outdir, fn), optimize=True)
                sol_pages.append(fn)

    manifest = dict(**meta, slug=slug, pages=len(pages),
                    solution_pages=sol_pages, questions=questions)
    with open(os.path.join(outdir, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    mcq = sum(1 for q in questions if q['type'] == 'mcq')
    print(f"{name}: {mcq} MCQ + {len(questions) - mcq} parts, solutions on {len(sol_pages)} pages -> {outdir}")


if __name__ == '__main__':
    main()
