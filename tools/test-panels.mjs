#!/usr/bin/env node
// Išskleidžiamų skydelių testas (v59): vienodos antraštės „Pavadinimas | Uždaryti“, „Uždaryti“ ir pakartotinis paspaudimas suskleidžia.
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
const HEAD =
  ".accountingWorkspace.show .accountingWorkspaceHead, #menuInlineDisclosure .menuDisclosureHead, #garageTasksSection.is-open > .sectionHead, .garageInlineOpen .contactsHead, .garageInlineOpen > .sectionHead, #addCarPanel > .sectionHead";
const CASES = [
  ["Užduotys", ['[data-garage-action="tasks"]']],
  ["Variantai", ['[data-garage-action="leads"]']],
  ["Pridėti automobilį", ['[data-garage-action="addcar"]']],
  ["Pridėti įplauką", ['.navBtn[data-view="accounting"]', '#accountingRoot [data-accounting-panel="income"]']],
  ["Pridėti išlaidą", ['.navBtn[data-view="accounting"]', '#accountingRoot [data-accounting-panel="expense"]']],
  ["Ataskaitos", ['.navBtn[data-view="accounting"]', '#accountingRoot [data-accounting-panel="reports"]']],
  ["Pardavimų statistika", ['.navBtn[data-view="menu"]', '[data-menu-disclosure="garage-stats"]']],
  ["Finansai", ['.navBtn[data-view="accounting"]', '#accountingRoot [data-accounting-finance]']],
  ["Kontaktai", ['.navBtn[data-view="menu"]', '[data-menu-disclosure="customers"]']],
  ["Veiksmų istorija", ['.navBtn[data-view="menu"]', '[data-menu-disclosure="history"]']],
  ["Nustatymai", ['.navBtn[data-view="menu"]', '[data-menu-disclosure="settings"]']]
];
const head = () =>
  p.evaluate(sel => {
    const h = [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().height > 0);
    if (!h) return null;
    const vis = [...h.children].filter(c => c.getBoundingClientRect().height > 0);
    const r = h.getBoundingClientRect();
    const close = vis.at(-1),
      cr = close.getBoundingClientRect();
    return {
      parts: vis.map(c => c.textContent.trim()),
      h: Math.round(r.height),
      l: Math.round(r.left),
      w: Math.round(r.width),
      cw: Math.round(cr.width),
      ch: Math.round(cr.height),
      fs: getComputedStyle(vis[0]).fontSize
    };
  }, HEAD);
const ref = [];
for (const [title, seq] of CASES) {
  await p.goto("file://" + path.join(root, "dist/index.html"));
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  for (const s of seq) {
    await p.evaluate(s => document.querySelector(s).click(), s);
    await p.waitForTimeout(300);
  }
  const h = await head();
  check(
    h && h.parts.length === 2 && h.parts[0] === title && h.parts[1] === "Uždaryti",
    `${title}: antraštė ${JSON.stringify(h?.parts)}`
  );
  if (h) ref.push(h);
  await p.evaluate(sel => {
    const h = [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().height > 0);
    [...h.querySelectorAll("button")].find(b => b.textContent.trim() === "Uždaryti").click();
  }, HEAD);
  await p.waitForTimeout(350);
  check(!(await head()), `${title}: „Uždaryti“ suskleidžia`);
  if (seq.length === 1) {
    await p.evaluate(s => document.querySelector(s).click(), seq[0]);
    await p.waitForTimeout(300);
    check(!!(await head()), `${title}: vėl atsidaro`);
    await p.evaluate(s => document.querySelector(s).click(), seq[0]);
    await p.waitForTimeout(350);
    check(!(await head()), `${title}: antras paspaudimas suskleidžia`);
  }
}
const same = k => ref.every(r => r[k] === ref[0][k]);
if (process.env.DBG) console.log(ref.map(r => JSON.stringify(r)).join("\n"));
check(
  ["h", "l", "w", "cw", "ch", "fs"].every(same),
  "visų antraščių matmenys vienodi " + JSON.stringify(ref[0])
);
check(!errors.length, "be JS klaidų " + errors.join("; "));
await b.close();
process.exit(fails.length ? 1 : 0);
