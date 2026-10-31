#!/usr/bin/env node
// v86 kelių automobilių pridėjimo testas. Skeneris pakeičiamas netikru (window.AutoEasierRegScan.scan grąžina
// paruoštus duomenis su vėlavimu) – jokių tikrų liudijimų nuotraukų. Tikrina: 1 failas → vieno automobilio forma;
// 6 failai → paketo režimas, progresas, nepavykęs → „Pildyti ranka“, „Išsaugoti ir toliau“ atidaro kitą,
// dublikato įspėjimas, „Išsaugoti visus paruoštus“, biudžetas ir istorija kaip vieno pridėjimo, juodraščiai
// išlieka perkrovus („Tęsti“), be JS klaidų.
// Naudojimas: node tools/test-batch-add.mjs   (nuotraukos – .verify/batch-*.png)
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
  res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const out = path.join(root, ".verify");
fs.mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const KEY = "visureigiai_uab_v1";
const demoRaw = fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const file = name => ({ name, mimeType: "image/png", buffer: png });
// Netikro skenerio duomenys pagal failo vardą
const FAKE = {
  "a.png": { make: "Toyota", model: "RAV4", plate: "KBD122", vin: "JTMW1RFV0KD000001", firstRegistrationDate: "2019-04-12", regDoc: "K1000001", fuel: "Hibridas" },
  "b.png": { make: "Volkswagen", model: "Passat", plate: "HTR105", vin: "WVWZZZ3CZEE000002", firstRegistrationDate: "2014-03-01", regDoc: "K1000002" },
  "c.png": { make: "Audi", model: "A4", plate: "ABC123", vin: "WAUZZZ8K9DA000003", firstRegistrationDate: "2013-05-20", regDoc: "K1000003" },
  "d.png": { make: "Škoda", model: "Octavia", plate: "BNE771", vin: "TMBJJ7NE0J0000004", firstRegistrationDate: "2018-01-10", regDoc: "K1000004" },
  "e.png": "fail",
  "f.png": { make: "Volvo", model: "XC60", plate: "LMN456", vin: "YV1DZ8256C2000006", firstRegistrationDate: "2012-09-09", regDoc: "K1000006" },
  "g.png": { make: "BMW", model: "320d", plate: "GHJ321", vin: "WBA8E5G50GK000007", firstRegistrationDate: "2016-02-02", regDoc: "K1000007" },
  "h.png": { make: "Mazda", model: "CX-5", plate: "PRS654", vin: "JMZKF6W1600000008", firstRegistrationDate: "2017-07-07", regDoc: "K1000008" }
};
const b = await chromium.launch();
const errors = [];
const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
await ctx.addInitScript(([k, s, fake]) => {
  if (!sessionStorage.getItem("seeded")) {
    localStorage.setItem(k, s);
    sessionStorage.setItem("seeded", "1");
  }
  const install = () => {
    if (!window.AutoEasierRegScan) return setTimeout(install, 20);
    window.AutoEasierRegScan.scan = async f => {
      await new Promise(r => setTimeout(r, 120));
      const v = fake[f.name];
      if (!v || v === "fail") throw Error("OCR klaida");
      return { values: { ...v }, fields: {}, passes: 1 };
    };
  };
  install();
}, [KEY, demoRaw, FAKE]);
const p = await ctx.newPage();
p.on("pageerror", e => errors.push(e.message));
p.on("dialog", d => d.accept());
await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
const boot = async () => {
  await p.goto(base + "index.html");
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
};
const openAdd = async () => {
  await p.evaluate(() => document.querySelector('.navBtn[data-view="garage"]')?.click());
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-garage-action="addcar"]')?.click());
  await p.waitForTimeout(500);
};
const saved = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
await boot();
const before = await saved();
await openAdd();

// Įėjimas
const entry = await p.evaluate(() => ({
  multiple: document.getElementById("newVehicleregGallery")?.multiple,
  camera: !!document.getElementById("newVehicleregCamera"),
  manual: !!document.querySelector("#addCarPanel [data-bv-manual-entry]")
}));
check(entry.multiple && entry.camera && entry.manual, "trys būdai: Fotografuoti, Iš galerijos (kelios), Ranka " + JSON.stringify(entry));

// 1 failas – vieno automobilio forma (paketo režimas neįjungiamas)
await p.setInputFiles("#newVehicleregGallery", [file("a.png")]);
await p.waitForTimeout(500);
check(!(await p.$("#bvRootV86")) && !!(await p.$("#newVehicleform")), "1 liudijimas – vieno automobilio forma");

// 6 failai – paketas
await p.setInputFiles("#newVehicleregGallery", ["a.png", "b.png", "c.png", "d.png", "e.png", "f.png"].map(file));
await p.waitForTimeout(250);
const mid = await p.evaluate(() => ({
  root: !!document.getElementById("bvRootV86"),
  formHidden: getComputedStyle(document.getElementById("newVehicleform")).display === "none",
  count: document.querySelector("#bvRootV86 [data-bv-count]")?.textContent,
  items: document.querySelectorAll("#bvRootV86 [data-bv-item]").length
}));
check(mid.root && mid.formHidden && mid.items === 6, "6 liudijimai – paketo režimas, 6 kortelės " + JSON.stringify(mid));
check(/Nuskenuota \d iš 6/.test(mid.count || ""), "progresas: " + mid.count);
await p.screenshot({ path: path.join(out, "batch-scanning.png") });
await p.waitForFunction(() => /Visi 6 nuskenuoti/.test(document.querySelector("#bvRootV86 [data-bv-count]")?.textContent || ""), null, { timeout: 8000 });
const st = await p.evaluate(() =>
  [...document.querySelectorAll("#bvRootV86 [data-bv-item]")].map(el => ({
    cls: el.className,
    title: el.querySelector(".bvHeadTxtV86 strong")?.textContent,
    badge: el.querySelector(".bvBadgeV86")?.textContent
  }))
);
check(st.filter(x => /is-error/.test(x.cls)).length === 1 && /Nepavyko/.test(st[4].badge), "vienas nepavykęs: " + st[4].badge);
check(st[0].title === "Toyota RAV4" && /Trūksta: pirkimo kaina/.test(st[0].badge), "nuskenuotas: „Toyota RAV4“, trūksta pirkimo kainos");
check(/is-open/.test(st[0].cls), "pirmas nuskenuotas atidaromas iš karto");
const filled = await p.evaluate(() => ({
  make: document.getElementById("bv0regMake")?.value,
  plate: document.getElementById("bv0plate")?.value,
  mark: !!document.querySelector("#bv0regCard .regFilledV50")
}));
check(filled.make === "Toyota" && filled.plate === "KBD122" && filled.mark, "forma užpildyta iš liudijimo, laukai pažymėti");

// Išsaugoti ir toliau
await p.fill("#bv0buyPrice", "5000");
await p.waitForTimeout(250);
check(/Paruošta/.test(await p.textContent('[data-bv-item^="bv0-"] .bvBadgeV86')), "įrašius kainą – „Paruošta“");
await p.click('[data-bv-save^="bv0-"]');
await p.waitForTimeout(700);
let s = await saved();
const car0 = s.cars.find(c => c.plate === "KBD122");
check(!!car0 && car0.buyPrice === 5000 && car0.status === "aktyvus" && (car0.documents || []).some(d => d.kind === "registration"), "išsaugota kaip vieno automobilio (su registracijos dokumentu)");
check(Math.round(s.finances.budgetBalance) === Math.round(before.finances.budgetBalance - 5000), "biudžetas sumažėjo 5000 €");
check((s.history || []).some(h => /Automobilis nupirktas/.test(h.title) && /Toyota RAV4/.test(h.desc)), "istorijoje – „Automobilis nupirktas“");
const after0 = await p.evaluate(() => ({
  saved: /is-saved/.test(document.querySelector('[data-bv-item^="bv0-"]').className),
  open: document.querySelector("#bvRootV86 .bvItemV86.is-open")?.dataset.bvItem
}));
check(after0.saved && /^bv1-/.test(after0.open || ""), "„Išsaugoti ir toliau“ – kortelė „Pridėta“, atsidaro kita");
await p.screenshot({ path: path.join(out, "batch-form.png") });

// Dublikatas (ABC123 jau garaže)
await p.evaluate(() => document.querySelector('[data-bv-toggle^="bv2-"]').click());
await p.waitForTimeout(450);
await p.fill("#bv2buyPrice", "3000");
await p.waitForTimeout(250);
const dup = await p.evaluate(() => document.querySelector('[data-bv-item^="bv2-"] .bvWarnV86')?.textContent || "");
check(/jau garaže/.test(dup), "dublikato įspėjimas: " + dup.slice(0, 60));
await p.click('[data-bv-save^="bv2-"]');
await p.waitForTimeout(400);
check(!(await saved()).cars.some(c => c.vin === "WAUZZZ8K9DA000003"), "dublikatas be patvirtinimo neišsaugomas");
await p.click('[data-bv-dup-ok^="bv2-"]');
await p.waitForTimeout(150);

// Nepavykęs → Pildyti ranka
await p.evaluate(() => document.querySelector('[data-bv-toggle^="bv4-"]').click());
await p.waitForTimeout(450);
await p.click('[data-bv-manual^="bv4-"]');
await p.waitForTimeout(150);
await p.fill("#bv4regMake", "Opel");
await p.fill("#bv4regModel", "Astra");
await p.fill("#bv4buyPrice", "2500");
await p.waitForTimeout(250);
check(/Paruošta/.test(await p.textContent('[data-bv-item^="bv4-"] .bvBadgeV86')), "„Pildyti ranka“ → užpildžius – „Paruošta“");
// Kainos kitiems
for (const n of [1, 3]) {
  await p.evaluate(n => document.querySelector(`[data-bv-toggle^="bv${n}-"]`).click(), n);
  await p.waitForTimeout(450);
  await p.fill(`#bv${n}buyPrice`, String(4000 + n));
}
await p.waitForTimeout(250);
const saveAll = await p.textContent("#bvRootV86 [data-bv-save-all]");
check(/Išsaugoti visus paruoštus \(4\)/.test(saveAll), "juosta: " + saveAll);
await p.click("#bvRootV86 [data-bv-save-all]");
await p.waitForTimeout(1500);
s = await saved();
const added = s.cars.filter(c => ["KBD122", "HTR105", "ABC123", "BNE771"].includes(c.plate) && c.id !== "car-demo-1").length + (s.cars.some(c => c.regModel === "Astra") ? 1 : 0);
check(added >= 5, `„Išsaugoti visus paruoštus“ – pridėta iš viso ${added}`);
const left = await p.evaluate(() => document.querySelector("#bvRootV86 [data-bv-left]")?.textContent);
check(/Liko 1/.test(left || ""), "liko neišsaugotas be kainos (Volvo): " + left);
await p.evaluate(() => document.querySelector('[data-bv-skip^="bv5-"]')?.click() || document.querySelector('[data-bv-toggle^="bv5-"]').click());
await p.waitForTimeout(450);
await p.evaluate(() => document.querySelector('[data-bv-skip^="bv5-"]')?.click());
await p.waitForTimeout(400);
check(!!(await p.$("#bvRootV86 .bvDoneV86")), "visi sutvarkyti – santrauka „Pridėta …“");
await p.click("#bvRootV86 [data-bv-garage]");
await p.waitForTimeout(800);
check(!(await p.$("#bvRootV86")) && (await p.$$("#activeCarGrid .bvNewV86")).length >= 1, "„Į Garažą“ – nauji automobiliai paryškinti");

// Juodraščiai išlieka perkrovus
await openAdd();
await p.setInputFiles("#newVehicleregGallery", ["g.png", "h.png", "a.png"].map(file));
await p.waitForFunction(() => /Visi 3 nuskenuoti/.test(document.querySelector("#bvRootV86 [data-bv-count]")?.textContent || ""), null, { timeout: 8000 });
const firstPrefix = await p.evaluate(() => document.querySelector("#bvRootV86 .bvItemV86.is-open")?.dataset.bvItem.split("-")[0]);
await p.fill(`#${firstPrefix}buyPrice`, "7777");
await p.waitForTimeout(900);
await p.reload();
await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
await p.evaluate(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
await p.evaluate(() => document.querySelector('.navBtn[data-view="garage"]')?.click());
await p.waitForTimeout(900);
const banner = await p.evaluate(() => document.getElementById("bvResumeV86")?.textContent || "");
check(/Nebaigtas pridėjimas/.test(banner) && /3 automobiliai/.test(banner), "po perkrovimo – „Nebaigtas pridėjimas“: " + banner.slice(0, 60));
await p.click("#bvResumeV86 [data-bv-resume]");
await p.waitForTimeout(900);
const restored = await p.evaluate(p => ({
  items: document.querySelectorAll("#bvRootV86 [data-bv-item]").length,
  price: document.getElementById(p + "buyPrice")?.value,
  title: document.querySelector("#bvRootV86 .bvHeadTxtV86 strong")?.textContent
}), firstPrefix);
check(restored.items === 3 && restored.price === "7777", "„Tęsti“ – atkurti 3 automobiliai ir įvesta kaina " + JSON.stringify(restored));
await p.screenshot({ path: path.join(out, "batch-restored.png") });
const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(ov <= 1, "be horizontalaus perpildymo");
await p.click("#bvRootV86 [data-bv-cancel]");
await p.waitForTimeout(500);
check(!(await p.$("#bvRootV86")) && !!(await p.$("#newVehicleform")), "„Atšaukti“ – grįžtama į vieno automobilio formą");

check(errors.length === 0, "be JS klaidų " + errors.join(" | "));
await b.close();
server.close();
if (fails.length) {
  console.log(`\n${fails.length} nepavyko`);
  process.exit(1);
}
console.log("\nVisi kelių automobilių pridėjimo testai praėjo");
