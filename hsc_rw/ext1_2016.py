"""Trialbank versions of the 2016 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math
import numpy as np
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, tan, exp, log, symbols, integrate, diff, simplify, atan, limit
from rw import Paper
from fig import Plot, INK
x, t, y = symbols('x t y', real=True)
P = Paper('hsc-ext1-2016', seed=2016)
M = lambda s: '\\(' + s + '\\)'
GREY = '#8a909c'; PI = math.pi
def circle(pl, cx, cy, r): pl.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="1.5"/>' % (pl.X(cx), pl.Y(cy), round(pl.X(r) - pl.X(0), 1), INK))
def seg(pl, A, B, w=1.3): pl.line(A[0], A[1], B[0], B[1], width=w)
def second_hit(Pt, D, r=1.0):
    """second point where the line from Pt (on or outside the circle) in direction D meets x^2+y^2=r^2"""
    D = np.array(D, float) / np.linalg.norm(D); Pt = np.array(Pt, float)
    b = 2 * Pt.dot(D); c = Pt.dot(Pt) - r * r; disc = math.sqrt(b * b - 4 * c)
    return Pt + (-b - disc) / 2 * D, Pt + (-b + disc) / 2 * D

# Q1 sigma notation
assert sum(3 * k - 1 for k in range(1, 16)) == sum(range(2, 45, 3)) and [3 * k - 1 for k in (1, 2, 3, 15)] == [2, 5, 8, 44]
P.M('q01', "Which sum is equal to \\(\\displaystyle\\sum_{k=1}^{15} (3k - 1)\\)?",
    M('2 + 5 + 8 + \\cdots + 44'), [M('-1 + 2 + 5 + \\cdots + 44'), M('2 + 3 + 4 + \\cdots + 15'), M('1 + 2 + 3 + \\cdots + 15')],
    "Substitute \\(k = 1, 2, 3, \\dots, 15\\): \\(3(1) - 1 = 2\\), \\(3(2) - 1 = 5\\), \\(3(3) - 1 = 8\\), up to \\(3(15) - 1 = 44\\). Starting at \\(-1\\) would be \\(k = 0\\), which is not included.")

# Q2 remainder theorem
p2 = 3 * x**3 - 8 * x**2 + 5 * x + 1; qq, rr = sp.div(p2, x - 3); assert rr == 25 and qq == 3 * x**2 + x + 8 and p2.subs(x, -3) == -167
P.M('q02', "What is the remainder when \\(3x^3 - 8x^2 + 5x + 1\\) is divided by \\(x - 3\\)?",
    M('25'), [M('-167'), M('3x^2 + x + 8'), M('-3x^2 - x - 8')],
    "By the remainder theorem the remainder is \\(P(3) = 81 - 72 + 15 + 1 = 25\\). \\(3x^2 + x + 8\\) is the quotient, not the remainder, and \\(-167\\) is \\(P(-3)\\).")

# Q3 compound angle
assert all(abs((math.tan(3 * v) + math.tan(v)) / (1 - math.tan(3 * v) * math.tan(v)) - math.tan(4 * v)) < 1e-9 for v in [0.1, 0.2, 0.33])
P.M('q03', "Which expression is equivalent to \\(\\dfrac{\\tan 3x + \\tan x}{1 - \\tan 3x\\tan x}\\)?",
    M('\\tan 4x'), [M('\\tan 2x'), M('\\tan 3x'), M('\\dfrac{\\tan 3x + 1}{1 - \\tan 3x}')],
    "This is the expansion of \\(\\tan(A + B) = \\frac{\\tan A + \\tan B}{1 - \\tan A\\tan B}\\) with \\(A = 3x\\) and \\(B = x\\), so it equals \\(\\tan 4x\\). (A minus sign on top would give \\(\\tan 2x\\).)")

# Q4 tangent, midpoint of a chord, reflex angle
O = np.array([0.0, 0.0]); T = np.array([2.2, 0.0]); d0 = 2.2
phiA = -math.acos(1 / d0); A_ = np.array([math.cos(phiA), math.sin(phiA)])        # lower tangent point
assert abs((A_ - T).dot(A_)) < 1e-12
uTA = (A_ - T) / np.linalg.norm(A_ - T); ang = math.radians(50)
rot = lambda v, a: np.array([v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a)])
uTB = rot(uTA, -ang)        # turn 50 degrees up from TA
B_, C_ = second_hit(T, uTB)
Dm = (B_ + C_) / 2; assert abs(math.degrees(math.acos(uTA.dot(uTB))) - 50) < 1e-9 and abs((Dm - O).dot(uTB)) < 1e-9
vD, vA = Dm - O, A_ - O; inner = math.degrees(math.acos(vD.dot(vA) / np.linalg.norm(vD) / np.linalg.norm(vA))); assert abs(inner - 130) < 1e-6
pl = Plot(-1.4, 2.6, -1.35, 1.25, w=380); circle(pl, 0, 0, 1)
seg(pl, C_, T); seg(pl, T, A_ + 0.35 * (A_ - T) / np.linalg.norm(A_ - T)); seg(pl, O, Dm, 1.1); seg(pl, O, A_, 1.1); pl.dot(0, 0, 2.5)
for P_, lab, dx_, dy_ in [(C_, 'C', -8, -6), (B_, 'B', 6, -8), (Dm, 'D', 0, -9), (A_, 'A', -2, 16), (T, 'T', 10, 4), (O, 'O', 10, 4)]: pl.text(P_[0], P_[1], lab, dx=dx_, dy=dy_, var=True)
pl.raw('<path d="M%s,%sA34,34 0 0 1 %s,%s" fill="none" stroke="%s"/>' % (round(pl.X(T[0]) + 34 * uTB[0], 1), round(pl.Y(T[1]) - 34 * uTB[1], 1), round(pl.X(T[0]) + 34 * uTA[0], 1), round(pl.Y(T[1]) - 34 * uTA[1], 1), INK))
pl.text(T[0], T[1], '50°', dx=-52, dy=4, size=12); pl.text(2.5, -1.2, 'NOT TO SCALE', anchor='end', size=11)
P.M('q04', "In the diagram, \\(O\\) is the centre of the circle \\(ABC\\), \\(D\\) is the midpoint of \\(BC\\), \\(AT\\) is the tangent at \\(A\\) and \\(\\angle ATB = 50^\\circ\\)." + pl.svg() + "What is the size of the reflex angle \\(DOA\\)?",
    M('230^\\circ'), [M('100^\\circ'), M('130^\\circ'), M('260^\\circ')],
    "\\(OD \\perp BC\\) (the line from the centre to the midpoint of a chord) and \\(OA \\perp AT\\) (radius and tangent). In quadrilateral \\(ODTA\\) the angles add to \\(360^\\circ\\), so the non-reflex \\(\\angle DOA = 360^\\circ - 90^\\circ - 90^\\circ - 50^\\circ = 130^\\circ\\). The reflex angle is \\(360^\\circ - 130^\\circ = 230^\\circ\\).")

# Q5 cos squared primitive
F5 = (x + sin(6 * x) / 6) / 2; assert simplify(diff(F5, x) - cos(3 * x)**2) == 0
P.M('q05', "Which expression is equal to \\(\\displaystyle\\int \\cos^2 3x\\,dx\\)?",
    M('\\frac{1}{2}\\left(x + \\frac{1}{6}\\sin 6x\\right) + c'), [M('\\frac{1}{2}\\left(x - \\frac{1}{6}\\sin 6x\\right) + c'), M('\\dfrac{\\cos^3 3x}{9} + c'), M('\\dfrac{-\\sin^3 3x}{9} + c')],
    "\\(\\cos^2 3x = \\frac{1}{2}(1 + \\cos 6x)\\), so the primitive is \\(\\frac{1}{2}\\left(x + \\frac{1}{6}\\sin 6x\\right) + c\\). You can't integrate a power of cos like a power of \\(x\\).")

# Q6 general solution
c6 = sp.solve(2 * y**2 + 5 * y - 3, y); assert set(c6) == {Q(1, 2), -3}
assert all(abs(2 * math.cos(v)**2 + 5 * math.cos(v) - 3) < 1e-12 for v in [PI / 3, -PI / 3, 2 * PI + PI / 3, 4 * PI - PI / 3])
P.M('q06', "What is the general solution of the equation \\(2\\cos^2 x + 5\\cos x - 3 = 0\\)?",
    M('2n\\pi \\pm \\frac{\\pi}{3}'), [M('n\\pi \\pm \\frac{\\pi}{3}'), M('2n\\pi \\pm \\frac{\\pi}{6}'), M('n\\pi + (-1)^n\\frac{\\pi}{3}')],
    "\\((2\\cos x - 1)(\\cos x + 3) = 0\\). \\(\\cos x = -3\\) is impossible, so \\(\\cos x = \\frac{1}{2}\\), giving \\(x = 2n\\pi \\pm \\frac{\\pi}{3}\\). The form \\(n\\pi + (-1)^n\\alpha\\) is the general solution for sine, not cosine.")

# Q7 maximum velocity in SHM
vmax = max(abs(21 * math.cos(3 * s) - 72 * math.sin(3 * s)) for s in [i * 1e-4 for i in range(25000)]); assert abs(vmax - 75) < 1e-3
P.M('q07', "The displacement \\(x\\) of a particle at time \\(t\\) is given by \\(x = 7\\sin 3t + 24\\cos 3t\\). What is the maximum velocity of the particle?",
    M('75'), [M('25'), M('31'), M('93')],
    "\\(x = 25\\sin(3t + \\alpha)\\) since \\(\\sqrt{7^2 + 24^2} = 25\\). So \\(\\dot{x} = 75\\cos(3t + \\alpha)\\), with maximum 75. (25 is the amplitude, not the speed.)")

# Q8 at least one
n8 = math.comb(16, 9) - math.comb(12, 9); assert n8 == 11220
P.M('q08', "A team of 9 players is to be chosen from a squad of 16. Among the 16 players are 4 goalkeepers. How many possible teams contain at least 1 goalkeeper?",
    M('11\\,220'), [M('6435'), M('11\\,440'), M('25\\,740')],
    "Count all teams and subtract those with no goalkeeper: \\(\\binom{16}{9} - \\binom{12}{9} = 11\\,440 - 220 = 11\\,220\\). Choosing one goalkeeper first and then any 8 others (\\(4 \\times \\binom{15}{8} = 25\\,740\\)) counts many teams more than once.")

# Q9 reading f, f', f'' at a point
f9 = x**3 * exp(Q(3, 2) - Q(3, 2) * x) / 2
v0, v1, v2 = [float(e.subs(x, 1)) for e in (f9, diff(f9, x), diff(f9, x, 2))]
assert v2 < 0 < v0 < v1 < 1 and abs(v0 - 0.5) < 1e-12 and abs(v1 - 0.75) < 1e-12 and float(f9.subs(x, 2)) < 1
ff = sp.lambdify(x, f9)
pl = Plot(-0.3, 5.3, -0.25, 1.35, w=400, h=230)
for gx in [i * 0.5 for i in range(1, 11)]: pl.line(gx, -0.25, gx, 1.35, width=0.5, colour='#e6e8ec')
for gy in (0.25, 0.5, 0.75, 1.0, 1.25): pl.line(-0.3, gy, 5.3, gy, width=0.5, colour='#e6e8ec')
pl.line(-0.3, 1, 5.3, 1, dash='3 3', colour=GREY, width=1); pl.axes(xt=[1, 2, 3, 4, 5], yt=[0.5, 1])
pl.curve(ff, 0, 5.3); pl.dot(1, v0, 3); pl.text(1, v0, '(1, f(1))', dx=-8, dy=-8, anchor='end', var=True, size=13); pl.text(4.2, ff(4.2), 'y = f(x)', dy=-10, var=True, size=13)
P.M('q09', "The diagram shows the graph of \\(y = f(x)\\), drawn to scale." + pl.svg() + "Which of the following is a correct statement?",
    M("f''(1) < f(1) < f'(1) < 1"), [M("f(1) < f''(1) < f'(1) < 1"), M("f''(1) < f'(1) < f(1) < 1"), M("f(1) < f'(1) < 1 < f''(1)")],
    "From the graph \\(f(1) = 0.5\\). At \\(x = 1\\) the curve is rising, but less steeply than a gradient of 1 (about 0.75 using the grid), and it is bending downwards (concave down), so \\(f''(1) < 0\\). That gives \\(f''(1) < f(1) < f'(1) < 1\\).")

# Q10 sign facts of a cubic
def cub(a, r): return lambda X: a * (X - r[0]) * (X - r[1]) * (X - r[2])
rA = (-2, -0.5, 4); aA = -1
pa = sp.expand(-(x + 2) * (x + Q(1, 2)) * (x - 4)); cf = sp.Poly(pa, x).all_coeffs(); assert cf[0] < 0 and cf[1] > 0 and cf[3] == 4
opts10 = [(aA, rA, 4), (1, (2, 0.5, -4), 4), (-1, (2, -0.5, -4), 4), (1, (-2, -0.5, 4), -4)]
for a_, r_, y0 in opts10: assert abs(cub(a_, r_)(0) - y0) < 1e-12
def g10(a_, r_, y0):
    pl = Plot(-5.2, 5.2, -14, 14, w=210, h=230); pl.axes(xt=[], yt=[y0], ytl=[('−' if y0 < 0 else '') + str(abs(y0))]); pl.curve(cub(a_, r_), -5.2, 5.2, width=2); return pl.svg()
gs = [g10(*o) for o in opts10]
P.M('q10', "Consider the polynomial \\(p(x) = ax^3 + bx^2 + cx + 4\\), where \\(a\\) is negative and \\(b\\) is positive. Which graph could represent \\(p(x)\\)?",
    gs[0], gs[1:],
    "\\(p(0) = 4\\), so the \\(y\\)-intercept is 4. \\(a < 0\\), so the graph rises on the left and falls on the right. The sum of the roots is \\(-\\frac{b}{a}\\), which is positive (\\(b > 0\\), \\(a < 0\\)), so the roots must add to a positive number: two small negative roots and one larger positive root, as in the graph with roots near \\(-2\\), \\(-\\frac{1}{2}\\) and \\(4\\).")

# Q11(a)
assert all(abs((v**3 + 5 - 5) ** (1 / 3) - v) < 1e-9 for v in [0.5, 2, 3.1])
P.W('q11a', 2, "Find the inverse of the function \\(y = x^3 + 5\\).",
    ["Swap \\(x\\) and \\(y\\): \\(x = y^3 + 5\\).", "\\(y^3 = x - 5\\), so \\(y = \\sqrt[3]{x - 5}\\)."],
    [("Correct inverse", 2), ("Swaps \\(x\\) and \\(y\\) and makes progress", 1)])

# Q11(b)
F11 = Q(2, 5) * (x + 3)**Q(5, 2) - 2 * (x + 3)**Q(3, 2); assert all(abs(float((diff(F11, x) - x * sqrt(x + 3)).subs(x, v))) < 1e-12 for v in [-2, 0.5, 4])
P.W('q11b', 3, "Use the substitution \\(u = x + 3\\) to find \\(\\displaystyle\\int x\\sqrt{x + 3}\\,dx\\).",
    ["\\(du = dx\\) and \\(x = u - 3\\).", "\\(\\displaystyle\\int (u - 3)u^{\\frac{1}{2}}\\,du = \\int \\left(u^{\\frac{3}{2}} - 3u^{\\frac{1}{2}}\\right)du = \\frac{2}{5}u^{\\frac{5}{2}} - 2u^{\\frac{3}{2}} + C\\)", "\\(= \\frac{2}{5}(x + 3)^{\\frac{5}{2}} - 2(x + 3)^{\\frac{3}{2}} + C\\)"],
    [("Correct primitive in terms of \\(x\\)", 3), ("Correct primitive in terms of \\(u\\)", 2), ("Correct integrand in terms of \\(u\\)", 1)])

# Q11(c)
assert simplify(diff(4 * atan(3 * x), x) - 12 / (1 + 9 * x**2)) == 0
P.W('q11c', 2, "Differentiate \\(4\\tan^{-1}(3x)\\).",
    ["\\(\\dfrac{d}{dx}\\left[4\\tan^{-1}(3x)\\right] = 4 \\times \\dfrac{3}{1 + (3x)^2} = \\dfrac{12}{1 + 9x^2}\\)"],
    [("Correct derivative", 2), ("Correct derivative of \\(\\tan^{-1}\\) without the chain rule factor, or similar error", 1)])

# Q11(d)
assert limit(3 * sin(x) * cos(x) / (4 * x), x, 0) == Q(3, 4)
P.W('q11d', 2, "Evaluate \\(\\displaystyle\\lim_{x \\to 0}\\left(\\frac{3\\sin x\\cos x}{4x}\\right)\\).",
    ["\\(\\dfrac{3\\sin x\\cos x}{4x} = \\dfrac{3}{4} \\times \\dfrac{\\sin x}{x} \\times \\cos x\\)", "As \\(x \\to 0\\), \\(\\frac{\\sin x}{x} \\to 1\\) and \\(\\cos x \\to 1\\), so the limit is \\(\\frac{3}{4}\\)."],
    [("Correct value", 2), ("Uses \\(\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1\\)", 1)])

# Q11(e)
sol = sp.solve_univariate_inequality(5 / (2 * x + 3) - x > 0, x, relational=False)
assert sol == sp.Union(sp.Interval.open(-sp.oo, Q(-5, 2)), sp.Interval.open(Q(-3, 2), 1))
P.W('q11e', 3, "Solve \\(\\dfrac{5}{2x + 3} - x > 0\\).",
    ["Multiply by \\((2x + 3)^2 > 0\\): \\(5(2x + 3) - x(2x + 3)^2 > 0\\), so \\((2x + 3)(5 - 2x^2 - 3x) > 0\\).", "\\(5 - 2x^2 - 3x = -(2x + 5)(x - 1)\\), so \\((2x + 3)(2x + 5)(x - 1) < 0\\).",
     "Critical values \\(-\\frac{5}{2}\\), \\(-\\frac{3}{2}\\), 1. Testing the regions: \\(x < -\\frac{5}{2}\\) or \\(-\\frac{3}{2} < x < 1\\)."],
    [("Correct solution", 3), ("All critical values with one error in the regions", 2), ("Multiplies by \\((2x + 3)^2\\), or finds the critical values", 1)])

# Q11(f)
pA = 3 * Q(2, 3) * Q(1, 3)**2; pB = 1 - Q(1, 3)**5 - 5 * Q(2, 3) * Q(1, 3)**4; assert pA == Q(2, 9) and pB == Q(232, 243)
P.W('q11f', 3, "A netball player works out that the probability of her scoring with each shot from a certain spot is \\(\\dfrac{2}{3}\\).<br>(i) Find the probability that she scores with exactly one of her first three shots. <b>1</b><br>(ii) Find the probability that she scores with at least two of her first five shots. <b>2</b>",
    ["(i) \\(\\binom{3}{1}\\left(\\frac{2}{3}\\right)\\left(\\frac{1}{3}\\right)^2 = \\frac{6}{27} = \\frac{2}{9}\\)", "(ii) \\(1 - P(0) - P(1) = 1 - \\left(\\frac{1}{3}\\right)^5 - \\binom{5}{1}\\left(\\frac{2}{3}\\right)\\left(\\frac{1}{3}\\right)^4 = 1 - \\frac{1}{243} - \\frac{10}{243} = \\frac{232}{243}\\)"],
    [("Both parts correct", 3), ("Part (i), and a correct method in (ii)", 2), ("Part (i) correct, or a correct expression for \\(P(0)\\) and \\(P(1)\\)", 1)])

# Q12(a) cone related rates
h = symbols('h', positive=True); V = pi * (h / 3)**2 * h / 3; dVdh = diff(V, h); assert simplify(dVdh - pi * h**2 / 9) == 0
Ar = pi * (h / 3)**2; dhdt = -Q(6, 100) / diff(Ar, h); assert simplify(dhdt + Q(27, 100) / (pi * h)) == 0
dVdt = simplify(dVdh * dhdt); assert simplify(dVdt.subs(h, 12) + Q(36, 100)) == 0
pl = Plot(-7.5, 10.5, -0.8, 20.5, w=260)
pl.region([(0, 0), (-2, 6), (2, 6)], colour='#dfe5f6')
pl.raw('<ellipse cx="%s" cy="%s" rx="%s" ry="9" fill="none" stroke="%s" stroke-width="1.4"/>' % (pl.X(0), pl.Y(18), round(pl.X(6) - pl.X(0), 1), INK))
seg(pl, (-6, 18), (0, 0)); seg(pl, (6, 18), (0, 0))
pl.raw('<ellipse cx="%s" cy="%s" rx="%s" ry="4" fill="#dfe5f6" stroke="%s" stroke-width="1.1"/>' % (pl.X(0), pl.Y(6), round(pl.X(2) - pl.X(0), 1), INK))
pl.line(0, 18, 6, 18, width=1.1); pl.text(3, 18, '6 cm', dy=-12, size=12); pl.line(0, 6, 2, 6, width=1); pl.text(1, 6, 'r', dy=-7, var=True, size=13)
pl.line(8.4, 0, 8.4, 18, width=1, arrow=True); pl.line(8.4, 18, 8.4, 0, width=1, arrow=True); pl.text(8.4, 9, '18 cm', dx=-6, anchor='end', size=12)
pl.line(3.6, 0, 3.6, 6, width=1, arrow=True); pl.line(3.6, 6, 3.6, 0, width=1, arrow=True); pl.text(3.6, 3, 'h', dx=6, anchor='start', var=True, size=13)
P.W('q12a', 6, "The diagram shows a conical funnel with radius 6 cm and height 18 cm, held with its point downwards." + pl.svg() + "At time \\(t\\) seconds, the top surface of the liquid in the funnel is a circle of radius \\(r\\) cm and the depth of the liquid is \\(h\\) cm. The volume of liquid is \\(V = \\frac{1}{3}\\pi r^2h\\).<br>"
    "(i) Explain why \\(r = \\dfrac{h}{3}\\). <b>1</b><br>(ii) Show that \\(\\dfrac{dV}{dh} = \\dfrac{\\pi}{9}h^2\\). <b>1</b><br>"
    "The liquid drains out so that the area of the top surface is decreasing at a constant rate of 0.06 cm² s⁻¹.<br>(iii) Show that \\(\\dfrac{dh}{dt} = \\dfrac{-0.27}{\\pi h}\\). <b>2</b><br>(iv) What is the rate of change of the volume of the liquid when \\(h = 12\\)? <b>2</b>",
    ["(i) The liquid forms a cone similar to the funnel, so \\(\\frac{r}{h} = \\frac{6}{18} = \\frac{1}{3}\\).", "(ii) \\(V = \\frac{1}{3}\\pi\\left(\\frac{h}{3}\\right)^2h = \\frac{\\pi h^3}{27}\\), so \\(\\frac{dV}{dh} = \\frac{\\pi h^2}{9}\\).",
     "(iii) Area \\(A = \\pi r^2 = \\frac{\\pi h^2}{9}\\), so \\(\\frac{dA}{dt} = \\frac{2\\pi h}{9}\\frac{dh}{dt} = -0.06\\), giving \\(\\frac{dh}{dt} = \\frac{-0.06 \\times 9}{2\\pi h} = \\frac{-0.27}{\\pi h}\\).",
     "(iv) \\(\\frac{dV}{dt} = \\frac{dV}{dh} \\times \\frac{dh}{dt} = \\frac{\\pi h^2}{9} \\times \\frac{-0.27}{\\pi h} = -0.03h\\). When \\(h = 12\\): \\(-0.36\\) cm³ s⁻¹ (the volume is decreasing at 0.36 cm³ per second)."],
    [("All parts correct", 6), ("Three parts correct and progress in the fourth", 5), ("Three parts correct", 4), ("Two parts correct and progress in another", 3), ("Two parts correct", 2), ("One part correct", 1)])

# Q12(b) growth towards a total
k12 = Q(3, 400); X12 = 400 - 400 * exp(-k12 * t); assert simplify(diff(X12, t) - k12 * (400 - X12)) == 0 and X12.subs(t, 0) == 0 and diff(X12, t).subs(t, 0) == 3
P.W('q12b', 5, "In a chemical reaction, compound \\(X\\) is formed from compound \\(Y\\). The masses of \\(X\\) and \\(Y\\) in grams are \\(x(t)\\) and \\(y(t)\\), where \\(t\\) is the time in seconds after the reaction starts. Throughout the reaction the two masses add to 400 g. At any time, the rate at which the mass of \\(X\\) increases is proportional to the mass of \\(Y\\). At the start, \\(x = 0\\) and \\(\\dfrac{dx}{dt} = 3\\).<br>"
    "(i) Show that \\(\\dfrac{dx}{dt} = 0.0075(400 - x)\\). <b>3</b><br>(ii) Show that \\(x = 400 - Ae^{-0.0075t}\\) satisfies the equation in part (i), and find the value of \\(A\\). <b>2</b>",
    ["(i) \\(\\frac{dx}{dt} = ky\\) for a constant \\(k\\), and \\(y = 400 - x\\), so \\(\\frac{dx}{dt} = k(400 - x)\\).", "At \\(t = 0\\): \\(3 = k(400 - 0)\\), so \\(k = \\frac{3}{400} = 0.0075\\). So \\(\\frac{dx}{dt} = 0.0075(400 - x)\\).",
     "(ii) \\(\\frac{dx}{dt} = 0.0075Ae^{-0.0075t}\\), and \\(400 - x = Ae^{-0.0075t}\\), so \\(\\frac{dx}{dt} = 0.0075(400 - x)\\).", "At \\(t = 0\\), \\(x = 0\\): \\(0 = 400 - A\\), so \\(A = 400\\)."],
    [("Both parts correct", 5), ("Part (i), and part (ii) with one error", 4), ("Part (i) correct, or part (ii) correct with progress in (i)", 3), ("Writes \\(\\frac{dx}{dt} = k(400 - x)\\), or part (ii) correct", 2), ("Writes \\(y = 400 - x\\), or verifies part of (ii)", 1)])

# Q12(c) perpendicular tangents and Newton's method
al = math.asin(math.sqrt(2) - 1); assert abs(2 * math.tan(al) - math.cos(al)) < 1e-12
assert abs((2 / math.cos(al)**2) * (-math.sin(al)) + 1) < 1e-12
fN = lambda v: 2 * math.tan(v) - math.cos(v); fNp = lambda v: 2 / math.cos(v)**2 + math.sin(v); x2 = 0.5 - fN(0.5) / fNp(0.5); assert round(x2, 2) == 0.43
pl = Plot(-0.35, 2.0, -0.6, 2.4, w=300); pl.line(PI / 2, -0.6, PI / 2, 2.4, dash='3 3', colour=GREY, width=1)
pl.axes(xt=[al, PI / 2], xtl=['α', 'π⁄2'], yt=[1])
pl.curve(lambda X: 2 * math.tan(X), -0.25, 0.95); pl.curve(math.cos, -0.3, 1.95)
pl.text(0.9, 2 * math.tan(0.9), 'y = 2 tan x', dx=8, anchor='start', var=True, size=13); pl.text(1.85, math.cos(1.85), 'y = cos x', dy=18, anchor='end', var=True, size=13)
P.W('q12c', 4, "The graphs of \\(y = 2\\tan x\\) and \\(y = \\cos x\\) meet at the point where \\(x = \\alpha\\), as shown." + pl.svg() +
    "(i) Show that the tangents to the curves at \\(x = \\alpha\\) are perpendicular. <b>2</b><br>(ii) Use one application of Newton's method with \\(x_1 = 0.5\\) to find an approximate value for \\(\\alpha\\). Give your answer correct to two decimal places. <b>2</b>",
    ["(i) The gradients at \\(\\alpha\\) are \\(m_1 = 2\\sec^2\\alpha\\) and \\(m_2 = -\\sin\\alpha\\), so \\(m_1m_2 = -\\dfrac{2\\sin\\alpha}{\\cos^2\\alpha}\\).",
     "At the meeting point \\(2\\tan\\alpha = \\cos\\alpha\\), that is \\(2\\sin\\alpha = \\cos^2\\alpha\\). So \\(m_1m_2 = -\\dfrac{\\cos^2\\alpha}{\\cos^2\\alpha} = -1\\), and the tangents are perpendicular.",
     "(ii) Let \\(f(x) = 2\\tan x - \\cos x\\), so \\(f'(x) = 2\\sec^2 x + \\sin x\\).", "\\(x_2 = 0.5 - \\dfrac{2\\tan 0.5 - \\cos 0.5}{2\\sec^2 0.5 + \\sin 0.5} \\approx 0.5 - \\dfrac{0.2150}{3.0762} \\approx 0.43\\)"],
    [("Both parts correct", 4), ("One part correct and progress in the other", 3), ("One part correct", 2), ("Correct gradients, or a correct Newton's method expression", 1)])

# Q13(a) tide
n13 = 2 * PI / 12.4; assert abs(n13 - 5 * PI / 31) < 1e-12
xt = lambda T: 5 + 3 * math.cos(n13 * T); assert xt(0) == 8 and abs(xt(6.2) - 2) < 1e-12
vt = lambda T: -3 * n13 * math.sin(n13 * T); tmax = max((i * 1e-4 for i in range(0, 124001)), key=vt); assert abs(tmax - 9.3) < 1e-3
P.W('q13a', 4, "The tide at a harbour can be modelled using simple harmonic motion. High tide is 8 metres and low tide is 2 metres, and the tide completes 2 full periods every 24.8 hours. Let \\(t\\) be the time in hours after the first high tide today.<br>"
    "(i) Explain why the tide can be modelled by \\(x = 5 + 3\\cos\\left(\\dfrac{5\\pi}{31}t\\right)\\). <b>2</b><br>(ii) The first high tide tomorrow is at 3 am. What is the earliest time tomorrow at which the tide is rising at the fastest rate? <b>2</b>",
    ["(i) The centre of motion is halfway between 8 and 2, at 5 m, and the amplitude is 3 m.", "The period is \\(\\frac{24.8}{2} = 12.4\\) hours, so \\(n = \\frac{2\\pi}{12.4} = \\frac{5\\pi}{31}\\). At \\(t = 0\\) it is high tide (\\(x = 8\\)), so cos is the right function: \\(x = 5 + 3\\cos\\left(\\frac{5\\pi}{31}t\\right)\\).",
     "(ii) \\(\\dot{x} = -\\frac{15\\pi}{31}\\sin\\left(\\frac{5\\pi}{31}t\\right)\\), which is largest when \\(\\sin\\left(\\frac{5\\pi}{31}t\\right) = -1\\), that is \\(\\frac{5\\pi}{31}t = \\frac{3\\pi}{2}\\): \\(t = 9.3\\) hours (three quarters of a period after high tide).",
     "9.3 hours = 9 hours 18 minutes after 3 am, which is 12:18 pm."],
    [("Both parts correct", 4), ("Part (i), and finds \\(t = 9.3\\) hours", 3), ("Part (i) correct, or part (ii) correct", 2), ("Correct centre and amplitude, or correct period", 1)])

# Q13(b) projectile hits a wall, then rebounds
u, th = 24, PI / 6; Hm = u**2 * math.sin(th)**2 / 20; assert abs(Hm - 7.2) < 1e-12 and abs(15 + Hm - 111 / 5) < 1e-12
tf = math.sqrt(2 * 22.2 / 10); dist = 8 * tf; assert abs(tf - 2.107) < 1e-3 and abs(dist - 16.86) < 0.01
xw = 24 * math.cos(th) * (24 * math.sin(th) / 10)
pl = Plot(-2.5, 28.5, -1.5, 26, w=360)
pl.region([(-2.5, 0), (xw + 1.5, 0), (xw + 1.5, -1.2), (-2.5, -1.2)], colour='#e6e8ec'); pl.line(-2.5, 0, xw + 1.5, 0)
pl.line(0, 0, 0, 15); pl.line(-2.5, 15, 0, 15); pl.line(xw, 0, xw, 25.5, width=2.2)
pl.curve(lambda X: 15 + X * math.tan(th) - 5 * X * X / (24 * math.cos(th))**2, 0, xw, dash='5 4', width=1.4)
pl.line(0, 15, 4.5, 15 + 4.5 * math.tan(th), width=1.6, arrow=True); pl.text(4.5, 15 + 4.5 * math.tan(th), '24 m s⁻¹', dx=-4, dy=-8, anchor='end', size=12)
pl.line(0, 15, 6, 15, dash='3 3', colour=GREY, width=1); pl.text(4.4, 15, '30°', dy=14, size=12)
pl.text(0, 7.5, '15 m', dx=6, anchor='start', size=12); pl.text(xw, 12, 'Wall', dx=8, anchor='start', size=12); pl.text(12, 0, 'Ground', dy=24, size=12)
P.W('q13b', 7, "A projectile fired with speed \\(u\\) m s⁻¹ at an angle \\(\\theta\\) to the horizontal follows \\(x = ut\\cos\\theta\\) and \\(y = ut\\sin\\theta - 5t^2\\), where \\(t\\) is the time in seconds.<br>"
    "(i) Prove that the greatest height reached by the projectile is \\(\\dfrac{u^2\\sin^2\\theta}{20}\\). <b>2</b><br>"
    "A ball is thrown from a point 15 m above horizontal ground, with speed 24 m s⁻¹ at an angle of \\(30^\\circ\\) to the horizontal. At its highest point the ball hits a vertical wall, as shown." + pl.svg() +
    "(ii) Show that the ball hits the wall at a height of \\(\\dfrac{111}{5}\\) m above the ground. <b>2</b><br>"
    "The ball then rebounds horizontally from the wall with speed 8 m s⁻¹. Take the acceleration due to gravity as 10 m s⁻².<br>(iii) How long does the ball take to reach the ground after it rebounds? <b>2</b><br>(iv) How far from the wall is the ball when it hits the ground? <b>1</b>",
    ["(i) \\(\\dot{y} = u\\sin\\theta - 10t = 0\\) at \\(t = \\frac{u\\sin\\theta}{10}\\). Then \\(y = \\frac{u^2\\sin^2\\theta}{10} - 5\\left(\\frac{u\\sin\\theta}{10}\\right)^2 = \\frac{u^2\\sin^2\\theta}{10} - \\frac{u^2\\sin^2\\theta}{20} = \\frac{u^2\\sin^2\\theta}{20}\\).",
     "(ii) Greatest height above the throw: \\(\\frac{24^2 \\times \\left(\\frac{1}{2}\\right)^2}{20} = \\frac{144}{20} = \\frac{36}{5}\\) m. Above the ground: \\(15 + \\frac{36}{5} = \\frac{111}{5}\\) m.",
     "(iii) After the rebound the ball starts with no vertical velocity, so it falls \\(\\frac{111}{5}\\) m with \\(5t^2 = \\frac{111}{5}\\): \\(t = \\sqrt{\\frac{111}{25}} = \\frac{\\sqrt{111}}{5} \\approx 2.11\\) s.",
     "(iv) Horizontal distance \\(= 8 \\times \\frac{\\sqrt{111}}{5} \\approx 16.9\\) m from the wall."],
    [("All parts correct", 7), ("Three parts correct and progress in the fourth", 6), ("Three parts correct", 5), ("Two parts correct and progress in another", 4), ("Two parts correct", 3), ("One part correct and progress in another", 2), ("One part correct", 1)])

# Q13(c) circle geometry, altitudes
Pd, Qd, R = np.array([-1.0, 0]), np.array([1.0, 0]), np.array([-0.25, 1.9])
S_ = second_hit(Pd, R - Pd)[1]; T_ = second_hit(Qd, R - Qd)[1]
if abs(np.linalg.norm(S_ - Pd)) < 1e-9: S_ = second_hit(Pd, R - Pd)[0]
if abs(np.linalg.norm(T_ - Qd)) < 1e-9: T_ = second_hit(Qd, R - Qd)[0]
assert abs(S_.dot(S_) - 1) < 1e-9 and abs(T_.dot(T_) - 1) < 1e-9 and np.linalg.norm(S_ - Pd) > 0.1 and np.linalg.norm(T_ - Qd) > 0.1
def inter(A, B, C, D):
    M_ = np.array([B - A, C - D]).T; s_ = np.linalg.solve(M_, C - A); return A + s_[0] * (B - A)
H_ = inter(Pd, T_, Qd, S_); assert abs(H_[0] - R[0]) < 1e-9    # RH produced is perpendicular to PQ
K_ = np.array([R[0], 0.0])
pl = Plot(-1.35, 1.35, -1.25, 2.15, w=300); circle(pl, 0, 0, 1)
for A, B in [(Pd, Qd), (R, Pd), (R, Qd), (Pd, T_), (Qd, S_), (R, K_)]: seg(pl, A, B)
pl.dot(0, 0, 2.5)
for q_, lab, dx_, dy_ in [(Pd, 'P', -10, 4), (Qd, 'Q', 10, 4), (R, 'R', 0, -8), (S_, 'S', -10, -2), (T_, 'T', 10, -2), (H_, 'H', 9, 6), (K_, 'K', -8, 16), (O, 'O', 0, 16)]: pl.text(q_[0], q_[1], lab, dx=dx_, dy=dy_, var=True)
P.W('q13c', 4, "\\(PQ\\) is a diameter of the circle with centre \\(O\\). From a point \\(R\\) outside the circle, the segments \\(RP\\) and \\(RQ\\) are drawn, meeting the circle at \\(S\\) and \\(T\\). The chords \\(PT\\) and \\(QS\\) meet at \\(H\\), and \\(RH\\) produced meets the diameter \\(PQ\\) at \\(K\\)." + pl.svg() +
    "(i) Show that \\(RSHT\\) is a cyclic quadrilateral. <b>2</b><br>(ii) Hence, or otherwise, prove that \\(RK\\) is perpendicular to \\(PQ\\). <b>2</b>",
    ["(i) \\(\\angle PSQ = 90^\\circ\\) and \\(\\angle PTQ = 90^\\circ\\) (angles in a semicircle). So \\(\\angle RSH = 90^\\circ\\) and \\(\\angle RTH = 90^\\circ\\) (adjacent supplementary angles on straight lines \\(RSP\\) and \\(RTQ\\)).",
     "Opposite angles \\(\\angle RSH + \\angle RTH = 180^\\circ\\), so \\(RSHT\\) is cyclic.",
     "(ii) In the cyclic quadrilateral \\(RSHT\\), \\(\\angle HRT = \\angle HST\\) (angles in the same segment, standing on \\(HT\\)). In the original circle, \\(\\angle QST = \\angle QPT\\) (angles in the same segment, standing on \\(QT\\)). So \\(\\angle KRQ = \\angle TPQ\\).",
     "In triangles \\(RKQ\\) and \\(PTQ\\): they share \\(\\angle RQK = \\angle PQT\\) and \\(\\angle KRQ = \\angle TPQ\\), so the third angles are equal: \\(\\angle RKQ = \\angle PTQ = 90^\\circ\\). So \\(RK \\perp PQ\\)."],
    [("Both parts correct with reasons", 4), ("Part (i), and progress in (ii)", 3), ("Part (i) correct, or part (ii) correct", 2), ("States an angle in a semicircle is \\(90^\\circ\\), with progress", 1)])

# Q14(a) induction with a factorised step
n = symbols('n', positive=True, integer=True)
assert sp.expand((n + 1) * (4 * n**2 + 20 * n + 15) - (4 * n**3 + 24 * n**2 + 35 * n + 15)) == 0
for N in range(1, 30): assert 3 * sum((2 * k - 1) * (2 * k + 3) for k in range(1, N + 1)) == N * (4 * N**2 + 12 * N - 1)
P.W('q14a', 4, "(i) Show that \\(4n^3 + 24n^2 + 35n + 15\\) can be written as \\((n + 1)(4n^2 + 20n + 15)\\). <b>1</b><br>"
    "(ii) Using the result in part (i), or otherwise, prove by mathematical induction that, for \\(n \\ge 1\\),<br>\\(1 \\times 5 + 3 \\times 7 + 5 \\times 9 + \\cdots + (2n - 1)(2n + 3) = \\dfrac{1}{3}n\\left(4n^2 + 12n - 1\\right)\\). <b>3</b>",
    ["(i) \\((n + 1)(4n^2 + 20n + 15) = 4n^3 + 20n^2 + 15n + 4n^2 + 20n + 15 = 4n^3 + 24n^2 + 35n + 15\\).",
     "(ii) <b>Step 1.</b> \\(n = 1\\): LHS \\(= 1 \\times 5 = 5\\), RHS \\(= \\frac{1}{3}(4 + 12 - 1) = 5\\). True.", "<b>Step 2.</b> Assume true for \\(n = k\\): \\(1 \\times 5 + \\cdots + (2k - 1)(2k + 3) = \\frac{1}{3}k(4k^2 + 12k - 1)\\).",
     "<b>Step 3.</b> For \\(n = k + 1\\) the next term is \\((2k + 1)(2k + 5)\\). LHS \\(= \\frac{1}{3}\\left[4k^3 + 12k^2 - k + 3(4k^2 + 12k + 5)\\right] = \\frac{1}{3}(4k^3 + 24k^2 + 35k + 15)\\)",
     "\\(= \\frac{1}{3}(k + 1)(4k^2 + 20k + 15)\\) by (i). And \\(4(k + 1)^2 + 12(k + 1) - 1 = 4k^2 + 20k + 15\\), so this is the RHS for \\(n = k + 1\\).", "So by mathematical induction it is true for all \\(n \\ge 1\\)."],
    [("Both parts correct", 4), ("Part (i), and significant progress in the inductive step", 3), ("Part (i), and proves the case \\(n = 1\\)", 2), ("Part (i) correct, or proves the case \\(n = 1\\)", 1)])

# Q14(b) binomial sums
for N in range(1, 15):
    assert sum(math.comb(N, r) * (3 * r - N) for r in range(1, N + 1)) == N * (2**(N - 1) + 1)
P.W('q14b', 4, "Consider the expansion of \\((1 + x)^n\\), where \\(n\\) is a positive integer.<br>(i) Show that \\(2^n = \\dbinom{n}{0} + \\dbinom{n}{1} + \\dbinom{n}{2} + \\cdots + \\dbinom{n}{n}\\). <b>1</b><br>"
    "(ii) Show that \\(n2^{n-1} = \\dbinom{n}{1} + 2\\dbinom{n}{2} + 3\\dbinom{n}{3} + \\cdots + n\\dbinom{n}{n}\\). <b>1</b><br>(iii) Hence, or otherwise, show that \\(\\displaystyle\\sum_{r=1}^{n} \\binom{n}{r}(3r - n) = n\\left(2^{n-1} + 1\\right)\\). <b>2</b>",
    ["(i) \\((1 + x)^n = \\sum_{r=0}^{n} \\binom{n}{r}x^r\\). Put \\(x = 1\\): \\(2^n = \\sum_{r=0}^{n} \\binom{n}{r}\\).", "(ii) Differentiate: \\(n(1 + x)^{n-1} = \\sum_{r=1}^{n} r\\binom{n}{r}x^{r-1}\\). Put \\(x = 1\\): \\(n2^{n-1} = \\sum_{r=1}^{n} r\\binom{n}{r}\\).",
     "(iii) \\(\\displaystyle\\sum_{r=1}^{n} \\binom{n}{r}(3r - n) = 3\\sum_{r=1}^{n} r\\binom{n}{r} - n\\sum_{r=1}^{n} \\binom{n}{r} = 3n2^{n-1} - n\\left(2^n - 1\\right)\\) (the second sum starts at \\(r = 1\\), so it is \\(2^n - \\binom{n}{0}\\)).",
     "\\(= 3n2^{n-1} - 2n2^{n-1} + n = n2^{n-1} + n = n\\left(2^{n-1} + 1\\right)\\)"],
    [("All parts correct", 4), ("Parts (i) and (ii), and progress in (iii)", 3), ("Two parts correct", 2), ("One part correct", 1)])

# Q14(c) parabola locus
tt = symbols('t', nonzero=True, real=True)
Tp = (4 * tt, 2 * tt**2); Dx = sp.solve(sp.Eq(-2, tt * x - 2 * tt**2), x)[0]; assert simplify(Dx - (2 * tt - 2 / tt)) == 0
Ry = sp.solve(sp.Eq(Dx + tt * y, 4 * tt + 2 * tt**3), y)[0]; assert simplify(Ry - (2 + 2 * tt**2 + 2 / tt**2)) == 0
assert simplify(Dx**2 - 2 * (Ry - 6)) == 0
ts = sp.solve(sp.Eq(diff(x**2 / 2 + 6, x).subs(x, Dx), tt), tt); assert set(ts) == {sqrt(2), -sqrt(2)}
tv = 1.25; Tq = (4 * tv, 2 * tv**2); Dq = (2 * tv - 2 / tv, -2); Rq = (Dq[0], 2 + 2 * tv**2 + 2 / tv**2)
pl = Plot(-6, 8, -3.4, 9.8, w=330)
pl.line(-6, -2, 8, -2, dash='4 4', colour=GREY, width=1); pl.line(Dq[0], -3.4, Dq[0], 9.8, dash='4 4', colour=GREY, width=1); pl.axes(xt=[], yt=[])
pl.curve(lambda X: X * X / 8, -6, 8); pl.curve(lambda X: tv * X - 2 * tv * tv, -1.6, 7.2, width=1.3); pl.curve(lambda X: Tq[1] - (X - Tq[0]) / tv, -3.5, 8, width=1.3)
for q_, lab, dx_, dy_, anc in [(Tq, 'T(4t, 2t²)', 8, 4, 'start'), (Dq, 'D', 8, 14, 'start'), (Rq, 'R', 8, -4, 'start')]: pl.dot(q_[0], q_[1], 3); pl.text(q_[0], q_[1], lab, dx=dx_, dy=dy_, anchor=anc, var=True, size=13)
pl.text(-5.6, 36 / 8 + 0.6, 'x² = 8y', anchor='start', var=True, size=13)
P.W('q14c', 7, "The point \\(T(4t, 2t^2)\\) lies on the parabola \\(\\mathcal{P}_1\\) with equation \\(x^2 = 8y\\), where \\(t \\ne 0\\). The tangent to \\(\\mathcal{P}_1\\) at \\(T\\) meets the directrix \\(y = -2\\) at \\(D\\). The normal to \\(\\mathcal{P}_1\\) at \\(T\\) meets the vertical line through \\(D\\) at \\(R\\), as shown." + pl.svg() +
    "(i) Show that \\(D\\) has coordinates \\(\\left(2t - \\dfrac{2}{t}, -2\\right)\\). <b>1</b><br>(ii) Show that the locus of \\(R\\) lies on another parabola \\(\\mathcal{P}_2\\). <b>3</b><br>(iii) State the focal length of \\(\\mathcal{P}_2\\). <b>1</b><br>"
    "It can be shown that the distance between \\(R\\) and \\(T\\) is smallest when the normal to \\(\\mathcal{P}_1\\) at \\(T\\) is also the normal to \\(\\mathcal{P}_2\\) at \\(R\\). (Do NOT prove this.)<br>(iv) Find the values of \\(t\\) for which the distance between \\(R\\) and \\(T\\) is smallest. <b>2</b>",
    ["(i) \\(y = \\frac{x^2}{8}\\), \\(\\frac{dy}{dx} = \\frac{x}{4} = t\\) at \\(T\\). Tangent: \\(y = tx - 2t^2\\). With \\(y = -2\\): \\(tx = 2t^2 - 2\\), so \\(x = 2t - \\frac{2}{t}\\).",
     "(ii) Normal at \\(T\\) (gradient \\(-\\frac{1}{t}\\)): \\(x + ty = 4t + 2t^3\\). At \\(x = 2t - \\frac{2}{t}\\): \\(ty = 2t + 2t^3 + \\frac{2}{t}\\), so \\(y = 2 + 2t^2 + \\frac{2}{t^2}\\).",
     "So \\(R = \\left(2t - \\frac{2}{t},\\ 2 + 2t^2 + \\frac{2}{t^2}\\right)\\). Then \\(X^2 = 4t^2 - 8 + \\frac{4}{t^2}\\), so \\(2t^2 + \\frac{2}{t^2} = \\frac{X^2}{2} + 4\\) and \\(Y = 2 + \\frac{X^2}{2} + 4\\).",
     "\\(X^2 = 2(Y - 6)\\): a parabola \\(\\mathcal{P}_2\\) with vertex \\((0, 6)\\).", "(iii) \\(X^2 = 4 \\times \\frac{1}{2}(Y - 6)\\), so the focal length is \\(\\frac{1}{2}\\).",
     "(iv) The gradient of \\(\\mathcal{P}_2\\) at \\(R\\) is \\(\\frac{dY}{dX} = X = 2t - \\frac{2}{t}\\). For the normal at \\(T\\) (gradient \\(-\\frac{1}{t}\\)) to be normal to \\(\\mathcal{P}_2\\), the tangent to \\(\\mathcal{P}_2\\) at \\(R\\) must have gradient \\(t\\).",
     "\\(2t - \\frac{2}{t} = t\\) gives \\(t^2 = 2\\), so \\(t = \\pm\\sqrt{2}\\)."],
    [("All parts correct", 7), ("Three parts correct and progress in the fourth", 6), ("Three parts correct", 5), ("Part (i), the coordinates of \\(R\\), and one more part", 4), ("Part (i) and the coordinates of \\(R\\)", 3), ("Part (i), or the equation of the normal", 2), ("Correct gradient of the tangent at \\(T\\)", 1)])

P.save()
