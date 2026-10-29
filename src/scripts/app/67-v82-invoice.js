// v82: sąskaitos faktūros generatorius (automobilio pardavimas). Lietuviškas SF blankas su privalomais rekvizitais
// (serija ir numeris, išrašymo data, pardavėjo ir pirkėjo pavadinimai, kodai, PVM kodai, adresai, prekė, kiekis,
// kaina, PVM, bendra suma, suma žodžiais). PVM režimai: „PVM 21 %“, „Maržos schema“ (naudotos prekės – PVMĮ
// 106–110 str., PVM atskirai nenurodomas, įrašas „Maržos apmokestinimo schema. Naudotos prekės.“), „Be PVM“.
// Puslapis piešiamas ant canvas (200 DPI, kaip sutartis), PDF – ctPdfFromCanvasesV52. Parašai ir langas po
// sukūrimo – tie patys kaip sutarties (65-v82-signpad.js, 66-v82-docsign.js).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const INV_VAT_RATE_V82 = 21;
const INV_NAVY_V82 = "#23336e";
const INV_INK_V82 = "#0b1f4d";
const INV_CAPTION_V82 = "#ebebeb";
const INV_MODES_V82 = [
  ["margin", "Maržos schema"],
  ["vat", `PVM ${INV_VAT_RATE_V82} %`],
  ["none", "Be PVM"]
];
const INV_PAY_V82 = { bank: "Bankiniu pavedimu", cash: "Grynaisiais pinigais" };
const INV_CAR_FIELDS_V82 = [
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
  {
    key: "mileage",
    label: "Rida, km",
    num: true,
    get: c => (c.mileage === null || c.mileage === undefined ? "" : String(c.mileage))
  },
  { key: "vin", label: "VIN", caps: true, max: 17, wide: true, get: c => c.vin || "" },
  {
    key: "firstRegistrationDate",
    label: "Pirmoji registracija",
    date: true,
    wide: true,
    get: c => c.firstRegistrationDate || ""
  }
];

// ---------- Nustatymai ir skaičiavimai ----------
function invPrefsV82() {
  ensureAccounting();
  const cur =
    state.accounting.invoice && typeof state.accounting.invoice === "object" ? state.accounting.invoice : {};
  state.accounting.invoice = {
    series: "AE",
    seq: 0,
    mode: "",
    pay: "bank",
    issuer: "",
    ...cur,
    issued: Array.isArray(cur.issued) ? cur.issued.filter(x => typeof x === "string").slice(-500) : []
  };
  return state.accounting.invoice;
}
function invPadNumberV82(n) {
  return String(n).padStart(4, "0");
}
function invTotalsV82(amount, mode) {
  const total = Math.round(Number(amount || 0) * 100) / 100;
  if (mode !== "vat") return { base: total, vat: 0, total };
  const base = Math.round((total / (1 + INV_VAT_RATE_V82 / 100)) * 100) / 100;
  return { base, vat: Math.round((total - base) * 100) / 100, total };
}
function invMoneyV82(n) {
  return Number(n || 0).toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function invIbanOkV82(iban) {
  const s = String(iban || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith("LT") && s.length !== 20) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}
function invIbanFormatV82(iban) {
  return String(iban || "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}
function invCarFieldsHTMLV82(fields, car) {
  return fields
    .map(f => {
      const id = "inv" + f.key;
      const value = car ? String(f.get(car) ?? "") : "";
      const attrs = f.date
        ? 'type="date"'
        : f.num
          ? 'type="number" min="0" inputmode="numeric"'
          : `maxlength="${f.max || 60}" ${f.caps ? 'autocapitalize="characters" spellcheck="false"' : ""}`;
      return `<div class="field ${f.wide ? "ctWideV55" : ""}"><label for="${id}">${f.label}</label><input class="input" id="${id}" value="${escapeHTML(value)}" autocomplete="off" ${attrs}></div>`;
    })
    .join("");
}
function invVehicleHTMLV82(car) {
  if (!car)
    return `<section class="cfCardV51"><div class="ctCardTitleV55">Automobilio duomenys</div><div class="cfGridV51 ctMt">${invCarFieldsHTMLV82(INV_CAR_FIELDS_V82, null)}</div></section>`;
  const name =
    [INV_CAR_FIELDS_V82[0].get(car), INV_CAR_FIELDS_V82[1].get(car)].filter(Boolean).join(" ") ||
    car.name ||
    "Automobilis";
  const summary = `<section class="cfCardV51 ctCarSumV55"><div class="ctCarSumTopV55"><strong>${escapeHTML(name)}</strong>${car.plate ? `<span class="cdChipV51 plate">${escapeHTML(car.plate)}</span>` : ""}</div>${car.vin ? `<div class="ctCarVinV55">${escapeHTML(car.vin)}</div>` : ""}</section>`;
  const missing = INV_CAR_FIELDS_V82.filter(f => !String(f.get(car) ?? "").trim());
  if (!missing.length) return summary;
  return (
    summary +
    `<section class="cfCardV51" id="invMissingCard"><div class="ctCardTitleV55">Trūksta duomenų</div><div class="cfGridV51 ctMt">${invCarFieldsHTMLV82(missing, null)}</div></section>`
  );
}

// ---------- Sąskaitos faktūros blankas (A4, 200 DPI) ----------
async function invRenderV82(d, sigs = null) {
  const W = 595.28,
    H = 841.89,
    S = 200 / 72;
  const c = document.createElement("canvas");
  c.width = Math.round(W * S);
  c.height = Math.round(H * S);
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.setTransform(S, 0, 0, S, 0, 0);
  const L = 33.5,
    R = 561.8;
  const setFont = (pt, w = 500) => (x.font = `${w} ${pt}px ${CT_FONT_V52}`);
  const fitFont = (s, maxW, pt, w, min = 5.5) => {
    let size = pt;
    setFont(size, w);
    while (x.measureText(s).width > maxW && size > min) setFont((size -= 0.25), w);
    return size;
  };
  const text = (s, px, py, { pt = 8.5, w = 500, color = INV_NAVY_V82, align = "left", maxW = 0 } = {}) => {
    const v = String(s ?? "");
    if (!v) return;
    if (maxW) fitFont(v, maxW, pt, w);
    else setFont(pt, w);
    x.fillStyle = color;
    x.textAlign = align;
    x.textBaseline = "alphabetic";
    x.fillText(v, px, py);
  };
  const rule = (y, th = 2.4) => {
    x.fillStyle = INV_NAVY_V82;
    x.fillRect(L, y, R - L, th);
  };
  const hline = (x0, x1, y, th = 0.75) => {
    x.fillStyle = INV_NAVY_V82;
    x.fillRect(x0, y - th / 2, x1 - x0, th);
  };
  const box = (x0, y0, x1, y1, th = 0.9) => {
    x.strokeStyle = INV_NAVY_V82;
    x.lineWidth = th;
    x.strokeRect(x0, y0, x1 - x0, y1 - y0);
  };
  const caption = (x0, x1, y, s) => {
    x.fillStyle = INV_CAPTION_V82;
    x.fillRect(x0, y, x1 - x0, 10.5);
    text(s, (x0 + x1) / 2, y + 7.4, { pt: 6.9, w: 500, align: "center", maxW: x1 - x0 - 6 });
  };
  // Centruota reikšmė lauke r = [x0, y0, x1, y1]: horizontaliai ir vertikaliai (didžiųjų raidžių aukštis centre),
  // šiek tiek didesniu šriftu; uodegėlės neužlipa ant apatinės linijos.
  const value = (r, s, { pt = 10.5, w = 650, color = INV_INK_V82 } = {}) => {
    const v = String(s ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!v) return;
    const size = fitFont(v, r[2] - r[0] - 6, pt, w);
    x.textBaseline = "alphabetic";
    const cap = x.measureText("H").actualBoundingBoxAscent || size * 0.72;
    const desc = x.measureText(v).actualBoundingBoxDescent || 0;
    const base = Math.min((r[1] + r[3]) / 2 + cap / 2, r[3] - desc - 0.9);
    x.fillStyle = color;
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    x.fillText(v, (r[0] + r[2]) / 2, base);
  };
  const field = (r, s, cap, opts) => {
    hline(r[0], r[2], r[3]);
    caption(r[0], r[2], r[3] + 2.5, cap);
    value(r, s, opts);
  };

  const vatDoc = d.mode !== "none";
  const t = invTotalsV82(d.total, d.mode);
  // ---- Antraštė ----
  text(vatDoc ? "PVM SĄSKAITA FAKTŪRA" : "SĄSKAITA FAKTŪRA", W / 2, 56, { pt: 17, w: 800, align: "center" });
  const head = [
    [154, 224, d.series, "serija"],
    [236, 346, d.number, "numeris"],
    [358, 441.3, d.date, "išrašymo data"]
  ];
  for (const [x0, x1, v, cap] of head) {
    box(x0, 70, x1, 91);
    value([x0, 70, x1, 91], v, { pt: 11.5, w: 700 });
    caption(x0, x1, 94, cap);
  }
  rule(116);
  // ---- Pardavėjas ----
  const party = (y, title, sub, p, withBank) => {
    text(title, L, y + 12, { pt: 12.5, w: 800 });
    text(sub, L, y + 24, { pt: 8.6, w: 400 });
    field([150, y, R, y + 17], p.name, "(pavadinimas arba vardas, pavardė)");
    field([150, y + 40, 350, y + 57], p.code, "(įmonės / individualios veiklos / asmens kodas)");
    field([362, y + 40, R, y + 57], p.vat, "(PVM mokėtojo kodas)");
    field([L, y + 80, R, y + 97], p.address, "(adresas)", { pt: 10.5, w: 600 });
    if (withBank) {
      field([L, y + 120, 300, y + 137], p.bank, "(bankas)", { pt: 10, w: 600 });
      field([312, y + 120, R, y + 137], invIbanFormatV82(p.iban), "(atsiskaitomoji sąskaita)", {
        pt: 10,
        w: 600
      });
    }
  };
  party(126, "Pardavėjas", "(prekių tiekėjas)", d.seller, true);
  rule(284);
  party(292, "Pirkėjas", "(prekių gavėjas)", d.buyer, false);
  // ---- Prekė ----
  x.fillStyle = INV_NAVY_V82;
  x.fillRect(L, 412, R - L, 18);
  text("Parduodama transporto priemonė", L + 8, 424.6, { pt: 10, w: 700, color: "#fff" });
  const cols = [L, 62, 310, 352, 390, 476, R];
  const heads = [
    "Eil. Nr.",
    "Prekės pavadinimas",
    "Mato vnt.",
    "Kiekis",
    d.mode === "vat" ? "Kaina be PVM, EUR" : "Kaina, EUR",
    d.mode === "vat" ? "Suma be PVM, EUR" : "Suma, EUR"
  ];
  x.fillStyle = INV_CAPTION_V82;
  x.fillRect(L, 434, R - L, 16);
  heads.forEach((h, i) =>
    text(h, (cols[i] + cols[i + 1]) / 2, 444.8, {
      pt: 7.4,
      w: 700,
      align: "center",
      maxW: cols[i + 1] - cols[i] - 4
    })
  );
  box(L, 434, R, 476);
  hline(L, R, 450, 0.6);
  for (let i = 1; i < cols.length - 1; i++) {
    x.fillStyle = INV_NAVY_V82;
    x.fillRect(cols[i] - 0.3, 434, 0.6, 42);
  }
  const item = d.item || `Naudotas automobilis ${[d.car.make, d.car.model].filter(Boolean).join(" ")}`;
  const row = ["1", item, "vnt.", "1", invMoneyV82(t.base), invMoneyV82(t.base)];
  row.forEach((v, i) =>
    value([cols[i], 450, cols[i + 1], 476], v, { pt: i === 1 ? 10 : 10.5, w: i === 1 ? 600 : 650 })
  );
  // ---- Transporto priemonės duomenys ----
  text("Transporto priemonės duomenys", L, 500, { pt: 9.5, w: 700 });
  const spec = (y, cells) =>
    cells.forEach(([x0, x1, v, cap]) => {
      box(x0, y, x1, y + 18);
      value([x0, y, x1, y + 18], v, { pt: 10.5, w: 650 });
      caption(x0, x1, y + 20.5, cap);
    });
  spec(508, [
    [L, 190, d.car.make, "markė (D.1)"],
    [202, 352, d.car.model, "komercinis pavadinimas (D.3)"],
    [364, R, d.car.vin, "identifikavimo numeris (E)"]
  ]);
  spec(548, [
    [L, 190, d.car.plate, "valstybinis numeris (A)"],
    [202, 352, d.car.firstReg, "pirmosios registracijos data (B)"],
    [364, R, d.car.mileage ? Number(d.car.mileage).toLocaleString("lt-LT") : "", "rida, km"]
  ]);
  // ---- Apmokėjimas ir sumos ----
  field([L, 594, 290, 611], INV_PAY_V82[d.pay] || "", "(mokėjimo būdas)", { pt: 10, w: 600 });
  field([L, 632, 290, 649], d.due || "", "(apmokėti iki)", { pt: 10, w: 600 });
  const sums =
    d.mode === "vat"
      ? [
          ["Suma be PVM", t.base],
          [`PVM ${INV_VAT_RATE_V82} %`, t.vat],
          ["Iš viso su PVM, EUR", t.total]
        ]
      : [["Iš viso, EUR", t.total]];
  const y0 = 651 - sums.length * 19;
  sums.forEach(([label, v], i) => {
    const y = y0 + i * 19,
      last = i === sums.length - 1;
    x.fillStyle = last ? INV_NAVY_V82 : INV_CAPTION_V82;
    x.fillRect(312, y, 128, 19);
    text(label, 320, y + 12.8, { pt: 8.4, w: 700, color: last ? "#fff" : INV_NAVY_V82, maxW: 116 });
    box(312, y, R, y + 19, 0.8);
    value([440, y, R, y + 19], invMoneyV82(v), { pt: last ? 11.5 : 10.5, w: last ? 800 : 650 });
  });
  field([L, 668, R, 685], ctMoneyWordsV52(t.total), "(bendra suma žodžiais)", { pt: 11, w: 600 });
  if (d.mode === "margin") {
    x.fillStyle = "#f1f3f9";
    x.fillRect(L, 704, R - L, 19);
    box(L, 704, R, 723, 0.6);
    value([L, 704, R, 723], "Maržos apmokestinimo schema. Naudotos prekės.", {
      pt: 9.5,
      w: 700,
      color: INV_NAVY_V82
    });
  }
  rule(738, 2.2);
  // ---- Parašai: vardas kairėje, parašas – dešinėje, apatiniame sluoksnyje ----
  const signLine = (y, title, sub, name, cap, sig) => {
    text(title, L, y + 9, { pt: 11, w: 800 });
    text(sub, L, y + 21, { pt: 8.6, w: 400 });
    const lineY = y + 17;
    const img = sig?.img && sig.img.naturalWidth ? sig.img : null;
    let size = 9.5,
      nameEnd = 150;
    if (name) {
      size = fitFont(name, (R - 150 - 4) * (img ? 0.6 : 1), 9.5, 600);
      nameEnd = 152 + x.measureText(name).width;
    }
    if (img)
      spPlaceOnLineV82(x, img, {
        x: name ? nameEnd + 12 : 150 + (R - 150) * 0.3,
        lineY,
        maxX: R - 4,
        fontPt: 9.5,
        S: 1
      });
    hline(150, R, lineY);
    caption(150, R, lineY + 2.5, cap);
    if (name) {
      setFont(size, 600);
      x.fillStyle = INV_INK_V82;
      x.textAlign = "left";
      x.textBaseline = "middle";
      x.fillText(name, 152, y + 8.9);
    }
  };
  signLine(
    755,
    "Sąskaitą išrašė",
    "(pardavėjas)",
    d.issuer,
    "(pareigos, vardas, pavardė, parašas)",
    sigs?.seller
  );
  signLine(793, "Sąskaitą gavo", "(pirkėjas)", d.buyer.name, "(vardas, pavardė, parašas)", sigs?.buyer);
  text(
    `${vatDoc ? "PVM sąskaita faktūra" : "Sąskaita faktūra"} · serija ${d.series} Nr. ${d.number} · 1 psl. iš 1`,
    W / 2,
    834,
    {
      pt: 6.8,
      w: 500,
      color: "#8a93a8",
      align: "center"
    }
  );
  return [c];
}

// ---------- Langas ----------
function openInvoiceSheetV82({ carId = "" } = {}) {
  const prefs = invPrefsV82();
  const cars = (state.cars || [])
    .slice()
    .sort((a, b) => (b.status === "parduotas") - (a.status === "parduotas"));
  let car = cars.find(c => c.id === carId) || null;
  const co = ppCompany();
  const person = state.profile?.type === "person";
  const nextNumber = invPadNumberV82((Number(prefs.seq) || 0) + 1);
  const mode = prefs.mode || (co.vatCode ? "margin" : "none");
  const party = car?.ppParty || {};
  let committed = null;
  let docId = "";
  openSheet(`<div class="sheetHead cfHeadV51 ctHeadV55 invHeadV82"><span></span><h3>Sąskaita faktūra</h3><button class="closeBtn" id="invClose" type="button" aria-label="Uždaryti">✕</button></div>
  <div class="cfFormV51 ctFormV52 invFormV82" id="invForm">
    <section class="cfCardV51">
      <div class="field"><label for="invCar">Automobilis</label><select class="input" id="invCar"><option value="">Kitas automobilis</option>${cars
        .map(
          c =>
            `<option value="${escapeHTML(c.id)}" ${car && c.id === car.id ? "selected" : ""}>${escapeHTML(c.name || "Automobilis")}${c.plate ? " · " + escapeHTML(c.plate) : ""}${c.status === "parduotas" ? " · parduotas" : ""}</option>`
        )
        .join("")}</select></div>
    </section>
    <div id="invVehicleSlot">${invVehicleHTMLV82(car)}</div>
    <section class="cfCardV51">
      <div class="ctCardTitleV55">Sąskaita</div>
      <div class="cfGridV51 ctMt">${ctField("invSeries", "Serija", prefs.series, 'maxlength="10" autocapitalize="characters" spellcheck="false"')}${ctField("invNumber", "Numeris", nextNumber, 'maxlength="12" inputmode="numeric"')}</div>
      <div class="cfGridV51 ctMt"><div class="field"><label for="invDate">Išrašymo data</label><input class="input" id="invDate" type="date" value="${todayISO()}"></div><div class="field"><label for="invDue">Apmokėti iki</label><input class="input" id="invDue" type="date" value=""></div></div>
      <div class="ctMt"><span class="cfLabelV51">PVM</span>${ctSegV52("invMode", INV_MODES_V82, mode)}</div>
      <div class="ctMt">${ctField("invPrice", "Suma, €", car?.soldPrice ? String(car.soldPrice) : "", 'type="number" min="0" step="0.01" inputmode="decimal"')}</div>
      <div class="invCalcV82" id="invCalc" aria-live="polite"></div>
      <div class="ctMt"><span class="cfLabelV51">Mokėjimo būdas</span>${ctSegV52(
        "invPay",
        [
          ["bank", "Pavedimu"],
          ["cash", "Grynaisiais"]
        ],
        prefs.pay === "cash" ? "cash" : "bank"
      )}</div>
    </section>
    <section class="cfCardV51">
      <div class="ctCardTitleV55">Pirkėjas</div>
      <div class="ctMt">${ctSegV52(
        "invBType",
        [
          ["person", "Fizinis asmuo"],
          ["company", "Įmonė"]
        ],
        party.type === "company" ? "company" : "person"
      )}</div>
      <div class="ctPartyV52 ctMt">
        ${ctField("invBName", "Vardas, pavardė", party.name || "")}
        <div class="cfGridV51">${ctField("invBCode", "Asmens kodas", party.code || "", 'inputmode="numeric" maxlength="20"')}<div class="invBVatWrapV82">${ctField("invBVat", "PVM kodas", party.vat || "", 'maxlength="16" autocapitalize="characters" spellcheck="false"')}</div></div>
        ${ctField("invBAddress", "Adresas", party.address || "")}
      </div>
    </section>
    <details class="cfCardV51 ctMoreV52" ${co.name && co.code && co.address ? "" : "open"}><summary>${person ? "Mano rekvizitai" : "Mano įmonės rekvizitai"}</summary>
      ${ctField("invSName", person ? "Vardas, pavardė" : "Pavadinimas", co.name)}
      <div class="cfGridV51">${ctField("invSCode", person ? "Asmens ar IV kodas" : "Įmonės kodas", co.code, 'inputmode="numeric"')}${ctField("invSVat", "PVM mokėtojo kodas", co.vatCode || "", 'maxlength="16" autocapitalize="characters" spellcheck="false"')}</div>
      ${ctField("invSAddress", "Adresas", co.address || "")}
      <div class="cfGridV51">${ctField("invSBank", "Bankas", co.bank || "")}${ctField("invSIban", "Sąskaitos nr. (IBAN)", invIbanFormatV82(co.iban || ""), 'maxlength="42" autocapitalize="characters" spellcheck="false"')}</div>
      ${ctField("invSIssuer", "Sąskaitą išrašė (vardas, pavardė)", prefs.issuer || co.representative || (person ? co.name : ""))}
    </details>
  </div>
  <button class="btn cfSaveV51" id="invGenerate" type="button">Sukurti sąskaitą</button>
  <section class="ctResultV52" id="invResult" hidden></section>`);
  const sheet = document.getElementById("sheet");
  sheet.scrollTop = 0;
  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || "").trim();
  const seg = name => $("ct_" + name)?.value || "";
  const bindSegs = root =>
    root.querySelectorAll("[data-ct-seg]").forEach(boxEl => {
      if (boxEl.dataset.bound) return;
      boxEl.dataset.bound = "1";
      boxEl.querySelectorAll("[data-seg-value]").forEach(btn =>
        btn.addEventListener("click", () => {
          $("ct_" + boxEl.dataset.ctSeg).value = btn.dataset.segValue;
          boxEl
            .querySelectorAll("[data-seg-value]")
            .forEach(b => b.setAttribute("aria-checked", String(b === btn)));
          refresh();
        })
      );
    });
  const refresh = () => {
    const company = seg("invBType") === "company";
    sheet.querySelector('label[for="invBName"]').textContent = company
      ? "Įmonės pavadinimas"
      : "Vardas, pavardė";
    sheet.querySelector('label[for="invBCode"]').textContent = company ? "Įmonės kodas" : "Asmens kodas";
    sheet.querySelector(".invBVatWrapV82").hidden = !company;
    const m = seg("invMode");
    const total = Number(val("invPrice"));
    const calc = $("invCalc");
    if (!Number.isFinite(total) || total <= 0) {
      calc.textContent =
        m === "margin"
          ? "Maržos schema: PVM skaičiuojamas nuo maržos ir sąskaitoje atskirai nenurodomas."
          : m === "vat"
            ? `Įrašykite galutinę sumą su PVM – ${INV_VAT_RATE_V82} % PVM apskaičiuosime patys.`
            : "Pardavėjas nėra PVM mokėtojas – PVM sąskaitoje nenurodomas.";
      return;
    }
    const t = invTotalsV82(total, m);
    calc.innerHTML =
      m === "vat"
        ? `<span>Be PVM <b>${invMoneyV82(t.base)} €</b></span><span>PVM ${INV_VAT_RATE_V82} % <b>${invMoneyV82(t.vat)} €</b></span><span>Iš viso <b>${invMoneyV82(t.total)} €</b></span>`
        : `<span>Iš viso <b>${invMoneyV82(t.total)} €</b></span><span>${m === "margin" ? "PVM pagal maržos schemą nenurodomas" : "be PVM"}</span>`;
    calc.insertAdjacentHTML("beforeend", `<em>${escapeHTML(ctMoneyWordsV52(t.total))}</em>`);
  };
  bindSegs(sheet);
  $("invPrice").addEventListener("input", refresh);
  $("invCar").addEventListener("change", () => {
    car = cars.find(c => c.id === $("invCar").value) || null;
    $("invVehicleSlot").innerHTML = invVehicleHTMLV82(car);
    const p = car?.ppParty || {};
    if (car) {
      if (car.soldPrice && !val("invPrice")) $("invPrice").value = String(car.soldPrice);
      if (p.name && !val("invBName")) {
        $("invBName").value = p.name || "";
        $("invBCode").value = p.code || "";
        $("invBAddress").value = p.address || "";
        $("invBVat").value = p.vat || "";
        sheet
          .querySelector(
            `[data-ct-seg="invBType"] [data-seg-value="${p.type === "company" ? "company" : "person"}"]`
          )
          ?.click();
      }
    }
    refresh();
  });
  $("invClose").onclick = () => (carId && car ? openCar(car.id) : closeSheet());
  refresh();

  $("invGenerate").onclick = async () => {
    const btn = $("invGenerate");
    if (btn.disabled) return;
    try {
      // Sinchronizacija galėjo pakeisti būseną – dirbame su gyvais objektais
      const prefsNow = invPrefsV82();
      if (car) car = (state.cars || []).find(c => c.id === car.id) || car;
      const v = {};
      for (const f of INV_CAR_FIELDS_V82)
        v[f.key] = $("inv" + f.key) ? val("inv" + f.key) : car ? String(f.get(car) ?? "").trim() : "";
      if (!v.regMake && !v.regModel) throw Error("Įrašykite markę ir modelį.");
      if (v.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.vin)) throw Error("VIN turi būti 17 simbolių.");
      const series = val("invSeries").toUpperCase();
      const number = val("invNumber");
      if (!series) throw Error("Įrašykite sąskaitos seriją.");
      if (!/^[A-Z0-9ĄČĘĖĮŠŲŪŽ-]{1,10}$/.test(series))
        throw Error("Serija gali būti iš raidžių ir skaitmenų.");
      if (!number) throw Error("Įrašykite sąskaitos numerį.");
      if (!/^[A-Za-z0-9-]{1,12}$/.test(number)) throw Error("Numeris gali būti iš skaitmenų ir raidžių.");
      const key = `${series}-${number}`;
      const same = committed && committed === key;
      if (!same && prefsNow.issued.includes(key))
        throw Error(`Sąskaita serija ${series} Nr. ${number} jau išrašyta – pakeiskite numerį.`);
      const total = Number(val("invPrice"));
      if (!Number.isFinite(total) || total <= 0) throw Error("Įrašykite sumą.");
      const mode = seg("invMode") || "none";
      const sVat = val("invSVat").replace(/\s+/g, "").toUpperCase();
      const sName = val("invSName"),
        sCode = val("invSCode"),
        sAddress = val("invSAddress");
      if (!sName || !sCode || !sAddress) {
        sheet.querySelector(".ctMoreV52").open = true;
        throw Error(
          person ? "Įrašykite savo vardą, kodą ir adresą." : "Įrašykite įmonės pavadinimą, kodą ir adresą."
        );
      }
      if (mode !== "none" && !sVat) {
        sheet.querySelector(".ctMoreV52").open = true;
        throw Error("PVM sąskaitai faktūrai reikia PVM mokėtojo kodo.");
      }
      if (sVat && !/^LT\d{9}(\d{3})?$/.test(sVat))
        throw Error("PVM mokėtojo kodas: LT ir 9 arba 12 skaitmenų.");
      const iban = val("invSIban").replace(/\s+/g, "").toUpperCase();
      if (iban && !invIbanOkV82(iban)) throw Error("Patikrinkite sąskaitos numerį (IBAN).");
      const bName = val("invBName");
      if (!bName) throw Error("Įrašykite pirkėją.");
      const company = seg("invBType") === "company";
      const bVat = company ? val("invBVat").replace(/\s+/g, "").toUpperCase() : "";
      if (bVat && !/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(bVat)) throw Error("Patikrinkite pirkėjo PVM kodą.");
      btn.disabled = true;
      btn.textContent = "Kuriama…";
      // Rekvizitai įsimenami kitoms sąskaitoms ir sutartims
      ppEnsureState();
      Object.assign(state.accounting.pp.company, {
        name: sName,
        code: sCode,
        address: sAddress,
        vatCode: sVat,
        bank: val("invSBank"),
        iban
      });
      if (state.profile && typeof profileSyncFromCompanyV57 === "function")
        profileSyncFromCompanyV57({ name: sName, code: sCode, address: sAddress });
      const issuer = val("invSIssuer") || (person ? sName : "");
      const buyer = {
        type: company ? "company" : "person",
        name: bName,
        code: val("invBCode"),
        vat: bVat,
        address: val("invBAddress")
      };
      const d = {
        series,
        number,
        date: val("invDate") || todayISO(),
        due: val("invDue"),
        mode,
        pay: seg("invPay") || "bank",
        total,
        issuer: issuer || sName,
        seller: { name: sName, code: sCode, vat: sVat, address: sAddress, bank: val("invSBank"), iban },
        buyer,
        car: {
          make: v.regMake,
          model: v.regModel,
          vin: v.vin.toUpperCase(),
          plate: v.plate.toUpperCase(),
          firstReg: v.firstRegistrationDate,
          mileage: v.mileage
        }
      };
      const pages = await invRenderV82(d);
      const blob = await ctPdfFromCanvasesV52(pages);
      // Numeracija: tas pats numeris šiame lange gali būti išrašytas iš naujo (pataisymas), kitas – tik vieną kartą
      if (!same) {
        prefsNow.issued = [...prefsNow.issued, key].slice(-500);
        committed = key;
      }
      if (/^\d+$/.test(number)) prefsNow.seq = Math.max(Number(prefsNow.seq) || 0, Number(number));
      Object.assign(prefsNow, { series, mode, pay: d.pay, issuer: val("invSIssuer") });
      if (car) {
        for (const f of INV_CAR_FIELDS_V82) {
          if (!$("inv" + f.key) || !v[f.key]) continue;
          car[f.key] = f.num ? Number(v[f.key]) : f.caps ? v[f.key].toUpperCase() : v[f.key];
        }
        if (!car.ppParty?.name) car.ppParty = { ...buyer };
      }
      saveState();
      const carRef = car?.id || "";
      const fileName = `SF-${series}-${number}-${accountingSafeName([d.car.make, d.car.model].join(" "))}.pdf`;
      const label = `serija ${series} Nr. ${number}`;
      const session = dsSessionV82({
        domId: "invResultV82",
        number: label,
        fileName,
        title: "Sąskaita faktūra sukurta",
        doneTitle: "Sąskaita faktūra pasirašyta",
        placedToast: "Parašai patalpinti į sąskaitą",
        pages,
        blob,
        thumbPage: 0,
        signers: [
          { key: "buyer", label: "Pasirašyti pirkėjui", padTitle: "Pirkėjo parašas", name: bName },
          { key: "seller", label: "Pasirašyti pardavėjui", padTitle: "Pardavėjo parašas", name: d.issuer }
        ],
        render: sigs => invRenderV82(d, sigs),
        onPlaced: async ({ blob: signed }) => {
          const reopen = document.querySelector("#invReopen strong");
          if (reopen) reopen.textContent = "Sąskaita faktūra pasirašyta";
          const live = carRef ? (state.cars || []).find(c => c.id === carRef) : null;
          addHistory(
            "Išrašyta sąskaita faktūra",
            `${label} · ${[d.car.make, d.car.model].filter(Boolean).join(" ")} · ${invMoneyV82(total)} €`,
            "🧾",
            live ? { kind: "car", id: live.id, label: "Atidaryti automobilį" } : null
          );
          if (!live) {
            saveState();
            return "";
          }
          const keyDoc = await putDocument(signed);
          const docs = live.documents || [];
          const prev = docId ? docs.find(x => x.id === docId) : null;
          const entry = {
            id: prev?.id || uid(),
            key: keyDoc,
            kind: "invoice",
            name: fileName,
            type: "application/pdf",
            size: signed.size,
            addedAt: nowLabel(),
            addedDateISO: todayISO()
          };
          docId = entry.id;
          live.documents = prev ? docs.map(x => (x.id === prev.id ? entry : x)) : [...docs, entry];
          saveState();
          return "prisegta prie automobilio";
        }
      });
      const res = $("invResult");
      res.hidden = false;
      res.innerHTML = `<button type="button" class="ctResultOpenV56" id="invReopen"><img src="${pages[0].toDataURL("image/jpeg", 0.5)}" alt=""><span><strong>Sąskaita faktūra sukurta</strong><em>Atidaryti</em></span></button>`;
      $("invReopen").onclick = () => session.open();
      session.open();
      toast("Sąskaita faktūra sukurta", "✓");
    } catch (e) {
      toast(e.message || "Nepavyko sukurti sąskaitos", "!");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sukurti sąskaitą";
    }
  };
}

// ---------- Įėjimai: automobilio kortelė ir Buhalterija ----------
const INV_ICON_V82 =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>';
const __renderCarSheetV82 = renderCarSheet;
renderCarSheet = function (car) {
  const r = __renderCarSheetV82.apply(this, arguments);
  const actions = document.querySelector("#sheet .carBottomActions");
  const pp = actions?.querySelector(".carPpBottomBtn");
  if (car && pp && !actions.querySelector(".carInvBottomBtn")) {
    pp.insertAdjacentHTML(
      "afterend",
      `<button class="btn secondary carInvBottomBtn" type="button" data-inv-car="${escapeHTML(car.id)}">Sąskaita faktūra</button>`
    );
    actions.classList.add("aeInvRowV82");
  }
  return r;
};
const __renderAccountingCenterV82 = renderAccountingCenter;
renderAccountingCenter = function () {
  const r = __renderAccountingCenterV82.apply(this, arguments);
  const menu = document.querySelector("#accountingRoot .accountingRefMenu");
  if (menu && !menu.querySelector("[data-invoice-open]"))
    menu.insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="accountingRefAction invoice invTileV82" data-invoice-open><span class="ico">${INV_ICON_V82}</span><strong>Sąskaita faktūra</strong><span class="arrow">›</span></button>`
    );
  return r;
};
document.addEventListener("click", e => {
  const tile = e.target.closest?.("[data-invoice-open]");
  const fromCar = e.target.closest?.("#sheet [data-inv-car]");
  if (!tile && !fromCar) return;
  e.preventDefault();
  openInvoiceSheetV82({ carId: fromCar ? fromCar.dataset.invCar : "" });
});
window.AutoEasierInvoice = {
  open: openInvoiceSheetV82,
  render: invRenderV82,
  totals: invTotalsV82,
  iban: invIbanOkV82
};
