(function () {
  document.querySelectorAll('.navBtn[data-view="finance"]').forEach(b => b.remove());
  const __accountingRangeV16 = typeof accountingRangeV8 === "function" ? accountingRangeV8 : null;
  accountingRangeV8 = function (mode) {
    const now = new Date(),
      today = typeof todayISO === "function" ? todayISO() : now.toISOString().slice(0, 10);
    if (mode === "prevmonth") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1),
        last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toISODateLocal(first), to: toISODateLocal(last), label: "Praėjęs mėnuo" };
    }
    if (mode === "year") return { from: `${now.getFullYear()}-01-01`, to: today, label: "Šie metai" };
    if (mode === "custom") {
      state.ui = state.ui || {};
      const from =
        state.ui.accountingReportFrom ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const to = state.ui.accountingReportTo || today;
      return { from, to, label: `${from} – ${to}` };
    }
    return __accountingRangeV16 ? __accountingRangeV16(mode) : { from: today, to: today, label: "Šiandien" };
  };
  const __accountingReportDataV16 =
    typeof accountingReportDataV8 === "function" ? accountingReportDataV8 : null;
  accountingReportDataV8 = function (range) {
    const d = __accountingReportDataV16
      ? __accountingReportDataV16(range)
      : { bought: [], sold: [], cars: [], tx: [], income: 0, expense: 0, sales: 0, purchases: 0 };
    const totalIncome = Number(d.sales || 0) + Number(d.income || 0);
    const totalExpense = Number(d.purchases || 0) + Number(d.expense || 0);
    const net = totalIncome - totalExpense;
    const docCount =
      (d.cars || []).reduce((n, c) => n + (c.documents || []).length, 0) +
      (d.tx || []).reduce((n, t) => n + (t.attachments || []).length, 0);
    const soldMargin = (d.sold || []).reduce(
      (n, c) => n + (typeof carNetProfit === "function" ? Number(carNetProfit(c) || 0) : 0),
      0
    );
    return { ...d, totalIncome, totalExpense, net, docCount, soldMargin };
  };
  function v16Csv(rows) {
    return "\ufeff" + rows.map(r => r.map(accountingCsvCellV8).join(";")).join("\r\n");
  }
  function v16CarName(id) {
    return (state.cars || []).find(c => c.id === id)?.name || "";
  }
  function v16TypeLabel(t) {
    return t === "income" ? "Įplauka" : "Išlaida";
  }
  function v16MoneyPlain(v) {
    return Number(v || 0)
      .toFixed(2)
      .replace(".", ",");
  }
  function v16DateHuman(v = "") {
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : String(v || "");
  }
  function accountingBoughtCsvV16(cars) {
    const rows = [["Data", "Automobilis", "VIN", "Valst. nr.", "Pirkimo kaina", "Dokumentai"]];
    for (const c of cars)
      rows.push([
        c.createdDateISO || "",
        c.name || "",
        c.vin || "",
        c.plate || "",
        Number(c.buyPrice || 0),
        (c.documents || []).length
      ]);
    return v16Csv(rows);
  }
  function accountingSoldCsvV16(cars) {
    const rows = [
      ["Data", "Automobilis", "VIN", "Valst. nr.", "Pardavimo kaina", "Savikaina", "Marža", "Dokumentai"]
    ];
    for (const c of cars) {
      const cost = typeof carTotalCost === "function" ? carTotalCost(c) : Number(c.buyPrice || 0),
        margin = Number(c.soldPrice || 0) - Number(cost || 0);
      rows.push([
        c.soldDateISO || "",
        c.name || "",
        c.vin || "",
        c.plate || "",
        Number(c.soldPrice || 0),
        Number(cost || 0),
        margin,
        (c.documents || []).length
      ]);
    }
    return v16Csv(rows);
  }
  function accountingTxCsvV16(tx, type) {
    const rows = [["Data", "Kategorija", "Suma", "Automobilis", "Pastaba", "Priedai"]];
    tx.filter(t => t.type === type).forEach(t =>
      rows.push([
        t.date || "",
        t.category || t.title || "",
        Number(t.amount || 0),
        v16CarName(t.carId),
        t.note || "",
        (t.attachments || []).length
      ])
    );
    return v16Csv(rows);
  }
  function accountingControlCsvV16(d) {
    const rows = [["Tipas", "Data", "Įrašas", "Automobilis", "Dokumentų / priedų sk."]];
    d.bought.forEach(c =>
      rows.push(["Pirkimas", c.createdDateISO || "", c.name || "", c.name || "", (c.documents || []).length])
    );
    d.sold.forEach(c =>
      rows.push(["Pardavimas", c.soldDateISO || "", c.name || "", c.name || "", (c.documents || []).length])
    );
    d.tx.forEach(t =>
      rows.push([
        v16TypeLabel(t.type),
        t.date || "",
        t.category || t.title || "",
        v16CarName(t.carId),
        (t.attachments || []).length
      ])
    );
    return v16Csv(rows);
  }
  accountingReportSummaryV8 = function (range, d) {
    return [
      "VISUREIGIAI, UAB — BUHALTERIJOS ATASKAITA",
      "",
      `Laikotarpis: ${v16DateHuman(range.from)} – ${v16DateHuman(range.to)}`,
      "",
      "SUVESTINĖ",
      `Pajamos iš viso: ${moneyFmt(d.totalIncome)}`,
      `Išlaidos iš viso: ${moneyFmt(d.totalExpense)}`,
      `Laikotarpio pinigų pokytis: ${moneyFmt(d.net)}`,
      `Parduotų automobilių marža: ${moneyFmt(d.soldMargin)}`,
      `Nupirkta automobilių: ${d.bought.length} (${moneyFmt(d.purchases)})`,
      `Parduota automobilių: ${d.sold.length} (${moneyFmt(d.sales)})`,
      `Kitos įplaukos: ${moneyFmt(d.income)}`,
      `Kitos išlaidos: ${moneyFmt(d.expense)}`,
      `Finansinių įrašų: ${d.tx.length}`,
      `Dokumentų / priedų: ${d.docCount}`,
      "",
      "Pastaba: ši ataskaita sudaryta tik iš įrašų, kurių datos patenka į nurodytą laikotarpį."
    ].join("\r\n");
  };
  function accountingReportHtmlV16(range, d) {
    const row = cells => `<tr>${cells.map(x => `<td>${escapeHTML(String(x ?? ""))}</td>`).join("")}</tr>`;
    const purchases =
      d.bought
        .map(c =>
          row([v16DateHuman(c.createdDateISO), c.name, moneyFmt(c.buyPrice), (c.documents || []).length])
        )
        .join("") || '<tr><td colspan="4">Įrašų nėra</td></tr>';
    const sales =
      d.sold
        .map(c =>
          row([
            v16DateHuman(c.soldDateISO),
            c.name,
            moneyFmt(c.soldPrice),
            moneyFmt(typeof carNetProfit === "function" ? carNetProfit(c) : 0),
            (c.documents || []).length
          ])
        )
        .join("") || '<tr><td colspan="5">Įrašų nėra</td></tr>';
    const tx =
      d.tx
        .map(t =>
          row([
            v16DateHuman(t.date),
            v16TypeLabel(t.type),
            t.category || t.title || "",
            v16CarName(t.carId),
            `${t.type === "income" ? "+" : "-"}${moneyFmt(Math.abs(Number(t.amount || 0)))}`,
            (t.attachments || []).length
          ])
        )
        .join("") || '<tr><td colspan="6">Įrašų nėra</td></tr>';
    return `<!doctype html><html lang="lt"><head><meta charset="utf-8"><title>${window.AutoEasierProfile.htmlName()} ataskaita ${range.from}–${range.to}</title><style>body{font-family:Arial,sans-serif;color:#142033;margin:28px;line-height:1.35}h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:24px 0 8px}.period{color:#607086;margin-bottom:20px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.summary div{border:1px solid #dfe6ed;border-radius:10px;padding:10px}.summary span{display:block;color:#69778a;font-size:11px}.summary b{display:block;margin-top:4px;font-size:17px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:7px 8px;border-bottom:1px solid #e5e9ee;text-align:left;vertical-align:top}th{background:#f5f7f9;font-size:11px}.green{color:#08734f}.red{color:#b61933}@media print{body{margin:12mm}.summary{grid-template-columns:repeat(4,1fr)}}</style>\n<style id="visureigiai-accounting-pro-v25-css">/* ===== Buhalterija PRO v25 ===== */#view-accounting .accountingReportV25{display:grid;gap:10px!important}#view-accounting .reportV25Head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}#view-accounting .reportV25Head h3{margin:0;color:#0b182b;font-size:18px;font-weight:900;letter-spacing:-.035em}#view-accounting .reportV25Range{padding:6px 9px;border-radius:999px;background:#f2f6fa;color:#55677d;font-size:10.5px;font-weight:760;white-space:nowrap}#view-accounting .reportV25Presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}#view-accounting .reportV25Presets button{min-height:39px;padding:0 7px;border:1px solid #e1e8ef;border-radius:11px;background:#fff;color:#55677c;font:inherit;font-size:10.8px;font-weight:780;line-height:1.05}#view-accounting .reportV25Presets button.active{border-color:#cfe2f4;background:linear-gradient(120deg,#eef7ff,#fbfdff);color:#174f89}#view-accounting .reportV25Custom{display:grid;grid-template-columns:1fr 1fr;gap:7px}#view-accounting .reportV25Custom .field{margin:0!important}#view-accounting .reportV25Metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#view-accounting .reportV25Metric{min-height:68px;padding:10px;border:1px solid #e3e9ef;border-radius:13px;background:#fff;display:grid;align-content:center;gap:5px}#view-accounting .reportV25Metric span{color:#6b788b;font-size:10.5px;font-weight:700}#view-accounting .reportV25Metric strong{color:#0b182b;font-size:17px;line-height:1;font-weight:900;letter-spacing:-.03em}#view-accounting .reportV25Metric.income strong{color:#08734f}#view-accounting .reportV25Metric.expense strong{color:#bd1e35}#view-accounting .reportV25Notice{padding:9px 10px;border:1px solid #d7e7f6;border-radius:12px;background:#f4f9fe;color:#315b82;font-size:11px;line-height:1.35;font-weight:720}#view-accounting .reportV25Breakdown{overflow:hidden;border:1px solid #e4eaf0;border-radius:13px;background:#fff}#view-accounting .reportV25Row{min-height:38px;padding:0 10px;border-bottom:1px solid #edf1f4;display:flex;align-items:center;justify-content:space-between;gap:10px}#view-accounting .reportV25Row:last-child{border-bottom:0}#view-accounting .reportV25Row span{color:#65758a;font-size:11px;font-weight:650}#view-accounting .reportV25Row strong{color:#15253a;font-size:12px;font-weight:850;text-align:right}#view-accounting #accountingBuildReportV8{width:100%!important;min-height:48px!important;border:1px solid #d5e6f6!important;border-radius:14px!important;background:linear-gradient(120deg,#eef7ff,#fbfdff) !important;color:#174f89!important;-webkit-text-fill-color:#174f89!important;box-shadow:none!important;font-size:14px!important;font-weight:900!important}#view-accounting .reportV25Warn{padding:8px 10px;border-radius:11px;background:#fff8ed;border:1px solid #f2dfbd;color:#855c1e;font-size:10.5px;font-weight:700;line-height:1.3}.taskReceiptV25Info{padding:8px 10px;border:1px solid #dceaf7;border-radius:12px;background:#f6faff;color:#315b82;font-size:11px;line-height:1.35;font-weight:700}@media(max-width:390px){#view-accounting .reportV25Presets{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>\n\n</head><body><h1>${window.AutoEasierProfile.htmlName()} — buhalterijos ataskaita</h1><div class="period">${escapeHTML(v16DateHuman(range.from))} – ${escapeHTML(v16DateHuman(range.to))}</div><div class="summary"><div><span>Pajamos</span><b class="green">${escapeHTML(moneyFmt(d.totalIncome))}</b></div><div><span>Išlaidos</span><b class="red">${escapeHTML(moneyFmt(d.totalExpense))}</b></div><div><span>Pokytis</span><b>${escapeHTML(moneyFmt(d.net))}</b></div><div><span>Dokumentai</span><b>${d.docCount}</b></div></div><h2>Automobilių pirkimai</h2><table><thead><tr><th>Data</th><th>Automobilis</th><th>Pirkimo kaina</th><th>Dok.</th></tr></thead><tbody>${purchases}</tbody></table><h2>Automobilių pardavimai</h2><table><thead><tr><th>Data</th><th>Automobilis</th><th>Pardavimo kaina</th><th>Marža</th><th>Dok.</th></tr></thead><tbody>${sales}</tbody></table><h2>Kitos įplaukos ir išlaidos</h2><table><thead><tr><th>Data</th><th>Tipas</th><th>Kategorija</th><th>Automobilis</th><th>Suma</th><th>Priedai</th></tr></thead><tbody>${tx}</tbody></table></body></html>`;
  }
  buildAccountingReportZipV8 = async function (range) {
    const d = accountingReportDataV8(range),
      entries = [];
    entries.push({
      name: "00-ATASKAITA.html",
      blob: new Blob([accountingReportHtmlV16(range, d)], { type: "text/html;charset=utf-8" })
    });
    entries.push({
      name: "00-Suvestine.txt",
      blob: new Blob([accountingReportSummaryV8(range, d)], { type: "text/plain;charset=utf-8" })
    });
    entries.push({
      name: "01-Automobiliu-pirkimai.csv",
      blob: new Blob([accountingBoughtCsvV16(d.bought)], { type: "text/csv;charset=utf-8" })
    });
    entries.push({
      name: "02-Automobiliu-pardavimai.csv",
      blob: new Blob([accountingSoldCsvV16(d.sold)], { type: "text/csv;charset=utf-8" })
    });
    entries.push({
      name: "03-Islaidos.csv",
      blob: new Blob([accountingTxCsvV16(d.tx, "expense")], { type: "text/csv;charset=utf-8" })
    });
    entries.push({
      name: "04-Iplaukos.csv",
      blob: new Blob([accountingTxCsvV16(d.tx, "income")], { type: "text/csv;charset=utf-8" })
    });
    entries.push({
      name: "05-Dokumentu-kontrole.csv",
      blob: new Blob([accountingControlCsvV16(d)], { type: "text/csv;charset=utf-8" })
    });
    for (let i = 0; i < d.cars.length; i++) {
      const c = d.cars[i],
        folder = `Automobiliai/${String(i + 1).padStart(2, "0")}-${accountingSafeName(c.name)}`;
      const eventLines = [
        `Automobilis: ${c.name}`,
        `VIN: ${c.vin || "—"}`,
        `Valst. nr.: ${c.plate || "—"}`,
        `Pirkimo data: ${c.createdDateISO || "—"}`,
        `Pirkimo kaina: ${moneyFmt(c.buyPrice)}`,
        `Pardavimo data: ${c.soldDateISO || "—"}`,
        `Pardavimo kaina: ${c.soldPrice ? moneyFmt(c.soldPrice) : "—"}`,
        `Savikaina: ${moneyFmt(typeof carTotalCost === "function" ? carTotalCost(c) : c.buyPrice)}`,
        `Marža: ${c.status === "parduotas" ? moneyFmt(typeof carNetProfit === "function" ? carNetProfit(c) : 0) : "—"}`,
        `Dokumentų: ${(c.documents || []).length}`
      ];
      entries.push({
        name: `${folder}/00-Automobilio-suvestine.txt`,
        blob: new Blob([eventLines.join("\r\n")], { type: "text/plain;charset=utf-8" })
      });
      for (let j = 0; j < (c.documents || []).length; j++) {
        const doc = c.documents[j],
          ext = (doc.name.match(/\.[A-Za-z0-9]+$/) || [""])[0],
          kind = DOC_TYPES.find(x => x[0] === doc.kind)?.[1] || "Dokumentas";
        entries.push({
          name: `${folder}/Dokumentai/${String(j + 1).padStart(2, "0")}-${accountingSafeName(kind)}-${accountingSafeName(doc.name.replace(/\.[A-Za-z0-9]+$/, ""))}${ext}`,
          blob: await documentBlob(doc.key)
        });
      }
    }
    for (let i = 0; i < d.tx.length; i++) {
      const t = d.tx[i];
      if (!(t.attachments || []).length) continue;
      const car = (state.cars || []).find(c => c.id === t.carId),
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
    return {
      blob: await makeZip(entries),
      name: `Visureigiai-UAB-Ataskaita-${range.from}-${range.to}.zip`,
      data: d
    };
  };
  accountingReportsV8 = function () {
    state.ui = state.ui || {};
    const mode = state.ui.accountingReportMode || "month",
      range = accountingRangeV8(mode),
      d = accountingReportDataV8(range);
    const netClass = d.net >= 0 ? "positive" : "negative";
    const totalEvents = d.bought.length + d.sold.length + d.tx.length;
    const details = [
      ["Nupirkta automobilių", `${d.bought.length} · ${moneyFmt(d.purchases)}`],
      ["Parduota automobilių", `${d.sold.length} · ${moneyFmt(d.sales)}`],
      ["Kitos įplaukos", `${d.tx.filter(t => t.type === "income").length} · ${moneyFmt(d.income)}`],
      ["Kitos išlaidos", `${d.tx.filter(t => t.type === "expense").length} · ${moneyFmt(d.expense)}`]
    ];
    return `<section class="accountingWorkspace show accountingReportV16">\n      <div class="reportV16Title"><h3>Ataskaita buhalterei</h3><span class="reportV16Range">${escapeHTML(v16DateHuman(range.from))} – ${escapeHTML(v16DateHuman(range.to))}</span></div>\n      <div class="reportV16Picker">\n        <div class="reportV16Dates"><div class="field"><label>Nuo</label><input class="input" id="accountingReportFrom" type="date" value="${escapeHTML(range.from)}" ${mode === "custom" ? "" : "disabled"}></div><span class="arrow">→</span><div class="field"><label>Iki</label><input class="input" id="accountingReportTo" type="date" value="${escapeHTML(range.to)}" ${mode === "custom" ? "" : "disabled"}></div></div>\n        <div class="reportV16Presets">${[
      ["month", "Šis mėnuo"],
      ["prevmonth", "Praėjęs"],
      ["year", "Šie metai"],
      ["custom", "Pasirinkti"]
    ]
      .map(
        ([v, l]) =>
          `<button class="${mode === v ? "active" : ""}" type="button" data-report-mode="${v}">${l}</button>`
      )
      .join(
        ""
      )}</div>\n      </div>\n      <div class="reportV16Metrics"><div class="reportV16Metric income"><span>Pajamos</span><strong>${moneyFmt(d.totalIncome)}</strong></div><div class="reportV16Metric expense"><span>Išlaidos</span><strong>${moneyFmt(d.totalExpense)}</strong></div><div class="reportV16Metric net ${netClass}"><span>Pokytis</span><strong>${d.net >= 0 ? "+" : ""}${moneyFmt(d.net)}</strong></div><div class="reportV16Metric docs"><span>Dokumentai</span><strong>${d.docCount}</strong></div></div>\n      <div class="reportV16Breakdown">${details.map(x => `<div class="reportV16Row"><strong>${x[0]}</strong><span>${x[1]}</span></div>`).join("")}<div class="reportV16Row"><strong>Iš viso įrašų</strong><span>${totalEvents}</span></div></div>\n      <button class="btn" id="accountingBuildReportV8" type="button">Sudaryti ataskaitą</button>\n    </section>`;
  };
  if (typeof completeCarChecklistItem === "function") {
    const __completeCarChecklistV16 = completeCarChecklistItem;
    completeCarChecklistItem = function (carId, itemId, expenseValue = 0) {
      __completeCarChecklistV16(carId, itemId, expenseValue);
      const c = (state.cars || []).find(x => x.id === carId),
        item = c?.checklist?.find(x => x.id === itemId);
      if (item?.done && !item.doneDateISO) {
        item.doneDateISO = todayISO();
        saveState();
      }
    };
  }
  if (typeof render === "function") {
    const __renderV16 = render;
    render = async function () {
      const r = await __renderV16.apply(this, arguments);
      document.querySelectorAll('.navBtn[data-view="finance"]').forEach(b => b.remove());
      return r;
    };
  }
})();
