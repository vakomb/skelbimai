// v73: paleidimas į Garažą, kortelė visada atsidaro nuo viršaus.
// Kortelė visada atsidaro nuo viršaus
const __openCarV73 = openCar;
openCar = function () {
  const sheet = document.getElementById("sheet");
  const back = document.getElementById("modalBackdrop");
  const r = __openCarV73.apply(this, arguments);
  [sheet, back].forEach(el => el && (el.scrollTop = 0));
  requestAnimationFrame(() => [sheet, back].forEach(el => el && el.scrollTo({ top: 0, behavior: "smooth" })));
  return r;
};

// Grįžus į programą po pertraukos – visada Garažas
let mgHiddenAtV73 = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    mgHiddenAtV73 = Date.now();
    return;
  }
  if (!mgHiddenAtV73 || Date.now() - mgHiddenAtV73 < 20000) return;
  mgHiddenAtV73 = 0;
  if (document.getElementById("modalBackdrop")?.classList.contains("show")) closeSheet();
  if (state.selectedView !== "garage") {
    state.selectedView = "garage";
    render();
  }
  window.scrollTo({ top: 0 });
});
