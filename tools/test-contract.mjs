#!/usr/bin/env node
// Sutarties generatoriaus testas: pildo oficialią Regitros formą ir išsaugo .verify/contract.pdf
// v82: abiejų šalių parašai (piešiama pele ant canvas), „Siųsti / Peržiūrėti / Atsisiųsti į įrenginį“ užraktas iki
// „Patalpinti parašus“, prisegimas tik po patalpinimo, 6 laukų centravimas ir didesnis šriftas, parašo vieta ir dydis.
// Puslapis atidaromas per vietinį HTTP serverį (formos paveikslėliai kraunami iš ./assets/pp).
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
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 }, acceptDownloads: true });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
p.on("dialog", d => d.accept());
await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await p.addInitScript(
  s => localStorage.setItem("visureigiai_uab_v1", s),
  fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8")
);
await p.goto(base + "index.html");
await p.waitForTimeout(900);
await p.evaluate(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
const ev = (f, a) => p.evaluate(f, a);
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
await ev(() =>
  [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === "car-demo-1").click()
);
await p.waitForTimeout(500);
await ev(() => document.querySelector("#sheet .carPpBottomBtn").click());
await p.waitForTimeout(500);
const pre = await ev(() => ({
  form: !!document.getElementById("ctform"),
  make: document.getElementById("ctregMake")?.value,
  vin: document.getElementById("ctvin")?.value,
  car: document.getElementById("ctCar")?.value,
  role: document.getElementById("ct_role")?.value,
  price: document.getElementById("ctPrice")?.value,
  ta: document.getElementById("ct_ta")?.value
}));
check(
  pre.form && pre.car === "car-demo-1" && !pre.make && !pre.ta,
  "atidaroma iš kortelės; žinomi duomenys (markė, VIN, TA) neberodomi " + JSON.stringify(pre)
);
check(pre.role === "buyer" && pre.price === "4500", "įmonė perka, kaina = pirkimo kaina");
const dateInfo = await ev(() => {
  const i = document.getElementById("ctDate"),
    r = i.getBoundingClientRect();
  return {
    type: i.type,
    w: Math.round(r.width),
    h: Math.round(r.height),
    overlay: !!document.getElementById("dpOverlayV52")
  };
});
check(
  dateInfo.type === "date" && dateInfo.w > 150 && dateInfo.h >= 44 && !dateInfo.overlay,
  "datos laukas – platus sistemos laukas " + JSON.stringify(dateInfo)
);
await p.fill("#ctDate", "2026-10-15");
check((await ev(() => document.getElementById("ctDate").value)) === "2026-10-15", "data įrašoma");
const shown = await ev(() =>
  [
    "ctregMake",
    "ctvin",
    "ctplate",
    "ctmileage",
    "ctregistrationDoc",
    "ctsdk",
    "ctEvents",
    "ct_payment",
    "ctInsurance"
  ].filter(id => document.getElementById(id))
);
check(
  shown.join() === "ctregistrationDoc,ctsdk",
  "rodomi tik trūkstami laukai (liudijimo nr., SDK), be įvykių / atsiskaitymo / draudimo: " + shown.join()
);
const handHidden = await ev(() => document.getElementById("ctPartyWrap").hidden);
check(handHidden, "numatyta – kita šalis pildys ranka (laukai paslėpti)");
await ev(() => document.querySelector('[data-ct-seg="pmode"] [data-seg-value="app"]').click());
await ev(() => {
  const s = (id, v) => (document.getElementById(id).value = v);
  s("ctPName", "Jonas Jonaitis");
  s("ctPCode", "38001010000");
  s("ctPAddress", "Laisvės al. 1, Kaunas");
  s("ctPPhone", "+370 600 00000");
  s("ctPEmail", "jonas@pastas.lt");
  s("ctsdk", "AB12CD34");
  s("ctregistrationDoc", "K1281961");
});
const overflow = await ev(() =>
  [...document.querySelectorAll("#ctform *")]
    .filter(e => {
      const r = e.getBoundingClientRect(),
        c = e.closest(".cfCardV51")?.getBoundingClientRect();
      return c && r.width && r.right > c.right + 1;
    })
    .map(e => e.id || e.className)
    .slice(0, 5)
);
check(!overflow.length, "niekas neišlenda už kortelės ribų " + overflow.join(","));
await p.screenshot({ path: path.join(root, ".verify/contract-form.png") });
const docsBefore = await ev(
  () =>
    JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars.find(c => c.id === "car-demo-1").documents
      ?.length || 0
);
await ev(() => document.getElementById("ctGenerate").click());
await p.waitForFunction(() => !document.getElementById("ctResult").hidden, null, { timeout: 30000 });
await p.waitForSelector("#ctResultV56.show", { timeout: 5000 });
await p.waitForTimeout(350);
await p.screenshot({ path: path.join(root, ".verify/contract-done.png") });
const lockState = () =>
  ev(() => {
    const ov = document.getElementById("ctResultV56");
    const a = ov.querySelector(".dsActionsV82");
    const cs = getComputedStyle(a);
    return {
      labels: [...a.querySelectorAll(".ctBtnV56")].map(b => b.textContent.trim()),
      disabled: [...a.querySelectorAll("button")].every(b => b.disabled),
      opacity: cs.opacity,
      pe: cs.pointerEvents,
      place: ov.querySelector("[data-ds-place]").disabled,
      signs: [...ov.querySelectorAll("[data-ds-sign]")].map(b => [
        b.textContent.trim(),
        b.classList.contains("is-signed")
      ]),
      thumbLocked: getComputedStyle(ov.querySelector(".ctThumbV56")).pointerEvents === "none",
      text: ov.textContent
    };
  });
const l0 = await lockState();
check(
  JSON.stringify(l0.labels) === JSON.stringify(["Siųsti", "Peržiūrėti", "Atsisiųsti į įrenginį"]),
  "veiksmai: Siųsti, Peržiūrėti, Atsisiųsti į įrenginį " + JSON.stringify(l0.labels)
);
check(!/telefon/i.test(l0.text), "lange nėra žodžio „telefonas“ (naudojamas „įrenginys“)");
check(
  l0.disabled && l0.opacity === "0.5" && l0.pe === "none" && l0.thumbLocked,
  "iki parašų veiksmai užrakinti (opacity 0.5, pointer-events none, disabled) " +
    JSON.stringify([l0.opacity, l0.pe])
);
check(
  JSON.stringify(l0.signs) ===
    JSON.stringify([
      ["Pasirašyti pirkėjui", false],
      ["Pasirašyti pardavėjui", false]
    ]),
  "du parašo mygtukai, abu mėlyni " + JSON.stringify(l0.signs)
);
check(l0.place, "„Patalpinti parašus“ neaktyvus, kol nėra abiejų parašų");
const blue = await ev(
  () => getComputedStyle(document.querySelector('[data-ds-sign="buyer"]')).backgroundColor
);
// Parašas: keli brūkšniai (pirštas atitraukiamas ir piešiama toliau)
async function drawSignature(key, strokes) {
  await p.click(`#ctResultV56 [data-ds-sign="${key}"]`);
  await p.waitForSelector("#spRootV82.show", { timeout: 3000 });
  await p.waitForTimeout(380);
  const box = await (await p.$(".spCanvasV82")).boundingBox();
  const st = await ev(() => ({
    done: document.querySelector("[data-sp-done]").disabled,
    touch: getComputedStyle(document.querySelector(".spCanvasV82")).touchAction,
    labels: [...document.querySelectorAll(".spBarV82 button")].map(b => b.textContent.trim())
  }));
  check(
    st.done && st.touch === "none" && st.labels.join() === "Kartoti,Atlikta",
    `${key}: parašo langas – Kartoti / Atlikta, „Atlikta“ neaktyvus tuščiam laukui, touch-action: none`
  );
  for (const pts of strokes) {
    await p.mouse.move(box.x + pts[0][0] * box.width, box.y + pts[0][1] * box.height);
    await p.mouse.down();
    for (const [x, y] of pts.slice(1))
      await p.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 5 });
    await p.mouse.up();
  }
  await p.waitForTimeout(120);
}
const wave = y0 => Array.from({ length: 26 }, (_, i) => [0.15 + (i / 25) * 0.6, y0 + Math.sin(i / 3) * 0.12]);
// Kartoti išvalo be išdėstymo poslinkio
await drawSignature("buyer", [wave(0.5)]);
const padBox = await (await p.$(".spPadV82")).boundingBox();
const ink = () =>
  ev(() => {
    const c = document.querySelector(".spCanvasV82");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
const inkBefore = await ink();
await p.click("[data-sp-clear]");
await p.waitForTimeout(60);
const padBox2 = await (await p.$(".spPadV82")).boundingBox();
check(inkBefore > 200 && (await ink()) === 0, "„Kartoti“ visiškai išvalo lauką");
check(padBox.y === padBox2.y && padBox.height === padBox2.height, "„Kartoti“ – be išdėstymo poslinkio");
check(
  await ev(() => document.querySelector("[data-sp-done]").disabled),
  "po „Kartoti“ – „Atlikta“ vėl neaktyvus"
);
for (const pts of [
  wave(0.55),
  [
    [0.62, 0.35],
    [0.66, 0.72],
    [0.7, 0.4]
  ],
  [
    [0.2, 0.78],
    [0.8, 0.7]
  ]
]) {
  const box = await (await p.$(".spCanvasV82")).boundingBox();
  await p.mouse.move(box.x + pts[0][0] * box.width, box.y + pts[0][1] * box.height);
  await p.mouse.down();
  for (const [x, y] of pts.slice(1))
    await p.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 5 });
  await p.mouse.up();
}
await p.screenshot({ path: path.join(root, ".verify/contract-signpad.png") });
await p.click("[data-sp-done]");
await p.waitForTimeout(450);
const l1 = await lockState();
const green = await ev(
  () => getComputedStyle(document.querySelector('[data-ds-sign="buyer"]')).backgroundColor
);
check(
  !(await ev(() => !!document.querySelector("#spRootV82.show"))) && l1.signs[0][1] && !l1.signs[1][1],
  "pirkėjo „Atlikta“ uždaro langą, pirkėjo mygtukas – žalias"
);
check(blue !== green && /rgb\(75, 140, 113\)/.test(green), `spalva: ${blue} → ${green}`);
check(l1.place && l1.disabled, "vienas parašas – „Patalpinti parašus“ ir veiksmai dar užrakinti");
await drawSignature("seller", [
  [
    [0.2, 0.6],
    [0.3, 0.3],
    [0.35, 0.65],
    [0.45, 0.35],
    [0.5, 0.6],
    [0.7, 0.5],
    [0.8, 0.55]
  ],
  [
    [0.25, 0.75],
    [0.75, 0.72]
  ]
]);
await p.click("[data-sp-done]");
await p.waitForTimeout(450);
const l2 = await lockState();
check(
  l2.signs.every(x => x[1]) && !l2.place && l2.disabled,
  "abu parašai – „Patalpinti parašus“ aktyvus, veiksmai dar užrakinti"
);
const docsMid = await ev(
  () =>
    JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars.find(c => c.id === "car-demo-1").documents
      ?.length || 0
);
check(docsMid === docsBefore, "be patalpintų parašų sutartis neprisegama prie automobilio");
await p.click("#ctResultV56 [data-ds-place]");
await p.waitForSelector("#ctResultV56 .dsPlaceBtnV82.is-done", { timeout: 20000 });
await p.waitForTimeout(400);
await p.screenshot({ path: path.join(root, ".verify/contract-signed.png") });
const l3 = await lockState();
check(
  !l3.disabled && l3.opacity === "1" && l3.pe !== "none" && !l3.thumbLocked,
  "po „Patalpinti parašus“ veiksmai atrakinti " + JSON.stringify([l3.opacity, l3.pe])
);
check(
  (await ev(() => [...document.querySelectorAll("#ctResultV56 [data-ds-sign]")].every(b => b.disabled))) &&
    /Sutartis pasirašyta/.test(l3.text) &&
    /prisegta prie automobilio/.test(l3.text),
  "parašai užfiksuoti (mygtukai užrakinti), antraštė „Sutartis pasirašyta“, prisegta"
);
await ev(() => document.querySelector("#ctResultV56 [data-ds-view].ctBtnV56").click());
await p.waitForTimeout(300);
const pagesShown = await ev(() => document.querySelectorAll("#ctViewerV56 img").length);
check(pagesShown === 3, "peržiūra rodo 3 puslapius");
await p.screenshot({ path: path.join(root, ".verify/contract-viewer.png") });
await ev(() => document.querySelector("#ctViewerV56 .closeBtn").click());
await p.waitForTimeout(300);
const [dl] = await Promise.all([
  p.waitForEvent("download"),
  ev(() => document.querySelector("#ctResultV56 [data-ds-download]").click())
]);
const pdfPath = await dl.path();
const pdfBuf = fs.readFileSync(pdfPath);
check(
  /\.pdf$/.test(dl.suggestedFilename()) && pdfBuf.slice(0, 5).toString() === "%PDF-",
  "atsisiunčiamas PDF: " + dl.suggestedFilename()
);
check((pdfBuf.toString("latin1").match(/\/Type \/Page /g) || []).length === 3, "PDF – 3 puslapiai");
// „Siųsti“ (be dalinimosi palaikymo) – atsisiunčiama
const [dl2] = await Promise.all([
  p.waitForEvent("download"),
  ev(() => document.querySelector("#ctResultV56 [data-ds-send]").click())
]);
check(/\.pdf$/.test(dl2.suggestedFilename()), "„Siųsti“ be dalinimosi palaikymo – PDF atsisiunčiamas");
await ev(() => document.querySelector("#ctResultV56 [data-ds-close]").click());
await p.waitForTimeout(300);
fs.writeFileSync(path.join(root, ".verify/contract.pdf"), pdfBuf);
const car = await ev(() =>
  JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars.find(c => c.id === "car-demo-1")
);
check(
  (car.documents || []).length === docsBefore + 1 &&
    (car.documents || []).some(d => d.kind === "purchase" && /\.pdf$/.test(d.name)),
  "pasirašytas PDF prisegtas prie automobilio kaip pirkimo sutartis (vieną kartą)"
);
check(car.ppParty?.name === "Jonas Jonaitis", "kita šalis įsimenama");
check(
  car.sdk === "AB12CD34" && car.registrationDoc === "K1281961",
  "trūkę duomenys išsaugoti automobilio kortelėje"
);
// Langą galima atidaryti vėl – būsena išlieka
await ev(() => document.getElementById("ctReopen").click());
await p.waitForSelector("#ctResultV56.show");
const reopened = await lockState();
check(
  !reopened.disabled && reopened.signs.every(x => x[1]),
  "atidarius vėl – parašai ir atrakinti veiksmai išlieka"
);
await ev(() => document.querySelector("#ctResultV56 [data-ds-close]").click());
await p.waitForTimeout(300);

// ---------- PDF maketas: centravimas, šriftas, parašo vieta ----------
const geo = await ev(async () => {
  const A = window.AutoEasierContract;
  const S0 = 1655 / A.pagePt.w;
  const Y = A.yoff;
  const base = {
    number: "PP-T",
    date: "2026-10-29",
    time: "10:00",
    country: "Lietuva",
    seller: {
      type: "person",
      name: "Jonas Jonaitis",
      code: "38001010000",
      phone: "+370 600 00000",
      email: "jonas@pastas.lt",
      address: "Laisvės al. 1, Kaunas"
    },
    buyer: {
      type: "person",
      name: "Petras Petraitis",
      code: "38501010000",
      phone: "+370 611 11111",
      email: "petras@pastas.lt",
      address: "Gedimino pr. 2, Vilnius"
    },
    make: "Nissan",
    model: "X-Trail",
    price: 8500
  };
  const empty = { ...base, country: " ", seller: { type: "person" }, buyer: { type: "person" }, price: 0 };
  const [filled, blank] = await Promise.all([A.render(base), A.render(empty)]);
  const diffBox = (pi, r, a = filled, b = blank) => {
    const S = a[pi].width / A.pagePt.w;
    // Sritis 5 pt aukščiau lauko: lietuviškų raidžių ženklai (š, ū, ė) gali būti virš lauko viršaus
    const pad = 5;
    const x0 = Math.floor(r[1] * S),
      y0 = Math.floor((r[2] + Y - pad) * S),
      x1 = Math.ceil(r[3] * S),
      y1 = Math.ceil((r[4] + Y) * S);
    const w = x1 - x0,
      h = y1 - y0;
    const da = a[pi].getContext("2d").getImageData(x0, y0, w, h).data;
    const db = b[pi].getContext("2d").getImageData(x0, y0, w, h).data;
    let minX = 1e9,
      minY = 1e9,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (
          Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) >
          90
        ) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    if (maxX < 0) return null;
    return {
      cx: (minX + maxX) / 2 / S,
      fieldCx: w / 2 / S,
      top: minY / S - pad,
      bottom: maxY / S - pad,
      h: (maxY - minY) / S,
      fieldH: h / S - pad,
      left: minX / S + r[1],
      right: maxX / S + r[1]
    };
  };
  const F = A.form;
  const fields = {
    country: F.country,
    sName: F.sName,
    sPhone: F.sPhone,
    sEmail: F.sEmail,
    sAddr: F.sAddr,
    bName: F.bName,
    bPhone: F.bPhone,
    bEmail: F.bEmail,
    bAddr: F.bAddr,
    priceWords: F.priceWords
  };
  const out = {};
  for (const [k, r] of Object.entries(fields)) out[k] = diffBox(r[0], r);
  // Vardas prie parašo (9,5 pt) – palyginimui su centruotais (11 pt)
  out.sSign = diffBox(F.sSign[0], F.sSign);
  // Parašas: sintetinis PNG
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
  const signed = await A.render(base, { seller: { img }, buyer: { img } });
  const sig = diffBox(
    F.sSign[0],
    [F.sSign[0], F.sSign[1], F.sSign[2] - 14, F.sSign[3], F.sSign[4] + 4],
    signed,
    filled
  );
  return { out, sig, sSign: F.sSign, Y, S0 };
});
for (const k of [
  "country",
  "sName",
  "sPhone",
  "sEmail",
  "sAddr",
  "bName",
  "bPhone",
  "bEmail",
  "bAddr",
  "priceWords"
]) {
  const g = geo.out[k];
  const mid = g ? (g.top + g.bottom) / 2 : 0;
  const ok =
    g &&
    Math.abs(g.cx - g.fieldCx) <= 1.2 &&
    Math.abs(mid - g.fieldH / 2) <= 2.6 &&
    g.top >= -3 &&
    g.bottom <= g.fieldH + 0.2;
  check(
    ok,
    `${k}: centruota lauke (Δx ${g ? (g.cx - g.fieldCx).toFixed(2) : "–"} pt, Δy ${g ? (mid - g.fieldH / 2).toFixed(2) : "–"} pt, neužlipa ant linijos)` +
      (ok ? "" : JSON.stringify(g))
  );
}
const capName = geo.out.sName.h,
  capSign = geo.out.sSign.h;
check(
  capName / capSign > 1.08,
  `centruoti laukai didesniu šriftu: ${capName.toFixed(1)} pt vs ${capSign.toFixed(1)} pt`
);
const lineY = geo.sSign[4] - (geo.sSign[2] - 14);
check(
  geo.sig && geo.sig.left > geo.out.sSign.right + 6,
  `parašas dešinėje nuo vardo (vardas iki ${geo.out.sSign.right.toFixed(0)} pt, parašas nuo ${geo.sig?.left.toFixed(0)} pt)`
);
check(
  geo.sig && geo.sig.h >= 9.5 * 1.6 && geo.sig.h <= 9.5 * 2.7,
  `parašo aukštis ~2 vardo šrifto aukščiai: ${geo.sig?.h.toFixed(1)} pt`
);
check(geo.sig && geo.sig.bottom <= lineY + 2.2, "parašas neužlipa ant užrašo po linija");
await ev(() => document.querySelector("#ctClose").click());
await p.waitForTimeout(300);
await ev(() => document.querySelector('.navBtn[data-view="garage"]').click());
await p.waitForTimeout(400);
// v78: Garažo „Generuoti sutartį“ atidaro sutarties langą čia pat Garaže ir sutartis sugeneruojama
await ev(() => {
  document.querySelectorAll("#ctResultV56, .ctResultV56").forEach(n => n.remove());
  if (typeof window.AutoEasierContract === "object") document.querySelector("#sheet .closeBtn")?.click();
});
await ev(() => document.querySelector('.navBtn[data-view="garage"]').click());
await p.waitForTimeout(300);
await ev(() => document.querySelector('#view-garage [data-garage-action="contract"]').click());
await p.waitForTimeout(500);
const g = await ev(() => ({
  view: document.querySelector(".view.active")?.id,
  form: !!document.getElementById("ctform"),
  sheet: document.getElementById("modalBackdrop")?.classList.contains("show"),
  car: document.getElementById("ctCar")?.value
}));
check(
  g.view === "view-garage" && g.form && g.sheet && g.car === "",
  "Garažas → Generuoti sutartį atidaro sutarties langą Garaže " + JSON.stringify(g)
);
await ev(() => {
  const sel = document.getElementById("ctCar");
  sel.value = "car-demo-1";
  sel.dispatchEvent(new Event("change", { bubbles: true }));
});
await p.waitForTimeout(300);
await ev(() => {
  const s = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  };
  s("ctsdk", "AB12CD34");
  s("ctregistrationDoc", "K1281961");
  if (!document.getElementById("ctPrice").value) s("ctPrice", "4500");
});
await ev(() => document.getElementById("ctGenerate").click());
await p.waitForFunction(() => !document.getElementById("ctResult").hidden, null, { timeout: 30000 });
const gv = await ev(() => document.querySelector(".view.active")?.id);
check(gv === "view-garage", "sutartis sugeneruota neišėjus iš Garažo");
check(!errors.length, "be JS klaidų " + errors.join("; "));
server.close();
await b.close();
process.exit(fails.length ? 1 : 0);
