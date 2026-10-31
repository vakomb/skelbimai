// v102: telefone programa išdėstoma ~8 % platesniame ekrane ir tolygiai sumažinama iki telefono pločio.
// Taip ekrane telpa daugiau, viskas atrodo erdviau ir tvarkingiau, o proporcijos lieka tos pačios kiekviename
// telefone (iPhone 15 Pro Max: 430 → 464 CSS px). Planšetėje ir kompiuteryje – įprastai (device-width).
// Vykdoma <head> pradžioje, prieš stilius, kad nebūtų „šuolio“. Žymą atnaujina ir pasukus telefoną.
(function () {
  var K = 1.08;
  function base() {
    var sw = screen.width || 0,
      sh = screen.height || 0,
      portrait = !window.matchMedia || matchMedia("(orientation: portrait)").matches;
    return portrait ? Math.min(sw, sh) : Math.max(sw, sh);
  }
  function content() {
    var short = Math.min(screen.width || 0, screen.height || 0);
    var tail = ", user-scalable=no, viewport-fit=cover, shrink-to-fit=no";
    if (!short || short >= 600) return "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1" + tail;
    var b = base(),
      w = Math.round(b * K),
      s = (b / w).toFixed(4);
    return "width=" + w + ", initial-scale=" + s + ", minimum-scale=" + s + ", maximum-scale=" + s + tail;
  }
  function apply() {
    var m = document.querySelector('meta[name="viewport"]');
    if (!m) return;
    var c = content();
    if (m.getAttribute("content") !== c) m.setAttribute("content", c);
  }
  window.aeViewportContentV102 = content;
  window.aeViewportApplyV102 = apply;
  apply();
  window.addEventListener("orientationchange", function () {
    setTimeout(apply, 60);
  });
  if (window.matchMedia) {
    var mq = matchMedia("(orientation: portrait)");
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
  }
})();
