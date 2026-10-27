// UI produkto sistema (didelis vidinis IIFE): Garažo / Buhalterijos išvaizdos perrašymai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

(function () {
  const svg = {
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17"/></svg>`,
    wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7.5h16v11H4z"/><path d="M6 7.5V5.8A1.8 1.8 0 0 1 7.8 4h8.7"/><path d="M15.5 12h4.5v3h-4.5a1.5 1.5 0 0 1 0-3z"/></svg>`,
    hero: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3" width="12" height="18" rx="2"/><path d="M7 7h6M7 11h4M7 15h3"/><path d="M18 9h2M19 8v6M16.7 11.5h4.6M17.2 15.5c.5.6 1.1.9 1.8.9.8 0 1.4-.4 1.8-1"/></svg>`,
    pp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 8h7M8 12h4M8 16h3"/><path d="m14 15 1.6 1.6L19 13.2"/></svg>`,
    reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 20V13h3v7zM10.5 20V8h3v12zM17 20V4h3v16z"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></svg>`,
    up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 17 12 10l4 4 4-6"/><path d="M16 8h4v4"/></svg>`,
    down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 7 7 7 4-4 4 6"/><path d="M16 16h4v-4"/></svg>`,
    coins: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="9" cy="6" rx="5" ry="2.5"/><path d="M4 6v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6M4 10v4c0 1.4 2.2 2.5 5 2.5 1 0 2-.2 2.7-.5"/><ellipse cx="16" cy="15" rx="4" ry="2"/><path d="M12 15v4c0 1.1 1.8 2 4 2s4-.9 4-2v-4"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M9.5 12h5M9.5 15.5h5"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v6M12 17h.01"/></svg>`,
    fuel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4h8v16H6zM7.5 7h5"/><path d="M14 8h2l2 2v7.5a1.5 1.5 0 0 0 3 0V9l-2-2"/></svg>`,
    wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14.5 5.5a4 4 0 0 0-5.2 5.2L4 16l4 4 5.3-5.3a4 4 0 0 0 5.2-5.2l-3 3-4-4z"/></svg>`,
    cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9h.01M18 15h.01"/></svg>`
  };
  function brandLogo() {
    return `<svg class="accountingRefLogo" viewBox="0 0 40 28" fill="none" aria-hidden="true"><path d="M2 24 15 9l6 7 5-6 12 14" stroke="#c19a5b" stroke-width="3.1" stroke-linecap="square" stroke-linejoin="miter"/><path d="m10 24 11-12 10 12" stroke="#c19a5b" stroke-width="2.2" opacity=".68"/></svg>`;
  }
  function refDate() {
    try {
      return typeof homeReferenceDateV12 === "function"
        ? homeReferenceDateV12()
        : new Date().toLocaleDateString("lt-LT", { month: "2-digit", day: "2-digit" });
    } catch (e) {
      return "";
    }
  }
  function carMedia(c) {
    if (!c) return "";
    const raw = c.imageSrc || (c.photos || [])[0] || "";
    return raw ? (typeof photoUrlCache !== "undefined" && photoUrlCache[raw]) || raw : "";
  }
  function monthData() {
    const range =
      typeof accountingRangeV8 === "function"
        ? accountingRangeV8("month")
        : { from: currentMonthKey() + "-01", to: todayISO() };
    const d =
      typeof accountingReportDataV8 === "function"
        ? accountingReportDataV8(range)
        : { sales: 0, income: 0, purchases: 0, expense: 0, cars: [], tx: [] };
    const income = Number(d.sales || 0) + Number(d.income || 0),
      expense = Number(d.purchases || 0) + Number(d.expense || 0),
      profit = income - expense;
    const docCount =
      (d.cars || []).reduce((n, c) => n + (c.documents || []).length, 0) +
      (d.tx || []).reduce((n, t) => n + (t.attachments || []).length, 0);
    return { range, d, income, expense, profit, docCount };
  }
  function waitingCars() {
    ensureAccounting();
    const map = new Map();
    for (const id of state.accounting.queue || []) {
      const c = (state.cars || []).find(x => x.id === id && x.status === "parduotas");
      if (c) map.set(c.id, c);
    }
    for (const c of state.cars || []) {
      if (c.status === "parduotas" && !c.accountingSharedAt) map.set(c.id, c);
    }
    return [...map.values()].sort((a, b) =>
      String(b.soldDateISO || "").localeCompare(String(a.soldDateISO || ""))
    );
  }
  function waitRow(c) {
    const media = carMedia(c),
      docs = (c.documents || []).length,
      hasReceipt = (c.documents || []).some(d => d.kind === "receipt"),
      bad = !hasReceipt;
    return `<button class="accountingRefWait" type="button" data-accounting-ref-car="${escapeHTML(c.id)}"><span class="accountingRefWaitPhoto">${media ? `<img src="${escapeHTML(media)}" alt="">` : "🚗"}</span><span class="accountingRefWaitCopy"><strong>${escapeHTML(c.name || "Automobilis")}</strong><span class="accountingRefWaitStatus ${bad ? "bad" : ""}">${bad ? svg.alert : svg.clock}${bad ? "Trūksta čekio" : "Dokumentai ruošiami"}</span></span><span class="accountingRefWaitPrice">${moneyFmt(Number(c.soldPrice || 0))}</span><span class="accountingRefWaitArrow">›</span></button>`;
  }
  function opIcon(tx) {
    const s = String(tx.category || tx.title || "").toLowerCase();
    if (s.includes("kuras")) return svg.fuel;
    if (s.includes("servis") || s.includes("remont") || s.includes("detal")) return svg.wrench;
    if (tx.type === "income") return svg.cash;
    return svg.minus;
  }
  function shortDate(v = "") {
    const m = String(v).match(/^\d{4}-(\d{2})-(\d{2})$/);
    return m ? `${m[1]}-${m[2]}` : v;
  }
  function operations() {
    const tx = [...(state.finances?.transactions || [])];
    for (const c of state.cars || []) {
      if (c.status === "parduotas" && c.soldDateISO && Number(c.soldPrice || 0) > 0)
        tx.push({
          id: "sale-" + c.id,
          type: "income",
          amount: Number(c.soldPrice || 0),
          title: "Pardavimas",
          category: "Pardavimas",
          date: c.soldDateISO,
          carId: c.id,
          createdAt: c.soldAt || ""
        });
    }
    return tx
      .sort(
        (a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")) ||
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      )
      .slice(0, 3);
  }
  function workspace(panel, queued) {
    if (panel === "pp") return accountingPpChooserV3();
    if (panel === "reports") return accountingReportsV8();
    if (panel === "expense" || panel === "income") return accountingMoneyFormV8(panel);
    if (panel === "queue")
      return `<section class="accountingWorkspace show"><div class="accountingWorkspaceHead"><h3>Dokumentai buhalterei</h3></div><div class="accountingCleanRows">${queued.map(c => `<div class="accountingCleanRow"><button type="button" data-accounting-open-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><span>${(c.documents || []).length} dok.</span></button><button class="accountingCleanRemove" type="button" data-accounting-queue-car="${escapeHTML(c.id)}">×</button></div>`).join("") || '<div class="accountingCleanEmpty">Įrašų nėra</div>'}</div><button class="btn accountingWorkspaceAction" id="accountingWorkspaceSend" type="button" ${queued.length ? "" : "disabled"}>Paruošti ZIP ir teikti</button></section>`;
    return "";
  }
  function action(key, cls, icon, title, panel) {
    return `<button type="button" class="accountingRefAction ${cls} ${panel === key ? "active" : ""}" data-accounting-panel="${key}"><span class="ico">${icon}</span><strong>${title}</strong><span class="arrow">›</span></button>`;
  }
  renderAccountingCenter = function () {
    const root = document.getElementById("accountingRoot");
    if (!root) return;
    ensureAccounting();
    ensureAccountingTransactionsV8();
    state.ui = state.ui || {};
    const panel = state.ui.accountingPanel || "",
      queued = (state.accounting.queue || [])
        .map(id => (state.cars || []).find(c => c.id === id && c.status === "parduotas"))
        .filter(Boolean),
      wait = waitingCars(),
      txs = operations(),
      balance = Number(financeTotals().budget || 0);
    const ws = workspace(panel, queued);
    root.innerHTML = `<div class="accountingRefPage">\n      <div class="accountingRefBrandRow"><div class="accountingRefBrand">${brandLogo()}<span>Visureigiai, UAB</span></div><div class="accountingRefDate">${svg.calendar}<span>${escapeHTML(refDate())}</span></div></div>\n      <div class="accountingManagerWrap"><button class="garageRefWhat accountingManagerButton" type="button" data-open-view="garage-what" aria-label="Atidaryti vadybininką">\n        <span class="garageRefWhatIcon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="24" cy="15" r="7"/><path d="M10 39c.9-7.2 5.5-11 14-11s13.1 3.8 14 11"/></svg></span>\n        <strong>Vadybininkas</strong><span class="garageRefWhatArrow" aria-hidden="true">›</span>\n      </button></div>\n      <div class="accountingRefMenu">${action("pp", "pp", svg.pp, "Generuoti PP", panel)}${action("reports", "reports", svg.reports, "Ataskaitos", panel)}${action("expense", "expense", svg.minus, "Pridėti išlaidą", panel)}${action("income", "income", svg.plus, "Pridėti įplauką", panel)}</div>\n      ${ws ? `<div class="accountingRefWorkspace">${ws}<button class="accountingWorkspaceClose appCloseAction" type="button" data-accounting-close aria-label="Uždaryti išskleistą buhalterijos skiltį">Uždaryti</button></div>` : ""}\n      <section class="section accountingRefPendingSection">\n        <div class="sectionHead"><h2 class="accountingRefSectionTitle">Laukia pateikimo</h2><span class="accountingRequiredCountV1">0</span></div>\n        <div class="accountingRefWaitList">${wait.length ? wait.slice(0, 3).map(waitRow).join("") : '<div class="accountingRefEmpty">Dokumentų pateikimo eilė tuščia</div>'}</div>\n      </section>\n      <div class="accountingRefOpsHead"><h3>Naujausios operacijos</h3><button class="accountingRefAll" type="button" data-accounting-all>Žiūrėti visas <span>›</span></button></div>\n      <div class="accountingRefOps">${txs.length ? txs.map(tx => `<div class="accountingRefOp ${tx.type === "income" ? "income" : "expense"}" ${tx.carId ? `data-accounting-ref-car="${escapeHTML(tx.carId)}"` : ""}><span class="accountingRefOpIcon">${opIcon(tx)}</span><strong>${escapeHTML(tx.category || tx.title || (tx.type === "income" ? "Įplauka" : "Išlaida"))}</strong><span class="accountingRefOpDate">${escapeHTML(shortDate(tx.date || ""))}</span><span class="accountingRefOpAmount">${tx.type === "income" ? "+" : "-"}${moneyFmt(Math.abs(Number(tx.amount || 0)))}</span><span class="accountingRefOpArrow">›</span></div>`).join("") : '<div class="accountingRefEmpty" style="margin:10px 0">Operacijų dar nėra</div>'}</div>\n    </div>`;
    root.querySelector("[data-accounting-close]")?.addEventListener("click", () => {
      state.ui.accountingPanel = "";
      state.ui.accountingPpMode = "";
      state.ui.accountingPpCarId = "";
      saveState();
      renderAccountingCenter();
    });
    root.querySelectorAll("[data-accounting-panel]").forEach(
      b =>
        (b.onclick = () => {
          const next = b.dataset.accountingPanel;
          state.ui.accountingPanel = panel === next ? "" : next;
          if (next !== "pp") {
            state.ui.accountingPpMode = "";
            state.ui.accountingPpCarId = "";
          }
          saveState();
          renderAccountingCenter();
        })
    );
    root.querySelector("[data-accounting-all]")?.addEventListener("click", () => companyGo("finance"));
    root.querySelectorAll("[data-accounting-ref-car]").forEach(b =>
      b.addEventListener("click", () => {
        const id = b.dataset.accountingRefCar;
        if (id) openCar(id);
      })
    );
    root
      .querySelectorAll("[data-accounting-open-car]")
      .forEach(b => (b.onclick = () => openCar(b.dataset.accountingOpenCar)));
    root
      .querySelectorAll("[data-accounting-queue-car]")
      .forEach(b => (b.onclick = () => toggleAccountingQueue(b.dataset.accountingQueueCar)));
    document
      .getElementById("accountingWorkspaceSend")
      ?.addEventListener("click", () => shareAccountingCars(queued, "queue"));
    document.getElementById("saveAccountantEmail")?.addEventListener("click", () => {
      const input = document.getElementById("accountantEmail"),
        value = (input?.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        toast("Patikrink el. pašto adresą", "!");
        return;
      }
      state.accounting.email = value;
      saveState();
      toast("El. paštas išsaugotas", "✓");
    });
    root.querySelectorAll("[data-report-mode]").forEach(
      b =>
        (b.onclick = () => {
          state.ui.accountingReportMode = b.dataset.reportMode;
          saveState();
          renderAccountingCenter();
        })
    );
    const from = document.getElementById("accountingReportFrom"),
      to = document.getElementById("accountingReportTo");
    if (from)
      from.onchange = () => {
        state.ui.accountingReportFrom = from.value;
        saveState();
        renderAccountingCenter();
      };
    if (to)
      to.onchange = () => {
        state.ui.accountingReportTo = to.value;
        saveState();
        renderAccountingCenter();
      };
    document.getElementById("accountingBuildReportV8")?.addEventListener("click", () => {
      const r = accountingRangeV8(state.ui.accountingReportMode || "month");
      if (!r.from || !r.to || r.from > r.to) {
        toast("Patikrink laikotarpį", "!");
        return;
      }
      shareAccountingReportV8(r);
    });
    const moneyForm = document.getElementById("accountingMoneyFormV8");
    if (moneyForm)
      moneyForm.onsubmit = e => {
        e.preventDefault();
        saveAccountingMoneyV8(panel);
      };
    const moneyFiles = document.getElementById("accountingMoneyFiles");
    if (moneyFiles)
      moneyFiles.onchange = () => {
        const n = moneyFiles.files?.length || 0,
          c = document.getElementById("accountingMoneyFileCount");
        if (c) c.textContent = n ? String(n) : "";
      };
    root.querySelectorAll("[data-pp-source-mode]").forEach(
      b =>
        (b.onclick = () => {
          state.ui.accountingPpMode = b.dataset.ppSourceMode;
          state.ui.accountingPpCarId = "";
          saveState();
          renderAccountingCenter();
        })
    );
    root.querySelectorAll("[data-pp-source-back]").forEach(
      b =>
        (b.onclick = () => {
          state.ui.accountingPpMode = "";
          state.ui.accountingPpCarId = "";
          saveState();
          renderAccountingCenter();
        })
    );
    root.querySelectorAll("[data-pp-pick-car]").forEach(
      b =>
        (b.onclick = () => {
          state.ui.accountingPpCarId = b.dataset.ppPickCar;
          saveState();
          renderAccountingCenter();
        })
    );
    if (panel === "pp" && state.ui.accountingPpMode) {
      bindPpGenerator(state.ui.accountingPpCarId || null);
      if (state.ui.accountingPpCarId)
        ppPrefillFromCar(state.cars.find(c => c.id === state.ui.accountingPpCarId));
    }
    try {
      if (typeof homeReferenceNavV12 === "function") homeReferenceNavV12();
    } catch (e) {}
  };
  function accountingRequiredDocumentsV1() {
    ensureAccountingTransactionsV8();
    const result = [],
      cars = state.cars || [],
      transactions = state.finances?.transactions || [];
    const add = item => result.push(item);
    cars.forEach(car => {
      (workCenterMissingDocsV30(car) || []).forEach(doc =>
        add({
          key: `car:${car.id}:${doc.kind}`,
          carId: car.id,
          kind: doc.kind,
          label: doc.kind === "purchase" ? "Pirkimo sutartis" : "Registracijos dokumentas",
          action: `Pridėti ${doc.kind === "purchase" ? "pirkimo sutartį" : "registracijos dokumentą"}`,
          title: `Pridėti ${doc.kind === "purchase" ? "pirkimo sutartį" : "registracijos dokumentą"}`,
          detail: "Automobilio dokumentai",
          entity: car.name || "Automobilis",
          source: "car"
        })
      );
      if (car.status === "parduotas" && !hasCarDocument(car, "sale"))
        add({
          key: `car:${car.id}:sale`,
          carId: car.id,
          kind: "sale",
          label: "Pardavimo sutartis",
          action: "Pridėti pardavimo sutartį",
          title: "Pridėti pardavimo sutartį",
          detail: "Automobilio dokumentai",
          entity: car.name || "Automobilis",
          source: "car"
        });
      (car.checklist || []).forEach(task => {
        if (!task.done || Number(task.expense || 0) <= 0 || (task.receipts || []).length) return;
        const linked = transactions.some(
          tx =>
            tx.source === "carTask" &&
            tx.carId === car.id &&
            (tx.linkedTaskId === task.id || tx.id === task.expenseTxId)
        );
        if (linked) return;
        add({
          key: `task:${car.id}:${task.id}`,
          carId: car.id,
          taskId: task.id,
          kind: "receipt",
          kindOptions: ["receipt", "invoice"],
          label: "Sąskaita faktūra arba čekis",
          action: "Pridėti sąskaitą arba čekį",
          title: "Pridėti užduoties dokumentą",
          detail: task.name || "Automobilio užduoties išlaida",
          entity: car.name || "Automobilis",
          source: "task"
        });
      });
    });
    transactions
      .filter(tx => tx.type === "expense")
      .forEach(tx => {
        const car = cars.find(item => item.id === tx.carId),
          docs = car?.documents || [];
        const linkedIds = new Set(tx.accountingDocumentIds || []);
        const already =
          (tx.attachments || []).length > 0 ||
          docs.some(doc => linkedIds.has(doc.id) || doc.linkedTransactionId === tx.id);
        if (already) return;
        add({
          key: `tx:${tx.id}`,
          txId: tx.id,
          carId: car?.id || "",
          kind: "receipt",
          kindOptions: ["receipt", "invoice"],
          label: "Sąskaita faktūra arba čekis",
          action: "Pridėti sąskaitą arba čekį",
          title: "Pridėti išlaidų dokumentą",
          detail: tx.category || tx.title || "Išlaida",
          entity: car?.name || "Įmonės išlaida",
          source: "transaction"
        });
      });
    const unique = new Map();
    result.forEach(item => {
      if (!unique.has(item.key)) unique.set(item.key, item);
    });
    return [...unique.values()];
  }
  function accountingRequiredDocByKeyV1(key) {
    return accountingRequiredDocumentsV1().find(item => item.key === key) || null;
  }
  function accountingOpenRequiredDocV1(key) {
    const item = accountingRequiredDocByKeyV1(key);
    if (!item) {
      renderAccountingCenter();
      return;
    }
    const car = (state.cars || []).find(x => x.id === item.carId);
    const options = item.kindOptions || [item.kind],
      initial = options[0] || item.kind;
    const fixedLabel = DOC_TYPES.find(x => x[0] === initial)?.[1] || "Dokumentas";
    const kindField =
      options.length > 1
        ? `<div class="field accountingRequiredTypeFieldV1"><label for="accountingRequiredKindV1">Dokumento tipas</label><select class="input" id="accountingRequiredKindV1">${options.map(kind => `<option value="${escapeHTML(kind)}">${escapeHTML(DOC_TYPES.find(x => x[0] === kind)?.[1] || "Dokumentas")}</option>`).join("")}</select></div>`
        : "";
    const context = car
      ? item.source === "car"
        ? car.name || "Automobilio dokumentai"
        : `${car.name || "Automobilis"} · ${item.detail || "Išlaidos dokumentas"}`
      : item.detail || item.entity || "Įmonės dokumentas";
    openSheet(
      `<div class="sheetHead accountingRequiredSheetHeadV1"><h3>Pridėti dokumentą</h3><button class="closeBtn" type="button" data-accounting-required-close aria-label="Uždaryti">✕</button></div><form class="accountingRequiredSheetV1" id="accountingRequiredFormV1"><div class="accountingRequiredSummaryV1"><span class="accountingRequiredIconV1">▤</span><div><strong>${escapeHTML(item.label || fixedLabel)}</strong><span>${escapeHTML(context)}</span></div></div>${kindField}<label class="accountingRequiredPickerV1" for="accountingRequiredFilesV1"><span class="accountingRequiredPickerIconV1">＋</span><span><strong>Pasirinkti failą</strong></span><input id="accountingRequiredFilesV1" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple></label><div class="accountingRequiredFileNamesV1" id="accountingRequiredFileNamesV1" aria-live="polite" hidden></div><button class="btn accountingRequiredSaveV1" id="accountingRequiredSaveV1" type="submit">${escapeHTML(item.action || "Pridėti dokumentą")}</button></form>`
    );
    const form = document.getElementById("accountingRequiredFormV1"),
      input = document.getElementById("accountingRequiredFilesV1"),
      names = document.getElementById("accountingRequiredFileNamesV1"),
      close = document.querySelector("[data-accounting-required-close]");
    close?.addEventListener("click", closeSheet);
    input?.addEventListener("change", () => {
      if (names) {
        const files = Array.from(input.files || []);
        names.textContent = files.map(file => file.name).join(" · ");
        names.hidden = !files.length;
      }
    });
    form?.addEventListener("submit", async event => {
      event.preventDefault();
      const files = Array.from(input?.files || []);
      if (!files.length) {
        toast("Pasirink dokumentą", "!");
        return;
      }
      const save = document.getElementById("accountingRequiredSaveV1"),
        kind = document.getElementById("accountingRequiredKindV1")?.value || initial;
      if (save) {
        save.disabled = true;
        save.textContent = "Išsaugoma…";
      }
      const added = [];
      let oldCarDocs = null,
        oldTxAttachments = null,
        oldTxDocIds = null,
        oldTaskReceipts = null;
      try {
        for (const file of files) {
          const blob = await readDocumentFile(file),
            storageKey = await putDocument(blob);
          added.push({
            id: uid(),
            key: storageKey,
            kind,
            name: file.name,
            type: blob.type,
            size: blob.size,
            addedAt: nowLabel(),
            addedDateISO: todayISO()
          });
        }
        const currentCar = (state.cars || []).find(x => x.id === item.carId),
          currentTx = (state.finances?.transactions || []).find(x => x.id === item.txId);
        const task = currentCar?.checklist?.find(x => x.id === item.taskId);
        if (currentCar) {
          oldCarDocs = currentCar.documents;
          currentCar.documents = [
            ...(currentCar.documents || []),
            ...added.map(doc => (currentTx ? { ...doc, linkedTransactionId: currentTx.id } : doc))
          ];
        }
        if (currentTx && currentCar) {
          oldTxDocIds = currentTx.accountingDocumentIds;
          currentTx.accountingDocumentIds = [
            ...new Set([...(currentTx.accountingDocumentIds || []), ...added.map(doc => doc.id)])
          ];
        } else if (currentTx) {
          oldTxAttachments = currentTx.attachments;
          currentTx.attachments = [...(currentTx.attachments || []), ...added];
        }
        if (task) {
          oldTaskReceipts = task.receipts;
          task.receipts = [...(task.receipts || []), ...added];
        }
        if (!saveState()) throw Error("Nepavyko išsaugoti dokumentų.");
        if (currentCar)
          addHistory(
            "Dokumentas pridėtas",
            `${currentCar.name} · ${DOC_TYPES.find(x => x[0] === kind)?.[1] || fixedLabel}`,
            "▤",
            { kind: "car", id: currentCar.id, label: "Atidaryti automobilį" }
          );
        else
          addHistory(
            "Išlaidos dokumentas pridėtas",
            `${item.detail || "Išlaida"} · ${files.length} fail.`,
            "▤"
          );
        saveState();
        closeSheet();
        render();
        toast("Dokumentas pridėtas", "✓");
      } catch (error) {
        const currentCar = (state.cars || []).find(x => x.id === item.carId),
          currentTx = (state.finances?.transactions || []).find(x => x.id === item.txId),
          task = currentCar?.checklist?.find(x => x.id === item.taskId);
        if (currentCar && oldCarDocs !== null) currentCar.documents = oldCarDocs;
        if (currentTx && oldTxAttachments !== null) currentTx.attachments = oldTxAttachments;
        if (currentTx && oldTxDocIds !== null) currentTx.accountingDocumentIds = oldTxDocIds;
        if (task && oldTaskReceipts !== null) task.receipts = oldTaskReceipts;
        await Promise.all(added.map(doc => photoDelete(doc.key).catch(() => {})));
        toast(error.message || "Dokumentų išsaugoti nepavyko", "!");
        if (save) {
          save.disabled = false;
          save.textContent = item.action || "Pridėti dokumentą";
        }
      }
    });
  }
  const __renderAccountingRequiredDocsBaseV1 = renderAccountingCenter;
  renderAccountingCenter = function () {
    __renderAccountingRequiredDocsBaseV1.apply(this, arguments);
    const root = document.getElementById("accountingRoot");
    if (!root) return;
    state.ui = state.ui || {};
    const pending = accountingRequiredDocumentsV1(),
      list = root.querySelector(".accountingRefWaitList"),
      heading = root.querySelector(".accountingRefSectionTitle"),
      countBadge = root.querySelector(".accountingRequiredCountV1");
    if (heading) heading.textContent = "Laukia pateikimo";
    if (countBadge) countBadge.textContent = String(pending.length);
    if (list) {
      list.innerHTML = pending.length
        ? pending
            .map(item => {
              const car = (state.cars || []).find(x => x.id === item.carId),
                raw = car?.imageSrc || (car?.photos || [])[0] || "",
                media = raw ? photoUrlCache[raw] || raw : "",
                isFinancial = item.source === "transaction" || item.source === "task";
              return `<button class="accountingRefWait accountingRequiredRowV1 ${isFinancial ? "financial" : ""}" type="button" data-accounting-required-doc="${escapeHTML(item.key)}" aria-label="${escapeHTML(item.action || item.title)} · ${escapeHTML(item.entity)}"><span class="accountingRefWaitPhoto">${media ? `<img src="${escapeHTML(media)}" alt="">` : "▤"}</span><span class="accountingRefWaitCopy"><strong>${escapeHTML(item.label)}</strong><span class="accountingRefWaitStatus bad">${escapeHTML(item.entity)} · ${escapeHTML(item.detail)}</span></span><span class="accountingRefWaitArrow">›</span></button>`;
            })
            .join("")
        : '<div class="accountingRefEmpty">Šiuo metu visų reikalingų dokumentų eilė sutvarkyta</div>';
      list
        .querySelectorAll("[data-accounting-required-doc]")
        .forEach(button =>
          button.addEventListener("click", () =>
            accountingOpenRequiredDocV1(button.dataset.accountingRequiredDoc)
          )
        );
    }
    const opsHead = root.querySelector(".accountingRefOpsHead"),
      ops = root.querySelector(".accountingRefOps");
    if (opsHead && ops) {
      const details = document.createElement("details");
      details.className = "accountingRefOpsFoldV1";
      details.open = !!state.ui.accountingOpsExpanded;
      const count = ops.querySelectorAll(".accountingRefOp").length,
        summary = document.createElement("summary");
      summary.innerHTML = `<span class="accountingRefOpsFoldIconV1">≡</span><strong>Naujausios operacijos</strong><span class="accountingRefOpsFoldCountV1">${count}</span><span class="accountingRefOpsFoldChevronV1">⌄</span>`;
      const body = document.createElement("div");
      body.className = "accountingRefOpsFoldBodyV1";
      opsHead.querySelector("h3")?.remove();
      const parent = opsHead.parentNode;
      parent.insertBefore(details, opsHead);
      details.append(summary, body);
      body.append(opsHead, ops);
      opsHead.classList.add("accountingRefOpsFoldActionsV1");
      const page = root.querySelector(".accountingRefPage");
      if (page) page.append(details);
      details.addEventListener("toggle", () => {
        state.ui.accountingOpsExpanded = details.open;
        saveState();
      });
    }
  };
  function registrationYearFromTextV31(text = "") {
    const up = ppNormalizeOcr(text);
    const lines = up
      .split("\n")
      .map(x => x.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const label of ["B", "I"]) {
      const raw = ppLineValue(lines, label);
      const m = String(raw || "").match(/\b(19\d{2}|20\d{2})\b/);
      if (m) {
        const y = Number(m[1]);
        if (y >= 1886 && y <= new Date().getFullYear() + 1) return y;
      }
    }
    return null;
  }
  function registrationNormalizeV31(d = {}) {
    return {
      make: String(d.make || "")
        .trim()
        .toUpperCase(),
      model: String(d.model || "")
        .trim()
        .toUpperCase(),
      year: d.year ? Number(d.year) : null,
      vin: String(d.vin || "")
        .trim()
        .toUpperCase(),
      plate: String(d.plate || "")
        .trim()
        .toUpperCase(),
      regDoc: String(d.regDoc || d.registrationDoc || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
    };
  }
  function registrationScoreV31(d = {}) {
    return ["make", "model", "year", "vin", "plate", "regDoc"].reduce((n, k) => n + (d[k] ? 1 : 0), 0);
  }
  async function registrationCertificateScanV31(file, statusEl = null) {
    if (!file) throw Error("Pasirink registracijos liudijimo nuotrauką.");
    if (!String(file.type || "").startsWith("image/"))
      throw Error("Automatiniam nuskaitymui pasirink registracijos liudijimo nuotrauką.");
    const status = txt => {
      if (!statusEl) return;
      statusEl.textContent = txt;
      statusEl.classList?.add("show");
    };
    status("Skaitau registracijos liudijimą…");
    const T = await ppLoadOcr(),
      texts = [];
    const first = await ppPreprocessSmart(file, "contrast");
    const worker = await ppOcrWorker(statusEl);
    if (worker) {
      status("Skaitau dokumentą…");
      const r = await worker.recognize(first);
      texts.push(r?.data?.text || "");
    } else {
      const r = await T.recognize(first, "eng", {
        logger: m => {
          if (m.status === "recognizing text")
            status(`Skaitau dokumentą · ${Math.round((m.progress || 0) * 100)}%`);
        }
      });
      texts.push(r?.data?.text || "");
    }
    let raw = texts.join("\n");
    let parsed = ppParseRegistrationText(raw) || {};
    let data = registrationNormalizeV31({ ...parsed, year: registrationYearFromTextV31(raw) });
    if (registrationScoreV31(data) < 5) {
      status("Tikslinu VIN ir dokumento laukus…");
      const second = await ppPreprocessSmart(file, "binary");
      const r = worker ? await worker.recognize(second) : await T.recognize(second, "eng");
      texts.push(r?.data?.text || "");
      raw = texts.join("\n");
      parsed = ppParseRegistrationText(raw) || {};
      data = registrationNormalizeV31({ ...parsed, year: registrationYearFromTextV31(raw) });
    }
    return data;
  }
  window.__visureigiaiRegistrationScanV31 = registrationCertificateScanV31;
  function registrationFillBlankInputV31(id, value) {
    const el = document.getElementById(id);
    if (!el || value == null || String(value).trim() === "" || String(el.value || "").trim() !== "")
      return false;
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function registrationFillVehicleInputsV31(prefix, data = {}) {
    const filled = [];
    for (const [key, value, label] of [
      ["vin", data.vin, "VIN"],
      ["plate", data.plate, "valst. nr."],
      ["registrationDoc", data.regDoc, "liudijimo nr."],
      ["year", data.year, "metai"],
      ["regMake", data.make, "markė"],
      ["regModel", data.model, "modelis"]
    ]) {
      if (registrationFillBlankInputV31(prefix + key, value)) filled.push(label);
    }
    return filled;
  }
  async function registrationDocumentFromImageV31(file, regNo = "") {
    const blob = await readDocumentFile(file),
      key = await putDocument(blob);
    const ext = blob.type === "image/png" ? ".png" : blob.type === "image/webp" ? ".webp" : ".jpg";
    const clean = String(regNo || "").replace(/[^A-Za-z0-9]/g, "");
    return {
      id: uid(),
      key,
      kind: "registration",
      name: `Registracijos-liudijimas-${clean || todayISO()}${ext}`,
      type: blob.type,
      size: blob.size,
      addedAt: nowLabel(),
      addedDateISO: todayISO()
    };
  }
  function registrationIdentityTextV33(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function registrationIdentityCompactV33(value = "") {
    return registrationIdentityTextV33(value).replace(/\s+/g, "");
  }
  function registrationMakeKeyV33(value = "") {
    const raw = registrationIdentityCompactV33(value);
    const aliases = {
      VW: "VOLKSWAGEN",
      VOLKSWAGEN: "VOLKSWAGEN",
      MERCEDES: "MERCEDES",
      MERCEDESBENZ: "MERCEDES",
      LANDROVER: "LANDROVER",
      ALFAROMEO: "ALFAROMEO",
      SKODA: "SKODA"
    };
    return aliases[raw] || raw;
  }
  function registrationKnownMakeFromNameV33(name = "") {
    const compact = registrationIdentityCompactV33(name);
    const makes = [
      ["MERCEDESBENZ", "MERCEDES"],
      ["LANDROVER", "LANDROVER"],
      ["ALFAROMEO", "ALFAROMEO"],
      ["VOLKSWAGEN", "VOLKSWAGEN"],
      ["MERCEDES", "MERCEDES"],
      ["MITSUBISHI", "MITSUBISHI"],
      ["CHEVROLET", "CHEVROLET"],
      ["CITROEN", "CITROEN"],
      ["HYUNDAI", "HYUNDAI"],
      ["RENAULT", "RENAULT"],
      ["PEUGEOT", "PEUGEOT"],
      ["PORSCHE", "PORSCHE"],
      ["SUBARU", "SUBARU"],
      ["TOYOTA", "TOYOTA"],
      ["NISSAN", "NISSAN"],
      ["SUZUKI", "SUZUKI"],
      ["VOLVO", "VOLVO"],
      ["SKODA", "SKODA"],
      ["OPEL", "OPEL"],
      ["AUDI", "AUDI"],
      ["BMW", "BMW"],
      ["FORD", "FORD"],
      ["HONDA", "HONDA"],
      ["MAZDA", "MAZDA"],
      ["LEXUS", "LEXUS"],
      ["DACIA", "DACIA"],
      ["FIAT", "FIAT"],
      ["SEAT", "SEAT"],
      ["CUPRA", "CUPRA"],
      ["JEEP", "JEEP"],
      ["TESLA", "TESLA"],
      ["KIA", "KIA"],
      ["VW", "VOLKSWAGEN"]
    ];
    for (const [needle, key] of makes) {
      if (compact.startsWith(needle)) return { key, needle };
    }
    const first = registrationIdentityTextV33(name).split(" ")[0] || "";
    return first
      ? { key: registrationMakeKeyV33(first), needle: registrationIdentityCompactV33(first) }
      : { key: "", needle: "" };
  }
  function registrationExpectedModelV33(car = {}, makeInfo = null) {
    if (car.regModel) return registrationIdentityTextV33(car.regModel);
    let name = registrationIdentityTextV33(car.name || "");
    if (!name) return "";
    const parts = name.split(" ");
    if (makeInfo?.key === "MERCEDES" && parts[0] === "MERCEDES" && parts[1] === "BENZ") parts.splice(0, 2);
    else if (makeInfo?.key === "LANDROVER" && parts[0] === "LAND" && parts[1] === "ROVER") parts.splice(0, 2);
    else if (makeInfo?.key === "ALFAROMEO" && parts[0] === "ALFA" && parts[1] === "ROMEO") parts.splice(0, 2);
    else parts.splice(0, 1);
    return parts.join(" ").trim();
  }
  function registrationLevenshteinV33(a = "", b = "") {
    a = String(a);
    b = String(b);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i),
      cur = new Array(b.length + 1);
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }
  function registrationModelMatchesV33(expected = "", actual = "") {
    const a = registrationIdentityTextV33(expected),
      b = registrationIdentityTextV33(actual);
    if (!a || !b) return true;
    const ac = a.replace(/\s+/g, ""),
      bc = b.replace(/\s+/g, "");
    if (ac === bc || ac.includes(bc) || bc.includes(ac)) return true;
    const at = a.split(" ").filter(x => x.length >= 2),
      bt = b.split(" ").filter(x => x.length >= 2);
    if (at.some(x => bt.includes(x))) return true;
    const max = Math.max(ac.length, bc.length);
    if (max >= 4) {
      const sim = 1 - registrationLevenshteinV33(ac, bc) / max;
      if (sim >= 0.72) return true;
    }
    return false;
  }
  function registrationIdentityCheckV33(car = {}, data = {}) {
    const reasons = [];
    const makeInfo = car.regMake
      ? { key: registrationMakeKeyV33(car.regMake), needle: registrationIdentityCompactV33(car.regMake) }
      : registrationKnownMakeFromNameV33(car.name || "");
    const expectedMake = makeInfo?.key || "";
    const scannedMake = registrationMakeKeyV33(data.make || "");
    const expectedModel = registrationExpectedModelV33(car, makeInfo);
    const scannedModel = registrationIdentityTextV33(data.model || "");
    if (expectedMake && scannedMake && expectedMake !== scannedMake) {
      reasons.push({
        label: "Markė",
        current: car.regMake || registrationIdentityTextV33(car.name || "").split(" ")[0] || expectedMake,
        document: data.make
      });
    }
    if (expectedModel && scannedModel && !registrationModelMatchesV33(expectedModel, scannedModel)) {
      reasons.push({ label: "Modelis", current: expectedModel, document: data.model });
    }
    const exact = [
      [
        "VIN",
        String(car.vin || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ""),
        String(data.vin || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
      ],
      [
        "Valst. nr.",
        String(car.plate || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ""),
        String(data.plate || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
      ],
      [
        "Liudijimo nr.",
        String(car.registrationDoc || car.regDoc || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ""),
        String(data.regDoc || data.registrationDoc || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
      ]
    ];
    for (const [label, current, document] of exact) {
      if (current && document && current !== document) reasons.push({ label, current, document });
    }
    return {
      mismatch: reasons.length > 0,
      reasons,
      expectedMake,
      expectedModel,
      scannedMake,
      scannedModel
    };
  }
  window.__visureigiaiRegistrationIdentityCheckV33 = registrationIdentityCheckV33;
  function registrationMismatchDialogV33(car, check, { allowDocumentOnly = false } = {}) {
    return new Promise(resolve => {
      document.getElementById("registrationMismatchV33")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "registrationMismatchV33";
      overlay.className = "registrationMismatchBackdropV33";
      const diffs = (check.reasons || [])
        .map(
          r =>
            `<div class="registrationMismatchDiffV33"><span>${escapeHTML(r.label)}</span><strong>${escapeHTML(r.current || "—")}</strong><b>≠</b><strong>${escapeHTML(r.document || "—")}</strong></div>`
        )
        .join("");
      overlay.innerHTML = `<div class="registrationMismatchCardV33" role="alertdialog" aria-modal="true">\n        <div class="registrationMismatchIconV33">!</div>\n        <h3>Registracijos liudijimas neatitinka</h3>\n        <p><strong>${escapeHTML(car?.name || "Šis automobilis")}</strong> duomenys nesutampa su įkelto dokumento duomenimis. Galbūt sumaišėte registracijos liudijimus? Patikrinkite prieš tęsdami.</p>\n        ${diffs ? `<div class="registrationMismatchDiffsV33">${diffs}</div>` : ""}\n        <div class="registrationMismatchActionsV33">\n          <button class="btn secondary" type="button" data-reg-mismatch-cancel>Patikrinti dokumentą</button>\n          ${allowDocumentOnly ? `<button class="btn ghost" type="button" data-reg-mismatch-document-only>Vis tiek pridėti tik dokumentą</button>` : ""}\n        </div>\n      </div>`;
      document.body.appendChild(overlay);
      const finish = value => {
        overlay.remove();
        resolve(value);
      };
      overlay.querySelector("[data-reg-mismatch-cancel]").onclick = () => finish(false);
      overlay
        .querySelector("[data-reg-mismatch-document-only]")
        ?.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", e => {
        if (e.target === overlay) finish(false);
      });
    });
  }
  openWhatMissingDataV30 = function (item) {
    const car = (state.cars || []).find(c => c.id === item.id);
    if (!car) return;
    const fields = workCenterMissingFieldsV30(car);
    if (!fields.length) {
      render();
      return;
    }
    const scanKeys = new Set(["vin", "plate", "registrationDoc", "year"]);
    const canScan = fields.some(f => scanKeys.has(f.key));
    let scannedFile = null,
      scannedData = null,
      previewUrl = "";
    const input = f => {
      if (f.key === "taStatus")
        return `<div class="field"><label>TA</label><select class="input" id="what_taStatus">${vehicleStatusOptions(car.taStatus || "unknown")}</select></div>`;
      if (f.key === "insuranceStatus")
        return `<div class="field"><label>Draudimas</label><select class="input" id="what_insuranceStatus">${vehicleStatusOptions(car.insuranceStatus || "unknown")}</select></div>`;
      const cfg = {
        vin: ["VIN", "text", "17"],
        mileage: ["Rida, km", "number", ""],
        sdk: ["SDK", "text", "32"],
        plate: ["Valstybinis numeris", "text", "20"],
        registrationDoc: ["Registracijos liudijimo serija ir nr.", "text", "12"],
        year: ["Metai", "number", "4"],
        buyPrice: ["Pirkimo kaina, €", "number", ""]
      }[f.key];
      const value =
          f.key === "registrationDoc" ? car.registrationDoc || car.regDoc || "" : (car[f.key] ?? ""),
        numeric = cfg[1] === "number";
      return `<div class="field ${["vin", "registrationDoc", "sdk"].includes(f.key) ? "whatWideV30" : ""}"><label>${cfg[0]}</label><input class="input" id="what_${f.key}" type="${cfg[1]}" value="${escapeHTML(value)}" ${cfg[2] ? `maxlength="${cfg[2]}"` : ""} ${numeric ? 'min="0" inputmode="numeric"' : ""} ${["vin", "plate", "registrationDoc", "sdk"].includes(f.key) ? 'autocapitalize="characters" autocomplete="off"' : ""}></div>`;
    };
    const scanHtml = canScan
      ? `\n      <div class="whatRegScanV31">\n        <div class="whatRegScanTitleV31"><strong>Užpildyti iš registracijos liudijimo</strong><span>nebūtina</span></div>\n        <div class="whatRegScanActionsV31">\n          <label class="whatRegScanBtnV31" for="whatRegCameraV31">📷 Fotografuoti<input id="whatRegCameraV31" type="file" accept="image/*" capture="environment"></label>\n          <label class="whatRegScanBtnV31" for="whatRegGalleryV31">🖼️ Iš galerijos<input id="whatRegGalleryV31" type="file" accept="image/*"></label>\n        </div>\n        <div class="whatRegScanPreviewV31" id="whatRegPreviewV31"><img id="whatRegPreviewImgV31" alt="Registracijos liudijimas"></div>\n        <div class="whatRegScanStateV31" id="whatRegStateV31"></div>\n      </div>`
      : "";
    openSheet(
      `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Užpildyti trūkstamus duomenis</strong><span>Rodomi tik laukai, kurių dabar trūksta.</span></div>${scanHtml}<div class="whatQuickGridV30">${fields.map(input).join("")}</div><button class="btn whatPrimaryV30" id="whatSaveMissingV30" type="button">Išsaugoti</button></section>`
    );
    const cleanup = () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = "";
      }
    };
    document.querySelector("[data-what-close]")?.addEventListener("click", cleanup, { once: true });
    const runScan = async file => {
      if (!file) return;
      scannedFile = file;
      const stateEl = document.getElementById("whatRegStateV31"),
        preview = document.getElementById("whatRegPreviewV31"),
        img = document.getElementById("whatRegPreviewImgV31");
      cleanup();
      previewUrl = URL.createObjectURL(file);
      if (img) img.src = previewUrl;
      if (preview) preview.classList.add("show");
      if (stateEl) {
        stateEl.className = "whatRegScanStateV31 show";
        stateEl.textContent = "Skaitau registracijos liudijimą…";
      }
      try {
        const candidate = await registrationCertificateScanV31(file, stateEl);
        const identity = registrationIdentityCheckV33(car, candidate);
        if (identity.mismatch) {
          scannedData = null;
          scannedFile = null;
          await registrationMismatchDialogV33(car, identity, { allowDocumentOnly: false });
          cleanup();
          if (preview) preview.classList.remove("show");
          if (img) img.removeAttribute("src");
          for (const inputId of ["whatRegCameraV31", "whatRegGalleryV31"]) {
            const fileInput = document.getElementById(inputId);
            if (fileInput) fileInput.value = "";
          }
          if (stateEl) {
            stateEl.className = "whatRegScanStateV31 show bad";
            stateEl.textContent =
              "Dokumento duomenys neatitinka šio automobilio. Nieko neužpildžiau — patikrink registracijos liudijimą.";
          }
          return;
        }
        scannedData = candidate;
        const filled = [];
        if (registrationFillBlankInputV31("what_vin", scannedData.vin)) filled.push("VIN");
        if (registrationFillBlankInputV31("what_plate", scannedData.plate)) filled.push("valst. nr.");
        if (registrationFillBlankInputV31("what_registrationDoc", scannedData.regDoc))
          filled.push("liudijimo nr.");
        if (registrationFillBlankInputV31("what_year", scannedData.year)) filled.push("metai");
        if (stateEl) {
          stateEl.className = "whatRegScanStateV31 show good";
          stateEl.textContent = filled.length
            ? `Automatiškai užpildyta: ${filled.join(", ")}. Likusius laukus įrašyk ranka.`
            : "Dokumentas nuskaitytas ir sutampa su automobiliu. Likusius laukus įrašyk ranka.";
        }
      } catch (e) {
        scannedData = null;
        if (stateEl) {
          stateEl.className = "whatRegScanStateV31 show bad";
          stateEl.textContent = e.message || "Nepavyko nuskaityti dokumento.";
        }
      }
    };
    document
      .getElementById("whatRegCameraV31")
      ?.addEventListener("change", e => runScan(e.target.files?.[0]));
    document
      .getElementById("whatRegGalleryV31")
      ?.addEventListener("change", e => runScan(e.target.files?.[0]));
    document.getElementById("whatSaveMissingV30").onclick = async () => {
      const btn = document.getElementById("whatSaveMissingV30");
      if (btn.disabled) return;
      const old = JSON.parse(JSON.stringify(car)),
        oldBalance = Number(state.finances?.budgetBalance || 0);
      let addedDoc = null;
      try {
        const patch = {};
        let newBuy = Number(car.buyPrice || 0);
        for (const f of fields) {
          const el = document.getElementById("what_" + f.key);
          if (!el) continue;
          let v = String(el.value ?? "").trim();
          if (f.key === "vin") {
            v = v.toUpperCase();
            if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) throw Error("VIN turi būti 17 simbolių.");
            patch.vin = v;
          } else if (f.key === "mileage") {
            const n = Number(v);
            if (!Number.isInteger(n) || n < 0) throw Error("Patikrink ridą.");
            patch.mileage = n;
          } else if (f.key === "sdk") {
            v = v.toUpperCase();
            if (!v) throw Error("Įrašyk SDK.");
            patch.sdk = v;
            if (!car.sdkStatus || car.sdkStatus === "unset") patch.sdkStatus = "done";
          } else if (f.key === "plate") {
            v = v.toUpperCase();
            if (!v) throw Error("Įrašyk valstybinį numerį.");
            patch.plate = v;
          } else if (f.key === "registrationDoc") {
            v = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (!/^[A-Z][0-9]{5,8}$/.test(v)) throw Error("Patikrink registracijos liudijimo numerį.");
            patch.registrationDoc = v;
          } else if (f.key === "year") {
            const n = Number(v),
              max = new Date().getFullYear() + 1;
            if (!Number.isInteger(n) || n < 1886 || n > max) throw Error("Patikrink metus.");
            patch.year = n;
          } else if (f.key === "taStatus") {
            if (!["valid", "invalid"].includes(v)) throw Error("Pasirink TA būseną.");
            patch.taStatus = v;
          } else if (f.key === "insuranceStatus") {
            if (!["valid", "invalid"].includes(v)) throw Error("Pasirink draudimo būseną.");
            patch.insuranceStatus = v;
          } else if (f.key === "buyPrice") {
            const n = Number(v);
            if (!Number.isFinite(n) || n <= 0) throw Error("Įrašyk pirkimo kainą.");
            newBuy = n;
            patch.buyPrice = n;
          }
        }
        if (scannedData) {
          if (!car.regMake && scannedData.make) patch.regMake = scannedData.make;
          if (!car.regModel && scannedData.model) patch.regModel = scannedData.model;
        }
        if (scannedFile && !hasCarDocument(car, "registration")) {
          addedDoc = await registrationDocumentFromImageV31(
            scannedFile,
            patch.registrationDoc || car.registrationDoc || scannedData?.regDoc || ""
          );
          patch.documents = [...(car.documents || []), addedDoc];
        }
        btn.disabled = true;
        btn.textContent = "Išsaugoma…";
        Object.assign(car, patch);
        if (newBuy !== Number(old.buyPrice || 0)) {
          ensureFinanceCollections();
          state.finances.budgetBalance += Number(old.buyPrice || 0) - newBuy;
        }
        if (!saveState()) throw Error("Nepavyko išsaugoti.");
        addHistory("Automobilio duomenys papildyti", car.name, "✎", {
          kind: "car",
          id: car.id,
          label: "Atidaryti automobilį"
        });
        saveState();
        cleanup();
        closeSheet();
        render();
        toast("Automobilio duomenys išsaugoti", "✓");
      } catch (e) {
        Object.keys(car).forEach(k => delete car[k]);
        Object.assign(car, old);
        if (state.finances) state.finances.budgetBalance = oldBalance;
        if (addedDoc?.key) await photoDelete(addedDoc.key).catch(() => {});
        toast(e.message || "Patikrink duomenis", "!");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Išsaugoti";
        }
      }
    };
  };
  const __openCarEditSheetV31 = openCarEditSheet;
  openCarEditSheet = function (id) {
    __openCarEditSheetV31(id);
    const car = (state.cars || []).find(c => c.id === id),
      input = document.getElementById("editVehicledoc_registration");
    if (!car || !input) return;
    const picker = input.closest(".vehicleDocPicker");
    if (picker) picker.classList.add("registrationOcrV31");
    const status = document.getElementById("editVehiclefiles_registration");
    if (status) status.classList.add("registrationOcrV31");
    input.addEventListener("change", async () => {
      const file = Array.from(input.files || []).find(f => String(f.type || "").startsWith("image/"));
      if (!file) {
        if (status && input.files?.length)
          status.textContent = `${input.files[0].name} · dokumentas bus prisegtas`;
        return;
      }
      if (status) {
        status.textContent = `${file.name} · skaitau ir tikrinu…`;
        status.classList.remove("good", "bad");
      }
      try {
        const data = await registrationCertificateScanV31(file, status);
        const identity = registrationIdentityCheckV33(car, data);
        if (identity.mismatch) {
          const documentOnly = await registrationMismatchDialogV33(car, identity, {
            allowDocumentOnly: true
          });
          if (!documentOnly) {
            input.value = "";
            if (status) {
              status.textContent = "Dokumentas nepridėtas · pasirink teisingą registracijos liudijimą";
              status.classList.add("bad");
            }
            return;
          }
          if (status) {
            status.textContent = `${file.name} · bus pridėtas tik kaip dokumentas, automobilio duomenys nepakeisti`;
            status.classList.add("bad");
          }
          return;
        }
        const filled = registrationFillVehicleInputsV31("editVehicle", data);
        if (status) {
          status.textContent = filled.length
            ? `${file.name} · dokumentas sutampa · užpildyta: ${filled.join(", ")}`
            : `${file.name} · dokumentas sutampa · esami duomenys nepakeisti`;
          status.classList.add("good");
        }
      } catch (e) {
        if (status) {
          status.textContent = `${file.name} · prisegs, OCR nepavyko patikimai patikrinti`;
          status.classList.add("bad");
        }
      }
    });
  };
  const documentPreviewUrlsV32 = new Map();
  const saleDocTypeV32 = DOC_TYPES.find(x => x[0] === "sale");
  if (saleDocTypeV32) saleDocTypeV32[1] = "Pirkimo–pardavimo sutartis";
  function documentIsImageV32(doc = {}) {
    const type = String(doc.type || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    return /\.(jpe?g|png|webp)$/i.test(String(doc.name || ""));
  }
  function documentTypeLabelV32(doc = {}) {
    return DOC_TYPES.find(x => x[0] === doc.kind)?.[1] || "Dokumentas";
  }
  function documentFileExtV32(blob, file) {
    const type = String(blob?.type || file?.type || "").toLowerCase();
    if (type.includes("png")) return ".png";
    if (type.includes("webp")) return ".webp";
    return ".jpg";
  }
  function saleContractNameV32(car, index, blob, file) {
    const clean =
      String(car?.name || "Automobilis")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 55) || "Automobilis";
    return `Pirkimo-pardavimo-sutartis-${clean}-${todayISO()}-${index + 1}${documentFileExtV32(blob, file)}`;
  }
  documentRows = function (p, c) {
    return (c.documents || [])
      .map(d => {
        const isImage = documentIsImageV32(d),
          type = documentTypeLabelV32(d);
        return `<div class="vehicleDocRow vehicleDocCardV32" data-doc-row="${escapeHTML(d.id)}">\n        <button type="button" class="vehicleDocPreviewV32" data-doc-preview-v32="${escapeHTML(d.id)}" aria-label="Peržiūrėti ${escapeHTML(d.name)}">\n          <span class="vehicleDocThumbV32 ${isImage ? "image" : "file"}" data-doc-thumb-v32="${escapeHTML(d.id)}">${isImage ? "🖼️" : String(d.type || "").includes("pdf") ? "PDF" : "📄"}</span>\n          <span class="vehicleDocTextV32">\n            <strong>${escapeHTML(d.name)}</strong>\n            <span>${escapeHTML(type)} · ${Math.max(1, Math.round(Number(d.size || 0) / 1024))} KB</span>\n          </span>\n        </button>\n        <div class="vehicleDocActionsV32">\n          <button type="button" class="vehicleDocDownload vehicleDocDownloadV32" data-doc-download="${escapeHTML(d.id)}" aria-label="Atsisiųsti">↓</button>\n          <button type="button" class="vehicleDocRemove vehicleDocRemoveV32" data-doc-remove="${escapeHTML(d.id)}" aria-label="Pašalinti ${escapeHTML(d.name)}">×</button>\n        </div>\n      </div>`;
      })
      .join("");
  };
  async function hydrateDocumentThumbsV32(root, car) {
    if (!root || !car) return;
    for (const el of root.querySelectorAll("[data-doc-thumb-v32]")) {
      const id = el.dataset.docThumbV32,
        doc = (car.documents || []).find(d => d.id === id);
      if (!doc || !documentIsImageV32(doc)) continue;
      try {
        let url = documentPreviewUrlsV32.get(doc.id);
        if (!url) {
          const blob = await documentBlob(doc.key);
          url = URL.createObjectURL(blob);
          documentPreviewUrlsV32.set(doc.id, url);
        }
        if (!el.isConnected) continue;
        el.textContent = "";
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        el.appendChild(img);
      } catch (e) {
        console.warn("Dokumento miniatiūra", e);
      }
    }
  }
  async function openDocumentPreviewV32(prefix, car, id) {
    const doc = (car?.documents || []).find(d => d.id === id);
    if (!doc) return;
    try {
      const blob = await documentBlob(doc.key),
        url = URL.createObjectURL(blob);
      const back = () => {
        URL.revokeObjectURL(url);
        prefix === "editVehicle" ? openCarEditSheet(car.id) : renderCarSheet(car);
      };
      if (documentIsImageV32(doc)) {
        openSheet(
          `<div class="sheetHead"><h3>${escapeHTML(documentTypeLabelV32(doc))}</h3><button class="closeBtn" id="closeDocPreviewV32" type="button">✕</button></div><div class="docPreviewV32"><img src="${url}" alt="${escapeHTML(doc.name)}"><div class="docPreviewMetaV32">${escapeHTML(doc.name)}</div></div>`
        );
      } else {
        openSheet(
          `<div class="sheetHead"><h3>${escapeHTML(documentTypeLabelV32(doc))}</h3><button class="closeBtn" id="closeDocPreviewV32" type="button">✕</button></div><div class="docPreviewV32 pdf"><iframe src="${url}" title="${escapeHTML(doc.name)}"></iframe><div class="docPreviewMetaV32">${escapeHTML(doc.name)}</div></div>`
        );
      }
      document.getElementById("closeDocPreviewV32").onclick = back;
    } catch (e) {
      toast(e.message || "Nepavyko atidaryti dokumento", "!");
    }
  }
  const __bindVehicleFieldsV32 = bindVehicleFields;
  bindVehicleFields = function (p, c, instant = false) {
    __bindVehicleFieldsV32(p, c, instant);
    const root = document.getElementById(p + "docList");
    if (!root) return;
    root.querySelectorAll("[data-doc-preview-v32]").forEach(b => {
      b.onclick = () => openDocumentPreviewV32(p, c, b.dataset.docPreviewV32);
    });
    if (instant) {
      root.querySelectorAll("[data-doc-remove]").forEach(b => {
        b.onclick = async () => {
          const id = b.dataset.docRemove,
            doc = (c.documents || []).find(d => d.id === id);
          if (!doc || !confirm("Pašalinti šį dokumentą?")) return;
          const previous = c.documents;
          c.documents = previous.filter(d => d.id !== id);
          if (!saveState()) {
            c.documents = previous;
            toast("Nepavyko išsaugoti pakeitimo.");
            return;
          }
          const oldUrl = documentPreviewUrlsV32.get(id);
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
            documentPreviewUrlsV32.delete(id);
          }
          if (doc.key) await photoDelete(doc.key).catch(() => {});
          renderCarSheet(c);
          const details = document.querySelector("#sheet .vehicleDocuments");
          if (details) details.open = true;
          toast("Dokumentas pašalintas", "✓");
        };
      });
    }
    hydrateDocumentThumbsV32(root, c);
  };
  vehicleStatusState = function (status, until) {
    const now = todayISO(),
      full = String(until || "").trim();
    if (status === "invalid") return { label: full ? `Negalioja · ${full}` : "Negalioja", cls: "bad" };
    if (status === "valid" && full && full < now) return { label: `Pasibaigė · ${full}`, cls: "bad" };
    if (status === "valid" && full) {
      const days = daysBetweenISO(now, full);
      return { label: `iki ${full}`, cls: days <= 14 ? "warn" : "good" };
    }
    if (status === "valid") return { label: "Galioja", cls: "good" };
    return { label: "Nežinoma", cls: "neutral" };
  };
  openSaleModal = function (carId) {
    const car = state.cars.find(c => c.id === carId);
    if (!car || car.status === "parduotas") return;
    closeSaleModal();
    const modal = document.createElement("div");
    modal.id = "saleModal";
    modal.className = "saleModal saleModalV32";
    modal.innerHTML = `\n      <div class="saleModalCard saleModalCardV32" role="dialog" aria-modal="true" aria-labelledby="saleModalTitle">\n        <div class="saleModalHead">\n          <div>\n            <span class="saleModalEyebrow">AUTOMOBILIO PARDAVIMAS</span>\n            <h3 id="saleModalTitle">Parduoti automobilį?</h3>\n          </div>\n          <button type="button" class="closeBtn saleModalClose" aria-label="Uždaryti">✕</button>\n        </div>\n\n        <div class="saleModalCarName">${escapeHTML(car.name || "Automobilis")}</div>\n\n        <div class="field salePriceField">\n          <label for="saleModalPrice">Pardavimo suma</label>\n          <input class="input" id="saleModalPrice" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Įvesk sumą">\n        </div>\n\n        <div class="saleContractBoxV32">\n          <div class="saleContractHeadV32">\n            <strong>Pirkimo–pardavimo sutartis</strong>\n            <span>Privaloma</span>\n          </div>\n          <label class="saleContractPickerV32" for="saleContractFilesV32">\n            <span class="ico">📎</span>\n            <span>\n              <strong>Pridėti sutarties nuotraukas</strong>\n              <small>1 arba 2 nuotraukos</small>\n            </span>\n            <input id="saleContractFilesV32" type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple>\n          </label>\n          <div class="saleContractPreviewV32" id="saleContractPreviewV32"></div>\n          <div class="saleContractErrorV32" id="saleContractErrorV32"></div>\n        </div>\n\n        <button type="button" class="btn premiumPrimaryBtn saleModalConfirm" id="saleModalConfirm" disabled>Parduoti</button>\n      </div>`;
    document.body.appendChild(modal);
    const price = modal.querySelector("#saleModalPrice");
    const filesInput = modal.querySelector("#saleContractFilesV32");
    const confirmBtn = modal.querySelector("#saleModalConfirm");
    const preview = modal.querySelector("#saleContractPreviewV32");
    const error = modal.querySelector("#saleContractErrorV32");
    let previewUrls = [];
    const cleanup = () => {
      previewUrls.forEach(u => URL.revokeObjectURL(u));
      previewUrls = [];
    };
    const close = () => {
      cleanup();
      closeSaleModal();
    };
    const selectedFiles = () => Array.from(filesInput.files || []);
    const sync = () => {
      const amount = Number(price.value || 0),
        fs = selectedFiles();
      const validFiles =
        fs.length >= 1 && fs.length <= 2 && fs.every(f => String(f.type || "").startsWith("image/"));
      confirmBtn.disabled = !(Number.isFinite(amount) && amount > 0 && validFiles);
    };
    const renderPreview = () => {
      cleanup();
      const fs = selectedFiles();
      preview.innerHTML = "";
      if (!fs.length) {
        preview.classList.remove("show");
        sync();
        return;
      }
      preview.classList.add("show");
      fs.forEach((f, i) => {
        const url = URL.createObjectURL(f);
        previewUrls.push(url);
        preview.insertAdjacentHTML(
          "beforeend",
          `<div class="saleContractThumbV32"><img src="${url}" alt="Sutarties puslapis ${i + 1}"><span>${i + 1}</span></div>`
        );
      });
      sync();
    };
    price.addEventListener("input", sync);
    filesInput.addEventListener("change", () => {
      error.textContent = "";
      const fs = selectedFiles();
      if (fs.length > 2) {
        filesInput.value = "";
        preview.innerHTML = "";
        preview.classList.remove("show");
        error.textContent = "Galima pridėti 1 arba 2 sutarties nuotraukas.";
        toast("Pasirink ne daugiau kaip 2 sutarties nuotraukas", "!");
      } else if (fs.some(f => !String(f.type || "").startsWith("image/"))) {
        filesInput.value = "";
        error.textContent = "Sutarčiai pasirink nuotrauką.";
      }
      renderPreview();
    });
    price.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!confirmBtn.disabled) confirmBtn.click();
      }
    });
    modal.querySelector(".saleModalClose").onclick = close;
    modal.addEventListener("click", e => {
      if (e.target === modal) close();
    });
    confirmBtn.onclick = async () => {
      const amount = Number(price.value || 0),
        fs = selectedFiles();
      if (!(Number.isFinite(amount) && amount > 0)) {
        toast("Įrašyk pardavimo kainą", "💰");
        return;
      }
      if (!fs.length || fs.length > 2) {
        toast("Pridėk 1 arba 2 pirkimo–pardavimo sutarties nuotraukas", "!");
        return;
      }
      if (!car.checklist.every(i => i.done)) {
        toast("Visos užduotys turi būti atliktos", "⚠️");
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Išsaugoma…";
      const oldDocs = [...(car.documents || [])],
        added = [];
      try {
        for (let i = 0; i < fs.length; i++) {
          const blob = await readDocumentFile(fs[i]);
          const key = await putDocument(blob);
          added.push({
            id: uid(),
            key,
            kind: "sale",
            name: saleContractNameV32(car, i, blob, fs[i]),
            type: blob.type,
            size: blob.size,
            addedAt: nowLabel(),
            addedDateISO: todayISO()
          });
        }
        car.documents = [...oldDocs, ...added];
        if (!saveState()) throw Error("Nepavyko išsaugoti pirkimo–pardavimo sutarties.");
        cleanup();
        closeSaleModal();
        sellCar(car.id, amount);
      } catch (e) {
        car.documents = oldDocs;
        await Promise.all(added.map(d => photoDelete(d.key).catch(() => {})));
        saveState();
        toast(e.message || "Nepavyko išsaugoti sutarties", "!");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Parduoti";
      }
    };
    sync();
    setTimeout(() => price.focus(), 80);
  };
})();
