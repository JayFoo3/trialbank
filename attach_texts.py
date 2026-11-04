#!/usr/bin/env python3
"""attach_texts.py - English Paper 1: put each question's stimulus text(s) above the question in its image.
For every output/engadv-*-p1 paper: find the "Text N" pages in the PDF, render them, and stack them on top of
the question image (q01.png = Text 1 + Question 1). The question-only image is kept as q01.q.png, so it can be
run again safely. Prints a line per paper; MISSING means a question names a text that wasn't found.
Usage: python3 attach_texts.py [--root ~/Documents] [--only SLUG]"""
import glob, json, os, re, subprocess, sys, tempfile
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[sys.argv.index('--root') + 1] if '--root' in sys.argv else os.path.dirname(HERE)
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
NUM = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6}
HEAD = re.compile(r'(?im)^\s*text\s+(\d|one|two|three|four|five|six)\b')
WRITING = re.compile(r'[.…_]{12,}')

def page_texts(pdf):
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    return [subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), '-layout', pdf, '-'], capture_output=True, text=True).stdout for p in range(1, n + 1)]

def find_texts(pages, qpages):
    """{N: [page indexes]} for the stimulus texts."""
    def usable(i):
        t = pages[i]
        return (i not in qpages and not WRITING.search(t) and not re.search(r'use text|\(\d+ marks?\)', t, re.I)
                and not re.search(r'acknowledg|copyright', t, re.I))
    heads = []
    for i, t in enumerate(pages):
        if not usable(i):
            continue
        found = [NUM.get(m.lower(), None) or int(m) for m in HEAD.findall(t)]
        if len(set(found)) == 1:
            heads.append((i, found[0]))
    out = {}
    for k, (i, n) in enumerate(heads):
        if n in out:
            continue                                     # a second copy of the booklet: keep the first
        nxt = heads[k + 1][0] if k + 1 < len(heads) else len(pages)
        span = [i]
        for j in range(i + 1, min(nxt, i + 3)):          # a text can run over to the next page or two
            if not usable(j) or len(pages[j].strip()) < 40 or re.search(r'end of|question booklet', pages[j], re.I):
                break
            span.append(j)
        out[n] = span
    return out

def render(pdf, i, tmp):
    base = os.path.join(tmp, f'p{i}')
    subprocess.run(['pdftoppm', '-r', '150', '-f', str(i + 1), '-l', str(i + 1), '-png', '-singlefile', pdf, base], check=True)
    im = Image.open(base + '.png').convert('RGB')
    box = ImageOps.invert(im.convert('L')).point(lambda v: 255 if v > 30 else 0).getbbox()
    if box:
        im = im.crop((max(0, box[0] - 20), max(0, box[1] - 20), min(im.width, box[2] + 20), min(im.height, box[3] + 20)))
    return im

def stack(parts, width):
    parts = [p if p.width == width else p.resize((width, round(p.height * width / p.width))) for p in parts]
    gap = 28
    out = Image.new('RGB', (width, sum(p.height for p in parts) + gap * (len(parts) - 1)), 'white')
    y = 0
    for k, p in enumerate(parts):
        out.paste(p, (0, y)); y += p.height
        if k < len(parts) - 1:
            out.paste(Image.new('RGB', (width - 80, 4), (205, 201, 192)), (40, y + gap // 2 - 2)); y += gap
    return out

for man in sorted(glob.glob(os.path.join(HERE, 'output', 'engadv-*-p1', 'manifest.json'))):
    d = os.path.dirname(man); m = json.load(open(man))
    if only and m['slug'] != only:
        continue
    src = os.path.join(root, 'English Advanced', 'Exams', m['file'])
    if not os.path.exists(src):
        print(m['slug'], 'missing source'); continue
    pages = page_texts(src)
    qpages = {p - 1 for q in m['questions'] for p in (q.get('pages') or [])}
    texts = find_texts(pages, qpages)
    done, missing = 0, []
    with tempfile.TemporaryDirectory() as tmp:
        cache = {}
        for q in m['questions']:
            head = (q.get('text') or '')[:400]
            want = sorted({int(d) for grp in re.findall(r'\btexts?\s+((?:\d\s*(?:,|and|&)?\s*)+)', head, re.I) for d in re.findall(r'\d', grp)})
            if not want or not q.get('image'):
                continue
            img = os.path.join(d, q['image']); keep = img[:-4] + '.q.png'
            if not os.path.exists(keep):
                os.replace(img, keep)
            qimg = Image.open(keep).convert('RGB')
            parts = []
            for n in want:
                if n not in texts:
                    missing.append(f"{q['id']}:T{n}"); continue
                for i in texts[n]:
                    if i not in cache:
                        cache[i] = render(src, i, tmp)
                    parts.append(cache[i])
            stack(parts + [qimg], qimg.width).save(img, optimize=True) if parts else qimg.save(img)
            if parts:
                done += 1
    print(m['slug'], f'{done} questions given their texts', f"texts found {sorted(texts)}", ('MISSING ' + ' '.join(missing)) if missing else '')
