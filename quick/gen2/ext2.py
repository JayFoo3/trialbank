"""Maths Extension 2: multiple choice and written/extended quick questions, computed with sympy."""
import random, math
from lib import Bank
from mathlib import *
from sympy import I, Abs, arg, re as Re, im as Im, conjugate

R = random.Random(2026114)
B = Bank('quick-ext2', 'ext2', typed=False, seed=51)
def M(T, prompt, right, wrong, why):
    wrong = [w for w in dict.fromkeys(wrong) if w != right][:3]
    if len(wrong) < 3 or any(q['prompt'] == prompt for q in B.mcq): return
    B.M(T, prompt, right, wrong, why)
W = B.W
C2 = [('Correct answer with working', 2), ('Correct method with one error', 1)]
C3 = [('Correct answer with full working', 3), ('Correct method with one error', 2), ('Correct first step', 1)]
z = Symbol('z')
def cx(a, b): return a + b * I
def L_(e): return latex(sp.nsimplify(e))

T = 'Argand Diag'
for _ in range(12):
    a, b, c, d = [R.choice([-4, -3, -2, -1, 1, 2, 3, 4, 5]) for _ in range(4)]
    z1, z2 = cx(a, b), cx(c, d); p_ = expand(z1 * z2); q_ = sp.simplify(z1 / z2)
    M(T, f'If {m(f"z = {latex(z1)}")} and {m(f"w = {latex(z2)}")}, find {m("zw")}.', m(expand(p_)), [m(expand(a * c + b * d * I + (a * d + b * c) * I - 0)), m(expand(a * c + b * d + (a * d + b * c) * I)), m(expand(z1 + z2))], m('i^2 = -1') + ' when expanding.')
for _ in range(10):
    a, b = R.choice([(1, 1), (1, -1), (sqrt(3), 1), (-1, sqrt(3)), (-2, 2), (0, 3), (3, -3), (-sqrt(3), -1)])
    zz = a + b * I; mod = sp.simplify(Abs(zz)); ar = sp.simplify(arg(zz))
    M(T, f'Find the modulus and argument of {m(f"z = {latex(zz)}")}.', m(f'|z| = {latex(mod)},\\ \\arg z = {latex(ar)}'), [m(f'|z| = {latex(mod**2)},\\ \\arg z = {latex(ar)}'), m(f'|z| = {latex(mod)},\\ \\arg z = {latex(sp.simplify(ar + pi / 2 if ar <= pi / 2 else ar - pi / 2))}'), m(f'|z| = {latex(mod)},\\ \\arg z = {latex(sp.simplify(-ar))}' if ar != 0 and ar != pi else f'|z| = {latex(mod + 1)},\\ \\arg z = {latex(ar)}')], 'Plot the point; arg uses the principal value in ' + m('(-\\pi, \\pi]') + '.')
for _ in range(5):
    a, b = R.randint(-5, 5), R.randint(1, 6)
    M(T, f'If {m(f"z = {latex(cx(a, b))}")}, then {m("\\bar{z}")} is', m(cx(a, -b)), [m(cx(-a, b)), m(cx(-a, -b)), m(cx(b, a))], 'The conjugate changes the sign of the imaginary part.')
for _ in range(4):
    a, b, c, d = [R.choice([-3, -2, -1, 1, 2, 3, 4]) for _ in range(4)]
    q_ = sp.simplify(cx(a, b) / cx(c, d)); qq = expand(sp.nsimplify(q_))
    W(T, 2, f'Express {m(f"\\frac{{{latex(cx(a, b))}}}{{{latex(cx(c, d))}}}")} in the form {m("x + iy")}.', [f'Multiply top and bottom by the conjugate {m(latex(cx(c, -d)))}.', m(f'= \\frac{{{latex(expand(cx(a, b) * cx(c, -d)))}}}{{{c**2 + d**2}}} = {latex(qq)}')], C2)

T = "Euler's"
for r_, th in [(2, pi / 3), (3, pi / 2), (1, 3 * pi / 4), (4, -pi / 6), (2, 5 * pi / 6), (sqrt(2), pi / 4)]:
    zz = sp.nsimplify(expand(r_ * (cos(th) + I * sin(th))))
    M(T, f'Write {m(f"{latex(r_)}e^{{{latex(th * I)}}}")} in Cartesian form.', m(zz), [m(expand(sp.nsimplify(r_ * (sin(th) + I * cos(th))))), m(expand(sp.nsimplify(r_ * (cos(th) - I * sin(th))))), m(expand(sp.nsimplify(cos(th) + I * r_ * sin(th))))], m('re^{i\\theta} = r(\\cos\\theta + i\\sin\\theta)'))
for N_ in [5, 6, 8, 10, 12]:
    zz = (1 + I)**N_; val = sp.expand(zz)
    M(T, f'Using de Moivre\'s theorem, {m(f"(1 + i)^{{{N_}}}")} equals', m(val), [m(sp.expand(2**N_ * (cos(N_ * pi / 4) + I * sin(N_ * pi / 4)))), m(sp.expand(sqrt(2)**N_ * (cos(N_ * pi / 2) + I * sin(N_ * pi / 2)))), m(sp.expand(-val) if val != 0 else 1)], m('1 + i = \\sqrt{2}e^{i\\pi/4}') + ', so raise the modulus to the power and multiply the argument.')
for N_, w_ in [(3, 8), (3, -27), (4, 16), (6, 1)]:
    rts = sorted(sp.solve(z**N_ - w_, z), key=lambda v: float(arg(v)))
    W(T, 3 if N_ < 6 else 4, f'Solve {m(f"z^{{{N_}}} = {w_}")}, giving answers in the form {m("re^{i\\theta}")} with {m("-\\pi < \\theta \\le \\pi")}.',
      [f'Write {m(w_)} in exponential form: {m(f"{w_} = {abs(w_)}e^{{i({latex(arg(sp.Integer(w_)))} + 2k\\pi)}}")}.', m(f'z = {latex(sp.Integer(abs(w_))**sp.Rational(1, N_))}e^{{i\\frac{{{latex(arg(sp.Integer(w_)))} + 2k\\pi}}{{{N_}}}}}'),
       m(', '.join(((lambda r0, a0: (latex(r0) if r0 != 1 else '') + (f'e^{{{latex(a0 * I)}}}' if a0 != 0 else ('' if r0 != 1 else '1')))(sp.simplify(Abs(v)), sp.simplify(arg(v)))) for v in rts))],
      [('All roots correct in the required form', 3 if N_ < 6 else 4), ('Correct general form and most roots', 2 if N_ < 6 else 3), ('Correct exponential form of the right-hand side', 1)] + ([] if N_ < 6 else [('Correct modulus of the roots', 1)])[:0])

T = 'Solving Equations'
for _ in range(8):
    a, b = R.randint(-4, 4), R.randint(1, 5)
    poly = expand((z - cx(a, b)) * (z - cx(a, -b)))
    M(T, f'Solve {m(f"{latex(poly)} = 0")}.', m(f'z = {latex(cx(a, b))},\\ {latex(cx(a, -b))}'), [m(f'z = {latex(cx(-a, b))},\\ {latex(cx(-a, -b))}'), m(f'z = {a + b},\\ {a - b}'), m(f'z = {latex(cx(b, a))},\\ {latex(cx(b, -a))}')], 'Use the quadratic formula; the roots are a conjugate pair.')
for _ in range(4):
    a, b, r_ = R.randint(-3, 3), R.randint(1, 4), R.randint(-3, 3)
    P = expand((z - cx(a, b)) * (z - cx(a, -b)) * (z - r_))
    W(T, 3, f'Given that {m(latex(cx(a, b)))} is a root of {m(f"P(z) = {latex(P)}")}, find the other roots.',
      [f'The coefficients are real, so the conjugate {m(latex(cx(a, -b)))} is also a root.', m(f'(z - ({latex(cx(a, b))}))(z - ({latex(cx(a, -b))})) = {latex(expand((z - cx(a, b)) * (z - cx(a, -b))))}'), f'Dividing gives the third factor {m(f"z - ({r_})")}, so the roots are {m(f"{latex(cx(a, b))},\\ {latex(cx(a, -b))},\\ {r_}")}.'],
      [('All roots found with working', 3), ('Conjugate root and quadratic factor', 2), ('States the conjugate is a root', 1)])
for a, b in [(5, 12), (3, 4), (-7, 24), (15, 8), (-5, -12)]:
    s_ = sp.sqrt(cx(a, b)); s1 = sp.nsimplify(expand(sp.simplify(sp.expand_complex(s_))))
    W(T, 3, f'Find the square roots of {m(latex(cx(a, b)))}.', [m(f'(x + iy)^2 = {latex(cx(a, b))} \\Rightarrow x^2 - y^2 = {a},\\ 2xy = {b}'), 'Solve simultaneously (also ' + m(f'x^2 + y^2 = {int(math.hypot(a, b))}') + ').', m(f'\\pm({latex(s1)})')], C3)

T = 'Geometric Implications'
M(T, 'Multiplying a complex number by ' + m('i') + ' rotates it on the Argand diagram by', m('90^\\circ') + ' anticlockwise', [m('90^\\circ') + ' clockwise', m('180^\\circ'), m('45^\\circ') + ' anticlockwise'], m('i = e^{i\\pi/2}'))
M(T, 'The locus ' + m('|z - 2i| = 3') + ' is', 'a circle centre ' + m('(0, 2)') + ', radius 3', ['a circle centre ' + m('(2, 0)') + ', radius 3', 'a circle centre ' + m('(0, -2)') + ', radius 3', 'a line through ' + m('2i')], m('|z - z_0| = r') + ' is a circle centre ' + m('z_0') + '.')
M(T, 'The locus ' + m('|z - 1| = |z + 1|') + ' is', 'the imaginary axis', ['the real axis', 'a circle radius 1', m('y = x')], 'Points equidistant from 1 and −1: the perpendicular bisector.')
M(T, 'The locus ' + m('\\arg(z) = \\frac{\\pi}{4}') + ' is', 'a ray from the origin at ' + m('45^\\circ') + ', excluding the origin', ['the full line ' + m('y = x'), 'a circle', 'the real axis'], 'An argument defines a ray (half-line).')
M(T, 'If ' + m('z_1') + ' and ' + m('z_2') + ' are vectors, ' + m('z_1 + z_2') + ' is represented by', 'the diagonal of the parallelogram they form', ['the other diagonal of the parallelogram', 'their perpendicular bisector', 'a rotation of ' + m('z_1')], 'Vector addition: the parallelogram rule.')
W(T, 2, f'Sketch and describe the locus of {m("|z - (1 + i)| \\le 2")}.', ['It is the set of points within distance 2 of the point ' + m('(1, 1)') + '.', 'A closed disc: circle centre ' + m('(1, 1)') + ', radius 2, including its boundary and interior.'], C2, typed=True)
W(T, 3, f'The points {m("A, B, C")} represent {m("z_1, z_2, z_3")}. If {m("z_3 - z_1 = i(z_2 - z_1)")}, describe triangle {m("ABC")}.', [m('z_2 - z_1') + ' is the vector ' + m('\\overrightarrow{AB}') + ' and ' + m('z_3 - z_1') + ' is ' + m('\\overrightarrow{AC}') + '.', 'Multiplying by ' + m('i') + ' rotates by ' + m('90^\\circ') + ' and keeps the length, so ' + m('AC \\perp AB') + ' and ' + m('AC = AB') + '.', 'So triangle ABC is right-angled and isosceles, with the right angle at A.'], C3, typed=True)

T = '3D Vectors'
for _ in range(10):
    u = [R.randint(-4, 5) for _ in range(3)]; v = [R.randint(-4, 5) for _ in range(3)]
    dot = sum(a_ * b_ for a_, b_ in zip(u, v)); mag = math.sqrt(sum(a_**2 for a_ in u))
    M(T, f'Find {m("\\underset{\\sim}{u} \\cdot \\underset{\\sim}{v}")} for {m(f"\\underset{{\\sim}}{{u}} = ({u[0]}, {u[1]}, {u[2]})")} and {m(f"\\underset{{\\sim}}{{v}} = ({v[0]}, {v[1]}, {v[2]})")}.', m(dot), [m(dot + 2 * u[0] * v[0] or 5), m(-dot if dot else 7), m(sum(u) + sum(v) if sum(u) + sum(v) != dot else dot + 1)], 'Multiply matching components and add.')
for _ in range(6):
    u = [R.randint(-4, 5) for _ in range(3)]; s2 = sum(a_**2 for a_ in u)
    M(T, f'Find the magnitude of {m(f"({u[0]}, {u[1]}, {u[2]})")}.', m(sqrt(s2)), [m(s2), m(sqrt(abs(sum(u)))) if abs(sum(u)) != s2 else m(s2 + 1), m(sqrt(s2 + 2))], m('\\sqrt{x^2 + y^2 + z^2}'))
for _ in range(4):
    A_ = [R.randint(-3, 4) for _ in range(3)]; d_ = [R.randint(-3, 3) or 1 for _ in range(3)]; lam = R.choice([2, -1, 3])
    P_ = [a_ + lam * b_ for a_, b_ in zip(A_, d_)]
    W(T, 2, f'Show that the point {m(f"P({P_[0]}, {P_[1]}, {P_[2]})")} lies on the line {m(f"\\underset{{\\sim}}{{r}} = ({A_[0]}, {A_[1]}, {A_[2]}) + \\lambda({d_[0]}, {d_[1]}, {d_[2]})")}.',
      [m(f'{A_[0]} + {d_[0]}\\lambda = {P_[0]} \\Rightarrow \\lambda = {lam}').replace('+ -', '- '), m(f'\\lambda = {lam}') + f' also gives {m(f"y = {P_[1]}")} and {m(f"z = {P_[2]}")}, so P is on the line.'], C2)
for _ in range(4):
    A_ = [R.randint(-3, 4) for _ in range(3)]; Bp = [R.randint(-3, 4) for _ in range(3)]
    if A_ == Bp: continue
    d_ = [b_ - a_ for a_, b_ in zip(A_, Bp)]
    W(T, 2, f'Find a vector equation of the line through {m(f"A({A_[0]}, {A_[1]}, {A_[2]})")} and {m(f"B({Bp[0]}, {Bp[1]}, {Bp[2]})")}.', [m(f'\\overrightarrow{{AB}} = ({d_[0]}, {d_[1]}, {d_[2]})'), m(f'\\underset{{\\sim}}{{r}} = ({A_[0]}, {A_[1]}, {A_[2]}) + \\lambda({d_[0]}, {d_[1]}, {d_[2]})')], C2)

T = 'Equations of lines'
M(T, 'Two lines in 3D that are not parallel and do not intersect are', 'skew', ['coincident', 'perpendicular', 'concurrent'], 'Skew lines exist only in 3 or more dimensions.')
M(T, 'The lines ' + m('\\underset{\\sim}{r} = \\underset{\\sim}{a} + \\lambda\\underset{\\sim}{b}') + ' and ' + m('\\underset{\\sim}{r} = \\underset{\\sim}{c} + \\mu\\underset{\\sim}{d}') + ' are parallel when', m('\\underset{\\sim}{b} = k\\underset{\\sim}{d}'), [m('\\underset{\\sim}{b} \\cdot \\underset{\\sim}{d} = 0'), m('\\underset{\\sim}{a} = \\underset{\\sim}{c}'), m('|\\underset{\\sim}{b}| = |\\underset{\\sim}{d}|')], 'Parallel direction vectors are scalar multiples.')
M(T, 'Lines with direction vectors ' + m('(1, 2, -1)') + ' and ' + m('(3, -1, 1)') + ' are', 'perpendicular', ['parallel', 'skew, always', 'coincident'], m('3 - 2 - 1 = 0') + ', so the dot product is zero.')
W(T, 4, 'Determine whether the lines ' + m('\\underset{\\sim}{r} = (1, 2, 0) + \\lambda(1, -1, 2)') + ' and ' + m('\\underset{\\sim}{r} = (3, 0, 5) + \\mu(0, 1, 1)') + ' intersect. If so, find the point.',
  ['Directions are not multiples, so the lines are not parallel.', m('1 + \\lambda = 3,\\ 2 - \\lambda = \\mu,\\ 2\\lambda = 5 + \\mu'), 'From the first, ' + m('\\lambda = 2') + ', so ' + m('\\mu = 0') + '. Check the third: ' + m('2(2) = 4 \\ne 5') + '.', 'The equations are inconsistent, so the lines do not intersect: they are skew.'],
  [('Correct conclusion (skew) with full checking', 4), ('Solves two equations and checks the third', 3), ('Sets up the three equations', 2), ('States they are not parallel', 1)])

T = 'Substitution'
for u_, ig, fx, lo, hi in [('u = \\sqrt{x}', '\\frac{1}{\\sqrt{x}(1 + x)}', 1 / (sqrt(x) * (1 + x)), 1, 3), ('x = 2\\sin\\theta', '\\sqrt{4 - x^2}', sqrt(4 - x**2), 0, 2), ('x = \\tan\\theta', '\\frac{1}{(1 + x^2)^2}', 1 / (1 + x**2)**2, 0, 1)]:
    v = simplify(integrate(fx, (x, lo, hi)))
    W(T, 4, f'Use the substitution {m(u_)} to evaluate {m(f"\\int_{{{latex(lo)}}}^{{{latex(hi)}}} {ig}\\,dx")}.', ['Find ' + m('dx') + ' in terms of the new variable and change the limits.', 'Simplify the integrand, integrate and substitute the new limits.', m(f'= {latex(v)}')],
      [('Correct substitution, limits, integration and value', 4), ('Correct integral in the new variable, integrated', 3), ('Correct integral in the new variable with new limits', 2), ('Correct differential or limits', 1)])
for f_, fx in [('\\int \\frac{2x}{x^2 + 4}\\,dx', 2 * x / (x**2 + 4)), ('\\int x e^{x^2}\\,dx', x * exp(x**2)), ('\\int \\sin^3 x\\cos x\\,dx', sin(x)**3 * cos(x)), ('\\int \\tan x\\,dx', tan(x))]:
    ans = integrate(fx, x)
    M(T, f'Find {m(f_)}.', m(f'{latex(ans)} + C'), [m(f'{latex(diff(fx, x))} + C'), m(f'{latex(2 * ans)} + C'), m(f'{latex(simplify(ans * x))} + C')], 'Recognise the derivative of the inner function.')

W(T, 3, f'Use the substitution {m("u = e^x")} to evaluate {m("\\int_0^{\\ln\\sqrt{3}} \\frac{e^x}{1 + e^{2x}}\\,dx")}.', [m('du = e^x\\,dx') + '; when ' + m('x = 0,\\ u = 1') + ' and when ' + m('x = \\ln\\sqrt{3},\\ u = \\sqrt{3}') + '.', m('\\int_1^{\\sqrt{3}} \\frac{du}{1 + u^2} = \\left[\\tan^{-1}u\\right]_1^{\\sqrt{3}}'), m('= \\frac{\\pi}{3} - \\frac{\\pi}{4} = \\frac{\\pi}{12}')], C3)

T = 'Parts'
for f_, fx in [('x e^{x}', x * exp(x)), ('x\\cos x', x * cos(x)), ('\\ln x', log(x)), ('x^2 e^{x}', x**2 * exp(x)), ('x\\ln x', x * log(x)), ('e^{x}\\sin x', exp(x) * sin(x))]:
    ans = simplify(integrate(fx, x))
    M(T, f'Find {m(f"\\int {f_}\\,dx")}.', m(f'{latex(ans)} + C'), [m(f'{latex(simplify(integrate(fx, x) + 2 * x))} + C'), m(f'{latex(diff(fx, x))} + C'), m(f'{latex(simplify(-ans))} + C')], 'Integration by parts: ' + m('\\int u\\,dv = uv - \\int v\\,du') + '.')
for f_, fx, lo, hi in [('x e^{2x}', x * exp(2 * x), 0, 1), ('x\\sin x', x * sin(x), 0, pi / 2), ('\\ln x', log(x), 1, sp.E), ('x^2\\ln x', x**2 * log(x), 1, 2)]:
    v = simplify(integrate(fx, (x, lo, hi)))
    W(T, 3, f'Evaluate {m(f"\\int_{{{latex(lo)}}}^{{{latex(hi)}}} {f_}\\,dx")}.', ['Use integration by parts with ' + m('u') + ' chosen so ' + m("u'") + ' is simpler.', m(f'= {latex(v)}')], C3)
W(T, 4, 'Let ' + m('I_n = \\int_0^1 x^n e^x\\,dx') + '. Show that ' + m('I_n = e - nI_{n-1}') + ', and hence find ' + m('I_2') + '.',
  [m('I_n = \\left[x^ne^x\\right]_0^1 - \\int_0^1 nx^{n-1}e^x\\,dx = e - nI_{n-1}'), m('I_0 = \\int_0^1 e^x\\,dx = e - 1'), m('I_1 = e - 1(e - 1) = 1'), m('I_2 = e - 2(1) = e - 2')],
  [('Correct reduction formula shown and I₂ correct', 4), ('Reduction formula shown with an error in I₂', 3), ('Correct parts set-up', 2), ('Correct I₀', 1)])

T = 'Reduction'
M(T, 'If ' + m('I_n = \\int_0^{\\pi/2}\\sin^n x\\,dx') + ' satisfies ' + m('I_n = \\frac{n-1}{n}I_{n-2}') + ' and ' + m('I_0 = \\frac{\\pi}{2}') + ', then ' + m('I_2') + ' is', m('\\frac{\\pi}{4}'), [m('\\frac{\\pi}{2}'), m('\\frac{1}{2}'), m('\\frac{3\\pi}{8}')], m('I_2 = \\frac{1}{2}I_0'))
M(T, 'Using ' + m('I_n = \\frac{n-1}{n}I_{n-2}') + ' with ' + m('I_1 = 1') + ', ' + m('I_3') + ' equals', m('\\frac{2}{3}'), [m('\\frac{3}{2}'), m('\\frac{1}{3}'), m('\\frac{8}{15}')], m('I_3 = \\frac{2}{3}I_1'))
M(T, 'Using ' + m('I_n = \\frac{n-1}{n}I_{n-2}') + ' with ' + m('I_1 = 1') + ', ' + m('I_5') + ' equals', m('\\frac{8}{15}'), [m('\\frac{4}{5}'), m('\\frac{2}{3}'), m('\\frac{16}{35}')], m('I_5 = \\frac{4}{5} \\times \\frac{2}{3}'))

T = 'Quadratic Denom.'
for a_, b_ in [(1, 2), (2, 3), (-1, 4), (1, -3), (3, 5)]:
    fx = 1 / ((x - a_) * (x - b_)); pf = sp.apart(fx)
    M(T, f'Express {m(f"\\frac{{1}}{{{latex(expand((x - a_) * (x - b_)))}}}")} in partial fractions.', m(pf), [m(sp.apart(1 / ((x + a_) * (x + b_)))), m(-pf), m(sp.apart(fx * (b_ - a_) * 2))], 'Write as ' + m('\\frac{A}{x - a} + \\frac{B}{x - b}') + ' and solve for A and B.')
for num, den, lo, hi in [(x + 5, (x + 1) * (x + 2), 0, 1), (3 * x + 1, (x - 1) * (x + 1), 2, 3), (5, (x + 1) * (x - 4), 5, 6), (2 * x, (x + 1) * (x + 3), 0, 2)]:
    fx = num / den; pf = sp.apart(fx); v = simplify(integrate(fx, (x, lo, hi)))
    W(T, 4, f'(a) Express {m(f"\\frac{{{latex(num)}}}{{{latex(expand(den))}}}")} in partial fractions. (b) Hence evaluate {m(f"\\int_{{{lo}}}^{{{hi}}} \\frac{{{latex(num)}}}{{{latex(expand(den))}}}\\,dx")}.',
      [m(f'\\frac{{{latex(num)}}}{{{latex(expand(den))}}} = {latex(pf)}'), 'Integrate each term to get logarithms, then substitute the limits.', m(f'= {latex(sp.logcombine(v, force=True))}')],
      [('Correct partial fractions and exact value', 4), ('Correct partial fractions and integration', 3), ('Correct partial fractions', 2), ('Correct form set up', 1)])
for c_ in [4, 9, 2]:
    M(T, f'Find {m(f"\\int \\frac{{1}}{{x^2 + 2x + {c_ + 1}}}\\,dx")}.', m(f'{latex(integrate(1 / ((x + 1)**2 + c_), x))} + C'), [m(f'{latex(sp.log((x + 1)**2 + c_))} + C'), m(f'{latex(integrate(1 / ((x - 1)**2 + c_), x))} + C'), m(f'{latex(sp.atan(x + 1))} + C')], 'Complete the square, then use the inverse tan integral.')

T = 'SHM'
for n_, a_ in [(2, 3), (3, 0.5), (pi, 2), (4, 1.5), (5, 0.2)]:
    T_ = 2 * pi / n_; vmax = n_ * a_
    M(T, f'A particle moves in SHM with {m(f"\\ddot{{x}} = -{latex(sp.nsimplify(n_**2))}x")} and amplitude {a_} m. Its period and maximum speed are', m(f'T = {latex(sp.nsimplify(T_))}') + f' s, max speed {m(latex(sp.nsimplify(vmax)))} m/s', [m(f'T = {latex(sp.nsimplify(2 * pi * n_))}') + f' s, max speed {m(latex(sp.nsimplify(vmax)))} m/s', m(f'T = {latex(sp.nsimplify(T_))}') + f' s, max speed {m(latex(sp.nsimplify(n_**2 * a_)))} m/s', m(f'T = {latex(sp.nsimplify(pi / n_))}') + f' s, max speed {m(latex(sp.nsimplify(a_ / n_)))} m/s'], m('T = \\frac{2\\pi}{n},\\ v_{max} = na'))
for a_, n_, x0 in [(5, 2, 3), (4, 3, 2), (10, 1, 6), (6, 2, 0)]:
    vv = n_ * math.sqrt(a_**2 - x0**2)
    W(T, 2, f'A particle moves in SHM with amplitude {a_} m about {m("x = 0")}, with {m(f"n = {n_}")}. Find its speed when {m(f"x = {x0}")}.', [m(f'v^2 = n^2(a^2 - x^2) = {n_**2}({a_**2} - {x0**2}) = {n_**2 * (a_**2 - x0**2)}'), m(f'|v| = {latex(sp.sqrt(n_**2 * (a_**2 - x0**2)))}') + ' m/s'], C2)
W(T, 4, f'A particle\'s displacement is {m("x = 3\\cos(2t) + 4\\sin(2t)")}. (a) Show the motion is simple harmonic. (b) Find the amplitude and period.',
  [m('\\dot{x} = -6\\sin 2t + 8\\cos 2t'), m('\\ddot{x} = -12\\cos 2t - 16\\sin 2t = -4(3\\cos 2t + 4\\sin 2t) = -4x') + ', which is SHM with ' + m('n = 2'), m('a = \\sqrt{3^2 + 4^2} = 5') + ' m', m('T = \\frac{2\\pi}{2} = \\pi') + ' s'],
  [('Shows SHM and correct amplitude and period', 4), ('Shows SHM and one of amplitude/period', 3), ('Correct second derivative', 2), ('Correct first derivative', 1)])

T = 'Resisted Motion'
M(T, 'A particle moves with ' + m('\\ddot{x} = -kv') + '. Its velocity as a function of time is', m('v = v_0e^{-kt}'), [m('v = v_0 - kt'), m('v = v_0e^{kt}'), m('v = \\frac{v_0}{1 + kt}')], 'Separate: ' + m('\\frac{dv}{v} = -k\\,dt') + '.')
M(T, 'A falling object with resistance ' + m('kv') + ' (per unit mass) reaches terminal velocity when', m('g - kv = 0') + ', i.e. ' + m('v = \\frac{g}{k}'), [m('v = gk'), m('v = 0'), m('v = \\sqrt{\\frac{g}{k}}')], 'Terminal velocity: acceleration is zero.')
M(T, 'For motion with ' + m('\\ddot{x} = -kv^2') + ', the best form to find v as a function of x is', m('v\\frac{dv}{dx} = -kv^2'), [m('\\frac{dv}{dt} = -kv^2'), m('\\frac{d}{dx}\\left(\\frac{1}{2}v^2\\right) = kv'), m('x = vt')], 'Use ' + m('\\ddot{x} = v\\frac{dv}{dx}') + ' when x is needed.')
for g_, k_ in [(10, 0.1), (9.8, 0.2), (10, 0.5)]:
    W(T, 4, f'A ball falls from rest with acceleration {m(f"\\ddot{{x}} = {g_} - {k_}v")} (down positive). (a) Find its terminal velocity. (b) Show that {m(f"v = {latex(sp.nsimplify(g_ / k_))}(1 - e^{{-{k_}t}})")}.',
      [m(f'\\text{{(a) }} {g_} - {k_}v = 0 \\Rightarrow v_T = {latex(sp.nsimplify(g_ / k_))}') + ' m/s', m(f'\\frac{{dv}}{{dt}} = {g_} - {k_}v \\Rightarrow \\int_0^v \\frac{{dv}}{{{g_} - {k_}v}} = \\int_0^t dt'), m(f'-\\frac{{1}}{{{k_}}}\\ln\\left(\\frac{{{g_} - {k_}v}}{{{g_}}}\\right) = t \\Rightarrow {g_} - {k_}v = {g_}e^{{-{k_}t}}'), m(f'v = {latex(sp.nsimplify(g_ / k_))}(1 - e^{{-{k_}t}})')],
      [('Correct terminal velocity and full derivation', 4), ('Correct integration with an error rearranging', 3), ('Terminal velocity correct, or correct separation', 2), ('Sets acceleration to zero', 1)])

T = 'Non Resisted Motion'
for v0 in [20, 30, 40, 15]:
    H = v0**2 / 20; tt = v0 / 10
    M(T, f'A ball is thrown vertically up at {v0} m/s ({m("g = 10")} m/s²). Its maximum height is', f'{dp(H, 1)} m', [f'{dp(v0**2 / 10, 1)} m', f'{dp(v0 * tt, 1)} m', f'{dp(v0 / 10, 1)} m'], m('v^2 = u^2 - 2gh') + ' with v = 0.')
W(T, 3, 'A stone is thrown up at 25 m/s from a 30 m cliff (' + m('g = 10') + '). Find when it hits the ground below, to 2 decimal places.', [m('x = 30 + 25t - 5t^2 = 0'), m('t^2 - 5t - 6 = 0 \\Rightarrow (t - 6)(t + 1) = 0'), m('t = 6') + ' s (since t > 0)'], C3)

T = 'Contradiction'
for stmt, lines in [('\\sqrt{2}', ['Assume ' + m('\\sqrt{2} = \\frac{p}{q}') + ' with p, q integers with no common factor.', m('p^2 = 2q^2') + ', so ' + m('p^2') + ' is even, so p is even: ' + m('p = 2k') + '.', m('4k^2 = 2q^2 \\Rightarrow q^2 = 2k^2') + ', so q is also even.', 'Then p and q share the factor 2, a contradiction. So ' + m('\\sqrt{2}') + ' is irrational.']),
                    ('\\sqrt{3}', ['Assume ' + m('\\sqrt{3} = \\frac{p}{q}') + ' with p, q coprime integers.', m('p^2 = 3q^2') + ', so 3 divides ' + m('p^2') + ' and hence p: ' + m('p = 3k') + '.', m('9k^2 = 3q^2 \\Rightarrow q^2 = 3k^2') + ', so 3 divides q.', 'Contradiction, as p and q are coprime. So ' + m('\\sqrt{3}') + ' is irrational.']),
                    ('\\log_2 3', ['Assume ' + m('\\log_2 3 = \\frac{p}{q}') + ' with p, q positive integers.', 'Then ' + m('2^{p/q} = 3 \\Rightarrow 2^p = 3^q') + '.', 'The left side is even and the right side is odd, a contradiction.', 'So ' + m('\\log_2 3') + ' is irrational.'])]:
    W(T, 3, f'Prove by contradiction that {m(stmt)} is irrational.', lines, [('Complete proof with a clear contradiction', 3), ('Correct assumption and key step', 2), ('Correct assumption', 1)])
W(T, 3, 'Prove by contradiction that there are infinitely many primes.', ['Assume there are finitely many primes ' + m('p_1, p_2, \\dots, p_n') + '.', 'Let ' + m('N = p_1p_2\\cdots p_n + 1') + '. Dividing N by any ' + m('p_i') + ' leaves remainder 1.', 'So N is either prime or has a prime factor not in the list, a contradiction. So there are infinitely many primes.'], [('Complete proof', 3), ('Constructs N with reasoning', 2), ('Correct assumption', 1)])
M(T, 'To prove "if ' + m('n^2') + ' is even then n is even" by contradiction, you first assume', m('n^2') + ' is even and n is odd', [m('n^2') + ' is odd and n is even', 'n is even', m('n^2') + ' is odd'], 'Assume the hypothesis is true and the conclusion is false.')
M(T, 'The contrapositive of "if P then Q" is', '"if not Q then not P"', ['"if Q then P"', '"if not P then not Q"', '"P and not Q"'], 'A statement and its contrapositive are logically equivalent.')
M(T, 'The negation of "for all x, P(x)" is', '"there exists x such that not P(x)"', ['"for all x, not P(x)"', '"there exists x such that P(x)"', '"P(x) for no x"'], 'Negating swaps "for all" and "there exists".')

T = 'Inequalities'
M(T, 'For positive ' + m('a, b') + ', the AM–GM inequality states', m('\\frac{a + b}{2} \\ge \\sqrt{ab}'), [m('\\frac{a + b}{2} \\le \\sqrt{ab}'), m('a + b \\ge ab'), m('a^2 + b^2 \\le 2ab')], 'From ' + m('(\\sqrt{a} - \\sqrt{b})^2 \\ge 0') + '.')
M(T, 'Which is always true for real ' + m('a, b') + '?', m('a^2 + b^2 \\ge 2ab'), [m('a^2 + b^2 \\le 2ab'), m('a + b \\ge 2ab'), m('a^2 \\ge b^2')], m('(a - b)^2 \\ge 0'))
for stmt, lines in [('a^2 + b^2 \\ge 2ab', [m('(a - b)^2 \\ge 0'), m('a^2 - 2ab + b^2 \\ge 0'), m('\\therefore a^2 + b^2 \\ge 2ab')]),
                    ('\\frac{a}{b} + \\frac{b}{a} \\ge 2 \\text{ for } a, b > 0', [m('(a - b)^2 \\ge 0 \\Rightarrow a^2 + b^2 \\ge 2ab'), 'Divide both sides by ' + m('ab > 0') + ': ' + m('\\frac{a}{b} + \\frac{b}{a} \\ge 2')]),
                    ('x + \\frac{1}{x} \\ge 2 \\text{ for } x > 0', [m('(x - 1)^2 \\ge 0 \\Rightarrow x^2 + 1 \\ge 2x'), 'Divide by ' + m('x > 0') + ': ' + m('x + \\frac{1}{x} \\ge 2')])]:
    W(T, 2, f'Prove that {m(stmt)}.', lines, [('Complete, correct proof', 2), ('Correct starting inequality', 1)])
W(T, 3, 'Prove that ' + m('a^2 + b^2 + c^2 \\ge ab + bc + ca') + ' for real ' + m('a, b, c') + '.', [m('(a - b)^2 + (b - c)^2 + (c - a)^2 \\ge 0'), m('2a^2 + 2b^2 + 2c^2 - 2ab - 2bc - 2ca \\ge 0'), 'Divide by 2: ' + m('a^2 + b^2 + c^2 \\ge ab + bc + ca')], [('Complete proof', 3), ('Correct expansion', 2), ('Correct starting point', 1)])

T = 'Induction'
W(T, 3, 'Prove by induction that ' + m('2^n > n^2') + ' for integers ' + m('n \\ge 5') + '.',
  ['<u>Step 1:</u> Prove true for ' + m('n=5'), 'when ' + m('n=5') + ',', m('2^5 = 32 > 25 = 5^2'), m('\\therefore') + ' true for ' + m('n=5'),
   '<u>Step 2:</u> Let ' + m('n=k') + ' be a number for which the statement is true', 'i.e. ' + m('2^k > k^2'), '<u>Step 3:</u> Prove true for ' + m('n=k+1'), 'i.e. ' + m('2^{k+1} > (k+1)^2'),
   m('2^{k+1} = 2 \\times 2^k > 2k^2') + ' (from step 2)', m('2k^2 - (k+1)^2 = k^2 - 2k - 1 = (k-1)^2 - 2 > 0') + ' for ' + m('k \\ge 5'), m('\\therefore 2^{k+1} > (k+1)^2'), m('\\therefore') + ' true for ' + m('n=k+1'), m('\\therefore') + ' by induction, the statement is true for all integers ' + m('n \\ge 5')],
  [('Correct, complete proof in the required layout', 3), ('Correct Steps 1 and 2 and uses the assumption in Step 3', 2), ('Proves true for n = 5', 1)])
W(T, 3, 'Prove by induction that ' + m('\\sum_{r=1}^{n} r^3 = \\frac{n^2(n+1)^2}{4}') + ' for integers ' + m('n \\ge 1') + '.',
  ['<u>Step 1:</u> Prove true for ' + m('n=1'), 'when ' + m('n=1') + ',', 'LHS ' + m('= 1') + ', RHS ' + m('= \\frac{1 \\times 4}{4} = 1'), m('\\therefore') + ' true for ' + m('n=1'),
   '<u>Step 2:</u> Let ' + m('n=k') + ' be a number for which the statement is true', 'i.e. ' + m('1^3 + \\dots + k^3 = \\frac{k^2(k+1)^2}{4}'), '<u>Step 3:</u> Prove true for ' + m('n=k+1'), 'i.e. ' + m('1^3 + \\dots + (k+1)^3 = \\frac{(k+1)^2(k+2)^2}{4}'),
   'LHS ' + m('= \\frac{k^2(k+1)^2}{4} + (k+1)^3') + ' (from step 2)', m('= \\frac{(k+1)^2(k^2 + 4k + 4)}{4} = \\frac{(k+1)^2(k+2)^2}{4} = \\text{RHS}'), m('\\therefore') + ' true for ' + m('n=k+1'), m('\\therefore') + ' by induction, the statement is true for all integers ' + m('n \\ge 1')],
  [('Correct, complete proof in the required layout', 3), ('Correct Steps 1 and 2 and uses the assumption in Step 3', 2), ('Proves true for n = 1', 1)])

B.save()
