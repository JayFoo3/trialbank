"""Trialbank versions of the 2019 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math, itertools
import numpy as np
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, exp, log, symbols, integrate, diff, simplify, atan, asin
from rw import Paper
from fig import Plot, INK
x, t, y = symbols('x t y', real=True)
P = Paper('hsc-ext1-2019', seed=2019)
M = lambda s: '\\(' + s + '\\)'
VEC = lambda s: '\\underset{\\sim}{' + s + '}'
I_, J_ = VEC('i'), VEC('j')
GREY = '#8a909c'; PI = math.pi
def circle(pl, cx, cy, r): pl.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="1.5"/>' % (pl.X(cx), pl.Y(cy), round(pl.X(r) - pl.X(0), 1), INK))

# Q1 domain of a log
P.M('q01', "What is the domain of the function \\(f(x) = \\ln(6 - 2x)\\)?", M('x < 3'), [M('x \\le 3'), M('x > 3'), M('x \\ge 3')],
    "\\(\\ln\\) is only defined for positive numbers, so \\(6 - 2x > 0\\), giving \\(x < 3\\). At \\(x = 3\\) the log would be of 0, which is undefined.")

# Q2 tangent-secant
xx = symbols('xx', positive=True); assert sp.solve(sp.Eq((3 * xx)**2, xx * (xx + 7)), xx) == [Q(7, 8)]
pl = Plot(-3.8, 2.4, -1.9, 1.9, w=330)
circle(pl, 0, 0, 1.2)
Pp = np.array([-3.4, -0.3]); far = np.array([1.2 * math.cos(-0.5), 1.2 * math.sin(-0.5)])
dirv = (far - Pp) / np.linalg.norm(far - Pp)
bq = 2 * Pp.dot(dirv); cq = Pp.dot(Pp) - 1.44; disc = math.sqrt(bq * bq - 4 * cq)
N1 = Pp + (-bq - disc) / 2 * dirv; N2 = Pp + (-bq + disc) / 2 * dirv
d = np.linalg.norm(Pp); th_t = math.atan2(Pp[1], Pp[0]) - math.acos(1.2 / d)
T = np.array([1.2 * math.cos(th_t), 1.2 * math.sin(th_t)])
if T[1] < 0: th_t = math.atan2(Pp[1], Pp[0]) + math.acos(1.2 / d); T = np.array([1.2 * math.cos(th_t), 1.2 * math.sin(th_t)])
assert abs((T - Pp).dot(T)) < 1e-9 and abs(np.linalg.norm(N2) - 1.2) < 1e-9
ut = (T - Pp) / np.linalg.norm(T - Pp)
pl.line(Pp[0], Pp[1], N2[0], N2[1], width=1.3); pl.line(Pp[0], Pp[1], T[0] + 1.2 * ut[0], T[1] + 1.2 * ut[1], width=1.3)
for q_ in (Pp, N1, N2, T): pl.dot(q_[0], q_[1], 3)
pl.text(Pp[0], Pp[1], 'P', dx=-10, dy=5, var=True)
pl.text((Pp[0] + N1[0]) / 2, (Pp[1] + N1[1]) / 2, 'x', dy=16, var=True); pl.text((N1[0] + N2[0]) / 2, (N1[1] + N2[1]) / 2, '7', dy=16)
pl.text((Pp[0] + T[0]) / 2, (Pp[1] + T[1]) / 2, '3x', dy=-8, var=True); pl.text(2.3, -1.7, 'NOT TO SCALE', anchor='end', size=11)
P.M('q02', "From a point \\(P\\) outside a circle, a secant and a tangent to the circle are drawn, as shown." + pl.svg() + "Which equation is satisfied by \\(x\\)?",
    M('9x^2 = x(x + 7)'), [M('9x^2 = 7x'), M('9x^2 = 7 + x'), M('9x^2 = 7(x + 7)')],
    "The square of the tangent equals the product of the whole secant and its outside part: \\((3x)^2 = x \\times (x + 7)\\). The whole secant is \\(x + 7\\), not just the chord inside the circle.")

# Q3 derivative of inverse tan
assert simplify(diff(atan(x / 3), x) - 3 / (9 + x**2)) == 0
P.M('q03', "What is the derivative of \\(\\tan^{-1}\\dfrac{x}{3}\\)?", M('\\dfrac{3}{9 + x^2}'), [M('\\dfrac{1}{3(9 + x^2)}'), M('\\dfrac{1}{9 + x^2}'), M('\\dfrac{9}{9 + x^2}')],
    "\\(\\frac{d}{dx}\\tan^{-1}\\frac{x}{a} = \\frac{a}{a^2 + x^2}\\). With \\(a = 3\\): \\(\\frac{3}{9 + x^2}\\). (By the chain rule: \\(\\frac{1}{1 + x^2/9} \\times \\frac{1}{3}\\).)")

# Q4 identify a rational function from its graph
g4 = lambda X: X * X / (X * X - 4)
assert g4(0) == 0 and abs(g4(100) - 1) < 1e-3 and g4(1) < 0 and g4(3) > 0
pl = Plot(-6, 6, -4.2, 4.2, w=320)
for v in (-2, 2): pl.line(v, -4.2, v, 4.2, dash='4 4', colour=GREY, width=1)
pl.line(-6, 1, 6, 1, dash='4 4', colour=GREY, width=1); pl.axes(xt=[-2, 2], yt=[1])
for lo, hi in [(-6, -2.03), (-1.97, 1.97), (2.03, 6)]: pl.curve(g4, lo, hi)
P.M('q04', "The diagram shows the graph of \\(y = f(x)\\)." + pl.svg() + "Which equation best describes the graph?",
    M('y = \\dfrac{x^2}{x^2 - 4}'), [M('y = \\dfrac{x}{x^2 - 4}'), M('y = \\dfrac{x}{4 - x^2}'), M('y = \\dfrac{x^2}{4 - x^2}')],
    "The graph is symmetric about the \\(y\\)-axis (even), so the top is \\(x^2\\). It approaches \\(y = 1\\) for large \\(x\\), which needs the same leading coefficients top and bottom, and between \\(\\pm 2\\) it is negative, so the bottom is \\(x^2 - 4\\). (\\(\\frac{x^2}{4 - x^2}\\) would approach \\(y = -1\\).)")

# Q5 SHM equation from start conditions
f5 = lambda T: 3 * math.cos(PI * T / 2); assert f5(0) == 3 and abs(f5(4) - 3) < 1e-12 and abs(-3 * PI / 2 * math.sin(0)) == 0
P.M('q05', "A particle starts from rest, 3 metres to the right of the origin, and moves along the \\(x\\)-axis in simple harmonic motion with a period of 4 seconds. Which equation could represent the motion of the particle?",
    M('x = 3\\cos\\frac{\\pi t}{2}'), [M('x = 3\\cos 4t'), M('x = 3 + 3\\sin\\frac{\\pi t}{2}'), M('x = 3 + 3\\sin 4t')],
    "Starting from rest at \\(x = 3\\) means 3 is an end point: \\(x = 3\\cos nt\\) has \\(x = 3\\) and \\(\\dot{x} = 0\\) at \\(t = 0\\). The period is \\(\\frac{2\\pi}{n} = 4\\), so \\(n = \\frac{\\pi}{2}\\). (\\(\\cos 4t\\) has period \\(\\frac{\\pi}{2}\\), not 4.)")

# Q6 double angle with a quadrant
xv = PI - math.acos(1 / 3); assert abs(math.cos(xv) + 1 / 3) < 1e-12 and abs(math.sin(2 * xv) + 4 * math.sqrt(2) / 9) < 1e-12
P.M('q06', "It is given that \\(\\cos x = -\\dfrac{1}{3}\\), where \\(\\dfrac{\\pi}{2} < x < \\pi\\). What is the value of \\(\\sin 2x\\)?",
    M('-\\dfrac{4\\sqrt{2}}{9}'), [M('\\dfrac{4\\sqrt{2}}{9}'), M('-\\dfrac{7}{9}'), M('\\dfrac{7}{9}')],
    "In the second quadrant \\(\\sin x > 0\\): \\(\\sin x = \\sqrt{1 - \\frac{1}{9}} = \\frac{2\\sqrt{2}}{3}\\). So \\(\\sin 2x = 2\\sin x\\cos x = 2 \\times \\frac{2\\sqrt{2}}{3} \\times \\left(-\\frac{1}{3}\\right) = -\\frac{4\\sqrt{2}}{9}\\). (\\(-\\frac{7}{9}\\) is \\(\\cos 2x\\).)")

# Q7 reciprocal roots of an anti-palindromic cubic
for qv, rv in [(2, 5), (-3, 1), (1, -7)]:
    rts = np.roots([qv, rv, -rv, -qv])
    for r in rts:
        if abs(r - 1) > 1e-6: assert any(abs(1 / r - s) < 1e-6 for s in rts)
P.M('q07', "Let \\(P(x) = qx^3 + rx^2 - rx - q\\), where \\(q\\) and \\(r\\) are constants and \\(q \\ne 0\\). One of the zeros of \\(P(x)\\) is 1. Given that \\(\\alpha\\) is a zero of \\(P(x)\\) and \\(\\alpha \\ne 1\\), which of the following is also a zero?",
    M('\\dfrac{1}{\\alpha}'), [M('-\\dfrac{1}{\\alpha}'), M('-\\dfrac{q}{\\alpha}'), M('\\dfrac{q}{\\alpha}')],
    "The product of the roots is \\(-\\frac{-q}{q} = 1\\). One root is 1, so the other two multiply to 1: the third root is \\(\\frac{1}{\\alpha}\\). (Check: \\(x^3P\\left(\\frac{1}{x}\\right) = -P(x)\\), so \\(\\frac{1}{\\alpha}\\) is a root whenever \\(\\alpha\\) is.)")

# Q8 arrangements with a block and repeats
word = 'COMMITTEE'
cnt = sum(1 for p in set(itertools.permutations(word)) if 'TT' in ''.join(p)); assert cnt == math.factorial(8) // 4
P.M('q08', "In how many ways can all the letters of the word COMMITTEE be placed in a line with the two Ts next to each other?",
    M('\\dfrac{8!}{2!\\,2!}'), [M('\\dfrac{8!}{2!\\,2!\\,2!}'), M('\\dfrac{9!}{2!\\,2!}'), M('\\dfrac{9!}{2!\\,2!\\,2!}')],
    "Glue the two Ts into one block: that leaves 8 items, C, O, M, M, I, TT, E, E, with M and E each repeated twice: \\(\\frac{8!}{2!\\,2!}\\). The Ts inside the block are identical, so there is no extra \\(2!\\) for swapping them.")

# Q9 graph of inverse sine of cos x on [0, pi]
assert all(abs(math.asin(math.cos(v)) - (PI / 2 - v)) < 1e-12 for v in [0, 0.4, 1.5, 2.7, PI])
def g9(f_, line=False):
    pl = Plot(-0.6, 3.8, -2.0, 2.0, w=220); pl.axes(xt=[PI], xtl=['π'], yt=[PI / 2, -PI / 2], ytl=['π⁄2', '−π⁄2'])
    pl.curve(f_, 0, PI, width=2); pl.dot(0, f_(0), 3); pl.dot(PI, f_(PI), 3); return pl.svg()
P.M('q09', "Which graph best represents \\(y = \\sin^{-1}(\\cos x)\\), for \\(0 \\le x \\le \\pi\\)?",
    g9(lambda X: PI / 2 - X), [g9(lambda X: PI / 2 * math.cos(X)), g9(lambda X: X - PI / 2), g9(lambda X: -PI / 2 * math.cos(X))],
    "\\(\\cos x = \\sin\\left(\\frac{\\pi}{2} - x\\right)\\), and for \\(0 \\le x \\le \\pi\\), \\(\\frac{\\pi}{2} - x\\) lies in \\(\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]\\), the range of \\(\\sin^{-1}\\). So \\(y = \\frac{\\pi}{2} - x\\): a straight line from \\(\\left(0, \\frac{\\pi}{2}\\right)\\) down to \\(\\left(\\pi, -\\frac{\\pi}{2}\\right)\\).")

# Q10 how many meeting points of f and its inverse
f10 = lambda X: -math.sqrt(2 + math.sqrt(2 + X)); g10 = lambda X: X**4 - 4 * X**2 + 2
assert all(abs(g10(f10(v)) - v) < 1e-9 for v in [-2, -1, 0, 3])
grid = [-2 + i * (2 - math.sqrt(2)) / 200000 for i in range(200001)]
sg = [f10(v) - g10(v) for v in grid]; assert sum(1 for i in range(200000) if sg[i] * sg[i + 1] <= 0) == 1
pl = Plot(-2.4, 2.4, -2.6, 3.0, w=300); pl.axes(xt=[-1, 1], yt=[-2, 2]); pl.curve(g10, -2.4, 2.4)
P.M('q10', "The function \\(f(x) = -\\sqrt{2 + \\sqrt{2 + x}}\\) has inverse \\(f^{-1}(x)\\). The graph of \\(y = f^{-1}(x)\\) forms part of the curve \\(y = x^4 - 4x^2 + 2\\), which is shown below." + pl.svg() + "How many points do the graphs of \\(y = f(x)\\) and \\(y = f^{-1}(x)\\) have in common?",
    M('1'), [M('2'), M('3'), M('4')],
    "\\(f\\) has domain \\(x \\ge -2\\) and range \\(y \\le -\\sqrt{2}\\), so \\(f^{-1}\\) is only the part of the quartic with \\(x \\le -\\sqrt{2}\\) (the left-hand arm, rising from \\((-\\sqrt{2}, -2)\\)). Both graphs only exist for \\(-2 \\le x \\le -\\sqrt{2}\\), and there \\(f\\) is decreasing and \\(f^{-1}\\) is decreasing; they meet once, on the line \\(y = x\\) (at \\(x = -\\frac{1 + \\sqrt{5}}{2}\\)). The other crossings on the diagram belong to the rest of the quartic, which is not \\(f^{-1}\\).")

# Q11(a)
m1, m2 = Q(1, 3), 2; assert abs((m2 - m1) / (1 + m1 * m2)) == 1
P.W('q11a', 2, "Find the acute angle between the lines \\(x - 3y + 2 = 0\\) and \\(y = 2x + 1\\).",
    ["The gradients are \\(m_1 = \\frac{1}{3}\\) and \\(m_2 = 2\\).", "\\(\\tan\\theta = \\left|\\dfrac{m_2 - m_1}{1 + m_1m_2}\\right| = \\left|\\dfrac{2 - \\frac{1}{3}}{1 + \\frac{2}{3}}\\right| = 1\\), so \\(\\theta = 45^\\circ\\)."],
    [("Correct answer", 2), ("Correct gradients substituted into the formula", 1)])

# Q11(b)
assert sp.solve_univariate_inequality(x / (x - 2) < 3, x, relational=False) == sp.Union(sp.Interval.open(-sp.oo, 2), sp.Interval.open(3, sp.oo))
P.W('q11b', 3, "For what values of \\(x\\) is \\(\\dfrac{x}{x - 2} < 3\\)?",
    ["Multiply both sides by \\((x - 2)^2 > 0\\): \\(x(x - 2) < 3(x - 2)^2\\), \\(x \\ne 2\\).", "\\(0 < 3(x - 2)^2 - x(x - 2) = (x - 2)(3x - 6 - x) = (x - 2)(2x - 6)\\)", "So \\((x - 2)(x - 3) > 0\\): \\(x < 2\\) or \\(x > 3\\)."],
    [("Correct solution", 3), ("Correct critical values with one error in the final regions", 2), ("Multiplies by \\((x - 2)^2\\), or finds a correct critical value", 1)])

# Q11(c) circle geometry proof
pl = Plot(-1.6, 2.4, -1.55, 1.45, w=330)
circle(pl, 0, 0, 1.2)
Pq, Qq = (1.2 * math.cos(2.7), 1.2 * math.sin(2.7)), (1.2 * math.cos(2.7 - math.pi), 1.2 * math.sin(2.7 - math.pi))
R_ = (0.0, -1.2); S_ = (Qq[0], -1.2)
assert abs((R_[0] - Pq[0]) * (R_[0] - Qq[0]) + (R_[1] - Pq[1]) * (R_[1] - Qq[1])) < 1e-9   # angle in a semicircle
pl.line(-1.5, -1.2, 2.2, -1.2, width=1.3)
for A_, B_ in [(Pq, Qq), (Pq, R_), (R_, Qq), (Qq, S_)]: pl.line(A_[0], A_[1], B_[0], B_[1], width=1.3)
pl.raw('<path d="M%s,%sv-10h-10" fill="none" stroke="%s"/>' % (pl.X(S_[0]), pl.Y(S_[1]), INK)); pl.dot(0, 0, 2.5)
for q_, lab, dx_, dy_ in [(Pq, 'P', -10, 0), (Qq, 'Q', 10, 4), (R_, 'R', 0, 18), (S_, 'S', 0, 18), ((0, 0), 'O', 0, -8)]: pl.text(q_[0], q_[1], lab, dx=dx_, dy=dy_, var=True)
pl.text(2.3, 1.2, 'NOT TO SCALE', anchor='end', size=11)
P.W('q11c', 3, "\\(PQ\\) is a diameter of a circle with centre \\(O\\). The line \\(RS\\) is the tangent to the circle at \\(R\\), and \\(QS\\) is perpendicular to \\(RS\\), as shown." + pl.svg() + "Prove that \\(\\angle PQR = \\angle RQS\\).",
    ["\\(\\angle PRQ = 90^\\circ\\) (angle in a semicircle), so in triangle \\(PQR\\), \\(\\angle PQR = 90^\\circ - \\angle QPR\\) (angle sum of a triangle).",
     "\\(\\angle QRS = \\angle QPR\\) (angle between a tangent and a chord equals the angle in the alternate segment).",
     "In triangle \\(QRS\\), \\(\\angle QSR = 90^\\circ\\), so \\(\\angle RQS = 90^\\circ - \\angle QRS = 90^\\circ - \\angle QPR\\).", "So \\(\\angle PQR = \\angle RQS\\)."],
    [("Correct proof with reasons", 3), ("Uses two correct facts with reasons", 2), ("One correct fact with a reason, e.g. the angle in a semicircle", 1)])

# Q11(d)
assert sp.expand((x - 1) * (x**2 - 2 * x + 2) + 3 - (x**3 - 3 * x**2 + 4 * x + 1)) == 0
P.W('q11d', 2, "Find the polynomial \\(Q(x)\\) that satisfies \\(x^3 - 3x^2 + 4x + 1 = (x - 1)Q(x) + 3\\).",
    ["\\((x - 1)Q(x) = x^3 - 3x^2 + 4x - 2\\)", "Dividing by \\(x - 1\\): \\(Q(x) = x^2 - 2x + 2\\). (Check: \\((x - 1)(x^2 - 2x + 2) = x^3 - 3x^2 + 4x - 2\\).)"],
    [("Correct polynomial", 2), ("Subtracts the remainder and attempts the division", 1)])

# Q11(e)
F = x + sin(6 * x) / 6; assert simplify(diff(F, x) - 2 * cos(3 * x)**2) == 0
P.W('q11e', 2, "Find \\(\\displaystyle\\int 2\\cos^2 3x\\,dx\\).",
    ["\\(2\\cos^2 3x = 1 + \\cos 6x\\)", "\\(\\displaystyle\\int (1 + \\cos 6x)\\,dx = x + \\frac{1}{6}\\sin 6x + C\\)"],
    [("Correct primitive", 2), ("Uses \\(2\\cos^2 A = 1 + \\cos 2A\\)", 1)])

# Q11(f) binomial
p0 = 0.96**10; p1 = 10 * 0.04 * 0.96**9; assert round(p0, 4) == 0.6648 and round(1 - p0 - p1, 4) == 0.0582
P.W('q11f', 3, "Winning codes are printed under 4% of drink bottle caps. The drinks are packed randomly into packs of 10.<br>(i) What is the probability that a pack contains no winning codes? <b>1</b><br>(ii) What is the probability that a pack contains at least 2 winning codes? <b>2</b>",
    ["(i) \\(P(X = 0) = 0.96^{10} \\approx 0.6648\\)", "(ii) \\(P(X \\ge 2) = 1 - P(X = 0) - P(X = 1) = 1 - 0.96^{10} - \\binom{10}{1}(0.04)(0.96)^9\\)", "\\(\\approx 1 - 0.6648 - 0.2770 = 0.0582\\)"],
    [("Both parts correct", 3), ("Part (i), and a correct expression in (ii)", 2), ("Part (i) correct, or \\(P(X = 1)\\) correct", 1)])

# Q12(a) related rates
B0 = 2; dAdt = -16 / B0**2 * 0.4; assert 16 / B0 == 8 and abs(dAdt + 1.6) < 1e-12
P.W('q12a', 3, "Distance \\(A\\) is inversely proportional to distance \\(B\\), with \\(A = \\dfrac{16}{B}\\), where \\(A\\) and \\(B\\) are in metres. Both distances change with time, and \\(B\\) is increasing at a rate of 0.4 m s⁻¹. What is the value of \\(\\dfrac{dA}{dt}\\) when \\(A = 8\\)?",
    ["When \\(A = 8\\), \\(B = \\frac{16}{8} = 2\\).", "\\(\\dfrac{dA}{dt} = \\dfrac{dA}{dB} \\times \\dfrac{dB}{dt} = -\\dfrac{16}{B^2} \\times 0.4\\)", "\\(= -\\dfrac{16}{4} \\times 0.4 = -1.6\\) m s⁻¹ (\\(A\\) is decreasing)."],
    [("Correct answer", 3), ("Correct chain rule expression and correct \\(B\\)", 2), ("Correct \\(\\frac{dA}{dB}\\), or finds \\(B = 2\\)", 1)])

# Q12(b) SHM in auxiliary form
xt = lambda T: math.sqrt(3) * math.cos(2 * T) + 3 * math.sin(2 * T)
assert all(abs(xt(v) - 2 * math.sqrt(3) * math.cos(2 * v - PI / 3)) < 1e-12 for v in [0, 0.4, 1.9])
vt = lambda T: -4 * math.sqrt(3) * math.sin(2 * T - PI / 3); vmax = 4 * math.sqrt(3)
first = next(i * 1e-6 for i in range(1, 3000000) if abs(vt(i * 1e-6)) <= vmax / 2); assert abs(first - PI / 12) < 1e-5
P.W('q12b', 5, "A particle moves along the \\(x\\)-axis in simple harmonic motion, with position \\(x = \\sqrt{3}\\cos 2t + 3\\sin 2t\\) for \\(t \\ge 0\\).<br>"
    "(i) Write \\(x\\) in the form \\(R\\cos(2t - \\alpha)\\), where \\(R > 0\\) and \\(0 < \\alpha < \\dfrac{\\pi}{2}\\). <b>2</b><br>(ii) Find the two values of \\(x\\) where the particle comes to rest. <b>1</b><br>(iii) When is the first time that the speed of the particle is half of its maximum speed? <b>2</b>",
    ["(i) \\(R\\cos\\alpha = \\sqrt{3}\\) and \\(R\\sin\\alpha = 3\\), so \\(R = \\sqrt{3 + 9} = 2\\sqrt{3}\\) and \\(\\tan\\alpha = \\sqrt{3}\\), \\(\\alpha = \\frac{\\pi}{3}\\): \\(x = 2\\sqrt{3}\\cos\\left(2t - \\frac{\\pi}{3}\\right)\\).",
     "(ii) The particle is at rest at the ends of the motion: \\(x = \\pm 2\\sqrt{3}\\).",
     "(iii) \\(\\dot{x} = -4\\sqrt{3}\\sin\\left(2t - \\frac{\\pi}{3}\\right)\\), maximum speed \\(4\\sqrt{3}\\). Half of it needs \\(\\left|\\sin\\left(2t - \\frac{\\pi}{3}\\right)\\right| = \\frac{1}{2}\\).",
     "At \\(t = 0\\), \\(2t - \\frac{\\pi}{3} = -\\frac{\\pi}{3}\\) and \\(|\\sin| = \\frac{\\sqrt{3}}{2}\\), which is too big; it first drops to \\(\\frac{1}{2}\\) at \\(2t - \\frac{\\pi}{3} = -\\frac{\\pi}{6}\\), so \\(t = \\frac{\\pi}{12}\\) s."],
    [("All parts correct", 5), ("Two parts correct and progress in the third", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct", 1)])

# Q12(c) parabola isosceles
p_ = symbols('p', real=True)
Sx = (0, 3); Pt = (6 * p_, 3 * p_**2); slope = diff(x**2 / 12, x).subs(x, 6 * p_); Ry = Pt[1] - slope * Pt[0]
assert simplify(Ry + 3 * p_**2) == 0 and simplify((Sx[1] - Ry) - (3 * p_**2 + 3)) == 0
assert sp.expand(Pt[0]**2 + (Pt[1] - 3)**2 - (3 * p_**2 + 3)**2) == 0
pl = Plot(-6, 9, -5.2, 9.5, w=320)
pv = 1.2; PP = (6 * pv, 3 * pv * pv); RR = (0, -3 * pv * pv)
pl.line(-6, -3, 9, -3, dash='4 4', colour=GREY, width=1); pl.axes(xt=[], yt=[])
pl.curve(lambda X: X * X / 12, -6, 9); pl.line(RR[0] - 0.6, RR[1] - 0.6 * pv, 8.8, pv * 8.8 - 3 * pv * pv, width=1.3)
pl.line(PP[0], PP[1], PP[0], -3, width=1.1); pl.line(0, 3, PP[0], PP[1], width=1.1)
for q_, lab, dx_, dy_, anc in [((0, 3), 'S(0, 3)', -8, 4, 'end'), (PP, 'P(6p, 3p²)', 8, 4, 'start'), (RR, 'R', -8, 4, 'end'), ((PP[0], -3), 'M', 6, 16, 'start')]: pl.dot(q_[0], q_[1], 3); pl.text(q_[0], q_[1], lab, dx=dx_, dy=dy_, anchor=anc, var=True, size=13)
pl.text(-5.8, -3, 'y = −3', dy=-6, anchor='start', var=True, size=12); pl.text(-4.6, 5.6, 'x² = 12y', anchor='start', var=True, size=13)
P.W('q12c', 3, "The point \\(P(6p, 3p^2)\\) lies on the parabola \\(x^2 = 12y\\), which has focus \\(S(0, 3)\\) and directrix \\(y = -3\\). The vertical line through \\(P\\) meets the directrix at \\(M\\), and the tangent at \\(P\\) meets the \\(y\\)-axis at \\(R\\)." + pl.svg() + "Show that \\(\\angle SPR = \\angle SRP\\).",
    ["\\(y = \\frac{x^2}{12}\\), \\(\\frac{dy}{dx} = \\frac{x}{6} = p\\) at \\(P\\). Tangent: \\(y - 3p^2 = p(x - 6p)\\), that is \\(y = px - 3p^2\\), so \\(R = (0, -3p^2)\\).",
     "\\(SR = 3 - (-3p^2) = 3p^2 + 3\\).", "By the focus-directrix property, \\(SP = PM = 3p^2 - (-3) = 3p^2 + 3\\).", "So \\(SP = SR\\), triangle \\(SPR\\) is isosceles, and the angles opposite the equal sides are equal: \\(\\angle SPR = \\angle SRP\\)."],
    [("Correct proof", 3), ("Finds \\(R\\) and one of \\(SR\\) or \\(SP\\)", 2), ("Correct equation of the tangent, or \\(SP = PM\\)", 1)])

# Q12(d) cooling
k12 = math.log(6 / 7) / 10; rate = k12 * 21 * math.exp(k12 * 30); assert abs(4 + 21 * math.exp(10 * k12) - 22) < 1e-9 and round(rate, 2) == -0.2
P.W('q12d', 4, "A fridge holds a constant temperature of 4°C. A carton of juice at 25°C is put in the fridge, and after 10 minutes it is at 22°C. The temperature \\(T\\) of the juice \\(t\\) minutes after it goes in is modelled by \\(\\dfrac{dT}{dt} = k(T - 4)\\), where \\(k\\) is a constant.<br>"
    "(i) Show that \\(T = 4 + Ae^{kt}\\), where \\(A\\) is a constant, satisfies \\(\\dfrac{dT}{dt} = k(T - 4)\\). <b>1</b><br>(ii) At what rate is the temperature of the juice changing after 30 minutes? <b>3</b>",
    ["(i) \\(\\dfrac{dT}{dt} = kAe^{kt} = k\\left(T - 4\\right)\\), since \\(Ae^{kt} = T - 4\\).", "(ii) \\(t = 0\\): \\(25 = 4 + A\\), so \\(A = 21\\). \\(t = 10\\): \\(22 = 4 + 21e^{10k}\\), so \\(e^{10k} = \\frac{6}{7}\\) and \\(k = \\frac{1}{10}\\ln\\frac{6}{7} \\approx -0.0154\\).",
     "\\(\\dfrac{dT}{dt} = 21ke^{30k} = 21k\\left(\\frac{6}{7}\\right)^3 \\approx -0.20\\)", "The temperature is falling at about 0.20°C per minute."],
    [("Both parts correct", 4), ("Part (i), and correct \\(A\\) and \\(k\\)", 3), ("Part (i), and correct \\(A\\) or \\(k\\)", 2), ("Part (i) correct, or correct \\(A\\)", 1)])

# Q13(a) substitution
I13 = sp.integrate(sin(2 * x) / (3 + cos(x)**2), (x, 0, pi / 3)); assert abs(float(I13) - math.log(16 / 13)) < 1e-12
P.W('q13a', 3, "Use the substitution \\(u = \\cos^2 x\\) to evaluate \\(\\displaystyle\\int_0^{\\frac{\\pi}{3}} \\frac{\\sin 2x}{3 + \\cos^2 x}\\,dx\\).",
    ["\\(du = -2\\cos x\\sin x\\,dx = -\\sin 2x\\,dx\\). \\(x = 0 \\Rightarrow u = 1\\); \\(x = \\frac{\\pi}{3} \\Rightarrow u = \\frac{1}{4}\\).", "\\(\\displaystyle\\int_0^{\\frac{\\pi}{3}} \\frac{\\sin 2x}{3 + \\cos^2 x}\\,dx = \\int_1^{\\frac{1}{4}} \\frac{-du}{3 + u} = \\int_{\\frac{1}{4}}^{1} \\frac{du}{3 + u} = \\left[\\ln(3 + u)\\right]_{\\frac{1}{4}}^{1}\\)",
     "\\(= \\ln 4 - \\ln\\frac{13}{4} = \\ln\\frac{16}{13}\\)"],
    [("Correct exact value", 3), ("Correct integral in \\(u\\) with correct limits", 2), ("Correct \\(du\\), or correct limits", 1)])

# Q13(b) equal consecutive coefficients
co = [math.comb(19, k) * 2**k * 3**(19 - k) for k in range(20)]; assert [k for k in range(19) if co[k] == co[k + 1]] == [7]
P.W('q13b', 3, "In the expansion of \\((2x + 3)^{19}\\), the coefficients of \\(x^k\\) and \\(x^{k+1}\\) are equal. What is the value of \\(k\\)?",
    ["The coefficient of \\(x^k\\) is \\(\\binom{19}{k}2^k3^{19-k}\\).", "\\(\\binom{19}{k}2^k3^{19-k} = \\binom{19}{k+1}2^{k+1}3^{18-k}\\) gives \\(3 \\times \\dfrac{19!}{k!(19 - k)!} = 2 \\times \\dfrac{19!}{(k + 1)!(18 - k)!}\\)", "So \\(3(k + 1) = 2(19 - k)\\), \\(5k = 35\\) and \\(k = 7\\)."],
    [("Correct value", 3), ("Correct equation simplified to a linear equation in \\(k\\)", 2), ("Correct general coefficient, or sets two coefficients equal", 1)])

# Q13(c) motion from acceleration in x
vv = lambda X: 3 * math.exp(-X); assert abs(0.5 * 9 * math.exp(-2 * 0.7) * (-2) - (-9 * math.exp(-1.4))) < 1e-12
xt2 = lambda T: math.log(3 * T + 1); assert abs((xt2(1.0001) - xt2(1)) / 1e-4 - vv(xt2(1))) < 1e-3 and xt2(0) == 0
P.W('q13c', 4, "A particle moves in a straight line. At time \\(t\\) seconds it has displacement \\(x\\) m, velocity \\(v\\) m s⁻¹ and acceleration \\(a\\) m s⁻². Initially its displacement is 0 m and its velocity is 3 m s⁻¹. The acceleration is \\(a = -9e^{-2x}\\), and the velocity is always positive.<br>"
    "(i) Show that \\(v = 3e^{-x}\\). <b>2</b><br>(ii) Find an expression for \\(x\\) as a function of \\(t\\). <b>2</b>",
    ["(i) \\(\\dfrac{d}{dx}\\left(\\frac{1}{2}v^2\\right) = -9e^{-2x}\\), so \\(\\frac{1}{2}v^2 = \\frac{9}{2}e^{-2x} + C\\). At \\(x = 0\\), \\(v = 3\\): \\(\\frac{9}{2} = \\frac{9}{2} + C\\), so \\(C = 0\\).",
     "\\(v^2 = 9e^{-2x}\\), and \\(v > 0\\), so \\(v = 3e^{-x}\\).",
     "(ii) \\(\\dfrac{dx}{dt} = 3e^{-x}\\), so \\(\\displaystyle\\int e^x\\,dx = \\int 3\\,dt\\) and \\(e^x = 3t + C\\). At \\(t = 0\\), \\(x = 0\\): \\(C = 1\\).", "\\(x = \\ln(3t + 1)\\)"],
    [("Both parts correct", 4), ("Part (i), and correct integration in (ii)", 3), ("Part (i) correct, or part (ii) correct", 2), ("Uses \\(a = \\frac{d}{dx}\\left(\\frac{1}{2}v^2\\right)\\), or separates \\(\\frac{dx}{dt} = 3e^{-x}\\)", 1)])

# Q13(d) projectile onto a slope
tA = 3 + 3 * math.sqrt(3); xA = 15 * math.sqrt(3) * tA; assert abs(15 * tA - 5 * tA**2 + xA) < 1e-9
OA = math.sqrt(2) * xA; assert abs(OA - (135 * math.sqrt(2) + 45 * math.sqrt(6))) < 1e-9
vy = 15 - 10 * tA; vx = 15 * math.sqrt(3); beta = math.degrees(math.atan(-vy / vx)); ang = beta - 45; assert abs(round(ang, 1) - 23.8) < 0.05
pl = Plot(-1.5, 9, -9, 3.4, w=330)
pl.line(-1.5, 1.5, 9, -9, width=1.3); pl.axes(xt=[], yt=[])
sc = 9 / xA; pl.curve(lambda X: (lambda T: (15 * T - 5 * T * T) * sc)(X / (15 * math.sqrt(3) * sc)), 0, xA * sc, width=1.8)
pl.line(0, 0, 1.6, 1.6 / math.sqrt(3), width=1.5, arrow=True); pl.dot(xA * sc, -xA * sc, 3)
pl.text(xA * sc, -xA * sc, 'A', dx=-10, dy=4, anchor='end', var=True)
pl.raw('<path d="M%s,%sA28,28 0 0 1 %s,%s" fill="none" stroke="%s"/>' % (pl.X(0) + 28, pl.Y(0), round(pl.X(0) + 28 * math.cos(PI / 4), 1), round(pl.Y(0) + 28 * math.sin(PI / 4), 1), INK)); pl.text(0, 0, '45°', dx=36, dy=20, anchor='start', size=12)
P.W('q13d', 5, "The point \\(O\\) is on a plane sloping down at \\(45^\\circ\\) to the horizontal. A particle is projected from \\(O\\) and lands at a point \\(A\\) on the slope, as shown. The line \\(OA\\) has equation \\(y = -x\\), and the equations of motion of the particle are \\(x = 15\\sqrt{3}\\,t\\) and \\(y = 15t - 5t^2\\), where \\(t\\) is the time in seconds after projection (do NOT prove these)." + pl.svg() +
    "(i) Find the distance \\(OA\\). <b>2</b><br>(ii) What is the size of the acute angle that the path of the particle makes with the slope as it hits \\(A\\)? <b>3</b>",
    ["(i) On the slope \\(y = -x\\): \\(15t - 5t^2 = -15\\sqrt{3}\\,t\\), so (with \\(t > 0\\)) \\(5t = 15 + 15\\sqrt{3}\\), \\(t = 3 + 3\\sqrt{3}\\).", "Then \\(x = 15\\sqrt{3}(3 + 3\\sqrt{3}) = 45\\sqrt{3} + 135\\), and \\(OA = \\sqrt{2}\\,x = 135\\sqrt{2} + 45\\sqrt{6} \\approx 301\\) m.",
     "(ii) At \\(A\\): \\(\\dot{x} = 15\\sqrt{3}\\) and \\(\\dot{y} = 15 - 10t = -15 - 30\\sqrt{3}\\).", "The path is at an angle \\(\\beta\\) below the horizontal with \\(\\tan\\beta = \\dfrac{15 + 30\\sqrt{3}}{15\\sqrt{3}} = \\dfrac{1}{\\sqrt{3}} + 2\\), so \\(\\beta \\approx 68.8^\\circ\\).",
     "The slope is \\(45^\\circ\\) below the horizontal, so the angle between the path and the slope is about \\(68.8^\\circ - 45^\\circ = 23.8^\\circ\\)."],
    [("Both parts correct", 5), ("Part (i), and the angle of the path below the horizontal", 4), ("Part (i), and the velocity components at \\(A\\)", 3), ("Part (i) correct, or the time of landing and the velocity components", 2), ("Correct time of landing", 1)])

# Q14(a) induction with factorials
for N in range(1, 15): assert sum(Q(k, math.factorial(k + 1)) for k in range(1, N + 1)) == 1 - Q(1, math.factorial(N + 1))
P.W('q14a', 3, "Prove by mathematical induction that, for all integers \\(n \\ge 1\\),<br>\\(\\dfrac{1}{2!} + \\dfrac{2}{3!} + \\dfrac{3}{4!} + \\cdots + \\dfrac{n}{(n + 1)!} = 1 - \\dfrac{1}{(n + 1)!}\\).",
    ["<b>Step 1.</b> \\(n = 1\\): LHS \\(= \\frac{1}{2}\\), RHS \\(= 1 - \\frac{1}{2} = \\frac{1}{2}\\). True.", "<b>Step 2.</b> Assume true for \\(n = k\\): \\(\\displaystyle\\sum_{r=1}^{k} \\frac{r}{(r + 1)!} = 1 - \\frac{1}{(k + 1)!}\\).",
     "<b>Step 3.</b> For \\(n = k + 1\\): LHS \\(= 1 - \\dfrac{1}{(k + 1)!} + \\dfrac{k + 1}{(k + 2)!} = 1 - \\dfrac{(k + 2) - (k + 1)}{(k + 2)!} = 1 - \\dfrac{1}{(k + 2)!}\\), the RHS for \\(n = k + 1\\).",
     "So if true for \\(n = k\\), it is true for \\(n = k + 1\\); since true for \\(n = 1\\), by induction it is true for all \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves \\(n = 1\\) and makes significant progress in the inductive step", 2), ("Proves \\(n = 1\\), or correctly adds the \\((k + 1)\\)th term", 1)])

# Q14(b) Newton's method bracket
for kv in [0.6, 1, 1.7, 3]:
    f14 = lambda X: X**3 - kv * X**2 - 2
    rts = [r for r in np.roots([1, -kv, 0, -2]) if abs(r.imag) < 1e-9]; assert len(rts) == 1
    al = rts[0].real; x2 = kv + 2 / kv**2; assert kv < al < x2 and f14(kv) < 0 < f14(x2)
    assert abs((kv - f14(kv) / (3 * kv**2 - 2 * kv * kv)) - x2) < 1e-12
kpos = 1.6
pl = Plot(-2.6, 4.6, -4.2, 6.5, w=320); pl.line(kpos, -4.2, kpos, 6.5, dash='4 4', colour=GREY, width=1); pl.axes(xt=[kpos], xtl=['k'], yt=[])
pl.curve(lambda X: 2 / (X - kpos), -2.6, kpos - 0.05); pl.curve(lambda X: 2 / (X - kpos), kpos + 0.05, 4.6)
P.W('q14b', 7, "The diagram shows the graph of \\(y = \\dfrac{2}{x - k}\\), where \\(k\\) is a positive real number." + pl.svg() +
    "(i) By considering the graphs of \\(y = x^2\\) and \\(y = \\dfrac{2}{x - k}\\), explain why the function \\(f(x) = x^3 - kx^2 - 2\\) has exactly one real zero. <b>2</b><br>"
    "Let this zero be \\(\\alpha\\), and let \\(x_1 = k\\) be a first approximation to \\(\\alpha\\).<br>(ii) Show that one application of Newton's method gives a second approximation \\(x_2 = k + \\dfrac{2}{k^2}\\). <b>2</b><br>(iii) Show that \\(x_1 < \\alpha < x_2\\). <b>3</b>",
    ["(i) \\(f(x) = 0\\) means \\(x^2(x - k) = 2\\), that is \\(x^2 = \\frac{2}{x - k}\\) (\\(x \\ne k\\)). For \\(x < k\\), \\(\\frac{2}{x - k} < 0 \\le x^2\\), so there is no meeting point. For \\(x > k\\), \\(x^2\\) increases from \\(k^2\\) while \\(\\frac{2}{x - k}\\) decreases from \\(\\infty\\) to 0, so they cross exactly once. So \\(f\\) has exactly one real zero, and it is greater than \\(k\\).",
     "(ii) \\(f(k) = k^3 - k^3 - 2 = -2\\) and \\(f'(x) = 3x^2 - 2kx\\), so \\(f'(k) = k^2\\). \\(x_2 = k - \\dfrac{-2}{k^2} = k + \\dfrac{2}{k^2}\\).",
     "(iii) \\(f(x_1) = -2 < 0\\).", "\\(f(x_2) = x_2^2(x_2 - k) - 2 = \\left(k + \\frac{2}{k^2}\\right)^2 \\times \\frac{2}{k^2} - 2 = 2\\left[\\left(1 + \\frac{2}{k^3}\\right)^2 - 1\\right] > 0\\).",
     "\\(f\\) is continuous, so it has a zero between \\(x_1\\) and \\(x_2\\). Since \\(\\alpha\\) is the only zero, \\(x_1 < \\alpha < x_2\\)."],
    [("All parts correct", 7), ("Two parts correct and significant progress in the third", 6), ("Two parts correct", 5), ("One part correct and progress in another", 4), ("One part correct", 3), ("Progress in two parts", 2), ("Progress in one part", 1)])

# Q14(c) common tangent of two cosine curves
al = 1.2; x0 = (PI + al) / 2; kk = 2 * math.sin(al / 2)
c1 = math.cos; c2 = lambda X: math.cos(X - al) - kk
assert abs(c1(x0) - c2(x0)) < 1e-12 and abs(-math.sin(x0) + math.sin(x0 - al)) < 1e-12 and PI / 2 < x0 < PI
pl = Plot(-4.6, 7.4, -3.4, 1.7, w=420); pl.axes(xt=[], yt=[]); pl.curve(c1, -4.6, 7.4); pl.curve(c2, -4.6, 7.4)
pl.line(x0, 0, x0, c1(x0), dash='3 3', colour=GREY, width=1); pl.text(x0, 0, 'x₀', dy=-6, var=True, size=13)
pl.text(-3.0, 1.3, 'y = cos x', var=True, size=13); pl.text(5.2, -3.0, 'y = cos(x − α) − k', var=True, size=13)
P.W('q14c', 5, "The diagram shows the curves \\(y = \\cos x\\) and \\(y = \\cos(x - \\alpha) - k\\), where \\(0 < \\alpha < \\pi\\) and \\(k > 0\\). The two curves have a common tangent at \\(x_0\\), where \\(\\dfrac{\\pi}{2} < x_0 < \\pi\\)." + pl.svg() +
    "(i) Explain why \\(\\sin x_0 = \\sin(x_0 - \\alpha)\\). <b>1</b><br>(ii) Show that \\(\\cos x_0 = -\\cos(x_0 - \\alpha)\\). <b>2</b><br>(iii) Hence, or otherwise, find \\(k\\) in terms of \\(\\alpha\\). <b>2</b>",
    ["(i) A common tangent means equal gradients at \\(x_0\\): \\(-\\sin x_0 = -\\sin(x_0 - \\alpha)\\).",
     "(ii) \\(\\sin x_0 = \\sin(x_0 - \\alpha)\\) with \\(x_0 - \\alpha \\ne x_0\\), so \\(x_0 - \\alpha = \\pi - x_0\\) (the angles are supplementary; \\(-\\pi < x_0 - \\alpha < \\pi\\) rules out other options). Then \\(\\cos(x_0 - \\alpha) = \\cos(\\pi - x_0) = -\\cos x_0\\).",
     "(iii) The curves also meet at \\(x_0\\): \\(\\cos x_0 = \\cos(x_0 - \\alpha) - k\\), so \\(k = \\cos(x_0 - \\alpha) - \\cos x_0 = -2\\cos x_0\\).", "From (ii), \\(x_0 = \\frac{\\pi + \\alpha}{2}\\), so \\(k = -2\\cos\\left(\\frac{\\pi}{2} + \\frac{\\alpha}{2}\\right) = 2\\sin\\frac{\\alpha}{2}\\)."],
    [("All parts correct", 5), ("Two parts correct and progress in the third", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct", 1)])

P.save()
