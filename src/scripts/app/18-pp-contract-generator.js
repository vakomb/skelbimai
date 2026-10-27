// Pirkimo-pardavimo sutarties (PP) generatorius: PDF forma, OCR įkėlimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const PP_TEMPLATE_BASE64 = "";
const PP_COMPANY = {
  name: "Visureigiai, UAB",
  code: "587119941",
  phone: "+370 643 47774",
  email: "info@visureigiai.lt",
  representative: "Vaidas Kolosovas",
  address: ""
};
let ppGeneratedBlob = null,
  ppGeneratedUrl = "",
  ppRole = "buyer",
  ppSourceCarId = null,
  ppPdfLibPromise = null,
  ppOcrPromise = null;
function ppEnsureState() {
  ensureAccounting();
  state.accounting.pp =
    state.accounting.pp && typeof state.accounting.pp === "object" ? state.accounting.pp : {};
  state.accounting.pp.company = { ...PP_COMPANY, ...(state.accounting.pp.company || {}) };
  state.accounting.pp.company.phone = ppFormatCompanyPhone(
    state.accounting.pp.company.phone || PP_COMPANY.phone
  );
}
function ppCompany() {
  ppEnsureState();
  return state.accounting.pp.company;
}
function ppLoadScript(src, key, timeoutMs = 1e4) {
  if (window[key]) return Promise.resolve(window[key]);
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[data-lib="${key}"]`);
    const expectedUrl = new URL(src, document.baseURI).href;
    if (script && script.src !== expectedUrl) {
      script.remove();
      script = null;
    }
    const created = !script;
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.lib = key;
    }
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        if (script.parentNode) script.remove();
        reject(error);
        return;
      }
      resolve(window[key]);
    };
    const timer = setTimeout(
      () => finish(Error(`${key} įkėlimas užtruko per ilgai (${Math.round(timeoutMs / 1e3)} s)`)),
      timeoutMs
    );
    script.addEventListener("load", () => (window[key] ? finish() : finish(Error(key + " nepasiekiamas"))), {
      once: true
    });
    script.addEventListener("error", () => finish(Error("Nepavyko įkelti " + key)), { once: true });
    if (created) document.head.appendChild(script);
  });
}
function ppLoadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (ppPdfLibPromise) return ppPdfLibPromise;
  const urls = [
    "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
    "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"
  ];
  ppPdfLibPromise = (async () => {
    let err;
    for (const u of urls) {
      try {
        return await ppLoadScript(u, "PDFLib");
      } catch (e) {
        err = e;
      }
    }
    throw err || Error("PDF modulis nepasiekiamas");
  })();
  return ppPdfLibPromise;
}
function ppLoadOcr() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (ppOcrPromise) return ppOcrPromise;
  ppOcrPromise = ppLoadScript(
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
    "Tesseract"
  );
  return ppOcrPromise;
}
function ppAscii(v = "") {
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-");
}
function ppOnly(v, re) {
  const m = String(v || "")
    .toUpperCase()
    .match(re);
  return m ? m[0] : "";
}
function ppParseRegistrationText(text = "") {
  const raw = String(text).replace(/\r/g, "");
  const up = raw.toUpperCase();
  const lines = up
    .split("\n")
    .map(x => x.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const vin = (up.match(/\b[A-HJ-NPR-Z0-9]{17}\b/) || [])[0] || "";
  let make = "",
    model = "",
    plate = "",
    regDoc = "";
  for (const line of lines) {
    let m = line.match(/(?:^|\s)D[. ]?1\s*[:.-]?\s*([A-Z0-9-]{2,20})/);
    if (m && !make) make = m[1];
    m = line.match(/(?:^|\s)D[. ]?3\s*[:.-]?\s*([A-Z0-9-]{2,24})/);
    if (m && !model) model = m[1];
    m = line.match(/^A\s*[:.-]?\s*([A-Z0-9]{5,8})\b/);
    if (m && !plate) plate = m[1];
    m = line.match(/^J\s*[:.-]?\s*([A-Z0-9]{5,10})\b/);
    if (m && !regDoc) regDoc = "J" + m[1].replace(/^J/, "");
  }
  if (!make) {
    const known = [
      "BMW",
      "AUDI",
      "VOLKSWAGEN",
      "VOLVO",
      "TOYOTA",
      "NISSAN",
      "HONDA",
      "JEEP",
      "HYUNDAI",
      "KIA",
      "PEUGEOT",
      "MERCEDES-BENZ",
      "MERCEDES",
      "LAND ROVER",
      "LEXUS",
      "SUZUKI",
      "SUBARU",
      "MITSUBISHI",
      "FORD",
      "MAZDA",
      "PORSCHE"
    ];
    make = known.find(x => up.includes(x)) || "";
  }
  if (!plate) {
    const cand = lines.map(x => x.match(/\b[A-Z]{3}\s?\d{3}\b/)).find(Boolean);
    if (cand) plate = cand[0].replace(/\s/g, "");
  }
  if (!regDoc) {
    const m = up.match(/\bJ\s*([0-9]{5,8})\b/);
    if (m) regDoc = "J" + m[1];
  }
  return { vin, make, model, plate, regDoc };
}
async function ppPreprocessImage(file) {
  const bmp = await createImageBitmap(file);
  const max = 1800,
    scale = Math.min(2, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(bmp, 0, 0, c.width, c.height);
  const im = x.getImageData(0, 0, c.width, c.height),
    d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (y - 110) * 1.6 + 128));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  x.putImageData(im, 0, 0);
  return c;
}
async function ppScanRegistration(file) {
  const st = document.getElementById("ppScanState");
  if (st) st.textContent = "Skaitau registracijos dokumentą…";
  try {
    const T = await ppLoadOcr();
    const canvas = await ppPreprocessImage(file);
    const result = await T.recognize(canvas, "eng", {
      logger: m => {
        if (st && m.status === "recognizing text")
          st.textContent = `Skaitau… ${Math.round((m.progress || 0) * 100)}%`;
      }
    });
    const data = ppParseRegistrationText(result?.data?.text || "");
    ppApplyVehicleData(data);
    if (st) st.textContent = "Nuskaityta. Patikrink duomenis prieš generuodamas.";
  } catch (e) {
    console.warn(e);
    if (st) st.textContent = "Automatinis nuskaitymas nepasiekiamas. Duomenis gali įvesti ranka.";
    toast("OCR nepavyko - patikrink laukus ranka", "⚠️");
  }
}
function ppApplyVehicleData(d = {}) {
  const map = { ppVin: d.vin, ppMake: d.make, ppModel: d.model, ppPlate: d.plate, ppRegDoc: d.regDoc };
  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  }
}
function ppValue(id) {
  return (document.getElementById(id)?.value || "").trim();
}
function ppDateParts() {
  const v = ppValue("ppDate") || todayISO();
  const [y, m, d] = v.split("-");
  const t = ppValue("ppTime") || new Date().toTimeString().slice(0, 5);
  const [hh, mm] = t.split(":");
  return { y, m, d, hh, mm };
}
function ppSetChars(form, names, value) {
  const chars = ppAscii(value).replace(/\s/g, "").split("");
  names.forEach((n, i) => {
    try {
      form.getTextField(n).setText(chars[i] || "");
    } catch (e) {}
  });
}
function ppSetText(form, name, value) {
  try {
    form.getTextField(name).setText(ppAscii(value || ""));
  } catch (e) {
    console.warn("PP field", name, e);
  }
}
function ppCheck(form, name, checked) {
  try {
    const f = form.getCheckBox(name);
    checked ? f.check() : f.uncheck();
  } catch (e) {}
}
function ppMoneyWords(n) {
  n = Math.max(0, Math.round(Number(n) || 0));
  const ones = ["nulis", "vienas", "du", "trys", "keturi", "penki", "sesi", "septyni", "astuoni", "devyni"];
  if (n < 10) return ones[n] + " euru 00 ct";
  return String(n) + " euru 00 ct";
}
function ppBase64Bytes(b64) {
  const bin = atob(b64),
    u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
async function ppGenerate() {
  const btn = document.getElementById("ppGenerateBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generuojama…";
  }
  try {
    const PDF = await ppLoadPdfLib();
    const doc = await PDF.PDFDocument.load(ppBase64Bytes(PP_TEMPLATE_BASE64));
    const form = doc.getForm();
    const co = ppCompany();
    const dt = ppDateParts();
    ppSetChars(form, ["Text1", "Text2", "Text3", "Text4"], dt.y);
    ppSetChars(form, ["Text5", "Text6"], dt.m);
    ppSetChars(form, ["Text7", "Text8"], dt.d);
    ppSetChars(form, ["Text9", "Text10"], dt.hh);
    ppSetChars(form, ["Text11", "Text12"], dt.mm);
    ppSetText(form, "Text13", ppValue("ppCountry") || "Lietuva");
    const isBuyer = ppRole === "buyer";
    const companyCodeFields = isBuyer
      ? ["AS12", "AS13", "AS14", "AS15", "AS16", "AS17", "AS18", "AS19", "AS20", "AS21", "AS22"]
      : ["AS1", "AS2", "AS3", "AS4", "AS5", "AS6", "AS7", "AS8", "AS9", "AS10", "AS11"];
    ppSetChars(form, companyCodeFields, co.code);
    ppSetText(form, isBuyer ? "Text18" : "Text14", co.name);
    ppSetText(form, isBuyer ? "Text20" : "Text16", co.phone);
    ppSetText(form, isBuyer ? "Text19" : "Text15", co.email);
    ppSetText(form, isBuyer ? "Text21" : "Text17", co.address || "");
    ppSetChars(form, ["SD1", "SD2", "SD3", "SD4", "SD5", "SD6", "SD7", "SD8"], ppValue("ppSdk"));
    ppSetText(form, "SDX1", [ppValue("ppMake"), ppValue("ppModel")].filter(Boolean).join(" "));
    ppSetChars(form, ["vD1", "vD2", "vD3", "vD4", "vD5", "vD6"], ppValue("ppPlate"));
    ppSetChars(form, ["RD1", "RD2", "RD3", "RD4", "RD5", "RD6", "RD7"], ppValue("ppMileage"));
    ppSetChars(
      form,
      [
        "IE1",
        "IE2",
        "IE3",
        "IE4",
        "IE5",
        "IE6",
        "IE7",
        "IE8",
        "IE9",
        "IE10",
        "IE11",
        "IE12",
        "IE13",
        "IE14",
        "IE15",
        "IE16",
        "IE17"
      ],
      ppValue("ppVin")
    );
    ppSetChars(form, ["RL1", "RL2", "RL3", "RL4", "RL5", "RL6", "RL7", "RL8"], ppValue("ppRegDoc"));
    ppCheck(form, "Ch1", ppValue("ppTa") === "valid");
    ppCheck(form, "Ch2", ppValue("ppTa") === "invalid");
    const price = ppValue("ppPrice").replace(/[^0-9]/g, "");
    ppSetChars(form, ["KA1", "KA2", "KA3", "KA4", "KA5", "KA6", "KA7"], price);
    ppSetText(form, "RIX3", ppMoneyWords(price));
    ppCheck(form, "ATS4", ppValue("ppPayment") === "bank");
    ppCheck(form, "ATS1", ppValue("ppPayment") === "cash");
    ppCheck(form, "ATS2", true);
    ppCheck(form, "ATS5", false);
    ppCheck(form, "ATS3", ppRole === "seller" && ppValue("ppInsuranceTransfer") === "yes");
    ppSetText(form, isBuyer ? "ATSTX5" : "ATSTX4", `${co.representative}, direktorius · ${co.name}`);
    try {
      form.flatten();
    } catch (e) {
      console.warn("flatten", e);
    }
    const bytes = await doc.save();
    ppGeneratedBlob = new Blob([bytes], { type: "application/pdf" });
    if (ppGeneratedUrl) URL.revokeObjectURL(ppGeneratedUrl);
    ppGeneratedUrl = URL.createObjectURL(ppGeneratedBlob);
    const result = document.getElementById("ppResult");
    if (result) result.classList.add("show");
    const meta = document.getElementById("ppResultMeta");
    if (meta)
      meta.textContent = `${[ppValue("ppMake"), ppValue("ppModel")].filter(Boolean).join(" ") || "Automobilis"} · ${ppRole === "buyer" ? "Visureigiai, UAB perka" : "Visureigiai, UAB parduoda"}`;
    toast("PP sutartis sugeneruota", "✓");
  } catch (e) {
    console.error(e);
    toast("Nepavyko sugeneruoti PDF: " + (e.message || e), "⚠️");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Sugeneruoti PP sutartį";
    }
  }
}
function ppDownload() {
  if (!ppGeneratedBlob) return;
  const name = `PP-${accountingSafeName([ppValue("ppMake"), ppValue("ppModel"), ppValue("ppPlate")].filter(Boolean).join("-") || "automobilis")}-${todayISO()}.pdf`;
  downloadAccountingBlob(ppGeneratedBlob, name);
}
function ppPrint() {
  if (!ppGeneratedUrl) return;
  const w = window.open(ppGeneratedUrl, "_blank");
  if (!w) {
    toast("Leisk iššokančius langus spausdinimui", "⚠️");
    return;
  }
  toast("PDF atidarytas spausdinimui", "🖨️");
}
function ppPrefillFromCar(car) {
  if (!car) return;
  ppSourceCarId = car.id;
  const parts = String(car.name || "")
    .trim()
    .split(/\s+/);
  const make = parts.shift() || "";
  const model = parts.join(" ");
  ppApplyVehicleData({
    vin: car.vin || "",
    make,
    model,
    plate: car.plate || "",
    regDoc: car.registrationDoc || ""
  });
  const m = document.getElementById("ppMileage");
  if (m && car.mileage) m.value = car.mileage;
  const p = document.getElementById("ppPrice");
  if (p) p.value = car.status === "parduotas" ? Number(car.soldPrice || 0) : Number(car.buyPrice || 0);
  const ta = document.getElementById("ppTa");
  if (ta && car.taStatus)
    ta.value = car.taStatus === "valid" ? "valid" : car.taStatus === "invalid" ? "invalid" : "";
}
function ppSetRole(role) {
  ppRole = role;
  document
    .querySelectorAll(".ppRoleBtn")
    .forEach(b => b.classList.toggle("active", b.dataset.ppRole === role));
  const btn = document.getElementById("ppGenerateBtn");
  if (btn) btn.textContent = "Sugeneruoti PP sutartį";
  const ins = document.getElementById("ppInsuranceTransferWrap");
  if (ins) ins.style.display = role === "seller" ? "" : "none";
}
function ppGeneratorHtml() {
  const co = ppCompany();
  return `\n    <section class="ppGeneratorCard" id="ppGeneratorCard">\n      <div class="ppGeneratorHead"><h3>Generuoti PP</h3><span class="ppBadge">3 lapai</span></div>\n      <label class="ppScanDrop" for="ppTechPhoto"><span class="ppScanIcon">📷</span><span><strong>Įkelti žalią registracijos dokumentą</strong><span>Foto arba kamera</span></span><input id="ppTechPhoto" type="file" accept="image/*" capture="environment"></label>\n      <div class="ppScanPreview" id="ppScanPreview"><img id="ppScanImage" alt="Registracijos dokumentas"></div><div class="ppScanState" id="ppScanState"></div>\n      <div class="ppRoleGrid"><button class="ppRoleBtn active" type="button" data-pp-role="buyer">Visureigiai perka</button><button class="ppRoleBtn" type="button" data-pp-role="seller">Visureigiai parduoda</button></div>\n      <div class="ppFields">\n        <div class="ppSectionTitle">Automobilis</div><div class="grid2"><div class="field"><label>Markė</label><input class="input" id="ppMake" autocomplete="off"></div><div class="field"><label>Modelis</label><input class="input" id="ppModel" autocomplete="off"></div></div>\n        <div class="field"><label>VIN</label><input class="input" id="ppVin" maxlength="17" autocomplete="off" autocapitalize="characters"></div>\n        <div class="grid2"><div class="field"><label>Valst. nr.</label><input class="input" id="ppPlate" maxlength="12" autocapitalize="characters"></div><div class="field"><label>Registracijos liudijimo nr.</label><input class="input" id="ppRegDoc" maxlength="16" autocapitalize="characters"></div></div>\n        <div class="grid2"><div class="field"><label>Rida, km</label><input class="input" id="ppMileage" type="number" min="0" inputmode="numeric"></div><div class="field"><label>SDK</label><input class="input" id="ppSdk" maxlength="16" autocapitalize="characters"></div></div>\n        <div class="grid2"><div class="field"><label>TA</label><select class="input" id="ppTa"><option value="">Nežinoma</option><option value="valid">Galioja</option><option value="invalid">Negalioja</option></select></div><div class="field"><label>Kaina, €</label><input class="input" id="ppPrice" type="number" min="0" inputmode="numeric"></div></div>\n        <div class="ppSectionTitle">Sutartis</div><div class="grid2"><div class="field"><label>Data</label><input class="input" id="ppDate" type="date" value="${todayISO()}"></div><div class="field"><label>Laikas</label><input class="input" id="ppTime" type="time" value="${new Date().toTimeString().slice(0, 5)}"></div></div>\n        <div class="grid2"><div class="field"><label>Valstybė</label><input class="input" id="ppCountry" value="Lietuva"></div><div class="field"><label>Atsiskaitymas</label><select class="input" id="ppPayment"><option value="bank">Bankiniu pavedimu</option><option value="cash">Grynaisiais</option></select></div></div>\n        <div class="field" id="ppInsuranceTransferWrap" style="display:none"><label>Draudimo dokumentai perduodami pirkėjui</label><select class="input" id="ppInsuranceTransfer"><option value="no">Ne</option><option value="yes">Taip</option></select></div>\n        <details class="ppCompanyEdit"><summary>Įmonės rekvizitai</summary><div class="grid2"><div class="field"><label>Įmonės kodas</label><input class="input" id="ppCompanyCode" value="${escapeHTML(co.code)}"></div><div class="field"><label>Telefonas</label><input class="input" id="ppCompanyPhone" value="${escapeHTML(co.phone)}"></div></div><div class="field"><label>El. paštas</label><input class="input" id="ppCompanyEmail" value="${escapeHTML(co.email)}"></div><div class="field"><label>Įmonės adresas</label><input class="input" id="ppCompanyAddress" value="${escapeHTML(co.address || "")}" placeholder="Įrašyk buveinės / korespondencijos adresą"></div><button class="btn secondary" id="ppSaveCompany" type="button" style="width:100%">Išsaugoti rekvizitus</button>${co.address ? "" : '<div class="ppWarn">Įmonės adreso nepateikei, todėl kol kas jis paliktas tuščias.</div>'}</details>\n      </div>\n      <button class="btn ppGenerateBtn" id="ppGenerateBtn" type="button">Sugeneruoti PP sutartį</button>\n      <div class="ppResult" id="ppResult"><strong>PDF paruoštas</strong><div class="ppScanState" id="ppResultMeta"></div><div class="ppResultActions"><button class="btn" id="ppDownloadBtn" type="button">⬇️ Atsisiųsti PDF</button><button class="btn secondary" id="ppPrintBtn" type="button">🖨️ Spausdinti</button></div></div>\n    </section>`;
}
function bindPpGenerator(carId = null) {
  ppGeneratedBlob = null;
  if (ppGeneratedUrl) {
    URL.revokeObjectURL(ppGeneratedUrl);
    ppGeneratedUrl = "";
  }
  ppSetRole("buyer");
  const photo = document.getElementById("ppTechPhoto");
  if (photo)
    photo.onchange = async () => {
      const f = photo.files?.[0];
      if (!f) return;
      const img = document.getElementById("ppScanImage"),
        wrap = document.getElementById("ppScanPreview");
      if (img) img.src = URL.createObjectURL(f);
      if (wrap) wrap.classList.add("show");
      await ppScanRegistration(f);
    };
  document.querySelectorAll("[data-pp-role]").forEach(b => (b.onclick = () => ppSetRole(b.dataset.ppRole)));
  document.getElementById("ppGenerateBtn")?.addEventListener("click", ppGenerate);
  document.getElementById("ppDownloadBtn")?.addEventListener("click", ppDownload);
  document.getElementById("ppPrintBtn")?.addEventListener("click", ppPrint);
  document.getElementById("ppSaveCompany")?.addEventListener("click", () => {
    ppEnsureState();
    const c = state.accounting.pp.company;
    c.code = ppValue("ppCompanyCode") || PP_COMPANY.code;
    c.phone = ppFormatCompanyPhone(ppValue("ppCompanyPhone") || PP_COMPANY.phone);
    c.email = ppValue("ppCompanyEmail") || PP_COMPANY.email;
    c.address = ppValue("ppCompanyAddress");
    saveState();
    toast("Įmonės rekvizitai išsaugoti", "✓");
  });
  if (carId) {
    const car = state.cars.find(c => c.id === carId);
    if (car) ppPrefillFromCar(car);
  }
}
function openPpGeneratorForCar(carId) {
  companyGo("accounting");
  setTimeout(() => {
    document.getElementById("ppGeneratorCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    bindPpGenerator(carId);
  }, 80);
}
function injectPpQuickButtons() {
  document.querySelectorAll("#activeCarGrid [data-open-car],#soldCarGrid [data-open-car]").forEach(card => {
    if (card.querySelector(".carPpQuick")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "carPpQuick";
    b.dataset.ppCar = card.dataset.openCar;
    b.textContent = "🧾 Generuoti PP";
    const info = card.querySelector(".carListInfo");
    if (info) info.appendChild(b);
  });
}
const __renderAccountingCenterPP = renderAccountingCenter;
renderAccountingCenter = function () {
  __renderAccountingCenterPP();
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = ppGeneratorHtml();
  root.prepend(wrap.firstElementChild);
  bindPpGenerator();
};
const __renderPP = render;
render = async function () {
  const r = await __renderPP();
  injectPpQuickButtons();
  return r;
};
document.addEventListener(
  "click",
  e => {
    const b = e.target.closest("[data-pp-car]");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const id = b.dataset.ppCar;
    if (id) openPpGeneratorForCar(id);
  },
  true
);
