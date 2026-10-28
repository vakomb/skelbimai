#!/usr/bin/env node
// Užduočių skydelio (v62) testas: skirtukai, automobilio užduoties atlikimas su išlaidomis, nauja užduotis.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
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
await ev(() => document.querySelector('[data-garage-action="tasks"]').click());
await p.waitForTimeout(300);
const tabs = await ev(() =>
  [...document.querySelectorAll(".tkTabsV62 [data-tk-tab]")].map(t => t.dataset.tkTab + "=" + t.querySelector("b").textContent)
);
check(tabs.length === 3, "trys skirtukai " + tabs.join(", "));
const oldHidden = await ev(() =>
  [...document.querySelectorAll("#garageTasksSection > .garageUnifiedSection")].every(s => !s.offsetHeight)
);
check(oldHidden, "senos skiltys paslėptos");
await ev(() => document.querySelector('[data-tk-tab="autos"]').click());
await p.waitForTimeout(150);
const before = await ev(() => document.querySelectorAll('.tkRowV62[data-tk-kind="car"]').length);
await ev(() => document.querySelector('.tkRowV62[data-tk-kind="car"] [data-tk-done]').click());
await p.waitForTimeout(150);
check(
  await ev(() => !!document.querySelector(".tkRowV62 .tcPanelV65 [data-tc-amount]")),
  "atliekant automobilio užduotį išslenka kaina ir čekis"
);
await ev(() => document.querySelector(".tcPanelV65 [data-tc-done]").click());
await p.waitForTimeout(700);
const after = await ev(() => document.querySelectorAll('.tkRowV62[data-tk-kind="car"]').length);
check(after === before - 1, `automobilio užduotis atlikta (${before} → ${after})`);
await ev(() => document.querySelector('[data-garage-what-back]')?.click());
await p.waitForTimeout(300);
await ev(() => {
  if (!document.getElementById("garageTasksSection").classList.contains("is-open"))
    document.querySelector('[data-garage-action="tasks"]').click();
});
await p.waitForTimeout(300);
await ev(() => document.querySelector('[data-tk-tab="custom"]').click());
await ev(() => document.querySelector("[data-tk-add]").click());
await p.fill("#tkNewTitleV62", "Testinė užduotis");
await ev(() => document.querySelector(".tkSaveV62").click());
await p.waitForTimeout(400);
const saved = await ev(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")).garageTasks.some(t => t.title === "Testinė užduotis"));
check(saved, "nauja užduotis išsaugota");
check(
  await ev(() => [...document.querySelectorAll(".tkRowV62 strong")].some(s => s.textContent === "Testinė užduotis")),
  "nauja užduotis matoma sąraše"
);
check(await ev(() => document.getElementById("garageTasksSection").classList.contains("is-open")), "skydelis lieka atidarytas");
check(!errors.length, "be JS klaidų " + errors.join("; "));
await b.close();
process.exit(fails.length ? 1 : 0);
