/* motion.js - the gliding tab indicator (see motion.css). Watches the main nav for the tab marked .on and slides a pill behind it.
   Phones keep their own bottom-bar style, and nothing glides for people who ask for reduced motion. */
(function () {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let nav = null, pill = null, first = true;
  function place() {
    if (!nav) return;
    const on = nav.querySelector('a.on'), wide = innerWidth > 640 && !calm.matches;
    nav.classList.toggle('mo-has-pill', wide);
    if (!wide || !on || nav.hidden) { if (pill) pill.style.opacity = '0'; return; }
    if (!pill) { pill = document.createElement('span'); pill.className = 'mo-pill'; pill.setAttribute('aria-hidden', 'true'); nav.prepend(pill); }
    const n = nav.getBoundingClientRect(), r = on.getBoundingClientRect();
    if (first) pill.style.transition = 'none';
    pill.style.width = r.width + 'px'; pill.style.height = r.height + 'px';
    pill.style.transform = `translate(${r.left - n.left}px, ${r.top - n.top}px)`; pill.style.opacity = '1';
    if (first) { void pill.offsetWidth; pill.style.transition = ''; first = false; }
  }
  function start() {
    nav = document.getElementById('nav'); if (!nav) return;
    new MutationObserver(() => requestAnimationFrame(place)).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    addEventListener('resize', () => { first = true; place(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { first = true; place(); });
    place();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
