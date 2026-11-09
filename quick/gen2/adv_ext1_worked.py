"""Written (2 marks) and extended (3-5 marks) quick questions for Maths Advanced and Extension 1.
Every number is worked out with sympy here, so model answers can't carry slips."""
from lib import Bank
from mathlib import *

R = random.Random(2026111)
A = Bank('quick-adv', 'adv', typed=False, seed=21)
E1 = Bank('quick-ext1', 'ext1', typed=False, seed=22)
ADV = {'ss': 'Sequences and Series', 'fm': 'Financial Mathematics', 'id': 'Introduction to Differentiation', 'ad': 'Applications of Differentiation',
       'ic': 'Integral Calculus', 'el': 'Exponential and Logarithmic Functions', 'tm': 'Trigonometry and Measure of Angles', 'ti': 'Trigonometric Identities and Equations',
       'pr': 'Probability', 'dp': 'Discrete Probability Distributions', 'nd': 'The Normal Distribution', 'cp': 'Continuous Probability Distributions',
       'wf': 'Working with Functions', 'dc': 'Differential Calculus', 'tf': 'Trigonometric Functions and Graphs', 'gt': 'Graphing Techniques'}
EXT = {'pi': 'Proof Induction', 'rf': 'Rem/Fact Th.', 'sp': 'Sum/Prod. Roots', 'tid': 'Identities', 'te': 'Trig. Eqns', 'it': 'Inverse Trig Fns', 'in': 'Integration',
       'vo': 'Volumes', 'de': "DE's", 'eg': 'Exp. G + D', 've': 'Vectors', 'pj': 'Projectiles', 'be': 'Binom. Exp.', 'pc': 'Perms/Combs', 'bd': 'Bern./Binom Dist.',
       'rr': 'Related Rates', 'iq': 'Inequalities'}
def topic(step, T): return T[step.rstrip('0123456789')]
def a(step, marks, prompt, lines, crit): A.W(topic(step, ADV), marks, prompt, lines, crit, step=step)
def e(step, marks, prompt, lines, crit): E1.W(topic(step, EXT), marks, prompt, lines, crit, step=step)
TWO = lambda what: [(f'Correct answer with {what}', 2), ('Correct method with one error, or a correct first step', 1)]

# ---------------- Maths Advanced ----------------
for _ in range(6):   # ss3 arithmetic series
    a1, d, N = R.randint(-12, 15), R.choice([2, 3, 4, 5, 7, -2, -3]), R.randint(12, 40)
    S = Q(N, 2) * (2 * a1 + (N - 1) * d)
    a('ss3', 2, f'Find the sum of the first {N} terms of the arithmetic series {a1} + {a1+d} + {a1+2*d} + ...',
      [m(f'a = {a1},\\ d = {d},\\ n = {N}'), m(f'S_{{{N}}} = \\frac{{{N}}}{{2}}\\left(2({a1}) + ({N}-1)({d})\\right)'), m(f'= {S}')], TWO('working'))
for _ in range(5):   # ss7 limiting sum
    a1 = R.choice([12, 18, 24, 30, 40, 54]); r = R.choice([Q(1, 2), Q(1, 3), Q(2, 3), Q(-1, 2), Q(-1, 3), Q(3, 4)])
    S = a1 / (1 - r)
    a('ss7', 2, f'Find the limiting sum of the geometric series {m((f"{a1} + {latex(a1*r)} + {latex(a1*r**2)} + \\dots").replace("+ -", "- "))}.',
      [m(f'r = {latex(r)}') + ', and ' + m('|r| < 1') + ' so the limiting sum exists.', m(f'S = \\frac{{a}}{{1 - r}} = \\frac{{{a1}}}{{1 - ({latex(r)})}} = {latex(S)}')],
      [('Correct ratio, reason the limit exists and correct sum', 2), ('Correct ratio or correct substitution', 1)])
for _ in range(4):   # ss6/ss8 geometric model
    P0, g, yrs = R.choice([1200, 2500, 5000, 800]), R.choice([4, 5, 6, 8]), R.randint(8, 15)
    r = 1 + Q(g, 100); T = P0 * r ** (yrs - 1); tot = P0 * (r ** yrs - 1) / (r - 1)
    a('ss8', 3, f'A company sells {P0} units in its first year. Sales grow by {g}% each year. (a) How many units does it sell in year {yrs}? (b) How many units does it sell in total over the first {yrs} years? (Answer to the nearest unit.)',
      [f'Geometric: {m(f"a = {P0},\\ r = {latex(r)}")}.', f'(a) {m(f"T_{{{yrs}}} = {P0}({latex(r)})^{{{yrs-1}}} \\approx {round(float(T))}")} units',
       f'(b) {m(f"S_{{{yrs}}} = \\frac{{{P0}(({latex(r)})^{{{yrs}}} - 1)}}{{{latex(r)} - 1}} \\approx {round(float(tot))}")} units'],
      [('Correct a and r, and both answers correct', 3), ('One part correct with the other using a correct method', 2), ('Identifies a geometric sequence with correct a and r', 1)])
for _ in range(4):   # fm3 loan repayment
    P, rate, yrs = R.choice([20000, 30000, 250000, 400000]), R.choice([6, 7.2, 4.8, 5.4]), R.choice([5, 10, 25, 30])
    i = Q(str(rate)) / 1200; N = yrs * 12; rr = 1 + i
    M = P * i * rr ** N / (rr ** N - 1)
    a('fm3', 4, f'A loan of {money(P)} is repaid in equal monthly instalments of {m("M")} over {yrs} years. Interest is {rate}% p.a. compounded monthly. Let {m("A_n")} be the amount owing after {m("n")} months. (a) Show that {m(f"A_2 = {P}r^2 - M(1 + r)")} where {m(f"r = {latex(rr)}")}. (b) Hence find {m("M")} to the nearest cent.',
      [f'Monthly rate {m(f"{rate}\\% \\div 12 = {latex(i)}")}, so {m(f"r = {latex(rr)}")}.', m(f'A_1 = {P}r - M'), m(f'A_2 = A_1 r - M = {P}r^2 - Mr - M = {P}r^2 - M(1 + r)'),
       f'Continuing the pattern, {m(f"A_n = {P}r^n - M(1 + r + \\dots + r^{{n-1}}) = {P}r^n - \\frac{{M(r^n - 1)}}{{r - 1}}")}.',
       f'Loan repaid: {m(f"A_{{{N}}} = 0")}, so {m(f"M = \\frac{{{P}r^{{{N}}}(r - 1)}}{{r^{{{N}}} - 1}} \\approx {money(M)[1:] if False else dp(M)}")}, i.e. {money(M)} per month.'],
      [('Correct A₂, general expression and correct M', 4), ('Correct general expression with an error in M', 3), ('Correct A₂ or a correct geometric series for Aₙ', 2), ('Correct A₁ or monthly rate', 1)])
for _ in range(6):   # id5 tangent
    c = [R.randint(-3, 3) for _ in range(3)]; c[0] = c[0] or 1
    f = c[0] * x**3 + c[1] * x**2 + c[2] * x + R.randint(-5, 5); x0 = R.choice([-2, -1, 1, 2])
    y0, g = f.subs(x, x0), diff(f, x).subs(x, x0)
    a('id5', 2, f'Find the equation of the tangent to {m(f"y = {latex(f)}")} at the point where {m(f"x = {x0}")}.',
      [m(f"\\frac{{dy}}{{dx}} = {latex(diff(f, x))}"), f'At {m(f"x = {x0}")}: {m(f"y = {y0}")}, gradient {m(f"m = {g}")}.', m(f'y - ({y0}) = {g}(x - ({x0}))'), m(f'y = {latex(expand(g * (x - x0) + y0))}')],
      [('Correct gradient and correct equation', 2), ('Correct derivative and gradient at the point', 1)])
for _ in range(6):   # ad1/ad3 stationary points of a cubic
    r1, r2 = sorted(R.sample([-3, -2, -1, 0, 1, 2, 3, 4], 2)); cA = R.choice([1, 2, -1])
    fp = 3 * cA * (x - r1) * (x - r2); f = integrate(fp, x) + R.randint(-4, 6)
    pts = [(rv, f.subs(x, rv), diff(fp, x).subs(x, rv)) for rv in (r1, r2)]
    desc = [f'{m(f"({p[0]},\\ {latex(p[1])})")} is a {"minimum" if p[2] > 0 else "maximum"} turning point since {m(f"f\'\'({p[0]}) = {p[2]}")} {"> 0" if p[2] > 0 else "< 0"}.' for p in pts]
    a('ad1', 4, f'Find the stationary points of {m(f"y = {latex(expand(f))}")} and determine their nature.',
      [m(f"y' = {latex(expand(fp))} = {latex(factor(fp))}"), f'Stationary points when {m("y\' = 0")}: {m(f"x = {r1}")} or {m(f"x = {r2}")}.', m(f"y'' = {latex(diff(fp, x))}"), *desc],
      [('Both points found with correct nature justified', 4), ('Both points found, nature of one correct', 3), ('Correct x-values of the stationary points', 2), ('Correct derivative', 1)])
for _ in range(4):   # ad5 optimisation box
    W_, H_ = R.choice([(30, 30), (24, 24), (60, 60), (40, 40), (48, 30), (16, 10)])
    V = (W_ - 2 * x) * (H_ - 2 * x) * x; dV = expand(diff(V, x)); sols = [s for s in solve(dV, x) if 0 < s < min(W_, H_) / 2]
    s0 = sols[0]; Vmax = V.subs(x, s0)
    a('ad5', 4, f'Squares of side {m("x")} cm are cut from each corner of a {W_} cm by {H_} cm sheet of card, and the sides folded up to make an open box. (a) Show that the volume is {m(f"V = x({W_} - 2x)({H_} - 2x)")}. (b) Find the value of {m("x")} that gives the maximum volume, and the maximum volume.',
      [f'The base is {m(f"({W_} - 2x)")} by {m(f"({H_} - 2x)")} and the height is {m("x")}, so {m(f"V = x({W_} - 2x)({H_} - 2x)")}.', m(f'V = {latex(expand(V))}'), m(f"\\frac{{dV}}{{dx}} = {latex(dV)} = 0"),
       f'{m(f"x = {latex(s0)}")} (the other root is outside {m(f"0 < x < {min(W_, H_)//2}")}).', f'{m(f"V\'\' = {latex(diff(dV, x))}")}, which is negative at {m(f"x = {latex(s0)}")}, so it is a maximum.', f'Maximum volume {m(f"= {latex(simplify(Vmax))}" + ("" if simplify(Vmax).is_Integer else f" \\approx {dp(Vmax, 1)}"))} cm³.'],
      [('Correct expression, x-value justified as a maximum, and maximum volume', 4), ('Correct x and volume without justification', 3), ('Correct derivative set to zero', 2), ('Explains the volume expression', 1)])
for _ in range(6):   # ic4 area
    r1, r2 = sorted(R.sample([-3, -2, -1, 0, 1, 2, 3, 4, 5], 2)); f = -(x - r1) * (x - r2)
    Ar = integrate(f, (x, r1, r2))
    a('ic4', 3, f'Find the area enclosed by the curve {m(f"y = {latex(expand(f))}")} and the {m("x")}-axis.',
      [f'The curve cuts the {m("x")}-axis where {m(f"{latex(factor(f))} = 0")}, so {m(f"x = {r1}")} and {m(f"x = {r2}")}.', m(f'A = \\int_{{{r1}}}^{{{r2}}} \\left({latex(expand(f))}\\right)dx'), m(f'= \\left[{latex(integrate(expand(f), x))}\\right]_{{{r1}}}^{{{r2}}}'), m(f'= {latex(Ar)}') + ' square units'],
      [('Correct limits, integral and area', 3), ('Correct integral with an error in evaluating', 2), ('Correct x-intercepts or correct primitive', 1)])
for _ in range(5):   # el3
    b_, c_ = R.choice([(2, 7), (3, 20), (5, 12), (2, 30), (4, 50)]); xs = log(c_) / log(b_)
    a('el3', 2, f'Solve {m(f"{b_}^x = {c_}")}, giving your answer correct to 3 decimal places.',
      [m(f'x = \\log_{{{b_}}} {c_} = \\frac{{\\ln {c_}}}{{\\ln {b_}}}'), m(f'x \\approx {dp(xs, 3)}')], TWO('logs used'))
for _ in range(5):   # tm5 sector
    rr_, th = R.choice([5, 6, 8, 10, 12]), R.choice([pi / 3, 2 * pi / 3, pi / 4, 3 * pi / 4, pi / 6, 5 * pi / 6])
    a('tm5', 2, f'A sector has radius {rr_} cm and angle {m(th)}. Find its arc length and area, in exact form.',
      [m(f'l = r\\theta = {rr_} \\times {latex(th)} = {latex(rr_ * th)}') + ' cm', m(f'A = \\frac{{1}}{{2}}r^2\\theta = \\frac{{1}}{{2}}({rr_})^2 \\times {latex(th)} = {latex(Q(1, 2) * rr_**2 * th)}') + ' cm²'],
      [('Both arc length and area correct', 2), ('One correct', 1)])
for _ in range(5):   # tm2 cosine rule
    b_, c_, A_ = R.randint(5, 14), R.randint(5, 14), R.choice([35, 48, 62, 75, 110, 125])
    a2 = b_**2 + c_**2 - 2 * b_ * c_ * math.cos(math.radians(A_))
    a('tm2', 2, f'In triangle ABC, {m(f"b = {b_}")} cm, {m(f"c = {c_}")} cm and {m(f"A = {A_}^\\circ")}. Find {m("a")} correct to 1 decimal place.',
      [m(f'a^2 = {b_}^2 + {c_}^2 - 2({b_})({c_})\\cos {A_}^\\circ \\approx {dp(a2, 3)}'), m(f'a \\approx {dp(math.sqrt(a2), 1)}') + ' cm'], TWO('the cosine rule'))
for fn, val, sols in [('\\sin x', '\\frac{1}{2}', ['\\frac{\\pi}{6}', '\\frac{5\\pi}{6}']), ('\\cos x', '-\\frac{1}{2}', ['\\frac{2\\pi}{3}', '\\frac{4\\pi}{3}']), ('\\tan x', '-1', ['\\frac{3\\pi}{4}', '\\frac{7\\pi}{4}']),
                      ('\\sin x', '-\\frac{\\sqrt{3}}{2}', ['\\frac{4\\pi}{3}', '\\frac{5\\pi}{3}']), ('\\cos x', '\\frac{\\sqrt{2}}{2}', ['\\frac{\\pi}{4}', '\\frac{7\\pi}{4}']), ('\\tan x', '\\sqrt{3}', ['\\frac{\\pi}{3}', '\\frac{4\\pi}{3}'])]:
    a('ti3', 2, f'Solve {m(f"{fn} = {val}")} for {m("0 \\le x \\le 2\\pi")}.',
      [f'Related angle from the exact ratios, then the quadrants where {m(fn)} has that sign.', m(f'x = {sols[0]},\\ {sols[1]}')], [('Both solutions correct', 2), ('One correct solution', 1)])
for c2 in [('2\\sin^2 x - \\sin x - 1 = 0', '(2\\sin x + 1)(\\sin x - 1) = 0', '\\sin x = -\\frac{1}{2} \\text{ or } \\sin x = 1', 'x = \\frac{\\pi}{2},\\ \\frac{7\\pi}{6},\\ \\frac{11\\pi}{6}'),
           ('2\\cos^2 x - 3\\cos x + 1 = 0', '(2\\cos x - 1)(\\cos x - 1) = 0', '\\cos x = \\frac{1}{2} \\text{ or } \\cos x = 1', 'x = 0,\\ \\frac{\\pi}{3},\\ \\frac{5\\pi}{3},\\ 2\\pi'),
           ('2\\sin^2 x = 1 + \\cos x', '2(1 - \\cos^2 x) = 1 + \\cos x \\Rightarrow 2\\cos^2 x + \\cos x - 1 = 0 \\Rightarrow (2\\cos x - 1)(\\cos x + 1) = 0', '\\cos x = \\frac{1}{2} \\text{ or } \\cos x = -1', 'x = \\frac{\\pi}{3},\\ \\pi,\\ \\frac{5\\pi}{3}'),
           ('\\tan^2 x - \\tan x = 0', '\\tan x(\\tan x - 1) = 0', '\\tan x = 0 \\text{ or } \\tan x = 1', 'x = 0,\\ \\frac{\\pi}{4},\\ \\pi,\\ \\frac{5\\pi}{4},\\ 2\\pi')]:
    a('ti4', 3, f'Solve {m(c2[0])} for {m("0 \\le x \\le 2\\pi")}.', [m(c2[1]), m(c2[2]), m(c2[3])],
      [('All solutions correct with working', 3), ('Correct factorising and some solutions', 2), ('Correct quadratic form or factorisation', 1)])
for _ in range(5):   # pr4 conditional
    aa, bb, cc, dd = [R.randint(8, 40) for _ in range(4)]
    a('pr4', 2, f'In a survey, {aa} students play sport and study music, {bb} play sport only, {cc} study music only and {dd} do neither. A student who plays sport is chosen at random. Find the probability that they also study music.',
      [f'Number who play sport {m(f"= {aa} + {bb} = {aa + bb}")}.', m(f'P(\\text{{music}} \\mid \\text{{sport}}) = \\frac{{{aa}}}{{{aa + bb}}}' + (f' = {latex(Q(aa, aa + bb))}' if sp.gcd(aa, aa + bb) > 1 else ''))], TWO('the reduced sample space'))
for _ in range(5):   # dp2/dp3
    xs_ = sorted(R.sample(range(0, 6), 4)); ps = R.choice([[Q(1, 10), Q(2, 10), Q(3, 10), Q(4, 10)], [Q(1, 5), Q(2, 5), Q(1, 10), Q(3, 10)], [Q(1, 4), Q(1, 4), Q(3, 8), Q(1, 8)]])
    EX = sum(a_ * b_ for a_, b_ in zip(xs_, ps)); EX2 = sum(a_**2 * b_ for a_, b_ in zip(xs_, ps)); V = EX2 - EX**2
    tab = ', '.join(f'P(X = {a_}) = {latex(b_)}' for a_, b_ in zip(xs_, ps))
    a('dp3', 3, f'A discrete random variable has {m(tab)}. Find {m("E(X)")} and {m("\\text{Var}(X)")}.',
      [m(f'E(X) = \\sum xP(x) = {latex(EX)}'), m(f'E(X^2) = \\sum x^2P(x) = {latex(EX2)}'), m(f'\\text{{Var}}(X) = E(X^2) - [E(X)]^2 = {latex(EX2)} - \\left({latex(EX)}\\right)^2 = {latex(V)}')],
      [('Correct E(X) and Var(X)', 3), ('Correct E(X) and E(X²)', 2), ('Correct E(X)', 1)])
for _ in range(5):   # nd2
    mu, sd = R.choice([(65, 8), (72, 6), (150, 12), (40, 5), (500, 50)]); z1 = R.choice([-2, -1, 1, 2])
    xv = mu + z1 * sd; pr = {1: '84\\%', -1: '16\\%', 2: '97.5\\%', -2: '2.5\\%'}[z1]
    a('nd1', 2, f'Scores are normally distributed with mean {mu} and standard deviation {sd}. Find the z-score of {xv}, and use the empirical rule to estimate the percentage of scores below {xv}.',
      [m(f'z = \\frac{{{xv} - {mu}}}{{{sd}}} = {z1}'), f'Using 68–95–99.7, about {m(pr)} of scores are below {xv}.'], [('Correct z-score and percentage', 2), ('Correct z-score', 1)])
for kk in [(Q(3, 4), '(1 - x^2)', -1, 1, 0, Q(1, 2)), (Q(3, 8), 'x^2', 0, 2, 1, 2), (Q(1, 2), 'x', 0, 2, 1, 2), (Q(6, 1), 'x(1 - x)', 0, 1, Q(1, 2), 1)]:
    kv, body, lo, hi, p1, p2 = kk; fx = sp.sympify(body.replace('^', '**').replace('x(', 'x*('), locals={'x': x})
    pr_ = integrate(kv * fx, (x, p1, p2))
    a('cp1', 4, f'A continuous random variable has probability density function {m(f"f(x) = k{body}")} for {m(f"{lo} \\le x \\le {hi}")} and 0 elsewhere. (a) Find {m("k")}. (b) Find {m(f"P({latex(p1)} \\le X \\le {latex(p2)})")}.',
      [m(f'\\int_{{{lo}}}^{{{hi}}} k{body}\\,dx = 1'), m(f'k \\times {latex(integrate(fx, (x, lo, hi)))} = 1 \\Rightarrow k = {latex(kv)}'), m(f'P = \\int_{{{latex(p1)}}}^{{{latex(p2)}}} {latex(kv)}{body}\\,dx = {latex(pr_)}')],
      [('Correct k and correct probability', 4), ('Correct k and correct integral set up for the probability', 3), ('Correct k', 2), ('Sets the total area equal to 1', 1)])
for _ in range(5):   # wf2 simultaneous
    xs0, ys0 = R.randint(-4, 5), R.randint(-4, 5); a1_, b1_, a2_, b2_ = R.choice([(2, 3, 1, -1), (3, -2, 1, 4), (1, 2, 3, -1), (4, 1, 2, -3)])
    a('wf2', 2, f'Solve simultaneously: {m(f"{latex(a1_*x + b1_*y)} = {a1_*xs0 + b1_*ys0}")} and {m(f"{latex(a2_*x + b2_*y)} = {a2_*xs0 + b2_*ys0}")}.',
      ['Eliminate one variable (multiply and add/subtract the equations), solve, then substitute back.', m(f'x = {xs0},\\ y = {ys0}')], TWO('working'))
for _ in range(5):   # ad6 motion
    c3, c2, c1 = R.choice([(1, -6, 9), (1, -9, 24), (2, -15, 36), (1, -12, 45)])
    xt = c3 * t**3 + c2 * t**2 + c1 * t; vt = diff(xt, t); at = diff(vt, t); rest = solve(vt, t)
    a('ad6', 3, f'A particle moves in a line with displacement {m(f"x = {latex(xt)}")} metres at time {m("t")} seconds. (a) Find when the particle is at rest. (b) Find its acceleration at those times.',
      [m(f'v = \\frac{{dx}}{{dt}} = {latex(vt)} = {latex(factor(vt))}'), f'At rest when {m("v = 0")}: {m(", ".join(f"t = {latex(r_)}" for r_ in rest))} s.', m(f'a = {latex(at)}'), *[m(f'a({latex(r_)}) = {latex(at.subs(t, r_))}') + ' m/s²' for r_ in rest]],
      [('Both times and both accelerations correct', 3), ('Correct times', 2), ('Correct velocity', 1)])
for f_, fx in [('e^{3x}\\sin x', exp(3*x)*sin(x)), ('x^2 \\ln x', x**2*log(x)), ('\\frac{\\ln x}{x}', log(x)/x), ('e^{x^2}', exp(x**2)), ('\\cos^3 x', cos(x)**3), ('\\tan(2x + 1)', tan(2*x + 1))]:   # dc2
    a('dc2', 2, f'Differentiate {m(f"y = {f_}")}.', ['Use the product, quotient or chain rule as needed.', m(f"\\frac{{dy}}{{dx}} = {latex(simplify(diff(fx, x)))}")], TWO('the right rule'))

# ---------------- Extension 1 ----------------
def ind(stmt, s1, s2, s3, chain, concl):
    return ['<u>Step 1:</u> Prove true for ' + m('n=1'), 'when ' + m('n=1') + ',', s1, m('\\therefore') + ' true for ' + m('n=1'),
            '<u>Step 2:</u> Let ' + m('n=k') + ' be a number for which the statement is true', 'i.e. ' + m(s2),
            '<u>Step 3:</u> Prove true for ' + m('n=k+1'), 'i.e. ' + m(s3), *chain, m('\\therefore') + ' true for ' + m('n=k+1'), m('\\therefore') + ' by induction, ' + concl]
IND = [('Correct, complete proof in the required layout', 3), ('Correct Steps 1 and 2 and uses the assumption correctly in Step 3', 2), ('Proves true for n = 1', 1)]
for bse, add, mod in [(5, 3, 4), (7, 5, 6), (3, 7, 2), (9, -1, 8), (6, 4, 5), (11, -1, 10), (4, 2, 3), (8, 6, 7)]:
    # b^n + add divisible by mod, where b ≡ 1 (mod mod) and 1 + add ≡ 0
    assert (bse + add) % mod == 0 and (bse - 1) % mod == 0
    sgn = f'+ {add}' if add > 0 else f'- {-add}'
    s1 = m(f'{bse}^1 {sgn} = {bse + add} = {mod} \\times {(bse + add)//mod}') + f', which is divisible by {mod}'
    s2 = f'{bse}^k {sgn} = {mod}M \\text{{ for some integer }} M'
    s3 = f'{bse}^{{k+1}} {sgn} = {mod}P \\text{{ for some integer }} P'
    chain = [m(f'{bse}^{{k+1}} {sgn} = {bse} \\times {bse}^k {sgn}'), m(f'= {bse}({mod}M {"-" if add > 0 else "+"} {abs(add)}) {sgn}') + ' (from step 2)',
             m(f'= {bse*mod}M {"-" if add > 0 else "+"} {abs(bse*add)} {sgn}'), m(f'= {bse*mod}M {"-" if add > 0 else "+"} {abs(bse*add - add)}'), m(f'= {mod}({bse}M {"-" if add > 0 else "+"} {abs(bse*add - add)//mod})'),
             f'which is divisible by {mod}, since {m(f"{bse}M {"-" if add > 0 else "+"} {abs(bse*add - add)//mod}")} is an integer']
    e('pi2', 3, f'Use mathematical induction to prove that {m(f"{bse}^n {sgn}")} is divisible by {mod} for all integers {m("n \\ge 1")}.',
      ind(None, s1, s2, s3, chain, f'{m(f"{bse}^n {sgn}")} is divisible by {mod} for all integers {m("n \\ge 1")}'), IND)
for _ in range(6):   # rf2 remainder theorem find unknown
    c0, rr_, av = R.randint(-6, 6), R.randint(-5, 9), R.choice([-2, -1, 1, 2, 3])
    a_s = Symbol('a'); P = x**3 + a_s * x**2 + c0 * x - 4
    sol = solve(Eq(P.subs(x, av), rr_), a_s)[0]
    e('rf2', 2, f'When {m(f"P(x) = x^3 + ax^2 {"+" if c0 >= 0 else "-"} {abs(c0)}x - 4")} is divided by {m(f"(x {"-" if av > 0 else "+"} {abs(av)})")}, the remainder is {rr_}. Find {m("a")}.',
      [m(f'P({av}) = {rr_}'), m(f'{latex(P.subs(x, av))} = {rr_}'), m(f'a = {latex(sol)}')], TWO('the remainder theorem'))
for _ in range(5):   # sp3
    cs = [R.randint(-6, 6) for _ in range(3)]
    s1_, s2_, s3_ = -cs[0], cs[1], -cs[2]
    e('sp3', 2, f'The roots of {m(f"{latex(x**3 + cs[0]*x**2 + cs[1]*x + cs[2])} = 0")} are {m("\\alpha, \\beta, \\gamma")}. Find {m("\\alpha^2 + \\beta^2 + \\gamma^2")}.',
      [m(f'\\alpha + \\beta + \\gamma = {s1_},\\quad \\alpha\\beta + \\alpha\\gamma + \\beta\\gamma = {s2_}'), m(f'\\alpha^2 + \\beta^2 + \\gamma^2 = ({s1_})^2 - 2({s2_}) = {s1_**2 - 2*s2_}')], TWO('the root relations'))
def aux_sols(sv, al):
    u0 = sp.asin(sp.nsimplify(sv)); out = []
    for base in (u0, pi - u0):
        for kk in range(-1, 3):
            u = base + 2 * pi * kk
            if (al - 1e-9 <= u.evalf() <= (2 * pi + al).evalf() + 1e-9): out.append(sp.nsimplify(u - al) if al.has(pi) else (u - al))
    return sorted(set(out), key=lambda v: float(v.evalf()))
for A_, B_ in [(sp.Integer(1), sp.Integer(1)), (sqrt(3), sp.Integer(1)), (sp.Integer(1), sqrt(3)), (sp.Integer(3), sp.Integer(4)), (sp.Integer(5), sp.Integer(12))]:
    cA = lambda c: '' if c == 1 else latex(c)   # tid5/te2
    Rr = sqrt(A_**2 + B_**2); al = sp.atan(B_ / A_)
    rhs = R.choice([1, Rr / 2]) if Rr != 1 else 1
    e('te2', 4, f'(a) Express {m(f"{cA(A_)}\\sin x + {cA(B_)}\\cos x")} in the form {m("R\\sin(x + \\alpha)")}, where {m("R > 0")} and {m("0 < \\alpha < \\frac{\\pi}{2}")}. (b) Hence solve {m(f"{cA(A_)}\\sin x + {cA(B_)}\\cos x = {latex(rhs)}")} for {m("0 \\le x \\le 2\\pi")}' + (' (answers to 2 decimal places).' if not al.is_rational and al.func != sp.Mul else '.'),
      [m(f'R = \\sqrt{{({latex(A_)})^2 + ({latex(B_)})^2}} = {latex(Rr)}'), m(f'R\\cos\\alpha = {latex(A_)},\\ R\\sin\\alpha = {latex(B_)} \\Rightarrow \\tan\\alpha = {latex(B_/A_)},\\ \\alpha = {latex(al) if al.has(pi) else dp(al.evalf(), 4)}'),
       m(f'{latex(Rr)}\\sin(x + \\alpha) = {latex(rhs)} \\Rightarrow \\sin(x + \\alpha) = {latex(sp.nsimplify(rhs / Rr))}'),
       'Solve for ' + m('x + \\alpha') + ' in ' + m('\\alpha \\le x + \\alpha \\le 2\\pi + \\alpha') + ', then subtract ' + m('\\alpha') + ':',
       m(', '.join('x = ' + (latex(v) if al.has(pi) else dp(v.evalf(), 2)) for v in aux_sols(rhs / Rr, al)))],
      [('Correct R and α and all solutions', 4), ('Correct R and α with some correct solutions', 3), ('Correct R and α', 2), ('Correct R', 1)])
for f_, d_ in [('\\sin^{-1}(3x)', 3 / sqrt(1 - 9 * x**2)), ('\\tan^{-1}(x^2)', 2 * x / (1 + x**4)), ('\\cos^{-1}\\left(\\frac{x}{2}\\right)', -1 / sqrt(4 - x**2)), ('x\\tan^{-1}x', sp.atan(x) + x / (1 + x**2))]:
    e('it4', 2, f'Differentiate {m(f"y = {f_}")}.', ['Use the inverse trig derivatives with the chain (or product) rule.', m(f'\\frac{{dy}}{{dx}} = {latex(d_)}')], TWO('working'))
for ig, lo, hi, val in [('\\frac{1}{\\sqrt{4 - x^2}}', 0, 1, pi / 6), ('\\frac{1}{9 + x^2}', 0, 3, pi / 12), ('\\frac{2}{1 + 4x^2}', 0, Q(1, 2), pi / 4), ('\\frac{1}{\\sqrt{1 - 4x^2}}', 0, Q(1, 4), pi / 12)]:
    e('it5', 2, f'Evaluate {m(f"\\int_{{{latex(lo)}}}^{{{latex(hi)}}} {ig}\\,dx")}.', ['The integrand is the derivative of an inverse trig function; find the primitive and substitute the limits.', m(f'= {latex(val)}')], TWO('the correct primitive'))
for u_, ig, fx, lo, hi in [('u = x^2 + 1', 'x(x^2 + 1)^3', x*(x**2+1)**3, 0, 1), ('u = 1 + \\sin x', '\\cos x(1 + \\sin x)^2', cos(x)*(1+sin(x))**2, 0, pi / 2), ('u = 2x + 1', 'x\\sqrt{2x + 1}', x*sqrt(2*x+1), 0, 4), ('u = \\ln x', '\\frac{(\\ln x)^2}{x}', log(x)**2/x, 1, sp.E), ('u = 1 - x^2', 'x\\sqrt{1 - x^2}', x*sqrt(1-x**2), 0, 1)]:
    val = simplify(integrate(fx, (x, lo, hi)))
    e('in4', 3, f'Use the substitution {m(u_)} to evaluate {m(f"\\int_{{{latex(lo)}}}^{{{latex(hi)}}} {ig}\\,dx")}.',
      [f'Differentiate the substitution, change the limits to {m("u")}-values and rewrite the integral in {m("u")}.', 'Integrate in ' + m('u') + ' and substitute the new limits.', m(f'= {latex(val)}')],
      [('Correct substitution, limits and value', 3), ('Correct integral in u with correct limits', 2), ('Correct du or new limits', 1)])
for fx_, lo, hi in [(sqrt(x), 0, 4), (x**2, 0, 2), (sp.exp(x), 0, 1), (1 / x, 1, 3), (sin(x), 0, pi), (sp.sqrt(4 - x**2), -2, 2)]:
    Vv = simplify(pi * integrate(fx_**2, (x, lo, hi)))
    e('vo1', 3, f'The region between {m(f"y = {latex(fx_)}")}, the {m("x")}-axis, {m(f"x = {latex(lo)}")} and {m(f"x = {latex(hi)}")} is rotated about the {m("x")}-axis. Find the exact volume of the solid.',
      [m(f'V = \\pi\\int_{{{latex(lo)}}}^{{{latex(hi)}}} y^2\\,dx = \\pi\\int_{{{latex(lo)}}}^{{{latex(hi)}}} {latex(simplify(fx_**2))}\\,dx'), m(f'= {latex(Vv)}') + ' cubic units'],
      [('Correct integral and exact volume', 3), ('Correct integral with an error evaluating', 2), ('Correct volume formula with y²', 1)])
Yf = sp.Function('Y')
for rhs, ex, x0, y0 in [('xy', x*Yf(x), 0, 2), ('x y^2', x*Yf(x)**2, 0, 1), ('\\frac{x}{y}', x/Yf(x), 0, 3), ('e^{-y}', exp(-Yf(x)), 0, 0), ('2x(1 + y^2)', 2*x*(1 + Yf(x)**2), 0, 0)]:
    sol = sp.dsolve(sp.Eq(Yf(x).diff(x), ex), Yf(x), ics={Yf(x0): y0})
    sol = [s_ for s_ in sol if s_.rhs.subs(x, x0) == y0][0] if isinstance(sol, list) else sol
    e('de4', 3, f'Solve the differential equation {m(f"\\frac{{dy}}{{dx}} = {rhs}")} given that {m(f"y = {y0}")} when {m(f"x = {x0}")}.',
      ['Separate the variables, then integrate both sides.', 'Use the initial condition to find the constant.', m(f'y = {latex(sol.rhs)}')],
      [('Correct separation, integration and particular solution', 3), ('Correct general solution', 2), ('Correct separation of variables', 1)])
for T0, Ta, T1, t1, t2 in [(90, 20, 60, 10, 25), (100, 25, 70, 5, 15), (80, 18, 50, 12, 30), (95, 22, 75, 4, 10)]:
    kk = math.log((T1 - Ta) / (T0 - Ta)) / t1; Tt2 = Ta + (T0 - Ta) * math.exp(kk * t2)
    e('eg3', 4, f'A cup of coffee cools according to {m(f"\\frac{{dT}}{{dt}} = k(T - {Ta})")}, where {m("T")} is the temperature in °C after {m("t")} minutes. Its initial temperature is {T0}°C and after {t1} minutes it is {T1}°C. (a) Show that {m(f"T = {Ta} + Ae^{{kt}}")} satisfies the equation. (b) Find the temperature after {t2} minutes, to 1 decimal place.',
      [m(f'\\frac{{dT}}{{dt}} = kAe^{{kt}} = k(T - {Ta})') + ' since ' + m(f'Ae^{{kt}} = T - {Ta}'), m(f't = 0:\\ {T0} = {Ta} + A \\Rightarrow A = {T0 - Ta}'), m(f't = {t1}:\\ {T1} = {Ta} + {T0 - Ta}e^{{{t1}k}} \\Rightarrow k = \\frac{{1}}{{{t1}}}\\ln\\frac{{{T1 - Ta}}}{{{T0 - Ta}}} \\approx {dp(kk, 4)}'),
       m(f'T({t2}) = {Ta} + {T0 - Ta}e^{{{t2}k}} \\approx {dp(Tt2, 1)}') + '°C'],
      [('Shows it satisfies the DE, finds A and k, and correct temperature', 4), ('Correct A and k', 3), ('Correct A or shows it satisfies the DE', 2), ('Correct derivative of T', 1)])
for _ in range(6):   # ve4 angle
    u = [R.randint(-5, 6) for _ in range(2)]; v = [R.randint(-5, 6) for _ in range(2)]
    if not any(u) or not any(v): continue
    dot = u[0] * v[0] + u[1] * v[1]; ang = math.degrees(math.acos(max(-1, min(1, dot / math.hypot(*u) / math.hypot(*v)))))
    if u[0] * v[1] == u[1] * v[0]: continue
    def vec(c): 
        I, J = '\\underset{\\sim}{i}', '\\underset{\\sim}{j}'
        ts = [(c[0], I), (c[1], J)]; out = ''
        for cc, b_ in ts:
            if cc == 0: continue
            mag = '' if abs(cc) == 1 else str(abs(cc))
            out += ('-' if cc < 0 else '') + mag + b_ if not out else (' - ' if cc < 0 else ' + ') + mag + b_
        return out
    e('ve4', 2, f'Find the angle between {m("\\underset{\\sim}{a} = " + vec(u))} and {m("\\underset{\\sim}{b} = " + vec(v))}, to the nearest degree.',
      [m(f'\\underset{{\\sim}}{{a}} \\cdot \\underset{{\\sim}}{{b}} = {dot},\\ |\\underset{{\\sim}}{{a}}| = \\sqrt{{{u[0]**2 + u[1]**2}}},\\ |\\underset{{\\sim}}{{b}}| = \\sqrt{{{v[0]**2 + v[1]**2}}}'),
       m(f'\\cos\\theta = \\frac{{{dot}}}{{\\sqrt{{{u[0]**2 + u[1]**2}}}\\sqrt{{{v[0]**2 + v[1]**2}}}}} \\Rightarrow \\theta \\approx {round(ang)}^\\circ')], TWO('the dot product'))
for V0, th, g in [(20, 30, 10), (30, 45, 10), (25, 60, 10), (40, 30, 10), (15, 45, 10)]:
    vx, vy = V0 * math.cos(math.radians(th)), V0 * math.sin(math.radians(th)); T_ = 2 * vy / g; H_ = vy**2 / (2 * g); Rg = vx * T_
    e('pj2', 4, f'A ball is projected from level ground at {V0} m/s at {th}° to the horizontal. Taking {m(f"g = {g}")} m/s², find (a) the time of flight, (b) the maximum height, (c) the range. Give answers to 2 decimal places.',
      [m(f'\\dot{{x}} = {V0}\\cos {th}^\\circ,\\quad \\dot{{y}} = {V0}\\sin {th}^\\circ - {g}t'), m(f'x = {V0}t\\cos {th}^\\circ,\\quad y = {V0}t\\sin {th}^\\circ - 5t^2'),
       f'(a) {m("y = 0")}: {m(f"t = \\frac{{2({V0})\\sin {th}^\\circ}}{{{g}}} \\approx {dp(T_)}")} s', f'(b) {m("\\dot{y} = 0")} at {m(f"t = {dp(T_/2)}")} s: {m(f"y_{{max}} \\approx {dp(H_)}")} m', f'(c) {m(f"x = {V0}\\cos {th}^\\circ \\times {dp(T_)} \\approx {dp(Rg)}")} m'],
      [('All three correct with the equations of motion', 4), ('Two correct', 3), ('Correct equations of motion and one answer', 2), ('Correct components of velocity', 1)])
for _ in range(6):   # be2
    a_, b_, N_, r_ = R.choice([2, 3, 1]), R.choice([1, 2, -1, -2, -3]), R.randint(5, 9), None
    kpow = R.randint(2, N_ - 2); coef = sp.binomial(N_, kpow) * a_**kpow * b_**(N_ - kpow)
    e('be2', 2, f'Find the coefficient of {m(f"x^{{{kpow}}}")} in the expansion of {m(f"({a_ if a_ != 1 else ""}x {"+" if b_ > 0 else "-"} {abs(b_)})^{{{N_}}}")}.',
      [m(f'T_{{r+1}} = \\binom{{{N_}}}{{r}}({a_ if a_ != 1 else ""}x)^r({b_})^{{{N_}-r}}'), f'For {m(f"x^{{{kpow}}}")}, {m(f"r = {kpow}")}: coefficient ' + m(f'= \\binom{{{N_}}}{{{kpow}}}({a_})^{{{kpow}}}({b_})^{{{N_ - kpow}}} = {coef}')], TWO('the general term'))
for _ in range(5):   # pc4 committees
    bb_, gg_, sz = R.randint(5, 9), R.randint(4, 8), R.choice([4, 5])
    kk_ = R.randint(1, min(sz - 1, gg_)); tot = sp.binomial(bb_, sz - kk_) * sp.binomial(gg_, kk_)
    e('pc4', 2, f'A committee of {sz} is chosen from {bb_} boys and {gg_} girls. In how many ways can it be chosen if it must contain exactly {kk_} girl{"s" if kk_ > 1 else ""}?',
      [m(f'\\binom{{{gg_}}}{{{kk_}}} \\times \\binom{{{bb_}}}{{{sz - kk_}}}'), m(f'= {sp.binomial(gg_, kk_)} \\times {sp.binomial(bb_, sz - kk_)} = {tot}')], TWO('working'))
for _ in range(5):   # bd2
    N_, p_, r_ = R.randint(6, 12), R.choice([Q(1, 4), Q(1, 3), Q(2, 5), Q(3, 10), Q(1, 5)]), None
    r_ = R.randint(1, 3); pr_ = sp.binomial(N_, r_) * p_**r_ * (1 - p_)**(N_ - r_)
    e('bd2', 2, f'{m(f"X \\sim \\text{{Bin}}({N_}, {latex(p_)})")}. Find {m(f"P(X = {r_})")} correct to 4 decimal places.',
      [m(f'P(X = {r_}) = \\binom{{{N_}}}{{{r_}}}\\left({latex(p_)}\\right)^{{{r_}}}\\left({latex(1 - p_)}\\right)^{{{N_ - r_}}}'), m(f'\\approx {dp(pr_, 4)}')], TWO('the binomial formula'))
for rate, r0 in [(10, 5), (4, 3), (20, 10), (12, 6)]:
    drdt = Q(rate, 4) / (pi * r0**2) if False else sp.nsimplify(rate) / (4 * pi * r0**2)
    e('rr2', 3, f'Air is pumped into a spherical balloon at {rate} cm³/s. Find the rate at which the radius is increasing when the radius is {r0} cm.',
      [m('V = \\frac{4}{3}\\pi r^3 \\Rightarrow \\frac{dV}{dr} = 4\\pi r^2'), m(f'\\frac{{dr}}{{dt}} = \\frac{{dV}}{{dt}} \\div \\frac{{dV}}{{dr}} = \\frac{{{rate}}}{{4\\pi({r0})^2}} = {latex(drdt)}') + f' cm/s (≈ {dp(drdt, 4)} cm/s)'],
      [('Correct chain rule and exact rate', 3), ('Correct chain rule set-up', 2), ('Correct dV/dr', 1)])
for c_, d_ in [(1, 3), (2, -1), (3, 2), (-1, 4)]:   # iq2
    e('iq2', 3, f'Solve {m(f"\\frac{{{c_}}}{{x - {d_}}} \\ge 1")}.'.replace('- -', '+ '),
      [f'Multiply both sides by {m(f"(x - {d_})^2")} (positive), noting {m(f"x \\ne {d_}")}.'.replace('- -', '+ '), m(f'{c_}(x - {d_}) \\ge (x - {d_})^2 \\Rightarrow (x - {d_})(x - {d_ + c_}) \\le 0').replace('- -', '+ '),
       m(f'{min(d_, d_ + c_)} {"<" if d_ < d_ + c_ else "\\le"} x {"\\le" if d_ < d_ + c_ else "<"} {max(d_, d_ + c_)}')],
      [('Correct solution, excluding the asymptote', 3), ('Correct critical values with an error in the interval', 2), ('Multiplies by the square of the denominator or finds a critical value', 1)])

A.save(); E1.save()
