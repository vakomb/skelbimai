// PP PDF be interneto (overlay), registracijos OCR paruošimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const PP_PAGE_JPEGS = window.__AUTOEASIER_PP_PAGE_JPEGS;
function ppB64Bytes(s) {
  const b = atob(s),
    u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
function ppPdfText(s = "") {
  return ppAscii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function ppPdfMakeText(x, y, text, size = 9, font = "F1") {
  if (!text) return "";
  return `BT /${font} ${size} Tf 1 0 0 1 ${Number(x).toFixed(2)} ${Number(y).toFixed(2)} Tm (${ppPdfText(text)}) Tj ET\n`;
}
function ppPdfCharBoxes(rects, value, size = 8) {
  const ch = ppAscii(value).replace(/\s/g, "").split("");
  const yShift = -7.5;
  return rects
    .map((r, i) => {
      const c = ch[i] || "";
      if (!c) return "";
      const w = ppPdfTextWidth(c, size),
        boxH = r[3] - r[1],
        capH = size * 0.718;
      const baseline = r[1] + yShift + Math.max(1.2, (boxH - capH) / 2);
      return ppPdfMakeText((r[0] + r[2] - w) / 2, baseline, c, size);
    })
    .join("");
}
function ppPdfTextWidth(text = "", size = 9) {
  const s = ppAscii(text || "");
  let units = 0;
  for (const ch of s) {
    if (ch === " ") units += 0.278;
    else if (/[ilI.,'`!:;|]/.test(ch)) units += 0.278;
    else if (/[mwMW@]/.test(ch)) units += 0.889;
    else if (/[A-Z0-9]/.test(ch)) units += 0.667;
    else if (/[a-z]/.test(ch)) units += 0.556;
    else if (/[+\-]/.test(ch)) units += 0.584;
    else units += 0.556;
  }
  return units * size;
}
function ppPdfFitSize(text, maxWidth, preferred = 10, min = 7.5) {
  let size = preferred;
  while (size > min && ppPdfTextWidth(text, size) > maxWidth) size -= 0.2;
  return Math.max(min, Number(size.toFixed(2)));
}
function ppPdfCenteredText(x1, x2, y, text, preferred = 10, min = 7.5, font = "F1") {
  const value = String(text || "").trim();
  if (!value) return "";
  const size = ppPdfFitSize(value, Math.max(1, x2 - x1), preferred, min);
  const x = x1 + Math.max(0, (x2 - x1 - ppPdfTextWidth(value, size)) / 2);
  return ppPdfMakeText(x, y, value, size, font);
}
function ppFormatCompanyPhone(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("370") && digits.length >= 11) {
    const n = digits.slice(3, 11);
    return `+370 ${n.slice(0, 3)} ${n.slice(3)}`;
  }
  if (digits.length === 8) return `+370 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  return String(value || "").trim();
}
const PP_RECTS = {
  date: [
    [33.867, 737.5095, 46.3358, 749.9315],
    [46.5703, 737.5095, 58.7108, 749.9782],
    [59.6953, 737.5095, 70.7577, 749.9315],
    [71.6483, 737.5095, 84.0233, 749.9315]
  ],
  month: [
    [96.3046, 737.4627, 108.5858, 749.744],
    [109.3358, 737.5095, 120.7733, 749.8377]
  ],
  day: [
    [133.289, 737.6032, 145.4295, 749.8377],
    [146.1795, 737.5565, 157.7109, 749.8377]
  ],
  hour: [
    [183.164, 737.5095, 195.3515, 749.8845],
    [196.1484, 737.5095, 207.6795, 749.7907]
  ],
  minute: [
    [220.1484, 737.5565, 232.289, 749.8377],
    [233.2734, 737.5565, 244.664, 749.7907]
  ],
  sellerCode: [
    [107.6716, 690.7517, 120.2341, 702.8455],
    [121.1716, 690.7517, 133.7342, 702.8455],
    [134.953, 690.7517, 147.5155, 702.8455],
    [148.828, 690.7517, 161.3905, 702.8455],
    [162.703, 690.7517, 175.2655, 702.8455],
    [176.2967, 690.7517, 188.8592, 702.8455],
    [190.078, 690.7517, 202.6405, 702.8455],
    [203.6717, 690.7517, 216.2342, 702.8455],
    [217.453, 690.7517, 230.0155, 702.8455],
    [231.2342, 690.7517, 243.7967, 702.8455],
    [245.0155, 690.7517, 257.578, 702.8455]
  ],
  buyerCode: [
    [107.4841, 578.7205, 120.0466, 590.8142],
    [121.1716, 578.7205, 133.7342, 590.8142],
    [134.789, 578.744, 147.539, 590.8377],
    [148.664, 578.744, 161.4609, 590.8377],
    [162.539, 578.744, 175.1484, 590.8377],
    [176.1327, 578.744, 189.0234, 590.8377],
    [189.8905, 578.7205, 202.453, 590.8142],
    [203.5077, 578.744, 216.3045, 590.8377],
    [217.289, 578.744, 230.039, 590.8377],
    [231.0702, 578.744, 244.0077, 590.8377],
    [244.8515, 578.744, 257.4609, 590.8377]
  ],
  sdk: [
    [306.6795, 435.2596, 319.3828, 447.2127],
    [320.0859, 435.2596, 332.789, 447.2127],
    [333.914, 435.2596, 346.617, 447.2127],
    [347.6484, 435.2596, 360.492, 447.2127],
    [361.5234, 435.2596, 374.367, 447.2127],
    [375.3045, 435.2596, 387.9609, 447.2127],
    [388.992, 435.2596, 401.5078, 447.2127],
    [402.539, 435.2596, 414.867, 447.2127]
  ],
  plate: [
    [205.453, 392.5328, 218.1092, 404.7203],
    [219.1405, 392.5328, 231.7967, 404.7203],
    [232.828, 392.5328, 245.4842, 404.7203],
    [246.6092, 392.5328, 259.453, 404.7203],
    [260.3905, 392.5328, 273.2343, 404.7203],
    [274.3593, 392.5328, 287.203, 404.7203]
  ],
  mileage: [
    [332.578, 392.5328, 345.4218, 404.7203],
    [346.2655, 392.5328, 359.1093, 404.7203],
    [359.6718, 392.5328, 372.5155, 404.7203],
    [373.7343, 392.5328, 386.578, 404.7203],
    [387.703, 392.5328, 400.5468, 404.7203],
    [401.4843, 392.5328, 414.328, 404.7203],
    [415.1718, 392.5328, 428.0155, 404.7203]
  ],
  vin: [
    [232.5702, 369.8221, 245.5545, 382.2908],
    [246.492, 369.8221, 260.2265, 382.2908],
    [261.164, 369.8221, 273.8203, 382.2908],
    [274.7109, 369.8221, 287.8828, 382.2908],
    [288.7734, 369.8221, 302.3203, 382.2908],
    [303.2578, 369.8221, 316.242, 382.2908],
    [317.2265, 369.8221, 330.2109, 382.2908],
    [331.242, 369.8221, 344.4609, 382.2908],
    [345.3984, 369.8221, 358.5234, 382.2908],
    [359.367, 369.8221, 372.492, 382.2908],
    [373.3828, 369.8221, 386.2265, 382.2908],
    [387.117, 369.8221, 398.9765, 382.2908],
    [399.914, 369.8221, 412.3359, 382.2908],
    [413.2265, 369.8221, 427.9453, 382.2908],
    [428.9295, 369.8688, 442.8984, 382.3377],
    [443.8828, 369.8688, 457.1484, 382.3377],
    [458.1328, 369.8688, 470.414, 382.3377]
  ],
  reg: [
    [332.8828, 349.7596, 345.164, 361.4783],
    [346.1484, 349.7596, 358.9453, 361.4783],
    [359.9295, 349.7596, 372.7265, 361.4783],
    [373.7109, 349.7596, 386.6484, 361.4783],
    [387.5859, 349.7596, 400.3828, 361.4783],
    [401.3203, 349.7596, 414.117, 361.4783],
    [415.1015, 349.7596, 428.6953, 361.4783],
    [429.6328, 349.7596, 442.5703, 361.4783]
  ],
  price: [
    [176.8202, 74.3533, 189.1015, 86.0718],
    [190.2655, 74.3452, 203.0155, 86.0643],
    [203.953, 74.3452, 216.703, 86.0643],
    [217.6405, 74.3452, 230.6717, 86.0643],
    [231.703, 74.3452, 244.453, 86.0643],
    [245.3905, 74.3452, 258.1405, 86.0643],
    [259.1718, 74.3452, 271.2655, 86.0643]
  ]
};
function ppContractOverlay(role) {
  const co = ppCompany(),
    dt = ppDateParts(),
    isBuyer = role === "buyer";
  let p1 = "";
  const country = (ppValue("ppCountry") || "Lietuva").trim() || "Lietuva";
  const companyName = (co.name || PP_COMPANY.name || "").trim();
  const companyPhone = ppFormatCompanyPhone(co.phone || PP_COMPANY.phone || "");
  const companyEmail = (co.email || PP_COMPANY.email || "").trim();
  const companyAddress = (co.address || "").trim();
  const L = { country: [258, 582], left: [15, 258], right: [274, 582] };
  p1 +=
    ppPdfCharBoxes(PP_RECTS.date, dt.y, 8) +
    ppPdfCharBoxes(PP_RECTS.month, dt.m, 8) +
    ppPdfCharBoxes(PP_RECTS.day, dt.d, 8) +
    ppPdfCharBoxes(PP_RECTS.hour, dt.hh, 8) +
    ppPdfCharBoxes(PP_RECTS.minute, dt.mm, 8);
  p1 += ppPdfCenteredText(L.country[0], L.country[1], 730.9, country, 11, 9.6, "F2");
  p1 += ppPdfCharBoxes(isBuyer ? PP_RECTS.buyerCode : PP_RECTS.sellerCode, co.code, 8);
  if (isBuyer) {
    p1 += ppPdfCenteredText(L.right[0], L.right[1], 573, companyName, 10.8, 9.8, "F2");
    p1 += ppPdfCenteredText(L.left[0], L.left[1], 534.2, companyPhone, 9.8, 8.9, "F1");
    p1 += ppPdfCenteredText(L.right[0], L.right[1], 534.2, companyEmail, 9.8, 8.5, "F1");
    p1 += ppPdfCenteredText(L.left[0], L.right[1], 504.2, companyAddress, 8.6, 7.5, "F1");
  } else {
    p1 += ppPdfCenteredText(L.right[0], L.right[1], 685, companyName, 10.8, 9.8, "F2");
    p1 += ppPdfCenteredText(L.left[0], L.left[1], 645.2, companyPhone, 9.8, 8.9, "F1");
    p1 += ppPdfCenteredText(L.right[0], L.right[1], 645.2, companyEmail, 9.8, 8.5, "F1");
    p1 += ppPdfCenteredText(L.left[0], L.right[1], 616.2, companyAddress, 8.6, 7.5, "F1");
  }
  const vehicleName = [ppValue("ppMake"), ppValue("ppModel")].filter(Boolean).join(" ");
  p1 += ppPdfCharBoxes(PP_RECTS.sdk, ppValue("ppSdk"), 8);
  p1 += ppPdfCenteredText(324, 582, 408.8, vehicleName, 9.4, 8, "F1");
  p1 += ppPdfCharBoxes(PP_RECTS.plate, ppValue("ppPlate"), 8);
  p1 += ppPdfCharBoxes(PP_RECTS.mileage, ppValue("ppMileage"), 8);
  p1 += ppPdfCharBoxes(PP_RECTS.vin, ppValue("ppVin"), 7.7);
  p1 += ppPdfCharBoxes(PP_RECTS.reg, ppValue("ppRegDoc"), 8);
  if (ppValue("ppTa") === "valid") p1 += ppPdfMakeText(404.2, 319.8, "X", 9, "F2");
  if (ppValue("ppTa") === "invalid") p1 += ppPdfMakeText(465.2, 319.8, "X", 9, "F2");
  const pr = ppValue("ppPrice").replace(/[^0-9]/g, "");
  p1 +=
    ppPdfCharBoxes(PP_RECTS.price, pr, 8) +
    ppPdfCenteredText(34, 582, 47.5, ppMoneyWords(pr), 8.5, 7.5, "F1");
  let p2 = "";
  if (ppValue("ppPayment") === "cash") p2 += ppPdfMakeText(39.1, 789.8, "X", 9, "F1");
  else p2 += ppPdfMakeText(211.1, 789.8, "X", 9, "F1");
  p2 += ppPdfMakeText(39.1, 755.8, "X", 9, "F1");
  if (role === "seller" && ppValue("ppInsuranceTransfer") === "yes")
    p2 += ppPdfMakeText(39.1, 712.8, "X", 9, "F1");
  const rep = `${co.representative}, direktorius - ${co.name}`;
  p2 += ppPdfCenteredText(190, 582, isBuyer ? 481.5 : 521.5, rep, 8.6, 7.6, "F1");
  return [p1, p2, ""];
}
function ppBuildPdfOffline(overlays) {
  const enc = new TextEncoder();
  const parts = [];
  let length = 0;
  const offsets = [0];
  const push = v => {
    const u = typeof v === "string" ? enc.encode(v) : v;
    parts.push(u);
    length += u.length;
  };
  push("%PDF-1.4\n%1234\n");
  const objs = [];
  let objN = 0;
  const add = body => {
    objs.push(body);
    return ++objN;
  };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("");
  const pageIds = [],
    imageIds = [],
    contentIds = [];
  for (let i = 0; i < 3; i++) {
    pageIds.push(add(""));
    imageIds.push(add(null));
    contentIds.push(add(null));
  }
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontBoldId = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  );
  objs[1] = `<< /Type /Pages /Kids [${pageIds.map(x => x + " 0 R").join(" ")}] /Count 3 >>`;
  for (let i = 0; i < 3; i++) {
    const img = ppB64Bytes(PP_PAGE_JPEGS[i]);
    const content = `q 595.5 0 0 842.25 0 0 cm /Im${i + 1} Do Q\n${overlays[i] || ""}`;
    const cb = enc.encode(content);
    objs[pageIds[i] - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.5 842.25] /Resources << /XObject << /Im${i + 1} ${imageIds[i]} 0 R >> /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
    objs[imageIds[i] - 1] = {
      dict: `<< /Type /XObject /Subtype /Image /Width 1324 /Height 1872 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>`,
      data: img
    };
    objs[contentIds[i] - 1] = { dict: `<< /Length ${cb.length} >>`, data: cb };
  }
  for (let i = 0; i < objs.length; i++) {
    offsets[i + 1] = length;
    push(`${i + 1} 0 obj\n`);
    const o = objs[i];
    if (o && typeof o === "object" && o.data) {
      push(o.dict + "\nstream\n");
      push(o.data);
      push("\nendstream\nendobj\n");
    } else {
      push(String(o) + "\nendobj\n");
    }
  }
  const xref = length;
  push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= objs.length; i++) push(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  push(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const u of parts) {
    out.set(u, at);
    at += u.length;
  }
  return out;
}
ppGenerate = async function () {
  const btn = document.getElementById("ppGenerateBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generuojama…";
  }
  try {
    const bytes = ppBuildPdfOffline(ppContractOverlay(ppRole));
    ppGeneratedBlob = new Blob([bytes], { type: "application/pdf" });
    if (ppGeneratedUrl) URL.revokeObjectURL(ppGeneratedUrl);
    ppGeneratedUrl = URL.createObjectURL(ppGeneratedBlob);
    document.getElementById("ppResult")?.classList.add("show");
    const meta = document.getElementById("ppResultMeta");
    if (meta)
      meta.textContent = `${[ppValue("ppMake"), ppValue("ppModel")].filter(Boolean).join(" ") || "Automobilis"} · ${ppRole === "buyer" ? `${profileDisplayNameV57() || "Mes"} perka` : `${profileDisplayNameV57() || "Mes"} parduoda`}`;
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
};
let ppOcrWorkerPromiseFinal = null;
function ppNormalizeOcr(text = "") {
  return String(text)
    .normalize("NFKC")
    .replace(/\r/g, "")
    .replace(/[|]/g, "I")
    .replace(/[‐‑–—]/g, "-")
    .toUpperCase();
}
function ppLineValue(lines, label) {
  const rx = new RegExp("^\\s*" + label + "\\s*[:;,.\\-]?\\s*(.+)$", "i");
  for (const line of lines) {
    const m = line.match(rx);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}
function ppCleanField(v = "") {
  return String(v)
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:;,.\-]+|[\s:;,.\-]+$/g, "")
    .trim();
}
function ppNormalizeVin(v = "") {
  let s = String(v)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  s = s.replace(/[OQ]/g, "0").replace(/I/g, "1");
  return s.length === 17 ? s : "";
}
ppParseRegistrationText = function (text = "") {
  const up = ppNormalizeOcr(text);
  const lines = up
    .split("\n")
    .map(x => x.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const joined = "\n" + lines.join("\n") + "\n";
  let make = "",
    model = "",
    plate = "",
    vin = "",
    regDoc = "";
  const makeRaw = ppLineValue(lines, "D\\s*[.]?\\s*1");
  if (makeRaw)
    make = ppCleanField(makeRaw)
      .split(/\s+(?=[A-Z][.]?\d|E\s|A\s)/)[0]
      .replace(/[^A-Z0-9\- ]/g, "")
      .trim();
  const modelRaw = ppLineValue(lines, "D\\s*[.]?\\s*3");
  if (modelRaw)
    model = ppCleanField(modelRaw)
      .split(/\s+(?=[A-Z][.]?\d|E\s|A\s)/)[0]
      .replace(/[^A-Z0-9\- /]/g, "")
      .trim();
  const aRaw = ppLineValue(lines, "A");
  if (aRaw) {
    const c = aRaw.replace(/[^A-Z0-9]/g, "");
    const m = c.match(/[A-Z]{2,3}[0-9]{3,4}/);
    if (m) plate = m[0];
  }
  if (!plate) {
    const m = up.match(/\b[A-Z]{3}\s*[0-9]{3}\b/);
    if (m) plate = m[0].replace(/\s/g, "");
  }
  const eRaw = ppLineValue(lines, "E");
  if (eRaw) {
    const candidates = eRaw.match(/[A-Z0-9]{15,19}/g) || [];
    for (const c of candidates) {
      const n = ppNormalizeVin(c);
      if (n) {
        vin = n;
        break;
      }
    }
  }
  if (!vin) {
    const candidates = up.match(/\b[A-Z0-9]{17}\b/g) || [];
    for (const c of candidates) {
      const n = ppNormalizeVin(c);
      if (n) {
        vin = n;
        break;
      }
    }
  }
  const topLines = lines.slice(0, 18);
  for (const line of topLines) {
    const m = line.match(/^\s*([A-Z])\s*[- ]?\s*([0-9]{5,7})\s*$/);
    if (m && !["A", "B", "E", "F", "G", "H", "I", "K", "P", "Q", "R", "S", "T", "V"].includes(m[1])) {
      regDoc = m[1] + m[2];
      break;
    }
  }
  if (!regDoc) {
    for (const line of topLines) {
      const m = line.match(/^\s*([A-Z])\s+([0-9]{6})\s*$/);
      if (m) {
        regDoc = m[1] + m[2];
        break;
      }
    }
  }
  if (!regDoc) {
    const m = joined.match(/\n\s*([A-Z])\s+([0-9]{6})\s*\n/);
    if (m) regDoc = m[1] + m[2];
  }
  if (!make) {
    const known = [
      "LAND ROVER",
      "MERCEDES-BENZ",
      "VOLKSWAGEN",
      "MITSUBISHI",
      "SUZUKI",
      "SUBARU",
      "TOYOTA",
      "NISSAN",
      "HONDA",
      "HYUNDAI",
      "PEUGEOT",
      "PORSCHE",
      "VOLVO",
      "LEXUS",
      "JEEP",
      "BMW",
      "AUDI",
      "KIA",
      "FORD",
      "MAZDA"
    ];
    make = known.find(x => up.includes(x)) || "";
  }
  if (make && model) {
    model = model.replace(new RegExp("^" + make.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") + "\\s+"), "").trim();
  }
  return { vin, make, model, plate, regDoc };
};
async function ppLoadImageElement(file) {
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Nepavyko atidaryti nuotraukos"));
    };
    img.src = url;
  });
}
function ppDetectDocumentBounds(source, w, h) {
  const sw = Math.min(420, w),
    sh = Math.max(1, Math.round(h * (sw / w))),
    c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(source, 0, 0, sw, sh);
  const d = x.getImageData(0, 0, sw, sh).data;
  let minX = sw,
    minY = sh,
    maxX = 0,
    maxY = 0,
    n = 0;
  for (let yy = 0; yy < sh; yy += 2)
    for (let xx = 0; xx < sw; xx += 2) {
      const i = (yy * sw + xx) * 4,
        r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      if (g > 58 && g > b * 1.18 && r > b * 1.08) {
        minX = Math.min(minX, xx);
        maxX = Math.max(maxX, xx);
        minY = Math.min(minY, yy);
        maxY = Math.max(maxY, yy);
        n++;
      }
    }
  if (n < sw * sh * 0.035 || maxX <= minX || maxY <= minY) return { x: 0, y: 0, w, h };
  const padX = (maxX - minX) * 0.035,
    padY = (maxY - minY) * 0.025;
  return {
    x: Math.max(0, ((minX - padX) * w) / sw),
    y: Math.max(0, ((minY - padY) * h) / sh),
    w: Math.min(w, ((maxX - minX + 2 * padX) * w) / sw),
    h: Math.min(h, ((maxY - minY + 2 * padY) * h) / sh)
  };
}
async function ppPreprocessSmart(file, mode = "contrast") {
  let source,
    bitmap = false;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
    bitmap = !!source?.close;
  } catch (e) {
    source = await ppLoadImageElement(file);
  }
  try {
    const ow = source.width || source.naturalWidth,
      oh = source.height || source.naturalHeight;
    if (!ow || !oh) throw Error("Nepavyko nustatyti nuotraukos dydžio.");
    const b = ppDetectDocumentBounds(source, ow, oh),
      target = mode === "fast" ? 1800 : 2400,
      scale = Math.min(3, target / Math.max(b.w, b.h));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(b.w * scale));
    c.height = Math.max(1, Math.round(b.h * scale));
    const x = c.getContext("2d", { willReadFrequently: true });
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.drawImage(source, b.x, b.y, b.w, b.h, 0, 0, c.width, c.height);
    if (mode !== "color") {
      const im = x.getImageData(0, 0, c.width, c.height),
        d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        let y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        y = (y - 122) * 2.05 + 136;
        if (mode === "binary") y = y > 145 ? 255 : 0;
        y = Math.max(0, Math.min(255, y));
        d[i] = d[i + 1] = d[i + 2] = y;
      }
      x.putImageData(im, 0, 0);
    }
    return c;
  } finally {
    if (bitmap)
      try {
        source.close();
      } catch (e) {}
  }
}
ppLoadOcr = function () {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (ppOcrPromise) return ppOcrPromise;
  const urls = [
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
    "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js"
  ];
  ppOcrPromise = (async () => {
    let err;
    for (const u of urls) {
      try {
        return await ppLoadScript(u, "Tesseract", 1e4);
      } catch (e) {
        err = e;
      }
    }
    throw Error(
      "Nepavyko įkelti OCR modulio iš atsarginių serverių. Patikrink interneto ryšį ir bandyk dar kartą. " +
        (err?.message || "")
    );
  })();
  ppOcrPromise = ppOcrPromise.catch(e => {
    ppOcrPromise = null;
    throw e;
  });
  return ppOcrPromise;
};
async function ppOcrWorker(statusEl) {
  if (ppOcrWorkerPromiseFinal) return ppOcrWorkerPromiseFinal;
  ppOcrWorkerPromiseFinal = (async () => {
    const T = await ppLoadOcr();
    if (!T.createWorker) return null;
    const worker = await T.createWorker("eng", 1, {
      logger: m => {
        if (statusEl && m.status === "recognizing text")
          statusEl.textContent = `Skaitau dokumentą · ${Math.round((m.progress || 0) * 100)}%`;
      }
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
}
function ppOcrScore(d) {
  return ["vin", "make", "model", "plate", "regDoc"].reduce((n, k) => n + (d[k] ? 1 : 0), 0);
}
ppScanRegistration = async function (file) {
  const st = document.getElementById("ppScanState"),
    det = document.getElementById("ppDetected");
  if (det) {
    det.classList.remove("show");
    det.textContent = "";
  }
  if (st) st.textContent = "Paruošiu registracijos dokumentą…";
  try {
    const T = await ppLoadOcr();
    const first = await ppPreprocessSmart(file, "contrast");
    let texts = [];
    const worker = await ppOcrWorker(st);
    if (worker) {
      const r = await worker.recognize(first);
      texts.push(r?.data?.text || "");
    } else {
      const r = await T.recognize(first, "eng", {
        logger: m => {
          if (st && m.status === "recognizing text")
            st.textContent = `Skaitau dokumentą · ${Math.round((m.progress || 0) * 100)}%`;
        }
      });
      texts.push(r?.data?.text || "");
    }
    let data = ppParseRegistrationText(texts.join("\n"));
    if (ppOcrScore(data) < 4) {
      if (st) st.textContent = "Tikslinu VIN ir dokumento laukus…";
      const second = await ppPreprocessSmart(file, "binary");
      const r = worker ? await worker.recognize(second) : await T.recognize(second, "eng");
      texts.push(r?.data?.text || "");
      data = ppParseRegistrationText(texts.join("\n"));
    }
    ppApplyVehicleData(data);
    const found = ppOcrScore(data);
    const bits = [
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
    if (found < 3) toast("Dokumentas perskaitytas silpnai — nufotografuok tiesiai, be šešėlių", "⚠️");
    else toast(`Nuskaityta ${found}/5 laukų`, "✓");
  } catch (e) {
    console.warn(e);
    if (st)
      st.textContent = "Automatinis nuskaitymas nepavyko. Gali pildyti ranka arba fotografuoti dar kartą.";
    toast("OCR nepavyko — patikrink internetą ir nuotrauką", "⚠️");
  }
};
const __ppGeneratorHtmlFinal = ppGeneratorHtml;
ppGeneratorHtml = function () {
  const html = __ppGeneratorHtmlFinal();
  return html
    .replace(
      '<div class="ppScanPreview" id="ppScanPreview">',
      '<div class="ppScanPreview" id="ppScanPreview">'
    )
    .replace(
      '<div class="ppScanState" id="ppScanState"></div>',
      '<div class="ppScanState" id="ppScanState"></div><div class="ppDetected" id="ppDetected"></div>'
    );
};
