#!/usr/bin/env node
// v84 „Ką moka AutoEasier“ testas (430 ir 1280 px, be interneto): mygtukas prisijungimo ekrane, langas atsidaro ir
// užsidaro (Escape, fonas, tempimas žemyn, „Atgal“), visos funkcijos turi detalę ir maketą, žingsniai perjungiami
// (segmentai, braukimas, rodyklės), „Seniau / Su AutoEasier“, CTA atidaro prenumeratos langą, prisijungimo forma
// nepaliečiama, mažiau judesio režimas, be horizontalaus perpildymo ir be JS klaidų.
// Naudojimas: node tools/test-features.mjs   (nuotraukos – .verify/features-*.png)
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
const b = await chromium.launch();
const errors = [];
async function openPage(width, opts = {}) {
  const ctx = await b.newContext({ viewport: { width, height: width > 600 ? 860 : 932 }, ...opts });
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(width + ": " + e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(base + "index.html");
  await p.waitForTimeout(900);
  return p;
}
const wait = (p, ms = 380) => p.waitForTimeout(ms);
const isOpen = p =>
  p.evaluate(() => {
    const h = document.getElementById("aeFtV84");
    return !!h && !h.hidden && h.classList.contains("is-open");
  });
const state = p =>
  p.evaluate(() => {
    const art = document.querySelector("#aeFtV84 .ftDV84");
    return {
      id: art?.dataset.ftId,
      step: art?.querySelector(".fmScrV84")?.dataset.step,
      cur: [...(art?.querySelectorAll(".ftSegV84") || [])].findIndex(s => s.getAttribute("aria-current") === "step"),
      segs: art?.querySelectorAll(".ftSegV84").length || 0,
      cmp: art?.querySelector(".ftCmpV84")?.dataset.cmp,
      detail: document.getElementById("aeFtV84")?.classList.contains("is-detail")
    };
  });

// ================= Telefonas =================
{
  console.log("\n— 430 px —");
  const p = await openPage(430);
  const entry = await p.evaluate(() => {
    const e = document.getElementById("aeFtEntryV84");
    const t = document.getElementById("autoEasierSubscription");
    const re = e?.getBoundingClientRect(),
      rt = t?.getBoundingClientRect();
    return {
      ok: !!e && re.width > 0 && re.height >= 44,
      below: re && rt ? re.top >= rt.bottom - 1 && re.left < rt.right && re.right > rt.left : false,
      text: e?.textContent.trim(),
      inView: re ? re.bottom <= innerHeight : false
    };
  });
  check(entry.ok && entry.below && entry.inView, "mygtukas „Ką moka AutoEasier“ po „Išbandyti 7 d. nemokamai“ " + JSON.stringify(entry));
  await p.fill("#autoEasierEmail", "vardas@pavyzdys.lt");
  await p.click("#aeFtEntryV84");
  await wait(p, 500);
  const dlg = await p.evaluate(() => {
    const d = document.querySelector("#aeFtV84 [role=dialog]");
    const r = d?.getBoundingClientRect();
    return {
      modal: d?.getAttribute("aria-modal"),
      label: document.getElementById(d?.getAttribute("aria-labelledby") || "x")?.textContent,
      h: r ? Math.round((r.height / innerHeight) * 100) : 0,
      focus: d?.contains(document.activeElement),
      rows: document.querySelectorAll("#aeFtV84 .ftRowV84").length,
      oneLine: [...document.querySelectorAll("#aeFtV84 .ftRowTxtV84 small")].every(s => s.scrollWidth <= s.clientWidth + 1),
      cta: document.querySelector("#aeFtV84 [data-ft-cta]")?.textContent.trim()
    };
  });
  check(await isOpen(p), "langas atsidaro");
  check(dlg.modal === "true" && /Visa auto prekyba/.test(dlg.label || ""), "role=dialog, aria-modal, antraštė");
  check(dlg.h >= 86 && dlg.h <= 90, "aukštis ~88 % ekrano: " + dlg.h + " %");
  check(dlg.focus, "fokusas lange");
  check(dlg.rows >= 8 && dlg.rows <= 10, "funkcijų: " + dlg.rows);
  check(dlg.oneLine, "kiekvienos funkcijos nauda – viena eilutė");
  check(dlg.cta === "Išbandyti 7 d. nemokamai", "prilipęs CTA");
  await p.screenshot({ path: path.join(out, "features-430-list.png") });

  // Visos funkcijos: detalė, maketas, žingsniai
  const ids = await p.evaluate(() => window.AutoEasierFeatures.list.map(f => f.id));
  for (const id of ids) {
    await p.evaluate(id => document.querySelector(`#aeFtV84 .ftRowV84[data-ft-open="${id}"]`).click(), id);
    await wait(p, 420);
    const s = await state(p);
    const d = await p.evaluate(() => {
      const art = document.querySelector("#aeFtV84 .ftDV84");
      return {
        head: art?.querySelector(".ftDHeadV84")?.textContent.trim(),
        mock: !!art?.querySelector(".fmScrV84 .fmLayerV84, .fmScrV84 .fmDevV84"),
        hidden: art?.querySelector(".ftStageV84")?.getAttribute("aria-hidden"),
        sr: art?.querySelectorAll(".ftSrV84 li").length,
        chips: art?.querySelectorAll(".ftChipsV84 li").length,
        next: !!art?.querySelector("[data-ft-next]"),
        old: art?.querySelector(".ftCmpBoxV84 .old")?.textContent.trim(),
        now: art?.querySelector(".ftCmpBoxV84 .new")?.textContent.trim()
      };
    });
    check(
      s.id === id && s.detail && d.head && d.mock && d.hidden === "true" && s.segs >= 3 && s.segs <= 4 && d.sr === s.segs && d.chips === 3 && d.next && d.old && d.now,
      `${id}: detalė, maketas, ${s.segs} žingsniai, 3 ženkleliai, palyginimas`
    );
    // paskutinis žingsnis paspaudus segmentą
    await p.evaluate(n => document.querySelectorAll("#aeFtV84 .ftSegV84")[n - 1].click(), s.segs);
    await wait(p, 900);
    const s2 = await state(p);
    check(s2.cur === s.segs - 1 && s2.step === String(s.segs), `${id}: segmentas → ${s.segs} žingsnis (data-step ${s2.step})`);
    if (id === "marza" || id === "sutartys") {
      await p.evaluate(() => (document.querySelector("#aeFtV84 .ftDetailPageV84").scrollTop = 0));
      await p.screenshot({ path: path.join(out, `features-430-${id}.png`) });
    }
    await p.evaluate(() => history.back());
    await wait(p, 420);
    const back = await state(p);
    check(!back.detail && (await isOpen(p)), `${id}: „Atgal“ grąžina į sąrašą`);
  }

  // Braukimas, rodyklės, automatinis grojimas, palyginimas
  await p.evaluate(() => document.querySelector('#aeFtV84 .ftRowV84[data-ft-open="pridejimas"]').click());
  await wait(p, 300);
  await p.screenshot({ path: path.join(out, "features-430-pridejimas.png") });
  await wait(p, 3700);
  let s = await state(p);
  check(s.cur >= 1, "automatiškai groja (po ~4 s – " + (s.cur + 1) + " žingsnis)");
  check(s.cmp === "new", "„Seniau“ savaime persijungia į „Su AutoEasier“");
  const box = await (await p.$("#aeFtV84 .ftStageV84")).boundingBox();
  const swipe = async dx => {
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, { steps: 4 });
    await p.mouse.up();
    await wait(p, 250);
  };
  await p.evaluate(() => document.querySelectorAll("#aeFtV84 .ftSegV84")[1].click());
  await wait(p, 200);
  await swipe(-80);
  s = await state(p);
  check(s.cur === 2, "braukiant kairėn – kitas žingsnis (" + (s.cur + 1) + ")");
  await swipe(80);
  s = await state(p);
  check(s.cur === 1, "braukiant dešinėn – ankstesnis žingsnis (" + (s.cur + 1) + ")");
  check(
    await p.evaluate(() => !document.querySelector("#aeFtV84 [data-ft-replay]").hidden),
    "palietus – pauzė, matomas „Tęsti / Pakartoti“"
  );
  await p.keyboard.press("ArrowRight");
  await wait(p, 200);
  check((await state(p)).cur === 2, "rodyklė → kitas žingsnis");
  await p.keyboard.press("ArrowLeft");
  await wait(p, 200);
  check((await state(p)).cur === 1, "rodyklė ← ankstesnis žingsnis");
  await p.evaluate(() => document.querySelector('#aeFtV84 [data-ft-cmp="old"]').click());
  await wait(p, 300);
  const cmp = await p.evaluate(() => {
    const c = document.querySelector("#aeFtV84 .ftCmpV84");
    return { v: c.dataset.cmp, old: getComputedStyle(c.querySelector(".old")).opacity, nw: getComputedStyle(c.querySelector(".new")).opacity };
  });
  check(cmp.v === "old" && +cmp.old > 0.99 && +cmp.nw < 0.01, "„Seniau“ rodo seną būdą " + JSON.stringify(cmp));
  await p.evaluate(() => document.querySelector('#aeFtV84 [data-ft-cmp="new"]').click());
  await wait(p, 300);
  check((await state(p)).cmp === "new", "„Su AutoEasier“ – nauda");
  await p.evaluate(() => document.querySelector("#aeFtV84 [data-ft-next]").click());
  await wait(p, 450);
  check((await state(p)).id === "garazas", "„Kita funkcija“ atidaro kitą");
  const ov = await p.evaluate(() => {
    const pg = document.querySelector("#aeFtV84 .ftDetailPageV84");
    return { page: pg.scrollWidth - pg.clientWidth, doc: document.documentElement.scrollWidth - innerWidth };
  });
  check(ov.page <= 1 && ov.doc <= 1, "be horizontalaus perpildymo " + JSON.stringify(ov));

  // „Atgal“ du kartus – detalė, tada langas
  await p.evaluate(() => history.back());
  await wait(p, 400);
  await p.evaluate(() => history.back());
  await wait(p, 500);
  check(!(await isOpen(p)), "„Atgal“ antrą kartą uždaro langą");
  check((await p.inputValue("#autoEasierEmail")) === "vardas@pavyzdys.lt", "prisijungimo forma nepaliesta");

  // Escape + fokusas atgal
  await p.click("#aeFtEntryV84");
  await wait(p, 450);
  await p.keyboard.press("Escape");
  await wait(p, 500);
  check(!(await isOpen(p)), "Escape uždaro");
  check(await p.evaluate(() => document.activeElement?.id === "aeFtEntryV84"), "fokusas grąžinamas į mygtuką");
  check(await p.evaluate(() => history.state?.aeFtV84 === undefined), "istorija išvalyta");

  // Fonas
  await p.click("#aeFtEntryV84");
  await wait(p, 450);
  await p.mouse.click(215, 40);
  await wait(p, 500);
  check(!(await isOpen(p)), "paspaudus foną – uždaro");

  // Tempimas žemyn
  await p.click("#aeFtEntryV84");
  await wait(p, 450);
  const g = await (await p.$("#aeFtV84 .ftHandleV84")).boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + 4);
  await p.mouse.down();
  for (let y = 10; y <= 120; y += 10) {
    await p.mouse.move(g.x + g.width / 2, g.y + 4 + y);
    await p.waitForTimeout(40);
  }
  await p.waitForTimeout(120);
  await p.mouse.up();
  await wait(p, 500);
  check(await isOpen(p), "trumpai patempus – grįžta į vietą");
  await p.mouse.move(g.x + g.width / 2, g.y + 4);
  await p.mouse.down();
  await p.mouse.move(g.x + g.width / 2, g.y + 400, { steps: 8 });
  await p.mouse.up();
  await wait(p, 500);
  check(!(await isOpen(p)), "nutempus žemyn – uždaro");

  // Fokuso spąstai
  await p.click("#aeFtEntryV84");
  await wait(p, 450);
  for (let i = 0; i < 25; i++) await p.keyboard.press("Tab");
  check(await p.evaluate(() => document.querySelector("#aeFtV84 .ftPanelV84").contains(document.activeElement)), "Tab lieka lange");

  // CTA → prenumeratos langas
  await p.click("#aeFtV84 [data-ft-cta]");
  await wait(p, 1200);
  const bill = await p.evaluate(() => {
    const h = document.getElementById("aeBillV70");
    return { open: !!h && !h.hidden && h.classList.contains("is-open"), kind: h?.dataset.kind };
  });
  check(!(await isOpen(p)) && bill.open, "CTA atidaro esamą prenumeratos langą " + JSON.stringify(bill));
  await p.context().close();
}

// ================= Kompiuteris =================
{
  console.log("\n— 1280 px —");
  const p = await openPage(1280);
  await p.click("#aeFtEntryV84");
  await wait(p, 600);
  const d = await p.evaluate(() => {
    const panel = document.querySelector("#aeFtV84 .ftPanelV84").getBoundingClientRect();
    const host = document.getElementById("aeFtV84").getBoundingClientRect();
    const list = document.querySelector("#aeFtV84 .ftListPageV84").getBoundingClientRect();
    const det = document.querySelector("#aeFtV84 .ftDetailPageV84");
    const dr = det.getBoundingClientRect();
    return {
      w: Math.round(panel.width),
      centered:
        Math.abs(panel.left + panel.width / 2 - (host.left + host.width / 2)) < 2 &&
        Math.abs(panel.top + panel.height / 2 - (host.top + host.height / 2)) < 2,
      cols: list.right <= dr.left + 1 && list.width > 300 && dr.width > 400,
      first: document.querySelector("#aeFtV84 .ftDV84")?.dataset.ftId,
      fits: det.scrollHeight <= det.clientHeight + 2,
      back: getComputedStyle(document.querySelector("#aeFtV84 .ftBackV84")).display,
      oneLine: [...document.querySelectorAll("#aeFtV84 .ftRowTxtV84 small")].every(s => s.scrollWidth <= s.clientWidth + 1),
      headLines: Math.round(
        document.querySelector("#aeFtV84 .ftDHeadV84").offsetHeight /
          parseFloat(getComputedStyle(document.querySelector("#aeFtV84 .ftDHeadV84")).lineHeight)
      )
    };
  });
  check(d.w <= 920 && d.w >= 880 && d.centered, "centruotas langas ≤ 920 px: " + d.w);
  check(d.cols, "du stulpeliai: sąrašas kairėje, detalė dešinėje");
  check(d.first === "pridejimas", "pirma funkcija parinkta iš karto");
  check(d.back === "none", "„Visos funkcijos“ nerodoma");
  check(d.oneLine, "kompiuteryje nauda – viena eilutė");
  check(d.headLines <= 3, "antraštė ne ilgesnė nei 3 eilutės: " + d.headLines);
  await p.evaluate(() => document.querySelector('#aeFtV84 .ftRowV84[data-ft-open="sutartys"]').click());
  await wait(p, 700);
  const d2 = await p.evaluate(() => {
    const det = document.querySelector("#aeFtV84 .ftDetailPageV84");
    return {
      id: document.querySelector("#aeFtV84 .ftDV84")?.dataset.ftId,
      cur: document.querySelector('#aeFtV84 .ftRowV84[aria-current="true"]')?.dataset.ftOpen,
      fits: det.scrollHeight <= det.clientHeight + 2
    };
  });
  check(d2.id === "sutartys" && d2.cur === "sutartys", "paspaudus kitą funkciją – detalė dešinėje pasikeičia");
  check(d.fits && d2.fits, "detalė telpa be slinkimo");
  await wait(p, 2600);
  await p.screenshot({ path: path.join(out, "features-1280.png") });
  await p.keyboard.press("Escape");
  await wait(p, 500);
  check(!(await isOpen(p)), "Escape uždaro (kompiuteris)");
  await p.context().close();
}

// ================= Mažiau judesio =================
{
  console.log("\n— prefers-reduced-motion —");
  const p = await openPage(430, { reducedMotion: "reduce" });
  await p.click("#aeFtEntryV84");
  await wait(p, 400);
  await p.evaluate(() => document.querySelector('#aeFtV84 .ftRowV84[data-ft-open="marza"]').click());
  await wait(p, 3800);
  const r = await p.evaluate(() => ({
    cur: [...document.querySelectorAll("#aeFtV84 .ftSegV84")].findIndex(s => s.getAttribute("aria-current") === "step"),
    finger: getComputedStyle(document.querySelector("#aeFtV84 .fmFingerV84")).display,
    panelT: getComputedStyle(document.querySelector("#aeFtV84 .ftPanelV84")).transform,
    cmp: document.querySelector("#aeFtV84 .ftCmpV84").dataset.cmp
  }));
  check(r.cur === 0 && r.cmp === "old", "be automatinio grojimo");
  check(r.finger === "none", "be „piršto“ animacijos");
  check(r.panelT === "none", "langas be slinkimo (tik išryškėja)");
  await p.evaluate(() => document.querySelectorAll("#aeFtV84 .ftSegV84")[2].click());
  await wait(p, 300);
  check(
    await p.evaluate(() => document.querySelector("#aeFtV84 .fmScrV84").dataset.step === "3"),
    "žingsniai perjungiami rankiniu būdu"
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
console.log("\nVisi funkcijų vitrinos testai praėjo");
