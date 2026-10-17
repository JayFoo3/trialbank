/* Trialbank - plain JS, one file. Views: auth, home, set, summary, progress. */
(() => {
  const C = window.APP_CONFIG;
  const sb = supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  const $ = (id) => document.getElementById(id);
  const views = ['auth', 'home', 'set', 'summary', 'progress', 'admin', 'papers', 'paper', 'exam', 'examrun', 'review'];
  const QCOLS = 'id, qid, number, part, type, marks, topic, answer, image_path, solution_path, coarse, papers!inner(subject, school, year, difficulty)';

  document.title = C.name;
  $('brand').textContent = C.name;

  const state = {
    user: null,
    subject: Object.keys(C.subjects)[0],
    topics: new Set(),          // selected topic names
    opts: { count: 10, type: 'all', diff: 'all', fresh: 1 },
    set: null,                  // { qs: [...], i, results: [] }
  };

  // ---------- routing ----------
  function show(name) {
    views.forEach(v => $('view-' + v).hidden = v !== name);
    $('nav').hidden = !state.user;
    window.scrollTo(0, 0);
  }
  async function route() {
    const [h, arg] = (location.hash || '#home').slice(1).split('/');
    if (!state.user) return show('auth');
    if (h === 'progress') { await renderProgress(); return show('progress'); }
    if (h === 'admin' && state.admin) { await renderAdmin(); return show('admin'); }
    if (h === 'set' && state.set) return show('set');
    if (h === 'summary' && state.set) return show('summary');
    if (h === 'papers') { show('papers'); await renderPapers(); return; }
    if (h === 'paper' && arg) { $('paper-error').hidden = true; show('paper'); await renderPaper(decodeURIComponent(arg)); return; }
    if (h === 'review') { show('review'); await renderReview(); return; }
    if (h === 'examrun') { if (state.exam) return show('examrun'); location.hash = '#exam'; return; }
    if (h === 'exam') {
      if (state.exam) { location.hash = '#examrun'; return; }
      show('exam');
      const saved = lsGet(saveKey());
      if (saved) { try { await resumeExam(saved); } catch (err) { renderExamSetup(); } } else renderExamSetup();
      return;
    }
    await renderHome(); show('home');
  }
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
      await checkAdmin();
      route();
    }, 0);
  });
  async function checkAdmin() {
    state.admin = false;
    if (state.user) { const { data } = await sb.rpc('is_admin'); state.admin = !!data; }
    $('nav-admin').hidden = !state.admin;
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
  async function renderHome() {
    tabs('subject-tabs', renderHome);
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
      b.onclick = () => { state.topics.has(t) ? state.topics.delete(t) : state.topics.add(t); b.classList.toggle('on'); };
      wrap.appendChild(b);
    });
    $('topics-all').onclick = () => { Object.keys(byTopic).forEach(t => state.topics.add(t)); renderHome(); };
    $('topics-none').onclick = () => { state.topics.clear(); renderHome(); };
  }
  document.querySelectorAll('.seg').forEach(seg => {
    seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      const v = b.dataset.v;
      state.opts[seg.dataset.opt] = isNaN(v) ? v : Number(v);
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
    ['careless', 'Careless'], ['time', "Didn't finish"], ['cfpe', 'CFPE'],
  ];
  const reasonName = Object.fromEntries(REASONS);
  function showLost(res, nLost) {
    res.lost = res.lost || [];
    const box = $('lost-box'), marks = $('lost-marks'), outOf = res.outOf;
    $('lost-hint').textContent = `You dropped ${nLost} of ${outOf}. Tag each one.`;
    $('lost-reason-wrap').hidden = true;
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
      const wrap = $('lost-reason-wrap'), rs = $('lost-reasons');
      wrap.hidden = cur == null; if (cur == null) return;
      $('lost-reason-q').textContent = `Why did you lose mark ${cur}?`;
      const t = res.lost.find(l => l.mark === cur);
      rs.innerHTML = '';
      REASONS.forEach(([k, name]) => {
        const b = mk('button', t && t.reason === k ? 'on' : '', name);
        b.onclick = () => {
          res.lost = res.lost.filter(l => l.mark !== cur);
          if (!(t && t.reason === k)) res.lost.push({ mark: cur, reason: k });
          res.lost.sort((a, b) => a.mark - b.mark);
          if (res.lost.length >= nLost) cur = null;
          else { const next = [...Array(outOf).keys()].map(i => i + 1).find(m => m > (cur || 0) && !res.lost.some(l => l.mark === m)); cur = next || null; }
          draw(); drawReasons(); saveLost(res);
        };
        rs.appendChild(b);
      });
    };
    draw(); box.hidden = false;
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
    const total = Object.values(by).reduce((x, r) => x + r.n, 0);
    el.innerHTML = '';
    if (!total) { el.innerHTML = '<p class="muted small">Nothing tagged yet. After checking a solution, tap which marks you lost and why.</p>'; return; }
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
    tabs('progress-tabs', renderProgress);
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
    tabs('papers-tabs', renderPapers);
    $('papers-list').innerHTML = '<p class="muted">Loading…</p>';
    const [{ data: papers }, { data: sums }, { data: exams }] = await Promise.all([
      sb.from('papers').select('id, slug, subject, school, year, difficulty, scanned').eq('subject', state.subject),
      sb.from('paper_summary').select('*'),
      sb.from('exams').select('paper_id, score, out_of'),
    ]);
    const best = {};
    (exams || []).forEach(e => { if (e.out_of) best[e.paper_id] = Math.max(best[e.paper_id] || 0, Math.round(100 * e.score / e.out_of)); });
    papersData = { papers: papers || [], sum: Object.fromEntries((sums || []).map(s => [s.paper_id, s])), best };
    drawPapers();
  }
  function drawPapers() {
    const { papers, sum, best } = papersData;
    const q = $('papers-filter').value.trim().toLowerCase();
    const bySchool = {};
    papers.filter(p => !q || p.school.toLowerCase().includes(q) || String(p.year).includes(q))
      .forEach(p => (bySchool[p.school] = bySchool[p.school] || []).push(p));
    const schools = Object.keys(bySchool).sort((a, b) => (/smiths/i.test(b) - /smiths/i.test(a)) || a.localeCompare(b));
    $('papers-count').textContent = `· ${papers.length} papers, ${new Set(papers.map(p => p.school)).size} schools`;
    const wrap = $('papers-list'); wrap.innerHTML = '';
    if (!schools.length) { wrap.innerHTML = '<p class="muted">Nothing matches.</p>'; return; }
    schools.forEach(sch => {
      const list = bySchool[sch].sort((a, b) => b.year - a.year);
      const d = mk('details', 'folder');
      if (/smiths/i.test(sch) || q) d.open = true;
      d.innerHTML = `<summary><span>${sch}</span><span class="muted small">${list.length} paper${list.length === 1 ? '' : 's'}</span></summary>`;
      list.forEach(p => {
        const s = sum[p.id] || {};
        const a = mk('a', 'prow');
        a.href = '#paper/' + encodeURIComponent(p.slug);
        const bits = [diffOf(p), s.n_questions ? s.n_questions + ' questions' : null, s.total_marks ? s.total_marks + ' marks' : null, p.scanned ? 'scanned' : null].filter(Boolean).join(' · ');
        a.innerHTML = `<span class="yr">${p.year}</span><span class="muted small">${bits}</span>${best[p.id] != null ? `<span class="tag">Sat · ${best[p.id]}%</span>` : ''}`;
        d.appendChild(a);
      });
      wrap.appendChild(d);
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

  // ---------- exam mode ----------
  const saveKey = () => 'tb_exam_' + (state.user ? state.user.id : '');
  function saveExam() {
    const e = state.exam; if (!e) return;
    lsSet(saveKey(), { paperId: e.paper.id, startedAt: e.startedAt, readingSec: e.readingSec, workSec: e.workSec, answers: e.answers, marks: e.marks, finishedAt: e.finishedAt || null });
  }
  function renderExamSetup() {
    tabs('exam-tabs', renderExamSetup);
    const d = examDefaults(state.subject);
    $('exam-reading').value = d.reading; $('exam-working').value = d.working;
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
    if (!ps || !ps[0]) { lsDel(saveKey()); return renderExamSetup(); }
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
    e.qs.forEach((q, idx) => {
      const chip = mk('button', e.answers[q.id] || e.marks[q.id] != null ? 'done' : '', qLabel(q).replace(/^Q/, ''));
      chip.onclick = () => document.getElementById('xq' + idx).scrollIntoView({ block: 'start' });
      jump.appendChild(chip);
      const c = mk('div', 'card qcard'); c.id = 'xq' + idx;
      c.innerHTML = `<div class="between"><strong>${qLabel(q)}</strong><span class="muted small">${marksText(q.marks)}</span></div>`;
      c.appendChild(qImg(q.imageUrl, 'Question ' + qLabel(q)));
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
              chip.classList.add('done'); updateRunning();
            };
            mkr.appendChild(b);
          }
          c.appendChild(mkr);
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
      const { error: e1 } = await sb.from('attempts').insert(rs.map(r => ({ user_id: state.user.id, question_id: r.q.id, score: r.score, out_of: r.outOf, chosen: r.chosen })));
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
    tabs('review-tabs', renderReview);
    $('review-error').hidden = true;
    const [{ data: mine }, { data: stars }, { data: ex }] = await Promise.all([
      sb.from('my_topic_stats').select('*').eq('subject', state.subject),
      sb.from('bookmarks').select('question_id'),
      sb.from('exams').select('started_at, seconds_used, score, out_of, work_minutes, papers!inner(school, year, subject)').eq('papers.subject', state.subject).order('started_at', { ascending: false }).limit(20),
    ]);
    state.weak = (mine || []).filter(r => r.out_of >= 3).map(r => ({ ...r, pct: r.score / r.out_of })).sort((a, b) => a.pct - b.pct).slice(0, 3);
    $('weak-list').textContent = state.weak.length ? 'Weakest right now: ' + state.weak.map(w => `${w.topic} (${Math.round(100 * w.pct)}%)`).join(', ') : 'Attempt a few questions first and this will find your weak topics.';
    $('drill-weak').disabled = !state.weak.length;
    $('star-count').textContent = `${(stars || []).length} starred question${(stars || []).length === 1 ? '' : 's'}`;
    const tb = $('exam-history').querySelector('tbody'); tb.innerHTML = '';
    (ex || []).forEach(r => {
      const tr = mk('tr');
      tr.innerHTML = `<td>${day(r.started_at)}</td><td>${r.papers.school} ${r.papers.year}</td><td>${r.score}/${r.out_of} (${r.out_of ? Math.round(100 * r.score / r.out_of) : 0}%)</td><td>${Math.round((r.seconds_used || 0) / 60)} of ${r.work_minutes} min</td>`;
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

  // ---------- boot ----------
  sb.auth.getSession().then(async ({ data }) => { state.user = data.session?.user || null; await checkAdmin(); route(); });
})();
