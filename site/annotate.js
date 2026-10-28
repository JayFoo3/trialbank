// Trialbank annotation: write anywhere on the question page with an Apple Pencil, mouse or finger: the question, the answers,
// the solution, the margins, plus lined working space at the bottom.
// Each stroke is pinned to the part of the page it was drawn on (question, solution, working space...), so it stays in place
// when the page changes around it (a solution opening, a hint appearing). Saved on this device per student and question.
(function () {
  const COLOURS = [['#1f2329', 'Black'], ['#2f6fe8', 'Blue'], ['#e5484d', 'Red'], ['#1f9d55', 'Green'], ['#f08c00', 'Orange']];
  const HL = 'rgba(255, 210, 63, 0.42)';
  const SIZES = [['thin', 1.7], ['med', 2.6], ['thick', 4.2]];
  let active = null;                     // the one page being annotated right now
  let bar = null, clearArmed = 0;
  const tool = { kind: 'pen', colour: COLOURS[0][0], size: 'med', touch: 'scroll' };   // touch: scroll | pencil (fingers ignored) | draw
  try { Object.assign(tool, JSON.parse(localStorage.getItem('tb_ann_tool') || '{}')); } catch { /* defaults */ }
  if (tool.finger === true) { tool.touch = 'draw'; delete tool.finger; }
  if (!['scroll', 'pencil', 'draw'].includes(tool.touch)) tool.touch = 'scroll';
  if (!SIZES.some(([k]) => k === tool.size)) tool.size = 'med';
  if (!COLOURS.some(([c]) => c === tool.colour)) tool.colour = COLOURS[0][0];
  const TOUCH = { scroll: ['Fingers scroll', 'Pencil draws. One finger scrolls or taps a button.'], pencil: ['Pencil only', 'Fingers and palm are ignored. Scroll with two fingers.'], draw: ['Fingers draw', 'Fingers and Pencil both draw.'] };
  const saveTool = () => { try { localStorage.setItem('tb_ann_tool', JSON.stringify(tool)); } catch { /* blocked */ } };
  const sizeOf = (k) => (SIZES.find(([n]) => n === k) || SIZES[1])[1];

  const load = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || { s: [] }; } catch { return { s: [] }; } };
  const store = (key, d) => {
    try { if (d.s.length) localStorage.setItem(key, JSON.stringify(d)); else localStorage.removeItem(key); }
    catch { /* storage full: keep it in memory for this visit */ }
  };

  // ---- drawing one stroke. Points are [x, y, pressure] in units of the page width; oy = where its anchor sits now ----
  function drawStroke(ctx, st, w, oy, ox = 0) {
    const p = st.p; if (!p || !p.length) return;
    const X = (i) => ox + p[i] * w, Y = (i) => oy + p[i + 1] * w;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (st.t === 'hl') {                 // one smooth path at one width, so overlaps don't go blotchy
      ctx.strokeStyle = HL; ctx.fillStyle = HL; ctx.lineWidth = 18 * (w / 700);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      if (p.length === 3) { ctx.arc(X(0), Y(0), ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
      for (let i = 3; i < p.length; i += 3) ctx.lineTo(X(i), Y(i));
      ctx.stroke(); ctx.restore(); return;
    }
    const base = (st.w || 2.4) * (w / 700);
    ctx.strokeStyle = st.c; ctx.fillStyle = st.c;
    if (p.length === 3) { ctx.beginPath(); ctx.arc(X(0), Y(0), Math.max(1, base * (0.6 + p[2]) / 2), 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
    for (let i = 3; i < p.length; i += 3) {   // smooth through midpoints; width follows pen pressure
      const x0 = X(i - 3), y0 = Y(i - 3), x1 = X(i), y1 = Y(i);
      ctx.lineWidth = Math.max(1, base * (0.55 + 0.9 * (p[i + 2] || 0.5)));
      ctx.beginPath();
      if (i >= 6) { ctx.moveTo((X(i - 6) + x0) / 2, (Y(i - 6) + y0) / 2); ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); }
      else { ctx.moveTo(x0, y0); ctx.lineTo((x0 + x1) / 2, (y0 + y1) / 2); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- no text selection, callouts or zoom gestures while writing ----
  const block = (ev) => { if (active) ev.preventDefault(); };
  document.addEventListener('selectstart', block);
  document.addEventListener('contextmenu', (ev) => { if (active && ev.target.closest('.ann-live')) ev.preventDefault(); });
  document.addEventListener('gesturestart', block);   // iOS pinch while writing

  function attach(scope, key, legacyAnchor) {
    const data = load(key);
    const space = document.createElement('div'); space.className = 'ann-space';
    space.innerHTML = '<span>Working space</span>';
    const base = document.createElement('canvas'); base.className = 'ann-canvas';
    const live = document.createElement('canvas'); live.className = 'ann-canvas ann-live';
    scope.classList.add('ann-on');
    scope.append(space, base, live);
    const bctx = base.getContext('2d'), lctx = live.getContext('2d');
    const undo = [], redo = [];
    let w = 0, h = 0, cw = 0, ox = 0, dpr = 1, cur = null, curTop = 0, scrollY = null, tap = null, sizeQueued = false;

    // anchors: the page's own blocks (question card, answers, solution, working space...). A stroke remembers which one it's on.
    const anchorKey = (el) => el === space ? 'space' : el.id ? '#' + el.id : `${el.className.split(' ')[0] || el.tagName}@${[...scope.children].indexOf(el)}`;
    const anchors = () => [...scope.children].filter(el => el !== base && el !== live && el.offsetParent !== null && getComputedStyle(el).position !== 'fixed');
    let tops = {};
    function measure() {
      const r = scope.getBoundingClientRect(); tops = {};
      anchors().forEach(el => { const b = el.getBoundingClientRect(); tops[anchorKey(el)] = { top: b.top - r.top, bottom: b.bottom - r.top }; });
      if (legacyAnchor) { const b = legacyAnchor.getBoundingClientRect(); tops.__legacy = { top: b.top - r.top }; }
    }
    const topOf = (st) => st.a ? tops[st.a]?.top : tops.__legacy?.top ?? 0;   // undefined: that part of the page is hidden right now
    function anchorFor(y) {          // the block under this point, or the nearest one above it
      let best = null, bestTop = -Infinity;
      for (const [k, v] of Object.entries(tops)) {
        if (k === '__legacy') continue;
        if (y >= v.top && y <= v.bottom) return [k, v.top];
        if (v.top <= y && v.top > bestTop) { best = k; bestTop = v.top; }
      }
      return best ? [best, bestTop] : ['space', tops.space?.top ?? 0];
    }

    function size() {
      if (cur) { sizeQueued = true; return; }         // never resize mid-stroke (that's what made lines jump)
      const r = scope.getBoundingClientRect();
      measure();   // height from the page's own blocks, not scrollHeight (the canvas itself would stop it ever shrinking)
      const nw = r.width, nh = Math.ceil(Math.max(0, ...Object.values(tops).map(v => v.bottom || 0)) + 8);
      // the canvas spans the whole screen width, so the margins either side can be written on too
      const ncw = Math.max(nw, document.documentElement.clientWidth), nox = Math.max(0, Math.round(r.left));
      if (nw !== w || nh !== h || ncw !== cw || nox !== ox) {   // only reallocate when something actually changed size
        w = nw; h = nh; cw = ncw; ox = nox;
        // iPad Safari blanks canvases over ~16 million pixels: lower the resolution on very tall pages instead
        dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(15e6 / Math.max(1, cw * h))));
        for (const c of [base, live]) { c.width = Math.round(cw * dpr); c.height = Math.round(h * dpr); c.style.width = cw + 'px'; c.style.height = h + 'px'; c.style.left = -ox + 'px'; }
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      measure(); redrawBase();
    }
    function redrawBase() {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.clearRect(0, 0, cw, h);
      data.s.forEach(st => { const oy = topOf(st); if (oy !== undefined) drawStroke(bctx, st, w, oy, ox); });
    }
    function redrawLive() { lctx.clearRect(0, 0, cw, h); if (cur && !cur.erase) drawStroke(lctx, cur, w, curTop, ox); }
    const pt = (ev) => { const r = live.getBoundingClientRect(); return [ev.clientX - r.left - ox, ev.clientY - r.top, ev.pressure || 0.5]; };   // x from the page's left edge
    const draws = (ev) => ev.pointerType === 'pen' || ev.pointerType === 'mouse' || tool.touch === 'draw';
    const capture = (ev) => { try { live.setPointerCapture(ev.pointerId); } catch { /* pointer already gone */ } };
    const touches = new Map();             // pencil-only mode: two fingers together scroll
    let pinchY = null, downAt = null;

    function eraseAt(px, py) {
      const r = 14, before = data.s.length;
      const keep = data.s.filter(st => {
        const oy = topOf(st); if (oy === undefined) return true;
        for (let i = 0; i < st.p.length; i += 3) if (Math.hypot(st.p[i] * w - px, oy + st.p[i + 1] * w - py) < r) return false;
        return true;
      });
      if (keep.length !== before) { if (!cur.pushed) { undo.push(data.s); redo.length = 0; cur.pushed = true; } data.s = keep; redrawBase(); store(key, data); }
    }
    // a quick tap that didn't move, on a button or link underneath, goes through to it (pick an answer, show the solution)
    function tapThrough(x, y) {
      live.style.pointerEvents = 'none'; base.style.pointerEvents = 'none';
      const el = document.elementFromPoint(x, y);
      live.style.pointerEvents = ''; base.style.pointerEvents = '';
      const hit = el?.closest('button, a, label, input, select, textarea, summary, [role="button"]');
      if (hit) { hit.click(); if (/^(INPUT|TEXTAREA|SELECT)$/.test(hit.tagName)) hit.focus(); }
      return !!hit;
    }
    // Each pointer is tracked by its own id. Before, one shared "scrolling" state meant a palm or finger resting on the
    // screen swallowed the Pencil's movement and could end its stroke early: that was the writing cutting out.
    let drawId = null, scrollId = null, lastPen = 0;
    const palmWindow = 700;   // ms after the Pencil was last seen during which a touch counts as a resting hand
    live.addEventListener('pointerdown', (ev) => {
      try { window.getSelection()?.removeAllRanges(); } catch { /* fine */ }
      if (ev.pointerType === 'pen') lastPen = performance.now();
      if (!draws(ev)) {
        ev.preventDefault();
        if (drawId != null || performance.now() - lastPen < palmWindow) return;   // hand resting while writing: ignore it
        if (tool.touch === 'pencil') {                         // palm and single fingers do nothing; two fingers scroll
          touches.set(ev.pointerId, ev.clientY); capture(ev);
          if (touches.size >= 2) pinchY = [...touches.values()].reduce((a, b) => a + b, 0) / touches.size;
          return;
        }
        if (scrollId == null) { scrollId = ev.pointerId; tap = [ev.clientX, ev.clientY]; }   // a finger: Safari scrolls the page itself (smooth, with momentum); a tap still goes through
        return;
      }
      ev.preventDefault();
      if (cur && drawId != null && drawId !== ev.pointerId) finish(null);   // a stroke whose end never arrived: keep it
      scrollId = null; scrollY = null; tap = null; touches.clear(); pinchY = null;   // the Pencil wins over any touch already down
      drawId = ev.pointerId; capture(ev);
      measure();
      const [x, y, pr] = pt(ev);
      downAt = { x: ev.clientX, y: ev.clientY, t: performance.now(), moved: false };
      if (tool.kind === 'eraser') { cur = { erase: true }; eraseAt(x, y); return; }
      const [a, top] = anchorFor(y);
      curTop = top;
      cur = tool.kind === 'hl' ? { t: 'hl', a, p: [x / w, (y - top) / w, pr] } : { t: 'pen', c: tool.colour, w: sizeOf(tool.size), a, p: [x / w, (y - top) / w, pr] };
      redrawLive();
    });
    live.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'pen' && (ev.buttons || ev.pressure > 0)) lastPen = performance.now();   // the Pencil on the glass (not hovering above it)
      if (touches.has(ev.pointerId)) {
        touches.set(ev.pointerId, ev.clientY);
        if (touches.size >= 2) { const y = [...touches.values()].reduce((a, b) => a + b, 0) / touches.size; if (pinchY != null) window.scrollBy(0, pinchY - y); pinchY = y; }
        return;
      }
      if (ev.pointerId === scrollId) { if (tap && Math.hypot(ev.clientX - tap[0], ev.clientY - tap[1]) > 8) tap = null; return; }
      if (ev.pointerId !== drawId || !cur) return;
      ev.preventDefault();
      if (downAt && Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 4) downAt.moved = true;
      const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      for (const e of (evs.length ? evs : [ev])) {
        const [x, y, pr] = pt(e);
        if (cur.erase) { eraseAt(x, y); continue; }
        const n = cur.p.length, nx = x / w, ny = (y - curTop) / w;
        if (Math.hypot(cur.p[n - 3] - nx, cur.p[n - 2] - ny) * w < 1) continue;
        cur.p.push(nx, ny, pr);
      }
      if (!cur.erase) redrawLive();
    });
    // scribble back and forth over writing to rub it out (like Apple Notes). Strict on purpose, so handwriting never counts:
    // at least 5 passes that each cover a good part of the scribble's length, going back over the same strip (not drifting along
    // like "mmmm" does), and it only removes strokes that sit mostly inside the scribbled patch.
    function scratchOut(st) {
      const p = st.p, n = p.length / 3; if (n < 10) return false;
      const xs = [], ys = [];
      for (let i = 0; i < n; i++) { xs.push(p[i * 3] * w); ys.push(curTop + p[i * 3 + 1] * w); }
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const passes = (v) => {   // lengths of the back-and-forth runs along one axis, with jitter under 4px ignored
        const runs = []; let lo = v[0], hi = v[0], dir = 0, start = v[0];
        for (let i = 1; i < v.length; i++) {
          const x = v[i];
          if (dir >= 0 && x > hi) hi = x;
          if (dir <= 0 && x < lo) lo = x;
          if (dir >= 0 && hi - x > 4) { if (dir > 0 || hi - start > 4) runs.push(hi - start); dir = -1; start = hi; lo = x; }
          else if (dir <= 0 && x - lo > 4) { if (dir < 0 || start - lo > 4) runs.push(start - lo); dir = 1; start = lo; hi = x; }
        }
        runs.push(dir > 0 ? hi - start : start - lo);
        return runs.filter(r => r > 4);
      };
      const check = (v, along, across) => {
        if (along < 16 || across > 1.0 * along) return false;
        const runs = passes(v); if (runs.length < 5) return false;
        const sorted = [...runs].sort((a, b) => a - b), med = sorted[sorted.length >> 1];
        return med >= 0.45 * along;
      };
      if (!check(xs, x1 - x0, y1 - y0) && !check(ys, y1 - y0, x1 - x0)) return false;
      const pad = 3, hit = (st2) => {
        const oy = topOf(st2); if (oy === undefined) return false;
        const m = st2.p.length / 3; let inside = 0;
        for (let i = 0; i < m; i++) { const x = st2.p[i * 3] * w, y = oy + st2.p[i * 3 + 1] * w; if (x >= x0 - pad && x <= x1 + pad && y >= y0 - pad && y <= y1 + pad) inside++; }
        return inside >= m * 0.4;
      };
      const keep = data.s.filter(s2 => !hit(s2));
      if (keep.length === data.s.length) return false;   // nothing underneath: it's just a drawing, keep it
      undo.push(data.s); redo.length = 0; data.s = keep; redrawBase();
      const saving = data; setTimeout(() => store(key, saving), 0);
      return true;
    }
    function finish(ev) {
      if (!cur) { drawId = null; return; }
      const quick = ev && downAt && !downAt.moved && performance.now() - downAt.t < 220;   // a real tap, not a quick dot or full stop
      if (quick && !cur.erase && tapThrough(ev.clientX, ev.clientY)) { cur = null; drawId = null; redrawLive(); downAt = null; return; }   // clicked a button
      if (!cur.erase && cur.t === 'pen' && scratchOut(cur)) { cur = null; drawId = null; downAt = null; redrawLive(); if (sizeQueued) { sizeQueued = false; size(); } return; }
      if (!cur.erase && cur.p.length) {
        undo.push(data.s); redo.length = 0;
        data.s = [...data.s, { ...cur, p: cur.p.map(v => Math.round(v * 10000) / 10000) }];
        drawStroke(bctx, data.s[data.s.length - 1], w, curTop, ox);   // add just this stroke: no full redraw
        const saving = data;
        setTimeout(() => store(key, saving), 0);   // save after the frame, so writing the next stroke never waits on it
      }
      cur = null; drawId = null; downAt = null; redrawLive();
      if (sizeQueued) { sizeQueued = false; size(); }
    }
    const up = (ev, cancelled) => {
      if (touches.delete(ev.pointerId)) { if (touches.size < 2) pinchY = null; return; }
      if (ev.pointerId === scrollId) {
        if (!cancelled && tap) tapThrough(tap[0], tap[1]);   // a finger tap
        scrollId = null; scrollY = null; tap = null; return;
      }
      if (ev.pointerId === drawId) finish(cancelled ? null : ev);   // cancelled: keep what was drawn so far
    };
    // iPad: stop Safari claiming a Pencil stroke for Scribble or a gesture and cancelling it partway
    // fingers scroll natively; the Pencil, a resting palm, and any finger in the other touch modes are kept off the page
    const own = (ev) => {
      if (!ev.cancelable) return;
      const stylus = [...ev.touches, ...ev.changedTouches].some(t => t.touchType === 'stylus');
      if (stylus || tool.touch !== 'scroll' || drawId != null || performance.now() - lastPen < palmWindow || ev.touches.length > 1 && tool.touch !== 'scroll') ev.preventDefault();
    };
    live.style.touchAction = tool.touch === 'scroll' ? 'pan-y' : 'none';
    for (const t of ['touchstart', 'touchmove', 'touchend']) live.addEventListener(t, own, { passive: false });
    live.addEventListener('pointerup', (ev) => up(ev, false));
    live.addEventListener('pointercancel', (ev) => up(ev, true));
    live.addEventListener('lostpointercapture', (ev) => { if (ev.pointerId === drawId) finish(null); });
    let raf = 0;
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(size); };
    const ro = new ResizeObserver(later); ro.observe(scope);
    addEventListener('resize', later);
    const mo = new MutationObserver(later);   // solution opened, hint shown: re-pin strokes to where things are now
    mo.observe(scope, { subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'], childList: true });
    size();
    scope.querySelectorAll('img').forEach(im => { if (!im.complete) im.addEventListener('load', later, { once: true }); });

    return {
      undo() { if (undo.length) { redo.push(data.s); data.s = undo.pop(); redrawBase(); store(key, data); } },
      redo() { if (redo.length) { undo.push(data.s); data.s = redo.pop(); redrawBase(); store(key, data); } },
      clear() { if (data.s.length) { undo.push(data.s); data.s = []; redrawBase(); store(key, data); } },
      count: () => data.s.length,
      async snapshot() { return base.toDataURL('image/png'); },
      detach() { ro.disconnect(); mo.disconnect(); removeEventListener('resize', later); cancelAnimationFrame(raf); base.remove(); live.remove(); space.remove(); scope.classList.remove('ann-on'); },
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
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    scroll: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    unfull: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const isFull = () => document.body.classList.contains('ann-full');
  function setFull(on) {
    document.body.classList.toggle('ann-full', on);
    try {
      if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch { /* not supported: the page still hides everything around the question */ }
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && isFull() && !active) setFull(false); });

  // the tools stand in a tray like real ones: the one in your hand lifts up, and the pen's tip and band take its colour
  const TOOLS = {
    pen: (c) => `<svg viewBox="0 0 30 64" aria-hidden="true"><path class="tb" d="M7 22 15 3l8 19v42H7z"/><path class="tc" d="M7 22 15 3l8 19z"/><path d="M12.6 8.6 15 3l2.4 5.6z" fill="${c}"/><rect x="7" y="31" width="16" height="5" fill="${c}"/></svg>`,
    hl: () => `<svg viewBox="0 0 30 64" aria-hidden="true"><path class="tb" d="M6 24h18v40H6z"/><path class="tc" d="M6 24 9 11h12l3 13z"/><path d="M10 11l1.5-7h7L20 11z" fill="#f2c94c"/><rect x="6" y="32" width="18" height="5" fill="#f2c94c" opacity=".85"/></svg>`,
    eraser: () => `<svg viewBox="0 0 30 64" aria-hidden="true"><rect class="tb" x="6" y="8" width="18" height="56" rx="6"/><path d="M6 14a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v8H6z" fill="#ef9a9a"/><rect x="6" y="22" width="18" height="3" fill="#c9ccd3"/></svg>`,
  };
  function showBar() {
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'ann-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Annotation tools');
      document.body.appendChild(bar);
    }
    const tools = [['pen', 'Pen'], ['hl', 'Highlighter'], ['eraser', 'Eraser']].map(([k, n]) =>
      `<button class="ann-tool${tool.kind === k ? ' on' : ''}" data-k="${k}" title="${n}" aria-label="${n}" aria-pressed="${tool.kind === k}">${TOOLS[k](tool.colour)}</button>`).join('');
    const sizes = SIZES.map(([k]) => `<button class="ann-dot${tool.size === k ? ' on' : ''}" data-s="${k}" title="${{ thin: 'Fine', med: 'Medium', thick: 'Bold' }[k]} line" aria-label="${{ thin: 'Fine', med: 'Medium', thick: 'Bold' }[k]} line"><i class="sz-${k}"></i></button>`).join('');
    const sw = COLOURS.map(([c, n]) => `<button class="ann-sw${tool.colour === c ? ' on' : ''}" data-c="${c}" style="--c:${c}" title="${n}" aria-label="${n}"></button>`).join('');
    const armed = clearArmed > Date.now();
    bar.innerHTML = `<div class="ann-tray">${tools}</div>
      <div class="ann-group ann-sizes">${sizes}</div>
      <div class="ann-group ann-cols">${sw}</div>
      <div class="ann-group ann-acts">
        <button class="ann-ic" data-a="undo" title="Undo" aria-label="Undo">${svg('undo')}</button>
        <button class="ann-ic" data-a="redo" title="Redo" aria-label="Redo">${svg('redo')}</button>
        <button class="ann-ic${armed ? ' armed' : ''}" data-a="clear" title="Clear this page" aria-label="Clear this page">${armed ? '<span class="ann-sure">Clear all?</span>' : svg('clear')}</button>
        <button class="ann-ic${tool.touch !== 'scroll' ? ' lit' : ''}" data-a="touch" title="${TOUCH[tool.touch][0]}: ${TOUCH[tool.touch][1]}" aria-label="${TOUCH[tool.touch][0]}">${svg(tool.touch === 'draw' ? 'hand' : tool.touch === 'pencil' ? 'pen' : 'scroll')}</button>
        ${active?.full ? `<button class="ann-ic" data-a="full" title="${isFull() ? 'Exit full screen' : 'Full screen'}" aria-label="Full screen">${svg(isFull() ? 'unfull' : 'full')}</button>` : ''}
      </div>
      <button class="ann-done" data-a="done">Done</button>`;
    bar.onclick = (ev) => {
      const b = ev.target.closest('button'); if (!b || !active) return;
      if (b.dataset.c) { tool.colour = b.dataset.c; if (tool.kind !== 'pen') tool.kind = 'pen'; }
      else if (b.dataset.k) tool.kind = b.dataset.k;
      else if (b.dataset.s) { tool.size = b.dataset.s; if (tool.kind === 'eraser') tool.kind = 'pen'; }
      else if (b.dataset.a === 'touch') { tool.touch = { scroll: 'pencil', pencil: 'draw', draw: 'scroll' }[tool.touch] || 'scroll'; hint(`${TOUCH[tool.touch][0]}. ${TOUCH[tool.touch][1]}`); document.querySelectorAll('.ann-live').forEach(c => { c.style.touchAction = tool.touch === 'scroll' ? 'pan-y' : 'none'; }); }
      else if (b.dataset.a === 'full') setFull(!isFull());
      else if (b.dataset.a === 'done') { stop(); return; }
      else if (b.dataset.a === 'clear') {
        if (!active.api.count()) return;
        if (clearArmed < Date.now()) { clearArmed = Date.now() + 2500; showBar(); setTimeout(() => { if (active) showBar(); }, 2600); return; }   // tap twice to clear
        clearArmed = 0; active.api.clear();
      }
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
    const { btn, key } = active;
    active.api.detach(); btn.classList.remove('on'); btn.querySelector('span').textContent = 'Annotate';
    try { btn.classList.toggle('has', !!localStorage.getItem(key)); } catch { /* fine */ }
    active = null; clearArmed = 0;
    if (bar) bar.hidden = true;
    document.body.classList.remove('annotating');
    if (isFull()) setFull(false);
  }
  // a button that switches annotation on. `card` is the question; `opts.scope` is the area you can write on (defaults to the card);
  // `opts.full` offers a full-screen button. `key` identifies this student's notes for this question.
  function button(card, key, opts = {}) {
    const scope = opts.scope || card;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ann-btn';
    btn.innerHTML = `${svg('pen')}<span>Annotate</span>`;
    try { if (localStorage.getItem(key)) btn.classList.add('has'); } catch { /* fine */ }
    btn.onclick = () => {
      if (active && active.btn === btn) { stop(); return; }
      stop();
      active = { card, btn, key, full: !!opts.full, api: attach(scope, key, scope !== card ? card : null) };
      btn.classList.add('on'); btn.querySelector('span').textContent = 'Stop';
      showBar();
      if (opts.full && matchMedia('(min-width: 641px) and (max-width: 1100px)').matches && !isFull()) hint('Tip: full screen gives you the whole display to write on.');
    };
    return btn;
  }
  // everything written for this key as one picture (pen only, no highlighter), each part of the page as its own block,
  // working space last. Works whether or not annotation is switched on. Returns a PNG blob, or null if nothing's written.
  async function image(key, W = 1100) {
    const groups = new Map();
    load(key).s.forEach(st => { if (st.t === 'hl' || !st.p || !st.p.length) return; const k = st.a || '__legacy'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(st); });
    if (!groups.size) return null;
    const pad = 24, gap = 18;
    const bands = [...groups.entries()].sort(([a], [b]) => (a === 'space') - (b === 'space')).map(([, ss]) => {
      let y0 = Infinity, y1 = -Infinity;
      ss.forEach(st => { for (let i = 1; i < st.p.length; i += 3) { y0 = Math.min(y0, st.p[i]); y1 = Math.max(y1, st.p[i]); } });
      return { ss, y0, h: (y1 - y0) * W + pad * 2 };
    });
    let x0 = Infinity, x1 = -Infinity;
    groups.forEach(ss => ss.forEach(st => { for (let i = 0; i < st.p.length; i += 3) { x0 = Math.min(x0, st.p[i]); x1 = Math.max(x1, st.p[i]); } }));
    const cw = Math.max(200, Math.round((x1 - x0) * W + pad * 2));
    const ch = Math.min(7000, Math.round(bands.reduce((a, b) => a + b.h, 0) + gap * (bands.length - 1)));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
    let y = 0;
    bands.forEach((b, i) => {
      if (i) { ctx.fillStyle = '#d9d9d9'; ctx.fillRect(pad, y - gap / 2, cw - pad * 2, 1); }
      b.ss.forEach(st => drawStroke(ctx, st, W, y + pad - b.y0 * W, pad - x0 * W));
      y += b.h + gap;
    });
    return new Promise(r => c.toBlob(r, 'image/png'));
  }
  window.Annotate = { button, stop, image, active: () => active };
})();
