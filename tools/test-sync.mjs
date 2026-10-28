#!/usr/bin/env node
// Sinchronizacijos testas su dirbtiniu Supabase: telefonas ↔ kompiuteris, neįkelti pakeitimai, vienodų laukų konfliktai.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = http
  .createServer((q, r) => {
    if (q.url !== "/") return r.writeHead(404).end();
    r.setHeader("content-type", "text/html; charset=utf-8");
    r.end(fs.readFileSync(path.join(root, "dist/index.html")));
  })
  .listen(0);
const url = `http://localhost:${server.address().port}/`;
// „Debesis“
const cloud = { row: null, fail: false };
const srv = (op, a) => {
  if (cloud.fail && op !== "get") return { error: { message: "offline" } };
  if (op === "get") return { data: cloud.row ? JSON.parse(JSON.stringify(cloud.row)) : null };
  if (op === "save") {
    const cur = cloud.row ? cloud.row.revision : 0;
    if (cur !== a.p_expected_revision) {
      if (cloud.row && JSON.stringify(cloud.row.payload) === JSON.stringify(a.p_payload))
        return { data: [{ revision: cur }] };
      return { error: { code: "40001", message: "Account state changed; reload required" } };
    }
    cloud.row = { payload: JSON.parse(JSON.stringify(a.p_payload)), revision: cur + 1, updated_at: new Date().toISOString() };
    return { data: [{ revision: cloud.row.revision }] };
  }
};
const STUB = `
window.supabase = { createClient: () => ({
  auth: {
    getSession: async () => ({ data: { session: { user: { id: "u1", email: "u@test.lt" }, access_token: "x" } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({})
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { const r = await window.__srv("get"); return { data: r.data, error: null }; } }) }) }),
  rpc: async (n, a) => {
    if (n === "account_save_state") { const r = await window.__srv("save", a); return { data: r.data || null, error: r.error || null }; }
    if (n === "account_subscription") return { data: { access: true, comped: true, status: "active" }, error: null };
    return { data: null, error: null };
  },
  storage: { from: () => ({ upload: async () => ({ error: null }), download: async () => ({ data: null, error: { message: "nf" } }) }) },
  functions: { invoke: async () => ({ data: {}, error: null }) }
}) };`;
const b = await chromium.launch();
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
const errors = [];
async function device(name) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__srv", (op, a) => srv(op, a));
  await ctx.addInitScript(STUB);
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(name + ": " + e.message));
  p.open = async () => {
    await p.addInitScript(() => window.addEventListener("autoeasier:account-ready", () => (window.__ready = true)));
    await p.goto(url);
    await p.waitForFunction(() => window.__ready === true, null, { timeout: 8000 }).catch(() => {});
    await p.waitForFunction(() => document.getElementById("autoEasierLogin")?.hidden === true, null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(500);
  };
  p.st = () => p.evaluate(() => window.AUTOEASIER_APP_DATA.getState());
  p.mutate = fn =>
    p.evaluate(src => {
      const s = window.AUTOEASIER_APP_DATA.getState();
      new Function("s", src)(s);
      window.AUTOEASIER_APP_DATA.replaceState(s);
    }, fn);
  return p;
}
const phone = await device("telefonas");
await phone.route(/^https?:\/\/(?!localhost)/, r => r.abort());
await phone.open();
check((await phone.st()).leadVariants.length === 0, "telefonas: paskyra pasiruošė");
await phone.mutate(`s.leadVariants.push({id:"lead-1",name:"Variantas A"}); s.garageTasks.push({id:"t-1",title:"Užduotis 1"});`);
await phone.waitForTimeout(2500);
check(cloud.row?.payload.leadVariants?.length === 1, "variantas ir užduotis pasiekė debesį");
const desktop = await device("kompiuteris");
await desktop.route(/^https?:\/\/(?!localhost)/, r => r.abort());
await desktop.open();
let d = await desktop.st();
check(
  d.leadVariants.length === 1 && d.garageTasks.length === 1,
  "kompiuteris iškart rodo telefone pridėtus duomenis" +
    (d.leadVariants.length === 1 && d.garageTasks.length === 1
      ? ""
      : ` (variantai ${d.leadVariants.length}, užduotys ${d.garageTasks.length}, debesyje ${cloud.row?.payload.garageTasks?.length}, ${JSON.stringify(cloud.row?.payload.garageTasks)})`)
);
// Regresija (v77): naujas įrenginys su smulkiais vietiniais pakeitimais (pvz. xp/streak) neturi ištrinti debesies duomenų
{
  const fresh = await device("naujas įrenginys");
  await fresh.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await fresh.addInitScript(() => {
    if (!localStorage.getItem("visureigiai_uab_v1:user:u1"))
      localStorage.setItem("visureigiai_uab_v1:user:u1", JSON.stringify({ xp: 15, streak: 2, coins: 3, cars: [], leadVariants: [], garageTasks: [] }));
  });
  await fresh.open();
  const fs1 = await fresh.st();
  check(fs1.leadVariants.length === 1 && fs1.garageTasks.length === 1, "naujas įrenginys su vietiniais smulkmenomis gauna visus debesies duomenis");
  await fresh.waitForTimeout(2500);
  check(cloud.row.payload.leadVariants.length === 1 && cloud.row.payload.garageTasks.length === 1, "debesies duomenys po prisijungimo naujame įrenginyje neištrinti");
  await fresh.context().close();
}
// Atnaujinimas nereikalaujant perkrauti
await phone.mutate(`s.cars.push({id:"car-9",name:"Audi A4",photos:[],checklist:[],documents:[]});`);
await phone.waitForTimeout(2500);
await desktop.evaluate(() => window.dispatchEvent(new Event("focus")));
await desktop.waitForTimeout(1500);
check((await desktop.st()).cars.some(c => c.id === "car-9"), "kompiuteris be perkrovimo gauna naują automobilį");
// Pakeitimai be ryšio ir kito įrenginio pakeitimai tuo metu
cloud.fail = true;
await desktop.mutate(`s.leadVariants.push({id:"lead-2",name:"Variantas B (kompiuteris)"});`);
await desktop.waitForTimeout(1800);
cloud.fail = false;
await phone.mutate(`s.garageTasks.push({id:"t-2",title:"Užduotis 2 (telefonas)"});`);
await phone.waitForTimeout(2500);
await desktop.reload();
await desktop.open();
d = await desktop.st();
check(d.leadVariants.some(l => l.id === "lead-2"), "kompiuteris: neįkeltas variantas neprarastas po perkrovimo");
check(d.garageTasks.some(t => t.id === "t-2"), "kompiuteris: gauti ir telefono pakeitimai");
await desktop.waitForTimeout(2500);
check(
  cloud.row.payload.leadVariants.some(l => l.id === "lead-2") && cloud.row.payload.garageTasks.some(t => t.id === "t-2"),
  "debesyje yra abiejų įrenginių duomenys"
);
// Konfliktas tame pačiame lauke neužstringa
await phone.mutate(`s.xp = 111; s.profile = Object.assign({}, s.profile, {name:"Telefono pavadinimas"});`);
await desktop.mutate(`s.xp = 222;`);
await phone.waitForTimeout(3000);
await desktop.waitForTimeout(3000);
await phone.mutate(`s.cars.push({id:"car-10",name:"BMW",photos:[],checklist:[],documents:[]});`);
await phone.waitForTimeout(3000);
await desktop.evaluate(() => window.dispatchEvent(new Event("focus")));
await desktop.waitForTimeout(2000);
check((await desktop.st()).cars.some(c => c.id === "car-10"), "po konflikto sinchronizacija toliau veikia");
check(cloud.row.payload.cars.some(c => c.id === "car-10"), "debesyje yra naujas automobilis po konflikto");
// Ištrynimas viename įrenginyje
await phone.mutate(`s.leadVariants = s.leadVariants.filter(l => l.id !== "lead-1");`);
await phone.waitForTimeout(2500);
await desktop.evaluate(() => window.dispatchEvent(new Event("focus")));
await desktop.waitForTimeout(2000);
check(!(await desktop.st()).leadVariants.some(l => l.id === "lead-1"), "ištrintas variantas dingsta ir kitame įrenginyje");
check(!errors.length, "be JS klaidų " + errors.slice(0, 3).join("; "));
await b.close();
server.close();
process.exit(fails.length ? 1 : 0);
