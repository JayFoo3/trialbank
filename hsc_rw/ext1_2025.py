"""Trialbank versions of the 2025 Mathematics Extension 1 HSC questions: same skills and traps, new numbers and our own wording.
Every answer is worked out or checked in code here before it goes into a model answer; diagrams are drawn by fig.py."""
import math, itertools, random
import sympy as sp
from sympy import Rational as Q, latex, sqrt, pi, sin, cos, tan, exp, log, symbols, integrate, diff, simplify, binomial, asin, acos, atan
from rw import Paper
from fig import Plot, INK
x, t, y = symbols('x t y', real=True)
P = Paper('hsc-ext1-2025', seed=2025)
V_ = lambda s: '\\(' + s + '\\)'
vec = lambda s: f'\\underset{{\\sim}}{{{s}}}'

# Q1 absolute value inequality
assert sp.solve_univariate_inequality(sp.Abs(3 * x - 1) < 8, x, relational=False) == sp.Interval.open(Q(-7, 3), 3)
P.M('q01', "What is the solution to \\(|3x - 1| < 8\\)?", V_('-\\frac{7}{3} < x < 3'), [V_('x < -\\frac{7}{3} \\text{ or } x > 3'), V_('-3 < x < \\frac{7}{3}'), V_('x < -3 \\text{ or } x > \\frac{7}{3}')],
    "\\(|3x - 1| < 8\\) means \\(-8 < 3x - 1 < 8\\), so \\(-7 < 3x < 9\\) and \\(-\\frac{7}{3} < x < 3\\). A 'less than' absolute value inequality gives one interval between the two values.")

# Q2 projection
u2, v2 = sp.Matrix([3, -1]), sp.Matrix([1, 2]); assert (u2.dot(v2) / v2.dot(v2)) * v2 == sp.Matrix([Q(1, 5), Q(2, 5)])
P.M('q02', ("The projection of " + (V_(vec('u'))) + " onto " + (V_(vec('v'))) + " is " + (V_('\\left(\\dfrac{' + vec('u') + ' \\cdot ' + vec('v') + '}{|' + vec('v') + '|^2}\\right)' + vec('v'))) + ". What is the projection of " + (V_(vec('u') + ' = 3' + vec('i') + ' - ' + vec('j'))) + " onto " + (V_(vec('v') + ' = ' + vec('i') + ' + 2' + vec('j'))) + "?"),
    V_(f"\\frac{{1}}{{5}}({vec('i')} + 2{vec('j')})"), [V_(f"\\frac{{1}}{{10}}(3{vec('i')} - {vec('j')})"), V_(f"\\frac{{1}}{{\\sqrt{{5}}}}({vec('i')} + 2{vec('j')})"), V_(f"\\frac{{1}}{{\\sqrt{{10}}}}(3{vec('i')} - {vec('j')})")],
    ((V_(vec('u') + ' \\cdot ' + vec('v') + ' = 3 - 2 = 1')) + " and " + (V_('|' + vec('v') + '|^2 = 1 + 4 = 5')) + ", so the projection is " + (V_('\\frac{1}{5}' + vec('v'))) + ". It points along " + (V_(vec('v'))) + ", the vector being projected onto, and the formula uses " + (V_('|' + vec('v') + '|^2')) + ", not " + (V_('|' + vec('v') + '|')) + "."))

# Q3 trig substitution
th = symbols('theta'); lhs = sp.Integral(1 / (9 - x**2), (x, -3 * sqrt(3) / 2, 3 * sqrt(3) / 2)).evalf(); rhs = sp.Integral(1 / cos(th) / 3, (th, -pi / 3, pi / 3)).evalf(); assert abs(lhs - rhs) < 1e-10
P.M('q03', "The substitution \\(x = 3\\sin\\theta\\) is applied to \\(\\displaystyle\\int_{-\\frac{3\\sqrt{3}}{2}}^{\\frac{3\\sqrt{3}}{2}} \\frac{1}{9 - x^2}\\,dx\\). Which of these is obtained?",
    V_('\\dfrac{1}{3}\\displaystyle\\int_{-\\frac{\\pi}{3}}^{\\frac{\\pi}{3}} \\sec\\theta\\,d\\theta'), [V_('\\dfrac{1}{3}\\displaystyle\\int_{-\\frac{\\pi}{3}}^{\\frac{\\pi}{3}} \\operatorname{cosec}\\theta\\,d\\theta'), V_('\\dfrac{1}{9}\\displaystyle\\int_{-\\frac{\\pi}{3}}^{\\frac{\\pi}{3}} \\sec^2\\theta\\,d\\theta'), V_('\\dfrac{1}{9}\\displaystyle\\int_{-\\frac{\\pi}{3}}^{\\frac{\\pi}{3}} \\operatorname{cosec}^2\\theta\\,d\\theta')],
    "\\(dx = 3\\cos\\theta\\,d\\theta\\) and \\(9 - 9\\sin^2\\theta = 9\\cos^2\\theta\\), so the integrand becomes \\(\\frac{3\\cos\\theta}{9\\cos^2\\theta} = \\frac{1}{3}\\sec\\theta\\). When \\(x = \\pm\\frac{3\\sqrt{3}}{2}\\), \\(\\sin\\theta = \\pm\\frac{\\sqrt{3}}{2}\\), so \\(\\theta = \\pm\\frac{\\pi}{3}\\).")

# Q4 Bernoulli mean and variance
p1 = Q(3, 5); assert Q(2, 5) + p1 == 1 and p1 * (1 - p1) == Q(6, 25)
P.M('q04', "A Bernoulli random variable \\(X\\) has \\(P(x) = \\dfrac{x + 2}{5}\\) for \\(x = 0, 1\\). What are the mean and variance of \\(X\\)?",
    V_('E(X) = \\frac{3}{5},\\ \\text{Var}(X) = \\frac{6}{25}'), [V_('E(X) = \\frac{2}{5},\\ \\text{Var}(X) = \\frac{6}{25}'), V_('E(X) = \\frac{3}{5},\\ \\text{Var}(X) = \\frac{3}{5}'), V_('E(X) = \\frac{2}{5},\\ \\text{Var}(X) = \\frac{2}{5}')],
    "\\(P(X = 1) = \\frac{3}{5}\\), so \\(p = \\frac{3}{5}\\). For a Bernoulli variable \\(E(X) = p = \\frac{3}{5}\\) and \\(\\text{Var}(X) = p(1 - p) = \\frac{3}{5} \\times \\frac{2}{5} = \\frac{6}{25}\\).")

# Q5 count solutions
sols5 = sorted({round(v, 9) for v in [math.pi / 8 + kk * math.pi / 2 for kk in range(-4, 8)] + [-math.pi / 4 + kk * math.pi for kk in range(-3, 5)] if -1e-12 <= v <= 2 * math.pi + 1e-12})
assert len(sols5) == 6 and all(abs(math.cos(3 * v) - math.sin(v)) < 1e-7 for v in sols5)
N_ = 400000; fv = [math.cos(3 * (i * 2 * math.pi / N_)) - math.sin(i * 2 * math.pi / N_) for i in range(N_ + 1)]; assert sum(1 for i in range(N_) if fv[i] * fv[i + 1] < 0) == 6
P.M('q05', "How many distinct solutions does \\(\\cos 3x - \\sin x = 0\\) have for \\(0 \\le x \\le 2\\pi\\)?", V_('6'), [V_('3'), V_('4'), V_('8')],
    "Write \\(\\sin x = \\cos\\left(\\frac{\\pi}{2} - x\\right)\\), so \\(\\cos 3x = \\cos\\left(\\frac{\\pi}{2} - x\\right)\\). Either \\(3x = \\frac{\\pi}{2} - x + 2k\\pi\\), giving \\(x = \\frac{\\pi}{8} + \\frac{k\\pi}{2}\\) (4 solutions in the domain), or \\(3x = -\\left(\\frac{\\pi}{2} - x\\right) + 2k\\pi\\), giving \\(x = -\\frac{\\pi}{4} + k\\pi\\) (2 solutions). None repeat, so there are 6.")

# Q6 odd and even integrands
av = 0.7; num = lambda f_: float(sp.Integral(f_, (x, -av, av)).evalf())
vals = {'A': num(x * asin(x)), 'B': num(x**2 * asin(x)), 'C': num(x**3 * acos(x)), 'D': num(acos(x))}; assert abs(vals['B']) < 1e-12 and all(abs(v) > 1e-3 for kk_, v in vals.items() if kk_ != 'B')
P.M('q06', "Given that \\(a\\) is a constant with \\(0 < a \\le 1\\), which of these integrals is equal to zero?",
    V_('\\displaystyle\\int_{-a}^{a} x^2\\sin^{-1}(x)\\,dx'), [V_('\\displaystyle\\int_{-a}^{a} x\\sin^{-1}(x)\\,dx'), V_('\\displaystyle\\int_{-a}^{a} x^3\\cos^{-1}(x)\\,dx'), V_('\\displaystyle\\int_{-a}^{a} \\cos^{-1}(x)\\,dx')],
    "\\(\\sin^{-1}\\) is odd, so \\(x^2\\sin^{-1} x\\) is odd and its integral from \\(-a\\) to \\(a\\) is 0. \\(x\\sin^{-1} x\\) is even, and \\(\\cos^{-1} x = \\frac{\\pi}{2} - \\sin^{-1} x\\) is neither odd nor even, so the other integrals are not 0.")

# Q7 which differential equation fits a slope field
pl = Plot(-2.3, 2.3, -2.3, 2.3, w=380)
sx = (pl.w - 2 * pl.pad) / (pl.b - pl.a); sy = (pl.h - 2 * pl.pad) / (pl.d - pl.c)
for i in range(-8, 9):
    for j in range(-8, 9):
        X0, Y0 = i * 0.25, j * 0.25
        if X0 == 0 and Y0 == 0: continue
        m_ = X0**3; L = math.hypot(sx, m_ * sy); ux, uy = 6 * sx / L, -6 * m_ * sy / L
        pl.raw(f'<path d="M{round(pl.X(X0) - ux, 1)},{round(pl.Y(Y0) - uy, 1)}L{round(pl.X(X0) + ux, 1)},{round(pl.Y(Y0) + uy, 1)}" stroke="{INK}" stroke-width="1.2"/>')
pl.axes(xt=[], yt=[], origin=False)
P.M('q07', "A slope field is shown." + pl.svg() + "Which of these could be the differential equation represented by the slope field?",
    V_('\\dfrac{dy}{dx} = x^3'), [V_('\\dfrac{dy}{dx} = x^3 + C,\\ C \\ne 0'), V_('\\dfrac{dy}{dx} = x^2'), V_('\\dfrac{dy}{dx} = x^2 + C,\\ C \\ne 0')],
    "The slopes only change from left to right, so \\(\\frac{dy}{dx}\\) depends on \\(x\\) alone. They are negative on the left, zero on the \\(y\\)-axis and positive on the right, so the expression is odd and equal to 0 at \\(x = 0\\). \\(x^2\\) would give positive slopes on both sides, and adding \\(C \\ne 0\\) would make the slopes on the \\(y\\)-axis non-zero.")

# Q8 collinear points from position vectors
a_, b_ = sp.Matrix([1, 0]), sp.Matrix([0.3, 1.7]); c_ = 4 * b_ - 3 * a_; ab, ac = b_ - a_, c_ - a_
assert sp.Matrix(ac) == 4 * sp.Matrix(ab)
P.M('q08', f"Points \\(A\\) and \\(B\\) have non-zero, non-parallel position vectors {V_(vec('a'))} and {V_(vec('b'))}. Point \\(C\\) has position vector {V_(vec('c') + ' = 4' + vec('b') + ' - 3' + vec('a'))}, and \\(A\\), \\(B\\) and \\(C\\) lie on the same line. Which of these must be true?",
    'Point \\(B\\) lies between points \\(A\\) and \\(C\\).', ['Point \\(A\\) lies between points \\(B\\) and \\(C\\).', 'Point \\(C\\) lies between points \\(A\\) and \\(B\\).', 'The order of the points cannot be worked out.'],
    ((V_('\\overrightarrow{AC} = ' + vec('c') + ' - ' + vec('a') + ' = 4' + vec('b') + ' - 4' + vec('a') + ' = 4\\overrightarrow{AB}')) + ". So starting from \\(A\\), \\(C\\) is in the same direction as \\(B\\) but 4 times as far, which puts \\(B\\) between \\(A\\) and \\(C\\)."))

# Q9 three vectors adding to zero
cth = sp.solve(sp.Eq(49, 9 + 64 + 2 * 3 * 8 * symbols('c')), symbols('c'))[0]; assert cth == Q(-1, 2)
pl = Plot(-2.4, 2.6, -1.9, 2.4, w=340); th9 = 2 * math.pi / 3
A9 = (1.8, 0); B9 = (1.6 * math.cos(th9), 1.6 * math.sin(th9)); C9 = (-(A9[0] + B9[0]), -(A9[1] + B9[1]))
for (X, Y), lab, dx_, dy_ in [(A9, 'a', 0, 16), (B9, 'b', -12, 2), (C9, 'c', 14, 4)]:
    pl.line(0, 0, X, Y, width=1.8, arrow=True); pl.text(X * 0.6, Y * 0.6, lab, dx=dx_, dy=dy_, var=True, size=16)
pl.raw(f'<path d="M{pl.X(0.42)},{pl.Y(0)}A{round(pl.X(0.42) - pl.X(0), 1)},{round(pl.X(0.42) - pl.X(0), 1)} 0 0 0 {round(pl.X(0.42 * math.cos(th9)), 1)},{round(pl.Y(0.42 * math.sin(th9)), 1)}" fill="none" stroke="{INK}"/>')
pl.text(0.3, 0.45, 'θ', var=True, size=15); pl.text(2.4, -1.6, 'NOT TO SCALE', anchor='end', size=11)
P.M('q09', f"The vectors {V_(vec('a'))}, {V_(vec('b'))} and {V_(vec('c'))} have magnitudes 3, 8 and 7 respectively." + pl.svg() + f"Given that {V_(vec('a') + ' + ' + vec('b') + ' + ' + vec('c') + ' = ' + vec('0'))}, what is the size of the angle \\(\\theta\\) between {V_(vec('a'))} and {V_(vec('b'))}?",
    V_('\\frac{2\\pi}{3}'), [V_('\\frac{\\pi}{6}'), V_('\\frac{\\pi}{3}'), V_('\\frac{5\\pi}{6}')],
    ((V_(vec('a') + ' + ' + vec('b') + ' = -' + vec('c'))) + ", so " + (V_('|' + vec('a') + ' + ' + vec('b') + '|^2 = 49')) + ". Expanding: " + (V_('9 + 64 + 2(3)(8)\\cos\\theta = 49')) + ", so " + (V_('\\cos\\theta = -\\frac{1}{2}')) + " and " + (V_('\\theta = \\frac{2\\pi}{3}')) + "."))

# Q10 second derivative of an inverse function
X = symbols('X'); fq = 5 + 3 * (X - 2) + 3 * (X - 2)**2; assert fq.subs(X, 2) == 5 and diff(fq, X).subs(X, 2) == 3 and diff(fq, X, 2).subs(X, 2) == 6
gpp = -diff(fq, X, 2).subs(X, 2) / diff(fq, X).subs(X, 2)**3; assert gpp == Q(-2, 9)
h_ = 1e-3; ginv = lambda Yv: float(sp.nsolve(fq - Yv, X, 2)); num_gpp = (ginv(5 + h_) - 2 * ginv(5) + ginv(5 - h_)) / h_**2; assert abs(num_gpp + 2 / 9) < 1e-3
P.M('q10', "For a function \\(f(x)\\), it is known that \\(f(2) = 5\\), \\(f'(2) = 3\\) and \\(f''(2) = 6\\). Let \\(g(x) = f^{-1}(x)\\). What is the value of \\(g''(5)\\)?",
    V_('-\\frac{2}{9}'), [V_('\\frac{2}{9}'), V_('-\\frac{2}{3}'), V_('\\frac{1}{3}')],
    "\\(g'(x) = \\dfrac{1}{f'(g(x))}\\). Differentiating again with the chain rule: \\(g''(x) = -\\dfrac{f''(g(x))\\,g'(x)}{\\left(f'(g(x))\\right)^2} = -\\dfrac{f''(g(x))}{\\left(f'(g(x))\\right)^3}\\). With \\(g(5) = 2\\): \\(g''(5) = -\\frac{6}{27} = -\\frac{2}{9}\\). (\\(\\frac{1}{3}\\) is \\(g'(5)\\).)")

# Q11(a) inverse function
f11 = 3 + 2 / (x + 1); finv = 2 / (x - 3) - 1; assert simplify(f11.subs(x, finv) - x) == 0
P.W('q11a', 2, "Find the inverse function \\(f^{-1}(x)\\) of \\(f(x) = 3 + \\dfrac{2}{x + 1}\\).",
    ["Swap \\(x\\) and \\(y\\): \\(x = 3 + \\dfrac{2}{y + 1}\\)", "\\(x - 3 = \\dfrac{2}{y + 1}\\), so \\(y + 1 = \\dfrac{2}{x - 3}\\)", "\\(f^{-1}(x) = \\dfrac{2}{x - 3} - 1\\)"],
    [("Correct inverse", 2), ("Swaps \\(x\\) and \\(y\\) and makes progress towards \\(y\\)", 1)])

# Q11(b) trig equation by factorising
thv = symbols('theta'); s11 = sp.solveset(sin(2 * thv) + cos(thv), thv, sp.Interval(0, 2 * pi)); assert s11 == sp.FiniteSet(pi / 2, 3 * pi / 2, 7 * pi / 6, 11 * pi / 6)
P.W('q11b', 3, "Solve \\(\\sin 2\\theta + \\cos\\theta = 0\\) for \\(0 \\le \\theta \\le 2\\pi\\).",
    ["\\(2\\sin\\theta\\cos\\theta + \\cos\\theta = 0\\)", "\\(\\cos\\theta(2\\sin\\theta + 1) = 0\\)", "\\(\\cos\\theta = 0\\): \\(\\theta = \\frac{\\pi}{2}, \\frac{3\\pi}{2}\\)", "\\(\\sin\\theta = -\\frac{1}{2}\\): \\(\\theta = \\frac{7\\pi}{6}, \\frac{11\\pi}{6}\\)", "So \\(\\theta = \\frac{\\pi}{2}, \\frac{7\\pi}{6}, \\frac{3\\pi}{2}, \\frac{11\\pi}{6}\\)."],
    [("All four correct solutions and no others", 3), ("Correct factorisation and at least two correct solutions", 2), ("Uses \\(\\sin 2\\theta = 2\\sin\\theta\\cos\\theta\\), or finds one correct solution", 1)])

# Q11(c) product to sum
F11c = sin(6 * x) / 12 + sin(4 * x) / 8; assert all(abs(float((diff(F11c, x) - cos(5 * x) * cos(x)).subs(x, xv))) < 1e-12 for xv in [0.1, 0.7, 1.9, 3.3])
P.W('q11c', 2, "Find \\(\\displaystyle\\int \\cos 5x\\cos x\\,dx\\).", ["\\(\\cos 5x\\cos x = \\frac{1}{2}(\\cos 6x + \\cos 4x)\\)", "\\(\\displaystyle\\int \\frac{1}{2}(\\cos 6x + \\cos 4x)\\,dx = \\frac{\\sin 6x}{12} + \\frac{\\sin 4x}{8} + C\\)"],
    [("Correct primitive", 2), ("Correct product-to-sum rewrite", 1)])

# Q11(d) sketch an inverse sine graph (the model answer includes the sketch)
pl = Plot(-4, 4, -4, 4, w=320)
pl.axes(xt=[-3, 3], yt=[-math.pi, math.pi], ytl=['−π', 'π']); pl.curve(lambda X_: 2 * math.asin(max(-1, min(1, X_ / 3))), -3, 3); pl.dot(-3, -math.pi); pl.dot(3, math.pi)
P.W('q11d', 2, "Sketch the graph of \\(y = 2\\sin^{-1}\\left(\\dfrac{x}{3}\\right)\\).",
    ["Domain: \\(-1 \\le \\frac{x}{3} \\le 1\\), so \\(-3 \\le x \\le 3\\). Range: \\(2 \\times \\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right] = [-\\pi, \\pi]\\).",
     "The curve is increasing, passes through the origin and has endpoints \\((-3, -\\pi)\\) and \\((3, \\pi)\\), getting steeper towards each end." + pl.svg()],
    [("Correct shape through the origin with both endpoints shown", 2), ("Correct domain or correct range shown", 1)])

# Q11(e) parallel vectors
mm = sp.solve(sp.Eq(3 * 5 - (-2) * symbols('m'), 0), symbols('m'))[0]; assert mm == Q(-15, 2)
P.W('q11e', 1, "For what value of \\(m\\) is the vector \\(\\begin{pmatrix} 3 \\\\ m \\end{pmatrix}\\) parallel to \\(\\begin{pmatrix} -2 \\\\ 5 \\end{pmatrix}\\)?",
    ["\\(\\begin{pmatrix} 3 \\\\ m \\end{pmatrix} = \\lambda\\begin{pmatrix} -2 \\\\ 5 \\end{pmatrix}\\) gives \\(\\lambda = -\\frac{3}{2}\\), so \\(m = 5 \\times \\left(-\\frac{3}{2}\\right) = -\\frac{15}{2}\\)."], [("Correct value", 1)])

# Q11(f) sum and product of roots
rts = sp.Poly(3 * x**3 - 4 * x**2 + 5 * x + 2, x).nroots(); val = sum(1 / (rts[i] * rts[j]) for i, j in [(0, 1), (0, 2), (1, 2)]); assert abs(complex(val) - (-2)) < 1e-9
P.W('q11f', 2, "The roots of \\(3x^3 - 4x^2 + 5x + 2 = 0\\) are \\(\\alpha\\), \\(\\beta\\) and \\(\\gamma\\). Find the value of \\(\\dfrac{1}{\\alpha\\beta} + \\dfrac{1}{\\alpha\\gamma} + \\dfrac{1}{\\beta\\gamma}\\).",
    ["\\(\\dfrac{1}{\\alpha\\beta} + \\dfrac{1}{\\alpha\\gamma} + \\dfrac{1}{\\beta\\gamma} = \\dfrac{\\gamma + \\beta + \\alpha}{\\alpha\\beta\\gamma}\\)", "\\(\\alpha + \\beta + \\gamma = \\frac{4}{3}\\) and \\(\\alpha\\beta\\gamma = -\\frac{2}{3}\\)", "So the value is \\(\\frac{4}{3} \\div \\left(-\\frac{2}{3}\\right) = -2\\)."],
    [("Correct value", 2), ("Writes the expression as \\(\\frac{\\alpha + \\beta + \\gamma}{\\alpha\\beta\\gamma}\\), or finds both the sum and product of roots", 1)])

# Q11(g) definite integral of sin squared
I11g = integrate(sin(2 * x)**2, (x, 0, pi / 8)); assert simplify(I11g - (pi / 16 - Q(1, 8))) == 0
P.W('q11g', 3, "Evaluate \\(\\displaystyle\\int_0^{\\frac{\\pi}{8}} \\sin^2(2x)\\,dx\\).",
    ["\\(\\sin^2(2x) = \\frac{1}{2}(1 - \\cos 4x)\\)", "\\(\\displaystyle\\int_0^{\\frac{\\pi}{8}} \\frac{1}{2}(1 - \\cos 4x)\\,dx = \\left[\\frac{x}{2} - \\frac{\\sin 4x}{8}\\right]_0^{\\frac{\\pi}{8}}\\)", "\\(= \\frac{\\pi}{16} - \\frac{1}{8}\\)"],
    [("Correct answer", 3), ("Correct primitive", 2), ("Uses \\(\\sin^2(2x) = \\frac{1}{2}(1 - \\cos 4x)\\)", 1)])

# Q12(a) related rates with a sector of constant area
r_ = symbols('r', positive=True); thr = 36 / r_**2; drdt = sp.Rational(1, 2) / diff(thr, r_); assert drdt.subs(r_, 6) == Q(-3, 2)
sv = (f'<svg class="tb-fig" viewBox="0 0 380 190" width="380" style="display:block;max-width:100%;height:auto;margin:14px auto;background:#fff;border-radius:8px" role="img" aria-label="diagram">'
      f'<path d="M50,95L230,25A193,193 0 0 1 230,165Z" fill="#dfe6fb" stroke="{INK}" stroke-width="1.8"/><path d="M85,81A38,38 0 0 1 85,109" fill="none" stroke="{INK}"/>'
      f'<text x="98" y="100" font-family="\'Times New Roman\',serif" font-style="italic" font-size="16">θ</text><text x="132" y="48" font-family="\'Times New Roman\',serif" font-style="italic" font-size="16">r</text>'
      f'<text x="268" y="100" font-family="Nunito,system-ui,sans-serif" font-size="14">Area = 18 cm²</text></svg>')
from fig import fix
P.W('q12a', 3, "The radius \\(r\\) cm and angle \\(\\theta\\) radians of a sector change so that its area stays at 18 cm\\(^2\\)." + fix(sv) + "The angle is increasing at a constant 0.5 radians per second. Find the rate at which the radius is changing when the radius is 6 cm.",
    ["\\(\\frac{1}{2}r^2\\theta = 18\\), so \\(\\theta = 36r^{-2}\\) and \\(\\dfrac{d\\theta}{dr} = -72r^{-3}\\).", "\\(\\dfrac{d\\theta}{dt} = \\dfrac{d\\theta}{dr} \\times \\dfrac{dr}{dt}\\), so \\(0.5 = -\\dfrac{72}{r^3}\\dfrac{dr}{dt}\\).", "At \\(r = 6\\): \\(0.5 = -\\dfrac{72}{216}\\dfrac{dr}{dt}\\), so \\(\\dfrac{dr}{dt} = -1.5\\).", "The radius is decreasing at 1.5 cm s\\(^{-1}\\)."],
    [("Correct rate (including that it is decreasing)", 3), ("Correct related rates equation in \\(\\frac{dr}{dt}\\)", 2), ("Writes \\(\\theta\\) in terms of \\(r\\), or a correct chain rule", 1)])

# Q12(b) volume about the y-axis with a parameter
av_ = symbols('a', positive=True); V12 = pi * integrate((2 / y)**2, (y, 2, av_)); assert simplify(V12 - 2 * pi * (av_ - 2) / av_) == 0
P.W('q12b', 2, "The region bounded by the hyperbola \\(y = \\dfrac{2}{x}\\), the \\(y\\)-axis and the lines \\(y = 2\\) and \\(y = a\\), where \\(a > 2\\), is rotated about the \\(y\\)-axis. Find the volume of the solid formed.",
    ["\\(x = \\frac{2}{y}\\), so \\(\\displaystyle V = \\pi\\int_2^a \\frac{4}{y^2}\\,dy = \\pi\\left[-\\frac{4}{y}\\right]_2^a\\)", "\\(= \\pi\\left(2 - \\frac{4}{a}\\right) = \\dfrac{2\\pi(a - 2)}{a}\\) cubic units"],
    [("Correct volume", 2), ("Correct integral in terms of \\(y\\)", 1)])

# Q12(c) induction with factorials
for N in range(1, 15): assert sum(Q(kk, math.factorial(kk + 1)) for kk in range(1, N + 1)) == 1 - Q(1, math.factorial(N + 1))
P.W('q12c', 3, "Prove by mathematical induction that \\(\\dfrac{1}{2!} + \\dfrac{2}{3!} + \\dfrac{3}{4!} + \\dots + \\dfrac{n}{(n + 1)!} = 1 - \\dfrac{1}{(n + 1)!}\\) for all integers \\(n \\ge 1\\).",
    ["<b>Step 1.</b> Prove true for \\(n = 1\\): \\(\\text{LHS} = \\frac{1}{2!} = \\frac{1}{2}\\), \\(\\text{RHS} = 1 - \\frac{1}{2!} = \\frac{1}{2}\\). So it is true for \\(n = 1\\).",
     "<b>Step 2.</b> Assume true for \\(n = k\\): \\(\\dfrac{1}{2!} + \\dots + \\dfrac{k}{(k + 1)!} = 1 - \\dfrac{1}{(k + 1)!}\\)",
     "<b>Step 3.</b> Prove true for \\(n = k + 1\\), that is \\(\\dfrac{1}{2!} + \\dots + \\dfrac{k}{(k + 1)!} + \\dfrac{k + 1}{(k + 2)!} = 1 - \\dfrac{1}{(k + 2)!}\\)",
     "\\(\\text{LHS} = 1 - \\dfrac{1}{(k + 1)!} + \\dfrac{k + 1}{(k + 2)!}\\) (by the assumption)", "\\(= 1 - \\dfrac{k + 2}{(k + 2)!} + \\dfrac{k + 1}{(k + 2)!} = 1 - \\dfrac{1}{(k + 2)!} = \\text{RHS}\\)",
     "So if it is true for \\(n = k\\), it is true for \\(n = k + 1\\). Since it is true for \\(n = 1\\), by mathematical induction it is true for all integers \\(n \\ge 1\\)."],
    [("Correct proof", 3), ("Proves the case \\(n = 1\\) and uses the assumption in an attempt at \\(n = k + 1\\)", 2), ("Proves the case \\(n = 1\\), or states the assumption and what must be proved", 1)])

# Q12(d) separable DE leading to inverse sine
ys = 3 * sin(x - pi / 6); assert ys.subs(x, 0) == Q(-3, 2)
for xv in [-0.9, -0.3, 0, 0.8, 1.6, 2.0]: assert abs(float(diff(ys, x).subs(x, xv)) - math.sqrt((3 - float(ys.subs(x, xv))) * (3 + float(ys.subs(x, xv))))) < 1e-9
P.W('q12d', 3, "Find the solution of \\(\\dfrac{dy}{dx} = \\sqrt{(3 - y)(3 + y)}\\), given that \\(y = -\\frac{3}{2}\\) when \\(x = 0\\).",
    ["\\(\\displaystyle\\int \\frac{dy}{\\sqrt{9 - y^2}} = \\int dx\\), so \\(\\sin^{-1}\\left(\\frac{y}{3}\\right) = x + C\\).", "When \\(x = 0\\), \\(y = -\\frac{3}{2}\\): \\(C = \\sin^{-1}\\left(-\\frac{1}{2}\\right) = -\\frac{\\pi}{6}\\).", "\\(y = 3\\sin\\left(x - \\frac{\\pi}{6}\\right)\\) (for \\(-\\frac{\\pi}{3} \\le x \\le \\frac{2\\pi}{3}\\))"],
    [("Correct solution", 3), ("Correct primitive with the correct constant", 2), ("Separates the variables and recognises an inverse sine", 1)])

# Q12(e) auxiliary angle then solve
assert simplify(sp.expand_trig(2 * sin(x + pi / 3)) - (sin(x) + sqrt(3) * cos(x))) == 0
fz = lambda v: math.sin(v) + math.sqrt(3) * math.cos(v) - math.sqrt(2); assert abs(fz(5 * math.pi / 12)) < 1e-12 and abs(fz(23 * math.pi / 12)) < 1e-12
Nz = 200000; assert sum(1 for i in range(Nz) if fz(i * 2 * math.pi / Nz) * fz((i + 1) * 2 * math.pi / Nz) < 0) == 2
P.W('q12e', 3, "(i) Write \\(\\sin x + \\sqrt{3}\\cos x\\) in the form \\(2\\sin(x + \\alpha)\\), where \\(0 < \\alpha < \\frac{\\pi}{2}\\). <b>1</b><br>(ii) Hence, or otherwise, solve \\(\\sin x + \\sqrt{3}\\cos x = \\sqrt{2}\\) for \\(0 \\le x \\le 2\\pi\\). <b>2</b>",
    ["(i) \\(2\\sin(x + \\alpha) = 2\\sin x\\cos\\alpha + 2\\cos x\\sin\\alpha\\), so \\(\\cos\\alpha = \\frac{1}{2}\\) and \\(\\sin\\alpha = \\frac{\\sqrt{3}}{2}\\): \\(\\alpha = \\frac{\\pi}{3}\\).",
     "(ii) \\(2\\sin\\left(x + \\frac{\\pi}{3}\\right) = \\sqrt{2}\\), so \\(\\sin\\left(x + \\frac{\\pi}{3}\\right) = \\frac{1}{\\sqrt{2}}\\), with \\(\\frac{\\pi}{3} \\le x + \\frac{\\pi}{3} \\le \\frac{7\\pi}{3}\\).",
     "\\(x + \\frac{\\pi}{3} = \\frac{3\\pi}{4}\\) or \\(\\frac{9\\pi}{4}\\) (\\(\\frac{\\pi}{4}\\) is too small), so \\(x = \\frac{5\\pi}{12}\\) or \\(x = \\frac{23\\pi}{12}\\)."],
    [("Both parts correct", 3), ("Part (i) correct and one correct solution in (ii)", 2), ("Correct value of \\(\\alpha\\), or a correct equation for \\(x + \\alpha\\)", 1)])

# Q13(a) separable DE: which square root
yb = -sqrt(6 * x + 4); assert simplify(diff(yb, x) - 3 / yb) == 0 and yb.subs(x, 0) == -2
P.W('q13a', 3, "It is given that \\(\\dfrac{dy}{dx} = \\dfrac{3}{y}\\) and \\(y = -2\\) when \\(x = 0\\). Find \\(y\\) as a function of \\(x\\).",
    ["\\(\\displaystyle\\int y\\,dy = \\int 3\\,dx\\), so \\(\\frac{y^2}{2} = 3x + C\\).", "At \\((0, -2)\\): \\(2 = C\\), so \\(y^2 = 6x + 4\\).", "\\(y = \\pm\\sqrt{6x + 4}\\), and since \\(y = -2 < 0\\) at the start, \\(y = -\\sqrt{6x + 4}\\)."],
    [("Correct function including the negative root", 3), ("\\(y^2 = 6x + 4\\), or the positive root chosen", 2), ("Separates the variables and integrates correctly", 1)])

# Q13(b) circular arrangements with two people apart (counted by brute force)
cnt = 0
for perm in itertools.permutations(range(1, 9)):
    seats = (0,) + perm; i0, i1 = seats.index(0), seats.index(1)
    if (i0 - i1) % 9 not in (1, 8): cnt += 1
assert cnt == math.factorial(8) - 2 * math.factorial(7) == 30240
P.W('q13b', 2, "Nine guests are to be seated at a round table. If two of the guests refuse to sit next to each other, how many seating arrangements are possible?",
    ["Without the restriction there are \\(8! = 40\\,320\\) arrangements around the table.", "With the two guests together: treat them as one unit, giving \\(7!\\) arrangements, times \\(2\\) for their order: \\(2 \\times 7! = 10\\,080\\).", "So \\(8! - 2 \\times 7! = 30\\,240\\) arrangements."],
    [("Correct answer", 2), ("Finds \\(8!\\) and \\(2 \\times 7!\\), or equivalent progress", 1)])

# Q13(c) angle between velocity and acceleration
tt = symbols('t', positive=True); rr = sp.Matrix([2 * tt, tt**2 / 4]); vv = diff(rr, tt); aa = diff(vv, tt)
ct = simplify(vv.dot(aa) / (vv.norm() * aa.norm())); ts = sp.solve(sp.Eq(ct, Q(1, 2)), tt); assert ts == [4 * sqrt(3) / 3]
P.W('q13c', 4, ("At time \\(t\\), a particle has position vector " + (V_(vec('r') + '(t) = 2t' + vec('i') + ' + \\frac{t^2}{4}' + vec('j'))) + ", velocity " + (V_(vec('v') + '(t)')) + " and acceleration " + (V_(vec('a') + '(t)')) + ". Find the time \\(t > 0\\) when the angle between " + (V_(vec('v') + '(t)')) + " and " + (V_(vec('a') + '(t)')) + " is \\(\\frac{\\pi}{3}\\)."),
    [((V_(vec('v') + '(t) = 2' + vec('i') + ' + \\frac{t}{2}' + vec('j'))) + " and " + (V_(vec('a') + '(t) = \\frac{1}{2}' + vec('j')))),
     ((V_(vec('v') + ' \\cdot ' + vec('a') + ' = \\frac{t}{4}')) + ", " + (V_('|' + vec('v') + '| = \\sqrt{4 + \\frac{t^2}{4}}')) + ", " + (V_('|' + vec('a') + '| = \\frac{1}{2}'))),
     "\\(\\cos\\frac{\\pi}{3} = \\dfrac{\\frac{t}{4}}{\\frac{1}{2}\\sqrt{4 + \\frac{t^2}{4}}}\\), so \\(\\frac{1}{2} = \\dfrac{t}{2\\sqrt{4 + \\frac{t^2}{4}}}\\) and \\(\\sqrt{4 + \\frac{t^2}{4}} = t\\).",
     "\\(4 + \\frac{t^2}{4} = t^2\\), so \\(\\frac{3t^2}{4} = 4\\) and \\(t = \\frac{4}{\\sqrt{3}} = \\frac{4\\sqrt{3}}{3}\\)."],
    [("Correct time", 4), ("Correct equation for the angle simplified to one in \\(t\\)", 3), ("Correct dot product and magnitudes", 2), ("Correct velocity and acceleration vectors", 1)])

# Q13(d) normal approximation to a binomial count
assert 400 * 0.2 == 80 and math.sqrt(400 * 0.2 * 0.8) == 8 and 80 + 2 * 8 == 96
P.W('q13d', 4, "A spinner is spun 400 times, and each spin lands on blue with the same probability. Let \\(X\\) be the number of times it lands on blue. Given that \\(E(X) = 80\\) and \\(P(X \\ge k) = 0.0228\\), use a normal approximation to find the value of \\(k\\). You may use \\(P(Z \\le 2) = 0.9772\\) for a standard normal variable \\(Z\\).",
    ["\\(E(X) = np\\), so \\(400p = 80\\) and \\(p = 0.2\\).", "\\(\\sigma = \\sqrt{np(1 - p)} = \\sqrt{400 \\times 0.2 \\times 0.8} = \\sqrt{64} = 8\\)", "\\(P(Z \\ge 2) = 1 - 0.9772 = 0.0228\\), so \\(k\\) is 2 standard deviations above the mean.", "\\(k = 80 + 2 \\times 8 = 96\\)"],
    [("Correct value of \\(k\\)", 4), ("Correct standard deviation and \\(z = 2\\)", 3), ("Correct \\(p\\) and standard deviation, or correct \\(z = 2\\)", 2), ("Finds \\(p = 0.2\\)", 1)])

# Q13(e) Pascal's relation then a telescoping sum
assert sum(math.comb(m_, 300) for m_ in range(300, 341)) == math.comb(341, 301)
P.W('q13e', 3, "(i) Pascal's triangle relation is \\(\\dbinom{n}{r} = \\dbinom{n - 1}{r - 1} + \\dbinom{n - 1}{r}\\). (Do NOT prove this.) Show that \\(\\dbinom{m}{R} = \\dbinom{m + 1}{R + 1} - \\dbinom{m}{R + 1}\\). <b>1</b><br>"
    "(ii) Hence, or otherwise, prove that \\(\\dbinom{300}{300} + \\dbinom{301}{300} + \\dbinom{302}{300} + \\dots + \\dbinom{340}{300} = \\dbinom{341}{301}\\). <b>2</b>",
    ["(i) With \\(n = m + 1\\) and \\(r = R + 1\\): \\(\\dbinom{m + 1}{R + 1} = \\dbinom{m}{R} + \\dbinom{m}{R + 1}\\), which rearranges to the result.",
     "(ii) Using (i) with \\(R = 300\\): \\(\\dbinom{m}{300} = \\dbinom{m + 1}{301} - \\dbinom{m}{301}\\).",
     "\\(\\displaystyle\\sum_{m = 300}^{340} \\binom{m}{300} = \\left[\\binom{301}{301} - \\binom{300}{301}\\right] + \\left[\\binom{302}{301} - \\binom{301}{301}\\right] + \\dots + \\left[\\binom{341}{301} - \\binom{340}{301}\\right]\\)",
     "The terms cancel in pairs, leaving \\(\\dbinom{341}{301} - \\dbinom{300}{301} = \\dbinom{341}{301} - 0 = \\dbinom{341}{301}\\)."],
    [("Both parts correct", 3), ("Part (i) correct and the sum written as a telescoping sum, or part (ii) correct", 2), ("Part (i) correct, or correct use of Pascal's relation in (ii)", 1)])

# Q14(a) pigeonhole with factors (checked over every choice of 7 factors)
fac = [d_ for d_ in range(1, 73) if 72 % d_ == 0]; assert len(fac) == 12 and all(math.prod(c) % 72 == 0 for c in itertools.combinations(fac, 7))
assert [d_ for d_ in fac if d_ % 2] == [1, 3, 9] and [d_ for d_ in fac if d_ % 3] == [1, 2, 4, 8]
P.W('q14a', 2, "Prove that the product of any seven distinct factors of 72 is a multiple of 72.",
    ["\\(72 = 2^3 \\times 3^2\\) has 12 factors: 1, 2, 3, 4, 6, 8, 9, 12, 18, 24, 36, 72.", "Only 3 of them are odd (1, 3, 9), so any 7 distinct factors include at least 4 even ones. Their product has a factor of at least \\(2^4\\), so is divisible by \\(2^3\\).",
     "Only 4 of them are not multiples of 3 (1, 2, 4, 8), so any 7 include at least 3 multiples of 3, giving a factor of at least \\(3^3\\), so the product is divisible by \\(3^2\\).", "So the product is divisible by \\(2^3 \\times 3^2 = 72\\)."],
    [("Complete proof", 2), ("Shows the product is divisible by 8, or by 9, using a counting argument", 1)])

# Q14(b) two horizontal projectiles land at given distances
h, g, U, Vv, d, k = symbols('h g U V d k', positive=True)
tA = sqrt(2 * k * h / g); tB = sqrt(2 * h / g); Usol = sp.solve(sp.Eq(U * tA, d), U)[0]; Vsol = sp.solve(sp.Eq(Vv * tB, 2 * d), Vv)[0]; assert simplify(Vsol / Usol - 2 * sqrt(k)) == 0
pl = Plot(-0.6, 6.8, -0.5, 4.3, w=420)
HA, HB = 3.6, 1.6; dd = 2.6
pl.curve(lambda X_: HA - HA * (X_ / dd)**2 if X_ <= dd else None, 0, dd, dash='5 4', width=1.4); pl.curve(lambda X_: HB - HB * (X_ / (2 * dd))**2, 0, 2 * dd, dash='5 4', width=1.4)
pl.axes(xt=[dd, 2 * dd], xtl=['d', '2d'], yt=[HA, HB], ytl=['A', 'B']); pl.line(0, HA, 1.3, HA, width=1.6, arrow=True); pl.line(0, HB, 1.3, HB, width=1.6, arrow=True)
pl.text(0.7, HA, 'U', dy=-9, var=True, size=14); pl.text(0.7, HB, 'V', dy=-9, var=True, size=14); pl.text(6.5, 3.9, 'NOT TO SCALE', anchor='end', size=11)
P.W('q14b', 4, "Points \\(A\\) and \\(B\\) lie vertically above the origin, with \\(A\\) higher than \\(B\\) and \\(\\dfrac{OA}{OB} = k\\), where \\(k > 1\\). A particle is projected horizontally from \\(A\\) with speed \\(U\\) m s\\(^{-1}\\) and lands on the ground a distance \\(d\\) from the origin. A second particle is projected horizontally from \\(B\\) with speed \\(V\\) m s\\(^{-1}\\) and lands a distance \\(2d\\) from the origin. Ignore air resistance and take the acceleration due to gravity as \\(g\\)." + pl.svg() +
    "Show that \\(\\dfrac{V}{U} = 2\\sqrt{k}\\).",
    ["Let \\(OB = h\\), so \\(OA = kh\\). A particle projected horizontally with speed \\(w\\) from height \\(H\\) has \\(x = wt\\) and \\(y = H - \\frac{1}{2}gt^2\\).", "It lands when \\(y = 0\\): \\(t = \\sqrt{\\frac{2H}{g}}\\), at a distance \\(w\\sqrt{\\frac{2H}{g}}\\).",
     "From \\(A\\): \\(U\\sqrt{\\frac{2kh}{g}} = d\\). From \\(B\\): \\(V\\sqrt{\\frac{2h}{g}} = 2d\\).", "Dividing: \\(\\dfrac{V\\sqrt{\\frac{2h}{g}}}{U\\sqrt{\\frac{2kh}{g}}} = 2\\), so \\(\\dfrac{V}{U} \\times \\dfrac{1}{\\sqrt{k}} = 2\\) and \\(\\dfrac{V}{U} = 2\\sqrt{k}\\)."],
    [("Complete correct working", 4), ("Correct landing distances for both particles in terms of \\(h\\) and \\(k\\)", 3), ("Correct time of flight from a height, and one correct landing distance", 2), ("Correct equations of motion for one particle", 1)])

# Q14(c) clock hands at a given angle
tt2 = [120 / 11, 600 / 11]
A_ = lambda T: (3 * math.sin(math.pi * T / 360), 3 * math.cos(math.pi * T / 360)); B_ = lambda T: (4 * math.sin(math.pi * T / 30), 4 * math.cos(math.pi * T / 30))
ang = lambda T: math.acos((A_(T)[0] * B_(T)[0] + A_(T)[1] * B_(T)[1]) / 12)
for T in tt2: assert abs(ang(T) - math.pi / 3) < 1e-9
seen = [i / 1000 for i in range(1, 60000) if (ang(i / 1000) - math.pi / 3) * (ang((i + 1) / 1000) - math.pi / 3) <= 0]; assert abs(seen[0] - tt2[0]) < 2e-3 and any(abs(s_ - tt2[1]) < 2e-3 for s_ in seen) and all(s_ < tt2[0] + 2e-3 or s_ > tt2[1] - 2e-3 for s_ in seen)
P.W('q14c', 3, "The hands of a clock are \\(OA\\) and \\(OB\\), where \\(A\\) is \\(\\left(3\\sin\\left(\\frac{\\pi t}{360}\\right), 3\\cos\\left(\\frac{\\pi t}{360}\\right)\\right)\\) and \\(B\\) is \\(\\left(4\\sin\\left(\\frac{\\pi t}{30}\\right), 4\\cos\\left(\\frac{\\pi t}{30}\\right)\\right)\\), \\(O\\) is the origin and \\(t \\ge 0\\) is the number of minutes after midnight. Find the values of \\(t\\) when the angle between the hands is \\(\\frac{\\pi}{3}\\) for the first and second times after midnight. Give your answers correct to 3 decimal places.",
    ["\\(\\overrightarrow{OA} \\cdot \\overrightarrow{OB} = 12\\left(\\sin\\frac{\\pi t}{360}\\sin\\frac{\\pi t}{30} + \\cos\\frac{\\pi t}{360}\\cos\\frac{\\pi t}{30}\\right) = 12\\cos\\left(\\frac{\\pi t}{30} - \\frac{\\pi t}{360}\\right) = 12\\cos\\frac{11\\pi t}{360}\\)",
     "\\(|\\overrightarrow{OA}| = 3\\) and \\(|\\overrightarrow{OB}| = 4\\), so the angle \\(\\phi\\) between them has \\(\\cos\\phi = \\cos\\frac{11\\pi t}{360}\\).", "\\(\\phi = \\frac{\\pi}{3}\\) when \\(\\frac{11\\pi t}{360} = \\frac{\\pi}{3}\\) or \\(\\frac{5\\pi}{3}\\) (the first two positive solutions).",
     "\\(t = \\frac{120}{11} \\approx 10.909\\) and \\(t = \\frac{600}{11} \\approx 54.545\\) minutes."],
    [("Both correct times", 3), ("One correct time, or a correct equation in \\(\\frac{11\\pi t}{360}\\) with both cases", 2), ("Correct dot product simplified using a compound angle formula", 1)])

# Q14(d) derivative of inverse sine of cosine, piece by piece
for xv in [0.3, 1.2, 2.0, 3.5, 4.4, 6.0]:
    dv = float(diff(asin(cos(x)), x).subs(x, xv)); assert abs(dv - (-1 if xv < math.pi else 1)) < 1e-9
P.W('q14d', 3, "The function \\(f(x) = \\sin^{-1}(\\cos x)\\) is defined for \\(0 < x < 2\\pi\\). Find \\(f'(x)\\) for the values of \\(x\\) where it is defined.",
    ["\\(f'(x) = \\dfrac{1}{\\sqrt{1 - \\cos^2 x}} \\times (-\\sin x) = \\dfrac{-\\sin x}{\\sqrt{\\sin^2 x}} = \\dfrac{-\\sin x}{|\\sin x|}\\)", "For \\(0 < x < \\pi\\), \\(\\sin x > 0\\), so \\(f'(x) = -1\\).", "For \\(\\pi < x < 2\\pi\\), \\(\\sin x < 0\\), so \\(f'(x) = 1\\).", "At \\(x = \\pi\\), \\(\\sin x = 0\\) and \\(f'(x)\\) is not defined (the graph has a sharp corner)."],
    [("Correct derivative on both intervals, with \\(x = \\pi\\) excluded", 3), ("Correct \\(\\frac{-\\sin x}{|\\sin x|}\\) and one interval correct", 2), ("Correct use of the chain rule", 1)])

# Q14(e) tangent of a sum of three angles from the roots of a cubic
rng = random.Random(3); tested = 0
while tested < 20:
    b0, c0 = rng.uniform(-6, 6), rng.uniform(-6, 6)
    if abs(c0 - 1) < 0.2: continue
    rts = [complex(r) for r in sp.Poly(x**3 + b0 * x**2 + c0 * x + b0 - math.sqrt(3) + math.sqrt(3) * c0, x).nroots()]
    if any(abs(r.imag) > 1e-9 for r in rts): continue
    s_ = sum(math.atan(r.real) for r in rts); assert abs(math.tan(s_) + math.sqrt(3)) < 1e-6 or abs(math.cos(s_)) < 1e-9; tested += 1
P.W(')q14e', 3, "It is given that \\(\\tan\\alpha\\), \\(\\tan\\beta\\) and \\(\\tan\\gamma\\) are the three real roots of \\(x^3 + bx^2 + cx + b + \\sqrt{3}c - \\sqrt{3} = 0\\), where \\(b\\) and \\(c\\) are real numbers and \\(c \\ne 1\\). Find the smallest positive value of \\(\\alpha + \\beta + \\gamma\\).",
    ["Let the roots be \\(p = \\tan\\alpha\\), \\(q = \\tan\\beta\\), \\(r = \\tan\\gamma\\). Then \\(p + q + r = -b\\), \\(pq + pr + qr = c\\) and \\(pqr = -(b + \\sqrt{3}c - \\sqrt{3})\\).",
     "\\(\\tan(\\alpha + \\beta + \\gamma) = \\dfrac{p + q + r - pqr}{1 - (pq + pr + qr)} = \\dfrac{-b + b + \\sqrt{3}c - \\sqrt{3}}{1 - c} = \\dfrac{\\sqrt{3}(c - 1)}{1 - c} = -\\sqrt{3}\\)",
     "So \\(\\alpha + \\beta + \\gamma = \\frac{2\\pi}{3} + n\\pi\\), and the smallest positive value is \\(\\frac{2\\pi}{3}\\)."],
    [("Correct value", 3), ("Correct expression for \\(\\tan(\\alpha + \\beta + \\gamma)\\) simplified to \\(-\\sqrt{3}\\)", 2), ("Correct sums and product of roots, or the correct formula for \\(\\tan(\\alpha + \\beta + \\gamma)\\)", 1)])

P.save()
