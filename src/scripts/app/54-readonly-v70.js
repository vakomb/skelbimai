// Prenumerata (v70): „tik peržiūra“ režimas, kai prenumerata neaktyvi (canceled / none / pasibaigusi lengvata).
// Naršyti, atidaryti korteles ir dokumentus galima, bet duomenų pakeitimai neišsaugomi: saveState grąžina
// paskutinę išsaugotą būseną ir parodo „Atnaujinti prenumeratą“ langą. Vietiniai nustatymai (rodinys, išskleisti
// blokai, tema) išsaugomi kaip įprasta. Serveris rašymą blokuoja atskirai (account_save_state, user-media).
const RO_LOCAL_KEYS_V70 = ["security", "selectedView", "ui", "theme", "sound", "vibrate"];
const roV70 = { on: false, snap: "", notified: 0 };
function roSharedV70(s) {
  const copy = { ...s };
  RO_LOCAL_KEYS_V70.forEach(k => delete copy[k]);
  return JSON.stringify(copy);
}
function roBlockedV70() {
  const now = Date.now();
  if (now - roV70.notified < 600) return;
  roV70.notified = now;
  // Veiksmo „Išsaugota“ pranešimas būtų klaidinantis – nuimamas
  setTimeout(() => document.querySelectorAll("#toastWrap > *").forEach(n => n.remove()), 0);
  window.dispatchEvent(new CustomEvent("autoeasier:readonly-blocked"));
}
const __saveStateV70 = saveState;
saveState = function () {
  if (roV70.on) {
    if (roSharedV70(state) !== roV70.snap) {
      const keep = {};
      RO_LOCAL_KEYS_V70.forEach(k => {
        if (k in state) keep[k] = state[k];
      });
      state = { ...JSON.parse(roV70.snap), ...keep };
      roBlockedV70();
      requestAnimationFrame(() => {
        try {
          render();
        } catch (e) {}
      });
    }
  }
  return __saveStateV70.apply(this, arguments);
};
window.AUTOEASIER_APP_DATA.setReadOnly = on => {
  roV70.on = !!on;
  roV70.snap = on ? roSharedV70(state) : "";
  document.documentElement.classList.toggle("aeReadOnlyV70", !!on);
};
window.AUTOEASIER_APP_DATA.isReadOnly = () => roV70.on;
// Debesies atnaujinimai (kitas įrenginys) – nauja išsaugota būsena
const __replaceStateV70 = window.AUTOEASIER_APP_DATA.replaceState;
window.AUTOEASIER_APP_DATA.replaceState = function (next) {
  const r = __replaceStateV70.apply(this, arguments);
  if (roV70.on) roV70.snap = roSharedV70(state);
  return r;
};
// Failų įkėlimas – iš karto pasiūlomas prenumeratos atnaujinimas, be nereikalingo failų pasirinkimo
document.addEventListener(
  "click",
  e => {
    if (!roV70.on) return;
    const input = e.target.closest?.('input[type="file"]');
    if (!input) return;
    e.preventDefault();
    e.stopPropagation();
    roBlockedV70();
  },
  true
);
