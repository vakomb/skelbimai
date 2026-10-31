// v104: automobilio kortelė – ankstesnis (v82) išdėstymas, patobulintas:
//   pavadinimas (be valst. nr. ir dienų) → žemesnė nuotrauka (jei yra) → Užduotys → Pirkta · Išlaidos · Savikaina →
//   Duomenys (TA · Draudimas · SDK ir eilutės) → Nuotraukos → Dokumentai → Pasirengimas pardavimui (tik
//   neparduotam) → visi veiksmų mygtukai matomi (Parduoti,
//   PP sutartis, Sąskaita faktūra, Redaguoti, Ištrinti) – kaip anksčiau, be „⋯“ meniu.
// Užduotys, Nuotraukos ir Dokumentai – visada atidaryti blokai (perkeliami esami v83 blokai su visais įvykiais;
// data-cc-sec + is-open, todėl ccOpenSectionV83 tiesiog nuslenka iki jų). Stilius – styles/206-v104-app.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

CC_EDIT_FIELD_V85.plate = "plate";

// ---------- Duomenys: būsenos ir paprastos eilutės (be ikonų) ----------
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
  const rows =
    row("plate", "Valstybinis numeris", plate, plate ? lcPlateHTMLV61(plate) : "") +
    row(
      "firstRegistrationDate",
      "Pirmoji registracija",
      car.firstRegistrationDate || (car.year ? String(car.year) : "")
    ) +
    row("mileage", "Rida", mileage) +
    row("engineCc", "Variklis", engine) +
    row("fuelType", "Kuras", car.fuelType || "") +
    row("registrationDoc", "Liudijimas", car.registrationDoc || car.regDoc || "");
  const vin = String(car.vin || "").trim();
  const vinRow = vin
    ? `<button type="button" class="ccVinV85" data-cc-copy="${escapeHTML(vin)}" aria-label="Kopijuoti VIN ${escapeHTML(vin)}"><span><small>VIN</small><b>${escapeHTML(vin)}</b></span><span class="ccCopyIcoV85">${CC_ICON_V83.copy}${CC_ICON_V83.check}</span></button>`
    : `<button type="button" class="ccVinV85 empty" data-cc-edit="vin"><span><small>VIN</small><b>Įrašyti</b></span></button>`;
  const notes = String(car.notes || "").trim();
  return `<section class="ccCardV83 ccDataV85 ccDataV104" data-cc-data>
    <div class="ccCardHeadV85"><h4>Duomenys</h4><button type="button" class="ccEditLinkV85" data-cc-edit="all">${CC_ICON_V83.pen}Redaguoti</button></div>
    <div class="ccStatsV85">${stats}</div>
    <div class="ccSpecsV85">${rows}</div>
    ${vinRow}
    ${notes ? `<p class="ccNotesV85"><small>Pastabos</small>${escapeHTML(notes)}</p>` : ""}
  </section>`;
};

// ---------- Užduotys / Nuotraukos / Dokumentai – atidaryti blokai ----------
function ccOpenSecV104(hub, key) {
  const pane = hub.querySelector(`[data-cc-sec="${key}"]`);
  const card = pane?.querySelector(`.ccPaneCardV88[data-cc-sec-body="${key}"]`);
  if (!card) return null;
  const sec = document.createElement("section");
  // ccCardV83 – kad perpiešiant kortelę (ccBuildV83) sena sekcija būtų pašalinta kaip ir kitos
  sec.className = `ccCardV83 ccOpenSecV104 is-open`;
  sec.dataset.ccSec = key;
  // .ccAccInnerV83 – kad galiotų esamos taisyklės (perkeltų blokų antraštės slepiamos, be rėmelių)
  const inner = document.createElement("div");
  inner.className = "ccAccInnerV83 ccOpenInV104";
  inner.appendChild(card);
  sec.appendChild(inner);
  pane.remove();
  return sec;
}
function ccLayoutV104(sheet) {
  const body = sheet.querySelector(".premiumDetailBody");
  const hub = body?.querySelector(":scope > [data-cc-hub]");
  if (!body || !hub) return;
  const tasks = ccOpenSecV104(hub, "tasks");
  const photos = ccOpenSecV104(hub, "photos");
  const docs = ccOpenSecV104(hub, "docs");
  hub.remove();
  // Be nuotraukų viršuje nieko – nuotraukas prideda „Nuotraukos“ blokas
  const heroEmpty = sheet.querySelector(".premiumDetail > .ccHeroEmptyV83");
  if (heroEmpty && photos) heroEmpty.remove();
  if (tasks) body.prepend(tasks);
  // v107: Pirkta · Išlaidos · Savikaina – iš karto po Užduotimis, virš Duomenų
  const nums = body.querySelector(":scope > [data-cc-nums]");
  const data = body.querySelector(":scope > [data-cc-data]");
  if (nums && tasks) tasks.after(nums);
  else if (nums) body.prepend(nums);
  if (data && nums) nums.after(data);
  const after = data || nums;
  if (after) after.after(...[photos, docs].filter(Boolean));
  const ready = body.querySelector(":scope > [data-cc-ready]");
  // v107: parduotam automobiliui „Dokumentai buhalterei“ nerodoma – dokumentai buhalterijai keliauja automatiškai
  if (ready && sheet.classList.contains("ccSoldV83")) ready.remove();
  else if (ready) body.appendChild(ready);
}

// ---------- Veiksmai – visi mygtukai matomi, kortelės pabaigoje ----------
ccBuildBarV83 = function (sheet, car, sold) {
  const bar = sheet.querySelector(".carBottomActions");
  if (!bar) return;
  bar.classList.remove("ccBarV83");
  bar.classList.add("ccActsV104");
  bar.querySelectorAll(".ccBarBtnV83, .ccMenuV83, .ccActRowV104").forEach(n => {
    // Mygtukai iš ankstesnio išdėstymo grąžinami į juostą prieš perdėliojant
    n.querySelectorAll("button:not(.ccBarBtnV83)").forEach(b => bar.appendChild(b));
    n.remove();
  });
  const sell = bar.querySelector(".carSellBottom") || bar.querySelector("#sellCarBtn");
  const pp = bar.querySelector(".carPpBottomBtn");
  const inv = bar.querySelector(".carInvBottomBtn");
  const edit = bar.querySelector("#editCarInfoBtn");
  const del = bar.querySelector("#deleteCarBtn");
  if (pp) pp.textContent = "PP sutartis";
  if (inv) inv.textContent = "Sąskaita faktūra";
  if (edit) edit.textContent = "Redaguoti";
  if (inv) inv.textContent = "Sąskaita";
  if (del) del.textContent = "Ištrinti";
  const rowOf = (cls, items) => {
    const list = items.filter(Boolean);
    if (!list.length) return null;
    const r = document.createElement("div");
    r.className = "ccActRowV104 " + cls;
    list.forEach(n => r.appendChild(n));
    return r;
  };
  const known = new Set([sell, pp, inv, edit, del].filter(Boolean));
  const rest = [...bar.children].filter(n => !known.has(n));
  // v106: Parduoti – per visą plotį; PP sutartis · Sąskaita faktūra · Redaguoti – vienoje eilutėje; Ištrinti – tekstu
  const mid = [pp, inv, edit, ...rest].filter(Boolean);
  const rows = [
    rowOf("one sell", [sell]),
    rowOf(mid.length >= 3 ? "three" : mid.length === 2 ? "two" : "one", mid),
    rowOf("one del", [del])
  ].filter(Boolean);
  rows.forEach(r => bar.appendChild(r));
  const body = sheet.querySelector(".premiumDetailBody");
  if (body && bar.parentElement !== body) body.appendChild(bar);
  else if (body) body.appendChild(bar);
};

const __ccBuildV104 = ccBuildV83;
ccBuildV83 = function (sheet, car) {
  __ccBuildV104(sheet, car);
  try {
    ccLayoutV104(sheet);
    // Veiksmai – visada paskutiniai
    const body = sheet.querySelector(".premiumDetailBody");
    const acts = sheet.querySelector(".carBottomActions.ccActsV104");
    if (body && acts) body.appendChild(acts);
  } catch (e) {
    console.warn("v104 kortelė", e);
  }
};
