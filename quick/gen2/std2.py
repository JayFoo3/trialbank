"""Maths Standard 2: multiple choice and written/extended quick questions. All numbers worked out here."""
import math, random
from lib import Bank
from mathlib import dp, money, m

R = random.Random(2026113)
B = Bank('quick-std2', 'std2', typed=False, seed=41)
def M(T, prompt, right, wrong, why):
    wrong = [w for w in dict.fromkeys(wrong) if w != right][:3]
    if len(wrong) < 3 or any(q['prompt'] == prompt for q in B.mcq): return   # duplicates or too few distinct options: skip
    B.M(T, prompt, right, wrong, why)
W = B.W
C2 = [('Correct answer with working', 2), ('Correct method with one error', 1)]
C3 = [('Correct answer with full working', 3), ('Correct method with one error', 2), ('Correct first step', 1)]

T = 'Formulae and Equations'
for _ in range(10):
    a, b, c = R.randint(2, 9), R.randint(1, 20), R.randint(21, 60)
    xv = (c - b) / a
    if xv != int(xv): continue
    xv = int(xv)
    M(T, f'Solve {m(f"{a}x + {b} = {c}")}.', m(f'x = {xv}'), [m(f'x = {(c + b) // a if (c + b) % a == 0 else c - b}'), m(f'x = {c - b}'), m(f'x = {xv + 1}')], f'Subtract {b}, then divide by {a}.')
for _ in range(8):
    N, Mw, h = R.choice([(2, 70), (3, 80), (4, 60), (5, 90)]) + (R.choice([1, 2, 3]),)
    bac = (10 * N - 7.5 * h) / (6.8 * Mw)
    if bac <= 0: continue
    M(T, f'A man of {Mw} kg drinks {N} standard drinks over {h} hours. Using {m("BAC_{male} = \\frac{10N - 7.5H}{6.8M}")}, his BAC is closest to', m(dp(bac, 3)), [m(dp((10 * N) / (6.8 * Mw), 3)), m(dp((10 * N - 7.5 * h) / (5.5 * Mw), 3)), m(dp(bac + 0.02, 3))], 'Substitute N, H and M into the formula.')
for _ in range(6):
    d, s = R.choice([120, 240, 360, 75]), R.choice([40, 60, 80, 90])
    M(T, f'A car travels {d} km at an average speed of {s} km/h. How long does the trip take?', f'{dp(d / s, 2)} hours', [f'{dp(s / d, 2)} hours', f'{d * s} hours', f'{dp(d / s + 1, 2)} hours'], m('T = \\frac{D}{S}'))
W(T, 2, f'Make {m("r")} the subject of {m("A = \\pi r^2")}, then find {m("r")} when {m("A = 50")} (to 1 decimal place).', [m('r = \\sqrt{\\frac{A}{\\pi}}'), m(f'r = \\sqrt{{\\frac{{50}}{{\\pi}}}} \\approx {dp(math.sqrt(50 / math.pi), 1)}')], C2)
for _ in range(4):
    a, b, c = R.randint(2, 6), R.randint(3, 12), R.randint(1, 9)
    W(T, 2, f'Solve {m(f"\\frac{{x - {b}}}{{{a}}} = {c}")}.', [m(f'x - {b} = {a * c}'), m(f'x = {a * c + b}')], C2)

T = 'Linear Relationships'
for _ in range(10):
    x1, y1, x2, y2 = R.randint(-5, 4), R.randint(-6, 6), R.randint(5, 10), R.randint(-6, 10)
    g = (y2 - y1) / (x2 - x1)
    M(T, f'Find the gradient of the line through {m(f"({x1}, {y1})")} and {m(f"({x2}, {y2})")}.', m(dp(g, 2)), [m(dp((x2 - x1) / (y2 - y1), 2) if y2 != y1 else '0.50'), m(dp(-g, 2) if g else '1.00'), m(dp((y2 + y1) / (x2 + x1) if x2 + x1 else 3, 2))], m('m = \\frac{y_2 - y_1}{x_2 - x_1}'))
for _ in range(6):
    mm, cc = R.choice([2, 3, -2, 0.5, -4]), R.randint(-6, 8)
    M(T, f'What are the gradient and y-intercept of {m(f"y = {mm}x + {cc}".replace("+ -", "- "))}?', f'gradient {mm}, y-intercept {cc}', [f'gradient {cc}, y-intercept {mm}', f'gradient {-mm}, y-intercept {cc}', f'gradient {mm}, y-intercept {-cc}'], 'In y = mx + c, m is the gradient and c the y-intercept.')
for _ in range(4):
    fixed, rate, units = R.choice([40, 60, 25]), R.choice([0.25, 0.3, 1.5]), R.choice([200, 120, 80])
    W(T, 2, f'A phone plan costs {money(fixed)} per month plus {money(rate)} per MB of data. (a) Write an equation for the monthly cost {m("C")} for {m("d")} MB. (b) Find the cost for {units} MB.',
      [m(f'C = {rate}d + {fixed}'), m(f'C = {rate} \\times {units} + {fixed} = {dp(rate * units + fixed)}') + ' dollars'], C2)
W(T, 3, 'Two companies hire out vans. Company A charges $50 plus $0.40 per km. Company B charges $80 plus $0.25 per km. Find the distance at which they cost the same, and which is cheaper for longer trips.',
  [m('50 + 0.4d = 80 + 0.25d'), m('0.15d = 30 \\Rightarrow d = 200') + ' km', 'Company B is cheaper for trips over 200 km because its cost per km is lower.'], C3)

T = 'Non-linear Relationships'
for _ in range(8):
    P0, r_, t_ = R.choice([500, 1200, 2000]), R.choice([1.05, 1.1, 0.9, 1.2]), R.randint(3, 8)
    v = P0 * r_**t_
    M(T, f'A population is modelled by {m(f"P = {P0}({r_})^t")}. Find {m("P")} when {m(f"t = {t_}")} (nearest whole number).', m(f'{round(v)}'), [m(f'{round(P0 * r_ * t_)}'), m(f'{round(P0 + r_**t_)}'), m(f'{round(v * r_)}')], 'Substitute t and evaluate the power first.')
for _ in range(5):
    k_, x_ = R.choice([12, 24, 36, 60]), R.choice([2, 3, 4, 6])
    M(T, f'If {m("y")} varies inversely with {m("x")} and {m(f"y = {k_ // x_}")} when {m(f"x = {x_}")}, find {m("y")} when {m(f"x = {x_ * 2}")}.', m(dp(k_ / (x_ * 2), 1)), [m(dp(k_ // x_ * 2, 1)), m(dp(k_ / x_, 1)), m(dp(k_, 1))], m(f'k = xy = {k_}') + ', so y = k ÷ x.')
for a_, b_, c_ in [(-1, 6, 0), (-2, 12, 5), (-1, 10, 0), (-5, 40, 0)]:
    xv = -b_ / (2 * a_); yv = a_ * xv**2 + b_ * xv + c_
    W(T, 2, f'A ball\'s height is {m(f"h = {a_}t^2 + {b_}t + {c_}".replace("+ 0", "").replace("-1t", "-t"))} metres after {m("t")} seconds. Find the maximum height and when it occurs.', [m(f't = -\\frac{{b}}{{2a}} = {dp(xv, 1)}') + ' s', m(f'h = {dp(yv, 1)}') + ' m'], C2)
W(T, 3, 'The cost of a car stereo is modelled by $C = 2000(0.85)^t$ dollars after $t$ years. (a) What is the initial value? (b) What is the yearly depreciation rate? (c) Find the value after 5 years.'.replace('$', ''), ['(a) ' + money(2000), '(b) 15% per year, since 1 − 0.85 = 0.15', '(c) ' + m(f'C = 2000(0.85)^5 = {dp(2000 * 0.85**5)}') + ' dollars'], C3)

T = 'Applications of Measurement'
for _ in range(8):
    r_, h_ = R.randint(2, 10), R.randint(3, 15)
    V = math.pi * r_**2 * h_
    M(T, f'Find the volume of a cylinder with radius {r_} cm and height {h_} cm (1 dp).', f'{dp(V, 1)} cm³', [f'{dp(2 * math.pi * r_ * h_, 1)} cm³', f'{dp(math.pi * r_ * h_, 1)} cm³', f'{dp(math.pi * (2 * r_)**2 * h_, 1)} cm³'], m('V = \\pi r^2h'))
for _ in range(6):
    mv, ab = R.choice([12.5, 48, 120, 3.2]), R.choice([0.5, 0.05, 1, 0.1])
    M(T, f'A length is measured as {mv} cm to the nearest {ab} cm. What is the absolute error?', f'{ab / 2} cm', [f'{ab} cm', f'{ab * 2} cm', f'{dp(ab / 2 / mv * 100, 2)} cm'], 'Absolute error is half the precision of the measuring device.')
for _ in range(5):
    a_, b_, c_ = sorted(R.sample(range(4, 15), 3)); s = (a_ + b_ + c_) / 2; A = math.sqrt(s * (s - a_) * (s - b_) * (s - c_))
    if a_ + b_ <= c_: continue
    W(T, 2, f'Use Heron\'s rule to find the area of a triangle with sides {a_} m, {b_} m and {c_} m (1 dp).', [m(f's = \\frac{{{a_} + {b_} + {c_}}}{{2}} = {s}'), m(f'A = \\sqrt{{{s}({s} - {a_})({s} - {b_})({s} - {c_})}} \\approx {dp(A, 1)}') + ' m²'], C2)
W(T, 3, 'A field is surveyed with a traverse. Along a 100 m diagonal AB, offsets are: C is 30 m left at 20 m from A, D is 45 m right at 60 m from A. Find the area of quadrilateral ACBD.',
  ['Triangle ACB: ' + m('\\frac{1}{2} \\times 100 \\times 30 = 1500') + ' m²', 'Triangle ADB: ' + m('\\frac{1}{2} \\times 100 \\times 45 = 2250') + ' m²', 'Total area = 3750 m²'], C3)

T = 'Working with Rates'
for _ in range(8):
    kWh, c_ = R.choice([3.2, 1.5, 2.4, 0.8]), R.choice([28, 32, 35])
    hrs = R.choice([4, 6, 10]); cost = kWh * hrs * c_ / 100
    M(T, f'An appliance uses {kWh} kW. Electricity costs {c_} cents per kWh. Find the cost of running it for {hrs} hours.', money(cost), [money(kWh * c_ / 100), money(kWh * hrs * c_), money(cost * 2)], 'Energy = power × time; then multiply by the price.')
for _ in range(6):
    hr = R.choice([72, 80, 65, 90]); mins = R.choice([3, 5, 0.5])
    M(T, f'A resting heart rate is {hr} beats per minute. How many beats in {mins} minutes?', f'{int(hr * mins)}', [f'{hr + mins}', f'{int(hr / mins) if mins >= 1 else hr * 2}', f'{int(hr * mins * 60)}'], 'Multiply the rate by the time.')
for _ in range(4):
    L_, km = R.choice([42, 55, 38]), R.choice([520, 650, 480])
    W(T, 2, f'A car uses {L_} L of fuel to travel {km} km. Find its fuel consumption in L/100 km (1 dp).', [m(f'\\frac{{{L_}}}{{{km}}} \\times 100 = {dp(L_ / km * 100, 1)}') + ' L/100 km'], C2)

T = 'Right-angled Triangles'
for _ in range(8):
    hyp, ang = R.choice([10, 12, 15, 20, 8]), R.choice([25, 32, 40, 55, 63])
    opp = hyp * math.sin(math.radians(ang))
    M(T, f'In a right-angled triangle the hypotenuse is {hyp} cm and one angle is {ang}°. Find the side opposite that angle (1 dp).', f'{dp(opp, 1)} cm', [f'{dp(hyp * math.cos(math.radians(ang)), 1)} cm', f'{dp(hyp * math.tan(math.radians(ang)), 1)} cm', f'{dp(hyp / math.sin(math.radians(ang)), 1)} cm'], m('\\text{opp} = \\text{hyp} \\times \\sin\\theta'))
for _ in range(4):
    h_, d_ = R.choice([30, 45, 60, 80]), R.choice([50, 100, 120])
    W(T, 2, f'From a point {d_} m from the base of a tower, the angle of elevation to the top is {round(math.degrees(math.atan(h_ / d_)))}°. Find the height of the tower (nearest metre).', [m(f'\\tan {round(math.degrees(math.atan(h_ / d_)))}^\\circ = \\frac{{h}}{{{d_}}}'), m(f'h = {d_}\\tan {round(math.degrees(math.atan(h_ / d_)))}^\\circ \\approx {round(d_ * math.tan(math.radians(round(math.degrees(math.atan(h_ / d_))))))}') + ' m'], C2)

T = 'Non-right-angled Trigonometry'
for _ in range(8):
    a_, A_, B_ = R.randint(8, 20), R.choice([40, 52, 65, 70]), R.choice([35, 48, 58])
    b_ = a_ * math.sin(math.radians(B_)) / math.sin(math.radians(A_))
    M(T, f'In triangle ABC, {m(f"a = {a_}")} cm, {m(f"A = {A_}^\\circ")} and {m(f"B = {B_}^\\circ")}. Find {m("b")} (1 dp).', f'{dp(b_, 1)} cm', [f'{dp(a_ * math.sin(math.radians(A_)) / math.sin(math.radians(B_)), 1)} cm', f'{dp(a_ * math.cos(math.radians(B_)), 1)} cm', f'{dp(b_ + 2, 1)} cm'], 'Sine rule: ' + m('\\frac{b}{\\sin B} = \\frac{a}{\\sin A}'))
for _ in range(6):
    a_, b_, C_ = R.randint(5, 15), R.randint(5, 15), R.choice([30, 45, 60, 120])
    A = 0.5 * a_ * b_ * math.sin(math.radians(C_))
    M(T, f'Find the area of a triangle with sides {a_} m and {b_} m and an included angle of {C_}° (1 dp).', f'{dp(A, 1)} m²', [f'{dp(a_ * b_ * math.sin(math.radians(C_)), 1)} m²', f'{dp(0.5 * a_ * b_, 1)} m²', f'{dp(0.5 * a_ * b_ * math.cos(math.radians(C_)), 1)} m²'], m('A = \\frac{1}{2}ab\\sin C'))
for _ in range(4):
    d1, b1, d2, b2 = R.choice([8, 10, 12]), R.choice([40, 50, 60]), R.choice([6, 9, 14]), R.choice([130, 150, 160])
    inc = 180 - (b2 - b1); c2 = d1**2 + d2**2 - 2 * d1 * d2 * math.cos(math.radians(inc))
    W(T, 4, f'A boat sails {d1} km on a bearing of {b1:03d}°, then {d2} km on a bearing of {b2:03d}°. (a) Show that the angle between the two legs is {inc}°. (b) Find the distance from the start, to 1 decimal place.',
      [f'The angle at the turning point is {m(f"180^\\circ - ({b2}^\\circ - {b1}^\\circ) = {inc}^\\circ")} (co-interior angles with the north lines).', m(f'd^2 = {d1}^2 + {d2}^2 - 2({d1})({d2})\\cos {inc}^\\circ \\approx {dp(c2, 2)}'), m(f'd \\approx {dp(math.sqrt(c2), 1)}') + ' km'],
      [('Shows the angle and finds the correct distance', 4), ('Correct cosine rule with the right angle', 3), ('Correct angle shown', 2), ('Correct diagram or a correct bearing step', 1)])

T = 'Rates and Ratios'
for _ in range(6):
    a_, b_, tot = R.randint(1, 5), R.randint(2, 7), R.choice([120, 360, 840])
    if tot % (a_ + b_): continue
    M(T, f'{money(tot)} is shared in the ratio {a_} : {b_}. What is the larger share?', money(tot * max(a_, b_) / (a_ + b_)), [money(tot * min(a_, b_) / (a_ + b_)), money(tot / max(a_, b_)), money(tot * max(a_, b_) / min(a_, b_) if min(a_, b_) else 1)], 'Divide by the total number of parts, then multiply.')
for _ in range(4):
    sc, md = R.choice([100, 200, 500]), R.choice([3.5, 6.2, 12])
    M(T, f'On a plan with scale 1 : {sc}, a wall is {md} cm long. What is the real length?', f'{dp(md * sc / 100, 2)} m', [f'{dp(md * sc, 0)} m', f'{dp(md / sc, 3)} m', f'{dp(md * sc / 1000, 3)} m'], f'Multiply by {sc}, then convert cm to m.')

T = 'Money Matters'
for _ in range(8):
    P_, r_, t_ = R.choice([2000, 5000, 1200, 8000]), R.choice([3, 4.5, 6, 2.5]), R.choice([2, 3, 5])
    I = P_ * r_ / 100 * t_
    M(T, f'Find the simple interest on {money(P_)} at {r_}% p.a. for {t_} years.', money(I), [money(P_ * r_ / 100), money(P_ * (1 + r_ / 100)**t_ - P_), money(I + P_)], m('I = Prn'))
for _ in range(6):
    sal = R.choice([52000, 65000, 78000, 91000])
    M(T, f'Ana earns {money(sal)} per year. What is her fortnightly pay?', money(sal / 26), [money(sal / 52), money(sal / 12), money(sal / 24)], 'There are 26 fortnights in a year.')
for _ in range(4):
    P_, r_, n_ = R.choice([24000, 35000, 18000]), R.choice([15, 20, 12]), R.choice([3, 4, 5])
    S = P_ * (1 - r_ / 100)**n_
    W(T, 2, f'A car bought for {money(P_)} depreciates by {r_}% p.a. using the declining-balance method. Find its value after {n_} years.', [m(f'S = V_0(1 - r)^n = {P_}(1 - {r_ / 100})^{{{n_}}}'), m(f'S = {money(S)}')], C2)
W(T, 3, 'A worker earns $32.50 per hour for a 38-hour week, time-and-a-half for the next 4 hours and double time for 3 hours on Sunday. Calculate her gross weekly pay.',
  [m('38 \\times 32.50 = 1235'), m('4 \\times 32.50 \\times 1.5 = 195'), m('3 \\times 32.50 \\times 2 = 195'), 'Total = $1625'], C3)

T = 'Investments and Loans'
for _ in range(8):
    P_, r_, n_, f_ = R.choice([5000, 10000, 2500]), R.choice([4, 6, 5.2]), R.choice([3, 5]), R.choice([(1, 'annually'), (12, 'monthly'), (4, 'quarterly')])
    A = P_ * (1 + r_ / 100 / f_[0])**(n_ * f_[0])
    M(T, f'{money(P_)} is invested at {r_}% p.a. compounded {f_[1]} for {n_} years. Find the future value.', money(A), [money(P_ * (1 + r_ / 100 * n_)), money(P_ * (1 + r_ / 100)**(n_ * f_[0])), money(A - P_)], m('FV = PV(1 + r)^n') + ' with r and n per period.')
for _ in range(4):
    FV, r_, n_ = R.choice([20000, 50000, 15000]), R.choice([5, 6, 4]), R.choice([4, 6, 10])
    PV = FV / (1 + r_ / 100)**n_
    W(T, 2, f'How much must be invested now at {r_}% p.a. compounded annually to have {money(FV)} in {n_} years?', [m(f'PV = \\frac{{FV}}{{(1 + r)^n}} = \\frac{{{FV}}}{{(1.0{r_})^{{{n_}}}}}'.replace('1.010', '1.10')), m(f'PV = {money(PV)}')], C2)
for _ in range(3):
    P_, r_, yrs = R.choice([300000, 450000, 600000]), R.choice([6, 5.4, 6.6]), R.choice([25, 30])
    i = r_ / 1200; Nn = yrs * 12; Mm = P_ * i * (1 + i)**Nn / ((1 + i)**Nn - 1); tot = Mm * Nn
    W(T, 3, f'A home loan of {money(P_)} at {r_}% p.a. is repaid monthly over {yrs} years with repayments of {money(Mm)}. (a) Find the total amount repaid. (b) Find the total interest paid.',
      [m(f'\\text{{Total}} = {dp(Mm)} \\times {Nn} = {money(tot)}'), m(f'\\text{{Interest}} = {money(tot)} - {money(P_)} = {money(tot - P_)}')], C3)

T = 'Annuities'
for _ in range(6):
    pmt, r_, n_ = R.choice([100, 200, 500]), R.choice([0.5, 1, 0.4]), R.choice([24, 36, 60])
    FV = pmt * ((1 + r_ / 100)**n_ - 1) / (r_ / 100)
    M(T, f'{money(pmt)} is deposited at the end of each month into an account earning {r_}% per month. Using {m("FV = M\\frac{(1 + r)^n - 1}{r}")}, find the value after {n_} months.', money(FV), [money(pmt * n_), money(pmt * (1 + r_ / 100)**n_), money(FV * (1 + r_ / 100))], 'This is the future value of an annuity.')
for _ in range(3):
    pmt, r_, n_ = R.choice([250, 400]), R.choice([0.5, 0.6]), R.choice([48, 60])
    FV = pmt * ((1 + r_ / 100)**n_ - 1) / (r_ / 100)
    W(T, 2, f'Find the future value of an annuity of {money(pmt)} per month for {n_} months at {r_}% per month, and the interest earned.', [m(f'FV = {pmt} \\times \\frac{{(1.00{str(r_).replace("0.", "")})^{{{n_}}} - 1}}{{{r_ / 100}}} = {money(FV)}'), f'Interest = {money(FV)} − {money(pmt * n_)} = {money(FV - pmt * n_)}'], C2)

T = 'Data Analysis'
for _ in range(10):
    data = sorted(R.choices(range(2, 40), k=R.choice([7, 9, 11])))
    n_ = len(data); med = data[n_ // 2]; mean = sum(data) / n_
    M(T, f'Find the median of: {", ".join(map(str, data))}.', str(med), [dp(mean, 1) if dp(mean, 1) != str(med) else str(med + 1), str(data[n_ // 2 - 1]) if data[n_ // 2 - 1] != med else str(med - 2), str(max(data) - min(data)) if max(data) - min(data) != med else str(med + 3)], 'Middle value of the ordered data.')
for _ in range(4):
    data = sorted(R.choices(range(10, 60), k=8)); lo, hi = data[:4], data[4:]
    q1, q3 = (lo[1] + lo[2]) / 2, (hi[1] + hi[2]) / 2
    W(T, 2, f'Find the interquartile range of: {", ".join(map(str, data))}.', [f'Lower half {lo}, so {m(f"Q_1 = {q1}")}; upper half {hi}, so {m(f"Q_3 = {q3}")}.', m(f'IQR = {q3} - {q1} = {q3 - q1}')], C2)
W(T, 3, 'For the data 12, 15, 16, 18, 19, 21, 22, 48, decide whether 48 is an outlier. Show working.', [m('Q_1 = 15.5,\\ Q_3 = 21.5,\\ IQR = 6'), m('Q_3 + 1.5 \\times IQR = 21.5 + 9 = 30.5'), '48 > 30.5, so 48 is an outlier.'], C3)

T = 'Relative Frequency and Probability'
for _ in range(8):
    tr, s_ = R.choice([200, 500, 80]), R.choice([0.15, 0.3, 0.45])
    M(T, f'A spinner landed on red {int(tr * s_)} times in {tr} spins. What is the relative frequency of red?', dp(s_, 2), [dp(1 - s_, 2), dp(int(tr * s_) / 100, 2) if dp(int(tr * s_) / 100, 2) != dp(s_, 2) else '0.50', str(int(tr * s_))], 'Number of times ÷ total trials.')
for _ in range(5):
    p_, n_ = R.choice([(1, 6), (1, 4), (1, 3)]), R.choice([60, 120, 300])
    M(T, f'An event has probability {m(f"\\frac{{{p_[0]}}}{{{p_[1]}}}")}. In {n_} trials, how many times would you expect it?', str(n_ * p_[0] // p_[1]), [str(n_ // 2), str(n_ - n_ * p_[0] // p_[1]), str(p_[1])], 'Expected frequency = np.')
W(T, 2, 'Two fair dice are rolled. Find the probability that the sum is 8.', ['Sums of 8: (2,6), (3,5), (4,4), (5,3), (6,2), i.e. 5 outcomes of 36.', m('P = \\frac{5}{36}')], C2)

T = 'Bivariate Data Analysis'
for _ in range(8):
    a_, b_, xv = R.choice([2.5, 1.8, -0.6, 4.2]), R.choice([12, 30, 50]), R.choice([10, 15, 20])
    M(T, f'The least-squares line is {m(f"y = {a_}x + {b_}")}. Predict {m("y")} when {m(f"x = {xv}")}.', dp(a_ * xv + b_, 1), [dp(b_ * xv + a_, 1), dp(a_ * xv, 1), dp(a_ + b_ + xv, 1)], 'Substitute x into the equation.')
for r_, word in [(0.92, 'strong positive'), (-0.85, 'strong negative'), (0.45, 'weak positive'), (-0.2, 'weak negative'), (0.65, 'moderate positive')]:
    M(T, f'A correlation coefficient of {m(f"r = {r_}")} indicates', f'a {word} linear association', [f'a {"weak" if "strong" in word else "strong"} {word.split()[-1]} linear association', f'a {word.split()[0]} {"negative" if "positive" in word else "positive"} linear association', 'no association'], 'Sign gives direction; size gives strength.')
W(T, 2, 'Explain the difference between interpolation and extrapolation, and why extrapolation is less reliable.', ['Interpolation predicts within the range of the data; extrapolation predicts outside it.', 'The trend may not continue outside the data, so extrapolated predictions are less reliable.'], C2, typed=True)

T = 'The Normal Distribution'
for _ in range(8):
    mu, sd = R.choice([(70, 8), (165, 10), (500, 40)]); z = R.choice([-2, -1, 1, 2, 1.5, -0.5])
    M(T, f'Scores have mean {mu} and standard deviation {sd}. What score has a z-score of {z}?', dp(mu + z * sd, 1), [dp(mu - z * sd, 1), dp(mu + z, 1), dp(z * sd, 1)], m('x = \\mu + z\\sigma'))
for _ in range(5):
    mu, sd, k_ = R.choice([(60, 5), (100, 15), (40, 4)]) + (R.choice([1, 2]),)
    pct = {1: 68, 2: 95}[k_]
    M(T, f'Data is normal with mean {mu} and standard deviation {sd}. About what percentage lies between {mu - k_ * sd} and {mu + k_ * sd}?', f'{pct}%', [f'{ {68: 95, 95: 99.7}[pct] }%', f'{pct // 2}%', '50%'], '68–95–99.7 rule.')
W(T, 3, 'Maths test: mean 62, sd 8. English test: mean 70, sd 5. Sam scored 74 in Maths and 78 in English. In which test did Sam perform better relative to the class? Justify with z-scores.', [m('z_{maths} = \\frac{74 - 62}{8} = 1.5'), m('z_{english} = \\frac{78 - 70}{5} = 1.6'), 'English, since its z-score is higher.'], C3)

T = 'Network Concepts'
M(T, 'The degree of a vertex is', 'the number of edges connected to it', ['the number of vertices in the network', 'the weight of its longest edge', 'the number of paths through it'], 'A loop counts twice.')
M(T, 'A tree is a connected network with', 'no cycles', ['exactly one cycle', 'every vertex of degree 2', 'weighted edges only'], 'A tree on n vertices has n − 1 edges.')
M(T, 'A minimum spanning tree of a network with 9 vertices has how many edges?', '8', ['9', '10', '7'], 'Spanning trees have n − 1 edges.')
M(T, 'Prim\'s algorithm is used to find', 'a minimum spanning tree', ['the shortest path between two vertices', 'the critical path', 'the maximum flow'], 'It grows the tree by adding the cheapest edge to a new vertex.')
M(T, 'Dijkstra\'s algorithm is used to find', 'the shortest path between two vertices', ['a minimum spanning tree', 'the critical path', 'an Euler trail'], 'It labels vertices with their shortest known distances.')
M(T, 'A network has vertex degrees 3, 2, 4, 1, 2. How many edges does it have?', '6', ['12', '5', '4'], 'Sum of degrees = 2 × edges, so 12 ÷ 2 = 6.')
M(T, 'A path in a network is', 'a walk with no repeated vertices', ['a walk that starts and ends at the same vertex', 'any set of edges', 'a tree'], 'A cycle starts and ends at the same vertex.')
W(T, 2, 'Explain the difference between a minimum spanning tree and a shortest path, using a real-world example of each.', ['A minimum spanning tree connects ALL vertices with the least total weight, e.g. laying the least cable to connect every house.', 'A shortest path is the least total weight between TWO vertices, e.g. the fastest route from home to school.'], C2, typed=True)
W(T, 3, 'Edges: AB 4, AC 2, BC 5, BD 10, CD 3, CE 8, DE 6. Use Kruskal\'s (or Prim\'s) algorithm to find the minimum spanning tree and its total weight.', ['Order edges: AC 2, CD 3, AB 4, BC 5, DE 6, CE 8, BD 10.', 'Add AC 2, CD 3, AB 4; skip BC 5 (makes a cycle); add DE 6. Four edges join all five vertices.', 'Total weight = 2 + 3 + 4 + 6 = 15'], C3)

T = 'Critical Path Analysis'
M(T, 'The critical path in a project network is', 'the longest path, which sets the minimum completion time', ['the shortest path', 'the path with the fewest activities', 'the path with the most float'], 'Activities on it have zero float.')
M(T, 'Float time for an activity is', 'how long it can be delayed without delaying the project', ['its duration', 'the earliest start time', 'the total project time'], 'Float = LST − EST.')
M(T, 'An activity has EST 6, duration 4 and LST 9. Its float is', '3', ['4', '6', '13'], 'Float = LST − EST = 9 − 6.')
M(T, 'If an activity on the critical path is delayed by 2 days, the project', 'is delayed by 2 days', ['is not delayed', 'is delayed by 1 day', 'finishes 2 days early'], 'Critical activities have no float.')
W(T, 3, 'Activities: A (3 days, start), B (4, start), C (2, after A), D (5, after A and B), E (3, after C and D). Find the minimum completion time and the critical path.',
  ['EST: A 0, B 0, C 3, D max(3, 4) = 4, E max(3 + 2, 4 + 5) = 9.', 'Finish = 9 + 3 = 12 days.', 'Critical path B → D → E (4 + 5 + 3 = 12).'], C3)

B.save()
