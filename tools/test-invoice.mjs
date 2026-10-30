#!/usr/bin/env node
// v82 sąskaitos faktūros testas: įėjimai (Buhalterija, automobilio kortelė), numeracija, PVM skaičiavimas,
// rekvizitų tikrinimas (PVM kodas, IBAN), parašai ir „Siųsti / Peržiūrėti / Atsisiųsti į įrenginį“ užraktas,
// prisegimas prie automobilio tik po „Patalpinti parašus“, centruoti laukai ir parašo vieta blanke.
// Naudojimas: node tools/test-invoice.mjs   (rezultatai ir nuotraukos – .verify/invoice*)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const f = path.join(dist, rel);
  if (!f.startsWith(dist) || !fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": f.endsWith(".html")
      ? "text/html"
      : f.endsWith(".jpg")
        ? "image/jpeg"
        : "application/octet-stream"
  });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, acceptDownloads: true });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", e => errors.push(e.message));
p.on("dialog", d => d.accept());
await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await p.addInitScript(
  raw => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("visureigiai_uab_v1", raw);
      sessionStorage.setItem("seeded", "1");
    }
  },
  fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8")
);
await p.goto(base + "index.html");
await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
await p.waitForTimeout(400);
await p.evaluate(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
const ev = (f, a) => p.evaluate(f, a);
const tap = sel => ev(s => document.querySelector(s)?.click(), sel).then(() => p.waitForTimeout(350));
const lastToast = () =>
  ev(() => [...document.querySelectorAll("#toastWrap .toast span")].map(s => s.textContent).pop() || "");
const st = () => ev(() => window.AUTOEASIER_APP_DATA.getState());

// ---------- Įėjimai ----------
await tap('.navBtn[data-view="accounting"]');
const tile = await ev(() => {
  const t = document.querySelector("#accountingRoot .accountingRefMenu [data-invoice-open]");
  if (!t) return null;
  const r = t.getBoundingClientRect(),
    m = t.parentElement.getBoundingClientRect();
  return { text: t.querySelector("strong").textContent.trim(), full: r.width > m.width * 0.9 };
});
check(
  tile && tile.text === "Sąskaita faktūra" && tile.full,
  "Buhalterijoje – plytelė „Sąskaita faktūra“ per visą plotį " + JSON.stringify(tile)
);
await p.screenshot({ path: path.join(root, ".verify/invoice-accounting.png") });
await tap("#accountingRoot [data-invoice-open]");
const form0 = await ev(() => ({
  open: !!document.getElementById("invForm"),
  title: document.querySelector("#sheet .sheetHead h3")?.textContent.trim(),
  series: document.getElementById("invSeries")?.value,
  number: document.getElementById("invNumber")?.value,
  date: document.getElementById("invDate")?.value,
  mode: document.getElementById("ct_invMode")?.value,
  help: !!document.querySelector('#sheet .ahTrigV81[data-help="sutartys"]')
}));
check(form0.open && form0.title.startsWith("Sąskaita faktūra"), "atidaromas sąskaitos faktūros langas");
check(
  form0.series === "AE" && form0.number === "0001",
  `numeracija: serija ${form0.series}, Nr. ${form0.number}`
);
check(form0.mode === "none", "be PVM kodo numatytas režimas – „Be PVM“");
check(!form0.help, "sąskaitos lange nerodomas sutarties „?“");
// Validacija
await ev(() => document.getElementById("invGenerate").click());
await p.waitForTimeout(250);
check(/markę ir modelį/.test(await lastToast()), "be automobilio – „Įrašykite markę ir modelį.“");
await ev(() => {
  const c = document.getElementById("invCar");
  c.value = "car-demo-2";
  c.dispatchEvent(new Event("change"));
});
await p.waitForTimeout(250);
const prefill = await ev(() => ({ price: document.getElementById("invPrice").value }));
check(prefill.price === "9100", "parduoto automobilio suma paimama iš kortelės (9100)");
const fill = vals =>
  ev(vs => {
    for (const [id, v] of Object.entries(vs)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, vals);
await fill({ invPrice: "8500", invBName: "", invSName: "", invSCode: "", invSAddress: "" });
await ev(() => document.querySelector('[data-ct-seg="invMode"] [data-seg-value="vat"]').click());
const calc = await ev(() => document.getElementById("invCalc").textContent);
check(
  /7\s024,79/.test(calc) &&
    /1\s475,21/.test(calc) &&
    /8\s500,00/.test(calc) &&
    /aštuoni tūkstančiai penki šimtai eurų 00 ct/.test(calc),
  "PVM 21 %: 7 024,79 + 1 475,21 = 8 500,00 €, suma žodžiais"
);
await ev(() => document.getElementById("invGenerate").click());
await p.waitForTimeout(250);
check(/įmonės pavadinimą, kodą ir adresą/.test(await lastToast()), "be pardavėjo rekvizitų – klaida");
await fill({
  invSName: "VISUREIGIAI, UAB",
  invSCode: "305123456",
  invSAddress: "Savanorių pr. 100, LT-03150 Vilnius",
  invSVat: "",
  invSBank: "AB SEB bankas",
  invSIban: "LT12 1000 0111 0100 1000",
  invSIssuer: "Petras Petraitis"
});
await ev(() => document.getElementById("invGenerate").click());
await p.waitForTimeout(250);
check(/PVM mokėtojo kodo/.test(await lastToast()), "PVM sąskaitai be PVM kodo – klaida");
await fill({ invSVat: "LT12345" });
await ev(() => document.getElementById("invGenerate").click());
await p.waitForTimeout(250);
check(/LT ir 9 arba 12 skaitmenų/.test(await lastToast()), "netinkamas PVM kodas – klaida");
await fill({ invSVat: "LT100012345612", invSIban: "LT12 1000 0111 0100 1001" });
await ev(() => document.getElementById("invGenerate").click());
await p.waitForTimeout(250);
check(/IBAN/.test(await lastToast()), "neteisingas IBAN (kontrolinė suma) – klaida");
await fill({ invSIban: "LT12 1000 0111 0100 1000" });
await ev(() => document.getElementById("invGenerate").click());
await p.waitForTimeout(250);
check(/pirkėją/.test(await lastToast()), "be pirkėjo – klaida");
await fill({
  invBName: "Jonas Jonaitis",
  invBCode: "38001010000",
  invBAddress: "Laisvės al. 1, LT-44001 Kaunas",
  invvin: "JTMHV05J604123456",
  invfirstRegistrationDate: "2018-05-14",
  invmileage: "145000",
  invplate: "KLM456"
});
await p.screenshot({ path: path.join(root, ".verify/invoice-form.png"), fullPage: true });
const docsBefore = (await st()).cars.find(c => c.id === "car-demo-2").documents?.length || 0;
await ev(() => document.getElementById("invGenerate").click());
await p.waitForSelector("#invResultV82.show", { timeout: 20000 });
await p.waitForTimeout(350);
const lock = () =>
  ev(() => {
    const ov = document.getElementById("invResultV82");
    const a = ov.querySelector(".dsActionsV82");
    return {
      title: ov.querySelector("#dsTitleV82").textContent,
      meta: ov.querySelector(".dsMetaV82").textContent,
      labels: [...a.querySelectorAll("button")].map(x => x.textContent.trim()),
      locked:
        [...a.querySelectorAll("button")].every(x => x.disabled) &&
        getComputedStyle(a).opacity === "0.5" &&
        getComputedStyle(a).pointerEvents === "none",
      signs: [...ov.querySelectorAll("[data-ds-sign]")].map(x => [
        x.textContent.trim(),
        x.classList.contains("is-signed")
      ]),
      place: ov.querySelector("[data-ds-place]").disabled,
      text: ov.textContent
    };
  });
const l0 = await lock();
check(
  l0.title === "Sąskaita faktūra sukurta" && /serija AE Nr\. 0001/.test(l0.meta),
  `langas: ${l0.title} · ${l0.meta}`
);
check(
  JSON.stringify(l0.labels) === JSON.stringify(["Siųsti", "Peržiūrėti", "Atsisiųsti į įrenginį"]) &&
    l0.locked,
  "Siųsti / Peržiūrėti / Atsisiųsti į įrenginį – užrakinti"
);
check(
  JSON.stringify(l0.signs) ===
    JSON.stringify([
      ["Pasirašyti pirkėjui", false],
      ["Pasirašyti pardavėjui", false]
    ]) && l0.place,
  "Pasirašyti pirkėjui / pardavėjui – mėlyni, „Patalpinti parašus“ neaktyvus"
);
check(!/telefon/i.test(l0.text), "be žodžio „telefonas“");
async function sign(key) {
  await p.click(`#invResultV82 [data-ds-sign="${key}"]`);
  await p.waitForSelector("#spRootV82.show");
  await p.waitForTimeout(360);
  const box = await (await p.$(".spCanvasV82")).boundingBox();
  for (const pts of [
    Array.from({ length: 24 }, (_, i) => [0.2 + (i / 23) * 0.55, 0.55 - Math.sin(i / 3.2) * 0.15]),
    [
      [0.3, 0.74],
      [0.75, 0.7]
    ]
  ]) {
    await p.mouse.move(box.x + pts[0][0] * box.width, box.y + pts[0][1] * box.height);
    await p.mouse.down();
    for (const [x, y] of pts.slice(1))
      await p.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 4 });
    await p.mouse.up();
  }
  await p.click("[data-sp-done]");
  await p.waitForTimeout(420);
}
await sign("buyer");
const l1 = await lock();
check(
  l1.signs[0][1] && !l1.signs[1][1] && l1.place && l1.locked,
  "pirkėjas pasirašė – žalias; veiksmai dar užrakinti"
);
await sign("seller");
const l2 = await lock();
check(
  l2.signs.every(x => x[1]) && !l2.place && l2.locked,
  "abu pasirašė – „Patalpinti parašus“ aktyvus, veiksmai užrakinti"
);
check(
  ((await st()).cars.find(c => c.id === "car-demo-2").documents?.length || 0) === docsBefore,
  "iki patalpinimo sąskaita neprisegta"
);
await p.click("#invResultV82 [data-ds-place]");
await p.waitForSelector("#invResultV82 .dsPlaceBtnV82.is-done", { timeout: 20000 });
await p.waitForTimeout(350);
await p.screenshot({ path: path.join(root, ".verify/invoice-signed.png") });
const l3 = await lock();
check(
  !l3.labels.length || (!l3.locked && l3.title === "Sąskaita faktūra pasirašyta"),
  "po patalpinimo – atrakinta, „Sąskaita faktūra pasirašyta“"
);
const [dl] = await Promise.all([
  p.waitForEvent("download"),
  ev(() => document.querySelector("#invResultV82 [data-ds-download]").click())
]);
const pdf = fs.readFileSync(await dl.path());
fs.writeFileSync(path.join(root, ".verify/invoice.pdf"), pdf);
check(
  dl.suggestedFilename() === "SF-AE-0001-Toyota-RAV4.pdf" && pdf.slice(0, 5).toString() === "%PDF-",
  "atsisiunčiamas PDF: " + dl.suggestedFilename()
);
const s1 = await st();
const car2 = s1.cars.find(c => c.id === "car-demo-2");
check(
  car2.documents.length === docsBefore + 1 &&
    car2.documents.some(d => d.kind === "invoice" && d.name === "SF-AE-0001-Toyota-RAV4.pdf"),
  "pasirašyta sąskaita prisegta prie automobilio (Sąskaitos)"
);
check(
  s1.accounting.invoice.seq === 1 && s1.accounting.invoice.issued.includes("AE-0001"),
  "numeris užfiksuotas (seq 1)"
);
check(
  s1.accounting.pp.company.vatCode === "LT100012345612" &&
    s1.accounting.pp.company.iban === "LT121000011101001000",
  "rekvizitai (PVM kodas, IBAN) įsiminti"
);
// Pakartotinai tame pačiame lange – tas pats numeris leidžiamas (pataisymas), prisegimas nepasikartoja
await ev(() => document.querySelector("#invResultV82 [data-ds-close]").click());
await p.waitForTimeout(250);
await ev(() => document.getElementById("invGenerate").click());
await p.waitForSelector("#invResultV82.show", { timeout: 20000 });
await sign("buyer");
await sign("seller");
await p.click("#invResultV82 [data-ds-place]");
await p.waitForSelector("#invResultV82 .dsPlaceBtnV82.is-done", { timeout: 20000 });
const car2b = (await st()).cars.find(c => c.id === "car-demo-2");
check(
  car2b.documents.filter(d => d.kind === "invoice").length === 1,
  "pataisyta sąskaita pakeičia ankstesnę (dokumentas nedubliuojamas)"
);
await ev(() => document.querySelector("#invResultV82 [data-ds-close]").click());
await p.waitForTimeout(250);
await ev(() => document.getElementById("invClose").click());
await p.waitForTimeout(300);
// Kitas langas: kitas numeris, dublikatas neleidžiamas
await tap("#accountingRoot [data-invoice-open]");
check((await ev(() => document.getElementById("invNumber").value)) === "0002", "kita sąskaita – Nr. 0002");
await fill({ invNumber: "0001" });
await ev(() => {
  const c = document.getElementById("invCar");
  c.value = "car-demo-2";
  c.dispatchEvent(new Event("change"));
});
await ev(() => document.getElementById("invGenerate").click());
await p.waitForTimeout(250);
check(/jau išrašyta/.test(await lastToast()), "tas pats numeris kitame lange – neleidžiama");
await ev(() => document.getElementById("invClose").click());
await p.waitForTimeout(300);

// ---------- Automobilio kortelė ----------
await tap('.navBtn[data-view="garage"]');
await ev(() =>
  [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === "car-demo-1").click()
);
await p.waitForTimeout(500);
// v83: PP sutartis ir sąskaita faktūra – juostos meniu „Dokumentai“
await ev(() => document.querySelector('#sheet [data-cc-menu="docs"]')?.click());
await p.waitForTimeout(250);
const cardBtn = await ev(() => {
  const m = document.querySelector('#sheet .carBottomActions [data-cc-menu-panel="docs"]');
  const btn = m?.querySelector("[data-inv-car]");
  const pp = m?.querySelector(".carPpBottomBtn");
  if (!btn || !pp || m.hidden) return null;
  const rb = btn.getBoundingClientRect(),
    rp = pp.getBoundingClientRect();
  return { text: btn.textContent.trim(), visible: rb.width > 0 && rp.width > 0, w: Math.round(rb.width) };
});
check(
  cardBtn && cardBtn.text === "Sąskaita faktūra" && cardBtn.visible,
  "kortelėje – „Sąskaita faktūra“ šalia „PP sutartis“ meniu „Dokumentai“ " + JSON.stringify(cardBtn)
);
await ev(() => document.querySelector("#sheet [data-inv-car]").click());
await p.waitForTimeout(400);
check(
  (await ev(() => document.getElementById("invCar")?.value)) === "car-demo-1",
  "iš kortelės – automobilis parinktas"
);
await ev(() => document.getElementById("invClose").click());
await p.waitForTimeout(400);
check(
  !!(await ev(() => document.querySelector("#sheet .carBottomActions [data-inv-car]"))),
  "uždarius grįžtama į automobilio kortelę"
);
await ev(() => document.querySelector("#sheet .closeBtn")?.click());

// ---------- Blankas: centravimas ir parašo vieta ----------
const geo = await ev(async () => {
  const I = window.AutoEasierInvoice;
  const d = {
    series: "AE",
    number: "0007",
    date: "2026-10-29",
    due: "",
    mode: "vat",
    pay: "bank",
    total: 8500,
    issuer: "Petras Petraitis",
    seller: {
      name: "VISUREIGIAI, UAB",
      code: "305123456",
      vat: "LT100012345612",
      address: "Savanorių pr. 100, Vilnius",
      bank: "AB SEB bankas",
      iban: "LT121000011101001000"
    },
    buyer: { name: "Jonas Jonaitis", code: "38001010000", vat: "", address: "Laisvės al. 1, Kaunas" },
    car: {
      make: "Toyota",
      model: "RAV4",
      vin: "JTMHV05J604123456",
      plate: "KLM456",
      firstReg: "2018-05-14",
      mileage: "145000"
    }
  };
  const blank = { ...d, series: "", number: "", seller: {}, buyer: {}, issuer: "", car: {}, total: 0 };
  const [a] = await I.render(d);
  const [z] = await I.render(blank);
  const S = a.width / 595.28;
  const box = (r, A = a, B = z, pad = 4) => {
    const x0 = Math.floor(r[0] * S),
      y0 = Math.floor((r[1] - pad) * S),
      x1 = Math.ceil(r[2] * S),
      y1 = Math.ceil(r[3] * S);
    const w = x1 - x0,
      h = y1 - y0;
    const da = A.getContext("2d").getImageData(x0, y0, w, h).data,
      db = B.getContext("2d").getImageData(x0, y0, w, h).data;
    let mnx = 1e9,
      mny = 1e9,
      mxx = -1,
      mxy = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (
          Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) >
          90
        ) {
          if (x < mnx) mnx = x;
          if (x > mxx) mxx = x;
          if (y < mny) mny = y;
          if (y > mxy) mxy = y;
        }
      }
    if (mxx < 0) return null;
    return {
      dx: (mnx + mxx) / 2 / S - w / 2 / S,
      mid: (mny + mxy) / 2 / S - pad,
      fieldMid: (h / S - pad) / 2,
      bottom: mxy / S - pad,
      fieldH: h / S - pad,
      left: mnx / S + r[0],
      right: mxx / S + r[0],
      h: (mxy - mny) / S
    };
  };
  const R = 561.8;
  const fields = {
    serija: [154, 70, 224, 91],
    numeris: [236, 70, 346, 91],
    pardavejas: [150, 126, R, 143],
    "pardavėjo kodas": [150, 166, 350, 183],
    "PVM kodas": [362, 166, R, 183],
    pirkejas: [150, 292, R, 309],
    "pirkėjo kodas": [150, 332, 350, 349],
    marke: [33.5, 508, 190, 526],
    modelis: [202, 508, 352, 526],
    VIN: [364, 508, R, 526],
    "suma žodžiais": [33.5, 668, R, 685]
  };
  const out = {};
  for (const [k, r] of Object.entries(fields)) out[k] = box(r);
  // parašas
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 200;
  const g = c.getContext("2d");
  g.lineWidth = 9;
  g.strokeStyle = "#13285e";
  g.beginPath();
  g.moveTo(10, 150);
  for (let i = 0; i < 60; i++) g.lineTo(10 + i * 9.6, 100 + Math.sin(i / 4) * 80);
  g.stroke();
  const img = new Image();
  img.src = c.toDataURL("image/png");
  await img.decode();
  const [signed] = await I.render(d, { seller: { img }, buyer: { img } });
  out.sig = box([150, 755 - 14, R, 772 + 4], signed, a, 0);
  out.name = box([150, 755, R, 772]);
  return out;
});
for (const k of [
  "serija",
  "numeris",
  "pardavejas",
  "pardavėjo kodas",
  "PVM kodas",
  "pirkejas",
  "pirkėjo kodas",
  "marke",
  "modelis",
  "VIN",
  "suma žodžiais"
]) {
  const g = geo[k];
  check(
    g && Math.abs(g.dx) <= 1.2 && Math.abs(g.mid - g.fieldMid) <= 2.6 && g.bottom <= g.fieldH + 0.2,
    `${k}: centruota (Δx ${g ? g.dx.toFixed(2) : "–"} pt, Δy ${g ? (g.mid - g.fieldMid).toFixed(2) : "–"} pt)`
  );
}
check(
  geo.sig && geo.name && geo.sig.left > geo.name.right + 6,
  "parašas dešinėje nuo „Sąskaitą išrašė“ vardo"
);
check(
  geo.sig && geo.sig.h >= 9.5 * 1.6 && geo.sig.h <= 9.5 * 2.7,
  `parašo aukštis ~2 vardo šrifto aukščiai: ${geo.sig?.h.toFixed(1)} pt`
);
const ib = await ev(() => [
  window.AutoEasierInvoice.iban("LT121000011101001000"),
  window.AutoEasierInvoice.iban("LT121000011101001001")
]);
check(ib[0] === true && ib[1] === false, "IBAN kontrolinė suma tikrinama");
check(!errors.length, "be JS klaidų " + errors.join("; "));
await b.close();
server.close();
console.log(fails.length ? `\n${fails.length} nepavyko` : "\nVisi sąskaitos faktūros testai praėjo");
process.exit(fails.length ? 1 : 0);
