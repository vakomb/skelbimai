// Pagrindinis render(), statistikos ir finansų puslapiai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function renderGarageStatsPage() {
  const root = document.getElementById("garageStatsOverviewGrid");
  const detailRoot = document.getElementById("garageStatsDetailRoot");
  const salesRoot = document.getElementById("garageSalesRoot");
  if (!root || !detailRoot || !salesRoot) return;
  const cars = Array.isArray(state.cars) ? state.cars : [];
  const activeCars = cars.filter(car => car.status !== "parduotas");
  const soldCars = cars.filter(car => car.status === "parduotas");
  const boughtCost = cars.reduce((sum, car) => sum + carTotalCost(car), 0);
  const soldRevenue = soldCars.reduce((sum, car) => sum + Number(car.soldPrice || 0), 0);
  const totalNet = soldCars.reduce((sum, car) => sum + carNetProfit(car), 0);
  const avgBuy = cars.length ? Math.round(boughtCost / cars.length) : 0;
  const monthKey = currentMonthKey();
  const monthlyBought = cars.filter(c => (c.createdDateISO || "").slice(0, 7) === monthKey);
  const monthlySold = soldCars.filter(c => (c.soldDateISO || "").slice(0, 7) === monthKey);
  const monthlyInvested = monthlyBought.reduce((sum, c) => sum + carTotalCost(c), 0);
  const monthlyRevenue = monthlySold.reduce((sum, c) => sum + Number(c.soldPrice || 0), 0);
  const monthlyProfit = monthlySold.reduce((sum, c) => sum + carNetProfit(c), 0);
  const avgMonthlyProfit = monthlySold.length ? Math.round(monthlyProfit / monthlySold.length) : 0;
  const saleDays = monthlySold
    .map(c => {
      const from = parseISODateLocal(c.createdDateISO);
      const to = parseISODateLocal(c.soldDateISO);
      return from && to ? Math.max(0, Math.round((to - from) / 864e5)) : null;
    })
    .filter(v => v !== null);
  const avgSaleDays = saleDays.length ? Math.round(saleDays.reduce((a, b) => a + b, 0) / saleDays.length) : 0;
  const bestDeal = monthlySold.slice().sort((a, b) => carNetProfit(b) - carNetProfit(a))[0] || null;
  const mostExpensive =
    cars.slice().sort((a, b) => Number(b.buyPrice || 0) - Number(a.buyPrice || 0))[0] || null;
  const totalTasks = (state.completionLog || []).filter(
    e => e.kind === "garageCarTask" || e.kind === "garageCustomTask"
  ).length;
  root.innerHTML = [
    { label: "Viso automobilių", value: cars.length, icon: "🚗" },
    { label: "Aktyvūs", value: activeCars.length, icon: "🟢" },
    { label: "Parduoti", value: soldCars.length, icon: "🏁" },
    { label: "Pirkimo suma", value: moneyFmt(boughtCost), icon: "💸" },
    { label: "Pardavimai", value: moneyFmt(soldRevenue), icon: "💰" },
    { label: "Pardavimo marža", value: (totalNet >= 0 ? "+" : "") + moneyFmt(totalNet), icon: "📈" }
  ]
    .map(
      s =>
        `\n      <div class="smallStatBox garageOverviewStat">\n        <div class="label">${s.icon} ${s.label}</div>\n        <div class="value">${escapeHTML(String(s.value))}</div>\n      </div>\n    `
    )
    .join("");
  const businessRoot = document.getElementById("garageBusinessResult");
  if (businessRoot) {
    const sign = monthlyProfit >= 0 ? "+" : "";
    const margin = monthlyRevenue > 0 ? Math.round((monthlyProfit / monthlyRevenue) * 100) : 0;
    const investedForSold = monthlySold.reduce((sum, c) => sum + carTotalCost(c), 0);
    const roi = investedForSold > 0 ? Math.round((monthlyProfit / investedForSold) * 100) : 0;
    businessRoot.innerHTML = `\n        <div class="businessResult businessResultPro">\n          <div class="businessResultHead">\n            <div>\n              <div class="businessResultTitle">Šį mėnesį</div>\n              <div class="businessResultSub">Automobilių verslo rezultatas pagal realius pirkimus ir pardavimus</div>\n            </div>\n            <span class="badge ${monthlyProfit >= 0 ? "good" : "warn"}">\n              ${monthlyProfit >= 0 ? "Pelnas" : "Minusas"}\n            </span>\n          </div>\n\n          <div class="businessResultHero">\n            <span>Maržais rezultatas</span>\n            <strong class="${monthlyProfit < 0 ? "negative" : ""}">${sign}${moneyFmt(monthlyProfit)}</strong>\n          </div>\n\n          <div class="businessResultGrid">\n            <div class="businessMetric">\n              <div class="k">🚗 Nupirkta</div>\n              <div class="v">${monthlyBought.length}</div>\n            </div>\n            <div class="businessMetric">\n              <div class="k">💶 Investuota</div>\n              <div class="v">${moneyFmt(monthlyInvested)}</div>\n            </div>\n            <div class="businessMetric">\n              <div class="k">💰 Pardavimo pajamos</div>\n              <div class="v">${moneyFmt(monthlyRevenue)}</div>\n            </div>\n            <div class="businessMetric profit">\n              <div class="k">🟢 Pardavimo marža</div>\n              <div class="v">${sign}${moneyFmt(monthlyProfit)}</div>\n            </div>\n            <div class="businessMetric">\n              <div class="k">📈 Pelnas / parduotas auto</div>\n              <div class="v">${monthlySold.length ? (avgMonthlyProfit >= 0 ? "+" : "") + moneyFmt(avgMonthlyProfit) : "—"}</div>\n            </div>\n            <div class="businessMetric">\n              <div class="k">⏱ Pardavimo laikas</div>\n              <div class="v">${saleDays.length ? avgSaleDays + " d." : "—"}</div>\n            </div>\n\n          </div>\n\n          <div class="bestDeal ${bestDeal ? "" : "emptyBestDeal"}">\n            <div>\n              <div class="label">⭐ Geriausias sandoris</div>\n              <strong>${bestDeal ? escapeHTML(bestDeal.name || "Automobilis") : "Kol kas nėra pardavimų šį mėnesį"}</strong>\n            </div>\n            ${bestDeal ? `<strong>${carNetProfit(bestDeal) >= 0 ? "+" : ""}${moneyFmt(carNetProfit(bestDeal))}</strong>` : ""}\n          </div>\n        </div>\n      `;
  }
  detailRoot.innerHTML = [
    { label: "Vid. pirkimo kaina", value: moneyFmt(avgBuy), icon: "🧾", hint: "Visų automobilių" },
    {
      label: "Vid. pelnas / auto",
      value: monthlySold.length ? (avgMonthlyProfit >= 0 ? "+" : "") + moneyFmt(avgMonthlyProfit) : "—",
      icon: "📈",
      hint: "Parduoti šį mėnesį"
    },
    {
      label: "Vid. pardavimo laikas",
      value: saleDays.length ? `${avgSaleDays} d.` : "—",
      icon: "⏱️",
      hint: "Nuo pirkimo iki pardavimo"
    },
    { label: "Užduotys", value: totalTasks, icon: "✅", hint: "Garažo darbai" },
    {
      label: "Brangiausias auto",
      value: mostExpensive ? moneyFmt(mostExpensive.buyPrice) : "0 €",
      icon: "⭐",
      hint: mostExpensive ? mostExpensive.name : "Nėra duomenų"
    }
  ]
    .map(
      s =>
        `\n      <div class="smallStatBox garageTempoStat">\n        <div class="label">${s.icon} ${s.label}</div>\n        <div class="value">${escapeHTML(String(s.value))}</div>\n        <div class="hint">${escapeHTML(String(s.hint || ""))}</div>\n      </div>\n    `
    )
    .join("");
  const meta = document.getElementById("garageStatsMeta");
  if (meta) meta.textContent = `${monthlyProfit >= 0 ? "+" : ""}${moneyFmt(monthlyProfit)} šį mėnesį`;
  const sortedSold = soldCars.slice().sort((a, b) => {
    const ad = String(a.soldDateISO || a.soldAt || a.updatedAt || "");
    const bd = String(b.soldDateISO || b.soldAt || b.updatedAt || "");
    if (bd !== ad) return bd.localeCompare(ad);
    return String(b.updatedAt || b.createdDateISO || "").localeCompare(
      String(a.updatedAt || a.createdDateISO || "")
    );
  });
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(sortedSold.length / perPage));
  state.ui.garageSalesPage = Math.min(Math.max(1, Number(state.ui.garageSalesPage) || 1), totalPages);
  const page = state.ui.garageSalesPage;
  const from = (page - 1) * perPage;
  const pageCars = sortedSold.slice(from, from + perPage);
  const salesCount = document.getElementById("garageSalesCount");
  if (salesCount) salesCount.textContent = `${sortedSold.length} auto`;
  salesRoot.innerHTML = pageCars.length
    ? `\n      <div class="garageSalesGrid">\n        ${pageCars
        .map((car, idx) => {
          const profit = carNetProfit(car);
          const totalCost = carTotalCost(car);
          const soldPrice = Number(car.soldPrice || 0);
          const margin = soldPrice > 0 ? Math.round((profit / soldPrice) * 100) : 0;
          const days = (() => {
            const fromD = parseISODateLocal(car.createdDateISO),
              toD = parseISODateLocal(car.soldDateISO);
            return fromD && toD ? Math.max(0, Math.round((toD - fromD) / 864e5)) : null;
          })();
          const photo = photoUrlCache[car.imageSrc] || car.imageSrc || "";
          return `\n            <article class="soldCarCard">\n              <button class="soldCarImageBtn" type="button" data-open-car="${car.id}" aria-label="Atidaryti ${escapeHTML(car.name || "automobilį")}">\n                <div class="soldCarHero" style="background-image:url('${photo.replace(/'/g, "%27")}')">\n                  <span class="soldCarProfit ${profit >= 0 ? "positive" : "negative"}">${profit >= 0 ? "+" : ""}${moneyFmt(profit)}</span>\n                  <span class="soldCarIndex">${from + idx + 1}</span>\n                </div>\n              </button>\n              <div class="soldCarBody">\n                <div class="soldCarTitleRow">\n                  <h4>${escapeHTML(car.name || "Automobilis")}</h4>\n                  <span class="soldCarDate">${escapeHTML(car.soldDateISO || car.soldAt || "—")}</span>\n                </div>\n                <div class="soldCarNumbers">\n                  <span><small>Pirkta</small><strong>${moneyFmt(totalCost)}</strong></span>\n                  <span><small>Parduota</small><strong>${moneyFmt(soldPrice)}</strong></span>\n                  <span><small>${margin >= 0 ? "Marža" : "Minusas"}</small><strong class="${profit < 0 ? "negativeText" : "positiveText"}">${profit >= 0 ? "+" : ""}${margin}%</strong></span>\n                  <span><small>Laikas</small><strong>${days !== null ? days + " d." : "—"}</strong></span>\n                </div>\n              </div>\n            </article>\n          `;
        })
        .join(
          ""
        )}\n      </div>\n      <div class="garageSalesPager">\n        <button type="button" class="btn secondary garagePagerBtn" id="garageSalesPrev" ${page <= 1 ? "disabled" : ""}>← Ankstesni</button>\n        <div class="garagePagerInfo">\n          <strong>${page} / ${totalPages}</strong>\n          <span>${from + 1}–${Math.min(from + perPage, sortedSold.length)} iš ${sortedSold.length}</span>\n        </div>\n        <button type="button" class="btn secondary garagePagerBtn" id="garageSalesNext" ${page >= totalPages ? "disabled" : ""}>Kiti →</button>\n      </div>\n    `
    : `\n      <div class="emptyState garageSalesEmpty">\n        <strong>Parduotų automobilių dar nėra.</strong>\n        <span>Kai parduosi pirmą auto, jis čia atsiras su pelnu, kaina ir pardavimo tempu.</span>\n      </div>\n    `;
  salesRoot.querySelectorAll("[data-open-car]").forEach(btn => {
    btn.onclick = () => openCar(btn.dataset.openCar);
  });
  document.getElementById("garageSalesPrev")?.addEventListener("click", () => {
    if (state.ui.garageSalesPage <= 1) return;
    state.ui.garageSalesPage -= 1;
    saveState();
    render();
  });
  document.getElementById("garageSalesNext")?.addEventListener("click", () => {
    if (state.ui.garageSalesPage >= totalPages) return;
    state.ui.garageSalesPage += 1;
    saveState();
    render();
  });
}
function renderFinancePage() {
  const summaryRoot = document.getElementById("financeSummaryGrid");
  const txRoot = document.getElementById("financeTxRoot");
  const debtRoot = document.getElementById("financeDebtRoot");
  if (!summaryRoot || !txRoot || !debtRoot) return;
  ensureFinanceCollections();
  const totals = financeTotals();
  const activeCars = state.cars.filter(c => c.status !== "parduotas");
  const soldCars = state.cars.filter(c => c.status === "parduotas");
  const debtGroups = aggregateDebts();
  summaryRoot.innerHTML = [
    { label: "Pinigų likutis", value: moneyFmt(totals.budget), icon: "🧮" },
    { label: "Auto pirkimai", value: moneyFmt(totals.carPurchaseCost), icon: "🚗" },
    { label: "Auto pardavimai", value: moneyFmt(totals.carRevenue), icon: "💰" },
    { label: "Auto marža", value: moneyFmt(totals.carNet), icon: "📈" },
    { label: "Mokėtinos skolos", value: moneyFmt(totals.debtBalance), icon: "👥" },
    { label: "Likę aktyvūs auto", value: activeCars.length, icon: "🅰️" }
  ]
    .map(
      s =>
        `<div class="smallStatBox"><div class="label">${s.icon} ${s.label}</div><div class="value">${escapeHTML(String(s.value))}</div></div>`
    )
    .join("");
  const txs = state.finances.transactions;
  document.getElementById("financeTxCount").textContent = `${txs.length} įrašų`;
  txRoot.innerHTML = txs.length
    ? txs
        .map(
          tx =>
            `<div class="financeRow"><div><strong>${escapeHTML(tx.title || "")}</strong><span>${escapeHTML(tx.note || "")}</span></div><div style="text-align:right"><strong style="color:${tx.type === "income" ? "var(--success)" : "var(--danger)"}">${tx.type === "income" ? "+" : "-"}${moneyFmt(tx.amount)}</strong><span>${escapeHTML(tx.date || "")}</span></div></div>`
        )
        .join("")
    : '<div class="emptyState">Finansinių įrašų dar nėra.</div>';
  document.getElementById("financeDebtCount").textContent = `${debtGroups.length} partnerių`;
  debtRoot.innerHTML = debtGroups.length
    ? debtGroups
        .map(group => {
          const last = group.entries[0];
          return `<div class="financeRow"><div><strong>${escapeHTML(group.person)}</strong><span>${escapeHTML(group.entries.length)} veiksmai • ${escapeHTML(last.note || "")}</span></div><div style="text-align:right"><strong>${group.total >= 0 ? "+" : ""}${moneyFmt(Math.abs(group.total))}</strong><span>${escapeHTML(last.date || "")}</span></div></div>`;
        })
        .join("")
    : '<div class="emptyState">Skolų dar nėra.</div>';
  const txDate = document.getElementById("financeTxDate");
  const debtDate = document.getElementById("debtDate");
  if (txDate && !txDate.value) txDate.value = todayISO();
  if (debtDate && !debtDate.value) debtDate.value = todayISO();
}
async function render() {
  ensureMonthlyCycle();
  document.documentElement.setAttribute("data-theme", state.theme);
  document.getElementById("themeToggle").classList.toggle("on", state.theme === "light");
  document.getElementById("soundToggle").classList.toggle("on", state.sound);
  document.getElementById("vibrateToggle").classList.toggle("on", state.vibrate);
  ensureAccounting();
  const settingsAccountantEmail = document.getElementById("settingsAccountantEmail");
  if (settingsAccountantEmail && document.activeElement !== settingsAccountantEmail) {
    settingsAccountantEmail.value = state.accounting.email || "info@visureigiai.lt";
  }
  renderSecuritySettings();
  state.ui = state.ui || {};
  document.getElementById("menu-history").classList.toggle("open", !!state.ui.menuHistoryOpen);
  renderCompanyHome();
  renderCustomers();
  renderAccountingCenter();
  const historyOpen = !!state.ui?.historyOpen;
  const historyRoot = document.getElementById("historyRoot");
  const historyBodyEl = document.getElementById("historyBody");
  const historyChevEl = document.getElementById("historyChev");
  const historyHintEl = document.getElementById("historyHint");
  if (historyBodyEl) historyBodyEl.classList.toggle("open", historyOpen);
  if (historyChevEl) historyChevEl.textContent = historyOpen ? "▾" : "▸";
  if (historyHintEl) historyHintEl.textContent = historyOpen ? "Paslėpti istoriją" : "Rodyti istoriją";
  if (historyRoot) {
    historyRoot.innerHTML = historyOpen
      ? (state.history.length
          ? state.history
          : [{ title: "Pradėk žaidimą", desc: "Atlik pirmą užduotį", icon: "🎮", time: nowLabel() }]
        )
          .map(
            item =>
              `\n        <div class="historyItem">\n          <div class="histIcon">${item.icon}</div>\n          <div>\n            <strong>${escapeHTML(item.title)}</strong>\n            <span>${escapeHTML(item.desc)}</span>\n            <span style="font-size:11px;opacity:.78">${escapeHTML(item.time)}</span>\n          </div>\n        </div>\n      `
          )
          .join("")
      : "";
  }
  ensurePermanentHistory();
  const hFrom = document.getElementById("historyFromDate");
  const hTo = document.getElementById("historyToDate");
  const ph = document.getElementById("permanentHistoryRoot");
  if (ph) {
    const from = hFrom?.value || "",
      to = hTo?.value || "";
    const entries = (state.historyLog || []).filter(x => {
      const d = x.date || todayISO();
      return (!from || d >= from) && (!to || d <= to);
    });
    if (!entries.length)
      ph.innerHTML = '<div class="historyEmpty">Šiuo laikotarpiu istorijos įrašų nėra.</div>';
    else {
      const groups = {};
      entries.forEach(x => {
        const d = x.date || todayISO();
        (groups[d] ||= []).push(x);
      });
      ph.innerHTML = Object.keys(groups)
        .sort()
        .reverse()
        .map(d => {
          const dd = parseISODateLocal(d);
          const day = dd
            ? dd.toLocaleDateString("lt-LT", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })
            : d;
          return `<section class="historyDayBlock"><div class="historyDayHead"><strong>${escapeHTML(day)}</strong><span>${groups[d].length} įraš.</span></div><div>${groups[
            d
          ]
            .map(x => {
              const link =
                x.link?.kind && x.link?.id
                  ? `<button type="button" class="historyProLink" data-history-kind="${escapeHTML(x.link.kind)}" data-history-id="${escapeHTML(x.link.id)}">↗ ${escapeHTML(x.link.label || "Atidaryti")}</button>`
                  : "";
              return `<article class="historyProEntry"><div class="historyProIcon">${escapeHTML(x.icon || "⚡")}</div><div class="historyProMain"><strong>${escapeHTML(x.title || "Veiksmas")}</strong><p>${escapeHTML(x.desc || "")}</p>${link}</div><time class="historyProTime">${escapeHTML(x.time || "")}</time></article>`;
            })
            .join("")}</div></section>`;
        })
        .join("");
    }
    ph.querySelectorAll("[data-history-kind]").forEach(
      btn =>
        (btn.onclick = () => {
          if (btn.dataset.historyKind === "car") openCar(btn.dataset.historyId);
          else if (btn.dataset.historyKind === "lead") openGarageLeadSheet(btn.dataset.historyId);
        })
    );
  }
  ensureMonthlyCycle();
  ensureFinanceCollections();
  const activeCars = state.cars.filter(car => car.status !== "parduotas");
  const soldCars = state.cars.filter(car => car.status === "parduotas");
  document.getElementById("carCount").textContent =
    `${activeCars.length} aktyvūs / ${soldCars.length} parduoti`;
  document.getElementById("activeCarCount").textContent = `${activeCars.length} auto`;
  document.getElementById("soldCarCount").textContent = soldCars.length;
  document.getElementById("soldCarCountLabel").textContent = `${soldCars.length} auto`;
  const soldCarsPanel = document.getElementById("soldCarsPanel");
  if (soldCarsPanel) soldCarsPanel.style.display = state.ui?.soldCarsOpen ? "block" : "none";
  const garageMenuBadge = document.getElementById("garageMenuBadge");
  if (garageMenuBadge)
    garageMenuBadge.textContent = `${activeCars.length} aktyvių / ${soldCars.length} parduotų`;
  const garageTaskGroups = state.ui?.garageTaskGroups || { autos: false, custom: false };
  document.getElementById("garageAutosBody")?.classList.toggle("open", !!garageTaskGroups.autos);
  document.getElementById("garageCustomBody")?.classList.toggle("open", !!garageTaskGroups.custom);
  const garageCustomActive = state.garageTasks || [];
  const autoTaskCount = activeCars.reduce(
    (sum, car) => sum + (car.checklist || []).filter(item => !item.done).length,
    0
  );
  const autoTaskToday = activeCars.reduce(
    (sum, car) =>
      sum + (car.checklist || []).filter(item => !item.done && item.dueDate === todayISO()).length,
    0
  );
  const customTaskCount = garageCustomActive.filter(t => !t.done).length;
  const customTaskToday = garageCustomActive.filter(t => !t.done && t.dueDate === todayISO()).length;
  document.getElementById("garageTaskSummary").textContent =
    `${autoTaskCount} laukia • ${customTaskCount} kitos`;
  const autoCountEl = document.getElementById("garageAutoTaskCountBadge");
  if (autoCountEl) autoCountEl.textContent = autoTaskCount;
  const autoTodayEl = document.getElementById("garageAutoTodayBadge");
  if (autoTodayEl) {
    autoTodayEl.textContent = autoTaskToday;
    autoTodayEl.style.display = autoTaskToday ? "inline-flex" : "none";
  }
  const customCountEl = document.getElementById("garageCustomTaskCountBadge");
  if (customCountEl) customCountEl.textContent = customTaskCount;
  const customTodayEl = document.getElementById("garageCustomTodayBadge");
  if (customTodayEl) {
    customTodayEl.textContent = customTaskToday;
    customTodayEl.style.display = customTaskToday ? "inline-flex" : "none";
  }
  const autoTasksRoot = document.getElementById("garageAutoTasksRoot");
  if (autoTasksRoot) {
    const carsWithPersonalTasks = activeCars.filter(car => (car.checklist || []).length > 0);
    autoTasksRoot.innerHTML = carsWithPersonalTasks.length
      ? carsWithPersonalTasks
          .map(
            car =>
              `\n        <div class="garageCarTaskCard">\n          <div class="garageCarTaskHead">\n            <div>\n              <strong>${escapeHTML(car.name)}</strong>\n              <span>${carDoneCount(car)}/${car.checklist.length} atlikta • ${car.status === "paruoštas" ? "paruoštas pardavimui" : car.status === "beveik paruoštas" ? "beveik paruoštas" : "rengiamas"}</span>\n            </div>\n            <button class="btn secondary" type="button" data-open-car="${car.id}" style="padding:10px 12px;border-radius:14px;font-size:12px">Atidaryti</button>\n          </div>\n          <div class="taskList">\n            ${(
                car.checklist || []
              )
                .slice()
                .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"))
                .map(item => {
                  const checked = !!item.done;
                  return `\n                <div class="listItem" style="align-items:flex-start">\n                  <label style="align-items:flex-start">\n                    <input type="checkbox" ${checked ? "checked" : ""} ${checked ? "disabled" : ""} data-garage-car="${car.id}" data-garage-item="${item.id}" />\n                    <div>\n                      <strong>${escapeHTML(item.name)}</strong>\n                      <span class="garageTaskKindLabel">Auto užduotis</span>\n                      <div class="small">Išlaidos ${moneyFmt(item.expense || 0)}</div>\n                    </div>\n                  </label>\n                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">\n                    <span class="badge ${checked ? "good" : "info"}">${checked ? "Atlikta" : "Laukiama"}</span>\n                    <input class="input" style="width:104px;padding:9px 10px;border-radius:12px;font-size:12px" type="number" min="0" step="0.01" ${checked ? "disabled" : ""} value="${Number(item.expense || 0) || ""}" data-garage-expense="${car.id}:${item.id}" placeholder="€" />\n                  </div>\n                </div>\n              `;
                })
                .join("")}\n          </div>\n        </div>\n      `
          )
          .join("")
      : "";
    autoTasksRoot.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.onchange = async () => {
        const carId = cb.dataset.garageCar;
        const itemId = cb.dataset.garageItem;
        const car = state.cars.find(c => c.id === carId);
        const item = car?.checklist.find(i => i.id === itemId);
        if (!car || !item || item.done) return;
        const expenseInput = autoTasksRoot.querySelector(`[data-garage-expense="${carId}:${itemId}"]`);
        const expense = Math.max(0, Number(expenseInput?.value || 0));
        if (expense > 0) {
          cb.checked = false;
          openCarTaskReceiptSheetV24(car, item, expense);
          return;
        }
        await completeCarTaskWithExpenseV24(car, item, 0, []);
        saveState();
        render();
        openCar(carId);
      };
    });
    autoTasksRoot
      .querySelectorAll("[data-open-car]")
      .forEach(btn => (btn.onclick = () => openCar(btn.dataset.openCar)));
  }
  const garageCustomRoot = document.getElementById("garageCustomTasksRoot");
  if (garageCustomRoot) {
    garageCustomRoot.innerHTML = garageCustomActive.length
      ? garageCustomActive
          .slice()
          .sort(
            (a, b) =>
              Number(!!a.done) - Number(!!b.done) ||
              (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
              (b.createdAt || "").localeCompare(a.createdAt || "")
          )
          .map(
            task =>
              `\n        <div class="taskCard ${task.done ? "done" : ""}">\n          <div class="check">${task.done ? "✓" : ""}</div>\n          <div class="taskMain">\n            <strong>${escapeHTML(task.title)}</strong>\n            <div class="taskMeta">\n              <span class="garageTaskKindLabel">Kita užduotis</span>\n              <span>${task.done ? `Atlikta ${escapeHTML(task.completedAt || "")}` : `Sukurta ${escapeHTML(task.createdAt || "")}`}</span>\n              ${task.dueDate ? taskDueMarkup(task.dueDate) : ""}\n            </div>\n          </div>\n          <div class="rewardPills">\n\n            <div class="coins">${task.done ? "Atlikta" : "Laukiama"}</div>\n          </div>\n          <div style="display:flex;flex-direction:column;gap:8px;margin-left:10px">\n            <button class="smallBtn" data-garage-task-complete="${task.id}" ${task.done ? "disabled" : ""}>✓</button>\n            <button class="smallBtn danger" data-garage-task-delete="${task.id}">✕</button>\n          </div>\n        </div>\n      `
          )
          .join("")
      : `<div class="emptyState" style="margin:0 16px 16px"></div>`;
    garageCustomRoot.querySelectorAll("[data-garage-task-complete]").forEach(btn => {
      btn.onclick = () => completeGarageTask(btn.dataset.garageTaskComplete);
    });
    garageCustomRoot.querySelectorAll("[data-garage-task-delete]").forEach(btn => {
      btn.onclick = () => deleteGarageTask(btn.dataset.garageTaskDelete);
    });
  }
  document.getElementById("monthlyProfitValue").textContent = moneyFmt(state.finances.monthlyNetProfit);
  document.getElementById("monthlyProfitFill").style.width =
    `${clamp((state.finances.monthlyNetProfit / 1e4) * 100, 0, 100)}%`;
  document.getElementById("activeCarGrid").innerHTML = activeCars.length
    ? activeCars
        .map(car => {
          const expenses = carChecklistExpenses(car);
          const target = Number(car.askingPrice || 0);
          const src = photoUrlCache[car.imageSrc] || car.imageSrc || "";
          return `\n        <article class="carListCard garageRefCarCard" data-open-car="${car.id}" role="button" tabindex="0">\n          <div class="garageRefCarMain">\n            <div class="carListPhoto garageRefCarPhoto">\n              ${src ? `<img src="${src}" alt="${escapeHTML(car.name)}" loading="lazy">` : `<div class="carListNoPhoto">🚗</div>`}\n            </div>\n            <div class="carListInfo garageRefCarInfo">\n              <div class="carListTitle">${escapeHTML(car.name)}</div>\n              <div class="vehicleStatusRow cardStatusRow garageRefStatuses">${vehicleStatusChips(car)}</div>\n              <div class="carListFacts garageRefFacts">\n                <div><small>Pirkta</small><strong>${moneyFmt(car.buyPrice)}</strong></div>\n                <div><small>Išlaidos</small><strong>${moneyFmt(expenses)}</strong></div>\n                <div><small>Tikslas</small><strong>${target > 0 ? moneyFmt(target) : "—"}</strong></div>\n              </div>\n            </div>\n          </div>\n          <div class="garageRefOpen">Atidaryti <span>›</span></div>\n        </article>`;
        })
        .join("")
    : `<div class="emptyState">Kol kas nėra aktyvių automobilių.</div>`;
  document.getElementById("soldCarGrid").innerHTML = soldCars.length
    ? soldCars
        .map(car => {
          const profit = car.netProfit != null ? Number(car.netProfit || 0) : carNetProfit(car);
          const totalCost = carTotalCost(car);
          const soldPrice = Number(car.soldPrice || 0);
          const src = photoUrlCache[car.imageSrc] || car.imageSrc || "";
          return `\n        <article class="carListCard sold garageRefCarCard garageRefSoldCard" data-open-car="${car.id}" role="button" tabindex="0">\n          <div class="garageRefCarMain">\n            <div class="carListPhoto garageRefCarPhoto">\n              ${src ? `<img src="${src}" alt="${escapeHTML(car.name)}" loading="lazy">` : `<div class="carListNoPhoto">🚗</div>`}\n              <span class="carListProfit ${profit >= 0 ? "positive" : "negative"}">${profit >= 0 ? "+" : ""}${moneyFmt(profit)}</span>\n            </div>\n            <div class="carListInfo garageRefCarInfo">\n              <div class="garageRefSoldTitle"><div class="carListTitle">${escapeHTML(car.name)}</div><span class="carListDate">${escapeHTML(car.soldDateISO || car.soldAt || "—")}</span></div>\n              <div class="cardRecommendation garageRefRecommendation"><strong>${escapeHTML(carRecommendation(car).text)}</strong></div>\n              <div class="vehicleStatusRow cardStatusRow garageRefStatuses">${vehicleStatusChips(car)}</div>\n              <div class="carListFacts garageRefFacts soldFacts">\n                <div><small>Savikaina</small><strong>${moneyFmt(totalCost)}</strong></div>\n                <div><small>Parduota</small><strong>${moneyFmt(soldPrice)}</strong></div>\n                <div><small>Marža</small><strong class="${profit >= 0 ? "positiveText" : "negativeText"}">${profit >= 0 ? "+" : ""}${moneyFmt(profit)}</strong></div>\n              </div>\n            </div>\n          </div>\n          <div class="garageRefOpen">Atidaryti <span>›</span></div>\n        </article>`;
        })
        .join("")
    : `<div class="emptyState">Dar nėra parduotų automobilių.</div>`;
  document.querySelectorAll("#activeCarGrid [data-open-car], #soldCarGrid [data-open-car]").forEach(el => {
    el.onclick = () => openCar(el.dataset.openCar);
    el.onkeydown = e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCar(el.dataset.openCar);
      }
    };
  });
  const leadRoot = document.getElementById("garageLeadRoot");
  if (leadRoot) {
    const leads = Array.isArray(state.leadVariants) ? state.leadVariants : [];
    const countEl = document.getElementById("garageLeadCount");
    if (countEl) countEl.textContent = `${leads.length} ${leads.length === 1 ? "variantas" : "variantai"}`;
    leadRoot.innerHTML = leads.length
      ? leads
          .map(lead => {
            const photos = Array.isArray(lead.photos) ? lead.photos.filter(Boolean) : [];
            const raw = photos[0] || lead.imageSrc || "";
            const mainPhoto = raw ? photoUrlCache[raw] || raw : "";
            const title = `${lead.make || ""} ${lead.model || ""}`.trim() || "Neįvardintas variantas";
            const sellerPrice = Number(lead.initialPrice || 0);
            const ourPrice = Number(lead.targetPrice || lead.initialPrice || 0);
            const potential = leadPotentialProfit(lead);
            const phone = String(lead.phone || "").trim();
            const telHref = phone ? `tel:${phone.replace(/(?!^\+)\D/g, "")}` : "";
            return `\n          <article class="leadListCard garageVariantCard" data-open-lead-card="${lead.id}" role="button" tabindex="0">\n            <div class="garageVariantMain">\n              <div class="leadListPhoto garageVariantPhoto">\n                ${mainPhoto ? `<img src="${mainPhoto}" alt="${escapeHTML(title)}" loading="lazy">` : `<div class="leadNoPhoto">📷<span>Nėra foto</span></div>`}\n              </div>\n              <div class="leadListInfo garageVariantInfo">\n                <div class="garageVariantTitleRow">\n                  <div class="leadListTitle">${escapeHTML(title)}</div>\n                  ${lead.year ? `<span class="garageVariantYear">${escapeHTML(String(lead.year))}</span>` : ""}\n                </div>\n                <div class="cardRecommendation garageVariantRecommendation">\n                  <strong>${escapeHTML(leadRecommendation(lead).text)}</strong>\n                </div>\n                <div class="garageVariantChips">\n                  ${lead.city ? `<span>${escapeHTML(lead.city)}</span>` : ""}\n                  <span>${escapeHTML(garageLeadDaysText(lead))}</span>\n                  <span>📷 ${photos.length}</span>\n                </div>\n                <div class="garageVariantFacts">\n                  <div><small>Pardavėjo</small><strong>${sellerPrice ? moneyFmt(sellerPrice) : "—"}</strong></div>\n                  <div><small>Mūsų kaina</small><strong>${ourPrice ? moneyFmt(ourPrice) : "—"}</strong></div>\n                  <div><small>Potencialas</small><strong class="${potential != null && potential >= 0 ? "positiveText" : potential != null ? "negativeText" : ""}">${potential != null ? (potential >= 0 ? "+" : "") + moneyFmt(potential) : "—"}</strong></div>\n                </div>\n              </div>\n            </div>\n            <div class="garageVariantFooter">\n              ${phone ? `<a class="leadCallBtn garageVariantCall" href="${telHref}" data-lead-call="${lead.id}">📞 Skambinti</a>` : `<span class="garageVariantNoPhone"></span>`}\n              <span class="garageRefOpen garageVariantOpen">Atidaryti <span>›</span></span>\n            </div>\n          </article>`;
          })
          .join("")
      : `<div class="emptyState">Kol kas nėra įkeltų variantų.</div>`;
    leadRoot.querySelectorAll("[data-open-lead-card]").forEach(card => {
      card.onclick = e => {
        if (e.target.closest("[data-lead-call]")) return;
        openGarageLeadSheet(card.dataset.openLeadCard);
      };
      card.onkeydown = e => {
        if ((e.key === "Enter" || e.key === " ") && !e.target.closest("[data-lead-call]")) {
          e.preventDefault();
          openGarageLeadSheet(card.dataset.openLeadCard);
        }
      };
    });
    leadRoot.querySelectorAll("[data-lead-call]").forEach(link => {
      link.onclick = e => {
        e.stopPropagation();
        const id = link.dataset.leadCall;
        callGarageLead(id, false);
      };
      link.onkeydown = e => e.stopPropagation();
    });
    leadRoot.querySelectorAll("[data-lead-call]").forEach(link => {
      link.onclick = e => {
        const lead = state.leadVariants.find(v => v.id === link.dataset.leadCall);
        if (!lead || !String(lead.phone || "").trim()) {
          e.preventDefault();
          toast("Šiam variantui nėra telefono numerio", "📵");
          return;
        }
        lead.calls = Number(lead.calls || 0) + 1;
        lead.lastCalledAt = nowLabel();
        lead.updatedAt = nowLabel();
        lead.nextCallDate = addDaysISO(todayISO(), lead.followUpDays || 0);
        addHistory("Skambutis variantui", `${lead.make} ${lead.model}`, "📞");
        saveState();
      };
    });
  }
  const allowedViews = new Set([
    "home",
    "garage",
    "garage-what",
    "garage-stats",
    "finance",
    "menu",
    "customers",
    "settings",
    "accounting"
  ]);
  if (state.selectedView === "customers") {
    state.selectedView = "garage";
    state.ui.garageInlineExpanded = "contacts";
  }
  if (!allowedViews.has(state.selectedView) || state.selectedView === "home") state.selectedView = "garage";
  const navActiveView =
    state.selectedView === "garage-what" ||
    state.selectedView === "garage-leads" ||
    state.selectedView === "garage-stats"
      ? "garage"
      : state.selectedView === "settings" ||
          state.selectedView === "customers" ||
          state.selectedView === "finance"
        ? "menu"
        : state.selectedView;
  document
    .querySelectorAll(".navBtn")
    .forEach(btn => btn.classList.toggle("active", btn.dataset.view === navActiveView));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const activeView =
    document.getElementById(`view-${state.selectedView}`) || document.getElementById("view-garage");
  activeView.classList.add("active");
  const contactsInline = document.getElementById("view-customers");
  if (contactsInline?.classList.contains("garageInlinePanel")) {
    const contactsOpen = state.selectedView === "garage" && state.ui.garageInlineExpanded === "contacts";
    contactsInline.classList.toggle("garageInlineOpen", contactsOpen);
    document
      .querySelector("#view-garage [data-garage-action=contacts]")
      ?.setAttribute("aria-expanded", String(contactsOpen));
  }
  const menuShop = document.getElementById("menu-shop");
  const menuStats = document.getElementById("menu-stats");
  if (menuShop) menuShop.style.display = state.ui.menuSections.shop ? "" : "none";
  if (menuStats) menuStats.style.display = state.ui.menuSections.stats ? "" : "none";
  renderGarageStatsPage();
  renderFinancePage();
  saveState();
}
