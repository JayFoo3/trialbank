#!/usr/bin/env python3
"""
cut_reading.py  -  cut a paper into question images using a thsc-index reading as the guide.

Usage:
    python3 cut_reading.py "paper.pdf" [--readings ~/Documents/thsc-index/readings] [--out output] [--dpi 150]

The reading (readings/<sha256>.json, made by Albert's reader) says which pages each question is on, its parts
and marks, the answer key, the solution pages and a topic per part. This script finds the exact crop lines
inside those pages and writes:
    output/<slug>/manifest.json
    output/<slug>/q01.png ... q11a.png ...      one image per MCQ / top-level part
    output/<slug>/sol_q11.png ...               that question's solution pages, stacked
Pages in readings are 0-based.
"""
from PIL import Image as _Image
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, warnings
from concurrent.futures import ThreadPoolExecutor
warnings.simplefilter('ignore')
from PIL import Image
import cutter
from cutter import parse_pages, render_page, page_body_bounds, PAD_TOP, slugify, RE_FILENAME

RE_QHEAD = re.compile(r'^Question\s+(\d+)\b', re.I)
RE_NUM = re.compile(r'^Q?(\d{1,2})[.)]?$', re.I)
RE_OPT_A = re.compile(r'^\(?A[.):]?$')
RE_OPT_D = re.compile(r'^\(?D[.):]?$')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


# ---------- scanned papers: OCR into the same line/word structure parse_pages gives ----------
def ocr_page(pdf, pi, height, cache_dir, dpi=200):
    cp = os.path.join(cache_dir, f'p{pi}.json')
    if os.path.exists(cp):
        return json.load(open(cp))
    with tempfile.TemporaryDirectory() as t:
        subprocess.run(['pdftoppm', '-r', str(dpi), '-gray', '-png', '-f', str(pi + 1), '-l', str(pi + 1), pdf, os.path.join(t, 'pg')],
                       check=True, capture_output=True)
        png = os.path.join(t, sorted(f for f in os.listdir(t) if f.endswith('.png'))[0])
        tsv = subprocess.run(['tesseract', png, 'stdout', '--psm', '4', 'tsv'], capture_output=True, text=True, env=dict(os.environ, OMP_THREAD_LIMIT='1')).stdout
        # second pass: just the left margin, sparse mode, digits and part letters only. Question numbers and (a)(b)
        # labels sit alone in the margin and the full-page pass often drops them.
        im = _Image.open(png); IW, IH = im.size
        tsv2 = []
        for (x_a, x_b, psm) in ((0.06, 0.17, '6'), (0.08, 0.19, '11')):
            strip = os.path.join(t, 'strip.png')
            im.crop((int(x_a * IW), 0, int(x_b * IW), IH)).save(strip)
            out = subprocess.run(['tesseract', strip, 'stdout', '--psm', psm, '-c', 'tessedit_char_whitelist=0123456789()abcdefgh', 'tsv'],
                                 capture_output=True, text=True, env=dict(os.environ, OMP_THREAD_LIMIT='1')).stdout
            tsv2.append((int(x_a * IW), out))
    s = 72.0 / dpi
    grouped = {}
    for row in tsv.splitlines()[1:]:
        c = row.split('\t')
        if len(c) < 12 or c[0] != '5':
            continue
        txt = c[11].strip()
        try:
            conf = float(c[10])
        except ValueError:
            continue
        if not txt or conf < 30:
            continue
        x, y, w, h = (int(v) for v in c[6:10])
        grouped.setdefault((c[2], c[3], c[4]), []).append((x * s, y * s, (x + w) * s, (y + h) * s, txt))
    lines = []
    margin = []
    for x_off, out in tsv2:
        for row in out.splitlines()[1:]:
            c = row.split('\t')
            if len(c) < 12 or c[0] != '5':
                continue
            txt = c[11].strip()
            try:
                conf = float(c[10])
            except ValueError:
                continue
            m = re.match(r'^\(?([a-h])\)?$', txt)
            if m:
                txt = '(' + m.group(1) + ')'
            elif not re.match(r'^\d{1,2}$', txt):
                continue
            if conf < 55:
                continue
            x, y, w, h = (int(v) for v in c[6:10])
            margin.append(((x + x_off) * s, y * s, (x + x_off + w) * s, (y + h) * s, txt))
    for mw in margin:
        near = any(abs(w[1] - mw[1]) < 8 and abs(w[0] - mw[0]) < 14 and w[4].strip('()').lower() == mw[4].strip('()').lower()
                   for ws in grouped.values() for w in ws)
        if not near:
            grouped[('m', str(len(grouped)), '0')] = [mw]
    for words in grouped.values():
        words.sort(key=lambda w: w[0])
        y0 = min(w[1] for w in words); y1 = max(w[3] for w in words)
        if y1 < cutter.HEADER_PT or y0 > height - cutter.FOOTER_PT:
            continue
        lines.append(dict(x0=words[0][0], y0=y0, x1=words[-1][2], y1=y1, words=words, text=' '.join(w[4] for w in words)))
    lines.sort(key=lambda l: (round(l['y0']), l['x0']))
    os.makedirs(cache_dir, exist_ok=True)
    json.dump(lines, open(cp, 'w'))
    return lines


def level_text(plines, l):
    return any(abs(o['y0'] - l['y0']) < 5 and o['x0'] > l['x0'] + 10 for o in plines)


def body_lines(pages, lo, hi):
    """(page, line) for every line on pages lo..hi inclusive, in reading order."""
    for pi in range(lo, hi + 1):
        if 0 <= pi < len(pages):
            for l in pages[pi]['lines']:
                yield pi, l


# ---------- multiple choice ----------
def mcq_starts(pages, first, last, lo, hi):
    """Start (page, y) of each MCQ number first..last on pages lo..hi; None where not found."""
    want = list(range(first, last + 1))
    found = {}
    cands = []
    for pi, l in body_lines(pages, lo, hi):
        W = pages[pi]['width']
        m = RE_NUM.match(l['words'][0][4])
        if m and l['x0'] < 0.3 * W and (len(l['words']) > 1 or level_text(pages[pi]['lines'], l)):
            cands.append((pi, l['y0'], l['x0'], int(m.group(1))))
    if cands:
        xs = [round(c[2] / 5) * 5 for c in cands]
        col = max(set(xs), key=xs.count)
        pos = (lo, -1)
        for n in want:
            hit = next((c for c in sorted(cands) if c[3] == n and abs(c[2] - col) < 24 and (c[0], c[1]) > pos), None)
            if hit:
                found[n] = (hit[0], hit[1])
                pos = (hit[0], hit[1])
    if len(found) >= 0.7 * len(want):
        return [found.get(n) for n in want]

    # fallback: option markers (A) ... (D)
    A, D = [], []
    for pi, l in body_lines(pages, lo, hi):
        W = pages[pi]['width']
        fw = l['words'][0][4]
        if l['x0'] < 0.3 * W:
            if RE_OPT_A.match(fw):
                A.append((pi, l['y0'], l['x0']))
            elif RE_OPT_D.match(fw):
                D.append((pi, l['y0'], l['x0']))
    if len(A) < 0.7 * len(want):
        return [None] * len(want)
    starts = []
    prev_d = None
    for n, a in enumerate(A[:len(want)]):
        lines = []
        for pi, l in body_lines(pages, a[0] if prev_d is None else prev_d[0], a[0]):
            key = (pi, l['y0'])
            if prev_d is not None and key <= (prev_d[0], prev_d[1]):
                continue
            if key >= (a[0], a[1]):
                continue
            if l['x0'] <= a[2] + 2:
                lines.append((pi, l['y0'], l['y1']))
        if not lines:
            starts.append(None)
        elif prev_d is None:
            on = [x for x in lines if x[0] == a[0]] or lines
            if len(on) > 1:
                s_ = on[max((on[i][1] - on[i - 1][2], i) for i in range(1, len(on)))[1]]
            else:
                s_ = on[0]
            starts.append((s_[0], s_[1]))
        elif lines[0][0] != prev_d[0]:
            first_on = [x for x in lines if x[0] == a[0]]
            s = first_on[0] if first_on else lines[0]
            starts.append((s[0], s[1]))
        else:
            gaps = [(lines[i][1] - lines[i - 1][2], i) for i in range(1, len(lines))]
            gaps.append((lines[0][1] - prev_d[1], 0))
            s = lines[max(gaps)[1]]
            starts.append((s[0], s[1]))
        prev_d = D[n] if n < len(D) else a
    while len(starts) < len(want):
        starts.append(None)
    return starts


# ---------- written questions ----------
def top_level_parts(parts):
    """[('a', marks, [subpart labels])] from the reading's parts ('a', 'b(i)', 'b(ii)')."""
    out = []
    for p in parts:
        letter = re.match(r'^([a-z])', p['label'])
        letter = letter.group(1) if letter else p['label']
        if out and out[-1][0] == letter:
            out[-1][1] += p['marks'] or 0
            out[-1][2].append(p['label'])
        else:
            out.append([letter, p['marks'] or 0, [p['label']]])
    return out


def question_head(pages, number, lo, hi):
    for pi, l in body_lines(pages, lo, hi):
        W = pages[pi]['width']
        t = l['text'].strip()
        m = RE_QHEAD.match(t)
        if m and int(m.group(1)) == number and l['x0'] < 0.35 * W and not re.search(r'cont', t, re.I):
            return (pi, l['y0'])
        mn = RE_NUM.match(l['words'][0][4])
        if mn and int(mn.group(1)) == number and l['x0'] < 0.2 * W and (len(l['words']) > 1 or level_text(pages[pi]['lines'], l)):
            return (pi, l['y0'])
    return None


def part_starts(pages, letters, lo, hi, after):
    """(page, y) for each top-level letter, searched in order on pages lo..hi after position `after`."""
    starts = []
    pos = after or (lo, -1)
    for letter in letters:
        pat = re.compile(r'^\(?' + re.escape(letter) + r'[.)]')
        hit = None
        for pi, l in body_lines(pages, lo, hi):
            if (pi, l['y0']) <= pos:
                continue
            W = pages[pi]['width']
            if l['x0'] < 0.25 * W and pat.match(l['words'][0][4]):
                hit = (pi, l['y0'])
                break
        starts.append(hit)
        if hit:
            pos = hit
    return starts


def region(pages, start, end, hi_page):
    """Crops (page, y0, y1) from start (page, y) up to end (page, y) or the bottom of hi_page."""
    crops = []
    p = start[0]
    while True:
        top, bot = page_body_bounds(pages[p])
        y0 = max(top, start[1] - PAD_TOP) if p == start[0] else top
        if end is not None and p == end[0]:
            y1 = end[1] - PAD_TOP
        else:
            y1 = bot
        if p != start[0]:
            for l in pages[p]['lines']:
                if re.match(r'^question\s+\d+\s*\(?\s*continu', l['text'].strip(), re.I) and l['y0'] < y0 + 40:
                    y0 = max(y0, l['y1'] + 2)
        for l in pages[p]['lines']:
            if y0 < l['y0'] < y1 and re.search(r'continues on next page', l['text'], re.I):
                y1 = l['y0'] - PAD_TOP
        # trim at "End of Question / Section / paper" lines
        for l in pages[p]['lines']:
            if y0 < l['y0'] < y1 and re.match(r'^(end of|-+\s*end)', l['text'].strip(), re.I):
                y1 = l['y0'] - PAD_TOP
        if y1 - y0 > 8:
            crops.append((p, y0, y1))
        if (end is not None and p == end[0]) or p >= hi_page:
            break
        p += 1
    return crops


def split_between(pdf, pages, crops, k, dpi, cache, tmp):
    """The crops hold k questions stacked: find the k-1 biggest blank gaps and return their (page, y) cut points,
    each placed just above the next block's first ink. Used when an MCQ number was not found by text/OCR."""
    import numpy as np, cv2
    s = dpi / 72.0
    rows = []                                   # (piece index, y in page points, blank?)
    for pi_, (p, y0, y1) in enumerate(crops):
        img = render_page(pdf, p, dpi, cache, tmp).convert('L')
        W, H = img.size
        a, b = int(y0 * s), min(H, int(y1 * s))
        g = np.array(img)[a:b, int(0.05 * W):int(0.97 * W)]
        ink = (g < 170).astype(np.uint8)
        ink = cv2.morphologyEx(ink, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))   # drop scanner speckle
        blank = ink.sum(axis=1) < 2
        for r in range(len(blank)):
            rows.append((pi_, y0 + r / s, bool(blank[r])))
    first = next((i for i, r in enumerate(rows) if not r[2]), None)
    last = next((i for i in range(len(rows) - 1, -1, -1) if not rows[i][2]), None)
    if first is None:
        return []
    runs, i = [], first
    while i <= last:
        if rows[i][2]:
            j = i
            while j <= last and rows[j][2]:
                j += 1
            runs.append((j - i, j))              # (length, index of first inked row after the gap)
            i = j
        else:
            i += 1
    if len(runs) < k - 1:
        return []
    top = sorted(sorted(runs, reverse=True)[:k - 1], key=lambda r: r[1])
    cuts = []
    for _, j in top:
        pi_, y, _ = rows[j]
        cuts.append((crops[pi_][0], y))
    return cuts


def fill_missing_starts(pdf, pages, starts, hi, dpi, cache, tmp):
    """For MCQs whose number was not found, split the region between the neighbouring found starts by whitespace."""
    n = len(starts)
    found = [i for i, st in enumerate(starts) if st]
    for idx, p in enumerate(found):
        nx = found[idx + 1] if idx + 1 < len(found) else n
        k = nx - p
        if k <= 1:
            continue
        crops = region(pages, starts[p], starts[nx] if nx < n else None, hi)
        if not crops:
            continue
        cuts = split_between(pdf, pages, crops, k, dpi, cache, tmp)
        if len(cuts) == k - 1:
            for off, c in enumerate(cuts):
                starts[p + 1 + off] = (c[0], max(0.0, c[1] - 2 * PAD_TOP))
    return starts


def part_starts_fuzzy(pages, letters, lo, hi, after):
    """Like part_starts but tolerant of OCR damage ((c) read as (©), (ce) ...): exact letters first, then fill gaps
    in order from left-margin '(..)' markers lying between the neighbours that were found."""
    cands = []
    pos = after or (lo, -1)
    for pi, l in body_lines(pages, lo, hi):
        if (pi, l['y0']) <= pos:
            continue
        fw = l['words'][0][4]
        if re.match(r'^\(\S{1,3}\)?', fw) and l['x0'] < 0.25 * pages[pi]['width']:
            cands.append((pi, l['y0'], l['x0'], fw))
    if not cands:
        return [None] * len(letters)
    xs = [round(c[2] / 4) * 4 for c in cands]
    col = max(set(xs), key=xs.count)
    cands = [c for c in cands if abs(c[2] - col) <= 8 and not re.match(r'^\(?(i|ii|iii|iv|v)\)?$', c[3], re.I)]
    found = [None] * len(letters)
    used = set()
    last = (lo, -1)
    for li, letter in enumerate(letters):
        for ci, c in enumerate(cands):
            if ci in used or (c[0], c[1]) <= last:
                continue
            if re.match(r'^\(?' + re.escape(letter) + r'[.)]?', c[3]):
                found[li] = (c[0], c[1]); used.add(ci); last = (c[0], c[1])
                break
    li = 0
    while li < len(letters):
        if found[li]:
            li += 1
            continue
        j = li
        while j < len(letters) and not found[j]:
            j += 1
        gap = list(range(li, j))
        lo_b = max([found[k] for k in range(li) if found[k]] or [(lo, -1)])
        hi_b = found[j] if j < len(letters) else (hi + 1, 0)
        free = [ci for ci, c in enumerate(cands) if ci not in used and lo_b < (c[0], c[1]) < hi_b]
        if len(free) == len(gap) or (j == len(letters) and 0 < len(free) < len(gap)):
            for k, ci in zip(gap, free):
                found[k] = (cands[ci][0], cands[ci][1]); used.add(ci)
        li = j
    return found


def crop_image(pdf, pages, crops, dpi, cache, tmp):
    s = dpi / 72.0
    pieces = []
    for (p, y0, y1) in crops:
        img = render_page(pdf, p, dpi, cache, tmp)
        W, H = img.size
        pieces.append(img.crop((int(0.05 * W), int(y0 * s), int(0.97 * W), min(H, int(y1 * s)))))
    if not pieces:
        return None
    w = max(pc.size[0] for pc in pieces)
    h = sum(pc.size[1] for pc in pieces) + 8 * (len(pieces) - 1)
    out = Image.new('RGB', (w, h), 'white')
    y = 0
    for pc in pieces:
        out.paste(pc, (0, y))
        y += pc.size[1] + 8
    return out


def text_in(pages, crops):
    out = []
    for (p, y0, y1) in crops:
        for l in pages[p]['lines']:
            if l['y0'] >= y0 - 1 and l['y1'] <= y1 + 1:
                out.append(l['text'])
    return '\n'.join(out)


def stack_pages(pdf, pages, lo, hi, dpi, cache, tmp):
    imgs = []
    for p in range(lo, hi + 1):
        if 0 <= p < len(pages):
            img = render_page(pdf, p, dpi, cache, tmp)
            small = img.convert('L').resize((200, 280))
            hist = small.histogram()
            dark = sum(hist[:128]) / (200 * 280)
            if dark >= 0.002:
                imgs.append(img)
    if not imgs:
        imgs = [render_page(pdf, p, dpi, cache, tmp) for p in range(lo, hi + 1) if 0 <= p < len(pages)]
    if not imgs:
        return None
    w = max(i.size[0] for i in imgs)
    h = sum(i.size[1] for i in imgs) + 8 * (len(imgs) - 1)
    out = Image.new('RGB', (w, h), 'white')
    y = 0
    for i in imgs:
        out.paste(i, (0, y))
        y += i.size[1] + 8
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--readings', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'thsc-index', 'readings'))
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output'))
    ap.add_argument('--dpi', type=int, default=150)
    ap.add_argument('--no-ocr', action='store_true', help='do not OCR scanned papers (whole-page fallback)')
    a = ap.parse_args()

    pdf = os.path.abspath(a.pdf)
    digest = sha256(pdf)
    rpath = os.path.join(os.path.expanduser(a.readings), digest + '.json')
    if not os.path.exists(rpath):    # Trialbank's own readings (read_advanced.py)
        rpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'readings', digest + '.json')
    if not os.path.exists(rpath):
        print(f'NO READING: {os.path.basename(pdf)} ({digest[:12]})', file=sys.stderr)
        sys.exit(3)
    R = json.load(open(rpath))
    name = os.path.splitext(os.path.basename(pdf))[0]
    m = RE_FILENAME.match(name)
    subject = R['source'].get('subject') or os.path.basename(os.path.dirname(os.path.dirname(pdf)))
    meta = dict(file=os.path.basename(pdf), sha256=digest, subject=subject,
                difficulty=m.group('diff') if m else None,
                school=m.group('school') if m else R['source'].get('school'),
                year=int(m.group('year')) if m else R['source'].get('year'))
    slug = slugify(f"{subject}-{meta['school']}-{meta['year']}")
    if meta['school'] == 'HSC':            # an official HSC paper: same slug as hsc.py, so its questions join that paper
        slug = f"hsc-{subject.lower()}-{meta['year']}"
    outdir = os.path.join(a.out, slug)
    os.makedirs(outdir, exist_ok=True)

    pages = parse_pages(pdf)
    n = len(pages)
    scanned = sum(len(l['text']) for p in pages for l in p['lines']) < 200
    ocr_used = False
    if scanned and not a.no_ocr:
        cache_dir = os.path.join(a.out, '_ocr4', digest[:12])
        with ThreadPoolExecutor(4) as ex:
            res = list(ex.map(lambda i: ocr_page(pdf, i, pages[i]['height'], cache_dir), range(n)))
        for p, lines in zip(pages, res):
            p['lines'] = lines
        ocr_used = True
        globals()['PAD_TOP'] = 14        # scans: tall symbols (integral signs) sit above the text line
        scanned = sum(len(l['text']) for p in pages for l in p['lines']) < 200
    topics = R.get('topics', {})
    answer_key = {k['number']: k['answer'] for k in (R.get('solutions', {}).get('answerKey') or R['paper'].get('answerKey') or [])}
    sol_pages = {q['number']: (q['firstPage'], q['lastPage']) for q in R.get('solutions', {}).get('questions', [])}
    sol_from = R.get('solutionsFrom')
    questions = []
    coarse = 0
    cache = {}

    with tempfile.TemporaryDirectory() as tmp:
        # ---- multiple choice sections ----
        for sec in R['paper'].get('sections', []):
            if not sec.get('multipleChoice'):
                continue
            first, last = sec['first'], sec['last']
            lo, hi = max(0, sec['firstPage']), min(n - 1, sec['lastPage'])
            starts = [] if scanned else mcq_starts(pages, first, last, lo, hi)
            if not ocr_used and any(starts) and not all(starts):
                starts = fill_missing_starts(pdf, pages, starts, hi, a.dpi, cache, tmp)
            nums = list(range(first, last + 1))
            for i, num in enumerate(nums):
                qid = f'q{num:02d}'
                st = starts[i] if i < len(starts) else None
                entry = dict(id=qid, number=num, part=None, type='mcq', marks=1,
                             topic=topics.get(str(num)), answer=answer_key.get(num), image=None, pages=[], text='')
                if st:
                    nxt = next((s for s in starts[i + 1:] if s), None)
                    crops = region(pages, st, nxt, hi)
                    img = crop_image(pdf, pages, crops, a.dpi, cache, tmp)
                    if img:
                        img.save(os.path.join(outdir, qid + '.png'), optimize=True)
                        entry.update(image=qid + '.png', pages=sorted({c[0] + 1 for c in crops}), text=text_in(pages, crops))
                if not entry['image']:
                    entry['coarse'] = True
                    coarse += 1
                questions.append(entry)
            # whole-section fallback image for coarse MCQs
            if any(q.get('coarse') for q in questions if q['type'] == 'mcq'):
                img = stack_pages(pdf, pages, lo, hi, a.dpi, cache, tmp)
                if img:
                    img.save(os.path.join(outdir, f'mcq_pages_{first}-{last}.png'), optimize=True)
                    for q in questions:
                        if q['type'] == 'mcq' and q.get('coarse'):
                            q['image'] = f'mcq_pages_{first}-{last}.png'
                            q['pages'] = list(range(lo + 1, hi + 2))

        # ---- written questions ----
        for qi, q in enumerate(R['paper'].get('questions', [])):
            num = q['number']
            lo, hi = max(0, q['firstPage']), min(n - 1, q['lastPage'])
            tl = top_level_parts(q.get('parts', []))
            head = None if scanned else question_head(pages, num, lo, hi)
            if not tl:
                tl = [[None, q.get('marks') or 0, [str(num)]]]
            letters = [t[0] for t in tl if t[0]]
            starts = [None] * len(tl) if scanned or not letters else part_starts(pages, letters, lo, hi, head)
            if letters and ocr_used and not all(starts):
                starts = part_starts_fuzzy(pages, letters, lo, hi, head)
            if letters and sum(1 for s in starts if s) < len(starts):
                if ocr_used and any(starts):
                    pass       # scanned: keep the parts found, the missing ones share the previous part's crop
                else:
                    starts = [None] * len(tl)      # all or nothing: partial letter finds give bad crops
                if ocr_used and head and starts and not starts[0] and any(starts):
                    starts[0] = head
            whole = None
            for i, (letter, marks, subs) in enumerate(tl):
                qid = f'q{num:02d}' + (letter or '')
                keys = [re.sub(r'[()]', '', s) for s in subs]
                tps = [topics.get(f'{num}{k}') for k in keys]
                tps = [t for t in dict.fromkeys(tps) if t]
                entry = dict(id=qid, number=num, part=letter, type='short', marks=marks, subparts=subs,
                             topic=tps[0] if tps else None, topics=tps, image=None, pages=[], text='')
                st = starts[i]
                merged_from = None
                if not st and any(starts):
                    prev = [j for j in range(i) if starts[j]]
                    if prev:
                        merged_from = prev[-1]
                        st = starts[merged_from]
                if st:
                    nxt = next((s for s in starts[(merged_from if merged_from is not None else i) + 1:] if s), None)
                    crops = region(pages, st, nxt, hi)
                    img = crop_image(pdf, pages, crops, a.dpi, cache, tmp)
                    if img:
                        fn = (f'q{num:02d}' + (tl[merged_from][0] or '') if merged_from is not None else qid) + '.png'
                        img.save(os.path.join(outdir, fn), optimize=True)
                        entry.update(image=fn, pages=sorted({c[0] + 1 for c in crops}), text=text_in(pages, crops))
                        if merged_from is not None:
                            entry['merged'] = True
                if not entry['image']:
                    if whole is None:
                        img = stack_pages(pdf, pages, lo, hi, a.dpi, cache, tmp)
                        whole = f'q{num:02d}_pages.png' if img else False
                        if img:
                            img.save(os.path.join(outdir, whole), optimize=True)
                    entry.update(image=whole or None, pages=list(range(lo + 1, hi + 2)), coarse=True,
                                 text=text_in(pages, [(p,) + page_body_bounds(pages[p]) for p in range(lo, hi + 1)]))
                    coarse += 1
                questions.append(entry)
            # solution pages for this question
            sp = sol_pages.get(num)
            if sp:
                img = stack_pages(pdf, pages, max(0, sp[0]), min(n - 1, sp[1]), min(a.dpi, 120), cache, tmp)
                if img:
                    fn = f'sol_q{num:02d}.png'
                    img.save(os.path.join(outdir, fn), optimize=True)
                    for e in questions:
                        if e['number'] == num and e['type'] == 'short':
                            e['solution'] = fn

    manifest = dict(**meta, slug=slug, pages=n, scanned=scanned, ocr=ocr_used, solutions_from=sol_from,
                    coarse=coarse, questions=questions)
    with open(os.path.join(outdir, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    mcq = sum(1 for q in questions if q['type'] == 'mcq')
    print(f"{name}: {mcq} MCQ + {len(questions) - mcq} parts, {coarse} coarse, "
          f"{sum(1 for q in questions if q.get('solution'))} with solutions -> {slug}")


if __name__ == '__main__':
    main()
