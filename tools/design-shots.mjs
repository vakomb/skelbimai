#!/usr/bin/env node
// Ekrano nuotraukos dizaino darbui: naujo auto forma, automobilio kortelė, redagavimas (visas aukštis).
// Naudojimas: node tools/design-shots.mjs [html=dist/index.html] [aplankas=.verify/design] [priešdėlis]
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [html = "dist/index.html", out = ".verify/design", tag = "now"] = process.argv.slice(2);
fs.mkdirSync(path.resolve(root, out), { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const errors = []; p.on("pageerror", e => errors.push(e.message));
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(s => localStorage.setItem("visureigiai_uab_v1", s), fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
await p.goto("file://" + path.resolve(root, html)); await p.waitForTimeout(900);
await p.evaluate(() => { document.getElementById("autoEasierLogin").hidden = true; document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert")); });
const tap = s => p.evaluate(s => document.querySelector(s)?.click(), s);
const full = async (sel, name) => {
  const h = await p.evaluate(sel => { const el = document.querySelector(sel); if (!el) return 0;
    document.querySelectorAll("details").forEach(d => (d.open = true));
    return Math.ceil(el.scrollHeight + el.getBoundingClientRect().top + 40); }, sel);
  await p.setViewportSize({ width: 430, height: Math.max(932, Math.min(h, 8000)) }); await p.waitForTimeout(300);
  await p.screenshot({ path: path.resolve(root, out, `${tag}-${name}.png`), fullPage: true });
  await p.setViewportSize({ width: 430, height: 932 });
};
await tap('[data-garage-action="addcar"]'); await p.waitForTimeout(500);
await p.evaluate(() => document.getElementById("addCarPanel").scrollIntoView());
await full("#addCarPanel", "addcar");
await p.reload(); await p.waitForTimeout(900);
await p.evaluate(() => { document.getElementById("autoEasierLogin").hidden = true; document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert")); });
await tap("#activeCarGrid [data-open-car], #activeCarGrid .carListCard"); await p.waitForTimeout(600);
await p.addStyleTag({ content: "#modalBackdrop{position:absolute!important;overflow:visible!important;height:auto!important}#sheet{max-height:none!important;height:auto!important;overflow:visible!important}" });
await full("#sheet", "card");
await tap("#editCarInfoBtn"); await p.waitForTimeout(600);
await full("#sheet", "edit");
console.log(errors.length ? "Klaidos: " + errors.join("; ") : "OK");
await b.close();
