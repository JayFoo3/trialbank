"""rw.py - Trialbank's own versions of official HSC questions.
Each official HSC question keeps its slot in the paper (same id, number, marks and topic) but the question itself is ours: the same
skill and the same trap with different numbers and our own wording, typed (not a picture of NESA's page), with our own worked answer.
A paper's file (ext1_2023.py ...) lists them by question id; every answer is worked out or checked in code there.
  M(qid, prompt, right, [3 wrong], why)                       multiple choice
  W(qid, marks, prompt, [model answer lines], [(criterion, marks), ...])   working, marked from the handwriting
Maths goes in \\( ... \\); render.js turns it into KaTeX HTML. Then: python3 upload_hsc_rw.py <slug>"""
import json, os, random, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'quick', 'gen2'))
from lib import plain, ln
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)


class Paper:
    def __init__(self, slug, seed=1):
        self.slug, self.qs, self.R = slug, [], random.Random(seed)

    def M(self, qid, prompt, right, wrong, why):
        prompt, right, wrong, why = ln(prompt), ln(right), [ln(w) for w in wrong], ln(why)
        opts = [right] + list(wrong); assert len(opts) == 4 and len(set(opts)) == 4, (qid, opts)
        self.R.shuffle(opts); ans = 'ABCD'[opts.index(right)]
        self.qs.append({'qid': qid, 'type': 'mcq', 'answer': ans, 'kind': 'single', 'prompt': prompt, 'options': opts, 'why': why})

    def W(self, qid, marks, prompt, lines, crit):
        prompt, lines = ln(prompt), [ln(z) for z in lines]
        assert crit and max(m for _, m in crit) == marks, qid
        guide = '\n'.join(f'- {plain(c)} ({m} mark{"s" if m != 1 else ""})' for c, m in crit)
        self.qs.append({'qid': qid, 'type': 'short', 'marks': marks, 'kind': 'proof', 'format': 'written' if marks <= 2 else 'extended', 'prompt': prompt,
            'stmt_text': plain(prompt),
            'sol_text': 'Model answer:\n' + '\n'.join(plain(l) for l in lines) + f'\n\nMarking guideline ({marks} marks, award the highest band the response fully meets):\n{guide}\n'
                        'Equivalent methods and wording that show the same understanding get the same marks.',
            'solution': ''.join(f'<p>{l}</p>' for l in lines) + '<table class="ol-crit"><tr><th>Criteria</th><th>Marks</th></tr>' + ''.join(f'<tr><td>{c}</td><td>{m}</td></tr>' for c, m in crit) + '</table>'})

    def save(self):
        ids = [q['qid'] for q in self.qs]; assert len(ids) == len(set(ids)), 'a question id is used twice'
        json.dump(self.qs, open(os.path.join(OUT, self.slug + '.raw.json'), 'w'), ensure_ascii=False)
        print(self.slug, len(self.qs), 'questions:', sum(q['type'] == 'mcq' for q in self.qs), 'multiple choice,', sum(q['type'] != 'mcq' for q in self.qs), 'working')
