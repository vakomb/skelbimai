// Registracijos liudijimo duomenys ir skenavimas visoje programėlėje (v50):
// naujas automobilis, automobilio redagavimas, Vadybininko „trūkstami duomenys“, PP sutarties generatorius,
// automobilio kortelės peržiūra. Skenavimo variklis – 33-registration-scanner.js (RegScan).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const REG_FIELDS_V50 = [
  { key: "regMake", scan: "make", label: "Markė", code: "D.1", max: 40, placeholder: "Nissan" },
  { key: "regModel", scan: "model", label: "Modelis", code: "D.3", max: 60, placeholder: "Murano" },
  {
    key: "registrationDoc",
    scan: "regDoc",
    label: "Liudijimo serija ir nr.",
    code: "",
    max: 12,
    caps: true,
    placeholder: "K1281961"
  },
  {
    key: "plate",
    scan: "plate",
    label: "Valstybinis nr.",
    code: "A",
    max: 10,
    caps: true,
    placeholder: "ABC123"
  },
  {
    key: "vin",
    scan: "vin",
    label: "VIN kodas",
    code: "E",
    max: 17,
    caps: true,
    wide: true,
    placeholder: "17 simbolių"
  },
  {
    key: "firstRegistrationDate",
    scan: "firstRegistrationDate",
    label: "Pirmoji registracija",
    code: "B",
    type: "date"
  },
  {
    key: "engineCc",
    scan: "engineCc",
    label: "Variklio tūris, cm³",
    code: "P.1",
    type: "number",
    min: 0,
    max: 20000,
    placeholder: "1998"
  },
  {
    key: "powerKw",
    scan: "powerKw",
    label: "Galia, kW",
    code: "P.2",
    type: "number",
    min: 0,
    max: 2000,
    placeholder: "110"
  },
  {
    key: "fuelType",
    scan: "fuelType",
    label: "Kuras",
    code: "P.3",
    max: 40,
    list: true,
    wide: true,
    placeholder: "Dyzelinas"
  }
];
const REG_FUELS_V50 = [
  "Benzinas",
  "Dyzelinas",
  "Elektra",
  "Benzinas / elektra",
  "Dyzelinas / elektra",
  "Benzinas / dujos",
  "Dujos",
  "Vandenilis",
  "Etanolis"
];
const regScanFilesV50 = {};
const regAutoNameV50 = {};

function regIconV50(name) {
  const p = {
    camera: '<path d="M4 8.5h3l1.6-2.3h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
    gallery:
      '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 5-4.6 3.3 3 2.4-2.1 4.3 3.7"/>',
    doc: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>'
  }[name];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
function regCardValueV50(c, key) {
  if (key === "registrationDoc") return c.registrationDoc || c.regDoc || "";
  if (key === "regMake") return regPrettyMakeV50(c.regMake || "");
  if (key === "regModel") return regPrettyModelV50(c.regModel || "");
  return c[key] ?? "";
}
// Senesni įrašai saugojo markę / modelį didžiosiomis raidėmis – rodome gražiai.
function regPrettyMakeV50(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s !== s.toUpperCase()) return s;
  const m = RegScan._t.matchMake(s);
  return m && m.index === 0 && m.d === 0 ? m.name : s;
}
function regPrettyModelV50(v) {
  const s = String(v || "").trim();
  return s && s === s.toUpperCase() ? RegScan._t.prettyModel(s, "") : s;
}
function regCardHTMLV50(p, c = {}) {
  const fields = REG_FIELDS_V50.map(f => {
    const id = p + f.key,
      value = regCardValueV50(c, f.key),
      attrs = [
        `class="input"`,
        `id="${id}"`,
        `type="${f.type || "text"}"`,
        `value="${escapeHTML(value)}"`,
        f.placeholder ? `placeholder="${escapeHTML(f.placeholder)}"` : "",
        f.type === "number"
          ? `min="${f.min}" max="${f.max}" step="1" inputmode="numeric"`
          : f.type === "date"
            ? ""
            : `maxlength="${f.max}"`,
        f.caps ? 'autocapitalize="characters" autocomplete="off" spellcheck="false"' : 'autocomplete="off"',
        f.list ? `list="${p}regFuelList"` : "",
        `data-reg-input="${f.key}"`
      ].join(" ");
    return `<div class="field regFieldV50 ${f.wide ? "regWideV50" : ""}" data-reg-field="${f.key}"><label for="${id}">${escapeHTML(f.label)}${f.code ? `<em>${f.code}</em>` : ""}</label><input ${attrs}><small class="regHintV50"></small></div>`;
  }).join("");
  return `<section class="regCardV50" id="${p}regCard" aria-label="Registracijos liudijimo duomenys">
    <div class="regCardHeadV50"><span class="regCardIcoV50">${regIconV50("doc")}</span><div><strong>Registracijos liudijimas</strong><span>Nufotografuokite liudijimą – duomenys užsipildys automatiškai</span></div></div>
    <div class="regScanBtnsV50">
      <label class="regScanBtnV50 primary">${regIconV50("camera")}<span>Fotografuoti</span><input id="${p}regCamera" type="file" accept="image/*" capture="environment"></label>
      <label class="regScanBtnV50">${regIconV50("gallery")}<span>Iš galerijos</span><input id="${p}regGallery" type="file" accept="image/*"></label>
    </div>
    <div class="regScanStatusV50" id="${p}regStatus" hidden><div class="regScanTopV50"><img id="${p}regPreview" alt=""><div><span class="regScanMsgV50" id="${p}regMsg"></span><div class="regScanBarV50"><i id="${p}regBar"></i></div></div></div></div>
    <div class="regGridV50">${fields}</div>
    <datalist id="${p}regFuelList">${REG_FUELS_V50.map(f => `<option value="${escapeHTML(f)}">`).join("")}</datalist>
  </section>`;
}
// Pašalina senus (pasikartojančius) registracijos laukus iš anksčiau sugeneruotos formos.
function regStripOldFieldsV50(root, p) {
  for (const key of [
    "vin",
    "plate",
    "registrationDoc",
    "firstRegistrationDate",
    "firstRegistrationLithuaniaDate",
    "modelYear",
    "registrationType"
  ]) {
    const el = root.querySelector("#" + p + key);
    const card = el?.closest(".regCardV50");
    if (el && !card) (el.closest(".field") || el).remove();
  }
  root.querySelectorAll(`#${p}registrationData, .registrationMetaV41`).forEach(el => el.remove());
  for (const key of ["regMake", "regModel"]) {
    const el = root.querySelector("#" + p + key);
    if (el && !el.closest(".regCardV50")) (el.closest(".field") || el).remove();
  }
}
const __vehicleFieldsRegV50 = vehicleFields;
vehicleFields = function (p, c = {}) {
  const html = __vehicleFieldsRegV50(p, c);
  if (!["newVehicle", "editVehicle"].includes(p)) return html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  regStripOldFieldsV50(tpl.content, p);
  return regCardHTMLV50(p, c) + tpl.innerHTML;
};
const __readVehicleFieldsRegV50 = readVehicleFields;
readVehicleFields = function (p) {
  const o = __readVehicleFieldsRegV50(p);
  if (!document.getElementById(p + "regCard")) return o;
  const val = k => (document.getElementById(p + k)?.value || "").trim();
  const b = val("firstRegistrationDate");
  if (b && (!/^\d{4}-\d{2}-\d{2}$/.test(b) || Number(b.slice(0, 4)) < 1900 || b > todayISO()))
    throw Error("Patikrinkite pirmosios registracijos datą.");
  const num = (k, label, max) => {
    const v = val(k);
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > max) throw Error(`Patikrinkite lauką „${label}“.`);
    return n;
  };
  const plate = val("plate").toUpperCase().replace(/\s+/g, "");
  return {
    ...o,
    plate,
    regMake: val("regMake"),
    regModel: val("regModel"),
    firstRegistrationDate: b,
    year: o.year ?? (b ? Number(b.slice(0, 4)) : null),
    engineCc: num("engineCc", "Variklio tūris", 20000),
    powerKw: num("powerKw", "Galia, kW", 2000),
    fuelType: val("fuelType")
  };
};

// ---------- Skenavimo valdiklis (bendras visoms formoms) ----------
function regSetStatusV50(p, { msg, pct, tone, preview } = {}) {
  const box = document.getElementById(p + "regStatus");
  if (!box) return;
  box.hidden = false;
  if (msg != null) document.getElementById(p + "regMsg").textContent = msg;
  if (pct != null) document.getElementById(p + "regBar").style.width = Math.max(3, Math.min(100, pct)) + "%";
  box.dataset.tone = tone || "";
  if (preview) document.getElementById(p + "regPreview").src = preview;
}
function regProgressPctV50(e) {
  if (e.stage === "prepare") return 6;
  if (e.stage === "ocr" && e.loading) return 12;
  if (e.stage === "ocr" && e.pass) return 18 + ((e.pass - 1 + (e.ocr || 0)) / e.passes) * 64;
  if (e.stage === "ocr") return 14;
  if (e.stage === "refine") return 88;
  return 100;
}
async function regRunScanV50(p, file, { car = null, nameInputId = "" } = {}) {
  if (!file || !String(file.type || "image/").startsWith("image/")) return null;
  const card = document.getElementById(p + "regCard");
  card?.querySelectorAll("[data-reg-field]").forEach(f => f.classList.remove("regFilledV50", "regCheckV50"));
  card?.querySelectorAll(".regHintV50").forEach(h => (h.textContent = ""));
  const previewUrl = URL.createObjectURL(file);
  regSetStatusV50(p, { msg: "Paruošiama nuotrauka…", pct: 4, tone: "busy", preview: previewUrl });
  card?.classList.add("regBusyV50");
  try {
    const result = await RegScan.scan(file, {
      onProgress: e => regSetStatusV50(p, { msg: e.message, pct: regProgressPctV50(e), tone: "busy" })
    });
    const v = result.values;
    // Kito automobilio liudijimas redaguojant: VIN nesutampa.
    if (car?.vin && v.vin && car.vin !== v.vin) {
      const ok = window.confirm(
        `Nuskaitytas VIN ${v.vin} nesutampa su šio automobilio VIN ${car.vin}.\n\nAr tikrai tai šio automobilio registracijos liudijimas? Spauskite „Gerai“, kad vis tiek užpildytumėte laukus.`
      );
      if (!ok) {
        regSetStatusV50(p, {
          msg: "Laukai nepakeisti – liudijimas nepriklauso šiam automobiliui.",
          pct: 100,
          tone: "bad"
        });
        return null;
      }
    }
    let filled = 0;
    const unsure = [],
      missing = [];
    for (const f of REG_FIELDS_V50) {
      const input = document.getElementById(p + f.key);
      const value = v[f.scan];
      const wrap = input?.closest("[data-reg-field]");
      if (value === "" || value == null) {
        missing.push(f.label);
        continue;
      }
      if (!input) {
        // Formoje šio laukelio nėra (pvz. Vadybininke) – reikšmė nuskaityta ir bus išsaugota kartu.
        filled++;
        continue;
      }
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      filled++;
      const field =
        result.fields[
          f.scan === "firstRegistrationDate" && v.firstRegistrationSource === "B.1"
            ? "firstRegistrationLithuaniaDate"
            : f.scan
        ];
      const conf = field?.confidence ?? 1;
      const low = conf < 0.45 || (field?.hits === 1 && result.passes > 2);
      wrap?.classList.add(low ? "regCheckV50" : "regFilledV50");
      if (low) unsure.push(f.label);
      if (f.key === "firstRegistrationDate" && v.firstRegistrationSource === "B.1") {
        const hint = wrap?.querySelector(".regHintV50");
        if (hint) hint.textContent = "B nenurodyta – įrašyta registracija Lietuvoje (B.1)";
      }
    }
    // Pagaminimo metai – iš pirmosios registracijos, jei dar neįrašyti.
    const year = document.getElementById(p + "year");
    if (year && !year.value && v.firstRegistrationDate) year.value = v.firstRegistrationDate.slice(0, 4);
    // Pavadinimas = Markė + Modelis.
    const nameInput = nameInputId && document.getElementById(nameInputId);
    const title = [v.make, v.model].filter(Boolean).join(" ");
    if (
      nameInput &&
      title &&
      (!nameInput.value.trim() || nameInput.value.trim() === regAutoNameV50[p] || car)
    ) {
      nameInput.value = title;
      regAutoNameV50[p] = title;
    }
    regScanFilesV50[p] = file;
    const total = REG_FIELDS_V50.length;
    const msg =
      filled === total && !unsure.length
        ? `Nuskaityti visi ${total} laukai. Patikrinkite ir išsaugokite.`
        : `Nuskaityta ${filled} iš ${total} laukų.` +
          (unsure.length ? ` Patikrinkite: ${unsure.join(", ").replace(/\.$/, "")}.` : "") +
          (missing.length ? ` Neatpažinta: ${missing.join(", ").replace(/\.$/, "")}.` : "");
    regSetStatusV50(p, {
      msg,
      pct: 100,
      tone: filled === total && !unsure.length ? "good" : filled >= 5 ? "warn" : "bad"
    });
    if (filled < 4)
      toast("Liudijimas perskaitytas silpnai – nufotografuokite iš arčiau, be atspindžių", "⚠️");
    else toast(`Nuskaityta ${filled}/${total} laukų`, "✓");
    return result;
  } catch (e) {
    console.warn("Registracijos liudijimo skenavimas", e);
    regSetStatusV50(p, {
      msg: (e && e.message) || "Nuskaityti nepavyko. Bandykite dar kartą arba pildykite ranka.",
      pct: 100,
      tone: "bad"
    });
    toast("Nuskaityti nepavyko", "⚠️");
    return null;
  } finally {
    card?.classList.remove("regBusyV50");
    setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
  }
}
function regBindCardV50(p, opts = {}) {
  const card = document.getElementById(p + "regCard");
  if (!card || card.dataset.bound === "1") return;
  card.dataset.bound = "1";
  for (const id of [p + "regCamera", p + "regGallery"]) {
    const input = document.getElementById(id);
    if (input)
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        input.value = "";
        if (file) await regRunScanV50(p, file, typeof opts === "function" ? opts() : opts);
      });
  }
  for (const key of ["registrationDoc", "plate", "vin"]) {
    const el = document.getElementById(p + key);
    el?.addEventListener("input", () => {
      const pos = el.selectionStart;
      el.value = el.value.toUpperCase().replace(/\s+/g, "");
      try {
        el.setSelectionRange(pos, pos);
      } catch (e) {}
    });
  }
  // Pavadinimas sekamas iš markės ir modelio, kol vartotojas jo neperrašė.
  const nameId = (typeof opts === "function" ? opts() : opts).nameInputId;
  const sync = () => {
    const name = nameId && document.getElementById(nameId);
    const title = [
      document.getElementById(p + "regMake")?.value.trim(),
      document.getElementById(p + "regModel")?.value.trim()
    ]
      .filter(Boolean)
      .join(" ");
    if (name && title && (!name.value.trim() || name.value.trim() === regAutoNameV50[p])) {
      name.value = title;
      regAutoNameV50[p] = title;
    }
  };
  document.getElementById(p + "regMake")?.addEventListener("input", sync);
  document.getElementById(p + "regModel")?.addEventListener("input", sync);
  card
    .querySelectorAll("[data-reg-input]")
    .forEach(el =>
      el.addEventListener("input", () => el.closest("[data-reg-field]")?.classList.remove("regCheckV50"))
    );
}
async function regDocumentFromFileV50(file, regNo = "") {
  const blob = await readDocumentFile(file);
  const key = await putDocument(blob);
  const ext = blob.type === "image/png" ? ".png" : blob.type === "image/webp" ? ".webp" : ".jpg";
  return {
    id: uid(),
    key,
    kind: "registration",
    name: `Registracijos-liudijimas-${String(regNo || "").replace(/[^A-Za-z0-9]/g, "") || todayISO()}${ext}`,
    type: blob.type,
    size: blob.size,
    addedAt: nowLabel(),
    addedDateISO: todayISO()
  };
}

// ---------- Naujas automobilis ----------
function installNewCarRegistrationV50() {
  const panel = document.getElementById("addCarPanel");
  const addBtn = document.getElementById("addCarBtn");
  if (!panel || !addBtn || panel.dataset.regV50 === "1") return;
  panel.dataset.regV50 = "1";
  // Senasis „Pildyti ranka / Iš registracijos liudijimo“ perjungiklis nebereikalingas – skenavimas visada po ranka.
  panel.querySelector(".newCarModeV29")?.remove();
  document.getElementById("newCarScanV29")?.remove();
  panel.dataset.addMode = "manual";
  regStripOldFieldsV50(panel, "newVehicle");
  const nameField = document.getElementById("carName")?.closest(".field");
  (nameField || addBtn).insertAdjacentHTML("beforebegin", regCardHTMLV50("newVehicle", {}));
  regBindCardV50("newVehicle", { nameInputId: "carName" });
  const nameLabel = panel.querySelector('label[for="carName"]');
  if (nameLabel) nameLabel.textContent = "Pavadinimas (markė ir modelis)";
  const resetCard = () => {
    delete regScanFilesV50.newVehicle;
    delete regAutoNameV50.newVehicle;
    const st = document.getElementById("newVehicleregStatus");
    if (st) st.hidden = true;
    panel
      .querySelectorAll("[data-reg-field]")
      .forEach(f => f.classList.remove("regFilledV50", "regCheckV50"));
    panel.querySelectorAll(".regHintV50").forEach(h => (h.textContent = ""));
  };
  const cancel = document.getElementById("cancelAddCarBtn");
  if (cancel) {
    const old = cancel.onclick;
    cancel.onclick = e => {
      resetCard();
      if (typeof old === "function") return old.call(cancel, e);
    };
  }
  addBtn.onclick = async () => {
    if (addBtn.disabled) return;
    const makeV = (document.getElementById("newVehicleregMake")?.value || "").trim();
    const modelV = (document.getElementById("newVehicleregModel")?.value || "").trim();
    const name =
      (document.getElementById("carName")?.value || "").trim() || [makeV, modelV].filter(Boolean).join(" ");
    const buy = Number(document.getElementById("carBuyPrice")?.value || 0);
    try {
      if (!name) throw Error("Nuskenuokite liudijimą arba įrašykite automobilio markę ir modelį.");
      if (!Number.isFinite(buy) || buy <= 0) throw Error("Įveskite pirkimo kainą.");
      const extra = readVehicleFields("newVehicle");
      if (!extra.regMake && !extra.regModel) {
        const parts = name.split(/\s+/);
        extra.regMake = regPrettyMakeV50(parts.shift() || "");
        extra.regModel = parts.join(" ");
      }
      addBtn.disabled = true;
      addBtn.textContent = "Išsaugoma…";
      let docs = await collectDocuments("newVehicle");
      const scanned = regScanFilesV50.newVehicle;
      if (scanned && !docs.some(d => d.kind === "registration"))
        docs = [await regDocumentFromFileV50(scanned, extra.registrationDoc), ...docs];
      const photos = [];
      for (const f of Array.from(document.getElementById("carPhoto")?.files || [])) {
        const key = await storeImageFile(f);
        if (!key) throw Error("Nepavyko pridėti nuotraukos.");
        photos.push(key);
        await photoGet(key);
      }
      const c = {
        id: uid(),
        name,
        ...extra,
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
      panel.querySelectorAll("input").forEach(i => {
        if (i.type !== "file") i.value = "";
        else i.value = "";
      });
      panel.querySelectorAll(".vehicleDocPicker small").forEach(e => (e.textContent = ""));
      const sdkStatus = document.getElementById("newVehiclesdkStatus");
      if (sdkStatus) {
        sdkStatus.value = "unset";
        sdkStatus.className = "input sdkUnset";
      }
      for (const id of ["newVehicletaStatus", "newVehicleinsuranceStatus"]) {
        const el = document.getElementById(id);
        if (el) {
          el.value = "unknown";
          el.dispatchEvent(new Event("change"));
        }
      }
      const listing = document.getElementById("newVehiclelistingStatus");
      if (listing) {
        listing.value = "not-listed";
        listing.dispatchEvent(new Event("change"));
      }
      panel.querySelectorAll("details").forEach(d => (d.open = false));
      resetCard();
      if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
      else panel.style.display = "none";
      const show = document.getElementById("showAddCarFormBtn");
      if (show) show.style.display = "block";
      render();
      toast("Automobilis pridėtas", "✓");
    } catch (e) {
      console.warn("Add car v50", e);
      toast(e.message || "Nepavyko pridėti automobilio", "!");
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = "Išsaugoti automobilį";
    }
  };
}
installNewCarRegistrationV50();

// ---------- Automobilio redagavimas ----------
const __openCarEditSheetRegV50 = openCarEditSheet;
openCarEditSheet = function (id) {
  __openCarEditSheetRegV50(id);
  const car = (state.cars || []).find(c => c.id === id);
  if (!car) return;
  // Senoji „registracijos dokumento“ įkėlimo OCR logika pašalinama – failas vėl tik prisegamas.
  const oldInput = document.getElementById("editVehicledoc_registration");
  if (oldInput) oldInput.replaceWith(oldInput.cloneNode(true));
  regBindCardV50("editVehicle", () => ({ car, nameInputId: "editCarName" }));
  const save = document.getElementById("saveCarEdit");
  if (save && typeof save.onclick === "function") {
    const base = save.onclick;
    save.onclick = async e => {
      const file = regScanFilesV50.editVehicle;
      const before = (car.documents || []).length;
      await base.call(save, e);
      const saved = (state.cars || []).find(c => c.id === id);
      if (!file || !saved || (saved.documents || []).length < before) return;
      delete regScanFilesV50.editVehicle;
      if ((saved.documents || []).some(d => d.kind === "registration")) return;
      try {
        saved.documents = [
          ...(saved.documents || []),
          await regDocumentFromFileV50(file, saved.registrationDoc)
        ];
        saveState();
        if (window.__openCarId === saved.id || document.querySelector("#sheet .premiumDetail"))
          openCar(saved.id);
      } catch (err) {
        console.warn("Registracijos dokumento prisegimas", err);
      }
    };
  }
};

// ---------- Automobilio kortelė: registracijos duomenų peržiūra ----------
const __renderCarSheetRegV50 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetRegV50(car);
  const list = document.querySelector("#sheet .vehicleInfo");
  if (!list || !car) return;
  list
    .querySelectorAll("[data-registration-v42-view],[data-registration-v41-view],[data-reg-view-v50]")
    .forEach(el => el.remove());
  list.querySelectorAll("dt").forEach(dt => {
    if (/^Registracijos liudijimo serija/.test(dt.textContent.trim())) dt.parentElement?.remove();
  });
  const engine = [car.engineCc ? `${car.engineCc} cm³` : "", car.powerKw ? `${car.powerKw} kW` : ""]
    .filter(Boolean)
    .join(" · ");
  const rows = [
    ["Markė", regPrettyMakeV50(car.regMake)],
    ["Modelis", regPrettyModelV50(car.regModel)],
    ["Registracijos liudijimas", car.registrationDoc || car.regDoc],
    ["Pirmoji registracija", car.firstRegistrationDate],
    ["Variklis", engine],
    ["Kuras", car.fuelType]
  ].filter(([, v]) => v !== "" && v != null);
  list.insertAdjacentHTML(
    "afterbegin",
    rows
      .map(
        ([l, v]) => `<div data-reg-view-v50><dt>${escapeHTML(l)}</dt><dd>${escapeHTML(String(v))}</dd></div>`
      )
      .join("")
  );
};

// ---------- Vadybininkas: „Užpildyti trūkstamus duomenis“ ----------
const __openWhatMissingDataRegV50 = openWhatMissingDataV30;
openWhatMissingDataV30 = function (item) {
  __openWhatMissingDataRegV50(item);
  const car = (state.cars || []).find(c => c.id === item.id);
  const sheet = document.querySelector("#sheet .whatQuickSheetV30");
  if (!car || !sheet) return;
  sheet.querySelector(".whatRegScanV31")?.remove(); // senasis skeneris
  const grid = sheet.querySelector(".whatQuickGridV30");
  const keys = [...sheet.querySelectorAll('[id^="what_"]')].map(el => el.id.slice(5));
  const regRelated = keys.some(k =>
    ["vin", "plate", "registrationDoc", "year", "regMake", "regModel"].includes(k)
  );
  if (!regRelated || !grid) return;
  grid.insertAdjacentHTML(
    "beforebegin",
    `<section class="regCardV50 regCardCompactV50" id="whatRegregCard"><div class="regCardHeadV50"><span class="regCardIcoV50">${regIconV50("doc")}</span><div><strong>Užpildyti iš registracijos liudijimo</strong><span>Nufotografuokite liudijimą – trūkstami laukai užsipildys</span></div></div><div class="regScanBtnsV50"><label class="regScanBtnV50 primary">${regIconV50("camera")}<span>Fotografuoti</span><input id="whatRegregCamera" type="file" accept="image/*" capture="environment"></label><label class="regScanBtnV50">${regIconV50("gallery")}<span>Iš galerijos</span><input id="whatRegregGallery" type="file" accept="image/*"></label></div><div class="regScanStatusV50" id="whatRegregStatus" hidden><div class="regScanTopV50"><img id="whatRegregPreview" alt=""><div><span class="regScanMsgV50" id="whatRegregMsg"></span><div class="regScanBarV50"><i id="whatRegregBar"></i></div></div></div></div></section>`
  );
  let scanned = null,
    scannedFile = null;
  const card = document.getElementById("whatRegregCard");
  card.dataset.bound = "1";
  for (const id of ["whatRegregCamera", "whatRegregGallery"]) {
    const input = document.getElementById(id);
    input?.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      const result = await regRunScanV50("whatReg", file, { car });
      if (!result) return;
      scanned = result.values;
      scannedFile = file;
      const map = {
        vin: scanned.vin,
        plate: scanned.plate,
        registrationDoc: scanned.regDoc,
        year: scanned.firstRegistrationDate?.slice(0, 4),
        regMake: scanned.make,
        regModel: scanned.model
      };
      for (const [k, v] of Object.entries(map)) {
        const el = document.getElementById("what_" + k);
        if (el && v) {
          el.value = v;
          el.closest(".field")?.classList.add("regFilledV50");
        }
      }
    });
  }
  const save = document.getElementById("whatSaveMissingV30");
  if (save && typeof save.onclick === "function") {
    const base = save.onclick;
    save.onclick = async e => {
      await base.call(save, e);
      if (!scanned || document.getElementById("whatSaveMissingV30")) return; // neišsaugota (klaida) – langas liko atidarytas
      const saved = (state.cars || []).find(c => c.id === car.id);
      if (!saved) return;
      const patch = {};
      const setIfEmpty = (k, v) => {
        if ((saved[k] === "" || saved[k] == null) && v !== "" && v != null) patch[k] = v;
      };
      setIfEmpty("regMake", scanned.make);
      setIfEmpty("regModel", scanned.model);
      setIfEmpty("registrationDoc", scanned.regDoc);
      setIfEmpty("vin", scanned.vin);
      setIfEmpty("plate", scanned.plate);
      setIfEmpty("firstRegistrationDate", scanned.firstRegistrationDate);
      setIfEmpty("engineCc", scanned.engineCc);
      setIfEmpty("powerKw", scanned.powerKw);
      setIfEmpty("fuelType", scanned.fuelType);
      try {
        if (scannedFile && !(saved.documents || []).some(d => d.kind === "registration"))
          patch.documents = [
            ...(saved.documents || []),
            await regDocumentFromFileV50(scannedFile, patch.registrationDoc || saved.registrationDoc)
          ];
      } catch (err) {}
      if (Object.keys(patch).length) {
        Object.assign(saved, patch);
        saveState();
        render();
      }
    };
  }
};

// ---------- PP sutarties generatorius ir seni skenerio įėjimai -> naujas variklis ----------
ppScanRegistration = async function (file) {
  const st = document.getElementById("ppScanState"),
    det = document.getElementById("ppDetected");
  if (det) {
    det.classList.remove("show");
    det.textContent = "";
  }
  try {
    const r = await RegScan.scan(file, {
      onProgress: e => st && (st.textContent = e.message || "Skaitomas liudijimas…")
    });
    const v = r.values;
    ppApplyVehicleData({
      vin: v.vin,
      make: String(v.make || "").toUpperCase(),
      model: String(v.model || "").toUpperCase(),
      plate: v.plate,
      regDoc: v.regDoc
    });
    const found = ["vin", "make", "model", "plate", "regDoc"].filter(k => v[k]).length;
    if (st)
      st.textContent =
        found >= 4
          ? "Nuskaityta. Patikrinkite laukus ir generuokite sutartį."
          : `Rasta ${found}/5 laukų. Trūkstamus įrašykite ranka.`;
    if (det) {
      det.textContent = [v.make, v.model, v.plate, v.vin && `VIN ${v.vin}`, v.regDoc && `Liud. ${v.regDoc}`]
        .filter(Boolean)
        .join(" · ");
      det.classList.toggle("show", !!det.textContent);
    }
    toast(`Nuskaityta ${found}/5 laukų`, found >= 3 ? "✓" : "⚠️");
  } catch (e) {
    if (st)
      st.textContent = "Automatinis nuskaitymas nepavyko. Pildykite ranka arba fotografuokite dar kartą.";
    toast("Nuskaityti nepavyko", "⚠️");
  }
};
// Suderinamumas su senesniais kvietimais (identiteto patikra, kiti moduliai).
async function registrationScanAdapterV50(file, statusEl) {
  const r = await RegScan.scan(file, {
    onProgress: e => statusEl && e.message && (statusEl.textContent = e.message)
  });
  const v = r.values;
  const fields = {};
  for (const k of ["plate", "make", "model", "vin", "regDoc", "firstRegistrationDate"])
    if (v[k]) fields[k] = { value: v[k], candidate: v[k], confidence: r.fields[k]?.confidence ?? 0.8 };
  return {
    ...v,
    year: v.firstRegistrationDate ? Number(v.firstRegistrationDate.slice(0, 4)) : null,
    fields,
    statusSummary: `Nuskaityta ${Object.keys(fields).length} laukų.`
  };
}
registrationScanUnifiedV41 = registrationScanAdapterV50;
registrationScanUnifiedV42 = registrationScanAdapterV50;
registrationCertificateScanV31 = registrationScanAdapterV50;
window.__visureigiaiRegistrationScanV31 = registrationScanAdapterV50;
window.AutoEasierRegScan = RegScan;
