// v73: trumpesni Vadybininko tekstai, paleidimas į Garažą, kortelė visada atsidaro nuo viršaus.
const mgShortLabelV73 = {
  "valst. numeris": "numeris",
  "registracijos liudijimo nr.": "liudijimas",
  "pirkimo kaina": "kaina",
  "registracijos dokumentas": "registracija"
};
const mgShortListV73 = (list, max = 3) => {
  const names = list.map(x => mgShortLabelV73[x.label] || x.label);
  return names.slice(0, max).join(", ") + (names.length > max ? ` +${names.length - max}` : "");
};
const __workCenterItemsV73 = workCenterItems;
workCenterItems = function () {
  return __workCenterItemsV73().map(it => {
    if (it.actionType === "missing-data")
      return {
        ...it,
        action: "Užpildyti duomenis",
        detail: `PP sutarčiai trūksta: ${mgShortListV73(it.fields || [])}`,
        cta: "Užpildyti"
      };
    if (it.actionType === "missing-docs")
      return {
        ...it,
        action: "Prisegti dokumentus",
        detail: `Trūksta: ${mgShortListV73(it.missingDocs || [], 2)}`,
        cta: "Prisegti"
      };
    if (it.actionType === "accounting") {
      const n = (state.cars.find(c => c.id === it.id)?.documents || []).length;
      return { ...it, action: "Pateikti buhalterei", detail: `Dokumentų: ${n}` };
    }
    return it;
  });
};
window.__autoEasierWorkCountV1 = () => workCenterItems().length;

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
