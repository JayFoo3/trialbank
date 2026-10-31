"""Quick questions: Maths Advanced, every topic other than Sequences and Series (gen_ss.py has that one).
Same rules: random numbers, answers computed here, wrong options from the usual mistakes.
Output: quick_adv2.json  [{step, prompt, options[4], answer, why}]"""
import json, math, random
from fractions import Fraction as F

R = random.Random(20261031 + 7)


def tf(x):
    x = F(x)
    if x.denominator == 1: return str(x.numerator)
    s = '-' if x < 0 else ''
    return f'{s}\\frac{{{abs(x.numerator)}}}{{{x.denominator}}}'


def m(t): return f'\\({t}\\)'


def num(v, dp=None):
    if dp is None: return m(tf(v))
    s = f'{v:,.{dp}f}'.replace(',', '{,}')
    return m(s)


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


# ======================= Working with Functions =======================
for _ in range(80):
    a, b = R.randint(2, 7), R.randint(2, 7)
    addt('wf1', f'Simplify {m(f"x^{{{a}}} \\times x^{{{b}}}")}.', f'x^{{{a + b}}}', [f'x^{{{a * b}}}', f'2x^{{{a + b}}}', f'x^{{{abs(a - b)}}}' if a != b else 'x'], f'Add the powers: {m(f"x^{{{a}+{b}}} = x^{{{a + b}}}")}.')
    k, s = R.choice([2, 3, 5, 6, 7]), R.choice([4, 9, 16, 25, 36])
    addt('wf1', f'Simplify {m(f"\\sqrt{{{k * s}}}")}.', f'{int(s ** .5)}\\sqrt{{{k}}}', [f'{s}\\sqrt{{{k}}}', f'{k}\\sqrt{{{s}}}', f'{int(s ** .5) + 1}\\sqrt{{{k}}}'], m(f'\\sqrt{{{k * s}}} = \\sqrt{{{s}}}\\sqrt{{{k}}} = {int(s ** .5)}\\sqrt{{{k}}}'))
    r1, r2 = R.sample([-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7], 2)
    q = poly([1, -(r1 + r2), r1 * r2])
    sol = lambda x, y: f'x = {min(x, y)} \\text{{ or }} x = {max(x, y)}'
    addt('wf2', f'Solve {m(q + " = 0")}.', sol(r1, r2), [sol(-r1, -r2), sol(r1, -r2) if r1 != -r2 else sol(r1 + 1, r2), sol(r1 * r2, 1) if r1 * r2 not in (1,) else sol(2, 3)],
         f'Factorise: {m(f"({lin(1, -r1)})({lin(1, -r2)}) = 0")}.')
    c = R.randint(-6, 6)
    addt('wf3', f'What is the domain of {m(f"f(x) = \\sqrt{{{lin(1, -c)}}}")}?', f'x \\geq {c}', [f'x > {c}', f'x \\geq {-c}' if c else 'x \\leq 0', 'x \\in \\mathbb{R}'],
         f'You can only take the square root of something that isn\'t negative: {m(f"{lin(1, -c)} \\geq 0")}.')
    addt('wf3', f'What is the domain of {m(f"f(x) = \\frac{{1}}{{{lin(1, -c)}}}")}?', f'x \\neq {c}', [f'x > {c}', f'x \\neq {-c}' if c else 'x > 0', 'x \\in \\mathbb{R}'],
         f'The denominator can\'t be 0: {m(f"x \\neq {c}")}.')
    p, qq, u = R.randint(2, 5), R.randint(-5, 5), R.randint(-3, 4)
    f_ = lambda x: x * x + qq; g_ = lambda x: p * x + 1
    add('wf6', f'If {m(f"f(x) = {poly([1, 0, qq])}")} and {m(f"g(x) = {lin(p, 1)}")}, find {m(f"f(g({u}))")}.', f_(g_(u)), [g_(f_(u)), f_(u) * g_(u), f_(u) + g_(u)],
        f'{m(f"g({u}) = {g_(u)}")}, then {m(f"f({g_(u)}) = {f_(g_(u))}")}.')
    a2, b2 = R.choice([2, 3, 4, 5, -2, -3]), R.randint(-9, 9)
    addt('wf7', f'Find the inverse of {m(f"f(x) = {lin(a2, b2)}")}.', f'f^{{-1}}(x) = \\frac{{{lin(1, -b2)}}}{{{a2}}}', [f'f^{{-1}}(x) = \\frac{{{lin(1, b2)}}}{{{a2}}}', f'f^{{-1}}(x) = {a2}x {"-" if b2 >= 0 else "+"} {abs(b2)}' if b2 else f'f^{{-1}}(x) = {-a2}x', f'f^{{-1}}(x) = \\frac{{1}}{{{lin(a2, b2)}}}'],
         f'Swap {m("x")} and {m("y")}: {m(f"x = {lin(a2, b2, "y")}")}, so {m(f"y = \\frac{{{lin(1, -b2)}}}{{{a2}}}")}.')

# ======================= Graphing techniques =======================
for _ in range(60):
    h, k = R.choice([-4, -3, -2, -1, 1, 2, 3, 4]), R.choice([-5, -3, -2, 2, 3, 5])
    addt('gt1', f'The graph of {m("y = x^2")} is moved {abs(h)} {"right" if h > 0 else "left"} and {abs(k)} {"up" if k > 0 else "down"}. What is its new equation?',
         f'y = (x {"-" if h > 0 else "+"} {abs(h)})^2 {"+" if k > 0 else "-"} {abs(k)}', [f'y = (x {"+" if h > 0 else "-"} {abs(h)})^2 {"+" if k > 0 else "-"} {abs(k)}', f'y = (x {"-" if h > 0 else "+"} {abs(h)})^2 {"-" if k > 0 else "+"} {abs(k)}', f'y = (x {"-" if k > 0 else "+"} {abs(k)})^2 {"+" if h > 0 else "-"} {abs(h)}'],
         f'Moving right by {m("h")} replaces {m("x")} with {m("x - h")}; moving up adds to {m("y")}.')
    a = R.choice([2, 3, 4, 5])
    addt('gt2', f'The point {m("(2, 8)")} is on {m("y = f(x)")}. Which point must be on {m(f"y = f({a}x)")}?', f'\\left({tf(F(2, a))}, 8\\right)', [f'({2 * a}, 8)', f'(2, {8 * a})', f'\\left(2, {tf(F(8, a))}\\right)'],
         f'{m(f"f({a}x)")} squashes the graph horizontally by a factor of {m(a)}: the {m("x")} values are divided by {m(a)}.')
    addt('gt3', f'The graph of {m("y = f(x)")} passes through {m(f"({a}, {a + 3})")}. Which point is on {m("y = -f(-x)")}?', f'({-a}, {-(a + 3)})', [f'({a}, {-(a + 3)})', f'({-a}, {a + 3})', f'({a + 3}, {a})'],
         f'Reflect in both axes: both coordinates change sign.')

# ======================= Trigonometry and measure of angles =======================
EX = {30: ('\\frac{1}{2}', '\\frac{\\sqrt{3}}{2}', '\\frac{1}{\\sqrt{3}}'), 45: ('\\frac{1}{\\sqrt{2}}', '\\frac{1}{\\sqrt{2}}', '1'), 60: ('\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}', '\\sqrt{3}')}
SIGNS = {1: (1, 1, 1), 2: (1, -1, -1), 3: (-1, -1, 1), 4: (-1, 1, -1)}
for base in (30, 45, 60):
    for quad, ang in ((1, base), (2, 180 - base), (3, 180 + base), (4, 360 - base)):
        for fi, fn in enumerate(('sin', 'cos', 'tan')):
            sg = SIGNS[quad][fi]; v = EX[base][fi]; right = v if sg > 0 else '-' + v
            others = [x for x in set(EX[b][fi] for b in EX) if x != v]
            addt('tm4', f'Find the exact value of {m(f"\\{fn} {ang}^\\circ")}.', right, [('-' + v) if sg > 0 else v] + [o if sg > 0 else '-' + o for o in others],
                 f'{m(f"{ang}^\\circ")} has a reference angle of {m(f"{base}^\\circ")} and is in quadrant {quad}, where {fn} is {"positive" if sg > 0 else "negative"}.')
for _ in range(60):
    r, th = R.randint(3, 15), R.choice([F(1, 6), F(1, 4), F(1, 3), F(1, 2), F(2, 3), F(3, 4), F(5, 6)])
    pi_s = lambda q: ('\\pi' if q == 1 else f'{tf(q)}\\pi') if F(q).denominator == 1 else f'\\frac{{{F(q).numerator if F(q).numerator > 1 else ""}\\pi}}{{{F(q).denominator}}}'
    addt('tm5', f'Find the exact arc length of a sector with radius {m(r)} cm and angle {m(pi_s(th))}.', f'{pi_s(th * r)}\\text{{ cm}}', [f'{pi_s(th * r * r / 2)}\\text{{ cm}}', f'{pi_s(th * r * r)}\\text{{ cm}}', f'{pi_s(th * 2 * r)}\\text{{ cm}}'],
         m(f'l = r\\theta = {r} \\times {pi_s(th)} = {pi_s(th * r)}'))
    addt('tm5', f'Find the exact area of a sector with radius {m(r)} cm and angle {m(pi_s(th))}.', f'{pi_s(th * r * r / 2)}\\text{{ cm}}^2', [f'{pi_s(th * r)}\\text{{ cm}}^2', f'{pi_s(th * r * r)}\\text{{ cm}}^2', f'{pi_s(th * r / 2)}\\text{{ cm}}^2'],
         m(f'A = \\frac{{1}}{{2}}r^2\\theta = \\frac{{1}}{{2}} \\times {r * r} \\times {pi_s(th)} = {pi_s(th * r * r / 2)}'))
    d = R.choice([20, 36, 40, 45, 72, 120, 135, 150, 210, 240, 270, 300])
    q = F(d, 180)
    addt('tm5', f'Convert {m(f"{d}^\\circ")} to radians.', pi_s(q), [pi_s(F(d, 360)), pi_s(F(d, 90)), pi_s(q + F(1, 6))], m(f'{d} \\times \\frac{{\\pi}}{{180}} = {pi_s(q)}'))
    b, c, A = R.randint(4, 12), R.randint(4, 12), R.choice([30, 40, 50, 60, 70, 80, 100, 110, 120])
    a2 = math.sqrt(b * b + c * c - 2 * b * c * math.cos(math.radians(A)))
    add('tm2', f'In a triangle, {m(f"b = {b}")}, {m(f"c = {c}")} and {m(f"A = {A}^\\circ")}. Find {m("a")} to 1 decimal place.', round(a2, 1),
        [round(math.sqrt(b * b + c * c + 2 * b * c * math.cos(math.radians(A))), 1), round(math.sqrt(b * b + c * c), 1), round(math.sqrt(abs(b * b + c * c - b * c * math.cos(math.radians(A)))), 1)],
        f'Cosine rule: {m(f"a^2 = {b}^2 + {c}^2 - 2({b})({c})\\cos {A}^\\circ")}, so {m(f"a \\approx {a2:.1f}")}.', fmt=lambda v: num(v, 1), near=lambda k: round(a2 + 0.3 * k, 1))
    add('tm2', f'Find the area of a triangle with sides {m(b)} and {m(c)} and the angle between them {m(f"{A}^\\circ")}, to 1 decimal place.', round(0.5 * b * c * math.sin(math.radians(A)), 1),
        [round(b * c * math.sin(math.radians(A)), 1), round(0.5 * b * c * math.cos(math.radians(A)), 1), round(0.5 * b * c, 1)],
        m(f'\\frac{{1}}{{2}}({b})({c})\\sin {A}^\\circ \\approx {0.5 * b * c * math.sin(math.radians(A)):.1f}'), fmt=lambda v: num(v, 1), near=lambda k: round(0.5 * b * c * math.sin(math.radians(A)) + k, 1))

# ======================= Trig functions and graphs =======================
for _ in range(60):
    a, b = R.choice([2, 3, 4, 5]), R.choice([2, 3, 4, F(1, 2)])
    fn = R.choice(['sin', 'cos'])
    pi_s = lambda q: ('\\pi' if q == 1 else f'{tf(q)}\\pi') if F(q).denominator == 1 else f'\\frac{{{F(q).numerator if F(q).numerator > 1 else ""}\\pi}}{{{F(q).denominator}}}'
    bb = tf(b) if b != 1 else ''
    addt('tf2', f'What is the period of {m(f"y = {a}\\{fn} {bb}x")}?', pi_s(2 / F(b)), [pi_s(F(b) * 2), pi_s(1 / F(b)), pi_s(2 * a / F(b))], m(f'\\text{{period}} = \\frac{{2\\pi}}{{{tf(b)}}} = {pi_s(2 / F(b))}'))
    add('tf2', f'What is the amplitude of {m(f"y = {a}\\{fn} {bb}x + {a + 1}")}?', a, [2 * a, a + 1, 2 * a + 1], f'The amplitude is the number in front of {m(f"\\{fn}")}: {m(a)}.')
    addt('tf2', f'What is the period of {m(f"y = \\tan {bb}x")}?', pi_s(1 / F(b)), [pi_s(2 / F(b)), pi_s(F(b)), pi_s(1 / (2 * F(b)))], m(f'\\text{{period}} = \\frac{{\\pi}}{{{tf(b)}}} = {pi_s(1 / F(b))}'))

# ======================= Introduction to differentiation =======================
for _ in range(80):
    a, n, k = R.randint(2, 6), R.randint(2, 5), R.randint(-3, 3)
    add('id3', f'If {m(f"f(x) = {a}x^{{{n}}}")}, find {m(f"f\'({k})")}.', a * n * k ** (n - 1), [a * k ** (n - 1), a * n * k ** n, n * k ** (n - 1)], m(f"f'(x) = {a * n}x^{{{n - 1}}}, \\quad f'({k}) = {a * n * k ** (n - 1)}"))
    c1, c2, c3 = R.randint(1, 5), R.randint(-6, 6), R.randint(-9, 9)
    addt('id3', f'Differentiate {m(f"y = {poly([c1, c2, c3, R.randint(-9, 9)])}")}.', poly([3 * c1, 2 * c2, c3]), [poly([c1, c2, c3]), poly([3 * c1, 2 * c2, c3, 1]), poly([3 * c1, c2, c3])],
         f'Bring each power down and lower it by one; the constant disappears.')
    p, q, n2 = R.randint(2, 5), R.randint(-5, 5), R.randint(2, 5)
    addt('id4', f'Differentiate {m(f"y = ({lin(p, q)})^{{{n2}}}")}.', f'{n2 * p}({lin(p, q)})^{{{n2 - 1}}}', [f'{n2}({lin(p, q)})^{{{n2 - 1}}}', f'{n2 * p}({lin(p, q)})^{{{n2}}}', f'{p}({lin(p, q)})^{{{n2 - 1}}}'],
         f'Chain rule: {m(f"{n2}({lin(p, q)})^{{{n2 - 1}}} \\times {p}")}.')
    x0 = R.randint(-3, 3); cs = [1, R.randint(-4, 4), R.randint(-5, 5)]
    fv = lambda x: cs[0] * x * x + cs[1] * x + cs[2]; g = 2 * x0 + cs[1]; c_ = fv(x0) - g * x0
    addt('id5', f'Find the equation of the tangent to {m(f"y = {poly(cs)}")} at {m(f"x = {x0}")}.', f'y = {lin(g, c_)}', [f'y = {lin(g, fv(x0))}', f'y = {lin(-1 / F(g) if g else 1, fv(x0) + (F(x0) / g if g else 0))}' if g else f'y = {fv(x0) + 1}', f'y = {lin(g + 1, c_)}'],
         f'Gradient {m(f"y\' = {lin(2, cs[1])} = {g}")} at {m(f"x = {x0}")}; the point is {m(f"({x0}, {fv(x0)})")}, so {m(f"y - {fv(x0)} = {g}(x - {x0})")}.')

# ======================= Exponentials and logs =======================
for _ in range(80):
    b, n = R.choice([2, 3, 5, 10]), R.randint(2, 5)
    add('el2', f'Evaluate {m(f"\\log_{{{b}}} {b ** n}")}.', n, [b ** (n - 1), n + 1, b * n], m(f'{b}^{{{n}}} = {b ** n}'))
    x, y = R.randint(2, 9), R.randint(2, 9)
    addt('el2', f'Simplify {m(f"\\log_a {x} + \\log_a {y}")}.', f'\\log_a {x * y}', [f'\\log_a {x + y}', f'\\log_a {x} \\times \\log_a {y}', f'\\log_a {tf(F(x, y))}'], f'Adding logs multiplies inside: {m(f"\\log_a ({x} \\times {y})")}.')
    b2, k = R.choice([2, 3, 4, 5]), R.randint(2, 4)
    add('el3', f'Solve {m(f"{b2}^{{x + 1}} = {b2 ** k}")}.', k - 1, [k, k + 1, b2 ** k - 1], m(f'{b2}^{{x+1}} = {b2}^{{{k}}} \\Rightarrow x + 1 = {k} \\Rightarrow x = {k - 1}'))
    a, c = R.randint(2, 6), R.randint(1, 5)
    addt('el5', f'Differentiate {m(f"y = e^{{{a}x}}")}.', f'{a}e^{{{a}x}}', [f'e^{{{a}x}}', f'{a}xe^{{{a}x - 1}}', f'\\frac{{e^{{{a}x}}}}{{{a}}}'], m(f"\\frac{{d}}{{dx}}e^{{kx}} = ke^{{kx}}"))
    addt('el5', f'Differentiate {m(f"y = \\ln({lin(a, c)})")}.', f'\\frac{{{a}}}{{{lin(a, c)}}}', [f'\\frac{{1}}{{{lin(a, c)}}}', f'{a}\\ln({lin(a, c)})', f'\\frac{{{lin(a, c)}}}{{{a}}}'], m(f"\\frac{{d}}{{dx}}\\ln f(x) = \\frac{{f'(x)}}{{f(x)}}"))
    P, r, t = R.choice([200, 500, 1000, 2500]), R.choice([0.02, 0.05, 0.1, 0.15]), R.randint(2, 10)
    v = P * math.exp(r * t)
    add('el6', f'A population grows as {m(f"P = {P}e^{{{r:g}t}}")}. Find {m("P")} when {m(f"t = {t}")}, to the nearest whole number.', round(v), [round(P * math.exp(r * (t - 1))), round(P * (1 + r) ** t), round(P * r * t + P)],
        m(f'{P}e^{{{r:g} \\times {t}}} \\approx {round(v):,}'.replace(',', '{,}')), fmt=lambda x: m(f'{x:,}'.replace(',', '{,}')), near=lambda k: round(v) + 3 * k)

# ======================= Differential calculus (trig) =======================
for _ in range(50):
    a = R.randint(2, 6); fn = R.choice(['sin', 'cos'])
    right = f'{a}\\cos {a}x' if fn == 'sin' else f'-{a}\\sin {a}x'
    wrong = [f'\\cos {a}x' if fn == 'sin' else f'-\\sin {a}x', f'-{a}\\cos {a}x' if fn == 'sin' else f'{a}\\sin {a}x', f'{a}\\cos x' if fn == 'sin' else f'-{a}\\sin x']
    addt('dc1', f'Differentiate {m(f"y = \\{fn} {a}x")}.', right, wrong, f'Chain rule: the derivative of {m(f"\\{fn} u")} is {m("\\cos u" if fn == "sin" else "-\\sin u")} times {m(f"u\' = {a}")}.')
    addt('dc1', f'Differentiate {m(f"y = \\tan {a}x")}.', f'{a}\\sec^2 {a}x', [f'\\sec^2 {a}x', f'{a}\\tan^2 {a}x', f'-{a}\\sec^2 {a}x'], m(f'\\frac{{d}}{{dx}}\\tan {a}x = {a}\\sec^2 {a}x'))
    n = R.randint(2, 5)
    addt('dc2', f'Differentiate {m(f"y = x^{{{n}}}e^x")}.', f'x^{{{n - 1}}}e^x({lin(1, n)})', [f'{n}x^{{{n - 1}}}e^x', f'x^{{{n}}}e^x', f'x^{{{n - 1}}}e^x(x - {n})'], f'Product rule: {m(f"{n}x^{{{n - 1}}}e^x + x^{{{n}}}e^x = x^{{{n - 1}}}e^x(x + {n})")}.')
    c = R.randint(2, 5)
    add('dc3', f'If {m(f"y = x^{{{c + 1}}}")}, find {m("\\frac{d^2y}{dx^2}")} when {m("x = 1")}.', (c + 1) * c, [c + 1, (c + 1) * (c + 2), c * (c - 1)], m(f"y'' = {(c + 1) * c}x^{{{c - 1}}}"))

# ======================= Applications of differentiation =======================
for _ in range(80):
    r1, r2 = sorted(R.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 2))
    # y = x^3/3 - (r1+r2)x^2/2 + r1 r2 x : stationary at r1, r2
    s = r1 + r2; p = r1 * r2
    addt('ad1', f'Find the {m("x")} values of the stationary points of {m(f"y = {poly([F(1, 3), F(-s, 2), p, 0])}")}.', f'x = {r1} \\text{{ and }} x = {r2}', [f'x = {-r1} \\text{{ and }} x = {-r2}' if r1 != -r2 else f'x = {r1 + 1} \\text{{ and }} x = {r2 + 1}', f'x = {min(0, s)} \\text{{ and }} x = {max(0, s)}' if s not in (0, r1, r2) else f'x = {r2} \\text{{ only}}', f'x = {r1} \\text{{ only}}'],
         f'{m(f"y\' = {poly([1, -s, p])} = (x - {r1})(x - {r2})".replace("- -", "+ "))} = 0.')
    c = R.randint(-6, 6)
    add('ad2', f'Find the {m("x")} value of the point of inflection of {m(f"y = {poly([1, -3 * c, R.randint(-5, 5), R.randint(-5, 5)])}")}.', c, [-c, 3 * c, 2 * c], f'{m(f"y\'\' = 6x - {6 * c}")} is 0 at {m(f"x = {c}")} and changes sign there.'.replace('- -', '+ '))
    P = R.choice([20, 24, 30, 36, 40, 48, 60, 80, 100])
    add('ad5', f'A rectangle has perimeter {m(P)} m. What is its greatest possible area?', F(P * P, 16), [F(P * P, 4), F(P * P, 8), F(P, 4)], f'{m(f"A = x\\left({tf(F(P, 2))} - x\\right)")} is greatest at {m(f"x = {tf(F(P, 4))}")}: a square, area {m(tf(F(P * P, 16)))} m².', fmt=lambda v: m(tf(v) + '\\text{ m}^2'))
    a, b = R.randint(1, 4), R.randint(-6, 6); t = R.randint(1, 5)
    add('ad6', f'A particle\'s displacement is {m(f"x = {poly([a, b, R.randint(-9, 9)], "t")}")}. Find its velocity at {m(f"t = {t}")}.', 2 * a * t + b, [a * t * t + b * t, 2 * a, 2 * a * t], m(f'v = \\frac{{dx}}{{dt}} = {lin(2 * a, b, "t")} = {2 * a * t + b}'))

# ======================= Integral calculus =======================
for _ in range(80):
    a, n = R.randint(1, 6), R.randint(1, 4)
    addt('ic1', f'Find {m(f"\\int {a}x^{{{n}}}\\,dx")}.', f'{tf(F(a, n + 1))}x^{{{n + 1}}} + C' if F(a, n + 1) != 1 else f'x^{{{n + 1}}} + C', [f'{a * n}x^{{{n - 1}}} + C', f'{a}x^{{{n + 1}}} + C', f'{tf(F(a, n))}x^{{{n + 1}}} + C'],
         f'Raise the power by one and divide by the new power.')
    lo, hi = R.randint(0, 2), R.randint(3, 5); c1, c0 = R.randint(1, 4), R.randint(-3, 5)
    Fn = lambda x: F(c1, 2) * x * x + c0 * x; val = Fn(hi) - Fn(lo)
    add('ic3', f'Evaluate {m(f"\\int_{{{lo}}}^{{{hi}}} ({lin(c1, c0)})\\,dx")}.', val, [Fn(hi), c1 * hi + c0 - (c1 * lo + c0), Fn(hi) + Fn(lo)], m(f'\\left[{poly([F(c1, 2), c0, 0])}\\right]_{{{lo}}}^{{{hi}}} = {tf(Fn(hi))} - {tf(Fn(lo))} = {tf(val)}'))
    k = R.randint(2, 5)
    addt('ic2', f'Find {m(f"\\int e^{{{k}x}}\\,dx")}.', f'\\frac{{1}}{{{k}}}e^{{{k}x}} + C', [f'{k}e^{{{k}x}} + C', f'e^{{{k}x}} + C', f'\\frac{{e^{{{k}x + 1}}}}{{{k}x + 1}} + C'], m(f'\\int e^{{kx}}\\,dx = \\frac{{1}}{{k}}e^{{kx}} + C'))
    addt('ic2', f'Find {m(f"\\int \\cos {k}x\\,dx")}.', f'\\frac{{1}}{{{k}}}\\sin {k}x + C', [f'{k}\\sin {k}x + C', f'-\\frac{{1}}{{{k}}}\\sin {k}x + C', f'\\sin {k}x + C'], m(f'\\int \\cos kx\\,dx = \\frac{{1}}{{k}}\\sin kx + C'))
    addt('ic2', f'Find {m(f"\\int \\frac{{{k}}}{{x}}\\,dx")}.', f'{k}\\ln |x| + C', [f'\\frac{{{k}}}{{x^2}} + C', f'\\ln |{k}x| + C', f'-\\frac{{{k}}}{{x^2}} + C'], m(f'\\int \\frac{{1}}{{x}}\\,dx = \\ln|x| + C'))
    hh = R.choice([1, 2]); ys = [R.randint(1, 9) for _ in range(3)]
    tr = F(hh, 2) * (ys[0] + 2 * ys[1] + ys[2])
    add('ic5', f'Use the trapezoidal rule with the function values {m(f"{ys[0]}, {ys[1]}, {ys[2]}")} at {m(f"x = 0, {hh}, {2 * hh}")} to estimate {m(f"\\int_0^{{{2 * hh}}} f(x)\\,dx")}.', tr,
        [F(hh, 2) * sum(ys), hh * (ys[0] + 2 * ys[1] + ys[2]), hh * sum(ys)], m(f'\\frac{{{hh}}}{{2}}\\left[{ys[0]} + 2({ys[1]}) + {ys[2]}\\right] = {tf(tr)}'))
    a2 = R.randint(1, 4)
    add('ic4', f'Find the area between {m(f"y = x^2")} and the {m("x")}-axis from {m("x = 0")} to {m(f"x = {a2 + 1}")}.', F((a2 + 1) ** 3, 3), [F((a2 + 1) ** 2, 2), (a2 + 1) ** 3, F((a2 + 1) ** 3, 2)], m(f'\\int_0^{{{a2 + 1}}} x^2\\,dx = \\frac{{{a2 + 1}^3}}{{3}} = {tf(F((a2 + 1) ** 3, 3))}'), fmt=lambda v: m(tf(v) + '\\text{ units}^2'))

# ======================= Financial mathematics =======================
for _ in range(50):
    P, r, n = R.choice([1000, 2000, 5000, 8000, 10000]), R.choice([2, 3, 4, 5, 6]), R.randint(2, 8)
    v = P * (1 + r / 100) ** n
    add('fm1', f'{m(f"\\${P:,}".replace(",", "{,}"))} is invested at {r}% p.a. compounded yearly. What is it worth after {n} years, to the nearest cent?', round(v, 2), [round(P * (1 + r * n / 100), 2), round(P * (1 + r / 100) ** (n - 1), 2), round(P * (r / 100) ** n + P, 2)],
        m(f'{P}(1.{r:02d})^{{{n}}} \\approx {v:,.2f}'.replace(',', '{,}')), fmt=lambda x: m(f'\\${x:,.2f}'.replace(',', '{,}')), near=lambda k: round(v + 5 * k, 2))
    add('fm1', f'{m(f"\\${P:,}".replace(",", "{,}"))} earns {r}% p.a. simple interest. How much interest is earned in {n} years?', P * r * n // 100 if P * r * n % 100 == 0 else F(P * r * n, 100), [round(v - P, 2), P * r // 100, P + P * r * n // 100],
        m(f'I = Prn = {P} \\times 0.{r:02d} \\times {n}'), fmt=lambda x: m(f'\\${float(x):,.2f}'.replace(',', '{,}')))
    PV = P * 10; rr = R.choice([4, 5, 6, 8]); nn = R.randint(3, 6)
    M = PV * (rr / 100) * (1 + rr / 100) ** nn / ((1 + rr / 100) ** nn - 1)
    add('fm3', f'A loan of {m(f"\\${PV:,}".replace(",", "{,}"))} at {rr}% p.a. is repaid with {nn} equal yearly payments. Find the payment, to the nearest dollar.', round(M), [round(PV / nn), round(PV * (1 + rr / 100) ** nn / nn), round(PV * rr / 100)],
        f'{m(f"M = \\frac{{Pr(1+r)^n}}{{(1+r)^n - 1}}")} with {m(f"P = {PV}")}, {m(f"r = {rr / 100:g}")}, {m(f"n = {nn}")}: about {m(f"\\${round(M):,}".replace(",", "{,}"))}.', fmt=lambda x: m(f'\\${x:,}'.replace(',', '{,}')), near=lambda k: round(M) + 25 * k)

# ======================= Probability =======================
for _ in range(80):
    pa, pb, pab = R.choice([F(1, 2), F(2, 5), F(3, 5), F(1, 3), F(3, 10), F(7, 10)]), R.choice([F(1, 4), F(1, 2), F(2, 5), F(1, 5), F(3, 10)]), None
    pab = min(pa, pb) * R.choice([F(1, 2), F(1, 3), F(2, 3)])
    add('pr2', f'{m(f"P(A) = {tf(pa)}")}, {m(f"P(B) = {tf(pb)}")} and {m(f"P(A \\cap B) = {tf(pab)}")}. Find {m("P(A \\cup B)")}.', pa + pb - pab, [pa + pb, pa * pb, pa + pb - 2 * pab], m(f'P(A) + P(B) - P(A \\cap B) = {tf(pa + pb - pab)}'))
    add('pr4', f'{m(f"P(B) = {tf(pb)}")} and {m(f"P(A \\cap B) = {tf(pab)}")}. Find {m("P(A \\mid B)")}.', pab / pb, [pab * pb, pab / pa, pb / pab if pb / pab <= 1 else 1 - pab / pb], m(f'P(A \\mid B) = \\frac{{P(A \\cap B)}}{{P(B)}} = {tf(pab / pb)}'))
    r_, b_ = R.randint(2, 7), R.randint(2, 7); N = r_ + b_
    p = F(r_ * (r_ - 1), N * (N - 1))
    add('pr3', f'A bag has {r_} red and {b_} blue marbles. Two are drawn without replacement. Find the probability both are red.', p, [F(r_ * r_, N * N), F(r_, N), F(r_ * (r_ - 1), N * N)], m(f'\\frac{{{r_}}}{{{N}}} \\times \\frac{{{r_ - 1}}}{{{N - 1}}} = {tf(p)}'))
    add('pr3', f'A bag has {r_} red and {b_} blue marbles. Two are drawn with replacement. Find the probability they are different colours.', F(2 * r_ * b_, N * N), [F(r_ * b_, N * N), F(2 * r_ * b_, N * (N - 1)), F(r_ * r_ + b_ * b_, N * N)], m(f'2 \\times \\frac{{{r_}}}{{{N}}} \\times \\frac{{{b_}}}{{{N}}} = {tf(F(2 * r_ * b_, N * N))}'))
    d = R.randint(2, 6)
    add('pr1', f'Two fair dice are rolled. What is the probability their sum is {m(d + 5)}?', F(6 - abs(d + 5 - 7), 36), [F(1, 6), F(6 - abs(d + 5 - 7), 12), F(1, 11)], f'{6 - abs(d + 5 - 7)} of the 36 equally likely outcomes add to {d + 5}.')

# ======================= Discrete probability distributions =======================
for _ in range(60):
    xs = sorted(R.sample(range(0, 6), 3))
    ps = R.choice([[F(1, 5), F(1, 2), F(3, 10)], [F(1, 4), F(1, 4), F(1, 2)], [F(1, 10), F(3, 5), F(3, 10)], [F(2, 5), F(2, 5), F(1, 5)]])
    E = sum(x * p for x, p in zip(xs, ps)); E2 = sum(x * x * p for x, p in zip(xs, ps)); V = E2 - E * E
    tab = ',\\ '.join(f'P(X={x})={tf(p)}' for x, p in zip(xs, ps))
    add('dp2', f'A random variable has {m(tab)}. Find {m("E(X)")}.', E, [F(sum(xs), 3), E2, E + 1], m(f'E(X) = \\sum x\\,P(x) = {tf(E)}'))
    add('dp3', f'A random variable has {m(tab)}. Find {m("\\text{Var}(X)")}.', V, [E2, E2 - E, V + E], m(f'E(X^2) - [E(X)]^2 = {tf(E2)} - ({tf(E)})^2 = {tf(V)}'))
for n in range(3, 8):
    s = n * (n + 1) // 2
    add('dp1', f'{m("P(X = x) = kx")} for {m(f"x = 1, 2, \\dots, {n}")}. Find {m("k")}.', F(1, s), [F(1, n), F(1, s + n), F(2, s)], f'The probabilities add to 1: {m(f"k(1 + 2 + \\dots + {n}) = {s}k = 1")}.')

# ======================= Descriptive statistics =======================
for _ in range(60):
    data = sorted(R.choices(range(1, 20), k=R.choice([5, 7, 9])))
    n = len(data); med = data[n // 2]; mean = F(sum(data), n)
    ds = ',\\ '.join(map(str, R.sample(data, n)))
    add('ds2', f'Find the median of {m(ds)}.', med, [mean if mean.denominator == 1 and mean != med else med + 1, data[n // 2 - 1] if data[n // 2 - 1] != med else med - 2, data[0] + data[-1] if data[0] + data[-1] != med else med + 3], f'In order: {m(",\\ ".join(map(str, data)))}. The middle value is {m(med)}.')
    add('ds2', f'Find the mean of {m(ds)}.', mean, [med if med != mean else mean + 1, F(sum(data), n - 1), F(data[0] + data[-1], 2) if F(data[0] + data[-1], 2) != mean else mean - 1], m(f'\\frac{{{sum(data)}}}{{{n}}} = {tf(mean)}'))
    add('ds2', f'Find the range of {m(ds)}.', data[-1] - data[0], [data[-1], data[-1] - data[1], n], m(f'{data[-1]} - {data[0]} = {data[-1] - data[0]}'))

# ======================= Normal distribution =======================
for _ in range(60):
    mu, sd = R.choice([50, 60, 65, 70, 75, 100, 170]), R.choice([2, 4, 5, 8, 10, 12, 15])
    z = R.choice([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5])
    x = mu + z * sd
    add('nd2', f'Scores have mean {m(mu)} and standard deviation {m(sd)}. Find the z-score of {m(f"{x:g}")}.', z, [-z, z * 2, (x - mu) * sd], m(f'z = \\frac{{{x:g} - {mu}}}{{{sd}}} = {z:g}'), fmt=lambda v: m(f'{v:g}'), near=lambda k: z + 0.25 * k)
    k = R.choice([1, 2, 3]); pct = {1: 68, 2: 95, 3: 99.7}[k]
    add('nd1', f'Heights are normally distributed with mean {m(mu)} and standard deviation {m(sd)}. About what percentage lie between {m(mu - k * sd)} and {m(mu + k * sd)}?', pct, [{1: 34, 2: 47.5, 3: 49.85}[k], {1: 95, 2: 68, 3: 95}[k], {1: 50, 2: 99.7, 3: 68}[k]],
        f'That is within {k} standard deviation{"s" if k > 1 else ""} of the mean: about {pct}%.', fmt=lambda v: m(f'{v:g}\\%'))
    add('nd1', f'Heights are normally distributed with mean {m(mu)} and standard deviation {m(sd)}. About what percentage are above {m(mu + sd)}?', 16, [32, 34, 2.5], 'About 68% are within one standard deviation, so 32% are outside, half of that above: 16%.', fmt=lambda v: m(f'{v:g}\\%'))

by = {}
for q in OUT: by.setdefault(q['step'], []).append(q)
final = []
for s in sorted(by):
    R.shuffle(by[s]); final += by[s][:36]
json.dump(final, open('quick_adv2.json', 'w'), indent=1)
print({s: min(len(v), 36) for s, v in sorted(by.items())}, 'total', len(final))
