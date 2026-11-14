"""Trialbank versions of the 2023 Mathematics Extension 1 HSC questions that need a diagram. Diagrams are drawn by fig.py from the
maths below, and every answer is checked in code before it goes into a model answer. Run after ext1_2023.py (adds to the same paper)."""
import math, json, os
import sympy as sp
from sympy import Rational as Q, latex, sqrt, pi, sin, cos, log, symbols, integrate, diff, simplify, solve, nsolve
from rw import Paper, OUT
from fig import Plot, INK, fix
x, y, t, h, R, k, c = symbols('x y t h R k c', positive=True)
P = Paper('hsc-ext1-2023-fig', seed=20231)

# ---- Q3 direction field: read off where a solution crosses the y-axis
F = lambda X, Y: 0.3 * X * Y
yval = math.exp(0.15 * (0 - 4)); assert abs(yval - 0.5488) < 1e-3                     # exact solution y = e^{0.15(x^2 - 4)}
Y_ = [1.0]; step = 1e-4; X_ = -2.0
while X_ < 0: Y_[0] += F(X_, Y_[0]) * step; X_ += step                                  # and a numerical check of the same
assert abs(Y_[0] - yval) < 2e-3
pl = Plot(-3.4, 1.4, -0.25, 2.5, w=440)
for i in range(-6, 3):
    for j in range(1, 10):
        X0, Y0 = i * 0.5, j * 0.25; m_ = F(X0, Y0); sx = (pl.w - 2 * pl.pad) / (pl.b - pl.a); sy = (pl.h - 2 * pl.pad) / (pl.d - pl.c)
        L = math.hypot(sx, m_ * sy); ux, uy = 6.5 * sx / L, -6.5 * m_ * sy / L
        pl.raw(f'<path d="M{round(pl.X(X0) - ux, 1)},{round(pl.Y(Y0) - uy, 1)}L{round(pl.X(X0) + ux, 1)},{round(pl.Y(Y0) + uy, 1)}" stroke="{INK}" stroke-width="1.3"/>')
pl.axes(xt=[-3, -2, -1, 1], yt=[1, 2]); pl.dot(-2, 1); pl.text(-2, 1, '(−2, 1)', dx=-8, dy=-10, anchor='end')
P.M('q03', "The diagram shows the direction field of a differential equation. A particular solution of the differential equation passes through the point \\((-2, 1)\\)." + pl.svg() +
    "Which of these is closest to the \\(y\\)-value where this solution crosses the \\(y\\)-axis?",
    '\\(y = 0.55\\)', ['\\(y = 0.35\\)', '\\(y = 0.75\\)', '\\(y = 0.95\\)'],
    "Start at \\((-2, 1)\\) and follow the slopes to the right. Between \\(x = -2\\) and \\(x = 0\\) the slopes are negative but flatten out, so the curve falls and levels off as it reaches the \\(y\\)-axis at about \\(y = 0.55\\). (The field is \\(\\frac{dy}{dx} = 0.3xy\\), whose solution through \\((-2, 1)\\) is \\(y = e^{0.15(x^2 - 4)}\\), giving \\(e^{-0.6} \\approx 0.55\\) at \\(x = 0\\).)")

# ---- Q4 area between two curves when one dips below the x-axis
I_f, I_ab, I_bc = 14, -3, 5; area = I_f - (I_ab + I_bc); assert area == 12
pl = Plot(-0.3, 4.6, -1.6, 3.6, w=420)
fF = lambda X: 2.7 + 0.35 * math.sin(1.4 * X); gG = lambda X: 0.55 * (X - 2) * (1 + 0.15 * X)
for X in [i / 50 for i in range(50, 176)]: assert fF(X) > gG(X)
pl.axes(xt=[1, 2, 3.5], xtl=['a', 'b', 'c'], yt=[]); pl.curve(fF, 0.5, 4.1); pl.curve(gG, 0.5, 4.1)
pl.line(1, gG(1), 1, fF(1), dash='4 4', colour='#8a909c'); pl.line(3.5, 0, 3.5, fF(3.5), dash='4 4', colour='#8a909c')
pl.text(4.1, fF(4.1), 'y = f(x)', dx=6, dy=4, anchor='start', var=True); pl.text(4.1, gG(4.1), 'y = g(x)', dx=6, dy=4, anchor='start', var=True)
P.M('q04', "The diagram shows the graphs of \\(y = f(x)\\) and \\(y = g(x)\\)." + pl.svg() +
    "It is known that \\(\\displaystyle\\int_a^c f(x)\\,dx = 14\\), \\(\\displaystyle\\int_a^b g(x)\\,dx = -3\\) and \\(\\displaystyle\\int_b^c g(x)\\,dx = 5\\). What is the area between the curves \\(y = f(x)\\) and \\(y = g(x)\\) from \\(x = a\\) to \\(x = c\\)?",
    '\\(12\\)', ['\\(6\\)', '\\(16\\)', '\\(22\\)'],
    "Since \\(f(x) \\ge g(x)\\) all the way from \\(a\\) to \\(c\\), the area is \\(\\int_a^c \\left(f(x) - g(x)\\right)dx = 14 - (-3 + 5) = 12\\). Where \\(g\\) dips below the \\(x\\)-axis does not matter: the gap between the curves is what counts, so no absolute values are needed.")

# ---- Q8 identify an absolute value graph
fy = lambda X: 3 - abs(X + 1)
pl = Plot(-6.5, 6.5, -3.5, 4.5, w=460)
for v in range(-6, 7):
    if v: pl.line(v, -3.5, v, 4.5, width=0.6, colour='#e3e6eb')
for v in range(-3, 5):
    if v: pl.line(-6.5, v, 6.5, v, width=0.6, colour='#e3e6eb')
pl.axes(xt=[v for v in range(-6, 7) if v], yt=[v for v in range(-3, 5) if v]); pl.curve(fy, -6.5, 6.5)
P.M('q08', "The diagram shows the graph of a function." + pl.svg() + "Which of these is the equation of the function?",
    '\\(y = 3 - |x + 1|\\)', ['\\(y = 3 - |x - 1|\\)', '\\(y = 1 - |x + 3|\\)', '\\(y = 1 - |x - 3|\\)'],
    "The graph is an upside-down V with its peak at \\((-1, 3)\\), so it is \\(y = 3 - |x - (-1)| = 3 - |x + 1|\\). Check: at \\(x = 2\\), \\(y = 3 - 3 = 0\\), which matches the graph.")

# ---- Q9 how many points of an inverse relation have x-coordinate 1 (count where each function equals 1)
fc = lambda X: X**3 + 3 * X**2 - 1
roots1 = sorted(float(r) for r in sp.real_roots(sp.Poly(x**3 + 3 * x**2 - 2, symbols('x'))) ) if False else sorted(r.evalf() for r in sp.Poly(symbols('z')**3 + 3 * symbols('z')**2 - 2).real_roots())
assert len(roots1) == 3 and sum(1 for r in roots1 if r > 0) == 1                        # f = 1 three times, once for x > 0
rootsm1 = sp.Poly(symbols('z')**3 + 3 * symbols('z')**2).real_roots(); assert len(set(rootsm1)) == 2   # f = -1 at x = -3 and x = 0
counts = {'f': 3, '1/f': 3, 'f(|x|)': 2, '|f|': 3 + 2}; assert [k_ for k_, v in counts.items() if v > 3] == ['|f|']
pl = Plot(-3.8, 1.6, -2.2, 3.8, w=380)
pl.axes(xt=[], yt=[1]); pl.curve(fc, -3.8, 1.6); pl.text(1.1, fc(1.1), 'y = f(x)', dx=8, dy=6, anchor='start', var=True)
P.M('q09', "The graph of a cubic function \\(y = f(x)\\) is shown." + pl.svg() +
    "For which of these functions does the graph of its inverse relation have more than 3 points with an \\(x\\)-coordinate of 1?",
    '\\(y = |f(x)|\\)', ['\\(y = f(x)\\)', '\\(y = \\dfrac{1}{f(x)}\\)', '\\(y = f(|x|)\\)'],
    "A point on the inverse with \\(x\\)-coordinate 1 is a point on the function with \\(y\\)-coordinate 1, so count where each function equals 1. \\(f(x) = 1\\) three times (the line \\(y = 1\\) cuts the cubic 3 times), and \\(\\frac{1}{f(x)} = 1\\) at the same 3 places. \\(f(|x|)\\) keeps only the right half of the graph and reflects it, and only one of those 3 points has \\(x > 0\\), so it is 2. \\(|f(x)| = 1\\) when \\(f(x) = 1\\) or \\(f(x) = -1\\): that is 3 points plus at least 1 more, so more than 3.")

# ---- Q12(e) volume of revolution about the y-axis, split into a cylinder and a curved part
yy = symbols('yy', positive=True); xx = symbols('xx', positive=True)
V_disc = pi * 8**2 * 2 + pi * integrate((24 / yy - 4)**2, (yy, 2, 6)); V_shell = 2 * pi * integrate(xx * 24 / (xx + 4), (xx, 0, 8))
assert simplify(V_disc - V_shell) == 0 and simplify(V_disc - 192 * pi * (2 - log(3))) == 0
fh = lambda X: 24 / (X + 4)
pl = Plot(-1, 11, -0.8, 7.2, w=380)
pl.region([(0, 0)] + [(i / 20, fh(i / 20)) for i in range(0, 161)] + [(8, 0)])
pl.axes(xt=[4, 8], yt=[2, 4, 6]); pl.curve(fh, 0, 10.5); pl.line(8, 0, 8, fh(8), width=1.8)
pl.text(3.2, 1.3, 'R', size=17, var=True); pl.text(9.4, fh(9.4), 'y = 24 ∕ (x + 4)', dy=-12, anchor='middle', size=13, var=True)
P.W('q12e', 4, "The region \\(R\\) is bounded by the curve \\(y = \\dfrac{24}{x + 4}\\), the line \\(x = 8\\) and the coordinate axes." + pl.svg() +
    "Find the volume of the solid formed when \\(R\\) is rotated about the \\(y\\)-axis. Leave your answer in exact form.",
    ["For \\(0 \\le y \\le 2\\) the region runs from \\(x = 0\\) to \\(x = 8\\): rotating this part gives a cylinder of volume \\(\\pi \\times 8^2 \\times 2 = 128\\pi\\).",
     "For \\(2 \\le y \\le 6\\) the region runs from \\(x = 0\\) to the curve, where \\(x = \\dfrac{24}{y} - 4\\).",
     "\\(\\displaystyle V_2 = \\pi\\int_2^6 \\left(\\frac{24}{y} - 4\\right)^2 dy = \\pi\\int_2^6 \\left(\\frac{576}{y^2} - \\frac{192}{y} + 16\\right) dy\\)",
     "\\(\\displaystyle = \\pi\\left[-\\frac{576}{y} - 192\\ln y + 16y\\right]_2^6 = \\pi\\left(192 - 192\\ln 3 + 64\\right) = \\pi(256 - 192\\ln 3)\\)",
     "\\(V = 128\\pi + 256\\pi - 192\\pi\\ln 3 = 192\\pi(2 - \\ln 3)\\) cubic units"],
    [("Correct exact volume", 4), ("Correct integral for the curved part and the cylinder, with one error in evaluating", 3),
     ("Splits the solid into a cylinder and a curved part, or a correct integral for the curved part", 2), ("Writes \\(x\\) in terms of \\(y\\), or finds the volume of the cylinder", 1)])

# ---- Q13(a) rates of change in a hemispherical tank, then a separable differential equation
hh, RR, kk, tt = symbols('h R k t', positive=True)
V = pi * (RR * hh**2 - hh**3 / 3); dVdt = kk * (2 * RR - hh)**2
dhdt = simplify(dVdt / diff(V, hh)); assert simplify(dhdt - kk * (2 * RR - hh) / (pi * hh)) == 0
T_ = simplify(integrate(pi * hh / (kk * (2 * RR - hh)), (hh, 0, RR))); assert simplify(T_ - pi * RR * (2 * log(2) - 1) / kk) == 0
assert simplify(dhdt.subs(hh, RR) - kk / pi) == 0 and simplify(diff(dhdt, hh)).subs({RR: 1, kk: 1, hh: Q(1, 2)}) < 0
sv = (f'<svg class="tb-fig" viewBox="0 0 380 210" width="380" style="display:block;max-width:100%;height:auto;margin:14px auto;background:#fff;border-radius:8px" role="img" aria-label="diagram">'
      f'<defs><clipPath id="bowl"><path d="M40,30A150,150 0 0 0 340,30Z"/></clipPath></defs>'
      f'<rect x="0" y="120" width="380" height="100" fill="#dfe6fb" clip-path="url(#bowl)"/>'
      f'<path d="M40,30A150,150 0 0 0 340,30" fill="none" stroke="{INK}" stroke-width="2.4"/><path d="M40,30H340" stroke="{INK}" stroke-width="1" stroke-dasharray="5 4"/>'
      f'<path d="M89,120H291" stroke="{INK}" stroke-width="1.6"/><path d="M190,30L325,30" stroke="none"/>'
      f'<path d="M190,30L298,30" stroke="{INK}" stroke-width="1.2"/><text x="244" y="24" font-family="\'Times New Roman\',serif" font-style="italic" font-size="16" text-anchor="middle" fill="{INK}">R</text>'
      f'<path d="M206,180V124M206,124l-3.5,7h7zM206,180l-3.5,-7h7z" stroke="{INK}" stroke-width="1.2" fill="{INK}"/><text x="214" y="158" font-family="\'Times New Roman\',serif" font-style="italic" font-size="16" fill="{INK}">h</text>'
      f'<path d="M184,180h12" stroke="#fff" stroke-width="3"/><text x="150" y="203" font-family="Nunito,system-ui,sans-serif" font-size="13" fill="{INK}">Hole</text><path d="M178,198L188,183" stroke="{INK}"/></svg>')
sv = fix(sv)
P.W('q13a', 7, "A water tank is in the shape of a hemisphere of radius \\(R\\) cm, with a small hole at the bottom. When the water is \\(h\\) cm deep, the volume of water in the tank is \\(V = \\pi\\left(Rh^2 - \\dfrac{h^3}{3}\\right)\\) cm\\(^3\\). (Do NOT prove this.)" + sv +
    "The tank starts empty. Water is poured in while it also drains through the hole, so that the volume changes at the rate \\(\\dfrac{dV}{dt} = k(2R - h)^2\\), where \\(k\\) is a positive constant and \\(t\\) is the time in seconds.<br><br>"
    "(i) Show that \\(\\dfrac{dh}{dt} = \\dfrac{k(2R - h)}{\\pi h}\\). <b>2</b><br>(ii) Show that the tank is full after \\(T = \\dfrac{\\pi R(2\\ln 2 - 1)}{k}\\) seconds. <b>3</b><br>"
    "(iii) Find the rate at which the water level is rising when the tank is full, and explain why the level rises more slowly as the tank fills. <b>2</b>",
    ["(i) \\(\\dfrac{dV}{dh} = \\pi(2Rh - h^2) = \\pi h(2R - h)\\)", "\\(\\dfrac{dh}{dt} = \\dfrac{dV}{dt} \\div \\dfrac{dV}{dh} = \\dfrac{k(2R - h)^2}{\\pi h(2R - h)} = \\dfrac{k(2R - h)}{\\pi h}\\)",
     "(ii) \\(\\dfrac{dt}{dh} = \\dfrac{\\pi h}{k(2R - h)}\\), so \\(\\displaystyle T = \\frac{\\pi}{k}\\int_0^R \\frac{h}{2R - h}\\,dh\\)",
     "\\(\\dfrac{h}{2R - h} = \\dfrac{2R}{2R - h} - 1\\), so \\(\\displaystyle T = \\frac{\\pi}{k}\\Big[-2R\\ln(2R - h) - h\\Big]_0^R\\)",
     "\\(= \\dfrac{\\pi}{k}\\left(-2R\\ln R - R + 2R\\ln 2R\\right) = \\dfrac{\\pi}{k}\\left(2R\\ln 2 - R\\right) = \\dfrac{\\pi R(2\\ln 2 - 1)}{k}\\)",
     "(iii) When the tank is full, \\(h = R\\): \\(\\dfrac{dh}{dt} = \\dfrac{k(2R - R)}{\\pi R} = \\dfrac{k}{\\pi}\\) cm s\\(^{-1}\\).",
     "As \\(h\\) increases, the numerator \\(k(2R - h)\\) decreases and the denominator \\(\\pi h\\) increases, so \\(\\dfrac{dh}{dt}\\) decreases: the level rises more and more slowly."],
    [("All three parts correct", 7), ("Parts (i) and (ii) correct, with progress in (iii)", 6), ("Part (i) and part (ii) correct, or one of them and part (iii)", 5),
     ("Part (i) correct and a correct integral for \\(T\\) with correct limits", 4), ("One part correct, or correct \\(\\frac{dV}{dh}\\) and a correct integral for \\(T\\)", 3),
     ("Correct \\(\\frac{dV}{dh}\\), or separates the variables correctly", 2), ("Uses the chain rule with \\(\\frac{dV}{dt}\\) and \\(\\frac{dV}{dh}\\), or finds \\(\\frac{dh}{dt}\\) at \\(h = R\\)", 1)])

# ---- Q13(b) two projectiles collide
u, H, g, tc = symbols('u H g t', positive=True); th_c, th_s = Q(4, 5), Q(3, 5)
v = sp.solve(sp.Eq(symbols('v') * th_c, u), symbols('v'))[0]; assert v == 5 * u / 4
tcol = sp.solve(sp.Eq(v * th_s * tc, H), tc)[0]; assert simplify(tcol - 4 * H / (3 * u)) == 0
assert simplify((v * th_s / g) - 3 * u / (4 * g)) == 0
uv, Hv, gv = 14, 10, Q(98, 10); tv = Q(4 * Hv, 3 * uv); xv = uv * tv; yv = Hv - gv * tv**2 / 2
assert tv == Q(20, 21) and xv == Q(40, 3) and yv == Q(50, 9) and 16 * gv * Hv < 9 * uv**2
pl = Plot(-0.6, 6.2, -0.6, 3.9, w=440)
pl.axes(xt=[], yt=[3], ytl=['H']); pl.dot(0, 3); pl.dot(0, 0, r=3)
pl.line(0, 3, 1.4, 3, width=1.6, arrow=True); pl.text(0.75, 3, 'u', dy=-9, var=True); pl.text(0, 3, 'Particle B', dx=-10, dy=-12, anchor='end', size=12)
pl.line(0, 0, 1.2, 0.9, width=1.6, arrow=True); pl.text(1.2, 0.9, 'v', dx=8, dy=-2, anchor='start', var=True); pl.text(0, 0, 'Particle A', dx=22, dy=24, anchor='start', size=12)
pl.raw(f'<path d="M{pl.X(0.55)},{pl.Y(0)}A{pl.X(0.55) - pl.X(0)},{pl.X(0.55) - pl.X(0)} 0 0 0 {round(pl.X(0.44), 1)},{round(pl.Y(0.33), 1)}" fill="none" stroke="{INK}"/>')
pl.text(0.75, 0.13, 'θ', var=True, size=15); pl.text(5.9, 3.5, 'NOT TO SCALE', anchor='end', size=11)
P.W('q13b', 8, "Particle A is projected from the origin with speed \\(v\\) m s\\(^{-1}\\) at an angle \\(\\theta\\) above the horizontal. At the same moment, particle B is projected horizontally with speed \\(u\\) m s\\(^{-1}\\) from a point \\(H\\) metres directly above the origin. Take \\(g\\) m s\\(^{-2}\\) as the acceleration due to gravity." + pl.svg() +
    "After \\(t\\) seconds the position vectors of the particles are<br>\\(\\underset{\\sim}{r}_A(t) = \\begin{pmatrix} vt\\cos\\theta \\\\ vt\\sin\\theta - \\frac{1}{2}gt^2 \\end{pmatrix}\\) and \\(\\underset{\\sim}{r}_B(t) = \\begin{pmatrix} ut \\\\ H - \\frac{1}{2}gt^2 \\end{pmatrix}\\). (Do NOT prove these.)<br><br>"
    "The angle \\(\\theta\\) is chosen so that \\(\\tan\\theta = \\frac{3}{4}\\), and the two particles collide.<br><br>"
    "(i) Show that \\(v = \\dfrac{5u}{4}\\). <b>2</b><br>(ii) Show that the particles collide when \\(t = \\dfrac{4H}{3u}\\). <b>2</b><br>"
    "(iii) Show that particle A is still rising when the collision happens if \\(16gH < 9u^2\\). <b>2</b><br>(iv) Given that \\(u = 14\\), \\(H = 10\\) and \\(g = 9.8\\), find the coordinates of the point where the particles collide. <b>2</b>",
    ["(i) Since \\(\\tan\\theta = \\frac{3}{4}\\), \\(\\cos\\theta = \\frac{4}{5}\\) and \\(\\sin\\theta = \\frac{3}{5}\\).", "At the collision the horizontal positions are equal: \\(vt\\cos\\theta = ut\\), so \\(\\frac{4}{5}v = u\\) and \\(v = \\frac{5u}{4}\\).",
     "(ii) The vertical positions are equal: \\(vt\\sin\\theta - \\frac{1}{2}gt^2 = H - \\frac{1}{2}gt^2\\), so \\(vt\\sin\\theta = H\\).", "\\(\\frac{5u}{4} \\times \\frac{3}{5} \\times t = H\\), so \\(\\frac{3u}{4}t = H\\) and \\(t = \\frac{4H}{3u}\\).",
     "(iii) The vertical velocity of A is \\(v\\sin\\theta - gt = \\frac{3u}{4} - gt\\), which is positive while \\(t < \\frac{3u}{4g}\\).", "A is rising at the collision if \\(\\frac{4H}{3u} < \\frac{3u}{4g}\\), that is \\(16gH < 9u^2\\).",
     "(iv) \\(t = \\frac{4 \\times 10}{3 \\times 14} = \\frac{20}{21}\\) s", "\\(x = 14 \\times \\frac{20}{21} = \\frac{40}{3}\\), \\(y = 10 - 4.9\\left(\\frac{20}{21}\\right)^2 = 10 - \\frac{40}{9} = \\frac{50}{9}\\)", "They collide at \\(\\left(\\frac{40}{3}, \\frac{50}{9}\\right)\\), about \\((13.3, 5.6)\\)."],
    [("All four parts correct", 8), ("Three parts correct and progress in the fourth", 7), ("Three parts correct", 6), ("Two parts correct and progress in another", 5), ("Two parts correct", 4),
     ("One part correct and progress in another", 3), ("One part correct", 2), ("Finds \\(\\cos\\theta\\) and \\(\\sin\\theta\\), or equates the horizontal or vertical positions", 1)])

# ---- Q14(b) a quartic with a repeated root decides when a hyperbola touches a circle
X = symbols('X'); cc = symbols('c', positive=True)
quart = sp.expand(((X - cc)**2 + (2 / X)**2 - cc**2) * X**2); assert sp.expand(quart - (X**4 - 2 * cc * X**3 + 4)) == 0
xs = sp.solve(sp.diff(X**4 - 2 * cc * X**3 + 4, X), X); xd = [r for r in xs if r != 0][0]; assert simplify(xd - 3 * cc / 2) == 0
cstar = sp.solve(sp.Eq((X**4 - 2 * cc * X**3 + 4).subs(X, xd), 0), cc); assert len(cstar) == 1 and simplify(cstar[0]**4 - Q(64, 27)) == 0
cs = float(cstar[0]); assert 1.1 < cs < 1.4
Pq = lambda C: (lambda Xv: Xv**4 - 2 * C * Xv**3 + 4)
pl = Plot(-0.9, 2.9, -3.2, 7.5, w=420, h=340)
pl.axes(xt=[-0.5, 0.5, 1, 1.5, 2, 2.5], yt=[-2, 2, 4, 6]); pl.curve(Pq(1.1), -0.9, 2.9, dash='7 5'); pl.curve(Pq(1.4), -0.9, 2.9)
pl.text(1.65, Pq(1.1)(1.65), 'c = 1.1', dy=-12, var=True, size=13); pl.text(2.1, Pq(1.4)(2.1), 'c = 1.4', dx=14, dy=4, anchor='start', var=True, size=13)
P.W('q14b', 4, "Consider the hyperbola \\(y = \\dfrac{2}{x}\\) and the circle \\((x - c)^2 + y^2 = c^2\\), where \\(c\\) is a positive constant.<br><br>"
    "(i) Show that the \\(x\\)-coordinates of any points where the hyperbola and the circle meet are zeros of the polynomial \\(P(x) = x^4 - 2cx^3 + 4\\). <b>1</b><br><br>"
    "The graphs of \\(y = x^4 - 2cx^3 + 4\\) for \\(c = 1.1\\) and \\(c = 1.4\\) are shown." + pl.svg() +
    "(ii) By considering the graphs, or otherwise, find the exact value of \\(c\\) for which the hyperbola and the circle meet at exactly one point. <b>3</b>",
    ["(i) Substituting \\(y = \\frac{2}{x}\\): \\((x - c)^2 + \\frac{4}{x^2} = c^2\\), so \\(x^2 - 2cx + \\frac{4}{x^2} = 0\\).", "Multiplying by \\(x^2\\): \\(x^4 - 2cx^3 + 4 = 0\\), so each \\(x\\)-coordinate is a zero of \\(P(x)\\).",
     "(ii) From the graphs, as \\(c\\) increases the curve goes from missing the \\(x\\)-axis to cutting it twice. Exactly one meeting point happens when it just touches the axis, which is a repeated zero: \\(P(x) = 0\\) and \\(P'(x) = 0\\).",
     "\\(P'(x) = 4x^3 - 6cx^2 = 2x^2(2x - 3c)\\), and \\(x \\ne 0\\), so \\(x = \\frac{3c}{2}\\).",
     "\\(P\\left(\\frac{3c}{2}\\right) = \\frac{81c^4}{16} - \\frac{27c^4}{4} + 4 = 4 - \\frac{27c^4}{16} = 0\\)", "\\(c^4 = \\frac{64}{27}\\), so \\(c = \\sqrt[4]{\\dfrac{64}{27}} = \\dfrac{2\\sqrt{2}}{3^{3/4}}\\)."],
    [("Both parts correct", 4), ("Part (ii) correct, or part (i) correct and \\(x = \\frac{3c}{2}\\) found with an attempt to find \\(c\\)", 3),
     ("Part (i) correct and recognises a repeated root, or finds \\(x = \\frac{3c}{2}\\)", 2), ("Part (i) correct, or recognises that one meeting point needs a repeated root", 1)])

# ---- Q14(c) area of a triangle from position vectors, then maximise it
a1, a2, b1, b2, p_, q_ = symbols('a1 a2 b1 b2 p q', real=True)
assert sp.expand(sp.Matrix([q_, -p_]).dot(sp.Matrix([p_, q_]))) == 0
r_, R_, tt = symbols('r R t', positive=True)
Pv = (r_ + r_ * cos(2 * tt), r_ * sin(2 * tt)); Qv = (-R_ + R_ * cos(tt), R_ * sin(tt))
cross = simplify(sp.expand_trig(Pv[0] * Qv[1] - Pv[1] * Qv[0])); assert simplify(cross - r_ * R_ * sin(2 * tt)) == 0
sv = Plot(-3.9, 2.8, -2.0, 2.2, w=440); rr, RRv, t0 = 1.2, 1.8, 0.62
sv.axes(xt=[], yt=[], origin=True)
sv.raw(f'<circle cx="{sv.X(rr)}" cy="{sv.Y(0)}" r="{round(sv.X(rr) - sv.X(0), 1)}" fill="none" stroke="{INK}" stroke-width="1.6"/><circle cx="{sv.X(-RRv)}" cy="{sv.Y(0)}" r="{round(sv.X(0) - sv.X(-RRv), 1)}" fill="none" stroke="{INK}" stroke-width="1.6"/>')
Px, Py = rr + rr * math.cos(2 * t0), rr * math.sin(2 * t0); Qx, Qy = -RRv + RRv * math.cos(t0), RRv * math.sin(t0)
sv.line(rr, 0, Px, Py); sv.line(-RRv, 0, Qx, Qy); sv.dot(rr, 0, 2.8); sv.dot(-RRv, 0, 2.8); sv.dot(Px, Py); sv.dot(Qx, Qy)
sv.text(rr, 0, 'I', dy=17, var=True); sv.text(-RRv, 0, 'J', dy=17, var=True); sv.text(Px, Py, 'P', dx=8, dy=-6, anchor='start', var=True); sv.text(Qx, Qy, 'Q', dx=6, dy=-8, anchor='start', var=True)
sv.text(rr + 0.42, 0.1, '2t', var=True, size=13); sv.text(-RRv + 0.55, 0.1, 't', var=True, size=13)
P.W('q14c', 7, "(i) It is known that for a non-zero vector \\(\\begin{pmatrix} p \\\\ q \\end{pmatrix}\\), the vector \\(\\begin{pmatrix} q \\\\ -p \\end{pmatrix}\\) is perpendicular to it and has the same magnitude. (Do NOT prove this.)<br>"
    "Points \\(A\\) and \\(B\\) have position vectors \\(\\overrightarrow{OA} = \\begin{pmatrix} a_1 \\\\ a_2 \\end{pmatrix}\\) and \\(\\overrightarrow{OB} = \\begin{pmatrix} b_1 \\\\ b_2 \\end{pmatrix}\\). Using the given information, or otherwise, show that the area of triangle \\(OAB\\) is \\(\\frac{1}{2}|a_1 b_2 - a_2 b_1|\\). <b>3</b><br><br>"
    "(ii) The point \\(P\\) lies on the circle with centre \\(I(r, 0)\\) and radius \\(r > 0\\), so that \\(IP\\) makes an angle of \\(2t\\) with the positive \\(x\\)-direction. The point \\(Q\\) lies on the circle with centre \\(J(-R, 0)\\) and radius \\(R > 0\\), so that \\(JQ\\) makes an angle of \\(t\\) with the positive \\(x\\)-direction, where \\(0 < t < \\frac{\\pi}{2}\\)." + sv.svg() +
    "Using part (i), or otherwise, find the value of \\(t\\) for which the area of triangle \\(OPQ\\) is greatest, and find this greatest area. <b>4</b>",
    ["(i) Let \\(\\underset{\\sim}{n} = \\begin{pmatrix} a_2 \\\\ -a_1 \\end{pmatrix}\\), which is perpendicular to \\(\\overrightarrow{OA}\\) with \\(|\\underset{\\sim}{n}| = |\\overrightarrow{OA}|\\).",
     "Taking \\(OA\\) as the base, the height of the triangle is the length of the projection of \\(\\overrightarrow{OB}\\) onto \\(\\underset{\\sim}{n}\\): \\(\\text{height} = \\dfrac{|\\overrightarrow{OB} \\cdot \\underset{\\sim}{n}|}{|\\underset{\\sim}{n}|}\\).",
     "\\(\\text{Area} = \\frac{1}{2}|\\overrightarrow{OA}| \\times \\dfrac{|\\overrightarrow{OB} \\cdot \\underset{\\sim}{n}|}{|\\underset{\\sim}{n}|} = \\frac{1}{2}|\\overrightarrow{OB} \\cdot \\underset{\\sim}{n}| = \\frac{1}{2}|a_2 b_1 - a_1 b_2| = \\frac{1}{2}|a_1 b_2 - a_2 b_1|\\)",
     "(ii) \\(\\overrightarrow{OP} = \\begin{pmatrix} r + r\\cos 2t \\\\ r\\sin 2t \\end{pmatrix}\\) and \\(\\overrightarrow{OQ} = \\begin{pmatrix} -R + R\\cos t \\\\ R\\sin t \\end{pmatrix}\\)",
     "\\(x_P y_Q - y_P x_Q = rR\\left[(1 + \\cos 2t)\\sin t - \\sin 2t(\\cos t - 1)\\right]\\)", "\\(= rR\\left[2\\cos^2 t\\sin t - 2\\sin t\\cos^2 t + 2\\sin t\\cos t\\right] = rR\\sin 2t\\)",
     "\\(\\text{Area} = \\frac{1}{2}rR\\sin 2t\\) (positive since \\(0 < 2t < \\pi\\)), which is greatest when \\(\\sin 2t = 1\\): \\(t = \\frac{\\pi}{4}\\), giving a greatest area of \\(\\frac{1}{2}rR\\)."],
    [("Both parts correct", 7), ("Part (i) correct and the area in (ii) found as \\(\\frac{1}{2}rR\\sin 2t\\)", 6), ("Part (i) correct and correct position vectors with substantial progress in (ii), or part (ii) correct", 5),
     ("Part (i) correct, or correct position vectors and an expression for the area in (ii)", 4), ("Uses a perpendicular vector to find the height in (i), or correct position vectors of \\(P\\) and \\(Q\\)", 3),
     ("Writes the area as \\(\\frac{1}{2} \\times \\text{base} \\times \\text{height}\\) with a relevant height, or one correct position vector", 2), ("Some relevant progress in either part", 1)])

# add these to the paper's file from ext1_2023.py
base = os.path.join(OUT, 'hsc-ext1-2023.raw.json'); have = json.load(open(base))
ids = {q['qid'] for q in P.qs}; merged = [q for q in have if q['qid'] not in ids] + P.qs
order = lambda q: (int(''.join(ch for ch in q['qid'][1:] if ch.isdigit())), q['qid'])
json.dump(sorted(merged, key=order), open(base, 'w'), ensure_ascii=False)
print('hsc-ext1-2023 now', len(merged), 'questions:', sum(q['type'] == 'mcq' for q in merged), 'multiple choice,', sum(q['type'] != 'mcq' for q in merged), 'working')
