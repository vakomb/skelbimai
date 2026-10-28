#!/usr/bin/env node
// v78 patikimumo testas: sugadinti duomenys, dvigubi paspaudimai, pilna atmintis, keli skirtukai,
// dideli skaičiai siauruose ekranuose, užduotys pagal automobilį, greitis su šimtais automobilių.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, process.argv[2] || "dist/index.html"));
const server = http
  .createServer((q, r) => {
    if (q.url !== "/") return r.writeHead(404).end();
    r.setHeader("content-type", "text/html; charset=utf-8");
    r.end(html);
  })
  .listen(0);
const url = `http://localhost:${server.address().port}/`;
const base = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
const clone = o => JSON.parse(JSON.stringify(o));
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const b = await chromium.launch();
async function open(raw, { width = 430, height = 932, ctx = null } = {}) {
  const context = ctx || (await b.newContext({ viewport: { width, height } }));
  const p = await context.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  p.on("dialog", d => d.accept());
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  if (raw !== null && !ctx)
    await p.addInitScript(r => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("visureigiai_uab_v1", r);
        sessionStorage.setItem("seeded", "1");
      }
    }, raw);
  await p.goto(url);
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  return p;
}
const state = p => p.evaluate(() => window.AUTOEASIER_APP_DATA.getState());
const tap = (p, sel) => p.evaluate(s => document.querySelector(s)?.click(), sel);
const walk = async p => {
  for (const sel of [
    '.navBtn[data-view="accounting"]',
    "#accountingRoot [data-accounting-finance]",
    '.navBtn[data-view="menu"]',
    '[data-menu-disclosure="garage-stats"]',
    '.navBtn[data-view="garage"]',
    '[data-garage-action="tasks"]',
    '[data-garage-action="leads"]',
    '[data-garage-action="what"]',
    ".garageWhatBack",
    "#activeCarGrid [data-open-car]"
  ]) {
    await tap(p, sel);
    await p.waitForTimeout(200);
  }
};

// 1. Sugadinti duomenys – programa niekada nelieka tuščia
const corrupt = {
  "null įrašai sąrašuose": s => {
    s.cars.push(null, "x", 5);
    s.leadVariants = [null];
    s.garageTasks = [null, 7];
    s.finances.transactions.push(null);
    s.customers = [null];
    s.history = [null];
  },
  "netinkami vidiniai laukai": s => {
    s.cars[0].checklist = null;
    s.cars[0].photos = "x";
    s.cars[0].documents = {};
    s.cars.push({ name: "Be id", buyPrice: "abc" });
  },
  "netinkami tipai": s => {
    s.cars = {};
    s.finances = null;
    s.accounting = "x";
    s.leadVariants = "y";
    s.contactBook = 3;
    s.ui = null;
  }
};
for (const [name, mutate] of Object.entries(corrupt)) {
  const s = clone(base);
  mutate(s);
  const p = await open(JSON.stringify(s));
  await walk(p);
  const r = await p.evaluate(() => ({ views: document.querySelectorAll(".view.active").length, text: document.body.innerText.length }));
  check(!p.errors.length && r.views === 1 && r.text > 80, `${name}: be klaidų, ekranas rodomas ${p.errors.slice(0, 2).join("; ")}`);
  await p.context().close();
}
{
  const p = await open(JSON.stringify(base).slice(0, 400));
  const backup = await p.evaluate(() => Object.keys(localStorage).filter(k => k.endsWith(":corrupt")).length);
  check(backup === 1 && !p.errors.length, "sugadintas JSON: atsarginė kopija išsaugota, programa veikia");
  await p.context().close();
}

// Tvarkymas nekeičia teisingų duomenų: buhalterio eilė (automobilių id tekstu) ir kiti laukai lieka tokie patys
{
  const p = await open(JSON.stringify(base));
  const s = await state(p);
  const same = JSON.stringify(s.accounting.queue) === JSON.stringify(base.accounting.queue);
  const noNewFields = s.cars.every((c, i) => !base.cars[i] || Object.keys(c).every(k => k in base.cars[i] || k === "updatedAt"));
  check(same && noNewFields && !p.errors.length, `teisingi duomenys nepakeisti (eilė ${JSON.stringify(s.accounting.queue)})`);
  await p.context().close();
}

// 2. Greiti pakartotiniai paspaudimai nesukuria dublikatų
{
  const p = await open(JSON.stringify(base));
  const clickFast = async sel => {
    const all = await p.$$(sel);
    let el = null;
    for (const h of all) if (await h.isVisible()) el = el || h;
    if (!el) return false;
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    for (let i = 0; i < 3; i++) {
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await p.waitForTimeout(80);
    }
    return true;
  };
  for (const kind of ["expense", "income"]) {
    await tap(p, '.navBtn[data-view="accounting"]');
    await p.waitForTimeout(250);
    await tap(p, `#accountingRoot [data-accounting-panel="${kind}"]`);
    await p.waitForTimeout(350);
    const n0 = (await state(p)).finances.transactions.length;
    await p.fill("#accountingMoneyAmount", "77");
    await clickFast("#accountingMoneyFormV8 button[type=submit]");
    await p.waitForTimeout(900);
    const n1 = (await state(p)).finances.transactions.length;
    check(n1 - n0 === 1, `${kind === "expense" ? "išlaida" : "įplauka"}: trys greiti paspaudimai – vienas įrašas (+${n1 - n0})`);
  }
  // Klaida (be sumos) – iš karto galima bandyti dar kartą
  await tap(p, "#sheet [data-accounting-required-close]");
  await p.waitForTimeout(150);
  await tap(p, '#accountingRoot [data-accounting-panel="expense"]');
  await p.waitForTimeout(350);
  const n0 = (await state(p)).finances.transactions.length;
  const btn = await p.$("#accountingMoneyFormV8 button[type=submit]");
  await btn.click();
  await p.waitForTimeout(120);
  await p.fill("#accountingMoneyAmount", "15");
  await btn.click();
  await p.waitForTimeout(900);
  check((await state(p)).finances.transactions.length - n0 === 1, "po klaidos pakartotinis paspaudimas išsaugo");
  check(!p.errors.length, "dvigubi paspaudimai be JS klaidų " + p.errors.join("; "));
  await p.context().close();
}

// 3. Pilna telefono atmintis: pakeitimai vis tiek keliauja į debesį, vartotojas įspėjamas
{
  const p = await open(JSON.stringify(base));
  const r = await p.evaluate(async () => {
    let events = 0;
    window.addEventListener("autoeasier:local-save", () => events++);
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };
    document.querySelector('[data-garage-action="tasks"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector("#garageTasksSection [data-tk-done]")?.click();
    await new Promise(r => setTimeout(r, 600));
    Storage.prototype.setItem = orig;
    return { events, toast: document.getElementById("toastWrap")?.textContent || "" };
  });
  check(r.events > 0 && /atmintis pilna/i.test(r.toast), "pilna atmintis: sinchronizacija paleista, rodomas įspėjimas " + JSON.stringify(r));
  await p.context().close();
}

// 4. Du skirtukai: antras perima pirmo pakeitimus (neperrašo senais)
{
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.addInitScript(r => {
    if (!localStorage.getItem("visureigiai_uab_v1")) localStorage.setItem("visureigiai_uab_v1", r);
  }, JSON.stringify(base));
  const a = await open(null, { ctx });
  const c = await open(null, { ctx });
  await a.evaluate(() => {
    const s = window.AUTOEASIER_APP_DATA.getState();
    s.garageTasks.push({ id: "multi-tab", title: "Iš kito skirtuko", done: false });
    window.AUTOEASIER_APP_DATA.replaceState(s);
  });
  await c.waitForTimeout(500);
  const got = (await state(c)).garageTasks.some(t => t.id === "multi-tab");
  check(got, "antras skirtukas mato pirmo skirtuko pakeitimą be perkrovimo");
  await ctx.close();
}

// 5. Dideli skaičiai siauruose ekranuose – niekas nekarpoma ir neišlenda
{
  const s = clone(base);
  s.cars.forEach(c => (c.buyPrice = 187450));
  s.cars.push({ id: "car-big", name: "Mercedes-Benz GLE 450 4MATIC Coupé AMG Line", buyPrice: 999999, status: "aktyvus", createdDateISO: "2026-01-01", checklist: [{ id: "t9", title: "Remontas", expense: 123456, done: false }], photos: [], documents: [], plate: "ABC999" });
  for (const width of [320, 375, 430]) {
    for (const seq of [[], ["car:car-big"]]) {
      const p = await open(JSON.stringify(s), { width, height: 800 });
      for (const step of seq)
        await p.evaluate(id => [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === id)?.click(), step.slice(4));
      await p.waitForTimeout(400);
      const bad = await p.evaluate(() => {
        const scope = document.getElementById("modalBackdrop")?.classList.contains("show") ? document.getElementById("sheet") : document.querySelector(".view.active");
        const out = [];
        if (document.documentElement.scrollWidth > innerWidth + 1) out.push("horizontalus slinkimas");
        scope.querySelectorAll(".garageRefFacts strong, .premiumStatGrid strong").forEach(el => {
          const cell = el.parentElement.getBoundingClientRect(),
            r = el.getBoundingClientRect();
          if (r.width && (r.right > cell.right + 1 || el.scrollWidth > el.clientWidth + 1)) out.push(el.textContent.trim());
        });
        return out;
      });
      check(!bad.length, `${width}px${seq.length ? " kortelė" : " Garažas"}: sumos telpa ${bad.join(", ")}`);
      await p.context().close();
    }
  }
}

// 6. Užduotys sugrupuotos pagal automobilį
{
  const p = await open(JSON.stringify(base));
  await tap(p, '[data-garage-action="tasks"]');
  await p.waitForTimeout(400);
  const g = await p.evaluate(() =>
    [...document.querySelectorAll("#garageTasksSection .tkGroupV78")].map(sec => ({
      title: sec.querySelector(".tkHeadTextV78 strong")?.textContent.trim(),
      plate: sec.querySelector(".tkHeadMetaV78 .lcPlateV61 b")?.textContent.trim() || "",
      thumb: !!sec.querySelector(".tkThumbV78"),
      rows: sec.querySelectorAll(".tkRowV62").length,
      carTagInRows: sec.querySelectorAll(".tkRowsV78 .tkCarV63").length
    }))
  );
  const car = g.find(x => x.plate === "ABC123");
  check(!!car && car.title === "Nissan X-Trail" && car.thumb && car.rows === 2 && car.carTagInRows === 0, "Šiandien: automobilio grupė (pavadinimas, numeris, nuotrauka, 2 užduotys) " + JSON.stringify(car));
  check(g.some(x => x.title === "Kitos užduotys" && x.rows >= 1), "kitos užduotys – atskira grupė");
  await p.context().close();
}

// 7. Greitis: 300 automobilių ir 1500 operacijų
{
  const s = clone(base);
  for (let i = 0; i < 300; i++)
    s.cars.push({ id: "car-l" + i, name: "Volkswagen Passat " + i, buyPrice: 5000 + i, status: i % 3 ? "aktyvus" : "parduotas", soldPrice: i % 3 ? null : 7000, soldDateISO: i % 3 ? null : "2026-10-01", createdDateISO: "2026-09-10", checklist: [{ id: "c" + i, title: "Plovimas", expense: 25, done: false, dueDate: "2026-10-30" }], photos: [], documents: [], plate: "AAA" + i });
  for (let i = 0; i < 1500; i++) s.finances.transactions.push({ id: "tx" + i, type: i % 4 ? "expense" : "income", amount: 10 + i, title: "Op " + i, category: "Kuras", date: "2026-10-15", carId: "car-l" + (i % 300) });
  const t0 = Date.now();
  const p = await open(JSON.stringify(s));
  const bootMs = Date.now() - t0;
  const times = {};
  for (const [name, sel] of [
    ["Buhalterija", '.navBtn[data-view="accounting"]'],
    ["Meniu", '.navBtn[data-view="menu"]'],
    ["Garažas", '.navBtn[data-view="garage"]'],
    ["Užduotys", '[data-garage-action="tasks"]'],
    ["Vadybininkas", '[data-garage-action="what"]']
  ]) {
    times[name] = await p.evaluate(async sel => {
      const t = performance.now();
      document.querySelector(sel).click();
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
      return Math.round(performance.now() - t);
    }, sel);
    await p.waitForTimeout(250);
  }
  console.log("  paleidimas", bootMs, "ms;", JSON.stringify(times));
  check(bootMs < 6000 && Object.values(times).every(t => t < 700), "300 automobilių: paleidimas ir perjungimai be ilgų strigimų");
  check(!p.errors.length, "didelis kiekis be JS klaidų " + p.errors.slice(0, 2).join("; "));
  await p.context().close();
}
await b.close();
server.close();
process.exit(fails.length ? 1 : 0);
