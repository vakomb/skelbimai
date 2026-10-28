#!/usr/bin/env node
// XSS: visi tekstiniai laukai užpildomi <img onerror> ir <script>, atidaromi ekranai – niekas neturi įvykti.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = process.argv[2] || "dist/index.html";
const seed = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
const PAY = `"><img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=(window.__xss||0)+1">`;
let n = 0;
const poison = v => {
  if (typeof v === "string") return /^(photo|doc)_|^\d{4}-\d\d-\d\d|^data:|^[a-f0-9-]{20,}$|^(car|task|lead|tx|id)[-_]/i.test(v) || v.length > 200 ? v : (n++, v + PAY);
  if (Array.isArray(v)) return v.map(poison);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ["id", "status", "type", "view", "theme", "action", "kind", "cls", "monthKey"].includes(k) ? x : poison(x)]));
  return v;
};
const bad = poison(seed);
// v77: datos ir būsenos, rodomos automobilių kortelių apačioje, taip pat užnuodijamos
bad.cars.forEach(c => {
  if (c.soldDateISO) (c.soldDateISO += PAY), n++;
  c.sdkStatus = String(c.sdkStatus || "unset") + PAY;
  c.taUntil = "2027-01-01" + PAY;
  n += 2;
});
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on("dialog", d => d.dismiss());
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(s => localStorage.setItem("visureigiai_uab_v1", s), JSON.stringify(bad));
await p.goto("file://" + path.resolve(root, html));
await p.waitForTimeout(800);
await p.evaluate(() => { document.getElementById("autoEasierLogin").hidden = true; document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert")); });
const click = s => p.evaluate(s => document.querySelectorAll(s).forEach(e => { try { e.click(); } catch (x) {} }), s);
for (const v of ["garage", "accounting", "menu"]) {
  await click('.navBtn[data-view="' + v + '"]'); await p.waitForTimeout(250);
  for (const s of ["[data-garage-action]", "[data-accounting-panel]", "[data-open-car]"]) {
    const c = await p.evaluate(s => document.querySelectorAll(s).length, s);
    for (let i = 0; i < c; i++) {
      await p.evaluate(([s, i]) => document.querySelectorAll(s)[i]?.click(), [s, i]); await p.waitForTimeout(120);
      await p.evaluate(() => document.querySelectorAll("[data-close-sheet],.sheetClose,.closeBtn").forEach(e => e.click()));
    }
  }
}
await p.waitForTimeout(500);
if (process.env.DBG) console.log(await p.evaluate(() => [...document.querySelectorAll("img[onerror],svg[onload]")].map(e => { let a = e; while (a && !a.id && !(a.className||"").toString().match(/[A-Za-z]{4}/)) a = a.parentElement; const par = e.closest("[class],[id]"); return (e.closest("[id]")?.id || "") + " | " + (par?.className || "").toString().slice(0, 60) + " | " + (e.parentElement?.parentElement?.outerHTML || "").slice(0, 160).replace(/onerror=.*/, ""); }).join("\n")));
const x = await p.evaluate(() => window.__xss || 0);
console.log("užnuodyta laukų:", n, "| XSS suveikimų:", x);
const where = await p.evaluate(() => [...document.querySelectorAll("img[onerror],svg[onload]")].length);
console.log("pavojingų elementų DOM:", where);
await b.close();
process.exit(x || where ? 1 : 0);
