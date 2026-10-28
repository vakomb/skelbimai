#!/usr/bin/env node
// v81 kontekstinės pagalbos testas: „?“ mygtukai vietose, pagalbos langas (telefone – iš apačios, kompiuteryje –
// centre), žingsniai ir maketas, uždarymas neprarandant atidaryto lango, automobiliui priskirtų operacijų savikaina.
// Naudojimas: node tools/test-help.mjs [dist/index.html]
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
const shots = path.join(root, ".verify/help");
fs.mkdirSync(shots, { recursive: true });
const base = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const b = await chromium.launch();
async function open(width = 430, height = 932) {
  const ctx = await b.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  p.on("dialog", d => d.accept());
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await p.addInitScript(raw => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("visureigiai_uab_v1", raw);
      sessionStorage.setItem("seeded", "1");
    }
  }, JSON.stringify(base));
  await p.goto(url);
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  return p;
}
const tap = (p, sel) => p.evaluate(s => document.querySelector(s)?.click(), sel).then(() => p.waitForTimeout(350));
const menuTile = (p, text) =>
  p
    .evaluate(t => [...document.querySelectorAll("#view-menu .menuLink")].find(b => b.textContent.includes(t))?.click(), text)
    .then(() => p.waitForTimeout(350));
const helpState = p =>
  p.evaluate(() => {
    const r = document.querySelector(".ahRootV81");
    const panel = r?.querySelector(".ahPanelV81");
    const box = panel?.getBoundingClientRect();
    return {
      open: !!r && !r.hidden && r.classList.contains("open"),
      title: panel?.querySelector("#ahTitleV81")?.textContent || "",
      how: panel?.querySelectorAll(".ahHowListV81 li").length || 0,
      steps: panel?.querySelectorAll("[data-ah-step]").length || 0,
      screens: panel?.querySelectorAll(".mScr").length || 0,
      onScreens: panel?.querySelectorAll(".mScr.on").length || 0,
      hl: panel?.querySelectorAll(".mHlOn").length || 0,
      h: box ? box.height / innerHeight : 0,
      top: box ? box.top : 0,
      overflow: document.documentElement.scrollWidth > innerWidth + 1 || (panel && panel.scrollWidth > panel.clientWidth + 1)
    };
  });

// Kiekviena tema: kaip ją pasiekti ir kokia antraštė
const ROUTES = [
  ["sutartys", "Sutarties generavimas", async p => tap(p, '[data-garage-action="contract"]')],
  ["skeneris", "Registracijos liudijimo skeneris", async p => tap(p, '[data-garage-action="addcar"]')],
  ["uzduotys", "Užduotys ir čekiai", async p => tap(p, '[data-garage-action="tasks"]')],
  ["variantai", "Variantai ir derybos", async p => tap(p, '[data-garage-action="leads"]')],
  ["vadybininkas", "Vadybininkas", async p => tap(p, '[data-garage-action="what"]')],
  [
    "pajamos",
    "Įplauka automobiliui",
    async p => {
      await tap(p, '.navBtn[data-view="accounting"]');
      await tap(p, '#accountingRoot [data-accounting-panel="income"]');
    }
  ],
  [
    "islaidos",
    "Išlaida automobiliui",
    async p => {
      await tap(p, '.navBtn[data-view="accounting"]');
      await tap(p, '#accountingRoot [data-accounting-panel="expense"]');
    }
  ],
  [
    "ataskaitos",
    "Ataskaita buhalterei",
    async p => {
      await tap(p, '.navBtn[data-view="accounting"]');
      await tap(p, '#accountingRoot [data-accounting-panel="reports"]');
    }
  ],
  [
    "backup_skolos",
    "Atsarginė kopija ir skolos",
    async p => {
      await tap(p, '.navBtn[data-view="menu"]');
      await menuTile(p, "Nustatymai");
    }
  ]
];

for (const [width, height, tag] of [
  [430, 932, "430"],
  [1280, 860, "1280"]
]) {
  const p = await open(width, height);
  for (const [id, title, go] of ROUTES) {
    await tap(p, '.navBtn[data-view="garage"]');
    await go(p);
    await p.waitForTimeout(200);
    const loc = p.locator(`.ahTrigV81[data-help="${id}"]:visible`);
    const trig = (await loc.count()) ? await loc.first().elementHandle() : null;
    if (!trig) {
      check(false, `${tag}px ${id}: „?“ mygtukas matomas`);
      continue;
    }
    // Antraštės tekstas nepasikeitė (mygtukas be teksto)
    const headText = await trig.evaluate(el => el.parentElement.textContent.trim());
    check(!/\?/.test(headText), `${tag}px ${id}: antraštės tekstas nepakitęs („${headText.slice(0, 30)}“)`);
    await trig.scrollIntoViewIfNeeded();
    await trig.click();
    await p.waitForTimeout(450);
    const s = await helpState(p);
    check(
      s.open && s.title === title && s.how >= 4 && s.steps >= 4 && s.screens >= 2 && s.onScreens === 1 && s.hl === 1 && !s.overflow,
      `${tag}px ${id}: langas „${s.title}“ (${s.how} punktai, ${s.steps} žingsniai, ${s.screens} ekranai)`
    );
    if (width < 768) check(s.h >= 0.59 && s.h <= 0.86, `${tag}px ${id}: aukštis ${Math.round(s.h * 100)} % ekrano`);
    else check(s.top > 20, `${tag}px ${id}: centruotas langas`);
    await p.screenshot({ path: path.join(shots, `${id}-${tag}.png`) });
    // Paskutinis žingsnis – kitas ekranas ir paryškinimas
    const last = (await p.$$(".ahRootV81 [data-ah-step]")).at(-1);
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await p.waitForTimeout(450);
    const s2 = await p.evaluate(() => {
      const panel = document.querySelector(".ahPanelV81");
      const btn = [...panel.querySelectorAll("[data-ah-step]")].at(-1);
      const hl = panel.querySelector(".mHlOn");
      return { pressed: btn.getAttribute("aria-pressed"), hlScreenOn: !!hl?.closest(".mScr.on"), hl: panel.querySelectorAll(".mHlOn").length };
    });
    check(s2.pressed === "true" && s2.hlScreenOn && s2.hl === 1, `${tag}px ${id}: paskutinis žingsnis paryškina vietą makete`);
    await p.screenshot({ path: path.join(shots, `${id}-${tag}-last.png`) });
    // Uždarymas: Escape (sutarčiai – X), atidarytas langas lieka
    if (id === "sutartys") {
      await p.fill("#ctPrice", "4321");
      await p.click(".ahRootV81 .ahCloseV81");
    } else await p.keyboard.press("Escape");
    await p.waitForTimeout(450);
    const closed = await p.evaluate(() => document.querySelector(".ahRootV81").hidden);
    check(closed, `${tag}px ${id}: langas uždaromas`);
    if (id === "sutartys") {
      const kept = await p.evaluate(() => ({
        sheet: document.getElementById("modalBackdrop").classList.contains("show"),
        price: document.getElementById("ctPrice")?.value
      }));
      check(kept.sheet && kept.price === "4321", "sutartis lieka atidaryta su įvestais duomenimis " + JSON.stringify(kept));
      await tap(p, "#sheet .closeBtn");
    }
  }
  // Prenumerata – per API (blokas rodomas tik prisijungus)
  const ok = await p.evaluate(() => window.AutoEasierHelp.open("prenumerata"));
  await p.waitForTimeout(450);
  const sp = await helpState(p);
  check(ok && sp.open && sp.title === "Prenumerata", `${tag}px prenumerata: atidaroma per AutoEasierHelp.open()`);
  await p.screenshot({ path: path.join(shots, `prenumerata-${tag}.png`) });
  // Uždarymas paspaudus fone (kompiuteryje fonas matomas šonuose)
  await p.mouse.click(5, 5);
  await p.waitForTimeout(450);
  check(await p.evaluate(() => document.querySelector(".ahRootV81").hidden), `${tag}px: uždaroma paspaudus fone`);
  check(!p.errors.length, `${tag}px: be JS klaidų ${p.errors.join("; ")}`);
  await p.context().close();
}

// Telefone – nutempus žemyn uždaroma
{
  const p = await open(430, 932);
  const ctx = p.context();
  await p.evaluate(() => window.AutoEasierHelp.open("variantai"));
  await p.waitForTimeout(450);
  const head = await p.$(".ahRootV81 .ahGrabV81");
  const box = await head.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + 5);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(box.x + box.width / 2, box.y + 5 + i * 22);
  await p.mouse.up();
  await p.waitForTimeout(450);
  check(await p.evaluate(() => document.querySelector(".ahRootV81").hidden), "telefone: nutempus žemyn uždaroma");
  await ctx.close();
}

// Automobiliui priskirtos operacijos keičia savikainą (be dvigubo skaičiavimo)
{
  const p = await open(430, 932);
  const before = await p.evaluate(() => {
    const s = window.AUTOEASIER_APP_DATA.getState();
    const c = s.cars.find(x => x.id === "car-demo-1");
    return { taskExp: (c.checklist || []).reduce((n, i) => n + (Number(i.expense) || 0), 0), buy: Number(c.buyPrice || 0) };
  });
  const cardFacts = () =>
    p.evaluate(() => {
      const card = [...document.querySelectorAll("#activeCarGrid .carListCard")].find(c => c.querySelector('[data-open-car="car-demo-1"]') || c.dataset.openCar === "car-demo-1");
      return [...(card?.querySelectorAll(".garageRefFacts strong") || [])].map(s => Number(s.textContent.replace(/[^\d,-]/g, "").replace(",", ".")));
    });
  const add = async (kind, amount) => {
    await tap(p, '.navBtn[data-view="accounting"]');
    await tap(p, `#accountingRoot [data-accounting-panel="${kind}"]`);
    await p.fill("#accountingMoneyAmount", String(amount));
    await p.selectOption("#accountingMoneyCar", "car-demo-1");
    await p.evaluate(() => document.querySelector("#accountingMoneyFormV8 button[type=submit]").click());
    await p.waitForTimeout(500);
    await tap(p, "#sheet [data-accounting-required-close]");
    await tap(p, '.navBtn[data-view="garage"]');
  };
  const f0 = await cardFacts();
  await add("expense", 120);
  const f1 = await cardFacts();
  check(
    f1[1] === before.taskExp + 120 && f1[2] === before.buy + before.taskExp + 120,
    `išlaida automobiliui: išlaidos ${f0[1]} → ${f1[1]}, savikaina ${f0[2]} → ${f1[2]}`
  );
  await add("income", 50);
  const f2 = await cardFacts();
  check(f2[1] === before.taskExp + 70 && f2[2] === before.buy + before.taskExp + 70, `įplauka automobiliui: savikaina ${f1[2]} → ${f2[2]}`);
  // Užduoties išlaida (carTask) skaičiuojama tik kartą
  const dbl = await p.evaluate(() => {
    const s = window.AUTOEASIER_APP_DATA.getState();
    return s.finances.transactions.filter(t => t.source === "carTask" && t.carId === "car-demo-1").reduce((n, t) => n + Number(t.amount || 0), 0);
  });
  check(f2[1] === before.taskExp + 70, `užduočių išlaidos (${dbl} € Buhalterijoje) neskaičiuojamos dar kartą`);
  check(!p.errors.length, "savikaina: be JS klaidų " + p.errors.join("; "));
  await p.context().close();
}

await b.close();
server.close();
console.log(fails.length ? `\n${fails.length} nepavyko` : "\nVisi pagalbos testai praėjo");
process.exit(fails.length ? 1 : 0);
