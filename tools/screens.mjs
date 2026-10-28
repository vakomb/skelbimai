#!/usr/bin/env node
// Visų pagrindinių ekranų ir langų ekrano nuotraukos (pilno aukščio) dizaino peržiūrai.
// Naudojimas: node tools/screens.mjs [html=dist/index.html] [aplankas=.verify/screens] [priešdėlis=now]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [html = "dist/index.html", outDir = ".verify/screens", tag = "now"] = process.argv.slice(2);
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
  documents: [],
  plate: "LKM220"
});
seed.contactBook = {
  groups: [{ id: "g1", name: "Meistrai" }],
  contacts: [{ id: "c1", groupId: "g1", name: "Petras", phone: "+37060000001", note: "Kėbulas" }]
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
p.on("dialog", d => d.dismiss());
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(s => localStorage.setItem("visureigiai_uab_v1", s), JSON.stringify(seed));
const boot = async () => {
  await p.setViewportSize({ width: 430, height: 932 });
  await p.goto("file://" + path.resolve(root, html));
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
};
const tap = s =>
  p.evaluate(s => {
    const el = document.querySelector(s);
    el?.click();
    return !!el;
  }, s);
const tapText = (sel, re) =>
  p.evaluate(
    ([sel, re]) => {
      const el = [...document.querySelectorAll(sel)].find(e => new RegExp(re).test(e.textContent));
      el?.click();
      return !!el;
    },
    [sel, re]
  );
const full = async name => {
  await p.waitForTimeout(400);
  const sheet = await p.evaluate(() => document.getElementById("modalBackdrop")?.classList.contains("show"));
  if (sheet)
    await p.addStyleTag({
      content:
        "#modalBackdrop{position:absolute!important;height:auto!important;min-height:100%;overflow:visible!important}#sheet{max-height:none!important;height:auto!important;overflow:visible!important}"
    });
  const h = await p.evaluate(() => {
    const v = document.querySelector(".view.active");
    let bottom = 0;
    if (v)
      for (const el of v.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.height && getComputedStyle(el).display !== "none") bottom = Math.max(bottom, r.bottom);
      }
    return Math.max(bottom + 120, (document.getElementById("sheet")?.scrollHeight || 0) + 160);
  });
  await p.setViewportSize({ width: 430, height: Math.round(Math.min(Math.max(932, h), 6000)) });
  await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(out, `${tag}-${name}.png`) });
};
const openCar = id =>
  p.evaluate(
    id => [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === id)?.click(),
    id
  );
const S = [
  ["01-garage", async () => {}],
  ["02-tasks", () => tap('[data-garage-action="tasks"]')],
  [
    "03-contacts",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(300);
      await tap('[data-menu-disclosure="customers"]');
    }
  ],
  ["04-leads", () => tap('[data-garage-action="leads"]')],
  ["05-addcar", () => tap('[data-garage-action="addcar"]')],
  ["06-sold", () => tap("#toggleSoldCarsBtn")],
  ["07-manager", () => tap('[data-garage-action="what"]')],
  ["08-accounting", () => tap('.navBtn[data-view="accounting"]')],
  [
    "09-acc-reports",
    async () => {
      await tap('.navBtn[data-view="accounting"]');
      await p.waitForTimeout(300);
      await tap('#accountingRoot [data-accounting-panel="reports"]');
    }
  ],
  [
    "10-acc-expense",
    async () => {
      await tap('.navBtn[data-view="accounting"]');
      await p.waitForTimeout(300);
      await tap('#accountingRoot [data-accounting-panel="expense"]');
    }
  ],
  ["11-menu", () => tap('.navBtn[data-view="menu"]')],
  [
    "12-menu-stats",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(300);
      await tap('[data-menu-disclosure="garage-stats"]');
    }
  ],
  [
    "13-menu-finance",
    async () => {
      await tap('.navBtn[data-view="accounting"]');
      await p.waitForTimeout(300);
      await tap('#accountingRoot [data-accounting-finance]');
    }
  ],
  [
    "14-menu-settings",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(300);
      await tap('[data-menu-disclosure="settings"]');
    }
  ],
  [
    "15-menu-history",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(300);
      await tap('[data-menu-disclosure="history"]');
    }
  ],
  ["16-car", () => openCar("car-demo-1")],
  [
    "17-car-edit",
    async () => {
      await openCar("car-demo-1");
      await p.waitForTimeout(400);
      await tap("#editCarInfoBtn");
    }
  ],
  [
    "18-car-addtask",
    async () => {
      await openCar("car-demo-1");
      await p.waitForTimeout(400);
      await tap("#addChecklistBtn");
    }
  ],
  [
    "19-car-sell",
    async () => {
      await openCar("car-demo-3");
      await p.waitForTimeout(400);
      await tap("#sellCarBtn");
    }
  ],
  [
    "20-contract",
    async () => {
      await openCar("car-demo-1");
      await p.waitForTimeout(400);
      await tap(".carPpBottomBtn");
    }
  ],
  [
    "21-what-item",
    async () => {
      await tap('[data-garage-action="what"]');
      await p.waitForTimeout(300);
      await tap("[data-what-open]");
    }
  ],
  [
    "22-lead-open",
    async () => {
      await tap('[data-garage-action="leads"]');
      await p.waitForTimeout(300);
      await tap("[data-open-lead], #garageLeadRoot .garageLeadCard, #garageLeadRoot button");
    }
  ],
  [
    "23-contact-new",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(300);
      await tap('[data-menu-disclosure="customers"]');
      await p.waitForTimeout(300);
      await tapText("#contactsRoot button", "Naujas|Pridėti|＋|\\+");
    }
  ],
  [
    "24-sold-car",
    async () => {
      await tap("#toggleSoldCarsBtn");
      await p.waitForTimeout(300);
      await openCar("car-demo-2");
    }
  ],
  ["25-garage-contract", () => tap('[data-garage-action="contract"]')]
];
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
for (const [name, act] of S) {
  if (only && !only.some(o => name.startsWith(o))) continue;
  await boot();
  try {
    await act();
  } catch (e) {
    errors.push(name + ": " + e.message);
  }
  await full(name);
}
console.log(errors.length ? "Klaidos: " + errors.join(" | ") : "OK " + S.length);
await b.close();
