/* Trialbank - plain JS, one file. Views: auth, home, set, summary, progress. */
(() => {
  const C = window.APP_CONFIG;
  // The sign-in is kept in localStorage AND IndexedDB. iPhone Home Screen apps can lose a localStorage write
  // if the app is closed soon after it (WebKit saves it lazily), which signed students out on every launch;
  // IndexedDB commits straight to disk, so it is the backup copy read when localStorage comes back empty.
  const idb = (() => {
    let db = null;
    const open = () => db || (db = new Promise((res, rej) => {
      const r = indexedDB.open('trialbank', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const run = (mode, fn) => open().then(d => new Promise((res, rej) => {
      const t = d.transaction('kv', mode), q = fn(t.objectStore('kv'));
      t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
    })).catch(() => null);
    return { get: k => run('readonly', s => s.get(k)), set: (k, v) => run('readwrite', s => s.put(v, k)), del: k => run('readwrite', s => s.delete(k)) };
  })();
  const durable = {
    async getItem(k) { let v = null; try { v = localStorage.getItem(k); } catch { /* blocked */ } if (v != null) return v; v = await idb.get(k); if (v != null) { try { localStorage.setItem(k, v); } catch { /* blocked */ } } return v ?? null; },
    async setItem(k, v) { try { localStorage.setItem(k, v); } catch { /* blocked */ } await idb.set(k, v); },
    async removeItem(k) { try { localStorage.removeItem(k); } catch { /* blocked */ } await idb.del(k); },
  };
  const sb = supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { storage: durable, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  try { navigator.storage?.persist?.(); } catch { /* not supported */ }
  const $ = (id) => document.getElementById(id);
  const views = ['auth', 'home', 'practise', 'set', 'summary', 'progress', 'admin', 'papers', 'paper', 'examrun', 'mark', 'tutor', 'profile', 'hsc', 'study'];
  const QCOLS = 'id, qid, number, part, type, marks, topic, answer, answer_source, image_path, solution_path, coarse, syllabus_note, pages, content, papers!inner(subject, school, year, difficulty), level';

  document.title = C.name;
  $('brand').textContent = C.name;

  const state = {
    user: null,
    subject: (() => { try { const k = localStorage.getItem('tb_subject'); return k && C.subjects[k] ? k : Object.keys(C.subjects)[0]; } catch { return Object.keys(C.subjects)[0]; } })(),
    topics: new Set(),          // selected topic names
    steps: new Map(),           // topic -> the dot points picked inside it (empty: the whole topic)
    opts: { count: 10, type: 'all', diff: 'all', fresh: 1 },
    set: null,                  // { qs: [...], i, results: [] }
  };

  // ---------- routing ----------
  const NAV = { tutor: 'tutor', mark: 'mark', home: 'home', practise: 'practise', set: 'practise', summary: 'practise', papers: 'papers', paper: 'papers', progress: 'progress', examrun: 'papers', hsc: 'progress' };
  // page transitions: iOS-style push going deeper, pop going back, a quick fade between tabs
  const DEPTH = { tutor: 0, mark: 0, auth: 0, home: 0, practise: 0, papers: 0, progress: 0, admin: 0, profile: 1, paper: 1, set: 2, examrun: 2, summary: 3 };
  const canVT = !!document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canVT) document.documentElement.classList.add('has-vt');
  let shown = null;
  function show(name) {
    if (!canVT || !shown || shown === name) { shown = name; return showNow(name); }
    const d = DEPTH[name] ?? 0, p = DEPTH[shown] ?? 0;
    document.documentElement.dataset.vt = d > p ? 'forward' : d < p ? 'back' : 'fade';
    shown = name;
    try {
      const t = document.startViewTransition(() => showNow(name));
      t.finished.finally(() => { delete document.documentElement.dataset.vt; });
    } catch { showNow(name); delete document.documentElement.dataset.vt; }
  }
  function showNow(name) {
    $('preview-bar').hidden = !(state.preview && state.user); drawBars();
    views.forEach(v => $('view-' + v).hidden = v !== name);
    $('nav').hidden = !state.user; $('top-right').hidden = !state.user;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === NAV[name]));
    document.body.classList.toggle('focus', name === 'set' || (name === 'examrun' && state.exam && state.exam.phase !== 'marking'));
    $('account-menu').hidden = true;
    window.scrollTo(0, 0);
  }
  let loadingN = 0;
  async function busy(fn) {
    loadingN++; $('loading').hidden = false;
    try { return await fn(); } finally { if (--loadingN <= 0) { loadingN = 0; $('loading').hidden = true; } }
  }
  // an invite link (#friend=ABC123): keep the code until they're signed in, then add them
  { const m = location.hash.match(/^#friend=([A-Za-z0-9]{4,10})$/); if (m) { try { localStorage.setItem('tb_invite', JSON.stringify(m[1])); } catch {} history.replaceState(null, '', location.pathname + location.search + '#home'); } }
  async function route() {
    if (window.Annotate) Annotate.stop();
    if (!(location.hash || '').startsWith('#set')) closeDock();
    setTimeout(drawSheetBtns, 0);
    const [h, arg] = (location.hash || '#home').slice(1).split('/');
    if (h !== 'study' && st.ch) stLeave();   // left a study session
    if (!state.user) return show('auth');
    if (!stBooted && !state.preview) { stBooted = true; loadFriends().catch(() => {}); }   // friends can see you online (and invite you) from any page
    drawSubject();
    if (!state.preview) sb.rpc('log_visit', { v: h || 'home' }).then(() => {}, () => {});   // engagement stats for the Admin page
    return busy(async () => {
      if (h === 'practise') { show('practise'); drawCpCard(); drawResume(); await renderBuild(); return; }
      if (h === 'progress' && can('progress')) { show('progress'); await renderProgress(); return; }
      if (h === 'admin' && adminOn()) { show('admin'); await renderAdmin(); return; }
      if (h === 'profile') { show('profile'); await renderProfile(); return; }
      if (h === 'hsc') { show('hsc'); await renderHsc(); return; }
      if (h === 'study') { show('study'); await renderStudy(arg); return; }
      if (h === 'set' && state.set) return show('set');
      if (h === 'summary' && state.set) return show('summary');
      if (h === 'papers') { flag('seen_papers', 1); show('papers'); await renderPapers(); return; }
      if (h === 'mark') { show('mark'); await renderMark(); return; }
      if (h === 'tutor' && tutorUsable()) { show('tutor'); await renderTutor(); return; }
      if (h === 'tutor' && proOpen()) { show('tutor'); renderTutorIntro(); return; }   // not Pro: show what the tutor is, then the ways in
      if (h === 'paper' && arg) { $('paper-error').hidden = true; show('paper'); await renderPaper(decodeURIComponent(arg)); return; }
      if (h === 'examrun' || h === 'exam') {
        if (state.exam) return show('examrun');
        const saved = lsGet(saveKey());
        if (saved) { try { await resumeExam(saved); return show('examrun'); } catch { /* fall through */ } }
      }
      if (h !== 'home' && h !== '') { history.replaceState(null, '', '#home'); }
      show('home'); await renderHome();
    });
  }
  const shortName = (n) => n.replace('Mathematics ', 'Maths ').replace('Extension ', 'Ext ').replace('Standard ', 'Std ')
    .replace('Earth and Environmental Science', 'Earth & Env').replace('Investigating Science', 'Inv Science').replace('Community and Family Studies', 'CAFS')
    .replace('Studies of Religion', 'SOR').replace('Design and Technology', 'D&T').replace('Society and Culture', 'Society & Culture').replace(' Continuers', '');
  function drawSubject() {
    const el = $('subject-switch'); el.innerHTML = '';
    const mine = mySubjects() || Object.keys(C.subjects);
    if (!mine.includes(state.subject)) state.subject = mine[0];
    const names = chosenNames() || Object.values(C.subjects);
    const btn = mk('button', 'subj-btn', `${esc(shortName(C.subjects[state.subject]))}<span class="caret" aria-hidden="true"></span>`);
    btn.title = C.subjects[state.subject]; btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    const menu = mk('div', 'menu subj-menu'); menu.hidden = true;
    const ready = names.filter(keyOf), later = names.filter(n => !keyOf(n));
    [...ready, ...later].forEach((name, idx) => {
      const key = keyOf(name);
      if (!key && idx === ready.length) menu.appendChild(mk('div', 'group', 'Coming soon'));
      const it = mk('button', 'menu-item' + (key === state.subject ? ' on' : '') + (key ? '' : ' soon'),
        `<span>${esc(name)}</span>${key === state.subject ? '<span class="cur">Current</span>' : ''}`);
      it.onclick = () => {
        menu.hidden = true;
        if (!key) return comingSoon(name);
        if (key === state.subject) return;
        state.subject = key; state.topics.clear(); flag('picked_subject', 1);
        try { localStorage.setItem('tb_subject', key); } catch {}
        const h = (location.hash || '#home').slice(1).split('/')[0];
        if (h === 'paper' || h === 'set' || h === 'summary') location.hash = h === 'paper' ? '#papers' : '#practise'; else route();
      };
      menu.appendChild(it);
    });
    const add = mk('button', 'menu-item add-subj', 'Add subjects');
    add.onclick = () => { menu.hidden = true; openSubjects(false); };
    menu.appendChild(add);
    btn.onclick = (ev) => { ev.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', !menu.hidden); $('account-menu').hidden = true; };
    el.append(btn, menu);
  }
  document.addEventListener('click', (ev) => { if (!ev.target.closest('#subject-switch')) document.querySelectorAll('.subj-menu').forEach(m => { m.hidden = true; }); });
  function comingSoon(name) {
    const m = mk('div', 'modal');
    m.innerHTML = `<div class="modal-card soon-card" role="dialog" aria-modal="true"><h2>${esc(name)}</h2><p class="muted">Coming soon.</p><button class="primary">OK</button></div>`;
    const close = () => m.remove();
    m.onclick = (ev) => { if (ev.target === m) close(); };
    m.querySelector('button').onclick = close;
    document.body.appendChild(m);
    m.querySelector('button').focus();
  }
  // ---------- which subjects a student takes ----------
  // every HSC course a student can say they take; only the ones in C.subjects have questions yet
  const HSC = ['English Standard', 'English Advanced', 'English Extension 1', 'English Extension 2', 'English EAL/D',
    'Mathematics Standard 2', 'Mathematics Advanced', 'Mathematics Extension 1', 'Mathematics Extension 2',
    'Biology', 'Chemistry', 'Physics', 'Earth and Environmental Science', 'Investigating Science', 'Science Extension',
    'Business Studies', 'Economics', 'Legal Studies', 'Ancient History', 'Modern History', 'History Extension', 'Geography',
    'Society and Culture', 'Studies of Religion I', 'Studies of Religion II', 'PDHPE', 'Community and Family Studies',
    'Software Engineering', 'Enterprise Computing', 'Engineering Studies', 'Design and Technology', 'Industrial Technology',
    'Food Technology', 'Textiles and Design', 'Agriculture', 'Visual Arts', 'Music 1', 'Music 2', 'Music Extension', 'Drama', 'Dance',
    'Chinese Continuers', 'French Continuers', 'German Continuers', 'Italian Continuers', 'Japanese Continuers', 'Spanish Continuers'];
  const keyOf = (name) => Object.keys(C.subjects).find(k => C.subjects[k] === name || k === name);
  function chosenNames() {   // everything they ticked, live or not
    const m = state.preview ? previewFlags.subjects : state.user?.user_metadata?.subjects;
    return Array.isArray(m) && m.length ? m.map(x => C.subjects[x] || x) : null;
  }
  function myName() {
    const n = state.preview ? previewFlags.name : state.user?.user_metadata?.first_name;
    return typeof n === 'string' && n.trim() ? n.trim() : null;
  }
  function mySubjects() {    // the ticked subjects that have questions; falls back to all live ones
    const names = chosenNames();
    if (!names) return null;
    const live = names.map(keyOf).filter(Boolean);
    return live.length ? live : Object.keys(C.subjects);
  }
  function openSubjects(first) {
    const sel = new Set(chosenNames() || []);
    const em = (state.user?.email || '').split('@')[0];
    $('subj-name').value = myName() || (/[._]/.test(em) ? em.split(/[._\d]/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : '');
    $('subj-name').oninput = () => sync();
    const names = [...Object.values(C.subjects), ...HSC.filter(n => !Object.values(C.subjects).includes(n))];
    const grid = $('subj-grid'); grid.innerHTML = '';
    names.forEach(name => {
      const live = !!keyOf(name);
      const b = document.createElement('button');
      b.className = 'subj' + (sel.has(name) ? ' on' : '');
      b.dataset.n = name.toLowerCase();
      b.innerHTML = `<span>${name}</span><span class="${live ? 'ready' : 'soon-tag'}">${live ? 'Ready' : 'Soon'}</span>`;
      b.setAttribute('aria-pressed', sel.has(name));
      b.onclick = () => { sel.has(name) ? sel.delete(name) : sel.add(name); b.classList.toggle('on'); b.setAttribute('aria-pressed', sel.has(name)); sync(); };
      grid.appendChild(b);
    });
    const sync = () => {
      $('subj-save').disabled = !sel.size || !$('subj-name').value.trim();
      const ready = [...sel].filter(keyOf).length, soon = sel.size - ready;
      $('subj-note').textContent = soon && !ready ? `None of these have questions yet. ${Object.values(C.subjects).map(shortName).join(', ').replace(/, ([^,]*)$/, ' and $1')} are ready now.`
        : soon ? `${soon} of your subjects ${soon === 1 ? 'is' : 'are'} coming soon.` : '';
    };
    $('subj-search').value = '';
    $('subj-search').oninput = () => { const q = $('subj-search').value.trim().toLowerCase(); grid.querySelectorAll('.subj').forEach(b => { b.hidden = q && !b.dataset.n.includes(q); }); };
    sync();
    $('subj-cancel').hidden = first;
    $('subj-modal').hidden = false;
    $('subj-cancel').onclick = () => { $('subj-modal').hidden = true; };
    $('subj-save').onclick = async () => {
      const list = names.filter(n => sel.has(n));
      $('subj-save').disabled = true;
      const fname = $('subj-name').value.trim().slice(0, 40);
      if (state.preview) { previewFlags.subjects = list; previewFlags.name = fname; }
      else {
        const { data, error } = await sb.auth.updateUser({ data: { subjects: list, first_name: fname } });
        if (!error && data?.user) state.user = data.user;
      }
      const mine = mySubjects();
      if (!mine.includes(state.subject)) { state.subject = mine[0]; try { localStorage.setItem('tb_subject', state.subject); } catch {} }
      $('subj-modal').hidden = true;
      route();
    };
  }
  function tabs() { drawSubject(); }   // older views called this per page; the switch now lives in the header
  // account menu
  $('account-btn').onclick = (ev) => { ev.stopPropagation(); const m = $('account-menu'); m.hidden = !m.hidden; $('account-btn').setAttribute('aria-expanded', !m.hidden); };
  document.addEventListener('click', (ev) => { if (!ev.target.closest('.account')) $('account-menu').hidden = true; });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') $('account-menu').hidden = true; });
  window.addEventListener('hashchange', route);

  // ---------- auth ----------
  let signup = false;
  $('auth-toggle').onclick = () => {
    signup = !signup;
    $('auth-title').textContent = signup ? 'Create your free account' : 'Sign in';
    $('auth-submit').textContent = signup ? 'Create free account' : 'Sign in';
    $('auth-toggle').textContent = signup ? 'Already have an account? Sign in' : 'New here? Create a free account';
    $('invite-row').hidden = !signup;
  };
  $('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = f.get('email').trim().toLowerCase(), password = f.get('password');
    $('auth-error').hidden = true;
    $('auth-submit').disabled = true;
    try {
      let r;
      if (signup) {
        const invite = f.get('invite').trim();
        const { data: reason } = await sb.rpc('signup_reason', { p_email: email, p_code: invite });
        if (reason) throw new Error(reason);
        r = await sb.auth.signUp({ email, password, options: { data: { invite } } });
        if (!r.error && !r.data.session) {
          // email confirmation is on in the project: tell them, then they sign in after clicking the link
          throw new Error('Check your email for a confirmation link, then sign in.');
        }
      } else {
        r = await sb.auth.signInWithPassword({ email, password });
      }
      if (r.error) throw r.error;
    } catch (err) {
      $('auth-error').textContent = friendly(err.message);
      $('auth-error').hidden = false;
    } finally {
      $('auth-submit').disabled = false;
    }
  };
  function friendly(msg) {
    if (/class list/i.test(msg)) return 'That email is not on the class list. Ask Jayden to add it.';
    if (/school email/i.test(msg)) return `Use your ${C.schoolDomain} address.`;
    if (/invite/i.test(msg)) return 'That invite code is wrong. It is on the Classroom post.';
    if (/Invalid login/i.test(msg)) return 'Wrong email or password.';
    if (/already registered/i.test(msg)) return 'That email already has an account. Sign in instead.';
    if (/Database error saving new user/i.test(msg)) return 'Sign-up was refused. Check your email and invite code, or ask Jayden.';
    return msg;
  }
  $('signout').onclick = async () => { clearDeviceData(); await sb.auth.signOut(); };
  $('calc-btn').onclick = () => window.Calc && Calc.toggle();
  document.querySelectorAll('[data-calc]').forEach(b => { b.onclick = () => window.Calc && Calc.toggle(); });   // inside questions and exams, where the top bar is hidden
  // ---------- NESA formula / reference sheet, beside the calculator ----------
  // one official sheet per course: the maths one holds Ext 2, Ext 1 and Advanced pages, so each course shows its own and the ones beneath it
  const SHEETS = { Adv: ['m3', 'm4'], Ext1: ['m2', 'm3', 'm4'], Ext2: ['m1', 'm2', 'm3', 'm4'], Physics: ['p1', 'p2', 'p3', 'p4'] };
  const sheetSubj = () => (location.hash.startsWith('#set') && state.set?.qs?.[state.set.i]?.papers?.subject) || state.subject;
  function drawSheetBtns() {
    const has = !!SHEETS[sheetSubj()];
    document.querySelectorAll('[data-sheet]').forEach(b => { b.hidden = !has; });
    if (!has) $('sheet-panel').hidden = true;
  }
  function toggleSheet() {
    const panel = $('sheet-panel'), subj = sheetSubj(), pages = SHEETS[subj];
    if (!panel.hidden || !pages) { panel.hidden = true; return; }
    $('sheet-title').textContent = subj === 'Physics' ? 'Physics data and formula sheet' : `${C.subjects[subj] || subj} reference sheet`;
    if (panel.dataset.s !== subj) {
      panel.dataset.s = subj;
      $('sheet-pages').innerHTML = pages.map((n, i) => `<img src="sheets/${n}.webp?v=2" alt="Page ${i + 1}" loading="${i ? 'lazy' : 'eager'}" decoding="async">`).join('');
      $('sheet-pages').scrollTop = 0;
    }
    panel.hidden = false;
  }
  document.querySelectorAll('[data-sheet]').forEach(b => { b.onclick = toggleSheet; });
  $('sheet-x').onclick = () => { $('sheet-panel').hidden = true; };
  $('sheet-zoom').onclick = () => { $('sheet-pages').classList.toggle('zoom'); $('sheet-zoom').classList.toggle('on'); };
  const drawSound = () => { if (window.Juice) $('sound-toggle').textContent = `Sounds: ${Juice.soundLabel()}`; };
  $('sound-toggle').onclick = () => { if (window.Juice) { Juice.cycleSound(); drawSound(); } };
  drawSound();
  sb.auth.onAuthStateChange((_evt, session) => {
    // profile edits and token refreshes only change the user object; don't re-route mid-question
    if ((_evt === 'USER_UPDATED' || _evt === 'TOKEN_REFRESHED') && session?.user && state.user) { state.user = session.user; return; }
    // supabase-js holds a lock while this callback runs: any other supabase call inside it deadlocks,
    // so the admin check and routing are deferred to the next tick.
    setTimeout(async () => {
      state.user = session?.user || null;
      if (!state.user) { $('streak').hidden = true; state.set = null; state.stars = null; state.exam = null; clearInterval(examTimer); }
      if (state.user) {
        const em = state.user.email || '';
        $('account-email').textContent = em;
        applyPrefs(); loadMedia().then(() => applyPrefs());
        touchStreak(); drawMarkLeft(); setTimeout(acceptInvite, 600);
      }
      await checkAdmin();
      route();
    }, 0);
  });
  // ---------- release dial: what this student gets (papers are limited in the database; features here) ----------
  const FEATURE_AT = { weak: 25, exam: 25, progress: 40, lost: 50, automark: 75 };
  const FEATURE_NAMES = [['weak', 'weak spots and got-wrong drills'], ['exam', 'timed papers'], ['progress', 'the Progress page'], ['lost', 'lost-mark tagging'], ['automark', 'auto-marking']];
  state.release = { dial: 100, tier: 'admin' };
  // tools follow the feature level; Trialbank Lite keeps the cohort's tools off while its papers stay open
  // an admin can "view as" a level (account menu) to see exactly what those students get
  try { state.viewAs = sessionStorage.getItem('tb_viewas') || null; state.viewDial = +(sessionStorage.getItem('tb_viewdial') || 0); } catch { state.viewAs = null; }
  const VIEW_FEAT = { lite: 20, full: 100, pro: 100, student: 100 };
  const featureLevel = () => state.viewAs ? (VIEW_FEAT[state.viewAs] ?? state.viewDial ?? 0) : (state.release?.features ?? state.release?.dial ?? 100);
  const adminOn = () => state.admin && !state.viewAs;   // false in student mode, so everything looks as a student sees it
  const can = (f) => (state.admin && !state.viewAs) || featureLevel() >= (FEATURE_AT[f] ?? 0);
  // papers a "Free" preview can open (the database lets the admin see everything, so this mirrors the dial)
  const seePaper = (p) => state.viewAs !== 'free' || state.viewDial >= 100 || p.difficulty === 'HSC' || (p.release_pct ?? 0) < state.viewDial;
  // Pro can be bought (pro_sales) or tried free (pro_trials); 'admin' means only admins see it while testing
  const proOpen = () => !!state.user && !state.preview && [state.proSale, state.pro?.trials].some(v => v === 'on' || (v === 'admin' && adminOn()));
  function applyRelease() {
    $('nav-tutor').hidden = !tutorUsable() && !proOpen();   // once Pro is on sale, everyone sees the Tutor tab (it offers Pro)
    document.querySelectorAll('[data-feature]').forEach(el => el.classList.toggle('feature-off', !can(el.dataset.feature)));
    const d = state.viewAs === 'free' ? state.viewDial : state.viewAs ? 100 : state.release?.dial ?? 100, note = $('release-note');
    const lite = state.viewAs ? state.viewAs === 'lite' : state.release?.lite;
    if (note) {
      note.hidden = (state.admin && !state.viewAs) || (d >= 100 && !lite);
      note.textContent = lite ? 'You\'re on Trialbank Lite: every paper and topic practice. Auto-marking, timed exams and weak spots unlock after trials.'
        : 'Trialbank is opening up in stages: more papers and features are on the way.';
    }
  }
  async function checkAdmin() {
    state.admin = false;
    if (state.user) { const { data } = await sb.rpc('is_admin'); state.admin = !!data; }
    if (state.user && !state.preview) {
      const [{ data: rel }, { data: pro }] = await Promise.all([sb.rpc('my_release'), sb.rpc('my_pro')]);
      if (rel) state.release = rel; if (pro) { state.pro = pro; state.proSale = pro.sale; }
      sb.rpc('my_tutor_left').then(({ data }) => { if (data) { state.tutorCredits = data.credits || 0; state.tutorPacks = data.packs; applyRelease(); } }).catch(() => {});
      sb.rpc('settle_referral').then(({ data }) => {   // a friend's link brought them here: once they've studied a bit, both get a free week
        if (data?.rewarded) { toast(`Your friend's invite paid off: <b>${data.days} days of Pro Mini</b> for both of you.`, 7000); checkAdmin(); }
      }).catch(() => {});
    }
    drawProMenu();
    applyRelease();
    if (!state.admin) { state.preview = false; state.viewAs = null; }
    drawAdminMenu();
    drawBars();
    if (state.user) setTimeout(noticeChanges, 600);
  }

  // ---------- home ----------
  // full topic names for display; the raw value stays in the database and queries
  const TOPIC_NAMES = {
    "Bern./Binom Dist.": 'Binomial Distribution', 'Binom. Exp.': 'Binomial Expansion',
    "DE's": 'Differential Equations', 'Exp. G + D': 'Exponential Growth and Decay',
    'Graphical Relat.': 'Graphical Relationships', 'Identities': 'Trigonometric Identities',
    'Inverse Fns': 'Inverse Functions', 'Inverse Trig Fns': 'Inverse Trigonometric Functions',
    'Normal Approx.': 'Normal Approximation', 'Parametrics': 'Parametric Equations',
    'Perms/Combs': 'Permutations and Combinations', 'Proof Induction': 'Proof by Induction',
    'Rem/Fact Th.': 'Remainder and Factor Theorems', 'Sum/Prod. Roots': 'Sums and Products of Roots',
    'Trig. Eqns': 'Trigonometric Equations', 'Volumes': 'Volumes of Revolution',
  };
  const topicName = t => TOPIC_NAMES[t] || t;
  // ---------- the syllabus each subject is examined on (HSC 2027) ----------
  const NSW = 'https://curriculum.nsw.edu.au/learning-areas/mathematics/';
  const SYLLABUS = {
    Ext1: {
      name: 'Mathematics Extension 1 11–12 Syllabus (2024)', url: NSW + 'mathematics-extension-1-11-12-2024/content',
      areas: [['11', 'Further work with functions', 'year-11/fafd6dbe16'], ['11', 'Polynomials', 'year-11/fa858a6f68'], ['11', 'Further trigonometry', 'year-11/fa788a073e'],
        ['11', 'Permutations and combinations', 'year-11/fa40471150'], ['11', 'The binomial theorem', 'year-11/fa00679960'],
        ['12', 'Proof by mathematical induction', 'year-12/fa0cde2f55'], ['12', 'Introduction to vectors', 'year-12/fa682e9b47'], ['12', 'Inverse trigonometric functions', 'year-12/fab9c2c5a7'],
        ['12', 'Further calculus skills', 'year-12/fa8f1cef28'], ['12', 'Further applications of calculus', 'year-12/faed7f98f9'], ['12', 'The binomial distribution and sampling distribution of the mean', 'year-12/fab1724c5e']],
      gone: ['The t-formulae', 'Products-to-sums identities', 'The pigeonhole principle', 'The normal approximation to the binomial (sample proportions)'],
      added: ['Trigonometry in three dimensions', '3D vectors', 'The sampling distribution of the mean and the central limit theorem'],
    },
    Adv: {
      name: 'Mathematics Advanced 11–12 Syllabus (2024)', url: NSW + 'mathematics-advanced-11-12-2024/content',
      areas: [['11', 'Working with functions', 'year-11/fa3d488ed2'], ['11', 'Trigonometry and measure of angles', 'year-11/fa0b724fc5'], ['11', 'Trigonometric identities and equations', 'year-11/faa07be39c'],
        ['11', 'Introduction to differentiation', 'year-11/fa6bc41678'], ['11', 'Exponential and logarithmic functions', 'year-11/fa576d8dce'], ['11', 'Graph transformations', 'year-11/fae9d6fbd3'], ['11', 'Probability and data', 'year-11/fa829162c5'],
        ['12', 'Further graph transformations and modelling', 'year-12/fa3b2bda67'], ['12', 'Sequences and series', 'year-12/fa8db67617'], ['12', 'Differential calculus', 'year-12/fa4d003480'],
        ['12', 'Integral calculus', 'year-12/fa41f9f88f'], ['12', 'Applications of calculus', 'year-12/fa383c9104'], ['12', 'Random variables', 'year-12/fa4579cc54'], ['12', 'Financial mathematics', 'year-12/fa4572a048']],
      gone: ['Correlation, regression and bivariate data', 'Box plots, quartiles and outliers', 'Annuity tables and recurrence relations'],
      added: ['Piecewise functions and semicircles', 'Sets and Venn diagrams', 'Expected value and variance of continuous random variables', 'Logarithmic scales'],
    },
    Physics: {
      name: 'Physics Stage 6 Syllabus (2017)', url: 'https://www.nsw.gov.au/education-and-training/nesa/curriculum/science/physics-stage-6-2017',
      areas: [['12', 'Module 5: Advanced Mechanics'], ['12', 'Module 6: Electromagnetism'], ['12', 'Module 7: The Nature of Light'], ['12', 'Module 8: From the Universe to the Atom']],
      note: 'Your cohort stays on this syllabus: the new Physics syllabus is first examined in 2028, so every Physics paper here is in scope.',
    },
  };
  function openSyllabus() {
    const S = SYLLABUS[state.subject], box = $('syl-body');
    if (!S) return;
    $('syl-title').textContent = C.subjects[state.subject] + ' syllabus';
    let h = `<p class="small muted">Examined on the <a href="${S.url}" target="_blank" rel="noopener">${esc(S.name)}</a>.</p>`;
    if (S.note) h += `<p class="small">${esc(S.note)}</p>`;
    else h += `<p class="small">The HSC in 2027 is the first on this syllabus, but these trials were written for the old one. Questions on content that's gone are tagged <span class="syl-flag">Most likely not in syllabus</span> and auto-marked as correct.</p>`;
    ['11', '12'].forEach(y => {
      const list = S.areas.filter(a => a[0] === y); if (!list.length) return;
      h += `<h3>Year ${y}</h3><ul class="syl-list">` + list.map(([, n, path]) => `<li>${path ? `<a href="${S.url.replace(/content$/, 'content/')}${path}" target="_blank" rel="noopener">${esc(n)}</a>` : esc(n)}</li>`).join('') + '</ul>';
    });
    if (S.gone) h += `<h3>Gone since the old syllabus</h3><ul class="syl-list">${S.gone.map(g => `<li>${esc(g)}</li>`).join('')}</ul>`;
    if (S.added) h += `<h3>New, so older trials won't cover it</h3><ul class="syl-list">${S.added.map(g => `<li>${esc(g)}</li>`).join('')}</ul>`;
    box.innerHTML = h;
    $('syl-modal').hidden = false;
  }
  $('open-syllabus').onclick = openSyllabus;
  $('syl-close').onclick = () => { $('syl-modal').hidden = true; };
  $('syl-modal').onclick = (ev) => { if (ev.target === $('syl-modal')) $('syl-modal').hidden = true; };
  // topics shown together on the Practise page, in syllabus order; anything unlisted lands in "Other"
  const TOPIC_GROUPS = {
    Ext1: [
      ['Functions', ['Graphical Relat.', 'Inequalities', 'Inverse Fns', 'Parametrics', 'Rem/Fact Th.', 'Sum/Prod. Roots']],
      ['Trigonometry', ['Identities', 'Trig. Eqns', 'Inverse Trig Fns']],
      ['Calculus', ['Calculus', 'Integration', 'Rates of Change', 'Related Rates', 'Exp. G + D', 'Volumes', "DE's"]],
      ['Proof and Vectors', ['Proof Induction', 'Vectors', 'Further Operations', 'Projectiles']],
      ['Combinatorics and Statistics', ['Combinatorics', 'Perms/Combs', 'Binom. Exp.', 'Statistical Analysis', 'Bern./Binom Dist.', 'Normal Approx.']],
    ],
    Ext2: [
      ['Proof', ['Contradiction', 'Inequalities', 'Induction', 'PROOF']],
      ['Complex numbers', ["Euler's", 'Solving Equations', 'Argand Diag', 'Geometric Implications']],
      ['Vectors', ['3D Vectors', 'Equations of lines']],
      ['Integration', ['Substitution', 'Quadratic Denom.', 'Reduction', 'Parts']],
      ['Mechanics', ['SHM', 'Resisted Motion', 'Non Resisted Motion', 'Projectiles']],
    ],
    Adv: [
      ['Functions', ['Working with Functions', 'Graphing Techniques']],
      ['Trigonometry', ['Trigonometry and Measure of Angles', 'Trigonometric Identities and Equations', 'Trigonometric Functions and Graphs']],
      ['Calculus', ['Introduction to Differentiation', 'Exponential and Logarithmic Functions', 'Differential Calculus', 'Applications of Differentiation', 'Integral Calculus']],
      ['Financial Mathematics', ['Sequences and Series', 'Financial Mathematics']],
      ['Statistics', ['Probability', 'Discrete Probability Distributions', 'Descriptive Statistics and Bivariate Data', 'Continuous Probability Distributions', 'The Normal Distribution']],
    ],
    Std2: [
      ['Algebra', ['Formulae and Equations', 'Linear Relationships', 'Non-linear Relationships']],
      ['Measurement', ['Applications of Measurement', 'Working with Rates', 'Right-angled Triangles', 'Non-right-angled Trigonometry', 'Rates and Ratios']],
      ['Financial Mathematics', ['Money Matters', 'Investments and Loans', 'Annuities']],
      ['Statistical Analysis', ['Data Analysis', 'Relative Frequency and Probability', 'Bivariate Data Analysis', 'The Normal Distribution']],
      ['Networks', ['Network Concepts', 'Critical Path Analysis']],
    ],
    SE: [
      ['Year 12 focus areas', ['Secure Software Architecture', 'Programming for the Web', 'Software Automation', 'Software Engineering Project']],
      ['Year 11 focus areas', ['Programming Fundamentals', 'The Object-oriented Paradigm', 'Programming Mechatronics']],
    ],
    Eng: [
      ['Year 12 modules', ['Civil Structures', 'Personal and Public Transport', 'Aeronautical Engineering', 'Telecommunications Engineering']],
      ['Year 11 modules', ['Engineering Fundamentals', 'Engineered Products', 'Braking Systems', 'Biomedical Engineering']],
    ],
    Physics: [
      ['Advanced Mechanics', ['Projectile Motion', 'Circular Motion', 'Motion in Gravitational Fields']],
      ['Electromagnetism', ['Charged Particles, Conductors and Fields', 'The Motor Effect', 'Electromagnetic Induction', 'Applications of the Motor Effect']],
      ['The Nature of Light', ['Electromagnetic Spectrum', 'Light: Wave Model', 'Light: Quantum Model', 'Light and Special Relativity']],
      ['From the Universe to the Atom', ['Origins of the Elements', 'Structure of the Atom', 'Quantum Mechanical Nature of the Atom', 'Properties of the Nucleus', 'Deep Inside the Atom']],
    ],
  };
  // syllabus steps inside a topic, in teaching order. Questions get tagged with the steps they need (Admin > Syllabus steps),
  // so a student can say how far into the topic their class is. Ids are stored on questions.skills: never rename one.
  const STEPS = {
    Physics: {
      'Projectile Motion': [
        ['pm1', 'Splitting velocity into horizontal and vertical parts'],
        ['pm2', 'Launched horizontally from a height'],
        ['pm3', 'Launched at an angle from level ground: time of flight, maximum height, range'],
        ['pm4', 'Launched at an angle from a height, or landing at a different height'],
        ['pm5', 'Velocity at any point, including the speed and angle it lands at'],
        ['pm6', 'Graphs of the motion, the shape of the path, and how angle and speed change it'],
        ['pm7', 'Investigations: checking the relationships, air resistance and errors'],
      ],
    },
    Adv: {
      'Sequences and Series': [   // NESA Mathematics Advanced 11–12 (2024), Year 12: Sequences and series
        ['ss1', 'Sequence notation, partial sums and sigma notation'],
        ['ss2', 'Arithmetic sequences: common difference and the nth term'],
        ['ss3', 'Arithmetic series: the sum of n terms'],
        ['ss4', 'Arithmetic models: linear growth and decay problems'],
        ['ss5', 'Geometric sequences: common ratio and the nth term'],
        ['ss6', 'Geometric series: the sum of n terms'],
        ['ss7', 'Limiting sums (when the ratio is between -1 and 1)'],
        ['ss8', 'Geometric models: exponential growth and decay problems'],
      ],
    },
  };
  const topicSteps = (t, subj = state.subject) => (STEPS[subj] || {})[t] || null;
  let topicCounts = null;   // [{subject, topic, type, n}]
  async function loadTopicCounts() {
    if (topicCounts) return topicCounts;
    const { data, error } = await sb.from('topic_counts').select('*');
    if (error) throw error;
    topicCounts = data;
    return data;
  }
  function tabs(elId, onPick) {
    const el = $(elId); el.innerHTML = ''; el.className = 'row tabs';
    for (const [key, label] of Object.entries(C.subjects)) {
      const b = document.createElement('button');
      b.textContent = label; b.className = key === state.subject ? 'on' : '';
      b.onclick = () => { state.subject = key; state.topics.clear(); onPick(); };
      el.appendChild(b);
    }
  }
  let prMine = {};   // topic -> { score, out_of } for this subject, so each topic shows how you're going
  const prLevel = (m) => !m || !m.out_of ? 'new' : m.score / m.out_of < 0.5 ? 'low' : m.score / m.out_of < 0.75 ? 'mid' : 'high';
  async function renderBuild() {
    $('open-syllabus').hidden = !SYLLABUS[state.subject];
    $('pr-error').hidden = true;
    const [counts, { data: mine }] = await Promise.all([loadTopicCounts(), sb.from('my_topic_stats').select('*').eq('subject', state.subject)]);
    prMine = {}; (state.preview ? [] : mine || []).forEach(r => { prMine[r.topic] = r; });
    const byTopic = {};
    counts.filter(r => r.subject === state.subject).forEach(r => {
      byTopic[r.topic] = byTopic[r.topic] || { mcq: 0, short: 0 };
      byTopic[r.topic][r.type] += Number(r.n);
    });
    const wrap = $('topic-chips'); wrap.innerHTML = '';
    const skip = skipped();
    [...state.topics].forEach(t => { if (!byTopic[t]) state.topics.delete(t); });
    const all = Object.keys(byTopic);
    const groups = (TOPIC_GROUPS[state.subject] || []).map(([name, ts]) => [name, ts.filter(t => byTopic[t] && !skip.has(t))]);
    const placed = new Set(groups.flatMap(g => g[1]));
    const other = all.filter(t => !placed.has(t) && !skip.has(t));
    if (other.length) groups.push([groups.length ? 'Other' : 'Topics', other.sort((a, b) => topicName(a).localeCompare(topicName(b)))]);
    const later = teachingOrder(all.filter(t => skip.has(t))).map(([, t]) => t);
    if (later.length) groups.push(["Not learnt yet", later]);
    groups.filter(g => g[1].length).forEach(([name, ts]) => {
      const box = mk('div', 'tgroup' + (name === 'Not learnt yet' ? ' later' : ''));
      const head = mk('div', 'tg-head', `<h3>${esc(name)}</h3>`);
      const tog = mk('button', 'link small tg-all');
      const sync = () => { tog.textContent = ts.every(t => state.topics.has(t)) ? 'Clear' : 'Select all'; };
      tog.onclick = () => {
        const on = !ts.every(t => state.topics.has(t));
        ts.forEach(t => { on ? state.topics.add(t) : state.topics.delete(t); state.steps.delete(t); });
        box.querySelectorAll('.tp').forEach(c => { c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
        box.querySelectorAll('.tp-wrap').forEach(c => c.classList.remove('part'));
        sync(); startSummary();
      };
      box.appendChild(head);   // (per-group select-all dropped: too much on screen)
      const list = mk('div', 'tp-list');
      ts.forEach(t => {
        const m = prMine[t], lv = prLevel(m), pct = m && m.out_of ? Math.round(100 * m.score / m.out_of) : null, n = byTopic[t].mcq + byTopic[t].short;
        const b = mk('button', `tp ${lv}${state.topics.has(t) ? ' on' : ''}${topicSteps(t) ? ' has-steps' : ''}`);
        b.type = 'button'; b.setAttribute('aria-pressed', state.topics.has(t));
        b.innerHTML = `<i class="tp-box" aria-hidden="true"></i><span class="tp-name">${esc(topicName(t))}<small hidden></small></span>
          ${pct == null ? '' : `<span class="tp-you" title="You've got ${m.score} of ${m.out_of} marks right"><i class="tp-dot"></i>${pct}%</span>`}`;
        const steps = topicSteps(t);
        const wrapT = mk('div', 'tp-wrap');
        wrapT.dataset.t = (topicName(t) + ' ' + t + ' ' + name + ' ' + (steps || []).map(x => x[1]).join(' ')).toLowerCase();
        let panel = null;
        const paint = () => {
          const on = state.topics.has(t), sel = state.steps.get(t);
          b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
          const sub = b.querySelector('small'); if (sub) { sub.textContent = sel?.size ? `${sel.size} of ${steps.length} dot points` : ''; sub.hidden = !sel?.size; }
          wrapT.classList.toggle('part', !!sel?.size);
        };
        const drawSteps = () => {
          if (!panel || panel.hidden) return;
          const sel = state.steps.get(t) || new Set(), counts = panel._counts || {};
          panel.innerHTML = (panel._tagged ? '' : '<p class="small muted">Not sorted into dot points yet.</p>')
            + steps.map(([id, lab]) => `<button type="button" class="tp-step${sel.has(id) ? ' on' : ''}" data-s="${id}" ${panel._tagged ? '' : 'disabled'}><i aria-hidden="true"></i><span>${esc(lab)}</span></button>`).join('')
            + (sel.size ? '<button type="button" class="link small tp-all">Whole topic</button>' : '');
          panel.querySelectorAll('[data-s]').forEach(x => x.onclick = () => {
            const set = state.steps.get(t) || new Set(); set.has(x.dataset.s) ? set.delete(x.dataset.s) : set.add(x.dataset.s);
            if (set.size) { state.steps.set(t, set); state.topics.add(t); } else state.steps.delete(t);
            paint(); drawSteps(); sync(); startSummary();
          });
          panel.querySelector('.tp-all')?.addEventListener('click', () => { state.steps.delete(t); paint(); drawSteps(); startSummary(); });
        };
        b.onclick = () => { const on = !state.topics.has(t); on ? state.topics.add(t) : state.topics.delete(t); if (!on) state.steps.delete(t); paint(); drawSteps(); sync(); startSummary(); };
        wrapT.appendChild(b);
        if (steps) {
          const more = mk('button', 'tp-more', `<span>Dot points</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`);
          more.type = 'button'; more.setAttribute('aria-expanded', 'false');
          panel = mk('div', 'tp-steps'); panel.hidden = true;
          more.onclick = async () => {
            panel.hidden = !panel.hidden; more.setAttribute('aria-expanded', !panel.hidden); wrapT.classList.toggle('open', !panel.hidden);
            if (!panel.hidden && !panel._loaded) {
              panel._loaded = true; panel.innerHTML = '<p class="small muted">Loading…</p>';
              const { data } = await sb.from('questions').select('skills, papers!inner(subject)').eq('papers.subject', state.subject).eq('topic', t).not('skills', 'is', null).limit(3000);
              panel._tagged = (data || []).length > 0; panel._counts = {};
              (data || []).forEach(q => (q.skills || []).forEach(x => { panel._counts[x] = (panel._counts[x] || 0) + 1; }));
            }
            drawSteps();
          };
          wrapT.append(more, panel);
        }
        paint();
        list.appendChild(wrapT);
      });
      box.appendChild(list); sync();
      wrap.appendChild(box);
    });
    // the quick start leans on your weakest topics once there are some
    const weak = Object.values(prMine).filter(r => r.out_of >= 2 && !skip.has(r.topic) && byTopic[r.topic]).sort((a, b) => a.score / a.out_of - b.score / b.out_of).slice(0, 3);
    $('pr-smart').onclick = async () => {
      $('pr-error').hidden = true;
      const keep = new Set(state.topics), keepSteps = state.steps; state.steps = new Map();
      state.topics = new Set(weak.length ? weak.map(w => w.topic) : all.filter(t => !skip.has(t)));
      try { await busy(() => buildSet({ count: 10, type: 'all', diff: 'all', fresh: 1 })); location.hash = '#set'; }
      catch (err) { $('pr-error').textContent = err.message; $('pr-error').hidden = false; }
      finally { state.topics = keep; state.steps = keepSteps; }
    };
    filterTopics(); startSummary();
    $('topics-all').onclick = () => { Object.keys(byTopic).filter(t => !skip.has(t)).forEach(t => state.topics.add(t)); renderBuild(); };
    $('topics-learnt').onclick = () => openLearnt(Object.keys(byTopic));
    { const pos = classPos(); $('pr-up-t').textContent = pos ? topicName(pos) + (classStep() && topicSteps(pos) ? ` · part ${topicSteps(pos).findIndex(([id]) => id === classStep()) + 1} of ${topicSteps(pos).length}` : '') : skip.size ? `${all.length - later.length} of ${all.length} topics` : 'Set it'; $('topics-learnt').classList.toggle('unset', !pos && !skip.size); }
    $('topics-none').onclick = () => { state.topics.clear(); renderBuild(); };
  }
  $('pr-opts-btn').onclick = () => { const o = $('pr-opts'), open = o.hidden; o.hidden = !open; $('pr-opts-btn').setAttribute('aria-expanded', open); $('pr-opts-btn').textContent = open ? 'Done' : 'Options'; };
  function filterTopics() {
    const q = $('topic-filter').value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
    const match = (txt) => words.every(w => txt.includes(w) || txt.includes(w.replace(/s$/, '')));
    document.querySelectorAll('#topic-chips .tp-wrap').forEach(b => { b.hidden = !!words.length && !match(b.dataset.t); });
    document.querySelectorAll('#topic-chips .tgroup').forEach(g => { g.hidden = !g.querySelector('.tp-wrap:not([hidden])'); });
    // nothing here? look in the student's other subjects
    let hint = $('pr-elsewhere'); if (!hint) { hint = mk('div', 'pr-elsewhere'); hint.id = 'pr-elsewhere'; $('topic-chips').before(hint); }
    const none = !!words.length && !document.querySelector('#topic-chips .tp-wrap:not([hidden])');
    const others = none ? (mySubjects() || Object.keys(C.subjects)).filter(sj => sj !== state.subject).flatMap(sj => (TOPIC_GROUPS[sj] || []).flatMap(([g, ts]) => ts
      .filter(t => match((topicName(t) + ' ' + t + ' ' + g + ' ' + (topicSteps(t, sj) || []).map(x => x[1]).join(' ')).toLowerCase())).map(t => [sj, t]))).slice(0, 4) : [];
    hint.hidden = !none;
    hint.innerHTML = !none ? '' : others.length ? `<p class="small">Not in ${esc(C.subjects[state.subject] || state.subject)}. Found in:</p>${others.map(([sj, t]) => `<button class="secondary small" data-sj="${esc(sj)}" data-t="${esc(t)}">${esc(topicName(t))} <span class="muted">· ${esc(C.subjects[sj] || sj)}</span></button>`).join('')}`
      : '<p class="small muted">No topic matches that. Try a shorter word, like "series" or "motion".</p>';
    hint.querySelectorAll('[data-sj]').forEach(b => b.onclick = async () => {
      state.subject = b.dataset.sj; try { localStorage.setItem('tb_subject', state.subject); } catch {}
      state.topics = new Set([b.dataset.t]); state.steps = new Map(); $('topic-filter').value = topicName(b.dataset.t);
      drawSubject(); await renderBuild();
      const w = [...document.querySelectorAll('#topic-chips .tp-wrap')].find(x => x.dataset.t.startsWith(topicName(b.dataset.t).toLowerCase()));
      w?.querySelector('.tp-more')?.click(); w?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  $('topic-filter').oninput = filterTopics;
  function startSummary() {
    const n = state.topics.size, o = state.opts;
    const type = { all: '', mcq: ' multiple choice', short: ' written' }[o.type] || '';
    const dots = [...state.steps.values()].reduce((a, x) => a + x.size, 0);
    $('start-summary').textContent = n ? `${o.count}${type} questions · ${dots ? `${dots} dot point${dots === 1 ? '' : 's'}` : `${n} topic${n === 1 ? '' : 's'}`}` : 'Tick a topic to start';
    const names = [...state.topics].map(topicName).sort();
    $('pr-picked').textContent = !n ? '' : (names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`) + (o.diff !== 'all' ? ` · ${o.diff.toLowerCase()} papers` : '');
    $('start').disabled = !n;
    $('pr-bar').classList.toggle('ready', !!n);
    $('topics-none').hidden = !n;
  }
  document.querySelectorAll('.seg').forEach(seg => {
    seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      const v = b.dataset.v;
      state.opts[seg.dataset.opt] = isNaN(v) ? v : Number(v);
      if (seg.dataset.opt) startSummary();
    });
  });

  $('start').onclick = async () => {
    $('home-error').hidden = true;
    if (!state.topics.size) { $('home-error').textContent = 'Pick at least one topic.'; $('home-error').hidden = false; return; }
    $('start').disabled = true;
    try {
      await buildSet({ allowSkipped: true });
      location.hash = '#set';
    } catch (err) {
      $('home-error').textContent = err.message; $('home-error').hidden = false;
    } finally { $('start').disabled = false; }
  };

  async function signed(paths, secs = 3600) {
    paths = [...new Set(paths.filter(Boolean))];
    const out = {};
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await sb.storage.from('questions').createSignedUrls(paths.slice(i, i + 100), secs);
      if (error) throw error;
      data.forEach(u => { out[u.path] = u.signedUrl; });
    }
    return out;
  }
  async function attachUrls(qs, urls) {
    const u = urls || await signed(qs.flatMap(x => [x.image_path, x.solution_path]));
    qs.forEach(x => { x.imageUrl = u[x.image_path]; x.solutionUrl = x.solution_path ? u[x.solution_path] : null; });
  }
  async function startSet(qs, urls) {
    await attachUrls(qs, urls);
    state.set = { qs, i: 0, results: [] };
    window.Juice && Juice.resetCombo();
    renderQuestion();
    location.hash = '#set';
  }
  async function buildSet(over = {}) {
    const o = { ...state.opts, ...over };
    if (![...state.topics].some(t => o.allowSkipped || !skipped().has(t))) throw new Error('Those topics are all marked as not learnt yet.');
    let q = sb.from('questions').select(QCOLS)
      .eq('papers.subject', state.subject)
      .in('topic', [...state.topics].filter(t => o.allowSkipped || !skipped().has(t)))
      .or('image_path.not.is.null,content.not.is.null')
      .limit(400);
    if (o.type !== 'all') q = q.eq('type', o.type);
    if (o.diff !== 'all') q = q.eq('papers.difficulty', o.diff);
    const { data, error } = await q;
    if (error) throw error;
    if (!data.length) throw new Error('No questions match that. Widen the filters.');

    await loadStepBlock(); const tooHard = blockedQs();
    let pool = data.filter(x => !tooHard.has(x.id) && !x.syllabus_note && hasKey(x));
    const narrowed = [...state.topics].filter(t => state.steps.get(t)?.size);
    if (narrowed.length) {   // dot points picked: only questions that need nothing beyond them
      const { data: sk } = await sb.from('questions').select('id, topic, skills, papers!inner(subject)').eq('papers.subject', state.subject).in('topic', narrowed).not('skills', 'is', null).limit(3000);
      const fits = new Set((sk || []).filter(q => { const sel = state.steps.get(q.topic), need = q.skills || []; return need.length && !need.includes('outside') && need.every(x => sel.has(x)); }).map(q => q.id));
      pool = pool.filter(q => !narrowed.includes(q.topic) || fits.has(q.id));
      if (!pool.length) throw new Error('No questions cover just those dot points yet. Tick a few more, or use the whole topic.');
    }
    if (!pool.length) throw new Error('No questions match that. Widen the filters.');
    if (o.fresh) {
      const { data: seen } = await sb.from('attempts').select('question_id').eq('user_id', state.user.id);
      const seenIds = new Set((seen || []).map(a => a.question_id));
      const unseen = pool.filter(x => !seenIds.has(x.id));
      if (unseen.length >= o.count) pool = unseen;
    }
    shuffle(pool);
    const qs = pool.slice(0, o.count);
    await attachUrls(qs);
    state.set = { qs, i: 0, results: [] };
    window.Juice && Juice.resetCombo();
    renderQuestion();
  }
  // only questions students can check themselves: multiple choice with an answer key, written ones with a worked solution
  const hasKey = (q) => !!q.content || (q.type === 'mcq' ? !!q.answer : !!q.solution_path);
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- set ----------
  // trials were written for the 2017 syllabus; questions most likely outside the 2024 one are auto-marked as correct
  const sylFlag = (q) => q && q.syllabus_note ? `<span class="syl-flag" title="${esc(q.syllabus_note)}">Most likely not in syllabus</span>` : '';
  function label(x) {
    return x.type === 'mcq' ? `Q${x.number}` : `Q${x.number}${x.part ? '(' + x.part + ')' : ''}`;
  }
  function renderQuestion() {
    const s = state.set, x = s.qs[s.i];
    const qcard = document.querySelector('#view-set .card.question');
    if (qcard) { qcard.classList.remove('enter'); void qcard.offsetWidth; qcard.classList.add('enter'); }
    // write on the question: pencil, highlighter, eraser, plus working space underneath
    if (window.Annotate) { Annotate.stop(); qcard?.querySelector('.ann-tools')?.remove(); }
    if (window.Annotate && qcard && state.user) { const tb = mk('div', 'ann-tools'); tb.appendChild(Annotate.button(qcard, `tb_ann_${state.user.id}_${x.id}`, { scope: $('view-set'), full: true })); qcard.prepend(tb); }
    $('set-pos').innerHTML = `<b>${s.i + 1} of ${s.qs.length}</b><span>${esc(topicName(x.topic))}</span>`;
    firstHint(x);
    $('set-meta').textContent = `${x.papers.school} ${x.papers.year} ${label(x)} · ${x.marks} mark${x.marks === 1 ? '' : 's'}`;
    $('set-bar').style.width = `${(s.i / s.qs.length) * 100}%`;
    const qi = $('q-img'); qi.crossOrigin = 'anonymous';
    if (x.content) qi.removeAttribute('src');
    else if (x._src) { qi.onload = null; qi.dataset.trimmed = '1'; qi.classList.remove('loading'); qi.src = x._src; }   // got ready in the background: instant
    else {   // not ready yet: clear the old question at once rather than leave it up while this one downloads
      qi.dataset.trimmed = ''; qi.classList.add('loading'); qi.alt = ''; qi.removeAttribute('src');
      qi.onload = () => { qi.classList.remove('loading'); qi.alt = 'Question'; trimImg(qi); };
      qi.src = x.imageUrl;
    }
    $('q-coarse').hidden = !x.coarse;
    starLabel($('star'), false);
    loadStars().then(s => starLabel($('star'), s.has(x.id)));
    $('star').onclick = () => toggleStar(x.id, $('star'));
    $('flag-q').innerHTML = `${SB_FLAG}<span class="sb-l">Flag</span>`; $('flag-q').classList.remove('lit'); $('flag-q').onclick = () => flagQuestion(x, $('flag-q'));
    $('ask-tutor').hidden = !(tutorUsable() && tuSubjects().includes(x.papers.subject) && x.image_path && !x.content);
    $('ask-tutor').onclick = () => askTutor(x);
    $('explain-mistake').hidden = true;
    $('verdict').hidden = true; $('verdict').className = 'verdict'; $('lost-box').hidden = true;
    $('next').hidden = true; $('skip').hidden = false;
    $('mcq-controls').hidden = x.type !== 'mcq' || !!x.syllabus_note;
    $('short-controls').hidden = x.type !== 'short' || !!x.syllabus_note;
    $('q-syllabus').hidden = !x.syllabus_note;
    const on = !!x.content, obj = on && Online.objective(x);
    qi.hidden = on; $('q-online').hidden = !on; $('q-online').innerHTML = '';
    if (on) { x._v = null; $('q-online').appendChild(Online.render(x, { onChange: v => { x._v = v; } })); }
    if (obj) { $('mcq-controls').hidden = true; $('short-controls').hidden = true; }
    $('check-online').hidden = !obj || !!x.syllabus_note;
    $('sol-wrap').hidden = true; $('show-sol').hidden = false; $('show-sol').disabled = !x.solutionUrl && !on;
    $('show-sol').textContent = x.solutionUrl || on ? 'Show solution' : 'No solution available';
    document.querySelectorAll('#mcq-controls button').forEach(b => { b.className = ''; b.disabled = false; });
    if (x.type === 'short') {
      const sm = $('self-mark'); sm.innerHTML = '';
      for (let m = 0; m <= (x.marks || 0); m++) {
        const b = document.createElement('button'); b.textContent = `${m}`;
        b.onclick = () => record(m, x.marks || 0, null, sm, b);
        sm.appendChild(b);
      }
    }
    if (x.syllabus_note) {          // most likely not in the 2024 syllabus: full marks, and nothing saved to their stats
      const outOf = x.type === 'mcq' ? 1 : (x.marks || 0);
      s.results[s.i] = { q: x, score: outOf, outOf, auto: true };
      $('q-syllabus').innerHTML = `${sylFlag(x)}<span class="small muted">${esc(x.syllabus_note)}</span>`;
      verdict('Most likely not in your syllabus, so this one is auto-marked as correct. Have a go anyway if you like.', 'good');
      $('next').hidden = false; $('skip').hidden = true;
    }
    drawSheetBtns(); keepSet();
    prepQ(s.qs[s.i + 1]); prepQ(s.qs[s.i + 2]);              // the next two are downloaded and trimmed while you work on this one
    if (x.solutionUrl) { const sol = new Image(); sol.src = x.solutionUrl; }   // so Show solution is instant too
  }
  // get a question's image ready before it's shown (downloaded and trimmed), so Next and Skip switch straight away
  function prepQ(x) {
    if (!x || x.content || !x.imageUrl || x._prep) return;
    x._prep = new Promise(res => {
      const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
      const done = (src) => { x._src = src; res(); };
      im.onload = () => {
        try {
          const cv = trimCanvas(im);
          if (cv.height >= im.naturalHeight - 6) return done(x.imageUrl);
          cv.toBlob(b => done(b ? URL.createObjectURL(b) : x.imageUrl), 'image/png');
        } catch { done(x.imageUrl); }
      };
      im.onerror = () => { x._prep = null; res(); };
      im.src = x.imageUrl;
    });
  }
  document.querySelectorAll('#mcq-controls button').forEach(b => b.onclick = () => {
    const x = state.set.qs[state.set.i];
    const pick = b.dataset.l, ok = x.answer ? pick === x.answer : null;
    document.querySelectorAll('#mcq-controls button').forEach(o => {
      o.disabled = true;
      if (o.dataset.l === x.answer) o.classList.add('correct');
      if (o === b && ok === false) o.classList.add('wrong');
      if (o === b) o.classList.add('picked');
    });
    record(ok ? 1 : 0, 1, pick);
    const ai = x.answer_source === 'ai' ? ' (This paper has no official key, so this answer was worked out by AI.)' : '';
    verdict(ok === null ? 'No answer key for this one.' : (ok ? 'Correct.' : `Not quite. Answer: ${x.answer}.`) + ai, ok === null ? 'warn' : ok ? 'good' : 'bad');
  });
  $('show-sol').onclick = () => {
    const x = state.set.qs[state.set.i];
    $('sol-html').innerHTML = ''; $('sol-img').parentElement.hidden = !!x.content;
    if (x.content) $('sol-html').appendChild(Online.solution(x)); else $('sol-img').src = x.solutionUrl;
    $('sol-wrap').hidden = false; $('show-sol').hidden = true;
  };
  $('check-online').onclick = () => {
    const x = state.set.qs[state.set.i], v = x._v;
    if (!Online.answered(x, v)) { toast('Pick an answer first.'); return; }
    const sc = Online.score(x, v), out = x.marks || 1;
    $('q-online').innerHTML = '';
    $('q-online').append(Online.render(x, { value: v, disabled: true, reveal: true }), Online.solution(x, v));
    $('check-online').hidden = true;
    window.Juice && Juice.aim($('q-online').querySelector('.ol-opt.correct.picked, .ol-opt.wrong, .ol-item.correct, .ol-item.wrong'));
    record(sc, out, Array.isArray(v) ? v.join(',') : v);
    verdict(sc === out ? 'Correct.' : sc ? `${sc}/${out}. Check the ones in red.` : 'Not quite. The answer is shown in green.', sc === out ? 'good' : sc ? 'warn' : 'bad');
  };
  function verdict(text, cls) {
    const mood = cls === 'good' ? 'cheer' : cls === 'bad' ? 'sad' : 'think';
    $('verdict').innerHTML = `<span class="vm">${Mascot(mood, '', { still: true })}</span><span>${esc(text)}</span>`;
    $('verdict').className = 'verdict ' + cls; $('verdict').hidden = false;
  }
  async function record(score, outOf, chosen, group, btn) {
    if (state.preview) previewFlags.attempted = 1;
    const s = state.set, x = s.qs[s.i];
    if (group) { group.querySelectorAll('button').forEach(o => { o.disabled = true; }); btn.classList.add('picked'); }
    s.results[s.i] = { q: x, score, outOf }; keepSet();
    if (window.Juice) { if (outOf && score >= outOf) Juice.reward(outOf); else if (score > 0) Juice.partial(score); else Juice.miss(); }
    if (x.type === 'short' && !(x.content && Online.objective(x))) verdict(score === outOf ? 'Full marks.' : score === 0 ? 'Mark it, move on. It will come back around.' : `${score}/${outOf}.`, score === outOf ? 'good' : score === 0 ? 'bad' : 'warn');
    $('next').hidden = false; $('skip').hidden = true;
    if (x.type === 'short' && score < outOf && !(x.content && Online.objective(x))) showLost(s.results[s.i], outOf - score);
    if (score < outOf) showExplain(x, score, outOf, chosen, s.results[s.i]);
    const { data: row, error } = await sb.from('attempts').insert({ user_id: state.user.id, question_id: x.id, score, out_of: outOf, chosen }).select('id').single();
    if (error) console.warn('attempt not saved', error.message);
    else { s.results[s.i].attemptId = row.id; if (s.results[s.i].lost?.length) saveLost(s.results[s.i]); }
    const ch = await srsAnswer(x, score, outOf).catch(e => { console.warn('srs', e.message); return null; });
    if (s.daily) { s.daily.changes.push(ch); dailyMark(x, score, outOf); }
  }
  // ---------- flag a broken question: wrong crop, missing text, options cut off, wrong answer ----------
  const FLAG_REASONS = [
    ['crop', 'Cropped wrong or cut off'], ['missing', "The question itself is missing"], ['options', "Can't see the answer options"],
    ['answer', 'The answer or marks look wrong'], ['solution', 'Solution missing or wrong'], ['other', 'Something else'],
  ];
  function flagQuestion(q, btn) {
    const m = mk('div', 'modal buy');
    m.innerHTML = `<div class="modal-card buy-card flag-card" role="dialog" aria-modal="true" aria-labelledby="flag-h">
      <button class="link buy-x" data-x aria-label="Close">✕</button>
      <h2 id="flag-h">What's wrong with this question?</h2>
      <p class="small muted">${esc(q.papers?.school || '')} ${q.papers?.year || ''} ${esc(label(q))}. Thanks: it gets fixed for everyone.</p>
      <div class="flag-reasons">${FLAG_REASONS.map(([k, t]) => `<button class="flag-r" data-r="${k}">${esc(t)}</button>`).join('')}</div>
      <textarea id="flag-note" rows="2" maxlength="300" placeholder="Anything else? (optional)"></textarea>
      <button class="primary" data-go disabled>Send</button>
    </div>`;
    let reason = null;
    const close = () => m.remove();
    m.onclick = async (ev) => {
      if (ev.target === m || ev.target.closest('[data-x]')) return close();
      const r = ev.target.closest('[data-r]');
      if (r) { reason = r.dataset.r; m.querySelectorAll('.flag-r').forEach(b => b.classList.toggle('on', b === r)); m.querySelector('[data-go]').disabled = false; return; }
      if (!ev.target.closest('[data-go]') || !reason) return;
      const note = m.querySelector('#flag-note').value.trim().slice(0, 300) || null;
      ev.target.closest('[data-go]').disabled = true;
      const { error } = state.preview ? { error: null } : await sb.from('question_flags').insert({ question_id: q.id, user_id: state.user.id, reason, note, source: 'student' });
      if (error && !/duplicate|unique/i.test(error.message)) { ev.target.closest('[data-go]').disabled = false; return toast(esc(error.message)); }
      close();
      if (btn) { if (btn.classList.contains('sb-btn')) { btn.innerHTML = `${SB_FLAG}<span class="sb-l">Flagged</span>`; btn.classList.add('lit'); } else btn.textContent = '⚑ Flagged'; }
      toast(location.hash === '#set' ? 'Thanks, flagged. You can <b>skip it</b> for now.' : 'Thanks, flagged. It will get fixed.', 5000);
    };
    document.body.appendChild(m);
  }
  // ---------- "Explain my mistake": straight into the tutor on this question, knowing what went wrong ----------
  function showExplain(x, score, outOf, chosen, res) {
    const b = $('explain-mistake');
    const fits = tuSubjects().includes(x.papers?.subject) && x.image_path && !x.content;
    const pro = tutorUsable(), sell = !pro && proOpen();
    b.hidden = !fits || (!pro && !sell);
    $('explain-pro').hidden = pro;
    b.onclick = () => {
      if (!pro) return openPro('mistake');
      const why = (res?.lost || []).map(l => reasonName[l.reason]).filter(Boolean);
      const ask = x.type === 'mcq'
        ? `I picked ${chosen || 'an answer'} but the answer is ${x.answer}. Explain my mistake: why is ${x.answer} right and what was wrong with mine?`
        : `I got ${score}/${outOf} on this.${why.length ? ` I lost marks for: ${why.join(', ').toLowerCase()}.` : ''} Explain where I went wrong and how to get full marks.`;
      askTutor({ ...x, ask });
    };
  }
  // ---------- lost marks: which mark, and why ----------
  const REASONS = [
    ['concept', "Didn't know the concept"], ['method', 'Wrong method'], ['algebra', 'Algebra slip'],
    ['careless', 'Careless'], ['time', "Didn't finish"], ['cfpe', 'Earned it CFPE (earlier slip carried)'],
  ];
  const reasonName = Object.fromEntries(REASONS);
  // builds the "which marks did you lose, and why" tagger; res = { outOf, lost: [...] }
  function lostTagger(res, nLost, onChange) {
    if (!can('lost')) return mk('div');
    res.lost = res.lost || [];
    const outOf = res.outOf;
    const root = mk('div', 'lost');
    root.appendChild(mk('p', '', `<b>Which marks did you lose?</b> <span class="muted small">You dropped ${nLost} of ${outOf}. Tag why, and tag any mark you still earned CFPE.</span>`));
    const marks = mk('div', 'chips'), wrap = mk('div'), q = mk('p', 'small'), rs = mk('div', 'chips');
    wrap.hidden = true; wrap.append(q, rs); root.append(marks, wrap);
    let cur = null;
    const draw = () => {
      marks.innerHTML = '';
      for (let m = 1; m <= outOf; m++) {
        const t = res.lost.find(l => l.mark === m);
        const b = mk('button', (t ? 'tagged' : '') + (cur === m ? ' on' : ''), t ? `Mark ${m} · ${reasonName[t.reason]}` : `Mark ${m}`);
        b.onclick = () => { cur = cur === m ? null : m; draw(); drawReasons(); };
        marks.appendChild(b);
      }
    };
    const drawReasons = () => {
      wrap.hidden = cur == null; if (cur == null) return;
      q.textContent = `Mark ${cur}: why was it lost, or did you earn it CFPE?`;
      const t = res.lost.find(l => l.mark === cur);
      rs.innerHTML = '';
      REASONS.forEach(([k, name]) => {
        const b = mk('button', t && t.reason === k ? 'on' : '', name);
        b.onclick = () => {
          res.lost = res.lost.filter(l => l.mark !== cur);
          if (!(t && t.reason === k)) res.lost.push({ mark: cur, reason: k });
          res.lost.sort((a, b) => a.mark - b.mark);
          if (res.lost.filter(l => l.reason !== 'cfpe').length >= nLost) cur = null;
          else { const next = [...Array(outOf).keys()].map(i => i + 1).find(m => m > (cur || 0) && !res.lost.some(l => l.mark === m)); cur = next || null; }
          draw(); drawReasons(); onChange && onChange(res.lost);
        };
        rs.appendChild(b);
      });
    };
    draw();
    return root;
  }
  function showLost(res, nLost) {
    const box = $('lost-box');
    box.innerHTML = ''; box.className = '';
    box.appendChild(lostTagger(res, nLost, () => saveLost(res)));
    box.hidden = false;
  }
  async function saveLost(res) {
    if (!res.attemptId) return;   // saved once the attempt row exists
    const { error } = await sb.from('attempts').update({ lost: res.lost.length ? res.lost : null }).eq('id', res.attemptId);
    if (error) console.warn('lost marks not saved', error.message);
  }
  async function renderLostBars() {
    const el = $('lost-bars'); $('lost-error').hidden = true;
    const { data, error } = await sb.from('attempts')
      .select('question_id, lost, created_at, questions!inner(topic, papers!inner(subject))')
      .eq('user_id', state.user.id).eq('questions.papers.subject', state.subject)
      .not('lost', 'is', null).order('created_at', { ascending: false }).limit(1000);
    if (error) { el.innerHTML = `<p class="muted small">${esc(error.message)}</p>`; return; }
    const by = {};
    (data || []).forEach(a => (a.lost || []).forEach(l => {
      const r = by[l.reason] = by[l.reason] || { n: 0, topics: {}, ids: new Set() };
      r.n++; r.ids.add(a.question_id);
      const tp = topicName(a.questions.topic || 'Other'); r.topics[tp] = (r.topics[tp] || 0) + 1;
    }));
    const cfpe = by.cfpe; delete by.cfpe;
    const total = Object.values(by).reduce((x, r) => x + r.n, 0);
    el.innerHTML = '';
    if (!total && !cfpe) { el.innerHTML = '<p class="muted small">Nothing tagged yet. After checking a solution, tap which marks you lost and why.</p>'; return; }
    if (cfpe) {
      const top = Object.entries(cfpe.topics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t, n]) => `${t} (${n})`).join(', ');
      const p = mk('p', 'small', `<b>${cfpe.n} mark${cfpe.n === 1 ? '' : 's'} still earned CFPE</b> <span class="muted">· your method held up after an earlier slip · mostly ${top}</span>`);
      el.appendChild(p);
    }
    Object.entries(by).sort((a, b) => b[1].n - a[1].n).forEach(([k, r]) => {
      const pct = Math.round(100 * r.n / total);
      const top = Object.entries(r.topics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t, n]) => `${t} (${n})`).join(', ');
      const d = mk('div', 'bar clickable ' + (pct >= 40 ? 'low' : pct >= 20 ? 'mid' : 'high'));
      d.innerHTML = `<div class="lbl"><span>${reasonName[k] || k}</span><span class="muted">${r.n} mark${r.n === 1 ? '' : 's'} · mostly ${top}</span></div>
                     <div class="track"><div class="fill" style="width:${pct}%"></div></div>`;
      d.onclick = async () => {
        try { if (!(await setFromIds([...r.ids], 15))) throw new Error('Those questions are not available any more.'); }
        catch (err) { $('lost-error').textContent = err.message; $('lost-error').hidden = false; }
      };
      el.appendChild(d);
    });
  }
  $('next').onclick = advance;
  $('skip').onclick = advance;
  function advance() {
    const s = state.set;
    if (s.daily && !s.results[s.i]) dailyMark(s.qs[s.i], 0, 0);   // skipped: counts as seen for today
    if (s.i + 1 < s.qs.length) {
      s.i++; renderQuestion();
      const top = $('view-set').getBoundingClientRect().top;   // scrolled down to the buttons: jump back to the top of the new question
      if (top < 0) scrollTo({ top: Math.max(0, scrollY + top - 80), behavior: 'instant' });
    }
    else if (s.daily) {
      busy(async () => {
        const st = await finishDaily().catch(e => { console.warn('daily', e.message); return null; });
        renderSummary(s.title); location.hash = '#summary';
        if (st) dailyPopup(st).result.then(() => checkLevelUp());
      });
    }
    else { renderSummary(s.title || 'Set done'); location.hash = '#summary'; }
  }

  // ---------- summary ----------
  function renderSummary(title = 'Set done') {
    if (state.set) state.set.done = true; dropSet();
    $('summary-title').textContent = title; $('summary-extra').textContent = '';
    const rs = state.set.results.filter(Boolean);
    const score = rs.reduce((a, r) => a + r.score, 0), outOf = rs.reduce((a, r) => a + r.outOf, 0);
    $('summary-score').textContent = outOf ? `0 / ${outOf}  (0%)` : 'Nothing marked';
    const pct = outOf ? score / outOf : null;
    if (outOf && window.Juice) Juice.countUp($('summary-score'), score, v => `${v} / ${outOf}  (${Math.round(100 * v / outOf)}%)`);
    else if (outOf) $('summary-score').textContent = `${score} / ${outOf}  (${Math.round(100 * score / outOf)}%)`;
    if (window.Juice) Juice.stars($('summary-stars'), pct == null ? 0 : pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0);
    $('summary-mascot').innerHTML = Mascot(pct == null ? 'think' : pct >= 0.8 ? 'cheer' : pct >= 0.5 ? 'happy' : 'sad');
    if (pct != null && pct >= 0.8) setTimeout(() => confetti(), 350);
    const byTopic = {};
    rs.forEach(r => { const t = byTopic[r.q.topic] = byTopic[r.q.topic] || { score: 0, out_of: 0 }; t.score += r.score; t.out_of += r.outOf; });
    bars($('summary-topics'), Object.entries(byTopic).map(([topic, v]) => ({ topic: topicName(topic), ...v })));
  }

  // ---------- progress ----------
  async function renderProgress() {
    $('pg-error').hidden = true;
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const [{ data: mine }, { data: cohort }, counts, { data: recent }] = await Promise.all([
      sb.from('my_topic_stats').select('*').eq('subject', state.subject),
      sb.rpc('cohort_topic_stats', { subj: state.subject }),
      loadTopicCounts().catch(() => []),
      sb.from('attempts').select('score, out_of, created_at, questions!inner(papers!inner(subject))').eq('user_id', state.user.id)
        .eq('questions.papers.subject', state.subject).gte('created_at', since).limit(2000),
    ]);
    const name = C.subjects[state.subject] || state.subject;
    const my = {}; (state.preview ? [] : mine || []).forEach(r => { my[r.topic] = r; });
    const year = {}; (cohort || []).forEach(r => { year[r.topic] = r; });
    const tot = Object.values(my).reduce((a, r) => ({ s: a.s + Number(r.score || 0), o: a.o + Number(r.out_of || 0), n: a.n + Number(r.n || r.attempts || 0) }), { s: 0, o: 0, n: 0 });
    const pct = tot.o ? Math.round(100 * tot.s / tot.o) : null;
    // the headline: how you're going overall, and the one thing to do next
    const tried = Object.values(my).filter(r => r.out_of > 0);
    const worst = tried.filter(r => r.out_of >= 2).sort((a, b) => a.score / a.out_of - b.score / b.out_of)[0];
    $('pg-sub').textContent = name;
    $('pg-hero').innerHTML = pct == null
      ? `<p class="pg-k">How you're going</p><div class="pg-big muted">No answers yet</div><p class="muted">Answer a few questions in ${esc(name)} and your marks by topic show up here.</p><button class="primary" id="pg-go">Start practising</button>`
      : `<p class="pg-k">Marks you're getting in ${esc(name)}</p><div class="pg-big ${pct < 50 ? 'low' : pct < 75 ? 'mid' : 'high'}">${pct}%</div>
         <p class="muted">${tot.s} of ${tot.o} marks across ${tried.length} topic${tried.length === 1 ? '' : 's'}.</p>
         ${worst ? `<button class="primary" id="pg-go">Work on ${esc(topicName(worst.topic))}</button>` : `<button class="primary" id="pg-go">Keep practising</button>`}`;
    $('pg-go').onclick = () => worst ? pgDrill(worst.topic, $('pg-go')) : (location.hash = '#practise');
    // last 14 days: questions answered each day
    const days = []; for (let i = 13; i >= 0; i--) days.push(dayOf(new Date(Date.now() - i * 864e5)));
    const per = Object.fromEntries(days.map(d => [d, { n: 0, s: 0, o: 0 }]));
    (state.preview ? [] : recent || []).forEach(a => { const d = per[dayOf(new Date(a.created_at))]; if (d) { d.n++; d.s += Number(a.score || 0); d.o += Number(a.out_of || 0); } });
    const maxN = Math.max(1, ...Object.values(per).map(d => d.n)), weekN = days.slice(7).reduce((a, d) => a + per[d].n, 0), activeDays = days.filter(d => per[d].n).length;
    $('pg-week-sum').textContent = activeDays ? `${weekN} question${weekN === 1 ? '' : 's'} this week · ${activeDays} of 14 days` : 'Nothing yet';
    $('pg-days').innerHTML = days.map((d, i) => { const x = per[d], h = x.n ? Math.max(8, Math.round(100 * x.n / maxN)) : 0, dt = new Date(d + 'T12:00:00');
      return `<div class="pg-day${d === dayOf() ? ' today' : ''}" title="${dt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}: ${x.n} question${x.n === 1 ? '' : 's'}${x.o ? `, ${Math.round(100 * x.s / x.o)}% of marks` : ''}">
        <span class="pg-n">${x.n || ''}</span><span class="pg-col"><i style="height:${h}%"></i></span><span class="pg-d">${dt.toLocaleDateString('en-AU', { weekday: 'narrow' })}</span></div>`; }).join('');
    // every topic in the course, in syllabus order, with the year's average as a tick
    const have = new Set((counts || []).filter(r => r.subject === state.subject).map(r => r.topic));
    const skip = skipped();
    const groups = (TOPIC_GROUPS[state.subject] || []).map(([g, ts]) => [g, ts.filter(t => have.has(t) || my[t])]);
    const placed = new Set(groups.flatMap(g => g[1]));
    const other = [...new Set([...have, ...Object.keys(my)])].filter(t => !placed.has(t));
    if (other.length) groups.push([groups.length ? 'Other' : 'Topics', other.sort((a, b) => topicName(a).localeCompare(topicName(b)))]);
    const box = $('my-bars'); box.innerHTML = '';
    groups.filter(g => g[1].length).forEach(([g, ts]) => {
      const sec = mk('div', 'pg-group', `<h3>${esc(g)}</h3>`);
      ts.forEach(t => {
        const r = my[t], p = r && r.out_of ? Math.round(100 * r.score / r.out_of) : null, y = year[t] && year[t].out_of ? Math.round(100 * year[t].score / year[t].out_of) : null;
        const lv = p == null ? 'new' : p < 50 ? 'low' : p < 75 ? 'mid' : 'high';
        const row = mk('div', `pg-row ${lv}${skip.has(t) ? ' later' : ''}`);
        row.innerHTML = `<span class="pg-t">${esc(topicName(t))}${skip.has(t) ? ' <small>not learnt yet</small>' : ''}</span>
          <span class="pg-track">${p != null ? `<i class="pg-fill" style="width:${Math.max(3, p)}%"></i>` : ''}${y != null ? `<i class="pg-tick" style="left:${y}%" title="Year average ${y}%"></i>` : ''}</span>
          <span class="pg-p">${p == null ? '<em>Not tried</em>' : `<b>${p}%</b><small>${r.score}/${r.out_of}</small>`}</span>
          <button class="secondary small pg-do">Practise</button>`;
        row.querySelector('.pg-do').onclick = (ev) => pgDrill(t, ev.currentTarget);
        sec.appendChild(row);
      });
      box.appendChild(sec);
    });
    if (!box.children.length) box.innerHTML = '<p class="muted small">No topics in this subject yet.</p>';
    hscPredictions().then(p => {   // predicted band, linking to the full HSC estimate
      const x = p[state.subject], t = $('hsc-teaser'); if (!t) return;
      const need = x && !x.ready ? Math.max(0, Math.ceil(x.need)) : 40, got = 40 - need;
      t.innerHTML = x?.ready ? `<p class="pg-k">Predicted HSC band</p><div class="pg-bandv">${x.band}</div><span class="small muted">About ${x.raw}% raw · from ${x.marks} marks</span><span class="pg-more">HSC estimate and ATAR →</span>`
        : `<p class="pg-k">Predicted HSC band</p><div class="pg-bandv muted">${need} marks to go</div><span class="pg-unlock"><i style="width:${Math.round(100 * got / 40)}%"></i></span><span class="small muted">Answer ${need} more marks of questions to see it.</span><span class="pg-more">HSC estimate and ATAR →</span>`;
    }).catch(() => {});
    renderLostBars();
  }
  async function pgDrill(topic, btn) {
    $('pg-error').hidden = true;
    const keep = new Set(state.topics), keepSteps = state.steps; state.topics = new Set([topic]); state.steps = new Map();
    if (btn) btn.disabled = true;
    try { await buildSet({ count: 10, type: 'all', diff: 'all', fresh: 1, allowSkipped: true }); location.hash = '#set'; }
    catch (err) { $('pg-error').textContent = err.message; $('pg-error').hidden = false; $('pg-error').scrollIntoView({ block: 'center' }); }
    finally { state.topics = keep; state.steps = keepSteps; if (btn) btn.disabled = false; }
  }
  // ---------- predicted band and ATAR estimate (hsc.js; HSC is already the list of course names above) ----------
  const HSCX = window.HSC;
  let hscCache = null;
  async function hscPredictions(force) {
    if (hscCache && !force && Date.now() - hscCache.at < 60e3) return hscCache.p;
    const { data, error } = await sb.from('attempts').select('score, out_of, created_at, questions!inner(topic, papers!inner(subject))')
      .eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(3000);
    if (error) throw error;
    const by = {};
    (data || []).forEach(a => { const sub = a.questions?.papers?.subject; if (!sub) return; (by[sub] = by[sub] || []).push({ score: a.score, out_of: a.out_of, created_at: a.created_at, topic: a.questions.topic }); });
    const p = {};
    Object.keys(C.subjects).forEach(sub => { if (by[sub]) p[sub] = HSCX.predict(sub, by[sub]); });
    hscCache = { at: Date.now(), p };
    return p;
  }
  const ATAR_KEY = () => `tb_atar_${state.user?.id}`;
  const HSC_CODE = (sub) => HSCX.SCALING[sub] ? sub : null;   // our subject codes match the scaling table's
  async function renderHsc() {
    const pro = tuAllowed();
    const preds = await hscPredictions(true).catch(() => ({}));
    const subj = state.subject, x = preds[subj], name = C.subjects[subj];
    const outOf = HSCX.EXT(subj) ? 50 : 100;
    const others = Object.entries(preds).filter(([s, p]) => s !== subj && p.ready);
    const box = $('hsc-band');
    if (!x || !x.ready) {
      box.innerHTML = `<p class="hsc-kick">Predicted band · ${esc(name)}</p><h2 class="hsc-big muted">Not enough yet</h2>
        <p>Answer about <b>${Math.max(1, Math.ceil(x?.need ?? 40))} more marks</b> of questions in ${esc(name)} and your predicted band appears here.</p>
        <button class="primary" id="hsc-daily">Do today's Daily 5</button>`;
      $('hsc-daily').onclick = () => { location.hash = '#home'; };
    } else {
      const range = x.bandLo === x.bandHi ? `Very likely ${x.band}` : `Somewhere from ${x.bandLo} to ${x.bandHi}`;
      box.innerHTML = `<p class="hsc-kick">Predicted band · ${esc(name)}</p>
        <div class="hsc-head"><h2 class="hsc-big">${x.band}</h2>
          <div class="hsc-meta">${pro ? `<b>About ${x.mark}/${outOf}</b> <span class="muted">(${x.lo} to ${x.hi})</span><br>` : ''}<span class="muted small">${range} · from ${x.marks} marks of questions, about ${x.raw}% raw</span></div></div>
        <h3 class="hsc-h3">What's holding you back</h3>
        <div class="hsc-hold ${pro ? '' : 'locked'}">${(pro ? x.holding : [{ topic: 'Topic one', pct: 48, gain: 3.1 }, { topic: 'Topic two', pct: 55, gain: 2.2 }, { topic: 'Topic three', pct: 61, gain: 1.4 }]).map(h => `
          <div class="hsc-row"><span class="hsc-t">${esc(pro ? topicName(h.topic) : h.topic)}</span><span class="muted small">${h.pct}% right</span><b>+${h.gain.toFixed(1)}%</b>${pro ? `<button class="link small" data-topic="${esc(h.topic)}">Practise</button>` : ''}</div>`).join('') || '<p class="muted small">Nothing stands out: your topics are all close to your average.</p>'}
          ${pro ? (x.holding.length ? '<p class="small muted">Lifting each topic to your average raises your raw mark by about this much. <button class="link small" id="hsc-paper">Make me a paper on these</button></p>' : '') : '<div class="hsc-lock"><b>See exactly which topics are costing you marks</b><span>and how much each one is worth.</span><button class="primary" id="hsc-pro">Unlock with Pro</button></div>'}
        </div>
        ${others.length ? `<div class="hsc-others">${others.map(([s, p]) => `<span class="chip">${esc(C.subjects[s])} <b>${p.band}</b></span>`).join('')}</div>` : ''}`;
      box.querySelectorAll('[data-topic]').forEach(b => b.onclick = async () => {
        state.topics = new Set([b.dataset.topic]); location.hash = '#practise';
      });
      if ($('hsc-paper')) $('hsc-paper').onclick = () => { cpOpt.focus = 'weak'; location.hash = '#practise'; setTimeout(() => { const c = $('cp-card'); if (c) { c.open = true; c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 400); };
      if ($('hsc-pro')) $('hsc-pro').onclick = () => openPro('band');
    }
    drawAtar(preds);
  }
  function drawAtar(preds) {
    const box = $('hsc-atar');
    let rows = lsGet(ATAR_KEY());
    if (!Array.isArray(rows) || !rows.length) {   // first visit: start from the subjects you've practised, plus English
      rows = Object.entries(preds).filter(([s, p]) => HSC_CODE(s) && p.ready).map(([s, p]) => ({ code: s, mark: p.mark, auto: true }));
      rows.unshift({ code: 'EngAdv', mark: '' });
    }
    const save = () => lsSet(ATAR_KEY(), rows);
    const opts = (cur) => Object.entries(HSCX.SCALING).map(([k, c]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(c.name)}${c.units === 1 ? ' (1 unit)' : ''}</option>`).join('');
    const paint = () => {
      const r = HSCX.atar(rows);
      box.innerHTML = `<div class="atar-top"><div><p class="hsc-kick">ATAR estimate</p>
          <div class="atar-big${r.ok ? '' : ' muted'}">${r.ok ? (r.atar == null ? 'Below 47' : r.atar.toFixed(2)) : '??.??'}</div>
          <p class="small muted">${r.ok ? `Aggregate ${r.aggregate} of 500 · best 10 units, including 2 of English` : esc(r.why)}</p></div></div>
        <div class="atar-rows">${rows.map((row, i) => { const c = HSCX.SCALING[row.code]; return `
          <div class="atar-row"><select data-i="${i}" data-k="code" aria-label="Course">${opts(row.code)}</select>
            <label class="atar-mark"><input data-i="${i}" data-k="mark" type="number" inputmode="decimal" min="0" max="${c?.max || 100}" step="1" value="${esc(row.mark ?? '')}" placeholder="–"><span class="muted small">/ ${c?.max || 100}</span></label>
            <span class="atar-sc small">${r.perUnit?.[row.code] != null ? `<b>${r.perUnit[row.code]}</b> scaled${r.counted?.[row.code] ? '' : ' · <span class="muted">not counted</span>'}` : row.auto ? '<span class="muted">predicted</span>' : ''}</span>
            <button class="link small atar-x" data-x="${i}" aria-label="Remove">✕</button></div>`; }).join('')}</div>
        ${rows.some(x => x.code === 'Ext1') && !rows.some(x => x.code === 'Adv' || x.code === 'Ext2') ? '<p class="small atar-hint">Doing Extension 1? Add <b>Mathematics Advanced</b> too: you get a mark in both.</p>' : ''}
        <div class="atar-foot"><button class="secondary" id="atar-add">Add a course</button>
          ${Object.values(preds).some(p => p.ready) ? '<button class="link small" id="atar-fill">Use my predicted marks</button>' : ''}</div>
        <p class="small muted atar-note">Enter the HSC mark you expect in each course (extension courses out of 50). Scaling from ${esc(HSCX.YEAR)}${rows.some(x => HSCX.SCALING[x.code]?.approx) ? '; Physics, Software Engineering and Music 1 are approximate' : ''}. A guide only: real scaling changes every year.</p>`;
      box.querySelectorAll('select[data-k]').forEach(el => el.onchange = () => { rows[+el.dataset.i].code = el.value; rows[+el.dataset.i].auto = false; save(); paint(); });
      box.querySelectorAll('input[data-k]').forEach(el => el.oninput = () => {
        const i = +el.dataset.i; rows[i].mark = el.value === '' ? '' : +el.value; rows[i].auto = false; save();
        clearTimeout(paint.t);
        paint.t = setTimeout(() => { paint(); const f = box.querySelector(`input[data-i="${i}"]`); if (f) { f.focus(); const v = f.value; f.value = ''; f.value = v; } }, 450);
      });
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.x, 1); save(); paint(); });
      $('atar-add').onclick = () => { const used = new Set(rows.map(x => x.code)); rows.push({ code: Object.keys(HSCX.SCALING).find(k => !used.has(k)) || 'Chem', mark: '' }); save(); paint(); };
      if ($('atar-fill')) $('atar-fill').onclick = () => {
        Object.entries(preds).forEach(([s, p]) => { if (!p.ready || !HSC_CODE(s)) return; const r0 = rows.find(x => x.code === s); if (r0) r0.mark = p.mark; else rows.push({ code: s, mark: p.mark }); });
        save(); paint();
      };
    };
    paint();
  }
  function bars(el, rows, empty) {
    el.innerHTML = '';
    if (!rows.length) { el.innerHTML = `<p class="muted small">${empty || ''}</p>`; return; }
    rows.map(r => ({ ...r, pct: r.out_of ? Math.round(100 * r.score / r.out_of) : 0 }))
      .sort((a, b) => a.pct - b.pct)
      .forEach(r => {
        const d = document.createElement('div');
        d.className = 'bar ' + (r.pct < 50 ? 'low' : r.pct < 75 ? 'mid' : 'high');
        d.innerHTML = `<div class="lbl"><span>${esc(topicName(r.topic))}</span><span class="muted">${r.pct}% · ${r.score}/${r.out_of}${r.extra ? ' · ' + r.extra : ''}</span></div>
                       <div class="track"><div class="fill" style="width:${r.pct}%"></div></div>`;
        el.appendChild(d);
      });
  }

  // ---------- admin ----------
  const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  let allowed = [], rosterN = 0;
  // ---------- engagement stats (Admin) ----------
  let statsDays = 30, statsData = null;
  const PAGE_NAMES = { home: 'Home', practise: 'Practise', papers: 'Papers', paper: 'A paper', progress: 'Progress', set: 'Question sets',
    summary: 'Set results', examrun: 'Timed exam', exam: 'Timed exam', admin: 'Admin' };
  const fmtN = (n) => Number(n || 0).toLocaleString('en-AU');
  const dShort = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  function barChart(title, rows, key, unit) {
    const max = Math.max(1, ...rows.map(r => Number(r[key]) || 0)), total = rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
    const box = mk('figure', 'stat-chart');
    box.innerHTML = `<figcaption><b>${esc(title)}</b><span class="muted small">${fmtN(total)} in ${rows.length} days</span></figcaption>`;
    const plot = mk('div', 'sc-plot'); plot.setAttribute('role', 'img');
    plot.setAttribute('aria-label', `${title}: ${rows.map(r => `${dShort(r.day)} ${r[key]}`).join(', ')}`);
    rows.forEach(r => {
      const v = Number(r[key]) || 0, col = mk('div', 'sc-col');
      col.dataset.tip = `${dShort(r.day)}: ${fmtN(v)} ${unit}`;
      col.innerHTML = `<i style="height:${v ? Math.max(3, 100 * v / max) : 0}%"></i>`;
      plot.appendChild(col);
    });
    box.appendChild(mk('div', 'sc-wrap', `<span class="sc-max small muted">${fmtN(max)}</span>`)).appendChild(plot);
    box.appendChild(mk('div', 'sc-axis small muted', `<span>${dShort(rows[0].day)}</span><span>${dShort(rows[rows.length - 1].day)}</span>`));
    return box;
  }
  function rankList(title, rows, label, val, unit) {
    const box = mk('div', 'stat-list'); box.appendChild(mk('h3', '', esc(title)));
    if (!rows || !rows.length) { box.appendChild(mk('p', 'muted small', 'Nothing yet.')); return box; }
    const max = Math.max(...rows.map(r => Number(r[val]) || 0), 1);
    rows.forEach(r => {
      const v = Number(r[val]) || 0, row = mk('div', 'sl-row');
      row.innerHTML = `<span class="sl-name">${esc(label(r))}</span><span class="sl-bar"><i style="width:${100 * v / max}%"></i></span><span class="sl-n">${fmtN(v)}</span>`;
      row.title = `${label(r)}: ${fmtN(v)} ${unit}`;
      box.appendChild(row);
    });
    return box;
  }
  async function renderStats() {
    const { data, error } = await sb.rpc('admin_stats', { days: statsDays, with_admins: $('st-admins').checked });
    if (error) { $('st-tiles').innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
    const d = statsData = data, n = statsDays;
    $('st-hero').textContent = fmtN(d.active_7);
    $('st-hero-label').textContent = `${d.active_7 === 1 ? 'student' : 'students'} active in the last 7 days`;
    const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
    const tiles = [
      [fmtN(d.users), 'Students signed up', `${fmtN(d.new_period)} new in ${n} days`],
      [fmtN(d.active_period), `Active in ${n} days`, `${fmtN(d.active_today)} today`],
      [pct(d.returning, d.active_period), 'Came back', `${fmtN(d.returning)} active on 2+ days`],
      [fmtN(d.answered_period), `Questions answered in ${n} days`, `${fmtN(d.answered)} all time`],
      [fmtN(d.exams), 'Timed papers sat', 'All time'],
      [fmtN(d.views_period), `Page views in ${n} days`, d.active_period ? `${(d.views_period / d.active_period).toFixed(1)} per active student` : ''],
    ];
    $('st-tiles').innerHTML = tiles.map(([v, l, sub]) => `<div class="stat-tile"><b>${v}</b><span>${esc(l)}</span><small class="muted">${esc(sub)}</small></div>`).join('');
    const charts = $('st-charts'); charts.innerHTML = '';
    const daily = d.daily || [];
    charts.appendChild(barChart('Active students per day', daily, 'active', 'active'));
    charts.appendChild(barChart('Questions answered per day', daily, 'answered', 'answered'));
    charts.appendChild(barChart('Page views per day', daily, 'views', 'views'));
    charts.appendChild(barChart('Sign-ups per day', daily, 'signups', 'sign-ups'));
    const lists = $('st-lists'); lists.innerHTML = '';
    lists.appendChild(rankList('Most visited', d.pages, r => PAGE_NAMES[r.view] || r.view, 'hits', 'views'));
    lists.appendChild(rankList('Most practised topics', d.topics, r => topicName(r.topic), 'n', 'answers'));
    lists.appendChild(rankList('Answers by subject', d.subjects, r => shortName(C.subjects[r.subject] || r.subject), 'n', 'answers'));
    $('st-since').textContent = d.since ? `Page views tracked since ${dShort(d.since)}.` : 'Page views start counting from today.';
  }
  document.querySelectorAll('#stats-range button').forEach(b => { b.onclick = () => { statsDays = +b.dataset.v; renderStats(); }; });
  $('st-admins').onchange = renderStats;
  $('st-csv').onclick = () => {
    if (!statsData) return;
    const rows = [['day', 'active_students', 'questions_answered', 'page_views', 'signups'], ...(statsData.daily || []).map(r => [r.day, r.active, r.answered, r.views, r.signups])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `trialbank-engagement-${statsDays}d.csv`; a.click();
  };
  function releaseWhat(d) {
    const on = FEATURE_NAMES.filter(([f]) => d >= FEATURE_AT[f]).map(x => x[1]);
    const off = FEATURE_NAMES.filter(([f]) => d < FEATURE_AT[f]);
    return `${d >= 100 ? 'Every trial paper' : d === 0 ? 'HSC papers only' : `About ${d}% of trial papers`}, plus practise and papers` +
      (on.length ? `, ${on.join(', ')}` : '') + '.' + (off.length ? ` Next: ${off[0][1]} at ${FEATURE_AT[off[0][0]]}.` : '');
  }
  function drawRelease(s) {
    const lite = $('rel-lite'); lite.checked = (s.cohort_lite ?? 'off') === 'on';
    lite.onchange = async () => {
      const { error } = await sb.from('settings').upsert([{ key: 'cohort_lite', value: lite.checked ? 'on' : 'off' }]);
      $('rel-saved').textContent = error ? error.message : lite.checked ? 'Trialbank Lite is on for your cohort.' : 'Lite is off: your cohort gets every tool its dial allows.';
    };
    [['cohort', s.release_cohort ?? '100'], ['public', s.release_public ?? '10']].forEach(([k, v]) => {
      const r = $('rel-' + k); r.value = v;
      const sync = () => { $(`rel-${k}-v`).textContent = r.value; $(`rel-${k}-what`).textContent = releaseWhat(+r.value); };
      r.oninput = sync; sync();
    });
    $('rel-save').onclick = async () => {
      $('rel-save').disabled = true; $('rel-saved').textContent = '';
      const { error } = await sb.from('settings').upsert([{ key: 'release_cohort', value: $('rel-cohort').value }, { key: 'release_public', value: $('rel-public').value }]);
      $('rel-save').disabled = false; $('rel-saved').textContent = error ? error.message : 'Saved. Students see the change next time they load the site.';
    };
  }
  // ---------- access levels: what each level gets, for the admin only ----------
  const ACCESS = [['free', 'Free'], ['lite', 'Lite'], ['full', 'Full'], ['pro', 'Pro']];
  function levelGets(s) {
    const rp = +(s.release_public ?? 10), pro = +(s.pro_monthly_marks ?? 5);
    const feat = { free: rp, lite: 20, full: 100, pro: 100 };
    const yes = '<span class="lv-yes">✓</span>', no = '<span class="lv-no">–</span>';
    const tick = (f) => (l) => feat[l] >= FEATURE_AT[f] ? yes : no;
    return [
      ['Trial papers', (l) => l === 'free' ? (rp >= 100 ? 'Every paper' : rp === 0 ? 'HSC papers only' : `About ${rp}%`) : 'Every paper'],
      ['HSC papers, topic practice, annotate, calculator', () => yes],
      ['Weak spots and got-wrong drills', tick('weak')],
      ['Timed papers', tick('exam')],
      ['Progress page', tick('progress')],
      ['Lost-mark tagging', tick('lost')],
      ['Auto-marking (shared free pool)', tick('automark')],
      ['Personal marked papers', (l) => l === 'pro' ? `<b>${pro} a month</b>` : no],
      ['AI tutor', (l) => l === 'pro' ? yes : no],
      ['Bought marking packs', () => 'If bought'],
    ];
  }
  function drawLevels(s, users) {
    const n = Object.fromEntries(ACCESS.map(([k]) => [k, 0]));
    (users || []).forEach(u => { if (u.level in n) n[u.level]++; });
    const who = { free: 'Other schools', lite: s.cohort_lite === 'on' ? 'Your cohort (Lite is on)' : 'Nobody automatically',
      full: (s.cohort_lite === 'on' ? '' : 'Your cohort, ') + 'anyone who buys a pack', pro: 'Only people you set' };
    const t = $('levels-table');
    t.innerHTML = `<thead><tr><th></th>${ACCESS.map(([k, name]) => `<th>${name} <span class="muted small">${n[k]}</span></th>`).join('')}</tr></thead>` +
      `<tbody><tr class="lv-who"><td>Who gets it on Auto</td>${ACCESS.map(([k]) => `<td>${who[k]}</td>`).join('')}</tr>` +
      levelGets(s).map(([label, f]) => `<tr><td>${label}</td>${ACCESS.map(([k]) => `<td>${f(k)}</td>`).join('')}</tr>`).join('') + '</tbody>';
    const pm = $('pro-marks'); pm.value = s.pro_monthly_marks ?? '5';
    $('pro-save').onclick = async () => {
      const v = String(Math.max(0, Math.min(100, Math.round(+pm.value || 0))));
      const { error } = await sb.from('settings').upsert([{ key: 'pro_monthly_marks', value: v }]);
      $('pro-msg').textContent = error ? error.message : `Pro accounts get ${v} papers marked a month.`;
      if (!error) { s.pro_monthly_marks = v; drawLevels(s, users); }
    };
  }
  function accessPicker(u) {
    const sel = document.createElement('select'); sel.className = 'lv-pick';
    if (u.level === 'admin') { sel.innerHTML = '<option>Admin</option>'; sel.disabled = true; return sel; }
    const name = (k) => (ACCESS.find(x => x[0] === k) || [k, k])[1];
    const draw = () => {
      sel.innerHTML = `<option value="auto">Auto${!u.pinned && u.level ? ' · ' + name(u.level) : ''}</option>` +
        ACCESS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
      sel.value = u.pinned || 'auto'; sel.classList.toggle('pinned', !!u.pinned);
    };
    draw();
    sel.onchange = async () => {
      const want = sel.value; sel.disabled = true;
      const { data, error } = await sb.rpc('admin_set_access', { target_email: u.email, lvl: want });
      sel.disabled = false;
      if (error) { toast(esc(error.message)); draw(); return; }
      u.pinned = want === 'auto' ? null : want; u.level = data || u.level; draw();
      sel.classList.add('saved'); setTimeout(() => sel.classList.remove('saved'), 900);
      drawLevels(adminSettings, adminUsers);
    };
    return sel;
  }
  let adminSettings = {}, adminUsers = [];
  // ---------- admin: AI spending, Pro numbers, switches, heaviest users ----------
  async function renderUsage() {
    const box = $('au-body'); if (!box) return;
    const { data: u, error } = await sb.rpc('admin_usage');
    if (error) { box.innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
    const t = u.tutor, a = u.automark, p = u.pro, st = u.settings || {};
    $('au-since').textContent = `Since ${new Date(u.since).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} (UTC month)`;
    const left = Math.max(0, t.cap - t.spent), pct = t.cap ? Math.min(100, 100 * t.spent / t.cap) : 0;
    const subs = p.monthly + p.annual, mrr = p.monthly * PRO.monthly + p.annual * PRO.annual / 12;
    const seg = (key, opts) => `<div class="seg" data-au="${key}">${opts.map(([v, l]) => `<button data-v="${v}"${(st[key] || 'admin') === v ? ' class="on"' : ''}>${l}</button>`).join('')}</div>`;
    box.innerHTML = `
      <div class="au-hero ${pct >= 90 ? 'low' : ''}">
        <div class="au-hero-top"><span><b>US$${t.spent.toFixed(2)}</b> of US$${Number(t.cap).toFixed(2)} tutor budget used</span><span class="small muted">US$${left.toFixed(2)} left</span></div>
        <div class="tu-meter-bar au-bar"><i style="width:${Math.max(1, pct)}%"></i></div>
        <p class="small muted">${t.msgs.toLocaleString('en-AU')} messages · ${fmtTok(t.tokens)} tokens · ${t.users} student${t.users === 1 ? '' : 's'} · about US$${t.msgs ? (t.spent / t.msgs).toFixed(3) : '0.011'} a message</p>
      </div>
      <div class="stat-tiles au-tiles">
        <div class="stat-tile"><b>${subs}</b><span>Pro subscribers</span><em>${p.monthly} monthly · ${p.annual} annual</em></div>
        <div class="stat-tile"><b>A${money(Math.round(mrr * 100) / 100)}</b><span>a month from Pro</span><em>before GST and Stripe fees</em></div>
        <div class="stat-tile"><b>${p.on_pass}</b><span>on a free week now</span><em>${p.trials_month} trials started this month · ${p.trials} ever</em></div>
        <div class="stat-tile"><b>${p.ref_rewarded}</b><span>referrals paid out</span><em>${p.ref_pending} waiting on 10 answers</em></div>
        <div class="stat-tile"><b>${p.packs_month || 0}</b><span>tutor packs sold</span><em>${p.pack_msgs_month || 0} messages this month</em></div>
        <div class="stat-tile"><b>US$${a.spent.toFixed(2)}</b><span>auto-marking</span><em>${a.runs} paper${a.runs === 1 ? '' : 's'} marked</em></div>
        <div class="stat-tile ${t.off_topic ? 'warn' : ''}"><b>${t.off_topic}</b><span>off-topic requests</span><em>code, essays and so on, declined</em></div>
      </div>
      <div class="au-controls">
        <div class="opt"><span>Pro sales</span>${seg('pro_sales', [['admin', 'Admins only'], ['on', 'On']])}</div>
        <div class="opt"><span>Free week</span>${seg('pro_trials', [['off', 'Off'], ['admin', 'Admins only'], ['on', 'On']])}</div>
        <div class="opt"><span>Tutor packs</span>${seg('tutor_packs', [['admin', 'Admins only'], ['on', 'On']])}</div>
        <div class="opt"><span>Tutor cap a month</span><span class="au-cap">US$<input id="au-cap" type="number" min="0" step="5" value="${Number(t.cap)}"><button class="secondary" id="au-cap-save">Save</button></span></div>
      </div>
      <h3 class="au-h3">Heaviest users this month</h3>
      ${u.top.length ? `<div class="table-wrap"><table class="au-table"><thead><tr><th>Account</th><th>Level</th><th>Tutor msgs</th><th>Tutor $</th><th>Off-topic</th><th>Papers marked</th><th>Marking $</th></tr></thead><tbody>
        ${u.top.map(r => `<tr><td>${esc(r.email)}</td><td>${esc(r.tier || '')}</td><td>${r.msgs}</td><td>${Number(r.tutor_usd).toFixed(2)}</td><td${r.off ? ' class="warn"' : ''}>${r.off}</td><td>${r.runs}</td><td>${Number(r.mark_usd).toFixed(2)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted small">No AI use yet this month.</p>'}`;
    box.querySelectorAll('[data-au]').forEach(sg => sg.onclick = async (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      const { error } = await sb.from('settings').upsert([{ key: sg.dataset.au, value: b.dataset.v }], { onConflict: 'key' });
      if (error) return toast(esc(error.message));
      sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      toast(`${{ pro_sales: 'Pro sales', pro_trials: 'Free week', tutor_packs: 'Tutor packs' }[sg.dataset.au]}: <b>${esc(b.textContent)}</b>`); if (sg.dataset.au === 'tutor_packs') state.tutorPacks = b.dataset.v;
      const { data: pro } = await sb.rpc('my_pro'); if (pro) { state.pro = pro; state.proSale = pro.sale; applyRelease(); }
    });
    $('au-cap-save').onclick = async () => {
      const v = Math.max(0, +$('au-cap').value || 0);
      const { error } = await sb.from('settings').upsert([{ key: 'tutor_monthly_cap_usd', value: String(v) }], { onConflict: 'key' });
      if (error) return toast(esc(error.message));
      toast(`Tutor cap set to <b>US$${v}</b> a month.`); renderUsage();
    };
  }
  const FLAG_NAME = Object.fromEntries(FLAG_REASONS);
  async function renderFlags() {
    const box = $('flags-list'); if (!box) return;
    const { data, error } = await sb.rpc('admin_flags');
    if (error) { box.innerHTML = `<p class="error small">${esc(error.message)}</p>`; return; }
    $('flags-count').textContent = data.length ? `${data.length} open` : '';
    if (!data.length) { box.innerHTML = '<p class="muted small">Nothing flagged. Nice.</p>'; return; }
    const urls = await signed(data.map(r => r.image_path).filter(Boolean)).catch(() => ({}));
    box.innerHTML = data.map((r, i) => `<div class="flag-row">
      ${r.image_path && urls[r.image_path] ? `<a href="${urls[r.image_path]}" target="_blank" rel="noopener"><img src="${urls[r.image_path]}" alt="" loading="lazy"></a>` : '<div class="flag-noimg">No image</div>'}
      <div class="flag-info"><b>${esc(r.school || r.question_id)} ${r.year || ''} ${r.number ? `Q${r.number}${r.part ? `(${esc(r.part)})` : ''}` : ''}</b>
        <span class="small muted">${esc(C.subjects[r.subject] || r.subject || '')} · ${r.students ? `${r.students} student${r.students == 1 ? '' : 's'}` : ''}${r.students && r.tutor ? ' + ' : ''}${r.tutor ? 'the tutor' : ''} · ${day(r.last_at)}</span>
        <span class="flag-chips">${(r.reasons || []).map(k => `<em>${esc(FLAG_NAME[k] || k)}</em>`).join('')}</span>
        ${(r.notes || []).length ? `<span class="small">${r.notes.map(n => `“${esc(n)}”`).join(' · ')}</span>` : ''}
        <span class="small muted">${esc(r.question_id)}</span></div>
      <button class="secondary small" data-fix="${i}">Mark fixed</button></div>`).join('');
    box.querySelectorAll('[data-fix]').forEach(b => b.onclick = async () => {
      b.disabled = true; const r = data[+b.dataset.fix];
      const { error } = await sb.rpc('admin_resolve_flags', { qid: r.question_id });
      if (error) { b.disabled = false; return toast(esc(error.message)); }
      b.closest('.flag-row').remove(); toast('Marked fixed.');
    });
  }
  // ---------- Admin: tag questions with syllabus steps, then check them ----------
  let stepsFilter = '';
  async function renderSteps() {
    const sel = $('steps-topic'); if (!sel) return;
    const opts = Object.entries(STEPS).flatMap(([subj, ts]) => Object.keys(ts).map(t => [`${subj}|${t}`, `${C.subjects[subj] || subj} · ${topicName(t)}`]));
    if (!sel.options.length) { sel.innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''); sel.onchange = () => { stepsFilter = ''; renderSteps(); }; }
    const [subj, topic] = sel.value.split('|'), steps = STEPS[subj][topic], name = Object.fromEntries(steps);
    const { data, error } = await sb.from('questions').select('id, qid, marks, image_path, skills, papers!inner(subject, school, year)')
      .eq('papers.subject', subj).eq('topic', topic).not('image_path', 'is', null).limit(2000);
    if (error) { $('steps-status').textContent = error.message.includes('skills') ? 'Run the skills column SQL first (questions.skills).' : error.message; return; }
    const tagged = (data || []).filter(q => q.skills), n = (data || []).length;
    $('steps-count').textContent = `${tagged.length} of ${n} tagged`;
    $('steps-run').hidden = tagged.length === n;
    $('steps-legend').innerHTML = steps.map(([id, l], i) => { const k = tagged.filter(q => q.skills.includes(id)).length;
      return `<button class="chip${stepsFilter === id ? ' on' : ''}" data-f="${id}" title="${esc(l)}"><b>${i + 1}</b> ${esc(l.length > 38 ? l.slice(0, 36) + '…' : l)}<span class="n">${k}</span></button>`; }).join('')
      + `<button class="chip${stepsFilter === 'outside' ? ' on' : ''}" data-f="outside">Needs another topic<span class="n">${tagged.filter(q => q.skills.includes('outside')).length}</span></button>`;
    $('steps-legend').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { stepsFilter = stepsFilter === b.dataset.f ? '' : b.dataset.f; renderSteps(); });
    const show = (stepsFilter ? tagged.filter(q => q.skills.includes(stepsFilter)) : tagged).slice(0, 40);
    const urls = show.length ? await signed(show.map(q => q.image_path)) : {};
    const ix = (id) => steps.findIndex(([x]) => x === id) + 1;
    $('steps-list').innerHTML = show.map(q => `<div class="steps-q"><div class="steps-qh small"><b>${esc(q.papers.school)} ${q.papers.year} ${esc(q.qid)}</b>
        <span>${q.skills.filter(x => x !== 'outside').map(x => `<em title="${esc(name[x] || x)}">${ix(x)}</em>`).join('')}${q.skills.includes('outside') ? '<em class="out">+ other topic</em>' : ''}</span>
        <button class="link small" data-redo="${esc(String(q.id))}">Redo</button></div><img loading="lazy" src="${urls[q.image_path] || ''}" alt=""></div>`).join('')
      || `<p class="small muted">${tagged.length ? 'None with that step.' : 'Nothing tagged yet.'}</p>`;
    $('steps-list').querySelectorAll('[data-redo]').forEach(b => b.onclick = async () => {
      b.disabled = true; b.textContent = 'Redoing…';
      const { data: r, error: e } = await sb.functions.invoke('tag-skills', { body: { subject: subj, subject_name: C.subjects[subj], topic, steps: steps.map(([id, label]) => ({ id, label })), retag: [b.dataset.redo] } });
      if (e || r?.error) { b.textContent = 'Failed'; return; }
      renderSteps();
    });
    $('steps-run').onclick = async () => {
      const btn = $('steps-run'); btn.disabled = true; let cost = 0, done = 0; const skip = [];
      try {
        for (let guard = 0; guard < 400; guard++) {
          const { data: r, error: e } = await sb.functions.invoke('tag-skills', { body: { subject: subj, subject_name: C.subjects[subj], topic, steps: steps.map(([id, label]) => ({ id, label })), skip } });
          if (e) { let m = e.message; try { m = (await e.context.json()).error || m; } catch {} throw new Error(m); }
          cost += r.cost_usd || 0; done += r.done || 0; skip.push(...(r.failed_ids || []));
          $('steps-status').textContent = `Tagged ${done} so far · ${Math.max(0, r.left - skip.length)} left · US$${cost.toFixed(2)} spent${skip.length ? ` · ${skip.length} couldn't be read (run again to retry)` : ''}`;
          if (r.left <= skip.length || (!r.done && !r.failed)) break;
        }
      } catch (err) { $('steps-status').textContent = err.message || String(err); }
      finally { btn.disabled = false; renderSteps(); }
    };
  }
  async function renderAdmin() {
    renderStats(); renderUsage(); renderFlags(); renderSteps();
    const [{ data: settings }, { data: emails }, { data: users }, { data: roster }] = await Promise.all([
      sb.from('settings').select('*'),
      sb.from('allowed_emails').select('email').order('email'),
      sb.rpc('admin_users'),
      sb.from('roster').select('name'),
    ]);
    rosterN = (roster || []).length;
    $('roster-count').textContent = `· ${rosterN}`;
    renderAutomarkAdmin(s0 => s0, settings);
    $('ntfy-topic').textContent = (settings || []).find(r => r.key === 'ntfy_topic')?.value || 'not set';
    const s = Object.fromEntries((settings || []).map(r => [r.key, r.value]));
    drawRelease(s);
    adminSettings = s; adminUsers = users || []; drawLevels(s, adminUsers);
    document.querySelectorAll('#admin-mode button').forEach(b => b.classList.toggle('on', b.dataset.v === (s.signup_mode || 'domain')));
    $('admin-code').value = s.invite_code || '';
    $('admin-admins').value = s.admin_emails || '';
    allowed = (emails || []).map(r => r.email);
    drawAllowed();
    const tb = $('users-table').querySelector('tbody'); tb.innerHTML = '';
    (users || []).forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(u.email)}</td><td>${u.given_name ? esc(u.given_name) : '-'}</td><td>${day(u.created_at)}</td><td>${day(u.last_sign_in_at)}</td><td>${u.attempts}</td><td>${rosterN ? (u.roster_name ? esc(u.roster_name) + (u.matched_by === 'name' ? ' <span class="muted small">(by name)</span>' : '') : '<b style="color:#c0392b">Not on list</b>') : '-'}</td><td class="lv-cell"></td><td></td>`;
      tr.querySelector('.lv-cell').appendChild(accessPicker(u));
      const b = document.createElement('button'); b.className = 'link'; b.textContent = 'Remove';
      b.onclick = async () => {
        if (u.email.toLowerCase() === state.user.email.toLowerCase()) return;
        b.disabled = true; b.textContent = 'Removing…';
        const { error } = await sb.rpc('admin_remove_user', { target: u.email });
        if (error) { b.textContent = error.message; return; }
        renderAdmin();
      };
      tr.lastElementChild.appendChild(b); tb.appendChild(tr);
    });
    $('users-count').textContent = `· ${(users || []).length}`;
  }
  function day(ts) { return ts ? new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'; }
  function drawAllowed() {
    const f = $('allowed-filter').value.trim().toLowerCase();
    const ul = $('allowed-list'); ul.innerHTML = '';
    allowed.filter(e => e.includes(f)).forEach(e => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${esc(e)}</span>`;
      const b = document.createElement('button'); b.className = 'link'; b.textContent = 'Remove';
      b.onclick = async () => {
        const { error } = await sb.from('allowed_emails').delete().eq('email', e);
        if (!error) { allowed = allowed.filter(x => x !== e); drawAllowed(); }
      };
      li.appendChild(b); ul.appendChild(li);
    });
    $('allowed-count').textContent = `· ${allowed.length}`;
  }
  $('allowed-filter').oninput = drawAllowed;
  $('allowed-add-btn').onclick = async () => {
    const found = [...new Set(($('allowed-add').value.match(EMAIL_RE) || []).map(e => e.toLowerCase()))];
    const fresh = found.filter(e => !allowed.includes(e));
    if (!fresh.length) { $('allowed-msg').textContent = found.length ? 'Already on the list.' : 'No emails found.'; return; }
    const { error } = await sb.from('allowed_emails').upsert(fresh.map(email => ({ email })), { onConflict: 'email' });
    if (error) { $('allowed-msg').textContent = error.message; return; }
    allowed = [...allowed, ...fresh].sort();
    $('allowed-add').value = '';
    $('allowed-msg').textContent = `Added ${fresh.length}.`;
    drawAllowed();
  };
  document.querySelectorAll('#admin-mode button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#admin-mode button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  });
  $('admin-save').onclick = async () => {
    const mode = document.querySelector('#admin-mode button.on')?.dataset.v || 'domain';
    const rows = [
      { key: 'signup_mode', value: mode },
      { key: 'invite_code', value: $('admin-code').value.trim() },
      { key: 'admin_emails', value: $('admin-admins').value.trim() },
    ];
    const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
    $('admin-saved').textContent = error ? error.message : 'Saved.';
  };

  $('roster-add-btn').onclick = async () => {
    const names = [...new Set($('roster-add').value.split(/\n/).map(x => x.replace(/[^A-Za-z' -]/g, ' ').trim().replace(/\s+/g, ' ')).filter(x => x.split(' ').length >= 2))];
    if (!names.length) { $('roster-msg').textContent = 'Need full names, one per line.'; return; }
    const { error } = await sb.from('roster').upsert(names.map(name => ({ name })), { onConflict: 'name' });
    $('roster-msg').textContent = error ? error.message : `Added ${names.length}.`;
    if (!error) { $('roster-add').value = ''; renderAdmin(); }
  };
  $('roster-clear').onclick = async () => {
    if (!confirm('Remove every name from the class names list?')) return;
    const { error } = await sb.from('roster').delete().neq('name', '');
    $('roster-msg').textContent = error ? error.message : 'Cleared.';
    renderAdmin();
  };
  async function renderAutomarkAdmin(_, settings) {
    const s = Object.fromEntries((settings || []).map(r => [r.key, r.value]));
    $('am-cap').value = s.automark_monthly_cap_usd ?? 20;
    $('am-daily').value = s.automark_daily_calls ?? 16;
    $('am-user').value = s.automark_user_monthly_usd ?? 2;
    $('am-on').checked = (s.automark_enabled ?? 'on') !== 'off';
    const { data, error } = await sb.rpc('automark_spend');
    const r = data && data[0];
    $('am-spend').textContent = error ? error.message
      : `This month: US$${Number(r?.month_usd || 0).toFixed(2)} across ${r?.month_runs || 0} marking requests (about 4 per paper). All time: US$${Number(r?.all_usd || 0).toFixed(2)}.`;
    amEstimate();
  }
  const PER_PAPER = 0.45;   // measured: a full Ext 1 paper costs about US$0.44 to mark
  function amEstimate() {
    const papers = (v) => Math.floor((Number(v) || 0) / PER_PAPER);
    $('am-est').textContent = `At about US$${PER_PAPER.toFixed(2)} a paper: each student can mark roughly ${papers($('am-user').value)} papers a month, and everyone together roughly ${papers($('am-cap').value)}.`;
  }
  ['am-user', 'am-cap'].forEach(id => $(id).addEventListener('input', amEstimate));
  $('am-save').onclick = async () => {
    const rows = [
      { key: 'automark_monthly_cap_usd', value: String(Math.max(0, Number($('am-cap').value) || 0)) },
      { key: 'automark_daily_calls', value: String(Math.max(0, Math.round(Number($('am-daily').value) || 0))) },
      { key: 'automark_user_monthly_usd', value: String(Math.max(0, Number($('am-user').value) || 0)) },
      { key: 'automark_enabled', value: $('am-on').checked ? 'on' : 'off' },
    ];
    const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
    $('am-msg').textContent = error ? error.message : 'Saved.';
  };
  $('alert-test').onclick = async () => {
    const { error } = await sb.rpc('admin_test_alert');
    $('alert-msg').textContent = error ? error.message : 'Sent. Check your phone.';
  };

  // ======================================================================
  // v2: papers library, exam mode, review tools
  // ======================================================================
  const qLabel = (q) => label(q);
  const diffOf = (p) => (['Easier', 'Medium', 'Hard'].includes(p.difficulty) ? p.difficulty : null);
  // four-step difficulty for display: James Ruse sits above the other hard papers
  const LEVELS = { easy: [1, 'Easy'], medium: [2, 'Medium'], hard: [3, 'Hard'], impossible: [4, 'Impossible'], hsc: [0, 'HSC'] };
  const isHsc = (p) => p.difficulty === 'HSC';
  function levelOf(p) {
    if (isHsc(p)) return 'hsc';
    if (p.difficulty === 'Easier') return 'easy';
    if (p.difficulty === 'Hard') return /james ruse/i.test(p.school || '') ? 'impossible' : 'hard';
    return 'medium';
  }
  function levelBadge(p, withText = true) {
    const k = levelOf(p), [n, label] = LEVELS[k];
    if (k === 'hsc') return `<span class="lvl lvl-hsc" title="Official HSC exam"><b>HSC</b></span>`;
    const bars = [1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('');
    return `<span class="lvl lvl-${k}" title="${label}"><span class="bars" aria-hidden="true">${bars}</span>${withText ? `<b>${label}</b>` : `<span class="sr">${label}</span>`}</span>`;
  }

  // ---------- image trimming and PDF export ----------
  // Question crops come with blank bands above and below. Trim them in the browser (top and bottom only,
  // so every question keeps the same scale). Needs CORS on the storage URL; if the canvas is blocked the
  // original image is simply left alone.
  function trimCanvas(im) {
    const w = im.naturalWidth, h = im.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    const inked = (y) => { const row = y * w * 4; for (let x = 0; x < w; x++) { const i = row + x * 4; if (d[i] + d[i + 1] + d[i + 2] < 690) return true; } return false; };
    let y0 = 0, y1 = h - 1;
    while (y0 < h && !inked(y0)) y0++;
    if (y0 >= h) return cv;                       // blank image: leave it
    while (y1 > y0 && !inked(y1)) y1--;
    y0 = Math.max(0, y0 - 12); y1 = Math.min(h - 1, y1 + 12);
    const out = document.createElement('canvas'); out.width = w; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(cv, 0, y0, w, out.height, 0, 0, w, out.height);
    return out;
  }
  function trimImg(im) {
    if (im.dataset.trimmed) return;
    im.dataset.trimmed = '1';
    try {
      const cv = trimCanvas(im);
      if (cv.height >= im.naturalHeight - 6) return;
      cv.toBlob(b => { if (b) im.src = URL.createObjectURL(b); }, 'image/png');
    } catch (e) { /* tainted canvas or decode problem: keep the original */ }
  }
  function qImg(url, alt) {
    const im = mk('img'); im.alt = alt; im.crossOrigin = 'anonymous';
    im.onload = () => trimImg(im); im.src = url; return im;
  }
  async function loadTrimmed(url) {
    const im = new Image(); im.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { im.onload = res; im.onerror = () => rej(new Error('Could not load an image for the PDF.')); im.src = url; });
    return trimCanvas(im);
  }
  async function pool(items, n, fn) {
    const out = new Array(items.length); let i = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
    return out;
  }
  let pdfLibP = null;
  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    return pdfLibP = pdfLibP || new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
      s.onload = () => res(window.PDFLib); s.onerror = () => { pdfLibP = null; rej(new Error('Could not load the PDF tool.')); };
      document.head.appendChild(s);
    });
  }
  // HSC-style answer stationery appended to the official paper.
  // Extension 1: an 8-page writing booklet for each of Questions 11-14. Physics: extra writing pages.
  const BOOKLET_COUNT = 4;          // blank booklets added to any paper
  const BOOKLETS = { ask: 'Want writing booklets with this exam?', sub: `Adds ${BOOKLET_COUNT} blank HSC-style writing booklets to the end of the PDF. Write the question number on each one.`, file: '-with-writing-booklets' };
  async function examWithBooklets(p, btn, errEl) {
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing…'; if (errEl) errEl.hidden = true;
    try {
      const [L, url] = await Promise.all([loadPdfLib(), pdfLink(p.pdf_path, 300)]);
      const doc = await L.PDFDocument.load(await (await fetch(url)).arrayBuffer());
      // laid out like NESA's current (2025) HSC writing booklet, with plenty of room
      const LAST = 16;                                             // pages per booklet
      const hv = await doc.embedFont(L.StandardFonts.Helvetica), hb = await doc.embedFont(L.StandardFonts.HelveticaBold);
      const tm = await doc.embedFont(L.StandardFonts.TimesRoman), tb = await doc.embedFont(L.StandardFonts.TimesRomanBold);
      const W = 595.28, H = 841.89, K = L.rgb(0, 0, 0), G = L.rgb(0.45, 0.45, 0.45), RULE = L.rgb(0.55, 0.55, 0.55), STRIP = L.rgb(0.84, 0.84, 0.85);
      const course = C.subjects[p.subject] || p.subject;
      const t = (pg, s, x, y, size, font = hv, color = K, rotate) => pg.drawText(s, { x, y, size, font, color, ...(rotate != null ? { rotate: L.degrees(rotate) } : {}) });
      const tr = (pg, s, xr, y, size, font = hv) => t(pg, s, xr - font.widthOfTextAtSize(s, size), y, size, font);
      const tc = (pg, s, xc, y, size, font = hv) => t(pg, s, xc - font.widthOfTextAtSize(s, size) / 2, y, size, font);
      const box = (pg, x, y, w, h, bw = 0.8) => pg.drawRectangle({ x, y, width: w, height: h, borderColor: K, borderWidth: bw });
      const line = (pg, x1, y1, x2, y2, th = 0.8, color = K, dash) => pg.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th, color, ...(dash ? { dashArray: dash } : {}) });
      const BL = 42, BR = W - 42;                                   // frame edges
      const corners = (pg, top, bot) => {                           // registration marks
        for (const [x, dx] of [[BL, 1], [BR, -1]]) {
          line(pg, x, top, x + 17 * dx, top, 2); line(pg, x, top, x, top - 17, 2);
          line(pg, x, bot, x + 17 * dx, bot, 2); line(pg, x, bot, x, bot + 17, 2);
        }
      };
      const strip = (pg, left) => {                                // the tear-off binding strip
        const x0 = left ? 0 : W - 31, xe = left ? 31 : W - 31;
        pg.drawRectangle({ x: x0, y: 0, width: 31, height: H, color: STRIP });
        line(pg, xe, 0, xe, H, 0.7, G, [3, 3]);
        const sy = H * 0.62;                                        // little scissors on the cut line
        pg.drawCircle({ x: xe - 3, y: sy - 5, size: 2.2, borderColor: K, borderWidth: 0.7 }); pg.drawCircle({ x: xe + 3, y: sy - 5, size: 2.2, borderColor: K, borderWidth: 0.7 });
        line(pg, xe - 2, sy - 3, xe + 3, sy + 7, 0.7); line(pg, xe + 2, sy - 3, xe - 3, sy + 7, 0.7);
        const msg = 'Do NOT write in this area.', size = 11;
        if (left) t(pg, msg, 21, H * 0.18, size, hb, G, 90); else t(pg, msg, W - 21, H * 0.82, size, hb, G, -90);
      };
      const office = (pg, y) => { tc(pg, 'Office Use Only – Do NOT write anything, or make any marks below this line.', W / 2, y, 8); };
      const heading = isHsc(p) ? 'HIGHER SCHOOL CERTIFICATE EXAMINATION' : 'TRIAL HIGHER SCHOOL CERTIFICATE EXAMINATION';
      function cover(q) {
        const c = doc.addPage([W, H]); strip(c, true);
        corners(c, H - 52, 48);
        for (let i = 0; i < 5; i++) box(c, BR - 16 - (5 - i) * 20, H - 104, 20, 26);
        tr(c, 'Centre Number', BR - 16, H - 118, 10);
        for (let i = 0; i < 8; i++) box(c, BR - 16 - (8 - i) * 20, H - 162, 20, 26);
        tr(c, 'Student Number', BR - 16, H - 176, 10);
        t(c, 'Name', 300, H - 214, 10, hv, G); line(c, 332, H - 216, BR - 16, H - 216, 0.6, G);
        box(c, 70, H - 294, 44, 17, 0.9); tc(c, String(p.year), 92, H - 289, 10, hb);
        t(c, heading, 120, H - 289, 10, hb);
        if (!isHsc(p)) t(c, p.school, 70, H - 312, 11, hv, G);
        t(c, course, 70, H - 352, 30);
        t(c, 'Writing Booklet', 70, H - 404, 24);
        line(c, 70, H - 512, 155, H - 512, 0.8, G);
        t(c, 'Instructions', 70, H - 527, 11, hb);
        const ins = (y, lines) => { t(c, '•', 162, y, 11); lines.forEach((s, i) => t(c, s, 172, y - i * 15, 11)); };
        ins(H - 527, ['Write the number of the question you are answering on page 2']);
        ins(H - 552, ['Use a new booklet for each question']);
        ins(H - 577, ['Write the number of this booklet and the', 'total number of booklets that you have', 'used for this question (eg: 1 of 3)']);
        const ay = H - 592;                                         // arrow and booklet boxes
        box(c, 382, ay - 3, 22, 6, 0.8); line(c, 404, ay + 6, 412, ay); line(c, 404, ay - 6, 412, ay); line(c, 404, ay + 6, 404, ay - 6);
        box(c, 420, ay - 14, 36, 28); t(c, 'of', 462, ay - 4, 11); box(c, 478, ay - 14, 36, 28);
        tc(c, 'this', 438, ay - 26, 8); tc(c, 'booklet', 438, ay - 35, 8); tc(c, 'number of', 496, ay - 26, 8); tc(c, 'booklets for', 496, ay - 35, 8); tc(c, 'this question', 496, ay - 44, 8);
        line(c, BL, 92, BR, 92, 0.8); office(c, 80);
        t(c, 'Practice copy made by Trialbank, laid out like the HSC writing booklet. Not official NESA stationery.', 70, 58, 7, hv, G);
      }
      function inner(n, q) {
        const pg = doc.addPage([W, H]); strip(pg, n % 2 === 1);
        corners(pg, H - 52, 48);
        let top = H - 70;
        if (n === 2) {
          t(pg, 'Write the number of the question you are answering.', BL + 8, H - 82, 13, tb);
          const digits = [' ', ' '];
          digits.forEach((d, i) => { box(pg, BR - 66 + i * 22, H - 100, 22, 28); if (d.trim()) tc(pg, d, BR - 55 + i * 22, H - 92, 18, tm); });
          tr(pg, 'Question Number', BR - 22, H - 114, 10, tm);
          top = H - 130;
        }
        const bot = 74;
        box(pg, BL, bot, BR - BL, top - bot, 0.8);
        for (let y = top - 28; y > bot + 16; y -= 28) line(pg, BL + 2, y, BR - 2, y, 0.5, RULE);
        tc(pg, `– ${n} –`, W / 2, bot + 5, 10, tm);
        office(pg, 62);
      }
      for (let b = 0; b < BOOKLET_COUNT; b++) { cover(null); for (let n = 2; n <= LAST; n++) inner(n, null); }
      const blob = new Blob([await doc.save()], { type: 'application/pdf' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = paperFile(p).replace('.pdf', BOOKLETS.file + '.pdf');
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    } catch (err) { if (errEl) { errEl.textContent = err.message || String(err); errEl.hidden = false; } }
    finally { btn.textContent = old; btn.disabled = false; }
  }
  async function loadJsPdf() {
    if (window.jspdf) return window.jspdf.jsPDF;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = () => rej(new Error('Could not load the PDF tool.'));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }
  async function makePdf({ title, sub, filename, qs, withSolutions, onProgress, lines }) {
    const JsPDF = await loadJsPdf();
    const pdf = new JsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 15, CW = W - 2 * M, DPI = 150;
    const sols = withSolutions ? qs.filter(q => q.solutionUrl) : [];
    let done = 0; const total = qs.length + sols.length;
    const tick_ = () => onProgress && onProgress(++done, total);
    const qc = await pool(qs, 6, async q => { const c = await loadTrimmed(q.imageUrl); tick_(); return c; });
    const sc = await pool(sols, 6, async q => { const c = await loadTrimmed(q.solutionUrl); tick_(); return c; });
    let y = M;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.text(title, M, y + 6); y += 12;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(100); pdf.text(sub, M, y); y += 8; pdf.setTextColor(0);
    const put = (cv, reserve = 0) => {
      let w = Math.min(CW, cv.width * 25.4 / DPI), h = w * cv.height / cv.width;
      const maxH = H - 2 * M - 8;
      if (h > maxH) { h = maxH; w = h * cv.width / cv.height; }
      if (y + h + reserve > H - M - 6) { pdf.addPage(); y = M; }   // keep a question with the start of its writing lines
      pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', M, y, w, h);
      y += h + 5;
    };
    // writing lines under each written question: more marks, more room (none under multiple choice)
    const rule = (q) => {
      if (!lines || q.type === 'mcq') return;
      let n = Math.min(22, 4 + 3 * (q.marks || 1)), gap = 8;
      pdf.setDrawColor(190); pdf.setLineWidth(0.2);
      while (n > 0) {
        if (y + gap > H - M - 6) { pdf.addPage(); y = M; }
        y += gap; pdf.line(M, y, W - M, y); n--;
      }
      y += 7;
    };
    qc.forEach((cv, i) => { put(cv, lines && qs[i].type !== 'mcq' ? 32 : 0); rule(qs[i]); });
    if (sols.length) {
      pdf.addPage(); y = M;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.text('Solutions', M, y + 5); y += 12;
      sc.forEach((cv, i) => {
        if (y + 14 > H - M) { pdf.addPage(); y = M; }
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(qLabel(sols[i]), M, y + 3); y += 6;
        put(cv);
      });
    }
    const n = pdf.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      pdf.setPage(p); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(130);
      pdf.text(`Trialbank  ·  for personal study  ·  page ${p} of ${n}`, W / 2, H - 7, { align: 'center' });
    }
    pdf.save(filename);
  }
  // ---------- custom practice paper: questions weighted towards weak topics, sized to the time ----------
  const CP_FREE_KEY = () => `tb_cp_free_${state.user?.id}`;
  const cpOpt = { mins: 40, focus: 'weak' };
  async function buildCustomPaper() {
    const subj = state.subject, mins = cpOpt.mins;
    const target = Math.max(8, Math.round(mins * 100 / 180));   // HSC pace: about 100 marks in 3 hours
    const [{ data: pool_, error }, { data: stats }] = await Promise.all([
      sb.rpc('paper_pool', { subj }),
      sb.from('my_topic_stats').select('topic, attempts, score, out_of').eq('subject', subj),
    ]);
    if (error) throw error;
    const skip = skipped(subj);
    await loadStepBlock(subj); const blk = blockedQs();
    let qs = (pool_ || []).filter(q => q.topic && !skip.has(q.topic) && !blk.has(q.id));
    if (cpOpt.focus === 'picked') {
      if (!state.topics.size) throw new Error('Pick some topics above first, or choose another focus.');
      qs = qs.filter(q => state.topics.has(q.topic));
    }
    if (qs.length < 5) throw new Error('Not enough questions for that yet. Try a different focus.');
    const st = Object.fromEntries((stats || []).map(r => [r.topic, r]));
    const weight = (t) => {
      if (cpOpt.focus === 'mixed') return 1;
      const r = st[t]; if (!r || !r.out_of) return 1.4;   // not tried yet: worth a look
      return 1 + 3 * Math.max(0, 1 - r.score / r.out_of);   // the weaker the topic, the more it shows up
    };
    const pick = (list, need, sizeOf) => {
      const out = [], left = [...list]; let got = 0;
      while (got < need && left.length) {
        const ws = left.map(q => weight(q.topic) * (q.marks > 5 ? 0.3 : 1)), tot = ws.reduce((a, b) => a + b, 0);
        let r = Math.random() * tot, i = 0; while (r > ws[i]) r -= ws[i++];
        const q = left.splice(Math.min(i, left.length - 1), 1)[0];
        if (got + sizeOf(q) > need + 2) continue;
        out.push(q); got += sizeOf(q);
      }
      return out;
    };
    const mcqMarks = Math.round(target * 0.15);
    const mc = pick(qs.filter(q => q.type === 'mcq'), mcqMarks, () => 1);
    const sh = pick(qs.filter(q => q.type !== 'mcq' && (q.marks || 0) > 0), target - mc.length, q => q.marks || 1)
      .sort((a, b) => (a.level ?? 2) - (b.level ?? 2));
    const ids = [...mc, ...sh].map(q => q.id);
    const { data: rows, error: e2 } = await sb.from('questions').select(QCOLS).in('id', ids);
    if (e2) throw e2;
    const by = new Map((rows || []).map(r => [r.id, r]));
    const full = ids.map(id => by.get(id)).filter(q => q && q.image_path);
    await attachUrls(full);
    return { qs: full, marks: full.reduce((a, q) => a + (q.type === 'mcq' ? 1 : q.marks || 0), 0), mins };
  }
  const cpWeekly = () => tuAllowed() ? (state.pro?.mini && !adminOn() ? 3 : Infinity) : 1;   // Pro unlimited, Pro Mini 3 a week, free 1
  const cpUsed = () => { const v = lsGet(CP_FREE_KEY()); return (Array.isArray(v) ? v : v ? [v] : []).filter(t => Date.now() - t < 7 * 864e5); };
  function cpAllowed() { return cpUsed().length < cpWeekly(); }
  function drawCpCard() {
    if (!$('cp-card')) return;
    const cap = cpWeekly(), left = cap - cpUsed().length;
    $('cp-pro').hidden = cap === Infinity;
    $('cp-sub').hidden = cap === Infinity;
    $('cp-sub').textContent = cap === Infinity ? ''
      : left > 0 ? `${left} of ${cap} paper${cap === 1 ? '' : 's'} left this week.`
      : `You've used this week's ${cap === 1 ? 'free paper' : `${cap} papers`}. Pro makes as many as you like.`;
  }
  document.querySelectorAll('[data-cp]').forEach(seg => seg.onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    cpOpt[seg.dataset.cp] = seg.dataset.cp === 'mins' ? +b.dataset.v : b.dataset.v;
  });
  async function cpRun(mode) {
    if (!cpAllowed()) return proOpen() ? openPro('paper') : toast("You've used this week's papers.");
    const btn = $(mode === 'pdf' ? 'cp-pdf' : 'cp-now'), say = (t) => { $('cp-status').textContent = t; };
    btn.disabled = true; say('Picking questions…');
    try {
      const p = await buildCustomPaper();
      if (cpWeekly() !== Infinity) lsSet(CP_FREE_KEY(), [...cpUsed(), Date.now()]);
      const name = C.subjects[state.subject] || state.subject;
      if (mode === 'pdf') {
        await makePdf({ title: `${name} practice paper`, sub: `${p.mins} minutes · ${p.marks} marks · ${cpOpt.focus === 'weak' ? 'built around your weak spots' : cpOpt.focus === 'picked' ? 'your picked topics' : 'mixed topics'} · made ${new Date().toLocaleDateString('en-AU')}`,
          filename: `Trialbank ${name} practice paper.pdf`, qs: p.qs, withSolutions: true, lines: true, onProgress: (d, t) => say(`Building PDF ${d}/${t}`) });
        say(`${p.qs.length} questions, ${p.marks} marks.`);
      } else { say(''); await startSet(p.qs); }
    } catch (err) { say(err.message || String(err)); }
    finally { btn.disabled = false; drawCpCard(); }
  }
  $('cp-pdf').onclick = () => cpRun('pdf');
  $('cp-now').onclick = () => cpRun('now');
  async function pdfAction(btn, opts, errEl) {
    const old = btn.textContent; btn.disabled = true;
    if (errEl) errEl.hidden = true;
    try { await makePdf({ ...opts, onProgress: (d, t) => { btn.textContent = `Building PDF ${d}/${t}`; } }); }
    catch (err) { if (errEl) { errEl.textContent = err.message; errEl.hidden = false; } }
    finally { btn.textContent = old; btn.disabled = false; }
  }
  // a short-lived link to a paper PDF: from Backblaze B2 once config.pdfStore = 'b2', otherwise Supabase storage
  async function pdfLink(path, secs = 300, filename) {
    if (C.pdfStore === 'b2') {
      const { data, error } = await sb.functions.invoke('pdf-url', { body: { path, secs, filename } });
      if (error || !data?.url) {
        let msg = data?.error;
        try { msg = msg || (await error.context.json()).error; } catch { /* no body */ }
        throw new Error(msg || 'Could not get the PDF. Try again in a moment.');
      }
      return data.url;
    }
    const { data, error } = await sb.storage.from('questions').createSignedUrl(path, secs, filename ? { download: filename } : undefined);
    if (error) throw error;
    return data.signedUrl;
  }
  // original PDF from the private bucket; falls back to a rebuilt PDF if the file isn't uploaded
  async function officialPdf(btn, p, key, opts, errEl) {
    const path = p && p[key];
    if (!path) return pdfAction(btn, opts, errEl);
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing…';
    if (errEl) errEl.hidden = true;
    try {
      const url = await pdfLink(path, 300, opts.filename);
      const a = document.createElement('a'); a.href = url; a.download = opts.filename; document.body.appendChild(a); a.click(); a.remove();
    } catch (err) { if (errEl) { errEl.textContent = err.message; errEl.hidden = false; } }
    finally { setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 800); }
  }
  const paperFile = (p) => `${p.school}-${p.year}-${p.subject}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf';
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const examDefaults = (subj) => Object.assign({ reading: 5, working: 120 }, (C.exam || {})[subj] || {});
  const byOrder = (a, b) => a.number - b.number || String(a.part || '').localeCompare(String(b.part || ''));
  const marksText = (n) => `${n || '?'} mark${n === 1 ? '' : 's'}`;
  function fmtClock(s) {
    s = Math.max(0, Math.ceil(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
  }

  // ---------- stars ----------
  async function loadStars() {
    if (state.stars) return state.stars;
    const { data } = await sb.from('bookmarks').select('question_id');
    state.stars = new Set((data || []).map(r => r.question_id));
    return state.stars;
  }
  async function toggleStar(id, btn) {
    const stars = await loadStars();
    if (stars.has(id)) {
      stars.delete(id);
      await sb.from('bookmarks').delete().eq('question_id', id).eq('user_id', state.user.id);
    } else {
      stars.add(id);
      await sb.from('bookmarks').insert({ user_id: state.user.id, question_id: id });
    }
    if (btn.classList.contains('sb-btn')) starLabel(btn, stars.has(id)); else btn.textContent = stars.has(id) ? '★ Starred' : '☆ Star';
  }
  const SB_FLAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
  function starLabel(b, on) {   // the question bar's star: icon, plus the word on wider screens
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg><span class="sb-l">${on ? 'Starred' : 'Star'}</span>`;
    b.classList.toggle('lit', on); b.setAttribute('aria-pressed', on);
  }
  function starButton(q) {
    const b = mk('button', 'link', '☆ Star');
    loadStars().then(s => { b.textContent = s.has(q.id) ? '★ Starred' : '☆ Star'; });
    b.onclick = () => toggleStar(q.id, b);
    return b;
  }

  // ---------- papers library ----------
  let papersData = { papers: [], sum: {}, best: {} };
  async function renderPapers() {
    $('papers-list').innerHTML = '<p class="muted">Loading…</p>';
    const [{ data: papers }, { data: sums }, { data: exams }] = await Promise.all([
      sb.from('papers').select('id, slug, subject, school, year, difficulty, scanned, release_pct').eq('subject', state.subject),
      sb.from('paper_summary').select('*'),
      sb.from('exams').select('paper_id, score, out_of'),
    ]);
    if (papers) papers.splice(0, papers.length, ...papers.filter(seePaper));
    const best = {};
    (exams || []).forEach(e => { if (e.out_of) best[e.paper_id] = Math.max(best[e.paper_id] || 0, Math.round(100 * e.score / e.out_of)); });
    const thumbs = await thumbUrls((papers || []).map(p => `${p.slug}/thumb.webp`)).catch(() => ({}));
    papersData = { papers: papers || [], sum: Object.fromEntries((sums || []).map(s => [s.paper_id, s])), best, thumbs };
    drawPapers();
  }
  // Paper covers: signed links last a week and are remembered on the device, so the browser can reuse the
  // pictures it already downloaded instead of fetching all of them again on every visit.
  async function thumbUrls(paths) {
    const KEY = 'tb_thumbs', now = Date.now();
    let cache = {}; try { cache = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* blocked */ }
    const fresh = (c) => c && c.exp > now + 864e5;              // at least a day left on the link
    const need = paths.filter(p => !fresh(cache[p]));
    if (need.length) {
      const got = await signed(need, 7 * 86400);                // seconds
      need.forEach(p => { if (got[p]) cache[p] = { url: got[p], exp: now + 7 * 864e5 }; });
      try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* full or blocked */ }
    }
    return Object.fromEntries(paths.filter(p => cache[p]).map(p => [p, cache[p].url]));
  }
  let paperLevel = 'all';            // the level chip that's on: all, a LEVELS key, or 'todo' (not done yet)
  function drawLevelChips(papers, best) {
    const el = $('papers-levels'); el.innerHTML = '';
    const count = (k) => papers.filter(p => k === 'all' || (k === 'todo' ? best[p.id] == null : levelOf(p) === k)).length;
    const keys = ['all', 'hsc', 'easy', 'medium', 'hard', 'impossible', 'todo'].filter(k => k === 'all' || count(k));
    if (!keys.includes(paperLevel)) paperLevel = 'all';
    keys.forEach(k => {
      const b = mk('button', 'chip' + (k === paperLevel ? ' on' : ''),
        `${k === 'all' ? 'All' : k === 'todo' ? 'Not done yet' : LEVELS[k][1]}<span class="n">${count(k)}</span>`);
      b.setAttribute('aria-pressed', k === paperLevel);
      b.onclick = () => { paperLevel = k; drawPapers(); };
      el.appendChild(b);
    });
  }
  function drawPapers() {
    const { papers, sum, best } = papersData;
    const q = $('papers-filter').value.trim().toLowerCase();
    drawLevelChips(papers, best);
    const bySchool = {};
    papers.filter(p => !q || p.school.toLowerCase().includes(q) || String(p.year).includes(q))
      .filter(p => paperLevel === 'all' || (paperLevel === 'todo' ? best[p.id] == null : levelOf(p) === paperLevel))
      .forEach(p => (bySchool[p.school] = bySchool[p.school] || []).push(p));
    const rank = (sch) => (sch === 'HSC' ? 0 : /smiths/i.test(sch) ? 1 : 2);
    const schools = Object.keys(bySchool).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const nH = papers.filter(isHsc).length;
    $('papers-count').textContent = `${nH ? nH + ' HSC exams · ' : ''}${papers.length - nH} trial papers from ${new Set(papers.filter(p => !isHsc(p)).map(p => p.school)).size} schools`;
    const wrap = $('papers-list'); wrap.innerHTML = '';
    if (!schools.length) { wrap.innerHTML = '<p class="muted">Nothing matches.</p>'; return; }
    const { thumbs = {} } = papersData;
    schools.forEach(sch => {
      const list = bySchool[sch].sort((a, b) => b.year - a.year);
      const sec = mk('section', 'pschool');
      if (sch === 'HSC') sec.classList.add('hsc');
      sec.appendChild(mk('h2', '', sch === 'HSC' ? `HSC exams ${levelBadge(list[0])}<span class="small muted sec-note">The real thing, from NESA</span>` : `${esc(sch)} ${list[0] ? levelBadge(list[0]) : ''}`));
      const grid = mk('div', 'pgrid');
      list.forEach(p => {
        const s = sum[p.id] || {};
        const a = mk('a', 'ptile');
        a.href = '#paper/' + encodeURIComponent(p.slug);
        a.title = `${p.school} ${p.year}`;
        const url = thumbs[`${p.slug}/thumb.webp`];
        a.innerHTML = `<div class="pthumb${url ? ' loading' : ''}">${url ? `<img loading="lazy" decoding="async" alt="" src="${esc(url)}">` : `<span>${esc(p.school)}<br>${p.year}</span>`}${best[p.id] != null ? `<span class="tag">${best[p.id]}%</span>` : ''}</div>
          <div class="pname"><strong>${esc(p.year)}</strong>${levelBadge(p, false)}</div>`;
        const im = a.querySelector('img');
        if (im) { const done = () => im.parentNode?.classList.remove('loading'); im.onload = done; im.onerror = () => { done(); im.replaceWith(mk('span', '', `${esc(p.school)}<br>${esc(p.year)}`)); }; }
        grid.appendChild(a);
      });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
  }
  $('papers-filter').oninput = drawPapers;

  // ---------- one paper: Paper / Solutions / Practise tabs ----------
  function paperTab(name) {
    document.querySelectorAll('#paper-tabs [data-tab]').forEach(b => { const on = b.dataset.tab === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    ['paper', 'sol', 'practise'].forEach(t => { $('tab-' + t).hidden = t !== name; });
    const cur = state.paperView; if (!cur) return;
    if (name === 'paper') showPdf(cur.p, 'pdf_path', 'pdf-view', 'pdf-pages');
    if (name === 'sol') showPdf(cur.p, 'pdf_sol_path', 'sol-view', 'sol-pages');
  }
  document.querySelectorAll('#paper-tabs [data-tab]').forEach(b => { b.onclick = () => paperTab(b.dataset.tab); });
  // show a PDF one page at a time, sized so the whole page fits on screen; flip with arrows, keys, taps or swipes
  const pdfState = {};                 // viewId -> { doc, i, n, key, cache }
  function fitPdfView(view) {
    const top = view.getBoundingClientRect().top + window.scrollY;
    const flagged = (state.paperView?.qs || []).some(q => q.syllabus_note && (q.pages || []).length);
    const bottomGap = (window.innerWidth <= 640 ? 92 : 20) + (flagged ? 52 : 0);   // room for the phone tab bar and the syllabus note
    view.style.height = Math.max(260, window.innerHeight - top - bottomGap) + 'px';
  }
  async function showPdf(p, key, viewId, countId) {
    const view = $(viewId), id = p.slug + key;
    fitPdfView(view); requestAnimationFrame(() => fitPdfView(view));
    if (view.dataset.for === id) return drawPdfPage(viewId);       // already loaded: just refit
    view.dataset.for = id; pdfState[viewId] = null;
    view.innerHTML = '<p class="muted pdf-wait">Loading the paper…</p>'; $(countId).textContent = '';
    if (!p[key]) { view.innerHTML = `<p class="muted pdf-wait">${key === 'pdf_sol_path' ? 'No solutions PDF for this paper yet.' : 'No PDF for this paper yet. Use the Practise tab.'}</p>`; return; }
    try {
      const [lib, url] = await Promise.all([loadPdfJs(), pdfLink(p[key], 3600)]);
      // one plain download (B2 links don't take the partial requests pdf.js would otherwise make)
      const doc = await lib.getDocument({ url, disableRange: true, disableStream: true, isEvalSupported: false }).promise;
      if (view.dataset.for !== id) return;
      pdfState[viewId] = { doc, i: 1, n: doc.numPages, countId, cache: new Map() };
      view.innerHTML = '<div class="pdfstage"><button class="pdfhit prev" data-go="-1" aria-label="Previous page"></button><button class="pdfhit next" data-go="1" aria-label="Next page"></button></div>';
      view.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => flipPdf(viewId, +b.dataset.go); });
      view.closest('.tabpane').querySelectorAll('.pdfnav [data-go]').forEach(b => { b.onclick = () => flipPdf(viewId, +b.dataset.go); });
      // swipe on phones
      let sx = null;
      view.ontouchstart = (e) => { sx = e.touches[0].clientX; };
      view.ontouchend = (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) flipPdf(viewId, dx < 0 ? 1 : -1); };
      await drawPdfPage(viewId);
    } catch (err) { view.innerHTML = `<p class="error">Couldn't show the PDF: ${esc(err.message || err)}</p>`; view.dataset.for = ''; }
  }
  async function renderPdfCanvas(st, k, w, h) {
    const ck = `${k}@${w}x${h}`;
    if (st.cache.has(ck)) return st.cache.get(ck);
    const job = (async () => {
      const page = await st.doc.getPage(k), v0 = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2), fit = Math.min(w / v0.width, h / v0.height);
      const vp = page.getViewport({ scale: fit * dpr });
      const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      cv.style.width = Math.round(v0.width * fit) + 'px'; cv.style.height = Math.round(v0.height * fit) + 'px';
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      return cv;
    })();
    st.cache.set(ck, job);
    return job;
  }
  async function drawPdfPage(viewId, dir = 0) {
    const st = pdfState[viewId]; if (!st) return;
    const view = $(viewId), stage = view.querySelector('.pdfstage'); if (!stage) return;
    const w = stage.clientWidth - 4, h = stage.clientHeight - 4, k = st.i;
    $(st.countId).textContent = `${k} / ${st.n}`;
    const pane = view.closest('.tabpane');
    pane.querySelector('.pdfnav [data-go="-1"]').disabled = k <= 1;
    pane.querySelector('.pdfnav [data-go="1"]').disabled = k >= st.n;
    const note = pane.querySelector('.pdf-syl');
    if (note) {                       // questions on this page that are most likely outside the 2024 syllabus
      const here = (state.paperView?.qs || []).filter(q => q.syllabus_note && (q.pages || []).includes(k));
      note.hidden = !here.length;
      if (here.length) {
        const names = here.map(qLabel);
        const list = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
        note.innerHTML = `<span class="syl-flag">Syllabus</span> ${esc(list)} ${here.length === 1 ? 'is' : 'are'} most likely not in syllabus. <span class="muted">${esc([...new Set(here.map(q => q.syllabus_note))].join(' '))}</span>`;
      }
    }
    const cv = await renderPdfCanvas(st, k, w, h);
    if (st.i !== k) return;                                      // flipped again while drawing
    stage.querySelectorAll('canvas').forEach(c => c.remove());
    cv.className = dir > 0 ? 'in-next' : dir < 0 ? 'in-prev' : '';
    stage.appendChild(cv);
    [k + 1, k - 1, k + 2].filter(j => j >= 1 && j <= st.n).forEach(j => renderPdfCanvas(st, j, w, h));   // get the neighbours ready
  }
  function flipPdf(viewId, d) {
    const st = pdfState[viewId]; if (!st) return;
    const k = Math.min(st.n, Math.max(1, st.i + d)); if (k === st.i) return;
    st.i = k; drawPdfPage(viewId, d);
  }
  document.addEventListener('keydown', (e) => {
    if ($('view-paper').hidden || /input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
    const viewId = !$('tab-paper').hidden ? 'pdf-view' : !$('tab-sol').hidden ? 'sol-view' : null;
    if (!viewId) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { flipPdf(viewId, 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { flipPdf(viewId, -1); e.preventDefault(); }
  });
  let pdfResizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(pdfResizeT);
    pdfResizeT = setTimeout(() => ['pdf-view', 'sol-view'].forEach(id => { const v = $(id); if (!v.closest('.tabpane').hidden && !$('view-paper').hidden) { fitPdfView(v); drawPdfPage(id); } }), 150);
  });
  async function renderPaper(slug) {
    const box = $('paper-body'); box.innerHTML = '<p class="muted">Loading…</p>';
    $('paper-title').textContent = ''; $('paper-error').hidden = true;
    ['pdf-view', 'sol-view'].forEach(id => { $(id).dataset.for = ''; $(id).innerHTML = ''; });
    const { data: ps } = await sb.from('papers').select('*').eq('slug', slug);
    const p = ps && ps[0];
    if (!p) { box.innerHTML = '<p class="error">Paper not found.</p>'; return; }
    // looking at a paper puts you in its subject, so the header switch and Practise match what's on screen
    if (p.subject !== state.subject && (mySubjects() || Object.keys(C.subjects)).includes(p.subject)) {
      state.subject = p.subject; state.topics.clear();
      try { localStorage.setItem('tb_subject', p.subject); } catch { /* blocked */ }
      drawSubject();
    }
    const { data: qs, error } = await sb.from('questions').select(QCOLS).eq('paper_id', p.id).limit(300);
    if (error) { box.innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
    qs.sort(byOrder);
    const urls = await signed(qs.flatMap(q => [q.image_path, q.solution_path]));
    qs.forEach(q => { q.imageUrl = urls[q.image_path]; q.solutionUrl = q.solution_path ? urls[q.solution_path] : null; });
    const total = qs.reduce((a, q) => a + (q.marks || 0), 0);
    const pdfBase = { title: `${p.school} ${p.year} · ${C.subjects[p.subject] || p.subject}`, sub: `${qs.length} questions${total ? ' · ' + total + ' marks' : ''}`, filename: paperFile(p), qs: qs.filter(q => q.image_path) };
    $('paper-pdf').onclick = async () => {
      // offer HSC-style answer stationery in the same PDF
      const bk = BOOKLETS;
      if (p.pdf_path) {
        const pick = await choiceBox(`${bk.ask}<span class="cb-sub">${bk.sub}</span>`, [['cancel', 'Never mind', 'link'], ['plain', 'Just the exam', 'secondary'], ['both', 'Yes, add them', 'primary']]);
        if (!pick || pick === 'cancel') return;
        if (pick === 'both') return examWithBooklets(p, $('paper-pdf'), $('paper-error'));
      }
      officialPdf($('paper-pdf'), p, 'pdf_path', pdfBase, $('paper-error'));
    };
    $('paper-pdf-sol').onclick = () => officialPdf($('paper-pdf-sol'), p, 'pdf_sol_path', { ...pdfBase, filename: paperFile(p).replace('.pdf', '-solutions.pdf'), withSolutions: true }, $('paper-error'));
    $('paper-title').textContent = isHsc(p) ? `${p.year} HSC exam` : `${p.school} ${p.year}`;
    $('tab-sol-btn').textContent = isHsc(p) ? 'Marking guidelines' : 'Solutions';
    $('paper-pdf-sol').textContent = isHsc(p) ? 'Download marking guidelines' : 'Download with solutions';
    const hasQs = qs.some(q => q.image_path || q.content);
    $('paper-noq').hidden = hasQs; document.querySelector('#tab-practise .paper-actions').hidden = !hasQs;
    state.paperView = { p, qs };
    $('paper-pdf').textContent = p.pdf_path ? 'Download PDF' : 'Download';
    paperTab(p.pdf_path || !qs.length ? 'paper' : 'practise');
    $('paper-meta').innerHTML = levelBadge(p) + ' ' + esc([C.subjects[p.subject] || p.subject, qs.length ? `${qs.length} questions` : null, total ? `${total} marks` : null, p.scanned ? 'scanned paper: whole pages' : null].filter(Boolean).join(' · '));
    $('paper-practise').onclick = async () => {
      const usable = qs.filter(q => q.image_path || q.content);
      if (!usable.length) return;
      await startSet(usable, urls);
    };
    $('paper-exam').onclick = async (ev) => {
      const b = ev.currentTarget; b.disabled = true;
      try { const d = examDefaults(p.subject); state.subject = p.subject; await startExam(p, d.reading, d.working); }
      catch (err) { $('paper-error').textContent = err.message; $('paper-error').hidden = false; }
      finally { b.disabled = false; }
    };
    $('paper-automark').onclick = async (ev) => {
      const b = ev.currentTarget; b.disabled = true;
      try { await startMarking(p); } catch (err) { $('paper-error').textContent = err.message; $('paper-error').hidden = false; }
      finally { b.disabled = false; }
    };
    box.innerHTML = '';
    qs.forEach(q => {
      const c = mk('div', 'card qcard');
      c.innerHTML = `<div class="between"><strong>${qLabel(q)} ${sylFlag(q)}</strong><span class="muted small">${marksText(q.marks)} · ${q.topic ? topicName(q.topic) : 'Untagged'}</span></div>`;
      if (q.image_path) { const im = qImg(urls[q.image_path], qLabel(q)); im.loading = 'lazy'; c.appendChild(im); }
      else if (q.content) c.appendChild(Online.render(q, { disabled: true }));
      else c.appendChild(mk('p', 'muted small', 'No image for this question.'));
      const row = mk('div', 'row');
      row.appendChild(starButton(q));
      if (q.solution_path || q.answer || q.content) {
        const sb_ = mk('button', 'link', 'Show solution'), solBox = mk('div'); solBox.hidden = true;
        if (q.content) solBox.appendChild(Online.solution(q));
        else solBox.innerHTML = (q.answer ? `<p><strong>Answer: ${esc(q.answer)}</strong></p>` : '') + (q.solution_path ? `<div class="card scroll"><img loading="lazy" src="${esc(urls[q.solution_path] || '')}" alt="Solution"></div>` : '');
        sb_.onclick = () => { solBox.hidden = !solBox.hidden; sb_.textContent = solBox.hidden ? 'Show solution' : 'Hide solution'; };
        row.appendChild(sb_); c.appendChild(row); c.appendChild(solBox);
      } else c.appendChild(row);
      box.appendChild(c);
    });
  }

  // ---------- home dashboard ----------
  async function startMarking(p) {
    state.subject = p.subject;
    const now = Date.now();
    await prepareExam(p, { startedAt: now, readingSec: 0, workSec: 0, finishedAt: now, uploaded: true });
    saveExam(); location.hash = '#examrun'; await finishExam(false);
    $('exam-note').textContent = 'Upload your written paper below and it will be marked for you.';
  }
  let homePapers = [];
  async function renderHome() {
    if (!$('next-mascot').firstChild) $('next-mascot').innerHTML = Mascot('wave');
    const em = state.user.email || '';
    const local = em.split('@')[0];
    const first = /[._]/.test(local) ? (local.split(/[._\d]/).filter(Boolean)[0] || '') : '';   // only when the address has a first.last shape
    const nm = myName() || (first ? first[0].toUpperCase() + first.slice(1) : '');
    $('home-hello').textContent = nm ? `Hi ${nm.split(/\s+/)[0]}` : 'Hi';
    $('home-sub').textContent = C.subjects[state.subject];
    renderExamSetup();
    // an exam left running or unmarked
    const saved = state.preview ? null : lsGet(saveKey());
    $('resume-banner').hidden = true;
    const [, { data: papers }] = await Promise.all([
      renderReview(),
      sb.from('papers').select('*').eq('subject', state.subject).order('school').order('year', { ascending: false }),
    ]);
    homePapers = (papers || []).filter(seePaper);
    if (saved) {
      const p = homePapers.find(x => x.id === saved.paperId) || null;
      const left = saved.finishedAt ? null : Math.round((saved.startedAt + (saved.readingSec + saved.workSec) * 1000 - Date.now()) / 60000);
      $('resume-title').textContent = saved.uploaded ? 'A paper is waiting to be marked' : saved.finishedAt || left <= 0 ? 'You have an exam to mark' : 'Exam in progress';
      $('resume-sub').textContent = (p ? `${p.school} ${p.year}` : 'Your paper') + (left > 0 ? ` · about ${left} min left on the clock` : '');
      $('resume-btn').textContent = left > 0 ? 'Back to the exam' : 'Continue marking';
      $('resume-btn').onclick = () => busy(async () => { try { await resumeExam(saved); } catch (err) { $('resume-sub').textContent = err.message; } });
    }
    const sel = $('mark-paper'); const keep = sel.value;
    sel.innerHTML = '<option value="">Pick the paper</option>' + homePapers.filter(p => !p.scanned && !isHsc(p))
      .map(p => `<option value="${p.id}">${esc(p.school)} ${p.year}</option>`).join('');
    sel.value = keep;
    $('quick-desc').textContent = state.weak && state.weak.length
      ? `10 new questions, mostly ${state.weak.map(w => topicName(w.topic)).slice(0, 2).join(' and ')}.`
      : "10 questions you haven't done.";
    renderOnboard();
    if (!mySubjects() || !myName()) { if ($('subj-modal').hidden) openSubjects(true); }
    else if (!flag('tour_done') && !state.tourOn) { if (returning()) flag('tour_done', 1); else setTimeout(startTour, 350); }
    // the single next step: an unfinished exam, then a first set for new students, then a quick set
    const go = $('next-go');
    ['daily-dots', 'daily-mode', 'daily-alt'].forEach(id => { $(id).hidden = true; });
    if (saved && homePapers.some(x => x.id === saved.paperId)) {
      const p = homePapers.find(x => x.id === saved.paperId);
      const left = saved.finishedAt ? null : Math.round((saved.startedAt + (saved.readingSec + saved.workSec) * 1000 - Date.now()) / 60000);
      $('next-title').textContent = left > 0 ? `Back to ${p.school} ${p.year}` : `Mark ${p.school} ${p.year}`;
      $('quick-desc').textContent = left > 0 ? `${left} min left on the clock.` : saved.uploaded ? 'Upload your working to get it marked.' : 'Your answers are saved.';
      go.textContent = left > 0 ? 'Continue' : 'Mark it';
      go.onclick = () => $('resume-btn').click();
    } else await drawDaily();
    drawFriends().then(checkLevelUp);
  }
  // ---------- marking: search for the paper instead of scrolling a giant list ----------
  async function markPaper(p) {
    $('mk-error').hidden = true;
    try { await busy(() => startMarking(p)); } catch (err) { $('mk-error').textContent = err.message; $('mk-error').hidden = false; }
  }
  function drawMarkSearch() {
    const box = $('mark-results'), q = $('mark-search').value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const list = words.length ? markPapers.filter(p => words.every(w => `${p.school} ${p.year} ${p.difficulty || ''}`.toLowerCase().includes(w))) : markPapers.slice(0, 6);
    box.innerHTML = list.length ? list.slice(0, 8).map(p => `<button type="button" class="mk-hit" data-id="${p.id}"><b>${esc(p.school)}</b><span>${p.year}${p.difficulty ? ' · ' + esc(p.difficulty) : ''}</span><em>Upload working ›</em></button>`).join('')
      + (list.length > 8 ? `<p class="small muted">${list.length - 8} more. Keep typing to narrow it down.</p>` : '') + (!words.length ? '<p class="small muted">Newest papers. Type to search all of them.</p>' : '')
      : '<p class="small muted">No paper matches that. Check the spelling, or upload it yourself below.</p>';
  }
  $('mark-search').oninput = drawMarkSearch;
  $('mark-results').onclick = (ev) => { const b = ev.target.closest('.mk-hit'); if (!b) return; const p = markPapers.find(x => x.id === Number(b.dataset.id)); if (p) markPaper(p); };
  // the file pickers show what's been chosen
  [['own-work', 'drop-work'], ['own-sol', 'drop-sol'], ['own-paper', 'drop-paper']].forEach(([id, drop]) => {
    const inp = $(id), lab = $(id + '-f'), box = $(drop);
    const show = () => { const f = [...inp.files]; box.classList.toggle('has', !!f.length);
      lab.textContent = !f.length ? 'Choose file' : f.length === 1 ? f[0].name : `${f.length} files`; };
    inp.onchange = show;
    box.ondragover = (ev) => { ev.preventDefault(); box.classList.add('over'); };
    box.ondragleave = () => box.classList.remove('over');
    box.ondrop = (ev) => { ev.preventDefault(); box.classList.remove('over'); if (ev.dataTransfer.files.length) { inp.files = ev.dataTransfer.files; show(); } };
  });

  // ---------- marking any paper: the student uploads the paper, their working and the solutions ----------
  const OWN_KEY = () => 'tb_own_marks_' + (state.user?.id || '');
  // marks a paper the student uploaded: P paper pages, W their working, S solutions (optional). Used by the Marking page and the tutor.
  async function ownMark(P, W, S, say) {
    const run = Date.now().toString(36), uid = state.user.id, paths = [];
    const session = (crypto.randomUUID ? crypto.randomUUID() : run + Math.random().toString(36).slice(2)).replace(/[^\w-]/g, '');
    try {
      const up = async (files, prefix, max, label) => {
        const blobs = (await filesToPages([...files], (t) => say(`${label}: ${t}`), 1500)).slice(0, max), out = [];
        for (let i = 0; i < blobs.length; i++) {
          say(`Uploading ${label.toLowerCase()} ${i + 1} of ${blobs.length}…`);
          const path = `${uid}/${run}/${prefix}${String(i + 1).padStart(2, '0')}.jpg`;
          const { error } = await sb.storage.from('submissions').upload(path, blobs[i], { contentType: 'image/jpeg', upsert: true });
          if (error) throw error;
          paths.push(path); out.push(path);
        }
        return out;
      };
      const paper_pages = await up(P, 'q', 24, 'Paper');
      const pages = await up(W, 'p', P.length ? 30 : 40, P.length ? 'Your working' : 'Your paper');
      const sol_pages = S.length ? await up(S, 's', 24, 'Solutions') : [];
      say('Marking the whole paper… this takes one to two minutes. Keep this page open.');
      const { data, error } = await sb.functions.invoke('automark', { body: { custom: true, annotated: !paper_pages.length, subject: state.subject, paper_pages, sol_pages, pages, session } });
      if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch {} throw new Error(msg); }
      const rec = { at: Date.now(), subject: state.subject, title: data.title || 'Your uploaded paper', results: data.results, sol: !!sol_pages.length };
      const hist = (lsGet(OWN_KEY()) || []).filter(Boolean); hist.unshift(rec); lsSet(OWN_KEY(), hist.slice(0, 12));
      drawOwnHistory(); window.Juice?.sfx?.fanfare?.();
      return rec;
    } finally { drawMarkLeft(); if (paths.length) sb.storage.from('submissions').remove(paths).catch(() => {}); }
  }
  async function runOwnMark() {
    const say = (t, err) => { $('own-status').textContent = t; $('own-status').className = 'small ' + (err ? 'error' : 'muted'); };
    const P = $('own-paper').files, W = $('own-work').files, S = $('own-sol').files;
    if (!W.length) return say('Add your annotated paper first.', true);
    if (!S.length && (await choiceBox('Mark it without solutions?<span class="cb-sub">The marker works each question out itself first. It\'s usually right, but marking against the real solutions is more reliable.</span>', [['no', 'Add solutions', 'secondary'], ['yes', 'Mark without them', 'primary']])) !== 'yes') return;
    const btn = $('own-go'); btn.disabled = true; $('own-result').innerHTML = '';
    try { const rec = await ownMark(P, W, S, say); say(''); $('own-result').appendChild(ownResult(rec)); }
    catch (err) { say(err.message || String(err), true); }
    finally { btn.disabled = false; }
  }
  $('own-go').onclick = runOwnMark;
  const LOST_NAME = { concept: "concept", method: 'method', algebra: 'algebra slip', careless: 'careless', time: 'unfinished', cfpe: 'CFPE' };
  function ownResult(rec) {
    const got = rec.results.reduce((a, r) => a + r.awarded, 0), of = rec.results.reduce((a, r) => a + r.out_of, 0);
    const c = mk('div', 'own-res');
    c.innerHTML = `<div class="own-total"><b>${got}</b><span>/ ${of}</span><em>${of ? Math.round(100 * got / of) : 0}%</em></div>
      <p class="small muted">${esc(rec.title)} · ${C.subjects[rec.subject] || ''}${rec.sol ? '' : ' · marked without solutions, so double-check anything surprising'}</p>
      <table class="own-tbl"><tbody>${rec.results.map(r => `<tr class="${r.awarded === r.out_of ? 'full' : r.awarded === 0 ? 'zero' : 'part'}">
        <td class="ol">${esc(r.label)}</td><td class="om">${int(r.awarded)}/${int(r.out_of)}${r.correct ? `<small>${esc(r.choice || '–')} → ${esc(r.correct)}</small>` : ''}</td>
        <td class="of">${esc(r.feedback || '')}${(r.lost || []).filter(l => l.reason !== 'cfpe').length ? `<small>Lost: ${(r.lost || []).filter(l => l.reason !== 'cfpe').map(l => esc(LOST_NAME[l.reason] || l.reason)).join(', ')}</small>` : ''}</td></tr>`).join('')}</tbody></table>`;
    return c;
  }
  function drawOwnHistory() {
    const box = $('own-history'); if (!box) return;
    const hist = (lsGet(OWN_KEY()) || []).filter(r => r && r.subject === state.subject);
    if (!hist.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<h2 class="sec">Papers you uploaded</h2><div class="list">${hist.map((r, i) => {
      const got = r.results.reduce((a, x) => a + x.awarded, 0), of = r.results.reduce((a, x) => a + x.out_of, 0);
      return `<button class="li" data-i="${i}"><span><strong>${esc(r.title)}</strong><span class="small muted">${new Date(r.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · ${got}/${of}</span></span><span class="go" aria-hidden="true">›</span></button>`;
    }).join('')}</div>`;
    box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { $('mk-own').hidden = false; $('own-result').innerHTML = ''; $('own-result').appendChild(ownResult(hist[Number(b.dataset.i)])); $('own-result').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
  $('quick-set').onclick = async () => {
    $('quick-error').hidden = true; $('quick-set').disabled = true;
    try {
      const counts = await loadTopicCounts();
      const all = [...new Set(counts.filter(r => r.subject === state.subject).map(r => r.topic))];
      const weak = (state.weak || []).map(w => w.topic);
      shuffle(all);
      state.topics = new Set(weak.length ? [...weak, ...all.slice(0, 3)] : all);
      await busy(() => buildSet({ count: 10, type: 'all', diff: 'all', fresh: 1 }));
      location.hash = '#set';
    } catch (err) { $('quick-error').textContent = err.message; $('quick-error').hidden = false; }
    finally { $('quick-set').disabled = false; }
  };

  // ---------- set: exit and keyboard ----------
  $('set-exit').onclick = () => {   // leaving doesn't end the set: Practise offers it back for 30 minutes
    const s = state.set;
    if (s?.daily && s.results.some(Boolean)) { renderSummary('Set ended early'); location.hash = '#summary'; }
    else location.hash = '#practise';
  };
  // ---------- an unfinished set waits 30 minutes, so closing it or popping over to the tutor loses nothing ----------
  const SET_KEEP_MS = 30 * 60 * 1000;
  const setKey = () => state.user ? `tb_set_${state.user.id}` : null;
  function keepSet() {
    const s = state.set, k = setKey(); if (!s || !k || s.daily || s.done || state.preview) return;
    s.at = Date.now();
    try { localStorage.setItem(k, JSON.stringify({ at: s.at, subject: s.qs[0]?.papers?.subject, title: s.title || null, i: s.i,
      ids: s.qs.map(q => q.id), res: s.qs.map((_, j) => s.results[j] ? { score: s.results[j].score, outOf: s.results[j].outOf, auto: !!s.results[j].auto } : null) })); } catch { /* storage off */ }
  }
  function dropSet() { const k = setKey(); try { if (k) localStorage.removeItem(k); } catch {} }
  function pausedSet() {
    const s = state.set;
    if (s && !s.done && !s.daily && Date.now() - (s.at || 0) < SET_KEEP_MS) return { live: true, i: s.i, n: s.qs.length, title: s.title };
    let saved = null; try { saved = JSON.parse(localStorage.getItem(setKey()) || 'null'); } catch {}
    if (!saved || Date.now() - saved.at > SET_KEEP_MS || !saved.ids?.length) { if (saved) dropSet(); return null; }
    return { live: false, i: saved.i, n: saved.ids.length, title: saved.title, saved };
  }
  async function resumeSet(p) {
    if (!p.live) {
      const { data, error } = await sb.from('questions').select(QCOLS).in('id', p.saved.ids);
      if (error) throw error;
      const by = Object.fromEntries((data || []).map(q => [q.id, q]));
      const keep = p.saved.ids.map((id, j) => [by[id], p.saved.res[j]]).filter(([q]) => q);
      if (!keep.length) { dropSet(); throw new Error('Those questions are not available any more.'); }
      const qs = keep.map(([q]) => q);
      await attachUrls(qs);
      const i = Math.min(qs.findIndex(q => q.id === p.saved.ids[p.saved.i]) >= 0 ? qs.findIndex(q => q.id === p.saved.ids[p.saved.i]) : 0, qs.length - 1);
      state.set = { qs, i, results: keep.map(([q, r]) => r ? { q, score: r.score, outOf: r.outOf, auto: r.auto } : undefined), title: p.saved.title || undefined };
    }
    renderQuestion();
    location.hash = '#set';
  }
  function drawResume() {
    const row = $('pr-resume'); if (!row) return;
    const p = pausedSet();
    row.hidden = !p;
    if (!p) return;
    row.querySelector('.pr-res-n').textContent = `${p.i + 1} of ${p.n}`;
    row.querySelector('.pr-res-go').onclick = async () => {
      $('pr-error').hidden = true;
      try { await busy(() => resumeSet(p)); } catch (err) { $('pr-error').textContent = err.message; $('pr-error').hidden = false; drawResume(); }
    };
    row.querySelector('.pr-res-x').onclick = () => { if (state.set) state.set.done = true; dropSet(); row.hidden = true; };
  }
  document.addEventListener('keydown', (ev) => {
    if ($('view-set').hidden || ev.metaKey || ev.ctrlKey || ev.altKey || /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    const k = ev.key.toLowerCase();
    if ('abcd'.includes(k) && k.length === 1 && !$('mcq-controls').hidden) {
      const b = document.querySelector(`#mcq-controls button[data-l="${k.toUpperCase()}"]`); if (b && !b.disabled) { b.click(); ev.preventDefault(); }
    } else if (k === 's' && !$('short-controls').hidden && !$('show-sol').hidden && !$('show-sol').disabled) { $('show-sol').click(); ev.preventDefault(); }
    else if ((k === 'enter' || k === 'arrowright') && !$('next').hidden) { $('next').click(); ev.preventDefault(); }
    else if (/^[0-9]$/.test(k) && !$('sol-wrap').hidden) { const b = $('self-mark').querySelectorAll('button')[Number(k)]; if (b && !b.disabled) { b.click(); ev.preventDefault(); } }
  });

  // ---------- exam mode ----------
  const saveKey = () => 'tb_exam_' + (state.user ? state.user.id : '');
  function saveExam() {
    const e = state.exam; if (!e) return;
    lsSet(saveKey(), { paperId: e.paper.id, startedAt: e.startedAt, readingSec: e.readingSec, workSec: e.workSec, answers: e.answers, marks: e.marks, lost: e.lost || {}, ai: e.ai || {}, uploaded: !!e.uploaded, finishedAt: e.finishedAt || null });
  }
  function renderExamSetup() {
    const d = examDefaults(state.subject);
    $('exam-reading').value = d.reading; $('exam-working').value = d.working;
    const tt = () => { $('exam-times').textContent = `${$('exam-reading').value} min reading, ${$('exam-working').value} min working`; };
    tt(); $('exam-reading').oninput = tt; $('exam-working').oninput = tt;
    $('exam-error').hidden = true;
  }
  async function pickExamPaper(subject) {
    const [{ data: papers }, { data: sums }, { data: exams }] = await Promise.all([
      sb.from('papers').select('*').eq('subject', subject),
      sb.from('paper_summary').select('*'),
      sb.from('exams').select('paper_id'),
    ]);
    const sum = Object.fromEntries((sums || []).map(s => [s.paper_id, s]));
    const ok = (papers || []).filter(p => {
      const s = sum[p.id];
      if (p.online) return true;
      return !p.scanned && s && s.n_questions >= 10 && s.n_images >= 0.9 * s.n_questions && s.n_coarse <= 0.1 * s.n_questions;
    });
    if (!ok.length) throw new Error('No papers are ready for exam mode in this subject yet.');
    const sat = new Set((exams || []).map(e => e.paper_id));
    const fresh = ok.filter(p => !sat.has(p.id));
    const pool = fresh.length ? fresh : ok;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  $('exam-random').onclick = async () => {
    $('exam-error').hidden = true; $('exam-random').disabled = true;
    try {
      const reading = Math.max(0, Number($('exam-reading').value) || 0), working = Math.max(5, Number($('exam-working').value) || 120);
      await startExam(await pickExamPaper(state.subject), reading, working);
    } catch (err) { $('exam-error').textContent = err.message; $('exam-error').hidden = false; }
    finally { $('exam-random').disabled = false; }
  };
  async function prepareExam(paper, init) {
    const { data: qs, error } = await sb.from('questions').select(QCOLS).eq('paper_id', paper.id).or('image_path.not.is.null,content.not.is.null').limit(300);
    if (error) throw error;
    if (!qs || !qs.length) throw new Error('That paper has no question images yet.');
    qs.sort(byOrder);
    const u = await signed(qs.map(q => q.image_path), 4 * 3600);
    qs.forEach(q => { q.imageUrl = u[q.image_path]; });
    state.exam = { paper, qs, phase: null, answers: {}, marks: {}, ...init };
  }
  async function startExam(paper, readingMin, workMin) {
    await prepareExam(paper, { startedAt: Date.now(), readingSec: readingMin * 60, workSec: workMin * 60 });
    saveExam();
    $('exam-note').textContent = '';
    location.hash = '#examrun';
    startTimer();
  }
  async function resumeExam(saved) {
    const { data: ps } = await sb.from('papers').select('*').eq('id', saved.paperId);
    if (!ps || !ps[0]) { lsDel(saveKey()); throw new Error('That paper is no longer available.'); }
    await prepareExam(ps[0], saved);
    $('exam-note').textContent = '';
    location.hash = '#examrun';
    if (saved.finishedAt) finishExam(false); else startTimer();
  }

  let examTimer = null;
  function startTimer() { clearInterval(examTimer); examTimer = setInterval(tick, 1000); tick(); }
  function tick() {
    const e = state.exam;
    if (!e || e.phase === 'marking') { clearInterval(examTimer); return; }
    const t = (Date.now() - e.startedAt) / 1000;
    let phase, left;
    if (t < e.readingSec) { phase = 'reading'; left = e.readingSec - t; }
    else if (t < e.readingSec + e.workSec) { phase = 'working'; left = e.readingSec + e.workSec - t; }
    else { finishExam(true); return; }
    if (phase !== e.phase) { e.phase = phase; renderExamBody(); syncBar(); }
    $('exam-clock').textContent = fmtClock(left);
    $('exam-clock').className = 'clock' + (phase === 'working' && left < 60 ? ' bad' : phase === 'working' && left < 600 ? ' warn' : '');
  }
  function syncBar() {
    const e = state.exam; if (!e) return;
    $('exam-phase').textContent = { reading: 'Reading time', working: 'Working time', marking: 'Marking' }[e.phase] || '';
    $('exam-skip').hidden = e.phase !== 'reading';
    $('exam-finish').textContent = e.phase === 'marking' ? 'Save result' : 'Finish exam';
    $('exam-title').textContent = `${e.paper.school} ${e.paper.year} · ${C.subjects[e.paper.subject] || e.paper.subject}`;
  }
  $('exam-skip').onclick = () => {
    const e = state.exam; if (!e) return;
    e.startedAt = Date.now() - e.readingSec * 1000; saveExam(); tick();
  };
  $('exam-pdf').onclick = () => {
    const e = state.exam; if (!e) return;
    const total = e.qs.reduce((a, q) => a + (q.marks || 0), 0);
    officialPdf($('exam-pdf'), e.paper, 'pdf_path', {
      title: `${e.paper.school} ${e.paper.year} · ${C.subjects[e.paper.subject] || e.paper.subject}`,
      sub: `${e.qs.length} questions${total ? ' · ' + total + ' marks' : ''} · Reading time ${Math.round(e.readingSec / 60)} min · Working time ${Math.round(e.workSec / 60)} min`,
      filename: paperFile(e.paper), qs: e.qs,
    }, $('exam-note'));
  };
  let armed = null;
  $('exam-finish').onclick = async () => {
    const e = state.exam; if (!e) return;
    if (e.phase === 'marking') return saveExamResult();
    if (!armed) {
      $('exam-finish').textContent = 'Sure? Tap again';
      armed = setTimeout(() => { armed = null; syncBar(); }, 4000);
      return;
    }
    clearTimeout(armed); armed = null; finishExam(false);
  };
  async function finishExam(auto) {
    const e = state.exam; if (!e || e.phase === 'marking') return;
    clearInterval(examTimer);
    e.finishedAt = e.finishedAt || Date.now();
    const t = (e.finishedAt - e.startedAt) / 1000;
    e.secondsUsed = Math.round(Math.max(0, Math.min(t - e.readingSec, e.workSec)));
    e.phase = 'marking';
    saveExam();
    const u = await signed(e.qs.map(q => q.solution_path), 4 * 3600).catch(() => ({}));
    e.qs.forEach(q => { q.solutionUrl = q.solution_path ? u[q.solution_path] : null; });
    if (auto) $('exam-note').textContent = 'Time is up. Mark yourself honestly against the solutions.';
    renderExamBody(); syncBar(); updateRunning();
    document.body.classList.remove('focus');
    window.scrollTo(0, 0);
  }
  function examResults(e) {
    const out = [];
    e.qs.forEach(q => {
      if (q.syllabus_note) { const m = q.type === 'mcq' ? 1 : (q.marks || 0); if (m) out.push({ q, score: m, outOf: m, chosen: e.answers[q.id] || null, auto: true }); return; }
      if (q.content && Online.objective(q)) { const v = e.answers[q.id]; out.push({ q, score: Online.score(q, v), outOf: q.marks || 1, chosen: v == null ? null : Array.isArray(v) ? v.join(',') : v }); return; }
      if (q.type === 'mcq') { if (q.answer) out.push({ q, score: e.answers[q.id] === q.answer ? 1 : 0, outOf: 1, chosen: e.answers[q.id] || null }); }
      else if (q.marks) out.push({ q, score: Math.min(e.marks[q.id] || 0, q.marks), outOf: q.marks, chosen: null });
    });
    return out;
  }
  function updateRunning() {
    const e = state.exam; if (!e || e.phase !== 'marking') return;
    const rs = examResults(e);
    $('exam-clock').className = 'clock';
    $('exam-clock').textContent = `${rs.reduce((a, r) => a + r.score, 0)} / ${rs.reduce((a, r) => a + r.outOf, 0)}`;
    const shorts = e.qs.filter(q => q.type !== 'mcq' && q.marks && !q.syllabus_note && !(q.content && Online.objective(q)));
    const done = shorts.filter(q => e.marks[q.id] != null).length;
    if (!$('exam-note').textContent || /marked/.test($('exam-note').textContent)) $('exam-note').textContent = `${done} of ${shorts.length} written questions marked. Unmarked ones count as 0.`;
  }
  function renderExamBody() {
    const e = state.exam, body = $('exam-body'), marking = e.phase === 'marking';
    if (window.Annotate) Annotate.stop();
    body.innerHTML = '';
    const jump = $('exam-jump'); jump.innerHTML = '';
    if (marking) body.appendChild(automarkCard());
    e.qs.forEach((q, idx) => {
      const has = q.content ? Online.answered(q, e.answers[q.id]) : !!e.answers[q.id];
      const chip = mk('button', has || e.marks[q.id] != null ? 'done' : '', qLabel(q).replace(/^Q/, ''));
      chip.onclick = () => document.getElementById('xq' + idx).scrollIntoView({ block: 'start' });
      jump.appendChild(chip);
      const c = mk('div', 'card qcard'); c.id = 'xq' + idx;
      c.innerHTML = `<div class="between"><strong>${qLabel(q)} ${sylFlag(q)}</strong><span class="muted small">${marksText(q.marks)}</span></div>`;
      if (window.Annotate && state.user && !q.content) { const tb = mk('div', 'ann-tools'); tb.appendChild(Annotate.button(c, `tb_ann_${state.user.id}_${q.id}`)); c.appendChild(tb); }
      if (q.content) c.appendChild(Online.render(q, { value: e.answers[q.id], disabled: e.phase !== 'working', reveal: marking && Online.objective(q),
        onChange: v => { e.answers[q.id] = v; saveExam(); chip.classList.toggle('done', Online.answered(q, v)); } }));
      else c.appendChild(qImg(q.imageUrl, 'Question ' + qLabel(q)));
      if (marking && q.syllabus_note) {
        c.appendChild(mk('p', 'muted small', `${esc(q.syllabus_note)} Auto-marked as correct.`));
        chip.classList.add('done'); body.appendChild(c); return;
      }
      const ai = marking && e.ai && e.ai[q.id];
      if (ai) c.appendChild(mk('p', 'ai-note', `<b>Auto-marker: ${ai.found ? `${int(ai.awarded)}/${int(ai.out_of)}` : 'not found in your upload'}</b> ${esc(ai.feedback || '')}`));
      if (q.content && Online.objective(q)) {
        if (marking) { c.appendChild(mk('p', 'small', `<b>${Online.score(q, e.answers[q.id])} / ${q.marks}</b>`)); c.appendChild(Online.solution(q)); }
        body.appendChild(c); return;
      }
      if (q.type === 'mcq') {
        const ch = mk('div', 'choices');
        ['A', 'B', 'C', 'D'].forEach(l => {
          const b = mk('button', '', l); b.dataset.l = l;
          if (e.answers[q.id] === l) b.classList.add('picked');
          if (marking && q.answer) { if (l === q.answer) b.classList.add('correct'); else if (e.answers[q.id] === l) b.classList.add('wrong'); }
          b.disabled = e.phase !== 'working';
          b.onclick = () => {
            e.answers[q.id] = e.answers[q.id] === l ? null : l; saveExam();
            ch.querySelectorAll('button').forEach(x => x.classList.toggle('picked', e.answers[q.id] === x.dataset.l));
            chip.classList.toggle('done', !!e.answers[q.id]);
          };
          ch.appendChild(b);
        });
        c.appendChild(ch);
        if (marking) c.appendChild(mk('p', 'muted small', q.answer ? `You: ${esc(e.answers[q.id] || 'blank')} · Answer: ${esc(q.answer)}` : 'No answer key for this one (not counted).'));
      } else if (!marking) {
        if (!q.content) c.appendChild(mk('p', 'muted small', 'Write your working on paper.'));
      } else {
        const sol = mk('button', 'secondary', q.solutionUrl || q.content ? 'Show solution' : 'No solution available'); sol.disabled = !q.solutionUrl && !q.content;
        const solBox = mk('div'); solBox.hidden = true;
        sol.onclick = () => {
          if (!solBox.innerHTML) { if (q.content) solBox.appendChild(Online.solution(q)); else solBox.innerHTML = `<div class="card scroll"><img src="${esc(q.solutionUrl || '')}" alt="Solution"></div>`; }
          solBox.hidden = !solBox.hidden; sol.textContent = solBox.hidden ? 'Show solution' : 'Hide solution';
        };
        c.appendChild(sol); c.appendChild(solBox);
        if (q.marks) {
          c.appendChild(mk('p', 'muted small', 'Marks you would have got:'));
          const mkr = mk('div', 'choices');
          for (let m = 0; m <= q.marks; m++) {
            const b = mk('button', e.marks[q.id] === m ? 'picked' : '', String(m));
            b.onclick = () => {
              e.marks[q.id] = m; saveExam();
              mkr.querySelectorAll('button').forEach(x => x.classList.toggle('picked', x === b));
              chip.classList.add('done'); updateRunning(); drawTags();
            };
            mkr.appendChild(b);
          }
          c.appendChild(mkr);
          const tagBox = mk('div'); c.appendChild(tagBox);
          const drawTags = () => {
            tagBox.innerHTML = '';
            const got = e.marks[q.id];
            if (got == null || got >= q.marks) { if (e.lost) delete e.lost[q.id]; return; }
            e.lost = e.lost || {};
            const res = { outOf: q.marks, lost: (e.lost[q.id] || []).filter(l => l.mark <= q.marks) };
            tagBox.appendChild(lostTagger(res, q.marks - got, (lost) => { e.lost[q.id] = lost; saveExam(); }));
          };
          drawTags();
        }
      }
      body.appendChild(c);
    });
  }
  async function saveExamResult() {
    const e = state.exam; if (!e || e.phase !== 'marking') return;
    $('exam-finish').disabled = true;
    const rs = examResults(e);
    const score = rs.reduce((a, r) => a + r.score, 0), outOf = rs.reduce((a, r) => a + r.outOf, 0);
    try {
      const { error: e1 } = await sb.from('attempts').insert(rs.filter(r => !r.auto).map(r => ({ user_id: state.user.id, question_id: r.q.id, score: r.score, out_of: r.outOf, chosen: r.chosen, lost: (e.lost && e.lost[r.q.id] && e.lost[r.q.id].length) ? e.lost[r.q.id] : null })));
      if (e1) throw e1;
      const { error: e2 } = await sb.from('exams').insert({ user_id: state.user.id, paper_id: e.paper.id, started_at: new Date(e.startedAt).toISOString(), seconds_used: e.secondsUsed, score, out_of: outOf, work_minutes: Math.round(e.workSec / 60) });
      if (e2) throw e2;
    } catch (err) {
      $('exam-note').textContent = 'Could not save: ' + err.message + '. Tap Save result to retry.';
      $('exam-finish').disabled = false; return;
    }
    lsDel(saveKey());
    window.Juice && Juice.play('fanfare');
    state.set = { qs: e.qs, i: 0, results: rs.map(r => ({ q: r.q, score: r.score, outOf: r.outOf })) };
    renderSummary('Exam done');
    $('summary-extra').textContent = `${e.paper.school} ${e.paper.year} · ${Math.round(e.secondsUsed / 60)} of ${Math.round(e.workSec / 60)} minutes used`;
    state.exam = null; $('exam-finish').disabled = false;
    location.hash = '#summary';
  }

  // ---------- review ----------
  async function renderReview() {
    $('review-error').hidden = true;
    let [{ data: mine }, { data: stars }, { data: ex }] = await Promise.all([
      sb.from('my_topic_stats').select('*').eq('subject', state.subject),
      sb.from('bookmarks').select('question_id'),
      sb.from('exams').select('started_at, seconds_used, score, out_of, work_minutes, papers!inner(school, year, subject)').eq('papers.subject', state.subject).order('started_at', { ascending: false }).limit(20),
    ]);
    const skipW = skipped();
    state.weak = (mine || []).filter(r => r.out_of >= 1 && !skipW.has(r.topic)).map(r => ({ ...r, pct: r.score / r.out_of })).filter(r => r.pct < 0.75)
      .sort((a, b) => a.pct - b.pct || b.out_of - a.out_of).slice(0, 3);
    $('checkup').hidden = !!state.weak.length;
    $('checkup-go').textContent = state.attempted ? 'Retake check-up' : 'Start check-up';
    if (state.preview) { mine = []; stars = []; ex = []; }   // admin preview: show what a brand-new student sees
    state.attempted = state.preview ? !!previewFlags.attempted : (mine || []).some(r => r.out_of > 0);
    $('weak-list').textContent = state.weak.length ? state.weak.map(w => topicName(w.topic)).join(', ') : 'None yet';
    $('wrong-sub').textContent = state.attempted ? '' : 'None yet';
    $('drill-weak').disabled = !state.weak.length;
    $('star-count').textContent = (stars || []).length ? String((stars || []).length) : 'None yet';
    const tb = $('exam-history').querySelector('tbody'); tb.innerHTML = '';
    (ex || []).forEach(r => {
      const tr = mk('tr');
      tr.innerHTML = `<td>${day(r.started_at)}</td><td>${esc(r.papers.school)} ${esc(r.papers.year)}</td><td>${int(r.score)}/${int(r.out_of)} (${r.out_of ? Math.round(100 * r.score / r.out_of) : 0}%)</td><td>${r.work_minutes ? `${Math.round((r.seconds_used || 0) / 60)} of ${r.work_minutes} min` : 'Uploaded'}</td>`;
      tb.appendChild(tr);
    });
    $('exam-history-empty').hidden = !!(ex && ex.length);
    // nothing to show yet: hide the empty table and the rows that would lead nowhere
    $('exam-history').classList.toggle('is-empty', !(ex && ex.length));
    $('drill-weak').classList.toggle('is-empty', !state.weak.length);
    $('drill-wrong').classList.toggle('is-empty', !state.attempted);
    $('drill-stars').classList.toggle('is-empty', !(stars || []).length);
    $('drill-weak').parentElement.classList.toggle('is-empty', !state.weak.length && !state.attempted && !(stars || []).length);
  }
  function reviewError(msg) { $('review-error').textContent = msg; $('review-error').hidden = false; }
  async function setFromIds(ids, n) {
    if (!ids.length) return false;
    const { data, error } = await sb.from('questions').select(QCOLS).in('id', ids.slice(0, 100)).eq('papers.subject', state.subject).or('image_path.not.is.null,content.not.is.null');
    if (error) throw error;
    const ok = data.filter(hasKey);
    if (!ok.length) return false;
    shuffle(ok);
    await startSet(ok.slice(0, n));
    return true;
  }
  $('drill-weak').onclick = async () => {
    $('review-error').hidden = true;
    try {
      state.topics = new Set(state.weak.map(w => w.topic));
      await buildSet({ count: 10, type: 'all', diff: 'all', fresh: 0 });
      location.hash = '#set';
    } catch (err) { reviewError(err.message); }
  };
  $('drill-wrong').onclick = async () => {
    $('review-error').hidden = true;
    try {
      const { data: att, error } = await sb.from('attempts').select('question_id, score, out_of, created_at').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      const seen = new Set(), wrong = [];
      (att || []).forEach(a => { if (seen.has(a.question_id)) return; seen.add(a.question_id); if (a.score < a.out_of) wrong.push(a.question_id); });
      if (!(await setFromIds(wrong, 15))) reviewError('Nothing to redo in this subject. Clean sheet.');
    } catch (err) { reviewError(err.message); }
  };
  $('drill-stars').onclick = async () => {
    $('review-error').hidden = true;
    try {
      const { data } = await sb.from('bookmarks').select('question_id');
      if (!(await setFromIds((data || []).map(r => r.question_id), 20))) reviewError('No starred questions in this subject yet. Tap the star on any question.');
    } catch (err) { reviewError(err.message); }
  };

  // ---------- start-here guide (new users) ----------
  // ---------- admin: test as a new user (session only, real progress untouched) ----------
  let previewFlags = {};
  try { state.preview = sessionStorage.getItem('tb_preview') === '1'; } catch {}
  $('preview-new').onclick = () => {
    try { sessionStorage.setItem('tb_preview', '1'); } catch {}
    state.preview = true; previewFlags = {}; setTimeout(() => touchStreak(), 0); $('account-menu').hidden = true; $('preview-new').hidden = true;
    if (location.hash === '#home') route(); else location.hash = '#home';
  };
  $('preview-exit').onclick = () => {
    try { sessionStorage.removeItem('tb_preview'); } catch {}
    state.preview = false; previewFlags = {}; setTimeout(() => drawStreak(), 0); drawAdminMenu();
    if (location.hash === '#home') route(); else location.hash = '#home';
  };
  // one-off flags (tour seen, subject picked...): kept on the account so a new device or the Home Screen app
  // doesn't treat a returning student as new; localStorage is only a fast local copy
  const flag = (k, v) => {
    if (state.preview) { if (v === undefined) return !!previewFlags[k]; previewFlags[k] = 1; return; }
    const meta = state.user?.user_metadata?.flags || {};
    let local = false; try { local = localStorage.getItem('tb_' + k) === '1'; } catch { /* private mode */ }
    if (v === undefined) {
      if (meta[k]) return true;
      if (local && state.user) flag(k, 1);          // carry flags set before this change up to the account
      return local;
    }
    try { localStorage.setItem('tb_' + k, '1'); } catch { /* private mode */ }
    if (state.user && !meta[k]) {
      state.user.user_metadata = { ...(state.user.user_metadata || {}), flags: { ...meta, [k]: 1 } };
      try { sb.auth.updateUser({ data: { flags: state.user.user_metadata.flags } }).then(({ data }) => { if (data?.user) state.user = data.user; }, () => {}); } catch { /* demo mode */ }
    }
  };
  // accounts that are more than a day old have already been shown around
  const returning = () => !!state.user?.created_at && Date.now() - Date.parse(state.user.created_at) > 864e5;
  function renderOnboard() {
    $('onboard').hidden = true; return;   // replaced by the spotlight tour below
    const box = $('onboard');
    const done = { subject: flag('picked_subject'), first: !!state.attempted, papers: flag('seen_papers') };
    if (flag('onboard_hidden') || (done.subject && done.first && done.papers)) { box.hidden = true; return; }
    box.hidden = false;
    for (const k of ['subject', 'first', 'papers']) $('ob-' + k).classList.toggle('done', done[k]);
    const subs = $('ob-subjects'); subs.innerHTML = '';
    for (const [key, label] of Object.entries(C.subjects)) {
      const b = mk('button', key === state.subject && done.subject ? 'on' : '', label.replace('Mathematics ', 'Maths ').replace('Extension ', 'Ext '));
      b.onclick = () => {
        flag('picked_subject', 1);
        if (key !== state.subject) $('subject-switch').querySelectorAll('button')[Object.keys(C.subjects).indexOf(key)].click(); else renderOnboard();
      };
      subs.appendChild(b);
    }
  }
  $('onboard-hide').onclick = () => { flag('onboard_hidden', 1); $('onboard').hidden = true; };
  $('ob-first-go').onclick = async () => {
    $('ob-first-go').disabled = true;
    try {
      const counts = await loadTopicCounts();
      state.topics = new Set(counts.filter(r => r.subject === state.subject).map(r => r.topic));
      await busy(() => buildSet({ count: 5, type: 'mcq', diff: 'all', fresh: 1 }));
      location.hash = '#set';
    } catch (err) { reviewError(err.message); } finally { $('ob-first-go').disabled = false; }
  };
  function firstHint(x) {
    const k = x.type === 'mcq' ? 'hint_mcq' : 'hint_short', el = $('set-hint');
    if (flag(k)) { el.hidden = true; return; }
    el.textContent = x.type === 'mcq' ? 'Tap an answer. You find out straight away.' : 'Do it on paper, check the solution, then give yourself a mark.';
    el.hidden = false; flag(k, 1);
  }

  // ---------- check-up: one multiple-choice question per topic to find weak spots ----------
  $('checkup-go').onclick = async () => {
    $('checkup-go').disabled = true; $('review-error').hidden = true;
    try {
      await busy(async () => {
        const { data, error } = await sb.from('questions').select(QCOLS).eq('papers.subject', state.subject)
          .eq('type', 'mcq').not('answer', 'is', null).or('image_path.not.is.null,content.not.is.null').not('topic', 'is', null).limit(800);
        if (error) throw error;
        const byTopic = {};
        shuffle((data || []).filter(q => !blockedQs().has(q.id) && !q.syllabus_note)).forEach(q => { (byTopic[q.topic] = byTopic[q.topic] || []).push(q); });
        const skipC = skipped();
        const topics = shuffle(Object.keys(byTopic).filter(t => !skipC.has(t))).slice(0, 12);
        if (!topics.length) throw new Error('No questions ready for a check-up in this subject yet.');
        await startSet(topics.map(t => byTopic[t][0]));
        state.set.title = 'Check-up done';
      });
    } catch (err) { reviewError(err.message); } finally { $('checkup-go').disabled = false; }
  };

  // ---------- topics not learnt yet (per subject, saved to the account) ----------
  function skipped(subj = state.subject) {
    const all = state.preview ? (previewFlags.skip || {}) : (state.user?.user_metadata?.skip_topics || {});
    return new Set(all[subj] || []);
  }
  async function saveSkipped(set, subj = state.subject) {
    const all = { ...(state.preview ? (previewFlags.skip || {}) : (state.user?.user_metadata?.skip_topics || {})), [subj]: [...set].sort() };
    if (state.preview) { previewFlags.skip = all; return; }
    const { data, error } = await sb.auth.updateUser({ data: { skip_topics: all } });
    if (!error && data?.user) state.user = data.user;
  }
  let toastT = null;
  function toast(html, ms = 5000) {
    const t = $('toast'); t.innerHTML = html; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
    return t;
  }
  // a small dialog with any number of choices; resolves to the chosen key, or null if dismissed
  function choiceBox(html, choices) {
    return new Promise(res => {
      const m = mk('div', 'modal');
      m.innerHTML = `<div class="modal-card soon-card" role="dialog" aria-modal="true"><h2>${html}</h2><div class="row confirm-row">${choices.map(([k, label, cls]) => `<button class="${cls}" data-k="${k}">${label}</button>`).join('')}</div></div>`;
      const done = (v) => { m.remove(); document.removeEventListener('keydown', esc_); res(v); };
      const esc_ = (ev) => { if (ev.key === 'Escape') done(null); };
      m.onclick = (ev) => { if (ev.target === m) done(null); const b = ev.target.closest('button[data-k]'); if (b) done(b.dataset.k); };
      document.addEventListener('keydown', esc_);
      document.body.appendChild(m);
      m.querySelector('.primary')?.focus();
    });
  }
  function confirmBox(html, yes = 'Yes', no = 'No') {
    return new Promise(res => {
      const m = mk('div', 'modal');
      m.innerHTML = `<div class="modal-card soon-card" role="dialog" aria-modal="true"><h2>${html}</h2><div class="row confirm-row"><button class="secondary" data-v="0">${no}</button><button class="primary" data-v="1">${yes}</button></div></div>`;
      const done = (v) => { m.remove(); document.removeEventListener('keydown', k); res(v); };
      const k = (ev) => { if (ev.key === 'Escape') done(false); };
      m.onclick = (ev) => { if (ev.target === m) done(false); const b = ev.target.closest('button[data-v]'); if (b) done(b.dataset.v === '1'); };
      document.addEventListener('keydown', k);
      document.body.appendChild(m);
      m.querySelector('[data-v="1"]').focus();
    });
  }
  $('not-learnt').onclick = async () => {
    const x = state.set && state.set.qs[state.set.i]; if (!x || !x.topic) return;
    if (!(await confirmBox(`You haven't learnt ${esc(topicName(x.topic))}?`))) return;
    const set = skipped(); set.add(x.topic); await saveSkipped(set);
    const t = toast(`${esc(topicName(x.topic))} hidden until you've learnt it. <button class="link" id="undo-skip">Undo</button>`);
    t.querySelector('#undo-skip').onclick = async () => { const s2 = skipped(); s2.delete(x.topic); await saveSkipped(s2); t.hidden = true; };
    // drop the rest of this topic from the current set too
    const s = state.set;
    s.qs = s.qs.filter((q, k) => k <= s.i || q.topic !== x.topic);
    advance();
  };
  // single questions that go further than the class has learnt so far
  // questions past the step the class is up to, in the topic it's learning now (needs the questions tagged)
  let stepBlock = { key: '', ids: new Set() };
  const classStep = (subj = state.subject) => (state.preview ? previewFlags.step : state.user?.user_metadata?.class_step)?.[subj] || null;
  async function loadStepBlock(subj = state.subject) {
    const t = classPos(subj), st = classStep(subj), steps = t && topicSteps(t, subj);
    const key = `${subj}|${t}|${st}`;
    if (stepBlock.key === key) return stepBlock.ids;
    const ids = new Set();
    const at = steps ? steps.findIndex(([id]) => id === st) : -1;
    if (at >= 0 && at < steps.length - 1) {
      const later = new Set(steps.slice(at + 1).map(([id]) => id));
      const { data, error } = await sb.from('questions').select('id, skills, papers!inner(subject)').eq('papers.subject', subj).eq('topic', t).not('skills', 'is', null).limit(3000);
      if (!error) (data || []).forEach(q => { if ((q.skills || []).some(x => later.has(x))) ids.add(q.id); });
    }
    stepBlock = { key, ids };
    return ids;
  }
  const blockedQs = () => new Set([...hardQs(), ...stepBlock.ids]);
  function hardQs() {
    return new Set(state.preview ? (previewFlags.hardQs || []) : (state.user?.user_metadata?.skip_qs || []));
  }
  async function saveHardQs(set) {
    const ids = [...set].slice(-2000);
    if (state.preview) { previewFlags.hardQs = ids; return; }
    const { data, error } = await sb.auth.updateUser({ data: { skip_qs: ids } });
    if (!error && data?.user) state.user = data.user;
  }
  $('too-hard').onclick = async () => {
    const x = state.set && state.set.qs[state.set.i]; if (!x) return;
    if (!(await confirmBox(`Haven't learnt ${x.topic ? esc(topicName(x.topic)) : 'this'} to this level yet?`))) return;
    const set = hardQs(); set.add(x.id); await saveHardQs(set);
    const t = toast(`That question is hidden for now. <button class="link" id="undo-hard">Undo</button>`);
    t.querySelector('#undo-hard').onclick = async () => { const s2 = hardQs(); s2.delete(x.id); await saveHardQs(s2); t.hidden = true; };
    advance();
  };
  // ---------- where your class is up to: topics in teaching order; everything after the current one counts as not learnt yet ----------
  const classPos = (subj = state.subject) => (state.preview ? previewFlags.pos : state.user?.user_metadata?.class_pos)?.[subj] || null;
  function teachingOrder(topics, subj = state.subject) {
    const have = new Set(topics), out = [];
    (TOPIC_GROUPS[subj] || []).forEach(([g, ts]) => ts.forEach(t => { if (have.has(t)) { out.push([g, t]); have.delete(t); } }));
    [...have].sort((a, b) => topicName(a).localeCompare(topicName(b))).forEach(t => out.push([out.length ? 'Other' : 'Topics', t]));
    return out;
  }
  function openLearnt(topics) {
    const order = teachingOrder(topics), skip = skipped();
    let pos = classPos(), step = classStep(), free = !!(pos === null && skip.size);   // free = ticking topics one by one (class goes in a different order)
    if (pos && !order.some(([, t]) => t === pos)) pos = null;
    const draw = () => {
      const grid = $('learnt-grid'), idx = order.findIndex(([, t]) => t === pos);
      $('learnt-sub').textContent = free ? 'Tick every topic your class has covered. Unticked ones stay out of your practice, Daily 5, practice papers and the tutor.'
        : "Tap the topic you're learning now. Anything after it stays out of your practice, Daily 5, practice papers and the tutor until you get there.";
      $('learnt-mode').textContent = free ? 'Go back to "up to here"' : 'My class goes in a different order';
      let last = '';
      grid.innerHTML = order.map(([g, t], i) => {
        const head = g !== last ? `<h3>${esc(g)}</h3>` : ''; last = g;
        const done = free ? !skip.has(t) : idx >= 0 && i < idx, now = !free && i === idx;
        const st = now && topicSteps(t), si = st ? st.findIndex(([id]) => id === step) : -1;
        const sub = st ? `<div class="up-steps"><p class="small"><b>How far into ${esc(topicName(t))}?</b> <span class="muted">Tap the last part you've learnt. Questions that need later parts stay hidden.</span></p>${st.map(([id, lab], j) =>
          `<button class="up-step${si >= 0 && j <= si ? ' done' : ''}" data-s="${id}"><i aria-hidden="true"></i><span>${esc(lab)}</span></button>`).join('')}${si >= 0 ? '<button class="link small" data-s="">All of it, show every question</button>' : ''}</div>` : '';
        return `${head}<button class="up-row${done ? ' done' : ''}${now ? ' now' : ''}" data-i="${i}"><i aria-hidden="true"></i><span>${esc(topicName(t))}</span><em>${now ? 'Learning now' : done ? (free ? 'Learnt' : 'Done') : free ? 'Not yet' : ''}</em></button>${sub}`;
      }).join('');
      grid.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const t = order[+b.dataset.i][1];
        if (free) { skip.has(t) ? skip.delete(t) : skip.add(t); } else { if (pos !== t) step = null; pos = t; }
        draw();
      });
      grid.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { step = b.dataset.s || null; draw(); });
    };
    $('learnt-mode').onclick = () => {
      if (!free) { free = true; skip.clear(); const idx = order.findIndex(([, t]) => t === pos); if (idx >= 0) order.slice(idx + 1).forEach(([, t]) => skip.add(t)); }
      else free = false;
      draw();
    };
    draw();
    $('learnt-modal').hidden = false;
    $('learnt-cancel').onclick = () => { $('learnt-modal').hidden = true; };
    $('learnt-save').onclick = async () => {
      $('learnt-save').disabled = true;
      let next = skip;
      if (!free) { const idx = order.findIndex(([, t]) => t === pos); next = new Set(idx >= 0 ? order.slice(idx + 1).map(([, t]) => t) : []); }
      await saveSkipped(next); await saveClassPos(free ? null : pos, free ? null : step);
      $('learnt-save').disabled = false; $('learnt-modal').hidden = true;
      toast(free ? 'Saved. Practice only uses the topics you ticked.' : pos ? `Saved. You're up to <b>${esc(topicName(pos))}</b>.` : 'Saved. Every topic is in.');
      if (location.hash.startsWith('#progress')) renderProgress(); else renderBuild();
    };
  }
  async function saveClassPos(t, st, subj = state.subject) {
    if (state.preview) { previewFlags.pos = { ...(previewFlags.pos || {}), [subj]: t }; previewFlags.step = { ...(previewFlags.step || {}), [subj]: st }; return; }
    const all = { ...(state.user?.user_metadata?.class_pos || {}), [subj]: t }, steps = { ...(state.user?.user_metadata?.class_step || {}), [subj]: st };
    const { data, error } = await sb.auth.updateUser({ data: { class_pos: all, class_step: steps } });
    if (!error && data?.user) state.user = data.user;
  }

  // ---------- personalise: photo, colour, theme, background ----------
  const ACCENTS = { blue: '#2f5be8', green: '#1fa45a', purple: '#7c4dde', orange: '#f07818', pink: '#e0457b', teal: '#0f9aa8', graphite: '#3a3f4a' };
  const BGS = [['plain', 'Plain'], ['dots', 'Dots'], ['grid', 'Grid'], ['lined', 'Lined'], ['photo', 'Photo']];
  const PREF0 = { theme: 'light', accent: 'blue', bg: 'dots', av: 0, bgv: 0 };   // dots unless they pick another background
  const prefs = () => ({ ...PREF0, ...(state.user?.user_metadata?.prefs || {}) });
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  let media = {};      // signed links to this student's photos
  let meP = null;      // prefs being edited
  function applyPrefs(p = meP || prefs()) {
    const r = document.documentElement;
    r.dataset.theme = p.theme === 'dark' || (p.theme === 'auto' && darkMQ.matches) ? 'dark' : 'light';
    if (p.accent && p.accent !== 'blue') r.dataset.accent = p.accent; else delete r.dataset.accent;
    const bg = p.bg === 'photo' && !media.bg ? 'dots' : p.bg;
    if (bg && bg !== 'plain') r.dataset.bg = bg; else delete r.dataset.bg;
    r.style.setProperty('--bg-photo', media.bg ? `url("${media.bg}")` : 'none');
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = getComputedStyle(r).getPropertyValue('--bg').trim() || '#fbfaf7';
    try { localStorage.setItem('tb_prefs', JSON.stringify({ theme: p.theme, accent: p.accent, bg: p.bg })); } catch (e) {}
    drawAvatar();
  }
  darkMQ.addEventListener && darkMQ.addEventListener('change', () => applyPrefs());
  const mediaName = (k, v) => `${state.user.id}/${k === 'av' ? 'avatar' : 'background'}-${v}`;
  async function loadMedia(p = prefs()) {
    media = {};
    if (!state.user) return;
    let cache = {}; try { cache = JSON.parse(localStorage.getItem('tb_media') || '{}'); } catch (e) {}
    const want = [['av', p.av], ['bg', p.bg === 'photo' ? p.bgv : 0]].filter(([, v]) => v);
    await Promise.all(want.map(async ([k, v]) => {
      const c = cache[k], path = mediaName(k, v);
      if (c && c.path === path && c.exp > Date.now() + 36e5) { media[k] = c.url; return; }
      const { data } = await sb.storage.from('profile').createSignedUrl(path, 604800);
      if (data?.signedUrl) { media[k] = data.signedUrl; cache[k] = { path, url: data.signedUrl, exp: Date.now() + 6048e5 }; }
    }));
    try { localStorage.setItem('tb_media', JSON.stringify(cache)); } catch (e) {}
  }
  function initials() {
    const n = (myName() || (state.user?.email || '?').split('@')[0]).split(/[\s._\d]+/).filter(Boolean);
    return (((n[0] || '?')[0]) + (n[1] ? n[1][0] : '')).toUpperCase();
  }
  function drawAvatar() {
    const pr = myProfile();
    const html = media.av ? `<img src="${media.av}" alt="">` : esc(initials());
    $('me-av').innerHTML = html;
    const usePet = pr.pet && (pr.pet !== 'photo' || media.av);   // their pet or photo, with its border, is who they are around the site
    $('account-btn').innerHTML = usePet ? petBadge(pr, 'sm') : html;
    $('account-btn').classList.toggle('has-pet', !!usePet);
    if ($('home-pet')) $('home-pet').innerHTML = petBadge(usePet ? pr : { ...pr, pet: null }, 'md');
    $('me-av-rm').hidden = !media.av;
  }
  async function savePrefs(p) {
    if (state.preview || !state.user) return;
    const { data, error } = await sb.auth.updateUser({ data: { prefs: p } });
    if (!error && data?.user) state.user = data.user;
  }
  async function shrinkImage(file, max, square) {
    const bmp = await createImageBitmap(file);
    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
    if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
    const k = Math.min(1, max / Math.max(sw, sh)), cv = document.createElement('canvas');
    cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    cv.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    let blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
    return blob;
  }
  async function uploadMedia(kind, file) {
    let blob;
    try { blob = await shrinkImage(file, kind === 'av' ? 320 : 1920, kind === 'av'); } catch (e) { throw new Error("Couldn't open that image. Try a JPG or PNG."); }
    if (!blob) throw new Error("Couldn't open that image. Try a JPG or PNG.");
    if (blob.size > 2e6) throw new Error('That image is too big. Try a smaller one.');
    const v = Date.now(), old = kind === 'av' ? meP.av : meP.bgv;
    const { error } = await sb.storage.from('profile').upload(mediaName(kind, v), blob, { contentType: blob.type, upsert: true });
    if (error) throw error;
    if (old) sb.storage.from('profile').remove([mediaName(kind, old)]);
    if (kind === 'av') meP.av = v; else { meP.bgv = v; meP.bg = 'photo'; }
    await loadMedia(meP);
  }
  function drawBgOpts() {
    const g = $('me-bg'); g.innerHTML = '';
    BGS.forEach(([k, label]) => {
      const b = mk('button', 'bgopt' + (meP.bg === k && (k !== 'photo' || media.bg) ? ' on' : ''));
      b.dataset.v = k;
      const photo = k === 'photo' && media.bg;
      b.innerHTML = `<i${photo ? ` style="background-image:url('${esc(media.bg)}')"` : ''}>${k === 'photo' && !photo ? '+' : ''}</i>${k === 'photo' && meP.bg === 'photo' && photo ? 'Change' : label}`;
      b.onclick = () => {
        if (k === 'photo' && (!media.bg || meP.bg === 'photo')) return $('me-bg-file').click();
        meP.bg = k; drawBgOpts(); applyPrefs(meP);
      };
      g.appendChild(b);
    });
  }
  function openMe() {
    meP = prefs();
    $('account-menu').hidden = true; $('me-error').hidden = true; $('me-status').textContent = '';
    const sw = $('me-accent'); sw.innerHTML = '';
    Object.entries(ACCENTS).forEach(([k, col]) => {
      const b = mk('button', 'swatch' + (meP.accent === k ? ' on' : ''));
      b.style.setProperty('--sw', col); b.title = k[0].toUpperCase() + k.slice(1); b.setAttribute('aria-label', b.title);
      b.onclick = () => { meP.accent = k; sw.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b)); applyPrefs(meP); };
      sw.appendChild(b);
    });
    document.querySelectorAll('#me-theme button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === meP.theme);
      b.onclick = () => { meP.theme = b.dataset.v; document.querySelectorAll('#me-theme button').forEach(x => x.classList.toggle('on', x === b)); applyPrefs(meP); };
    });
    drawBgOpts(); drawAvatar();
    $('me-modal').hidden = false;
  }
  async function meUpload(kind, f) {
    $('me-status').textContent = 'Uploading...'; $('me-error').hidden = true;
    try { await uploadMedia(kind, f); await savePrefs(meP); applyPrefs(meP); drawBgOpts(); $('me-status').textContent = 'Saved'; }
    catch (e) { $('me-error').textContent = e.message || String(e); $('me-error').hidden = false; $('me-status').textContent = ''; }
  }
  async function closeMe() {
    if (!meP) return;
    const p = meP; meP = null; $('me-modal').hidden = true;
    applyPrefs(p); await savePrefs(p);
  }
  $('open-me').onclick = openMe;
  $('me-av-up').onclick = () => $('me-av-file').click();
  $('me-av-file').onchange = (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) meUpload('av', f); };
  $('me-bg-file').onchange = (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) meUpload('bg', f); };
  $('me-av-rm').onclick = async () => {
    const old = meP.av; meP.av = 0; delete media.av; applyPrefs(meP);
    if (old) sb.storage.from('profile').remove([mediaName('av', old)]);
    await savePrefs(meP);
  };
  $('me-done').onclick = closeMe;
  $('me-modal').addEventListener('click', (ev) => { if (ev.target.id === 'me-modal') closeMe(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('me-modal').hidden) closeMe(); });


  // ---------- Trialbank Pro: monthly or annual, through Stripe ----------
  const PRO = C.pro || { monthly: 12.99, annual: 99 };
  const money = (v) => '$' + (Number.isInteger(v) ? v : v.toFixed(2));
  async function openPro(from) {
    $('account-menu').hidden = true;
    let pro = state.pro;
    try { const { data } = await sb.rpc('my_pro'); if (data) pro = state.pro = data; } catch {}
    const active = pro?.active, onSale = pro?.sale === 'on' || (pro?.sale === 'admin' && adminOn());
    const pass = pro?.pass && !active, trialsOpen = pro?.trials === 'on' || (pro?.trials === 'admin' && adminOn());
    const canTrial = trialsOpen && !active && !pro?.pass && !pro?.trial_used;
    let code = '';
    if (trialsOpen || onSale) { try { const { data } = await sb.rpc('my_friend_code'); code = data || ''; } catch {} }
    const link = code ? `${location.origin}${location.pathname}#friend=${code}` : '';
    const perMonth = PRO.annual / 12, save = Math.round(100 * (1 - PRO.annual / (PRO.monthly * 12)));
    const end = pro?.period_end ? new Date(pro.period_end).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    let usage = '';
    if (active || pass) {
      const [t, mm] = await Promise.all([loadTuLeft(), loadMyMarks().catch(() => myMarks)]);
      const ref = t?.refills || (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString('en-CA'); })();
      const row = (label, n, of, note) => { const pc = pace(of - n, of, ref);
        return `<div class="pro-use"><span>${label}</span><b>${n}<small> of ${of} left</small></b><span class="pro-use-bar" style="--tick:${pc.tick}%"><i style="width:${Math.round(100 * n / of)}%"></i></span><span class="small pace-${pc.cls}">${pc.text}${note ? ` ${note}` : ''}</span></div>`; };
      usage = `<div class="pro-usage"><p class="small muted">This month · refills ${refillDay(ref)} · the tick marks an even pace</p>` +
        (t && !t.unlimited ? row('Tutor messages', t.left, t.allowance) : '') +
        row('Papers marked for you', mm?.pro_left ?? 0, mm?.pro_total || 5, mm?.balance ? `Plus ${mm.balance} bought, which never expire.` : '') + '</div>';
    }
    const m = mk('div', 'modal buy pro-modal');
    m.innerHTML = `<div class="modal-card buy-card pro-card" role="dialog" aria-modal="true" aria-labelledby="pro-h">
      <button class="link buy-x" data-k="" aria-label="Close">✕</button>
      <p class="pro-kick">Trialbank Pro</p>
      <h2 id="pro-h">${active ? "You're on Pro" : pass ? `${pro.mini ? 'Pro Mini' : 'Free Pro'} until ${shortDay(pro.pass_end)}` : from === 'tutor' ? 'The tutor comes with Pro' : from === 'mistake' ? 'Pro explains every mistake' : from === 'paper' ? 'Unlimited practice papers with Pro' : from === 'band' ? 'See what\'s holding your band back' : 'Study with your own tutor'}</h2>
      <ul class="pro-feats">
        <li><b>AI tutor in every subject</b><span>One step at a time on real past questions. 300 messages a month.</span></li>
        <li><b>Explain my mistake</b><span>One tap from any wrong answer into the tutor, on that exact question.</span></li>
        <li><b>Your predicted band, unpacked</b><span>Your likely mark and the topics costing you the most.</span></li>
        <li><b>Unlimited practice papers</b><span>Built around your weak spots, with solutions at the back.</span></li>
        <li><b>5 papers marked every month</b><span>On top of anything you've bought.</span></li>
        <li><b>Pro pets and looks</b><span>Unicorn, dragon and phoenix, the Aurora banner and the Pro border.</span></li>
      </ul>
      ${canTrial ? `<button class="primary pro-trial" data-k="trial">Try Pro free for ${pro.trial_days || 7} days</button>
        <p class="small muted pro-trial-note">No card needed. Your free week has 60 tutor messages and 1 marked paper.</p>` : ''}
      ${pass ? `${pro.mini ? `<p class="small muted pro-mini-note">Pro Mini is every Pro feature in small amounts. Go Pro for 10 times the tutor, 5 marked papers a month, unlimited practice papers and the Pro looks.</p>` : ''}${usage}${onSale ? `<p class="pro-keep">${pro.mini ? 'Get the full thing' : 'Keep Pro after your free week'}</p>` : ''}` : ''}
      ${active ? `${usage}<p class="pro-status">${pro.plan === 'annual' ? 'Annual' : 'Monthly'} plan · ${pro.cancel_at_period_end ? `ends ${end}` : `renews ${end}`}</p>
        <button class="primary" data-k="portal">Manage subscription</button>`
      : onSale ? `<div class="pro-plans${canTrial ? ' after-trial' : ''}">
          <button class="pro-plan best" data-k="annual"><span class="pro-tag">Best value · save ${save}%</span><b>${money(Math.round(perMonth * 100) / 100)}<small>/month</small></b><span>Billed ${money(PRO.annual)} a year</span><em>Go annual</em></button>
          <button class="pro-plan" data-k="monthly"><span class="pro-tag"></span><b>${money(PRO.monthly)}<small>/month</small></b><span>Cancel any time</span><em>Go monthly</em></button>
        </div><p class="small muted">Secure payment with Stripe. Card or Apple Pay. Cancel any time from your profile.</p>`
      : (canTrial || pass) ? '' : '<p class="pro-status">Pro opens soon.</p>'}
      ${packsOpen() ? `<p class="small muted pro-packs">${active || pass ? 'Running low?' : 'Just want the tutor?'} <button class="link small" data-k="packs">Buy tutor messages</button> from A$4.99. They never expire.</p>` : ''}
      ${link ? `<div class="pro-ref">
        <p class="pro-ref-h">Invite friends, get Pro Mini free</p>
        <ol class="pro-ref-steps"><li>Send a friend your link.</li><li>They sign up and answer 10 questions.</li><li><b>You both get ${pro.referral_days || 7} days of Pro Mini, free.</b></li></ol>
        <p class="small muted"><b>Pro Mini</b> is every Pro feature in small amounts: ${pro.referral_msgs || 30} tutor messages and 1 marked paper a month, 3 practice papers a week, Explain my mistake and your full band breakdown.</p>
        <p class="small muted">Up to ${pro.referral_max || 3} friends (${(pro.referral_max || 3) * (pro.referral_days || 7)} free days). ${(pro.referred || 0) >= (pro.referral_max || 3) ? '<b>You\'ve earned them all.</b> Friends who join still get their week.' : 'Free days stack on top of any you already have.'}${pro.referred || pro.referral_pending ? ` <b class="pro-ref-n">${pro.referred} of ${pro.referral_max || 3} friends done${pro.referral_pending ? `, ${pro.referral_pending} still answering` : ''}.</b>` : ''}</p>
        <div class="pro-ref-row"><input readonly value="${esc(link)}" aria-label="Your invite link"><button class="ghost" data-k="copy">Copy link</button></div></div>` : ''}
    </div>`;
    const done = () => { m.classList.add('out'); setTimeout(() => m.remove(), 180); document.removeEventListener('keydown', k); };
    const k = (ev) => { if (ev.key === 'Escape') done(); };
    m.onclick = async (ev) => {
      if (ev.target === m) return done();
      const b = ev.target.closest('[data-k]'); if (!b) return;
      if (!b.dataset.k) return done();
      if (b.dataset.k === 'packs') { done(); return openTutorPacks(); }
      if (b.dataset.k === 'copy') {
        try { await navigator.clipboard.writeText(link); b.textContent = 'Copied'; } catch { m.querySelector('.pro-ref input').select(); }
        if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({ title: 'Trialbank', text: 'Join me on Trialbank and we both get a free week of Pro', url: link }).catch(() => {});
        return;
      }
      b.disabled = true;
      if (b.dataset.k === 'trial') {
        const { data, error } = await sb.rpc('start_trial');
        if (error) { b.disabled = false; return toast(esc(error.message.replace(/^.*?: /, ''))); }
        done(); await checkAdmin();
        toast(`<b>Pro is on</b> until ${shortDay(data)}. Try the tutor first.`, 7000);
        window.Juice?.sfx?.fanfare?.();
        location.hash = '#tutor'; return;
      }
      const body = b.dataset.k === 'portal' ? { portal: true } : { plan: b.dataset.k };
      toast(b.dataset.k === 'portal' ? 'Opening your subscription…' : 'Opening secure checkout…');
      const { data, error } = await sb.functions.invoke('buy-marks', { body });
      if (error || !data?.url) { let msg = error?.message || 'Could not start the payment.'; try { msg = (await error.context.json()).error || msg; } catch {} b.disabled = false; return toast(esc(msg)); }
      goStripe(data.url);
    };
    document.addEventListener('keydown', k); document.body.appendChild(m);
  }
  $('open-pro').onclick = () => openPro();
  const shortDay = (d) => new Date(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  function drawProMenu() {
    const b = $('open-pro'); if (!b) return;
    const p = state.pro;
    b.textContent = p?.pass && !p?.active && p.pass_end ? `${p.mini ? 'Pro Mini' : 'Trialbank Pro'} · free until ${shortDay(p.pass_end)}` : 'Trialbank Pro';
  }
  // back from Stripe after subscribing: wait for the webhook to switch the account to Pro, then celebrate
  function afterPro() {
    const plan = new URLSearchParams(location.search).get('pro');
    if (!plan) return;
    history.replaceState(null, '', location.pathname + location.hash);
    toast('Payment received. Switching on Pro…', 8000);
    let tries = 0;
    const poll = setInterval(async () => {
      if (!state.user) return;
      const { data: rel } = await sb.rpc('my_release');
      if (rel?.level === 'pro' || rel?.level === 'admin' || ++tries > 25) { clearInterval(poll); await checkAdmin(); route(); if (rel?.level !== 'pro' && rel?.level !== 'admin') toast("Your payment went through. Pro is taking a moment to switch on; refresh in a minute. If it doesn't, contact Jayden.", 9000); }
    }, 2000);
  }
  setTimeout(() => afterPro(), 0);

  // ---------- auto-marking allowance: "3 of 4 left this month" ----------
  const PER_PAPER_USD = 0.45;            // rough cost of marking one paper
  // ---------- marking packs: bought auto-marks, separate from the free monthly ones ----------
  let myMarks = { balance: 0, bought: false, can_buy: false };
  async function loadMyMarks() {
    if (!state.user || state.preview) return myMarks;
    const { data, error } = await sb.rpc('my_marks');
    if (!error && data) myMarks = data;
    $('buy-marks').hidden = !myMarks.can_buy;
    return myMarks;
  }
  function packPicker() {
    const P = C.packs || [];
    const per = P.map(p => parseFloat(String(p.price).replace(/[^0-9.]/g, '')) / p.marks);
    const best = per.indexOf(Math.min(...per));
    return new Promise(res => {
      const m = mk('div', 'modal buy');
      m.innerHTML = `<div class="modal-card buy-card" role="dialog" aria-modal="true" aria-labelledby="buy-h">
        <button class="link buy-x" data-k="" aria-label="Close">✕</button>
        <h2 id="buy-h">Mark more papers</h2>
        <p class="buy-sub">Each pack auto-marks that many full papers.${myMarks.balance ? ` You have <b>${myMarks.balance}</b> paper${myMarks.balance === 1 ? '' : 's'} left.` : ''}</p>
        <div class="buy-packs">${P.map((p, i) => `<button class="buy-pack${i === 1 ? ' pop' : ''}" data-k="${p.marks}" style="--i:${i}">
          <span class="buy-tag">${i === 1 ? 'Most popular' : i === best ? 'Best value' : ''}</span>
          <span class="buy-n">${p.marks}</span><span class="buy-u">papers</span>
          <span class="buy-price">${esc(p.price)}</span><span class="buy-each">${Math.round(per[i] * 100)}c a paper</span>
          <span class="buy-go">Buy</span></button>`).join('')}</div>
        <ul class="buy-points"><li>One-off payment, no subscription</li><li>Marks never expire</li><li>Card or Apple Pay, via Stripe</li></ul>
      </div>`;
      const done = (v) => { m.classList.add('out'); setTimeout(() => m.remove(), 180); document.removeEventListener('keydown', k); res(v); };
      const k = (ev) => { if (ev.key === 'Escape') done(null); };
      m.onclick = (ev) => { if (ev.target === m) return done(null); const b = ev.target.closest('[data-k]'); if (b) done(b.dataset.k || null); };
      document.addEventListener('keydown', k); document.body.appendChild(m);
      m.querySelector('.buy-pack.pop')?.focus();
    });
  }
  async function openBuy() {
    const P = C.packs || [];
    if (!P.length) return;
    const pick = await packPicker();
    if (!pick) return;
    toast('Opening secure checkout…');
    const { data, error } = await sb.functions.invoke('buy-marks', { body: { pack: pick } });
    if (error || !data?.url) {
      let msg = error?.message || 'Could not start the payment.';
      try { msg = (await error.context.json()).error || msg; } catch {}
      return toast(esc(msg));
    }
    goStripe(data.url);               // Stripe's own payment page; it sends them back here afterwards
  }
  $('buy-marks').onclick = () => { $('account-menu').hidden = true; openBuy(); };
  setTimeout(() => afterCheckout(), 0);   // back from Stripe (defined further down, once everything it uses exists)
  // how many papers each kind of mark covers right now
  async function markCounts() {
    const [{ data: use }, { data: pool }, m] = await Promise.all([sb.rpc('my_automark_usage'), sb.rpc('automark_pool'), loadMyMarks()]);
    const u = (use && use[0]) || { used_usd: 0, limit_usd: 0, unlimited: false };
    const P = (x) => Math.floor(Number(x) / PER_PAPER_USD);
    const pl = pool || { cap_usd: 0, spent_usd: 0, enabled: false };
    const poolTotal = P(pl.cap_usd), poolLeft = Math.max(0, Math.min(poolTotal, P(Number(pl.cap_usd) - Number(pl.spent_usd))));
    const freeOn = !!pl.enabled && (adminOn() || can('automark'));
    const freeTotal = P(u.limit_usd), freeLeft = Math.max(0, Math.min(freeTotal, P(Number(u.limit_usd) - Number(u.used_usd))));
    const free = u.unlimited ? null : freeOn ? Math.min(freeLeft, poolLeft) : 0;
    return { bought: m.balance || 0, pro: m.pro_left || 0, free, freeLeft, freeTotal, freeOn, poolLeft, poolTotal, unlimited: !!u.unlimited, canBuy: !!m.can_buy,
      total: (m.balance || 0) + (m.pro_left || 0) + (free || 0) };
  }
  function drawNavBadge(c) {
    const b = $('nav-marks'); if (!b) return;
    b.hidden = !c || c.unlimited; if (c && !c.unlimited) { b.textContent = c.total > 99 ? '99+' : String(c.total); b.classList.toggle('zero', c.total === 0); }
  }
  let markPapers = [];
  async function renderMark() {
    const [c, { data: ps }] = await Promise.all([markCounts(),
      sb.from('papers').select('id, slug, subject, school, year, difficulty, scanned, release_pct').eq('subject', state.subject).order('year', { ascending: false }).order('school')]);
    drawNavBadge(c);
    markPapers = (ps || []).filter(seePaper).filter(p => !p.scanned && !isHsc(p));
    const sel = $('mark-paper'), keep = sel.value;
    sel.innerHTML = '<option value="">Pick the paper</option>' + markPapers.map(p => `<option value="${p.id}">${esc(p.school)} ${p.year}</option>`).join('');
    sel.value = keep;
    drawMarkSearch(); drawOwnHistory();
    const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1, 1);
    const reset = next.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    const lite = state.release?.lite && !adminOn();
    const tile = (n, label, sub, cls = '') => `<div class="mk-tile ${cls}"><b>${n}</b><span>${label}</span><small>${sub}</small></div>`;
    const tiles = [
      tile(c.bought, 'Bought', 'Never expire'),
      c.pro || state.release?.level === 'pro' ? tile(c.pro, 'Pro', `Refill on ${reset}`) : '',
      c.unlimited ? tile('∞', 'Free', 'Admin') : c.freeOn ? tile(`${c.freeLeft}<em>/${c.freeTotal}</em>`, 'Free this month', `Back on ${reset}`)
        : tile('–', 'Free', lite ? 'Unlocks after trials' : 'Not on your plan', 'off'),
    ].join('');
    const pct = c.poolTotal ? Math.round(100 * c.poolLeft / c.poolTotal) : 0;
    const chip = $('mk-chip'); chip.hidden = false;
    chip.className = 'mk-chip' + (!c.unlimited && !c.total ? ' out' : '');
    chip.innerHTML = c.unlimited ? '<b>∞</b> papers' : `<b>${c.total}</b> paper${c.total === 1 ? '' : 's'} left`;
    chip.onclick = () => $('mk-balance').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('mk-balance').innerHTML = `<h2>Your marking</h2>
      <div class="mk-big"><b>${c.unlimited ? '∞' : c.total}</b><span>${c.unlimited ? 'unlimited marks (admin)' : `paper${c.total === 1 ? '' : 's'} you can get marked right now`}</span></div>
      <div class="mk-tiles">${tiles}</div>
      <div class="mk-pool">
        <div class="between small"><span><b>Shared free pool</b> · everyone's free marking comes from here</span><span>${c.poolLeft} of ${c.poolTotal} papers left</span></div>
        <div class="mk-bar"><i style="width:${pct}%"></i></div>
        <p class="small muted">Resets on ${reset}. Bought and Pro papers are used first, so the free pool lasts longer for everyone.</p>
      </div>
      ${c.canBuy ? '<button class="primary mk-buy" id="mk-buy">Mark more papers</button>' : lite ? '<p class="small muted mk-later">Marking packs open after trials.</p>' : ''}`;
    if ($('mk-buy')) $('mk-buy').onclick = openBuy;
  }
  async function drawMarkLeft() {
    if (!state.user || state.preview) return;
    const [{ data, error }, m] = await Promise.all([sb.rpc('my_automark_usage'), loadMyMarks()]);
    const u = !error && data && data[0]; if (!u) return;
    let text, out = false;
    if (m.pro_left > 0) text = `Upload your working · ${m.pro_left} Pro paper${m.pro_left === 1 ? '' : 's'} left this month` + (m.balance > 0 ? ` + ${m.balance} bought` : '');
    else if (m.balance > 0) text = `Upload your working · ${m.balance} bought paper${m.balance === 1 ? '' : 's'} left`;
    else if (u.unlimited) text = 'Upload your working · unlimited (admin)';
    else {
      const total = Math.max(1, Math.floor(Number(u.limit_usd) / PER_PAPER_USD));
      const left = Math.max(0, Math.min(total, Math.floor((Number(u.limit_usd) - Number(u.used_usd)) / PER_PAPER_USD)));
      out = left === 0;
      const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1, 1);
      text = out ? `Used up · back on ${next.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}` : `${left} of ${total} left this month`;
    }
    ['mark-left', 'paper-mark-left'].forEach(id => { const el = $(id); if (el) { el.textContent = text; el.classList.toggle('used-up', out); } });
    markCounts().then(drawNavBadge, () => {});
  }

  // ---------- Daily 5: five questions a day per subject, picked by spaced repetition (Albert's design) ----------
  // every answer moves its topic: right lifts the topic's level (1-5) and pushes it further out, wrong drops it and brings it back tomorrow
  const GAPS = [1, 2, 4, 7, 14, 30];
  const addDays = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const qLevel = (x) => x.level || 3;
  async function loadSrs(subj = state.subject) {
    if (state.preview) return (previewFlags.srs || {})[subj] || {};
    const { data, error } = await sb.from('topic_srs').select('*').eq('subject', subj);
    if (error) { console.warn('srs', error.message); return {}; }
    return Object.fromEntries((data || []).map(r => [r.topic, r]));
  }
  // what one answer does to its topic; returns the change so the end card can say what moved
  async function srsAnswer(x, score, outOf) {
    if (!x.topic || !outOf) return null;
    const subj = x.papers?.subject || state.subject, today = dayOf();
    const all = await loadSrs(subj);
    const old = all[x.topic] || { level: 1, box: 0, right_n: 0, wrong_n: 0 };
    const r = { ...old }, ql = qLevel(x);
    if (score >= outOf) { r.box = Math.min(GAPS.length - 1, (old.box || 0) + 1); r.right_n = (old.right_n || 0) + 1; if (ql >= (old.level || 1) - 1) r.level = Math.min(5, (old.level || 1) + 1); }
    else if (score === 0) { r.box = 0; r.wrong_n = (old.wrong_n || 0) + 1; if (ql <= (old.level || 1)) r.level = Math.max(1, (old.level || 1) - 1); }
    else { r.box = Math.max(0, (old.box || 0) - 1); }
    r.due = addDays(today, GAPS[r.box]);
    const row = { user_id: state.user.id, subject: subj, topic: x.topic, level: r.level || 1, box: r.box, due: r.due, right_n: r.right_n || 0, wrong_n: r.wrong_n || 0, updated_at: new Date().toISOString() };
    if (state.preview) { const p = previewFlags.srs = previewFlags.srs || {}; (p[subj] = p[subj] || {})[x.topic] = row; }
    else { const { error } = await sb.from('topic_srs').upsert(row); if (error) console.warn('srs not saved', error.message); }
    return { topic: x.topic, from: old.level || 1, to: row.level, days: GAPS[r.box], right: score >= outOf, fresh: !all[x.topic] };
  }
  async function getDaily(subj = state.subject) {
    const day = dayOf();
    if (state.preview) return ((previewFlags.daily || {})[subj] || {}).day === day ? previewFlags.daily[subj] : null;
    const { data } = await sb.from('daily_sets').select('*').eq('subject', subj).eq('day', day).maybeSingle();
    return data || null;
  }
  async function saveDaily(row) {
    if (state.preview) { (previewFlags.daily = previewFlags.daily || {})[row.subject] = row; return; }
    const { error } = await sb.from('daily_sets').upsert({ ...row, user_id: state.user.id });
    if (error) console.warn('daily not saved', error.message);
  }
  // pick today's five: up to 2 questions they got wrong, then topics due back, then new topics, each at the student's level for that topic
  async function buildDaily(subj = state.subject) {
    await loadStepBlock(subj); const today = dayOf(), skip = skipped(subj), tooHard = blockedQs();
    // three requests at once: where they are on each topic, what they've answered, and a random sample of every question they can see
    const [srs, { data: att }, { data: poolRows, error: poolErr }] = await Promise.all([
      loadSrs(subj),
      sb.from('attempts').select('question_id, score, out_of, created_at, questions!inner(topic, papers!inner(subject))')
        .eq('user_id', state.user.id).eq('questions.papers.subject', subj).order('created_at', { ascending: false }).limit(1000)
        .then(r => state.preview ? { data: [] } : r),
      sb.rpc('daily_pool', { subj }),
    ]);
    if (poolErr) throw poolErr;
    const seen = new Set(), wrongIds = [];
    (att || []).forEach(a => {
      if (seen.has(a.question_id)) return; seen.add(a.question_id);
      if (a.score < a.out_of && a.created_at.slice(0, 10) <= addDays(today, -2) && !skip.has(a.questions.topic)) wrongIds.push(a.question_id);
    });
    const ok = (x) => !tooHard.has(x.id) && !skip.has(x.topic);
    const mode = dailyMode(), want = (x) => mode === 'mix' || (mode === 'mcq') === (x.type === 'mcq');   // the student's choice of question types
    const pickIds = new Set(), out = [];
    const take = (x, kind) => { if (x && !pickIds.has(x.id) && out.length < 5) { pickIds.add(x.id); out.push({ id: x.id, topic: x.topic, kind }); return true; } return false; };
    // 1. redo: wrong at least two days ago, a topic that's due first
    if (wrongIds.length) {
      const { data } = await sb.from('questions').select(QCOLS).in('id', wrongIds.slice(0, 100)).eq('papers.subject', subj);
      const due = (x) => (srs[x.topic]?.due || today) <= today;
      const redo = shuffle((data || []).filter(x => hasKey(x) && !x.syllabus_note && (x.marks || 1) <= 3 && ok(x) && want(x))).sort((a, b) => due(b) - due(a));
      const used = new Set();
      for (const x of redo) { if (out.length >= 2) break; if (!used.has(x.topic) && take(x, 'redo')) used.add(x.topic); }
    }
    // the sample, grouped by topic
    const byTopic = {};
    (poolRows || []).filter(ok).forEach(x => { (byTopic[x.topic] = byTopic[x.topic] || []).push(x); });
    const pick = (t, lvl) => (byTopic[t] || []).filter(x => !pickIds.has(x.id))
      .sort((a, b) => (want(b) - want(a)) || Math.abs(qLevel(a) - lvl) - Math.abs(qLevel(b) - lvl) || seen.has(a.id) - seen.has(b.id))[0];
    // 2. topics due back today, most overdue and most often wrong first; 3. new topics; 4. whatever comes back soonest
    const allTopics = Object.keys(byTopic);
    const dueT = Object.values(srs).filter(r => r.due <= today && byTopic[r.topic]).sort((a, b) => a.due.localeCompare(b.due) || b.wrong_n - a.wrong_n).map(r => r.topic);
    const newT = shuffle(allTopics.filter(t => !srs[t]));
    const laterT = Object.values(srs).filter(r => r.due > today && byTopic[r.topic]).sort((a, b) => a.due.localeCompare(b.due)).map(r => r.topic);
    const used = new Set(out.map(o => o.topic));
    const nNew = Math.min(newT.length, Object.keys(srs).length ? 1 : 5);   // one new topic a day once they've started, all new on day one
    const room = 5 - out.length;
    const reviews = dueT.filter(t => !used.has(t)).slice(0, Math.max(0, room - nNew)).map(t => [t, 'review']);
    const queue = [...reviews, ...newT.map(t => [t, 'new']), ...dueT.map(t => [t, 'review']), ...laterT.map(t => [t, 'review'])];
    const lvlFor = (t, kind) => kind === 'new' ? 1 + (Math.random() < 0.5) : (srs[t]?.level || 1);
    for (const [t, kind] of queue) { if (out.length >= 5) break; if (!used.has(t) && take(pick(t, lvlFor(t, kind)), kind)) used.add(t); }   // one per topic first
    for (const [t, kind] of queue) { if (out.length >= 5) break; take(pick(t, lvlFor(t, kind)), kind); }                                  // few topics: a second from each
    if (!out.length) throw new Error('No questions to pick from yet. Untick some "not learnt" topics.');
    const { data: full, error } = await sb.from('questions').select(QCOLS).in('id', out.map(o => o.id));
    if (error) throw error;
    const by = Object.fromEntries((full || []).map(x => [x.id, x]));
    const keep = out.filter(o => by[o.id]);
    const row = { subject: subj, day: today, question_ids: keep.map(o => o.id), kinds: keep.map(o => o.kind), answered: [], score: 0, out_of: 0, finished_at: null };
    await saveDaily(row);
    return { row, qs: keep.map(o => by[o.id]) };
  }
  async function startDaily(subj = state.subject) {
    let row = await getDaily(subj), qs;
    if (!row) ({ row, qs } = await buildDaily(subj));
    else {
      const { data, error } = await sb.from('questions').select(QCOLS).in('id', row.question_ids);
      if (error) throw error;
      const by = Object.fromEntries((data || []).map(x => [x.id, x]));
      qs = row.question_ids.map(id => by[id]).filter(Boolean);
    }
    const kinds = Object.fromEntries(row.question_ids.map((id, k) => [id, row.kinds?.[k] || 'review']));
    const done = new Set(row.answered || []);
    const left = row.finished_at ? qs : qs.filter(x => !done.has(x.id));   // done for today: a replay, which still counts for spaced repetition
    if (!left.length) throw new Error('Nothing left in today\'s 5.');
    await startSet(left);
    state.set.title = "Today's 5 done";
    state.set.daily = { row, kinds, replay: !!row.finished_at, changes: [], saving: Promise.resolve() };
  }
  async function dailyMark(x, score, outOf) {
    const d = state.set?.daily; if (!d || d.replay) return;
    const r = d.row;
    if (!r.answered.includes(x.id)) r.answered = [...r.answered, x.id];
    r.score += score; r.out_of += outOf;
    d.saving = d.saving.then(() => saveDaily(r));   // in order, so a slow save never lands after a later one
    return d.saving;
  }
  async function finishDaily() {
    const d = state.set.daily, r = d.row;
    if (d.replay) return null;
    r.finished_at = new Date().toISOString();
    await (d.saving = d.saving.then(() => saveDaily(r)));
    return await bumpStreak();
  }
  function dailyPopup(st) {
    const d = state.set.daily, r = d.row, n = st?.n || 0;
    const by = {};   // where each topic ended up: its first level today against its last
    d.changes.filter(Boolean).forEach(c => { by[c.topic] = { ...c, from: by[c.topic]?.from ?? c.from }; });
    const items = Object.values(by).sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, 4).map(c =>
      c.to > c.from ? `${esc(topicName(c.topic))} up to level ${c.to}` : c.days <= 1 ? `${esc(topicName(c.topic))} comes back tomorrow` : `${esc(topicName(c.topic))} back in ${c.days} days`);
    const extra = items.length ? `<ul class="tbp-list">${items.map(t => `<li>${t}</li>`).join('')}</ul>` : '';
    const box = celebrate({ kind: 'daily', panel: panel({ kicker: "Today's 5 done", big: '0', sub: 'day streak', mood: 'happy', cls: 'streak-n' }),
      title: `${r.score} / ${r.out_of} today`, body: `Do tomorrow's 5 to make it ${n + 1}.` + (state.friends.length ? `<br><span class="small muted">${friendsDone()}.</span>` : ''), extra, primary: 'See results' });
    payoff(box.card, { at: 250, count: n });
    return box;
  }
  // the Home card: today's five, how far through, or done
  async function drawDaily() {
    const go = $('next-go'), dots = $('daily-dots'), alt = $('daily-alt');
    alt.hidden = true;
    $('daily-mode').textContent = DAILY_MODES[dailyMode()]; $('daily-mode').hidden = false;
    let row = null;
    try { row = await getDaily(); } catch (_) {}
    const st = streakData(), streakLive = st.last === dayOf() || st.last === prevDay(dayOf());
    const total = row ? row.question_ids.length : 5, done = row ? row.answered.length : 0;
    dots.innerHTML = Array.from({ length: total }, (_, k) => `<i class="${k < done ? 'on' : ''}"></i>`).join('');
    dots.hidden = false;
    const late = new Date().toLocaleString('en-AU', { hour: 'numeric', hour12: false, timeZone: 'Australia/Sydney' }) >= 18;
    if (row && row.finished_at) {
      $('next-title').textContent = 'Done for today';
      $('quick-desc').textContent = `${row.score} / ${row.out_of} today. Come back tomorrow to make it ${liveStreak(st) + 1} days.`;
      go.textContent = 'Quick set'; go.onclick = () => $('quick-set').click();
      alt.textContent = "Redo today's 5"; alt.hidden = false;
      alt.onclick = () => busy(async () => { try { await startDaily(); } catch (err) { dailyErr(err); } });
    } else {
      $('next-title').textContent = done ? `${done} of ${total} done` : "Today's 5";
      const kinds = row ? row.kinds : [];
      const rev = kinds.filter(k => k !== 'new').length, nw = kinds.filter(k => k === 'new').length;
      $('quick-desc').textContent = streakLive && st.n > 0 && late ? `Your ${st.n} day streak ends at midnight.`
        : done ? 'Pick up where you left off.'
        : row ? `${rev ? `${rev} coming back` : ''}${rev && nw ? ' · ' : ''}${nw ? `${nw} new` : ''} · about 8 min`
        : state.attempted ? 'Picked from what you got wrong and what is due back. About 8 min.' : 'Five questions to start. About 8 min.';
      go.textContent = done ? 'Continue' : 'Start';
      go.onclick = () => busy(async () => { try { await startDaily(); } catch (err) { dailyErr(err); } });
    }
  }
  const DAILY_MODES = { mix: 'Mixed questions', mcq: 'Multiple choice only', short: 'Written answers only' };
  const dailyMode = () => (state.preview ? previewFlags.dailyMode : state.user?.user_metadata?.daily_mode) || 'mix';
  $('daily-mode').onclick = async () => {
    const k = await choiceBox('Which questions in your Daily 5?', [['mix', 'Mixed', dailyMode() === 'mix' ? 'primary' : 'secondary'],
      ['mcq', 'Multiple choice', dailyMode() === 'mcq' ? 'primary' : 'secondary'], ['short', 'Written answers', dailyMode() === 'short' ? 'primary' : 'secondary']]);
    if (!k || k === dailyMode()) return;
    if (state.preview) previewFlags.dailyMode = k;
    else { const { data, error } = await sb.auth.updateUser({ data: { daily_mode: k } }); if (!error && data?.user) state.user = data.user; }
    // today's set changes too if it hasn't been started; otherwise from tomorrow
    const row = await getDaily().catch(() => null);
    if (row && !row.answered.length) {
      if (state.preview) delete previewFlags.daily[state.subject];
      else await sb.from('daily_sets').delete().eq('user_id', state.user.id).eq('subject', state.subject).eq('day', row.day);
    } else if (row && !row.finished_at) toast(`${DAILY_MODES[k]} from tomorrow's 5.`);
    drawDaily();
  };
  function dailyErr(err) { $('quick-error').textContent = err.message; $('quick-error').hidden = false; }



  // ---------- profile: a pet, a banner colour and a border, unlocked by levelling up ----------
  // pets are Microsoft's Fluent Emoji, flat style (MIT licence), pinned to one commit so they never change under us
  const EMOJI = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets/';
  const PETS = [   // key, name, emoji folder, file, level needed, pro only
    ['cat', 'Cat', 'Cat face', 'cat_face', 1], ['dog', 'Dog', 'Dog face', 'dog_face', 1], ['fox', 'Fox', 'Fox', 'fox', 1],
    ['hamster', 'Hamster', 'Hamster', 'hamster', 2], ['frog', 'Frog', 'Frog', 'frog', 3], ['rabbit', 'Rabbit', 'Rabbit face', 'rabbit_face', 4],
    ['owl', 'Owl', 'Owl', 'owl', 5], ['penguin', 'Penguin', 'Penguin', 'penguin', 6], ['koala', 'Koala', 'Koala', 'koala', 7],
    ['panda', 'Panda', 'Panda', 'panda', 8], ['kangaroo', 'Kangaroo', 'Kangaroo', 'kangaroo', 9], ['hedgehog', 'Hedgehog', 'Hedgehog', 'hedgehog', 10],
    ['otter', 'Otter', 'Otter', 'otter', 11], ['sloth', 'Sloth', 'Sloth', 'sloth', 12], ['turtle', 'Turtle', 'Turtle', 'turtle', 13],
    ['lion', 'Lion', 'Lion', 'lion', 14], ['tiger', 'Tiger', 'Tiger', 'tiger', 15], ['dolphin', 'Dolphin', 'Dolphin', 'dolphin', 16],
    ['octopus', 'Octopus', 'Octopus', 'octopus', 18], ['shark', 'Shark', 'Shark', 'shark', 20],
    ['unicorn', 'Unicorn', 'Unicorn', 'unicorn', 1, 1], ['dragon', 'Dragon', 'Dragon', 'dragon', 1, 1], ['phoenix', 'Phoenix', 'Phoenix bird', 'phoenix_bird', 1, 1],
  ];
  const EGG = ['egg', 'Egg', 'Hatching chick', 'hatching_chick', 1];   // until they pick one
  const COLORS = [   // key, name, css, level, pro
    ['blue', 'Blue', '#3b6cf6', 1], ['green', 'Green', '#1f9d63', 1], ['orange', 'Orange', '#f08c00', 1], ['pink', 'Pink', '#e64980', 2],
    ['purple', 'Purple', '#7048e8', 3], ['teal', 'Teal', '#0c9a99', 4], ['red', 'Red', '#e03131', 6], ['sky', 'Sky', '#2ea8e6', 8],
    ['night', 'Night', '#1f2a44', 10], ['sunset', 'Sunset', 'linear-gradient(135deg,#ff6b4a,#ffb000)', 12],
    ['ocean', 'Ocean', 'linear-gradient(135deg,#0b7bd6,#14c3b5)', 16], ['aurora', 'Aurora', 'linear-gradient(135deg,#6d4aff,#16b6f5,#1fd39a)', 1, 1],
  ];
  const BORDERS = [   // key, name, level, pro
    ['none', 'None', 1], ['bronze', 'Bronze', 3], ['silver', 'Silver', 6], ['gold', 'Gold', 10], ['flame', 'Flame', 14], ['diamond', 'Diamond', 20], ['pro', 'Pro', 1, 1],
  ];
  const isProUser = () => ((state.admin && !state.viewAs) || (state.viewAs ? state.viewAs === 'pro' : state.release?.level === 'pro')) && !(state.pro?.mini && !state.viewAs);   // Pro looks are full Pro only, not Pro Mini
  const myProfile = () => ({ pet: null, color: 'blue', border: 'none', ...(state.preview ? previewFlags.profile : state.user?.user_metadata?.profile), self: true });
  const petOf = (k) => PETS.find(p => p[0] === k) || EGG;
  const petUrl = (k) => { const p = petOf(k); return `${EMOJI}${encodeURIComponent(p[2])}/Flat/${p[3]}_flat.svg`; };   // the simple flat style
  const petImg = (k) => `<img src="${petUrl(k)}" alt="" loading="lazy" draggable="false">`;
  const colorCss = (k) => (COLORS.find(c => c[0] === k) || COLORS[0])[2];
  // a pet on its colour, inside its border; f is { pet, color, border }
  const photoOf = (f) => f.pet === 'photo' ? (f.me || f.self ? media.av : f.photoUrl) : null;
  const petBadge = (f, size = 'md') => { const ph = photoOf(f);
    return `<span class="pet pet-${size} bd-${esc(f.border || 'none')}${ph ? ' is-photo' : ''}" style="--pc:${colorCss(f.color)}">${ph ? `<img class="ph" src="${esc(ph)}" alt="" draggable="false">` : petImg(f.pet === 'photo' ? null : f.pet)}</span>`; };
  const locked = (lvl, pro) => pro ? !isProUser() : (state.lvl?.level || 1) < lvl;
  const lockText = (lvl, pro) => pro ? 'Pro' : `Level ${lvl}`;
  const xpFor = (L) => 50 * L * (L - 1);
  async function myLevel() {
    if (!state.user) return (state.lvl = { xp: 0, level: 1 });
    if (state.preview) return (state.lvl = { xp: previewFlags.xp || 0, level: Math.max(1, Math.floor((1 + Math.sqrt(1 + 4 * (previewFlags.xp || 0) / 50)) / 2)) });
    const { data, error } = await sb.rpc('my_level');
    if (!error && data && data[0]) state.lvl = data[0];
    return state.lvl || { xp: 0, level: 1 };
  }
  async function saveProfile(patch) {
    const pr = { ...myProfile(), ...patch };
    if (state.preview) previewFlags.profile = pr;
    else { const { data, error } = await sb.auth.updateUser({ data: { profile: pr } }); if (!error && data?.user) state.user = data.user; else if (error) toast(esc(error.message)); }
    drawAvatar();
    return pr;
  }
  // everything that opens up between two levels, for the level-up card
  function unlocksBetween(a, b) {
    const out = [];
    PETS.forEach(p => { if (!p[5] && p[4] > a && p[4] <= b) out.push(`${p[1]} pet`); });
    COLORS.forEach(c => { if (!c[4] && c[3] > a && c[3] <= b) out.push(`${c[1]} banner`); });
    BORDERS.forEach(x => { if (!x[3] && x[2] > a && x[2] <= b) out.push(`${x[1]} border`); });
    return out;
  }
  let lvlChecking = false;
  async function checkLevelUp() {
    if (!state.user || lvlChecking) return;
    lvlChecking = true;
    try {
      const { level } = await myLevel(), pr = myProfile();
      if (pr.seen == null) {   // first visit since levels arrived: no fanfare for old levels, just point them at their profile
        await saveProfile({ seen: level });
        if (!pr.pet) toast(`<b>New:</b> pick a pet and level it up. <a href="#profile">Your profile</a>`, 7000);
        return;
      }
      if (level <= pr.seen) return;
      await saveProfile({ seen: level });
      const items = unlocksBetween(pr.seen, level);
      const extra = items.length ? `<ul class="tbp-list">${items.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
      const box = celebrate({ kind: 'level', panel: panel({ kicker: 'Level up', big: String(pr.seen), cls: 'was', art: `<div class="tbp-mascot tbp-pet">${petBadge(pr, 'xl')}</div>` }),
        title: `You're level ${level}!`, body: items.length ? 'Just unlocked:' : 'Keep going. More pets and borders are on the way.', extra, primary: items.length ? 'Show me' : 'Nice', secondary: items.length ? 'Later' : null });
      payoff(box.card, { at: 600, swap: String(level), cheer: false });
      box.result.then(k => { if (k === 'yes' && items.length) location.hash = '#profile'; });
    } finally { lvlChecking = false; }
  }
  // ---------- data protection: download everything, clear the tutor's memory, delete the account ----------
  function dataErr(msg) { const e = $('pf-data-err'); if (e) { e.textContent = msg; e.hidden = !msg; } }
  function drawDataControls() {
    if (!$('pf-data')) return;
    $('pf-export').onclick = async (ev) => {
      const b = ev.currentTarget; b.disabled = true; dataErr('');
      try {
        const { data, error } = await sb.rpc('my_data'); if (error) throw error;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `trialbank-my-data-${dayOf()}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } catch (err) { dataErr(err.message || String(err)); } finally { b.disabled = false; }
    };
    $('pf-forget').onclick = async () => {
      const b = $('pf-forget');
      if (!(await confirmBox('Clear what the tutor remembers about how you learn?', 'Clear it', 'Keep it'))) return;
      b.disabled = true; dataErr('');
      const { error } = await sb.rpc('clear_my_tutor_memory');
      b.disabled = false; if (error) return dataErr(error.message);
      clearDeviceData(true); toast('Done. The tutor starts fresh with you.');
    };
    $('pf-delete').onclick = async () => {
      const b = $('pf-delete'); window.__delTyped = '';
      const ok = await choiceBox(`Delete your Trialbank account?<span class="cb-sub">Your progress, uploads, marking packs and friends are removed for good. Type DELETE to confirm.</span><input id="del-confirm" class="del-confirm" autocomplete="off" aria-label="Type DELETE">`,
        [['no', 'Keep my account', 'secondary'], ['yes', 'Delete it', 'danger']]);
      if (ok !== 'yes') return;
      if ((window.__delTyped || '').trim().toUpperCase() !== 'DELETE') return dataErr('Type DELETE in the box to confirm.');
      b.disabled = true; dataErr('');
      try {
        const uid = state.user.id;
        for (const bucket of ['profile', 'submissions']) {   // your files first (each student can delete their own)
          const { data: dirs } = await sb.storage.from(bucket).list(uid, { limit: 1000 });
          const paths = [];
          for (const d of dirs || []) {
            if (d.id) paths.push(`${uid}/${d.name}`);   // a file
            else { const { data: inner } = await sb.storage.from(bucket).list(`${uid}/${d.name}`, { limit: 1000 }); (inner || []).forEach(f => paths.push(`${uid}/${d.name}/${f.name}`)); }
          }
          for (let i = 0; i < paths.length; i += 100) await sb.storage.from(bucket).remove(paths.slice(i, i + 100));
        }
        const { error } = await sb.rpc('delete_my_account'); if (error) throw error;
        clearDeviceData(); await sb.auth.signOut().catch(() => {});
        toast('Your account has been deleted.', 8000); location.hash = '#home';
      } catch (err) { dataErr(err.message || String(err)); b.disabled = false; }
    };
  }
  document.addEventListener('input', (ev) => { if (ev.target && ev.target.id === 'del-confirm') window.__delTyped = ev.target.value; });
  // shared computers: signing out leaves nothing personal behind (tutor chat, marking results, photos list, caches)
  function clearDeviceData(tutorOnly) {
    try {
      Object.keys(localStorage).forEach(k => {
        if (!k.startsWith('tb_')) return;
        if (tutorOnly ? k.startsWith('tb_tu_') : !['tb_prefs'].includes(k)) localStorage.removeItem(k);
      });
      if (!tutorOnly) sessionStorage.clear();
    } catch {}
  }
  async function renderProfile() {
    const [lv] = await Promise.all([myLevel(), loadFriends()]);
    const pr = myProfile(), st = streakData(), L = lv.level, lo = xpFor(L), hi = xpFor(L + 1);
    const pct = L >= 50 ? 100 : Math.round(100 * (lv.xp - lo) / (hi - lo));
    const nm = (myName() || 'You').split(/\s+/)[0];
    const el = $('profile-body');
    el.innerHTML = `
      <section class="pf-hero" style="--pc:${colorCss(pr.color)}">
        <div class="pf-pet">${petBadge(pr, 'xl')}</div>
        <div class="pf-who">
          <h1>${esc(nm)}</h1>
          <p class="pf-lv"><b>Level ${L}</b><span>${lv.xp} XP${L < 50 ? ` · ${hi - lv.xp} to level ${L + 1}` : ''}</span></p>
          <div class="pf-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
          <p class="pf-stats"><span><span class="fr-fl">${flame(liveStreak(st))}</span>${liveStreak(st)} day streak</span><span>Best ${st.best || 0}</span><span>${state.friends.length} friend${state.friends.length === 1 ? '' : 's'}</span></p>
        </div>
      </section>
      <p class="small muted pf-earn">Earn XP: 2 for every question, 10 for every mark, 50 for finishing your Daily 5.</p>
      <h2 class="sec">Pet</h2>
      <div class="pf-grid pets" id="pf-pets">${photoTile(pr)}${PETS.map(p => tile('pet', p[0], `${petImg(p[0])}<span>${p[1]}</span>`, p[4], p[5], pr.pet === p[0])).join('')}</div>
      <h2 class="sec">Banner</h2>
      <div class="pf-grid colors" id="pf-colors">${COLORS.map(c => tile('color', c[0], `<i style="background:${c[2]}"></i><span>${c[1]}</span>`, c[3], c[4], pr.color === c[0])).join('')}</div>
      <h2 class="sec">Border</h2>
      <div class="pf-grid borders" id="pf-borders">${BORDERS.map(x => tile('border', x[0], `${petBadge({ ...pr, border: x[0] }, 'sm')}<span>${x[1]}</span>`, x[2], x[3], (pr.border || 'none') === x[0])).join('')}</div>
      <div class="sec-head"><h2 class="sec">Friends</h2><button class="link small" id="pf-fr">Add a friend</button></div>
      <div class="friends pf-friends" id="pf-friends">${state.friends.length ? [meRow(), ...state.friends].sort((a, b) => (b.level || 1) - (a.level || 1) || b.streak - a.streak).map(friendChip).join('')
        : '<p class="small muted">Add friends to see their pets, levels and streaks here.</p>'}</div>
      <div class="card pf-data" id="pf-data">
        <h2>Your data</h2>
        <p class="small muted">What Trialbank keeps about you, and how to take it with you or remove it. <a href="info.html#privacy">How your data is used</a></p>
        <div class="pf-data-row"><div><b>Download my data</b><span class="small muted">Your answers, scores, settings, marking and tutor records, as a file.</span></div><button class="secondary" id="pf-export">Download</button></div>
        <div class="pf-data-row"><div><b>Clear what the tutor remembers</b><span class="small muted">Its notes on how you learn and your recent slips. Your tutor chat is only kept on this device.</span></div><button class="secondary" id="pf-forget">Clear</button></div>
        <div class="pf-data-row"><div><b>Delete my account</b><span class="small muted">Removes your account, progress, uploads and friends for good. This can't be undone.</span></div><button class="danger" id="pf-delete">Delete</button></div>
        <p class="error" id="pf-data-err" hidden></p>
      </div>`;
    $('pf-fr').onclick = () => openFriends().then(() => {});
    drawDataControls();
    el.querySelectorAll('.pf-tile').forEach(b => b.onclick = async () => {
      const { kind, k, lvl, pro } = b.dataset, pr = myProfile();
      if (k === 'photo' && (!media.av || pr.pet === 'photo')) return $('pf-photo-file').click();   // no photo yet, or tapping it again: upload a new one
      if (b.classList.contains('locked')) {
        window.Juice?.sfx?.bad?.();
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        if (pro) return openPro();
        return toast(`Reach level ${lvl} to unlock ${esc(b.querySelector('span').textContent)}.`);
      }
      await saveProfile({ [kind]: k });
      window.Juice?.sfx?.good?.(2);
      renderProfile();
    });
  }
  function photoTile(pr) {
    const on = pr.pet === 'photo' && media.av;
    return `<button class="pf-tile photo${on ? ' on' : ''}" data-kind="pet" data-k="photo" data-lvl="1" aria-pressed="${!!on}">
      ${media.av ? `<img class="ph" src="${media.av}" alt="">` : '<b class="pf-plus">+</b>'}<span>${media.av ? (on ? 'Change photo' : 'Your photo') : 'Upload photo'}</span></button>`;
  }
  $('pf-photo-file').onchange = async (ev) => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
    toast('Uploading your photo…');
    try {
      meP = prefs(); await uploadMedia('av', f); const p = meP; meP = null; await savePrefs(p); applyPrefs(p);
      await saveProfile({ pet: 'photo' }); toast('Photo saved. Your friends will see it.');
    } catch (e) { meP = null; toast(esc(e.message || String(e))); }
    if (location.hash === '#profile') renderProfile();
  };
  function tile(kind, k, inner, lvl, pro, on) {
    const lock = locked(lvl, pro);
    return `<button class="pf-tile${on ? ' on' : ''}${lock ? ' locked' : ''}${pro ? ' pro' : ''}" data-kind="${kind}" data-k="${k}" data-lvl="${lvl}" ${pro ? 'data-pro="1"' : ''}
      aria-pressed="${on}" title="${lock ? lockText(lvl, pro) : ''}">${inner}${lock ? `<em>${lockText(lvl, pro)}</em>` : ''}</button>`;
  }

  // ---------- friends: add each other by code, see who has done today's 5 ----------
  state.friends = [];
  async function loadFriends() {
    if (!state.user || state.preview) return (state.friends = []);
    const { data, error } = await sb.rpc('my_friends');
    if (error) { console.warn('friends', error.message); return state.friends; }
    const fs = data || [], paths = fs.map(f => f.photo).filter(Boolean);
    if (paths.length) {
      const { data: urls } = await sb.storage.from('profile').createSignedUrls(paths, 3600);
      (urls || []).forEach(u => { const f = fs.find(x => x.photo === u.path); if (f && u.signedUrl) f.photoUrl = u.signedUrl; });
    }
    if (fs.length) stInbox();   // friends can see you're online and invite you to study
    return (state.friends = fs);
  }
  let myCode = null;
  async function friendCode() {
    if (myCode) return myCode;
    const { data, error } = await sb.rpc('my_friend_code');
    if (error) throw error;
    return (myCode = data);
  }
  const inviteLink = (code) => location.origin + location.pathname + '#friend=' + code;
  const meRow = () => { const st = streakData(), pr = myProfile(); return { friend_id: 'me', name: 'You', streak: liveStreak(st), done_today: st.last === dayOf(), me: true, level: state.lvl?.level || 1, ...pr }; };
  const friendChip = (f) => `<div class="fr${f.done_today ? ' done' : ''}${f.me ? ' me' : ''}" title="${esc(f.name)}: level ${int(f.level) || 1}, ${int(f.streak)} day streak${f.done_today ? ', done today' : ''}">
      ${petBadge(f, 'md')}<b>${esc(f.name)}</b>
      <small class="fr-meta"><span class="fr-fl">${flame(int(f.streak))}</span>${int(f.streak)} · Lv ${int(f.level) || 1}</small>
      <small class="fr-st">${f.done_today ? 'Done today' : 'Not yet'}</small></div>`;
  async function drawFriends() {
    const box = $('friends'), head = $('friends-head');
    if (state.preview || !state.user) { box.hidden = head.hidden = true; return; }
    const fs = await loadFriends();
    head.hidden = box.hidden = false;
    if (!fs.length) {
      box.className = 'friends empty';
      box.innerHTML = `<p><b>Do your Daily 5 with friends.</b> <span class="muted">See their streaks and who's done today's 5.</span></p><button class="secondary" id="fr-invite">Invite a friend</button>`;
      $('fr-invite').onclick = openFriends;
      return;
    }
    box.className = 'friends';
    await myLevel();
    const all = [meRow(), ...fs].sort((a, b) => b.done_today - a.done_today || b.streak - a.streak);
    box.innerHTML = all.map(friendChip).join('');
  }
  $('fr-open').onclick = () => openFriends();
  async function openFriends() {
    $('streak-pop').hidden = true;
    const m = mk('div', 'modal');
    m.innerHTML = `<div class="modal-card fr-card" role="dialog" aria-modal="true" aria-labelledby="fr-t">
      <h2 id="fr-t">Friends</h2>
      <p class="small muted">Friends see your first name, your streak and whether you've done today's 5. Nothing else.</p>
      <div class="fr-code"><span class="small muted">Your code</span><b id="fr-code">······</b><button class="primary" id="fr-share">Share invite</button></div>
      <form class="fr-add" id="fr-add"><input id="fr-in" maxlength="10" autocomplete="off" autocapitalize="characters" placeholder="Their code" aria-label="Friend's code"><button class="secondary">Add</button></form>
      <p class="error small" id="fr-err" hidden></p>
      <div class="fr-list" id="fr-list"></div>
      <div class="row confirm-row"><button class="link" data-x>Done</button></div></div>`;
    const close = () => { m.remove(); document.removeEventListener('keydown', k); if (location.hash === '#profile') renderProfile(); else drawFriends(); };
    const k = (ev) => { if (ev.key === 'Escape') close(); };
    m.onclick = (ev) => { if (ev.target === m || ev.target.closest('[data-x]')) close(); };
    document.addEventListener('keydown', k); document.body.appendChild(m);
    const err = (msg) => { $('fr-err').textContent = msg; $('fr-err').hidden = !msg; };
    const list = async () => {
      const fs = await loadFriends();
      $('fr-list').innerHTML = fs.length ? fs.map(f => `<div class="fr-li">${petBadge(f, 'sm')}<b>${esc(f.name)} <span class="small muted">Lv ${int(f.level) || 1} · ${int(f.streak)} day streak</span></b><span class="small muted">${f.done_today ? 'Done today' : 'Not yet today'}</span><button class="link small" data-rm="${esc(f.friend_id)}" data-n="${esc(f.name)}">Remove</button></div>`).join('')
        : '<p class="small muted">No friends added yet.</p>';
    };
    $('fr-list').onclick = async (ev) => {
      const b = ev.target.closest('[data-rm]'); if (!b) return;
      if (!(await confirmBox(`Remove ${esc(b.dataset.n)} as a friend?`, 'Remove', 'Keep'))) return;
      await sb.rpc('remove_friend', { fid: b.dataset.rm }); list();
    };
    $('fr-add').onsubmit = async (ev) => {
      ev.preventDefault(); err('');
      const code = $('fr-in').value.trim(); if (!code) return;
      const { data, error } = await sb.rpc('add_friend', { friend_code: code });
      if (error) return err(error.message.replace(/^.*?: /, ''));
      $('fr-in').value = ''; toast(`You and <b>${esc(data)}</b> are now friends.`); window.Juice?.sfx?.good?.(3); list();
    };
    list();
    try {
      const code = await friendCode(); $('fr-code').textContent = code;
      $('fr-share').onclick = async () => {
        const text = `Do the Trialbank Daily 5 with me. My code is ${code}`, url = inviteLink(code);
        if (navigator.share) { try { await navigator.share({ title: 'Trialbank', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
        try { await navigator.clipboard.writeText(`${text}: ${url}`); toast('Invite link copied.'); } catch { toast(`Your link: ${esc(url)}`, 9000); }
      };
    } catch (e) { $('fr-code').textContent = '?'; err(e.message); }
  }
  async function acceptInvite() {
    if (!state.user || state.preview) return;
    const code = lsGet('tb_invite'); if (!code) return;
    try { localStorage.removeItem('tb_invite'); } catch {}
    const { data, error } = await sb.rpc('add_friend', { friend_code: code });
    if (error) { if (!/own code/.test(error.message)) toast(esc(error.message.replace(/^.*?: /, ''))); return; }
    const { data: ref } = await sb.rpc('claim_referral', { friend_code: code }).catch(() => ({ data: false }));
    toast(`You and <b>${esc(data)}</b> are now friends.` + (ref ? ` Answer 10 questions and you'll <b>both get 7 days of Pro Mini free</b>.` : ' Do your Daily 5 together.'), 7000);
    if (location.hash === '#home' || !location.hash) drawFriends();
  }

  // ---------- daily streak: one tick per day you finish your Daily 5 (Sydney time) ----------
  const dayOf = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
  const prevDay = (day) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const streakData = () => state.preview ? (previewFlags.streak || { n: 0, best: 0, last: null, days: [] })
    : { n: 0, best: 0, last: null, days: [], ...(state.user?.user_metadata?.streak || {}) };
  let streakBusy = false;
  const liveStreak = (st) => (st.last === dayOf() || st.last === prevDay(dayOf())) ? (st.n || 0) : 0;   // missed a day: back to 0
  function touchStreak() { if (state.user) drawStreak(streakData(), false); }
  async function bumpStreak() {
    const st = streakData(), today = dayOf();
    if (st.last === today || streakBusy) return st;
    streakBusy = true;
    st.n = st.last === prevDay(today) ? (st.n || 0) + 1 : 1;
    st.best = Math.max(st.best || 0, st.n); st.last = today;
    st.days = [...(st.days || []).filter(d => d !== today), today].slice(-60);
    try {
      if (state.preview) previewFlags.streak = st;
      else { const { data, error } = await sb.auth.updateUser({ data: { streak: st } }); if (!error && data?.user) state.user = data.user; }
    } finally { streakBusy = false; }
    drawStreak(st, false);
    const b = $('streak'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    return st;
  }
  const flame = (n, big) => { n = int(n); return `<svg viewBox="0 0 32 38" aria-hidden="true" class="${n ? '' : 'out'}">
    <g class="fl"><path class="fo" d="M16 1c1.2 7 9.5 11.2 11.3 20.2C29 30 23.4 37 16 37S3 31.2 4.6 22.6c1-5.6 4.6-8 5.9-12.6 1.8 2.7 2 5.5 3.6 6.6C16 11.8 15.4 6.6 16 1z"/>
    <path class="fi" d="M16 16.5c1.2 4.2 6.3 6.3 6.3 11.4 0 4.4-2.9 7.6-6.3 7.6s-6.3-3.2-6.3-7.4c0-3.3 2-4.5 3.1-7.4 1 1.3 1.8 2.9 2.8 3.1.3-2.5.2-4.8.4-7.3z"/></g>
    <text x="16" y="29.6" text-anchor="middle" style="font-size:${n > 99 ? 9.5 : n > 9 ? 11.5 : 13}px">${n}</text></svg>`; };
  function drawStreak(st = streakData(), bumped = false) {
    const b = $('streak'), n = liveStreak(st);
    b.hidden = false; b.innerHTML = flame(n); b.title = `${n} day streak`; b.setAttribute('aria-label', `${n} day streak`);
    if (bumped) {
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      if (window.Juice) { Juice.play('sparkle'); Juice.burst(b, 14, 50); }
      if (n > 1) toast(`<span class="toast-flame">${flame(n)}</span><b>${n} day streak!</b> Come back tomorrow to keep it going.`, 4200);
    }
  }
  function openStreakPop() {
    const st = streakData(), pop = $('streak-pop'), today = dayOf(), have = new Set(st.days || []);
    const week = []; let d = today;
    for (let k = 0; k < 7; k++) { week.unshift(d); d = prevDay(d); }
    const label = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-AU', { weekday: 'narrow', timeZone: 'UTC' });
    pop.innerHTML = `<div class="sp-top"><span class="sp-flame">${flame(liveStreak(st), true)}</span>
      <div><strong>${liveStreak(st)} day streak</strong><span class="small muted">Best ${st.best || st.n || 0} · finish your Daily 5 every day to keep it</span></div></div>
      <div class="sp-week">${week.map(day => `<span class="${have.has(day) ? 'hit' : ''}${day === today ? ' today' : ''}"><i></i>${label(day)}</span>`).join('')}</div>
      ${state.preview ? '' : `<div class="sp-fr">${state.friends.length ? `<span class="small">${friendsDone()}</span>` : '<span class="small muted">Keep streaks with friends</span>'}<button class="link small" id="sp-fr">${state.friends.length ? 'Friends' : 'Add a friend'}</button></div>`}`;
    pop.hidden = false;
    $('sp-fr') && ($('sp-fr').onclick = (ev) => { ev.stopPropagation(); openFriends(); });
  }
  function friendsDone() {
    const d = state.friends.filter(f => f.done_today).map(f => esc(f.name));
    return !d.length ? `None of your ${state.friends.length} friend${state.friends.length === 1 ? '' : 's'} done today yet`
      : d.length === state.friends.length && d.length > 1 ? `All ${d.length} friends have done today's 5`
      : `${d.slice(0, 2).join(' and ')}${d.length > 2 ? ` and ${d.length - 2} more` : ''} done today`;
  }
  $('streak').onclick = (ev) => { ev.stopPropagation(); $('streak-pop').hidden ? openStreakPop() : ($('streak-pop').hidden = true); };
  document.addEventListener('click', (ev) => { if (!ev.target.closest('#streak-pop')) $('streak-pop').hidden = true; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.user) touchStreak(); });   // a tab left open past midnight

  // ---------- exam timer: reading time, then writing time, counted down in the top bar ----------
  const TKEY = 'tb_timer';
  const clockIcon = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let timer = (() => { try { return JSON.parse(localStorage.getItem(TKEY)) || null; } catch { return null; } })();
  let timerTick = null, timerPhase = null, timerWarned = false;
  const saveTimer = () => { try { timer ? localStorage.setItem(TKEY, JSON.stringify(timer)) : localStorage.removeItem(TKEY); } catch { /* private mode */ } };
  function timerNow() {                         // { phase: 'reading' | 'writing' | 'done', left (ms), total (ms of this phase) }
    if (!timer) return null;
    const el = (timer.pausedAt || Date.now()) - timer.startAt - (timer.pausedTotal || 0);
    if (el < timer.readMs) return { phase: 'reading', left: timer.readMs - el, total: timer.readMs };
    if (el < timer.readMs + timer.workMs) return { phase: 'writing', left: timer.readMs + timer.workMs - el, total: timer.workMs };
    return { phase: 'done', left: 0, total: timer.workMs };
  }
  const hms = (ms) => { const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0'); };
  function beep(times = 1) {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + i * 0.35;
        o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.start(t0); o.stop(t0 + 0.3);
      }
    } catch { /* no audio */ }
    try { navigator.vibrate && navigator.vibrate(times > 1 ? [200, 120, 200, 120, 200] : 200); } catch { /* none */ }
  }
  function drawTimer() {
    const b = $('timer-btn'), t = timerNow();
    if (!t) { b.className = 'timer-btn'; b.innerHTML = clockIcon; b.title = 'Exam timer'; }
    else {
      b.className = 'timer-btn on ' + t.phase + (timer.pausedAt ? ' paused' : '');
      b.innerHTML = t.phase === 'done' ? `${clockIcon}<b>Done</b>` : `${clockIcon}<b>${t.phase === 'reading' ? 'R ' : ''}${hms(t.left)}</b>`;
      b.title = t.phase === 'done' ? 'Exam timer: time is up' : `Exam timer: ${t.phase} time${timer.pausedAt ? ' (paused)' : ''}`;
      // moments worth announcing, once each
      if (timerPhase && timerPhase !== t.phase && !timer.pausedAt) {
        if (t.phase === 'writing') { beep(1); toast('<b>Reading time is over.</b> You may now begin writing.', 7000); }
        if (t.phase === 'done') { beep(3); toast('<b>Pencils down.</b> Time is up.', 10000); }
      }
      if (t.phase === 'writing' && t.left <= 5 * 60000 && t.total > 10 * 60000 && !timerWarned && !timer.pausedAt) { timerWarned = true; beep(1); toast('<b>5 minutes</b> of writing time left.', 6000); }
      timerPhase = t.phase;
    }
    if (!$('timer-pop').hidden) drawTimerPop();
  }
  function runTimerTick() { clearInterval(timerTick); if (timer) timerTick = setInterval(drawTimer, 1000); drawTimer(); }
  function drawTimerPop() {
    const pop = $('timer-pop'), t = timerNow();
    if (!t) {
      const presets = Object.keys(C.subjects).map(k => { const d = examDefaults(k); return `<button class="chip" data-r="${d.reading}" data-w="${d.working}">${esc(shortName(C.subjects[k]))} <span class="n">${d.reading} + ${d.working}</span></button>`; }).join('');
      const last = (() => { try { return JSON.parse(localStorage.getItem(TKEY + '_last')) || {}; } catch { return {}; } })();
      const d0 = examDefaults(state.subject);
      pop.innerHTML = `<h3>Exam timer</h3>
        <div class="chips tp-presets">${presets}</div>
        <div class="tp-fields"><label>Reading time <span class="tp-in"><input id="tp-read" type="number" min="0" max="60" inputmode="numeric" value="${last.r ?? d0.reading}"> min</span></label>
        <label>Writing time <span class="tp-in"><input id="tp-work" type="number" min="1" max="300" inputmode="numeric" value="${last.w ?? d0.working}"> min</span></label></div>
        <button class="primary tp-go" id="tp-start">Start timer</button>`;
      pop.querySelectorAll('.tp-presets .chip').forEach(c => { c.onclick = () => { $('tp-read').value = c.dataset.r; $('tp-work').value = c.dataset.w; }; });
      $('tp-start').onclick = () => {
        const r = Math.max(0, Math.min(60, +$('tp-read').value || 0)), w = Math.max(1, Math.min(300, +$('tp-work').value || 0));
        try { localStorage.setItem(TKEY + '_last', JSON.stringify({ r, w })); } catch { /* fine */ }
        timer = { readMs: r * 60000, workMs: w * 60000, startAt: Date.now(), pausedAt: null, pausedTotal: 0 };
        timerPhase = null; timerWarned = false; saveTimer(); beep(1); runTimerTick();
      };
      return;
    }
    const pct = t.phase === 'done' ? 100 : Math.round(100 * (1 - t.left / t.total));
    pop.innerHTML = `<h3>${t.phase === 'reading' ? 'Reading time' : t.phase === 'writing' ? 'Writing time' : 'Time is up'}${timer.pausedAt ? ' <span class="muted small">paused</span>' : ''}</h3>
      <div class="tp-big ${t.phase}">${t.phase === 'done' ? 'Pencils down' : hms(t.left)}</div>
      <div class="tp-bar"><i style="width:${pct}%"></i></div>
      <p class="small muted">${Math.round(timer.readMs / 60000)} min reading · ${Math.round(timer.workMs / 60000)} min writing</p>
      <div class="row tp-actions">${t.phase === 'done' ? '' : `<button class="secondary" id="tp-pause">${timer.pausedAt ? 'Resume' : 'Pause'}</button>`}<button class="link" id="tp-stop">${t.phase === 'done' ? 'Clear' : 'Stop timer'}</button></div>`;
    const pz = $('tp-pause');
    if (pz) pz.onclick = () => {
      if (timer.pausedAt) { timer.pausedTotal += Date.now() - timer.pausedAt; timer.pausedAt = null; } else timer.pausedAt = Date.now();
      saveTimer(); drawTimer();
    };
    $('tp-stop').onclick = () => { timer = null; timerPhase = null; saveTimer(); runTimerTick(); };
  }
  $('timer-btn').onclick = (ev) => { ev.stopPropagation(); const pop = $('timer-pop'); if (pop.hidden) { pop.hidden = false; drawTimerPop(); } else pop.hidden = true; };
  document.addEventListener('click', (ev) => { if (!ev.target.closest('#timer-pop') && !ev.target.closest('#timer-btn')) $('timer-pop').hidden = true; });
  if (timer) { timerPhase = timerNow()?.phase; timerWarned = true; }
  runTimerTick();

  // a burst of confetti for good results
  window.TBconfetti = (n) => confetti(n);
  function confetti(n = 70) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = [getComputedStyle(document.documentElement).getPropertyValue('--biro').trim(), '#ffd23f', '#1fa45a', '#e5484d', '#7c4dde', '#0f9aa8'];
    for (let i = 0; i < n; i++) {
      const d = mk('div', 'confetti');
      d.style.left = Math.random() * 100 + 'vw'; d.style.background = cols[i % cols.length];
      d.style.setProperty('--x', (Math.random() * 240 - 120) + 'px'); d.style.setProperty('--r', (Math.random() * 1000 - 500) + 'deg');
      d.style.setProperty('--d', (1.3 + Math.random() * 1.4) + 's'); d.style.animationDelay = (Math.random() * 0.3) + 's';
      document.body.appendChild(d); setTimeout(() => d.remove(), 3400);
    }
  }
  $('auth-mascot').innerHTML = Mascot('proud');

  // ---------- spotlight tour for new students: they tap each lit-up control for real ----------
  const TOUR = [
    { el: '#nav a[data-nav="papers"]', text: 'Tap Papers. Every past paper lives here.' },
    { el: '#nav a[data-nav="progress"]', text: 'Tap Progress. This shows where you lose marks.' },
    { el: '#nav a[data-nav="practise"]', text: 'Tap Practise. Pick any topics to drill.' },
    { el: '#nav a[data-nav="home"]', text: 'Tap Home to come back.' },
    { el: null, text: "You're all good to go.", last: true },
  ];
  function startTour() {
    if (state.tourOn || $('view-home').hidden) return;
    state.tourOn = true;
    const spot = mk('div', 'tour-spot'), tip = mk('div', 'tour-tip');
    const walls = [0, 1, 2, 3].map(() => mk('div', 'tour-wall'));   // catch clicks everywhere except the lit control
    tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-live', 'polite');
    document.body.append(...walls, spot, tip);
    let i = 0, cur = null, timer = null;
    const end = () => {
      flag('tour_done', 1); state.tourOn = false; clearInterval(timer);
      [...walls, spot, tip].forEach(x => x.remove());
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
      document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', key);
    };
    const visible = (sel) => [...document.querySelectorAll(sel)].find(e => e.offsetParent !== null && e.getBoundingClientRect().width > 0);
    function go(n) {
      i = n; cur = null;
      if (i >= TOUR.length) return end();
      [spot, tip, ...walls].forEach(x => x.style.visibility = 'hidden');
      clearInterval(timer);
      let tries = 0;
      if (!TOUR[i].el) return finale();
      timer = setInterval(() => {   // wait for the page the last tap opened to finish loading
        const el = visible(TOUR[i].el);
        if (el && $('loading').hidden) { clearInterval(timer); cur = el; draw(); }
        else if (++tries > 80) { clearInterval(timer); go(i + 1); }
      }, 100);
    }
    function finale() {   // dim everything, one centred message, then leave them be
      cur = null;
      walls.forEach((w, k) => Object.assign(w.style, k ? { width: 0, height: 0 } : { left: 0, top: 0, width: '100vw', height: '100vh' }));
      spot.style.visibility = 'hidden';
      tip.className = 'tour-tip center';
      tip.innerHTML = `<span class="tour-mascot">${Mascot('cheer')}</span><p>${TOUR[i].text}</p><button class="primary tour-done">Got it</button>`;
      confetti(50);
      Object.assign(tip.style, { left: '50%', top: '50%', width: 'min(320px, calc(100vw - 24px))', transform: 'translate(-50%, -50%)' });
      [walls[0], tip].forEach(x => x.style.visibility = 'visible');
      tip.querySelector('.tour-done').onclick = end;
      tip.querySelector('.tour-done').focus();
    }
    function draw() {
      const t = TOUR[i];
      tip.innerHTML = `<p>${t.text}</p><div class="tour-row"><span class="tour-n">${i + 1} of ${TOUR.length}</span><button class="link tour-skip">Skip tour</button></div>`;
      tip.querySelector('.tour-skip').onclick = end;
      cur.scrollIntoView({ block: 'center', behavior: 'instant' });
      [spot, tip, ...walls].forEach(x => x.style.visibility = 'visible');
      place();
    }
    function place() {
      if (!cur) return;
      const r = cur.getBoundingClientRect(), pad = 6;
      const L = r.left - pad, T = r.top - pad, W = r.width + pad * 2, H = r.height + pad * 2;
      Object.assign(spot.style, { left: L + 'px', top: T + 'px', width: W + 'px', height: H + 'px' });
      const [top, bottom, left, right] = walls;
      Object.assign(top.style, { left: 0, top: 0, width: '100vw', height: Math.max(0, T) + 'px' });
      Object.assign(bottom.style, { left: 0, top: T + H + 'px', width: '100vw', height: Math.max(0, innerHeight - T - H) + 'px' });
      Object.assign(left.style, { left: 0, top: T + 'px', width: Math.max(0, L) + 'px', height: H + 'px' });
      Object.assign(right.style, { left: L + W + 'px', top: T + 'px', width: Math.max(0, innerWidth - L - W) + 'px', height: H + 'px' });
      const tw = Math.min(290, innerWidth - 24), th = tip.offsetHeight || 96;
      const below = T + H + 12 + th < innerHeight;
      Object.assign(tip.style, { width: tw + 'px', top: (below ? T + H + 12 : Math.max(12, T - 12 - th)) + 'px',
        left: Math.min(Math.max(12, L + W / 2 - tw / 2), innerWidth - tw - 12) + 'px' });
    }
    function onClick(ev) {   // the real control still does its job; the tour just moves on afterwards
      if (!cur || !cur.contains(ev.target)) return;
      if (TOUR[i].el === '#subject-switch' && !ev.target.closest('button')) return;
      if (TOUR[i].last) { end(); return; }
      setTimeout(() => go(i + 1), 50);
    }
    const key = (ev) => { if (ev.key === 'Escape') end(); };
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    document.addEventListener('click', onClick, true); document.addEventListener('keydown', key);
    go(0);
  }

  // ---------- automarker ----------
  const goStripe = (u) => { try { const x = new URL(u); if (x.protocol === 'https:' && /(^|\.)stripe\.com$/.test(x.hostname)) { location.href = x.href; return; } } catch {} toast("Couldn't start the payment. Try again."); };
  const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const int = (v) => Math.max(0, Math.floor(Number(v) || 0));   // numbers from other people's accounts: never trust them as text

  // ---------- celebration popups: Trialbank's own blue card (like Home's), one big word or number, the mascot ----------
  // kind: 'buy' | 'level' | 'pro' | 'subject'. panel() builds the top card; the rest is a title, a line and one button.
  const panel = ({ kicker = '', big = '', sub = '', mood = 'cheer', art = '', cls = '' }) =>
    `<div class="tbp-big"><small>${kicker}</small><b class="${cls}">${big}</b><span>${sub}</span></div>` +
    (art || `<div class="tbp-mascot">${Mascot(mood)}</div>`);
  function celebrate({ kind = 'level', panel: top = '', title, body = '', extra = '', primary = 'Nice', secondary = null }) {
    const m = mk('div', 'modal cele');
    m.innerHTML = `<div class="modal-card tbp tbp-${kind}" role="dialog" aria-modal="true" aria-labelledby="cele-t">
      <div class="tbp-panel">${top}</div>
      <div class="tbp-main">
        <h2 id="cele-t">${title}</h2>
        <p class="tbp-body">${body}</p>${extra}
        <div class="tbp-actions"><button class="primary" data-k="yes">${primary}</button>${secondary ? `<button class="link" data-k="no">${secondary}</button>` : ''}</div>
      </div></div>`;
    const card = m.firstElementChild;
    let done;
    const result = new Promise(res => { done = res; });
    const close = (v) => { m.classList.add('out'); setTimeout(() => m.remove(), 200); document.removeEventListener('keydown', k); done(v); };
    const k = (ev) => { if (ev.key === 'Escape') close(null); };
    m.onclick = (ev) => { if (ev.target === m) close(null); const b = ev.target.closest('button[data-k]'); if (b) close(b.dataset.k); };
    document.addEventListener('keydown', k); document.body.appendChild(m);
    window.Juice?.sfx?.whoosh();
    card.tabIndex = -1; card.focus({ preventScroll: true });   // the dialog, not the button, so no focus ring on open
    return { result, card, set(t, b2, btn, kicker) {
      if (t != null) card.querySelector('h2').innerHTML = t; if (b2 != null) card.querySelector('.tbp-body').innerHTML = b2;
      if (btn) card.querySelector('.primary').textContent = btn; if (kicker != null) card.querySelector('.tbp-big small').textContent = kicker; } };
  }
  // the payoff: a count-up or a swap, then the big word slams in with a flash, a fanfare, confetti and the mascot's jump;
  // then each unlock ticks in on a rising note, and the button nudges to say "tap me"
  function payoff(card, { at = 280, count = null, fmt = (v) => v, swap = null, cheer = true } = {}) {
    const J = window.Juice || {}, fx = J.sfx || {}, big = card.querySelector('.tbp-big b'), pan = card.querySelector('.tbp-panel');
    const list = [...card.querySelectorAll('.tbp-list li')], btn = card.querySelector('.tbp-actions .primary');
    const live = () => card.isConnected;
    if (count != null) {   // count up with climbing notes
      const steps = Math.min(8, Math.max(3, count)), ms = 900;
      setTimeout(() => { if (live()) J.countUp ? J.countUp(big, count, fmt, ms) : (big.textContent = fmt(count)); }, at);
      for (let i = 0; i < steps; i++) setTimeout(() => { if (live()) fx.good?.(i + 1); }, at + (ms / steps) * i);
      at += ms;
    }
    setTimeout(() => {
      if (!live()) return;
      if (swap != null) { big.classList.remove('was'); big.textContent = swap; }
      big.classList.remove('slam'); void big.offsetWidth; big.classList.add('slam');
      pan.classList.remove('flash'); void pan.offsetWidth; pan.classList.add('flash');
      if (cheer) { const mm = card.querySelector('.tbp-mascot'); if (mm) mm.innerHTML = Mascot('cheer'); }
      fx.fanfare?.(); J.buzz?.([18, 40, 26]);
      confetti(90); J.burst?.(big, 24, 130);
    }, at);
    list.forEach((li, i) => setTimeout(() => { if (live()) { li.classList.add('in'); fx.star?.(i); J.buzz?.(8); } }, at + 450 + i * 170));
    setTimeout(() => { if (live()) btn?.classList.add('nudge'); }, at + 650 + list.length * 170);
  }
  // back from Stripe: the card shows what they bought while the payment lands, then counts it in
  function afterCheckout() {
    const n = new URLSearchParams(location.search).get('bought');
    if (!n) return;
    history.replaceState(null, '', location.pathname + location.hash);
    const box = celebrate({ kind: 'buy', panel: panel({ kicker: 'Payment received', big: `+${esc(n)}`, sub: 'papers of marking', mood: 'happy' }),
      title: 'Thank you!', body: 'Adding them to your account…', primary: 'Done' });
    box.card.classList.add('pending');
    const since = new Date(Date.now() - 15 * 60e3).toISOString();
    let tries = 0;
    const poll = setInterval(async () => {
      if (!state.user) return;
      const { data: got } = await sb.from('mark_ledger').select('id').eq('kind', 'purchase').gte('created_at', since).limit(1);
      const arrived = !!(got && got.length);
      if (arrived || ++tries > 20) {
        clearInterval(poll); const m = await loadMyMarks(); drawMarkLeft();
        box.card.classList.remove('pending');
        if (arrived) {
          payoff(box.card, { at: 120, count: Number(n) || 0, fmt: (v) => '+' + v });
          box.set(`${esc(n)} papers added`, `You can now get <b>${m.balance}</b> papers marked. They never expire.`, 'Mark a paper', 'All set');
          box.result.then(k => { if (k === 'yes') location.hash = '#mark'; });
        } else box.set('Thanks, payment received', "Your papers are taking a little longer than usual to arrive. They'll appear on their own; if they're not here in a few minutes, contact Jayden.", 'OK', 'Almost there');
      }
    }, 2000);
  }

  // ---------- "you've been upgraded" and "new subject" popups ----------
  const LEVEL_RANK = { free: 0, lite: 1, full: 2, pro: 3 };
  const LEVEL_NAME = { free: 'Free', lite: 'Lite', full: 'Full', pro: 'Pro' };
  const LEVEL_FEAT = { free: 0, lite: 20, full: 100, pro: 100 };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  function unlocksFor(from, to) {
    const list = [];
    if (to !== 'free' && from === 'free') list.push('Every trial paper', 'Topic practice');
    FEATURE_NAMES.forEach(([f, name]) => { if ((LEVEL_FEAT[from] ?? 0) < FEATURE_AT[f] && (LEVEL_FEAT[to] ?? 0) >= FEATURE_AT[f]) list.push(cap(name.replace(/^the /, ''))); });
    if (to === 'pro') list.push('Your own marked papers every month', 'The AI tutor');
    return list;
  }
  function levelPopup(from, to) {
    const items = unlocksFor(from, to);
    const extra = items.length ? `<ul class="tbp-list">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    const old = LEVEL_NAME[from] || '', kicker = old ? `Upgraded from ${old}` : 'Upgraded';
    const top = (k) => panel({ kicker: k, big: old, cls: old ? 'was' : '', mood: 'happy' });   // the old level, struck out, until the new one slams in
    const box = to === 'pro' ? celebrate({ kind: 'pro', panel: top(kicker), title: 'Welcome to Pro', body: 'Everything in Full, plus:', extra, primary: "Let's go" })
      : to === 'lite' ? celebrate({ kind: 'level', panel: top('Access unlocked'), title: 'Welcome to Trialbank Lite', body: 'You now have:', extra, primary: 'Start practising' })
      : celebrate({ kind: 'level', panel: top(kicker), title: `You're on ${LEVEL_NAME[to]} now`, body: 'Just unlocked:', extra, primary: "Let's go" });
    payoff(box.card, { at: old ? 650 : 300, swap: LEVEL_NAME[to] });
    return box;
  }
  async function subjectPopup(x, count, have) {
    let covers = '';
    try {
      const { data: ps } = await sb.from('papers').select('slug').eq('subject', x).neq('difficulty', 'HSC').order('year', { ascending: false }).limit(3);
      const urls = await thumbUrls((ps || []).map(p => `${p.slug}/thumb.webp`));
      covers = (ps || []).map((p, i) => urls[`${p.slug}/thumb.webp`] ? `<img src="${urls[`${p.slug}/thumb.webp`]}" alt="" style="--i:${i}">` : '').join('');
    } catch { /* plain sheets instead */ }
    if (!covers) covers = [0, 1, 2].map(i => `<span style="--i:${i}"></span>`).join('');
    const name = C.subjects[x] || x;
    const box = celebrate({ kind: 'subject', panel: panel({ kicker: `New: ${esc(shortName(name))}`, big: '0', sub: 'papers ready', art: `<div class="tbp-fan" aria-hidden="true">${covers}</div>` }),
      title: `${esc(name)} is here`, body: 'Past HSC papers and the hardest trials, sorted by topic.',
      primary: have ? 'Open it' : 'Add to my subjects', secondary: 'Not now' });
    [0, 1, 2].forEach(i => setTimeout(() => window.Juice?.sfx?.tick(), 260 + i * 130));   // the covers dealt in
    payoff(box.card, { at: 650, count: Number(count) || 0, cheer: false });
    return box.result;
  }
  let noticing = false;
  async function noticeChanges() {
    if (noticing || !state.user || state.admin || state.preview || C.demo) return;
    noticing = true;
    try {
      const seen = state.user.user_metadata?.seen || {}, upd = {};
      const lvl = state.release?.level;
      if (lvl && seen.level !== lvl) {
        const up = seen.level && (LEVEL_RANK[lvl] ?? 0) > (LEVEL_RANK[seen.level] ?? 0);
        upd.level = lvl;
        if (up) await levelPopup(seen.level, lvl).result;
      }
      // subjects that have at least one paper this student can open
      const { data: ps } = await sb.from('papers').select('subject');
      const count = {}; (ps || []).forEach(p => { if (C.subjects[p.subject]) count[p.subject] = (count[p.subject] || 0) + 1; });
      const subs = Object.keys(count).sort();
      if (subs.length) {
        // first visit: remember what's there now, except subjects still being announced (config.announce)
        const known = seen.subjects || subs.filter(x => !(C.announce || []).includes(x));
        const fresh = subs.filter(x => !known.includes(x));
        for (const x of fresh) {
          const mine = mySubjects() || [];
          const have = mine.includes(x);
          const k = await subjectPopup(x, count[x], have);
          if (k === 'yes') {
            if (!have) { const { data } = await sb.auth.updateUser({ data: { subjects: [...mine, x] } }); if (data?.user) state.user = data.user; }
            state.subject = x; state.topics.clear(); try { localStorage.setItem('tb_subject', x); } catch {}
            drawSubject(); route();
          }
        }
        if (!seen.subjects || fresh.length) upd.subjects = subs;
      }
      if (Object.keys(upd).length) {
        const { data } = await sb.auth.updateUser({ data: { seen: { ...seen, ...upd } } });
        if (data?.user) state.user = data.user;
      }
    } catch { /* never block the page over a popup */ }
    finally { noticing = false; }
  }

  // ---------- admin: view as a level, and the test account ----------
  function drawBars() {
    const va = $('viewas-bar'); if (va) {
      va.hidden = !(state.admin && state.viewAs && state.viewAs !== 'student' && state.user);
      $('viewas-name').textContent = { free: 'Free', lite: 'Lite', full: 'Full', pro: 'Pro' }[state.viewAs] || '';
    }
    const tb = $('test-bar'); if (tb) {
      let back = null; try { back = JSON.parse(sessionStorage.getItem('tb_admin_return') || 'null'); } catch {}
      tb.hidden = !(back && state.user && state.user.email !== back.email);
    }
  }
  $('view-as').onchange = async () => {
    const v = $('view-as').value || null;
    if (v === 'free') {
      const { data } = await sb.from('settings').select('value').eq('key', 'release_public').maybeSingle();
      state.viewDial = +(data?.value ?? 10);
    }
    state.viewAs = v;
    try { v ? sessionStorage.setItem('tb_viewas', v) : sessionStorage.removeItem('tb_viewas'); sessionStorage.setItem('tb_viewdial', String(state.viewDial || 0)); } catch {}
    $('account-menu').hidden = true;
    applyRelease(); drawAdminMenu(); drawBars(); route();
  };
  $('viewas-exit').onclick = () => { $('view-as').value = ''; $('view-as').onchange(); };
  // student mode: one tap hides every admin option and Pro; "Admin mode" in the same menu brings them back
  function drawAdminMenu() {
    const on = adminOn(), student = state.admin && state.viewAs === 'student';
    $('nav-admin').hidden = !on;
    $('open-study').hidden = !on;   // Study together: admins host while it's in beta (anyone can join from a link)
    $('preview-new').hidden = !on || state.preview;
    $('view-as-row').hidden = !on; $('view-as').value = state.viewAs && !student ? state.viewAs : '';
    $('student-mode').hidden = !on;
    $('admin-mode').hidden = !student;
  }
  const setMode = (v) => {
    state.viewAs = v;
    try { v ? sessionStorage.setItem('tb_viewas', v) : sessionStorage.removeItem('tb_viewas'); } catch {}
    $('account-menu').hidden = true;
    applyRelease(); drawProMenu(); drawAdminMenu(); drawBars();
    if (v && location.hash === '#admin') location.hash = '#home'; else route();
    toast(v ? 'Student mode. Switch back from your account menu.' : 'Admin mode.');
  };
  $('student-mode').onclick = () => setMode('student');
  $('admin-mode').onclick = () => setMode(null);
  $('test-switch').onclick = async () => {
    const btn = $('test-switch'); btn.disabled = true; $('test-msg').textContent = 'Switching…';
    try {
      const { data: cur } = await sb.auth.getSession();
      const { data, error } = await sb.functions.invoke('test-account', { body: { action: 'switch' } });
      if (error || !data?.token_hash) { let msg = data?.error; try { msg = msg || (await error.context.json()).error; } catch {} throw new Error(msg || 'Could not switch.'); }
      sessionStorage.setItem('tb_admin_return', JSON.stringify({ email: state.user.email, access_token: cur.session.access_token, refresh_token: cur.session.refresh_token }));
      const { error: e2 } = await sb.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (e2) { sessionStorage.removeItem('tb_admin_return'); throw e2; }
      location.hash = '#home';
    } catch (err) { $('test-msg').textContent = err.message; }
    finally { btn.disabled = false; }
  };
  $('test-reset').onclick = async () => {
    if (!await confirmBox('Reset the test account?<span class="cb-sub">Deletes it and everything on it: marks, purchases, attempts and its level. Switching to it again makes a fresh one.</span>', 'Reset', 'Cancel')) return;
    const { data, error } = await sb.functions.invoke('test-account', { body: { action: 'reset' } });
    let msg = data?.error; if (error) { try { msg = (await error.context.json()).error; } catch { msg = error.message; } }
    $('test-msg').textContent = msg || 'Reset. The next switch makes a fresh test account.';
    if (!msg) renderAdmin();
  };
  $('test-back').onclick = async () => {
    let back = null; try { back = JSON.parse(sessionStorage.getItem('tb_admin_return') || 'null'); } catch {}
    if (!back) return;
    const { error } = await sb.auth.setSession({ access_token: back.access_token, refresh_token: back.refresh_token });
    sessionStorage.removeItem('tb_admin_return');
    if (error) { toast('Please sign in to your own account again.'); await sb.auth.signOut(); return; }
    location.hash = '#admin';
  };
  let pdfjsP = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return pdfjsP = pdfjsP || new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(window.pdfjsLib); };
      sc.onerror = () => { pdfjsP = null; rej(new Error('Could not load the PDF reader. Check your connection.')); };
      document.head.appendChild(sc);
    });
  }
  const LONG_SIDE = 1900, MAX_PAGES = 30;
  const toJpeg = (cv) => new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.75));
  function fitCanvas(w, h, side = LONG_SIDE) {
    const k = Math.min(1, side / Math.max(w, h));
    const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    return { cv, k };
  }
  async function filesToPages(files, step, side = LONG_SIDE) {
    const out = [];
    for (const f of files) {
      if (out.length >= MAX_PAGES) break;
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        const lib = await loadPdfJs();
        const doc = await lib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise;
        for (let i = 1; i <= doc.numPages && out.length < MAX_PAGES; i++) {
          step(`Reading page ${out.length + 1}…`);
          const pg = await doc.getPage(i);
          const v = pg.getViewport({ scale: 1 });
          const scale = side / Math.max(v.width, v.height);
          const vp = pg.getViewport({ scale });
          const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
          const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
          await pg.render({ canvasContext: ctx, viewport: vp }).promise;
          out.push(await toJpeg(cv));
        }
      } else if (f.type.startsWith('image/') || /\.(jpe?g|png|heic|webp)$/i.test(f.name)) {
        step(`Reading page ${out.length + 1}…`);
        let bmp;
        try { bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }); }
        catch { throw new Error(`Couldn't read ${f.name}. Use JPEG/PNG photos or a PDF.`); }
        const { cv, k } = fitCanvas(bmp.width, bmp.height, side);
        cv.getContext('2d').drawImage(bmp, 0, 0, bmp.width * k, bmp.height * k);
        out.push(await toJpeg(cv));
      }
    }
    if (!out.length) throw new Error('Choose a PDF or photos of your written answers.');
    return out;
  }
  function markGroups(qs) {
    // keep each question number together (they share a solution), at most ~24 marks per request
    const blocks = [];
    qs.filter(q => (q.type === 'mcq' && q.answer) || (q.type !== 'mcq' && q.marks)).forEach(q => {
      const key = q.type === 'mcq' ? 'mcq' : 'n' + q.number, last = blocks[blocks.length - 1];
      if (last && last.key === key) last.qs.push(q); else blocks.push({ key, qs: [q] });
    });
    const groups = []; let cur = [], m = 0;
    blocks.forEach(b => {
      const bm = b.qs.reduce((a, q) => a + (q.type === 'mcq' ? 1 : q.marks), 0);
      if (cur.length && (m + bm > 24 || cur.length + b.qs.length > 24)) { groups.push(cur); cur = []; m = 0; }
      cur.push(...b.qs); m += bm;
    });
    if (cur.length) groups.push(cur);
    return groups;
  }
  function automarkCard() {
    const e = state.exam;
    const c = mk('div', 'card automark');
    c.innerHTML = `<h2>Auto-mark from your written paper</h2>
      <p class="muted small">Upload a PDF scan or photos of your answers, including your multiple choice answer sheet. Claude reads your working against the marking guidelines and suggests a mark for every question. Check each one: you can change any mark before saving. Your pages are sent to Anthropic's Claude for marking, then deleted from Trialbank.</p>`;
    const row = mk('div', 'row');
    const inp = mk('input'); inp.type = 'file'; inp.accept = 'application/pdf,image/*'; inp.multiple = true;
    const go = mk('button', 'primary', e.ai && Object.keys(e.ai).length ? 'Re-mark' : 'Auto-mark');
    const st = mk('p', 'small am-status'); st.hidden = true;
    row.append(inp, go); c.append(row, st);
    if (e.ai && Object.keys(e.ai).length) { st.hidden = false; st.textContent = 'Auto-marked. Suggested marks are filled in below; check them against the solutions.'; }
    go.onclick = () => runAutomark(inp.files, go, st);
    return c;
  }
  async function runAutomark(files, btn, st) {
    const e = state.exam; if (!e) return;
    const say = (t, cls = '') => { st.hidden = false; st.className = 'small am-status ' + cls; st.textContent = t; };
    if (!files || !files.length) return say('Choose your PDF or photos first.', 'error');
    btn.disabled = true;
    const run = Date.now().toString(36), uid = state.user.id, paths = [];
    const session = (crypto.randomUUID ? crypto.randomUUID() : run + Math.random().toString(36).slice(2)).replace(/[^\w-]/g, '');   // one upload = one bought mark
    try {
      const blobs = await filesToPages([...files], say);
      for (let i = 0; i < blobs.length; i++) {
        say(`Uploading page ${i + 1} of ${blobs.length}…`);
        const path = `${uid}/${run}/p${String(i + 1).padStart(2, '0')}.jpg`;
        const { error } = await sb.storage.from('submissions').upload(path, blobs[i], { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        paths.push(path);
      }
      const pagePaths = paths.slice();
      const groups = markGroups(e.qs);
      const chunks = await sliceTallImages(groups.flat(), `${uid}/${run}`, say, paths);
      let done = 0, cost = 0; const failed = [];
      const call = async (g) => {
        const { data, error } = await sb.functions.invoke('automark', { body: { paper_id: e.paper.id, pages: pagePaths, question_ids: g.map(q => q.id), chunks: pick(chunks, g), session } });
        if (error) {
          let msg = error.message;
          try { msg = (await error.context.json()).error || msg; } catch {}
          throw new Error(msg);
        }
        applyMarks(data.results); cost += data.cost_usd || 0;
        say(`Marking… ${++done} of ${groups.length} sections done.`);
      };
      say(`Marking… 0 of ${groups.length} sections done. This takes a minute or two.`);
      // first section alone so your pages are cached, then the rest together
      try { await call(groups[0]); } catch (err) { if (groups.length === 1 || /limit|budget|switched off|sign in|set up/i.test(err.message)) throw err; failed.push(err.message); }
      const rest = await Promise.allSettled(groups.slice(1).map(call));
      rest.forEach(r => { if (r.status === 'rejected') failed.push(r.reason.message); });
      saveExam(); renderExamBody(); updateRunning();
      const msg = failed.length ? `Marked ${done} of ${groups.length} sections. ${failed.length} failed (${failed[0]}). Tap Re-mark to try again, or mark those yourself.` : 'Auto-marked. Suggested marks are filled in below; check each one against the solutions.';
      const st2 = document.querySelector('.automark .am-status'); if (st2) { st2.hidden = false; st2.className = 'small am-status ' + (failed.length ? 'error' : ''); st2.textContent = msg; }
    } catch (err) {
      say(err.message || String(err), 'error');
    } finally {
      drawMarkLeft();
      btn.disabled = false;
      if (paths.length) sb.storage.from('submissions').remove(paths).catch(() => {});
    }
  }
  // The API rejects images over ~2000px in many-image requests. Tall solution/question images are
  // cut into overlapping strips here and uploaded beside the student's pages.
  async function sliceTallImages(qs, folder, say, paths) {
    const MAXW = 1600, STRIP = 1800, OVER = 80, out = {};
    const want = new Map();
    qs.forEach(q => {
      if (q.image_path && q.imageUrl) want.set(q.image_path, q.imageUrl);
      if (q.type !== 'mcq' && q.solution_path && q.solutionUrl) want.set(q.solution_path, q.solutionUrl);
    });
    let n = 0;
    for (const [path, url] of want) {
      let bmp;
      try { bmp = await createImageBitmap(await (await fetch(url, { cache: 'no-store' })).blob()); } catch { continue; }
      if (bmp.width <= 1900 && bmp.height <= 1900) continue;
      const k = Math.min(1, MAXW / bmp.width), W = Math.round(bmp.width * k), H = Math.round(bmp.height * k);
      const list = [];
      for (let y = 0; y < H; y += STRIP - OVER) {
        const h = Math.min(STRIP, H - y);
        const cv = document.createElement('canvas'); cv.width = W; cv.height = h;
        const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, h);
        ctx.drawImage(bmp, 0, y / k, bmp.width, h / k, 0, 0, W, h);
        const cp = `${folder}/ref${String(++n).padStart(3, '0')}.jpg`;
        say(`Preparing marking guidelines (${n})…`);
        const { error } = await sb.storage.from('submissions').upload(cp, await toJpeg(cv), { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        paths.push(cp); list.push(cp);
        if (y + h >= H) break;
      }
      out[path] = list;
    }
    return out;
  }
  const pick = (chunks, g) => {
    const o = {};
    g.forEach(q => [q.image_path, q.solution_path].forEach(p => { if (p && chunks[p]) o[p] = chunks[p]; }));
    return o;
  };
  function applyMarks(results) {
    const e = state.exam; if (!e) return;
    e.ai = e.ai || {}; e.lost = e.lost || {};
    (results || []).forEach(x => {
      const q = e.qs.find(q => q.id === x.id); if (!q) return;
      if (q.type === 'mcq') { const ch = String(x.choice || '').trim().toUpperCase(); if (/^[A-E]$/.test(ch)) e.answers[q.id] = ch; }
      else { e.marks[q.id] = x.awarded; if (x.lost && x.lost.length) e.lost[q.id] = x.lost; else delete e.lost[q.id]; }
      e.ai[q.id] = { found: x.found, awarded: x.awarded, out_of: x.out_of, feedback: x.feedback };
    });
  }

  // ---------- tutor (prototype): one step at a time on real past questions, adapting to each student ----------
  const TU_MODES = {
    quiz: ['Quiz me', 'One step at a time. You answer, I check, then we go on.'],
    teach: ['Teach me', 'The idea behind it first, then you have a go.'],
    stuck: ["I'm stuck", "Hints that only get stronger if you need them. Bring your own question if you like."],
    check: ['Check my work', 'Do it on paper, send a photo, and I mark it against the guidelines.'],
  };
  const TU_LEVEL = { 1: [1, 2], 2: [2, 3], 3: [3, 6] };
  const TU_LEVEL_NAME = { 1: 'warm-up', 2: 'standard', 3: 'harder' };
  const TU_SYMS = ['²', '³', '√', 'π', 'θ', '∫', 'dx', '≤', '≥', '≠', '∞', 'ln', 'eˣ', '±', '°', '→'];
  const tu = { mode: lsGet('tb_tu_mode') || 'quiz', level: lsGet('tb_tu_level') || 2, q: null, msgs: [], chunks: {}, paths: [], pending: [],
    busy: false, done: null, active: false, session: null, topic: '', focus: null, slipped: false, seen: new Set(lsGet('tb_tu_seen') || []), n: 0 };
  // Pro only (plus admins); an admin viewing as a level sees exactly what that level gets. The server checks too.
  const tuAllowed = () => !!state.user && !state.preview && ((state.admin && !state.viewAs) || (state.viewAs ? state.viewAs === 'pro' : state.release?.level === 'pro'));
  // anyone with bought tutor messages can use the tutor too (and Explain my mistake), without the rest of Pro
  const tutorUsable = () => tuAllowed() || (!!state.user && !state.preview && !state.viewAs && (state.tutorCredits || 0) > 0);
  const packsOpen = () => !!state.user && !state.preview && (state.tutorPacks === 'on' || (state.tutorPacks === 'admin' && adminOn()));
  const TUTOR_PACKS = [{ n: 150, price: 4.99 }, { n: 300, price: 8.99 }];
  function openTutorPacks() {
    $('account-menu').hidden = true;
    const m = mk('div', 'modal buy');
    m.innerHTML = `<div class="modal-card buy-card" role="dialog" aria-modal="true" aria-labelledby="tp-h">
      <button class="link buy-x" data-k="" aria-label="Close">✕</button>
      <h2 id="tp-h">More time with the tutor</h2>
      <p class="buy-sub">Messages never expire.${tuAllowed() ? ' Your monthly Pro messages get used first.' : ' Use them for any subject, and for Explain my mistake.'}${state.tutorCredits ? ` You have <b>${state.tutorCredits}</b> left.` : ''}</p>
      <div class="buy-packs tp-packs">${TUTOR_PACKS.map((p, i) => `<button class="buy-pack${i === 1 ? ' pop' : ''}" data-k="${p.n}" style="--i:${i}">
        <span class="buy-tag">${i === 1 ? 'Best value' : ''}</span>
        <span class="buy-n">${p.n}</span><span class="buy-u">messages</span>
        <span class="buy-price">A$${p.price.toFixed(2)}</span></button>`).join('')}</div>
      ${!tuAllowed() && proOpen() ? `<p class="small muted">Or go Pro: 300 messages every month plus everything else, from A$8.25 a month. <button class="link small" data-k="pro">See Pro</button></p>` : ''}
      <p class="small muted">Secure payment with Stripe.</p>
    </div>`;
    const done = () => { m.classList.add('out'); setTimeout(() => m.remove(), 180); };
    m.onclick = async (ev) => {
      if (ev.target === m) return done();
      const b = ev.target.closest('[data-k]'); if (!b) return;
      if (!b.dataset.k) return done();
      if (b.dataset.k === 'pro') { done(); return openPro('tutor'); }
      b.disabled = true; toast('Opening secure checkout…');
      const { data, error } = await sb.functions.invoke('buy-marks', { body: { tutor: b.dataset.k } });
      if (error || !data?.url) { let msg = error?.message || 'Could not start the payment.'; try { msg = (await error.context.json()).error || msg; } catch {} b.disabled = false; return toast(esc(msg)); }
      goStripe(data.url);
    };
    document.body.appendChild(m);
  }
  // back from Stripe with a tutor pack: wait for the messages to land
  function afterTutorPack() {
    const n = new URLSearchParams(location.search).get('tutorpack'); if (!n) return;
    history.replaceState(null, '', location.pathname + location.hash);
    const before = state.tutorCredits || 0; let tries = 0;
    toast(`Payment received. Adding <b>${esc(n)} tutor messages</b>…`, 4000);
    const poll = setInterval(async () => {
      const { data } = await sb.rpc('my_tutor_left');
      if (data && (data.credits > before || ++tries > 20)) {
        clearInterval(poll); state.tutorCredits = data.credits || 0; applyRelease(); tuLeft = { ...data, left: Math.max(0, data.allowance - data.used) }; drawTuLeft();
        toast(data.credits > before ? `<b>${data.credits} tutor messages</b> ready. They never expire.` : 'Your messages are taking a little longer to arrive. They\'ll appear on their own.', 6000);
        if (location.hash !== '#tutor') location.hash = '#tutor'; else renderTutor();
      }
    }, 2000);
  }
  setTimeout(() => afterTutorPack(), 0);
  const tuSubjects = () => (C.tutor && C.tutor.subjects) || Object.keys(C.subjects);
  const tuSubject = () => tuSubjects().includes(state.subject) ? state.subject : tuSubjects()[0];

  let katexP = null;
  function loadKatex() {
    if (window.katex) return Promise.resolve();
    if (katexP) return katexP;
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    document.head.appendChild(css);
    katexP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
      s.onload = res; s.onerror = () => { katexP = null; rej(new Error('maths renderer did not load')); };
      document.head.appendChild(s);
    });
    return katexP;
  }
  // a little markdown (bold, italics, paragraphs) with LaTeX maths rendered by KaTeX
  function tuRich(t) {
    const math = [];
    let s = String(t || '').replace(/\u0000/g, '').replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g, (m, a, b, c, d) => {
      math.push([a ?? b ?? c ?? d, a != null || b != null]); return `\u0000${math.length - 1}\u0000`;
    });
    s = esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>')
      .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => {
      const [tex, disp] = math[+i];
      try { return window.katex ? katex.renderToString(tex, { displayMode: disp, throwOnError: false }) : esc(tex); } catch { return esc(tex); }
    });
    return `<p>${s}</p>`;
  }

  // the Tutor tab for someone without access: what the tutor does, then the ways in
  function renderTutorIntro() {
    ['tu-modes', 'tu-modehint', 'tu-start', 'tu-session', 'tu-end', 'tu-left'].forEach(id => { const e = $(id); if (e) e.hidden = true; });
    $('tu-sub').textContent = 'Comes with Pro';
    $('tu-intro').hidden = false;
    const p = state.pro || {}, trialsOpen = p.trials === 'on' || (p.trials === 'admin' && adminOn());
    const canTrial = trialsOpen && !p.active && !p.pass && !p.trial_used;
    $('tu-intro-go').innerHTML = (canTrial ? `<button class="primary" data-k="trial">Try Pro free for 7 days</button><p class="small muted">No card needed.</p>` : `<button class="primary" data-k="pro">See Pro</button>`)
      + (packsOpen() ? `<button class="link" data-k="packs">Or just buy tutor messages, from A$4.99</button>` : '');
    $('tu-intro-go').onclick = (ev) => {
      const b = ev.target.closest('[data-k]'); if (!b) return;
      if (b.dataset.k === 'packs') return openTutorPacks();
      openPro('tutor');
      if (b.dataset.k === 'trial') setTimeout(() => document.querySelector('.pro-modal .pro-trial')?.focus(), 300);
    };
  }
  async function renderTutor() {
    $('tu-intro').hidden = true; ['tu-modes', 'tu-modehint'].forEach(id => { const e = $(id); if (e) e.hidden = true; });   // straight into the chat: the way of working is picked from the starters
    loadKatex().catch(() => {});
    const subj = tuSubject();
    if (tu.active && tu.subject && tu.subject !== subj) { tuCleanup(); tu.active = false; tu.q = null; tu.msgs = []; tu.done = null; tu.topic = ''; }   // switched subject: start fresh in the new one
    $('tu-sub').textContent = C.subjects[subj];
    loadTuLeft();
    drawTuModes();
    $('tu-start').hidden = tu.active; $('tu-session').hidden = !tu.active; $('tu-end').hidden = !tu.active;
    if (tu.handoff) { const q = tu.handoff; tu.handoff = null; tuStart(false, q); return; }
    if (tu.active) { tuDraw(); drawTuRecent(); return; }
    if (!tu.restoreTried) { tu.restoreTried = true; try { if (await tuRestore()) { drawTuRecent(); return; } } catch (err) { console.warn('tutor restore', err); } }
    await tuBlank(); return;
    const [{ data: tc }, { data: notes }] = await Promise.all([
      sb.from('topic_counts').select('topic, n, type').eq('subject', subj),
      sb.from('tutor_notes').select('notes').eq('subject', subj).maybeSingle(),
    ]);
    const topics = [...new Set((tc || []).filter(r => r.type === 'short' && r.topic && r.n >= 5).map(r => r.topic))].sort((a, b) => topicName(a).localeCompare(topicName(b)));
    $('tu-topic').innerHTML = '<option value="">My weak spots</option>' + topics.map(t => `<option value="${esc(t)}">${esc(topicName(t))}</option>`).join('');
    $('tu-topic').value = tu.topic && topics.includes(tu.topic) ? tu.topic : '';
    const n = notes?.notes || [];
    $('tu-learnt').innerHTML = n.length ? `<b>What I've learnt about how you work</b><ul>${n.slice(-3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
      : '<span class="muted">I learn how you like to work as we go, and remember it next time.</span>';
  }
  // an empty chat, ready to type into; the starters underneath pick a way of working
  async function tuBlank() {
    await tuLoad(null);
    tu.msgs.push({ role: 'tutor', greet: true, text: 'What are we working on? Ask me anything, or pick one.' });
    tuDraw();
  }
  function tuStarters() {
    const box = mk('div', 'tu-starters');
    const go = (mode, own) => { tu.mode = mode; lsSet('tb_tu_mode', mode); drawTuModes(); tuStart(own); };
    [['Quiz me on my weak spots', () => { tu.topic = ''; go('quiz'); }],
     ['Teach me a topic', () => pickTopic('teach')],
     ["I'm stuck on a question", () => go('stuck', true)],
     ['Check my work', () => { tu.topic = ''; go('check'); }]].forEach(([l, f]) => { const b = mk('button', 'tu-start-chip', esc(l)); b.type = 'button'; b.onclick = f; box.appendChild(b); });
    async function pickTopic(mode) {
      const subj = tuSubject();
      const { data: tc } = await sb.from('topic_counts').select('topic, n, type').eq('subject', subj);
      const skip = skipped(subj);
      const topics = [...new Set((tc || []).filter(r => r.type === 'short' && r.topic && r.n >= 5).map(r => r.topic))].filter(t => !skip.has(t));
      box.innerHTML = '';
      teachingOrder(topics).forEach(([, t]) => { const b = mk('button', 'tu-start-chip', esc(topicName(t))); b.type = 'button'; b.onclick = () => { tu.topic = t; go(mode); }; box.appendChild(b); });
    }
    return box;
  }
  function drawTuModes() {
    const box = $('tu-modes'); box.innerHTML = '';
    Object.entries(TU_MODES).forEach(([k, [label]]) => {
      const b = mk('button', k === tu.mode ? 'on' : '', esc(label));
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === tu.mode);
      b.onclick = () => tuSetMode(k);
      box.appendChild(b);
    });
    $('tu-modehint').textContent = TU_MODES[tu.mode][1];
    $('tu-go').textContent = tu.mode === 'check' ? 'Give me a question' : 'Start';
    $('tu-own').hidden = tu.mode !== 'stuck';
    $('tu-text').placeholder = tu.mode === 'check' ? 'Send a photo of your working, or type it…' : 'Your answer or working…';
  }
  function tuSetMode(k) {
    if (k === tu.mode) return;
    tu.mode = k; lsSet('tb_tu_mode', k); drawTuModes();
    if (tu.active && !tu.busy) { tu.msgs.push({ role: 'student', sys: true, text: `(Switched to ${TU_MODES[k][0]} mode.)` }); tuSend(); }
  }

  async function tuPick(subj) {
    const [{ data: stats }, { data: slips }, { data: tc }, { data: seen }] = await Promise.all([
      sb.from('my_topic_stats').select('topic, attempts, score, out_of').eq('subject', subj),
      sb.from('tutor_slips').select('topic, created_at').eq('subject', subj).order('created_at', { ascending: false }).limit(30),
      sb.from('topic_counts').select('topic, n, type').eq('subject', subj),
      sb.from('attempts').select('question_id').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(500),
    ]);
    const skip = skipped(subj);
    const topics = [...new Set((tc || []).filter(r => r.type === 'short' && r.topic && r.n >= 5).map(r => r.topic))].filter(t => !skip.has(t));
    let topic = tu.topic || tu.focus;
    const order = [];
    if (!topic || !topics.includes(topic)) {
      // weak spots first: low accuracy, recent slips, and topics never tried all pull harder
      const st = Object.fromEntries((stats || []).map(r => [r.topic, r]));
      const sl = {}; (slips || []).forEach((r, i) => { if (r.topic) sl[r.topic] = (sl[r.topic] || 0) + (i < 10 ? 1 : 0.5); });
      const w = topics.map(t => { const r = st[t], acc = r && r.out_of ? r.score / r.out_of : null; return [t, 0.4 + (acc == null ? 0.9 : (1 - acc) * 2.2) + (sl[t] || 0) * 0.7]; });
      let x = Math.random() * w.reduce((a, [, v]) => a + v, 0);
      topic = (w.find(([, v]) => (x -= v) <= 0) || w[0] || [null])[0];
      order.push(...w.sort((a, c) => c[1] - a[1]).map(([t]) => t).filter(t => t !== topic));   // fallbacks, weakest first
    }
    if (!topic) throw new Error('No topics are ready for the tutor yet.');
    for (const t of [topic, ...order.slice(0, 4)]) {
      const q = await tuPickIn(subj, t, seen);
      if (q) return q;
    }
    throw new Error('No questions on that topic yet. Pick another.');
  }
  async function tuPickIn(subj, topic, seen) {
    const seenIds = new Set([...(seen || []).map(a => a.question_id), ...tu.seen]);
    const [lo, hi] = TU_LEVEL[tu.level] || TU_LEVEL[2];
    const base = () => sb.from('questions').select('id, qid, number, part, type, marks, topic, image_path, solution_path, papers!inner(subject, school, year, difficulty)')
      .eq('papers.subject', subj).eq('topic', topic).eq('type', 'short').not('image_path', 'is', null).not('solution_path', 'is', null).is('syllabus_note', null).limit(300);
    let { data, error } = await base().gte('marks', lo).lte('marks', hi);
    if (error) throw error;
    await loadStepBlock(subj); const blk = blockedQs();
    let pool = (data || []).filter(q => !seenIds.has(q.id) && !blk.has(q.id));
    if (!pool.length) { ({ data } = await base()); const ok = (data || []).filter(q => !blk.has(q.id)); pool = ok.filter(q => !seenIds.has(q.id)); if (!pool.length) pool = ok; }
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  async function tuCleanup() {
    const keep = new Set(tuRecent().map(r => r.path));
    const p = tu.paths.splice(0).filter(x => !keep.has(x));   // question slices go; the student's own photos stay for 7 days
    if (p.length) sb.storage.from('submissions').remove(p).catch(() => {});
  }
  // ---------- the student's recent tutor photos, so homework does not need uploading again (7 days) ----------
  const TU_PHOTO_DAYS = 7;
  const tuRecentKey = () => `tb_tu_photos_${state.user?.id}`;
  function tuRecent() {
    const all = lsGet(tuRecentKey()) || [], cut = Date.now() - TU_PHOTO_DAYS * 864e5;
    const old = all.filter(r => r.at < cut).map(r => r.path);
    if (old.length) { lsSet(tuRecentKey(), all.filter(r => r.at >= cut)); sb.storage.from('submissions').remove(old).catch(() => {}); }
    return all.filter(r => r.at >= cut);
  }
  function tuRemember(paths) {
    const all = tuRecent().filter(r => !paths.includes(r.path));
    lsSet(tuRecentKey(), [...paths.map(path => ({ path, at: Date.now(), subject: tu.subject })), ...all].slice(0, 40));
  }
  const tuUrlCache = new Map();
  async function tuSign(paths) {
    const need = paths.filter(p => !tuUrlCache.has(p));
    if (need.length) {
      const { data } = await sb.storage.from('submissions').createSignedUrls(need, 3600);
      (data || []).forEach(d => { if (d.signedUrl) tuUrlCache.set(d.path, d.signedUrl); });
    }
    return paths.map(p => tuUrlCache.get(p) || null);
  }
  async function drawTuRecent() {
    const box = $('tu-recent'); if (!box) return;
    const inChat = new Set([...tu.msgs.flatMap(m => m.images || []), ...tu.pending.map(f => f.path).filter(Boolean)]);
    const list = tuRecent().filter(r => !inChat.has(r.path) && (!r.subject || r.subject === tuSubject())).slice(0, 12);
    if (!list.length) { box.hidden = true; return; }
    const urls = await tuSign(list.map(r => r.path));
    const ok = list.map((r, i) => ({ ...r, url: urls[i] })).filter(r => r.url);
    if (!ok.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<p class="small muted">Your photos from earlier · tap to add</p><div class="tu-recent-row">${ok.map((r, i) => `<button type="button" data-i="${i}" aria-label="Add this photo"><img src="${r.url}" alt=""></button>`).join('')}</div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
      if (tu.pending.length >= 4) return toast('Up to 4 photos per message.');
      const r = ok[+b.dataset.i]; tu.pending.push({ path: r.path, url: r.url }); drawTuPending(); drawTuRecent();
    });
  }
  // ---------- keep the current chat, so a reload or another tab doesn't lose it ----------
  const tuChatKey = () => `tb_tu_chat_${state.user?.id}`;
  function tuSave() {
    if (!state.user || !tu.active) return;
    lsSet(tuChatKey(), { at: Date.now(), subject: tu.subject, qid: tu.q?.id || null, mode: tu.mode, session: tu.session, n: tu.n, done: tu.done,
      msgs: tu.msgs.filter(m => !m.error && m.role !== 'offer').map(({ files, thumbs, ...m }) => m).slice(-40) });
  }
  async function tuRestore() {
    const c = lsGet(tuChatKey());
    if (!c || Date.now() - c.at > 7 * 864e5 || c.subject !== tuSubject() || !c.msgs?.length) return false;
    let q = null;
    if (c.qid) {
      const { data } = await sb.from('questions').select('id, qid, number, part, type, marks, topic, image_path, solution_path, content, papers!inner(subject, school, year, difficulty)').eq('id', c.qid).maybeSingle();
      q = data || null;
    }
    await tuLoad(q);
    Object.assign(tu, { session: c.session || tu.session, n: c.n || 0, done: c.done || null, msgs: c.msgs });
    const paths = [...new Set(c.msgs.flatMap(m => m.images || []))];
    if (paths.length) { const urls = await tuSign(paths); const u = new Map(paths.map((p, i) => [p, urls[i]])); tu.msgs.forEach(m => { if (m.images?.length) m.thumbs = m.images.map(p => u.get(p)).filter(Boolean); }); }
    tuDraw(); return true;
  }
  async function tuStart(own = false, given = null) {
    if (tu.busy) return;
    $('tu-error').hidden = true;
    const btn = $('tu-go'); btn.disabled = true;
    try {
      await tuLoad(given || (own ? null : await tuPick(tuSubject())));
      if (given?.ask) { await tuSend(given.ask); return; }
      if (own) { tu.msgs.push({ role: 'tutor', text: "Send me the question you're stuck on: a photo is easiest, or type it out. Then tell me what you've tried so far." }); tuDraw(); }
      else await tuSend();
    } catch (err) {
      $('tu-error').textContent = err.message || String(err); $('tu-error').hidden = false;
      if (tu.active) { tu.msgs.push({ sys: true, text: err.message || String(err) }); tuDraw(); }
    } finally { btn.disabled = false; }
  }
  // load a question (or none, for their own) as a fresh conversation
  async function tuLoad(q) {
    await tuCleanup();
    tu.session = Date.now().toString(36); tu.msgs = []; tu.chunks = {}; tu.done = null; tu.slipped = false; tu.n = 0; tu.flagged = false;
    tu.q = q; tu.subject = tuSubject();
    if (q) {
      await attachUrls([q]);
      tu.seen.add(q.id); lsSet('tb_tu_seen', [...tu.seen].slice(-400));
      tu.chunks = await sliceTallImages([q], `${state.user.id}/tutor-${tu.session}`, () => {}, tu.paths);
    }
    tu.active = true;
    $('tu-start').hidden = true; $('tu-session').hidden = false; $('tu-end').hidden = false;
    tuDrawQuestion(); drawTuRecent(); tuSave(); drawTuLeft();
  }
  // "James Ruse 2025 11a", "HSC 2023 Q14(b)": find that question in the bank
  let tuPapers = null;
  async function tuFind(text, subj) {
    const t = ' ' + String(text).toLowerCase().replace(/[^a-z0-9()]+/g, ' ') + ' ';
    const y = t.match(/\b(20[0-3]\d)\b/); if (!y) return null;
    const rest = t.replace(y[0], ' ');
    const m = rest.match(/(?:^|\s)(?:q|question)?\s*(\d{1,2})\s*\(?\s*([a-h])?\s*\)?\s*(?:\(?\s*(iv|v|i{1,3})\s*\)?)?(?=\s)/);
    if (!m) return null;
    if (!tuPapers || tuPapers.subj !== subj) { const { data } = await sb.from('papers').select('id, slug, school, year, difficulty').eq('subject', subj); tuPapers = { subj, rows: data || [] }; }
    const norm = (x) => String(x).toLowerCase().replace(/[^a-z]/g, ''), flat = norm(rest);
    const p = tuPapers.rows.filter(r => r.year == y[1] && norm(r.school) && flat.includes(norm(r.school))).sort((a, b) => norm(b.school).length - norm(a.school).length)[0];
    if (!p) return null;
    const { data: qs } = await sb.from('questions').select('id, qid, number, part, type, marks, topic, image_path, solution_path, content').eq('paper_id', p.id);
    const list = (qs || []).filter(q => q.image_path && !q.content).sort((a, b) => a.qid.localeCompare(b.qid));
    const base = 'q' + m[1].padStart(2, '0'), part = (m[2] || '') + (m[3] || '');
    const q = list.find(q => q.qid === base + part) || (m[2] && list.find(q => q.qid.startsWith(base + m[2]))) || list.find(q => q.qid === base) || list.find(q => q.qid.startsWith(base));
    if (!q) return { missing: `${p.school} ${p.year} Q${m[1]}${m[2] || ''}` };
    const ask = part && !q.part ? `I'm doing part (${m[2]})${m[3] ? `(${m[3]})` : ''}.` : null;   // the bank has the whole question: say which part
    return { ...q, ask, papers: { subject: subj, school: p.school, year: p.year, difficulty: p.difficulty } };
  }
  function tuDrawQuestion() {
    const q = tu.q, card = $('tu-q');
    tuAnnButton();
    card.hidden = !q;
    if (!q) return;
    $('tu-qmeta').textContent = `${q.papers.school} ${q.papers.year} ${label(q)} · ${marksText(q.marks)} · ${topicName(q.topic)}`;
    const im = $('tu-qimg'); im.dataset.trimmed = ''; im.crossOrigin = 'anonymous'; im.onload = () => trimImg(im); im.src = q.imageUrl;
    card.classList.remove('folded'); $('tu-qtoggle').textContent = 'Hide';
  }
  $('tu-qflag').onclick = () => tu.q && flagQuestion(tu.q, $('tu-qflag'));
  $('tu-qtoggle').onclick = () => { const f = $('tu-q').classList.toggle('folded'); $('tu-qtoggle').textContent = f ? 'Show question' : 'Hide'; };

  // the tutor spotted a whole paper: offer to send it to Auto-mark, with a clear "this uses 1 mark" before anything happens
  function tuOfferCard(m, i) {
    const c = mk('div', 'tu-offer');
    if (m.state === 'used') { c.innerHTML = '<p class="small muted">Sent to Auto-mark.</p>'; return c; }
    c.innerHTML = `<p class="tu-offer-h">Mark the whole paper with Auto-mark?</p>
      <p class="small muted" data-left>Checking how many marks you have…</p>
      <div class="tu-offer-row"><button class="primary" data-go disabled>Auto-mark it</button><button class="link" data-no>No, one question at a time here</button></div>`;
    markCounts().then(n => {
      const left = c.querySelector('[data-left]'), go = c.querySelector('[data-go]');
      if (n.unlimited) { left.textContent = 'Uses 1 auto-mark.'; go.disabled = false; return; }
      if (n.total > 0) { left.innerHTML = `Uses <b>1</b> of your <b>${n.total}</b> auto-mark${n.total === 1 ? '' : 's'}. The tutor doesn't use any messages for it.`; go.disabled = false; return; }
      left.textContent = "You're out of auto-marks this month.";
      if (n.canBuy) { go.textContent = 'Get more marks'; go.disabled = false; go.onclick = () => openBuy(); }
    }).catch(() => { c.querySelector('[data-left]').textContent = 'Uses 1 auto-mark.'; c.querySelector('[data-go]').disabled = false; });
    c.querySelector('[data-no]').onclick = () => { tu.msgs.splice(i, 1); tuDraw(); $('tu-text')?.focus(); };
    c.querySelector('[data-go]').onclick = () => tuAutoMark(i);
    return c;
  }
  async function tuAutoMark(i) {
    const work = [];
    for (const x of tu.msgs) {
      if (x.role !== 'student' || !x.images?.length) continue;
      if (x.files?.length === x.images.length) { work.push(...x.files); continue; }
      for (const p of x.images) { const { data } = await sb.storage.from('submissions').download(p); if (data) work.push(new File([data], p.split('/').pop(), { type: data.type || 'image/jpeg' })); }
    }
    const m = mk('div', 'modal buy');
    m.innerHTML = `<div class="modal-card buy-card tu-am" role="dialog" aria-modal="true" aria-labelledby="tu-am-h">
      <button class="link buy-x" data-x aria-label="Close">✕</button>
      <h2 id="tu-am-h">Auto-mark this paper</h2>
      <p class="small muted">Your working: <b>${work.length}</b> photo${work.length === 1 ? '' : 's'} from this chat.</p>
      <label class="tu-am-f"><span>The paper (questions)</span><input type="file" data-p accept="image/*,application/pdf" multiple></label>
      <label class="tu-am-chk"><input type="checkbox" data-same> My photos already show the questions</label>
      <label class="tu-am-f"><span>Solutions <em class="muted">(optional, makes marking more accurate)</em></span><input type="file" data-s accept="image/*,application/pdf" multiple></label>
      <p class="small" data-say></p>
      <button class="primary" data-go>Use 1 auto-mark</button>
    </div>`;
    const q = (k) => m.querySelector(k), say = (t, err) => { q('[data-say]').textContent = t; q('[data-say]').className = 'small ' + (err ? 'error' : 'muted'); };
    const close = () => { if (!busy) m.remove(); };
    let busy = false;
    q('[data-x]').onclick = close; m.onclick = (ev) => { if (ev.target === m) close(); };
    q('[data-go]').onclick = async () => {
      const P = q('[data-same]').checked ? work : [...q('[data-p]').files];
      if (!P.length) return say('Add the paper, or tick that your photos show the questions.', true);
      busy = true; q('[data-go]').disabled = true;
      try {
        const rec = await ownMark(P, work, [...q('[data-s]').files], say);
        m.remove(); tu.msgs[i] = { role: 'offer', state: 'used' };
        const got = rec.results.reduce((a, r) => a + r.awarded, 0), of = rec.results.reduce((a, r) => a + r.out_of, 0);
        tu.msgs.push({ role: 'result', rec }, { role: 'tutor', text: `Marked: ${got}/${of}. Pick a question where you lost marks and we'll go through it together.` });
        tuDraw();
      } catch (err) { say(err.message || String(err), true); busy = false; q('[data-go]').disabled = false; }
    };
    document.body.appendChild(m);
  }
  function tuDraw() {
    const th = $('tu-thread'); th.innerHTML = '';
    tu.msgs.forEach((m, i) => {
      if (m.sys) { th.appendChild(mk('div', 'tu-sys', esc(m.text.replace(/^\(|\)$/g, '')))); return; }
      if (m.role === 'offer') { th.appendChild(tuOfferCard(m, i)); return; }
      if (m.role === 'result') { const w = mk('div', 'tu-msg tutor tu-marked'); w.appendChild(ownResult(m.rec)); th.appendChild(w); return; }
      const el = mk('div', 'tu-msg ' + m.role + (m.error ? ' err' : ''));
      if (m.thumbs?.length) { const ph = mk('div', 'tu-pics'); m.thumbs.forEach(u => { const im = mk('img'); im.src = u; im.alt = 'Your working'; ph.appendChild(im); }); el.appendChild(ph); }
      if (m.text) el.appendChild(mk('div', 'tu-text', m.role === 'tutor' ? tuRich(m.text) : `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>`));
      if (m.slip) el.appendChild(mk('div', 'tu-note', `Noted: ${esc(m.slip)}`));
      if (m.learnt) el.appendChild(mk('div', 'tu-note', `Learnt about you: ${esc(m.learnt)}`));
      if (m.error && m.buy) {   // out of messages: offer a pack (or Pro), then let them carry on
        const row = mk('div', 'tu-buyrow');
        if (packsOpen()) { const b = mk('button', 'primary small', 'Get more messages'); b.onclick = openTutorPacks; row.appendChild(b); }
        if (!tuAllowed() && proOpen()) { const b = mk('button', 'link small', 'See Pro'); b.onclick = () => openPro('tutor'); row.appendChild(b); }
        const retry = mk('button', 'link small', 'Try again'); retry.onclick = () => { tu.msgs.splice(i, 1); tuSend(); }; row.appendChild(retry);
        el.appendChild(row);
      } else if (m.error) {
        const retry = mk('button', 'link small', 'Try again');
        retry.onclick = () => { tu.msgs.splice(i, 1); tuSend(); };
        el.appendChild(retry);
      }
      th.appendChild(el);
      if (m.greet && tu.msgs.length === 1 && !tu.busy) th.appendChild(tuStarters());
    });
    const blank = tu.msgs.length === 1 && !!tu.msgs[0].greet;
    $('tu-quick').hidden = blank;
    $('tu-text').placeholder = blank ? 'Ask anything…' : tu.mode === 'check' ? 'Send a photo of your working, or type it…' : 'Your answer or working…';
    if (tu.busy) th.appendChild(mk('div', 'tu-msg tutor typing', '<span></span><span></span><span></span>'));
    const d = tu.done, box = $('tu-done');
    box.hidden = !d;
    if (d) {
      const lvl = TU_LEVEL_NAME[tu.level];
      const nextTopic = tu.topic ? topicName(tu.topic) : tu.focus ? `${topicName(tu.focus)} again, to lock in that slip` : 'your weak spots';
      box.innerHTML = `${d.awarded != null && d.out_of ? `<div class="tu-score"><b>${d.awarded}<em>/${d.out_of}</em></b><span>on your own</span></div>` : ''}
        <button class="primary" id="tu-next">Next question</button>
        <p class="small muted">Next: ${esc(lvl)} · ${esc(nextTopic)}</p>`;
      $('tu-next').onclick = () => tuStart(false);
    }
    $('tu-send').disabled = tu.busy;
    const last = d ? box : th.lastElementChild;
    if (!last) return;
    requestAnimationFrame(() => requestAnimationFrame(() => last.scrollIntoView({ block: d ? 'nearest' : 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })));   // like a chat: the newest message sits just above the message box
  }

  // ---------- tutor allowance: "286 of 300 messages left this month" ----------
  let tuLeft = null;
  async function loadTuLeft() {
    if (!state.user || state.preview) return null;
    try { const { data } = await sb.rpc('my_tutor_left'); if (data) tuLeft = { ...data, left: Math.max(0, data.allowance - data.used) }; } catch {}
    drawTuLeft(); return tuLeft;
  }
  // how the month is going: compares what's been used with an even pace through to the refill day
  function pace(used, allowance, refills, fmt = (n) => n) {
    const end = new Date(refills + 'T00:00:00'), start = new Date(end); start.setMonth(start.getMonth() - 1);
    const now = Date.now(), days = (end - start) / 864e5, gone = Math.max(0, Math.min(days, (now - start) / 864e5));
    const f = gone / days, left = allowance - used, tick = Math.round(100 * (1 - f));   // where "left" would sit at an even pace
    if (left <= 0) return { tick, cls: 'out', text: `All used. Refills ${refillDay(refills)}.` };
    if (used === 0) return { tick, cls: 'ok', text: gone < 3 ? 'Fresh month, all of it to use.' : 'Not touched yet this month.' };
    if (gone < 2 && used < allowance * 0.25) return { tick, cls: 'ok', text: 'Early days. Plenty left.' };
    const rate = used / Math.max(gone, 1), proj = rate * days;
    if (proj > allowance * 1.03) {
      const runOut = new Date(start.getTime() + (allowance / rate) * 864e5), early = Math.round((end - runOut) / 864e5);
      return { tick, cls: 'warn', text: early >= 7 ? `At this pace you'll run out around ${runOut.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}, ${Math.round(early / 7) > 1 ? `about ${Math.round(early / 7)} weeks` : 'about a week'} early.` : `At this pace you'll run out ${early <= 1 ? 'a day or so' : `${early} days`} early.` };
    }
    if (proj >= allowance * 0.85) return { tick, cls: 'ok', text: 'On track to use about all of it.' };
    const spare = Math.round(allowance - proj);
    return { tick, cls: 'ok', text: proj < allowance * 0.4 ? `Plenty spare. On pace to finish with about ${fmt(spare)} unused.` : `On track, with about ${fmt(spare)} spare by the refill.` };
  }
  const refillDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
  // the allowance as one model, drawn in the header (start screen) and as a bar above the chat box (in a chat)
  const fmtTok = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);
  function tuMeterModel() {
    if (!tuLeft) return null;
    if (tuLeft.unlimited) {   // admin: the whole site's tutor budget this month
      const st = tuLeft.site; if (!st) return null;
      const cap = Number(st.cap_usd) || 0, spent = Number(st.spent_usd) || 0, left = Math.max(0, cap - spent);
      const per = st.msgs ? spent / st.msgs : 0.011, msgsLeft = per ? Math.floor(left / per) : 0;
      const pc = pace(Math.round(spent * 100), Math.round(cap * 100), st.refills, (c) => `US$${(c / 100).toFixed(2)}`);
      return { fill: cap ? left / cap : 0, tick: pc.tick, cls: pc.cls, low: left <= cap * 0.1, out: left <= 0,
        head: `<b>US$${left.toFixed(2)}</b> of US$${cap.toFixed(2)} tutor budget left`,
        sub: `${fmtTok(Number(st.tokens) || 0)} tokens used this month · about ${msgsLeft.toLocaleString('en-AU')} messages left · ${pc.text}` };
    }
    const { left, allowance } = tuLeft, credits = tuLeft.credits || 0;
    if (!allowance) {   // no Pro: just the packs they've bought
      const cap = Math.max(credits, 150);
      return { fill: credits / cap, tick: 100, cls: credits ? 'ok' : 'out', low: credits > 0 && credits <= 10, out: !credits, more: true,
        head: credits ? `<b>${credits}</b> tutor message${credits === 1 ? '' : 's'} left` : 'No tutor messages left', sub: credits ? 'From your packs. They never expire.' : 'Get a pack, or go Pro for 300 a month.' };
    }
    const pc = pace(allowance - left, allowance, tuLeft.refills);
    const extra = credits ? ` <span class="muted">+ ${credits} from packs</span>` : '';
    return { fill: allowance ? left / allowance : 0, tick: pc.tick, cls: left === 0 && credits ? 'ok' : pc.cls, low: left <= Math.max(10, allowance * 0.1) && !credits, out: left === 0 && !credits,
      more: left <= Math.max(10, allowance * 0.1) || credits > 0,
      head: (left === 0 ? (credits ? 'Monthly messages used' : 'No messages left') : `<b>${left}</b> of ${allowance} messages left`) + extra,
      sub: left === 0 && credits ? 'Now using your pack messages.' : pc.text };
  }
  function drawTuLeft() {
    const m = tuMeterModel(), box = $('tu-left'), bar = $('tu-meter');
    if (!box || !bar) return;
    box.hidden = !m || tu.active; bar.hidden = !m || !tu.active;
    if (!m) return;
    const paint = (root, n, fill, r) => {
      root.classList.toggle('low', m.low); root.classList.toggle('out', m.out);
      n.innerHTML = m.head; fill.style.width = `${Math.max(m.out ? 0 : 1.5, Math.round(1000 * m.fill) / 10)}%`;
      fill.parentNode.style.setProperty('--tick', `${m.tick}%`);
      r.textContent = m.sub; r.className = `${r.dataset.base} pace-${m.cls}`;
      let g = root.querySelector('.tu-more');
      if (m.more && packsOpen() && !tuLeft.unlimited) {
        if (!g) { g = mk('button', 'link small tu-more', 'Get more'); g.onclick = openTutorPacks; r.after(g); }
      } else if (g) g.remove();
    };
    paint(box, $('tu-left-n'), $('tu-left-fill'), $('tu-left-r'));
    paint(bar, $('tu-meter-n'), $('tu-meter-fill'), $('tu-meter-r'));
    box.title = bar.title = tuLeft.unlimited ? 'The whole site\'s tutor spending this month, against the monthly cap in settings.' : 'Every reply from the tutor uses one message. Quick questions count the same as help on a past question.';
  }
  async function tuSend(text) {
    if (tu.busy) return;
    text = (text || '').trim();
    if (text && /\b20[0-3]\d\b/.test(text)) {   // they named a question: switch to it
      const f = await tuFind(text, tuSubject()).catch(() => null);
      if (f && f.id && f.id !== tu.q?.id) { try { await tuLoad(f); } catch (err) { console.warn(err); } }
    }
    const files = tu.pending.splice(0);
    tu.busy = true; tuDraw(); drawTuPending();
    try {
      if (text || files.length) {
        const imgs = [], thumbs = [];
        for (const f of files) {
          if (f.path) { imgs.push(f.path); thumbs.push(f.url); continue; }   // a photo from earlier: already uploaded
          const blob = await shrinkImage(f.file, 1600);
          const path = `${state.user.id}/tutor-${tu.session}/s${String(++tu.n).padStart(2, '0')}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
          const { error } = await sb.storage.from('submissions').upload(path, blob, { contentType: blob.type, upsert: true });
          if (error) throw error;
          tu.paths.push(path); imgs.push(path); thumbs.push(f.url);
        }
        tuRemember(imgs);
        tu.msgs.push({ role: 'student', text, images: imgs, thumbs, files: files.map(f => f.file).filter(Boolean) });
        tuDraw();
      }
      const { data, error } = await sb.functions.invoke('tutor', { body: {
        subject: tu.subject || tuSubject(), mode: tu.mode, question_id: tu.q?.id || null, chunks: tu.chunks,
        messages: tu.msgs.filter(m => !m.error && !m.greet && (m.role === 'student' || m.role === 'tutor' || m.role === 'result')).map(m => m.role === 'result'
          ? { role: 'student', text: `(Auto-mark result for ${m.rec.title}: ${m.rec.results.map(r => `${r.label} ${r.awarded}/${r.out_of}${r.feedback ? ` (${r.feedback})` : ''}`).join('; ')})`.slice(0, 2000), images: [] }
          : { role: m.role, text: m.text || '', images: m.images || [] }),
      } });
      if (error) { let msg = error.message, body = null; try { body = await error.context.json(); msg = body.error || msg; } catch {} const e = new Error(msg); e.out = !!body?.out; throw e; }
      tu.msgs.push({ role: 'tutor', text: data.say, slip: data.slip?.what || null, learnt: data.learnt || null });
      if (data.left != null && tuLeft) { tuLeft.left = data.left; tuLeft.allowance = data.allowance ?? tuLeft.allowance; tuLeft.used = tuLeft.allowance - data.left; tuLeft.credits = data.credits ?? tuLeft.credits; state.tutorCredits = tuLeft.credits; drawTuLeft(); }
      else if (tuLeft?.unlimited) loadTuLeft();
      if (data.slip) tu.slipped = true;
      if (data.full_paper && tu.msgs.some(m => m.images?.length)) tu.msgs.push({ role: 'offer' });
      if (data.flagged && !tu.flagged) { tu.flagged = true; tu.msgs.push({ sys: true, text: 'The tutor flagged this question so it gets fixed.' }); }
      if (data.done && !tu.done) await tuFinish(data);
    } catch (err) {
      tu.msgs.push({ role: 'tutor', error: true, text: err.message || String(err), buy: !!err.out });
    } finally {
      tu.busy = false; tuDraw(); tuSave(); drawTuRecent();
    }
  }
  async function tuFinish(d) {
    if (d.next_level === 'harder') tu.level = Math.min(3, tu.level + 1);
    if (d.next_level === 'easier') tu.level = Math.max(1, tu.level - 1);
    lsSet('tb_tu_level', tu.level);
    tu.focus = tu.slipped && tu.q ? tu.q.topic : null;   // slipped: the next question tests the same thing
    tu.done = { awarded: d.awarded, out_of: d.out_of };
    if (tu.q && d.awarded != null) {   // counts toward Progress and weak spots like any other attempt
      const { error } = await sb.from('attempts').insert({ user_id: state.user.id, question_id: tu.q.id, score: d.awarded, out_of: tu.q.marks || d.out_of || 0 });
      if (error) console.warn('tutor attempt not saved', error.message);
    }
  }

  // composer: text, photos of working, maths symbols, quick replies
  function drawTuPending() {
    const box = $('tu-photos'); box.innerHTML = '';
    tu.pending.forEach((f, i) => {
      const t = mk('div', 'tu-thumb'); const im = mk('img'); im.src = f.url; im.alt = 'Photo to send';
      const x = mk('button', 'tu-x', '×'); x.setAttribute('aria-label', 'Remove photo');
      x.onclick = () => { tu.pending.splice(i, 1); drawTuPending(); };
      t.append(im, x); box.appendChild(t);
    });
    box.hidden = !tu.pending.length;
  }
  $('tu-file').onchange = (ev) => {
    [...ev.target.files].slice(0, 4 - tu.pending.length).forEach(f => tu.pending.push({ file: f, url: URL.createObjectURL(f) }));
    ev.target.value = ''; drawTuPending();
  };
  // write on the tutor page like on a question: anything new you've written goes with your next message, as a picture
  let tuAnnSig = '';
  function tuAnnButton() {
    const slot = $('tu-ann'); if (!slot || !window.Annotate || !state.user) return;
    const key = `tb_ann_${state.user.id}_tu_${tu.q?.id || tu.session}`;
    if (slot.dataset.key === key) return;
    if (Annotate.active()?.key?.includes('_tu_')) Annotate.stop();
    slot.dataset.key = key; slot.innerHTML = ''; tuAnnSig = '';
    slot.appendChild(Annotate.button($('tu-q'), key, { scope: $('tu-session'), full: true }));
  }
  async function tuWritingFile() {
    const a = window.Annotate?.active();
    if (!a || !(a.key.includes('_tu_') || document.body.classList.contains('tu-docked')) || !a.api.count()) return null;   // docked: your writing on the question goes too
    let sig = ''; try { sig = localStorage.getItem(a.key) || ''; } catch {}
    sig = `${sig.length}:${sig.slice(-60)}`;
    if (sig === tuAnnSig) return null;                     // nothing new since the last message
    const url = await a.api.snapshot(), im = new Image();
    await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = url; }).catch(() => null);
    if (!im.width) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0) return null;
    const pad = 24; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(c.width, x1 + pad); y1 = Math.min(c.height, y1 + pad);
    const o = document.createElement('canvas'); o.width = x1 - x0; o.height = y1 - y0;
    const ox = o.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height); ox.drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    const blob = await new Promise(r => o.toBlob(r, 'image/png'));
    if (!blob) return null;
    tuAnnSig = sig;
    return new File([blob], 'my-writing.png', { type: 'image/png' });
  }
  const tuSubmit = async () => {
    const t = $('tu-text').value;
    const wf = await tuWritingFile().catch(() => null);
    if (wf && tu.pending.length < 4) tu.pending.push({ file: wf, url: URL.createObjectURL(wf) });
    if (!t.trim() && !tu.pending.length) return;
    $('tu-text').value = ''; tuGrow(); tuSend(t);
  };
  const tuGrow = () => { const ta = $('tu-text'); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; };
  $('tu-text').oninput = tuGrow;
  $('tu-text').onkeydown = (ev) => { if (ev.key === 'Enter' && !ev.shiftKey && !matchMedia('(pointer: coarse)').matches) { ev.preventDefault(); tuSubmit(); } };
  $('tu-send').onclick = tuSubmit;
  $('tu-go').onclick = () => { tu.topic = $('tu-topic').value; tu.focus = null; tuStart(false); };
  $('tu-own').onclick = () => tuStart(true);
  // a quick question: no past question loaded, just ask and get a short answer
  $('tu-ask').onsubmit = async (ev) => {
    ev.preventDefault();
    const v = $('tu-ask-in').value.trim(); if (!v || tu.busy) return;
    $('tu-error').hidden = true;
    try { await tuLoad(null); $('tu-ask-in').value = ''; await tuSend(v); }
    catch (err) { $('tu-error').textContent = err.message || String(err); $('tu-error').hidden = false; }
  };
  $('tu-ref').onsubmit = async (ev) => {
    ev.preventDefault();
    const v = $('tu-ref-in').value.trim(); if (!v) return;
    $('tu-error').hidden = true;
    const f = await tuFind(v, tuSubject()).catch(() => null);
    if (!f || !f.id) { $('tu-error').textContent = f?.missing ? `${f.missing} isn't in the bank yet.` : "I couldn't find that one. Try it like: James Ruse 2025 11a"; $('tu-error').hidden = false; return; }
    $('tu-ref-in').value = ''; tuStart(false, f);
  };
  // ---------- Study together (beta, admins host): a shared whiteboard, a coach for the teacher, and a chat ----------
  // Runs on Supabase Realtime broadcast: nothing is stored on the server. Strokes use 0..1 coordinates so any screen size works.
  const ST_COLOURS = ['#1b1f2e', '#2f5be7', '#e5484d', '#1f9d55', '#f5a524'], ST_SIZES = [2, 4, 8];
  const st = { code: null, host: false, ch: null, strokes: [], live: {}, bg: null, tool: { c: ST_COLOURS[0], w: 4, e: false }, people: [], ids: [], coach: [], chat: [], ended: false, flushT: null };
  const stKey = (code) => `tb_study_${code}`;
  const stName = () => String(state.user?.user_metadata?.first_name || state.user?.email || 'Someone').trim().split(/\s+/)[0];
  const stCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
  const stCanvas = () => $('st-canvas');
  function stResize() {
    const cv = stCanvas(), box = $('st-board'); if (!cv || !box || box.offsetParent === null) return;
    const dpr = window.devicePixelRatio || 1, w = box.clientWidth, h = box.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    stRedraw();
  }
  function stStroke(ctx, s, from = 0) {
    const W = ctx.canvas.width, H = ctx.canvas.height, p = s.p; if (p.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.c; ctx.lineWidth = (s.e ? s.w * 5 : s.w) * W / 1000; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const i0 = Math.max(0, from - 2);
    ctx.moveTo(p[i0] * W, p[i0 + 1] * H);
    if (p.length === 2) ctx.lineTo(p[0] * W + .01, p[1] * H);
    for (let i = i0 + 2; i < p.length; i += 2) ctx.lineTo(p[i] * W, p[i + 1] * H);
    ctx.stroke(); ctx.restore();
  }
  function stRedraw() {
    const cv = stCanvas(); if (!cv) return; const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    st.strokes.forEach(s => stStroke(ctx, s));
  }
  const stSend = (event, payload) => st.ch && st.ch.send({ type: 'broadcast', event, payload });
  const stSave = () => { if (st.host) lsSet(stKey(st.code), { strokes: st.strokes.slice(-1500), bg: st.bg, coach: st.coach.slice(-30), at: Date.now() }); };
  // ---- drawing (host only) ----
  let stCur = null, stPending = [];
  function stPoint(ev) { const r = stCanvas().getBoundingClientRect(); return [+((ev.clientX - r.left) / r.width).toFixed(4), +((ev.clientY - r.top) / r.height).toFixed(4)]; }
  function stFlush() {
    st.flushT = null; if (!stCur || !stPending.length) return;
    stSend('seg', { id: stCur.id, c: stCur.c, w: stCur.w, e: stCur.e, p: stPending }); stPending = [];
  }
  function stBindDraw() {
    const cv = stCanvas();
    cv.onpointerdown = (ev) => {
      if (!st.host) return; ev.preventDefault(); cv.setPointerCapture(ev.pointerId);
      const pt = stPoint(ev);
      stCur = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), c: st.tool.c, w: st.tool.w, e: st.tool.e, p: [...pt] };
      st.strokes.push(stCur); stPending = [...pt];
      stStroke(cv.getContext('2d'), stCur);
      st.flushT = st.flushT || setTimeout(stFlush, 40);
    };
    cv.onpointermove = (ev) => {
      if (!stCur) return;
      const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      const from = stCur.p.length;
      evs.forEach(e => { const pt = stPoint(e); stCur.p.push(...pt); stPending.push(...pt); });
      stStroke(cv.getContext('2d'), stCur, from);
      st.flushT = st.flushT || setTimeout(stFlush, 40);
    };
    cv.onpointerup = cv.onpointercancel = () => { if (!stCur) return; clearTimeout(st.flushT); stFlush(); stSend('end', { id: stCur.id }); stCur = null; stSave(); };
  }
  // ---- what everyone sees ----
  function stOnSeg({ id, c, w, e, p }) {
    let s = st.live[id];
    if (!s) { s = st.live[id] = { id, c, w, e, p: [] }; st.strokes.push(s); }
    const from = s.p.length; s.p.push(...p);
    stStroke(stCanvas().getContext('2d'), s, from);
  }
  // anyone with a room code can send to the room, so everything that arrives is checked before it's used
  const stBgOk = (u) => { try { const x = new URL(u); return x.origin === new URL(C.supabaseUrl).origin && x.pathname.startsWith('/storage/v1/object/sign/'); } catch { return false; } };
  const stStrokeOk = (s) => s && typeof s.id === 'string' && s.id.length <= 40 && ST_COLOURS.includes(s.c) && ST_SIZES.includes(s.w)
    && Array.isArray(s.p) && s.p.length <= 20000 && s.p.every(v => typeof v === 'number' && v >= 0 && v <= 1);
  function stSetBg(bg) {
    bg = bg && typeof bg.url === 'string' && stBgOk(bg.url) ? { url: bg.url, label: String(bg.label || '').slice(0, 80), qid: bg.qid == null ? null : String(bg.qid).slice(0, 80) } : null;
    st.bg = bg; const im = $('st-bg');
    im.hidden = !st.bg; if (st.bg) im.src = st.bg.url; else im.removeAttribute('src');
    $('st-bgoff').hidden = !(st.host && st.bg);
    $('st-sub').textContent = st.bg?.label ? `On the board: ${st.bg.label}` : (st.host ? 'You are teaching. Draw on the board; everyone sees it live.' : 'Watching live. Ask anything in the chat.');
  }
  function stDrawChat() {
    const box = $('st-chat-msgs');
    box.innerHTML = st.chat.map(m => `<div class="st-cm${m.me ? ' me' : ''}${m.coach ? ' coach' : ''}"><b>${esc(m.name)}</b>${m.coach ? `<div class="tu-text">${tuRich(m.text)}</div>` : `<span>${esc(m.text)}</span>`}</div>`).join('') || '<p class="small muted">Questions and notes show up here.</p>';
    box.scrollTop = box.scrollHeight;
  }
  function stDrawPeople() {
    const ppl = st.people;
    $('st-people').textContent = ppl.length ? ppl.map(p => p.name + (p.host ? ' (teaching)' : '')).join(', ') : '';
  }
  function stDrawCoach() {
    const box = $('st-coach-msgs');
    box.innerHTML = st.coach.map((m, i) => `<div class="tu-msg ${m.role === 'tutor' ? 'tutor' : 'student'}${m.error ? ' err' : ''}">${m.role === 'tutor' ? `<div class="tu-text">${tuRich(m.text)}</div>${m.error ? '' : `<button class="link small" data-share="${i}">Share in the chat</button>`}` : `<div class="tu-text"><p>${esc(m.text)}</p></div>`}</div>`).join('')
      + (st.coachBusy ? '<div class="tu-msg tutor typing"><span></span><span></span><span></span></div>' : '')
      || '<p class="small muted">Tell it what you\'re teaching and it plans the session: what to explain first, what to draw, and what to ask her.</p>';
    box.querySelectorAll('[data-share]').forEach(b => b.onclick = () => {
      const m = st.coach[+b.dataset.share]; const msg = { name: stName() + "'s notes", text: m.text, coach: true, at: Date.now() };
      st.chat.push({ ...msg, me: true }); stSend('chat', msg); stDrawChat(); b.textContent = 'Shared';
    });
    box.scrollTop = box.scrollHeight;
    $('st-coach-quick').innerHTML = st.coach.length ? ['Next step', "She's confused. Explain it another way", 'Give me a check question', 'What mistake will she make?'].map(q => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('') : '';
    $('st-coach-quick').querySelectorAll('[data-q]').forEach(b => b.onclick = () => stCoach(b.dataset.q));
  }
  async function stCoach(text) {
    if (st.coachBusy || !text) return;
    st.coach.push({ role: 'student', text }); st.coachBusy = true; stDrawCoach();
    try {
      const { data, error } = await sb.functions.invoke('tutor', { body: { subject: tuSubject(), mode: 'coach', question_id: st.bg?.qid || null,
        messages: st.coach.filter(m => !m.error).map(m => ({ role: m.role, text: m.text, images: [] })) } });
      if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch {} throw new Error(msg); }
      st.coach.push({ role: 'tutor', text: data.say });
    } catch (err) { st.coach.push({ role: 'tutor', error: true, text: err.message || String(err) }); }
    finally { st.coachBusy = false; stDrawCoach(); stSave(); }
  }
  // ---- joining a room ----
  async function stJoin(code, host) {
    if (st.ch && st.code === code) return;
    stLeave(true);
    Object.assign(st, { code, host, strokes: [], live: {}, bg: null, people: [], ids: [], coach: [], chat: [], ended: false });
    if (host) { const saved = lsGet(stKey(code)); if (saved) { st.strokes = saved.strokes || []; st.bg = saved.bg || null; st.coach = saved.coach || []; } }
    $('st-lobby').hidden = true; $('st-main').hidden = false;
    document.body.classList.toggle('st-hosting', host);
    $('st-tools').hidden = !host; $('st-coach').hidden = !host; $('st-invite').hidden = !host;
    if (host) stFriends();
    $('st-over').hidden = true;
    const link = `${location.origin}${location.pathname}#study/${code}`;
    $('st-room').innerHTML = host ? `<span class="small muted">Room <b>${code}</b></span><button class="secondary" id="st-copy">Copy invite link</button><button class="link small" id="st-end">End session</button>`
      : `<span class="small muted">Room <b>${code}</b></span><button class="link small" id="st-leave">Leave</button>`;
    if (host) {
      $('st-copy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Invite link copied. Send it to your friend.'); } catch { prompt('Invite link', link); } };
      $('st-end').onclick = () => { stSend('ended', {}); lsSet(stKey(code), null); lsSet('tb_study_host', null); stLeave(); location.hash = '#study'; };
    } else $('st-leave').onclick = () => { stLeave(); location.hash = '#home'; };
    if (host) lsSet('tb_study_host', code);
    stSetBg(st.bg); stDrawChat(); stDrawCoach(); stDrawPeople();
    requestAnimationFrame(stResize);
    const ch = st.ch = sb.channel(`study:${code}`, { config: { broadcast: { self: false }, presence: { key: state.user.id } } });
    ch.on('broadcast', { event: 'seg' }, ({ payload }) => { if (!st.host && stStrokeOk(payload)) stOnSeg(payload); })   // only the teacher draws: the teacher's page ignores board events from others
      .on('broadcast', { event: 'end' }, ({ payload }) => { if (payload && typeof payload.id === 'string') delete st.live[payload.id]; })
      .on('broadcast', { event: 'undo' }, ({ payload }) => { if (st.host) return; st.strokes = st.strokes.filter(s => s.id !== payload?.id); stRedraw(); })
      .on('broadcast', { event: 'clear' }, () => { if (st.host) return; st.strokes = []; st.live = {}; stRedraw(); })
      .on('broadcast', { event: 'bg' }, ({ payload }) => { if (!st.host) stSetBg(payload?.bg); })
      .on('broadcast', { event: 'chat' }, ({ payload }) => { if (!payload || typeof payload.text !== 'string') return;
        st.chat.push({ name: String(payload.name || 'Someone').slice(0, 40), text: payload.text.slice(0, payload.coach ? 4000 : 500), coach: !!payload.coach, at: Date.now() });
        st.chat = st.chat.slice(-200); stDrawChat(); if (st.host && !payload.coach) window.Juice?.sfx?.pop?.(); })
      .on('broadcast', { event: 'hello' }, () => { if (!st.host) return;   // someone joined: send them the board so far, in pieces
        const parts = []; for (let i = 0; i < st.strokes.length; i += 40) parts.push(st.strokes.slice(i, i + 40));
        if (!parts.length) parts.push([]);
        parts.forEach((strokes, i) => stSend('sync', { part: i, total: parts.length, strokes, bg: i === 0 ? st.bg : undefined })); })
      .on('broadcast', { event: 'sync' }, ({ payload }) => { if (st.host) return;
        if (!payload || !Array.isArray(payload.strokes)) return;
        if (payload.part === 0) { st.strokes = []; st.live = {}; stSetBg(payload.bg); }
        st.strokes.push(...payload.strokes.filter(stStrokeOk).slice(0, 2000)); stRedraw(); })
      .on('broadcast', { event: 'ended' }, () => { if (st.host) return; st.ended = true; $('st-over').hidden = false; $('st-over').innerHTML = '<div><b>The session has ended.</b><span>Thanks for studying together.</span></div>'; })
      .on('presence', { event: 'sync' }, () => {
        const ps = ch.presenceState(); st.ids = Object.keys(ps); st.people = Object.values(ps).map(v => v[0]).filter(Boolean); stDrawPeople(); stDrawFriends();
        if (!st.host && !st.people.some(p => p.host) && !st.ended) { $('st-over').hidden = false; $('st-over').innerHTML = '<div><b>Waiting for the teacher…</b><span>The board appears as soon as they\'re here.</span></div>'; }
        else if (!st.ended) $('st-over').hidden = true;
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        await ch.track({ name: stName(), host });
        if (!host) stSend('hello', {});
      });
  }
  function stLeave(quiet) {
    if (st.ch) { try { sb.removeChannel(st.ch); } catch {} }
    st.ch = null; st.code = null; document.body.classList.remove('st-hosting'); stUnwatch();
  }
  // ---- invites: everyone with friends listens on their own inbox channel. Being there is how friends see them as online. ----
  let stIn = null, stBooted = false;
  function stInbox() {
    if (stIn || !state.user || state.preview) return;
    stIn = sb.channel(`inbox:${state.user.id}`, { config: { broadcast: { self: false }, presence: { key: state.user.id } } });
    stIn.on('broadcast', { event: 'study' }, async ({ payload }) => {
      const code = String(payload?.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code || st.code === code) return;
      window.Juice?.sfx?.pop?.();
      const k = await choiceBox(`<b>${esc(String(payload.from || 'A friend').slice(0, 30))}</b> invited you to study together`, [['join', 'Join now', 'primary'], ['no', 'Not now', 'secondary']]);
      if (k === 'join') location.hash = `#study/${code}`;
    }).on('presence', { event: 'sync' }, () => {}).subscribe((s) => { if (s === 'SUBSCRIBED') stIn.track({ on: 1 }); });
  }
  const stWatch = {}, stInvited = new Set();   // friend id -> a channel watching their inbox (to see them online and send the invite)
  const stOnline = (f) => !!stWatch[f.friend_id]?.presenceState?.()?.[f.friend_id];
  async function stFriends() {
    await loadFriends().catch(() => []);
    state.friends.forEach(f => {
      if (stWatch[f.friend_id]) return;
      const c = stWatch[f.friend_id] = sb.channel(`inbox:${f.friend_id}`, { config: { broadcast: { self: false }, presence: { key: state.user.id } } });
      c.on('presence', { event: 'sync' }, stDrawFriends).subscribe((x) => { if (x === 'SUBSCRIBED') c.track({ w: 1 }); });   // Realtime only shares who's there with members who track too
    });
    stDrawFriends();
  }
  function stDrawFriends() {
    const box = $('st-friends'); if (!box || !st.host) return;
    const fs = [...state.friends].sort((a, b) => stOnline(b) - stOnline(a) || a.name.localeCompare(b.name));
    $('st-inv-n').textContent = fs.length ? `${fs.filter(stOnline).length} online` : '';
    box.innerHTML = fs.length ? fs.map(f => {
      const here = st.ids.includes(f.friend_id), on = here || stOnline(f), sent = stInvited.has(f.friend_id);
      return `<div class="st-fr${on ? ' on' : ''}"><i></i><b>${esc(f.name)}</b>${here ? '<span class="small muted">In the room</span>'
        : on ? `<button class="${sent ? 'secondary' : 'primary'} small" data-inv="${esc(f.friend_id)}">${sent ? 'Invite again' : 'Invite'}</button>` : '<span class="small muted">Offline</span>'}</div>`;
    }).join('') : '<p class="small muted">Add friends on your profile and they show up here when they\'re online. Or send the invite link.</p>';
    box.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => {
      const id = b.dataset.inv; stWatch[id]?.send({ type: 'broadcast', event: 'study', payload: { code: st.code, from: stName() } });
      stInvited.add(id); toast(`Invite sent to <b>${esc(state.friends.find(f => f.friend_id === id)?.name || 'your friend')}</b>.`); stDrawFriends();
    });
  }
  function stUnwatch() { Object.keys(stWatch).forEach(id => { try { sb.removeChannel(stWatch[id]); } catch {} delete stWatch[id]; }); stInvited.clear(); }
  async function renderStudy(arg) {
    if (arg) return stJoin(String(arg).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), state.admin && !state.viewAs && lsGet('tb_study_host') === String(arg).toUpperCase());
    stLeave();
    $('st-main').hidden = true; $('st-lobby').hidden = false; $('st-room').innerHTML = '';
    $('st-sub').textContent = 'Teach a friend live: you draw, they watch, and a coach tells you what to teach next.';
    const resume = lsGet('tb_study_host');
    $('st-lobby').innerHTML = state.admin && !state.viewAs
      ? `<h2>Start a study session</h2><p class="muted">You get a whiteboard and a coach. Send your friend the invite link and they watch your board live, from anywhere. Talk over a phone or Discord call.</p>
         <div class="row"><button class="primary" id="st-start">Start a session</button>${resume ? `<button class="link" id="st-resume">Back to room ${esc(resume)}</button>` : ''}</div>`
      : `<h2>Study together</h2><p class="muted">When a friend invites you, a message pops up here on Trialbank. Or type the room code they sent you.</p>
         <form class="row" id="st-joinf"><input id="st-joinc" placeholder="Room code" maxlength="8" autocomplete="off" class="st-codein"><button class="primary">Join</button></form>`;
    if ($('st-joinf')) $('st-joinf').onsubmit = (ev) => { ev.preventDefault(); const c = $('st-joinc').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length >= 4) location.hash = `#study/${c}`; };
    if ($('st-start')) $('st-start').onclick = () => { const c = stCode(); lsSet('tb_study_host', c); location.hash = `#study/${c}`; };
    if ($('st-resume')) $('st-resume').onclick = () => { location.hash = `#study/${resume}`; };
  }
  // tools
  $('st-colours').innerHTML = ST_COLOURS.map((c, i) => `<button class="st-col${i ? '' : ' on'}" data-c="${c}" style="--c:${c}" aria-label="Colour"></button>`).join('');
  $('st-sizes').innerHTML = ST_SIZES.map(w => `<button class="st-size${w === 4 ? ' on' : ''}" data-w="${w}" aria-label="Pen size"><i style="width:${w + 4}px;height:${w + 4}px"></i></button>`).join('');
  $('st-colours').onclick = (ev) => { const b = ev.target.closest('[data-c]'); if (!b) return; st.tool.c = b.dataset.c; st.tool.e = false; $('st-erase').classList.remove('on'); $('st-colours').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  $('st-sizes').onclick = (ev) => { const b = ev.target.closest('[data-w]'); if (!b) return; st.tool.w = +b.dataset.w; $('st-sizes').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  $('st-erase').onclick = () => { st.tool.e = !st.tool.e; $('st-erase').classList.toggle('on', st.tool.e); };
  $('st-undo').onclick = () => { const s = st.strokes.pop(); if (!s) return; stRedraw(); stSend('undo', { id: s.id }); stSave(); };
  $('st-clear').onclick = () => { if (!st.strokes.length) return; st.strokes = []; stRedraw(); stSend('clear', {}); stSave(); };
  $('st-bgoff').onclick = () => { stSetBg(null); stSend('bg', { bg: null }); stSave(); };
  $('st-qform').onsubmit = async (ev) => {
    ev.preventDefault(); const v = $('st-qin').value.trim(); if (!v) return;
    const f = await tuFind(v, tuSubject()).catch(() => null);
    if (!f || !f.id) return toast(f?.missing ? `${esc(f.missing)} isn't in the bank yet.` : "Couldn't find that. Try: James Ruse 2025 11a");
    await attachUrls([f]);
    const bg = { url: f.imageUrl, label: `${f.papers.school} ${f.papers.year} ${label(f)}`, qid: f.id };
    stSetBg(bg); stSend('bg', { bg }); stSave(); $('st-qin').value = '';
    if (!st.coach.length) stCoach(`I'm teaching my friend this question (${bg.label}). Plan it for me.`);
  };
  $('st-photo').onchange = async (ev) => {
    const file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
    try {
      const blob = await shrinkImage(file, 1800), path = `${state.user.id}/study-${st.code}/bg-${Date.now().toString(36)}.jpg`;
      const { error } = await sb.storage.from('submissions').upload(path, blob, { contentType: blob.type, upsert: true }); if (error) throw error;
      const { data } = await sb.storage.from('submissions').createSignedUrl(path, 4 * 3600);
      const bg = { url: data.signedUrl, label: 'A photo' };
      stSetBg(bg); stSend('bg', { bg }); stSave();
    } catch (err) { toast(esc(err.message || String(err))); }
  };
  $('st-coach-form').onsubmit = (ev) => { ev.preventDefault(); const v = $('st-coach-in').value.trim(); if (!v) return; $('st-coach-in').value = ''; stCoach(v); };
  $('st-chat-form').onsubmit = (ev) => {
    ev.preventDefault(); const v = $('st-chat-in').value.trim(); if (!v || !st.ch) return; $('st-chat-in').value = '';
    const msg = { name: stName(), text: v.slice(0, 500), at: Date.now() };
    st.chat.push({ ...msg, me: true }); stSend('chat', msg); stDrawChat();
  };
  stBindDraw();
  addEventListener('resize', () => { if (location.hash.startsWith('#study/')) stResize(); });
  function askTutor(q) {
    if (location.hash.startsWith('#set')) return openDock(q);   // in a set: a chat box on top, the set stays where it is
    tu.handoff = q; if (location.hash === '#tutor') renderTutor(); else location.hash = '#tutor';
  }
  // ---------- the tutor as a little chat box over a question set ----------
  // the Tutor page's own chat is moved into the box and back, so it's the same conversation either way
  let tuHome = null;
  async function openDock(q) {
    const sess = $('tu-session'), body = $('tu-dock-body');
    if (sess.parentElement !== body) { tuHome = [sess.parentElement, sess.nextSibling]; body.appendChild(sess); }
    $('tu-dock').hidden = false; sess.hidden = false; document.body.classList.add('tu-docked');
    loadKatex().catch(() => {}); loadTuLeft();
    if (!tu.active || tu.q?.id !== q.id || q.ask) await tuStart(false, q);
    else tuDraw();
    setTimeout(() => $('tu-text').focus({ preventScroll: true }), 50);
  }
  function closeDock() {
    if ($('tu-dock').hidden) return;
    const sess = $('tu-session');
    if (tuHome) { tuHome[0].insertBefore(sess, tuHome[1]); tuHome = null; }
    $('tu-dock').hidden = true; document.body.classList.remove('tu-docked');
  }
  $('tu-dock-x').onclick = closeDock;
  $('tu-dock-full').onclick = () => { closeDock(); location.hash = '#tutor'; };
  $('tu-end').onclick = () => { lsSet(tuChatKey(), null); tuCleanup(); tu.active = false; tu.q = null; tu.msgs = []; tu.done = null; tu.topic = ''; renderTutor(); };
  document.querySelectorAll('#tu-quick [data-say]').forEach(b => { b.onclick = () => tuSend(b.dataset.say); });
  $('tu-symbtn').onclick = () => { const s = $('tu-syms'); s.hidden = !s.hidden; $('tu-symbtn').setAttribute('aria-expanded', !s.hidden); };
  $('tu-syms').innerHTML = TU_SYMS.map(s => `<button type="button">${s}</button>`).join('');
  $('tu-syms').onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const ta = $('tu-text'), ins = b.textContent === 'eˣ' ? 'e^' : b.textContent, a = ta.selectionStart ?? ta.value.length, z = ta.selectionEnd ?? a;
    ta.value = ta.value.slice(0, a) + ins + ta.value.slice(z); ta.focus(); ta.selectionStart = ta.selectionEnd = a + ins.length; tuGrow();
  };

  // ---------- boot ----------
  sb.auth.getSession().then(async ({ data }) => { state.user = data.session?.user || null; await checkAdmin(); route(); });
})();
