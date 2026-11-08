"""Quick questions: HSC Chemistry (Year 12 modules 5-8). Data from the HSC Chemistry data sheet.
Calculations are computed here (3 significant figures, pH to 2 decimal places); concept questions have fixed right answers
with common misconceptions as the wrong ones. Formulas use Unicode subscripts so they read cleanly without maths rendering.
Output: quick_chem.json  [{step, prompt, options[4], answer 'A'-'D', why}]"""
import json, math, random, re

R = random.Random(20261108)
NA, VM25, KW, CW = 6.022e23, 24.79, 1.0e-14, 4.18   # CW: J g^-1 K^-1 (4.18 x 10^3 J kg^-1 K^-1)
AM = {'H': 1.008, 'C': 12.01, 'N': 14.01, 'O': 16.00, 'Na': 22.99, 'Mg': 24.31, 'Al': 26.98, 'S': 32.07, 'Cl': 35.45, 'K': 39.10,
      'Ca': 40.08, 'Fe': 55.85, 'Cu': 63.55, 'Zn': 65.38, 'Br': 79.90, 'Ag': 107.9, 'I': 126.9, 'Ba': 137.3, 'Pb': 207.2, 'P': 30.97, 'F': 19.00}
SUB, SUP = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉'), str.maketrans('0123456789+-', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻')


def molar(f):
    """molar mass from a formula like Ca(OH)2 or CH3COOH"""
    def parse(s, i=0):
        tot = 0.0
        while i < len(s):
            if s[i] == '(':
                v, i = parse(s, i + 1)
                n = re.match(r'\d*', s[i:]).group(); i += len(n); tot += v * int(n or 1)
            elif s[i] == ')':
                return tot, i + 1
            else:
                el = re.match(r'[A-Z][a-z]?', s[i:]).group(); i += len(el)
                n = re.match(r'\d*', s[i:]).group(); i += len(n); tot += AM[el] * int(n or 1)
        return tot, i
    return parse(f)[0]


def ch(s):
    """'2NH3 + CO3^2-' -> '2NH₃ + CO₃²⁻': digits after a symbol or bracket are subscripts, ^... is a charge, leading coefficients stay"""
    s = re.sub(r'\^([0-9]*[+-])', lambda x: x.group(1).translate(SUP), s)
    return re.sub(r'(?<=[A-Za-z\)])(\d+)', lambda x: x.group(1).translate(SUB), s)


def tx(s):
    """formula for TeX: NH3 -> \\mathrm{NH_3}, CO3^2- -> \\mathrm{CO_3^{2-}}"""
    s = re.sub(r'(?<=[A-Za-z\)])(\d+)', r'_{\1}', s)
    s = re.sub(r'\^([0-9]*[+-])', r'^{\1}', s)
    return f'\\mathrm{{{s}}}'


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
        s += f'\\text{{ {base}}}' + (f'^{{{exp}}}' if exp else '')
    return m(s)


def num(v):
    """a number for a prompt, written plainly (scientific notation in maths when tiny or huge)"""
    if v == 0: return '0'
    ex = math.floor(math.log10(abs(v)))
    if -3 <= ex <= 4: return f'{v:g}'
    mant = v / 10 ** ex
    return m(f'{mant:g} \\times 10^{{{ex}}}')


def tn(v):
    """a number inside TeX: plain, or a × 10^n"""
    ex = math.floor(math.log10(abs(v)))
    if -3 <= ex <= 4: return f'{v:g}'
    return f'{v / 10 ** ex:g} \\times 10^{{{ex}}}'


PH = lambda v: m(f'{v:.2f}'.replace('-0.00', '0.00'))
OUT, SEEN = [], set()


def add(step, prompt, right, wrong, why, unit='', fmt=None):
    """numeric: right and wrong are numbers, shown by fmt (default 3 s.f. with the unit)"""
    f = fmt or (lambda v: sci(v, unit))
    opts, keys = [f(right)], {f(right)}
    extra = [] if fmt else [right * 2, right / 2, right * 10, right / 10]
    for w in list(wrong) + extra:
        if w is None or (isinstance(w, float) and (math.isnan(w) or math.isinf(w))): continue
        s = f(w)
        if s not in keys and len(opts) < 4: opts.append(s); keys.add(s)
    if (prompt, opts[0]) in SEEN or len(opts) < 4: return
    SEEN.add((prompt, opts[0]))
    order = list(range(4)); R.shuffle(order)
    OUT.append(dict(step=step, prompt=prompt, options=[opts[i] for i in order], answer='ABCD'[order.index(0)], why=why))


def addc(step, prompt, right, wrong, why):
    """concept: plain-text options"""
    opts = [right] + list(wrong)[:3]
    if (prompt, right) in SEEN or len(set(opts)) < 4: return
    SEEN.add((prompt, right))
    order = list(range(4)); R.shuffle(order)
    OUT.append(dict(step=step, prompt=prompt, options=[opts[i] for i in order], answer='ABCD'[order.index(0)], why=why))


def pick_wrong(right, pool, k=3):
    return R.sample([x for x in pool if x != right], k)


# =====================================================================================================================
# MODULE 5: EQUILIBRIUM AND ACID REACTIONS
# =====================================================================================================================

# reactions: (left [(coef, species, state)], right [...], dH kJ/mol or None)
RX = [
    ([(1, 'N2', 'g'), (3, 'H2', 'g')], [(2, 'NH3', 'g')], -92),
    ([(2, 'SO2', 'g'), (1, 'O2', 'g')], [(2, 'SO3', 'g')], -198),
    ([(1, 'N2O4', 'g')], [(2, 'NO2', 'g')], +58),
    ([(1, 'H2', 'g'), (1, 'I2', 'g')], [(2, 'HI', 'g')], None),
    ([(1, 'CO', 'g'), (2, 'H2', 'g')], [(1, 'CH3OH', 'g')], -91),
    ([(1, 'CH4', 'g'), (1, 'H2O', 'g')], [(1, 'CO', 'g'), (3, 'H2', 'g')], +206),
    ([(1, 'PCl5', 'g')], [(1, 'PCl3', 'g'), (1, 'Cl2', 'g')], +88),
    ([(1, 'CO', 'g'), (1, 'H2O', 'g')], [(1, 'CO2', 'g'), (1, 'H2', 'g')], -41),
    ([(2, 'NO', 'g'), (1, 'O2', 'g')], [(2, 'NO2', 'g')], -114),
]


def eqn(rx, states=True):
    side = lambda ss: ' + '.join(f'{c if c > 1 else ""}{ch(sp)}' + (f'({st})' if states else '') for c, sp, st in ss)
    return f'{side(rx[0])} ⇌ {side(rx[1])}'


def gasn(ss): return sum(c for c, _, st in ss if st == 'g')


SHIFT = ['Shifts to the right', 'Shifts to the left', 'No shift in position', 'Shifts right, then back left to where it started']

# ---------- sde: static and dynamic equilibrium ----------
addc('sde1', 'Which of these is an example of a closed system?', 'A sealed flask of gas, where no matter enters or leaves', ['An open beaker of boiling water', 'A burning candle', 'A lake'], 'A closed system can exchange energy but not matter with its surroundings.')
addc('sde1', 'An open system can exchange:', 'both matter and energy with its surroundings', ['only energy', 'only matter', 'neither matter nor energy'], 'Closed systems exchange energy only; isolated systems exchange neither.')
addc('sde1', 'Which reaction is generally treated as non-reversible?', 'The combustion of methane', ['N₂O₄(g) ⇌ 2NO₂(g)', 'Dissolving a little CaSO₄ in water', 'The esterification of ethanol and ethanoic acid'], 'Combustion releases a lot of energy and its products escape, so it does not reverse.')
addc('sde1', 'Which observation shows the N₂O₄ ⇌ 2NO₂ reaction is reversible?', 'A sealed tube of the brown gas fades when cooled and darkens when warmed again', ['The gas is brown', 'The tube gets warm', 'The gas is denser than air'], 'Changing the temperature pushes the reaction one way and then back.')
addc('sde1', 'Burning magnesium ribbon in air is non-reversible mainly because:', 'it is highly exothermic and the reverse reaction is not feasible in those conditions', ['magnesium is a metal', 'it needs a spark to start', 'it gives off light'], 'A large energy release with a very high reverse activation energy makes it effectively one-way.')
addc('sde1', 'Photosynthesis and respiration are best described as:', 'opposite reactions that are each non-reversible on their own', ['one reaction at equilibrium', 'the same reaction', 'reversible reactions in a closed system'], 'They run in different conditions and are each driven one way.')
addc('sde2', 'At dynamic equilibrium:', 'the forward and reverse reaction rates are equal', ['the concentrations of reactants and products are equal', 'both reactions have stopped', 'only the forward reaction occurs'], 'Concentrations stay constant, but they are rarely equal.')
addc('sde2', 'Which is true for a system at equilibrium?', 'Macroscopic properties such as colour and pressure stay constant', ['The reaction has stopped', 'All the reactants have been used up', 'The products always outnumber the reactants'], 'Both reactions keep going at the same rate, so nothing visible changes.')
addc('sde2', 'Radioactive I⁻ ions are added to a saturated PbI₂ solution in contact with solid PbI₂. The radioactivity soon appears in the solid. This shows:', 'dissolving and precipitating keep happening at equilibrium', ['the solid is reacting with the radioactivity', 'the equilibrium is static', 'iodine is insoluble'], 'Isotopic labelling is evidence that equilibrium is dynamic.')
addc('sde2', 'Equilibrium can only be reached in:', 'a closed system', ['an open system', 'a system with a catalyst', 'a reaction that goes to completion'], 'In an open system products escape, so the reverse reaction cannot keep pace.')
addc('sde2', 'According to collision theory, a reaction happens when particles collide:', 'with enough energy and the right orientation', ['with any energy', 'only at high temperature', 'only with a catalyst'], 'Energy at least equal to the activation energy, and a suitable orientation.')
addc('sde2', 'As a reaction approaches equilibrium from pure reactants, the forward rate:', 'decreases until it equals the reverse rate', ['increases until it equals the reverse rate', 'stays the same', 'drops to zero'], 'Reactant concentrations fall, so the forward rate falls; the reverse rate rises.')
addc('sde3', 'A catalyst speeds up a reaction by:', 'providing a pathway with a lower activation energy', ['raising the activation energy', 'increasing the enthalpy change', 'giving the particles more kinetic energy'], 'It lowers Ea for both the forward and reverse reactions.')
addc('sde3', 'A catalyst added to a system at equilibrium:', 'speeds up the forward and reverse reactions equally', ['speeds up only the forward reaction', 'increases the yield of products', 'changes the value of K'], 'Equilibrium is reached sooner, but the position and K are unchanged.')
addc('sde3', 'On an energy profile diagram for an exothermic reaction:', 'the products are lower in energy than the reactants', ['the products are higher than the reactants', 'there is no activation energy', 'the reverse activation energy is smaller than the forward one'], 'Energy is released, so the products sit lower.')
addc('sde3', 'Which reaction has a larger activation energy for its reverse reaction than its forward reaction?', 'An exothermic reaction', ['An endothermic reaction', 'Any reaction with a catalyst', 'A reaction with ΔH = 0 only'], 'Ea(reverse) = Ea(forward) − ΔH, which is larger when ΔH is negative.')
for _ in range(40):
    ea, dh = R.choice([60, 75, 90, 120, 150, 180, 210, 250]), R.choice([-120, -95, -60, -45, -30, 25, 40, 55, 80])
    if dh >= ea: continue
    rev = ea - dh
    add('sde3', f'A reaction has a forward activation energy of {ea} kJ mol⁻¹ and ΔH = {dh:+d} kJ mol⁻¹. Find the activation energy of the reverse reaction.', rev,
        [ea + dh, abs(dh), ea], m(f'E_a(\\text{{rev}}) = E_a(\\text{{fwd}}) - \\Delta H = {ea} - ({dh})'), 'kJ mol^-1', fmt=lambda v: m(f'{v:g}\\text{{ kJ mol}}^{{-1}}'))
addc('sde4', 'A reaction is spontaneous when:', 'ΔG is negative', ['ΔG is positive', 'ΔH is positive', 'ΔS is negative'], 'ΔG = ΔH − TΔS < 0 means the reaction can proceed by itself.')
addc('sde4', 'A reaction with ΔH < 0 and ΔS > 0 is:', 'spontaneous at all temperatures', ['never spontaneous', 'spontaneous only at high temperature', 'spontaneous only at low temperature'], 'Both terms make ΔG negative whatever T is.')
addc('sde4', 'A reaction with ΔH > 0 and ΔS < 0 is:', 'never spontaneous', ['always spontaneous', 'spontaneous only at high temperature', 'spontaneous only at low temperature'], 'Both terms make ΔG positive at every temperature.')
addc('sde4', 'A reaction with ΔH > 0 and ΔS > 0 is:', 'spontaneous only at high temperature', ['spontaneous only at low temperature', 'always spontaneous', 'never spontaneous'], 'TΔS must be larger than ΔH, which needs a high T.')
addc('sde4', 'A reaction with ΔH < 0 and ΔS < 0 is:', 'spontaneous only at low temperature', ['spontaneous only at high temperature', 'always spontaneous', 'never spontaneous'], 'At low T, ΔH dominates and ΔG is negative.')
addc('sde4', 'Which change has a positive entropy change?', 'Ice melting', ['Steam condensing', 'Two gases combining into one solid', 'Water freezing'], 'Liquids are more disordered than solids.')
addc('sde4', 'Which reaction has the largest increase in entropy?', 'CaCO₃(s) → CaO(s) + CO₂(g)', ['N₂(g) + 3H₂(g) → 2NH₃(g)', 'H₂O(g) → H₂O(l)', 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)'], 'A gas is formed from a solid.')
addc('sde4', 'Ammonium nitrate dissolves in water spontaneously even though the process is endothermic. This is because:', 'the entropy increase makes TΔS bigger than ΔH', ['ΔH is negative', 'entropy decreases', 'it is a closed system'], 'Spreading ions through the water greatly increases entropy.')
for _ in range(40):
    dh, ds, T = R.choice([-120, -92, -60, -45, 30, 45, 58, 90, 178]), R.choice([-200, -150, -100, -45, 40, 90, 120, 160, 175]), R.choice([298, 350, 400, 500, 800, 1000])
    g = dh - T * ds / 1000
    if abs(g) < 1: continue
    add('sde4', f'For a reaction, ΔH = {dh:+d} kJ mol⁻¹ and ΔS = {ds:+d} J K⁻¹ mol⁻¹. Find ΔG at {T} K.', g, [dh - (T - 273) * ds / 1000, dh + T * ds / 1000, -g],
        m(f'\\Delta G = \\Delta H - T\\Delta S = {dh} - {T}({ds / 1000:g})'), fmt=lambda v: m(f'{v:+.1f}\\text{{ kJ mol}}^{{-1}}'))
    if dh * ds > 0:
        Tc = dh * 1000 / ds
        add('sde4', f'A reaction has ΔH = {dh:+d} kJ mol⁻¹ and ΔS = {ds:+d} J K⁻¹ mol⁻¹. Above or below what temperature does its spontaneity change?', Tc, [dh / ds, Tc / 1000 * 273, Tc + 273],
            m(f'\\Delta G = 0 \\Rightarrow T = \\frac{{\\Delta H}}{{\\Delta S}} = \\frac{{{dh * 1000}}}{{{ds}}}'), 'K')

# ---------- fae: factors that affect equilibrium ----------
for rx in RX:
    e = eqn(rx)
    L, Rt, dh = rx
    for c, sp, st in L:
        addc('fae1', f'For {e}, more {ch(sp)} is added. What happens to the equilibrium position?', SHIFT[0], SHIFT[1:], f'Adding a reactant: the system uses some up, so it shifts right.')
        addc('fae1', f'For {e}, some {ch(sp)} is removed. What happens to the equilibrium position?', SHIFT[1], [SHIFT[0], SHIFT[2], SHIFT[3]], 'Removing a reactant: the system replaces some, so it shifts left.')
    for c, sp, st in Rt:
        addc('fae1', f'For {e}, more {ch(sp)} is added. What happens to the equilibrium position?', SHIFT[1], [SHIFT[0], SHIFT[2], SHIFT[3]], 'Adding a product: the system uses some up, so it shifts left.')
        addc('fae1', f'For {e}, {ch(sp)} is removed as it forms. What happens to the equilibrium position?', SHIFT[0], SHIFT[1:], 'Removing a product: the system makes more, so it shifts right.')
    gl, gr = gasn(L), gasn(Rt)
    smaller = SHIFT[0] if gr < gl else SHIFT[1] if gl < gr else SHIFT[2]
    bigger = SHIFT[1] if gr < gl else SHIFT[0] if gl < gr else SHIFT[2]
    why = f'There are {gl} mol of gas on the left and {gr} on the right.'
    addc('fae2', f'For {e}, the volume of the container is decreased. What happens to the equilibrium position?', smaller, [x for x in SHIFT if x != smaller][:3],
         why + (' Pressure rises, so it shifts to the side with fewer gas particles.' if gl != gr else ' Equal on both sides, so pressure has no effect on the position.'))
    addc('fae2', f'For {e}, the volume of the container is increased. What happens to the equilibrium position?', bigger, [x for x in SHIFT if x != bigger][:3],
         why + (' Pressure falls, so it shifts to the side with more gas particles.' if gl != gr else ' Equal on both sides, so pressure has no effect on the position.'))
    if dh is not None:
        up = SHIFT[0] if dh > 0 else SHIFT[1]
        kup = 'K increases' if dh > 0 else 'K decreases'
        kind = 'endothermic' if dh > 0 else 'exothermic'
        addc('fae3', f'For {e}, ΔH = {dh:+d} kJ mol⁻¹. The temperature is increased. What happens to the equilibrium position?', up, [x for x in SHIFT if x != up][:3],
             f'The forward reaction is {kind}; heating favours the endothermic direction.')
        addc('fae3', f'For {e}, ΔH = {dh:+d} kJ mol⁻¹. What happens to the value of K when the temperature is increased?', kup,
             ['K decreases' if dh > 0 else 'K increases', 'K stays the same', 'K becomes zero'], f'Heating favours the endothermic direction, so K {"rises" if dh > 0 else "falls"}.')
        dn = SHIFT[1] if dh > 0 else SHIFT[0]
        addc('fae3', f'For {e}, ΔH = {dh:+d} kJ mol⁻¹. The temperature is decreased. What happens to the equilibrium position?', dn, [x for x in SHIFT if x != dn][:3],
             'Cooling favours the exothermic direction.')
    addc('fae3', f'A catalyst is added to {e} at equilibrium. What happens to the equilibrium position?', SHIFT[2], [SHIFT[0], SHIFT[1], SHIFT[3]], 'A catalyst speeds up both directions equally.')
addc('fae3', 'An inert gas such as argon is added to a gas equilibrium at constant volume. The equilibrium position:', 'does not change', ['shifts to the side with more gas particles', 'shifts to the side with fewer gas particles', 'shifts to the exothermic side'], 'The partial pressures (concentrations) of the reacting gases are unchanged.')
addc('fae1', 'Le Chatelier\'s principle says that when a system at equilibrium is disturbed, it:', 'shifts to partly counteract the change', ['shifts to fully undo the change', 'stops reacting', 'always shifts to the right'], 'It only partly counteracts; a new equilibrium is reached.')
addc('fae1', 'CoCl₄²⁻ (blue) + 6H₂O ⇌ Co(H₂O)₆²⁺ (pink) + 4Cl⁻. Adding concentrated HCl makes the solution:', 'more blue', ['more pink', 'colourless', 'no change in colour'], 'Extra Cl⁻ pushes the equilibrium left, towards the blue complex.')
addc('fae1', 'Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺ (blood red). Adding more Fe³⁺ makes the solution:', 'a deeper red', ['paler', 'colourless', 'no change'], 'More reactant shifts the equilibrium right, making more FeSCN²⁺.')
addc('fae4', 'On a concentration–time graph, one species suddenly jumps up and then the others slowly adjust. This shows:', 'that species was added', ['the temperature was changed', 'the volume was changed', 'a catalyst was added'], 'Only the species added changes instantly.')
addc('fae4', 'On a concentration–time graph, every gas concentration suddenly jumps up by the same factor. This shows:', 'the volume of the container was decreased', ['a reactant was added', 'the temperature was raised', 'a catalyst was added'], 'Squeezing the gases raises every concentration at once.')
addc('fae4', 'On a concentration–time graph, no line jumps, but the concentrations gradually change to new constant values. This shows:', 'the temperature was changed', ['a reactant was added', 'the volume was halved', 'a catalyst was added'], 'Temperature changes K, so the system drifts to a new position with no sudden step.')
addc('fae4', 'If the reaction quotient Q is less than K, the reaction:', 'proceeds forwards until Q = K', ['proceeds in reverse', 'is at equilibrium', 'has stopped'], 'Q < K means there are too few products.')
addc('fae4', 'If Q is greater than K, the reaction:', 'proceeds in reverse until Q = K', ['proceeds forwards', 'is at equilibrium', 'speeds up both ways'], 'Q > K means there are too many products.')

# ---------- kq: calculating Keq ----------
def kexpr(rx):
    top = ' '.join(f'[{tx(sp)}]' + (f'^{{{c}}}' if c > 1 else '') for c, sp, st in rx[1] if st in ('g', 'aq'))
    bot = ' '.join(f'[{tx(sp)}]' + (f'^{{{c}}}' if c > 1 else '') for c, sp, st in rx[0] if st in ('g', 'aq'))
    return top or '1', bot or '1'


RX_K = RX + [
    ([(1, 'CaCO3', 's')], [(1, 'CaO', 's'), (1, 'CO2', 'g')], None),
    ([(1, 'CH3COOH', 'aq'), (1, 'H2O', 'l')], [(1, 'CH3COO^-', 'aq'), (1, 'H3O^+', 'aq')], None),
    ([(1, 'Fe^3+', 'aq'), (1, 'SCN^-', 'aq')], [(1, 'FeSCN^2+', 'aq')], None),
    ([(1, 'C', 's'), (1, 'H2O', 'g')], [(1, 'CO', 'g'), (1, 'H2', 'g')], None),
]
for rx in RX_K:
    top, bot = kexpr(rx)
    right = m(f'K = \\frac{{{top}}}{{{bot}}}') if bot != '1' else m(f'K = {top}')
    inv = m(f'K = \\frac{{{bot}}}{{{top}}}')
    nopow = lambda ss: ' '.join(f'[{tx(sp)}]' for c, sp, st in ss if st in ('g', 'aq')) or '1'
    allin = lambda ss: ' '.join(f'[{tx(sp)}]' + (f'^{{{c}}}' if c > 1 else '') for c, sp, st in ss) or '1'
    wrong = [inv, m(f'K = \\frac{{{nopow(rx[1])}}}{{{nopow(rx[0])}}}'), m(f'K = \\frac{{{allin(rx[1])}}}{{{allin(rx[0])}}}'),
             m(f'K = \\frac{{{" + ".join(t for t in top.split(" "))}}}{{{" + ".join(t for t in bot.split(" "))}}}')]
    prods_all = ' '.join(f'[{tx(sp)}]' + (f'^{{{c}}}' if c > 1 else '') for c, sp, st in rx[1])
    wrong += [m(f'K = {prods_all}'), m(f'K = \\frac{{{allin(rx[0])}}}{{{allin(rx[1])}}}')]
    wrong = [w for w in dict.fromkeys(wrong) if w != right and '}{1}' not in w and w != m(f'K = {top}')]
    addc('kq1', f'Which is the equilibrium expression for {eqn(rx)}?', right, wrong[:3], 'Products over reactants, each raised to its coefficient; solids and liquids are left out.')
addc('kq1', 'Why are pure solids and liquids left out of the Keq expression?', 'Their concentrations are effectively constant', ['They do not react', 'They are always products', 'They have no mass'], 'Their "concentration" does not change as the reaction proceeds.')
addc('kq1', 'The units of Keq are:', 'not required (HSC Keq values are given without units)', ['always mol L⁻¹', 'always L mol⁻¹', 'kJ mol⁻¹'], 'Keq is treated as a dimensionless number in HSC Chemistry.')
for _ in range(60):
    rx = R.choice(RX[:9])
    concs = {sp: R.choice([0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.80, 1.2, 1.5, 2.0]) for _, sp, _ in rx[0] + rx[1]}
    K = math.prod(concs[sp] ** c for c, sp, _ in rx[1]) / math.prod(concs[sp] ** c for c, sp, _ in rx[0])
    K1 = math.prod(concs[sp] for c, sp, _ in rx[1]) / math.prod(concs[sp] for c, sp, _ in rx[0])
    given = ', '.join(f'[{ch(sp)}] = {concs[sp]:g}' for _, sp, _ in rx[0] + rx[1])
    add('kq2', f'For {eqn(rx)}, the equilibrium concentrations (mol L⁻¹) are {given}. Find K.', K, [1 / K, K1 if abs(K1 - K) > 1e-9 else None, K * 2], 'K = products over reactants, each to the power of its coefficient.')
for _ in range(50):
    a = R.choice([0.10, 0.20, 0.30, 0.40, 0.50, 0.80, 1.00])
    y = round(a * R.choice([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2]), 3)
    if y / 2 >= a: continue
    K = y * y / (a - y / 2)
    add('kq3', f'{a:g} mol of N₂O₄ is placed in a sealed 1.0 L flask: N₂O₄ ⇌ 2NO₂. At equilibrium, [NO₂] = {y:g} mol L⁻¹. Find K.', K, [y * y / a, y / (a - y / 2), y * y / (a - y) if a != y else None],
        m(f'[\\mathrm{{N_2O_4}}] = {a:g} - \\frac{{{y:g}}}{{2}}, \\quad K = \\frac{{({y:g})^2}}{{{a - y / 2:.3g}}}'))
    b = R.choice([0.10, 0.20, 0.50, 1.00])
    z = round(b * R.choice([0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6]), 3)
    if z / 2 >= b: continue
    K2 = z * z / (b - z / 2) ** 2
    add('kq3', f'{b:g} mol each of H₂ and I₂ are sealed in a 1.0 L flask: H₂ + I₂ ⇌ 2HI. At equilibrium, [HI] = {z:g} mol L⁻¹. Find K.', K2, [z * z / b ** 2, z / (b - z / 2) ** 2, z * z / (b - z) ** 2 if b != z else None],
        m(f'[\\mathrm{{H_2}}] = [\\mathrm{{I_2}}] = {b:g} - \\frac{{{z:g}}}{{2}}, \\quad K = \\frac{{({z:g})^2}}{{({b - z / 2:.3g})^2}}'))
    V = R.choice([2.0, 5.0, 0.5])
    n0 = R.choice([0.4, 0.6, 1.0, 2.0]); x = round(n0 * R.choice([0.2, 0.3, 0.5]), 3)
    c0, cx = n0 / V, x / V
    K3 = cx * cx / (c0 - cx)
    add('kq3', f'{n0:g} mol of PCl₅ is heated in a sealed {V:g} L vessel: PCl₅ ⇌ PCl₃ + Cl₂. At equilibrium the vessel contains {x:g} mol of Cl₂. Find K.', K3, [x * x / (n0 - x), cx * cx / c0, cx / (c0 - cx)],
        m(f'\\text{{divide by }}{V:g}\\text{{ L first: }} K = \\frac{{({cx:.3g})^2}}{{{c0 - cx:.3g}}}'))
for _ in range(40):
    rx = R.choice([RX[0], RX[1], RX[2], RX[3], RX[7]])
    concs = {sp: R.choice([0.10, 0.20, 0.30, 0.50, 1.0, 2.0]) for _, sp, _ in rx[0] + rx[1]}
    Q = math.prod(concs[sp] ** c for c, sp, _ in rx[1]) / math.prod(concs[sp] ** c for c, sp, _ in rx[0])
    K = float(f'{Q * R.choice([0.2, 0.4, 2.5, 5, 10, 0.1]):.2g}')
    if abs(math.log10(K / Q)) < 0.2: continue
    given = ', '.join(f'[{ch(sp)}] = {concs[sp]:g}' for _, sp, _ in rx[0] + rx[1])
    right = 'Forwards, because Q < K' if Q < K else 'In reverse, because Q > K'
    addc('kq4', f'For {eqn(rx)}, K = {num(K)}. At one moment {given} mol L⁻¹. Which way does the reaction go?', right,
         ['In reverse, because Q < K' if Q < K else 'Forwards, because Q > K', 'In reverse, because Q > K' if Q < K else 'Forwards, because Q < K', 'Neither: it is at equilibrium'],
         f'Q = {Q:.3g}, which is {"less" if Q < K else "greater"} than K.')
addc('kq4', 'A reaction has K = 1.0 × 10¹⁵ at 25 °C. At equilibrium the mixture is:', 'almost all products', ['almost all reactants', 'roughly equal amounts', 'impossible to say without ΔH'], 'A very large K means the equilibrium lies far to the right.')
addc('kq4', 'A reaction has K = 2 × 10⁻⁹. At equilibrium the mixture is:', 'almost all reactants', ['almost all products', 'roughly equal amounts', 'mostly catalyst'], 'A very small K means the equilibrium lies far to the left.')
for _ in range(40):
    K = float(f'{R.choice([2.5, 4.0, 0.16, 50, 0.025, 640, 1.8e-5, 6.4e3]):.3g}')
    add('kq5', f'For A + B ⇌ 2C, K = {num(K)}. Find K for 2C ⇌ A + B at the same temperature.', 1 / K, [-K, K, K * K], m('K_{\\text{rev}} = \\frac{1}{K}'))
    add('kq5', f'For A + B ⇌ C, K = {num(K)}. Find K for 2A + 2B ⇌ 2C at the same temperature.', K * K, [2 * K, math.sqrt(K), K], m('\\text{Doubling every coefficient squares }K'))
    add('kq5', f'For 2A ⇌ 2B, K = {num(K)}. Find K for A ⇌ B at the same temperature.', math.sqrt(K), [K / 2, K * K, 1 / K], m('\\text{Halving every coefficient: } K^{1/2}'))
addc('kq5', 'Which change alters the value of K for a reaction?', 'Changing the temperature', ['Adding more reactant', 'Halving the volume', 'Adding a catalyst'], 'K depends only on temperature (for a given equation).')

# ---------- sq: solution equilibria ----------
SALTS = {  # formula: (cation, n_cat, anion, n_an, Ksp at 25 C from the data sheet)
    'AgCl': ('Ag^+', 1, 'Cl^-', 1, 1.77e-10), 'AgBr': ('Ag^+', 1, 'Br^-', 1, 5.35e-13), 'AgI': ('Ag^+', 1, 'I^-', 1, 8.52e-17),
    'BaSO4': ('Ba^2+', 1, 'SO4^2-', 1, 1.08e-10), 'BaCO3': ('Ba^2+', 1, 'CO3^2-', 1, 2.58e-9), 'CaCO3': ('Ca^2+', 1, 'CO3^2-', 1, 3.36e-9),
    'PbSO4': ('Pb^2+', 1, 'SO4^2-', 1, 2.53e-8), 'PbI2': ('Pb^2+', 1, 'I^-', 2, 9.8e-9), 'PbCl2': ('Pb^2+', 1, 'Cl^-', 2, 1.70e-5),
    'Mg(OH)2': ('Mg^2+', 1, 'OH^-', 2, 5.61e-12), 'Ca(OH)2': ('Ca^2+', 1, 'OH^-', 2, 5.02e-6), 'Ag2CO3': ('Ag^+', 2, 'CO3^2-', 1, 8.46e-12),
    'Ag2SO4': ('Ag^+', 2, 'SO4^2-', 1, 1.20e-5), 'CaF2': ('Ca^2+', 1, 'F^-', 2, 3.45e-11), 'Fe(OH)3': ('Fe^3+', 1, 'OH^-', 3, 2.79e-39),
}
INSOL = ['AgCl', 'BaSO4', 'PbI2', 'CaCO3', 'AgBr', 'Mg(OH)2', 'Cu(OH)2', 'Fe(OH)3', 'BaCO3', 'PbSO4']
SOL = ['NaCl', 'KNO3', 'NH4Cl', 'Na2SO4', 'Cu(NO3)2', 'K2CO3', 'MgCl2', 'Ca(NO3)2', 'NaOH', 'Ba(NO3)2', 'ZnSO4', 'AgNO3']
for s in INSOL:
    addc('sq1', 'Which of these compounds is insoluble in water?', ch(s), [ch(x) for x in R.sample(SOL, 3)], f'{ch(s)} is on the insoluble side of the solubility rules.')
for s in R.sample(SOL, 8):
    addc('sq1', 'Which of these compounds is soluble in water?', ch(s), [ch(x) for x in R.sample(INSOL, 3)], 'All nitrates and all sodium, potassium and ammonium salts are soluble; most chlorides and sulfates are too (exceptions include Ag⁺, Pb²⁺, Ba²⁺ and Ca²⁺).')
addc('sq1', 'Which mixture of solutions forms a precipitate?', 'AgNO₃ and NaCl', ['NaNO₃ and KCl', 'NH₄Cl and KNO₃', 'Na₂SO₄ and Mg(NO₃)₂'], 'Ag⁺ and Cl⁻ form insoluble AgCl.')
addc('sq1', 'Which mixture of solutions forms a precipitate?', 'Ba(NO₃)₂ and K₂SO₄', ['BaCl₂ and KNO₃', 'NaCl and Mg(NO₃)₂', 'K₂SO₄ and NaCl'], 'Ba²⁺ and SO₄²⁻ form insoluble BaSO₄.')
addc('sq1', 'Which mixture of solutions forms a yellow precipitate?', 'Pb(NO₃)₂ and KI', ['KI and NaNO₃', 'Pb(NO₃)₂ and KNO₃', 'AgNO₃ and NaNO₃'], 'Lead(II) iodide is a bright yellow solid.')
addc('sq1', 'When an ionic solid dissolves, entropy usually:', 'increases, as the ions spread through the solution', ['decreases', 'stays the same', 'becomes zero'], 'Ordered lattice → dispersed hydrated ions.')
addc('sq1', 'Dissolving an ionic solid involves:', 'breaking the lattice (absorbs energy) and hydrating the ions (releases energy)', ['only breaking bonds', 'only forming bonds', 'covalent bonds breaking'], 'The overall ΔH depends on which energy is larger.')
addc('sq1', 'Some Aboriginal and Torres Strait Islander peoples removed toxins from cycad seeds by:', 'leaching them in running water for days', ['heating them in an oven only', 'drying them in the sun only', 'grinding them with salt'], 'The water-soluble toxin (cycasin) dissolves away over time.')
for s, (cat, nc, an, na, ksp) in SALTS.items():
    t = lambda ion, n: f'[{tx(ion)}]' + (f'^{{{n}}}' if n > 1 else '')
    right = m(f'K_{{sp}} = {t(cat, nc)}{t(an, na)}')
    w = [m(f'K_{{sp}} = [{tx(cat)}][{tx(an)}]') if nc > 1 or na > 1 else m(f'K_{{sp}} = [{tx(cat)}]^{{2}}[{tx(an)}]'),
         m(f'K_{{sp}} = \\frac{{{t(cat, nc)}{t(an, na)}}}{{[{tx(s)}]}}'),
         m(f'K_{{sp}} = {nc if nc > 1 else ""}[{tx(cat)}]\\,{na if na > 1 else ""}[{tx(an)}]') if nc > 1 or na > 1 else m(f'K_{{sp}} = [{tx(cat)}] + [{tx(an)}]'),
         m(f'K_{{sp}} = [{tx(cat)}] + [{tx(an)}]')]
    w = [x for x in dict.fromkeys(w) if x != right]
    addc('sq2', f'Which is the solubility product expression for {ch(s)}?', right, w[:3], 'Each ion concentration to the power of its coefficient; the solid is left out.')
for s, (cat, nc, an, na, ksp) in SALTS.items():
    if s == 'Fe(OH)3': continue
    k = nc ** nc * na ** na
    sol = (ksp / k) ** (1 / (nc + na))
    add('sq3', f'{ch(s)} has Ksp = {num(ksp)}. Find its solubility in mol L⁻¹.', sol, [math.sqrt(ksp), (ksp) ** (1 / (nc + na)), ksp / k] if k > 1 else [ksp, ksp / 2, math.sqrt(ksp / 2)],
        m(f'K_{{sp}} = {"" if k == 1 else k}s^{{{nc + na}}}'), 'mol L^-1')
    M = molar(s)
    add('sq3', f'{ch(s)} has Ksp = {num(ksp)}. Find its solubility in g L⁻¹. (M = {M:.2f} g mol⁻¹)', sol * M, [math.sqrt(ksp) * M if k > 1 else ksp * M, sol, sol / M],
        m(f'\\text{{mol L}}^{{-1}} \\times {M:.2f}'), 'g L^-1')
    s2 = float(f'{sol * R.choice([0.6, 0.8, 1.3, 2]):.2g}')
    add('sq3', f'The solubility of {ch(s)} at some temperature is {num(s2)} mol L⁻¹. Find Ksp.', k * s2 ** (nc + na), [s2 ** (nc + na) if k > 1 else s2, s2 ** 2 if nc + na > 2 else 2 * s2, math.sqrt(s2)],
        m(f'K_{{sp}} = {"" if k == 1 else k}s^{{{nc + na}}}'))
for _ in range(40):
    s, an_src = R.choice([('AgCl', 'NaCl'), ('BaSO4', 'Na2SO4'), ('PbI2', 'KI'), ('CaCO3', 'Na2CO3'), ('PbCl2', 'NaCl'), ('Ag2CO3', 'Na2CO3')])
    cat, nc, an, na, ksp = SALTS[s]
    catsrc = {'Ag^+': 'AgNO3', 'Ba^2+': 'Ba(NO3)2', 'Pb^2+': 'Pb(NO3)2', 'Ca^2+': 'Ca(NO3)2'}[cat]
    v1, v2 = R.choice([10, 20, 25, 50, 100]), R.choice([10, 20, 25, 50, 100])
    c1, c2 = R.choice([1e-5, 2e-5, 1e-4, 5e-4, 1e-3, 0.01, 0.05, 0.1]), R.choice([1e-5, 1e-4, 1e-3, 0.002, 0.01, 0.1])
    ca, cb = c1 * v1 / (v1 + v2), c2 * v2 / (v1 + v2)
    Q = ca ** nc * cb ** na
    if abs(math.log10(Q / ksp)) < 0.5: continue
    prompt = f'{v1} mL of {num(c1)} mol L⁻¹ {ch(catsrc)} is mixed with {v2} mL of {num(c2)} mol L⁻¹ {ch(an_src)}. Ksp({ch(s)}) = {num(ksp)}. Does a precipitate form?'
    right = 'Yes, because Q > Ksp' if Q > ksp else 'No, because Q < Ksp'
    addc('sq4', prompt, right, ['Yes, because Q < Ksp' if Q > ksp else 'No, because Q > Ksp', 'No, because Q > Ksp' if Q > ksp else 'Yes, because Q < Ksp',
                                'It depends on the volume of the beaker'], f'After mixing, Q = {Q:.2e} (concentrations diluted into {v1 + v2} mL).')
    add('sq4', f'{v1} mL of {num(c1)} mol L⁻¹ {ch(catsrc)} is mixed with {v2} mL of {num(c2)} mol L⁻¹ {ch(an_src)}. Find the ionic product Q for {ch(s)} straight after mixing.', Q,
        [c1 ** nc * c2 ** na, ca * cb if nc + na > 2 else ca + cb, Q * 4], m(f'\\text{{dilute first: }}c_1 = \\frac{{{tn(c1)} \\times {v1}}}{{{v1 + v2}}}, \\ c_2 = \\frac{{{tn(c2)} \\times {v2}}}{{{v1 + v2}}}'))
for _ in range(30):
    s, src, c = R.choice([('AgCl', 'NaCl', None), ('BaSO4', 'Na2SO4', None), ('CaCO3', 'Na2CO3', None), ('AgBr', 'KBr', None)])
    cat, nc, an, na, ksp = SALTS[s]
    c = R.choice([0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5])
    add('sq5', f'Find the solubility of {ch(s)} in a {c:g} mol L⁻¹ {ch(src)} solution. Ksp = {num(ksp)}.', ksp / c, [math.sqrt(ksp), ksp * c, math.sqrt(ksp / c)],
        m(f'K_{{sp}} = s \\times {c:g} \\Rightarrow s = \\frac{{K_{{sp}}}}{{{c:g}}}'), 'mol L^-1')
    c2 = R.choice([0.01, 0.05, 0.1, 0.2])
    add('sq5', f'Find the solubility of PbI₂ in a {c2:g} mol L⁻¹ KI solution. Ksp = {num(9.8e-9)}.', 9.8e-9 / c2 ** 2, [9.8e-9 / c2, 9.8e-9 / (2 * c2) ** 2, (9.8e-9 / 4) ** (1 / 3)],
        m(f'K_{{sp}} = s({c2:g})^2 \\Rightarrow s = \\frac{{K_{{sp}}}}{{{c2:g}^2}}'), 'mol L^-1')
addc('sq5', 'Adding NaCl to a saturated AgCl solution:', 'makes some AgCl precipitate, lowering [Ag⁺]', ['dissolves more AgCl', 'has no effect', 'increases Ksp'], 'The common ion Cl⁻ shifts the equilibrium towards the solid.')
addc('sq5', 'The common ion effect:', 'lowers the solubility of a salt', ['raises the solubility of a salt', 'changes Ksp', 'only happens with acids'], 'Extra ions of one kind push the dissolving equilibrium back.')


# =====================================================================================================================
# MODULE 6: ACID/BASE REACTIONS
# =====================================================================================================================
lg = math.log10

# ---------- pab: properties of acids and bases ----------
IND = [('litmus', 'red', 'blue'), ('phenolphthalein', 'colourless', 'pink'), ('methyl orange', 'red', 'yellow'), ('bromothymol blue', 'yellow', 'blue')]
COLS = ['red', 'blue', 'colourless', 'pink', 'yellow', 'green', 'purple']
for name, acid, base in IND:
    addc('pab1', f'What colour is {name} in a strongly acidic solution?', acid, pick_wrong(acid, [c for c in COLS if not (acid == 'red' and c == 'pink')]), f'{name.capitalize()}: {acid} in acid, {base} in base.')
    addc('pab1', f'What colour is {name} in a strongly basic solution?', base, pick_wrong(base, [c for c in COLS if not (base == 'pink' and c in ('purple', 'red'))]), f'{name.capitalize()}: {acid} in acid, {base} in base.')
addc('pab1', 'Which is a typical property of a base?', 'It feels slippery and turns red litmus blue', ['It tastes sour', 'It turns blue litmus red', 'It reacts with magnesium to give hydrogen'], 'Bases feel soapy, taste bitter and turn red litmus blue.')
addc('pab1', 'Which is a typical property of an acid?', 'It reacts with carbonates to release carbon dioxide', ['It feels slippery', 'It turns phenolphthalein pink', 'It tastes bitter'], 'Acid + carbonate → salt + water + CO₂.')
addc('pab1', 'A natural indicator, such as red cabbage extract, works because:', 'its pigment changes colour as the pH changes', ['it reacts with all metals', 'it neutralises the solution', 'it is a strong acid'], 'Indicators are weak acids whose acid and conjugate base forms differ in colour.')
addc('pab1', 'An indicator turns yellow in a solution. For bromothymol blue, the solution is:', 'acidic (pH below about 6)', ['basic', 'exactly neutral', 'saturated'], 'Bromothymol blue changes from yellow to blue between pH 6.0 and 7.6.')
ACIDS = [('HCl', 'hydrochloric acid', 'chloride', 1), ('HNO3', 'nitric acid', 'nitrate', 1), ('H2SO4', 'sulfuric acid', 'sulfate', 2), ('CH3COOH', 'ethanoic acid', 'ethanoate', 1)]
METALS = [('Mg', 'magnesium', 2), ('Zn', 'zinc', 2), ('Ca', 'calcium', 2), ('Na', 'sodium', 1), ('K', 'potassium', 1)]
for f, an, salt, _ in ACIDS:
    for sym, mn, _ in (METALS[:3] if f != 'HNO3' else []):
        addc('pab2', f'What are the products when {mn} reacts with {an}?', f'{mn} {salt} and hydrogen gas', [f'{mn} {salt} and water', f'{mn} oxide and hydrogen gas', f'{mn} {salt}, water and carbon dioxide'], 'Acid + reactive metal → salt + hydrogen.')
    for b, bn in [('NaOH', 'sodium'), ('KOH', 'potassium'), ('Ca(OH)2', 'calcium')]:
        addc('pab2', f'{an.capitalize()} is neutralised by {ch(b)}. Name the salt formed.', f'{bn} {salt}', [f'{bn} hydroxide', f'{bn} {R.choice([x[2] for x in ACIDS if x[2] != salt])}', f'hydrogen {salt}'], 'The salt takes the metal from the base and the anion from the acid.')
    for c, cn in [('CaCO3', 'calcium'), ('Na2CO3', 'sodium'), ('MgCO3', 'magnesium')]:
        addc('pab2', f'What are the products when {an} reacts with {ch(c)}?', f'{cn} {salt}, water and carbon dioxide', [f'{cn} {salt} and hydrogen', f'{cn} hydroxide and carbon dioxide', f'{cn} {salt} and water only'], 'Acid + carbonate → salt + water + CO₂.')
for _ in range(40):
    V, c = R.choice([25, 50, 100]), R.choice([0.5, 1.0, 2.0])
    n = c * V / 1000
    dh = -R.choice([55.0, 56.0, 57.0, 57.5, 58.0, 52.0])
    dT = round(-dh * 1000 * n / (2 * V * CW), 1)
    q = 2 * V * CW * dT
    add('pab3', f'{V} mL of {c:g} mol L⁻¹ HCl is mixed with {V} mL of {c:g} mol L⁻¹ NaOH. The temperature rises by {dT} °C. Find the enthalpy of neutralisation. (Assume 1 mL = 1 g and c = 4.18 J g⁻¹ K⁻¹.)',
        -q / n / 1000, [q / n / 1000, -q / 2 / n / 1000, -q / 1000], m(f'q = mc\\Delta T = {2 * V}(4.18)({dT}), \\quad \\Delta H = -\\frac{{q}}{{n}}, \\ n = {n:g}'), 'kJ mol^-1')
addc('pab3', 'Neutralising a weak acid with a strong base usually releases less heat per mole than a strong acid. This is because:', 'some energy is used to ionise the weak acid', ['weak acids have fewer protons', 'the reaction is slower', 'weak acids are endothermic to make'], 'Ionising the weak acid absorbs part of the heat released.')
addc('pab3', 'The enthalpy of neutralisation of any strong acid with a strong base is close to:', '−57 kJ mol⁻¹', ['+57 kJ mol⁻¹', '−286 kJ mol⁻¹', '0 kJ mol⁻¹'], 'It is always H⁺ + OH⁻ → H₂O.')
addc('pab4', 'Lavoisier proposed that all acids contain:', 'oxygen', ['hydrogen', 'hydroxide ions', 'chlorine'], 'He named oxygen "acid-former"; HCl later disproved it.')
addc('pab4', 'Davy showed Lavoisier was wrong by showing that:', 'hydrochloric acid contains no oxygen', ['all acids contain oxygen', 'bases contain hydrogen', 'acids are gases'], 'Davy proposed hydrogen as the key element.')
addc('pab4', 'Arrhenius defined an acid as a substance that:', 'produces H⁺ ions in water', ['donates a proton to any base', 'accepts a proton', 'contains oxygen'], 'Arrhenius: acids give H⁺ and bases give OH⁻ in water.')
addc('pab4', 'A limitation of the Arrhenius theory is that it cannot explain:', 'why ammonia and sodium carbonate are bases', ['why HCl is an acid', 'why NaOH is a base', 'neutralisation of HCl by NaOH'], 'They have no OH⁻ of their own; and reactions outside water are excluded.')
addc('pab4', 'In the Brønsted–Lowry theory, an acid is a:', 'proton donor', ['proton acceptor', 'hydroxide donor', 'electron pair donor'], 'Bases are proton acceptors.')
addc('pab4', 'Which reaction is acid–base by Brønsted–Lowry but not by Arrhenius?', 'NH₃(g) + HCl(g) → NH₄Cl(s)', ['HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)', 'HNO₃(aq) + KOH(aq) → KNO₃(aq) + H₂O(l)', 'H₂SO₄(aq) + 2NaOH(aq) → Na₂SO₄(aq) + 2H₂O(l)'], 'No water and no OH⁻, but a proton moves from HCl to NH₃.')

# ---------- bl: Brønsted–Lowry ----------
PAIRS = [('HCl', 'Cl^-'), ('H2SO4', 'HSO4^-'), ('HSO4^-', 'SO4^2-'), ('H2O', 'OH^-'), ('H3O^+', 'H2O'), ('NH4^+', 'NH3'), ('CH3COOH', 'CH3COO^-'),
         ('H2CO3', 'HCO3^-'), ('HCO3^-', 'CO3^2-'), ('H3PO4', 'H2PO4^-'), ('H2PO4^-', 'HPO4^2-'), ('HPO4^2-', 'PO4^3-'), ('HF', 'F^-'), ('HNO3', 'NO3^-')]
SP = sorted({x for p in PAIRS for x in p})
for a, b in PAIRS:
    addc('bl1', f'What is the conjugate base of {ch(a)}?', ch(b), [ch(x) for x in R.sample([s for s in SP if s not in (a, b)], 3)], 'Remove one H⁺ (and lower the charge by one).')
    addc('bl1', f'What is the conjugate acid of {ch(b)}?', ch(a), [ch(x) for x in R.sample([s for s in SP if s not in (a, b)], 3)], 'Add one H⁺ (and raise the charge by one).')
AMP, NOT = ['HCO3^-', 'H2PO4^-', 'HPO4^2-', 'H2O', 'HSO4^-', 'HS^-'], ['Cl^-', 'NH4^+', 'CO3^2-', 'PO4^3-', 'NO3^-', 'H3O^+', 'SO4^2-']
for a in AMP:
    addc('bl1', 'Which species is amphiprotic?', ch(a), [ch(x) for x in R.sample(NOT, 3)], 'It can both donate and accept a proton.')
addc('bl1', 'In NH₃ + H₂O ⇌ NH₄⁺ + OH⁻, water acts as:', 'an acid', ['a base', 'a catalyst', 'a spectator'], 'Water donates a proton to ammonia.')
addc('bl1', 'In HCl + H₂O → H₃O⁺ + Cl⁻, water acts as:', 'a base', ['an acid', 'a catalyst', 'an oxidant'], 'Water accepts a proton from HCl.')
for _ in range(40):
    c = float(f'{R.choice([1, 2, 3, 5, 8]) * 10 ** -R.choice([1, 2, 3, 4]):.1g}')
    add('bl2', f'Find the pH of a {num(c)} mol L⁻¹ HCl solution.', -lg(c), [lg(c), 14 + lg(c), -lg(c / 10)], m(f'pH = -\\log_{{10}}({tn(c)})'), fmt=PH)
    add('bl2', f'Find the pH of a {num(c)} mol L⁻¹ NaOH solution at 25 °C.', 14 + lg(c), [-lg(c), lg(c), 14 - lg(c) if 14 - lg(c) < 20 else None], m(f'pOH = -\\log({tn(c)}), \\ pH = 14 - pOH'), fmt=PH)
    if c <= 0.1: add('bl2', f'Find the pH of a {num(c)} mol L⁻¹ Ba(OH)₂ solution at 25 °C.', 14 + lg(2 * c), [14 + lg(c), -lg(2 * c), 14 + lg(c / 2)], m(f'[OH^-] = 2 \\times {tn(c)}'), fmt=PH)
    p = round(R.uniform(0.5, 13.5), 2)
    add('bl2', f'A solution has pH {p:.2f}. Find [H⁺].', 10 ** -p, [10 ** -(14 - p), 10 ** p, -lg(p) if p > 1 else 1 / p], m(f'[H^+] = 10^{{-{p:.2f}}}'), 'mol L^-1')
    add('bl2', f'A solution has pH {p:.2f} at 25 °C. Find [OH⁻].', 10 ** -(14 - p), [10 ** -p, 10 ** (14 - p) if p > 4 else 1e-14 * 10 ** -p, 14 - p], m(f'pOH = 14 - {p:.2f}, \\ [OH^-] = 10^{{-pOH}}'), 'mol L^-1')
addc('bl3', 'A "strong" acid is one that:', 'ionises completely in water', ['is very concentrated', 'is very corrosive', 'has a high pH'], 'Strength is about ionisation; concentration is about moles per litre.')
addc('bl3', 'Which acid is weak?', 'ethanoic acid (CH₃COOH)', ['hydrochloric acid', 'nitric acid', 'sulfuric acid'], 'Ethanoic acid only partly ionises.')
addc('bl3', '0.1 mol L⁻¹ HCl and 0.1 mol L⁻¹ CH₃COOH are compared. The HCl:', 'has a lower pH', ['has a higher pH', 'has the same pH', 'needs more NaOH to neutralise'], 'HCl ionises completely, so [H⁺] is higher. Both need the same NaOH.')
addc('bl3', 'Equal volumes of 0.1 mol L⁻¹ HCl and 0.1 mol L⁻¹ CH₃COOH are titrated with NaOH. The volume of NaOH needed is:', 'the same for both', ['larger for HCl', 'larger for CH₃COOH', 'zero for CH₃COOH'], 'Both contain the same moles of acid to neutralise.')
addc('bl3', '10 mol L⁻¹ ethanoic acid is best described as:', 'concentrated and weak', ['dilute and strong', 'concentrated and strong', 'dilute and weak'], 'High concentration, but it still only partly ionises.')
addc('bl3', '0.001 mol L⁻¹ nitric acid is best described as:', 'dilute and strong', ['concentrated and weak', 'concentrated and strong', 'dilute and weak'], 'Low concentration, but it ionises completely.')
addc('bl3', 'Which property is higher for 0.1 mol L⁻¹ HCl than for 0.1 mol L⁻¹ CH₃COOH?', 'electrical conductivity', ['pH', 'the moles of acid', 'the volume of base to neutralise'], 'More ions in solution conduct better.')
addc('bl3', 'As the strength of an acid increases, its conjugate base becomes:', 'weaker', ['stronger', 'unchanged in strength', 'amphiprotic'], 'A strong acid gives up its proton readily, so its conjugate base barely accepts one.')
for _ in range(50):
    ka = float(f'{R.choice([1.8e-5, 1.3e-5, 6.3e-5, 7.2e-4, 4.5e-4, 1.8e-4, 3.0e-8, 6.2e-10, 1.4e-3]):.2g}')
    c = R.choice([0.01, 0.05, 0.1, 0.2, 0.5, 1.0])
    h = math.sqrt(ka * c)
    if h / c > 0.05: continue
    add('bl4', f'A weak acid HA has Ka = {num(ka)}. Find the pH of a {c:g} mol L⁻¹ solution (assume little ionisation).', -lg(h), [-lg(ka * c), -lg(c), -lg(math.sqrt(ka))],
        m(f'[H^+] = \\sqrt{{K_a c}} = \\sqrt{{{tn(ka)} \\times {c:g}}}'), fmt=PH)
    add('bl4', f'Find pKa for an acid with Ka = {num(ka)}.', -lg(ka), [lg(ka), -math.log(ka), 14 + lg(ka)], m(f'pK_a = -\\log_{{10}}({tn(ka)})'), fmt=PH)
    p = round(-lg(h), 2)
    add('bl4', f'A {c:g} mol L⁻¹ solution of a weak acid HA has pH {p:.2f}. Find Ka.', (10 ** -p) ** 2 / c, [10 ** -p / c, (10 ** -p) ** 2, (10 ** -p) ** 2 * c],
        m(f'K_a = \\frac{{[H^+]^2}}{{c}} = \\frac{{(10^{{-{p:.2f}}})^2}}{{{c:g}}}'))
addc('bl4', 'Which acid is the strongest?', 'Ka = 1.4 × 10⁻³', ['Ka = 1.8 × 10⁻⁵', 'Ka = 6.2 × 10⁻¹⁰', 'Ka = 3.0 × 10⁻⁸'], 'A larger Ka (smaller pKa) means more ionisation.')
addc('bl4', 'A smaller pKa means:', 'a stronger acid', ['a weaker acid', 'a more dilute acid', 'a stronger conjugate base'], 'pKa = −log Ka, so small pKa means large Ka.')
BUF = [('CH₃COOH and CH₃COONa', 'ethanoic acid / ethanoate'), ('NH₄Cl and NH₃', 'ammonium / ammonia'), ('H₂CO₃ and NaHCO₃', 'carbonic acid / hydrogen carbonate'), ('NaH₂PO₄ and Na₂HPO₄', 'dihydrogen phosphate / hydrogen phosphate')]
NOBUF = ['HCl and NaCl', 'NaOH and NaCl', 'HNO₃ and KNO₃', 'HCl and NaOH in equal moles', 'H₂SO₄ and Na₂SO₄', 'KOH and KCl']
for b, _ in BUF:
    addc('bl5', 'Which mixture makes a buffer?', b, R.sample(NOBUF, 3), 'A buffer is a weak acid with its conjugate base (or a weak base with its conjugate acid).')
addc('bl5', 'A little HCl is added to a CH₃COOH/CH₃COO⁻ buffer. The pH barely changes because:', 'CH₃COO⁻ reacts with the added H⁺ to form CH₃COOH', ['CH₃COOH reacts with the H⁺', 'the HCl does not ionise', 'water absorbs the H⁺'], 'The conjugate base mops up added acid.')
addc('bl5', 'A little NaOH is added to a CH₃COOH/CH₃COO⁻ buffer. The pH barely changes because:', 'CH₃COOH reacts with the added OH⁻', ['CH₃COO⁻ reacts with the OH⁻', 'NaOH is a weak base', 'the volume increases'], 'The weak acid neutralises added base.')
addc('bl5', 'The main buffer that keeps blood near pH 7.4 is:', 'carbonic acid / hydrogen carbonate', ['hydrochloric acid / chloride', 'sodium hydroxide / water', 'ethanoic acid / ethanoate'], 'H₂CO₃ ⇌ H⁺ + HCO₃⁻.')
addc('bl5', 'A buffer works best when:', 'the weak acid and its conjugate base are in similar, large amounts', ['only the weak acid is present', 'it is very dilute', 'a strong acid is added'], 'Both forms are needed to absorb added acid or base.')
for _ in range(40):
    c, d = R.choice([0.1, 0.05, 0.01, 0.2, 1.0]), R.choice([10, 100, 4, 5, 20, 50])
    add('bl6', f'10.0 mL of {c:g} mol L⁻¹ HCl is diluted to {10 * d:g} mL with water. Find the new pH.', -lg(c / d), [-lg(c), -lg(c * d), -lg(c) + 1 if d != 10 else -lg(c) + 2],
        m(f'c = \\frac{{{c:g} \\times 10.0}}{{{10 * d:g}}}'), fmt=PH)
    va, vb, cc = R.choice([20, 25, 30, 40, 50]), R.choice([10, 15, 20, 24, 35, 45, 55, 60]), R.choice([0.1, 0.2, 0.05])
    if va == vb: continue
    na, nb, Vt = cc * va / 1000, cc * vb / 1000, (va + vb) / 1000
    if na > nb:
        ph = -lg((na - nb) / Vt); w = [-lg((na - nb) / (va / 1000)), -lg(na - nb), 14 + lg((na - nb) / Vt)]
    else:
        ph = 14 + lg((nb - na) / Vt); w = [14 + lg((nb - na) / (vb / 1000)), -lg((nb - na) / Vt), 14 + lg(nb - na)]
    add('bl6', f'{va} mL of {cc:g} mol L⁻¹ HCl is mixed with {vb} mL of {cc:g} mol L⁻¹ NaOH at 25 °C. Find the pH of the mixture.', ph, w,
        m(f'\\text{{excess }}{"H^+" if na > nb else "OH^-"} = {abs(na - nb):.4g}\\text{{ mol in }}{va + vb}\\text{{ mL}}'), fmt=PH)

# ---------- qan: quantitative analysis ----------
TITR = [('HCl', 'NaOH', 1, 1), ('HNO3', 'KOH', 1, 1), ('H2SO4', 'NaOH', 1, 2), ('CH3COOH', 'NaOH', 1, 1), ('HCl', 'Na2CO3', 2, 1), ('H2SO4', 'Na2CO3', 1, 1), ('HCl', 'Ca(OH)2', 2, 1)]
for _ in range(60):
    a, b, ka, kb = R.choice(TITR)
    vt, cb, va = round(R.uniform(12, 28), 2), R.choice([0.100, 0.0950, 0.120, 0.0500, 0.150]), R.choice([20.00, 25.00, 10.00])
    if b == 'Ca(OH)2': cb = R.choice([0.0100, 0.00500])
    nb = cb * vt / 1000
    na = nb * ka / kb
    ca = na / (va / 1000)
    add('qan1', f'A {va:.2f} mL aliquot of {ch(a)} is titrated with {cb:.4g} mol L⁻¹ {ch(b)}. The average titre is {vt:.2f} mL. Find the concentration of the {ch(a)}.', ca,
        [nb / (va / 1000) if ka != kb else ca * 2, ca * kb / ka if ka != kb else ca / 2, cb * vt / va * 1000],
        m(f'n({tx(b)}) = {cb:.4g} \\times {vt / 1000:.5f}, \\ n({tx(a)}) = ' + ('' if ka == kb else f'\\tfrac{{{ka}}}{{{kb}}} \\times ') + f'n({tx(b)}), \\ c = \\frac{{n}}{{{va / 1000:.5f}}}'), 'mol L^-1')
for _ in range(30):
    sname, f, M = R.choice([('anhydrous sodium carbonate', 'Na2CO3', molar('Na2CO3')), ('potassium hydrogen phthalate', 'KHC8H4O4', molar('KHC8H4O4')), ('oxalic acid dihydrate', 'H2C2O4·2H2O', molar('H2C2O4') + 2 * molar('H2O'))])
    c, V = R.choice([0.0500, 0.100, 0.0250, 0.200]), R.choice([100.0, 250.0, 500.0])
    add('qan2', f'What mass of {sname} (M = {M:.2f} g mol⁻¹) is needed to make {V:g} mL of a {c:g} mol L⁻¹ standard solution?', c * V / 1000 * M, [c * V * M, c / (V / 1000) * M, c * V / 1000 / M],
        m(f'm = cVM = {c:g} \\times {V / 1000:g} \\times {M:.2f}'), 'g')
addc('qan2', 'Which substance is suitable as a primary standard?', 'anhydrous sodium carbonate', ['sodium hydroxide', 'concentrated hydrochloric acid', 'calcium hydroxide'], 'It is pure, stable and not hygroscopic. NaOH absorbs water and CO₂.')
addc('qan2', 'Why is sodium hydroxide not used as a primary standard?', 'it absorbs water and carbon dioxide from the air', ['it is too expensive', 'it is a weak base', 'its molar mass is too high'], 'Its mass changes as it sits in air.')
addc('qan2', 'Before a titration, the burette should be rinsed with:', 'the solution it will be filled with', ['distilled water only', 'the other solution', 'ethanol'], 'Water left inside would dilute the solution.')
addc('qan2', 'Before a titration, the conical flask should be rinsed with:', 'distilled water', ['the solution in the burette', 'the solution being pipetted', 'acid'], 'Extra water does not change the moles pipetted in.')
addc('qan2', 'Before use, the pipette should be rinsed with:', 'the solution it will deliver', ['distilled water', 'the titrant', 'nothing'], 'Water would dilute the aliquot.')
addc('qan2', 'A standard solution is prepared in a:', 'volumetric flask', ['beaker', 'conical flask', 'measuring cylinder'], 'It is calibrated to one precise volume.')
addc('qan2', 'A good primary standard should have:', 'a high molar mass', ['a low molar mass', 'a strong smell', 'high reactivity with air'], 'Weighing errors are then a small fraction of the mass.')
CURVE = [('a strong acid with a strong base', 'about 7', 'bromothymol blue'), ('a weak acid with a strong base', 'above 7', 'phenolphthalein'), ('a strong acid with a weak base', 'below 7', 'methyl orange')]
for what, ph, ind in CURVE:
    addc('qan3', f'At the equivalence point of a titration of {what}, the pH is:', ph, [x for x in ['about 7', 'above 7', 'below 7', 'exactly 0'] if x != ph][:3], 'The salt formed decides the pH at equivalence.')
    addc('qan3', f'Which indicator changes colour closest to the equivalence point of a titration of {what}?', ind, [x for x in ['bromothymol blue', 'phenolphthalein', 'methyl orange', 'alizarin yellow (pH 10–12)'] if x != ind][:3], 'Choose the indicator whose colour change range contains the equivalence-point pH.')
addc('qan3', 'The equivalence point on a titration curve is:', 'the middle of the steepest part of the curve', ['where the curve starts', 'where pH = 14', 'the flattest part of the curve'], 'A tiny volume of titrant causes a large pH change there.')
addc('qan3', 'The end point of a titration is:', 'when the indicator changes colour', ['when moles of acid and base are exactly equal', 'when the burette is empty', 'the start of the titration'], 'Ideally it matches the equivalence point.')
addc('qan3', 'For a weak acid titrated with NaOH, at half the equivalence volume:', 'pH = pKa', ['pH = 7', 'pH = 14', 'pH = 0'], 'Half the acid has become its conjugate base, so [HA] = [A⁻].')
addc('qan4', 'In a conductometric titration of HCl with NaOH, the conductivity first:', 'decreases, as fast-moving H⁺ is replaced by slower Na⁺', ['increases', 'stays constant', 'drops to zero'], 'H⁺ conducts far better than Na⁺.')
addc('qan4', 'In a conductometric titration of HCl with NaOH, the equivalence point is:', 'at the minimum conductivity', ['at the maximum conductivity', 'where the graph starts', 'when conductivity is zero'], 'After it, excess OH⁻ raises the conductivity again.')
addc('qan4', 'After the equivalence point of HCl titrated with NaOH, conductivity rises because:', 'excess OH⁻ and Na⁺ ions build up', ['H⁺ ions return', 'water conducts more', 'the salt precipitates'], 'OH⁻ is a highly mobile ion.')
addc('qan4', 'A conductometric titration is especially useful when:', 'the solution is coloured or no suitable indicator exists', ['the acid is strong', 'the solution is colourless', 'a burette is unavailable'], 'No colour change is needed.')
addc('qan4', 'For ethanoic acid titrated with NaOH, conductivity at first:', 'rises slowly, as the weak acid becomes ionic sodium ethanoate', ['falls steeply', 'stays at zero', 'falls then rises at once'], 'A weak acid has few ions to start with.')
for _ in range(30):
    mass = R.choice([0.500, 0.750, 1.00, 1.20, 0.600])
    nh = R.choice([0.0250, 0.0300, 0.0400, 0.0500])
    pur = R.choice([0.72, 0.85, 0.90, 0.95, 0.80])
    ncaco3 = mass * pur / molar('CaCO3')
    nexcess = nh - 2 * ncaco3
    if nexcess <= 0.005: continue
    vt = nexcess / 10 / 0.100 * 1000
    real = (nh - nexcess) / 2 * molar('CaCO3') / mass * 100
    add('qan5', f'A {mass:.3f} g sample of impure CaCO₃ is added to {nh * 1000 / 0.500:.1f} mL of 0.500 mol L⁻¹ HCl (excess). The mixture is made up to 250.0 mL, and a 25.00 mL aliquot of it needs {vt:.2f} mL of 0.100 mol L⁻¹ NaOH. Find the percentage of CaCO₃ in the sample.', real,
        [(nh - nexcess) * molar('CaCO3') / mass * 100, nexcess / 2 * molar('CaCO3') / mass * 100, real / 2 if real / 2 > 5 else None, (nh - nexcess) / 2 * molar('CaCO3') * 100],
        m(f'n(\\text{{HCl left}}) = 10 \\times 0.100 \\times {vt / 1000:.5f}, \\ n(\\text{{HCl reacted}}) = {nh:.4f} - {nexcess:.5f}, \\ n(\\mathrm{{CaCO_3}}) = \\tfrac{{1}}{{2}} \\times \\text{{that}}'), fmt=lambda v: m(f'{v:.1f}\\%'))
addc('qan5', 'A back titration is used when:', 'the substance is insoluble or reacts too slowly to titrate directly', ['the acid is strong', 'there is no burette', 'an indicator is not needed'], 'Excess reagent reacts fully, then the leftover is titrated.')

# =====================================================================================================================
# MODULE 7: ORGANIC CHEMISTRY
# =====================================================================================================================
STEM = {1: 'meth', 2: 'eth', 3: 'prop', 4: 'but', 5: 'pent', 6: 'hex', 7: 'hept', 8: 'oct'}
MULT = {1: '', 2: 'di', 3: 'tri'}
ALKYL = {1: 'methyl', 2: 'ethyl', 3: 'propyl', 4: 'butyl'}


def chain(n):   # CH3CH2CH2... n carbons (n >= 1), as a condensed formula
    return 'CH4' if n == 1 else 'CH3' + 'CH2' * (n - 2) + 'CH3'


# ---------- nm: nomenclature ----------
def alkane(n, subs):
    """subs: positions of methyl groups on a chain of n carbons -> (formula, name, wrong names)"""
    parts = []
    for i in range(1, n + 1):
        k = subs.count(i)
        h = (3 if i in (1, n) else 2) - k
        parts.append('C' + (f'H{h}' if h > 1 else 'H' if h == 1 else '') + ('(CH3)' if k == 1 else f'(CH3){k}' if k else ''))
    f = ''.join(parts)
    a, b = sorted(subs), sorted(n + 1 - s for s in subs)
    pos = min(a, b)
    nm = lambda p, par: f'{",".join(map(str, p))}-{MULT[len(p)]}methyl{STEM[par]}ane'
    name = nm(pos, n)
    wrong = [nm(max(a, b), n) if a != b else nm([x + 1 for x in pos], n), nm(pos, n + 1), nm(pos[:1], n + len(pos) - 1) if len(pos) > 1 else nm([pos[0] + 1], n + 1),
             f'{",".join(map(str, pos))}-{MULT[len(pos)]}ethyl{STEM[n - 1]}ane']
    return f, name, [w for w in dict.fromkeys(wrong) if w != name]


for n in range(4, 8):
    for subs in ([2], [3], [2, 3], [2, 2], [2, 4], [3, 3], [2, 5], [3, 4]):
        if max(subs) >= n or (n == 4 and subs not in ([2], [2, 3], [2, 2])) or (n == 5 and subs == [3, 4]): continue
        f, name, wrong = alkane(n, subs)
        if len(wrong) >= 3:
            addc('nm1', f'Name {ch(f)}.', name, wrong[:3], 'Longest chain for the parent, then number from the end that gives the lowest locants.')
for n in range(4, 8):
    for p in range(1, n // 2 + 1):
        for kind, suf, bond in [('ene', 'ene', '='), ('yne', 'yne', '≡')]:
            if kind == 'ene':
                atoms = ['CH3' if i in (1, n) else 'CH2' for i in range(1, n + 1)]
                atoms[p - 1] = 'CH2' if p == 1 else 'CH'; atoms[p] = 'CH2' if p + 1 == n else 'CH'
            else:
                atoms = ['CH3' if i in (1, n) else 'CH2' for i in range(1, n + 1)]
                atoms[p - 1] = 'CH' if p == 1 else 'C'; atoms[p] = 'CH' if p + 1 == n else 'C'
            f = ''.join(a + (bond if i == p - 1 else '') for i, a in enumerate(atoms))
            name = f'{STEM[n]}-{p}-{suf}'
            wrong = [f'{STEM[n]}-{n - p}-{suf}' if n - p != p else f'{STEM[n]}-{p + 1}-{suf}', f'{STEM[n]}-{p}-{"yne" if suf == "ene" else "ene"}', f'{STEM[n]}ane', f'{STEM[n - 1]}-{p}-{suf}']
            addc('nm1', f'Name {ch(f)}.', name, [w for w in wrong if w != name][:3], 'Number from the end nearer the multiple bond; its first carbon gives the locant.')
for n in range(2, 7):
    # alcohols, aldehydes, ketones, acids, amines, amides, haloalkanes with n carbons
    st = STEM[n]
    fam = {
        'alcohol': (chain(n - 1).replace('CH4', 'CH3') + 'OH' if n > 1 else 'CH3OH', f'{st}an-1-ol' if n > 2 else f'{st}anol'),
        'aldehyde': ('CH3' + 'CH2' * (n - 2) + 'CHO', f'{st}anal'),
        'acid': ('CH3' + 'CH2' * (n - 2) + 'COOH', f'{st}anoic acid'),
        'amine': ('CH3' + 'CH2' * (n - 2) + 'CH2NH2' if n > 1 else 'CH3NH2', f'{st}an-1-amine' if n > 2 else f'{st}anamine'),
        'amide': ('CH3' + 'CH2' * (n - 2) + 'CONH2', f'{st}anamide'),
        'chloro': ('CH3' + 'CH2' * (n - 2) + 'CH2Cl', f'1-chloro{st}ane' if n > 2 else f'chloro{st}ane'),
    }
    if n == 2: fam['alcohol'] = ('CH3CH2OH', 'ethanol'); fam['amine'] = ('CH3CH2NH2', 'ethanamine'); fam['chloro'] = ('CH3CH2Cl', 'chloroethane')
    if n >= 3: fam['amine'] = ('CH3' + 'CH2' * (n - 2) + 'CH2NH2', f'{st}an-1-amine'); fam['alcohol'] = ('CH3' + 'CH2' * (n - 2) + 'CH2OH', f'{st}an-1-ol'); fam['chloro'] = ('CH3' + 'CH2' * (n - 2) + 'CH2Cl', f'1-chloro{st}ane')
    if n >= 4: fam['ketone'] = ('CH3CO' + 'CH2' * (n - 3) + 'CH3', f'{st}an-2-one')
    if n == 3: fam['ketone'] = ('CH3COCH3', 'propanone')
    names = [v[1] for v in fam.values()]
    for k, (f, name) in fam.items():
        addc('nm2', f'Name {ch(f)}.', name, R.sample([x for x in names if x != name], 3), f'Identify the functional group first: {k}.')
    if n >= 3:
        f2 = 'CH3CH(OH)' + 'CH2' * (n - 3) + 'CH3'
        addc('nm2', f'Name {ch(f2)}.', f'{st}an-2-ol', [f'{st}an-1-ol', f'{st}an-2-one', f'{STEM[n - 1]}an-2-ol'], 'The OH is on carbon 2.')
for a in range(1, 5):
    for b in range(1, 4):
        acid = 'HCOO' if a == 1 else ('CH3' + 'CH2' * (a - 2) + 'COO')
        alc = 'CH3' + 'CH2' * (b - 1) if b > 1 else 'CH3'
        alc = 'CH2' * (b - 1) + 'CH3' if b > 1 else 'CH3'
        name = f'{ALKYL[b]} {STEM[a]}anoate'
        wrong = [f'{ALKYL[a]} {STEM[b]}anoate' if a != b else f'{ALKYL[b + 1 if b < 4 else 1]} {STEM[a]}anoate', f'{STEM[a]}yl {STEM[b]}anoate', f'{ALKYL[b]} {STEM[a + b]}anoate', f'{STEM[a + b]}anoic acid']
        wrong = [w for w in dict.fromkeys(wrong) if w != name]
        addc('nm2', f'Name the ester {ch(acid + alc)}.', name, wrong[:3], 'The alkyl group from the alcohol comes first; the acid part (including the C=O carbon) ends in -oate.')
ISO = [('C₄H₁₀', 2), ('C₅H₁₂', 3), ('C₆H₁₄', 5), ('C₃H₇Cl', 2), ('C₂H₆O', 2), ('C₃H₈O', 3), ('C₄H₈ (alkenes only, ignoring cis/trans)', 3)]
for f, k in ISO:
    add('nm3', f'How many structural isomers have the formula {f}?', k, [k + 1, k - 1, k + 2], 'Draw every distinct carbon skeleton and position.', fmt=lambda v: str(int(v)))
for a, b, kind in [('butane', 'methylpropane', 'chain'), ('pentane', '2,2-dimethylpropane', 'chain'), ('propan-1-ol', 'propan-2-ol', 'position'), ('but-1-ene', 'but-2-ene', 'position'),
                   ('1-chloropropane', '2-chloropropane', 'position'), ('propanal', 'propanone', 'functional group'), ('ethanol', 'methoxymethane', 'functional group'),
                   ('propanoic acid', 'methyl ethanoate', 'functional group'), ('pentan-2-one', 'pentan-3-one', 'position'), ('hexane', '2-methylpentane', 'chain')]:
    addc('nm3', f'{a.capitalize()} and {b} are:', f'{kind} isomers', [f'{x} isomers' for x in ['chain', 'position', 'functional group', 'geometric'] if x != kind][:3], 'Same molecular formula, different structures.')

# ---------- hc: hydrocarbons ----------
for n in range(2, 9):
    for fam, h, name in [('alkane', 2 * n + 2, f'{STEM[n]}ane'), ('alkene', 2 * n, f'{STEM[n]}-1-ene' if n > 3 else f'{STEM[n]}ene'), ('alkyne', 2 * n - 2, f'{STEM[n]}-1-yne' if n > 3 else f'{STEM[n]}yne')]:
        fmt = lambda hh: ch(f'C{n}H{hh}')
        addc('hc1', f'What is the molecular formula of {name}?', fmt(h), [fmt(x) for x in dict.fromkeys([h + 2, h - 2, h + 4, h - 4]) if x != h and x > 0][:3], f'{fam.capitalize()}s: Cₙ' + {'alkane': 'H₂ₙ₊₂', 'alkene': 'H₂ₙ', 'alkyne': 'H₂ₙ₋₂'}[fam] + '.')
addc('hc1', 'A hydrocarbon has the formula C₅H₁₀ and decolourises bromine water quickly. It is:', 'an alkene', ['an alkane', 'an alkyne', 'an alcohol'], 'CₙH₂ₙ and reacts by addition.')
addc('hc1', 'A saturated hydrocarbon contains:', 'only single carbon–carbon bonds', ['at least one double bond', 'a triple bond', 'oxygen'], 'Alkanes are saturated.')
addc('hc1', 'Members of a homologous series differ from each other by:', 'CH₂', ['CH₃', 'CH', 'C₂H₄ only'], 'Each member adds one CH₂ unit.')
for _ in range(16):
    ns = R.sample(range(1, 9), 4)
    names = [f'{STEM[n]}ane' for n in ns]
    addc('hc2', 'Which alkane has the highest boiling point?', names[ns.index(max(ns))], [x for x in names if x != names[ns.index(max(ns))]], 'Longer chains have stronger dispersion forces.')
    addc('hc2', 'Which alkane has the lowest boiling point?', names[ns.index(min(ns))], [x for x in names if x != names[ns.index(min(ns))]], 'Shorter chains have weaker dispersion forces.')
addc('hc2', 'Pentane boils at a higher temperature than 2,2-dimethylpropane because:', 'its straight chain has more surface contact, so stronger dispersion forces', ['it has more hydrogen bonds', 'it has a higher molar mass', 'it is polar'], 'Same mass; branching reduces contact.')
addc('hc2', 'Hydrocarbons do not dissolve in water because:', 'they are non-polar and cannot hydrogen bond with water', ['they are ionic', 'they react with water', 'they are too dense'], '"Like dissolves like".')
addc('hc2', 'The only intermolecular forces between alkane molecules are:', 'dispersion forces', ['hydrogen bonds', 'dipole–dipole forces', 'ionic bonds'], 'Alkanes are non-polar.')
addc('hc3', 'Incomplete combustion of hydrocarbons is dangerous because it produces:', 'carbon monoxide', ['oxygen', 'water vapour only', 'nitrogen'], 'CO is colourless, odourless and toxic.')
addc('hc3', 'Burning fossil-fuel hydrocarbons contributes to climate change by releasing:', 'carbon dioxide', ['oxygen', 'nitrogen', 'argon'], 'CO₂ is a greenhouse gas.')
addc('hc3', 'Short-chain hydrocarbons such as butane need careful storage because they are:', 'volatile and highly flammable', ['corrosive acids', 'radioactive', 'strong oxidants'], 'Their vapours ignite easily.')
addc('hc3', 'Benzene is handled in a fume hood because it is:', 'carcinogenic', ['non-flammable', 'a strong acid', 'odourless and harmless'], 'Long-term exposure causes cancer.')

# ---------- prh: reactions of hydrocarbons ----------
ADD = [('ethene', {'H2': 'ethane', 'Br2': '1,2-dibromoethane', 'Cl2': '1,2-dichloroethane', 'HCl': 'chloroethane', 'HBr': 'bromoethane', 'H2O': 'ethanol'}),
       ('but-2-ene', {'H2': 'butane', 'Br2': '2,3-dibromobutane', 'Cl2': '2,3-dichlorobutane', 'HCl': '2-chlorobutane', 'HBr': '2-bromobutane', 'H2O': 'butan-2-ol'}),
       ('hex-3-ene', {'H2': 'hexane', 'Br2': '3,4-dibromohexane', 'Cl2': '3,4-dichlorohexane', 'HCl': '3-chlorohexane', 'HBr': '3-bromohexane', 'H2O': 'hexan-3-ol'}),
       ('cyclohexene', {'H2': 'cyclohexane', 'Br2': '1,2-dibromocyclohexane', 'Cl2': '1,2-dichlorocyclohexane', 'HCl': 'chlorocyclohexane', 'HBr': 'bromocyclohexane', 'H2O': 'cyclohexanol'}),
       ('propene', {'H2': 'propane', 'Br2': '1,2-dibromopropane', 'Cl2': '1,2-dichloropropane'})]
RNAME = {'H2': 'hydrogen (Ni or Pt catalyst)', 'Br2': 'bromine', 'Cl2': 'chlorine', 'HCl': 'hydrogen chloride', 'HBr': 'hydrogen bromide', 'H2O': 'water (acid catalyst)'}
for alk, prods in ADD:
    pool = list(prods.values()) + (['propan-2-ol', 'propyne'] if alk == 'propene' else [])
    for r, p in prods.items():
        addc('prh1', f'What is the main product when {alk} reacts with {RNAME[r]}?', p, R.sample([x for x in pool if x != p], 3), 'Addition across the double bond: one group adds to each carbon.')
addc('prh1', 'Alkenes undergo addition reactions because:', 'the double bond can open to bond to new atoms', ['they have no hydrogen', 'they are saturated', 'they are ionic'], 'The weaker π bond breaks.')
addc('prh1', 'Hydrogenation of an alkene needs:', 'a nickel, platinum or palladium catalyst', ['UV light', 'concentrated NaOH', 'no catalyst'], 'H₂ adds across C=C on a metal catalyst.')
for alk, n in [('methane', 1), ('ethane', 2), ('propane', 3)]:
    p = 'chloromethane' if n == 1 else f'chloro{STEM[n]}ane' if n == 2 else '1-chloropropane (and 2-chloropropane)'
    addc('prh2', f'{alk.capitalize()} reacts with chlorine in UV light. The products are:', f'{p} and hydrogen chloride', [f'{p} only', f'{p} and hydrogen', f'{alk} and HCl'], 'Substitution: one H is swapped for Cl, releasing HCl.')
addc('prh2', 'Alkanes react with halogens by:', 'substitution, in UV light', ['addition, in the dark', 'condensation', 'neutralisation'], 'There is no double bond to add across.')
addc('prh2', 'Why does chlorination of an alkane give a mixture of products?', 'more than one hydrogen can be substituted, and at different positions', ['the reaction is reversible', 'chlorine is a catalyst', 'UV light breaks the alkane'], 'Further substitution keeps happening.')
addc('prh2', 'Alkanes are much less reactive than alkenes because:', 'their C–C and C–H single bonds are strong and non-polar', ['they have double bonds', 'they are ionic', 'they are gases'], 'There is no reactive π bond.')
addc('prh3', 'Bromine water is added to cyclohexene. It turns from:', 'orange-brown to colourless quickly', ['colourless to orange', 'orange to purple', 'stays orange'], 'Br₂ adds across the double bond.')
addc('prh3', 'Bromine water is added to cyclohexane in the dark. It:', 'stays orange-brown', ['decolourises immediately', 'turns purple', 'turns green'], 'Alkanes only react with bromine slowly, in UV light.')
addc('prh3', 'Which test tells hexane from hex-1-ene?', 'Add bromine water: only hex-1-ene decolourises it quickly', ['Add litmus', 'Add sodium carbonate', 'Measure the density'], 'Addition across C=C removes the colour.')
addc('prh3', 'Acidified potassium permanganate added to an alkene:', 'changes from purple to colourless', ['turns orange', 'stays purple', 'turns blue'], 'The alkene is oxidised.')

# ---------- al: alcohols ----------
CLASS = [('ethanol', 'primary'), ('propan-1-ol', 'primary'), ('butan-1-ol', 'primary'), ('propan-2-ol', 'secondary'), ('butan-2-ol', 'secondary'), ('pentan-3-ol', 'secondary'),
         ('2-methylpropan-2-ol', 'tertiary'), ('2-methylbutan-2-ol', 'tertiary'), ('3-methylpentan-3-ol', 'tertiary'), ('cyclohexanol', 'secondary'), ('2-methylpropan-1-ol', 'primary')]
for a, k in CLASS:
    addc('al1', f'{a.capitalize()} is a:', f'{k} alcohol', [f'{x} alcohol' for x in ['primary', 'secondary', 'tertiary', 'quaternary'] if x != k], 'Count the carbons bonded to the carbon holding the OH.')
addc('al1', 'Alcohols have higher boiling points than alkanes of similar mass because:', 'they hydrogen bond through their OH group', ['they are ionic', 'they have more electrons', 'they are non-polar'], 'O–H…O hydrogen bonds are much stronger than dispersion forces.')
addc('al1', 'As the chain length of an alcohol increases, its solubility in water:', 'decreases', ['increases', 'stays the same', 'becomes infinite'], 'The non-polar chain outweighs the OH group.')
ALC = [('methanol', 'CH3OH'), ('ethanol', 'C2H5OH'), ('propan-1-ol', 'C3H7OH'), ('butan-1-ol', 'C4H9OH'), ('pentan-1-ol', 'C5H11OH')]
for _ in range(50):
    name, f = R.choice(ALC)
    Mm = molar(f)
    ma, mw = round(R.uniform(0.40, 1.60), 2), R.choice([100, 150, 200, 250])
    dHc = {'methanol': 726, 'ethanol': 1367, 'propan-1-ol': 2021, 'butan-1-ol': 2676, 'pentan-1-ol': 3329}[name] * R.choice([0.45, 0.55, 0.6, 0.7])
    dT = round(dHc * 1000 * ma / Mm / (mw * CW), 1)
    q = mw * CW * dT
    add('al2', f'Burning {ma:.2f} g of {name} heats {mw} g of water by {dT} °C. Find its experimental enthalpy of combustion. (c = 4.18 J g⁻¹ K⁻¹)', -q / (ma / Mm) / 1000,
        [q / (ma / Mm) / 1000, -q / 1000, -ma * CW * dT / (ma / Mm) / 1000, -q * ma / Mm / 1000],
        m(f'q = {mw}(4.18)({dT}), \\ n = \\frac{{{ma:.2f}}}{{{Mm:.2f}}}, \\ \\Delta H = -\\frac{{q}}{{n}}'), 'kJ mol^-1')
    dh = {'methanol': 726, 'ethanol': 1367, 'propan-1-ol': 2021, 'butan-1-ol': 2676, 'pentan-1-ol': 3329}[name]
    mg = R.choice([1.0, 2.5, 5.0, 10.0, 0.50])
    add('al2', f'The enthalpy of combustion of {name} is −{dh} kJ mol⁻¹. How much heat is released when {mg:g} g burns completely?', mg / Mm * dh, [mg * dh, dh / mg, mg * Mm * dh / 1000],
        m(f'n = \\frac{{{mg:g}}}{{{Mm:.2f}}}, \\ q = n \\times {dh}'), 'kJ')
addc('al2', 'Experimental enthalpies of combustion of alcohols are usually less negative than the data book value mainly because:', 'heat is lost to the surroundings', ['the alcohol is too pure', 'water has a high specific heat', 'too much oxygen is present'], 'Plus incomplete combustion and soot on the can.')
addc('al2', 'Down the alcohol series, the enthalpy of combustion becomes:', 'more negative, by roughly the same amount for each CH₂', ['less negative', 'unchanged', 'positive'], 'Each extra CH₂ adds about −650 kJ mol⁻¹.')
OX = [('ethanol (heated under reflux with excess oxidant)', 'ethanoic acid'), ('propan-1-ol (heated under reflux with excess oxidant)', 'propanoic acid'),
      ('propan-1-ol (distilled off as it forms)', 'propanal'), ('ethanol (distilled off as it forms)', 'ethanal'), ('propan-2-ol', 'propanone'), ('butan-2-ol', 'butan-2-one'),
      ('2-methylpropan-2-ol', 'no reaction'), ('cyclohexanol', 'cyclohexanone'), ('butan-1-ol (heated under reflux with excess oxidant)', 'butanoic acid')]
OXP = [p for _, p in OX] + ['an alkene', 'carbon dioxide only']
for a, p in OX:
    addc('al3', f'{a.capitalize()} is oxidised with acidified potassium dichromate. The organic product is:', p, R.sample([x for x in OXP if x != p], 3), 'Primary → aldehyde → carboxylic acid; secondary → ketone; tertiary → no reaction.')
addc('al3', 'Acidified potassium dichromate oxidising an alcohol changes colour from:', 'orange to green', ['green to orange', 'purple to colourless', 'blue to red'], 'Cr₂O₇²⁻ (orange) is reduced to Cr³⁺ (green).')
addc('al3', 'Which alcohol does not react with acidified potassium dichromate?', '2-methylpropan-2-ol', ['ethanol', 'propan-2-ol', 'butan-1-ol'], 'Tertiary alcohols have no H on the carbon bearing the OH.')
for _ in range(25):
    mg = R.choice([90.0, 180, 360, 500, 1000, 250, 45.0])
    add('al4', f'Glucose ferments: C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂. What mass of ethanol can {mg:g} g of glucose produce?', mg / molar('C6H12O6') * 2 * molar('C2H5OH'),
        [mg / molar('C6H12O6') * molar('C2H5OH'), mg / molar('C6H12O6') * 2 * molar('CO2'), mg * 2 * molar('C2H5OH') / 1000 * 10 ** 0 / molar('C6H12O6') * 3],
        m(f'n(\\text{{glucose}}) = \\frac{{{mg:g}}}{{180.16}}, \\ n(\\text{{ethanol}}) = 2n'), 'g')
    v = R.choice([2.00, 5.00, 10.0, 24.79 / 2])
    add('al4', f'What volume of CO₂ at 25 °C and 100 kPa is produced when {mg:g} g of glucose ferments completely? (Molar volume 24.79 L)', mg / molar('C6H12O6') * 2 * VM25,
        [mg / molar('C6H12O6') * VM25, mg / molar('C6H12O6') * 2 * 22.71, mg / molar('C6H12O6') * 6 * VM25], m(f'n(\\mathrm{{CO_2}}) = 2 \\times \\frac{{{mg:g}}}{{180.16}}, \\ V = n \\times 24.79'), 'L')
addc('al4', 'Fermentation of glucose needs:', 'yeast, no oxygen and a temperature of about 30–40 °C', ['UV light and chlorine', 'concentrated sulfuric acid at 170 °C', 'a nickel catalyst'], 'Yeast enzymes work anaerobically at warm temperatures.')
addc('al4', 'Fermentation stops at about 15% ethanol because:', 'higher ethanol concentrations kill the yeast', ['all the glucose has turned to CO₂', 'the temperature is too low', 'the ethanol evaporates'], 'Distillation is needed for higher concentrations.')
addc('al4', 'Ethanol is made industrially from ethene by:', 'hydration with steam over a phosphoric acid catalyst', ['fermentation', 'substitution with chlorine', 'dehydration'], 'C₂H₄ + H₂O → C₂H₅OH.')
addc('al4', 'Heating ethanol with concentrated sulfuric acid produces:', 'ethene (dehydration)', ['ethanoic acid', 'chloroethane', 'ethyl ethanoate'], 'Water is removed to form the double bond.')
addc('al4', 'Propan-1-ol reacts with HBr to form:', '1-bromopropane (substitution)', ['propene', 'propanal', 'propanoic acid'], 'The OH is replaced by Br.')
addc('al4', 'Ethanol is described as a renewable fuel when it is made by:', 'fermenting plant sugars', ['hydrating ethene from crude oil', 'cracking petrol', 'burning coal'], 'The plants can be regrown.')

# ---------- oab: organic acids and bases ----------
for n in range(2, 6):
    st = STEM[n]
    group = [(f'{st}ane', 0), (f'{st}anal', 1), (f'{st}an-1-ol' if n > 2 else 'ethanol', 2), (f'{st}anoic acid', 3)]
    addc('oab1', 'Which has the highest boiling point?', group[3][0], [g[0] for g in group[:3]], 'Carboxylic acids form two hydrogen bonds per pair (dimers).')
    addc('oab1', 'Which has the lowest boiling point?', group[0][0], [g[0] for g in group[1:]], 'Alkanes only have dispersion forces.')
addc('oab1', 'Ethanol (46 g mol⁻¹) boils far above propane (44 g mol⁻¹) because:', 'ethanol hydrogen bonds; propane only has dispersion forces', ['ethanol is heavier', 'propane is ionic', 'ethanol is non-polar'], 'Similar mass, very different intermolecular forces.')
addc('oab1', 'Propan-1-ol boils higher than propan-1-amine because:', 'O–H hydrogen bonds are stronger than N–H hydrogen bonds', ['the amine is heavier', 'amines are ionic', 'alcohols are non-polar'], 'Oxygen is more electronegative than nitrogen.')
addc('oab1', 'Which is most soluble in water?', 'ethanoic acid', ['hexanoic acid', 'hexane', 'octan-1-ol'], 'Short chains with polar groups dissolve best.')
addc('oab1', 'Amides have high boiling points because they:', 'form several hydrogen bonds through N–H and C=O', ['are ionic', 'are non-polar', 'have low molar masses'], 'Both groups take part in hydrogen bonding.')
for a in range(1, 5):
    for b in range(1, 4):
        acidn = f'{STEM[a]}anoic acid'; alcn = f'{STEM[b]}anol' if b < 3 else f'{STEM[b]}an-1-ol'
        name = f'{ALKYL[b]} {STEM[a]}anoate'
        wrong = [f'{ALKYL[a]} {STEM[b]}anoate' if a != b else f'{ALKYL[b]} {STEM[a + 1]}anoate', f'{STEM[a + b]}anoic acid', f'{ALKYL[b]} {STEM[a]}anoate and hydrogen']
        addc('oab2', f'{acidn.capitalize()} reacts with {alcn} (concentrated H₂SO₄ catalyst). Name the ester formed.', name, wrong, 'Alcohol part first (as an alkyl), acid part last (-oate). Water is also formed.')
addc('oab2', 'Esterification is heated under reflux to:', 'heat it for a long time without losing volatile reactants or products', ['remove the water as it forms', 'cool the mixture', 'stop the reaction'], 'Vapour condenses and runs back into the flask.')
addc('oab2', 'In esterification, concentrated sulfuric acid:', 'catalyses the reaction and absorbs water, raising the yield', ['is a reactant that ends up in the ester', 'neutralises the alcohol', 'is not needed'], 'Removing water shifts the equilibrium right.')
addc('oab2', 'After esterification, the crude ester is washed with sodium carbonate solution to:', 'remove leftover acid', ['remove leftover alcohol', 'dry the ester', 'turn it into soap'], 'Acid reacts and fizzes away as CO₂.')
addc('oab2', 'Esterification is:', 'a reversible condensation reaction', ['an addition reaction', 'a substitution with HCl', 'non-reversible'], 'Water is eliminated as the ester forms.')
addc('oab3', 'Soap is made by:', 'heating a fat or oil with sodium hydroxide (saponification)', ['fermenting sugar', 'reacting ethene with water', 'hydrogenating an oil'], 'Products: glycerol and sodium salts of fatty acids.')
addc('oab3', 'A soap molecule has:', 'a polar, ionic head and a long non-polar tail', ['two ionic ends', 'no polar parts', 'a non-polar head and an ionic tail only on one carbon'], 'The tail dissolves in grease; the head dissolves in water.')
addc('oab3', 'Soap cleans grease by forming:', 'micelles, with tails in the grease and heads facing the water', ['a precipitate with the grease', 'a gas', 'covalent bonds to the grease'], 'The grease is carried away inside micelles.')
addc('oab3', 'In hard water, soap forms scum because:', 'Ca²⁺ and Mg²⁺ ions precipitate the soap anions', ['the water is acidic', 'the soap evaporates', 'chloride ions react with the tail'], 'Synthetic detergents avoid this.')
addc('oab3', 'Which type of detergent is used in fabric softeners and has antibacterial properties?', 'cationic', ['anionic', 'non-ionic', 'soap'], 'A positive head clings to negatively charged fabric.')
addc('oab3', 'Which type of detergent is low-foaming and used in dishwasher powder?', 'non-ionic', ['anionic', 'cationic', 'soap'], 'No charged head, so little foam.')
addc('oab4', 'Ethanamine acts as a base because:', 'the lone pair on nitrogen accepts a proton', ['it releases OH⁻ from its structure', 'it donates H⁺', 'it contains oxygen'], 'CH₃CH₂NH₂ + H₂O ⇌ CH₃CH₂NH₃⁺ + OH⁻.')
addc('oab4', 'Ethanoic acid reacts with sodium hydroxide to form:', 'sodium ethanoate and water', ['ethyl sodium and water', 'ethanol and sodium oxide', 'sodium ethanoate and hydrogen'], 'A neutralisation reaction.')
addc('oab4', 'Carboxylic acids are weak acids because:', 'only a small fraction of molecules ionise in water', ['they contain carbon', 'they are insoluble', 'they cannot donate protons'], 'The equilibrium lies well to the left.')
addc('oab4', 'An amide forms when a carboxylic acid reacts with:', 'an amine', ['an alcohol', 'an alkene', 'a haloalkane'], 'A condensation reaction that releases water.')
addc('oab4', 'Methanamine dissolved in water turns red litmus:', 'blue', ['red', 'colourless', 'green'], 'Amines are weak bases.')

# ---------- po: polymers ----------
POLY = [('polyethylene (polyethene)', 'ethene', 'CH2=CH2'), ('polyvinyl chloride (PVC)', 'chloroethene (vinyl chloride)', 'CH2=CHCl'), ('polystyrene', 'styrene (phenylethene)', 'CH2=CHC6H5'),
        ('polytetrafluoroethylene (PTFE)', 'tetrafluoroethene', 'CF2=CF2'), ('polypropylene', 'propene', 'CH2=CHCH3')]
mons = [p[1] for p in POLY]
for poly, mon, f in POLY:
    addc('po1', f'What is the monomer of {poly}?', mon, R.sample([x for x in mons if x != mon], 3), 'Addition polymers are made from alkene monomers.')
for _ in range(25):
    poly, mon, f = R.choice(POLY)
    Mm = molar(f.replace('=', '').replace('C6H5', 'C6H5'))
    k = R.choice([500, 1000, 2000, 5000, 8000, 12000])
    add('po1', f'A sample of {poly.split(" (")[0]} has an average molar mass of {k * Mm:,.0f} g mol⁻¹. About how many monomer units are in each chain? (M of monomer = {Mm:.2f} g mol⁻¹)', k,
        [k * 2, k / 2, k * Mm / 12.01], m(f'\\frac{{{k * Mm:.0f}}}{{{Mm:.2f}}}'), fmt=lambda v: m(f'{v:,.0f}'.replace(',', '{,}')))
addc('po1', 'Addition polymerisation:', 'joins alkene monomers by opening their double bonds, with no other product', ['releases water as each link forms', 'needs two different monomers', 'joins alkanes end to end'], 'The polymer is the only product.')
addc('po2', 'Condensation polymerisation:', 'joins monomers with two functional groups each, releasing a small molecule such as water', ['joins alkenes through their double bonds', 'only happens in UV light', 'releases no by-product'], 'Each new link gives off H₂O (or HCl).')
addc('po2', 'Nylon is an example of a:', 'polyamide', ['polyester', 'addition polymer', 'polyalkene'], 'Diamine + dicarboxylic acid → amide links.')
addc('po2', 'Polyethylene terephthalate (PET) is a:', 'polyester', ['polyamide', 'addition polymer', 'polyalkene'], 'Diol + dicarboxylic acid → ester links.')
addc('po2', 'Which pair of monomers can form a polyester?', 'a diol and a dicarboxylic acid', ['ethene and propene', 'a diamine and an alkene', 'two alkanes'], 'Each monomer needs two reactive ends.')
addc('po2', 'Proteins are natural condensation polymers made from:', 'amino acids, joined by amide (peptide) links', ['glucose units', 'ethene', 'fatty acids'], 'Each link releases water.')
addc('po2', 'Cellulose and starch are condensation polymers of:', 'glucose', ['amino acids', 'ethene', 'glycerol'], 'Glucose units join with the loss of water.')
addc('po3', 'Low-density polyethylene (LDPE) is softer than HDPE because:', 'its chains are branched and cannot pack closely', ['its chains are cross-linked', 'it has stronger dispersion forces', 'it contains chlorine'], 'Branching lowers density and strength.')
addc('po3', 'PTFE is used to coat non-stick pans because it is:', 'very unreactive with a low-friction surface', ['a good conductor', 'water soluble', 'easily oxidised'], 'Strong C–F bonds make it inert.')
addc('po3', 'PVC is used for water pipes because it is:', 'rigid, durable and resistant to water and chemicals', ['transparent and soft', 'a conductor', 'biodegradable'], 'The polar C–Cl bonds make it stiffer than polyethylene.')
addc('po3', 'Polystyrene foam is a good insulator because:', 'it contains trapped gas bubbles', ['it conducts heat', 'it is a metal', 'it is dense'], 'Gas conducts heat poorly.')
addc('po3', 'Thermoplastic polymers soften on heating because:', 'their chains are held by weak forces, not cross-links', ['their chains are cross-linked', 'they decompose', 'they are ionic'], 'Thermosets, with cross-links, char instead.')

# =====================================================================================================================
# MODULE 8: APPLYING CHEMICAL IDEAS
# =====================================================================================================================

# ---------- ai: analysis of inorganic substances ----------
FLAME = [('sodium', 'yellow-orange'), ('potassium', 'lilac'), ('calcium', 'brick red'), ('copper', 'blue-green'), ('barium', 'pale green'), ('lithium', 'crimson')]
fc = [c for _, c in FLAME]
for ion, c in FLAME:
    addc('ai1', f'What colour flame do {ion} ions give?', c, R.sample([x for x in fc if x != c], 3), 'Electrons drop between energy levels, emitting light of set wavelengths.')
    addc('ai1', f'A compound gives a {c} flame. Which metal ion is present?', ion, R.sample([i for i, _ in FLAME if i != ion], 3), 'Each metal has its own emission spectrum.')
PPT = [('Cl⁻', 'silver nitrate', 'a white precipitate'), ('SO₄²⁻', 'barium nitrate', 'a white precipitate'), ('CO₃²⁻', 'dilute acid', 'bubbles of a gas that turns limewater milky'),
       ('Fe³⁺', 'sodium hydroxide', 'a red-brown precipitate'), ('Cu²⁺', 'sodium hydroxide', 'a pale blue precipitate'), ('Fe²⁺', 'sodium hydroxide', 'a green precipitate'),
       ('Pb²⁺', 'potassium iodide', 'a bright yellow precipitate'), ('I⁻', 'lead(II) nitrate', 'a bright yellow precipitate'), ('PO₄³⁻', 'ammonium molybdate (in acid)', 'a yellow precipitate'),
       ('Ba²⁺', 'dilute sulfuric acid', 'a white precipitate')]
CLASH = {'Pb²⁺': ('I⁻',), 'I⁻': ('Pb²⁺',), 'Cl⁻': ('CO₃²⁻',), 'SO₄²⁻': ('CO₃²⁻', 'Ba²⁺', 'PO₄³⁻'), 'Ba²⁺': ('Pb²⁺', 'SO₄²⁻')}
for ion, reag, obs in PPT:
    addc('ai1', f'Adding {reag} to a solution gives {obs}. Which ion does this test show?', ion, R.sample([i for i, _, _ in PPT if i != ion and i not in CLASH.get(ion, ())], 3), f'{ion}: {reag} gives {obs}.')
addc('ai1', 'Why are anions often tested in the order carbonate, sulfate, then chloride?', 'each test removes or avoids ions that would give a false positive in the next', ['it is alphabetical', 'chloride is the most common', 'sulfate reacts with acid'], 'e.g. carbonate also precipitates with Ag⁺ and Ba²⁺.')
for _ in range(40):
    kind = R.choice(['Cl', 'SO4', 'Cl', 'SO4', 'Fe'])
    ms, mp = round(R.uniform(0.400, 2.500), 3), None
    if kind == 'Cl':
        frac = R.uniform(0.2, 0.6); mp = round(ms * frac * molar('AgCl') / AM['Cl'], 3)
        pct = mp * AM['Cl'] / molar('AgCl') / ms * 100
        add('ai2', f'A {ms:.3f} g sample is dissolved and excess AgNO₃ is added. The dried AgCl weighs {mp:.3f} g. Find the percentage of chloride in the sample.', pct,
            [mp / ms * 100, mp * AM['Ag'] / molar('AgCl') / ms * 100, mp * AM['Cl'] / molar('AgCl') * 100], m(f'm(\\mathrm{{Cl}}) = {mp:.3f} \\times \\frac{{35.45}}{{{molar("AgCl"):.2f}}}'), fmt=lambda v: m(f'{v:.1f}\\%'))
    elif kind == 'SO4':
        frac = R.uniform(0.1, 0.4); mp = round(ms * frac * molar('BaSO4') / AM['S'], 3)
        pct = mp * AM['S'] / molar('BaSO4') / ms * 100
        add('ai2', f'The sulfur in a {ms:.3f} g sample of fertiliser is precipitated as BaSO₄, which weighs {mp:.3f} g. Find the percentage of sulfur in the fertiliser.', pct,
            [mp * molar('SO4') / molar('BaSO4') / ms * 100, mp / ms * 100, mp * AM['S'] / molar('BaSO4') * 100], m(f'm(\\mathrm{{S}}) = {mp:.3f} \\times \\frac{{32.07}}{{{molar("BaSO4"):.2f}}}'), fmt=lambda v: m(f'{v:.1f}\\%'))
        pct2 = mp * molar('SO4') / molar('BaSO4') / ms * 100
        add('ai2', f'The sulfate in a {ms:.3f} g sample is precipitated as BaSO₄, which weighs {mp:.3f} g. Find the percentage of sulfate (SO₄²⁻) in the sample.', pct2,
            [pct, mp / ms * 100, mp * molar('SO4') / molar('BaSO4') * 100], m(f'm(\\mathrm{{SO_4}}) = {mp:.3f} \\times \\frac{{96.07}}{{{molar("BaSO4"):.2f}}}'), fmt=lambda v: m(f'{v:.1f}\\%'))
    else:
        frac = R.uniform(0.05, 0.3); mp = round(ms * frac * molar('Fe2O3') / (2 * AM['Fe']), 3)
        pct = mp * 2 * AM['Fe'] / molar('Fe2O3') / ms * 100
        add('ai2', f'The iron in a {ms:.3f} g ore sample is converted to Fe₂O₃, which weighs {mp:.3f} g. Find the percentage of iron in the ore.', pct,
            [mp * AM['Fe'] / molar('Fe2O3') / ms * 100, mp / ms * 100, mp * 2 * AM['Fe'] / molar('Fe2O3') * 100], m(f'm(\\mathrm{{Fe}}) = {mp:.3f} \\times \\frac{{2 \\times 55.85}}{{{molar("Fe2O3"):.2f}}}'), fmt=lambda v: m(f'{v:.1f}\\%'))
addc('ai2', 'In gravimetric analysis, the precipitate is washed with distilled water to:', 'remove soluble impurities that would add to its mass', ['dissolve it', 'make it react faster', 'add mass'], 'Only the pure precipitate should be weighed.')
addc('ai2', 'The precipitate is dried to constant mass to make sure:', 'all the water has been removed', ['it has reacted fully with air', 'it has cooled', 'the filter paper is dry only'], 'Leftover water makes the mass too high.')
addc('ai2', 'If some fine precipitate passes through the filter paper, the calculated percentage will be:', 'too low', ['too high', 'unaffected', 'exactly double'], 'Less precipitate is weighed.')
for _ in range(30):
    va, vt, c = R.choice([10.00, 20.00, 25.00]), round(R.uniform(10, 26), 2), R.choice([0.0500, 0.100, 0.0200])
    n = c * vt / 1000
    add('ai3', f'A {va:.2f} mL water sample is titrated with {c:g} mol L⁻¹ AgNO₃ (Mohr method). The titre is {vt:.2f} mL. Find the chloride concentration in mol L⁻¹.', n / (va / 1000),
        [c * va / vt, n, n / (va / 1000) * 2], m(f'n(\\mathrm{{Ag^+}}) = n(\\mathrm{{Cl^-}}) = {c:g} \\times {vt / 1000:.5f}'), 'mol L^-1')
    add('ai3', f'A {va:.2f} mL water sample is titrated with {c:g} mol L⁻¹ AgNO₃. The titre is {vt:.2f} mL. Find the chloride concentration in mg L⁻¹ (ppm).', n / (va / 1000) * AM['Cl'] * 1000,
        [n / (va / 1000) * molar('NaCl') * 1000, n / (va / 1000) * AM['Cl'], n * AM['Cl'] * 1000], m(f'c \\times 35.45 \\times 1000'), 'mg L^-1')
addc('ai3', 'In the Mohr method, the end point is seen when:', 'a red-brown precipitate of silver chromate first stays', ['the solution turns blue', 'all bubbles stop', 'a white precipitate first appears'], 'Ag₂CrO₄ forms only once nearly all Cl⁻ has precipitated.')
addc('ai3', 'The Mohr method is used to find the concentration of:', 'chloride ions', ['sulfate ions', 'hydrogen ions', 'sodium ions'], 'Cl⁻ is titrated with Ag⁺.')
for _ in range(40):
    c1, a1 = R.choice([2.0, 4.0, 5.0, 10.0, 20.0]), round(R.uniform(0.15, 0.60), 3)
    a2 = round(a1 * R.uniform(0.3, 1.6), 3)
    d = R.choice([1, 1, 10, 5, 20])
    cs = a2 * c1 / a1 * d
    add('ai4', f'A {c1:g} ppm standard gives an absorbance of {a1:.3f}; the calibration line goes through the origin. A sample{f" diluted by a factor of {d}" if d > 1 else ""} gives an absorbance of {a2:.3f}. Find the concentration of the {"original " if d > 1 else ""}sample.',
        cs, [a2 * c1 / a1 if d > 1 else a1 * c1 / a2, a2 / a1 / c1 * d, a1 * c1 / a2 * d], m(f'c = \\frac{{{a2:.3f}}}{{{a1:.3f}}} \\times {c1:g}' + (f' \\times {d}' if d > 1 else '')), 'ppm')
    mg, V = R.choice([0.5, 1.2, 2.5, 4.0, 15.0]), R.choice([0.25, 0.50, 1.00, 2.00])
    add('ai4', f'A {V:g} L water sample contains {mg:g} mg of lead. Find the lead concentration in ppm.', mg / V, [mg * V, mg / V / 1000, mg / V * 1000], m(f'1\\text{{ ppm}} = 1\\text{{ mg L}}^{{-1}}: \\ \\frac{{{mg:g}}}{{{V:g}}}'), 'ppm')
addc('ai4', 'Atomic absorption spectroscopy (AAS) uses a lamp made of:', 'the same element being measured', ['tungsten for every element', 'any metal', 'mercury only'], 'Only that element\'s atoms absorb its exact wavelengths.')
addc('ai4', 'AAS is mainly used to measure:', 'very low concentrations of metal ions', ['the pH of solutions', 'organic functional groups', 'the mass of a precipitate'], 'It detects metals down to ppm or ppb.')
addc('ai4', 'In colourimetry, the filter or wavelength chosen is the colour:', 'that the solution absorbs most (its complementary colour)', ['the solution appears', 'white light', 'any colour'], 'A blue solution absorbs orange light most.')
addc('ai4', 'A sample\'s absorbance is above the highest standard on the calibration curve. You should:', 'dilute it and measure again', ['extrapolate the line far beyond the data', 'double the reading', 'ignore it'], 'Readings are only reliable within the calibration range.')
addc('ai4', 'The Beer–Lambert law says absorbance is directly proportional to:', 'concentration', ['the square of concentration', 'temperature', 'the volume of the cuvette'], 'For a fixed path length and wavelength.')

# ---------- ao: analysis of organic substances ----------
TESTS = [('an alkene', 'bromine water decolourises quickly'), ('a primary or secondary alcohol', 'acidified potassium dichromate turns from orange to green'),
         ('a carboxylic acid', 'sodium carbonate fizzes, releasing CO₂'), ('an amine', 'damp red litmus turns blue'), ('a tertiary alcohol', 'it does not change acidified dichromate but reacts with sodium')]
for g, t in TESTS:
    addc('ao1', f'Which observation identifies {g}?', t, [x for _, x in TESTS if x != t][:3], 'Each functional group has a characteristic test.')
addc('ao1', 'Which test distinguishes hex-1-ene from hexan-1-ol?', 'bromine water', ['litmus', 'sodium carbonate', 'a flame test'], 'Only the alkene decolourises it quickly.')
addc('ao1', 'Which test distinguishes ethanoic acid from ethanol?', 'sodium carbonate', ['bromine water', 'a flame test', 'silver nitrate'], 'Only the acid fizzes.')
addc('ao1', 'Which test distinguishes propan-2-ol from 2-methylpropan-2-ol?', 'acidified potassium dichromate', ['bromine water', 'sodium carbonate', 'litmus'], 'Secondary alcohols are oxidised; tertiary are not.')
IR = [('a broad absorption at 2500–3000 cm⁻¹ and a strong peak near 1710 cm⁻¹', 'a carboxylic acid'), ('a broad absorption at 3230–3550 cm⁻¹ and no peak near 1700 cm⁻¹', 'an alcohol'),
      ('a strong peak near 1715 cm⁻¹, no broad O–H absorption and no strong C–O peak at 1000–1300 cm⁻¹', 'a ketone or aldehyde'), ('a peak near 1650 cm⁻¹ (C=C) and peaks just above 3000 cm⁻¹', 'an alkene'),
      ('two peaks at 3300–3500 cm⁻¹ and no C=O peak', 'a primary amine'), ('a strong peak near 1740 cm⁻¹ and a strong peak at 1000–1300 cm⁻¹, but no O–H absorption', 'an ester'),
      ('only peaks near 2850–3000 cm⁻¹ and in the fingerprint region', 'an alkane')]
for obs, g in IR:
    addc('ao2', f'An infrared spectrum shows {obs}. The compound is most likely:', g, R.sample([x for _, x in IR if x != g], 3), 'Match each peak to a bond in the data sheet table.')
addc('ao2', 'The fingerprint region of an infrared spectrum (below about 1500 cm⁻¹) is useful for:', 'matching a compound to a known spectrum', ['finding the molar mass', 'counting hydrogen environments', 'finding the pH'], 'It is unique to each compound.')
addc('ao2', 'Infrared spectroscopy identifies functional groups because:', 'each type of bond absorbs particular infrared wavelengths as it vibrates', ['it measures molar mass', 'it breaks molecules into ions', 'it detects nuclear spin'], 'Bond vibrations match IR energies.')
NMR = [  # name, 1H environments, 13C environments
    ('ethane', 1, 1), ('propane', 2, 2), ('butane', 2, 2), ('2-methylpropane', 2, 2), ('pentane', 3, 3), ('2,2-dimethylpropane', 1, 2), ('hexane', 3, 3),
    ('ethanol', 3, 2), ('propan-1-ol', 4, 3), ('propan-2-ol', 3, 2), ('propanone', 1, 2), ('butanone', 3, 4), ('pentan-3-one', 2, 3), ('propanal', 3, 3),
    ('ethanoic acid', 2, 2), ('propanoic acid', 3, 3), ('ethyl ethanoate', 3, 4), ('methyl propanoate', 3, 4), ('methyl ethanoate', 2, 3), ('chloroethane', 2, 2),
    ('1-chloropropane', 3, 3), ('2-chloropropane', 2, 2), ('2-methylbutane', 4, 4), ('benzene', 1, 1), ('cyclohexane', 1, 1), ('methoxymethane', 1, 1),
]
for nm_, h, c in NMR:
    add('ao3', f'How many hydrogen environments (¹H NMR signals) does {nm_} have?', h, [h + 1, h - 1 if h > 1 else h + 2, h + 2 if h > 1 else h + 3], 'Hydrogens in identical surroundings give one signal.', fmt=lambda v: str(int(v)))
    add('ao4', f'How many signals are in the ¹³C NMR spectrum of {nm_}?', c, [c + 1, c - 1 if c > 1 else c + 2, c + 2 if c > 1 else c + 3], 'Count carbons in different surroundings.', fmt=lambda v: str(int(v)))
SPLIT = [('the CH₃ signal in chloroethane (CH₃CH₂Cl)', 'triplet', 2), ('the CH₂ signal in chloroethane (CH₃CH₂Cl)', 'quartet', 3), ('the CH₃ signal in 2-chloropropane ((CH₃)₂CHCl)', 'doublet', 1),
         ('the CH signal in 2-chloropropane ((CH₃)₂CHCl)', 'septet (7 peaks)', 6), ('the signal in propanone (CH₃COCH₃)', 'singlet', 0), ('the CH₃CO signal in ethyl ethanoate', 'singlet', 0),
         ('the OCH₂ signal in ethyl ethanoate', 'quartet', 3), ('the CH₃ of the ethyl group in ethyl ethanoate', 'triplet', 2), ('the CH₂ signal in butanone (CH₃COCH₂CH₃)', 'quartet', 3),
         ('the CH₃ signal of the ethyl group in butanone', 'triplet', 2), ('the CH₃ signals in 2-methylpropane', 'doublet', 1), ('the CH signal in propan-2-ol (ignoring OH)', 'septet (7 peaks)', 6)]
SPL = ['singlet', 'doublet', 'triplet', 'quartet', 'septet (7 peaks)', 'quintet']
for what, k, n in SPLIT:
    addc('ao3', f'What is the splitting pattern of {what}?', k, R.sample([x for x in SPL if x != k], 3), f'n + 1 rule: {n} hydrogen{"s" if n != 1 else ""} on neighbouring carbons → {n + 1} peak{"s" if n else ""}.')
addc('ao3', 'In ¹H NMR, the area under each signal (integration) shows:', 'the relative number of hydrogens in that environment', ['the number of carbons', 'the molar mass', 'the number of neighbouring hydrogens'], 'Splitting shows neighbours; area shows how many.')
addc('ao3', 'TMS is used in NMR as:', 'the reference compound at 0 ppm', ['a solvent', 'a catalyst', 'the sample'], 'Chemical shifts are measured relative to it.')
addc('ao4', 'A ¹³C NMR peak near 170–185 ppm suggests:', 'a C=O carbon in a carboxylic acid or ester', ['a CH₃ carbon', 'a C–Cl carbon', 'an alkane carbon'], 'Carbonyl carbons are strongly deshielded.')
addc('ao4', 'A ¹³C NMR peak near 200 ppm suggests:', 'a ketone or aldehyde C=O carbon', ['an alkane carbon', 'a C–O single bond carbon', 'TMS'], 'Ketone and aldehyde carbonyls appear 190–220 ppm.')
MS = [('propan-1-ol', 'C3H8O'), ('ethanol', 'C2H6O'), ('butane', 'C4H10'), ('propanone', 'C3H6O'), ('ethanoic acid', 'C2H4O2'), ('ethyl ethanoate', 'C4H8O2'), ('hexane', 'C6H14'),
      ('butan-1-ol', 'C4H10O'), ('propanoic acid', 'C3H6O2'), ('pentane', 'C5H12'), ('butanone', 'C4H8O'), ('ethanamine', 'C2H7N')]
INT = {'C': 12, 'H': 1, 'O': 16, 'N': 14}
for nm_, f in MS:
    mi = sum(INT[e] * int(k or 1) for e, k in re.findall(r'([A-Z])(\d*)', f))
    add('ao5', f'At what m/z is the molecular ion peak for {nm_} ({ch(f)})?', mi, [mi - 15, mi + 1, mi - 1, mi - 29], 'The molecular ion has the mass of the whole molecule (most common isotopes).', fmt=lambda v: str(int(v)))
FRAG = [(15, 'CH₃⁺'), (29, 'C₂H₅⁺ (or CHO⁺)'), (43, 'C₃H₇⁺ (or CH₃CO⁺)'), (45, 'COOH⁺'), (31, 'CH₂OH⁺'), (57, 'C₄H₉⁺')]
for z, fr in FRAG:
    addc('ao5', f'A peak at m/z = {z} is most likely caused by the fragment:', fr, R.sample([x for y, x in FRAG if y != z], 3), 'Fragments are positive ions; add up the atomic masses.')
addc('ao5', 'The base peak in a mass spectrum is:', 'the tallest peak, from the most abundant ion', ['the molecular ion peak', 'the peak with the highest m/z', 'the peak at m/z = 0'], 'It is set to 100% relative abundance.')
addc('ao5', 'A small M+1 peak appears just after the molecular ion peak because some molecules contain:', 'a carbon-13 atom', ['an extra hydrogen atom', 'a neutron radical', 'oxygen-18 only'], 'About 1.1% of carbon atoms are ¹³C.')
addc('ao5', 'Two peaks of equal height 2 units apart at the molecular ion suggest the compound contains:', 'bromine', ['chlorine', 'oxygen', 'nitrogen'], '⁷⁹Br and ⁸¹Br are about equally common. (Chlorine gives a 3 : 1 pair.)')

# ---------- csd: chemical synthesis and design ----------
YIELD = [('ethanoic acid', 'CH3COOH', 'ethanol', 'ethyl ethanoate', 'CH3COOC2H5', 1), ('propanoic acid', 'C2H5COOH', 'methanol', 'methyl propanoate', 'C2H5COOCH3', 1),
         ('nitrogen', 'N2', 'excess hydrogen', 'ammonia', 'NH3', 2), ('ethene', 'C2H4', 'excess steam', 'ethanol', 'C2H5OH', 1), ('sulfur dioxide', 'SO2', 'excess oxygen', 'sulfur trioxide', 'SO3', 1)]
for _ in range(40):
    a, fa, b, p, fp, k = R.choice(YIELD)
    ma = R.choice([5.00, 10.0, 12.0, 20.0, 28.0, 50.0])
    th = ma / molar(fa) * k * molar(fp)
    act = round(th * R.choice([0.45, 0.6, 0.72, 0.85, 0.91]), 2)
    add('csd1', f'{ma:g} g of {a} reacts with {b} to make {p}{" (2 mol per mol of N₂)" if k == 2 else ""}. {act:.2f} g of {p} is collected. Find the percentage yield.', act / th * 100,
        [act / ma * 100, act / (th / k) * 100 if k > 1 else th / act * 100 if th / act * 100 < 500 else act / th * 50, act / (ma / molar(fa) * molar(fp) * (2 if k == 1 else 1)) * 100],
        m(f'\\text{{theoretical}} = \\frac{{{ma:g}}}{{{molar(fa):.2f}}} \\times {k if k > 1 else ""}{molar(fp):.2f}, \\ \\%\\text{{ yield}} = \\frac{{\\text{{actual}}}}{{\\text{{theoretical}}}} \\times 100'),
        fmt=lambda v: m(f'{v:.1f}\\%'))
AE = [('C₂H₄ + H₂O → C₂H₅OH', 'ethanol', [('C2H4', 1), ('H2O', 1)], ('C2H5OH', 1)), ('C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂', 'ethanol', [('C6H12O6', 1)], ('C2H5OH', 2)),
      ('C₂H₅OH → C₂H₄ + H₂O', 'ethene', [('C2H5OH', 1)], ('C2H4', 1)), ('CH₃COOH + C₂H₅OH → CH₃COOC₂H₅ + H₂O', 'ethyl ethanoate', [('CH3COOH', 1), ('C2H5OH', 1)], ('CH3COOC2H5', 1)),
      ('N₂ + 3H₂ → 2NH₃', 'ammonia', [('N2', 1), ('H2', 3)], ('NH3', 2)), ('CaCO₃ → CaO + CO₂', 'calcium oxide', [('CaCO3', 1)], ('CaO', 1)),
      ('C₂H₆ + Cl₂ → C₂H₅Cl + HCl', 'chloroethane', [('C2H6', 1), ('Cl2', 1)], ('C2H5Cl', 1))]
for eq, prod, reac, (fp, k) in AE:
    tot = sum(molar(f) * n for f, n in reac)
    ae = k * molar(fp) / tot * 100
    add('csd3', f'Find the atom economy for making {prod} by {eq}.', ae, [molar(fp) / tot * 100 if k > 1 else 100 - ae, 100.0 if ae < 99 else 50.0, tot / (k * molar(fp)) * 100 if tot / (k * molar(fp)) < 10 else ae / 2],
        m('\\frac{\\text{mass of desired product}}{\\text{total mass of reactants}} \\times 100'), fmt=lambda v: m(f'{v:.1f}\\%'))
addc('csd1', 'Which is NOT a reason the actual yield is less than the theoretical yield?', 'using an excess of one reactant', ['the reaction reaches equilibrium', 'side reactions make other products', 'product is lost when transferring or purifying'], 'An excess of one reactant usually raises the yield of the limiting one.')
addc('csd1', 'Purity of a product can be checked by:', 'measuring its melting or boiling point', ['weighing the reactants', 'measuring its colour only', 'counting the bubbles'], 'A pure substance melts/boils sharply at the data book value.')
addc('csd2', 'The Haber process runs at about 400–450 °C, even though a lower temperature gives a higher yield, because:', 'it is a compromise between rate and yield', ['the reaction is endothermic', 'the catalyst melts at lower temperatures', 'ammonia decomposes below 400 °C'], 'At low temperatures the reaction is too slow.')
addc('csd2', 'The Haber process uses high pressure because:', 'there are fewer gas molecules on the product side', ['the reaction is exothermic', 'it lowers costs', 'it slows the reaction'], '4 mol of gas → 2 mol of gas.')
addc('csd2', 'Pressures in the Haber process are not raised even higher mainly because:', 'very high-pressure equipment is expensive and dangerous', ['the yield would fall', 'the rate would fall', 'nitrogen would liquefy'], 'An economic and safety compromise.')
addc('csd2', 'The Haber process catalyst is mainly:', 'iron', ['platinum', 'vanadium(V) oxide', 'nickel'], 'Iron (with promoters) speeds up the reaction.')
addc('csd2', 'Ammonia is removed from the Haber process as it forms by:', 'cooling the gases so the ammonia liquefies', ['dissolving it in sulfuric acid', 'burning it', 'adding more nitrogen'], 'Removing product shifts the equilibrium right; unreacted gases are recycled.')
addc('csd2', 'In industry, a catalyst is used mainly to:', 'reach equilibrium faster at a lower, cheaper temperature', ['increase the equilibrium yield', 'raise K', 'make the reaction exothermic'], 'It does not change the position of equilibrium.')
addc('csd2', 'Unreacted gases in an industrial process are often recycled to:', 'raise the overall yield and cut waste', ['lower the rate', 'cool the reactor', 'change K'], 'They get further passes through the reactor.')
addc('csd3', 'A high atom economy means:', 'most of the reactant atoms end up in the desired product', ['the reaction is fast', 'the yield is high', 'the product is pure'], 'Little waste is produced.')
addc('csd3', 'Which is an environmental consideration when choosing a synthesis?', 'the waste products and how they are disposed of', ['the colour of the product', 'the shape of the reactor', 'the name of the product'], 'Also energy use and emissions.')
addc('csd3', 'Building a chemical plant near a port and a source of reactants mainly reduces:', 'transport costs', ['the yield', 'the reaction rate', 'the value of K'], 'Location is an economic factor.')
addc('csd3', 'Which is a social consideration for a chemical plant?', 'local jobs and the safety of nearby communities', ['the reaction mechanism', 'the molar mass of the product', 'the catalyst colour'], 'Plants affect the people who live near them.')
addc('csd3', 'Making ethanol from crops rather than from ethene is often preferred because:', 'it uses a renewable feedstock', ['it has a higher atom economy', 'it is faster', 'it needs no energy'], 'Ethene comes from crude oil.')

by = {}
for q in OUT: by.setdefault(q['step'], []).append(q)
final = []
for s in sorted(by):
    R.shuffle(by[s]); final += by[s][:30]
json.dump(final, open('quick_chem.json', 'w'), indent=1)
print({s: min(len(v), 30) for s, v in sorted(by.items())}, 'total', len(final))
