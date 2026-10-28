#!/usr/bin/env node
// v80 Regitros įrankių testas (Meniu → „SDK paieška“, „Draudimo patikra“): plytelių vieta, patikra,
// Regitros atidarymas, kopijavimas, rezultatų įrašymas į automobilio kortelę, XSS, siauri ekranai.
// Naudojimas: node tools/test-regitra.mjs [dist/index.html]
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
const shots = path.join(root, ".verify/regitra");
fs.mkdirSync(shots, { recursive: true });
const base = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8"));
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const seed = JSON.parse(JSON.stringify(base));
seed.cars[0].vin = "JN1TANT31U0000001";
seed.cars[0].registrationDoc = "K1234567";
seed.cars[0].ppParty = { type: "person", name: "Jonas Jonaitis" };
seed.cars.push({
  id: "car-xss",
  name: '<img src=x onerror="window.__xss=1">',
  status: "aktyvus",
  buyPrice: 100,
  createdDateISO: "2026-10-01",
  checklist: [],
  photos: [],
  documents: [],
  plate: "XSS001"
});
const b = await chromium.launch();
async function open(width = 430) {
  const ctx = await b.newContext({ viewport: { width, height: 932 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: url });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await p.addInitScript(raw => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("visureigiai_uab_v1", raw);
      sessionStorage.setItem("seeded", "1");
    }
    window.__opened = [];
    window.open = (u, t, f) => {
      window.__opened.push(String(u));
      return null;
    };
  }, JSON.stringify(seed));
  await p.goto(url);
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  await p.click('.navBtn[data-view="menu"]');
  await p.waitForTimeout(300);
  return p;
}
const car = (p, id) => p.evaluate(id => window.AUTOEASIER_APP_DATA.getState().cars.find(c => c.id === id), id);
const clip = p => p.evaluate(() => navigator.clipboard.readText());

// 1. Vieta Meniu: SDK – po „Pardavimų statistika“, Draudimas – po „Nustatymai“
{
  const p = await open();
  const pos = await p.evaluate(() => {
    const r = t => {
      const el = [...document.querySelectorAll("#view-menu .menuLink")].find(b => b.textContent.includes(t));
      const x = el?.getBoundingClientRect();
      return x ? { x: Math.round(x.left), y: Math.round(x.top), b: Math.round(x.bottom) } : null;
    };
    return { stats: r("Pardavimų statistika"), settings: r("Nustatymai"), sdk: r("SDK paieška"), ins: r("Draudimo patikra") };
  });
  check(
    pos.sdk && pos.ins && pos.sdk.x === pos.stats.x && pos.sdk.y > pos.stats.b - 1 && pos.ins.x === pos.settings.x && pos.ins.y > pos.settings.b - 1,
    "plytelės: SDK po „Pardavimų statistika“, Draudimas po „Nustatymai“ " + JSON.stringify(pos)
  );
  await p.screenshot({ path: path.join(shots, "menu-430.png") });

  // 2. SDK paieška
  await p.click("#view-menu .menuLink:has-text('SDK paieška')");
  await p.waitForTimeout(250);
  const title = await p.textContent("#menuInlineDisclosure .menuDisclosureHead strong");
  check(title === "SDK paieška", "SDK: atsidaro Meniu skyriaus lange " + title);
  await p.click("#menu-tool-sdk [type=submit]");
  check((await p.textContent("#menu-tool-sdk [data-rg-error]")).includes("vardą"), "SDK: be vardo – klaida");
  await p.fill("#rgSdkFirstV80", "Jonas");
  await p.fill("#rgSdkLastV80", "Jonaitis");
  await p.fill("#rgSdkVinV80", "JN1TANT31U00000");
  check((await p.textContent("#menu-tool-sdk [data-rg-count]")) === "15/17", "SDK: VIN skaitiklis 15/17");
  await p.click("#menu-tool-sdk [type=submit]");
  check((await p.textContent("#menu-tool-sdk [data-rg-error]")).includes("17 simbolių"), "SDK: per trumpas VIN – klaida");
  await p.fill("#rgSdkVinV80", "JN1TANT31U00000O1");
  await p.click("#menu-tool-sdk [type=submit]");
  check((await p.textContent("#menu-tool-sdk [data-rg-error]")).includes("I, O ir Q"), "SDK: VIN su O – klaida");
  // Automobilio pasirinkimas užpildo laukus iš kortelės
  await p.selectOption("#rgSdkCarV80", "car-demo-1");
  const pre = await p.evaluate(() => ({
    first: document.getElementById("rgSdkFirstV80").value,
    last: document.getElementById("rgSdkLastV80").value,
    vin: document.getElementById("rgSdkVinV80").value
  }));
  check(pre.first === "Jonas" && pre.last === "Jonaitis" && pre.vin === "JN1TANT31U0000001", "SDK: automobilis užpildo vardą, pavardę ir VIN " + JSON.stringify(pre));
  await p.click("#menu-tool-sdk [type=submit]");
  await p.waitForTimeout(250);
  const opened = await p.evaluate(() => window.__opened.slice());
  check(opened.at(-1) === "https://www.eregitra.lt/services/vehicle-declaration/search", "SDK: atidaroma Regitros SDK paieška");
  check((await clip(p)) === "JN1TANT31U0000001", "SDK: VIN nukopijuotas");
  check((await p.textContent("#menu-tool-sdk")).includes("Prašome palaukti, ieškomas SDK"), "SDK: laukimo būsena");
  await p.screenshot({ path: path.join(shots, "sdk-wait-430.png"), fullPage: true });
  await p.click("#menu-tool-sdk [data-rg-copy=last]");
  await p.waitForTimeout(150);
  check((await clip(p)) === "Jonaitis", "SDK: pavardė kopijuojama iš laukimo būsenos");
  await p.evaluate(() => navigator.clipboard.writeText(" ab12-cd34 "));
  await p.click("#menu-tool-sdk [data-rg-paste]");
  await p.waitForTimeout(150);
  check((await p.inputValue("#rgSdkCodeV80")) === "AB12CD34", "SDK: įklijavimas sutvarko kodą");
  await p.click("#menu-tool-sdk [data-rg-sdk-save]");
  await p.waitForTimeout(300);
  check((await car(p, "car-demo-1")).sdk === "AB12CD34", "SDK: įrašytas į automobilio kortelę");
  check((await p.textContent("#menu-tool-sdk .rgSdkCodeV80")) === "AB12CD34", "SDK: rodomas „SDK KODAS“ blokas");
  await p.click("#menu-tool-sdk [data-rg-copy=code]");
  await p.waitForTimeout(150);
  check((await clip(p)) === "AB12CD34", "SDK: „Kopijuoti“ nukopijuoja kodą");
  await p.screenshot({ path: path.join(shots, "sdk-found-430.png"), fullPage: true });
  // Kodas patenka į sutartį
  const contractSdk = await p.evaluate(async () => {
    document.querySelector('.navBtn[data-view="garage"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-garage-action="contract"]').click();
    await new Promise(r => setTimeout(r, 300));
    const sel = document.getElementById("ctCar");
    if (sel) {
      sel.value = "car-demo-1";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 300));
    // Kai SDK yra kortelėje, sutartis jo nebeprašo – ima iš kortelės (37-contract-v52.js)
    const r = { field: !!document.getElementById("ctsdk"), summary: !!document.querySelector("#sheet .ctCarSumV55") };
    document.querySelector("#sheet .closeBtn")?.click();
    return r;
  });
  check(!contractSdk.field && contractSdk.summary, "SDK: sutartis kodą ima iš kortelės (laukas nebeprašomas) " + JSON.stringify(contractSdk));
  // Nerastas
  await p.click('.navBtn[data-view="menu"]');
  await p.waitForTimeout(200);
  await p.click("#view-menu .menuLink:has-text('SDK paieška')");
  await p.waitForTimeout(200);
  if (await p.$("#menu-tool-sdk [data-rg-new]")) await p.click("#menu-tool-sdk [data-rg-new]");
  await p.fill("#rgSdkFirstV80", "Petras");
  await p.fill("#rgSdkLastV80", "Petraitis");
  await p.fill("#rgSdkVinV80", "WVWZZZ1KZAW000001");
  await p.click("#menu-tool-sdk [type=submit]");
  await p.waitForTimeout(150);
  await p.click("#menu-tool-sdk [data-rg-sdk-none]");
  await p.waitForTimeout(150);
  check((await p.textContent("#menu-tool-sdk")).includes("SDK kodas pagal šiuos duomenis nerastas"), "SDK: „nerastas“ būsena");
  await p.screenshot({ path: path.join(shots, "sdk-none-430.png"), fullPage: true });

  // 3. Draudimo patikra
  await p.click("#view-menu .menuLink:has-text('Draudimo patikra')");
  await p.waitForTimeout(250);
  check((await p.textContent("#menuInlineDisclosure .menuDisclosureHead strong")) === "Draudimo patikra", "Draudimas: atsidaro Meniu skyriaus lange");
  const ph = await p.getAttribute("#rgInsPlateV80", "placeholder");
  check(ph === "Lietuviškas valst. nr. (pvz. LLL111)", "Draudimas: lauko užuomina " + ph);
  await p.fill("#rgInsPlateV80", "abc 123");
  await p.click("#menu-tool-ins [type=submit]");
  check((await p.textContent("#menu-tool-ins [data-rg-error]")).includes("dviejų"), "Draudimas: be liudijimo nr. / VIN – klaida");
  await p.selectOption("#rgInsCarV80", "car-demo-1");
  check((await p.inputValue("#rgInsDocV80")) === "K1234567", "Draudimas: automobilis užpildo liudijimo nr.");
  check((await p.textContent("#menu-tool-ins")).includes("Kortelėje: draudimas"), "Draudimas: rodoma dabartinė kortelės būsena");
  await p.click("#menu-tool-ins [type=submit]");
  await p.waitForTimeout(250);
  check((await p.evaluate(() => window.__opened.at(-1))) === "https://www.eregitra.lt/services/vehicle-registration/data-search", "Draudimas: atidaroma Regitros paieška");
  check((await clip(p)) === "K1234567", "Draudimas: liudijimo nr. nukopijuotas");
  await p.screenshot({ path: path.join(shots, "ins-wait-430.png"), fullPage: true });
  await p.click("#menu-tool-ins [data-rg-ins-pick=valid]");
  await p.fill("#rgInsUntilV80", "");
  await p.click("#menu-tool-ins [data-rg-ins-save]");
  check((await p.textContent("#menu-tool-ins [data-rg-error]")).includes("iki kada"), "Draudimas: be datos – klaida");
  await p.fill("#rgInsUntilV80", "2027-03-01");
  await p.fill("#rgInsCompanyV80", "BTA");
  await p.click("#menu-tool-ins [data-rg-ins-save]");
  await p.waitForTimeout(300);
  const c1 = await car(p, "car-demo-1");
  check(c1.insuranceStatus === "valid" && c1.insuranceUntil === "2027-03-01" && c1.insuranceCompany === "BTA", "Draudimas: „Galioja“ įrašyta į kortelę");
  const txt = await p.textContent("#menu-tool-ins");
  check(txt.includes("GALIOJA") && txt.includes("BTA") && txt.includes("Įrašyta į kortelę"), "Draudimas: žalias rezultatas su draudiku");
  await p.screenshot({ path: path.join(shots, "ins-valid-430.png"), fullPage: true });
  // Negalioja (be automobilio)
  await p.click("#menu-tool-ins [data-rg-new]");
  await p.fill("#rgInsPlateV80", "LLL111");
  await p.fill("#rgInsDocV80", "WVWZZZ1KZAW000001");
  await p.click("#menu-tool-ins [type=submit]");
  await p.waitForTimeout(150);
  check((await clip(p)) === "WVWZZZ1KZAW000001", "Draudimas: VIN nukopijuotas");
  await p.click("#menu-tool-ins [data-rg-ins-pick=invalid]");
  await p.waitForTimeout(150);
  const t2 = await p.textContent("#menu-tool-ins");
  check(t2.includes("NEGALIOJA") && !t2.includes("Įrašyta į kortelę"), "Draudimas: raudonas rezultatas be automobilio");
  await p.screenshot({ path: path.join(shots, "ins-invalid-430.png"), fullPage: true });
  // Būsena išlieka grįžus iš Regitros (perkrovus puslapį)
  await p.click("#menu-tool-ins [data-rg-new]");
  await p.fill("#rgInsPlateV80", "LLL111");
  await p.fill("#rgInsDocV80", "K7654321");
  await p.click("#menu-tool-ins [type=submit]");
  await p.reload();
  await p.waitForFunction(() => document.documentElement.classList.contains("aeStyledV77"));
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
  });
  await p.click('.navBtn[data-view="menu"]');
  await p.waitForTimeout(200);
  await p.click("#view-menu .menuLink:has-text('Draudimo patikra')");
  await p.waitForTimeout(200);
  check((await p.textContent("#menu-tool-ins")).includes("K7654321"), "Draudimas: nebaigta patikra išlieka po perkrovimo");
  // XSS
  const xss = await p.evaluate(() => ({ flag: !!window.__xss, img: !!document.querySelector("#menu-tool-ins img, #menu-tool-sdk img") }));
  check(!xss.flag && !xss.img, "XSS: automobilio pavadinimas nevykdomas");
  check(!p.errors.length, "be JS klaidų " + p.errors.join("; "));
  await p.context().close();
}

// 4. Siauri ir platūs ekranai: niekas neišlenda
for (const width of [320, 375, 834, 1440]) {
  const p = await open(width);
  for (const [tile, rootId, sel] of [
    ["SDK paieška", "menu-tool-sdk", "#rgSdkCarV80"],
    ["Draudimo patikra", "menu-tool-ins", "#rgInsCarV80"]
  ]) {
    await p.click(`#view-menu .menuLink:has-text('${tile}')`);
    await p.waitForTimeout(200);
    await p.selectOption(sel, "car-demo-1");
    await p.click(`#${rootId} [type=submit]`);
    await p.waitForTimeout(200);
    const bad = await p.evaluate(id => {
      const rootEl = document.getElementById(id);
      const box = rootEl.getBoundingClientRect();
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push("horizontalus slinkimas");
      rootEl.querySelectorAll("button, input, select, .rgChipV80").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > box.right + 1 || r.left < box.left - 1)) out.push(el.className || el.id);
      });
      return out;
    }, rootId);
    check(!bad.length, `${width}px ${tile}: telpa ${bad.join(", ")}`);
    if (width === 320) await p.screenshot({ path: path.join(shots, `${rootId}-320.png`), fullPage: true });
  }
  await p.context().close();
}

await b.close();
server.close();
console.log(fails.length ? `\n${fails.length} nepavyko` : "\nVisi Regitros įrankių testai praėjo");
process.exit(fails.length ? 1 : 0);
