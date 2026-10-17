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
import argparse, hashlib, json, os, re, sys, tempfile, warnings
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
            hit = next((c for c in sorted(cands) if c[3] == n and abs(c[2] - col) < 15 and (c[0], c[1]) > pos), None)
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
        elif prev_d is None or lines[0][0] != prev_d[0]:
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
    a = ap.parse_args()

    pdf = os.path.abspath(a.pdf)
    digest = sha256(pdf)
    rpath = os.path.join(os.path.expanduser(a.readings), digest + '.json')
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
    outdir = os.path.join(a.out, slug)
    os.makedirs(outdir, exist_ok=True)

    pages = parse_pages(pdf)
    n = len(pages)
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
            if letters and sum(1 for s in starts if s) < len(starts):
                starts = [None] * len(tl)      # all or nothing: partial letter finds give bad crops
            whole = None
            for i, (letter, marks, subs) in enumerate(tl):
                qid = f'q{num:02d}' + (letter or '')
                keys = [re.sub(r'[()]', '', s) for s in subs]
                tps = [topics.get(f'{num}{k}') for k in keys]
                tps = [t for t in dict.fromkeys(tps) if t]
                entry = dict(id=qid, number=num, part=letter, type='short', marks=marks, subparts=subs,
                             topic=tps[0] if tps else None, topics=tps, image=None, pages=[], text='')
                st = starts[i]
                if st:
                    nxt = next((s for s in starts[i + 1:] if s), None)
                    crops = region(pages, st, nxt, hi)
                    img = crop_image(pdf, pages, crops, a.dpi, cache, tmp)
                    if img:
                        img.save(os.path.join(outdir, qid + '.png'), optimize=True)
                        entry.update(image=qid + '.png', pages=sorted({c[0] + 1 for c in crops}), text=text_in(pages, crops))
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

    manifest = dict(**meta, slug=slug, pages=n, scanned=scanned, solutions_from=sol_from,
                    coarse=coarse, questions=questions)
    with open(os.path.join(outdir, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    mcq = sum(1 for q in questions if q['type'] == 'mcq')
    print(f"{name}: {mcq} MCQ + {len(questions) - mcq} parts, {coarse} coarse, "
          f"{sum(1 for q in questions if q.get('solution'))} with solutions -> {slug}")


if __name__ == '__main__':
    main()
