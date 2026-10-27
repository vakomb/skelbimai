// Globalūs paspaudimų ir formų įvykių prijungimai (navigacija, formos).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

document.addEventListener("click", e => {
  const b = e.target.closest("[data-open-history]");
  if (!b) return;
  state.ui = state.ui || {};
  state.ui.menuHistoryOpen = !state.ui.menuHistoryOpen;
  saveState();
  render();
  if (state.ui.menuHistoryOpen)
    requestAnimationFrame(() =>
      document.getElementById("menu-history")?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
});
document.addEventListener(
  "click",
  e => {
    const btn = e.target.closest("[data-delete-car]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof deleteCar === "function") deleteCar(btn.dataset.deleteCar);
  },
  true
);
document.addEventListener("click", e => {
  const btn = e.target.closest(".navBtn[data-view]");
  if (!btn) return;
  e.preventDefault();
  state.selectedView = btn.dataset.view;
  state.ui = state.ui || {};
  state.ui.taskGroups = { Sveikata: false, Produktyvumas: false, Tobulėjimas: false };
  state.ui.garageTaskGroups = { autos: false, custom: false };
  state.ui.garageInlineExpanded = "";
  state.ui.menuSections = { shop: false, stats: false };
  state.ui.soldCarsOpen = false;
  saveState();
  render();
  requestAnimationFrame(() => window.scrollTo(0, 0));
});
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-jump]");
  if (!btn) return;
  const section = btn.dataset.menuSection;
  if (section) {
    state.ui = state.ui || {
      taskGroups: { Sveikata: false, Produktyvumas: false, Tobulėjimas: false },
      historyOpen: false,
      garageTaskGroups: { autos: false, custom: false },
      leadFilters: { query: "", due: "all", sort: "due" },
      menuSections: { shop: false, stats: false }
    };
    state.ui.menuSections = state.ui.menuSections || { shop: false, stats: false };
    const nextOpen = !state.ui.menuSections[section];
    Object.keys(state.ui.menuSections).forEach(key => (state.ui.menuSections[key] = false));
    state.ui.menuSections[section] = nextOpen;
    saveState();
    render();
    if (state.ui.menuSections[section]) {
      requestAnimationFrame(() => {
        const target = document.getElementById(btn.dataset.jump);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      toast("Skiltis išskleista", "↘️");
    }
    return;
  }
  const target = document.getElementById(btn.dataset.jump);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Atidaryta iš meniu", "↘️");
  }
});
const historyApplyBtn = document.getElementById("historyApplyBtn");
const historyTodayBtn = document.getElementById("historyTodayBtn");
const history7Btn = document.getElementById("history7Btn");
const history30Btn = document.getElementById("history30Btn");
const historyAllBtn = document.getElementById("historyAllBtn");
const setHistoryRange = days => {
  const a = document.getElementById("historyFromDate"),
    b = document.getElementById("historyToDate");
  if (!a || !b) return;
  if (days === null) {
    a.value = "";
    b.value = "";
  } else if (days === 0) {
    a.value = todayISO();
    b.value = todayISO();
  } else {
    const d = parseISODateLocal(todayISO());
    d.setDate(d.getDate() - days + 1);
    a.value = toISODateLocal(d);
    b.value = todayISO();
  }
  render();
};
if (historyApplyBtn) historyApplyBtn.onclick = () => render();
if (historyTodayBtn) historyTodayBtn.onclick = () => setHistoryRange(0);
if (history7Btn) history7Btn.onclick = () => setHistoryRange(7);
if (history30Btn) history30Btn.onclick = () => setHistoryRange(30);
if (historyAllBtn) historyAllBtn.onclick = () => setHistoryRange(null);
const historyToggleBtnEl = document.getElementById("historyToggleBtn");
if (historyToggleBtnEl)
  historyToggleBtnEl.onclick = () => {
    state.ui = state.ui || {
      taskGroups: { Sveikata: false, Produktyvumas: false, Tobulėjimas: false },
      historyOpen: false,
      garageTaskGroups: { autos: false, custom: false },
      leadFilters: { query: "", due: "all", sort: "due" }
    };
    state.ui.historyOpen = !state.ui.historyOpen;
    saveState();
    render();
  };
const backToGarageStatsBtn = document.getElementById("backToGarageStatsBtn");
if (backToGarageStatsBtn)
  backToGarageStatsBtn.onclick = () => {
    state.selectedView = "garage";
    saveState();
    render();
  };
const backToMenuBtn = document.getElementById("backToMenuBtn");
if (backToMenuBtn)
  backToMenuBtn.onclick = () => {
    state.selectedView = "menu";
    saveState();
    render();
  };
document.addEventListener("click", e => {
  const openViewBtn = e.target.closest("[data-open-view]");
  if (openViewBtn) {
    if (openViewBtn.dataset.openView === "customers") return openGarageContacts(true);
    state.selectedView = openViewBtn.dataset.openView;
    state.ui = state.ui || {};
    state.ui.menuSections = { shop: false, stats: false };
    state.ui.taskGroups = { Sveikata: false, Produktyvumas: false, Tobulėjimas: false };
    state.ui.garageTaskGroups = { autos: false, custom: false };
    state.ui.garageInlineExpanded = "";
    saveState();
    render();
    return;
  }
  const soldToggle = e.target.closest("#toggleSoldCarsBtn");
  if (soldToggle) {
    state.ui = state.ui || {};
    state.ui.soldCarsOpen = !state.ui.soldCarsOpen;
    saveState();
    render();
    return;
  }
  const actionBtn = e.target.closest("[data-garage-action]");
  if (actionBtn) {
    const action = actionBtn.dataset.garageAction;
    if (action === "what") return companyGo("garage-what");
    if (action === "tasks") return openGarageTasks();
    if (action === "leads") return openGarageLeadsPage();
    if (action === "contacts") return openGarageContacts();
    if (action === "customtasks") {
      state.ui = state.ui || {};
      state.ui.garageTaskGroups = state.ui.garageTaskGroups || { autos: false, custom: false };
      state.ui.garageTaskGroups.autos = false;
      state.ui.garageTaskGroups.custom = true;
      state.ui.soldCarsOpen = false;
      saveState();
      render();
      setTimeout(
        () =>
          document.getElementById("garageCustomBody")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        60
      );
      return;
    }
    if (action === "addcar") return openGarageAddCar();
    if (action === "stats") return companyGo("customers");
    if (action === "accounting") return companyGo("accounting");
  }
  const toggleBtn = e.target.closest("[data-garage-toggle]");
  if (toggleBtn) {
    state.ui = state.ui || {
      taskGroups: { Sveikata: false, Produktyvumas: false, Tobulėjimas: false },
      historyOpen: false,
      garageTaskGroups: { autos: false, custom: false },
      leadFilters: { query: "", due: "all", sort: "due" }
    };
    state.ui.garageTaskGroups = state.ui.garageTaskGroups || { autos: false, custom: false };
    const key = toggleBtn.dataset.garageToggle;
    const nextOpen = !state.ui.garageTaskGroups[key];
    state.ui.garageTaskGroups.autos = false;
    state.ui.garageTaskGroups.custom = false;
    state.ui.garageTaskGroups[key] = nextOpen;
    saveState();
    render();
  }
});
const addFinanceTxBtn = document.getElementById("addFinanceTxBtn");
if (addFinanceTxBtn)
  addFinanceTxBtn.onclick = () => {
    const type = document.getElementById("financeTxType").value;
    const amount = Number(document.getElementById("financeTxAmount").value || 0);
    const title = document.getElementById("financeTxTitle").value.trim();
    const note = document.getElementById("financeTxNote").value.trim();
    const date = document.getElementById("financeTxDate").value || todayISO();
    if (!amount || amount <= 0) {
      toast("Įrašyk sumą", "💶");
      return;
    }
    addFinanceTransaction(type, amount, title, note, date);
    document.getElementById("financeTxAmount").value = "";
    document.getElementById("financeTxTitle").value = "";
    document.getElementById("financeTxNote").value = "";
  };
const addDebtBtn = document.getElementById("addDebtBtn");
if (addDebtBtn)
  addDebtBtn.onclick = () => {
    const action = document.getElementById("debtAction").value;
    const person = document.getElementById("debtPerson").value.trim();
    const amount = Number(document.getElementById("debtAmount").value || 0);
    const note = document.getElementById("debtNote").value.trim();
    const date = document.getElementById("debtDate").value || todayISO();
    if (!person || !amount || amount <= 0) {
      toast("Įrašyk žmogų ir sumą", "👥");
      return;
    }
    addDebtAction(action, person, amount, note, date);
    document.getElementById("debtPerson").value = "";
    document.getElementById("debtAmount").value = "";
    document.getElementById("debtNote").value = "";
  };
const garageTaskForm = document.getElementById("garageTaskForm");
if (garageTaskForm && !garageTaskForm.dataset.bound) {
  garageTaskForm.dataset.bound = "1";
  garageTaskForm.addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("garageTaskTitle").value.trim();
    const xp = 0,
      coins = 0;
    const dueDate = document.getElementById("garageTaskDueDate")?.value || "";
    if (!title) {
      toast("Įrašyk garažo užduotį", "✍️");
      return;
    }
    const priority = document.getElementById("garageTaskPriority")?.value || "normal";
    const category = document.getElementById("garageTaskCategory")?.value || "Bendra";
    const notes = document.getElementById("garageTaskNotes")?.value || "";
    addGarageTask(title, xp, coins, dueDate, priority, category, notes);
    document.getElementById("garageTaskTitle").value = "";
    const dueEl = document.getElementById("garageTaskDueDate");
    if (dueEl) dueEl.value = "";
    const notesEl = document.getElementById("garageTaskNotes");
    if (notesEl) notesEl.value = "";
    const priorityEl = document.getElementById("garageTaskPriority");
    if (priorityEl) priorityEl.value = "normal";
  });
}
const showAddCarFormBtn = document.getElementById("showAddCarFormBtn");
const cancelAddCarBtn = document.getElementById("cancelAddCarBtn");
const addCarPanel = document.getElementById("addCarPanel");
if (showAddCarFormBtn)
  showAddCarFormBtn.onclick = () => {
    state.ui = state.ui || {};
    state.ui.garageTaskGroups = { autos: false, custom: false };
    state.ui.garageTaskHubOpen = false;
    state.ui.garageInlineExpanded = "addcar";
    state.ui.soldCarsOpen = false;
    document.getElementById("view-garage-leads")?.classList.remove("garageInlineOpen");
    saveState();
    if (addCarPanel) {
      addCarPanel.classList.remove("garagePanelClosing");
      addCarPanel.dataset.transitionToken = String(Number(addCarPanel.dataset.transitionToken || 0) + 1);
      addCarPanel.style.display = "block";
    }
    showAddCarFormBtn.style.display = "none";
  };
if (cancelAddCarBtn)
  cancelAddCarBtn.onclick = () => {
    if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
    else if (addCarPanel) addCarPanel.style.display = "none";
    if (showAddCarFormBtn) showAddCarFormBtn.style.display = "block";
    state.ui = state.ui || {};
    state.ui.garageInlineExpanded = "";
    saveState();
  };
document.getElementById("addCarBtn").onclick = () => {
  const name = document.getElementById("carName").value.trim();
  const buyPrice = Number(document.getElementById("carBuyPrice").value || 0);
  const files = Array.from(document.getElementById("carPhoto").files || []).filter(
    f => f && /^image\//i.test(f.type)
  );
  if (!name) {
    toast("Įvesk automobilio pavadinimą", "✍️");
    return;
  }
  if (!buyPrice || buyPrice <= 0) {
    toast("Įvesk pirkimo kainą", "💰");
    return;
  }
  addCar(name, "", buyPrice);
  const car = state.cars[0];
  if (car) {
    car.photos = [];
    car.imageSrc = "";
  }
  document.getElementById("carName").value = "";
  document.getElementById("carBuyPrice").value = "";
  document.getElementById("carPhoto").value = "";
  if (!files.length) {
    toast("Automobilis pridėtas. Nuotraukas galėsi pridėti vėliau.", "🚗");
    return;
  }
  (async () => {
    const photoKeys = [];
    for (const file of files) {
      try {
        const key = await storeImageFile(file);
        if (key) {
          photoKeys.push(key);
          await photoGet(key);
        }
      } catch (e) {
        console.warn("Garage photo failed", e);
      }
      await new Promise(r => setTimeout(r, 0));
    }
    if (!photoKeys.length) {
      toast("Automobilis pridėtas, bet nuotraukų nepavyko išsaugoti", "⚠️");
      return;
    }
    car.photos = photoKeys;
    car.imageSrc = photoKeys[0];
    saveState();
    await hydrateCarPhotos();
    render();
    toast(`${photoKeys.length} nuotrauk${photoKeys.length === 1 ? "a" : "os"} pridėta`, "🖼️");
  })().catch(e => console.warn("Garage photo processing failed", e));
};
const addGarageLeadBtn = document.getElementById("addGarageLeadBtn");
if (addGarageLeadBtn && !addGarageLeadBtn.dataset.bound) {
  addGarageLeadBtn.dataset.bound = "1";
  addGarageLeadBtn.onclick = () => addGarageLead();
}
const showAddGarageLeadBtn = document.getElementById("showAddGarageLeadBtn");
const addGarageLeadPanel = document.getElementById("addGarageLeadPanel");
const cancelAddGarageLeadBtn = document.getElementById("cancelAddGarageLeadBtn");
if (showAddGarageLeadBtn && !showAddGarageLeadBtn.dataset.bound) {
  showAddGarageLeadBtn.dataset.bound = "1";
  showAddGarageLeadBtn.onclick = () => {
    if (addGarageLeadPanel) addGarageLeadPanel.style.display = "block";
    showAddGarageLeadBtn.style.display = "none";
    setTimeout(() => document.getElementById("leadMake")?.focus(), 40);
  };
}
if (cancelAddGarageLeadBtn && !cancelAddGarageLeadBtn.dataset.bound) {
  cancelAddGarageLeadBtn.dataset.bound = "1";
  cancelAddGarageLeadBtn.onclick = () => {
    if (addGarageLeadPanel) addGarageLeadPanel.style.display = "none";
    if (showAddGarageLeadBtn) showAddGarageLeadBtn.style.display = "block";
  };
}
document.getElementById("backToGarageBtn").onclick = () => {
  state.selectedView = "garage";
  saveState();
  render();
};
