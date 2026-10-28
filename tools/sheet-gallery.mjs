#!/usr/bin/env node
// Visų iššokančių langų (sheet / modal) ekrano nuotraukos dizaino peržiūrai.
// Naudojimas: node tools/sheet-gallery.mjs [html=dist/index.html] [aplankas=.verify/sheets]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [html = "dist/index.html", outDir = ".verify/sheets"] = process.argv.slice(2);
const out = path.resolve(root, outDir);
fs.mkdirSync(out, { recursive: true });
const seed = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
seed.cars.push({
  id: "car-demo-3",
  name: "Audi Q5",
  regMake: "Audi",
  regModel: "Q5",
  buyPrice: 9000,
  status: "paruoštas",
  createdDateISO: "2026-10-01",
  checklist: [],
  photos: [],
  documents: []
});
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
p.on("dialog", d => d.dismiss());
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(s => localStorage.setItem("visureigiai_uab_v1", s), JSON.stringify(seed));
const boot = async () => {
  await p.goto("file://" + path.resolve(root, html));
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
};
const tap = s =>
  p.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, s);
const shot = async name => {
  await p.waitForTimeout(450);
  await p.screenshot({ path: path.join(out, name + ".png") });
};
const openCar = id =>
  p.evaluate(
    id => [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === id)?.click(),
    id
  );
const steps = [
  [
    "car-add-task",
    async () => {
      await openCar("car-demo-1");
      await p.waitForTimeout(400);
      await tap("#addChecklistBtn");
    }
  ],
  [
    "car-sell",
    async () => {
      await openCar("car-demo-3");
      await p.waitForTimeout(400);
      await tap("#sellCarBtn");
    }
  ],
  [
    "car-pp",
    async () => {
      await openCar("car-demo-1");
      await p.waitForTimeout(400);
      await tap(".carPpBottomBtn");
    }
  ],
  [
    "garage-task-edit",
    async () => {
      await tap('[data-garage-action="tasks"]');
      await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelectorAll("[data-task-section-toggle]").forEach(b => b.click()));
      await p.waitForTimeout(300);
      await tap("[data-edit-other-task], [data-edit-garage-task], .otherTaskEdit");
    }
  ],
  [
    "what-docs",
    async () => {
      await tap('[data-garage-action="what"]');
      await p.waitForTimeout(400);
      await p.evaluate(() =>
        [...document.querySelectorAll("[data-what-open]")].find(b => /docs/.test(b.dataset.whatOpen))?.click()
      );
    }
  ],
  [
    "what-status",
    async () => {
      await tap('[data-garage-action="what"]');
      await p.waitForTimeout(400);
      await p.evaluate(() =>
        [...document.querySelectorAll("[data-what-open]")]
          .find(b => /sdk|status|task/.test(b.dataset.whatOpen))
          ?.click()
      );
    }
  ],
  [
    "lead",
    async () => {
      await tap('[data-garage-action="leads"]');
      await p.waitForTimeout(400);
      await tap("#garageLeadRoot [data-open-lead], #garageLeadRoot .garageLeadCard");
    }
  ],
  [
    "contacts",
    async () => {
      await tap('.navBtn[data-view="menu"]'); await p.waitForTimeout(250); await tap('[data-menu-disclosure="customers"]');
      await p.waitForTimeout(400);
      await tap("#contactsRoot button");
    }
  ],
  [
    "acc-expense",
    async () => {
      await tap('.navBtn[data-view="accounting"]');
      await p.waitForTimeout(400);
      await tap('#accountingRoot [data-accounting-panel="expense"]');
    }
  ],
  [
    "acc-pp",
    async () => {
      await tap('.navBtn[data-view="accounting"]');
      await p.waitForTimeout(400);
      await tap('#accountingRoot [data-accounting-panel="pp"]');
    }
  ]
];
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
for (const [name, act] of steps) {
  if (only && !only.includes(name)) continue;
  await boot();
  try {
    await act();
  } catch (e) {
    errors.push(name + ": " + e.message);
  }
  await shot(name);
  const info = await p.evaluate(() => ({
    sheet: document.getElementById("modalBackdrop")?.classList.contains("show"),
    overlays: [...document.body.children]
      .filter(
        e =>
          /Modal|Backdrop|Overlay|Review|Mismatch|dpV52/.test(e.className || "") &&
          getComputedStyle(e).display !== "none"
      )
      .map(e => e.className)
      .slice(0, 3),
    dates: document.querySelectorAll('input[type="date"]').length
  }));
  console.log(name, JSON.stringify(info));
}
console.log(errors.length ? "Klaidos: " + errors.join(" | ") : "be klaidų");
await b.close();
