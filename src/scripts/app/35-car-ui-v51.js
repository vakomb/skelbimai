// Automobilio formos ir kortelė (v51): vienoda, minimalistinė naujo automobilio forma ir redagavimas,
// aiški automobilio kortelė. Pavadinimas visada = markė + modelis; pagaminimo metai – iš pirmosios registracijos.
// Nebenaudojami laukai (planuojama kaina, pasiūlymo kanalas, skelbimas) formose nerodomi, bet esami duomenys nenutrinami.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const CF_STATUS_V51 = [
  ["valid", "Galioja"],
  ["invalid", "Negalioja"],
  ["unknown", "Nežinoma"]
];

function cfStatusFieldV51(p, key, untilKey, label, c = {}) {
  const v = ["valid", "invalid"].includes(c[key]) ? c[key] : "unknown";
  return `<div class="cfStatusV51" data-cf-status="${key}">
    <span class="cfLabelV51" id="${p}${key}Label">${label}</span>
    <div class="cfSegV51" role="radiogroup" aria-labelledby="${p}${key}Label">${CF_STATUS_V51.map(
      ([val, t]) =>
        `<button type="button" role="radio" aria-checked="${val === v}" data-seg-value="${val}">${t}</button>`
    ).join("")}</div>
    <input type="hidden" id="${p}${key}" value="${v}">
    <div class="field cfUntilV51" ${v === "valid" ? "" : 'style="display:none !important"'}><label for="${p}${untilKey}">Galioja iki</label><input class="input" type="date" id="${p}${untilKey}" value="${escapeHTML(c[untilKey] || "")}"></div>
  </div>`;
}
function cfNumberV51(id, label, value, { decimal = false, placeholder = "" } = {}) {
  return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" type="number" min="0" step="${decimal ? "0.01" : "1"}" inputmode="${decimal ? "decimal" : "numeric"}" value="${value ?? ""}" placeholder="${placeholder}"></div>`;
}
function cfPhotoPickerV51(p) {
  return `<section class="cfCardV51"><label class="cfPhotoPickV51" for="${p}photos"><span class="cfPhotoIcoV51">${regIconV50("gallery")}</span><strong>Nuotraukos</strong><em id="${p}photosCount"></em><input id="${p}photos" type="file" accept="image/*" multiple></label><div class="cfPhotoThumbsV51" id="${p}photosThumbs"></div></section>`;
}
// mode: "new" | "edit"
function carFormHTMLV51(p, c = {}, mode = "new") {
  const sold = mode === "edit" && c.status === "parduotas";
  return `<div class="cfFormV51" id="${p}form">
    ${regCardHTMLV50(p, c)}
    <section class="cfCardV51"><div class="cfGridV51">
      ${cfNumberV51(p + "buyPrice", "Pirkimo kaina, €", mode === "edit" ? Number(c.buyPrice || 0) : "", { decimal: true })}
      ${sold ? cfNumberV51(p + "soldPrice", "Pardavimo kaina, €", Number(c.soldPrice || 0), { decimal: true }) : ""}
      ${cfNumberV51(p + "mileage", "Rida, km", c.mileage ?? "")}
    </div></section>
    <section class="cfCardV51">
      ${cfStatusFieldV51(p, "taStatus", "taUntil", "Techninė apžiūra", c)}
      ${cfStatusFieldV51(p, "insuranceStatus", "insuranceUntil", "Draudimas", c)}
      <div class="cfGridV51 cfSdkV51">
        <div class="field"><label for="${p}sdk">SDK</label><input class="input" id="${p}sdk" value="${escapeHTML(c.sdk || "")}" maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
        <div class="field"><label for="${p}sdkStatus">SDK būsena</label><select class="input ${sdkClass(c.sdkStatus)}" id="${p}sdkStatus">${SDK_STATES.map(([v, t]) => `<option value="${v}"${v === (c.sdkStatus || "unset") ? " selected" : ""}>${t}</option>`).join("")}</select></div>
      </div>
    </section>
    ${
      mode === "new"
        ? cfPhotoPickerV51(p) + `<section class="cfCardV51 cfDocsV51">${documentFields(p, {})}</section>`
        : `<section class="cfCardV51"><div class="field"><label for="${p}notes">Pastabos</label><textarea class="input" id="${p}notes" rows="3">${escapeHTML(c.notes || "")}</textarea></div></section>`
    }
  </div>`;
}
function bindCarFormV51(p, c = {}, opts = {}) {
  const root = document.getElementById(p + "form");
  if (!root) return;
  root.querySelectorAll("[data-cf-status]").forEach(box => {
    const key = box.dataset.cfStatus,
      hidden = document.getElementById(p + key),
      until = box.querySelector(".cfUntilV51"),
      date = until?.querySelector("input");
    box.querySelectorAll("[data-seg-value]").forEach(btn =>
      btn.addEventListener("click", () => {
        hidden.value = btn.dataset.segValue;
        box
          .querySelectorAll("[data-seg-value]")
          .forEach(b => b.setAttribute("aria-checked", String(b === btn)));
        const valid = hidden.value === "valid";
        if (until) {
          if (valid) until.style.removeProperty("display");
          else until.style.setProperty("display", "none", "important");
        }
        if (date) {
          // Senas surišimas (14-vehicle-fields-documents.js) išjungia datą, kol būsena ne „valid“;
          // paslėptas laukas change įvykio negauna, todėl įjungiame čia.
          date.disabled = !valid;
          if (!valid) date.value = "";
        }
      })
    );
    if (date) date.disabled = hidden.value !== "valid";
  });
  const sdkSel = document.getElementById(p + "sdkStatus");
  if (sdkSel) sdkSel.onchange = () => (sdkSel.className = "input " + sdkClass(sdkSel.value));
  const sdk = document.getElementById(p + "sdk");
  sdk?.addEventListener("change", () => {
    if (sdk.value.trim() && sdkSel && sdkSel.value === "unset") {
      sdkSel.value = "submitted";
      sdkSel.onchange();
    }
  });
  const photos = document.getElementById(p + "photos");
  if (photos) {
    const urls = [];
    photos.addEventListener("change", () => {
      urls.splice(0).forEach(u => URL.revokeObjectURL(u));
      const files = Array.from(photos.files || []).filter(f => /^image\//.test(f.type));
      document.getElementById(p + "photosCount").textContent = files.length ? String(files.length) : "";
      document.getElementById(p + "photosThumbs").innerHTML = files
        .slice(0, 8)
        .map(f => {
          const u = URL.createObjectURL(f);
          urls.push(u);
          return `<img src="${u}" alt="">`;
        })
        .join("");
    });
  }
  if (root.querySelector(".vehicleDocuments")) bindVehicleFields(p, c);
  regBindCardV50(p, typeof opts === "function" ? opts : () => opts);
}
function cfValueV51(p, k) {
  return (document.getElementById(p + k)?.value || "").trim();
}
// Formos duomenys -> automobilio laukai (tik formoje esantys laukai; kiti automobilio duomenys nepaliečiami).
function readCarFormV51(p) {
  const v = k => cfValueV51(p, k);
  const make = v("regMake"),
    model = v("regModel");
  if (!make && !model) throw Error("Įrašykite markę ir modelį arba nuskenuokite liudijimą.");
  const buy = Number(v("buyPrice"));
  if (!Number.isFinite(buy) || buy <= 0) throw Error("Įrašykite pirkimo kainą.");
  const int = (k, label, max) => {
    const s = v(k);
    if (s === "") return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0 || n > max) throw Error(`Patikrinkite: ${label}.`);
    return n;
  };
  const vin = v("vin").toUpperCase().replace(/\s+/g, "");
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw Error("VIN turi būti 17 simbolių (be I, O, Q).");
  const reg = v("registrationDoc")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (reg && !/^[A-Z][0-9]{5,8}$/.test(reg))
    throw Error("Patikrinkite liudijimo seriją ir numerį, pvz. K1281961.");
  const first = v("firstRegistrationDate");
  if (first && (!/^\d{4}-\d{2}-\d{2}$/.test(first) || first > todayISO()))
    throw Error("Patikrinkite pirmosios registracijos datą.");
  const status = (k, untilK, label) => {
    const s = ["valid", "invalid"].includes(v(k)) ? v(k) : "unknown";
    const until = s === "valid" ? v(untilK) : "";
    if (s === "valid" && !until) throw Error(`Nurodykite, iki kada galioja ${label}.`);
    return [s, until];
  };
  const [taStatus, taUntil] = status("taStatus", "taUntil", "techninė apžiūra");
  const [insuranceStatus, insuranceUntil] = status("insuranceStatus", "insuranceUntil", "draudimas");
  const sdk = v("sdk").toUpperCase();
  const out = {
    name: [make, model].filter(Boolean).join(" "),
    regMake: make,
    regModel: model,
    registrationDoc: reg,
    plate: v("plate").toUpperCase().replace(/\s+/g, ""),
    vin,
    firstRegistrationDate: first,
    engineCc: int("engineCc", "variklio tūris", 20000),
    powerKw: int("powerKw", "galia", 2000),
    fuelType: v("fuelType"),
    buyPrice: buy,
    mileage: int("mileage", "rida", 3000000),
    taStatus,
    taUntil,
    insuranceStatus,
    insuranceUntil,
    sdk,
    sdkStatus: v("sdkStatus") || (sdk ? "submitted" : "unset")
  };
  if (first) out.year = Number(first.slice(0, 4));
  if (document.getElementById(p + "notes")) out.notes = v("notes");
  if (document.getElementById(p + "soldPrice")) {
    const sold = Number(v("soldPrice"));
    if (!Number.isFinite(sold) || sold <= 0) throw Error("Įrašykite pardavimo kainą.");
    out.soldPrice = sold;
  }
  return out;
}

// ---------- Naujas automobilis ----------
function installCarFormNewV51() {
  const panel = document.getElementById("addCarPanel");
  if (!panel || panel.dataset.formV51 === "1") return;
  panel.dataset.formV51 = "1";
  const head = panel.querySelector(":scope > .sectionHead");
  [...panel.children].forEach(ch => ch !== head && ch.remove());
  panel.insertAdjacentHTML(
    "beforeend",
    carFormHTMLV51("newVehicle", {}, "new") +
      `<button class="btn cfSaveV51" id="addCarBtn" type="button">Išsaugoti automobilį</button>`
  );
  bindCarFormV51("newVehicle", {}, { nameInputId: "" });
  const reset = () => {
    panel.querySelector("#newVehicleform")?.remove();
    document.getElementById("addCarBtn")?.remove();
    panel.dataset.formV51 = "";
    delete regScanFilesV50.newVehicle;
    installCarFormNewV51();
  };
  const cancel = document.getElementById("cancelAddCarBtn");
  if (cancel && !cancel.dataset.cfV51) {
    cancel.dataset.cfV51 = "1";
    cancel.addEventListener("click", () => setTimeout(reset, 350));
  }
  const btn = document.getElementById("addCarBtn");
  btn.onclick = async () => {
    if (btn.disabled) return;
    try {
      const data = readCarFormV51("newVehicle");
      btn.disabled = true;
      btn.textContent = "Išsaugoma…";
      let docs = await collectDocuments("newVehicle");
      const scanned = regScanFilesV50.newVehicle;
      if (scanned && !docs.some(d => d.kind === "registration"))
        docs = [await regDocumentFromFileV50(scanned, data.registrationDoc), ...docs];
      const photos = [];
      for (const f of Array.from(document.getElementById("newVehiclephotos")?.files || [])) {
        const key = await storeImageFile(f);
        if (!key) throw Error("Nepavyko pridėti nuotraukos.");
        photos.push(key);
        await photoGet(key);
      }
      const c = {
        id: uid(),
        ...data,
        source: "",
        listingStatus: "not-listed",
        listingDate: "",
        askingPrice: null,
        documents: docs,
        photos,
        imageSrc: photos[0] || "",
        notes: "",
        soldPrice: null,
        netProfit: 0,
        soldAt: null,
        soldDateISO: null,
        createdDateISO: todayISO(),
        createdAt: nowLabel(),
        status: "aktyvus",
        checklist: []
      };
      state.cars.unshift(c);
      ensureFinanceCollections();
      state.finances.budgetBalance -= c.buyPrice;
      if (!saveState()) {
        state.cars = state.cars.filter(x => x !== c);
        state.finances.budgetBalance += c.buyPrice;
        throw Error("Nepavyko išsaugoti automobilio.");
      }
      addHistory("Automobilis nupirktas", `${c.name} • ${moneyFmt(c.buyPrice)}`, "🚗", {
        kind: "car",
        id: c.id,
        label: "Atidaryti automobilį"
      });
      saveState();
      if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
      else panel.style.display = "none";
      const show = document.getElementById("showAddCarFormBtn");
      if (show) show.style.display = "block";
      reset();
      render();
      toast("Automobilis pridėtas", "✓");
    } catch (e) {
      toast(e.message || "Nepavyko pridėti automobilio", "!");
    } finally {
      const b = document.getElementById("addCarBtn");
      if (b) {
        b.disabled = false;
        b.textContent = "Išsaugoti automobilį";
      }
    }
  };
}
installCarFormNewV51();

// ---------- Redagavimas ----------
openCarEditSheet = function (id) {
  const car = (state.cars || []).find(c => c.id === id);
  if (!car) return;
  const view = { ...car, regMake: car.regMake, regModel: car.regModel };
  if (!view.regMake && !view.regModel && car.name) {
    const parts = String(car.name).trim().split(/\s+/);
    view.regMake = parts.shift() || "";
    view.regModel = parts.join(" ");
  }
  openSheet(
    `<div class="sheetHead cfHeadV51"><h3>Redaguoti automobilį</h3><button class="closeBtn" id="closeCarEdit" type="button" aria-label="Uždaryti">✕</button></div>` +
      carFormHTMLV51("editVehicle", view, "edit") +
      `<button class="btn cfSaveV51" id="saveCarEdit" type="button">Išsaugoti</button>`
  );
  document.getElementById("sheet").scrollTop = 0;
  document.getElementById("closeCarEdit").onclick = () => {
    delete regScanFilesV50.editVehicle;
    renderCarSheet(car);
  };
  bindCarFormV51("editVehicle", car, () => ({ car, nameInputId: "" }));
  const save = document.getElementById("saveCarEdit");
  save.onclick = async () => {
    if (save.disabled) return;
    const old = JSON.parse(JSON.stringify(car)),
      oldBalance = state.finances.budgetBalance;
    try {
      const data = readCarFormV51("editVehicle");
      save.disabled = true;
      const scanned = regScanFilesV50.editVehicle;
      if (scanned && !(car.documents || []).some(d => d.kind === "registration"))
        data.documents = [
          ...(car.documents || []),
          await regDocumentFromFileV50(scanned, data.registrationDoc)
        ];
      Object.assign(car, data);
      ensureFinanceCollections();
      state.finances.budgetBalance += Number(old.buyPrice || 0) - car.buyPrice;
      if (data.soldPrice != null) {
        car.netProfit = carNetProfit(car);
        state.finances.budgetBalance += data.soldPrice - Number(old.soldPrice || 0);
      }
      if (!saveState()) {
        Object.keys(car).forEach(k => delete car[k]);
        Object.assign(car, old);
        state.finances.budgetBalance = oldBalance;
        throw Error("Nepavyko išsaugoti automobilio.");
      }
      delete regScanFilesV50.editVehicle;
      addHistory("Automobilis atnaujintas", car.name, "🚗");
      saveState();
      render();
      openCar(car.id);
      toast("Išsaugota", "✓");
    } catch (e) {
      toast(e.message, "!");
    } finally {
      save.disabled = false;
    }
  };
};

// ---------- Automobilio kortelė ----------
function cdChipV51(text, cls = "") {
  return `<span class="cdChipV51 ${cls}">${escapeHTML(text)}</span>`;
}
function cdInfoHTMLV51(car) {
  const ta = vehicleStatusState(car.taStatus || "unknown", car.taUntil || "");
  const ins = vehicleStatusState(car.insuranceStatus || "unknown", car.insuranceUntil || "");
  const sdkLabel = SDK_STATES.find(x => x[0] === (car.sdkStatus || "unset"))?.[1] || "Nesutvarkyta";
  const sdkTone = { sdkDone: "good", sdkLate: "bad", sdkPending: "warn", sdkUnset: "neutral" }[
    sdkClass(car.sdkStatus)
  ];
  const chips = [
    car.plate ? cdChipV51(car.plate, "plate") : "",
    cdChipV51("TA " + (ta.cls === "neutral" ? "nežinoma" : ta.label.toLowerCase()), ta.cls),
    cdChipV51("Draudimas " + (ins.cls === "neutral" ? "nežinomas" : ins.label.toLowerCase()), ins.cls),
    cdChipV51("SDK " + sdkLabel.toLowerCase(), sdkTone)
  ].join("");
  const engine = [car.engineCc ? `${car.engineCc} cm³` : "", car.powerKw ? `${car.powerKw} kW` : ""]
    .filter(Boolean)
    .join(" · ");
  const facts = [
    ["Pirmoji registracija", car.firstRegistrationDate || (car.year ? String(car.year) : "")],
    [
      "Rida",
      car.mileage != null && car.mileage !== "" ? `${Number(car.mileage).toLocaleString("lt-LT")} km` : ""
    ],
    ["Variklis", engine],
    ["Kuras", car.fuelType],
    ["Liudijimas", car.registrationDoc || car.regDoc],
    ["VIN", car.vin, "wide mono"]
  ].filter(([, v]) => v);
  return `<section class="cdInfoV51" id="cdInfoV51"><div class="cdChipsV51">${chips}</div>${
    facts.length
      ? `<dl class="cdFactsV51">${facts.map(([l, v, cls = ""]) => `<div class="${cls}"><dt>${escapeHTML(l)}</dt><dd>${escapeHTML(String(v))}</dd></div>`).join("")}</dl>`
      : ""
  }</section>`;
}
const __renderCarSheetV51 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV51(car);
  if (!car) return;
  const sheet = document.getElementById("sheet");
  const body = sheet?.querySelector(".premiumDetailBody");
  if (!body) return;
  sheet.classList.add("carSheetV51");
  body.querySelector("#cdInfoV51")?.remove();
  body.insertAdjacentHTML("afterbegin", cdInfoHTMLV51(car));
  const info = body.querySelector("#cdInfoV51");
  const money = body.querySelector(".carBottomCostGrid, .premiumResultGrid");
  if (money) info.after(money);
  // Nuotraukos – atskira sekcija po užduočių; senas „Daugiau informacijos“ ir SDK blokas nebereikalingi.
  const photos = body.querySelector("#carDetailPhotos");
  const tasks = body.querySelector(".carTasksBlock");
  if (photos && tasks) tasks.after(photos);
  body.querySelector("#carDetailInfo")?.setAttribute("hidden", "");
  // Be nuotraukų didelis tuščias paveikslėlio laukas nereikalingas – nuotraukas galima pridėti žemiau.
  const hero = sheet.querySelector(".premiumHero");
  if (hero && hero.querySelector(".premiumHeroEmpty")) hero.style.setProperty("display", "none", "important");
  body.querySelector(".vehicleSdkDisplay")?.setAttribute("hidden", "");
  const edit = sheet.querySelector("#editCarInfoBtn");
  if (edit) edit.textContent = "Redaguoti";
  const pp = sheet.querySelector(".carPpBottomBtn");
  if (pp) pp.textContent = "PP sutartis";
  const del = sheet.querySelector("#deleteCarBtn");
  if (del) del.textContent = "Ištrinti";
  const sell = sheet.querySelector("#sellCarBtn");
  if (sell && /parduoti/i.test(sell.textContent)) sell.textContent = "Parduoti";
};

// ---------- Vadybininkas be skelbimų priminimų (v54) ----------
// Skelbimo būsenos laukas pašalintas iš formų, todėl priminimai „Kodėl dar ne skelbime?“ ir kainos peržiūra pagal
// skelbimo dienas nebeturi prasmės.
const __workCenterItemsV54 = workCenterItems;
workCenterItems = function () {
  return __workCenterItemsV54().filter(it => !/:(listing|price-review)$/.test(it.key || ""));
};
window.__autoEasierWorkCountV1 = () => workCenterItems().length;
const __carRecommendationV54 = carRecommendation;
carRecommendation = function (car) {
  const r = __carRecommendationV54(car);
  if (r && /^Įkelti skelbimą|^Peržiūrėti kainą · stovi/.test(r.text))
    return { ...r, text: "Paruoštas pardavimui", base: 35 };
  return r;
};
