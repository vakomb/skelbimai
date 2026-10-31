#!/usr/bin/env node
// v93 Buhalterijos ataskaitų testas: skydelis (6 laikotarpiai, rezultatas, turinys, patikra) ir ZIP struktūra
// (Suvestine.html, Excel lentelės, 1-Parduoti / 2-Nupirkti / 4-Bendros aplankai, automobilio Ataskaita.html,
// Dokumentai, Cekiai), visos nuorodos HTML failuose veda į esamus failus. Dokumentai – netikri (downloadMedia).
// Naudojimas: node tools/test-reports.mjs   (nuotrauka – .verify/reports-panel.png)
// Senasis aprašas: Skeneris pakeičiamas netikru (window.AutoEasierRegScan.scan grąžina
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
const demoObj = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
demoObj.cars[1].documents = [{ key: "doc_p1", name: "pirkimo sutartis.pdf", kind: "purchase", addedDateISO: "2026-09-28" }, { key: "doc_s1", name: "Pardavimo-sutartis.pdf", kind: "sale", addedDateISO: "2026-10-20" }, { key: "doc_r1", name: "liudijimas.jpg", kind: "registration", addedDateISO: "2026-09-28" }];
demoObj.cars[0].documents = [{ key: "doc_p2", name: "sutartis.pdf", kind: "purchase", addedDateISO: "2026-10-10" }];
demoObj.finances.transactions[0].attachments = [{ key: "rc_1", name: "reklama.png" }];
const demoRaw = JSON.stringify(demoObj);
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
await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await p.goto(base + "index.html");
await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
await p.waitForTimeout(400);
await p.evaluate(() => { document.getElementById("autoEasierLogin").hidden = true; document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert")); });
await p.evaluate(() => document.querySelector(`.navBtn[data-view="garage"]`)?.click());
await p.waitForTimeout(600);
await p.evaluate(() => { window.AUTOEASIER_WORKSPACE = window.AUTOEASIER_WORKSPACE || {}; window.AUTOEASIER_WORKSPACE.downloadMedia = async k => new Blob(["%PDF-1.4 bandymas " + k], { type: "application/pdf" }); });
await p.evaluate(() => document.querySelector('.navBtn[data-view="accounting"]').click());
await p.waitForTimeout(300);
const b64 = await p.evaluate(async () => {
  const r = { from: "2026-10-01", to: "2026-10-31" };
  const pack = await window.AutoEasierReportsV93.build(r);
  const buf = new Uint8Array(await pack.blob.arrayBuffer());
  let s = ""; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return { name: pack.name, data: btoa(s), missing: pack.missing };
});
const zipPath = path.join(out, "reports-test.zip");
fs.writeFileSync(zipPath, Buffer.from(b64.data, "base64"));
check(/^Visureigiai-UAB-Ataskaita-2026-10-01-2026-10-31\.zip$/.test(b64.name), "ZIP pavadinimas: " + b64.name);
check(!b64.missing.length, "visi dokumentai įtraukti");
const { execSync } = await import("node:child_process");
const dir = path.join(out, "reports-test");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);
execSync(`unzip -q "${zipPath}" -d "${dir}"`);
const top = fs.readdirSync(dir);
check(top.length === 1, "vienas pagrindinis aplankas: " + top.join(", "));
const zbase = path.join(dir, top[0]);
const list = execSync(`cd "${zbase}" && find . -type f | sort`).toString().trim().split("\n").map(x => x.slice(2));
const has = re => list.some(f => re.test(f));
check(has(/^Suvestine\.html$/) && has(/^Lentele-Automobiliai\.csv$/) && has(/^Lentele-Islaidos-ir-iplaukos\.csv$/), "suvestinė ir Excel lentelės");
check(has(/^1-Parduoti-automobiliai\/01-Toyota-RAV4\/Ataskaita\.html$/), "parduotas automobilis – savas aplankas su ataskaita");
check(list.filter(f => /^1-Parduoti-automobiliai\/01-Toyota-RAV4\/Dokumentai\//.test(f)).length === 3, "parduoto automobilio visi 3 dokumentai");
check(has(/^2-Nupirkti-automobiliai\/01-Nissan-X-Trail-ABC123\/Dokumentai\/Pirkimo-sutartis\.pdf$/), "nupirkto automobilio pirkimo sutartis");
check(has(/^4-Bendros-islaidos-ir-iplaukos\/Cekiai\/2026-10-15-Reklama\.png$/), "bendros išlaidos čekis");
// Nuorodos HTML failuose
let broken = [];
for (const f of list.filter(f => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(zbase, f), "utf8");
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const target = path.join(zbase, path.dirname(f), decodeURIComponent(m[1]));
    if (!fs.existsSync(target)) broken.push(f + " → " + m[1]);
  }
}
check(!broken.length, "visos nuorodos veda į esamus failus " + broken.join(" | "));
const sum = fs.readFileSync(path.join(zbase, "Suvestine.html"), "utf8");
check(/Buhalterijos ataskaita/.test(sum) && /9\s100\s€/.test(sum) && /4\s455\s€/.test(sum), "suvestinėje pajamos ir rezultatas");
// Skydelis
await p.evaluate(() => document.querySelector('#accountingRoot [data-accounting-panel="reports"]')?.click());
await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('#accountingRoot [data-report-mode="month"]')?.click());
await p.waitForTimeout(400);
const ui = await p.evaluate(() => ({
  modes: document.querySelectorAll("#accountingRoot .rpModeV93").length,
  result: document.querySelector("#accountingRoot .rpResultV93 strong")?.textContent,
  tree: document.querySelectorAll("#accountingRoot .rpTreeV93 li").length,
  ok: !!document.querySelector("#accountingRoot .rpChecksV93 li"),
  btn: !!document.getElementById("accountingBuildReportV8")
}));
check(ui.modes === 6 && /4\s455/.test(ui.result || "") && ui.tree >= 4 && ui.ok && ui.btn, "skydelis: " + JSON.stringify(ui));
await p.evaluate(() => document.querySelector("#accountingRoot .rpV93")?.scrollIntoView({ block: "start" }));
await p.waitForTimeout(150);
await p.screenshot({ path: path.join(out, "reports-panel.png") });
await p.evaluate(() => document.querySelector('#accountingRoot [data-report-mode="prevMonth"]')?.click());
await p.waitForTimeout(300);
check((await p.textContent("#accountingRoot .rpPeriodV93")).includes("2026-09-01 – 2026-09-30"), "praėjęs mėnuo – 09-01–09-30");
const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(ov <= 1, "be horizontalaus perpildymo");
check(errors.length === 0, "be JS klaidų " + errors.join(" | "));
await b.close();
server.close();
if (fails.length) {
  console.log(`\n${fails.length} nepavyko`);
  process.exit(1);
}
console.log("\nVisi ataskaitų testai praėjo");
