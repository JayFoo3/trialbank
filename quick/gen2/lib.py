"""Shared helpers for the quick-question banks.

MCQ items:     M(topic, prompt, right, [wrong, wrong, wrong], why, step=None)
Worked items:  W(topic, marks, prompt, [model answer lines], [(criterion, marks), ...], step=None)
  marks <= 2 -> 'written', marks >= 3 -> 'extended'.
Maths goes in \\( ... \\) and is turned into KaTeX HTML by render.js; the marker gets the plain TeX (sol_text / stmt_text).
"""
import json, random, re, os, subprocess, html

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
L = 'ABCD'


class Bank:
    def __init__(self, slug, code, typed=False, seed=1):
        self.slug, self.code, self.typed = slug, code, typed
        self.mcq, self.worked, self.R = [], [], random.Random(seed)
        self.n = {}

    def _step(self, topic, step):
        if step: return step
        key = self.code + '-' + re.sub(r'[^a-z]', '', topic.lower())[:10]
        return key

    def M(self, topic, prompt, right, wrong, why, step=None):
        prompt, right, wrong, why = ln(prompt), ln(right), [ln(w) for w in wrong], ln(why)
        opts = [right] + list(wrong)
        assert len(opts) == 4 and len(set(opts)) == 4, (prompt, opts)
        self.R.shuffle(opts)
        self.mcq.append({'step': self._step(topic, step), 'topic': topic, 'prompt': prompt, 'options': opts,
                         'answer': L[opts.index(right)], 'why': why})

    def W(self, topic, marks, prompt, lines, crit, step=None, typed=None):
        prompt, lines = ln(prompt), [ln(z) for z in lines]
        assert sum(1 for _ in crit) and max(m for _, m in crit) <= marks, prompt
        self.worked.append({'step': self._step(topic, step), 'topic': topic, 'kind': 'worked', 'marks': marks,
                            'format': 'written' if marks <= 2 else 'extended', 'typed': self.typed if typed is None else typed,
                            'prompt': prompt, 'lines': lines, 'crit': crit})

    def save(self):
        base = os.path.join(OUT, self.slug)
        if self.mcq: json.dump(self.mcq, open(base + '.raw.json', 'w'), ensure_ascii=False)
        if self.worked:
            for q in self.worked:
                q['stmt_text'] = plain(q['prompt'])
                guide = '\n'.join(f'- {c} ({m} mark{"s" if m != 1 else ""})' for c, m in q['crit'])
                q['sol_text'] = 'Model answer:\n' + '\n'.join(plain(l) for l in q['lines']) + \
                    f'\n\nMarking guideline ({q["marks"]} marks, award the highest band the response fully meets):\n{guide}\n' + \
                    'Equivalent methods and wording that show the same understanding get the same marks.'
                q['solution'] = ''.join(f'<p>{l}</p>' for l in q['lines']) + \
                    '<table class="ol-crit"><tr><th>Criteria</th><th>Marks</th></tr>' + \
                    ''.join(f'<tr><td>{c}</td><td>{m}</td></tr>' for c, m in q['crit']) + '</table>'
                del q['lines'], q['crit']
            json.dump(self.worked, open(base + '-worked.raw.json', 'w'), ensure_ascii=False)
        print(self.slug, len(self.mcq), 'mcq', len(self.worked), 'worked',
              sum(q['format'] == 'written' for q in self.worked), 'written', sum(q['format'] == 'extended' for q in self.worked), 'extended')


def plain(s):
    s = re.sub(r'\\\((.+?)\\\)', lambda m: m.group(1), s)
    s = re.sub(r'<[^>]+>', '', s)
    return html.unescape(s)


def ln(s):
    s = s.replace('\\log{\\left(', '\\ln{\\left(')
    parts = re.split(r'(\\\(.+?\\\))', s)   # outside maths: \$ -> $ and {,} -> ,
    return ''.join(p if p.startswith('\\(') else p.replace('\\$', '$').replace('{,}', ',') for p in parts)
