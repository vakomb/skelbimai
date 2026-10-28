// Registracijos OCR v42/v43: galutiniai parsinimo / sujungimo perrašymai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const REGISTRATION_FIELDS_V42 = [
  { key: "plate", label: "Valstybinis numeris", code: "A" },
  { key: "year", label: "Pagaminimo metai", code: "B.2 / B" },
  { key: "vin", label: "VIN", code: "E" },
  { key: "regDoc", label: "Registracijos liudijimo serija ir numeris", code: "Viršuje" }
];
function registrationYearOnlyV42(raw) {
  const s = registrationCleanV41(raw).toUpperCase().replace(/[OQD]/g, "0").replace(/[IL]/g, "1");
  const date = registrationDateV41(s);
  if (date) return date.slice(0, 4);
  const match = s.match(/(?:^|\D)((?:19|20)\d{2})(?=\D|$)/),
    year = match ? match[1] : "";
  return year && registrationYearValidV41(year) ? year : "";
}
function registrationParseDocumentV42(text = "", ocrConfidence = 86) {
  const up = ppNormalizeOcr(text),
    spans = registrationFieldSpansV41(up),
    get = code => registrationFieldFromSpanV41(spans, code);
  const b2 = get("B.2"),
    b = get("B"),
    yearB2 = registrationYearOnlyV42(b2?.raw || ""),
    yearB = registrationYearOnlyV42(b?.raw || "");
  const year = yearB2 || yearB,
    yearCode = yearB2 ? "B.2" : "B",
    rawYear = yearB2 ? b2?.raw || "" : yearB ? b?.raw || "" : "";
  const aRaw = get("A")?.raw || "",
    aCompact = aRaw.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    plateRaw = (aCompact.match(/[A-Z0-9]{6}/) || [])[0] || "";
  const toDigit = ch =>
    ({ O: "0", Q: "0", D: "0", I: "1", L: "1", S: "5", B: "8", Z: "2", G: "6" })[ch] || ch;
  const toLetter = ch => ({ 0: "O", 1: "I", 5: "S", 8: "B", 2: "Z", 6: "G" })[ch] || ch;
  let plateCandidate = "";
  if (plateRaw.length === 6) {
    const prefix = plateRaw.slice(0, 3).split("").map(toLetter).join(""),
      suffix = plateRaw.slice(3).split("").map(toDigit).join("");
    const normalized = prefix + suffix;
    if (/^[A-Z]{3}\d{3}$/.test(normalized)) plateCandidate = normalized;
  }
  const eRaw = get("E")?.raw || "",
    eCompact = eRaw.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    vinRaw = (eCompact.match(/[A-Z0-9]{17}/) || [])[0] || "";
  let vinCandidate = vinRaw;
  if (vinRaw.length === 17 && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vinRaw))
    vinCandidate = vinRaw.replace(/[OQ]/g, "0").replace(/[IL]/g, "1");
  const aSpan = get("A"),
    topEnd = aSpan?.start ?? Math.min(up.length, Math.floor(up.length * 0.55)),
    top = up.slice(0, topEnd).split("\n").slice(0, 40);
  let serialRaw = "",
    serialCandidate = "";
  const normalizeSerial = raw => {
    const compact = String(raw || "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();
    return compact.length >= 7
      ? compact[0] +
          compact
            .slice(1)
            .replace(/[OQ]/g, "0")
            .replace(/[IL]/g, "1")
            .replace(/S/g, "5")
            .replace(/B/g, "8")
            .replace(/Z/g, "2")
            .replace(/G/g, "6")
      : "";
  };
  for (const line of top) {
    const m = String(line).match(
      /(?:^|[^A-Z0-9])([A-Z])\s*[- ]?\s*((?:[0-9OQILSBZG]\s*){6,7})(?=$|[^A-Z0-9])/i
    );
    if (m) {
      serialRaw = m[0].trim();
      serialCandidate = normalizeSerial(m[0]);
      break;
    }
  }
  if (!serialCandidate) {
    const flat = top.join("\n").match(/(?:^|[^A-Z0-9])([A-Z])([0-9OQILSBZG]{6,7})(?=$|[^A-Z0-9])/i);
    if (flat) {
      serialRaw = flat[0].trim();
      serialCandidate = normalizeSerial(flat[0]);
    }
  }
  const fields = {
    plate: registrationFieldResultV41(
      "plate",
      aRaw,
      plateCandidate,
      /^[A-Z]{3}\d{3}$/.test(plateCandidate),
      ocrConfidence,
      { sourceCode: "A" }
    ),
    year: registrationFieldResultV41(
      "year",
      rawYear,
      year,
      /^(?:19|20)\d{2}$/.test(year) && registrationYearValidV41(year),
      ocrConfidence,
      { sourceCode: yearCode }
    ),
    vin: registrationFieldResultV41(
      "vin",
      eRaw,
      vinCandidate,
      /^[A-HJ-NPR-Z0-9]{17}$/.test(vinCandidate),
      ocrConfidence,
      { sourceCode: "E" }
    ),
    regDoc: registrationFieldResultV41(
      "regDoc",
      serialRaw,
      serialCandidate,
      /^[A-Z]\d{6,7}$/.test(serialCandidate),
      ocrConfidence,
      { sourceCode: "Viršuje" }
    )
  };
  for (const spec of REGISTRATION_FIELDS_V42) {
    const f = fields[spec.key];
    if (!f.value)
      f.value = f.confidence >= REGISTRATION_CONFIDENCE_THRESHOLD_V41 && !f.conflict ? f.candidate : "";
  }
  const data = {
    fields,
    plate: fields.plate.value,
    year: fields.year.value ? Number(fields.year.value) : null,
    manufactureYear: fields.year.value ? Number(fields.year.value) : null,
    vin: fields.vin.value,
    regDoc: fields.regDoc.value,
    registrationDoc: fields.regDoc.value
  };
  data.found = Object.values(fields).filter(f => f.value).length;
  data.candidates = Object.values(fields).filter(f => f.candidate).length;
  return data;
}
function registrationMergeFieldsV42(results = []) {
  const fields = {};
  for (const spec of REGISTRATION_FIELDS_V42) {
    let found = results.map(r => r?.fields?.[spec.key]).filter(f => f?.candidate);
    if (spec.key === "year") {
      const fromB2 = found.filter(f => f.sourceCode === "B.2"),
        fromB = found.filter(f => f.sourceCode === "B");
      if (fromB2.length) found = fromB2;
      else if (fromB.length) found = fromB;
    }
    if (!found.length) {
      fields[spec.key] = { value: "", candidate: "", sourceCode: spec.code, confidence: 0, raw: "" };
      continue;
    }
    const valid = found.filter(
        f => Number(f.confidence) >= REGISTRATION_CONFIDENCE_THRESHOLD_V41 && !f.ambiguous
      ),
      pool = valid.length ? valid : found,
      groups = new Map();
    for (const item of pool) {
      const key = String(item.candidate).toUpperCase().replace(/\s+/g, "");
      const g = groups.get(key) || { items: [], candidate: item.candidate };
      g.items.push(item);
      groups.set(key, g);
    }
    const ranked = [...groups.values()]
      .map(g => ({ ...g, score: g.items.reduce((n, x) => n + Number(x.confidence || 0), 0) }))
      .sort((a, b) => b.items.length - a.items.length || b.score - a.score);
    const winner = ranked[0],
      runner = ranked[1],
      tie = !!runner && winner.items.length === runner.items.length;
    const best = { ...winner.items.slice().sort((a, b) => Number(b.confidence) - Number(a.confidence))[0] };
    best.conflict = !!tie;
    best.confidence =
      winner.items.length > 1
        ? registrationClampV41(
            Math.max(...winner.items.map(x => Number(x.confidence) || 0)) +
              0.025 * Math.min(2, winner.items.length - 1)
          )
        : Number(best.confidence) || 0;
    best.candidate = winner.candidate;
    best.value =
      valid.length && !best.conflict && best.confidence >= REGISTRATION_CONFIDENCE_THRESHOLD_V41
        ? best.candidate
        : "";
    if (!valid.length) best.value = "";
    fields[spec.key] = best;
  }
  const data = {
    fields,
    plate: fields.plate.value,
    year: fields.year.value ? Number(fields.year.value) : null,
    manufactureYear: fields.year.value ? Number(fields.year.value) : null,
    vin: fields.vin.value,
    regDoc: fields.regDoc.value,
    registrationDoc: fields.regDoc.value
  };
  data.found = Object.values(fields).filter(f => f.value).length;
  data.candidates = Object.values(fields).filter(f => f.candidate).length;
  return data;
}
function registrationVehicleTitleV43(make = "", model = "") {
  const acronyms = new Set(["BMW", "VW", "BYD", "GMC", "MG", "DS", "MAN", "DAF", "MINI", "RAM", "JCB"]);
  const titleWords = s =>
    String(s || "")
      .trim()
      .split(/(\s+|-|\/)/)
      .map(part => {
        if (!part || /^\s+$/.test(part) || part === "-" || part === "/") return part;
        const letters = part.replace(/[^A-Za-z]/g, "");
        if (letters && letters.length <= 2 && part.toUpperCase() === part) return part.toUpperCase();
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("");
  const upperMake = String(make || "")
    .trim()
    .toUpperCase();
  return [acronyms.has(upperMake) ? upperMake : titleWords(upperMake.toLowerCase()), titleWords(model)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
function registrationCropCanvasV42(base, region) {
  const x = Math.round(base.width * region.x),
    y = Math.round(base.height * region.y),
    w = Math.max(1, Math.min(base.width - x, Math.round(base.width * region.w))),
    h = Math.max(1, Math.min(base.height - y, Math.round(base.height * region.h)));
  const scale = Math.max(1, Math.min(1.7, 2200 / Math.max(w, h))),
    c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(base, x, y, w, h, 0, 0, c.width, c.height);
  return c;
}
async function registrationFullFrameCanvasV43(file) {
  let source,
    bitmap = false;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
    bitmap = !!source?.close;
  } catch (e) {
    source = await ppLoadImageElement(file);
  }
  try {
    const width = source.width || source.naturalWidth,
      height = source.height || source.naturalHeight;
    if (!width || !height) throw Error("Nepavyko atidaryti nuotraukos.");
    const scale = Math.min(2, 2100 / Math.max(width, height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height),
      pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const y = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2],
        v = Math.max(0, Math.min(255, (y - 122) * 2.05 + 136));
      pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  } finally {
    if (bitmap)
      try {
        source.close();
      } catch (e) {}
  }
}
async function registrationScanUnifiedV42(file, statusEl = null) {
  if (!file) throw Error("Pasirink registracijos liudijimo nuotrauką.");
  if (!String(file.type || "").startsWith("image/"))
    throw Error("Automatiniam nuskaitymui pasirink nuotrauką. PDF gali prisegti rankiniu būdu.");
  const status = txt => {
      if (statusEl) {
        statusEl.textContent = txt;
        statusEl.classList?.add("show");
      }
    },
    passes = [];
  const T = await ppLoadOcr(),
    worker = await ppOcrWorker(statusEl);
  const recognize = async (canvas, label, psm = 6) => {
    status(label);
    let r;
    if (worker) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: String(psm),
          preserve_interword_spaces: "1",
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./- "
        });
      } catch (e) {}
      try {
        r = await worker.recognize(canvas);
      } finally {
        try {
          await worker.setParameters({
            tessedit_pageseg_mode: "6",
            preserve_interword_spaces: "1",
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./- "
          });
        } catch (e) {}
      }
    } else {
      r = await T.recognize(canvas, "eng", {
        logger: m => {
          if (m.status === "recognizing text")
            status("Skaitau dokumentą · " + Math.round((m.progress || 0) * 100) + "%");
        },
        tessedit_pageseg_mode: String(psm),
        preserve_interword_spaces: "1",
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./- "
      });
    }
    const d = r?.data || {};
    if (d.text)
      passes.push({
        text: d.text,
        confidence:
          Number.isFinite(Number(d.confidence)) && Number(d.confidence) > 0 ? Number(d.confidence) : 86
      });
  };
  const merge = () =>
    registrationMergeFieldsV42(passes.map(p => registrationParseDocumentV42(p.text, p.confidence)));
  const needs = d => !d || d.found < 4 || Object.values(d.fields || {}).some(f => f.conflict);
  status("Paruošiu registracijos liudijimą…");
  const contrast = await ppPreprocessSmart(file, "contrast");
  await recognize(contrast, "Skaitau visą liudijimą…", 6);
  let parsed = merge();
  if (needs(parsed)) {
    await recognize(contrast, "Tikslinu smulkų tekstą…", 11);
    parsed = merge();
  }
  if (needs(parsed)) {
    try {
      await recognize(await registrationFullFrameCanvasV43(file), "Tikrinu visą nuotrauką…", 11);
      parsed = merge();
    } catch (e) {}
  }
  if (needs(parsed)) {
    for (const region of [
      { x: 0.02, y: 0, w: 0.96, h: 0.56 },
      { x: 0.02, y: 0.18, w: 0.96, h: 0.6 },
      { x: 0.02, y: 0.43, w: 0.96, h: 0.54 }
    ]) {
      await recognize(registrationCropCanvasV42(contrast, region), "Tikslinu dokumento laukus…", 11);
      parsed = merge();
      if (!needs(parsed)) break;
    }
  }
  if (needs(parsed)) {
    const color = await ppPreprocessSmart(file, "color");
    await recognize(color, "Skaitau originalias dokumento spalvas…", 11);
    parsed = merge();
  }
  if (needs(parsed)) {
    await recognize(await ppPreprocessSmart(file, "binary"), "Didinu kontrastą…", 6);
    parsed = merge();
  }
  if (needs(parsed)) {
    await recognize(await registrationAdaptiveCanvasV41(file, 0), "Šviesinu šešėlius ir ryškinu tekstą…", 6);
    parsed = merge();
  }
  if (needs(parsed)) {
    for (const angle of [-1.5, 1.5]) {
      await recognize(await registrationAdaptiveCanvasV41(file, angle), "Taisau dokumento pasvirimą…", 6);
      parsed = merge();
      if (!needs(parsed)) break;
    }
  }
  if (needs(parsed)) {
    try {
      const targeted = await regNewCertificateFallbackV36(file, worker, T, status);
      if (targeted) {
        const synthetic = [
          "A " + (targeted.plate || ""),
          "B " + (targeted.year || ""),
          "E " + (targeted.vin || ""),
          String(targeted.regDoc || "").replace(/^([A-Z])/, "$1 ")
        ].join("\n");
        passes.push({ text: synthetic, confidence: 84 });
        parsed = merge();
      }
    } catch (e) {}
  }
  const filled = parsed.found;
  parsed.statusSummary = filled
    ? "Užpildyta " + filled + " iš 4 laukų. Patikrink nuskaitytas reikšmes."
    : "Reikiamų duomenų atpažinti nepavyko. Pabandyk ryškesnę, tiesesnę nuotrauką arba laukus įrašyk ranka.";
  status(parsed.statusSummary);
  return parsed;
}
registrationParseDocumentV41 = registrationParseDocumentV42;
registrationMergeFieldsV41 = registrationMergeFieldsV42;
registrationScanUnifiedV41 = registrationScanUnifiedV42;
registrationCertificateScanV31 = registrationScanUnifiedV42;
window.__visureigiaiRegistrationScanV31 = registrationScanUnifiedV42;
window.__visureigiaiRegistrationScanV42 = {
  parse: registrationParseDocumentV42,
  merge: registrationMergeFieldsV42,
  fields: REGISTRATION_FIELDS_V42
};
window.__visureigiaiRegistrationScanV41 = window.__visureigiaiRegistrationScanV42;
registrationReviewV41 = async function (file, data, options = {}) {
  const fields = data?.fields || {},
    value = key => fields[key]?.value || data?.[key] || "";
  return {
    values: {
      plate: value("plate"),
      firstRegistrationDate: data?.year ? String(data.year) : "",
      make: value("make"),
      model: value("model"),
      vin: value("vin"),
      regDoc: value("regDoc")
    },
    attachDocument: !!file
  };
};
registrationFormResultV41 = function (values = {}) {
  const raw = values.firstRegistrationDate || values.year || "",
    year = Number(String(raw).slice(0, 4));
  return {
    make: values.make || "",
    model: values.model || "",
    year: registrationYearValidV41(year) ? year : null,
    vin: values.vin || "",
    plate: values.plate || "",
    regDoc: values.regDoc || ""
  };
};
const newCarApplyBaseV42 = __newCarApplyRegistrationV41;
newCarApplyRegistrationV29 = function (data = {}) {
  const clean = {
    make: data.make || "",
    model: data.model || "",
    year: data.year || null,
    vin: data.vin || "",
    plate: data.plate || "",
    regDoc: data.regDoc || data.registrationDoc || ""
  };
  newCarApplyBaseV42(clean);
  registrationSetInputV41("newVehicleregMake", clean.make);
  registrationSetInputV41("newVehicleregModel", clean.model);
  if (clean.make && clean.model)
    registrationSetInputV41("carName", registrationVehicleTitleV43(clean.make, clean.model));
};
vehicleFields = function (prefix, c = {}) {
  let html = __vehicleFieldsV3(prefix, c) + registrationDataFieldsV3(prefix, c);
  if (["newVehicle", "editVehicle"].includes(prefix))
    html = html.replace(
      'for="' + prefix + 'year">Metai</label>',
      'for="' + prefix + 'year">Pagaminimo metai</label>'
    );
  return html;
};
readVehicleFields = __readVehicleFieldsV41;
document.querySelectorAll(".registrationMetaV41").forEach(el => el.remove());
registrationMismatchDialogV33 = async function () {
  return false;
};
newCarScanRegistrationV29 = async function (file) {
  if (!file) return;
  const status = document.getElementById("newCarScanStateV29"),
    preview = document.getElementById("newCarScanPreviewV29"),
    img = document.getElementById("newCarScanImageV29");
  ["newCarCameraV29", "newCarGalleryV29"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  newCarRegFileV29 = file;
  if (newCarRegPreviewUrlV29) URL.revokeObjectURL(newCarRegPreviewUrlV29);
  newCarRegPreviewUrlV29 = URL.createObjectURL(file);
  if (img) img.src = newCarRegPreviewUrlV29;
  if (preview) preview.classList.add("show");
  if (status) status.textContent = "Skaitau registracijos liudijimą…";
  try {
    const data = await registrationScanUnifiedV42(file, status);
    newCarApplyRegistrationV29({ year: data.year, vin: data.vin, plate: data.plate, regDoc: data.regDoc });
    if (status) status.textContent = data.statusSummary;
  } catch (e) {
    if (status)
      status.textContent =
        "Nuskaityti nepavyko. Pabandyk ryškesnę, tiesiai nufotografuotą liudijimo nuotrauką arba laukus įrašyk ranka.";
    toast("Registracijos liudijimo nuskaityti nepavyko", "⚠️");
  }
};
const openCarEditBaseV42 = __openCarEditReviewV41;
openCarEditSheet = function (id) {
  openCarEditBaseV42(id);
  const car = (state.cars || []).find(c => c.id === id),
    oldInput = document.getElementById("editVehicledoc_registration");
  if (!car || !oldInput) return;
  const input = oldInput.cloneNode(true);
  oldInput.replaceWith(input);
  const status = document.getElementById("editVehiclefiles_registration");
  input.addEventListener("change", async () => {
    const file = Array.from(input.files || []).find(f => String(f.type || "").startsWith("image/"));
    if (!file) return;
    if (status) {
      status.textContent = "Skaitau registracijos liudijimą…";
      status.classList.remove("good", "bad");
    }
    try {
      const data = await registrationScanUnifiedV42(file, status),
        identity = window.__visureigiaiRegistrationIdentityCheckV33(car, data);
      if (identity.mismatch && car.vin) {
        input.value = "";
        if (status) {
          status.textContent =
            "Nuskaityto liudijimo VIN nesutampa su šiuo automobiliu. Laukus palikau nepakeistus.";
          status.classList.add("bad");
        }
        return;
      }
      for (const [id, value] of [
        ["editVehiclevin", data.vin],
        ["editVehicleplate", data.plate],
        ["editVehicleregistrationDoc", data.regDoc],
        ["editVehicleyear", data.year]
      ])
        if (value != null && value !== "") registrationSetInputV41(id, value);
      if (status) {
        status.textContent = data.statusSummary + " Išsaugok pakeitimus.";
        status.classList.add("good");
        if (identity.mismatch) status.textContent += " Markė arba modelis skiriasi nuo esamo įrašo.";
      }
    } catch (e) {
      input.value = "";
      if (status) {
        status.textContent = "Nuskaitymas nepavyko. Pabandyk ryškesnę nuotrauką arba įrašyk duomenis ranka.";
        status.classList.add("bad");
      }
    }
  });
};
const renderCarSheetBaseV42 = __renderCarSheetRegistrationV41;
renderCarSheet = function (car) {
  renderCarSheetBaseV42(car);
  const list = document.querySelector("#sheet .vehicleInfo");
  if (!list) return;
  list.querySelectorAll("[data-registration-v41-view]").forEach(el => el.remove());
  list.querySelectorAll("dt").forEach(dt => {
    if (dt.textContent.trim() === "Metai") dt.textContent = "Pagaminimo metai";
  });
  const rows = [
    ["Markė", car?.regMake],
    ["Modelis", car?.regModel]
  ].filter(([, v]) => v !== "" && v != null);
  if (rows.length)
    list.insertAdjacentHTML(
      "beforeend",
      rows
        .map(
          ([label, value]) =>
            "<div data-registration-v42-view><dt>" +
            escapeHTML(label) +
            "</dt><dd>" +
            escapeHTML(value) +
            "</dd></div>"
        )
        .join("")
    );
};
window.__visureigiaiRegistrationScanV42.tests = function () {
  const samples = [
    {
      text: "Y 571146\nA KFG911\nE 5UXZV4C57CL990816\nB --\n(B.1) 2018-01-16\n(B.2) 2012",
      year: 2012,
      plate: "KFG911",
      vin: "5UXZV4C57CL990816",
      regDoc: "Y571146"
    },
    {
      text: "K1281961\nA KSE851\nB 2008-11-12\nB.1 2018-11-10\nE SHSRE67508U010118",
      year: 2008,
      plate: "KSE851",
      vin: "SHSRE67508U010118",
      regDoc: "K1281961"
    }
  ];
  const failures = samples
    .filter(s => {
      const d = registrationParseDocumentV42(s.text, 92);
      return (
        d.year !== s.year ||
        d.plate !== s.plate ||
        d.vin !== s.vin ||
        d.regDoc !== s.regDoc ||
        Object.keys(d.fields).length !== 4
      );
    })
    .map(s => s.text.split("\\n")[0]);
  return { passed: samples.length - failures.length, total: samples.length, failures };
};
