from lib import Bank
from mathlib import m, dp
b = Bank('quick-eng', 'eng', typed=True, seed=61)
M, W = b.M, b.W
def X(mk):   # generic explain criteria
    return [('Explains all key points clearly with correct terms', mk)] + [(['Identifies a relevant point', 'Describes the main points', 'Explains most points with some links'][i], i + 1) for i in range(mk - 1)][::-1]
C2 = [('Correct answer with working and units', 2), ('Correct method or formula with one error', 1)]
C3 = [('Correct answer with full working and units', 3), ('Correct method with one error', 2), ('Correct formula or first step', 1)]

T = 'Civil Structures'
M(T, 'Stress is defined as', 'force divided by cross-sectional area', ['change in length divided by original length', 'force times distance', 'mass divided by volume'], m('\\sigma = \\frac{F}{A}'))
M(T, 'Strain is', 'change in length divided by original length', ['force divided by area', 'stress times area', 'the load a member can carry'], m('\\varepsilon = \\frac{\\Delta L}{L}') + ', with no units.')
M(T, 'Young\'s modulus is the ratio of', 'stress to strain in the elastic region', ['strain to stress', 'force to extension at failure', 'yield stress to UTS'], m('E = \\frac{\\sigma}{\\varepsilon}'))
M(T, 'A steel rod 2 m long with area 100 mm² carries a tensile load of 10 kN. The stress is', '100 MPa', ['10 MPa', '1000 MPa', '0.1 MPa'], m('\\sigma = \\frac{10\\,000}{100 \\times 10^{-6}} = 100 \\times 10^6') + ' Pa.')
M(T, 'Which member of a simple truss is in compression?', 'A member pushing on its joints', ['A member pulling on its joints', 'A redundant member', 'Every member'], 'Compression members push on joints; tension members pull.')
M(T, 'The main material in reinforced concrete that resists tension is', 'steel', ['concrete', 'aggregate', 'cement'], 'Concrete is strong in compression but weak in tension.')
M(T, 'Prestressing concrete involves', 'tensioning steel tendons so the concrete is placed in compression', ['adding more water to the mix', 'heating the concrete', 'using no steel'], 'It counteracts tensile stresses from loads.')
M(T, 'Corrosion of steel bridges is an example of', 'an electrochemical reaction', ['a mechanical failure only', 'creep', 'thermal expansion'], 'Iron oxidises in the presence of water and oxygen.')
M(T, 'A beam simply supported at its ends with a central load has maximum bending moment', 'at the centre', ['at the supports', 'at quarter span', 'nowhere, it is zero'], m('M_{max} = \\frac{WL}{4}') + ' at mid-span.')
M(T, 'The factor of safety is', 'ultimate (or yield) stress divided by working stress', ['working stress divided by ultimate stress', 'load times area', 'the mass of the structure'], 'Designs allow a margin for uncertainty.')
M(T, 'Which bridge type carries its load mainly through compression in a curved member?', 'Arch bridge', ['Suspension bridge', 'Cable-stayed bridge', 'Beam bridge'], 'The arch pushes outwards on its abutments.')
M(T, 'Fatigue failure is caused by', 'repeated cyclic loading below the ultimate strength', ['a single overload', 'corrosion only', 'high temperature only'], 'Cracks grow with each cycle.')
W(T, 2, 'A 4 m beam is simply supported at both ends with a 6 kN point load at its centre. Find the maximum bending moment.', ['Each reaction = 3 kN.', m('M_{max} = 3 \\times 2 = 6') + ' kNm, at the centre.'], C2, typed=False)
W(T, 3, 'A 1.5 m aluminium rod with area 200 mm² extends 0.75 mm under a 7 kN tensile load. Find the stress, strain and Young\'s modulus.', [m('\\sigma = \\frac{7000}{200 \\times 10^{-6}} = 35') + ' MPa', m('\\varepsilon = \\frac{0.75}{1500} = 5 \\times 10^{-4}'), m('E = \\frac{35 \\times 10^6}{5 \\times 10^{-4}} = 70') + ' GPa'], C3, typed=False)
W(T, 3, 'Explain why prestressed concrete is used for long-span bridge beams.', ['Concrete is strong in compression but weak in tension, and a long beam under load has large tensile stresses on its underside.', 'Prestressing tensions steel tendons and locks them, putting the concrete into compression before any load is applied.', 'Under load, the tension from bending first has to overcome this compression, so the concrete does not crack and longer, slimmer spans are possible.'], X(3))
W(T, 2, 'Outline how corrosion of steel in bridges can be prevented.', ['Barrier protection: painting or galvanising (zinc coating) stops water and oxygen reaching the steel.', 'Cathodic protection: sacrificial anodes (e.g. zinc) corrode instead of the steel; or use weathering steel or stainless steel.'], X(2))

T = 'Personal and Public Transport'
M(T, 'Static friction is', 'the friction that must be overcome to start an object moving', ['the friction while sliding', 'always zero', 'friction in a liquid'], 'It is usually larger than kinetic friction.')
M(T, 'The coefficient of friction is', 'friction force divided by normal force', ['normal force divided by friction force', 'mass times acceleration', 'weight times angle'], m('\\mu = \\frac{F}{N}'))
M(T, 'Work done by a force is', 'force times distance moved in the direction of the force', ['force divided by time', 'mass times velocity', 'power times distance'], m('W = Fs'))
M(T, 'Power is', 'the rate of doing work', ['force times distance', 'mass times acceleration', 'energy stored'], m('P = \\frac{W}{t}'))
M(T, 'A 1200 kg car accelerates from rest to 20 m/s. Its kinetic energy gain is', '240 kJ', ['24 kJ', '12 kJ', '480 kJ'], m('\\frac{1}{2}(1200)(20)^2 = 240\\,000') + ' J.')
M(T, 'Aluminium alloys are used for train carriages mainly because they are', 'light and corrosion resistant', ['heavy and cheap', 'magnetic', 'brittle'], 'Lower mass means less energy to accelerate.')
M(T, 'Heat treatment that softens steel and relieves stress by slow cooling is', 'annealing', ['quenching', 'tempering', 'case hardening'], 'Full annealing gives a soft, ductile structure.')
M(T, 'Quenching steel from above its upper critical temperature produces', 'martensite, which is hard and brittle', ['pearlite, which is soft', 'pure ferrite', 'cast iron'], 'Rapid cooling traps carbon in a distorted structure.')
M(T, 'Tempering is done after quenching to', 'reduce brittleness while keeping most of the hardness', ['make steel softer than annealing', 'increase brittleness', 'remove all carbon'], 'Reheating to a lower temperature relieves stress.')
M(T, 'Laminated windscreen glass is used because', 'the plastic interlayer holds the glass together when it breaks', ['it is cheaper than toughened glass', 'it shatters into small cubes', 'it is lighter than plastic'], 'It stays in place on impact.')
M(T, 'Thermosoftening polymers are used for car interior trim because they', 'can be moulded easily into complex shapes', ['cannot be reheated', 'are always stronger than steel', 'conduct electricity well'], 'e.g. ABS and polypropylene.')
M(T, 'A circuit in a car where current has only one path is a', 'series circuit', ['parallel circuit', 'short circuit', 'open circuit'], 'Car lighting uses parallel circuits so each lamp works independently.')
W(T, 2, 'A 1500 kg car travelling at 25 m/s brakes to a stop in 50 m. Find the average braking force.', [m('KE = \\frac{1}{2}(1500)(25)^2 = 468\\,750') + ' J', m('F = \\frac{468\\,750}{50} = 9375') + ' N'], C2, typed=False)
W(T, 2, 'A 20 kg crate rests on a floor. A horizontal force of 70 N just starts it moving. Find the coefficient of static friction (g = 9.8 m/s²).', [m('N = 20 \\times 9.8 = 196') + ' N', m('\\mu_s = \\frac{70}{196} = 0.36')], C2, typed=False)
W(T, 3, 'Explain how quenching and tempering change the structure and properties of a medium carbon steel axle.', ['Heating above the upper critical temperature forms austenite.', 'Quenching cools it rapidly, trapping carbon to form martensite, which is very hard but brittle.', 'Tempering reheats to a lower temperature, which relieves internal stresses and lets some carbon form fine carbides, so the axle keeps high strength and gains toughness.'], X(3))
W(T, 4, 'Evaluate the use of aluminium alloys instead of steel for the body of a modern bus.', ['Aluminium alloys have about one third the density of steel, so the body is much lighter.', 'A lighter body needs less energy to accelerate, reducing fuel or battery use and emissions, and allows more passengers within axle limits.', 'Aluminium forms a protective oxide layer, so it resists corrosion and lasts longer.', 'However, it is more expensive, harder to weld and repair, and less stiff, so thicker sections are needed.', 'Judgement: for buses the running-cost and corrosion benefits outweigh the higher initial cost, so aluminium is a good choice.'], X(4))

T = 'Aeronautical Engineering'
M(T, 'The four forces on an aircraft in flight are', 'lift, weight, thrust and drag', ['lift, mass, power and friction', 'thrust, torque, weight and lift', 'drag, gravity, pressure and power'], 'In steady level flight lift = weight and thrust = drag.')
M(T, 'Bernoulli\'s principle states that as the speed of a fluid increases, its pressure', 'decreases', ['increases', 'stays the same', 'doubles'], 'Faster air over the wing has lower pressure.')
M(T, 'Increasing the angle of attack beyond the critical angle causes', 'a stall', ['more lift without limit', 'less drag', 'a turbine to start'], 'Airflow separates from the upper surface.')
M(T, 'The control surface that controls roll is the', 'aileron', ['elevator', 'rudder', 'flap'], 'Ailerons move in opposite directions.')
M(T, 'The rudder controls', 'yaw', ['roll', 'pitch', 'lift only'], 'Rotation about the vertical axis.')
M(T, 'The elevator controls', 'pitch', ['yaw', 'roll', 'thrust'], 'Rotation about the lateral axis.')
M(T, 'A turbofan engine produces most of its thrust from', 'the bypass air moved by the large fan', ['the exhaust of the core alone', 'a propeller', 'rockets'], 'High-bypass engines are efficient at subsonic speeds.')
M(T, 'Composite materials such as carbon-fibre reinforced polymer are used in aircraft because of their', 'high strength-to-weight ratio', ['low cost', 'high density', 'ease of recycling'], 'They save weight and resist fatigue and corrosion.')
M(T, 'Aluminium alloys used in aircraft such as 2024 are strengthened by', 'precipitation (age) hardening', ['quenching to form martensite', 'cold working only', 'adding more carbon'], 'Fine precipitates block dislocation movement.')
M(T, 'Fatigue cracking in aircraft is often found', 'around rivet holes and other stress concentrations', ['only in the tyres', 'in parts that carry no load', 'only in composite parts'], 'Holes concentrate stress.')
M(T, 'Flaps are extended during take-off and landing to', 'increase lift at low speed', ['reduce lift', 'increase speed', 'control yaw'], 'They increase camber and wing area.')
W(T, 2, 'Use Bernoulli\'s principle to explain how a wing produces lift.', ['The aerofoil shape and angle of attack make air flow faster over the upper surface than the lower surface.', 'By Bernoulli\'s principle the faster air has lower pressure, so the pressure difference pushes the wing up, producing lift.'], X(2))
W(T, 3, 'Explain why aircraft engineers moved from aluminium alloys to composites for many structural parts.', ['Carbon-fibre composites have a higher strength-to-weight and stiffness-to-weight ratio, so structures are lighter.', 'Lighter aircraft use less fuel and have greater range and payload.', 'Composites do not corrode and resist fatigue well, cutting maintenance, and they can be moulded into large single parts with fewer fasteners.'], X(3))
W(T, 2, 'An aircraft of mass 60 000 kg flies level. Find the lift force required (g = 9.8 m/s²).', ['In level flight lift = weight.', m('L = 60\\,000 \\times 9.8 = 588\\,000') + ' N ' + m('= 588') + ' kN'], C2, typed=False)

T = 'Telecommunications Engineering'
M(T, 'Optical fibres carry signals using', 'total internal reflection of light', ['electrical current in copper', 'radio waves', 'sound waves'], 'Light stays in the core because the cladding has a lower refractive index.')
M(T, 'For total internal reflection the light must travel', 'from a higher to a lower refractive index at more than the critical angle', ['from a lower to a higher refractive index', 'at exactly 90°', 'through air'], 'This keeps light inside the core.')
M(T, 'Amplitude modulation (AM) varies the', 'amplitude of the carrier wave', ['frequency of the carrier wave', 'phase only', 'speed of the wave'], 'FM varies the frequency.')
M(T, 'An advantage of FM over AM is', 'less affected by electrical noise', ['longer range over the horizon', 'simpler circuitry', 'uses lower frequencies'], 'Noise mainly changes amplitude, which FM ignores.')
M(T, 'Geostationary satellites orbit at about', '36 000 km above the equator', ['400 km', '2000 km', '384 000 km'], 'Their period matches Earth\'s rotation.')
M(T, 'Analogue-to-digital conversion involves', 'sampling and quantising a signal', ['amplifying a signal', 'modulating a carrier', 'filtering only'], 'The signal is measured at intervals and given binary values.')
M(T, 'Copper is used in telecommunications cable because it has', 'high electrical conductivity and ductility', ['high resistance', 'very low cost compared with steel', 'magnetic properties'], 'It is easily drawn into wire.')
M(T, 'Which travels fastest down an optical fibre with lowest loss?', 'Infrared light in single-mode fibre', ['Radio waves in copper', 'Visible light in multimode fibre over long distances', 'Sound in glass'], 'Single-mode fibre avoids modal dispersion.')
M(T, 'Mobile phone networks are divided into cells so that', 'frequencies can be reused in non-adjacent cells', ['each phone has its own frequency forever', 'signals travel further', 'satellites are not needed'], 'Frequency reuse increases capacity.')
M(T, 'Polyethylene is used to insulate telecommunications cables because it is', 'a good electrical insulator and water resistant', ['a good conductor', 'brittle', 'magnetic'], 'It also flexes without cracking.')
W(T, 2, 'Explain how light is kept inside an optical fibre.', ['The core has a higher refractive index than the cladding.', 'Light hitting the core–cladding boundary at more than the critical angle is totally internally reflected, so it zig-zags along the core.'], X(2))
W(T, 3, 'Compare optical fibre and copper cable for long-distance data transmission.', ['Both carry information as signals along a cable.', 'Optical fibre has far greater bandwidth and much lower signal loss, so it needs fewer repeaters over long distances.', 'Fibre is immune to electromagnetic interference and harder to tap, while copper is cheaper to terminate and can carry electrical power.'], X(3))

T = 'Engineering Fundamentals'
M(T, 'Which is a ferrous metal?', 'Cast iron', ['Copper', 'Aluminium', 'Brass'], 'Ferrous metals contain iron.')
M(T, 'Ductility is the ability of a material to', 'be drawn into wire without breaking', ['resist scratching', 'break without bending', 'conduct heat'], 'Copper and gold are very ductile.')
M(T, 'A third-angle orthogonal drawing places the top view', 'above the front view', ['below the front view', 'to the left of the front view', 'behind the front view'], 'Australian Standard AS 1100 uses third-angle projection.')
M(T, 'Hardness is a material\'s resistance to', 'indentation and scratching', ['bending', 'stretching', 'impact'], 'Measured with Brinell, Vickers or Rockwell tests.')
W(T, 2, 'Distinguish between thermosoftening and thermosetting polymers.', ['Thermosoftening polymers have weak forces between chains, so they soften when heated and can be remoulded (e.g. PVC).', 'Thermosetting polymers have strong cross-links, so they do not soften on heating and cannot be remoulded (e.g. Bakelite).'], X(2))

T = 'Engineered Products'
M(T, 'Injection moulding is best suited to', 'mass production of identical polymer parts', ['one-off metal parts', 'large steel beams', 'hand-made timber furniture'], 'High tooling cost, low cost per part.')
M(T, 'Galvanising protects steel by', 'coating it with zinc', ['painting it red', 'heating it', 'adding carbon'], 'Zinc corrodes in preference to steel.')
W(T, 2, 'Outline the advantages of using an aluminium alloy for a household appliance casing.', ['Light and easy to form (pressing, extrusion, die casting).', 'Corrosion resistant and recyclable, with an attractive finish.'], X(2))

T = 'Braking Systems'
M(T, 'Disc brakes are better than drum brakes at', 'dissipating heat', ['being cheap', 'working without friction', 'self-energising'], 'The exposed disc cools quickly, reducing brake fade.')
M(T, 'Hydraulic brakes rely on', 'pressure transmitted through an incompressible fluid', ['compressed air', 'electrical current', 'magnetism only'], 'Pascal\'s principle.')
M(T, 'Brake fade is caused by', 'overheating of the brakes', ['too little friction material', 'cold weather', 'low tyre pressure'], 'Friction falls as temperature rises.')
W(T, 2, 'Explain how an anti-lock braking system (ABS) improves safety.', ['Sensors detect when a wheel is about to lock, and the system rapidly releases and reapplies brake pressure.', 'The wheels keep rolling, so the driver can still steer and stopping distance on many surfaces is reduced.'], X(2))

T = 'Biomedical Engineering'
M(T, 'Titanium alloys are used for hip replacements because they are', 'strong, light and biocompatible', ['cheap and magnetic', 'soft and flexible', 'transparent'], 'They also resist corrosion in the body.')
M(T, 'UHMWPE is used in artificial joints as', 'a low-friction bearing surface', ['a structural bone replacement', 'an electrical conductor', 'a coating to stop healing'], 'It wears slowly against metal or ceramic.')
W(T, 2, 'Outline two properties required of a material used for an artificial hip joint.', ['Biocompatibility: it must not be toxic or cause rejection.', 'High strength and fatigue and wear resistance, as it carries cyclic loads for many years.'], X(2))

b.save()
