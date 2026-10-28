// Statistikos laikotarpis, paleidimas (bootRender), puslapio matomumo įvykiai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const statsPage = document.getElementById("view-garage-stats");
statsPage.innerHTML = `<div class="workHead"><h2>Statistika</h2><button class="workTextButton" data-open-view="garage">Garažas ↗</button></div><form id="periodForm" class="periodPanel"><div class="workTabs periodTabs" role="group" aria-label="Laikotarpis">${[
  ["month", "Šis mėnuo"],
  ["previous", "Praėjęs"],
  ["year", "Šie metai"],
  ["all", "Visas laikas"]
]
  .map(([v, l]) => `<button type="button" data-period="${v}">${l}</button>`)
  .join(
    ""
  )}</div><div class="periodDates"><label for="periodFrom">Nuo<input class="input" type="date" id="periodFrom"></label><label for="periodTo">Iki<input class="input" type="date" id="periodTo"></label><button class="btn" type="submit">Rodyti</button></div><div id="periodError" role="alert"></div></form><div id="periodSummary"></div><div class="workHead salesHeading"><h3>Pardavimai</h3><span id="periodSalesCount"></span></div><div id="periodSales"></div>`;
state.reportingRange = state.reportingRange || {
  from: currentMonthKey() + "-01",
  to: todayISO(),
  preset: "month"
};
document.getElementById("periodFrom").value = state.reportingRange.from || "";
document.getElementById("periodTo").value = state.reportingRange.to || "";
function applyPeriod(from, to, preset = "custom") {
  const error = document.getElementById("periodError");
  if (from && to && from > to) {
    error.textContent = "Pradžios data turi būti ne vėlesnė už pabaigos datą.";
    return false;
  }
  error.textContent = "";
  state.reportingRange = { from, to, preset };
  state.ui.garageSalesPage = 1;
  document.getElementById("periodFrom").value = from;
  document.getElementById("periodTo").value = to;
  saveState();
  renderGarageStatsPage();
  return true;
}
document.getElementById("periodForm").onsubmit = e => {
  e.preventDefault();
  applyPeriod(document.getElementById("periodFrom").value, document.getElementById("periodTo").value);
};
statsPage.querySelectorAll("[data-period]").forEach(
  b =>
    (b.onclick = () => {
      const today = todayISO(),
        date = parseISODateLocal(today),
        key = b.dataset.period;
      let from = "",
        to = today;
      if (key === "month") from = today.slice(0, 7) + "-01";
      if (key === "year") from = today.slice(0, 4) + "-01-01";
      if (key === "previous") {
        from = toISODateLocal(new Date(date.getFullYear(), date.getMonth() - 1, 1));
        to = toISODateLocal(new Date(date.getFullYear(), date.getMonth(), 0));
      }
      if (key === "all") to = "";
      applyPeriod(from, to, key);
    })
);
renderGarageStatsPage = function () {
  if (!state.reportingRange)
    state.reportingRange = { from: currentMonthKey() + "-01", to: todayISO(), preset: "month" };
  const r = state.reportingRange;
  const within = d =>
    !r.from && !r.to
      ? true
      : !!d && (!r.from || d.slice(0, 10) >= r.from) && (!r.to || d.slice(0, 10) <= r.to);
  const bought = state.cars.filter(c => within(c.createdDateISO)),
    sold = state.cars
      .filter(c => c.status === "parduotas" && within(c.soldDateISO))
      .sort((a, b) => (b.soldDateISO || "").localeCompare(a.soldDateISO || ""));
  const purchase = bought.reduce((n, c) => n + Number(c.buyPrice || 0), 0),
    revenue = sold.reduce((n, c) => n + Number(c.soldPrice || 0), 0),
    cost = sold.reduce((n, c) => n + carTotalCost(c), 0),
    margin = revenue - cost;
  const days = sold
    .map(c => {
      const a = parseISODateLocal(c.createdDateISO),
        b = parseISODateLocal(c.soldDateISO);
      return a && b && b >= a ? Math.round((b - a) / 864e5) : null;
    })
    .filter(d => d !== null);
  document.getElementById("periodSummary").innerHTML = `<div class="periodMetrics">${[
    ["Nupirkta", bought.length],
    ["Parduota", sold.length],
    ["Pirkimo suma", moneyFmt(purchase)],
    ["Pardavimo pajamos", moneyFmt(revenue)],
    ["Parduotų auto savikaina", moneyFmt(cost)],
    ["Pardavimo marža", moneyFmt(margin)]
  ]
    .map(
      ([l, v], i) =>
        `<div class="periodMetric ${i === 5 ? "periodProfit" : ""}"><span>${l}</span><strong${i === 5 && margin < 0 ? ' class="companyDue"' : ""}>${v}</strong></div>`
    )
    .join(
      ""
    )}</div><div class="periodAverages"><div><span>Vid. marža / auto</span><strong>${sold.length ? moneyFmt(margin / sold.length) : "—"}</strong></div><div><span>Vid. pardavimo laikas</span><strong>${days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) + " d." : "—"}</strong></div></div><p class="periodFootnote">Pirkimai pagal pirkimo datą, pardavimai pagal pardavimo datą. Marža prieš bendrąsias išlaidas ir mokesčius.</p>`;
  statsPage.querySelectorAll("[data-period]").forEach(b => {
    b.classList.toggle("selected", b.dataset.period === r.preset);
    b.setAttribute("aria-pressed", String(b.dataset.period === r.preset));
  });
  const max = Math.max(1, Math.ceil(sold.length / 10));
  state.ui.garageSalesPage = Math.min(Math.max(1, state.ui.garageSalesPage || 1), max);
  const page = state.ui.garageSalesPage;
  document.getElementById("periodSalesCount").textContent = sold.length;
  document.getElementById("periodSales").innerHTML = sold.length
    ? `<div class="companyList">${sold
        .slice((page - 1) * 10, page * 10)
        .map(
          c =>
            `<button class="companyRow" data-period-car="${escapeHTML(c.id)}"><span class="rowBody"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.soldDateISO || "Data nenurodyta")} · ${moneyFmt(c.soldPrice)}</small></span><span class="periodSaleMargin ${carNetProfit(c) < 0 ? "companyDue" : ""}">${moneyFmt(carNetProfit(c))}<small>Marža</small></span></button>`
        )
        .join(
          ""
        )}</div>${max > 1 ? `<div class="periodPager"><button class="btn secondary" id="periodPrev" ${page === 1 ? "disabled" : ""}>←</button><span>${page} / ${max}</span><button class="btn secondary" id="periodNext" ${page === max ? "disabled" : ""}>→</button></div>` : ""}`
    : '<div class="workEmpty">Šiuo laikotarpiu pardavimų nėra.</div>';
  statsPage
    .querySelectorAll("[data-period-car]")
    .forEach(b => (b.onclick = () => openCar(b.dataset.periodCar)));
  if (document.getElementById("periodPrev"))
    document.getElementById("periodPrev").onclick = () => {
      state.ui.garageSalesPage--;
      renderGarageStatsPage();
    };
  if (document.getElementById("periodNext"))
    document.getElementById("periodNext").onclick = () => {
      state.ui.garageSalesPage++;
      renderGarageStatsPage();
    };
};
migrateGarageChecklists();
const bootRender = () => {
  try {
    if (!state.history.length)
      state.history.push({
        title: "AutoEasier",
        desc: "Darbo aplinka paruošta",
        icon: "🚗",
        time: nowLabel(),
        date: todayISO()
      });
    ensurePermanentHistory();
    state.ui = state.ui || {
      taskGroups: { Sveikata: false, Produktyvumas: false, Tobulėjimas: false },
      historyOpen: false,
      garageTaskGroups: { autos: false, custom: false },
      leadFilters: { query: "", due: "all", sort: "due" },
      menuSections: { shop: false, stats: false }
    };
    state.ui.garageTaskGroups = state.ui.garageTaskGroups || { autos: false, custom: false };
    state.ui.leadFilters = state.ui.leadFilters || { query: "", due: "all", sort: "due" };
    state.ui.menuSections = state.ui.menuSections || { shop: false, stats: false };
    ensureMonthlyCycle();
  } catch (e) {
    console.warn("Initial setup failed; continuing to render:", e);
  }
  try {
    render();
  } catch (e) {
    console.warn("Initial render failed:", e);
  }
  if (securityEnabled()) setTimeout(lockApp, 0);
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", bootRender, { once: true });
else bootRender();
window.addEventListener("pageshow", e => {
  if (e.persisted) {
    try {
      render();
    } catch (e) {}
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    try {
      render();
    } catch (e) {}
  }
});
const runPhotoMaintenance = () =>
  migrateStatePhotos()
    .then(() => render())
    .catch(e => console.warn("Photo migration failed", e));
if ("requestIdleCallback" in window) requestIdleCallback(runPhotoMaintenance, { timeout: 1800 });
else setTimeout(runPhotoMaintenance, 900);
