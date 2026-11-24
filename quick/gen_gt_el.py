"""More Maths Advanced quick questions for Graphing Techniques (gt1-gt5) and Exponential and Logarithmic Functions (el1-el6),
modelled on Maths in Focus (Margaret Grove) exercises and real HSC Advanced questions 2020-2025, with every number changed.
Answers are computed here; wrong options come from the usual mistakes.
Output: out/quick-adv-gtel.raw.json (multiple choice) and out/quick-adv-gtel-worked.raw.json (written / extended)."""
import json, math, random, re, html, os
from fractions import Fraction as F

R = random.Random(20261125)
GT, EL = 'Graphing Techniques', 'Exponential and Logarithmic Functions'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)
MCQ, WORKED, SEEN = [], [], set()


def m(t): return f'\\({t}\\)'


def tf(x):
    x = F(x)
    if x.denominator == 1: return str(x.numerator)
    s = '-' if x < 0 else ''
    return f'{s}\\frac{{{abs(x.numerator)}}}{{{x.denominator}}}'


def sgn(v, first=False):   # "+ 3" / "- 3", or "3" / "-3" first
    v = F(v)
    if first: return tf(v)
    if v == 0: return ''
    return f'- {tf(-v)}' if v < 0 else f'+ {tf(v)}'


def shift(v, var='x'):   # x - 3, x + 2, x
    return var if v == 0 else f'{var} {sgn(-v)}'


def dec(v, dp): return f'{v:.{dp}f}'


def clean(t):
    def tex(mm):
        x = mm.group(1)
        x = re.sub(r'(?<![0-9.\w])1(x|p|q|k|\\log|\\ln|e\^)', r'\1', x)       # 1x -> x, 1\log -> \log
        x = re.sub(r'(?<![0-9.])0(\\log_a [23]|p|q) \+ ', '', x)             # 0\log_a 2 + ...
        x = re.sub(r' \+ 0(\\log_a [23]|p|q)(?![0-9])', '', x)               # ... + 0\log_a 3
        x = x.replace('^{1}', '').replace('(x)(', 'x(').replace('(-x)(', '-x(')
        x = re.sub(r'\s{2,}', ' ', x)
        return '\\(' + x + '\\)'
    return re.sub(r'\\\((.+?)\\\)', tex, t)


def M(step, prompt, right, wrong, why):
    prompt, right, wrong, why = clean(prompt), clean(right), [clean(w) for w in wrong], clean(why)
    opts = [right] + [w for w in wrong]
    if len(opts) != 4 or len(set(opts)) != 4 or prompt in SEEN: return False
    SEEN.add(prompt)
    order = list(range(4)); R.shuffle(order)
    MCQ.append({'step': step, 'topic': GT if step.startswith('gt') else EL, 'prompt': prompt, 'options': [opts[i] for i in order],
                'answer': 'ABCD'[order.index(0)], 'why': why})
    return True


def plain(s):
    s = re.sub(r'\\\((.+?)\\\)', lambda mm: mm.group(1), s)
    return html.unescape(re.sub(r'<[^>]+>', '', s))


def W(step, marks, prompt, lines, crit, level=2):
    prompt, lines = clean(prompt), [clean(l) for l in lines]
    if prompt in SEEN: return
    SEEN.add(prompt)
    guide = '\n'.join(f'- {c} ({k} mark{"s" if k != 1 else ""})' for c, k in crit)
    WORKED.append({'step': step, 'topic': GT if step.startswith('gt') else EL, 'kind': 'worked', 'marks': marks, 'level': level,
                   'format': 'written' if marks <= 2 else 'extended', 'typed': False, 'prompt': prompt,
                   'stmt_text': plain(prompt),
                   'sol_text': 'Model answer:\n' + '\n'.join(plain(l) for l in lines) +
                   f'\n\nMarking guideline ({marks} marks, award the highest band the response fully meets):\n{guide}\n' +
                   'Equivalent methods and wording that show the same understanding get the same marks.',
                   'solution': ''.join(f'<p>{l}</p>' for l in lines) + '<table class="ol-crit"><tr><th>Criteria</th><th>Marks</th></tr>' +
                   ''.join(f'<tr><td>{c}</td><td>{k}</td></tr>' for c, k in crit) + '</table>'})


BASE = [   # name, f(u) as TeX with {u} for the inside
    ('x^2', lambda u: f'({u})^2' if u != 'x' else 'x^2'),
    ('x^3', lambda u: f'({u})^3' if u != 'x' else 'x^3'),
    ('\\sqrt{x}', lambda u: f'\\sqrt{{{u}}}'),
    ('\\frac{1}{x}', lambda u: f'\\frac{{1}}{{{u}}}'),
    ('|x|', lambda u: f'|{u}|'),
    ('e^x', lambda u: f'e^{{{u}}}'),
]

# ======================= gt1 translations (HSC 2020 Q2, HSC 2025 Q30, Margaret 3.01) =======================
for _ in range(60):
    name, f = R.choice(BASE)
    h, k = R.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), R.choice([-6, -4, -3, -2, -1, 1, 2, 3, 5, 7])
    if (name, h, k) == ('x^3', 2, 5): continue   # HSC 2020 Q2's own numbers
    g = f(shift(h)) + f' {sgn(k)}'
    lr, ud = ('right' if h > 0 else 'left'), ('up' if k > 0 else 'down')
    flip = {'right': 'left', 'left': 'right', 'up': 'down', 'down': 'up'}
    opt = lambda a, b: f'{abs(h)} {a}, {abs(k)} {b}'
    M('gt1', f'The graph of {m("y = " + name)} is translated to {m("y = " + g)}. Which describes the translations?',
      opt(lr, ud), [opt(flip[lr], ud), opt(lr, flip[ud]), opt(flip[lr], flip[ud])],
      f'Replacing {m("x")} with {m(shift(h))} moves the graph {abs(h)} {lr}; adding {m(tf(k))} outside moves it {abs(k)} {ud}.')
    a, b = R.randint(-5, 5), R.randint(-5, 5)
    M('gt1', f'The point {m(f"({a}, {b})")} lies on {m("y = f(x)")}. Which point lies on {m("y = f(" + shift(h) + ") " + sgn(k))}?',
      m(f'({a + h}, {b + k})'), [m(f'({a - h}, {b + k})'), m(f'({a + h}, {b - k})'), m(f'({a + k}, {b + h})')],
      f'Every point moves {abs(h)} {lr} and {abs(k)} {ud}: {m(f"({a} {sgn(h)}, {b} {sgn(k)}) = ({a + h}, {b + k})")}.')
    M('gt1', f'The graph of {m("y = " + name)} is translated {abs(h)} unit{"s" if abs(h) != 1 else ""} {lr} and {abs(k)} unit{"s" if abs(k) != 1 else ""} {ud}. What is its new equation?',
      m('y = ' + g), [m('y = ' + f(shift(-h)) + f' {sgn(k)}'), m('y = ' + f(shift(h)) + f' {sgn(-k)}'), m('y = ' + f(shift(-h)) + f' {sgn(-k)}')],
      f'{abs(h)} {lr} replaces {m("x")} with {m(shift(h))}; {abs(k)} {ud} adds {m(tf(k))}.')
GT1W = []   # HSC 2025 Q30 style: every set of numbers where only one positive k works
for r in range(-3, 5):
    for s_ in range(r + 2, 8):
        for k in range(1, 6):
            for X in range(-2, 12):
                Y = (X - k - r) * (X - k - s_) + k
                B, C = r + s_ - 2 * X + 1, (X - r) * (X - s_) - Y
                other = -B - k
                if other > 0 or (r, s_, X, Y) == (1, 5, 6, 11) or abs(Y) > 40: continue
                GT1W.append((r, s_, k, X, Y, B, C, other))
R.shuffle(GT1W)
for r, s_, k, X, Y, B, C, other in GT1W[:12]:
    W('gt1', 3, f'The parabola {m(f"y = ({shift(r)})({shift(s_)})")} is translated {m("k")} units to the right and {m("k")} units up, where {m("k > 0")}. '
      f'The translated parabola passes through {m(f"({X}, {Y})")}. Find the value of {m("k")}.',
      [m(f'y = (x - k {sgn(-r)})(x - k {sgn(-s_)}) + k'),
       m(f'{Y} = ({X} - k {sgn(-r)})({X} - k {sgn(-s_)}) + k'),
       m(f'k^2 {sgn(B)}k {sgn(C)} = 0'.replace('+ 1k', '+ k').replace('- 1k', '- k')),
       m(f'(k - {k})(k {sgn(-other)}) = 0' if other != 0 else f'k(k - {k}) = 0'),
       f'Since {m("k > 0")}, {m(f"k = {k}")}.'],
      [('Correct translated equation', 1), ('Correct quadratic in k', 2), ('Correct value of k, rejecting the other root', 3)], level=3)
# ======================= gt2 dilations (HSC 2021 Q21, HSC 2023 Q10, Margaret 3.01-3.02) =======================
for _ in range(60):
    name, f = R.choice(BASE)
    a = R.choice([2, 3, 4, 5])
    M('gt2', f'The graph of {m("y = " + name)} is dilated horizontally by a factor of {m(a)}. What is its new equation?',
      m('y = ' + f(f'\\frac{{x}}{{{a}}}')), [m('y = ' + f(f'{a}x')), m(f'y = {a}' + f('x')), m(f'y = \\frac{{1}}{{{a}}}' + f('x'))],
      f'A horizontal dilation by factor {m(a)} replaces {m("x")} with {m(f"\\frac{{x}}{{{a}}}")}.')
    M('gt2', f'The graph of {m("y = " + name)} is dilated vertically by a factor of {m(a)}. What is its new equation?',
      m(f'y = {a}' + f('x')), [m('y = ' + f(f'{a}x')), m('y = ' + f(f'\\frac{{x}}{{{a}}}')), m(f'y = \\frac{{1}}{{{a}}}' + f('x'))],
      f'A vertical dilation by factor {m(a)} multiplies every {m("y")} value by {m(a)}.')
    p, q = R.choice([-6, -4, -2, 2, 4, 6, 8, 12]), R.choice([-9, -5, -3, 2, 3, 7])
    k, b = R.choice([2, 3, 4, 5]), R.choice([2, 3, 4])
    M('gt2', f'The point {m(f"({p}, {q})")} is on {m("y = f(x)")}. Which point is on {m(f"y = {k}f({b}x)")}?',
      m(f'({tf(F(p, b))}, {k * q})'), [m(f'({p * b}, {k * q})'), m(f'({tf(F(p, b))}, {tf(F(q, k))})'), m(f'({p * k}, {q * b})')],
      f'{m(f"{b}x")} inside squeezes horizontally: {m("x")} values divide by {m(b)}. {m(k)} outside stretches vertically: {m("y")} values multiply by {m(k)}.')
for a in [2, 3, 4, 5, 6, 7]:   # HSC 2023 Q10
    M('gt2', f'The line {m("y = c")} (with {m("c > 0")}) meets {m("y = x^2")} at {m("P")} and {m("Q")}, and {m("PQ = L")}. It meets {m(f"y = \\frac{{x^2}}{{{a * a}}}")} at {m("S")} and {m("T")}. What is {m("ST")}?',
      m(f'{a}L'), [m(f'\\frac{{L}}{{{a}}}'), m(f'{a * a}L'), m(f'\\frac{{L}}{{{a * a}}}')],
      f'{m(f"\\frac{{x^2}}{{{a * a}}} = \\left(\\frac{{x}}{{{a}}}\\right)^2")} is {m("y = x^2")} dilated horizontally by factor {m(a)}, so every width is {m(a)} times as long.')
for _ in range(30):   # HSC 2021 Q21
    xi, tx, ty = R.choice([4, 6, 8, 10, 12]), R.choice([2, 4, 6]), R.choice([-12, -8, -6, -4])
    k, b = R.choice([2, 3, 4]), 2
    if tx >= xi or (xi, tx, ty, k) == (6, 4, -8, 4): continue
    W('gt2', 2, f'The graph of {m("y = f(x)")} passes through the origin, has another {m("x")}-intercept at {m(f"x = {xi}")} and a turning point at {m(f"({tx}, {ty})")}. '
      f'For the graph of {m(f"y = {k}f({b}x)")}, find the {m("x")}-intercepts and the coordinates of the turning point.',
      [f'{m(f"{b}x")} inside halves every {m("x")} value; {m(k)} outside multiplies every {m("y")} value by {m(k)}.',
       f'{m("x")}-intercepts: {m("x = 0")} and {m(f"x = {tf(F(xi, b))}")}.',
       f'Turning point: {m(f"({tf(F(tx, b))}, {k * ty})")}.'],
      [('Correct x-intercepts', 1), ('Correct x-intercepts and turning point', 2)])

# ======================= gt3 reflections (HSC 2024 Q4, HSC 2025 Q6, HSC 2020 Q24) =======================
for _ in range(50):
    h, c = R.choice([-5, -4, -3, -2, 2, 3, 4, 5]), R.choice([-6, -3, -2, 1, 2, 4, 7])
    if (h, c) == (3, -2): continue   # HSC 2024 Q4
    P = f'(x {sgn(-h)})^2 {sgn(c)}'
    first, second = R.choice([('y-axis', 'x-axis'), ('x-axis', 'y-axis')])
    M('gt3', f'The parabola {m("y = " + P)} is reflected in the {first} and then in the {second}. What is the equation of the result?',
      m(f'y = -(x {sgn(h)})^2 {sgn(-c)}'), [m(f'y = (x {sgn(h)})^2 {sgn(c)}'), m(f'y = -(x {sgn(-h)})^2 {sgn(-c)}'), m(f'y = -(x {sgn(h)})^2 {sgn(c)}')],
      f'In the {m("y")}-axis: replace {m("x")} with {m("-x")}, giving {m(f"(x {sgn(h)})^2 {sgn(c)}")}. In the {m("x")}-axis: negate the whole function.')
    a, b = R.choice([-5, -3, -2, 1, 3, 4]), R.choice([-4, -2, 1, 3, 5, 6])
    for eq, pt, why in [('-f(x)', (a, -b), 'negates every y value'), ('f(-x)', (-a, b), 'negates every x value'), ('-f(-x)', (-a, -b), 'negates both coordinates')]:
        wrong = [(a, -b), (-a, b), (-a, -b), (b, a)]
        wrong = [w for w in wrong if w != pt][:3]
        M('gt3', f'The point {m(f"({a}, {b})")} lies on {m("y = f(x)")}. Which point lies on {m("y = " + eq)}?',
          m(f'({pt[0]}, {pt[1]})'), [m(f'({w[0]}, {w[1]})') for w in wrong], f'{m("y = " + eq)} {why}.')
for fx, minus_x, minus_f, both in [('e^x', 'e^{-x}', '-e^x', '-e^{-x}'), ('\\ln x', '\\ln(-x)', '-\\ln x', '-\\ln(-x)'), ('x^3 - x^2', '-x^3 - x^2', '-x^3 + x^2', 'x^3 + x^2'),
                                   ('\\sqrt{x}', '\\sqrt{-x}', '-\\sqrt{x}', '-\\sqrt{-x}'), ('2^x', '2^{-x}', '-2^x', '-2^{-x}')]:
    M('gt3', f'The graph of {m("y = " + fx)} is reflected in the {m("y")}-axis. What is the new equation?', m('y = ' + minus_x), [m('y = ' + minus_f), m('y = ' + both), m('y = ' + fx)],
      f'Reflecting in the {m("y")}-axis replaces {m("x")} with {m("-x")}.')
    M('gt3', f'The graph of {m("y = " + fx)} is reflected in the {m("x")}-axis. What is the new equation?', m('y = ' + minus_f), [m('y = ' + minus_x), m('y = ' + both), m('y = ' + fx)],
      f'Reflecting in the {m("x")}-axis negates the whole function.')
for _ in range(30):   # HSC 2020 Q24: a circle reflected in the x-axis
    a, b, r = R.choice([-4, -3, -2, 2, 3, 5]), R.choice([-5, -3, -2, 1, 2, 4]), R.choice([2, 3, 4, 5])
    C = a * a + b * b - r * r
    if (a, b, r) == (3, -2, 4): continue   # HSC 2020 Q24
    eq = f'x^2 {sgn(-2 * a)}x + y^2 {sgn(-2 * b)}y {sgn(C)} = 0'
    W('gt3', 3, f'The circle {m(eq)} is reflected in the {m("x")}-axis. Find the centre and radius of the reflected circle, and its equation.',
      [m(f'(x {sgn(-a)})^2 + (y {sgn(-b)})^2 = {r * r}') + f', so the circle has centre {m(f"({a}, {b})")} and radius {m(r)}.',
       f'Reflecting in the {m("x")}-axis negates the {m("y")} coordinate: centre {m(f"({a}, {-b})")}, radius still {m(r)}.',
       f'Equation: {m(f"(x {sgn(-a)})^2 + (y {sgn(b)})^2 = {r * r}")}.'],
      [('Completes the square to find the original centre and radius', 1), ('Correct reflected centre and radius', 2), ('Correct reflected centre, radius and equation', 3)], level=3)

# ======================= gt4 combined (HSC 2022 Q19, Margaret 3.02 and 3.06, Practice Set 1 Q5) =======================
for _ in range(60):
    name, f = R.choice(BASE)
    k, a, b, c = R.choice([2, 3, 4]), R.choice([2, 3]), R.choice([-4, -3, -1, 1, 2, 5]), R.choice([-5, -2, -1, 1, 3, 4])
    lr, ud = ('left' if b > 0 else 'right'), ('up' if c > 0 else 'down')
    M('gt4', f'{m("y = " + name)} is dilated horizontally by factor {m(f"\\frac{{1}}{{{a}}}")}, then translated {abs(b)} unit{"s" if abs(b) != 1 else ""} {lr}. What is the new equation?',
      m('y = ' + f(f'{a}(x {sgn(b)})')), [m('y = ' + f(f'{a}x {sgn(b)}')), m('y = ' + f(f'\\frac{{1}}{{{a}}}(x {sgn(b)})')), m('y = ' + f(f'{a}(x {sgn(-b)})'))],
      f'The dilation gives {m("y = " + f(f"{a}x"))}. Translating then replaces {m("x")} with {m(shift(-b))}: {m("y = " + f(f"{a}(x {sgn(b)})"))}. Brackets matter.')
    g = f'{k}' + f(f'{a}(x {sgn(b)})') + f' {sgn(c)}'
    M('gt4', f'Which transformations take {m("y = " + name)} to {m("y = " + g)}?',
      f'Dilate vertically by {k}, horizontally by {m(f"\\tfrac{{1}}{{{a}}}")}, translate {abs(b)} {lr} and {abs(c)} {ud}',
      [f'Dilate vertically by {k}, horizontally by {a}, translate {abs(b)} {lr} and {abs(c)} {ud}',
       f'Dilate vertically by {k}, horizontally by {m(f"\\tfrac{{1}}{{{a}}}")}, translate {abs(b)} {"right" if lr == "left" else "left"} and {abs(c)} {ud}',
       f'Dilate vertically by {m(f"\\tfrac{{1}}{{{k}}}")}, horizontally by {m(f"\\tfrac{{1}}{{{a}}}")}, translate {abs(b)} {lr} and {abs(c)} {ud}'],
      f'{m(k)} outside: vertical dilation by {k}. {m(a)} multiplying {m("(x " + sgn(b) + ")")}: horizontal dilation by {m(f"\\tfrac{{1}}{{{a}}}")}. {m(sgn(b, True))} inside: {abs(b)} {lr}. {m(sgn(c, True))} outside: {abs(c)} {ud}.')
    p, q = R.choice([-4, -2, 2, 4, 6, 8]), R.choice([-3, -1, 2, 5])
    M('gt4', f'The point {m(f"({p}, {q})")} lies on {m("y = f(x)")}. Which point lies on {m(f"y = {k}f({a}(x {sgn(b)})) {sgn(c)}")}?',
      m(f'({tf(F(p, a) - b)}, {k * q + c})'), [m(f'({tf(F(p, a) + b)}, {k * q + c})'), m(f'({tf(F(p - b, a))}, {k * q + c})'), m(f'({tf(F(p, a) - b)}, {k * (q + c)})')],
      f'{m("x")}: divide by {m(a)} then move {abs(b)} {lr}: {m(f"\\frac{{{p}}}{{{a}}} {sgn(-b)} = {tf(F(p, a) - b)}")}. {m("y")}: multiply by {m(k)} then move {abs(c)} {ud}: {m(f"{k}({q}) {sgn(c)} = {k * q + c}")}.')
for _ in range(40):   # HSC 2022 Q19: x^2 moved m right, dilated vertically by k, moved d down; given the expanded result, find m and k
    mm_, k, d = R.randint(1, 4), R.choice([2, 3, 4, 5]), R.randint(2, 9)
    if (k, mm_, d) == (3, 2, 5): continue   # HSC 2022 Q19
    A, B, C = k, -2 * k * mm_, k * mm_ * mm_ - d
    W('gt4', 3, f'The graph of {m("f(x) = x^2")} is translated {m("m")} units to the right, dilated vertically by a scale factor of {m("k")} and then translated {d} units down. '
      f'The equation of the transformed function is {m(f"g(x) = {A}x^2 {sgn(B)}x {sgn(C)}")}. Find the values of {m("m")} and {m("k")}.',
      [m(f'g(x) = k(x - m)^2 - {d} = kx^2 - 2kmx + km^2 - {d}'),
       f'Matching {m("x^2")}: {m(f"k = {k}")}.',
       f'Matching {m("x")}: {m(f"-2({k})m = {B}")}, so {m(f"m = {mm_}")}.',
       f'Check the constant: {m(f"{k}({mm_})^2 - {d} = {C}")}.'],
      [('Correct form of g(x) after the transformations', 1), ('Correct value of k or m', 2), ('Correct values of both m and k', 3)], level=3)

# ======================= gt5 graphs to solve equations and inequalities (HSC 2023 Q19) =======================
for _ in range(50):
    r, s = R.randint(-2, 4), R.randint(1, 5)
    lo, hi = -1 - s, r
    if lo >= hi or (r, s) == (1, 3): continue   # HSC 2023 Q19
    M('gt5', f'The graphs of {m(f"y = {shift(r)}")} and {m(f"y = ({r} - x)({s} + x)".replace("(0 - x)", "(-x)"))} are drawn. Hence solve {m(f"{shift(r)} < ({r} - x)({s} + x)".replace("(0 - x)", "(-x)"))}.',
      m(f'{lo} < x < {hi}'), [m(f'{-s} < x < {hi}'), m(f'x < {lo} \\text{{ or }} x > {hi}'), m(f'{lo} < x < {s}')],
      f'The line meets the parabola where {m(f"{shift(r)} = ({r} - x)({s} + x)")}, that is {m(f"(x {sgn(-r)})(x {sgn(s + 1)}) = 0")}: {m(f"x = {lo}, {hi}")}. Between these the parabola is above the line.')
for _ in range(60):
    kind = R.choice(['exp', 'abs', 'ln'])
    if kind == 'exp':
        c, sh = R.choice([1, 2, 3, 4, 6]), R.choice([0, 1, 2])
        lhs, rhs = f'e^{{x}}', f'{c} - x^2' if sh == 0 else f'{c} - (x - {sh})^2'
        fn = lambda x: math.exp(x) - (c - (x - sh) ** 2)
    elif kind == 'abs':
        a, c = R.choice([-2, -1, 0, 1, 2]), R.choice([1, 2, 3, 4])
        lhs, rhs = f'|x {sgn(-a)}|' if a else '|x|', f'{c} - x^2'
        fn = lambda x: abs(x - a) - (c - x * x)
    else:
        c = R.choice([1, 2, 3, 4])
        lhs, rhs = '\\ln x', f'{c} - x'
        fn = lambda x: (math.log(x) if x > 0 else -1e9) - (c - x)
    xs = [i / 1000 for i in range(-8000, 8001)]
    vals = [fn(x) for x in xs]
    if any(abs(v) < 1e-3 for v in vals): continue   # a touching point: too close to call
    n = sum(1 for u, v in zip(vals, vals[1:]) if (u < 0) != (v < 0) and abs(u) < 1e8 and abs(v) < 1e8)
    M('gt5', f'By sketching both graphs, how many solutions does {m(f"{lhs} = {rhs}")} have?', str(n), [str(z) for z in [0, 1, 2, 3, 4] if z != n][:3],
      f'Sketch {m("y = " + lhs)} and {m("y = " + rhs)}: they cross {n} time{"s" if n != 1 else ""}, so there {"is" if n == 1 else "are"} {n} solution{"s" if n != 1 else ""}.')
for _ in range(30):
    a, b = R.choice([2, 3, 4, 5, 6]), R.choice([1, 3, 5, 7])
    M('gt5', f'Using the graph of {m(f"y = |x {sgn(-a)}|")}, solve {m(f"|x {sgn(-a)}| < {b}")}.', m(f'{a - b} < x < {a + b}'),
      [m(f'x < {a - b} \\text{{ or }} x > {a + b}'), m(f'{-a - b} < x < {b - a}'), m(f'{-b} < x < {b}') if a else m(f'0 < x < {b}')],
      f'The V has its vertex at {m(f"x = {a}")}; it is below {m(f"y = {b}")} within {b} unit{"s" if b != 1 else ""} of {a}: {m(f"{a - b} < x < {a + b}")}.')

# ======================= el1 index laws and e (Margaret 4.02, HSC 2021 Q5, HSC 2025 Q2) =======================
for _ in range(60):
    a, b, c = R.randint(2, 7), R.randint(1, 6), R.randint(1, 5)
    M('el1', f'Simplify {m(f"\\frac{{e^{{{a}x}} \\times e^{{{b}x}}}}{{e^{{{c}x}}}}")}.', m(f'e^{{{a + b - c}x}}'.replace('{1x}', '{x}').replace('{0x}', '{0}')),
      [m(f'e^{{{a * b - c}x}}'), m(f'e^{{{a + b + c}x}}'), m(f'e^{{{tf(F(a * b, c))}x}}')],
      f'Add the powers when multiplying and subtract when dividing: {m(f"{a} + {b} - {c} = {a + b - c}")}.')
    p, q = R.randint(2, 4), R.randint(2, 4)
    M('el1', f'Simplify {m(f"(e^{{{p}x}})^{{{q}}} \\times e^{{-x}}")}.', m(f'e^{{{p * q - 1}x}}'), [m(f'e^{{{p + q - 1}x}}'), m(f'e^{{{p * q + 1}x}}'), m(f'e^{{{p ** q - 1}x}}')],
      f'Power of a power multiplies: {m(f"e^{{{p * q}x}}")}; then subtract 1: {m(f"e^{{{p * q - 1}x}}")}.')
    base, k = R.choice([(2, 4), (2, 8), (3, 9), (3, 27), (5, 25), (2, 16)]), R.randint(1, 3)
    pw = round(math.log(base[1], base[0]))
    M('el1', f'Write {m(f"{base[1]}^{{x}} \\times {base[0]}^{{{k}}}")} as a power of {m(base[0])}.', m(f'{base[0]}^{{{pw}x + {k}}}'),
      [m(f'{base[0]}^{{{pw}x{k}}}'.replace('x1}', 'x}') if False else f'{base[0]}^{{{pw * k}x}}'), m(f'{base[0]}^{{x + {pw + k}}}'), m(f'{base[0]}^{{{pw}(x + {k})}}')],
      f'{m(f"{base[1]} = {base[0]}^{pw}")}, so {m(f"{base[1]}^x = {base[0]}^{{{pw}x}}")}. Multiplying adds powers: {m(f"{base[0]}^{{{pw}x + {k}}}")}.')
    t = R.choice([2, 3, 5])
    M('el1', f'If {m(f"{t}^{{x}} = k")}, then {m(f"{t}^{{x + 2}}")} equals', m(f'{t * t}k'), [m('k + 2'), m('k^2'), m(f'{t}k^2')],
      m(f'{t}^{{x + 2}} = {t}^x \\times {t}^2 = {t * t}k'))
    M('el1', f'If {m(f"{t}^{{x}} = k")}, then {m(f"{t * t}^{{x}}")} equals', m('k^2'), [m(f'{t * t}k'), m('2k'), m(f'k^{{{t * t}}}')],
      m(f'{t * t}^x = ({t}^2)^x = ({t}^x)^2 = k^2'))
for _ in range(30):
    A, b = R.choice([2, 5, 8, 10, 20, 50]), R.choice([0.4, 0.6, 0.8, 0.9, 1.2, 1.5, 2, 3])
    dirn = 'increasing' if b > 1 else 'decreasing'
    M('el1', f'Which best describes the graph of {m(f"y = {A}({b:g})^x")}?', f'{dirn.capitalize()}, {m("y")}-intercept {A}, asymptote {m("y = 0")}',
      [f'{("decreasing" if b > 1 else "increasing").capitalize()}, {m("y")}-intercept {A}, asymptote {m("y = 0")}',
       f'{dirn.capitalize()}, {m("y")}-intercept {b:g}, asymptote {m("y = 0")}', f'{dirn.capitalize()}, {m("y")}-intercept {A}, asymptote {m(f"y = {A}")}'],
      f'At {m("x = 0")}, {m(f"y = {A}")}. The base {m(f"{b:g}")} is {"more" if b > 1 else "less"} than 1, so it is {dirn}, and it approaches {m("y = 0")}.')

# ======================= el2 logs and log laws (HSC 2023 Q8, Margaret 8.05) =======================
for n in [2, 3, 4, 5, 6]:
    for var in [('a', 'b'), ('p', 'q'), ('k', 'c')]:
        a, b = var
        if (n, var) == (3, ('a', 'b')): continue   # HSC 2023 Q8 itself
        M('el2', f'What is the solution of {m(f"\\log_{{{a}}} x^{{{n}}} = {b}")}, where {m(a)} and {m(b)} are positive constants?',
          m(f'x = {a}^{{\\frac{{{b}}}{{{n}}}}}'), [m(f'x = {a}^{{{n}{b}}}'), m(f'x = \\left(\\frac{{{b}}}{{{n}}}\\right)^{{{a}}}'), m(f'x = \\frac{{{a}^{{{b}}}}}{{{n}}}')],
          f'{m(f"{n}\\log_{{{a}}} x = {b}")}, so {m(f"\\log_{{{a}}} x = \\frac{{{b}}}{{{n}}}")} and {m(f"x = {a}^{{\\frac{{{b}}}{{{n}}}}}")}.')
def pq(i, j):
    t = [x for x in [(f'{i}p' if i > 1 else 'p') if i else '', (f'{j}q' if j > 1 else 'q') if j else ''] if x]
    return ' + '.join(t)
for i in range(0, 4):
    for j in range(0, 4):
        if i + j == 0: continue
        val = 2 ** i * 3 ** j
        wrong = [f'{i + j}pq' if i and j else f'{i + j + 1}{"p" if i else "q"}', pq(j, i) if i != j else pq(i + 1, j), f'p^{{{i}}}q^{{{j}}}' if i and j else (f'{"p" if i else "q"}^{{{i + j}}}')]
        M('el2', f'If {m("\\log_a 2 = p")} and {m("\\log_a 3 = q")}, express {m(f"\\log_a {val}")} in terms of {m("p")} and {m("q")}.', m(pq(i, j)), [m(w) for w in wrong],
          f'{m(f"{val} = 2^{i} \\times 3^{j}")}, so {m(f"\\log_a {val} = {i}\\log_a 2 + {j}\\log_a 3 = " + pq(i, j))}.')
for _ in range(40):
    b = R.choice([2, 3, 5]); u = R.randint(2, 4); k = R.choice([3, 5, 6, 7, 10, 11])
    hi = k * b ** u
    M('el2', f'Evaluate {m(f"\\log_{{{b}}} {hi} - \\log_{{{b}}} {k}")}.', m(u), [m(tf(F(hi, k))), m(round(math.log(hi - k, b), 2) if False else u + 1), m(u - 1)],
      f'{m(f"\\log_{{{b}}} \\frac{{{hi}}}{{{k}}} = \\log_{{{b}}} {b ** u} = {u}")}.')
for _ in range(30):
    b, x = R.choice([3, 5, 6, 7]), R.choice([10, 20, 30, 40, 50, 90])
    v = math.log(x) / math.log(b)
    M('el2', f'Use the change of base law to evaluate {m(f"\\log_{{{b}}} {x}")}, correct to 2 decimal places.', m(dec(v, 2)),
      [m(dec(math.log(b) / math.log(x), 2)), m(dec(math.log10(x / b), 2)), m(dec(x / b, 2))],
      m(f'\\log_{{{b}}} {x} = \\frac{{\\ln {x}}}{{\\ln {b}}} \\approx {dec(v, 2)}'))
for _ in range(30):   # Margaret 8.05: log scales
    d = R.choice([1, 2, 3]); m1 = round(R.uniform(3, 6), 1); m2 = round(m1 + d, 1)
    M('el2', f'The Richter scale is a base 10 logarithmic scale. How many times stronger is an earthquake of magnitude {m2} than one of magnitude {m1}?',
      m(f'{10 ** d:,}'.replace(',', '{,}')), [m(d), m(10 * d), m(f'{d ** 10:,}'.replace(',', '{,}')) if d > 1 else m(100 if d == 1 else 1000)],
      f'A difference of {d} on a base 10 scale is a factor of {m(f"10^{d}")}.')
    n = R.choice([2, 3, 4, 5, 9, 11])
    M('el2', f'Using {m("\\text{pH} = -\\log_{10}[\\text{H}^+]")}, find the pH when {m(f"[\\text{{H}}^+] = 10^{{-{n}}}")} mol/L.', m(n), [m(-n), m(f'10^{{{n}}}'), m(14 - n)],
      m(f'-\\log_{{10}} 10^{{-{n}}} = {n}'))

# ======================= el3 solving (Margaret 8.03, HSC 2024 Q17b, HSC 2024 Q18b) =======================
for _ in range(40):
    b, c = R.choice([2, 3, 5, 1.5]), R.choice([7, 10, 12, 20, 50, 100])
    v = math.log(c) / math.log(b)
    M('el3', f'Solve {m(f"{b:g}^{{x}} = {c}")}, correct to 2 decimal places.', m(f'x = {dec(v, 2)}'),
      [m(f'x = {dec(c / b, 2)}'), m(f'x = {dec(math.log(b) / math.log(c), 2)}'), m(f'x = {dec(math.log(c / b), 2)}')], m(f'x = \\frac{{\\ln {c}}}{{\\ln {b:g}}} \\approx {dec(v, 2)}'))
for _ in range(40):
    a, b = R.sample([2, 3, 4, 5, 6, 7], 2)
    M('el3', f'Solve {m(f"e^{{2x}} - {a + b}e^x + {a * b} = 0")}.', m(f'x = \\ln {min(a, b)} \\text{{ or }} x = \\ln {max(a, b)}'),
      [m(f'x = {min(a, b)} \\text{{ or }} x = {max(a, b)}'), m(f'x = e^{{{min(a, b)}}} \\text{{ or }} x = e^{{{max(a, b)}}}'), m(f'x = \\ln {a + b}')],
      f'Let {m("u = e^x")}: {m(f"u^2 - {a + b}u + {a * b} = (u - {min(a, b)})(u - {max(a, b)}) = 0")}, so {m(f"e^x = {min(a, b)}")} or {m(f"e^x = {max(a, b)}")}.')
for _ in range(60):
    k, x0 = R.randint(1, 6), R.randint(2, 9)
    n_ = x0 * (x0 - k)
    if n_ <= 0 or (n_ & (n_ - 1)): continue   # x(x - k) must be a power of 2
    n = n_.bit_length() - 1
    M('el3', f'Solve {m(f"\\log_2 x + \\log_2 (x - {k}) = {n}")}.', m(f'x = {x0}'), [m(f'x = {x0} \\text{{ or }} x = {k - x0}'), m(f'x = {k - x0}'), m(f'x = {tf(F(n + k, 2))}')],
      f'{m(f"x(x - {k}) = 2^{n} = {n_}")}, so {m(f"(x - {x0})(x {sgn(x0 - k)}) = 0")}. {m(f"x = {k - x0}")} is rejected because the log of a negative is undefined.')
for _ in range(40):   # HSC 2024 Q18b: least n so that P(at least one) > target
    p, tgt = R.choice([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]), R.choice([0.8, 0.9, 0.95, 0.99])
    n = math.floor(math.log(1 - tgt) / math.log(1 - p)) + 1
    M('el3', f'A player scores with probability {m(f"{p:g}")} on each attempt. What is the least number of attempts so that the probability of scoring at least once is greater than {m(f"{tgt:g}")}?',
      m(n), [m(n - 1), m(n + 1), m(math.ceil(tgt / p))] if math.ceil(tgt / p) not in (n, n - 1, n + 1) else [m(n - 1), m(n + 1), m(n + 2)],
      f'{m(f"1 - {1 - p:g}^n > {tgt:g}")} gives {m(f"n > \\frac{{\\ln {1 - tgt:g}}}{{\\ln {1 - p:g}}} \\approx {math.log(1 - tgt) / math.log(1 - p):.2f}")}, so {m(f"n = {n}")}.')
for _ in range(30):   # HSC 2024 Q17b / Margaret 8.03: find k from one reading
    V0, t1 = R.choice([5, 8, 10, 12, 20]), R.choice([1, 2, 3, 5])
    V1 = round(V0 * R.uniform(0.4, 0.85), 1)
    k = math.log(V0 / V1) / t1
    W('el3', 2, f'The voltage across a capacitor is {m(f"V = {V0}e^{{-kt}}")}. When {m(f"t = {t1}")}, the voltage is {m(f"{V1:g}")} volts. Find the value of {m("k")}, correct to 3 decimal places.',
      [m(f'{V1:g} = {V0}e^{{-{t1}k}}'.replace('-1k', '-k')), m(f'e^{{-{t1}k}} = \\frac{{{V1:g}}}{{{V0}}}'.replace('-1k', '-k')),
       m(f'k = -\\frac{{1}}{{{t1}}}\\ln\\left(\\frac{{{V1:g}}}{{{V0}}}\\right) \\approx {k:.3f}')],
      [('Takes logs correctly', 1), ('Correct value of k', 2)])

# ======================= el4 graphs of exponential and log functions (HSC 2021 Q3, HSC 2025 Q2) =======================
for _ in range(50):
    a, b = R.choice([1, 2, 3, 4, 5]), R.choice([1, 2, 3])
    if (a, b) == (1, 1): continue   # HSC 2021 Q3
    M('el4', f'What is the domain of {m(f"f(x) = \\ln({a} - {b}x)".replace("- 1x", "- x"))}?', m(f'x < {tf(F(a, b))}'),
      [m(f'x > {tf(F(a, b))}'), m(f'x \\le {tf(F(a, b))}'), m(f'x > -{tf(F(a, b))}')], f'Need {m(f"{a} - {b}x > 0")}'.replace('- 1x', '- x') + f', so {m(f"x < {tf(F(a, b))}")}.')
    h, c = R.choice([-3, -2, -1, 1, 2, 4]), R.choice([-3, -1, 2, 3, 5])
    M('el4', f'What is the horizontal asymptote of {m(f"y = e^{{{shift(h)}}} {sgn(c)}")}?', m(f'y = {c}'), [m('y = 0'), m(f'x = {h}'), m(f'y = {-c}')],
      f'{m(f"e^{{{shift(h)}}}")} approaches 0, so {m("y")} approaches {m(c)}.')
    M('el4', f'What is the vertical asymptote of {m(f"y = \\log_2({shift(h)}) {sgn(c)}")}?', m(f'x = {h}'), [m(f'x = {-h}'), m(f'y = {c}'), m('x = 0')],
      f'The log is undefined when {m(f"{shift(h)} \\le 0")}, so the asymptote is {m(f"x = {h}")}.')
    M('el4', f'What is the {m("x")}-intercept of {m(f"y = \\ln({shift(h)})")}?', m(f'x = {h + 1}'), [m(f'x = {h}'), m(f'x = {-h + 1}'), m(f'x = {h - 1}')],
      f'{m(f"\\ln({shift(h)}) = 0")} when {m(f"{shift(h)} = 1")}, so {m(f"x = {h + 1}")}.')
    M('el4', f'What is the range of {m(f"y = e^x {sgn(c)}")}?', m(f'y > {c}'), [m(f'y \\ge {c}'), m('y > 0'), m(f'y < {c}')], f'{m("e^x > 0")} for every {m("x")}, so {m(f"y > {c}")}.')
for b in [2, 3, 5, 10]:
    M('el4', f'The graph of {m(f"y = \\log_{{{b}}} x")} is the reflection of {m(f"y = {b}^x")} in which line?', m('y = x'), [m('y = -x'), m('x = 0'), m('y = 0')],
      f'They are inverse functions, so each is the reflection of the other in {m("y = x")}.')
    M('el4', f'Which point lies on the graph of {m(f"y = \\log_{{{b}}} x")}?', m('(1, 0)'), [m('(0, 1)'), m(f'({b}, 0)'), m('(0, 0)')],
      m(f'\\log_{{{b}}} 1 = 0'))

# ======================= el5 derivatives (Margaret 4.02-4.03, test Q8 and Q17) =======================
for _ in range(60):
    a, b = R.choice([2, 3, 4, 5, 7]), R.choice([-5, -3, -1, 1, 2, 4])
    M('el5', f'Differentiate {m(f"y = \\ln({a}x {sgn(b)})")}.', m(f'\\frac{{{a}}}{{{a}x {sgn(b)}}}'), [m(f'\\frac{{1}}{{{a}x {sgn(b)}}}'), m(f'\\frac{{{a}}}{{x}}'), m(f'{a}\\ln({a}x {sgn(b)})')],
      m(f'\\frac{{d}}{{dx}}\\ln f(x) = \\frac{{f\'(x)}}{{f(x)}} = \\frac{{{a}}}{{{a}x {sgn(b)}}}'))
    M('el5', f'Differentiate {m(f"y = e^{{{a}x {sgn(b)}}}")}.', m(f'{a}e^{{{a}x {sgn(b)}}}'), [m(f'e^{{{a}x {sgn(b)}}}'), m(f'({a}x {sgn(b)})e^{{{a}x {sgn(b - 1)}}}'), m(f'{a}e^{{{a}x}}')],
      m(f'\\frac{{d}}{{dx}}e^{{f(x)}} = f\'(x)e^{{f(x)}} = {a}e^{{{a}x {sgn(b)}}}'))
    c = R.choice([2, 3, 5, 10])
    M('el5', f'Differentiate {m(f"y = {c}^x")}.', m(f'{c}^x \\ln {c}'), [m(f'x \\cdot {c}^{{x - 1}}'), m(f'\\frac{{{c}^x}}{{\\ln {c}}}'), m(f'{c}^x')],
      m(f'\\frac{{d}}{{dx}}a^x = a^x \\ln a'))
    M('el5', f'Differentiate {m(f"y = \\log_{{{c}}}({a}x {sgn(b)})")}.', m(f'\\frac{{{a}}}{{({a}x {sgn(b)})\\ln {c}}}'),
      [m(f'\\frac{{{a}}}{{{a}x {sgn(b)}}}'), m(f'\\frac{{\\ln {c}}}{{{a}x {sgn(b)}}}'), m(f'\\frac{{1}}{{({a}x {sgn(b)})\\ln {c}}}')],
      m(f'\\log_{{{c}}} u = \\frac{{\\ln u}}{{\\ln {c}}}, \\text{{ so }} \\frac{{dy}}{{dx}} = \\frac{{{a}}}{{({a}x {sgn(b)})\\ln {c}}}'))
for _ in range(50):
    a, b, p = R.choice([1, 2, 3, 5]), R.choice([-1, 1, 2, 3, 4]), R.choice([1, 2, 3, 4])
    if a * p + b <= 0: continue
    g = F(a, a * p + b)
    fx = f'\\ln({a}x {sgn(b)})'.replace('(1x', '(x')
    M('el5', f'Find the gradient of the tangent to {m("y = " + fx)} at the point where {m(f"x = {p}")}.', m(tf(g)), [m(tf(F(1, a * p + b))), m(tf(-1 / g)), m(tf(F(a, p)))],
      m(f'\\frac{{dy}}{{dx}} = \\frac{{{a}}}{{{a}x {sgn(b)}}}'.replace('{1}{1x', '{1}{x')) + f', which at {m(f"x = {p}")} is {m(tf(g))}.')
    M('el5', f'Find the gradient of the normal to {m("y = " + fx)} at the point where {m(f"x = {p}")}.', m(tf(-1 / g)), [m(tf(g)), m(tf(1 / g)), m(tf(-g))],
      f'The tangent gradient is {m(tf(g))}, so the normal gradient is {m(tf(-1 / g))}.')
for _ in range(40):   # Margaret 4.03 Q3, Q8 and test Q17: tangent / normal to a log curve
    a, b, p = R.choice([1, 2, 3, 5]), R.choice([-3, -1, 1, 2, 4]), R.choice([1, 2, 3])
    v = a * p + b
    if v <= 0: continue
    g = F(a, v); fx = f'\\ln({a}x {sgn(b)})'.replace('(1x', '(x')
    W('el5', 3, f'Find the equation of the tangent to the curve {m("y = " + fx)} at the point where {m(f"x = {p}")}.',
      [f'At {m(f"x = {p}")}: {m(f"y = \\ln {v}")}' + ('' if v != 1 else f' {m("= 0")}') + '.',
       m(f'\\frac{{dy}}{{dx}} = \\frac{{{a}}}{{{a}x {sgn(b)}}}'.replace('{1}{1x', '{1}{x')) + f', so the gradient at {m(f"x = {p}")} is {m(tf(g))}.',
       m(f'y - {"\\ln " + str(v) if v != 1 else "0"} = {tf(g)}(x - {p})'.replace('y - 0', 'y')) + ', that is ' + m(f'y = {"" if g == 1 else tf(g)}x {sgn(-g * p)}' + (f' + \\ln {v}' if v != 1 else '')) + '.'],
      [('Correct derivative', 1), ('Correct gradient at the point', 2), ('Correct equation of the tangent', 3)], level=3)

# ======================= el6 growth and decay (Margaret 8.03, HSC 2021 Q23, HSC 2024 Q13, HSC 2020 Q21) =======================
for _ in range(60):
    P0, k = R.choice([200, 500, 1200, 2500, 4000, 15000]), R.choice([0.02, 0.035, 0.05, 0.08, 0.12])
    t = R.choice([3, 5, 8, 10, 12])
    P = P0 * math.exp(k * t)
    M('el6', f'A population grows according to {m(f"P = {P0}e^{{{k:g}t}}")}, where {m("t")} is in years. Find the population after {t} years, to the nearest whole number.',
      m(f'{round(P):,}'.replace(',', '{,}')), [m(f'{round(P0 * (1 + k) * t):,}'.replace(',', '{,}')), m(f'{round(P0 * math.exp(k) * t):,}'.replace(',', '{,}')), m(f'{round(P0 + math.exp(k * t)):,}'.replace(',', '{,}'))],
      m(f'{P0}e^{{{k:g} \\times {t}}} \\approx {round(P):,}'.replace(',', '{,}')))
    M('el6', f'A substance decays according to {m(f"M = M_0e^{{-{k:g}t}}")}. Find its half-life, correct to 1 decimal place.', m(dec(math.log(2) / k, 1)),
      [m(dec(0.5 / k, 1)), m(dec(math.log(2) * k, 2)), m(dec(1 / k, 1))],
      f'{m(f"e^{{-{k:g}t}} = \\frac{{1}}{{2}}")}, so {m(f"t = \\frac{{\\ln 2}}{{{k:g}}} \\approx {dec(math.log(2) / k, 1)}")}.')
for _ in range(50):
    g, yrs = R.choice([10, 15, 20, 25, 30]), R.choice([2, 3, 4, 5])
    if (g, yrs) == (20, 3): continue   # Margaret 8.03 Q20
    T = yrs * math.log(2) / math.log(1 + g / 100)
    M('el6', f'A population growing exponentially increases by {g}% in {yrs} years. How long will it take to double, correct to 1 decimal place?', m(f'{dec(T, 1)} \\text{{ years}}'),
      [m(f'{dec(yrs * 100 / g, 1)} \\text{{ years}}'), m(f'{dec(math.log(2) / (g / 100), 1)} \\text{{ years}}'), m(f'{dec(2 * yrs, 1)} \\text{{ years}}')],
      f'{m(f"e^{{{yrs}k}} = {1 + g / 100:g}")}, so {m(f"k = \\frac{{\\ln {1 + g / 100:g}}}{{{yrs}}}")}. Then {m("e^{kt} = 2")} gives {m(f"t = \\frac{{\\ln 2}}{{k}} \\approx {dec(T, 1)}")}.')
    r = R.choice([1.025, 1.04, 1.055, 1.08, 0.97, 0.95, 0.92, 0.88])
    pc = round((r - 1) * 100, 1)
    M('el6', f'A population is modelled by {m(f"y = A({r:g})^x")}, where {m("x")} is in years. What is its percentage yearly change?', m(f'{pc:+g}\\%'),
      [m(f'{-pc:+g}\\%'), m(f'{r * 100:g}\\%'), m(f'{round((1 - r) * 10, 2):+g}\\%')],
      f'Each year it is multiplied by {m(f"{r:g}")}, a change of {m(f"{pc:+g}\\%")}.')
    P0, kk = R.choice([300, 800, 2000]), R.choice([0.04, 0.06, 0.1])
    tt = R.choice([2, 5, 10])
    rate = kk * P0 * math.exp(kk * tt)
    M('el6', f'For {m(f"N = {P0}e^{{{kk:g}t}}")}, at what rate is {m("N")} increasing when {m(f"t = {tt}")}? Answer to 1 decimal place.', m(dec(rate, 1)),
      [m(dec(P0 * math.exp(kk * tt), 1)), m(dec(kk * P0, 1)), m(dec(rate / kk / tt, 1))],
      m(f'\\frac{{dN}}{{dt}} = {kk:g} \\times {P0}e^{{{kk:g}t}} = {kk * P0:g}e^{{{kk * tt:g}}} \\approx {dec(rate, 1)}'))
for P0, b, T in [(8000, 2, 10), (6000, 3, 10), (4000, 2, 30), (9000, 3, 20), (3000, 2, 20)]:   # HSC 2021 Q23
    for R_ in [30, 40, 50, 60, 80, 100]:
        PT = P0 / b ** (T / 10)
        t = -10 * math.log(10 * R_ / (P0 * math.log(b))) / math.log(b)
        if t <= 0 or PT != int(PT): continue
        W('el6', 4, f'A population {m("P")}, initially {P0:,}, varies according to {m(f"P = {P0}b^{{-\\frac{{t}}{{10}}}}")}, where {m("b")} is a positive constant and {m("t")} is in years. '
          f'The population is {int(PT):,} after {T} years. Find the value of {m("t")}, correct to one decimal place, for which the instantaneous rate of decrease is {R_} per year.',
          [m(f'{int(PT)} = {P0}b^{{-{T // 10}}}') + f', so {m(f"b^{{{T // 10}}} = {b ** (T // 10)}".replace("^{1}", ""))} and {m(f"b = {b}")}.',
           m(f'\\frac{{dP}}{{dt}} = -\\frac{{\\ln {b}}}{{10}} \\times {P0}({b})^{{-\\frac{{t}}{{10}}}}'),
           m(f'{P0 // 10}\\ln {b} \\cdot {b}^{{-\\frac{{t}}{{10}}}} = {R_}') + ', so ' + m(f'{b}^{{-\\frac{{t}}{{10}}}} = \\frac{{{R_}}}{{{P0 // 10}\\ln {b}}}'),
           m(f't = -10\\log_{{{b}}}\\left(\\frac{{{R_}}}{{{P0 // 10}\\ln {b}}}\\right) \\approx {t:.1f}') + ' years.'],
          [('Finds b', 1), ('Correct derivative', 2), ('Sets the rate of decrease equal and solves for the power', 3), ('Correct value of t', 4)], level=3)
for _ in range(30):   # HSC 2020 Q21 / Margaret 8.04 Q14: Newton's law of cooling
    Ta, T0 = R.choice([18, 20, 22, 25]), R.choice([85, 90, 95, 100])
    t1 = R.choice([2, 3, 4, 5]); T1 = R.choice(range(T0 - 30, T0 - 8))
    tgt = R.choice(range(Ta + 15, T1 - 5)) if T1 - 5 > Ta + 15 else None
    if not tgt: continue
    k = math.log((T0 - Ta) / (T1 - Ta)) / t1
    tt = math.log((T0 - Ta) / (tgt - Ta)) / k
    W('el6', 3, f'The temperature of tea {m("t")} minutes after it is poured is {m(f"T = {Ta} + {T0 - Ta}e^{{-kt}}")}. After {t1} minutes it is {m(f"{T1}^\\circ\\text{{C}}")}. '
      f'How long after it is poured does it reach {m(f"{tgt}^\\circ\\text{{C}}")}? Answer to the nearest tenth of a minute.',
      [m(f'{T1} = {Ta} + {T0 - Ta}e^{{-{t1}k}}') + ', so ' + m(f'k = \\frac{{1}}{{{t1}}}\\ln\\frac{{{T0 - Ta}}}{{{T1 - Ta}}} \\approx {k:.4f}'),
       m(f'{tgt} = {Ta} + {T0 - Ta}e^{{-kt}}') + ', so ' + m(f'e^{{-kt}} = \\frac{{{tgt - Ta}}}{{{T0 - Ta}}}'),
       m(f't = \\frac{{1}}{{k}}\\ln\\frac{{{T0 - Ta}}}{{{tgt - Ta}}} \\approx {tt:.1f}') + ' minutes.'],
      [('Finds k', 1), ('Sets up the equation for the target temperature', 2), ('Correct time', 3)], level=3)


# ======================= more written questions =======================
for r in range(-2, 5):   # HSC 2023 Q19b style
    for s_ in range(1, 6):
        if (r, s_) == (1, 3) or -1 - s_ >= r: continue
        W('gt5', 2, f'The graphs of {m(f"y = {shift(r)}")} and {m(f"y = ({r} - x)({s_} + x)".replace("(0 - x)", "(-x)"))} meet at two points. Hence, or otherwise, solve {m(f"{shift(r)} < ({r} - x)({s_} + x)".replace("(0 - x)", "(-x)"))}.',
          [m(f'{shift(r)} = ({r} - x)({s_} + x)'.replace('(0 - x)', '(-x)')) + ' when ' + m(f'(x {sgn(-r)})(x {sgn(s_ + 1)}) = 0') + ', so ' + m(f'x = {r}') + ' or ' + m(f'x = {-1 - s_}') + '.',
           f'The parabola is above the line between these: {m(f"{-1 - s_} < x < {r}")}.'],
          [('Finds both intersection points', 1), ('Correct solution', 2)])
for b, p_, q_ in [(2, 4, 8), (3, 9, 27), (2, 8, 16), (5, 25, 125), (2, 16, 4), (3, 27, 9), (2, 32, 8), (3, 81, 27)]:
    P_, Q_ = round(math.log(p_, b)), round(math.log(q_, b))
    for c in [1, 2, 3]:
        if P_ == Q_: continue
        x = F(-Q_ * c, P_ - Q_)   # P x = Q (x - c)
        if x.denominator > 4 or x == 0: continue
        W('el1', 2, f'Solve {m(f"{p_}^{{x}} = {q_}^{{x - {c}}}")}.',
          [m(f'({b}^{P_})^x = ({b}^{Q_})^{{x - {c}}}') + ', so ' + m(f'{P_}x = {Q_}(x - {c})') + '.',
           (m(f'{P_ - Q_}x = {-Q_ * c}') + ', so ' + m(f'x = {tf(x)}') if P_ - Q_ != 1 else m(f'x = {tf(x)}')) + '.'],
          [('Writes both sides with the same base', 1), ('Correct solution', 2)])
for i in range(0, 3):
    for j in range(0, 3):
        for e in [1, 2]:
            if i + j == 0: continue
            val = 2 ** i * 3 ** j
            W('el2', 2, f'Given {m("\\log_a 2 = p")} and {m("\\log_a 3 = q")}, express {m(f"\\log_a ({val}a^{{{e}}})".replace("^{1}", ""))} in terms of {m("p")} and {m("q")}.',
              [m(f'\\log_a ({val}a^{{{e}}}) = \\log_a {val} + \\log_a a^{{{e}}}'.replace('^{1}', '')) + '.',
               m(f'= {i}\\log_a 2 + {j}\\log_a 3 + {e} = {pq(i, j)} + {e}')],
              [('Uses the log laws to split the expression', 1), ('Correct expression', 2)])
for h in [-3, -2, -1, 1, 2, 4]:
    for c in [-2, 1, 3]:
        W('el4', 2, f'For {m(f"y = \\ln({shift(h)}) {sgn(c)}")}, state the domain, the equation of the vertical asymptote and the {m("x")}-intercept.',
          [f'Domain {m(f"x > {h}")}, vertical asymptote {m(f"x = {h}")}.',
           f'{m(f"\\ln({shift(h)}) = {-c}")}, so {m(f"x = {h} + e^{{{-c}}}")}' + f' {m(f"\\approx {h + math.exp(-c):.2f}")}.'],
          [('Correct domain and asymptote', 1), ('Correct x-intercept', 2)])

# ======================= keep a balanced number per dot point =======================
by, byw = {}, {}
for q in MCQ: by.setdefault(q['step'], []).append(q)
for q in WORKED: byw.setdefault(q['step'], []).append(q)
CAP, WCAP = 16, 4
final, finalw = [], []
for s in sorted(by): R.shuffle(by[s]); final += by[s][:CAP]
for s in sorted(byw): R.shuffle(byw[s]); finalw += byw[s][:WCAP]
json.dump(final, open(os.path.join(OUT, 'quick-adv-gtel.raw.json'), 'w'), ensure_ascii=False)
json.dump(finalw, open(os.path.join(OUT, 'quick-adv-gtel-worked.raw.json'), 'w'), ensure_ascii=False)
print({s: len(v[:CAP]) for s, v in sorted(by.items())}, 'mcq;', {s: len(v[:WCAP]) for s, v in sorted(byw.items())}, 'worked')
