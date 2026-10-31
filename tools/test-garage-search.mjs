#!/usr/bin/env node
// v86 Garažo paieškos testas (430 ir 1280 px): 500 aktyvių ir 60 parduotų automobilių. Tikrina: „toy“ → visos
// Toyota, „toyota rav“ → tik RAV4, „toyota kbd122“ / „KBD 122“ → vienas, diakritikai („skoda“ = „Škoda“),
// rezultatų skaičius, paryškinimas, Escape, tuščia būsena ir „rasti parduotuose“, filtrai, rikiavimas
// (state.ui.garageSort išlieka po perkrovimo), vieno klavišo apdorojimas < 16 ms, rodoma po 30 (likę – slenkant),
// Garažo atidarymo laikas, be horizontalaus perpildymo ir be JS klaidų.
// Naudojimas: node tools/test-garage-search.mjs   (nuotraukos – .verify/garage-search-*.png)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const f = path.join(dist, rel);
  if (!f.startsWith(dist) || !fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const out = path.join(root, ".verify");
fs.mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};

// ---------- Duomenys ----------
const demo = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
const MODELS = [
  ["Toyota", ["RAV4", "Corolla", "Avensis", "Auris"]],
  ["Volkswagen", ["Golf", "Passat", "Touran"]],
  ["Audi", ["A4", "A6", "Q5"]],
  ["BMW", ["320d", "520d", "X3"]],
  ["Škoda", ["Octavia", "Superb"]],
  ["Mercedes-Benz", ["E 220", "C 200"]],
  ["Volvo", ["XC60", "V60"]]
];
let seed = 7;
const rnd = n => ((seed = (seed * 1103515245 + 12345) % 2147483648) >>> 8) % n;
const L = "ABCDEFGHJKLMNPRSTUVZ";
const plates = new Set(["KBD122"]);
const plate = () => {
  let p;
  do p = L[rnd(20)] + L[rnd(20)] + L[rnd(20)] + String(100 + rnd(900));
  while (plates.has(p));
  plates.add(p);
  return p;
};
const cars = [];
const iso = d => new Date(Date.UTC(2026, 9, 31) - d * 864e5).toISOString().slice(0, 10);
for (let i = 0; i < 560; i++) {
  const [make, models] = MODELS[i % MODELS.length];
  const model = models[rnd(models.length)];
  const sold = i >= 500;
  const pl = i === 3 ? "KBD122" : plate();
  const mdl = i === 3 ? "RAV4" : model;
  const mk = i === 3 ? "Toyota" : make;
  cars.push({
    id: "gs-" + i,
    name: `${mk} ${mdl}`,
    regMake: mk,
    regModel: mdl,
    plate: pl,
    vin: "WVW" + String(100000000000000 + i * 7919).slice(0, 14),
    year: 2008 + rnd(16),
    fuelType: rnd(2) ? "Dyzelinas" : "Benzinas",
    buyPrice: 3000 + rnd(12000),
    askingPrice: rnd(4) ? 5000 + rnd(15000) : null,
    createdDateISO: iso(rnd(120)),
    createdAt: "",
    status: sold ? "parduotas" : "aktyvus",
    soldPrice: sold ? 9000 : null,
    soldDateISO: sold ? iso(1) : null,
    photos: [],
    documents: [],
    checklist: rnd(5) === 0 ? [{ id: "t" + i, name: "Servisas", done: false, dueDate: iso(3), expense: 0 }] : []
  });
}
const toyotaActive = cars.filter(c => c.status !== "parduotas" && c.regMake === "Toyota").length;
const rav4Active = cars.filter(c => c.status !== "parduotas" && c.regMake === "Toyota" && c.regModel === "RAV4").length;
const skodaActive = cars.filter(c => c.status !== "parduotas" && c.regMake === "Škoda").length;
const state = { ...demo, cars, ui: { ...(demo.ui || {}), garageSort: "new" } };
const raw = JSON.stringify(state);

const b = await chromium.launch();
const errors = [];
async function openPage(width) {
  const ctx = await b.newContext({ viewport: { width, height: width > 600 ? 900 : 932 } });
  await ctx.clock.install({ time: new Date("2026-10-31T10:00:00") });
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(width + ": " + e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.addInitScript(s => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("visureigiai_uab_v1", s);
      sessionStorage.setItem("seeded", "1");
    }
  }, raw);
  const t0 = Date.now();
  await p.goto(base + "index.html");
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  return { p, boot: Date.now() - t0 };
}
const info = p =>
  p.evaluate(() => {
    const g = document.getElementById("activeCarGrid");
    const vis = [...g.querySelectorAll(":scope > [data-open-car]")]
      .filter(e => !e.classList.contains("gsHideV86"))
      .sort((a, b) => Number(a.style.order || 0) - Number(b.style.order || 0));
    return {
      shown: vis.length,
      first: vis[0]?.querySelector(".carListTitle")?.textContent,
      firstPlate: vis[0]?.querySelector(".lcPlateV61 b")?.textContent,
      titles: vis.slice(0, 40).map(e => e.querySelector(".carListTitle")?.textContent),
      meta: document.getElementById("gsMetaV86")?.textContent || "",
      empty: g.querySelector(".gsEmptyV86")?.textContent || "",
      more: g.querySelector(".gsMoreV86")?.textContent || "",
      marks: g.querySelectorAll(":scope > [data-open-car]:not(.gsHideV86) mark").length
    };
  });
const type = async (p, q) => {
  await p.fill("#gsInputV86", q);
  await p.waitForTimeout(80);
};

for (const W of [430, 1280]) {
  console.log(`\n— ${W} px —`);
  const { p, boot } = await openPage(W);
  await p.evaluate(() => document.querySelector('.navBtn[data-view="garage"]')?.click());
  await p.waitForTimeout(500);
  check(boot < 8000, `paleidimas su 560 automobilių: ${boot} ms`);
  const bar = await p.evaluate(() => {
    const b = document.getElementById("gsBarV86");
    const g = document.getElementById("activeCarGrid");
    return { ok: !!b && !b.hidden && b.nextElementSibling === g, role: b?.getAttribute("role"), ph: document.getElementById("gsInputV86")?.placeholder };
  });
  check(bar.ok && bar.role === "search", "paieškos juosta virš aktyvių automobilių");
  let r = await info(p);
  check(r.shown === 30 && /Rodyti dar 30/.test(r.more), `rodoma po 30: ${r.shown}, „${r.more}“`);

  // Paieška
  await type(p, "toy");
  r = await info(p);
  check(r.meta.startsWith(`Rasta ${toyotaActive} iš 500`), `„toy“ → ${r.meta}`);
  check(r.titles.every(t => /^Toyota/.test(t)), "„toy“ – tik Toyota");
  check(r.marks > 0, "atitikusi dalis paryškinta");
  await type(p, "toyota rav");
  r = await info(p);
  check(r.meta.startsWith(`Rasta ${rav4Active} iš 500`) && r.titles.every(t => t === "Toyota RAV4"), `„toyota rav“ → ${r.meta}`);
  await type(p, "toyota kbd122");
  r = await info(p);
  check(r.shown === 1 && r.firstPlate === "KBD122", "„toyota kbd122“ → vienas automobilis");
  await type(p, "KBD 122");
  r = await info(p);
  check(r.shown === 1 && r.firstPlate === "KBD122", "„KBD 122“ = „kbd122“");
  await type(p, "kbd1");
  r = await info(p);
  check(r.firstPlate === "KBD122", "„kbd1“ – pirmas KBD122");
  await type(p, "skoda");
  r = await info(p);
  check(r.meta.startsWith(`Rasta ${skodaActive} iš`) && r.titles.every(t => /^Škoda/.test(t)), `diakritikai: „skoda“ → ${r.meta}`);
  // Vieno klavišo apdorojimas
  const ms = await p.evaluate(() => {
    const t = [];
    for (const q of ["t", "to", "toy", "toyo", "toyot", "toyota", "toyota a", "toyota av"]) {
      const s = performance.now();
      window.AutoEasierGarageSearch.set(q);
      t.push(performance.now() - s);
    }
    return Math.max(...t);
  });
  check(ms < 16, `vieno klavišo apdorojimas ≤ ${ms.toFixed(1)} ms (< 16 ms)`);
  // Enter atidaro vienintelį
  await type(p, "kbd122");
  await p.press("#gsInputV86", "Enter");
  await p.waitForTimeout(600);
  check(await p.evaluate(() => document.getElementById("sheet")?.dataset.carV63 === "gs-3"), "Enter atidaro vienintelį rezultatą");
  await p.evaluate(() => document.querySelector("#sheet .closeBtn")?.click());
  await p.waitForTimeout(500);
  // Tuščia būsena ir parduotuose
  await type(p, "volvo xc60 zzz");
  r = await info(p);
  check(/Nieko nerasta/.test(r.empty), "tuščia būsena: " + r.empty.slice(0, 50));
  const soldPlate = cars.find(c => c.status === "parduotas").plate;
  await type(p, soldPlate);
  r = await info(p);
  check(/rastas parduotuose|rasti parduotuose/.test(r.empty), "aktyviuose nėra – „rasti parduotuose“: " + r.empty);
  await p.press("#gsInputV86", "Escape");
  await p.waitForTimeout(100);
  r = await info(p);
  check((await p.inputValue("#gsInputV86")) === "" && r.shown === 30 && !r.meta, "Escape išvalo");

  // Filtrai (v87 – skydelyje po filtrų mygtuku)
  check(!/:|markė/i.test(bar.ph || ""), "paieškos lauke be pavyzdžių: „" + bar.ph + "“");
  const openPanel = async () => {
    if ((await p.getAttribute("#gsSortBtnV86", "aria-expanded")) !== "true") await p.click("#gsSortBtnV86");
    await p.waitForTimeout(380);
  };
  await openPanel();
  const chip = await p.evaluate(() => [...document.querySelectorAll("#gsChipsV86 [data-gs-filter]")].map(c => c.dataset.gsFilter + ":" + c.querySelector("b").textContent));
  check(chip.some(c => c.startsWith("late:")) && chip.some(c => c.startsWith("noprice:")) && chip.some(c => c.startsWith("nophoto:")), "filtrai su skaičiais: " + chip.join(", "));
  const late = Number(chip.find(c => c.startsWith("late:"))?.split(":")[1] || 0);
  await p.click('#gsChipsV86 [data-gs-filter="late"]');
  await p.waitForTimeout(80);
  r = await info(p);
  check(r.meta.startsWith(`Rasta ${late} iš 500`), `filtras „Vėluoja užduotys“ → ${r.meta}`);
  await type(p, "toyota");
  r = await info(p);
  check(r.titles.every(t => /^Toyota/.test(t)) && Number(r.meta.match(/Rasta (\d+)/)?.[1]) <= late, "filtras + paieška kartu: " + r.meta);
  check(await p.evaluate(() => !!document.querySelector('#gsActiveV86 [data-gs-filter="late"]')), "aktyvus filtras rodomas žyma");
  await p.screenshot({ path: path.join(out, `garage-search-panel-${W}.png`) });
  await p.click('#gsChipsV86 [data-gs-filter="late"]');
  await type(p, "");

  // Rikiavimas
  await openPanel();
  await p.click('#gsSortMenuV86 [data-gs-sort="az"]');
  await p.waitForTimeout(150);
  r = await info(p);
  const sorted = [...r.titles].sort((a, b) => a.localeCompare(b, "lt"));
  check(JSON.stringify(r.titles.slice(0, 30)) === JSON.stringify(sorted.slice(0, 30)), "rikiavimas A–Ž: " + r.titles.slice(0, 3).join(", "));
  await p.waitForTimeout(400);
  check((await p.evaluate(() => JSON.parse(localStorage.getItem("visureigiai_uab_v1")).ui?.garageSort)) === "az", "state.ui.garageSort = az");
  // Slinkimas – daugiau rezultatų
  await p.evaluate(() => document.querySelector("#activeCarGrid .gsMoreV86")?.scrollIntoView());
  await p.waitForTimeout(400);
  r = await info(p);
  check(r.shown >= 60, `slenkant įkeliama daugiau: ${r.shown}`);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(ov <= 1, "be horizontalaus perpildymo");
  await p.evaluate(() => scrollTo(0, 0));
  await type(p, "toy");
  await p.screenshot({ path: path.join(out, `garage-search-${W}.png`) });
  // Po perkrovimo – rikiavimas išlieka, užklausa (sessionStorage) – taip pat
  await p.reload();
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  await p.waitForTimeout(500);
  r = await info(p);
  check((await p.inputValue("#gsInputV86")) === "toy" && r.titles.every(t => /^Toyota/.test(t)), "po perkrovimo užklausa išlieka (sesija)");
  check(
    await p.evaluate(() => document.getElementById("gsSortBtnV86")?.classList.contains("on")),
    "po perkrovimo rikiavimas išlieka"
  );
  await p.context().close();
}
check(errors.length === 0, "be JS klaidų " + errors.join(" | "));
await b.close();
server.close();
if (fails.length) {
  console.log(`\n${fails.length} nepavyko`);
  process.exit(1);
}
console.log("\nVisi Garažo paieškos testai praėjo");
