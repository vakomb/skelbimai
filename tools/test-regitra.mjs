#!/usr/bin/env node
// v85: Regitros įrankiai („Draudimo patikra“, „SDK paieška“) pašalinti. Testas tikrina, kad jų neliko niekur:
// Meniu plytelių, skyrių, funkcijų vitrinos (v84) ir automobilio kortelės veiksmų, o TA / draudimo / SDK
// mygtukai kortelėje atidaro redagavimo formą ir uždarius grįžtama į kortelę.
// Naudojimas: node tools/test-regitra.mjs
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
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await p.addInitScript(raw => {
  if (!sessionStorage.getItem("seeded")) {
    localStorage.setItem("visureigiai_uab_v1", raw);
    sessionStorage.setItem("seeded", "1");
  }
}, fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await p.waitForTimeout(900);
await p.evaluate(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
check(!/eregitra\.lt/.test(html), "programoje nėra nuorodų į eregitra.lt paiešką");
await p.evaluate(() => document.querySelector('.navBtn[data-view="menu"]')?.click());
await p.waitForTimeout(400);
const menu = await p.evaluate(() => ({
  tiles: [...document.querySelectorAll("#view-menu .menuLinks .menuLink")].map(b => b.textContent.trim()),
  tools: document.querySelectorAll("#menu-tool-sdk, #menu-tool-ins, .menuToolV80").length
}));
check(!menu.tiles.some(t => /SDK paieška|Draudimo patikra/.test(t)) && !menu.tools, "Meniu: be „SDK paieška“ ir „Draudimo patikra“ " + JSON.stringify(menu.tiles));
check(menu.tiles.length === 4, "Meniu liko 4 skyriai");
check(
  await p.evaluate(() => !(window.AutoEasierFeatures?.list || []).some(f => /regitr/i.test(f.id + f.title))),
  "funkcijų vitrinoje Regitros patikrų nėra"
);
// Kortelėje TA / draudimas / SDK → redagavimo forma → atgal į kortelę
await p.evaluate(() => document.querySelector('.navBtn[data-view="garage"]')?.click());
await p.waitForTimeout(300);
await p.evaluate(() => [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === "car-demo-1").click());
await p.waitForTimeout(700);
for (const key of ["insurance", "sdk"]) {
  await p.evaluate(k => document.querySelector(`#sheet [data-cc-edit="${k}"]`)?.click(), key);
  await p.waitForTimeout(600);
  const edit = await p.evaluate(() => ({ head: document.querySelector("#sheet h3")?.textContent, menu: document.querySelector("#view-menu.active") }));
  check(/Redaguoti/.test(edit.head || "") && !edit.menu, `${key}: atidaroma redagavimo forma, ne Meniu`);
  await p.evaluate(() => document.getElementById("closeCarEdit")?.click());
  await p.waitForTimeout(600);
  check(await p.evaluate(() => document.getElementById("sheet")?.dataset.carV63 === "car-demo-1" && !!document.querySelector("#sheet.ccV83 [data-cc-data]")), `${key}: uždarius – vėl automobilio kortelė`);
}
check(errors.length === 0, "be JS klaidų " + errors.join(" | "));
await b.close();
server.close();
if (fails.length) {
  console.log(`\n${fails.length} nepavyko`);
  process.exit(1);
}
console.log("\nVisi Regitros pašalinimo testai praėjo");
