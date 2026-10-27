#!/usr/bin/env node
// Paruošimo variantų paieška: kiekvienam variantui – naršyklėje paruoštas vaizdas + vietinis tesseract.
// Rezultatai kaupiami kataloge (OUT), kad būtų galima greitai lyginti parserio pakeitimus.
// Naudojimas: OUT=.verify/grid node tools/regscan/grid-regscan.mjs <aplankas> <truth.json> '<variantai JSON>' [maxSide]
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
const [dir, truthFile, variantsJson, maxSideArg] = process.argv.slice(2);
const OUT = process.env.OUT || ".verify/grid";
fs.mkdirSync(OUT, { recursive: true });
const truth = JSON.parse(fs.readFileSync(truthFile, "utf8"));
const variants = JSON.parse(variantsJson);
const maxSide = Number(maxSideArg || 2200);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grid-"));
let n = 0;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
await page.addScriptTag({ content: engine + ";window.RegScan=RegScan;" });
for (const file of Object.keys(truth)) {
  const todo = variants.filter(
    v => !fs.existsSync(path.join(OUT, `${file}.${maxSide}.${JSON.stringify(v)}.json`))
  );
  if (!todo.length) continue;
  const b64 = fs.readFileSync(path.join(dir, file)).toString("base64");
  const pngs = await page.evaluate(
    async ({ b64, todo, maxSide }) => {
      const blob = await (await fetch("data:image/jpeg;base64," + b64)).blob();
      const I = RegScan._internals;
      const img = await I.loadImage(blob);
      let base = I.drawScaled(img, maxSide);
      let map = I.darknessMap(base);
      const sk = I.estimateSkew(map);
      if (Math.abs(sk.angle) >= 0.4) {
        base = I.rotateCanvas(base, sk.angle);
        map = I.darknessMap(base);
      }
      return todo.map(v => I.grayFrom(map, v).toDataURL("image/png"));
    },
    { b64, todo, maxSide }
  );
  todo.forEach((v, i) => {
    const f = path.join(tmp, `g${n++}.png`);
    fs.writeFileSync(f, Buffer.from(pngs[i].split(",")[1], "base64"));
    const lines = JSON.parse(
      execFileSync("python3", [path.join(here, "native_tesseract_tsv.py"), f, "6"], {
        encoding: "utf8",
        maxBuffer: 64e6
      })
    );
    fs.writeFileSync(path.join(OUT, `${file}.${maxSide}.${JSON.stringify(v)}.json`), JSON.stringify(lines));
  });
  process.stdout.write(file + " ");
}
await browser.close();
console.log("done");
