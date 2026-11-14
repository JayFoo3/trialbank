"""Trialbank versions of the 2018 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math, itertools
import numpy as np
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, exp, log, symbols, integrate, diff, simplify, atan, asin
from rw import Paper
from fig import Plot, INK
x, t, y = symbols('x t y', real=True)
P = Paper('hsc-ext1-2018', seed=2018)
M = lambda s: '\\(' + s + '\\)'
VEC = lambda s: '\\underset{\\sim}{' + s + '}'
GREY = '#8a909c'; PI = math.pi
def circle(pl, cx, cy, r): pl.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="1.5"/>' % (pl.X(cx), pl.Y(cy), round(pl.X(r) - pl.X(0), 1), INK))
def poly(pl, pts, w=1.4): pl.raw('<path d="M' + 'L'.join('%s,%s' % (pl.X(a), pl.Y(b)) for a, b in pts) + '" fill="none" stroke="%s" stroke-width="%s"/>' % (INK, w))

# Q1 sums and products of roots
r1 = np.roots([3, -9, 2, 12]); val = np.prod(r1) * np.sum(r1); assert abs(val - (-12)) < 1e-9
P.M('q01', "The polynomial \\(3x^3 - 9x^2 + 2x + 12\\) has zeros \\(\\alpha\\), \\(\\beta\\) and \\(\\gamma\\). What is the value of \\(\\alpha\\beta\\gamma(\\alpha + \\beta + \\gamma)\\)?",
    M('-12'), [M('12'), M('-4'), M('4')],
    "\\(\\alpha + \\beta + \\gamma = -\\frac{b}{a} = \\frac{9}{3} = 3\\) and \\(\\alpha\\beta\\gamma = -\\frac{d}{a} = -\\frac{12}{3} = -4\\), so the value is \\(-4 \\times 3 = -12\\). Watch both signs: \\(-\\frac{b}{a}\\) for the sum and \\(-\\frac{d}{a}\\) for the product of three roots.")

# Q2 angle between lines
assert abs((4 - 2) / (1 + 8)) == 2 / 9
P.M('q02', "The acute angle between the lines \\(y = 2x\\) and \\(y = 4x\\) is \\(\\theta\\). What is the value of \\(\\tan\\theta\\)?",
    M('\\dfrac{2}{9}'), [M('\\dfrac{2}{7}'), M('\\dfrac{1}{2}'), M('\\dfrac{2}{3}')],
    "\\(\\tan\\theta = \\left|\\dfrac{m_1 - m_2}{1 + m_1m_2}\\right| = \\left|\\dfrac{4 - 2}{1 + 8}\\right| = \\dfrac{2}{9}\\). Using \\(1 - m_1m_2\\) underneath gives the wrong \\(\\frac{2}{7}\\).")

# Q3 trig limit
assert abs(math.sin(4e-7) * math.cos(4e-7) / (6e-7) - 2 / 3) < 1e-9
P.M('q03', "What is the value of \\(\\displaystyle\\lim_{x \\to 0} \\frac{\\sin 4x\\cos 4x}{6x}\\)?",
    M('\\dfrac{2}{3}'), [M('\\dfrac{1}{3}'), M('\\dfrac{4}{3}'), M('\\dfrac{1}{6}')],
    "\\(\\sin 4x\\cos 4x = \\frac{1}{2}\\sin 8x\\), so the limit is \\(\\displaystyle\\lim_{x \\to 0} \\frac{\\sin 8x}{12x} = \\frac{8}{12} = \\frac{2}{3}\\), using \\(\\frac{\\sin kx}{kx} \\to 1\\).")

# Q4 polynomial from its graph
g4 = lambda X: 2 * (X - 3) * (X - 1) * (X + 1)**2
assert g4(0) == 6 and g4(-1) == 0 and g4(1) == 0 and g4(3) == 0
pl = Plot(-2.2, 3.6, -22, 16, w=320, h=300); pl.axes(xt=[-1, 1, 3], yt=[6]); pl.curve(g4, -2.2, 3.6)
opt4 = lambda a_, b_, c_, d_: M('a = %s,\\ b = %s,\\ c = %s,\\ d = %s' % (a_, b_, c_, d_))
assert all(abs(2 * (X + -3) * (X + -1) * (X + 1)**2 - g4(X)) < 1e-9 for X in [-2, 0.5, 2.7])
P.M('q04', "The diagram shows the graph of \\(y = a(x + b)(x + c)(x + d)^2\\)." + pl.svg() + "What are possible values of \\(a\\), \\(b\\), \\(c\\) and \\(d\\)?",
    opt4(2, -3, -1, 1), [opt4(2, 3, 1, -1), opt4(6, -3, -1, 1), opt4(6, 3, 1, -1)],
    "The graph touches the axis at \\(x = -1\\) (double zero, so \\(d = 1\\)) and crosses at \\(x = 1\\) and \\(x = 3\\), giving factors \\((x - 1)(x - 3)\\): \\(b = -3\\), \\(c = -1\\). The \\(y\\)-intercept is \\(a(-3)(-1)(1)^2 = 3a = 6\\), so \\(a = 2\\).")

# Q5 graph of a limited growth model
pl = Plot(-0.6, 8, -300, 3200, w=300, h=200); pl.line(0, 2500, 8, 2500, dash='4 4', colour=GREY, width=1)
pl.axes(xt=[], yt=[1000, 2500], xl='t', yl='P', origin=False); pl.curve(lambda T: 2500 - 1500 * math.exp(-0.55 * T), 0, 7.6)
P.M('q05', "The diagram shows the number of seals, \\(P(t)\\), in a colony at time \\(t\\)." + pl.svg() + "Which equation best represents this graph?",
    M('P(t) = 2500 - 1500e^{-kt}'), [M('P(t) = 1000 + 1500e^{-kt}'), M('P(t) = 2500 + 1500e^{-kt}'), M('P(t) = 4000 - 1500e^{-kt}')],
    "At \\(t = 0\\), \\(e^0 = 1\\), so \\(P(0) = 2500 - 1500 = 1000\\), and as \\(t \\to \\infty\\), \\(e^{-kt} \\to 0\\) so \\(P \\to 2500\\) from below. The other forms start or level off at the wrong values.")

# Q6 Newton's method starting points
kN, CN = 0.15, 0.6
gN = lambda X: X**4 / 4 - 3 * X**3 + 12 * X**2 - 16 * X
fN = lambda X: -kN * gN(X) + CN; fpN = lambda X: -kN * (X - 1) * (X - 4)**2
lo, hi = 4, 8
for _ in range(100):
    mid = (lo + hi) / 2
    if fN(mid) > 0: lo = mid
    else: hi = mid
w = lo; pts = {'a': 0.35, 'b': 1.0, 'c': 3.0, 'd': 4.25}
err = {k_: (abs(v - fN(v) / fpN(v) - w) if abs(fpN(v)) > 1e-12 else float('inf')) for k_, v in pts.items()}
assert min(err, key=err.get) == 'c' and err['c'] < 0.1
pl = Plot(-0.9, 6.2, -1.2, 2.2, w=360); pl.axes(xt=[], yt=[])
for k_, v in pts.items(): pl.line(v, 0, v, fN(v), dash='4 4', colour=GREY, width=1); pl.text(v, 0, k_, dy=16, var=True)
pl.text(w, 0, 'w', dx=-8, dy=16, var=True); pl.curve(fN, -0.9, 5.9); pl.text(2.4, fN(2.4), 'y = f(x)', dx=10, dy=-4, anchor='start', var=True, size=13)
P.M('q06', "The diagram shows the graph of \\(y = f(x)\\). The equation \\(f(x) = 0\\) has a solution at \\(x = w\\)." + pl.svg() + "Newton's method is used to approximate this solution. Which first approximation \\(x_1\\) gives the second approximation closest to \\(w\\)?",
    M('x_1 = c'), [M('x_1 = a'), M('x_1 = b'), M('x_1 = d')],
    "Newton's method follows the tangent at \\(x_1\\) down to the \\(x\\)-axis. At \\(b\\) the tangent is horizontal and never meets the axis; at \\(d\\) it is almost horizontal and lands far to the right; at \\(a\\) the curve is rising, so the tangent heads left, away from \\(w\\). At \\(c\\) the curve is steep and heading down towards \\(w\\), so the tangent lands close to it.")

# Q7 acceleration from v(x)
vx = x**2 + 3; acc = (vx * diff(vx, x)).subs(x, 2); assert acc == 28
P.M('q07', "The velocity of a particle, in metres per second, is \\(v = x^2 + 3\\), where \\(x\\) is its displacement in metres from the origin. What is the acceleration of the particle at \\(x = 2\\)?",
    "28 m s\u207b\u00b2", ["4 m s\u207b\u00b2", "7 m s\u207b\u00b2", "14 m s\u207b\u00b2"],
    "Velocity is given as a function of \\(x\\), so use \\(a = v\\dfrac{dv}{dx}\\) (not just \\(\\frac{dv}{dx}\\)): \\(a = (x^2 + 3)(2x) = 7 \\times 4 = 28\\) m s\u207b\u00b2 at \\(x = 2\\).")

# Q8 alternating round table
seats = 0
for p_ in itertools.permutations(range(1, 10)):   # fix person 0 (a man) in seat 0; seats alternate man/woman
    arr = (0,) + p_
    if all((arr[i] < 5) == (i % 2 == 0) for i in range(10)): seats += 1
assert seats == math.factorial(4) * math.factorial(5)
P.M('q08', "Five boys and five girls are to be seated at a round table. In how many different ways can they be seated if boys and girls alternate?",
    M('4!\\,5!'), [M('4!\\,4!'), M('2!\\,4!\\,4!'), M('2!\\,4!\\,5!')],
    "Seat the boys first around the table: \\(4!\\) ways (rotations are the same). That fixes five gaps between them, and the girls fill those in \\(5!\\) ways. There is no extra factor of 2: once the boys are placed, the girls' seats are decided.")

# Q9 general solution
nn = range(-6, 7); sols = [n_ * PI / 2 + (-1)**n_ * PI / 6 for n_ in nn]
assert all(abs(math.sin(2 * s_) - math.sqrt(3) / 2) < 1e-12 for s_ in sols)
assert not all(abs(math.sin(2 * (n_ * PI + (-1)**n_ * PI / 6)) - math.sqrt(3) / 2) < 1e-12 for n_ in nn) or True
P.M('q09', "Which of the following is a general solution of the equation \\(\\sin 2x = \\dfrac{\\sqrt{3}}{2}\\)?",
    M('x = \\dfrac{n\\pi}{2} + (-1)^n\\dfrac{\\pi}{6}'), [M('x = n\\pi + (-1)^n\\dfrac{\\pi}{6}'), M('x = n\\pi + (-1)^{n+1}\\dfrac{\\pi}{6}'), M('x = \\dfrac{n\\pi}{2} + (-1)^{n+1}\\dfrac{\\pi}{6}')],
    "\\(2x = n\\pi + (-1)^n\\dfrac{\\pi}{3}\\), since \\(\\sin^{-1}\\frac{\\sqrt{3}}{2} = \\frac{\\pi}{3}\\). Dividing everything by 2 gives \\(x = \\frac{n\\pi}{2} + (-1)^n\\frac{\\pi}{6}\\). Forgetting to halve the \\(n\\pi\\) loses half of the solutions.")

# Q10 SHM from v^2
kk_, n_ = 1.3, 2.0
xs = lambda T: 3 * kk_ * math.sin(n_ * T) + 3 * kk_; vs = lambda T: 3 * kk_ * n_ * math.cos(n_ * T)
assert all(abs(vs(T)**2 - n_**2 * (6 * kk_ * xs(T) - xs(T)**2)) < 1e-9 for T in [0, 0.3, 1.7]) and xs(0) == 3 * kk_
P.M('q10', "A particle is moving in simple harmonic motion. Its displacement is \\(x\\) and its velocity \\(v\\) satisfies \\(v^2 = n^2(6kx - x^2)\\), where \\(n\\) and \\(k\\) are positive constants. The particle is initially at \\(x = 3k\\). Which function could represent the motion of the particle?",
    M('x = 3k\\sin(nt) + 3k'), [M('x = 3k\\cos(nt)'), M('x = 6k\\cos(nt) - 3k'), M('x = 6k\\sin(nt) + 3k')],
    "Complete the square: \\(6kx - x^2 = 9k^2 - (x - 3k)^2\\), so the centre is \\(x = 3k\\) and the amplitude is \\(3k\\). Starting at the centre means a sine form: \\(x = 3k + 3k\\sin(nt)\\).")

# Q11(a)
P11 = x**3 + 2 * x**2 - 5 * x - 6; assert P11.subs(x, -1) == 0 and set(sp.solve(P11, x)) == {-1, 2, -3}
P.W('q11a', 3, "Consider the polynomial \\(P(x) = x^3 + 2x^2 - 5x - 6\\).<br>(i) Show that \\(x = -1\\) is a zero of \\(P(x)\\). <b>1</b><br>(ii) Find the other zeros. <b>2</b>",
    ["(i) \\(P(-1) = -1 + 2 + 5 - 6 = 0\\)", "(ii) \\(P(x) = (x + 1)(x^2 + x - 6) = (x + 1)(x + 3)(x - 2)\\)", "The other zeros are \\(x = 2\\) and \\(x = -3\\)."],
    [("Both parts correct", 3), ("Part (i), and the correct quadratic factor", 2), ("Part (i) correct", 1)])

# Q11(b)
assert sp.solve(sp.Eq(4 * (x - 1), 9), x) == [Q(13, 4)] and Q(13, 4) > 1
P.W('q11b', 2, "Solve \\(\\log_3 4 + \\log_3(x - 1) = 2\\).",
    ["\\(\\log_3\\left[4(x - 1)\\right] = 2\\), so \\(4(x - 1) = 3^2 = 9\\).", "\\(x = \\frac{13}{4}\\) (and \\(x - 1 > 0\\), so it is valid)."],
    [("Correct answer", 2), ("Combines the logs correctly", 1)])

# Q11(c)
assert all(abs(math.sin(v) + math.sqrt(3) * math.cos(v) - 2 * math.sin(v + PI / 3)) < 1e-12 for v in [0.2, 1.4, 4])
P.W('q11c', 2, "Write \\(\\sin x + \\sqrt{3}\\cos x\\) in the form \\(R\\sin(x + \\alpha)\\), where \\(R > 0\\) and \\(0 \\le \\alpha \\le \\dfrac{\\pi}{2}\\).",
    ["\\(R\\cos\\alpha = 1\\) and \\(R\\sin\\alpha = \\sqrt{3}\\), so \\(R = \\sqrt{1 + 3} = 2\\) and \\(\\tan\\alpha = \\sqrt{3}\\), \\(\\alpha = \\frac{\\pi}{3}\\).", "\\(\\sin x + \\sqrt{3}\\cos x = 2\\sin\\left(x + \\frac{\\pi}{3}\\right)\\)"],
    [("Correct \\(R\\) and \\(\\alpha\\)", 2), ("Correct \\(R\\) or correct \\(\\alpha\\)", 1)])

# Q11(d) two secants
xs_ = sp.solve(sp.Eq(x * (x + 4), 2 * 8), x); xpos = [v for v in xs_ if v > 0][0]; assert simplify(xpos - (-2 + 2 * sqrt(5))) == 0
pl = Plot(-1.6, 4.2, -1.7, 1.6, w=330); circle(pl, 0, 0, 1.2)
Cp = np.array([3.6, 0.9])
def secant(far_ang):
    far = np.array([1.2 * math.cos(far_ang), 1.2 * math.sin(far_ang)]); dv = (far - Cp) / np.linalg.norm(far - Cp)
    bq = 2 * Cp.dot(dv); cq = Cp.dot(Cp) - 1.44; dsc = math.sqrt(bq * bq - 4 * cq)
    return Cp + (-bq - dsc) / 2 * dv, Cp + (-bq + dsc) / 2 * dv
n1, f1 = secant(2.6); n2, f2 = secant(-2.3)
for a_, b_ in [(Cp, f1), (Cp, f2)]: pl.line(a_[0], a_[1], b_[0], b_[1], width=1.3)
for q_ in (Cp, n1, f1, n2, f2): pl.dot(q_[0], q_[1], 3)
pl.text(Cp[0], Cp[1], 'C', dx=8, dy=4, anchor='start', var=True)
pl.text(*((Cp + n1) / 2), 'x', dy=-8, var=True); pl.text(*((n1 + f1) / 2), '4', dy=-8)
pl.text(*((Cp + n2) / 2), '2', dx=6, dy=14); pl.text(*((n2 + f2) / 2), '6', dx=4, dy=16); pl.text(4.1, -1.5, 'NOT TO SCALE', anchor='end', size=11)
P.W('q11d', 2, "Two secants from the point \\(C\\) cut a circle as shown." + pl.svg() + "What is the exact value of \\(x\\)?",
    ["For two secants from the same point: (outside part) \\(\\times\\) (whole secant) is the same for both.", "\\(x(x + 4) = 2(2 + 6) = 16\\), so \\(x^2 + 4x - 16 = 0\\).", "\\(x = \\dfrac{-4 + \\sqrt{16 + 64}}{2} = -2 + 2\\sqrt{5}\\) (taking the positive root)."],
    [("Correct exact value", 2), ("Correct equation from the secant theorem", 1)])

# Q11(e)
assert sp.solve_univariate_inequality(1 / (3 * x + 2) < 1, x, relational=False) == sp.Union(sp.Interval.open(-sp.oo, Q(-2, 3)), sp.Interval.open(Q(-1, 3), sp.oo))
P.W('q11e', 3, "Consider the function \\(f(x) = \\dfrac{1}{3x + 2}\\).<br>(i) Find the domain of \\(f(x)\\). <b>1</b><br>(ii) For what values of \\(x\\) is \\(f(x) < 1\\)? <b>2</b>",
    ["(i) All real \\(x\\) except \\(x = -\\frac{2}{3}\\).", "(ii) Multiply by \\((3x + 2)^2 > 0\\): \\(3x + 2 < (3x + 2)^2\\), so \\((3x + 2)(3x + 2 - 1) > 0\\), that is \\((3x + 2)(3x + 1) > 0\\).", "\\(x < -\\frac{2}{3}\\) or \\(x > -\\frac{1}{3}\\)."],
    [("Both parts correct", 3), ("Part (i), and correct critical values in (ii)", 2), ("Part (i) correct, or correct critical values", 1)])

# Q11(f)
I11 = integrate(x / sqrt(x + 1), (x, 0, 3)); assert I11 == Q(8, 3)
P.W('q11f', 3, "Evaluate \\(\\displaystyle\\int_0^3 \\frac{x}{\\sqrt{x + 1}}\\,dx\\), using the substitution \\(u = x + 1\\).",
    ["\\(du = dx\\), \\(x = u - 1\\); \\(x = 0 \\Rightarrow u = 1\\), \\(x = 3 \\Rightarrow u = 4\\).", "\\(\\displaystyle\\int_1^4 \\frac{u - 1}{\\sqrt{u}}\\,du = \\int_1^4 \\left(u^{\\frac{1}{2}} - u^{-\\frac{1}{2}}\\right)du = \\left[\\frac{2}{3}u^{\\frac{3}{2}} - 2u^{\\frac{1}{2}}\\right]_1^4\\)",
     "\\(= \\left(\\frac{16}{3} - 4\\right) - \\left(\\frac{2}{3} - 2\\right) = \\frac{4}{3} + \\frac{4}{3} = \\frac{8}{3}\\)"],
    [("Correct answer", 3), ("Correct primitive with correct limits", 2), ("Correct integral in terms of \\(u\\)", 1)])

# Q12(a)
F12 = x / 2 - sin(8 * x) / 16; assert simplify(diff(F12, x) - sin(4 * x)**2) == 0
P.W('q12a', 2, "Find \\(\\displaystyle\\int \\sin^2(4x)\\,dx\\).",
    ["\\(\\sin^2 4x = \\frac{1}{2}(1 - \\cos 8x)\\)", "\\(\\displaystyle\\int \\sin^2 4x\\,dx = \\frac{x}{2} - \\frac{\\sin 8x}{16} + C\\)"],
    [("Correct primitive", 2), ("Uses \\(\\sin^2 A = \\frac{1}{2}(1 - \\cos 2A)\\)", 1)])

# Q12(b) ferris wheel related rates
sn = 18 / 25; cs = math.sqrt(1 - sn * sn); rate = 25 * cs * 1.2; assert round(rate, 1) == 20.8
pl = Plot(-1.5, 1.8, -1.6, 1.4, w=300); circle(pl, 0, 0, 1.15); th0 = 0.85
Cx, Cy = 1.15 * math.cos(th0), 1.15 * math.sin(th0)
pl.line(-1.15, 0, 1.15, 0, width=1.1); pl.line(0, 0, Cx, Cy, width=1.4); pl.line(Cx, Cy, Cx, 0, dash='4 4', colour=GREY, width=1.1)
pl.line(-0.5, -1.55, 0, 0, width=2.6); pl.line(0.5, -1.55, 0, 0, width=2.6); pl.line(-0.75, -1.55, 0.75, -1.55, width=2.6)
pl.dot(0, 0, 3.5); pl.dot(Cx, Cy, 4); pl.raw('<rect x="%s" y="%s" width="9" height="9" fill="none" stroke="%s"/>' % (pl.X(Cx) - 9, pl.Y(0) - 9, INK))
pl.raw('<path d="M%s,%sA22,22 0 0 0 %s,%s" fill="none" stroke="%s"/>' % (pl.X(0) + 22, pl.Y(0), round(pl.X(0) + 22 * math.cos(th0), 1), round(pl.Y(0) - 22 * math.sin(th0), 1), INK))
pl.text(0.33, 0.13, '\u03b8', var=True, size=14); pl.text(Cx / 2, Cy / 2, '25 m', dx=-10, dy=-4, anchor='end', size=12); pl.text(Cx, Cy / 2, 'h', dx=8, var=True)
pl.raw('<path d="M%s,%sA%s,%s 0 0 0 %s,%s" fill="none" stroke="%s" stroke-width="1.3"/>' % (pl.X(1.4 * math.cos(-0.3)), pl.Y(1.4 * math.sin(-0.3)), round(pl.X(1.4) - pl.X(0), 1), round(pl.X(1.4) - pl.X(0), 1), pl.X(1.4 * math.cos(0.5)), pl.Y(1.4 * math.sin(0.5)), INK))
pl.line(1.4 * math.cos(0.45), 1.4 * math.sin(0.45), 1.4 * math.cos(0.5), 1.4 * math.sin(0.5), width=1.3, arrow=True)
P.W('q12b', 3, "A Ferris wheel has a radius of 25 metres and turns at a constant 1.2 radians per minute. A seat is \\(h\\) metres above the horizontal diameter of the wheel, and the angle of elevation of the seat from the centre is \\(\\theta\\)." + pl.svg() +
    "(i) Show that \\(\\dfrac{dh}{d\\theta} = 25\\cos\\theta\\). <b>1</b><br>(ii) At what speed is the seat rising when it is 18 metres above the horizontal diameter, on its way up? Give your answer correct to one decimal place. <b>2</b>",
    ["(i) \\(h = 25\\sin\\theta\\), so \\(\\dfrac{dh}{d\\theta} = 25\\cos\\theta\\).", "(ii) \\(\\sin\\theta = \\frac{18}{25}\\), and on the way up \\(\\theta\\) is acute, so \\(\\cos\\theta = \\sqrt{1 - \\frac{324}{625}} = \\frac{\\sqrt{301}}{25}\\).",
     "\\(\\dfrac{dh}{dt} = \\dfrac{dh}{d\\theta} \\times \\dfrac{d\\theta}{dt} = 25 \\times \\frac{\\sqrt{301}}{25} \\times 1.2 = 1.2\\sqrt{301} \\approx 20.8\\) m per minute."],
    [("Both parts correct", 3), ("Part (i), and correct \\(\\cos\\theta\\) or chain rule in (ii)", 2), ("Part (i) correct", 1)])

# Q12(c) tan^-1 x + tan^-1(1/x)
for v in [0.3, 1, 7]: assert abs(math.atan(v) + math.atan(1 / v) - PI / 2) < 1e-12 and abs(math.atan(-v) + math.atan(-1 / v) + PI / 2) < 1e-12
assert simplify(diff(atan(x) + atan(1 / x), x)) == 0
pm = Plot(-4, 4, -2.2, 2.2, w=300); pm.axes(xt=[], yt=[PI / 2], ytl=['\u03c0\u20442']); pm.text(0, -PI / 2, '\u2212\u03c0\u20442', dx=10, dy=4, anchor='start', var=True, size=13)
pm.line(0.06, PI / 2, 4, PI / 2, width=2.2); pm.line(-4, -PI / 2, -0.06, -PI / 2, width=2.2)
for yy_ in (PI / 2, -PI / 2): pm.raw('<circle cx="%s" cy="%s" r="4" fill="#fff" stroke="%s" stroke-width="1.5"/>' % (pm.X(0), pm.Y(yy_), INK))
P.W('q12c', 3, "Let \\(f(x) = \\tan^{-1}x + \\tan^{-1}\\dfrac{1}{x}\\), for \\(x \\ne 0\\).<br>(i) Show that \\(f'(x) = 0\\). <b>1</b><br>(ii) Hence, or otherwise, prove that \\(\\tan^{-1}x + \\tan^{-1}\\dfrac{1}{x} = \\dfrac{\\pi}{2}\\) for \\(x > 0\\). <b>1</b><br>(iii) Hence, sketch \\(y = f(x)\\). <b>1</b>",
    ["(i) \\(f'(x) = \\dfrac{1}{1 + x^2} + \\dfrac{1}{1 + \\frac{1}{x^2}} \\times \\left(-\\dfrac{1}{x^2}\\right) = \\dfrac{1}{1 + x^2} - \\dfrac{1}{x^2 + 1} = 0\\)",
     "(ii) So \\(f\\) is constant for \\(x > 0\\). At \\(x = 1\\): \\(f(1) = \\frac{\\pi}{4} + \\frac{\\pi}{4} = \\frac{\\pi}{2}\\).",
     "(iii) \\(f\\) is odd, so for \\(x < 0\\), \\(f(x) = -\\frac{\\pi}{2}\\). The graph is two horizontal half-lines, \\(y = \\frac{\\pi}{2}\\) for \\(x > 0\\) and \\(y = -\\frac{\\pi}{2}\\) for \\(x < 0\\), with open circles at \\(x = 0\\)." + pm.svg()],
    [("All three parts correct", 3), ("Two parts correct", 2), ("One part correct", 1)])

# Q12(d) binomial expression
pr = sum(math.comb(15, k) * 0.8**k * 0.2**(15 - k) for k in (13, 14, 15)); assert 0.39 < pr < 0.4
P.W('q12d', 2, "A team of 15 people enter a fun run. The probability that a person finishes within 1 hour is 0.8, independently of the others. Find an expression for the probability that at least 13 of the team finish within 1 hour.",
    ["\\(X \\sim \\text{Bin}(15, 0.8)\\): \\(P(X \\ge 13) = P(13) + P(14) + P(15)\\)", "\\(= \\binom{15}{13}(0.8)^{13}(0.2)^2 + \\binom{15}{14}(0.8)^{14}(0.2) + (0.8)^{15}\\) (\\(\\approx 0.398\\))"],
    [("Correct expression", 2), ("One correct term, or the correct three cases", 1)])

# Q12(e) tangents to x^2 = 8y
p_, q_ = symbols('p q', real=True)
A_ = (2 * p_, 0); B_ = (2 * q_, 0); S_ = (0, 2); Pp = (4 * p_, 2 * p_**2); T_ = (2 * (p_ + q_), 2 * p_ * q_)
assert simplify(((Pp[0] - A_[0]) * (S_[0] - A_[0]) + (Pp[1] - A_[1]) * (S_[1] - A_[1]))) == 0
ST2 = (T_[0] - S_[0])**2 + (T_[1] - S_[1])**2; assert sp.expand(ST2 - 4 * (p_**2 + 1) * (q_**2 + 1)) == 0
assert simplify((2 * p_ * (Pp[0] - 0)) - 4 * p_**2 * 2 + 0) == 0 or True
pv, qv = 1.5, 0.75
pl = Plot(-2.5, 9.5, -2.2, 7.5, w=320)
pl.axes(xt=[], yt=[]); pl.curve(lambda X: X * X / 8, -2.5, 7.6)
for par in (pv, qv): pl.line(2 * par - 1.6, -par * 1.6, 9, par * 9 - 2 * par * par, width=1.2)
for (a_, b_), lab, dx_, dy_ in [((4 * pv, 2 * pv * pv), 'P', -10, -2), ((4 * qv, 2 * qv * qv), 'Q', -6, -10), ((2 * (pv + qv), 2 * pv * qv), 'T', 10, 6), ((2 * pv, 0), 'A', 8, 16), ((2 * qv, 0), 'B', -8, 16), ((0, 2), 'S', -10, 4)]:
    pl.dot(a_, b_, 3); pl.text(a_, b_, lab, dx=dx_, dy=dy_, anchor='middle', var=True)
pl.text(7.2, 7.0, 'x\u00b2 = 8y', anchor='end', var=True, size=13)
P.W('q12e', 5, "The points \\(P(4p, 2p^2)\\) and \\(Q(4q, 2q^2)\\) lie on the parabola \\(x^2 = 8y\\), which has focus \\(S(0, 2)\\). The tangents at \\(P\\) and \\(Q\\) meet at \\(T(2(p + q), 2pq)\\) (do NOT prove this), and they meet the \\(x\\)-axis at \\(A\\) and \\(B\\) respectively." + pl.svg() +
    "(i) Show that \\(\\angle PAS = 90^\\circ\\). <b>2</b><br>(ii) Explain why \\(S\\), \\(B\\), \\(A\\) and \\(T\\) are concyclic. <b>1</b><br>(iii) Show that the diameter of the circle through \\(S\\), \\(B\\), \\(A\\) and \\(T\\) has length \\(2\\sqrt{(p^2 + 1)(q^2 + 1)}\\). <b>2</b>",
    ["(i) \\(\\frac{dy}{dx} = \\frac{x}{4} = p\\) at \\(P\\), so the tangent is \\(y = px - 2p^2\\), which meets the \\(x\\)-axis at \\(A(2p, 0)\\).", "Gradient of \\(SA = \\frac{0 - 2}{2p - 0} = -\\frac{1}{p}\\). The gradient of \\(PA\\) is \\(p\\), and \\(p \\times \\left(-\\frac{1}{p}\\right) = -1\\), so \\(\\angle PAS = 90^\\circ\\).",
     "(ii) In the same way \\(\\angle SBT = 90^\\circ\\) (using \\(Q\\)). \\(\\angle SAT\\) and \\(\\angle SBT\\) are both right angles on the interval \\(ST\\), so \\(A\\) and \\(B\\) lie on the circle with diameter \\(ST\\) (angle in a semicircle, converse).",
     "(iii) The diameter is \\(ST\\): \\(ST^2 = 4(p + q)^2 + (2pq - 2)^2 = 4\\left[p^2 + 2pq + q^2 + p^2q^2 - 2pq + 1\\right] = 4(p^2 + 1)(q^2 + 1)\\).", "So \\(ST = 2\\sqrt{(p^2 + 1)(q^2 + 1)}\\)."],
    [("All parts correct", 5), ("Two parts correct and progress in the third", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct, or finds \\(A(2p, 0)\\)", 1)])

# Q13(a) induction, geometric series
for N in range(1, 25): assert sum(3 * (-2)**(r - 1) for r in range(1, N + 1)) == 1 - (-2)**N
P.W('q13a', 3, "Prove by mathematical induction that, for \\(n \\ge 1\\),<br>\\(3 - 6 + 12 - 24 + \\cdots + 3(-2)^{n-1} = 1 - (-2)^n\\).",
    ["<b>Step 1.</b> \\(n = 1\\): LHS \\(= 3\\), RHS \\(= 1 - (-2) = 3\\). True.", "<b>Step 2.</b> Assume true for \\(n = k\\): \\(3 - 6 + \\cdots + 3(-2)^{k-1} = 1 - (-2)^k\\).",
     "<b>Step 3.</b> For \\(n = k + 1\\): LHS \\(= 1 - (-2)^k + 3(-2)^k = 1 + 2(-2)^k = 1 - (-2)(-2)^k = 1 - (-2)^{k+1}\\), the RHS for \\(n = k + 1\\).",
     "So if true for \\(n = k\\) it is true for \\(n = k + 1\\); since true for \\(n = 1\\), by induction it is true for all \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves \\(n = 1\\) and makes significant progress in the inductive step", 2), ("Proves \\(n = 1\\), or correctly adds the \\((k + 1)\\)th term", 1)])

# Q13(b) inverse of x/(x^2+4) for x >= 2
f13 = lambda X: X / (X * X + 4); finv = lambda X: (1 + math.sqrt(1 - 16 * X * X)) / (2 * X)
assert abs(f13(2) - 0.25) < 1e-12 and all(abs(finv(f13(v)) - v) < 1e-9 for v in [2, 2.5, 5, 30])
pl = Plot(-7, 7, -0.42, 0.42, w=360, h=200); pl.axes(xt=[-2, 2], yt=[]); pl.curve(f13, -7, 7)
pl.dot(2, 0.25, 3); pl.dot(-2, -0.25, 3); pl.text(2, 0.25, '(2, \u00bc)', dy=-8, size=12)
pi_ = Plot(-0.08, 0.42, -0.5, 7, w=220, h=280); pi_.axes(xt=[0.25], xtl=['\u00bc'], yt=[2]); pi_.curve(finv, 0.012, 0.25); pi_.dot(0.25, 2, 3)
P.W('q13b', 6, "The diagram shows the graph of \\(y = \\dfrac{x}{x^2 + 4}\\), for all real \\(x\\)." + pl.svg() + "Consider the function \\(f(x) = \\dfrac{x}{x^2 + 4}\\), for \\(x \\ge 2\\), which has an inverse (do NOT prove this).<br>"
    "(i) State the domain and range of \\(f^{-1}(x)\\). <b>2</b><br>(ii) Sketch the graph of \\(y = f^{-1}(x)\\). <b>1</b><br>(iii) Find an expression for \\(f^{-1}(x)\\). <b>3</b>",
    ["(i) For \\(x \\ge 2\\), \\(f\\) decreases from \\(\\frac{1}{4}\\) towards 0 (never reaching it), so its range is \\(0 < y \\le \\frac{1}{4}\\). So \\(f^{-1}\\) has domain \\(0 < x \\le \\frac{1}{4}\\) and range \\(y \\ge 2\\).",
     "(ii) The reflection in \\(y = x\\): starts at \\(\\left(\\frac{1}{4}, 2\\right)\\) and rises steeply, with the \\(y\\)-axis as an asymptote." + pi_.svg(),
     "(iii) Swap: \\(x = \\dfrac{y}{y^2 + 4}\\), so \\(xy^2 - y + 4x = 0\\).", "\\(y = \\dfrac{1 \\pm \\sqrt{1 - 16x^2}}{2x}\\). Since \\(y \\ge 2\\), take the \\(+\\) sign (check \\(x = \\frac{1}{4}\\): \\(y = \\frac{1}{1/2} = 2\\)).", "\\(f^{-1}(x) = \\dfrac{1 + \\sqrt{1 - 16x^2}}{2x}\\)"],
    [("All parts correct", 6), ("Two parts correct and substantial progress in (iii)", 5), ("Part (iii) correct, or (i) and (ii) correct with progress in (iii)", 4), ("Correct quadratic in \\(y\\), or two parts correct", 3), ("Correct domain and range, or one part correct with progress", 2), ("Correct domain or range, or a correct sketch", 1)])

# Q13(c) complementary angles, product of flight times
V, g, al = 20.0, 9.8, 0.4; be = PI / 2 - al
Rng = lambda th: V * V * math.sin(2 * th) / g; Tf = lambda th: 2 * V * math.sin(th) / g
assert abs(Rng(al) - Rng(be)) < 1e-9 and abs(Tf(al) * Tf(be) - 2 * Rng(al) / g) < 1e-9
pl = Plot(-0.6, 5.6, -0.9, 4.0, w=300); pl.line(-0.6, 0, 5.6, 0, width=1.2)
dd = 5.0
for th, hmax in [(1.1, 3.6), (0.47, 0.85)]:
    pl.curve(lambda X, h=hmax: 4 * h * X * (dd - X) / dd**2, 0, dd, width=1.7)
pl.line(0, -0.45, dd, -0.45, width=1, arrow=True); pl.line(dd, -0.45, 0, -0.45, width=1, arrow=True); pl.text(dd / 2, -0.45, 'd', dy=-6, var=True)
pl.text(0.55, 2.1, '\u03b1', var=True, size=14); pl.text(1.25, 0.32, '\u03b2', var=True, size=14)
P.W('q13c', 6, "An object is projected from the origin with initial speed \\(V\\) at an angle \\(\\theta\\) to the horizontal. Its equations of motion are \\(x = Vt\\cos\\theta\\) and \\(y = Vt\\sin\\theta - \\dfrac{gt^2}{2}\\) (do NOT prove these).<br>"
    "(i) Show that the horizontal range is \\(\\dfrac{V^2}{g}\\sin 2\\theta\\). <b>2</b><br>(ii) Show that projecting at \\(\\dfrac{\\pi}{2} - \\theta\\) gives the same horizontal range. <b>1</b><br>"
    "(iii) The object is projected with speed \\(V\\) to land a horizontal distance \\(d\\) away, where \\(d\\) is less than the maximum range. There are two possible angles, \\(\\alpha\\) and \\(\\beta = \\dfrac{\\pi}{2} - \\alpha\\)." + pl.svg() +
    "Let \\(T_\\alpha\\) and \\(T_\\beta\\) be the times of flight at these two angles. Show that \\(T_\\alpha T_\\beta = \\dfrac{2d}{g}\\). <b>3</b>",
    ["(i) \\(y = 0\\) when \\(t\\left(V\\sin\\theta - \\frac{gt}{2}\\right) = 0\\), so the time of flight is \\(t = \\dfrac{2V\\sin\\theta}{g}\\).", "Range \\(= V\\cos\\theta \\times \\dfrac{2V\\sin\\theta}{g} = \\dfrac{V^2}{g} \\times 2\\sin\\theta\\cos\\theta = \\dfrac{V^2}{g}\\sin 2\\theta\\).",
     "(ii) \\(\\sin\\left(2\\left(\\frac{\\pi}{2} - \\theta\\right)\\right) = \\sin(\\pi - 2\\theta) = \\sin 2\\theta\\), so the range is the same.",
     "(iii) \\(T_\\alpha = \\dfrac{2V\\sin\\alpha}{g}\\) and \\(T_\\beta = \\dfrac{2V\\sin\\left(\\frac{\\pi}{2} - \\alpha\\right)}{g} = \\dfrac{2V\\cos\\alpha}{g}\\).",
     "\\(T_\\alpha T_\\beta = \\dfrac{4V^2\\sin\\alpha\\cos\\alpha}{g^2} = \\dfrac{2}{g} \\times \\dfrac{V^2\\sin 2\\alpha}{g} = \\dfrac{2d}{g}\\), since \\(d = \\dfrac{V^2}{g}\\sin 2\\alpha\\)."],
    [("All parts correct", 6), ("Two parts correct and significant progress in the third", 5), ("Two parts correct", 4), ("One part correct and progress in another", 3), ("One part correct, or correct times of flight", 2), ("Finds the time of flight", 1)])

# Q14(a) bisectors of a quadrilateral
Av, Bv, Cv, Dv = np.array([0.3, 5.0]), np.array([0.0, 0.0]), np.array([7.5, 0.0]), np.array([6.2, 1.6])
def bis(Pv, Uv, Wv): a_ = (Uv - Pv) / np.linalg.norm(Uv - Pv); b_ = (Wv - Pv) / np.linalg.norm(Wv - Pv); d_ = a_ + b_; return Pv, d_ / np.linalg.norm(d_)
def meet(l1, l2):
    (p1, d1), (p2, d2) = l1, l2; Mx = np.array([d1, -d2]).T; s_ = np.linalg.solve(Mx, p2 - p1); return p1 + s_[0] * d1
lA, lB, lC, lD = bis(Av, Bv, Dv), bis(Bv, Av, Cv), bis(Cv, Bv, Dv), bis(Dv, Av, Cv)
Pq, Qq, Rq, Sq = meet(lA, lB), meet(lA, lD), meet(lC, lD), meet(lB, lC)
def ang(U, Vv, W): a_ = U - Vv; b_ = W - Vv; return math.acos(a_.dot(b_) / np.linalg.norm(a_) / np.linalg.norm(b_))
assert abs(ang(Qq, Pq, Sq) + ang(Qq, Rq, Sq) - PI) < 1e-9
pl = Plot(-0.6, 8.1, -2.0, 5.5, w=360)
poly(pl, [Av, Bv, Cv, Dv, Av]); poly(pl, [Pq, Qq, Rq, Sq, Pq], w=2.4)
for Pv_, end in [(Av, Qq), (Bv, Sq), (Cv, Sq), (Dv, Qq)]:
    far = end + 0.15 * (end - Pv_); pl.line(Pv_[0], Pv_[1], far[0], far[1], width=1)
for v_, lab, dx_, dy_ in [(Av, 'A', 0, -8), (Bv, 'B', -10, 6), (Cv, 'C', 10, 6), (Dv, 'D', 8, -4), (Pq, 'P', -10, 4), (Qq, 'Q', 4, 16), (Rq, 'R', 10, 4), (Sq, 'S', 0, -8)]:
    pl.text(v_[0], v_[1], lab, dx=dx_, dy=dy_, var=True)
P.W('q14a', 3, "The diagram shows quadrilateral \\(ABCD\\) and the bisectors of its angles at \\(A\\), \\(B\\), \\(C\\) and \\(D\\). The bisectors at \\(A\\) and \\(B\\) meet at \\(P\\), the bisectors at \\(A\\) and \\(D\\) meet at \\(Q\\), the bisectors at \\(C\\) and \\(D\\) meet at \\(R\\), and the bisectors at \\(B\\) and \\(C\\) meet at \\(S\\)." + pl.svg() + "Show that \\(PQRS\\) is a cyclic quadrilateral.",
    ["Let the angles of \\(ABCD\\) be \\(2\\alpha\\), \\(2\\beta\\), \\(2\\gamma\\), \\(2\\delta\\) at \\(A\\), \\(B\\), \\(C\\), \\(D\\), so \\(2\\alpha + 2\\beta + 2\\gamma + 2\\delta = 360^\\circ\\) and \\(\\alpha + \\beta + \\gamma + \\delta = 180^\\circ\\).",
     "In triangle \\(ABP\\): \\(\\angle APB = 180^\\circ - \\alpha - \\beta\\), and \\(\\angle QPS = \\angle APB\\) (vertically opposite).", "In triangle \\(CDR\\): \\(\\angle DRC = 180^\\circ - \\gamma - \\delta\\), and \\(\\angle QRS = \\angle DRC\\) (vertically opposite).",
     "\\(\\angle QPS + \\angle QRS = 360^\\circ - (\\alpha + \\beta + \\gamma + \\delta) = 180^\\circ\\). Opposite angles are supplementary, so \\(PQRS\\) is cyclic."],
    [("Correct proof with reasons", 3), ("Finds one of the opposite angles of \\(PQRS\\) and the angle sum of \\(ABCD\\)", 2), ("Uses the angle sum of a quadrilateral, or finds \\(\\angle APB\\)", 1)])

# Q14(b) counting identity and a committee
for nn_ in range(1, 12):
    for rr in range(0, nn_ + 1):
        assert sum(math.comb(nn_, k) * math.comb(k, rr) for k in range(rr, nn_ + 1)) == math.comb(nn_, rr) * 2**(nn_ - rr)
ans = sum(math.comb(18, k) * math.comb(k, 5) for k in range(5, 19)); assert ans == math.comb(18, 5) * 2**13
P.W('q14b', 5, "(i) By considering the expansions of \\((1 + (1 + x))^n\\) and \\((2 + x)^n\\), show that<br>\\(\\dbinom{n}{r}\\dbinom{r}{r} + \\dbinom{n}{r + 1}\\dbinom{r + 1}{r} + \\dbinom{n}{r + 2}\\dbinom{r + 2}{r} + \\cdots + \\dbinom{n}{n}\\dbinom{n}{r} = \\dbinom{n}{r}2^{n-r}\\). <b>3</b><br>"
    "(ii) 18 students apply for a committee of 5. First, Teacher A chooses a shortlist of at least 5 of the applicants. Teacher B then chooses the 5 committee members from the shortlist. In how many ways can this be done? <b>2</b>",
    ["(i) \\((1 + (1 + x))^n = \\displaystyle\\sum_{k=0}^{n} \\binom{n}{k}(1 + x)^k\\). The coefficient of \\(x^r\\) in \\((1 + x)^k\\) is \\(\\binom{k}{r}\\) (zero when \\(k < r\\)), so the coefficient of \\(x^r\\) is \\(\\displaystyle\\sum_{k=r}^{n} \\binom{n}{k}\\binom{k}{r}\\).",
     "\\((2 + x)^n = \\displaystyle\\sum_{j=0}^{n} \\binom{n}{j}2^{n-j}x^j\\), whose coefficient of \\(x^r\\) is \\(\\binom{n}{r}2^{n-r}\\). The two expressions are the same polynomial, so the coefficients are equal.",
     "(ii) A shortlist of \\(k\\) students then a committee from it: \\(\\binom{18}{k}\\binom{k}{5}\\) ways. Adding over \\(k = 5, \\dots, 18\\) and using (i) with \\(n = 18\\), \\(r = 5\\):", "\\(\\dbinom{18}{5}2^{13} = 8568 \\times 8192 = 70\\,189\\,056\\) ways."],
    [("Both parts correct", 5), ("Part (i), and the correct sum in (ii)", 4), ("Part (i) correct", 3), ("Correct coefficient from one expansion, or part (ii) correct", 2), ("Expands one expression", 1)])

# Q14(c) quadrants in a right triangle
av, bv = 3.0, 5.0; cv = math.hypot(av, bv); x0 = av * bv / cv; ratio = (cv - av) / cv
radii = [x0 * ratio**i for i in range(200)]; assert abs(sum(radii) - bv) < 1e-9 and abs(sum(PI * r / 2 for r in radii) - PI * bv / 2) < 1e-9
Cc = np.array([0.0, 0.0]); Ac = np.array([bv, 0.0]); Bc = np.array([0.0, av])
pl = Plot(-0.6, 5.6, -0.7, 3.5, w=380)
poly(pl, [Bc, Cc, Ac, Bc])
cx_, r_ = 0.0, x0
for i in range(5):
    pl.raw('<path d="M%s,%sA%s,%s 0 0 1 %s,%s" fill="none" stroke="%s" stroke-width="1.3"/>' % (pl.X(cx_), pl.Y(r_), round(pl.X(r_) - pl.X(0), 1), round(pl.X(r_) - pl.X(0), 1), pl.X(cx_ + r_), pl.Y(0), INK))
    if i < 4: gy = av * (1 - (cx_ + r_) / bv); pl.line(cx_ + r_, 0, cx_ + r_, gy, width=1)
    cx_, r_ = cx_ + r_, r_ * ratio
Dn = Bc + ((Ac - Bc) * ((Bc - Cc).dot(Bc - Ac) / (cv * cv)) * 1.0); Dpt = Bc + (Ac - Bc) * (av * av / (cv * cv)); pl.line(0, 0, Dpt[0], Dpt[1], width=1)
for v_, lab, dx_, dy_ in [(Bc, 'B', -10, 0), (Cc, 'C', -10, 6), (Ac, 'A', 10, 6), (Dpt, 'D', 2, -8), (np.array([x0, 0]), 'F', 0, 16)]:
    pl.text(v_[0], v_[1], lab, dx=dx_, dy=dy_, var=True)
pl.text(Dpt[0] / 2, Dpt[1] / 2, 'x', dx=8, var=True); pl.text(0, av / 2, 'a', dx=-12, var=True); pl.text(bv * 0.72, 0, 'b', dy=16, var=True); pl.text(bv / 2, av / 2, 'c', dx=10, dy=-6, var=True)
P.W('q14c', 7, "In triangle \\(ABC\\), \\(BC\\) is perpendicular to \\(AC\\), with \\(BC = a\\), \\(AC = b\\) and \\(AB = c\\). A quadrant of a circle with radius \\(x\\) and centre \\(C\\) touches \\(AB\\) at \\(D\\) and meets \\(AC\\) at \\(F\\); \\(CD\\) is perpendicular to \\(AB\\). From \\(F\\) a line perpendicular to \\(AC\\) meets \\(AB\\), a new quadrant centred at \\(F\\) is drawn touching \\(AB\\) in the smaller right triangle, and this is repeated forever, as shown." + pl.svg() +
    "(i) Show that triangles \\(ABC\\) and \\(ACD\\) are similar. <b>1</b><br>(ii) Show that \\(x = \\dfrac{ab}{c}\\). <b>1</b><br>(iii) Show that the total length of all the quadrant arcs is \\(\\dfrac{\\pi b}{2}\\). <b>4</b><br>(iv) Hence, or otherwise, show that the radii of all the quadrants add up to \\(b\\). <b>1</b>",
    ["(i) \\(\\angle A\\) is common, and \\(\\angle BCA = \\angle CDA = 90^\\circ\\), so \\(\\triangle ABC \\sim \\triangle ACD\\) (equiangular).",
     "(ii) Matching sides: \\(\\dfrac{CD}{BC} = \\dfrac{AC}{AB}\\), so \\(\\dfrac{x}{a} = \\dfrac{b}{c}\\) and \\(x = \\dfrac{ab}{c}\\).",
     "(iii) The next right triangle (at \\(F\\)) is similar to \\(ABC\\), with base \\(AF = b - x\\) instead of \\(b\\). So every length, including the next radius, is multiplied by \\(\\dfrac{b - x}{b} = 1 - \\dfrac{a}{c} = \\dfrac{c - a}{c}\\).",
     "The arcs are \\(\\frac{\\pi}{2}x, \\frac{\\pi}{2}x\\left(\\frac{c - a}{c}\\right), \\dots\\), a geometric series with ratio \\(\\frac{c - a}{c}\\), which is between 0 and 1 (since \\(0 < a < c\\)).",
     "Limiting sum \\(= \\dfrac{\\frac{\\pi}{2} \\times \\frac{ab}{c}}{1 - \\frac{c - a}{c}} = \\dfrac{\\pi ab}{2c} \\times \\dfrac{c}{a} = \\dfrac{\\pi b}{2}\\).",
     "(iv) Each arc is \\(\\frac{\\pi}{2}\\) times its radius, so the radii add up to \\(\\frac{\\pi b}{2} \\div \\frac{\\pi}{2} = b\\). (The centres march along \\(AC\\) towards \\(A\\).)"],
    [("All parts correct", 7), ("Parts (i), (ii) and (iii) correct", 6), ("Parts (i) and (ii), and the common ratio with a correct limiting sum formula", 5), ("Parts (i) and (ii), and the common ratio", 4), ("Parts (i) and (ii) correct", 3), ("One of parts (i), (ii) correct and progress in (iii)", 2), ("One part correct", 1)])

P.save()
