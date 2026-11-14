"""Trialbank versions of the 2023 Mathematics Extension 1 HSC questions (first batch: the ones with no diagram).
Every answer below is worked out or checked with sympy / exact arithmetic before it is written into a model answer."""
import math, itertools
import sympy as sp
from sympy import Rational as Q, latex, sqrt, pi, sin, cos, exp, log, symbols, integrate, diff, simplify, binomial, factorial, asin
from rw import Paper
x, t, u, a, b, n, k = symbols('x t u a b n k')
m = lambda e: '\\(' + (e if isinstance(e, str) else latex(e)) + '\\)'
P = Paper('hsc-ext1-2023', seed=2023)

# ---- Q1 Newton's law of cooling: the temperature at t = 0
A0, B0, K0 = 22, 6, 2
T = A0 + B0 * exp(-K0 * t); T0 = T.subs(t, 0); assert T0 == 28
P.M('q01', f"An object cools so that its temperature after \\(t\\) seconds is \\(T = {A0} + {B0}e^{{-{K0}t}}\\) degrees Celsius. What is the temperature of the object at the start?",
    m(f'{T0}'), [m(f'{A0}'), m(f'{B0}'), m(f'-{K0}')],
    f"At the start \\(t = 0\\), so \\(T = {A0} + {B0}e^0 = {A0} + {B0} = {T0}\\). The {A0} is the temperature it settles towards, not where it begins.")

# ---- Q2 sample proportion: "at least r of n" as a statement about p-hat
N2, R2 = 20, 12; prop = Q(R2, N2); assert prop == Q(3, 5)
P.M('q02', f"A fair six-sided die is rolled {N2} times, and \\(\\hat{{p}}\\) is the proportion of rolls that show a 5. Which expression is the probability that at least {R2} of the rolls show a 5?",
    m(f'P\\left(\\hat{{p}} \\ge {latex(prop)}\\right)'), [m('P\\left(\\hat{p} \\ge \\frac{1}{6}\\right)'), m(f'P\\left(\\hat{{p}} \\le {latex(prop)}\\right)'), m('P\\left(\\hat{p} \\le \\frac{1}{6}\\right)')],
    f"At least {R2} of {N2} rolls is a proportion of at least \\(\\frac{{{R2}}}{{{N2}}} = {latex(prop)}\\). The \\(\\frac{{1}}{{6}}\\) is the chance of a 5 on one roll, not the proportion being asked about.")

# ---- Q5 inverse sine of sine outside the principal range
for av in (2.0, 3.0, 4.5):   # pi/2 < a < 3pi/2
    assert abs(math.asin(math.sin(av)) - (math.pi - av)) < 1e-12
P.M('q05', "What is the value of \\(\\sin^{-1}(\\sin a)\\), given that \\(\\frac{\\pi}{2} < a < \\frac{3\\pi}{2}\\)?",
    m('\\pi - a'), [m('a - \\pi'), m('a'), m('-a')],
    "\\(\\sin^{-1}\\) only gives angles from \\(-\\frac{\\pi}{2}\\) to \\(\\frac{\\pi}{2}\\). Since \\(\\sin a = \\sin(\\pi - a)\\) and \\(\\pi - a\\) lies in that range, the answer is \\(\\pi - a\\).")

# ---- Q6 projection: scaling the vector scales the projection, scaling what it is projected onto does not
va, vb = sp.Matrix([3, -2]), sp.Matrix([1, 4]); proj = lambda p, q: (p.dot(q) / q.dot(q)) * q
assert proj(6 * va, 3 * vb) == 6 * proj(va, vb)
P.M('q06', "\\(\\underset{\\sim}{a}\\) and \\(\\underset{\\sim}{b}\\) are non-zero vectors, and \\(\\underset{\\sim}{c}\\) is the projection of \\(\\underset{\\sim}{a}\\) onto \\(\\underset{\\sim}{b}\\). What is the projection of \\(6\\underset{\\sim}{a}\\) onto \\(3\\underset{\\sim}{b}\\)?",
    m('6\\underset{\\sim}{c}'), [m('2\\underset{\\sim}{c}'), m('3\\underset{\\sim}{c}'), m('18\\underset{\\sim}{c}')],
    "Projecting onto \\(3\\underset{\\sim}{b}\\) is the same as projecting onto \\(\\underset{\\sim}{b}\\), because only its direction matters. Making \\(\\underset{\\sim}{a}\\) six times as long makes the projection six times as long.")

# ---- Q7 which inverse trig comparison always holds
for av, bv in [(-1, 1), (-0.5, 0.2), (0, 1), (-1, 0), (0.3, 0.31)]:
    assert math.acos(av) > math.acos(bv)
assert not (1 / math.cos(-1) < 1 / math.cos(0)) and not (math.asin(-1) > math.asin(0))
P.M('q07', "\\(a\\) and \\(b\\) are real numbers with \\(-1 \\le a < b \\le 1\\). Which statement is always true?",
    m('\\cos^{-1} a > \\cos^{-1} b'), [m('\\sin^{-1} a > \\sin^{-1} b'), m('\\sec a < \\sec b'), m('\\sin^{-1} a + \\cos^{-1} a < \\sin^{-1} b + \\cos^{-1} b')],
    "\\(\\cos^{-1}\\) is a decreasing function, so the smaller input gives the larger output. \\(\\sin^{-1}\\) is increasing, \\(\\sec\\) is even so it fails for \\(a = -1,\\ b = 0\\), and \\(\\sin^{-1} x + \\cos^{-1} x\\) is always \\(\\frac{\\pi}{2}\\).")

# ---- Q10 people round a table with a limit on how many of one group sit together (counted by brute force on the seating pattern)
def circle(students, teachers, most):
    seats = students + teachers; pats = 0
    for pos in itertools.combinations(range(1, seats), teachers - 1):   # one teacher fixed in seat 0
        T_ = [0] + list(pos); gaps = [(T_[(i + 1) % teachers] - T_[i]) % seats - 1 if i < teachers - 1 else seats - T_[i] - 1 for i in range(teachers)]
        pats += all(g <= most for g in gaps)
    return pats * math.factorial(teachers - 1) * math.factorial(students)
assert circle(5, 3, 2) == math.factorial(5) * math.factorial(3)        # the method agrees with a case worked by hand
c10 = circle(7, 4, 2); assert c10 == math.factorial(7) * math.factorial(4)
P.M('q10', "7 students and 4 teachers are to sit around a circular table. In how many ways can they be seated if no more than 2 students sit next to each other in a row?",
    m('7! \\times 4!'), [m('7! \\times 3!'), m('2! \\times 7! \\times 4!'), m('7! \\times 4! \\times 3!')],
    "Seat the teachers round the table in \\(3!\\) ways. The 7 students go into the 4 gaps with at most 2 in each, so three gaps hold 2 and one holds 1: there are 4 choices for the gap of 1. Then order the students in \\(7!\\) ways. That is \\(3! \\times 4 \\times 7! = 7! \\times 4!\\).")

# ---- Q11(a) parametric line to Cartesian
xe, ye = 2 - 3 * t, 5 + 6 * t; ts = sp.solve(sp.Eq(x, xe), t)[0]; cart = sp.expand(ye.subs(t, ts)); assert cart == 9 - 2 * x
P.W('q11a', 2, "A line has parametric equations \\(x = 2 - 3t\\) and \\(y = 5 + 6t\\). Find its Cartesian equation in the form \\(y = mx + c\\).",
    ["From the first equation, \\(t = \\frac{2 - x}{3}\\)", "\\(y = 5 + 6\\left(\\frac{2 - x}{3}\\right)\\)", "\\(y = 5 + 2(2 - x)\\)", f"\\(y = {latex(sp.Poly(cart, x).as_expr())}\\)".replace('9 - 2 x', '-2x + 9')],
    [("Correct equation in the form \\(y = mx + c\\)", 2), ("Makes \\(t\\) the subject of one equation, or finds the gradient", 1)])

# ---- Q11(b) arrangements of a word with repeated letters
word = 'PARRAMATTA'; cnt = {c: word.count(c) for c in set(word)}; ways = math.factorial(len(word))
for v in cnt.values(): ways //= math.factorial(v)
assert len(word) == 10 and cnt['A'] == 4 and cnt['R'] == 2 and cnt['T'] == 2 and ways == 37800
P.W('q11b', 2, f"In how many different ways can all the letters of the word {word} be arranged in a row?",
    ["There are 10 letters: A appears 4 times, R twice and T twice.", "\\(\\text{Arrangements} = \\frac{10!}{4! \\times 2! \\times 2!}\\)", f"\\(= {ways:,}\\)".replace(',', '\\,')],
    [("Correct answer", 2), ("Divides \\(10!\\) by a factorial for at least one repeated letter", 1)])

# ---- Q11(c) factor and remainder theorems: two unknown coefficients
Pc = x**3 + a * x**2 + b * x - 6; rem = -12
sol = sp.solve([Pc.subs(x, 1), Pc.subs(x, -2) - rem], [a, b]); assert sol == {a: 2, b: 3}
P.W('q11c', 3, f"The polynomial \\(P(x) = x^3 + ax^2 + bx - 6\\) has real coefficients \\(a\\) and \\(b\\). \\(x - 1\\) is a factor of \\(P(x)\\), and the remainder when \\(P(x)\\) is divided by \\(x + 2\\) is \\({rem}\\). Find \\(a\\) and \\(b\\).",
    ["\\(P(1) = 0\\): \\(1 + a + b - 6 = 0\\), so \\(a + b = 5\\)", f"\\(P(-2) = {rem}\\): \\(-8 + 4a - 2b - 6 = {rem}\\), so \\(4a - 2b = 2\\), that is \\(2a - b = 1\\)", "Adding the two equations: \\(3a = 6\\), so \\(a = 2\\)", "\\(b = 5 - 2 = 3\\)"],
    [("Correct values of \\(a\\) and \\(b\\)", 3), ("Two correct equations in \\(a\\) and \\(b\\)", 2), ("Uses \\(P(1) = 0\\) or \\(P(-2) = -12\\) correctly", 1)])

# ---- Q11(d) standard integral leading to inverse sine
integrand = 3 / sqrt(25 - 4 * x**2); F = Q(3, 2) * asin(2 * x / 5); assert simplify(diff(F, x) - integrand) == 0
P.W('q11d', 2, "Find \\(\\displaystyle\\int \\frac{3}{\\sqrt{25 - 4x^2}}\\,dx\\).",
    ["\\(\\displaystyle\\int \\frac{3}{\\sqrt{25 - 4x^2}}\\,dx = \\frac{3}{2}\\int \\frac{2}{\\sqrt{5^2 - (2x)^2}}\\,dx\\)", "\\(= \\frac{3}{2}\\sin^{-1}\\left(\\frac{2x}{5}\\right) + C\\)"],
    [("Correct answer", 2), ("Recognises an inverse sine with \\(\\frac{2x}{5}\\), or equivalent merit", 1)])

# ---- Q11(e) a sin + b cos equation over one revolution
th = symbols('theta'); roots = [r for r in [0, pi / 2, pi, 3 * pi / 2, 2 * pi, pi / 4, 3 * pi / 4] if simplify(sin(r) - cos(r) - 1) == 0]; assert roots == [pi / 2, pi]
for v in [i * math.pi / 500 for i in range(1001)]:   # no other solutions in the domain
    if abs(math.sin(v) - math.cos(v) - 1) < 1e-9: assert min(abs(v - math.pi / 2), abs(v - math.pi)) < 1e-6
P.W('q11e', 3, "Solve \\(\\sin\\theta - \\cos\\theta = 1\\) for \\(0 \\le \\theta \\le 2\\pi\\).",
    ["Write \\(\\sin\\theta - \\cos\\theta = \\sqrt{2}\\sin\\left(\\theta - \\frac{\\pi}{4}\\right)\\)", "\\(\\sqrt{2}\\sin\\left(\\theta - \\frac{\\pi}{4}\\right) = 1\\), so \\(\\sin\\left(\\theta - \\frac{\\pi}{4}\\right) = \\frac{1}{\\sqrt{2}}\\)", "For \\(-\\frac{\\pi}{4} \\le \\theta - \\frac{\\pi}{4} \\le \\frac{7\\pi}{4}\\): \\(\\theta - \\frac{\\pi}{4} = \\frac{\\pi}{4}\\) or \\(\\frac{3\\pi}{4}\\)", "\\(\\theta = \\frac{\\pi}{2}\\) or \\(\\theta = \\pi\\)"],
    [("Both correct solutions and no others", 3), ("Correct auxiliary angle form (or equivalent) and one correct solution", 2), ("Writes the left side as \\(R\\sin(\\theta - \\alpha)\\), or uses the \\(t\\)-formulae, or equivalent progress", 1)])

# ---- Q11(f) sample proportion: variance, then a normal approximation
p0, n0, cut = Q(1, 5), 400, Q(23, 100); var = p0 * (1 - p0) / n0; sd = sqrt(var); z = (cut - p0) / sd; assert var == Q(1, 2500) and sd == Q(1, 50) and z == Q(3, 2)
phi = 0.5 * (1 + math.erf(1.5 / math.sqrt(2))); assert round(phi, 4) == 0.9332
P.W('q11f', 4, "In a large town, 20% of households have solar panels. A random sample of 400 households is surveyed, and \\(\\hat{p}\\) is the proportion of the sample with solar panels. A normal distribution is used to approximate \\(P(\\hat{p} \\le 0.23)\\).<br><br>(i) Show that the variance of \\(\\hat{p}\\) is \\(\\frac{1}{2500}\\). <b>2</b><br>(ii) Given that \\(P(Z \\le 1.5) = 0.9332\\) for a standard normal variable \\(Z\\), approximate \\(P(\\hat{p} \\le 0.23)\\) correct to two decimal places. <b>2</b>",
    ["(i) \\(\\text{Var}(\\hat{p}) = \\frac{p(1 - p)}{n} = \\frac{0.2 \\times 0.8}{400}\\)", "\\(= \\frac{0.16}{400} = \\frac{1}{2500}\\)", "(ii) \\(\\sigma = \\sqrt{\\frac{1}{2500}} = 0.02\\)", "\\(z = \\frac{0.23 - 0.2}{0.02} = 1.5\\)", "\\(P(\\hat{p} \\le 0.23) \\approx P(Z \\le 1.5) = 0.9332 \\approx 0.93\\)"],
    [("Both parts correct", 4), ("One part correct and substantial progress in the other", 3), ("One part correct, or progress in both (for example the variance formula with correct values, and a correct z-score)", 2), ("Uses \\(\\frac{p(1-p)}{n}\\), or finds the standard deviation, or equivalent merit", 1)])

# ---- Q12(a) definite integral by a given substitution
I = integrate((x + 1) * sqrt(x - 2), (x, 2, 6)); assert I == Q(144, 5)
assert integrate((u + 3) * sqrt(u), (u, 0, 4)) == I
P.W('q12a', 3, "Use the substitution \\(u = x - 2\\) to evaluate \\(\\displaystyle\\int_2^6 (x + 1)\\sqrt{x - 2}\\,dx\\).",
    ["\\(u = x - 2\\), so \\(du = dx\\) and \\(x + 1 = u + 3\\). When \\(x = 2\\), \\(u = 0\\); when \\(x = 6\\), \\(u = 4\\).", "\\(\\displaystyle\\int_0^4 (u + 3)\\sqrt{u}\\,du = \\int_0^4 \\left(u^{\\frac{3}{2}} + 3u^{\\frac{1}{2}}\\right)du\\)", "\\(= \\left[\\frac{2}{5}u^{\\frac{5}{2}} + 2u^{\\frac{3}{2}}\\right]_0^4\\)", "\\(= \\frac{2}{5}(32) + 2(8) = \\frac{144}{5}\\)"],
    [("Correct answer", 3), ("Correct integral in \\(u\\) with correct limits, and a correct primitive", 2), ("Correct integrand in \\(u\\), or correct limits in \\(u\\)", 1)])

# ---- Q12(b) induction on a sum of k times a power
rhs = lambda N: Q(3 + (2 * N - 1) * 3**(N + 1), 4)
for N in range(1, 12): assert sum(j * 3**j for j in range(1, N + 1)) == rhs(N)
assert simplify((3 + (2 * k - 1) * 3**(k + 1)) / 4 + (k + 1) * 3**(k + 1) - (3 + (2 * k + 1) * 3**(k + 2)) / 4) == 0
P.W('q12b', 3, "Use mathematical induction to prove that, for all integers \\(n \\ge 1\\),<br>\\(\\displaystyle (1 \\times 3) + (2 \\times 3^2) + (3 \\times 3^3) + \\dots + (n \\times 3^n) = \\frac{3 + (2n - 1)3^{n+1}}{4}\\).",
    ["<b>Step 1.</b> Prove true for \\(n = 1\\): \\(\\text{LHS} = 1 \\times 3 = 3\\), \\(\\text{RHS} = \\frac{3 + (1)3^2}{4} = \\frac{12}{4} = 3\\). So it is true for \\(n = 1\\).",
     "<b>Step 2.</b> Assume true for \\(n = k\\): \\(\\displaystyle (1 \\times 3) + (2 \\times 3^2) + \\dots + (k \\times 3^k) = \\frac{3 + (2k - 1)3^{k+1}}{4}\\)",
     "<b>Step 3.</b> Prove true for \\(n = k + 1\\), that is \\(\\displaystyle (1 \\times 3) + \\dots + (k \\times 3^k) + \\left((k + 1) \\times 3^{k+1}\\right) = \\frac{3 + (2k + 1)3^{k+2}}{4}\\)",
     "\\(\\displaystyle \\text{LHS} = \\frac{3 + (2k - 1)3^{k+1}}{4} + (k + 1)3^{k+1}\\) (by the assumption)",
     "\\(\\displaystyle = \\frac{3 + (2k - 1)3^{k+1} + 4(k + 1)3^{k+1}}{4}\\)", "\\(\\displaystyle = \\frac{3 + (6k + 3)3^{k+1}}{4}\\)", "\\(\\displaystyle = \\frac{3 + (2k + 1)3^{k+2}}{4} = \\text{RHS}\\)",
     "So if it is true for \\(n = k\\), it is true for \\(n = k + 1\\). Since it is true for \\(n = 1\\), by mathematical induction it is true for all integers \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves the case \\(n = 1\\) and uses the assumption in an attempt at \\(n = k + 1\\)", 2), ("Proves the case \\(n = 1\\), or states the assumption and what must be proved", 1)])

# ---- Q12(c) binomial probability expressions
e1 = binomial(6, 4) * Q(7, 10)**4 * Q(3, 10)**2; e2 = e1 * Q(3, 4)**3; assert binomial(6, 4) == 15 and 0 < e2 < e1 < 1
P.W('q12c', 3, "A workshop has 6 lathes and 3 drill presses. At any moment each lathe is in use with probability 0.7 and each drill press is in use with probability 0.25, independently of the others.<br><br>(i) Write an expression for the probability that exactly 4 of the 6 lathes are in use at a given moment. <b>2</b><br>(ii) Write an expression for the probability that exactly 4 of the 6 lathes are in use and none of the drill presses is in use. <b>1</b>",
    ["(i) \\(P(\\text{exactly 4 lathes}) = \\binom{6}{4}(0.7)^4(0.3)^2\\)", "(ii) \\(P(\\text{no drill press in use}) = (0.75)^3\\)", "\\(P(\\text{both}) = \\binom{6}{4}(0.7)^4(0.3)^2 \\times (0.75)^3\\)"],
    [("Both expressions correct", 3), ("Correct expression for part (i)", 2), ("A binomial term with correct probabilities but an error, or \\((0.75)^3\\) for the drill presses", 1)])

# ---- Q12(d) Pascal's identity used twice, with a symmetric term
lhs = math.comb(1998, 45) + math.comb(1998, 46) + math.comb(1999, 1952); assert lhs == math.comb(2000, 47) == math.comb(2000, 1953) and math.comb(1999, 1952) == math.comb(1999, 47)
P.W('q12d', 2, "It is known that \\(\\binom{n}{r} = \\binom{n-1}{r-1} + \\binom{n-1}{r}\\) for all integers with \\(1 \\le r \\le n - 1\\). (Do NOT prove this.)<br><br>Find one possible pair of values \\(p\\) and \\(q\\) such that \\(\\binom{1998}{45} + \\binom{1998}{46} + \\binom{1999}{1952} = \\binom{p}{q}\\).",
    ["\\(\\binom{1998}{45} + \\binom{1998}{46} = \\binom{1999}{46}\\)", "\\(\\binom{1999}{1952} = \\binom{1999}{1999 - 1952} = \\binom{1999}{47}\\)", "\\(\\binom{1999}{46} + \\binom{1999}{47} = \\binom{2000}{47}\\)", "So \\(p = 2000\\) and \\(q = 47\\) (or \\(q = 1953\\))."],
    [("A correct pair \\(p\\), \\(q\\)", 2), ("Uses the identity once correctly, or uses \\(\\binom{n}{r} = \\binom{n}{n-r}\\)", 1)])

# ---- Q14(a) an increasing function has an inverse function; derivative of the inverse at a point
f = 5 * x + log(x); assert f.subs(x, 1) == 5 and diff(f, x).subs(x, 1) == 6
P.W('q14a', 3, "Let \\(f(x) = 5x + \\ln x\\) for \\(x > 0\\).<br><br>(i) Explain why the inverse of \\(f(x)\\) is a function. <b>1</b><br>(ii) Let \\(g(x) = f^{-1}(x)\\). By considering the value of \\(f(1)\\), or otherwise, evaluate \\(g'(5)\\). <b>2</b>",
    ["(i) \\(f'(x) = 5 + \\frac{1}{x} > 0\\) for all \\(x > 0\\), so \\(f\\) is increasing. Each \\(y\\)-value comes from only one \\(x\\)-value (the graph passes the horizontal line test), so the inverse is a function.", "(ii) \\(f(1) = 5 + \\ln 1 = 5\\), so \\(g(5) = 1\\)", "\\(g'(5) = \\frac{1}{f'(g(5))} = \\frac{1}{f'(1)}\\)", "\\(f'(1) = 5 + 1 = 6\\), so \\(g'(5) = \\frac{1}{6}\\)"],
    [("Both parts correct", 3), ("Correct explanation and progress in (ii), or correct value of \\(g'(5)\\)", 2), ("States that \\(f\\) is increasing (or one-to-one), or finds \\(f(1) = 5\\), or finds \\(f'(x)\\)", 1)])

P.save()
