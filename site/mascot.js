// Trialbank mascot: the cartoon Jayden, played frame by frame from sprite strips in mascot/.
// Each new frame fades in over the last one, so the motion reads smoothly rather than snapping.
// Moods: happy (idle, blinks), wave, cheer (right answer), sad (oops), think, proud (static, sign-in page).
(function () {
  const rand = (a, b) => a + Math.random() * (b - a);
  // seq: [frame, ms] steps (ms can be a function, re-rolled each pass; Infinity holds). xf: fade between frames in ms.
  const ANIMS = {
    idle:  { n: 4, xf: 70,  loop: true,  rest: 0, seq: [[0, () => rand(2400, 5200)], [1, 70], [2, 120], [1, 80]] },
    wave:  { n: 4, xf: 120, loop: true,  rest: 1, seq: [[0, 240], [1, 220], [2, 240], [1, 220], [0, 240], [1, 220], [2, 240], [3, () => rand(1100, 1800)]] },
    cheer: { n: 4, xf: 120, loop: false, rest: 3, seq: [[3, 120], [0, 180], [1, 320], [2, 200], [3, 1000], [0, 180], [1, 320], [2, 200], [3, Infinity]] },
    oops:  { n: 2, xf: 260, loop: false, rest: 1, seq: [[0, 800], [1, Infinity]] },
    think: { n: 2, xf: 320, loop: true,  rest: 1, seq: [[0, 1800], [1, 1600]] },
  };
  const MOOD = { happy: 'idle', wave: 'wave', cheer: 'cheer', sad: 'oops', think: 'think' };
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const url = (a) => `mascot/${a}.webp?v=3`;
  if (typeof Image !== 'undefined') [...Object.keys(ANIMS).map(url), 'mascot/proud.webp?v=3'].forEach(s => { const i = new Image(); i.src = s; });
  const pos = (f, n) => (n > 1 ? (f / (n - 1)) * 100 : 0) + '% 0';

  function Mascot(mood = 'happy', label = '') {
    if (mood === 'proud') return `<span class="mascot proud"><img src="mascot/proud.webp?v=3" alt="${label}" ${label ? '' : 'aria-hidden="true"'} draggable="false"></span>`;
    const a = MOOD[mood] || 'idle', A = ANIMS[a];
    const f = still ? A.rest : A.seq[0][0];
    const layer = (cls, op) => `<span class="mf ${cls}" style="background-image:url(${url(a)});background-size:${A.n * 100}% 100%;background-position:${pos(f, A.n)};opacity:${op};transition-duration:${A.xf}ms"></span>`;
    kick();
    return `<span class="mascot sprite ${mood}" data-anim="${a}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${layer('lo', 1)}${layer('hi', 0)}</span>`;
  }

  // one loop drives every mascot on the page
  const state = new WeakMap();
  let running = false;
  function kick() { if (!running && !still) { running = true; requestAnimationFrame(tick); } }
  const dur = (ms) => (typeof ms === 'function' ? ms() : ms);
  function show(el, s, A, frame, now) {
    const lo = el.firstElementChild, hi = el.lastElementChild, p = pos(frame, A.n);
    // the new frame fades in on top; once it has, the bottom layer takes it so the next fade starts clean
    hi.style.transition = 'none'; hi.style.opacity = 0; hi.style.backgroundPosition = p;
    void hi.offsetWidth;
    hi.style.transition = ''; hi.style.transitionDuration = A.xf + 'ms'; hi.style.opacity = 1;
    s.sync = { at: now + A.xf + 20, p };
    if (!lo) return;
  }
  function tick(now) {
    const els = document.querySelectorAll('.mascot.sprite');
    if (!els.length) { running = false; return; }
    els.forEach(el => {
      const A = ANIMS[el.dataset.anim]; if (!A) return;
      let s = state.get(el);
      if (!s) { s = { i: 0, until: now + dur(A.seq[0][1]), sync: null }; state.set(el, s); }
      if (s.sync && now >= s.sync.at) { el.firstElementChild.style.backgroundPosition = s.sync.p; s.sync = null; }
      if (now < s.until) return;
      if (s.i + 1 >= A.seq.length) { if (!A.loop) { s.until = Infinity; return; } s.i = 0; } else s.i++;
      const [frame, ms] = A.seq[s.i];
      show(el, s, A, frame, now);
      s.until = now + dur(ms);
    });
    requestAnimationFrame(tick);
  }

  window.Mascot = Mascot;
})();
