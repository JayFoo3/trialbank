"""Trialbank versions of the 2017 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math, itertools
import numpy as np
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, exp, log, symbols, integrate, diff, simplify, atan, acos, binomial
from rw import Paper
from fig import Plot, INK
x, t, y = symbols('x t y', real=True)
P = Paper('hsc-ext1-2017', seed=2017)
M = lambda s: '\\(' + s + '\\)'
VEC = lambda s: '\\underset{\\sim}{' + s + '}'
GREY = '#8a909c'; PI = math.pi
def circle(pl, cx, cy, r): pl.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="1.5"/>' % (pl.X(cx), pl.Y(cy), round(pl.X(r) - pl.X(0), 1), INK))

# Q1 factor theorem
p1 = x**3 - 4 * x**2 + 9 * x - 10; assert p1.subs(x, 2) == 0 and p1.subs(x, -2) != 0 and sp.rem(p1, x**2 - 4 * x + 9) != 0 and sp.rem(p1, 9 * x - 10) != 0
P.M('q01', "Which polynomial is a factor of \\(x^3 - 4x^2 + 9x - 10\\)?", M('x - 2'), [M('x + 2'), M('9x - 10'), M('x^2 - 4x + 9')],
    "By the factor theorem, \\(x - 2\\) is a factor if \\(P(2) = 0\\): \\(8 - 16 + 18 - 10 = 0\\). (\\(P(-2) = -52\\), so \\(x + 2\\) is not.)")

# Q2 log laws
L27 = 2.454; assert abs(math.log(27) / math.log(a := math.exp(math.log(27) / L27)) - L27) < 1e-9 and round(2 / 3 * L27, 2) == 1.64
P.M('q02', "It is given that \\(\\log_a 27 = 2.454\\), correct to 3 decimal places. What is the value of \\(\\log_a 9\\), correct to 2 decimal places?",
    M('1.64'), [M('0.82'), M('1.23'), M('3.68')],
    "\\(27 = 3^3\\) and \\(9 = 3^2\\), so \\(\\log_a 3 = \\frac{2.454}{3} = 0.818\\) and \\(\\log_a 9 = 2\\log_a 3 = \\frac{2}{3} \\times 2.454 \\approx 1.64\\).")

# Q3 tangents and a cyclic quadrilateral
deg = math.radians
Aa, Bb, Dd, Cc = deg(150), deg(260), deg(30), deg(330)
pt = lambda a_: np.array([math.cos(a_), math.sin(a_)])
A3, B3, C3, D3 = pt(Aa), pt(Bb), pt(Cc), pt(Dd)
ang = lambda P_, Q_, R_: math.degrees(math.acos(np.dot(P_ - Q_, R_ - Q_) / np.linalg.norm(P_ - Q_) / np.linalg.norm(R_ - Q_)))
assert abs(ang(B3, D3, A3) - 55) < 1e-9 and abs(ang(B3, C3, D3) - 115) < 1e-9
# T: tangents at A and B meet
tA, tB = np.array([-A3[1], A3[0]]), np.array([-B3[1], B3[0]]); s_ = np.linalg.solve(np.array([tA, -tB]).T, B3 - A3); T3 = A3 + s_[0] * tA
assert abs(np.dot(T3 - A3, A3)) < 1e-9 and abs(np.dot(T3 - B3, B3)) < 1e-9 and abs(ang(T3, A3, D3) - 120) < 1e-9
pl = Plot(-2.6, 1.4, -1.6, 1.4, w=360); circle(pl, 0, 0, 1)
for P_, Q_ in [(A3, D3), (D3, C3), (C3, B3), (B3, A3), (B3, D3), (T3, A3), (T3, B3)]: pl.line(P_[0], P_[1], Q_[0], Q_[1], width=1.3)
ext = lambda P_, d_: (P_ + 0.45 * d_ / np.linalg.norm(d_)); eA = ext(A3, A3 - T3); eB = ext(B3, B3 - T3)
pl.line(A3[0], A3[1], eA[0], eA[1], width=1.3); pl.line(B3[0], B3[1], eB[0], eB[1], width=1.3)
for P_, lab, dx_, dy_ in [(A3, 'A', -6, -8), (B3, 'B', -4, 18), (C3, 'C', 10, 8), (D3, 'D', 10, -2), (T3, 'T', -10, 4)]: pl.dot(P_[0], P_[1], 3); pl.text(P_[0], P_[1], lab, dx=dx_, dy=dy_, var=True)
pl.text(D3[0], D3[1], '55°', dx=-30, dy=22, size=12); pl.text(C3[0], C3[1], '115°', dx=-8, dy=-12, anchor='end', size=12)
P.M('q03', "The points \\(A\\), \\(B\\), \\(C\\) and \\(D\\) lie on a circle, and the tangents at \\(A\\) and \\(B\\) meet at \\(T\\), as shown. The angles \\(BDA\\) and \\(BCD\\) are \\(55^\\circ\\) and \\(115^\\circ\\) respectively." + pl.svg() + "What is the size of \\(\\angle TAD\\)?",
    M('120^\\circ'), [M('110^\\circ'), M('125^\\circ'), M('170^\\circ')],
    "\\(\\angle TAB = \\angle ADB = 55^\\circ\\) (angle between a tangent and a chord equals the angle in the alternate segment). \\(\\angle BAD = 180^\\circ - 115^\\circ = 65^\\circ\\) (opposite angles of the cyclic quadrilateral \\(ABCD\\)). So \\(\\angle TAD = 55^\\circ + 65^\\circ = 120^\\circ\\).")

# Q4 auxiliary angle
al4 = math.atan(2 / 3); assert all(abs(3 * math.sin(v) - 2 * math.cos(v) - math.sqrt(13) * math.sin(v - al4)) < 1e-12 for v in [0.2, 1.4, 3.3])
P.M('q04', "What is the value of \\(\\tan\\alpha\\) when \\(3\\sin x - 2\\cos x\\) is written in the form \\(\\sqrt{13}\\sin(x - \\alpha)\\)?",
    M('\\dfrac{2}{3}'), [M('-\\dfrac{3}{2}'), M('-\\dfrac{2}{3}'), M('\\dfrac{3}{2}')],
    "\\(\\sqrt{13}\\sin(x - \\alpha) = \\sqrt{13}\\cos\\alpha\\sin x - \\sqrt{13}\\sin\\alpha\\cos x\\). Matching: \\(\\sqrt{13}\\cos\\alpha = 3\\) and \\(\\sqrt{13}\\sin\\alpha = 2\\), so \\(\\tan\\alpha = \\frac{2}{3}\\). (The minus sign is already in the form \\(x - \\alpha\\).)")

# Q5 which graph is 3x^2/(4 - x^2)
f5 = lambda X: 3 * X * X / (4 - X * X)
assert f5(0) == 0 and f5(1) > 0 and f5(3) < -3 and abs(f5(1000) + 3) < 1e-4
def g5(inner, outer, hline=None):
    pl = Plot(-5, 5, -7, 7, w=210)
    for v in (-2, 2): pl.line(v, -7, v, 7, dash='4 4', colour=GREY, width=1)
    if hline is not None: pl.line(-5, hline, 5, hline, dash='4 4', colour=GREY, width=1)
    pl.axes(xt=[-2, 2], yt=[hline] if hline else [])
    pl.curve(inner, -1.97, 1.97, width=2); pl.curve(outer, -5, -2.03, width=2); pl.curve(outer, 2.03, 5, width=2)
    return pl.svg()
P.M('q05', "Which graph best represents the function \\(y = \\dfrac{3x^2}{4 - x^2}\\)?",
    g5(f5, f5, -3), [g5(f5, lambda X: -6 / (X * X - 4) / (1 + 0.1 * X * X)), g5(lambda X: -f5(X), lambda X: 6 / (X * X - 4) / (1 + 0.1 * X * X)), g5(lambda X: -f5(X), lambda X: -f5(X), 3)],
    "\\(y = 0\\) at the origin and \\(y > 0\\) for \\(-2 < x < 2\\), with vertical asymptotes at \\(x = \\pm 2\\). For large \\(|x|\\), \\(y \\to \\frac{3x^2}{-x^2} = -3\\), and outside \\(\\pm 2\\) the denominator is negative, so the graph sits below \\(y = -3\\).")

# Q6 normal to a parabola at a scaled parameter point
p = symbols('p', nonzero=True); X0, Y0 = 4 / p, 4 / p**2; assert simplify(X0**2 - 4 * Y0) == 0
m = 1 / (diff(x**2 / 4, x).subs(x, X0)); nrm = sp.expand((y - Y0 + m * (x - X0)) * 2 * p**2)
assert simplify(nrm - (p**3 * x + 2 * p**2 * y - 4 * p**2 - 8)) == 0
P.M('q06', "The point \\(P\\left(\\dfrac{4}{p}, \\dfrac{4}{p^2}\\right)\\), where \\(p \\ne 0\\), lies on the parabola \\(x^2 = 4y\\). What is the equation of the normal at \\(P\\)?",
    M('p^3x + 2p^2y = 4p^2 + 8'), [M('2p^2y - p^3x = 8 - 4p^2'), M('p^2y - 2px = -4'), M('2py + x = 4')],
    "\\(\\frac{dy}{dx} = \\frac{x}{2} = \\frac{2}{p}\\) at \\(P\\), so the normal has gradient \\(-\\frac{p}{2}\\): \\(y - \\frac{4}{p^2} = -\\frac{p}{2}\\left(x - \\frac{4}{p}\\right)\\). Multiplying by \\(2p^2\\): \\(2p^2y - 8 = -p^3x + 4p^2\\), so \\(p^3x + 2p^2y = 4p^2 + 8\\). (\\(p^2y - 2px = -4\\) is the tangent.)")

# Q7 domain of inverse sine of 4/x
dom = lambda X: X != 0 and abs(4 / X) <= 1
assert dom(4) and dom(-4) and dom(9) and not dom(3.9) and not dom(1)
def nl(a_, b_, outside, labs):
    pl = Plot(-7.5, 7.5, -1, 1, w=260, h=72); pl.line(-7.5, 0, 7.5, 0, width=1, colour=GREY)
    if outside: pl.line(-a_, 0, -7.1, 0, width=3.2, arrow=True); pl.line(a_, 0, 7.1, 0, width=3.2, arrow=True)
    else: pl.line(-a_, 0, a_, 0, width=3.2); pl.raw('<circle cx="%s" cy="%s" r="4.5" fill="#fff" stroke="%s" stroke-width="1.6"/>' % (pl.X(0), pl.Y(0), INK)); pl.text(0, 0, '0', dy=22, size=13)
    for v, lb in zip((-a_, a_), labs): pl.dot(v, 0, 5); pl.text(v, 0, lb, dy=22, size=13)
    return pl.svg()
P.M('q07', "Which diagram represents the domain of the function \\(f(x) = \\sin^{-1}\\left(\\dfrac{4}{x}\\right)\\)?",
    nl(4, 4, True, ['−4', '4']), [nl(4, 4, False, ['−4', '4']), nl(8 / PI * 1.6, 0, True, ['−8/π', '8/π']), nl(8 / PI * 1.6, 0, False, ['−8/π', '8/π'])],
    "\\(\\sin^{-1}\\) needs its input between \\(-1\\) and 1: \\(-1 \\le \\frac{4}{x} \\le 1\\), which means \\(|x| \\ge 4\\). So \\(x \\le -4\\) or \\(x \\ge 4\\). (\\(\\frac{8}{\\pi}\\) comes from wrongly using the range \\(\\pm\\frac{\\pi}{2}\\).)")

# Q8 related rates for a circle
assert 2 * 12 * 4 == 96
P.M('q08', "A drop of ink spreads on paper as a circle. Its radius increases from 0 cm at a constant rate of 4 cm s⁻¹. At what rate is the area of the circle increasing when the radius is 12 cm?",
    M('96\\pi') + ' cm² s⁻¹', [M('16\\pi') + ' cm² s⁻¹', M('24\\pi') + ' cm² s⁻¹', M('144\\pi') + ' cm² s⁻¹'],
    "\\(A = \\pi r^2\\), so \\(\\frac{dA}{dt} = 2\\pi r\\frac{dr}{dt} = 2\\pi \\times 12 \\times 4 = 96\\pi\\) cm² s⁻¹.")

# Q9 which expansion has a constant term
def const(a_, b_, n_=8): return sp.expand((x**a_ + x**(-b_))**n_).coeff(x, 0)
assert const(1, 3) != 0 and const(1, 2) == 0 and const(2, 3) == 0 and const(3, 4) == 0
ex9 = lambda a_, b_: M('\\left(x' + ('' if a_ == 1 else '^' + str(a_)) + ' + \\dfrac{1}{x^' + str(b_) + '}\\right)^8')
P.M('q09', "When expanded, which expression has a non-zero constant term?", ex9(1, 3), [ex9(1, 2), ex9(2, 3), ex9(3, 4)],
    "In \\(\\left(x^a + x^{-b}\\right)^8\\) a general term has power \\(a(8 - k) - bk\\), which is 0 when \\(k = \\frac{8a}{a + b}\\). This must be a whole number: for \\(a = 1\\), \\(b = 3\\), \\(k = 2\\). The others give \\(\\frac{8}{3}\\), \\(\\frac{16}{5}\\) and \\(\\frac{24}{7}\\).")

# Q10 four in a line on a 4x4 grid
cells = [(r, c) for r in range(4) for c in range(4)]
lines = [set((r, c) for c in range(4)) for r in range(4)] + [set((r, c) for r in range(4)) for c in range(4)] + [set((i, i) for i in range(4)), set((i, 3 - i) for i in range(4))]
good = sum(1 for s4 in itertools.combinations(cells, 4) if set(s4) in lines); assert good == 10 and Q(good, math.comb(16, 4)) == Q(1, 182)
gr = '<svg class="tb-fig" viewBox="0 0 140 140" width="140" style="display:block;max-width:100%;height:auto;margin:14px auto;background:#fff">' + ''.join('<rect x="%d" y="%d" width="30" height="30" fill="none" stroke="%s" stroke-width="1.4"/>' % (10 + 30 * c, 10 + 30 * r, INK) for r in range(4) for c in range(4)) + '</svg>'
P.M('q10', "Four squares are chosen at random from the \\(4 \\times 4\\) grid below, and a counter is placed in each chosen square." + gr + "What is the probability that all four counters lie in the same row, column or diagonal?",
    M('\\dfrac{1}{182}'), [M('\\dfrac{2}{455}'), M('\\dfrac{1}{91}'), M('\\dfrac{1}{4}')],
    "There are \\(\\binom{16}{4} = 1820\\) ways to choose 4 squares. A full line needs all 4 squares of a row (4 ways), a column (4 ways) or a diagonal (2 ways): 10 ways. \\(\\frac{10}{1820} = \\frac{1}{182}\\). (Forgetting the diagonals gives \\(\\frac{8}{1820} = \\frac{2}{455}\\).)")

# Q11(a)
assert (2 * -3 + 3 * 7) / 5 == 3
P.W('q11a', 1, "The point \\(P\\) divides the interval from \\(A(-3, 5)\\) to \\(B(7, -5)\\) internally in the ratio \\(3:2\\). Find the \\(x\\)-coordinate of \\(P\\).",
    ["\\(x = \\dfrac{2 \\times (-3) + 3 \\times 7}{3 + 2} = \\dfrac{15}{5} = 3\\)"], [("Correct answer", 1)])

# Q11(b)
assert simplify(diff(atan(x**4), x) - 4 * x**3 / (1 + x**8)) == 0
P.W('q11b', 2, "Differentiate \\(\\tan^{-1}\\left(x^4\\right)\\).",
    ["By the chain rule: \\(\\dfrac{d}{dx}\\tan^{-1}\\left(x^4\\right) = \\dfrac{1}{1 + \\left(x^4\\right)^2} \\times 4x^3 = \\dfrac{4x^3}{1 + x^8}\\)"],
    [("Correct derivative", 2), ("Correct derivative of \\(\\tan^{-1}u\\) with an error in the chain rule", 1)])

# Q11(c)
assert sp.solve_univariate_inequality(3 * x / (x - 2) > 2, x, relational=False) == sp.Union(sp.Interval.open(-sp.oo, -4), sp.Interval.open(2, sp.oo))
P.W('q11c', 3, "Solve \\(\\dfrac{3x}{x - 2} > 2\\).",
    ["Multiply both sides by \\((x - 2)^2 > 0\\): \\(3x(x - 2) > 2(x - 2)^2\\), \\(x \\ne 2\\).", "\\((x - 2)(3x - 2x + 4) > 0\\), that is \\((x - 2)(x + 4) > 0\\).", "\\(x < -4\\) or \\(x > 2\\)"],
    [("Correct solution", 3), ("Correct critical values with one error", 2), ("Multiplies by \\((x - 2)^2\\), or a correct critical value", 1)])

# Q11(d) sketch 3 arccos x
pl = Plot(-1.8, 1.8, -0.8, 10.4, w=240, h=320); pl.axes(xt=[-1, 1], yt=[3 * PI / 2, 3 * PI], ytl=['3π⁄2', '3π']); pl.curve(lambda X: 3 * math.acos(max(-1, min(1, X))), -1, 1); pl.dot(-1, 3 * PI, 3); pl.dot(1, 0, 3)
P.W('q11d', 2, "Sketch the graph of the function \\(y = 3\\cos^{-1}x\\).",
    ["Domain \\(-1 \\le x \\le 1\\), range \\(0 \\le y \\le 3\\pi\\). The graph decreases from \\((-1, 3\\pi)\\) through \\(\\left(0, \\frac{3\\pi}{2}\\right)\\) to \\((1, 0)\\)." + pl.svg()],
    [("Correct shape with the endpoints marked", 2), ("Correct shape, or correct domain and range", 1)])

# Q11(e)
I11 = integrate(x / sqrt(x + 1), (x, 0, 8)); assert I11 == Q(40, 3)
P.W('q11e', 3, "Evaluate \\(\\displaystyle\\int_0^8 \\frac{x}{\\sqrt{x + 1}}\\,dx\\), using the substitution \\(x = u^2 - 1\\).",
    ["\\(dx = 2u\\,du\\), \\(\\sqrt{x + 1} = u\\) (\\(u > 0\\)). \\(x = 0 \\Rightarrow u = 1\\); \\(x = 8 \\Rightarrow u = 3\\).", "\\(\\displaystyle\\int_1^3 \\frac{u^2 - 1}{u} \\times 2u\\,du = 2\\int_1^3 (u^2 - 1)\\,du = 2\\left[\\frac{u^3}{3} - u\\right]_1^3\\)", "\\(= 2\\left[(9 - 3) - \\left(\\frac{1}{3} - 1\\right)\\right] = 2 \\times \\frac{20}{3} = \\frac{40}{3}\\)"],
    [("Correct value", 3), ("Correct integral in \\(u\\) with correct limits", 2), ("Correct \\(dx\\) or correct limits", 1)])

# Q11(f)
assert simplify(diff(-cos(x)**4 / 4, x) - cos(x)**3 * sin(x)) == 0
P.W('q11f', 1, "Find \\(\\displaystyle\\int \\cos^3 x\\sin x\\,dx\\).",
    ["\\(\\displaystyle\\int \\cos^3 x\\sin x\\,dx = -\\frac{1}{4}\\cos^4 x + C\\)"], [("Correct primitive", 1)])

# Q11(g)
P.W('q11g', 3, "The probability that a seed of a particular plant germinates is \\(\\frac{1}{4}\\). Nine of these seeds are planted.<br>(i) Write an expression for the probability that exactly two of the nine seeds germinate. <b>1</b><br>(ii) Write an expression for the probability that none of the nine seeds germinates. <b>1</b><br>(iii) Write an expression for the probability that at least one of the nine seeds germinates. <b>1</b>",
    ["(i) \\(\\binom{9}{2}\\left(\\frac{1}{4}\\right)^2\\left(\\frac{3}{4}\\right)^7\\)", "(ii) \\(\\left(\\frac{3}{4}\\right)^9\\)", "(iii) \\(1 - \\left(\\frac{3}{4}\\right)^9\\)"],
    [("All three correct", 3), ("Two correct", 2), ("One correct", 1)])

# Q12(a) angle at the centre (reflex)
oa, oc = deg(215), deg(325); assert abs(math.degrees(oc - oa) - 110) < 1e-9
A12, C12, B12 = pt(oa), pt(oc), pt(deg(270))
assert abs(ang(A12, B12, C12) - 125) < 1e-9
pl = Plot(-1.4, 2.1, -1.35, 1.35, w=300); circle(pl, 0, 0, 1)
for P_, Q_ in [((0, 0), A12), ((0, 0), C12), (A12, B12), (B12, C12)]: pl.line(P_[0], P_[1], Q_[0], Q_[1], width=1.3)
pl.dot(0, 0, 3)
for P_, lab, dx_, dy_ in [((0, 0), 'O', 0, -8), (A12, 'A', -10, 6), (B12, 'B', 0, 18), (C12, 'C', 10, 6)]: pl.text(P_[0], P_[1], lab, dx=dx_, dy=dy_, var=True)
pl.text(0, 0, '110°', dy=26, size=12); pl.text(2.0, 1.1, 'NOT TO SCALE', anchor='end', size=11)
P.W('q12a', 2, "The points \\(A\\), \\(B\\) and \\(C\\) lie on a circle with centre \\(O\\), as shown. The size of \\(\\angle AOC\\) is \\(110^\\circ\\)." + pl.svg() + "Find the size of \\(\\angle ABC\\), giving reasons.",
    ["The reflex angle \\(AOC = 360^\\circ - 110^\\circ = 250^\\circ\\) (angles at a point).", "\\(\\angle ABC = \\frac{1}{2} \\times 250^\\circ = 125^\\circ\\) (the angle at the centre is twice the angle at the circumference standing on the same arc)."],
    [("Correct answer with reasons", 2), ("Correct answer without full reasons, or uses the reflex angle", 1)])

# Q12(b) absolute value graphs
for v in np.linspace(-2, 1, 31): assert abs(abs(v + 2) - (3 - abs(v - 1))) < 1e-12
for v in [-3, -2.1, 1.1, 2.5]: assert abs(abs(v + 2) + abs(v - 1) - 3) > 1e-6
pl = Plot(-4.5, 5, -2.5, 4.4, w=340); pl.axes(xt=[-2, 1, 4], yt=[2, 3])
pl.curve(lambda X: abs(X + 2), -4.5, 2.3); pl.curve(lambda X: 3 - abs(X - 1), -3.5, 5, dash='6 4')
pl.text(-4.2, abs(-4.2 + 2), 'y = |x + 2|', dx=4, dy=-8, anchor='start', var=True, size=12); pl.text(2.4, 1.9, 'y = 3 − |x − 1|', dx=6, anchor='start', var=True, size=12)
P.W('q12b', 4, "(i) Carefully sketch the graphs of \\(y = |x + 2|\\) and \\(y = 3 - |x - 1|\\) on the same axes, showing all intercepts. <b>3</b><br>(ii) Using the graphs from part (i), or otherwise, find the range of values of \\(x\\) for which \\(|x + 2| + |x - 1| = 3\\). <b>1</b>",
    ["(i) \\(y = |x + 2|\\): a V with vertex \\((-2, 0)\\) and \\(y\\)-intercept 2. \\(y = 3 - |x - 1|\\): an upside-down V with vertex \\((1, 3)\\), \\(x\\)-intercepts \\(-2\\) and 4, and \\(y\\)-intercept 2." + pl.svg(),
     "(ii) \\(|x + 2| + |x - 1| = 3\\) means \\(|x + 2| = 3 - |x - 1|\\), where the graphs meet. They coincide along the segment from \\((-2, 0)\\) to \\((1, 3)\\), so \\(-2 \\le x \\le 1\\)."],
    [("Both parts correct", 4), ("Part (i) correct", 3), ("Both graphs with most intercepts correct", 2), ("One graph correct", 1)])

# Q12(c) volumes in a ratio, Newton's method
h = symbols('h', real=True)
Vl = pi * integrate(4 - x**2, (x, -2, h)); Vt = pi * integrate(4 - x**2, (x, -2, 2)); assert Vt == 32 * pi / 3
assert sp.expand((Vl - Q(2, 3) * Vt) * (-9 / pi)) == sp.expand(3 * h**3 - 36 * h + 16)
assert 0 - (16) / (-36) == Q(4, 9) or abs(0 - 16 / -36 - 4 / 9) < 1e-12
pl = Plot(-2.6, 2.7, -0.5, 2.6, w=320)
hh = 0.45
pl.region([(-2, 0)] + [(-2 + i * (hh + 2) / 80, math.sqrt(max(0, 4 - (-2 + i * (hh + 2) / 80)**2))) for i in range(81)] + [(hh, 0)])
pl.region([(hh, 0)] + [(hh + i * (2 - hh) / 80, math.sqrt(max(0, 4 - (hh + i * (2 - hh) / 80)**2))) for i in range(81)], colour='#eef1fb')
pl.axes(xt=[-2, hh, 2], xtl=['−2', 'h', '2'], yt=[2]); pl.curve(lambda X: math.sqrt(max(0, 4 - X * X)), -2, 2); pl.line(hh, 0, hh, math.sqrt(4 - hh * hh), width=1.3)
P.W('q12c', 4, "The region enclosed by the semicircle \\(y = \\sqrt{4 - x^2}\\) and the \\(x\\)-axis is divided into two pieces by the line \\(x = h\\), where \\(0 \\le h < 2\\)." + pl.svg() +
    "The two pieces are rotated about the \\(x\\)-axis to form solids of revolution. The value of \\(h\\) is chosen so that the volumes of the solids are in the ratio \\(2:1\\).<br>(i) Show that \\(h\\) satisfies the equation \\(3h^3 - 36h + 16 = 0\\). <b>3</b><br>(ii) Given \\(h_1 = 0\\) as a first approximation for \\(h\\), use one application of Newton's method to find a second approximation for \\(h\\). <b>1</b>",
    ["(i) The whole solid is a sphere of radius 2, volume \\(\\frac{32\\pi}{3}\\). The left piece (from \\(-2\\) to \\(h\\)) is the larger, so it is \\(\\frac{2}{3}\\) of it: \\(\\frac{64\\pi}{9}\\).",
     "\\(\\displaystyle\\pi\\int_{-2}^{h} (4 - x^2)\\,dx = \\pi\\left[4x - \\frac{x^3}{3}\\right]_{-2}^{h} = \\pi\\left(4h - \\frac{h^3}{3} + \\frac{16}{3}\\right)\\)",
     "\\(4h - \\frac{h^3}{3} + \\frac{16}{3} = \\frac{64}{9}\\). Multiplying by 9: \\(36h - 3h^3 + 48 = 64\\), so \\(3h^3 - 36h + 16 = 0\\).",
     "(ii) \\(f(h) = 3h^3 - 36h + 16\\), \\(f'(h) = 9h^2 - 36\\). \\(h_2 = 0 - \\dfrac{f(0)}{f'(0)} = -\\dfrac{16}{-36} = \\dfrac{4}{9}\\)"],
    [("Both parts correct", 4), ("Part (i) correct", 3), ("Correct volume integral evaluated, or part (ii) with a correct volume integral", 2), ("Correct volume integral, or part (ii) correct", 1)])

# Q12(d) acceleration from t as a function of x
vx = sp.exp(3 * x) / 3; assert simplify(1 / diff(3 - sp.exp(-3 * x), x) - vx) == 0 and simplify(vx * diff(vx, x) - sp.exp(6 * x) / 3) == 0
P.W('q12d', 3, "At time \\(t\\) the displacement \\(x\\) of a particle satisfies \\(t = 3 - e^{-3x}\\). Find the acceleration of the particle as a function of \\(x\\).",
    ["\\(\\dfrac{dt}{dx} = 3e^{-3x}\\), so \\(v = \\dfrac{dx}{dt} = \\dfrac{1}{3}e^{3x}\\).", "\\(a = v\\dfrac{dv}{dx} = \\dfrac{1}{3}e^{3x} \\times e^{3x} = \\dfrac{1}{3}e^{6x}\\)"],
    [("Correct acceleration", 3), ("Correct \\(v\\) and a correct method for \\(a\\)", 2), ("Correct \\(\\frac{dt}{dx}\\) or \\(v\\)", 1)])

# Q12(e)
assert sp.limit((1 - cos(4 * x)) / x**2, x, 0) == 8
P.W('q12e', 2, "Evaluate \\(\\displaystyle\\lim_{x \\to 0} \\frac{1 - \\cos 4x}{x^2}\\).",
    ["\\(1 - \\cos 4x = 2\\sin^2 2x\\), so \\(\\dfrac{1 - \\cos 4x}{x^2} = 2 \\times 4 \\times \\left(\\dfrac{\\sin 2x}{2x}\\right)^2\\).", "As \\(x \\to 0\\), \\(\\frac{\\sin 2x}{2x} \\to 1\\), so the limit is 8."],
    [("Correct answer", 2), ("Uses \\(1 - \\cos 4x = 2\\sin^2 2x\\)", 1)])

# Q13(a) SHM period from two points
n2 = (36 - 4) / (9 - 1); assert n2 == 4 and abs(2 * PI / math.sqrt(n2) - PI) < 1e-12
P.W('q13a', 3, "A particle moves along the \\(x\\)-axis in simple harmonic motion centred at the origin. When \\(x = 1\\) its velocity is 6, and when \\(x = 3\\) its velocity is 2. Find the period of the motion.",
    ["For SHM about the origin, \\(v^2 = n^2(a^2 - x^2)\\).", "\\(36 = n^2(a^2 - 1)\\) and \\(4 = n^2(a^2 - 9)\\). Subtracting: \\(32 = 8n^2\\), so \\(n = 2\\).", "Period \\(= \\dfrac{2\\pi}{n} = \\pi\\)"],
    [("Correct period", 3), ("Correct value of \\(n\\)", 2), ("Two correct equations from \\(v^2 = n^2(a^2 - x^2)\\)", 1)])

# Q13(b) binomial identity, odd terms
for N in range(2, 21, 2):
    assert sum((2 * j + 1) * math.comb(N, 2 * j + 1) for j in range(N // 2)) == N * 2**(N - 2)
P.W('q13b', 5, "Let \\(n\\) be a positive EVEN integer.<br>"
    "(i) Show that \\((1 + x)^n - (1 - x)^n = 2\\left[\\dbinom{n}{1}x + \\dbinom{n}{3}x^3 + \\cdots + \\dbinom{n}{n-1}x^{n-1}\\right]\\). <b>2</b><br>"
    "(ii) Hence show that \\(n\\left[(1 + x)^{n-1} + (1 - x)^{n-1}\\right] = 2\\left[\\dbinom{n}{1} + 3\\dbinom{n}{3}x^2 + \\cdots + (n - 1)\\dbinom{n}{n-1}x^{n-2}\\right]\\). <b>1</b><br>"
    "(iii) Hence show that \\(\\dbinom{n}{1} + 3\\dbinom{n}{3} + 5\\dbinom{n}{5} + \\cdots + (n - 1)\\dbinom{n}{n-1} = n2^{n-2}\\). <b>2</b>",
    ["(i) \\((1 + x)^n = \\sum \\binom{n}{k}x^k\\) and \\((1 - x)^n = \\sum \\binom{n}{k}(-1)^kx^k\\). Subtracting, the even powers cancel and the odd powers double: \\(2\\left[\\binom{n}{1}x + \\binom{n}{3}x^3 + \\cdots + \\binom{n}{n-1}x^{n-1}\\right]\\) (the last odd power is \\(n - 1\\), since \\(n\\) is even).",
     "(ii) Differentiate both sides with respect to \\(x\\): the left side gives \\(n(1 + x)^{n-1} + n(1 - x)^{n-1}\\), and the right side gives \\(2\\left[\\binom{n}{1} + 3\\binom{n}{3}x^2 + \\cdots + (n - 1)\\binom{n}{n-1}x^{n-2}\\right]\\).",
     "(iii) Put \\(x = 1\\): \\(n\\left[2^{n-1} + 0\\right] = 2\\left[\\binom{n}{1} + 3\\binom{n}{3} + \\cdots + (n - 1)\\binom{n}{n-1}\\right]\\).", "Dividing by 2: \\(\\binom{n}{1} + 3\\binom{n}{3} + \\cdots + (n - 1)\\binom{n}{n-1} = n2^{n-2}\\)."],
    [("All parts correct", 5), ("Two parts correct and progress in the third", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct", 1)])

# Q13(c) golf ball over a lake
g = 9.8; V2 = 90 * math.sqrt(2) * g
ok = [th for th in np.linspace(0.001, PI / 2 - 0.001, 200001) if V2 * math.sin(2 * th) / g >= 90 - 1e-9]
assert abs(ok[0] - PI / 8) < 1e-4 and abs(ok[-1] - 3 * PI / 8) < 1e-4
H = V2 * math.sin(3 * PI / 8)**2 / (2 * g); assert abs(H - 45 * (math.sqrt(2) + 1) / 2) < 1e-9 and round(H, 1) == 54.3
pl = Plot(-0.6, 6.4, -1.0, 3.2, w=340); pl.axes(xt=[5], xtl=[''], yt=[])
pl.line(0, 0, 1.4, 1.1, width=1.6, arrow=True); pl.text(1.4, 1.1, 'V', dx=8, dy=-2, anchor='start', var=True)
pl.raw('<path d="M%s,%sA26,26 0 0 0 %s,%s" fill="none" stroke="%s"/>' % (pl.X(0) + 26, pl.Y(0), round(pl.X(0) + 26 * math.cos(0.666), 1), round(pl.Y(0) - 26 * math.sin(0.666), 1), INK)); pl.text(0.55, 0.2, 'θ', var=True, size=14)
pl.line(0, -0.45, 5, -0.45, width=1.1, arrow=True); pl.line(5, -0.45, 0, -0.45, width=1.1, arrow=True); pl.text(2.5, -0.45, '90 m', dy=16, size=13)
P.W('q13c', 7, "A golfer hits a ball with initial speed \\(V\\) m s⁻¹ at an angle \\(\\theta\\) to the horizontal. The ball is hit from one side of a lake and must have a horizontal range of 90 m or more to clear it." + pl.svg() +
    "Ignoring air resistance, the motion of the ball is given by \\(x = Vt\\cos\\theta\\) and \\(y = Vt\\sin\\theta - \\frac{1}{2}gt^2\\), where \\(t\\) is the time in seconds after the ball is hit and \\(g\\) is the acceleration due to gravity in m s⁻² (do NOT prove these).<br>"
    "(i) Show that the horizontal range of the ball is \\(\\dfrac{V^2\\sin 2\\theta}{g}\\) metres. <b>2</b><br>(ii) Show that if \\(V^2 < 90g\\) then the horizontal range of the ball is less than 90 m. <b>1</b><br>"
    "It is now given that \\(V^2 = 90\\sqrt{2}\\,g\\) and that the horizontal range of the ball is 90 m or more.<br>(iii) Show that \\(\\dfrac{\\pi}{8} \\le \\theta \\le \\dfrac{3\\pi}{8}\\). <b>2</b><br>(iv) Find the greatest height the ball can reach. <b>2</b>",
    ["(i) The ball lands when \\(y = 0\\): \\(t\\left(V\\sin\\theta - \\frac{1}{2}gt\\right) = 0\\), so \\(t = \\frac{2V\\sin\\theta}{g}\\). Then \\(x = V\\cos\\theta \\times \\frac{2V\\sin\\theta}{g} = \\frac{V^2\\sin 2\\theta}{g}\\).",
     "(ii) \\(\\sin 2\\theta \\le 1\\), so the range is at most \\(\\frac{V^2}{g} < \\frac{90g}{g} = 90\\) m.",
     "(iii) \\(\\frac{90\\sqrt{2}\\,g\\sin 2\\theta}{g} \\ge 90\\) gives \\(\\sin 2\\theta \\ge \\frac{1}{\\sqrt{2}}\\). With \\(0 < 2\\theta < \\pi\\): \\(\\frac{\\pi}{4} \\le 2\\theta \\le \\frac{3\\pi}{4}\\), so \\(\\frac{\\pi}{8} \\le \\theta \\le \\frac{3\\pi}{8}\\).",
     "(iv) Greatest height (when \\(\\dot{y} = 0\\), \\(t = \\frac{V\\sin\\theta}{g}\\)) is \\(\\frac{V^2\\sin^2\\theta}{2g}\\), largest for the largest allowed \\(\\theta = \\frac{3\\pi}{8}\\).",
     "\\(\\sin^2\\frac{3\\pi}{8} = \\frac{1 - \\cos\\frac{3\\pi}{4}}{2} = \\frac{2 + \\sqrt{2}}{4}\\), so the height is \\(\\frac{90\\sqrt{2}}{2} \\times \\frac{2 + \\sqrt{2}}{4} = \\frac{45(\\sqrt{2} + 1)}{2} \\approx 54.3\\) m."],
    [("All parts correct", 7), ("Three parts correct and progress in the fourth", 6), ("Three parts correct", 5), ("Two parts correct and progress in another", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct", 1)])

# Q14(a) induction divisibility
for N in range(1, 25): assert (5**(2 * N + 1) + 2**(2 * N + 1)) % 7 == 0
P.W('q14a', 3, "Prove by mathematical induction that \\(5^{2n+1} + 2^{2n+1}\\) is divisible by 7 for any integer \\(n \\ge 1\\).",
    ["<b>Step 1.</b> \\(n = 1\\): \\(5^3 + 2^3 = 125 + 8 = 133 = 7 \\times 19\\). True.", "<b>Step 2.</b> Assume true for \\(n = k\\): \\(5^{2k+1} + 2^{2k+1} = 7M\\) for some integer \\(M\\).",
     "<b>Step 3.</b> \\(5^{2k+3} + 2^{2k+3} = 25 \\times 5^{2k+1} + 4 \\times 2^{2k+1} = 25\\left(7M - 2^{2k+1}\\right) + 4 \\times 2^{2k+1} = 175M - 21 \\times 2^{2k+1} = 7\\left(25M - 3 \\times 2^{2k+1}\\right)\\), which is divisible by 7.",
     "So if true for \\(n = k\\) it is true for \\(n = k + 1\\); since true for \\(n = 1\\), by induction it is true for all \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves \\(n = 1\\) and uses the assumption in the inductive step", 2), ("Proves \\(n = 1\\)", 1)])

# Q14(b) tangent to one parabola cutting another
a, p_ = symbols('a p', positive=True)
quad = sp.expand(x**2 + 4 * a * (p_ * x - 2 * p_**2)); assert sp.expand(quad - (x**2 + 4 * a * p_ * x - 8 * a * p_**2)) == 0
Mx = -2 * a * p_; My = p_ * Mx - 2 * p_**2; assert simplify(My + 2 * p_**2 * (a + 1)) == 0
assert sp.solve(sp.Eq(Mx**2, -4 * My), a) == [1 + sqrt(3)]
av, pv = 1 + math.sqrt(3), 0.4
xs = np.roots([1, 4 * av * pv, -8 * av * pv * pv]); Qx, Rx = max(xs), min(xs)
pl = Plot(-6.8, 4, -6.3, 3.6, w=360); pl.axes(xt=[], yt=[])
pl.curve(lambda X: X * X / 8, -5.4, 5.4); pl.curve(lambda X: -X * X / (4 * av), -6.8, 4); pl.curve(lambda X: pv * X - 2 * pv * pv, -6.8, 4, width=1.3)
for xx_, lab, dx_, dy_ in [(4 * pv, 'P(4p, 2p²)', 8, 4), (Qx, 'Q', 4, 16), (Rx, 'R', 8, 10), ((Qx + Rx) / 2, 'M', 8, 10)]:
    yy_ = xx_ * xx_ / 8 if lab.startswith('P') else pv * xx_ - 2 * pv * pv
    pl.dot(xx_, yy_, 3); pl.text(xx_, yy_, lab, dx=dx_, dy=dy_, anchor='start', var=True, size=13)
pl.text(-5.2, 3.2, 'x² = 8y', anchor='start', var=True, size=13); pl.text(3.8, -16 / (4 * av) - 0.3, 'x² = −4ay', anchor='end', var=True, size=13)
P.W('q14b', 6, "Let \\(P(4p, 2p^2)\\) be a point on the parabola \\(x^2 = 8y\\). The tangent to this parabola at \\(P\\) meets the parabola \\(x^2 = -4ay\\), \\(a > 0\\), at \\(Q\\) and \\(R\\). Let \\(M\\) be the midpoint of \\(QR\\)." + pl.svg() +
    "(i) Show that the \\(x\\)-coordinates of \\(Q\\) and \\(R\\) satisfy \\(x^2 + 4apx - 8ap^2 = 0\\). <b>2</b><br>(ii) Show that the coordinates of \\(M\\) are \\(\\left(-2ap, -2p^2(a + 1)\\right)\\). <b>2</b><br>(iii) Find the value of \\(a\\) so that the point \\(M\\) always lies on the parabola \\(x^2 = -4y\\). <b>2</b>",
    ["(i) \\(y = \\frac{x^2}{8}\\), \\(\\frac{dy}{dx} = \\frac{x}{4} = p\\) at \\(P\\). Tangent: \\(y - 2p^2 = p(x - 4p)\\), that is \\(y = px - 2p^2\\).", "Substituting into \\(x^2 = -4ay\\): \\(x^2 = -4a(px - 2p^2)\\), so \\(x^2 + 4apx - 8ap^2 = 0\\).",
     "(ii) The sum of the roots is \\(-4ap\\), so the \\(x\\)-coordinate of \\(M\\) is \\(-2ap\\). \\(M\\) is on the tangent: \\(y = p(-2ap) - 2p^2 = -2p^2(a + 1)\\).",
     "(iii) \\(x^2 = -4y\\) at \\(M\\): \\(4a^2p^2 = 8p^2(a + 1)\\). For this to hold for all \\(p\\): \\(a^2 - 2a - 2 = 0\\), so \\(a = 1 \\pm \\sqrt{3}\\). Since \\(a > 0\\), \\(a = 1 + \\sqrt{3}\\)."],
    [("All parts correct", 6), ("Two parts correct and progress in the third", 5), ("Two parts correct", 4), ("One part correct and progress in another", 3), ("One part correct", 2), ("Correct tangent equation, or progress in one part", 1)])

# Q14(c) drug concentration
F = 600 * (sp.exp(-sp.Rational(1, 2) * t) - sp.exp(-sp.Rational(3, 5) * t))
assert simplify(diff(F, t) - (60 * sp.exp(-sp.Rational(3, 5) * t) - sp.Rational(1, 2) * F)) == 0 and F.subs(t, 0) == 0
assert simplify(diff(F * sp.exp(t / 2), t) - 60 * sp.exp(-t / 10)) == 0
tm = 10 * math.log(1.2); assert abs(float(diff(F, t).subs(t, tm))) < 1e-9 and round(tm, 2) == 1.82
P.W('q14c', 6, "The concentration of a medicine in the body is \\(F(t)\\), where \\(t\\) is the time in hours after it is taken. Initially the concentration is zero, and its rate of change is given by \\(F'(t) = 60e^{-0.6t} - 0.5F(t)\\).<br>"
    "(i) By differentiating the product \\(F(t)e^{0.5t}\\), show that \\(\\dfrac{d}{dt}\\left(F(t)e^{0.5t}\\right) = 60e^{-0.1t}\\). <b>2</b><br>(ii) Hence, or otherwise, show that \\(F(t) = 600\\left(e^{-0.5t} - e^{-0.6t}\\right)\\). <b>2</b><br>(iii) The concentration increases to a maximum. For what value of \\(t\\) does this maximum occur? <b>2</b>",
    ["(i) \\(\\dfrac{d}{dt}\\left(F e^{0.5t}\\right) = F'e^{0.5t} + 0.5Fe^{0.5t} = \\left(60e^{-0.6t} - 0.5F\\right)e^{0.5t} + 0.5Fe^{0.5t} = 60e^{-0.1t}\\)",
     "(ii) Integrating: \\(F(t)e^{0.5t} = -600e^{-0.1t} + C\\). At \\(t = 0\\), \\(F = 0\\): \\(C = 600\\).", "\\(F(t) = 600e^{-0.5t} - 600e^{-0.6t} = 600\\left(e^{-0.5t} - e^{-0.6t}\\right)\\)",
     "(iii) \\(F'(t) = 600\\left(-0.5e^{-0.5t} + 0.6e^{-0.6t}\\right) = 0\\) when \\(e^{0.1t} = \\frac{0.6}{0.5} = 1.2\\), so \\(t = 10\\ln 1.2 \\approx 1.82\\) hours. \\(F'\\) changes from positive to negative there, so it is the maximum."],
    [("All parts correct", 6), ("Two parts correct and progress in the third", 5), ("Two parts correct", 4), ("One part correct and progress in another", 3), ("One part correct", 2), ("Correct product rule, or progress in one part", 1)])

P.save()
