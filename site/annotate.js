// Trialbank annotation: write on a question with an Apple Pencil, mouse or finger, plus blank space underneath for working.
// Strokes are saved on this device per student and question, scaled to the card width so they survive resizing.
(function () {
  const COLOURS = [['#1f2329', 'Black'], ['#2f5be8', 'Blue'], ['#e5484d', 'Red']];
  const HL = 'rgba(255, 210, 63, 0.38)';
  let active = null;                     // the one card being annotated right now
  let bar = null;
  const tool = { kind: 'pen', colour: COLOURS[0][0], touch: 'scroll' };   // touch: scroll | pencil (fingers ignored) | draw
  try { Object.assign(tool, JSON.parse(localStorage.getItem('tb_ann_tool') || '{}')); } catch { /* defaults */ }
  if (tool.finger === true) { tool.touch = 'draw'; delete tool.finger; }
  const TOUCH = { scroll: ['Fingers scroll', 'Pencil draws. One finger scrolls or taps an answer.'], pencil: ['Pencil only', 'Fingers and palm are ignored. Scroll with two fingers.'], draw: ['Fingers draw', 'Fingers and Pencil both draw.'] };
  const saveTool = () => { try { localStorage.setItem('tb_ann_tool', JSON.stringify(tool)); } catch { /* blocked */ } };

  const load = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || { s: [], space: 1 }; } catch { return { s: [], space: 1 }; } };
  const store = (key, d) => {
    try { if (d.s.length) localStorage.setItem(key, JSON.stringify(d)); else localStorage.removeItem(key); }
    catch { /* storage full: keep it in memory for this visit */ }
  };

  function drawStroke(ctx, st, w) {
    const p = st.p; if (!p.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (st.t === 'hl') { ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = HL; }
    else ctx.strokeStyle = st.c;
    const base = (st.t === 'hl' ? 18 : 2.4) * (w / 700);
    if (p.length === 3) {                // a dot
      ctx.fillStyle = st.t === 'hl' ? HL : st.c;
      ctx.beginPath(); ctx.arc(p[0] * w, p[1] * w, Math.max(1, base * (0.6 + p[2]) / 2), 0, Math.PI * 2); ctx.fill();
      ctx.restore(); return;
    }
    // smooth through midpoints, line width follows pen pressure
    for (let i = 3; i < p.length; i += 3) {
      const x0 = p[i - 3] * w, y0 = p[i - 2] * w, x1 = p[i] * w, y1 = p[i + 1] * w;
      const pr = st.t === 'hl' ? 1 : 0.55 + 0.9 * (p[i + 2] || 0.5);
      ctx.lineWidth = Math.max(1, base * pr);
      ctx.beginPath();
      if (i >= 6) { const xm = (p[i - 6] * w + x0) / 2, ym = (p[i - 5] * w + y0) / 2; ctx.moveTo(xm, ym); ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); }
      else { ctx.moveTo(x0, y0); ctx.lineTo((x0 + x1) / 2, (y0 + y1) / 2); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function attach(card, key) {
    const data = load(key);
    const space = document.createElement('div'); space.className = 'ann-space';
    space.innerHTML = '<span>Working space</span>';
    const canvas = document.createElement('canvas'); canvas.className = 'ann-canvas';
    card.classList.add('ann-on');
    card.append(space, canvas);
    const ctx = canvas.getContext('2d');
    const undo = [], redo = [];
    let w = 0, h = 0, dpr = 1, cur = null, scrollY = null, tap = null;

    function size() {
      const r = card.getBoundingClientRect();
      w = r.width; h = card.scrollHeight; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      redraw();
    }
    function redraw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      data.s.forEach(st => drawStroke(ctx, st, w));
      if (cur) drawStroke(ctx, cur, w);
    }
    const pos = (ev) => { const r = canvas.getBoundingClientRect(); return [(ev.clientX - r.left) / w, (ev.clientY - r.top) / w, ev.pressure || 0.5]; };
    const draws = (ev) => ev.pointerType === 'pen' || ev.pointerType === 'mouse' || tool.touch === 'draw';
    const capture = (ev) => { try { canvas.setPointerCapture(ev.pointerId); } catch { /* pointer already gone */ } };
    const touches = new Map();             // pencil-only mode: two fingers together scroll
    let pinchY = null;

    function eraseAt(x, y) {
      const r = 14 / w, before = data.s.length;
      const keep = data.s.filter(st => { for (let i = 0; i < st.p.length; i += 3) if (Math.hypot(st.p[i] - x, st.p[i + 1] - y) < r) return false; return true; });
      if (keep.length !== before) { undo.push(data.s); redo.length = 0; data.s = keep; redraw(); store(key, data); }
    }
    canvas.addEventListener('pointerdown', (ev) => {
      if (!draws(ev) && tool.touch === 'pencil') {             // palm and single fingers do nothing
        ev.preventDefault(); touches.set(ev.pointerId, ev.clientY); capture(ev);
        if (touches.size >= 2) pinchY = [...touches.values()].reduce((a, b) => a + b, 0) / touches.size;
        return;
      }
      if (!draws(ev)) { scrollY = ev.clientY; tap = [ev.clientX, ev.clientY]; capture(ev); return; }   // a finger scrolls the page
      ev.preventDefault(); capture(ev);
      const [x, y, pr] = pos(ev);
      if (tool.kind === 'eraser') { cur = { erase: true }; eraseAt(x, y); return; }
      cur = { t: tool.kind === 'hl' ? 'hl' : 'pen', c: tool.colour, p: [x, y, pr] };
      redraw();
    });
    canvas.addEventListener('pointermove', (ev) => {
      if (touches.has(ev.pointerId)) {
        touches.set(ev.pointerId, ev.clientY);
        if (touches.size >= 2) { const y = [...touches.values()].reduce((a, b) => a + b, 0) / touches.size; if (pinchY != null) window.scrollBy(0, pinchY - y); pinchY = y; }
        return;
      }
      if (scrollY != null) { if (tap && Math.hypot(ev.clientX - tap[0], ev.clientY - tap[1]) > 8) tap = null; window.scrollBy(0, scrollY - ev.clientY); scrollY = ev.clientY; return; }
      if (!cur) return;
      ev.preventDefault();
      const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      for (const e of evs) {
        const [x, y, pr] = pos(e);
        if (cur.erase) { eraseAt(x, y); continue; }
        const n = cur.p.length;
        if (Math.hypot(cur.p[n - 3] - x, cur.p[n - 2] - y) * w < 1.2) continue;
        cur.p.push(x, y, pr);
      }
      if (!cur.erase) redraw();
    });
    const end = () => {
      if (scrollY != null && tap) {      // a finger tap goes through to the question (pick an answer while annotating)
        canvas.style.pointerEvents = 'none';
        const el = document.elementFromPoint(tap[0], tap[1]);
        canvas.style.pointerEvents = '';
        el?.closest('button, a, label, input, select, textarea')?.click?.();
      }
      tap = null;
      scrollY = null;
      if (!cur) return;
      if (!cur.erase && cur.p.length) {
        undo.push(data.s); redo.length = 0;
        data.s = [...data.s, { ...cur, p: cur.p.map(v => Math.round(v * 10000) / 10000) }];
        store(key, data);
      }
      cur = null; redraw();
    };
    const lift = (ev) => { if (touches.delete(ev.pointerId)) { if (touches.size < 2) pinchY = null; return true; } return false; };
    canvas.addEventListener('pointerup', (ev) => { if (!lift(ev)) end(); });
    canvas.addEventListener('pointercancel', (ev) => { if (!lift(ev)) end(); });
    const ro = new ResizeObserver(size); ro.observe(card);
    size();
    // images inside the card can finish loading after we start
    card.querySelectorAll('img').forEach(im => { if (!im.complete) im.addEventListener('load', size, { once: true }); });

    return {
      undo() { if (undo.length) { redo.push(data.s); data.s = undo.pop(); redraw(); store(key, data); } },
      redo() { if (redo.length) { undo.push(data.s); data.s = redo.pop(); redraw(); store(key, data); } },
      clear() { if (data.s.length) { undo.push(data.s); data.s = []; redraw(); store(key, data); } },
      count: () => data.s.length,
      // a picture of the question with the working on it (for auto-marking or saving)
      async snapshot() { return canvas.toDataURL('image/png'); },
      detach() { ro.disconnect(); canvas.remove(); space.remove(); card.classList.remove('ann-on'); },
    };
  }

  const ICON = {
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    hl: '<path d="M9 14l-4 6h6l1-2"/><path d="M8 13l7-9 5 4-7 9z"/>',
    eraser: '<path d="M7 20h11"/><path d="M5 15l8-8 6 6-6 6H9z"/>',
    undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
    redo: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 0 0 0 12"/>',
    clear: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
    hand: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.3-1.9L8 14"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

  function showBar() {
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'ann-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Annotation tools');
      document.body.appendChild(bar);
    }
    const sw = COLOURS.map(([c, n]) => `<button class="ann-sw${tool.kind === 'pen' && tool.colour === c ? ' on' : ''}" data-c="${c}" title="${n} pen" aria-label="${n} pen"><i style="background:${c}"></i></button>`).join('');
    bar.innerHTML = `${sw}
      <button class="ann-t${tool.kind === 'hl' ? ' on' : ''}" data-k="hl" title="Highlighter">${svg('hl')}</button>
      <button class="ann-t${tool.kind === 'eraser' ? ' on' : ''}" data-k="eraser" title="Eraser">${svg('eraser')}</button>
      <span class="ann-sep"></span>
      <button class="ann-t" data-a="undo" title="Undo">${svg('undo')}</button>
      <button class="ann-t" data-a="redo" title="Redo">${svg('redo')}</button>
      <button class="ann-t" data-a="clear" title="Clear this question">${svg('clear')}</button>
      <button class="ann-mode${tool.touch === 'pencil' ? ' on' : ''}" data-a="touch" title="${TOUCH[tool.touch][1]}">${svg(tool.touch === 'draw' ? 'hand' : 'pen')}<span>${TOUCH[tool.touch][0]}</span></button>
      <button class="ann-done" data-a="done">Done</button>`;
    bar.onclick = (ev) => {
      const b = ev.target.closest('button'); if (!b || !active) return;
      if (b.dataset.c) { tool.kind = 'pen'; tool.colour = b.dataset.c; }
      else if (b.dataset.k) tool.kind = b.dataset.k;
      else if (b.dataset.a === 'touch') {
        tool.touch = { scroll: 'pencil', pencil: 'draw', draw: 'scroll' }[tool.touch] || 'scroll';
        hint(TOUCH[tool.touch][1]);
      }
      else if (b.dataset.a === 'done') { stop(); return; }
      else if (b.dataset.a === 'clear') { if (active.api.count() && !confirm('Clear everything you wrote on this question?')) return; active.api.clear(); }
      else if (active.api[b.dataset.a]) active.api[b.dataset.a]();
      saveTool(); showBar();
    };
    bar.hidden = false;
    document.body.classList.add('annotating');
  }
  function hint(t) {
    let el = document.querySelector('.ann-hint');
    if (!el) { el = document.createElement('div'); el.className = 'ann-hint'; document.body.appendChild(el); }
    el.textContent = t; el.classList.add('on'); clearTimeout(hint.t); hint.t = setTimeout(() => el.classList.remove('on'), 2600);
  }
  function stop() {
    if (!active) return;
    active.api.detach(); active.btn.classList.remove('on'); active.btn.querySelector('span').textContent = 'Annotate';
    active = null;
    if (bar) bar.hidden = true;
    document.body.classList.remove('annotating');
  }
  // a button that switches annotation on for `card`; key identifies the student's notes for this question
  function button(card, key) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ann-btn';
    btn.innerHTML = `${svg('pen')}<span>Annotate</span>`;
    const has = () => { try { return !!localStorage.getItem(key); } catch { return false; } };
    if (has()) btn.classList.add('has');
    btn.onclick = () => {
      if (active && active.card === card) { stop(); btn.classList.toggle('has', has()); return; }
      stop();
      active = { card, btn, api: attach(card, key) };
      btn.classList.add('on'); btn.querySelector('span').textContent = 'Stop';
      showBar();
    };
    return btn;
  }
  window.Annotate = { button, stop, active: () => active };
})();
