// Trialbank annotation: write anywhere on the question page with an Apple Pencil, mouse or finger: the question, the answers,
// the solution, the margins, plus lined working space at the bottom (taller and squared for induction proofs, with More space).
// Each stroke is pinned to the part of the page it was drawn on (question, solution, working space...), so it stays in place
// when the page changes around it (a solution opening, a hint appearing). Saved on this device per student and question.
(function () {
  const COLOURS = [['#1f2329', 'Black'], ['#2f6fe8', 'Blue'], ['#e5484d', 'Red'], ['#1f9d55', 'Green'], ['#f08c00', 'Orange']];
  const HL = 'rgba(255, 210, 63, 0.42)';
  const SIZES = [['thin', 1.7], ['med', 2.6], ['thick', 4.2]];
  let active = null;                     // the one page being annotated right now
  let last = { kind: null, pop: null, colour: null };   // what the bar showed last time it was drawn, so only what changed animates
  let bar = null, clearArmed = 0, pop = null;   // pop: which little menu is open above the bar ('pen' options, 'more', or none)
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

  // ---- drawing. Every stroke is a vector shape (SVG), so it stays sharp at any zoom and on any screen; no pixels to see.
  // Pen strokes are a filled outline from perfect-freehand (width follows Pencil pressure, smooth ends); highlighter is a
  // smooth centre line. Shapes are worked out once at a 700px-wide page and scaled to the real width, then cached.
  const NS = 'http://www.w3.org/2000/svg', REF = 700, HL_SOLID = 'rgb(255, 210, 63)', HL_ALPHA = 0.42;
  const shapes = new WeakMap();
  const f2 = (v) => Math.round(v * 100) / 100;
  function outlinePath(o) {
    const n = o.length; if (n < 4) return '';
    const m = (i, j, k) => f2((o[i][k] + o[j][k]) / 2);
    let d = `M${f2(o[0][0])},${f2(o[0][1])}Q${f2(o[1][0])},${f2(o[1][1])} ${m(1, 2, 0)},${m(1, 2, 1)}T`;
    for (let i = 2; i < n - 1; i++) d += `${m(i, i + 1, 0)},${m(i, i + 1, 1)} `;
    return d + 'Z';
  }
  function centrePath(pts) {
    const n = pts.length, P = (i) => `${f2(pts[i][0])},${f2(pts[i][1])}`;
    if (n === 1) return `M${P(0)}l0.01,0`;
    let d = `M${P(0)}`;
    for (let i = 1; i < n - 1; i++) d += `Q${P(i)} ${f2((pts[i][0] + pts[i + 1][0]) / 2)},${f2((pts[i][1] + pts[i + 1][1]) / 2)}`;
    return d + `L${P(n - 1)}`;
  }
  function shape(st, live) {   // path data in REF units, relative to the stroke's anchor
    let d = live ? null : shapes.get(st); if (d != null) return d;
    const p = st.p || [], pts = [];
    for (let i = 0; i < p.length; i += 3) pts.push([p[i] * REF, p[i + 1] * REF, p[i + 2] || 0.5]);
    if (!pts.length) d = '';
    else if (st.t === 'hl') d = centrePath(pts);
    else {
      const PF = window.PerfectFreehand;
      const o = PF ? PF.getStroke(pts, { size: (st.w || 2.4) * 1.1, thinning: 0.55, smoothing: 0.62, streamline: live ? 0.3 : 0.4, simulatePressure: false, last: !live }) : [];
      d = outlinePath(o);
    }
    if (!live) shapes.set(st, d);
    return d;
  }
  const place = (w, oy, ox) => `translate(${f2(ox)} ${f2(oy)}) scale(${w / REF})`;
  function strokeEl(st, w, oy, ox, el) {   // one stroke as an SVG path (reuses `el` when given)
    el = el || document.createElementNS(NS, 'path');
    el.setAttribute('d', shape(st, el.dataset && el.dataset.live === '1'));
    el.setAttribute('transform', place(w, oy, ox));
    if (st.t === 'hl') { el.setAttribute('fill', 'none'); el.setAttribute('stroke', HL_SOLID); el.setAttribute('stroke-width', '18'); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round'); }
    else { el.setAttribute('fill', st.c || '#1f2329'); el.removeAttribute('stroke'); }
    return el;
  }
  // the same shapes painted onto a canvas (for the picture sent to marking and the tutor)
  function paint(ctx, st, w, oy, ox = 0) {
    const d = shape(st); if (!d) return;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(w / REF, w / REF);
    const path = new Path2D(d);
    if (st.t === 'hl') { ctx.globalAlpha = HL_ALPHA; ctx.strokeStyle = HL_SOLID; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path); }
    else { ctx.fillStyle = st.c || '#1f2329'; ctx.fill(path); }
    ctx.restore();
  }

  // ---- teacher marks from auto-marking: a green tick at the end of each right line, a red pen circle round each mistake with
  // a short note under it. Positions are in the same units as strokes (fractions of the page width, from their block's top),
  // drawn here in REF units like the strokes, so they land on the writing at any screen size.
  const TICK = '#1f9d55', RED = '#e5484d';
  function markShapes(m) {
    const X0 = m.x0 * REF, Y0 = m.y0 * REF, X1 = m.x1 * REF, Y1 = m.y1 * REF;
    if (m.k === 'tick') {
      const r = 10.5, cx = X1 + r + 10, cy = (Y0 + Y1) / 2;
      return { tick: { cx, cy, r, d: `M${f2(cx - 4.6)},${f2(cy + 0.2)}L${f2(cx - 1.3)},${f2(cy + 3.6)}L${f2(cx + 5)},${f2(cy - 3.6)}` } };
    }
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, rx = Math.max(14, (X1 - X0) / 2 + 9), ry = Math.max(12, (Y1 - Y0) / 2 + 7);
    const seed = ((m.x0 * 997 + m.y0 * 131) % 1) * 6.28, pts = [], start = -1.9, turn = Math.PI * 2 + 0.45;
    for (let i = 0; i <= 44; i++) {   // one loop and a bit, slightly wobbly and growing, like a quick pen circle
      const t = start + turn * i / 44, k = 1 + 0.035 * Math.sin(3 * t + seed) + 0.05 * i / 44;
      pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
    }
    return { circle: { d: centrePath(pts) }, note: m.n ? { x: X0 - 6, y: cy + ry + 8, text: m.n } : null };
  }
  const NOTE_FONT = 600, NOTE_SIZE = 12.5, NOTE_H = 22;
  let measurer = null;
  function noteWidth(text) {
    measurer = measurer || document.createElement('canvas').getContext('2d');
    measurer.font = `${NOTE_FONT} ${NOTE_SIZE}px Inter, Arial, sans-serif`;
    return measurer.measureText(text).width + 20;
  }
  function markEl(m, w, oy, ox, i, since) {   // since: seconds since these marks arrived (null: long ago, no animation)
    const fresh = since != null;
    const g = document.createElementNS(NS, 'g'), sh = markShapes(m), el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
    g.setAttribute('transform', place(w, oy, ox));
    g.setAttribute('class', 'ann-mark' + (fresh ? ' fresh' : '')); g.style.setProperty('--d', (0.25 + i * 0.22 - (since || 0)).toFixed(3) + 's');   // a redraw mid-way carries on where it was
    if (sh.tick) {
      const t = el('g', { class: 'am-tick' });
      t.append(el('circle', { cx: f2(sh.tick.cx), cy: f2(sh.tick.cy), r: sh.tick.r, fill: TICK }),
        el('path', { d: sh.tick.d, fill: 'none', stroke: '#fff', 'stroke-width': 2.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      g.append(t);
    } else {
      g.append(el('path', { class: 'am-ring', d: sh.circle.d, fill: 'none', stroke: RED, 'stroke-width': 2.4, 'stroke-linecap': 'round', pathLength: 1 }));
      if (sh.note) {
        const nw = noteWidth(sh.note.text), n = el('g', { class: 'am-note' });
        n.append(el('rect', { x: f2(sh.note.x), y: f2(sh.note.y), width: f2(nw), height: NOTE_H, rx: NOTE_H / 2, fill: '#fde8e8' }),
          el('text', { x: f2(sh.note.x + 10), y: f2(sh.note.y + NOTE_H / 2 + 4.3), fill: '#c62f34', 'font-size': NOTE_SIZE, 'font-weight': NOTE_FONT, 'font-family': 'Inter, Arial, sans-serif' }));
        n.lastChild.textContent = sh.note.text;
        g.append(n);
      }
    }
    return g;
  }
  // the same marks painted on a canvas (the marked copy of a photo or typed answer). `s` scales REF units to pixels.
  function paintMark(ctx, m, s, ox, oy) {
    const sh = markShapes(m);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    if (sh.tick) {
      ctx.fillStyle = TICK; ctx.beginPath(); ctx.arc(sh.tick.cx, sh.tick.cy, sh.tick.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(sh.tick.d));
    } else {
      ctx.strokeStyle = RED; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke(new Path2D(sh.circle.d));
      if (sh.note) {
        const nw = noteWidth(sh.note.text);
        ctx.fillStyle = '#fde8e8'; ctx.beginPath(); ctx.roundRect(sh.note.x, sh.note.y, nw, NOTE_H, NOTE_H / 2); ctx.fill();
        ctx.fillStyle = '#c62f34'; ctx.font = `${NOTE_FONT} ${NOTE_SIZE}px Inter, Arial, sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText(sh.note.text, sh.note.x + 10, sh.note.y + NOTE_H / 2 + 0.5);
      }
    }
    ctx.restore();
  }
  let freshMarks = null;   // { key, at }: marks that just arrived draw themselves in, one after another

  // ---- no text selection, callouts or zoom gestures while writing ----
  const block = (ev) => { if (active) ev.preventDefault(); };
  document.addEventListener('selectstart', block);
  document.addEventListener('contextmenu', (ev) => { if (active && ev.target.closest('.ann-live')) ev.preventDefault(); });
  document.addEventListener('gesturestart', block);   // iOS pinch while writing

  // look: { space: starting height of the working space in px, grid: squared paper instead of lines } (induction proofs get a tall grid)
  function attach(scope, key, legacyAnchor, look = {}) {
    const data = load(key);
    const space = document.createElement('div'); space.className = 'ann-space' + (look.grid ? ' ann-grid' : '');
    space.innerHTML = '<span>Working space</span><button type="button" class="ann-more">More space</button>';
    const MORE = 600, fit = () => { space.style.height = ((look.space || 460) + (data.x || 0) * MORE) + 'px'; };
    fit();
    space.querySelector('.ann-more').onclick = () => { data.x = (data.x || 0) + 1; fit(); store(key, data); };   // remembered with the writing
    const base = document.createElementNS(NS, 'svg'); base.setAttribute('class', 'ann-canvas');
    const hlLayer = document.createElementNS(NS, 'g'), inkLayer = document.createElementNS(NS, 'g');
    const markLayer = document.createElementNS(NS, 'g');
    hlLayer.setAttribute('opacity', HL_ALPHA); base.append(hlLayer, inkLayer, markLayer);   // highlighter sits under the ink, one even wash; marks on top
    const live = document.createElementNS(NS, 'svg'); live.setAttribute('class', 'ann-canvas ann-live');
    const liveHl = document.createElementNS(NS, 'g'); liveHl.setAttribute('opacity', HL_ALPHA);
    const livePath = document.createElementNS(NS, 'path'); livePath.dataset.live = '1';
    live.append(liveHl);
    scope.classList.add('ann-on');
    scope.append(space, base, live);
    const undo = [], redo = [];
    let w = 0, h = 0, cw = 0, ox = 0, cur = null, curTop = 0, scrollY = null, tap = null, sizeQueued = false;

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
        // vector layers: no pixel buffer, so a tall page never has to drop resolution
        for (const c of [base, live]) { c.setAttribute('width', cw); c.setAttribute('height', h); c.style.width = cw + 'px'; c.style.height = h + 'px'; c.style.left = -ox + 'px'; }
      }
      measure(); redrawBase();
    }
    function addEl(st, oy) { (st.t === 'hl' ? hlLayer : inkLayer).appendChild(strokeEl(st, w, oy, ox)); }
    function redrawBase() {
      hlLayer.replaceChildren(); inkLayer.replaceChildren();
      data.s.forEach(st => { const oy = topOf(st); if (oy !== undefined) addEl(st, oy); });
      drawMarks();
    }
    function drawMarks() {
      let since = freshMarks && freshMarks.key === key ? (performance.now() - freshMarks.at) / 1000 : null;
      if (since != null && since > 0.9 + (data.m || []).length * 0.22) { freshMarks = null; since = null; }
      markLayer.replaceChildren();
      (data.m || []).forEach((m, i) => { const oy = m.a === '__legacy' ? tops.__legacy?.top : tops[m.a]?.top; if (oy !== undefined) markLayer.appendChild(markEl(m, w, oy, ox, i, since)); });
    }
    function redrawLive() {
      if (!cur || cur.erase) { livePath.remove(); return; }
      strokeEl(cur, w, curTop, ox, livePath);
      const home = cur.t === 'hl' ? liveHl : live;
      if (livePath.parentNode !== home) home.appendChild(livePath);
    }
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
    function finish(ev) {
      if (!cur) { drawId = null; return; }
      const quick = ev && downAt && !downAt.moved && performance.now() - downAt.t < 220;   // a real tap, not a quick dot or full stop
      if (quick && !cur.erase && tapThrough(ev.clientX, ev.clientY)) { cur = null; drawId = null; redrawLive(); downAt = null; return; }   // clicked a button
      if (!cur.erase && cur.p.length) {
        undo.push(data.s); redo.length = 0;
        data.s = [...data.s, { ...cur, p: cur.p.map(v => Math.round(v * 10000) / 10000) }];
        addEl(data.s[data.s.length - 1], curTop);   // add just this stroke: no full redraw
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
      clear() { if (data.s.length) { undo.push(data.s); data.s = []; delete data.m; redrawBase(); store(key, data); } },
      setMarks(m) { data.m = m; store(key, data); drawMarks(); },
      count: () => data.s.length,
      async snapshot() {   // the whole page's writing as a PNG (transparent background), painted from the vector shapes
        const k = Math.min(1, Math.sqrt(15e6 / Math.max(1, cw * h)));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(cw * k)); c.height = Math.max(1, Math.round(h * k));
        const ctx = c.getContext('2d'); ctx.scale(k, k);
        data.s.forEach(st => { const oy = topOf(st); if (oy !== undefined) paint(ctx, st, w, oy, ox); });
        return c.toDataURL('image/png');
      },
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
  document.addEventListener('pointerdown', (ev) => { if (pop && active && !(ev.target.closest && ev.target.closest('.ann-bar'))) { pop = null; showBar(); } }, true);
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
  // shaded like the real things: a pencil whose lead and band take your colour, a chisel-tip highlighter, a pink eraser
  const SHADE = (id) => `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#d9dce3"/><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#c9cdd6"/></linearGradient><linearGradient id="${id}w" x1="0" x2="1"><stop offset="0" stop-color="#e7d2b0"/><stop offset=".4" stop-color="#f6e7cd"/><stop offset="1" stop-color="#d4bd97"/></linearGradient></defs>`;
  const TOOLS = {
    pen: (c) => `<svg viewBox="0 0 30 74" aria-hidden="true">${SHADE('annp')}<path d="M8 26h14v48H8z" fill="url(#annp)"/><path d="M8 26l5.2-17h3.6L22 26z" fill="url(#annpw)"/><path d="M13.2 9 15 2.5 16.8 9z" fill="${c}"/><rect x="8" y="30" width="14" height="6" fill="${c}"/><rect x="8" y="30" width="14" height="6" fill="url(#annp)" opacity=".18"/></svg>`,
    hl: () => `<svg viewBox="0 0 30 74" aria-hidden="true">${SHADE('annh')}<path d="M5.5 28h19v46h-19z" fill="url(#annh)"/><path d="M5.5 28l3-12h13l3 12z" fill="#dfe2e8"/><path d="M9.5 16l1.2-9 9-3-.2 12z" fill="#ffd23f"/><rect x="5.5" y="32" width="19" height="6" fill="#ffd23f"/></svg>`,
    eraser: () => `<svg viewBox="0 0 30 74" aria-hidden="true">${SHADE('anne')}<path d="M6.5 24h17v50h-17z" fill="url(#anne)"/><path d="M6.5 24v-9a8.5 8.5 0 0 1 17 0v9z" fill="#f49aa0"/><path d="M6.5 15a8.5 8.5 0 0 1 6-8v17h-6z" fill="#f7b4b8"/><rect x="6.5" y="24" width="17" height="4" fill="#b9bdc7"/></svg>`,
  };
  function showBar() {
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'ann-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Annotation tools');
      document.body.appendChild(bar);
    }
    const tools = [['pen', 'Pen'], ['hl', 'Highlighter'], ['eraser', 'Eraser']].map(([k, n]) =>
      `<button class="ann-tool${tool.kind === k ? ' on' : ''}${last.kind && last.kind !== tool.kind ? (k === tool.kind ? ' rise' : k === last.kind ? ' drop' : '') : ''}" data-k="${k}" title="${n}" aria-label="${n}" aria-pressed="${tool.kind === k}">${TOOLS[k](tool.colour)}</button>`).join('');
    const sizes = SIZES.map(([k]) => `<button class="ann-dot${tool.size === k ? ' on' : ''}" data-s="${k}" title="${{ thin: 'Fine', med: 'Medium', thick: 'Bold' }[k]} line" aria-label="${{ thin: 'Fine', med: 'Medium', thick: 'Bold' }[k]} line"><i class="sz-${k}"></i></button>`).join('');
    const sw = COLOURS.map(([c, n]) => `<button class="ann-sw${tool.colour === c ? ' on' : ''}${tool.colour === c && last.colour && last.colour !== c ? ' pulse' : ''}" data-c="${c}" style="--c:${c}" title="${n}" aria-label="${n}"></button>`).join('');
    const armed = clearArmed > Date.now();
    // the bar itself stays small: tools, undo and redo, a More menu, Done. Thickness and colour open above the pen when you
    // tap it a second time (or tap the colour dot); Clear, touch mode and full screen live under More.
    const penPop = pop === 'pen' ? `<div class="ann-pop${last.pop !== 'pen' ? ' in' : ''}" role="group" aria-label="Pen thickness and colour"><div class="ann-group ann-sizes">${sizes}</div><div class="ann-group ann-cols">${sw}</div></div>` : '';
    const morePop = pop === 'more' ? `<div class="ann-pop ann-menu${last.pop !== 'more' ? ' in' : ''}" role="menu">
        <button class="ann-row${armed ? ' armed' : ''}" data-a="clear" role="menuitem">${svg('clear')}<span>${armed ? 'Tap again to clear all' : 'Clear this page'}</span></button>
        <button class="ann-row" data-a="touch" role="menuitem" title="${TOUCH[tool.touch][1]}">${svg(tool.touch === 'draw' ? 'hand' : tool.touch === 'pencil' ? 'pen' : 'scroll')}<span>${TOUCH[tool.touch][0]}</span></button>
        ${active?.full ? `<button class="ann-row" data-a="full" role="menuitem">${svg(isFull() ? 'unfull' : 'full')}<span>${isFull() ? 'Exit full screen' : 'Full screen'}</span></button>` : ''}
      </div>` : '';
    bar.innerHTML = `${penPop}${morePop}<div class="ann-tray">${tools}</div>
      <button class="ann-sw ann-cur${pop === 'pen' ? ' on' : ''}${last.colour && last.colour !== tool.colour ? ' pulse' : ''}" data-a="opts" style="--c:${tool.colour}" title="Thickness and colour" aria-label="Thickness and colour" aria-expanded="${pop === 'pen'}"></button>
      <div class="ann-group ann-acts">
        <button class="ann-ic" data-a="undo" title="Undo" aria-label="Undo">${svg('undo')}</button>
        <button class="ann-ic" data-a="redo" title="Redo" aria-label="Redo">${svg('redo')}</button>
        <button class="ann-ic${pop === 'more' ? ' lit' : ''}" data-a="more" title="More" aria-label="More" aria-expanded="${pop === 'more'}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/></svg></button>
      </div>
      <button class="ann-done" data-a="done">Done</button>`;
    bar.onclick = (ev) => {
      const b = ev.target.closest('button'); if (!b || !active) return;
      if (b.dataset.c) { tool.colour = b.dataset.c; if (tool.kind !== 'pen') tool.kind = 'pen'; }
      else if (b.dataset.k) { if (b.dataset.k === 'pen' && tool.kind === 'pen') pop = pop === 'pen' ? null : 'pen'; else { tool.kind = b.dataset.k; pop = null; } }
      else if (b.dataset.s) { tool.size = b.dataset.s; if (tool.kind === 'eraser') tool.kind = 'pen'; }
      else if (b.dataset.a === 'opts') { pop = pop === 'pen' ? null : 'pen'; if (pop) tool.kind = 'pen'; }
      else if (b.dataset.a === 'more') pop = pop === 'more' ? null : 'more';
      else if (b.dataset.a === 'touch') { tool.touch = { scroll: 'pencil', pencil: 'draw', draw: 'scroll' }[tool.touch] || 'scroll'; hint(`${TOUCH[tool.touch][0]}. ${TOUCH[tool.touch][1]}`); document.querySelectorAll('.ann-live').forEach(c => { c.style.touchAction = tool.touch === 'scroll' ? 'pan-y' : 'none'; }); }
      else if (b.dataset.a === 'full') { setFull(!isFull()); pop = null; }
      else if (b.dataset.a === 'done') { pop = null; stop(); return; }
      else if (b.dataset.a === 'clear') {
        if (!active.api.count()) { pop = null; showBar(); return; }
        if (clearArmed < Date.now()) { clearArmed = Date.now() + 2500; showBar(); setTimeout(() => { if (active) showBar(); }, 2600); return; }   // tap twice to clear
        clearArmed = 0; active.api.clear(); pop = null;
      }
      else if (active.api[b.dataset.a]) active.api[b.dataset.a]();
      saveTool(); showBar();
    };
    bar.classList.toggle('enter', !document.body.classList.contains('annotating'));   // slides up the first time it appears
    last = { kind: tool.kind, pop, colour: tool.colour };
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
  // `opts.full` offers a full-screen button; `opts.space` / `opts.grid` size and rule the working space. `key` identifies this student's notes for this question.
  function button(card, key, opts = {}) {
    const scope = opts.scope || card;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ann-btn';
    btn.innerHTML = `${svg('pen')}<span>Annotate</span>`;
    try { if (localStorage.getItem(key)) btn.classList.add('has'); } catch { /* fine */ }
    btn.onclick = () => {
      if (active && active.btn === btn) { stop(); return; }
      stop();
      active = { card, btn, key, full: !!opts.full, api: attach(scope, key, scope !== card ? card : null, { space: opts.space, grid: opts.grid }) };
      btn.classList.add('on'); btn.querySelector('span').textContent = 'Stop';
      showBar();
      if (opts.full && matchMedia('(min-width: 641px) and (max-width: 1100px)').matches && !isFull()) hint('Tip: full screen gives you the whole display to write on.');
    };
    return btn;
  }
  // everything written for this key as one picture (pen only, no highlighter), each part of the page as its own block,
  // working space last. Works whether or not annotation is switched on. Returns a PNG blob, or null if nothing's written.
  async function image(key, W = 1100) { return (await imageMap(key, W))?.blob || null; }
  // the same picture, plus where each part of the page landed in it, so marks placed on the picture can go back onto the writing
  async function imageMap(key, W = 1100) {
    const groups = new Map();
    load(key).s.forEach(st => { if (st.t === 'hl' || !st.p || !st.p.length) return; const k = st.a || '__legacy'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(st); });
    if (!groups.size) return null;
    const pad = 24, gap = 18;
    const bands = [...groups.entries()].sort(([a], [b]) => (a === 'space') - (b === 'space')).map(([, ss]) => {
      let y0 = Infinity, y1 = -Infinity;
      ss.forEach(st => { for (let i = 1; i < st.p.length; i += 3) { y0 = Math.min(y0, st.p[i]); y1 = Math.max(y1, st.p[i]); } });
      return { ss, y0, h: (y1 - y0) * W + pad * 2, a: ss[0].a || '__legacy' };
    });
    let x0 = Infinity, x1 = -Infinity;
    groups.forEach(ss => ss.forEach(st => { for (let i = 0; i < st.p.length; i += 3) { x0 = Math.min(x0, st.p[i]); x1 = Math.max(x1, st.p[i]); } }));
    const cw = Math.max(200, Math.round((x1 - x0) * W + pad * 2));
    const ch = Math.min(7000, Math.round(bands.reduce((a, b) => a + b.h, 0) + gap * (bands.length - 1)));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
    let y = 0;
    const map = { W, pad, x0, bands: [] };
    bands.forEach((b, i) => {
      if (i) { ctx.fillStyle = '#d9d9d9'; ctx.fillRect(pad, y - gap / 2, cw - pad * 2, 1); }
      b.ss.forEach(st => paint(ctx, st, W, y + pad - b.y0 * W, pad - x0 * W));
      map.bands.push({ a: b.a, y0: b.y0, top: y, h: b.h });
      y += b.h + gap;
    });
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    return blob ? { blob, map } : null;
  }
  // marks in picture pixels ({k, x0, y0, x1, y1, n}) back onto the writing, saved with it and shown whenever it's open
  function placeMarks(key, map, marks) {
    const out = [];
    marks.forEach(m => {
      const cy = (m.y0 + m.y1) / 2;
      const b = map.bands.find(b => cy >= b.top && cy <= b.top + b.h) || map.bands.reduce((p, b) => Math.abs(b.top + b.h / 2 - cy) < Math.abs(p.top + p.h / 2 - cy) ? b : p);
      const X = (v) => map.x0 + (v - map.pad) / map.W, Y = (v) => b.y0 + (v - b.top - map.pad) / map.W;
      out.push({ k: m.k, a: b.a, x0: X(m.x0), y0: Y(m.y0), x1: X(m.x1), y1: Y(m.y1), ...(m.n ? { n: m.n } : {}) });
    });
    freshMarks = { key, at: performance.now() };
    if (active && active.key === key) active.api.setMarks(out);
    else { const d = load(key); d.m = out; store(key, d); }
  }
  // a marked copy of any picture (a photo of their working, or a typed answer): the marks painted on it
  async function markedCopy(blob, marks) {
    const bmp = await createImageBitmap(blob), c = document.createElement('canvas');
    const s = Math.max(1, bmp.width / REF) * 1.15;   // pen and badge sizes scale with the picture
    let right = bmp.width, bottom = bmp.height;      // grow the page so a tick past the last word, or a note under the last line, isn't cut off
    marks.forEach(m => { right = Math.max(right, m.x1 + 40 * s); if (m.n) { right = Math.max(right, m.x0 + (noteWidth(m.n) + 4) * s); bottom = Math.max(bottom, m.y1 + 46 * s); } });
    c.width = Math.ceil(right); c.height = Math.ceil(bottom);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0);
    marks.forEach(m => paintMark(ctx, { k: m.k, x0: m.x0 / s / REF, y0: m.y0 / s / REF, x1: m.x1 / s / REF, y1: m.y1 / s / REF, n: m.n }, s * 1, 0, 0));
    return new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
  }
  window.Annotate = { button, stop, image, imageMap, placeMarks, markedCopy, active: () => active };
})();
