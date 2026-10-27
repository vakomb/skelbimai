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
const CS_PHOTO_LIMIT_V61 = 4;
const csPhotosOpenV61 = new Set();
const CS_DOC_ICON_V61 =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';
// v69: viena kompaktiška eilutė po nuotraukomis – „＋ Pridėti nuotraukų“ (punktyrinis) ir „Visos (N)“;
// „Atsisiųsti“ – antraštėje dešinėje, matomas visada, kai yra nuotraukų.
const PH_DL_ICON_V69 =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>';
function phLayoutV69(media, grid, dl, attr, id, open, limit = CS_PHOTO_LIMIT_V61) {
  const count = grid.querySelectorAll(":scope > .premiumThumb").length;
  grid.classList.toggle("csPhotosCollapsedV61", count > limit && !open);
  const old = media.querySelector(".csPhotoActionsV61");
  if (old) {
    const keep = old.querySelector("#downloadCarPhotos, #downloadLeadPhotos");
    if (keep) media.append(keep);
    old.remove();
  }
  const head = media.querySelector(":scope > .premiumSectionHead");
  if (dl) {
    dl.hidden = !count;
    dl.classList.add("phDlV69");
    if (!dl.querySelector("svg")) dl.innerHTML = PH_DL_ICON_V69 + "<span>Atsisiųsti</span>";
    dl.setAttribute("aria-label", "Atsisiųsti visas nuotraukas");
    if (head && dl.parentElement !== head) head.append(dl);
  }
  let bar = media.querySelector(".phBarV69");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "phBarV69";
  }
  if (bar.previousElementSibling !== grid) grid.after(bar);
  const up = media.querySelector(".premiumUpload");
  if (up && up.parentElement !== bar) bar.prepend(up);
  bar.querySelector(".csPhotoMoreV61")?.remove();
  if (count > limit)
    bar.insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="csPhotoMoreV61" data-${attr}="${escapeHTML(id)}" aria-expanded="${open}">${
        open ? "Mažiau" : `Visos (${count})`
      }</button>`
    );
}
function csPhotosV61(sheet, car) {
  const media = sheet.querySelector("#carDetailPhotos");
  const grid = media?.querySelector(".carPhotoGrid, .premiumThumbGrid");
  if (!media || !grid) return;
  phLayoutV69(
    media,
    grid,
    media.querySelector("#downloadCarPhotos"),
    "cs-photos-toggle",
    car.id,
    csPhotosOpenV61.has(car.id)
  );
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
  // v65: numeris – duomenų sąraše („Valstybinis numeris“), antraštėje tik markė ir modelis centre
  if (spacer) spacer.innerHTML = "";
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
