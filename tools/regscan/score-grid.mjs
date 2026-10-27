#!/usr/bin/env node
// Įvertina sukauptus variantų OCR rezultatus su dabartiniu parseriu. Naudojimas: OUT=.verify/grid node score-grid.mjs <truth.json> [maxSide]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const RegScan = new Function(
  fs.readFileSync(path.join(here, "../../src/scripts/app/33-registration-scanner.js"), "utf8") +
    ";return RegScan;"
)();
const OUT = process.env.OUT || ".verify/grid";
const truth = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const maxSide = process.argv[3] || "2200";
const KEYS = [
  "make",
  "model",
  "regDoc",
  "vin",
  "plate",
  "firstRegistrationDate",
  "engineCc",
  "powerKw",
  "fuelType"
];
const files = fs.readdirSync(OUT).filter(f => f.endsWith(".json") && f.includes(`.${maxSide}.`));
const variants = [...new Set(files.map(f => f.split(`.${maxSide}.`)[1].slice(0, -5)))];
const per = {};
const sets = {};
for (const v of variants) {
  per[v] = 0;
  for (const img of Object.keys(truth)) {
    const f = path.join(OUT, `${img}.${maxSide}.${v}.json`);
    if (!fs.existsSync(f)) continue;
    const C = RegScan.parse(JSON.parse(fs.readFileSync(f, "utf8")));
    (sets[img] ||= {})[v] = C;
    const vals = RegScan.merge([C]).values;
    per[v] += KEYS.filter(k => String(vals[k] ?? "") === String(truth[img][k])).length;
  }
}
const ranked = Object.entries(per).sort((a, b) => b[1] - a[1]);
console.log("Pavieniai variantai (max " + Object.keys(truth).length * KEYS.length + "):");
ranked.slice(0, 12).forEach(([v, s]) => console.log("  " + s + "  " + v));
const combo = (
  process.env.COMBO ? JSON.parse(process.env.COMBO) : ranked.slice(0, 3).map(r => JSON.parse(r[0]))
).map(v => JSON.stringify(v));
let tot = 0;
for (const img of Object.keys(truth)) {
  const vals = RegScan.merge(combo.map(v => sets[img]?.[v]).filter(Boolean)).values;
  const bad = KEYS.filter(k => String(vals[k] ?? "") !== String(truth[img][k]));
  tot += KEYS.length - bad.length;
  if (process.env.VERBOSE) console.log(img, bad.map(k => `${k}:"${vals[k]}"≠"${truth[img][k]}"`).join(" | "));
}
console.log("Kombinacija", combo.join(" + "), "=>", tot);
