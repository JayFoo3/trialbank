// Trialbank mascot: the cartoon Jayden, played frame by frame from sprite strips in mascot/.
// The strips hold the original drawings plus generated in-betweens (breathing, arm swing, jump arc).
// Moods: happy (idle), wave, cheer (right answer), sad (oops), think, proud (static, sign-in page).
(function () {
  const V = 7;                                    // bump when the art changes
  const rand = (a, b) => a + Math.random() * (b - a);
  const run = (from, to, ms) => Array.from({ length: to - from + 1 }, (_, k) => [from + k, ms]);
  // seq(pass) returns the steps for this pass: [frame, ms]. Infinity holds the frame.
  const ANIMS = {
    // 12 breathing frames; now and then a blink (frames 12-14) at the bottom of a breath
    idle: { n: 15, rest: 0, seq: () => [...run(0, 11, 270), ...(Math.random() < 0.45 ? [[12, 45], [13, 95], [14, 45]] : []), [0, rand(100, 900)]] },
    // forearm swings about the elbow: two full swings, then a pause
    wave: { n: 12, rest: 0, seq: () => [...run(0, 11, 62), ...run(0, 11, 62), [0, rand(1200, 2000)]] },
    // stand, anticipate, launch, hang, fall, land, settle; twice then hold
    cheer: { n: 12, rest: 11, seq: (p) => p > 1 ? [[11, Infinity]] :
      [[0, 160], [1, 110], [2, 130], [3, 55], [4, 65], [5, 120], [6, 65], [7, 55], [8, 90], [9, 110], [10, 80], [11, 750]] },
    // frown, then the neck rub, breathing
    oops: { n: 11, rest: 1, seq: (p) => [...(p === 0 ? [[0, 750]] : []), ...run(1, 10, 300)] },
    // looking up (breathing), then "got it" (breathing)
    think: { n: 16, rest: 8, seq: () => [...run(0, 7, 260), ...run(0, 7, 260), ...run(8, 15, 260), ...run(8, 15, 260)] },
  };
  const MOOD = { happy: 'idle', wave: 'wave', cheer: 'cheer', sad: 'oops', think: 'think' };
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const url = (a) => `mascot/${a}.webp?v=${V}`;
  const warm = (list) => list.forEach(a => { const i = new Image(); i.src = url(a); });
  if (typeof Image !== 'undefined') { warm(['idle', 'wave']); setTimeout(() => warm(['cheer', 'oops', 'think', 'proud']), 2500); }
  const pos = (f, n) => (n > 1 ? (f / (n - 1)) * 100 : 0) + '% 0';

  function Mascot(mood = 'happy', label = '', opts = {}) {
    if (mood === 'proud') return `<span class="mascot proud"><img src="${url('proud')}" alt="${label}" ${label ? '' : 'aria-hidden="true"'} draggable="false"></span>`;
    const a = MOOD[mood] || 'idle', A = ANIMS[a];
    const hold = opts.still || still;          // a still pose, e.g. for small face crops
    if (!hold) kick();
    return `<span class="mascot sprite ${mood}" ${hold ? '' : `data-anim="${a}"`} ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><span class="mf"
      style="background-image:url(${url(a)});background-size:${A.n * 100}% 100%;background-position:${pos(hold ? A.rest : A.seq(0)[0][0], A.n)}"></span></span>`;
  }

  // one loop drives every mascot on the page
  const state = new WeakMap();
  let running = false;
  function kick() { if (!running && !still) { running = true; requestAnimationFrame(tick); } }
  function tick(now) {
    const els = document.querySelectorAll('.mascot.sprite[data-anim]');
    if (!els.length) { running = false; return; }
    els.forEach(el => {
      const A = ANIMS[el.dataset.anim]; if (!A) return;
      let s = state.get(el);
      if (!s) { s = { pass: 0, steps: A.seq(0), i: -1, until: 0 }; state.set(el, s); }
      if (now < s.until) return;
      if (++s.i >= s.steps.length) { s.pass++; s.steps = A.seq(s.pass); s.i = 0; }
      const [frame, ms] = s.steps[s.i];
      el.firstElementChild.style.backgroundPosition = pos(frame, A.n);
      s.until = now + ms;
    });
    requestAnimationFrame(tick);
  }

  window.Mascot = Mascot;
})();
