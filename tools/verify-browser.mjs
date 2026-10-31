#!/usr/bin/env node
// Behaviour check in a real browser: loads two built HTML files with the same seeded data and a frozen clock,
// walks the main screens, and compares pixels, final DOM, parsed CSS (CSSOM) and console errors.
// Usage: node tools/verify-browser.mjs reference.html dist/index.html [--shots .verify]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = (() => {
  for (const p of [
    "sharp",
    path.join(process.execPath, "../../lib/node_modules/sharp"),
    "/usr/local/lib/node_modules/sharp"
  ]) {
    try {
      return require(p);
    } catch {}
  }
  return null;
})();

// Pixel diff with a tiny tolerance (0.3%): comparing the original file with itself shows up to ~0.13% noise
// (caret, anti-aliasing), so anything above 0.3% is a real visual change.
async function pixelDiff(fa, fb) {
  const a = fs.readFileSync(fa),
    b = fs.readFileSync(fb);
  if (a.equals(b)) return 0;
  if (!sharp) return 1;
  const [x, y] = await Promise.all([
    sharp(a).raw().toBuffer({ resolveWithObject: true }),
    sharp(b).raw().toBuffer({ resolveWithObject: true })
  ]);
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return 1;
  let d = 0;
  for (let i = 0; i < x.data.length; i += x.info.channels)
    if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2]) d++;
  return d / (x.info.width * x.info.height);
}
// Custom properties (--x) keep their raw text in CSSOM, so formatting "rgba(1,2,3,.5)" -> "rgba(1, 2, 3, 0.5)" shows up
// there even though the rendered value is identical. Normalise that one difference.
const cssNorm = s => s.replace(/,\s+/g, ",").replace(/(^|[^\d.])0\.(\d)/g, "$1.$2");

const [refFile, candFile] = process.argv.slice(2);
const shotDir = path.resolve(
  process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : ".verify"
);
const seed = fs.readFileSync(new URL("./fixtures/demo-state.json", import.meta.url), "utf8");
fs.mkdirSync(shotDir, { recursive: true });

// DOM .click() (not mouse) so a step never depends on overlays/scroll position.
const tap = sel => p =>
  p.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) throw new Error("missing " + s);
    el.click();
  }, sel);
const STEPS = [
  ["garage", async p => {}],
  ["garage-tasks", tap('[data-garage-action="tasks"]')],
  ["accounting", tap('.navBtn[data-view="accounting"]')],
  ["menu", tap('.navBtn[data-view="menu"]')],
  ["menu-settings", tap('[data-menu-disclosure="settings"]')],
  ["menu-finance", tap('#accountingRoot [data-accounting-finance]')],
  ["menu-stats", tap('[data-menu-disclosure="garage-stats"]')],
  ["menu-contacts", tap('[data-menu-disclosure="customers"]')],
  ["menu-history", tap('[data-menu-disclosure="history"]')],
  [
    "garage-leads",
    async p => {
      await tap('.navBtn[data-view="garage"]')(p);
      await tap('[data-garage-action="leads"]')(p);
    }
  ],
  ["garage-addcar", tap('[data-garage-action="addcar"]')],
  [
    "garage-what",
    async p => {
      await tap('.navBtn[data-view="garage"]')(p);
      await tap('[data-garage-action="what"]')(p);
    }
  ],
  [
    "add-task",
    p =>
      p.evaluate(() => {
        document.getElementById("garageTaskTitle").value = "Testinė užduotis";
        document.getElementById("garageTaskPriority").value = "important";
        document.getElementById("garageTaskForm").requestSubmit();
      })
  ],
  [
    "add-car",
    p =>
      p.evaluate(() => {
        document.querySelector('[data-garage-action="addcar"]')?.click();
        const set = (id, v) => {
          const el = document.getElementById(id);
          if (el) {
            el.value = v;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        };
        set("newVehicleregMake", "Honda");
        set("newVehicleregModel", "CR-V");
        set("newVehiclebuyPrice", "3900");
        document.getElementById("addCarBtn").click();
      })
  ],
  [
    "car-sheet",
    async p => {
      await tap('.navBtn[data-view="garage"]')(p);
      await tap("#activeCarGrid [data-open-car], #activeCarGrid .carListCard")(p);
    }
  ],
  // v84: funkcijų vitrina (prisijungimo ekrano „Ką moka AutoEasier“) – detalė „Savikaina ir marža“
  ["features", p => p.evaluate(() => window.AutoEasierFeatures?.open("marza"))]
];

async function run(file, tag) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
    locale: "lt-LT",
    timezoneId: "Europe/Vilnius"
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  await page.clock.install({ time: new Date("2026-10-27T10:00:00+02:00") });
  await page.clock.pauseAt(new Date("2026-10-27T10:00:00+02:00"));
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on(
    "console",
    m => m.type() === "error" && errors.push("console: " + m.text().replace(/file:\/\/\S+/g, "<file>"))
  );
  await page.route(/^https?:/, r => r.abort());
  await page.addInitScript(() => {
    // Deterministic randomness so ids/uuids match between runs.
    let x = 123456789;
    Math.random = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
    let n = 0;
    if (crypto.randomUUID)
      crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  });
  await page.addInitScript(s => {
    try {
      localStorage.setItem("visureigiai_uab_v1", s);
    } catch {}
  }, seed);
  await page.goto("file://" + path.resolve(file));
  await page.clock.runFor(1500);
  const gateShot = path.join(shotDir, `${tag}-login-gate.png`);
  await page.screenshot({ path: gateShot, fullPage: true, animations: "disabled" });
  // The Supabase login gate cannot load offline; reveal the app the same way for both files.
  await page.evaluate(() => {
    document.getElementById("autoEasierLogin")?.setAttribute("hidden", "");
    document.querySelectorAll("[inert]").forEach(n => {
      n.removeAttribute("inert");
      n.removeAttribute("aria-hidden");
    });
    document.body.classList.remove("autoeasier-auth-locked");
  });
  const out = { errors, shots: [], dom: [], css: "", gateShot };
  for (const [name, act] of STEPS) {
    try {
      await act(page);
    } catch (e) {
      errors.push(`step ${name}: ${e.message.split("\n")[0]}`);
    }
    await page.clock.runFor(800);
    const file = path.join(shotDir, `${tag}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
    out.shots.push([name, file]);
    out.views = out.views || [];
    out.views.push(
      name +
        "=" +
        (await page.evaluate(
          () =>
            [...document.querySelectorAll(".view.active")].map(v => v.id).join(",") +
            (document.getElementById("modalBackdrop")?.classList.contains("show") ? "+sheet" : "")
        ))
    );
    out.dom.push([
      name,
      await page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll("style,script").forEach(n => (n.textContent = "")); // code text is compared by verify-ast
        return clone.outerHTML.replace(/blob:[^"')\s]+/g, "blob:x");
      })
    ]);
  }
  out.storage = await page.evaluate(() => {
    try {
      return localStorage.getItem("visureigiai_uab_v1");
    } catch {
      return "";
    }
  });
  out.css = await page.evaluate(() =>
    [...document.styleSheets]
      .map(s => {
        try {
          return [...s.cssRules].map(r => r.cssText).join("\n");
        } catch {
          return "<cors>";
        }
      })
      .join("\n/*--*/\n")
  );
  await browser.close();
  return out;
}

const A = await run(refFile, "ref"),
  B = await run(candFile, "new");
let fail = 0;
const report = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) fail++;
};
A.css = cssNorm(A.css);
B.css = cssNorm(B.css);
report(A.css === B.css, `CSSOM identical (${A.css.length} chars of parsed CSS)`);
if (A.css !== B.css) {
  let i = 0;
  while (A.css[i] === B.css[i]) i++;
  console.log("  ref: " + A.css.slice(i - 150, i + 100) + "\n  new: " + B.css.slice(i - 150, i + 100));
}
for (let i = 0; i < STEPS.length; i++) {
  const [name] = STEPS[i];
  if (A.dom[i][1] !== B.dom[i][1]) {
    const a = A.dom[i][1],
      b = B.dom[i][1];
    let k = 0;
    while (a[k] === b[k]) k++;
    console.log(
      `  dom@${name}: ref …${a.slice(k - 120, k + 80)}…\n           new …${b.slice(k - 120, k + 80)}…`
    );
  }
  report(A.dom[i][1] === B.dom[i][1], `DOM identical after "${name}"`);
  const diff = await pixelDiff(A.shots[i][1], B.shots[i][1]);
  report(
    diff <= 0.003,
    `screenshot ${diff === 0 ? "identical" : `matches (${(diff * 100).toFixed(3)}% px)`}: ${name}`
  );
}
console.log("  screens: " + B.views.join("  "));
report(A.views.join() === B.views.join(), "same screen reached at every step");
for (const mark of ["Testinė užduotis", "Honda CR-V"])
  report((B.storage || "").includes(mark), `action took effect: "${mark}" saved`);
report(
  A.storage === B.storage,
  `saved app state identical after all actions (${(B.storage || "").length} chars)`
);
{
  const d = await pixelDiff(A.gateShot, B.gateShot);
  report(d <= 0.003, `screenshot ${d === 0 ? "identical" : "matches"}: login-gate`);
}
const ea = JSON.stringify(A.errors),
  eb = JSON.stringify(B.errors);
report(ea === eb, `same console errors (${B.errors.length})`);
if (B.errors.length) console.log("  errors (both):\n   " + B.errors.join("\n   "));
console.log(fail ? `FAILED: ${fail}` : "OK: browser behaviour identical");
process.exit(fail ? 1 : 0);
