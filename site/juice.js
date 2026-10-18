// Trialbank "juice": the small rewards that make answering feel good. Bursts, floating marks, combo streaks,
// rising chimes, count-ups and stars. Everything respects reduced motion, and sounds can be switched off.
(function () {
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let lastTap = null;
  document.addEventListener('pointerdown', (e) => { lastTap = e.target.closest('button, .ol-opt, label, select') || null; }, true);

  // ---------- sound ----------
  const soundOn = () => { try { return localStorage.getItem('tb_sound') !== '0'; } catch { return true; } };
  let ac = null;
  const ctx = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } };
  function tone(freq, at, dur, vol = 0.18, type = 'sine') {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];   // C major, climbing with the combo
  const sfx = {
    good(combo = 1) { if (!soundOn()) return; const b = SCALE[Math.min(combo - 1, SCALE.length - 2)]; tone(b, 0, 0.16, 0.16, 'triangle'); tone(b * 1.5, 0.07, 0.22, 0.12, 'sine'); },
    part() { if (!soundOn()) return; tone(587.33, 0, 0.14, 0.12, 'triangle'); tone(659.25, 0.08, 0.18, 0.1); },
    miss() { if (!soundOn()) return; tone(220, 0, 0.16, 0.12, 'sine'); tone(196, 0.09, 0.2, 0.1, 'sine'); },
    star(i) { if (!soundOn()) return; tone(SCALE[2 + i * 2], 0, 0.25, 0.14, 'triangle'); },
    tick() { if (!soundOn()) return; const a = ctx(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(1500, t0); o.frequency.exponentialRampToValueAtTime(700, t0 + 0.04);
      o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05); o.start(t0); o.stop(t0 + 0.06); },
    bloop() { if (!soundOn()) return; const a = ctx(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(420, t0); o.frequency.exponentialRampToValueAtTime(820, t0 + 0.07);
      o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12); o.start(t0); o.stop(t0 + 0.13); },
    nav() { if (!soundOn()) return; tone(660, 0, 0.07, 0.07, 'triangle'); tone(990, 0.045, 0.09, 0.06, 'triangle'); },
    on() { if (!soundOn()) return; tone(784, 0, 0.07, 0.08, 'triangle'); tone(1175, 0.04, 0.09, 0.07, 'triangle'); },
    off() { if (!soundOn()) return; tone(660, 0, 0.07, 0.07, 'triangle'); tone(494, 0.04, 0.09, 0.06, 'triangle'); },
    sparkle() { if (!soundOn()) return; [1568, 2093, 2637].forEach((f, i) => tone(f, i * 0.05, 0.16, 0.06, 'sine')); },
    whoosh() { if (!soundOn()) return; const a = ctx(); if (!a) return; const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * 0.25, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const f = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime; f.type = 'bandpass'; f.frequency.setValueAtTime(600, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + 0.2); f.Q.value = 1.2;
      g.gain.setValueAtTime(0.09, t0); n.buffer = b; n.connect(f); f.connect(g); g.connect(a.destination); n.start(t0); },
    fanfare() { if (!soundOn()) return; [0, 2, 4, 5].forEach((n, i) => tone(SCALE[n], i * 0.09, 0.3, 0.13, 'triangle')); },
  };
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* none */ } };

  // ---------- visuals ----------
  const centre = (el) => {
    if (!el || !el.isConnected) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  function burst(el, n = 14, spread = 70) {
    if (still()) return;
    const { x, y } = centre(el), cols = [css('--biro') || '#2f5be8', '#ffd23f', '#1fa45a', '#ff8a3d', '#7c4dde'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i'); d.className = 'jz-dot';
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, r = spread * (0.6 + Math.random() * 0.6);
      d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.background = cols[i % cols.length];
      d.style.setProperty('--dx', Math.cos(a) * r + 'px'); d.style.setProperty('--dy', Math.sin(a) * r + 'px');
      d.style.setProperty('--s', (0.6 + Math.random() * 0.8).toFixed(2));
      document.body.appendChild(d); setTimeout(() => d.remove(), 750);
    }
  }
  function floatText(el, text, cls = '') {
    const { x, y } = centre(el), d = document.createElement('div');
    d.className = 'jz-float ' + cls; d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
  }
  function pop(el, cls = 'jz-pop') { if (!el || still()) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }

  // combo pill: "3 in a row" and up
  let pill = null, pillT = null;
  const FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.6 1.4-4 2.6-5.2.3 1.6 1.1 2.6 2.1 3.1C11 8 11 5 12 2z"/></svg>';
  function combo(n) {
    if (n < 3) { if (pill) pill.classList.remove('on'); return; }
    if (!pill) { pill = document.createElement('div'); pill.className = 'jz-combo'; pill.setAttribute('role', 'status'); document.body.appendChild(pill); }
    const big = n % 5 === 0;
    pill.innerHTML = `${FLAME}<b>${n}</b> in a row${big ? '!' : ''}`;
    pill.classList.toggle('big', big); pill.classList.add('on'); pop(pill, 'jz-bump');
    clearTimeout(pillT); pillT = setTimeout(() => pill && pill.classList.remove('on'), 2600);
    if (big && window.TBconfetti) window.TBconfetti(40);
  }

  // ---------- every press: a ripple from the finger, a squish, and a click ----------
  let lastNav = 0;
  const PRESSABLE = 'button, .button, a.other, .mainnav a, .ol-opt, .pa, .ptile, .prow, .li';
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(PRESSABLE);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    ctx();                                                   // unlocks audio on iPhone, which needs a touch first
    if (el.closest('.mainnav')) { sfx.nav(); lastNav = Date.now(); }
    else if (el.matches('.primary, .pa.primary, #check-online, #next')) sfx.bloop();
    else sfx.tick();
    buzz(6);
    if (still()) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    let wrap = el.querySelector(':scope > .jz-rw');
    if (!wrap) { wrap = document.createElement('span'); wrap.className = 'jz-rw'; el.appendChild(wrap); }
    const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2, dot = document.createElement('span');
    dot.className = 'jz-rp'; dot.style.width = dot.style.height = size + 'px';
    dot.style.left = (e.clientX - r.left - size / 2) + 'px'; dot.style.top = (e.clientY - r.top - size / 2) + 'px';
    wrap.appendChild(dot); setTimeout(() => dot.remove(), 650);
  }, { passive: true });
  // chips and toggles: a rising note when switched on, a falling one when switched off; starring sparkles
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.chips button, .chip, [aria-pressed], #star, .tchip, .subj-opt, input[type=checkbox]');
    if (!el) return;
    setTimeout(() => {
      if (el.id === 'star') { if (/★/.test(el.textContent)) { sfx.sparkle(); burst(el, 12, 45); pop(el); } else sfx.off(); return; }
      const on = el.matches('.on, .picked, [aria-pressed="true"], :checked') || el.classList.contains('active');
      on ? sfx.on() : sfx.off(); pop(el);
    }, 30);
  }, true);
  // moving between pages
  window.addEventListener('hashchange', () => { if (Date.now() - lastNav > 400 && !/^#(set|examrun|summary)/.test(location.hash)) sfx.whoosh(); });

  // ---------- what the app calls ----------
  let streak = 0;
  function reward(marks = 1, el = lastTap) {
    streak += 1;
    sfx.good(streak); buzz(12);
    burst(el, 12 + Math.min(streak, 8) * 2, 60 + Math.min(streak, 8) * 6);
    floatText(el, `+${marks}`, 'good');
    pop(el);
    combo(streak);
  }
  function partial(got, el = lastTap) { sfx.part(); floatText(el, `+${got}`, 'part'); pop(el); }
  function miss(el = lastTap) {
    streak = 0; combo(0); sfx.miss(); buzz([8, 40, 8]);
    if (el && !still()) { el.classList.remove('jz-shake'); void el.offsetWidth; el.classList.add('jz-shake'); setTimeout(() => el.classList.remove('jz-shake'), 500); }
  }
  function resetCombo() { streak = 0; combo(0); }
  function countUp(el, to, fmt, ms = 900) {
    if (!el) return;
    if (still()) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function stars(box, n) {
    if (!box) return;
    const S = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';
    box.innerHTML = [0, 1, 2].map(i => `<span class="jz-star ${i < n ? 'lit' : ''}" style="--i:${i}">${S}</span>`).join('');
    box.setAttribute('aria-label', `${n} of 3 stars`);
    for (let i = 0; i < n; i++) setTimeout(() => { sfx.star(i); if (i === n - 1 && n === 3) sfx.fanfare(); burst(box.children[i], 10, 40); }, 450 + i * 280);
  }
  function setSound(on) { try { localStorage.setItem('tb_sound', on ? '1' : '0'); } catch { /* blocked */ } if (on) sfx.good(1); }

  window.Juice = { play: (n, ...a) => sfx[n] && sfx[n](...a), aim: (el) => { if (el) lastTap = el; }, reward, partial, miss, resetCombo, countUp, stars, burst, pop, floatText, soundOn, setSound, tap: () => lastTap };
})();
