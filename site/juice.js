// Trialbank "juice": the small rewards that make answering feel good. Bursts, floating marks, combo streaks,
// rising chimes, count-ups and stars. Everything respects reduced motion, and sounds can be switched off.
(function () {
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let lastTap = null;
  document.addEventListener('pointerdown', (e) => { lastTap = e.target.closest('button, .ol-opt, label, select') || null; }, true);

  // ---------- sound ----------
  // Real UI sounds from SND (snd.dev): "piano" by Ayako Taniguchi and "sine" by Yasuhiro Tsuchiya.
  // Each kit is one audio sprite; every sound is a slice of it. A synth fallback covers a failed load.
  const KITS = { piano: 'sounds/snd02/', sine: 'sounds/snd01/' };
  const kitName = () => { try { const k = localStorage.getItem('tb_sound'); return k === '0' ? 'off' : KITS[k] ? k : 'piano'; } catch { return 'piano'; } };
  const soundOn = () => kitName() !== 'off';
  let ac = null, master = null;
  const ctx = () => {
    try {
      if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination); }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch { return null; }
  };
  const loaded = {};                       // kit -> Promise<{ buf, map }>
  function loadKit(k) {
    if (!KITS[k]) return Promise.resolve(null);
    if (loaded[k]) return loaded[k];
    const a = ctx(); if (!a) return Promise.resolve(null);
    const get = (ext) => fetch(KITS[k] + 'audioSprite.' + ext).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((res, rej) => a.decodeAudioData(b, res, rej)));
    loaded[k] = Promise.all([fetch(KITS[k] + 'sprite.json').then(r => r.json()), get('m4a').catch(() => get('ogg'))])
      .then(([map, buf]) => ({ map, buf })).catch(() => { delete loaded[k]; return null; });
    return loaded[k];
  }
  function tone(freq, at, dur, vol = 0.18, type = 'sine') {          // fallback only
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // play(name, { rate, vol, at }) - rate shifts the pitch (2 = an octave up)
  function play(name, o = {}) {
    if (!soundOn()) return;
    const a = ctx(); if (!a) return;
    const k = kitName();
    loadKit(k).then(kit => {
      if (!kit || !kit.map[name]) { tone(660 * (o.rate || 1), 0, 0.12, 0.08, 'triangle'); return; }
      const [start, dur] = kit.map[name], src = a.createBufferSource(), g = a.createGain();
      src.buffer = kit.buf; src.playbackRate.value = o.rate || 1; g.gain.value = o.vol ?? 1;
      src.connect(g); g.connect(master);
      src.start(a.currentTime + (o.at || 0), start, dur);
    });
  }
  const pick = (base, n = 5) => `${base}_0${1 + Math.floor(Math.random() * n)}`;
  const semis = (n) => Math.pow(2, n / 12);
  const sfx = {
    good(combo = 1) { play('notification', { rate: semis(Math.min(combo - 1, 9) * 2) }); },      // climbs a whole tone per answer in a streak
    part() { play('select', { rate: semis(4) }); },
    miss() { play('caution', { vol: 0.8 }); },
    star(i) { play('select', { rate: semis(i * 4), vol: 1 }); },
    fanfare() { play('celebration'); },
    tick() { play(pick('tap'), { vol: 0.9 }); },
    bloop() { play('button'); },
    nav() { play(pick('swipe'), { vol: 0.9 }); },
    on() { play('toggle_on'); },
    off() { play('toggle_off'); },
    sparkle() { play('notification', { rate: semis(7), vol: 0.8 }); },
    whoosh() { play('transition_up', { vol: 0.8 }); },
    enter() { play('transition_up'); },
    leave() { play('transition_down'); },
  };
  // preload the kit on the first touch so the first sound isn't late
  document.addEventListener('pointerdown', () => { if (soundOn()) loadKit(kitName()); }, { once: true, capture: true });
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
  // ---------- full-screen transitions into a paper, a set, an exam or a result ----------
  // A brand-coloured circle grows out of the button you tapped, says where you're going, then lifts away.
  let curtainOn = false, lastHash = location.hash, booted = false;
  setTimeout(() => { booted = true; }, 1500);              // never on the first page load
  function curtain(title, sub = '', mood = 'happy') {
    if (curtainOn) return;
    curtainOn = true;
    const { x, y } = centre(lastTap), c = document.createElement('div');
    c.className = 'jz-curtain'; c.style.setProperty('--x', x + 'px'); c.style.setProperty('--y', y + 'px');
    const m = window.Mascot ? `<div class="jz-cm">${window.Mascot(mood, '')}</div>` : '';
    c.innerHTML = `<div class="jz-cin">${m}<div class="jz-ct">${title}</div>${sub ? `<div class="jz-cs">${sub}</div>` : ''}</div>`;
    document.body.appendChild(c);
    sfx.enter();
    const hold = still() ? 250 : 900;
    requestAnimationFrame(() => c.classList.add('in'));
    setTimeout(() => { c.classList.add('out'); }, hold);
    setTimeout(() => { c.remove(); curtainOn = false; }, hold + (still() ? 200 : 520));
  }
  const kind = (h) => (h || '').split('/')[0];
  window.addEventListener('hashchange', () => {
    const h = location.hash, from = kind(lastHash), to = kind(h); lastHash = h;
    if (!booted || from === to) return;
    if (to === '#set') {
      const m = /of (\d+)/.exec(document.getElementById('set-pos')?.textContent || '');
      curtain('Let’s go', m ? `${m[1]} question${m[1] === '1' ? '' : 's'}` : '', 'wave');
    } else if (to === '#examrun') curtain('Exam mode', 'Phone face down. You’ve got this.', 'think');
    else if (to === '#paper') curtain('Opening paper', '', 'happy');
    else if (to === '#summary') curtain('Done!', 'Let’s see how you went', 'cheer');
    else if (Date.now() - lastNav > 400) sfx.whoosh();
  });

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
  const SOUND_NAMES = { piano: 'Piano', sine: 'Soft', off: 'Off' };
  function cycleSound() {
    const order = ['piano', 'sine', 'off'], next = order[(order.indexOf(kitName()) + 1) % order.length];
    try { localStorage.setItem('tb_sound', next === 'off' ? '0' : next); } catch { /* blocked */ }
    if (next !== 'off') loadKit(next).then(() => sfx.good(1));
    return SOUND_NAMES[next];
  }
  const soundLabel = () => SOUND_NAMES[kitName()];

  window.Juice = { play: (n, ...a) => sfx[n] && sfx[n](...a), aim: (el) => { if (el) lastTap = el; }, reward, partial, miss, resetCombo, countUp, stars, burst, pop, floatText, soundOn, cycleSound, soundLabel, curtain, tap: () => lastTap };
})();
