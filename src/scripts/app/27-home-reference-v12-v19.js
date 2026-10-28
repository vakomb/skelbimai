// Pagrindinio puslapio etaloninis vaizdas (v12–v19).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function homeReferenceDateV12() {
  const d = new Date(),
    days = ["sk", "pr", "an", "tr", "kt", "pn", "št"];
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}, ${days[d.getDay()]}`;
}
function homeReferenceMediaV12(item) {
  try {
    if (typeof garageWhatMediaApp === "function") {
      const v = garageWhatMediaApp(item);
      if (v) return v;
    }
  } catch (e) {}
  return "";
}
function homeReferenceNavV12() {
  const icons = {
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.2 12 3l8.5 7.2"/><path d="M5.5 9.3V21h13V9.3"/><path d="M9.5 21v-6h5v6"/></svg>`,
    garage: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 14.5 4.8 9h14.4l1.8 5.5"/><path d="M5 9 7 5.5h10L19 9"/><rect x="3" y="12" width="18" height="7" rx="2"/><circle cx="7" cy="16" r="1.2"/><circle cx="17" cy="16" r="1.2"/></svg>`,
    accounting: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>`,
    finance: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V12h3v8zM10.5 20V7h3v13zM17 20V3h3v17z"/></svg>`,
    menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`
  };
  document.querySelectorAll(".navBtn").forEach(b => {
    const ico = b.querySelector(".ico"),
      v = b.dataset.view;
    if (ico && icons[v]) ico.innerHTML = icons[v];
  });
}
renderCompanyHome = function () {
  const root = document.getElementById("companyHome");
  if (!root) return;
  state.ui = state.ui || {};
  state.ui.homeGroups = state.ui.homeGroups || { cars: false, other: false };
  const must = todayRequiredItemsApp();
  const carGroups = homeCarTaskGroupsApp(),
    carTaskCount = carGroups.reduce((n, g) => n + g.tasks.length, 0),
    other = homeOtherTasksApp();
  const clipboardIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8V5"/><path d="m9 11 1.6 1.6L14 9.2M9 16l1.6 1.6L14 14.2"/></svg>`;
  const carIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 14.5 5.6 9h12.8l1.6 5.5"/><path d="M6.2 9 8 5.5h8L17.8 9"/><rect x="3" y="12" width="18" height="7" rx="2"/><circle cx="7" cy="16" r="1.1"/><circle cx="17" cy="16" r="1.1"/></svg>`;
  const docIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M9.5 12h5M9.5 15.5h5"/></svg>`;
  const chevronUp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 14 6-6 6 6"/></svg>`;
  const chevronRight = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 5 7 7-7 7"/></svg>`;
  const calendar = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17"/></svg>`;
  const brandLogo = `<svg class="homeRefLogo" viewBox="0 0 40 28" fill="none" aria-hidden="true"><path d="M2 24 15 9l6 7 5-6 12 14" stroke="#c19a5b" stroke-width="3.1" stroke-linecap="square" stroke-linejoin="miter"/><path d="m10 24 11-12 10 12" stroke="#c19a5b" stroke-width="2.2" opacity=".68"/></svg>`;
  const todayRow = t => {
    const media = homeReferenceMediaV12(t);
    return `<button class="homeRefTodayTask ${t.late ? "late" : ""}" type="button" data-company-kind="${t.kind}" data-company-id="${escapeHTML(t.id)}">\n        <span class="homeRefThumb">${media ? `<img src="${escapeHTML(media)}" alt="">` : `${t.icon || "✓"}`}</span>\n        <span class="homeRefTodayCopy"><strong>${escapeHTML(t.action)}</strong><span>${escapeHTML(t.entity)}</span></span>\n        <span class="homeRefStatus">${t.late ? "Vėluoja" : "Šiandien"}</span>\n      </button>`;
  };
  const carGroupsHtml = carGroups.length
    ? carGroups
        .map(
          g =>
            `<section class="homeCarBlock"><div class="homeCarHead"><strong>${escapeHTML(g.car.name)}</strong><span>${g.tasks.length}</span></div><div class="homeFoldList">${g.tasks
              .map(t => {
                const due = homeTaskDueApp(t.dueDate || "");
                return `<button class="homeFoldTask" type="button" data-company-kind="car" data-company-id="${escapeHTML(g.car.id)}"><strong>${escapeHTML(t.name)}</strong><span class="homeFoldDue ${due.cls}">${escapeHTML(due.label)}</span></button>`;
              })
              .join("")}</div></section>`
        )
        .join("")
    : '<div class="homeFoldEmpty">Užduočių nėra</div>';
  const otherHtml = other.length
    ? other
        .map(t => {
          const due = homeTaskDueApp(t.dueDate || "");
          return `<button class="homeFoldTask" type="button" data-company-kind="task" data-company-id="${escapeHTML(t.id)}"><strong>${escapeHTML(t.title)}</strong><span class="homeFoldDue ${due.cls}">${escapeHTML(due.label)}</span></button>`;
        })
        .join("")
    : '<div class="homeFoldEmpty">Užduočių nėra</div>';
  root.innerHTML = `\n      <div class="homeRefBrandRow">\n        <div class="homeRefBrand">${brandLogo}<span>${escapeHTML(profileDisplayNameV57())}</span></div>\n        <div class="homeRefDate">${calendar}<span>${escapeHTML(homeReferenceDateV12())}</span></div>\n      </div>\n      <h2 class="homeRefTitle">Pagrindinis</h2>\n\n      <details class="homeRefToday" open>\n        <summary><span class="homeRefTodayIcon">${clipboardIcon}</span><span class="homeRefTodayTitle">Šiandienos užduotys</span><span class="homeRefTodayChevron">${chevronUp}</span></summary>\n        <div class="homeRefTodayBody">${must.length ? must.map(todayRow).join("") : '<div class="homeRefEmpty">Šiandien būtinų darbų nėra</div>'}</div>\n      </details>\n\n      <div class="homeRefStacks">\n        <details class="homeRefFold homeRefCars" data-home-group="cars" ${state.ui.homeGroups.cars ? "open" : ""}>\n          <summary><span class="homeRefFoldIcon">${carIcon}</span><span class="homeRefFoldTitle">Automobilių užduotys</span><span class="homeRefFoldCount">${carTaskCount}</span><span class="homeRefFoldArrow">${chevronRight}</span></summary>\n          <div class="homeRefFoldBody">${carGroupsHtml}</div>\n        </details>\n        <details class="homeRefFold homeRefOther" data-home-group="other" ${state.ui.homeGroups.other ? "open" : ""}>\n          <summary><span class="homeRefFoldIcon">${docIcon}</span><span class="homeRefFoldTitle">Kitos užduotys</span><span class="homeRefFoldCount">${other.length}</span><span class="homeRefFoldArrow">${chevronRight}</span></summary>\n          <div class="homeRefFoldBody"><div class="homeFoldList">${otherHtml}</div></div>\n        </details>\n      </div>\n\n      <div class="homeRefHero" aria-hidden="true"></div>`;
  root.querySelectorAll("details[data-home-group]").forEach(el =>
    el.addEventListener("toggle", () => {
      state.ui.homeGroups[el.dataset.homeGroup] = el.open;
      saveState();
    })
  );
  homeReferenceNavV12();
  document.querySelectorAll(".navBtn").forEach(b => {
    if (b.dataset.view === state.selectedView) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
};
function updateGarageReferenceV13() {
  const d = document.getElementById("garageRefDateText");
  if (d && typeof homeReferenceDateV12 === "function") d.textContent = homeReferenceDateV12();
  if (typeof homeReferenceNavV12 === "function") homeReferenceNavV12();
}
const __garageRefRenderV13 = render;
render = function () {
  const out = __garageRefRenderV13.apply(this, arguments);
  updateGarageReferenceV13();
  return out;
};
function homeExactLogoV19() {
  return `<svg class="homeExactLogo" viewBox="0 0 47 33" fill="none" aria-hidden="true"><path d="M2.5 27 17 9.5l6.5 7.2 6-6.4L44 27" stroke="#bd9558" stroke-width="3.45" stroke-linecap="square" stroke-linejoin="miter"/><path d="m11 27 12.3-13L35 27" stroke="#bd9558" stroke-width="2.35" opacity=".7"/></svg>`;
}
function homeExactCalendarV19() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17"/></svg>`;
}
function homeExactDateV19() {
  try {
    return homeReferenceDateV12();
  } catch (e) {
    const d = new Date(),
      days = ["sk", "pr", "an", "tr", "kt", "pn", "št"];
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}, ${days[d.getDay()]}`;
  }
}
function homeExactTaskMediaV19(item) {
  try {
    const a = homeReferenceMediaV12(item);
    if (a) return a;
  } catch (e) {}
  try {
    const b = garageWhatMediaApp(item);
    if (b) return b;
  } catch (e) {}
  return "";
}
function homeExactVariantMediaV19(v) {
  const raw = (v.photos || [])[0] || v.imageSrc || "";
  if (!raw) return "";
  return photoSrcSafe(raw);
}
function homeExactVariantsV19() {
  return [...(state.leadVariants || [])]
    .sort((a, b) => {
      const ad = String(a.createdDateISO || a.date || ""),
        bd = String(b.createdDateISO || b.date || "");
      if (ad !== bd) return bd.localeCompare(ad);
      return String(b.createdAt || b.id || "").localeCompare(String(a.createdAt || a.id || ""));
    })
    .slice(0, 2);
}
function homeExactMonthV19() {
  try {
    const range = accountingRangeV8("month");
    const d = accountingReportDataV8(range);
    const income = Number(d.sales || 0) + Number(d.income || 0);
    const expense = Number(d.purchases || 0) + Number(d.expense || 0);
    const profit = income - expense;
    const docs =
      (d.cars || []).reduce((n, c) => n + (c.documents || []).length, 0) +
      (d.tx || []).reduce((n, t) => n + (t.attachments || []).length, 0);
    return { income, expense, profit, docs };
  } catch (e) {
    return {
      income: Number(state.finances?.monthlyRevenue || 0),
      expense: Number(state.finances?.monthlyExpenses || 0),
      profit: Number(state.finances?.monthlyNetProfit || 0),
      docs: 0
    };
  }
}
renderCompanyHome = function () {
  const root = document.getElementById("companyHome");
  if (!root) return;
  state.ui = state.ui || {};
  state.ui.homeGroups = state.ui.homeGroups || { cars: false, other: false };
  const must = typeof todayRequiredItemsApp === "function" ? todayRequiredItemsApp() : [];
  const shown = must.slice(0, 4);
  const carGroups = typeof homeCarTaskGroupsApp === "function" ? homeCarTaskGroupsApp() : [];
  const other = typeof homeOtherTasksApp === "function" ? homeOtherTasksApp() : [];
  const carTaskCount = carGroups.reduce((n, g) => n + (g.tasks || []).length, 0);
  const variants = homeExactVariantsV19();
  const month = homeExactMonthV19();
  const dueLabel = (date = "") => {
    if (!date) return { text: "Be datos", cls: "none" };
    const now = todayISO();
    if (date < now) return { text: "Vėluoja", cls: "late" };
    if (date === now) return { text: "Šiandien", cls: "today" };
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const t =
      typeof toISODateLocal === "function" ? toISODateLocal(tomorrow) : tomorrow.toISOString().slice(0, 10);
    if (date === t) return { text: "Rytoj", cls: "next" };
    return { text: companyDate(date), cls: "next" };
  };
  const taskRows = shown.length
    ? shown
        .map(t => {
          const media = homeExactTaskMediaV19(t);
          return `<button class="homeProTodayRow ${t.late ? "late" : ""}" type="button" data-company-kind="${escapeHTML(t.kind)}" data-company-id="${escapeHTML(t.id)}">\n        <span class="homeProTodayPhoto">${media ? `<img src="${escapeHTML(media)}" alt="">` : escapeHTML(t.icon || "✓")}</span>\n        <span class="homeProTodayCopy">\n          <strong>${escapeHTML(t.action || "Užduotis")}</strong>\n          <span>${escapeHTML(t.entity || t.category || "")}</span>\n        </span>\n        <span class="homeProTodayStatus ${t.late ? "late" : "today"}">${t.late ? "Vėluoja" : "Šiandien"}</span>\n      </button>`;
        })
        .join("")
    : `<div class="homeProEmpty">Šiandien būtinų darbų nėra ✓</div>`;
  const carGroupsHtml = carGroups.length
    ? carGroups
        .map(g => {
          const media = homeExactTaskMediaV19({ kind: "car", id: g.car.id });
          const rows = (g.tasks || [])
            .map(t => {
              const d = dueLabel(t.dueDate || "");
              return `<button class="homeProSubTask" type="button" data-company-kind="car" data-company-id="${escapeHTML(g.car.id)}">\n          <span class="homeProSubTaskName">${escapeHTML(t.name || "Užduotis")}</span>\n          <span class="homeProDue ${d.cls}">${escapeHTML(d.text)}</span>\n        </button>`;
            })
            .join("");
          return `<section class="homeProCarGroup">\n        <button class="homeProCarHead" type="button" data-company-kind="car" data-company-id="${escapeHTML(g.car.id)}">\n          <span class="homeProCarPhoto">${media ? `<img src="${escapeHTML(media)}" alt="">` : "🚙"}</span>\n          <span class="homeProCarName"><strong>${escapeHTML(g.car.name || "Automobilis")}</strong><small>${g.tasks.length} ${g.tasks.length === 1 ? "užduotis" : "užduotys"}</small></span>\n          <span class="homeProArrow">›</span>\n        </button>\n        <div class="homeProSubList">${rows}</div>\n      </section>`;
        })
        .join("")
    : `<div class="homeProEmpty">Neatliktų automobilio užduočių nėra</div>`;
  const otherHtml = other.length
    ? other
        .map(t => {
          const d = dueLabel(t.dueDate || "");
          return `<button class="homeProOtherTask" type="button" data-company-kind="task" data-company-id="${escapeHTML(t.id)}">\n        <span class="homeProOtherMark"></span>\n        <span class="homeProOtherCopy"><strong>${escapeHTML(t.title || "Užduotis")}</strong><small>${escapeHTML(t.category || "Kita")}</small></span>\n        <span class="homeProDue ${d.cls}">${escapeHTML(d.text)}</span>\n      </button>`;
        })
        .join("")
    : `<div class="homeProEmpty">Kitų neatliktų užduočių nėra</div>`;
  const variantRows = variants.length
    ? variants
        .map(v => {
          const media = homeExactVariantMediaV19(v);
          const name = [v.make, v.model].filter(Boolean).join(" ") || v.name || "Variantas";
          const price = Number(v.targetPrice || v.initialPrice || v.price || 0);
          return `<button class="homeProVariant" type="button" data-company-kind="lead" data-company-id="${escapeHTML(v.id)}">\n        <span class="homeProVariantPhoto">${media ? `<img src="${escapeHTML(media)}" alt="">` : "🚗"}</span>\n        <span class="homeProVariantCopy"><strong>${escapeHTML(name)}</strong><b>${price ? moneyFmt(price) : "—"}</b></span>\n        <span class="homeProArrow">›</span>\n      </button>`;
        })
        .join("")
    : `<div class="homeProEmpty compact">Variantų nėra</div>`;
  root.innerHTML = `\n      <div class="homePro">\n        <header class="homeProBrand">\n          <div class="homeProBrandLeft">${homeExactLogoV19()}<span>${escapeHTML(profileDisplayNameV57())}</span></div>\n          <div class="homeProDate">${homeExactCalendarV19()}<span>${escapeHTML(homeExactDateV19())}</span></div>\n        </header>\n\n        <section class="homeProSection homeProToday">\n          <button class="homeProSectionHead" type="button" data-home-pro-today>\n            <span><strong>Šiandien būtina</strong></span>\n            <b>${must.length}</b>\n          </button>\n          <div class="homeProTodayList">${taskRows}</div>\n        </section>\n\n        <div class="homeProTaskFolds">\n          <details class="homeProFold" data-home-pro-fold="cars" ${state.ui.homeGroups.cars ? "open" : ""}>\n            <summary>\n              <span class="homeProFoldIcon">✓</span>\n              <span class="homeProFoldCopy"><strong>Automobilių užduotys</strong></span>\n              <b>${carTaskCount}</b>\n              <span class="homeProFoldChevron">⌄</span>\n            </summary>\n            <div class="homeProFoldBody">${carGroupsHtml}</div>\n          </details>\n\n          <details class="homeProFold" data-home-pro-fold="other" ${state.ui.homeGroups.other ? "open" : ""}>\n            <summary>\n              <span class="homeProFoldIcon">☑</span>\n              <span class="homeProFoldCopy"><strong>Kitos užduotys</strong></span>\n              <b>${other.length}</b>\n              <span class="homeProFoldChevron">⌄</span>\n            </summary>\n            <div class="homeProFoldBody">${otherHtml}</div>\n          </details>\n        </div>\n\n        <div class="homeProBottomGrid">\n          <section class="homeProCompact">\n            <button class="homeProCompactHead" type="button" data-home-pro-variants>\n              <strong>Variantai</strong><b>${(state.leadVariants || []).length}</b><span>›</span>\n            </button>\n            <div>${variantRows}</div>\n          </section>\n\n          <section class="homeProCompact">\n            <button class="homeProCompactHead" type="button" data-home-pro-month>\n              <strong>Šis mėnuo</strong><span></span><span>›</span>\n            </button>\n            <div class="homeProMetrics">\n              <div><span>Įplaukos</span><strong>${moneyFmt(month.income)}</strong></div>\n              <div><span>Išlaidos</span><strong>${moneyFmt(month.expense)}</strong></div>\n              <div><span>Pelnas</span><strong class="${month.profit < 0 ? "loss" : ""}">${month.profit >= 0 ? "+" : ""}${moneyFmt(month.profit)}</strong></div>\n              <div><span>Dok.</span><strong>${month.docs}</strong></div>\n            </div>\n          </section>\n        </div>\n\n        <div class="homeExactHero homeProHero" aria-hidden="true"></div>\n      </div>`;
  root.querySelector("[data-home-pro-today]")?.addEventListener("click", () => companyGo("garage-what"));
  root.querySelector("[data-home-pro-variants]")?.addEventListener("click", () => companyGo("garage-leads"));
  root.querySelector("[data-home-pro-month]")?.addEventListener("click", () => companyGo("accounting"));
  root.querySelectorAll("[data-home-pro-fold]").forEach(el =>
    el.addEventListener("toggle", () => {
      state.ui.homeGroups[el.dataset.homeProFold] = el.open;
      saveState();
    })
  );
  homeReferenceNavV12();
  document.querySelectorAll(".navBtn").forEach(b => {
    if (b.dataset.view === state.selectedView) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
};
