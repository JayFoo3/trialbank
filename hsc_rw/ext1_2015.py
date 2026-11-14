"""Trialbank versions of the 2015 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math, itertools
import numpy as np
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, exp, log, symbols, integrate, diff, simplify, atan, asin, acos
from rw import Paper
from fig import Plot, INK
x, t, y = symbols('x t y', real=True)
P = Paper('hsc-ext1-2015', seed=2015)
M = lambda s: '\\(' + s + '\\)'
GREY = '#8a909c'; PI = math.pi
def circle(pl, cx, cy, r): pl.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="1.5"/>' % (pl.X(cx), pl.Y(cy), round(pl.X(r) - pl.X(0), 1), INK))

# Q1 remainder theorem (not the quotient)
q_, r_ = sp.div(x**3 - 7 * x, x + 2); assert r_ == 6 and q_ == x**2 - 2 * x - 3
P.M('q01', "What is the remainder when \\(x^3 - 7x\\) is divided by \\(x + 2\\)?", M('6'), [M('-6'), M('x^2 - 2x - 3'), M('x^2 - 3x + 2')],
    "By the remainder theorem the remainder is \\(P(-2) = (-2)^3 - 7(-2) = -8 + 14 = 6\\). \\(x^2 - 2x - 3\\) is the quotient, not the remainder.")

# Q2 exponential growth DE
tt, kk = symbols('tt kk'); N = 50 + 120 * exp(kk * tt); assert simplify(diff(N, tt) - kk * (N - 50)) == 0
P.M('q02', "Given that \\(N = 50 + 120e^{kt}\\), which expression is equal to \\(\\dfrac{dN}{dt}\\)?", M('k(N - 50)'), [M('k(50 - N)'), M('k(170 - N)'), M('k(N - 170)')],
    "\\(\\frac{dN}{dt} = 120ke^{kt}\\), and \\(120e^{kt} = N - 50\\), so \\(\\frac{dN}{dt} = k(N - 50)\\).")

# Q3 two secants from an external point
xs = symbols('xs', positive=True); assert sp.solve(sp.Eq(xs * (xs + 5), 3 * (3 + 9)), xs) == [4]
pl = Plot(-1.7, 4.0, -1.6, 1.6, w=340); circle(pl, 0, 0, 1.2)
Pp = np.array([3.5, 0.9])
def secant(far_deg):
    far = np.array([1.2 * math.cos(math.radians(far_deg)), 1.2 * math.sin(math.radians(far_deg))]); d = (far - Pp) / np.linalg.norm(far - Pp)
    b = 2 * Pp.dot(d); c = Pp.dot(Pp) - 1.44; s = math.sqrt(b * b - 4 * c); return Pp + (-b - s) / 2 * d, Pp + (-b + s) / 2 * d
n1, f1 = secant(165); n2, f2 = secant(230)
for a_, b_ in [(Pp, f1), (Pp, f2)]: pl.line(a_[0], a_[1], b_[0], b_[1], width=1.3)
for q in (Pp, n1, f1, n2, f2): pl.dot(q[0], q[1], 3)
pl.text(Pp[0], Pp[1], 'P', dx=8, dy=-4, anchor='start', var=True)
pl.text(*(Pp + n1) / 2, 'x', dy=-8, var=True); pl.text(*(n1 + f1) / 2, '5', dy=-8)
pl.text(*(Pp + n2) / 2, '3', dx=8, dy=10, anchor='start'); pl.text(*(n2 + f2) / 2, '9', dx=8, dy=10, anchor='start'); pl.text(3.9, -1.4, 'NOT TO SCALE', anchor='end', size=11)
P.M('q03', "Two secants are drawn from the point \\(P\\) to a circle, as shown." + pl.svg() + "What is the value of \\(x\\)?", M('4'), [M('2'), M('6'), M('8')],
    "For two secants from the same point, (outside part) \\(\\times\\) (whole secant) is the same for both: \\(x(x + 5) = 3(3 + 9) = 36\\). So \\(x^2 + 5x - 36 = 0\\), \\((x + 9)(x - 4) = 0\\), and \\(x = 4\\). Use the whole secant, not just the chord inside.")

# Q4 team selection
assert math.comb(14, 10) * 3 == 3003
P.M('q04', "A futsal squad has 10 outfield players and a goalkeeper. The outfield players are chosen from 14 students in Year 11 and the goalkeeper from 3 students in Year 10. In how many ways could the squad be chosen?",
    M('{}^{14}C_{10} \\times {}^{3}C_{1}'), [M('{}^{14}C_{10} + {}^{3}C_{1}'), M('{}^{14}P_{10} + {}^{3}P_{1}'), M('{}^{14}P_{10} \\times {}^{3}P_{1}')],
    "Order doesn't matter in a squad, so use combinations, and both choices must happen together, so multiply: \\({}^{14}C_{10} \\times {}^{3}C_{1}\\).")

# Q5 asymptotes
f5 = lambda X: 2 * X / ((X - 1) * (X + 3)); assert abs(f5(1e6)) < 1e-5
P.M('q05', "What are the asymptotes of \\(y = \\dfrac{2x}{(x - 1)(x + 3)}\\)?",
    M('y = 0,\\ x = 1,\\ x = -3'), [M('y = 0,\\ x = -1,\\ x = 3'), M('y = 2,\\ x = 1,\\ x = -3'), M('y = 2,\\ x = -1,\\ x = 3')],
    "Vertical asymptotes where the denominator is 0: \\(x = 1\\) and \\(x = -3\\). The bottom has a higher degree than the top, so \\(y \\to 0\\) for large \\(x\\): the horizontal asymptote is \\(y = 0\\).")

# Q6 domain of inverse cos
P.M('q06', "What is the domain of the function \\(f(x) = \\cos^{-1}(3x)\\)?", M('-\\frac{1}{3} \\le x \\le \\frac{1}{3}'), [M('0 \\le x \\le \\pi'), M('-3 \\le x \\le 3'), M('0 \\le x \\le \\frac{\\pi}{3}')],
    "\\(\\cos^{-1}\\) needs its input between \\(-1\\) and 1: \\(-1 \\le 3x \\le 1\\), so \\(-\\frac{1}{3} \\le x \\le \\frac{1}{3}\\). \\(0 \\le y \\le \\pi\\) is the range, not the domain.")

# Q7 limit of an inverse sine integral
kv = symbols('kv', positive=True); assert sp.solve(sp.Eq(integrate(1 / sqrt(9 - x**2), (x, 0, kv)), pi / 6), kv) == [Q(3, 2)]
P.M('q07', "What is the value of \\(k\\) such that \\(\\displaystyle\\int_0^k \\frac{1}{\\sqrt{9 - x^2}}\\,dx = \\frac{\\pi}{6}\\)?", M('\\frac{3}{2}'), [M('\\frac{1}{2}'), M('\\sqrt{3}'), M('\\frac{3\\sqrt{3}}{2}')],
    "\\(\\int_0^k \\frac{dx}{\\sqrt{9 - x^2}} = \\sin^{-1}\\frac{k}{3}\\). Setting this to \\(\\frac{\\pi}{6}\\) gives \\(\\frac{k}{3} = \\frac{1}{2}\\), so \\(k = \\frac{3}{2}\\).")

# Q8 sin limit
assert sp.limit(sin(x - 2) / ((x - 2) * (x + 4)), x, 2) == Q(1, 6)
P.M('q08', "What is the value of \\(\\displaystyle\\lim_{x \\to 2} \\frac{\\sin(x - 2)}{(x - 2)(x + 4)}\\)?", M('\\frac{1}{6}'), [M('0'), M('6'), '\\(\\text{Undefined}\\)'],
    "\\(\\frac{\\sin(x - 2)}{x - 2} \\to 1\\) as \\(x \\to 2\\), and \\(\\frac{1}{x + 4} \\to \\frac{1}{6}\\). So the limit is \\(\\frac{1}{6}\\).")

# Q9 SHM amplitude and period
T1 = 2 * PI / 3; assert abs(2 * PI / 9 - T1 / 3) < 1e-12
P.M('q09', "Two particles oscillate horizontally. The first has displacement \\(x = 2\\sin 3t\\) and the second has displacement \\(x = a\\sin nt\\). In one oscillation, the second particle covers three times the distance of the first, in a third of the time. What are the values of \\(a\\) and \\(n\\)?",
    M('a = 6,\\ n = 9'), [M('a = \\frac{2}{3},\\ n = 1'), M('a = \\frac{2}{3},\\ n = 9'), M('a = 6,\\ n = 1')],
    "Three times the distance in one oscillation means three times the amplitude: \\(a = 6\\). A third of the time means the period is \\(\\frac{1}{3} \\times \\frac{2\\pi}{3} = \\frac{2\\pi}{9}\\), so \\(n = 9\\). A shorter period means a bigger \\(n\\).")

# Q10 a zero of a shifted sine graph
g10 = lambda T: math.sin(2 * T - PI / 4); Pt = 9 * PI / 8
assert abs(g10(Pt)) < 1e-12 and (g10(Pt + 1e-4) > 0) and g10(0) < 0
pl = Plot(-0.7, 4.6, -1.5, 1.6, w=380); pl.axes(xt=[], yt=[], xl='t'); pl.curve(g10, -0.7, 4.4); pl.dot(Pt, 0, 3.2); pl.text(Pt, 0, 'P', dx=6, dy=16, anchor='start', var=True)
P.M('q10', "The graph of \\(y = \\sin\\left(2t - \\dfrac{\\pi}{4}\\right)\\) is shown below." + pl.svg() + "What are the coordinates of the point \\(P\\)?",
    M('\\left(\\frac{9\\pi}{8}, 0\\right)'), [M('\\left(\\frac{\\pi}{8}, 0\\right)'), M('\\left(\\frac{5\\pi}{8}, 0\\right)'), M('\\left(\\frac{13\\pi}{8}, 0\\right)')],
    "The zeros are where \\(2t - \\frac{\\pi}{4} = k\\pi\\), that is \\(t = \\frac{\\pi}{8}, \\frac{5\\pi}{8}, \\frac{9\\pi}{8}, \\dots\\). On the graph the curve crosses up at \\(\\frac{\\pi}{8}\\) (just right of \\(O\\)), down at \\(\\frac{5\\pi}{8}\\), and up again at \\(P\\), the third zero: \\(\\frac{9\\pi}{8}\\).")

# Q11(a)
assert simplify(diff(x / 2 + sin(2 * x) / 4, x) - cos(x)**2) == 0
P.W('q11a', 2, "Find \\(\\displaystyle\\int \\cos^2 x\\,dx\\).",
    ["\\(\\cos^2 x = \\frac{1}{2}(1 + \\cos 2x)\\)", "\\(\\displaystyle\\int \\cos^2 x\\,dx = \\frac{x}{2} + \\frac{\\sin 2x}{4} + C\\)"],
    [("Correct primitive", 2), ("Uses \\(\\cos^2 x = \\frac{1}{2}(1 + \\cos 2x)\\)", 1)])

# Q11(b)
th = math.degrees(math.atan(abs((-1 - 4) / (1 + 4 * -1)))); assert round(th) == 59
P.W('q11b', 2, "Calculate the size of the acute angle between the lines \\(y = 4x + 1\\) and \\(y = 2 - x\\), to the nearest degree.",
    ["\\(m_1 = 4\\), \\(m_2 = -1\\): \\(\\tan\\theta = \\left|\\dfrac{4 - (-1)}{1 + 4 \\times (-1)}\\right| = \\left|\\dfrac{5}{-3}\\right| = \\dfrac{5}{3}\\)", "\\(\\theta = \\tan^{-1}\\frac{5}{3} \\approx 59^\\circ\\)"],
    [("Correct answer", 2), ("Correct substitution into the formula", 1)])

# Q11(c)
assert sp.solve_univariate_inequality(6 / (x + 1) >= 2, x, relational=False) == sp.Interval.Lopen(-1, 2)
P.W('q11c', 3, "Solve the inequality \\(\\dfrac{6}{x + 1} \\ge 2\\).",
    ["Multiply by \\((x + 1)^2 > 0\\) (\\(x \\ne -1\\)): \\(6(x + 1) \\ge 2(x + 1)^2\\).", "\\(0 \\ge 2(x + 1)^2 - 6(x + 1) = 2(x + 1)(x - 2)\\)", "So \\(-1 \\le x \\le 2\\), but \\(x \\ne -1\\): \\(-1 < x \\le 2\\)."],
    [("Correct solution", 3), ("Correct critical values with the endpoint \\(-1\\) mishandled", 2), ("Multiplies by \\((x + 1)^2\\), or finds a critical value", 1)])

# Q11(d)
al = math.atan(15 / 8); assert all(abs(8 * math.cos(v) - 15 * math.sin(v) - 17 * math.cos(v + al)) < 1e-12 for v in [0.2, 1.4, 3])
P.W('q11d', 2, "Express \\(8\\cos x - 15\\sin x\\) in the form \\(A\\cos(x + \\alpha)\\), where \\(0 \\le \\alpha \\le \\dfrac{\\pi}{2}\\).",
    ["\\(A\\cos\\alpha = 8\\), \\(A\\sin\\alpha = 15\\), so \\(A = \\sqrt{64 + 225} = 17\\) and \\(\\tan\\alpha = \\frac{15}{8}\\).", "\\(8\\cos x - 15\\sin x = 17\\cos\\left(x + \\tan^{-1}\\frac{15}{8}\\right) \\approx 17\\cos(x + 1.08)\\)"],
    [("Correct \\(A\\) and \\(\\alpha\\)", 2), ("Correct \\(A\\) or correct \\(\\alpha\\)", 1)])

# Q11(e)
I11 = integrate(x / (3 * x - 2)**2, (x, 1, 2)); assert simplify(I11 - (sp.log(4) + Q(3, 2)) / 9) == 0
P.W('q11e', 3, "Use the substitution \\(u = 3x - 2\\) to evaluate \\(\\displaystyle\\int_1^2 \\frac{x}{(3x - 2)^2}\\,dx\\).",
    ["\\(du = 3\\,dx\\), \\(x = \\frac{u + 2}{3}\\). \\(x = 1 \\Rightarrow u = 1\\); \\(x = 2 \\Rightarrow u = 4\\).", "\\(\\displaystyle\\int_1^2 \\frac{x}{(3x - 2)^2}\\,dx = \\int_1^4 \\frac{u + 2}{3u^2} \\times \\frac{du}{3} = \\frac{1}{9}\\int_1^4 \\left(\\frac{1}{u} + \\frac{2}{u^2}\\right)du\\)",
     "\\(= \\frac{1}{9}\\left[\\ln u - \\frac{2}{u}\\right]_1^4 = \\frac{1}{9}\\left(\\ln 4 - \\frac{1}{2} + 2\\right) = \\frac{1}{9}\\left(\\ln 4 + \\frac{3}{2}\\right)\\)"],
    [("Correct exact value", 3), ("Correct integral in \\(u\\) and a correct primitive", 2), ("Correct integral in \\(u\\) with correct limits", 1)])

# Q11(f)
kq = symbols('kq'); Pk = x**3 - kq * x**2 + 2 * x + 8; assert sp.solve(Pk.subs(x, 4), kq) == [5]
assert sorted(sp.solve(Pk.subs(kq, 5), x)) == [-1, 2, 4]
P.W('q11f', 3, "Consider the polynomials \\(P(x) = x^3 - kx^2 + 2x + 8\\) and \\(A(x) = x - 4\\).<br>(i) Given that \\(P(x)\\) is divisible by \\(A(x)\\), show that \\(k = 5\\). <b>1</b><br>(ii) Find all the zeros of \\(P(x)\\) when \\(k = 5\\). <b>2</b>",
    ["(i) \\(P(4) = 64 - 16k + 8 + 8 = 80 - 16k = 0\\), so \\(k = 5\\).", "(ii) \\(P(x) = (x - 4)(x^2 - x - 2) = (x - 4)(x - 2)(x + 1)\\)", "The zeros are \\(4\\), \\(2\\) and \\(-1\\)."],
    [("Both parts correct", 3), ("Part (i), and the correct quadratic factor", 2), ("Part (i) correct", 1)])

# Q12(a) circle geometry with angles
Pd = lambda d: np.array([math.cos(math.radians(d)), math.sin(math.radians(d))])
B, D, C, A = Pd(90), Pd(-90), Pd(210), Pd(-10)
def ang(p, q, r): u, v = p - q, r - q; return math.degrees(math.acos(u.dot(v) / np.linalg.norm(u) / np.linalg.norm(v)))
Y = A + ((0 - A[0]) / (C[0] - A[0])) * (C - A); X = D + np.array([1.2, 0])
assert round(ang(D, C, Y)) == 40 and round(ang(C, Y, B)) == 100 and round(ang(A, C, B)) == 50 and round(ang(A, D, X)) == 40 and round(ang(C, A, B)) == 60
pl = Plot(-1.5, 2.4, -1.45, 1.35, w=340); circle(pl, 0, 0, 1)
for a_, b_ in [(B, D), (A, C), (B, C), (B, A), (A, D), (C, D)]: pl.line(a_[0], a_[1], b_[0], b_[1], width=1.2)
pl.line(-1.3, -1, 2.0, -1, width=1.2); pl.dot(X[0], X[1], 3); pl.dot(0, 0, 2.5)
for q, lab, dx_, dy_ in [(B, 'B', -4, -8), (D, 'D', 0, 18), (C, 'C', -10, 6), (A, 'A', 10, 6), (Y, 'Y', 8, -4), (np.array([0, 0]), 'O', 8, -6), (X, 'X', 0, 18)]: pl.text(q[0], q[1], lab, dx=dx_, dy=dy_, var=True)
pl.text(Y[0], Y[1], '100°', dx=-20, dy=-12, size=11); pl.text(C[0], C[1], '40°', dx=30, dy=16, size=11); pl.text(2.3, 1.15, 'NOT TO SCALE', anchor='end', size=11)
P.W('q12a', 4, "The points \\(A\\), \\(B\\), \\(C\\) and \\(D\\) lie on a circle whose centre \\(O\\) is on \\(BD\\). The chord \\(AC\\) meets the diameter \\(BD\\) at \\(Y\\). The tangent at \\(D\\) passes through the point \\(X\\). It is given that \\(\\angle CYB = 100^\\circ\\) and \\(\\angle DCY = 40^\\circ\\)." + pl.svg() +
    "(i) What is the size of \\(\\angle ACB\\)? <b>1</b><br>(ii) What is the size of \\(\\angle ADX\\)? <b>1</b><br>(iii) Find, giving reasons, the size of \\(\\angle CAB\\). <b>2</b>",
    ["(i) \\(\\angle BCD = 90^\\circ\\) (angle in a semicircle), so \\(\\angle ACB = 90^\\circ - 40^\\circ = 50^\\circ\\).", "(ii) \\(\\angle ADX = \\angle ACD = 40^\\circ\\) (angle between a tangent and a chord equals the angle in the alternate segment).",
     "(iii) \\(\\angle CYD = 180^\\circ - 100^\\circ = 80^\\circ\\) (angles on a straight line). In triangle \\(CYD\\), \\(\\angle CDY = 180^\\circ - 80^\\circ - 40^\\circ = 60^\\circ\\) (angle sum of a triangle).",
     "\\(\\angle CAB = \\angle CDB = 60^\\circ\\) (angles at the circumference standing on the same arc \\(CB\\))."],
    [("All parts correct with reasons", 4), ("Three correct answers, or part (iii) correct with reasons", 3), ("Two correct answers", 2), ("One correct answer", 1)])

# Q12(b) focal chord
p_, q2, a_ = symbols('p q a', real=True)
assert simplify(((p_ + q2) * 0 - 2 * a_ - 2 * a_ * p_ * q2).subs(q2, -1 / p_)) == 0
pv = 3; qv = Q(-1, pv); assert (2 * qv, qv**2) == (Q(-2, 3), Q(1, 9))
P.W('q12b', 3, "The points \\(P(2ap, ap^2)\\) and \\(Q(2aq, aq^2)\\) lie on the parabola \\(x^2 = 4ay\\). The chord \\(PQ\\) has equation \\((p + q)x - 2y - 2apq = 0\\) (do NOT prove this).<br>"
    "(i) Show that if \\(PQ\\) is a focal chord then \\(pq = -1\\). <b>1</b><br>(ii) If \\(PQ\\) is a focal chord and \\(P\\) has coordinates \\((6a, 9a)\\), what are the coordinates of \\(Q\\) in terms of \\(a\\)? <b>2</b>",
    ["(i) A focal chord passes through the focus \\((0, a)\\): \\(0 - 2a - 2apq = 0\\), so \\(pq = -1\\).", "(ii) \\(2ap = 6a\\), so \\(p = 3\\) (check: \\(ap^2 = 9a\\)). Then \\(q = -\\frac{1}{3}\\).", "\\(Q = \\left(2a \\times \\left(-\\frac{1}{3}\\right), a \\times \\frac{1}{9}\\right) = \\left(-\\frac{2a}{3}, \\frac{a}{9}\\right)\\)"],
    [("Both parts correct", 3), ("Part (i), and finds \\(p = 3\\) or \\(q = -\\frac{1}{3}\\)", 2), ("Part (i) correct, or finds \\(q\\)", 1)])

# Q12(c) angles of elevation in 3D
h = 1500 / math.sqrt((1 / math.tan(math.radians(14)))**2 - (1 / math.tan(math.radians(18)))**2); assert round(h) == 583
pl = Plot(-0.6, 7.2, -2.3, 2.6, w=380)
O_, M_, A_, B_ = (0, 0), (0, 2.1), (3.6, -1.7), (6.3, 0.7)
for a_, b_ in [(O_, M_), (O_, A_), (O_, B_), (M_, A_), (M_, B_), (A_, B_)]: pl.line(a_[0], a_[1], b_[0], b_[1], width=1.2)
for q, lab, dx_, dy_ in [(O_, 'O', -10, 10), (M_, 'M', 0, -8), (A_, 'A', 0, 18), (B_, 'B', 10, 4)]: pl.text(q[0], q[1], lab, dx=dx_, dy=dy_, var=True)
pl.text(0, 1.05, 'h m', dx=-8, anchor='end', var=True); pl.text(A_[0], A_[1], '18°', dx=-34, dy=-14, size=12); pl.text(B_[0], B_[1], '14°', dx=-40, dy=-6, size=12)
pl.text((A_[0] + B_[0]) / 2, (A_[1] + B_[1]) / 2, '1500 m', dx=10, dy=10, anchor='start', size=12); pl.text(7.1, -2.1, 'NOT TO SCALE', anchor='end', size=11)
P.W('q12c', 3, "A person walks 1500 metres due north along a straight road from point \\(A\\) to point \\(B\\). The point \\(A\\) is due east of a tower \\(OM\\), where \\(M\\) is the top of the tower and \\(O\\) is directly below \\(M\\), on the same horizontal plane as the road. The height of the tower is \\(h\\) metres. From \\(A\\) the angle of elevation of \\(M\\) is \\(18^\\circ\\), and from \\(B\\) it is \\(14^\\circ\\)." + pl.svg() +
    "(i) Show that \\(OA = h\\cot 18^\\circ\\). <b>1</b><br>(ii) Hence, find the value of \\(h\\), to the nearest metre. <b>2</b>",
    ["(i) In right triangle \\(MOA\\), \\(\\tan 18^\\circ = \\frac{h}{OA}\\), so \\(OA = \\frac{h}{\\tan 18^\\circ} = h\\cot 18^\\circ\\).", "(ii) Similarly \\(OB = h\\cot 14^\\circ\\). \\(OA\\) points west and \\(AB\\) points north, so \\(\\angle OAB = 90^\\circ\\) and \\(OB^2 = OA^2 + AB^2\\).",
     "\\(h^2\\cot^2 14^\\circ = h^2\\cot^2 18^\\circ + 1500^2\\), so \\(h = \\dfrac{1500}{\\sqrt{\\cot^2 14^\\circ - \\cot^2 18^\\circ}} \\approx 583\\) m."],
    [("Both parts correct", 3), ("Part (i), and a correct equation in \\(h\\) from Pythagoras", 2), ("Part (i) correct", 1)])

# Q12(d) circular segment and Newton's method
r_, thv = symbols('r theta', positive=True)
assert simplify((2 * r_**2 * (1 - cos(thv))).subs(r_, 180 / thv) * thv**2 / 900 - 72 * (1 - cos(thv))) == 0
f12 = lambda T: 25 * T * T + 72 * math.cos(T) - 72; fp12 = lambda T: 50 * T - 72 * math.sin(T)
th2 = PI - f12(PI) / fp12(PI); assert round(th2, 2) == 2.49
pl = Plot(-2.0, 3.4, -1.85, 0.95, w=360)
R0, half = 1.6, 1.1   # draw a segment: chord at y = 0 from -half to half, centre below
cy = -math.sqrt(R0 * R0 - half * half)
pl.region([(R0 * math.cos(a), cy + R0 * math.sin(a)) for a in np.linspace(math.atan2(-cy, half), PI - math.atan2(-cy, half), 60)])
pl.raw('<path d="M%s,%s A%s,%s 0 0 0 %s,%s" fill="none" stroke="%s" stroke-width="1.5"/>' % (pl.X(half), pl.Y(0), round(pl.X(R0) - pl.X(0), 1), round(pl.X(R0) - pl.X(0), 1), pl.X(-half), pl.Y(0), INK))
pl.line(-half, 0, half, 0, width=1.3); pl.line(-half, 0, 0, cy, dash='4 4', width=1); pl.line(half, 0, 0, cy, dash='4 4', width=1)
pl.text(0, R0 + cy, '180 cm', dy=-8, size=12); pl.text(0, 0, '150 cm', dy=16, size=12); pl.text(0, cy, 'O', dy=16, var=True); pl.text(0, cy, 'θ', dy=-10, var=True, size=13)
pl.text(-half / 2, cy / 2, 'r cm', dx=-10, anchor='end', var=True, size=12); pl.text(half / 2, cy / 2, 'r cm', dx=10, anchor='start', var=True, size=12); pl.text(3.3, 0.6, 'NOT TO SCALE', anchor='end', size=11)
P.W('q12d', 5, "A tabletop is in the shape of a segment of a circle, bounded by an arc of length 180 cm and a chord of length 150 cm. The circle has radius \\(r\\) cm and the chord subtends an angle \\(\\theta\\) at the centre \\(O\\)." + pl.svg() +
    "(i) Show that \\(150^2 = 2r^2(1 - \\cos\\theta)\\). <b>1</b><br>(ii) Hence, or otherwise, show that \\(25\\theta^2 + 72\\cos\\theta - 72 = 0\\). <b>2</b><br>"
    "(iii) Taking \\(\\theta_1 = \\pi\\) as a first approximation to \\(\\theta\\), use one application of Newton's method to find a second approximation, correct to two decimal places. <b>2</b>",
    ["(i) By the cosine rule in the triangle formed by the chord and two radii: \\(150^2 = r^2 + r^2 - 2r^2\\cos\\theta = 2r^2(1 - \\cos\\theta)\\).",
     "(ii) The arc length is \\(r\\theta = 180\\), so \\(r = \\frac{180}{\\theta}\\). Then \\(22\\,500 = \\frac{2 \\times 32\\,400}{\\theta^2}(1 - \\cos\\theta)\\), so \\(22\\,500\\theta^2 = 64\\,800(1 - \\cos\\theta)\\).", "Dividing by 900: \\(25\\theta^2 = 72 - 72\\cos\\theta\\), that is \\(25\\theta^2 + 72\\cos\\theta - 72 = 0\\).",
     "(iii) \\(f(\\theta) = 25\\theta^2 + 72\\cos\\theta - 72\\), \\(f'(\\theta) = 50\\theta - 72\\sin\\theta\\). \\(f(\\pi) = 25\\pi^2 - 144\\), \\(f'(\\pi) = 50\\pi\\).", "\\(\\theta_2 = \\pi - \\dfrac{25\\pi^2 - 144}{50\\pi} \\approx 2.49\\)"],
    [("All parts correct", 5), ("Two parts correct and progress in the third", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct", 1)])

# Q13(a) SHM from a v^2 graph
v2 = lambda X: 2 * (9 - (X - 5)**2); assert v2(2) == 0 and v2(8) == 0 and v2(5) == 18
pl = Plot(-0.8, 9.6, -2, 21, w=300, h=300); pl.line(0, 18, 5, 18, dash='4 4', colour=GREY, width=1); pl.axes(xt=[2, 8], yt=[18], yl='v²'); pl.curve(v2, 2, 8)
pl.dot(2, 0, 3); pl.dot(8, 0, 3)
P.W('q13a', 5, "A particle moves along the \\(x\\)-axis in simple harmonic motion. Its displacement is \\(x\\) metres and its velocity is \\(v\\) m s⁻¹. The parabola shows \\(v^2\\) as a function of \\(x\\)." + pl.svg() +
    "(i) For what value(s) of \\(x\\) is the particle at rest? <b>1</b><br>(ii) What is the maximum speed of the particle? <b>1</b><br>(iii) The velocity satisfies \\(v^2 = n^2\\left(a^2 - (x - c)^2\\right)\\), where \\(a\\), \\(c\\) and \\(n\\) are positive constants. What are the values of \\(a\\), \\(c\\) and \\(n\\)? <b>3</b>",
    ["(i) At rest when \\(v^2 = 0\\): \\(x = 2\\) and \\(x = 8\\).", "(ii) The greatest value of \\(v^2\\) is 18, so the maximum speed is \\(\\sqrt{18} = 3\\sqrt{2}\\) m s⁻¹.",
     "(iii) The centre of motion is midway between the ends: \\(c = 5\\). The amplitude is \\(a = 3\\).", "At \\(x = 5\\): \\(18 = n^2 \\times 9\\), so \\(n^2 = 2\\) and \\(n = \\sqrt{2}\\)."],
    [("All parts correct", 5), ("Parts (i) and (ii), and two of \\(a\\), \\(c\\), \\(n\\)", 4), ("Parts (i) and (ii), and one of \\(a\\), \\(c\\), \\(n\\)", 3), ("Two of the five values correct", 2), ("One correct value", 1)])

# Q13(b) binomial terms with negative powers
ex = sp.expand((3 * x + 1 / (2 * x))**16)
assert ex.coeff(x, 12) == math.comb(16, 2) * Q(3**14, 4) and ex.coeff(x, 0) == math.comb(16, 8) * Q(3**8, 2**8)
P.W('q13b', 4, "Consider the binomial expansion \\(\\left(3x + \\dfrac{1}{2x}\\right)^{16} = a_0x^{16} + a_1x^{14} + a_2x^{12} + \\cdots\\), where \\(a_0, a_1, a_2, \\dots\\) are constants.<br>(i) Find an expression for \\(a_2\\). <b>2</b><br>(ii) Find an expression for the term independent of \\(x\\). <b>2</b>",
    ["The general term is \\(\\binom{16}{r}(3x)^{16-r}\\left(\\frac{1}{2x}\\right)^r = \\binom{16}{r}\\dfrac{3^{16-r}}{2^r}x^{16-2r}\\).", "(i) \\(a_2\\) is the \\(r = 2\\) term: \\(a_2 = \\binom{16}{2}\\dfrac{3^{14}}{2^2}\\).", "(ii) Independent of \\(x\\) when \\(16 - 2r = 0\\), \\(r = 8\\): the term is \\(\\binom{16}{8}\\dfrac{3^8}{2^8}\\)."],
    [("Both parts correct", 4), ("One part correct and the correct general term", 3), ("One part correct, or the correct general term", 2), ("Some correct use of the binomial theorem", 1)])

# Q13(c) induction
for Nn in range(1, 25): assert sum(k * 2**k for k in range(1, Nn + 1)) == (Nn - 1) * 2**(Nn + 1) + 2
P.W('q13c', 3, "Prove by mathematical induction that for all integers \\(n \\ge 1\\),<br>\\(1 \\times 2 + 2 \\times 2^2 + 3 \\times 2^3 + \\cdots + n \\times 2^n = (n - 1)2^{n+1} + 2\\).",
    ["<b>Step 1.</b> \\(n = 1\\): LHS \\(= 2\\), RHS \\(= 0 + 2 = 2\\). True.", "<b>Step 2.</b> Assume true for \\(n = k\\): \\(\\displaystyle\\sum_{r=1}^{k} r2^r = (k - 1)2^{k+1} + 2\\).",
     "<b>Step 3.</b> For \\(n = k + 1\\): LHS \\(= (k - 1)2^{k+1} + 2 + (k + 1)2^{k+1} = 2k \\times 2^{k+1} + 2 = k \\times 2^{k+2} + 2\\), which is the RHS for \\(n = k + 1\\).",
     "So if true for \\(n = k\\), it is true for \\(n = k + 1\\); since true for \\(n = 1\\), by induction it is true for all \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves \\(n = 1\\) and makes significant progress in the inductive step", 2), ("Proves \\(n = 1\\), or correctly adds the \\((k + 1)\\)th term", 1)])

# Q13(d) odd property of inverse sine
assert simplify(diff(asin(x) + asin(-x), x)) == 0
P.W('q13d', 3, "Let \\(f(x) = \\sin^{-1}(x) + \\sin^{-1}(-x)\\), where \\(-1 \\le x \\le 1\\).<br>(i) By considering the derivative of \\(f(x)\\), prove that \\(f(x)\\) is constant. <b>2</b><br>(ii) Hence deduce that \\(\\sin^{-1}(-x) = -\\sin^{-1}(x)\\). <b>1</b>",
    ["(i) \\(f'(x) = \\dfrac{1}{\\sqrt{1 - x^2}} + \\dfrac{-1}{\\sqrt{1 - (-x)^2}} = \\dfrac{1}{\\sqrt{1 - x^2}} - \\dfrac{1}{\\sqrt{1 - x^2}} = 0\\), so \\(f\\) is constant.",
     "(ii) \\(f(0) = 0 + 0 = 0\\), so \\(f(x) = 0\\) for all \\(x\\): \\(\\sin^{-1}(-x) = -\\sin^{-1}(x)\\)."],
    [("Both parts correct", 3), ("Part (i) correct", 2), ("Correct derivative of \\(\\sin^{-1}(-x)\\) using the chain rule", 1)])

# Q14(a) projectile
Vv, gg = symbols('V g', positive=True)
T1_ = Vv * (sqrt(3) + 1) / (sqrt(6) * gg); vx = Vv / sqrt(2); vy = Vv / sqrt(2) - gg * T1_
assert simplify(vy / vx + 1 / sqrt(3)) == 0 and float((T1_ - sqrt(2) * Vv / gg).subs({Vv: 1, gg: 1})) < 0
pl = Plot(-0.6, 4.7, -0.7, 2.0, w=360); pl.axes(xt=[], yt=[]); pl.curve(lambda X: X * (1 - X / 4.2), 0, 4.2); pl.dot(4.2, 0, 3)
pl.line(0, 0, 0.75, 0.75, width=1.5, arrow=True); pl.text(0.75, 0.75, 'V', dx=-4, dy=-8, anchor='end', var=True)
pl.raw('<path d="M%s,%sA26,26 0 0 0 %s,%s" fill="none" stroke="%s"/>' % (pl.X(0) + 26, pl.Y(0), round(pl.X(0) + 26 * math.cos(PI / 4), 1), round(pl.Y(0) - 26 * math.sin(PI / 4), 1), INK)); pl.text(0, 0, 'θ', dx=32, dy=-6, var=True, size=13)
P.W('q14a', 5, "A projectile is fired from the origin \\(O\\) with initial speed \\(V\\) m s⁻¹ at an angle \\(\\theta\\) to the horizontal. Its equations of motion are \\(x = Vt\\cos\\theta\\) and \\(y = Vt\\sin\\theta - \\frac{1}{2}gt^2\\) (do NOT prove this)." + pl.svg() +
    "(i) Show that the horizontal range of the projectile is \\(\\dfrac{V^2\\sin 2\\theta}{g}\\). <b>2</b><br>A particular projectile is fired with \\(\\theta = \\dfrac{\\pi}{4}\\).<br>"
    "(ii) Find the angle that this projectile makes with the horizontal when \\(t = \\dfrac{(\\sqrt{3} + 1)V}{\\sqrt{6}\\,g}\\). <b>2</b><br>(iii) State whether the projectile is travelling upwards or downwards at that time. Justify your answer. <b>1</b>",
    ["(i) \\(y = 0\\) when \\(t(V\\sin\\theta - \\frac{1}{2}gt) = 0\\), so it lands at \\(t = \\frac{2V\\sin\\theta}{g}\\).", "Range \\(= V\\cos\\theta \\times \\dfrac{2V\\sin\\theta}{g} = \\dfrac{V^2 \\times 2\\sin\\theta\\cos\\theta}{g} = \\dfrac{V^2\\sin 2\\theta}{g}\\).",
     "(ii) \\(\\dot{x} = \\frac{V}{\\sqrt{2}}\\) and \\(\\dot{y} = \\frac{V}{\\sqrt{2}} - gt = \\frac{V}{\\sqrt{2}} - \\frac{(\\sqrt{3} + 1)V}{\\sqrt{6}} = -\\frac{V}{\\sqrt{6}}\\).", "\\(\\tan\\phi = \\dfrac{\\dot{y}}{\\dot{x}} = -\\dfrac{\\sqrt{2}}{\\sqrt{6}} = -\\dfrac{1}{\\sqrt{3}}\\), so the projectile makes an angle of \\(30^\\circ\\) with the horizontal.",
     "(iii) \\(\\dot{y} < 0\\) at that time, so it is travelling downwards (it is past its highest point, but has not yet landed)."],
    [("All parts correct", 5), ("Two parts correct and progress in the third", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct", 1)])

# Q14(b) motion with acceleration linear in x
xt = lambda T: 2 - 2 * math.exp(-T)
assert xt(0) == 0 and abs((xt(1e-6) - xt(0)) / 1e-6 - 2) < 1e-5
for T in [0.3, 1, 2.5]:
    v = 2 * math.exp(-T); assert abs(v - (2 - xt(T))) < 1e-12 and abs(-v - (xt(T) - 2)) < 1e-12   # a = dv/dt = -v = x - 2
P.W('q14b', 6, "A particle moves horizontally. Initially it is at the origin \\(O\\), moving with velocity 2 m s⁻¹. Its acceleration is \\(\\ddot{x} = x - 2\\), where \\(x\\) is its displacement at time \\(t\\).<br>"
    "(i) Show that the velocity of the particle is given by \\(\\dot{x} = 2 - x\\). <b>3</b><br>(ii) Find an expression for \\(x\\) as a function of \\(t\\). <b>2</b><br>(iii) Find the limiting position of the particle. <b>1</b>",
    ["(i) \\(\\dfrac{d}{dx}\\left(\\frac{1}{2}\\dot{x}^2\\right) = x - 2\\), so \\(\\frac{1}{2}\\dot{x}^2 = \\frac{1}{2}(x - 2)^2 + C\\).", "At \\(x = 0\\), \\(\\dot{x} = 2\\): \\(2 = 2 + C\\), so \\(C = 0\\) and \\(\\dot{x}^2 = (x - 2)^2\\), \\(\\dot{x} = \\pm(2 - x)\\).",
     "Initially \\(\\dot{x} = 2\\) when \\(x = 0\\), which matches \\(\\dot{x} = 2 - x\\). The velocity can only change sign by passing through 0, which would need \\(x = 2\\), so \\(\\dot{x} = 2 - x\\) throughout.",
     "(ii) \\(\\dfrac{dx}{dt} = 2 - x\\), so \\(\\displaystyle\\int \\frac{dx}{2 - x} = \\int dt\\): \\(-\\ln(2 - x) = t + C\\). At \\(t = 0\\), \\(x = 0\\): \\(C = -\\ln 2\\).", "\\(\\ln\\frac{2 - x}{2} = -t\\), so \\(x = 2 - 2e^{-t}\\).",
     "(iii) As \\(t \\to \\infty\\), \\(e^{-t} \\to 0\\), so the particle approaches \\(x = 2\\)."],
    [("All parts correct", 6), ("Parts (i) and (ii) correct", 5), ("Part (i), and progress in (ii)", 4), ("Part (i) correct, or parts (ii) and (iii) correct", 3), ("Correct \\(\\dot{x}^2 = (x - 2)^2\\)", 2), ("Uses \\(\\ddot{x} = \\frac{d}{dx}\\left(\\frac{1}{2}\\dot{x}^2\\right)\\)", 1)])

# Q14(c) first to win, and a counting identity
pA = lambda n: math.comb(n - 1, 3) * 0.5**n
assert abs(pA(6) - math.comb(5, 3) * 0.5**6) < 1e-15
sim = {}
for seq in itertools.product('AB', repeat=7):
    a_ = b_ = 0
    for i, w in enumerate(seq):
        a_ += w == 'A'; b_ += w == 'B'
        if a_ == 4 or b_ == 4: sim.setdefault((w, i + 1), 0); sim[(w, i + 1)] += 1; break
assert abs(sim[('A', 6)] / 2**7 - pA(6)) < 1e-12 and abs(sum(pA(k) for k in range(4, 7)) - sum(v for (w, n), v in sim.items() if w == 'A' and n <= 6) / 2**7) < 1e-12
for n in range(1, 10): assert sum(math.comb(n + k, n) * 2**(n - k) for k in range(n + 1)) == 4**n
P.W('q14c', 4, "Two players, \\(A\\) and \\(B\\), play a series of games for a prize. In each game either player is equally likely to win. At first, the prize goes to the first player to win a total of 4 games.<br>"
    "(i) Explain why the probability that \\(A\\) wins the prize in exactly 6 games is \\(\\dbinom{5}{3}\\left(\\dfrac{1}{2}\\right)^6\\). <b>1</b><br>(ii) Write an expression for the probability that \\(A\\) wins the prize in at most 6 games. <b>1</b><br>"
    "(iii) Suppose instead the prize goes to the first player to win a total of \\((n + 1)\\) games, where \\(n\\) is a positive integer. By considering the probability that \\(A\\) wins the prize, prove that<br>\\(\\dbinom{n}{n}2^n + \\dbinom{n + 1}{n}2^{n-1} + \\dbinom{n + 2}{n}2^{n-2} + \\cdots + \\dbinom{2n}{n} = 2^{2n}\\). <b>2</b>",
    ["(i) \\(A\\) must win game 6 and exactly 3 of the first 5 games: \\(\\binom{5}{3}\\) orders, each with probability \\(\\left(\\frac{1}{2}\\right)^6\\).",
     "(ii) \\(\\left(\\frac{1}{2}\\right)^4 + \\binom{4}{3}\\left(\\frac{1}{2}\\right)^5 + \\binom{5}{3}\\left(\\frac{1}{2}\\right)^6\\)",
     "(iii) \\(A\\) wins in exactly \\(n + 1 + k\\) games (\\(k = 0, 1, \\dots, n\\)) with probability \\(\\binom{n + k}{n}\\left(\\frac{1}{2}\\right)^{n+1+k}\\): \\(A\\) wins the last game and \\(n\\) of the earlier \\(n + k\\).",
     "By symmetry \\(P(A \\text{ wins}) = \\frac{1}{2}\\), so \\(\\displaystyle\\sum_{k=0}^{n} \\binom{n + k}{n}\\frac{1}{2^{n+1+k}} = \\frac{1}{2}\\).", "Multiplying both sides by \\(2^{2n+1}\\): \\(\\displaystyle\\sum_{k=0}^{n} \\binom{n + k}{n}2^{n-k} = 2^{2n}\\), which is the result."],
    [("All parts correct", 4), ("Part (iii) correct, or parts (i) and (ii) with progress in (iii)", 3), ("Parts (i) and (ii) correct", 2), ("One part correct", 1)])

P.save()
