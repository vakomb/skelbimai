#!/usr/bin/env node
// UI auditas: kiekviename ekrane suranda per mažą tekstą (< MIN px), per mažus paspaudžiamus elementus (< 40 px aukščio),
// ir skirtingus mygtukų / laukų stilius. Naudojimas: MIN=13 node tools/ui-audit.mjs [html]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = process.argv[2] || "dist/index.html";
const MIN = Number(process.env.MIN || 13);
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
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on("dialog", d => d.dismiss());
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(s => localStorage.setItem("visureigiai_uab_v1", s), JSON.stringify(seed));
const boot = async () => {
  await p.goto("file://" + path.resolve(root, html));
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
};
const tap = s => p.evaluate(s => document.querySelector(s)?.click(), s);
const openCar = id =>
  p.evaluate(
    id => [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === id)?.click(),
    id
  );
const S = [
  ["garage", async () => {}],
  ["tasks", () => tap('[data-garage-action="tasks"]')],
  ["contacts", () => tap('[data-garage-action="contacts"]')],
  ["leads", () => tap('[data-garage-action="leads"]')],
  ["addcar", () => tap('[data-garage-action="addcar"]')],
  ["manager", () => tap('[data-garage-action="what"]')],
  ["accounting", () => tap('.navBtn[data-view="accounting"]')],
  [
    "acc-reports",
    async () => {
      await tap('.navBtn[data-view="accounting"]');
      await p.waitForTimeout(250);
      await tap('#accountingRoot [data-accounting-panel="reports"]');
    }
  ],
  [
    "acc-expense",
    async () => {
      await tap('.navBtn[data-view="accounting"]');
      await p.waitForTimeout(250);
      await tap('#accountingRoot [data-accounting-panel="expense"]');
    }
  ],
  [
    "menu-stats",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(250);
      await tap('[data-menu-disclosure="garage-stats"]');
    }
  ],
  [
    "menu-finance",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(250);
      await tap('[data-menu-disclosure="finance"]');
    }
  ],
  [
    "menu-settings",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(250);
      await tap('[data-menu-disclosure="settings"]');
    }
  ],
  [
    "menu-history",
    async () => {
      await tap('.navBtn[data-view="menu"]');
      await p.waitForTimeout(250);
      await tap('[data-menu-disclosure="history"]');
    }
  ],
  ["car", () => openCar("car-demo-1")],
  ["car-sold", () => openCar("car-demo-2")],
  [
    "car-addtask",
    async () => {
      await openCar("car-demo-1");
      await p.waitForTimeout(300);
      await tap("#addChecklistBtn");
    }
  ],
  [
    "what-item",
    async () => {
      await tap('[data-garage-action="what"]');
      await p.waitForTimeout(250);
      await tap("[data-what-open]");
    }
  ]
];
const report = {};
for (const [name, act] of S) {
  await boot();
  await act();
  await p.waitForTimeout(400);
  report[name] = await p.evaluate(MIN => {
    const vis = el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"
      );
    };
    const sel = el =>
      el.tagName.toLowerCase() +
      (el.id ? "#" + el.id : "") +
      [...el.classList]
        .slice(0, 2)
        .map(c => "." + c)
        .join("");
    const scope = document.getElementById("modalBackdrop")?.classList.contains("show")
      ? document.getElementById("sheet")
      : document.querySelector(".view.active");
    const small = {},
      taps = {};
    for (const el of scope.querySelectorAll("*")) {
      if (!vis(el)) continue;
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (own && fs < MIN) {
        const k = sel(el) + " " + fs + "px";
        small[k] = (small[k] || 0) + 1;
      }
      if (
        el.matches("button,a,.btn,input,select,label[for]") &&
        !el.matches("input[type=checkbox],input[type=file],input[type=hidden]")
      ) {
        const h = el.getBoundingClientRect().height;
        if (h < 38) {
          const k = sel(el) + " h" + Math.round(h);
          taps[k] = (taps[k] || 0) + 1;
        }
      }
    }
    return {
      small: Object.entries(small)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14),
      taps: Object.entries(taps).slice(0, 10)
    };
  }, MIN);
}
for (const [k, v] of Object.entries(report)) {
  console.log(`\n## ${k}`);
  if (v.small.length) console.log("  mažas tekstas: " + v.small.map(([s, n]) => `${s}×${n}`).join(" | "));
  if (v.taps.length) console.log("  maži mygtukai: " + v.taps.map(([s, n]) => `${s}×${n}`).join(" | "));
}
await b.close();
