#!/usr/bin/env node
// Ekranų dydžių testas (v64): telefonas – juosta apačioje; planšetė – tinkleliai ir plaukiojanti juosta;
// kompiuteris – šoninis meniu su logotipu, kortelių tinklelis, informacinis skydelis dešinėje.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demo = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
// Keli aktyvūs automobiliai, kad matytųsi tinklelis
const base = demo.cars.find(c => c.status !== "parduotas");
for (let n = 1; n <= 3; n++) demo.cars.push({ ...base, id: "car-grid-" + n, name: "Automobilis " + n, checklist: [] });
const fixture = JSON.stringify(demo);
const b = await chromium.launch();
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
async function open(w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  await p.route(/^https?:/, r => r.abort());
  await p.addInitScript(s => localStorage.setItem("visureigiai_uab_v1", s), fixture);
  await p.goto("file://" + path.join(root, "dist/index.html"));
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
    document.body.classList.remove("autoeasier-auth-locked");
  });
  await p.waitForTimeout(200);
  return p;
}
const info = p =>
  p.evaluate(() => {
    const r = e => e.getBoundingClientRect();
    const nav = r(document.querySelector(".navWrap .nav"));
    const cards = [...document.querySelectorAll("#activeCarGrid .carListCard")].map(c => Math.round(r(c).left));
    const top = document.querySelector(".app > .topbar");
    const tr = r(top);
    const hit = document.elementFromPoint(tr.left + 30, tr.top + 40);
    return {
      navW: Math.round(nav.width),
      navTop: Math.round(nav.top),
      navLeft: Math.round(nav.left),
      cols: new Set(cards).size,
      topbarVisible: !!hit && top.contains(hit),
      appW: Math.round(r(document.querySelector(".app")).width)
    };
  });
// Telefonas
let p = await open(430, 932);
let i = await info(p);
check(i.navTop > 800 && i.cols === 1, "telefonas: juosta apačioje, viena kortelių eilė " + JSON.stringify(i));
await p.close();
// Planšetė
p = await open(834, 1194);
i = await info(p);
check(i.navTop > 1000 && i.navW <= 520 && i.cols === 2, "planšetė: plaukiojanti juosta, 2 stulpeliai " + JSON.stringify(i));
await p.close();
// Kompiuteris
p = await open(1440, 900);
i = await info(p);
check(i.navLeft === 0 && i.navW >= 220 && i.navW <= 256 && i.topbarVisible, "kompiuteris: šoninis meniu su logotipu " + JSON.stringify(i));
check(i.cols >= 2, "kompiuteris: automobiliai tinklelyje (" + i.cols + " stulp.)");
await p.evaluate(() => document.querySelector('.navBtn[data-view="accounting"]').click());
await p.waitForTimeout(300);
check(
  await p.evaluate(() => document.querySelector(".view.active")?.id === "view-accounting"),
  "kompiuteris: šoninis meniu perjungia puslapius"
);
await p.evaluate(() => document.querySelector('.navBtn[data-view="garage"]').click());
await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector("[data-open-car]").click());
await p.waitForTimeout(500);
const sh = await p.evaluate(() => {
  const r = document.getElementById("sheet").getBoundingClientRect();
  return { right: Math.round(innerWidth - r.right), w: Math.round(r.width), h: Math.round(r.height) };
});
check(sh.right <= 20 && sh.w >= 560 && sh.h >= 880, "kompiuteris: kortelė atsidaro skydelyje dešinėje " + JSON.stringify(sh));
check(!p.errors.length, "be JS klaidų " + p.errors.join("; "));
await b.close();
process.exit(fails.length ? 1 : 0);
