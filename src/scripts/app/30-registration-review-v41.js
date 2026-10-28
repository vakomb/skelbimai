// Registracijos OCR v41: laukų patikimumas, peržiūros langas, regresiniai testai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const REGISTRATION_FIELDS_V41 = [
  { key: "plate", label: "Valstybinis numeris", code: "A" },
  { key: "firstRegistrationDate", label: "Pirmoji registracija", code: "B" },
  { key: "firstRegistrationLithuaniaDate", label: "Pirmoji registracija Lietuvoje", code: "B.1" },
  { key: "modelYear", label: "Modelio metai", code: "B.2" },
  { key: "make", label: "Markė", code: "D.1" },
  { key: "typeVariant", label: "Tipas / variantas / versija", code: "D.2" },
  { key: "model", label: "Komercinis modelis", code: "D.3" },
  { key: "vin", label: "VIN", code: "E" },
  { key: "regDoc", label: "Liudijimo serija ir numeris", code: "Liudijimo viršus" }
];
const REGISTRATION_CONFIDENCE_THRESHOLD_V41 = 0.76;
function registrationClampV41(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}
function registrationCleanV41(v) {
  return String(v || "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.()\-]+|[\s:;,.()\-]+$/g, "")
    .trim();
}
function registrationDateV41(raw) {
  const s = registrationCleanV41(raw);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    m = s.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    if (m) m = [m[0], m[3], m[2], m[1]];
  }
  if (!m) return "";
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]),
    dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === mo && dt.getUTCDate() === d
    ? String(y).padStart(4, "0") + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0")
    : "";
}
function registrationYearValidV41(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1886 && n <= new Date().getFullYear() + 1;
}
function registrationFieldSpansV41(text = "") {
  const up = ppNormalizeOcr(text),
    rx =
      /(^|[^A-Z0-9])((?:(?:B\s*[.]\s*[12]|D\s*[.]\s*[123])(?=[\s:;,.()\/\-A-Z0-9])|(?:C\s*[.]?\s*[12](?:\s*[.]?\s*[1234])?|F\s*[.]?\s*[1-5]|I\s*[.]?\s*1?|J\s*[.]?\s*[12]|K\s*[.]?\s*1|P\s*[.]?\s*[1-5]|S\s*[.]?\s*[12]|V\s*[.]?\s*(?:7|9|10)|A|B|E|G|H|K|Q|R|T)(?=$|[^A-Z0-9])))/g,
    all = [];
  let m;
  while ((m = rx.exec(up))) {
    const token = m[2].replace(/\s+/g, "").replace(".", ""),
      start = m.index + m[1].length;
    all.push({
      code:
        token === "B1"
          ? "B.1"
          : token === "B2"
            ? "B.2"
            : token === "D1"
              ? "D.1"
              : token === "D2"
                ? "D.2"
                : token === "D3"
                  ? "D.3"
                  : token,
      start,
      end: rx.lastIndex
    });
  }
  return all.map((x, i) => ({
    ...x,
    raw: registrationCleanV41(up.slice(x.end, all[i + 1]?.start ?? up.length))
  }));
}
function registrationFieldFromSpanV41(spans, code) {
  return spans.find(x => x.code === code) || null;
}
function registrationSafeRawV41(key, raw, candidate) {
  const s = registrationCleanV41(raw),
    c = String(candidate || "");
  if (key === "firstRegistrationDate" || key === "firstRegistrationLithuaniaDate") {
    const m = s.match(/(?:19|20)\d{2}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.](?:19|20)\d{2}/);
    return m ? m[0] : s === "--" ? "--" : "";
  }
  if (key === "modelYear") return /^\d{4}$/.test(s) ? s : "";
  if (["plate", "vin", "regDoc"].includes(key))
    return /^[A-Z0-9\s-]{1,24}$/i.test(s) ? s.slice(0, 24) : c.slice(0, 24);
  const first = s.split(/\n|\s{2,}/)[0] || "";
  return /^[A-Z0-9+./* -]{1,64}$/i.test(first) ? first : "";
}
function registrationFieldResultV41(key, raw, candidate, valid, ocrConfidence = 86, extra = {}) {
  const ambiguity =
    !valid && /[OQILSBZG]/i.test(String(candidate || "")) && ["plate", "vin", "regDoc"].includes(key);
  let confidence = candidate ? (valid ? 0.94 : 0.55) : 0;
  if (candidate && ocrConfidence != null)
    confidence *= Math.max(0.55, Math.min(1, 0.82 + Number(ocrConfidence) / 500));
  if (ambiguity && ["plate", "vin", "regDoc"].includes(key)) confidence = Math.min(confidence, 0.62);
  if (extra.noLabel) confidence = Math.min(confidence, 0.72);
  if (extra.conflict) confidence = Math.min(confidence, 0.58);
  confidence = registrationClampV41(confidence);
  return {
    value: confidence >= REGISTRATION_CONFIDENCE_THRESHOLD_V41 && !extra.conflict ? candidate : "",
    candidate: candidate || "",
    sourceCode: extra.sourceCode || "",
    confidence,
    raw: registrationSafeRawV41(key, raw, candidate),
    conflict: !!extra.conflict,
    ambiguous: !!ambiguity
  };
}
function registrationParseDocumentV41(text = "", ocrConfidence = 86) {
  const up = ppNormalizeOcr(text),
    spans = registrationFieldSpansV41(up),
    field = {};
  const get = code => registrationFieldFromSpanV41(spans, code);
  const parseLabel = (code, key, convert, validate) => {
    const hit = get(code),
      raw = hit?.raw || "",
      candidate = convert(raw),
      valid = !!candidate && validate(candidate, raw);
    field[key] = registrationFieldResultV41(key, raw, candidate, valid, ocrConfidence, {
      sourceCode: code
    });
  };
  parseLabel(
    "A",
    "plate",
    raw => raw.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    v => /^[A-Z]{3}\d{3}$/.test(v)
  );
  parseLabel(
    "B",
    "firstRegistrationDate",
    raw => registrationDateV41(raw),
    v => !!v
  );
  parseLabel(
    "B.1",
    "firstRegistrationLithuaniaDate",
    raw => registrationDateV41(raw),
    v => !!v
  );
  parseLabel(
    "B.2",
    "modelYear",
    raw => {
      const m = registrationCleanV41(raw).match(/^(\d{4})$/);
      return m ? m[1] : "";
    },
    v => registrationYearValidV41(v)
  );
  parseLabel(
    "D.1",
    "make",
    raw => {
      const s = registrationCleanV41(raw)
          .toUpperCase()
          .replace(/[^A-Z0-9 -]/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        compact = s.replace(/[^A-Z0-9]/g, "");
      const exact = REG_MAKES_V35.find(x => x.replace(/[^A-Z0-9]/g, "") === compact);
      return exact || s;
    },
    v => !!v && v.length <= 32 && /^[A-Z0-9][A-Z0-9 -]*$/.test(v)
  );
  parseLabel(
    "D.2",
    "typeVariant",
    raw =>
      registrationCleanV41(raw)
        .toUpperCase()
        .replace(/[^A-Z0-9./* -]/g, "")
        .trim(),
    v => !!v && v.length <= 60
  );
  parseLabel(
    "D.3",
    "model",
    raw => {
      const make = field.make?.candidate || "";
      return regModelV35(registrationCleanV41(raw), make).toUpperCase().slice(0, 64);
    },
    v => !!v && v.length <= 64 && /[A-Z0-9]/.test(v)
  );
  parseLabel(
    "E",
    "vin",
    raw =>
      registrationCleanV41(raw)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ""),
    v => /^[A-HJ-NPR-Z0-9]{17}$/.test(v)
  );
  const aSpan = get("A"),
    topEnd = aSpan?.start ?? Math.min(up.length, Math.floor(up.length * 0.34)),
    top = up.slice(0, topEnd).split("\n").slice(0, 32);
  let serialRaw = "",
    serialCandidate = "";
  for (const line of top) {
    const m = String(line).match(
      /(?:^|[^A-Z0-9])([A-Z])\s*[- ]?\s*((?:[0-9OQILSBZG]\s*){6,7})(?=$|[^A-Z0-9])/i
    );
    if (!m) continue;
    serialRaw = m[0].trim();
    serialCandidate = (m[1] + m[2].replace(/[^A-Z0-9]/gi, "")).toUpperCase();
    break;
  }
  if (!serialCandidate) {
    const flat = top.join("\n").match(/(?:^|[^A-Z0-9])([A-Z])([0-9OQILSBZG]{6,7})(?=$|[^A-Z0-9])/i);
    if (flat) {
      serialRaw = flat[0].trim();
      serialCandidate = (flat[1] + flat[2]).toUpperCase();
    }
  }
  field.regDoc = registrationFieldResultV41(
    "regDoc",
    serialRaw,
    serialCandidate,
    /^[A-Z]\d{6,7}$/.test(serialCandidate),
    ocrConfidence,
    { sourceCode: "Liudijimo viršus" }
  );
  const b = field.firstRegistrationDate.value;
  const data = {
    fields: field,
    make: field.make.value,
    model: field.model.value,
    year: b ? Number(b.slice(0, 4)) : null,
    firstRegistrationDate: b,
    firstRegistrationLithuaniaDate: field.firstRegistrationLithuaniaDate.value,
    modelYear: field.modelYear.value ? Number(field.modelYear.value) : null,
    typeVariant: field.typeVariant.value,
    vin: field.vin.value,
    plate: field.plate.value,
    regDoc: field.regDoc.value
  };
  data.registrationDoc = data.regDoc;
  return data;
}
function registrationMergeFieldsV41(results = []) {
  const fields = {};
  for (const spec of REGISTRATION_FIELDS_V41) {
    const found = results.map(r => r?.fields?.[spec.key]).filter(x => x?.candidate);
    if (!found.length) {
      fields[spec.key] = { value: "", candidate: "", sourceCode: spec.code, confidence: 0, raw: "" };
      continue;
    }
    found.sort((a, b) => b.confidence - a.confidence);
    const best = { ...found[0] },
      unique = [...new Set(found.map(x => String(x.candidate).toUpperCase()))];
    if (unique.length > 1) {
      best.conflict = true;
      best.confidence = Math.min(0.58, best.confidence);
      best.value = "";
      best.candidate = found[0].candidate;
    } else if (found.length > 1) best.confidence = registrationClampV41(best.confidence + 0.035);
    best.sourceCode = spec.code;
    best.value =
      best.confidence >= REGISTRATION_CONFIDENCE_THRESHOLD_V41 && !best.conflict ? best.candidate : "";
    fields[spec.key] = best;
  }
  const b = fields.firstRegistrationDate?.value || "",
    year = b ? Number(b.slice(0, 4)) : null;
  const data = {
    fields,
    make: fields.make.value,
    model: fields.model.value,
    year,
    firstRegistrationDate: b,
    firstRegistrationLithuaniaDate: fields.firstRegistrationLithuaniaDate.value,
    modelYear: fields.modelYear.value ? Number(fields.modelYear.value) : null,
    typeVariant: fields.typeVariant.value,
    vin: fields.vin.value,
    plate: fields.plate.value,
    regDoc: fields.regDoc.value
  };
  data.registrationDoc = data.regDoc;
  data.candidates = Object.values(fields).filter(x => x.candidate).length;
  data.found = Object.values(fields).filter(x => x.value).length;
  return data;
}
function registrationNeedsMorePassesV41(data) {
  return !data || data.found < 6 || Object.values(data.fields || {}).some(x => x.conflict);
}
async function registrationAdaptiveCanvasV41(file, angle = 0) {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (e) {
    source = await ppLoadImageElement(file);
  }
  const ow = source.width || source.naturalWidth,
    oh = source.height || source.naturalHeight,
    b = ppDetectDocumentBounds(source, ow, oh);
  const scale = Math.min(2.2, 1900 / Math.max(b.w, b.h)),
    cw = Math.max(1, Math.round(b.w * scale)),
    ch = Math.max(1, Math.round(b.h * scale)),
    pad = Math.ceil(Math.max(cw, ch) * Math.sin((Math.abs(angle) * Math.PI) / 180)) + 4;
  const c = document.createElement("canvas");
  c.width = cw + pad * 2;
  c.height = ch + pad * 2;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.translate(c.width / 2, c.height / 2);
  x.rotate((angle * Math.PI) / 180);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(source, b.x, b.y, b.w, b.h, -cw / 2, -ch / 2, cw, ch);
  try {
    source.close?.();
  } catch (e) {}
  const im = x.getImageData(0, 0, c.width, c.height),
    d = im.data,
    block = 56,
    means = [];
  for (let by = 0; by < c.height; by += block) {
    const row = [];
    for (let bx = 0; bx < c.width; bx += block) {
      let sum = 0,
        n = 0;
      for (let yy = by; yy < Math.min(c.height, by + block); yy += 2)
        for (let xx = bx; xx < Math.min(c.width, bx + block); xx += 2) {
          const i = (yy * c.width + xx) * 4;
          sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          n++;
        }
      row.push(n ? sum / n : 180);
    }
    means.push(row);
  }
  for (let yy = 0; yy < c.height; yy++) {
    const by = Math.floor(yy / block);
    for (let xx = 0; xx < c.width; xx++) {
      const i = (yy * c.width + xx) * 4,
        l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2],
        mean = means[by][Math.floor(xx / block)],
        v = l < Math.max(42, mean - 24) ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  x.putImageData(im, 0, 0);
  return c;
}
async function registrationScanUnifiedV41(file, statusEl = null) {
  if (!file) throw Error("Pasirink registracijos liudijimo nuotrauką.");
  if (!String(file.type || "").startsWith("image/"))
    throw Error("Automatiniam nuskaitymui pasirink nuotrauką. PDF gali prisegti rankiniu būdu.");
  const status = txt => {
    if (statusEl) {
      statusEl.textContent = txt;
      statusEl.classList?.add("show");
    }
  };
  status("Paruošiu registracijos liudijimą…");
  const T = await ppLoadOcr(),
    worker = await ppOcrWorker(statusEl);
  let passes = [];
  const recognize = async (canvas, label) => {
    status(label);
    const r = worker ? await worker.recognize(canvas) : await T.recognize(canvas, "eng");
    const d = r?.data || {};
    if (d.text)
      passes.push({
        text: d.text,
        confidence: Number.isFinite(Number(d.confidence)) ? Number(d.confidence) : 86
      });
  };
  await recognize(await ppPreprocessSmart(file, "contrast"), "Skaitau visą dokumentą…");
  let parsed = registrationMergeFieldsV41(
    passes.map(x => registrationParseDocumentV41(x.text, x.confidence))
  );
  if (registrationNeedsMorePassesV41(parsed)) {
    await recognize(await ppPreprocessSmart(file, "binary"), "Tikslinu laukus ir simbolius…");
    parsed = registrationMergeFieldsV41(passes.map(x => registrationParseDocumentV41(x.text, x.confidence)));
  }
  if (registrationNeedsMorePassesV41(parsed)) {
    await recognize(await registrationAdaptiveCanvasV41(file, 0), "Šviesinu šešėlius ir ryškinu tekstą…");
    parsed = registrationMergeFieldsV41(passes.map(x => registrationParseDocumentV41(x.text, x.confidence)));
  }
  if (registrationNeedsMorePassesV41(parsed)) {
    for (const angle of [-2, 2]) {
      await recognize(
        await registrationAdaptiveCanvasV41(file, angle),
        "Tikslinu šiek tiek pasvirusį dokumentą…"
      );
    }
    parsed = registrationMergeFieldsV41(passes.map(x => registrationParseDocumentV41(x.text, x.confidence)));
  }
  if (registrationNeedsMorePassesV41(parsed)) {
    try {
      const targeted = await regNewCertificateFallbackV36(file, worker, T, status);
      if (targeted) {
        const synthetic = [
          "A " + (targeted.plate || ""),
          "B " + (targeted.year || ""),
          "D.1 " + (targeted.make || ""),
          "D.3 " + (targeted.model || ""),
          "E " + (targeted.vin || ""),
          String(targeted.regDoc || "").replace(/^([A-Z])/, "$1 ")
        ].join("\n");
        passes.push({ text: synthetic, confidence: 82 });
        parsed = registrationMergeFieldsV41(
          passes.map(x => registrationParseDocumentV41(x.text, x.confidence))
        );
      }
    } catch (e) {}
  }
  const found = Object.entries(parsed.fields)
    .filter(([, v]) => v.value)
    .map(([k]) => REGISTRATION_FIELDS_V41.find(x => x.key === k)?.label)
    .filter(Boolean);
  const candidates = Object.entries(parsed.fields).filter(([, v]) => v.candidate).length;
  parsed.statusSummary = found.length
    ? "Atpažinta: " + found.join(", ") + ". Patikrink kiekvieną reikšmę."
    : candidates
      ? "Rastos nepatikimos reikšmės. Patikrink jas arba įrašyk ranka."
      : "Dokumente reikšmių atpažinti nepavyko. Galima pildyti ranka arba prisegti nuotrauką.";
  if (status) status(parsed.statusSummary);
  return parsed;
}
registrationCertificateScanV31 = registrationScanUnifiedV41;
window.__visureigiaiRegistrationScanV31 = registrationScanUnifiedV41;
window.__visureigiaiRegistrationScanV41 = {
  parse: registrationParseDocumentV41,
  merge: registrationMergeFieldsV41,
  threshold: REGISTRATION_CONFIDENCE_THRESHOLD_V41
};
let registrationOcrStatusV41 = null;
ppOcrWorker = async function (statusEl) {
  registrationOcrStatusV41 = statusEl || null;
  if (ppOcrWorkerPromiseFinal) return ppOcrWorkerPromiseFinal;
  ppOcrWorkerPromiseFinal = (async () => {
    const T = await ppLoadOcr();
    if (!T.createWorker) return null;
    const workerPromise = T.createWorker("eng", 1, {
      logger: m => {
        const target = registrationOcrStatusV41;
        if (target && m.status === "recognizing text") {
          target.textContent = "Skaitau dokumentą · " + Math.round((m.progress || 0) * 100) + "%";
          target.classList?.add("show");
        } else if (target && m.status === "loading language model") {
          target.textContent = "Paruošiu OCR kalbos duomenis…";
          target.classList?.add("show");
        }
      }
    });
    let timer;
    const worker = await Promise.race([
      workerPromise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Error("OCR kalbos duomenų įkėlimas užtruko. Patikrink interneto ryšį ir bandyk dar kartą.")
            ),
          45e3
        );
      })
    ])
      .finally(() => clearTimeout(timer))
      .catch(e => {
        workerPromise.then(w => w?.terminate?.()).catch(() => {});
        throw e;
      });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./- "
      });
    } catch (e) {}
    return worker;
  })();
  try {
    return await ppOcrWorkerPromiseFinal;
  } catch (e) {
    ppOcrWorkerPromiseFinal = null;
    throw e;
  }
};
function installRegistrationReviewStyleV41() {
  if (document.getElementById("registrationReviewStyleV41")) return;
  const style = document.createElement("style");
  style.id = "registrationReviewStyleV41";
  style.textContent =
    ".registrationReviewBackdropV41{position:fixed;inset:0;z-index:100500;display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:clamp(10px,3vh,30px) 12px;background:rgba(15,25,37,.62);overscroll-behavior:contain}" +
    ".registrationReviewCardV41{width:min(900px,100%);max-height:94dvh;display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #dbe3ea;border-radius:20px;box-shadow:0 24px 80px rgba(7,19,34,.28);color:#172435}" +
    ".registrationReviewHeadV41,.registrationReviewFootV41{flex:none;padding:16px 20px;background:#fff;z-index:1}" +
    ".registrationReviewHeadV41{border-bottom:1px solid #e8edf1}.registrationReviewFootV41{border-top:1px solid #e8edf1;display:flex;gap:10px;justify-content:flex-end;align-items:center}" +
    ".registrationReviewHeadV41 h3{margin:0;font-size:20px;letter-spacing:-.02em}.registrationReviewHeadV41 p{margin:6px 0 0;color:#627186;font-size:13px;line-height:1.45}" +
    ".registrationReviewBodyV41{overflow:auto;padding:16px 20px;overscroll-behavior:contain}.registrationReviewImageV41{display:flex;gap:12px;align-items:center;margin-bottom:14px;padding:10px;border:1px solid #e5ebf0;border-radius:14px;background:#f7f9fb}" +
    ".registrationReviewImageV41 img{width:72px;height:88px;object-fit:cover;border-radius:9px;background:#e8edf1}.registrationReviewImageV41 span{font-size:13px;color:#526174}" +
    ".registrationReviewGridV41{display:grid;gap:7px}.registrationReviewLabelsV41,.registrationReviewRowV41{display:grid;grid-template-columns:minmax(130px,1fr) minmax(170px,1.25fr) minmax(105px,.7fr) 82px;gap:10px;align-items:center}" +
    ".registrationReviewLabelsV41{padding:0 10px 4px;color:#68788b;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.045em}.registrationReviewRowV41{padding:9px 10px;border:1px solid #e6ebf0;border-radius:12px;background:#fff}.registrationReviewRowV41.low{background:#fffaf0;border-color:#efd8a5}.registrationReviewNameV41{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:750}.registrationReviewNameV41 input{width:17px;height:17px;accent-color:#315b82}.registrationReviewCodeV41{color:#788697;font-size:12px;font-weight:700;overflow-wrap:anywhere}.registrationReviewRowV41 input[type=text]{width:100%;min-width:0;height:40px;padding:0 10px;border:1px solid #d5dee7;border-radius:9px;background:#fff;color:#1c2c3f;font:inherit;font-size:13px;font-weight:600}.registrationReviewRowV41 input[type=text]:focus{outline:3px solid #d7e6f4;border-color:#7897b5}.registrationReviewConfV41{font-size:12px;font-weight:750;color:#617388}.registrationReviewRowV41.low .registrationReviewConfV41{color:#9b6814}.registrationReviewRawV41{grid-column:1/-1;margin:-3px 0 2px 25px;color:#788697;font-size:11px}.registrationReviewRawV41 summary{cursor:pointer}.registrationReviewAttachV41{display:flex;gap:9px;align-items:flex-start;margin-top:14px;padding:12px;border-radius:12px;background:#f1f5f8;color:#3f5267;font-size:13px;line-height:1.4}.registrationReviewAttachV41 input{margin-top:2px;accent-color:#315b82}.registrationReviewWarningV41{padding:10px 12px;margin-bottom:12px;border-radius:10px;background:#fff3da;color:#80540d;font-size:13px;line-height:1.4}.registrationReviewFootV41 button{min-height:43px;padding:0 16px;border:1px solid #cad5df;border-radius:11px;background:#f4f7fa;color:#21354b;font-weight:750;cursor:pointer}.registrationReviewFootV41 button.primary{background:#315b82;color:#fff;border-color:#315b82}.registrationReviewFootV41 button:disabled{opacity:.5}.registrationReviewErrorV41{display:none;margin-top:10px;color:#a2333e;font-size:13px;font-weight:700}.registrationReviewErrorV41.show{display:block}" +
    "@media(max-width:620px){.registrationReviewBackdropV41{padding:8px;align-items:flex-start}.registrationReviewCardV41{max-height:96vh;max-height:96dvh;border-radius:16px}.registrationReviewHeadV41,.registrationReviewFootV41{padding:13px}.registrationReviewBodyV41{padding:12px}.registrationReviewHeadV41 h3{font-size:18px}.registrationReviewLabelsV41{display:none}.registrationReviewRowV41{grid-template-columns:minmax(0,1fr) auto;gap:7px 9px;padding:10px}.registrationReviewNameV41{grid-column:1/-1}.registrationReviewCodeV41{grid-column:1;grid-row:2;align-self:center}.registrationReviewRowV41 input[type=text]{grid-column:1/-1;grid-row:3;height:44px}.registrationReviewConfV41{grid-column:2;grid-row:1;text-align:right}.registrationReviewRawV41{grid-column:1/-1;margin:0}.registrationReviewFootV41{display:grid;grid-template-columns:1fr 1fr}.registrationReviewFootV41 button{width:100%;padding:0 8px}.registrationReviewAttachV41{font-size:12px}}";
  document.head.appendChild(style);
}
function registrationValidateReviewV41(key, value) {
  const v = String(value || "").trim();
  if (!v) return true;
  if (key === "plate") return /^[A-Z]{3}\d{3}$/.test(v.toUpperCase());
  if (key === "vin") return /^[A-HJ-NPR-Z0-9]{17}$/.test(v.toUpperCase());
  if (key === "regDoc") return /^[A-Z]\d{6,7}$/.test(v.toUpperCase());
  if (key === "firstRegistrationDate" || key === "firstRegistrationLithuaniaDate")
    return !!registrationDateV41(v);
  if (key === "modelYear") return registrationYearValidV41(v);
  return v.length <= 80 && !/[<>]/.test(v);
}
function registrationReviewCurrentV41(car = {}) {
  return {
    plate: car.plate || "",
    firstRegistrationDate: car.firstRegistrationDate || car.year || "",
    firstRegistrationLithuaniaDate: car.firstRegistrationLithuaniaDate || "",
    modelYear: car.modelYear || "",
    make: car.regMake || "",
    typeVariant: car.registrationType || "",
    model: car.regModel || "",
    vin: car.vin || "",
    regDoc: car.registrationDoc || car.regDoc || ""
  };
}
function registrationReviewV41(file, data, options = {}) {
  installRegistrationReviewStyleV41();
  return new Promise(resolve => {
    document.getElementById("registrationReviewBackdropV41")?.remove();
    let url = "";
    try {
      url = file ? URL.createObjectURL(file) : "";
    } catch (e) {}
    const current = options.current || {},
      fields = data?.fields || {},
      rows = REGISTRATION_FIELDS_V41.map(spec => {
        const item = fields[spec.key] || {
            value: "",
            candidate: "",
            sourceCode: spec.code,
            confidence: 0,
            raw: ""
          },
          candidate = String(item.candidate || item.value || ""),
          conf = registrationClampV41(item.confidence),
          existing = String(current[spec.key] ?? "").trim();
        const same =
            !!candidate &&
            (existing.toUpperCase() === candidate.toUpperCase() ||
              (spec.key === "firstRegistrationDate" &&
                /^\d{4}$/.test(existing) &&
                existing === candidate.slice(0, 4))),
          checked =
            !!candidate &&
            conf >= REGISTRATION_CONFIDENCE_THRESHOLD_V41 &&
            !item.conflict &&
            (!existing || same),
          low =
            !!candidate && (conf < REGISTRATION_CONFIDENCE_THRESHOLD_V41 || item.conflict || item.ambiguous);
        return (
          '<div class="registrationReviewRowV41 ' +
          (low ? "low" : "") +
          '" data-reg-review-row="' +
          escapeHTML(spec.key) +
          '"><label class="registrationReviewNameV41"><input type="checkbox" data-reg-review-use="' +
          escapeHTML(spec.key) +
          '" ' +
          (checked ? "checked" : "") +
          " " +
          (!candidate ? "disabled" : "") +
          "><span>" +
          escapeHTML(spec.label) +
          '</span></label><input type="text" data-reg-review-value="' +
          escapeHTML(spec.key) +
          '" value="' +
          escapeHTML(candidate) +
          '" placeholder="' +
          (candidate ? "Patikrink reikšmę" : "Neatpažinta") +
          '" maxlength="80" autocomplete="off" ' +
          (!candidate ? "disabled" : "") +
          '><span class="registrationReviewCodeV41">' +
          escapeHTML(item.sourceCode || spec.code) +
          '</span><span class="registrationReviewConfV41">' +
          (candidate ? Math.round(conf * 100) + "%" : "—") +
          "</span>" +
          (item.raw
            ? '<details class="registrationReviewRawV41"><summary>OCR ištrauka</summary><span>' +
              escapeHTML(item.raw) +
              "</span></details>"
            : "") +
          "</div>"
        );
      }).join("");
    const warning = options.warning
      ? '<div class="registrationReviewWarningV41">' + escapeHTML(options.warning) + "</div>"
      : "";
    const overlay = document.createElement("div");
    overlay.id = "registrationReviewBackdropV41";
    overlay.className = "registrationReviewBackdropV41";
    overlay.innerHTML =
      '<section class="registrationReviewCardV41" role="dialog" aria-modal="true" aria-labelledby="registrationReviewTitleV41"><header class="registrationReviewHeadV41"><h3 id="registrationReviewTitleV41">Patikrink nuskaitytus duomenis</h3><p>OCR gali suklysti. Pažymėk tik patikrintas reikšmes. Esami duomenys bus pakeisti tik pažymėjus lauką.</p></header><div class="registrationReviewBodyV41">' +
      warning +
      (url
        ? '<div class="registrationReviewImageV41"><img src="' +
          url +
          '" alt="Registracijos liudijimo nuotraukos peržiūra"><span>Originali nuotrauka lieka šiame įrenginyje. Palygink laukus su dokumentu.</span></div>'
        : "") +
      '<div class="registrationReviewLabelsV41"><span>Laukas</span><span>Atpažinta reikšmė</span><span>Dokumento kodas</span><span>Patikimumas</span></div><div class="registrationReviewGridV41">' +
      rows +
      '</div><label class="registrationReviewAttachV41"><input id="registrationReviewAttachV41" type="checkbox" checked><span>Po patvirtinimo prisegti šią nuotrauką prie automobilio kaip registracijos dokumentą.</span></label><div class="registrationReviewErrorV41" id="registrationReviewErrorV41"></div></div><footer class="registrationReviewFootV41"><button type="button" data-reg-review-cancel>Atšaukti</button><button class="primary" type="button" data-reg-review-confirm>Patvirtinti pasirinkimą</button></footer></section>';
    document.body.appendChild(overlay);
    const finish = result => {
      overlay.remove();
      if (url) URL.revokeObjectURL(url);
      resolve(result);
    };
    overlay.querySelector("[data-reg-review-cancel]").onclick = () => finish(null);
    overlay.querySelector("[data-reg-review-confirm]").onclick = () => {
      const values = {},
        error = overlay.querySelector("#registrationReviewErrorV41");
      let invalid = "";
      for (const spec of REGISTRATION_FIELDS_V41) {
        const cb = overlay.querySelector('[data-reg-review-use="' + spec.key + '"]'),
          input = overlay.querySelector('[data-reg-review-value="' + spec.key + '"]');
        if (!cb?.checked || !input) continue;
        let v = input.value.trim();
        if (!v) continue;
        if (!registrationValidateReviewV41(spec.key, v)) {
          invalid = spec.key;
          input.setAttribute("aria-invalid", "true");
          break;
        }
        input.removeAttribute("aria-invalid");
        if (
          spec.key === "plate" ||
          spec.key === "vin" ||
          spec.key === "regDoc" ||
          spec.key === "make" ||
          spec.key === "model" ||
          spec.key === "typeVariant"
        )
          v = v.toUpperCase();
        if (spec.key === "firstRegistrationDate" || spec.key === "firstRegistrationLithuaniaDate")
          v = registrationDateV41(v);
        if (spec.key === "modelYear") v = Number(v);
        values[spec.key] = v;
      }
      if (invalid) {
        if (error) {
          error.textContent =
            "Patikrink pažymėtą lauką: " +
            (REGISTRATION_FIELDS_V41.find(x => x.key === invalid)?.label || invalid) +
            ".";
          error.classList.add("show");
        }
        return;
      }
      finish({ values, attachDocument: !!overlay.querySelector("#registrationReviewAttachV41")?.checked });
    };
    overlay.addEventListener("keydown", e => {
      if (e.key === "Escape") finish(null);
    });
  });
}
function registrationCountV41(values = {}) {
  return Object.values(values).filter(v => v !== "" && v != null).length;
}
function registrationFormResultV41(values = {}) {
  const first = values.firstRegistrationDate || "";
  return {
    make: values.make || "",
    model: values.model || "",
    year: first ? Number(String(first).slice(0, 4)) : null,
    firstRegistrationDate: first,
    firstRegistrationLithuaniaDate: values.firstRegistrationLithuaniaDate || "",
    modelYear: values.modelYear || null,
    typeVariant: values.typeVariant || "",
    vin: values.vin || "",
    plate: values.plate || "",
    regDoc: values.regDoc || ""
  };
}
function registrationSetInputV41(id, value) {
  const el = document.getElementById(id);
  if (!el || value == null || value === "") return false;
  el.value = String(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
function registrationBindBDateV41(prefix) {
  const date = document.getElementById(prefix + "firstRegistrationDate"),
    year = document.getElementById(prefix + "year");
  if (!date || !year || date.dataset.registrationYearSyncV41) return;
  date.dataset.registrationYearSyncV41 = "1";
  date.addEventListener("change", () => {
    if (!date.value) return;
    year.value = String(date.value).slice(0, 4);
    year.dispatchEvent(new Event("input", { bubbles: true }));
    year.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function registrationMetaMarkupV41(prefix, c = {}) {
  return (
    '<details class="vehicleDetails registrationMetaV41"><summary>Registracijos datos ir tipas</summary><div class="vehicleFields registrationMetaGridV41"><div class="field"><label for="' +
    prefix +
    'firstRegistrationDate">Pirmosios registracijos data (B)</label><input class="input" id="' +
    prefix +
    'firstRegistrationDate" type="date" value="' +
    escapeHTML(c.firstRegistrationDate || "") +
    '"></div><div class="field"><label for="' +
    prefix +
    'firstRegistrationLithuaniaDate">Registracija Lietuvoje (B.1)</label><input class="input" id="' +
    prefix +
    'firstRegistrationLithuaniaDate" type="date" value="' +
    escapeHTML(c.firstRegistrationLithuaniaDate || "") +
    '"></div><div class="field"><label for="' +
    prefix +
    'modelYear">Modelio metai (B.2)</label><input class="input" id="' +
    prefix +
    'modelYear" type="number" min="1886" max="' +
    (new Date().getFullYear() + 1) +
    '" value="' +
    escapeHTML(c.modelYear || "") +
    '"></div><div class="field"><label for="' +
    prefix +
    'registrationType">Tipas / variantas (D.2)</label><input class="input" id="' +
    prefix +
    'registrationType" maxlength="60" value="' +
    escapeHTML(c.registrationType || "") +
    '" autocomplete="off"></div></div></details>'
  );
}
const __vehicleFieldsV41 = vehicleFields;
vehicleFields = function (prefix, c = {}) {
  let html = __vehicleFieldsV41(prefix, c);
  if (["newVehicle", "editVehicle"].includes(prefix))
    html = html.replace(
      'for="' + prefix + 'year">Metai</label>',
      'for="' + prefix + 'year">Pirmosios registracijos metai (B)</label>'
    );
  return ["newVehicle", "editVehicle"].includes(prefix) ? html + registrationMetaMarkupV41(prefix, c) : html;
};
const __readVehicleFieldsV41 = readVehicleFields;
readVehicleFields = function (prefix) {
  const o = __readVehicleFieldsV41(prefix),
    b = document.getElementById(prefix + "firstRegistrationDate")?.value || "",
    b1 = document.getElementById(prefix + "firstRegistrationLithuaniaDate")?.value || "",
    b2 = document.getElementById(prefix + "modelYear")?.value || "",
    d2 = (document.getElementById(prefix + "registrationType")?.value || "").trim().toUpperCase();
  if (b && !registrationDateV41(b)) throw Error("Patikrink pirmosios registracijos datą (B).");
  if (b1 && !registrationDateV41(b1)) throw Error("Patikrink registracijos Lietuvoje datą (B.1).");
  if (b2 && !registrationYearValidV41(b2)) throw Error("Patikrink modelio metus (B.2).");
  return {
    ...o,
    year: b ? Number(b.slice(0, 4)) : o.year,
    firstRegistrationDate: b,
    firstRegistrationLithuaniaDate: b1,
    modelYear: b2 ? Number(b2) : null,
    registrationType: d2
  };
};
const __newCarApplyRegistrationV41 = newCarApplyRegistrationV29;
newCarApplyRegistrationV29 = function (d = {}) {
  const oldName = newCarFieldValueV29("carName");
  __newCarApplyRegistrationV41(d);
  newCarRegDataV29 = {
    ...newCarRegDataV29,
    firstRegistrationDate: d.firstRegistrationDate || "",
    firstRegistrationLithuaniaDate: d.firstRegistrationLithuaniaDate || "",
    modelYear: d.modelYear || null,
    typeVariant: d.typeVariant || ""
  };
  for (const [id, value] of [
    ["newVehiclefirstRegistrationDate", d.firstRegistrationDate],
    ["newVehiclefirstRegistrationLithuaniaDate", d.firstRegistrationLithuaniaDate],
    ["newVehiclemodelYear", d.modelYear],
    ["newVehicleregistrationType", d.typeVariant]
  ])
    if (value != null && value !== "") registrationSetInputV41(id, value);
  if (oldName && !(d.make && d.model)) registrationSetInputV41("carName", oldName);
};
const __newCarReadScanFieldsV41 = newCarReadScanFieldsV29;
newCarReadScanFieldsV29 = function () {
  const o = __newCarReadScanFieldsV41(),
    b = document.getElementById("newVehiclefirstRegistrationDate")?.value || "",
    b1 = document.getElementById("newVehiclefirstRegistrationLithuaniaDate")?.value || "",
    b2 = document.getElementById("newVehiclemodelYear")?.value || "",
    d2 = (document.getElementById("newVehicleregistrationType")?.value || "").trim().toUpperCase();
  return {
    ...o,
    year: b ? Number(b.slice(0, 4)) : o.year,
    firstRegistrationDate: b,
    firstRegistrationLithuaniaDate: b1,
    modelYear: b2 ? Number(b2) : null,
    registrationType: d2
  };
};
const newRegistrationFieldsV41 = document.getElementById("newVehicleyear");
if (newRegistrationFieldsV41 && !document.getElementById("newVehiclefirstRegistrationDate"))
  newRegistrationFieldsV41
    .closest(".vehicleFields")
    ?.insertAdjacentHTML("beforeend", registrationMetaMarkupV41("newVehicle", {}));
registrationBindBDateV41("newVehicle");
newCarScanRegistrationV29 = async function (file) {
  if (!file) return;
  const status = document.getElementById("newCarScanStateV29"),
    preview = document.getElementById("newCarScanPreviewV29"),
    img = document.getElementById("newCarScanImageV29");
  ["newCarCameraV29", "newCarGalleryV29"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
  if (newCarRegPreviewUrlV29) URL.revokeObjectURL(newCarRegPreviewUrlV29);
  newCarRegPreviewUrlV29 = URL.createObjectURL(file);
  if (img) img.src = newCarRegPreviewUrlV29;
  if (preview) preview.classList.add("show");
  if (status) status.textContent = "Skaitau registracijos liudijimą…";
  try {
    const data = await registrationScanUnifiedV41(file, status),
      existingName = newCarFieldValueV29("carName"),
      parts = existingName.split(/\s+/),
      current = {
        make: parts.shift() || "",
        model: parts.join(" "),
        year: newCarFieldValueV29("newVehicleyear"),
        plate: newCarFieldValueV29("newVehicleplate"),
        vin: newCarFieldValueV29("newVehiclevin"),
        regDoc: newCarFieldValueV29("newVehicleregistrationDoc"),
        firstRegistrationDate:
          document.getElementById("newVehiclefirstRegistrationDate")?.value ||
          newCarFieldValueV29("newVehicleyear"),
        firstRegistrationLithuaniaDate:
          document.getElementById("newVehiclefirstRegistrationLithuaniaDate")?.value || "",
        modelYear: document.getElementById("newVehiclemodelYear")?.value || "",
        typeVariant: document.getElementById("newVehicleregistrationType")?.value || ""
      };
    const confirmed = await registrationReviewV41(file, data, { current });
    if (!confirmed) {
      newCarRegFileV29 = null;
      if (status) status.textContent = "Nuskaitymas atšauktas. Gali bandyti dar kartą arba pildyti ranka.";
      return;
    }
    newCarRegFileV29 = confirmed.attachDocument ? file : null;
    const result = registrationFormResultV41(confirmed.values);
    newCarApplyRegistrationV29(result);
    const count = registrationCountV41(confirmed.values);
    if (status)
      status.textContent = count
        ? "Patvirtinta " + count + " laukų. Patikrink formą ir išsaugok automobilį."
        : "Nėra patvirtintų OCR laukų. Gali pildyti ranka" +
          (newCarRegFileV29 ? " arba prisegti nuotrauką." : ".");
    if (count) toast("Patvirtinta " + count + " registracijos laukų", "✓");
  } catch (e) {
    newCarRegFileV29 = null;
    if (status)
      status.textContent =
        "Nuskaityti nepavyko: " +
        (e.message || "OCR modulis nepasiekiamas") +
        ". Gali pildyti ranka arba kartoti.";
    toast("OCR nepavyko — nuotrauka liko šiame įrenginyje", "⚠️");
  }
};
const __openCarEditReviewV41 = openCarEditSheet;
openCarEditSheet = function (id) {
  __openCarEditReviewV41(id);
  const car = (state.cars || []).find(c => c.id === id),
    oldInput = document.getElementById("editVehicledoc_registration");
  if (!car || !oldInput) return;
  registrationBindBDateV41("editVehicle");
  const input = oldInput.cloneNode(true);
  oldInput.replaceWith(input);
  const status = document.getElementById("editVehiclefiles_registration");
  input.addEventListener("change", async () => {
    const file = Array.from(input.files || []).find(f => String(f.type || "").startsWith("image/"));
    if (!file) {
      if (status && input.files?.length)
        status.textContent = "Dokumentas bus prisegtas išsaugojus pakeitimus.";
      return;
    }
    if (status) {
      status.textContent = "Skaitau registracijos liudijimą…";
      status.classList.remove("good", "bad");
    }
    try {
      const data = await registrationScanUnifiedV41(file, status),
        identity = window.__visureigiaiRegistrationIdentityCheckV33(car, data);
      if (identity.mismatch && car.vin) {
        const docOnly = await registrationMismatchDialogV33(car, identity, { allowDocumentOnly: true });
        if (!docOnly) {
          input.value = "";
          if (status) {
            status.textContent = "Pasirink teisingą registracijos liudijimą.";
            status.classList.add("bad");
          }
          return;
        }
        if (status) {
          status.textContent = "Dokumentas bus pridėtas tik kaip failas; automobilio duomenys nepakeisti.";
          status.classList.add("bad");
        }
        return;
      }
      const warning = identity.mismatch
        ? "Automobilio VIN dar nenurodytas, o markė arba modelis skiriasi. Palygink dokumentą su automobiliu prieš patvirtindamas."
        : "";
      const confirmed = await registrationReviewV41(file, data, {
        current: registrationReviewCurrentV41(car),
        warning
      });
      if (!confirmed) {
        input.value = "";
        if (status) status.textContent = "Nuskaitymas atšauktas; automobilio duomenys nepakeisti.";
        return;
      }
      if (!confirmed.attachDocument) input.value = "";
      const v = confirmed.values;
      for (const [id, value] of [
        ["editVehiclevin", v.vin],
        ["editVehicleplate", v.plate],
        ["editVehicleregistrationDoc", v.regDoc],
        [
          "editVehicleyear",
          v.firstRegistrationDate ? Number(String(v.firstRegistrationDate).slice(0, 4)) : null
        ],
        ["editVehicleregMake", v.make],
        ["editVehicleregModel", v.model],
        ["editVehiclefirstRegistrationDate", v.firstRegistrationDate],
        ["editVehiclefirstRegistrationLithuaniaDate", v.firstRegistrationLithuaniaDate],
        ["editVehiclemodelYear", v.modelYear],
        ["editVehicleregistrationType", v.typeVariant]
      ])
        if (value != null && value !== "") registrationSetInputV41(id, value);
      if (status) {
        status.textContent =
          "Užpildyta " + registrationCountV41(v) + " iš 6 laukų. Patikrink ir spausk „Išsaugoti pakeitimus“.";
        status.classList.add("good");
      }
    } catch (e) {
      input.value = "";
      if (status) {
        status.textContent =
          "Nuskaitymo nepavyko patvirtinti: " +
          (e.message || "patikrink internetą ir nuotrauką") +
          ". Jei reikia, failą pasirink iš naujo ir prisegk rankiniu būdu.";
        status.classList.add("bad");
      }
    }
  });
};
const __workCenterMissingFieldsV41 = workCenterMissingFieldsV30;
workCenterMissingFieldsV30 = function (car) {
  const fields = __workCenterMissingFieldsV41(car),
    has = k => fields.some(x => x.key === k);
  if (!String(car?.regMake || "").trim() && !has("regMake")) fields.push({ key: "regMake", label: "markė" });
  if (!String(car?.regModel || "").trim() && !has("regModel"))
    fields.push({ key: "regModel", label: "modelis" });
  return fields;
};
openWhatMissingDataV30 = function (item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  if (!car) return;
  const fields = workCenterMissingFieldsV30(car);
  if (!fields.length) {
    render();
    return;
  }
  const scanKeys = new Set(["vin", "plate", "registrationDoc", "year"]);
  const canScan = fields.some(f => scanKeys.has(f.key));
  let scannedFile = null,
    scannedData = null,
    previewUrl = "";
  const input = f => {
    if (f.key === "taStatus")
      return (
        '<div class="field"><label>TA</label><select class="input" id="what_taStatus">' +
        vehicleStatusOptions(car.taStatus || "unknown") +
        "</select></div>"
      );
    if (f.key === "insuranceStatus")
      return (
        '<div class="field"><label>Draudimas</label><select class="input" id="what_insuranceStatus">' +
        vehicleStatusOptions(car.insuranceStatus || "unknown") +
        "</select></div>"
      );
    const cfg = {
      vin: ["VIN", "text", "17"],
      mileage: ["Rida, km", "number", ""],
      sdk: ["SDK", "text", "32"],
      plate: ["Valstybinis numeris", "text", "20"],
      registrationDoc: ["Registracijos liudijimo serija ir nr.", "text", "12"],
      year: ["Pagaminimo metai", "number", "4"],
      regMake: ["Markė (D.1)", "text", "40"],
      regModel: ["Modelis (D.3)", "text", "64"],
      buyPrice: ["Pirkimo kaina, €", "number", ""]
    }[f.key];
    if (!cfg) return "";
    const value =
        f.key === "registrationDoc"
          ? car.registrationDoc || car.regDoc || ""
          : f.key === "regMake"
            ? car.regMake || ""
            : f.key === "regModel"
              ? car.regModel || ""
              : (car[f.key] ?? ""),
      num = cfg[1] === "number";
    return (
      '<div class="field ' +
      (["vin", "registrationDoc", "sdk", "regMake", "regModel"].includes(f.key) ? "whatWideV30" : "") +
      '"><label>' +
      cfg[0] +
      '</label><input class="input" id="what_' +
      f.key +
      '" type="' +
      cfg[1] +
      '" value="' +
      escapeHTML(value) +
      '" ' +
      (cfg[2] ? 'maxlength="' + cfg[2] + '"' : "") +
      (num ? ' min="0" inputmode="numeric"' : "") +
      " " +
      (["vin", "plate", "registrationDoc"].includes(f.key)
        ? 'autocapitalize="characters" autocomplete="off"'
        : "") +
      "></div>"
    );
  };
  const scan = canScan
    ? '<div class="whatRegScanV31"><div class="whatRegScanTitleV31"><strong>Užpildyti iš registracijos liudijimo</strong><span>nebūtina</span></div><div class="whatRegScanActionsV31"><label class="whatRegScanBtnV31" for="whatRegCameraV31">📷 Fotografuoti<input id="whatRegCameraV31" type="file" accept="image/*" capture="environment"></label><label class="whatRegScanBtnV31" for="whatRegGalleryV31">🖼️ Iš galerijos<input id="whatRegGalleryV31" type="file" accept="image/*"></label></div><div class="whatRegScanPreviewV31" id="whatRegPreviewV31"><img id="whatRegPreviewImgV31" alt="Registracijos liudijimas"></div><div class="whatRegScanStateV31" id="whatRegStateV31"></div></div>'
    : "";
  openSheet(
    '<div class="sheetHead"><h3>' +
      escapeHTML(car.name) +
      '</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Užpildyti trūkstamus duomenis</strong><span>Rodomi trūkstami laukai; registracijos duomenis gali nuskaityti iš liudijimo.</span></div>' +
      scan +
      '<div class="whatQuickGridV30">' +
      fields.map(input).join("") +
      '</div><button class="btn whatPrimaryV30" id="whatSaveMissingV30" type="button">Išsaugoti</button></section>'
  );
  const cleanup = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
  };
  document.querySelector("[data-what-close]")?.addEventListener("click", cleanup, { once: true });
  const runScan = async file => {
    if (!file) return;
    ["whatRegCameraV31", "whatRegGalleryV31"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const st = document.getElementById("whatRegStateV31"),
      preview = document.getElementById("whatRegPreviewV31"),
      img = document.getElementById("whatRegPreviewImgV31");
    cleanup();
    previewUrl = URL.createObjectURL(file);
    if (img) img.src = previewUrl;
    if (preview) preview.classList.add("show");
    if (st) {
      st.className = "whatRegScanStateV31 show";
      st.textContent = "Skaitau registracijos liudijimą…";
    }
    try {
      const data = await registrationScanUnifiedV41(file, st),
        identity = window.__visureigiaiRegistrationIdentityCheckV33(car, data);
      if (identity.mismatch && car.vin) {
        scannedData = null;
        scannedFile = null;
        await registrationMismatchDialogV33(car, identity, { allowDocumentOnly: false });
        if (st) {
          st.className = "whatRegScanStateV31 show bad";
          st.textContent = "Dokumento duomenys nesutampa su automobiliu. Nieko neužpildžiau.";
        }
        return;
      }
      const warning = identity.mismatch
        ? "Automobilio VIN dar nėra, o markė arba modelis skiriasi. Patikrink dokumentą prieš patvirtindamas."
        : "";
      const confirmed = await registrationReviewV41(file, data, {
        current: registrationReviewCurrentV41(car),
        warning
      });
      if (!confirmed) {
        scannedData = null;
        scannedFile = null;
        if (st) st.textContent = "Nuskaitymas atšauktas; nieko nepakeista.";
        return;
      }
      scannedData = { ...confirmed.values, attachDocument: confirmed.attachDocument };
      scannedFile = confirmed.attachDocument ? file : null;
      const v = confirmed.values,
        map = {
          vin: v.vin,
          plate: v.plate,
          registrationDoc: v.regDoc,
          year: v.firstRegistrationDate ? Number(String(v.firstRegistrationDate).slice(0, 4)) : null
        };
      for (const [k, val] of Object.entries(map))
        if (val != null && val !== "") registrationSetInputV41("what_" + k, val);
      if (st) {
        st.className = "whatRegScanStateV31 show good";
        st.textContent =
          "Užpildyta " + registrationCountV41(v) + " iš 4 laukų. Dar kartą patikrink ir spausk „Išsaugoti“.";
      }
    } catch (e) {
      scannedData = null;
      scannedFile = null;
      if (st) {
        st.className = "whatRegScanStateV31 show bad";
        st.textContent =
          "Nuskaityti nepavyko: " +
          (e.message || "OCR modulis nepasiekiamas") +
          ". Gali pildyti ranka arba kartoti.";
      }
    }
  };
  document.getElementById("whatRegCameraV31")?.addEventListener("change", e => runScan(e.target.files?.[0]));
  document.getElementById("whatRegGalleryV31")?.addEventListener("change", e => runScan(e.target.files?.[0]));
  document.getElementById("whatSaveMissingV30").onclick = async () => {
    const btn = document.getElementById("whatSaveMissingV30");
    if (btn.disabled) return;
    const old = JSON.parse(JSON.stringify(car)),
      oldBalance = Number(state.finances?.budgetBalance || 0);
    let addedDoc = null;
    try {
      const patch = {};
      let newBuy = Number(car.buyPrice || 0);
      for (const f of fields) {
        const el = document.getElementById("what_" + f.key);
        if (!el) continue;
        let v = String(el.value ?? "").trim();
        if (f.key === "vin") {
          v = v.toUpperCase();
          if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) throw Error("VIN turi būti 17 simbolių.");
          patch.vin = v;
        } else if (f.key === "mileage") {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0) throw Error("Patikrink ridą.");
          patch.mileage = n;
        } else if (f.key === "sdk") {
          v = v.toUpperCase();
          if (!v) throw Error("Įrašyk SDK.");
          patch.sdk = v;
          if (!car.sdkStatus || car.sdkStatus === "unset") patch.sdkStatus = "done";
        } else if (f.key === "plate") {
          v = v.toUpperCase();
          if (!/^[A-Z]{3}\d{3}$/.test(v))
            throw Error("Valstybinis numeris turi būti 3 raidės ir 3 skaitmenys.");
          patch.plate = v;
        } else if (f.key === "registrationDoc") {
          v = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (!/^[A-Z]\d{6,7}$/.test(v)) throw Error("Patikrink registracijos liudijimo numerį.");
          patch.registrationDoc = v;
        } else if (f.key === "year") {
          const n = Number(v),
            max = new Date().getFullYear() + 1;
          if (!Number.isInteger(n) || n < 1886 || n > max) throw Error("Patikrink metus.");
          patch.year = n;
        } else if (f.key === "regMake") {
          if (!v) throw Error("Įrašyk markę.");
          patch.regMake = v.toUpperCase();
        } else if (f.key === "regModel") {
          if (!v) throw Error("Įrašyk modelį.");
          patch.regModel = v.toUpperCase();
        } else if (f.key === "taStatus") {
          if (!["valid", "invalid"].includes(v)) throw Error("Pasirink TA būseną.");
          patch.taStatus = v;
        } else if (f.key === "insuranceStatus") {
          if (!["valid", "invalid"].includes(v)) throw Error("Pasirink draudimo būseną.");
          patch.insuranceStatus = v;
        } else if (f.key === "buyPrice") {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) throw Error("Įrašyk pirkimo kainą.");
          newBuy = n;
          patch.buyPrice = n;
        }
      }
      if (scannedData) {
        for (const [key, carKey] of [
          ["vin", "vin"],
          ["plate", "plate"],
          ["regDoc", "registrationDoc"]
        ]) {
          const v = scannedData[key];
          if (v !== "" && v != null) patch[carKey] = v;
        }
        const scannedYear = Number(String(scannedData.firstRegistrationDate || "").slice(0, 4));
        if (registrationYearValidV41(scannedYear)) patch.year = scannedYear;
      }
      if (scannedFile && !hasCarDocument(car, "registration")) {
        addedDoc = await registrationDocumentFromImageV31(
          scannedFile,
          patch.registrationDoc || car.registrationDoc || scannedData?.regDoc || ""
        );
        patch.documents = [...(car.documents || []), addedDoc];
      }
      btn.disabled = true;
      btn.textContent = "Išsaugoma…";
      Object.assign(car, patch);
      if (newBuy !== Number(old.buyPrice || 0)) {
        ensureFinanceCollections();
        state.finances.budgetBalance += Number(old.buyPrice || 0) - newBuy;
      }
      if (!saveState()) throw Error("Nepavyko išsaugoti.");
      addHistory("Automobilio duomenys papildyti", car.name, "✎", {
        kind: "car",
        id: car.id,
        label: "Atidaryti automobilį"
      });
      saveState();
      cleanup();
      closeSheet();
      render();
      toast("Automobilio duomenys išsaugoti", "✓");
    } catch (e) {
      Object.keys(car).forEach(k => delete car[k]);
      Object.assign(car, old);
      if (state.finances) state.finances.budgetBalance = oldBalance;
      if (addedDoc?.key) await photoDelete(addedDoc.key).catch(() => {});
      toast(e.message || "Patikrink duomenis", "!");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Išsaugoti";
      }
    }
  };
};
function registrationRunRegressionV41() {
  const cases = [
    {
      name: "BMW legacy certificate",
      text: "Y 571146\nA KFG911\nE 5UXZV4C57CL990816\nD.1 BMW\nD.2 -- / -- / --\nD.3 X5 xDrive35i\nB --\n(B.1) 2018-01-16\n(B.2) 2012",
      check: d =>
        d.plate === "KFG911" &&
        d.make === "BMW" &&
        d.model === "X5 XDRIVE35I" &&
        d.vin === "5UXZV4C57CL990816" &&
        d.regDoc === "Y571146" &&
        d.year === null &&
        d.firstRegistrationLithuaniaDate === "2018-01-16" &&
        d.modelYear === 2012
    },
    {
      name: "BMW joined labels",
      text: "Y 5 7 1 1 4 6 A KFG911 E 5UXZV4C57CL990816 D.1 BMW D.2 --/--/-- D.3 X5 xDrive35i B -- B.1 2018-01-16 B.2 2012",
      check: d =>
        d.plate === "KFG911" &&
        d.regDoc === "Y571146" &&
        d.year === null &&
        d.firstRegistrationLithuaniaDate === "2018-01-16" &&
        d.modelYear === 2012
    },
    {
      name: "Joined D labels without spaces",
      text: "Y571146\nA KFG911\nE 5UXZV4C57CL990816\nD.1BMW\nD.2--\nD.3X5 xDrive35i\nB -- (B.1)2018-01-16 (B.2)2012",
      check: d =>
        d.make === "BMW" &&
        d.model === "X5 XDRIVE35I" &&
        d.firstRegistrationLithuaniaDate === "2018-01-16" &&
        d.modelYear === 2012 &&
        d.year === null
    },
    {
      name: "Honda registration certificate",
      text: "K1281961\nA KSE851\nI 2026-08-18\nB 2008-11-12\nB.1 2018-11-10\nC1=C2\nC1.1 OWNER NAME\nC1.2 OWNER\nC1.3 STREET ADDRESS\nD.1 HONDA\nD.2 RE6/1/2\nD.3 HONDA CR-V\nE SHSRE67508U010118",
      check: d =>
        d.plate === "KSE851" &&
        d.make === "HONDA" &&
        d.model === "CR-V" &&
        d.vin === "SHSRE67508U010118" &&
        d.regDoc === "K1281961" &&
        d.year === 2008 &&
        d.firstRegistrationLithuaniaDate === "2018-11-10" &&
        !JSON.stringify(d.fields).includes("OWNER") &&
        !JSON.stringify(d.fields).includes("ADDRESS")
    },
    {
      name: "No B date fallback",
      text: "A KFG911 B -- B.1 2018-01-16 B.2 2012 D.1 BMW D.3 X5 E 5UXZV4C57CL990816",
      check: d =>
        d.year === null &&
        d.firstRegistrationDate === "" &&
        d.firstRegistrationLithuaniaDate === "2018-01-16" &&
        d.modelYear === 2012
    },
    {
      name: "VIN, plate and serial OCR ambiguity stays uncorrected",
      text: "Y 57S146 A KFG9I1 B 2008-11-12 D.1 HONDA D.3 CR-V E SHSRE67508U01011O",
      check: d =>
        d.vin === "" &&
        d.fields.vin.candidate.endsWith("O") &&
        d.plate === "" &&
        d.fields.plate.candidate === "KFG9I1" &&
        d.regDoc === "" &&
        d.fields.regDoc.candidate === "Y57S146"
    },
    {
      name: "Conflicting OCR passes require review",
      multi: true,
      check: d => d.fields.plate.value === "" && d.fields.plate.conflict === true
    }
  ];
  const failures = [];
  for (const c of cases) {
    try {
      let d;
      if (c.multi) {
        const one = registrationParseDocumentV41("A KFG911 D.1 BMW D.3 X5 E 5UXZV4C57CL990816", 92),
          two = registrationParseDocumentV41("A KFG912 D.1 BMW D.3 X5 E 5UXZV4C57CL990816", 92);
        d = registrationMergeFieldsV41([one, two]);
      } else d = registrationParseDocumentV41(c.text, 92);
      if (!c.check(d))
        failures.push({
          name: c.name,
          result: {
            plate: d.plate,
            make: d.make,
            model: d.model,
            vin: d.vin,
            regDoc: d.regDoc,
            year: d.year,
            B1: d.firstRegistrationLithuaniaDate,
            B2: d.modelYear,
            fields: d.fields
          }
        });
    } catch (e) {
      failures.push({ name: c.name, error: e.message });
    }
  }
  return { passed: cases.length - failures.length, total: cases.length, failures };
}
window.__visureigiaiRegistrationScanV41.tests = registrationRunRegressionV41;
const __renderCarSheetRegistrationV41 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetRegistrationV41(car);
  const list = document.querySelector("#sheet .vehicleInfo");
  if (!list || list.querySelector("[data-registration-v41-view]")) return;
  list.querySelectorAll("dt").forEach(dt => {
    if (dt.textContent.trim() === "Metai") dt.textContent = "Pirmosios registracijos metai (B)";
  });
  const rows = [
    ["Markė (D.1)", car?.regMake],
    ["Komercinis modelis (D.3)", car?.regModel],
    ["Pirmoji registracija (B)", car?.firstRegistrationDate],
    ["Pirmoji registracija Lietuvoje (B.1)", car?.firstRegistrationLithuaniaDate],
    ["Modelio metai (B.2)", car?.modelYear],
    ["Tipas / variantas (D.2)", car?.registrationType]
  ].filter(([, v]) => v !== "" && v != null);
  if (rows.length)
    list.insertAdjacentHTML(
      "beforeend",
      rows
        .map(
          ([label, value]) =>
            "<div data-registration-v41-view><dt>" +
            escapeHTML(label) +
            "</dt><dd>" +
            escapeHTML(value) +
            "</dd></div>"
        )
        .join("")
    );
};
