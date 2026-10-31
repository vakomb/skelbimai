// v105: automobilio kortelės blokai.
//  • „Duomenys“: matoma pusė – TA · Draudimas · SDK ir valst. numeris, pirmoji registracija, rida; „Rodyti viską“
//    sklandžiai išskleidžia variklį, kurą, liudijimą, VIN ir pastabas (būsena išlieka perpiešiant kortelę).
//  • Užduotys, Nuotraukos, Dokumentai – vienodi blokai: pavadinimas, skaičius, veiksmas dešinėje (v106 – be ikonų);
//    nuotraukos ir dokumentai – horizontali juosta (vienodo aukščio plytelės), tušti – tik antraštės eilutė (CSS :has).
// Stilius – styles/207-v105-blocks.css. Dalis bendro app IIFE (žr. ARCHITECTURE.md).

const ccDataOpenV105 = new Set();
const CC_MORE_CHEV_V105 =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

ccDataHTMLV85 = function (car) {
  const sdkLabel =
    !car.sdkStatus || car.sdkStatus === "unset"
      ? "Nepateikta"
      : SDK_STATES.find(x => x[0] === car.sdkStatus)?.[1] || "Nepateikta";
  const sdkTone =
    { sdkDone: "good", sdkLate: "bad", sdkPending: "warn", sdkUnset: "neutral" }[sdkClass(car.sdkStatus)] ||
    "neutral";
  const sdkOk = sdkTone === "good" || car.sdkStatus === "submitted";
  const stats =
    ccStatForV85("ta", "TA", car.taStatus, car.taUntil) +
    ccStatForV85("insurance", "Draudimas", car.insuranceStatus, car.insuranceUntil) +
    ccStatTileV85("sdk", "SDK", sdkOk ? "good" : sdkTone, sdkOk ? "Pateikta" : sdkLabel, car.sdk || "");
  const mileage = Number(car.mileage) > 0 ? `${Number(car.mileage).toLocaleString("lt-LT")} km` : "";
  const engine = [car.engineCc ? `${car.engineCc} cm³` : "", car.powerKw ? `${car.powerKw} kW` : ""]
    .filter(Boolean)
    .join(" · ");
  const row = (field, label, value, html = "") =>
    `<button type="button" class="ccSpecV85${value ? "" : " empty"}" data-cc-edit="${field}"><span class="ccSpecTxtV85"><small>${escapeHTML(label)}</small><b>${value ? html || escapeHTML(String(value)) : "Įrašyti"}</b></span></button>`;
  const plate = String(car.plate || "").trim();
  const main =
    row("plate", "Valstybinis numeris", plate, plate ? lcPlateHTMLV61(plate) : "") +
    row(
      "firstRegistrationDate",
      "Pirmoji registracija",
      car.firstRegistrationDate || (car.year ? String(car.year) : "")
    ) +
    row("mileage", "Rida", mileage);
  const extra =
    row("engineCc", "Variklis", engine) +
    row("fuelType", "Kuras", car.fuelType || "") +
    row("registrationDoc", "Liudijimas", car.registrationDoc || car.regDoc || "");
  const vin = String(car.vin || "").trim();
  const vinRow = vin
    ? `<button type="button" class="ccVinV85" data-cc-copy="${escapeHTML(vin)}" aria-label="Kopijuoti VIN ${escapeHTML(vin)}"><span><small>VIN</small><b>${escapeHTML(vin)}</b></span><span class="ccCopyIcoV85">${CC_ICON_V83.copy}${CC_ICON_V83.check}</span></button>`
    : `<button type="button" class="ccVinV85 empty" data-cc-edit="vin"><span><small>VIN</small><b>Įrašyti</b></span></button>`;
  const notes = String(car.notes || "").trim();
  const open = ccDataOpenV105.has(car.id);
  return `<section class="ccCardV83 ccDataV85 ccDataV104 ccDataV105" data-cc-data>
    <div class="ccCardHeadV85"><h4>Duomenys</h4><button type="button" class="ccEditLinkV85" data-cc-edit="all">${CC_ICON_V83.pen}Redaguoti</button></div>
    <div class="ccStatsV85">${stats}</div>
    <div class="ccSpecsV85">${main}</div>
    <div class="ccMoreV105" id="ccMoreV105"${open ? "" : " hidden"}>
      <div class="ccSpecsV85">${extra}</div>
      ${vinRow}
      ${notes ? `<p class="ccNotesV85"><small>Pastabos</small>${escapeHTML(notes)}</p>` : ""}
    </div>
    <button type="button" class="ccMoreBtnV105" data-cc-data-more aria-expanded="${open}" aria-controls="ccMoreV105"><span>${open ? "Rodyti mažiau" : "Rodyti viską"}</span>${CC_MORE_CHEV_V105}</button>
  </section>`;
};
document.addEventListener("click", e => {
  const btn = e.target instanceof Element ? e.target.closest("#sheet [data-cc-data-more]") : null;
  if (!btn) return;
  const sheet = document.getElementById("sheet");
  const id = sheet?.dataset.carV63 || "";
  const more = btn.parentElement?.querySelector(":scope > .ccMoreV105");
  if (!more) return;
  const open = btn.getAttribute("aria-expanded") !== "true";
  if (open) ccDataOpenV105.add(id);
  else ccDataOpenV105.delete(id);
  btn.setAttribute("aria-expanded", String(open));
  const label = btn.querySelector("span");
  if (label) label.textContent = open ? "Rodyti mažiau" : "Rodyti viską";
  aeAnimHeightV87(more, open, { dur: 300 });
  if (open) aeRevealV87(btn, { follow: 340 });
});

// ---------- Vienodi blokai: Užduotys · Nuotraukos · Dokumentai ----------
// v107: Nuotraukos ir Dokumentai – suskleisti, kol nepaspaudžiama antraštė (būsena atsimenama kiekvienam automobiliui)
const ccBlkOpenV107 = { photos: new Set(), docs: new Set() };
const CC_BLK_CHEV_V107 =
  '<svg class="ccBlkChevV107" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
function ccBlocksV105(sheet) {
  const carId = sheet.dataset.carV63 || "";
  sheet.querySelectorAll(".premiumDetailBody > .ccOpenSecV104[data-cc-sec]").forEach(sec => {
    const key = sec.dataset.ccSec;
    const head = sec.querySelector(".ccPaneHeadV88");
    if (!head || sec.classList.contains("ccBlkV105")) return;
    // v106: be ikonėlių – tik pavadinimas, skaičius (pilkas) ir veiksmas dešinėje
    sec.classList.add("ccBlkV105");
    const sum = head.querySelector(".ccPaneSumV88");
    if (sum && key !== "tasks") {
      const n = parseInt(sum.textContent, 10) || 0;
      sum.textContent = n ? String(n) : "";
      sum.classList.add("ccBlkCntV105");
    }
    if (key === "photos" || key === "docs") {
      const has = key === "photos" ? !!sec.querySelector(".premiumThumb") : !!sec.querySelector(".vehicleDocRow");
      sec.classList.add("ccFoldV107");
      sec.classList.toggle("ccFoldHasV107", has);
      sec.classList.toggle("is-shut", !ccBlkOpenV107[key].has(carId));
      if (has) {
        head.setAttribute("role", "button");
        head.setAttribute("tabindex", "0");
        head.setAttribute("aria-expanded", String(!sec.classList.contains("is-shut")));
        head.insertAdjacentHTML("beforeend", CC_BLK_CHEV_V107);
      }
    }
  });
}
// Sklandus aukščio perėjimas (FLIP): išmatuojama prieš ir po, kortelė animuojama tarp jų
function ccBlkSetV107(sec, open) {
  const card = sec.querySelector(".ccPaneCardV88");
  const key = sec.dataset.ccSec;
  const carId = document.getElementById("sheet")?.dataset.carV63 || "";
  if (open) ccBlkOpenV107[key]?.add(carId);
  else ccBlkOpenV107[key]?.delete(carId);
  if (sec.classList.contains("is-shut") !== open) return;
  const from = card ? card.getBoundingClientRect().height : 0;
  sec.classList.toggle("is-shut", !open);
  sec.querySelector(".ccPaneHeadV88")?.setAttribute("aria-expanded", String(open));
  if (!card || !card.animate || ccReducedV85()) return;
  const to = card.getBoundingClientRect().height;
  if (Math.abs(to - from) < 1) return;
  card.style.overflow = "hidden";
  const a = card.animate([{ height: from + "px" }, { height: to + "px" }], {
    duration: 300,
    easing: "cubic-bezier(.2,.8,.2,1)"
  });
  a.onfinish = a.oncancel = () => (card.style.overflow = "");
  if (open) aeRevealV87(sec, { follow: 320 });
}
document.addEventListener("click", e => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t) return;
  // Dokumento „Pridėti“ – blokas atsiskleidžia, kad matytųsi tipų pasirinkimas
  const add = t.closest("#sheet .ccFoldV107 .csDocAddV61");
  if (add) {
    // Šis klausytojas registruotas vėliau nei 42-car-sheet-v61.js, todėl aria-expanded jau atnaujintas
    const sec = add.closest(".ccFoldV107");
    const picking = add.getAttribute("aria-expanded") === "true";
    if (picking) ccBlkSetV107(sec, true);
    else if (!sec.classList.contains("ccFoldHasV107")) ccBlkSetV107(sec, false);
    return;
  }
  const head = t.closest("#sheet .ccFoldV107.ccFoldHasV107 .ccPaneHeadV88");
  if (!head || t.closest("button, label, a, input")) return;
  const sec = head.closest(".ccFoldV107");
  ccBlkSetV107(sec, sec.classList.contains("is-shut"));
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const head = e.target instanceof Element ? e.target.closest("#sheet .ccFoldV107.ccFoldHasV107 .ccPaneHeadV88") : null;
  if (!head) return;
  e.preventDefault();
  const sec = head.closest(".ccFoldV107");
  ccBlkSetV107(sec, sec.classList.contains("is-shut"));
});
const __ccBuildV105 = ccBuildV83;
ccBuildV83 = function (sheet, car) {
  __ccBuildV105(sheet, car);
  try {
    ccBlocksV105(sheet);
  } catch (e) {
    console.warn("v105 blokai", e);
  }
};
