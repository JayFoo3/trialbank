/* Trialbank - plain JS, one file. Views: auth, home, set, summary, progress. */
(() => {
  const C = window.APP_CONFIG;
  const sb = supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  const $ = (id) => document.getElementById(id);
  const views = ['auth', 'home', 'practise', 'set', 'summary', 'progress', 'admin', 'papers', 'paper', 'examrun'];
  const QCOLS = 'id, qid, number, part, type, marks, topic, answer, image_path, solution_path, coarse, papers!inner(subject, school, year, difficulty)';

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
  function drawSubject() {
    const el = $('subject-switch'); el.innerHTML = '';
    for (const [key, label] of Object.entries(C.subjects)) {
      const b = document.createElement('button');
      b.textContent = C.shortSubjects?.[key] || label.replace('Mathematics ', 'Maths ').replace('Extension ', 'Ext ');
      b.title = label; b.className = key === state.subject ? 'on' : '';
      b.setAttribute('aria-pressed', key === state.subject);
      b.onclick = () => {
        if (key === state.subject) return;
        state.subject = key; state.topics.clear(); flag('picked_subject', 1);
        try { localStorage.setItem('tb_subject', key); } catch {}
        const h = (location.hash || '#home').slice(1).split('/')[0];
        if (h === 'paper' || h === 'set' || h === 'summary') location.hash = h === 'paper' ? '#papers' : '#practise'; else route();
      };
      el.appendChild(b);
    }
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
    // supabase-js holds a lock while this callback runs: any other supabase call inside it deadlocks,
    // so the admin check and routing are deferred to the next tick.
    setTimeout(async () => {
      state.user = session?.user || null;
      if (!state.user) { state.set = null; state.stars = null; state.exam = null; clearInterval(examTimer); }
      if (state.user) {
        const em = state.user.email || '';
        $('account-email').textContent = em;
        const nm = em.split('@')[0].split(/[._\d]/).filter(Boolean);
        $('account-btn').textContent = ((nm[0] || '?')[0] + (nm[1] ? nm[1][0] : '')).toUpperCase();
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
    Object.keys(byTopic).sort().forEach(t => {
      const b = document.createElement('button');
      b.className = 'chip' + (state.topics.has(t) ? ' on' : '');
      b.innerHTML = `${t}<span class="n">${byTopic[t].mcq + byTopic[t].short}</span>`;
      b.dataset.t = t.toLowerCase();
      b.onclick = () => { state.topics.has(t) ? state.topics.delete(t) : state.topics.add(t); b.classList.toggle('on'); startSummary(); };
      wrap.appendChild(b);
    });
    filterTopics(); startSummary();
    $('topics-all').onclick = () => { Object.keys(byTopic).forEach(t => state.topics.add(t)); renderBuild(); };
    $('topics-none').onclick = () => { state.topics.clear(); renderBuild(); };
  }
  function filterTopics() {
    const q = $('topic-filter').value.trim().toLowerCase();
    document.querySelectorAll('#topic-chips .chip').forEach(b => { b.hidden = q && !b.dataset.t.includes(q); });
  }
  $('topic-filter').oninput = filterTopics;
  function startSummary() {
    const n = state.topics.size, o = state.opts;
    $('start-summary').textContent = n ? `${o.count} questions from ${n} topic${n === 1 ? '' : 's'}` : 'Pick at least one topic';
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
      await buildSet();
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
    let q = sb.from('questions').select(QCOLS)
      .eq('papers.subject', state.subject)
      .in('topic', [...state.topics])
      .not('image_path', 'is', null)
      .limit(400);
    if (o.type !== 'all') q = q.eq('type', o.type);
    if (o.diff !== 'all') q = q.eq('papers.difficulty', o.diff);
    const { data, error } = await q;
    if (error) throw error;
    if (!data.length) throw new Error('No questions match that. Widen the filters.');

    let pool = data;
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
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

  // ---------- set ----------
  function label(x) {
    return x.type === 'mcq' ? `Q${x.number}` : `Q${x.number}${x.part ? '(' + x.part + ')' : ''}`;
  }
  function renderQuestion() {
    const s = state.set, x = s.qs[s.i];
    $('set-pos').textContent = `${s.i + 1} of ${s.qs.length} · ${x.topic}`;
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
    $('mcq-controls').hidden = x.type !== 'mcq';
    $('short-controls').hidden = x.type !== 'short';
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
  function verdict(text, cls) { $('verdict').textContent = text; $('verdict').className = 'verdict ' + cls; $('verdict').hidden = false; }
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
      const tp = a.questions.topic || 'Other'; r.topics[tp] = (r.topics[tp] || 0) + 1;
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
    else { renderSummary(); location.hash = '#summary'; }
  }

  // ---------- summary ----------
  function renderSummary(title = 'Set done') {
    $('summary-title').textContent = title; $('summary-extra').textContent = '';
    const rs = state.set.results.filter(Boolean);
    const score = rs.reduce((a, r) => a + r.score, 0), outOf = rs.reduce((a, r) => a + r.outOf, 0);
    $('summary-score').textContent = outOf ? `${score} / ${outOf}  (${Math.round(100 * score / outOf)}%)` : 'Nothing marked';
    const byTopic = {};
    rs.forEach(r => { const t = byTopic[r.q.topic] = byTopic[r.q.topic] || { score: 0, out_of: 0 }; t.score += r.score; t.out_of += r.outOf; });
    bars($('summary-topics'), Object.entries(byTopic).map(([topic, v]) => ({ topic, ...v })));
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
        d.innerHTML = `<div class="lbl"><span>${r.topic}</span><span class="muted">${r.pct}% · ${r.score}/${r.out_of}${r.extra ? ' · ' + r.extra : ''}</span></div>
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
      tr.innerHTML = `<td>${u.email}</td><td>${day(u.created_at)}</td><td>${day(u.last_sign_in_at)}</td><td>${u.attempts}</td><td>${rosterN ? (u.roster_name ? u.roster_name : '<b style="color:#c0392b">Not on list</b>') : '—'}</td><td></td>`;
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
  function drawPapers() {
    const { papers, sum, best } = papersData;
    const q = $('papers-filter').value.trim().toLowerCase();
    const bySchool = {};
    papers.filter(p => !q || p.school.toLowerCase().includes(q) || String(p.year).includes(q))
      .forEach(p => (bySchool[p.school] = bySchool[p.school] || []).push(p));
    const schools = Object.keys(bySchool).sort((a, b) => (/smiths/i.test(b) - /smiths/i.test(a)) || a.localeCompare(b));
    $('papers-count').textContent = `${papers.length} papers, ${new Set(papers.map(p => p.school)).size} schools`;
    const wrap = $('papers-list'); wrap.innerHTML = '';
    if (!schools.length) { wrap.innerHTML = '<p class="muted">Nothing matches.</p>'; return; }
    const { thumbs = {} } = papersData;
    schools.forEach(sch => {
      const list = bySchool[sch].sort((a, b) => b.year - a.year);
      const sec = mk('section', 'pschool');
      sec.appendChild(mk('h2', '', esc(sch)));
      const grid = mk('div', 'pgrid');
      list.forEach(p => {
        const s = sum[p.id] || {};
        const a = mk('a', 'ptile');
        a.href = '#paper/' + encodeURIComponent(p.slug);
        a.title = `${p.school} ${p.year}`;
        const url = thumbs[`${p.slug}/thumb.webp`];
        a.innerHTML = `<div class="pthumb">${url ? `<img loading="lazy" alt="" src="${url}">` : `<span>${esc(p.school)}<br>${p.year}</span>`}${best[p.id] != null ? `<span class="tag">${best[p.id]}%</span>` : ''}</div>
          <div class="pname"><strong>${p.year}</strong><span class="muted small">${s.total_marks ? s.total_marks + ' marks' : ''}</span></div>`;
        const im = a.querySelector('img');
        if (im) im.onerror = () => { im.replaceWith(Object.assign(mk('span', '', `${esc(p.school)}<br>${p.year}`))); };
        grid.appendChild(a);
      });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
  }
  $('papers-filter').oninput = drawPapers;

  async function renderPaper(slug) {
    const box = $('paper-body'); box.innerHTML = '<p class="muted">Loading…</p>';
    $('paper-title').textContent = '';
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
    $('paper-pdf').onclick = () => officialPdf($('paper-pdf'), p, 'pdf_path', pdfBase, $('paper-error'));
    $('paper-pdf-sol').onclick = () => officialPdf($('paper-pdf-sol'), p, 'pdf_sol_path', { ...pdfBase, filename: paperFile(p).replace('.pdf', '-solutions.pdf'), withSolutions: true }, $('paper-error'));
    $('paper-title').textContent = `${p.school} ${p.year}`;
    $('paper-meta').textContent = [C.subjects[p.subject] || p.subject, diffOf(p), `${qs.length} questions`, total ? `${total} marks` : null, p.scanned ? 'scanned paper: whole pages' : null].filter(Boolean).join(' · ');
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
      c.innerHTML = `<div class="between"><strong>${qLabel(q)}</strong><span class="muted small">${marksText(q.marks)} · ${q.topic || 'Untagged'}</span></div>`;
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
    const em = state.user.email || '';
    const local = em.split('@')[0];
    const first = /[._]/.test(local) ? (local.split(/[._\d]/).filter(Boolean)[0] || '') : '';   // only when the address has a first.last shape
    $('home-hello').textContent = first ? `Hi ${first[0].toUpperCase() + first.slice(1)}` : 'Hi';
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
    sel.innerHTML = '<option value="">Pick the paper</option>' + homePapers.filter(p => !p.scanned)
      .map(p => `<option value="${p.id}">${esc(p.school)} ${p.year}</option>`).join('');
    sel.value = keep;
    $('quick-desc').textContent = state.weak && state.weak.length
      ? `10 new questions, mostly ${state.weak.map(w => w.topic).slice(0, 2).join(' and ')}.`
      : "10 questions you haven't done.";
    renderOnboard();
    if (!flag('tour_done') && !state.tourOn) setTimeout(startTour, 350);
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
    const shorts = e.qs.filter(q => q.type !== 'mcq' && q.marks);
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
      c.innerHTML = `<div class="between"><strong>${qLabel(q)}</strong><span class="muted small">${marksText(q.marks)}</span></div>`;
      c.appendChild(qImg(q.imageUrl, 'Question ' + qLabel(q)));
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
      const { error: e1 } = await sb.from('attempts').insert(rs.map(r => ({ user_id: state.user.id, question_id: r.q.id, score: r.score, out_of: r.outOf, chosen: r.chosen, lost: (e.lost && e.lost[r.q.id] && e.lost[r.q.id].length) ? e.lost[r.q.id] : null })));
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
    state.weak = (mine || []).filter(r => r.out_of >= 3).map(r => ({ ...r, pct: r.score / r.out_of })).sort((a, b) => a.pct - b.pct).slice(0, 3);
    if (state.preview) { mine = []; stars = []; ex = []; }   // admin preview: show what a brand-new student sees
    state.attempted = state.preview ? !!previewFlags.attempted : (mine || []).some(r => r.out_of > 0);
    $('weak-list').textContent = state.weak.length ? state.weak.map(w => w.topic).join(', ') : 'None yet';
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
    state.preview = true; previewFlags = {}; $('account-menu').hidden = true; $('preview-new').hidden = true;
    if (location.hash === '#home') route(); else location.hash = '#home';
  };
  $('preview-exit').onclick = () => {
    try { sessionStorage.removeItem('tb_preview'); } catch {}
    state.preview = false; previewFlags = {}; $('preview-new').hidden = !state.admin;
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

  // ---------- spotlight tour for new students ----------
  const TOUR = [
    { el: '#subject-switch', text: 'Switch between Maths Ext 1 and Physics here.' },
    { el: '#next-go', text: 'Start here. This always shows your best next step.' },
    { el: '.others', text: 'Sit a timed paper, get your working marked, or pick your own topics.' },
    { el: '#nav a[data-nav="practise"]', text: 'Practise any topic, one question at a time.' },
    { el: '#nav a[data-nav="papers"]', text: 'Every past paper, with solutions and downloads.' },
    { el: '#nav a[data-nav="progress"]', text: 'See which topics cost you the most marks.' },
    { el: '#account-btn', text: 'Your account and sign out.' },
    { el: null, text: "You're all good to go.", last: true },
  ];
  function startTour() {
    if (state.tourOn || $('view-home').hidden) return;
    state.tourOn = true;
    const block = mk('div', 'tour-block'), spot = mk('div', 'tour-spot'), tip = mk('div', 'tour-tip');
    tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-live', 'polite');
    document.body.append(block, spot, tip);
    let i = 0;
    const end = () => {
      flag('tour_done', 1); state.tourOn = false;
      [block, spot, tip].forEach(x => x.remove());
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
      document.removeEventListener('keydown', key);
    };
    const step = (n) => { i = n; if (i >= TOUR.length) return end(); draw(); };
    function target() { const t = TOUR[i]; return t.el ? [...document.querySelectorAll(t.el)].find(e => e.offsetParent !== null) : null; }
    function draw() {
      const t = TOUR[i], el = target();
      if (t.el && !el) return step(i + 1);   // skip anything not on screen (e.g. a hidden element)
      tip.innerHTML = `<p>${t.text}</p><div class="tour-row">${t.last ? '' : `<span class="tour-n">${i + 1} of ${TOUR.length - 1}</span><button class="link tour-skip">Skip</button>`}<button class="primary tour-next">${t.last ? "Let's go" : 'Next'}</button></div>`;
      tip.querySelector('.tour-next').onclick = () => step(i + 1);
      const sk = tip.querySelector('.tour-skip'); if (sk) sk.onclick = end;
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
      place();
      tip.querySelector('.tour-next').focus();
    }
    function place() {
      const el = target(), pad = 8;
      if (!el) {
        Object.assign(spot.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
        Object.assign(tip.style, { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' });
        tip.classList.add('center'); return;
      }
      tip.classList.remove('center');
      const r = el.getBoundingClientRect();
      Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const tw = Math.min(300, innerWidth - 24), th = tip.offsetHeight || 110;
      const below = r.bottom + pad + 12 + th < innerHeight;
      const top = below ? r.bottom + pad + 12 : Math.max(12, r.top - pad - 12 - th);
      const left = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), innerWidth - tw - 12);
      Object.assign(tip.style, { left: left + 'px', top: top + 'px', width: tw + 'px', transform: 'none' });
    }
    const key = (ev) => { if (ev.key === 'Escape') end(); else if (ev.key === 'ArrowRight') step(i + 1); };
    block.onclick = () => step(i + 1);
    spot.onclick = () => step(i + 1);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    document.addEventListener('keydown', key);
    draw();
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
