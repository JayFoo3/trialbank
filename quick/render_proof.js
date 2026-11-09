// Induction drills -> what the site shows. Reads quick/quick-ext1-proof.raw.json (gen_proof.py), writes quick/quick-ext1-proof.json:
// the question and the model answer as KaTeX HTML laid out like the teacher's board work, plus plain TeX versions for the marker.
// Usage: node quick/render_proof.js   (needs katex: npm install katex@0.16.11)
const katex = require('katex'), fs = require('fs'), path = require('path');
const dir = __dirname;
const Q = JSON.parse(fs.readFileSync(path.join(dir, 'quick-ext1-proof.raw.json'), 'utf8'));
const K = (t) => katex.renderToString(t, { throwOnError: true, output: 'html' });
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const series = (q, last) => [...q.nums, '\\dots', ...last].join(' + ');
const row = (lab, tex, note = '') => `<span class="pf-lab">${lab}</span><span class="pf-e">=</span><span class="pf-x">${K(tex)}</span><span class="pf-n">${esc(note)}</span>`;
const steps = (lab, list) => list.map((t, i) => row(i ? '' : lab, t)).join('');

const out = Q.map((q) => {
  const stmt = `${series(q, [q.tn])} = ${q.rn}`;
  const s2 = `${series(q, [q.tk])} = ${q.rk}`;
  const s3 = `${series(q, [q.tk, q.tk1])} = ${q.rk1}`;
  const lhs = series(q, [q.tk, q.tk1]);
  const chain = q.chain.map(([t, note], i) => [i === q.chain.length - 1 ? `${t} = \\text{RHS}` : t, note]);
  const prompt = `Use mathematical induction to prove that ${K(stmt)} for all integers ${K('n \\ge 1')}.`;
  const solution = `<div class="pf">
<p class="pf-h"><u>Step 1:</u> Prove true for ${K('n=1')}</p>
<p>when ${K('n=1')},</p>
<div class="pf-cols"><div class="pf-eq">${steps('LHS', q.s1l)}</div><div class="pf-eq">${steps('RHS', q.s1r)}</div></div>
<p>${K('\\therefore')} true for ${K('n=1')}</p>
<p class="pf-h"><u>Step 2:</u> Let ${K('n=k')} be a number for which the statement is true</p>
<p class="pf-ie">i.e. ${K(s2)}</p>
<p class="pf-h"><u>Step 3:</u> Prove true for ${K('n=k+1')}</p>
<p class="pf-ie">i.e. ${K(s3)}</p>
<div class="pf-eq pf-chain">${row('LHS', lhs)}${chain.map(([t, n]) => row('', t, n)).join('')}</div>
<div class="pf-end"><p>${K('\\therefore')} true for ${K('n=k+1')}</p><p>${K('\\therefore')} by induction, the statement is true for all integers ${K('n \\ge 1')}</p></div>
</div>`;
  // the same model answer as text, for the marker (it reads TeX)
  const sol_text = [
    'Step 1: Prove true for n=1', 'when n=1,',
    `LHS = ${q.s1l.join(' = ')}        RHS = ${q.s1r.join(' = ')}`, '∴ true for n=1',
    'Step 2: Let n=k be a number for which the statement is true', `i.e. ${s2}`,
    'Step 3: Prove true for n=k+1', `i.e. ${s3}`, `LHS = ${lhs}`,
    ...chain.map(([t, n]) => `= ${t.replace('\\text{RHS}', 'RHS')}${n ? '        (' + n + ')' : ''}`),
    '∴ true for n=k+1', '∴ by induction, the statement is true for all integers n ≥ 1',
    '', 'Marking guideline (3 marks): 1 mark for proving it true for n=1. 1 more mark for writing the statement for n=k and correctly',
    'using it to start Step 3. 3 marks for a correct, complete proof.',
  ].join('\n');
  return { step: q.step, level: q.level, kind: 'proof', marks: 3, prompt, solution, stmt_text: `Use mathematical induction to prove that ${stmt} for all integers n ≥ 1.`, sol_text };
});
fs.writeFileSync(path.join(dir, 'quick-ext1-proof.json'), JSON.stringify(out));
console.log(out.length, 'rendered', (fs.statSync(path.join(dir, 'quick-ext1-proof.json')).size / 1024).toFixed(0) + ' KB');
