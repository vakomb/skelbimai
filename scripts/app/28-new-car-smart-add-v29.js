// Naujo automobilio išmanus pridėjimas: rankinis arba iš registracijos liudijimo (v29).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

let newCarRegFileV29 = null;
let newCarRegPreviewUrlV29 = "";
let newCarRegDataV29 = { make: "", model: "", year: null, vin: "", plate: "", regDoc: "" };
function newCarFieldV29(id) {
  return document.getElementById(id);
}
function newCarFieldValueV29(id) {
  return (newCarFieldV29(id)?.value || "").trim();
}
function newCarExtractYearV29(text = "") {
  const up = ppNormalizeOcr(text);
  const lines = up
    .split("\n")
    .map(x => x.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const label of ["B", "I"]) {
    const raw = ppLineValue(lines, label);
    const m = String(raw || "").match(/\b(19\d{2}|20\d{2})\b/);
    if (m) {
      const y = Number(m[1]);
      if (y >= 1886 && y <= new Date().getFullYear() + 1) return y;
    }
  }
  return null;
}
function newCarOcrScoreV29(d = {}) {
  return ["make", "model", "year", "vin", "plate", "regDoc"].reduce((n, k) => n + (d[k] ? 1 : 0), 0);
}
function newCarPrettyNameV29(make = "", model = "") {
  const m = String(make || "")
    .trim()
    .toUpperCase();
  const md = String(model || "")
    .trim()
    .toUpperCase();
  return [m, md].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
function newCarUpdateDetectedV29(d = {}) {
  const box = document.getElementById("newCarDetectedV29");
  if (!box) return;
  const title = newCarPrettyNameV29(d.make, d.model);
  const bits = [
    title,
    d.year ? String(d.year) : "",
    d.plate ? `Nr. ${d.plate}` : "",
    d.vin ? `VIN ${d.vin}` : "",
    d.regDoc ? `Liud. ${d.regDoc}` : ""
  ].filter(Boolean);
  box.innerHTML = bits.length
    ? `<strong>${escapeHTML([title, d.year].filter(Boolean).join(" · "))}</strong><span>${escapeHTML(bits.slice(title ? 2 : 0).join(" · "))}</span>`
    : "";
  box.classList.toggle("show", !!bits.length);
}
function newCarApplyRegistrationV29(d = {}) {
  newCarRegDataV29 = {
    make: String(d.make || "")
      .trim()
      .toUpperCase(),
    model: String(d.model || "")
      .trim()
      .toUpperCase(),
    year: d.year ? Number(d.year) : null,
    vin: String(d.vin || "")
      .trim()
      .toUpperCase(),
    plate: String(d.plate || "")
      .trim()
      .toUpperCase(),
    regDoc: String(d.regDoc || "")
      .trim()
      .toUpperCase()
  };
  const name = newCarPrettyNameV29(newCarRegDataV29.make, newCarRegDataV29.model);
  if (name) newCarFieldV29("carName").value = name;
  if (newCarRegDataV29.year) newCarFieldV29("newVehicleyear").value = newCarRegDataV29.year;
  if (newCarRegDataV29.vin) newCarFieldV29("newVehiclevin").value = newCarRegDataV29.vin;
  if (newCarRegDataV29.plate) newCarFieldV29("newVehicleplate").value = newCarRegDataV29.plate;
  if (newCarRegDataV29.regDoc) newCarFieldV29("newVehicleregistrationDoc").value = newCarRegDataV29.regDoc;
  newCarUpdateDetectedV29(newCarRegDataV29);
}
async function newCarScanRegistrationV29(file) {
  if (!file) return;
  const status = document.getElementById("newCarScanStateV29");
  const preview = document.getElementById("newCarScanPreviewV29");
  const img = document.getElementById("newCarScanImageV29");
  newCarRegFileV29 = file;
  if (newCarRegPreviewUrlV29) URL.revokeObjectURL(newCarRegPreviewUrlV29);
  newCarRegPreviewUrlV29 = URL.createObjectURL(file);
  if (img) img.src = newCarRegPreviewUrlV29;
  if (preview) preview.classList.add("show");
  if (status) status.textContent = "Skaitau registracijos liudijimą…";
  try {
    const T = await ppLoadOcr();
    const texts = [];
    const first = await ppPreprocessSmart(file, "contrast");
    const worker = await ppOcrWorker(status);
    if (worker) {
      if (status) status.textContent = "Skaitau dokumentą…";
      const r = await worker.recognize(first);
      texts.push(r?.data?.text || "");
    } else {
      const r = await T.recognize(first, "eng", {
        logger: m => {
          if (status && m.status === "recognizing text") {
            status.textContent = `Skaitau dokumentą · ${Math.round((m.progress || 0) * 100)}%`;
          }
        }
      });
      texts.push(r?.data?.text || "");
    }
    let raw = texts.join("\n");
    let data = { ...(ppParseRegistrationText(raw) || {}), year: newCarExtractYearV29(raw) };
    if (newCarOcrScoreV29(data) < 5) {
      if (status) status.textContent = "Tikslinu dokumento laukus…";
      const second = await ppPreprocessSmart(file, "binary");
      const r = worker ? await worker.recognize(second) : await T.recognize(second, "eng");
      texts.push(r?.data?.text || "");
      raw = texts.join("\n");
      const parsed = ppParseRegistrationText(raw) || {};
      data = { ...parsed, year: newCarExtractYearV29(raw) };
    }
    newCarApplyRegistrationV29(data);
    const found = newCarOcrScoreV29(data);
    if (status) {
      status.textContent =
        found >= 5
          ? "Nuskaityta. Įrašyk pirkimo kainą ir likusius duomenis."
          : `Rasta ${found}/6 laukų. Trūkstamus gali pataisyti „Daugiau informacijos“.`;
    }
    if (found < 3) toast("Dokumentas perskaitytas silpnai — fotografuok tiesiai, be šešėlių", "⚠️");
    else toast(`Nuskaityta ${found}/6 laukų`, "✓");
  } catch (e) {
    console.warn("New car OCR", e);
    if (status)
      status.textContent =
        "Automatinis nuskaitymas nepavyko. Gali fotografuoti dar kartą arba pildyti ranka.";
    toast("OCR nepavyko — patikrink internetą ir nuotrauką", "⚠️");
  }
}
function newCarSetModeV29(mode = "manual") {
  const panel = document.getElementById("addCarPanel");
  if (!panel) return;
  panel.dataset.addMode = mode;
  panel
    .querySelectorAll("[data-new-car-mode]")
    .forEach(b => b.classList.toggle("active", b.dataset.newCarMode === mode));
  const scan = document.getElementById("newCarScanV29");
  if (scan) scan.hidden = mode !== "scan";
  const info = panel.querySelector(".vehicleDetails:not(.vehicleDocuments)");
  const summary = info?.querySelector(":scope > summary");
  if (summary) summary.textContent = mode === "scan" ? "Daugiau informacijos" : "Daugiau informacijos";
}
function newCarResetScanV29() {
  newCarRegFileV29 = null;
  newCarRegDataV29 = { make: "", model: "", year: null, vin: "", plate: "", regDoc: "" };
  if (newCarRegPreviewUrlV29) {
    URL.revokeObjectURL(newCarRegPreviewUrlV29);
    newCarRegPreviewUrlV29 = "";
  }
  const preview = document.getElementById("newCarScanPreviewV29");
  const img = document.getElementById("newCarScanImageV29");
  const status = document.getElementById("newCarScanStateV29");
  const detected = document.getElementById("newCarDetectedV29");
  if (preview) preview.classList.remove("show");
  if (img) img.removeAttribute("src");
  if (status) status.textContent = "";
  if (detected) {
    detected.classList.remove("show");
    detected.innerHTML = "";
  }
  ["newCarCameraV29", "newCarGalleryV29"].forEach(id => {
    const x = document.getElementById(id);
    if (x) x.value = "";
  });
}
function newCarManualMakeModelV29(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return { make: (parts.shift() || "").toUpperCase(), model: parts.join(" ").toUpperCase() };
}
function newCarReadScanFieldsV29() {
  const yearRaw = newCarFieldValueV29("newVehicleyear");
  const mileageRaw = newCarFieldValueV29("newVehiclemileage");
  const askingRaw = newCarFieldValueV29("newVehicleaskingPrice");
  const vin = newCarFieldValueV29("newVehiclevin").toUpperCase();
  const plate = newCarFieldValueV29("newVehicleplate").toUpperCase();
  const regDoc = newCarFieldValueV29("newVehicleregistrationDoc")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const year = yearRaw === "" ? null : Number(yearRaw);
  const mileage = mileageRaw === "" ? null : Number(mileageRaw);
  const askingPrice = askingRaw === "" ? null : Number(askingRaw);
  if (year !== null && (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1))
    throw Error("Patikrink automobilio metus.");
  if (mileage !== null && (!Number.isInteger(mileage) || mileage < 0)) throw Error("Patikrink ridą.");
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw Error("VIN turi sudaryti 17 raidžių ir skaitmenų.");
  if (regDoc && !/^[A-Z][0-9]{5,8}$/.test(regDoc))
    throw Error("Patikrink registracijos liudijimo seriją ir numerį.");
  const sdk = newCarFieldValueV29("newVehiclesdk").toUpperCase();
  return {
    sdk,
    sdkStatus: sdk ? "done" : "unset",
    vin,
    year,
    mileage,
    plate,
    registrationDoc: regDoc,
    askingPrice,
    source: "",
    taStatus: newCarFieldValueV29("newVehicletaStatus") || "unknown",
    taUntil: "",
    insuranceStatus: newCarFieldValueV29("newVehicleinsuranceStatus") || "unknown",
    insuranceUntil: "",
    listingStatus: "not-listed",
    listingDate: ""
  };
}
async function newCarRegistrationDocumentV29(existingDocs = []) {
  if (!newCarRegFileV29) return existingDocs;
  const same = existingDocs.some(
    d =>
      d.kind === "registration" &&
      d.name === newCarRegFileV29.name &&
      Number(d.size || 0) === Number(newCarRegFileV29.size || 0)
  );
  if (same) return existingDocs;
  const blob = await readDocumentFile(newCarRegFileV29);
  const key = await putDocument(blob);
  const ext = blob.type === "image/png" ? ".png" : blob.type === "image/webp" ? ".webp" : ".jpg";
  const reg = newCarFieldValueV29("newVehicleregistrationDoc").replace(/[^A-Za-z0-9]/g, "");
  const name = `Registracijos-liudijimas-${reg || todayISO()}${ext}`;
  return [
    {
      id: uid(),
      key,
      kind: "registration",
      name,
      type: blob.type,
      size: blob.size,
      addedAt: nowLabel(),
      addedDateISO: todayISO()
    },
    ...existingDocs
  ];
}
function installNewCarSmartAddV29() {
  const panel = document.getElementById("addCarPanel");
  const addBtn = document.getElementById("addCarBtn");
  if (!panel || !addBtn || panel.dataset.smartCarV29 === "1") return;
  panel.dataset.smartCarV29 = "1";
  panel.dataset.addMode = "manual";
  const head = panel.querySelector(".sectionHead");
  if (head) {
    head.insertAdjacentHTML(
      "afterend",
      `\n        <div class="newCarModeV29" role="tablist" aria-label="Automobilio pridėjimo būdas">\n          <button class="active" type="button" data-new-car-mode="manual">Pildyti ranka</button>\n          <button type="button" data-new-car-mode="scan">Iš registracijos liudijimo</button>\n        </div>\n        <section class="newCarScanV29" id="newCarScanV29" hidden>\n          <div class="newCarScanActionsV29">\n            <label class="newCarScanBtnV29" for="newCarCameraV29">\n              <span>📷</span><strong>Fotografuoti</strong>\n              <input id="newCarCameraV29" type="file" accept="image/*" capture="environment">\n            </label>\n            <label class="newCarScanBtnV29" for="newCarGalleryV29">\n              <span>🖼️</span><strong>Iš galerijos</strong>\n              <input id="newCarGalleryV29" type="file" accept="image/*">\n            </label>\n          </div>\n          <div class="newCarScanPreviewV29" id="newCarScanPreviewV29"><img id="newCarScanImageV29" alt="Registracijos liudijimas"></div>\n          <div class="newCarScanStateV29" id="newCarScanStateV29"></div>\n          <div class="newCarDetectedV29" id="newCarDetectedV29"></div>\n        </section>`
    );
  }
  const info = panel.querySelector(".vehicleDetails:not(.vehicleDocuments)");
  if (info) {
    const body = info.querySelector(".vehicleFields");
    const essentials = document.createElement("div");
    essentials.className = "newCarEssentialsV29";
    const mileage = newCarFieldV29("newVehiclemileage")?.closest(".field");
    const ta = newCarFieldV29("newVehicletaStatus")?.closest(".field");
    const insurance = newCarFieldV29("newVehicleinsuranceStatus")?.closest(".field");
    [mileage, ta, insurance].filter(Boolean).forEach(el => essentials.appendChild(el));
    info.parentNode.insertBefore(essentials, info);
  }
  panel
    .querySelectorAll("[data-new-car-mode]")
    .forEach(b => (b.onclick = () => newCarSetModeV29(b.dataset.newCarMode)));
  ["newCarCameraV29", "newCarGalleryV29"].forEach(id => {
    const input = document.getElementById(id);
    if (input)
      input.onchange = async () => {
        const f = input.files?.[0];
        if (f) await newCarScanRegistrationV29(f);
      };
  });
  const cancel = document.getElementById("cancelAddCarBtn");
  if (cancel) {
    const oldCancel = cancel.onclick;
    cancel.onclick = () => {
      newCarResetScanV29();
      newCarSetModeV29("manual");
      if (typeof oldCancel === "function") oldCancel();
    };
  }
  addBtn.onclick = async () => {
    if (addBtn.disabled) return;
    const mode = panel.dataset.addMode || "manual";
    const name = newCarFieldValueV29("carName");
    const buy = Number(newCarFieldValueV29("carBuyPrice") || 0);
    try {
      if (!name)
        throw Error(
          mode === "scan"
            ? "Nuskaityk dokumentą arba įrašyk automobilio pavadinimą."
            : "Įvesk automobilio pavadinimą."
        );
      if (!Number.isFinite(buy) || buy <= 0) throw Error("Įvesk pirkimo kainą.");
      const extra = mode === "scan" ? newCarReadScanFieldsV29() : readVehicleFields("newVehicle");
      const parsed =
        mode === "scan"
          ? { make: newCarRegDataV29.make, model: newCarRegDataV29.model }
          : newCarManualMakeModelV29(name);
      addBtn.disabled = true;
      addBtn.textContent = "Išsaugoma…";
      let docs = await collectDocuments("newVehicle");
      docs = await newCarRegistrationDocumentV29(docs);
      const photos = [];
      for (const f of Array.from(document.getElementById("carPhoto").files || [])) {
        const key = await storeImageFile(f);
        if (!key) throw Error("Nepavyko pridėti nuotraukos.");
        photos.push(key);
        await photoGet(key);
      }
      const c = {
        id: uid(),
        name,
        ...extra,
        regMake: (parsed.make || "").toUpperCase(),
        regModel: (parsed.model || "").toUpperCase(),
        documents: docs,
        photos,
        imageSrc: photos[0] || "",
        notes: "",
        buyPrice: buy,
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
      state.finances.budgetBalance -= buy;
      if (!saveState()) {
        state.cars = state.cars.filter(x => x !== c);
        state.finances.budgetBalance += buy;
        throw Error("Nepavyko išsaugoti automobilio.");
      }
      addHistory("Automobilis nupirktas", `${name} • ${moneyFmt(buy)}`, "🚗", {
        kind: "car",
        id: c.id,
        label: "Atidaryti automobilį"
      });
      saveState();
      document.querySelectorAll("#addCarPanel input").forEach(i => (i.value = ""));
      document.querySelectorAll("#addCarPanel .vehicleDocPicker small").forEach(e => (e.textContent = ""));
      const sdkStatus = document.getElementById("newVehiclesdkStatus");
      if (sdkStatus) {
        sdkStatus.value = "unset";
        sdkStatus.className = "input sdkUnset";
      }
      ["newVehicletaStatus", "newVehicleinsuranceStatus"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.value = "unknown";
          el.dispatchEvent(new Event("change"));
        }
      });
      const listing = document.getElementById("newVehiclelistingStatus");
      if (listing) {
        listing.value = "not-listed";
        listing.dispatchEvent(new Event("change"));
      }
      document.querySelectorAll("#addCarPanel details").forEach(d => (d.open = false));
      newCarResetScanV29();
      newCarSetModeV29("manual");
      if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
      else panel.style.display = "none";
      const show = document.getElementById("showAddCarFormBtn");
      if (show) show.style.display = "block";
      render();
      toast("Automobilis pridėtas", "✓");
    } catch (e) {
      console.warn("Add car v29", e);
      toast(e.message || "Nepavyko pridėti automobilio", "!");
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = "Išsaugoti automobilį";
    }
  };
}
