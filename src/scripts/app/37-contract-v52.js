// Pirkimo–pardavimo sutarties generatorius (v52/v53): pildo oficialią Regitros sutarties formą.
// Šaltiniai: esamas automobilis, nuskenuotas / įkeltas registracijos liudijimas arba ranka įvesti duomenys.
// PDF kuriamas pačiame telefone: puslapiai piešiami ant canvas (palaiko lietuviškas raides) ir sudedami
// į PDF be jokių išorinių bibliotekų ar interneto.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

// ---------- Suma žodžiais (lietuviškai) ----------
function ctWordsV52(n) {
  const ones = ["", "vienas", "du", "trys", "keturi", "penki", "šeši", "septyni", "aštuoni", "devyni"];
  const teens = [
    "dešimt",
    "vienuolika",
    "dvylika",
    "trylika",
    "keturiolika",
    "penkiolika",
    "šešiolika",
    "septyniolika",
    "aštuoniolika",
    "devyniolika"
  ];
  const tens = [
    "",
    "",
    "dvidešimt",
    "trisdešimt",
    "keturiasdešimt",
    "penkiasdešimt",
    "šešiasdešimt",
    "septyniasdešimt",
    "aštuoniasdešimt",
    "devyniasdešimt"
  ];
  const form = (x, [one, few, many]) => {
    const l2 = x % 100,
      l1 = x % 10;
    return l2 >= 11 && l2 <= 19 ? many : l1 === 1 ? one : l1 === 0 ? many : few;
  };
  const under1000 = x => {
    const out = [],
      h = Math.floor(x / 100),
      r = x % 100;
    if (h) out.push(h === 1 ? "šimtas" : ones[h] + " šimtai");
    if (r >= 10 && r < 20) out.push(teens[r - 10]);
    else {
      if (r >= 20) out.push(tens[Math.floor(r / 10)]);
      if (r % 10) out.push(ones[r % 10]);
    }
    return out.join(" ");
  };
  if (!n) return "nulis";
  const parts = [],
    mil = Math.floor(n / 1e6),
    th = Math.floor((n % 1e6) / 1000),
    rest = n % 1000;
  if (mil) parts.push(under1000(mil) + " " + form(mil, ["milijonas", "milijonai", "milijonų"]));
  if (th) parts.push(under1000(th) + " " + form(th, ["tūkstantis", "tūkstančiai", "tūkstančių"]));
  if (rest) parts.push(under1000(rest));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
function ctMoneyWordsV52(amount) {
  const cents = Math.round(Number(amount || 0) * 100),
    eur = Math.floor(cents / 100),
    ct = cents % 100;
  const unit = (() => {
    const l2 = eur % 100,
      l1 = eur % 10;
    return l2 >= 11 && l2 <= 19 ? "eurų" : l1 === 1 ? "euras" : l1 === 0 ? "eurų" : "eurai";
  })();
  return `${ctWordsV52(eur)} ${unit} ${String(ct).padStart(2, "0")} ct`;
}
function ctMoneyV52(amount) {
  return (
    Number(amount || 0).toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
  );
}

// ---------- PDF iš JPEG puslapių (be bibliotekų) ----------
async function ctPdfFromCanvasesV52(canvases) {
  const enc = new TextEncoder(),
    chunks = [],
    offsets = [];
  let length = 0;
  const push = part => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (id, body) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push("\nendobj\n");
  };
  const W = 595.28,
    H = 841.89;
  const jpgs = [];
  for (const c of canvases) {
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
    jpgs.push(new Uint8Array(await blob.arrayBuffer()));
  }
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const pageIds = canvases.map((_, i) => 3 + i * 3);
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () =>
    push(`<< /Type /Pages /Kids [${pageIds.map(id => id + " 0 R").join(" ")}] /Count ${canvases.length} >>`)
  );
  canvases.forEach((c, i) => {
    const pid = pageIds[i],
      img = pid + 1,
      content = pid + 2;
    obj(pid, () =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`
      )
    );
    obj(img, () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgs[i].length} >>\nstream\n`
      );
      push(jpgs[i]);
      push("\nendstream");
    });
    const draw = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(content, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  });
  const xref = length,
    count = 3 + canvases.length * 3;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}

// ---------- Sutarties puslapių piešimas ----------

// ---------- Oficiali Regitros sutarties forma ----------
// Fonas – originalios formos puslapiai (src/public/assets/pp/*.jpg, 200 DPI), reikšmės piešiamos į formos langelius.
// Langelių koordinatės paimtos iš originalaus PDF formos laukų: [puslapis, x0, y0, x1, y1] taškais (pt), y – nuo viršaus.
const CT_FORM_V53 = {
  dateY: [
    [0, 33.9, 92.3, 46.3, 104.7],
    [0, 46.6, 92.3, 58.7, 104.7],
    [0, 59.7, 92.3, 70.8, 104.7],
    [0, 71.6, 92.3, 84.0, 104.7]
  ],
  dateM: [
    [0, 96.3, 92.5, 108.6, 104.8],
    [0, 109.3, 92.4, 120.8, 104.7]
  ],
  dateD: [
    [0, 133.3, 92.4, 145.4, 104.6],
    [0, 146.2, 92.4, 157.7, 104.7]
  ],
  timeH: [
    [0, 183.2, 92.4, 195.4, 104.7],
    [0, 196.1, 92.5, 207.7, 104.7]
  ],
  timeM: [
    [0, 220.1, 92.4, 232.3, 104.7],
    [0, 233.3, 92.5, 244.7, 104.7]
  ],
  country: [0, 258.4, 91.7, 552.6, 105.0],
  sCode: [
    [0, 107.7, 139.4, 120.2, 151.5],
    [0, 121.2, 139.4, 133.7, 151.5],
    [0, 135.0, 139.4, 147.5, 151.5],
    [0, 148.8, 139.4, 161.4, 151.5],
    [0, 162.7, 139.4, 175.3, 151.5],
    [0, 176.3, 139.4, 188.9, 151.5],
    [0, 190.1, 139.4, 202.6, 151.5],
    [0, 203.7, 139.4, 216.2, 151.5],
    [0, 217.5, 139.4, 230.0, 151.5],
    [0, 231.2, 139.4, 243.8, 151.5],
    [0, 245.0, 139.4, 257.6, 151.5]
  ],
  sName: [0, 273.9, 138.8, 552.3, 152.1],
  sPhone: [0, 33.1, 178.1, 257.7, 191.4],
  sEmail: [0, 273.9, 178.4, 552.3, 191.7],
  sAddr: [0, 33.6, 206.9, 552.6, 220.4],
  bCode: [
    [0, 107.5, 251.4, 120.0, 263.5],
    [0, 121.2, 251.4, 133.7, 263.5],
    [0, 134.8, 251.4, 147.5, 263.5],
    [0, 148.7, 251.4, 161.5, 263.5],
    [0, 162.5, 251.4, 175.1, 263.5],
    [0, 176.1, 251.4, 189.0, 263.5],
    [0, 189.9, 251.4, 202.5, 263.5],
    [0, 203.5, 251.4, 216.3, 263.5],
    [0, 217.3, 251.4, 230.0, 263.5],
    [0, 231.1, 251.4, 244.0, 263.5],
    [0, 244.9, 251.4, 257.5, 263.5]
  ],
  bName: [0, 273.9, 250.4, 552.3, 263.7],
  bPhone: [0, 33.1, 289.8, 257.7, 303.1],
  bEmail: [0, 273.9, 289.8, 552.3, 303.0],
  bAddr: [0, 33.6, 319.3, 552.6, 332.8],
  sdk: [
    [0, 306.7, 395.0, 319.4, 407.0],
    [0, 320.1, 395.0, 332.8, 407.0],
    [0, 333.9, 395.0, 346.6, 407.0],
    [0, 347.6, 395.0, 360.5, 407.0],
    [0, 361.5, 395.0, 374.4, 407.0],
    [0, 375.3, 395.0, 388.0, 407.0],
    [0, 389.0, 395.0, 401.5, 407.0],
    [0, 402.5, 395.0, 414.9, 407.0]
  ],
  makeModel: [0, 306.5, 416.1, 550.8, 428.1],
  plate: [
    [0, 205.5, 437.5, 218.1, 449.7],
    [0, 219.1, 437.5, 231.8, 449.7],
    [0, 232.8, 437.5, 245.5, 449.7],
    [0, 246.6, 437.5, 259.5, 449.7],
    [0, 260.4, 437.5, 273.2, 449.7],
    [0, 274.4, 437.5, 287.2, 449.7]
  ],
  mileage: [
    [0, 332.6, 437.5, 345.4, 449.7],
    [0, 346.3, 437.5, 359.1, 449.7],
    [0, 359.7, 437.5, 372.5, 449.7],
    [0, 373.7, 437.5, 386.6, 449.7],
    [0, 387.7, 437.5, 400.5, 449.7],
    [0, 401.5, 437.5, 414.3, 449.7],
    [0, 415.2, 437.5, 428.0, 449.7]
  ],
  vin: [
    [0, 232.6, 460.0, 245.6, 472.4],
    [0, 246.5, 460.0, 260.2, 472.4],
    [0, 261.2, 460.0, 273.8, 472.4],
    [0, 274.7, 460.0, 287.9, 472.4],
    [0, 288.8, 460.0, 302.3, 472.4],
    [0, 303.3, 460.0, 316.2, 472.4],
    [0, 317.2, 460.0, 330.2, 472.4],
    [0, 331.2, 460.0, 344.5, 472.4],
    [0, 345.4, 460.0, 358.5, 472.4],
    [0, 359.4, 460.0, 372.5, 472.4],
    [0, 373.4, 460.0, 386.2, 472.4],
    [0, 387.1, 460.0, 399.0, 472.4],
    [0, 399.9, 460.0, 412.3, 472.4],
    [0, 413.2, 460.0, 427.9, 472.4],
    [0, 428.9, 459.9, 442.9, 472.4],
    [0, 443.9, 459.9, 457.1, 472.4],
    [0, 458.1, 459.9, 470.4, 472.4]
  ],
  regDoc: [
    [0, 332.9, 480.8, 345.2, 492.5],
    [0, 346.1, 480.8, 358.9, 492.5],
    [0, 359.9, 480.8, 372.7, 492.5],
    [0, 373.7, 480.8, 386.6, 492.5],
    [0, 387.6, 480.8, 400.4, 492.5],
    [0, 401.3, 480.8, 414.1, 492.5],
    [0, 415.1, 480.8, 428.7, 492.5],
    [0, 429.6, 480.8, 442.6, 492.5]
  ],
  taValid: [0, 400.1, 502.8, 412.4, 514.9],
  taInvalid: [0, 460.9, 502.8, 473.2, 514.9],
  defBrakes: [0, 35.5, 595.4, 47.7, 607.4],
  defSteering: [0, 35.5, 614.6, 47.7, 626.6],
  defLights: [0, 35.5, 633.8, 47.7, 645.9],
  defSafety: [0, 284.0, 595.4, 296.3, 607.5],
  defExhaust: [0, 284.1, 614.6, 296.4, 626.7],
  events1: [0, 194.2, 675.5, 551.8, 687.5],
  events2: [0, 33.2, 698.4, 551.2, 710.4],
  price: [
    [0, 176.8, 756.2, 189.1, 767.9],
    [0, 190.3, 756.2, 203.0, 767.9],
    [0, 204.0, 756.2, 216.7, 767.9],
    [0, 217.6, 756.2, 230.7, 767.9],
    [0, 231.7, 756.2, 244.5, 767.9],
    [0, 245.4, 756.2, 258.1, 767.9],
    [0, 259.2, 756.2, 271.3, 767.9]
  ],
  priceWords: [0, 33.2, 777.7, 551.2, 789.7],
  payCash: [1, 35.6, 38.2, 47.8, 50.2],
  payBank: [1, 207.1, 38.2, 219.3, 50.2],
  whenNow: [1, 35.6, 71.8, 47.8, 83.8],
  whenOther: [1, 207.3, 71.8, 219.5, 83.8],
  whenOtherText: [1, 328.3, 65.5, 552.9, 82.4],
  insurance: [1, 35.6, 114.9, 47.8, 126.9],
  extra1: [1, 328.3, 154.0, 552.9, 171.2],
  extra2: [1, 32.8, 172.7, 552.6, 188.5],
  sSign: [1, 176.4, 305.5, 552.6, 321.2],
  bSign: [1, 176.4, 345.6, 552.6, 361.4]
};
const CT_PAGES_V53 = [
  "./assets/pp/regitra-pp-1.jpg",
  "./assets/pp/regitra-pp-2.jpg",
  "./assets/pp/regitra-pp-3.jpg"
];
const CT_PAGE_PT_V53 = { w: 595.5, h: 842.25 };
const CT_YOFF_V53 = 7.83;
// Išbraukiami žodžiai („buvo/nebuvo apgadinta“, „žinomi/nežinomi“).
const CT_STRIKE_V53 = {
  damagedYes: [0, 84.0, 106.4, 550.2],
  damagedNo: [0, 111.4, 144.7, 550.2],
  knownYes: [0, 105.2, 134.6, 561.4],
  knownNo: [0, 139.6, 179.9, 561.4]
};
const CT_FONT_V52 = '"Helvetica Neue", Helvetica, Arial, "Segoe UI", Roboto, sans-serif';
let ctBgPromiseV53 = null;
function ctLoadBackgroundsV53() {
  if (ctBgPromiseV53) return ctBgPromiseV53;
  ctBgPromiseV53 = Promise.all(
    CT_PAGES_V53.map(
      src =>
        new Promise((ok, bad) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.onerror = () =>
            bad(new Error("Nepavyko įkelti sutarties formos. Patikrinkite interneto ryšį."));
          img.src = src;
        })
    )
  ).catch(e => {
    ctBgPromiseV53 = null;
    throw e;
  });
  return ctBgPromiseV53;
}
async function ctRenderPagesV52(d) {
  const bgs = await ctLoadBackgroundsV53();
  const pages = bgs.map(img => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    return c;
  });
  const S = pages[0].width / CT_PAGE_PT_V53.w; // px / pt
  const ink = "#0b1f4d";
  const ctxOf = r => pages[r[0]].getContext("2d");
  const setFont = (x, pt, w = 600) => (x.font = `${w} ${pt * S}px ${CT_FONT_V52}`);
  // Laisvas tekstas lauke: kairėje, vertikaliai centre, mažinamas kol telpa.
  const textIn = (r, value, { pt = 9.5, w = 600, align = "left" } = {}) => {
    const s = String(value ?? "").trim();
    if (!r || !s) return;
    const x = ctxOf(r),
      width = (r[3] - r[1] - 4) * S;
    let size = pt;
    setFont(x, size, w);
    while (x.measureText(s).width > width && size > 5.5) setFont(x, (size -= 0.25), w);
    x.fillStyle = ink;
    x.textBaseline = "middle";
    x.textAlign = align;
    const tx = align === "center" ? ((r[1] + r[3]) / 2) * S : (r[1] + 2) * S;
    x.fillText(s, tx, ((r[2] + r[4]) / 2 + 0.4) * S);
  };
  // Po vieną simbolį į langelius.
  const cells = (list, value, { align = "left" } = {}) => {
    const chars = [...String(value ?? "").replace(/\s+/g, "")];
    if (!chars.length || !list) return;
    const start = align === "right" ? Math.max(0, list.length - chars.length) : 0;
    chars.slice(0, list.length).forEach((ch, i) => {
      const r = list[start + i];
      const x = ctxOf(r);
      setFont(x, 10, 700);
      x.fillStyle = ink;
      x.textBaseline = "middle";
      x.textAlign = "center";
      x.fillText(ch, ((r[1] + r[3]) / 2) * S, ((r[2] + r[4]) / 2 + 0.5) * S);
    });
  };
  const tick = r => {
    if (!r) return;
    const x = ctxOf(r),
      w = r[3] - r[1],
      h = r[4] - r[2];
    x.strokeStyle = ink;
    x.lineWidth = 1.6 * S;
    x.lineCap = "round";
    x.lineJoin = "round";
    x.beginPath();
    x.moveTo((r[1] + w * 0.2) * S, (r[2] + h * 0.55) * S);
    x.lineTo((r[1] + w * 0.42) * S, (r[2] + h * 0.78) * S);
    x.lineTo((r[1] + w * 0.82) * S, (r[2] + h * 0.22) * S);
    x.stroke();
  };
  const strike = s => {
    if (!s) return;
    const x = pages[s[0]].getContext("2d");
    x.strokeStyle = ink;
    x.lineWidth = 1.1 * S;
    x.beginPath();
    x.moveTo((s[1] - 0.5) * S, (s[3] + CT_YOFF_V53) * S);
    x.lineTo((s[2] + 0.5) * S, (s[3] + CT_YOFF_V53) * S);
    x.stroke();
  };
  // Originalaus PDF CropBox prasideda nuo y = −7,83 pt, todėl laukų koordinates pastumiame žemyn.
  const Y = CT_YOFF_V53;
  const shift = r => [r[0], r[1], r[2] + Y, r[3], r[4] + Y];
  const F = Object.fromEntries(
    Object.entries(CT_FORM_V53).map(([k, v]) => [k, Array.isArray(v[0]) ? v.map(shift) : shift(v)])
  );
  const [y, m, day] = String(d.date || "").split("-");
  const [hh, mm] = String(d.time || "").split(":");
  cells(F.dateY, y);
  cells(F.dateM, m);
  cells(F.dateD, day);
  cells(F.timeH, hh);
  cells(F.timeM, mm);
  textIn(F.country, d.country || "Lietuva");
  const party = (p, k) => {
    cells(F[k + "Code"], p.code);
    textIn(F[k + "Name"], p.type === "company" && p.rep ? `${p.name}, atst. ${p.rep}` : p.name);
    textIn(F[k + "Phone"], p.phone);
    textIn(F[k + "Email"], p.email);
    textIn(F[k + "Addr"], p.address);
  };
  party(d.seller, "s");
  party(d.buyer, "b");
  cells(F.sdk, d.sdk);
  textIn(F.makeModel, [d.make, d.model].filter(Boolean).join(" ").toUpperCase(), { pt: 10, w: 700 });
  cells(F.plate, d.plate);
  cells(F.mileage, d.mileage ? String(Math.round(Number(d.mileage))) : "", { align: "right" });
  cells(F.vin, d.vin);
  cells(F.regDoc, d.regDoc);
  if (d.ta === "valid") tick(F.taValid);
  if (d.ta === "invalid") tick(F.taInvalid);
  if (d.damaged === "no") strike(CT_STRIKE_V53.damagedYes);
  if (d.damaged === "yes") strike(CT_STRIKE_V53.damagedNo);
  if (d.eventsKnown === "no") strike(CT_STRIKE_V53.knownYes);
  if (d.eventsKnown === "yes") strike(CT_STRIKE_V53.knownNo);
  for (const k of d.defects || []) tick(F["def" + k]);
  const ev = ctSplitLinesV53(d.events, [F.events1, F.events2], 9);
  ev.forEach(([r, s]) => textIn(r, s, { pt: 9, w: 500 }));
  cells(F.price, String(Math.round(Number(d.price) || 0)), { align: "right" });
  textIn(F.priceWords, ctMoneyWordsV52(d.price), { pt: 10, w: 600 });
  // Atsiskaitymo būdas / momentas, draudimas, įvykiai ir trūkumai žymimi tik jei nurodyti (kitu atveju – ranka).
  if (d.payment === "cash") tick(F.payCash);
  if (d.payment === "bank") tick(F.payBank);
  if (d.payWhen === "now") tick(F.whenNow);
  if (d.payWhen === "other") {
    tick(F.whenOther);
    textIn(F.whenOtherText, d.payWhenText, { pt: 9 });
  }
  if (d.insurance) tick(F.insurance);
  ctSplitLinesV53(d.terms, [F.extra1, F.extra2], 9).forEach(([r, s]) => textIn(r, s, { pt: 9, w: 500 }));
  const signName = p => (p.type === "company" ? [p.rep, p.name].filter(Boolean).join(", ") : p.name || "");
  textIn(F.sSign, signName(d.seller), { pt: 9.5 });
  textIn(F.bSign, signName(d.buyer), { pt: 9.5 });
  return pages;
}
// Ilgą tekstą paskirsto per kelias eilutes (laukus).
function ctSplitLinesV53(text, rects, pt) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return [];
  const c = document.createElement("canvas").getContext("2d");
  c.font = `500 ${pt}px ${CT_FONT_V52}`;
  const out = [];
  let rest = s.split(" ");
  rects.forEach((r, i) => {
    if (!rest.length) return;
    const width = r[3] - r[1] - 4;
    if (i === rects.length - 1) {
      out.push([r, rest.join(" ")]);
      rest = [];
      return;
    }
    let line = "";
    while (rest.length && c.measureText(line ? line + " " + rest[0] : rest[0]).width <= width)
      line = line ? line + " " + rest.shift() : rest.shift();
    if (!line) line = rest.shift();
    out.push([r, line]);
  });
  return out;
}

function ctSegV52(name, options, value) {
  return `<div class="cfSegV51 ${options.length === 2 ? "two" : ""}" data-ct-seg="${name}">${options
    .map(
      ([v, t]) =>
        `<button type="button" role="radio" aria-checked="${v === value}" data-seg-value="${v}">${t}</button>`
    )
    .join("")}</div><input type="hidden" id="ct_${name}" value="${value}">`;
}
function ctField(id, label, value = "", attrs = "") {
  return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" value="${escapeHTML(value ?? "")}" autocomplete="off" ${attrs}></div>`;
}
function ctNextNumberV52(date) {
  ppEnsureState();
  const pp = state.accounting.pp,
    key = String(date || todayISO()).replace(/-/g, "");
  const n = pp.seqDate === key ? (pp.seq || 0) + 1 : 1;
  return {
    number: `PP-${key}-${String(n).padStart(2, "0")}`,
    commit: () => ((pp.seqDate = key), (pp.seq = n))
  };
}
function ctCarVehicleV52(car) {
  if (!car) return {};
  const parts = String(car.name || "").split(/\s+/);
  return {
    regMake: car.regMake || parts[0] || "",
    regModel: car.regModel || parts.slice(1).join(" "),
    registrationDoc: car.registrationDoc || car.regDoc || "",
    plate: car.plate || "",
    vin: car.vin || "",
    firstRegistrationDate: car.firstRegistrationDate || "",
    engineCc: car.engineCc ?? "",
    powerKw: car.powerKw ?? "",
    fuelType: car.fuelType || ""
  };
}

// ---------- Sutarties langas (v55) ----------
// Rodoma tik tai, ko trūksta: automobilio duomenys imami iš kortelės, kita šalis gali būti pildoma ranka popieriuje.
const CT_CAR_FIELDS_V55 = [
  { key: "regMake", label: "Markė", get: c => c.regMake || String(c.name || "").split(/\s+/)[0] || "" },
  {
    key: "regModel",
    label: "Modelis",
    get: c =>
      c.regModel ||
      String(c.name || "")
        .split(/\s+/)
        .slice(1)
        .join(" ")
  },
  { key: "plate", label: "Valst. numeris", caps: true, max: 10, get: c => c.plate || "" },
  { key: "vin", label: "VIN", caps: true, max: 17, wide: true, get: c => c.vin || "" },
  {
    key: "registrationDoc",
    label: "Liudijimo nr.",
    caps: true,
    max: 12,
    get: c => c.registrationDoc || c.regDoc || ""
  },
  {
    key: "mileage",
    label: "Rida, km",
    num: true,
    get: c => ((c.mileage ?? "") === null ? "" : String(c.mileage ?? ""))
  },
  { key: "sdk", label: "SDK", caps: true, max: 8, get: c => c.sdk || "" }
];
function ctInputV55(f, value = "") {
  const id = "ct" + f.key;
  const attrs = f.num
    ? 'type="number" min="0" inputmode="numeric"'
    : `maxlength="${f.max || 60}" ${f.caps ? 'autocapitalize="characters" spellcheck="false"' : ""}`;
  return `<div class="field ${f.wide ? "ctWideV55" : ""}"><label for="${id}">${f.label}</label><input class="input" id="${id}" value="${escapeHTML(value)}" autocomplete="off" ${attrs}></div>`;
}
function ctVehicleHTMLV55(car) {
  if (!car) {
    return (
      regCardHTMLV50("ct", {}) +
      `<section class="cfCardV51"><div class="cfGridV51">${ctInputV55(CT_CAR_FIELDS_V55[5])}${ctInputV55(CT_CAR_FIELDS_V55[6])}</div><div class="ctMt"><span class="cfLabelV51">Techninė apžiūra</span>${ctSegV52(
        "ta",
        [
          ["valid", "Galioja"],
          ["invalid", "Negalioja"]
        ],
        ""
      )}</div></section>`
    );
  }
  const missing = CT_CAR_FIELDS_V55.filter(f => !String(f.get(car)).trim());
  const taKnown = ["valid", "invalid"].includes(car.taStatus);
  const regMissing = missing.some(f =>
    ["regMake", "regModel", "plate", "vin", "registrationDoc"].includes(f.key)
  );
  const summary = `<section class="cfCardV51 ctCarSumV55"><div class="ctCarSumTopV55"><strong>${escapeHTML([CT_CAR_FIELDS_V55[0].get(car), CT_CAR_FIELDS_V55[1].get(car)].filter(Boolean).join(" ") || car.name || "Automobilis")}</strong>${car.plate ? `<span class="cdChipV51 plate">${escapeHTML(car.plate)}</span>` : ""}</div>${car.vin ? `<div class="ctCarVinV55">${escapeHTML(car.vin)}</div>` : ""}</section>`;
  if (!missing.length && taKnown) return summary;
  const scan = regMissing
    ? `<div class="regScanBtnsV50"><label class="regScanBtnV50 primary">${regIconV50("camera")}<span>Fotografuoti</span><input id="ctregCamera" type="file" accept="image/*" capture="environment"></label><label class="regScanBtnV50">${regIconV50("gallery")}<span>Iš galerijos</span><input id="ctregGallery" type="file" accept="image/*"></label></div><div class="regScanStatusV50" id="ctregStatus" hidden><div class="regScanTopV50"><img id="ctregPreview" alt=""><div><span class="regScanMsgV50" id="ctregMsg"></span><div class="regScanBarV50"><i id="ctregBar"></i></div></div></div></div>`
    : "";
  return (
    summary +
    `<section class="cfCardV51 ${regMissing ? "regCardV50" : ""}" id="${regMissing ? "ctregCard" : "ctMissingCard"}"><div class="ctCardTitleV55">Trūksta duomenų</div>${scan}<div class="cfGridV51 ctMt">${missing.map(f => ctInputV55(f)).join("")}</div>${
      taKnown
        ? ""
        : `<div class="ctMt"><span class="cfLabelV51">Techninė apžiūra</span>${ctSegV52(
            "ta",
            [
              ["valid", "Galioja"],
              ["invalid", "Negalioja"]
            ],
            ""
          )}</div>`
    }</section>`
  );
}
// ---------- Sugeneruotos sutarties langas: peržiūra, siuntimas, atsisiuntimas (v56) ----------
function ctShareSupportedV56(file) {
  try {
    return !!(navigator.canShare && navigator.canShare({ files: [file] }));
  } catch (e) {
    return false;
  }
}
function ctDownloadV56(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function ctOpenResultV56({ blob, pages, fileName, number, attached }) {
  document.getElementById("ctResultV56")?.remove();
  const file = new File([blob], fileName, { type: "application/pdf" });
  const canShare = ctShareSupportedV56(file);
  const ov = document.createElement("div");
  ov.id = "ctResultV56";
  ov.className = "ctOverlayV56";
  ov.innerHTML = `<div class="ctPanelV56" role="dialog" aria-modal="true" aria-label="Sutartis paruošta">
    <div class="ctDoneIcoV56"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
    <h3>Sutartis paruošta</h3>
    <p>${escapeHTML(number)}${attached ? " · prisegta prie automobilio" : ""}</p>
    <button type="button" class="ctThumbV56" data-ct-view><img src="${pages[0].toDataURL("image/jpeg", 0.7)}" alt="Sutarties peržiūra"></button>
    <div class="ctActionsV56">
      <button type="button" class="ctBtnV56 primary" data-ct-send>${canShare ? "Siųsti" : "Atsisiųsti"}</button>
      <button type="button" class="ctBtnV56" data-ct-view>Peržiūrėti</button>
      ${canShare ? '<button type="button" class="ctBtnV56" data-ct-download>Atsisiųsti į telefoną</button>' : ""}
      <button type="button" class="ctBtnV56 ghost" data-ct-close>Uždaryti</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add("show"));
  const close = () => {
    ov.classList.remove("show");
    setTimeout(() => ov.remove(), 200);
  };
  ov.addEventListener("click", async e => {
    if (e.target === ov || e.target.closest("[data-ct-close]")) return close();
    if (e.target.closest("[data-ct-view]")) return ctOpenViewerV56(pages, number);
    if (e.target.closest("[data-ct-download]")) return ctDownloadV56(blob, fileName);
    if (e.target.closest("[data-ct-send]")) {
      if (!canShare) return ctDownloadV56(blob, fileName);
      // Sistemos meniu: el. paštas, žinutės, WhatsApp, Viber, „Įrašyti į Failus“ ir kt.
      try {
        await navigator.share({ files: [file], title: number });
      } catch (err) {
        if (err && err.name !== "AbortError") ctDownloadV56(blob, fileName);
      }
    }
  });
}
function ctOpenViewerV56(pages, number) {
  document.getElementById("ctViewerV56")?.remove();
  const v = document.createElement("div");
  v.id = "ctViewerV56";
  v.className = "ctViewerV56";
  v.innerHTML = `<div class="ctViewerHeadV56"><span></span><strong>${escapeHTML(number)}</strong><button type="button" class="closeBtn" aria-label="Uždaryti">✕</button></div><div class="ctViewerPagesV56">${pages
    .map(c => `<img src="${c.toDataURL("image/jpeg", 0.85)}" alt="">`)
    .join("")}</div>`;
  document.body.appendChild(v);
  requestAnimationFrame(() => v.classList.add("show"));
  v.querySelector(".closeBtn").onclick = () => {
    v.classList.remove("show");
    setTimeout(() => v.remove(), 200);
  };
}
function openContractSheetV52({ carId = "" } = {}) {
  const cars = (state.cars || []).slice();
  let car = cars.find(c => c.id === carId) || null;
  const co = ppCompany();
  const coPerson = state.profile?.type === "person";
  const defaultRole = c =>
    !c
      ? "buyer"
      : c.status === "parduotas" || (c.documents || []).some(x => x.kind === "purchase")
        ? "seller"
        : "buyer";
  const time = new Date().toTimeString().slice(0, 5);
  openSheet(`<div class="sheetHead cfHeadV51 ctHeadV55"><span></span><h3>PP sutartis</h3><button class="closeBtn" id="ctClose" type="button" aria-label="Uždaryti">✕</button></div>
  <div class="cfFormV51 ctFormV52" id="ctform">
    <section class="cfCardV51">
      <div class="field"><label for="ctCar">Automobilis</label><select class="input" id="ctCar"><option value="">Kitas automobilis</option>${cars
        .map(
          c =>
            `<option value="${escapeHTML(c.id)}" ${car && c.id === car.id ? "selected" : ""}>${escapeHTML(c.name || "Automobilis")}${c.plate ? " · " + escapeHTML(c.plate) : ""}</option>`
        )
        .join("")}</select></div>
      <div class="ctMt"><span class="cfLabelV51">${coPerson ? "Aš" : "Mano įmonė"}</span>${ctSegV52(
        "role",
        coPerson
          ? [
              ["buyer", "Perku"],
              ["seller", "Parduodu"]
            ]
          : [
              ["buyer", "Perka"],
              ["seller", "Parduoda"]
            ],
        defaultRole(car)
      )}</div>
    </section>
    <div id="ctVehicleSlot">${ctVehicleHTMLV55(car)}</div>
    <section class="cfCardV51">
      ${ctField("ctPrice", "Kaina, €", "", 'type="number" min="0" step="1" inputmode="numeric"')}
      <div class="cfGridV51 ctMt"><div class="field"><label for="ctDate">Data</label><input class="input" id="ctDate" type="date" value="${todayISO()}"></div>${ctField("ctTime", "Laikas", time, 'type="time"')}</div>
    </section>
    <section class="cfCardV51">
      <span class="cfLabelV51" id="ctPartyTitle"></span>${ctSegV52(
        "pmode",
        [
          ["hand", "Pildys ranka"],
          ["app", "Pildyti dabar"]
        ],
        car?.ppParty?.name ? "app" : "hand"
      )}
      <div class="ctPartyWrapV55" id="ctPartyWrap">
        <div class="ctMt">${ctSegV52(
          "ptype",
          [
            ["person", "Fizinis asmuo"],
            ["company", "Įmonė"]
          ],
          car?.ppParty?.type || "person"
        )}</div>
        <div class="ctPartyV52">
          ${ctField("ctPName", "Vardas, pavardė", car?.ppParty?.name || "")}
          <div class="cfGridV51">${ctField("ctPCode", "Asmens kodas", car?.ppParty?.code || "", 'inputmode="numeric" maxlength="11"')}${ctField("ctPPhone", "Telefonas", car?.ppParty?.phone || "", 'type="tel" inputmode="tel"')}</div>
          ${ctField("ctPEmail", "El. paštas", car?.ppParty?.email || "", 'type="email" inputmode="email"')}
          ${ctField("ctPAddress", "Adresas", car?.ppParty?.address || "")}
          <div class="ctRepV52">${ctField("ctPRep", "Atstovas", car?.ppParty?.rep || "")}</div>
        </div>
      </div>
    </section>
    <details class="cfCardV51 ctMoreV52" ${co.address && co.code ? "" : "open"}><summary>${coPerson ? "Mano duomenys" : "Mano įmonės duomenys"}</summary>
      ${ctField("ctCoName", coPerson ? "Vardas, pavardė" : "Pavadinimas", co.name)}
      <div class="cfGridV51">${ctField("ctCoCode", coPerson ? "Asmens kodas" : "Įmonės kodas", co.code, 'inputmode="numeric"')}${ctField("ctCoPhone", "Telefonas", co.phone, 'type="tel" inputmode="tel"')}</div>
      ${ctField("ctCoEmail", "El. paštas", co.email || "", 'type="email" inputmode="email"')}
      ${ctField("ctCoAddress", "Adresas", co.address || "")}
      ${coPerson ? "" : ctField("ctCoRep", "Atstovas", co.representative || "")}
    </details>
  </div>
  <button class="btn cfSaveV51" id="ctGenerate" type="button">Sukurti sutartį</button>
  <section class="ctResultV52" id="ctResult" hidden></section>`);
  const sheet = document.getElementById("sheet");
  sheet.scrollTop = 0;
  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || "").trim();
  const seg = name => $("ct_" + name)?.value || "";
  const bindSegs = root =>
    root.querySelectorAll("[data-ct-seg]").forEach(box => {
      if (box.dataset.bound) return;
      box.dataset.bound = "1";
      box.querySelectorAll("[data-seg-value]").forEach(btn =>
        btn.addEventListener("click", () => {
          $("ct_" + box.dataset.ctSeg).value = btn.dataset.segValue;
          box
            .querySelectorAll("[data-seg-value]")
            .forEach(b => b.setAttribute("aria-checked", String(b === btn)));
          refresh();
        })
      );
    });
  const refresh = () => {
    const company = seg("ptype") === "company";
    $("ctPartyTitle").textContent = seg("role") === "buyer" ? "Pardavėjo duomenys" : "Pirkėjo duomenys";
    $("ctPartyWrap").hidden = seg("pmode") !== "app";
    sheet.querySelector('label[for="ctPName"]').textContent = company
      ? "Įmonės pavadinimas"
      : "Vardas, pavardė";
    sheet.querySelector('label[for="ctPCode"]').textContent = company ? "Įmonės kodas" : "Asmens kodas";
    sheet.querySelector(".ctRepV52").hidden = !company;
    if (!$("ctPrice").dataset.touched) {
      const pr = car ? (seg("role") === "buyer" ? car.buyPrice : car.soldPrice) : "";
      $("ctPrice").value = pr ? String(Math.round(pr)) : "";
    }
  };
  const bindVehicle = () => {
    bindSegs($("ctVehicleSlot"));
    if ($("ctregCard")) regBindCardV50("ct", () => ({ car, nameInputId: "" }));
  };
  bindSegs(sheet);
  bindVehicle();
  $("ctPrice").addEventListener("input", () => ($("ctPrice").dataset.touched = "1"));
  $("ctCar").addEventListener("change", () => {
    car = cars.find(c => c.id === $("ctCar").value) || null;
    $("ctVehicleSlot").innerHTML = ctVehicleHTMLV55(car);
    bindVehicle();
    delete $("ctPrice").dataset.touched;
    sheet.querySelector(`[data-ct-seg="role"] [data-seg-value="${defaultRole(car)}"]`)?.click();
    refresh();
  });
  $("ctClose").onclick = () => (carId && car ? openCar(car.id) : closeSheet());
  refresh();

  $("ctGenerate").onclick = async () => {
    const btn = $("ctGenerate");
    if (btn.disabled) return;
    try {
      // Automobilio duomenys: iš kortelės, o trūkstami – iš formos.
      const v = {};
      for (const f of CT_CAR_FIELDS_V55)
        v[f.key] = $("ct" + f.key) ? val("ct" + f.key) : car ? String(f.get(car)).trim() : "";
      if (!v.regMake && !v.regModel) throw Error("Įrašykite markę ir modelį.");
      if (v.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.vin)) throw Error("VIN turi būti 17 simbolių.");
      const price = Number(val("ctPrice"));
      if (!Number.isFinite(price) || price <= 0) throw Error("Įrašykite kainą.");
      const byHand = seg("pmode") !== "app";
      if (!byHand && !val("ctPName"))
        throw Error(seg("role") === "buyer" ? "Įrašykite pardavėją." : "Įrašykite pirkėją.");
      btn.disabled = true;
      btn.textContent = "Kuriama…";
      const company = {
        name: val("ctCoName"),
        code: val("ctCoCode"),
        phone: val("ctCoPhone"),
        email: val("ctCoEmail"),
        address: val("ctCoAddress"),
        representative: val("ctCoRep")
      };
      Object.assign(state.accounting.pp.company, company);
      if (state.profile && typeof profileSyncFromCompanyV57 === "function")
        profileSyncFromCompanyV57(company);
      const us = {
        type: coPerson ? "person" : "company",
        name: company.name,
        code: company.code,
        address: company.address,
        phone: company.phone,
        email: company.email,
        rep: company.representative
      };
      const other = byHand
        ? {}
        : {
            type: seg("ptype"),
            name: val("ctPName"),
            code: val("ctPCode"),
            address: val("ctPAddress"),
            phone: val("ctPPhone"),
            email: val("ctPEmail"),
            rep: val("ctPRep")
          };
      const ta = seg("ta") || (car && ["valid", "invalid"].includes(car.taStatus) ? car.taStatus : "");
      const date = val("ctDate") || todayISO();
      const num = ctNextNumberV52(date);
      const d = {
        number: num.number,
        date,
        time: val("ctTime"),
        country: "Lietuva",
        seller: seg("role") === "buyer" ? other : us,
        buyer: seg("role") === "buyer" ? us : other,
        make: v.regMake,
        model: v.regModel,
        vin: v.vin.toUpperCase(),
        plate: v.plate.toUpperCase(),
        regDoc: v.registrationDoc.toUpperCase(),
        mileage: v.mileage,
        sdk: v.sdk.toUpperCase(),
        ta,
        price
      };
      const pages = await ctRenderPagesV52(d);
      const blob = await ctPdfFromCanvasesV52(pages);
      num.commit();
      const fileName = `${d.number}-${accountingSafeName([d.make, d.model].join(" "))}.pdf`;
      let attached = false;
      if (car) {
        // Ranka įvesti trūkstami duomenys išsaugomi ir automobilio kortelėje.
        for (const f of CT_CAR_FIELDS_V55) {
          if (!$("ct" + f.key) || !v[f.key]) continue;
          car[f.key] = f.num ? Number(v[f.key]) : f.caps ? v[f.key].toUpperCase() : v[f.key];
        }
        if (seg("ta") && !["valid", "invalid"].includes(car.taStatus)) car.taStatus = seg("ta");
        try {
          const key = await putDocument(blob);
          car.documents = [
            ...(car.documents || []),
            {
              id: uid(),
              key,
              kind: seg("role") === "buyer" ? "purchase" : "sale",
              name: fileName,
              type: "application/pdf",
              size: blob.size,
              addedAt: nowLabel(),
              addedDateISO: todayISO()
            }
          ];
          if (!byHand) car.ppParty = other;
          attached = true;
        } catch (e) {
          console.warn("Sutarties prisegimas", e);
        }
      }
      addHistory(
        "Sukurta PP sutartis",
        `${d.number} · ${[d.make, d.model].join(" ")} · ${ctMoneyV52(price)}`,
        "🧾"
      );
      saveState();
      const res = $("ctResult");
      res.hidden = false;
      res.innerHTML = `<button type="button" class="ctResultOpenV56" id="ctReopen"><img src="${pages[0].toDataURL("image/jpeg", 0.5)}" alt=""><span><strong>Sutartis paruošta</strong><em>Atidaryti</em></span></button>`;
      $("ctReopen").onclick = () => ctOpenResultV56({ blob, pages, fileName, number: d.number, attached });
      ctOpenResultV56({ blob, pages, fileName, number: d.number, attached });
      toast("Sutartis sukurta", "✓");
    } catch (e) {
      toast(e.message || "Nepavyko sukurti sutarties", "!");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sukurti sutartį";
    }
  };
}

openPpGeneratorForCar = carId => openContractSheetV52({ carId });
document.addEventListener(
  "click",
  e => {
    const acc = e.target.closest?.('#accountingRoot [data-accounting-panel="pp"]');
    const quick = e.target.closest?.("[data-pp-car]");
    const cardBtn = e.target.closest?.("#sheet .carPpBottomBtn");
    if (!acc && !quick && !cardBtn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (acc) openContractSheetV52({});
    else if (quick) openContractSheetV52({ carId: quick.dataset.ppCar });
    else
      openContractSheetV52({
        carId: window.__openCarId || document.querySelector("#sheet [data-car-id]")?.dataset.carId || ""
      });
  },
  true
);
const __openCarContractV52 = openCar;
openCar = function (carId) {
  window.__openCarId = carId;
  return __openCarContractV52(carId);
};
window.AutoEasierContract = {
  open: openContractSheetV52,
  render: ctRenderPagesV52,
  pdf: ctPdfFromCanvasesV52,
  words: ctMoneyWordsV52
};
