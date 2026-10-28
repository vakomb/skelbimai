// v75: tuščia pradžia, Finansai Buhalterijoje, „Generuoti sutartį“ Garaže, „Pildyti duomenis“ antraštėje, paskyros trynimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

// ---------- 1. Tuščia pradžia (Garažas) ----------
function emptyCarsHTMLV75() {
  const hasSold = (state.cars || []).some(c => c.status === "parduotas");
  const title = hasSold ? "Aktyvių automobilių nėra" : "Pridėkite pirmą automobilį";
  const text = hasSold
    ? "Pridėkite naują automobilį – čia matysite jo išlaidas, užduotis, dokumentus ir pelną."
    : "Čia matysite kiekvieno automobilio išlaidas, užduotis, dokumentus ir pelną. Pirmo automobilio įvedimas užtrunka mažiau nei minutę.";
  const label = hasSold ? "Pridėti automobilį" : "Pridėti pirmą automobilį";
  const hint = hasSold
    ? ""
    : '<span class="emptyCarsHintV75">Galite nufotografuoti registracijos liudijimą – laukai užsipildys patys.</span>';
  return `<div class="emptyCarsV75">
    <span class="emptyCarsIcoV75" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5V13l1.7-4.6A2 2 0 0 1 8.6 7h6.8a2 2 0 0 1 1.9 1.4L19 13v3.5"/><path d="M3.5 13h17v3.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="15.2" r=".6"/><circle cx="16.5" cy="15.2" r=".6"/><path d="M6.5 17.5v1.5M17.5 17.5v1.5"/></svg></span>
    <h3>${title}</h3>
    <p>${text}</p>
    <button type="button" class="emptyCarsBtnV75" data-garage-action="addcar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>${label}</span></button>
    ${hint}
  </div>`;
}

// ---------- 2. „Generuoti sutartį“ Garaže ----------
// Sutarčių generatorius gyvena Buhalterijos skiltyje – mygtukas Garaže jį atidaro iškart.
document.addEventListener(
  "click",
  e => {
    const b = e.target.closest('#view-garage [data-garage-action="contract"]');
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    state.ui = state.ui || {};
    state.ui.accountingPanel = "pp";
    state.ui.accountingPpMode = "";
    state.ui.accountingPpCarId = "";
    state.ui.garageInlineExpanded = "";
    state.selectedView = "accounting";
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
  },
  true
);

// ---------- 3. Finansai Buhalterijoje ----------
const FINANCE_ICON_V75 =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7.5h16v11H4z"/><path d="M6 7.5V5.8A1.8 1.8 0 0 1 7.8 4h8.7"/><path d="M15.5 12h4.5v3h-4.5a1.5 1.5 0 0 1 0-3z"/></svg>';
let financeHomeV75 = null; // { node, marker, className }
function financeNodeV75() {
  const node = document.getElementById("view-finance");
  if (!node) return null;
  if (!financeHomeV75 || financeHomeV75.node !== node) {
    const marker = document.createComment("finance-return-v75");
    node.parentNode?.insertBefore(marker, node);
    financeHomeV75 = {
      node,
      marker,
      className: node.className.replace(/\b(active|accFinInlineV75)\b/g, "").trim()
    };
  }
  return financeHomeV75;
}
function financeRestoreV75() {
  const h = financeHomeV75;
  if (!h || !h.node) return;
  if (h.marker?.parentNode && h.node.parentNode !== h.marker.parentNode)
    h.marker.parentNode.insertBefore(h.node, h.marker);
  h.node.className = h.className;
  h.node.removeAttribute("aria-hidden");
}
function accountingFinanceV75() {
  const root = document.getElementById("accountingRoot");
  const home = financeNodeV75();
  if (!root || !home) return;
  const open = state.ui?.accountingPanel === "finance";
  const tile = root.querySelector(
    '.accountingRefMenu [data-accounting-panel="pp"], .accountingRefMenu [data-accounting-finance]'
  );
  if (tile) {
    tile.removeAttribute("data-accounting-panel");
    tile.setAttribute("data-accounting-finance", "");
    tile.onclick = null;
    tile.classList.remove("pp", "active");
    tile.classList.add("finance");
    tile.classList.toggle("active", open);
    tile.setAttribute("aria-expanded", String(open));
    const ico = tile.querySelector(".ico");
    if (ico && ico.dataset.v75 !== "1") {
      ico.innerHTML = FINANCE_ICON_V75;
      ico.dataset.v75 = "1";
    }
    const label = tile.querySelector("strong");
    if (label) label.textContent = "Finansai";
    tile.onclick = () => {
      state.ui = state.ui || {};
      state.ui.accountingPanel = state.ui.accountingPanel === "finance" ? "" : "finance";
      state.ui.accountingPpMode = "";
      state.ui.accountingPpCarId = "";
      saveState();
      renderAccountingCenter();
    };
  }
  if (!open) {
    financeRestoreV75();
    return;
  }
  let ws = root.querySelector(".accountingRefWorkspace");
  if (ws) ws.remove();
  ws = document.createElement("div");
  ws.className = "accountingRefWorkspace accFinWsV75";
  ws.innerHTML =
    '<section class="accountingWorkspace show"><div class="accountingWorkspaceHead"><h3>Finansai</h3></div><div class="accFinBodyV75"></div></section>' +
    '<button class="accountingWorkspaceClose appCloseAction" type="button" data-accounting-finance-close aria-label="Uždaryti Finansus">Uždaryti</button>';
  const menu = root.querySelector(".accountingRefMenu");
  (menu || root.firstElementChild)?.insertAdjacentElement("afterend", ws);
  const body = ws.querySelector(".accFinBodyV75");
  home.node.classList.remove("view", "active");
  home.node.classList.add("accFinInlineV75");
  home.node.setAttribute("aria-hidden", "false");
  body.appendChild(home.node);
  ws.querySelector("[data-accounting-finance-close]").addEventListener("click", () => {
    state.ui.accountingPanel = "";
    saveState();
    renderAccountingCenter();
  });
}
const __renderAccountingV75 = renderAccountingCenter;
renderAccountingCenter = function () {
  // Prieš perpiešiant skiltį finansų blokas grąžinamas į savo vietą, kad nebūtų prarastas
  financeRestoreV75();
  const r = __renderAccountingV75.apply(this, arguments);
  try {
    accountingFinanceV75();
  } catch (err) {
    console.warn("finance inline", err);
  }
  return r;
};
// Anksčiau „Finansai“ buvo Meniu – nuorodos į juos dabar atveria Buhalterijos skiltį
// (openFinancePage – 04-garage-leads.js)
const __companyGoV75 = companyGo;
companyGo = function (view) {
  if (view === "finance") return openFinancePage();
  return __companyGoV75.apply(this, arguments);
};
document.addEventListener(
  "click",
  e => {
    const all = e.target.closest("[data-accounting-all]");
    if (!all) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openFinancePage();
  },
  true
);

// ---------- 4. Antraštė: „Pildyti duomenis“ ----------
function headerFillButtonV75() {
  const header = document.querySelector(".app > .topbar .autoEasierHeaderV4");
  if (!header) return;
  let btn = header.querySelector(".autoEasierFillV75");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "autoEasierFillV75";
    btn.setAttribute("data-profile-edit", "");
    btn.textContent = "Pildyti duomenis";
    header.appendChild(btn);
  }
}
const __renderHeaderV75 = render;
render = function () {
  const r = __renderHeaderV75.apply(this, arguments);
  try {
    headerFillButtonV75();
    const panel = document.getElementById("deleteAccountPanelV75");
    if (panel) panel.hidden = !window.__autoEasierUserEmail;
  } catch (err) {}
  return r;
};
headerFillButtonV75();

// ---------- 5. Paskyros trynimas ----------
const DELETE_ERRORS_V75 = {
  confirm_mismatch: "El. paštas nesutampa su jūsų paskyros el. paštu.",
  stripe_cancel_failed:
    "Nepavyko nutraukti prenumeratos. Bandykite dar kartą arba rašykite autoeasier@gmail.com",
  not_allowed: "Ši paskyra negali būti ištrinta čia. Rašykite autoeasier@gmail.com",
  auth_required: "Sesija pasibaigė. Prisijunkite iš naujo ir bandykite dar kartą."
};
function openDeleteAccountV75() {
  const email = String(window.__autoEasierUserEmail || "");
  if (!email) return;
  openSheet(`<div class="sheetHead cfHeadV51 ctHeadV55"><span></span><h3>Ištrinti paskyrą</h3><button class="closeBtn" id="daClose" type="button" aria-label="Uždaryti">✕</button></div>
  <div class="cfFormV51 daFormV75">
    <section class="cfCardV51">
      <p class="daLeadV75">Paskyra ir visi jūsų duomenys bus ištrinti visam laikui. Veiksmo atšaukti negalima.</p>
      <ul class="daListV75">
        <li>Ištrinami automobiliai, kontaktai, užduotys, finansai, nuotraukos ir dokumentai.</li>
        <li>Aktyvi prenumerata nutraukiama iškart.</li>
        <li>Prieš tęsdami galite atsisiųsti atsarginę kopiją (Nustatymai → Duomenys).</li>
      </ul>
      <div class="field"><label for="daEmail">Patvirtinimui įveskite savo el. paštą</label><input class="input" id="daEmail" type="email" inputmode="email" autocomplete="off" autocapitalize="off" placeholder="${escapeHTML(email)}"></div>
      <p class="daErrV75" id="daErr" role="alert" hidden></p>
    </section>
  </div>
  <button class="btn cfSaveV51 daDeleteBtnV75" id="daConfirm" type="button" disabled>Ištrinti paskyrą visam laikui</button>
  <button class="btn secondary daCancelBtnV75" id="daCancel" type="button">Atšaukti</button>`);
  const sheet = document.getElementById("sheet");
  const input = document.getElementById("daEmail");
  const confirmBtn = document.getElementById("daConfirm");
  const err = document.getElementById("daErr");
  const showErr = text => {
    err.textContent = text;
    err.hidden = !text;
  };
  input.addEventListener("input", () => {
    confirmBtn.disabled = input.value.trim().toLowerCase() !== email.toLowerCase();
    showErr("");
  });
  document.getElementById("daClose").onclick = document.getElementById("daCancel").onclick = () =>
    closeSheet();
  confirmBtn.onclick = async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    input.disabled = true;
    const label = confirmBtn.textContent;
    confirmBtn.textContent = "Trinama…";
    try {
      const auth = window.AUTOEASIER_AUTH;
      const client = await auth.client();
      const session = await auth.session();
      const uid = session?.user?.id || "";
      const { data, error } = await client.functions.invoke("delete-account", {
        body: { confirm_email: input.value.trim() }
      });
      let code = data?.error || "";
      if (error && !code) {
        try {
          code = (await error.context?.json?.())?.error || "";
        } catch (e2) {}
      }
      if (error || data?.error || !data?.ok) {
        const e = new Error(code || "failed");
        e.code = code;
        throw e;
      }
      // Vietinių duomenų išvalymas
      try {
        await clearCompanyPhotos();
      } catch (e3) {}
      try {
        Object.keys(localStorage)
          .filter(
            k => (uid && k.includes(uid)) || k === STORAGE_KEY || k.startsWith("autoeasier-trial-intent")
          )
          .forEach(k => localStorage.removeItem(k));
      } catch (e4) {}
      sheet.classList.remove("pfSheetV57");
      closeSheet();
      await auth.signOut();
      setTimeout(
        () => window.AUTOEASIER_AUTH?.setMessage("Paskyra ištrinta. Ačiū, kad naudojotės AutoEasier.", true),
        400
      );
    } catch (e) {
      input.disabled = false;
      confirmBtn.disabled = false;
      confirmBtn.textContent = label;
      showErr(
        DELETE_ERRORS_V75[e.code] ||
          "Nepavyko ištrinti paskyros. Patikrinkite ryšį ir bandykite dar kartą arba rašykite autoeasier@gmail.com"
      );
    }
  };
  setTimeout(() => input.focus(), 250);
}
document.addEventListener("click", e => {
  if (e.target.closest("#deleteAccountBtnV75")) {
    e.preventDefault();
    openDeleteAccountV75();
  }
});
