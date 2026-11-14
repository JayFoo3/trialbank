"""Trialbank versions of the 2020 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, tan, exp, symbols, integrate, diff, simplify, asin, acos, atan, cot, binomial
from rw import Paper
from fig import Plot, INK
x, t, y, th = symbols('x t y theta', real=True)
P = Paper('hsc-ext1-2020', seed=2020)
M = lambda s: '\\(' + s + '\\)'
VEC = lambda s: '\\underset{\\sim}{' + s + '}'
I_, J_ = VEC('i'), VEC('j')
col = lambda a_, b_: M('\\begin{pmatrix} ' + str(a_) + ' \\\\ ' + str(b_) + ' \\end{pmatrix}')
GREY = '#8a909c'; PI = math.pi

# Q1 quadratic inequality on a number line
assert sp.solve_univariate_inequality(x**2 + 2 * x - 8 >= 0, x, relational=False) == sp.Union(sp.Interval(-sp.oo, -4), sp.Interval(2, sp.oo))
def nl(p_, q_, outside):
    pl = Plot(-7, 7.5, -1, 1, w=230, h=70)
    pl.line(-7, 0, 7.5, 0, width=1, colour=GREY)
    if outside: pl.line(p_, 0, -6.6, 0, width=3.2, arrow=True); pl.line(q_, 0, 7.1, 0, width=3.2, arrow=True)
    else: pl.line(p_, 0, q_, 0, width=3.2)
    for v in (p_, q_): pl.dot(v, 0, 5); pl.text(v, 0, ('−' if v < 0 else '') + str(abs(v)), dy=22, size=13)
    return pl.svg()
P.M('q01', "Which diagram best represents the solution set of \\(x^2 + 2x - 8 \\ge 0\\)?", nl(-4, 2, True), [nl(-2, 4, True), nl(-4, 2, False), nl(-2, 4, False)],
    "\\(x^2 + 2x - 8 = (x + 4)(x - 2)\\). The parabola is concave up, so it is \\(\\ge 0\\) outside its roots: \\(x \\le -4\\) or \\(x \\ge 2\\), with both endpoints included.")

# Q2 domain and range of an inverse
P.M('q02', "Given \\(f(x) = 2 + \\sqrt{x}\\), what are the domain and range of \\(f^{-1}(x)\\)?",
    M('x \\ge 2,\\ y \\ge 0'), [M('x \\ge 0,\\ y \\ge 0'), M('x \\ge 0,\\ y \\ge 2'), M('x \\ge 2,\\ y \\ge 2')],
    "\\(f\\) has domain \\(x \\ge 0\\) and range \\(y \\ge 2\\). The inverse swaps them: domain \\(x \\ge 2\\), range \\(y \\ge 0\\).")

# Q3 inverse tan primitive
assert simplify(diff(atan(3 * x) / 3, x) - 1 / (9 * x**2 + 1)) == 0
P.M('q03', "Which of the following is an anti-derivative of \\(\\dfrac{1}{9x^2 + 1}\\)?",
    M('\\frac{1}{3}\\tan^{-1}(3x) + c'), [M('3\\tan^{-1}\\left(\\frac{x}{3}\\right) + c'), M('\\frac{1}{3}\\tan^{-1}\\left(\\frac{x}{3}\\right) + c'), M('3\\tan^{-1}(3x) + c')],
    "\\(\\frac{1}{9x^2 + 1} = \\frac{1}{1 + (3x)^2}\\). Differentiating \\(\\tan^{-1}(3x)\\) gives \\(\\frac{3}{1 + 9x^2}\\), so divide by 3: \\(\\frac{1}{3}\\tan^{-1}(3x) + c\\).")

# Q4 resultant displacement
steps = [(3, 1), (-1, 4), (2, -2)]; R = (sum(s[0] for s in steps), sum(s[1] for s in steps)); assert R == (4, 3)
P.M('q04', "Sam starts at the origin and walks along all of the vector " + M('3' + I_ + ' + ' + J_) + ", then all of " + M('-' + I_ + ' + 4' + J_) + ", and finally all of " + M('2' + I_ + ' - 2' + J_) + ". How far from the origin is Sam?",
    M('5'), [M('7'), M('\\sqrt{35}'), M('\\sqrt{10} + \\sqrt{17} + 2\\sqrt{2}')],
    "Add the vectors to get the final position: " + M('(3 - 1 + 2)' + I_ + ' + (1 + 4 - 2)' + J_ + ' = 4' + I_ + ' + 3' + J_) + ", which is \\(\\sqrt{16 + 9} = 5\\) from the origin. Adding the three lengths gives the distance walked, not the distance from the start.")

# Q5 graph of a quartic with a double root and an irreducible quadratic factor
assert sp.discriminant(x**2 - 2 * x + 3, x) < 0
pa_ = lambda X: (X + 1)**2 * (X**2 - 2 * X + 3) / 3
def g5(f_):
    pl = Plot(-2.6, 2.6, -4, 6, w=210); pl.axes(xt=[-1], yt=[]); pl.curve(f_, -2.6, 2.6, width=2); return pl.svg()
P.M('q05', "A monic polynomial \\(p(x)\\) of degree 4 has a zero of multiplicity 2 at \\(x = -1\\) and is divisible by \\(x^2 - 2x + 3\\). Which of the following could be the graph of \\(p(x)\\)?",
    g5(pa_), [g5(lambda X: -pa_(X)), g5(lambda X: 1.2 * (X + 1)**2 * (X - 0.8) * (X - 2)), g5(lambda X: 1.5 * (X + 1)**2 * (X - 1.5))],
    "\\(p(x) = (x + 1)^2(x^2 - 2x + 3)\\). The quadratic has discriminant \\(4 - 12 < 0\\), so it is always positive and gives no more \\(x\\)-intercepts. So the graph only touches the \\(x\\)-axis at \\(x = -1\\), is never negative, and (monic, even degree) rises on both ends.")

# Q6 vector triangles for b - a
av, bv = (2.0, 1.6), (3.2, -0.9)
def arrow(pl, p_, q_, lab):
    pl.line(p_[0], p_[1], q_[0], q_[1], width=1.6, arrow=True)
    mx, my = (p_[0] + q_[0]) / 2, (p_[1] + q_[1]) / 2; dx_, dy_ = q_[0] - p_[0], q_[1] - p_[1]; L = math.hypot(dx_, dy_)
    pl.text(mx - 0.32 * dy_ / L, my + 0.32 * dx_ / L, lab, dy=5, var=True, size=15)
def tri(segs):
    pts = [p for s in segs for p in s[:2]]; xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    pl = Plot(min(xs) - 0.8, max(xs) + 0.8, min(ys) - 0.8, max(ys) + 0.8, w=230)
    for p_, q_, lab in segs: arrow(pl, p_, q_, lab)
    return pl.svg()
O = (0, 0); ab = (av[0] + bv[0], av[1] + bv[1])
optA = tri([(O, av, 'a'), (av, bv, 'v'), (O, bv, 'b')])          # a + v = b, so v = b - a
optB = tri([(O, av, 'a'), (av, ab, 'b'), (O, ab, 'v')])          # v = a + b
optC = tri([(O, av, 'a'), (O, bv, 'b'), (bv, av, 'v')])          # v = a - b
optD = tri([(O, av, 'a'), (av, ab, 'b'), (ab, O, 'v')])          # v = -(a + b)
pg = Plot(-0.4, 7.2, -1.3, 2.1, w=320); arrow(pg, (0, 0), av, 'a'); arrow(pg, (3.6, 1.0), (3.6 + bv[0], 1.0 + bv[1]), 'b')
P.M('q06', "The vectors " + M(VEC('a')) + " and " + M(VEC('b')) + " are shown." + pg.svg() + "Which diagram shows the vector " + M(VEC('v') + ' = ' + VEC('b') + ' - ' + VEC('a')) + "?",
    optA, [optB, optC, optD],
    M(VEC('v') + ' = ' + VEC('b') + ' - ' + VEC('a')) + " means " + M(VEC('a') + ' + ' + VEC('v') + ' = ' + VEC('b')) + ": go along " + M(VEC('a')) + " then along " + M(VEC('v')) + " and you finish where " + M(VEC('b')) + " finishes, with " + M(VEC('a')) + " and " + M(VEC('b')) + " starting from the same point.")

# Q7 direction fields
def fieldsvg(fn):
    pl = Plot(-2.4, 2.4, -2.4, 2.4, w=230); pl.axes(xt=[-2, 2], yt=[-2, 2])
    for i in range(-4, 5):
        for j in range(-4, 5):
            X, Y = i / 2, j / 2
            if i == 0 and j == 0: continue
            m = fn(X, Y)
            if m is None: dx_, dy_ = 0, 0.17
            else: L = 0.17 / math.sqrt(1 + m * m); dx_, dy_ = L, L * m
            pl.line(X - dx_, Y - dy_, X + dx_, Y + dy_, width=1.2)
    return pl.svg()
safe = lambda f_: (lambda X, Y: None if f_(X, Y) is None else f_(X, Y))
f7 = [lambda X, Y: None if Y == 0 else X / (3 * Y), lambda X, Y: None if Y == 0 else -X / (3 * Y), lambda X, Y: None if X == 0 else Y / (3 * X), lambda X, Y: X * Y / 3]
P.M('q07', "Which of the following best represents the direction field for the differential equation \\(\\dfrac{dy}{dx} = \\dfrac{x}{3y}\\)?",
    fieldsvg(f7[0]), [fieldsvg(g) for g in f7[1:]],
    "In the first quadrant \\(x\\) and \\(y\\) are both positive, so the slopes are positive. On the \\(x\\)-axis (\\(y = 0\\)) the slope is undefined, so the segments there are vertical, and on the \\(y\\)-axis (\\(x = 0\\)) the slope is 0, so they are horizontal.")

# Q8 select then rank
n8 = math.comb(12, 7) * math.perm(7, 3); assert n8 == math.factorial(12) // (math.factorial(5) * math.factorial(4)) and n8 == 166320
P.M('q08', "Out of 12 contestants, seven are to be selected for the final round of a competition. Three of those seven will then be placed 1st, 2nd and 3rd. In how many ways can this be done?",
    M('\\dfrac{12!}{5!\\,4!}'), [M('\\dfrac{12!}{7!\\,5!}'), M('\\dfrac{12!}{7!}'), M('\\dfrac{12!}{4!\\,3!}')],
    "Choose the seven finalists: \\(\\binom{12}{7} = \\frac{12!}{7!\\,5!}\\). Then fill 1st, 2nd and 3rd from them in order: \\(7 \\times 6 \\times 5 = \\frac{7!}{4!}\\). Multiplying, the \\(7!\\) cancels: \\(\\frac{12!}{5!\\,4!}\\).")

# Q9 reflection using a projection
v9 = sp.Matrix([5, 5]); d9 = sp.Matrix([1, 3]); pr = (v9.dot(d9) / d9.dot(d9)) * d9; assert pr == sp.Matrix([2, 6])
A9 = 2 * pr - v9; assert A9 == sp.Matrix([-1, 7]) and (A9 - pr).norm() == (v9 - pr).norm()
P.M('q09', "The projection of the vector " + col(5, 5) + " onto the line \\(y = 3x\\) is " + col(2, 6) + ". The point \\((5, 5)\\) is reflected in the line \\(y = 3x\\) to a point \\(A\\). What is the position vector of \\(A\\)?",
    col(-1, 7), [col(4, 12), col(3, -1), col(-5, 5)],
    "The foot of the perpendicular from \\((5, 5)\\) to the line is \\((2, 6)\\), the midpoint of the point and its reflection. So " + M('\\overrightarrow{OA} = 2\\begin{pmatrix} 2 \\\\ 6 \\end{pmatrix} - \\begin{pmatrix} 5 \\\\ 5 \\end{pmatrix} = \\begin{pmatrix} -1 \\\\ 7 \\end{pmatrix}') + ".")

# Q10 related rates sign chase
kk, ll, mm = 0.7, 1.3, 2.1; dR = kk**2; dP = -ll**2 * dR; dQ = dP / (-mm**2); assert dP < 0 and dQ > 0
P.M('q10', "The quantities \\(P\\), \\(Q\\) and \\(R\\) are connected by the related rates<br>\\(\\dfrac{dR}{dt} = k^2\\), \\(\\quad\\dfrac{dP}{dt} = -l^2 \\times \\dfrac{dR}{dt}\\), \\(\\quad\\dfrac{dP}{dt} = -m^2 \\times \\dfrac{dQ}{dt}\\),<br>where \\(k\\), \\(l\\) and \\(m\\) are non-zero constants. Which statement is true?",
    "\\(P\\) is decreasing and \\(Q\\) is increasing", ["\\(P\\) is increasing and \\(Q\\) is increasing", "\\(P\\) is increasing and \\(Q\\) is decreasing", "\\(P\\) is decreasing and \\(Q\\) is decreasing"],
    "\\(\\frac{dR}{dt} = k^2 > 0\\), so \\(\\frac{dP}{dt} = -l^2k^2 < 0\\) and \\(P\\) is decreasing. Then \\(\\frac{dQ}{dt} = -\\frac{1}{m^2}\\frac{dP}{dt} = \\frac{l^2k^2}{m^2} > 0\\), so \\(Q\\) is increasing.")

# Q11(a)
P11 = x**3 + 2 * x**2 - 9 * x + 6; assert P11.subs(x, 1) == 0 and sp.expand((x - 1) * (x**2 + 3 * x - 6) - P11) == 0
P.W('q11a', 3, "Let \\(P(x) = x^3 + 2x^2 - 9x + 6\\).<br>(i) Show that \\(P(1) = 0\\). <b>1</b><br>(ii) Hence, factor \\(P(x)\\) as \\(A(x)B(x)\\), where \\(B(x)\\) is a quadratic polynomial. <b>2</b>",
    ["(i) \\(P(1) = 1 + 2 - 9 + 6 = 0\\)", "(ii) By the factor theorem \\((x - 1)\\) is a factor. Dividing (or matching coefficients): \\(P(x) = (x - 1)(x^2 + 3x - 6)\\)."],
    [("Both parts correct", 3), ("Part (i), and a correct method in (ii) with one error", 2), ("Part (i) correct, or a correct quadratic factor", 1)])

# Q11(b)
a = symbols('a'); assert set(sp.solve(sp.Matrix([a, -2]).dot(sp.Matrix([3 * a + 1, 1])), a)) == {Q(2, 3), -1}
P.W('q11b', 3, "For what value(s) of \\(a\\) are the vectors " + col('a', -2) + " and " + col('3a + 1', 1) + " perpendicular?",
    ["Perpendicular means the dot product is 0: \\(a(3a + 1) + (-2)(1) = 0\\).", "\\(3a^2 + a - 2 = 0\\), so \\((3a - 2)(a + 1) = 0\\).", "\\(a = \\frac{2}{3}\\) or \\(a = -1\\)"],
    [("Both values correct", 3), ("Correct quadratic with one correct value", 2), ("Sets the dot product to 0", 1)])

# Q11(c) reciprocal graph
f11 = lambda X: 2 * X * X / 9 - 2
pl = Plot(-5, 5, -3.2, 4.2, w=280); pl.axes(xt=[-3, 3], yt=[-2]); pl.curve(f11, -5, 5)
pm = Plot(-6, 6, -3.2, 3.2, w=300)
for v in (-3, 3): pm.line(v, -3.2, v, 3.2, dash='4 4', colour=GREY, width=1)
pm.axes(xt=[-3, 3], yt=[-0.5], ytl=['−½']); g11 = lambda X: 1 / f11(X)
for lo, hi in [(-6, -3.02), (-2.98, 2.98), (3.02, 6)]: pm.curve(g11, lo, hi)
assert abs(g11(0) + 0.5) < 1e-12
P.W('q11c', 3, "The diagram shows the graph of \\(y = f(x)\\), a parabola with \\(x\\)-intercepts \\(\\pm 3\\) and \\(y\\)-intercept \\(-2\\)." + pl.svg() + "Sketch the graph of \\(y = \\dfrac{1}{f(x)}\\).",
    ["Vertical asymptotes where \\(f(x) = 0\\): \\(x = -3\\) and \\(x = 3\\).", "As \\(x \\to \\pm\\infty\\), \\(f(x) \\to \\infty\\), so \\(\\frac{1}{f(x)} \\to 0^+\\): the \\(x\\)-axis is a horizontal asymptote.",
     "Between the asymptotes \\(f\\) is negative with a minimum of \\(-2\\) at \\(x = 0\\), so \\(\\frac{1}{f}\\) is negative with a maximum turning point at \\(\\left(0, -\\frac{1}{2}\\right)\\), heading to \\(-\\infty\\) at the asymptotes." + pm.svg()],
    [("Correct sketch showing asymptotes, the turning point and behaviour", 3), ("Correct shape in two of the three regions, or correct asymptotes and turning point", 2), ("Correct vertical asymptotes, or the point \\(\\left(0, -\\frac{1}{2}\\right)\\)", 1)])

# Q11(d) auxiliary angle equation
R11 = 2 * sqrt(3); assert all(abs(float((3 * sin(x) + sqrt(3) * cos(x) - R11 * sin(x + pi / 6)).subs(x, v))) < 1e-12 for v in [0.3, 2, 4.4])
for v in (PI, 5 * PI / 3): assert abs(3 * math.sin(v) + math.sqrt(3) * math.cos(v) + math.sqrt(3)) < 1e-12
h11 = lambda v: 3 * math.sin(v) + math.sqrt(3) * math.cos(v) + math.sqrt(3); grid = [i * 2 * PI / 100000 for i in range(100001)]
assert sum(1 for i in range(100000) if h11(grid[i]) * h11(grid[i + 1]) <= 0) == 2
P.W('q11d', 4, "By expressing \\(3\\sin x + \\sqrt{3}\\cos x\\) in the form \\(A\\sin(x + \\alpha)\\), solve \\(3\\sin x + \\sqrt{3}\\cos x = -\\sqrt{3}\\) for \\(0 \\le x \\le 2\\pi\\).",
    ["\\(A\\cos\\alpha = 3\\), \\(A\\sin\\alpha = \\sqrt{3}\\), so \\(A = \\sqrt{12} = 2\\sqrt{3}\\) and \\(\\tan\\alpha = \\frac{1}{\\sqrt{3}}\\), \\(\\alpha = \\frac{\\pi}{6}\\).", "\\(2\\sqrt{3}\\sin\\left(x + \\frac{\\pi}{6}\\right) = -\\sqrt{3}\\), so \\(\\sin\\left(x + \\frac{\\pi}{6}\\right) = -\\frac{1}{2}\\).",
     "\\(\\frac{\\pi}{6} \\le x + \\frac{\\pi}{6} \\le \\frac{13\\pi}{6}\\), so \\(x + \\frac{\\pi}{6} = \\frac{7\\pi}{6}\\) or \\(\\frac{11\\pi}{6}\\).", "\\(x = \\pi\\) or \\(x = \\frac{5\\pi}{3}\\)"],
    [("Both solutions", 4), ("Correct form and one correct solution", 3), ("Correct \\(A\\) and \\(\\alpha\\)", 2), ("Correct \\(A\\) or correct \\(\\alpha\\)", 1)])

# Q11(e)
X11 = exp(3 * y) / 3; assert simplify(1 / diff(X11, y) - exp(-3 * y)) == 0
P.W('q11e', 2, "Solve \\(\\dfrac{dy}{dx} = e^{-3y}\\), finding \\(x\\) as a function of \\(y\\).",
    ["\\(\\dfrac{dx}{dy} = \\dfrac{1}{e^{-3y}} = e^{3y}\\)", "\\(x = \\displaystyle\\int e^{3y}\\,dy = \\frac{1}{3}e^{3y} + c\\)"],
    [("Correct answer", 2), ("Writes \\(\\frac{dx}{dy} = e^{3y}\\) or separates the variables correctly", 1)])

# Q12(a) induction
for N in range(1, 30): assert sum(r * (2 * r + 1) for r in range(1, N + 1)) * 6 == N * (N + 1) * (4 * N + 5)
P.W('q12a', 3, "Use the principle of mathematical induction to show that for all integers \\(n \\ge 1\\),<br>\\(1 \\times 3 + 2 \\times 5 + 3 \\times 7 + \\cdots + n(2n + 1) = \\dfrac{n(n + 1)(4n + 5)}{6}\\).",
    ["<b>Step 1.</b> \\(n = 1\\): LHS \\(= 3\\), RHS \\(= \\frac{1 \\times 2 \\times 9}{6} = 3\\). True.",
     "<b>Step 2.</b> Assume true for \\(n = k\\): \\(1 \\times 3 + \\cdots + k(2k + 1) = \\frac{k(k + 1)(4k + 5)}{6}\\).",
     "<b>Step 3.</b> For \\(n = k + 1\\): LHS \\(= \\frac{k(k + 1)(4k + 5)}{6} + (k + 1)(2k + 3) = \\frac{(k + 1)\\left[k(4k + 5) + 6(2k + 3)\\right]}{6}\\)",
     "\\(= \\frac{(k + 1)(4k^2 + 17k + 18)}{6} = \\frac{(k + 1)(k + 2)(4k + 9)}{6} = \\frac{(k + 1)(k + 2)(4(k + 1) + 5)}{6}\\), the RHS for \\(n = k + 1\\).",
     "So if true for \\(n = k\\) it is true for \\(n = k + 1\\); since true for \\(n = 1\\), by induction it is true for all \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves \\(n = 1\\) and makes significant progress in the inductive step", 2), ("Proves \\(n = 1\\), or correctly adds the \\((k + 1)\\)th term", 1)])

# Q12(b) binomial and normal approximation
mu, var = 120 * 0.25, 120 * 0.25 * 0.75; assert mu == 30 and var == 22.5 and abs(math.sqrt(var) - 5) < 0.3
P.W('q12b', 3, "A spinner lands on blue with probability \\(\\frac{1}{4}\\). It is spun 120 times, and \\(X\\) is the number of times it lands on blue, so \\(X\\) has a binomial distribution.<br>"
    "(i) Find the expected value \\(E(X)\\). <b>1</b><br>(ii) By finding the variance \\(\\text{Var}(X)\\), show that the standard deviation of \\(X\\) is approximately 5. <b>1</b><br>(iii) Using a normal approximation, find the approximate probability that \\(X\\) is between 25 and 35. <b>1</b>",
    ["(i) \\(E(X) = np = 120 \\times \\frac{1}{4} = 30\\)", "(ii) \\(\\text{Var}(X) = np(1 - p) = 120 \\times \\frac{1}{4} \\times \\frac{3}{4} = 22.5\\), so \\(\\sigma = \\sqrt{22.5} \\approx 4.74 \\approx 5\\).",
     "(iii) 25 and 35 are about one standard deviation either side of the mean, so \\(P(25 < X < 35) \\approx P(-1 < Z < 1) \\approx 0.68\\)."],
    [("All three parts correct", 3), ("Two parts correct", 2), ("One part correct", 1)])

# Q12(c) pigeonhole
assert math.comb(9, 3) == 84 and 84 * 7 < 600
P.W('q12c', 2, "To finish a course, a student must choose and pass exactly three electives, chosen from nine electives on offer. Last year 600 students finished the course. Explain, using the pigeonhole principle, why at least eight students passed exactly the same three electives.",
    ["The number of different sets of three electives is \\(\\binom{9}{3} = 84\\) (the pigeonholes).", "If no set were shared by eight or more students, at most \\(84 \\times 7 = 588\\) students could have finished. Since \\(600 > 588\\), by the pigeonhole principle at least one set of three electives was passed by at least eight students."],
    [("Correct explanation", 2), ("Finds 84 combinations", 1)])

# Q12(d) product to sum
I12 = integrate(cos(5 * x) * sin(3 * x), (x, 0, pi / 4)); assert simplify(I12 + Q(1, 4)) == 0
P.W('q12d', 3, "Find \\(\\displaystyle\\int_0^{\\frac{\\pi}{4}} \\cos 5x\\sin 3x\\,dx\\).",
    ["\\(\\cos 5x\\sin 3x = \\frac{1}{2}\\left[\\sin(3x + 5x) + \\sin(3x - 5x)\\right] = \\frac{1}{2}(\\sin 8x - \\sin 2x)\\)", "\\(\\displaystyle\\int_0^{\\frac{\\pi}{4}} \\frac{1}{2}(\\sin 8x - \\sin 2x)\\,dx = \\frac{1}{2}\\left[-\\frac{\\cos 8x}{8} + \\frac{\\cos 2x}{2}\\right]_0^{\\frac{\\pi}{4}}\\)",
     "\\(= \\frac{1}{2}\\left[\\left(-\\frac{1}{8} + 0\\right) - \\left(-\\frac{1}{8} + \\frac{1}{2}\\right)\\right] = \\frac{1}{2} \\times \\left(-\\frac{1}{2}\\right) = -\\frac{1}{4}\\)"],
    [("Correct answer", 3), ("Correct primitive", 2), ("Correct use of a product-to-sum identity", 1)])

# Q12(e) separable DE through a point on the x-axis
F12 = 2 * x**2 + y**2 - 8; yx = sqrt(8 - 2 * x**2); assert simplify(diff(yx, x) + 2 * x / yx) == 0 and F12.subs({x: 2, y: 0}) == 0
P.W('q12e', 3, "Find the curve which satisfies the differential equation \\(\\dfrac{dy}{dx} = -\\dfrac{2x}{y}\\) and passes through the point \\((2, 0)\\).",
    ["\\(\\displaystyle\\int y\\,dy = \\int -2x\\,dx\\), so \\(\\frac{y^2}{2} = -x^2 + C\\), that is \\(2x^2 + y^2 = c\\).", "At \\((2, 0)\\): \\(c = 8\\).", "The curve is \\(2x^2 + y^2 = 8\\), that is \\(\\dfrac{x^2}{4} + \\dfrac{y^2}{8} = 1\\) (an ellipse)."],
    [("Correct curve", 3), ("Correct general solution", 2), ("Separates the variables", 1)])

# Q13(a) trig substitution
I13 = integrate(x**2 / (1 + x**2)**Q(5, 2), (x, 0, sqrt(3))); assert simplify(I13 - sqrt(3) / 8) == 0
P.W('q13a', 5, "(i) Find \\(\\dfrac{d}{d\\theta}\\left(\\sin^3\\theta\\right)\\). <b>1</b><br>(ii) Use the substitution \\(x = \\tan\\theta\\) to evaluate \\(\\displaystyle\\int_0^{\\sqrt{3}} \\frac{x^2}{\\left(1 + x^2\\right)^{\\frac{5}{2}}}\\,dx\\). <b>4</b>",
    ["(i) \\(\\dfrac{d}{d\\theta}\\sin^3\\theta = 3\\sin^2\\theta\\cos\\theta\\)", "(ii) \\(dx = \\sec^2\\theta\\,d\\theta\\); \\(x = 0 \\Rightarrow \\theta = 0\\), \\(x = \\sqrt{3} \\Rightarrow \\theta = \\frac{\\pi}{3}\\); \\(1 + \\tan^2\\theta = \\sec^2\\theta\\).",
     "\\(\\displaystyle\\int_0^{\\frac{\\pi}{3}} \\frac{\\tan^2\\theta}{\\sec^5\\theta}\\sec^2\\theta\\,d\\theta = \\int_0^{\\frac{\\pi}{3}} \\tan^2\\theta\\cos^3\\theta\\,d\\theta = \\int_0^{\\frac{\\pi}{3}} \\sin^2\\theta\\cos\\theta\\,d\\theta\\)",
     "\\(= \\left[\\frac{1}{3}\\sin^3\\theta\\right]_0^{\\frac{\\pi}{3}} = \\frac{1}{3}\\left(\\frac{\\sqrt{3}}{2}\\right)^3 = \\frac{1}{3} \\times \\frac{3\\sqrt{3}}{8} = \\frac{\\sqrt{3}}{8}\\)"],
    [("Both parts correct", 5), ("Part (i) and correct primitive with correct limits in (ii)", 4), ("Simplifies the integrand to \\(\\sin^2\\theta\\cos\\theta\\)", 3), ("Correct integral in \\(\\theta\\) with correct limits", 2), ("Part (i) correct, or correct \\(dx\\) and limits", 1)])

# Q13(b) volume between two trig curves
V13 = pi * integrate(cos(x)**2 - sin(2 * x)**2, (x, 0, pi / 6)); assert simplify(V13 - 3 * sqrt(3) * pi / 16) == 0
assert abs(math.cos(PI / 6) - math.sin(PI / 3)) < 1e-12
pl = Plot(-0.2, 1.75, -0.35, 1.25, w=330)
pl.region([(X / 100 * PI / 6, math.cos(X / 100 * PI / 6)) for X in range(101)] + [(X / 100 * PI / 6, math.sin(2 * X / 100 * PI / 6)) for X in range(100, -1, -1)])
pl.axes(xt=[], yt=[1]); pl.curve(math.cos, 0, 1.7); pl.curve(lambda X: math.sin(2 * X), 0, 1.7)
pl.dot(PI / 6, math.cos(PI / 6), 3); pl.text(0.17, 0.62, 'R', var=True); pl.text(0.25, math.cos(0.25), 'y = cos x', dx=4, dy=-10, anchor='start', var=True, size=13); pl.text(PI / 4, 1, 'y = sin(2x)', dx=40, dy=-6, anchor='start', var=True, size=13)
P.W('q13b', 4, "The region \\(R\\) is bounded by the \\(y\\)-axis, the graph of \\(y = \\cos x\\) and the graph of \\(y = \\sin(2x)\\), as shown." + pl.svg() + "Find the volume of the solid of revolution formed when the region \\(R\\) is rotated about the \\(x\\)-axis.",
    ["Intersection: \\(\\cos x = 2\\sin x\\cos x\\), so \\(\\sin x = \\frac{1}{2}\\) and \\(x = \\frac{\\pi}{6}\\) (the first meeting point).", "\\(\\displaystyle V = \\pi\\int_0^{\\frac{\\pi}{6}} \\left(\\cos^2 x - \\sin^2 2x\\right)dx = \\pi\\int_0^{\\frac{\\pi}{6}} \\left(\\frac{1 + \\cos 2x}{2} - \\frac{1 - \\cos 4x}{2}\\right)dx = \\frac{\\pi}{2}\\int_0^{\\frac{\\pi}{6}} (\\cos 2x + \\cos 4x)\\,dx\\)",
     "\\(= \\frac{\\pi}{2}\\left[\\frac{\\sin 2x}{2} + \\frac{\\sin 4x}{4}\\right]_0^{\\frac{\\pi}{6}} = \\frac{\\pi}{2}\\left(\\frac{\\sqrt{3}}{4} + \\frac{\\sqrt{3}}{8}\\right) = \\frac{3\\sqrt{3}\\pi}{16}\\) cubic units"],
    [("Correct volume", 4), ("Correct primitive with correct limits", 3), ("Correct integrand in terms of \\(\\cos 2x\\) and \\(\\cos 4x\\), or correct intersection and volume integral", 2), ("Finds the intersection \\(x = \\frac{\\pi}{6}\\), or a correct volume integral", 1)])

# Q13(c) equal derivatives on two separate intervals
f13 = cot(asin(x)); g13 = sqrt(1 - x**2) / x
for v in [-0.9, -0.5, -0.1, 0.2, 0.6, 0.95]:
    assert abs(float(diff(f13, x).subs(x, v) - diff(g13, x).subs(x, v))) < 1e-9 and abs(float((f13 - g13).subs(x, v))) < 1e-9
gfun = lambda X: math.sqrt(1 - X * X) / X
pl = Plot(-1.6, 1.6, -4.2, 4.2, w=300, h=300); pl.axes(xt=[-1, 1], yt=[]); pl.curve(gfun, -1, -0.03); pl.curve(gfun, 0.03, 1); pl.text(0.45, gfun(0.45), 'y = g(x)', dx=10, dy=-4, anchor='start', var=True, size=13)
P.W('q13c', 7, "Suppose \\(f(x) = \\cot\\left(\\sin^{-1}(x)\\right)\\) and \\(g(x) = \\dfrac{\\sqrt{1 - x^2}}{x}\\). The graph of \\(y = g(x)\\) is given." + pl.svg() +
    "(i) Show that \\(f'(x) = g'(x)\\). <b>4</b><br>(ii) Using part (i), or otherwise, show that \\(f(x) = g(x)\\). <b>3</b>",
    ["(i) \\(f'(x) = -\\csc^2\\left(\\sin^{-1}x\\right) \\times \\dfrac{1}{\\sqrt{1 - x^2}} = -\\dfrac{1}{x^2} \\times \\dfrac{1}{\\sqrt{1 - x^2}} = -\\dfrac{1}{x^2\\sqrt{1 - x^2}}\\) (since \\(\\sin(\\sin^{-1}x) = x\\)).",
     "By the quotient rule, \\(g'(x) = \\dfrac{x \\times \\frac{-x}{\\sqrt{1 - x^2}} - \\sqrt{1 - x^2}}{x^2} = \\dfrac{-x^2 - (1 - x^2)}{x^2\\sqrt{1 - x^2}} = -\\dfrac{1}{x^2\\sqrt{1 - x^2}}\\). So \\(f'(x) = g'(x)\\).",
     "(ii) Since the derivatives are equal, \\(f(x) - g(x)\\) is constant on each interval of the domain. The domain \\(-1 \\le x \\le 1\\), \\(x \\ne 0\\) has two separate pieces, so check each one.",
     "\\(x = \\frac{1}{2}\\): \\(f = \\cot\\frac{\\pi}{6} = \\sqrt{3}\\) and \\(g = \\frac{\\sqrt{3}/2}{1/2} = \\sqrt{3}\\), so the constant is 0 on \\((0, 1]\\).",
     "\\(x = -\\frac{1}{2}\\): \\(f = \\cot\\left(-\\frac{\\pi}{6}\\right) = -\\sqrt{3}\\) and \\(g = -\\sqrt{3}\\), so the constant is 0 on \\([-1, 0)\\) too. Hence \\(f(x) = g(x)\\)."],
    [("Both parts correct", 7), ("Part (i), and part (ii) checks only one interval", 6), ("Part (i) correct and states \\(f - g\\) is constant", 5), ("Part (i) correct", 4), ("Correct derivative of \\(f\\) or of \\(g\\), with progress on the other", 3), ("Correct derivative of \\(f\\) or of \\(g\\)", 2), ("Uses the chain rule or the quotient rule correctly in part", 1)])

# Q14(a) counting two ways
for N in range(1, 12):
    assert math.comb(2 * N, N) == sum(math.comb(N, k)**2 for k in range(N + 1))
    assert sum(k * math.comb(N, k)**2 for k in range(N + 1)) == N * math.comb(2 * N - 1, N - 1)
    assert sum(math.comb(N - 1, j) * math.comb(N, j + 1) for j in range(N)) == math.comb(2 * N - 1, N - 1)
P.W('q14a', 8, "(i) Use the identity \\((1 + x)^{2n} = (1 + x)^n(1 + x)^n\\) to show that \\(\\dbinom{2n}{n} = \\dbinom{n}{0}^2 + \\dbinom{n}{1}^2 + \\cdots + \\dbinom{n}{n}^2\\), where \\(n\\) is a positive integer. <b>2</b><br>"
    "(ii) A choir has \\(n\\) sopranos and \\(n\\) altos. A group is chosen in which the number of sopranos equals the number of altos (the group could be empty, or the whole choir). Show, giving reasons, that the number of ways to do this is \\(\\dbinom{2n}{n}\\). <b>2</b><br>"
    "(iii) From the group chosen in part (ii), one of the sopranos is then chosen as section leader. Show, giving reasons, that the number of ways to choose the group and then the leader is \\(1\\dbinom{n}{1}^2 + 2\\dbinom{n}{2}^2 + \\cdots + n\\dbinom{n}{n}^2\\). <b>2</b><br>"
    "(iv) The process is now reversed: the section leader (a soprano) is chosen first, and then the rest of the group, still with equal numbers of sopranos and altos. By considering this reversed process, find a simple expression for the sum in part (iii). <b>2</b>",
    ["(i) The coefficient of \\(x^n\\) in \\((1 + x)^{2n}\\) is \\(\\binom{2n}{n}\\). In \\((1 + x)^n(1 + x)^n\\), an \\(x^n\\) term comes from \\(x^k\\) in the first bracket times \\(x^{n-k}\\) in the second, so the coefficient is \\(\\sum_{k=0}^{n} \\binom{n}{k}\\binom{n}{n-k} = \\sum_{k=0}^{n} \\binom{n}{k}^2\\), since \\(\\binom{n}{n-k} = \\binom{n}{k}\\).",
     "(ii) A group with \\(k\\) sopranos and \\(k\\) altos can be chosen in \\(\\binom{n}{k}\\binom{n}{k} = \\binom{n}{k}^2\\) ways. Adding over \\(k = 0, 1, \\dots, n\\) and using (i) gives \\(\\binom{2n}{n}\\).",
     "(iii) For a group with \\(k\\) of each, there are \\(\\binom{n}{k}^2\\) groups and then \\(k\\) choices of leader, giving \\(k\\binom{n}{k}^2\\). Adding over \\(k\\) (the \\(k = 0\\) term is 0) gives the sum.",
     "(iv) Choose the leader first: \\(n\\) ways. The rest of the group has \\(j\\) more sopranos from the other \\(n - 1\\), and \\(j + 1\\) altos from \\(n\\). Choosing \\(j + 1\\) altos to include is the same as choosing \\(n - j - 1\\) altos to leave out, so each group matches a choice of \\(j + (n - j - 1) = n - 1\\) people from the \\(2n - 1\\) remaining choir members.",
     "So the sum is \\(n\\dbinom{2n - 1}{n - 1}\\)."],
    [("All four parts correct", 8), ("Three parts correct and progress in the fourth", 7), ("Three parts correct", 6), ("Two parts correct and progress in another", 5), ("Two parts correct", 4), ("One part correct and progress in another", 3), ("One part correct", 2), ("Progress in one part", 1)])

# Q14(b) cubic solved with a triple angle
for v in [0.3, 1.2, 2.5]: assert abs(math.cos(v)**3 - 0.75 * math.cos(v) - math.cos(3 * v) / 4) < 1e-12
angs = [2 * PI / 9, 4 * PI / 9, 8 * PI / 9]; roots = [2 * math.cos(v) for v in angs]
assert all(abs(r**3 - 3 * r + 1) < 1e-12 for r in roots) and len({round(r, 9) for r in roots}) == 3
assert abs(sum(math.cos(v)**2 for v in angs) - 1.5) < 1e-12
P.W('q14b', 7, "(i) Show that \\(\\cos^3\\theta - \\dfrac{3}{4}\\cos\\theta - \\dfrac{\\cos(3\\theta)}{4} = 0\\). <b>2</b><br>"
    "(ii) By letting \\(x = 2\\cos\\theta\\) in the cubic equation \\(x^3 - 3x + 1 = 0\\), show that \\(\\cos(3\\theta) = -\\dfrac{1}{2}\\). <b>2</b><br>"
    "(iii) Prove that \\(\\cos^2\\dfrac{2\\pi}{9} + \\cos^2\\dfrac{4\\pi}{9} + \\cos^2\\dfrac{8\\pi}{9} = \\dfrac{3}{2}\\). <b>3</b>",
    ["(i) \\(\\cos 3\\theta = \\cos(2\\theta + \\theta) = \\cos 2\\theta\\cos\\theta - \\sin 2\\theta\\sin\\theta = (2\\cos^2\\theta - 1)\\cos\\theta - 2\\sin^2\\theta\\cos\\theta\\)", "\\(= 2\\cos^3\\theta - \\cos\\theta - 2(1 - \\cos^2\\theta)\\cos\\theta = 4\\cos^3\\theta - 3\\cos\\theta\\). Dividing by 4 and rearranging gives the result.",
     "(ii) \\(8\\cos^3\\theta - 6\\cos\\theta + 1 = 0\\), so \\(2(4\\cos^3\\theta - 3\\cos\\theta) = -1\\), that is \\(2\\cos 3\\theta = -1\\) and \\(\\cos 3\\theta = -\\frac{1}{2}\\).",
     "(iii) \\(3\\theta = \\frac{2\\pi}{3}, \\frac{4\\pi}{3}, \\frac{8\\pi}{3}\\) give \\(\\theta = \\frac{2\\pi}{9}, \\frac{4\\pi}{9}, \\frac{8\\pi}{9}\\). Their cosines are all different, so the three roots of the cubic are \\(2\\cos\\frac{2\\pi}{9}\\), \\(2\\cos\\frac{4\\pi}{9}\\), \\(2\\cos\\frac{8\\pi}{9}\\).",
     "For \\(x^3 - 3x + 1 = 0\\): \\(\\sum\\alpha = 0\\) and \\(\\sum\\alpha\\beta = -3\\), so \\(\\sum\\alpha^2 = 0^2 - 2(-3) = 6\\).", "\\(4\\left(\\cos^2\\frac{2\\pi}{9} + \\cos^2\\frac{4\\pi}{9} + \\cos^2\\frac{8\\pi}{9}\\right) = 6\\), so the sum is \\(\\frac{3}{2}\\)."],
    [("All parts correct", 7), ("Two parts correct and significant progress in the third", 6), ("Two parts correct", 5), ("One part correct and the roots identified in (iii)", 4), ("One part correct and progress in another", 3), ("One part correct", 2), ("Progress in one part", 1)])

P.save()
