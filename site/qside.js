/* qside.js - "Question beside": while you annotate a question, a copy of it stays in view, so there's no scrolling back
   up to read it. Wide screens (iPad on its side): a panel down the right and the page moves over. Narrow screens: it
   slides down from the top once the question itself has scrolled away. The copy is for reading only; writing still
   goes on the page. The split-pane button in the annotation toolbar turns it off and on (remembered on this device). */
(function () {
  const KEY = 'tb_qside', body = document.body;
  let on = true; try { on = localStorage.getItem(KEY) !== '0'; } catch { /* default on */ }
  let panel = null, seen = null, card = null, shownSrc = null;
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M13.5 4.5v15"/></svg>';
  const setCard = () => { const v = document.getElementById('view-set'); card = v && !v.hidden ? v.querySelector('.card.question') : null; return card; };

  // the question picture with its blank margins cut off, so it reads as large as the panel allows
  function trimmed(img) {
    try {
      const w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return null;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, w, h).data, ink = (x, y) => { const i = (y * w + x) * 4; return d[i] + d[i + 1] + d[i + 2] < 690; };
      let x0 = w, x1 = -1, y0 = h, y1 = -1;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (ink(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return null;
      x0 = Math.max(0, x0 - 14); y0 = Math.max(0, y0 - 12); x1 = Math.min(w - 1, x1 + 14); y1 = Math.min(h - 1, y1 + 12);
      const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
      out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
      return out;
    } catch { return null; }   // a picture the browser won't let us read: show it as it is
  }

  function fill() {
    if (!panel || !card) return;
    const img = card.querySelector('#q-img'), online = card.querySelector('#q-online'), box = panel.firstChild;
    const src = img && img.getAttribute('src') && !img.classList.contains('loading') ? img.src : (online && !online.hidden ? 'html:' + online.innerHTML.length : '');
    if (src === shownSrc) return;
    shownSrc = src; box.innerHTML = '';
    if (src.startsWith('html:')) { const c = online.cloneNode(true); c.removeAttribute('id'); c.hidden = false; c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); c.querySelectorAll('input, textarea, button').forEach(e => { e.disabled = true; }); box.appendChild(c); return; }
    if (!src) return;
    const draw = () => { if (shownSrc !== src) return; const cv = img.complete ? trimmed(img) : null; if (cv) { cv.className = 'qside-pic'; box.innerHTML = ''; box.appendChild(cv); } else { const copy = new Image(); copy.src = src; copy.alt = 'Question'; copy.className = 'qside-pic'; box.innerHTML = ''; box.appendChild(copy); } };
    if (img.complete) draw(); else img.addEventListener('load', draw, { once: true });
  }

  function show() {
    if (!panel) { panel = document.createElement('aside'); panel.className = 'qside'; panel.setAttribute('aria-label', 'The question, for reference'); panel.appendChild(document.createElement('div')).className = 'qside-in'; body.appendChild(panel); }
    body.classList.add('qside-on'); shownSrc = null; fill();
    if (!seen && 'IntersectionObserver' in window) {
      seen = new IntersectionObserver((es) => { const e = es[es.length - 1]; if (panel) panel.classList.toggle('peek', !e.isIntersecting); }, { threshold: 0.15 });
      seen.observe(card);
    }
  }
  function hide() {
    body.classList.remove('qside-on');
    if (seen) { seen.disconnect(); seen = null; }
    if (panel) { panel.remove(); panel = null; }
    shownSrc = null;
  }
  function sync() {
    const want = on && body.classList.contains('annotating') && !!setCard();
    if (want && !panel) show(); else if (!want && panel) hide(); else if (want) fill();
    button();
  }

  // our button in the annotation toolbar (the toolbar redraws itself, so it's put back whenever it goes missing)
  function button() {
    const bar = document.querySelector('.ann-bar'), acts = bar && bar.querySelector('.ann-acts');
    if (!acts || !setCard()) return;
    let b = acts.querySelector('[data-qside]');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.dataset.qside = '1'; b.innerHTML = ICON;
      b.onclick = (ev) => { ev.stopPropagation(); on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* fine */ } sync(); };
      acts.appendChild(b);
    }
    b.className = 'ann-ic' + (on ? ' lit' : ''); b.title = b.ariaLabel = on ? 'Hide the question beside your working' : 'Show the question beside your working';
  }

  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; sync(); }); };
  new MutationObserver(later).observe(body, { attributes: true, attributeFilter: ['class'], childList: true });
  const watchQ = () => {
    const v = document.getElementById('view-set'); if (!v) return;
    new MutationObserver(later).observe(v, { attributes: true, attributeFilter: ['src', 'hidden', 'class'], subtree: true, childList: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchQ); else watchQ();
  // the toolbar rebuilds its buttons when a tool is picked: watch for that too
  new MutationObserver((ms) => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.classList?.contains('ann-bar') || n.closest?.('.ann-bar'))))) later(); }).observe(body, { childList: true, subtree: true });
})();
