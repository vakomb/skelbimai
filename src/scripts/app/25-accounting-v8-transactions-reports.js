// Buhalterija v8/v24: operacijos su priedais, užduočių išlaidų čekiai, ataskaitos ZIP.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function ensureAccountingTransactionsV8() {
  ensureFinanceCollections();
  for (const tx of state.finances.transactions) {
    if (!Array.isArray(tx.attachments)) tx.attachments = [];
  }
}
async function accountingReadAttachmentsV8(input, defaultKind = "receipt") {
  const files = Array.from(input?.files || []);
  const added = [];
  try {
    for (const f of files) {
      const blob = await readDocumentFile(f),
        key = await putDocument(blob);
      added.push({
        id: uid(),
        key,
        kind: defaultKind,
        name: f.name,
        type: blob.type,
        size: blob.size,
        addedAt: nowLabel(),
        addedDateISO: todayISO()
      });
    }
    return added;
  } catch (e) {
    await Promise.all(added.map(a => photoDelete(a.key).catch(() => {})));
    throw e;
  }
}
function accountingCarOptionsV8(selected = "") {
  return (
    `<option value="">Įmonės</option>` +
    (state.cars || [])
      .map(
        c =>
          `<option value="${escapeHTML(c.id)}"${c.id === selected ? " selected" : ""}>${escapeHTML(c.name)}</option>`
      )
      .join("")
  );
}
function accountingMoneyFormV8(type) {
  const expense = type === "expense";
  const options = expense
    ? ["Kuras", "Servisas", "Detalės", "Transportas", "Plovimas", "Reklama", "Mokesčiai", "Kita"]
    : ["Įmonės papildymas", "Grąžinimas", "Kita įplauka"];
  return `<section class="accountingWorkspace show"><div class="accountingWorkspaceHead"><h3>${expense ? "Pridėti išlaidą" : "Pridėti įplauką"}</h3></div><form class="accountingMoneyForm" id="accountingMoneyFormV8">\n      <div class="field"><label>Data</label><input class="input" id="accountingMoneyDate" type="date" value="${todayISO()}"></div>\n      <div class="field"><label>Suma, €</label><input class="input" id="accountingMoneyAmount" type="number" min="0.01" step="0.01" inputmode="decimal"></div>\n      <div class="field"><label>Kategorija</label><select class="input" id="accountingMoneyCategory">${options.map(x => `<option>${x}</option>`).join("")}</select></div>\n      <div class="field"><label>Automobilis</label><select class="input" id="accountingMoneyCar">${accountingCarOptionsV8()}</select></div>\n      <div class="field"><label>Pastaba</label><textarea class="input" id="accountingMoneyNote" rows="3"></textarea></div>\n      <label class="accountingAttach" for="accountingMoneyFiles"><span class="ico">📎</span><strong>Prisegti čekį / dokumentą</strong><span class="accountingFileCount" id="accountingMoneyFileCount"></span><input id="accountingMoneyFiles" type="file" accept="application/pdf,image/*" multiple></label>\n      <button class="btn" type="submit">Išsaugoti</button>\n    </form></section>`;
}
async function saveAccountingMoneyV8(type) {
  ensureAccountingTransactionsV8();
  const amount = Number(document.getElementById("accountingMoneyAmount")?.value || 0),
    date = document.getElementById("accountingMoneyDate")?.value || todayISO(),
    category = document.getElementById("accountingMoneyCategory")?.value || "",
    note = document.getElementById("accountingMoneyNote")?.value.trim() || "",
    carId = document.getElementById("accountingMoneyCar")?.value || "";
  if (!Number.isFinite(amount) || amount <= 0) {
    toast("Įrašyk sumą", "!");
    return;
  }
  const car = state.cars.find(c => c.id === carId),
    input = document.getElementById("accountingMoneyFiles");
  let attachments = [];
  try {
    attachments = await accountingReadAttachmentsV8(input, type === "expense" ? "receipt" : "other");
    const entry = {
      id: uid(),
      type,
      amount: Math.abs(amount),
      title: category || (type === "expense" ? "Išlaidos" : "Įplauka"),
      category: category || "",
      note,
      date,
      carId: carId || "",
      attachments,
      source: "accounting",
      createdAt: nowLabel()
    };
    state.finances.transactions.unshift(entry);
    state.finances.budgetBalance += financeSignedAmount(entry);
    state.finances.budgetBalance = Number(state.finances.budgetBalance || 0);
    if (!saveState()) throw Error("Nepavyko išsaugoti įrašo.");
    addHistory(
      type === "expense" ? "Išlaida" : "Įplauka",
      `${entry.title}${car ? " · " + car.name : ""} · ${type === "income" ? "+" : "-"}${moneyFmt(entry.amount)}`,
      type === "income" ? "💶" : "💸"
    );
    saveState();
    state.ui.accountingPanel = "";
    render();
    toast(type === "expense" ? "Išlaida išsaugota" : "Įplauka išsaugota", "✓");
  } catch (e) {
    await Promise.all(attachments.map(a => photoDelete(a.key).catch(() => {})));
    toast(e.message || "Nepavyko išsaugoti", "!");
  }
}
function accountingDateISOFromValueV24(value = "") {
  const s = String(value || "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-./](\d{2})[-./](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[-./](\d{2})[-./](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return "";
}
function accountingDocumentDateV24(doc, car) {
  return (
    doc?.addedDateISO ||
    accountingDateISOFromValueV24(doc?.addedAt) ||
    accountingDateISOFromValueV24(doc?.date) ||
    car?.createdDateISO ||
    ""
  );
}
function accountingTaskDateV24(item, car) {
  return (
    item?.doneDateISO || accountingDateISOFromValueV24(item?.doneAt) || car?.createdDateISO || todayISO()
  );
}
function taskExpenseCategoryV24(name = "") {
  const s = String(name || "").toLocaleLowerCase("lt");
  if (/plov|švar|valym/.test(s)) return "Plovimas";
  if (/kuras|degal/.test(s)) return "Kuras";
  if (/transport|trali|parvež|parvez/.test(s)) return "Transportas";
  if (/detal|padang|akumuliat|lemput|alyv|filtr/.test(s)) return "Detalės";
  if (/reklam|skelb/.test(s)) return "Reklama";
  if (/servis|remont|diagnost|suvir|daž|daz|polir|meistr/.test(s)) return "Servisas";
  return "Kita";
}
function ensureCarTaskExpenseTransactionsV24() {
  ensureAccountingTransactionsV8();
  let changed = false;
  for (const car of state.cars || []) {
    for (const item of car.checklist || []) {
      const amount = Math.max(0, Number(item.expense || 0));
      if (!item.done || !amount) continue;
      const existing = (state.finances.transactions || []).find(
        t =>
          t.source === "carTask" &&
          t.carId === car.id &&
          (t.linkedTaskId === item.id || item.expenseTxId === t.id)
      );
      if (existing) {
        if (!item.expenseTxId) {
          item.expenseTxId = existing.id;
          changed = true;
        }
        if (!Array.isArray(item.receipts) && Array.isArray(existing.attachments)) {
          item.receipts = existing.attachments;
          changed = true;
        }
        continue;
      }
      const entry = {
        id: uid(),
        type: "expense",
        amount,
        title: item.name || "Automobilio užduotis",
        category: taskExpenseCategoryV24(item.name),
        note: `Automobilio užduotis: ${item.name || ""}`,
        date: accountingTaskDateV24(item, car),
        carId: car.id,
        attachments: Array.isArray(item.receipts) ? item.receipts : [],
        source: "carTask",
        linkedTaskId: item.id,
        createdAt: item.doneAt || nowLabel()
      };
      state.finances.transactions.unshift(entry);
      item.expenseTxId = entry.id;
      changed = true;
    }
  }
  if (changed) saveState();
}
async function completeCarTaskWithExpenseV24(car, item, expense, attachments = []) {
  ensureAccountingTransactionsV8();
  const amount = Math.max(0, Number(expense || 0));
  if (amount > 0) {
    const entry = {
      id: uid(),
      type: "expense",
      amount,
      title: item.name || "Automobilio užduotis",
      category: taskExpenseCategoryV24(item.name),
      note: `Automobilio užduotis: ${item.name || ""}`,
      date: todayISO(),
      carId: car.id,
      attachments: [...attachments],
      source: "carTask",
      linkedTaskId: item.id,
      createdAt: nowLabel()
    };
    state.finances.transactions.unshift(entry);
    item.expenseTxId = entry.id;
    item.receipts = [...attachments];
  }
  completeCarChecklistItem(car.id, item.id, amount);
  item.doneDateISO = item.doneDateISO || todayISO();
  saveState();
}
function openCarTaskReceiptSheetV24(car, item, expense) {
  openSheet(
    `\n      <div class="sheetHead">\n        <div><h3>Prisegti čekį</h3></div>\n        <button class="closeBtn" id="cancelTaskReceiptV24" type="button" aria-label="Uždaryti">✕</button>\n      </div>\n      <div class="taskReceiptV24">\n        <div class="taskReceiptSummaryV24">\n          <span>${escapeHTML(car.name)}</span>\n          <strong>${escapeHTML(item.name)}</strong>\n          <b>${moneyFmt(expense)}</b>\n        </div>\n        <label class="accountingAttach taskReceiptPickerV24" for="taskReceiptFilesV24">\n          <span class="ico">📎</span>\n          <strong>Prisegti čekį / dokumentą</strong>\n          <span class="accountingFileCount" id="taskReceiptFileCountV24"></span>\n          <input id="taskReceiptFilesV24" type="file" accept="application/pdf,image/*" multiple required>\n        </label>\n        <div class="taskReceiptHintV24">Išlaida bus pridėta prie automobilio savikainos ir Buhalterijos ataskaitų.</div>\n        <button class="btn" id="saveTaskReceiptV24" type="button" style="width:100%">Išsaugoti išlaidą ir atlikti</button>\n      </div>`
  );
  const fileInput = document.getElementById("taskReceiptFilesV24");
  const count = document.getElementById("taskReceiptFileCountV24");
  if (fileInput)
    fileInput.onchange = () => {
      const n = fileInput.files?.length || 0;
      if (count) count.textContent = n ? `${n} fail.` : "";
    };
  const back = () => {
    renderCarSheet(car);
    renderCarChecklist(car.id);
  };
  document.getElementById("cancelTaskReceiptV24").onclick = back;
  document.getElementById("saveTaskReceiptV24").onclick = async () => {
    if (!fileInput?.files?.length) {
      toast("Prisek čekį arba dokumentą", "!");
      fileInput?.click();
      return;
    }
    const btn = document.getElementById("saveTaskReceiptV24");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Išsaugoma…";
    }
    let attachments = [];
    try {
      attachments = await accountingReadAttachmentsV8(fileInput, "receipt");
      await completeCarTaskWithExpenseV24(car, item, expense, attachments);
      render();
      renderCarSheet(car);
      renderCarChecklist(car.id);
      toast(`Išlaida ${moneyFmt(expense)} pridėta į Buhalteriją`, "✓");
    } catch (e) {
      await Promise.all(attachments.map(a => photoDelete(a.key).catch(() => {})));
      toast(e?.message || "Nepavyko išsaugoti čekio", "!");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Išsaugoti išlaidą ir atlikti";
      }
    }
  };
}
function accountingRangeV8(mode) {
  const now = todayISO();
  if (mode === "today") return { from: now, to: now, label: "Šiandien" };
  if (mode === "week") return { from: proWeekStartISO(), to: now, label: "Ši savaitė" };
  if (mode === "month") return { from: currentMonthKey() + "-01", to: now, label: "Šis mėnuo" };
  const from = state.ui?.accountingReportFrom || currentMonthKey() + "-01",
    to = state.ui?.accountingReportTo || now;
  return { from, to, label: `${from} – ${to}` };
}
function accountingReportDataV8(range) {
  ensureAccountingTransactionsV8();
  ensureCarTaskExpenseTransactionsV24();
  const inRange = d => !!d && d >= range.from && d <= range.to;
  const bought = (state.cars || []).filter(c => inRange(c.createdDateISO));
  const sold = (state.cars || []).filter(c => c.status === "parduotas" && inRange(c.soldDateISO));
  const tx = (state.finances.transactions || []).filter(t => inRange(t.date));
  const docsByCar = {};
  const carsWithPeriodDocs = [];
  for (const car of state.cars || []) {
    const docs = (car.documents || []).filter(doc => inRange(accountingDocumentDateV24(doc, car)));
    docsByCar[car.id] = docs;
    if (docs.length) carsWithPeriodDocs.push(car);
  }
  const txCars = tx.map(t => (state.cars || []).find(c => c.id === t.carId)).filter(Boolean);
  const cars = [
    ...new Map([...bought, ...sold, ...txCars, ...carsWithPeriodDocs].map(c => [c.id, c])).values()
  ];
  const income = tx.filter(t => t.type === "income").reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const expense = tx
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const sales = sold.reduce((s, c) => s + Number(c.soldPrice || 0), 0);
  const purchases = bought.reduce((s, c) => s + Number(c.buyPrice || 0), 0);
  const carDocumentCount = cars.reduce((n, c) => n + (docsByCar[c.id] || []).length, 0);
  const attachmentCount = tx.reduce((n, t) => n + (t.attachments || []).length, 0);
  const taskExpenses = tx.filter(t => t.type === "expense" && t.source === "carTask");
  return {
    bought,
    sold,
    cars,
    tx,
    income,
    expense,
    sales,
    purchases,
    docsByCar,
    carDocumentCount,
    attachmentCount,
    docCount: carDocumentCount + attachmentCount,
    taskExpenses
  };
}
function accountingCsvCellV8(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}
function accountingTransactionsCsvV8(tx) {
  const head = ["Data", "Tipas", "Kategorija", "Suma", "Automobilis", "Pastaba", "Priedai"];
  const rows = tx.map(t => [
    t.date,
    t.type === "income" ? "Įplauka" : "Išlaida",
    t.category || t.title || "",
    Number(t.amount || 0),
    state.cars.find(c => c.id === t.carId)?.name || "",
    t.note || "",
    (t.attachments || []).length
  ]);
  return "\ufeff" + [head, ...rows].map(r => r.map(accountingCsvCellV8).join(";")).join("\r\n");
}
function accountingPeriodCarsCsvV24(d, range) {
  const q = accountingCsvCellV8;
  const rows = [
    [
      "Automobilis",
      "Laikotarpio įvykiai",
      "Pirkimas",
      "Pardavimas",
      "Finansiniai įrašai",
      "Auto užduočių išlaidos",
      "Dokumentai / čekiai"
    ]
  ];
  for (const c of d.cars || []) {
    const bought = (d.bought || []).some(x => x.id === c.id);
    const sold = (d.sold || []).some(x => x.id === c.id);
    const tx = (d.tx || []).filter(t => t.carId === c.id);
    const taskExpense = tx
      .filter(t => t.type === "expense" && t.source === "carTask")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const docCount =
      (d.docsByCar?.[c.id] || []).length + tx.reduce((n, t) => n + (t.attachments || []).length, 0);
    const events = [
      bought ? "Pirkimas" : "",
      sold ? "Pardavimas" : "",
      tx.length ? "Finansai" : "",
      (d.docsByCar?.[c.id] || []).length ? "Dokumentai" : ""
    ]
      .filter(Boolean)
      .join(", ");
    rows.push([
      c.name || "",
      events,
      bought ? Number(c.buyPrice || 0) : "",
      sold ? Number(c.soldPrice || 0) : "",
      tx.length,
      taskExpense || "",
      docCount
    ]);
  }
  return "\ufeff" + rows.map(r => r.map(q).join(";")).join("\r\n");
}
function accountingPeriodCarSummaryV24(c, d, range) {
  const bought = (d.bought || []).some(x => x.id === c.id);
  const sold = (d.sold || []).some(x => x.id === c.id);
  const tx = (d.tx || []).filter(t => t.carId === c.id);
  const docs = d.docsByCar?.[c.id] || [];
  const lines = [
    `Automobilis: ${c.name || "—"}`,
    `VIN: ${c.vin || "—"}`,
    `Valst. nr.: ${c.plate || "—"}`,
    `Ataskaitos laikotarpis: ${range.from} – ${range.to}`,
    ""
  ];
  if (bought) lines.push(`Pirkimas: ${c.createdDateISO || "—"} · ${moneyFmt(c.buyPrice || 0)}`);
  if (sold) lines.push(`Pardavimas: ${c.soldDateISO || "—"} · ${moneyFmt(c.soldPrice || 0)}`);
  if (tx.length) {
    lines.push("", "FINANSINIAI ĮRAŠAI");
    tx.forEach(t =>
      lines.push(
        `${t.date} · ${t.type === "income" ? "+" : "-"}${moneyFmt(t.amount)} · ${t.category || t.title || ""}${t.source === "carTask" ? " · auto užduotis" : ""} · priedų ${(t.attachments || []).length}`
      )
    );
  }
  if (docs.length) {
    lines.push("", "ŠIO LAIKOTARPIO AUTOMOBILIO DOKUMENTAI");
    docs.forEach((doc, i) =>
      lines.push(`${i + 1}. ${accountingDocumentDateV24(doc, c) || "—"} · ${doc.name}`)
    );
  }
  if (!bought && !sold && !tx.length && !docs.length) lines.push("Šiam laikotarpiui įrašų nėra.");
  return lines.join("\r\n");
}
function accountingReportSummaryV8(range, d) {
  const totalIncome = Number(d.sales || 0) + Number(d.income || 0);
  const totalExpense = Number(d.purchases || 0) + Number(d.expense || 0);
  return [
    window.AutoEasierProfile.upperName() + " — BUHALTERIJOS ATASKAITA",
    "",
    `Laikotarpis: ${range.from} – ${range.to}`,
    "Įtraukti tik šio laikotarpio įrašai, dokumentai ir čekiai.",
    "",
    `Nupirkta automobilių: ${d.bought.length}`,
    `Auto pirkimai: ${moneyFmt(d.purchases)}`,
    `Parduota automobilių: ${d.sold.length}`,
    `Auto pardavimai: ${moneyFmt(d.sales)}`,
    `Kitos įplaukos: ${moneyFmt(d.income)}`,
    `Kitos išlaidos: ${moneyFmt(d.expense)}`,
    `Iš jų auto užduočių išlaidos: ${moneyFmt((d.taskExpenses || []).reduce((s, t) => s + Number(t.amount || 0), 0))}`,
    `Pajamos iš viso: ${moneyFmt(totalIncome)}`,
    `Išlaidos iš viso: ${moneyFmt(totalExpense)}`,
    `Laikotarpio pokytis: ${moneyFmt(totalIncome - totalExpense)}`,
    `Finansinių įrašų: ${d.tx.length}`,
    `Automobilių dokumentų: ${d.carDocumentCount || 0}`,
    `Čekių / finansinių priedų: ${d.attachmentCount || 0}`
  ].join("\r\n");
}
async function buildAccountingReportZipV8(range) {
  const d = accountingReportDataV8(range),
    entries = [];
  entries.push({
    name: "00-Ataskaitos-suvestine.txt",
    blob: new Blob([accountingReportSummaryV8(range, d)], { type: "text/plain;charset=utf-8" })
  });
  entries.push({
    name: "01-Islaidos-ir-iplaukos.csv",
    blob: new Blob([accountingTransactionsCsvV8(d.tx)], { type: "text/csv;charset=utf-8" })
  });
  if (d.cars.length)
    entries.push({
      name: "02-Automobiliai.csv",
      blob: new Blob([accountingPeriodCarsCsvV24(d, range)], { type: "text/csv;charset=utf-8" })
    });
  for (let i = 0; i < d.cars.length; i++) {
    const c = d.cars[i],
      folder = `Automobiliai/${String(i + 1).padStart(2, "0")}-${accountingSafeName(c.name)}`;
    entries.push({
      name: `${folder}/Isvestines-ir-suvestine.txt`,
      blob: new Blob([accountingPeriodCarSummaryV24(c, d, range)], { type: "text/plain;charset=utf-8" })
    });
    const periodDocs = d.docsByCar?.[c.id] || [];
    for (let j = 0; j < periodDocs.length; j++) {
      const doc = periodDocs[j],
        ext = (doc.name.match(/\.[A-Za-z0-9]+$/) || [""])[0],
        kind = DOC_TYPES.find(x => x[0] === doc.kind)?.[1] || "Dokumentas";
      entries.push({
        name: `${folder}/Dokumentai/${String(j + 1).padStart(2, "0")}-${accountingSafeName(kind)}-${accountingSafeName(doc.name.replace(/\.[A-Za-z0-9]+$/, ""))}${ext}`,
        blob: await documentBlob(doc.key)
      });
    }
  }
  const txWithFiles = d.tx.filter(t => (t.attachments || []).length);
  for (let i = 0; i < txWithFiles.length; i++) {
    const t = txWithFiles[i],
      car = state.cars.find(c => c.id === t.carId),
      folder = `Finansiniai-dokumentai/${t.date}-${accountingSafeName(t.category || t.title || t.type)}${car ? "-" + accountingSafeName(car.name) : ""}`;
    for (let j = 0; j < t.attachments.length; j++) {
      const a = t.attachments[j],
        ext = (a.name.match(/\.[A-Za-z0-9]+$/) || [""])[0];
      entries.push({
        name: `${folder}/${String(j + 1).padStart(2, "0")}-${accountingSafeName(a.name.replace(/\.[A-Za-z0-9]+$/, ""))}${ext}`,
        blob: await documentBlob(a.key)
      });
    }
  }
  const blob = await makeZip(entries),
    name = `${window.AutoEasierProfile.fileName()}-Ataskaita-${range.from}-${range.to}.zip`;
  return { blob, name, data: d };
}
async function shareAccountingReportV8(range) {
  try {
    const pack = await buildAccountingReportZipV8(range),
      file = new File([pack.blob], pack.name, { type: "application/zip" }),
      email = state.accounting.email || "",
      subject = `${profileDisplayNameV57() || "AutoEasier"} — ataskaita ${range.from} – ${range.to}`;
    let shared = false;
    if (navigator.share) {
      try {
        const payload = { files: [file], title: subject, text: `Buhalterei: ${email}` };
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          shared = true;
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    if (!shared) {
      downloadAccountingBlob(pack.blob, pack.name);
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("Paruošta pasirinkto laikotarpio ZIP ataskaita su automobilių dokumentais, išlaidomis, įplaukomis ir prisegtais čekiais / dokumentais.")}`;
    }
    addHistory("Buhalterija", `Ataskaita ${range.from} – ${range.to}`, "📊");
    saveState();
    toast("Ataskaita paruošta", "✓");
  } catch (e) {
    console.error(e);
    toast(e.message || "Nepavyko paruošti ataskaitos", "!");
  }
}
function accountingReportsV8() {
  state.ui = state.ui || {};
  const mode = state.ui.accountingReportMode || "today";
  const range = accountingRangeV8(mode);
  const d = accountingReportDataV8(range);
  const totalIncome = Number(d.sales || 0) + Number(d.income || 0);
  const totalExpense = Number(d.purchases || 0) + Number(d.expense || 0);
  return `<section class="accountingWorkspace show strictPeriodReportV24">\n      <div class="accountingWorkspaceHead"><h3>Ataskaitos</h3><span class="strictPeriodBadgeV24">${escapeHTML(range.from)} – ${escapeHTML(range.to)}</span></div>\n      <div class="accountingReportModes">\n        ${[
    ["today", "Šiandien"],
    ["week", "Ši savaitė"],
    ["month", "Šis mėnuo"],
    ["custom", "Laikotarpis"]
  ]
    .map(
      ([v, l]) =>
        `<button class="accountingReportMode ${mode === v ? "active" : ""}" type="button" data-report-mode="${v}">${l}</button>`
    )
    .join(
      ""
    )}\n      </div>\n      ${mode === "custom" ? `<div class="accountingRangeGrid"><div class="field"><label>Nuo</label><input class="input" id="accountingReportFrom" type="date" value="${escapeHTML(range.from)}"></div><div class="field"><label>Iki</label><input class="input" id="accountingReportTo" type="date" value="${escapeHTML(range.to)}"></div></div>` : ""}\n      <div class="accountingReportSummary">\n        <div class="accountingReportStat"><span>Pajamos</span><strong>${moneyFmt(totalIncome)}</strong></div>\n        <div class="accountingReportStat"><span>Išlaidos</span><strong>${moneyFmt(totalExpense)}</strong></div>\n        <div class="accountingReportStat"><span>Įrašai</span><strong>${d.tx.length + d.bought.length + d.sold.length}</strong></div>\n        <div class="accountingReportStat"><span>Dok. / čekiai</span><strong>${d.docCount || 0}</strong></div>\n      </div>\n      <div class="strictPeriodNoteV24">ZIP bus įtraukti tik šio laikotarpio duomenys ir dokumentai.</div>\n      <button class="btn" id="accountingBuildReportV8" type="button">Paruošti ZIP ataskaitą</button>\n    </section>`;
}
const __renderFinancePageV8 = renderFinancePage;
renderFinancePage = function () {
  __renderFinancePageV8();
  ensureAccountingTransactionsV8();
  const root = document.getElementById("financeTxRoot");
  if (!root) return;
  const txs = state.finances.transactions;
  root.innerHTML = txs.length
    ? txs
        .map(tx => {
          const car = state.cars.find(c => c.id === tx.carId),
            files = (tx.attachments || []).length;
          return `<div class="financeRow"><div><strong>${escapeHTML(tx.title || "")}</strong><span>${[car?.name, tx.note, files ? `📎 ${files}` : ""].filter(Boolean).map(escapeHTML).join(" · ")}</span></div><div style="text-align:right"><strong style="color:${tx.type === "income" ? "var(--success)" : "var(--danger)"}">${tx.type === "income" ? "+" : "-"}${moneyFmt(tx.amount)}</strong><span>${escapeHTML(tx.date || "")}</span></div></div>`;
        })
        .join("")
    : '<div class="emptyState">Finansinių įrašų dar nėra.</div>';
};
renderAccountingCenter = function () {
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  ensureAccounting();
  ensureAccountingTransactionsV8();
  ensureCarTaskExpenseTransactionsV24();
  state.ui = state.ui || {};
  const panel = state.ui.accountingPanel || "";
  const queued = state.accounting.queue
    .map(id => state.cars.find(c => c.id === id && c.status === "parduotas"))
    .filter(Boolean);
  let workspace = "";
  if (panel === "pp") workspace = accountingPpChooserV3();
  else if (panel === "reports") workspace = accountingReportsV8();
  else if (panel === "expense" || panel === "income") workspace = accountingMoneyFormV8(panel);
  else if (panel === "queue")
    workspace = `<section class="accountingWorkspace show"><div class="accountingWorkspaceHead"><h3>Dokumentai buhalterei</h3></div><div class="accountingCleanRows">${queued.map(c => `<div class="accountingCleanRow"><button type="button" data-accounting-open-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><span>${(c.documents || []).length} dok.</span></button><button class="accountingCleanRemove" type="button" data-accounting-queue-car="${escapeHTML(c.id)}">×</button></div>`).join("") || '<div class="accountingCleanEmpty">Įrašų nėra</div>'}</div><button class="btn accountingWorkspaceAction" id="accountingWorkspaceSend" type="button" ${queued.length ? "" : "disabled"}>Paruošti ZIP ir teikti</button></section>`;
  const action = (key, ico, title, wide = "") =>
    `<button type="button" class="accountingProAction ${wide} ${panel === key ? "active" : ""}" data-accounting-panel="${key}"><span class="left"><span class="ico">${ico}</span><strong>${title}</strong></span><span class="chev">›</span></button>`;
  root.innerHTML = `<div class="accountingCleanHub"><div class="accountingProMenu">${action("pp", "🧾", "Generuoti PP")}${action("reports", "📊", "Ataskaitos")}${action("expense", "💸", "Pridėti išlaidą")}${action("income", "💶", "Pridėti įplauką")}${action("queue", "📁", "Dokumentai buhalterei", "wide")}</div>${workspace}<details class="accountingEmailFold"><summary><span>✉️</span><strong>Buhalterės el. paštas</strong><b>›</b></summary><div class="accountingEmailFoldBody"><input class="input" id="accountantEmail" type="email" value="${escapeHTML(state.accounting.email || "")}"><button class="btn secondary" id="saveAccountantEmail" type="button">Išsaugoti</button></div></details></div>`;
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
    const r = accountingRangeV8(state.ui.accountingReportMode || "today");
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
      const n = moneyFiles.files?.length || 0;
      const c = document.getElementById("accountingMoneyFileCount");
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
};
