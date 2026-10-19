// Trialbank calculator, laid out like the Casio fx-8200 AU (ClassWiz): natural textbook display, exact answers
// (fractions, surds, multiples of pi) with S<>D, and the HOME apps students use in HSC maths: Calculate,
// Statistics, Distribution and Table.
(function () {
  // ---------------- maths ----------------
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
  const fact = (n) => { if (n < 0 || !Number.isInteger(n)) return NaN; if (n > 170) return Infinity; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const nCr = (n, r) => { if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || n < 0 || r > n) return r > n ? 0 : NaN; r = Math.min(r, n - r); let v = 1; for (let i = 1; i <= r; i++) v = v * (n - r + i) / i; return Math.round(v); };
  const nPr = (n, r) => { if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || r > n) return r > n ? 0 : NaN; let v = 1; for (let i = 0; i < r; i++) v *= n - i; return v; };
  const binPD = (x, n, p) => (x < 0 || x > n || !Number.isInteger(x)) ? 0 : Math.exp(lgamma(n + 1) - lgamma(x + 1) - lgamma(n - x + 1) + (x ? x * Math.log(p) : 0) + (n - x ? (n - x) * Math.log(1 - p) : 0));
  const binCD = (x, n, p) => { let s = 0; for (let k = 0; k <= Math.min(Math.floor(x), n); k++) s += binPD(k, n, p); return Math.min(1, s); };

  // ---------------- input tokens ----------------
  // templates open a group closed by ')' and split by ',': frac( sqrt( cbrt( root( pow( exp10( expe( logb( and functions
  const OPENERS = new Set(['(', 'frac(', 'sqrt(', 'cbrt(', 'root(', 'pow(', 'exp10(', 'expe(', 'logb(', 'sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'ln(', 'log(', 'abs(']);
  const FN = { 'sin(': 'sin', 'cos(': 'cos', 'tan(': 'tan', 'asin(': 'sin<sup>−1</sup>', 'acos(': 'cos<sup>−1</sup>', 'atan(': 'tan<sup>−1</sup>', 'ln(': 'ln', 'log(': 'log', 'abs(': 'Abs' };
  const SHOW = { '×': '×', '÷': '÷', '+': '+', '-': '−', 'neg': '−', 'ᴇ': '<span class="cz-e">ᴇ</span>', '²': '<sup>2</sup>', '³': '<sup>3</sup>', '⁻¹': '<sup>−1</sup>', '!': '!', 'π': 'π', 'e': '<i>e</i>', 'Ans': 'Ans', 'x': '<i>x</i>', 'nCr': '<span class="cz-op">C</span>', 'nPr': '<span class="cz-op">P</span>', ',': ',', '^': '^' };

  // evaluate tokens (recursive descent). deg: angle mode in degrees
  function evaluate(tokens, env) {
    let i = 0;
    const peek = () => tokens[i], next = () => tokens[i++];
    const toRad = (v) => env.deg ? v * Math.PI / 180 : v, fromRad = (v) => env.deg ? v * 180 / Math.PI : v;
    const fix = (v) => Math.abs(v) < 1e-14 ? 0 : v;
    function args() { const a = [expr()]; while (peek() === ',') { next(); a.push(expr()); } if (peek() === ')') next(); return a; }
    function primary() {
      const t = next();
      if (t === undefined) throw new Error('Syntax ERROR');
      if (/^[0-9.]$/.test(t)) {
        let s = t; while (/^[0-9.]$/.test(peek() ?? '')) s += next();
        if (peek() === 'ᴇ') { next(); let es = ''; if (peek() === 'neg' || peek() === '-') { next(); es = '-'; } while (/^[0-9]$/.test(peek() ?? '')) es += next(); s += 'e' + (es || '0'); }
        const v = Number(s); if (Number.isNaN(v)) throw new Error('Syntax ERROR'); return v;
      }
      if (t === 'π') return Math.PI;
      if (t === 'e') return Math.E;
      if (t === 'Ans') return env.ans;
      if (t === 'x') return env.x ?? 0;
      if (t === '(') { const v = expr(); if (peek() === ')') next(); return v; }
      if (t === 'neg' || t === '-') return -power();
      if (OPENERS.has(t)) {
        const a = args();
        switch (t) {
          case 'frac(': if (a[1] === 0) throw new Error('Math ERROR'); return a[0] / a[1];
          case 'sqrt(': if (a[0] < 0) throw new Error('Math ERROR'); return Math.sqrt(a[0]);
          case 'cbrt(': return Math.cbrt(a[0]);
          case 'root(': return a[1] < 0 && a[0] % 2 === 1 ? -Math.pow(-a[1], 1 / a[0]) : Math.pow(a[1], 1 / a[0]);
          case 'exp10(': return Math.pow(10, a[0]);
          case 'expe(': return Math.exp(a[0]);
          case 'logb(': return Math.log(a[1]) / Math.log(a[0]);
          case 'sin(': return fix(Math.sin(toRad(a[0])));
          case 'cos(': return fix(Math.cos(toRad(a[0])));
          case 'tan(': { const c = Math.cos(toRad(a[0])); if (Math.abs(c) < 1e-15) throw new Error('Math ERROR'); return fix(Math.tan(toRad(a[0]))); }
          case 'asin(': if (Math.abs(a[0]) > 1) throw new Error('Math ERROR'); return fromRad(Math.asin(a[0]));
          case 'acos(': if (Math.abs(a[0]) > 1) throw new Error('Math ERROR'); return fromRad(Math.acos(a[0]));
          case 'atan(': return fromRad(Math.atan(a[0]));
          case 'ln(': if (a[0] <= 0) throw new Error('Math ERROR'); return Math.log(a[0]);
          case 'log(': if (a[0] <= 0) throw new Error('Math ERROR'); return Math.log10(a[0]);
          case 'abs(': return Math.abs(a[0]);
          case 'pow(': throw new Error('Syntax ERROR');
        }
      }
      throw new Error('Syntax ERROR');
    }
    function postfix() {
      let v = primary();
      for (;;) {
        const t = peek();
        if (t === '²') { next(); v = v * v; }
        else if (t === '³') { next(); v = v * v * v; }
        else if (t === '⁻¹') { next(); if (v === 0) throw new Error('Math ERROR'); v = 1 / v; }
        else if (t === '!') { next(); v = fact(v); if (Number.isNaN(v)) throw new Error('Math ERROR'); }
        else if (t === 'pow(') { next(); const e = args()[0]; v = Math.pow(v, e); }
        else break;
      }
      return v;
    }
    function power() {
      const b = postfix();
      if (peek() === '^') { next(); const e = unary(); return Math.pow(b, e); }
      return b;
    }
    function unary() { if (peek() === 'neg' || peek() === '-') { next(); return -unary(); } return power(); }
    const startsPrimary = (t) => t !== undefined && (/^[0-9.]$/.test(t) || t === 'π' || t === 'e' || t === 'Ans' || t === 'x' || t === '(' || (OPENERS.has(t) && t !== 'pow('));
    function perm() {
      let v = unary();
      while (peek() === 'nCr' || peek() === 'nPr') { const op = next(); const r = unary(); v = op === 'nCr' ? nCr(v, r) : nPr(v, r); if (Number.isNaN(v)) throw new Error('Math ERROR'); }
      return v;
    }
    function term() {
      let v = perm();
      for (;;) {
        const t = peek();
        if (t === '×') { next(); v *= perm(); }
        else if (t === '÷') { next(); const d = perm(); if (d === 0) throw new Error('Math ERROR'); v /= d; }
        else if (startsPrimary(t)) v *= perm();          // implicit multiplication: 2π, 3sin(30), 2(4)
        else break;
      }
      return v;
    }
    function expr() {
      let v = term();
      for (;;) {
        if (peek() === '+') { next(); v += term(); }
        else if (peek() === '-') { next(); v -= term(); }
        else break;
      }
      return v;
    }
    const v = expr();
    if (i < tokens.length) throw new Error('Syntax ERROR');
    if (!Number.isFinite(v)) throw new Error('Math ERROR');
    return v;
  }

  // typed text (Table app) -> tokens
  function textTokens(s) {
    const out = []; let i = 0; s = s.replace(/\s+/g, '').replace(/\*\*/g, '^');
    const fns = [['sqrt(', 'sqrt('], ['asin(', 'asin('], ['acos(', 'acos('], ['atan(', 'atan('], ['sin(', 'sin('], ['cos(', 'cos('], ['tan(', 'tan('], ['ln(', 'ln('], ['log(', 'log('], ['abs(', 'abs(']];
    while (i < s.length) {
      const rest = s.slice(i), f = fns.find(([k]) => rest.startsWith(k));
      if (f) { out.push(f[1]); i += f[0].length; continue; }
      if (rest.startsWith('pi')) { out.push('π'); i += 2; continue; }
      const ch = s[i++];
      if (/[0-9.]/.test(ch)) out.push(ch);
      else if (ch === 'x' || ch === 'X') out.push('x');
      else if (ch === 'e') out.push('e');
      else if (ch === 'π') out.push('π');
      else if (ch === '*') out.push('×'); else if (ch === '/') out.push('÷');
      else if (ch === '+') out.push('+');
      else if (ch === '-') out.push(out.length && !['(', '+', '-', '×', '÷', '^'].includes(out[out.length - 1]) && !OPENERS.has(out[out.length - 1]) ? '-' : 'neg');
      else if ('(),^!'.includes(ch)) out.push(ch);
      else throw new Error('Syntax ERROR');
    }
    return out;
  }

  // ---------------- exact answers ----------------
  function ratio(v, maxDen = 10000) {    // best rational p/q within tolerance (continued fraction)
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
  const fracHTML = (p, q, inner = '') => {
    const neg = p < 0; p = Math.abs(p);
    const top = inner ? (p === 1 ? inner : p + inner) : String(p);
    return (neg ? '−' : '') + (q === 1 ? top : `<span class="cz-f"><span>${top}</span><span>${q}</span></span>`);
  };
  function exact(v) {     // html for an exact form, or null
    if (Math.abs(v) > 1e10 || v === 0) return null;
    const r = ratio(v, 10000); if (r) return r[1] === 1 ? null : fracHTML(r[0], r[1]);
    const rp = ratio(v / Math.PI, 500); if (rp) return fracHTML(rp[0], rp[1], 'π');
    for (const n of SQF) { const rs = ratio(v / Math.sqrt(n), 200); if (rs) return fracHTML(rs[0], rs[1], `√<span class="cz-ol">${n}</span>`); }
    return null;
  }
  function decimal(v) {   // 10 significant digits like the calculator
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e10 || a < 1e-9) { const [m, e] = v.toExponential(9).split('e'); return `${trimZ(m)}<span class="cz-e">×10<sup>${Number(e)}</sup></span>`; }
    return trimZ(Number(v.toPrecision(10)).toString()).replace('-', '−');
  }
  const trimZ = (s) => s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;

  // ---------------- rendering the input naturally ----------------
  function renderTokens(tokens, cursor) {
    const t = tokens.slice(0, cursor).concat(['|'], tokens.slice(cursor));
    let i = 0;
    const group = () => {                 // until ',' or ')' or end
      let html = '', any = false;
      while (i < t.length && t[i] !== ',' && t[i] !== ')') { const [h, real] = item(); html += h; if (real) any = true; }
      return { html, any };
    };
    const box = (g) => g.any ? g.html : `<span class="cz-box">${g.html}</span>`;
    const close = () => { if (t[i] === ')') { i++; return true; } return false; };
    const sep = () => { if (t[i] === ',') { i++; return true; } return false; };
    function item() {
      const k = t[i++];
      if (k === '|') return ['<span class="cz-caret"></span>', false];
      if (k === 'frac(') { const a = group(); sep(); const b = group(); close(); return [`<span class="cz-f"><span>${box(a)}</span><span>${box(b)}</span></span>`, true]; }
      if (k === 'sqrt(' || k === 'cbrt(') { const a = group(); close(); return [`${k === 'cbrt(' ? '<sup class="cz-ri">3</sup>' : ''}√<span class="cz-ol">${box(a)}</span>`, true]; }
      if (k === 'root(') { const n = group(); sep(); const a = group(); close(); return [`<sup class="cz-ri">${box(n)}</sup>√<span class="cz-ol">${box(a)}</span>`, true]; }
      if (k === 'pow(') { const a = group(); close(); return [`<sup>${box(a)}</sup>`, true]; }
      if (k === 'exp10(' || k === 'expe(') { const a = group(); close(); return [`${k === 'exp10(' ? '10' : '<i>e</i>'}<sup>${box(a)}</sup>`, true]; }
      if (k === 'logb(') { const b = group(); sep(); const a = group(); close(); return [`log<sub>${box(b)}</sub>(${box(a)})`, true]; }
      if (FN[k] || k === '(') { const a = group(); const shut = close(); return [`${FN[k] || ''}(${a.html}${shut ? ')' : '<span class="cz-ghost">)</span>'}`, true]; }
      if (k === ')') return [')', true];
      return [SHOW[k] ?? k, true];
    }
    let out = '';
    while (i < t.length) { if (t[i] === ')' || t[i] === ',') { out += t[i] === ')' ? ')' : ','; i++; continue; } out += item()[0]; }
    return out;
  }

  // ---------------- the calculator ----------------
  let panel = null;
  const st = { tokens: [], cursor: 0, ans: 0, shift: false, alpha: false, deg: true, result: null, showDec: false, app: 'calc', error: null };
  try { Object.assign(st, { deg: localStorage.getItem('tb_calc_deg') !== '0' }); } catch { /* defaults */ }

  const KEYS = [
    // [label, action, shift label, shift action]
    [['SHIFT', 'shift'], ['ALPHA', 'alpha'], ['◀', 'left'], ['▶', 'right'], ['TOOLS', 'tools', '', ''], ['HOME', 'home']],
    [['<i>x</i>', 'x'], ['<span class="cz-k-f">▭<br>▭</span>', 'frac('], ['√▭', 'sqrt(', '∛▭', 'cbrt('], ['<i>x</i><sup>2</sup>', '²', '<i>x</i><sup>3</sup>', '³'], ['<i>x</i><sup>▭</sup>', 'pow(', '<sup>▭</sup>√▭', 'root('], ['log<sub>▭</sub>▭', 'logb(']],
    [['log', 'log(', '10<sup>▭</sup>', 'exp10('], ['ln', 'ln(', '<i>e</i><sup>▭</sup>', 'expe('], ['(−)', 'neg'], ['sin', 'sin(', 'sin<sup>−1</sup>', 'asin('], ['cos', 'cos(', 'cos<sup>−1</sup>', 'acos('], ['tan', 'tan(', 'tan<sup>−1</sup>', 'atan(']],
    [['(', '('], [')', ')'], [',', ','], ['<i>x</i><sup>−1</sup>', '⁻¹', '<i>x</i>!', '!'], ['S⇔D', 'sd'], ['Abs', 'abs(']],
  ];
  const PAD = [
    [['7', '7'], ['8', '8'], ['9', '9'], ['DEL', 'del', 'INS', ''], ['AC', 'ac']],
    [['4', '4'], ['5', '5'], ['6', '6'], ['×', '×', '<i>n</i>P<i>r</i>', 'nPr'], ['÷', '÷', '<i>n</i>C<i>r</i>', 'nCr']],
    [['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'], ['−', '-']],
    [['0', '0'], ['.', '.'], ['×10<sup><i>x</i></sup>', 'ᴇ', 'π', 'π'], ['Ans', 'Ans', '<i>e</i>', 'e'], ['=', 'eq']],
  ];
  const keyHTML = (rows, cls) => rows.map(r => `<div class="cz-row ${cls}">${r.map(([l, a, sl, sa]) =>
    `<div class="cz-kw">${sl ? `<span class="cz-sh">${sl}</span>` : '<span class="cz-sh"></span>'}<button type="button" class="cz-key${a === 'eq' ? ' eq' : ''}${a === 'ac' || a === 'del' ? ' red' : ''}${a === 'shift' ? ' shift' : ''}" data-a="${a}" data-s="${sa ?? ''}">${l}</button></div>`).join('')}</div>`).join('');

  function open() {
    if (!panel) build();
    panel.hidden = false; document.body.classList.add('calc-open');
    draw();
  }
  function close() { if (panel) panel.hidden = true; document.body.classList.remove('calc-open'); }
  function toggle() { panel && !panel.hidden ? close() : open(); }

  function build() {
    panel = document.createElement('div'); panel.className = 'cz'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Calculator');
    panel.innerHTML = `
      <div class="cz-top"><span class="cz-brand">CASIO-style · fx-8200 AU layout</span><button type="button" class="cz-x" aria-label="Close calculator">×</button></div>
      <div class="cz-screen" aria-live="polite"><div class="cz-status"></div><div class="cz-body"></div></div>
      <div class="cz-keys">${keyHTML(KEYS, 'fn')}${keyHTML(PAD, 'num')}</div>`;
    document.body.appendChild(panel);
    panel.querySelector('.cz-x').onclick = close;
    panel.querySelector('.cz-keys').addEventListener('click', (ev) => {
      const b = ev.target.closest('.cz-key'); if (!b) return;
      press(st.shift && b.dataset.s ? b.dataset.s : b.dataset.a, b.dataset.a);
    });
    // drag by the top bar (desktop and iPad)
    const top = panel.querySelector('.cz-top'); let drag = null;
    top.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; const r = panel.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; top.setPointerCapture(e.pointerId); });
    top.addEventListener('pointermove', (e) => { if (!drag) return; panel.style.left = Math.max(0, Math.min(innerWidth - 60, e.clientX - drag.dx)) + 'px'; panel.style.top = Math.max(0, Math.min(innerHeight - 60, e.clientY - drag.dy)) + 'px'; panel.style.right = 'auto'; panel.style.bottom = 'auto'; });
    top.addEventListener('pointerup', () => { drag = null; });
    // physical keyboard while open
    document.addEventListener('keydown', (e) => {
      if (!panel || panel.hidden || st.app !== 'calc' || e.target.closest('input, textarea, select')) return;
      const map = { Enter: 'eq', '=': 'eq', Backspace: 'del', Escape: 'ac', ArrowLeft: 'left', ArrowRight: 'right', '*': '×', '/': '÷', '+': '+', '-': '-', '(': '(', ')': ')', '.': '.', '^': 'pow(', '!': '!', ',': ',', x: 'x' };
      const a = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
      if (a) { e.preventDefault(); press(a, a); }
    });
  }

  function insert(tok) {
    if (st.result !== null) {    // typing after an answer: an operator continues from Ans, anything else starts fresh
      const cont = ['+', '-', '×', '÷', '²', '³', '⁻¹', '!', 'pow(', 'nCr', 'nPr'].includes(tok);
      st.tokens = cont ? ['Ans'] : []; st.cursor = st.tokens.length; st.result = null; st.error = null;
    }
    // boxes (fraction, root, power...) close themselves; sin( log( ( stay open like on the Casio
    const box = ['frac(', 'sqrt(', 'cbrt(', 'root(', 'pow(', 'exp10(', 'expe(', 'logb('].includes(tok);
    const extra = tok === 'frac(' || tok === 'root(' || tok === 'logb(' ? [',', ')'] : box ? [')'] : [];
    st.tokens.splice(st.cursor, 0, tok, ...extra);
    st.cursor += 1;
  }
  function matchClose(at) {   // index of the ')' that closes the opener at `at`, and its top-level commas
    let depth = 0; const commas = [];
    for (let j = at + 1; j < st.tokens.length; j++) {
      const k = st.tokens[j];
      if (OPENERS.has(k)) depth++;
      else if (k === ')') { if (depth === 0) return { close: j, commas }; depth--; }
      else if (k === ',' && depth === 0) commas.push(j);
    }
    return { close: -1, commas };
  }
  function del() {
    if (st.result !== null) { st.result = null; st.error = null; st.cursor = st.tokens.length; return; }
    if (st.cursor === 0) return;
    const k = st.tokens[st.cursor - 1];
    if (k === ')' || k === ',') { st.cursor--; return; }      // step out of a template instead of breaking it
    if (OPENERS.has(k)) {
      const { close: c, commas } = matchClose(st.cursor - 1);
      const drop = new Set([st.cursor - 1, ...commas, ...(c >= 0 && k !== '(' ? [c] : k === '(' && c >= 0 ? [c] : [])]);
      st.tokens = st.tokens.filter((_, j) => !drop.has(j)); st.cursor--; return;
    }
    st.tokens.splice(st.cursor - 1, 1); st.cursor--;
  }
  function press(a) {
    const wasShift = st.shift; st.shift = false;
    if (a === 'shift') { st.shift = !wasShift; return draw(); }
    if (a === 'alpha') { st.alpha = !st.alpha; return draw(); }
    if (a === 'home') { st.app = st.app === 'home' ? 'calc' : 'home'; return draw(); }
    if (a === 'tools') { st.deg = !st.deg; try { localStorage.setItem('tb_calc_deg', st.deg ? '1' : '0'); } catch { /* blocked */ } if (st.result !== null) calc(); return draw(); }
    if (st.app !== 'calc') { if (a === 'ac') { st.app = 'calc'; } return draw(); }
    if (a === 'ac') { st.tokens = []; st.cursor = 0; st.result = null; st.error = null; return draw(); }
    if (a === 'del') { del(); return draw(); }
    if (a === 'left') { if (st.result !== null) { st.result = null; st.cursor = st.tokens.length; } else st.cursor = st.cursor > 0 ? st.cursor - 1 : st.tokens.length; return draw(); }
    if (a === 'right') { if (st.result !== null) { st.result = null; st.cursor = 0; } else st.cursor = st.cursor < st.tokens.length ? st.cursor + 1 : 0; return draw(); }
    if (a === 'sd') { if (st.result !== null) st.showDec = !st.showDec; return draw(); }
    if (a === 'eq') { calc(); return draw(); }
    if (!a) return draw();
    insert(a); draw();
  }
  function calc() {
    if (!st.tokens.length) return;
    try {
      st.result = evaluate(st.tokens, { deg: st.deg, ans: st.ans });
      st.ans = st.result; st.error = null; st.showDec = false;
    } catch (e) { st.error = e.message; st.result = null; }
  }

  // ---------------- apps ----------------
  const APPS = [['calc', 'Calculate', '1'], ['stat', 'Statistics', '2'], ['dist', 'Distribution', '3'], ['table', 'Table', '4']];
  function draw() {
    if (!panel) return;
    panel.querySelector('.cz-status').innerHTML = `${st.shift ? '<b class="cz-s">S</b>' : ''}${st.alpha ? '<b class="cz-a">A</b>' : ''}<span>${st.deg ? 'D' : 'R'}</span><span class="cz-appn">${APPS.find(x => x[0] === st.app)?.[1] ?? 'HOME'}</span>`;
    panel.querySelector('.cz-keys').classList.toggle('shifted', st.shift);
    const body = panel.querySelector('.cz-body');
    panel.classList.toggle('in-app', st.app !== 'calc');
    if (st.app === 'home') {
      body.innerHTML = `<div class="cz-home">${APPS.map(([k, n, i]) => `<button type="button" data-app="${k}"><b>${i}</b><span>${n}</span></button>`).join('')}</div>`;
      body.querySelectorAll('[data-app]').forEach(b => b.onclick = () => { st.app = b.dataset.app; draw(); });
      return;
    }
    if (st.app === 'calc') {
      let res = '';
      if (st.error) res = `<div class="cz-err">${st.error}</div>`;
      else if (st.result !== null) {
        const ex = exact(st.result);
        res = `<div class="cz-res">${!st.showDec && ex ? ex : decimal(st.result)}</div>`;
      }
      body.innerHTML = `<div class="cz-in">${renderTokens(st.tokens, st.result === null && !st.error ? st.cursor : -1).replace('<span class="cz-caret"></span>', st.result === null && !st.error ? '<span class="cz-caret"></span>' : '')}</div>${res}`;
      if (st.result !== null || st.error) body.querySelector('.cz-caret')?.remove();
      return;
    }
    if (st.app === 'dist') return drawDist(body);
    if (st.app === 'stat') return drawStat(body);
    if (st.app === 'table') return drawTable(body);
  }
  const num = (v) => { const x = Number(String(v).trim()); return Number.isFinite(x) ? x : NaN; };
  const fmt = (v) => Number.isFinite(v) ? decimal(v) : '<span class="cz-err">Math ERROR</span>';
  let dist = 'ncd';
  const DISTS = { npd: ['Normal PD', [['x', 'x'], ['σ', '1'], ['μ', '0']]], ncd: ['Normal CD', [['Lower', 'lo'], ['Upper', 'hi'], ['σ', '1'], ['μ', '0']]],
    inv: ['Inverse Normal', [['Area', 'area'], ['σ', '1'], ['μ', '0']]], bpd: ['Binomial PD', [['x', 'x'], ['N', 'n'], ['p', 'p']]], bcd: ['Binomial CD', [['x', 'x'], ['N', 'n'], ['p', 'p']]] };
  const distVals = {};
  function drawDist(body) {
    const [name, fields] = DISTS[dist];
    body.innerHTML = `<div class="cz-app"><select class="cz-sel">${Object.entries(DISTS).map(([k, [n]]) => `<option value="${k}"${k === dist ? ' selected' : ''}>${n}</option>`).join('')}</select>
      ${fields.map(([l, d]) => `<label class="cz-fld"><span>${l}</span><input inputmode="decimal" data-k="${dist}:${l}" value="${distVals[dist + ':' + l] ?? (/^[0-9]/.test(d) ? d : '')}"></label>`).join('')}
      <div class="cz-out"></div>${dist === 'ncd' ? '<p class="cz-tip">Leave Lower or Upper blank for −∞ or +∞.</p>' : dist === 'inv' ? '<p class="cz-tip">Area is the left tail, P(X ≤ x).</p>' : dist === 'bcd' ? '<p class="cz-tip">Gives P(X ≤ x).</p>' : ''}</div>`;
    body.querySelector('.cz-sel').onchange = (e) => { dist = e.target.value; draw(); };
    const run = () => {
      const g = (l) => { const el = body.querySelector(`[data-k="${dist}:${l}"]`); distVals[dist + ':' + l] = el.value; return el.value; };
      let out = '';
      if (dist === 'npd') { const x = num(g('x')), s = num(g('σ')), m = num(g('μ')); out = `p = ${fmt(Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)))}`; }
      if (dist === 'ncd') { const lo = g('Lower').trim() === '' ? -Infinity : num(g('Lower')), hi = g('Upper').trim() === '' ? Infinity : num(g('Upper')), s = num(g('σ')), m = num(g('μ')); const z = (v) => v === Infinity ? 1 : v === -Infinity ? 0 : cnd((v - m) / s); out = `P = ${fmt(z(hi) - z(lo))}`; }
      if (dist === 'inv') { const a = num(g('Area')), s = num(g('σ')), m = num(g('μ')); out = `x = ${fmt(m + s * invNorm(a))}`; }
      if (dist === 'bpd' || dist === 'bcd') { const x = num(g('x')), n = num(g('N')), p = num(g('p')); const v = (n >= 0 && Number.isInteger(n) && p >= 0 && p <= 1) ? (dist === 'bpd' ? binPD(x, n, p) : binCD(x, n, p)) : NaN; out = `P = ${fmt(v)}`; }
      body.querySelector('.cz-out').innerHTML = out.includes('NaN') ? '' : out;
    };
    body.querySelectorAll('input').forEach(i => i.oninput = run); run();
  }
  let statX = '', statY = '';
  function quart(sorted) {   // Casio: median of each half, excluding the median when n is odd
    const n = sorted.length, med = (a) => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    const lo = sorted.slice(0, Math.floor(n / 2)), hi = sorted.slice(Math.ceil(n / 2));
    return [n > 1 ? med(lo) : sorted[0], med(sorted), n > 1 ? med(hi) : sorted[0]];
  }
  function drawStat(body) {
    body.innerHTML = `<div class="cz-app"><label class="cz-fld wide"><span><i>x</i></span><input data-s="x" value="${statX}" placeholder="e.g. 3, 5, 7, 8"></label>
      <label class="cz-fld wide"><span><i>y</i></span><input data-s="y" value="${statY}" placeholder="optional, for y = a + bx"></label><div class="cz-out stat"></div></div>`;
    const run = () => {
      statX = body.querySelector('[data-s=x]').value; statY = body.querySelector('[data-s=y]').value;
      const xs = statX.split(/[\s,;]+/).filter(Boolean).map(Number), ys = statY.split(/[\s,;]+/).filter(Boolean).map(Number);
      const out = body.querySelector('.cz-out');
      if (!xs.length || xs.some(Number.isNaN)) { out.innerHTML = ''; return; }
      const n = xs.length, sx = xs.reduce((a, b) => a + b, 0), sxx = xs.reduce((a, b) => a + b * b, 0), mean = sx / n;
      const pop = Math.sqrt(Math.max(0, sxx / n - mean * mean)), samp = n > 1 ? Math.sqrt(Math.max(0, (sxx - n * mean * mean) / (n - 1))) : NaN;
      const s = [...xs].sort((a, b) => a - b), [q1, md, q3] = quart(s);
      let html = `<table>${[['<i>x̄</i>', mean], ['Σ<i>x</i>', sx], ['Σ<i>x</i>²', sxx], ['σ<i>x</i>', pop], ['s<i>x</i>', samp], ['<i>n</i>', n], ['min', s[0]], ['Q₁', q1], ['Med', md], ['Q₃', q3], ['max', s[n - 1]]].map(([l, v]) => `<tr><td>${l}</td><td>${fmt(v)}</td></tr>`).join('')}</table>`;
      if (ys.length === n && !ys.some(Number.isNaN)) {
        const my = ys.reduce((a, b) => a + b, 0) / n;
        let sxy = 0, sxx2 = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mean) * (ys[i] - my); sxx2 += (x - mean) ** 2; syy += (ys[i] - my) ** 2; });
        const b = sxy / sxx2, a = my - b * mean, r = sxy / Math.sqrt(sxx2 * syy);
        html += `<p class="cz-tip"><b>y = a + bx</b></p><table>${[['a', a], ['b', b], ['r', r], ['<i>ȳ</i>', my]].map(([l, v]) => `<tr><td>${l}</td><td>${fmt(v)}</td></tr>`).join('')}</table>`;
      } else if (statY.trim()) html += '<p class="cz-tip">y needs the same number of values as x.</p>';
      out.innerHTML = html;
    };
    body.querySelectorAll('input').forEach(i => i.oninput = run); run();
  }
  const tbl = { f: 'x^2', start: '1', end: '5', step: '1' };
  function drawTable(body) {
    body.innerHTML = `<div class="cz-app"><label class="cz-fld wide"><span>f(<i>x</i>)=</span><input data-t="f" value="${tbl.f}"></label>
      <div class="cz-3">${['start', 'end', 'step'].map(k => `<label class="cz-fld"><span>${k[0].toUpperCase() + k.slice(1)}</span><input inputmode="decimal" data-t="${k}" value="${tbl[k]}"></label>`).join('')}</div><div class="cz-out stat"></div></div>`;
    const run = () => {
      body.querySelectorAll('[data-t]').forEach(i => { tbl[i.dataset.t] = i.value; });
      const out = body.querySelector('.cz-out');
      try {
        const toks = textTokens(tbl.f), a = num(tbl.start), b = num(tbl.end), h = num(tbl.step);
        if (!(h > 0) || !Number.isFinite(a) || !Number.isFinite(b) || (b - a) / h > 199) { out.innerHTML = '<p class="cz-tip">Up to 200 rows.</p>'; return; }
        let rows = '';
        for (let k = 0; a + k * h <= b + 1e-12; k++) {
          const x = Number((a + k * h).toPrecision(12)); let y;
          try { y = fmt(evaluate(toks, { deg: st.deg, ans: st.ans, x })); } catch { y = 'ERROR'; }
          rows += `<tr><td>${decimal(x)}</td><td>${y}</td></tr>`;
        }
        out.innerHTML = `<table><tr><th><i>x</i></th><th>f(<i>x</i>)</th></tr>${rows}</table>`;
      } catch (e) { out.innerHTML = `<span class="cz-err">${e.message}</span>`; }
    };
    body.querySelectorAll('input').forEach(i => i.oninput = run); run();
  }

  window.Calc = { open, close, toggle, _test: { evaluate, exact, textTokens, cnd, invNorm, binPD, binCD, decimal } };
})();
