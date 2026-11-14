"""fig.py - Trialbank's own diagrams for rewritten HSC questions, as inline SVG (drawn from the maths, never traced from a paper).
Plot(xmin, xmax, ymin, ymax): axes, curves from Python functions, points, labels, shading, all in maths coordinates."""
import math
INK, SOFT, FILL = '#1f2329', '#8a909c', '#dfe6fb'
HALO = 'paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round"'
VAR = "font-family=\"'Times New Roman',Times,serif\" font-style=\"italic\" " + HALO
TXT = "font-family=\"Nunito,system-ui,sans-serif\" " + HALO


_N = 0


class Plot:
    def __init__(s, xmin, xmax, ymin, ymax, w=440, h=None, pad=30):
        s.a, s.b, s.c, s.d, s.w, s.pad = xmin, xmax, ymin, ymax, w, pad
        s.h = h or round((w - 2 * pad) * (ymax - ymin) / (xmax - xmin) + 2 * pad)
        global _N
        _N += 1
        s.el, s.id = [], 'c%d_%d' % (_N, abs(hash((xmin, xmax, ymin, ymax, w))) % 10**6)

    def X(s, x): return round(s.pad + (x - s.a) / (s.b - s.a) * (s.w - 2 * s.pad), 1)
    def Y(s, y): return round(s.h - s.pad - (y - s.c) / (s.d - s.c) * (s.h - 2 * s.pad), 1)

    def axes(s, xt=(), yt=(), xl='x', yl='y', origin=True, xtl=None, ytl=None):
        x0, y0 = s.X(0), s.Y(0)
        s.el.append(f'<path d="M{s.pad - 6},{y0}H{s.w - s.pad + 10}M{x0},{s.h - s.pad + 6}V{s.pad - 10}" stroke="{INK}" stroke-width="1.3" fill="none"/>')
        s.el.append(f'<path d="M{s.w - s.pad + 10},{y0}l-7,-3.5v7zM{x0},{s.pad - 10}l-3.5,7h7z" fill="{INK}"/>')
        s.el.append(f'<text x="{s.w - s.pad + 14}" y="{y0 + 5}" {VAR} font-size="16" fill="{INK}">{xl}</text><text x="{x0 + 8}" y="{s.pad - 8}" {VAR} font-size="16" fill="{INK}">{yl}</text>')
        if origin: s.el.append(f'<text x="{x0 - 6}" y="{y0 + 16}" {TXT} font-size="13" text-anchor="end" fill="{INK}">O</text>')
        for i, v in enumerate(xt):
            lab = xtl[i] if xtl else fmt(v)
            s.el.append(f'<path d="M{s.X(v)},{y0 - 4}V{y0 + 4}" stroke="{INK}"/><text x="{s.X(v)}" y="{y0 + 18}" {TXT if not xtl else VAR} font-size="13" text-anchor="middle" fill="{INK}">{lab}</text>')
        for i, v in enumerate(yt):
            lab = ytl[i] if ytl else fmt(v)
            s.el.append(f'<path d="M{x0 - 4},{s.Y(v)}H{x0 + 4}" stroke="{INK}"/><text x="{x0 - 8}" y="{s.Y(v) + 4.5}" {TXT if not ytl else VAR} font-size="13" text-anchor="end" fill="{INK}">{lab}</text>')

    def curve(s, f, lo, hi, n=400, width=2.2, dash=None, colour=INK):
        d, pen = [], False
        for i in range(n + 1):
            x = lo + (hi - lo) * i / n
            try: y = f(x)
            except (ZeroDivisionError, ValueError): pen = False; continue
            if y is None or not (s.c - (s.d - s.c) <= y <= s.d + (s.d - s.c)): pen = False; continue
            d.append(f'{"L" if pen else "M"}{s.X(x)},{s.Y(y)}'); pen = True
        s.el.append(f'<path d="{"".join(d)}" stroke="{colour}" stroke-width="{width}" fill="none" clip-path="url(#{s.id})"{f" stroke-dasharray={chr(34)}{dash}{chr(34)}" if dash else ""} stroke-linejoin="round"/>')

    def line(s, x1, y1, x2, y2, width=1.4, dash=None, colour=INK, arrow=False):
        s.el.append(f'<path d="M{s.X(x1)},{s.Y(y1)}L{s.X(x2)},{s.Y(y2)}" stroke="{colour}" stroke-width="{width}" fill="none"{f" stroke-dasharray={chr(34)}{dash}{chr(34)}" if dash else ""}/>')
        if arrow:
            px, py, qx, qy = s.X(x1), s.Y(y1), s.X(x2), s.Y(y2); L = math.hypot(qx - px, qy - py); ux, uy = (qx - px) / L, (qy - py) / L
            s.el.append(f'<path d="M{qx},{qy}L{round(qx - 9 * ux + 4 * uy, 1)},{round(qy - 9 * uy - 4 * ux, 1)}L{round(qx - 9 * ux - 4 * uy, 1)},{round(qy - 9 * uy + 4 * ux, 1)}z" fill="{colour}"/>')

    def region(s, pts, colour=FILL):
        s.el.insert(0, f'<path d="M{"L".join(f"{s.X(x)},{s.Y(y)}" for x, y in pts)}z" fill="{colour}" stroke="none"/>')

    def dot(s, x, y, r=3.5): s.el.append(f'<circle cx="{s.X(x)}" cy="{s.Y(y)}" r="{r}" fill="{INK}"/>')

    def text(s, x, y, t, dx=0, dy=0, anchor='middle', size=14, var=False):
        s.el.append(f'<text x="{round(s.X(x) + dx, 1)}" y="{round(s.Y(y) + dy, 1)}" {VAR if var else TXT} font-size="{size}" text-anchor="{anchor}" fill="{INK}">{t}</text>')

    def raw(s, svg): s.el.append(svg)

    def svg(s):
        clip = f'<clipPath id="{s.id}"><rect x="{s.pad - 8}" y="{s.pad - 8}" width="{s.w - 2 * s.pad + 16}" height="{s.h - 2 * s.pad + 16}"/></clipPath>'
        return fix(f'<svg class="tb-fig" viewBox="0 0 {s.w + 20} {s.h}" width="{s.w + 20}" style="display:block;max-width:100%;height:auto;margin:14px auto;background:#fff;border-radius:8px" '
                f'role="img" aria-label="diagram"><defs>{clip}</defs>{"".join(s.el)}</svg>')


def fmt(v):
    return ('−' if v < 0 else '') + (str(abs(int(v))) if float(v).is_integer() else str(abs(v)))


def fix(svg):
    """The site styles every <svg> <text> (orange outlined labels), and a stylesheet beats SVG attributes, so move each label's look into an
    inline style, which wins. Every label gets dark ink with a white halo so it stays readable over lines."""
    import re
    keys = ('font-family', 'font-style', 'font-size', 'font-weight', 'fill', 'stroke', 'stroke-width', 'paint-order', 'stroke-linejoin')
    def one(m):
        tag = m.group(0); st = {}
        for k_ in keys:
            mm = re.search(r'\s' + k_ + r'="([^"]*)"', tag)
            if mm: st[k_] = mm.group(1); tag = tag.replace(mm.group(0), '')
        st.setdefault('fill', INK); st['stroke'] = '#fff'; st['stroke-width'] = '4px'; st['paint-order'] = 'stroke'; st['stroke-linejoin'] = 'round'
        st.setdefault('font-weight', '400' if st.get('font-style') == 'italic' else '600')
        st.setdefault('font-family', 'Nunito,system-ui,sans-serif')
        if 'font-size' in st and not st['font-size'].endswith('px'): st['font-size'] += 'px'
        return tag[:-1] + ' style="' + ';'.join(f'{k_}:{v}' for k_, v in st.items()).replace('"', "'") + '">'
    return re.sub(r'<text\b[^>]*>', one, svg)
