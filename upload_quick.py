#!/usr/bin/env python3
"""upload_quick.py - put quick questions on Trialbank: short textbook-style multiple choice, marked as you tap.
Also the induction drills (quick-ext1-proof, from quick/gen_proof.py + render_proof.js): written proofs, 3 marks, with a model answer
in the class teacher's layout. They show up in written practice on Proof by Induction, never in quick sets.
They live in their own hidden 'paper' (slug quick-...), so they never show in the papers list or exam mode.
Reads quick/<slug>.json (made by quick/gen_*.py then quick/render.js).
Written and extended quick questions (quick/<slug>-worked.json, from quick/gen2/*.py then quick/gen2/render.js) are kind 'worked':
stored like the drills (content.kind 'proof', marked from the working) with content.format 'written' (2 marks) or 'extended' (3+),
and typed: true where a typed answer is allowed (worded subjects). The site picks them with Quick > Format.
Usage: python3 upload_quick.py quick-chem   (keys come from ~/.trialbank_keys)
Everything: python3 upload_quick.py --all"""
import json, os, sys, requests
import keys  # noqa: F401  (loads ~/.trialbank_keys)
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
HERE = os.path.dirname(os.path.abspath(__file__))
TOPIC = {'wf': 'Working with Functions', 'gt': 'Graphing Techniques', 'tm': 'Trigonometry and Measure of Angles', 'tf': 'Trigonometric Functions and Graphs',
         'id': 'Introduction to Differentiation', 'dc': 'Differential Calculus', 'el': 'Exponential and Logarithmic Functions', 'ad': 'Applications of Differentiation',
         'ic': 'Integral Calculus', 'fm': 'Financial Mathematics', 'pr': 'Probability', 'dp': 'Discrete Probability Distributions',
         'ds': 'Descriptive Statistics and Bivariate Data', 'nd': 'The Normal Distribution',
         'ss': 'Sequences and Series', 'pm': 'Projectile Motion', 'cm': 'Circular Motion', 'mg': 'Motion in Gravitational Fields', 'cf': 'Charged Particles, Conductors and Fields',
         'me': 'The Motor Effect', 'ei': 'Electromagnetic Induction', 'am': 'Applications of the Motor Effect', 'es': 'Electromagnetic Spectrum', 'lw': 'Light: Wave Model',
         'lq': 'Light: Quantum Model', 'sr': 'Light and Special Relativity', 'oe': 'Origins of the Elements', 'at': 'Structure of the Atom',
         'qa': 'Quantum Mechanical Nature of the Atom', 'pn': 'Properties of the Nucleus', 'da': 'Deep Inside the Atom', 've': 'Vectors', 'pj': 'Projectiles', 'tid': 'Identities', 'te': 'Trig. Eqns', 'in': 'Integration', 'vo': 'Volumes',
         'de': "DE's", 'eg': 'Exp. G + D', 'rr': 'Related Rates', 'pa': 'Parametrics', 'if': 'Inverse Fns', 'iq': 'Inequalities', 'bd': 'Bern./Binom Dist.', 'pi': 'Proof Induction', 'be': 'Binom. Exp.', 'pc': 'Perms/Combs', 'rf': 'Rem/Fact Th.', 'sp': 'Sum/Prod. Roots', 'it': 'Inverse Trig Fns',
         'sde': 'Static and Dynamic Equilibrium', 'fae': 'Factors that Affect Equilibrium', 'kq': 'Calculating the Equilibrium Constant (Keq)', 'sq': 'Solution Equilibria',
         'pab': 'Properties of Acids and Bases', 'bl': 'Using Brønsted–Lowry Theory', 'qan': 'Quantitative Analysis', 'nm': 'Nomenclature', 'hc': 'Hydrocarbons',
         'prh': 'Products of Reactions Involving Hydrocarbons', 'al': 'Alcohols', 'oab': 'Reactions of Organic Acids and Bases', 'po': 'Polymers',
         'ai': 'Analysis of Inorganic Substances', 'ao': 'Analysis of Organic Substances', 'csd': 'Chemical Synthesis and Design',
         'ti': 'Trigonometric Identities and Equations', 'cp': 'Continuous Probability Distributions', 'gr': 'Graphical Relat.', 'fo': 'Further Operations', 'co': 'Combinatorics', 'na': 'Normal Approx.'}
SUBJ = {'quick-adv': 'Adv', 'quick-ext1': 'Ext1', 'quick-physics': 'Physics', 'quick-chem': 'Chem', 'quick-ext1-proof': 'Ext1',
        'quick-ext2': 'Ext2', 'quick-std2': 'Std2', 'quick-bio': 'Bio', 'quick-econ': 'Econ', 'quick-eng': 'Eng', 'quick-se': 'SE', 'quick-engadv': 'EngAdv', 'quick-engstd': 'EngStd'}
subj_of = lambda slug: SUBJ.get(slug) or SUBJ[slug.removesuffix('-worked')]   # quick-bio-worked -> Bio
topic_of = lambda step: TOPIC[step.rstrip('0123456789')]   # tid1 -> Identities, ve3 -> Vectors
topic_q = lambda q: q.get('topic') or topic_of(q['step'])   # newer files name the topic on each question
skill_q = lambda q: [q['step']] if q['step'].rstrip('0123456789') in TOPIC else None   # only real syllabus step ids (pm3, ss5...)
LEVEL = {'ss1': 1, 'ss2': 1, 'ss5': 1, 'ss3': 2, 'ss6': 2, 'ss4': 3, 'ss7': 3, 'ss8': 3,
         'be1': 1, 'pc1': 1, 'rf2': 1, 'sp1': 1, 'sp2': 1, 'it1': 1, 'it2': 1, 'pi3': 3, 'be3': 3, 'be4': 3, 'pc5': 3, 'sp4': 3, 'rf1': 3}

def ok(r, what):
    if r.status_code >= 300: sys.exit(f'{what}: {r.status_code} {r.text[:300]}')
    return r

slugs = sys.argv[1:]
if slugs == ['--all']: slugs = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, 'quick')) if f.startswith('quick-') and f.endswith('.json') and not f.endswith('.raw.json'))
for slug in slugs:
    qs = json.load(open(os.path.join(HERE, 'quick', f'{slug}.json')))
    paper = dict(slug=slug, subject=subj_of(slug), school='Quick questions', year=2026, difficulty='Easier', online=True, release_pct=0)
    r = ok(requests.post(f'{URL}/rest/v1/papers?on_conflict=slug', headers={**H, 'Prefer': 'resolution=merge-duplicates,return=representation'}, json=paper, timeout=60), 'paper')
    pid = r.json()[0]['id']
    count, rows = {}, []
    for q in qs:
        count[q['step']] = count.get(q['step'], 0) + 1
        qid = f"{q['step']}-{count[q['step']]:02d}"
        if q.get('kind') == 'worked':   # a written (2 marks) or extended (3+ marks) quick question, marked from the working like the drills
            t = topic_q(q)
            rows.append({'id': f'{slug}/{qid}', 'paper_id': pid, 'qid': qid, 'number': len(rows) + 1, 'type': 'short', 'marks': q['marks'],
                         'topic': t, 'topics': [t], 'skills': skill_q(q), 'level': q.get('level', 2), 'answer': None,
                         'content': {'kind': 'proof', 'format': q['format'], 'typed': bool(q.get('typed')), 'prompt': q['prompt'], 'solution': q['solution'],
                                     'stmt_text': q['stmt_text'], 'sol_text': q['sol_text']}})
            continue
        if q.get('kind') == 'proof':   # a written proof, marked from the handwriting against sol_text
            rows.append({'id': f'{slug}/{qid}', 'paper_id': pid, 'qid': qid, 'number': len(rows) + 1, 'type': 'short', 'marks': q['marks'],
                         'topic': topic_of(q['step']), 'topics': [topic_of(q['step'])], 'skills': [q['step']], 'level': q.get('level', 2),
                         'answer': None, 'content': {'kind': 'proof', 'prompt': q['prompt'], 'solution': q['solution'], 'stmt_text': q['stmt_text'], 'sol_text': q['sol_text']}})
            continue
        rows.append({'id': f'{slug}/{qid}', 'paper_id': pid, 'qid': qid, 'number': len(rows) + 1, 'type': 'mcq', 'marks': 1,
                     'topic': topic_q(q), 'topics': [topic_q(q)], 'skills': skill_q(q), 'level': LEVEL.get(q['step'], 2),
                     'answer': q['answer'], 'content': {'kind': 'single', 'quick': True, 'prompt': q['prompt'], 'options': q['options'], 'answer': q['answer'], 'why': q['why']}})
    big = slug.endswith(('-proof', '-worked'))
    for i in range(0, len(rows), 20 if big else 100):   # proofs and worked answers carry big model answers: smaller batches
        n = 20 if big else 100
        ok(requests.post(f'{URL}/rest/v1/questions?on_conflict=id', headers={**H, 'Prefer': 'resolution=merge-duplicates'}, json=rows[i:i + n], timeout=120), 'questions')
    keep = {x['id'] for x in rows}   # remove questions dropped from the file (looked up first: a long id list won't fit in a URL)
    have, off = [], 0
    while True:   # the server hands back 1000 rows at a time
        page = ok(requests.get(f'{URL}/rest/v1/questions?paper_id=eq.{pid}&select=id&order=id&offset={off}&limit=1000', headers=H, timeout=60), 'list').json()
        have += [q['id'] for q in page]; off += 1000
        if len(page) < 1000: break
    old = [x for x in have if x not in keep]
    for i in range(0, len(old), 50):
        ids = ','.join(f'"{x}"' for x in old[i:i + 50])
        ok(requests.delete(f'{URL}/rest/v1/questions?id=in.({ids})', headers=H, timeout=60), 'remove old questions')
    print(f'{slug}: {len(rows)} {"induction drills" if slug.endswith("-proof") else "written/extended quick questions" if slug.endswith("-worked") else "quick questions"}')
