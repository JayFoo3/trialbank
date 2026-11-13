/* notes.js - Notes (admin only for now): a page to work a problem by hand with the tutor looking over your shoulder.
   Write the question in red, then your working in black. Tap Check, or leave "Check as I go" on, and the tutor reads the
   page and says whether you're on track, pointing at the first line that goes wrong without giving the answer away.
   Paste (the button, or Cmd V) drops in handwriting copied from another app as a picture. Pages are kept on this device. Each check sends one picture of the page through the tutor (mode: check). */
(function () {
  'use strict';
  const RED = '#e5484d', INK = '#1f2329', LINE = 34;
  const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const ASK = 'Notes check. This is a page of my own notes, not a finished answer. The RED writing is the question I copied down; everything else is my working so far (some of it may be pasted in from another app), and I am still going. '
    + 'Do not mark it and do not give me the answer or the next step. Start your reply with exactly "ON TRACK:" if everything written so far is correct and heading the right way, '
    + 'or exactly "CHECK THIS:" if something is wrong or I am heading the wrong way. Then, in one to three short sentences, say which line you mean and why, with a nudge so I can fix it myself. '
    + 'If you cannot read the question or there is no working yet, start with "CHECK THIS:" and say so.';
  let H = null, root = null, data = null, note = null, cv = null, ctx = null, W = 0, tool = 'q', cur = null, undone = [], busy = false, idleT = null, lastSent = '', lastAt = 0, session = Date.now().toString(36), nUp = 0;
  const key = () => 'tb_notes_' + H.uid;
  const load = () => { try { return JSON.parse(localStorage.getItem(key())) || null; } catch { return null; } };
  const save = () => { try { localStorage.setItem(key(), JSON.stringify(data)); return true; } catch { return false; /* storage full: this visit only */ } };
  const blank = (subject) => ({ id: Date.now().toString(36), subject, strokes: [], lines: 26, checks: [], at: Date.now() });
  const sig = () => note.strokes.length + ':' + (note.strokes[note.strokes.length - 1]?.p?.length || 0);
  const height = () => note.lines * LINE;

  function size() {
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth;
    cv.style.height = height() + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(height() * dpr);
    ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint();
  }
  function stroke(c, s, w, oy = 0) {
    if (s.i) { const im = pic(s.i); if (im.complete && im.naturalWidth) c.drawImage(im, s.x * w, s.y * w - oy, s.w * w, s.h * w); return; }   // pasted handwriting
    const p = s.p; if (!p.length) return;
    c.strokeStyle = c.fillStyle = s.c === 'q' ? RED : INK; c.lineWidth = 2.4 * (w / 760); c.lineCap = c.lineJoin = 'round';
    c.beginPath(); c.moveTo(p[0] * w, p[1] * w - oy);
    if (p.length === 2) { c.arc(p[0] * w, p[1] * w - oy, c.lineWidth / 2, 0, 7); c.fill(); return; }
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i] * w, p[i + 1] * w - oy);
    c.stroke();
  }
  const pics = new Map();
  function pic(src) { let im = pics.get(src); if (!im) { im = new Image(); im.onload = () => paint(); im.src = src; pics.set(src, im); } return im; }
  // handwriting copied from another app (or a photo of working) lands under whatever is already on the page
  async function addImage(blob) {
    try {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That is not a picture.')); i.src = URL.createObjectURL(blob); });
      const k = Math.min(1, 1400 / im.naturalWidth), cw = Math.round(im.naturalWidth * k), ch = Math.round(im.naturalHeight * k);
      const t = document.createElement('canvas'); t.width = cw; t.height = ch; const x = t.getContext('2d'); x.drawImage(im, 0, 0, cw, ch);
      let src = t.toDataURL('image/png');
      if (src.length > 600000) { x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); src = t.toDataURL('image/jpeg', 0.8); }
      let bot = 0; note.strokes.forEach(s => { if (s.i) bot = Math.max(bot, s.y + s.h); else for (let i = 1; i < s.p.length; i += 2) bot = Math.max(bot, s.p[i]); });
      const w = Math.min(0.94, Math.max(0.2, im.naturalWidth / 2 / W)), h = w * ch / cw, y = bot + 18 / W;
      note.strokes.push({ i: src, x: 0.03, y, w, h }); undone = []; note.at = Date.now();
      while ((y + h) * W > height() - LINE * 3) note.lines += 6;
      const kept = save(); size(); drawBar(); queue();
      root.querySelector('.nt-paper').scrollIntoView({ block: 'nearest' }); window.scrollTo({ top: cv.getBoundingClientRect().top + scrollY + y * W - 120, behavior: 'smooth' });
      if (!kept) say({ ok: false, local: true, text: 'Pasted, but it is too big to keep on this device after you leave the page.' });
    } catch (err) { say({ ok: false, local: true, text: err.message || 'Could not paste that.' }); }
  }
  async function pasteNow() {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) { const t = it.types.find(t => t.startsWith('image/')); if (t) return addImage(await it.getType(t)); }
      say({ ok: false, local: true, text: 'Nothing to paste. Copy your handwriting as a picture first, or choose a picture.' });
    } catch { /* no clipboard access here: choose a picture instead */ }
    root.querySelector('.nt-file').click();
  }
  function paint() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, height());
    note.strokes.forEach(s => stroke(ctx, s, W)); if (cur) stroke(ctx, cur, W);
  }
  const pos = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / W, (ev.clientY - r.top) / W]; };
  function eraseAt(x, y) {
    const r = 14 / W, n = note.strokes.length;
    note.strokes = note.strokes.filter(s => { if (s.i) return true; for (let i = 0; i < s.p.length; i += 2) if (Math.hypot(s.p[i] - x, s.p[i + 1] - y) < r) return false; return true; });
    if (note.strokes.length !== n) paint();
  }
  function bind() {
    cv.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'touch' && !data.finger) return;   // fingers scroll the page unless Fingers draw is on
      ev.preventDefault(); cv.setPointerCapture(ev.pointerId); clearTimeout(idleT);
      const [x, y] = pos(ev);
      if (tool === 'e') { cur = { erase: true, p: [] }; eraseAt(x, y); return; }
      cur = { c: tool, p: [x, y] }; undone = []; paint();
    });
    cv.addEventListener('pointermove', (ev) => {
      if (!cur) return;
      const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      for (const e of (evs.length ? evs : [ev])) { const [x, y] = pos(e); if (cur.erase) eraseAt(x, y); else cur.p.push(x, y); }
      if (!cur.erase) paint();
    });
    const end = () => {
      if (!cur) return;
      if (!cur.erase) note.strokes.push({ c: cur.c, p: cur.p.map(v => Math.round(v * 1e4) / 1e4) });
      cur = null; note.at = Date.now(); save(); paint(); drawBar(); queue();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  // "check as I go": once you've stopped writing for a few seconds, and not more than every 25 seconds
  function queue() {
    clearTimeout(idleT);
    if (!data.auto || busy) return;
    idleT = setTimeout(() => { if (location.hash.startsWith('#notes') && sig() !== lastSent && note.strokes.some(s => s.c === 'w' || s.i)) check(true); }, Math.max(6000, 25000 - (Date.now() - lastAt)));
  }
  // the page as one picture: white paper, cropped to what's written
  function picture() {
    const w = 1400; let top = Infinity, bot = 0;
    note.strokes.forEach(s => { if (s.i) { top = Math.min(top, s.y); bot = Math.max(bot, s.y + s.h); } else for (let i = 1; i < s.p.length; i += 2) { top = Math.min(top, s.p[i]); bot = Math.max(bot, s.p[i]); } });
    if (bot <= 0) return Promise.resolve(null);
    const oy = Math.max(0, top * w - 40), h = Math.min(Math.ceil(bot * w - oy + 40), 5200);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); note.strokes.forEach(s => stroke(x, s, w, oy));
    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  }
  async function check(auto) {
    if (busy) return;
    if (!note.strokes.length) { say({ ok: false, text: 'Nothing on the page yet. Write the question in red first.', local: true }); return; }
    busy = true; lastSent = sig(); lastAt = Date.now(); drawCoach(); drawBar();
    try {
      const blob = await picture();
      const path = `${H.uid}/notes-${session}/p${String(++nUp).padStart(3, '0')}.jpg`;
      const up = await H.sb.storage.from('submissions').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (up.error) throw up.error;
      const past = note.checks.filter(c => !c.local && !c.error).slice(-2).flatMap(c => [{ role: 'student', text: '(An earlier check of this same page.)', images: [] }, { role: 'tutor', text: (c.ok ? 'ON TRACK: ' : 'CHECK THIS: ') + c.text, images: [] }]);
      const { data: out, error } = await H.sb.functions.invoke('tutor', { body: { subject: note.subject, mode: 'check', question_id: null, syllabus: H.syllabus ? H.syllabus() : undefined,
        messages: [...past, { role: 'student', text: ASK, images: [path] }] } });
      if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch { /* keep */ } throw new Error(msg); }
      const raw = String(out?.say || '').trim(), ok = /^\s*\**\s*ON TRACK/i.test(raw);
      say({ ok, text: raw.replace(/^\s*\**\s*(ON TRACK|CHECK THIS)\s*:?\s*\**\s*/i, '') || (ok ? 'Looks right so far.' : 'Have another look.'), auto: !!auto });
    } catch (err) { say({ ok: false, error: true, text: err.message || String(err) }); }
    finally { busy = false; drawCoach(); drawBar(); }
  }
  function say(c) { note.checks.push({ ...c, at: Date.now() }); note.checks = note.checks.slice(-12); save(); drawCoach(); }

  function drawCoach() {
    const box = root.querySelector('.nt-coach'); if (!box) return;
    const last = note.checks[note.checks.length - 1];
    const rich = (t) => { try { return H.rich ? H.rich(t) : esc(t); } catch { return esc(t); } };
    box.innerHTML = busy ? '<div class="nt-say busy"><b>Reading your page</b><span class="nt-dots"><i></i><i></i><i></i></span></div>'
      : last ? `<div class="nt-say ${last.error ? 'err' : last.ok ? 'ok' : 'off'}"><b>${last.error ? 'Could not check' : last.ok ? 'On track' : 'Check this'}</b><div class="nt-text">${last.error || last.local ? esc(last.text) : rich(last.text)}</div></div>`
      : '<div class="nt-say"><b>Question in red, working in black</b></div>';
  }
  function drawBar() {
    const bar = root.querySelector('.nt-bar'); if (!bar) return;
    bar.querySelectorAll('[data-t]').forEach(b => { b.classList.toggle('on', b.dataset.t === tool); b.setAttribute('aria-pressed', b.dataset.t === tool); });
    bar.querySelector('[data-a=undo]').disabled = !note.strokes.length;
    bar.querySelector('[data-a=redo]').disabled = !undone.length;
    const c = bar.querySelector('[data-a=check]'); c.disabled = busy; c.textContent = busy ? 'Checking' : 'Check';
    cv.style.touchAction = data.finger ? 'none' : 'pan-y';
  }
  function open(n) { note = n; data.cur = n.id; undone = []; lastSent = ''; save(); draw(); }
  function draw() {
    const names = H.subjects || {}, list = data.notes.slice().sort((a, b) => b.at - a.at);
    root.innerHTML = `<div class="nt-head"><h1>Notes</h1>
        <select class="nt-pick" aria-label="Page">${list.map((n, i) => `<option value="${n.id}"${n.id === note.id ? ' selected' : ''}>${esc(names[n.subject] || n.subject)} · ${new Date(n.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}${list.filter(x => x.subject === n.subject && new Date(x.at).toDateString() === new Date(n.at).toDateString()).length > 1 ? ' · ' + (list.length - i) : ''}</option>`).join('')}</select>
        <select class="nt-subj" aria-label="Subject">${Object.keys(names).map(k => `<option value="${k}"${k === note.subject ? ' selected' : ''}>${esc(names[k])}</option>`).join('')}</select>
        <button class="nt-new" type="button">New page</button></div>
      <div class="nt-body"><div class="nt-paper"><canvas class="nt-cv"></canvas><button class="nt-more" type="button">More space</button></div><aside class="nt-coach" aria-live="polite"></aside></div>
      <div class="nt-bar" role="toolbar" aria-label="Notes tools">
        <button type="button" class="nt-pen q" data-t="q" title="Write the question"><i></i><span>Question</span></button>
        <button type="button" class="nt-pen w" data-t="w" title="Write your working"><i></i><span>Working</span></button>
        <button type="button" class="nt-ic" data-t="e" title="Eraser" aria-label="Eraser"><svg viewBox="0 0 24 24"><path d="M8.5 19.5 4 15 14 5l6 6-8.5 8.5z"/><path d="M9.5 9.5l6 6M8.5 19.5H20"/></svg></button>
        <button type="button" class="nt-ic" data-a="undo" title="Undo" aria-label="Undo"><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>
        <button type="button" class="nt-ic" data-a="redo" title="Redo" aria-label="Redo"><svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg></button>
        <button type="button" class="nt-ic" data-a="paste" title="Paste handwriting or a picture" aria-label="Paste"><svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="16" rx="2.5"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M12 10v7M9 14l3 3 3-3"/></svg></button>
        <input class="nt-file" type="file" accept="image/*" hidden>
        <label class="nt-tog" title="Check by itself a few seconds after you stop writing"><input type="checkbox" data-a="auto"${data.auto ? ' checked' : ''}><span>As I go</span></label>
        <label class="nt-tog" title="Let a finger draw (otherwise fingers scroll and only the Pencil or mouse draws)"><input type="checkbox" data-a="finger"${data.finger ? ' checked' : ''}><span>Finger</span></label>
        <button type="button" class="nt-check" data-a="check">Check</button>
      </div>`;
    cv = root.querySelector('.nt-cv'); bind(); size(); drawCoach(); drawBar();
    root.querySelector('.nt-pick').onchange = (e) => open(data.notes.find(n => n.id === e.target.value));
    root.querySelector('.nt-subj').onchange = (e) => { note.subject = e.target.value; data.subject = note.subject; save(); draw(); };
    root.querySelector('.nt-new').onclick = () => { if (!note.strokes.length) return; const n = blank(note.subject); data.notes.push(n); data.notes = data.notes.sort((a, b) => b.at - a.at).slice(0, 40); tool = 'q'; open(n); };
    root.querySelector('.nt-file').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) addImage(f); };
    root.querySelector('.nt-more').onclick = () => { note.lines += 12; save(); size(); };
    root.querySelector('.nt-bar').onclick = (ev) => {
      const b = ev.target.closest('[data-t], [data-a]'); if (!b) return;
      if (b.dataset.t) tool = b.dataset.t;
      else if (b.dataset.a === 'undo' && note.strokes.length) { undone.push(note.strokes.pop()); save(); paint(); }
      else if (b.dataset.a === 'redo' && undone.length) { note.strokes.push(undone.pop()); save(); paint(); }
      else if (b.dataset.a === 'auto') { data.auto = b.checked; save(); queue(); }
      else if (b.dataset.a === 'finger') { data.finger = b.checked; save(); }
      else if (b.dataset.a === 'check') { check(false); return; }
      else if (b.dataset.a === 'paste') { pasteNow(); return; }
      drawBar();
    };
  }
  addEventListener('resize', () => { if (cv && location.hash.startsWith('#notes')) size(); });
  addEventListener('paste', (ev) => {
    if (!cv || !location.hash.startsWith('#notes')) return;
    const f = [...(ev.clipboardData?.items || [])].find(i => i.kind === 'file' && i.type.startsWith('image/'));
    if (f) { ev.preventDefault(); addImage(f.getAsFile()); }
  });
  addEventListener('hashchange', () => { if (!location.hash.startsWith('#notes')) clearTimeout(idleT); });

  window.Notes = {
    render(el, hooks) {
      root = el; H = hooks; root.classList.add('nt');
      if (H.loadKatex) { try { H.loadKatex().catch(() => {}); } catch { /* maths shows as typed */ } }
      data = load() || { notes: [], auto: true, finger: false, subject: null };
      const first = data.subject || (H.subjects && H.subjects.Eng ? 'Eng' : H.subject);
      if (!data.notes.length) data.notes.push(blank(first));
      note = data.notes.find(n => n.id === data.cur) || data.notes[0];
      draw();
    },
  };
})();
