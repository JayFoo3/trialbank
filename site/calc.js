// Trialbank calculator: a working replica of the Casio fx-8200 AU (ClassWiz CW).
// Same keys in the same places with the same blue SHIFT functions, the HOME screen with its six apps
// (Calculate, Statistics, Distribution, Table, Complex, Vector), and the SETTINGS, CATALOG, TOOLS, VARIABLE,
// FUNCTION and FORMAT menus, driven by the D-pad, OK, EXE and the back key, as described in Casio's user's guide.
(function () {
  // =====================================================================================================
  // maths
  // =====================================================================================================
  function cnd(x) {    // standard normal CDF (Hart / West, double precision)
    const X = Math.abs(x); let c;
    if (X > 37) c = 0;
    else {
      const e = Math.exp(-X * X / 2);
      if (X < 7.07106781186547) {
        let b = 3.52624965998911E-02 * X + 0.700383064443688; b = b * X + 6.37396220353165; b = b * X + 33.912866078383;
        b = b * X + 112.079291497871; b = b * X + 221.213596169931; b = b * X + 220.206867912376; c = e * b;
        b = 8.83883476483184E-02 * X + 1.75566716318264; b = b * X + 16.064177579207; b = b * X + 86.7807322029461;
        b = b * X + 296.564248779674; b = b * X + 637.333633378831; b = b * X + 793.826512519948; b = b * X + 440.413735824752; c /= b;
      } else { let b = X + 0.65; b = X + 4 / b; b = X + 3 / b; b = X + 2 / b; b = X + 1 / b; c = e / b / 2.506628274631; }
    }
    return x > 0 ? 1 - c : c;
  }
  function invNorm(p) {    // Acklam, then one Newton step on cnd
    if (p <= 0 || p >= 1) return NaN;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r, x;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= 1 - pl) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const e = cnd(x) - p; x -= e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x;
  }
  function lgamma(z) {    // Lanczos
    const g = 7, C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z);
    z -= 1; let x = C[0]; for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
    const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  const isInt = (n) => typeof n === 'number' && Number.isInteger(n);
  const fact = (n) => { if (!isInt(n) || n < 0 || n > 69) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const nCr = (n, r) => { if (!isInt(n) || !isInt(r) || r < 0 || n < 0 || r > n || n >= 1e10) return NaN; r = Math.min(r, n - r); let v = 1; for (let i = 1; i <= r; i++) v = v * (n - r + i) / i; return Math.round(v); };
  const nPr = (n, r) => { if (!isInt(n) || !isInt(r) || r < 0 || r > n || n >= 1e10) return NaN; let v = 1; for (let i = 0; i < r; i++) v *= n - i; return v; };
  const binPD = (x, n, p) => (x < 0 || x > n || !isInt(x)) ? 0 : Math.exp(lgamma(n + 1) - lgamma(x + 1) - lgamma(n - x + 1) + (x ? x * Math.log(p) : 0) + (n - x ? (n - x) * Math.log(1 - p) : 0));
  const binCD = (x, n, p) => { let s = 0; for (let k = 0; k <= Math.min(Math.floor(x), n); k++) s += binPD(k, n, p); return Math.min(1, s); };
  const poiPD = (x, l) => (x < 0 || !isInt(x)) ? 0 : Math.exp(-l + x * Math.log(l) - lgamma(x + 1));
  const poiCD = (x, l) => { let s = 0; for (let k = 0; k <= Math.floor(x); k++) s += poiPD(k, l); return Math.min(1, s); };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

  // =====================================================================================================
  // values: real numbers, complex numbers {re, im} (Complex app) and vectors {vec: [...]} (Vector app)
  // =====================================================================================================
  const ERR = (m) => { const e = new Error(m); e.casio = true; throw e; };
  const isC = (v) => v !== null && typeof v === 'object' && 're' in v;
  const isV = (v) => v !== null && typeof v === 'object' && 'vec' in v;
  const tidy = (x) => Math.abs(x) < 1e-13 ? 0 : x;
  const mkC = (re, im) => Math.abs(im) < 1e-13 * Math.max(1, Math.abs(re)) ? tidy(re) : { re: tidy(re), im: tidy(im) };
  const toC = (v) => isC(v) ? v : { re: v, im: 0 };
  const real = (v) => { if (isV(v)) ERR('Math ERROR'); if (isC(v)) ERR('Math ERROR'); return v; };
  const A = {
    add(a, b) { if (isV(a) || isV(b)) { if (!isV(a) || !isV(b) || a.vec.length !== b.vec.length) ERR('Dimension ERROR'); return { vec: a.vec.map((x, i) => x + b.vec[i]) }; }
      if (isC(a) || isC(b)) { a = toC(a); b = toC(b); return mkC(a.re + b.re, a.im + b.im); } return a + b; },
    neg(a) { if (isV(a)) return { vec: a.vec.map(x => -x) }; if (isC(a)) return mkC(-a.re, -a.im); return -a; },
    sub(a, b) { return A.add(a, A.neg(b)); },
    mul(a, b) {
      if (isV(a) && isV(b)) {   // vector × vector: cross product (3 dimensions)
        if (a.vec.length !== 3 || b.vec.length !== 3) ERR('Dimension ERROR');
        const [x1, y1, z1] = a.vec, [x2, y2, z2] = b.vec; return { vec: [y1 * z2 - z1 * y2, z1 * x2 - x1 * z2, x1 * y2 - y1 * x2] };
      }
      if (isV(a)) return { vec: a.vec.map(x => x * real(b)) }; if (isV(b)) return { vec: b.vec.map(x => x * real(a)) };
      if (isC(a) || isC(b)) { a = toC(a); b = toC(b); return mkC(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
      return a * b;
    },
    div(a, b) {
      if (isV(b)) ERR('Math ERROR');
      if (isV(a)) { const d = real(b); if (d === 0) ERR('Math ERROR'); return { vec: a.vec.map(x => x / d) }; }
      if (isC(a) || isC(b)) { a = toC(a); b = toC(b); const d = b.re * b.re + b.im * b.im; if (d === 0) ERR('Math ERROR'); return mkC((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }
      if (b === 0) ERR('Math ERROR'); return a / b;
    },
    pow(a, b, cplx) {
      if (isV(a) || isV(b)) ERR('Math ERROR');
      if (!isC(a) && !isC(b)) {
        if (a < 0 && !isInt(b)) {
          const den = ratio(b, 99); if (den && den[1] % 2 === 1) { const r = Math.pow(-a, b); return den[0] % 2 ? -r : r; }   // odd roots of negatives
          if (cplx) return cpow(toC(a), toC(b)); ERR('Math ERROR');
        }
        if (a === 0 && b < 0) ERR('Math ERROR');
        return Math.pow(a, b);
      }
      if (!isC(b) && isInt(b) && Math.abs(b) < 1e10) { let r = { re: 1, im: 0 }, x = toC(a), n = Math.abs(b); for (; n; n >>= 1) { if (n & 1) r = toC(A.mul(r, x)); x = toC(A.mul(x, x)); } return b < 0 ? A.div(1, mkC(r.re, r.im)) : mkC(r.re, r.im); }
      return cpow(toC(a), toC(b));
    },
  };
  function cpow(a, b) { const m = Math.hypot(a.re, a.im); if (m === 0) return 0; const t = Math.atan2(a.im, a.re), lr = Math.log(m); const re = Math.exp(b.re * lr - b.im * t), th = b.im * lr + b.re * t; return mkC(re * Math.cos(th), re * Math.sin(th)); }
  const abs = (v) => isV(v) ? Math.hypot(...v.vec) : isC(v) ? Math.hypot(v.re, v.im) : Math.abs(v);

  // =====================================================================================================
  // tokens
  // =====================================================================================================
  // templates: open a group closed by ')' and split by ','
  const TEMPLATES = { 'frac(': 2, 'mixed(': 3, 'sqrt(': 1, 'root(': 2, 'pow(': 1, 'logb(': 2, 'sum(': 3, 'prod(': 3, 'abs(': 1 };
  // functions written with a bracket that the student closes, like on the calculator
  const FUNCS = ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'sinh(', 'cosh(', 'tanh(', 'asinh(', 'acosh(', 'atanh(', 'log(', 'ln(',
    'Rnd(', 'GCD(', 'LCM(', 'Pol(', 'Rec(', 'RanInt#(', 'f(', 'g(', 'Conjg(', 'Arg(', 'ReP(', 'ImP(', 'Angle(', 'UnitV('];
  const OPENERS = new Set(['(', ...Object.keys(TEMPLATES), ...FUNCS]);
  const FNAME = { 'sin(': 'sin', 'cos(': 'cos', 'tan(': 'tan', 'asin(': 'sin<sup>−1</sup>', 'acos(': 'cos<sup>−1</sup>', 'atan(': 'tan<sup>−1</sup>',
    'sinh(': 'sinh', 'cosh(': 'cosh', 'tanh(': 'tanh', 'asinh(': 'sinh<sup>−1</sup>', 'acosh(': 'cosh<sup>−1</sup>', 'atanh(': 'tanh<sup>−1</sup>',
    'log(': 'log', 'ln(': 'ln', 'Rnd(': 'Rnd', 'GCD(': 'GCD', 'LCM(': 'LCM', 'Pol(': 'Pol', 'Rec(': 'Rec', 'RanInt#(': 'RanInt#', 'f(': '<i>f</i>', 'g(': '<i>g</i>',
    'Conjg(': 'Conjg', 'Arg(': 'Arg', 'ReP(': 'ReP', 'ImP(': 'ImP', 'Angle(': 'Angle', 'UnitV(': 'UnitV' };
  const VARS = ['A', 'B', 'C', 'D', 'E', 'F', 'x', 'y', 'z'];
  const VCT = ['VctA', 'VctB', 'VctC', 'VctD', 'VctAns'];
  const RELS = ['=', '≠', '>', '≥', '<', '≤'];
  const STATK = { 'S:Σx': 'Σ<i>x</i>', 'S:Σy': 'Σ<i>y</i>', 'S:Σx2': 'Σ<i>x</i><sup>2</sup>', 'S:Σy2': 'Σ<i>y</i><sup>2</sup>', 'S:Σxy': 'Σ<i>xy</i>', 'S:Σx3': 'Σ<i>x</i><sup>3</sup>', 'S:Σx2y': 'Σ<i>x</i><sup>2</sup><i>y</i>', 'S:Σx4': 'Σ<i>x</i><sup>4</sup>',
    'S:xbar': '<i>x̄</i>', 'S:ybar': '<i>ȳ</i>', 'S:σ2x': 'σ<sup>2</sup><sub><i>x</i></sub>', 'S:σ2y': 'σ<sup>2</sup><sub><i>y</i></sub>', 'S:σx': 'σ<sub><i>x</i></sub>', 'S:σy': 'σ<sub><i>y</i></sub>',
    'S:s2x': 's<sup>2</sup><sub><i>x</i></sub>', 'S:s2y': 's<sup>2</sup><sub><i>y</i></sub>', 'S:sx': 's<sub><i>x</i></sub>', 'S:sy': 's<sub><i>y</i></sub>', 'S:n': '<i>n</i>',
    'S:minx': 'min(<i>x</i>)', 'S:Q1': 'Q<sub>1</sub>', 'S:Med': 'Med', 'S:Q3': 'Q<sub>3</sub>', 'S:maxx': 'max(<i>x</i>)', 'S:miny': 'min(<i>y</i>)', 'S:maxy': 'max(<i>y</i>)',
    'S:a': '<i>a</i>', 'S:b': '<i>b</i>', 'S:c': '<i>c</i>', 'S:r': '<i>r</i>' };
  const POSTSTAT = { 'x̂': '<i>x̂</i>', 'ŷ': '<i>ŷ</i>', 'x̂1': '<i>x̂</i><sub>1</sub>', 'x̂2': '<i>x̂</i><sub>2</sub>' };
  const SHOW = { '×': '×', '÷': '÷', '+': '+', '-': '−', 'neg': '<span class="cw-neg">−</span>', 'ᴇ': '<span class="cw-e">ᴇ</span>', '²': '<sup>2</sup>', '⁻¹': '<sup>−1</sup>', '!': '!', '%': '%',
    'π': 'π', 'e': '<i>e</i>', 'i': '<i>i</i>', 'Ans': 'Ans', 'PreAns': 'PreAns', 'Ran#': 'Ran#', 'nCr': '<b class="cw-op">C</b>', 'nPr': '<b class="cw-op">P</b>', ',': ',',
    'dms': '°', 'deg': '<sup>o</sup>', 'rad': '<sup>r</sup>', 'gra': '<sup>g</sup>', '∠': '∠', '•': '•', ...Object.fromEntries(RELS.map(r => [r, r])),
    ...Object.fromEntries(VARS.map(v => [v, v.length === 1 && v === v.toLowerCase() ? `<i>${v}</i>` : v])), ...Object.fromEntries(VCT.map(v => [v, v])), ...STATK, ...POSTSTAT };
  const startsPrimary = (t) => t !== undefined && (/^[0-9.]$/.test(t) || ['π', 'e', 'i', 'Ans', 'PreAns', 'Ran#', ...VARS, ...VCT].includes(t) || t in STATK || t === '(' || (OPENERS.has(t) && t !== 'pow('));

  // =====================================================================================================
  // evaluation (Casio's order: functions, postfix, powers/roots, fractions, (−), nPr/nCr, omitted ×, × ÷, + −, relations)
  // =====================================================================================================
  function evaluate(tokens, env) {
    let i = 0;
    const peek = () => tokens[i], next = () => tokens[i++];
    const unit = env.angle || 'Degree';
    const toRad = (v) => unit === 'Degree' ? v * Math.PI / 180 : unit === 'Gradian' ? v * Math.PI / 200 : v;
    const fromRad = (v) => unit === 'Degree' ? v * 180 / Math.PI : unit === 'Gradian' ? v * 200 / Math.PI : v;
    const angIn = (v, from) => from === 'deg' ? (unit === 'Degree' ? v : unit === 'Radian' ? v * Math.PI / 180 : v * 200 / 180)
      : from === 'rad' ? fromRad(v) : (unit === 'Gradian' ? v : unit === 'Degree' ? v * 180 / 200 : v * Math.PI / 200);
    function group() { const v = rel(); return v; }
    function argList() { const a = [group()]; while (peek() === ',') { next(); a.push(group()); } if (peek() === ')') next(); return a; }
    function withX(body, xv) { const save = env.x; env.x = xv; try { return evaluate(body, { ...env }); } finally { env.x = save; } }
    function grab() {   // raw tokens of the current group, up to ',' or ')' at depth 0 (for Σ, Π, f and g)
      const start = i; let depth = 0;
      while (i < tokens.length) { const t = tokens[i]; if (OPENERS.has(t)) depth++; else if (t === ')') { if (!depth) break; depth--; } else if (t === ',' && !depth) break; i++; }
      return tokens.slice(start, i);
    }
    function number() {
      let s = tokens[i - 1]; while (/^[0-9.]$/.test(peek() ?? '')) s += next();
      if ((s.match(/\./g) || []).length > 1) ERR('Syntax ERROR');
      if (peek() === 'ᴇ') { next(); let es = ''; if (peek() === 'neg' || peek() === '-') { next(); es = '-'; } else if (peek() === '+') next(); while (/^[0-9]$/.test(peek() ?? '')) es += next(); s += 'e' + (es || '0'); }
      let v = Number(s); if (Number.isNaN(v)) ERR('Syntax ERROR');
      if (peek() === 'dms') {   // degrees°minutes°seconds°
        next(); let k = 1;
        for (let part = 0; part < 2 && /^[0-9.]$/.test(peek() ?? ''); part++) {
          const j = i; let m = ''; while (/^[0-9.]$/.test(peek() ?? '')) m += next();
          if (peek() !== 'dms') { i = j; break; } next(); k *= 60; v += Number(m) / k;
        }
      }
      return v;
    }
    function primary() {
      const t = next();
      if (t === undefined) ERR('Syntax ERROR');
      if (/^[0-9.]$/.test(t)) return number();
      if (t === 'π') return Math.PI;
      if (t === 'e') return Math.E;
      if (t === 'i') { if (!env.complex) ERR('Math ERROR'); return { re: 0, im: 1 }; }
      if (t === 'Ans') return env.ans ?? 0;
      if (t === 'PreAns') return env.preAns ?? 0;
      if (t === 'Ran#') return Math.floor(Math.random() * 1000) / 1000;
      if (VARS.includes(t)) return t === 'x' && env.x !== undefined ? env.x : (env.vars?.[t] ?? 0);
      if (VCT.includes(t)) { const v = env.vectors?.[t]; if (!v) ERR('Not Defined'); return { vec: [...v] }; }
      if (t in STATK) { const v = env.stat?.(t); if (v === undefined || Number.isNaN(v)) ERR('Math ERROR'); return v; }
      if (t === '(') { const v = rel(); if (peek() === ')') next(); return v; }
      if (t === 'sum(' || t === 'prod(') {
        const body = grab(); if (peek() === ',') next(); const a = real(group()); if (peek() === ',') next(); const b = real(group()); if (peek() === ')') next();
        if (!isInt(a) || !isInt(b) || b < a || b - a > 1e5) ERR('Math ERROR');
        let acc = t === 'sum(' ? 0 : 1; for (let k = a; k <= b; k++) { const v = withX(body, k); acc = t === 'sum(' ? A.add(acc, v) : A.mul(acc, v); } return acc;
      }
      if (t === 'f(' || t === 'g(') {
        const name = t[0], def = env.fns?.[name]; if (!def) ERR('Not Defined');
        if (env.depth > 4) ERR('Circular ERROR');
        const arg = group(); if (peek() === ')') next();
        const save = env.x; env.x = arg; try { return evaluate(def, { ...env, depth: (env.depth || 0) + 1 }); } finally { env.x = save; }
      }
      if (OPENERS.has(t)) {
        const a = argList();
        const r0 = () => real(a[0]);
        switch (t) {
          case 'frac(': return A.div(a[0], a[1]);
          case 'mixed(': { const w = r0(), n = real(a[1]), d = real(a[2]); if (d === 0) ERR('Math ERROR'); return w < 0 ? w - n / d : w + n / d; }
          case 'sqrt(': if (isC(a[0]) || a[0] < 0) { if (env.complex) return cpow(toC(a[0]), { re: 0.5, im: 0 }); ERR('Math ERROR'); } return Math.sqrt(a[0]);
          case 'root(': return A.pow(a[1], A.div(1, a[0]), env.complex);
          case 'logb(': { const b = real(a[0]), x = real(a[1]); if (b <= 0 || b === 1 || x <= 0) ERR('Math ERROR'); return Math.log(x) / Math.log(b); }
          case 'abs(': return abs(a[0]);
          case 'sin(': return tidy(Math.sin(toRad(r0())));
          case 'cos(': return tidy(Math.cos(toRad(r0())));
          case 'tan(': { const x = toRad(r0()); if (Math.abs(Math.cos(x)) < 1e-15) ERR('Math ERROR'); return tidy(Math.tan(x)); }
          case 'asin(': if (Math.abs(r0()) > 1) ERR('Math ERROR'); return fromRad(Math.asin(r0()));
          case 'acos(': if (Math.abs(r0()) > 1) ERR('Math ERROR'); return fromRad(Math.acos(r0()));
          case 'atan(': return fromRad(Math.atan(r0()));
          case 'sinh(': return Math.sinh(r0()); case 'cosh(': return Math.cosh(r0()); case 'tanh(': return Math.tanh(r0());
          case 'asinh(': return Math.asinh(r0());
          case 'acosh(': if (r0() < 1) ERR('Math ERROR'); return Math.acosh(r0());
          case 'atanh(': if (Math.abs(r0()) >= 1) ERR('Math ERROR'); return Math.atanh(r0());
          case 'log(': if (a.length > 1) { const b = real(a[0]), x = real(a[1]); if (b <= 0 || b === 1 || x <= 0) ERR('Math ERROR'); return Math.log(x) / Math.log(b); }
            if (r0() <= 0) ERR('Math ERROR'); return Math.log10(r0());
          case 'ln(': if (r0() <= 0) ERR('Math ERROR'); return Math.log(r0());
          case 'Rnd(': return Number(fmtDecimal(r0(), env.fmt, true));
          case 'GCD(': case 'LCM(': { const x = r0(), y = real(a[1]); if (!isInt(x) || !isInt(y) || a.length !== 2) ERR('Math ERROR'); const g = gcd(x, y); return t === 'GCD(' ? g : (g ? Math.abs(x * y) / g : 0); }
          case 'Pol(': { const x = r0(), y = real(a[1]); const r = Math.hypot(x, y), th = fromRad(Math.atan2(y, x)); env.setVar?.('x', r); env.setVar?.('y', th); env.pol = [['<i>r</i>', r], ['θ', th]]; return r; }
          case 'Rec(': { const r = r0(), th = toRad(real(a[1])); const x = tidy(r * Math.cos(th)), y = tidy(r * Math.sin(th)); env.setVar?.('x', x); env.setVar?.('y', y); env.pol = [['<i>x</i>', x], ['<i>y</i>', y]]; return x; }
          case 'RanInt#(': { const lo = r0(), hi = real(a[1]); if (!isInt(lo) || !isInt(hi) || lo > hi) ERR('Math ERROR'); return lo + Math.floor(Math.random() * (hi - lo + 1)); }
          case 'Conjg(': { const z = toC(a[0]); return mkC(z.re, -z.im); }
          case 'Arg(': { const z = toC(a[0]); return fromRad(Math.atan2(z.im, z.re)); }
          case 'ReP(': return toC(a[0]).re;
          case 'ImP(': return toC(a[0]).im;
          case 'Angle(': { const u = a[0], v = a[1]; if (!isV(u) || !isV(v) || u.vec.length !== v.vec.length) ERR('Math ERROR'); const d = u.vec.reduce((s, x, k) => s + x * v.vec[k], 0); const m = abs(u) * abs(v); if (!m) ERR('Math ERROR'); return fromRad(Math.acos(Math.max(-1, Math.min(1, d / m)))); }
          case 'UnitV(': { if (!isV(a[0])) ERR('Math ERROR'); const m = abs(a[0]); if (!m) ERR('Math ERROR'); return { vec: a[0].vec.map(x => x / m) }; }
          case 'pow(': ERR('Syntax ERROR');
        }
      }
      ERR('Syntax ERROR');
    }
    function postfix() {
      let v = primary();
      for (;;) {
        const t = peek();
        if (t === '²') { next(); v = A.mul(v, v); }
        else if (t === '⁻¹') { next(); v = A.div(1, v); }
        else if (t === '!') { next(); v = fact(real(v)); if (Number.isNaN(v)) ERR('Math ERROR'); }
        else if (t === '%') { next(); v = A.div(v, 100); }
        else if (t === 'deg' || t === 'rad' || t === 'gra') { next(); v = angIn(real(v), t); }
        else if (t === 'pow(') { next(); const e = group(); if (peek() === ')') next(); v = A.pow(v, e, env.complex); }
        else if (t in POSTSTAT) { next(); v = env.estimate?.(t, real(v)); if (v === undefined || Number.isNaN(v)) ERR('Math ERROR'); }
        else break;
      }
      return v;
    }
    function power() { return postfix(); }   // powers are the ▪^▭ template, handled with the other postfix keys
    function unary() { if (peek() === 'neg' || peek() === '-') { next(); return A.neg(unary()); } if (peek() === '+') { next(); return unary(); } return power(); }
    function perm() {
      let v = unary();
      while (peek() === 'nCr' || peek() === 'nPr') { const op = next(); const r = real(unary()); v = op === 'nCr' ? nCr(real(v), r) : nPr(real(v), r); if (Number.isNaN(v)) ERR('Math ERROR'); }
      return v;
    }
    function implicit() {   // multiplication with the sign left out binds tighter than × and ÷
      let v = perm();
      while (startsPrimary(peek())) v = A.mul(v, perm());
      return v;
    }
    function polar() {      // r∠θ (Complex app)
      let v = implicit();
      if (peek() === '∠') { next(); const th = toRad(real(implicit())); const r = real(v); v = mkC(r * Math.cos(th), r * Math.sin(th)); }
      return v;
    }
    function term() {
      let v = polar();
      for (;;) {
        const t = peek();
        if (t === '×') { next(); v = A.mul(v, polar()); }
        else if (t === '÷') { next(); v = A.div(v, polar()); }
        else if (t === '•') { next(); const w = polar(); if (!isV(v) || !isV(w) || v.vec.length !== w.vec.length) ERR('Math ERROR'); v = v.vec.reduce((s, x, k) => s + x * w.vec[k], 0); }
        else break;
      }
      return v;
    }
    function sum() {
      let v = term();
      for (;;) {
        if (peek() === '+') { next(); v = A.add(v, term()); }
        else if (peek() === '-') { next(); v = A.sub(v, term()); }
        else break;
      }
      return v;
    }
    function rel() {        // Verify: chains of = ≠ < ≤ > ≥
      let v = sum();
      if (!RELS.includes(peek())) return v;
      if (!env.verify) ERR('Syntax ERROR');
      let ok = true, dir = 0;
      while (RELS.includes(peek())) {
        const op = next(), w = sum();
        const d = op === '<' || op === '≤' ? -1 : op === '>' || op === '≥' ? 1 : 0;
        if (d && dir && d !== dir) ERR('Syntax ERROR'); if (d) dir = d;
        if ((isC(v) || isC(w)) && d) ERR('Math ERROR');
        const a = isC(v) ? v : toC(v), b = isC(w) ? w : toC(w), eq = Math.abs(a.re - b.re) < 1e-10 * Math.max(1, Math.abs(a.re)) && Math.abs(a.im - b.im) < 1e-10;
        const res = op === '=' ? eq : op === '≠' ? !eq : op === '<' ? a.re < b.re && !eq : op === '≤' ? a.re <= b.re || eq : op === '>' ? a.re > b.re && !eq : a.re >= b.re || eq;
        ok = ok && res; v = w;
      }
      env.verdict = ok; return ok ? 1 : 0;
    }
    const v = rel();
    if (i < tokens.length) ERR('Syntax ERROR');
    if (typeof v === 'number' && !Number.isFinite(v)) ERR('Math ERROR');
    if (typeof v === 'number' && Math.abs(v) >= 1e100) ERR('Math ERROR');
    if (isC(v) && !env.complex) ERR('Math ERROR');
    if (isV(v) && !env.vector) ERR('Math ERROR');
    return v;
  }

  // =====================================================================================================
  // number formatting: Norm 1/2, Fix, Sci, fractions, surds and multiples of π, digit separators
  // =====================================================================================================
  function ratio(v, maxDen = 10000) {    // best rational p/q (continued fraction)
    if (!Number.isFinite(v)) return null;
    const sgn = v < 0 ? -1 : 1; let x = Math.abs(v), h1 = 1, h0 = 0, k1 = 0, k0 = 1;
    for (let n = 0; n < 40; n++) {
      const a = Math.floor(x); [h1, h0] = [a * h1 + h0, h1]; [k1, k0] = [a * k1 + k0, k1];
      if (k1 > maxDen) return null;
      if (Math.abs(h1 / k1 - Math.abs(v)) < 1e-11 * Math.max(1, Math.abs(v))) return [sgn * h1, k1];
      const f = x - a; if (f < 1e-12) break; x = 1 / f;
    }
    return Math.abs(h1 / k1 - Math.abs(v)) < 1e-11 * Math.max(1, Math.abs(v)) && k1 <= maxDen ? [sgn * h1, k1] : null;
  }
  const SQF = []; for (let n = 2; n <= 200; n++) { let ok = true; for (let d = 2; d * d <= n; d++) if (n % (d * d) === 0) { ok = false; break; } if (ok) SQF.push(n); }
  const fracH = (top, bot) => `<span class="cw-f"><span>${top}</span><span>${bot}</span></span>`;
  const digitsOk = (p, q) => String(Math.abs(p)).length + String(q).length <= 10;
  // exact forms as html: fraction, mixed fraction, a√b/c, (p±q√b)/c, aπ/b; null when there isn't a neat one
  function exactForm(v, toks, mixed) {
    if (v === 0 || !Number.isFinite(v) || Math.abs(v) >= 1e10) return null;
    const has = (re) => toks.some(t => re.test(t));
    const r = ratio(v, 99999);
    if (r && digitsOk(r[0], r[1])) {
      if (r[1] === 1) return null;
      if (mixed && Math.abs(r[0]) > r[1]) { const w = Math.trunc(r[0] / r[1]), n = Math.abs(r[0]) % r[1]; return `${w < 0 ? '−' : ''}${Math.abs(w)}${fracH(n, r[1])}`; }
      return (r[0] < 0 ? '−' : '') + fracH(Math.abs(r[0]), r[1]);
    }
    if (has(/^(π|asin\(|acos\(|atan\(|Arg\()$/)) {
      const rp = ratio(v / Math.PI, 999);
      if (rp) { const [p, q] = rp, top = Math.abs(p) === 1 ? 'π' : Math.abs(p) + 'π'; return (p < 0 ? '−' : '') + (q === 1 ? top : fracH(top, q)); }
    }
    if (has(/^(sqrt\(|root\(|pow\(|sin\(|cos\(|tan\(|frac\()$/) || toks.includes('²')) {
      for (const n of SQF) {
        const rs = ratio(v / Math.sqrt(n), 999);
        if (rs) { const [p, q] = rs, top = (Math.abs(p) === 1 ? '' : Math.abs(p)) + `√<span class="cw-ol">${n}</span>`; return (p < 0 ? '−' : '') + (q === 1 ? top : fracH(top, q)); }
      }
      for (const n of SQF.slice(0, 40)) for (let c = 1; c <= 60; c++) for (let q = -30; q <= 30; q++) {
        if (!q) continue;
        const p = v * c - q * Math.sqrt(n);
        if (Math.abs(p - Math.round(p)) < 1e-9 * Math.max(1, Math.abs(p)) && Math.round(p) !== 0) {
          const P = Math.round(p); let g = gcd(gcd(P, q), c); const Pn = P / g, qn = q / g, cn = c / g;
          const sur = (Math.abs(qn) === 1 ? '' : Math.abs(qn)) + `√<span class="cw-ol">${n}</span>`;
          const top = `${Pn}${qn < 0 ? '−' : '+'}${sur}`.replace(/^-/, '−');
          return cn === 1 ? top : fracH(top, cn);
        }
      }
    }
    return null;
  }
  function group3(int, sep) { return int.replace(/\B(?=(\d{3})+(?!\d))/g, sep); }
  // decimal display per Number Format; raw=true gives a plain JS number string (for Rnd)
  function fmtDecimal(v, F, raw) {
    F = F || { type: 'Norm', n: 2 };
    if (v === 0) return '0';
    const a = Math.abs(v);
    const sci = (sig) => { let [m, e] = v.toExponential(Math.max(0, sig - 1)).split('e'); return raw ? `${m}e${e}` : [F.type === 'Sci' ? m : trimZ(m), Number(e)]; };
    let out;
    if (F.type === 'Fix') { if (a >= 1e10) out = sci(10); else out = v.toFixed(F.n); }
    else if (F.type === 'Sci') out = sci(F.n);
    else { const lo = F.n === 1 ? 1e-2 : 1e-9; out = (a >= 1e10 || a < lo) ? sci(10) : trimZ(String(Number(v.toPrecision(10)))); }
    if (raw) return Array.isArray(out) ? `${out[0]}e${out[1]}` : out;
    return out;
  }
  const trimZ = (s) => s.includes('.') && !s.includes('e') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  function decHTML(v, S) {
    const F = S.fmt, out = fmtDecimal(v, F);
    const mark = S.dmark === 'Comma' ? ',' : '.', sep = S.sep ? (mark === ',' ? '.' : ',') : '';
    const num = (s) => { s = String(s); const neg = s.startsWith('-'); s = s.replace('-', ''); let [ip, fp] = s.split('.'); if (sep) ip = group3(ip, sep); return (neg ? '−' : '') + ip + (fp !== undefined ? mark + fp : ''); };
    if (Array.isArray(out)) return `${num(out[0])}<span class="cw-x10">×10<sup>${String(out[1]).replace('-', '−')}</sup></span>`;
    return num(out);
  }
  function engHTML(v, S) {
    if (v === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(v))); e -= ((e % 3) + 3) % 3;
    const m = Number((v / Math.pow(10, e)).toPrecision(10));
    return `${decHTML(m, { ...S, fmt: { type: 'Norm', n: 2 } })}<span class="cw-x10">×10<sup>${String(e).replace('-', '−')}</sup></span>`;
  }
  function dmsHTML(v) {
    const neg = v < 0; let a = Math.abs(v); let d = Math.floor(a), m = Math.floor((a - d) * 60), s = ((a - d) * 60 - m) * 60;
    s = Number(s.toPrecision(10)); if (s >= 60 - 1e-9) { s = 0; m++; } if (m >= 60) { m = 0; d++; }
    return `${neg ? '−' : ''}${d}°${m}°${trimZ(String(Number(s.toFixed(Math.max(0, 8 - String(d).length)))))}°`;
  }
  function primeHTML(n) {
    if (!isInt(n) || n < 2 || n >= 1e10) return null;
    const f = []; let m = n;
    for (let p = 2; p * p <= m && p < 1000; p++) { let k = 0; while (m % p === 0) { m /= p; k++; } if (k) f.push(k > 1 ? `${p}<sup>${k}</sup>` : `${p}`); }
    if (m > 1) f.push(m < 1e6 ? `${m}` : `(${m})`);
    return f.join('×');
  }
  function recurHTML(v) {     // e.g. 0.1(6) shown with a bar
    const r = ratio(v, 99999); if (!r || r[1] === 1) return null;
    let [p, q] = r; const neg = p < 0; p = Math.abs(p); let q2 = q; while (q2 % 2 === 0) q2 /= 2; while (q2 % 5 === 0) q2 /= 5; if (q2 === 1) return null;
    const ip = Math.floor(p / q); let rem = p % q; const seen = new Map(); let digits = '';
    while (rem && !seen.has(rem) && digits.length < 40) { seen.set(rem, digits.length); rem *= 10; digits += Math.floor(rem / q); rem %= q; }
    if (!rem || !seen.has(rem)) return null;
    const k = seen.get(rem); if (digits.length > 12) return null;
    return `${neg ? '−' : ''}${ip}.${digits.slice(0, k)}<span class="cw-rec">${digits.slice(k)}</span>`;
  }

  // =====================================================================================================
  // drawing input naturally (MathI) or on one line (LineI)
  // =====================================================================================================
  function renderTokens(tokens, cursor, line) {
    const t = tokens.slice(0, cursor).concat(['|'], tokens.slice(cursor));
    let i = 0;
    const group = () => { let html = '', any = false; while (i < t.length && t[i] !== ',' && t[i] !== ')') { const [h, real] = item(); html += h; if (real) any = true; } return { html, any }; };
    const box = (g) => g.any ? g.html : `<span class="cw-box">${g.html}</span>`;
    const close = () => { if (t[i] === ')') { i++; return true; } return false; };
    const sep = () => { if (t[i] === ',') { i++; return true; } return false; };
    function item() {
      const k = t[i++];
      if (k === '|') return ['<span class="cw-caret"></span>', false];
      if (line) {   // LineI: everything on one line, like the calculator's linear format
        if (k === 'frac(') { const a = group(); sep(); const b = group(); close(); return [`${a.html}⌟${b.html}`, true]; }
        if (k === 'mixed(') { const w = group(); sep(); const a = group(); sep(); const b = group(); close(); return [`${w.html}⌟${a.html}⌟${b.html}`, true]; }
        if (k === 'sqrt(') { const a = group(); const s = close(); return [`√(${a.html}${s ? ')' : ''}`, true]; }
        if (k === 'root(') { const n = group(); sep(); const a = group(); const s = close(); return [`${n.html}<span class="cw-xr">x</span>√(${a.html}${s ? ')' : ''}`, true]; }
        if (k === 'pow(') { const a = group(); const s = close(); return [`^(${a.html}${s ? ')' : ''}`, true]; }
        if (k === 'logb(') { const b = group(); sep(); const a = group(); const s = close(); return [`log(${b.html},${a.html}${s ? ')' : ''}`, true]; }
        if (k === 'abs(') { const a = group(); const s = close(); return [`Abs(${a.html}${s ? ')' : ''}`, true]; }
        if (k === 'sum(' || k === 'prod(') { const a = group(); sep(); const b = group(); sep(); const c = group(); const s = close(); return [`${k === 'sum(' ? 'Σ' : 'Π'}(${a.html},${b.html},${c.html}${s ? ')' : ''}`, true]; }
      } else {
        if (k === 'frac(') { const a = group(); sep(); const b = group(); close(); return [fracH(box(a), box(b)), true]; }
        if (k === 'mixed(') { const w = group(); sep(); const a = group(); sep(); const b = group(); close(); return [`${box(w)}${fracH(box(a), box(b))}`, true]; }
        if (k === 'sqrt(') { const a = group(); close(); return [`<span class="cw-rt">√<span class="cw-ol">${box(a)}</span></span>`, true]; }
        if (k === 'root(') { const n = group(); sep(); const a = group(); close(); return [`<span class="cw-rt"><sup class="cw-ri">${box(n)}</sup>√<span class="cw-ol">${box(a)}</span></span>`, true]; }
        if (k === 'pow(') { const a = group(); close(); return [`<sup>${box(a)}</sup>`, true]; }
        if (k === 'logb(') { const b = group(); sep(); const a = group(); close(); return [`log<sub>${box(b)}</sub>(${box(a)})`, true]; }
        if (k === 'abs(') { const a = group(); close(); return [`|${box(a)}|`, true]; }
        if (k === 'sum(' || k === 'prod(') {
          const a = group(); sep(); const b = group(); sep(); const c = group(); close();
          return [`<span class="cw-big"><span class="cw-bt">${box(c)}</span><span class="cw-bs">${k === 'sum(' ? 'Σ' : 'Π'}</span><span class="cw-bb"><i>x</i>=${box(b)}</span></span>(${box(a)})`, true];
        }
      }
      if (FNAME[k] || k === '(') { const a = group(); let rest = ''; while (t[i] === ',') { i++; rest += ',' + group().html; } const shut = close(); return [`${FNAME[k] || ''}(${a.html}${rest}${shut ? ')' : ''}`, true]; }
      if (k === ')') return [')', true];
      return [SHOW[k] ?? k, true];
    }
    let out = '';
    while (i < t.length) { if (t[i] === ')' || t[i] === ',') { out += t[i] === ')' ? ')' : ','; i++; continue; } out += item()[0]; }
    return out;
  }

  // =====================================================================================================
  // state
  // =====================================================================================================
  const LS = 'tb_cw_v1';
  const DEF_SET = { io: 'MathI/MathO', angle: 'Degree', fmt: { type: 'Norm', n: 2 }, frac: 'Improp Fraction', cplx: 'a+bi', dmark: 'Dot', sep: true, contrast: 5, apo: '10 Min.', font: 'Normal Font', qr: 'Version 11' };
  const st = {
    on: true, shift: false, app: 'home', homeIdx: 0, menu: null, screen: null,
    set: { ...DEF_SET }, vars: Object.fromEntries(VARS.map(v => [v, 0])), ans: 0, preAns: 0, fns: { f: null, g: null },
    verify: false, insert: true,
  };
  try { const s = JSON.parse(localStorage.getItem(LS) || 'null'); if (s) { Object.assign(st.set, s.set || {}); Object.assign(st.vars, s.vars || {}); st.ans = s.ans ?? 0; st.fns = s.fns || st.fns; st.vectors = s.vectors; } } catch { /* fresh */ }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ set: st.set, vars: st.vars, ans: isV(st.ans) || isC(st.ans) ? 0 : st.ans, fns: st.fns, vectors: st.vectors })); } catch { /* private mode */ } };
  st.vectors = st.vectors || { VctA: null, VctB: null, VctC: null, VctD: null, VctAns: null };
  const lineIn = () => st.set.io.startsWith('LineI');
  const decOut = () => st.set.io.endsWith('DecimalO');

  // one editing line (Calculate, Complex, Vector, Statistics Calc, defining f/g, entering a value)
  const newEd = () => ({ tokens: [], cursor: 0, result: null, error: null, view: null, hist: [], hi: -1, undo: [] });
  const apps = {
    calc: { ed: newEd() }, complex: { ed: newEd() }, vector: { ed: newEd() },
    stat: { mode: null, rows: [], freq: false, cur: [0, 0], reg: 'y=a+bx', ed: newEd(), view: 'menu' },
    dist: { type: null, method: null, view: 'menu', params: {}, list: [], cur: 0, ed: newEd(), result: null },
    table: { type: 'f(x)/g(x)', range: { Start: 1, End: 5, Step: 1 }, view: 'table', rows: null, cur: [0, 0], ed: newEd() },
  };
  const APPS = [['calc', 'Calculate'], ['stat', 'Statistics'], ['dist', 'Distribution'], ['table', 'Table'], ['complex', 'Complex'], ['vector', 'Vector']];

  // =====================================================================================================
  // the keyboard: exactly the fx-8200 AU, row by row. [label, action, shift label, shift action]
  // =====================================================================================================
  const I = {
    home: '<svg viewBox="0 0 20 20"><path d="M3 10 10 4l7 6M5 9v7h10V9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    settings: '<svg viewBox="0 0 20 20"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="6" r="1.8" fill="currentColor"/><circle cx="13" cy="10" r="1.8" fill="currentColor"/><circle cx="8" cy="14" r="1.8" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 20 20"><path d="M7 5 3.5 8.5 7 12M4 8.5h8a4 4 0 0 1 0 8H9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    variable: '<svg viewBox="0 0 22 20"><path d="M2 6h8M7 3l3 3-3 3M10 14H2M5 11l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="4" width="8.5" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><text x="16.2" y="13.5" text-anchor="middle" font-size="8.5" font-style="italic" fill="currentColor" font-family="serif">x</text></svg>',
    catalog: '<svg viewBox="0 0 20 20"><path d="M10 6c-2-1.5-4.5-2-7-1.5V15c2.5-.5 5 0 7 1.5 2-1.5 4.5-2 7-1.5V4.5C14.5 4 12 4.5 10 6zm0 0v10.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    tools: '<svg viewBox="0 0 20 20"><circle cx="5" cy="10" r="1.8" fill="currentColor"/><circle cx="10" cy="10" r="1.8" fill="currentColor"/><circle cx="15" cy="10" r="1.8" fill="currentColor"/></svg>',
    del: '<svg viewBox="0 0 24 18"><path d="M8 2h13v14H8L2 9z" fill="currentColor"/><path d="m11 6 6 6m0-6-6 6" stroke="#e8e9ec" stroke-width="2" stroke-linecap="round"/></svg>',
    format: '<span class="cw-fmt"><svg viewBox="0 0 30 26"><path d="M5 9a11 9 0 0 1 20-1M25 17a11 9 0 0 1-20 1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m22 4 3 4-4.5 1M8 22l-3-4 4.5-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><b>FORMAT</b></span>',
    sq: '<span class="cw-sqk">▪</span>',
  };
  const box = '<span class="cw-kbox"></span>';
  const SCI = [
    [['<i>x</i>', 'x', 'QR', 'qr'], [`<span class="cw-kf">${box}<i></i>${box}</span>`, 'frac(', `<span class="cw-lbl-f">▪${'<span class="cw-kf sm">' + box + '<i></i>' + box + '</span>'}</span>`, 'mixed('],
      [`<span class="cw-krt">√${box}</span>`, 'sqrt(', `<sup>▪</sup>√${box}`, 'root('], [`${I.sq}<sup>${box}</sup>`, 'pow(', '▪<sup>−1</sup>', '⁻¹'],
      [`${I.sq}<sup>2</sup>`, '²', 'log', 'log('], [`log<sub>${I.sq}</sub>${box}`, 'logb(', 'ln', 'ln(']],
    [['Ans', 'Ans', 'PreAns', 'PreAns'], ['sin', 'sin(', 'sin<sup>−1</sup>', 'asin('], ['cos', 'cos(', 'cos<sup>−1</sup>', 'acos('], ['tan', 'tan(', 'tan<sup>−1</sup>', 'atan('],
      ['(', '(', '=', '='], [')', ')', ',', ',']],
  ];
  const NUM = [
    [['7', '7', 'π', 'π'], ['8', '8', '<i>e</i>', 'e'], ['9', '9', '<i>i</i>', 'i'], [I.del, 'del', 'INS', 'ins'], ['AC', 'ac', 'OFF', 'off']],
    [['4', '4', 'A', 'A'], ['5', '5', 'B', 'B'], ['6', '6', 'C', 'C'], ['×', '×'], ['÷', '÷']],
    [['1', '1', 'D', 'D'], ['2', '2', 'E', 'E'], ['3', '3', 'F', 'F'], ['+', '+', '°′″', 'dms'], ['−', '-', '(−)', 'neg']],
    [['0', '0', '<i>x</i>', 'x'], ['.', '.', '<i>y</i>', 'y'], ['×10<sup>▪</sup>', 'ᴇ', '<i>z</i>', 'z'], [I.format, 'format'], ['EXE', 'exe', '≈', 'approx']],
  ];
  const k = (lbl, a, sl, sa, cls = '') => `<div class="cw-kw ${cls}"><span class="cw-sh">${sl || ''}</span><button type="button" class="cw-k" data-a="${a}" data-s="${sa || ''}" aria-label="${a}"><span class="cw-kl">${lbl}</span></button></div>`;
  function keysHTML() {
    const nav = `<div class="cw-nav">
      <div class="cw-nl"><div class="cw-small"><span class="cw-cap">ON</span><button type="button" class="cw-k cw-on" data-a="on" aria-label="ON"></button></div>
        <div class="cw-small"><span class="cw-cap">HOME</span><button type="button" class="cw-k cw-dk" data-a="home" aria-label="HOME">${I.home}</button></div>
        <div class="cw-small"><span class="cw-cap">SETTINGS</span><button type="button" class="cw-k cw-dk" data-a="settings" aria-label="SETTINGS">${I.settings}</button></div>
        <div class="cw-small"><span class="cw-cap"></span><button type="button" class="cw-k cw-dk" data-a="back" aria-label="Back">${I.back}</button></div></div>
      <div class="cw-pad"><button type="button" class="cw-k cw-pu" data-a="up" aria-label="Up">⌃</button><button type="button" class="cw-k cw-pl" data-a="left" aria-label="Left">‹</button>
        <button type="button" class="cw-k cw-ok" data-a="ok" aria-label="OK">OK</button><button type="button" class="cw-k cw-pr" data-a="right" aria-label="Right">›</button>
        <button type="button" class="cw-k cw-pd" data-a="down" aria-label="Down">⌄</button></div>
      <div class="cw-pg"><button type="button" class="cw-k" data-a="pgup" aria-label="Page up">⌃<br>⌃</button><button type="button" class="cw-k" data-a="pgdn" aria-label="Page down">⌄<br>⌄</button></div>
    </div>
    <div class="cw-row cw-fn">
      ${k('', 'shift', '', '', 'cw-shiftw').replace('class="cw-sh"></span>', 'class="cw-sh cw-cap blue">SHIFT</span>')}
      ${k(I.variable, 'variable', '', '', 'cw-dkw').replace('class="cw-sh"></span>', 'class="cw-sh cw-cap">VARIABLE</span>')}
      ${k('f<span class="cw-fx">(<i>x</i>)</span>', 'function', '', '', 'cw-dkw').replace('class="cw-sh"></span>', 'class="cw-sh cw-cap">FUNCTION</span>')}
      <div class="cw-kw cw-gap"></div>
      ${k(I.catalog, 'catalog', '', '', 'cw-dkw').replace('class="cw-sh"></span>', 'class="cw-sh cw-cap">CATALOG</span>')}
      ${k(I.tools, 'tools', '', '', 'cw-dkw').replace('class="cw-sh"></span>', 'class="cw-sh cw-cap">TOOLS</span>')}
    </div>`;
    const sci = SCI.map(r => `<div class="cw-row cw-sci">${r.map(([l, a, sl, sa]) => k(l, a, sl, sa)).join('')}</div>`).join('');
    const num = NUM.map(r => `<div class="cw-row cw-num">${r.map(([l, a, sl, sa]) => k(l, a, sl, sa, a === 'del' || a === 'ac' ? 'red' : '')).join('')}</div>`).join('');
    return nav + sci + num;
  }

  // =====================================================================================================
  // panel
  // =====================================================================================================
  let panel = null;
  function open() { if (!panel) build(); panel.hidden = false; document.body.classList.add('calc-open'); draw(); }
  function close() { if (panel) panel.hidden = true; document.body.classList.remove('calc-open'); }
  function toggle() { panel && !panel.hidden ? close() : open(); }
  function build() {
    panel = document.createElement('div'); panel.className = 'cw'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Calculator');
    panel.innerHTML = `
      <div class="cw-top"><div class="cw-brand"><b>CASIO</b><span>fx-8200 AU</span></div><button type="button" class="cw-x" aria-label="Close calculator">×</button></div>
      <div class="cw-lcdwrap"><div class="cw-lcd"><div class="cw-status"></div><div class="cw-scr"></div></div><div class="cw-wiz">CLASSWIZ</div></div>
      <div class="cw-keys">${keysHTML()}</div>`;
    document.body.appendChild(panel);
    panel.querySelector('.cw-x').onclick = close;
    panel.querySelector('.cw-keys').addEventListener('click', (ev) => {
      const b = ev.target.closest('.cw-k'); if (!b) return;
      b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
      press(st.shift && b.dataset.s ? b.dataset.s : b.dataset.a);
    });
    const top = panel.querySelector('.cw-top'); let drag = null;
    top.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; const r = panel.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; top.setPointerCapture(e.pointerId); });
    top.addEventListener('pointermove', (e) => { if (!drag) return; panel.style.left = Math.max(0, Math.min(innerWidth - 80, e.clientX - drag.dx)) + 'px'; panel.style.top = Math.max(0, Math.min(innerHeight - 80, e.clientY - drag.dy)) + 'px'; panel.style.right = 'auto'; panel.style.bottom = 'auto'; });
    top.addEventListener('pointerup', () => { drag = null; });
    document.addEventListener('keydown', (e) => {   // the computer keyboard works too while the calculator is open
      if (!panel || panel.hidden || e.metaKey || e.ctrlKey || e.target.closest('input, textarea, select')) return;
      const map = { Enter: 'exe', '=': 'exe', Backspace: 'del', Delete: 'del', Escape: 'ac', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', '*': '×', '/': '÷', '+': '+', '-': '-', '(': '(', ')': ')', '.': '.', '^': 'pow(', '!': '!', ',': ',', '%': '%', x: 'x', p: 'π' };
      const a = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
      if (a) { e.preventDefault(); press(a); }
    });
  }

  // =====================================================================================================
  // menus: a highlighted list, D-pad to move, OK/EXE/right to open, back/left to go up, AC to close
  // =====================================================================================================
  // item: { label, sub: () => items | menu, act: () => void, radio: bool, on: bool, note }
  function menu(title, items, opts = {}) { st.menu = { title, items: typeof items === 'function' ? items : () => items, idx: opts.idx || 0, top: 0, parent: st.menu, ...opts }; }
  const MENU_ROWS = 4;
  function menuKey(a) {
    const m = st.menu, items = m.items();
    if (a === 'up') m.idx = (m.idx - 1 + items.length) % items.length;
    else if (a === 'down') m.idx = (m.idx + 1) % items.length;
    else if (a === 'pgup') m.idx = Math.max(0, m.idx - MENU_ROWS);
    else if (a === 'pgdn') m.idx = Math.min(items.length - 1, m.idx + MENU_ROWS);
    else if (a === 'back' || a === 'left') { st.menu = m.parent || null; if (!st.menu && m.onClose) m.onClose(); }
    else if (a === 'ac') { st.menu = null; if (m.onClose) m.onClose(); }
    else if (a === 'ok' || a === 'exe' || a === 'right') {
      const it = items[m.idx]; if (!it || it.disabled) return;
      if (a === 'right' && !it.sub) return;
      if (it.sub) { const r = it.sub(); if (Array.isArray(r)) menu(it.label, r); return; }
      if (it.act) { const keep = it.act(); if (keep !== true) st.menu = it.radio && m.title !== 'TOOLS' ? (m.parent || null) : null; }   // a setting goes back up a level; anything else closes the menu
    }
    else if (/^[0-9]$/.test(a) && m.digits) m.digits(a);
    if (st.menu) { const mm = st.menu; if (mm.idx < mm.top) mm.top = mm.idx; if (mm.idx >= mm.top + MENU_ROWS) mm.top = mm.idx - MENU_ROWS + 1; }
  }
  function drawMenu() {
    const m = st.menu, items = m.items();
    if (m.idx >= items.length) m.idx = 0;
    if (m.idx < m.top) m.top = m.idx; if (m.idx >= m.top + MENU_ROWS) m.top = m.idx - MENU_ROWS + 1;
    const view = items.slice(m.top, m.top + MENU_ROWS);
    const bar = items.length > MENU_ROWS ? `<div class="cw-sb"><i style="top:${100 * m.top / items.length}%;height:${100 * MENU_ROWS / items.length}%"></i></div>` : '';
    return `<div class="cw-menu">${view.map((it, k) => `<div class="cw-mi${m.top + k === m.idx ? ' sel' : ''}${it.disabled ? ' dis' : ''}">${it.radio ? `<span class="cw-rd${it.on ? ' on' : ''}"></span>` : ''}<span class="cw-ml">${it.label}</span>${it.note ? `<span class="cw-mn">${it.note}</span>` : ''}${it.sub ? '<span class="cw-arr">▶</span>' : ''}</div>`).join('')}${bar}</div>`;
  }
  const radios = (opts, cur, set) => opts.map(o => ({ label: o, radio: true, on: cur() === o, act: () => { set(o); save(); } }));

  // SETTINGS
  function settingsMenu() {
    const S = st.set;
    const fmtName = () => S.fmt.type === 'Norm' ? `Norm ${S.fmt.n}` : `${S.fmt.type} ${S.fmt.n}`;
    menu('SETTINGS', [
      { label: 'Calc Settings', sub: () => [
        { label: 'Input/Output', sub: () => radios(['MathI/MathO', 'MathI/DecimalO', 'LineI/LineO', 'LineI/DecimalO'], () => S.io, (v) => { const fam = S.io.slice(0, 5) !== v.slice(0, 5); S.io = v; if (fam) { st.fns = { f: null, g: null }; } clearHistory(); }) },
        { label: 'Angle Unit', sub: () => radios(['Degree', 'Radian', 'Gradian'], () => S.angle, (v) => { S.angle = v; }) },
        { label: 'Number Format', sub: () => [
          { label: 'Fix', radio: true, on: S.fmt.type === 'Fix', sub: () => Array.from({ length: 10 }, (_, n) => ({ label: `Fix ${n}`, radio: true, on: S.fmt.type === 'Fix' && S.fmt.n === n, act: () => { S.fmt = { type: 'Fix', n }; save(); st.menu = null; } })) },
          { label: 'Sci', radio: true, on: S.fmt.type === 'Sci', sub: () => Array.from({ length: 10 }, (_, j) => j + 1).map(n => ({ label: `Sci ${n}`, radio: true, on: S.fmt.type === 'Sci' && S.fmt.n === n, act: () => { S.fmt = { type: 'Sci', n }; save(); st.menu = null; } })) },
          { label: 'Norm 1', radio: true, on: S.fmt.type === 'Norm' && S.fmt.n === 1, act: () => { S.fmt = { type: 'Norm', n: 1 }; save(); } },
          { label: 'Norm 2', radio: true, on: S.fmt.type === 'Norm' && S.fmt.n === 2, act: () => { S.fmt = { type: 'Norm', n: 2 }; save(); } },
        ], note: fmtName() },
        { label: 'Fraction Result', sub: () => radios(['Mixed Fraction', 'Improp Fraction'], () => S.frac, (v) => { S.frac = v; }) },
        { label: 'Complex Result', sub: () => radios(['a+bi', 'r∠θ'], () => S.cplx, (v) => { S.cplx = v; }) },
        { label: 'Decimal Mark', sub: () => radios(['Dot', 'Comma'], () => S.dmark, (v) => { S.dmark = v; }) },
        { label: 'Digit Separator', sub: () => radios(['On', 'Off'], () => S.sep ? 'On' : 'Off', (v) => { S.sep = v === 'On'; }) },
      ] },
      { label: 'System Settings', sub: () => [
        { label: 'Contrast', act: () => { st.screen = { kind: 'contrast' }; } },
        { label: 'Auto Power Off', sub: () => radios(['10 Min.', '60 Min.'], () => S.apo, (v) => { S.apo = v; }) },
        { label: 'MultiLine Font', sub: () => radios(['Normal Font', 'Small Font'], () => S.font, (v) => { S.font = v; }) },
        { label: 'QR Code', sub: () => radios(['Version 3', 'Version 11'], () => S.qr, (v) => { S.qr = v; }) },
      ] },
      { label: 'Reset', sub: () => [
        { label: 'Settings &amp; Data', act: () => confirmBox('Reset Settings &amp; Data?', () => { st.set = { ...DEF_SET, contrast: S.contrast, apo: S.apo }; st.fns = { f: null, g: null }; clearHistory(); save(); }) },
        { label: 'Variable Memory', act: () => confirmBox('Reset Variable Memory?', () => { st.vars = Object.fromEntries(VARS.map(v => [v, 0])); st.ans = 0; st.preAns = 0; save(); }) },
        { label: 'Initialize All', act: () => confirmBox('Initialize All?', () => { st.set = { ...DEF_SET }; st.vars = Object.fromEntries(VARS.map(v => [v, 0])); st.ans = 0; st.preAns = 0; st.fns = { f: null, g: null }; st.vectors = { VctA: null, VctB: null, VctC: null, VctD: null, VctAns: null }; clearHistory(); save(); goHome(); }) },
      ] },
      { label: 'Get Started', act: () => { st.screen = { kind: 'msg', title: 'Get Started', lines: ['Scan the QR code on a real', 'fx-8200 AU, or visit', 'support.casio.com'] }; } },
    ]);
  }
  function confirmBox(q, yes) { menu(q, [{ label: 'Yes', act: () => { yes(); } }, { label: 'No', act: () => {} }], { confirm: true }); return true; }

  // CATALOG: the categories for the current app and screen
  const ins = (tok, after) => () => { insertTok(tok); if (after) after(); };
  function catalogMenu() {
    const cats = [];
    if (st.app === 'complex') cats.push({ label: 'Complex', sub: () => [
      { label: '<i>i</i>', act: ins('i') }, { label: '∠', act: ins('∠') }, { label: 'Conjugate', act: ins('Conjg(') }, { label: 'Argument', act: ins('Arg(') },
      { label: 'Real Part', act: ins('ReP(') }, { label: 'Imaginary Part', act: ins('ImP(') }] });
    if (st.app === 'vector') cats.push({ label: 'Vector', sub: () => [
      ...VCT.map(v => ({ label: v, act: ins(v) })),
      { label: 'Vector Calc', sub: () => [{ label: 'Dot Product', act: ins('•') }, { label: 'Cross Product', act: ins('×') }, { label: 'Angle', act: ins('Angle(') }, { label: 'Unit Vector', act: ins('UnitV(') }] }] });
    if (st.app === 'stat' && apps.stat.view === 'calc') cats.push({ label: 'Statistics', sub: statCatalog });
    if (st.app !== 'vector' && st.app !== 'complex') cats.push({ label: 'Func Analysis', sub: () => [
      { label: 'Summation(Σ)', act: ins('sum(') }, { label: 'Product(Π)', act: ins('prod(') }, { label: 'Logarithm(log<sub><i>a</i></sub><i>b</i>)', act: ins('logb(') },
      { label: 'Logarithm(log)', act: ins('log(') }, { label: 'Natural Logarithm', act: ins('ln(') }] });
    if (st.app !== 'vector') cats.push({ label: 'Probability', sub: () => [
      { label: 'Percentage(%)', act: ins('%') }, { label: 'Factorial(!)', act: ins('!') }, { label: 'Permutation(P)', act: ins('nPr') },
      { label: 'Combination(C)', act: ins('nCr') }, { label: 'Random Number', act: ins('Ran#') }, { label: 'Random Integer', act: ins('RanInt#(') }] });
    cats.push({ label: 'Numeric Calc', sub: () => [
      ...(st.app === 'vector' || st.app === 'complex' ? [] : [{ label: 'GCD', act: ins('GCD(') }, { label: 'LCM', act: ins('LCM(') }]),
      { label: 'Absolute Value', act: ins('abs(') },
      ...(st.app === 'vector' || st.app === 'complex' ? [] : [{ label: 'Round Off', act: ins('Rnd(') }])] });
    if (st.app !== 'vector') cats.push({ label: 'Angle/Coord/Sexa', sub: () => [
      { label: 'Degrees', act: ins('deg') }, { label: 'Radians', act: ins('rad') }, { label: 'Gradians', act: ins('gra') },
      ...(st.app === 'complex' ? [] : [{ label: 'Rect to Polar', act: ins('Pol(') }, { label: 'Polar to Rect', act: ins('Rec(') }]),
      { label: 'Degs Mins Secs', act: ins('dms') }] });
    if (st.app !== 'vector' && st.app !== 'complex') cats.push({ label: 'Hyperbolic/Trig', sub: () => [
      ...['sinh(', 'cosh(', 'tanh(', 'asinh(', 'acosh(', 'atanh(', 'sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan('].map(f => ({ label: FNAME[f], act: ins(f) }))] });
    cats.push({ label: 'Other', sub: () => [
      { label: 'Ans', act: ins('Ans') }, ...(st.app === 'calc' ? [{ label: 'PreAns', act: ins('PreAns') }] : []), { label: 'π', act: ins('π') }, { label: '<i>e</i>', act: ins('e') },
      { label: '√(', act: ins('sqrt(') }, { label: '<sup><i>x</i></sup>√(', act: ins('root(') }, { label: '<sup>−1</sup>', act: ins('⁻¹') }, { label: '<sup>2</sup>', act: ins('²') },
      { label: '^(', act: ins('pow(') }, { label: '(−)', act: ins('neg') }, { label: ',', act: ins(',') }, { label: '(', act: ins('(') }, { label: ')', act: ins(')') }] });
    if (st.verify) cats.push({ label: 'Verify', sub: () => RELS.map(r => ({ label: r, act: ins(r) })) });
    menu('CATALOG', cats);
  }

  // TOOLS
  function toolsMenu() {
    if (st.app === 'stat') return statTools();
    if (st.app === 'table') return tableTools();
    if (st.app === 'dist') return;
    const ed = curEd(); if (!ed) return;
    const items = [{ label: 'Undo', act: () => { const u = ed.undo.pop(); if (u) { ed.tokens = u.tokens; ed.cursor = u.cursor; ed.result = null; ed.error = null; ed.view = null; } } }];
    if (st.app === 'calc' || st.app === 'complex') items.push(
      { label: 'Verify ON', radio: true, on: st.verify, act: () => { if (!st.verify) { st.verify = true; clearHistory(); Object.assign(ed, newEd()); } } },
      { label: 'Verify OFF', radio: true, on: !st.verify, act: () => { if (st.verify) { st.verify = false; clearHistory(); Object.assign(ed, newEd()); } } });
    if (st.app === 'vector') items.push({ label: 'Define Vector', sub: () => vectorList() });
    menu('TOOLS', items);
  }

  // VARIABLE
  function variableMenu() {
    const ed = curEd();
    menu('VARIABLE', () => VARS.map(v => ({ label: `${v.length === 1 && v === v.toLowerCase() ? `<i>${v}</i>` : v}=`, note: decHTML(st.vars[v], { ...st.set, fmt: { type: 'Norm', n: 1 } }), sub: () => [
      { label: 'Store', act: () => { const val = ed && ed.result !== null && typeof ed.result === 'number' ? ed.result : (typeof st.ans === 'number' ? st.ans : 0); st.vars[v] = val; save(); flash(`${v}=${decHTML(val, st.set)}`); } },
      { label: 'Recall', act: ins(v) },
      { label: 'Edit', act: () => { valueEntry(`${v}=`, (val) => { st.vars[v] = val; save(); }); } },
    ] })));
  }

  // FUNCTION: define f(x) and g(x), or put f( / g( into the expression
  function functionMenu() {
    if (st.app === 'dist') return;
    menu('FUNCTION', [
      { label: 'Define <i>f</i>(<i>x</i>)', act: () => defineFn('f') },
      { label: 'Define <i>g</i>(<i>x</i>)', act: () => defineFn('g') },
      { label: '<i>f</i>(<i>x</i>)', act: ins('f(') },
      { label: '<i>g</i>(<i>x</i>)', act: ins('g(') },
    ]);
  }
  function defineFn(name) {
    const ed = newEd(); ed.tokens = [...(st.fns[name] || [])]; ed.cursor = ed.tokens.length;
    st.screen = { kind: 'define', name, ed, prev: st.screen };
  }
  function valueEntry(label, done, init) {
    const ed = newEd(); if (init !== undefined && init !== null && init !== '') { ed.tokens = String(init).replace('-', '~').split('').map(c => c === '~' ? 'neg' : c); ed.cursor = ed.tokens.length; }
    st.screen = { kind: 'value', label, ed, done, prev: st.screen };
  }

  // FORMAT: convert the result on screen
  function formatMenu() {
    const ed = curEd(); if (!ed || ed.result === null || ed.error) return;
    const v = ed.result; const items = [];
    if (typeof v === 'number') {
      const toks = ed.tokens;
      if (!lineIn()) items.push({ label: 'Standard', act: () => { ed.view = 'std'; } });
      items.push({ label: 'Decimal', act: () => { ed.view = 'dec'; } });
      if (isInt(v) && v > 1 && v < 1e10) items.push({ label: 'Prime Factor', act: () => { ed.view = 'prime'; } });
      if (recurHTML(v)) items.push({ label: 'Recurring Decimal', act: () => { ed.view = 'recur'; } });
      const r = ratio(v, 99999);
      if (r && r[1] !== 1) { items.push({ label: 'Improper Fraction', act: () => { ed.view = 'improp'; } }); if (Math.abs(r[0]) > r[1]) items.push({ label: 'Mixed Fraction', act: () => { ed.view = 'mixed'; } }); }
      items.push({ label: 'ENG Notation', act: () => { ed.view = 'eng'; } });
      items.push({ label: 'Sexagesimal', act: () => { ed.view = 'dms'; } });
      void toks;
    } else if (isC(v)) {
      items.push({ label: 'Rectangular Coord', act: () => { ed.view = 'rect'; } }, { label: 'Polar Coord', act: () => { ed.view = 'polar'; } }, { label: 'Decimal', act: () => { ed.view = 'dec'; } });
    } else return;
    menu('FORMAT', items);
  }

  // =====================================================================================================
  // editing
  // =====================================================================================================
  function curEd() {
    if (st.screen && st.screen.ed) return st.screen.ed;
    if (st.app === 'calc' || st.app === 'complex' || st.app === 'vector') return apps[st.app].ed;
    if (st.app === 'stat' && apps.stat.view === 'calc') return apps.stat.ed;
    if (st.app === 'stat' && apps.stat.view === 'editor') return apps.stat.ed;
    if (st.app === 'dist' && (apps.dist.view === 'params' || apps.dist.view === 'list')) return apps.dist.ed;
    if (st.app === 'table' && apps.table.view === 'table') return apps.table.ed;
    return null;
  }
  function clearHistory() { ['calc', 'complex', 'vector'].forEach(a => { apps[a].ed.hist = []; apps[a].ed.hi = -1; }); }
  const CONT = ['+', '-', '×', '÷', '²', '⁻¹', '!', '%', 'pow(', 'nCr', 'nPr', '•', 'deg', 'rad', 'gra', 'dms', ...RELS];
  function insertTok(tok, ed = curEd()) {
    if (!ed) return;
    if (ed.result !== null || ed.error) {   // after a result: an operator carries on from Ans, anything else starts a new calculation
      const cont = CONT.includes(tok) && !ed.error;
      ed.tokens = cont ? [st.app === 'vector' && isV(ed.result) ? 'VctAns' : 'Ans'] : []; ed.cursor = ed.tokens.length; ed.result = null; ed.error = null; ed.view = null; ed.hi = -1;
    }
    ed.undo.push({ tokens: [...ed.tokens], cursor: ed.cursor }); if (ed.undo.length > 30) ed.undo.shift();
    const n = TEMPLATES[tok];
    const extra = n ? [...Array(n - 1).fill(','), ')'] : [];
    if (n && tok !== 'pow(' && tok !== 'frac(' && !lineIn()) {   // a fraction/root typed after a number takes nothing with it, like the Casio
      ed.tokens.splice(ed.cursor, 0, tok, ...extra); ed.cursor += 1; return;
    }
    if (tok === 'frac(' && !lineIn()) {   // ▭/▭ after a number puts that number on top
      let s = ed.cursor; while (s > 0 && /^[0-9.]$/.test(ed.tokens[s - 1])) s--;
      if (s < ed.cursor) { const numTok = ed.tokens.splice(s, ed.cursor - s); ed.tokens.splice(s, 0, 'frac(', ...numTok, ',', ')'); ed.cursor = s + 1 + numTok.length + 1; return; }
    }
    ed.tokens.splice(ed.cursor, 0, tok, ...extra); ed.cursor += 1;
  }
  function matchClose(tokens, at) {
    let depth = 0; const commas = [];
    for (let j = at + 1; j < tokens.length; j++) {
      const t = tokens[j];
      if (OPENERS.has(t)) depth++;
      else if (t === ')') { if (depth === 0) return { close: j, commas }; depth--; }
      else if (t === ',' && depth === 0) commas.push(j);
    }
    return { close: -1, commas };
  }
  function delTok(ed = curEd()) {
    if (!ed) return;
    if (ed.result !== null || ed.error) { ed.result = null; ed.error = null; ed.view = null; ed.cursor = ed.tokens.length; return; }
    if (ed.cursor === 0) return;
    ed.undo.push({ tokens: [...ed.tokens], cursor: ed.cursor });
    const t = ed.tokens[ed.cursor - 1];
    if ((t === ')' || t === ',') && TEMPLATES[findOpener(ed.tokens, ed.cursor - 1)]) { ed.cursor--; return; }   // step back inside a template
    if (OPENERS.has(t)) {
      const { close: c, commas } = matchClose(ed.tokens, ed.cursor - 1);
      const drop = new Set([ed.cursor - 1, ...(TEMPLATES[t] ? commas : []), ...(c >= 0 && TEMPLATES[t] ? [c] : [])]);
      ed.tokens = ed.tokens.filter((_, j) => !drop.has(j)); ed.cursor--; return;
    }
    ed.tokens.splice(ed.cursor - 1, 1); ed.cursor--;
  }
  function findOpener(tokens, at) {   // the opener that owns the ')' or ',' at `at`
    let depth = 0;
    for (let j = at - 1; j >= 0; j--) { const t = tokens[j]; if (t === ')') depth++; else if (OPENERS.has(t)) { if (!depth) return t; depth--; } }
    return null;
  }
  function moveCursor(ed, d) {
    if (ed.result !== null || ed.error) { ed.result = null; ed.error = null; ed.view = null; ed.cursor = d < 0 ? ed.tokens.length : 0; return; }
    const n = ed.tokens.length;
    if (d < 0) ed.cursor = ed.cursor > 0 ? ed.cursor - 1 : n; else ed.cursor = ed.cursor < n ? ed.cursor + 1 : 0;
  }
  function env(extra = {}) {
    return {
      angle: st.set.angle, fmt: st.set.fmt, ans: st.ans, preAns: st.preAns, vars: st.vars, fns: st.fns, verify: st.verify,
      complex: st.app === 'complex', vector: st.app === 'vector', vectors: st.vectors,
      setVar: (k, v) => { st.vars[k] = v; }, stat: statValue, estimate: statEstimate, ...extra,
    };
  }
  function execute(ed, approx) {
    if (!ed.tokens.length) return;
    try {
      const E = env(); const v = evaluate(ed.tokens, E);
      if (st.app === 'vector' && isV(v)) st.vectors.VctAns = v.vec;
      if (!isV(v)) { st.preAns = st.ans; st.ans = v; }
      ed.result = v; ed.error = null; ed.view = approx ? 'dec' : null; ed.verdict = E.verdict; ed.pol = E.pol || null;
      if (st.verify) ed.view = 'verify';
      ed.hist.push({ tokens: [...ed.tokens], result: v, view: ed.view, verdict: ed.verdict, pol: ed.pol }); if (ed.hist.length > 30) ed.hist.shift(); ed.hi = -1;
      save();
    } catch (e) { if (!e.casio) console.warn(e); ed.error = e.casio ? e.message : 'Syntax ERROR'; ed.result = null; }
  }
  function resultHTML(ed) {
    const v = ed.result, S = st.set;
    if (ed.view === 'verify' || st.verify) return `<b class="cw-tf">${v ? 'TRUE' : 'FALSE'}</b>`;
    if (ed.pol) return `<div class="cw-pol">${ed.pol.map(([n, x]) => `<div>${n}=${numHTML(x, ed)}</div>`).join('')}</div>`;
    if (isV(v)) return `<span class="cw-vec">[${v.vec.map(x => decHTML(x, S)).join('&nbsp;&nbsp;')}]</span>`;
    if (isC(v)) {
      const polar = ed.view === 'polar' || (ed.view !== 'rect' && S.cplx === 'r∠θ');
      if (polar) { const r = Math.hypot(v.re, v.im), th = Math.atan2(v.im, v.re) * (S.angle === 'Degree' ? 180 / Math.PI : S.angle === 'Gradian' ? 200 / Math.PI : 1); return `${numHTML(r, ed)}∠${numHTML(th, ed)}`; }
      const im = Math.abs(v.im) === 1 ? '' : numHTML(Math.abs(v.im), ed);
      return `${v.re ? numHTML(v.re, ed) : ''}${v.re ? (v.im < 0 ? '−' : '+') : (v.im < 0 ? '−' : '')}${im}<i>i</i>`;
    }
    return numHTML(v, ed);
  }
  function numHTML(v, ed) {
    const S = st.set, view = ed.view;
    if (view === 'dec' || (decOut() && view !== 'std' && view !== 'improp' && view !== 'mixed')) return decHTML(v, S);
    if (view === 'eng') return engHTML(v, S);
    if (view === 'dms') return dmsHTML(v);
    if (view === 'prime') return primeHTML(v) || decHTML(v, S);
    if (view === 'recur') return recurHTML(v) || decHTML(v, S);
    const mixed = view === 'mixed' || (view !== 'improp' && S.frac === 'Mixed Fraction');
    if (lineIn() && view !== 'improp' && view !== 'mixed') { const r = ratio(v, 99999); if (r && r[1] !== 1 && digitsOk(r[0], r[1]) && S.fmt.type === 'Norm') return mixed && Math.abs(r[0]) > r[1] ? `${Math.trunc(r[0] / r[1])}⌟${Math.abs(r[0]) % r[1]}⌟${r[1]}` : `${r[0]}⌟${r[1]}`.replace('-', '−'); return decHTML(v, S); }
    if (S.fmt.type !== 'Norm' && view !== 'std' && view !== 'improp' && view !== 'mixed') return decHTML(v, S);
    const ex = exactForm(v, ed.tokens || [], mixed);
    return ex || decHTML(v, S);
  }

  // =====================================================================================================
  // key handling
  // =====================================================================================================
  let flashMsg = null, flashT = null;
  function flash(html) { flashMsg = html; clearTimeout(flashT); flashT = setTimeout(() => { flashMsg = null; draw(); }, 1400); }
  function goHome() { st.app = 'home'; st.menu = null; st.screen = null; }
  function openApp(a) {
    st.app = a; st.menu = null; st.screen = null; clearHistory(); st.preAns = 0;
    if (a === 'stat') { apps.stat.view = 'menu'; statStart(); }
    if (a === 'dist') { apps.dist.view = 'menu'; distStart(); }
    if (a === 'table') { apps.table.view = 'table'; apps.table.rows = null; }
  }
  function press(a) {
    if (!a) return draw();
    if (!st.on) { if (a === 'on') { st.on = true; goHome(); } return draw(); }
    const wasShift = st.shift; st.shift = false;
    if (a === 'shift') { st.shift = !wasShift; return draw(); }
    if (a === 'off') { st.on = false; return draw(); }
    if (a === 'on') { return draw(); }
    if (a === 'home') { goHome(); return draw(); }
    if (st.screen && st.screen.kind === 'error') { if (['ok', 'back', 'ac', 'left', 'right'].includes(a)) { const ed = st.screen.ed; st.screen = st.screen.prev; if (ed && a !== 'ac') { ed.error = null; ed.result = null; } else if (ed) { ed.error = null; } } return draw(); }
    if (st.screen && (st.screen.kind === 'msg' || st.screen.kind === 'qr')) { if (['ok', 'back', 'ac', 'exe'].includes(a)) st.screen = null; return draw(); }
    if (st.screen && st.screen.kind === 'contrast') { if (a === 'left') st.set.contrast = Math.max(0, st.set.contrast - 1); else if (a === 'right') st.set.contrast = Math.min(10, st.set.contrast + 1); else if (['ok', 'back', 'ac', 'exe'].includes(a)) { st.screen = null; save(); } return draw(); }
    if (a === 'settings') { if (st.app === 'home') { st.screen = { kind: 'msg', title: 'Get Started', lines: ['Calculator ID and Get Started', 'QR code are on the real', 'calculator.'] }; } else { st.menu = null; settingsMenu(); } return draw(); }
    if (st.menu) { menuKey(a); return draw(); }
    if (a === 'qr') { st.screen = { kind: 'msg', title: 'QR Code', lines: ['QR codes need the real', 'calculator.'] }; return draw(); }
    if (st.app === 'home') { homeKey(a); return draw(); }
    if (a === 'catalog') { catalogMenu(); return draw(); }
    if (a === 'tools') { toolsMenu(); return draw(); }
    if (a === 'variable') { variableMenu(); return draw(); }
    if (a === 'function') { functionMenu(); return draw(); }
    if (st.screen && (st.screen.kind === 'define' || st.screen.kind === 'value')) { entryKey(a); return draw(); }
    if (st.screen && st.screen.kind === 'vedit') { vectorEditKey(a); return draw(); }
    if (st.app === 'stat') { statKey(a); return draw(); }
    if (st.app === 'dist') { distKey(a); return draw(); }
    if (st.app === 'table') { tableKey(a); return draw(); }
    calcKey(a, apps[st.app].ed);
    draw();
  }
  function homeKey(a) {
    if (a === 'left') st.homeIdx = (st.homeIdx + 5) % 6;
    else if (a === 'right') st.homeIdx = (st.homeIdx + 1) % 6;
    else if (a === 'up' || a === 'down') st.homeIdx = (st.homeIdx + 3) % 6;
    else if (a === 'ok' || a === 'exe') openApp(APPS[st.homeIdx][0]);
    else if (/^[1-6]$/.test(a)) { st.homeIdx = Number(a) - 1; }
  }
  // the shared editing keys; returns true if handled
  function editKey(a, ed) {
    if (a === 'ac') { ed.tokens = []; ed.cursor = 0; ed.result = null; ed.error = null; ed.view = null; ed.hi = -1; return true; }
    if (a === 'del') { delTok(ed); return true; }
    if (a === 'ins') { return true; }
    if (a === 'left') { moveCursor(ed, -1); return true; }
    if (a === 'right') { moveCursor(ed, 1); return true; }
    if (a === 'format') { formatMenu(); return true; }
    if (['ok', 'back', 'up', 'down', 'pgup', 'pgdn', 'approx', 'exe', 'qr'].includes(a)) return false;
    insertTok(a, ed); return true;
  }
  function calcKey(a, ed) {
    if (ed.error && a !== 'ac') { if (['left', 'right', 'ok', 'back'].includes(a)) { ed.error = null; } else return; }
    if (a === 'exe' || a === 'approx') { execute(ed, a === 'approx'); if (ed.error) st.screen = { kind: 'error', msg: ed.error, ed, prev: null }; return; }
    if (a === 'up' || a === 'down') {      // history
      const H = ed.hist; if (!H.length) return;
      if (ed.hi === -1) { if (a === 'down') return; ed.hi = H.length - 1; }
      else ed.hi = Math.max(0, Math.min(H.length - 1, ed.hi + (a === 'up' ? -1 : 1)));
      const h = H[ed.hi]; ed.tokens = [...h.tokens]; ed.cursor = ed.tokens.length; ed.result = h.result; ed.view = h.view; ed.verdict = h.verdict; ed.pol = h.pol; ed.error = null; return;
    }
    if (a === 'back' || a === 'ok') return;
    editKey(a, ed);
  }
  function entryKey(a) {
    const s = st.screen, ed = s.ed;
    if (a === 'back') { st.screen = s.prev; return; }
    if (a === 'exe' || a === 'ok') {
      if (s.kind === 'define') {
        if (!ed.tokens.length) { st.fns[s.name] = null; st.screen = s.prev; save(); return; }
        const other = s.name === 'f' ? 'g' : 'f';
        if (ed.tokens.includes(s.name + '(') || (ed.tokens.includes(other + '(') && (st.fns[other] || []).includes(s.name + '('))) { st.screen = { kind: 'error', msg: 'Circular ERROR', ed: null, prev: s }; return; }
        st.fns[s.name] = [...ed.tokens]; save(); st.screen = s.prev; flash(`Defined <i>${s.name}</i>(<i>x</i>)`); return;
      }
      try { const v = evaluate(ed.tokens.length ? ed.tokens : ['0'], env()); if (typeof v !== 'number') ERR('Math ERROR'); const prev = s.prev; st.screen = prev; s.done(v); }
      catch (e) { st.screen = { kind: 'error', msg: e.casio ? e.message : 'Syntax ERROR', ed: null, prev: s }; }
      return;
    }
    if (a === 'up' || a === 'down' || a === 'pgup' || a === 'pgdn') { if (s.nav) s.nav(a); return; }
    editKey(a, ed);
  }

  // =====================================================================================================
  // Statistics
  // =====================================================================================================
  const REGS = ['y=a+bx', 'y=a+bx+cx²', 'y=a+b･ln(x)', 'y=a･e^(bx)', 'y=a･b^x', 'y=a･x^b', 'y=a+b/x'];
  const REGH = { 'y=a+bx': '<i>y</i>=<i>a</i>+<i>bx</i>', 'y=a+bx+cx²': '<i>y</i>=<i>a</i>+<i>bx</i>+<i>cx</i><sup>2</sup>', 'y=a+b･ln(x)': '<i>y</i>=<i>a</i>+<i>b</i>･ln(<i>x</i>)', 'y=a･e^(bx)': '<i>y</i>=<i>a</i>･<i>e</i><sup><i>bx</i></sup>',
    'y=a･b^x': '<i>y</i>=<i>a</i>･<i>b</i><sup><i>x</i></sup>', 'y=a･x^b': '<i>y</i>=<i>a</i>･<i>x</i><sup><i>b</i></sup>', 'y=a+b/x': '<i>y</i>=<i>a</i>+<i>b</i>/<i>x</i>' };
  function statStart() {
    const S = apps.stat;
    menu('Statistics', [
      { label: '1-Variable', act: () => { if (S.mode !== '1') { S.rows = []; } S.mode = '1'; S.view = 'editor'; S.cur = [0, 0]; } },
      { label: '2-Variable', act: () => { if (S.mode !== '2') { S.rows = []; } S.mode = '2'; S.view = 'editor'; S.cur = [0, 0]; } },
    ], { onClose: () => { if (!S.mode) goHome(); else S.view = 'editor'; } });
  }
  const statCols = () => { const S = apps.stat; return [...(S.mode === '2' ? ['x', 'y'] : ['x']), ...(S.freq ? ['Freq'] : [])]; };
  const maxRows = () => ({ 1: 160, 2: 80, 3: 53 })[statCols().length];
  function statData() {
    const S = apps.stat, cols = statCols(), fi = cols.indexOf('Freq');
    const xs = [], ys = [], fs = [];
    S.rows.forEach(r => { if (r[0] === undefined || r[0] === null) return; const f = fi >= 0 ? (r[fi] ?? 1) : 1; xs.push(r[0]); if (S.mode === '2') ys.push(r[1] ?? 0); fs.push(f); });
    return { xs, ys, fs };
  }
  let statCache = null;
  function stats() {
    const S = apps.stat, { xs, ys, fs } = statData();
    const n = fs.reduce((a, b) => a + b, 0);
    const sum = (f) => xs.reduce((s, x, i) => s + fs[i] * f(x, ys[i]), 0);
    const o = { n, 'Σx': sum(x => x), 'Σx2': sum(x => x * x), 'Σx3': sum(x => x ** 3), 'Σx4': sum(x => x ** 4) };
    o.xbar = o['Σx'] / n; o['σ2x'] = o['Σx2'] / n - o.xbar ** 2; o['σx'] = Math.sqrt(Math.max(0, o['σ2x'])); o['s2x'] = n > 1 ? (o['Σx2'] - n * o.xbar ** 2) / (n - 1) : NaN; o.sx = Math.sqrt(o['s2x']);
    const exp = []; xs.forEach((x, i) => { for (let k = 0; k < Math.round(fs[i]); k++) exp.push(x); }); exp.sort((a, b) => a - b);
    const med = (a) => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    const N = exp.length; o.minx = exp[0]; o.maxx = exp[N - 1]; o.Med = N ? med(exp) : NaN;
    o.Q1 = N > 1 ? med(exp.slice(0, Math.floor(N / 2))) : exp[0]; o.Q3 = N > 1 ? med(exp.slice(Math.ceil(N / 2))) : exp[0];
    if (S.mode === '2') {
      Object.assign(o, { 'Σy': sum((x, y) => y), 'Σy2': sum((x, y) => y * y), 'Σxy': sum((x, y) => x * y), 'Σx2y': sum((x, y) => x * x * y) });
      o.ybar = o['Σy'] / n; o['σ2y'] = o['Σy2'] / n - o.ybar ** 2; o['σy'] = Math.sqrt(Math.max(0, o['σ2y'])); o['s2y'] = n > 1 ? (o['Σy2'] - n * o.ybar ** 2) / (n - 1) : NaN; o.sy = Math.sqrt(o['s2y']);
      o.miny = Math.min(...ys); o.maxy = Math.max(...ys);
      Object.assign(o, regress(S.reg, xs, ys, fs));
    }
    return o;
  }
  function linfit(X, Y, W) {
    const n = W.reduce((a, b) => a + b, 0); let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    X.forEach((x, i) => { const w = W[i], y = Y[i]; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y; syy += w * y * y; });
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n, r = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    return { a, b, r };
  }
  function regress(type, xs, ys, fs) {
    const L = (X, Y) => linfit(X, Y, fs);
    switch (type) {
      case 'y=a+bx': return L(xs, ys);
      case 'y=a+b･ln(x)': return L(xs.map(Math.log), ys);
      case 'y=a･e^(bx)': { const f = L(xs, ys.map(Math.log)); return { a: Math.exp(f.a), b: f.b, r: f.r }; }
      case 'y=a･b^x': { const f = L(xs, ys.map(Math.log)); return { a: Math.exp(f.a), b: Math.exp(f.b), r: f.r }; }
      case 'y=a･x^b': { const f = L(xs.map(Math.log), ys.map(Math.log)); return { a: Math.exp(f.a), b: f.b, r: f.r }; }
      case 'y=a+b/x': return L(xs.map(x => 1 / x), ys);
      case 'y=a+bx+cx²': {   // least squares, normal equations
        let s = Array(5).fill(0), t = Array(3).fill(0);
        xs.forEach((x, i) => { const w = fs[i], y = ys[i]; for (let k = 0; k < 5; k++) s[k] += w * x ** k; for (let k = 0; k < 3; k++) t[k] += w * y * x ** k; });
        const M = [[s[0], s[1], s[2], t[0]], [s[1], s[2], s[3], t[1]], [s[2], s[3], s[4], t[2]]];
        for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; } }
        return { a: M[0][3] / M[0][0], b: M[1][3] / M[1][1], c: M[2][3] / M[2][2], r: NaN };
      }
    }
    return {};
  }
  function statValue(tok) { if (st.app !== 'stat') return NaN; const o = stats(); return o[tok.slice(2)]; }
  function statEstimate(t, v) {
    const S = apps.stat; if (st.app !== 'stat' || S.mode !== '2') return NaN; const o = stats(), { a, b, c } = o, R = S.reg;
    const yhat = (x) => R === 'y=a+bx' ? a + b * x : R === 'y=a+b･ln(x)' ? a + b * Math.log(x) : R === 'y=a･e^(bx)' ? a * Math.exp(b * x) : R === 'y=a･b^x' ? a * b ** x : R === 'y=a･x^b' ? a * x ** b : R === 'y=a+b/x' ? a + b / x : a + b * x + c * x * x;
    if (t === 'ŷ') return yhat(v);
    if (R === 'y=a+bx+cx²') { const d = b * b - 4 * c * (a - v); if (d < 0) return NaN; const r1 = (-b + Math.sqrt(d)) / (2 * c), r2 = (-b - Math.sqrt(d)) / (2 * c); return t === 'x̂2' ? Math.min(r1, r2) : Math.max(r1, r2); }
    if (t !== 'x̂') return NaN;
    return R === 'y=a+bx' ? (v - a) / b : R === 'y=a+b･ln(x)' ? Math.exp((v - a) / b) : R === 'y=a･e^(bx)' ? Math.log(v / a) / b : R === 'y=a･b^x' ? Math.log(v / a) / Math.log(b) : R === 'y=a･x^b' ? (v / a) ** (1 / b) : b / (v - a);
  }
  function statCatalog() {
    const S = apps.stat, two = S.mode === '2';
    const it = (t, lbl) => ({ label: lbl || STATK[t] || POSTSTAT[t], act: ins(t) });
    return [
      { label: 'Summation', sub: () => (two ? ['S:Σx', 'S:Σy', 'S:Σx2', 'S:Σy2', 'S:Σxy', 'S:Σx3', 'S:Σx2y', 'S:Σx4'] : ['S:Σx', 'S:Σx2']).map(t => it(t)) },
      { label: 'Mean/Var/Dev', sub: () => (two ? ['S:xbar', 'S:ybar', 'S:σ2x', 'S:σ2y', 'S:σx', 'S:σy', 'S:s2x', 'S:s2y', 'S:sx', 'S:sy', 'S:n'] : ['S:xbar', 'S:σ2x', 'S:σx', 'S:s2x', 'S:sx', 'S:n']).map(t => it(t)) },
      two ? { label: 'Min/Max', sub: () => ['S:minx', 'S:miny', 'S:maxx', 'S:maxy'].map(t => it(t)) } : { label: 'Min/Max/Quartile', sub: () => ['S:minx', 'S:Q1', 'S:Med', 'S:Q3', 'S:maxx'].map(t => it(t)) },
      ...(two ? [{ label: 'Regression', sub: () => [...['S:a', 'S:b', ...(S.reg === 'y=a+bx+cx²' ? ['S:c'] : ['S:r'])].map(t => it(t)), ...(S.reg === 'y=a+bx+cx²' ? ['x̂1', 'x̂2', 'ŷ'] : ['x̂', 'ŷ']).map(t => it(t))] },
        { label: 'Select Reg Type', sub: () => REGS.map(r => ({ label: REGH[r], radio: true, on: S.reg === r, act: () => { S.reg = r; } })) }] : []),
    ];
  }
  function statTools() {
    const S = apps.stat;
    const items = [
      { label: 'Frequency', sub: () => radios(['On', 'Off'], () => S.freq ? 'On' : 'Off', (v) => { const f = v === 'On'; if (f !== S.freq) { S.freq = f; S.rows = []; S.cur = [0, 0]; } }) },
      { label: 'Edit', sub: () => [
        { label: 'Insert Row', act: () => { S.rows.splice(S.cur[0], 0, []); } },
        { label: 'Delete All', act: () => confirmBox('Delete All?', () => { S.rows = []; S.cur = [0, 0]; }) }] },
      { label: 'Sort', sub: () => [['x Ascending', 0, 1], ['x Descending', 0, -1], ...(S.mode === '2' ? [['y Ascending', 1, 1], ['y Descending', 1, -1]] : [])].map(([l, c, d]) => ({ label: l.replace(/^([xy])/, '<i>$1</i>'), act: () => { S.rows.sort((p, q) => d * ((p[c] ?? 0) - (q[c] ?? 0))); } })) },
      { label: 'Statistics', act: () => { S.mode = null; statStart(); return true; } },
    ];
    menu('TOOLS', items);
  }
  function statOkMenu() {
    const S = apps.stat, two = S.mode === '2';
    menu('', [
      { label: two ? '2-Var Results' : '1-Var Results', act: () => { st.screen = { kind: 'results', rows: statResultRows(), top: 0 }; } },
      ...(two ? [{ label: 'Reg Results', sub: () => REGS.map(r => ({ label: REGH[r], act: () => { S.reg = r; const o = stats(); st.screen = { kind: 'results', title: REGH[r], rows: [['<i>a</i>', o.a], ['<i>b</i>', o.b], ...(r === 'y=a+bx+cx²' ? [['<i>c</i>', o.c]] : [['<i>r</i>', o.r]])], top: 0 }; } })) }] : []),
      { label: 'Statistics Calc', act: () => { S.view = 'calc'; S.ed = newEd(); } },
    ]);
  }
  function statResultRows() {
    const o = stats(), two = apps.stat.mode === '2';
    const one = [['<i>x̄</i>', o.xbar], ['Σ<i>x</i>', o['Σx']], ['Σ<i>x</i><sup>2</sup>', o['Σx2']], ['σ<sup>2</sup><sub><i>x</i></sub>', o['σ2x']], ['σ<sub><i>x</i></sub>', o['σx']], ['s<sup>2</sup><sub><i>x</i></sub>', o['s2x']], ['s<sub><i>x</i></sub>', o.sx], ['<i>n</i>', o.n]];
    if (!two) return [...one, ['min(<i>x</i>)', o.minx], ['Q<sub>1</sub>', o.Q1], ['Med', o.Med], ['Q<sub>3</sub>', o.Q3], ['max(<i>x</i>)', o.maxx]];
    return [...one, ['<i>ȳ</i>', o.ybar], ['Σ<i>y</i>', o['Σy']], ['Σ<i>y</i><sup>2</sup>', o['Σy2']], ['Σ<i>xy</i>', o['Σxy']], ['Σ<i>x</i><sup>3</sup>', o['Σx3']], ['Σ<i>x</i><sup>2</sup><i>y</i>', o['Σx2y']], ['Σ<i>x</i><sup>4</sup>', o['Σx4']],
      ['σ<sup>2</sup><sub><i>y</i></sub>', o['σ2y']], ['σ<sub><i>y</i></sub>', o['σy']], ['s<sup>2</sup><sub><i>y</i></sub>', o['s2y']], ['s<sub><i>y</i></sub>', o.sy], ['min(<i>x</i>)', o.minx], ['max(<i>x</i>)', o.maxx], ['min(<i>y</i>)', o.miny], ['max(<i>y</i>)', o.maxy]];
  }
  function statKey(a) {
    const S = apps.stat;
    if (st.screen && st.screen.kind === 'results') { const sc = st.screen; if (a === 'up') sc.top = Math.max(0, sc.top - 1); else if (a === 'down') sc.top = Math.min(Math.max(0, sc.rows.length - 4), sc.top + 1); else if (a === 'pgup') sc.top = Math.max(0, sc.top - 4); else if (a === 'pgdn') sc.top = Math.min(Math.max(0, sc.rows.length - 4), sc.top + 4); else if (['back', 'ac', 'ok', 'exe'].includes(a)) st.screen = null; return; }
    if (S.view === 'calc') { if (a === 'back') { S.view = 'editor'; return; } return calcKey(a, S.ed); }
    if (!S.mode) { statStart(); return; }
    const cols = statCols(), ed = S.ed;
    if (a === 'ok') { if (!statData().xs.length) { st.screen = { kind: 'msg', title: '', lines: ['No data.'] }; return; } statOkMenu(); return; }
    if (a === 'back') { if (ed.tokens.length) { ed.tokens = []; ed.cursor = 0; return; } goHome(); return; }
    if (ed.tokens.length === 0 || a === 'exe') {
      if (a === 'up') { S.cur[0] = Math.max(0, S.cur[0] - 1); return; }
      if (a === 'down') { S.cur[0] = Math.min(Math.min(S.rows.length, maxRows() - 1), S.cur[0] + 1); return; }
      if (a === 'pgup') { S.cur[0] = Math.max(0, S.cur[0] - 4); return; }
      if (a === 'pgdn') { S.cur[0] = Math.min(S.rows.length, S.cur[0] + 4); return; }
      if (a === 'left') { S.cur[1] = Math.max(0, S.cur[1] - 1); return; }
      if (a === 'right') { S.cur[1] = Math.min(cols.length - 1, S.cur[1] + 1); return; }
      if (a === 'del') { const r = S.rows[S.cur[0]]; if (r) { S.rows.splice(S.cur[0], 1); } return; }
      if (a === 'ac') return;
    }
    if (a === 'exe') {
      if (!ed.tokens.length) return;
      try {
        const v = evaluate(ed.tokens, env()); if (typeof v !== 'number') ERR('Math ERROR');
        const [r, c] = S.cur; if (cols[c] === 'Freq' && (v < 0 || !isInt(v))) ERR('Math ERROR');
        while (S.rows.length <= r) S.rows.push(cols.map(cc => cc === 'Freq' ? 1 : undefined));
        S.rows[r][c] = v; ed.tokens = []; ed.cursor = 0;
        if (r + 1 < maxRows()) S.cur[0] = r + 1;
      } catch (e) { st.screen = { kind: 'error', msg: e.casio ? e.message : 'Syntax ERROR', ed: null, prev: null }; }
      return;
    }
    editKey(a, ed);
  }

  // =====================================================================================================
  // Distribution
  // =====================================================================================================
  const DISTS = [['Binomial PD', ['x', 'N', 'p'], true], ['Binomial CD', ['x', 'N', 'p'], true], ['Normal PD', ['x', 'μ', 'σ'], false], ['Normal CD', ['Lower', 'Upper', 'μ', 'σ'], false],
    ['Inverse Normal', ['Area', 'μ', 'σ'], false], ['Poisson PD', ['x', 'λ'], true], ['Poisson CD', ['x', 'λ'], true]];
  const DDEF = { μ: 0, σ: 1, Lower: 0, Upper: 0, Area: 0, x: 0, N: 0, p: 0, λ: 0 };
  const PN = { x: '<i>x</i>', N: 'N', p: '<i>p</i>', μ: 'μ', σ: 'σ', Lower: 'Lower', Upper: 'Upper', Area: 'Area', λ: 'λ' };
  function distStart() {
    const D = apps.dist;
    menu('Distribution', DISTS.map(([name, , listable]) => ({ label: name, act: () => {
      D.type = name; D.cur = 0; D.result = null;
      if (listable) { menu(name, [{ label: 'List', act: () => { D.method = 'List'; D.view = 'list'; D.cur = 0; } }, { label: 'Variable', act: () => { D.method = 'Variable'; D.view = 'params'; D.cur = 0; } }]); return true; }
      D.method = 'Variable'; D.view = 'params';
    } })), { onClose: () => { if (!D.type) goHome(); } });
  }
  const dFields = () => { const D = apps.dist, f = DISTS.find(d => d[0] === D.type)[1]; return D.method === 'List' ? f.filter(x => x !== 'x') : f; };
  const dVal = (k) => apps.dist.params[apps.dist.type + ':' + k] ?? DDEF[k];
  function distCompute(x) {
    const D = apps.dist, t = D.type, g = dVal;
    const bad = () => NaN;
    if (t === 'Binomial PD' || t === 'Binomial CD') { const N = g('N'), p = g('p'); if (!isInt(N) || N < 0 || p < 0 || p > 1) return bad(); return t === 'Binomial PD' ? binPD(x, N, p) : (x < 0 ? 0 : binCD(x, N, p)); }
    if (t === 'Poisson PD' || t === 'Poisson CD') { const l = g('λ'); if (l <= 0 || l > 1e8) return bad(); return t === 'Poisson PD' ? poiPD(x, l) : (x < 0 ? 0 : poiCD(x, l)); }
    if (t === 'Normal PD') { const s = g('σ'), m = g('μ'); if (s <= 0) return bad(); return Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)); }
    if (t === 'Normal CD') { const s = g('σ'), m = g('μ'); if (s <= 0) return bad(); return cnd((g('Upper') - m) / s) - cnd((g('Lower') - m) / s); }
    if (t === 'Inverse Normal') { const s = g('σ'), m = g('μ'), A_ = g('Area'); if (s <= 0 || A_ <= 0 || A_ >= 1) return bad(); return m + s * invNorm(A_); }
  }
  function distKey(a) {
    const D = apps.dist, ed = D.ed;
    if (D.view === 'menu' || !D.type) { distStart(); return; }
    if (D.view === 'result') {
      if (['back', 'ac', 'exe', 'ok'].includes(a)) { D.view = D.method === 'List' ? 'list' : 'params'; }
      else if (a === 'up') D.rtop = Math.max(0, (D.rtop || 0) - 1); else if (a === 'down') D.rtop = Math.min(Math.max(0, D.list.length - 4), (D.rtop || 0) + 1);
      return;
    }
    if (D.view === 'list') {
      if (a === 'back' && !ed.tokens.length) { D.type = null; D.view = 'menu'; distStart(); return; }
      if (!ed.tokens.length) {
        if (a === 'up') { D.cur = Math.max(0, D.cur - 1); return; }
        if (a === 'down') { D.cur = Math.min(Math.min(D.list.length, 44), D.cur + 1); return; }
        if (a === 'del') { D.list.splice(D.cur, 1); return; }
        if (a === 'ok') { D.view = 'params'; D.cur = 0; return; }
      }
      if (a === 'exe') { try { const v = evaluate(ed.tokens.length ? ed.tokens : ['0'], env()); D.list[D.cur] = real(v); ed.tokens = []; ed.cursor = 0; D.cur = Math.min(D.cur + 1, 44); } catch (e) { st.screen = { kind: 'error', msg: e.casio ? e.message : 'Syntax ERROR', ed: null, prev: null }; } return; }
      editKey(a, ed); return;
    }
    // params: one line per parameter, then [Execute]
    const F = dFields(), rows = F.length + 1;
    if (a === 'back' && !ed.tokens.length) { if (D.method === 'List') { D.view = 'list'; D.cur = 0; } else { D.type = null; D.view = 'menu'; distStart(); } return; }
    if (!ed.tokens.length && (a === 'up' || a === 'down')) { D.cur = (D.cur + (a === 'up' ? rows - 1 : 1)) % rows; return; }
    if (D.cur === F.length && (a === 'exe' || a === 'ok')) {   // Execute
      if (D.method === 'List') { D.results = D.list.map(x => distCompute(x)); D.view = 'result'; D.rtop = 0; return; }
      const v = distCompute(dVal('x'));
      if (v === undefined || Number.isNaN(v)) { st.screen = { kind: 'error', msg: 'Math ERROR', ed: null, prev: null }; return; }
      D.result = v; st.preAns = st.ans; st.ans = v; save(); D.view = 'result'; return;
    }
    if (a === 'exe' || (a === 'ok' && ed.tokens.length)) {
      try { const v = real(evaluate(ed.tokens.length ? ed.tokens : [String(dVal(F[D.cur]))], env())); D.params[D.type + ':' + F[D.cur]] = v; ed.tokens = []; ed.cursor = 0; D.cur = Math.min(F.length, D.cur + 1); }
      catch (e) { st.screen = { kind: 'error', msg: e.casio ? e.message : 'Syntax ERROR', ed: null, prev: null }; }
      return;
    }
    if (D.cur === F.length) return;
    editKey(a, ed);
  }

  // =====================================================================================================
  // Table
  // =====================================================================================================
  function tableTools() {
    const T = apps.table;
    menu('TOOLS', [
      { label: 'Table Type', sub: () => radios(['f(x)/g(x)', 'f(x)', 'g(x)'], () => T.type, (v) => { T.type = v; T.rows = null; }).map(r => ({ ...r, label: r.label.replace(/([fg])\(x\)/g, '<i>$1</i>(<i>x</i>)') })) },
      { label: 'Define <i>f</i>(<i>x</i>)/<i>g</i>(<i>x</i>)', sub: () => [{ label: 'Define <i>f</i>(<i>x</i>)', act: () => { defineFn('f'); T.rows = null; } }, { label: 'Define <i>g</i>(<i>x</i>)', act: () => { defineFn('g'); T.rows = null; } }] },
      { label: 'Table Range', act: () => { tableRange(); } },
      { label: 'Recalculate', act: () => { T.rows = null; } },
    ]);
  }
  function tableRange() {
    const T = apps.table, keys = ['Start', 'End', 'Step'];
    const sc = { kind: 'range', cur: 0, ed: newEd() };
    st.screen = sc;
    sc.key = (a) => {
      if (a === 'back' && !sc.ed.tokens.length) { st.screen = null; return; }
      if (!sc.ed.tokens.length && (a === 'up' || a === 'down')) { sc.cur = (sc.cur + (a === 'up' ? 3 : 1)) % 4; return; }
      if (sc.cur === 3 && (a === 'exe' || a === 'ok')) { st.screen = null; T.rows = null; return; }
      if (a === 'exe' || a === 'ok') { try { const v = real(evaluate(sc.ed.tokens.length ? sc.ed.tokens : [String(T.range[keys[sc.cur]])].flatMap(s => s.split('')), env())); T.range[keys[sc.cur]] = v; sc.ed.tokens = []; sc.ed.cursor = 0; sc.cur++; } catch (e) { st.screen = { kind: 'error', msg: e.casio ? e.message : 'Syntax ERROR', ed: null, prev: sc }; } return; }
      editKey(a, sc.ed);
    };
  }
  function tableRows() {
    const T = apps.table, { Start: a, End: b, Step: h } = T.range;
    const showF = T.type !== 'g(x)', showG = T.type !== 'f(x)';
    const max = showF && showG ? 30 : 45;
    if (!(h > 0) && !(h < 0)) return { err: 'Range ERROR' };
    const n = Math.floor((b - a) / h + 1e-9) + 1; if (n < 1 || n > max) return { err: 'Range ERROR' };
    const rows = [];
    for (let k = 0; k < n; k++) {
      const x = Number((a + k * h).toPrecision(12));
      const f = (name) => { const d = st.fns[name]; if (!d) return null; try { return real(evaluate(d, env({ x }))); } catch { return 'ERROR'; } };
      rows.push([x, showF ? f('f') : undefined, showG ? f('g') : undefined]);
    }
    st.vars.x = rows[rows.length - 1][0];
    return { rows };
  }
  function tableKey(a) {
    const T = apps.table;
    if (st.screen && st.screen.kind === 'range') { st.screen.key(a); return; }
    if (a === 'back') { goHome(); return; }
    if (!T.rows) { if (!st.fns.f && !st.fns.g) return; const r = tableRows(); if (r.err) { st.screen = { kind: 'error', msg: r.err, ed: null, prev: null }; return; } T.rows = r.rows; T.cur = [0, 0]; }
    if (a === 'up') T.cur[0] = Math.max(0, T.cur[0] - 1);
    else if (a === 'down') T.cur[0] = Math.min(T.rows.length - 1, T.cur[0] + 1);
    else if (a === 'pgup') T.cur[0] = Math.max(0, T.cur[0] - 4);
    else if (a === 'pgdn') T.cur[0] = Math.min(T.rows.length - 1, T.cur[0] + 4);
    else if (a === 'left') T.cur[1] = Math.max(0, T.cur[1] - 1);
    else if (a === 'right') T.cur[1] = Math.min(2, T.cur[1] + 1);
    else if (a === 'exe' && T.cur[1] === 0 && T.ed.tokens.length) { try { const x = real(evaluate(T.ed.tokens, env())); T.rows[T.cur[0]][0] = x; const f = (n) => st.fns[n] ? (() => { try { return real(evaluate(st.fns[n], env({ x }))); } catch { return 'ERROR'; } })() : undefined; T.rows[T.cur[0]][1] = T.type !== 'g(x)' ? f('f') : undefined; T.rows[T.cur[0]][2] = T.type !== 'f(x)' ? f('g') : undefined; T.ed = newEd(); } catch (e) { st.screen = { kind: 'error', msg: e.casio ? e.message : 'Syntax ERROR', ed: null, prev: null }; } }
    else if (T.cur[1] === 0) editKey(a, T.ed);
  }

  // =====================================================================================================
  // Vector: VctA to VctD, defined through TOOLS > Define Vector
  // =====================================================================================================
  function vectorList() {
    return ['VctA', 'VctB', 'VctC', 'VctD'].map(v => ({ label: v, note: st.vectors[v] ? `${st.vectors[v].length} Dimensions` : 'None', sub: () => st.vectors[v]
      ? [{ label: 'Edit', act: () => vectorEdit(v) }, { label: 'Define New', sub: () => dimMenu(v) }]
      : dimMenu(v) }));
  }
  function dimMenu(v) { return [{ label: '2 Dimensions', act: () => { st.vectors[v] = [0, 0]; vectorEdit(v); } }, { label: '3 Dimensions', act: () => { st.vectors[v] = [0, 0, 0]; vectorEdit(v); } }]; }
  function vectorEdit(v) { st.screen = { kind: 'vedit', name: v, cur: 0, ed: newEd() }; }
  function vectorEditKey(a) {
    const s = st.screen, vec = st.vectors[s.name];
    if ((a === 'back' || a === 'ac') && !s.ed.tokens.length) { st.screen = null; save(); return; }
    if (!s.ed.tokens.length && (a === 'left' || a === 'up')) { s.cur = Math.max(0, s.cur - 1); return; }
    if (!s.ed.tokens.length && (a === 'right' || a === 'down')) { s.cur = Math.min(vec.length - 1, s.cur + 1); return; }
    if (a === 'exe' || a === 'ok') { if (!s.ed.tokens.length) return; try { vec[s.cur] = real(evaluate(s.ed.tokens, env({ vector: false }))); s.ed = newEd(); s.cur = Math.min(vec.length - 1, s.cur + 1); save(); } catch (e) { st.screen = { kind: 'error', msg: e.casio ? e.message : 'Syntax ERROR', ed: null, prev: s }; } return; }
    editKey(a, s.ed);
  }

  // =====================================================================================================
  // drawing the screen
  // =====================================================================================================
  const HOMEICON = {
    calc: '<svg viewBox="0 0 24 18"><path d="M3 4h6M6 1v6M15 1.5l5 5m0-5-5 5M3 13h6M15 13h5M17.5 10.5v0M17.5 15.5v0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    stat: '<svg viewBox="0 0 24 18"><path d="M3 17V7h3v10M8 17V3h3v14M13 17V9h3v8M18 17V5h3v12" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M1 17h22" stroke="currentColor" stroke-width="1.6"/></svg>',
    dist: '<svg viewBox="0 0 24 18"><path d="M1 16c4 0 5-1 7-6s3-8 4-8 2 3 4 8 3 6 7 6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2v14M9 9v7h6V9" fill="currentColor" opacity=".45"/><path d="M1 16.5h22" stroke="currentColor" stroke-width="1.4"/></svg>',
    table: '<svg viewBox="0 0 24 18"><rect x="2" y="3" width="20" height="13" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v13M2 7h20" stroke="currentColor" stroke-width="1.6"/><path d="M4 9h6v5H4zM14 9h6v5h-6z" fill="currentColor" opacity=".6"/></svg>',
    complex: '<svg viewBox="0 0 24 18"><rect x="1" y="2" width="22" height="14" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="7" y="13.5" font-size="11" font-weight="700" font-style="italic" font-family="serif" fill="currentColor" text-anchor="middle">i</text><path d="M13 13h8L14 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    vector: '<svg viewBox="0 0 24 18"><path d="M4 16 18 3M18 3h-6M18 3v6M4 16l12 0M16 16l-3-2.5M16 16l-3 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };
  function statusHTML() {
    const S = st.set, s = [];
    if (st.shift) s.push('<b class="cw-si sh">S</b>');
    if (st.app !== 'home' && !lineIn()) s.push(`<span class="cw-si io">${decOut() ? '<span class="cw-io-d"></span>' : '<span class="cw-io-m"></span>'}</span>`);
    if (st.app !== 'home') s.push(`<b class="cw-si ang">${S.angle[0]}</b>`);
    if (st.app !== 'home' && S.fmt.type === 'Fix') s.push('<span class="cw-si">FIX</span>');
    if (st.app !== 'home' && S.fmt.type === 'Sci') s.push('<span class="cw-si">SCI</span>');
    if (st.app === 'complex') s.push(`<span class="cw-si">${S.cplx === 'r∠θ' ? '∠' : '<i>i</i>'}</span>`);
    if (st.verify && (st.app === 'calc' || st.app === 'complex')) s.push('<span class="cw-si vf">✓</span>');
    const ed = (st.app === 'calc' || st.app === 'complex' || st.app === 'vector') ? apps[st.app].ed : null;
    if (ed && ed.hist.length) s.push(`<span class="cw-si hs">${ed.hi === -1 || ed.hi > 0 ? '▲' : ''}${ed.hi !== -1 && ed.hi < ed.hist.length - 1 ? '▼' : ''}</span>`);
    return s.join('');
  }
  function edLine(ed) {
    return `<div class="cw-in">${renderTokens(ed.tokens, ed.result === null && !ed.error ? ed.cursor : ed.tokens.length + 99, lineIn()).replace(/<span class="cw-caret"><\/span>/, ed.result === null && !ed.error ? '<span class="cw-caret"></span>' : '')}</div>`;
  }
  function screenHTML() {
    if (!st.on) return '';
    const sc = st.screen;
    if (sc && sc.kind === 'error') return `<div class="cw-errbox"><b>${sc.msg}</b><span>[AC] :Cancel</span><span>[◀][▶]:Goto</span></div>`;
    if (sc && sc.kind === 'msg') return `<div class="cw-msg">${sc.title ? `<b>${sc.title}</b>` : ''}${sc.lines.map(l => `<span>${l}</span>`).join('')}</div>`;
    if (sc && sc.kind === 'contrast') return `<div class="cw-msg"><b>Contrast</b><span>LIGHT <span class="cw-ctr">${'▮'.repeat(st.set.contrast)}${'▯'.repeat(10 - st.set.contrast)}</span> DARK</span><span>[◀][▶] then [OK]</span></div>`;
    if (st.menu) return drawMenu();
    if (sc && sc.kind === 'define') return `<div class="cw-def"><div class="cw-lab"><i>${sc.name}</i>(<i>x</i>)=</div>${edLine(sc.ed)}</div>`;
    if (sc && sc.kind === 'value') return `<div class="cw-def"><div class="cw-lab">${sc.label}</div>${edLine(sc.ed)}</div>`;
    if (sc && sc.kind === 'results') return `${sc.title ? `<div class="cw-ttl">${sc.title}</div>` : ''}<div class="cw-res-list">${sc.rows.slice(sc.top, sc.top + (sc.title ? 3 : 4)).map(([n, v]) => `<div><span>${n}</span><span>=${Number.isFinite(v) ? decHTML(v, st.set) : 'ERROR'}</span></div>`).join('')}</div>`;
    if (sc && sc.kind === 'vedit') { const vec = st.vectors[sc.name]; return `<div class="cw-ttl">${sc.name}</div><div class="cw-vedit">[${vec.map((x, k) => `<span class="${k === sc.cur ? 'sel' : ''}">${k === sc.cur && sc.ed.tokens.length ? renderTokens(sc.ed.tokens, sc.ed.cursor) : decHTML(x, st.set)}</span>`).join('')}]</div>`; }
    if (sc && sc.kind === 'range') { const T = apps.table, keys = ['Start', 'End', 'Step']; return `<div class="cw-ttl">Table Range</div><div class="cw-form">${keys.map((k, j) => `<div class="${sc.cur === j ? 'sel' : ''}"><span>${k}</span><span>:${sc.cur === j && sc.ed.tokens.length ? renderTokens(sc.ed.tokens, sc.ed.cursor) : decHTML(T.range[k], st.set)}</span></div>`).join('')}<div class="cw-exec${sc.cur === 3 ? ' sel' : ''}">Execute</div></div>`; }
    if (st.app === 'home') return `<div class="cw-home">${APPS.map(([key, name], j) => `<div class="cw-app${j === st.homeIdx ? ' sel' : ''}">${HOMEICON[key]}<span>${name}</span></div>`).join('')}</div>`;
    if (st.app === 'stat') return statScreen();
    if (st.app === 'dist') return distScreen();
    if (st.app === 'table') return tableScreen();
    const ed = apps[st.app].ed;
    if (flashMsg && ed.result === null) return `<div class="cw-calc">${edLine(ed)}<div class="cw-res cw-flash">${flashMsg}</div></div>`;
    return `<div class="cw-calc">${edLine(ed)}${ed.result !== null ? `<div class="cw-res">${resultHTML(ed)}</div>` : ''}</div>`;
  }
  function statScreen() {
    const S = apps.stat;
    if (S.view === 'calc') { const ed = S.ed; return `<div class="cw-calc">${edLine(ed)}${ed.result !== null ? `<div class="cw-res">${resultHTML(ed)}</div>` : ''}</div>`; }
    if (!S.mode) return '';
    const cols = statCols(), top = Math.max(0, Math.min(S.cur[0] - 2, S.rows.length - 2)), show = [];
    for (let r = top; r < top + 3; r++) show.push(r);
    const cell = (r, c) => { const v = S.rows[r]?.[c]; return v === undefined || v === null ? '' : decHTML(v, { ...st.set, fmt: { type: 'Norm', n: 2 }, sep: false }).replace(/<span class="cw-x10">.*<\/span>/, 'ᴇ'); };
    const ed = S.ed;
    return `<table class="cw-grid"><tr><th></th>${cols.map(c => `<th>${c === 'Freq' ? 'Freq' : `<i>${c}</i>`}</th>`).join('')}</tr>${show.map(r => `<tr><td class="rn">${r + 1}</td>${cols.map((c, j) => `<td class="${S.cur[0] === r && S.cur[1] === j ? 'sel' : ''}">${cell(r, j)}</td>`).join('')}</tr>`).join('')}</table>
      <div class="cw-gin">${ed.tokens.length ? renderTokens(ed.tokens, ed.cursor) : (() => { const v = S.rows[S.cur[0]]?.[S.cur[1]]; return v === undefined || v === null ? '' : decHTML(v, st.set); })()}</div>`;
  }
  function distScreen() {
    const D = apps.dist;
    if (!D.type) return '';
    const fmt6 = (v) => Number.isFinite(v) ? decHTML(Number(v.toPrecision(6)), { ...st.set, fmt: { type: 'Norm', n: 2 } }) : 'ERROR';
    if (D.view === 'result') {
      if (D.method === 'List') return `<table class="cw-grid"><tr><th></th><th><i>x</i></th><th>P</th></tr>${D.list.slice(D.rtop || 0, (D.rtop || 0) + 3).map((x, j) => `<tr><td class="rn">${(D.rtop || 0) + j + 1}</td><td>${decHTML(x, st.set)}</td><td>${fmt6(D.results[(D.rtop || 0) + j])}</td></tr>`).join('')}</table>`;
      const lbl = D.type === 'Inverse Normal' ? '<i>x</i>Inv' : D.type === 'Normal PD' ? '<i>p</i>' : 'P';
      return `<div class="cw-ttl">${D.type}</div><div class="cw-res big">${lbl}=${decHTML(D.result, st.set)}</div>`;
    }
    if (D.view === 'list') {
      const ed = D.ed, top = Math.max(0, Math.min(D.cur - 2, D.list.length - 2)), rows = [top, top + 1, top + 2];
      return `<div class="cw-ttl">${D.type}</div><table class="cw-grid"><tr><th></th><th><i>x</i></th></tr>${rows.map(r => `<tr><td class="rn">${r + 1}</td><td class="${r === D.cur ? 'sel' : ''}">${D.list[r] !== undefined ? decHTML(D.list[r], st.set) : ''}</td></tr>`).join('')}</table><div class="cw-gin">${ed.tokens.length ? renderTokens(ed.tokens, ed.cursor) : ''}</div>`;
    }
    const F = dFields(), ed = D.ed;
    const lines = F.map((k, j) => `<div class="${D.cur === j ? 'sel' : ''}"><span>${PN[k]}</span><span>:${D.cur === j && ed.tokens.length ? renderTokens(ed.tokens, ed.cursor) : decHTML(dVal(k), st.set)}</span></div>`);
    lines.push(`<div class="cw-exec${D.cur === F.length ? ' sel' : ''}">Execute</div>`);
    const top = Math.max(0, Math.min(D.cur - 2, lines.length - 4));
    return `<div class="cw-form">${lines.slice(top, top + 4).join('')}</div>`;
  }
  function tableScreen() {
    const T = apps.table;
    if (!st.fns.f && !st.fns.g) return `<div class="cw-msg"><span>Define <i>f</i>(<i>x</i>) or <i>g</i>(<i>x</i>)</span><span>[TOOLS] or [FUNCTION]</span></div>`;
    if (!T.rows) { const r = tableRows(); if (r.err) return `<div class="cw-errbox"><b>${r.err}</b><span>Change Table Range</span><span>in [TOOLS]</span></div>`; T.rows = r.rows; T.cur = [0, 0]; }
    const showF = T.type !== 'g(x)', showG = T.type !== 'f(x)';
    const cols = [['<i>x</i>', 0], ...(showF ? [['<i>f</i>(<i>x</i>)', 1]] : []), ...(showG ? [['<i>g</i>(<i>x</i>)', 2]] : [])];
    const top = Math.max(0, Math.min(T.cur[0] - 1, T.rows.length - 3));
    const cellv = (v) => v === undefined ? '' : v === null ? '' : v === 'ERROR' ? 'ERROR' : decHTML(Number(v.toPrecision(6)), { ...st.set, sep: false });
    const curCol = Math.min(T.cur[1], cols.length - 1);
    const sel = T.rows[T.cur[0]]?.[cols[curCol][1]];
    return `<table class="cw-grid"><tr><th></th>${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr>${T.rows.slice(top, top + 3).map((r, j) => `<tr><td class="rn">${top + j + 1}</td>${cols.map(([, ci], c) => `<td class="${T.cur[0] === top + j && curCol === c ? 'sel' : ''}">${cellv(r[ci])}</td>`).join('')}</tr>`).join('')}</table>
      <div class="cw-gin">${T.ed.tokens.length ? renderTokens(T.ed.tokens, T.ed.cursor) : sel === undefined || sel === null ? '' : sel === 'ERROR' ? 'ERROR' : decHTML(sel, st.set)}</div>`;
  }
  function draw() {
    if (!panel) return;
    const lcd = panel.querySelector('.cw-lcd');
    lcd.classList.toggle('off', !st.on);
    lcd.style.setProperty('--ink', `rgba(18, 26, 22, ${0.45 + st.set.contrast * 0.055})`);
    lcd.classList.toggle('small', st.set.font === 'Small Font');
    panel.querySelector('.cw-status').innerHTML = st.on ? statusHTML() : '';
    panel.querySelector('.cw-scr').innerHTML = screenHTML();
    panel.querySelector('.cw-keys').classList.toggle('shifted', st.shift);
    const caret = panel.querySelector('.cw-in .cw-caret'); if (caret) caret.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  window.Calc = { open, close, toggle, _test: { evaluate, exactForm, fmtDecimal, cnd, invNorm, binPD, binCD, poiPD, press: (a) => press(a), state: st, apps, screen: () => panel && panel.querySelector('.cw-scr').innerText } };
})();
