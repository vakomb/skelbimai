#!/usr/bin/env node
// Prenumeratos testas (v70): prisijungimo mygtukas „Išbandyti 7 d. nemokamai“ -> plano skydelis (tekstai,
// smulkus tekstas ≥ 13 px, uždarymas X / braukimu / Escape), be paskyros -> paskyros kūrimas, teisiniai tekstai,
// būsenos (trialing / past_due / canceled), „tik peržiūra“ režimas blokuoja pakeitimus, plotis 375 / 430 / 834 / 1440.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = fs.readFileSync(path.join(root, "tools/fixtures/demo-state.json"), "utf8");
const out = path.join(root, ".verify");
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
async function open(w, h, { app = false, hash = "" } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  await p.route(/^https?:/, r => r.abort());
  await p.addInitScript(s => localStorage.setItem("visureigiai_uab_v1", s), fixture);
  await p.goto("file://" + path.join(root, "dist/index.html") + hash);
  await p.waitForTimeout(600);
  if (app)
    await p.evaluate(() => {
      document.getElementById("autoEasierLogin").hidden = true;
      document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
      document.body.classList.remove("autoeasier-auth-locked");
    });
  await p.waitForTimeout(150);
  return p;
}
const noHScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const sheetOpen = p => p.evaluate(() => !document.getElementById("aeBillV70").hidden);

// ---------- Prisijungimo ekranas ----------
for (const [w, h] of [
  [430, 932],
  [375, 667]
]) {
  const p = await open(w, h);
  const btn = await p.evaluate(() => document.querySelector("#autoEasierSubscription span")?.textContent);
  check(btn === "Išbandyti 7 d. nemokamai", `${w}px: mygtukas „${btn}“`);
  await p.click("#autoEasierSubscription");
  await p.waitForTimeout(400);
  const s = await p.evaluate(() => {
    const host = document.getElementById("aeBillV70");
    const fine = host.querySelector(".bsFineV70");
    const panel = host.querySelector(".bsPanelV70").getBoundingClientRect();
    return {
      open: !host.hidden,
      title: host.querySelector("#bsTitleV70").textContent,
      plan: host.querySelector(".bsPlanV70 h4")?.textContent,
      features: host.querySelectorAll(".bsFeatV70 li").length,
      cta: host.querySelector(".bsCtaV70")?.textContent.trim(),
      fine: fine?.textContent,
      fineSize: parseFloat(getComputedStyle(fine).fontSize),
      minFont: Math.min(
        ...[...host.querySelectorAll(".bsBodyV70 *")]
          .filter(n => n.childNodes.length && [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()))
          .map(n => parseFloat(getComputedStyle(n).fontSize))
      ),
      bottom: Math.round(panel.bottom),
      top: Math.round(panel.top)
    };
  });
  check(s.open && s.title === "Pasirinkite planą", `${w}px: skydelis atsidaro („${s.title}“)`);
  check(s.plan === "Profesionalus" && s.features === 7, `${w}px: planas ${s.plan}, ${s.features} funkcijos`);
  check(s.cta === "Išbandyti 7 d. nemokamai", `${w}px: CTA „${s.cta}“`);
  check(
    s.fine === "7 dienas nemokamai, vėliau 49 € per mėn. Atšaukti galima bet kada." && s.fineSize >= 13,
    `${w}px: smulkus tekstas ${s.fineSize}px`
  );
  check(s.minFont >= 13, `${w}px: mažiausias šriftas ${s.minFont}px`);
  check(s.bottom === h && s.top >= 20, `${w}px: skydelis prie apačios (${s.top}–${s.bottom})`);
  check(await noHScroll(p), `${w}px: nėra horizontalaus slinkimo`);
  await p.screenshot({ path: path.join(out, `billing-sheet-${w}.png`) });
  // Uždarymas X
  await p.click(".bsXV70");
  await p.waitForTimeout(350);
  check(!(await sheetOpen(p)), `${w}px: uždaroma X`);
  // Uždarymas braukiant žemyn
  await p.click("#autoEasierSubscription");
  await p.waitForTimeout(400);
  await p.evaluate(async () => {
    const el = document.querySelector(".bsHeadV70");
    const r = el.getBoundingClientRect();
    const mk = (type, y) => {
      const t = new Touch({ identifier: 1, target: el, clientX: r.left + 40, clientY: y });
      el.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === "touchend" ? [] : [t],
          changedTouches: [t]
        })
      );
    };
    mk("touchstart", r.top + 10);
    for (let i = 1; i <= 8; i++) {
      mk("touchmove", r.top + 10 + i * 25);
      await new Promise(r2 => setTimeout(r2, 16));
    }
    mk("touchend", r.top + 210);
  });
  await p.waitForTimeout(400);
  check(!(await sheetOpen(p)), `${w}px: uždaroma braukiant žemyn`);
  // Escape
  await p.click("#autoEasierSubscription");
  await p.waitForTimeout(350);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(350);
  check(!(await sheetOpen(p)), `${w}px: uždaroma Escape`);
  // Be paskyros: CTA -> paskyros kūrimas
  if (w === 430) {
    await p.click("#autoEasierSubscription");
    await p.waitForTimeout(350);
    await p.click(".bsCtaV70");
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({
      open: !document.getElementById("aeBillV70").hidden,
      submit: document.querySelector("#autoEasierSubmit span").textContent,
      msg: document.getElementById("autoEasierAuthMessage").textContent,
      intent: !!localStorage.getItem("autoeasier-trial-intent-v70")
    }));
    check(!r.open && r.submit === "Sukurti paskyrą", `be paskyros: atidaroma registracija („${r.submit}“)`);
    check(/saugų apmokėjimą/.test(r.msg) && r.intent, "be paskyros: paaiškinimas ir išsaugotas ketinimas");
    await p.screenshot({ path: path.join(out, "billing-signup.png") });
    // Teisiniai tekstai iš skydelio
    await p.click("#autoEasierSubscription");
    await p.waitForTimeout(350);
    await p.click('.bsLegalV70 [data-legal="salygos"]');
    await p.waitForTimeout(200);
    const legal = await p.evaluate(() => ({
      title: document.getElementById("bsTitleV70").textContent,
      has14: /14 dienų/.test(document.querySelector(".bsDocV70").textContent),
      back: !!document.querySelector(".bsBackV70")
    }));
    check(legal.title === "Paslaugų teikimo sąlygos" && legal.has14 && legal.back, "sąlygos su 14 d. atsisakymo teise");
    await p.click(".bsBackV70");
    await p.waitForTimeout(150);
    check(
      (await p.evaluate(() => document.getElementById("bsTitleV70").textContent)) === "Pasirinkite planą",
      "„Grįžti į planą“ grąžina planą"
    );
  }
  check(!p.errors.length, `${w}px: be JS klaidų ${p.errors.join(" | ")}`);
  await p.context().close();
}
{
  const p = await open(430, 932, { hash: "#privatumas" });
  const t = await p.evaluate(() => document.getElementById("bsTitleV70").textContent);
  check(t === "Privatumo politika", "#privatumas atidaro privatumo politiką");
  await p.context().close();
}

// ---------- Programėlėje: būsenos ----------
const day = 864e5;
const iso = d => new Date(Date.now() + d).toISOString();
for (const [w, h] of [
  [430, 932],
  [834, 1112],
  [1440, 900]
]) {
  const p = await open(w, h, { app: true });
  const before = await p.screenshot();
  // Nemokama (esami vartotojai) – juostos nėra, Garažas nepakitęs
  await p.evaluate(() =>
    window.AUTOEASIER_BILLING._set({ status: "active", comped: true, access: true }, { signedIn: true })
  );
  await p.waitForTimeout(150);
  const same = Buffer.compare(before, await p.screenshot()) === 0;
  check(same && !(await p.evaluate(() => !!document.getElementById("aeBarV70"))), `${w}px: comped – Garažas nepakitęs`);
  // Bandomasis
  await p.evaluate(
    d => window.AUTOEASIER_BILLING._set({ status: "trialing", trial_end: d, access: true, has_customer: true, trial_used: true }),
    iso(4.5 * day)
  );
  await p.waitForTimeout(150);
  const bar = await p.evaluate(() => document.querySelector("#aeBarV70 .aeBarTextV70")?.textContent);
  check(bar === "Nemokamas laikotarpis · liko 5 dienos", `${w}px: juosta „${bar}“`);
  check(await noHScroll(p), `${w}px: nėra horizontalaus slinkimo`);
  await p.screenshot({ path: path.join(out, `billing-trial-${w}.png`) });
  // Nustatymai
  await p.evaluate(() => document.querySelector('#aeBarV70 [data-bill-action="settings"]').click());
  await p.waitForTimeout(500);
  const st = await p.evaluate(() => {
    const box = document.getElementById("aeSubPanelV70");
    return box && box.offsetParent
      ? {
          badge: box.querySelector(".aeSubBadgeV70").textContent,
          btn: box.querySelector(".btn")?.textContent.trim(),
          rows: [...box.querySelectorAll("dt")].map(n => n.textContent).join(",")
        }
      : null;
  });
  check(
    st?.badge === "Bandomasis laikotarpis" && st.btn === "Valdyti prenumeratą" && /Nemokamai iki/.test(st.rows),
    `${w}px: Nustatymai → Prenumerata ${JSON.stringify(st)}`
  );
  await p.screenshot({ path: path.join(out, `billing-settings-${w}.png`) });
  // Mokėjimas nepavyko
  await p.evaluate(
    d => window.AUTOEASIER_BILLING._set({ status: "past_due", grace_until: d, access: true, has_customer: true, trial_used: true }),
    iso(3 * day)
  );
  await p.waitForTimeout(100);
  const st2 = await p.evaluate(() => document.querySelector("#aeSubPanelV70 .aeSubBadgeV70")?.textContent);
  check(st2 === "Mokėjimas nepavyko", `${w}px: past_due ženkliukas „${st2}“`);
  // Atšaukta -> tik peržiūra
  await p.evaluate(() => {
    window.__autoEasierReadOnly = true;
    window.AUTOEASIER_APP_DATA.setReadOnly(true);
    window.AUTOEASIER_BILLING._set({ status: "canceled", access: false, has_customer: true, trial_used: true });
  });
  await p.waitForTimeout(100);
  const stored = await p.evaluate(() => localStorage.getItem("visureigiai_uab_v1"));
  const parse = s => JSON.parse(s).accounting?.email || "";
  await p.evaluate(() => {
    document.getElementById("settingsAccountantEmail").value = "kitas@pastas.lt";
    document.getElementById("saveSettingsAccountantEmail").click();
  });
  await p.waitForTimeout(500);
  const ro = await p.evaluate(() => ({
    open: !document.getElementById("aeBillV70").hidden,
    title: document.getElementById("bsTitleV70").textContent,
    cta: document.querySelector("#aeBillV70 .bsCtaV70")?.textContent.trim(),
    stored: localStorage.getItem("visureigiai_uab_v1")
  }));
  check(parse(ro.stored) === parse(stored), `${w}px: tik peržiūra – pakeitimas neišsaugotas`);
  check(
    ro.open && ro.title === "Atnaujinkite prenumeratą" && ro.cta === "Atnaujinti prenumeratą",
    `${w}px: atsidaro „${ro.title}“ / „${ro.cta}“`
  );
  await p.screenshot({ path: path.join(out, `billing-paywall-${w}.png`) });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(350);
  // Failo įkėlimas blokuojamas
  const fileBlocked = await p.evaluate(() => {
    const i = document.querySelector('input[type="file"]');
    if (!i) return "none";
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    i.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  await p.waitForTimeout(350);
  check(fileBlocked === true && (await sheetOpen(p)), `${w}px: failų įkėlimas tik peržiūroje blokuojamas`);
  const bar3 = await p.evaluate(() => document.querySelector("#aeBarV70 .aeBarTextV70")?.textContent);
  check(bar3 === "Prenumerata neaktyvi – tik peržiūra", `${w}px: juosta „${bar3}“`);
  // Vietiniai nustatymai (rodinys) vis tiek išsaugomi
  await p.evaluate(() => {
    window.AUTOEASIER_BILLING.close();
    window.AUTOEASIER_APP_DATA.setReadOnly(false);
  });
  check(!p.errors.length, `${w}px: be JS klaidų ${p.errors.join(" | ")}`);
  await p.context().close();
}
// ---------- Prieigos užraktas (v71) ----------
for (const [w, h] of [
  [430, 932],
  [375, 667],
  [1440, 900]
]) {
  const p = await open(w, h);
  await p.evaluate(() => {
    document.getElementById("autoEasierLogin").hidden = true;
    document.body.classList.add("autoeasier-paywall");
    window.dispatchEvent(
      new CustomEvent("autoeasier:paywall", {
        detail: {
          user: { email: "nauja@pastas.lt" },
          subscription: { status: "none", access: false, trial_used: false, comped: false }
        }
      })
    );
  });
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => {
    const el = document.getElementById("aePaywallV71");
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return {
      shown: !el.hidden,
      full: r.width >= innerWidth - 1 && r.height >= innerHeight - 1,
      cover: el.contains(top),
      title: el.querySelector(".pwTitleV71")?.textContent,
      cta: el.querySelector("[data-bill-start] span")?.textContent,
      email: el.querySelector(".pwUserV71 span")?.textContent,
      out: !!el.querySelector("[data-pw-signout]"),
      inert: document.querySelector(".app").hasAttribute("inert") || document.querySelector(".app").offsetParent !== null
    };
  });
  check(s.shown && s.full && s.cover, `${w}px: užrakto ekranas dengia visą ekraną`);
  check(s.title === "Pradėkite nemokamai" && s.cta === "Išbandyti 7 d. nemokamai", `${w}px: tekstai „${s.title}“ / „${s.cta}“`);
  check(s.email === "nauja@pastas.lt" && s.out, `${w}px: rodomas el. paštas ir „Atsijungti“`);
  check(await noHScroll(p), `${w}px: be horizontalaus slinkimo`);
  await p.screenshot({ path: path.join(out, `paywall-${w}.png`) });
  await p.click("#aePaywallV71 [data-legal='salygos']");
  await p.waitForTimeout(450);
  check(await p.evaluate(() => {
    const t = document.elementFromPoint(innerWidth / 2, innerHeight - 40);
    return !!t && document.getElementById("aeBillV70").contains(t);
  }), `${w}px: teisiniai tekstai atsidaro virš užrakto`);
  await p.evaluate(() => window.AUTOEASIER_BILLING.close());
  await p.evaluate(() => window.dispatchEvent(new Event("autoeasier:signed-out")));
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById("aePaywallV71").hidden), `${w}px: atsijungus užraktas paslepiamas`);
  check(!p.errors.length, `${w}px: be JS klaidų ${p.errors.join(" | ")}`);
  await p.context().close();
}
await b.close();
if (fails.length) {
  console.log(`\n${fails.length} klaidos`);
  process.exit(1);
}
console.log("\nVisi prenumeratos testai praėjo");
