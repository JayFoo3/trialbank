"""Trialbank versions of the 2022 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py.
(LaTeX goes in ordinary strings, not f-strings, so its braces are never read as Python.)"""
import math, itertools
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, tan, exp, log, symbols, integrate, diff, simplify, asin, acos, atan
from rw import Paper
from fig import Plot, INK, fix
x, t, y, a, k = symbols('x t y a k', real=True)
P = Paper('hsc-ext1-2022', seed=2022)
M = lambda s: '\\(' + s + '\\)'
VEC = lambda s: '\\underset{\\sim}{' + s + '}'
I_, J_ = VEC('i'), VEC('j')

def small(xr, yr, curves, w=230, labels=(), xt=(), yt=(), xtl=None, ytl=None, dashes=(), origin=True):
    pl = Plot(xr[0], xr[1], yr[0], yr[1], w=w)
    for d in dashes: pl.line(*d, dash='4 4', colour='#8a909c', width=1.1)
    pl.axes(xt=xt, yt=yt, xtl=xtl, ytl=ytl, origin=origin)
    for f_, lo, hi in curves: pl.curve(f_, lo, hi, width=2)
    for X_, Y_, s_, dx_, dy_ in labels: pl.text(X_, Y_, s_, dx=dx_, dy=dy_, size=12)
    return pl.svg()

# Q1 inverse cosine gives the angle in [0, pi]
assert abs(math.cos(19 * math.pi / 12) - (math.sqrt(6) - math.sqrt(2)) / 4) < 1e-12 and abs(math.acos((math.sqrt(6) - math.sqrt(2)) / 4) - 5 * math.pi / 12) < 1e-12
P.M('q01', "It is given that \\(\\cos\\left(\\dfrac{19\\pi}{12}\\right) = \\dfrac{\\sqrt{6} - \\sqrt{2}}{4}\\). What is the value of \\(\\cos^{-1}\\left(\\dfrac{\\sqrt{6} - \\sqrt{2}}{4}\\right)\\)?",
    M('\\dfrac{5\\pi}{12}'), [M('\\dfrac{19\\pi}{12}'), M('\\dfrac{7\\pi}{12}'), M('-\\dfrac{5\\pi}{12}')],
    "\\(\\cos^{-1}\\) always gives an angle from 0 to \\(\\pi\\), so \\(\\frac{19\\pi}{12}\\) cannot be the answer. Since \\(\\cos\\theta = \\cos(2\\pi - \\theta)\\), \\(\\cos\\frac{19\\pi}{12} = \\cos\\frac{5\\pi}{12}\\), and \\(\\frac{5\\pi}{12}\\) is in \\([0, \\pi]\\).")

# Q2 identify a transformation from its graph
f2 = lambda X: 2 / (X + 1) - 1
asym = [(-1, -3.6, -1, 4.6), (-5.2, -1, 5.2, -1)]
pf = Plot(-5.2, 5.2, -3.6, 4.6, w=300); [pf.line(*d, dash='4 4', colour='#8a909c', width=1.1) for d in asym]; pf.axes(xt=[], yt=[]); pf.curve(f2, -5.2, -1.05); pf.curve(f2, -0.95, 5.2); pf.text(2.6, f2(2.6), 'y = f(x)', dy=-22, var=True, size=13)
pg = Plot(-5.2, 5.2, -3.6, 4.6, w=300); [pg.line(*d, dash='4 4', colour='#8a909c', width=1.1) for d in [(-1, -3.6, -1, 4.6), (-5.2, 1, 5.2, 1)]]; pg.axes(xt=[], yt=[]); pg.curve(lambda X: abs(f2(X)), -5.2, -1.05); pg.curve(lambda X: abs(f2(X)), -0.95, 5.2); pg.text(-3.4, abs(f2(-3.4)), 'y = g(x)', dy=-14, var=True, size=13)
assert all(abs(abs(f2(X)) - (f2(X) if f2(X) >= 0 else -f2(X))) < 1e-12 for X in [-3, -2, 0, 0.5, 2, 4])
P.M('q02', "The graph of \\(f(x) = \\dfrac{2}{x + 1} - 1\\) is shown." + pf.svg() + "The graph of \\(f(x)\\) was transformed to give the graph of \\(g(x)\\) shown below." + pg.svg() + "Which transformation was applied?",
    M('g(x) = |f(x)|'), [M('g(x) = f(|x|)'), M('g(x) = f(-x)'), M('g(x) = \\dfrac{1}{f(x)}')],
    "Every part of the graph that was below the \\(x\\)-axis has been reflected above it, and the parts already above are unchanged, which is \\(|f(x)|\\). (\\(f(|x|)\\) would make the graph symmetric about the \\(y\\)-axis instead.)")

# Q3 degree of a divisor from the remainder
P.M('q03', "\\(P(x)\\) is a polynomial of degree 6. When \\(P(x)\\) is divided by the polynomial \\(Q(x)\\), the remainder is \\(x^2 - 3\\). Which statement about the degree of \\(Q(x)\\) is true?",
    'The degree could be 3.', ['The degree must be 3.', 'The degree must be 2.', 'The degree could be 2.'],
    "A remainder always has a lower degree than the divisor, so \\(Q\\) has degree at least 3. It can also be any degree up to 6, so 3 is possible but not forced.")

# Q4 which pair of graphs adds to the given graph (read values off the grid)
h4 = lambda X: 0.5 * X**2 - X - 2
pairs = {'A': (lambda X: 0.5 * X**2 - 2 * X - 1, lambda X: X - 1), 'B': (lambda X: 0.5 * X**2 - 2 * X - 1, lambda X: -X - 1),
         'C': (lambda X: 0.5 * X**2 + 1, lambda X: -X - 1), 'D': (lambda X: 0.5 * X**2 - 2 * X + 1, lambda X: X - 1)}
good = [kk for kk, (F, G) in pairs.items() if all(abs(F(X) + G(X) - h4(X)) < 1e-12 for X in range(-4, 7))]; assert good == ['A']
GR = dict(xt=[-2, 2, 4], yt=[-2, 2])
def grid_plot(curves, w):
    pl = Plot(-3.6, 6.4, -4.4, 4.4, w=w)
    for v in range(-3, 7):
        if v: pl.line(v, -4.4, v, 4.4, width=0.5, colour='#e6e8ec')
    for v in range(-4, 5):
        if v: pl.line(-3.6, v, 6.4, v, width=0.5, colour='#e6e8ec')
    pl.axes(**GR)
    for f_ in curves: pl.curve(f_, -3.6, 6.4, width=2)
    return pl
ph = grid_plot([h4], 300); ph.text(5.2, h4(5.2) if h4(5.2) < 4.2 else 4.0, 'y = f(x) + g(x)', dx=-4, anchor='end', var=True, size=13)
opt4 = {kk: grid_plot(list(v), 220).svg() for kk, v in pairs.items()}
P.M('q04', "The graph of \\(y = f(x) + g(x)\\) is shown, where \\(f(x)\\) is a quadratic and \\(g(x)\\) is linear." + ph.svg() + "Which diagram shows the graphs of \\(y = f(x)\\) and \\(y = g(x)\\)?",
    opt4['A'], [opt4['B'], opt4['C'], opt4['D']],
    "Add the two graphs at a few \\(x\\)-values and compare with the sum. The sum passes through \\((0, -2)\\), \\((2, -2)\\) and \\((4, 2)\\). Only one pair gives all three: the parabola through \\((0, -1)\\), \\((2, -3)\\), \\((4, -1)\\) with the line through \\((0, -1)\\), \\((2, 1)\\), \\((4, 3)\\). The other pairs match at one point at most, so checking a single point is not enough.")

# Q5 sketch a parametric curve
cA = lambda X: 1 + (1 - X)**2; cB = lambda X: 5 - (X + 1)**2; cC = lambda X: 5 - (X + 1) - 0.5 * (X + 1)**2; cD = lambda X: 1 + 1.5 * (1 - X)**2 - (1 - X)
for f_ in (cA, cB, cC, cD): assert abs(f_(-1) - 5) < 1e-12 and abs(f_(1) - 1) < 1e-12
assert all(abs((1 + tv**2) - cA(1 - tv)) < 1e-12 for tv in [0, 0.5, 1.2, 2])
def sk(f_):
    pl = Plot(-1.9, 2.0, 0.3, 5.9, w=210); pl.curve(f_, -1, 1, width=2); pl.text(-1, 5, '(−1, 5)', dx=-6, dy=4, anchor='end', size=12); pl.text(1, 1, '(1, 1)', dx=6, dy=4, anchor='start', size=12)
    return pl.svg()
P.M('q05', "A curve is given by \\(x = 1 - t\\) and \\(y = 1 + t^2\\) for \\(0 \\le t \\le 2\\). Which diagram best shows this curve?",
    sk(cA), [sk(cB), sk(cC), sk(cD)],
    "Eliminating \\(t = 1 - x\\) gives \\(y = 1 + (1 - x)^2\\) for \\(-1 \\le x \\le 1\\). This is part of a concave-up parabola whose turning point is \\((1, 1)\\), so the curve comes down from \\((-1, 5)\\) and flattens out to be horizontal as it reaches \\((1, 1)\\), never dipping below \\(y = 1\\).")

# Q6 projections read from a scale diagram
uu = sp.Matrix([Q(8, 5), Q(12, 5)]); proj = lambda v_: (uu.dot(v_) / v_.dot(v_)) * v_
assert proj(sp.Matrix([1, 1])) == sp.Matrix([2, 2]) and proj(sp.Matrix([-1, -1])) == sp.Matrix([2, 2]) and proj(sp.Matrix([1, -1])) == sp.Matrix([Q(-2, 5), Q(2, 5)]) and proj(sp.Matrix([-1, 1])) == sp.Matrix([Q(-2, 5), Q(2, 5)])
pl = Plot(-2.6, 2.9, -2.1, 2.9, w=330); pl.axes(xt=[], yt=[])
for (X, Y), lab, dx_, dy_, anc in [((1, 1), 'i + j', 6, 0, 'start'), ((-1, 1), '−i + j', -6, 0, 'end'), ((-1, -1), '−i − j', -6, 10, 'end'), ((1, -1), 'i − j', 6, 10, 'start')]:
    pl.line(0, 0, X, Y, width=1.5, arrow=True); pl.text(X, Y, lab, dx=dx_, dy=dy_, anchor=anc, var=True, size=13)
pl.line(0, 0, 1.6, 2.4, width=2.2, arrow=True); pl.text(1.6, 2.4, 'u', dx=8, dy=0, anchor='start', var=True, size=15); pl.text(-2.5, 2.7, 'DRAWN TO SCALE', anchor='start', size=11)
P.M('q06', "The diagram shows the vector " + M(VEC('u')) + " and the vectors " + M(I_ + ' + ' + J_) + ", " + M('-' + I_ + ' + ' + J_) + ", " + M('-' + I_ + ' - ' + J_) + " and " + M(I_ + ' - ' + J_) + "." + pl.svg() + "Which statement could be true?",
    'The projection of ' + M(VEC('u')) + ' onto ' + M(I_ + ' - ' + J_) + ' is ' + M('-0.4' + I_ + ' + 0.4' + J_) + '.',
    ['The projection of ' + M(VEC('u')) + ' onto ' + M(I_ + ' + ' + J_) + ' is ' + M('2.4' + I_ + ' + 1.6' + J_) + '.', 'The projection of ' + M(VEC('u')) + ' onto ' + M('-' + I_ + ' + ' + J_) + ' is ' + M('0.4' + I_ + ' - 0.4' + J_) + '.', 'The projection of ' + M(VEC('u')) + ' onto ' + M('-' + I_ + ' - ' + J_) + ' is ' + M('-2' + I_ + ' - 2' + J_) + '.'],
    "A projection onto a vector is parallel to it, and points the way \\(" + VEC('u') + "\\) leans. \\(" + VEC('u') + "\\) makes an obtuse angle with \\(" + I_ + " - " + J_ + "\\), so its projection points the opposite way, along \\(-" + I_ + " + " + J_ + "\\), and is short because \\(" + VEC('u') + "\\) is nearly perpendicular to it. Projecting onto \\(-" + I_ + " - " + J_ + "\\) gives the same vector as projecting onto \\(" + I_ + " + " + J_ + "\\) (pointing up and right), and \\(2.4" + I_ + " + 1.6" + J_ + "\\) is not parallel to \\(" + I_ + " + " + J_ + "\\).")

# Q7 triangles from points on the sides of a triangle
n7 = math.comb(15, 3) - math.comb(4, 3) - math.comb(5, 3) - math.comb(6, 3); assert n7 == 421
pts = [('AB', 4), ('AC', 5), ('BC', 6)]; Av, Bv, Cv = (1.0, 3.2), (0.0, 0.0), (6.5, 1.0)
pl = Plot(-0.6, 7.2, -0.6, 3.8, w=420)
pl.raw(f'<path d="M{pl.X(Av[0])},{pl.Y(Av[1])}L{pl.X(Bv[0])},{pl.Y(Bv[1])}L{pl.X(Cv[0])},{pl.Y(Cv[1])}Z" fill="none" stroke="{INK}" stroke-width="1.5"/>')
for (P1, P2), nn in [((Av, Bv), 4), ((Av, Cv), 5), ((Bv, Cv), 6)]:
    for i in range(1, nn + 1): s_ = i / (nn + 1); pl.dot(P1[0] + s_ * (P2[0] - P1[0]), P1[1] + s_ * (P2[1] - P1[1]), r=3.2)
pl.text(*Av, 'A', dy=-8, var=True); pl.text(*Bv, 'B', dx=-8, dy=6, anchor='end', var=True); pl.text(*Cv, 'C', dx=8, dy=5, anchor='start', var=True)
P.M('q07', "In triangle \\(ABC\\), 4 points are chosen on side \\(AB\\), 5 points on side \\(AC\\) and 6 points on side \\(BC\\) (none of them at the corners)." + pl.svg() + "How many triangles can be formed using the chosen points as vertices?",
    M('421'), [M('120'), M('435'), M('455')],
    "There are 15 points, giving \\(\\binom{15}{3} = 455\\) ways to choose 3. Three points on the same side are in a straight line and do not make a triangle, so subtract \\(\\binom{4}{3} + \\binom{5}{3} + \\binom{6}{3} = 4 + 10 + 20 = 34\\): \\(455 - 34 = 421\\). (120 only counts triangles with one point on each side.)")

# Q8 range of an angle from the length of a difference
for th in [0, 0.3, 1.0, 1.04]: assert 2 - 2 * math.cos(th) < 1
for th in [math.pi / 3 + 0.01, 2, 3]: assert not (2 - 2 * math.cos(th) < 1)
P.M('q08', "The angle between two unit vectors " + M(VEC('a')) + " and " + M(VEC('b')) + " is \\(\\theta\\), and " + M('|' + VEC('a') + ' - ' + VEC('b') + '| < 1') + ". Which describes all possible values of \\(\\theta\\)?",
    M('0 \\le \\theta < \\frac{\\pi}{3}'), [M('0 \\le \\theta < \\frac{2\\pi}{3}'), M('\\frac{\\pi}{3} < \\theta \\le \\pi'), M('\\frac{2\\pi}{3} < \\theta \\le \\pi')],
    M('|' + VEC('a') + ' - ' + VEC('b') + '|^2 = 1 + 1 - 2\\cos\\theta') + ", so we need \\(2 - 2\\cos\\theta < 1\\), that is \\(\\cos\\theta > \\frac{1}{2}\\). With \\(0 \\le \\theta \\le \\pi\\), that means \\(0 \\le \\theta < \\frac{\\pi}{3}\\).")

# Q9 where a function meets its inverse
P.M('q09', "A function \\(f(x)\\) has an inverse function \\(f^{-1}(x)\\), and both are differentiable for every real \\(x\\). The graphs of \\(y = f(x)\\) and \\(y = f^{-1}(x)\\) meet at least once. Which statement must be true at every point where they meet?",
    'The tangents to the two graphs are not perpendicular.', ['The point lies on the line \\(y = x\\).', 'The point does not lie on the line \\(y = x\\).', 'The tangents to the two graphs are not parallel.'],
    "At a meeting point \\((p, q)\\), the slope of \\(f^{-1}\\) there is \\(\\frac{1}{f'(q)}\\). For example \\(f(x) = -x\\) is its own inverse, so the graphs meet everywhere (including off \\(y = x\\)) with parallel, identical tangents, which rules out three options. Perpendicular tangents would need the product of the slopes to be \\(-1\\), but a function with a differentiable inverse is strictly increasing or strictly decreasing, so both graphs slope the same way and the product of the slopes is positive.")

# Q10 which graph could solve dy/dx = cos y - 1
ys = lambda X: math.pi - 2 * math.atan(X)
xs_ = symbols('xs'); assert simplify(diff(pi - 2 * atan(xs_), xs_) - (cos(pi - 2 * atan(xs_)) - 1)) == 0 or all(abs(float(diff(pi - 2 * atan(xs_), xs_).subs(xs_, v) - (cos(pi - 2 * atan(xs_)) - 1).subs(xs_, v))) < 1e-12 for v in [-3, -0.5, 0, 0.7, 4])
TP = 2 * math.pi
o10 = [small((-6, 6), (-1.2, 7.4), [(ys, -6, 6)], dashes=[(-6, TP, 6, TP)], yt=[TP], ytl=['2π']),
       small((-6, 6), (-1.2, 7.4), [(lambda X: math.pi + 2 * math.atan(X), -6, 6)], dashes=[(-6, TP, 6, TP)], yt=[TP], ytl=['2π']),
       small((-6, 6), (-1.2, 7.4), [(lambda X: 1.2 + 4 * math.exp(-X * X / 6), -6, 6)], dashes=[(-6, 1.2, 6, 1.2)], yt=[]),
       small((-6, 6), (-1.2, 7.4), [(lambda X: 3.3 - 0.45 * X - 0.55 * math.sin(1.4 * X), -6, 6)], yt=[])]
P.M('q10', "Which of these could be the graph of a solution of the differential equation \\(\\dfrac{dy}{dx} = \\cos y - 1\\)?", o10[0], o10[1:],
    "\\(\\cos y - 1 \\le 0\\), so every solution is decreasing (or constant). It is 0 when \\(y = 0, \\pm 2\\pi, \\dots\\), so those horizontal lines are solutions and other solutions cannot cross them. A solution starting between 0 and \\(2\\pi\\) decreases, levelling off towards \\(2\\pi\\) on the left and towards 0 on the right. (In fact \\(y = \\pi - 2\\tan^{-1} x\\) is one.)")

# Q11(a)
u11, v11 = sp.Matrix([2, 3]), sp.Matrix([1, -2]); assert 2 * u11 - v11 == sp.Matrix([3, 8]) and u11.dot(v11) == -4
P.W('q11a', 2, "For the vectors " + M(VEC('u') + ' = 2' + I_ + ' + 3' + J_) + " and " + M(VEC('v') + ' = ' + I_ + ' - 2' + J_) + ", find<br>(i) " + M('2' + VEC('u') + ' - ' + VEC('v')) + " <b>1</b><br>(ii) " + M(VEC('u') + ' \\cdot ' + VEC('v')) + " <b>1</b>",
    ["(i) " + M('2' + VEC('u') + ' - ' + VEC('v') + ' = (4' + I_ + ' + 6' + J_ + ') - (' + I_ + ' - 2' + J_ + ') = 3' + I_ + ' + 8' + J_), "(ii) " + M(VEC('u') + ' \\cdot ' + VEC('v') + ' = 2 \\times 1 + 3 \\times (-2) = -4')],
    [("Both parts correct", 2), ("One part correct", 1)])

# Q11(b)
I11b = integrate(x / sqrt(x**2 + 5), (x, 0, 2)); assert simplify(I11b - (3 - sqrt(5))) == 0
P.W('q11b', 3, "Use the substitution \\(u = x^2 + 5\\) to find the exact value of \\(\\displaystyle\\int_0^2 \\frac{x}{\\sqrt{x^2 + 5}}\\,dx\\).",
    ["\\(du = 2x\\,dx\\). When \\(x = 0\\), \\(u = 5\\); when \\(x = 2\\), \\(u = 9\\).", "\\(\\displaystyle\\int_0^2 \\frac{x}{\\sqrt{x^2 + 5}}\\,dx = \\frac{1}{2}\\int_5^9 u^{-\\frac{1}{2}}\\,du = \\left[u^{\\frac{1}{2}}\\right]_5^9\\)", "\\(= 3 - \\sqrt{5}\\)"],
    [("Correct exact answer", 3), ("Correct integral in \\(u\\) with correct limits and a correct primitive", 2), ("Correct integral in \\(u\\), or correct limits", 1)])

# Q11(c)
ex = sp.expand((1 + x / 3)**9); assert ex.coeff(x, 2) == 4 and ex.coeff(x, 3) == Q(28, 9)
P.W('q11c', 2, "Find the coefficients of \\(x^2\\) and \\(x^3\\) in the expansion of \\(\\left(1 + \\dfrac{x}{3}\\right)^9\\).",
    ["Coefficient of \\(x^2\\): \\(\\binom{9}{2}\\left(\\frac{1}{3}\\right)^2 = \\frac{36}{9} = 4\\)", "Coefficient of \\(x^3\\): \\(\\binom{9}{3}\\left(\\frac{1}{3}\\right)^3 = \\frac{84}{27} = \\frac{28}{9}\\)"],
    [("Both coefficients correct", 2), ("One coefficient correct", 1)])

# Q11(d)
assert sp.solve(sp.Matrix([a, 2]).dot(sp.Matrix([a - 9, 3 * a - 2])), a) == [-1, 4]
P.W('q11d', 2, "The vectors " + M(VEC('u') + ' = \\begin{pmatrix} a \\\\ 2 \\end{pmatrix}') + " and " + M(VEC('v') + ' = \\begin{pmatrix} a - 9 \\\\ 3a - 2 \\end{pmatrix}') + " are perpendicular. What are the possible values of \\(a\\)?",
    ["\\(a(a - 9) + 2(3a - 2) = 0\\)", "\\(a^2 - 3a - 4 = 0\\), so \\((a - 4)(a + 1) = 0\\)", "\\(a = 4\\) or \\(a = -1\\)"],
    [("Both values correct", 2), ("Correct quadratic from the dot product", 1)])

# Q11(e)
R11, al = 2 * sqrt(3), -pi / 6; assert all(abs(float((3 * sin(x) - sqrt(3) * cos(x) - R11 * sin(x + al)).subs(x, v))) < 1e-12 for v in [0.2, 1.1, 2.9, 5])
P.W('q11e', 3, "Express \\(3\\sin x - \\sqrt{3}\\cos x\\) in the form \\(R\\sin(x + \\alpha)\\), where \\(R > 0\\) and \\(-\\pi < \\alpha \\le \\pi\\).",
    ["\\(R\\sin(x + \\alpha) = R\\sin x\\cos\\alpha + R\\cos x\\sin\\alpha\\), so \\(R\\cos\\alpha = 3\\) and \\(R\\sin\\alpha = -\\sqrt{3}\\).", "\\(R = \\sqrt{9 + 3} = 2\\sqrt{3}\\)", "\\(\\tan\\alpha = -\\frac{1}{\\sqrt{3}}\\) with \\(\\cos\\alpha > 0\\), so \\(\\alpha = -\\frac{\\pi}{6}\\).", "\\(3\\sin x - \\sqrt{3}\\cos x = 2\\sqrt{3}\\sin\\left(x - \\frac{\\pi}{6}\\right)\\)"],
    [("Correct \\(R\\) and \\(\\alpha\\)", 3), ("Correct \\(R\\), and \\(\\alpha\\) found with an error in its quadrant", 2), ("Correct \\(R\\), or correct equations for \\(R\\cos\\alpha\\) and \\(R\\sin\\alpha\\)", 1)])

# Q11(f)
assert sp.solve_univariate_inequality(x / (x - 3) >= 4, x, relational=False) == sp.Interval.Lopen(3, 4)
P.W('q11f', 3, "Solve \\(\\dfrac{x}{x - 3} \\ge 4\\).",
    ["Multiply both sides by \\((x - 3)^2\\), which is positive (\\(x \\ne 3\\)): \\(x(x - 3) \\ge 4(x - 3)^2\\)", "\\(x(x - 3) - 4(x - 3)^2 \\ge 0\\), so \\((x - 3)(x - 4x + 12) \\ge 0\\), that is \\((x - 3)(12 - 3x) \\ge 0\\).", "So \\((x - 3)(x - 4) \\le 0\\), giving \\(3 \\le x \\le 4\\), but \\(x \\ne 3\\).", "\\(3 < x \\le 4\\)"],
    [("Correct solution", 3), ("Correct critical values and inequality, but \\(x = 3\\) not excluded", 2), ("Multiplies by \\((x - 3)^2\\) or considers cases, with progress", 1)])

# Q12(a) draw slopes at three points
sl = lambda X, Y: (2 * X - Y) / (X**2 + Y**2); assert sl(1, 2) == 0 and abs(sl(2, 1) - 0.6) < 1e-12 and sl(-1, 1) == -1.5
pl = Plot(-2.6, 3.2, -1.2, 3.2, w=360)
for v in range(-2, 4):
    if v: pl.line(v, -1.2, v, 3.2, width=0.5, colour='#e6e8ec')
for v in range(-1, 4):
    if v: pl.line(-2.6, v, 3.2, v, width=0.5, colour='#e6e8ec')
pl.axes(xt=[-2, -1, 1, 2, 3], yt=[1, 2, 3])
for (X, Y), lab in [((1, 2), 'P'), ((2, 1), 'Q'), ((-1, 1), 'R')]: pl.dot(X, Y); pl.text(X, Y, lab, dx=7, dy=-7, anchor='start', var=True)
P.W('q12a', 2, "A direction field is to be drawn for \\(\\dfrac{dy}{dx} = \\dfrac{2x - y}{x^2 + y^2}\\). On the diagram, draw the slope of the direction field at each of the points \\(P\\), \\(Q\\) and \\(R\\)." + pl.svg(),
    ["At \\(P(1, 2)\\): \\(\\frac{2 - 2}{1 + 4} = 0\\), a horizontal segment.", "At \\(Q(2, 1)\\): \\(\\frac{4 - 1}{4 + 1} = 0.6\\), a gentle upward slope.", "At \\(R(-1, 1)\\): \\(\\frac{-2 - 1}{1 + 1} = -1.5\\), a steep downward slope.", "The segments should show these differences: flat at \\(P\\), gently rising at \\(Q\\), steeply falling at \\(R\\)."],
    [("All three slopes drawn correctly", 2), ("Two slopes correct, or all three values calculated", 1)])

# Q12(b) pigeonhole
assert 11 * 4 < 45
P.W('q12b', 2, "A league has 11 teams. A team is fined if more than 4 of its players are found to be registered incorrectly. In total, 45 players are found to be registered incorrectly. Must at least one team be fined? Justify your answer.",
    ["If no team were fined, each team would have at most 4 incorrectly registered players, giving at most \\(11 \\times 4 = 44\\) in total.", "But there are 45, so by the pigeonhole principle at least one team has 5 or more, and must be fined."],
    [("Correct conclusion with a pigeonhole justification", 2), ("Finds \\(11 \\times 4 = 44\\), or states the pigeonhole principle", 1)])

# Q12(c) tangent to x arcsin x
Y12 = x * asin(x); m12 = diff(Y12, x).subs(x, Q(1, 2)); assert simplify(m12 - (pi / 6 + sqrt(3) / 3)) == 0 and simplify(Y12.subs(x, Q(1, 2)) - m12 / 2 + sqrt(3) / 6) == 0
P.W('q12c', 3, "Find the equation of the tangent to the curve \\(y = x\\sin^{-1}(x)\\) at the point \\(\\left(\\frac{1}{2}, \\frac{\\pi}{12}\\right)\\). Give your answer in the form \\(y = mx + c\\).",
    ["\\(\\dfrac{dy}{dx} = \\sin^{-1} x + \\dfrac{x}{\\sqrt{1 - x^2}}\\)", "At \\(x = \\frac{1}{2}\\): \\(m = \\frac{\\pi}{6} + \\frac{\\frac{1}{2}}{\\frac{\\sqrt{3}}{2}} = \\frac{\\pi}{6} + \\frac{\\sqrt{3}}{3}\\)",
     "\\(y - \\frac{\\pi}{12} = \\left(\\frac{\\pi}{6} + \\frac{\\sqrt{3}}{3}\\right)\\left(x - \\frac{1}{2}\\right)\\)", "\\(y = \\left(\\frac{\\pi}{6} + \\frac{\\sqrt{3}}{3}\\right)x - \\frac{\\sqrt{3}}{6}\\)"],
    [("Correct equation in the required form", 3), ("Correct gradient at the point", 2), ("Correct derivative using the product rule", 1)])

# Q12(d) Newton's law of cooling
kk = math.log(0.8) / 4; Tf = lambda tv: 20 + 70 * math.exp(kk * tv); assert abs(Tf(4) - 76) < 1e-9 and abs(Tf(0) - 90) < 1e-12
tt48 = 4 * math.log(0.4) / math.log(0.8); assert round(tt48) == 16 and abs(Tf(tt48) - 48) < 1e-9
P.W('q12d', 4, "Soup at 90°C is served in a room where the temperature is 20°C. Its temperature \\(T\\) in degrees Celsius, \\(t\\) minutes after it is served, satisfies \\(\\dfrac{dT}{dt} = k(T - 20)\\), where \\(k\\) is a constant.<br>"
    "(i) After 4 minutes the soup has cooled to 76°C. Using separation of variables, show that \\(T = 20 + 70e^{\\frac{t}{4}\\ln\\left(\\frac{4}{5}\\right)}\\). <b>3</b><br>(ii) Find, to the nearest minute, when the soup reaches 48°C. <b>1</b>",
    ["(i) \\(\\displaystyle\\int \\frac{dT}{T - 20} = \\int k\\,dt\\), so \\(\\ln|T - 20| = kt + C\\) and \\(T = 20 + Ae^{kt}\\).", "At \\(t = 0\\), \\(T = 90\\): \\(A = 70\\).", "At \\(t = 4\\), \\(T = 76\\): \\(56 = 70e^{4k}\\), so \\(e^{4k} = \\frac{4}{5}\\) and \\(k = \\frac{1}{4}\\ln\\frac{4}{5}\\).", "So \\(T = 20 + 70e^{\\frac{t}{4}\\ln\\left(\\frac{4}{5}\\right)}\\).",
     "(ii) \\(48 = 20 + 70e^{\\frac{t}{4}\\ln\\frac{4}{5}}\\), so \\(e^{\\frac{t}{4}\\ln\\frac{4}{5}} = 0.4\\) and \\(t = \\dfrac{4\\ln 0.4}{\\ln 0.8} \\approx 16.4\\), so about 16 minutes."],
    [("Both parts correct", 4), ("Part (i) correct", 3), ("Correct general solution \\(T = 20 + Ae^{kt}\\) and \\(A = 70\\), or part (ii) correct", 2), ("Separates the variables and integrates correctly", 1)])

# Q12(e) expected score
assert abs(5 * (0.4 * 12 - 0.6 * 6) - 6) < 1e-12
P.W('q12e', 2, "In a game, 5 counters are drawn one at a time from a bag holding 2 red and 3 blue counters, and each counter is put back before the next draw. Each red counter drawn scores 12 points and each blue counter drawn loses 6 points. What is the expected score?",
    ["Each draw scores \\(12\\) with probability \\(\\frac{2}{5}\\) and \\(-6\\) with probability \\(\\frac{3}{5}\\): expected \\(12 \\times 0.4 - 6 \\times 0.6 = 1.2\\) per draw.", "Over 5 draws the expected score is \\(5 \\times 1.2 = 6\\) points."],
    [("Correct expected score", 2), ("Correct expected number of red counters, or correct expected score for one draw", 1)])

# Q12(f) induction: divisibility
for N in range(0, 25): assert (11**N + 3 * 2**(2 * N + 1)) % 7 == 0
P.W('q12f', 3, "Use mathematical induction to prove that \\(11^n + 3 \\times 2^{2n+1}\\) is divisible by 7 for all integers \\(n \\ge 0\\).",
    ["<b>Step 1.</b> Prove true for \\(n = 0\\): \\(11^0 + 3 \\times 2^1 = 1 + 6 = 7\\), which is divisible by 7.",
     "<b>Step 2.</b> Assume true for \\(n = k\\): \\(11^k + 3 \\times 2^{2k+1} = 7M\\) for some integer \\(M\\), so \\(11^k = 7M - 3 \\times 2^{2k+1}\\).",
     "<b>Step 3.</b> Prove true for \\(n = k + 1\\): \\(11^{k+1} + 3 \\times 2^{2k+3} = 11 \\times 11^k + 12 \\times 2^{2k+1}\\)",
     "\\(= 11(7M - 3 \\times 2^{2k+1}) + 12 \\times 2^{2k+1}\\) (by the assumption) \\(= 77M - 21 \\times 2^{2k+1} = 7(11M - 3 \\times 2^{2k+1})\\), which is divisible by 7.",
     "So if it is true for \\(n = k\\), it is true for \\(n = k + 1\\). Since it is true for \\(n = 0\\), by mathematical induction it is true for all integers \\(n \\ge 0\\)."],
    [("Correct proof", 3), ("Proves the case \\(n = 0\\) and uses the assumption in an attempt at \\(n = k + 1\\)", 2), ("Proves the case \\(n = 0\\), or states the assumption and what must be proved", 1)])

# Q13(a) vectors on a circle
th = [2.0, 3.9, 5.6]; Ad, Bd, Cd = [(math.cos(v), math.sin(v)) for v in (1.4, 3.3, -0.35)]
Hd = (Ad[0] + Bd[0] + Cd[0], Ad[1] + Bd[1] + Cd[1]); AH = (Hd[0] - Ad[0], Hd[1] - Ad[1]); BC = (Cd[0] - Bd[0], Cd[1] - Bd[1]); assert abs(AH[0] * BC[0] + AH[1] * BC[1]) < 1e-12
pl = Plot(-1.25, 1.6, -1.2, 1.25, w=330)
pl.raw(f'<circle cx="{pl.X(0)}" cy="{pl.Y(0)}" r="{round(pl.X(1) - pl.X(0), 1)}" fill="none" stroke="{INK}" stroke-width="1.4"/>')
pl.raw(f'<path d="M{pl.X(Ad[0])},{pl.Y(Ad[1])}L{pl.X(Bd[0])},{pl.Y(Bd[1])}L{pl.X(Cd[0])},{pl.Y(Cd[1])}Z" fill="none" stroke="{INK}" stroke-width="1.2"/>')
for P_, lab, dx_, dy_ in [(Ad, 'a', -8, 0), (Bd, 'b', 0, -8), (Cd, 'c', 8, 0)]: pl.line(0, 0, P_[0], P_[1], width=1.4, arrow=True); pl.text(P_[0] * 0.5, P_[1] * 0.5, lab, dx=dx_, dy=dy_, var=True, size=14)
pl.line(0, 0, Hd[0], Hd[1], width=1.6, arrow=True); pl.dot(0, 0, 2.5)
pl.text(0, 0, 'O', dx=8, dy=-6, anchor='start', var=True); pl.text(*Hd, 'H', dx=8, dy=4, anchor='start', var=True)
for P_, lab, dx_, dy_ in [(Ad, 'A', 0, -9), (Bd, 'B', -10, 4), (Cd, 'C', 8, 10)]: pl.text(P_[0], P_[1], lab, dx=dx_, dy=dy_, var=True)
pl.text(1.55, 1.1, 'NOT TO SCALE', anchor='end', size=11)
OA, OB, OC, OH = ('\\overrightarrow{OA}', '\\overrightarrow{OB}', '\\overrightarrow{OC}', '\\overrightarrow{OH}')
P.W('q13a', 3, "Three different points \\(A\\), \\(B\\) and \\(C\\) lie on a circle with centre \\(O\\). Let " + M(VEC('a') + ' = ' + OA) + ", " + M(VEC('b') + ' = ' + OB) + " and " + M(VEC('c') + ' = ' + OC) + ", and let \\(H\\) be the point with " + M(OH + ' = ' + VEC('a') + ' + ' + VEC('b') + ' + ' + VEC('c')) + "." + pl.svg() + "Show that \\(\\overrightarrow{AH}\\) and \\(\\overrightarrow{BC}\\) are perpendicular.",
    [M('\\overrightarrow{AH} = ' + OH + ' - ' + OA + ' = ' + VEC('b') + ' + ' + VEC('c')) + " and " + M('\\overrightarrow{BC} = ' + VEC('c') + ' - ' + VEC('b')), M('\\overrightarrow{AH} \\cdot \\overrightarrow{BC} = (' + VEC('c') + ' + ' + VEC('b') + ') \\cdot (' + VEC('c') + ' - ' + VEC('b') + ') = |' + VEC('c') + '|^2 - |' + VEC('b') + '|^2'),
     "\\(B\\) and \\(C\\) are on the circle, so " + M('|' + VEC('b') + '| = |' + VEC('c') + '|') + " (both are radii) and the dot product is 0.", "Since neither vector is zero, \\(\\overrightarrow{AH}\\) and \\(\\overrightarrow{BC}\\) are perpendicular."],
    [("Complete proof", 3), ("Correct dot product simplified to \\(|\\underset{\\sim}{c}|^2 - |\\underset{\\sim}{b}|^2\\)", 2), ("Correct expressions for \\(\\overrightarrow{AH}\\) and \\(\\overrightarrow{BC}\\)", 1)])

# Q13(b) volume with a parameter, two answers
kp = symbols('k', positive=True); V13 = pi * integrate(((kp + 1) * cos(kp * x))**2, (x, 0, pi / (2 * kp))); assert simplify(V13 - pi**2 * (kp + 1)**2 / (4 * kp)) == 0
ks = sp.solve(sp.Eq(V13, 2 * pi**2), kp); assert sorted(simplify(v) for v in ks) == sorted([3 - 2 * sqrt(2), 3 + 2 * sqrt(2)])
pl = Plot(-0.25, 1.9, -0.35, 2.4, w=300)
pl.region([(0, 0)] + [(i * (math.pi / 2) / 100, 2 * math.cos(i * (math.pi / 2) / 100)) for i in range(101)])
pl.axes(xt=[math.pi / 2], xtl=['π⁄(2k)'], yt=[2], ytl=['k + 1']); pl.curve(lambda X: 2 * math.cos(X), 0, math.pi / 2)
P.W('q13b', 3, "The region bounded by the curve \\(y = (k + 1)\\cos(kx)\\), where \\(k > 0\\), and the coordinate axes, between \\(x = 0\\) and \\(x = \\dfrac{\\pi}{2k}\\), is rotated about the \\(x\\)-axis." + pl.svg() + "Find the values of \\(k\\) for which the volume of the solid is \\(2\\pi^2\\).",
    ["\\(\\displaystyle V = \\pi\\int_0^{\\frac{\\pi}{2k}} (k + 1)^2\\cos^2(kx)\\,dx = \\frac{\\pi(k + 1)^2}{2}\\int_0^{\\frac{\\pi}{2k}} (1 + \\cos 2kx)\\,dx\\)", "\\(\\displaystyle= \\frac{\\pi(k + 1)^2}{2}\\left[x + \\frac{\\sin 2kx}{2k}\\right]_0^{\\frac{\\pi}{2k}} = \\frac{\\pi(k + 1)^2}{2} \\times \\frac{\\pi}{2k} = \\frac{\\pi^2(k + 1)^2}{4k}\\)",
     "\\(\\frac{\\pi^2(k + 1)^2}{4k} = 2\\pi^2\\), so \\((k + 1)^2 = 8k\\) and \\(k^2 - 6k + 1 = 0\\).", "\\(k = 3 \\pm 2\\sqrt{2}\\), and both are positive, so both values work."],
    [("Both correct values", 3), ("Correct volume in terms of \\(k\\)", 2), ("Correct integral for the volume, or uses \\(\\cos^2 kx = \\frac{1}{2}(1 + \\cos 2kx)\\)", 1)])

# Q13(c) is arccos the inverse of cos on all reals?
assert abs(math.acos(math.cos(2 * math.pi)) - 0) < 1e-12
P.W('q13c', 2, "The function \\(f\\) is defined by \\(f(x) = \\cos x\\) for all real numbers \\(x\\), and \\(g\\) is defined on \\([-1, 1]\\) by \\(g(x) = \\cos^{-1}(x)\\). Is \\(g\\) the inverse function of \\(f\\)? Justify your answer.",
    ["No. \\(f\\) is not one-to-one on the real numbers, for example \\(f(0) = f(2\\pi) = 1\\), so \\(f\\) has no inverse function.", "For instance \\(g(f(2\\pi)) = \\cos^{-1}(1) = 0 \\ne 2\\pi\\). (\\(g\\) is the inverse of \\(\\cos x\\) only when the domain is restricted to \\([0, \\pi]\\).)"],
    [("Correct answer with a valid reason", 2), ("States that \\(f\\) is not one-to-one, or gives a counterexample, without a clear conclusion", 1)])

# Q13(d) sums of roots from two given facts
b, c, d = symbols('b c d'); r1, r2, r3 = symbols('r1 r2 r3')
Pp = (x - r1) * (x - r2) * (x - r3); dP = diff(Pp, x)
s1, s2 = r1 + r2 + r3, r1 * r2 + r2 * r3 + r3 * r1
assert sp.expand(sum(dP.subs(x, r) for r in (r1, r2, r3)) - (3 * (s1**2 - 2 * s2) - 2 * s1 * s1 + 3 * s2)) == 0
cc = sp.solve([sp.Eq(b**2 - 2 * c, 30), sp.Eq(3 * 30 - 2 * b**2 + 3 * c, 42)], [b, c]); assert all(sol[1] == -12 for sol in cc)
P.W('q13d', 3, "The monic polynomial \\(P(x)\\) has degree 3 and roots \\(\\alpha\\), \\(\\beta\\) and \\(\\gamma\\). It is given that \\(\\alpha^2 + \\beta^2 + \\gamma^2 = 30\\) and \\(P'(\\alpha) + P'(\\beta) + P'(\\gamma) = 42\\). Find \\(\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha\\).",
    ["Let \\(P(x) = x^3 + bx^2 + cx + d\\), so \\(\\alpha + \\beta + \\gamma = -b\\), \\(\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha = c\\) and \\(P'(x) = 3x^2 + 2bx + c\\).",
     "\\(P'(\\alpha) + P'(\\beta) + P'(\\gamma) = 3(\\alpha^2 + \\beta^2 + \\gamma^2) + 2b(\\alpha + \\beta + \\gamma) + 3c = 90 - 2b^2 + 3c = 42\\), so \\(2b^2 - 3c = 48\\).",
     "\\(\\alpha^2 + \\beta^2 + \\gamma^2 = (\\alpha + \\beta + \\gamma)^2 - 2c = b^2 - 2c = 30\\), so \\(b^2 = 30 + 2c\\).", "Substituting: \\(60 + 4c - 3c = 48\\), so \\(c = -12\\). So \\(\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha = -12\\)."],
    [("Correct value", 3), ("Two correct equations in \\(b\\) and \\(c\\)", 2), ("Writes \\(P'(x)\\) and uses the sum of \\(P'\\) at the roots, or uses \\(\\sum\\alpha^2 = (\\sum\\alpha)^2 - 2\\sum\\alpha\\beta\\)", 1)])

# Q13(e) normal approximation, and when it is not valid
mu, sd = 36 * 0.1, math.sqrt(36 * 0.1 * 0.9); assert abs(mu - 3.6) < 1e-12 and abs(sd - 1.8) < 1e-12 and abs((9 - mu) / sd - 3) < 1e-12
P.W('q13e', 3, "A company claims that only 10% of its phone batteries fail a safety test. An inspector tests a random sample of 36 batteries and 9 of them fail.<br>"
    "(i) Assuming the company's claim is correct, use the normal approximation to the binomial distribution to find the probability that at least 9 of the 36 batteries fail. You may use \\(P(Z \\le 3) = 0.9987\\) for a standard normal variable \\(Z\\). <b>2</b><br>(ii) Explain why the normal approximation might not be valid here. <b>1</b>",
    ["(i) \\(\\mu = np = 36 \\times 0.1 = 3.6\\) and \\(\\sigma = \\sqrt{np(1 - p)} = \\sqrt{3.24} = 1.8\\).", "\\(z = \\frac{9 - 3.6}{1.8} = 3\\), so \\(P(X \\ge 9) \\approx P(Z \\ge 3) = 1 - 0.9987 = 0.0013\\).",
     "(ii) The normal approximation works well when \\(np\\) and \\(n(1 - p)\\) are both at least about 5 (or 10). Here \\(np = 3.6\\), which is too small: the binomial distribution is strongly skewed, so the approximation may be poor."],
    [("All parts correct", 3), ("Part (i) correct, or part (ii) correct with a correct mean and standard deviation", 2), ("Correct mean and standard deviation, or a correct reason in (ii)", 1)])

# Q14(a) separable DE with partial fractions
yA = 54 * exp(x) / (x + 3)**3; assert simplify((x + 3) * diff(yA, x) - x * yA) == 0 and yA.subs(x, 0) == 2
P.W('q14a', 4, "Find the particular solution of the differential equation \\((x + 3)\\dfrac{dy}{dx} = xy\\) that passes through the point \\((0, 2)\\).",
    ["\\(\\displaystyle\\int \\frac{dy}{y} = \\int \\frac{x}{x + 3}\\,dx = \\int \\left(1 - \\frac{3}{x + 3}\\right)dx\\)", "\\(\\ln|y| = x - 3\\ln|x + 3| + C\\), so \\(y = \\dfrac{Ae^x}{(x + 3)^3}\\).", "At \\((0, 2)\\): \\(2 = \\dfrac{A}{27}\\), so \\(A = 54\\).", "\\(y = \\dfrac{54e^x}{(x + 3)^3}\\) (for \\(x > -3\\))"],
    [("Correct particular solution", 4), ("Correct general solution", 3), ("Correct integration of both sides", 2), ("Separates the variables, or writes \\(\\frac{x}{x + 3} = 1 - \\frac{3}{x + 3}\\)", 1)])

# Q14(b) the projection gives the closest point
lam, lam0 = symbols('lambda lambda0', real=True); u1, u2, v1, v2 = symbols('u1 u2 v1 v2', real=True)
U, Vv = sp.Matrix([u1, u2]), sp.Matrix([v1, v2]); L0 = U.dot(Vv) / Vv.dot(Vv)
lhs = (U - lam * Vv).dot(U - lam * Vv); rhs = (U - L0 * Vv).dot(U - L0 * Vv) + (lam - L0)**2 * Vv.dot(Vv); assert simplify(lhs - rhs) == 0
uv = lambda s: '\\vec{' + s + '}'
P.W('q14b', 3, "The vectors \\(" + uv('u') + "\\) and \\(" + uv('v') + "\\) are not parallel, and \\(" + uv('p') + " = \\lambda_0" + uv('v') + "\\) is the projection of \\(" + uv('u') + "\\) onto \\(" + uv('v') + "\\). (Do NOT prove that \\(" + uv('p') + "\\) can be written this way.)<br>"
    "By showing that \\(|" + uv('u') + " - \\lambda" + uv('v') + "|^2 = |" + uv('u') + " - \\lambda_0" + uv('v') + "|^2 + (\\lambda - \\lambda_0)^2|" + uv('v') + "|^2\\) for every real number \\(\\lambda\\), prove that \\(|" + uv('u') + " - \\lambda" + uv('v') + "|\\) is smallest when \\(\\lambda = \\lambda_0\\).",
    ["Write \\(" + uv('u') + " - \\lambda" + uv('v') + " = (" + uv('u') + " - \\lambda_0" + uv('v') + ") - (\\lambda - \\lambda_0)" + uv('v') + "\\).",
     "\\(|" + uv('u') + " - \\lambda" + uv('v') + "|^2 = |" + uv('u') + " - \\lambda_0" + uv('v') + "|^2 - 2(\\lambda - \\lambda_0)(" + uv('u') + " - \\lambda_0" + uv('v') + ") \\cdot " + uv('v') + " + (\\lambda - \\lambda_0)^2|" + uv('v') + "|^2\\)",
     "Since \\(\\lambda_0" + uv('v') + "\\) is the projection, \\(" + uv('u') + " - \\lambda_0" + uv('v') + "\\) is perpendicular to \\(" + uv('v') + "\\), so the middle term is 0. This gives the identity.",
     "\\((\\lambda - \\lambda_0)^2|" + uv('v') + "|^2 \\ge 0\\), so \\(|" + uv('u') + " - \\lambda" + uv('v') + "|^2 \\ge |" + uv('u') + " - \\lambda_0" + uv('v') + "|^2\\), with equality only when \\(\\lambda = \\lambda_0\\). So the distance is smallest at \\(\\lambda = \\lambda_0\\)."],
    [("Complete proof", 3), ("Expands correctly and uses perpendicularity to remove the middle term", 2), ("Writes \\(\\vec{u} - \\lambda\\vec{v}\\) in terms of \\(\\vec{u} - \\lambda_0\\vec{v}\\), or states that \\(\\vec{u} - \\lambda_0\\vec{v}\\) is perpendicular to \\(\\vec{v}\\)", 1)])

# Q14(c) moving target: the largest gap that can be crossed
fth = lambda th_: (2 / 3) * math.sin(th_) * (3 * math.cos(th_) - 1)
best = max(fth(i * (math.pi / 2) / 200000) for i in range(200001)); cst = (1 + math.sqrt(73)) / 12; assert abs(best - fth(math.acos(cst))) < 1e-9 and round(best, 2) == 0.56
pl = Plot(-1.2, 7.2, -1.6, 3.4, w=420)
pl.region([(-1.2, 0), (0, 0), (0, -1.6), (-1.2, -1.6)], colour='#e6e8ec'); pl.region([(2, 0), (7.2, 0), (7.2, -1.6), (2, -1.6)], colour='#e6e8ec')
pl.line(-1.2, 0, 0, 0); pl.line(0, 0, 0, -1.6); pl.line(2, 0, 2, -1.6); pl.line(2, 0, 7.2, 0); pl.line(0, -1.6, 2, -1.6, width=0.8, colour='#8a909c')
pl.curve(lambda X: X * math.tan(0.85) * (1 - X / 4.5), 0, 4.5, dash='5 4', width=1.4)
pl.line(0, 0, 0.75, 0.85, width=1.8, arrow=True); pl.text(0.75, 0.85, '3u', dx=-4, dy=-8, anchor='end', var=True)
pl.dot(2, 0); pl.line(2, 0.18, 3.0, 0.18, width=1.6, arrow=True); pl.text(2.5, 0.18, 'u', dy=-8, var=True)
pl.line(0, -0.8, 2, -0.8, width=1.1, arrow=True); pl.line(2, -0.8, 0, -0.8, width=1.1, arrow=True); pl.text(1, -0.8, 'd', dy=-6, var=True); pl.text(1, -1.25, 'Pit', size=12)
pl.raw(f'<path d="M{pl.X(0.45)},{pl.Y(0)}A{round(pl.X(0.45) - pl.X(0), 1)},{round(pl.X(0.45) - pl.X(0), 1)} 0 0 0 {round(pl.X(0.45 * math.cos(0.85)), 1)},{round(pl.Y(0.45 * math.sin(0.85)), 1)}" fill="none" stroke="{INK}"/>'); pl.text(0.62, 0.18, 'θ', var=True, size=14)
P.W('q14c', 4, "In a video game, a player at the edge of a pit fires a projectile at a target on the other side. The moment the player fires, the target starts moving directly away at a constant speed equal to one third of the projectile's initial speed. "
    "The target starts a distance \\(d\\) from the player, the projectile is fired with speed \\(3u\\) at an angle \\(\\theta\\) to the horizontal, and the acceleration due to gravity is \\(g\\). The player can only choose \\(\\theta\\)." + pl.svg() +
    "With the player at the origin, the positions of the projectile and the target \\(t\\) seconds after firing are \\(\\vec{r}_P = \\begin{pmatrix} 3ut\\cos\\theta \\\\ 3ut\\sin\\theta - \\frac{g}{2}t^2 \\end{pmatrix}\\) and \\(\\vec{r}_T = \\begin{pmatrix} d + ut \\\\ 0 \\end{pmatrix}\\). (Do NOT prove these.)<br>"
    "Show that, for the player to have a chance of hitting the target, \\(d\\) must be less than 56% of the maximum possible range of the projectile (to 2 significant figures).",
    ["The projectile lands when \\(3ut\\sin\\theta - \\frac{g}{2}t^2 = 0\\), at \\(t = \\frac{6u\\sin\\theta}{g}\\).", "It hits the target if the horizontal positions agree then: \\(3ut\\cos\\theta = d + ut\\), so \\(d = ut(3\\cos\\theta - 1) = \\frac{6u^2\\sin\\theta(3\\cos\\theta - 1)}{g}\\).",
     "The maximum range of the projectile (at \\(45^\\circ\\)) is \\(\\frac{(3u)^2}{g} = \\frac{9u^2}{g}\\), so \\(\\frac{d}{\\text{max range}} = \\frac{2}{3}\\sin\\theta(3\\cos\\theta - 1) = \\sin 2\\theta - \\frac{2}{3}\\sin\\theta\\).",
     "Differentiating: \\(2\\cos 2\\theta - \\frac{2}{3}\\cos\\theta = 0\\), so \\(6\\cos^2\\theta - \\cos\\theta - 3 = 0\\) and \\(\\cos\\theta = \\frac{1 + \\sqrt{73}}{12} \\approx 0.795\\) (\\(\\theta \\approx 37.3^\\circ\\)).",
     "At this angle \\(\\frac{d}{\\text{max range}} \\approx \\frac{2}{3} \\times 0.606 \\times (3 \\times 0.795 - 1) \\approx 0.56\\). This is the largest value, so \\(d\\) must be less than about 56% of the maximum range."],
    [("Complete correct working", 4), ("Correct ratio as a function of \\(\\theta\\) and a correct method to maximise it", 3), ("Correct expression for \\(d\\) in terms of \\(\\theta\\)", 2), ("Correct time of flight, or equates the horizontal positions", 1)])

# Q14(d) overbooking with a normal approximation
def over(n_): return 0.92 * n_ + 1.96 * math.sqrt(n_ * 0.92 * 0.08)
nmax = max(n_ for n_ in range(400, 700) if over(n_) <= 500); assert nmax == 530 and over(531) > 500
P.W('q14d', 4, "A concert venue has 500 seats. On average 8% of ticket holders do not turn up, independently of each other. The venue sells more tickets than seats, but wants no more than 2.5% of concerts to have more ticket holders arrive than there are seats. "
    "Using a suitable approximation, and given that \\(P(Z \\le 1.96) = 0.975\\) for a standard normal variable \\(Z\\), find the largest number of tickets that can be sold.",
    ["Let \\(n\\) tickets be sold and \\(X\\) be the number who turn up: \\(X \\sim \\text{Bin}(n, 0.92)\\), approximately normal with \\(\\mu = 0.92n\\) and \\(\\sigma = \\sqrt{0.0736n}\\).",
     "We need \\(P(X > 500) \\le 0.025\\), so 500 must be at least 1.96 standard deviations above the mean: \\(0.92n + 1.96\\sqrt{0.0736n} \\le 500\\).",
     "Let \\(m = \\sqrt{n}\\): \\(0.92m^2 + 0.5317m - 500 \\le 0\\), so \\(m \\le \\dfrac{-0.5317 + \\sqrt{0.5317^2 + 4 \\times 0.92 \\times 500}}{2 \\times 0.92} \\approx 23.025\\) and \\(n \\le 530.2\\).",
     "Check: \\(n = 530\\) gives \\(487.6 + 1.96 \\times 6.25 \\approx 499.8 \\le 500\\), but \\(n = 531\\) gives about \\(500.8\\). The largest number is 530 tickets."],
    [("Correct number of tickets", 4), ("Correct inequality solved with a minor error", 3), ("Correct inequality in \\(n\\)", 2), ("Correct mean and standard deviation of the number who turn up", 1)])

P.save()
