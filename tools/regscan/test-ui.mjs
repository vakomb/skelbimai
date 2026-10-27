#!/usr/bin/env node
// UI testas: tikra programėlė (dist/index.html) + registracijos liudijimo nuotrauka.
// Tikrina: naujo automobilio forma užpildoma skenuojant ir išsaugoma; redagavimo forma; kortelės peržiūra.
// OCR – vietinis tesseract per tiltą (kaip test-regscan.mjs). Naudojimas: node test-ui.mjs <nuotrauka.jpg> [ekrano-nuotraukų-aplankas]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const [image, shots = path.join(root, ".verify/ui")] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ui-"));
let n = 0;
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
page.on("pageerror", e => errors.push(e.message));
await page.exposeFunction("__nativeOcr", (dataUrl, psm) => {
  const f = path.join(tmp, `p${n++}.png`);
  fs.writeFileSync(f, Buffer.from(dataUrl.split(",")[1], "base64"));
  return JSON.parse(
    execFileSync("python3", [path.join(here, "native_tesseract_tsv.py"), f, String(psm)], {
      encoding: "utf8",
      maxBuffer: 64e6
    })
  );
});
await page.route(/^https?:/, r => r.abort());
await page.addInitScript(
  seed => {
    localStorage.setItem("visureigiai_uab_v1", seed);
    window.Tesseract = {
      createWorker: async () => {
        let psm = "6";
        return {
          setParameters: async p => {
            if (p.tessedit_pageseg_mode) psm = p.tessedit_pageseg_mode;
          },
          recognize: async canvas => ({
            data: { lines: await window.__nativeOcr(canvas.toDataURL("image/png"), psm) }
          })
        };
      }
    };
  },
  fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8")
);
await page.goto("file://" + path.join(root, "dist/index.html"));
await page.waitForTimeout(1000);
await page.evaluate(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(x => x.removeAttribute("inert"));
});
const tap = s => page.evaluate(s => document.querySelector(s).click(), s);
await tap('[data-garage-action="addcar"]');
await page.waitForTimeout(400);
const dupIds = await page.evaluate(() => {
  const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
  return ids.filter((x, i) => ids.indexOf(x) !== i);
});
await page.setInputFiles("#newVehicleregGallery", image);
await page.waitForFunction(
  () => {
    const s = document.getElementById("newVehicleregStatus");
    return s && !s.hidden && ["good", "warn", "bad"].includes(s.dataset.tone);
  },
  null,
  { timeout: 240000 }
);
const form = await page.evaluate(() =>
  Object.fromEntries(
    [
      "carName",
      "newVehicleregMake",
      "newVehicleregModel",
      "newVehicleregistrationDoc",
      "newVehicleplate",
      "newVehiclevin",
      "newVehiclefirstRegistrationDate",
      "newVehicleengineCc",
      "newVehiclepowerKw",
      "newVehiclefuelType",
      "newVehicleyear"
    ].map(id => [id, document.getElementById(id)?.value ?? "(nėra)"])
  )
);
const msg = await page.evaluate(() => document.getElementById("newVehicleregMsg").textContent);
await page.evaluate(() => document.getElementById("newVehicleregCard").scrollIntoView());
await page.screenshot({ path: path.join(shots, "addcar-scanned.png") });
await page.fill("#newVehiclebuyPrice", "4500");
await tap("#addCarBtn");
await page.waitForTimeout(1500);
const saved = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("visureigiai_uab_v1"));
  const c = s.cars[0];
  return {
    name: c.name,
    regMake: c.regMake,
    regModel: c.regModel,
    registrationDoc: c.registrationDoc,
    plate: c.plate,
    vin: c.vin,
    firstRegistrationDate: c.firstRegistrationDate,
    engineCc: c.engineCc,
    powerKw: c.powerKw,
    fuelType: c.fuelType,
    year: c.year,
    docs: (c.documents || []).map(d => d.kind)
  };
});
await tap("#activeCarGrid [data-open-car], #activeCarGrid .carListCard");
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(shots, "carsheet.png"), fullPage: false });
const view = await page.evaluate(() =>
  [...document.querySelectorAll("#sheet .vehicleInfo dt")]
    .map(dt => dt.textContent + "=" + dt.nextElementSibling?.textContent)
    .slice(0, 8)
);
await tap("#editCarInfoBtn");
await page.waitForTimeout(700);
const edit = await page.evaluate(() => ({
  card: !!document.getElementById("editVehicleregCard"),
  vin: document.getElementById("editVehiclevin")?.value,
  fuel: document.getElementById("editVehiclefuelType")?.value,
  dup: (() => {
    const ids = [...document.querySelectorAll("#sheet [id]")].map(e => e.id);
    return ids.filter((x, i) => ids.indexOf(x) !== i);
  })()
}));
await page.evaluate(() => document.getElementById("editVehicleregCard")?.scrollIntoView());
await page.screenshot({ path: path.join(shots, "edit.png") });
// Vadybininkas: trūkstami duomenys seno automobilio kortelei (VIN nesutampa -> patvirtinimo langas).
page.on("dialog", d => d.accept());
await page.evaluate(() => document.getElementById("closeSheet")?.click());
await tap('.navBtn[data-view="garage"]');
await tap('[data-garage-action="what"]');
await page.waitForTimeout(500);
const whatKey = await page.evaluate(
  () =>
    [...document.querySelectorAll("[data-what-open]")]
      .map(b => b.dataset.whatOpen)
      .find(k => /car-demo-1:missing-data/.test(k)) || ""
);
let what = { key: whatKey };
if (whatKey) {
  await page.evaluate(k => document.querySelector(`[data-what-open="${k}"]`).click(), whatKey);
  await page.waitForTimeout(500);
  what.card = await page.evaluate(() => !!document.getElementById("whatRegregCard"));
  what.inputs = await page.evaluate(() =>
    [...document.querySelectorAll('#sheet [id^="what_"]')].map(e => e.id)
  );
  if (what.card) {
    await page.setInputFiles("#whatRegregGallery", image);
    await page.waitForFunction(
      () => {
        const s = document.getElementById("whatRegregStatus");
        return s && !s.hidden && ["good", "warn", "bad"].includes(s.dataset.tone);
      },
      null,
      { timeout: 240000 }
    );
    await page.screenshot({ path: path.join(shots, "vadybininkas.png") });
    what.filled = await page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll('#sheet [id^="what_"]')].map(e => [e.id, e.value]))
    );
    await page.evaluate(() => {
      const s = document.getElementById("what_sdk");
      if (s) s.value = "SDK123";
      const i = document.getElementById("what_insuranceStatus");
      if (i) i.value = "invalid";
    });
    await tap("#whatSaveMissingV30");
    await page.waitForTimeout(1200);
    what.saved = await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem("visureigiai_uab_v1")).cars.find(x => x.id === "car-demo-1");
      return {
        regMake: c.regMake,
        regModel: c.regModel,
        registrationDoc: c.registrationDoc,
        engineCc: c.engineCc,
        fuelType: c.fuelType,
        docs: (c.documents || []).map(d => d.kind)
      };
    });
  }
}
console.log(JSON.stringify({ dupIds, msg, form, saved, view, edit, what, errors }, null, 1));
await browser.close();
