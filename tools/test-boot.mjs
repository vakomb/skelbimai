#!/usr/bin/env node
// Paleidimo testas (v77): puslapis rodomas tik pilnai sustilizuotas, be poslinkių (CLS),
// grįžtantis vartotojas mato „Jungiamasi…“ (ne prisijungimo formą), naujas – formą.
// Naudoja dirbtinį Supabase (be tinklo) ir http serverį (file:// naršyklėje nestabilus saugyklai).
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
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
// Dirbtinis Supabase: getSession atsako po `delay` ms
const stub = delay => `
window.__sessionDelay = ${delay};
window.supabase = { createClient: () => ({
  auth: {
    getSession: () => new Promise(r => setTimeout(() => {
      const raw = localStorage.getItem("autoeasier-auth-v1");
      r({ data: { session: raw ? { user: { id: "u1", email: "u@test.lt" }, access_token: "x" } : null }, error: null });
    }, window.__sessionDelay)),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({})
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: window.__row || null, error: null }) }) }) }),
  rpc: async (n, a) => {
    if (n === "account_subscription") return { data: { access: true, comped: true, status: "active" }, error: null };
    if (n === "account_save_state") {
      const rev = (window.__row?.revision || 0) + 1;
      window.__row = { payload: a.p_payload, revision: rev, updated_at: new Date().toISOString() };
      return { data: [{ revision: rev }], error: null };
    }
    return { data: null, error: null };
  },
  storage: { from: () => ({ upload: async () => ({ error: null }), download: async () => ({ data: null, error: { message: "nf" } }) }) },
  functions: { invoke: async () => ({ data: {}, error: null }) }
}) };`;
const b = await chromium.launch();
const errors = [];
async function open({ session, delay }) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.addInitScript(stub(delay));
  await ctx.addInitScript(s => {
    if (s) localStorage.setItem("autoeasier-auth-v1", JSON.stringify({ access_token: "x", refresh_token: "y" }));
    window.__cls = 0;
    window.__firstVisible = null;
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  }, session);
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  return p;
}

// 1. Grįžtantis vartotojas, lėtas tinklas
{
  const p = await open({ session: true, delay: 1200 });
  await p.goto(url);
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => ({
    styled: document.documentElement.classList.contains("aeStyledV77"),
    restoring: document.getElementById("autoEasierLogin").classList.contains("aeRestoringV77"),
    form: getComputedStyle(document.getElementById("autoEasierLoginForm")).visibility,
    spinner: getComputedStyle(document.querySelector(".aeRestoreV77")).display,
    text: document.querySelector(".aeRestoreV77").textContent.trim()
  }));
  await p.screenshot({ path: path.join(root, ".verify/boot-restoring.png") });
  check(s.styled, "puslapis parodytas tik perskaičius visus stilius");
  check(s.restoring && s.form === "hidden" && s.spinner === "flex", "grįžtančiam vartotojui rodoma „Jungiamasi…“, forma paslėpta");
  check(s.text === "Jungiamasi prie paskyros…", "tekstas: " + s.text);
  await p.waitForTimeout(1800);
  const after = await p.evaluate(() => ({
    gate: document.getElementById("autoEasierLogin").hidden,
    restoring: document.getElementById("autoEasierLogin").classList.contains("aeRestoringV77"),
    view: document.querySelector(".view.active")?.id,
    cls: window.__cls
  }));
  check(after.gate && !after.restoring, "po patikrinimo atidaroma programa");
  check(after.view === "view-garage", "pirmas ekranas – Garažas");
  check(after.cls < 0.02, `paleidimo poslinkiai (CLS) ${after.cls.toFixed(4)} < 0.02`);
  await p.context().close();
}
// 2. Naujas vartotojas – iškart forma
{
  const p = await open({ session: false, delay: 50 });
  await p.goto(url);
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => ({
    restoring: document.getElementById("autoEasierLogin").classList.contains("aeRestoringV77"),
    form: getComputedStyle(document.getElementById("autoEasierLoginForm")).visibility,
    gate: document.getElementById("autoEasierLogin").hidden,
    cls: window.__cls
  }));
  check(!s.restoring && s.form === "visible" && !s.gate, "be sesijos rodoma prisijungimo forma");
  check(s.cls < 0.02, `prisijungimo ekrano poslinkiai (CLS) ${s.cls.toFixed(4)} < 0.02`);
  await p.context().close();
}
// 3. Sesija yra, bet serveris jos nepatvirtina – forma grįžta
{
  const p = await open({ session: true, delay: 100 });
  await p.addInitScript(() => {
    const orig = window.supabase.createClient;
    window.supabase.createClient = (...a) => {
      const c = orig(...a);
      c.auth.getSession = async () => ({ data: { session: null }, error: null });
      return c;
    };
  });
  await p.goto(url);
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => ({
    restoring: document.getElementById("autoEasierLogin").classList.contains("aeRestoringV77"),
    form: getComputedStyle(document.getElementById("autoEasierLoginForm")).visibility
  }));
  check(!s.restoring && s.form === "visible", "pasibaigusi sesija – vėl rodoma forma");
  await p.context().close();
}
check(!errors.length, "be JS klaidų " + errors.slice(0, 3).join("; "));
await b.close();
server.close();
process.exit(fails.length ? 1 : 0);
