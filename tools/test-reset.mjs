#!/usr/bin/env node
// „Ištrinti duomenis“: ištrina tik įmonės įrašus, palieka nustatymus/profilį, po to visi ekranai veikia ir po perkrovimo.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = process.argv[2] || "dist/index.html";
const seed = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
seed.profile = { type: "company", name: "Test UAB", code: "123456789", phone: "+37060000000", email: "t@t.lt", address: "Vilnius" };
seed.theme = "dark";
seed.accounting = { ...(seed.accounting || {}), email: "buh@t.lt" };
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const errs = [];
let fails = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error" && !/ERR_|Failed to load/.test(m.text())) errs.push(m.text()); });
p.on("dialog", d => d.accept());
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("visureigiai_uab_v1", s); sessionStorage.setItem("seeded", "1"); } }, JSON.stringify(seed));
const boot = async () => {
  await p.goto("file://" + path.resolve(root, html));
  await p.waitForTimeout(700);
  await p.evaluate(() => { document.getElementById("autoEasierLogin").hidden = true; document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert")); });
};
await boot();
const nav = async v => { await p.evaluate(v => document.querySelector('.navBtn[data-view="' + v + '"]')?.click(), v); await p.waitForTimeout(250); };
const cars0 = await p.evaluate(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars.length);
ok(cars0 > 0, "prieš ištrinimą yra automobilių (" + cars0 + ")");
await nav("menu");
await p.evaluate(() => document.getElementById("resetBtn").click());
await p.waitForTimeout(800);
const st = await p.evaluate(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")));
ok(st.cars.length === 0 && st.customers.length === 0 && st.garageTasks.length === 0, "automobiliai, klientai, užduotys ištrinti");
ok(st.finances.transactions.length === 0 && st.finances.debts.length === 0, "finansai ištrinti");
ok(st.accounting.queue.length === 0 && st.accounting.history.length === 0, "buhalterijos eilė ir istorija ištrinta");
ok(st.theme === "dark" && st.profile?.name === "Test UAB" && st.accounting.email === "buh@t.lt", "nustatymai, profilis, buhalterės el. paštas palikti");
ok(!!st.reportingRange?.from, "ataskaitų laikotarpis sukurtas iš naujo");
for (const v of ["garage", "accounting", "menu", "garage"]) await nav(v);
for (const a of ["tasks", "contacts", "leads", "addcar", "what"]) {
  await nav("garage");
  await p.evaluate(a => document.querySelector('[data-garage-action="' + a + '"]')?.click(), a);
  await p.waitForTimeout(250);
}
await nav("accounting");
for (const a of ["reports", "expense", "income", "contracts"]) {
  await p.evaluate(a => document.querySelector('#accountingRoot [data-accounting-panel="' + a + '"]')?.click(), a);
  await p.waitForTimeout(250);
}
await nav("menu");
await p.evaluate(() => { document.querySelectorAll("[data-menu-open],[data-menu-section],.menuDisclosureBtn,[data-stats-open]").forEach(e => e.click()); });
await p.waitForTimeout(300);
ok(errs.length === 0, "po ištrynimo visi ekranai be JS klaidų " + JSON.stringify(errs.slice(0, 3)));
await boot();
const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")));
ok(st2.cars.length === 0, "po perkrovimo duomenys išlieka tušti");
await nav("menu"); await nav("garage"); await nav("accounting");
ok(errs.length === 0, "po perkrovimo be JS klaidų " + JSON.stringify(errs.slice(0, 3)));
await b.close();
process.exit(fails ? 1 : 0);
