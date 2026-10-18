// Trialbank mascot: a cartoon of Jayden, drawn as inline SVG so it can change mood and animate.
(function () {
  const MASCOT = {
    skin: '#f6d6c0', skinShade: '#e9bea2', hair: '#3b2518', hairLight: '#5a3a27', shirt: '#26282d',
    ink: '#1b1d22', cheek: '#f2988a', freckle: '#c98b6c', mouth: '#7a2630', iris: '#4a2e1c', wire: '#9aa4ae',
  };
  const c = MASCOT;
  const ln = (w = 4) => `stroke="${c.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  function arm(x1, y1, x2, y2, cls = '') {   // bare arm with a short black sleeve and a hand
    const sx = x1 + (x2 - x1) * 0.28, sy = y1 + (y2 - y1) * 0.28;
    return `<g class="${cls}"><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c.ink}" stroke-width="22" stroke-linecap="round"/>
      <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c.skin}" stroke-width="14" stroke-linecap="round"/>
      <path d="M${x1} ${y1} L${sx} ${sy}" stroke="${c.ink}" stroke-width="24" stroke-linecap="round"/>
      <path d="M${x1} ${y1} L${sx} ${sy}" stroke="${c.shirt}" stroke-width="17" stroke-linecap="round"/>
      <circle cx="${x2}" cy="${y2 - (y2 < y1 ? 5 : -5)}" r="9.5" fill="${c.skin}" ${ln()}/></g>`;
  }
  const ARMS = {
    down:  [arm(62, 176, 52, 210), arm(138, 176, 148, 210)],
    wave:  [arm(62, 176, 52, 210), arm(138, 176, 166, 128, 'm-arm-r')],
    cheer: [arm(62, 176, 32, 124), arm(138, 176, 168, 124)],
    think: [arm(62, 176, 52, 210), arm(138, 176, 118, 152)],
  };
  // a grin with braces: h is how open the mouth is
  function grin(h) {
    const b = 116 + h;
    const brackets = [86, 93, 100, 107, 114].map(x => { const y = 120.5 + 3.2 * (1 - Math.pow((x - 100) / 16, 2)); return `<rect x="${x - 1.8}" y="${y - 1.8}" width="3.6" height="3.6" rx=".8" fill="#c9d0d8" stroke="${c.wire}" stroke-width=".8"/>`; }).join('');
    return `<path d="M80 115 Q100 ${b + 14} 120 115 Q100 120 80 115Z" fill="${c.mouth}" ${ln(3.5)}/>
      <path d="M82.5 116.3 Q100 121.5 117.5 116.3 L116 ${Math.min(124, b - 2)} Q100 ${Math.min(128, b + 2)} 84 ${Math.min(124, b - 2)} Z" fill="#fff"/>
      <path d="M84 120.5 Q100 126 116 120.5" fill="none" stroke="${c.wire}" stroke-width="1.6"/>${brackets}
      <path d="M80 115 Q100 ${b + 14} 120 115 Q100 120 80 115Z" fill="none" ${ln(3.5)}/>`;
  }
  const eyes = {
    open: `<g class="m-blink"><ellipse cx="80" cy="99" rx="6.2" ry="7.6" fill="${c.iris}"/><ellipse cx="120" cy="99" rx="6.2" ry="7.6" fill="${c.iris}"/>
      <circle cx="80" cy="99.5" r="3.2" fill="${c.ink}"/><circle cx="120" cy="99.5" r="3.2" fill="${c.ink}"/>
      <circle cx="82.5" cy="96" r="2.2" fill="#fff"/><circle cx="122.5" cy="96" r="2.2" fill="#fff"/></g>`,
    smile: `<g class="m-blink"><ellipse cx="80" cy="99" rx="6.2" ry="7.2" fill="${c.iris}"/><ellipse cx="120" cy="99" rx="6.2" ry="7.2" fill="${c.iris}"/>
      <circle cx="80" cy="99.5" r="3.2" fill="${c.ink}"/><circle cx="120" cy="99.5" r="3.2" fill="${c.ink}"/>
      <circle cx="82.5" cy="96" r="2.2" fill="#fff"/><circle cx="122.5" cy="96" r="2.2" fill="#fff"/></g>`,
    joy: `<path d="M72 102 Q80 91 88 102 M112 102 Q120 91 128 102" fill="none" ${ln(5)}/>`,
    up: `<g class="m-blink"><ellipse cx="80" cy="99" rx="7" ry="8.5" fill="#fff" ${ln(2.6)}/><ellipse cx="120" cy="99" rx="7" ry="8.5" fill="#fff" ${ln(2.6)}/>
      <circle cx="83" cy="95" r="4" fill="${c.iris}"/><circle cx="123" cy="95" r="4" fill="${c.iris}"/><circle cx="83" cy="95" r="2" fill="${c.ink}"/><circle cx="123" cy="95" r="2" fill="${c.ink}"/></g>`,
  };
  const brow = (d) => `<path d="${d}" fill="none" stroke="${c.hair}" stroke-width="6" stroke-linecap="round"/>`;
  const FACES = {
    happy: { eyes: eyes.smile, brows: brow('M70 85 Q79 80 89 83 M111 83 Q121 80 130 85'), mouth: grin(6) },
    wave:  { eyes: eyes.smile, brows: brow('M70 83 Q79 77 89 81 M111 81 Q121 77 130 83'), mouth: grin(12) },
    cheer: { eyes: eyes.joy, brows: brow('M70 80 Q79 74 89 78 M111 78 Q121 74 130 80'), mouth: grin(18) },
    sad:   { eyes: eyes.open, brows: brow('M70 90 L88 83 M130 90 L112 83'), mouth: `<path d="M87 128 Q100 118 113 128" fill="none" ${ln()}/>` },
    think: { eyes: eyes.up, brows: brow('M70 87 L88 85 M111 80 Q121 74 130 79'), mouth: `<path d="M90 124 Q100 121 110 125" fill="none" ${ln()}/>` },
  };
  const POSE = { happy: 'down', wave: 'wave', cheer: 'cheer', sad: 'down', think: 'think' };
  const freckles = [[66, 116], [71, 120], [62, 121], [134, 116], [129, 120], [138, 121], [100, 108]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${c.freckle}" opacity=".7"/>`).join('');

  function Mascot(mood = 'happy', label = '') {
    const f = FACES[mood] || FACES.happy, [armL, armR] = ARMS[POSE[mood] || 'down'];
    return `<svg class="mascot ${mood}" viewBox="0 0 200 232" role="img" aria-label="${label || 'Trialbank mascot'}" ${label ? '' : 'aria-hidden="true"'}>
      <ellipse cx="100" cy="226" rx="52" ry="6" fill="rgba(0,0,0,.14)"/>
      <g class="m-body">
        ${armL}
        <path d="M48 226 C46 182 68 156 100 156 C132 156 154 182 152 226 Z" fill="${c.shirt}" ${ln()}/>
        <path d="M86 156 Q100 168 114 156" fill="none" stroke="#3a3d44" stroke-width="3" stroke-linecap="round"/>
        <path d="M88 142 H112 V160 Q100 166 88 160 Z" fill="${c.skinShade}" ${ln()}/>
        <ellipse cx="51" cy="106" rx="9" ry="11" fill="${c.skin}" ${ln()}/><ellipse cx="149" cy="106" rx="9" ry="11" fill="${c.skin}" ${ln()}/>
        <ellipse cx="100" cy="98" rx="50" ry="55" fill="${c.skin}" ${ln()}/>
        <path d="M46 112 C37 96 37 74 45 60 C45 42 61 27 80 23 C97 13 125 13 141 23 C157 31 165 49 159 66 C165 79 161 95 154 104 C156 110 160 114 165 116 C150 119 144 111 143 101 C141 91 138 83 132 77 L127 88 C121 81 116 78 110 76 L103 90 C99 83 95 80 89 78 L80 91 C77 85 72 81 66 80 C62 88 58 98 60 108 C56 110 50 114 46 112 Z" fill="${c.hair}" ${ln()}/>
        <path d="M66 42 C84 30 110 29 130 38 M58 60 C74 48 94 46 112 52 M118 50 C130 52 142 58 150 70" fill="none" stroke="${c.hairLight}" stroke-width="3.2" stroke-linecap="round"/>
        <ellipse cx="68" cy="117" rx="9" ry="5" fill="${c.cheek}" opacity=".35"/><ellipse cx="132" cy="117" rx="9" ry="5" fill="${c.cheek}" opacity=".35"/>
        ${freckles}
        ${f.brows}${f.eyes}${f.mouth}
        ${armR}
      </g></svg>`;
  }
  window.MASCOT = MASCOT;
  window.Mascot = Mascot;
})();
