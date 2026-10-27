(function () {
  const COMPANY_CODE_V25 = "587119941";
  const EXPENSE_GROUPS_V25 = [
    "Servisas",
    "Detalės",
    "Plovimas",
    "Kuras",
    "Transportas",
    "Reklama",
    "Mokesčiai",
    "Kita"
  ];
  function v25LocalISO(d) {
    return typeof toISODateLocal === "function"
      ? toISODateLocal(d)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function v25Today() {
    return typeof todayISO === "function" ? todayISO() : v25LocalISO(new Date());
  }
  function v25Monday() {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return v25LocalISO(d);
  }
  function v25DocDate(doc, car) {
    const direct =
      doc?.addedDateISO ||
      accountingDateISOFromValueV24?.(doc?.addedAt) ||
      accountingDateISOFromValueV24?.(doc?.date) ||
      "";
    if (direct) return direct;
    if (doc?.kind === "purchase") return car?.createdDateISO || "";
    if (doc?.kind === "sale") return car?.soldDateISO || "";
    return "";
  }
  function v25InRange(v, range) {
    return !!v && v >= range.from && v <= range.to;
  }
  function v25CarName(id) {
    return (state.cars || []).find(c => c.id === id)?.name || "";
  }
  function v25Category(raw = "") {
    const s = String(raw || "").toLocaleLowerCase("lt");
    if (/servis|remont|diagnost|meistr|suvir|daž|daz|polir/.test(s)) return "Servisas";
    if (/detal|padang|akumuliat|lemput|alyv|filtr/.test(s)) return "Detalės";
    if (/plov|švar|svar|valym/.test(s)) return "Plovimas";
    if (/kuras|degal/.test(s)) return "Kuras";
    if (/transport|trali|parvež|parvez|evaku/.test(s)) return "Transportas";
    if (/reklam|skelb/.test(s)) return "Reklama";
    if (/mokes|rinkliav|regitr|registr/.test(s)) return "Mokesčiai";
    return "Kita";
  }
  function v25Ext(name = "") {
    const m = String(name).match(/\.[A-Za-z0-9]{1,8}$/);
    return m ? m[0] : "";
  }
  function v25Base(name = "") {
    return String(name || "dokumentas").replace(/\.[A-Za-z0-9]{1,8}$/, "");
  }
  function v25Safe(s = "") {
    return (
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 72) || "Irasas"
    );
  }
  function v25AmountFile(v) {
    const n = Math.abs(Number(v || 0));
    return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", "-")) + "EUR";
  }
  function v25TxtMoney(v) {
    return (
      Number(v || 0)
        .toFixed(2)
        .replace(".", ",") + " EUR"
    );
  }
  function v25Csv(rows) {
    return "\ufeff" + rows.map(r => r.map(accountingCsvCellV8).join(";")).join("\r\n");
  }
  function v25DocCountForCarEvent(c, kind, d) {
    return (d.docsByCar?.[c.id] || []).filter(x => x.kind === kind).length;
  }
  accountingRangeV8 = function (mode) {
    state.ui = state.ui || {};
    const now = new Date(),
      today = v25Today();
    if (mode === "today") return { from: today, to: today, label: "Šiandien" };
    if (mode === "week") return { from: v25Monday(), to: today, label: "Ši savaitė" };
    if (mode === "month")
      return {
        from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
        to: today,
        label: "Šis mėnuo"
      };
    if (mode === "prevmonth") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1),
        last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: v25LocalISO(first), to: v25LocalISO(last), label: "Praėjęs mėnuo" };
    }
    if (mode === "year") return { from: `${now.getFullYear()}-01-01`, to: today, label: "Šie metai" };
    const from =
      state.ui.accountingReportFrom ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const to = state.ui.accountingReportTo || today;
    return { from, to, label: `${from} – ${to}` };
  };
  accountingReportDataV8 = function (range) {
    ensureAccountingTransactionsV8();
    ensureCarTaskExpenseTransactionsV24();
    const inRange = d => v25InRange(d, range);
    const bought = (state.cars || []).filter(c => inRange(c.createdDateISO));
    const sold = (state.cars || []).filter(c => c.status === "parduotas" && inRange(c.soldDateISO));
    const tx = (state.finances?.transactions || []).filter(t => inRange(t.date));
    const docsByCar = {},
      undatedDocs = [];
    for (const car of state.cars || []) {
      const docs = [];
      for (const doc of car.documents || []) {
        const date = v25DocDate(doc, car);
        if (date && inRange(date)) docs.push({ ...doc, __reportDate: date });
        else if (!date) undatedDocs.push({ car, doc });
      }
      docsByCar[car.id] = docs;
    }
    const txCars = tx.map(t => (state.cars || []).find(c => c.id === t.carId)).filter(Boolean);
    const docCars = (state.cars || []).filter(c => (docsByCar[c.id] || []).length);
    const cars = [...new Map([...bought, ...sold, ...txCars, ...docCars].map(c => [c.id, c])).values()];
    const income = tx
      .filter(t => t.type === "income")
      .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
    const expense = tx
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
    const sales = sold.reduce((s, c) => s + Number(c.soldPrice || 0), 0);
    const purchases = bought.reduce((s, c) => s + Number(c.buyPrice || 0), 0);
    const carDocumentCount = cars.reduce((n, c) => n + (docsByCar[c.id] || []).length, 0);
    const attachmentCount = tx.reduce((n, t) => n + (t.attachments || []).length, 0);
    const totalIncome = sales + income,
      totalExpense = purchases + expense,
      net = totalIncome - totalExpense;
    const taskExpenses = tx.filter(t => t.type === "expense" && t.source === "carTask");
    const categoryTotals = Object.fromEntries(EXPENSE_GROUPS_V25.map(k => [k, 0]));
    tx.filter(t => t.type === "expense").forEach(t => {
      const k = v25Category(t.category || t.title || "");
      categoryTotals[k] = (categoryTotals[k] || 0) + Math.abs(Number(t.amount || 0));
    });
    return {
      bought,
      sold,
      cars,
      tx,
      docsByCar,
      income,
      expense,
      sales,
      purchases,
      totalIncome,
      totalExpense,
      net,
      taskExpenses,
      categoryTotals,
      carDocumentCount,
      attachmentCount,
      docCount: carDocumentCount + attachmentCount,
      undatedDocs
    };
  };
  function v25Rows(d) {
    const rows = [];
    for (const c of d.bought) {
      rows.push({
        date: c.createdDateISO,
        type: "Išlaida",
        car: c.name || "",
        category: "Automobilio pirkimas",
        description: `Automobilio pirkimas: ${c.name || ""}`,
        amount: -Math.abs(Number(c.buyPrice || 0)),
        docs: v25DocCountForCarEvent(c, "purchase", d),
        kind: "purchase",
        carId: c.id
      });
    }
    for (const c of d.sold) {
      rows.push({
        date: c.soldDateISO,
        type: "Pajamos",
        car: c.name || "",
        category: "Automobilio pardavimas",
        description: `Automobilio pardavimas: ${c.name || ""}`,
        amount: Math.abs(Number(c.soldPrice || 0)),
        docs: v25DocCountForCarEvent(c, "sale", d),
        kind: "sale",
        carId: c.id
      });
    }
    for (const t of d.tx) {
      const isIncome = t.type === "income",
        cat = t.category || t.title || (isIncome ? "Kita įplauka" : "Kita");
      const desc =
        t.source === "carTask" ? `Auto užduotis: ${t.title || t.category || ""}` : t.note || t.title || cat;
      rows.push({
        date: t.date || "",
        type: isIncome ? "Pajamos" : "Išlaida",
        car: v25CarName(t.carId),
        category: cat,
        description: desc,
        amount: (isIncome ? 1 : -1) * Math.abs(Number(t.amount || 0)),
        docs: (t.attachments || []).length,
        kind: "tx",
        tx: t,
        carId: t.carId || ""
      });
    }
    return rows.sort(
      (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.type).localeCompare(String(b.type))
    );
  }
  function v25OperationsCsv(d, filter = "all") {
    let rows = v25Rows(d);
    if (filter === "income") rows = rows.filter(r => r.amount >= 0);
    if (filter === "expense") rows = rows.filter(r => r.amount < 0);
    const data = [["Data", "Tipas", "Automobilis", "Kategorija", "Aprašymas", "Suma", "Dokumentai"]];
    rows.forEach(r =>
      data.push([
        r.date,
        r.type,
        r.car,
        r.category,
        r.description,
        Number(r.amount || 0).toFixed(2),
        r.docs || 0
      ])
    );
    return v25Csv(data);
  }
  accountingReportSummaryV8 = function (range, d) {
    const lines = [
      "VISUREIGIAI, UAB — BUHALTERIJOS ATASKAITA",
      `Įmonės kodas: ${COMPANY_CODE_V25}`,
      `Laikotarpis: ${range.from} – ${range.to}`,
      "",
      "PAJAMOS",
      `Automobilių pardavimai: ${v25TxtMoney(d.sales)}`,
      `Kitos pajamos: ${v25TxtMoney(d.income)}`,
      `Pajamos iš viso: ${v25TxtMoney(d.totalIncome)}`,
      "",
      "IŠLAIDOS",
      `Automobilių pirkimai: ${v25TxtMoney(d.purchases)}`,
      ...EXPENSE_GROUPS_V25.map(k => `${k}: ${v25TxtMoney(d.categoryTotals[k] || 0)}`),
      `Išlaidos iš viso: ${v25TxtMoney(d.totalExpense)}`,
      "",
      "REZULTATAS",
      `Pajamos: ${v25TxtMoney(d.totalIncome)}`,
      `Išlaidos: ${v25TxtMoney(d.totalExpense)}`,
      `Skirtumas: ${v25TxtMoney(d.net)}`,
      "",
      `Nupirkta automobilių: ${d.bought.length}`,
      `Parduota automobilių: ${d.sold.length}`,
      `Finansinių operacijų: ${d.tx.length}`,
      `Auto užduočių išlaidų: ${d.taskExpenses.length} (${v25TxtMoney(d.taskExpenses.reduce((s, t) => s + Number(t.amount || 0), 0))})`,
      `Čekių / dokumentų: ${d.docCount}`,
      "",
      "Įtraukti tik pasirinkto laikotarpio duomenys ir dokumentai."
    ];
    if (d.undatedDocs?.length)
      lines.push(
        `Pastaba: ${d.undatedDocs.length} seni dokumentai be nustatomos datos į ataskaitą neįtraukti.`
      );
    return lines.join("\r\n");
  };
  function v25Html(range, d) {
    const e = escapeHTML;
    const rows =
      v25Rows(d)
        .map(
          r =>
            `<tr><td>${e(r.date)}</td><td>${e(r.type)}</td><td>${e(r.car || "—")}</td><td>${e(r.category)}</td><td>${e(r.description)}</td><td class="money ${r.amount < 0 ? "neg" : "pos"}">${r.amount < 0 ? "-" : "+"}${e(moneyFmt(Math.abs(r.amount)))}</td><td>${r.docs || 0}</td></tr>`
        )
        .join("") || '<tr><td colspan="7">Šiuo laikotarpiu įrašų nėra.</td></tr>';
    const cats = EXPENSE_GROUPS_V25.map(
      k => `<div><span>${e(k)}</span><b>${e(moneyFmt(d.categoryTotals[k] || 0))}</b></div>`
    ).join("");
    return `<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visureigiai, UAB — ${e(range.from)}–${e(range.to)}</title><style>body{font-family:Arial,sans-serif;color:#142033;margin:28px;line-height:1.35}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}.meta{color:#627187;font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0}.card{border:1px solid #dfe6ed;border-radius:11px;padding:11px}.card span{display:block;color:#68778a;font-size:11px}.card b{display:block;margin-top:5px;font-size:18px}.cats{display:grid;grid-template-columns:repeat(2,1fr);gap:0;border:1px solid #e2e7ed;border-radius:10px;overflow:hidden}.cats div{padding:8px 10px;border-bottom:1px solid #edf0f3;display:flex;justify-content:space-between;gap:10px;font-size:12px}.cats span{color:#65748a}.result{font-size:18px}.pos{color:#08734f}.neg{color:#b61933}table{border-collapse:collapse;width:100%;font-size:11px}th,td{padding:7px 8px;border-bottom:1px solid #e6eaee;text-align:left;vertical-align:top}th{background:#f5f7f9;font-size:10.5px}.money{white-space:nowrap;font-weight:700}.note{margin-top:14px;padding:9px 10px;background:#f5f9fd;border:1px solid #dce8f3;border-radius:9px;color:#49627d;font-size:11px}@media print{body{margin:10mm}.grid{grid-template-columns:repeat(3,1fr)}}</style></head><body><h1>Visureigiai, UAB</h1><div class="meta">Įmonės kodas: ${COMPANY_CODE_V25}<br>Laikotarpis: ${e(range.from)} – ${e(range.to)}</div><h2>PAJAMOS</h2><div class="grid"><div class="card"><span>Automobilių pardavimai</span><b class="pos">${e(moneyFmt(d.sales))}</b></div><div class="card"><span>Kitos pajamos</span><b class="pos">${e(moneyFmt(d.income))}</b></div><div class="card"><span>Pajamos iš viso</span><b class="pos">${e(moneyFmt(d.totalIncome))}</b></div></div><h2>IŠLAIDOS</h2><div class="card"><span>Automobilių pirkimai</span><b class="neg">${e(moneyFmt(d.purchases))}</b></div><div class="cats">${cats}</div><div class="grid"><div class="card"><span>Išlaidos iš viso</span><b class="neg">${e(moneyFmt(d.totalExpense))}</b></div><div class="card"><span>Čekiai / dokumentai</span><b>${d.docCount}</b></div><div class="card"><span>Finansinės operacijos</span><b>${d.tx.length}</b></div></div><h2>REZULTATAS</h2><div class="card result"><span>Pajamos ${e(moneyFmt(d.totalIncome))} − Išlaidos ${e(moneyFmt(d.totalExpense))}</span><b class="${d.net >= 0 ? "pos" : "neg"}">${d.net >= 0 ? "+" : ""}${e(moneyFmt(d.net))}</b></div><h2>OPERACIJOS</h2><table><thead><tr><th>Data</th><th>Tipas</th><th>Automobilis</th><th>Kategorija</th><th>Aprašymas</th><th>Suma</th><th>Dokumentai</th></tr></thead><tbody>${rows}</tbody></table><div class="note">Į ataskaitą įtraukti tik pasirinkto laikotarpio duomenys, čekiai ir dokumentai.${d.undatedDocs?.length ? ` ${d.undatedDocs.length} seni dokumentai be nustatomos datos neįtraukti.` : ""}</div></body></html>`;
  }
  function v25CarSummary(c, d, range) {
    const tx = d.tx.filter(t => t.carId === c.id),
      docs = d.docsByCar?.[c.id] || [],
      lines = [
        `Automobilis: ${c.name || "—"}`,
        `VIN: ${c.vin || "—"}`,
        `Valst. nr.: ${c.plate || "—"}`,
        `Laikotarpis: ${range.from} – ${range.to}`,
        ""
      ];
    if (d.bought.some(x => x.id === c.id))
      lines.push(`Pirkimas: ${c.createdDateISO} · ${v25TxtMoney(c.buyPrice)}`);
    if (d.sold.some(x => x.id === c.id))
      lines.push(`Pardavimas: ${c.soldDateISO} · ${v25TxtMoney(c.soldPrice)}`);
    if (tx.length) {
      lines.push("", "FINANSINIAI ĮRAŠAI");
      tx.forEach(t =>
        lines.push(
          `${t.date} · ${t.type === "income" ? "+" : "-"}${v25TxtMoney(t.amount)} · ${t.category || t.title || ""}${t.source === "carTask" ? " · Auto užduotis" : ""} · priedų ${(t.attachments || []).length}`
        )
      );
    }
    if (docs.length) {
      lines.push("", "DOKUMENTAI");
      docs.forEach((doc, i) =>
        lines.push(
          `${i + 1}. ${doc.__reportDate || v25DocDate(doc, c) || "—"} · ${DOC_TYPES.find(x => x[0] === doc.kind)?.[1] || doc.kind || "Dokumentas"} · ${doc.name || ""}`
        )
      );
    }
    return lines.join("\r\n");
  }
  async function v25PushDoc(entries, path, ref) {
    try {
      entries.push({ name: path, blob: await documentBlob(ref.key) });
    } catch (err) {
      console.warn("Nepavyko į ZIP įtraukti dokumento", ref?.name, err);
    }
  }
  function v25DocFolder(kind) {
    if (kind === "purchase") return "Pirkimo_dokumentai";
    if (kind === "sale") return "Pardavimo_dokumentai";
    if (kind === "receipt") return "Cekiai";
    return "Kiti_dokumentai";
  }
  function v25TxAttachmentName(t, a, index, car) {
    const ext = v25Ext(a.name),
      date = t.date || v25Today(),
      carPart = car ? v25Safe(car.name) : "Imone",
      cat = v25Safe(t.category || t.title || (t.type === "income" ? "Pajamos" : "Islaida")),
      amount = v25AmountFile(t.amount),
      kind = t.type === "expense" ? "cekis" : "dokumentas";
    return `${date}_${carPart}_${cat}_${amount}_${kind}${index ? `_${index + 1}` : ""}${ext}`;
  }
  function v25CarDocName(c, doc, index) {
    const ext = v25Ext(doc.name),
      date = doc.__reportDate || v25DocDate(doc, c) || "be_datos",
      kind = v25Safe(DOC_TYPES.find(x => x[0] === doc.kind)?.[1] || doc.kind || "Dokumentas");
    return `${date}_${v25Safe(c.name)}_${kind}${index ? `_${index + 1}` : ""}${ext}`;
  }
  buildAccountingReportZipV8 = async function (range) {
    const d = accountingReportDataV8(range),
      entries = [];
    entries.push({
      name: "00-SUVESTINE/Ataskaita.html",
      blob: new Blob([v25Html(range, d)], { type: "text/html;charset=utf-8" })
    });
    entries.push({
      name: "00-SUVESTINE/Ataskaita.txt",
      blob: new Blob([accountingReportSummaryV8(range, d)], { type: "text/plain;charset=utf-8" })
    });
    entries.push({
      name: "01-OPERACIJOS/Visos_operacijos.csv",
      blob: new Blob([v25OperationsCsv(d, "all")], { type: "text/csv;charset=utf-8" })
    });
    entries.push({
      name: "01-OPERACIJOS/Pajamos.csv",
      blob: new Blob([v25OperationsCsv(d, "income")], { type: "text/csv;charset=utf-8" })
    });
    entries.push({
      name: "01-OPERACIJOS/Islaidos.csv",
      blob: new Blob([v25OperationsCsv(d, "expense")], { type: "text/csv;charset=utf-8" })
    });
    for (const c of d.cars) {
      const carFolder = `02-AUTOMOBILIAI/${v25Safe(c.name)}`;
      entries.push({
        name: `${carFolder}/Suvestine.txt`,
        blob: new Blob([v25CarSummary(c, d, range)], { type: "text/plain;charset=utf-8" })
      });
      const docs = d.docsByCar?.[c.id] || [];
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i],
          fileName = v25CarDocName(c, doc, i),
          sub = v25DocFolder(doc.kind);
        await v25PushDoc(entries, `${carFolder}/${sub}/${fileName}`, doc);
        await v25PushDoc(entries, `03-CEKIAI-IR-DOKUMENTAI/${fileName}`, doc);
      }
      const carTx = d.tx.filter(
        t => t.carId === c.id && Array.isArray(t.attachments) && t.attachments.length
      );
      for (const t of carTx) {
        for (let i = 0; i < t.attachments.length; i++) {
          const a = t.attachments[i],
            fileName = v25TxAttachmentName(t, a, i, c),
            sub = t.type === "expense" ? "Cekiai" : "Kiti_dokumentai";
          await v25PushDoc(entries, `${carFolder}/${sub}/${fileName}`, a);
          await v25PushDoc(entries, `03-CEKIAI-IR-DOKUMENTAI/${fileName}`, a);
        }
      }
    }
    const companyTx = d.tx.filter(t => !t.carId && Array.isArray(t.attachments) && t.attachments.length);
    for (const t of companyTx) {
      for (let i = 0; i < t.attachments.length; i++) {
        const a = t.attachments[i],
          fileName = v25TxAttachmentName(t, a, i, null);
        await v25PushDoc(entries, `03-CEKIAI-IR-DOKUMENTAI/${fileName}`, a);
      }
    }
    const blob = await makeZip(entries);
    return { blob, name: `Visureigiai_${range.from}_${range.to}.zip`, data: d };
  };
  accountingReportsV8 = function () {
    state.ui = state.ui || {};
    const mode = state.ui.accountingReportMode || "month",
      range = accountingRangeV8(mode),
      d = accountingReportDataV8(range),
      events = d.bought.length + d.sold.length + d.tx.length;
    const taskTotal = d.taskExpenses.reduce((s, t) => s + Number(t.amount || 0), 0);
    return `<section class="accountingWorkspace show accountingReportV25">\n      <div class="reportV25Head"><h3>Ataskaita buhalterei</h3><span class="reportV25Range">${escapeHTML(range.from)} – ${escapeHTML(range.to)}</span></div>\n      <div class="reportV25Presets">${[
      ["today", "Šiandien"],
      ["week", "Ši savaitė"],
      ["month", "Šis mėnuo"],
      ["prevmonth", "Praėjęs mėnuo"],
      ["year", "Šie metai"],
      ["custom", "Pasirinkti laikotarpį"]
    ]
      .map(
        ([v, l]) =>
          `<button class="${mode === v ? "active" : ""}" type="button" data-report-mode="${v}">${l}</button>`
      )
      .join(
        ""
      )}</div>\n      ${mode === "custom" ? `<div class="reportV25Custom"><div class="field"><label>Nuo</label><input class="input" id="accountingReportFrom" type="date" value="${escapeHTML(range.from)}"></div><div class="field"><label>Iki</label><input class="input" id="accountingReportTo" type="date" value="${escapeHTML(range.to)}"></div></div>` : ""}\n      <div class="reportV25Metrics"><div class="reportV25Metric income"><span>Pajamos</span><strong>${moneyFmt(d.totalIncome)}</strong></div><div class="reportV25Metric expense"><span>Išlaidos</span><strong>${moneyFmt(d.totalExpense)}</strong></div><div class="reportV25Metric"><span>Operacijų</span><strong>${events}</strong></div><div class="reportV25Metric"><span>Čekių / dokumentų</span><strong>${d.docCount}</strong></div></div>\n      <div class="reportV25Breakdown"><div class="reportV25Row"><span>Automobilių pirkimai</span><strong>${d.bought.length} · ${moneyFmt(d.purchases)}</strong></div><div class="reportV25Row"><span>Automobilių pardavimai</span><strong>${d.sold.length} · ${moneyFmt(d.sales)}</strong></div><div class="reportV25Row"><span>Auto užduočių išlaidos</span><strong>${d.taskExpenses.length} · ${moneyFmt(taskTotal)}</strong></div><div class="reportV25Row"><span>Rezultatas</span><strong>${d.net >= 0 ? "+" : ""}${moneyFmt(d.net)}</strong></div></div>\n      <div class="reportV25Notice">Į ZIP bus įtraukti tik pasirinkto laikotarpio duomenys ir dokumentai.</div>\n      ${d.undatedDocs?.length ? `<div class="reportV25Warn">${d.undatedDocs.length} seni dokumentai neturi datos, todėl saugumo sumetimais į šį laikotarpį neįtraukiami.</div>` : ""}\n      <button class="btn" id="accountingBuildReportV8" type="button">Paruošti ZIP buhalterei</button>\n    </section>`;
  };
  completeCarTaskWithExpenseV24 = async function (car, item, expense, attachments = []) {
    ensureAccountingTransactionsV8();
    const amount = Math.max(0, Number(expense || 0));
    if (amount > 0 && (!Array.isArray(attachments) || !attachments.length))
      throw Error("Prisek čekį arba sąskaitą.");
    const existing = (state.finances.transactions || []).find(
      t =>
        t.source === "carTask" &&
        t.carId === car.id &&
        (t.linkedTaskId === item.id || t.id === item.expenseTxId)
    );
    if (amount > 0 && !existing) {
      const entry = {
        id: uid(),
        type: "expense",
        amount,
        title: item.name || "Automobilio užduotis",
        category: taskExpenseCategoryV24(item.name),
        note: `Auto užduotis: ${item.name || ""}`,
        date: v25Today(),
        carId: car.id,
        linkedTaskId: item.id,
        attachments: [...attachments],
        source: "carTask",
        createdAt: nowLabel()
      };
      state.finances.transactions.unshift(entry);
      item.expenseTxId = entry.id;
      item.receipts = [...attachments];
    } else if (existing) {
      existing.amount = amount;
      existing.date = existing.date || v25Today();
      existing.attachments = existing.attachments?.length ? existing.attachments : [...attachments];
      item.expenseTxId = existing.id;
      item.receipts = [...(existing.attachments || [])];
    }
    completeCarChecklistItem(car.id, item.id, amount);
    item.doneDateISO = item.doneDateISO || v25Today();
    saveState();
  };
  try {
    ensureCarTaskExpenseTransactionsV24();
  } catch (e) {
    console.warn(e);
  }
})();
