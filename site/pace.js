/* pace.js - the speed timer for practice sets (Options > Speed timer > Per mark). Each question gets the time the real
   exam would give it: its marks x (the exam's working time / the paper's marks). The clock in the set bar counts down,
   goes red and counts up once you're over, and stops when you answer, tap Show solution or tap Mark my working. */
(function () {
  const TOTAL = { Ext1: 70, EngAdv: 40, EngStd: 40 };   // marks in the paper the exam time is set for (100 for the rest)
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  let t0 = 0, allowed = 0, frozen = null, tick = null, el = null;
  const perMark = (subject) => { const ex = ((window.APP_CONFIG || {}).exam || {})[subject]; return ex && ex.working ? ex.working * 60 / (TOTAL[subject] || 100) : 108; };
  function draw() {
    if (!el) return;
    const used = frozen != null ? frozen : (Date.now() - t0) / 1000, left = allowed - used;
    el.textContent = left >= 0 ? fmt(left) : '+' + fmt(-left);
    el.classList.toggle('over', left < 0);
    el.classList.toggle('low', left >= 0 && frozen == null && left < Math.min(20, allowed * 0.2));
    el.classList.toggle('held', frozen != null);
  }
  function freeze() { if (!t0 || frozen != null) return; frozen = (Date.now() - t0) / 1000; clearInterval(tick); draw(); }
  window.Pace = {
    perMark, fmt,
    // start the clock for question x (or hide it: pass null)
    show(x, subject) {
      clearInterval(tick); el = document.getElementById('pace'); t0 = 0; frozen = null;
      if (!el) return;
      if (!x) { el.hidden = true; return; }
      allowed = Math.max(1, x.type === 'mcq' ? 1 : (x.marks || 1)) * perMark(subject);
      t0 = Date.now(); el.hidden = false; el.title = `${fmt(allowed)} for this question at exam pace`;
      draw(); tick = setInterval(draw, 500);
    },
    // the answer is in: how long it took against what was allowed (null if the clock wasn't running)
    stop() { if (!t0) return null; freeze(); const r = { used: Math.round(frozen), allowed: Math.round(allowed) }; t0 = 0; return r; },
  };
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#show-sol, #auto-mark')) freeze(); }, true);
})();
