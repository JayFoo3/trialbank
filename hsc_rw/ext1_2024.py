"""Trialbank versions of the 2024 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math, itertools, random
import sympy as sp
from sympy import Rational as Q, latex, sqrt, pi, sin, cos, tan, exp, log, symbols, integrate, diff, simplify, binomial, asin, acos, atan
from rw import Paper
from fig import Plot, INK
x, t, u, a, n, k, p = symbols('x t u a n k p', real=True)
P = Paper('hsc-ext1-2024', seed=2024)
V_ = lambda s: '\\(' + s + '\\)'

# Q1 sum of roots
assert sp.expand((x - 1) * (x + 2) * (x - 5)) == x**3 - 4 * x**2 - 7 * x + 10
P.M('q01', "The polynomial \\(x^3 - 4x^2 - 7x + 10\\) has zeros \\(1\\), \\(-2\\) and \\(\\alpha\\). What is the value of \\(\\alpha\\)?", V_('5'), [V_('-5'), V_('4'), V_('10')],
    "The sum of the zeros is \\(-\\frac{b}{a} = 4\\), so \\(1 + (-2) + \\alpha = 4\\) and \\(\\alpha = 5\\). (Check with the product: \\(1 \\times (-2) \\times 5 = -10 = -\\frac{d}{a}\\).)")

# Q2 total area of regions between curves that cross
d = lambda X: -0.12 * (X + 2) * X * (X - 3); g = lambda X: 0.3 * X + 0.4; f = lambda X: g(X) + d(X)
assert d(-2.5) > 0 and d(-1) < 0 and d(1.5) > 0 and d(3.5) < 0
pl = Plot(-3.6, 4.6, -1.6, 3.4, w=440)
pts = [(-3 + i * 7 / 300, f(-3 + i * 7 / 300)) for i in range(301)] + [(4 - i * 7 / 300, g(4 - i * 7 / 300)) for i in range(301)]
pl.region(pts)
pl.axes(xt=[-3, -2, -1, 1, 2, 3, 4], yt=[]); pl.curve(f, -3.5, 4.4); pl.curve(g, -3.5, 4.4)
pl.text(1.6, f(1.6), 'y = f(x)', dx=-6, dy=-12, anchor='end', var=True); pl.text(4.4, g(4.4), 'y = g(x)', dx=6, dy=10, anchor='start', var=True)
I = lambda lo, hi: f'\\displaystyle\\int_{{{lo}}}^{{{hi}}} \\left(f(x) - g(x)\\right)dx'
P.M('q02', "The graphs of \\(y = f(x)\\) and \\(y = g(x)\\) cross at \\(x = -2\\), \\(x = 0\\) and \\(x = 3\\). The regions between them from \\(x = -3\\) to \\(x = 4\\) are shaded." + pl.svg() + "Which expression gives the total area of the shaded regions?",
    V_(f"{I(-3,-2)} - {I(-2,0)} + {I(0,3)} - {I(3,4)}"),
    [V_(I(-3, 4)), V_(f"-{I(-3,-2)} + {I(-2,0)} - {I(0,3)} + {I(3,4)}"), V_(f"\\left|{I(-3,4)}\\right|")],
    "Area is always positive, so each piece needs \\(\\int (\\text{top} - \\text{bottom})\\). From \\(-3\\) to \\(-2\\) and from \\(0\\) to \\(3\\), \\(f\\) is on top, so \\(f - g\\) is positive. From \\(-2\\) to \\(0\\) and from \\(3\\) to \\(4\\), \\(g\\) is on top, so those integrals of \\(f - g\\) are negative and must be subtracted.")

# Q3 pigeonhole
assert 5 * 14 + 1 == 71
P.M('q03', "Players from 5 different clubs come together to form a squad. What is the smallest squad size that guarantees at least 15 players from one of the clubs?", V_('71'), [V_('70'), V_('75'), V_('76')],
    "With 70 players the squad could be exactly 14 from each club, so 70 is not enough. With \\(5 \\times 14 + 1 = 71\\), at least one club must have 15 or more.")

# Q4 domain and range of a sum of inverse trig
for X in [-2, -1.3, 0, 0.7, 2]: assert abs(3 * math.asin(X / 2) + 3 * math.acos(X / 2) - 3 * math.pi / 2) < 1e-12
P.M('q04', "What are the domain and range of \\(y = 3\\sin^{-1}\\left(\\frac{x}{2}\\right) + 3\\cos^{-1}\\left(\\frac{x}{2}\\right)\\)?",
    'Domain: \\([-2, 2]\\), range: \\(\\left\\{\\frac{3\\pi}{2}\\right\\}\\)', ['Domain: \\([-2, 2]\\), range: \\(\\left[-\\frac{3\\pi}{2}, \\frac{9\\pi}{2}\\right]\\)', 'Domain: \\(\\left[-\\frac{1}{2}, \\frac{1}{2}\\right]\\), range: \\(\\left\\{\\frac{3\\pi}{2}\\right\\}\\)', 'Domain: \\(\\left[-\\frac{1}{2}, \\frac{1}{2}\\right]\\), range: \\(\\left[-\\frac{3\\pi}{2}, \\frac{9\\pi}{2}\\right]\\)'],
    "Both need \\(-1 \\le \\frac{x}{2} \\le 1\\), so the domain is \\([-2, 2]\\). Since \\(\\sin^{-1} u + \\cos^{-1} u = \\frac{\\pi}{2}\\) for every \\(u\\), the function is always \\(3 \\times \\frac{\\pi}{2} = \\frac{3\\pi}{2}\\).")

# Q5 transformations
P.M('q05', "Consider \\(g(x) = \\frac{1}{2}\\cos^{-1}\\left(\\frac{x}{4}\\right)\\). Which transformations take \\(f(x) = \\cos^{-1} x\\) to \\(g(x)\\)?",
    'A vertical dilation by a factor of \\(\\frac{1}{2}\\) and a horizontal dilation by a factor of 4', ['A vertical dilation by a factor of \\(\\frac{1}{2}\\) and a horizontal dilation by a factor of \\(\\frac{1}{4}\\)', 'A vertical dilation by a factor of 2 and a horizontal dilation by a factor of 4', 'A vertical dilation by a factor of 2 and a horizontal dilation by a factor of \\(\\frac{1}{4}\\)'],
    "Multiplying the function by \\(\\frac{1}{2}\\) squashes it vertically by a factor of \\(\\frac{1}{2}\\). Replacing \\(x\\) with \\(\\frac{x}{4}\\) stretches it horizontally by a factor of 4 (the domain goes from \\([-1, 1]\\) to \\([-4, 4]\\)).")

# Q6 counting solutions, endpoints included
sols = [kk * math.pi / 3 for kk in range(-5, 10) if -1e-12 <= kk * math.pi / 3 <= math.pi + 1e-12]; assert len(sols) == 4
assert all(abs(abs(math.cos(3 * v)) - 1) < 1e-12 for v in sols) and sp.solveset(sp.Abs(cos(3 * x)) - 1, x, sp.Interval(0, pi)) == sp.FiniteSet(0, pi / 3, 2 * pi / 3, pi)
P.M('q06', "How many real values of \\(x\\) satisfy \\(|b| = |b\\cos(3x)|\\), where \\(x \\in [0, \\pi]\\) and \\(b\\) is not zero?", V_('4'), [V_('1'), V_('2'), V_('3')],
    "Dividing by \\(|b|\\) gives \\(|\\cos 3x| = 1\\), so \\(3x = k\\pi\\) and \\(x = \\frac{k\\pi}{3}\\). In \\([0, \\pi]\\) that is \\(0, \\frac{\\pi}{3}, \\frac{2\\pi}{3}, \\pi\\): both ends of the interval count, so there are 4.")

# Q7 binomial: guessing the last few questions
pr = 1 - Q(2, 3)**4 - 4 * Q(1, 3) * Q(2, 3)**3; assert pr == Q(11, 27)
P.M('q07', "A quiz has 40 multiple-choice questions, each with 3 options, and at least 38 correct answers are needed to pass. A student answers the first 36 questions correctly and guesses the last 4 at random. What is the probability that the student passes?",
    V_('\\frac{11}{27}'), [V_('\\frac{8}{27}'), V_('\\frac{1}{9}'), V_('\\frac{16}{81}')],
    "The student needs at least 2 of the 4 guesses right, each with probability \\(\\frac{1}{3}\\). \\(P(X \\ge 2) = 1 - P(0) - P(1) = 1 - \\left(\\frac{2}{3}\\right)^4 - 4\\left(\\frac{1}{3}\\right)\\left(\\frac{2}{3}\\right)^3 = 1 - \\frac{16}{81} - \\frac{32}{81} = \\frac{11}{27}\\). (\\(\\frac{8}{27}\\) is exactly 2 right, which misses 3 or 4 right.)")

# Q8 sample size for a standard deviation
nmin = next(N for N in range(1, 2000) if math.sqrt(0.24 / N) < 0.04 - 1e-15); assert nmin == 151 and abs(math.sqrt(0.24 / 150) - 0.04) < 1e-12
P.M('q08', "In a town, \\(\\frac{2}{5}\\) of adults cycle to work. A survey will ask \\(n\\) adults, and \\(\\hat{p}\\) is the proportion of those surveyed who cycle to work. What is the smallest \\(n\\) for which the standard deviation of \\(\\hat{p}\\) is less than 0.04?",
    V_('151'), [V_('150'), V_('600'), V_('601')],
    "\\(\\sqrt{\\frac{0.4 \\times 0.6}{n}} < 0.04\\) means \\(\\frac{0.24}{n} < 0.0016\\), so \\(n > 150\\). At \\(n = 150\\) the standard deviation is exactly 0.04, which is not less than 0.04, so the answer is 151.")

# Q9 two draws without replacement, different colours
for N_ in range(3, 9):
    for K in range(0, N_ + 1):
        bag = ['r'] * K + ['b'] * (N_ - K); good = sum(1 for i, j in itertools.permutations(range(N_), 2) if bag[i] != bag[j])
        assert Q(good, N_ * (N_ - 1)) == Q(2 * K * (N_ - K), N_ * (N_ - 1))
P.M('q09', "A bag has \\(n\\) marbles, \\(n \\ge 3\\): \\(k\\) are red and the rest are blue. Two marbles are drawn at random without replacement. Which expression gives the probability that the two marbles are different colours?",
    V_('\\dfrac{2k(n - k)}{n(n - 1)}'), [V_('\\dfrac{k(n - k)}{n(n - 1)}'), V_('\\dfrac{2k(n - k)}{n^2}'), V_('\\dfrac{k(k - 1) + (n - k)(n - k - 1)}{n(n - 1)}')],
    "Red then blue: \\(\\frac{k}{n} \\times \\frac{n - k}{n - 1}\\). Blue then red: \\(\\frac{n - k}{n} \\times \\frac{k}{n - 1}\\). Adding gives \\(\\frac{2k(n - k)}{n(n - 1)}\\). The second draw is out of \\(n - 1\\) because the first marble is not replaced, and the last option is the probability they are the same colour.")

# Q10 four auxiliary-angle forms
rng = random.Random(7)
for _ in range(50):
    A_, B_ = rng.uniform(-5, 5), rng.uniform(-5, 5); R_ = math.hypot(A_, B_)
    al = math.atan2(A_, B_) % (2 * math.pi); be = (-al) % (2 * math.pi); ga = math.atan2(-B_, A_) % (2 * math.pi); de = (-ga) % (2 * math.pi)
    for X in (0.3, 1.7, 4.1):
        assert abs(R_ * math.sin(X + al) - (A_ * math.cos(X) + B_ * math.sin(X))) < 1e-9 and abs(R_ * math.sin(X - be) - R_ * math.sin(X + al)) < 1e-9
        assert abs(R_ * math.cos(X + ga) - (A_ * math.cos(X) + B_ * math.sin(X))) < 1e-9 and abs(R_ * math.cos(X - de) - R_ * math.cos(X + ga)) < 1e-9
    assert abs((al + be) * (ga + de) - 4 * math.pi**2) < 1e-9
P.M('q10', "For non-zero real numbers \\(a\\) and \\(b\\), the expression \\(a\\cos x + b\\sin x\\) can be written in each of the forms \\(R\\sin(x + \\alpha)\\), \\(R\\sin(x - \\beta)\\), \\(R\\cos(x + \\gamma)\\) and \\(R\\cos(x - \\delta)\\), where \\(R > 0\\) and \\(0 < \\alpha, \\beta, \\gamma, \\delta < 2\\pi\\). What is the value of \\((\\alpha + \\beta)(\\gamma + \\delta)\\)?",
    V_('4\\pi^2'), [V_('0'), V_('\\pi^2'), V_('2\\pi^2')],
    "\\(R\\sin(x + \\alpha) = R\\sin(x - \\beta)\\) for all \\(x\\) means \\(-\\beta\\) and \\(\\alpha\\) differ by a multiple of \\(2\\pi\\). With both between 0 and \\(2\\pi\\), \\(\\beta = 2\\pi - \\alpha\\), so \\(\\alpha + \\beta = 2\\pi\\). In the same way \\(\\gamma + \\delta = 2\\pi\\), so the product is \\(4\\pi^2\\).")

# Q11(a) vectors
av, bv = sp.Matrix([4, -1]), sp.Matrix([2, 3]); assert 3 * av - 2 * bv == sp.Matrix([8, -9]) and av.dot(bv) == 5
P.W('q11a', 2, "Consider the vectors \\(\\underset{\\sim}{a} = 4\\underset{\\sim}{i} - \\underset{\\sim}{j}\\) and \\(\\underset{\\sim}{b} = 2\\underset{\\sim}{i} + 3\\underset{\\sim}{j}\\).<br>(i) Find \\(3\\underset{\\sim}{a} - 2\\underset{\\sim}{b}\\). <b>1</b><br>(ii) Find \\(\\underset{\\sim}{a} \\cdot \\underset{\\sim}{b}\\). <b>1</b>",
    ["(i) \\(3\\underset{\\sim}{a} - 2\\underset{\\sim}{b} = (12\\underset{\\sim}{i} - 3\\underset{\\sim}{j}) - (4\\underset{\\sim}{i} + 6\\underset{\\sim}{j}) = 8\\underset{\\sim}{i} - 9\\underset{\\sim}{j}\\)", "(ii) \\(\\underset{\\sim}{a} \\cdot \\underset{\\sim}{b} = 4 \\times 2 + (-1) \\times 3 = 5\\)"],
    [("Both parts correct", 2), ("One part correct", 1)])

# Q11(b) quadratic inequality
assert sp.solve_univariate_inequality(x**2 - 2 * x - 15 > 0, x, relational=False) == sp.Union(sp.Interval.open(-sp.oo, -3), sp.Interval.open(5, sp.oo))
P.W('q11b', 2, "Solve \\(x^2 - 2x - 15 > 0\\).", ["\\(x^2 - 2x - 15 = (x - 5)(x + 3)\\), which is zero at \\(x = -3\\) and \\(x = 5\\).", "The parabola is concave up, so it is positive outside the roots: \\(x < -3\\) or \\(x > 5\\)."],
    [("Correct solution", 2), ("Finds the critical values \\(-3\\) and \\(5\\), or one correct inequality", 1)])

# Q11(c) substitution
F = Q(2, 5) * (x + 3)**Q(5, 2) - 2 * (x + 3)**Q(3, 2); assert simplify(diff(F, x) - x * sqrt(x + 3)) == 0
P.W('q11c', 3, "Using the substitution \\(u = x + 3\\), find \\(\\displaystyle\\int x\\sqrt{x + 3}\\,dx\\).",
    ["\\(u = x + 3\\), so \\(du = dx\\) and \\(x = u - 3\\).", "\\(\\displaystyle\\int x\\sqrt{x + 3}\\,dx = \\int (u - 3)u^{\\frac{1}{2}}\\,du = \\int \\left(u^{\\frac{3}{2}} - 3u^{\\frac{1}{2}}\\right)du\\)",
     "\\(= \\frac{2}{5}u^{\\frac{5}{2}} - 2u^{\\frac{3}{2}} + C = \\frac{2}{5}(x + 3)^{\\frac{5}{2}} - 2(x + 3)^{\\frac{3}{2}} + C\\)"],
    [("Correct answer in terms of \\(x\\)", 3), ("Correct primitive in terms of \\(u\\)", 2), ("Correct integral in terms of \\(u\\)", 1)])

# Q11(d) separable DE
C = symbols('C'); Y = exp(x**3 / 3 + C); assert simplify(diff(Y, x) - x**2 * Y) == 0
P.W('q11d', 2, "Solve the differential equation \\(\\dfrac{dy}{dx} = x^2 y\\), given \\(y > 0\\). Give your answer in the form \\(y = e^{f(x)}\\).",
    ["\\(\\displaystyle\\int \\frac{1}{y}\\,dy = \\int x^2\\,dx\\)", "\\(\\ln y = \\frac{x^3}{3} + C\\) (no absolute value needed since \\(y > 0\\))", "\\(y = e^{\\frac{x^3}{3} + C}\\)"],
    [("Correct solution", 2), ("Separates the variables and integrates one side correctly", 1)])

# Q11(e) derivative of inverse cosine
assert simplify(diff(acos(x**3), x) + 3 * x**2 / sqrt(1 - x**6)) == 0
P.W('q11e', 1, "Differentiate \\(f(x) = \\cos^{-1}\\left(x^3\\right)\\).", ["\\(f'(x) = \\dfrac{-1}{\\sqrt{1 - (x^3)^2}} \\times 3x^2 = -\\dfrac{3x^2}{\\sqrt{1 - x^6}}\\)"], [("Correct derivative", 1)])

# Q11(f) related rates
r = symbols('r', positive=True); assert simplify(12 / diff(Q(4, 3) * pi * r**3, r) - 3 / (pi * r**2)) == 0
P.W('q11f', 2, "The volume of a sphere of radius \\(r\\) cm is \\(V = \\frac{4}{3}\\pi r^3\\), and the volume is increasing at 12 cm\\(^3\\) s\\(^{-1}\\). Show that the radius is increasing at \\(\\dfrac{dr}{dt} = \\dfrac{3}{\\pi r^2}\\) cm s\\(^{-1}\\).",
    ["\\(\\dfrac{dV}{dr} = 4\\pi r^2\\)", "\\(\\dfrac{dr}{dt} = \\dfrac{dV}{dt} \\div \\dfrac{dV}{dr} = \\dfrac{12}{4\\pi r^2} = \\dfrac{3}{\\pi r^2}\\)"],
    [("Correct working leading to the result", 2), ("Finds \\(\\frac{dV}{dr}\\), or uses a correct chain rule", 1)])

# Q11(g) area between y = tan x and y = x
A11g = integrate(tan(x) - x, (x, 0, pi / 4)); assert simplify(A11g - (log(2) / 2 - pi**2 / 32)) == 0 and float(A11g) > 0
pl = Plot(-0.15, 1.15, -0.15, 1.35, w=360)
pl.region([(i * (math.pi / 4) / 200, math.tan(i * (math.pi / 4) / 200)) for i in range(201)] + [(math.pi / 4 - i * (math.pi / 4) / 200, math.pi / 4 - i * (math.pi / 4) / 200) for i in range(201)])
pl.axes(xt=[math.pi / 4, 1], xtl=['π⁄4', '1'], yt=[1]); pl.curve(lambda X: math.tan(X), 0, 0.92); pl.curve(lambda X: X, 0, 1.1)
pl.line(math.pi / 4, 0, math.pi / 4, 1, dash='4 4', colour='#8a909c'); pl.text(0.68, 0.74, 'R', size=15, var=True)
pl.text(0.92, math.tan(0.92), 'y = tan x', dx=8, anchor='start', var=True); pl.text(1.1, 1.1, 'y = x', dx=6, dy=4, anchor='start', var=True)
P.W('q11g', 3, "The region \\(R\\) is bounded by the curves \\(y = \\tan x\\) and \\(y = x\\) and the line \\(x = \\frac{\\pi}{4}\\), as shown." + pl.svg() + "Find the area of \\(R\\).",
    ["\\(\\displaystyle\\text{Area} = \\int_0^{\\frac{\\pi}{4}} (\\tan x - x)\\,dx = \\int_0^{\\frac{\\pi}{4}} \\left(\\frac{\\sin x}{\\cos x} - x\\right)dx\\)", "\\(\\displaystyle= \\left[-\\ln(\\cos x) - \\frac{x^2}{2}\\right]_0^{\\frac{\\pi}{4}}\\)",
     "\\(= -\\ln\\left(\\frac{1}{\\sqrt{2}}\\right) - \\frac{\\pi^2}{32} - 0 = \\frac{1}{2}\\ln 2 - \\frac{\\pi^2}{32}\\)"],
    [("Correct answer", 3), ("Correct primitive of \\(\\tan x - x\\)", 2), ("Correct integral for the area, or correct primitive of \\(\\tan x\\)", 1)])

# Q12(a) perpendicular vectors
assert sp.solve(sp.Matrix([a, -2]).dot(sp.Matrix([a + 3, a + 1])), a) == [-2, 1]
P.W('q12a', 3, "The vectors \\(\\begin{pmatrix} a \\\\ -2 \\end{pmatrix}\\) and \\(\\begin{pmatrix} a + 3 \\\\ a + 1 \\end{pmatrix}\\) are perpendicular. Find the possible values of \\(a\\).",
    ["Perpendicular vectors have a dot product of 0: \\(a(a + 3) - 2(a + 1) = 0\\)", "\\(a^2 + a - 2 = 0\\)", "\\((a + 2)(a - 1) = 0\\), so \\(a = -2\\) or \\(a = 1\\)"],
    [("Both correct values", 3), ("Correct quadratic equation", 2), ("Sets the dot product equal to 0", 1)])

# Q12(b) volume about the x-axis
Vb = pi * integrate((2 / x**2)**2, (x, 1, 2)); assert simplify(Vb - Q(7, 6) * pi) == 0
P.W('q12b', 3, "The region \\(R\\) is bounded by the curve \\(y = \\dfrac{2}{x^2}\\), the \\(x\\)-axis and the lines \\(x = 1\\) and \\(x = 2\\). Find the volume of the solid formed when \\(R\\) is rotated about the \\(x\\)-axis.",
    ["\\(\\displaystyle V = \\pi\\int_1^2 \\left(\\frac{2}{x^2}\\right)^2 dx = \\pi\\int_1^2 4x^{-4}\\,dx\\)", "\\(\\displaystyle= \\pi\\left[-\\frac{4}{3x^3}\\right]_1^2 = \\pi\\left(-\\frac{4}{24} + \\frac{4}{3}\\right)\\)", "\\(= \\frac{7\\pi}{6}\\) cubic units"],
    [("Correct answer", 3), ("Correct primitive with correct limits", 2), ("Correct integral for the volume", 1)])

# Q12(c) normal approximation
sd = math.sqrt(0.4 * 0.6 / 150); z = (0.44 - 0.4) / sd; assert abs(sd - 0.04) < 1e-12 and abs(z - 1) < 1e-9
P.W('q12c', 3, "A fundraiser knocks on doors, and at each house there is a 0.4 chance of a donation. Each evening the fundraiser visits exactly 150 houses. Given that \\(P(Z \\le 1) = 0.8413\\) for a standard normal variable \\(Z\\), use a normal approximation to find the probability that on a particular evening at least 44% of the houses visited make a donation.",
    ["Let \\(\\hat{p}\\) be the proportion of houses that donate. \\(E(\\hat{p}) = 0.4\\)", "\\(\\sigma = \\sqrt{\\frac{0.4 \\times 0.6}{150}} = \\sqrt{0.0016} = 0.04\\)", "\\(z = \\frac{0.44 - 0.4}{0.04} = 1\\)", "\\(P(\\hat{p} \\ge 0.44) \\approx P(Z \\ge 1) = 1 - 0.8413 = 0.1587\\)"],
    [("Correct answer", 3), ("Correct z-score with an error in the final probability", 2), ("Correct standard deviation of \\(\\hat{p}\\)", 1)])

# Q12(d) induction: divisibility
for N in range(1, 25): assert (3**(2 * N) + 7) % 8 == 0
P.W('q12d', 3, "Use mathematical induction to prove that \\(3^{2n} + 7\\) is divisible by 8 for all integers \\(n \\ge 1\\).",
    ["<b>Step 1.</b> Prove true for \\(n = 1\\): \\(3^2 + 7 = 16 = 8 \\times 2\\), which is divisible by 8. So it is true for \\(n = 1\\).",
     "<b>Step 2.</b> Assume true for \\(n = k\\): \\(3^{2k} + 7 = 8M\\) for some integer \\(M\\), so \\(3^{2k} = 8M - 7\\).",
     "<b>Step 3.</b> Prove true for \\(n = k + 1\\), that is \\(3^{2k+2} + 7\\) is divisible by 8.",
     "\\(3^{2k+2} + 7 = 9 \\times 3^{2k} + 7 = 9(8M - 7) + 7\\) (by the assumption)", "\\(= 72M - 56 = 8(9M - 7)\\), which is divisible by 8 since \\(9M - 7\\) is an integer.",
     "So if it is true for \\(n = k\\), it is true for \\(n = k + 1\\). Since it is true for \\(n = 1\\), by mathematical induction it is true for all integers \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves the case \\(n = 1\\) and uses the assumption in an attempt at \\(n = k + 1\\)", 2), ("Proves the case \\(n = 1\\), or states the assumption and what must be proved", 1)])

# Q12(e) inequality with an absolute value, using a graph
ok_ = lambda X: X != 10 and X / 24 >= 1 / abs(X - 10)
for i in range(-200, 2000):
    X = i / 50
    if X == 10: continue
    assert ok_(X) == ((4 <= X <= 6) or X >= 12), X
pl = Plot(-2.5, 17, -0.08, 0.62, w=440, h=260)
pl.axes(xt=[10], yt=[0.1], ytl=['1⁄10']); pl.curve(lambda X: 1 / abs(X - 10) if X != 10 else None, -2.5, 9.6); pl.curve(lambda X: 1 / abs(X - 10), 10.4, 17)
pl.line(10, -0.06, 10, 0.6, dash='3 3', colour='#8a909c'); pl.text(16.5, 0.5, 'NOT TO SCALE', anchor='end', size=11)
P.W('q12e', 3, "The diagram shows the graph of \\(y = \\dfrac{1}{|x - 10|}\\)." + pl.svg() + "For what values of \\(x\\) is \\(\\dfrac{x}{24} \\ge \\dfrac{1}{|x - 10|}\\)?",
    ["The right side is positive, so we need \\(x > 0\\) (and \\(x \\ne 10\\)).", "For \\(x > 10\\): \\(x(x - 10) \\ge 24\\), so \\(x^2 - 10x - 24 \\ge 0\\), \\((x - 12)(x + 2) \\ge 0\\), giving \\(x \\ge 12\\).",
     "For \\(0 < x < 10\\): \\(x(10 - x) \\ge 24\\), so \\(x^2 - 10x + 24 \\le 0\\), \\((x - 4)(x - 6) \\le 0\\), giving \\(4 \\le x \\le 6\\).", "So \\(4 \\le x \\le 6\\) or \\(x \\ge 12\\). (On the graph, the line \\(y = \\frac{x}{24}\\) is above the curve on these intervals.)"],
    [("Correct solution", 3), ("One correct interval, or both cases set up correctly", 2), ("Considers \\(x > 10\\) and \\(x < 10\\) separately, or finds one of the critical values", 1)])

# Q13(a) logistic equation and its direction field
Pp = symbols('P'); assert sp.solve(diff(Pp * (1500 - Pp), Pp), Pp) == [750]
kk = 0.0001; pl = Plot(-1.5, 30, -150, 2050, w=440, h=300)
sx = (pl.w - 2 * pl.pad) / (pl.b - pl.a); sy = (pl.h - 2 * pl.pad) / (pl.d - pl.c)
for i in range(0, 15):
    for j in range(0, 14):
        T0, P0 = i * 2, j * 150
        m_ = kk * P0 * (1500 - P0); L = math.hypot(sx, m_ * sy); ux, uy = 6 * sx / L, -6 * m_ * sy / L
        pl.raw(f'<path d="M{round(pl.X(T0) - ux, 1)},{round(pl.Y(P0) - uy, 1)}L{round(pl.X(T0) + ux, 1)},{round(pl.Y(P0) + uy, 1)}" stroke="{INK}" stroke-width="1.2"/>')
pl.axes(xt=[], yt=[1500], ytl=['1500'], xl='t', yl='P'); pl.dot(0, 300); pl.text(0, 300, 'S', dx=-10, dy=4, anchor='end', var=True); pl.dot(17, 1800); pl.text(17, 1800, 'T', dx=8, dy=-6, anchor='start', var=True)
P.W('q13a', 4, "In an experiment, the number of fish \\(P(t)\\) in a pond is modelled by the logistic differential equation \\(\\dfrac{dP}{dt} = 0.0001P(1500 - P)\\), where \\(t\\) is the time in days. The direction field is shown, and the point \\(S\\) is the starting population." + pl.svg() +
    "(i) Explain why the solution that passes through \\(S\\) cannot also pass through the point \\(T\\). <b>1</b><br>(ii) Sketch the solution that passes through \\(S\\) (draw it on the diagram). <b>1</b><br>(iii) Find the population at which the population is growing fastest. <b>2</b>",
    ["(i) \\(P = 1500\\) is a solution (the slope is 0 there), and different solutions cannot cross. \\(S\\) is below 1500 and \\(T\\) is above it, so a solution through \\(S\\) would have to cross \\(P = 1500\\) to reach \\(T\\).",
     "(ii) Starting at \\(S\\), the curve rises slowly, gets steeper up to \\(P = 750\\), then flattens out and approaches \\(P = 1500\\) without reaching it (an S-shaped curve).",
     "(iii) The growth rate is \\(\\frac{dP}{dt} = 0.0001(1500P - P^2)\\). Its derivative with respect to \\(P\\) is \\(0.0001(1500 - 2P)\\), which is 0 at \\(P = 750\\).", "The growth rate is a concave-down quadratic in \\(P\\), so this is a maximum: the population grows fastest at \\(P = 750\\)."],
    [("All three parts correct", 4), ("Two parts correct, with progress in the third", 3), ("Two parts correct, or part (iii) correct", 2), ("One part correct, or differentiates \\(P(1500 - P)\\) with respect to \\(P\\)", 1)])

# Q13(b) identity then a definite integral
assert simplify(sp.expand_trig(cos(x)**4 + sin(x)**4 - (3 + cos(4 * x)) / 4)) == 0 or simplify((cos(x)**4 + sin(x)**4 - (3 + cos(4 * x)) / 4).rewrite(exp)) == 0
Ib = integrate(cos(x)**4 + sin(x)**4, (x, 0, pi / 8)); assert simplify(Ib - (3 * pi / 32 + Q(1, 16))) == 0
P.W('q13b', 5, "(i) Show that \\(\\cos^4 x + \\sin^4 x = \\dfrac{3 + \\cos 4x}{4}\\). <b>2</b><br>(ii) Hence, or otherwise, evaluate \\(\\displaystyle\\int_0^{\\frac{\\pi}{8}} \\left(\\cos^4 x + \\sin^4 x\\right)dx\\). <b>3</b>",
    ["(i) \\(\\cos^4 x + \\sin^4 x = (\\cos^2 x + \\sin^2 x)^2 - 2\\sin^2 x\\cos^2 x = 1 - \\frac{1}{2}\\sin^2 2x\\)", "\\(= 1 - \\frac{1}{2} \\times \\frac{1 - \\cos 4x}{2} = 1 - \\frac{1 - \\cos 4x}{4} = \\frac{3 + \\cos 4x}{4}\\)",
     "(ii) \\(\\displaystyle\\int_0^{\\frac{\\pi}{8}} \\frac{3 + \\cos 4x}{4}\\,dx = \\left[\\frac{3x}{4} + \\frac{\\sin 4x}{16}\\right]_0^{\\frac{\\pi}{8}}\\)", "\\(= \\frac{3\\pi}{32} + \\frac{\\sin\\frac{\\pi}{2}}{16} - 0 = \\frac{3\\pi}{32} + \\frac{1}{16}\\)"],
    [("Both parts correct", 5), ("Part (i) correct and a correct primitive in (ii)", 4), ("Part (i) correct, or part (ii) correct", 3), ("Progress in (i), such as \\(\\sin^2 x\\cos^2 x = \\frac{1}{4}\\sin^2 2x\\), and a correct integral in (ii)", 2), ("Some correct progress in either part", 1)])

# Q13(c) a vector from its two projections
x1, x2 = symbols('x1 x2'); A2, B2 = sp.Matrix([2, 1]), sp.Matrix([-1, 3]); X2 = sp.Matrix([x1, x2])
sol = sp.solve([X2.dot(A2) - k * A2.dot(A2), X2.dot(B2) - p * B2.dot(B2)], [x1, x2]); assert sol == {x1: (15 * k - 10 * p) / 7, x2: (5 * k + 20 * p) / 7}
Xs = sp.Matrix([sol[x1], sol[x2]]); assert simplify((Xs.dot(A2) / A2.dot(A2)) - k) == 0 and simplify((Xs.dot(B2) / B2.dot(B2)) - p) == 0
P.W('q13c', 4, "The vector \\(\\underset{\\sim}{a} = \\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}\\) and the vector \\(\\underset{\\sim}{b} = \\begin{pmatrix} -1 \\\\ 3 \\end{pmatrix}\\). The projection of a vector \\(\\underset{\\sim}{x}\\) onto \\(\\underset{\\sim}{a}\\) is \\(k\\underset{\\sim}{a}\\), and the projection of \\(\\underset{\\sim}{x}\\) onto \\(\\underset{\\sim}{b}\\) is \\(p\\underset{\\sim}{b}\\), where \\(k\\) and \\(p\\) are real numbers. Find \\(\\underset{\\sim}{x}\\) in terms of \\(k\\) and \\(p\\).",
    ["Let \\(\\underset{\\sim}{x} = \\begin{pmatrix} x_1 \\\\ x_2 \\end{pmatrix}\\). The projection onto \\(\\underset{\\sim}{a}\\) is \\(\\dfrac{\\underset{\\sim}{x} \\cdot \\underset{\\sim}{a}}{\\underset{\\sim}{a} \\cdot \\underset{\\sim}{a}}\\underset{\\sim}{a}\\), so \\(\\dfrac{2x_1 + x_2}{5} = k\\), that is \\(2x_1 + x_2 = 5k\\).",
     "Similarly \\(\\dfrac{-x_1 + 3x_2}{10} = p\\), so \\(-x_1 + 3x_2 = 10p\\).", "From the first, \\(x_2 = 5k - 2x_1\\). Substituting: \\(-x_1 + 15k - 6x_1 = 10p\\), so \\(x_1 = \\dfrac{15k - 10p}{7}\\).",
     "\\(x_2 = 5k - \\dfrac{30k - 20p}{7} = \\dfrac{5k + 20p}{7}\\)", "\\(\\underset{\\sim}{x} = \\dfrac{1}{7}\\begin{pmatrix} 15k - 10p \\\\ 5k + 20p \\end{pmatrix}\\)"],
    [("Correct vector", 4), ("Two correct equations solved with one error", 3), ("Two correct equations in \\(x_1\\) and \\(x_2\\)", 2), ("Uses the projection formula correctly for one of the vectors", 1)])

# Q13(d) a clever substitution
G = atan((exp(x) + 3 * exp(-x)) / 3) / 3; assert simplify(diff(G, x) - (exp(3 * x) - 3 * exp(x)) / (exp(4 * x) + 15 * exp(2 * x) + 9)) == 0
P.W('q13d', 3, "Using the substitution \\(u = e^x + 3e^{-x}\\), and by considering \\(u^2\\), find \\(\\displaystyle\\int \\frac{e^{3x} - 3e^x}{e^{4x} + 15e^{2x} + 9}\\,dx\\).",
    ["\\(u^2 = e^{2x} + 6 + 9e^{-2x}\\) and \\(\\dfrac{du}{dx} = e^x - 3e^{-x}\\).", "Dividing the top and bottom by \\(e^{2x}\\): \\(\\dfrac{e^{3x} - 3e^x}{e^{4x} + 15e^{2x} + 9} = \\dfrac{e^x - 3e^{-x}}{e^{2x} + 15 + 9e^{-2x}} = \\dfrac{e^x - 3e^{-x}}{u^2 + 9}\\)",
     "\\(\\displaystyle\\int \\frac{du}{u^2 + 9} = \\frac{1}{3}\\tan^{-1}\\left(\\frac{u}{3}\\right) + C = \\frac{1}{3}\\tan^{-1}\\left(\\frac{e^x + 3e^{-x}}{3}\\right) + C\\)"],
    [("Correct answer", 3), ("Correct integral in terms of \\(u\\)", 2), ("Finds \\(u^2\\) or \\(\\frac{du}{dx}\\) and relates them to the integrand", 1)])

# Q14(a) solve a DE, then domain and range of the solution
ysol = -log((3 - exp(2 * x)) / 2); assert simplify(diff(ysol, x) - exp(2 * x + ysol)) == 0 and ysol.subs(x, 0) == 0
assert simplify(sp.limit(ysol, x, -sp.oo) - log(Q(2, 3))) == 0
P.W('q14a', 4, "Find the domain and range of the solution to the differential equation \\(\\dfrac{dy}{dx} = e^{2x + y}\\) whose graph passes through the origin.",
    ["\\(\\dfrac{dy}{dx} = e^{2x}e^{y}\\), so \\(\\displaystyle\\int e^{-y}\\,dy = \\int e^{2x}\\,dx\\): \\(-e^{-y} = \\frac{1}{2}e^{2x} + C\\)", "At \\((0, 0)\\): \\(-1 = \\frac{1}{2} + C\\), so \\(C = -\\frac{3}{2}\\) and \\(e^{-y} = \\frac{3 - e^{2x}}{2}\\).",
     "\\(y = -\\ln\\left(\\frac{3 - e^{2x}}{2}\\right)\\), which needs \\(3 - e^{2x} > 0\\), so the domain is \\(x < \\frac{1}{2}\\ln 3\\).",
     "As \\(x \\to -\\infty\\), \\(\\frac{3 - e^{2x}}{2} \\to \\frac{3}{2}\\), and as \\(x \\to \\frac{1}{2}\\ln 3\\), it \\(\\to 0^+\\). So \\(\\frac{3 - e^{2x}}{2}\\) takes every value in \\(\\left(0, \\frac{3}{2}\\right)\\).",
     "So \\(y = -\\ln(\\dots)\\) takes every value greater than \\(-\\ln\\frac{3}{2}\\): the range is \\(y > \\ln\\frac{2}{3}\\)."],
    [("Correct domain and range", 4), ("Correct solution and correct domain, or correct range", 3), ("Correct solution for \\(y\\) (or \\(e^{-y}\\)) through the origin", 2), ("Separates the variables and integrates correctly", 1)])

# Q14(b) when is a function one-to-one
kq = symbols('k', real=True); fk = kq * x / (1 + x**2) + 2 * atan(x); num = sp.factor(sp.together(diff(fk, x)) * (1 + x**2)**2)
assert sp.expand(num - ((2 - kq) * x**2 + (kq + 2))) == 0
for kv in [-2, -1.5, 0, 1, 2]: assert all(float(diff(fk, x).subs({kq: kv, x: X})) >= 0 for X in [i / 7 for i in range(-80, 81)])
for kv in [-2.5, 2.5, 5]: assert min(float(diff(fk, x).subs({kq: kv, x: X})) for X in [i / 7 for i in range(-80, 81)]) < 0 < max(float(diff(fk, x).subs({kq: kv, x: X})) for X in [i / 7 for i in range(-80, 81)])
P.W('q14b', 3, "For what values of the constant \\(k\\) does the function \\(f(x) = \\dfrac{kx}{1 + x^2} + 2\\tan^{-1} x\\) have an inverse function?",
    ["\\(f'(x) = \\dfrac{k(1 + x^2) - 2kx^2}{(1 + x^2)^2} + \\dfrac{2}{1 + x^2} = \\dfrac{k(1 - x^2) + 2(1 + x^2)}{(1 + x^2)^2} = \\dfrac{(2 - k)x^2 + (k + 2)}{(1 + x^2)^2}\\)",
     "\\(f\\) has an inverse if it never changes direction. Since \\(f'(x)\\) has the sign of \\((2 - k)x^2 + (k + 2)\\), and this cannot be negative for all \\(x\\), we need it to be \\(\\ge 0\\) for all \\(x\\).",
     "That needs \\(2 - k \\ge 0\\) (so it does not go negative for large \\(x\\)) and \\(k + 2 \\ge 0\\) (its value at \\(x = 0\\)).", "So \\(-2 \\le k \\le 2\\). (At \\(k = -2\\), \\(f'(x) = 0\\) only at \\(x = 0\\), so \\(f\\) is still increasing.)"],
    [("Correct values of \\(k\\)", 3), ("Correct derivative over a common denominator and a correct condition on one coefficient", 2), ("Correct derivative, or states that \\(f'(x)\\) must not change sign", 1)])

# Q14(c) inverse tangents
assert abs(math.atan(2) + math.atan(3) - 3 * math.pi / 4) < 1e-12 and abs(math.atan(-1 / 3) + math.atan(-1 / 2) - 3 * math.pi / 4) > 1
P.W('q14c', 3, "(i) Explain why the equation \\(\\tan^{-1}(2x) + \\tan^{-1}(3x) = \\theta\\), where \\(-\\pi < \\theta < \\pi\\), has exactly one solution. <b>1</b><br>(ii) Solve \\(\\tan^{-1}(2x) + \\tan^{-1}(3x) = \\dfrac{3\\pi}{4}\\). <b>2</b>",
    ["(i) \\(\\tan^{-1}(2x)\\) and \\(\\tan^{-1}(3x)\\) are both continuous and increasing, each with range \\(\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)\\). So their sum is continuous and increasing with range \\((-\\pi, \\pi)\\), and takes each value \\(\\theta\\) in that range exactly once.",
     "(ii) Take the tangent of both sides: \\(\\dfrac{2x + 3x}{1 - 6x^2} = \\tan\\dfrac{3\\pi}{4} = -1\\)", "\\(5x = 6x^2 - 1\\), so \\(6x^2 - 5x - 1 = 0\\) and \\((6x + 1)(x - 1) = 0\\): \\(x = 1\\) or \\(x = -\\frac{1}{6}\\).",
     "Since \\(\\frac{3\\pi}{4} > 0\\), \\(x\\) must be positive (for \\(x < 0\\) the left side is negative). So \\(x = 1\\). Check: \\(\\tan^{-1} 2 + \\tan^{-1} 3 = \\frac{3\\pi}{4}\\)."],
    [("Both parts correct", 3), ("Part (i) correct, or correct quadratic and \\(x = 1\\) without rejecting \\(-\\frac{1}{6}\\)", 2), ("Correct explanation in (i), or uses the tangent sum formula correctly", 1)])

# Q14(d) projectile: when does the distance from the origin always increase
Vv, g, th, tt = symbols('V g theta t', positive=True)
D2 = (Vv * tt * cos(th))**2 + (Vv * tt * sin(th) - g * tt**2 / 2)**2
assert simplify(sp.expand(diff(D2, tt)) - tt * (2 * Vv**2 - 3 * Vv * g * tt * sin(th) + g**2 * tt**2)) == 0
disc = sp.expand((3 * Vv * g * sin(th))**2 - 4 * g**2 * 2 * Vv**2); assert simplify(disc - Vv**2 * g**2 * (9 * sin(th)**2 - 8)) == 0
P.W('q14d', 4, "A particle is projected from the origin with speed \\(V\\) at an angle \\(\\theta\\) to the horizontal, where \\(0 < \\theta < \\frac{\\pi}{2}\\). Its position vector after \\(t\\) seconds is \\(\\underset{\\sim}{r}(t) = \\begin{pmatrix} Vt\\cos\\theta \\\\ Vt\\sin\\theta - \\frac{1}{2}gt^2 \\end{pmatrix}\\). (Do NOT prove this.)<br>"
    "Let \\(D(t) = |\\underset{\\sim}{r}(t)|\\) be the distance of the particle from the origin. Find the largest value of \\(\\sin\\theta\\) for which \\(D(t)\\) keeps increasing for all \\(t > 0\\).",
    ["\\(D^2 = V^2t^2\\cos^2\\theta + \\left(Vt\\sin\\theta - \\frac{1}{2}gt^2\\right)^2 = V^2t^2 - Vg t^3\\sin\\theta + \\frac{1}{4}g^2t^4\\)", "\\(\\dfrac{d(D^2)}{dt} = 2V^2t - 3Vgt^2\\sin\\theta + g^2t^3 = t\\left(g^2t^2 - 3Vg\\sin\\theta\\, t + 2V^2\\right)\\)",
     "\\(D\\) is increasing whenever \\(D^2\\) is. For \\(t > 0\\) this needs the quadratic \\(g^2t^2 - 3Vg\\sin\\theta\\, t + 2V^2\\) to stay positive, so its discriminant must be negative:",
     "\\(9V^2g^2\\sin^2\\theta - 8V^2g^2 < 0\\), so \\(\\sin^2\\theta < \\frac{8}{9}\\) and \\(\\sin\\theta < \\frac{2\\sqrt{2}}{3}\\).",
     "At \\(\\sin\\theta = \\frac{2\\sqrt{2}}{3}\\) the quadratic only touches zero at one instant, so \\(D\\) still never decreases. The largest value is \\(\\sin\\theta = \\frac{2\\sqrt{2}}{3}\\)."],
    [("Correct value with justification", 4), ("Correct derivative of \\(D^2\\) and correct discriminant condition", 3), ("Correct derivative of \\(D^2\\) (or of \\(D\\))", 2), ("Correct expression for \\(D^2\\)", 1)])

P.save()
