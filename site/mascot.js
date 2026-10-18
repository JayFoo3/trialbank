// Trialbank mascot: the cartoon Jayden, played frame by frame from sprite strips in mascot/.
// Moods: happy (idle, blinks), wave, cheer (right answer), sad (oops), think, proud (static, sign-in page).
(function () {
  const FW = 224, FH = 317;                      // every frame in every strip is this size
  const rand = (a, b) => a + Math.random() * (b - a);
  // seq: [frame, ms] steps; ms = Infinity holds; fn ms are re-rolled each pass
  const ANIMS = {
    idle:  { n: 4, loop: true, rest: 0, seq: [[0, () => rand(2200, 5200)], [1, 55], [2, 100], [1, 55]] },
    wave:  { n: 4, loop: true, rest: 3, seq: [[0, 170], [1, 170], [2, 170], [3, 170], [0, 170], [1, 170], [2, 170], [3, () => rand(900, 1600)]] },
    cheer: { n: 4, loop: false, rest: 3, seq: [[0, 130], [1, 260], [2, 130], [3, 900], [0, 130], [1, 260], [2, 130], [3, Infinity]] },
    oops:  { n: 2, loop: false, rest: 1, seq: [[0, 750], [1, Infinity]] },
    think: { n: 2, loop: true, rest: 1, seq: [[0, 1700], [1, 1500]] },
  };
  const MOOD = { happy: 'idle', wave: 'wave', cheer: 'cheer', sad: 'oops', think: 'think' };
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof Image !== 'undefined') [...Object.keys(ANIMS).map(a => `mascot/${a}.webp`), 'mascot/proud.webp'].forEach(s => { const i = new Image(); i.src = s; });

  function Mascot(mood = 'happy', label = '') {
    if (mood === 'proud') return `<span class="mascot proud"><img src="mascot/proud.webp" alt="${label}" ${label ? '' : 'aria-hidden="true"'} draggable="false"></span>`;
    const a = MOOD[mood] || 'idle', A = ANIMS[a];
    const f = still ? A.rest : A.seq[0][0];
    kick();
    return `<span class="mascot sprite ${mood}" data-anim="${a}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}
      style="background-image:url(mascot/${a}.webp);background-size:${A.n * 100}% 100%;background-position:${pos(f, A.n)} 0"></span>`;
  }
  const pos = (f, n) => (n > 1 ? (f / (n - 1)) * 100 : 0) + '%';

  // one animation loop drives every mascot on the page
  const state = new WeakMap();
  let running = false;
  function kick() { if (!running && !still) { running = true; requestAnimationFrame(tick); } }
  function tick(now) {
    const els = document.querySelectorAll('.mascot.sprite');
    if (!els.length) { running = false; return; }
    els.forEach(el => {
      const A = ANIMS[el.dataset.anim]; if (!A) return;
      let s = state.get(el);
      if (!s || s.anim !== el.dataset.anim) { s = { anim: el.dataset.anim, i: 0, until: 0 }; state.set(el, s); }
      if (!s.until) s.until = now + dur(A.seq[0][1]);
      if (now < s.until) return;
      if (s.i + 1 >= A.seq.length) { if (!A.loop) { s.until = Infinity; return; } s.i = 0; } else s.i++;
      const [frame, ms] = A.seq[s.i];
      el.style.backgroundPosition = `${pos(frame, A.n)} 0`;
      s.until = now + dur(ms);
    });
    requestAnimationFrame(tick);
  }
  const dur = (ms) => (typeof ms === 'function' ? ms() : ms);

  window.Mascot = Mascot;
  window.MASCOT_FRAME = { w: FW, h: FH };
})();
