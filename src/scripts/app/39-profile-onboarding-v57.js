// Naudotojo profilis (v57): prisijungus, kol profilis neužpildytas, rodomas privalomas langas
// „Jūsų duomenys“ (fizinis asmuo arba įmonė, tie patys laukai kaip PP sutarties šalies duomenys).
// Profilis saugomas state.profile ir sinchronizuojamas su PP sutarties rekvizitais (state.accounting.pp.company).
// Antraštėje dešinėje rodomas įmonės pavadinimas arba vardas ir pavardė.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const PROFILE_FIELDS_V57 = {
  person: [
    ["name", "Vardas, pavardė", ""],
    ["code", "Asmens kodas", 'inputmode="numeric" maxlength="11"'],
    ["phone", "Telefonas", 'type="tel" inputmode="tel" autocomplete="tel"'],
    ["email", "El. paštas", 'type="email" inputmode="email" autocomplete="email"'],
    ["address", "Adresas", 'autocomplete="street-address"']
  ],
  company: [
    ["name", "Įmonės pavadinimas", 'autocomplete="organization"'],
    ["code", "Įmonės kodas", 'inputmode="numeric" maxlength="11"'],
    ["phone", "Telefonas", 'type="tel" inputmode="tel" autocomplete="tel"'],
    ["email", "El. paštas", 'type="email" inputmode="email" autocomplete="email"'],
    ["address", "Adresas", 'autocomplete="street-address"'],
    ["rep", "Atstovas (vardas, pavardė)", 'autocomplete="name"']
  ]
};
let profileOpenV57 = false;

function profileIsCompleteV57(p = state.profile) {
  if (!p || !p.done || !["person", "company"].includes(p.type)) return false;
  return PROFILE_FIELDS_V57[p.type].every(([k]) => String(p[k] || "").trim());
}
function profileDisplayNameV57() {
  const p = state.profile;
  return profileIsCompleteV57(p) ? String(p.name).trim() : "";
}
// Profilis -> PP sutarties rekvizitai
function profileSyncToCompanyV57(p = state.profile) {
  if (!p) return;
  ensureAccounting();
  state.accounting.pp =
    state.accounting.pp && typeof state.accounting.pp === "object" ? state.accounting.pp : {};
  state.accounting.pp.company = {
    ...(state.accounting.pp.company || {}),
    name: p.name || "",
    code: p.code || "",
    phone: p.phone || "",
    email: p.email || "",
    address: p.address || "",
    representative: p.type === "company" ? p.rep || "" : ""
  };
}
// PP sutartyje pakeisti rekvizitai -> profilis
function profileSyncFromCompanyV57(co) {
  if (!state.profile) return;
  Object.assign(state.profile, {
    name: co.name || state.profile.name,
    code: co.code || state.profile.code,
    phone: co.phone || state.profile.phone,
    email: co.email || state.profile.email,
    address: co.address || state.profile.address,
    rep: state.profile.type === "company" ? co.representative || state.profile.rep : ""
  });
  profileApplyBrandV57();
}
// Esamiems naudotojams laukai užpildomi iš jau turimų rekvizitų (tik jei verslas jau naudojamas).
function profileInitialV57() {
  if (state.profile && typeof state.profile === "object") return { type: "company", ...state.profile };
  const co = state.accounting?.pp?.company;
  const used = (state.cars || []).length > 0;
  if (co && used)
    return {
      type: "company",
      name: co.name || "",
      code: co.code || "",
      phone: co.phone || "",
      email: co.email || "",
      address: co.address || "",
      rep: co.representative || ""
    };
  return { type: "company", email: window.__autoEasierUserEmail || "" };
}

function profileFieldsHTMLV57(type, p) {
  return PROFILE_FIELDS_V57[type]
    .map(([k, label, attrs]) => {
      const f = `<div class="field"><label for="pf_${k}">${label}</label><input class="input" id="pf_${k}" value="${escapeHTML(p[k] || "")}" autocomplete="off" ${attrs}></div>`;
      return f;
    })
    .join("");
}
function openProfileSheetV57({ required = true } = {}) {
  const p = profileInitialV57();
  let type = ["person", "company"].includes(p.type) ? p.type : "company";
  profileOpenV57 = true;
  openSheet(`<div class="sheetHead cfHeadV51 ctHeadV55"><span></span><h3>Jūsų duomenys</h3>${
    required
      ? "<span></span>"
      : '<button class="closeBtn" id="pfClose" type="button" aria-label="Uždaryti">✕</button>'
  }</div>
  <div class="cfFormV51 pfFormV57" id="pfform">
    <section class="cfCardV51">
      ${ctSegV52(
        "pftype",
        [
          ["person", "Fizinis asmuo"],
          ["company", "Įmonė"]
        ],
        type
      )}
      <div class="pfFieldsV57 ctMt" id="pfFields">${profileFieldsHTMLV57(type, p)}</div>
    </section>
  </div>
  <button class="btn cfSaveV51" id="pfSave" type="button">${required ? "Tęsti" : "Išsaugoti"}</button>`);
  const sheet = document.getElementById("sheet");
  sheet.classList.add("pfSheetV57");
  sheet.scrollTop = 0;
  const read = () => {
    const out = {};
    for (const [k] of PROFILE_FIELDS_V57[type])
      out[k] = (document.getElementById("pf_" + k)?.value || "").trim();
    return out;
  };
  const draft = { ...p };
  sheet.querySelectorAll('[data-ct-seg="pftype"] [data-seg-value]').forEach(btn =>
    btn.addEventListener("click", () => {
      Object.assign(draft, read());
      type = btn.dataset.segValue;
      document.getElementById("ct_pftype").value = type;
      sheet
        .querySelectorAll('[data-ct-seg="pftype"] [data-seg-value]')
        .forEach(b => b.setAttribute("aria-checked", String(b === btn)));
      document.getElementById("pfFields").innerHTML = profileFieldsHTMLV57(type, draft);
    })
  );
  document.getElementById("pfClose")?.addEventListener("click", () => {
    profileOpenV57 = false;
    closeSheet();
  });
  document.getElementById("pfSave").onclick = () => {
    const v = read();
    const missing = PROFILE_FIELDS_V57[type].find(([k]) => !v[k]);
    sheet.querySelectorAll(".pfFieldsV57 .field").forEach(f => f.classList.remove("pfErrV57"));
    if (missing) {
      const el = document.getElementById("pf_" + missing[0]);
      el?.closest(".field")?.classList.add("pfErrV57");
      el?.focus();
      toast(`Įrašykite: ${missing[1].toLowerCase()}`, "!");
      return;
    }
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
      document.getElementById("pf_email")?.closest(".field")?.classList.add("pfErrV57");
      toast("Patikrinkite el. pašto adresą", "!");
      return;
    }
    if (type === "person" && !/^\d{11}$/.test(v.code)) {
      document.getElementById("pf_code")?.closest(".field")?.classList.add("pfErrV57");
      toast("Asmens kodą sudaro 11 skaitmenų", "!");
      return;
    }
    state.profile = {
      type,
      ...v,
      ...(type === "person" ? { rep: "" } : {}),
      done: true,
      updatedAt: nowLabel()
    };
    profileSyncToCompanyV57();
    saveState();
    profileOpenV57 = false;
    sheet.classList.remove("pfSheetV57");
    closeSheet();
    profileApplyBrandV57();
    render();
    toast("Duomenys išsaugoti", "✓");
  };
}
// Privalomo lango negalima uždaryti (fono paspaudimu ar Escape), kol duomenys neišsaugoti.
const __closeSheetProfileV57 = closeSheet;
closeSheet = function () {
  if (profileOpenV57 && !profileIsCompleteV57() && document.getElementById("pfform")) return;
  profileOpenV57 = false;
  document.getElementById("sheet")?.classList.remove("pfSheetV57");
  return __closeSheetProfileV57.apply(this, arguments);
};
// Antraštės pavadinimas (dešinėje viršuje) ir kiti prekės ženklo užrašai.
function profileApplyBrandV57() {
  const name = profileDisplayNameV57();
  if (!name) return;
  const initials = name
    .replace(/,?\s*(UAB|MB|IĮ|AB|VšĮ)\b/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
  const isVisureigiai = /visureigiai/i.test(name);
  document.querySelectorAll(".autoEasierCompanyNameV4").forEach(el => {
    if (el.textContent !== name) el.textContent = name;
  });
  document.querySelectorAll(".autoEasierCompanyMarkV4").forEach(el => {
    if (isVisureigiai) {
      if (el.dataset.pfInitials) {
        el.innerHTML = el.dataset.pfOrig || el.innerHTML;
        delete el.dataset.pfInitials;
      }
    } else if (el.dataset.pfInitials !== initials) {
      if (!el.dataset.pfOrig) el.dataset.pfOrig = el.innerHTML;
      el.innerHTML = `<span class="pfInitialsV57">${escapeHTML(initials || "•")}</span>`;
      el.dataset.pfInitials = initials;
    }
  });
  document
    .querySelectorAll(".garageRefBrand > span, .accountingRefBrand > span, .productRefBrand > span")
    .forEach(el => {
      if (el.children.length === 0 && el.textContent !== name) el.textContent = name;
    });
  document.querySelector(".app>.topbar")?.setAttribute("aria-label", "AutoEasier — " + name);
}
// Ar programėlė jau matoma (prisijungimo langas uždarytas)?
function profileAppVisibleV57() {
  const gate = document.getElementById("autoEasierLogin");
  const lock = document.getElementById("appLock");
  return (!gate || gate.hidden) && (!lock || lock.hidden);
}
function profileCheckV57() {
  profileApplyBrandV57();
  // Duomenys atkeliavo iš debesies, kol langas buvo atidarytas – uždarome jį.
  if (
    profileIsCompleteV57() &&
    profileOpenV57 &&
    document.getElementById("pfform") &&
    !document.getElementById("pfClose")
  ) {
    profileOpenV57 = false;
    closeSheet();
    return;
  }
  if (profileIsCompleteV57() || profileOpenV57 || !profileAppVisibleV57()) return;
  openProfileSheetV57({ required: true });
}
const __renderProfileV57 = render;
render = function () {
  const r = __renderProfileV57.apply(this, arguments);
  Promise.resolve(r).then(() => setTimeout(profileCheckV57, 0));
  return r;
};
for (const id of ["autoEasierLogin", "appLock"]) {
  const el = document.getElementById(id);
  if (el)
    new MutationObserver(() => setTimeout(profileCheckV57, 50)).observe(el, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
}
setTimeout(profileCheckV57, 300);
// Nustatymuose – galimybė pakeisti duomenis.
document.addEventListener("click", e => {
  const b = e.target.closest?.("[data-profile-edit]");
  if (!b) return;
  e.preventDefault();
  openProfileSheetV57({ required: false });
});
window.AutoEasierProfile = { open: openProfileSheetV57, isComplete: profileIsCompleteV57 };
