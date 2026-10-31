// v93: Buhalterijos „Ataskaitos“ – aiškus skydelis ir tvarkinga ZIP ataskaita.
// Skydelis: laikotarpis (Šiandien · Ši savaitė · Šis mėnuo · Praėjęs mėn. · Šie metai · Pasirinkti), rezultatas
// (pajamos − išlaidos), išskaidymas, ataskaitos turinio peržiūra (aplankai) ir patikra prieš siunčiant
// (trūkstamos sutartys, išlaidos be čekio).
// ZIP (vienas aplankas „<Įmonė>-Ataskaita-<nuo>-<iki>“):
//   Suvestine.html                 – atsidaro naršyklėje, galima spausdinti / išsaugoti PDF; nuorodos į viską
//   Lentele-Automobiliai.csv, Lentele-Islaidos-ir-iplaukos.csv – Excel (LT: „;“, kablelis)
//   1-Parduoti-automobiliai/01-Honda-CR-V-ABC123/Ataskaita.html + Dokumentai/ + Cekiai/
//   2-Nupirkti-automobiliai/…  3-Kiti-automobiliai/…  (kiti – tik išlaidos / dokumentai per laikotarpį)
//   4-Bendros-islaidos-ir-iplaukos/Cekiai/…
// Parduotiems ir nupirktiems – visa automobilio byla (visi dokumentai ir čekiai, visa savikaina); kitiems – tik
// šio laikotarpio įrašai. Perrašo accountingRangeV8, accountingReportsV8, buildAccountingReportZipV8 (25 failas).
// Stilius – styles/200-v93-reports.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const RP_MODES_V93 = [
  ["today", "Šiandien"],
  ["week", "Ši savaitė"],
  ["month", "Šis mėnuo"],
  ["prevMonth", "Praėjęs mėn."],
  ["year", "Šie metai"],
  ["custom", "Pasirinkti"]
];
const RP_ICON_V93 = {
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".14"/><path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity=".14"/><path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M8.8 12.5h6.4M8.8 16h4.4"/></svg>',
  table:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.8" y="4.5" width="16.4" height="15" rx="2.6" fill="currentColor" fill-opacity=".14"/><rect x="3.8" y="4.5" width="16.4" height="15" rx="2.6"/><path d="M3.8 9.5h16.4M3.8 14.5h16.4M10 9.5v10"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.4 12.3 2.4 2.4 4.8-5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.2 2.9 19.5h18.2z"/><path d="M12 10v4.2M12 17.2v.1"/></svg>',
  zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></svg>'
};

// ---------- Laikotarpis ----------
accountingRangeV8 = function (mode) {
  const now = todayISO();
  const y = now.slice(0, 4);
  if (mode === "today") return { from: now, to: now, label: "Šiandien" };
  if (mode === "week") return { from: proWeekStartISO(), to: now, label: "Ši savaitė" };
  if (mode === "month") return { from: currentMonthKey() + "-01", to: now, label: "Šis mėnuo" };
  if (mode === "prevMonth") {
    const d = new Date(Number(y), Number(now.slice(5, 7)) - 2, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return { from: key + "-01", to: `${key}-${String(last).padStart(2, "0")}`, label: "Praėjęs mėnuo" };
  }
  if (mode === "year") return { from: y + "-01-01", to: now, label: "Šie metai" };
  const from = state.ui?.accountingReportFrom || currentMonthKey() + "-01",
    to = state.ui?.accountingReportTo || now;
  return { from, to, label: `${from} – ${to}` };
};

// ---------- Duomenys ----------
const rpNumV93 = v => Math.round((Number(v) || 0) * 100) / 100;
function rpCarKindV93(car, d) {
  if ((d.sold || []).some(c => c.id === car.id)) return "sold";
  if ((d.bought || []).some(c => c.id === car.id)) return "bought";
  return "other";
}
// Automobilio savikainos eilutės (sutampa su carTotalCost): užduočių išlaidos + Buhalterijos įrašai su automobiliu
function rpCarCostRowsV93(car) {
  const rows = [];
  for (const item of car.checklist || []) {
    const amount = Number(item.expense) || 0;
    if (!amount) continue;
    const tx = (state.finances.transactions || []).find(
      t =>
        t.source === "carTask" &&
        t.carId === car.id &&
        (t.linkedTaskId === item.id || item.expenseTxId === t.id)
    );
    rows.push({
      date: accountingTaskDateV24(item, car),
      title: item.name || "Automobilio užduotis",
      category: taskExpenseCategoryV24(item.name),
      amount,
      sign: 1,
      done: !!item.done,
      files: (Array.isArray(item.receipts) && item.receipts.length ? item.receipts : tx?.attachments) || []
    });
  }
  for (const t of state.finances.transactions || []) {
    if (t.carId !== car.id || t.source !== "accounting") continue;
    const amount = Math.abs(Number(t.amount) || 0);
    if (!amount) continue;
    rows.push({
      date: t.date || "",
      title: t.title || t.category || (t.type === "income" ? "Įplauka" : "Išlaida"),
      category: t.category || "",
      amount,
      sign: t.type === "income" ? -1 : 1,
      done: true,
      note: t.note || "",
      files: t.attachments || []
    });
  }
  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
function rpDataV93(range) {
  const d = accountingReportDataV8(range);
  const inRange = x => !!x && x >= range.from && x <= range.to;
  const groups = { sold: [], bought: [], other: [] };
  for (const car of d.cars) groups[rpCarKindV93(car, d)].push(car);
  const carExpense = d.tx
    .filter(t => t.type === "expense" && t.carId)
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const generalExpense = d.tx
    .filter(t => t.type === "expense" && !t.carId)
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const income = rpNumV93(d.sales + d.income);
  const expense = rpNumV93(d.purchases + d.expense);
  // Patikra prieš siunčiant
  const issues = [];
  const hasDoc = (car, kind) => (car.documents || []).some(x => x.kind === kind);
  for (const car of groups.sold) {
    if (!hasDoc(car, "sale")) issues.push({ car, text: "nėra pardavimo sutarties" });
    if (!hasDoc(car, "purchase")) issues.push({ car, text: "nėra pirkimo sutarties" });
  }
  for (const car of groups.bought)
    if (!hasDoc(car, "purchase")) issues.push({ car, text: "nėra pirkimo sutarties" });
  const noReceipt = d.tx.filter(
    t => t.type === "expense" && Math.abs(Number(t.amount) || 0) > 0 && !(t.attachments || []).length
  );
  return {
    ...d,
    range,
    groups,
    carExpense: rpNumV93(carExpense),
    generalExpense: rpNumV93(generalExpense),
    incomeTotal: income,
    expenseTotal: expense,
    result: rpNumV93(income - expense),
    issues,
    noReceipt,
    inRange
  };
}

// ---------- Skydelis ----------
function rpRowV93(label, sub, value, cls = "") {
  return `<div class="rpRowV93 ${cls}"><span><b>${escapeHTML(label)}</b>${sub ? `<small>${escapeHTML(sub)}</small>` : ""}</span><strong>${value}</strong></div>`;
}
function rpCountWord(n, one, few, many) {
  const m10 = n % 10,
    m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 9 && (m100 < 10 || m100 > 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}
accountingReportsV8 = function () {
  state.ui = state.ui || {};
  const mode = RP_MODES_V93.some(m => m[0] === state.ui.accountingReportMode)
    ? state.ui.accountingReportMode
    : "month";
  const range = accountingRangeV8(mode);
  const d = rpDataV93(range);
  const g = d.groups;
  const sign = d.result > 0 ? "+" : d.result < 0 ? "−" : "";
  const files =
    g.sold.reduce((n, c) => n + (c.documents || []).length, 0) +
    g.bought.reduce((n, c) => n + (c.documents || []).length, 0) +
    (d.attachmentCount || 0) +
    g.other.reduce((n, c) => n + (d.docsByCar?.[c.id] || []).length, 0);
  const tree = [
    [RP_ICON_V93.file, "Suvestinė", "atsidaro naršyklėje, galima spausdinti PDF"],
    [RP_ICON_V93.table, "Excel lentelės", "automobiliai, išlaidos ir įplaukos"],
    g.sold.length ? [RP_ICON_V93.folder, "Parduoti automobiliai", g.sold.map(c => c.name).join(", ")] : null,
    g.bought.length
      ? [RP_ICON_V93.folder, "Nupirkti automobiliai", g.bought.map(c => c.name).join(", ")]
      : null,
    g.other.length ? [RP_ICON_V93.folder, "Kiti automobiliai", g.other.map(c => c.name).join(", ")] : null,
    d.tx.some(t => !t.carId)
      ? [
          RP_ICON_V93.folder,
          "Bendros išlaidos ir įplaukos",
          rpCountWord(d.tx.filter(t => !t.carId).length, "įrašas", "įrašai", "įrašų")
        ]
      : null
  ].filter(Boolean);
  const checks = [
    ...d.issues.map(
      i =>
        `<li class="warn">${RP_ICON_V93.warn}<span><b>${escapeHTML(i.car.name || "Automobilis")}</b> – ${escapeHTML(i.text)}</span></li>`
    ),
    ...(d.noReceipt.length
      ? [
          `<li class="warn">${RP_ICON_V93.warn}<span>${rpCountWord(d.noReceipt.length, "išlaida", "išlaidos", "išlaidų")} be čekio: ${escapeHTML(
            d.noReceipt
              .slice(0, 3)
              .map(
                t =>
                  `${t.title || t.category || "Išlaida"}\u00a0${moneyFmt(Math.abs(Number(t.amount) || 0)).replace(" €", "\u00a0€")}`
              )
              .join(", ")
          )}${d.noReceipt.length > 3 ? "…" : ""}</span></li>`
        ]
      : [])
  ];
  const empty = !d.cars.length && !d.tx.length;
  return `<section class="accountingWorkspace show strictPeriodReportV24 rpV93">
    <div class="accountingWorkspaceHead"><h3>Ataskaitos</h3></div>
    <div class="rpModesV93" role="radiogroup" aria-label="Laikotarpis">${RP_MODES_V93.map(
      ([v, l]) =>
        `<button class="accountingReportMode rpModeV93${mode === v ? " active" : ""}" type="button" role="radio" aria-checked="${mode === v}" data-report-mode="${v}">${l}</button>`
    ).join("")}</div>
    ${mode === "custom" ? `<div class="accountingRangeGrid rpRangeV93"><div class="field"><label for="accountingReportFrom">Nuo</label><input class="input" id="accountingReportFrom" type="date" value="${escapeHTML(range.from)}"></div><div class="field"><label for="accountingReportTo">Iki</label><input class="input" id="accountingReportTo" type="date" value="${escapeHTML(range.to)}"></div></div>` : ""}
    <div class="rpPeriodV93">${escapeHTML(range.from)} – ${escapeHTML(range.to)}</div>
    <div class="rpResultV93 ${d.result >= 0 ? "pos" : "neg"}">
      <small>Rezultatas</small>
      <strong>${sign}${moneyFmt(Math.abs(d.result))}</strong>
      <div class="rpSplitV93"><span><small>Pajamos</small><b>${moneyFmt(d.incomeTotal)}</b></span><span><small>Išlaidos</small><b>${moneyFmt(d.expenseTotal)}</b></span></div>
    </div>
    <div class="rpRowsV93">
      ${rpRowV93("Parduota automobilių", rpCountWord(d.sold.length, "automobilis", "automobiliai", "automobilių"), moneyFmt(d.sales))}
      ${rpRowV93("Nupirkta automobilių", rpCountWord(d.bought.length, "automobilis", "automobiliai", "automobilių"), moneyFmt(d.purchases), "out")}
      ${rpRowV93("Automobilių išlaidos", "remontas, paruošimas ir kt.", moneyFmt(d.carExpense), "out")}
      ${rpRowV93("Bendros išlaidos", "reklama, kuras ir kt.", moneyFmt(d.generalExpense), "out")}
      ${rpRowV93("Kitos įplaukos", "", moneyFmt(d.income))}
    </div>
    ${
      empty
        ? `<div class="rpEmptyV93">Šiam laikotarpiui įrašų nėra – pasirinkite kitą laikotarpį.</div>`
        : `<div class="rpBlockV93"><h4>Ataskaitoje bus</h4><ul class="rpTreeV93">${tree
            .map(
              ([ico, t, s]) =>
                `<li>${ico}<span><b>${escapeHTML(t)}</b><small>${escapeHTML(s)}</small></span></li>`
            )
            .join("")}</ul></div>
    <div class="rpBlockV93"><h4>Patikra prieš siunčiant</h4><ul class="rpChecksV93">${
      checks.length
        ? checks.join("")
        : `<li class="ok">${RP_ICON_V93.ok}<span>Visi dokumentai ir čekiai vietoje</span></li>`
    }</ul></div>`
    }
    <button class="btn rpBuildV93" id="accountingBuildReportV8" type="button"${empty ? " disabled" : ""}>${RP_ICON_V93.zip}<span>Paruošti ataskaitą</span></button>
    <p class="rpNoteV93">ZIP failas${files ? ` · ${rpCountWord(files, "dokumentas", "dokumentai", "dokumentų")}` : ""} · galima išsiųsti buhalterei</p>
  </section>`;
};

// ---------- Ataskaitos failai ----------
const rpCsvNumV93 = v => (v === "" || v == null ? "" : String(rpNumV93(v)).replace(".", ","));
function rpCsvV93(rows) {
  return "﻿" + rows.map(r => r.map(accountingCsvCellV8).join(";")).join("\r\n");
}
function rpExtV93(name) {
  return (String(name || "").match(/\.[A-Za-z0-9]{1,5}$/) || [""])[0].toLowerCase();
}
function rpHrefV93(path) {
  return path
    .split("/")
    .map(s => encodeURIComponent(s))
    .join("/");
}
const RP_CSS_V93 = `*{box-sizing:border-box}body{margin:0;background:#f3f7fa;color:#12233a;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}main{max-width:900px;margin:0 auto;padding:28px 18px 48px}header{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:18px}h1{margin:0;font-size:26px;letter-spacing:-.02em}h2{margin:28px 0 10px;font-size:18px;letter-spacing:-.01em}.muted{color:#66768a}.brand{font-weight:800;color:#1f5aa6;letter-spacing:-.01em}.card{background:#fff;border:1px solid #e3e5ea;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 6px 18px rgba(15,23,42,.05)}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.kpi small{display:block;color:#66768a;font-size:12.5px;font-weight:600}.kpi b{display:block;margin-top:4px;font-size:21px;letter-spacing:-.01em;font-variant-numeric:tabular-nums}.pos{color:#1d8a52}.neg{color:#c0362c}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3e5ea;border-radius:14px;overflow:hidden;font-size:13.5px}th,td{padding:9px 10px;border-bottom:1px solid #eef1f5;text-align:left;vertical-align:top}th{background:#f7f9fc;color:#4b5a6c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}tr:last-child td{border-bottom:0}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tfoot td{font-weight:800;background:#f7f9fc}a{color:#1f5aa6;text-decoration:none;font-weight:600}a:hover{text-decoration:underline}.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 16px}.facts div small{display:block;color:#66768a;font-size:12px;font-weight:600}.facts div b{font-size:15px}.tag{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef3fa;color:#1f5aa6;font-size:12px;font-weight:700}.warn{color:#8f6210;background:#fff8ea;border:1px solid #f3dfb7;border-radius:12px;padding:10px 12px;margin:6px 0}.okbox{color:#1d6b43;background:#eefaf3;border:1px solid #c9ead7;border-radius:12px;padding:10px 12px}footer{margin-top:32px;color:#8592a3;font-size:12px}@media(max-width:640px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.facts{grid-template-columns:repeat(2,minmax(0,1fr))}table{font-size:12.5px}th,td{padding:7px 6px}}@media print{body{background:#fff}main{padding:0}.card,table{box-shadow:none}a{color:inherit}}`;
function rpPageV93(title, body) {
  return `<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title><style>${RP_CSS_V93}</style></head><body><main>${body}<footer>Sugeneruota ${escapeHTML(todayISO())} · AutoEasier</footer></main></body></html>`;
}
function rpFilesCellV93(list) {
  return list.length
    ? list
        .map((f, i) => `<a href="${rpHrefV93(f.href)}">${list.length > 1 ? `Čekis ${i + 1}` : "Čekis"}</a>`)
        .join(", ")
    : '<span class="muted">—</span>';
}

async function rpBuildV93(range, onProgress = () => {}) {
  const d = rpDataV93(range);
  const company = window.AutoEasierProfile?.upperName?.() || "AUTOEASIER";
  const rootName = `${window.AutoEasierProfile.fileName()}-Ataskaita-${range.from}-${range.to}`;
  const entries = [];
  const pending = []; // { name, key }
  const missing = [];
  const used = new Set();
  const uniq = path => {
    let p = path,
      n = 2;
    const dot = path.lastIndexOf(".");
    while (used.has(p.toLowerCase()))
      p = dot > 0 ? `${path.slice(0, dot)}-${n++}${path.slice(dot)}` : `${path}-${n++}`;
    used.add(p.toLowerCase());
    return p;
  };
  const addText = (path, text, type) =>
    entries.push({ name: `${rootName}/${path}`, blob: new Blob([text], { type }) });
  const kindLabel = k => (DOC_TYPES.find(x => x[0] === k)?.[1] || "Dokumentas").replace(/[–—]/g, "-");
  const txHref = new Map(); // tx.id → [{href}]
  const folders = {
    sold: "1-Parduoti-automobiliai",
    bought: "2-Nupirkti-automobiliai",
    other: "3-Kiti-automobiliai"
  };
  const carRows = [];
  // ---- Automobiliai ----
  for (const kind of ["sold", "bought", "other"]) {
    const list = d.groups[kind];
    for (let i = 0; i < list.length; i++) {
      const car = list[i];
      const full = kind !== "other";
      const folder = `${folders[kind]}/${String(i + 1).padStart(2, "0")}-${accountingSafeName([car.name, car.plate].filter(Boolean).join(" "))}`;
      // Dokumentai
      const docs = (full ? car.documents || [] : d.docsByCar?.[car.id] || []).filter(x => x && x.key);
      const docLinks = [];
      for (const doc of docs) {
        const rel = uniq(
          `${folder}/Dokumentai/${accountingSafeName(kindLabel(doc.kind))}${rpExtV93(doc.name) || ".pdf"}`
        );
        pending.push({ name: `${rootName}/${rel}`, key: doc.key, label: `${car.name}: ${doc.name}` });
        docLinks.push({ doc, href: rel.slice(folder.length + 1) });
      }
      // Savikaina ir čekiai
      const costRows = rpCarCostRowsV93(car).filter(r => full || d.inRange(r.date));
      for (const r of costRows) {
        r.links = [];
        r.files.forEach((f, k) => {
          if (!f?.key) return;
          const rel = uniq(
            `${folder}/Cekiai/${r.date || "be-datos"}-${accountingSafeName(r.title)}${r.files.length > 1 ? "-" + (k + 1) : ""}${rpExtV93(f.name) || ".jpg"}`
          );
          pending.push({
            name: `${rootName}/${rel}`,
            key: f.key,
            label: `${car.name}: ${f.name || r.title}`
          });
          r.links.push({ href: rel.slice(folder.length + 1), root: rel });
        });
      }
      // Laikotarpio įrašų čekių nuorodos suvestinei
      for (const t of d.tx.filter(t => t.carId === car.id)) {
        const r = costRows.find(
          x =>
            x.date === t.date &&
            Math.abs(x.amount - Math.abs(Number(t.amount) || 0)) < 0.01 &&
            x.links?.length
        );
        if (r)
          txHref.set(
            t.id,
            r.links.map(l => ({ href: l.root }))
          );
      }
      const extra = costRows.reduce((s, r) => s + r.sign * r.amount, 0);
      const cost = full ? carTotalCost(car) : null;
      const sold = car.status === "parduotas" && Number(car.soldPrice) > 0;
      const profit = sold ? Number(car.soldPrice) - carTotalCost(car) : null;
      carRows.push({ car, kind, folder, cost, profit, docs: docLinks.length, extra });
      const facts = [
        ["Valst. nr.", car.plate],
        ["VIN", car.vin],
        ["Pirmoji registracija", car.firstRegistrationDate || car.year],
        ["Rida", Number(car.mileage) > 0 ? `${Number(car.mileage).toLocaleString("lt-LT")} km` : ""],
        ["Kuras", car.fuelType],
        ["Liudijimas", car.registrationDoc || car.regDoc]
      ].filter(x => x[1]);
      const body = `<header><div><div class="brand">${escapeHTML(company)}</div><h1>${escapeHTML(car.name || "Automobilis")}</h1><div class="muted">${kind === "sold" ? "Parduotas automobilis" : kind === "bought" ? "Nupirktas automobilis" : "Automobilio įrašai"} · ataskaita ${escapeHTML(range.from)} – ${escapeHTML(range.to)}</div></div>${car.plate ? `<span class="tag">${escapeHTML(car.plate)}</span>` : ""}</header>
        ${facts.length ? `<div class="card facts">${facts.map(([k, v]) => `<div><small>${escapeHTML(k)}</small><b>${escapeHTML(String(v))}</b></div>`).join("")}</div>` : ""}
        ${
          full
            ? `<h2>Pirkimas ir pardavimas</h2><div class="kpis"><div class="card kpi"><small>Pirkta ${escapeHTML(car.createdDateISO || "")}</small><b>${moneyFmt(car.buyPrice)}</b></div><div class="card kpi"><small>Savikaina</small><b>${moneyFmt(cost)}</b></div><div class="card kpi"><small>${sold ? "Parduota " + escapeHTML(car.soldDateISO || "") : "Pardavimo kaina"}</small><b>${sold ? moneyFmt(car.soldPrice) : Number(car.askingPrice) > 0 ? moneyFmt(car.askingPrice) : "—"}</b></div><div class="card kpi"><small>${sold ? "Pelnas" : "Būsena"}</small><b class="${sold ? (profit >= 0 ? "pos" : "neg") : ""}">${sold ? (profit >= 0 ? "+" : "−") + moneyFmt(Math.abs(profit)) : "Garaže"}</b></div></div>`
            : ""
        }
        <h2>${full ? "Savikainos sudėtis" : "Šio laikotarpio išlaidos"}</h2>
        <table><thead><tr><th>Data</th><th>Įrašas</th><th>Kategorija</th><th>Čekis</th><th class="num">Suma</th></tr></thead><tbody>
        ${full ? `<tr><td>${escapeHTML(car.createdDateISO || "")}</td><td>Pirkimo kaina</td><td>Automobilio pirkimas</td><td>${docLinks.find(x => x.doc.kind === "purchase") ? `<a href="${rpHrefV93(docLinks.find(x => x.doc.kind === "purchase").href)}">Sutartis</a>` : '<span class="muted">—</span>'}</td><td class="num">${moneyFmt(car.buyPrice)}</td></tr>` : ""}
        ${costRows.map(r => `<tr><td>${escapeHTML(r.date || "")}</td><td>${escapeHTML(r.title)}${r.done ? "" : ' <span class="muted">(neatlikta)</span>'}${r.note ? `<br><span class="muted">${escapeHTML(r.note)}</span>` : ""}</td><td>${escapeHTML(r.category || "")}</td><td>${rpFilesCellV93(r.links)}</td><td class="num">${r.sign < 0 ? "−" : ""}${moneyFmt(r.amount)}</td></tr>`).join("") || (full ? "" : '<tr><td colspan="5" class="muted">Išlaidų nėra</td></tr>')}
        </tbody><tfoot><tr><td colspan="4">${full ? "Savikaina" : "Iš viso"}</td><td class="num">${moneyFmt(full ? cost : extra)}</td></tr></tfoot></table>
        <h2>Dokumentai</h2>
        ${
          docLinks.length
            ? `<table><thead><tr><th>Tipas</th><th>Failas</th><th>Pridėta</th></tr></thead><tbody>${docLinks.map(x => `<tr><td>${escapeHTML(kindLabel(x.doc.kind))}</td><td><a href="${rpHrefV93(x.href)}">${escapeHTML(x.doc.name || "Dokumentas")}</a></td><td>${escapeHTML(accountingDocumentDateV24(x.doc, car) || "")}</td></tr>`).join("")}</tbody></table>`
            : `<div class="warn">Dokumentų nėra.</div>`
        }`;
      addText(
        `${folder}/Ataskaita.html`,
        rpPageV93(`${car.name} – ataskaita`, body),
        "text/html;charset=utf-8"
      );
    }
  }
  // ---- Bendros išlaidos ir įplaukos (be automobilio) ----
  for (const t of d.tx.filter(t => !t.carId)) {
    const links = [];
    (t.attachments || []).forEach((f, k) => {
      if (!f?.key) return;
      const rel = uniq(
        `4-Bendros-islaidos-ir-iplaukos/Cekiai/${t.date}-${accountingSafeName(t.category || t.title || t.type)}${t.attachments.length > 1 ? "-" + (k + 1) : ""}${rpExtV93(f.name) || ".jpg"}`
      );
      pending.push({ name: `${rootName}/${rel}`, key: f.key, label: f.name || t.title });
      links.push({ href: rel });
    });
    if (links.length) txHref.set(t.id, links);
  }
  // ---- Suvestinė ----
  const carName = id => (state.cars || []).find(c => c.id === id)?.name || "";
  const kindTitle = {
    sold: "Parduoti automobiliai",
    bought: "Nupirkti automobiliai",
    other: "Kiti automobiliai"
  };
  const carTable = kind => {
    const rows = carRows.filter(r => r.kind === kind);
    if (!rows.length) return "";
    if (kind === "sold")
      return `<h2>${kindTitle[kind]} (${rows.length})</h2><table><thead><tr><th>Automobilis</th><th>Parduota</th><th class="num">Savikaina</th><th class="num">Pardavimo kaina</th><th class="num">Pelnas</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="${rpHrefV93(r.folder + "/Ataskaita.html")}">${escapeHTML(r.car.name)}</a><br><span class="muted">${escapeHTML([r.car.plate, r.car.vin].filter(Boolean).join(" · "))}</span></td><td>${escapeHTML(r.car.soldDateISO || "")}</td><td class="num">${moneyFmt(r.cost)}</td><td class="num">${moneyFmt(r.car.soldPrice)}</td><td class="num ${r.profit >= 0 ? "pos" : "neg"}">${r.profit >= 0 ? "+" : "−"}${moneyFmt(Math.abs(r.profit))}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2">Iš viso</td><td class="num">${moneyFmt(rows.reduce((s, r) => s + r.cost, 0))}</td><td class="num">${moneyFmt(rows.reduce((s, r) => s + Number(r.car.soldPrice || 0), 0))}</td><td class="num">${moneyFmt(rows.reduce((s, r) => s + r.profit, 0))}</td></tr></tfoot></table>`;
    if (kind === "bought")
      return `<h2>${kindTitle[kind]} (${rows.length})</h2><table><thead><tr><th>Automobilis</th><th>Pirkta</th><th class="num">Pirkimo kaina</th><th class="num">Savikaina dabar</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="${rpHrefV93(r.folder + "/Ataskaita.html")}">${escapeHTML(r.car.name)}</a><br><span class="muted">${escapeHTML([r.car.plate, r.car.vin].filter(Boolean).join(" · "))}</span></td><td>${escapeHTML(r.car.createdDateISO || "")}</td><td class="num">${moneyFmt(r.car.buyPrice)}</td><td class="num">${moneyFmt(r.cost)}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2">Iš viso</td><td class="num">${moneyFmt(rows.reduce((s, r) => s + Number(r.car.buyPrice || 0), 0))}</td><td class="num">${moneyFmt(rows.reduce((s, r) => s + r.cost, 0))}</td></tr></tfoot></table>`;
    return `<h2>${kindTitle[kind]} (${rows.length})</h2><table><thead><tr><th>Automobilis</th><th class="num">Šio laikotarpio išlaidos</th><th class="num">Dokumentai</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="${rpHrefV93(r.folder + "/Ataskaita.html")}">${escapeHTML(r.car.name)}</a></td><td class="num">${moneyFmt(r.extra)}</td><td class="num">${r.docs}</td></tr>`).join("")}</tbody></table>`;
  };
  const txRows = [...d.tx].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const summary = `<header><div><div class="brand">${escapeHTML(company)}</div><h1>Buhalterijos ataskaita</h1><div class="muted">${escapeHTML(range.from)} – ${escapeHTML(range.to)}</div></div></header>
    <div class="kpis"><div class="card kpi"><small>Pajamos</small><b>${moneyFmt(d.incomeTotal)}</b></div><div class="card kpi"><small>Išlaidos</small><b>${moneyFmt(d.expenseTotal)}</b></div><div class="card kpi"><small>Rezultatas</small><b class="${d.result >= 0 ? "pos" : "neg"}">${d.result >= 0 ? "+" : "−"}${moneyFmt(Math.abs(d.result))}</b></div><div class="card kpi"><small>Parduota / nupirkta</small><b>${d.sold.length} / ${d.bought.length}</b></div></div>
    <h2>Suvestinė</h2><table><tbody>
      <tr><td>Automobilių pardavimai (${d.sold.length})</td><td class="num">${moneyFmt(d.sales)}</td></tr>
      <tr><td>Kitos įplaukos</td><td class="num">${moneyFmt(d.income)}</td></tr>
      <tr><td>Automobilių pirkimai (${d.bought.length})</td><td class="num">−${moneyFmt(d.purchases)}</td></tr>
      <tr><td>Automobilių išlaidos</td><td class="num">−${moneyFmt(d.carExpense)}</td></tr>
      <tr><td>Bendros išlaidos</td><td class="num">−${moneyFmt(d.generalExpense)}</td></tr>
    </tbody><tfoot><tr><td>Rezultatas</td><td class="num">${d.result >= 0 ? "" : "−"}${moneyFmt(Math.abs(d.result))}</td></tr></tfoot></table>
    ${d.issues.length || d.noReceipt.length ? `<h2>Patikra</h2>${d.issues.map(i => `<div class="warn"><b>${escapeHTML(i.car.name)}</b> – ${escapeHTML(i.text)}</div>`).join("")}${d.noReceipt.length ? `<div class="warn">${rpCountWord(d.noReceipt.length, "išlaida", "išlaidos", "išlaidų")} be čekio (pažymėta lentelėje žemiau).</div>` : ""}` : `<h2>Patikra</h2><div class="okbox">Visi dokumentai ir čekiai vietoje.</div>`}
    ${carTable("sold")}${carTable("bought")}${carTable("other")}
    <h2>Išlaidos ir įplaukos (${txRows.length})</h2>
    ${
      txRows.length
        ? `<table><thead><tr><th>Data</th><th>Įrašas</th><th>Automobilis</th><th>Čekis</th><th class="num">Suma</th></tr></thead><tbody>${txRows.map(t => `<tr><td>${escapeHTML(t.date || "")}</td><td>${escapeHTML(t.title || t.category || "")}${t.category && t.title && t.category !== t.title ? `<br><span class="muted">${escapeHTML(t.category)}</span>` : ""}</td><td>${escapeHTML(carName(t.carId))}</td><td>${(txHref.get(t.id) || []).length ? rpFilesCellV93(txHref.get(t.id)) : t.type === "expense" ? '<span class="neg">nėra</span>' : '<span class="muted">—</span>'}</td><td class="num ${t.type === "income" ? "pos" : ""}">${t.type === "income" ? "+" : "−"}${moneyFmt(Math.abs(Number(t.amount) || 0))}</td></tr>`).join("")}</tbody></table>`
        : '<div class="card muted">Įrašų nėra.</div>'
    }`;
  // ---- Excel lentelės ----
  const carsCsv = [
    [
      "Grupė",
      "Automobilis",
      "Valst. nr.",
      "VIN",
      "Pirkta",
      "Pirkimo kaina",
      "Savikaina",
      "Parduota",
      "Pardavimo kaina",
      "Pelnas",
      "Dokumentų"
    ],
    ...carRows.map(r => [
      kindTitle[r.kind],
      r.car.name || "",
      r.car.plate || "",
      r.car.vin || "",
      r.car.createdDateISO || "",
      rpCsvNumV93(r.car.buyPrice),
      r.cost == null ? "" : rpCsvNumV93(r.cost),
      r.car.soldDateISO || "",
      r.car.status === "parduotas" ? rpCsvNumV93(r.car.soldPrice) : "",
      r.profit == null ? "" : rpCsvNumV93(r.profit),
      r.docs
    ])
  ];
  const txCsv = [
    ["Data", "Tipas", "Įrašas", "Kategorija", "Automobilis", "Suma", "Pastaba", "Čekių"],
    ...txRows.map(t => [
      t.date || "",
      t.type === "income" ? "Įplauka" : "Išlaida",
      t.title || "",
      t.category || "",
      carName(t.carId),
      rpCsvNumV93((t.type === "income" ? 1 : -1) * Math.abs(Number(t.amount) || 0)),
      t.note || "",
      (t.attachments || []).length
    ])
  ];
  // ---- Failai (dokumentai ir čekiai) ----
  let done = 0;
  for (const f of pending) {
    try {
      entries.push({ name: f.name, blob: await documentBlob(f.key) });
    } catch (e) {
      missing.push(f.label);
    }
    onProgress(++done, pending.length);
  }
  addText(
    "Suvestine.html",
    rpPageV93(
      `Ataskaita ${range.from} – ${range.to}`,
      summary +
        (missing.length
          ? `<h2>Nepavyko įtraukti</h2>${missing.map(m => `<div class="warn">${escapeHTML(m)}</div>`).join("")}`
          : "")
    ),
    "text/html;charset=utf-8"
  );
  addText("Lentele-Automobiliai.csv", rpCsvV93(carsCsv), "text/csv;charset=utf-8");
  addText("Lentele-Islaidos-ir-iplaukos.csv", rpCsvV93(txCsv), "text/csv;charset=utf-8");
  const blob = await makeZip(entries);
  return { blob, name: `${rootName}.zip`, data: d, files: entries.length, missing };
}
buildAccountingReportZipV8 = async function (range) {
  const btn = document.getElementById("accountingBuildReportV8");
  const label = btn?.querySelector("span");
  const prev = label?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.classList.add("is-busy");
    if (label) label.textContent = "Ruošiama ataskaita…";
  }
  try {
    return await rpBuildV93(range, (n, total) => {
      if (label && btn.isConnected) label.textContent = `Ruošiama ataskaita… ${n} iš ${total}`;
    });
  } finally {
    if (btn && btn.isConnected) {
      btn.disabled = false;
      btn.classList.remove("is-busy");
      if (label) label.textContent = prev;
    }
  }
};
window.AutoEasierReportsV93 = { data: r => rpDataV93(r), build: r => rpBuildV93(r) };
