// \( ... \) -> KaTeX HTML in prompts, options, explanations and model answers. Usage: node render.js out/<slug>.raw.json out/<slug>.json
const katex = require('katex'), fs = require('fs');
const [inp, out] = process.argv.slice(2);
const r = (s, big = false) => String(s).replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => katex.renderToString((big ? '\\displaystyle ' : '') + t, { throwOnError: true, output: 'html' }));
const Q = JSON.parse(fs.readFileSync(inp, 'utf8'));
let bad = 0;
const done = Q.map(q => {
  try {
    const o = { ...q, prompt: r(q.prompt) };
    if (q.options) { o.options = q.options.map(x => r(x, true)); o.why = r(q.why); }
    if (q.solution) o.solution = r(q.solution);
    return o;
  } catch (e) { bad++; console.error(e.message, q.prompt); return null; }
}).filter(Boolean);
fs.writeFileSync(out, JSON.stringify(done));
console.log(out, done.length, 'rendered', bad, 'failed');
if (bad) process.exit(1);
