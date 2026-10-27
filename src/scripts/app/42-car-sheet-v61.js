// Automobilio kortelė ir sąrašai (v61):
// – numerio ženklas (lcPlateHTMLV61) – sąrašo kortelėse ir kortelės antraštėje kairėje;
// – nuotraukos: rodomos pirmos trys, „Rodyti visas“ atskleidžia likusias;
// – dokumentai: visada atidaryta sekcija, tvarkingos eilutės, vienas „Pridėti dokumentą“ su tipų pasirinkimu.
// Stilius – 171-car-sheet-v61.css.
function lcPlateHTMLV61(plate) {
  const v = String(plate || "")
    .trim()
    .toUpperCase();
  return v
    ? `<span class="lcPlateV61" aria-label="Valstybinis numeris ${escapeHTML(v)}"><i aria-hidden="true">LT</i><b>${escapeHTML(v)}</b></span>`
    : "";
}
const CS_PHOTO_LIMIT_V61 = 3;
const csPhotosOpenV61 = new Set();
const CS_DOC_ICON_V61 =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';
function csPhotosV61(sheet, car) {
  const media = sheet.querySelector("#carDetailPhotos");
  const grid = media?.querySelector(".carPhotoGrid, .premiumThumbGrid");
  if (!media || !grid) return;
  const count = grid.querySelectorAll(":scope > .premiumThumb").length;
  const open = csPhotosOpenV61.has(car.id);
  grid.classList.toggle("csPhotosCollapsedV61", count > CS_PHOTO_LIMIT_V61 && !open);
  media.querySelector(".csPhotoActionsV61")?.remove();
  const dl = media.querySelector("#downloadCarPhotos");
  const more =
    count > CS_PHOTO_LIMIT_V61
      ? `<button type="button" class="csPhotoMoreV61" data-cs-photos-toggle="${escapeHTML(car.id)}">${
          open ? "Rodyti mažiau" : `Rodyti visas (${count})`
        }</button>`
      : "";
  if (!more && !dl) return;
  const row = document.createElement("div");
  row.className = "csPhotoActionsV61" + (more && dl ? " two" : "");
  row.innerHTML = more;
  if (dl) row.append(dl);
  grid.after(row);
}
function csDocsV61(sheet) {
  const docs = sheet.querySelector("#carDetailDocuments");
  if (!docs) return;
  docs.open = true;
  docs.classList.add("csDocsV61");
  const summary = docs.querySelector(":scope > summary");
  if (summary && !summary.dataset.csV61) {
    summary.dataset.csV61 = "1";
    summary.addEventListener("click", e => e.preventDefault());
  }
  // Failų ženkliukai: vietoj emoji – plėtinys
  docs.querySelectorAll(".vehicleDocThumbV32").forEach(t => {
    if (t.querySelector("img")) return;
    const row = t.closest("[data-doc-row]");
    const name = row?.querySelector("strong")?.textContent || "";
    const ext = (name.split(".").pop() || "").slice(0, 4).toUpperCase();
    t.textContent = /^[A-Z0-9]{2,4}$/.test(ext) ? ext : "DOC";
  });
  docs.querySelectorAll(".vehicleDocDownload").forEach(b => {
    if (!b.querySelector("svg"))
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>';
  });
  const inputs = docs.querySelector(".vehicleDocInputs");
  if (!inputs) return;
  inputs.querySelectorAll(".vehicleDocPicker > span").forEach(sp => {
    const t = sp.textContent.replace(/^\s*[＋+]\s*/, "");
    sp.textContent =
      {
        "Pirkimo–pardavimo sutartis": "PP sutartis",
        "Techninės apžiūros dokumentas": "Techninė apžiūra",
        "Registracijos dokumentai": "Registracija",
        "Remonto dokumentai": "Remontas",
        "Kiti dokumentai": "Kita"
      }[t] || t;
  });
  if (!docs.querySelector(".csDocAddV61")) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "csDocAddV61";
    add.setAttribute("aria-expanded", "false");
    add.innerHTML = `${CS_DOC_ICON_V61}<span>Pridėti dokumentą</span>`;
    inputs.before(add);
    if (!docs.querySelector(".vehicleDocRow")) {
      const empty = document.createElement("p");
      empty.className = "csDocEmptyV61";
      empty.textContent = "Dokumentų dar nėra";
      add.before(empty);
    }
  }
}
const __renderCarSheetV61 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV61(car);
  const sheet = document.getElementById("sheet");
  if (!sheet || !car) return;
  sheet.classList.add("carSheetV61");
  const spacer = sheet.querySelector(".premiumSheetHead .cdHeadSpacerV55");
  if (spacer) spacer.innerHTML = lcPlateHTMLV61(car.plate);
  csPhotosV61(sheet, car);
  csDocsV61(sheet);
};
document.addEventListener("click", e => {
  const toggle = e.target.closest("[data-cs-photos-toggle]");
  if (toggle) {
    const id = toggle.dataset.csPhotosToggle;
    if (csPhotosOpenV61.has(id)) csPhotosOpenV61.delete(id);
    else csPhotosOpenV61.add(id);
    const car = state.cars.find(c => c.id === id);
    const sheet = document.getElementById("sheet");
    if (car && sheet) csPhotosV61(sheet, car);
    return;
  }
  const add = e.target.closest(".csDocAddV61");
  if (add) {
    const open = add.getAttribute("aria-expanded") !== "true";
    add.setAttribute("aria-expanded", String(open));
    add.closest(".csDocsV61")?.classList.toggle("csDocPickOpenV61", open);
  }
});
