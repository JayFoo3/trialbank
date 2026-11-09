"""Induction drills: Maths Extension 1, proof by mathematical induction for sums and series (step pi1).
Written questions with a full model answer laid out line for line the way the class teacher writes it:

    Step 1: Prove true for n=1 / when n=1, / LHS and RHS worked side by side / ∴ true for n=1
    Step 2: Let n=k be a number for which the statement is true / i.e. <statement for k>
    Step 3: Prove true for n=k+1 / i.e. <statement for k+1> / LHS = <series to the (k+1)th term>
            = <step 2 result> + <(k+1)th term>  (from step 2) / ... / = <RHS(k+1)> = RHS / ∴ true for n=k+1
    ∴ by induction, the statement is true for all integers n ≥ 1

Every piece of TeX is checked here by evaluating it (k = 1..8), so nothing goes up with a slip in it:
the formula against the real sum, Step 1 against n = 1, both "i.e." lines, and every line of Step 3.
Output: quick/quick-ext1-proof.raw.json, then: node quick/render_proof.js (KaTeX) -> quick/quick-ext1-proof.json"""
import json, math, os, re, sys
from fractions import Fraction as F

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = []


# ---------------------------------------------------------------- a small TeX evaluator, used only for the checks
TOK = re.compile(r'\\dfrac|\\frac|\\times|\\cdot|\\left\(|\\right\)|\\dots|\d+|[a-z]|[-+^!(){}]|\s+')


def tokens(s):
    out, i = [], 0
    while i < len(s):
        m = TOK.match(s, i)
        if not m: raise ValueError(f'cannot read {s[i:i + 12]!r} in {s!r}')
        t = m.group(0); i = m.end()
        if not t.isspace(): out.append({'\\left(': '(', '\\right)': ')', '\\dfrac': '\\frac', '\\cdot': '\\times'}.get(t, t))
    return out


def ev(tex, env):
    """value of a TeX expression (Fractions), with variables from env"""
    t, pos = tokens(tex), [0]
    peek = lambda: t[pos[0]] if pos[0] < len(t) else None

    def take(x=None):
        tok = peek()
        if x is not None and tok != x: raise ValueError(f'expected {x} got {tok} in {tex!r}')
        pos[0] += 1; return tok

    def expr():
        v = -term() if peek() == '-' and take() else term()
        while peek() in ('+', '-'):
            v = v + term() if take() == '+' else v - term()
        return v

    def term():
        v = power()
        while True:
            if peek() == '\\times': take(); v *= power()
            elif peek() is not None and (peek() in ('(', '{', '\\frac') or peek().isdigit() or peek().isalpha()): v *= power()
            else: return v

    def power():
        v = atom()
        while peek() in ('^', '!'):
            if take() == '!': v = F(math.factorial(int(v)))
            else:
                e = atom()
                assert e.denominator == 1, tex
                v = v ** int(e)
        return v

    def atom():
        tok = take()
        if tok == '(': v = expr(); take(')'); return v
        if tok == '{': v = expr(); take('}'); return v
        if tok == '\\frac':
            take('{'); a = expr(); take('}'); take('{'); b = expr(); take('}'); return a / b
        if tok.isdigit(): return F(int(tok))
        if tok in env: return F(env[tok])
        raise ValueError(f'unexpected {tok} in {tex!r}')

    v = expr()
    if pos[0] != len(t): raise ValueError(f'left over {t[pos[0]:]} in {tex!r}')
    return v


def check(q):
    """every claim in the model answer, evaluated"""
    T = lambda i: ev(q['tn'], {'n': i})
    R = lambda i: ev(q['rn'], {'n': i})
    for n in range(1, 9):
        assert sum(T(i) for i in range(1, n + 1)) == R(n), (q['rn'], n)
    for i, s in enumerate(q['nums'], 1): assert ev(s, {}) == T(i), (s, i)
    for s in q['s1l']: assert ev(s, {}) == T(1), s
    for s in q['s1r']: assert ev(s, {}) == R(1), s
    for k in range(1, 9):
        e = {'k': k}
        assert ev(q['tk'], e) == T(k) and ev(q['rk'], e) == R(k), q['tk']
        assert ev(q['tk1'], e) == T(k + 1) and ev(q['rk1'], e) == R(k + 1), q['tk1']
        for line, _ in q['chain']: assert ev(line, e) == R(k + 1), (line, k)
    assert ev(q['chain'][-1][0], {'k': 5}) == ev(q['rk1'], {'k': 5})
    assert q['chain'][0][1] == 'from step 2'


def add(level, nums, t, r, tk1, rk1, s1l, s1r, chain):
    """t, r: the general term and the right-hand side as functions of the letter ('n' or 'k')"""
    q = dict(step='pi1', level=level, nums=nums, tn=t('n'), tk=t('k'), tk1=tk1, rn=r('n'), rk=r('k'), rk1=rk1, s1l=s1l, s1r=s1r,
             chain=[(c, 'from step 2' if i == 0 else '') for i, c in enumerate(chain)])
    check(q)
    OUT.append(q)


# ---------------------------------------------------------------- 1. 1/r + 1/r^2 + ... + 1/r^n  (the teacher's worked example is r = 3)
for r in (3, 2, 4, 5, 6, 7, 10):
    den = (lambda v, r=r: f'{r - 1}({r}^{{{v}}})') if r > 2 else (lambda v, r=r: f'{r}^{{{v}}}')
    t = lambda v, r=r: f'\\dfrac{{1}}{{{r}^{{{v}}}}}'
    rr = lambda v, r=r, den=den: f'\\dfrac{{{r}^{{{v}}} - 1}}{{{den(v)}}}'
    s1r = [f'\\dfrac{{{r}^{{1}} - 1}}{{{r - 1} \\times {r}^{{1}}}}', f'\\dfrac{{{r - 1}}}{{{(r - 1) * r}}}', f'\\dfrac{{1}}{{{r}}}'] if r > 2 \
        else [f'\\dfrac{{2^{{1}} - 1}}{{2^{{1}}}}', '\\dfrac{1}{2}']
    mid = [f'\\dfrac{{{r} \\times ({r}^{{k}} - 1)}}{{{r} \\times {r - 1}({r}^{{k}})}} + \\dfrac{{{r - 1} \\times 1}}{{{r - 1} \\times {r}^{{k+1}}}}',
           f'\\dfrac{{{r}^{{k+1}} - {r} + {r - 1}}}{{{r - 1}({r}^{{k+1}})}}'] if r > 2 else \
          ['\\dfrac{2 \\times (2^{k} - 1)}{2 \\times 2^{k}} + \\dfrac{1}{2^{k+1}}', '\\dfrac{2^{k+1} - 2 + 1}{2^{k+1}}']
    add(1 if r in (2, 3) else 2, [f'\\dfrac{{1}}{{{r ** i}}}' for i in (1, 2, 3)], t, rr, t('k+1'), rr('k+1'),
        [f'\\dfrac{{1}}{{{r}^{{1}}}}', f'\\dfrac{{1}}{{{r}}}'], s1r, [f'{rr("k")} + {t("k+1")}', *mid, rr('k+1')])

# ---------------------------------------------------------------- 2. (r-1)/r + (r-1)/r^2 + ... = (r^n - 1)/r^n
for r in (3, 4, 5):
    a = r - 1
    t = lambda v, r=r, a=a: f'\\dfrac{{{a}}}{{{r}^{{{v}}}}}'
    rr = lambda v, r=r: f'\\dfrac{{{r}^{{{v}}} - 1}}{{{r}^{{{v}}}}}'
    add(2, [f'\\dfrac{{{a}}}{{{r ** i}}}' for i in (1, 2, 3)], t, rr, t('k+1'), rr('k+1'),
        [f'\\dfrac{{{a}}}{{{r}^{{1}}}}', f'\\dfrac{{{a}}}{{{r}}}'], [f'\\dfrac{{{r}^{{1}} - 1}}{{{r}^{{1}}}}', f'\\dfrac{{{a}}}{{{r}}}'],
        [f'{rr("k")} + {t("k+1")}', f'\\dfrac{{{r} \\times ({r}^{{k}} - 1)}}{{{r} \\times {r}^{{k}}}} + \\dfrac{{{a}}}{{{r}^{{k+1}}}}',
         f'\\dfrac{{{r}^{{k+1}} - {r} + {a}}}{{{r}^{{k+1}}}}', rr('k+1')])

# ---------------------------------------------------------------- 3. a + ar + ar^2 + ... + ar^(n-1) with a = r - 1:  = r^n - 1
for r in (2, 3, 4, 5):
    a = r - 1
    t = (lambda v, r=r: f'{r}^{{{v} - 1}}') if a == 1 else (lambda v, r=r, a=a: f'{a}({r}^{{{v} - 1}})')
    tk1 = f'{r}^{{k}}' if a == 1 else f'{a}({r}^{{k}})'
    rr = lambda v, r=r: f'{r}^{{{v}}} - 1'
    add(1, [str(a * r ** i) for i in (0, 1, 2)], t, rr, tk1, rr('k+1'), [t('1'), str(a)], [f'{r}^{{1}} - 1', str(a)],
        [f'{r}^{{k}} - 1 + {tk1}', f'{r}({r}^{{k}}) - 1', rr('k+1')])

# ---------------------------------------------------------------- 4. 1 + r + r^2 + ... + r^(n-1) = (r^n - 1)/(r - 1)
for r in (3, 4, 5):
    a = r - 1
    t = lambda v, r=r: f'{r}^{{{v} - 1}}'
    rr = lambda v, r=r, a=a: f'\\dfrac{{{r}^{{{v}}} - 1}}{{{a}}}'
    add(2, ['1', str(r), str(r * r)], t, rr, f'{r}^{{k}}', rr('k+1'), [t('1'), '1'], [rr('1'), f'\\dfrac{{{a}}}{{{a}}}', '1'],
        [f'{rr("k")} + {r}^{{k}}', f'{rr("k")} + \\dfrac{{{a}({r}^{{k}})}}{{{a}}}', f'\\dfrac{{{r}^{{k}} - 1 + {a}({r}^{{k}})}}{{{a}}}',
         f'\\dfrac{{{r}({r}^{{k}}) - 1}}{{{a}}}', rr('k+1')])

# ---------------------------------------------------------------- 5. a + 2a + 4a + ... + a(2^(n-1)) = a(2^n - 1)
for a in (3, 5):
    t = lambda v, a=a: f'{a}(2^{{{v} - 1}})'
    rr = lambda v, a=a: f'{a}(2^{{{v}}} - 1)'
    add(2, [str(a), str(2 * a), str(4 * a)], t, rr, f'{a}(2^{{k}})', rr('k+1'), [t('1'), str(a)], [f'{a}(2^{{1}} - 1)', str(a)],
        [f'{rr("k")} + {a}(2^{{k}})', f'{a}(2^{{k}}) - {a} + {a}(2^{{k}})', f'{2 * a}(2^{{k}}) - {a}', f'{a}(2(2^{{k}}) - 1)', rr('k+1')])

# ---------------------------------------------------------------- 6. arithmetic: terms (an + b)
ARITH = [
    # nums, t(v), r(v), tk1, rk1, s1l, s1r, chain (after the step 2 line), level
    (['1', '3', '5'], lambda v: f'(2{v} - 1)', lambda v: f'{v}^{{2}}', '(2k + 1)', '(k + 1)^{2}', ['2(1) - 1', '1'], ['1^{2}', '1'],
     ['k^{2} + 2k + 1'], 1),
    (['2', '4', '6'], lambda v: f'2{v}', lambda v: f'{v}({v} + 1)', '2(k + 1)', '(k + 1)(k + 2)', ['2(1)', '2'], ['1(1 + 1)', '2'],
     [], 1),
    (['1', '2', '3'], lambda v: v, lambda v: f'\\dfrac{{{v}({v} + 1)}}{{2}}', '(k + 1)', '\\dfrac{(k + 1)(k + 2)}{2}', ['1'], ['\\dfrac{1(1 + 1)}{2}', '\\dfrac{2}{2}', '1'],
     ['\\dfrac{k(k + 1)}{2} + \\dfrac{2(k + 1)}{2}'], 1),
    (['3', '7', '11'], lambda v: f'(4{v} - 1)', lambda v: f'{v}(2{v} + 1)', '(4k + 3)', '(k + 1)(2k + 3)', ['4(1) - 1', '3'], ['1(2 \\times 1 + 1)', '3'],
     ['2k^{2} + k + 4k + 3', '2k^{2} + 5k + 3'], 1),
    (['1', '5', '9'], lambda v: f'(4{v} - 3)', lambda v: f'{v}(2{v} - 1)', '(4k + 1)', '(k + 1)(2k + 1)', ['4(1) - 3', '1'], ['1(2 \\times 1 - 1)', '1'],
     ['2k^{2} - k + 4k + 1', '2k^{2} + 3k + 1'], 1),
    (['1', '4', '7'], lambda v: f'(3{v} - 2)', lambda v: f'\\dfrac{{{v}(3{v} - 1)}}{{2}}', '(3k + 1)', '\\dfrac{(k + 1)(3k + 2)}{2}', ['3(1) - 2', '1'],
     ['\\dfrac{1(3 \\times 1 - 1)}{2}', '\\dfrac{2}{2}', '1'],
     ['\\dfrac{k(3k - 1)}{2} + \\dfrac{2(3k + 1)}{2}', '\\dfrac{3k^{2} - k + 6k + 2}{2}', '\\dfrac{3k^{2} + 5k + 2}{2}'], 2),
    (['2', '5', '8'], lambda v: f'(3{v} - 1)', lambda v: f'\\dfrac{{{v}(3{v} + 1)}}{{2}}', '(3k + 2)', '\\dfrac{(k + 1)(3k + 4)}{2}', ['3(1) - 1', '2'],
     ['\\dfrac{1(3 \\times 1 + 1)}{2}', '\\dfrac{4}{2}', '2'],
     ['\\dfrac{k(3k + 1)}{2} + \\dfrac{2(3k + 2)}{2}', '\\dfrac{3k^{2} + k + 6k + 4}{2}', '\\dfrac{3k^{2} + 7k + 4}{2}'], 2),
    (['5', '8', '11'], lambda v: f'(3{v} + 2)', lambda v: f'\\dfrac{{{v}(3{v} + 7)}}{{2}}', '(3k + 5)', '\\dfrac{(k + 1)(3k + 10)}{2}', ['3(1) + 2', '5'],
     ['\\dfrac{1(3 \\times 1 + 7)}{2}', '\\dfrac{10}{2}', '5'],
     ['\\dfrac{k(3k + 7)}{2} + \\dfrac{2(3k + 5)}{2}', '\\dfrac{3k^{2} + 7k + 6k + 10}{2}', '\\dfrac{3k^{2} + 13k + 10}{2}'], 2),
    (['3', '5', '7'], lambda v: f'(2{v} + 1)', lambda v: f'{v}({v} + 2)', '(2k + 3)', '(k + 1)(k + 3)', ['2(1) + 1', '3'], ['1(1 + 2)', '3'],
     ['k^{2} + 2k + 2k + 3', 'k^{2} + 4k + 3'], 1),
    (['2', '7', '12'], lambda v: f'(5{v} - 3)', lambda v: f'\\dfrac{{{v}(5{v} - 1)}}{{2}}', '(5k + 2)', '\\dfrac{(k + 1)(5k + 4)}{2}', ['5(1) - 3', '2'],
     ['\\dfrac{1(5 \\times 1 - 1)}{2}', '\\dfrac{4}{2}', '2'],
     ['\\dfrac{k(5k - 1)}{2} + \\dfrac{2(5k + 2)}{2}', '\\dfrac{5k^{2} - k + 10k + 4}{2}', '\\dfrac{5k^{2} + 9k + 4}{2}'], 2),
    (['1', '7', '13'], lambda v: f'(6{v} - 5)', lambda v: f'{v}(3{v} - 2)', '(6k + 1)', '(k + 1)(3k + 1)', ['6(1) - 5', '1'], ['1(3 \\times 1 - 2)', '1'],
     ['3k^{2} - 2k + 6k + 1', '3k^{2} + 4k + 1'], 1),
]
for nums, t, rr, tk1, rk1, s1l, s1r, mid, lv in ARITH:
    add(lv, nums, t, rr, tk1, rk1, s1l, s1r, [f'{rr("k")} + {tk1}', *mid, rk1])

# ---------------------------------------------------------------- 7. sums of products and powers: take out the common factor
POLY = [
    (['1^{2}', '2^{2}', '3^{2}'], lambda v: f'{v}^{{2}}', lambda v: f'\\dfrac{{{v}({v} + 1)(2{v} + 1)}}{{6}}', '(k + 1)^{2}', '\\dfrac{(k + 1)(k + 2)(2k + 3)}{6}',
     ['1^{2}', '1'], ['\\dfrac{1 \\times 2 \\times 3}{6}', '\\dfrac{6}{6}', '1'],
     ['\\dfrac{k(k + 1)(2k + 1)}{6} + \\dfrac{6(k + 1)^{2}}{6}', '\\dfrac{(k + 1)(k(2k + 1) + 6(k + 1))}{6}', '\\dfrac{(k + 1)(2k^{2} + 7k + 6)}{6}']),
    (['1^{3}', '2^{3}', '3^{3}'], lambda v: f'{v}^{{3}}', lambda v: f'\\dfrac{{{v}^{{2}}({v} + 1)^{{2}}}}{{4}}', '(k + 1)^{3}', '\\dfrac{(k + 1)^{2}(k + 2)^{2}}{4}',
     ['1^{3}', '1'], ['\\dfrac{1^{2} \\times 2^{2}}{4}', '\\dfrac{4}{4}', '1'],
     ['\\dfrac{k^{2}(k + 1)^{2}}{4} + \\dfrac{4(k + 1)^{3}}{4}', '\\dfrac{(k + 1)^{2}(k^{2} + 4(k + 1))}{4}', '\\dfrac{(k + 1)^{2}(k^{2} + 4k + 4)}{4}']),
    (['1 \\times 2', '2 \\times 3', '3 \\times 4'], lambda v: f'{v}({v} + 1)', lambda v: f'\\dfrac{{{v}({v} + 1)({v} + 2)}}{{3}}', '(k + 1)(k + 2)',
     '\\dfrac{(k + 1)(k + 2)(k + 3)}{3}', ['1(1 + 1)', '2'], ['\\dfrac{1 \\times 2 \\times 3}{3}', '\\dfrac{6}{3}', '2'],
     ['\\dfrac{k(k + 1)(k + 2)}{3} + \\dfrac{3(k + 1)(k + 2)}{3}']),
    (['1 \\times 3', '2 \\times 4', '3 \\times 5'], lambda v: f'{v}({v} + 2)', lambda v: f'\\dfrac{{{v}({v} + 1)(2{v} + 7)}}{{6}}', '(k + 1)(k + 3)',
     '\\dfrac{(k + 1)(k + 2)(2k + 9)}{6}', ['1(1 + 2)', '3'], ['\\dfrac{1 \\times 2 \\times 9}{6}', '\\dfrac{18}{6}', '3'],
     ['\\dfrac{k(k + 1)(2k + 7)}{6} + \\dfrac{6(k + 1)(k + 3)}{6}', '\\dfrac{(k + 1)(k(2k + 7) + 6(k + 3))}{6}', '\\dfrac{(k + 1)(2k^{2} + 13k + 18)}{6}']),
    (['1^{2}', '3^{2}', '5^{2}'], lambda v: f'(2{v} - 1)^{{2}}', lambda v: f'\\dfrac{{{v}(2{v} - 1)(2{v} + 1)}}{{3}}', '(2k + 1)^{2}',
     '\\dfrac{(k + 1)(2k + 1)(2k + 3)}{3}', ['(2 \\times 1 - 1)^{2}', '1'], ['\\dfrac{1 \\times 1 \\times 3}{3}', '\\dfrac{3}{3}', '1'],
     ['\\dfrac{k(2k - 1)(2k + 1)}{3} + \\dfrac{3(2k + 1)^{2}}{3}', '\\dfrac{(2k + 1)(k(2k - 1) + 3(2k + 1))}{3}', '\\dfrac{(2k + 1)(2k^{2} + 5k + 3)}{3}',
      '\\dfrac{(2k + 1)(k + 1)(2k + 3)}{3}']),
    (['1 \\times 2 \\times 3', '2 \\times 3 \\times 4', '3 \\times 4 \\times 5'], lambda v: f'{v}({v} + 1)({v} + 2)',
     lambda v: f'\\dfrac{{{v}({v} + 1)({v} + 2)({v} + 3)}}{{4}}', '(k + 1)(k + 2)(k + 3)', '\\dfrac{(k + 1)(k + 2)(k + 3)(k + 4)}{4}',
     ['1(1 + 1)(1 + 2)', '6'], ['\\dfrac{1 \\times 2 \\times 3 \\times 4}{4}', '\\dfrac{24}{4}', '6'],
     ['\\dfrac{k(k + 1)(k + 2)(k + 3)}{4} + \\dfrac{4(k + 1)(k + 2)(k + 3)}{4}']),
    (['2^{2}', '4^{2}', '6^{2}'], lambda v: f'(2{v})^{{2}}', lambda v: f'\\dfrac{{2{v}({v} + 1)(2{v} + 1)}}{{3}}', '(2k + 2)^{2}',
     '\\dfrac{2(k + 1)(k + 2)(2k + 3)}{3}', ['(2 \\times 1)^{2}', '4'], ['\\dfrac{2 \\times 1 \\times 2 \\times 3}{3}', '\\dfrac{12}{3}', '4'],
     ['\\dfrac{2k(k + 1)(2k + 1)}{3} + 4(k + 1)^{2}', '\\dfrac{2k(k + 1)(2k + 1)}{3} + \\dfrac{12(k + 1)^{2}}{3}',
      '\\dfrac{2(k + 1)(k(2k + 1) + 6(k + 1))}{3}', '\\dfrac{2(k + 1)(2k^{2} + 7k + 6)}{3}']),
]
for nums, t, rr, tk1, rk1, s1l, s1r, mid in POLY:
    add(3 if len(mid) > 1 else 2, nums, t, rr, tk1, rk1, s1l, s1r, [f'{rr("k")} + {tk1}', *mid, rk1])

# ---------------------------------------------------------------- 8. telescoping: 1/((mn - m + 1)(mn + 1)) summed = n/(mn + 1)
for m in (1, 2, 3, 4):
    lo = lambda v, m=m: (v if m == 1 else f'({m}{v} - {m - 1})')   # the first factor of the term
    hi = lambda v, m=m: (f'({v} + 1)' if m == 1 else f'({m}{v} + 1)')
    t = lambda v: f'\\dfrac{{1}}{{{lo(v)}{hi(v)}}}'
    rr = lambda v, m=m: f'\\dfrac{{{v}}}{{{v} + 1}}' if m == 1 else f'\\dfrac{{{v}}}{{{m}{v} + 1}}'
    A, B = ('(k + 1)', '(k + 2)') if m == 1 else (f'({m}k + 1)', f'({m}k + {m + 1})')   # the two factors of the (k+1)th term
    tk1, rk1 = f'\\dfrac{{1}}{{{A}{B}}}', f'\\dfrac{{k + 1}}{{{B[1:-1]}}}'
    k2 = 'k^{2}' if m == 1 else f'{m}k^{{2}}'
    nums = [f'\\dfrac{{1}}{{{(m * i - m + 1)} \\times {(m * i + 1)}}}' for i in (1, 2, 3)]
    s1l = [f'\\dfrac{{1}}{{1(1 + 1)}}' if m == 1 else f'\\dfrac{{1}}{{({m} \\times 1 - {m - 1})({m} \\times 1 + 1)}}', f'\\dfrac{{1}}{{{m + 1}}}']
    s1r = [f'\\dfrac{{1}}{{1 + 1}}' if m == 1 else f'\\dfrac{{1}}{{{m} \\times 1 + 1}}', f'\\dfrac{{1}}{{{m + 1}}}']
    chain = [f'{rr("k")} + {tk1}', f'\\dfrac{{k{B}}}{{{A}{B}}} + \\dfrac{{1}}{{{A}{B}}}', f'\\dfrac{{{k2} + {m + 1}k + 1}}{{{A}{B}}}',
             f'\\dfrac{{{A}(k + 1)}}{{{A}{B}}}', rk1]
    add(3, nums, t, rr, tk1, rk1, s1l, s1r, chain)

# ---------------------------------------------------------------- 9. two more that need a different idea
add(3, ['1 \\times 1!', '2 \\times 2!', '3 \\times 3!'], lambda v: f'{v} \\times {v}!', lambda v: f'({v} + 1)! - 1', '(k + 1) \\times (k + 1)!', '(k + 2)! - 1',
    ['1 \\times 1!', '1'], ['(1 + 1)! - 1', '2! - 1', '1'],
    ['(k + 1)! - 1 + (k + 1) \\times (k + 1)!', '(k + 1)!(1 + k + 1) - 1', '(k + 2)(k + 1)! - 1', '(k + 2)! - 1'])
add(3, ['1', '2 \\times 2', '3 \\times 2^{2}'], lambda v: f'{v}(2^{{{v} - 1}})', lambda v: f'({v} - 1)2^{{{v}}} + 1', '(k + 1)2^{k}', 'k(2^{k+1}) + 1',
    ['1(2^{1 - 1})', '1'], ['(1 - 1)2^{1} + 1', '1'],
    ['(k - 1)2^{k} + 1 + (k + 1)2^{k}', '2^{k}(k - 1 + k + 1) + 1', '2k(2^{k}) + 1', 'k(2^{k+1}) + 1'])

json.dump(OUT, open(os.path.join(HERE, 'quick-ext1-proof.raw.json'), 'w'), indent=1)
print(f'{len(OUT)} induction drills, every line checked')
