#!/usr/bin/env node
// Nuotraukų pakrovimo testas (v71): po prisijungimo viršeliai ir visos nuotraukos užpildomos iš karto,
// be perėjimų tarp ekranų; automobilio kortelėje visos miniatiūros turi paveikslėlį.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const state = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const keys = ["photo_testaaaa1", "photo_testbbbb2", "photo_testcccc3"];
state.cars = state.cars.map((c, i) => (i === 0 ? { ...c, imageSrc: keys[0], photos: keys } : c));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
await p.route(/^https?:/, r => r.abort());
await p.addInitScript(
  ([s, ks, png]) => {
    localStorage.setItem("visureigiai_uab_v1", s);
    ks.forEach(k => localStorage.setItem("visureigiai_photo_fallback_" + k, png));
  },
  [JSON.stringify(state), keys, PNG]
);
await p.goto("file://" + path.join(root, "dist/index.html"));
await p.waitForTimeout(500);
await p.evaluate(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  window.dispatchEvent(new CustomEvent("autoeasier:account-ready", { detail: { subscription: null } }));
});
await p.waitForTimeout(1500);
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const imgs = await p.evaluate(() =>
  [...document.querySelectorAll("#activeCarGrid .carListPhoto img")].map(i => !!i.getAttribute("src"))
);
check(imgs.length > 0 && imgs.every(Boolean), `garažo sąraše viršeliai užpildyti iškart (${imgs.length})`);
await p.evaluate(() => document.querySelector('.navBtn[data-view="accounting"]').click());
await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('.navBtn[data-view="garage"]').click());
await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector("#activeCarGrid [data-open-car]").click());
await p.waitForTimeout(500);
const thumbs = await p.evaluate(() =>
  [...document.querySelectorAll("#sheet .premiumThumb img")].map(i => !!i.getAttribute("src"))
);
check(thumbs.length === 3 && thumbs.every(Boolean), `kortelėje visos miniatiūros užpildytos (${thumbs.length})`);
check(!errors.length, "be JS klaidų " + errors.join("; "));
await b.close();
process.exit(fails.length ? 1 : 0);
