#!/usr/bin/env node
// Registracijos liudijimų skenerio testas tikroje naršyklėje (Chromium).
// Paleidžia tikrą src/scripts/app/33-registration-scanner.js kodą (nuotraukos paruošimas, pasvirimo
// taisymas, keli praėjimai, parseris), o OCR varikliu vietoje Tesseract.js naudoja vietinį `tesseract`
// (tas pats variklis, be interneto). Reikia: playwright, python3, tesseract.
//
// Naudojimas: node tools/regscan/test-regscan.mjs <aplankas-su-nuotraukomis> <truth.json>
// truth.json: { "failas.jpg": { "regDoc": "...", "vin": "...", ... } }
// ⚠️ Tikrų liudijimų nuotraukose yra asmens duomenų – nelaikykite jų repozitorijoje.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const engine = fs.readFileSync(path.join(here, "../../src/scripts/app/33-registration-scanner.js"), "utf8");
const [dir, truthFile] = process.argv.slice(2);
if (!dir || !truthFile) {
  console.error("Naudojimas: test-regscan.mjs <aplankas> <truth.json>");
  process.exit(2);
}
const truth = JSON.parse(fs.readFileSync(truthFile, "utf8"));
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "regscan-"));
let n = 0;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", m => process.env.DEBUG && console.log("  [page]", m.text()));
await page.exposeFunction("__nativeOcr", (dataUrl, psm) => {
  const f = path.join(tmp, `p${n++}.png`);
  fs.writeFileSync(f, Buffer.from(dataUrl.split(",")[1], "base64"));
  if (process.env.KEEP) fs.copyFileSync(f, path.join(process.env.KEEP, path.basename(f)));
  return JSON.parse(
    execFileSync("python3", [path.join(here, "native_tesseract_tsv.py"), f, String(psm)], {
      encoding: "utf8",
      maxBuffer: 64e6
    })
  );
});
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({
  content: `
  window.Tesseract = { createWorker: async () => { let psm = "6"; return {
    setParameters: async p => { if (p.tessedit_pageseg_mode) psm = p.tessedit_pageseg_mode; },
    recognize: async canvas => ({ data: { lines: await window.__nativeOcr(canvas.toDataURL("image/png"), psm) } })
  }; } };
  ${engine}
  window.RegScan = RegScan;`
});
let total = 0,
  ok = 0;
for (const [file, want] of Object.entries(truth)) {
  if (only && !only.includes(file)) continue;
  const b64 = fs.readFileSync(path.join(dir, file)).toString("base64");
  const res = await page.evaluate(async b64 => {
    const blob = await (await fetch("data:image/jpeg;base64," + b64)).blob();
    const r = await window.RegScan.scan(blob, {});
    return { values: r.values, passes: r.passes, ms: r.ms, fields: r.fields };
  }, b64);
  const bad = KEYS.filter(k => String(res.values[k] ?? "") !== String(want[k] ?? ""));
  if (process.env.DEBUG)
    for (const k of bad) console.log("   ", k, JSON.stringify(res.fields[k === "model" ? "model" : k]));
  total += KEYS.length;
  ok += KEYS.length - bad.length;
  console.log(
    `${bad.length ? "✗" : "✓"} ${file}  ${KEYS.length - bad.length}/${KEYS.length}  (${res.passes} OCR, ${(res.ms / 1000).toFixed(1)} s)` +
      (bad.length
        ? "\n    " + bad.map(k => `${k}: "${res.values[k] ?? ""}" (turi būti "${want[k]}")`).join("\n    ")
        : "")
  );
}
console.log(`\nIš viso: ${ok}/${total} laukų (${((ok / total) * 100).toFixed(1)} %)`);
await browser.close();
process.exit(ok === total ? 0 : 1);
