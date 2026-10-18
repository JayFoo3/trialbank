// Trialbank mascot: the cartoon Jayden, played frame by frame from sprite strips in mascot/.
// Clean cuts between drawings, like 2D animation; the timing does the smoothing.
// Moods: happy (idle, blinks), wave, cheer (right answer), sad (oops), think, proud (static, sign-in page).
(function () {
  const V = 4;                                    // bump when the art changes
  const rand = (a, b) => a + Math.random() * (b - a);
  // seq: [frame, ms] steps (ms can be a function, re-rolled each pass; Infinity holds)
  const ANIMS = {
    idle:  { n: 4, loop: true,  rest: 0, seq: [[0, () => rand(2400, 5200)], [1, 45], [2, 95], [1, 45]] },
    wave:  { n: 4, loop: true,  rest: 1, seq: [[0, 170], [1, 130], [2, 170], [1, 130], [0, 170], [1, 130], [2, 170], [3, () => rand(1200, 2000)]] },
    cheer: { n: 4, loop: false, rest: 3, seq: [[0, 150], [1, 260], [2, 110], [3, 950], [0, 150], [1, 260], [2, 110], [3, Infinity]] },
    oops:  { n: 2, loop: false, rest: 1, seq: [[0, 750], [1, Infinity]] },
    think: { n: 2, loop: true,  rest: 1, seq: [[0, 1800], [1, 1500]] },
  };
  const MOOD = { happy: 'idle', wave: 'wave', cheer: 'cheer', sad: 'oops', think: 'think' };
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const url = (a) => `mascot/${a}.webp?v=${V}`;
  if (typeof Image !== 'undefined') [...Object.keys(ANIMS), 'proud'].forEach(a => { const i = new Image(); i.src = url(a); });
  const pos = (f, n) => (n > 1 ? (f / (n - 1)) * 100 : 0) + '% 0';

  function Mascot(mood = 'happy', label = '') {
    if (mood === 'proud') return `<span class="mascot proud"><img src="${url('proud')}" alt="${label}" ${label ? '' : 'aria-hidden="true"'} draggable="false"></span>`;
    const a = MOOD[mood] || 'idle', A = ANIMS[a];
    kick();
    return `<span class="mascot sprite ${mood}" data-anim="${a}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><span class="mf"
      style="background-image:url(${url(a)});background-size:${A.n * 100}% 100%;background-position:${pos(still ? A.rest : A.seq[0][0], A.n)}"></span></span>`;
  }

  // one loop drives every mascot on the page
  const state = new WeakMap();
  let running = false;
  function kick() { if (!running && !still) { running = true; requestAnimationFrame(tick); } }
  const dur = (ms) => (typeof ms === 'function' ? ms() : ms);
  function tick(now) {
    const els = document.querySelectorAll('.mascot.sprite');
    if (!els.length) { running = false; return; }
    els.forEach(el => {
      const A = ANIMS[el.dataset.anim]; if (!A) return;
      let s = state.get(el);
      if (!s) { s = { i: 0, until: now + dur(A.seq[0][1]) }; state.set(el, s); }
      if (now < s.until) return;
      if (s.i + 1 >= A.seq.length) { if (!A.loop) { s.until = Infinity; return; } s.i = 0; } else s.i++;
      const [frame, ms] = A.seq[s.i];
      el.firstElementChild.style.backgroundPosition = pos(frame, A.n);
      s.until = now + dur(ms);
    });
    requestAnimationFrame(tick);
  }

  window.Mascot = Mascot;
})();
