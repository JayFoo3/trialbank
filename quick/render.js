// \( ... \) -> KaTeX HTML, so the site needs only the KaTeX stylesheet (no maths code runs in the browser)
const katex = require('katex'), fs = require('fs');
const [inp, out] = process.argv.slice(2);
const r = (s, big = false) => s.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => katex.renderToString((big ? '\\displaystyle ' : '') + t, { throwOnError: true, output: 'html' }));
const Q = JSON.parse(fs.readFileSync(inp, 'utf8'));
let bad = 0;
const done = Q.map(q => { try { return { ...q, prompt: r(q.prompt), options: q.options.map(o => r(o, true)), why: r(q.why) }; } catch (e) { bad++; console.error(e.message, q.prompt); return null; } }).filter(Boolean);
fs.writeFileSync(out, JSON.stringify(done));
console.log(done.length, 'rendered', bad, 'failed', (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
