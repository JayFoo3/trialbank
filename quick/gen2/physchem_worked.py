"""Written and extended quick questions for Physics and Chemistry: calculations with numbers worked out here,
plus explain/describe questions (typed answers allowed)."""
import math, random
from lib import Bank
from mathlib import dp, m

R = random.Random(2026112)
P = Bank('quick-physics', 'phys', typed=False, seed=31)
C = Bank('quick-chem', 'chem', typed=False, seed=32)
PT = {'pm': 'Projectile Motion', 'cm': 'Circular Motion', 'mg': 'Motion in Gravitational Fields', 'cf': 'Charged Particles, Conductors and Fields', 'me': 'The Motor Effect',
      'ei': 'Electromagnetic Induction', 'am': 'Applications of the Motor Effect', 'es': 'Electromagnetic Spectrum', 'lw': 'Light: Wave Model', 'lq': 'Light: Quantum Model',
      'sr': 'Light and Special Relativity', 'oe': 'Origins of the Elements', 'at': 'Structure of the Atom', 'qa': 'Quantum Mechanical Nature of the Atom', 'pn': 'Properties of the Nucleus', 'da': 'Deep Inside the Atom'}
CT = {'sde': 'Static and Dynamic Equilibrium', 'fae': 'Factors that Affect Equilibrium', 'kq': 'Calculating the Equilibrium Constant (Keq)', 'sq': 'Solution Equilibria',
      'pab': 'Properties of Acids and Bases', 'bl': 'Using Brønsted–Lowry Theory', 'qan': 'Quantitative Analysis', 'nm': 'Nomenclature', 'hc': 'Hydrocarbons',
      'prh': 'Products of Reactions Involving Hydrocarbons', 'al': 'Alcohols', 'oab': 'Reactions of Organic Acids and Bases', 'po': 'Polymers',
      'ai': 'Analysis of Inorganic Substances', 'ao': 'Analysis of Organic Substances', 'csd': 'Chemical Synthesis and Design'}
def p(step, marks, prompt, lines, crit, typed=False): P.W(PT[step.rstrip('0123456789')], marks, prompt, lines, crit, step=step, typed=typed)
def c(step, marks, prompt, lines, crit, typed=False): C.W(CT[step.rstrip('0123456789')], marks, prompt, lines, crit, step=step, typed=typed)
def sci(v, s=3):
    e = int(math.floor(math.log10(abs(v)))); mnt = v / 10**e
    return f'{mnt:.{s-1}f} \\times 10^{{{e}}}'
CALC2 = [('Correct substitution and answer with units', 2), ('Correct equation and substitution, or answer without working', 1)]
CALC3 = [('Correct answer with full working and units', 3), ('Correct method with one error', 2), ('Correct equation or first step', 1)]
g = 9.8

# ---------------- Physics ----------------
for _ in range(5):
    h, u = R.choice([20, 45, 1.2, 80, 5]), R.choice([4, 6, 12, 15, 25])
    tt = math.sqrt(2 * h / g); rng = u * tt; vy = g * tt; vv = math.hypot(u, vy); ang = math.degrees(math.atan(vy / u))
    p('pm2', 4, f'A ball is thrown horizontally at {u} m/s from the top of a {h} m cliff. Ignoring air resistance, find (a) the time to reach the ground, (b) the horizontal distance travelled, (c) the speed it lands at.',
      [m(f's_y = u_yt + \\tfrac{{1}}{{2}}a_yt^2:\\ {h} = \\tfrac{{1}}{{2}}(9.8)t^2 \\Rightarrow t = {dp(tt)}') + ' s', m(f's_x = u_xt = {u} \\times {dp(tt)} = {dp(rng)}') + ' m',
       m(f'v_y = a_yt = 9.8 \\times {dp(tt)} = {dp(vy)}') + ' m/s, ' + m(f'v = \\sqrt{{{u}^2 + {dp(vy)}^2}} = {dp(vv)}') + f' m/s at {dp(ang, 0)}° below the horizontal'],
      [('All three correct with working', 4), ('Two parts correct', 3), ('Time correct', 2), ('Separates horizontal and vertical motion', 1)])
for _ in range(4):
    u, th = R.choice([15, 20, 25, 30]), R.choice([30, 40, 50, 60])
    ux, uy = u * math.cos(math.radians(th)), u * math.sin(math.radians(th)); T = 2 * uy / g; H = uy**2 / (2 * g)
    p('pm3', 3, f'A projectile is launched at {u} m/s at {th}° above the horizontal from level ground. Find its time of flight, maximum height and range.',
      [m(f'u_x = {u}\\cos {th}^\\circ = {dp(ux)},\\ u_y = {u}\\sin {th}^\\circ = {dp(uy)}') + ' m/s', m(f't = \\frac{{2u_y}}{{g}} = {dp(T)}') + ' s', m(f'H = \\frac{{u_y^2}}{{2g}} = {dp(H)}') + ' m', m(f'R = u_xt = {dp(ux * T)}') + ' m'],
      [('All three correct with working', 3), ('Two correct', 2), ('Correct components', 1)])
for _ in range(4):
    mm, r_, T_ = R.choice([0.5, 1.2, 1200, 60]), R.choice([0.8, 2, 50, 15]), R.choice([0.5, 2, 12, 4])
    v = 2 * math.pi * r_ / T_; F = mm * v**2 / r_
    p('cm2', 3, f'An object of mass {mm} kg moves in a horizontal circle of radius {r_} m, completing one revolution every {T_} s. Find its speed and the centripetal force acting on it.',
      [m(f'v = \\frac{{2\\pi r}}{{T}} = \\frac{{2\\pi({r_})}}{{{T_}}} = {dp(v)}') + ' m/s', m(f'F = \\frac{{mv^2}}{{r}} = \\frac{{{mm}({dp(v)})^2}}{{{r_}}} = {dp(F)}') + ' N, towards the centre'], CALC3)
for _ in range(4):
    h_km = R.choice([400, 800, 2000, 35786]); r = 6.37e6 + h_km * 1e3; GM = 6.67e-11 * 5.97e24
    v = math.sqrt(GM / r); T = 2 * math.pi * r / v
    p('mg2', 3, f'A satellite orbits {h_km} km above Earth\'s surface. Find its orbital speed and period. (Earth: mass {m("5.97 \\times 10^{24}")} kg, radius {m("6.37 \\times 10^{6}")} m)',
      [m(f'r = 6.37 \\times 10^6 + {h_km} \\times 10^3 = {sci(r)}') + ' m', m(f'v = \\sqrt{{\\frac{{GM}}{{r}}}} = {sci(v)}') + ' m/s', m(f'T = \\frac{{2\\pi r}}{{v}} = {sci(T)}') + f' s (about {dp(T/3600, 1)} hours)'],
      [('Correct radius, speed and period', 3), ('Two correct', 2), ('Adds Earth\'s radius to the altitude', 1)])
for _ in range(4):
    V, d = R.choice([200, 500, 1000, 50]), R.choice([0.02, 0.05, 0.1, 0.004])
    E = V / d; Fe = 1.602e-19 * E
    p('cf1', 2, f'Two parallel plates {d} m apart have a potential difference of {V} V. Find the electric field strength and the force on an electron between them.',
      [m(f'E = \\frac{{V}}{{d}} = \\frac{{{V}}}{{{d}}} = {sci(E)}') + ' V/m', m(f'F = qE = 1.602 \\times 10^{{-19}} \\times {sci(E)} = {sci(Fe)}') + ' N (towards the positive plate)'], CALC2)
for _ in range(4):
    v, B = R.choice([2e6, 5e6, 3e5, 8e6]), R.choice([0.01, 0.05, 0.2, 0.5])
    r_ = 9.109e-31 * v / (1.602e-19 * B)
    p('cf4', 2, f'An electron moves at {m(sci(v, 2))} m/s perpendicular to a uniform magnetic field of {B} T. Find the radius of its circular path.',
      [m('qvB = \\frac{mv^2}{r} \\Rightarrow r = \\frac{mv}{qB}'), m(f'r = \\frac{{9.109 \\times 10^{{-31}} \\times {sci(v, 2)}}}{{1.602 \\times 10^{{-19}} \\times {B}}} = {sci(r_)}') + ' m'], CALC2)
for _ in range(4):
    l, I, B, th = R.choice([0.2, 0.5, 0.15]), R.choice([2, 3.5, 6, 10]), R.choice([0.1, 0.4, 0.8]), R.choice([90, 30, 60])
    F = l * I * B * math.sin(math.radians(th))
    p('me1', 2, f'A {l} m wire carries {I} A at {th}° to a {B} T magnetic field. Find the force on the wire.',
      [m(f'F = lIB\\sin\\theta = {l} \\times {I} \\times {B} \\times \\sin {th}^\\circ'), m(f'F = {dp(F, 3)}') + ' N'], CALC2)
for _ in range(4):
    Vp, Np, Ns, Ip = R.choice([240, 11000, 120]), R.choice([1000, 500, 2000]), R.choice([50, 100, 4000, 25]), R.choice([0.5, 2, 1.2])
    Vs = Vp * Ns / Np; Is = Ip * Np / Ns
    p('ei4', 3, f'An ideal transformer has {Np} turns on the primary and {Ns} turns on the secondary. The primary voltage is {Vp} V and the primary current is {Ip} A. Find the secondary voltage and current, and state whether it is step-up or step-down.',
      [m(f'\\frac{{V_s}}{{V_p}} = \\frac{{N_s}}{{N_p}} \\Rightarrow V_s = {Vp} \\times \\frac{{{Ns}}}{{{Np}}} = {dp(Vs, 1)}') + ' V', m(f'V_pI_p = V_sI_s \\Rightarrow I_s = \\frac{{{Vp} \\times {Ip}}}{{{dp(Vs, 1)}}} = {dp(Is, 3)}') + ' A',
       ('Step-up' if Ns > Np else 'Step-down') + ' transformer, since the secondary has ' + ('more' if Ns > Np else 'fewer') + ' turns.'], [('Both values and the type correct', 3), ('Two correct', 2), ('One correct', 1)])
for _ in range(8):
    lam, wf = R.choice([200, 250, 300, 350]), R.choice([2.3, 4.3, 4.7, 2.1])
    Ep = 6.626e-34 * 3e8 / (lam * 1e-9) / 1.602e-19; K = Ep - wf
    if K < 0.2: continue
    p('lq3', 3, f'Light of wavelength {lam} nm falls on a metal with work function {wf} eV. Find the maximum kinetic energy of the emitted photoelectrons in eV.',
      [m(f'E = \\frac{{hc}}{{\\lambda}} = \\frac{{6.626 \\times 10^{{-34}} \\times 3.00 \\times 10^8}}{{{lam} \\times 10^{{-9}}}} = {sci(Ep * 1.602e-19)}') + ' J ' + m(f'= {dp(Ep)}') + ' eV',
       m(f'K_{{max}} = hf - \\phi = {dp(Ep)} - {wf} = {dp(K)}') + ' eV' + ('' if K > 0 else ' (negative, so no electrons are emitted)')], CALC3)
for _ in range(4):
    v, t0 = R.choice([0.6, 0.8, 0.9, 0.95, 0.99]), R.choice([2.2e-6, 10, 5, 1])
    gam = 1 / math.sqrt(1 - v**2)
    p('sr2', 2, f'A clock moving at {v}c records {t0 if t0 >= 1 else "2.2 μ"}{"" if t0 < 1 else " "}s. How long does this take as measured by a stationary observer?',
      [m(f't = \\frac{{t_0}}{{\\sqrt{{1 - v^2/c^2}}}} = \\frac{{{t0 if t0 >= 1 else "2.2 \\times 10^{-6}"}}}{{\\sqrt{{1 - {v}^2}}}}'), m(f't = {dp(gam * t0, 3) if t0 >= 1 else sci(gam * t0)}') + ' s'], CALC2)
for _ in range(3):
    mm_, v = R.choice([9.109e-31, 1.673e-27]), R.choice([2e6, 5e5, 1e7])
    lam = 6.626e-34 / (mm_ * v)
    p('qa3', 2, f'Find the de Broglie wavelength of {"an electron" if mm_ < 1e-29 else "a proton"} moving at {m(sci(v, 2))} m/s.',
      [m(f'\\lambda = \\frac{{h}}{{mv}} = \\frac{{6.626 \\times 10^{{-34}}}}{{{sci(mm_, 4)} \\times {sci(v, 2)}}}'), m(f'\\lambda = {sci(lam)}') + ' m'], CALC2)
for ni, nf in [(3, 2), (4, 2), (5, 2), (2, 1), (4, 3)]:
    inv = 1.097e7 * (1 / nf**2 - 1 / ni**2); lam = 1 / inv
    p('qa2', 2, f'Use the Rydberg equation to find the wavelength of light emitted when an electron in hydrogen falls from {m(f"n = {ni}")} to {m(f"n = {nf}")}.',
      [m(f'\\frac{{1}}{{\\lambda}} = R\\left(\\frac{{1}}{{{nf}^2}} - \\frac{{1}}{{{ni}^2}}\\right) = 1.097 \\times 10^7 \\times {dp(1 / nf**2 - 1 / ni**2, 4)}'), m(f'\\lambda = {sci(lam)}') + f' m ({dp(lam * 1e9, 0)} nm)'], CALC2)
for _ in range(4):
    N0, th, tt = R.choice([800, 64, 5000, 1.2]), R.choice([5, 8, 30, 2]), R.choice([3, 2.5, 4, 1.5])
    t_ = th * tt; N = N0 * math.exp(-math.log(2) / th * t_)
    p('pn2', 2, f'A sample contains {N0} g of a radioisotope with a half-life of {th} days. How much remains after {dp(t_, 1)} days?',
      [m(f'\\lambda = \\frac{{\\ln 2}}{{{th}}},\\quad N = N_0e^{{-\\lambda t}} = {N0}e^{{-\\frac{{\\ln 2}}{{{th}}} \\times {dp(t_, 1)}}}'), m(f'N = {dp(N, 3)}') + ' g'], CALC2)
p('pn3', 3, 'Find the binding energy, in MeV, of a helium-4 nucleus. (Mass of He-4 nucleus 4.001506 u, proton 1.007276 u, neutron 1.008665 u, 1 u = 931.5 MeV/c²)',
  [m('\\Delta m = 2(1.007276) + 2(1.008665) - 4.001506 = 0.030376') + ' u', m('E = 0.030376 \\times 931.5 = 28.3') + ' MeV'], CALC3)
for lam, d, mo in [(600, 2e-6, 1), (500, 1.5e-6, 2), (650, 3.3e-6, 1), (450, 2.5e-6, 2)]:
    th = math.degrees(math.asin(mo * lam * 1e-9 / d))
    p('lw2', 2, f'Light of wavelength {lam} nm passes through a diffraction grating with slit spacing {m(sci(d, 2))} m. Find the angle of the order-{mo} maximum.',
      [m(f'd\\sin\\theta = m\\lambda \\Rightarrow \\sin\\theta = \\frac{{{mo} \\times {lam} \\times 10^{{-9}}}}{{{sci(d, 2)}}}'), m(f'\\theta = {dp(th, 1)}^\\circ')], CALC2)
# explanations (typed)
EXP = [('pm6', 2, 'Explain why the horizontal velocity of a projectile stays constant (ignoring air resistance).', ['The only force acting is gravity, which acts vertically downwards.', 'There is no horizontal force, so there is no horizontal acceleration and the horizontal velocity is constant.']),
       ('cm3', 3, 'Explain how a banked track allows a car to turn a corner without relying on friction.', ['On a banked track the normal force is tilted towards the centre of the curve.', 'The horizontal component of the normal force provides the centripetal force needed to turn.', 'At the design speed, ' + m('\\tan\\theta = \\frac{v^2}{rg}') + ', so no friction is needed.']),
       ('mg4', 3, 'Explain why a geostationary satellite must orbit at a particular altitude above the equator.', ['It must have a period of 24 hours, the same as Earth\'s rotation, so it stays above one point.', 'By Kepler\'s third law, ' + m('\\frac{r^3}{T^2} = \\frac{GM}{4\\pi^2}') + ', so a fixed period gives a fixed orbital radius (about 42 000 km from Earth\'s centre).', 'It must be above the equator so its orbit is centred on Earth\'s axis and it moves in the same direction as the surface.']),
       ('ei3', 3, 'A magnet is dropped through a copper tube. Explain why it falls more slowly than through a plastic tube.', ['As the magnet falls, the magnetic flux through each part of the copper tube changes, inducing an emf and eddy currents (Faraday\'s law).', 'By Lenz\'s law, the eddy currents create magnetic fields that oppose the change in flux, which means they oppose the magnet\'s motion.', 'Plastic is an insulator, so no currents are induced and the magnet falls freely.']),
       ('am1', 3, 'Explain the purpose of the split-ring commutator in a DC motor.', ['The commutator reverses the direction of current in the coil every half turn.', 'This keeps the torque on the coil acting in the same rotational direction.', 'Without it, the torque would reverse every half turn and the coil would just oscillate.']),
       ('am1', 2, 'Explain the cause of back emf in a DC motor.', ['As the coil rotates in the magnetic field, the flux through it changes, inducing an emf (Faraday\'s law).', 'By Lenz\'s law this emf opposes the supply emf, reducing the current as the motor speeds up.']),
       ('lw4', 3, 'Explain how Young\'s double-slit experiment supported the wave model of light.', ['Light passing through two narrow slits produced a pattern of bright and dark bands.', 'This is explained by diffraction and interference: where waves meet in phase they reinforce (bright), and out of phase they cancel (dark).', 'Particles would only make two bright bands, so the pattern supported the wave model over Newton\'s corpuscular model.']),
       ('lq3', 3, 'Explain why the photoelectric effect could not be explained by the wave model of light.', ['The wave model predicted that any frequency of light would eject electrons if bright enough, and that brighter light would give more energetic electrons.', 'In fact there is a threshold frequency below which no electrons are emitted, however bright the light, and electron energy depends on frequency, not intensity.', 'Einstein explained this with photons of energy ' + m('E = hf') + ': one photon gives its energy to one electron.']),
       ('sr5', 3, 'Explain how the detection of muons at Earth\'s surface supports special relativity.', ['Muons are made in the upper atmosphere and have a half-life of about 2.2 μs, so at nearly the speed of light most should decay within about 660 m.', 'Many more reach the surface than expected because, in Earth\'s frame, their time is dilated, so they live longer.', 'In the muon\'s frame the atmosphere is length-contracted. Both effects match the measured numbers.']),
       ('at3', 3, 'Describe Rutherford\'s gold foil experiment and what it showed about the atom.', ['Alpha particles were fired at a thin gold foil and their deflections were detected on a fluorescent screen.', 'Most went straight through, so the atom is mostly empty space.', 'A few were deflected through large angles, so the positive charge and almost all the mass are concentrated in a tiny nucleus.']),
       ('at1', 2, 'Outline how Thomson determined the charge-to-mass ratio of the electron.', ['Cathode rays were passed through perpendicular electric and magnetic fields adjusted so there was no deflection, giving ' + m('v = \\frac{E}{B}') + '.', 'With the electric field removed, the radius of the circular path in the magnetic field gave ' + m('\\frac{q}{m} = \\frac{v}{Br}') + '.']),
       ('qa4', 3, 'Outline the limitations of the Bohr model of the atom.', ['It only works for hydrogen (single-electron atoms).', 'It could not explain the different intensities of spectral lines or the splitting of lines (hyperfine structure, Zeeman effect).', 'It mixed classical and quantum ideas without explaining why electrons in fixed orbits do not radiate energy.']),
       ('oe2', 2, 'Describe what the Hertzsprung–Russell diagram shows.', ['It plots stars\' luminosity (absolute magnitude) against surface temperature (or spectral class), with temperature decreasing to the right.', 'It shows groups such as the main sequence, red giants and white dwarfs, which correspond to stages in a star\'s life.']),
       ('oe1', 2, 'Outline the evidence that the universe is expanding.', ['Light from distant galaxies is red-shifted, showing they are moving away.', 'Hubble found that recession speed is proportional to distance (' + m('v = H_0d') + '), which is what expansion of space predicts.']),
       ('da1', 2, 'Outline the main groups of particles in the Standard Model.', ['Fermions: six quarks (which make hadrons such as protons and neutrons) and six leptons (such as the electron and neutrinos).', 'Bosons: the force carriers (photon, gluon, W and Z) and the Higgs boson.']),
       ('es1', 2, 'Outline Maxwell\'s contribution to the understanding of light.', ['Maxwell unified electricity and magnetism and predicted that changing electric and magnetic fields travel as electromagnetic waves.', 'His predicted wave speed equalled the measured speed of light, showing light is an electromagnetic wave.']),
       ('me2', 2, 'Two parallel wires carry currents in the same direction. Explain why they attract each other.', ['Each current creates a magnetic field around its wire that the other wire sits in.', 'Using the right-hand rule, the force on each current-carrying wire in the other\'s field points towards the other wire, so they attract.'])]
for st, mk, q, lines in EXP:
    crit = [(f'Explains all key points clearly with correct physics', mk)] + [(['Identifies a relevant point', 'Describes most points with some explanation'][i], i + 1) for i in range(mk - 1)][::-1]
    p(st, mk, q, lines, sorted(crit, key=lambda z: -z[1]), typed=True)

# ---------------- Chemistry ----------------
for _ in range(5):
    a0, b0, x_ = R.choice([1.0, 2.0, 0.5, 1.5]), R.choice([1.0, 2.0, 0.8, 1.5]), None
    x_ = round(min(a0, b0) * R.choice([0.3, 0.4, 0.6]), 2)
    K = (2 * x_)**2 / ((a0 - x_) * (b0 - x_))
    c('kq3', 3, f'{a0} mol of {m("H_2")} and {b0} mol of {m("I_2")} are placed in a 1.0 L container and reach equilibrium: {m("H_2(g) + I_2(g) \\rightleftharpoons 2HI(g)")}. At equilibrium there is {dp(2*x_)} mol of HI. Calculate Keq.',
      [m(f'\\text{{Change: }} HI\\ +{dp(2*x_)},\\ H_2\\ -{dp(x_)},\\ I_2\\ -{dp(x_)}'), m(f'[H_2] = {dp(a0 - x_)},\\ [I_2] = {dp(b0 - x_)},\\ [HI] = {dp(2*x_)}') + ' mol/L', m(f'K_{{eq}} = \\frac{{[HI]^2}}{{[H_2][I_2]}} = \\frac{{({dp(2*x_)})^2}}{{({dp(a0 - x_)})({dp(b0 - x_)})}} = {dp(K)}')],
      [('Correct ICE table and Keq', 3), ('Correct equilibrium concentrations', 2), ('Correct Keq expression or mole ratio', 1)])
for salt, expr, nions, Ksp in [('AgCl', '[Ag^+][Cl^-]', (1, 1), 1.77e-10), ('BaSO_4', '[Ba^{2+}][SO_4^{2-}]', (1, 1), 1.08e-10), ('PbI_2', '[Pb^{2+}][I^-]^2', (1, 2), 9.8e-9), ('Ca(OH)_2', '[Ca^{2+}][OH^-]^2', (1, 2), 5.02e-6), ('CaF_2', '[Ca^{2+}][F^-]^2', (1, 2), 3.45e-11)]:
    s = (Ksp / (nions[0]**nions[0] * nions[1]**nions[1]))**(1 / sum(nions))
    form = 's^2' if nions == (1, 1) else '4s^3'
    c('sq3', 2, f'The Ksp of {m(salt)} at 25°C is {m(sci(Ksp))}. Calculate its molar solubility.',
      [m(f'K_{{sp}} = {expr} = {form}'), m(f's = {sci(s)}') + ' mol/L'], CALC2)
for _ in range(5):
    conc = R.choice([0.01, 0.05, 0.002, 0.25]); kind = R.choice(['HCl', 'NaOH', 'Ba(OH)_2', 'HNO_3'])
    if kind in ('HCl', 'HNO_3'): pH = -math.log10(conc); work = [m(f'[H^+] = {conc}') + ' mol/L', m(f'pH = -\\log_{{10}}({conc}) = {dp(pH)}')]
    else:
        oh = conc * (2 if kind == 'Ba(OH)_2' else 1); pOH = -math.log10(oh); pH = 14 - pOH
        work = [m(f'[OH^-] = {dp(oh, 3)}') + ' mol/L', m(f'pOH = -\\log_{{10}}({dp(oh, 3)}) = {dp(pOH)}'), m(f'pH = 14 - {dp(pOH)} = {dp(pH)}')]
    c('bl2', 2, f'Calculate the pH of a {conc} mol/L solution of {m(kind)} at 25°C.', work, CALC2)
for acid, Ka in [('CH_3COOH', 1.8e-5), ('HCOOH', 1.8e-4), ('HF', 6.8e-4), ('HOCl', 3.0e-8)]:
    conc = R.choice([0.1, 0.05, 0.2]); h = math.sqrt(Ka * conc)
    c('bl4', 3, f'Calculate the pH of a {conc} mol/L solution of {m(acid)} ({m(f"K_a = {sci(Ka, 2)}")}). Assume the amount that ionises is small.',
      [m(f'K_a = \\frac{{[H^+][A^-]}}{{[HA]}} \\approx \\frac{{x^2}}{{{conc}}}'), m(f'x = [H^+] = \\sqrt{{{sci(Ka, 2)} \\times {conc}}} = {sci(h)}') + ' mol/L', m(f'pH = -\\log_{{10}}({sci(h)}) = {dp(-math.log10(h))}')], CALC3)
for _ in range(6):
    vb, cb, va = R.choice([20.0, 25.0]), R.choice([0.100, 0.150, 0.0985]), R.choice([18.45, 21.30, 24.85, 16.70])
    acid = R.choice([('HCl', 1), ('H_2SO_4', 2)]); nb = cb * vb / 1000; na = nb / acid[1]; ca = na / (va / 1000)
    c('qan1', 3, f'{va} mL of {m(acid[0])} was needed to neutralise {vb} mL of {cb} mol/L NaOH. Calculate the concentration of the acid.',
      [m(f'n(NaOH) = {cb} \\times {vb/1000} = {sci(nb, 4)}') + ' mol', m(f'n({acid[0]}) = ' + (f'{sci(nb, 4)}' if acid[1] == 1 else f'\\frac{{1}}{{2}} \\times {sci(nb, 4)} = {sci(na, 4)}')) + ' mol' + (' (1:1 ratio)' if acid[1] == 1 else ' (1:2 ratio)'),
       m(f'c = \\frac{{n}}{{V}} = \\frac{{{sci(na, 4)}}}{{{va/1000}}} = {dp(ca, 4)}') + ' mol/L'],
      [('Correct moles, ratio and concentration', 3), ('Correct moles of base and acid', 2), ('Correct moles of NaOH or balanced equation', 1)])
for alc, M_, dH in [('ethanol', 46.07, 1367), ('methanol', 32.04, 726), ('propan-1-ol', 60.10, 2021), ('butan-1-ol', 74.12, 2676)]:
    mw, dT = R.choice([150, 200, 250]), R.choice([18.5, 22.0, 25.4]); q = mw * 4.18 * dT; mass = round(q / 1000 / dH * M_ * R.choice([1.6, 1.8, 2.0]), 2)
    exp_dH = q / 1000 / (mass / M_)
    c('al2', 3, f'Burning {dp(mass)} g of {alc} heated {mw} g of water by {dT}°C. Calculate the experimental molar enthalpy of combustion of {alc} (M = {M_} g/mol).',
      [m(f'q = mc\\Delta T = {mw} \\times 4.18 \\times {dT} = {dp(q, 0)}') + ' J', m(f'n = \\frac{{{dp(mass)}}}{{{M_}}} = {dp(mass/M_, 4)}') + ' mol', m(f'\\Delta H = -\\frac{{{dp(q/1000, 3)}}}{{{dp(mass/M_, 4)}}} = -{dp(exp_dH, 0)}') + ' kJ/mol (negative, as combustion is exothermic)'],
      [('Correct q, moles and ΔH with negative sign', 3), ('Correct q and moles', 2), ('Correct q', 1)])
for _ in range(4):
    mp, Mp, frac = R.choice([0.856, 1.240, 0.512]), 233.4, R.choice([('BaSO_4', 'sulfate', 96.07)])
    ms = R.choice([2.50, 3.00, 1.80])
    c('ai2', 3, f'A {ms} g fertiliser sample was dissolved and excess {m("BaCl_2")} added. The dried {m("BaSO_4")} precipitate weighed {mp} g. Calculate the percentage by mass of sulfate in the fertiliser.',
      [m(f'n(BaSO_4) = \\frac{{{mp}}}{{233.4}} = {sci(mp/Mp, 4)}') + ' mol', m(f'm(SO_4^{{2-}}) = {sci(mp/Mp, 4)} \\times 96.07 = {dp(mp/Mp*96.07, 4)}') + ' g', m(f'\\% = \\frac{{{dp(mp/Mp*96.07, 4)}}}{{{ms}}} \\times 100 = {dp(mp/Mp*96.07/ms*100, 1)}\\%')],
      [('Correct moles, mass and percentage', 3), ('Correct moles and mass of sulfate', 2), ('Correct moles of BaSO₄', 1)])
CEXP = [('sde2', 2, 'Explain what is meant by dynamic equilibrium.', ['In a closed system, the forward and reverse reactions continue to occur.', 'They occur at equal rates, so the concentrations of reactants and products stay constant.']),
        ('fae1', 3, 'Using Le Chatelier\'s principle, explain the effect of adding more ' + m('N_2') + ' to the equilibrium ' + m('N_2(g) + 3H_2(g) \\rightleftharpoons 2NH_3(g)') + '.', ['Adding ' + m('N_2') + ' increases its concentration, disturbing the equilibrium.', 'The system shifts to partially counteract the change by using up ' + m('N_2') + ', i.e. the forward reaction is favoured.', 'So ' + m('[NH_3]') + ' increases and ' + m('[H_2]') + ' decreases until a new equilibrium is reached.']),
        ('fae3', 3, 'The reaction ' + m('2NO_2(g) \\rightleftharpoons N_2O_4(g)') + ' has ' + m('\\Delta H < 0') + '. Explain what happens to the colour of the mixture when it is heated (' + m('NO_2') + ' is brown, ' + m('N_2O_4') + ' is colourless).', ['The forward reaction is exothermic, so the reverse reaction is endothermic.', 'Heating favours the endothermic (reverse) reaction to absorb the added heat, by Le Chatelier\'s principle.', 'More ' + m('NO_2') + ' forms, so the mixture becomes darker brown, and Keq decreases.']),
        ('sq5', 2, 'Explain the common ion effect, using the solubility of AgCl in NaCl solution as an example.', ['AgCl dissolves: ' + m('AgCl(s) \\rightleftharpoons Ag^+(aq) + Cl^-(aq)') + '.', 'In NaCl solution, the extra ' + m('Cl^-') + ' shifts the equilibrium to the left, so less AgCl dissolves (lower solubility).']),
        ('bl3', 2, 'Distinguish between a strong acid and a concentrated acid.', ['Strength describes the degree of ionisation: a strong acid ionises completely in water.', 'Concentration describes the amount of acid per litre of solution, so a weak acid can be concentrated and a strong acid can be dilute.']),
        ('bl5', 3, 'Explain how a buffer made from ethanoic acid and sodium ethanoate resists changes in pH.', ['The buffer contains a weak acid and its conjugate base in equilibrium: ' + m('CH_3COOH \\rightleftharpoons CH_3COO^- + H^+') + '.', 'Added ' + m('H^+') + ' reacts with ' + m('CH_3COO^-') + ' to form ' + m('CH_3COOH') + ' (equilibrium shifts left).', 'Added ' + m('OH^-') + ' reacts with ' + m('H^+') + ' or ' + m('CH_3COOH') + ', and more acid ionises (shifts right), so the pH changes very little.']),
        ('qan3', 2, 'Explain why phenolphthalein is suitable for titrating ethanoic acid with sodium hydroxide.', ['At equivalence the solution contains ethanoate ions, which are basic, so the equivalence point is above pH 7 (about 8–9).', 'Phenolphthalein changes colour between pH 8.3 and 10, which matches the steep part of the curve at equivalence.']),
        ('qan2', 2, 'Outline the requirements of a primary standard.', ['It must be very pure, stable (not absorb water or ' + m('CO_2') + ' from the air) and have a known formula.', 'It should have a high molar mass to reduce weighing errors and be soluble in water.']),
        ('hc2', 3, 'Explain why the boiling points of alkanes increase as the chain gets longer.', ['Alkanes are non-polar, so the only forces between molecules are dispersion forces.', 'Longer chains have more electrons and a larger surface area, giving stronger dispersion forces.', 'More energy is needed to separate the molecules, so the boiling point rises.']),
        ('prh3', 2, 'Describe a chemical test to distinguish between hexane and hex-1-ene.', ['Add bromine water to each in the dark (or shake).', 'Hex-1-ene decolourises it quickly (addition across the double bond); hexane does not decolourise it.']),
        ('al3', 3, 'Describe the products of oxidising propan-1-ol and propan-2-ol with acidified potassium dichromate.', ['Propan-1-ol is a primary alcohol: it is oxidised to propanal and then to propanoic acid.', 'Propan-2-ol is a secondary alcohol: it is oxidised to propanone (a ketone).', 'In both, the dichromate changes colour from orange to green.']),
        ('oab2', 3, 'Explain why esterification is carried out under reflux with concentrated sulfuric acid.', ['The reaction is slow, so it is heated to increase the rate; reflux condenses the volatile reactants and products so they are not lost.', 'Concentrated sulfuric acid acts as a catalyst.', 'It also absorbs water, shifting the equilibrium towards the ester and increasing the yield.']),
        ('oab3', 3, 'Explain how soap removes grease from fabric.', ['A soap anion has a long non-polar hydrocarbon tail and a polar (ionic) head.', 'The tails dissolve in the grease while the heads stay in the water, forming micelles around the grease.', 'The charged micelles repel each other and stay suspended, so the grease is washed away.']),
        ('po2', 2, 'Distinguish between addition and condensation polymerisation.', ['Addition polymers form when monomers with a C=C double bond join, with no other product.', 'Condensation polymers form when monomers with two functional groups join, releasing a small molecule such as water each time.']),
        ('ao2', 2, 'Outline how an infrared spectrum can show that a compound is a carboxylic acid.', ['A very broad O–H absorption between about 2500 and 3000 cm⁻¹.', 'A strong C=O absorption near 1700 cm⁻¹.']),
        ('ao3', 3, 'Predict the ¹H NMR spectrum of ethanol (ignore splitting by the OH proton).', ['Three environments: CH₃, CH₂ and OH, in the ratio 3 : 2 : 1.', 'The CH₃ peak is a triplet (next to CH₂) and the CH₂ peak is a quartet (next to CH₃).', 'The OH peak is a singlet; the CH₂ peak is furthest downfield of the carbon-bound protons because it is next to the oxygen.']),
        ('csd2', 3, 'Explain the conditions chosen for the Haber process.', ['Moderate temperature (about 400–450°C): a lower temperature gives a higher yield (exothermic) but too slow a rate, so a compromise is used, with an iron catalyst.', 'High pressure (about 200 atm) favours the side with fewer gas moles, increasing yield and rate, but very high pressure is too costly and dangerous.', 'Ammonia is removed as it forms and unreacted gases are recycled.'])]
for st, mk, q, lines in CEXP:
    crit = [('Explains all key points clearly with correct chemistry', mk)] + [(['Identifies a relevant point', 'Describes most points with some explanation'][i], i + 1) for i in range(mk - 1)][::-1]
    c(st, mk, q, lines, sorted(crit, key=lambda z: -z[1]), typed=True)

P.save(); C.save()
