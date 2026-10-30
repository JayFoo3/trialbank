"""Quick questions: Maths Extension 1 (Proof Induction, Binomial Expansion, Perms/Combs, Remainder and Factor Theorems,
Sums and Products of Roots, Inverse Trig Functions). Same rules as gen_ss.py: numbers are random, every answer is computed,
wrong options come from the usual mistakes, and checks below re-verify each computed answer by brute force where it can.
Output: quick_ext1.json  [{step, prompt, options[4], answer 'A'-'D', why}]"""
import json, math, random
from fractions import Fraction as F
from itertools import permutations
from math import comb, factorial, gcd

R = random.Random(20261031)


def tf(x):
    x = F(x)
    if x.denominator == 1: return str(x.numerator)
    s = '-' if x < 0 else ''
    return f'{s}\\frac{{{abs(x.numerator)}}}{{{x.denominator}}}'


def m(t): return f'\\({t}\\)'


def poly(cs, v='x'):
    """coefficients high to low -> TeX polynomial"""
    n, out = len(cs) - 1, ''
    for i, c in enumerate(cs):
        c = F(c); p = n - i
        if c == 0: continue
        sign = '-' if c < 0 else '+'
        a = abs(c)
        body = ('' if a == 1 and p else tf(a)) + (f'{v}^{{{p}}}' if p > 1 else v if p == 1 else '')
        out += (('-' if sign == '-' else '') if not out else f' {sign} ') + body
    return out or '0'


def pifrac(q):
    """a multiple of pi as TeX"""
    q = F(q)
    if q == 0: return '0'
    s = '-' if q < 0 else ''; q = abs(q)
    top = '\\pi' if q.numerator == 1 else f'{q.numerator}\\pi'
    return s + (top if q.denominator == 1 else f'\\frac{{{top}}}{{{q.denominator}}}')


OUT, SEEN = [], set()


def add(step, prompt, right, wrong, why, fmt=lambda v: m(tf(v)), near=None):
    opts, keys = [fmt(right)], {fmt(right)}
    for w in wrong:
        f = fmt(w)
        if f not in keys and len(opts) < 4: opts.append(f); keys.add(f)
    near = near or (lambda k: right + k)
    k = 1
    while len(opts) < 4:
        for c in (near(k), near(-k)):
            if c is None: return   # no sensible extra wrong answer: drop the question
            f = fmt(c)
            if f not in keys and len(opts) < 4: opts.append(f); keys.add(f)
        k += 1
        if k > 40: return
    if prompt in SEEN: return
    SEEN.add(prompt)
    order = list(range(4)); R.shuffle(order)
    why = why.replace('+ -', '- ').replace('x^{1}', 'x')
    prompt = prompt.replace('x^{1}', 'x')
    OUT.append(dict(step=step, prompt=prompt, options=[opts[i] for i in order], answer='ABCD'[order.index(0)], why=why))


def addt(step, prompt, right, wrong, why):
    """options that are already TeX strings"""
    add(step, prompt, right, wrong, why, fmt=lambda s: m(s), near=lambda k: None)


# =============== Proof by induction ===============
# (LHS, term tex at k / k+1 / k+2, RHS tex at k / k+1 / k+2, term(n), rhs(n))
SER = [
    ('1 + 2 + 3 + \\dots + n', ['k', '(k+1)', '(k+2)'], ['\\frac{k(k+1)}{2}', '\\frac{(k+1)(k+2)}{2}', '\\frac{(k+2)(k+3)}{2}'], lambda r: r, lambda n: F(n * (n + 1), 2), '\\frac{n(n+1)}{2}'),
    ('1 + 3 + 5 + \\dots + (2n-1)', ['(2k-1)', '(2k+1)', '(2k+3)'], ['k^2', '(k+1)^2', '(k+2)^2'], lambda r: 2 * r - 1, lambda n: n * n, 'n^2'),
    ('1^2 + 2^2 + \\dots + n^2', ['k^2', '(k+1)^2', '(k+2)^2'], ['\\frac{k(k+1)(2k+1)}{6}', '\\frac{(k+1)(k+2)(2k+3)}{6}', '\\frac{(k+2)(k+3)(2k+5)}{6}'], lambda r: r * r, lambda n: F(n * (n + 1) * (2 * n + 1), 6), '\\frac{n(n+1)(2n+1)}{6}'),
    ('1^3 + 2^3 + \\dots + n^3', ['k^3', '(k+1)^3', '(k+2)^3'], ['\\frac{k^2(k+1)^2}{4}', '\\frac{(k+1)^2(k+2)^2}{4}', '\\frac{(k+2)^2(k+3)^2}{4}'], lambda r: r ** 3, lambda n: F(n * n * (n + 1) ** 2, 4), '\\frac{n^2(n+1)^2}{4}'),
    ('1 \\times 2 + 2 \\times 3 + \\dots + n(n+1)', ['k(k+1)', '(k+1)(k+2)', '(k+2)(k+3)'], ['\\frac{k(k+1)(k+2)}{3}', '\\frac{(k+1)(k+2)(k+3)}{3}', '\\frac{(k+2)(k+3)(k+4)}{3}'], lambda r: r * (r + 1), lambda n: F(n * (n + 1) * (n + 2), 3), '\\frac{n(n+1)(n+2)}{3}'),
    ('1 + 2 + 4 + \\dots + 2^{n-1}', ['2^{k-1}', '2^{k}', '2^{k+1}'], ['2^k - 1', '2^{k+1} - 1', '2^{k+2} - 1'], lambda r: 2 ** (r - 1), lambda n: 2 ** n - 1, '2^n - 1'),
    ('\\frac{1}{1 \\times 2} + \\frac{1}{2 \\times 3} + \\dots + \\frac{1}{n(n+1)}', ['\\frac{1}{k(k+1)}', '\\frac{1}{(k+1)(k+2)}', '\\frac{1}{(k+2)(k+3)}'], ['\\frac{k}{k+1}', '\\frac{k+1}{k+2}', '\\frac{k+2}{k+3}'], lambda r: F(1, r * (r + 1)), lambda n: F(n, n + 1), '\\frac{n}{n+1}'),
    ('2 + 6 + 10 + \\dots + (4n-2)', ['(4k-2)', '(4k+2)', '(4k+6)'], ['2k^2', '2(k+1)^2', '2(k+2)^2'], lambda r: 4 * r - 2, lambda n: 2 * n * n, '2n^2'),
    ('3 + 9 + 27 + \\dots + 3^n', ['3^{k}', '3^{k+1}', '3^{k+2}'], ['\\frac{3(3^k - 1)}{2}', '\\frac{3(3^{k+1} - 1)}{2}', '\\frac{3(3^{k+2} - 1)}{2}'], lambda r: 3 ** r, lambda n: F(3 * (3 ** n - 1), 2), '\\frac{3(3^n - 1)}{2}'),
    ('1 \\times 1! + 2 \\times 2! + \\dots + n \\times n!', ['k \\times k!', '(k+1)(k+1)!', '(k+2)(k+2)!'], ['(k+1)! - 1', '(k+2)! - 1', '(k+3)! - 1'], lambda r: r * factorial(r), lambda n: factorial(n + 1) - 1, '(n+1)! - 1'),
    ('1 \\times 3 + 2 \\times 4 + \\dots + n(n+2)', ['k(k+2)', '(k+1)(k+3)', '(k+2)(k+4)'], ['\\frac{k(k+1)(2k+7)}{6}', '\\frac{(k+1)(k+2)(2k+9)}{6}', '\\frac{(k+2)(k+3)(2k+11)}{6}'], lambda r: r * (r + 2), lambda n: F(n * (n + 1) * (2 * n + 7), 6), '\\frac{n(n+1)(2n+7)}{6}'),
]
for lhs, T, S, term, rhs, rn in SER:
    for n in range(1, 13): assert sum(F(term(r)) for r in range(1, n + 1)) == rhs(n), lhs   # the formulas really are true
    claim = f'{m(f"{lhs} = {rn}")}'
    add('pi1', f'To prove {claim} by induction, you assume it is true for {m("n = k")}. Which term is added to go from {m("n = k")} to {m("n = k + 1")}?',
        T[1], [T[0], T[2], S[1]], f'The {m("(k+1)")}th term is the general term with {m("n = k + 1")}: {m(T[1])}.', fmt=m, near=lambda k: None)
    add('pi1', f'In proving {claim} by induction, what must the left side equal for {m("n = k + 1")}?',
        S[1], [S[0], S[2], f'{S[0]} + {T[1]}' if '+' not in S[0] else S[2].replace('2', '3', 1)],
        f'Replace {m("n")} with {m("k + 1")} in the right side: {m(S[1])}.', fmt=m, near=lambda k: None)
    add('pi1', f'Proving {claim} by induction: after using the assumption for {m("n = k")}, the left side for {m("n = k + 1")} becomes',
        f'{S[0]} + {T[1]}', [f'{S[1]} + {T[1]}', f'{S[0]} + {T[0]}', f'{S[0]} + {T[2]}'],
        f'The sum up to {m("k")} terms is {m(S[0])} by the assumption, then add the next term {m(T[1])}.', fmt=m, near=lambda k: None)
    n = R.randint(3, 6)
    v = rhs(n)
    add('pi1', f'Check {claim} for {m(f"n = {n}")}. Both sides equal',
        v, [rhs(n - 1), rhs(n + 1), F(term(n))], f'Adding the first {n} terms gives {m(tf(v))}, and putting {m(f"n = {n}")} in {m(rn)} gives {m(tf(v))} too.')

# divisibility
for a in range(3, 14):
    d = a - 1
    wr = [w for w in (a, a + 1, d + 1, 2 * d, a + 2, d - 1) if w > 1 and d % w]
    add('pi2', f'Which number divides {m(f"{a}^n - 1")} for every positive integer {m("n")}?', d, wr,
        f'When {m("n = 1")}, {m(f"{a}^1 - 1 = {d}")}, and the induction step keeps a factor of {m(d)}: {m(f"{a}^{{k+1}} - 1 = {a}({a}^k - 1) + {d}")}.')
    add('pi2', f'Proving {m(f"{a}^n - 1")} is divisible by {m(d)}: assume {m(f"{a}^k - 1 = {d}M")} for an integer {m("M")}. Then {m(f"{a}^{{k+1}} - 1")} equals',
        f'{a * d}M + {d}', [f'{a * d}M + 1', f'{d}M + {d}', f'{a}M + {d}'],
        m(f'{a}^{{k+1}} - 1 = {a}({d}M + 1) - 1 = {a * d}M + {d} = {d}({a}M + 1)'), fmt=m, near=lambda k: None)
for a in range(3, 12):
    for c in range(1, 14):
        d = gcd(a - 1, a + c)
        if d < 3 or (a + c) % d: continue
        for n in range(1, 8): assert (a ** n + c) % d == 0
        add('pi2', f'Proving {m(f"{a}^n + {c}")} is divisible by {m(d)}: assume {m(f"{a}^k + {c} = {d}M")}. Then {m(f"{a}^{{k+1}} + {c}")} equals',
            f'{a * d}M - {c * (a - 1)}', [f'{a * d}M + {c * (a - 1)}', f'{d}M - {c * (a - 1)}', f'{a * d}M - {c}'],
            m(f'{a}^{{k+1}} + {c} = {a}({d}M - {c}) + {c} = {a * d}M - {a * c} + {c} = {a * d}M - {c * (a - 1)}') + f', and {m(c * (a - 1))} is a multiple of {m(d)}.', fmt=m, near=lambda k: None)
POLYS = [('n^3 - n', 6, '3k^2 + 3k', lambda n: n ** 3 - n), ('n^3 + 2n', 3, '3k^2 + 3k + 3', lambda n: n ** 3 + 2 * n), ('n^3 + 5n', 6, '3k^2 + 3k + 6', lambda n: n ** 3 + 5 * n),
         ('n^3 + 11n', 6, '3k^2 + 3k + 12', lambda n: n ** 3 + 11 * n), ('2n^3 + 3n^2 + n', 6, '6k^2 + 12k + 6', lambda n: 2 * n ** 3 + 3 * n * n + n),
         ('n^5 - n', 5, '5k^4 + 10k^3 + 10k^2 + 5k', lambda n: n ** 5 - n), ('n^3 + 3n^2 + 2n', 6, '3k^2 + 9k + 6', lambda n: n ** 3 + 3 * n * n + 2 * n)]
for e, d, diff, f in POLYS:
    for n in range(1, 10): assert f(n) % d == 0
    wr = [w for w in (d + 1, 2 * d, 4, 5, 7, 9) if w != d and any(f(n) % w for n in range(1, 10))]
    add('pi2', f'What is the largest whole number that divides {m(e)} for every positive integer {m("n")}?', d, wr,
        f'{m(f"n = 1, 2, 3")} give {m(f"{f(1)}, {f(2)}, {f(3)}")}, and induction proves {m(d)} always divides it.')
    k = 'k'; fk = e.replace('n', '(k+1)')
    alt = diff.replace('3k + ', '3k + 1 + ', 1) if '3k + ' in diff else diff + ' + 1'
    add('pi2', f'For {m(f"f(n) = {e}")}, which expression is {m("f(k+1) - f(k)")}?', diff, [alt, diff.replace('k^2', 'k', 1), diff.split(' + ')[0]],
        f'Expand {m(f"f(k+1)")} and subtract {m("f(k)")}: {m(diff)}. Every term is a multiple of {m(d)}, so if {m(d)} divides {m("f(k)")} it divides {m("f(k+1)")}.', fmt=m, near=lambda k: None)

# inequalities
for a in (2, 3, 4, 5):
    for b in range(1, 7):
        for c in range(0, 6):
            n0 = next(n for n in range(1, 60) if all(a ** j > b * j + c for j in range(n, 60)))
            if n0 < 2 or (a, b, c) in SEEN: continue
            add('pi3', f'In proving {m(f"{a}^n > {b}n + {c}")} by induction, you assume {m(f"{a}^k > {b}k + {c}")}. This gives {m(f"{a}^{{k+1}} >")}',
                f'{a * b}k + {a * c}', [f'{b}k + {b + c}', f'{a * b}k + {c}', f'{b}k + {a * c}'],
                m(f'{a}^{{k+1}} = {a} \\times {a}^k > {a}({b}k + {c}) = {a * b}k + {a * c}') + f', which is more than {m(f"{b}(k+1) + {c}")} for {m("k \\geq 1")}.', fmt=m, near=lambda k: None)
for a, p in ((2, 1), (2, 2), (2, 3), (3, 1), (3, 5), (3, 10), (2, 5)):
    n0 = next(n for n in range(1, 80) if all(a ** j > p * j * j for j in range(n, 80)))
    add('pi3', f'What is the smallest positive integer {m("N")} so that {m(f"{a}^n > {"" if p == 1 else p}n^2")} for every {m("n \\geq N")}?', n0, [n0 - 1, n0 + 1, n0 + 2],
        f'Checking: {m(f"n = {n0 - 1}")} gives {m(f"{a ** (n0 - 1)} \\leq {p * (n0 - 1) ** 2}")}, but from {m(f"n = {n0}")} on, {m(f"{a}^n")} stays bigger.')
for a in (2, 3, 4, 5, 6):
    n0 = next(n for n in range(1, 40) if all(factorial(j) > a ** j for j in range(n, 40)))
    add('pi3', f'What is the smallest positive integer {m("N")} so that {m(f"n! > {a}^n")} for every {m("n \\geq N")}?', n0, [n0 - 1, n0 + 1, a + 1 if a + 1 != n0 else n0 + 2],
        f'{m(f"{n0 - 1}! = {factorial(n0 - 1)}")} is not more than {m(f"{a}^{{{n0 - 1}}} = {a ** (n0 - 1)}")}, but {m(f"{n0}! = {factorial(n0)} > {a ** n0}")}, and each step multiplies the left side by more than {m(a)}.')
for r, s, p in [(2, 1, 1), (2, 3, 1), (3, 2, 1), (3, 4, 2), (2, 5, 3), (4, 3, 1), (5, 4, 2), (3, 6, 1), (2, 1, 3), (4, 6, 2)]:
    if s % (r - 1): continue
    B = F(s, r - 1); A = p + B
    T = [p]
    for _ in range(6): T.append(r * T[-1] + s)
    assert all(A * r ** (n - 1) - B == T[n - 1] for n in range(1, 7))
    def ex(A_, e, sgn): return f'{tf(A_) if A_ != 1 else ""}{"\\times " if A_ != 1 else ""}{r}^{{{e}}} {sgn} {tf(B)}'
    add('pi3', f'A sequence has {m(f"T_1 = {p}")} and {m(f"T_{{n+1}} = {r}T_n + {s}")}. Which formula can be proved by induction?',
        ex(A, 'n-1', '-'), [ex(A, 'n', '-'), ex(A, 'n-1', '+'), ex(p, 'n-1', '-')],
        f'Check: {m(f"T_1 = {p}")}, and if {m(f"T_k = {ex(A, "k-1", "-")}")} then {m(f"{r}T_k + {s} = {ex(A, "k", "-")}")}, which is the formula at {m("n = k + 1")}.', fmt=m, near=lambda k: None)

# =============== Binomial expansion ===============
for _ in range(80):
    n = R.randint(5, 12); r = R.randint(2, n - 2)
    add('be1', f'What is the coefficient of {m(f"x^{{{r}}}")} in {m(f"(1 + x)^{{{n}}}")}?', comb(n, r), [comb(n, r - 1), comb(n - 1, r), n * r],
        f'The coefficient is {m(f"\\binom{{{n}}}{{{r}}} = {comb(n, r)}")}.')
    a, b, n2 = R.randint(1, 4), R.choice([-3, -2, -1, 1, 2, 3]), R.randint(3, 8)
    add('be1', f'What is the sum of the coefficients in the expansion of {m(f"({a}x {"+" if b > 0 else "-"} {abs(b)})^{{{n2}}}")}?', (a + b) ** n2, [(a + b) ** (n2 - 1), a ** n2 + b ** n2, 2 ** n2],
        f'Put {m("x = 1")}: {m(f"({a} {"+" if b > 0 else "-"} {abs(b)})^{{{n2}}} = {(a + b) ** n2}")}.')
    row = R.randint(5, 10); pos = R.randint(2, row - 1)
    add('be1', f'Row {m(row)} of Pascal\'s triangle starts {m(f"1,\\ {row},\\ \\dots")} What is entry number {m(pos + 1)} in this row?', comb(row, pos), [comb(row, pos + 1) if comb(row, pos + 1) != comb(row, pos) else comb(row, pos) + row, comb(row - 1, pos), comb(row + 1, pos)],
        f'Entry {m(pos + 1)} of row {m(row)} is {m(f"\\binom{{{row}}}{{{pos}}} = {comb(row, pos)}")}.')
for _ in range(120):
    n = R.randint(4, 9); r = R.randint(1, n - 1); a = R.randint(1, 3); b = R.choice([-3, -2, -1, 2, 3])
    c = comb(n, r) * a ** (n - r) * b ** r
    add('be2', f'Find the coefficient of {m(f"x^{{{r}}}")} in {m(f"({a} {"+" if b > 0 else "-"} {abs(b) if abs(b) != 1 else ""}x)^{{{n}}}")}.', c,
        [comb(n, r) * b ** r, comb(n, r) * a ** r * b ** (n - r), comb(n, r) * a ** (n - r) * abs(b) ** r if b < 0 else comb(n, r - 1) * a ** (n - r + 1) * b ** (r - 1)],
        m(f'\\binom{{{n}}}{{{r}}} \\times {a}^{{{n - r}}} \\times ({b})^{{{r}}} = {c}'))
    k = R.choice([1, 2, 3]); n2 = 2 * R.randint(2, 5); c2 = comb(n2, n2 // 2) * k ** (n2 // 2)
    add('be2', f'Find the term independent of {m("x")} in {m(f"\\left(x + \\frac{{{k}}}{{x}}\\right)^{{{n2}}}")}.', c2,
        [comb(n2, n2 // 2), comb(n2, n2 // 2 - 1) * k ** (n2 // 2 - 1), comb(n2, n2 // 2) * k ** n2],
        f'The general term is {m(f"\\binom{{{n2}}}{{r}} x^{{{n2}-r}} \\left(\\frac{{{k}}}{{x}}\\right)^r")}, so the power of {m("x")} is {m(f"{n2} - 2r = 0")}, {m(f"r = {n2 // 2}")}: {m(f"\\binom{{{n2}}}{{{n2 // 2}}} \\times {k}^{{{n2 // 2}}} = {c2}")}.')
    n3 = 3 * R.randint(1, 3); k3 = R.choice([1, 2, -1, -2]); r3 = 2 * n3 // 3; c3 = comb(n3, r3) * k3 ** r3
    add('be2', f'Find the term independent of {m("x")} in {m(f"\\left(x^2 {"+" if k3 > 0 else "-"} \\frac{{{abs(k3)}}}{{x}}\\right)^{{{n3}}}")}.', c3,
        [comb(n3, r3), comb(n3, n3 // 3) * k3 ** (n3 // 3), -c3],
        f'The power of {m("x")} in each term is {m(f"2({n3} - r) - r = {2 * n3} - 3r")}, which is 0 when {m(f"r = {r3}")}: {m(f"\\binom{{{n3}}}{{{r3}}}({k3})^{{{r3}}} = {c3}")}.')
for n in range(4, 16):
    g = comb(n, n // 2)
    add('be3', f'What is the greatest coefficient in the expansion of {m(f"(1 + x)^{{{n}}}")}?', g, [comb(n, n // 2 - 1), 2 ** n // n, comb(n, n // 2 + 2) if n > 5 else g + n],
        f'The middle {"term" if n % 2 == 0 else "terms"} of row {m(n)} {"is" if n % 2 == 0 else "are"} biggest: {m(f"\\binom{{{n}}}{{{n // 2}}} = {g}")}.')
for _ in range(60):
    a, b, n = R.randint(1, 4), R.randint(1, 4), R.randint(5, 12)
    if a == b: continue
    cs = [comb(n, r) * a ** (n - r) * b ** r for r in range(n + 1)]
    best = max(cs)
    if cs.count(best) > 1: continue
    r = cs.index(best)
    add('be3', f'In the expansion of {m(f"({a} + {b if b > 1 else ""}x)^{{{n}}}")}, which power of {m("x")} has the greatest coefficient?', r, [r - 1, r + 1, n // 2 if n // 2 not in (r, r - 1, r + 1) else r + 2],
        f'The ratio of consecutive coefficients is {m(f"\\frac{{t_{{r+1}}}}{{t_r}} = \\frac{{{n} - r}}{{r + 1}} \\times \\frac{{{b}}}{{{a}}}")}, which drops below 1 after {m(f"r = {r}")}, so {m(f"x^{{{r}}}")} has the greatest coefficient ({m(best)}).',
        fmt=lambda v: m(f'x^{{{v}}}'))
for n in range(4, 13):
    def pw(b, e): return f'{b}^{{{e}}}'
    addt('be4', f'Evaluate {m(f"\\sum_{{k=0}}^{{{n}}} \\binom{{{n}}}{{k}}")}.', pw(2, n), [pw(2, n - 1), pw(2, n + 1), f'{n}!'], f'Put {m("x = 1")} in {m(f"(1 + x)^{{{n}}}")}: the sum is {m(pw(2, n))}.')
    addt('be4', f'Evaluate {m(f"\\sum_{{k=0}}^{{{n}}} \\binom{{{n}}}{{k}} 2^k")}.', pw(3, n), [pw(2, n), pw(2, 2 * n), pw(3, n - 1)], f'Put {m("x = 2")} in {m(f"(1 + x)^{{{n}}}")}: {m(f"(1 + 2)^{{{n}}} = {pw(3, n)}")}.')
    addt('be4', f'Evaluate {m(f"\\sum_{{k=0}}^{{{n}}} k\\binom{{{n}}}{{k}}")}.', f'{n} \\times {pw(2, n - 1)}', [pw(2, n), f'{n} \\times {pw(2, n)}', f'{n - 1} \\times {pw(2, n - 1)}'],
        f'Differentiate {m(f"(1 + x)^{{{n}}} = \\sum \\binom{{{n}}}{{k}} x^k")} and put {m("x = 1")}: {m(f"{n} \\times 2^{{{n - 1}}}")}.')
    addt('be4', f'Evaluate {m(f"\\binom{{{n}}}{{0}} - \\binom{{{n}}}{{1}} + \\binom{{{n}}}{{2}} - \\dots + (-1)^{{{n}}}\\binom{{{n}}}{{{n}}}")}.', '0', ['1', pw(2, n - 1), f'(-1)^{{{n}}}'],
        f'Put {m("x = -1")} in {m(f"(1 + x)^{{{n}}}")}: {m(f"0^{{{n}}} = 0")}.')
    addt('be4', f'Evaluate {m(f"\\sum_{{k=0}}^{{{n}}} \\binom{{{n}}}{{k}}^2")}.', f'\\binom{{{2 * n}}}{{{n}}}', [pw(2, 2 * n), f'\\binom{{{2 * n}}}{{{n - 1}}}', f'\\left(2^{{{n}}}\\right)^2 \\div 2'],
        f'Comparing the {m(f"x^{{{n}}}")} coefficient of {m(f"(1 + x)^{{{n}}}(1 + x)^{{{n}}} = (1 + x)^{{{2 * n}}}")} gives {m(f"\\binom{{{2 * n}}}{{{n}}}")}.')
    for N in [n]: assert sum(comb(N, k) ** 2 for k in range(N + 1)) == comb(2 * N, N) and sum(k * comb(N, k) for k in range(N + 1)) == N * 2 ** (N - 1)

# =============== Permutations and combinations ===============
for _ in range(80):
    n = R.randint(5, 9)
    add('pc1', f'In how many ways can {n} different books be arranged in a row if two particular books must be next to each other?', 2 * factorial(n - 1),
        [factorial(n - 1), factorial(n), factorial(n) - 2 * factorial(n - 1)], f'Glue the two books into one block: {m(f"{n - 1}!")} arrangements, times {m("2")} for the order inside the block: {m(2 * factorial(n - 1))}.')
    add('pc1', f'In how many ways can {n} different books be arranged in a row if two particular books must NOT be next to each other?', factorial(n) - 2 * factorial(n - 1),
        [factorial(n) - factorial(n - 1), 2 * factorial(n - 1), factorial(n - 2) * (n - 1)], f'All arrangements minus those with the two together: {m(f"{n}! - 2 \\times {n - 1}! = {factorial(n) - 2 * factorial(n - 1)}")}.')
    N, r = R.randint(6, 12), R.randint(2, 4)
    p = factorial(N) // factorial(N - r)
    add('pc1', f'How many ways can a president, secretary{" and treasurer" if r == 3 else ""}{", treasurer and captain" if r == 4 else ""} be chosen from {N} people?' if r > 2 else f'How many ways can a captain and vice-captain be chosen from {N} people?',
        p, [comb(N, r), N ** r, p // r], f'Order matters: {m(f"^{{{N}}}P_{{{r}}} = {p}")}.')
    d = R.randint(4, 6); digs = R.randint(3, d)
    add('pc1', f'How many {digs}-digit numbers can be made from the digits {m(", ".join(str(i) for i in range(1, d + 1)))} with no digit repeated?', factorial(d) // factorial(d - digs),
        [d ** digs, comb(d, digs), factorial(d)], m(f'^{{{d}}}P_{{{digs}}} = {factorial(d) // factorial(d - digs)}'))
WORDS = ['BANANA', 'MISSISSIPPI', 'ALGEBRA', 'PARALLEL', 'STATISTICS', 'COMMITTEE', 'TOMORROW', 'EXCELLENT', 'ADDRESS', 'BOOKKEEPER', 'ASSESS', 'CALCULUS',
         'GEOMETRY', 'REFERENCE', 'PEPPER', 'SUCCESS', 'BALLOON', 'COFFEE', 'LETTER', 'PIZZAZZ', 'ACCESS', 'GOOGOL', 'DIFFERENTIAL', 'INDUCTION', 'PROBABILITY', 'INTEGRAL', 'ERROR', 'BOOKSHELF', 'TENNESSEE', 'CHEESE']
for w in WORDS:
    from collections import Counter
    cnt = Counter(w); n = len(w)
    if max(cnt.values()) == 1: continue
    den = 1
    for v in cnt.values(): den *= factorial(v)
    right = factorial(n) // den
    big = max(cnt.values())
    why = ' '.join(f'{c} {k}s,' for k, c in sorted(cnt.items()) if c > 1).rstrip(',')
    add('pc2', f'How many different arrangements are there of the letters of {m(f"\\text{{{w}}}")}?', right, [factorial(n), factorial(n) // factorial(big), right * 2],
        f'{n} letters with {why}: {m(f"\\frac{{{n}!}}{{" + " ".join(f"{c}!" for c in cnt.values() if c > 1) + "}" + f" = {right:,}".replace(",", "{,}"))}.',
        fmt=lambda v: m(f'{v:,}'.replace(',', '{,}')), near=lambda k: right + k)
for n in range(5, 11):
    add('pc3', f'In how many ways can {n} people sit around a round table?', factorial(n - 1), [factorial(n), factorial(n) // 2, factorial(n - 2)], f'Fix one person; arrange the rest: {m(f"{n - 1}! = {factorial(n - 1)}")}.')
    add('pc3', f'{n} people sit around a round table. In how many ways can they sit if two of them must sit together?', 2 * factorial(n - 2), [factorial(n - 2), 2 * factorial(n - 1), factorial(n - 1) - 2 * factorial(n - 2)],
        f'Treat the pair as one: {m(f"({n - 1} - 1)! = {n - 2}!")} ways around the table, times 2 for the pair: {m(2 * factorial(n - 2))}.')
    add('pc3', f'{n} people sit around a round table. In how many ways can they sit if two of them must NOT sit together?', factorial(n - 1) - 2 * factorial(n - 2), [factorial(n) - 2 * factorial(n - 1), 2 * factorial(n - 2), factorial(n - 2)],
        m(f'{n - 1}! - 2 \\times {n - 2}! = {factorial(n - 1) - 2 * factorial(n - 2)}'))
    add('pc3', f'How many different necklaces can be made from {n} different beads?', factorial(n - 1) // 2, [factorial(n - 1), factorial(n) // 2, factorial(n - 2)],
        f'Around a circle: {m(f"{n - 1}!")}. A necklace can be flipped over, so divide by 2: {m(factorial(n - 1) // 2)}.')
for _ in range(120):
    M, W = R.randint(4, 9), R.randint(3, 8); r = R.randint(3, 5); j = R.randint(1, min(W, r - 1))
    if r - j > M: continue
    add('pc4', f'A committee of {r} is chosen from {M} men and {W} women. How many committees have exactly {j} {"woman" if j == 1 else "women"}?', comb(W, j) * comb(M, r - j),
        [comb(W + M, r), comb(W, j) + comb(M, r - j), comb(W, j) * comb(M + W - j, r - j)], m(f'\\binom{{{W}}}{{{j}}}\\binom{{{M}}}{{{r - j}}} = {comb(W, j)} \\times {comb(M, r - j)} = {comb(W, j) * comb(M, r - j)}'))
    add('pc4', f'A committee of {r} is chosen from {M} men and {W} women. How many committees have at least one woman?', comb(M + W, r) - comb(M, r),
        [comb(M + W, r), W * comb(M + W - 1, r - 1), comb(M + W, r) - comb(W, r)], f'All committees minus the all-men ones: {m(f"\\binom{{{M + W}}}{{{r}}} - \\binom{{{M}}}{{{r}}} = {comb(M + W, r) - comb(M, r)}")}.')
    N, k = R.randint(6, 14), R.randint(2, 5)
    add('pc4', f'In how many ways can a team of {k} be chosen from {N} players if one particular player must be in it?', comb(N - 1, k - 1), [comb(N, k), comb(N - 1, k), comb(N, k - 1)],
        f'That player is in; choose the other {k - 1} from {N - 1}: {m(f"\\binom{{{N - 1}}}{{{k - 1}}} = {comb(N - 1, k - 1)}")}.')
for _ in range(100):
    n = R.randint(4, 9)
    add('pc5', f'{n} people stand in a row in random order. What is the probability that two particular people are next to each other?', F(2, n), [F(1, n), F(1, n - 1), F(2, n - 1)],
        f'{m(f"\\frac{{2 \\times {n - 1}!}}{{{n}!}} = {tf(F(2, n))}")}.')
    M, W, r = R.randint(3, 7), R.randint(3, 7), R.randint(2, 4); j = R.randint(1, min(W, r))
    if r - j > M: continue
    p = F(comb(W, j) * comb(M, r - j), comb(M + W, r))
    add('pc5', f'{r} people are chosen at random from {M} men and {W} women. What is the probability that exactly {j} {"is a woman" if j == 1 else "are women"}?', p,
        [F(comb(W, j), comb(M + W, r)), F(W, M + W) ** j, F(comb(W, j) * comb(M, r - j), comb(M + W, r - 1)) if comb(W, j) * comb(M, r - j) < comb(M + W, r - 1) else p / 2],
        m(f'\\frac{{\\binom{{{W}}}{{{j}}}\\binom{{{M}}}{{{r - j}}}}}{{\\binom{{{M + W}}}{{{r}}}}} = {tf(p)}'))
    n2 = R.randint(4, 7)
    add('pc5', f'The letters of a {n2}-letter word with all letters different are arranged at random. What is the probability that the first letter of the word is still first?', F(1, n2),
        [F(1, factorial(n2)), F(n2 - 1, n2), F(1, n2 - 1)], f'Each letter is equally likely to be first: {m(tf(F(1, n2)))}.')

# =============== Remainder and factor theorems ===============
for _ in range(150):
    a, b, c, p = R.randint(-5, 5), R.randint(-9, 9), R.randint(-12, 12), R.choice([-3, -2, -1, 1, 2, 3])
    P = lambda x: x ** 3 + a * x * x + b * x + c
    add('rf2', f'Find the remainder when {m(poly([1, a, b, c]))} is divided by {m(f"x {"-" if p > 0 else "+"} {abs(p)}")}.', P(p), [P(-p), c, P(p) - c],
        f'By the remainder theorem the remainder is {m(f"P({p}) = {P(p)}")}.')
    r1, r2, r3 = R.sample([-4, -3, -2, -1, 1, 2, 3, 4, 5], 3)
    cs = [1, -(r1 + r2 + r3), r1 * r2 + r2 * r3 + r3 * r1, -r1 * r2 * r3]
    ok = [x for x in range(-6, 7) if x not in (r1, r2, r3) and -x not in (r1, r2, r3) and x != 0]
    lin = lambda x: f'x {"-" if x > 0 else "+"} {abs(x)}'
    addt('rf3', f'Which of these is a factor of {m(poly(cs))}?', lin(r1), [lin(-r1) if -r1 not in (r2, r3) else lin(ok[0]), lin(ok[1]), lin(ok[2])],
        f'{m(f"P({r1}) = 0")}, so {m(lin(r1))} is a factor.')
    q = R.choice([-3, -2, -1, 1, 2, 3]); A, C = R.randint(-4, 4), R.randint(-10, 10)
    k = F(-(q ** 3 + A * q * q + C), q)
    if k.denominator != 1: continue
    if A == 0 or C == 0: continue
    tex = f'x^3 {"+" if A > 0 else "-"} {abs(A) if abs(A) != 1 else ""}x^2 + kx {"+" if C > 0 else "-"} {abs(C)}'
    add('rf3', f'If {m(f"x {'-' if q > 0 else '+'} {abs(q)}")} is a factor of {m(tex)}, find {m("k")}.',
        k, [-k, F(q ** 3 + A * q * q + C, q), k + 1], f'{m(f"P({q}) = 0")}: {m(f"({q})^3 + {A}({q})^2 + ({q})k + ({C}) = 0")}, so {m(f"k = {tf(k)}")}.')
    a2, b2 = R.sample([-3, -2, -1, 1, 2, 3, 4], 2)
    cs2 = [1, R.randint(-3, 3), R.randint(-5, 5), R.randint(-6, 6)]
    P2 = lambda x: sum(c_ * x ** (3 - i) for i, c_ in enumerate(cs2))
    mm = F(P2(a2) - P2(b2), a2 - b2); cc = P2(a2) - mm * a2
    def lin2(mv, cv): return poly([mv, cv])
    q1, q2 = (lambda x: f'(x {"-" if x > 0 else "+"} {abs(x)})')(a2), (lambda x: f'(x {"-" if x > 0 else "+"} {abs(x)})')(b2)
    addt('rf1', f'Find the remainder when {m(poly(cs2))} is divided by {m(q1 + q2)}.', lin2(mm, cc), [lin2(cc, mm) if cc != mm else lin2(mm, cc + 1), lin2(-mm, cc), lin2(mm, -cc) if cc else lin2(mm, 1)],
        f'The remainder is {m("mx + c")} with {m(f"P({a2}) = {P2(a2)}")} and {m(f"P({b2}) = {P2(b2)}")}: so {m("mx + c")} {m(f"= {lin2(mm, cc)}")}.')
for a in range(-4, 5):
    if a == 0: continue
    p, q = -3 * a * a, 2 * a ** 3
    add('rf4', f'The polynomial {m(f"x^3 + px + q")} has a double root at {m(f"x = {a}")}. Find {m("p")}.', p, [3 * a * a, -a * a, -2 * a * a],
        f'A double root means {m(f"P({a}) = 0")} and {m(f"P\'({a}) = 0")}. {m(f"P\'(x) = 3x^2 + p")}, so {m(f"p = -3({a})^2 = {p}")}.')
    add('rf4', f'The polynomial {m(f"x^3 + px + q")} has a double root at {m(f"x = {a}")}. Find {m("q")}.', q, [-q, a ** 3, 3 * a ** 3],
        f'{m(f"p = -3({a})^2 = {p}")}, then {m(f"P({a}) = {a ** 3} + ({p})({a}) + q = 0")} gives {m(f"q = {q}")}.')
for _ in range(60):
    r1, r2 = R.sample([-4, -3, -2, -1, 1, 2, 3, 4], 2)
    lin = lambda x: f'(x {"-" if x > 0 else "+"} {abs(x)})'
    add('rf4', f'At which {m("x")} value does the graph of {m(f"y = {lin(r1)}^2{lin(r2)}")} touch the {m("x")}-axis without crossing it?', r1, [r2, -r1, -r2],
        f'A squared factor is a double root, where the graph touches the axis: {m(f"x = {r1}")}.', fmt=lambda v: m(f'x = {v}'), near=lambda k: r1 + 10 * k)

# =============== Sums and products of roots ===============
for _ in range(120):
    a, b, c = R.choice([1, 1, 2, 3]), R.randint(-9, 9), R.choice([x for x in range(-10, 11) if x])
    q = f'{m(poly([a, b, c]))}{m(" = 0")}'
    add('sp1', f'If {m("\\alpha")} and {m("\\beta")} are the roots of {q}, find {m("\\alpha + \\beta")}.', F(-b, a), [F(b, a), F(c, a), F(-c, a)], m(f'\\alpha + \\beta = -\\frac{{b}}{{a}} = {tf(F(-b, a))}'))
    add('sp1', f'If {m("\\alpha")} and {m("\\beta")} are the roots of {q}, find {m("\\alpha\\beta")}.', F(c, a), [F(-c, a), F(-b, a), F(b, a)], m(f'\\alpha\\beta = \\frac{{c}}{{a}} = {tf(F(c, a))}'))
    s, p = F(-b, a), F(c, a)
    add('sp1', f'If {m("\\alpha")} and {m("\\beta")} are the roots of {q}, find {m("\\alpha^2 + \\beta^2")}.', s * s - 2 * p, [s * s, s * s + 2 * p, s * s - p],
        m(f'(\\alpha + \\beta)^2 - 2\\alpha\\beta = ({tf(s)})^2 - 2({tf(p)}) = {tf(s * s - 2 * p)}'))
    add('sp1', f'If {m("\\alpha")} and {m("\\beta")} are the roots of {q}, find {m("\\frac{1}{\\alpha} + \\frac{1}{\\beta}")}.', s / p, [p / s if s else s + 1, -s / p, 1 / s + 1 / p if s else s - 1],
        m(f'\\frac{{\\alpha + \\beta}}{{\\alpha\\beta}} = \\frac{{{tf(s)}}}{{{tf(p)}}} = {tf(s / p)}'))
for _ in range(120):
    a = R.choice([1, 1, 1, 2]); b, c, d = R.randint(-8, 8), R.randint(-9, 9), R.choice([x for x in range(-12, 13) if x])
    q = f'{m(poly([a, b, c, d]))}{m(" = 0")}'
    S1, S2, S3 = F(-b, a), F(c, a), F(-d, a)
    add('sp2', f'If {m("\\alpha, \\beta, \\gamma")} are the roots of {q}, find {m("\\alpha + \\beta + \\gamma")}.', S1, [-S1, S2, S3], m(f'-\\frac{{b}}{{a}} = {tf(S1)}'))
    add('sp2', f'If {m("\\alpha, \\beta, \\gamma")} are the roots of {q}, find {m("\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha")}.', S2, [-S2, S1, S3], m(f'\\frac{{c}}{{a}} = {tf(S2)}'))
    add('sp2', f'If {m("\\alpha, \\beta, \\gamma")} are the roots of {q}, find {m("\\alpha\\beta\\gamma")}.', S3, [-S3, S2, S1], m(f'-\\frac{{d}}{{a}} = {tf(S3)}'))
    add('sp3', f'If {m("\\alpha, \\beta, \\gamma")} are the roots of {q}, find {m("\\alpha^2 + \\beta^2 + \\gamma^2")}.', S1 * S1 - 2 * S2, [S1 * S1, S1 * S1 + 2 * S2, S1 * S1 - S2],
        m(f'(\\alpha + \\beta + \\gamma)^2 - 2(\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha) = ({tf(S1)})^2 - 2({tf(S2)}) = {tf(S1 * S1 - 2 * S2)}'))
    if S2:
        add('sp3', f'If {m("\\alpha, \\beta, \\gamma")} are the roots of {q}, find {m("\\frac{1}{\\alpha} + \\frac{1}{\\beta} + \\frac{1}{\\gamma}")}.', S2 / S3, [S3 / S2, S1 / S3, -S2 / S3],
            m(f'\\frac{{\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha}}{{\\alpha\\beta\\gamma}} = \\frac{{{tf(S2)}}}{{{tf(S3)}}} = {tf(S2 / S3)}'))
    e = R.choice([x for x in range(-9, 10) if x])
    add('sp2', f'If {m("\\alpha, \\beta, \\gamma, \\delta")} are the roots of {m(poly([a, b, c, d, e]))}{m(" = 0")}, find {m("\\alpha\\beta\\gamma\\delta")}.', F(e, a), [F(-e, a), F(-d, a), F(d, a)], m(f'\\frac{{e}}{{a}} = {tf(F(e, a))}'))
for _ in range(80):
    r, k = R.randint(1, 5), R.randint(2, 4)
    c, B = k * r * r, r * (1 + k)
    add('sp4', f'One root of {m(f"x^2 - bx + {c} = 0")} is {k} times the other, and both roots are positive. Find {m("b")}.', B, [k * r, c // r if c // r != B else B + r, r + k],
        f'Let the roots be {m("\\alpha")} and {m(f"{k}\\alpha")}: {m(f"{k}\\alpha^2 = {c}")}, so {m(f"\\alpha = {r}")}, and {m(f"b = \\alpha + {k}\\alpha = {B}")}.')
    rs = R.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 3)
    cs = [1, -sum(rs), rs[0] * rs[1] + rs[1] * rs[2] + rs[2] * rs[0], -rs[0] * rs[1] * rs[2]]
    add('sp4', f'Two of the roots of {m(poly(cs))}{m(" = 0")} are {m(rs[0])} and {m(rs[1])}. Find the third root.', rs[2], [-rs[2], sum(rs), -sum(rs) - rs[0] - rs[1] if -sum(rs) - rs[0] - rs[1] != rs[2] else rs[2] + 2],
        f'The roots add to {m(f"-\\frac{{b}}{{a}} = {sum(rs)}")}, so the third is {m(f"{sum(rs)} - ({rs[0]}) - ({rs[1]}) = {rs[2]}")}.')
    d0, dd = R.randint(-3, 4), R.randint(1, 3)
    ap = [d0 - dd, d0, d0 + dd]
    cs = [1, -sum(ap), ap[0] * ap[1] + ap[1] * ap[2] + ap[2] * ap[0], -ap[0] * ap[1] * ap[2]]
    add('sp4', f'The roots of {m(poly(cs))}{m(" = 0")} form an arithmetic sequence. What is the middle root?', d0, [-d0, sum(ap), cs[3]],
        f'Write the roots as {m("a - d, a, a + d")}: they add to {m(f"3a = {sum(ap)}")}, so {m(f"a = {d0}")}.')

# =============== Inverse trig functions ===============
for A in (1, 2, 3, 4):
    for B in (1, 2, 3, 4, 5):
        lab = lambda f: f'y = {A if A > 1 else ""}\\{f}^{{-1}}\\left(\\frac{{x}}{{{B}}}\\right)' if B > 1 else f'y = {A if A > 1 else ""}\\{f}^{{-1}} x'
        iv = lambda lo, hi, o='[', c=']': f'{"\\left" + o}{lo}, {hi}{"\\right" + c}'
        addt('it1', f'What is the domain of {m(lab("sin"))}?', f'-{B} \\leq x \\leq {B}', [f'-1 \\leq x \\leq 1', f'-{A} \\leq x \\leq {A}' if A != B else f'0 \\leq x \\leq {B}', f'0 \\leq x \\leq {2 * B}'],
             f'Inverse sine needs {m(f"-1 \\leq \\frac{{x}}{{{B}}} \\leq 1")}, so {m(f"-{B} \\leq x \\leq {B}")}.' if B > 1 else 'Inverse sine needs the input between -1 and 1.')
        addt('it1', f'What is the range of {m(lab("sin"))}?', f'-{pifrac(F(A, 2))} \\leq y \\leq {pifrac(F(A, 2))}', [f'0 \\leq y \\leq {pifrac(A)}', f'-{pifrac(A)} \\leq y \\leq {pifrac(A)}', f'-{B} \\leq y \\leq {B}'],
             f'Inverse sine gives angles from {m("-\\frac{\\pi}{2}")} to {m("\\frac{\\pi}{2}")}; times {m(A)}.')
        addt('it1', f'What is the range of {m(lab("cos"))}?', f'0 \\leq y \\leq {pifrac(A)}', [f'-{pifrac(F(A, 2))} \\leq y \\leq {pifrac(F(A, 2))}', f'-{pifrac(A)} \\leq y \\leq {pifrac(A)}', f'0 \\leq y \\leq {pifrac(F(A, 2))}'],
             f'Inverse cosine gives angles from {m("0")} to {m("\\pi")}; times {m(A)}.')
        addt('it1', f'What is the range of {m(lab("tan"))}?', f'-{pifrac(F(A, 2))} < y < {pifrac(F(A, 2))}', [f'-{pifrac(F(A, 2))} \\leq y \\leq {pifrac(F(A, 2))}', f'0 < y < {pifrac(A)}', f'-{pifrac(A)} < y < {pifrac(A)}'],
             f'Inverse tan never reaches {m("\\pm\\frac{\\pi}{2}")}, so after multiplying by {m(A)} the range is open.')
VAL = {  # exact values: input tex -> angle as a multiple of pi
    'sin': [('0', 0), ('\\frac{1}{2}', F(1, 6)), ('\\frac{1}{\\sqrt{2}}', F(1, 4)), ('\\frac{\\sqrt{3}}{2}', F(1, 3)), ('1', F(1, 2)), ('-\\frac{1}{2}', F(-1, 6)), ('-\\frac{1}{\\sqrt{2}}', F(-1, 4)), ('-\\frac{\\sqrt{3}}{2}', F(-1, 3)), ('-1', F(-1, 2))],
    'cos': [('0', F(1, 2)), ('\\frac{1}{2}', F(1, 3)), ('\\frac{1}{\\sqrt{2}}', F(1, 4)), ('\\frac{\\sqrt{3}}{2}', F(1, 6)), ('1', 0), ('-\\frac{1}{2}', F(2, 3)), ('-\\frac{1}{\\sqrt{2}}', F(3, 4)), ('-\\frac{\\sqrt{3}}{2}', F(5, 6)), ('-1', 1)],
    'tan': [('0', 0), ('\\frac{1}{\\sqrt{3}}', F(1, 6)), ('1', F(1, 4)), ('\\sqrt{3}', F(1, 3)), ('-\\frac{1}{\\sqrt{3}}', F(-1, 6)), ('-1', F(-1, 4)), ('-\\sqrt{3}', F(-1, 3))],
}
for f, vals in VAL.items():
    for x, ang in vals:
        wr = [-ang, 1 - ang if f == 'cos' else ang + 1, F(1, 2) - ang if ang != F(1, 4) else ang * 3]
        add('it2', f'Find the exact value of {m(f"\\{f}^{{-1}}\\left({x}\\right)")}.', ang, wr,
            f'{m(f"\\{f}^{{-1}}")} gives the angle in {m("\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]" if f == "sin" else "[0, \\pi]" if f == "cos" else "\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)")} with {m(f"\\{f} \\theta = {x}")}: {m(pifrac(ang))}.',
            fmt=lambda v: m(pifrac(v)), near=lambda k: ang + F(k, 12))
for a, b, c in [(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (20, 21, 29), (9, 40, 41)]:
    for (o, h, adj) in [(a, c, b), (b, c, a)]:
        add('it2', f'Find the exact value of {m(f"\\cos\\left(\\sin^{{-1}} \\frac{{{o}}}{{{h}}}\\right)")}.', F(adj, h), [F(o, h), F(adj, o), F(o, adj)],
            f'Draw a right triangle with opposite {m(o)} and hypotenuse {m(h)}: the adjacent side is {m(adj)}, so the cosine is {m(tf(F(adj, h)))} (positive, as the angle is in the first quadrant).')
        add('it2', f'Find the exact value of {m(f"\\tan\\left(\\cos^{{-1}} \\frac{{{adj}}}{{{h}}}\\right)")}.', F(o, adj), [F(adj, o), F(o, h), F(adj, h)],
            f'Adjacent {m(adj)}, hypotenuse {m(h)}, so opposite {m(o)}: {m(f"\\tan\\theta = {tf(F(o, adj))}")}.')
for x, ang in VAL['cos'][:5]:
    if x in ('0', '1'): continue
    add('it3', f'Given {m(f"\\cos^{{-1}}\\left({x}\\right) = {pifrac(ang)}")}, find {m(f"\\cos^{{-1}}\\left(-{x}\\right)")}.', 1 - ang, [-ang, ang, ang + F(1, 2)],
        m(f'\\cos^{{-1}}(-x) = \\pi - \\cos^{{-1}}x = \\pi - {pifrac(ang)} = {pifrac(1 - ang)}'), fmt=lambda v: m(pifrac(v)), near=lambda k: 1 - ang + F(k, 12))
for t in (F(1, 10), F(1, 5), F(3, 10), F(2, 7), F(1, 8), F(3, 8), F(1, 9), F(2, 9), F(1, 12), F(5, 12)):
    add('it3', f'If {m(f"\\sin^{{-1}} x = {pifrac(t)}")}, find {m("\\cos^{-1} x")}.', F(1, 2) - t, [t, 1 - t, -t], m(f'\\sin^{{-1}}x + \\cos^{{-1}}x = \\frac{{\\pi}}{{2}}, \\text{{ so }} \\cos^{{-1}}x = {pifrac(F(1, 2) - t)}'),
        fmt=lambda v: m(pifrac(v)), near=lambda k: F(1, 2) - t + F(k, 20))
    add('it3', f'If {m(f"\\sin^{{-1}} x = {pifrac(t)}")}, find {m("\\sin^{-1}(-x)")}.', -t, [t, 1 - t, F(1, 2) - t], f'{m("\\sin^{-1}")} is odd: {m(f"\\sin^{{-1}}(-x) = -\\sin^{{-1}}x = {pifrac(-t)}")}.',
        fmt=lambda v: m(pifrac(v)), near=lambda k: -t + F(k, 20))
for a in (2, 3, 4, 5, 6, 7, 8, 9, 10):
    addt('it4', f'Differentiate {m(f"\\sin^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right)")}.', f'\\frac{{1}}{{\\sqrt{{{a * a} - x^2}}}}', [f'\\frac{{{a}}}{{\\sqrt{{{a * a} - x^2}}}}', f'\\frac{{1}}{{{a}\\sqrt{{{a * a} - x^2}}}}', f'\\frac{{1}}{{\\sqrt{{1 - x^2}}}}'],
         m(f'\\frac{{1}}{{\\sqrt{{1 - \\frac{{x^2}}{{{a * a}}}}}}} \\times \\frac{{1}}{{{a}}} = \\frac{{1}}{{\\sqrt{{{a * a} - x^2}}}}'))
    addt('it4', f'Differentiate {m(f"\\tan^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right)")}.', f'\\frac{{{a}}}{{{a * a} + x^2}}', [f'\\frac{{1}}{{{a * a} + x^2}}', f'\\frac{{1}}{{{a}({a * a} + x^2)}}', f'\\frac{{{a}}}{{1 + x^2}}'],
         m(f'\\frac{{1}}{{1 + \\frac{{x^2}}{{{a * a}}}}} \\times \\frac{{1}}{{{a}}} = \\frac{{{a}}}{{{a * a} + x^2}}'))
    addt('it4', f'Differentiate {m(f"\\cos^{{-1}}({a}x)")}.', f'-\\frac{{{a}}}{{\\sqrt{{1 - {a * a}x^2}}}}', [f'\\frac{{{a}}}{{\\sqrt{{1 - {a * a}x^2}}}}', f'-\\frac{{1}}{{\\sqrt{{1 - {a * a}x^2}}}}', f'-\\frac{{{a}}}{{\\sqrt{{1 - {a}x^2}}}}'],
         m(f'-\\frac{{1}}{{\\sqrt{{1 - ({a}x)^2}}}} \\times {a} = -\\frac{{{a}}}{{\\sqrt{{1 - {a * a}x^2}}}}'))
    addt('it5', f'Find {m(f"\\int \\frac{{dx}}{{\\sqrt{{{a * a} - x^2}}}}")}.', f'\\sin^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C', [f'\\frac{{1}}{{{a}}}\\sin^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C', f'{a}\\sin^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C', f'\\tan^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C'],
         f'The standard integral is {m("\\int \\frac{dx}{\\sqrt{a^2 - x^2}} = \\sin^{-1}\\frac{x}{a} + C")}, with {m(f"a = {a}")}.')
    addt('it5', f'Find {m(f"\\int \\frac{{dx}}{{{a * a} + x^2}}")}.', f'\\frac{{1}}{{{a}}}\\tan^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C', [f'\\tan^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C', f'{a}\\tan^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C', f'\\frac{{1}}{{{a}}}\\sin^{{-1}}\\left(\\frac{{x}}{{{a}}}\\right) + C'],
         f'{m("\\int \\frac{dx}{a^2 + x^2} = \\frac{1}{a}\\tan^{-1}\\frac{x}{a} + C")}, with {m(f"a = {a}")}.')
    add('it5', f'Evaluate {m(f"\\int_0^{{{a}}} \\frac{{dx}}{{{a * a} + x^2}}")}.', F(1, 4 * a), [F(1, 4), F(a, 4), F(1, 2 * a)],
        m(f'\\frac{{1}}{{{a}}}\\left[\\tan^{{-1}}\\frac{{x}}{{{a}}}\\right]_0^{{{a}}} = \\frac{{1}}{{{a}}} \\times \\frac{{\\pi}}{{4}} = {pifrac(F(1, 4 * a))}'), fmt=lambda v: m(pifrac(v)), near=lambda k: F(1, 4 * a) * (k + 2))
    add('it5', f'Evaluate {m(f"\\int_0^{{{tf(F(a, 2))}}} \\frac{{dx}}{{\\sqrt{{{a * a} - x^2}}}}")}.', F(1, 6), [F(1, 3), F(1, 4), F(a, 6)],
        m(f'\\left[\\sin^{{-1}}\\frac{{x}}{{{a}}}\\right]_0^{{{tf(F(a, 2))}}} = \\sin^{{-1}}\\frac{{1}}{{2}} = \\frac{{\\pi}}{{6}}'), fmt=lambda v: m(pifrac(v)), near=lambda k: F(1, 6) * (k + 2))

# keep a spread: at most 40 per step
by = {}
for q in OUT: by.setdefault(q['step'], []).append(q)
final = []
for s in sorted(by):
    R.shuffle(by[s]); final += by[s][:40]
json.dump(final, open('quick_ext1.json', 'w'), indent=1)
print({s: min(len(v), 40) for s, v in sorted(by.items())}, 'total', len(final))
