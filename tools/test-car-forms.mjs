#!/usr/bin/env node
// Automobilio formų testas (be OCR): naujas automobilis ranka, TA / draudimo data, redagavimas,
// nerodomi laukai (planuojama kaina, kanalas, skelbimas) neturi būti prarasti.
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
p.on("dialog", d => d.accept());
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(
  s => localStorage.setItem("visureigiai_uab_v1", s),
  fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8")
);
await p.goto("file://" + path.join(root, "dist/index.html"));
await p.waitForTimeout(900);
await p.evaluate(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
const ev = (f, a) => p.evaluate(f, a);
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
await ev(() => document.querySelector('[data-garage-action="addcar"]').click());
await p.waitForTimeout(400);
const removed = await ev(() =>
  [
    "carName",
    "newVehicleyear",
    "newVehicleaskingPrice",
    "newVehiclesource",
    "newVehiclelistingStatus",
    "newVehiclelistingDate"
  ].filter(id => document.getElementById(id))
);
check(
  !removed.length,
  "nereikalingi laukai pašalinti iš naujo auto formos " + (removed.length ? removed.join(",") : "")
);
const hiddenBefore = await ev(
  () => getComputedStyle(document.querySelector('[data-cf-status="taStatus"] .cfUntilV51')).display
);
await ev(() => document.querySelector('[data-cf-status="taStatus"] [data-seg-value="valid"]').click());
const shownAfter = await ev(
  () => getComputedStyle(document.querySelector('[data-cf-status="taStatus"] .cfUntilV51')).display
);
check(
  hiddenBefore === "none" && shownAfter !== "none",
  `TA data atsiranda tik pasirinkus „Galioja“ (${hiddenBefore} → ${shownAfter})`
);
await ev(() => document.querySelector('[data-cf-status="insuranceStatus"] [data-seg-value="valid"]').click());
const datesEnabled = await ev(() =>
  ["newVehicletaUntil", "newVehicleinsuranceUntil"].map(id => !document.getElementById(id).disabled)
);
check(datesEnabled.every(Boolean), "pasirinkus „Galioja“ TA ir draudimo datas galima įvesti " + datesEnabled);
await p.fill("#newVehicletaUntil", "2027-03-01");
await ev(() => document.querySelector('[data-cf-status="insuranceStatus"] [data-seg-value="unknown"]').click());
await ev(() => document.getElementById("addCarBtn").click());
await p.waitForTimeout(300);
const toastMsg = await ev(() => document.getElementById("toastWrap").textContent);
check(/markę/.test(toastMsg), "be markės neišsaugo: " + toastMsg.trim().slice(0, 60));
await ev(() => {
  const set = (id, v) => (document.getElementById(id).value = v);
  set("newVehicleregMake", "Toyota");
  set("newVehicleregModel", "Land Cruiser");
  set("newVehiclebuyPrice", "12000");
  set("newVehiclemileage", "210000");
  set("newVehicletaUntil", "2027-03-01");
  set("newVehiclefirstRegistrationDate", "2015-06-10");
});
await ev(() => document.getElementById("addCarBtn").click());
await p.waitForTimeout(1200);
const car = await ev(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars[0]);
check(
  car.name === "Toyota Land Cruiser" && car.regMake === "Toyota" && car.regModel === "Land Cruiser",
  "pavadinimas = markė + modelis: " + car.name
);
check(
  car.year === 2015 &&
    car.taStatus === "valid" &&
    car.taUntil === "2027-03-01" &&
    car.insuranceStatus === "unknown",
  `metai iš registracijos ${car.year}, TA ${car.taStatus} ${car.taUntil}`
);
check(car.buyPrice === 12000 && car.mileage === 210000, "kaina ir rida");
// Redagavimas seno automobilio su planuojama kaina / kanalu / skelbimu
await ev(() => {
  document.querySelectorAll("#activeCarGrid [data-open-car], #activeCarGrid .carListCard").forEach(el => {
    if (/X-Trail/.test(el.textContent)) el.click();
  });
});
await p.waitForTimeout(600);
const cardOk = await ev(() => ({
  info: !!document.getElementById("cdInfoV51"),
  chips: document.querySelectorAll(".cdStatV60").length,
  oldInfoHidden: document.getElementById("carDetailInfo")?.hidden
}));
check(
  cardOk.info && cardOk.chips === 3 && cardOk.oldInfoHidden !== false,
  "kortelė: informacijos blokas ir būsenos " + JSON.stringify(cardOk)
);
await ev(() => document.getElementById("editCarInfoBtn").click());
await p.waitForTimeout(500);
await ev(() => {
  document.querySelector('#sheet [data-cf-status="taStatus"] [data-seg-value="invalid"]').click();
  document.getElementById("editVehicleregModel").value = "X-Trail 2.2";
  document.getElementById("editVehiclenotes").value = "Pastaba";
});
await ev(() => document.getElementById("saveCarEdit").click());
await p.waitForTimeout(900);
const ed = await ev(() =>
  JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars.find(c => c.id === "car-demo-1")
);
check(
  ed.name === "Nissan X-Trail 2.2" &&
    ed.taStatus === "invalid" &&
    ed.taUntil === "" &&
    ed.notes === "Pastaba",
  `redagavimas išsaugotas: ${ed.name}, TA ${ed.taStatus}`
);
check(
  ed.askingPrice === 6200 && ed.checklist.length === 3 && ed.buyPrice === 4500,
  "redaguojant neprarasti kiti duomenys (planuojama kaina, užduotys, kaina)"
);
const budget = await ev(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")).finances.budgetBalance);
check(budget === 12000 - 12000, "biudžetas: -12000 už naują auto, redagavimas jo nekeičia (" + budget + ")");
check(!errors.length, "be JS klaidų " + errors.join("; "));
await b.close();
process.exit(fails.length ? 1 : 0);
