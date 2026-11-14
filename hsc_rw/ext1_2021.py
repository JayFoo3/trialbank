"""Trialbank versions of the 2021 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math
import sympy as sp
from sympy import Rational as Q, sqrt, pi, sin, cos, exp, log, symbols, integrate, diff, simplify, asin
from rw import Paper
from fig import Plot, INK
x, t, y, u = symbols('x t y u', real=True)
P = Paper('hsc-ext1-2021', seed=2021)
M = lambda s: '\\(' + s + '\\)'
VEC = lambda s: '\\underset{\\sim}{' + s + '}'
I_, J_ = VEC('i'), VEC('j')
col = lambda a_, b_: M('\\begin{pmatrix} ' + str(a_) + ' \\\\ ' + str(b_) + ' \\end{pmatrix}')
GREY = '#8a909c'
PI = math.pi

# Q1 vector between two points
OPv, OQv = (4, -2), (1, 3); PQ = (OQv[0] - OPv[0], OQv[1] - OPv[1]); assert PQ == (-3, 5)
P.M('q01', "Given that " + M('\\overrightarrow{OP} = \\begin{pmatrix} 4 \\\\ -2 \\end{pmatrix}') + " and " + M('\\overrightarrow{OQ} = \\begin{pmatrix} 1 \\\\ 3 \\end{pmatrix}') + ", what is " + M('\\overrightarrow{PQ}') + "?",
    col(-3, 5), [col(3, -5), col(5, 1), col(-5, -1)],
    M('\\overrightarrow{PQ} = \\overrightarrow{OQ} - \\overrightarrow{OP}') + " (end minus start) " + M('= \\begin{pmatrix} 1 - 4 \\\\ 3 - (-2) \\end{pmatrix} = \\begin{pmatrix} -3 \\\\ 5 \\end{pmatrix}') + ". Subtracting the other way round gives the reverse vector.")

# Q2 double angle rewrite
assert all(abs(math.cos(4 * v)**2 - (1 + math.cos(8 * v)) / 2) < 1e-12 for v in [0.1, 0.7, 2.3])
P.M('q02', "Which of the following integrals is equivalent to \\(\\displaystyle\\int \\cos^2 4x\\,dx\\)?",
    M('\\displaystyle\\int \\frac{1 + \\cos 8x}{2}\\,dx'), [M('\\displaystyle\\int \\frac{1 - \\cos 8x}{2}\\,dx'), M('\\displaystyle\\int \\frac{1 + \\sin 8x}{2}\\,dx'), M('\\displaystyle\\int \\frac{1 - \\sin 8x}{2}\\,dx')],
    "\\(\\cos 2A = 2\\cos^2 A - 1\\), so \\(\\cos^2 A = \\frac{1 + \\cos 2A}{2}\\). With \\(A = 4x\\), \\(\\cos^2 4x = \\frac{1 + \\cos 8x}{2}\\). (The minus sign version is \\(\\sin^2 4x\\).)")

# Q3 remainder theorem
Pp = -x**3 + 3 * x**2 - 2 * x + 5; assert sp.rem(Pp, x + 1) == 11 and Pp.subs(x, 1) == 5
P.M('q03', "What is the remainder when \\(P(x) = -x^3 + 3x^2 - 2x + 5\\) is divided by \\(x + 1\\)?",
    M('11'), [M('-11'), M('5'), M('-5')],
    "By the remainder theorem the remainder is \\(P(-1) = -(-1)^3 + 3(-1)^2 - 2(-1) + 5 = 1 + 3 + 2 + 5 = 11\\). (Using \\(P(1)\\) is the common slip.)")

# Q4 separable DE
cc = symbols('c'); Ysol = sqrt(2 * x**2 + 5)
assert simplify(diff(Ysol, x) - 2 * x / Ysol) == 0
P.M('q04', "Consider the differential equation \\(\\dfrac{dy}{dx} = \\dfrac{2x}{y}\\). Which equation best represents the relationship between \\(x\\) and \\(y\\)?",
    M('y^2 = 2x^2 + c'), [M('y^2 = x^2 + c'), M('y = x^2\\ln|y| + c'), M('y = 2x\\ln|y| + c')],
    "Separate the variables: \\(\\int y\\,dy = \\int 2x\\,dx\\), so \\(\\frac{y^2}{2} = x^2 + C\\), which gives \\(y^2 = 2x^2 + c\\). Forgetting the \\(\\frac{1}{2}\\) on the left gives \\(y^2 = x^2 + c\\).")

# Q5 sign of a dot product
OA, OB = '\\overrightarrow{OA}', '\\overrightarrow{OB}'
P.M('q05', "For the two vectors " + M(OA) + " and " + M(OB) + " it is known that " + M(OA + ' \\cdot ' + OB + ' > 0') + ". Which statement MUST be true?",
    "The angle between " + M(OA) + " and " + M(OB) + " is less than \\(\\frac{\\pi}{2}\\).",
    ["Both " + M(OA) + " and " + M(OB) + " are positive.", M('|' + OA + '| > |' + OB + '|'), "The points \\(O\\), \\(A\\) and \\(B\\) are collinear."],
    M(OA + ' \\cdot ' + OB + ' = |' + OA + '||' + OB + '|\\cos\\theta') + ". The lengths are positive, so \\(\\cos\\theta > 0\\) and \\(\\theta < \\frac{\\pi}{2}\\). A vector itself is not positive or negative, and nothing is known about the lengths.")

# Q6 P(X >= 1) for a binomial
r6 = 1 - 0.2**12; assert r6 > 0.8
P.M('q06', "The random variable \\(X\\) is the number of successes in 12 independent Bernoulli trials, each with probability of success \\(p = 0.8\\). Let \\(r = P(X \\ge 1)\\). Which describes the value of \\(r\\)?",
    M('r > 0.8'), [M('r = 0.8'), M('0.2 < r < 0.8'), M('r \\le 0.2')],
    "\\(r = 1 - P(X = 0) = 1 - 0.2^{12}\\), which is extremely close to 1, so \\(r > 0.8\\). Don't confuse \\(P(X \\ge 1)\\) with the chance of a single success.")

# Q7 sinusoid sign reading
A7, B7 = 1.0, 1.3
fs7 = [lambda X: A7 * math.sin(X) - B7 * math.cos(X), lambda X: -A7 * math.sin(X) - B7 * math.cos(X), lambda X: A7 * math.sin(X) + B7 * math.cos(X), lambda X: -A7 * math.sin(X) + B7 * math.cos(X)]
assert fs7[0](0) < 0 and (fs7[0](1e-4) - fs7[0](0)) > 0
def wave(f_):
    pl = Plot(-5.2, 5.2, -2.3, 2.3, w=230); pl.axes(xt=[], yt=[]); pl.curve(f_, -5.2, 5.2, width=2); return pl.svg()
P.M('q07', "Which graph best represents \\(f(x) = a\\sin x - b\\cos x\\), given that the constants \\(a\\) and \\(b\\) are both positive?",
    wave(fs7[0]), [wave(g) for g in fs7[1:]],
    "\\(f(0) = -b < 0\\), so the graph cuts the \\(y\\)-axis below the origin. \\(f'(x) = a\\cos x + b\\sin x\\), so \\(f'(0) = a > 0\\) and the graph is rising as it crosses the \\(y\\)-axis.")

# Q8 parametric semicircle
cx8, cy8 = 2, 3
def onpath(fx, fy): return [(fx(tv), fy(tv)) for tv in [-PI / 2 + i * PI / 50 for i in range(51)]]
right = onpath(lambda T: cx8 + math.cos(T), lambda T: cy8 + math.sin(T)); assert all(px >= cx8 - 1e-12 for px, _ in right)
for fx, fy in [(lambda T: cx8 + math.sin(T), lambda T: cy8 + math.cos(T)), (lambda T: cx8 - math.cos(T), lambda T: cy8 - math.sin(T)), (lambda T: cx8 - math.sin(T), lambda T: cy8 - math.cos(T))]:
    assert not all(px >= cx8 - 1e-12 for px, _ in onpath(fx, fy))
pl = Plot(-0.6, 4.6, -0.6, 4.8, w=300); pl.axes(xt=[], yt=[])
pl.curve(lambda Y: None, 0, 1)
pl.raw('<path d="' + 'M' + 'L'.join('%s,%s' % (pl.X(px), pl.Y(py)) for px, py in right) + '" stroke="' + INK + '" stroke-width="2" fill="none"/>')
for (px, py) in [(2, 4), (2, 3), (2, 2)]: pl.dot(px, py, 3)
pl.text(2, 4, '(2, 4)', dx=-8, dy=4, anchor='end', size=12); pl.text(2, 3, '(2, 3)', dx=-8, dy=4, anchor='end', size=12); pl.text(2, 2, '(2, 2)', dx=-8, dy=4, anchor='end', size=12)
sys8 = lambda a_, b_: M('\\begin{cases} x = ' + a_ + ' \\\\ y = ' + b_ + ' \\end{cases}') + ' for ' + M('-\\frac{\\pi}{2} \\le t \\le \\frac{\\pi}{2}')
P.M('q08', "The diagram shows a semicircle." + pl.svg() + "Which pair of parametric equations represents the semicircle shown?",
    sys8('2 + \\cos t', '3 + \\sin t'), [sys8('2 + \\sin t', '3 + \\cos t'), sys8('2 - \\cos t', '3 - \\sin t'), sys8('2 - \\sin t', '3 - \\cos t')],
    "The semicircle has centre \\((2, 3)\\), radius 1 and lies to the right of \\(x = 2\\). For \\(-\\frac{\\pi}{2} \\le t \\le \\frac{\\pi}{2}\\), \\(\\cos t \\ge 0\\), so \\(x = 2 + \\cos t \\ge 2\\), and \\(y = 3 + \\sin t\\) runs from 2 up to 4. The other pairs give the top, left and bottom halves.")

# Q9 graph of arccos(cos x)
tri = lambda X: math.acos(math.cos(X))
assert abs(tri(-1) - 1) < 1e-12 and abs(tri(4) - (2 * PI - 4)) < 1e-12
XT, XTL, YT, YTL = [-2 * PI, -PI, PI, 2 * PI], ['−2π', '−π', 'π', '2π'], [PI / 2, PI], ['π⁄2', 'π']
def g9(pieces, dots=()):
    pl = Plot(-7.4, 7.4, -1.9, 4.1, w=250); pl.axes(xt=XT, xtl=XTL, yt=YT, ytl=YTL)
    for f_, lo, hi in pieces: pl.curve(f_, lo, hi, width=2)
    for d_ in dots: pl.dot(*d_, r=3)
    return pl.svg()
saw = [(lambda X, k=k: X - k * PI, k * PI, (k + 1) * PI - 0.001) for k in range(-3, 3)]
P.M('q09', "Which graph represents the function \\(y = \\cos^{-1}(\\cos x)\\)?",
    g9([(tri, -7.4, 7.4)]), [g9(saw), g9([(lambda X: X, 0, PI)], dots=[(0, 0), (PI, PI)]), g9([(lambda X: X, -7.4, 7.4)])],
    "\\(\\cos x\\) is defined for every \\(x\\), so the graph exists everywhere, and \\(\\cos^{-1}\\) only gives values from 0 to \\(\\pi\\). For \\(0 \\le x \\le \\pi\\), \\(y = x\\). The function is even and has period \\(2\\pi\\), so the graph is a zig-zag between 0 and \\(\\pi\\).")

# Q10 pigeonhole minimum winner
N10, C10 = 2759, 12
w = next(w for w in range(1, N10) if w + (C10 - 1) * (w - 1) >= N10); assert w == 231
P.M('q10', "A school held an election for captain. There were 12 candidates and 2759 students voted, each for exactly one candidate. One candidate received more votes than anyone else and became captain. What is the smallest number of votes the captain could have received?",
    M('231'), [M('229'), M('230'), M('232')],
    "If the captain has \\(w\\) votes, every other candidate has at most \\(w - 1\\), so \\(w + 11(w - 1) \\ge 2759\\), giving \\(12w \\ge 2770\\) and \\(w \\ge 230.8\\). So \\(w = 231\\) (for example 231 and eleven candidates on 230 or fewer, totalling 2759). \\(2759 \\div 12 \\approx 229.9\\) forgets that the winner must be strictly ahead.")

# Q11(a)
P.W('q11a', 1, "Find " + M('(3' + I_ + ' - 2' + J_ + ') + (-5' + I_ + ' + 4' + J_ + ')') + ".",
    [M('(3 - 5)' + I_ + ' + (-2 + 4)' + J_ + ' = -2' + I_ + ' + 2' + J_)], [("Correct answer", 1)])

# Q11(b)
a, b = symbols('a b'); e11 = sp.expand((3 * a - b)**4); assert e11 == 81 * a**4 - 108 * a**3 * b + 54 * a**2 * b**2 - 12 * a * b**3 + b**4
P.W('q11b', 2, "Expand and simplify \\((3a - b)^4\\).",
    ["\\((3a - b)^4 = (3a)^4 + 4(3a)^3(-b) + 6(3a)^2(-b)^2 + 4(3a)(-b)^3 + (-b)^4\\)", "\\(= 81a^4 - 108a^3b + 54a^2b^2 - 12ab^3 + b^4\\)"],
    [("Correct expansion", 2), ("Correct use of the binomial coefficients with one error", 1)])

# Q11(c)
F11 = Q(2, 5) * (x - 2)**Q(5, 2) + Q(4, 3) * (x - 2)**Q(3, 2); assert all(abs(float((diff(F11, x) - x * sqrt(x - 2)).subs(x, v))) < 1e-12 for v in [2.5, 3, 7.1])
P.W('q11c', 3, "Use the substitution \\(u = x - 2\\) to find \\(\\displaystyle\\int x\\sqrt{x - 2}\\,dx\\).",
    ["\\(du = dx\\) and \\(x = u + 2\\).", "\\(\\displaystyle\\int x\\sqrt{x - 2}\\,dx = \\int (u + 2)u^{\\frac{1}{2}}\\,du = \\int \\left(u^{\\frac{3}{2}} + 2u^{\\frac{1}{2}}\\right)du\\)", "\\(= \\frac{2}{5}u^{\\frac{5}{2}} + \\frac{4}{3}u^{\\frac{3}{2}} + C = \\frac{2}{5}(x - 2)^{\\frac{5}{2}} + \\frac{4}{3}(x - 2)^{\\frac{3}{2}} + C\\)"],
    [("Correct primitive in terms of \\(x\\)", 3), ("Correct primitive in terms of \\(u\\)", 2), ("Correct integrand in terms of \\(u\\)", 1)])

# Q11(d)
assert math.comb(9, 4) * math.comb(7, 3) == 4410
P.W('q11d', 1, "A committee of 4 men and 3 women is to be chosen from a group of 9 men and 7 women. In how many different ways can the committee be formed?",
    ["\\(\\binom{9}{4} \\times \\binom{7}{3} = 126 \\times 35 = 4410\\)"], [("Correct answer", 1)])

# Q11(e)
rate = 4 * PI * 0.5**2 * 0.3; assert round(rate, 1) == 0.9
P.W('q11e', 2, "A spherical balloon is being inflated so that its radius increases at a rate of 0.3 mm/s. At what rate is its volume increasing when the radius is 0.5 mm? Give your answer in mm³/s, correct to one decimal place.",
    ["\\(V = \\frac{4}{3}\\pi r^3\\), so \\(\\frac{dV}{dt} = \\frac{dV}{dr} \\times \\frac{dr}{dt} = 4\\pi r^2 \\times 0.3\\)", "When \\(r = 0.5\\): \\(\\frac{dV}{dt} = 4\\pi(0.25)(0.3) = 0.3\\pi \\approx 0.9\\) mm³/s"],
    [("Correct answer", 2), ("Correct use of the chain rule", 1)])

# Q11(f)
I11f = integrate(1 / sqrt(9 - x**2), (x, 0, 3 * sqrt(2) / 2)); assert simplify(I11f - pi / 4) == 0
P.W('q11f', 2, "Evaluate \\(\\displaystyle\\int_0^{\\frac{3\\sqrt{2}}{2}} \\frac{1}{\\sqrt{9 - x^2}}\\,dx\\).",
    ["\\(\\displaystyle\\int_0^{\\frac{3\\sqrt{2}}{2}} \\frac{dx}{\\sqrt{9 - x^2}} = \\left[\\sin^{-1}\\frac{x}{3}\\right]_0^{\\frac{3\\sqrt{2}}{2}} = \\sin^{-1}\\frac{\\sqrt{2}}{2} - \\sin^{-1}0 = \\frac{\\pi}{4}\\)"],
    [("Correct answer", 2), ("Correct primitive", 1)])

# Q11(g)
h11 = lambda v: 2 * math.cos(v)**3 + 2 * math.cos(v)**2 - math.cos(v) - 1
cand = [PI / 4, 3 * PI / 4, PI, 5 * PI / 4, 7 * PI / 4]; assert all(abs(h11(v)) < 1e-12 for v in cand)
gr = [i * 2 * PI / 200000 for i in range(200001)]; mins = [gr[i] for i in range(1, 200000) if abs(h11(gr[i])) < 1e-4 and abs(h11(gr[i])) <= abs(h11(gr[i - 1])) and abs(h11(gr[i])) <= abs(h11(gr[i + 1]))]
assert len(mins) == 5 and all(abs(p - q) < 1e-3 for p, q in zip(mins, cand))
P.W('q11g', 3, "By factorising, or otherwise, solve \\(2\\cos^3 x + 2\\cos^2 x - \\cos x - 1 = 0\\) for \\(0 \\le x \\le 2\\pi\\).",
    ["\\(2\\cos^2 x(\\cos x + 1) - (\\cos x + 1) = 0\\), so \\((\\cos x + 1)(2\\cos^2 x - 1) = 0\\).", "\\(\\cos x = -1\\) gives \\(x = \\pi\\).", "\\(\\cos^2 x = \\frac{1}{2}\\), so \\(\\cos x = \\pm\\frac{1}{\\sqrt{2}}\\), giving \\(x = \\frac{\\pi}{4}, \\frac{3\\pi}{4}, \\frac{5\\pi}{4}, \\frac{7\\pi}{4}\\).", "\\(x = \\frac{\\pi}{4}, \\frac{3\\pi}{4}, \\pi, \\frac{5\\pi}{4}, \\frac{7\\pi}{4}\\)"],
    [("All five solutions", 3), ("Correct factorisation and at least three solutions", 2), ("Correct factorisation, or finds \\(x = \\pi\\)", 1)])

# Q11(h)
rts = sp.Poly(x**4 - 4 * x + 10, x).nroots(); s11 = sum(1 / r for r in rts); assert abs(complex(s11) - 0.4) < 1e-9
P.W('q11h', 2, "The roots of \\(x^4 - 4x + 10 = 0\\) are \\(\\alpha\\), \\(\\beta\\), \\(\\gamma\\) and \\(\\delta\\). What is the value of \\(\\dfrac{1}{\\alpha} + \\dfrac{1}{\\beta} + \\dfrac{1}{\\gamma} + \\dfrac{1}{\\delta}\\)?",
    ["\\(\\dfrac{1}{\\alpha} + \\dfrac{1}{\\beta} + \\dfrac{1}{\\gamma} + \\dfrac{1}{\\delta} = \\dfrac{\\beta\\gamma\\delta + \\alpha\\gamma\\delta + \\alpha\\beta\\delta + \\alpha\\beta\\gamma}{\\alpha\\beta\\gamma\\delta}\\)", "Sum of products three at a time \\(= -\\frac{-4}{1} = 4\\); product of the roots \\(= 10\\).", "So the value is \\(\\frac{4}{10} = \\frac{2}{5}\\)."],
    [("Correct answer", 2), ("Writes the sum as a single fraction in terms of the roots, or one correct coefficient relationship", 1)])

# Q12(a) direction field
fld = lambda X, Y: Y - X
def field(curve=False):
    pl = Plot(-2.4, 2.4, -2.4, 2.4, w=300); pl.axes(xt=[-2, -1, 1, 2], yt=[-2, -1, 1, 2])
    for i in range(-4, 5):
        for j in range(-4, 5):
            X, Y = i / 2, j / 2; m = fld(X, Y); L = 0.17 / math.sqrt(1 + m * m)
            pl.line(X - L, Y - L * m, X + L, Y + L * m, width=1.1, colour=GREY)
    if curve: pl.curve(lambda X: X + 1 - 0.5 * math.exp(X), -2.4, 2.4, width=2.2)
    pl.dot(0, 0.5); pl.text(0, 0.5, 'P', dx=-7, dy=-7, anchor='end', var=True)
    return pl.svg()
Yp = x + 1 - Q(1, 2) * exp(x); assert simplify(diff(Yp, x) - (Yp - x)) == 0 and Yp.subs(x, 0) == Q(1, 2)
P.W('q12a', 1, "The direction field for the differential equation \\(\\dfrac{dy}{dx} = y - x\\) is shown. The graph of a particular solution passes through the point \\(P\\)." + field() + "Sketch the graph of this particular solution.",
    ["The curve passes through \\(P\\), follows the direction of the segments everywhere, rises to a maximum at about \\((0.7, 0.7)\\) and then falls away steeply on the right. To the left it approaches the line \\(y = x + 1\\) from below." + field(True)],
    [("Correct sketch through \\(P\\) following the field", 1)])

# Q12(b) Newton's law of cooling with a warming object
k12 = math.log(0.75) / 10; t20 = math.log(0.2) / k12; assert round(t20) == 56 and abs(24 - 20 * math.exp(k12 * 10) - 9) < 1e-9
pl = Plot(-8, 130, -3, 29, w=340, h=230); pl.line(0, 24, 130, 24, dash='4 4', colour=GREY, width=1.1); pl.axes(xt=[], yt=[4, 24], xl='t', yl='T'); pl.curve(lambda X: 24 - 20 * math.exp(k12 * X), 0, 130)
P.W('q12b', 4, "A drink at 4°C is taken out of the fridge and left in a room where the temperature stays at 24°C. After \\(t\\) minutes the temperature of the drink is \\(T\\) degrees Celsius, and \\(\\dfrac{dT}{dt} = k(T - 24)\\) (do NOT prove this), where \\(k\\) is a constant.<br>"
    "(i) After 10 minutes the drink is at 9°C. By solving the differential equation, find the value of \\(t\\) when the drink reaches 20°C, to the nearest minute. <b>3</b><br>(ii) Sketch the graph of \\(T\\) as a function of \\(t\\). <b>1</b>",
    ["(i) \\(\\displaystyle\\int \\frac{dT}{T - 24} = \\int k\\,dt\\), so \\(\\ln|T - 24| = kt + C\\) and \\(T = 24 + Ae^{kt}\\).", "At \\(t = 0\\), \\(T = 4\\): \\(A = -20\\), so \\(T = 24 - 20e^{kt}\\).",
     "At \\(t = 10\\): \\(9 = 24 - 20e^{10k}\\), so \\(e^{10k} = \\frac{3}{4}\\) and \\(k = \\frac{1}{10}\\ln\\frac{3}{4}\\).", "\\(20 = 24 - 20e^{kt}\\) gives \\(e^{kt} = \\frac{1}{5}\\), so \\(t = \\dfrac{10\\ln\\frac{1}{5}}{\\ln\\frac{3}{4}} \\approx 55.9\\), that is 56 minutes.",
     "(ii) The graph starts at \\((0, 4)\\), increases, and levels off towards the asymptote \\(T = 24\\) without reaching it." + pl.svg()],
    [("Both parts correct", 4), ("Part (i) correct", 3), ("Finds \\(T = 24 - 20e^{kt}\\) and the value of \\(k\\), or correct sketch with substantial progress in (i)", 2), ("Separates the variables and integrates correctly, or correct sketch", 1)])

# Q12(c) induction with a telescoping sum
n, kk = symbols('n k', positive=True, integer=True)
for N in range(1, 30): assert sum(Q(1, (r + 1) * (r + 2) * (r + 3)) for r in range(1, N + 1)) == Q(1, 12) - Q(1, 2 * (N + 2) * (N + 3))
P.W('q12c', 3, "Use mathematical induction to prove that<br>\\(\\dfrac{1}{2 \\times 3 \\times 4} + \\dfrac{1}{3 \\times 4 \\times 5} + \\cdots + \\dfrac{1}{(n + 1)(n + 2)(n + 3)} = \\dfrac{1}{12} - \\dfrac{1}{2(n + 2)(n + 3)}\\)<br>for all integers \\(n \\ge 1\\).",
    ["<b>Step 1.</b> \\(n = 1\\): LHS \\(= \\frac{1}{24}\\), RHS \\(= \\frac{1}{12} - \\frac{1}{2 \\times 3 \\times 4} = \\frac{2}{24} - \\frac{1}{24} = \\frac{1}{24}\\). True.",
     "<b>Step 2.</b> Assume true for \\(n = k\\): \\(\\displaystyle\\sum_{r=1}^{k} \\frac{1}{(r + 1)(r + 2)(r + 3)} = \\frac{1}{12} - \\frac{1}{2(k + 2)(k + 3)}\\).",
     "<b>Step 3.</b> For \\(n = k + 1\\), LHS \\(= \\frac{1}{12} - \\frac{1}{2(k + 2)(k + 3)} + \\frac{1}{(k + 2)(k + 3)(k + 4)}\\)",
     "\\(= \\frac{1}{12} - \\frac{(k + 4) - 2}{2(k + 2)(k + 3)(k + 4)} = \\frac{1}{12} - \\frac{k + 2}{2(k + 2)(k + 3)(k + 4)} = \\frac{1}{12} - \\frac{1}{2(k + 3)(k + 4)}\\), which is the RHS for \\(n = k + 1\\).",
     "So if it is true for \\(n = k\\), it is true for \\(n = k + 1\\). Since it is true for \\(n = 1\\), by mathematical induction it is true for all integers \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves \\(n = 1\\) and makes significant progress with \\(n = k + 1\\) using the assumption", 2), ("Proves \\(n = 1\\), or correctly adds the \\((k + 1)\\)th term", 1)])

# Q12(d) inverse of a restricted quadratic
f12 = lambda X: 9 - (1 - X / 3)**2; fi = lambda X: 3 - 3 * math.sqrt(9 - X)
assert f12(0) == 8 and abs(f12(-6)) < 1e-12 and f12(3) == 9 and all(abs(fi(f12(v)) - v) < 1e-9 for v in [-8, -6, -1, 0, 2.5, 3])
pa = Plot(-10, 5, -8, 10.5, w=260); pa.axes(xt=[-6], yt=[8]); pa.curve(f12, -10, 3); pa.dot(3, 9, 3.5); pa.text(3, 9, '(3, 9)', dx=8, dy=4, anchor='start', size=12)
pb = Plot(-8, 10.5, -10, 5, w=280); pb.line(-8, -8, 5, 5, dash='4 4', colour=GREY, width=1); pb.axes(xt=[8], yt=[-6]); pb.curve(fi, -8, 9); pb.dot(9, 3, 3.5); pb.text(9, 3, '(9, 3)', dx=-8, dy=-6, anchor='end', size=12)
P.W('q12d', 6, "A function is defined by \\(f(x) = 9 - \\left(1 - \\dfrac{x}{3}\\right)^2\\) for \\(x\\) in the domain \\((-\\infty, 3]\\).<br>"
    "(i) Sketch the graph of \\(y = f(x)\\), showing the \\(x\\)- and \\(y\\)-intercepts. <b>2</b><br>(ii) Find the equation of the inverse function, \\(f^{-1}(x)\\), and state its domain. <b>3</b><br>(iii) Sketch the graph of \\(y = f^{-1}(x)\\). <b>1</b>",
    ["(i) \\(f(0) = 9 - 1 = 8\\). \\(f(x) = 0\\) when \\(\\left(1 - \\frac{x}{3}\\right)^2 = 9\\); since \\(x \\le 3\\), \\(1 - \\frac{x}{3} \\ge 0\\), so \\(1 - \\frac{x}{3} = 3\\) and \\(x = -6\\). The graph is the left half of a parabola, rising to the endpoint \\((3, 9)\\)." + pa.svg(),
     "(ii) Swap \\(x\\) and \\(y\\): \\(x = 9 - \\left(1 - \\frac{y}{3}\\right)^2\\), so \\(\\left(1 - \\frac{y}{3}\\right)^2 = 9 - x\\).", "Since \\(y \\le 3\\), \\(1 - \\frac{y}{3} \\ge 0\\), so \\(1 - \\frac{y}{3} = \\sqrt{9 - x}\\) and \\(f^{-1}(x) = 3 - 3\\sqrt{9 - x}\\).",
     "The domain of \\(f^{-1}\\) is the range of \\(f\\): \\(x \\le 9\\), that is \\((-\\infty, 9]\\).", "(iii) The reflection of the graph in \\(y = x\\): through \\((0, -6)\\) and \\((8, 0)\\), ending at \\((9, 3)\\)." + pb.svg()],
    [("All parts correct", 6), ("Two parts correct and substantial progress on the third", 5), ("Correct inverse with its domain, or parts (i) and (iii) correct with progress in (ii)", 4), ("Correct inverse equation, or two parts correct", 3), ("Correct sketch in (i), or correct first step in (ii)", 2), ("One intercept correct, or swaps \\(x\\) and \\(y\\)", 1)])

# Q13(a) volume about the y-axis between two parabolas
yy = symbols('yy'); V13 = pi * integrate(yy, (yy, 0, 3)) - pi * integrate(yy - 1, (yy, 1, 3)); assert simplify(V13 - 5 * pi / 2) == 0
pl = Plot(-2.4, 2.4, -0.4, 3.6, w=300)
r3, r2 = math.sqrt(3), math.sqrt(2)
for sg in (1, -1):
    pl.region([(0, 0)] + [(sg * r3 * i / 60, 3 * (i / 60)**2) for i in range(61)] + [(sg * r2 * (60 - i) / 60, 1 + 2 * ((60 - i) / 60)**2) for i in range(61)])
pl.line(-2.4, 3, 2.4, 3, dash='4 4', colour=GREY, width=1); pl.axes(xt=[], yt=[1, 3])
for f_, lo in [(lambda X: X * X, r3), (lambda X: X * X + 1, r2)]: pl.curve(f_, -lo, lo, width=2)
pl.text(1.75, 2.0, 'y = x²', anchor='start', var=True, size=13); pl.text(0, 2.3, 'y = x² + 1', var=True, size=13)
P.W('q13a', 3, "A 3-metre-tall bowl is made by rotating the region between \\(y = x^2\\), \\(y = x^2 + 1\\) and \\(y = 3\\) around the \\(y\\)-axis (lengths in metres). The diagram shows a cross-section through the axis." + pl.svg() + "Find the volume of material needed to make the bowl.",
    ["About the \\(y\\)-axis, \\(V = \\pi\\displaystyle\\int x^2\\,dy\\).", "Outer solid (\\(x^2 = y\\), from \\(y = 0\\) to 3): \\(\\pi\\displaystyle\\int_0^3 y\\,dy = \\frac{9\\pi}{2}\\)",
     "Hollow inside (\\(x^2 = y - 1\\), from \\(y = 1\\) to 3): \\(\\pi\\displaystyle\\int_1^3 (y - 1)\\,dy = \\pi\\left[\\frac{(y - 1)^2}{2}\\right]_1^3 = 2\\pi\\)", "\\(V = \\frac{9\\pi}{2} - 2\\pi = \\frac{5\\pi}{2}\\) m³ \\(\\approx 7.85\\) m³"],
    [("Correct volume", 3), ("Both volumes correct, or one correct with the correct method", 2), ("One correct integral for a volume", 1)])

# Q13(b) projectile in a room
V0, th0, h0, H, Dw = 14, PI / 6, 1.5, 4, 12
tmax = V0 * math.sin(th0) / 10; ymax = h0 + V0 * math.sin(th0) * tmax - 5 * tmax**2; assert abs(ymax - 3.95) < 1e-9 and ymax < H
tw = Dw / (V0 * math.cos(th0)); yw = h0 + V0 * math.sin(th0) * tw - 5 * tw**2; assert 0 < yw < H and abs(yw - 3.53) < 0.01
P.W('q13b', 4, "When an object is projected from a point \\(h\\) metres above the origin with initial speed \\(V\\) m/s at an angle \\(\\theta\\) to the horizontal, its displacement vector \\(t\\) seconds later is \\(\\underset{\\sim}{r}(t) = (Vt\\cos\\theta)" + I_ + " + \\left(-5t^2 + Vt\\sin\\theta + h\\right)" + J_ + "\\) (do NOT prove this).<br>"
    "A student in an empty hall that is 4 m high throws a ball towards the far wall. The ball leaves their hand 1.5 m above the floor and 12 m from the far wall, with initial speed 14 m/s at an angle of \\(30^\\circ\\) to the horizontal.<br>Show that the ball will NOT hit the ceiling, but that it will hit the far wall without hitting the floor first.",
    ["Here \\(V\\cos\\theta = 7\\sqrt{3}\\), \\(V\\sin\\theta = 7\\) and \\(h = 1.5\\), so \\(x = 7\\sqrt{3}\\,t\\) and \\(y = -5t^2 + 7t + 1.5\\).", "Greatest height when \\(\\dot{y} = -10t + 7 = 0\\), at \\(t = 0.7\\): \\(y = -5(0.49) + 4.9 + 1.5 = 3.95\\) m, which is less than 4 m, so it does not hit the ceiling.",
     "It reaches the far wall when \\(7\\sqrt{3}\\,t = 12\\), \\(t = \\frac{12}{7\\sqrt{3}} \\approx 0.990\\) s.", "Then \\(y \\approx -5(0.980) + 6.928 + 1.5 \\approx 3.53\\) m \\(> 0\\). The ball is still in the air (and below the ceiling), so it hits the wall before the floor."],
    [("Complete correct solution", 4), ("Shows it misses the ceiling and finds when it reaches the wall", 3), ("Finds the greatest height, or the time to reach the wall", 2), ("Correct expressions for \\(x\\) and \\(y\\)", 1)])

# Q13(c) area between |x| line and a curve
top = 3 - sp.Abs(x); bot = 1 - 18 / (9 + x**2)
assert bot.subs(x, 3) == 0 and top.subs(x, 3) == 0 and bot.subs(x, 0) == -1
A13 = 2 * integrate((3 - x) - bot, (x, 0, 3)); assert simplify(A13 - (3 + 3 * pi)) == 0
pl = Plot(-5.2, 5.2, -1.8, 3.6, w=360)
pl.region([(X / 20, 3 - abs(X / 20)) for X in range(-60, 61)] + [(X / 20, 1 - 18 / (9 + (X / 20)**2)) for X in range(60, -61, -1)])
pl.axes(xt=[-3, 3], yt=[3, -1]); pl.curve(lambda X: 3 - abs(X), -5.2, 5.2, width=2); pl.curve(lambda X: 1 - 18 / (9 + X * X), -5.2, 5.2, width=2)
P.W('q13c', 3, "The region enclosed by \\(y = 3 - |x|\\) and \\(y = 1 - \\dfrac{18}{9 + x^2}\\) is shaded in the diagram." + pl.svg() + "Find the exact value of the area of the shaded region.",
    ["Both curves pass through \\((\\pm 3, 0)\\), and the region is symmetric about the \\(y\\)-axis.", "\\(\\displaystyle A = 2\\int_0^3 \\left[(3 - x) - \\left(1 - \\frac{18}{9 + x^2}\\right)\\right]dx = 2\\int_0^3 \\left(2 - x + \\frac{18}{9 + x^2}\\right)dx\\)",
     "\\(\\displaystyle= 2\\left[2x - \\frac{x^2}{2} + 6\\tan^{-1}\\frac{x}{3}\\right]_0^3 = 2\\left(6 - \\frac{9}{2} + 6 \\times \\frac{\\pi}{4}\\right)\\)", "\\(= 3 + 3\\pi\\) square units"],
    [("Correct exact area", 3), ("Correct integral with a correct primitive", 2), ("Correct integral for the area, or a correct primitive of \\(\\frac{18}{9 + x^2}\\)", 1)])

# Q13(d) sum-to-product identity then an equation
for X_, Z_ in [(0.3, 1.1), (2.0, -0.4)]:
    Y_ = (X_ + Z_) / 2; assert abs((math.sin(X_) + math.sin(Z_)) / (math.cos(X_) + math.cos(Z_)) - math.tan(Y_)) < 1e-12
th = symbols('theta', real=True); eq = (sin(3 * th / 5) + sin(th)) / (cos(3 * th / 5) + cos(th))
roots = [5 * PI / 16, 25 * PI / 16]
for r in roots: assert abs(float(eq.subs(th, r)) - 1) < 1e-12 and abs(math.cos(3 * r / 5) + math.cos(r)) > 1e-3
grid = [i * 2 * PI / 20000 for i in range(20001)]; vals = [(v, float(sp.N(1))) for v in []]
cnt = 0
for i in range(20000):
    a_, b_ = grid[i], grid[i + 1]
    g_ = lambda v: (math.sin(3 * v / 5) + math.sin(v)) - (math.cos(3 * v / 5) + math.cos(v))
    if g_(a_) * g_(b_) < 0 and abs(math.cos(3 * a_ / 5) + math.cos(a_)) > 1e-2: cnt += 1
assert cnt == 2
P.W('q13d', 4, "(i) The numbers \\(X\\), \\(Y\\) and \\(Z\\) satisfy \\(X = Y - d\\) and \\(Z = Y + d\\), where \\(d\\) is a constant. Show that \\(\\dfrac{\\sin X + \\sin Z}{\\cos X + \\cos Z} = \\tan Y\\). <b>2</b><br>"
    "(ii) Hence, or otherwise, solve \\(\\dfrac{\\sin\\frac{3\\theta}{5} + \\sin\\theta}{\\cos\\frac{3\\theta}{5} + \\cos\\theta} = 1\\) for \\(0 \\le \\theta \\le 2\\pi\\). <b>2</b>",
    ["(i) \\(\\sin X + \\sin Z = \\sin(Y - d) + \\sin(Y + d) = 2\\sin Y\\cos d\\)", "\\(\\cos X + \\cos Z = \\cos(Y - d) + \\cos(Y + d) = 2\\cos Y\\cos d\\)", "So \\(\\dfrac{\\sin X + \\sin Z}{\\cos X + \\cos Z} = \\dfrac{2\\sin Y\\cos d}{2\\cos Y\\cos d} = \\tan Y\\).",
     "(ii) With \\(X = \\frac{3\\theta}{5}\\) and \\(Z = \\theta\\), \\(Y = \\frac{X + Z}{2} = \\frac{4\\theta}{5}\\), so \\(\\tan\\frac{4\\theta}{5} = 1\\).", "\\(0 \\le \\frac{4\\theta}{5} \\le \\frac{8\\pi}{5}\\), so \\(\\frac{4\\theta}{5} = \\frac{\\pi}{4}\\) or \\(\\frac{5\\pi}{4}\\), giving \\(\\theta = \\frac{5\\pi}{16}\\) or \\(\\frac{25\\pi}{16}\\)."],
    [("Both parts correct", 4), ("Part (i) correct and \\(\\tan\\frac{4\\theta}{5} = 1\\) in (ii), or part (ii) correct", 3), ("Part (i) correct, or one correct solution in (ii)", 2), ("Expands \\(\\sin(Y \\pm d)\\) and \\(\\cos(Y \\pm d)\\) correctly, or finds \\(Y = \\frac{4\\theta}{5}\\)", 1)])

# Q14(a) heading against a crosswind
phi = math.radians(52) + math.asin(-35 * math.cos(math.radians(52)) / 210); hd = math.degrees(phi)
vel = (210 * math.sin(phi) + 35, 210 * math.cos(phi)); assert abs(math.degrees(math.atan2(vel[0], vel[1])) - 52) < 1e-9 and round(hd) == 46
P.W('q14a', 3, "A plane needs to travel to a destination on a bearing of 052°. Its engine gives it a speed of 210 km/h in still air, but there is a wind blowing from the west at a constant 35 km/h. On what bearing, to the nearest degree, should the plane be pointed so that it reaches its destination?",
    ["Let the plane point on bearing \\(\\phi\\). Its velocity is \\(210\\sin\\phi\\," + I_ + " + 210\\cos\\phi\\," + J_ + "\\) (east and north), and the wind adds \\(35" + I_ + "\\).",
     "The resultant must be along the bearing 052°, so \\(\\dfrac{210\\sin\\phi + 35}{210\\cos\\phi} = \\tan 52^\\circ\\).", "So \\(210(\\sin\\phi\\cos 52^\\circ - \\cos\\phi\\sin 52^\\circ) = -35\\cos 52^\\circ\\), that is \\(\\sin(\\phi - 52^\\circ) = -\\dfrac{35\\cos 52^\\circ}{210} \\approx -0.1026\\).",
     "\\(\\phi - 52^\\circ \\approx -5.9^\\circ\\), so \\(\\phi \\approx 46.1^\\circ\\). Point the plane on a bearing of 046°."],
    [("Correct bearing", 3), ("Correct equation in one unknown angle", 2), ("Correct vector (or triangle) for the plane's velocity and the wind", 1)])

# Q14(b) logistic growth, carrying capacity
C = (1 - math.exp(-2)) / (1 / 320000 - math.exp(-2) / 80000); assert round(C, -3) == 603000
Cs, tt = symbols('C t', positive=True); Pl = Cs / (1 + (Cs / 80000 - 1) * exp(-t / 10))
assert simplify(diff(Pl, tt.subs(tt, t)) - Q(1, 10) * Pl * (Cs - Pl) / Cs) == 0
P.W('q14b', 4, "In 1990 the number of kangaroos in a region was estimated at 80 000. The population grows according to the logistic equation \\(\\dfrac{dP}{dt} = 0.1P\\left(\\dfrac{C - P}{C}\\right)\\), where \\(t\\) is the number of years after 1990 and \\(C\\) is the carrying capacity. In 2010 the population was estimated at 320 000.<br>"
    "Use the fact that \\(\\dfrac{C}{P(C - P)} = \\dfrac{1}{P} + \\dfrac{1}{C - P}\\) to show that the carrying capacity is approximately 603 000.",
    ["\\(\\displaystyle\\int \\frac{C}{P(C - P)}\\,dP = \\int 0.1\\,dt\\), so \\(\\displaystyle\\int \\left(\\frac{1}{P} + \\frac{1}{C - P}\\right)dP = 0.1t + K\\).", "\\(\\ln P - \\ln(C - P) = 0.1t + K\\), that is \\(\\ln\\dfrac{P}{C - P} = 0.1t + K\\) (with \\(0 < P < C\\)).",
     "\\(t = 0\\), \\(P = 80\\,000\\): \\(K = \\ln\\dfrac{80\\,000}{C - 80\\,000}\\). \\(t = 20\\), \\(P = 320\\,000\\): \\(\\ln\\dfrac{320\\,000}{C - 320\\,000} = 2 + \\ln\\dfrac{80\\,000}{C - 80\\,000}\\).",
     "So \\(\\dfrac{320\\,000}{C - 320\\,000} = \\dfrac{80\\,000e^2}{C - 80\\,000}\\), giving \\(4(C - 80\\,000) = e^2(C - 320\\,000)\\).", "\\(C(e^2 - 4) = 320\\,000e^2 - 320\\,000\\), so \\(C = \\dfrac{320\\,000(e^2 - 1)}{e^2 - 4} \\approx 603\\,000\\)."],
    [("Complete correct working", 4), ("Correct equation in \\(C\\) from both conditions", 3), ("Correct general solution with \\(K\\) found from the 1990 value", 2), ("Correct integration using the given identity", 1)])

# Q14(c) trapezium with equal diagonals
am, bm, m = symbols('ab bb m', real=True)   # a.b, |b|^2 ; |a|^2 cancels
aa = symbols('aa', real=True)
AC2 = aa + 2 * m * am + m**2 * bm; BD2 = bm - 2 * am + aa
assert sp.factor(sp.expand(AC2 - BD2)) == sp.factor((m + 1) * (2 * am + (m - 1) * bm))
Av, Bv, Cv, Dv = (0, 0), (1.3, 1.9), (4.7, 1.9), (6, 0)
pl = Plot(-0.6, 8.2, -0.6, 2.6, w=400)
pl.raw('<path d="M%s,%sL%s,%sL%s,%sL%s,%sZ" fill="none" stroke="%s" stroke-width="1.5"/>' % (pl.X(0), pl.Y(0), pl.X(1.3), pl.Y(1.9), pl.X(4.7), pl.Y(1.9), pl.X(6), pl.Y(0), INK))
pl.line(0, 0, 4.7, 1.9, width=1.1); pl.line(1.3, 1.9, 6, 0, width=1.1)
for P_, lab, dx_, dy_ in [(Av, 'A', -8, 6), (Bv, 'B', -6, -8), (Cv, 'C', 6, -8), (Dv, 'D', 8, 6)]: pl.dot(*P_, r=3); pl.text(*P_, lab, dx=dx_, dy=dy_, var=True)
pl.text(8.1, 1.6, 'NOT TO SCALE', anchor='end', size=11)
A_, B_ = VEC('a'), VEC('b')
P.W('q14c', 4, "(i) For any vector " + M(VEC('v')) + ", show that " + M(VEC('v') + ' \\cdot ' + VEC('v') + ' = |' + VEC('v') + '|^2') + ". <b>1</b><br>"
    "(ii) In the trapezium \\(ABCD\\), \\(BC\\) is parallel to \\(AD\\) and the diagonals are equal in length, " + M('|\\overrightarrow{AC}| = |\\overrightarrow{BD}|') + "." + pl.svg() +
    "Let " + M(A_ + ' = \\overrightarrow{AB}') + ", " + M(B_ + ' = \\overrightarrow{AD}') + " and " + M('\\overrightarrow{BC} = m\\overrightarrow{AD}') + ", where \\(0 < m < 1\\). Using part (i), or otherwise, show that " + M('2' + A_ + ' \\cdot ' + B_ + ' + (m - 1)|' + B_ + '|^2 = 0') + ". <b>3</b>",
    ["(i) If " + M(VEC('v') + ' = x' + I_ + ' + y' + J_) + ", then " + M(VEC('v') + ' \\cdot ' + VEC('v') + ' = x^2 + y^2 = |' + VEC('v') + '|^2') + ". (Or: the angle between " + M(VEC('v')) + " and itself is 0, so " + M(VEC('v') + ' \\cdot ' + VEC('v') + ' = |' + VEC('v') + '||' + VEC('v') + '|\\cos 0 = |' + VEC('v') + '|^2') + ".)",
     "(ii) " + M('\\overrightarrow{AC} = \\overrightarrow{AB} + \\overrightarrow{BC} = ' + A_ + ' + m' + B_) + " and " + M('\\overrightarrow{BD} = \\overrightarrow{AD} - \\overrightarrow{AB} = ' + B_ + ' - ' + A_) + ".",
     "Using (i): " + M('|\\overrightarrow{AC}|^2 = (' + A_ + ' + m' + B_ + ') \\cdot (' + A_ + ' + m' + B_ + ') = |' + A_ + '|^2 + 2m\\,' + A_ + ' \\cdot ' + B_ + ' + m^2|' + B_ + '|^2'),
     M('|\\overrightarrow{BD}|^2 = (' + B_ + ' - ' + A_ + ') \\cdot (' + B_ + ' - ' + A_ + ') = |' + B_ + '|^2 - 2\\,' + A_ + ' \\cdot ' + B_ + ' + |' + A_ + '|^2'),
     "Equating: " + M('2(m + 1)\\,' + A_ + ' \\cdot ' + B_ + ' + (m^2 - 1)|' + B_ + '|^2 = 0') + ". Dividing by \\(m + 1 > 0\\): " + M('2' + A_ + ' \\cdot ' + B_ + ' + (m - 1)|' + B_ + '|^2 = 0') + "."],
    [("Both parts correct", 4), ("Part (ii) correct, or part (i) and both squared lengths correct in (ii)", 3), ("Correct expressions for \\(\\overrightarrow{AC}\\) and \\(\\overrightarrow{BD}\\) and one squared length", 2), ("Part (i), or correct expressions for \\(\\overrightarrow{AC}\\) and \\(\\overrightarrow{BD}\\)", 1)])

# Q14(d) sample size from a normal approximation of the sample proportion
for z in (1.96, 2):
    nreq = z**2 * 0.004 * 0.996 / 0.002**2; assert round(nreq, -3) == 4000
P.W('q14d', 3, "A bakery machine is considered acceptable if the proportion of misshapen loaves it produces is \\(p = \\dfrac{4}{1000}\\). To check the machine, a sample of \\(n\\) loaves is taken and the sample proportion \\(\\hat{p}\\) is found. "
    "Assume \\(\\hat{p}\\) is approximately normal with mean \\(\\mu = p\\) and variance \\(\\sigma^2 = \\dfrac{p(1 - p)}{n}\\). The machine will be stopped if \\(\\hat{p} \\ge \\dfrac{6}{1000}\\).<br>"
    "The sample size is to be chosen so that the chance of stopping an acceptable machine is less than 2.5%. Find the approximate sample size required, to the nearest thousand.",
    ["About 2.5% of a normal distribution lies more than 2 standard deviations above the mean (more precisely 1.96), so we need \\(\\frac{6}{1000}\\) to be at least 2 standard deviations above \\(\\frac{4}{1000}\\).",
     "\\(\\dfrac{0.006 - 0.004}{\\sqrt{\\frac{0.004 \\times 0.996}{n}}} \\ge 2\\), so \\(\\sqrt{n} \\ge \\dfrac{2\\sqrt{0.003984}}{0.002}\\)", "\\(n \\ge \\dfrac{4 \\times 0.003984}{0.000004} = 3984\\) (or 3826 using 1.96).", "The sample size is about 4000."],
    [("Correct sample size", 3), ("Correct inequality in \\(n\\)", 2), ("Correct standard deviation, or uses \\(z = 2\\) (or 1.96)", 1)])

# Q14(e) derivative of x times an inverse function
g = x**3 + 2 * x + 4; assert g.subs(x, 1) == 7
fd = 1 + 7 * (1 / diff(g, x).subs(x, 1)); assert fd == Q(12, 5)
P.W('q14e', 2, "The polynomial \\(g(x) = x^3 + 2x + 4\\) passes through the point \\((1, 7)\\). Find the gradient of the tangent to \\(f(x) = xg^{-1}(x)\\) at the point where \\(x = 7\\).",
    ["\\(f'(x) = g^{-1}(x) + x\\dfrac{d}{dx}g^{-1}(x)\\), and \\(\\dfrac{d}{dx}g^{-1}(x) = \\dfrac{1}{g'(g^{-1}(x))}\\).", "\\(g^{-1}(7) = 1\\) and \\(g'(1) = 3 + 2 = 5\\), so the derivative of \\(g^{-1}\\) at 7 is \\(\\frac{1}{5}\\).", "\\(f'(7) = 1 + 7 \\times \\frac{1}{5} = \\frac{12}{5}\\)"],
    [("Correct gradient", 2), ("Correct derivative of \\(g^{-1}\\) at \\(x = 7\\), or correct product rule", 1)])

P.save()
