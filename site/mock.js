/* Demo mode: a stand-in for supabase-js backed by mock-data.js, so the site runs with no backend.
   Loaded only when config.js sets demo: true. Attempts live in memory for the session. */
(() => {
  const D = window.MOCK_DATA;
  const attempts = [];
  const user = { id: 'demo-user', email: 'demo@example.com' };
  const listeners = [];

  class Query {
    constructor(rows) { this.rows = rows; }
    select() { return this; }
    eq(k, v) { this.rows = this.rows.filter(r => get(r, k) == v); return this; }
    in(k, vs) { this.rows = this.rows.filter(r => vs.includes(get(r, k))); return this; }
    not(k, op, v) { if (op === 'is' && v === null) this.rows = this.rows.filter(r => get(r, k) != null); return this; }
    limit(n) { this.rows = this.rows.slice(0, n); return this; }
    insert(row) { attempts.push({ ...row, created_at: new Date().toISOString() }); return Promise.resolve({ data: null, error: null }); }
    then(res) { res({ data: this.rows.map(r => ({ ...r })), error: null }); }
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
          signOut: () => { alert('Demo mode: no accounts.'); return Promise.resolve(); },
          signInWithPassword: () => Promise.resolve({ data: { session: { user } }, error: null }),
          signUp: () => Promise.resolve({ data: { session: { user } }, error: null }),
        },
        from(table) {
          if (table === 'questions') return new Query(D.questions);
          if (table === 'topic_counts') return new Query(D.topic_counts);
          if (table === 'attempts') return new Query(attempts);
          if (table === 'my_topic_stats') return new Query(topicStats(true));
          return new Query([]);
        },
        rpc(name, args) {
          if (name === 'cohort_topic_stats') return Promise.resolve({ data: topicStats(false).filter(r => r.subject === args.subj), error: null });
          return Promise.resolve({ data: [], error: null });
        },
        storage: { from: () => ({ createSignedUrls: (paths) => Promise.resolve({ data: paths.map(p => ({ path: p, signedUrl: 'demo/' + p })), error: null }) }) },
      };
    },
  };
})();
