#!/usr/bin/env node
// v83/v85 automobilio kortelės testas (430 ir 1280 px): dienos garaže, „Duomenys“, pasirengimo juosta ir sąrašas,
// išlaidos pridėjimas vietoje (kortelė neuždaroma), sklandus skilčių išskleidimas,
// kainos redagavimas su marža, savikainos išskaidymas, akordeonai (atmintis state.ui.carSections),
// juostos meniu „Dokumentai“ ir „⋯“, parduoto automobilio „Dokumentai buhalterei“, „?“ prie Užduočių.
// Naudojimas: node tools/test-car-card.mjs   (nuotraukos – .verify/car-card-*.png)
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
  res.writeHead(200, {
    "content-type": f.endsWith(".html")
      ? "text/html"
      : f.endsWith(".jpg")
        ? "image/jpeg"
        : "application/octet-stream"
  });
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
const demoRaw = fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8");
const KEY = "visureigiai_uab_v1";
const b = await chromium.launch();
const errors = [];

async function openPage(width, raw = demoRaw) {
  const ctx = await b.newContext({ viewport: { width, height: width > 600 ? 900 : 932 } });
  await ctx.clock.install({ time: new Date("2026-10-31T10:00:00") });
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(width + ": " + e.message));
  p.on("dialog", d => d.dismiss());
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.addInitScript(
    ([k, s]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(k, s);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [KEY, raw]
  );
  await p.goto(base + "index.html");
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  return p;
}
const wait = (p, ms = 320) => p.waitForTimeout(ms);
async function openCar(p, id) {
  await p.evaluate(() => document.querySelector('.navBtn[data-view="garage"]')?.click());
  await wait(p);
  if (id === "car-demo-2") {
    await p.evaluate(() => document.querySelector(".garageRefSoldToggle")?.click());
    await wait(p);
  }
  await p.evaluate(
    id => [...document.querySelectorAll("[data-open-car]")].find(e => e.dataset.openCar === id)?.click(),
    id
  );
  await wait(p, 700);
}
const closeCar = p => p.evaluate(() => document.querySelector("#sheet .closeBtn")?.click()).then(() => wait(p, 500));
const readyInfo = p =>
  p.evaluate(() => {
    const r = document.querySelector("#sheet [data-cc-ready]");
    const bar = r?.querySelector('[role="progressbar"]');
    return {
      title: r?.querySelector("strong")?.textContent.trim(),
      count: r?.querySelector(".ccRdyCountV83")?.textContent.replace(/\s+/g, " ").trim(),
      now: bar?.getAttribute("aria-valuenow"),
      max: bar?.getAttribute("aria-valuemax"),
      fill: bar ? Math.round(parseFloat(bar.querySelector("i")?.style.getPropertyValue("--p") || "0") * 100) : 0,
      next: r?.querySelector(".ccNextV83")?.textContent.replace(/\s+/g, " ").trim(),
      rows: [...(r?.querySelectorAll("[data-cc-row]") || [])].map(x => x.dataset.ccRow + ":" + x.className)
    };
  });
const savedCar = (p, id) =>
  p.evaluate(
    ([k, id]) => (JSON.parse(localStorage.getItem(k) || "{}").cars || []).find(c => c.id === id),
    [KEY, id]
  );

for (const W of [430, 1280]) {
  console.log(`\n— ${W} px —`);
  const p = await openPage(W);
  await openCar(p, "car-demo-1");
  const head = await p.evaluate(() => ({
    v83: document.querySelector("#sheet")?.classList.contains("ccV83"),
    days: document.querySelector("#sheet .ccDaysV83")?.textContent.trim(),
    plate: !!document.querySelector("#sheet .ccSubV83"),
    oldTiles: !!document.querySelector("#sheet #cdInfoV51:not(.ccHiddenV83)"),
    hero: document.querySelector("#sheet .ccHeroV83")?.className
  }));
  check(head.v83 && head.plate, "kortelė v83, antraštėje numeris");
  check(head.days === "Garaže 21 d.", "dienos garaže: " + head.days);
  check(!head.oldTiles, "senos SDK/Draudimas/TA plytelės paslėptos");
  check(/ccHeroEmpty|empty/.test(head.hero || "") || !!(await p.$("#sheet .ccHeroEmptyV83")), "be nuotraukų – kompaktiškas „Pridėti nuotraukų“");

  // Pasirengimas
  let r = await readyInfo(p);
  check(r.count === "3 iš 7" && r.now === "3" && r.max === "7", "pasirengimas 3 iš 7 " + JSON.stringify(r.count));
  check(r.fill === 43, `ištisinė juosta užpildyta ${r.fill} %`);
  check(/draudim/i.test(r.next || ""), "kitas žingsnis – draudimas: " + r.next);
  await p.click("#sheet [data-cc-ready-toggle]");
  await wait(p);
  r = await readyInfo(p);
  const firstDone = r.rows.findIndex(x => /done/.test(x));
  const lastTodo = r.rows.map(x => !/done/.test(x)).lastIndexOf(true);
  check(r.rows.length === 7 && firstDone > lastTodo, "sąrašas: pirma neatlikti, po to atlikti " + r.rows.join(", "));
  check(
    await p.evaluate(() => document.querySelector("#sheet [data-cc-ready-toggle]").getAttribute("aria-expanded") === "true"),
    "pasirengimo sąrašas – aria-expanded"
  );

  // Pirkimo sutartis įkeliama → skaičius, segmentai, sąrašas atsinaujina
  const docInput = await p.$("#sheet #viewVehicledoc_purchase");
  check(!!docInput, "pirkimo sutarties įkėlimo laukas yra");
  if (docInput) {
    await docInput.setInputFiles({ name: "pirkimo-sutartis.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
    await wait(p, 900);
    r = await readyInfo(p);
    check(r.count === "4 iš 7" && r.now === "4" && r.fill === 57, "įkėlus sutartį – 4 iš 7, juosta " + r.fill + " %");
    check(r.rows.some(x => /^purchase:.*done/.test(x)), "sutarties eilutė atlikta");
  }

  // Duomenys – visada atidaryti, pačiame viršuje po nuotrauka
  const data = await p.evaluate(() => {
    const d = document.querySelector("#sheet [data-cc-data]");
    const body = document.querySelector("#sheet .premiumDetailBody");
    return {
      first: body?.firstElementChild === d,
      stats: [...(d?.querySelectorAll(".ccStatV85 small") || [])].map(x => x.textContent).join("|"),
      specs: d?.querySelectorAll(".ccSpecV85").length,
      vin: d?.querySelector("[data-cc-copy]")?.dataset.ccCopy,
      acc: !!document.querySelector('#sheet [data-cc-sec="data"]')
    };
  });
  check(data.first && !data.acc, "„Duomenys“ – pirmas blokas, ne išskleidžiamas");
  check(data.stats === "TA|Draudimas|SDK" && data.specs === 5 && !!data.vin, "Duomenys: TA, draudimas, SDK, 5 laukai, VIN " + JSON.stringify(data));
  await p.click("#sheet [data-cc-copy]");
  await wait(p, 250);
  check(await p.evaluate(() => document.querySelector("#sheet [data-cc-copy]").classList.contains("is-copied")), "VIN kopijuojamas (pažymima varnele)");

  // Skaičiai: Pirkta · Išlaidos · Savikaina
  const nums = await p.evaluate(() => {
    const n = document.querySelector("#sheet [data-cc-nums]");
    return {
      labels: [...n.querySelectorAll(".ccNumV85 small")].map(x => x.textContent).join("|"),
      h: Math.round(n.getBoundingClientRect().height)
    };
  });
  check(nums.labels === "Pirkta|Išlaidos|Savikaina" && nums.h <= 76, "skaičiai: " + nums.labels + ", aukštis " + nums.h + " px");

  // Savikainos išskaidymas, kaina ir marža
  await p.click("#sheet [data-cc-cost]");
  await wait(p, 500);
  const cost = await p.evaluate(() => ({
    exp: document.querySelector("#sheet [data-cc-cost]")?.getAttribute("aria-expanded"),
    rows: document.querySelectorAll("#sheet [data-cc-cost-body] .ccCostRowV83").length,
    add: !!document.querySelector("#sheet [data-cc-cost-body] [data-cc-exp-open]"),
    h: Math.round(document.querySelector("#sheet [data-cc-nums] .ccAccBodyV83").getBoundingClientRect().height)
  }));
  check(cost.exp === "true" && cost.rows >= 1 && cost.add && cost.h > 100, "savikainos išskaidymas išsiskleidžia " + JSON.stringify(cost));
  const before = await p.evaluate(() => document.querySelector("#sheet [data-cc-margin]")?.textContent.trim());
  await p.click("#sheet [data-cc-price]");
  await wait(p, 200);
  const inp = await p.$("#sheet .ccPriceEditV83 input, #sheet input.ccPriceEditV83");
  check(!!inp, "kaina redaguojama vietoje");
  if (inp) {
    await inp.fill("6900");
    await wait(p, 150);
    const live = await p.evaluate(() => document.querySelector("#sheet [data-cc-margin]")?.textContent.trim());
    check(live !== before, `marža keičiasi rašant: ${before} → ${live}`);
    await inp.press("Enter");
    await wait(p, 500);
    const priceTxt = await p.evaluate(() => document.querySelector("#sheet [data-cc-price]")?.textContent.replace(/\s/g, ""));
    check(/6900/.test(priceTxt || ""), "kaina rodoma: " + priceTxt);
    check((await savedCar(p, "car-demo-1"))?.askingPrice == 6900, "kaina išsaugota į askingPrice");
  }

  // Išlaida pridedama vietoje – kortelė lieka atidaryta
  const spentBefore = await p.evaluate(() => document.querySelectorAll("#sheet .ccNumV85 b")[1]?.textContent.replace(/\D/g, ""));
  await p.click("#sheet [data-cc-exp-open]");
  await wait(p, 450);
  await p.fill("#sheet [data-cc-exp-amount]", "120");
  await p.click('#sheet [data-cc-exp-cat="Detalės"]');
  await p.click('#sheet [data-cc-exp-form] button[type="submit"]');
  await wait(p, 900);
  const exp = await p.evaluate(
    ([k, id]) => {
      const s = document.getElementById("sheet");
      const tx = (JSON.parse(localStorage.getItem(k)).finances?.transactions || []).find(t => t.carId === id && t.category === "Detalės");
      return {
        open: document.getElementById("modalBackdrop")?.classList.contains("show") && s.dataset.carV63 === id,
        spent: document.querySelectorAll("#sheet .ccNumV85 b")[1]?.textContent.replace(/\D/g, ""),
        row: !!s.querySelector(".ccCostRowV83.ccFlashV85"),
        form: !!s.querySelector("[data-cc-exp-form]"),
        tx: tx ? tx.amount + "/" + tx.source : null
      };
    },
    [KEY, "car-demo-1"]
  );
  check(exp.open && !exp.form, "pridėjus išlaidą kortelė lieka atidaryta");
  check(+exp.spent === +spentBefore + 120 && exp.row, `išlaidos atsinaujina vietoje: ${spentBefore} → ${exp.spent} €`);
  check(exp.tx === "120/accounting", "išlaida įrašyta su automobiliu (Buhalterija): " + exp.tx);

  // Akordeonai
  const tasksOpen = await p.evaluate(() => document.querySelector('#sheet [data-cc-sec="tasks"]')?.classList.contains("is-open"));
  check(tasksOpen, "Užduotys atidarytos (yra vėluojančių)");
  check(!!(await p.$('#sheet [data-cc-sec="tasks"] .ccSecHeadV83 .ccHelpSlotV83 .aeHelpBtnV81, #sheet [data-cc-sec="tasks"] .ccSecHeadV83 [data-help]')), "„?“ prie Užduočių");
  await p.click('#sheet [data-cc-sec-toggle="photos"]');
  await wait(p, 120);
  const mid = await p.evaluate(() => {
    const b = document.querySelector('#sheet [data-cc-sec="photos"] .ccAccBodyV83');
    return { h: b.getBoundingClientRect().height, anim: b.getAnimations().length };
  });
  await wait(p, 450);
  const docsSec = await p.evaluate(() => {
    const b = document.querySelector('#sheet [data-cc-sec="photos"] .ccAccBodyV83');
    return {
      open: document.querySelector('#sheet [data-cc-sec="photos"]')?.classList.contains("is-open"),
      exp: document.querySelector('#sheet [data-cc-sec-toggle="photos"]')?.getAttribute("aria-expanded"),
      h: Math.round(b.getBoundingClientRect().height),
      vis: getComputedStyle(b).visibility
    };
  });
  check(mid.anim >= 1 && mid.h < docsSec.h, `skiltis išsiskleidžia sklandžiai (animacija: ${Math.round(mid.h)} → ${docsSec.h} px)`);
  check(docsSec.open && docsSec.exp === "true" && docsSec.vis === "visible", "Nuotraukos atsidaro");
  await p.waitForTimeout(300);
  check((await p.evaluate(k => JSON.parse(localStorage.getItem(k)).ui?.carSections?.photos, KEY)) === true, "akordeono būsena išsaugota state.ui.carSections");

  // Juostos meniu
  const bar = await p.evaluate(() => {
    const a = document.querySelector("#sheet .carBottomActions");
    const r1 = a?.getBoundingClientRect();
    const s = document.getElementById("sheet").getBoundingClientRect();
    return {
      sell: !!a?.querySelector("#sellCarBtn"),
      docs: !!a?.querySelector('[data-cc-menu="docs"]'),
      more: !!a?.querySelector('[data-cc-menu="more"]'),
      bottom: Math.round(s.bottom - r1.bottom),
      sticky: getComputedStyle(a).position
    };
  });
  check(bar.sell && bar.docs && bar.more && bar.sticky === "sticky", "juosta: Parduoti · Dokumentai · ⋯ " + JSON.stringify(bar));
  await p.click('#sheet [data-cc-menu="docs"]');
  await wait(p, 250);
  const docsM = await p.evaluate(() => {
    const m = document.querySelector('#sheet [data-cc-menu-panel="docs"]');
    return { hidden: m?.hidden, pp: !!m?.querySelector(".carPpBottomBtn"), inv: !!m?.querySelector(".carInvBottomBtn[data-inv-car]") };
  });
  check(!docsM.hidden && docsM.pp && docsM.inv, "meniu „Dokumentai“: PP sutartis, Sąskaita faktūra");
  if (W === 430) await p.screenshot({ path: path.join(out, "car-card-docs-menu.png") });
  await p.keyboard.press("Escape");
  await wait(p, 200);
  check(await p.evaluate(() => document.querySelector('#sheet [data-cc-menu-panel="docs"]').hidden), "Escape uždaro meniu");
  await p.click('#sheet [data-cc-menu="more"]');
  await wait(p, 250);
  const moreM = await p.evaluate(() => {
    const m = document.querySelector('#sheet [data-cc-menu-panel="more"]');
    return { hidden: m?.hidden, edit: !!m?.querySelector("#editCarInfoBtn"), del: !!m?.querySelector("#deleteCarBtn") };
  });
  check(!moreM.hidden && moreM.edit && moreM.del, "meniu „⋯“: Redaguoti, Ištrinti");
  await p.evaluate(() => document.querySelector("#sheet .ccPriceCellV83")?.click());
  await wait(p, 200);

  const ov = await p.evaluate(() => {
    const s = document.getElementById("sheet");
    return { sheet: s.scrollWidth - s.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check(ov.sheet <= 1 && ov.doc <= 1, "be horizontalaus perpildymo " + JSON.stringify(ov));
  await p.evaluate(() => (document.getElementById("sheet").scrollTop = 0));
  await p.screenshot({ path: path.join(out, `car-card-${W}-active.png`) });

  // Atminta akordeono būsena po perkrovimo
  await closeCar(p);
  await p.reload();
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await wait(p, 400);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  await openCar(p, "car-demo-1");
  check(
    await p.evaluate(() => document.querySelector('#sheet [data-cc-sec="photos"]')?.classList.contains("is-open")),
    "po perkrovimo Nuotraukos lieka atidarytos"
  );
  await closeCar(p);

  // Parduotas automobilis
  await openCar(p, "car-demo-2");
  const sold = await p.evaluate(() => ({
    days: document.querySelector("#sheet .ccDaysV83")?.textContent.trim(),
    labels: [...document.querySelectorAll("#sheet [data-cc-nums] .ccNumV85 small")].map(s => s.textContent.trim()),
    send: !!document.querySelector("#sheet [data-cc-send-slot] .accountingCarActions, #sheet [data-cc-send-slot] button"),
    sendTxt: document.querySelector("#sheet [data-cc-send-slot]")?.textContent.replace(/\s+/g, " ").trim()
  }));
  check(sold.days === "Parduota per 22 d.", "parduotas: " + sold.days);
  check(sold.labels.join("|") === "Pirkta|Išlaidos|Savikaina", "skaičiai: " + sold.labels.join(" · "));
  const rs = await readyInfo(p);
  check(/Dokumentai buhalterei/.test(rs.title || "") && /^0 iš 4/.test(rs.count || ""), `buhalterei: ${rs.title} ${rs.count}`);
  if (!/Teikti buhalterei/.test(sold.sendTxt || "")) {
    await p.click("#sheet [data-cc-ready-toggle]").catch(() => {});
    await wait(p);
  }
  const sendTxt = await p.evaluate(() => document.querySelector("#sheet [data-cc-send-slot]")?.textContent.replace(/\s+/g, " ").trim());
  check(/Teikti buhalterei/.test(sendTxt || ""), "„Teikti buhalterei“ pasirengimo kortelėje");
  await p.screenshot({ path: path.join(out, `car-card-${W}-sold.png`) });
  await p.context().close();
}

// Pasibaigusi TA – raudona, skaičius mažesnis
{
  const s = JSON.parse(demoRaw);
  const c = s.cars.find(c => c.id === "car-demo-1");
  c.taStatus = "valid";
  c.taUntil = "2026-09-01";
  const p = await openPage(430, JSON.stringify(s));
  await openCar(p, "car-demo-1");
  await p.click("#sheet [data-cc-ready-toggle]");
  await wait(p);
  const r = await readyInfo(p);
  check(r.count === "2 iš 7" && r.now === "2", "pasibaigusi TA – 2 iš 7 " + r.count);
  const bad = await p.evaluate(() => {
    const row = document.querySelector('#sheet [data-cc-row="ta"]');
    return { cls: row?.className, pill: row?.querySelector(".ccPillV83")?.className, seg: !!document.querySelector('#sheet .ccStatV85.bad[data-cc-edit="ta"]') };
  });
  check(/bad/.test(bad.cls + bad.pill) && bad.seg, "pasibaigusi TA pažymėta raudonai " + JSON.stringify(bad));
  await p.context().close();
}

check(errors.length === 0, "be JS klaidų " + errors.join(" | "));
await b.close();
server.close();
if (fails.length) {
  console.log(`\n${fails.length} nepavyko`);
  process.exit(1);
}
console.log("\nVisi automobilio kortelės testai praėjo");
