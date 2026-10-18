/* Trialbank - plain JS, one file. Views: auth, home, set, summary, progress. */
(() => {
  const C = window.APP_CONFIG;
  const sb = supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  const $ = (id) => document.getElementById(id);
  const views = ['auth', 'home', 'practise', 'set', 'summary', 'progress', 'admin', 'papers', 'paper', 'examrun'];
  const QCOLS = 'id, qid, number, part, type, marks, topic, answer, image_path, solution_path, coarse, syllabus_note, pages, papers!inner(subject, school, year, difficulty)';

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
  const NAV = { home: 'home', practise: 'practise', set: 'practise', summary: 'practise', papers: 'papers', paper: 'papers', progress: 'progress', examrun: 'papers' };
  function show(name) {
    $('preview-bar').hidden = !(state.preview && state.user);
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
  async function route() {
    const [h, arg] = (location.hash || '#home').slice(1).split('/');
    if (!state.user) return show('auth');
    drawSubject();
    return busy(async () => {
      if (h === 'practise') { show('practise'); await renderBuild(); return; }
      if (h === 'progress') { show('progress'); await renderProgress(); return; }
      if (h === 'admin' && state.admin) { show('admin'); await renderAdmin(); return; }
      if (h === 'set' && state.set) return show('set');
      if (h === 'summary' && state.set) return show('summary');
      if (h === 'papers') { flag('seen_papers', 1); show('papers'); await renderPapers(); return; }
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
    $('auth-title').textContent = signup ? 'Create account' : 'Sign in';
    $('auth-submit').textContent = signup ? 'Create account' : 'Sign in';
    $('auth-toggle').textContent = signup ? 'Already have an account? Sign in' : 'New here? Create an account';
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
        touchStreak(); drawMarkLeft();
      }
      await checkAdmin();
      route();
    }, 0);
  });
  async function checkAdmin() {
    state.admin = false;
    if (state.user) { const { data } = await sb.rpc('is_admin'); state.admin = !!data; }
    $('nav-admin').hidden = !state.admin;
    $('preview-new').hidden = !state.admin || state.preview;
    if (!state.admin) state.preview = false;
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
    Adv: [
      ['Functions', ['Working with Functions', 'Graphing Techniques']],
      ['Trigonometry', ['Trigonometry and Measure of Angles', 'Trigonometric Identities and Equations', 'Trigonometric Functions and Graphs']],
      ['Calculus', ['Introduction to Differentiation', 'Exponential and Logarithmic Functions', 'Differential Calculus', 'Applications of Differentiation', 'Integral Calculus']],
      ['Financial Mathematics', ['Sequences and Series', 'Financial Mathematics']],
      ['Statistics', ['Probability', 'Discrete Probability Distributions', 'Descriptive Statistics and Bivariate Data', 'Continuous Probability Distributions', 'The Normal Distribution']],
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
    renderQuestion();
    location.hash = '#set';
  }
  async function buildSet(over = {}) {
    const o = { ...state.opts, ...over };
    if (![...state.topics].some(t => o.allowSkipped || !skipped().has(t))) throw new Error('Those topics are all marked as not learnt yet.');
    let q = sb.from('questions').select(QCOLS)
      .eq('papers.subject', state.subject)
      .in('topic', [...state.topics].filter(t => o.allowSkipped || !skipped().has(t)))
      .not('image_path', 'is', null)
      .limit(400);
    if (o.type !== 'all') q = q.eq('type', o.type);
    if (o.diff !== 'all') q = q.eq('papers.difficulty', o.diff);
    const { data, error } = await q;
    if (error) throw error;
    if (!data.length) throw new Error('No questions match that. Widen the filters.');

    const tooHard = hardQs();
    let pool = data.filter(x => !tooHard.has(x.id) && !x.syllabus_note);
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
    renderQuestion();
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- set ----------
  // trials were written for the 2017 syllabus; questions most likely outside the 2024 one are auto-marked as correct
  const sylFlag = (q) => q && q.syllabus_note ? `<span class="syl-flag" title="${esc(q.syllabus_note)}">Most likely not in syllabus</span>` : '';
  function label(x) {
    return x.type === 'mcq' ? `Q${x.number}` : `Q${x.number}${x.part ? '(' + x.part + ')' : ''}`;
  }
  function renderQuestion() {
    const s = state.set, x = s.qs[s.i];
    $('set-pos').textContent = `${s.i + 1} of ${s.qs.length} · ${topicName(x.topic)}`;
    firstHint(x);
    $('set-meta').textContent = `${x.papers.school} ${x.papers.year} ${label(x)} · ${x.marks} mark${x.marks === 1 ? '' : 's'}`;
    $('set-bar').style.width = `${(s.i / s.qs.length) * 100}%`;
    const qi = $('q-img'); qi.dataset.trimmed = ''; qi.crossOrigin = 'anonymous'; qi.onload = () => trimImg(qi); qi.src = x.imageUrl;
    $('q-coarse').hidden = !x.coarse;
    $('star').textContent = '☆ Star';
    loadStars().then(s => { $('star').textContent = s.has(x.id) ? '★ Starred' : '☆ Star'; });
    $('star').onclick = () => toggleStar(x.id, $('star'));
    $('verdict').hidden = true; $('verdict').className = 'verdict'; $('lost-box').hidden = true;
    $('next').hidden = true; $('skip').hidden = false;
    $('mcq-controls').hidden = x.type !== 'mcq' || !!x.syllabus_note;
    $('short-controls').hidden = x.type !== 'short' || !!x.syllabus_note;
    $('q-syllabus').hidden = !x.syllabus_note;
    $('sol-wrap').hidden = true; $('show-sol').hidden = false; $('show-sol').disabled = !x.solutionUrl;
    $('show-sol').textContent = x.solutionUrl ? 'Show solution' : 'No solution available';
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
    verdict(ok === null ? 'No answer key for this one.' : ok ? 'Correct.' : `Not quite. Answer: ${x.answer}.`, ok === null ? 'warn' : ok ? 'good' : 'bad');
  });
  $('show-sol').onclick = () => {
    const x = state.set.qs[state.set.i];
    $('sol-img').src = x.solutionUrl; $('sol-wrap').hidden = false; $('show-sol').hidden = true;
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
    if (x.type === 'short') verdict(score === outOf ? 'Full marks.' : score === 0 ? 'Mark it, move on. It will come back around.' : `${score}/${outOf}.`, score === outOf ? 'good' : score === 0 ? 'bad' : 'warn');
    $('next').hidden = false; $('skip').hidden = true;
    if (x.type === 'short' && score < outOf) showLost(s.results[s.i], outOf - score);
    const { data: row, error } = await sb.from('attempts').insert({ user_id: state.user.id, question_id: x.id, score, out_of: outOf, chosen }).select('id').single();
    if (error) console.warn('attempt not saved', error.message);
    else { s.results[s.i].attemptId = row.id; if (s.results[s.i].lost?.length) saveLost(s.results[s.i]); }
  }
  // ---------- lost marks: which mark, and why ----------
  const REASONS = [
    ['concept', "Didn't know the concept"], ['method', 'Wrong method'], ['algebra', 'Algebra slip'],
    ['careless', 'Careless'], ['time', "Didn't finish"], ['cfpe', 'Earned it CFPE (earlier slip carried)'],
  ];
  const reasonName = Object.fromEntries(REASONS);
  // builds the "which marks did you lose, and why" tagger; res = { outOf, lost: [...] }
  function lostTagger(res, nLost, onChange) {
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
    if (s.i + 1 < s.qs.length) { s.i++; renderQuestion(); }
    else { renderSummary(s.title || 'Set done'); location.hash = '#summary'; }
  }

  // ---------- summary ----------
  function renderSummary(title = 'Set done') {
    $('summary-title').textContent = title; $('summary-extra').textContent = '';
    const rs = state.set.results.filter(Boolean);
    const score = rs.reduce((a, r) => a + r.score, 0), outOf = rs.reduce((a, r) => a + r.outOf, 0);
    $('summary-score').textContent = outOf ? `${score} / ${outOf}  (${Math.round(100 * score / outOf)}%)` : 'Nothing marked';
    const pct = outOf ? score / outOf : null;
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
  async function renderAdmin() {
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
    document.querySelectorAll('#admin-mode button').forEach(b => b.classList.toggle('on', b.dataset.v === (s.signup_mode || 'domain')));
    $('admin-code').value = s.invite_code || '';
    $('admin-admins').value = s.admin_emails || '';
    allowed = (emails || []).map(r => r.email);
    drawAllowed();
    const tb = $('users-table').querySelector('tbody'); tb.innerHTML = '';
    (users || []).forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.email}</td><td>${u.given_name ? esc(u.given_name) : '-'}</td><td>${day(u.created_at)}</td><td>${day(u.last_sign_in_at)}</td><td>${u.attempts}</td><td>${rosterN ? (u.roster_name ? esc(u.roster_name) + (u.matched_by === 'name' ? ' <span class="muted small">(by name)</span>' : '') : '<b style="color:#c0392b">Not on list</b>') : '-'}</td><td></td>`;
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
      const [L, { data, error }] = await Promise.all([loadPdfLib(), sb.storage.from('questions').createSignedUrl(p.pdf_path, 300)]);
      if (error) throw error;
      const doc = await L.PDFDocument.load(await (await fetch(data.signedUrl)).arrayBuffer());
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
      pdf.text(`Trialbank  ·  for study within our school only  ·  page ${p} of ${n}`, W / 2, H - 7, { align: 'center' });
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
  // original PDF from the private bucket; falls back to a rebuilt PDF if the file isn't uploaded
  async function officialPdf(btn, p, key, opts, errEl) {
    const path = p && p[key];
    if (!path) return pdfAction(btn, opts, errEl);
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing…';
    if (errEl) errEl.hidden = true;
    try {
      const { data, error } = await sb.storage.from('questions').createSignedUrl(path, 300, { download: opts.filename });
      if (error) throw error;
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = opts.filename; document.body.appendChild(a); a.click(); a.remove();
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
      sb.from('papers').select('id, slug, subject, school, year, difficulty, scanned').eq('subject', state.subject),
      sb.from('paper_summary').select('*'),
      sb.from('exams').select('paper_id, score, out_of'),
    ]);
    const best = {};
    (exams || []).forEach(e => { if (e.out_of) best[e.paper_id] = Math.max(best[e.paper_id] || 0, Math.round(100 * e.score / e.out_of)); });
    const thumbs = await signed((papers || []).map(p => `${p.slug}/thumb.webp`)).catch(() => ({}));
    papersData = { papers: papers || [], sum: Object.fromEntries((sums || []).map(s => [s.paper_id, s])), best, thumbs };
    drawPapers();
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
        a.innerHTML = `<div class="pthumb">${url ? `<img loading="lazy" alt="" src="${url}">` : `<span>${esc(p.school)}<br>${p.year}</span>`}${best[p.id] != null ? `<span class="tag">${best[p.id]}%</span>` : ''}</div>
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
      const [lib, { data, error }] = await Promise.all([loadPdfJs(), sb.storage.from('questions').createSignedUrl(p[key], 3600)]);
      if (error) throw error;
      const doc = await lib.getDocument({ url: data.signedUrl }).promise;
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
    const hasQs = qs.some(q => q.image_path);
    $('paper-noq').hidden = hasQs; document.querySelector('#tab-practise .paper-actions').hidden = !hasQs;
    state.paperView = { p, qs };
    $('paper-pdf').textContent = p.pdf_path ? 'Download PDF' : 'Download';
    paperTab(p.pdf_path || !qs.length ? 'paper' : 'practise');
    $('paper-meta').innerHTML = levelBadge(p) + ' ' + esc([C.subjects[p.subject] || p.subject, qs.length ? `${qs.length} questions` : null, total ? `${total} marks` : null, p.scanned ? 'scanned paper: whole pages' : null].filter(Boolean).join(' · '));
    $('paper-practise').onclick = async () => {
      const usable = qs.filter(q => q.image_path);
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
      else c.appendChild(mk('p', 'muted small', 'No image for this question.'));
      const row = mk('div', 'row');
      row.appendChild(starButton(q));
      if (q.solution_path || q.answer) {
        const sb_ = mk('button', 'link', 'Show solution'), solBox = mk('div'); solBox.hidden = true;
        solBox.innerHTML = (q.answer ? `<p><strong>Answer: ${q.answer}</strong></p>` : '') + (q.solution_path ? `<div class="card scroll"><img loading="lazy" src="${urls[q.solution_path]}" alt="Solution"></div>` : '');
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
    homePapers = papers || [];
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
    else if (!flag('tour_done') && !state.tourOn) setTimeout(startTour, 350);
    // the single next step: an unfinished exam, then a first set for new students, then a quick set
    const go = $('next-go');
    if (saved && homePapers.some(x => x.id === saved.paperId)) {
      const p = homePapers.find(x => x.id === saved.paperId);
      const left = saved.finishedAt ? null : Math.round((saved.startedAt + (saved.readingSec + saved.workSec) * 1000 - Date.now()) / 60000);
      $('next-title').textContent = left > 0 ? `Back to ${p.school} ${p.year}` : `Mark ${p.school} ${p.year}`;
      $('quick-desc').textContent = left > 0 ? `${left} min left on the clock.` : saved.uploaded ? 'Upload your working to get it marked.' : 'Your answers are saved.';
      go.textContent = left > 0 ? 'Continue' : 'Mark it';
      go.onclick = () => $('resume-btn').click();
    } else if (!state.attempted) {
      $('next-title').textContent = 'Try 5 questions';
      $('quick-desc').textContent = 'Multiple choice. You find out straight away.';
      go.textContent = 'Start';
      go.onclick = () => $('ob-first-go').click();
    } else {
      $('next-title').textContent = 'Quick set';
      go.textContent = 'Start';
      go.onclick = () => $('quick-set').click();
    }
  }
  $('mark-go').onclick = async () => {
    const id = Number($('mark-paper').value);
    const p = homePapers.find(x => x.id === id);
    if (!p) { $('mark-paper').focus(); return; }
    $('mark-go').disabled = true;
    try { await busy(() => startMarking(p)); } catch (err) { reviewError(err.message); } finally { $('mark-go').disabled = false; }
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
    const { data: qs, error } = await sb.from('questions').select(QCOLS).eq('paper_id', paper.id).not('image_path', 'is', null).limit(300);
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
    const shorts = e.qs.filter(q => q.type !== 'mcq' && q.marks && !q.syllabus_note);
    const done = shorts.filter(q => e.marks[q.id] != null).length;
    if (!$('exam-note').textContent || /marked/.test($('exam-note').textContent)) $('exam-note').textContent = `${done} of ${shorts.length} written questions marked. Unmarked ones count as 0.`;
  }
  function renderExamBody() {
    const e = state.exam, body = $('exam-body'), marking = e.phase === 'marking';
    body.innerHTML = '';
    const jump = $('exam-jump'); jump.innerHTML = '';
    if (marking) body.appendChild(automarkCard());
    e.qs.forEach((q, idx) => {
      const chip = mk('button', e.answers[q.id] || e.marks[q.id] != null ? 'done' : '', qLabel(q).replace(/^Q/, ''));
      chip.onclick = () => document.getElementById('xq' + idx).scrollIntoView({ block: 'start' });
      jump.appendChild(chip);
      const c = mk('div', 'card qcard'); c.id = 'xq' + idx;
      c.innerHTML = `<div class="between"><strong>${qLabel(q)} ${sylFlag(q)}</strong><span class="muted small">${marksText(q.marks)}</span></div>`;
      c.appendChild(qImg(q.imageUrl, 'Question ' + qLabel(q)));
      if (marking && q.syllabus_note) {
        c.appendChild(mk('p', 'muted small', `${esc(q.syllabus_note)} Auto-marked as correct.`));
        chip.classList.add('done'); body.appendChild(c); return;
      }
      const ai = marking && e.ai && e.ai[q.id];
      if (ai) c.appendChild(mk('p', 'ai-note', `<b>Auto-marker: ${ai.found ? `${ai.awarded}/${ai.out_of}` : 'not found in your upload'}</b> ${esc(ai.feedback || '')}`));
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
        c.appendChild(mk('p', 'muted small', 'Write your working on paper.'));
      } else {
        const sol = mk('button', 'secondary', q.solutionUrl ? 'Show solution' : 'No solution available'); sol.disabled = !q.solutionUrl;
        const solBox = mk('div'); solBox.hidden = true;
        sol.onclick = () => {
          if (!solBox.innerHTML) solBox.innerHTML = `<div class="card scroll"><img src="${q.solutionUrl}" alt="Solution"></div>`;
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
    const { data, error } = await sb.from('questions').select(QCOLS).in('id', ids.slice(0, 100)).eq('papers.subject', state.subject).not('image_path', 'is', null);
    if (error) throw error;
    if (!data.length) return false;
    shuffle(data);
    await startSet(data.slice(0, n));
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
  const flag = (k, v) => { if (state.preview) { if (v === undefined) return !!previewFlags[k]; previewFlags[k] = 1; return; } try { if (v === undefined) return localStorage.getItem('tb_' + k) === '1'; localStorage.setItem('tb_' + k, '1'); } catch { return false; } };
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
          .eq('type', 'mcq').not('answer', 'is', null).not('image_path', 'is', null).not('topic', 'is', null).limit(800);
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
  const PREF0 = { theme: 'light', accent: 'blue', bg: 'plain', av: 0, bgv: 0 };
  const prefs = () => ({ ...PREF0, ...(state.user?.user_metadata?.prefs || {}) });
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  let media = {};      // signed links to this student's photos
  let meP = null;      // prefs being edited
  function applyPrefs(p = meP || prefs()) {
    const r = document.documentElement;
    r.dataset.theme = p.theme === 'dark' || (p.theme === 'auto' && darkMQ.matches) ? 'dark' : 'light';
    if (p.accent && p.accent !== 'blue') r.dataset.accent = p.accent; else delete r.dataset.accent;
    const bg = p.bg === 'photo' && !media.bg ? 'plain' : p.bg;
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
    const html = media.av ? `<img src="${media.av}" alt="">` : esc(initials());
    ['account-btn', 'me-av'].forEach(id => { $(id).innerHTML = html; });
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
  async function drawMarkLeft() {
    if (!state.user || state.preview) return;
    const { data, error } = await sb.rpc('my_automark_usage');
    const u = !error && data && data[0]; if (!u) return;
    let text, out = false;
    if (u.unlimited) text = 'Upload your working · unlimited (admin)';
    else {
      const total = Math.max(1, Math.floor(Number(u.limit_usd) / PER_PAPER_USD));
      const left = Math.max(0, Math.min(total, Math.floor((Number(u.limit_usd) - Number(u.used_usd)) / PER_PAPER_USD)));
      out = left === 0;
      const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1, 1);
      text = out ? `Used up · back on ${next.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}` : `${left} of ${total} left this month`;
    }
    ['mark-left', 'paper-mark-left'].forEach(id => { const el = $(id); if (el) { el.textContent = text; el.classList.toggle('used-up', out); } });
  }

  // ---------- daily streak: one tick per day you open Trialbank (Sydney time) ----------
  const dayOf = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
  const prevDay = (day) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const streakData = () => state.preview ? (previewFlags.streak || { n: 0, best: 0, last: null, days: [] })
    : { n: 0, best: 0, last: null, days: [], ...(state.user?.user_metadata?.streak || {}) };
  let streakBusy = false;
  async function touchStreak() {
    if (!state.user || streakBusy) return;
    const st = streakData(), today = dayOf();
    if (st.last === today) return drawStreak(st, false);
    streakBusy = true;
    st.n = st.last === prevDay(today) ? (st.n || 0) + 1 : 1;
    st.best = Math.max(st.best || 0, st.n); st.last = today;
    st.days = [...(st.days || []).filter(d => d !== today), today].slice(-60);
    try {
      if (state.preview) previewFlags.streak = st;
      else { const { data, error } = await sb.auth.updateUser({ data: { streak: st } }); if (!error && data?.user) state.user = data.user; }
    } finally { streakBusy = false; }
    drawStreak(st, true);
  }
  const flame = (n, big) => `<svg viewBox="0 0 32 38" aria-hidden="true" class="${n ? '' : 'out'}">
    <g class="fl"><path class="fo" d="M16 1c1.2 7 9.5 11.2 11.3 20.2C29 30 23.4 37 16 37S3 31.2 4.6 22.6c1-5.6 4.6-8 5.9-12.6 1.8 2.7 2 5.5 3.6 6.6C16 11.8 15.4 6.6 16 1z"/>
    <path class="fi" d="M16 16.5c1.2 4.2 6.3 6.3 6.3 11.4 0 4.4-2.9 7.6-6.3 7.6s-6.3-3.2-6.3-7.4c0-3.3 2-4.5 3.1-7.4 1 1.3 1.8 2.9 2.8 3.1.3-2.5.2-4.8.4-7.3z"/></g>
    <text x="16" y="29.6" text-anchor="middle" style="font-size:${n > 99 ? 9.5 : n > 9 ? 11.5 : 13}px">${n}</text></svg>`;
  function drawStreak(st = streakData(), bumped = false) {
    const b = $('streak'), n = st.n || 0;
    b.hidden = false; b.innerHTML = flame(n); b.title = `${n} day streak`; b.setAttribute('aria-label', `${n} day streak`);
    if (bumped) {
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      if (n > 1) toast(`<span class="toast-flame">${flame(n)}</span><b>${n} day streak!</b> Come back tomorrow to keep it going.`, 4200);
    }
  }
  function openStreakPop() {
    const st = streakData(), pop = $('streak-pop'), today = dayOf(), have = new Set(st.days || []);
    const week = []; let d = today;
    for (let k = 0; k < 7; k++) { week.unshift(d); d = prevDay(d); }
    const label = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-AU', { weekday: 'narrow', timeZone: 'UTC' });
    pop.innerHTML = `<div class="sp-top"><span class="sp-flame">${flame(st.n || 0, true)}</span>
      <div><strong>${st.n || 0} day streak</strong><span class="small muted">Best ${st.best || st.n || 0} · open Trialbank every day to keep it</span></div></div>
      <div class="sp-week">${week.map(day => `<span class="${have.has(day) ? 'hit' : ''}${day === today ? ' today' : ''}"><i></i>${label(day)}</span>`).join('')}</div>`;
    pop.hidden = false;
  }
  $('streak').onclick = (ev) => { ev.stopPropagation(); $('streak-pop').hidden ? openStreakPop() : ($('streak-pop').hidden = true); };
  document.addEventListener('click', (ev) => { if (!ev.target.closest('#streak-pop')) $('streak-pop').hidden = true; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.user) touchStreak(); });   // a tab left open past midnight

  // a burst of confetti for good results
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
        const { data, error } = await sb.functions.invoke('automark', { body: { paper_id: e.paper.id, pages: pagePaths, question_ids: g.map(q => q.id), chunks: pick(chunks, g) } });
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

  // ---------- boot ----------
  sb.auth.getSession().then(async ({ data }) => { state.user = data.session?.user || null; await checkAdmin(); route(); });
})();
