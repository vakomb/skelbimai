#!/usr/bin/env node
// Naujo naudotojo duomenų lango testas: tuščia būsena -> privalomas „Jūsų duomenys“ langas -> antraštė -> PP sutartis.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
p.on("pageerror", e => errors.push(e.message));
await p.route(/^https?:/, r => r.abort());
// Naujas naudotojas: būsenos nėra. Prisijungimo langas paslepiamas taip, kaip po sėkmingo prisijungimo.
await p.goto("file://" + path.join(root, "dist/index.html"));
await p.waitForTimeout(700);
const ev = (f, a) => p.evaluate(f, a);
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) fails.push(msg);
};
check(
  !(await ev(() => !!document.getElementById("pfform"))),
  "kol rodomas prisijungimo langas – duomenų lango nėra"
);
await ev(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
await p.waitForTimeout(3200);
check(!(await ev(() => !!document.getElementById("pfform"))), "po prisijungimo langas NEiššoka iškart");
check(await ev(() => !!document.getElementById("pfRemindV71")), "parodomas ramus priminimas");
await p.screenshot({ path: path.join(root, ".verify/profile-remind.png") });
check(
  await ev(() => {
    const c = document.querySelector(".autoEasierCompanyCellV4");
    return !document.documentElement.classList.contains("pfNamedV71") && getComputedStyle(c).display === "none";
  }),
  "naujam vartotojui antraštėje įmonės pavadinimo nėra"
);
check(
  await ev(() => document.getElementById("settingsAccountantEmail").value === ""),
  "buhalterės el. paštas tuščias (be Visureigiai numatytųjų)"
);
await ev(() => document.querySelector("#pfRemindV71 .pfRemindXV71").click());
await p.waitForTimeout(200);
check(!(await ev(() => !!document.getElementById("pfRemindV71"))), "„Vėliau“ paslepia priminimą");
await p.reload();
await p.waitForTimeout(3500);
check(!(await ev(() => !!document.getElementById("pfRemindV71"))), "atidėtas priminimas po perkrovimo nerodomas");
await ev(() => localStorage.removeItem("autoeasier_profile_snooze_v71"));
await ev(() => window.AutoEasierProfile.open({ required: false }));
await p.waitForTimeout(300);
check(await ev(() => !!document.getElementById("pfform")), "„Užpildyti“ atidaro „Jūsų duomenys“");
await p.screenshot({ path: path.join(root, ".verify/profile-company.png") });
await ev(() => document.getElementById("modalBackdrop").click());
await p.waitForTimeout(200);
check(!(await ev(() => !!document.getElementById("pfform"))), "langą galima uždaryti fono paspaudimu");
await ev(() => window.AutoEasierProfile.open({ required: false }));
await p.waitForTimeout(200);
await ev(() => document.getElementById("pfSave").click());
await p.waitForTimeout(200);
check(await ev(() => !!document.getElementById("pfform")), "be duomenų neišsaugo");
await ev(() => document.querySelector('[data-ct-seg="pftype"] [data-seg-value="person"]').click());
await p.waitForTimeout(150);
const personFields = await ev(() => [...document.querySelectorAll("#pfFields input")].map(i => i.id));
check(
  personFields.join() === "pf_name,pf_code,pf_phone,pf_email,pf_address",
  "fizinio asmens laukai: " + personFields.join()
);
await ev(() => {
  const s = (id, v) => (document.getElementById(id).value = v);
  s("pf_name", "Petras Petraitis");
  s("pf_code", "38501010000");
  s("pf_phone", "+370 600 11111");
  s("pf_email", "petras@pastas.lt");
  s("pf_address", "Gedimino pr. 1, Vilnius");
});
await p.screenshot({ path: path.join(root, ".verify/profile-person.png") });
await ev(() => document.getElementById("pfSave").click());
await p.waitForTimeout(500);
const after = await ev(() => ({
  open: !!document.getElementById("pfform"),
  header: document.querySelector(".autoEasierCompanyNameV4")?.textContent,
  profile: JSON.parse(localStorage.getItem("visureigiai_uab_v1")).profile
}));
check(!after.open && after.profile?.type === "person" && after.profile?.done, "išsaugota, langas uždarytas");
check(after.header === "Petras Petraitis", "antraštėje rodomas vardas: " + after.header);
await p.screenshot({ path: path.join(root, ".verify/profile-header.png") });
await p.reload();
await p.waitForTimeout(700);
await ev(() => {
  document.getElementById("autoEasierLogin").hidden = true;
  document.querySelectorAll("[inert]").forEach(n => n.removeAttribute("inert"));
});
await p.waitForTimeout(400);
check(!(await ev(() => !!document.getElementById("pfform"))), "kitą kartą prisijungus langas nebeatsidaro");
await ev(() => document.querySelector('.navBtn[data-view="accounting"]').click());
await p.waitForTimeout(300);
await ev(() => document.querySelector('#accountingRoot [data-accounting-panel="pp"]').click());
await p.waitForTimeout(400);
const pp = await ev(() => ({
  name: document.getElementById("ctCoName")?.value,
  code: document.getElementById("ctCoCode")?.value,
  label: document.querySelector('label[for="ctCoName"]')?.textContent,
  rep: !!document.getElementById("ctCoRep")
}));
check(
  pp.name === "Petras Petraitis" && pp.code === "38501010000" && pp.label === "Vardas, pavardė" && !pp.rep,
  "PP sutartyje – mano duomenys iš profilio " + JSON.stringify(pp)
);
check(!errors.length, "be JS klaidų " + errors.join("; "));
await b.close();
process.exit(fails.length ? 1 : 0);
