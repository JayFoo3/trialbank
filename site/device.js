/* device.js - works out what the student is on (laptop, tablet or phone) before anything paints, so device.css can
   fit the site to it: a laptop is a reference (read, work on paper, check), an iPad is for writing on the question,
   a phone is for quick practice and photos of paper working. The account menu's Layout picker overrides the guess. */
(function () {
  var KEY = 'tb_device', NAMES = { laptop: 'Laptop', tablet: 'iPad', phone: 'Phone' };
  function detect() {
    var ua = navigator.userAgent, touch = navigator.maxTouchPoints > 0;
    var ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS says it's a Mac
    var small = Math.min(screen.width, screen.height) < 600;
    if (touch && small && !ipad) return 'phone';
    if (ipad || (touch && matchMedia('(pointer: coarse)').matches)) return 'tablet';
    return 'laptop';   // mouse or trackpad, including touchscreen laptops
  }
  function saved() { try { var v = localStorage.getItem(KEY); return NAMES[v] ? v : null; } catch (e) { return null; } }
  function apply() { var d = saved() || detect(); document.documentElement.dataset.device = d; window.TBDevice = d; }
  apply();
  document.addEventListener('DOMContentLoaded', function () {
    var s = document.getElementById('device-pick'); if (!s) return;
    s.options[0].textContent = 'Auto (' + NAMES[detect()] + ')'; s.value = saved() || '';
    s.onclick = function (e) { e.stopPropagation(); };
    s.onchange = function () { try { if (s.value) localStorage.setItem(KEY, s.value); else localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
  });
})();
