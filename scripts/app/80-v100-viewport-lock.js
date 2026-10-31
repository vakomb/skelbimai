// v100: stabilus ekrano dydis iPhone programėlėje (pradžios ekrane) ir visuose telefonuose.
// Problema: atidarius programėlę vieną kartą viskas vieno dydžio, uždarius ir vėl atidarius – kito. Priežastys:
//  1) iOS paleidimo / grįžimo iš fono metu trumpam praneša neteisingą lango aukštį; anksčiau jis buvo įrašomas į
//     html/body aukštį ir „užstrigdavo“. Dabar html/body/langai – pačios naršyklės matomas ekranas (198-v91-sheets.css),
//     o --ae-vh (tik papildomiems skaičiavimams) po kiekvieno paleidimo / grįžimo dar ~1,5 s tikrinamas, kol nusistovi.
//  2) iOS leidžia priartinti (dviem pirštais ar dukart bakstelėjus) net su user-scalable=no ir grįžus atkuria tą
//     priartinimą. Čia priartinimas blokuojamas (dukart bakstelėjus – CSS touch-action), o jei jis vis tiek liko – grąžinamas į 1:1.
// Stilius – styles/205-v100-viewport.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const VP_V100 = { timer: 0, until: 0 };
const VP_META_V100 =
  "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no";

function vpTypingV100() {
  const a = document.activeElement;
  return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
}
// Lango aukštis: kol rašoma (klaviatūra) – matomas aukštis, kitaip – išdėstymo aukštis (html = 100 %)
aeSetVhV91 = function () {
  const de = document.documentElement;
  const h = Math.round(
    (vpTypingV100() ? window.innerHeight : de.clientHeight || window.innerHeight) || window.innerHeight || 0
  );
  if (!h) return;
  const v = h + "px";
  if (de.style.getPropertyValue("--ae-vh") !== v) de.style.setProperty("--ae-vh", v);
};
// Priartinimas liko (pvz. iOS atkūrė grįžus) – perrašome viewport žymą, tada iOS grąžina mastelį 1
function vpResetZoomV100() {
  const vv = window.visualViewport;
  if (!vv || Math.abs(vv.scale - 1) < 0.01) return;
  const m = document.querySelector('meta[name="viewport"]');
  if (!m) return;
  m.setAttribute("content", VP_META_V100.replace("maximum-scale=1", "maximum-scale=1.01"));
  requestAnimationFrame(() => m.setAttribute("content", VP_META_V100));
}
// Po paleidimo / grįžimo / pasukimo kelis kartus pertikriname, kol iOS praneša galutinį dydį
function vpSettleV100(ms = 1500) {
  VP_V100.until = Math.max(VP_V100.until, performance.now() + ms);
  if (VP_V100.timer) return;
  const tick = () => {
    VP_V100.timer = 0;
    aeSetVhV91();
    vpResetZoomV100();
    if (!vpTypingV100()) aeResetPageScrollV91();
    if (performance.now() < VP_V100.until) VP_V100.timer = setTimeout(tick, 120);
  };
  tick();
}
(() => {
  const m = document.querySelector('meta[name="viewport"]');
  if (m && m.getAttribute("content") !== VP_META_V100) m.setAttribute("content", VP_META_V100);
  vpSettleV100(2000);
  window.addEventListener("load", () => vpSettleV100());
  window.addEventListener("pageshow", () => vpSettleV100());
  window.addEventListener("orientationchange", () => vpSettleV100());
  document.addEventListener("visibilitychange", () => !document.hidden && vpSettleV100());
  window.visualViewport?.addEventListener("resize", () => {
    if (!vpTypingV100()) vpSettleV100(400);
  });
  // iOS: dviejų pirštų priartinimas
  const stop = e => e.preventDefault();
  document.addEventListener("gesturestart", stop, { passive: false });
  document.addEventListener("gesturechange", stop, { passive: false });
  // v104: jokio ne „passive“ touchmove klausytojo – jis priverstų naršyklę laukti JS kiekvieno slinkimo metu
  // (strigimai). Dviejų pirštų priartinimą iOS sustabdo gesturestart / gesturechange.
})();
