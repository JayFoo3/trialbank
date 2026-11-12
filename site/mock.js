/* Demo mode: a stand-in for supabase-js backed by mock-data.js, so the site runs with no backend.
   Loaded only when config.js sets demo: true. Attempts live in memory for the session. */
(() => {
  const D = window.MOCK_DATA;
  const attempts = [];
  const settings = [{ key: 'signup_mode', value: 'whitelist' }, { key: 'invite_code', value: 'demo' }, { key: 'admin_emails', value: 'demo@example.com' }];
  const allowedEmails = [{ email: 'demo@example.com' }];
  const user = { id: 'demo-user', email: 'demo@example.com' };
  const listeners = [];
  // one row per paper, built from the questions (the real site has a papers table)
  const papers = Object.values(D.questions.reduce((m, q) => { const slug = q.id.split('/')[0]; if (!m[slug]) m[slug] = { id: slug, slug, subject: q.papers.subject, school: q.papers.school, year: q.papers.year, difficulty: q.papers.difficulty, title: `${q.papers.school} ${q.papers.year}`, n_questions: 0, marks: 0 }; m[slug].n_questions++; m[slug].marks += q.marks || 0; return m; }, {}));
  D.questions.forEach(q => { const slug = q.id.split('/')[0]; q.paper_id = q.paper_id || slug; q.papers = { id: slug, slug, ...q.papers }; });
  const chan = () => { const c = { on: () => c, subscribe: (f) => { if (f) setTimeout(() => f('SUBSCRIBED'), 0); return c; }, track: () => Promise.resolve(), untrack: () => Promise.resolve(), send: () => Promise.resolve(), unsubscribe: () => Promise.resolve(), presenceState: () => ({}) }; return c; };

  class Query {
    constructor(rows) { this.rows = rows; }
    select() { return this; }
    eq(k, v) { this.rows = this.rows.filter(r => get(r, k) == v); return this; }
    in(k, vs) { this.rows = this.rows.filter(r => vs.includes(get(r, k))); return this; }
    not(k, op, v) { if (op === 'is' && v === null) this.rows = this.rows.filter(r => get(r, k) != null); else if (op === 'like') { const re = new RegExp('^' + v.replace(/%/g, '.*') + '$'); this.rows = this.rows.filter(r => !re.test(String(get(r, k) ?? ''))); } return this; }
    or(expr) { const ps = expr.split(',').map(x => x.split('.')); this.rows = this.rows.filter(r => ps.some(([k, ...op]) => op.join('.') === 'not.is.null' ? get(r, k) != null : true)); return this; }
    like(k, pat) { const re = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$'); this.rows = this.rows.filter(r => re.test(String(get(r, k) ?? ''))); return this; }
    lte(k, v) { this.rows = this.rows.filter(r => get(r, k) <= v); return this; }
    gte(k, v) { this.rows = this.rows.filter(r => get(r, k) >= v); return this; }
    limit(n) { this.rows = this.rows.slice(0, n); return this; }
    range(a, b) { this.rows = this.rows.slice(a, b + 1); return this; }
    neq(k, v) { this.rows = this.rows.filter(r => get(r, k) != v); return this; }
    is(k, v) { this.rows = this.rows.filter(r => (get(r, k) ?? null) === v); return this; }
    gt(k, v) { this.rows = this.rows.filter(r => get(r, k) > v); return this; }
    lt(k, v) { this.rows = this.rows.filter(r => get(r, k) < v); return this; }
    ilike(k, pat) { const re = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); this.rows = this.rows.filter(r => re.test(String(get(r, k) ?? ''))); return this; }
    contains() { return this; } overlaps() { return this; } filter() { return this; } match() { return this; } abortSignal() { return this; }
    update() { return this; }
    single() { return Promise.resolve({ data: this.rows[0] ? { ...this.rows[0] } : null, error: null }); }
    maybeSingle() { return this.single(); }
    order() { return this; }
    upsert(rows) { (Array.isArray(rows) ? rows : [rows]).forEach(r => { const i = this.rows.findIndex(x => x.key ? x.key === r.key : x.email === r.email); i >= 0 ? Object.assign(this.rows[i], r) : this.rows.push(r); }); return Promise.resolve({ data: null, error: null }); }
    delete() { const self = this; return { eq(k, v) { const i = self.rows.findIndex(r => r[k] === v); if (i >= 0) self.rows.splice(i, 1); return Promise.resolve({ data: null, error: null }); } }; }
    insert(row) { const saved = { id: 'a' + attempts.length, ...row, created_at: new Date().toISOString() }; attempts.push(saved); const done = Promise.resolve({ data: saved, error: null }); const chain = { select: () => chain, single: () => done, maybeSingle: () => done, then: (a, b) => done.then(a, b) }; return chain; }
    then(res, rej) { return Promise.resolve({ data: this.rows.map(r => ({ ...r })), error: null, count: this.rows.length }).then(res, rej); }
  }
  function get(r, k) { return k.includes('.') ? k.split('.').reduce((o, p) => (o || {})[p], r) : r[k]; }

  function topicStats(filterUser) {
    const m = {};
    attempts.filter(a => !filterUser || a.user_id === user.id).forEach(a => {
      const q = D.questions.find(x => x.id === a.question_id); if (!q) return;
      const t = m[q.topic] = m[q.topic] || { subject: q.papers.subject, topic: q.topic, attempts: 0, score: 0, out_of: 0, students: 1 };
      t.attempts++; t.score += a.score; t.out_of += a.out_of;
    });
    return Object.values(m);
  }

  window.supabase = {
    createClient() {
      return {
        auth: {
          getSession: () => Promise.resolve({ data: { session: { user } } }),
          onAuthStateChange: (fn) => listeners.push(fn),
          updateUser: ({ data }) => { user.user_metadata = { ...(user.user_metadata || {}), ...(data || {}) }; return Promise.resolve({ data: { user }, error: null }); },
          signOut: () => { alert('Demo mode: no accounts.'); return Promise.resolve(); },
          signInWithPassword: () => Promise.resolve({ data: { session: { user } }, error: null }),
          signUp: () => Promise.resolve({ data: { session: { user } }, error: null }),
        },
        from(table) {
          if (table === 'questions') return new Query(D.questions);
          if (table === 'papers') return new Query(papers);
          if (table === 'topic_counts') return new Query(D.topic_counts);
          if (table === 'attempts') return new Query(attempts);
          if (table === 'my_topic_stats') return new Query(topicStats(true));
          if (table === 'settings') { const q = new Query(settings); q.rows = settings; return q; }
          if (table === 'allowed_emails') { const q = new Query(allowedEmails); q.rows = allowedEmails; return q; }
          return new Query([]);
        },
        rpc(name, args) {
          if (name === 'signup_reason') return Promise.resolve({ data: null, error: null });
          if (name === 'is_admin') return Promise.resolve({ data: true, error: null });
          if (name === 'admin_users') return Promise.resolve({ data: [{ email: 'demo@example.com', created_at: new Date().toISOString(), last_sign_in_at: null, attempts: attempts.length }], error: null });
          if (name === 'admin_test_alert') return Promise.resolve({ data: null, error: null });
          if (name === 'admin_remove_user') return Promise.resolve({ data: null, error: null });
          if (name === 'cohort_topic_stats') return Promise.resolve({ data: topicStats(false).filter(r => r.subject === args.subj), error: null });
          return Promise.resolve({ data: [], error: null });
        },
        functions: { invoke: () => Promise.resolve({ data: null, error: { message: 'Demo mode: this needs the real site.' } }) },
        channel: chan, removeChannel: () => Promise.resolve(), getChannels: () => [],
        storage: { from: () => ({ createSignedUrls: (paths) => Promise.resolve({ data: paths.map(p => ({ path: p, signedUrl: 'demo/' + p })), error: null }) }) },
      };
    },
  };
})();
