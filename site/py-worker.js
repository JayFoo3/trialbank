// Trialbank: runs students' Python (Pyodide) off the main page, so a stuck loop can be stopped.
// A file of its own (not a blob) so the page can keep a strict Content-Security-Policy.
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
const boot = loadPyodide();
onmessage = async (ev) => {
  const { id, code, tests } = ev.data;
  const py = await boot;
  const out = { id, results: [], error: null, stdout: '' };
  let buf = '';
  py.setStdout({ batched: s => { buf += s + '\n'; } });
  const ns = py.globals.get('dict')();
  try { py.runPython(code, { globals: ns }); }
  catch (e) { out.error = String(e.message || e).split('\n').filter(Boolean).slice(-1)[0]; }
  if (!out.error) for (const t of tests) {
    try {
      const got = py.runPython('repr(' + t.call + ')', { globals: ns });
      const ok = py.runPython('(' + t.call + ') == (' + t.expect + ')', { globals: ns });
      out.results.push({ call: t.call, expect: t.expect, got, ok: !!ok });
    } catch (e) { out.results.push({ call: t.call, expect: t.expect, got: String(e.message || e).split('\n').filter(Boolean).slice(-1)[0], ok: false }); }
  }
  out.stdout = buf.slice(0, 2000);
  postMessage(out);
};
