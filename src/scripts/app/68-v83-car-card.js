// v83: automobilio kortelė – minimalistinė ir interaktyvi. Ankstesni sluoksniai (renderCarSheet grandinė) sukuria
// visus elementus ir jų įvykius, o čia jie tik perdėliojami į naują struktūrą:
//   antraštė (valst. nr. ir dienos garaže) → nuotraukų juosta → pagrindiniai skaičiai (kaina keičiama vietoje,
//   savikainos sudėtis) → pasirengimas pardavimui / dokumentai buhalterei → išskleidžiamos skiltys (užduotys,
//   nuotraukos, dokumentai, duomenys) → prilimpanti veiksmų juosta (Parduoti, Dokumentai, ⋯).
// Esami id ir klasės (#sellCarBtn, .carPpBottomBtn, .carInvBottomBtn, #editCarInfoBtn, #deleteCarBtn, #carAddPhotos,
// #viewVehicledoc_*) išlieka – nuo jų priklauso kiti moduliai. Stilius – styles/192-v83-car-card.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const CC_ICON_V83 = {
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  bang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 6.5v7M12 17.5h.01"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  camera:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
};
const CC_SECTIONS_V83 = ["tasks", "photos", "docs", "data"];
// Atvirų blokų būsena tarp perpiešimų (pvz. pažymėjus užduotį): savikainos sudėtis ir pasirengimo sąrašas
const ccOpenV83 = { cost: new Set(), ready: new Set() };
let ccReturnCarV83 = "";

// ---------- Duomenys ----------
function ccCarV83(id) {
  return (state.cars || []).find(c => c.id === id) || null;
}
function ccSoldV83(car) {
  return car?.status === "parduotas";
}
function ccStartISOV83(car) {
  return car.createdDateISO || String(car.createdAt || "").slice(0, 10) || "";
}
function ccDaysV83(car) {
  const start = ccStartISOV83(car);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  if (ccSoldV83(car)) {
    const end = car.soldDateISO || String(car.soldAt || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(end) ? { sold: true, days: daysBetweenISO(start, end) } : null;
  }
  return { sold: false, days: daysBetweenISO(start, todayISO()) };
}
function ccDaysWordV83(n) {
  return `${n} d.`;
}
function ccPhotosV83(car) {
  const list = (car.photos || []).filter(Boolean);
  return list.length ? list : car.imageSrc ? [car.imageSrc] : [];
}
function ccTaskStatsV83(car) {
  const list = car.checklist || [];
  const today = todayISO();
  return {
    total: list.length,
    done: list.filter(t => t.done).length,
    late: list.filter(t => !t.done && t.dueDate && t.dueDate < today).length
  };
}
function ccPriceV83(car) {
  const n = Number(car.askingPrice);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function ccSignedMoneyV83(n) {
  const v = Math.round(Number(n) || 0);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${moneyFmt(Math.abs(v))}`;
}
// Būsena kaip dabartinėse plytelėse (vehicleStatusState): good/warn – galioja, bad – pasibaigė, neutral – nežinoma
function ccStatusItemV83(car, key, label, status, until) {
  const st = vehicleStatusState(status || "unknown", until || "");
  if (st.cls === "good" || st.cls === "warn")
    return {
      key,
      state: "done",
      label: `${label} galioja`,
      meta: until ? "iki " + String(until).slice(0, 10) : "galioja",
      warn: st.cls === "warn"
    };
  if (st.cls === "bad")
    return {
      key,
      state: "bad",
      label: `${label} ${status === "invalid" ? "negalioja" : "pasibaigęs"}`,
      sub: until ? `pasibaigė ${String(until).slice(0, 10)}` : "negalioja",
      act: "Atnaujinti"
    };
  return {
    key,
    state: "todo",
    label: `${label} galioja`,
    sub: "Nežinoma",
    act: key === "ta" ? "Įrašyti" : "Patikrinti"
  };
}
// Aktyvaus automobilio pasirengimo punktai (tvarka – prioritetas „Kitam žingsniui“)
function ccReadyItemsV83(car) {
  const items = [];
  const ta = ccStatusItemV83(car, "ta", "TA", car.taStatus, car.taUntil);
  ta.next = ta.state === "bad" ? "Atnaujinti techninę apžiūrą" : "Įrašyti techninę apžiūrą";
  items.push(ta);
  const ins = ccStatusItemV83(car, "insurance", "Draudimas", car.insuranceStatus, car.insuranceUntil);
  ins.next = ins.state === "bad" ? "Atnaujinti draudimą" : "Patikrinti draudimą";
  items.push(ins);
  const sdkCls = sdkClass(car.sdkStatus);
  const sdkOk = sdkCls === "sdkDone" || car.sdkStatus === "submitted";
  const sdkLabel = SDK_STATES.find(x => x[0] === car.sdkStatus)?.[1] || "Nepateiktas";
  items.push(
    sdkOk
      ? { key: "sdk", state: "done", label: "SDK pateiktas", meta: car.sdk || sdkLabel.toLowerCase() }
      : {
          key: "sdk",
          state: "todo",
          label: "SDK pateiktas",
          sub: !car.sdkStatus || car.sdkStatus === "unset" ? "Nepateiktas" : sdkLabel,
          late: sdkCls === "sdkLate",
          act: "Pateikti",
          next: "Pateikti SDK"
        }
  );
  const photos = ccPhotosV83(car).length;
  items.push(
    photos >= 6
      ? { key: "photos", state: "done", label: "Nuotraukos skelbimui", meta: `${photos} nuotr.` }
      : {
          key: "photos",
          state: "todo",
          label: "Nuotraukos skelbimui",
          sub: `${photos} iš 6`,
          act: "Pridėti",
          next: "Pridėti nuotraukas"
        }
  );
  const t = ccTaskStatsV83(car);
  items.push(
    t.done === t.total
      ? {
          key: "tasks",
          state: "done",
          label: "Visos užduotys atliktos",
          meta: t.total ? `${t.done} iš ${t.total}` : "užduočių nėra"
        }
      : {
          key: "tasks",
          state: "todo",
          label: "Visos užduotys atliktos",
          sub: `${t.done} iš ${t.total} atlikta`,
          late: t.late,
          act: "Atlikti",
          next: "Atlikti užduotis"
        }
  );
  const purchase = (car.documents || []).filter(d => d.kind === "purchase").pop();
  items.push(
    purchase
      ? {
          key: "purchase",
          state: "done",
          label: "Pirkimo sutartis prisegta",
          meta: (purchase.name || "").replace(/\.pdf$/i, "").slice(0, 18) || "prisegta"
        }
      : {
          key: "purchase",
          state: "todo",
          label: "Pirkimo sutartis prisegta",
          sub: "Nėra",
          act: "Pridėti",
          next: "Pridėti pirkimo sutartį",
          choice: [
            ["purchase-create", "Sukurti sutartį"],
            ["purchase-upload", "Įkelti failą"]
          ]
        }
  );
  const price = ccPriceV83(car);
  items.push(
    price
      ? { key: "price", state: "done", label: "Kaina nustatyta", meta: moneyFmt(price) }
      : {
          key: "price",
          state: "todo",
          label: "Kaina nustatyta",
          sub: "Nėra",
          act: "Nustatyti",
          next: "Nustatyti kainą"
        }
  );
  return items;
}
// Parduoto automobilio dokumentai buhalterei: trūkstami – tie patys, kaip Buhalterijoje („Laukia pateikimo“)
function ccAccountantItemsV83(car) {
  let missing = [];
  try {
    missing = (window.__aeRequiredDocsV83?.list?.() || []).filter(i => i.carId === car.id);
  } catch (e) {
    missing = [];
  }
  const miss = new Map(missing.map(i => [i.key, i]));
  const items = [];
  const kinds = [
    ["purchase", "Pirkimo sutartis"],
    ["registration", "Registracijos dokumentas"],
    ["sale", "Pardavimo sutartis"]
  ];
  for (const [kind, label] of kinds) {
    const key = `car:${car.id}:${kind}`;
    if (miss.has(key)) {
      items.push({
        key,
        state: "todo",
        label,
        sub: "Automobilio dokumentas",
        act: "Pridėti",
        run: kind === "sale" ? "" : `upload:${kind}`,
        choice:
          kind === "sale"
            ? [
                ["sale-create", "Sukurti sutartį"],
                ["upload:sale", "Įkelti failą"]
              ]
            : null
      });
      miss.delete(key);
    } else if ((car.documents || []).some(d => d.kind === kind))
      items.push({ key, state: "done", label, meta: "prisegta" });
  }
  // Užduoties išlaida: jei ji susieta su operacija, dokumento reikalauja operacija (žemiau), todėl čia – tik
  // trūkstami arba jau su čekiu (tas pats principas kaip Buhalterijoje)
  (car.checklist || [])
    .filter(t => t.done && Number(t.expense || 0) > 0)
    .forEach(t => {
      const key = `task:${car.id}:${t.id}`;
      const label = `Čekis: ${t.name || "užduotis"}`;
      if (miss.has(key)) {
        items.push({
          key,
          state: "todo",
          label,
          sub: moneyFmt(t.expense),
          act: "Pridėti",
          run: `req:${key}`
        });
        miss.delete(key);
      } else if ((t.receipts || []).length)
        items.push({ key, state: "done", label, meta: moneyFmt(t.expense) });
    });
  (state.finances?.transactions || [])
    .filter(tx => tx && tx.type === "expense" && tx.carId === car.id)
    .forEach(tx => {
      const key = `tx:${tx.id}`;
      const label = `Čekis: ${tx.category || tx.title || "išlaida"}`;
      if (miss.has(key)) {
        items.push({
          key,
          state: "todo",
          label,
          sub: moneyFmt(tx.amount),
          act: "Pridėti",
          run: `req:${key}`
        });
        miss.delete(key);
      } else items.push({ key, state: "done", label, meta: moneyFmt(tx.amount) });
    });
  miss.forEach((i, key) =>
    items.push({ key, state: "todo", label: i.label, sub: i.detail || "", act: "Pridėti", run: `req:${key}` })
  );
  items.forEach(i => {
    if (i.state !== "done") i.next = `Pridėti: ${i.label.replace(/^Čekis: /, "čekis – ")}`;
  });
  return items;
}

// ---------- HTML ----------
function ccRowHTMLV83(i) {
  const ico = i.state === "done" ? CC_ICON_V83.check : i.state === "bad" ? CC_ICON_V83.bang : "";
  const sub = i.sub
    ? `<small>${escapeHTML(i.sub)}${i.late ? ` · <em>${typeof i.late === "number" ? `${i.late} vėluoja` : "vėluoja"}</em>` : ""}</small>`
    : "";
  const right =
    i.state === "done"
      ? `<span class="ccRowMetaV83${i.warn ? " warn" : ""}">${escapeHTML(i.meta || "")}</span>`
      : `<button type="button" class="ccPillV83${i.state === "bad" ? " danger" : ""}" data-cc-act="${escapeHTML(i.run || i.key)}"${i.choice ? ` data-cc-choice="${escapeHTML(i.key)}" aria-expanded="false"` : ""}>${escapeHTML(i.act)}${CC_ICON_V83.arrow}</button>`;
  const choice = i.choice
    ? `<div class="ccChoiceV83" data-cc-choice-for="${escapeHTML(i.key)}" hidden>${i.choice
        .map(
          ([act, text]) =>
            `<button type="button" data-cc-act="${escapeHTML(act)}">${escapeHTML(text)}</button>`
        )
        .join("")}</div>`
    : "";
  return `<div class="ccRowV83 ${i.state}" data-cc-row="${escapeHTML(i.key)}"><span class="ccRowIcoV83">${ico}</span><span class="ccRowMainV83"><strong>${escapeHTML(i.label)}</strong>${sub}</span>${right}</div>${choice}`;
}
function ccReadyHTMLV83(car) {
  const sold = ccSoldV83(car);
  const items = sold ? ccAccountantItemsV83(car) : ccReadyItemsV83(car);
  const total = items.length;
  const done = items.filter(i => i.state === "done").length;
  const complete = done === total;
  const open = !complete && ccOpenV83.ready.has(car.id);
  const title = sold ? "Dokumentai buhalterei" : "Pasirengimas pardavimui";
  const todo = [...items.filter(i => i.state === "bad"), ...items.filter(i => i.state === "todo")];
  const next = todo[0];
  const segs = items.map(i => `<i class="${complete ? "all" : i.state}"></i>`).join("");
  const progress = `<span class="ccSegsV83" role="progressbar" aria-label="${escapeHTML(title)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">${segs}</span>`;
  const send = sold ? `<div class="ccSendV83${complete ? " ready" : ""}" data-cc-send-slot></div>` : "";
  if (complete || !total)
    return `<section class="ccCardV83 ccRdyV83 is-complete" data-cc-ready><div class="ccRdyHeadV83 static"><span class="ccRdyTopV83"><span class="ccDoneMarkV83">${CC_ICON_V83.check}</span><strong>${sold ? "Viskas paruošta buhalterei" : "Paruoštas parduoti"}</strong><span class="ccRdyCountV83"><b>${done}</b> iš ${total}</span></span>${progress}</div>${send}</section>`;
  const list = [...todo, ...items.filter(i => i.state === "done")].map(ccRowHTMLV83).join("");
  return `<section class="ccCardV83 ccRdyV83${open ? " is-open" : ""}" data-cc-ready>
    <button type="button" class="ccRdyHeadV83" data-cc-ready-toggle aria-expanded="${open}" aria-controls="ccRdyListV83"><span class="ccRdyTopV83"><strong>${title}</strong><span class="ccRdyCountV83"><b>${done}</b> iš ${total}${sold ? "" : " paruošta"}</span><span class="ccChevV83">${CC_ICON_V83.chev}</span></span>${progress}</button>
    <div class="ccNextV83${next.state === "bad" ? " bad" : ""}"><span><small>Kitas žingsnis</small><b>${escapeHTML(next.next || next.label)}</b></span><button type="button" class="ccPillV83${next.state === "bad" ? " danger" : ""}" data-cc-act="${escapeHTML(next.run || next.key)}" data-cc-next>${escapeHTML(next.act)}${CC_ICON_V83.arrow}</button></div>
    <div class="ccAccBodyV83" id="ccRdyListV83"><div class="ccAccInnerV83"><div class="ccRowsV83">${list}</div>${send}</div></div>
  </section>`;
}
function ccNumsHTMLV83(car) {
  const sold = ccSoldV83(car);
  const cost = carTotalCost(car);
  const open = ccOpenV83.cost.has(car.id);
  const costCell = `<button type="button" class="ccNumV83 ccCostBtnV83" data-cc-cost aria-expanded="${open}"><span>Savikaina<i class="ccChevV83">${CC_ICON_V83.chev}</i></span><b>${moneyFmt(cost)}</b></button>`;
  let mid, margin;
  if (sold) {
    const sale = Number(car.soldPrice || 0);
    const m = sale - cost;
    mid = `<div class="ccNumV83"><span>Parduota</span><b>${moneyFmt(sale)}</b></div>`;
    margin = `<div class="ccNumV83"><span>Marža</span><b class="${m >= 0 ? "pos" : "neg"}" data-cc-margin>${ccSignedMoneyV83(m)}</b></div>`;
  } else {
    const price = ccPriceV83(car);
    mid = `<div class="ccNumV83 ccPriceCellV83" data-cc-price-cell><span>Kaina</span>${
      price
        ? `<button type="button" class="ccPriceBtnV83" data-cc-price aria-label="Keisti kainą"><b>${moneyFmt(price)}</b></button>`
        : `<button type="button" class="ccSetPriceV83" data-cc-price>Nustatyti kainą</button>`
    }</div>`;
    const m = price ? price - cost : null;
    margin = `<div class="ccNumV83"><span>Marža</span><b class="${m === null ? "none" : m >= 0 ? "pos" : "neg"}" data-cc-margin>${m === null ? "—" : ccSignedMoneyV83(m)}</b></div>`;
  }
  return `<section class="ccCardV83 ccNumsV83${open ? " is-open" : ""}" data-cc-nums><div class="ccNumsGridV83">${costCell}${mid}${margin}</div><div class="ccAccBodyV83" id="ccCostV83"><div class="ccAccInnerV83" data-cc-cost-body>${open ? ccCostRowsHTMLV83(car) : ""}</div></div></section>`;
}
// Savikainos sudėtis – ta pati logika kaip carChecklistExpenses (07-finance.js)
function ccCostRowsHTMLV83(car) {
  const rows = [["Pirkimo kaina", Number(car.buyPrice || 0), "", false]];
  (car.checklist || [])
    .filter(t => Number(t.expense) > 0)
    .forEach(t =>
      rows.push([
        t.name || "Užduotis",
        Number(t.expense),
        t.done ? "užduotis" : "užduotis · planuojama",
        false
      ])
    );
  (state.finances?.transactions || [])
    .filter(
      tx =>
        tx &&
        tx.source === "accounting" &&
        tx.carId === car.id &&
        (tx.type === "expense" || tx.type === "income")
    )
    .forEach(tx => {
      const amount = Math.abs(Number(tx.amount) || 0);
      rows.push([
        tx.title || tx.category || (tx.type === "income" ? "Įplauka" : "Išlaida"),
        tx.type === "income" ? -amount : amount,
        `Buhalterija${tx.date ? " · " + String(tx.date).slice(0, 10) : ""}`,
        tx.type === "income"
      ]);
    });
  return `<div class="ccCostListV83">${rows
    .map(
      ([label, amount, sub, minus]) =>
        `<div class="ccCostRowV83"><span><strong>${escapeHTML(label)}</strong>${sub ? `<small>${escapeHTML(sub)}</small>` : ""}</span><b class="${minus ? "neg" : ""}">${minus ? "−" + moneyFmt(Math.abs(amount)) : moneyFmt(amount)}</b></div>`
    )
    .join(
      ""
    )}<div class="ccCostRowV83 total"><span><strong>Savikaina</strong></span><b>${moneyFmt(carTotalCost(car))}</b></div></div><button type="button" class="ccLinkV83" data-cc-act="add-expense">+ Pridėti išlaidą</button>`;
}
function ccSecHTMLV83(key, title, summary, open, help = "") {
  return `<section class="ccCardV83 ccSecV83${open ? " is-open" : ""}" data-cc-sec="${key}"><div class="ccSecHeadV83"><button type="button" class="ccSecToggleV83" data-cc-sec-toggle="${key}" aria-expanded="${open}" aria-controls="ccSec-${key}"><span class="ccSecTitleV83">${escapeHTML(title)}</span><span class="ccSecSumV83">${summary}</span><span class="ccChevV83">${CC_ICON_V83.chev}</span></button>${help}</div><div class="ccAccBodyV83" id="ccSec-${key}"><div class="ccAccInnerV83" data-cc-sec-body="${key}"></div></div></section>`;
}
function ccHeroHTMLV83(car) {
  const photos = ccPhotosV83(car);
  if (!photos.length)
    return `<button type="button" class="ccHeroEmptyV83" data-cc-act="photos"><span class="ccHeroEmptyIcoV83">${CC_ICON_V83.camera}</span><span><strong>Pridėti nuotraukų</strong><small>Pirmoji nuotrauka taps viršeliu</small></span></button>`;
  return `<div class="ccHeroV83"><div class="ccHeroTrackV83">${photos
    .map(
      (_, i) =>
        `<button type="button" class="ccHeroSlideV83" data-cc-photo="${i}" aria-label="Nuotrauka ${i + 1} iš ${photos.length}"><img alt="" decoding="async"${i > 1 ? ' loading="lazy"' : ""}></button>`
    )
    .join(
      ""
    )}</div>${photos.length > 1 ? `<span class="ccHeroCountV83" aria-hidden="true">1/${photos.length}</span>` : ""}</div>`;
}

// ---------- Kortelės sudėliojimas ----------
function ccSectionsStateV83() {
  state.ui = state.ui || {};
  if (!state.ui.carSections || typeof state.ui.carSections !== "object") state.ui.carSections = {};
  return state.ui.carSections;
}
function ccBuildV83(sheet, car) {
  const body = sheet.querySelector(".premiumDetailBody");
  const detail = sheet.querySelector(".premiumDetail");
  if (!body || !detail) return;
  sheet.classList.add("ccV83", "ccInstantV83");
  sheet.classList.toggle("ccSoldV83", ccSoldV83(car));
  const sold = ccSoldV83(car);
  // Antraštė: valst. nr. ir dienos
  const title = sheet.querySelector(".premiumSheetTitle");
  if (title && !title.querySelector(".ccSubV83")) {
    const d = ccDaysV83(car);
    const tone = !d ? "" : d.sold ? "sold" : d.days >= 90 ? "red" : d.days >= 45 ? "amber" : "";
    const chip = d
      ? `<span class="ccDaysV83 ${tone}">${CC_ICON_V83.clock}${d.sold ? `Parduota per ${ccDaysWordV83(d.days)}` : `Garaže ${ccDaysWordV83(d.days)}`}</span>`
      : "";
    const plate = car.plate ? lcPlateHTMLV61(car.plate) : "";
    if (plate || chip) title.insertAdjacentHTML("beforeend", `<div class="ccSubV83">${plate}${chip}</div>`);
  }
  // Nuotraukos
  sheet.querySelector(".premiumHero")?.classList.add("ccHiddenV83");
  detail.querySelector(".ccHeroV83, .ccHeroEmptyV83")?.remove();
  body.insertAdjacentHTML("beforebegin", ccHeroHTMLV83(car));
  ccFillHeroV83(sheet, car);
  // Seni blokai, kuriuos pakeičia nauji
  const info = sheet.querySelector("#cdInfoV51");
  const specs = info?.querySelector(".cdSpecsV60");
  info?.classList.add("ccHiddenV83");
  sheet
    .querySelectorAll(".carBottomCostGrid, .premiumResult, .premiumResultGrid, .carAfterTasks")
    .forEach(n => n.classList.add("ccHiddenV83"));
  body.querySelectorAll(":scope > .ccCardV83").forEach(n => n.remove());
  // Skaičiai ir pasirengimas
  body.insertAdjacentHTML("afterbegin", ccNumsHTMLV83(car) + ccReadyHTMLV83(car));
  // Skiltys
  const st = ccSectionsStateV83();
  const tasks = ccTaskStatsV83(car);
  const photos = ccPhotosV83(car).length;
  const docs = (car.documents || []).length;
  const facts = [
    car.plate,
    car.firstRegistrationDate ? String(car.firstRegistrationDate).slice(0, 4) : car.year,
    Number(car.mileage) > 0 ? `${Number(car.mileage).toLocaleString("lt-LT")} km` : ""
  ]
    .filter(Boolean)
    .map(x => escapeHTML(String(x)))
    .join(" · ");
  const taskSum = tasks.total
    ? `${tasks.done}/${tasks.total}${tasks.late ? ` · <em>${tasks.late} vėluoja</em>` : ""}`
    : "Nėra";
  const html =
    ccSecHTMLV83(
      "tasks",
      "Užduotys",
      taskSum,
      tasks.late > 0 || !!st.tasks,
      '<span class="ccHelpSlotV83" data-help-slot="uzduotys"></span>'
    ) +
    ccSecHTMLV83("photos", "Nuotraukos", photos ? String(photos) : "Nėra", !!st.photos) +
    ccSecHTMLV83("docs", "Dokumentai", docs ? String(docs) : "Nėra", !!st.docs) +
    ccSecHTMLV83("data", "Duomenys", facts || "—", !!st.data);
  const anchor = body.querySelector(":scope > [data-cc-ready]");
  anchor.insertAdjacentHTML("afterend", html);
  const slot = key => body.querySelector(`[data-cc-sec-body="${key}"]`);
  const tasksBlock = sheet.querySelector(".carTasksBlock");
  if (tasksBlock) slot("tasks").appendChild(tasksBlock);
  const photosBlock = sheet.querySelector("#carDetailPhotos");
  if (photosBlock) slot("photos").appendChild(photosBlock);
  const docsBlock = sheet.querySelector("#carDetailDocuments");
  if (docsBlock) {
    docsBlock.open = true;
    slot("docs").appendChild(docsBlock);
  }
  if (specs) slot("data").appendChild(specs);
  else body.querySelector('[data-cc-sec="data"]')?.remove();
  // Parduoto automobilio buhalterijos veiksmai – „Dokumentai buhalterei“ bloke
  const acc = sheet.querySelector(".accountingCarBox");
  const sendSlot = body.querySelector("[data-cc-send-slot]");
  if (acc) {
    acc.classList.add("ccHiddenV83");
    const actions = acc.querySelector(".accountingCarActions");
    if (actions && sendSlot) sendSlot.appendChild(actions);
  }
  // Veiksmų juosta
  ccBuildBarV83(sheet, car, sold);
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.remove("ccInstantV83")));
}
function ccBuildBarV83(sheet, car, sold) {
  const bar = sheet.querySelector(".carBottomActions");
  if (!bar) return;
  bar.classList.add("ccBarV83");
  bar.querySelectorAll(".ccBarBtnV83, .ccMenuV83").forEach(n => n.remove());
  const pp = bar.querySelector(".carPpBottomBtn");
  const inv = bar.querySelector(".carInvBottomBtn");
  const edit = bar.querySelector("#editCarInfoBtn");
  const del = bar.querySelector("#deleteCarBtn");
  bar.insertAdjacentHTML(
    "beforeend",
    `<button type="button" class="ccBarBtnV83 ccDocsBtnV83${sold ? " wide" : ""}" data-cc-menu="docs" aria-haspopup="true" aria-expanded="false">${CC_ICON_V83.doc}<span>Dokumentai</span></button><button type="button" class="ccBarBtnV83 ccMoreBtnV83" data-cc-menu="more" aria-haspopup="true" aria-expanded="false" aria-label="Daugiau veiksmų">${CC_ICON_V83.more}</button><div class="ccMenuV83" data-cc-menu-panel="docs" role="menu" hidden></div><div class="ccMenuV83" data-cc-menu-panel="more" role="menu" hidden></div>`
  );
  const docsMenu = bar.querySelector('[data-cc-menu-panel="docs"]');
  const moreMenu = bar.querySelector('[data-cc-menu-panel="more"]');
  [pp, inv].forEach(b => b && docsMenu.appendChild(b));
  [edit, del].forEach(b => b && moreMenu.appendChild(b));
  if (pp) pp.textContent = "PP sutartis";
  if (inv) inv.textContent = "Sąskaita faktūra";
  if (edit) edit.textContent = "Redaguoti";
  if (del) del.textContent = "Ištrinti";
  // Juosta – paskutinis lango elementas, kad prilimptų apačioje; per visą lango plotį (be šoninių paraščių)
  if (bar.parentElement !== sheet) sheet.appendChild(bar);
  sheet.style.setProperty("--ccPadV83", getComputedStyle(sheet).paddingLeft || "10px");
}
async function ccFillHeroV83(sheet, car) {
  const hero = sheet.querySelector(".ccHeroV83");
  if (!hero) return;
  const photos = ccPhotosV83(car);
  const slides = [...hero.querySelectorAll("[data-cc-photo]")];
  slides.forEach((btn, i) => {
    phUrlV67(photos[i]).then(url => {
      const img = btn.querySelector("img");
      if (url && img && img.isConnected && !img.getAttribute("src")) img.src = url;
    });
  });
  const track = hero.querySelector(".ccHeroTrackV83");
  const count = hero.querySelector(".ccHeroCountV83");
  if (!track || !count) return;
  let raf = 0;
  track.addEventListener(
    "scroll",
    () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        count.textContent = `${Math.min(photos.length, i + 1)}/${photos.length}`;
      });
    },
    { passive: true }
  );
}

// ---------- Atnaujinimas be visos kortelės perpiešimo ----------
function ccRefreshTopV83(car) {
  const sheet = document.getElementById("sheet");
  const body = sheet?.querySelector(".premiumDetailBody");
  if (!body || sheet.dataset.carV63 !== car.id) return;
  sheet.classList.add("ccInstantV83");
  const nums = body.querySelector("[data-cc-nums]");
  const ready = body.querySelector("[data-cc-ready]");
  const sendActions = ready?.querySelector(".accountingCarActions");
  if (nums) nums.outerHTML = ccNumsHTMLV83(car);
  if (ready) {
    ready.outerHTML = ccReadyHTMLV83(car);
    const slot = body.querySelector("[data-cc-send-slot]");
    if (slot && sendActions) slot.appendChild(sendActions);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.remove("ccInstantV83")));
}
function ccEditPriceV83(car) {
  const sheet = document.getElementById("sheet");
  if (ccSoldV83(car)) return;
  const nums = sheet?.querySelector("[data-cc-nums]");
  if (!nums) return;
  nums.scrollIntoView({ block: "nearest", behavior: "smooth" });
  const cell = nums.querySelector("[data-cc-price-cell]");
  if (!cell || cell.querySelector("input")) return;
  const price = ccPriceV83(car);
  cell.innerHTML = `<span>Kaina</span><label class="ccPriceEditV83"><input type="text" inputmode="numeric" autocomplete="off" aria-label="Kaina, €" value="${price || ""}" placeholder="0"><i>€</i></label>`;
  const input = cell.querySelector("input");
  const marginEl = nums.querySelector("[data-cc-margin]");
  const cost = carTotalCost(car);
  const parse = () => {
    const n = Number(String(input.value).replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const live = () => {
    const n = parse();
    const m = n ? n - cost : null;
    marginEl.className = m === null ? "none" : m >= 0 ? "pos" : "neg";
    marginEl.textContent = m === null ? "—" : ccSignedMoneyV83(m);
  };
  let done = false;
  const finish = save => {
    if (done) return;
    done = true;
    const fresh = ccCarV83(car.id) || car;
    if (save) {
      const n = parse();
      const before = ccPriceV83(fresh);
      if (n !== before) {
        fresh.askingPrice = n || null;
        saveState();
        vibrate(8);
        if (n) toast(`Kaina: ${moneyFmt(n)}`, "✓");
      }
    }
    ccRefreshTopV83(fresh);
  };
  input.addEventListener("input", live);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
  input.focus({ preventScroll: true });
  input.select();
}
function ccToggleV83(section, open) {
  const body = section.querySelector(":scope > .ccAccBodyV83");
  section.classList.toggle("is-open", open);
  section.querySelector("[aria-expanded]")?.setAttribute("aria-expanded", String(open));
  body?.setAttribute("aria-hidden", String(!open));
}
function ccOpenSectionV83(key, scroll = true) {
  const sec = document.querySelector(`#sheet [data-cc-sec="${key}"]`);
  if (!sec) return;
  ccToggleV83(sec, true);
  ccSectionsStateV83()[key] = true;
  saveState();
  if (scroll) setTimeout(() => sec.scrollIntoView({ block: "start", behavior: "smooth" }), 60);
}
function ccCloseMenusV83(except = "") {
  document.querySelectorAll("#sheet [data-cc-menu-panel]").forEach(p => {
    if (p.dataset.ccMenuPanel === except) return;
    p.hidden = true;
    p.classList.remove("show");
  });
  document.querySelectorAll("#sheet [data-cc-menu]").forEach(b => {
    if (b.dataset.ccMenu !== except) b.setAttribute("aria-expanded", "false");
  });
}
function ccOpenRegitraV83(kind, carId) {
  closeSheet();
  setTimeout(() => {
    document.querySelector('.navBtn[data-view="menu"]')?.click();
    setTimeout(() => {
      const text = kind === "sdk" ? "SDK paieška" : "Draudimo patikra";
      const tile = [...document.querySelectorAll("#view-menu .menuLink")].find(b =>
        b.textContent.includes(text)
      );
      tile?.click();
      setTimeout(() => {
        const sel = document.querySelector("#menuInlineDisclosure [data-rg-car]");
        if (sel && [...sel.options].some(o => o.value === carId)) {
          sel.value = carId;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, 120);
    }, 120);
  }, 60);
}
function ccRunActionV83(act, car, btn) {
  vibrate(8);
  if (act === "photos") return document.getElementById("carAddPhotos")?.click();
  if (act === "tasks") return ccOpenSectionV83("tasks");
  if (act === "ta") return openCarEditSheet(car.id);
  if (act === "insurance") return ccOpenRegitraV83("ins", car.id);
  if (act === "sdk") return ccOpenRegitraV83("sdk", car.id);
  if (act === "price") return ccEditPriceV83(car);
  if (act === "purchase-create" || act === "sale-create") return openContractSheetV52({ carId: car.id });
  if (act === "purchase-upload") return document.getElementById("viewVehicledoc_purchase")?.click();
  if (act.startsWith("upload:")) return document.getElementById("viewVehicledoc_" + act.slice(7))?.click();
  if (act.startsWith("req:")) {
    if (!window.__aeRequiredDocsV83?.open) return;
    ccReturnCarV83 = car.id;
    return window.__aeRequiredDocsV83.open(act.slice(4));
  }
  if (act === "add-expense") {
    closeSheet();
    setTimeout(() => {
      document.querySelector('.navBtn[data-view="accounting"]')?.click();
      setTimeout(() => {
        document.querySelector('#accountingRoot [data-accounting-panel="expense"]')?.click();
        setTimeout(() => {
          const sel = document.getElementById("accountingMoneyCar");
          if (sel && [...sel.options].some(o => o.value === car.id)) {
            sel.value = car.id;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, 150);
      }, 150);
    }, 60);
  }
}

// ---------- Įvykiai ----------
document.addEventListener("click", e => {
  const sheet = document.getElementById("sheet");
  if (!sheet?.classList.contains("ccV83")) return;
  const t = e.target;
  if (!(t instanceof Element)) return;
  // Meniu uždaromi paspaudus kitur
  if (!t.closest(".ccBarV83")) ccCloseMenusV83();
  if (!sheet.contains(t)) return;
  const car = ccCarV83(sheet.dataset.carV63 || "");
  if (!car) return;
  const menuBtn = t.closest("[data-cc-menu]");
  if (menuBtn) {
    const key = menuBtn.dataset.ccMenu;
    const panel = sheet.querySelector(`[data-cc-menu-panel="${key}"]`);
    const open = panel.hidden;
    ccCloseMenusV83(key);
    panel.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) requestAnimationFrame(() => panel.classList.add("show"));
    vibrate(6);
    return;
  }
  if (t.closest(".ccMenuV83 button")) {
    // Pats mygtukas (PP sutartis, Sąskaita faktūra, Redaguoti, Ištrinti) veikia per esamus modulius
    setTimeout(() => ccCloseMenusV83(), 0);
    return;
  }
  const secToggle = t.closest("[data-cc-sec-toggle]");
  if (secToggle) {
    const key = secToggle.dataset.ccSecToggle;
    const sec = secToggle.closest("[data-cc-sec]");
    const open = !sec.classList.contains("is-open");
    ccToggleV83(sec, open);
    ccSectionsStateV83()[key] = open;
    saveState();
    return;
  }
  if (t.closest("[data-cc-ready-toggle]")) {
    const sec = t.closest("[data-cc-ready]");
    const open = !sec.classList.contains("is-open");
    ccToggleV83(sec, open);
    if (open) ccOpenV83.ready.add(car.id);
    else ccOpenV83.ready.delete(car.id);
    return;
  }
  const cost = t.closest("[data-cc-cost]");
  if (cost) {
    const sec = cost.closest("[data-cc-nums]");
    const open = !sec.classList.contains("is-open");
    const bodyEl = sec.querySelector("[data-cc-cost-body]");
    if (open && !bodyEl.innerHTML) bodyEl.innerHTML = ccCostRowsHTMLV83(car);
    ccToggleV83(sec, open);
    cost.setAttribute("aria-expanded", String(open));
    if (open) ccOpenV83.cost.add(car.id);
    else ccOpenV83.cost.delete(car.id);
    return;
  }
  if (t.closest("[data-cc-price]")) return ccEditPriceV83(car);
  const photo = t.closest("[data-cc-photo]");
  if (photo) return openManagedPhotoGallery("car", car.id, Number(photo.dataset.ccPhoto) || 0);
  const choiceBtn = t.closest("[data-cc-choice]");
  if (choiceBtn && !choiceBtn.hasAttribute("data-cc-next")) {
    const box = sheet.querySelector(`[data-cc-choice-for="${CSS.escape(choiceBtn.dataset.ccChoice)}"]`);
    if (box) {
      box.hidden = !box.hidden;
      choiceBtn.setAttribute("aria-expanded", String(!box.hidden));
    }
    return;
  }
  const act = t.closest("[data-cc-act]");
  if (act) {
    let a = act.dataset.ccAct;
    // „Kitas žingsnis“ su pasirinkimu – atveria sąrašą ir pasirinkimą
    if (act.hasAttribute("data-cc-next") && (a === "purchase" || a === "")) {
      const sec = act.closest("[data-cc-ready]");
      ccToggleV83(sec, true);
      ccOpenV83.ready.add(car.id);
      const key = a === "purchase" ? "purchase" : `car:${car.id}:sale`;
      const box = sec.querySelector(`[data-cc-choice-for="${CSS.escape(key)}"]`);
      if (box) box.hidden = false;
      return;
    }
    if (a) ccRunActionV83(a, car, act);
  }
});
document.addEventListener(
  "keydown",
  e => {
    if (e.key !== "Escape") return;
    const open = document.querySelector("#sheet.ccV83 [data-cc-menu-panel]:not([hidden])");
    if (!open) return;
    e.preventDefault();
    e.stopPropagation();
    ccCloseMenusV83();
  },
  true
);
// Pridėjus dokumentą kortelėje – po perpiešimo atidaroma „Dokumentai“ skiltis
document.addEventListener(
  "change",
  e => {
    if (e.target instanceof Element && e.target.closest("#sheet.ccV83 .vehicleDocInputs input")) {
      ccSectionsStateV83().docs = true;
    }
  },
  true
);
// Iš kortelės atidarytas „Pridėti dokumentą“ (Buhalterijos forma) – uždarius grįžtama į kortelę
const __closeSheetV83 = closeSheet;
closeSheet = function () {
  const back = ccReturnCarV83;
  ccReturnCarV83 = "";
  const r = __closeSheetV83.apply(this, arguments);
  if (back && ccCarV83(back)) setTimeout(() => openCar(back), 260);
  return r;
};
const __renderCarSheetV83 = renderCarSheet;
renderCarSheet = function (car) {
  const r = __renderCarSheetV83.apply(this, arguments);
  const sheet = document.getElementById("sheet");
  if (sheet && car && sheet.querySelector(".premiumDetailBody")) {
    try {
      ccBuildV83(sheet, car);
    } catch (err) {
      console.warn("Kortelė v83", err);
    }
  }
  return r;
};
window.AutoEasierCarCard = { ready: ccReadyItemsV83, accountant: ccAccountantItemsV83, days: ccDaysV83 };
