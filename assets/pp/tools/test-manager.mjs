#!/usr/bin/env node
// Vadybininko testas (v74): puslapis, langai, regresijos (fonas, debesies atnaujinimas, nuotraukos, užduočių skydelis).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8");
const b = await chromium.launch();
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
async function fresh(w = 430, h = 932) {
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
  });
  await p.waitForTimeout(300);
  return p;
}
const openMgr = async p => {
  await p.evaluate(() => document.querySelector('[data-garage-action="what"]').click());
  await p.waitForTimeout(500);
};
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")));
const sheetOpen = p => p.evaluate(() => document.getElementById("modalBackdrop").classList.contains("show"));

// --- Puslapis ---
let p = await fresh();
await openMgr(p);
check(await p.evaluate(() => !!document.querySelector("#garageWhatRoot .garageWhatHero")), "rodoma svarbiausia užduotis (didelė kortelė)");
const keys = await p.evaluate(() => [...document.querySelectorAll("#garageWhatRoot [data-what-open]")].map(e => e.dataset.whatOpen));
check(keys.length >= 4, "užduočių eilutės: " + keys.length);
check(await p.evaluate(() => !document.querySelector(".vdSumV65, .mgPageV72")), "nėra suvestinės ir senojo v72 puslapio");
check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "nėra horizontalaus slinkimo");

// --- 6. Visi langai atsidaro ir užsidaro ---
for (const k of keys) {
  await p.evaluate(k => document.querySelector(`#garageWhatRoot [data-what-open="${k}"]`)?.click(), k);
  await p.waitForTimeout(350);
  const ok = (await sheetOpen(p)) || (await p.evaluate(() => document.querySelector(".view.active")?.id !== "view-garage-what"));
  check(ok, "atsidaro: " + k);
  await p.evaluate(() => {
    if (document.getElementById("modalBackdrop").classList.contains("show")) document.querySelector("#sheet [data-what-close], #sheet .closeBtn")?.click();
    else document.querySelector('[data-garage-action="what"]')?.click();
  });
  await p.waitForTimeout(250);
  await openMgr(p).catch(() => {});
}
const manageKeys = await p.evaluate(() => [...document.querySelectorAll("#garageWhatRoot [data-what-manage]")].map(e => e.dataset.whatManage));
for (const k of manageKeys) {
  await p.evaluate(k => document.querySelector(`#garageWhatRoot [data-what-manage="${k}"]`)?.click(), k);
  await p.waitForTimeout(250);
  check(await sheetOpen(p), "atsidaro (•••): " + k);
  await p.evaluate(() => document.querySelector("#sheet [data-what-close], #sheet .closeBtn")?.click());
  await p.waitForTimeout(200);
}
check(p.errors.length === 0, "JS klaidų nėra " + p.errors.join(" | "));
await p.close();

// --- 1. Grįžimas po >30 min su atidarytu langu ---
p = await fresh();
await openMgr(p);
await p.evaluate(() => document.querySelector('#garageWhatRoot [data-what-open$=":missing-data"]').click());
await p.waitForTimeout(400);
const hidden = v => p.evaluate(v => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => v });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (v ? "hidden" : "visible") });
  document.dispatchEvent(new Event("visibilitychange"));
}, v);
await hidden(true);
await p.evaluate(() => {
  const real = Date.now;
  Date.now = () => real() + 31 * 60 * 1000;
});
await hidden(false);
await p.waitForTimeout(500);
check((await sheetOpen(p)) && (await p.evaluate(() => document.querySelector(".view.active").id)) === "view-garage-what", "po >30 min langas ir Vadybininkas lieka");
await p.close();

// --- 2. Debesies atnaujinimas atidarius „Užpildyti duomenis“, tada išsaugojimas ---
p = await fresh();
await openMgr(p);
await p.evaluate(() => document.querySelector('#garageWhatRoot [data-what-open$=":missing-data"]').click());
await p.waitForTimeout(400);
await p.evaluate(() => {
  const d = window.AUTOEASIER_APP_DATA;
  d.replaceState(JSON.parse(JSON.stringify(d.getState())));
});
await p.waitForTimeout(300);
const vals = { vin: "WVWZZZ1JZXW000001", mileage: "123000", sdk: "SDK12345", plate: "ABC123", registrationDoc: "A1234567", year: "2015", buyPrice: "3000", regMake: "VW", regModel: "GOLF" };
await p.evaluate(vals => {
  document.querySelectorAll('#sheet [id^="what_"]').forEach(el => {
    const k = el.id.slice(5);
    if (el.tagName === "SELECT") el.value = "valid";
    else if (vals[k]) el.value = vals[k];
  });
}, vals);
await p.evaluate(() => document.getElementById("whatSaveMissingV30").click());
await p.waitForTimeout(700);
const st = await saved(p);
const car = st.cars.find(c => c.id === "car-demo-1");
check(car.sdk === "SDK12345" && car.regMake === "VW", "po atnaujinimo duomenys išsaugoti localStorage");
check(await p.evaluate(() => !document.querySelector('#garageWhatRoot [data-what-open="car:car-demo-1:missing-data"]')), "eilutė dingo iš sąrašo");
check(p.errors.length === 0, "JS klaidų nėra " + p.errors.join(" | "));
// Įrašas ištrintas kitame įrenginyje – nieko nerašoma
await openMgr(p);
await p.close();

// --- 3. Paspaudimas šalia lango uždaro vieną kartą ---
p = await fresh();
await p.evaluate(() => {
  window.__closed = 0;
  window.addEventListener("autoeasier:sheet-closed", () => window.__closed++);
  document.querySelector("[data-open-car]").click();
});
await p.waitForTimeout(500);
check(await sheetOpen(p), "kortelė atsidarė");
await p.mouse.click(5, 5);
await p.waitForTimeout(400);
check(!(await sheetOpen(p)) && (await p.evaluate(() => window.__closed)) === 1, "paspaudus šalia – užsidaro vieną kartą");
await p.close();

// --- 4. „Kita užduotis“ nuveda į užduočių skydelį ---
p = await fresh();
await openMgr(p);
await p.evaluate(() => document.querySelector('#garageWhatRoot [data-what-open^="task:"]').click());
await p.waitForTimeout(900);
const taskRow = await p.evaluate(() => {
  const row = document.querySelector('#garageTasksSection [data-tk-id]');
  if (!row) return null;
  const r = row.getBoundingClientRect();
  return { view: document.querySelector(".view.active").id, inView: r.top >= 0 && r.bottom <= innerHeight };
});
check(taskRow && taskRow.view === "view-garage" && taskRow.inView, "„Kita užduotis“ – skydelis atidarytas, eilutė ekrane");
await p.close();

// --- 5. Nuotraukos be talpyklos: nėra img src=photo_… ---
p = await fresh();
await p.evaluate(() => {
  const d = window.AUTOEASIER_APP_DATA;
  const s = JSON.parse(JSON.stringify(d.getState()));
  s.cars[0].photos = ["photo_x1234"];
  s.cars[0].imageSrc = "photo_x1234";
  d.replaceState(s);
});
await openMgr(p);
check(await p.evaluate(() => !document.querySelector('img[src^="photo_"]')), "nėra img[src^=photo_]");
check(await p.evaluate(() => !!document.querySelector("#garageWhatRoot [data-ph-ref]")), "tuščia vieta laukia nuotraukos (data-ph-ref)");
await p.close();

// --- Automobilio užduotis atsidaro išslenkančiame lange ---
p = await fresh();
await openMgr(p);
await p.evaluate(() => document.querySelector('#garageWhatRoot [data-what-open*=":task:"]').click());
await p.waitForTimeout(400);
check(await p.evaluate(() => !!document.querySelector("#sheet .tcPanelV65")), "automobilio užduotis – langas su kaina, čekiu ir „Atlikta“");
await p.click("#sheet [data-tc-done]");
await p.waitForTimeout(800);
check(!(await sheetOpen(p)), "atlikus langas užsidaro");
check(p.errors.length === 0, "JS klaidų nėra " + p.errors.join(" | "));
await p.close();

await b.close();
if (fails.length) {
  console.log("\nNEPAVYKO: " + fails.length);
  process.exit(1);
}
console.log("\nVisi Vadybininko testai praėjo.");
