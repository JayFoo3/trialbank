"""Quick questions: Maths Advanced, Sequences and Series (steps ss1-ss8).
Every question comes from a template with random numbers; the answer is computed here, never typed by hand,
and the wrong options are the answers you get from the usual mistakes. Math is written \\( ... \\) and rendered by KaTeX later.
Output: quick_adv_ss.json  [{step, prompt, options[4], answer 'A'-'D', why}]"""
import json, math, random, sys
from fractions import Fraction as F

R = random.Random(20261028)


def tf(x):
    """a number as TeX: integers plainly, fractions as \\frac, negatives with a leading minus"""
    x = F(x)
    if x.denominator == 1: return str(x.numerator)
    s = '-' if x < 0 else ''
    return f'{s}\\frac{{{abs(x.numerator)}}}{{{x.denominator}}}'


def m(t): return f'\\({t}\\)'
def money(v, cents=False): return f'${v:,.2f}' if cents else f'${round(v):,}'


def ordn(n): return f'{n}{"th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")}'


def series(*terms):
    """a + b + c + ... + last, with minus signs where terms are negative"""
    out = tf(terms[0])
    for t in terms[1:]:
        out += r' + \dots' if t == '...' else (f' - {tf(-F(t))}' if F(t) < 0 else f' + {tf(t)}')
    return out


def seq_list(terms): return ',\\ '.join(tf(t) for t in terms) + ',\\ \\dots'


OUT, SEEN = [], set()


def add(step, prompt, right, wrong, why, fmt=lambda v: m(tf(v)), near=None):
    """right: the answer; wrong: mistake answers. Fills up to 3 distinct wrong options, shuffles, records the letter."""
    opts, keys = [fmt(right)], {fmt(right)}
    for w in wrong:
        f = fmt(w)
        if f not in keys and len(opts) < 4: opts.append(f); keys.add(f)
    near = near or (lambda k: right + k)
    k = 1
    while len(opts) < 4:   # not enough distinct mistakes: nearby values
        for c in (near(k), near(-k)):
            f = fmt(c)
            if f not in keys and len(opts) < 4: opts.append(f); keys.add(f)
        k += 1
    if prompt in SEEN: return
    SEEN.add(prompt)
    order = list(range(4)); R.shuffle(order)
    OUT.append(dict(step=step, prompt=prompt, options=[opts[i] for i in order], answer='ABCD'[order.index(0)], why=why))


# ---------------- ss1: notation, partial sums, sigma ----------------
for _ in range(60):
    kind = R.randrange(5)
    if kind == 0:   # nth term from a formula
        a, b, n = R.randint(1, 4), R.randint(-6, 9), R.randint(3, 9)
        T = lambda k: a * k * k + b
        add('ss1', f'A sequence is defined by {m(f"T_n = {a if a > 1 else ""}n^2 {"+" if b >= 0 else "-"} {abs(b)}")}. Find {m(f"T_{{{n}}}")}.',
            T(n), [a * n * 2 + b, (a * n) ** 2 + b, T(n - 1)], m(f'T_{{{n}}} = {a if a > 1 else ""}({n})^2 {"+" if b >= 0 else "-"} {abs(b)} = {T(n)}'))
    elif kind == 1:   # evaluate a sigma sum of a linear expression
        p, q, N = R.randint(2, 6), R.randint(-5, 6), R.randint(4, 9)
        s = sum(p * k + q for k in range(1, N + 1))
        add('ss1', f'Evaluate {m(f"\\sum_{{k=1}}^{{{N}}} ({p}k {"+" if q >= 0 else "-"} {abs(q)})")}.',
            s, [s - (p * N + q), sum(p * k for k in range(1, N + 1)) + q, s + p + q],
            f'There are {N} terms: {m(f"{p + q} + {2 * p + q} + \\dots + {p * N + q}")}. Their sum is {m(f"\\frac{{{N}}}{{2}}({p + q} + {p * N + q}) = {s}")}.')
    elif kind == 2:   # term from the partial sums
        a, b, n = R.randint(1, 3), R.randint(1, 7), R.randint(4, 10)
        S = lambda k: a * k * k + b * k
        add('ss1', f'The sum of the first {m("n")} terms of a sequence is {m(f"S_n = {a if a > 1 else ""}n^2 + {b}n")}. Find {m(f"T_{{{n}}}")}.',
            S(n) - S(n - 1), [S(n), S(n) - S(n - 2), S(n + 1) - S(n)],
            m(f'T_{{{n}}} = S_{{{n}}} - S_{{{n - 1}}} = {S(n)} - {S(n - 1)} = {S(n) - S(n - 1)}'))
    elif kind == 3:   # how many terms in a sigma sum
        lo, hi = R.randint(2, 9), R.randint(15, 40)
        add('ss1', f'How many terms are in {m(f"\\sum_{{k={lo}}}^{{{hi}}} (3k-1)")}?', hi - lo + 1, [hi - lo, hi, hi - lo + 2],
            f'From {m(f"k={lo}")} to {m(f"k={hi}")} there are {m(f"{hi} - {lo} + 1 = {hi - lo + 1}")} terms.', fmt=lambda v: m(str(v)))
    else:   # write a series in sigma notation
        a, d, N = R.randint(1, 6), R.randint(2, 5), R.randint(8, 14)
        last = a + (N - 1) * d
        c = a - d
        def sig(dd, cc, top):
            return m(f'\\sum_{{k=1}}^{{{top}}} ({dd}k {"+" if cc >= 0 else "-"} {abs(cc)})') if cc else m(f'\\sum_{{k=1}}^{{{top}}} {dd}k')
        right = sig(d, c, N)
        wrong = [sig(d, c, last), sig(d, a, N), sig(a, d, N)]
        add('ss1', f'Which of these is {m(f"{a} + {a + d} + {a + 2 * d} + \\dots + {last}")}?', right, wrong,
            f'Each term is {d} more than the last, so the {m("k")}th term is {m(f"{d}k {"+" if c >= 0 else "-"} {abs(c)}")}, and {m(f"{last}")} is term number {N}.',
            fmt=lambda v: v, near=lambda k: sig(d, c, N + k))

# ---------------- ss2: arithmetic sequences ----------------
for _ in range(70):
    kind = R.randrange(6)
    a, d = R.randint(-8, 20), R.choice([-7, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 9])
    if kind == 0:   # nth term
        n = R.randint(12, 40); T = a + (n - 1) * d
        add('ss2', f'Find the {ordn(n)} term of the arithmetic sequence {m(seq_list([a, a + d, a + 2 * d]))}', T, [a + n * d, a + (n - 2) * d, n * d],
            m(f'a = {a},\\ d = {d},\\ T_{{{n}}} = {a} + {n - 1}({d}) = {T}'))
    elif kind == 1:   # common difference from two terms
        p, q = R.randint(2, 6), R.randint(9, 20)
        Tp, Tq = a + (p - 1) * d, a + (q - 1) * d
        add('ss2', f'In an arithmetic sequence, {m(f"T_{{{p}}} = {Tp}")} and {m(f"T_{{{q}}} = {Tq}")}. Find the common difference.', d,
            [F(Tq - Tp, q - p + 1), F(Tq - Tp, q - p - 1) if q - p > 1 else d * 2, -d],
            m(f'd = \\frac{{{Tq} - ({Tp})}}{{{q} - {p}}} = \\frac{{{Tq - Tp}}}{{{q - p}}} = {d}'))
    elif kind == 2:   # first term from a term and d
        p = R.randint(5, 15); Tp = a + (p - 1) * d
        add('ss2', f'An arithmetic sequence has common difference {m(str(d))} and {m(f"T_{{{p}}} = {Tp}")}. Find the first term.', a,
            [Tp - p * d, Tp + (p - 1) * d, Tp - (p - 2) * d],
            m(f'{Tp} = a + {p - 1}({d}) \\Rightarrow a = {Tp} - ({(p - 1) * d}) = {a}'))
    elif kind == 3:   # which term equals X
        d = abs(d); n = R.randint(15, 60); X = a + (n - 1) * d
        add('ss2', f'Which term of {m(seq_list([a, a + d, a + 2 * d]))} is equal to {m(str(X))}?', n, [n - 1, n + 1, F(X, d)] if X % d == 0 else [n - 1, n + 1, n + 2],
            m(f'{a} + (n-1)({d}) = {X} \\Rightarrow n - 1 = {n - 1} \\Rightarrow n = {n}'), fmt=lambda v: m(f'T_{{{tf(v)}}}') if F(v).denominator == 1 else m(tf(v)))
    elif kind == 4:   # number of terms between first and last
        d = abs(d); n = R.randint(10, 45); L = a + (n - 1) * d
        add('ss2', f'How many terms are in the arithmetic sequence {m(f"{a},\\ {a + d},\\ {a + 2 * d},\\ \\dots,\\ {L}")}?', n, [n - 1, n + 1, F(L - a, d) + 2],
            m(f'{L} = {a} + (n-1)({d}) \\Rightarrow n - 1 = {n - 1} \\Rightarrow n = {n}'), fmt=lambda v: m(tf(v)))
    else:   # find x so three expressions form an AP: (x+p), (2x+q), (4x+r) with 2(2x+q) = (x+p)+(4x+r) -> x = 2q - p - r
        x = R.randint(-4, 9); p, r = R.randint(-6, 6), R.randint(-6, 6)
        q = F(5 * x - 4 * x + p + r, 2)   # 4x+2q = 5x+p+r -> q = (x+p+r)/2
        if q.denominator != 1: continue
        q = int(q)
        e = lambda c, k: f'{c if c != 1 else ""}x {"+" if k >= 0 else "-"} {abs(k)}' if k else f'{c if c != 1 else ""}x'
        add('ss2', f'Find {m("x")} if {m(e(1, p))}, {m(e(2, q))} and {m(e(4, r))} are consecutive terms of an arithmetic sequence.', x,
            [-x if x else 3, x + 2, 2 * q - p - r],
            f'The middle term is the average of its neighbours: {m(f"2({e(2, q)}) = ({e(1, p)}) + ({e(4, r)})")}, so {m(f"x = {x}")}.')

# ---------------- ss3: arithmetic series ----------------
for _ in range(70):
    kind = R.randrange(4)
    a, d, n = R.randint(-5, 25), R.choice([-4, -3, -2, 2, 3, 4, 5, 6]), R.randint(10, 30)
    S = n * (2 * a + (n - 1) * d) // 2 if (n * (2 * a + (n - 1) * d)) % 2 == 0 else F(n * (2 * a + (n - 1) * d), 2)
    L = a + (n - 1) * d
    if kind == 0:
        add('ss3', f'Find the sum of the first {n} terms of {m(seq_list([a, a + d, a + 2 * d]))}', S,
            [F(n * (2 * a + n * d), 2), F((n - 1) * (2 * a + (n - 2) * d), 2), n * (a + L)],
            m(f'S_{{{n}}} = \\frac{{{n}}}{{2}}\\left[2({a}) + {n - 1}({d})\\right] = {tf(S)}'))
    elif kind == 1:
        add('ss3', f'Find {m(series(a, a + d, a + 2 * d, '...', L))}.', S, [n * (a + L), F((n - 1) * (a + L), 2), F((n + 1) * (a + L), 2)],
            f'There are {m(f"\\frac{{{L} - ({a})}}{{{d}}} + 1 = {n}")} terms, so {m(f"S = \\frac{{{n}}}{{2}}({a} + {L}) = {tf(S)}")}.')
    elif kind == 2:   # multiples of k between A and B
        k = R.randint(3, 9); A = R.randint(10, 60); B = A + R.randint(80, 300)
        if A % k == 0 or B % k == 0: continue   # neither end a multiple, so "between" can't be read two ways
        first, last = -(-A // k) * k, B // k * k; cnt = (last - first) // k + 1; tot = cnt * (first + last) // 2
        add('ss3', f'Find the sum of all the multiples of {k} between {A} and {B}.', tot,
            [(cnt - 1) * (first + last) // 2, (cnt + 1) * (first + last) // 2, cnt * (first + last)],
            f'The multiples run {m(f"{first}, {first + k}, \\dots, {last}")}: that is {cnt} terms, so the sum is {m(f"\\frac{{{cnt}}}{{2}}({first} + {last}) = {tot}")}.',
            fmt=lambda v: m(f'{tf(v)}'))
    else:   # how many terms to reach a given sum (positive d, positive a)
        a, d, n = R.randint(1, 12), R.randint(2, 6), R.randint(8, 25)
        Sn = n * (2 * a + (n - 1) * d) // 2
        if (n * (2 * a + (n - 1) * d)) % 2: continue
        add('ss3', f'How many terms of {m(seq_list([a, a + d, a + 2 * d]))} must be added to give a sum of {m(str(Sn))}?', n, [n - 1, n + 1, n + 2],
            m(f'\\frac{{n}}{{2}}\\left[{2 * a} + (n-1)({d})\\right] = {Sn} \\Rightarrow n = {n}') + ' (the other solution of the quadratic is negative).',
            fmt=lambda v: m(str(v)))

# ---------------- ss4: arithmetic models ----------------
for _ in range(60):
    kind = R.randrange(4)
    if kind == 0:   # savings week n
        a, d, n = R.choice([5, 10, 15, 20, 25]), R.choice([2, 3, 4, 5]), R.randint(10, 40)
        add('ss4', f'Mia saves {money(a)} in week 1 and {money(d)} more each week than the week before. How much does she save in week {n}?',
            a + (n - 1) * d, [a + n * d, a * n, a + (n - 2) * d], f'{m(f"T_{{{n}}} = {a} + {n - 1} \\times {d} = {a + (n - 1) * d}")}, so {money(a + (n - 1) * d)}.', fmt=money)
    elif kind == 1:   # total saved
        a, d, n = R.choice([5, 10, 15, 20]), R.choice([2, 3, 4, 5]), R.randint(10, 30)
        tot = n * (2 * a + (n - 1) * d) // 2
        add('ss4', f'Ari saves {money(a)} in week 1 and {money(d)} more each week. How much has he saved in total after {n} weeks?', tot,
            [n * (2 * a + n * d) // 2, a + (n - 1) * d, n * a + n * d], f'{m(f"S_{{{n}}} = \\frac{{{n}}}{{2}}\\left[2({a}) + {n - 1}({d})\\right] = {tot}")}, so {money(tot)}.', fmt=money)
    elif kind == 2:   # seats in a theatre
        a, d, n = R.randint(14, 30), R.randint(2, 4), R.randint(12, 30)
        tot = n * (2 * a + (n - 1) * d) // 2
        add('ss4', f'A theatre has {a} seats in the front row and each row after has {d} more seats than the row in front. There are {n} rows. How many seats are there altogether?',
            tot, [n * (2 * a + n * d) // 2, a + (n - 1) * d, n * a], m(f'S_{{{n}}} = \\frac{{{n}}}{{2}}\\left[2({a}) + {n - 1}({d})\\right] = {tot}'), fmt=lambda v: m(f'{v:,}'.replace(',', '{,}')))
    else:   # linear decay: water tank
        V, d = R.choice([2000, 2400, 3000, 3600, 4500]), R.choice([40, 60, 75, 80, 90, 120])
        n = V // d + (1 if V % d else 0)
        add('ss4', f'A tank holds {V:,} L. On day 1, {d} L is used, and the same amount is used every day after. After how many days is the tank first empty?', n,
            [n - 1, n + 1, V // d - 1 if V % d == 0 else n + 2], f'{m(f"{V} \\div {d} = {tf(F(V, d)) if F(V, d).denominator == 1 else round(V / d, 2)}")}, so it is first empty after {n} days.',
            fmt=lambda v: m(f'{v}\\text{{ days}}'))

# ---------------- ss5: geometric sequences ----------------
for _ in range(70):
    kind = R.randrange(5)
    a, r = R.choice([1, 2, 3, 4, 5, -2, -3]), R.choice([2, 3, -2, F(1, 2), F(-1, 2), F(1, 3), 4])
    if kind == 0:   # nth term
        n = R.randint(5, 9); T = a * F(r) ** (n - 1)
        add('ss5', f'Find the {ordn(n)} term of the geometric sequence {m(seq_list([a, a * r, a * r * r]))}', T, [a * F(r) ** n, (a * F(r)) ** (n - 1), a * F(r) ** (n - 2)],
            m(f'a = {a},\\ r = {tf(r)},\\ T_{{{n}}} = {a}\\left({tf(r)}\\right)^{{{n - 1}}} = {tf(T)}'))
    elif kind == 1:   # common ratio from terms
        add('ss5', f'Find the common ratio of {m(seq_list([a * r ** 2, a * r ** 3, a * r ** 4]))}', r, [F(1) / F(r), -F(r), F(r) * 2],
            m(f'r = \\frac{{T_2}}{{T_1}} = \\frac{{{tf(a * F(r) ** 3)}}}{{{tf(a * F(r) ** 2)}}} = {tf(r)}'))
    elif kind == 2:   # first term exceeding X
        a, r = R.choice([2, 3, 4, 5, 6]), R.choice([2, 3])
        X = R.choice([1000, 5000, 10000, 50000, 100000])
        n = 1
        while a * r ** (n - 1) <= X: n += 1
        add('ss5', f'In the sequence {m(seq_list([a, a * r, a * r * r]))} which is the first term greater than {m(f"{X:,}".replace(",", "{,}"))}?', n, [n - 1, n + 1, n + 2],
            f'{m(f"{a}({r})^{{n-1}} > {X}")} gives {m(f"n - 1 > \\log_{{{r}}}\\frac{{{X}}}{{{a}}} \\approx {math.log(X / a, r):.2f}")}, so {m(f"n = {n}")}.',
            fmt=lambda v: m(f'T_{{{v}}}'))
    elif kind == 3:   # find x for a GP: x, x+k, ... simple: 2, x, 18 -> x = ±6
        p, q = R.choice([(2, 18), (3, 12), (4, 25), (5, 20), (2, 32), (3, 27), (1, 49), (4, 9)])
        x = math.isqrt(p * q)
        if x * x != p * q: continue
        add('ss5', f'The numbers {m(f"{p},\\ x,\\ {q}")} are consecutive terms of a geometric sequence. Find the possible values of {m("x")}.', f'\\pm {x}',
            [str(x), f'{(p + q) // 2 if (p + q) % 2 == 0 else tf(F(p + q, 2))}', f'\\pm {(p + q) // 2 if (p + q) % 2 == 0 else tf(F(p + q, 2))}'],
            m(f'\\frac{{x}}{{{p}}} = \\frac{{{q}}}{{x}} \\Rightarrow x^2 = {p * q} \\Rightarrow x = \\pm {x}'), fmt=lambda v: m(f'x = {v}'), near=lambda k: f'\\pm {x + k}')
    else:   # find a from term and ratio
        r = R.choice([2, 3, -2]); p = R.randint(4, 7); a = R.choice([1, 2, 3, 5, -1, -3]); Tp = a * r ** (p - 1)
        add('ss5', f'A geometric sequence has common ratio {m(str(r))} and {m(f"T_{{{p}}} = {Tp}")}. Find the first term.', a, [F(Tp, r ** p), F(Tp, r ** (p - 2)), -a],
            m(f'{Tp} = a({r})^{{{p - 1}}} = {r ** (p - 1)}a \\Rightarrow a = {a}'))

# ---------------- ss6: geometric series ----------------
for _ in range(60):
    kind = R.randrange(3)
    a, r, n = R.choice([1, 2, 3, 4, 5]), R.choice([2, 3, -2, 4]), R.randint(5, 10)
    S = a * (r ** n - 1) // (r - 1)
    if kind == 0:
        add('ss6', f'Find the sum of the first {n} terms of {m(seq_list([a, a * r, a * r * r]))}', S,
            [a * (r ** (n + 1) - 1) // (r - 1), a * (r ** (n - 1) - 1) // (r - 1), a * r ** (n - 1)],
            m(f'S_{{{n}}} = \\frac{{{a}\\left(({r})^{{{n}}} - 1\\right)}}{{{r} - 1}} = {S}'))
    elif kind == 1:
        add('ss6', f'Evaluate {m(f"\\sum_{{k=1}}^{{{n}}} {a if a > 1 else ""}({r})^{{k-1}}" if r < 0 else f"\\sum_{{k=1}}^{{{n}}} {a if a > 1 else ""}\\cdot {r}^{{k-1}}")}.', S,
            [a * (r ** (n + 1) - 1) // (r - 1), a * r ** (n - 1), a * (r ** n - 1)],
            f'A geometric series with {m(f"a = {a}")}, {m(f"r = {r}")} and {n} terms: {m(f"S = \\frac{{{a}\\left(({r})^{{{n}}} - 1\\right)}}{{{r} - 1}} = {S}")}.')
    else:   # how many terms for a given sum
        a, r, n = R.choice([1, 2, 3, 5]), R.choice([2, 3]), R.randint(5, 10)
        S = a * (r ** n - 1) // (r - 1)
        add('ss6', f'How many terms of {m(seq_list([a, a * r, a * r * r]))} add to {m(f"{S:,}".replace(",", "{,}"))}?', n, [n - 1, n + 1, n + 2],
            m(f'\\frac{{{a}({r}^n - 1)}}{{{r - 1}}} = {S} \\Rightarrow {r}^n = {r ** n} \\Rightarrow n = {n}'), fmt=lambda v: m(str(v)))

# ---------------- ss7: limiting sums ----------------
for _ in range(60):
    kind = R.randrange(5)
    if kind == 0:
        a, r = R.choice([2, 3, 4, 6, 8, 9, 12, 18, 24, 27]), R.choice([F(1, 2), F(1, 3), F(2, 3), F(-1, 2), F(1, 4), F(3, 4), F(-1, 3)])
        add('ss7', f'Find the limiting sum of {m(seq_list([a, a * r, a * r * r]))}', F(a) / (1 - r), [F(a) / (1 + r), F(a) * r / (1 - r), F(a) / r],
            m(f'S_\\infty = \\frac{{a}}{{1-r}} = \\frac{{{a}}}{{1 - \\left({tf(r)}\\right)}} = {tf(F(a) / (1 - r))}'))
    elif kind == 1:   # find r from S and a
        a, r = R.choice([3, 4, 5, 6, 8, 10, 12]), R.choice([F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(-1, 2)])
        Sinf = F(a) / (1 - r)
        add('ss7', f'A geometric series has first term {m(str(a))} and limiting sum {m(tf(Sinf))}. Find the common ratio.', r, [1 - Sinf / a if Sinf != a else F(1, 5), F(a) / Sinf, -r],
            m(f'{tf(Sinf)} = \\frac{{{a}}}{{1-r}} \\Rightarrow 1 - r = {tf(F(a) / Sinf)} \\Rightarrow r = {tf(r)}'))
    elif kind == 2:   # values of x for a limiting sum of 1 + (x - c) + (x - c)^2 + ...
        c = R.randint(-3, 4)
        e = f'(x {"-" if c > 0 else "+"} {abs(c)})' if c else 'x'
        right = f'{c - 1} < x < {c + 1}'
        add('ss7', f'For which values of {m("x")} does {m(f"1 + {e} + {e}^2 + \\dots")} have a limiting sum?', right,
            [f'{c - 1} \\le x \\le {c + 1}', f'x < {c + 1}', f'-1 < x < 1' if c else f'{c} < x < {c + 2}'],
            f'It needs {m("|r| < 1")}: {m(f"-1 < {e} < 1")}, so {m(right)}.', fmt=lambda v: m(v), near=lambda k: f'{c - 1 - k} < x < {c + 1 + k}')
    elif kind == 3:   # recurring decimal
        num = R.choice([12, 15, 18, 27, 36, 45, 54, 63, 72, 81, 24, 42, 57, 75])
        digits = f'{num:02d}'
        frac = F(num, 99)
        add('ss7', f'Write {m(f"0.\\dot{{{digits[0]}}}\\dot{{{digits[1]}}}")} as a fraction in simplest form.', frac, [F(num, 100), F(num, 90), F(num + 1, 99)],
            f'{m(f"0.{digits}{digits}\\dots = \\frac{{{num}}}{{100}} + \\frac{{{num}}}{{100^2}} + \\dots = \\frac{{{num}/100}}{{1 - 1/100}} = \\frac{{{num}}}{{99}} = {tf(frac)}")}.')
    else:   # bouncing ball total distance
        h, r = R.choice([2, 3, 4, 5, 6, 8, 9, 10, 12]), R.choice([F(1, 2), F(2, 3), F(3, 4), F(3, 5), F(1, 3)])
        tot = h + 2 * h * r / (1 - r)
        add('ss7', f'A ball is dropped from {h} m and each bounce reaches {m(tf(r))} of the height before. How far does it travel in total?', tot,
            [F(h) / (1 - r), h + h * r / (1 - r), 2 * F(h) / (1 - r)],
            f'Down {h} m, then up and down each bounce: {m(f"{h} + 2 \\times \\frac{{{tf(h * r)}}}{{1 - {tf(r)}}} = {tf(tot)}")} m.', fmt=lambda v: m(f'{tf(v)}\\text{{ m}}'))

# ---------------- ss8: geometric models ----------------
for _ in range(60):
    kind = R.randrange(4)
    if kind == 0:   # growth
        P, p, n = R.choice([12000, 25000, 40000, 80000, 150000]), R.choice([2, 3, 4, 5, 6, 8]), R.randint(5, 15)
        v = P * (1 + p / 100) ** n
        add('ss8', f'A town of {P:,} people grows by {p}% each year. What is the population after {n} years, to the nearest person?', round(v),
            [round(P * (1 + p / 100) ** (n - 1)), round(P * (1 + p * n / 100)), round(P * (1 + p / 100) ** (n + 1))],
            m(f'{P} \\times {1 + p / 100:g}^{{{n}}} \\approx {round(v):,}'.replace(',', '{,}')), fmt=lambda x: m(f'{x:,}'.replace(',', '{,}')), near=lambda k: round(v) + 10 * k)
    elif kind == 1:   # depreciation
        P, p, n = R.choice([18000, 24000, 32000, 45000]), R.choice([10, 12, 15, 18, 20]), R.randint(3, 8)
        v = P * (1 - p / 100) ** n
        add('ss8', f'A car bought for {money(P)} loses {p}% of its value each year. What is it worth after {n} years, to the nearest dollar?', round(v),
            [round(P * (1 - p / 100) ** (n - 1)), round(P * (1 - p * n / 100)), round(P * (1 - p / 100) ** (n + 1))],
            f'{m(f"{P} \\times {1 - p / 100:g}^{{{n}}}")} = {money(v)}', fmt=money, near=lambda k: round(v) + 25 * k)
    elif kind == 2:   # total salary over n years
        S, p, n = R.choice([50000, 60000, 65000, 72000, 80000]), R.choice([2, 3, 4, 5]), R.randint(5, 12)
        r = 1 + p / 100; tot = S * (r ** n - 1) / (r - 1)
        add('ss8', f'Sam earns {money(S)} in the first year and gets a {p}% rise every year. How much does Sam earn in total over {n} years, to the nearest dollar?', round(tot),
            [round(S * (r ** (n + 1) - 1) / (r - 1)), round(S * r ** (n - 1)), round(S * n * (1 + p / 100))],
            f'A geometric series with {m(f"a = {S}")}, {m(f"r = {r:g}")}: {m(f"S_{{{n}}} = \\frac{{{S}({r:g}^{{{n}}} - 1)}}{{{r:g} - 1}}")} = {money(tot)}', fmt=money, near=lambda k: round(tot) + 100 * k)
    else:   # first year a growth passes a target
        P, p, T = R.choice([1000, 2000, 5000]), R.choice([5, 8, 10, 12]), R.choice([2, 3])
        n = 0
        while P * (1 + p / 100) ** n < T * P: n += 1
        add('ss8', f'An investment of {money(P)} grows by {p}% each year. After how many whole years is it first worth more than {money(T * P)}?', n, [n - 1, n + 1, math.ceil(100 * (T - 1) / p)],
            f'{m(f"{1 + p / 100:g}^n > {T}")} gives {m(f"n > \\frac{{\\ln {T}}}{{\\ln {1 + p / 100:g}}} \\approx {math.log(T) / math.log(1 + p / 100):.2f}")}, so {n} years.',
            fmt=lambda v: m(f'{v}\\text{{ years}}'))

# keep about 40 per step, spread across kinds (the generator already varies them)
by = {}
for q in OUT: by.setdefault(q['step'], []).append(q)
final = []
for s in sorted(by):
    final += by[s][:42]
json.dump(final, open('quick_adv_ss.json', 'w'), indent=1)
print({s: min(len(v), 42) for s, v in sorted(by.items())}, 'total', len(final))
