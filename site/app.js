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
  const views = ['auth', 'home', 'practise', 'set', 'summary', 'progress', 'admin', 'papers', 'paper', 'examrun', 'mark', 'tutor', 'profile'];
  const QCOLS = 'id, qid, number, part, type, marks, topic, answer, answer_source, image_path, solution_path, coarse, syllabus_note, pages, content, papers!inner(subject, school, year, difficulty), level';

  document.title = C.name;
  $('brand').textContent = C.name;

  const state = {
    user: null,
    subject: (() => { try { const k = localStorage.getItem('tb_subject'); return k && C.subjects[k] ? k : Object.keys(C.subjects)[0]; } catch { return Object.keys(C.subjects)[0]; } })(),
    topics: new Set(),          // selected topic names
    opts: { count: 10, type: 'all', diff: 'all', fresh: 1 },
    set: null,                  // { qs: [...], i, results: [] }
  };

  // ---------- routing ----------
  const NAV = { tutor: 'tutor', mark: 'mark', home: 'home', practise: 'practise', set: 'practise', summary: 'practise', papers: 'papers', paper: 'papers', progress: 'progress', examrun: 'papers' };
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
    const [h, arg] = (location.hash || '#home').slice(1).split('/');
    if (!state.user) return show('auth');
    drawSubject();
    if (!state.preview) sb.rpc('log_visit', { v: h || 'home' }).then(() => {}, () => {});   // engagement stats for the Admin page
    return busy(async () => {
      if (h === 'practise') { show('practise'); await renderBuild(); return; }
      if (h === 'progress' && can('progress')) { show('progress'); await renderProgress(); return; }
      if (h === 'admin' && state.admin) { show('admin'); await renderAdmin(); return; }
      if (h === 'profile') { show('profile'); await renderProfile(); return; }
      if (h === 'set' && state.set) return show('set');
      if (h === 'summary' && state.set) return show('summary');
      if (h === 'papers') { flag('seen_papers', 1); show('papers'); await renderPapers(); return; }
      if (h === 'mark') { show('mark'); await renderMark(); return; }
      if (h === 'tutor' && tuAllowed()) { show('tutor'); await renderTutor(); return; }
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
  $('signout').onclick = () => sb.auth.signOut();
  $('calc-btn').onclick = () => window.Calc && Calc.toggle();
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
  const VIEW_FEAT = { lite: 20, full: 100, pro: 100 };
  const featureLevel = () => state.viewAs ? (VIEW_FEAT[state.viewAs] ?? state.viewDial ?? 0) : (state.release?.features ?? state.release?.dial ?? 100);
  const can = (f) => (state.admin && !state.viewAs) || featureLevel() >= (FEATURE_AT[f] ?? 0);
  // papers a "Free" preview can open (the database lets the admin see everything, so this mirrors the dial)
  const seePaper = (p) => state.viewAs !== 'free' || state.viewDial >= 100 || p.difficulty === 'HSC' || (p.release_pct ?? 0) < state.viewDial;
  function applyRelease() {
    $('nav-tutor').hidden = !tuAllowed();
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
    if (state.user && !state.preview) { const { data: rel } = await sb.rpc('my_release'); if (rel) state.release = rel; }
    applyRelease();
    $('nav-admin').hidden = !state.admin;
    $('preview-new').hidden = !state.admin || state.preview;
    if (!state.admin) { state.preview = false; state.viewAs = null; }
    $('view-as-row').hidden = !state.admin; $('view-as').value = state.viewAs || '';
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
  async function renderBuild() {
    $('open-syllabus').hidden = !SYLLABUS[state.subject];
    const counts = await loadTopicCounts();
    const byTopic = {};
    counts.filter(r => r.subject === state.subject).forEach(r => {
      byTopic[r.topic] = byTopic[r.topic] || { mcq: 0, short: 0 };
      byTopic[r.topic][r.type] += Number(r.n);
    });
    const wrap = $('topic-chips'); wrap.innerHTML = '';
    const skip = skipped();
    [...state.topics].forEach(t => { if (skip.has(t)) state.topics.delete(t); });
    const all = Object.keys(byTopic);
    const groups = (TOPIC_GROUPS[state.subject] || []).map(([name, ts]) => [name, ts.filter(t => byTopic[t] && !skip.has(t))]);
    const placed = new Set(groups.flatMap(g => g[1]));
    const other = all.filter(t => !placed.has(t) && !skip.has(t));
    if (other.length) groups.push([groups.length ? 'Other' : 'Topics', other]);
    const later = all.filter(t => skip.has(t));
    if (later.length) groups.push(["Not learnt yet", later]);
    groups.filter(g => g[1].length).forEach(([name, ts]) => {
      const box = mk('div', 'tgroup' + (name === 'Not learnt yet' ? ' later' : ''));
      const head = mk('div', 'tg-head', `<h3>${esc(name)}</h3>`);
      const tog = mk('button', 'link small tg-all');
      const sync = () => { tog.textContent = ts.every(t => state.topics.has(t)) ? 'Clear' : 'Select all'; };
      tog.onclick = () => {
        const on = !ts.every(t => state.topics.has(t));
        ts.forEach(t => on ? state.topics.add(t) : state.topics.delete(t));
        box.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', on));
        sync(); startSummary();
      };
      head.appendChild(tog); box.appendChild(head);
      const chips = mk('div', 'chips');
      ts.sort((a, b) => topicName(a).localeCompare(topicName(b))).forEach(t => {
        const b = document.createElement('button');
        b.className = 'chip' + (state.topics.has(t) ? ' on' : '');
        if (skip.has(t)) b.title = 'Marked as not learnt yet';
        b.innerHTML = `${esc(topicName(t))}<span class="n">${byTopic[t].mcq + byTopic[t].short}</span>`;
        b.dataset.t = (topicName(t) + ' ' + t + ' ' + name).toLowerCase();
        b.onclick = () => { state.topics.has(t) ? state.topics.delete(t) : state.topics.add(t); b.classList.toggle('on'); sync(); startSummary(); };
        chips.appendChild(b);
      });
      box.appendChild(chips); sync();
      wrap.appendChild(box);
    });
    filterTopics(); startSummary();
    $('topics-all').onclick = () => { Object.keys(byTopic).filter(t => !skip.has(t)).forEach(t => state.topics.add(t)); renderBuild(); };
    $('topics-learnt').onclick = () => openLearnt(Object.keys(byTopic).sort());
    $('topics-none').onclick = () => { state.topics.clear(); renderBuild(); };
  }
  function filterTopics() {
    const q = $('topic-filter').value.trim().toLowerCase();
    document.querySelectorAll('#topic-chips .chip').forEach(b => { b.hidden = q && !b.dataset.t.includes(q); });
    document.querySelectorAll('#topic-chips .tgroup').forEach(g => { g.hidden = !g.querySelector('.chip:not([hidden])'); });
  }
  $('topic-filter').oninput = filterTopics;
  function startSummary() {
    const n = state.topics.size, o = state.opts;
    $('start-summary').textContent = n ? `${o.count} questions from ${n} topic${n === 1 ? '' : 's'}` : 'Pick at least one topic';
    const names = [...state.topics].map(topicName).sort();
    $('pr-picked').textContent = !n ? 'Tap topics to add them.' : names.length <= 4 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
    $('start').disabled = !n;
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

    const tooHard = hardQs();
    let pool = data.filter(x => !tooHard.has(x.id) && !x.syllabus_note && hasKey(x));
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
    if (window.Annotate && qcard && state.user) { const tb = mk('div', 'ann-tools'); tb.appendChild(Annotate.button(qcard, `tb_ann_${state.user.id}_${x.id}`)); qcard.prepend(tb); }
    $('set-pos').textContent = `${s.i + 1} of ${s.qs.length} · ${topicName(x.topic)}`;
    firstHint(x);
    $('set-meta').textContent = `${x.papers.school} ${x.papers.year} ${label(x)} · ${x.marks} mark${x.marks === 1 ? '' : 's'}`;
    $('set-bar').style.width = `${(s.i / s.qs.length) * 100}%`;
    const qi = $('q-img'); qi.dataset.trimmed = ''; qi.crossOrigin = 'anonymous'; qi.onload = () => trimImg(qi);
    if (x.content) qi.removeAttribute('src'); else qi.src = x.imageUrl;
    $('q-coarse').hidden = !x.coarse;
    $('star').textContent = '☆ Star';
    loadStars().then(s => { $('star').textContent = s.has(x.id) ? '★ Starred' : '☆ Star'; });
    $('star').onclick = () => toggleStar(x.id, $('star'));
    $('ask-tutor').hidden = !(tuAllowed() && tuSubjects().includes(x.papers.subject) && x.image_path && !x.content);
    $('ask-tutor').onclick = () => askTutor(x);
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
    s.results[s.i] = { q: x, score, outOf };
    if (window.Juice) { if (outOf && score >= outOf) Juice.reward(outOf); else if (score > 0) Juice.partial(score); else Juice.miss(); }
    if (x.type === 'short' && !(x.content && Online.objective(x))) verdict(score === outOf ? 'Full marks.' : score === 0 ? 'Mark it, move on. It will come back around.' : `${score}/${outOf}.`, score === outOf ? 'good' : score === 0 ? 'bad' : 'warn');
    $('next').hidden = false; $('skip').hidden = true;
    if (x.type === 'short' && score < outOf && !(x.content && Online.objective(x))) showLost(s.results[s.i], outOf - score);
    const { data: row, error } = await sb.from('attempts').insert({ user_id: state.user.id, question_id: x.id, score, out_of: outOf, chosen }).select('id').single();
    if (error) console.warn('attempt not saved', error.message);
    else { s.results[s.i].attemptId = row.id; if (s.results[s.i].lost?.length) saveLost(s.results[s.i]); }
    const ch = await srsAnswer(x, score, outOf).catch(e => { console.warn('srs', e.message); return null; });
    if (s.daily) { s.daily.changes.push(ch); dailyMark(x, score, outOf); }
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
    if (error) { el.innerHTML = `<p class="muted small">${error.message}</p>`; return; }
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
    if (s.i + 1 < s.qs.length) { s.i++; renderQuestion(); }
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
    const [{ data: mine }, { data: cohort }] = await Promise.all([
      sb.from('my_topic_stats').select('*').eq('subject', state.subject),
      sb.rpc('cohort_topic_stats', { subj: state.subject }),
    ]);
    bars($('my-bars'), mine || [], 'Nothing attempted yet in this subject.');
    renderLostBars();
    bars($('cohort-bars'), (cohort || []).map(r => ({ ...r, extra: `${r.students} student${r.students == 1 ? '' : 's'}` })), 'No attempts yet.');
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
  async function renderAdmin() {
    renderStats();
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
      tr.innerHTML = `<td>${u.email}</td><td>${u.given_name ? esc(u.given_name) : '-'}</td><td>${day(u.created_at)}</td><td>${day(u.last_sign_in_at)}</td><td>${u.attempts}</td><td>${rosterN ? (u.roster_name ? esc(u.roster_name) + (u.matched_by === 'name' ? ' <span class="muted small">(by name)</span>' : '') : '<b style="color:#c0392b">Not on list</b>') : '-'}</td><td class="lv-cell"></td><td></td>`;
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
      li.innerHTML = `<span>${e}</span>`;
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
  async function makePdf({ title, sub, filename, qs, withSolutions, onProgress }) {
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
    const put = (cv) => {
      let w = Math.min(CW, cv.width * 25.4 / DPI), h = w * cv.height / cv.width;
      const maxH = H - 2 * M - 8;
      if (h > maxH) { h = maxH; w = h * cv.width / cv.height; }
      if (y + h > H - M - 6) { pdf.addPage(); y = M; }
      pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', M, y, w, h);
      y += h + 5;
    };
    qc.forEach(put);
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
    btn.textContent = stars.has(id) ? '★ Starred' : '☆ Star';
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
        a.innerHTML = `<div class="pthumb${url ? ' loading' : ''}">${url ? `<img loading="lazy" decoding="async" alt="" src="${url}" onload="this.parentNode.classList.remove('loading')" onerror="this.parentNode.classList.remove('loading')">` : `<span>${esc(p.school)}<br>${p.year}</span>`}${best[p.id] != null ? `<span class="tag">${best[p.id]}%</span>` : ''}</div>
          <div class="pname"><strong>${p.year}</strong>${levelBadge(p, false)}</div>`;
        const im = a.querySelector('img');
        if (im) im.onerror = () => { im.replaceWith(Object.assign(mk('span', '', `${esc(p.school)}<br>${p.year}`))); };
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
      const doc = await lib.getDocument({ url, disableRange: true, disableStream: true }).promise;
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
    if (error) { box.innerHTML = `<p class="error">${error.message}</p>`; return; }
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
        else solBox.innerHTML = (q.answer ? `<p><strong>Answer: ${q.answer}</strong></p>` : '') + (q.solution_path ? `<div class="card scroll"><img loading="lazy" src="${urls[q.solution_path]}" alt="Solution"></div>` : '');
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
  $('mark-go').onclick = async () => {
    const id = Number($('mark-paper').value);
    const p = markPapers.find(x => x.id === id) || homePapers.find(x => x.id === id);
    if (!p) { $('mark-paper').focus(); return; }
    $('mark-go').disabled = true; $('mk-error').hidden = true;
    try { await busy(() => startMarking(p)); } catch (err) { $('mk-error').textContent = err.message; $('mk-error').hidden = false; } finally { $('mark-go').disabled = false; }
  };
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
  $('set-exit').onclick = () => {
    const s = state.set;
    if (s && s.results.some(Boolean)) { renderSummary('Set ended early'); location.hash = '#summary'; }
    else location.hash = '#practise';
  };
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
      if (ai) c.appendChild(mk('p', 'ai-note', `<b>Auto-marker: ${ai.found ? `${ai.awarded}/${ai.out_of}` : 'not found in your upload'}</b> ${esc(ai.feedback || '')}`));
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
        if (marking) c.appendChild(mk('p', 'muted small', q.answer ? `You: ${e.answers[q.id] || 'blank'} · Answer: ${q.answer}` : 'No answer key for this one (not counted).'));
      } else if (!marking) {
        if (!q.content) c.appendChild(mk('p', 'muted small', 'Write your working on paper.'));
      } else {
        const sol = mk('button', 'secondary', q.solutionUrl || q.content ? 'Show solution' : 'No solution available'); sol.disabled = !q.solutionUrl && !q.content;
        const solBox = mk('div'); solBox.hidden = true;
        sol.onclick = () => {
          if (!solBox.innerHTML) { if (q.content) solBox.appendChild(Online.solution(q)); else solBox.innerHTML = `<div class="card scroll"><img src="${q.solutionUrl}" alt="Solution"></div>`; }
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
      tr.innerHTML = `<td>${day(r.started_at)}</td><td>${r.papers.school} ${r.papers.year}</td><td>${r.score}/${r.out_of} (${r.out_of ? Math.round(100 * r.score / r.out_of) : 0}%)</td><td>${r.work_minutes ? `${Math.round((r.seconds_used || 0) / 60)} of ${r.work_minutes} min` : 'Uploaded'}</td>`;
      tb.appendChild(tr);
    });
    $('exam-history-empty').hidden = !!(ex && ex.length);
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
    state.preview = false; previewFlags = {}; setTimeout(() => drawStreak(), 0); $('preview-new').hidden = !state.admin;
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
        shuffle((data || []).filter(q => !hardQs().has(q.id) && !q.syllabus_note)).forEach(q => { (byTopic[q.topic] = byTopic[q.topic] || []).push(q); });
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
  function openLearnt(topics) {
    const skip = skipped(), grid = $('learnt-grid'); grid.innerHTML = '';
    topics.sort((a, b) => topicName(a).localeCompare(topicName(b))).forEach(t => {
      const b = document.createElement('button');
      b.className = 'subj' + (skip.has(t) ? '' : ' on'); b.innerHTML = `<span>${esc(topicName(t))}</span>`;
      b.onclick = () => { skip.has(t) ? skip.delete(t) : skip.add(t); b.classList.toggle('on'); };
      grid.appendChild(b);
    });
    $('learnt-modal').hidden = false;
    $('learnt-cancel').onclick = () => { $('learnt-modal').hidden = true; };
    $('learnt-save').onclick = async () => { $('learnt-save').disabled = true; await saveSkipped(skip); $('learnt-save').disabled = false; $('learnt-modal').hidden = true; renderBuild(); };
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
    $('account-btn').innerHTML = pr.pet ? petImg(pr.pet) : html;   // their pet, once picked, is who they are around the site
    $('account-btn').classList.toggle('has-pet', !!pr.pet);
    $('account-btn').style.setProperty('--pc', pr.pet ? colorCss(pr.color) : '');
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
      b.innerHTML = `<i${photo ? ` style="background-image:url('${media.bg}')"` : ''}>${k === 'photo' && !photo ? '+' : ''}</i>${k === 'photo' && meP.bg === 'photo' && photo ? 'Change' : label}`;
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
    location.href = data.url;               // Stripe's own payment page; it sends them back here afterwards
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
    const freeOn = !!pl.enabled && (state.admin || can('automark'));
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
    const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1, 1);
    const reset = next.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    const lite = state.release?.lite && !state.admin;
    const tile = (n, label, sub, cls = '') => `<div class="mk-tile ${cls}"><b>${n}</b><span>${label}</span><small>${sub}</small></div>`;
    const tiles = [
      tile(c.bought, 'Bought', 'Never expire'),
      c.pro || state.release?.level === 'pro' ? tile(c.pro, 'Pro', `Refill on ${reset}`) : '',
      c.unlimited ? tile('∞', 'Free', 'Admin') : c.freeOn ? tile(`${c.freeLeft}<em>/${c.freeTotal}</em>`, 'Free this month', `Back on ${reset}`)
        : tile('–', 'Free', lite ? 'Unlocks after trials' : 'Not on your plan', 'off'),
    ].join('');
    const pct = c.poolTotal ? Math.round(100 * c.poolLeft / c.poolTotal) : 0;
    $('mk-balance').innerHTML = `
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
    const today = dayOf(), skip = skipped(subj), tooHard = hardQs();
    const [srs, { data: att }, counts] = await Promise.all([
      loadSrs(subj),
      sb.from('attempts').select('question_id, score, out_of, created_at, questions!inner(topic, papers!inner(subject))')
        .eq('user_id', state.user.id).eq('questions.papers.subject', subj).order('created_at', { ascending: false }).limit(1000)
        .then(r => state.preview ? { data: [] } : r),
      loadTopicCounts(),
    ]);
    const seen = new Set(), wrongIds = [];
    (att || []).forEach(a => {
      if (seen.has(a.question_id)) return; seen.add(a.question_id);
      if (a.score < a.out_of && a.created_at.slice(0, 10) <= addDays(today, -2) && !skip.has(a.questions.topic)) wrongIds.push(a.question_id);
    });
    const ok = (x) => hasKey(x) && !x.syllabus_note && !tooHard.has(x.id) && !skip.has(x.topic) && (x.marks || 1) <= 3 && (x.image_path || x.content);
    const mode = dailyMode(), want = (x) => mode === 'mix' || (mode === 'mcq') === (x.type === 'mcq');   // the student's choice of question types
    const pickIds = new Set(), out = [];
    const take = (x, kind) => { if (x && !pickIds.has(x.id) && out.length < 5) { pickIds.add(x.id); out.push({ x, kind }); return true; } return false; };
    // 1. redo: wrong at least two days ago, a topic that's due first
    if (wrongIds.length) {
      const { data } = await sb.from('questions').select(QCOLS).in('id', wrongIds.slice(0, 100)).eq('papers.subject', subj);
      const due = (x) => (srs[x.topic]?.due || today) <= today;
      const redo = shuffle((data || []).filter(x => ok(x) && want(x))).sort((a, b) => due(b) - due(a));
      const used = new Set();
      for (const x of redo) { if (out.length >= 2) break; if (!used.has(x.topic) && take(x, 'redo')) used.add(x.topic); }
    }
    // 2. topics due back today, most overdue and most often wrong first; 3. new topics; 4. whatever comes back soonest
    const allTopics = [...new Set((counts || []).filter(r => r.subject === subj).map(r => r.topic))].filter(t => !skip.has(t));
    const dueT = Object.values(srs).filter(r => r.due <= today && !skip.has(r.topic)).sort((a, b) => a.due.localeCompare(b.due) || b.wrong_n - a.wrong_n).map(r => r.topic);
    const newT = shuffle(allTopics.filter(t => !srs[t]));
    const laterT = Object.values(srs).filter(r => r.due > today && !skip.has(r.topic)).sort((a, b) => a.due.localeCompare(b.due)).map(r => r.topic);
    const used = new Set(out.map(o => o.x.topic));
    const plan = [];
    const nNew = Math.min(newT.length, Object.keys(srs).length ? 1 : 5);   // one new topic a day once they've started, all new on day one
    dueT.filter(t => !used.has(t)).forEach(t => plan.push([t, 'review']));
    const room = 5 - out.length;
    const reviews = plan.splice(0, Math.max(0, room - nNew));
    const fresh = newT.slice(0, Math.max(nNew, room - reviews.length)).map(t => [t, 'new']);
    const rest = [...plan, ...laterT.filter(t => !used.has(t)).map(t => [t, 'review'])];
    const queue = [...reviews, ...fresh, ...rest];
    const seenSet = seen;
    const pool = async (t, lvl) => {
      const lo = Math.max(1, lvl - 1), hi = Math.min(5, lvl + 1);
      let { data } = await sb.from('questions').select(QCOLS).eq('papers.subject', subj).eq('topic', t).gte('level', lo).lte('level', hi).limit(120);
      if (!data || !data.filter(ok).length) ({ data } = await sb.from('questions').select(QCOLS).eq('papers.subject', subj).eq('topic', t).limit(120));
      const c = shuffle((data || []).filter(ok));
      return c.filter(x => !seenSet.has(x.id)).concat(c.filter(x => seenSet.has(x.id)))
        .sort((a, b) => Math.abs(qLevel(a) - lvl) - Math.abs(qLevel(b) - lvl) || seenSet.has(a.id) - seenSet.has(b.id));
    };
    let qi = 0; const spare = [];
    while (out.length < 5 && qi < queue.length) {   // a few topics at a time, in parallel, until five are picked
      const chunk = queue.slice(qi, qi + 5 - out.length); qi += chunk.length;
      const got = await Promise.all(chunk.map(([t, kind]) => pool(t, kind === 'new' ? 1 + (Math.random() < 0.5) : (srs[t]?.level || 1)).then(c => [c, kind])));
      for (const [c, kind] of got) { take(c.find(x => want(x) && !pickIds.has(x.id)), kind); spare.push([c, kind]); }
    }
    for (const [c, kind] of spare) { if (out.length >= 5) break; take(c.find(x => want(x) && !pickIds.has(x.id)), kind); }   // few topics: a second from each
    for (const [c, kind] of spare) { if (out.length >= 5) break; take(c.find(x => !pickIds.has(x.id)), kind); }   // still short of that type: top up with the other
    if (!out.length) throw new Error('No questions to pick from yet. Untick some "not learnt" topics.');
    const row = { subject: subj, day: today, question_ids: out.map(o => o.x.id), kinds: out.map(o => o.kind), answered: [], score: 0, out_of: 0, finished_at: null };
    await saveDaily(row);
    return { row, qs: out.map(o => o.x) };
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
  // pets are Microsoft's Fluent Emoji 3D (MIT licence), pinned to one commit so they never change under us
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
  const isProUser = () => (state.admin && !state.viewAs) || (state.viewAs ? state.viewAs === 'pro' : state.release?.level === 'pro');
  const myProfile = () => ({ pet: null, color: 'blue', border: 'none', ...(state.preview ? previewFlags.profile : state.user?.user_metadata?.profile) });
  const petOf = (k) => PETS.find(p => p[0] === k) || EGG;
  const petUrl = (k) => { const p = petOf(k); return `${EMOJI}${encodeURIComponent(p[2])}/3D/${p[3]}_3d.png`; };
  const petImg = (k) => `<img src="${petUrl(k)}" alt="" loading="lazy" draggable="false">`;
  const colorCss = (k) => (COLORS.find(c => c[0] === k) || COLORS[0])[2];
  // a pet on its colour, inside its border; f is { pet, color, border }
  const petBadge = (f, size = 'md') => `<span class="pet pet-${size} bd-${esc(f.border || 'none')}" style="--pc:${colorCss(f.color)}">${petImg(f.pet)}</span>`;
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
      <div class="pf-grid pets" id="pf-pets">${PETS.map(p => tile('pet', p[0], `${petImg(p[0])}<span>${p[1]}</span>`, p[4], p[5], pr.pet === p[0])).join('')}</div>
      <h2 class="sec">Banner</h2>
      <div class="pf-grid colors" id="pf-colors">${COLORS.map(c => tile('color', c[0], `<i style="background:${c[2]}"></i><span>${c[1]}</span>`, c[3], c[4], pr.color === c[0])).join('')}</div>
      <h2 class="sec">Border</h2>
      <div class="pf-grid borders" id="pf-borders">${BORDERS.map(x => tile('border', x[0], `${petBadge({ ...pr, border: x[0] }, 'sm')}<span>${x[1]}</span>`, x[2], x[3], (pr.border || 'none') === x[0])).join('')}</div>
      <div class="sec-head"><h2 class="sec">Friends</h2><button class="link small" id="pf-fr">Add a friend</button></div>
      <div class="friends pf-friends" id="pf-friends">${state.friends.length ? [meRow(), ...state.friends].sort((a, b) => (b.level || 1) - (a.level || 1) || b.streak - a.streak).map(friendChip).join('')
        : '<p class="small muted">Add friends to see their pets, levels and streaks here.</p>'}</div>`;
    $('pf-fr').onclick = () => openFriends().then(() => {});
    el.querySelectorAll('.pf-tile').forEach(b => b.onclick = async () => {
      const { kind, k, lvl, pro } = b.dataset;
      if (b.classList.contains('locked')) {
        window.Juice?.sfx?.bad?.();
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        return toast(pro ? `${esc(b.querySelector('span').textContent)} comes with Pro.` : `Reach level ${lvl} to unlock ${esc(b.querySelector('span').textContent)}.`);
      }
      await saveProfile({ [kind]: k });
      window.Juice?.sfx?.good?.(2);
      renderProfile();
    });
  }
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
    return (state.friends = data || []);
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
  const friendChip = (f) => `<div class="fr${f.done_today ? ' done' : ''}${f.me ? ' me' : ''}" title="${esc(f.name)}: level ${f.level || 1}, ${f.streak} day streak${f.done_today ? ', done today' : ''}">
      ${petBadge(f, 'md')}<b>${esc(f.name)}</b>
      <small class="fr-meta"><span class="fr-fl">${flame(f.streak)}</span>${f.streak} · Lv ${f.level || 1}</small>
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
      $('fr-list').innerHTML = fs.length ? fs.map(f => `<div class="fr-li">${petBadge(f, 'sm')}<b>${esc(f.name)} <span class="small muted">Lv ${f.level || 1} · ${f.streak} day streak</span></b><span class="small muted">${f.done_today ? 'Done today' : 'Not yet today'}</span><button class="link small" data-rm="${f.friend_id}" data-n="${esc(f.name)}">Remove</button></div>`).join('')
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
    toast(`You and <b>${esc(data)}</b> are now friends. Do your Daily 5 together.`, 6000);
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
  const flame = (n, big) => `<svg viewBox="0 0 32 38" aria-hidden="true" class="${n ? '' : 'out'}">
    <g class="fl"><path class="fo" d="M16 1c1.2 7 9.5 11.2 11.3 20.2C29 30 23.4 37 16 37S3 31.2 4.6 22.6c1-5.6 4.6-8 5.9-12.6 1.8 2.7 2 5.5 3.6 6.6C16 11.8 15.4 6.6 16 1z"/>
    <path class="fi" d="M16 16.5c1.2 4.2 6.3 6.3 6.3 11.4 0 4.4-2.9 7.6-6.3 7.6s-6.3-3.2-6.3-7.4c0-3.3 2-4.5 3.1-7.4 1 1.3 1.8 2.9 2.8 3.1.3-2.5.2-4.8.4-7.3z"/></g>
    <text x="16" y="29.6" text-anchor="middle" style="font-size:${n > 99 ? 9.5 : n > 9 ? 11.5 : 13}px">${n}</text></svg>`;
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
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
      va.hidden = !(state.admin && state.viewAs && state.user);
      $('viewas-name').textContent = { free: 'Free', lite: 'Lite', full: 'Full', pro: 'Pro' }[state.viewAs] || '';
    }
    const tb = $('test-bar'); if (tb) {
      let back = null; try { back = JSON.parse(localStorage.getItem('tb_admin_return') || 'null'); } catch {}
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
    applyRelease(); drawBars(); route();
  };
  $('viewas-exit').onclick = () => { $('view-as').value = ''; $('view-as').onchange(); };
  $('test-switch').onclick = async () => {
    const btn = $('test-switch'); btn.disabled = true; $('test-msg').textContent = 'Switching…';
    try {
      const { data: cur } = await sb.auth.getSession();
      const { data, error } = await sb.functions.invoke('test-account', { body: { action: 'switch' } });
      if (error || !data?.token_hash) { let msg = data?.error; try { msg = msg || (await error.context.json()).error; } catch {} throw new Error(msg || 'Could not switch.'); }
      localStorage.setItem('tb_admin_return', JSON.stringify({ email: state.user.email, access_token: cur.session.access_token, refresh_token: cur.session.refresh_token }));
      const { error: e2 } = await sb.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (e2) { localStorage.removeItem('tb_admin_return'); throw e2; }
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
    let back = null; try { back = JSON.parse(localStorage.getItem('tb_admin_return') || 'null'); } catch {}
    if (!back) return;
    const { error } = await sb.auth.setSession({ access_token: back.access_token, refresh_token: back.refresh_token });
    localStorage.removeItem('tb_admin_return');
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
  function fitCanvas(w, h) {
    const k = Math.min(1, LONG_SIDE / Math.max(w, h));
    const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    return { cv, k };
  }
  async function filesToPages(files, step) {
    const out = [];
    for (const f of files) {
      if (out.length >= MAX_PAGES) break;
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        const lib = await loadPdfJs();
        const doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
        for (let i = 1; i <= doc.numPages && out.length < MAX_PAGES; i++) {
          step(`Reading page ${out.length + 1}…`);
          const pg = await doc.getPage(i);
          const v = pg.getViewport({ scale: 1 });
          const scale = LONG_SIDE / Math.max(v.width, v.height);
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
        const { cv, k } = fitCanvas(bmp.width, bmp.height);
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
      if (q.type === 'mcq') { if (x.choice) e.answers[q.id] = x.choice; }
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
  const tuSubjects = () => (C.tutor && C.tutor.subjects) || ['Adv'];
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
    let s = String(t || '').replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g, (m, a, b, c, d) => {
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

  async function renderTutor() {
    loadKatex().catch(() => {});
    const subj = tuSubject();
    $('tu-sub').textContent = `${C.subjects[subj]} · prototype`;
    drawTuModes();
    $('tu-start').hidden = tu.active; $('tu-session').hidden = !tu.active; $('tu-end').hidden = !tu.active;
    if (tu.handoff) { const q = tu.handoff; tu.handoff = null; tuStart(false, q); return; }
    if (tu.active) { tuDraw(); return; }
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
    let pool = (data || []).filter(q => !seenIds.has(q.id));
    if (!pool.length) { ({ data } = await base()); pool = (data || []).filter(q => !seenIds.has(q.id)); if (!pool.length) pool = data || []; }
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  async function tuCleanup() {
    const p = tu.paths.splice(0);
    if (p.length) sb.storage.from('submissions').remove(p).catch(() => {});
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
    } finally { btn.disabled = false; }
  }
  // load a question (or none, for their own) as a fresh conversation
  async function tuLoad(q) {
    await tuCleanup();
    tu.session = Date.now().toString(36); tu.msgs = []; tu.chunks = {}; tu.done = null; tu.slipped = false; tu.n = 0;
    tu.q = q;
    if (q) {
      await attachUrls([q]);
      tu.seen.add(q.id); lsSet('tb_tu_seen', [...tu.seen].slice(-400));
      tu.chunks = await sliceTallImages([q], `${state.user.id}/tutor-${tu.session}`, () => {}, tu.paths);
    }
    tu.active = true;
    $('tu-start').hidden = true; $('tu-session').hidden = false; $('tu-end').hidden = false;
    tuDrawQuestion();
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
    card.hidden = !q;
    if (!q) return;
    $('tu-qmeta').textContent = `${q.papers.school} ${q.papers.year} ${label(q)} · ${marksText(q.marks)} · ${topicName(q.topic)}`;
    const im = $('tu-qimg'); im.dataset.trimmed = ''; im.crossOrigin = 'anonymous'; im.onload = () => trimImg(im); im.src = q.imageUrl;
    card.classList.remove('folded'); $('tu-qtoggle').textContent = 'Hide';
  }
  $('tu-qtoggle').onclick = () => { const f = $('tu-q').classList.toggle('folded'); $('tu-qtoggle').textContent = f ? 'Show question' : 'Hide'; };

  function tuDraw() {
    const th = $('tu-thread'); th.innerHTML = '';
    tu.msgs.forEach((m, i) => {
      if (m.sys) { th.appendChild(mk('div', 'tu-sys', esc(m.text.replace(/^\(|\)$/g, '')))); return; }
      const el = mk('div', 'tu-msg ' + m.role + (m.error ? ' err' : ''));
      if (m.thumbs?.length) { const ph = mk('div', 'tu-pics'); m.thumbs.forEach(u => { const im = mk('img'); im.src = u; im.alt = 'Your working'; ph.appendChild(im); }); el.appendChild(ph); }
      if (m.text) el.appendChild(mk('div', 'tu-text', m.role === 'tutor' ? tuRich(m.text) : `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>`));
      if (m.slip) el.appendChild(mk('div', 'tu-note', `Noted: ${esc(m.slip)}`));
      if (m.learnt) el.appendChild(mk('div', 'tu-note', `Learnt about you: ${esc(m.learnt)}`));
      if (m.error) {
        const retry = mk('button', 'link small', 'Try again');
        retry.onclick = () => { tu.msgs.splice(i, 1); tuSend(); };
        el.appendChild(retry);
      }
      th.appendChild(el);
    });
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
    requestAnimationFrame(() => last.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
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
          const blob = await shrinkImage(f.file, 1600);
          const path = `${state.user.id}/tutor-${tu.session}/s${String(++tu.n).padStart(2, '0')}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
          const { error } = await sb.storage.from('submissions').upload(path, blob, { contentType: blob.type, upsert: true });
          if (error) throw error;
          tu.paths.push(path); imgs.push(path); thumbs.push(f.url);
        }
        tu.msgs.push({ role: 'student', text, images: imgs, thumbs });
        tuDraw();
      }
      const { data, error } = await sb.functions.invoke('tutor', { body: {
        subject: tuSubject(), mode: tu.mode, question_id: tu.q?.id || null, chunks: tu.chunks,
        messages: tu.msgs.filter(m => !m.error).map(m => ({ role: m.role, text: m.text || '', images: m.images || [] })),
      } });
      if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch {} throw new Error(msg); }
      tu.msgs.push({ role: 'tutor', text: data.say, slip: data.slip?.what || null, learnt: data.learnt || null });
      if (data.slip) tu.slipped = true;
      if (data.done && !tu.done) await tuFinish(data);
    } catch (err) {
      tu.msgs.push({ role: 'tutor', error: true, text: err.message || String(err) });
    } finally {
      tu.busy = false; tuDraw();
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
  const tuSubmit = () => {
    const t = $('tu-text').value;
    if (!t.trim() && !tu.pending.length) return;
    $('tu-text').value = ''; tuGrow(); tuSend(t);
  };
  const tuGrow = () => { const ta = $('tu-text'); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; };
  $('tu-text').oninput = tuGrow;
  $('tu-text').onkeydown = (ev) => { if (ev.key === 'Enter' && !ev.shiftKey && !matchMedia('(pointer: coarse)').matches) { ev.preventDefault(); tuSubmit(); } };
  $('tu-send').onclick = tuSubmit;
  $('tu-go').onclick = () => { tu.topic = $('tu-topic').value; tu.focus = null; tuStart(false); };
  $('tu-own').onclick = () => tuStart(true);
  $('tu-ref').onsubmit = async (ev) => {
    ev.preventDefault();
    const v = $('tu-ref-in').value.trim(); if (!v) return;
    $('tu-error').hidden = true;
    const f = await tuFind(v, tuSubject()).catch(() => null);
    if (!f || !f.id) { $('tu-error').textContent = f?.missing ? `${f.missing} isn't in the bank yet.` : "I couldn't find that one. Try it like: James Ruse 2025 11a"; $('tu-error').hidden = false; return; }
    $('tu-ref-in').value = ''; tuStart(false, f);
  };
  function askTutor(q) { tu.handoff = q; if (location.hash === '#tutor') renderTutor(); else location.hash = '#tutor'; }
  $('tu-end').onclick = () => { tuCleanup(); tu.active = false; tu.q = null; tu.msgs = []; tu.done = null; renderTutor(); };
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
