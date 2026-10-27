// Kitos užduotys ir pagrindinio puslapio (home) blokai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function taskPriorityLabel(p) {
  return p === "urgent" ? "Skubu" : p === "important" ? "Svarbu" : "Normalu";
}
function taskDateBucket(t) {
  if (t.done) return "done";
  if (t.dueDate && t.dueDate < todayISO()) return "late";
  if (t.dueDate === todayISO()) return "today";
  if (t.dueDate) return "upcoming";
  return "nodate";
}
function editOtherTask(id) {
  const t = (state.garageTasks || []).find(x => x.id === id);
  if (!t) return;
  openSheet(
    `<div class="sheetHead"><h3>Užduotis</h3><button class="closeBtn" type="button" data-close-other-task>✕</button></div><form id="editOtherTaskForm"><div class="field"><label>Pavadinimas</label><input class="input" id="editOtherTaskTitle" maxlength="180" required value="${escapeHTML(t.title)}"></div><div class="grid2"><div class="field"><label>Tema</label><select class="input" id="editOtherTaskCategory">${["Bendra", "Dokumentai", "Servisas", "Skambutis", "Apžiūra", "Kita"].map(x => `<option${x === (t.category || "Bendra") ? " selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>Prioritetas</label><select class="input" id="editOtherTaskPriority"><option value="normal"${(t.priority || "normal") === "normal" ? " selected" : ""}>Normalu</option><option value="important"${t.priority === "important" ? " selected" : ""}>Svarbu</option><option value="urgent"${t.priority === "urgent" ? " selected" : ""}>Skubu</option></select></div></div><div class="field"><label>Terminas</label><input class="input" id="editOtherTaskDate" type="date" value="${escapeHTML(t.dueDate || "")}"></div><div class="field"><label>Pastaba</label><textarea class="input" id="editOtherTaskNotes" rows="3">${escapeHTML(t.notes || "")}</textarea></div><button class="btn" type="submit" style="width:100%">Išsaugoti</button></form>`
  );
  document.getElementById("editOtherTaskForm").onsubmit = e => {
    e.preventDefault();
    t.title = document.getElementById("editOtherTaskTitle").value.trim();
    t.category = document.getElementById("editOtherTaskCategory").value;
    t.priority = document.getElementById("editOtherTaskPriority").value;
    t.dueDate = document.getElementById("editOtherTaskDate").value;
    t.notes = document.getElementById("editOtherTaskNotes").value.trim();
    saveState();
    closeSheet();
    render();
    toast("Užduotis atnaujinta", "✓");
  };
}
function renderOtherTasksPro() {
  const root = document.getElementById("garageCustomTasksRoot");
  if (!root) return;
  const tasks = (state.garageTasks || []).slice();
  const w = { urgent: 0, important: 1, normal: 2 };
  tasks.sort(
    (a, b) =>
      Number(!!a.done) - Number(!!b.done) ||
      (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
      w[a.priority || "normal"] - w[b.priority || "normal"]
  );
  const groups = [
    ["late", "Vėluoja"],
    ["today", "Šiandien"],
    ["upcoming", "Artimiausios"],
    ["nodate", "Be datos"],
    ["done", "Atliktos"]
  ];
  const html = groups
    .map(([key, label]) => {
      const rows = tasks.filter(t => taskDateBucket(t) === key);
      if (!rows.length) return "";
      return `<section class="otherTaskGroup"><div class="otherTaskGroupTitle"><h4>${label}</h4><b>${rows.length}</b></div>${rows.map(t => `<article class="otherTaskCard ${escapeHTML(t.priority || "normal")} ${t.done ? "done" : ""}"><button class="otherTaskCheck" type="button" data-garage-task-complete="${escapeHTML(t.id)}" ${t.done ? "disabled" : ""}>${t.done ? "✓" : "○"}</button><div class="otherTaskMain"><strong>${escapeHTML(t.title)}</strong><div class="otherTaskMeta"><span>${escapeHTML(t.category || "Bendra")}</span><span>${taskPriorityLabel(t.priority)}</span>${t.dueDate ? `<span class="${t.dueDate < todayISO() && !t.done ? "late" : ""}">${t.dueDate === todayISO() ? "Šiandien" : companyDate(t.dueDate)}</span>` : ""}</div>${t.notes ? `<p>${escapeHTML(t.notes)}</p>` : ""}</div><div class="otherTaskActions"><button type="button" data-other-task-edit="${escapeHTML(t.id)}">✎</button><button class="danger" type="button" data-garage-task-delete="${escapeHTML(t.id)}">×</button></div></article>`).join("")}</section>`;
    })
    .join("");
  root.innerHTML = html ? `<div class="otherTasksPro">${html}</div>` : "";
  root
    .querySelectorAll("[data-garage-task-complete]")
    .forEach(b => (b.onclick = () => completeGarageTask(b.dataset.garageTaskComplete)));
  root
    .querySelectorAll("[data-garage-task-delete]")
    .forEach(b => (b.onclick = () => deleteGarageTask(b.dataset.garageTaskDelete)));
  root
    .querySelectorAll("[data-other-task-edit]")
    .forEach(b => (b.onclick = () => editOtherTask(b.dataset.otherTaskEdit)));
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-close-other-task]")) closeSheet();
});
function todayRequiredItemsApp() {
  const now = todayISO(),
    items = [],
    active = (state.cars || []).filter(c => c.status !== "parduotas");
  const push = x => items.push({ ...x, late: !!(x.due && x.due < now) });
  active.forEach(car => {
    (car.checklist || [])
      .filter(t => !t.done && t.dueDate && t.dueDate <= now)
      .forEach(t =>
        push({
          kind: "car",
          id: car.id,
          category: "Auto užduotis",
          icon: "🔧",
          action: t.name,
          entity: car.name,
          due: t.dueDate,
          priority: 115
        })
      );
    const sdk = car.sdkStatus || "unset";
    if (sdk.endsWith("-late"))
      push({
        kind: "car",
        id: car.id,
        category: "SDK",
        icon: "▤",
        action: "Sutvarkyti vėluojantį SDK",
        entity: car.name,
        due: "",
        priority: 150,
        late: true
      });
    if (car.taStatus === "invalid" || (car.taStatus === "valid" && car.taUntil && car.taUntil <= now))
      push({
        kind: "car",
        id: car.id,
        category: "TA",
        icon: "⌖",
        action: "Sutvarkyti techninę apžiūrą",
        entity: car.name,
        due: car.taUntil || now,
        priority: 130
      });
    if (
      car.insuranceStatus === "invalid" ||
      (car.insuranceStatus === "valid" && car.insuranceUntil && car.insuranceUntil <= now)
    )
      push({
        kind: "car",
        id: car.id,
        category: "Draudimas",
        icon: "◈",
        action: "Sutvarkyti draudimą",
        entity: car.name,
        due: car.insuranceUntil || now,
        priority: 126
      });
  });
  (state.garageTasks || [])
    .filter(t => !t.done && t.dueDate && t.dueDate <= now)
    .forEach(t =>
      push({
        kind: "task",
        id: t.id,
        category: t.category || "Kita užduotis",
        icon: "✓",
        action: t.title,
        entity: "Kita užduotis",
        due: t.dueDate,
        priority: t.priority === "urgent" ? 140 : t.priority === "important" ? 120 : 100
      })
    );
  (state.leadVariants || [])
    .filter(l => l.nextCallDate && l.nextCallDate <= now)
    .forEach(l =>
      push({
        kind: "lead",
        id: l.id,
        category: "Skambutis",
        icon: "☎",
        action: "Paskambinti pardavėjui",
        entity: [l.make, l.model].filter(Boolean).join(" ") || "Pirkimo variantas",
        due: l.nextCallDate,
        priority: 118
      })
    );
  (state.customers || [])
    .filter(c => c.stage !== "Užbaigta" && c.followDate && c.followDate <= now)
    .forEach(c =>
      push({
        kind: "customer",
        id: c.id,
        category: c.stage === "Apžiūra" ? "Apžiūra" : "Klientas",
        icon: c.stage === "Apžiūra" ? "⌖" : "☎",
        action: c.nextAction || (c.stage === "Apžiūra" ? "Atlikti apžiūrą" : "Susisiekti su klientu"),
        entity: c.name || "Klientas",
        due: c.followDate,
        priority: c.stage === "Apžiūra" ? 122 : 112
      })
    );
  (state.cars || [])
    .filter(c => c.status === "parduotas" && !c.accountingSharedAt && c.soldDateISO && c.soldDateISO <= now)
    .forEach(c =>
      push({
        kind: "car",
        id: c.id,
        category: "Buhalterija",
        icon: "📁",
        action: "Pateikti automobilio dokumentus",
        entity: c.name,
        due: c.soldDateISO,
        priority: 108
      })
    );
  return items.sort(
    (a, b) =>
      Number(b.late) - Number(a.late) ||
      (b.priority || 0) - (a.priority || 0) ||
      (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31")
  );
}
function homeTaskDueApp(date = "") {
  if (!date) return { label: "Be termino", cls: "" };
  const now = todayISO();
  if (date < now) return { label: "Vėluoja", cls: "late" };
  if (date === now) return { label: "Šiandien", cls: "today" };
  return { label: companyDate(date), cls: "" };
}
function homeCarTaskGroupsApp() {
  return (state.cars || [])
    .filter(c => c.status !== "parduotas")
    .map(car => {
      const tasks = (car.checklist || [])
        .filter(t => !t.done)
        .slice()
        .sort((a, b) => {
          const ad = a.dueDate || "9999-12-31",
            bd = b.dueDate || "9999-12-31";
          return ad.localeCompare(bd) || (a.name || "").localeCompare(b.name || "", "lt");
        });
      return { car, tasks };
    })
    .filter(x => x.tasks.length)
    .sort((a, b) => {
      const ad = a.tasks[0]?.dueDate || "9999-12-31",
        bd = b.tasks[0]?.dueDate || "9999-12-31";
      return ad.localeCompare(bd) || (a.car.name || "").localeCompare(b.car.name || "", "lt");
    });
}
function homeOtherTasksApp() {
  const rank = { urgent: 0, important: 1, normal: 2 };
  return (state.garageTasks || [])
    .filter(t => !t.done)
    .slice()
    .sort((a, b) => {
      const ad = a.dueDate || "9999-12-31",
        bd = b.dueDate || "9999-12-31";
      return (
        ad.localeCompare(bd) ||
        (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2) ||
        (a.title || "").localeCompare(b.title || "", "lt")
      );
    });
}
function renderCompanyHome() {
  const root = document.getElementById("companyHome");
  if (!root) return;
  state.ui = state.ui || {};
  state.ui.homeGroups = state.ui.homeGroups || { cars: false, other: false };
  const must = todayRequiredItemsApp(),
    late = must.filter(x => x.late),
    today = must.filter(x => !x.late);
  const carGroups = homeCarTaskGroupsApp(),
    carTaskCount = carGroups.reduce((n, g) => n + g.tasks.length, 0),
    other = homeOtherTasksApp();
  const completed = (state.completionLog || []).filter(e => e.date === todayISO()).length;
  const dateLabel = new Date()
    .toLocaleDateString("lt-LT", { weekday: "short", month: "short", day: "numeric" })
    .replaceAll(".", "");
  const priorityAll = [...late, ...today];
  const priorityRow = t =>
    `<button class="homePriorityItem ${t.late ? "late" : "today"}" type="button" data-company-kind="${t.kind}" data-company-id="${escapeHTML(t.id)}"><span class="homePriorityIcon">${t.icon || "✓"}</span><span class="homePriorityCopy"><small>${escapeHTML(t.category)}</small><strong>${escapeHTML(t.action)}</strong><span>${escapeHTML(t.entity)}</span></span><b class="homePriorityStatus">${t.late ? "VĖLUOJA" : "ŠIANDIEN"}</b></button>`;
  const priorityRows = priorityAll.slice(0, 4).map(priorityRow).join("");
  const priorityMore =
    priorityAll.length > 4
      ? `<details class="homePriorityMore"><summary>Rodyti dar ${priorityAll.length - 4}</summary><div class="homePriorityMoreList">${priorityAll.slice(4).map(priorityRow).join("")}</div></details>`
      : "";
  root.innerHTML = `\n      <div class="homeDashHead"><h2>Pagrindinis</h2><span class="homeDashDate">${escapeHTML(dateLabel)}</span></div>\n      ${must.length ? `<section class="homePriorityBoard"><div class="homePriorityTop"><div><span>Šiandien būtina</span><strong>${must.length === 1 ? "1 darbas reikalauja dėmesio" : `${must.length} darbai reikalauja dėmesio`}</strong></div><div class="homePriorityCounts"><b>Šiandien ${today.length}</b>${late.length ? `<b class="late">Vėluoja ${late.length}</b>` : ""}</div></div><div class="homePriorityList">${priorityRows}</div>${priorityMore}</section>` : `<section class="homePriorityDone"><span class="ico">✓</span><div><strong>Šiandien viskas pagal planą</strong><span>${completed ? `${completed} jau atlikta šiandien` : "Būtinų darbų pagal terminus nėra"}</span></div></section>`}\n      <div class="homeTaskStacks">\n        <details class="homeTaskFold" data-home-group="cars" ${state.ui.homeGroups.cars ? "open" : ""}>\n          <summary><span class="homeFoldIcon">🚗</span><span class="homeFoldTitle"><strong>Automobilių užduotys</strong></span><span class="homeFoldCount">${carTaskCount}</span><span class="homeFoldChevron">›</span></summary>\n          <div class="homeFoldBody">${
    carGroups.length
      ? carGroups
          .map(
            g =>
              `<section class="homeCarBlock"><div class="homeCarHead"><strong>${escapeHTML(g.car.name)}</strong><span>${g.tasks.length}</span></div><div class="homeFoldList">${g.tasks
                .map(t => {
                  const due = homeTaskDueApp(t.dueDate || "");
                  return `<button class="homeFoldTask" type="button" data-company-kind="car" data-company-id="${escapeHTML(g.car.id)}"><strong>${escapeHTML(t.name)}</strong><span class="homeFoldDue ${due.cls}">${escapeHTML(due.label)}</span></button>`;
                })
                .join("")}</div></section>`
          )
          .join("")
      : '<div class="homeFoldEmpty">Neatliktų automobilio užduočių nėra.</div>'
  }</div>\n        </details>\n        <details class="homeTaskFold" data-home-group="other" ${state.ui.homeGroups.other ? "open" : ""}>\n          <summary><span class="homeFoldIcon">✓</span><span class="homeFoldTitle"><strong>Kitos užduotys</strong></span><span class="homeFoldCount">${other.length}</span><span class="homeFoldChevron">›</span></summary>\n          <div class="homeFoldBody"><div class="homeFoldList" style="padding-top:12px">${
    other.length
      ? other
          .map(t => {
            const due = homeTaskDueApp(t.dueDate || "");
            return `<button class="homeFoldTask" type="button" data-company-kind="task" data-company-id="${escapeHTML(t.id)}"><strong>${escapeHTML(t.title)}</strong><span class="homeFoldDue ${due.cls}">${escapeHTML(due.label)}</span></button>`;
          })
          .join("")
      : '<div class="homeFoldEmpty">Kitų neatliktų užduočių nėra.</div>'
  }</div></div>\n        </details>\n      </div>`;
  root.querySelectorAll("details[data-home-group]").forEach(el =>
    el.addEventListener("toggle", () => {
      state.ui.homeGroups[el.dataset.homeGroup] = el.open;
      saveState();
    })
  );
  document.querySelectorAll(".navBtn").forEach(b => {
    if (b.dataset.view === state.selectedView) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}
