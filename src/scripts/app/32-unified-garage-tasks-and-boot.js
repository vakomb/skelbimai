// Vieningas Garažo užduočių sąrašas, window.AUTOEASIER_APP_DATA (sinchronizacijai) ir pirmas render().
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function garagePersonalDueItemsV1() {
  const now = todayISO(),
    items = [];
  (state.cars || [])
    .filter(car => car.status !== "parduotas")
    .forEach(car => {
      (car.checklist || [])
        .filter(task => !task.done && task.dueDate && task.dueDate <= now)
        .forEach(task =>
          items.push({
            kind: "car",
            id: car.id,
            taskId: task.id,
            category: "Auto užduotis",
            action: task.name || "Automobilio užduotis",
            entity: car.name || "Automobilis",
            due: task.dueDate,
            late: task.dueDate < now
          })
        );
    });
  (state.garageTasks || [])
    .filter(task => !task.done && task.dueDate && task.dueDate <= now)
    .forEach(task =>
      items.push({
        kind: "task",
        id: task.id,
        category: "Kita užduotis",
        action: task.title || "Užduotis",
        entity: "",
        due: task.dueDate,
        late: task.dueDate < now
      })
    );
  return items.sort(
    (a, b) =>
      Number(b.late) - Number(a.late) ||
      (a.due || "").localeCompare(b.due || "") ||
      (a.action || "").localeCompare(b.action || "", "lt")
  );
}
function renderUnifiedGarageTasks() {
  const section = document.getElementById("garageTasksSection");
  const button = document.querySelector('#view-garage [data-garage-action="tasks"]');
  if (!section || !button) return;
  if (section.dataset.taskAccordionBound !== "1") {
    section.dataset.taskAccordionBound = "1";
    section.addEventListener("click", event => {
      const toggle = event.target.closest("[data-task-section-toggle]");
      if (toggle) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.ui = state.ui || {};
        state.ui.garageTaskGroups = state.ui.garageTaskGroups || {
          today: false,
          autos: false,
          custom: false
        };
        const key = toggle.dataset.taskSectionToggle;
        state.ui.garageTaskGroups[key] = !state.ui.garageTaskGroups[key];
        saveState();
        render();
        return;
      }
      if (event.target.closest("[data-toggle-other-task-form]")) {
        state.ui = state.ui || {};
        state.ui.garageTaskGroups = state.ui.garageTaskGroups || {
          today: false,
          autos: false,
          custom: false
        };
        state.ui.garageTaskGroups.custom = true;
        const group = document.querySelector('#garageTasksSection [data-task-section="custom"]'),
          body = document.getElementById("garageCustomSectionBody");
        group?.classList.add("is-expanded");
        if (body) body.hidden = false;
        document.getElementById("garageCustomBody")?.classList.add("open");
        group?.querySelector('[data-task-section-toggle="custom"]')?.setAttribute("aria-expanded", "true");
        saveState();
      }
    });
  }
  const open = !!state.ui?.garageTaskHubOpen;
  section.classList.toggle("is-open", open);
  section.hidden = !open;
  section.style.setProperty("display", open ? "grid" : "none", "important");
  section.classList.remove("is-closing");
  button.setAttribute("aria-expanded", String(open));
  const dueItems = garagePersonalDueItemsV1();
  button.setAttribute("aria-label", `Užduotys, ${dueItems.length} šiandien arba vėluoja`);
  state.ui = state.ui || {};
  state.ui.garageTaskGroups = state.ui.garageTaskGroups || { today: false, autos: false, custom: false };
  const groups = state.ui.garageTaskGroups;
  section.querySelectorAll("[data-task-section-toggle]").forEach(toggle => {
    const key = toggle.dataset.taskSectionToggle,
      expanded = !!groups[key],
      group = toggle.closest(".garageUnifiedSection"),
      body = group?.querySelector(".garageUnifiedSectionBody");
    toggle.setAttribute("aria-expanded", String(expanded));
    group?.classList.toggle("is-expanded", expanded);
    if (body) body.hidden = !expanded;
  });
  document.getElementById("garageAutosBody")?.classList.toggle("open", !!groups.autos);
  document.getElementById("garageCustomBody")?.classList.toggle("open", !!groups.custom);
  const badge = button.querySelector(".garageTaskBadgeSlot");
  if (badge)
    badge.innerHTML = dueItems.length ? `<span class="garageTaskUrgentBadge">${dueItems.length}</span>` : "";
  const autoCount = (state.cars || [])
    .filter(c => c.status !== "parduotas")
    .reduce((n, c) => n + (c.checklist || []).filter(t => !t.done).length, 0);
  const otherCount = (state.garageTasks || []).filter(t => !t.done).length;
  const a = document.getElementById("garageAutoSectionCount");
  if (a) a.textContent = String(autoCount);
  const o = document.getElementById("garageOtherSectionCount");
  if (o) o.textContent = String(otherCount);
  const todayCount = document.getElementById("garageTodayCount");
  if (todayCount) todayCount.textContent = String(dueItems.length);
  const root = document.getElementById("garageTodayTasksRoot");
  if (root) {
    root.innerHTML = dueItems.length
      ? dueItems
          .map(item => {
            const type = item.kind === "car" ? "Auto užduotis" : "Kita užduotis";
            const stateLabel = item.late ? "Vėluoja" : "Šiandien";
            return `<button class="garageUnifiedTask ${item.late ? "late" : ""}" type="button" data-company-kind="${escapeHTML(item.kind)}" data-company-id="${escapeHTML(item.id)}" ${item.taskId ? `data-company-task-id="${escapeHTML(item.taskId)}"` : ""}><span class="garageUnifiedTaskMark">${item.late ? "!" : "✓"}</span><span class="garageUnifiedTaskCopy"><span class="garageTaskKindLabel">${escapeHTML(type)}</span><strong>${escapeHTML(item.action || "Užduotis")}</strong>${item.entity ? `<small>${escapeHTML(item.entity)}</small>` : ""}</span><b class="garageUnifiedDue ${item.late ? "late" : ""}">${stateLabel}</b></button>`;
          })
          .join("")
      : "";
  }
}
const __renderUnifiedTasksBase = render;
render = async function () {
  const result = await __renderUnifiedTasksBase.apply(this, arguments);
  renderUnifiedGarageTasks();
  return result;
};
window.AUTOEASIER_APP_DATA = {
  storageKey: STORAGE_KEY,
  getState: () => JSON.parse(JSON.stringify(state)),
  switchAccount: (userId, { importLegacy = false } = {}) => {
    if (!userId) throw new Error("Trūksta paskyros ID.");
    const nextKey = `visureigiai_uab_v1:user:${userId}`;
    if (STORAGE_KEY === nextKey) return false;
    STORAGE_KEY = nextKey;
    if (!localStorage.getItem(nextKey)) {
      let initial = null;
      if (importLegacy) {
        try {
          const old = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (old) initial = JSON.parse(old);
        } catch (e) {}
      }
      localStorage.setItem(
        nextKey,
        JSON.stringify(initial && typeof initial === "object" ? initial : defaultState())
      );
    }
    state = sanitizeMediaRefs(loadState());
    render();
    return true;
  },
  lockAccount: () => {
    STORAGE_KEY = "visureigiai_uab_v1:locked";
    state = defaultState();
    render();
    return true;
  },
  replaceState: next => {
    const local = loadState();
    const merged = {
      ...next,
      security: local.security,
      selectedView: local.selectedView,
      ui: local.ui,
      theme: local.theme,
      sound: local.sound,
      vibrate: local.vibrate
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    state = sanitizeMediaRefs(loadState());
    window.dispatchEvent(new Event("autoeasier:local-save"));
    render();
    return true;
  },
  readMedia: async key => {
    try {
      const fallback = localStorage.getItem(PHOTO_FALLBACK_PREFIX + key);
      if (fallback) {
        const response = await fetch(fallback);
        if (response.ok) return await response.blob();
      }
    } catch (e) {}
    try {
      const db = await openPhotoDB();
      return await new Promise((resolve, reject) => {
        const req = db.transaction(PHOTO_STORE_NAME, "readonly").objectStore(PHOTO_STORE_NAME).get(key);
        req.onsuccess = () =>
          req.result instanceof Blob ? resolve(req.result) : reject(Error("Vietinis failas nerastas"));
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return null;
    }
  },
  makeBackup: async () => {
    const snapshot = JSON.parse(JSON.stringify(state)),
      photos = await companyPhotoExport(snapshot),
      documents = await exportVehicleDocuments(snapshot);
    return new Blob(
      [
        JSON.stringify({
          app: "visureigiai-uab",
          version: 2,
          createdAt: new Date().toISOString(),
          state: snapshot,
          photos,
          documents
        })
      ],
      { type: "application/json" }
    );
  }
};
ensureContactBook();
try {
  render();
} catch (e) {
  console.warn("PRO MAX render", e);
}
