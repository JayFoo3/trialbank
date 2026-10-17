/* Trialbank - plain JS, one file. Views: auth, home, set, summary, progress. */
(() => {
  const C = window.APP_CONFIG;
  const sb = supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  const $ = (id) => document.getElementById(id);
  const views = ['auth', 'home', 'set', 'summary', 'progress', 'admin'];

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
    const h = (location.hash || '#home').slice(1);
    if (!state.user) return show('auth');
    if (h === 'progress') { await renderProgress(); return show('progress'); }
    if (h === 'admin' && state.admin) { await renderAdmin(); return show('admin'); }
    if (h === 'set' && state.set) return show('set');
    if (h === 'summary' && state.set) return show('summary');
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
      if (!state.user) state.set = null;
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

  async function buildSet() {
    let q = sb.from('questions')
      .select('id, qid, number, part, type, marks, topic, answer, image_path, solution_path, coarse, papers!inner(subject, school, year, difficulty)')
      .eq('papers.subject', state.subject)
      .in('topic', [...state.topics])
      .not('image_path', 'is', null)
      .limit(400);
    if (state.opts.type !== 'all') q = q.eq('type', state.opts.type);
    if (state.opts.diff !== 'all') q = q.eq('papers.difficulty', state.opts.diff);
    const { data, error } = await q;
    if (error) throw error;
    if (!data.length) throw new Error('No questions match that. Widen the filters.');

    let pool = data;
    if (state.opts.fresh) {
      const { data: seen } = await sb.from('attempts').select('question_id').eq('user_id', state.user.id);
      const seenIds = new Set((seen || []).map(a => a.question_id));
      const unseen = pool.filter(x => !seenIds.has(x.id));
      if (unseen.length >= state.opts.count) pool = unseen;
    }
    shuffle(pool);
    const qs = pool.slice(0, state.opts.count);

    // signed URLs for images (private bucket)
    const paths = [...new Set(qs.flatMap(x => [x.image_path, x.solution_path]).filter(Boolean))];
    const { data: urls, error: uerr } = await sb.storage.from('questions').createSignedUrls(paths, 3600);
    if (uerr) throw uerr;
    const urlOf = {}; urls.forEach(u => urlOf[u.path] = u.signedUrl);
    qs.forEach(x => { x.imageUrl = urlOf[x.image_path]; x.solutionUrl = x.solution_path ? urlOf[x.solution_path] : null; });

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
    $('q-img').src = x.imageUrl;
    $('q-coarse').hidden = !x.coarse;
    $('verdict').hidden = true; $('verdict').className = 'verdict';
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
    const { error } = await sb.from('attempts').insert({ user_id: state.user.id, question_id: x.id, score, out_of: outOf, chosen });
    if (error) console.warn('attempt not saved', error.message);
  }
  $('next').onclick = advance;
  $('skip').onclick = advance;
  function advance() {
    const s = state.set;
    if (s.i + 1 < s.qs.length) { s.i++; renderQuestion(); }
    else { renderSummary(); location.hash = '#summary'; }
  }

  // ---------- summary ----------
  function renderSummary() {
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
  let allowed = [];
  async function renderAdmin() {
    const [{ data: settings }, { data: emails }, { data: users }] = await Promise.all([
      sb.from('settings').select('*'),
      sb.from('allowed_emails').select('email').order('email'),
      sb.rpc('admin_users'),
    ]);
    const s = Object.fromEntries((settings || []).map(r => [r.key, r.value]));
    document.querySelectorAll('#admin-mode button').forEach(b => b.classList.toggle('on', b.dataset.v === (s.signup_mode || 'domain')));
    $('admin-code').value = s.invite_code || '';
    $('admin-admins').value = s.admin_emails || '';
    allowed = (emails || []).map(r => r.email);
    drawAllowed();
    const tb = $('users-table').querySelector('tbody'); tb.innerHTML = '';
    (users || []).forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.email}</td><td>${day(u.created_at)}</td><td>${day(u.last_sign_in_at)}</td><td>${u.attempts}</td><td></td>`;
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

  // ---------- boot ----------
  sb.auth.getSession().then(async ({ data }) => { state.user = data.session?.user || null; await checkAdmin(); route(); });
})();
