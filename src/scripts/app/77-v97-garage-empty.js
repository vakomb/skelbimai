// v97: Garažo tuščia būsena ir parduotų automobilių juosta. Tuščiame Garaže – aiškus tekstas, nauja ikona be fono,
// be paaiškinimo po mygtuku. „Parduoti automobiliai“ – mažiau ryški eilutė; kol parduotų nėra – nerodoma.
// „Aktyvūs automobiliai“ etiketė nerodoma, kai aktyvių automobilių nėra (tada matoma tuščia būsena).
// Stilius – styles/202-v97-garage.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const EMPTY_CAR_ICON_V97 =
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 30.5v-5.3a3 3 0 0 1 1.9-2.8l4.9-2 4.4-5.6a4 4 0 0 1 3.1-1.5h8.9a4 4 0 0 1 3 1.4l5 5.7 4.8 1.2a3 3 0 0 1 2.3 2.9v6" fill="currentColor" fill-opacity=".1" stroke="none"/><path d="M9.8 32H7a1.5 1.5 0 0 1-1.5-1.5v-5.3a3 3 0 0 1 1.9-2.8l4.9-2 4.4-5.6a4 4 0 0 1 3.1-1.5h8.9a4 4 0 0 1 3 1.4l5 5.7 4.8 1.2a3 3 0 0 1 2.3 2.9v4.5A1.5 1.5 0 0 1 42.3 32h-4"/><path d="M18.2 32h11.6"/><circle cx="14" cy="32" r="4.2"/><circle cx="34" cy="32" r="4.2"/><path d="M12.6 20.2h23.6M24.2 14.2v6"/></svg>';

emptyCarsHTMLV75 = function () {
  const hasSold = (state.cars || []).some(c => c.status === "parduotas");
  const title = hasSold ? "Aktyvių automobilių nėra" : "Pridėkite pirmą automobilį";
  const text = hasSold
    ? "Pridėkite naują automobilį – jis atsiras čia su visomis išlaidomis, dokumentais ir užduotimis."
    : "Visi jūsų automobiliai bus čia – su išlaidomis, dokumentais, užduotimis ir pelnu.";
  const label = hasSold ? "Pridėti automobilį" : "Pridėti pirmą automobilį";
  return `<div class="emptyCarsV75 emptyCarsV97">
    <span class="emptyCarsIcoV75" aria-hidden="true">${EMPTY_CAR_ICON_V97}</span>
    <h3>${title}</h3>
    <p>${text}</p>
    <button type="button" class="emptyCarsBtnV75" data-garage-action="addcar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>${label}</span></button>
  </div>`;
};

function garageSectionsV97() {
  const cars = state.cars || [];
  const sold = cars.some(c => c.status === "parduotas");
  const active = cars.some(c => c.status !== "parduotas");
  const soldSec = document.getElementById("soldCarsSection");
  if (soldSec && soldSec.hidden === sold) soldSec.hidden = !sold;
  const head = document.querySelector("#view-garage .sectionHead.activeHeadV92");
  if (head && head.hidden === active) head.hidden = !active;
}
const __renderV97 = render;
render = function () {
  const r = __renderV97.apply(this, arguments);
  try {
    garageSectionsV97();
  } catch (e) {
    console.warn("Garažas v97", e);
  }
  return r;
};
