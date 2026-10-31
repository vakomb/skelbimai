// v90: greitesnis puslapių perjungimas. Anksčiau CSS naudojo `body:has(#view-garage.active)` – perjungiant
// puslapį naršyklė perskaičiuodavo viso dokumento stilius. Dabar <body data-ae-view="view-garage"> nustatomas
// sinchroniškai (MutationObserver – mikroužduotis, prieš piešimą), o CSS naudoja
// `body[data-ae-view="view-garage"]:not(#aeV90)` – tas pats specifiškumas kaip anksčiau, todėl išvaizda nesikeičia.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function aeSyncViewAttrV90() {
  const v = document.querySelector(".app > .view.active, .view.active");
  const id = v?.id || "";
  if (document.body && document.body.dataset.aeView !== id) document.body.dataset.aeView = id;
}
(() => {
  const start = () => {
    aeSyncViewAttrV90();
    const app = document.querySelector(".app") || document.body;
    new MutationObserver(aeSyncViewAttrV90).observe(app, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
      childList: false
    });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
