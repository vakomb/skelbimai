#!/usr/bin/env node
// Admin skydelio testas (v72): mygtukas tik administratoriui, apatinis langas, skirtukai, paieška, vartotojo kortelė,
// patvirtinimai (trynimui reikia įrašyti el. paštą), veiksmai kviečia Edge Function, 375 / 430 / 1440 px be horizontalaus slinkimo.
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".verify");
const b = await chromium.launch();
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const day = n => new Date(Date.now() + n * 864e5).toISOString();
const USERS = [
  { id: "7d06aa84-0c36-4664-b371-3ebcac973cf3", email: "autoeasier@gmail.com", created_at: day(-3), last_sign_in_at: day(0), banned: false, confirmed: true, status: "active", comped: true, trial_end: null, current_period_end: null, cancel_at_period_end: false, stripe_customer_id: null, stripe_subscription_id: null, trial_used: true, access: true, profile_name: "Vaidas Kolosovas", profile_type: "person", cars: 4, leads: 2, state_updated_at: day(0), revision: 12, media_files: 40, media_bytes: 90000000 },
  { id: "11111111-1111-4111-8111-111111111111", email: "jonas@autosalonas.lt", created_at: day(-2), last_sign_in_at: day(-1), banned: false, confirmed: true, status: "trialing", comped: false, trial_end: day(2), current_period_end: day(2), cancel_at_period_end: false, stripe_customer_id: "cus_TEST1", stripe_subscription_id: "sub_TEST1", trial_used: true, access: true, profile_name: "Jono autosalonas, UAB", profile_type: "company", cars: 9, leads: 1, state_updated_at: day(-1), revision: 5, media_files: 20, media_bytes: 5000000 },
  { id: "22222222-2222-4222-8222-222222222222", email: "petras@pastas.lt", created_at: day(-9), last_sign_in_at: day(-8), banned: false, confirmed: true, status: "past_due", comped: false, trial_end: null, current_period_end: day(-1), cancel_at_period_end: false, stripe_customer_id: "cus_TEST2", stripe_subscription_id: "sub_TEST2", trial_used: true, access: true, profile_name: null, profile_type: null, cars: 0, leads: 0, state_updated_at: null, revision: 0, media_files: 0, media_bytes: 0 }
];
const OV = { users: 3, new_7d: 2, new_30d: 3, active_7d: 2, trialing: 1, paying: 0, comped: 1, past_due: 1, canceled: 0, no_sub: 0, trials_ending: 1, mrr_eur: 49, cars: 13, media_bytes: 95000000, media_files: 60 };
async function open(w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  await p.route(/^https?:/, r => r.abort());
  await p.goto("file://" + path.join(root, "dist/index.html"));
  await p.waitForTimeout(500);
  await p.evaluate(
    ([users, ov]) => {
      document.getElementById("autoEasierLogin").hidden = true;
      document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
      window.__calls = [];
      window.AUTOEASIER_AUTH = {
        client: async () => ({
          rpc: async name => {
            window.__calls.push(["rpc", name]);
            const data = { admin_overview: ov, admin_users: users, admin_audit_list: [{ at: new Date().toISOString(), action: "set_comped", target_email: "jonas@autosalonas.lt", detail: { value: true } }], admin_orphans: { files: 3, bytes: 14000000 } }[name];
            return { data, error: null };
          },
          functions: {
            invoke: async (name, o) => {
              window.__calls.push(["fn", name, o.body]);
              return { data: { ok: true }, error: null };
            }
          }
        })
      };
    },
    [USERS, OV]
  );
  return p;
}
const adminEvent = (p, email) =>
  p.evaluate(e => window.dispatchEvent(new CustomEvent("autoeasier:account-ready", { detail: { user: { email: e }, subscription: null } })), email);
const fabShown = p => p.evaluate(() => !document.getElementById("aeAdminFabV72").hidden);

{
  const p = await open(430, 932);
  await adminEvent(p, "kitas@pastas.lt");
  await p.waitForTimeout(200);
  check(!(await fabShown(p)), "ne administratoriui mygtuko nėra");
  await p.context().close();
}
for (const [w, h] of [[430, 932], [375, 667], [1440, 900]]) {
  const p = await open(w, h);
  await adminEvent(p, "Autoeasier@gmail.com");
  await p.waitForTimeout(500);
  check(await fabShown(p), `${w}px: administratoriui rodomas prisegtas mygtukas`);
  check(await p.evaluate(() => !document.querySelector("#aeAdminFabV72 .adDotV72").hidden), `${w}px: dėmesio taškas (neapmokėta / baigiasi bandomasis)`);
  for (const v of ["garage", "accounting", "menu"]) {
    await p.evaluate(v => document.querySelector(`.navBtn[data-view="${v}"]`).click(), v);
    await p.waitForTimeout(150);
    check(await p.evaluate(() => { const r = document.getElementById("aeAdminFabV72").getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight && r.right <= innerWidth; }), `${w}px: mygtukas matomas puslapyje ${v}`);
  }
  await p.click("#aeAdminFabV72");
  await p.waitForTimeout(500);
  const o = await p.evaluate(() => ({ open: !document.getElementById("aeAdminV72").hidden, kpis: document.querySelectorAll(".adKpiV72").length, att: document.querySelectorAll(".adBodyV72 .adRowV72").length, orphan: !!document.querySelector("[data-ad-orphans]") }));
  check(o.open && o.kpis === 6, `${w}px: apžvalga atsidaro (${o.kpis} rodikliai)`);
  check(o.att === 2, `${w}px: „Reikia dėmesio“ rodo 2 paskyras (${o.att})`);
  check(o.orphan, `${w}px: rodomas likusių failų valymas`);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector(".adPanelV72").scrollWidth <= document.querySelector(".adPanelV72").clientWidth + 1), `${w}px: be horizontalaus slinkimo`);
  await p.screenshot({ path: path.join(out, `admin-overview-${w}.png`) });
  await p.click('[data-ad-tab="users"]');
  await p.waitForTimeout(200);
  check((await p.locator(".adBodyV72 .adRowV72").count()) === 3, `${w}px: vartotojų sąraše 3 įrašai`);
  await p.fill("#adSearchV72", "jonas");
  check((await p.locator(".adBodyV72 .adRowV72").count()) === 1, `${w}px: paieška veikia`);
  await p.fill("#adSearchV72", "");
  await p.click('[data-ad-filter="issue"]');
  check((await p.locator(".adBodyV72 .adRowV72").count()) === 1, `${w}px: filtras „Problemos“`);
  await p.click('[data-ad-filter="all"]');
  await p.screenshot({ path: path.join(out, `admin-users-${w}.png`) });
  await p.click('[data-ad-user="11111111-1111-4111-8111-111111111111"]');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => !!document.querySelector('[data-ad-do="extend"]') && !!document.querySelector('[data-ad-do="delete"]') && !!document.querySelector(".adLinkV72")), `${w}px: vartotojo kortelė su veiksmais ir Stripe nuoroda`);
  await p.screenshot({ path: path.join(out, `admin-detail-${w}.png`) });
  await p.click('[data-ad-do="extend"]');
  await p.click("[data-cf-yes]");
  await p.waitForTimeout(400);
  check(await p.evaluate(() => window.__calls.some(c => c[0] === "fn" && c[2].action === "extend_trial" && c[2].days === 7)), `${w}px: „Pratęsti bandomąjį“ kviečia admin-action`);
  await p.click('[data-ad-do="delete"]');
  check(await p.evaluate(() => document.querySelector("[data-cf-yes]").disabled), `${w}px: trynimas užrakintas, kol neįvestas el. paštas`);
  await p.fill(".adConfirmV72 input", "jonas@autosalonas.lt");
  check(await p.evaluate(() => !document.querySelector("[data-cf-yes]").disabled), `${w}px: įvedus el. paštą trynimas atrakinamas`);
  await p.screenshot({ path: path.join(out, `admin-confirm-${w}.png`) });
  await p.click("[data-cf-no]");
  await p.click("[data-ad-back]");
  await p.click('[data-ad-tab="activity"]');
  check(await p.evaluate(() => /nemokama prieiga/i.test(document.querySelector(".adLogV72")?.textContent || "")), `${w}px: veiklos žurnalas`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(450);
  check(await p.evaluate(() => document.getElementById("aeAdminV72").hidden), `${w}px: Escape uždaro langą`);
  check(!p.errors.length, `${w}px: be JS klaidų ${p.errors.join(" | ")}`);
  await p.context().close();
}
await b.close();
if (fails.length) {
  console.log(`\n${fails.length} klaidos`);
  process.exit(1);
}
console.log("\nVisi admin testai praėjo");
