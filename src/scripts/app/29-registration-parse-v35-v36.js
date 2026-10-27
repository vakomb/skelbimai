// Registracijos liudijimo teksto parsinimas (v35) ir naujo formato atpažinimas (v36).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const REG_MAKES_V35 = [
  "ALFA ROMEO",
  "AUDI",
  "BMW",
  "CHEVROLET",
  "CHRYSLER",
  "CITROEN",
  "CUPRA",
  "DACIA",
  "DAEWOO",
  "DAIHATSU",
  "DODGE",
  "FIAT",
  "FORD",
  "HONDA",
  "HYUNDAI",
  "INFINITI",
  "ISUZU",
  "IVECO",
  "JAGUAR",
  "JEEP",
  "KIA",
  "LADA",
  "LAND ROVER",
  "LEXUS",
  "MAZDA",
  "MERCEDES-BENZ",
  "MERCEDES",
  "MINI",
  "MITSUBISHI",
  "NISSAN",
  "OPEL",
  "PEUGEOT",
  "PORSCHE",
  "RENAULT",
  "SAAB",
  "SEAT",
  "SKODA",
  "SMART",
  "SSANGYONG",
  "SUBARU",
  "SUZUKI",
  "TESLA",
  "TOYOTA",
  "VOLKSWAGEN",
  "VOLVO"
];
function regLinesV35(text = "") {
  return ppNormalizeOcr(text)
    .split("\n")
    .map(x => x.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
function regNormTextV35(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function regLevV35(a = "", b = "") {
  a = String(a);
  b = String(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i),
    cur = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}
function regTailDigitsV35(v = "") {
  return String(v || "")
    .toUpperCase()
    .replace(/O|Q/g, "0")
    .replace(/I|L/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/G/g, "6");
}
function regHeadLettersV35(v = "") {
  return String(v || "")
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/2/g, "Z")
    .replace(/5/g, "S")
    .replace(/8/g, "B");
}
function regCleanV35(v = "") {
  return String(v || "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:;,.-]+|[\s:;,.-]+$/g, "")
    .trim();
}
function regCutNextLabelV35(v = "") {
  let s = regCleanV35(v);
  const m = s.match(
    /\s+(?=(?:A|B(?:[.]?[12])?|C(?:[.]?[12](?:[.]?[1234])?)?|D[.]?[123]|E|F[.]?[12345]|G|H|I(?:[.]?1)?|J(?:[.]?[12])?|K(?:[.]?1)?|P[.]?[12345]|Q|R|S[.]?[12]|T|V[.]?(?:7|9|10))\s)/i
  );
  if (m) s = s.slice(0, m.index);
  return regCleanV35(s);
}
function regLineValueV35(lines, labelRx) {
  for (const line of lines) {
    const m = line.match(labelRx);
    if (m && m[1]) return regCutNextLabelV35(m[1]);
  }
  return "";
}
function regInlineValueV35(lines, label) {
  const esc = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp("(?:^|\\s)" + esc + "\\s*[:;,. -]?\\s*(.+)$", "i");
  for (const line of lines) {
    const m = String(line).match(rx);
    if (m && m[1]) return regCutNextLabelV35(m[1]);
  }
  return "";
}
function regCanonicalMakeV35(raw = "") {
  let s = regCleanV35(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  const compact = s.replace(/[^A-Z0-9]/g, "");
  for (const make of REG_MAKES_V35) {
    const mc = make.replace(/[^A-Z0-9]/g, "");
    if (compact === mc || compact.startsWith(mc)) return make;
  }
  let best = "",
    bestSim = 0;
  for (const make of REG_MAKES_V35) {
    const mc = make.replace(/[^A-Z0-9]/g, "");
    if (compact.length < 3 || mc.length < 3) continue;
    const max = Math.max(compact.length, mc.length);
    const sim = 1 - regLevV35(compact, mc) / max;
    if (sim > bestSim) {
      bestSim = sim;
      best = make;
    }
  }
  return bestSim >= 0.7 ? best : s.split(" ")[0];
}
function regModelV35(raw = "", make = "") {
  let model = regCutNextLabelV35(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9+./ -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!model) return "";
  const makeText = String(make || "").toUpperCase();
  const makeWords = makeText.replace(/-/g, " ").split(/\s+/).filter(Boolean);
  const tokens = model.split(/\s+/);
  if (makeWords.length && tokens.length >= makeWords.length) {
    const left = tokens
      .slice(0, makeWords.length)
      .join("")
      .replace(/[^A-Z0-9]/g, "");
    const right = makeWords.join("").replace(/[^A-Z0-9]/g, "");
    const max = Math.max(left.length, right.length);
    if (left === right || (max >= 3 && 1 - regLevV35(left, right) / max >= 0.7))
      tokens.splice(0, makeWords.length);
  }
  model = tokens.join(" ").trim();
  return model;
}
function regPlateV35(raw = "") {
  const c = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  for (let i = 0; i + 6 <= c.length; i++) {
    const part = c.slice(i, i + 6),
      left = regHeadLettersV35(part.slice(0, 3)),
      right = regTailDigitsV35(part.slice(3));
    if (/^[A-Z]{3}$/.test(left) && /^\d{3}$/.test(right)) return left + right;
  }
  return "";
}
function regVinV35(raw = "") {
  const c = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  for (let i = 0; i + 17 <= c.length; i++) {
    const original = c.slice(i, i + 17);
    if ((original.match(/\d/g) || []).length < 4) continue;
    const n = ppNormalizeVin(original);
    if (n && /^[A-HJ-NPR-Z0-9]{17}$/.test(n)) return n;
  }
  return "";
}
function regSerialV35(lines = []) {
  let aIndex = lines.findIndex(x => /^\s*A\s*[:;,. -]?\s*/i.test(x));
  if (aIndex < 0) aIndex = Math.min(lines.length, 24);
  const top = lines.slice(0, Math.min(Math.max(aIndex, 7), 28));
  let best = "",
    bestScore = -1;
  top.forEach((line, index) => {
    const up = String(line || "").toUpperCase();
    const rx = /(?:^|[^A-Z0-9])([A-Z])\s*([0-9OQILSBZG](?:[\s-]*[0-9OQILSBZG]){5,6})(?=$|[^A-Z0-9])/g;
    let m;
    while ((m = rx.exec(up))) {
      const digits = regTailDigitsV35(m[2]).replace(/[^0-9]/g, "");
      if (digits.length !== 6 && digits.length !== 7) continue;
      const value = m[1] + digits;
      let score = 100 - index + (digits.length === 7 ? 4 : 2);
      if (/^\s*[A-Z]\s*[0-9OQILSBZG\s-]{6,13}\s*$/i.test(up)) score += 30;
      if (score > bestScore) {
        bestScore = score;
        best = value;
      }
    }
    for (const token of up.split(/\s+/)) {
      const compact = token.replace(/[^A-Z0-9]/g, "");
      if (compact.length !== 7 && compact.length !== 8) continue;
      if (!/^[A-Z]/.test(compact)) continue;
      const digits = regTailDigitsV35(compact.slice(1));
      if (!/^\d{6,7}$/.test(digits)) continue;
      const value = compact[0] + digits,
        score = 90 - index + (digits.length === 7 ? 4 : 2);
      if (score > bestScore) {
        bestScore = score;
        best = value;
      }
    }
  });
  return best;
}
function regYearFromBV35(lines = []) {
  let raw = regLineValueV35(lines, /^\s*B(?!\s*[.]?\s*[12]\b)\s*[:;,. -]?\s*(.+)$/i);
  if (!raw) {
    for (const line of lines) {
      const m = String(line).match(/(?:^|\s)B(?!\s*[.]?\s*[12]\b)\s*[:;,. -]?\s*((?:19|20)\d{2}[^\s]*)/i);
      if (m) {
        raw = m[1];
        break;
      }
    }
  }
  const m = String(raw || "").match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1886 && y <= new Date().getFullYear() + 1 ? y : null;
}
function regParseV35(text = "") {
  const up = ppNormalizeOcr(text),
    lines = regLinesV35(text);
  let make = "",
    model = "",
    plate = "",
    vin = "";
  const d1 =
    regLineValueV35(lines, /^\s*D\s*[.]?\s*[1I]\s*[:;,. -]?\s*(.+)$/i) || regInlineValueV35(lines, "D.1");
  if (d1) make = regCanonicalMakeV35(d1);
  if (!make) {
    const normalized = regNormTextV35(up);
    for (const known of REG_MAKES_V35) {
      if (normalized.includes(regNormTextV35(known))) {
        make = known;
        break;
      }
    }
  }
  const d3 =
    regLineValueV35(lines, /^\s*D\s*[.]?\s*3\s*[:;,. -]?\s*(.+)$/i) || regInlineValueV35(lines, "D.3");
  if (d3) model = regModelV35(d3, make);
  const a = regLineValueV35(lines, /^\s*A\s*[:;,. -]?\s*(.+)$/i) || regInlineValueV35(lines, "A");
  plate = regPlateV35(a);
  if (!plate) {
    const candidates = up.match(/[A-Z0-9]{3}\s*[A-Z0-9]{3}/g) || [];
    for (const c of candidates) {
      plate = regPlateV35(c);
      if (plate) break;
    }
  }
  let e = regLineValueV35(lines, /^\s*E\s*[:;,. -]?\s*(.+)$/i) || regInlineValueV35(lines, "E");
  if (!e) {
    for (const line of lines) {
      const m = String(line).match(/(?:^|\s)E\s*[:;,. -]?\s*([A-Z0-9][A-Z0-9\s-]{15,24})/i);
      if (m) {
        e = m[1];
        break;
      }
    }
  }
  vin = regVinV35(e);
  if (!vin) {
    const candidates = up.match(/\b[A-Z0-9]{17}\b/g) || [];
    for (const c of candidates) {
      vin = regVinV35(c);
      if (vin) break;
    }
  }
  const regDoc = regSerialV35(lines);
  const year = regYearFromBV35(lines);
  return { make, model, plate, vin, regDoc, year };
}
ppParseRegistrationText = function (text = "") {
  const d = regParseV35(text);
  return { vin: d.vin, make: d.make, model: d.model, plate: d.plate, regDoc: d.regDoc };
};
registrationYearFromTextV31 = function (text = "") {
  return regParseV35(text).year;
};
newCarExtractYearV29 = function (text = "") {
  return regParseV35(text).year;
};
window.__visureigiaiRegParseV35 = regParseV35;
const __ppDetectDocumentBoundsV36 = ppDetectDocumentBounds;
ppDetectDocumentBounds = function (source, w, h) {
  const b = __ppDetectDocumentBoundsV36(source, w, h);
  const rh = b?.h / h,
    ry = b?.y / h,
    rw = b?.w / w;
  if (!b || !Number.isFinite(rh) || rh < 0.62 || (ry > 0.2 && rh < 0.78) || rw < 0.48) {
    return { x: 0, y: 0, w, h };
  }
  return b;
};
const __regModelV35V36 = regModelV35;
regModelV35 = function (raw = "", make = "") {
  let model = __regModelV35V36(raw, make);
  const m = String(make || "")
    .toUpperCase()
    .trim();
  if (model && m && model.toUpperCase().startsWith(m) && model.length > m.length) {
    model = model
      .slice(m.length)
      .replace(/^[\s./-]+/, "")
      .trim();
  }
  return model;
};
async function regSourceV36(file) {
  try {
    return await createImageBitmap(file);
  } catch (e) {
    return await ppLoadImageElement(file);
  }
}
function regNewLayoutHintV36(source, w, h) {
  try {
    const b = __ppDetectDocumentBoundsV36(source, w, h);
    const rh = b.h / h,
      ry = b.y / h;
    return rh < 0.62 || (ry > 0.24 && rh < 0.78);
  } catch (e) {
    return false;
  }
}
function regPercentileV36(hist, total, p) {
  const target = total * p;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += hist[i];
    if (sum >= target) return i;
  }
  return 255;
}
function regDarkInkRegionV36(source, region) {
  const ow = source.width || source.naturalWidth,
    oh = source.height || source.naturalHeight;
  const sx = Math.max(0, Math.round(ow * region.x)),
    sy = Math.max(0, Math.round(oh * region.y));
  const sw = Math.max(1, Math.min(ow - sx, Math.round(ow * region.w))),
    sh = Math.max(1, Math.min(oh - sy, Math.round(oh * region.h)));
  const down = Math.min(1, 1400 / Math.max(sw, sh));
  const work = document.createElement("canvas");
  work.width = Math.max(1, Math.round(sw * down));
  work.height = Math.max(1, Math.round(sh * down));
  const wx = work.getContext("2d", { willReadFrequently: true });
  wx.imageSmoothingEnabled = true;
  wx.imageSmoothingQuality = "high";
  wx.drawImage(source, sx, sy, sw, sh, 0, 0, work.width, work.height);
  const im = wx.getImageData(0, 0, work.width, work.height),
    d = im.data,
    hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.max(0, Math.min(255, Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])));
    hist[y]++;
  }
  const total = work.width * work.height,
    p1 = regPercentileV36(hist, total, 0.01),
    p90 = regPercentileV36(hist, total, 0.9);
  const span = Math.max(18, p90 - p1),
    threshold = 80;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const normalized = Math.max(0, Math.min(255, ((y - p1) * 255) / span));
    const v = normalized < threshold ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  wx.putImageData(im, 0, 0);
  const targetW = Math.min(1900, Math.max(1050, work.width * 3));
  const scale = targetW / work.width;
  const out = document.createElement("canvas");
  out.width = Math.round(work.width * scale);
  out.height = Math.round(work.height * scale);
  const ox = out.getContext("2d");
  ox.imageSmoothingEnabled = false;
  ox.drawImage(work, 0, 0, out.width, out.height);
  return out;
}
async function regRecognizeV36(worker, T, canvas, psm, status) {
  try {
    if (worker) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: String(psm),
          preserve_interword_spaces: "1",
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./- "
        });
      } catch (e) {}
      const r = await worker.recognize(canvas);
      return r?.data?.text || "";
    }
    const r = await T.recognize(canvas, "eng", {
      logger: m => {
        if (m.status === "recognizing text")
          status(`Tikslinu dokumentą · ${Math.round((m.progress || 0) * 100)}%`);
      }
    });
    return r?.data?.text || "";
  } finally {
    if (worker) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./- "
        });
      } catch (e) {}
    }
  }
}
async function regNewCertificateFallbackV36(file, worker, T, status) {
  const source = await regSourceV36(file),
    ow = source.width || source.naturalWidth,
    oh = source.height || source.naturalHeight;
  if (!regNewLayoutHintV36(source, ow, oh)) return null;
  status("Tikslinu naujo tipo registracijos liudijimą…");
  const serial = regDarkInkRegionV36(source, { x: 0.18, y: 0.045, w: 0.5, h: 0.075 });
  const top = regDarkInkRegionV36(source, { x: 0.07, y: 0.225, w: 0.63, h: 0.085 });
  const vehicle = regDarkInkRegionV36(source, { x: 0.07, y: 0.405, w: 0.62, h: 0.175 });
  const serialText = await regRecognizeV36(worker, T, serial, 11, status);
  const topText = await regRecognizeV36(worker, T, top, 6, status);
  const vehicleText = await regRecognizeV36(worker, T, vehicle, 6, status);
  const raw = [serialText, topText, vehicleText].join("\n");
  const parsed = regParseV35(raw);
  return registrationNormalizeV31(parsed);
}
function regMergeNewCertificateV36(base = {}, targeted = {}) {
  if (!targeted) return base;
  const out = { ...base };
  for (const k of ["make", "model", "year", "plate", "regDoc"]) if (targeted[k]) out[k] = targeted[k];
  if (!out.vin && targeted.vin) out.vin = targeted.vin;
  return registrationNormalizeV31(out);
}
async function registrationScanUnifiedV36(file, statusEl = null) {
  if (!file) throw Error("Pasirink registracijos liudijimo nuotrauką.");
  if (!String(file.type || "").startsWith("image/"))
    throw Error("Automatiniam nuskaitymui pasirink registracijos liudijimo nuotrauką.");
  const status = txt => {
    if (statusEl) {
      statusEl.textContent = txt;
      statusEl.classList?.add("show");
    }
  };
  const T = await ppLoadOcr(),
    texts = [];
  const worker = await ppOcrWorker(statusEl);
  status("Skaitau registracijos liudijimą…");
  const first = await ppPreprocessSmart(file, "contrast");
  if (worker) {
    const r = await worker.recognize(first);
    texts.push(r?.data?.text || "");
  } else {
    const r = await T.recognize(first, "eng", {
      logger: m => {
        if (m.status === "recognizing text")
          status(`Skaitau dokumentą · ${Math.round((m.progress || 0) * 100)}%`);
      }
    });
    texts.push(r?.data?.text || "");
  }
  let raw = texts.join("\n"),
    parsed = ppParseRegistrationText(raw) || {};
  let data = registrationNormalizeV31({ ...parsed, year: registrationYearFromTextV31(raw) });
  if (registrationScoreV31(data) < 5) {
    status("Tikslinu VIN ir dokumento laukus…");
    const second = await ppPreprocessSmart(file, "binary");
    const r = worker ? await worker.recognize(second) : await T.recognize(second, "eng");
    texts.push(r?.data?.text || "");
    raw = texts.join("\n");
    parsed = ppParseRegistrationText(raw) || {};
    data = registrationNormalizeV31({ ...parsed, year: registrationYearFromTextV31(raw) });
  }
  try {
    const targeted = await regNewCertificateFallbackV36(file, worker, T, status);
    if (targeted) data = regMergeNewCertificateV36(data, targeted);
  } catch (e) {
    console.warn("New certificate fallback v36", e);
  }
  return data;
}
registrationCertificateScanV31 = registrationScanUnifiedV36;
window.__visureigiaiRegistrationScanV31 = registrationScanUnifiedV36;
ppScanRegistration = async function (file) {
  const st = document.getElementById("ppScanState"),
    det = document.getElementById("ppDetected");
  if (det) {
    det.classList.remove("show");
    det.textContent = "";
  }
  if (st) st.textContent = "Paruošiu registracijos liudijimą…";
  try {
    const data = await registrationScanUnifiedV36(file, st);
    ppApplyVehicleData(data);
    const found = ppOcrScore(data),
      bits = [
        data.make,
        data.model,
        data.plate,
        data.vin ? `VIN ${data.vin}` : "",
        data.regDoc ? `Liud. ${data.regDoc}` : ""
      ].filter(Boolean);
    if (st)
      st.textContent =
        found >= 4
          ? "Nuskaityta. Patikrink laukus ir generuok sutartį."
          : `Rasta ${found}/5 laukų. Trūkstamus įrašyk ranka.`;
    if (det && bits.length) {
      det.textContent = bits.join(" · ");
      det.classList.add("show");
    }
    if (found < 3) toast("Dokumentas perskaitytas silpnai — fotografuok tiesiai, be šešėlių", "⚠️");
    else toast(`Nuskaityta ${found}/5 laukų`, "✓");
  } catch (e) {
    console.warn("PP OCR v36", e);
    if (st)
      st.textContent = "Automatinis nuskaitymas nepavyko. Gali pildyti ranka arba fotografuoti dar kartą.";
    toast("OCR nepavyko — patikrink internetą ir nuotrauką", "⚠️");
  }
};
newCarScanRegistrationV29 = async function (file) {
  if (!file) return;
  const status = document.getElementById("newCarScanStateV29"),
    preview = document.getElementById("newCarScanPreviewV29"),
    img = document.getElementById("newCarScanImageV29");
  newCarRegFileV29 = file;
  if (newCarRegPreviewUrlV29) URL.revokeObjectURL(newCarRegPreviewUrlV29);
  newCarRegPreviewUrlV29 = URL.createObjectURL(file);
  if (img) img.src = newCarRegPreviewUrlV29;
  if (preview) preview.classList.add("show");
  if (status) status.textContent = "Skaitau registracijos liudijimą…";
  try {
    const data = await registrationScanUnifiedV36(file, status);
    newCarApplyRegistrationV29(data);
    const found = newCarOcrScoreV29(data);
    if (status)
      status.textContent =
        found >= 6
          ? "Nuskaityti visi pagrindiniai registracijos duomenys."
          : `Rasta ${found}/6 laukų. Trūkstamus gali įrašyti ranka.`;
    if (found < 3) toast("Dokumentas perskaitytas silpnai — fotografuok tiesiai, be šešėlių", "⚠️");
    else toast(`Registracijos liudijimas: ${found}/6 laukų`, "✓");
  } catch (e) {
    console.warn("New car OCR v36", e);
    if (status)
      status.textContent =
        "Automatinis nuskaitymas nepavyko. Gali fotografuoti dar kartą arba pildyti ranka.";
    toast("OCR nepavyko — patikrink nuotrauką ir internetą", "⚠️");
  }
};
installNewCarSmartAddV29();
