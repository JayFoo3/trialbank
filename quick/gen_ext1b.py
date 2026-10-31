"""Quick questions: Maths Extension 1, the topics gen_ext1.py doesn't cover (vectors, projectiles, trig identities and equations,
integration, volumes, differential equations, growth and decay, related rates, parametrics, inverse functions, inequalities, binomial distribution).
Answers computed here; wrong options from the usual mistakes. Output: quick_ext1b.json"""
import json, math, random
from fractions import Fraction as F
from math import comb

R = random.Random(20261031 + 11)


def tf(x):
    x = F(x)
    if x.denominator == 1: return str(x.numerator)
    s = '-' if x < 0 else ''
    return f'{s}\\frac{{{abs(x.numerator)}}}{{{x.denominator}}}'


def m(t): return f'\\({t}\\)'


def poly(cs, v='x'):
    n, out = len(cs) - 1, ''
    for i, c in enumerate(cs):
        c = F(c); p = n - i
        if c == 0: continue
        a = abs(c)
        body = ('' if a == 1 and p else tf(a)) + (f'{v}^{{{p}}}' if p > 1 else v if p == 1 else '')
        out += (('-' if c < 0 else '') if not out else (' - ' if c < 0 else ' + ')) + body
    return out or '0'


def lin(a, b, v='x'): return poly([a, b], v)


def pi_s(q):
    q = F(q)
    if q == 0: return '0'
    s = '-' if q < 0 else ''; q = abs(q)
    top = '\\pi' if q.numerator == 1 else f'{q.numerator}\\pi'
    return s + (top if q.denominator == 1 else f'\\frac{{{top}}}{{{q.denominator}}}')


def vec(x, y): return f'{poly([x], "")}\\underset{{\\sim}}{{i}} ' if False else (f'{x}\\underset{{\\sim}}{{i}} {"+" if y >= 0 else "-"} {abs(y)}\\underset{{\\sim}}{{j}}').replace('1\\underset', '\\underset') if abs(x) != 1 or True else ''


def V(x, y):
    """x i + y j, written the way the HSC does (i and j with tildes)"""
    def term(c, u, first):
        if c == 0: return ''
        sign = ('-' if c < 0 else '') if first else (' - ' if c < 0 else ' + ')
        return sign + ('' if abs(c) == 1 else str(abs(c))) + f'\\underset{{\\sim}}{{{u}}}'
    out = term(x, 'i', True); out += term(y, 'j', not out)
    return out or '\\underset{\\sim}{0}'


OUT, SEEN = [], set()


def add(step, prompt, right, wrong, why, fmt=lambda v: m(tf(v)), near=None):
    opts, keys = [fmt(right)], {fmt(right)}
    for w in wrong:
        if w is None: continue
        f = fmt(w)
        if f not in keys and len(opts) < 4: opts.append(f); keys.add(f)
    near = near or (lambda k: right + k)
    k = 1
    while len(opts) < 4:
        for c in (near(k), near(-k)):
            if c is None: return
            f = fmt(c)
            if f not in keys and len(opts) < 4: opts.append(f); keys.add(f)
        k += 1
        if k > 40: return
    if prompt in SEEN: return
    SEEN.add(prompt)
    why = why.replace('+ -', '- ').replace('- -', '+ ').replace('^{1}', '')
    prompt = prompt.replace('^{1}', ''); opts = [o.replace('^{1}', '') for o in opts]
    order = list(range(4)); R.shuffle(order)
    OUT.append(dict(step=step, prompt=prompt, options=[opts[i] for i in order], answer='ABCD'[order.index(0)], why=why))


def addt(step, prompt, right, wrong, why): add(step, prompt, right, wrong, why, fmt=m, near=lambda k: None)


def surd(n2):
    """sqrt(n2) simplified, as TeX"""
    n2 = int(n2); out, inside = 1, n2
    for f in range(int(n2 ** 0.5), 1, -1):
        if n2 % (f * f) == 0: out, inside = f, n2 // (f * f); break
    if inside == 1: return str(out)
    return (str(out) if out > 1 else '') + f'\\sqrt{{{inside}}}'


# ================= Vectors =================
P3 = [(3, 4), (5, 12), (8, 6), (6, 8), (12, 5), (1, 1), (1, 2), (2, 3), (2, 2), (4, 3)]
for _ in range(120):
    x, y = R.choice(P3); x *= R.choice([1, -1]); y *= R.choice([1, -1])
    addt('ve1', f'Find {m(f"|{V(x, y)}|")}.', surd(x * x + y * y), [str(abs(x) + abs(y)), surd(abs(x * x - y * y)) if x * x != y * y else '0', str(x * x + y * y)], m(f'\\sqrt{{{x}^2 + {y}^2}} = \\sqrt{{{x * x + y * y}}} = {surd(x * x + y * y)}'.replace('{-', '{(-')))
    a, b, c, d = [R.randint(-6, 6) for _ in range(4)]; k = R.choice([2, 3, -2])
    addt('ve2', f'If {m(f"\\underset{{\\sim}}{{a}} = {V(a, b)}")} and {m(f"\\underset{{\\sim}}{{b}} = {V(c, d)}")}, find {m(f"{k}\\underset{{\\sim}}{{a}} - \\underset{{\\sim}}{{b}}")}.', V(k * a - c, k * b - d),
         [V(k * a + c, k * b + d), V(k * (a - c), k * (b - d)), V(a * k - c, b - d)], f'{m(f"{k}({V(a, b)}) - ({V(c, d)})")} {m(f"= {V(k * a - c, k * b - d)}")}.')
    if (x, y) != (0, 0):
        n2 = x * x + y * y; r = surd(n2)
        addt('ve2', f'Find the unit vector in the direction of {m(V(x, y))}.', f'\\frac{{1}}{{{r}}}\\left({V(x, y)}\\right)', [f'\\frac{{1}}{{{n2}}}\\left({V(x, y)}\\right)', f'{r}\\left({V(x, y)}\\right)', f'\\frac{{1}}{{{abs(x) + abs(y)}}}\\left({V(x, y)}\\right)'],
             f'Divide by the magnitude, {m(r)}.')
    if (a, b) != (c, d):
        addt('ve3', f'{m("A")} has position vector {m(V(a, b))} and {m("B")} has position vector {m(V(c, d))}. Find {m("\\overrightarrow{AB}")}.', V(c - a, d - b), [V(a - c, b - d), V(a + c, b + d), V(c - a, b - d) if b != d else V(c - a + 1, 0)],
             m(f'\\overrightarrow{{AB}} = \\underset{{\\sim}}{{b}} - \\underset{{\\sim}}{{a}} = {V(c - a, d - b)}'))
    dot = a * c + b * d
    add('ve4', f'Find {m(f"({V(a, b)}) \\cdot ({V(c, d)})")}.', dot, [a * d + b * c, a * c - b * d, (a + c) * (b + d)], m(f'({a})({c}) + ({b})({d}) = {dot}'))
    if b != 0:
        kk = F(-a * c, b) if c else None
        if c and kk.denominator == 1:
            add('ve4', f'Find {m("k")} so that {m(V(a, b))} and {m(f"{c}\\underset{{\\sim}}{{i}} + k\\underset{{\\sim}}{{j}}")} are perpendicular.', kk, [-kk, F(a * c, b) + 1 if kk != F(a * c, b) + 1 else kk + 2, F(-b, a) if a else kk + 3],
                f'Perpendicular means the dot product is 0: {m(f"{a * c} + {b}k = 0")}, so {m(f"k = {tf(kk)}")}.')
    u, w = R.choice(P3), (R.randint(-5, 5), R.randint(-5, 5))
    if w != (0, 0):
        uu = u[0] ** 2 + u[1] ** 2; dd = w[0] * u[0] + w[1] * u[1]; s_ = F(dd, uu)
        addt('ve5', f'Find the projection of {m(V(*w))} onto {m(V(*u))}.', f'{tf(s_)}\\left({V(*u)}\\right)' if s_ not in (0, 1) else (V(*u) if s_ == 1 else '\\underset{\\sim}{0}'),
             [f'{tf(F(dd, int(uu ** 0.5) if int(uu ** 0.5) ** 2 == uu else uu + 1))}\\left({V(*u)}\\right)', f'{tf(F(dd, w[0] ** 2 + w[1] ** 2))}\\left({V(*w)}\\right)' if w[0] ** 2 + w[1] ** 2 else '1', f'{dd}\\left({V(*u)}\\right)'],
             m(f'\\frac{{\\underset{{\\sim}}{{a}} \\cdot \\underset{{\\sim}}{{b}}}}{{|\\underset{{\\sim}}{{b}}|^2}}\\underset{{\\sim}}{{b}} = \\frac{{{dd}}}{{{uu}}}\\left({V(*u)}\\right)'))

# ================= Projectiles =================
G = 10
for _ in range(80):
    U, ang = R.choice([10, 20, 30, 40, 50]), R.choice([30, 45, 60])
    s, c = math.sin(math.radians(ang)), math.cos(math.radians(ang))
    T = 2 * U * s / G; H = (U * s) ** 2 / (2 * G); Rg = U * U * math.sin(math.radians(2 * ang)) / G
    add('pj2', f'A ball is projected from level ground at {m(f"{U}\\text{{ m/s}}")} at {m(f"{ang}^\\circ")}. Using {m("g = 10")}, find its time of flight to 2 decimal places.', round(T, 2), [round(T / 2, 2), round(2 * U * c / G, 2), round(U * s / G * 4, 2)],
        m(f't = \\frac{{2U\\sin\\theta}}{{g}} = \\frac{{2({U})\\sin {ang}^\\circ}}{{10}} \\approx {T:.2f}\\text{{ s}}'), fmt=lambda v: m(f'{v:.2f}\\text{{ s}}'), near=lambda k: round(T + 0.15 * k, 2))
    add('pj2', f'A ball is projected from level ground at {m(f"{U}\\text{{ m/s}}")} at {m(f"{ang}^\\circ")}. Using {m("g = 10")}, find its range to 1 decimal place.', round(Rg, 1), [round(Rg / 2, 1), round(U * U / G, 1) if ang != 45 else round(Rg * 2, 1), round(U * T, 1)],
        m(f'R = \\frac{{U^2\\sin 2\\theta}}{{g}} \\approx {Rg:.1f}\\text{{ m}}'), fmt=lambda v: m(f'{v:.1f}\\text{{ m}}'), near=lambda k: round(Rg + 1.5 * k, 1))
    add('pj2', f'A ball is projected from level ground at {m(f"{U}\\text{{ m/s}}")} at {m(f"{ang}^\\circ")}. Using {m("g = 10")}, find its maximum height to 1 decimal place.', round(H, 1), [round(2 * H, 1), round((U * c) ** 2 / (2 * G), 1) if ang != 45 else round(H / 2, 1), round(U * s / G, 1)],
        m(f'H = \\frac{{(U\\sin\\theta)^2}}{{2g}} \\approx {H:.1f}\\text{{ m}}'), fmt=lambda v: m(f'{v:.1f}\\text{{ m}}'), near=lambda k: round(H + 1.2 * k, 1))
    t = R.choice([0.5, 1, 1.5, 2])
    add('pj1', f'A projectile has {m(f"\\dot{{y}} = {U} - 10t")}. Find its vertical velocity at {m(f"t = {t:g}")}.', U - 10 * t, [U + 10 * t, U - 5 * t, -10 * t], m(f'{U} - 10({t:g}) = {U - 10 * t:g}'), fmt=lambda v: m(f'{v:g}\\text{{ m/s}}'), near=lambda k: U - 10 * t + 5 * k)

# ================= Trig identities and equations (Ext 1) =================
for _ in range(60):
    pairs = [(45, 30, '\\frac{\\sqrt{6} + \\sqrt{2}}{4}', '\\frac{\\sqrt{6} - \\sqrt{2}}{4}'), (60, 45, '\\frac{\\sqrt{6} + \\sqrt{2}}{4}', '\\frac{\\sqrt{2} - \\sqrt{6}}{4}')]
    addt('tid1', f'Find the exact value of {m("\\sin 75^\\circ")}.', '\\frac{\\sqrt{6} + \\sqrt{2}}{4}', ['\\frac{\\sqrt{6} - \\sqrt{2}}{4}', '\\frac{\\sqrt{3} + 1}{2}', '\\frac{\\sqrt{2}}{2}'], m('\\sin(45^\\circ + 30^\\circ) = \\sin 45^\\circ\\cos 30^\\circ + \\cos 45^\\circ\\sin 30^\\circ = \\frac{\\sqrt{6} + \\sqrt{2}}{4}'))
    addt('tid1', f'Find the exact value of {m("\\cos 15^\\circ")}.', '\\frac{\\sqrt{6} + \\sqrt{2}}{4}', ['\\frac{\\sqrt{6} - \\sqrt{2}}{4}', '\\frac{\\sqrt{3} - 1}{2}', '\\frac{1}{4}'], m('\\cos(45^\\circ - 30^\\circ) = \\cos 45^\\circ\\cos 30^\\circ + \\sin 45^\\circ\\sin 30^\\circ = \\frac{\\sqrt{6} + \\sqrt{2}}{4}'))
    addt('tid1', f'Find the exact value of {m("\\tan 15^\\circ")}.', '2 - \\sqrt{3}', ['2 + \\sqrt{3}', '\\sqrt{3} - 1', '\\frac{1}{\\sqrt{3}}'], m('\\tan(45^\\circ - 30^\\circ) = \\frac{1 - \\frac{1}{\\sqrt{3}}}{1 + \\frac{1}{\\sqrt{3}}} = 2 - \\sqrt{3}'))
    break
for a, b, c in [(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25)]:
    for o, adj in ((a, b), (b, a)):
        s, co = F(o, c), F(adj, c)
        add('tid2', f'If {m(f"\\sin\\theta = {tf(s)}")} and {m("\\theta")} is acute, find {m("\\sin 2\\theta")}.', 2 * s * co, [2 * s, s * co, co * co - s * s], m(f'2\\sin\\theta\\cos\\theta = 2 \\times {tf(s)} \\times {tf(co)} = {tf(2 * s * co)}'))
        add('tid2', f'If {m(f"\\cos\\theta = {tf(co)}")} and {m("\\theta")} is acute, find {m("\\cos 2\\theta")}.', 2 * co * co - 1, [2 * co, 1 - co * co, 2 * co * co], m(f'2\\cos^2\\theta - 1 = 2\\left({tf(co)}\\right)^2 - 1 = {tf(2 * co * co - 1)}'))
        t = F(o, adj)
        add('tid3', f'If {m(f"t = \\tan\\frac{{\\theta}}{{2}} = {tf(t)}")}, find {m("\\sin\\theta")}.', 2 * t / (1 + t * t), [2 * t / (1 - t * t) if t != 1 else F(1, 2), (1 - t * t) / (1 + t * t), t / (1 + t * t)], m(f'\\sin\\theta = \\frac{{2t}}{{1 + t^2}} = {tf(2 * t / (1 + t * t))}'))
for a, b in [(1, 1), (1, 3), (3, 4), (5, 12), (2, 2), (8, 6), (1, 2), (3, 1)]:
    R2 = a * a + b * b
    alpha = {(1, 1): '\\frac{\\pi}{4}', (1, 3): None}.get((a, b))
    addt('tid5', f'Write {m(f"{a if a > 1 else ""}\\sin x + {b if b > 1 else ""}\\cos x")} as {m("R\\sin(x + \\alpha)")}. What is {m("R")}?', surd(R2), [str(a + b), surd(abs(a * a - b * b)) if a != b else '1', str(R2)], m(f'R = \\sqrt{{{a}^2 + {b}^2}} = {surd(R2)}'))
    addt('tid5', f'What is the maximum value of {m(f"{a if a > 1 else ""}\\sin x - {b if b > 1 else ""}\\cos x")}?', surd(R2), [str(a + b), str(abs(a - b)) if a != b else '0', '1'], f'It can be written as {m(f"{surd(R2)}\\sin(x - \\alpha)")}, which is at most {m(surd(R2))}.')
for k in (2, 3, 4):
    for v, base in (('\\frac{1}{2}', F(1, 6)), ('\\frac{\\sqrt{3}}{2}', F(1, 3)), ('\\frac{1}{\\sqrt{2}}', F(1, 4))):
        sols = sorted(set([(base + 2 * n) / k for n in range(k)] + [((1 - base) + 2 * n) / k for n in range(k)]))
        sols = [s_ for s_ in sols if 0 <= s_ < 2]
        add('te4', f'How many solutions does {m(f"\\sin {k}x = {v}")} have for {m("0 \\leq x < 2\\pi")}?', len(sols), [2, k, len(sols) // 2], f'{m(f"{k}x")} runs over {k} full turns, and each turn has 2 solutions: {m(len(sols))}.', near=lambda kk: len(sols) + kk)
for v, base in (('\\frac{1}{2}', F(1, 6)), ('\\frac{\\sqrt{3}}{2}', F(1, 3)), ('\\frac{1}{\\sqrt{2}}', F(1, 4)), ('1', F(1, 2)), ('0', F(0))):
    if base:
        addt('te4', f'Find the general solution of {m(f"\\sin x = {v}")}.', f'x = n\\pi + (-1)^n {pi_s(base)}', [f'x = 2n\\pi \\pm {pi_s(base)}', f'x = n\\pi + {pi_s(base)}', f'x = 2n\\pi + {pi_s(base)}'], m(f'\\sin x = \\sin\\alpha \\Rightarrow x = n\\pi + (-1)^n\\alpha'))
        addt('te4', f'Find the general solution of {m(f"\\cos x = {v}")}.', f'x = 2n\\pi \\pm {pi_s(F(1, 2) - base) if v != "1" else "0"}' if v != '1' else 'x = 2n\\pi', [f'x = n\\pi + (-1)^n {pi_s(F(1, 2) - base) if v != "1" else "0"}', f'x = n\\pi \\pm {pi_s(F(1, 2) - base) if v != "1" else "0"}', f'x = 2n\\pi + {pi_s(F(1, 2) - base) if v != "1" else "\\pi"}'], m('\\cos x = \\cos\\alpha \\Rightarrow x = 2n\\pi \\pm \\alpha'))

# ================= Integration (Ext 1) =================
for _ in range(60):
    a = R.randint(2, 6)
    addt('in2', f'Find {m(f"\\int \\sin^2 x\\,dx")}.', '\\frac{x}{2} - \\frac{\\sin 2x}{4} + C', ['\\frac{x}{2} + \\frac{\\sin 2x}{4} + C', '\\frac{\\sin^3 x}{3} + C', '-\\frac{\\cos^2 x}{2} + C'], m('\\sin^2 x = \\frac{1}{2}(1 - \\cos 2x)'))
    addt('in2', f'Find {m(f"\\int \\cos^2 {a}x\\,dx")}.', f'\\frac{{x}}{{2}} + \\frac{{\\sin {2 * a}x}}{{{4 * a}}} + C', [f'\\frac{{x}}{{2}} - \\frac{{\\sin {2 * a}x}}{{{4 * a}}} + C', f'\\frac{{x}}{{2}} + \\frac{{\\sin {2 * a}x}}{{4}} + C', f'\\frac{{\\cos^3 {a}x}}{{{3 * a}}} + C'], m(f'\\cos^2 {a}x = \\frac{{1}}{{2}}(1 + \\cos {2 * a}x)'))
    n, k = R.randint(2, 5), R.randint(1, 4)
    addt('in1', f'Use {m(f"u = x^2 + {k}")} to find {m(f"\\int 2x(x^2 + {k})^{{{n}}}\\,dx")}.', f'\\frac{{(x^2 + {k})^{{{n + 1}}}}}{{{n + 1}}} + C', [f'(x^2 + {k})^{{{n + 1}}} + C', f'\\frac{{(x^2 + {k})^{{{n + 1}}}}}{{{2 * (n + 1)}}} + C', f'{n}(x^2 + {k})^{{{n - 1}}} + C'], f'{m("du = 2x\\,dx")}, so it becomes {m(f"\\int u^{{{n}}}\\,du = \\frac{{u^{{{n + 1}}}}}{{{n + 1}}}")}.')
    addt('in1', f'Find {m(f"\\int \\frac{{2x}}{{x^2 + {k}}}\\,dx")}.', f'\\ln(x^2 + {k}) + C', [f'2\\ln(x^2 + {k}) + C', f'\\frac{{1}}{{x^2 + {k}}} + C', f'\\tan^{{-1}}\\frac{{x}}{{{k}}} + C'], f'The top is the derivative of the bottom: {m("\\int \\frac{f\'(x)}{f(x)}\\,dx = \\ln|f(x)| + C")}.')
    lo, hi = 0, R.randint(1, 2); k2 = R.randint(1, 3)
    val = F((hi * hi + k2) ** 2 - (lo + k2) ** 2, 2)
    add('in4', f'Evaluate {m(f"\\int_0^{{{hi}}} 2x(x^2 + {k2})\\,dx")} using {m(f"u = x^2 + {k2}")}.', val, [2 * val, (hi * hi + k2) ** 2, val - k2], f'New limits {m(f"u = {k2}")} to {m(f"u = {hi * hi + k2}")}: {m(f"\\left[\\frac{{u^2}}{{2}}\\right]_{{{k2}}}^{{{hi * hi + k2}}} = {tf(val)}")}.')

# ================= Volumes =================
for _ in range(60):
    a, n = R.randint(1, 3), R.choice([1, 2])
    b = R.randint(1, 4)
    if n == 1:   # y = ax, 0..b about x-axis: pi a^2 b^3 / 3
        v = F(a * a * b ** 3, 3)
        addt('vo1', f'Find the volume when {m(f"y = {a if a > 1 else ""}x")} from {m("x = 0")} to {m(f"x = {b}")} is rotated about the {m("x")}-axis.', pi_s(v) + '\\text{ units}^3', [pi_s(F(a * b * b, 2)) + '\\text{ units}^3', pi_s(v * 3) + '\\text{ units}^3', pi_s(F(a * a * b ** 2, 2)) + '\\text{ units}^3'], m(f'V = \\pi\\int_0^{{{b}}} {a * a if a > 1 else ""}x^2\\,dx = {pi_s(v)}'))
    else:   # y = sqrt(x)... use y = a x^2 -> pi a^2 b^5/5
        v = F(a * a * b ** 5, 5)
        addt('vo1', f'Find the volume when {m(f"y = {a if a > 1 else ""}x^2")} from {m("x = 0")} to {m(f"x = {b}")} is rotated about the {m("x")}-axis.', pi_s(v) + '\\text{ units}^3', [pi_s(F(a * b ** 3, 3)) + '\\text{ units}^3', pi_s(v * 5) + '\\text{ units}^3', pi_s(F(a * a * b ** 4, 4)) + '\\text{ units}^3'], m(f'V = \\pi\\int_0^{{{b}}} {a * a if a > 1 else ""}x^4\\,dx = {pi_s(v)}'))
    h = R.randint(1, 6)
    v2 = F(h * h, 2)
    addt('vo2', f'Find the volume when {m("y = x^2")} from {m("y = 0")} to {m(f"y = {h}")} is rotated about the {m("y")}-axis.', pi_s(v2) + '\\text{ units}^3', [pi_s(F(h ** 3, 3)) + '\\text{ units}^3', pi_s(h) + '\\text{ units}^3', pi_s(h * h) + '\\text{ units}^3'], m(f'V = \\pi\\int_0^{{{h}}} x^2\\,dy = \\pi\\int_0^{{{h}}} y\\,dy = {pi_s(v2)}'))
    r = R.randint(2, 6)
    addt('vo1', f'The semicircle {m(f"y = \\sqrt{{{r * r} - x^2}}")} is rotated about the {m("x")}-axis. Find the volume.', pi_s(F(4 * r ** 3, 3)) + '\\text{ units}^3', [pi_s(F(2 * r ** 3, 3)) + '\\text{ units}^3', pi_s(r * r) + '\\text{ units}^3', pi_s(4 * r ** 3) + '\\text{ units}^3'], f'It makes a sphere of radius {m(r)}: {m(f"\\frac{{4}}{{3}}\\pi({r})^3 = {pi_s(F(4 * r ** 3, 3))}")}.')

# ================= Differential equations =================
for _ in range(60):
    k, c = R.randint(2, 5), R.randint(-4, 6)
    addt('de3', f'Solve {m(f"\\frac{{dy}}{{dx}} = {k}x")} given {m(f"y = {c}")} when {m("x = 0")}.', f'y = {poly([F(k, 2), 0, c])}', [f'y = {poly([k, 0, c])}', f'y = {poly([F(k, 2), 0])}', f'y = {poly([F(k, 2), c])}'], m(f'y = \\frac{{{k}x^2}}{{2}} + C, \\quad C = {c}'))
    a = R.randint(2, 5)
    addt('de4', f'Solve {m(f"\\frac{{dy}}{{dx}} = {a}y")} with {m("y = 1")} when {m("x = 0")}.', f'y = e^{{{a}x}}', [f'y = {a}e^{{x}}', f'y = e^{{x/{a}}}', f'y = {a}x + 1'], f'Separate: {m(f"\\int \\frac{{dy}}{{y}} = \\int {a}\\,dx")}, so {m(f"\\ln y = {a}x")}.')
    addt('de4', f'Separate the variables in {m(f"\\frac{{dy}}{{dx}} = {a}xy^2")}.', f'\\int y^{{-2}}\\,dy = \\int {a}x\\,dx', [f'\\int y^2\\,dy = \\int {a}x\\,dx', f'\\int {a}y^{{-2}}\\,dy = \\int x\\,dx \\cdot y', f'\\int \\frac{{dy}}{{{a}x}} = \\int y^2\\,dx'], f'Divide both sides by {m("y^2")} and multiply by {m("dx")}.')
    x0, y0 = R.randint(-3, 3), R.randint(-3, 3)
    add('de2', f'For the slope field of {m("\\frac{dy}{dx} = x - y")}, what is the gradient at {m(f"({x0}, {y0})")}?', x0 - y0, [y0 - x0, x0 + y0, x0 * y0], m(f'{x0} - ({y0}) = {x0 - y0}'))
    addt('de1', f'Which function satisfies {m(f"\\frac{{d^2y}}{{dx^2}} = {a * a}y")}?', f'y = e^{{{a}x}}', [f'y = \\sin {a}x', f'y = {a}x^2', f'y = e^{{{a * a}x}}'], f'{m(f"y = e^{{{a}x}}")} gives {m(f"y\'\' = {a * a}e^{{{a}x}} = {a * a}y")}.')
    P, K = R.choice([100, 200, 500]), R.choice([1000, 2000, 5000])
    add('de5', f'A population follows the logistic equation {m(f"\\frac{{dP}}{{dt}} = 0.1P\\left(1 - \\frac{{P}}{{{K}}}\\right)")}. What is its long-term (limiting) size?', K, [K // 2, P, int(0.1 * K)], f'Growth stops when {m(f"P = {K}")}, the carrying capacity.', fmt=lambda v: m(f'{v:,}'.replace(',', '{,}')))

# ================= Exponential growth and decay (Ext 1) =================
for _ in range(50):
    T0, Tr, k, t = R.choice([80, 90, 100]), R.choice([20, 22, 25]), R.choice([0.05, 0.1, 0.02]), R.choice([5, 10, 20, 30])
    v = Tr + (T0 - Tr) * math.exp(-k * t)
    add('eg3', f'A drink cools by {m(f"T = {Tr} + {T0 - Tr}e^{{-{k:g}t}}")}. Find {m("T")} at {m(f"t = {t}")}, to 1 decimal place.', round(v, 1), [round((T0 - Tr) * math.exp(-k * t), 1), round(T0 * math.exp(-k * t), 1), round(Tr + (T0 - Tr) * math.exp(-k * t / 2), 1)], m(f'{Tr} + {T0 - Tr}e^{{-{k * t:g}}} \\approx {v:.1f}'), fmt=lambda x: m(f'{x:.1f}'), near=lambda kk: round(v + kk, 1))
    h = R.choice([2, 5, 8, 10, 20])
    add('eg1', f'A substance has a half-life of {h} years, so {m("M = M_0e^{-kt}")}. Find {m("k")} to 4 decimal places.', round(math.log(2) / h, 4), [round(h / math.log(2), 4), round(0.5 / h, 4), round(math.log(2) * h, 4)], m(f'\\frac{{1}}{{2}} = e^{{-{h}k}} \\Rightarrow k = \\frac{{\\ln 2}}{{{h}}} \\approx {math.log(2) / h:.4f}'), fmt=lambda x: m(f'{x:.4f}'), near=lambda kk: round(math.log(2) / h + 0.001 * kk, 4))
    addt('eg2', f'Which is a solution of {m(f"\\frac{{dT}}{{dt}} = -k(T - {Tr})")}?', f'T = {Tr} + Ae^{{-kt}}', [f'T = Ae^{{-kt}} - {Tr}', f'T = {Tr}e^{{-kt}}', f'T = {Tr} + Ae^{{kt}}'], f'Then {m(f"T - {Tr} = Ae^{{-kt}}")} and {m(f"\\frac{{dT}}{{dt}} = -kAe^{{-kt}} = -k(T - {Tr})")}.')

# ================= Related rates =================
for _ in range(60):
    r, dr = R.randint(2, 10), R.choice([F(1, 2), 1, 2, 3])
    add('rr2', f'A sphere\'s radius grows at {m(f"{tf(dr)}\\text{{ cm/s}}")}. How fast is its volume growing when {m(f"r = {r}")} cm?', 4 * r * r * F(dr), [F(4, 3) * r ** 3 * F(dr), 4 * r * r, 2 * r * F(dr)], m(f'\\frac{{dV}}{{dt}} = 4\\pi r^2\\frac{{dr}}{{dt}} = 4\\pi({r})^2({tf(dr)})'), fmt=lambda v: m(f'{pi_s(v)}\\text{{ cm}}^3\\text{{/s}}'))
    add('rr2', f'A circle\'s radius grows at {m(f"{tf(dr)}\\text{{ cm/s}}")}. How fast is its area growing when {m(f"r = {r}")} cm?', 2 * r * F(dr), [r * r * F(dr), 2 * r, r * F(dr)], m(f'\\frac{{dA}}{{dt}} = 2\\pi r\\frac{{dr}}{{dt}} = 2\\pi({r})({tf(dr)})'), fmt=lambda v: m(f'{pi_s(v)}\\text{{ cm}}^2\\text{{/s}}'))
    s, ds = R.randint(2, 9), R.choice([1, 2, 3])
    add('rr2', f'Each side of a cube grows at {m(f"{ds}\\text{{ cm/s}}")}. How fast is its volume growing when the side is {m(s)} cm?', 3 * s * s * ds, [s ** 3 * ds, 3 * s * s, 6 * s * ds], m(f'\\frac{{dV}}{{dt}} = 3s^2\\frac{{ds}}{{dt}} = 3({s})^2({ds})'), fmt=lambda v: m(f'{v}\\text{{ cm}}^3\\text{{/s}}'))
    a, b = R.choice([(3, 4), (6, 8), (5, 12), (8, 6)])
    c = int((a * a + b * b) ** 0.5); da = R.choice([1, 2])
    add('rr3', f'A ladder {m(c)} m long slides down a wall. The foot moves away at {m(f"{da}\\text{{ m/s}}")}. How fast does the top fall when the foot is {m(a)} m from the wall?', F(a * da, b), [F(b * da, a), F(a, b), F(a * da, c)], f'{m(f"x^2 + y^2 = {c * c}")}, so {m("x\\dot{x} + y\\dot{y} = 0")}: {m(f"{a}({da}) + {b}\\dot{{y}} = 0")}, falling at {m(tf(F(a * da, b)))} m/s.', fmt=lambda v: m(f'{tf(v)}\\text{{ m/s}}'))

# ================= Parametrics, inverse functions, inequalities =================
for _ in range(50):
    a = R.randint(1, 6)
    addt('pa2', f'Find the Cartesian equation of {m(f"x = {a if a > 1 else ""}t")}, {m(f"y = t^2")}.', f'y = \\frac{{x^2}}{{{a * a}}}' if a > 1 else 'y = x^2', [f'y = {a * a}x^2' if a > 1 else 'y = 2x', f'y = \\frac{{x^2}}{{{a}}}' if a > 1 else 'x = y^2', f'y = {a}x^2' if a > 1 else 'y = \\sqrt{x}'], f'{m(f"t = \\frac{{x}}{{{a}}}")}, then substitute into {m("y = t^2")}.' if a > 1 else f'{m("t = x")}, so {m("y = x^2")}.')
    addt('pa3', f'Find the Cartesian equation of {m(f"x = {a}\\cos\\theta")}, {m(f"y = {a}\\sin\\theta")}.', f'x^2 + y^2 = {a * a}', [f'x^2 + y^2 = {a}', f'x + y = {a}', f'x^2 - y^2 = {a * a}'], f'{m("\\cos^2\\theta + \\sin^2\\theta = 1")}, so {m(f"\\frac{{x^2}}{{{a * a}}} + \\frac{{y^2}}{{{a * a}}} = 1")}.' if a > 1 else m('x^2 + y^2 = 1'))
    c = R.randint(-4, 4)
    addt('if3', f'What is the largest domain containing {m(f"x = {c + 1}")} on which {m(f"f(x) = (x {"-" if c >= 0 else "+"} {abs(c)})^2")} has an inverse?'.replace('x - 0', 'x'), f'x \\geq {c}', [f'x \\geq {-c}' if c else 'x \\leq 0', f'x \\leq {c}', 'x \\in \\mathbb{R}'], f'The parabola turns at {m(f"x = {c}")}; keep the half that contains {m(f"x = {c + 1}")}.')
    k = R.randint(1, 6)
    addt('iq2', f'Solve {m(f"\\frac{{1}}{{x}} > \\frac{{1}}{{{k}}}")}.', f'0 < x < {k}', [f'x < {k}', f'x > {k}', f'x < 0 \\text{{ or }} x > {k}'], f'Multiply by {m("x^2")}: {m(f"x > \\frac{{x^2}}{{{k}}}")}, so {m(f"x({k} - x) > 0")}, giving {m(f"0 < x < {k}")}.')
    k2 = R.randint(1, 8); c2 = R.randint(-5, 5)
    addt('iq3', f'Solve {m(f"|x {"-" if c2 >= 0 else "+"} {abs(c2)}| < {k2}")}.'.replace('x - 0', 'x'), f'{c2 - k2} < x < {c2 + k2}', [f'{-c2 - k2} < x < {-c2 + k2}', f'x < {c2 - k2} \\text{{ or }} x > {c2 + k2}', f'{c2 - k2} \\leq x \\leq {c2 + k2}'], m(f'-{k2} < x - ({c2}) < {k2}'))
    r1, r2 = sorted(R.sample(range(-6, 7), 2))
    addt('iq1', f'Solve {m(f"{poly([1, -(r1 + r2), r1 * r2])} \\leq 0")}.', f'{r1} \\leq x \\leq {r2}', [f'x \\leq {r1} \\text{{ or }} x \\geq {r2}', f'{-r2} \\leq x \\leq {-r1}', f'{r1} < x < {r2}'], f'The parabola is below the axis between its roots {m(r1)} and {m(r2)}.')

# ================= Bernoulli and binomial distributions =================
for _ in range(80):
    n, p = R.randint(4, 12), R.choice([F(1, 2), F(1, 3), F(1, 4), F(1, 5), F(2, 5), F(3, 10)])
    k = R.randint(1, min(n, 4))
    pk = comb(n, k) * p ** k * (1 - p) ** (n - k)
    add('bd2', f'{m(f"X \\sim \\text{{Bin}}({n}, {tf(p)})")}. Find {m(f"P(X = {k})")}.', pk, [p ** k * (1 - p) ** (n - k), comb(n, k) * p ** k, comb(n, k) * p ** (n - k) * (1 - p) ** k if p != F(1, 2) else pk * 2],
        m(f'\\binom{{{n}}}{{{k}}}\\left({tf(p)}\\right)^{{{k}}}\\left({tf(1 - p)}\\right)^{{{n - k}}}'), fmt=lambda v: m(f'{float(v):.4f}'), near=lambda kk: pk + F(kk, 1000))
    add('bd3', f'{m(f"X \\sim \\text{{Bin}}({n}, {tf(p)})")}. Find {m("E(X)")}.', n * p, [n * p * (1 - p), p, n * (1 - p)], m(f'E(X) = np = {n} \\times {tf(p)} = {tf(n * p)}'))
    add('bd3', f'{m(f"X \\sim \\text{{Bin}}({n}, {tf(p)})")}. Find {m("\\text{Var}(X)")}.', n * p * (1 - p), [n * p, p * (1 - p), n * p * p], m(f'\\text{{Var}}(X) = np(1 - p) = {tf(n * p * (1 - p))}'))
    add('bd2', f'{m(f"X \\sim \\text{{Bin}}({n}, {tf(p)})")}. Find {m("P(X \\geq 1)")}.', 1 - (1 - p) ** n, [(1 - p) ** n, 1 - p ** n, n * p * (1 - p) ** (n - 1)], m(f'1 - P(X = 0) = 1 - \\left({tf(1 - p)}\\right)^{{{n}}}'), fmt=lambda v: m(f'{float(v):.4f}'), near=lambda kk: 1 - (1 - p) ** n - F(kk, 1000))
    add('bd1', f'A Bernoulli variable has {m(f"p = {tf(p)}")}. Find its variance.', p * (1 - p), [p, 1 - p, p * p], m(f'p(1 - p) = {tf(p)} \\times {tf(1 - p)} = {tf(p * (1 - p))}'))

by = {}
for q in OUT: by.setdefault(q['step'], []).append(q)
final = []
for s in sorted(by):
    R.shuffle(by[s]); final += by[s][:36]
json.dump(final, open('quick_ext1b.json', 'w'), indent=1)
print({s: min(len(v), 36) for s, v in sorted(by.items())}, 'total', len(final))
