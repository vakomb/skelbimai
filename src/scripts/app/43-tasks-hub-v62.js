// Užduočių skydelis (v62): skirtukai „Šiandien / Automobiliai / Kitos“, aiškios eilutės su apvaliu žymėjimu,
// terminas spalva (vėluoja / šiandien / rytoj / data), automobilių užduotys sugrupuotos pagal automobilį,
// greitas „Nauja užduotis“. Senos skilties (garageUnifiedSection) paslepiamos, duomenys ir veiksmai – tie patys:
// completeGarageTask, deleteGarageTask, addGarageTask, completeCarTaskWithExpenseV24 / openCarTaskReceiptSheetV24.
// Stilius – 172-tasks-hub-v62.css.
const TK_MONTHS_V62 = [
  "saus.",
  "vas.",
  "kov.",
  "bal.",
  "geg.",
  "birž.",
  "liep.",
  "rugp.",
  "rugs.",
  "spal.",
  "lapkr.",
  "gruod."
];
let tkTabV62 = "";
let tkExpenseOpenV62 = "";
let tkWasOpenV63 = false;
function tkDayDiffV62(due) {
  const a = parseISODateLocal(todayISO()),
    b = parseISODateLocal(due);
  return a && b ? Math.round((b - a) / 864e5) : null;
}
function tkDueV62(due) {
  if (!due) return { text: "Be termino", cls: "none" };
  const d = tkDayDiffV62(due);
  if (d == null) return { text: due, cls: "none" };
  if (d < 0) return { text: `Vėluoja ${-d} d.`, cls: "late" };
  if (d === 0) return { text: "Šiandien", cls: "today" };
  if (d === 1) return { text: "Rytoj", cls: "soon" };
  const [, m, day] = due.split("-");
  return { text: `${TK_MONTHS_V62[Number(m) - 1] || m} ${Number(day)}`, cls: "later" };
}
function tkSortV62(a, b) {
  const da = a.due || "9999-99-99",
    db = b.due || "9999-99-99";
  return da.localeCompare(db) || (a.title || "").localeCompare(b.title || "", "lt");
}
function tkItemsV62() {
  const now = todayISO();
  const cars = (state.cars || []).filter(c => c.status !== "parduotas");
  const auto = [];
  cars.forEach(car =>
    (car.checklist || [])
      .filter(t => !t.done)
      .forEach(t =>
        auto.push({
          kind: "car",
          carId: car.id,
          id: t.id,
          title: t.name || "Užduotis",
          due: t.dueDate || "",
          car
        })
      )
  );
  const custom = (state.garageTasks || [])
    .filter(t => !t.done)
    .map(t => ({
      kind: "task",
      id: t.id,
      title: t.title || "Užduotis",
      due: t.dueDate || "",
      priority: t.priority,
      notes: t.notes || ""
    }));
  const today = [...auto, ...custom].filter(i => i.due && i.due <= now);
  return { today: today.sort(tkSortV62), auto: auto.sort(tkSortV62), custom: custom.sort(tkSortV62) };
}
const TK_ICON_V62 = {
  check:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  done: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>'
};
function tkRowV62(item, { showCar = true } = {}) {
  const due = tkDueV62(item.due);
  const key = `${item.kind}:${item.carId || ""}:${item.id}`;
  const meta = [
    showCar && item.kind === "car" ? tkCarTagV63(item.car) : "",
    `<i class="tkDue ${due.cls}">${escapeHTML(due.text)}</i>`,
    item.kind === "task" && item.priority === "urgent" ? '<i class="tkTag urgent">Skubu</i>' : "",
    item.kind === "task" && item.priority === "important" ? '<i class="tkTag">Svarbu</i>' : ""
  ]
    .filter(Boolean)
    .join("");
  const expense =
    tkExpenseOpenV62 === key
      ? `<div class="tkExpenseV62"><label for="tkExpenseInput">Išlaidos</label><div class="tkExpenseFieldV62"><input id="tkExpenseInput" class="input" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0"><span>€</span></div><button type="button" class="tkExpenseOkV62" data-tk-confirm>Atlikta</button><button type="button" class="tkExpenseCancelV62" data-tk-cancel aria-label="Atšaukti">${TK_ICON_V62.x}</button></div>`
      : "";
  return `<div class="tkRowV62 ${due.cls}${expense ? " expanded" : ""}" data-tk-kind="${item.kind}" data-tk-id="${escapeHTML(item.id)}" ${item.carId ? `data-tk-car="${escapeHTML(item.carId)}"` : ""} data-tk-key="${escapeHTML(key)}">
    <div class="tkRowMainV62">
      <button type="button" class="tkCheckV62" data-tk-done aria-label="Pažymėti „${escapeHTML(item.title)}“ atlikta">${TK_ICON_V62.check}</button>
      <button type="button" class="tkBodyV62" ${item.kind === "car" ? "data-tk-open" : "data-tk-noop"}><strong>${escapeHTML(item.title)}</strong><span class="tkMetaV62">${meta}</span>${item.notes ? `<small>${escapeHTML(item.notes)}</small>` : ""}</button>
      ${item.kind === "car" ? `<span class="tkChevV62" aria-hidden="true">${TK_ICON_V62.chev}</span>` : `<button type="button" class="tkDelV62" data-tk-del aria-label="Ištrinti „${escapeHTML(item.title)}“">${TK_ICON_V62.x}</button>`}
    </div>${expense}
  </div>`;
}
function tkCarNameV63(car) {
  return (
    [regPrettyMakeV50(car.regMake), regPrettyModelV50(car.regModel)].filter(Boolean).join(" ") ||
    car.name ||
    "Automobilis"
  );
}
function tkCarTagV63(car) {
  return `<span class="tkCarV63">${lcPlateHTMLV61(car.plate)}<em>${escapeHTML(tkCarNameV63(car))}</em></span>`;
}
// Šiandienos pažanga: kiek atlikta iš šiandien suplanuotų (žiedas + tekstas)
function tkProgressHTMLV63(items) {
  const now = todayISO();
  const doneDay = d => String(d || "").slice(0, 10) === now;
  const done =
    (state.garageTasks || []).filter(t => t.done && doneDay(t.doneDate)).length +
    (state.cars || []).reduce(
      (n, c) => n + (c.checklist || []).filter(i => i.done && doneDay(i.doneDateISO || i.doneAt)).length,
      0
    );
  const left = items.today.length;
  const late = items.today.filter(i => i.due < now).length;
  const total = done + left;
  const pct = total ? Math.round((done / total) * 100) : 100;
  const C = 2 * Math.PI * 19;
  const title = !total
    ? "Šiandien užduočių nėra"
    : left
      ? `Šiandien liko ${left}`
      : "Šiandien viskas atlikta";
  const sub = total ? `Atlikta ${done} iš ${total}` : "Galite pridėti naują užduotį skiltyje „Kitos“";
  return `<div class="tkProgV63${!left && total ? " allDone" : ""}">
    <svg class="tkRingV63" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" class="bg"/><circle cx="24" cy="24" r="19" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(1)}"/></svg>
    <span class="tkPctV63">${pct}%</span>
    <div class="tkProgTextV63"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(sub)}</span></div>
    ${late ? `<b class="tkLateV63">${late} vėluoja</b>` : ""}
  </div>`;
}
function tkEmptyV62(text) {
  return `<div class="tkEmptyV62">${TK_ICON_V62.done}<strong>${escapeHTML(text)}</strong></div>`;
}
function tkListHTMLV62(tab, items) {
  if (tab === "today")
    return items.today.length
      ? items.today.map(i => tkRowV62(i)).join("")
      : tkEmptyV62("Šiandien viskas atlikta");
  if (tab === "custom")
    return items.custom.length
      ? items.custom.map(i => tkRowV62(i)).join("")
      : tkEmptyV62("Kitų užduočių nėra");
  if (!items.auto.length) return tkEmptyV62("Automobilių užduočių nėra");
  const groups = new Map();
  items.auto.forEach(i => {
    if (!groups.has(i.carId)) groups.set(i.carId, []);
    groups.get(i.carId).push(i);
  });
  return [...groups.values()]
    .map(list => {
      const car = list[0].car;
      return `<div class="tkGroupV62"><button type="button" class="tkGroupHeadV62" data-tk-car-open="${escapeHTML(car.id)}">${lcPlateHTMLV61(car.plate)}<strong>${escapeHTML(tkCarNameV63(car))}</strong><b>${list.length}</b></button>${list.map(i => tkRowV62(i, { showCar: false })).join("")}</div>`;
    })
    .join("");
}
function tkRenderV62() {
  const section = document.getElementById("garageTasksSection");
  if (!section) return;
  section.classList.add("tkV62");
  let hub = section.querySelector(".tkHubV62");
  if (!hub) {
    hub = document.createElement("div");
    hub.className = "tkHubV62";
    hub.innerHTML = `<div class="tkProgSlotV63"></div><div class="tkTabsV62" role="tablist"></div><div class="tkListV62"></div>
      <div class="tkComposerV62">
        <button type="button" class="tkAddV62" data-tk-add aria-expanded="false">${TK_ICON_V62.plus}<span>Nauja užduotis</span></button>
        <form class="tkFormV62" hidden>
          <input class="input" id="tkNewTitleV62" maxlength="180" placeholder="Ką reikia padaryti?" autocomplete="off">
          <div class="tkFormRowV62">
            <input class="input" id="tkNewDueV62" type="date" aria-label="Terminas">
            <button type="submit" class="btn tkSaveV62">Pridėti</button>
          </div>
        </form>
      </div>`;
    const head = section.querySelector(":scope > .sectionHead");
    if (head) head.after(hub);
    else section.prepend(hub);
  }
  const items = tkItemsV62();
  const isOpen = section.classList.contains("is-open");
  if (isOpen && !tkWasOpenV63) tkTabV62 = "today";
  tkWasOpenV63 = isOpen;
  if (!["today", "autos", "custom"].includes(tkTabV62)) tkTabV62 = "today";
  const tabs = [
    ["today", "Šiandien", items.today.length],
    ["autos", "Auto", items.auto.length],
    ["custom", "Kitos", items.custom.length]
  ];
  hub.querySelector(".tkTabsV62").innerHTML = tabs
    .map(
      ([k, t, n]) =>
        `<button type="button" role="tab" data-tk-tab="${k}" aria-selected="${k === tkTabV62}" class="${k === "today" && n ? "hasDue" : ""}"><span>${t}</span><b>${n}</b></button>`
    )
    .join("");
  hub.querySelector(".tkProgSlotV63").innerHTML = tkProgressHTMLV63(items);
  hub.dataset.tab = tkTabV62;
  const list = hub.querySelector(".tkListV62");
  list.dataset.tab = tkTabV62;
  list.innerHTML = tkListHTMLV62(tkTabV62 === "autos" ? "autos" : tkTabV62, items);
  if (tkExpenseOpenV62) list.querySelector("#tkExpenseInput")?.focus({ preventScroll: true });
}
async function tkCompleteV62(row) {
  const kind = row.dataset.tkKind,
    id = row.dataset.tkId;
  if (kind === "task") {
    row.classList.add("isDone");
    await new Promise(r => setTimeout(r, 260));
    completeGarageTask(id);
    return;
  }
  const key = row.dataset.tkKey;
  tkExpenseOpenV62 = tkExpenseOpenV62 === key ? "" : key;
  tkRenderV62();
}
async function tkConfirmCarV62(row) {
  const car = state.cars.find(c => c.id === row.dataset.tkCar);
  const item = car?.checklist?.find(i => i.id === row.dataset.tkId);
  tkExpenseOpenV62 = "";
  if (!car || !item || item.done) return tkRenderV62();
  const expense = Math.max(0, Number(row.querySelector("#tkExpenseInput")?.value || 0));
  if (expense > 0) {
    tkRenderV62();
    openCarTaskReceiptSheetV24(car, item, expense);
    return;
  }
  row.classList.add("isDone");
  await new Promise(r => setTimeout(r, 260));
  await completeCarTaskWithExpenseV24(car, item, 0, []);
  saveState();
  render();
  toast("Užduotis atlikta", "✓");
}
document.addEventListener(
  "click",
  e => {
    const hub = e.target.closest("#garageTasksSection .tkHubV62");
    if (!hub) return;
    const tab = e.target.closest("[data-tk-tab]");
    if (tab) {
      tkTabV62 = tab.dataset.tkTab;
      tkExpenseOpenV62 = "";
      tkRenderV62();
      return;
    }
    const carOpen = e.target.closest("[data-tk-car-open]");
    if (carOpen) return openCar(carOpen.dataset.tkCarOpen);
    const add = e.target.closest("[data-tk-add]");
    if (add) {
      const form = hub.querySelector(".tkFormV62");
      const open = form.hidden;
      form.hidden = !open;
      add.setAttribute("aria-expanded", String(open));
      if (open) hub.querySelector("#tkNewTitleV62")?.focus({ preventScroll: true });
      return;
    }
    const row = e.target.closest(".tkRowV62");
    if (!row) return;
    if (e.target.closest("[data-tk-done]")) return void tkCompleteV62(row);
    if (e.target.closest("[data-tk-confirm]")) return void tkConfirmCarV62(row);
    if (e.target.closest("[data-tk-cancel]")) {
      tkExpenseOpenV62 = "";
      return tkRenderV62();
    }
    if (e.target.closest("[data-tk-del]")) return deleteGarageTask(row.dataset.tkId);
    if (e.target.closest("[data-tk-open]")) return openCar(row.dataset.tkCar);
  },
  true
);
document.addEventListener(
  "submit",
  e => {
    if (!e.target.closest?.(".tkFormV62")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const title = document.getElementById("tkNewTitleV62")?.value.trim() || "";
    const due = document.getElementById("tkNewDueV62")?.value || "";
    if (!title) {
      toast("Įrašykite užduotį", "!");
      document.getElementById("tkNewTitleV62")?.focus();
      return;
    }
    tkTabV62 = "custom";
    if (addGarageTask(title, 0, 0, due, "normal", "Bendra", "")) {
      const form = e.target.closest(".tkFormV62");
      form.reset();
      form.hidden = true;
      form.parentElement.querySelector("[data-tk-add]")?.setAttribute("aria-expanded", "false");
    }
  },
  true
);
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Enter" && e.target.id === "tkExpenseInput") {
      e.preventDefault();
      const row = e.target.closest(".tkRowV62");
      if (row) tkConfirmCarV62(row);
    }
  },
  true
);
const __renderTasksHubV62 = render;
render = async function () {
  const result = await __renderTasksHubV62.apply(this, arguments);
  tkRenderV62();
  return result;
};
