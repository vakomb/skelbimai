// Vadybininkas (v72): vienas užduočių variklis ir vienas langų rinkinys.
// - Sistema pati sugalvoja darbus (trūkstami duomenys ir dokumentai, nuotraukos, TA / draudimas, kainos, skambučiai,
//   buhalterija, pirmi žingsniai) ir sujungia juos su naudotojo užduotimis (automobilio ir bendromis).
// - Puslapis: Skubu (vėluoja / šiandien), kortelės pagal automobilį (kaip Buhalterijoje), Bendra.
// - Paspaudus darbą, iš apačios išslenka langas su tuo, ko reikia (laukai, dokumentai, nuotraukos, kaina, čekis…).
// Perrašo renderGarageWhatApp, workCenterItems ir openWhatItemV30 (OVERRIDES.md), todėl automobilio kortelės
// „Vadybininko užduotys“ naudoja tuos pačius langus. Stilius – 183-manager-v72.css.
const MG_ICO = {
  car: '<path d="M5 16H3.5a.5.5 0 0 1-.5-.5V13l2-5.2A1.5 1.5 0 0 1 6.4 7h11.2a1.5 1.5 0 0 1 1.4.8L21 13v2.5a.5.5 0 0 1-.5.5H19"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m14 7 3 3"/>',
  doc: '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  cam: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.4"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 3 7.7 7 9.5 4-1.8 7-5.2 7-9.5V6l-7-3Z"/>',
  euro: '<path d="M17 7.5A6 6 0 1 0 17 16.5M4 10.5h9M4 13.5h9"/>',
  phone:
    '<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.6-4 3.4-6 7-6s6.4 2 7 6"/>',
  folder:
    '<path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V7.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chev: '<path d="m9 6 6 6-6 6"/>'
};
const mgIco = (n, s = 20) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MG_ICO[n] || MG_ICO.check}</svg>`;
const MG_PHOTO_GOAL = 5;
const MG_STALE_DAYS = 30;
const MG_DAY = 864e5;
function mgDays(iso) {
  if (!iso) return null;
  return Math.round((Date.parse(iso + "T00:00:00") - Date.parse(todayISO() + "T00:00:00")) / MG_DAY);
}
function mgDue(iso) {
  const d = mgDays(iso);
  if (d == null) return null;
  if (d < 0) return { text: `Vėluoja ${-d} d.`, tone: "bad" };
  if (d === 0) return { text: "Šiandien", tone: "warn" };
  if (d === 1) return { text: "Rytoj", tone: "" };
  if (d <= 6) return { text: `Po ${d} d.`, tone: "" };
  return { text: companyDate(iso), tone: "" };
}
function mgCarName(car) {
  return car?.name || "Automobilis";
}

// ---------- Užduočių variklis ----------
function mgItem(d) {
  const item = { due: "", late: false, group: "normal", base: 60, cta: "Atidaryti", icon: "check", ...d };
  item.late = !!(item.due && item.due < todayISO());
  const dd = mgDays(item.due);
  item.urgent = item.urgent || item.late || dd === 0;
  item.score = workScore(item.base, item.due, item.late, d.profit ?? null);
  return item;
}
function mgAllV72() {
  const items = [];
  const now = todayISO();
  const cars = state.cars || [];
  const active = cars.filter(c => c.status !== "parduotas");
  active.forEach(car => {
    const name = mgCarName(car);
    const base = { kind: "car", id: car.id, entity: name };
    const profit = carPotentialProfit(car);
    // Naudotojo užduotys automobiliui
    (car.checklist || [])
      .filter(t => !t.done)
      .forEach(t => {
        const due = mgDue(t.dueDate);
        items.push(
          mgItem({
            ...base,
            key: `car:${car.id}:task:${t.id}`,
            action: t.name || "Užduotis",
            detail: due ? due.text : "Be termino",
            actionType: "car-task",
            taskId: t.id,
            user: true,
            icon: "check",
            due: t.dueDate || "",
            base: 150,
            cta: "Atlikti",
            profit,
            quiet: !t.dueDate || mgDays(t.dueDate) > 3
          })
        );
      });
    const missing = workCenterMissingFieldsV30(car);
    if (missing.length) {
      const labels = missing.map(x => x.label);
      items.push(
        mgItem({
          ...base,
          key: `car:${car.id}:missing-data`,
          action: "Užpildyti duomenis",
          detail: labels.slice(0, 3).join(", ") + (labels.length > 3 ? ` +${labels.length - 3}` : ""),
          actionType: "missing-data",
          fields: missing,
          icon: "edit",
          base: 128,
          cta: "Užpildyti",
          profit
        })
      );
    }
    const docs = workCenterMissingDocsV30(car);
    if (docs.length)
      items.push(
        mgItem({
          ...base,
          key: `car:${car.id}:missing-docs`,
          action: "Prisegti dokumentus",
          detail: docs.map(d => d.label).join(", "),
          actionType: "missing-docs",
          missingDocs: docs,
          icon: "doc",
          base: 118,
          cta: "Pridėti",
          profit
        })
      );
    const photos = (car.photos || []).filter(Boolean).length;
    if (photos < MG_PHOTO_GOAL)
      items.push(
        mgItem({
          ...base,
          key: `car:${car.id}:photos`,
          action: photos ? "Įkelti daugiau nuotraukų" : "Įkelti nuotraukas",
          detail: photos ? `Yra ${photos}, rekomenduojama ${MG_PHOTO_GOAL}+` : "Skelbimui reikia bent 5",
          actionType: "photos",
          icon: "cam",
          base: photos ? 80 : 110,
          cta: "Įkelti",
          profit
        })
      );
    const sdk = car.sdkStatus || "unset";
    if (sdk.endsWith("-late"))
      items.push(
        mgItem({
          ...base,
          key: `car:${car.id}:sdk-late`,
          action: "Sutvarkyti SDK",
          detail: "SDK procesas vėluoja",
          actionType: "open-car",
          icon: "doc",
          urgent: true,
          base: 146,
          cta: "Atidaryti",
          profit
        })
      );
    else if (car.sdk && !["unset", "done"].includes(sdk))
      items.push(
        mgItem({
          ...base,
          key: `car:${car.id}:sdk-progress`,
          action: "Užbaigti SDK",
          detail: "Dar nepažymėta kaip sutvarkyta",
          actionType: "open-car",
          icon: "doc",
          base: 108,
          cta: "Atidaryti",
          profit
        })
      );
    [
      ["ta", "taStatus", "taUntil", "TA", "Atnaujinti TA"],
      ["insurance", "insuranceStatus", "insuranceUntil", "Draudimas", "Atnaujinti draudimą"]
    ].forEach(([kind, sKey, dKey, label]) => {
      const st = vehicleStatusState(car[sKey] || "unknown", car[dKey] || "");
      if (st.cls === "bad" || st.cls === "warn") {
        const until = car[dKey] || "";
        const left = mgDays(until);
        items.push(
          mgItem({
            ...base,
            key: `car:${car.id}:${kind}-problem`,
            action: st.cls === "bad" ? `${label} negalioja` : `${label} baigiasi`,
            detail: until
              ? left < 0
                ? `Pasibaigė ${companyDate(until)}`
                : `Iki ${companyDate(until)}`
              : st.label,
            actionType: "status",
            statusKind: kind,
            icon: kind === "ta" ? "flag" : "shield",
            due: until,
            urgent: st.cls === "bad",
            base: st.cls === "bad" ? 122 : 96,
            cta: "Atnaujinti",
            profit
          })
        );
      }
    });
    const asking = Number(car.askingPrice || 0);
    if (!asking)
      items.push(
        mgItem({
          ...base,
          key: `car:${car.id}:set-price`,
          action: "Nustatyti pardavimo kainą",
          detail: "Be jos nematyti numatomos maržos",
          actionType: "price",
          icon: "euro",
          base: 100,
          cta: "Nustatyti",
          profit
        })
      );
    else {
      const age = -(mgDays(car.listingDate || car.createdDateISO) ?? 0);
      if (age >= MG_STALE_DAYS)
        items.push(
          mgItem({
            ...base,
            key: `car:${car.id}:price-review`,
            action: "Peržiūrėti kainą",
            detail: `Stovi ${age} d.`,
            actionType: "price",
            icon: "euro",
            base: 78,
            cta: "Peržiūrėti",
            profit
          })
        );
    }
  });
  // Variantai
  (state.leadVariants || []).forEach(l => {
    const name = [l.make, l.model].filter(Boolean).join(" ") || "Pirkimo variantas";
    if (l.nextCallDate && l.nextCallDate <= now)
      items.push(
        mgItem({
          key: `lead:${l.id}:callback`,
          kind: "lead",
          id: l.id,
          entity: name,
          action: "Paskambinti pardavėjui",
          detail: mgDue(l.nextCallDate).text,
          actionType: "lead",
          icon: "phone",
          due: l.nextCallDate,
          base: 126,
          cta: "Skambinti",
          profit: leadPotentialProfit(l)
        })
      );
    else if (!Number(l.targetPrice || 0))
      items.push(
        mgItem({
          key: `lead:${l.id}:price`,
          kind: "lead",
          id: l.id,
          entity: name,
          action: "Pateikti savo kainą",
          detail: `Pardavėjas prašo ${moneyFmt(l.initialPrice || 0)}`,
          actionType: "lead-price",
          icon: "euro",
          base: 90,
          cta: "Nustatyti"
        })
      );
  });
  // Klientai
  (state.customers || [])
    .filter(c => c.stage !== "Užbaigta" && c.followDate && c.followDate <= now)
    .forEach(c => {
      const inspection = c.stage === "Apžiūra";
      items.push(
        mgItem({
          key: `customer:${c.id}:follow`,
          kind: "customer",
          id: c.id,
          entity: c.name || "Klientas",
          action: inspection ? "Atlikti apžiūrą" : c.nextAction || "Susisiekti su klientu",
          detail: mgDue(c.followDate).text,
          actionType: "customer",
          icon: inspection ? "flag" : "phone",
          due: c.followDate,
          base: inspection ? 124 : 114,
          cta: "Atidaryti"
        })
      );
    });
  // Parduoti – buhalterijai
  cars
    .filter(c => c.status === "parduotas" && !c.accountingSharedAt)
    .forEach(car => {
      const queued = accountingQueueHas(car.id);
      items.push(
        mgItem({
          key: `car:${car.id}:accounting`,
          kind: "car",
          id: car.id,
          entity: mgCarName(car),
          action: queued ? "Pateikti savaitės pakete" : "Pateikti buhalterei",
          detail: `Parduotas · ${(car.documents || []).length} dok.`,
          actionType: "accounting",
          icon: "folder",
          due: car.soldDateISO || "",
          base: queued ? 82 : 104,
          cta: "Pateikti"
        })
      );
    });
  // Bendros užduotys
  (state.garageTasks || [])
    .filter(t => !t.done)
    .forEach(t => {
      const due = mgDue(t.dueDate);
      items.push(
        mgItem({
          key: `task:${t.id}`,
          kind: "task",
          id: t.id,
          entity: t.category || "Bendra",
          action: t.title,
          detail: due ? due.text : "Be termino",
          actionType: "task",
          user: true,
          icon: "check",
          due: t.dueDate || "",
          urgent: t.priority === "urgent",
          base: t.priority === "urgent" ? 142 : t.priority === "important" ? 128 : 108,
          cta: "Atlikti",
          quiet: !t.dueDate || mgDays(t.dueDate) > 3
        })
      );
    });
  // Verslo žingsniai
  const profileOk = window.AutoEasierProfile?.isComplete?.();
  if (window.AutoEasierProfile && !profileOk)
    items.push(
      mgItem({
        key: "biz:profile",
        kind: "biz",
        id: "profile",
        entity: "Įmonė",
        action: "Užpildyti savo duomenis",
        detail: "Sutartims, dokumentams ir antraštei",
        actionType: "profile",
        icon: "user",
        base: 112,
        cta: "Užpildyti"
      })
    );
  if (cars.length && !String(state.accounting?.email || "").trim())
    items.push(
      mgItem({
        key: "biz:accountant",
        kind: "biz",
        id: "accountant",
        entity: "Įmonė",
        action: "Nurodyti buhalterės el. paštą",
        detail: "Kad dokumentai pasiektų vienu paspaudimu",
        actionType: "accountant",
        icon: "mail",
        base: 86,
        cta: "Nurodyti"
      })
    );
  if (!active.length && !(state.leadVariants || []).length)
    items.push(
      mgItem({
        key: "biz:first-car",
        kind: "biz",
        id: "first",
        entity: "Garažas",
        action: "Pridėti pirmą automobilį",
        detail: "Nuo jo prasideda visos užduotys",
        actionType: "first-car",
        icon: "car",
        base: 140,
        cta: "Pridėti"
      })
    );
  return items
    .filter(it => it.user || workCenterVisibleV30(it))
    .sort((a, b) => b.score - a.score || (a.due || "9999").localeCompare(b.due || "9999"));
}
// „Dabar aktualu“ – skaičiuoklė ženkliukui ir automobilio kortelei (be tolimų naudotojo užduočių)
workCenterItems = function () {
  return mgAllV72().filter(it => !it.quiet);
};
window.__autoEasierWorkCountV1 = () => workCenterItems().length;
function mgDoneToday() {
  const now = todayISO();
  let n = 0;
  (state.cars || []).forEach(c =>
    (c.checklist || []).forEach(t => {
      if (t.done && (t.doneDateISO === now || String(t.doneAt || "").startsWith(now))) n++;
    })
  );
  (state.garageTasks || []).forEach(t => {
    if (t.done && t.doneDate === now) n++;
  });
  return n;
}

// ---------- Puslapis ----------
let mgCacheV72 = [];
function mgRow(it, withEntity) {
  const due = it.due ? mgDue(it.due) : null;
  const tone = due?.tone || (it.urgent ? "bad" : "");
  return `<button class="accountingRefWait mgRowV72" type="button" data-mg-open="${escapeHTML(it.key)}" aria-label="${escapeHTML(it.action)} · ${escapeHTML(it.entity)}">
    <span class="accountingRefWaitPhoto mgIcoV72 ${it.urgent ? "is-hot" : ""}">${mgIco(it.icon, 19)}</span>
    <span class="accountingRefWaitCopy"><strong>${escapeHTML(it.action)}</strong><span class="accountingRefWaitStatus ${tone}">${escapeHTML(withEntity && it.entity && !String(it.detail || "").includes(it.entity) ? `${it.detail || ""} · ${it.entity}` : it.detail || it.entity)}</span></span>
    <span class="accountingRefWaitArrow">${escapeHTML(it.cta)}</span></button>`;
}
function mgGroup({ thumb, title, plate, count, rows, hot }) {
  return `<section class="awGroupV69 mgGroupV72"><header class="awHeadV69"><span class="awThumbV69 ${hot ? "is-hot" : ""}">${thumb}</span><span class="awTitleV69"><strong>${escapeHTML(title)}</strong>${plate || ""}</span><b>${count}</b></header><div class="awRowsV69">${rows}</div></section>`;
}
function mgPlate(car) {
  const p = String(car?.plate || "").trim();
  return p
    ? `<span class="lcPlateV61" aria-label="Valstybinis numeris ${escapeHTML(p)}"><i aria-hidden="true">LT</i><b>${escapeHTML(p)}</b></span>`
    : "";
}
function renderGarageWhatApp() {
  const root = document.getElementById("garageWhatRoot");
  if (!root) return;
  const all = mgAllV72();
  garageWhatCacheV30 = all;
  mgCacheV72 = all;
  const urgent = all.filter(i => i.urgent);
  const rest = all.filter(i => !i.urgent);
  const late = all.filter(i => i.late).length;
  const today = all.filter(i => i.due === todayISO()).length;
  const open = all.filter(i => !i.quiet).length;
  const sections = [];
  if (urgent.length)
    sections.push(
      mgGroup({
        thumb: mgIco("flag"),
        title: "Skubu",
        count: urgent.length,
        rows: urgent.map(i => mgRow(i, true)).join(""),
        hot: true
      })
    );
  // Pagal automobilį (nurodytoje eilės tvarkoje – pagal svarbiausią užduotį)
  const byCar = new Map();
  rest
    .filter(i => i.kind === "car")
    .forEach(i => {
      if (!byCar.has(i.id)) byCar.set(i.id, []);
      byCar.get(i.id).push(i);
    });
  byCar.forEach((list, carId) => {
    const car = (state.cars || []).find(c => c.id === carId);
    sections.push(
      mgGroup({
        thumb: mgIco("car"),
        title: mgCarName(car),
        plate: mgPlate(car),
        count: list.length,
        rows: list.map(mgRow).join("")
      })
    );
  });
  const leads = rest.filter(i => i.kind === "lead" || i.kind === "customer");
  if (leads.length)
    sections.push(
      mgGroup({
        thumb: mgIco("phone"),
        title: "Variantai ir klientai",
        count: leads.length,
        rows: leads.map(mgRow).join("")
      })
    );
  const general = rest.filter(i => i.kind === "task" || i.kind === "biz");
  if (general.length)
    sections.push(
      mgGroup({
        thumb: mgIco("check"),
        title: "Bendra",
        count: general.length,
        rows: general.map(mgRow).join("")
      })
    );
  const done = mgDoneToday();
  const empty = !all.length
    ? `<div class="mgEmptyV72"><span>${mgIco("check", 26)}</span><strong>Viskas sutvarkyta</strong><p>Nauju darbų kol kas nėra.</p></div>`
    : "";
  root.innerHTML = `<div class="garageWhatPage vdV65 mgPageV72">
    <div class="garageWhatHead"><div class="garageWhatHeadTitle"><h2>Vadybininkas</h2></div><button class="garageWhatBack" type="button" data-garage-what-back>Atgal</button></div>
    <div class="vdSumV65"><div class="${late ? "late" : ""}"><b>${late}</b><span>Vėluoja</span></div><div><b>${today}</b><span>Šiandien</span></div><div><b>${open}</b><span>Darbai</span></div></div>
    <button class="mgNewV72" type="button" data-mg-new>${mgIco("plus", 18)}<span>Nauja užduotis</span></button>
    ${empty}<div class="accountingRefWaitList awListV69 mgListV72">${sections.join("")}</div>
    ${done ? `<p class="mgDoneV72">Šiandien atlikta: <b>${done}</b></p>` : ""}
  </div>`;
}

// ---------- Langai ----------
let mgBusy = false;
function mgOpenSheet({ title, sub, body, primary, onPrimary, links = [], hideFoot = false }) {
  const linkHTML = links
    .map(
      (l, i) =>
        `<button type="button" class="mgLinkV72 ${l.danger ? "is-danger" : ""}" data-mg-link="${i}">${escapeHTML(l.label)}</button>`
    )
    .join("");
  openSheet(`<div class="sheetHead mgHeadV72"><div><h3>${escapeHTML(title)}</h3>${sub ? `<span>${escapeHTML(sub)}</span>` : ""}</div><button class="closeBtn" type="button" data-mg-close aria-label="Uždaryti">✕</button></div>
    <div class="mgBodyV72" id="mgBodyV72">${body}</div>
    ${hideFoot ? "" : `<div class="mgFootV72">${primary ? `<button class="mgPrimaryV72" type="button" id="mgPrimaryV72">${escapeHTML(primary)}</button>` : ""}${linkHTML ? `<div class="mgLinksV72">${linkHTML}</div>` : ""}</div>`}`);
  const sheet = document.getElementById("sheet");
  sheet.classList.add("mgSheetV72");
  sheet.scrollTop = 0;
  const btn = document.getElementById("mgPrimaryV72");
  if (btn && onPrimary)
    btn.onclick = async () => {
      if (mgBusy) return;
      mgBusy = true;
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Saugoma…";
      try {
        await onPrimary();
      } catch (e) {
        toast(e?.message || "Nepavyko išsaugoti", "!");
        btn.disabled = false;
        btn.textContent = label;
      }
      mgBusy = false;
    };
  sheet
    .querySelectorAll("[data-mg-link]")
    .forEach(b => (b.onclick = () => links[Number(b.dataset.mgLink)]?.onClick?.(b)));
  return sheet;
}
const __closeSheetMgV72 = closeSheet;
closeSheet = function () {
  document.getElementById("sheet")?.classList.remove("mgSheetV72");
  return __closeSheetMgV72.apply(this, arguments);
};
function mgDone(msg) {
  saveState();
  closeSheet();
  render();
  toast(msg, "✓");
}
const mgField = (id, label, attrs = "", value = "", wide = false) =>
  `<div class="field ${wide ? "mgWideV72" : ""}"><label for="${id}">${escapeHTML(label)}</label><input class="input" id="${id}" value="${escapeHTML(value)}" ${attrs}></div>`;
function mgSnoozeLinks(item) {
  return [
    {
      label: "Atidėti 3 d.",
      onClick: () => {
        closeSheet();
        workCenterSnoozeV30(item.key, 3);
        toast("Primins po 3 dienų", "✓");
      }
    },
    {
      label: "Nerodyti",
      onClick: () => {
        closeSheet();
        workCenterDismissV30(item.key);
        toast("Pasiūlymas paslėptas", "✓");
      }
    }
  ];
}
const mgCarOf = item => (state.cars || []).find(c => c.id === item.id);

// Trūkstami duomenys: naudojamas esamas langas su registracijos liudijimo skaitytuvu (30-registration-review-v41.js)
function mgDocs(item) {
  const car = mgCarOf(item);
  if (!car) return;
  const missing = workCenterMissingDocsV30(car);
  if (!missing.length) return render();
  const rows = missing
    .map(
      d =>
        `<label class="mgFileV72" for="mg_doc_${d.kind}"><span class="mgFileIcoV72">${mgIco("doc", 20)}</span><span class="mgFileTxtV72"><strong>${escapeHTML(d.label[0].toUpperCase() + d.label.slice(1))}</strong><small id="mg_docn_${d.kind}">Nuotrauka arba PDF</small></span><span class="mgFileAddV72">Pridėti</span><input type="file" id="mg_doc_${d.kind}" accept="image/*,application/pdf" multiple hidden></label>`
    )
    .join("");
  mgOpenSheet({
    title: "Prisegti dokumentus",
    sub: mgCarName(car),
    body: `<div class="mgFilesV72">${rows}</div>`,
    primary: "Išsaugoti dokumentus",
    links: [
      {
        label: "Sugeneruoti PP sutartį",
        onClick: () => {
          closeSheet();
          openContractSheetV52({ carId: car.id });
        }
      },
      ...mgSnoozeLinks(item)
    ],
    onPrimary: async () => {
      const selected = missing.flatMap(d =>
        Array.from(document.getElementById("mg_doc_" + d.kind)?.files || []).map(file => ({
          kind: d.kind,
          file
        }))
      );
      if (!selected.length) throw Error("Pasirinkite bent vieną dokumentą.");
      const added = [];
      try {
        for (const x of selected) {
          const blob = await readDocumentFile(x.file);
          const key = await putDocument(blob);
          added.push({
            id: uid(),
            key,
            kind: x.kind,
            name: x.file.name,
            type: blob.type,
            size: blob.size,
            addedAt: nowLabel(),
            addedDateISO: todayISO()
          });
        }
        car.documents = [...(car.documents || []), ...added];
        if (!saveState()) throw Error("Nepavyko išsaugoti dokumentų.");
      } catch (e) {
        await Promise.all(added.map(d => photoDelete(d.key).catch(() => {})));
        throw e;
      }
      addHistory("Dokumentai pridėti", `${car.name} · ${added.length}`, "▤", {
        kind: "car",
        id: car.id,
        label: "Atidaryti automobilį"
      });
      mgDone("Dokumentai pridėti");
    }
  });
  missing.forEach(d => {
    const input = document.getElementById("mg_doc_" + d.kind);
    input.onchange = () => {
      const n = input.files?.length || 0;
      const t = document.getElementById("mg_docn_" + d.kind);
      if (t) t.textContent = n ? (n === 1 ? input.files[0].name : `${n} failai`) : "Nuotrauka arba PDF";
      input.closest(".mgFileV72")?.classList.toggle("has", !!n);
    };
  });
}
function mgPhotos(item) {
  const car = mgCarOf(item);
  if (!car) return;
  const have = (car.photos || []).filter(Boolean).length;
  mgOpenSheet({
    title: "Nuotraukos",
    sub: `${mgCarName(car)} · ${have} iš ${MG_PHOTO_GOAL}+`,
    body: `<label class="mgDropV72" for="mg_photos"><span>${mgIco("cam", 26)}</span><strong id="mgPhotoTxt">Pasirinkti nuotraukas</strong><small>Galima kelias iš karto</small><input type="file" id="mg_photos" accept="image/*" multiple hidden></label>`,
    primary: "Įkelti",
    links: mgSnoozeLinks(item),
    onPrimary: async () => {
      const files = Array.from(document.getElementById("mg_photos")?.files || []).filter(f =>
        /^image\//i.test(f.type)
      );
      if (!files.length) throw Error("Pasirinkite nuotraukas.");
      const added = [];
      for (const f of files) {
        try {
          const k = await storeImageFile(f);
          if (k) {
            added.push(k);
            await photoGet(k);
          }
        } catch (e) {}
      }
      if (!added.length) throw Error("Nepavyko įkelti nuotraukų.");
      car.photos = [...(car.photos || []), ...added];
      car.imageSrc = car.photos[0] || "";
      mgDone(`Pridėta nuotraukų: ${added.length}`);
    }
  });
  document.getElementById("mg_photos").onchange = e => {
    const n = e.target.files?.length || 0;
    document.getElementById("mgPhotoTxt").textContent = n ? `Pasirinkta: ${n}` : "Pasirinkti nuotraukas";
    e.target.closest(".mgDropV72")?.classList.toggle("has", !!n);
  };
}
function mgStatus(item) {
  const car = mgCarOf(item);
  if (!car) return;
  const ta = item.statusKind === "ta";
  const sKey = ta ? "taStatus" : "insuranceStatus";
  const dKey = ta ? "taUntil" : "insuranceUntil";
  const label = ta ? "Techninė apžiūra" : "Draudimas";
  mgOpenSheet({
    title: label,
    sub: mgCarName(car),
    body: `<div class="mgGridV72"><div class="field"><label for="mg_st">Būsena</label><select class="input" id="mg_st"><option value="valid">Galioja</option><option value="invalid">Negalioja</option></select></div>${mgField("mg_until", "Galioja iki", 'type="date"', car[dKey] && car[dKey] > todayISO() ? car[dKey] : "")}</div>`,
    primary: "Išsaugoti",
    links: mgSnoozeLinks(item),
    onPrimary: async () => {
      const st = document.getElementById("mg_st").value;
      const until = document.getElementById("mg_until").value;
      if (st === "valid" && !until) throw Error("Nurodykite, iki kada galioja.");
      car[sKey] = st;
      car[dKey] = st === "valid" ? until : "";
      mgDone(`${label} atnaujinta`);
    }
  });
}
function mgPrice(item) {
  const car = mgCarOf(item);
  if (!car) return;
  const cost = Number(carTotalCost(car) || 0);
  mgOpenSheet({
    title: "Pardavimo kaina",
    sub: `${mgCarName(car)} · savikaina ${moneyFmt(cost)}`,
    body: `${mgField("mg_price", "Kaina, €", 'type="number" inputmode="decimal" min="0"', car.askingPrice || "")}<p class="mgProfitV72" id="mgProfit">Įrašykite kainą – parodysime numatomą maržą.</p>`,
    primary: "Išsaugoti",
    links: mgSnoozeLinks(item),
    onPrimary: async () => {
      const n = Number(document.getElementById("mg_price").value);
      if (!Number.isFinite(n) || n <= 0) throw Error("Įrašykite kainą.");
      car.askingPrice = n;
      mgDone("Kaina išsaugota");
    }
  });
  const inp = document.getElementById("mg_price");
  const upd = () => {
    const n = Number(inp.value);
    const el = document.getElementById("mgProfit");
    if (n > 0) {
      const m = n - cost;
      el.textContent = `Numatoma marža: ${m >= 0 ? "+" : ""}${moneyFmt(m)}`;
      el.className = `mgProfitV72 ${m >= 0 ? "good" : "bad"}`;
    } else el.textContent = "Įrašykite kainą – parodysime numatomą maržą.";
  };
  inp.oninput = upd;
  upd();
}
function mgLead(item) {
  const lead = (state.leadVariants || []).find(l => l.id === item.id);
  if (!lead) return;
  const tel = String(lead.phone || "").replace(/[^+0-9]/g, "");
  const dflt = Number(lead.followUpDays || lead.followDays || 2);
  const chips = [1, 2, 3, 7]
    .map(
      d =>
        `<button type="button" class="mgChipV72 ${d === dflt ? "is-on" : ""}" data-mg-days="${d}">${d === 1 ? "Rytoj" : d === 7 ? "Po savaitės" : `Po ${d} d.`}</button>`
    )
    .join("");
  mgOpenSheet({
    title: "Paskambinti pardavėjui",
    sub: `${item.entity}${lead.city ? " · " + lead.city : ""}`,
    body: `${tel ? `<a class="mgCallV72" href="tel:${escapeHTML(tel)}">${mgIco("phone", 20)}<span>${escapeHTML(lead.phone)}</span></a>` : '<p class="mgHintV72">Telefono numeris nenurodytas.</p>'}
      <p class="mgLabelV72">Kitas skambutis</p><div class="mgChipsV72" id="mgDays">${chips}</div>
      <p class="mgHintV72">Prašo ${moneyFmt(lead.initialPrice || 0)}${Number(lead.targetPrice || 0) ? ` · siūlome ${moneyFmt(lead.targetPrice)}` : ""}</p>`,
    primary: "Paskambinau",
    links: [
      {
        label: "Atidaryti variantą",
        onClick: () => {
          closeSheet();
          openGarageLeadSheet(lead.id);
        }
      },
      ...mgSnoozeLinks(item).slice(0, 1)
    ],
    onPrimary: async () => {
      const days = Number(document.querySelector("#mgDays .is-on")?.dataset.mgDays || dflt);
      lead.calls = Number(lead.calls || 0) + 1;
      lead.lastCalledAt = nowLabel();
      lead.updatedAt = nowLabel();
      lead.nextCallDate = addDaysISO(todayISO(), days);
      addHistory("Skambutis variantui", item.entity, "📞");
      mgDone("Skambutis užfiksuotas");
    }
  });
  document.getElementById("mgDays").onclick = e => {
    const b = e.target.closest("[data-mg-days]");
    if (!b) return;
    document.querySelectorAll("#mgDays .mgChipV72").forEach(x => x.classList.toggle("is-on", x === b));
  };
}
function mgLeadPrice(item) {
  const lead = (state.leadVariants || []).find(l => l.id === item.id);
  if (!lead) return;
  mgOpenSheet({
    title: "Jūsų kaina",
    sub: item.entity,
    body: `${mgField("mg_lp", "Siūlome, €", 'type="number" inputmode="decimal" min="0"', lead.targetPrice || "")}<p class="mgHintV72">Pardavėjas prašo ${moneyFmt(lead.initialPrice || 0)}.</p>`,
    primary: "Išsaugoti",
    links: mgSnoozeLinks(item),
    onPrimary: async () => {
      const n = Number(document.getElementById("mg_lp").value);
      if (!Number.isFinite(n) || n <= 0) throw Error("Įrašykite kainą.");
      lead.targetPrice = n;
      lead.updatedAt = nowLabel();
      mgDone("Kaina išsaugota");
    }
  });
}
function mgCustomer(item) {
  const c = (state.customers || []).find(x => x.id === item.id);
  if (!c) return;
  mgOpenSheet({
    title: item.action,
    sub: item.entity,
    body: `<p class="mgHintV72">${escapeHTML(c.stage || "Klientas")}${c.phone ? " · " + escapeHTML(c.phone) : ""}</p>`,
    primary: "Atidaryti klientą",
    links: mgSnoozeLinks(item).slice(0, 1),
    onPrimary: async () => {
      closeSheet();
      openCustomer(c.id);
    }
  });
}
function mgAccounting(item) {
  const car = mgCarOf(item);
  if (!car) return;
  const queued = accountingQueueHas(car.id);
  mgOpenSheet({
    title: "Pateikti buhalterei",
    sub: mgCarName(car),
    body: `<p class="mgHintV72">Dokumentų: ${(car.documents || []).length}.${queued ? " Jau savaitės pakete." : ""}</p>`,
    primary: "Siųsti dabar",
    links: [
      {
        label: queued ? "Išimti iš savaitės paketo" : "Į savaitės paketą",
        onClick: () => {
          closeSheet();
          toggleAccountingQueue(car.id);
        }
      },
      ...mgSnoozeLinks(item).slice(0, 1)
    ],
    onPrimary: async () => {
      closeSheet();
      await shareAccountingCars([car], "automobilis");
    }
  });
}
function mgAccountant(item) {
  mgOpenSheet({
    title: "Buhalterės el. paštas",
    sub: "Dokumentai bus siunčiami čia",
    body: mgField(
      "mg_email",
      "El. paštas",
      'type="email" inputmode="email" autocomplete="email" placeholder="buhaltere@imone.lt"',
      state.accounting?.email || ""
    ),
    primary: "Išsaugoti",
    links: mgSnoozeLinks(item),
    onPrimary: async () => {
      const v = document.getElementById("mg_email").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw Error("Patikrinkite el. paštą.");
      ensureAccounting();
      state.accounting.email = v;
      mgDone("El. paštas išsaugotas");
    }
  });
}
// Naudotojo užduotys
function mgPostponeLinks(apply, remove, extra = []) {
  return [
    ...extra,
    { label: "Rytoj", onClick: () => apply(1) },
    { label: "Po savaitės", onClick: () => apply(7) },
    {
      label: "Ištrinti",
      danger: true,
      onClick: b => {
        if (b.dataset.sure) return remove();
        b.dataset.sure = "1";
        b.textContent = "Tikrai ištrinti?";
      }
    }
  ];
}
function mgCarTask(item) {
  const car = mgCarOf(item);
  const task = car?.checklist?.find(t => t.id === item.taskId);
  if (!car || !task || task.done) return;
  const due = mgDue(task.dueDate);
  mgOpenSheet({
    title: task.name,
    sub: `${mgCarName(car)}${due ? " · " + due.text : ""}`,
    body: `<div class="mgGridV72 mgPayV72"><div class="field"><label for="mg_amt">Kaina, €</label><input class="input" id="mg_amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0"></div>
      <label class="mgFileMiniV72" for="mg_receipt">${mgIco("doc", 18)}<span id="mg_receipt_t">Prisegti čekį</span><input type="file" id="mg_receipt" accept="image/*,application/pdf" multiple hidden></label></div>
      <p class="mgHintV72" id="mgPayHint">Jei buvo išlaidų – įrašykite kainą ir prisekite čekį, jis pateks į Buhalteriją.</p>`,
    primary: "Atlikta",
    links: mgPostponeLinks(
      d => {
        task.dueDate = addDaysISO(todayISO(), d);
        mgDone("Terminas perkeltas");
      },
      () => {
        car.checklist = car.checklist.filter(t => t.id !== task.id);
        mgDone("Užduotis ištrinta");
      },
      [
        {
          label: "Atidaryti kortelę",
          onClick: () => {
            closeSheet();
            openCar(car.id);
          }
        }
      ]
    ),
    onPrimary: async () => {
      const amount = Math.max(0, Number(document.getElementById("mg_amt").value || 0));
      const input = document.getElementById("mg_receipt");
      const has = !!input.files?.length;
      if (amount > 0 && !has) {
        document.getElementById("mgPayHint").classList.add("warn");
        document.getElementById("mgPayHint").textContent = "Išlaidai reikia čekio – prisekite jį.";
        throw Error("Prisekite čekį");
      }
      let att = [];
      try {
        if (has) att = await accountingReadAttachmentsV8(input, "receipt");
        await completeCarTaskWithExpenseV24(car, task, amount, att);
      } catch (e) {
        await Promise.all(att.map(a => photoDelete(a.key).catch(() => {})));
        throw e;
      }
      saveState();
      closeSheet();
      if (document.getElementById("sheet")?.dataset.carV63 === car.id) renderCarSheet(car);
      render();
      toast(amount > 0 ? `Atlikta · ${moneyFmt(amount)} į Buhalteriją` : "Užduotis atlikta", "✓");
    }
  });
  document.getElementById("mg_receipt").onchange = e => {
    const n = e.target.files?.length || 0;
    document.getElementById("mg_receipt_t").textContent = n
      ? n === 1
        ? e.target.files[0].name
        : `${n} failai`
      : "Prisegti čekį";
    e.target.closest(".mgFileMiniV72")?.classList.toggle("has", !!n);
  };
}
function mgTask(item) {
  const t = (state.garageTasks || []).find(x => x.id === item.id);
  if (!t || t.done) return;
  const due = mgDue(t.dueDate);
  mgOpenSheet({
    title: t.title,
    sub: `${t.category || "Bendra"}${due ? " · " + due.text : ""}`,
    body: t.notes
      ? `<p class="mgHintV72">${escapeHTML(t.notes)}</p>`
      : '<p class="mgHintV72">Pažymėkite atlikta, kai baigsite.</p>',
    primary: "Atlikta",
    links: mgPostponeLinks(
      d => {
        t.dueDate = addDaysISO(todayISO(), d);
        mgDone("Terminas perkeltas");
      },
      () => {
        state.garageTasks = state.garageTasks.filter(x => x.id !== t.id);
        addHistory("Garažo užduotis", `Ištrinta: ${t.title}`, "🗑️");
        mgDone("Užduotis ištrinta");
      }
    ),
    onPrimary: async () => {
      closeSheet();
      completeGarageTask(t.id);
    }
  });
}
// Nauja užduotis
const MG_IDEAS = [
  "Nuplauti automobilį",
  "Padaryti nuotraukas",
  "Paruošti skelbimą",
  "Susitarti dėl apžiūros",
  "Pasitikrinti TA"
];
function mgNew(preset = {}) {
  const cars = (state.cars || []).filter(c => c.status !== "parduotas");
  const chips = (arr, name, on) =>
    arr
      .map(
        ([v, l]) =>
          `<button type="button" class="mgChipV72 ${v === on ? "is-on" : ""}" data-mg-${name}="${v}">${l}</button>`
      )
      .join("");
  mgOpenSheet({
    title: "Nauja užduotis",
    body: `${mgField("mg_title", "Ką reikia padaryti", 'maxlength="80" autocomplete="off"', preset.title || "")}
      <div class="mgChipsV72 mgIdeasV72" id="mgIdeas">${MG_IDEAS.map(i => `<button type="button" class="mgChipV72" data-mg-idea="${escapeHTML(i)}">${escapeHTML(i)}</button>`).join("")}</div>
      ${cars.length ? `<div class="field"><label for="mg_car">Automobilis</label><select class="input" id="mg_car"><option value="">Bendra užduotis</option>${cars.map(c => `<option value="${escapeHTML(c.id)}" ${c.id === preset.carId ? "selected" : ""}>${escapeHTML(mgCarName(c))}${c.plate ? " · " + escapeHTML(c.plate) : ""}</option>`).join("")}</select></div>` : ""}
      <p class="mgLabelV72">Terminas</p>
      <div class="mgChipsV72" id="mgWhen">${chips(
        [
          ["0", "Šiandien"],
          ["1", "Rytoj"],
          ["7", "Po savaitės"],
          ["", "Be termino"]
        ],
        "when",
        "1"
      )}</div>
      <div class="field mgDateV72"><label for="mg_date">Arba pasirinkite datą</label><input class="input" id="mg_date" type="date" min="${todayISO()}"></div>`,
    primary: "Sukurti",
    onPrimary: async () => {
      const title = document.getElementById("mg_title").value.trim();
      if (!title) {
        document.getElementById("mg_title").focus();
        throw Error("Įrašykite užduotį.");
      }
      const picked = document.getElementById("mg_date").value;
      const when = document.querySelector("#mgWhen .is-on")?.dataset.mgWhen;
      const due = picked || (when === undefined || when === "" ? "" : addDaysISO(todayISO(), Number(when)));
      const carId = document.getElementById("mg_car")?.value || "";
      if (carId) {
        const car = (state.cars || []).find(c => c.id === carId);
        car.checklist = car.checklist || [];
        car.checklist.push({
          id: "custom_" + Date.now(),
          name: title,
          xp: 0,
          coins: 0,
          done: false,
          dueDate: due
        });
        addHistory("Garažo punktas", `Pridėtas: ${title}`, "➕");
        mgDone("Užduotis sukurta");
      } else {
        closeSheet();
        addGarageTask(title, 0, 0, due, "normal", "Bendra");
      }
    }
  });
  document.getElementById("mgWhen").onclick = e => {
    const b = e.target.closest("[data-mg-when]");
    if (!b) return;
    document.querySelectorAll("#mgWhen .mgChipV72").forEach(x => x.classList.toggle("is-on", x === b));
    document.getElementById("mg_date").value = "";
  };
  document.getElementById("mg_date").onchange = e => {
    if (e.target.value)
      document.querySelectorAll("#mgWhen .mgChipV72").forEach(x => x.classList.remove("is-on"));
  };
  document.getElementById("mgIdeas").onclick = e => {
    const b = e.target.closest("[data-mg-idea]");
    if (!b) return;
    const i = document.getElementById("mg_title");
    i.value = b.dataset.mgIdea;
    i.focus();
  };
  setTimeout(() => document.getElementById("mg_title")?.focus({ preventScroll: true }), 320);
}

// ---------- Nukreipimas ----------
function mgOpenV72(item) {
  if (!item) return;
  switch (item.actionType) {
    case "car-task":
      return mgCarTask(item);
    case "task":
      return mgTask(item);
    case "missing-data":
      return openWhatMissingDataV30(item);
    case "missing-docs":
      return mgDocs(item);
    case "photos":
      return mgPhotos(item);
    case "status":
      return mgStatus(item);
    case "price":
    case "price-review":
      return mgPrice(item);
    case "lead":
      return mgLead(item);
    case "lead-price":
      return mgLeadPrice(item);
    case "customer":
      return mgCustomer(item);
    case "accounting":
      return mgAccounting(item);
    case "accountant":
      return mgAccountant(item);
    case "profile":
      return window.AutoEasierProfile?.open?.({ required: false });
    case "first-car":
      return openGarageAddCar();
    default:
      if (item.kind === "car") return openCar(item.id);
      if (item.kind === "lead") return openGarageLeadSheet(item.id);
      if (item.kind === "customer") return openCustomer(item.id);
  }
}
openWhatItemV30 = mgOpenV72;
document.addEventListener(
  "click",
  e => {
    const row = e.target.closest("#garageWhatRoot [data-mg-open]");
    if (row) {
      e.preventDefault();
      e.stopImmediatePropagation();
      mgOpenV72(mgCacheV72.find(i => i.key === row.dataset.mgOpen));
      return;
    }
    if (e.target.closest("#garageWhatRoot [data-mg-new]")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      mgNew();
      return;
    }
    if (e.target.closest("[data-mg-close]")) {
      e.preventDefault();
      closeSheet();
    }
  },
  true
);
