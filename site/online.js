// Trialbank online questions: questions stored as content (not page images), answered on screen like the online HSC.
// kinds: single (one letter), multi (select all), match (item -> letter), written (typed), code (typed, with Python tests).
(function () {
  const L = 'ABCDEFGHIJ';
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const OBJECTIVE = new Set(['single', 'multi', 'match']);
  const kind = (q) => q && q.content && q.content.kind;
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

  function answered(q, v) {
    if (v == null) return false;
    if (Array.isArray(v)) return kind(q) === 'match' ? v.some(Boolean) : v.length > 0;
    return String(v).trim().length > 0;
  }
  function score(q, v) {
    const c = q.content, k = c.kind;
    if (k === 'single') return v === c.answer ? q.marks || 1 : 0;
    if (k === 'multi') return Array.isArray(v) && sameSet(v, c.answer) ? q.marks || 1 : 0;
    if (k === 'match') {
      const right = c.answer.filter((a, i) => Array.isArray(v) && v[i] === a).length;
      const full = q.marks || 2;
      return right === c.answer.length ? full : right >= c.answer.length / 2 ? Math.floor(full / 2) : 0;
    }
    return null;
  }

  // ---------- Python runner: Pyodide in a worker, so a stuck loop can be stopped ----------
  let worker = null, ready = null, seq = 0;
  const pending = {};
  function getWorker() {
    if (!worker) {
      worker = new Worker(new URL('py-worker.js', document.baseURI));
      worker.onmessage = (ev) => { const p = pending[ev.data.id]; if (p) { delete pending[ev.data.id]; p(ev.data); } };
    }
    return worker;
  }
  function runPython(code, tests, ms = 20000) {
    return new Promise((resolve) => {
      const id = ++seq, w = getWorker();
      const t = setTimeout(() => { delete pending[id]; w.terminate(); worker = null; resolve({ error: 'Stopped after ' + ms / 1000 + ' seconds. Check for a loop that never ends.', results: [] }); }, ms);
      pending[id] = (r) => { clearTimeout(t); resolve(r); };
      w.postMessage({ id, code, tests });
    });
  }

  // ---------- question ----------
  // opts: { value, disabled, reveal, onChange(v) }
  function render(q, opts = {}) {
    const c = q.content, k = c.kind, root = el('div', 'ol');
    root.appendChild(el('div', 'ol-prompt', c.prompt));
    let v = opts.value;
    const set = (nv) => { v = nv; opts.onChange && opts.onChange(nv); };
    if (k === 'single' || k === 'multi') {
      if (k === 'multi') root.appendChild(el('p', 'ol-hint', 'Select all that apply.'));
      const list = el('div', 'ol-opts ' + k);
      const picked = (l) => k === 'single' ? v === l : Array.isArray(v) && v.includes(l);
      c.options.forEach((o, i) => {
        const l = L[i], b = el('button', 'ol-opt', `<span class="ol-box">${l}</span><span class="ol-text">${o}</span>`);
        b.type = 'button'; b.disabled = !!opts.disabled;
        const key = k === 'single' ? [c.answer] : c.answer;
        const paint = () => {
          b.classList.toggle('picked', picked(l));
          if (opts.reveal) { b.classList.toggle('correct', key.includes(l)); b.classList.toggle('wrong', picked(l) && !key.includes(l)); }
        };
        b.onclick = () => {
          if (k === 'single') set(v === l ? null : l);
          else { const cur = Array.isArray(v) ? v.slice() : []; const at = cur.indexOf(l); if (at >= 0) cur.splice(at, 1); else cur.push(l); cur.sort(); set(cur); }
          list.querySelectorAll('.ol-opt').forEach(x => x._paint());
        };
        b._paint = paint; paint(); list.appendChild(b);
      });
      root.appendChild(list);
    } else if (k === 'match') {
      const grid = el('div', 'ol-match');
      const left = el('div', 'ol-items'), right = el('ol', 'ol-letters');
      c.items.forEach((it, i) => {
        const row = el('label', 'ol-item'); row.appendChild(el('span', 'ol-num', String(i + 1)));
        row.appendChild(el('span', 'ol-text', it));
        const s = el('select'); s.disabled = !!opts.disabled;
        s.appendChild(el('option', '', '–'));
        c.options.forEach((_, j) => { const o = el('option', '', L[j]); o.value = L[j]; s.appendChild(o); });
        s.value = (Array.isArray(v) && v[i]) || '–';
        s.onchange = () => { const cur = Array.isArray(v) ? v.slice() : c.items.map(() => null); cur[i] = s.value === '–' ? null : s.value; set(cur); };
        if (opts.reveal) { const okk = Array.isArray(v) && v[i] === c.answer[i]; row.classList.add(okk ? 'correct' : 'wrong'); if (!okk) row.appendChild(el('span', 'ol-key', esc(c.answer[i]))); }
        row.appendChild(s); left.appendChild(row);
      });
      c.options.forEach((o, j) => right.appendChild(el('li', '', `<span class="ol-box">${L[j]}</span><span>${o}</span>`)));
      grid.append(left, right); root.appendChild(grid);
    } else {
      const ta = el('textarea', k === 'code' ? 'ol-code' : 'ol-written');
      ta.rows = Math.max(4, Math.round((c.lines || 8) * (k === 'code' ? 1.1 : 0.7)));
      ta.placeholder = k === 'code' ? (c.lang === 'sql' ? 'Write your SQL here' : 'Write your Python here') : 'Type your answer';
      ta.spellcheck = k !== 'code'; ta.value = v || ''; ta.disabled = !!opts.disabled;
      ta.oninput = () => set(ta.value);
      if (k === 'code') ta.onkeydown = (ev) => {
        if (ev.key !== 'Tab') return;
        ev.preventDefault();
        const s = ta.selectionStart, e = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(e); ta.selectionStart = ta.selectionEnd = s + 4; set(ta.value);
      };
      root.appendChild(ta);
      if (k === 'code' && c.lang === 'python' && c.tests && c.tests.length) {
        const bar = el('div', 'ol-run'), btn = el('button', 'secondary', 'Run tests'), out = el('div', 'ol-tests');
        btn.type = 'button';
        btn.onclick = async () => {
          btn.disabled = true; btn.textContent = worker ? 'Running…' : 'Loading Python…';
          const r = await runPython(ta.value + (c.setup ? '\n\n' + c.setup : ''), c.tests);   // setup: hidden helpers the tests use
          btn.disabled = false; btn.textContent = 'Run tests';
          out.innerHTML = '';
          if (r.error) { out.appendChild(el('p', 'ol-err', esc(r.error))); return; }
          const n = r.results.filter(x => x.ok).length;
          out.appendChild(el('p', 'ol-sum ' + (n === r.results.length ? 'good' : 'bad'), `${n} of ${r.results.length} tests passed`));
          r.results.forEach(t => out.appendChild(el('div', 'ol-test ' + (t.ok ? 'ok' : 'no'),
            `<span>${t.ok ? '✓' : '✗'}</span><code>${esc(t.call)}</code><span class="muted">expected ${esc(t.expect)}${t.ok ? '' : ', got ' + esc(t.got)}</span>`)));
          if (r.stdout) out.appendChild(el('pre', 'ol-stdout', esc(r.stdout)));
        };
        bar.appendChild(btn); bar.appendChild(el('span', 'muted small', 'Runs your code against the same tests the marker uses.'));
        root.append(bar, out);
      }
    }
    return root;
  }

  // ---------- solution ----------
  function solution(q, v) {
    const c = q.content, k = c.kind, box = el('div', 'ol-sol');
    if (k === 'single' || k === 'multi') box.appendChild(el('p', '', `<b>Answer: ${esc(k === 'multi' ? c.answer.join(', ') : c.answer)}</b>`));
    if (k === 'match') box.appendChild(el('p', '', `<b>Answer: ${esc(c.answer.map((a, i) => `${i + 1}–${a}`).join(', '))}</b> <span class="muted small">(${q.marks} marks for all correct, ${Math.floor(q.marks / 2)} for at least half)</span>`));
    if (c.why) box.appendChild(el('p', '', c.why));
    if (c.criteria) {
      const t = el('table', 'ol-crit');
      t.innerHTML = '<tr><th>Criteria</th><th>Marks</th></tr>' + c.criteria.map(([a, m]) => `<tr><td>${a}</td><td>${m}</td></tr>`).join('');
      box.appendChild(t);
    }
    if (c.sample) { box.appendChild(el('p', '', '<b>Sample answer</b>')); box.appendChild(el('div', 'ol-sample', c.sample)); }
    return box;
  }

  window.Online = { render, solution, score, answered, objective: (q) => OBJECTIVE.has(kind(q)), kind };
})();
