// v73/v74: kortelė visada atsidaro nuo viršaus; grįžus į programą po ilgos pertraukos – Garažas
// (bet niekada neatimant lango, kurį naudotojas pildo).
const __openCarV73 = openCar;
openCar = function () {
  const sheet = document.getElementById("sheet");
  const back = document.getElementById("modalBackdrop");
  const r = __openCarV73.apply(this, arguments);
  [sheet, back].forEach(el => el && (el.scrollTop = 0));
  requestAnimationFrame(() => [sheet, back].forEach(el => el && el.scrollTo({ top: 0, behavior: "smooth" })));
  return r;
};

const MG_AWAY_MS_V74 = 30 * 60 * 1000;
let mgHiddenAtV73 = 0;
function overlayOpenV74() {
  return [
    ...document.querySelectorAll('[class*="Backdrop"], [class*="backdrop"], [class*="Overlay"], .pwV71')
  ].some(el => (el.id !== "modalBackdrop" ? el.offsetHeight > 0 : el.classList.contains("show")));
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    mgHiddenAtV73 = Date.now();
    return;
  }
  if (!mgHiddenAtV73 || Date.now() - mgHiddenAtV73 < MG_AWAY_MS_V74) return;
  mgHiddenAtV73 = 0;
  if (state.selectedView === "garage" || state.selectedView === "garage-what") return;
  if (uiBusyV74() || overlayOpenV74()) return;
  state.selectedView = "garage";
  renderSoonV74();
  window.scrollTo({ top: 0 });
});
