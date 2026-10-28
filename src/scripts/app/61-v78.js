// v78: stabilumas prieš didelį srautą – apsauga nuo dvigubų paspaudimų, klaidų „saugiklis“,
// atsistatymas po nepavykusio perpiešimo, kelių skirtukų sinchronizacija.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

// ---------- 1. Dvigubas / trigubas paspaudimas nesukuria dublikatų ----------
// Pagrindiniai veiksmų mygtukai (išsaugoti, pridėti, parduoti, generuoti…) ir formos: toks pat paspaudimas
// per 800 ms ignoruojamas – ir tada, kai išsaugojimas dar vyksta (asinchroniškai, pvz. skaitomi priedai).
// Jei pirmas paspaudimas baigėsi klaida (rodomas „!“ pranešimas, pvz. neįrašyta suma), kartoti galima iš karto.
// Lyginamas mygtuko „parašas“ (tekstas + artimiausias konteineris su id), nes mygtukas dažnai perpiešiamas.
const TAP_GUARD_SELECTOR_V78 = [
  "button.btn",
  "button[type=submit]",
  ".emptyCarsBtnV75",
  ".saleModalConfirm",
  ".cfSaveV51",
  ".bsCtaV70",
  ".autoEasierSubmit",
  ".daDeleteBtnV75"
].join(",");
const TAP_GUARD_MS_V78 = 800;
let lastGuardedTapV78 = { sig: "", at: -1e9, failed: false };
let lastSubmitV78 = { form: null, at: -1e9, failed: false };
function tapSignatureV78(btn) {
  const scope = btn.closest("[id]");
  return `${scope ? scope.id : ""}|${btn.id || ""}|${(btn.textContent || "").replace(/\s+/g, " ").trim()}`;
}
const __toastGuardV78 = toast;
toast = function (msg, icon) {
  if (icon === "!") {
    const now = performance.now();
    if (now - lastGuardedTapV78.at < TAP_GUARD_MS_V78) lastGuardedTapV78.failed = true;
    if (now - lastSubmitV78.at < TAP_GUARD_MS_V78) lastSubmitV78.failed = true;
  }
  return __toastGuardV78.apply(this, arguments);
};
window.addEventListener(
  "click",
  e => {
    // Tik tikri vartotojo paspaudimai: programiniai .click() (vienas modulis „spaudžia“ kito mygtuką) – neliečiami
    if (!e.isTrusted) return;
    const btn = e.target instanceof Element ? e.target.closest(TAP_GUARD_SELECTOR_V78) : null;
    if (!btn || btn.disabled) return;
    const now = performance.now();
    const sig = tapSignatureV78(btn);
    const last = lastGuardedTapV78;
    if (sig === last.sig && !last.failed && now - last.at < TAP_GUARD_MS_V78) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    lastGuardedTapV78 = { sig, at: now, failed: false };
  },
  true
);
let lastUserInputV78 = -1e9;
["pointerdown", "keydown"].forEach(type =>
  window.addEventListener(type, e => e.isTrusted && (lastUserInputV78 = performance.now()), true)
);
window.addEventListener(
  "submit",
  e => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    // requestSubmit() iš kodo – taip pat tik po tikro paspaudimo / Enter (submit įvykis visada isTrusted=false
    // kviečiant requestSubmit, todėl tikrinama, ar neseniai buvo tikras vartotojo veiksmas)
    if (!e.isTrusted && performance.now() - lastUserInputV78 > 1000) return;
    const now = performance.now();
    const last = lastSubmitV78;
    if (last.form === form && !last.failed && now - last.at < TAP_GUARD_MS_V78) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    lastSubmitV78 = { form, at: now, failed: false };
  },
  true
);

// ---------- 2. Klaidų saugiklis: programa niekada nelieka „balta“ ----------
const appErrorsV78 = [];
let lastErrorToastV78 = 0;
function reportAppErrorV78(err, where) {
  const message = String(err?.message || err || "Nežinoma klaida").slice(0, 300);
  appErrorsV78.push({ at: new Date().toISOString(), where, message });
  if (appErrorsV78.length > 30) appErrorsV78.shift();
  console.error(`AutoEasier klaida (${where}):`, err);
  const now = Date.now();
  if (now - lastErrorToastV78 > 10000) {
    lastErrorToastV78 = now;
    try {
      toast("Kažkas nepavyko. Duomenys išsaugoti – bandykite dar kartą.", "!");
    } catch (e) {}
  }
}
// Trikdžiai, kurie nėra programos klaidos (naršyklės plėtiniai, ResizeObserver, nutrauktas tinklas)
function ignorableErrorV78(message, filename) {
  if (
    /ResizeObserver loop|Script error\.?$|AbortError|The user aborted|NetworkError|Failed to fetch|Load failed/i.test(
      message || ""
    )
  )
    return true;
  if (filename && !filename.startsWith(location.origin) && !filename.startsWith("file:")) return true;
  return false;
}
window.addEventListener("error", e => {
  if (e.target && e.target !== window) return; // nepavykęs paveikslėlis ar skriptas
  if (ignorableErrorV78(e.message, e.filename)) return;
  reportAppErrorV78(e.error || e.message, "window");
});
window.addEventListener("unhandledrejection", e => {
  const reason = e.reason;
  if (ignorableErrorV78(String(reason?.message || reason || ""), "")) return;
  reportAppErrorV78(reason, "promise");
});
window.AUTOEASIER_DIAGNOSTICS = { errors: () => appErrorsV78.slice() };

// Perpiešimo apsauga: jei render() nepavyksta, sutvarkomi laikini rodinio nustatymai ir bandoma dar kartą
let renderFailuresV78 = 0;
function recoverRenderV78(err) {
  reportAppErrorV78(err, "render");
  if (renderFailuresV78++ >= 2) return;
  try {
    state.ui = state.ui && typeof state.ui === "object" ? state.ui : {};
    state.ui.accountingPanel = "";
    if (!["garage", "accounting", "menu"].includes(state.selectedView)) state.selectedView = "garage";
  } catch (e) {}
  requestAnimationFrame(() => {
    try {
      const again = render();
      if (again && typeof again.then === "function") again.catch(e => reportAppErrorV78(e, "render-retry"));
    } catch (e) {
      reportAppErrorV78(e, "render-retry");
    }
  });
}
const __renderSafeV78 = render;
render = function () {
  let result;
  try {
    result = __renderSafeV78.apply(this, arguments);
  } catch (err) {
    recoverRenderV78(err);
    return undefined;
  }
  if (result && typeof result.then === "function")
    return result.then(
      value => {
        renderFailuresV78 = 0;
        return value;
      },
      err => recoverRenderV78(err)
    );
  renderFailuresV78 = 0;
  return result;
};

// ---------- 3. Keli skirtukai tame pačiame įrenginyje ----------
// Kai kitas skirtukas išsaugo tos pačios paskyros duomenis, šis skirtukas juos perima (o ne perrašo senais).
window.addEventListener("storage", e => {
  if (!e.key || e.key !== STORAGE_KEY || !e.newValue) return;
  try {
    const current = JSON.stringify(state);
    if (current === e.newValue) return;
    state = sanitizeMediaRefs(loadState());
    render();
  } catch (err) {
    reportAppErrorV78(err, "storage");
  }
});

// ---------- 4. Dideli skaičiai visada telpa ----------
// 6–7 skaitmenų sumos (pvz. „1 123 455 €“) nekarpomos ir neišlenda: jei netelpa, visų grupės skaičių
// šriftas vienodai sumažinamas (ne mažiau 11 px). Vykdoma iš karto po perpiešimo – be matomo poslinkio.
// Automobilių kortelių (jų gali būti šimtai) skaičiai matuojami per canvas.measureText – be išdėstymo skaičiavimo.
const FIT_GROUPS_V78 = [
  ["#sheet .premiumStatGrid", "strong"],
  [".smallStatBox", ".value"],
  ["#sheet .cdStatusV60", "b"]
];
let measureCtxV78 = null;
function textWidthV78(text, font) {
  if (!measureCtxV78) measureCtxV78 = document.createElement("canvas").getContext("2d");
  measureCtxV78.font = font;
  return measureCtxV78.measureText(text).width;
}
// Canvas nežino apie CSS tabular-nums / letter-spacing – todėl matavimas sukalibruojamas pagal tikrą tekstą (Range)
function domTextWidthV78(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect().width;
}
function fitCarFactsV78(root) {
  const groups = [...root.querySelectorAll(".carListCard .garageRefFacts")];
  if (!groups.length) return;
  groups.forEach(g =>
    g.querySelectorAll("strong").forEach(el => el.style.fontSize && el.style.removeProperty("font-size"))
  );
  const sample = groups.find(g => g.getClientRects().length && g.querySelector("strong"));
  if (!sample) return;
  const sampleStrongs = [...sample.querySelectorAll("strong")];
  const cs = getComputedStyle(sampleStrongs[0]);
  const base = parseFloat(cs.fontSize) || 15;
  const font = `${cs.fontStyle} ${cs.fontWeight} ${base}px ${cs.fontFamily}`;
  let calibration = 1;
  sampleStrongs.forEach(el => {
    const canvasWidth = textWidthV78(el.textContent, font);
    if (canvasWidth > 8) calibration = Math.max(calibration, domTextWidthV78(el) / canvasWidth);
  });
  // Stulpeliai vienodo pločio – užtenka išmatuoti vieną kortelę
  const avail = [...sample.children].map(cell => {
    const st = getComputedStyle(cell);
    return cell.clientWidth - (parseFloat(st.paddingLeft) || 0) - (parseFloat(st.paddingRight) || 0);
  });
  if (!avail.length || avail.some(w => !(w > 0))) return;
  const adjusted = [];
  groups.forEach(group => {
    const strongs = [...group.querySelectorAll("strong")];
    let ratio = 1;
    strongs.forEach((el, i) => {
      const need = textWidthV78(el.textContent, font) * calibration;
      const room = avail[Math.min(i, avail.length - 1)] - 1;
      if (need > room) ratio = Math.min(ratio, room / need);
    });
    if (ratio < 1) {
      const size = Math.max(11, Math.floor(base * ratio * 0.97 * 2) / 2);
      strongs.forEach(el => el.style.setProperty("font-size", `${size}px`, "important"));
      adjusted.push({ strongs, size });
    }
  });
  // Galutinis patikrinimas tik pakeistoms (retoms) kortelėms – viena išdėstymo užklausa
  adjusted.forEach(job => {
    let guard = 0;
    while (
      job.size > 11 &&
      guard++ < 4 &&
      job.strongs.some(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 0.5)
    ) {
      job.size = Math.max(11, job.size - 0.5);
      job.strongs.forEach(el => el.style.setProperty("font-size", `${job.size}px`, "important"));
    }
  });
}
// Kiek kartų grupė per plati (1 – telpa). Vien skaitymas – rašymai atliekami atskirai.
function groupRatioV78(group, items) {
  let ratio = group.scrollWidth > group.clientWidth + 1 ? group.clientWidth / group.scrollWidth : 1;
  for (const item of items) {
    if (item.scrollWidth > item.clientWidth + 1 && item.clientWidth > 0)
      ratio = Math.min(ratio, item.clientWidth / item.scrollWidth);
    const cell = item.parentElement;
    if (!cell) continue;
    const ir = item.getBoundingClientRect(),
      cr = cell.getBoundingClientRect();
    if (ir.right > cr.right + 0.5 && ir.width > 0) ratio = Math.min(ratio, (cr.right - ir.left) / ir.width);
  }
  return ratio;
}
function fitNumbersV78(root = document) {
  fitCarFactsV78(root);
  const jobs = [];
  for (const [groupSel, itemSel] of FIT_GROUPS_V78)
    root.querySelectorAll(groupSel).forEach(group => {
      const items = [...group.querySelectorAll(itemSel)];
      if (items.length) jobs.push({ group, items });
    });
  if (!jobs.length) return;
  jobs.forEach(job =>
    job.items.forEach(item => item.style.fontSize && item.style.removeProperty("font-size"))
  );
  const tight = [];
  jobs.forEach(job => {
    if (!job.group.getClientRects().length) return;
    const ratio = groupRatioV78(job.group, job.items);
    if (ratio < 0.999)
      tight.push({ ...job, ratio, size: parseFloat(getComputedStyle(job.items[0]).fontSize) || 15 });
  });
  tight.forEach(job => {
    job.size = Math.max(11, Math.floor(job.size * job.ratio * 0.97 * 2) / 2);
    job.items.forEach(item => item.style.setProperty("font-size", `${job.size}px`, "important"));
  });
  tight.forEach(job => {
    let guard = 0;
    while (job.size > 11 && guard++ < 4 && groupRatioV78(job.group, job.items) < 0.999) {
      job.size = Math.max(11, job.size - 0.5);
      job.items.forEach(item => item.style.setProperty("font-size", `${job.size}px`, "important"));
    }
  });
}
function fitNumbersSafeV78() {
  try {
    fitNumbersV78();
  } catch (err) {
    console.warn("fitNumbersV78", err);
  }
}
// Skaičiai pritaikomi vieną kartą per kadrą (prieš piešimą): po render() ir bet kokio DOM pakeitimo.
// Sinchroninis matavimas po kiekvieno render() iššaukdavo kelis pilnus išdėstymo skaičiavimus iš eilės.
let fitQueuedV78 = false;
function scheduleFitV78() {
  if (fitQueuedV78) return;
  fitQueuedV78 = true;
  requestAnimationFrame(() => {
    fitQueuedV78 = false;
    fitNumbersSafeV78();
  });
}
// Langai (#sheet) dažnai užpildomi po openSheet() – todėl ir po bet kokio DOM pakeitimo (prieš kitą kadrą)
try {
  new MutationObserver(scheduleFitV78).observe(document.body, { childList: true, subtree: true });
} catch (err) {}
let fitResizeTimerV78 = 0;
window.addEventListener("resize", () => {
  clearTimeout(fitResizeTimerV78);
  fitResizeTimerV78 = setTimeout(scheduleFitV78, 120);
});
document.fonts?.ready?.then(scheduleFitV78).catch(() => {});
scheduleFitV78();

// ---------- 5. Greitis su šimtais įrašų: nematomi skyriai neperpiešiami ----------
// render() perpiešia visus skyrius kiekvieną kartą. Buhalterija ir Finansai (su tūkstančiais operacijų)
// perpiešiami tik kai jie matomi. Praleidus pažymima „pasenusi“ būsena, ir vos skyrius tampa matomas
// (ir per greitą apačios juostos perjungimą be render(), 46-nav-v63.js) – jis perpiešiamas iš karto.
const staleV78 = { accounting: false, finance: false };
function accountingVisibleV78() {
  return state.selectedView === "accounting";
}
function financeVisibleV78() {
  return accountingVisibleV78() && state.ui?.accountingPanel === "finance";
}
const __renderAccountingCenterV78 = renderAccountingCenter;
renderAccountingCenter = function () {
  if (!accountingVisibleV78()) {
    staleV78.accounting = true;
    return undefined;
  }
  staleV78.accounting = false;
  return __renderAccountingCenterV78.apply(this, arguments);
};
const __renderFinancePageV78 = renderFinancePage;
renderFinancePage = function () {
  if (!financeVisibleV78()) {
    staleV78.finance = true;
    return undefined;
  }
  staleV78.finance = false;
  return __renderFinancePageV78.apply(this, arguments);
};
function refreshStaleV78() {
  try {
    if (staleV78.accounting && accountingVisibleV78()) renderAccountingCenter();
    if (staleV78.finance && financeVisibleV78()) renderFinancePage();
  } catch (err) {
    reportAppErrorV78(err, "refresh");
  }
}
const __renderStaleV78 = render;
render = function () {
  const result = __renderStaleV78.apply(this, arguments);
  if (result && typeof result.then === "function")
    return result.then(value => {
      refreshStaleV78();
      return value;
    });
  refreshStaleV78();
  return result;
};
