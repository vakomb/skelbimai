#!/usr/bin/env node
// Sutarties generatoriaus testas: pildo oficialią Regitros formą ir išsaugo .verify/contract.pdf
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
await ev(() => document.getElementById("ctGenerate").click());
await p.waitForFunction(() => !document.getElementById("ctResult").hidden, null, { timeout: 30000 });
await p.waitForSelector("#ctResultV56.show", { timeout: 5000 });
await p.waitForTimeout(350);
await p.screenshot({ path: path.join(root, ".verify/contract-done.png") });
const done = await ev(() =>
  [...document.querySelectorAll("#ctResultV56 .ctBtnV56")].map(b => b.textContent.trim())
);
check(
  done.includes("Peržiūrėti") && done.some(t => /Siųsti|Atsisiųsti/.test(t)),
  "po sukūrimo rodomas langas su mygtukais: " + done.join(", ")
);
await ev(() => document.querySelector("#ctResultV56 [data-ct-view].ctBtnV56").click());
await p.waitForTimeout(300);
const pagesShown = await ev(() => document.querySelectorAll("#ctViewerV56 img").length);
check(pagesShown === 3, "peržiūra rodo 3 puslapius");
await p.screenshot({ path: path.join(root, ".verify/contract-viewer.png") });
await ev(() => document.querySelector("#ctViewerV56 .closeBtn").click());
await p.waitForTimeout(300);
const [dl] = await Promise.all([
  p.waitForEvent("download"),
  ev(() => document.querySelector("#ctResultV56 [data-ct-send]").click())
]);
const pdfPath = await dl.path();
const pdfB64 = fs.readFileSync(pdfPath).toString("base64");
check(/\.pdf$/.test(dl.suggestedFilename()), "atsisiunčiamas PDF: " + dl.suggestedFilename());
await ev(() => document.querySelector("#ctResultV56 [data-ct-close]").click());
await p.waitForTimeout(300);
fs.writeFileSync(path.join(root, ".verify/contract.pdf"), Buffer.from(pdfB64, "base64"));
const car = await ev(() =>
  JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars.find(c => c.id === "car-demo-1")
);
check(
  (car.documents || []).some(d => d.kind === "purchase" && /\.pdf$/.test(d.name)),
  "PDF prisegtas prie automobilio kaip pirkimo sutartis"
);
check(car.ppParty?.name === "Jonas Jonaitis", "kita šalis įsimenama");
check(
  car.sdk === "AB12CD34" && car.registrationDoc === "K1281961",
  "trūkę duomenys išsaugoti automobilio kortelėje"
);
await ev(() => document.querySelector("#ctClose").click());
await p.waitForTimeout(300);
await ev(() => document.querySelector('.navBtn[data-view="garage"]').click());
await p.waitForTimeout(400);
await ev(() => document.querySelector('#view-garage [data-garage-action="contract"]').click());
await p.waitForTimeout(500);
const acc = await ev(() => ({
  view: document.querySelector(".view.active")?.id,
  sources: [...document.querySelectorAll("[data-pp-source-mode]")].map(b => b.dataset.ppSourceMode).join(",")
}));
check(
  acc.view === "view-accounting" && acc.sources === "car,camera,gallery",
  "Garažas → Generuoti sutartį atidaro sutarčių generatorių (šaltinio pasirinkimas) " + JSON.stringify(acc)
);
check(!errors.length, "be JS klaidų " + errors.join("; "));
server.close();
await b.close();
process.exit(fails.length ? 1 : 0);
