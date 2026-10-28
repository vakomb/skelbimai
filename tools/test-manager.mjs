#!/usr/bin/env node
// Vadybininko (v72) testas: automatinės užduotys, kortelės, langai, kūrimas, atlikimas, atidėjimas.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 800 } });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(
  s => localStorage.setItem("visureigiai_uab_v1", s),
  fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8")
);
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const ev = (f, a) => p.evaluate(f, a);
await p.goto("file://" + path.join(root, "dist/index.html"));
await p.waitForTimeout(600);
await ev(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
const openMgr = async () => {
  await ev(() => document.querySelector('[data-garage-action="what"]').click());
  await p.waitForTimeout(400);
};
await openMgr();
check(await ev(() => !!document.querySelector(".mgPageV72")), "naujas Vadybininko puslapis");
const sum = await ev(() => [...document.querySelectorAll(".vdSumV65 b")].map(e => e.textContent));
check(sum.length === 3 && Number(sum[2]) > 0, "suvestinė " + sum.join("/"));
const groups = await ev(() => [...document.querySelectorAll(".mgGroupV72 .awTitleV69 strong")].map(e => e.textContent));
check(groups.includes("Skubu") && groups.length >= 2, "grupės: " + groups.join(", "));
const keys = await ev(() => [...document.querySelectorAll("[data-mg-open]")].map(e => e.dataset.mgOpen));
check(keys.some(k => k.endsWith(":missing-data")), "sugeneruota: trūkstami duomenys");
check(keys.some(k => k.endsWith(":missing-docs")), "sugeneruota: dokumentai");
check(keys.some(k => k.endsWith(":photos")), "sugeneruota: nuotraukos");
check(keys.some(k => k.includes(":task:")), "rodomos automobilio užduotys");
check(!(await ev(() => document.documentElement.scrollWidth > innerWidth)), "nėra horizontalaus slinkimo");

// Kiekvieno tipo langas atsidaro ir užsidaro
for (const k of keys) {
  await ev(k => document.querySelector(`[data-mg-open="${k}"]`).click(), k);
  await p.waitForTimeout(350);
  const opened = await ev(() => !!document.querySelector("#modalBackdrop.show, #modalBackdrop.open, #modalBackdrop[style*='flex']") || !!document.querySelector("#sheet")?.offsetHeight);
  check(opened, "langas atsidaro: " + k);
  await ev(() => document.querySelector("[data-mg-close], [data-what-close], #sheet .closeBtn")?.click());
  await p.waitForTimeout(300);
}

// Nauja užduotis
await ev(() => document.querySelector("[data-mg-new]").click());
await p.waitForTimeout(350);
await p.fill("#mg_title", "Testinė užduotis");
await p.click("#mgPrimaryV72");
await p.waitForTimeout(500);
const created = await ev(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")).garageTasks.some(t => t.title === "Testinė užduotis"));
check(created, "nauja užduotis sukurta");
check(await ev(() => document.getElementById("garageWhatRoot").innerText.includes("Testinė užduotis")), "nauja užduotis rodoma sąraše");

// Automobilio užduoties atlikimas
const taskKey = keys.find(k => k.includes(":task:"));
await ev(k => document.querySelector(`[data-mg-open="${k}"]`).click(), taskKey);
await p.waitForTimeout(350);
await p.click("#mgPrimaryV72");
await p.waitForTimeout(600);
const [, cid, , tid] = taskKey.split(":");
const done = await ev(([c, t]) => {
  const s = JSON.parse(localStorage.getItem("visureigiai_uab_v1"));
  return !!s.cars.find(x => x.id === c)?.checklist.find(i => i.id === t)?.done;
}, [cid, tid]);
check(done, "automobilio užduotis atlikta");

// Atidėjimas
const photoKey = keys.find(k => k.endsWith(":photos"));
await ev(k => document.querySelector(`[data-mg-open="${k}"]`)?.click(), photoKey);
await p.waitForTimeout(350);
await ev(() => document.querySelectorAll("[data-mg-link]")[0]?.click());
await p.waitForTimeout(400);
check(await ev(k => !document.querySelector(`[data-mg-open="${k}"]`), photoKey), "atidėta užduotis dingsta");

check(errors.length === 0, "JS klaidų nėra " + errors.join(" | "));
await b.close();
if (fails.length) {
  console.log("\nNEPAVYKO: " + fails.length);
  process.exit(1);
}
console.log("\nVisi Vadybininko testai praėjo.");
