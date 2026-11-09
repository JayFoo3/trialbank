"""Multiple choice for topics the existing banks skipped: Adv (trig identities and equations, continuous distributions),
Ext1 (graphical relationships, further vectors, counting/pigeonhole, sample proportions, normal approximation),
Physics (thin topics). Saved as *-extra and appended to the existing quick-*.json files."""
import random, math
from lib import Bank
from mathlib import *

R = random.Random(2026115)
A = Bank('quick-adv-extra', 'adv', seed=91); E = Bank('quick-ext1-extra', 'ext1', seed=92); P = Bank('quick-physics-extra', 'phys', seed=93)
def add(B, T, step, prompt, right, wrong, why):
    wrong = [w for w in dict.fromkeys(wrong) if w != right][:3]
    if len(wrong) == 3 and not any(q['prompt'] == prompt for q in B.mcq): B.M(T, prompt, right, wrong, why, step=step)

# ---- Adv: Trigonometric Identities and Equations
T = 'Trigonometric Identities and Equations'
for f_, val, rec in [('\\sec', '\\frac{1}{\\cos\\theta}', '\\cos'), ('\\csc', '\\frac{1}{\\sin\\theta}', '\\sin'), ('\\cot', '\\frac{\\cos\\theta}{\\sin\\theta}', '\\tan')]:
    add(A, T, 'ti1', f'{m(f"{f_}\\theta")} is equal to', m(val), [m(f'\\frac{{1}}{{{"\\sin" if rec == "\\cos" else "\\cos"}\\theta}}'), m(f'{rec}^{{-1}}\\theta'), m(f'-{rec}\\theta')], 'Reciprocal ratio definitions.')
for ang, fn, ex in [(pi / 3, sp.sec, 2), (pi / 6, sp.csc, 2), (pi / 4, sp.cot, 1), (pi / 6, sp.sec, 2 / sqrt(3)), (pi / 3, sp.cot, 1 / sqrt(3)), (pi / 4, sp.csc, sqrt(2))]:
    v = sp.nsimplify(fn(ang))
    add(A, T, 'ti1', f'Find the exact value of {m(f"\\{fn.__name__}{latex(ang)}")}.', m(v), [m(sp.nsimplify(1 / v)), m(sp.nsimplify(v / 2)), m(sp.nsimplify(v + 1))], 'Take the reciprocal of the exact ratio.')
for lhs, rhs, w in [('\\sin^2\\theta + \\cos^2\\theta', '1', ['0', '\\tan^2\\theta', '2']), ('1 + \\tan^2\\theta', '\\sec^2\\theta', ['\\csc^2\\theta', '\\cot^2\\theta', '1']), ('1 + \\cot^2\\theta', '\\csc^2\\theta', ['\\sec^2\\theta', '\\tan^2\\theta', '2']),
                    ('\\frac{1 - \\cos^2\\theta}{\\sin\\theta}', '\\sin\\theta', ['\\cos\\theta', '1', '\\tan\\theta']), ('\\sec^2\\theta - \\tan^2\\theta', '1', ['0', '\\sec\\theta', '2\\tan^2\\theta']), ('\\tan\\theta\\cos\\theta', '\\sin\\theta', ['\\cos\\theta', '1', '\\sec\\theta'])]:
    add(A, T, 'ti2', f'Simplify {m(lhs)}.', m(rhs), [m(z) for z in w], 'Use the Pythagorean identities and ' + m('\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}') + '.')
for fn, val, sols, w in [('\\sin x', '\\frac{\\sqrt{3}}{2}', 'x = \\frac{\\pi}{3}, \\frac{2\\pi}{3}', ['x = \\frac{\\pi}{3}, \\frac{4\\pi}{3}', 'x = \\frac{\\pi}{6}, \\frac{5\\pi}{6}', 'x = \\frac{\\pi}{3}, \\frac{5\\pi}{3}']),
                         ('\\cos x', '-\\frac{\\sqrt{2}}{2}', 'x = \\frac{3\\pi}{4}, \\frac{5\\pi}{4}', ['x = \\frac{\\pi}{4}, \\frac{7\\pi}{4}', 'x = \\frac{3\\pi}{4}, \\frac{7\\pi}{4}', 'x = \\frac{5\\pi}{4}, \\frac{7\\pi}{4}']),
                         ('\\tan x', '1', 'x = \\frac{\\pi}{4}, \\frac{5\\pi}{4}', ['x = \\frac{\\pi}{4}, \\frac{3\\pi}{4}', 'x = \\frac{\\pi}{4}, \\frac{7\\pi}{4}', 'x = \\frac{\\pi}{4}']),
                         ('\\sin x', '-\\frac{1}{2}', 'x = \\frac{7\\pi}{6}, \\frac{11\\pi}{6}', ['x = \\frac{\\pi}{6}, \\frac{5\\pi}{6}', 'x = \\frac{5\\pi}{6}, \\frac{7\\pi}{6}', 'x = \\frac{4\\pi}{3}, \\frac{5\\pi}{3}']),
                         ('\\cos x', '\\frac{1}{2}', 'x = \\frac{\\pi}{3}, \\frac{5\\pi}{3}', ['x = \\frac{\\pi}{3}, \\frac{2\\pi}{3}', 'x = \\frac{\\pi}{6}, \\frac{11\\pi}{6}', 'x = \\frac{2\\pi}{3}, \\frac{4\\pi}{3}']),
                         ('\\tan x', '-\\sqrt{3}', 'x = \\frac{2\\pi}{3}, \\frac{5\\pi}{3}', ['x = \\frac{\\pi}{3}, \\frac{4\\pi}{3}', 'x = \\frac{2\\pi}{3}, \\frac{4\\pi}{3}', 'x = \\frac{5\\pi}{6}, \\frac{11\\pi}{6}']),
                         ('2\\sin x', '1', 'x = \\frac{\\pi}{6}, \\frac{5\\pi}{6}', ['x = \\frac{\\pi}{3}, \\frac{2\\pi}{3}', 'x = \\frac{\\pi}{6}, \\frac{7\\pi}{6}', 'x = \\frac{\\pi}{2}']),
                         ('\\sin 2x', '0', 'x = 0, \\frac{\\pi}{2}, \\pi, \\frac{3\\pi}{2}, 2\\pi', ['x = 0, \\pi, 2\\pi', 'x = \\frac{\\pi}{2}, \\frac{3\\pi}{2}', 'x = 0, \\frac{\\pi}{4}, \\frac{\\pi}{2}'])]:
    add(A, T, 'ti3', f'Solve {m(f"{fn} = {val}")} for {m("0 \\le x \\le 2\\pi")}.', m(sols), [m(z) for z in w], 'Find the related angle, then use the quadrants where the ratio has that sign.')
for eq, sols, w in [('\\sin^2 x = \\frac{1}{4}', 'x = \\frac{\\pi}{6}, \\frac{5\\pi}{6}, \\frac{7\\pi}{6}, \\frac{11\\pi}{6}', ['x = \\frac{\\pi}{6}, \\frac{5\\pi}{6}', 'x = \\frac{\\pi}{3}, \\frac{2\\pi}{3}, \\frac{4\\pi}{3}, \\frac{5\\pi}{3}', 'x = \\frac{\\pi}{12}, \\frac{5\\pi}{12}']),
                    ('\\tan^2 x = 3', 'x = \\frac{\\pi}{3}, \\frac{2\\pi}{3}, \\frac{4\\pi}{3}, \\frac{5\\pi}{3}', ['x = \\frac{\\pi}{3}, \\frac{4\\pi}{3}', 'x = \\frac{\\pi}{6}, \\frac{5\\pi}{6}, \\frac{7\\pi}{6}, \\frac{11\\pi}{6}', 'x = \\frac{\\pi}{3}']),
                    ('\\sin x\\cos x = 0', 'x = 0, \\frac{\\pi}{2}, \\pi, \\frac{3\\pi}{2}, 2\\pi', ['x = 0, \\pi, 2\\pi', 'x = \\frac{\\pi}{2}, \\frac{3\\pi}{2}', 'x = \\frac{\\pi}{4}, \\frac{5\\pi}{4}']),
                    ('2\\cos^2 x = 1', 'x = \\frac{\\pi}{4}, \\frac{3\\pi}{4}, \\frac{5\\pi}{4}, \\frac{7\\pi}{4}', ['x = \\frac{\\pi}{4}, \\frac{7\\pi}{4}', 'x = \\frac{\\pi}{3}, \\frac{5\\pi}{3}', 'x = \\frac{\\pi}{6}, \\frac{11\\pi}{6}'])]:
    add(A, T, 'ti4', f'Solve {m(eq)} for {m("0 \\le x \\le 2\\pi")}.', m(sols), [m(z) for z in w], 'Square roots give both a positive and a negative case; factorising gives each factor = 0.')

# ---- Adv: Continuous Probability Distributions
T = 'Continuous Probability Distributions'
for body, lo, hi, kv in [('x', 0, 2, Q(1, 2)), ('x^2', 0, 3, Q(1, 9)), ('x', 0, 4, Q(1, 8)), ('(4 - x)', 0, 4, Q(1, 8)), ('x^3', 0, 2, Q(1, 4)), ('1', 2, 7, Q(1, 5))]:
    add(A, T, 'cp1', f'{m(f"f(x) = k{body}")} for {m(f"{lo} \\le x \\le {hi}")} is a probability density function. Find {m("k")}.', m(kv), [m(2 * kv), m(kv / 2), m(1 / kv)], 'The total area under a PDF is 1.')
for lo, hi, a_, b_ in [(0, 10, 2, 5), (0, 4, 1, 3), (2, 8, 3, 6), (0, 20, 5, 15)]:
    p = Q(b_ - a_, hi - lo)
    add(A, T, 'cp2', f'{m("X")} is uniformly distributed on {m(f"[{lo}, {hi}]")}. Find {m(f"P({a_} < X < {b_})")}.', m(p), [m(Q(b_, hi)), m(1 - p), m(Q(b_ - a_, hi))], 'For a uniform distribution, probability = interval length ÷ total length.')
for F_, med, w in [('\\frac{x^2}{4}, 0 \\le x \\le 2', '\\sqrt{2}', ['1', '2', '\\frac{1}{2}']), ('\\frac{x^2}{9}, 0 \\le x \\le 3', '\\frac{3}{\\sqrt{2}}', ['\\frac{3}{2}', '\\frac{9}{2}', '\\sqrt{3}']), ('\\frac{x^3}{8}, 0 \\le x \\le 2', '\\sqrt[3]{4}', ['1', '\\sqrt{2}', '\\frac{1}{2}'])]:
    add(A, T, 'cp4', f'A continuous random variable has CDF {m(f"F(x) = {F_}")}. Its median is', m(med), [m(z) for z in w], 'Solve ' + m('F(x) = \\frac{1}{2}') + '.')
add(A, T, 'cp3', 'If ' + m('F(x)') + ' is the cumulative distribution function, then ' + m('P(a < X < b)') + ' equals', m('F(b) - F(a)'), [m('F(a) - F(b)'), m('F(b) + F(a)'), m("F'(b) - F'(a)")], 'The CDF gives ' + m('P(X \\le x)') + '.')
add(A, T, 'cp3', 'The PDF is found from the CDF by', 'differentiating it', ['integrating it', 'taking its reciprocal', 'squaring it'], m("f(x) = F'(x)"))
add(A, T, 'cp1', 'Which is NOT a property of a probability density function?', m('f(x)') + ' can be negative', [m('\\int f(x)\\,dx = 1') + ' over its domain', m('f(x) \\ge 0'), 'probabilities are areas under the curve'], 'A PDF is never negative.')
add(A, T, 'cp4', 'The mode of a continuous random variable is', 'the value of x where the PDF is highest', ['the value where the CDF is 0.5', 'the mean', 'the largest value of x'], 'Maximum of f(x).')

# ---- Ext1: Graphical Relat.
T = 'Graphical Relat.'
GR = ['gr1', 'gr1', 'gr2', 'gr2', 'gr3', 'gr1', 'gr1', 'gr3', 'gr5', 'gr5']
for q_, a_, w in [('The graph of ' + m('y = \\frac{1}{f(x)}') + ' has vertical asymptotes where', m('f(x) = 0'), [m('f(x) = 1'), m('f(x)') + ' has a turning point', m('x = 0') + ' only']),
                  ('Where ' + m('f(x) = 1') + ', the graph of ' + m('y = \\frac{1}{f(x)}'), 'meets ' + m('y = f(x)'), ['has an asymptote', 'crosses the x-axis', 'has a turning point']),
                  ('The graph of ' + m('y = |f(x)|') + ' is obtained by', 'reflecting the parts below the x-axis upward', ['reflecting the parts to the left of the y-axis', 'deleting the parts below the x-axis', 'reflecting the whole graph in y = x']),
                  ('The graph of ' + m('y = f(|x|)') + ' is', 'the part for ' + m('x \\ge 0') + ' reflected in the y-axis', ['the part below the x-axis reflected up', 'the reflection of f in the x-axis', 'the same as ' + m('y = |f(x)|')]),
                  ('The graph of ' + m('y^2 = f(x)') + ' exists only where', m('f(x) \\ge 0'), [m('f(x) \\le 0'), m('x \\ge 0'), m('f(x) = 1')]),
                  ('Where ' + m('f(x)') + ' has a local maximum (positive), ' + m('y = \\frac{1}{f(x)}') + ' has', 'a local minimum', ['a local maximum', 'a vertical asymptote', 'an x-intercept']),
                  ('As ' + m('f(x) \\to \\infty') + ', ' + m('\\frac{1}{f(x)}'), m('\\to 0'), [m('\\to \\infty'), m('\\to 1'), m('\\to -\\infty')]),
                  ('The graph of ' + m('y = \\sqrt{f(x)}') + ' near an x-intercept of ' + m('f') + ' has', 'a vertical tangent', ['a horizontal tangent', 'an asymptote', 'a corner pointing down']),
                  ('The function ' + m('y = \\frac{x^2 - 1}{x - 2}') + ' has an oblique asymptote', m('y = x + 2'), [m('y = x - 2'), m('y = x'), m('y = 2')]),
                  ('The rational function ' + m('y = \\frac{2x + 1}{x - 3}') + ' has horizontal asymptote', m('y = 2'), [m('y = 3'), m('y = \\frac{1}{3}'), m('y = 0')])]:
    add(E, T, GR.pop(0), q_, a_, w, 'Use the behaviour of f to build the new graph.')
# ---- Ext1: Further Operations (vectors)
T = 'Further Operations'
for _ in range(8):
    u = [R.randint(-4, 5) for _ in range(2)]; v = [R.randint(-4, 5) for _ in range(2)]
    if not any(v) or not any(u): continue
    k_ = Q(u[0] * v[0] + u[1] * v[1], v[0]**2 + v[1]**2); proj = (k_ * v[0], k_ * v[1])
    add(E, T, 'fo1', f'Find the projection of {m(f"({u[0]}, {u[1]})")} onto {m(f"({v[0]}, {v[1]})")}.', m(f'\\left({latex(proj[0])}, {latex(proj[1])}\\right)'), [m(f'\\left({latex(k_ * u[0])}, {latex(k_ * u[1])}\\right)'), m(f'\\left({latex(-proj[0])}, {latex(-proj[1])}\\right)'), m(f'\\left({latex(Q(u[0]*v[0]+u[1]*v[1]))}, 0\\right)')], m('\\text{proj}_{\\underset{\\sim}{b}}\\underset{\\sim}{a} = \\frac{\\underset{\\sim}{a} \\cdot \\underset{\\sim}{b}}{\\underset{\\sim}{b} \\cdot \\underset{\\sim}{b}}\\underset{\\sim}{b}'))
for _ in range(6):
    a_ = R.randint(-5, 5); b_ = R.randint(1, 5)
    kk = Q(-a_ * 2, b_) if b_ else 0
    add(E, T, 'fo1', f'For what value of {m("k")} are {m(f"({a_}, {b_})")} and {m("(2, k)")} perpendicular?', m(f'k = {latex(Q(-2 * a_, b_))}'), [m(f'k = {latex(Q(2 * a_, b_))}'), m(f'k = {latex(Q(b_, 2))}'), m(f'k = {latex(Q(-b_, 2) if Q(-b_, 2) != Q(-2*a_, b_) else 7)}')], 'Perpendicular: dot product is 0.')
# ---- Ext1: Combinatorics
T = 'Combinatorics'
for pig, hole in [(13, 12), (32, 31), (367, 366), (11, 10)]:
    add(E, T, 'co2', f'{pig} people are in a room. Which must be true if there are {hole} possible birth months/days/categories?', 'At least two share a category', ['No two share a category', 'Everyone shares one category', 'At least three share a category'], f'{pig} items into {hole} boxes: the pigeonhole principle.')
for items, boxes in [(25, 6), (40, 9), (100, 7), (31, 5)]:
    add(E, T, 'co2', f'{items} socks are put into {boxes} drawers. The largest number guaranteed in some drawer is at least', str(-(-items // boxes)), [str(items // boxes) if items % boxes else str(items // boxes - 1), str(boxes), str(-(-items // boxes) + 1)], m(f'\\lceil {items}/{boxes} \\rceil') + ' (generalised pigeonhole).')
for a_, b_, c_ in [(3, 4, 2), (5, 2, 3), (4, 3, 5), (6, 5, 2)]:
    add(E, T, 'co1', f'A meal has {a_} entrées, {b_} mains and {c_} desserts. How many three-course meals are possible?', str(a_ * b_ * c_), [str(a_ + b_ + c_), str(a_ * b_ + c_), str(a_ * b_ * c_ * 2)], 'Multiply the choices at each stage.')
for L_ in [3, 4, 5]:
    add(E, T, 'co1', f'How many {L_}-digit PINs can be made from the digits 0–9 if digits can repeat?', str(10**L_), [str(math.perm(10, L_)), str(9 * 10**(L_ - 1)), str(10 * L_)], 'Each position has 10 choices.')
# ---- Ext1: sample proportions and normal approximation
T = 'Normal Approx.'
for n_, p_ in [(100, 0.3), (400, 0.5), (200, 0.2), (150, 0.6), (50, 0.4)]:
    mu, sd = n_ * p_, math.sqrt(n_ * p_ * (1 - p_))
    add(E, T, 'na2', f'{m(f"X \\sim \\text{{Bin}}({n_}, {p_})")}. Using the normal approximation, the mean and standard deviation are', f'{dp(mu, 1)} and {dp(sd, 2)}', [f'{dp(mu, 1)} and {dp(sd**2, 2)}', f'{dp(p_, 1)} and {dp(math.sqrt(p_ * (1 - p_) / n_), 2)}', f'{dp(n_ * (1 - p_), 1)} and {dp(sd, 2)}'], m('\\mu = np,\\ \\sigma = \\sqrt{np(1 - p)}'))
for n_, p_ in [(100, 0.3), (400, 0.5), (200, 0.2), (900, 0.1)]:
    sd = math.sqrt(p_ * (1 - p_) / n_)
    add(E, T, 'na1', f'Samples of size {n_} are taken from a population with proportion {m(f"p = {p_}")}. The standard deviation of the sample proportion is', dp(sd, 4), [dp(sd**2, 4), dp(math.sqrt(n_ * p_ * (1 - p_)), 4), dp(p_ / math.sqrt(n_), 4)], m('\\sigma_{\\hat{p}} = \\sqrt{\\frac{p(1-p)}{n}}'))
add(E, T, 'na1', 'As the sample size increases, the distribution of ' + m('\\hat{p}'), 'becomes more normal and less spread out', ['becomes more spread out', 'becomes uniform', 'has a larger mean'], 'Standard deviation falls with ' + m('\\sqrt{n}') + '.')
add(E, T, 'na2', 'The normal approximation to the binomial is reasonable when', m('np \\ge 5') + ' and ' + m('n(1 - p) \\ge 5'), [m('n < 10'), m('p = 0') + ' or ' + m('p = 1'), m('np < 1')], 'Both expected counts should be large enough.')

# ---- Physics: top up the thin topics
PT = [('at', 'Structure of the Atom', [('Cathode rays were shown to be negatively charged particles because they', 'were deflected towards a positive plate', ['travelled in straight lines', 'caused fluorescence', 'had no mass'], 'Deflection by fields showed they were charged particles.'),
                                       ('Millikan\'s oil drop experiment found that', 'charge is quantised in multiples of ' + m('1.6 \\times 10^{-19}') + ' C', ['electrons orbit the nucleus', 'the nucleus is small and dense', 'light is a particle'], 'Every drop had a whole-number multiple of e.'),
                                       ('In Millikan\'s experiment a drop is held stationary when', m('qE = mg'), [m('qvB = mg'), m('qE = 0'), m('mg = 0')], 'Electric force balances weight.'),
                                       ('Chadwick discovered the neutron by showing that radiation from beryllium', 'could knock protons out of paraffin with momentum only a neutral, massive particle could have', ['was deflected by magnetic fields', 'was gamma radiation', 'was made of electrons'], 'Conservation of momentum and energy.'),
                                       ('Thomson\'s "plum pudding" model was replaced because', 'some alpha particles bounced back from gold foil', ['electrons were found to have no charge', 'atoms were found to be indivisible', 'cathode rays were waves'], 'Large deflections needed a dense nucleus.'),
                                       ('A charged particle passes undeflected through crossed E and B fields when', m('v = \\frac{E}{B}'), [m('v = EB'), m('v = \\frac{B}{E}'), m('v = 0')], m('qE = qvB') + '.')]),
      ('da', 'Deep Inside the Atom', [('Protons are made of', 'two up quarks and one down quark', ['one up and two down quarks', 'three up quarks', 'two electrons and a neutrino'], 'uud: charge +2/3 +2/3 −1/3 = +1.'),
                                      ('Neutrons are made of', 'one up quark and two down quarks', ['two up and one down', 'three down quarks', 'an electron and a proton'], 'udd: charge 0.'),
                                      ('The force carrier for the electromagnetic force is the', 'photon', ['gluon', 'W boson', 'Higgs boson'], 'Gluons carry the strong force.'),
                                      ('Leptons include', 'electrons and neutrinos', ['protons and neutrons', 'quarks', 'gluons'], 'Leptons are fundamental and not made of quarks.'),
                                      ('Particle accelerators provide evidence for the Standard Model by', 'colliding particles at high energy to create new particles', ['slowing particles to rest', 'measuring light from stars', 'cooling atoms'], 'E = mc² lets energy become mass.'),
                                      ('Hadrons are particles made of', 'quarks', ['leptons', 'photons', 'neutrinos'], 'Baryons (3 quarks) and mesons (quark–antiquark).')]),
      ('es', 'Electromagnetic Spectrum', [('All electromagnetic waves travel in a vacuum at', m('3.00 \\times 10^8') + ' m/s', [m('3.00 \\times 10^6') + ' m/s', '340 m/s', 'speeds that depend on frequency'], 'c is the same for all EM waves.'),
                                         ('The frequency of light of wavelength 500 nm is', m('6.0 \\times 10^{14}') + ' Hz', [m('1.5 \\times 10^{17}') + ' Hz', m('6.0 \\times 10^{12}') + ' Hz', m('1.7 \\times 10^{-15}') + ' Hz'], m('f = \\frac{c}{\\lambda}')),
                                         ('Absorption lines in a star\'s spectrum show', 'which elements are in its outer layers', ['its distance', 'its age directly', 'its mass'], 'Each element absorbs specific wavelengths.'),
                                         ('Maxwell predicted electromagnetic waves are produced by', 'accelerating charges', ['stationary charges', 'steady currents only', 'magnets at rest'], 'Changing fields propagate as waves.'),
                                         ('Hertz confirmed Maxwell\'s prediction by', 'producing and detecting radio waves', ['measuring the speed of sound', 'splitting white light', 'discovering the electron'], 'He also measured their speed.'),
                                         ('A red shift in a galaxy\'s spectrum shows it is', 'moving away from us', ['moving towards us', 'hotter than the Sun', 'made of hydrogen only'], 'Wavelengths are stretched.')]),
      ('oe', 'Origins of the Elements', [('Most of the hydrogen and helium in the universe was made', 'in the first few minutes after the Big Bang', ['in supernovae', 'in red giants', 'in planets'], 'Big Bang nucleosynthesis.'),
                                        ('Main sequence stars produce energy by', 'fusing hydrogen into helium', ['fission of uranium', 'burning carbon chemically', 'gravitational collapse only'], 'The proton–proton chain or CNO cycle.'),
                                        ('Elements heavier than iron are mainly made in', 'supernovae and neutron star mergers', ['main sequence stars', 'the Big Bang', 'red dwarfs'], 'Fusion beyond iron absorbs energy.'),
                                        ('Hubble\'s law states that', 'galaxies recede at speeds proportional to their distance', ['all galaxies move towards us', 'stars are all the same age', 'light slows down over distance'], m('v = H_0d')),
                                        ('Cosmic microwave background radiation is evidence for', 'the Big Bang', ['steady state theory', 'black holes', 'the solar wind'], 'Leftover radiation from the early universe.'),
                                        ('On the H–R diagram, white dwarfs are', 'hot but dim, at the lower left', ['cool and bright, upper right', 'on the main sequence', 'hot and very bright'], 'Small surface area makes them dim.')]),
      ('qa', 'Quantum Mechanical Nature of the Atom', [('In the Bohr model, an electron emits a photon when it', 'drops to a lower energy level', ['moves to a higher level', 'stays in the same orbit', 'leaves the atom'], m('E = hf = E_i - E_f')),
                                                      ('De Broglie proposed that', 'particles such as electrons have wave properties', ['light has no energy', 'electrons orbit in ellipses', 'atoms are indivisible'], m('\\lambda = \\frac{h}{mv}')),
                                                      ('Evidence for electron waves came from', 'electron diffraction patterns', ['the photoelectric effect', 'alpha scattering', 'cathode ray deflection'], 'Davisson–Germer experiment.'),
                                                      ('The Balmer series of hydrogen lines involves transitions to', m('n = 2'), [m('n = 1'), m('n = 3'), m('n = \\infty')], 'Lyman ends at n = 1, Paschen at n = 3.'),
                                                      ('Schrödinger\'s model describes electrons as', 'probability clouds (orbitals) rather than fixed orbits', ['particles in fixed circular orbits', 'stationary in the nucleus', 'pure light waves'], 'The wave function gives where an electron is likely to be.'),
                                                      ('A limitation of the Bohr model is that it', 'works only for hydrogen-like atoms', ['predicts no spectral lines', 'has no energy levels', 'ignores electrons'], 'It fails for multi-electron atoms.')])]
TAGS = {'at': [1, 2, 2, 4, 3, 1], 'da': [1, 1, 1, 1, 2, 1], 'es': [2, 2, 3, 1, 1, 3], 'oe': [1, 3, 3, 1, 1, 2], 'qa': [1, 3, 3, 2, 4, 4]}
for step, T, qs in PT:
    for i, (q_, a_, w, why) in enumerate(qs): add(P, T, f'{step}{TAGS[step][i]}', q_, a_, w, why)

for B_ in (A, E, P): B_.save()
