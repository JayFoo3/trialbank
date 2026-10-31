"""Quick questions: HSC Physics (Year 12 modules 5-8). Constants from the HSC data sheet.
Calculations are computed here (3 significant figures); concept questions have fixed right answers with common misconceptions as the wrong ones.
Output: quick_phys.json"""
import json, math, random

R = random.Random(20261031 + 23)
g, G, ME, RE = 9.8, 6.67e-11, 6.0e24, 6.371e6
e, me_, h, c, mp = 1.602e-19, 9.109e-31, 6.626e-34, 3.00e8, 1.673e-27


def m(t): return f'\\({t}\\)'


def sci(v, unit=''):
    """3 significant figures; scientific notation outside 0.01 to 10 000"""
    if v == 0: return m('0')
    ex = math.floor(math.log10(abs(v)))
    if -2 <= ex <= 3:
        d = max(0, 2 - ex); s = f'{v:.{d}f}'
    else:
        mant = v / 10 ** ex
        if round(abs(mant), 2) >= 10: mant /= 10; ex += 1
        s = f'{mant:.2f} \\times 10^{{{ex}}}'
    if unit:
        base, _, exp = unit.partition('^')
        s += f'\\text{{ {base}}}' + (f'^{exp}' if exp else '')
    return m(s)


OUT, SEEN = [], set()


def add(step, prompt, right, wrong, why, unit=''):
    """numeric: right and wrong are numbers, shown to 3 s.f."""
    f = lambda v: sci(v, unit)
    opts, keys = [f(right)], {f(right)}
    for w in wrong + [right * 2, right / 2, right * 10, right / 10]:
        if w is None: continue
        s = f(w)
        if s not in keys and len(opts) < 4: opts.append(s); keys.add(s)
    if prompt in SEEN or len(opts) < 4: return
    SEEN.add(prompt)
    order = list(range(4)); R.shuffle(order)
    OUT.append(dict(step=step, prompt=prompt, options=[opts[i] for i in order], answer='ABCD'[order.index(0)], why=why))


def addc(step, prompt, right, wrong, why):
    """concept: plain-text options"""
    opts = [right] + wrong[:3]
    if prompt in SEEN or len(set(opts)) < 4: return
    SEEN.add(prompt)
    order = list(range(4)); R.shuffle(order)
    OUT.append(dict(step=step, prompt=prompt, options=[opts[i] for i in order], answer='ABCD'[order.index(0)], why=why))


# ---------- Projectile motion ----------
for _ in range(60):
    u, a = R.choice([10, 12, 15, 20, 25, 30]), R.choice([20, 30, 37, 45, 53, 60])
    ux, uy = u * math.cos(math.radians(a)), u * math.sin(math.radians(a))
    add('pm1', f'A ball is launched at {m(f"{u}\\text{{ m s}}^{{-1}}")} at {m(f"{a}^\\circ")} above the horizontal. Find the horizontal component of its velocity.', ux, [uy, u, u * math.tan(math.radians(a))], m(f'u_x = {u}\\cos {a}^\\circ'), 'm s^{-1}')
    H = R.choice([5, 10, 20, 45, 80]); v = R.choice([5, 8, 10, 15])
    t = math.sqrt(2 * H / g)
    add('pm2', f'A ball rolls off a {m(H)} m high cliff at {m(f"{v}\\text{{ m s}}^{{-1}}")}. How far from the base does it land? ({m("g = 9.8")})', v * t, [v * 2 * H / g, H * v / g, v * math.sqrt(H / g)], m(f't = \\sqrt{{\\frac{{2({H})}}{{9.8}}}}, \\quad x = {v}t'), 'm')
    add('pm2', f'A ball rolls off a {m(H)} m high cliff. How long does it take to land? ({m("g = 9.8")})', t, [2 * H / g, math.sqrt(H / g), H / g], m(f'{H} = \\frac{{1}}{{2}}(9.8)t^2'), 's')
    T = 2 * uy / g; Rg = ux * T; Hm = uy * uy / (2 * g)
    add('pm3', f'A ball is launched from level ground at {m(f"{u}\\text{{ m s}}^{{-1}}")} at {m(f"{a}^\\circ")}. Find its time of flight. ({m("g = 9.8")})', T, [uy / g, 2 * ux / g, u / g], m(f't = \\frac{{2u\\sin\\theta}}{{g}}'), 's')
    add('pm3', f'A ball is launched from level ground at {m(f"{u}\\text{{ m s}}^{{-1}}")} at {m(f"{a}^\\circ")}. Find its range. ({m("g = 9.8")})', Rg, [Rg / 2, u * T, uy * T], m(f'R = u_x t = {ux:.2f} \\times {T:.2f}'), 'm')
    add('pm3', f'A ball is launched from level ground at {m(f"{u}\\text{{ m s}}^{{-1}}")} at {m(f"{a}^\\circ")}. Find its maximum height. ({m("g = 9.8")})', Hm, [2 * Hm, u * u / (2 * g), ux * ux / (2 * g)], m(f'H = \\frac{{u_y^2}}{{2g}}'), 'm')
addc('pm5', 'At the top of its flight, a projectile\'s velocity is:', 'horizontal, equal to its horizontal component', ['zero', 'vertical, equal to g', 'equal to its launch speed'], 'The vertical velocity is zero at the top; the horizontal velocity never changes.')
addc('pm6', 'Ignoring air resistance, which launch angle gives the greatest range on level ground?', '45°', ['30°', '60°', '90°'], 'Range is proportional to sin 2θ, which is greatest at 2θ = 90°.')
addc('pm6', 'Ignoring air resistance, which pair of launch angles gives the same range?', '30° and 60°', ['30° and 45°', '20° and 40°', '45° and 90°'], 'Complementary angles give the same sin 2θ.')
addc('pm7', 'Adding air resistance to a projectile\'s motion:', 'reduces both its range and maximum height', ['increases its range', 'changes only its vertical motion', 'has no effect on its time of flight'], 'Drag opposes the velocity, so it slows both components.')
addc('pm5', 'The acceleration of a projectile (no air resistance) at any point of its flight is:', '9.8 m s⁻² downwards', ['zero at the top', 'along its velocity', '9.8 m s⁻² upwards on the way up'], 'Gravity is the only force, so the acceleration is always g downwards.')

# ---------- Circular motion ----------
for _ in range(60):
    mass, r, v = R.choice([0.5, 1, 2, 5, 1200, 1500]), R.choice([0.5, 1, 2, 20, 50, 100]), R.choice([2, 4, 5, 10, 15, 20])
    add('cm2', f'An object of mass {m(f"{mass:g}")} kg moves in a circle of radius {m(f"{r:g}")} m at {m(f"{v}\\text{{ m s}}^{{-1}}")}. Find the centripetal force.', mass * v * v / r, [mass * v / r, mass * v * v * r, v * v / r], m(f'F = \\frac{{mv^2}}{{r}}'), 'N')
    add('cm2', f'Find the centripetal acceleration of an object moving at {m(f"{v}\\text{{ m s}}^{{-1}}")} in a circle of radius {m(f"{r:g}")} m.', v * v / r, [v / r, v * v * r, 2 * v / r], m(f'a = \\frac{{v^2}}{{r}}'), 'm s^{-2}')
    T = R.choice([0.5, 1, 2, 4, 10])
    add('cm1', f'An object goes around a circle of radius {m(f"{r:g}")} m once every {m(f"{T:g}")} s. Find its speed.', 2 * math.pi * r / T, [math.pi * r / T, r / T, 2 * math.pi * T / r], m(f'v = \\frac{{2\\pi r}}{{T}}'), 'm s^{-1}')
    add('cm1', f'Find the angular velocity of an object that completes one revolution every {m(f"{T:g}")} s.', 2 * math.pi / T, [1 / T, math.pi / T, 2 * math.pi * T], m(f'\\omega = \\frac{{2\\pi}}{{T}}'), 'rad s^{-1}')
    th = R.choice([10, 15, 20, 30])
    add('cm3', f'A track is banked at {m(f"{th}^\\circ")} with radius {m(f"{r:g}")} m. Find the speed needing no friction. ({m("g = 9.8")})', math.sqrt(r * g * math.tan(math.radians(th))), [math.sqrt(r * g * math.sin(math.radians(th))), r * g * math.tan(math.radians(th)), math.sqrt(r * g)], m(f'\\tan\\theta = \\frac{{v^2}}{{rg}}'), 'm s^{-1}')
    F_, d, ang = R.choice([10, 20, 50]), R.choice([0.2, 0.3, 0.5]), R.choice([30, 60, 90])
    add('cm4', f'A {m(F_)} N force acts {m(f"{d:g}")} m from a pivot at {m(f"{ang}^\\circ")} to the lever. Find the torque.', F_ * d * math.sin(math.radians(ang)), [F_ * d, F_ * d * math.cos(math.radians(ang)) if ang != 90 else F_ / d, F_ / d], m(f'\\tau = rF\\sin\\theta'), 'N m')
addc('cm2', 'For an object in uniform circular motion, the net force points:', 'towards the centre', ['along the velocity', 'away from the centre', 'there is no net force'], 'The net (centripetal) force always points to the centre.')
addc('cm4', 'The work done by the centripetal force on an object in uniform circular motion is:', 'zero, because the force is perpendicular to the motion', ['positive', 'negative', 'equal to its kinetic energy'], 'Work needs a force component along the displacement.')

# ---------- Gravitational fields ----------
for _ in range(60):
    hk = R.choice([200, 400, 800, 2000, 20000, 35800])
    r = RE + hk * 1000
    add('mg1', f'Find the gravitational field strength {m(hk)} km above Earth\'s surface. ({m("M_E = 6.0 \\times 10^{24}")} kg, {m("r_E = 6.371 \\times 10^6")} m)', G * ME / r ** 2, [G * ME / (hk * 1000) ** 2, G * ME / r, 9.8], m('g = \\frac{GM}{r^2}'), 'N kg^{-1}')
    add('mg2', f'Find the orbital speed of a satellite {m(hk)} km above Earth.', math.sqrt(G * ME / r), [math.sqrt(2 * G * ME / r), math.sqrt(G * ME / (hk * 1000)), G * ME / r ** 2 * r], m('v = \\sqrt{\\frac{GM}{r}}'), 'm s^{-1}')
    add('mg2', f'Find the period of a satellite orbiting {m(hk)} km above Earth.', 2 * math.pi * math.sqrt(r ** 3 / (G * ME)), [2 * math.pi * r / math.sqrt(2 * G * ME / r), math.sqrt(r ** 3 / (G * ME)), 2 * math.pi * r ** 1.5], m('\\frac{r^3}{T^2} = \\frac{GM}{4\\pi^2}'), 's')
    ms = R.choice([500, 1000, 2000])
    add('mg3', f'Find the gravitational potential energy of a {m(ms)} kg satellite {m(hk)} km above Earth.', -G * ME * ms / r, [G * ME * ms / r, -G * ME * ms / r ** 2, -ms * 9.8 * hk * 1000], m('U = -\\frac{GMm}{r}'), 'J')
add('mg4', f'Find the escape velocity from Earth\'s surface.', math.sqrt(2 * G * ME / RE), [math.sqrt(G * ME / RE), 2 * G * ME / RE, math.sqrt(2 * 9.8 * RE) * 2], m('v = \\sqrt{\\frac{2GM}{r}}'), 'm s^{-1}')
for k in (2, 3, 4):
    addc('mg1', f'If the distance between two masses is multiplied by {k}, the gravitational force between them:', f'becomes 1/{k * k} of its value', [f'becomes 1/{k} of its value', f'becomes {k * k} times larger', 'does not change'], 'Gravity follows an inverse square law.')
    addc('mg2', f'If a satellite\'s orbital radius is multiplied by {k * k}, its period is multiplied by:', f'{k ** 3}', [f'{k * k}', f'{k}', f'{k ** 4}'], 'Kepler\'s third law: T² ∝ r³, so T ∝ r^(3/2).')
addc('mg3', 'As a satellite moves to a higher circular orbit, its total energy:', 'increases (becomes less negative)', ['decreases', 'stays the same', 'becomes positive'], 'Total energy is -GMm/2r, which rises towards zero as r grows.')
addc('mg4', 'A geostationary satellite:', 'orbits above the equator with a period of 24 hours', ['orbits over the poles', 'has zero speed', 'orbits at any height with a 24-hour period'], 'It must turn with the Earth, which fixes both its height and its plane.')

# ---------- Charged particles ----------
for _ in range(60):
    V_, d = R.choice([50, 100, 200, 500, 1000, 2000]), R.choice([0.01, 0.02, 0.05, 0.1])
    E_ = V_ / d
    add('cf1', f'Two parallel plates {m(f"{d:g}")} m apart have a potential difference of {m(V_)} V. Find the electric field strength.', E_, [V_ * d, d / V_, V_], m('E = \\frac{V}{d}'), 'V m^{-1}')
    add('cf1', f'Find the force on an electron between plates {m(f"{d:g}")} m apart with {m(V_)} V across them.', e * E_, [e * V_, e * V_ * d, me_ * E_], m('F = qE = q\\frac{V}{d}'), 'N')
    add('cf2', f'An electron is accelerated from rest through {m(V_)} V. Find its kinetic energy gain.', e * V_, [e * V_ / 2, e / V_, me_ * V_], m('W = qV'), 'J')
    add('cf2', f'An electron is accelerated from rest through {m(V_)} V. Find its final speed.', math.sqrt(2 * e * V_ / me_), [math.sqrt(e * V_ / me_), 2 * e * V_ / me_, math.sqrt(2 * e * V_ / mp)], m('qV = \\frac{1}{2}mv^2'), 'm s^{-1}')
    v, B = R.choice([1e5, 2e6, 5e6, 1e7]), R.choice([0.01, 0.05, 0.1, 0.5])
    add('cf4', f'An electron moves at {sci(v)} m/s perpendicular to a {m(f"{B:g}")} T magnetic field. Find the force on it.', e * v * B, [e * v / B, me_ * v * B, e * B], m('F = qvB'), 'N')
    add('cf4', f'An electron moves at {sci(v)} m/s perpendicular to a {m(f"{B:g}")} T field. Find the radius of its path.', me_ * v / (e * B), [e * B / (me_ * v), me_ * v * v / (e * B), mp * v / (e * B)], m('r = \\frac{mv}{qB}'), 'm')
    q1, q2, rr = R.choice([1e-6, 2e-6, 5e-6]), R.choice([1e-6, 3e-6, 4e-6]), R.choice([0.1, 0.2, 0.5])
    add('cf5', f'Find the force between charges of {sci(q1)} C and {sci(q2)} C that are {m(f"{rr:g}")} m apart.', 9e9 * q1 * q2 / rr ** 2, [9e9 * q1 * q2 / rr, q1 * q2 / rr ** 2, 9e9 * (q1 + q2) / rr ** 2], m('F = \\frac{1}{4\\pi\\varepsilon_0}\\frac{q_1q_2}{r^2}'), 'N')
addc('cf3', 'An electron enters the uniform field between two parallel plates at right angles to the field. Its path between the plates is:', 'a parabola', ['a circle', 'a straight line', 'a spiral'], 'A constant force across the motion gives projectile-like (parabolic) motion.')
addc('cf4', 'A charged particle moving parallel to a magnetic field experiences:', 'no magnetic force', ['the greatest force', 'a force along its velocity', 'a force towards the field source'], 'F = qvB sin θ, and θ = 0.')
addc('cf4', 'A magnetic force on a moving charge does no work because:', 'the force is always perpendicular to the velocity', ['the force is zero', 'the charge is too small', 'magnetic fields store no energy'], 'A perpendicular force changes direction, not speed.')

# ---------- Motor effect ----------
for _ in range(60):
    l, I, B, th = R.choice([0.1, 0.2, 0.5, 1.0]), R.choice([1, 2, 3, 5, 10]), R.choice([0.05, 0.1, 0.2, 0.5]), R.choice([30, 45, 60, 90])
    add('me1', f'A {m(f"{l:g}")} m wire carries {m(I)} A at {m(f"{th}^\\circ")} to a {m(f"{B:g}")} T field. Find the force on it.', l * I * B * math.sin(math.radians(th)), [l * I * B, l * I * B * math.cos(math.radians(th)) if th != 90 else l * I / B, I * B * math.sin(math.radians(th))], m('F = lIB\\sin\\theta'), 'N')
    I1, I2, r = R.choice([2, 5, 10]), R.choice([3, 5, 8]), R.choice([0.01, 0.05, 0.1])
    add('me2', f'Two long parallel wires {m(f"{r:g}")} m apart carry {m(I1)} A and {m(I2)} A. Find the force per metre between them.', 2e-7 * I1 * I2 / r, [4e-7 * math.pi * I1 * I2 / r, 2e-7 * I1 * I2 / r ** 2, 2e-7 * (I1 + I2) / r], m('\\frac{F}{l} = \\frac{\\mu_0}{2\\pi}\\frac{I_1I_2}{r}'), 'N m^{-1}')
addc('me2', 'Two parallel wires carry currents in the same direction. They:', 'attract each other', ['repel each other', 'feel no force', 'twist to be perpendicular'], 'Currents in the same direction attract.')
addc('me3', 'The force on a current-carrying wire in a magnetic field is greatest when the wire is:', 'perpendicular to the field', ['parallel to the field', 'at 45° to the field', 'carrying no current'], 'sin θ is greatest at 90°.')

# ---------- Electromagnetic induction ----------
for _ in range(60):
    N, B1, B2, A, t = R.choice([10, 50, 100, 200]), R.choice([0, 0.1, 0.2]), R.choice([0.4, 0.5, 0.8]), R.choice([0.01, 0.02, 0.05]), R.choice([0.1, 0.2, 0.5])
    emf = N * (B2 - B1) * A / t
    add('ei2', f'A {m(N)}-turn coil of area {m(f"{A:g}")} m² is in a field that changes from {m(f"{B1:g}")} T to {m(f"{B2:g}")} T in {m(f"{t:g}")} s. Find the induced emf.', emf, [emf / N, (B2 - B1) * A * t * N, N * B2 * A / t], m('\\varepsilon = -N\\frac{\\Delta\\Phi}{\\Delta t}'), 'V')
    add('ei1', f'Find the flux through a {m(f"{A:g}")} m² loop at right angles to a {m(f"{B2:g}")} T field.', B2 * A, [B2 / A, A / B2, B2 * A * 2], m('\\Phi = BA_\\perp'), 'Wb')
    Np, Ns, Vp = R.choice([100, 200, 500, 1000]), R.choice([20, 50, 2000, 5000]), R.choice([12, 240, 11000])
    add('ei4', f'An ideal transformer has {m(Np)} primary turns and {m(Ns)} secondary turns. The primary voltage is {m(Vp)} V. Find the secondary voltage.', Vp * Ns / Np, [Vp * Np / Ns, Vp, Vp * Ns], m('\\frac{V_p}{V_s} = \\frac{N_p}{N_s}'), 'V')
    P, V_, Rl = R.choice([1e6, 5e6, 1e7]), R.choice([11000, 66000, 330000]), R.choice([2, 5, 10])
    Il = P / V_
    add('ei5', f'{sci(P)} W is sent at {m(f"{V_:,}".replace(",", "{,}"))} V through lines of resistance {m(Rl)} Ω. Find the power lost.', Il * Il * Rl, [V_ * V_ / Rl, Il * Rl, P / Rl], m('P_{\\text{loss}} = I^2R, \\quad I = \\frac{P}{V}'), 'W')
addc('ei3', 'Lenz\'s law says the induced current flows so that its magnetic field:', 'opposes the change in flux that caused it', ['adds to the original flux', 'is always zero', 'points along the wire'], 'This is conservation of energy.')
addc('ei5', 'Electricity is transmitted at very high voltage because this:', 'lowers the current, so less energy is lost as heat', ['raises the current', 'makes the wires lighter', 'stops eddy currents'], 'Power loss is I²R, and I = P/V.')
addc('ei4', 'Laminating a transformer core reduces energy loss by:', 'reducing eddy currents', ['increasing the turns ratio', 'raising the resistance of the coils', 'stopping the flux changing'], 'Thin insulated layers break up the eddy current loops.')

# ---------- Applications of the motor effect ----------
addc('am1', 'In a DC motor, the split-ring commutator:', 'reverses the current in the coil every half turn', ['keeps the current constant', 'changes DC to AC outside the motor', 'reduces back emf'], 'Reversing the current keeps the torque in the same direction.')
addc('am1', 'When a DC motor speeds up, its back emf:', 'increases, so the current falls', ['decreases', 'stays the same', 'reverses direction'], 'Back emf grows with speed and opposes the supply.')
addc('am2', 'The main difference between an AC and a DC generator is that an AC generator uses:', 'slip rings', ['a split-ring commutator', 'a permanent magnet', 'more turns of wire'], 'Slip rings keep each end of the coil on the same terminal.')
addc('am3', 'In an AC induction motor, the rotor turns because:', 'currents are induced in it by the rotating field of the stator', ['it is connected to the supply by brushes', 'it is a permanent magnet', 'of static electricity'], 'The induced currents feel a force from the rotating field.')
addc('am4', 'Magnetic braking works because:', 'eddy currents induced in the moving metal produce a force opposing the motion', ['the magnet attracts the metal', 'friction increases', 'the metal becomes magnetised permanently'], 'Lenz\'s law: the induced currents oppose the change.')
for _ in range(30):
    N, I, A, B, th = R.choice([50, 100, 200]), R.choice([0.5, 1, 2]), R.choice([0.01, 0.02, 0.05]), R.choice([0.1, 0.2, 0.5]), R.choice([0, 30, 60])
    add('am1', f'A {m(N)}-turn coil of area {m(f"{A:g}")} m² carries {m(f"{I:g}")} A in a {m(f"{B:g}")} T field, with its plane at {m(f"{th}^\\circ")} to the field. Find the torque.', N * B * I * A * math.cos(math.radians(th)), [N * B * I * A * math.sin(math.radians(th)) if th else N * B * I, B * I * A * math.cos(math.radians(th)), N * B * I * A * 2], m('\\tau = nIAB\\cos\\theta'), 'N m')

# ---------- Electromagnetic spectrum and light ----------
for _ in range(60):
    lam = R.choice([400e-9, 500e-9, 600e-9, 700e-9, 1e-10, 0.5, 2.0, 1e-3])
    add('es2', f'Find the frequency of electromagnetic radiation with wavelength {sci(lam)} m.', c / lam, [lam / c, c * lam, 1 / lam], m('c = f\\lambda'), 'Hz')
    add('lq2', f'Find the energy of a photon of wavelength {sci(lam)} m.', h * c / lam, [h * lam / c, h / lam, h * c * lam], m('E = hf = \\frac{hc}{\\lambda}'), 'J')
    T = R.choice([3000, 5800, 6000, 10000, 20000])
    add('lq1', f'A star\'s surface temperature is {m(T)} K. Find the peak wavelength of its radiation. ({m("b = 2.898 \\times 10^{-3}")} m K)', 2.898e-3 / T, [T / 2.898e-3, 2.898e-3 * T, 2.898e-3 / (T * 10)], m('\\lambda_{\\max} = \\frac{b}{T}'), 'm')
    W = R.choice([2.3, 2.9, 4.3, 4.7])
    lam2 = R.choice([150e-9, 200e-9, 250e-9])
    Ek = h * c / lam2 - W * e
    add('lq3', f'Light of wavelength {sci(lam2)} m hits a metal with work function {m(W)} eV. Find the maximum kinetic energy of the photoelectrons.', Ek, [h * c / lam2, h * c / lam2 + W * e, W * e], m('K_{\\max} = hf - \\phi'), 'J')
    add('lq3', f'Find the threshold frequency of a metal with work function {m(W)} eV.', W * e / h, [W / h, h / (W * e), W * e * h], m('f_0 = \\frac{\\phi}{h}'), 'Hz')
    d, mm, lam3 = R.choice([1e-6, 2e-6, 5e-6]), R.choice([1, 2]), R.choice([450e-9, 550e-9, 650e-9])
    if mm * lam3 / d < 1:
        add('lw2', f'Light of wavelength {sci(lam3)} m passes through a grating with slit spacing {sci(d)} m. Find the angle of the order-{mm} maximum.', math.degrees(math.asin(mm * lam3 / d)), [math.degrees(math.asin(lam3 / d)) if mm == 2 else (math.degrees(math.asin(2 * lam3 / d)) if 2 * lam3 < d else None), math.degrees(mm * lam3 / d), math.degrees(math.atan(mm * lam3 / d)) + 5], m('d\\sin\\theta = m\\lambda'), '°')
    I0, th = R.choice([10, 20, 40, 100]), R.choice([30, 45, 60])
    add('lw3', f'Polarised light of intensity {m(I0)} W m⁻² passes through a polariser at {m(f"{th}^\\circ")} to its plane of polarisation. Find the transmitted intensity.', I0 * math.cos(math.radians(th)) ** 2, [I0 * math.cos(math.radians(th)), I0 * math.sin(math.radians(th)) ** 2, I0 / 2], m('I = I_0\\cos^2\\theta'), 'W m^{-2}')
addc('es1', 'Maxwell predicted that electromagnetic waves:', 'travel at the speed of light', ['need a medium to travel through', 'travel slower than light', 'are longitudinal'], 'His equations gave c = 1/√(μ₀ε₀).')
addc('es3', 'Dark lines in a star\'s spectrum are caused by:', 'atoms in the star\'s outer layers absorbing particular wavelengths', ['the star emitting no light at those wavelengths anywhere', 'dust between us and the star', 'the Doppler effect'], 'Each element absorbs its own set of wavelengths.')
addc('lw1', 'Young\'s double slit experiment supports:', 'the wave model of light', ['the particle model of light', 'the photoelectric effect', 'special relativity'], 'Interference is a wave behaviour.')
addc('lw4', 'Which observation supports the particle model of light?', 'the photoelectric effect', ['diffraction', 'interference', 'polarisation'], 'Electrons are emitted only above a threshold frequency, whatever the intensity.')
addc('lq3', 'Increasing the intensity of light above the threshold frequency:', 'increases the number of photoelectrons but not their maximum energy', ['increases their maximum energy', 'lowers the threshold frequency', 'has no effect'], 'More photons, same energy per photon.')
addc('lq1', 'As a black body gets hotter, the peak of its radiation curve:', 'moves to shorter wavelengths', ['moves to longer wavelengths', 'stays the same', 'disappears'], 'Wien\'s law: λmax ∝ 1/T.')

# ---------- Special relativity ----------
for _ in range(50):
    frac = R.choice([0.5, 0.6, 0.8, 0.9, 0.95, 0.99])
    gam = 1 / math.sqrt(1 - frac ** 2)
    t0, L0 = R.choice([1, 2, 5, 10]), R.choice([10, 50, 100])
    add('sr2', f'A clock moves at {m(f"{frac:g}c")}. If {m(t0)} s passes on the clock, how long passes for a stationary observer?', t0 * gam, [t0 / gam, t0 * frac, t0 * (1 + frac)], m(f't = \\frac{{t_0}}{{\\sqrt{{1 - v^2/c^2}}}}, \\quad \\gamma = {gam:.3f}'), 's')
    add('sr3', f'A {m(L0)} m spaceship moves at {m(f"{frac:g}c")}. How long is it for a stationary observer?', L0 / gam, [L0 * gam, L0 * frac, L0 * (1 - frac)], m(f'L = L_0\\sqrt{{1 - v^2/c^2}}'), 'm')
    mass = R.choice([1e-3, 1e-6, 0.5, 2])
    add('sr4', f'Find the energy equivalent of {sci(mass)} kg of mass.', mass * c * c, [mass * c, mass * c * c / 2, mass * c ** 3], m('E = mc^2'), 'J')
addc('sr1', 'Einstein\'s second postulate says:', 'the speed of light in a vacuum is the same for all observers', ['nothing is faster than sound', 'mass is always conserved', 'time is the same for all observers'], 'It holds whatever the motion of the source or observer.')
addc('sr5', 'More muons reach the ground than expected without relativity because:', 'their lifetime is dilated in Earth\'s frame', ['they speed up as they fall', 'the atmosphere creates more of them near the ground', 'they travel faster than light'], 'Their fast-moving clocks run slow from our frame.')

# ---------- Origins of the elements ----------
for _ in range(30):
    v_, H0 = R.choice([1000, 5000, 20000, 70000]), 70
    add('oe1', f'A galaxy recedes at {m(f"{v_:,}".replace(",", "{,}"))} km/s. Using {m("H_0 = 70")} km/s/Mpc, how far away is it?', v_ / H0, [v_ * H0, H0 / v_, v_ / H0 * 2], m('v = H_0d'), 'Mpc')
    dm = R.choice([0.0287, 0.0304, 0.0188])
    add('oe4', f'A fusion reaction has a mass defect of {m(dm)} u. How much energy is released? (1 u = 931.5 MeV)', dm * 931.5, [dm * 931.5 * 1000, dm / 931.5, dm * 9e16], m('E = \\Delta m \\times 931.5'), 'MeV')
addc('oe2', 'On a Hertzsprung–Russell diagram, most stars, including the Sun, lie on:', 'the main sequence', ['the giant branch', 'the white dwarf region', 'the supergiant region'], 'Stars spend most of their lives fusing hydrogen on the main sequence.')
addc('oe3', 'The main way stars like the Sun make energy is:', 'the proton–proton chain', ['the CNO cycle', 'fission of uranium', 'the triple-alpha process'], 'The CNO cycle dominates only in hotter, more massive stars.')
addc('oe1', 'Hubble\'s observation that distant galaxies are redshifted, more so the further away they are, is evidence that:', 'the universe is expanding', ['galaxies are moving towards us', 'the universe is shrinking', 'light slows down over distance'], 'Recession velocity is proportional to distance.')
addc('oe2', 'A star in the top-left of a Hertzsprung–Russell diagram is:', 'hot and luminous', ['cool and dim', 'cool and luminous', 'hot and dim'], 'Temperature increases to the left, luminosity upwards.')

# ---------- Structure of the atom / quantum atom ----------
for _ in range(40):
    ni, nf = R.choice([(3, 2), (4, 2), (5, 2), (2, 1), (3, 1), (6, 2)])
    inv = 1.097e7 * (1 / nf ** 2 - 1 / ni ** 2)
    add('qa2', f'Find the wavelength of light emitted when a hydrogen electron drops from {m(f"n = {ni}")} to {m(f"n = {nf}")}. ({m("R = 1.097 \\times 10^7")} m⁻¹)', 1 / inv, [inv, 1 / (1.097e7 * (1 / nf - 1 / ni)), 1 / (1.097e7 / ni ** 2)], m('\\frac{1}{\\lambda} = R\\left(\\frac{1}{n_f^2} - \\frac{1}{n_i^2}\\right)'), 'm')
    v = R.choice([1e5, 1e6, 5e6, 2e7])
    add('qa3', f'Find the de Broglie wavelength of an electron moving at {sci(v)} m/s.', h / (me_ * v), [me_ * v / h, h / (mp * v), h * me_ * v], m('\\lambda = \\frac{h}{mv}'), 'm')
    V_, d = R.choice([500, 1000, 2000]), R.choice([0.01, 0.02])
    add('at1', f'In Thomson\'s experiment, electrons pass undeflected through crossed fields of {m(f"E = {V_ / d:,.0f}".replace(",", "{,}"))} V/m and {m("B = 0.01")} T. Find their speed.', V_ / d / 0.01, [V_ / d * 0.01, 0.01 / (V_ / d), V_ / 0.01], m('qE = qvB \\Rightarrow v = \\frac{E}{B}'), 'm s^{-1}')
addc('at2', 'Millikan\'s oil drop experiment showed that:', 'charge comes in whole-number multiples of e', ['electrons have mass', 'atoms have a nucleus', 'light is a particle'], 'Every drop\'s charge was a multiple of 1.6 × 10⁻¹⁹ C.')
addc('at3', 'In Rutherford\'s gold foil experiment, a few alpha particles bounced straight back. This showed that:', 'the atom\'s positive charge and mass are in a tiny nucleus', ['atoms are mostly solid', 'electrons orbit in fixed shells', 'alpha particles are negative'], 'Only a small, dense, positive centre could reverse them.')
addc('at4', 'Chadwick discovered the neutron by:', 'showing the radiation from beryllium knocked protons out of paraffin with momentum only a neutral massive particle could have', ['deflecting it in a magnetic field', 'measuring its charge in an oil drop', 'observing it in a cloud chamber as a curved track'], 'Neutral radiation that carried that much momentum had to be a massive particle.')
addc('at1', 'Cathode rays were shown to be particles because they:', 'were deflected by electric and magnetic fields', ['travelled in straight lines', 'made glass glow', 'passed through thin foil'], 'Waves are not deflected by fields; charged particles are.')
addc('qa1', 'In the Bohr model, an atom emits light when an electron:', 'drops to a lower energy level', ['moves faster in the same orbit', 'jumps to a higher level', 'leaves the nucleus'], 'The photon carries away the energy difference.')
addc('qa4', 'A key limitation of the Bohr model is that it:', 'only works for hydrogen-like atoms', ['cannot explain line spectra', 'does not include a nucleus', 'predicts continuous spectra'], 'It fails for multi-electron atoms and line intensities.')

# ---------- Properties of the nucleus ----------
for _ in range(50):
    th, t = R.choice([2, 5, 8, 12, 30]), R.choice([1, 2, 3, 4, 5])
    N0 = R.choice([100, 400, 800, 1000])
    add('pn2', f'A sample of {m(N0)} g has a half-life of {m(th)} days. How much is left after {m(th * t)} days?', N0 / 2 ** t, [N0 / (2 * t), N0 * (1 - t / 10), N0 / 2 ** (t + 1)], m(f'{N0} \\times \\left(\\frac{{1}}{{2}}\\right)^{{{t}}}'), 'g')
    add('pn2', f'Find the decay constant of an isotope with a half-life of {m(th)} days.', math.log(2) / th, [th / math.log(2), 0.5 / th, math.log(2) * th], m('\\lambda = \\frac{\\ln 2}{t_{1/2}}'), 'day^{-1}')
    dm = R.choice([0.0304, 0.0989, 0.528, 0.186])
    add('pn3', f'A nucleus has a mass defect of {m(dm)} u. Find its binding energy. (1 u = 931.5 MeV)', dm * 931.5, [dm / 931.5, dm * 931.5 / 2, dm * 3e8], m('E = \\Delta m \\times 931.5'), 'MeV')
addc('pn1', 'In alpha decay, the nucleus loses:', '2 protons and 2 neutrons', ['1 neutron', '1 proton', 'an electron'], 'An alpha particle is a helium-4 nucleus.')
addc('pn1', 'In beta-minus decay:', 'a neutron becomes a proton, emitting an electron and an antineutrino', ['a proton becomes a neutron', 'the mass number falls by 4', 'only energy is released'], 'The atomic number rises by 1; the mass number is unchanged.')
addc('pn1', 'Which radiation is the most penetrating?', 'gamma', ['alpha', 'beta', 'all are equal'], 'Gamma rays are uncharged, high-energy photons.')
addc('pn4', 'Energy is released in both fission of heavy nuclei and fusion of light nuclei because:', 'the products have more binding energy per nucleon', ['mass is created', 'the products have less binding energy per nucleon', 'neutrons are destroyed'], 'Both move towards iron at the peak of the binding energy curve.')

# ---------- Deep inside the atom ----------
addc('da1', 'A proton is made of:', 'two up quarks and one down quark', ['one up and two down quarks', 'three up quarks', 'an electron and a neutrino'], 'Charges +2/3 + 2/3 − 1/3 = +1.')
addc('da1', 'A neutron is made of:', 'one up quark and two down quarks', ['two up and one down quark', 'three down quarks', 'a proton and an electron'], 'Charges +2/3 − 1/3 − 1/3 = 0.')
addc('da1', 'Which of these is a lepton?', 'electron', ['proton', 'neutron', 'pion'], 'Leptons are fundamental; protons, neutrons and pions are made of quarks.')
addc('da1', 'The particle that carries the electromagnetic force is the:', 'photon', ['gluon', 'W boson', 'Higgs boson'], 'Gluons carry the strong force; W and Z the weak force.')
addc('da2', 'Particle accelerators reach the energies needed to make new particles because:', 'kinetic energy can be converted into mass (E = mc²)', ['they slow particles down', 'they split electrons', 'they cool particles to absolute zero'], 'Collision energy becomes the mass of new particles.')
addc('da1', 'The Standard Model groups the fundamental particles into:', 'quarks, leptons and gauge bosons (plus the Higgs boson)', ['protons, neutrons and electrons', 'alpha, beta and gamma', 'atoms, molecules and ions'], 'These are the fundamental particles.')

by = {}
for q in OUT: by.setdefault(q['step'], []).append(q)
final = []
for s in sorted(by):
    R.shuffle(by[s]); final += by[s][:30]
json.dump(final, open('quick_phys.json', 'w'), indent=1)
print({s: min(len(v), 30) for s, v in sorted(by.items())}, 'total', len(final))
