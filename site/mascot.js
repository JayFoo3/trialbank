// Trialbank mascot: the cartoon Jayden, one image per mood, animated with CSS.
// Moods: happy (idle), wave, cheer (right answer), sad (wrong answer), think, proud (holding the marked paper).
(function () {
  const MOODS = ['happy', 'wave', 'cheer', 'sad', 'think', 'proud'];
  // where the face sits across each image (0 = left edge, 1 = right edge), for small face-only crops
  const FACE_X = { happy: .5, wave: .6, cheer: .5, sad: .56, think: .52, proud: .46 };
  const src = (m) => `mascot/${MOODS.includes(m) ? m : 'happy'}.webp`;
  // warm the cache so mood changes don't flash
  if (typeof Image !== 'undefined') MOODS.forEach(m => { const i = new Image(); i.src = src(m); });
  function Mascot(mood = 'happy', label = '') {
    const m = MOODS.includes(mood) ? mood : 'happy';
    return `<span class="mascot ${m}" style="--hx:${FACE_X[m]}"><img src="${src(m)}" alt="${label}" ${label ? '' : 'aria-hidden="true"'} draggable="false"></span>`;
  }
  window.Mascot = Mascot;
})();
