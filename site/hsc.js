/* Trialbank: predicted HSC band and ATAR estimate.
   Scaling points: UAC 2024 Report on the Scaling of the NSW HSC, Table A3 (P99, P90, P75, P50, P25), via tutoring.net.au,
   spot-checked against UAC 2025 tables. Aggregate to ATAR: UAC 2025 (Table A9 / Table 3.2).
   Raw-mark band cutoffs: NESA doesn't publish them; these are middle-of-the-range estimates from crowd-sourced results
   (rawmarks.info, 2023 to 2025). Bands 2 to 4 below the published points are our own estimates.
   Everything here is an estimate and is labelled that way in the app. Update these tables each year from UAC. */
(function () {
  // HSC mark -> scaled mark per unit (/50). Extension courses use HSC marks out of 50.
  const SCALING = {
    Ext2: { name: 'Mathematics Extension 2', units: 1, max: 50, pts: [[38.5, 41.9], [43.5, 44.7], [46, 46.6], [47, 47.9], [49, 49.3]] },
    Ext1: { name: 'Mathematics Extension 1', units: 1, max: 50, pts: [[36, 36.5], [42, 41.3], [46, 44.8], [47.5, 46.9], [49, 49.1]] },
    Adv: { name: 'Mathematics Advanced', units: 2, max: 100, pts: [[70, 26.2], [80, 33.5], [89, 38.9], [93, 42.5], [97, 46.4]] },
    Std2: { name: 'Mathematics Standard 2', units: 2, max: 100, pts: [[63, 14.4], [73, 22.3], [81, 30.9], [89, 37.3], [96, 43.2]] },
    Physics: { name: 'Physics', units: 2, max: 100, pts: [[80, 35.9], [91, 43.0]], approx: true },
    Chem: { name: 'Chemistry', units: 2, max: 100, pts: [[66, 24.9], [76, 33.7], [84, 39.9], [90, 43.4], [96, 47.1]] },
    Bio: { name: 'Biology', units: 2, max: 100, pts: [[67, 18.2], [76, 26.6], [83, 34.3], [88, 39.5], [94, 45.5]] },
    Eng: { name: 'Engineering Studies', units: 2, max: 100, pts: [[68, 18.6], [74, 26.1], [82, 33.7], [89, 39.6], [96, 46.0]] },
    SE: { name: 'Software Engineering', units: 2, max: 100, pts: [[68, 18.6], [74, 26.1], [82, 33.7], [89, 39.6], [96, 46.0]], approx: true },   // first HSC 2025: Engineering's curve has the same mean
    Econ: { name: 'Economics', units: 2, max: 100, pts: [[71, 25.6], [80, 33.4], [87, 38.9], [91, 42.3], [96, 46.4]] },
    Bus: { name: 'Business Studies', units: 2, max: 100, pts: [[66, 14.2], [75, 23.5], [84, 32.8], [90, 39.0], [95, 45.4]] },
    Legal: { name: 'Legal Studies', units: 2, max: 100, pts: [[67, 16.1], [77, 25.6], [86, 34.0], [91, 39.8], [96, 46.0]] },
    ModHist: { name: 'Modern History', units: 2, max: 100, pts: [[68, 16.9], [77, 25.8], [84, 33.8], [90, 39.5], [95, 46.1]] },
    PDHPE: { name: 'PDHPE', units: 2, max: 100, pts: [[67, 13.9], [75, 22.2], [83, 31.2], [89, 37.6], [94, 43.9]] },
    Music1: { name: 'Music 1', units: 2, max: 100, pts: [[67, 12.0], [75, 20.2], [83, 29.2], [89, 35.6], [94, 41.9]], approx: true },   // only the mean is published: PDHPE's curve, 2 lower
    Music2: { name: 'Music 2', units: 2, max: 100, pts: [[83, 29.3], [87, 35.7], [91, 40.5], [95, 44.6], [99, 48.7]] },
    EngAdv: { name: 'English Advanced', units: 2, max: 100, english: true, pts: [[78, 27.6], [83, 33.7], [87, 38.8], [91, 42.4], [95, 46.7]] },
    EngStd: { name: 'English Standard', units: 2, max: 100, english: true, pts: [[67, 14.0], [73, 19.6], [77, 25.8], [81, 31.2], [88, 39.5]] },
  };
  // lowest aggregate (/500) for each ATAR, UAC 2025
  const ATAR = [[99.95, 479.4], [99.5, 459.4], [99, 447.8], [98, 433.2], [95, 404.6], [90, 370.7], [85, 341.6], [80, 313.8],
    [75, 287.5], [70, 262.0], [65, 237.2], [60, 212.9], [55, 190.0], [50, 165.7], [46.8, 150.0]];
  // raw exam % at the bottom of each band (estimates). Extension: E4, E3, E2 in the B6, B5, B4 slots.
  const RAW = {
    Adv: [79, 63, 45, 28, 15], Ext1: [70, 50, 22], Ext2: [65, 47, 30], Std2: [89, 74, 53, 35, 20],
    Physics: [81, 70, 55, 40, 25], Bio: [87, 78, 62, 45, 28], Econ: [88, 78, 62, 45, 28], Eng: [84, 72, 57, 42, 28], SE: [84, 72, 57, 42, 28],
  };
  const EXT = (s) => s === 'Ext1' || s === 'Ext2';

  const lerp = (pts, x) => {   // piecewise linear through sorted [x, y] points
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return pts[pts.length - 1][1];
  };

  // raw % on trial-style questions -> HSC (aligned) mark out of 100, or out of 50 for extension courses
  function rawToHsc(subj, raw) {
    const cut = RAW[subj]; if (!cut) return raw;
    const tops = EXT(subj) ? [45, 35, 25] : [90, 80, 70, 60, 50];   // band floors on the HSC scale
    const max = EXT(subj) ? 50 : 100;
    const pts = [[0, 0], ...cut.map((c, i) => [c, tops[i]]).reverse(), [100, max]];
    return Math.max(0, Math.min(max, lerp(pts, raw)));
  }
  function bandOf(subj, mark) {
    if (EXT(subj)) return mark >= 45 ? 'E4' : mark >= 35 ? 'E3' : mark >= 25 ? 'E2' : 'E1';
    return mark >= 90 ? 'Band 6' : mark >= 80 ? 'Band 5' : mark >= 70 ? 'Band 4' : mark >= 60 ? 'Band 3' : mark >= 50 ? 'Band 2' : 'Band 1';
  }

  // attempts: [{ score, out_of, created_at, topic }] in one subject. Recent work counts more (half weight after 30 days).
  function predict(subj, attempts) {
    const now = Date.now();
    let s = 0, o = 0, marks = 0;
    const byTopic = {};
    for (const a of attempts) {
      if (!a.out_of) continue;
      const w = Math.pow(0.5, (now - new Date(a.created_at).getTime()) / (30 * 864e5));
      s += w * a.score; o += w * a.out_of; marks += a.out_of;
      const t = byTopic[a.topic || '?'] = byTopic[a.topic || '?'] || { s: 0, o: 0, n: 0 };
      t.s += w * a.score; t.o += w * a.out_of; t.n += a.out_of;
    }
    const NEED = 40;
    if (marks < NEED || !o) return { ready: false, need: NEED - marks, marks };
    const raw = 100 * s / o;
    const spread = Math.min(12, 4 + 100 * 1.4 * Math.sqrt((raw / 100) * (1 - raw / 100) / marks));   // fewer marks, wider range
    const mark = rawToHsc(subj, raw), lo = rawToHsc(subj, Math.max(0, raw - spread)), hi = rawToHsc(subj, Math.min(100, raw + spread));
    // topics where lifting to your average gains the most marks on a typical paper
    const share = (t) => t.n / marks;
    const holding = Object.entries(byTopic).filter(([, t]) => t.n >= 4 && t.o)
      .map(([topic, t]) => ({ topic, pct: Math.round(100 * t.s / t.o), gain: Math.max(0, share(t) * (raw - 100 * t.s / t.o)) }))
      .filter(x => x.gain > 0.3).sort((a, b) => b.gain - a.gain).slice(0, 4);
    return { ready: true, raw: Math.round(raw), mark: Math.round(mark), lo: Math.round(lo), hi: Math.round(hi), band: bandOf(subj, mark),
      bandLo: bandOf(subj, lo), bandHi: bandOf(subj, hi), max: EXT(subj) ? 50 : 100, marks, holding };
  }

  function scaled(code, mark) {
    const c = SCALING[code]; if (!c) return 0;
    const pts = [[0, 0], ...c.pts, [c.max, 50]];
    return Math.max(0, Math.min(50, lerp(pts, Math.max(0, Math.min(c.max, mark)))));
  }
  // rows: [{ code, mark }]. Best 10 units, at least 2 of English; a course can count in part (unit by unit).
  function atar(rows) {
    const units = [];
    for (const r of rows) {
      const c = SCALING[r.code]; if (!c || r.mark == null || r.mark === '') continue;
      const per = scaled(r.code, +r.mark);
      for (let u = 0; u < c.units; u++) units.push({ code: r.code, per, english: !!c.english });
    }
    const eng = units.filter(u => u.english).sort((a, b) => b.per - a.per).slice(0, 2);
    if (eng.length < 2) return { ok: false, why: 'Add your English course: 2 units of English always count.' };
    const rest = units.filter(u => !eng.includes(u)).sort((a, b) => b.per - a.per).slice(0, 8);
    if (eng.length + rest.length < 10) return { ok: false, why: `Add more courses: the ATAR needs 10 units (you have ${eng.length + rest.length}).` };
    const agg = [...eng, ...rest].reduce((a, u) => a + u.per, 0);
    let est;
    if (agg >= ATAR[0][1]) est = 99.95;
    else if (agg < ATAR[ATAR.length - 1][1]) est = null;
    else for (let i = 1; i < ATAR.length; i++) if (agg >= ATAR[i][1]) {
      const [a0, g0] = ATAR[i - 1], [a1, g1] = ATAR[i];
      est = a1 + (a0 - a1) * (agg - g1) / (g0 - g1); break;
    }
    const counted = {};
    [...eng, ...rest].forEach(u => { counted[u.code] = (counted[u.code] || 0) + 1; });
    return { ok: true, aggregate: Math.round(agg * 10) / 10, atar: est == null ? null : Math.floor(est * 20) / 20, counted,
      perUnit: Object.fromEntries(rows.filter(r => SCALING[r.code] && r.mark !== '' && r.mark != null).map(r => [r.code, Math.round(scaled(r.code, +r.mark) * 10) / 10])) };
  }

  window.HSC = { SCALING, predict, atar, scaled, rawToHsc, bandOf, EXT, YEAR: 'UAC 2024 scaling, 2025 ATAR table' };
})();
