// Trialbank mascot: a cartoon student drawn as inline SVG so it can change mood and animate.
// MASCOT holds the look; tweak it once the real character is designed.
(function () {
  const MASCOT = {
    skin: '#f6c9a4', skinShade: '#e7ae86', hair: '#3b2a20', hoodie: '#ffd23f', hoodieShade: '#f0b81f',
    ink: '#1f2329', cheek: '#ff8a7a', mouth: '#8a2f2f', tongue: '#ff7b7b',
  };
  const c = MASCOT;
  const ln = (w = 4) => `stroke="${c.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const line = ln();
  function arm(x1, y1, x2, y2, cls = '') {   // sleeve with an outline, then a hand
    return `<g class="${cls}"><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c.ink}" stroke-width="25" stroke-linecap="round"/>
      <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c.hoodie}" stroke-width="17" stroke-linecap="round"/>
      <circle cx="${x2}" cy="${y2 - (y2 < y1 ? 6 : -6)}" r="10" fill="${c.skin}" ${line}/></g>`;
  }
  const ARMS = {
    down:  [arm(60, 176, 50, 208), arm(140, 176, 150, 208)],
    wave:  [arm(60, 176, 50, 208), arm(140, 176, 166, 128, 'm-arm-r')],
    cheer: [arm(60, 176, 32, 124), arm(140, 176, 168, 124)],
    think: [arm(60, 176, 50, 208), arm(140, 176, 120, 150)],
  };
  const eyes = {
    open: `<g class="m-blink"><ellipse cx="80" cy="98" rx="6.5" ry="8.5" fill="${c.ink}"/><ellipse cx="120" cy="98" rx="6.5" ry="8.5" fill="${c.ink}"/>
      <circle cx="82.5" cy="94.5" r="2.4" fill="#fff"/><circle cx="122.5" cy="94.5" r="2.4" fill="#fff"/></g>`,
    joy: `<path d="M72 101 Q80 89 88 101 M112 101 Q120 89 128 101" fill="none" ${ln(5)}/>`,
    up: `<g class="m-blink"><ellipse cx="80" cy="98" rx="6.5" ry="8.5" fill="#fff" ${ln(3)}/><ellipse cx="120" cy="98" rx="6.5" ry="8.5" fill="#fff" ${ln(3)}/>
      <circle cx="83" cy="94" r="3.6" fill="${c.ink}"/><circle cx="123" cy="94" r="3.6" fill="${c.ink}"/></g>`,
  };
  const FACES = {
    happy: { eyes: eyes.open, brows: `<path d="M70 82 Q80 77 89 81 M111 81 Q120 77 130 82" fill="none" ${line}/>`, mouth: `<path d="M86 117 Q100 130 114 117" fill="none" ${line}/>` },
    wave:  { eyes: eyes.open, brows: `<path d="M70 80 Q80 74 89 79 M111 79 Q120 74 130 80" fill="none" ${line}/>`,
             mouth: `<path d="M84 115 Q100 140 116 115 Q100 120 84 115Z" fill="${c.mouth}" ${ln(3.5)}/><path d="M92 127 Q100 122 108 127 Q100 133 92 127Z" fill="${c.tongue}"/>` },
    cheer: { eyes: eyes.joy, brows: `<path d="M70 78 Q80 72 89 77 M111 77 Q120 72 130 78" fill="none" ${line}/>`,
             mouth: `<path d="M82 114 Q100 144 118 114 Q100 119 82 114Z" fill="${c.mouth}" ${ln(3.5)}/><path d="M91 129 Q100 123 109 129 Q100 136 91 129Z" fill="${c.tongue}"/>` },
    sad:   { eyes: eyes.open, brows: `<path d="M70 88 L88 81 M130 88 L112 81" fill="none" ${line}/>`, mouth: `<path d="M87 126 Q100 116 113 126" fill="none" ${line}/>` },
    think: { eyes: eyes.up, brows: `<path d="M70 84 L88 82 M111 78 Q120 72 130 77" fill="none" ${line}/>`, mouth: `<path d="M90 122 Q100 119 110 124" fill="none" ${line}/>` },
  };
  const POSE = { happy: 'down', wave: 'wave', cheer: 'cheer', sad: 'down', think: 'think' };

  function Mascot(mood = 'happy', label = '') {
    const f = FACES[mood] || FACES.happy, [armL, armR] = ARMS[POSE[mood] || 'down'];
    return `<svg class="mascot ${mood}" viewBox="0 0 200 232" role="img" aria-label="${label || 'Trialbank mascot'}" ${label ? '' : 'aria-hidden="true"'}>
      <ellipse cx="100" cy="226" rx="52" ry="6" fill="rgba(0,0,0,.14)"/>
      <g class="m-body">
        ${armL}
        <path d="M46 226 C44 180 66 152 100 152 C134 152 156 180 154 226 Z" fill="${c.hoodie}" ${line}/>
        <path d="M76 202 Q100 196 124 202 L120 222 H80 Z" fill="${c.hoodieShade}" ${ln(3)}/>
        <path d="M90 156 L88 182 M110 156 L112 182" fill="none" ${ln(3)}/>
        <circle cx="88" cy="186" r="3" fill="${c.ink}"/><circle cx="112" cy="186" r="3" fill="${c.ink}"/>
        <path d="M86 140 H114 V160 Q100 168 86 160 Z" fill="${c.skinShade}" ${line}/>
        <circle cx="46" cy="102" r="11" fill="${c.skin}" ${line}/><circle cx="154" cy="102" r="11" fill="${c.skin}" ${line}/>
        <circle cx="100" cy="94" r="55" fill="${c.skin}" ${line}/>
        <path d="M45 98 C38 50 70 30 102 32 C138 34 164 58 155 100 C151 86 145 77 137 72 C130 81 118 83 110 75 C100 85 84 85 76 75 C67 83 56 87 45 98 Z" fill="${c.hair}" ${line}/>
        <path d="M96 35 C97 22 110 16 118 23 C109 25 105 30 105 37 Z" fill="${c.hair}" ${ln(3.5)}/>
        <ellipse cx="67" cy="114" rx="9" ry="5.5" fill="${c.cheek}" opacity=".45"/><ellipse cx="133" cy="114" rx="9" ry="5.5" fill="${c.cheek}" opacity=".45"/>
        ${f.brows}${f.eyes}${f.mouth}
        ${armR}
      </g></svg>`;
  }
  window.MASCOT = MASCOT;
  window.Mascot = Mascot;
})();
