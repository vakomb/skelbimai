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

// Vadybininkas visada nupiešiamas, net jei kuris nors ankstesnis piešimo žingsnis nulūžtų
// (anksčiau tuomet matydavosi tuščias puslapis, nors ant mygtuko rodomas užduočių skaičius).
const __renderGuardV73 = render;
render = async function () {
  let r;
  try {
    r = await __renderGuardV73.apply(this, arguments);
  } catch (e) {
    window.__aeLastRenderErrorV73 = e;
    console.error("render", e);
  }
  if (state.selectedView === "garage-what") {
    try {
      const root = document.getElementById("garageWhatRoot");
      if (root && !root.querySelector(".garageWhatPage")) renderGarageWhatApp();
    } catch (e) {
      window.__aeLastRenderErrorV73 = e;
      console.error("manager", e);
      const root = document.getElementById("garageWhatRoot");
      if (root)
        root.innerHTML = `<div class="garageWhatPage"><div class="garageWhatHead"><div class="garageWhatHeadTitle"><h2>Vadybininkas</h2></div><button class="garageWhatBack" type="button" data-garage-what-back>Atgal</button></div><div class="garageWhatEmpty"><strong>Nepavyko įkelti</strong><span>${escapeHTML(String(e?.message || e).slice(0, 120))}</span></div></div>`;
    }
  }
  return r;
};
