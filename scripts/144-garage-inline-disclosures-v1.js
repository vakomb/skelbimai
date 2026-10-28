(() => {
  const garage = document.getElementById("view-garage");
  const leads = document.getElementById("view-garage-leads");
  const contacts = document.getElementById("view-customers");
  const taskButton = document.querySelector('#view-garage [data-garage-action="tasks"]');
  if (!garage || !leads || !contacts) return;
  const leadOpenInitially = leads.classList.contains("active");
  leads.classList.remove("view", "active");
  leads.classList.add("garageInlinePanel");
  contacts.classList.remove("view", "active");
  contacts.classList.add("garageInlinePanel", "garageContactsInlinePanel");
  const tasks = document.getElementById("garageTasksSection"),
    anchor = tasks || garage.querySelector(".garageRefMenu");
  if (anchor) {
    if (leads.parentElement !== garage) garage.insertBefore(leads, anchor);
    if (contacts.parentElement !== garage) garage.insertBefore(contacts, anchor);
  }
  function addClose(panel) {
    const header =
      panel.id === "view-customers"
        ? panel.querySelector(".contactsHead")
        : panel.querySelector(":scope > .sectionHead");
    if (header && !panel.querySelector(".garageInlineClose")) {
      const close = document.createElement("button");
      close.type = "button";
      close.className = "garageInlineClose";
      close.textContent = "Uždaryti";
      close.setAttribute(
        "aria-label",
        panel.id === "view-customers" ? "Uždaryti kontaktus" : "Uždaryti variantus"
      );
      panel.append(close);
    }
  }
  let closingTask = false;
  window.__garageHideAddCarSmooth = () => {
    const panel = document.getElementById("addCarPanel");
    if (panel) {
      panel.classList.remove("garagePanelClosing");
      panel.style.display = "none";
    }
  };
  function hideAddCar() {
    window.__garageHideAddCarSmooth();
    const button = document.getElementById("showAddCarFormBtn");
    if (button) button.style.display = "block";
  }
  function closeTasks() {
    if (tasks?.classList.contains("is-open") && taskButton) {
      closingTask = true;
      taskButton.click();
      closingTask = false;
    }
  }
  function closeOther(keep = "") {
    if (keep !== "leads") {
      leads.classList.remove("garageInlineOpen");
      document
        .querySelector('#view-garage [data-garage-action="leads"]')
        ?.setAttribute("aria-expanded", "false");
    }
    if (keep !== "contacts") {
      contacts.classList.remove("garageInlineOpen");
      document
        .querySelector('#view-garage [data-garage-action="contacts"]')
        ?.setAttribute("aria-expanded", "false");
    }
    if (keep !== "addcar") hideAddCar();
    if (keep !== "tasks") closeTasks();
    const sold = document.getElementById("soldCarsPanel");
    if (keep !== "sold" && sold && sold.style.display !== "none")
      document.getElementById("toggleSoldCarsBtn")?.click();
    const form = document.getElementById("addGarageLeadPanel"),
      formButton = document.getElementById("showAddGarageLeadBtn");
    if (keep !== "leads") {
      if (form) form.style.display = "none";
      if (formButton) formButton.style.display = "block";
    }
  }
  addClose(leads);
  addClose(contacts);
  if (leadOpenInitially) document.querySelector('#view-garage .navBtn[data-view="garage"]')?.click();
  document.addEventListener(
    "click",
    e => {
      if (e.target.closest("#toggleSoldCarsBtn")) {
        closeOther("sold");
        return;
      }
      const leadFormBack = e.target.closest("#backToGarageBtn");
      if (leadFormBack) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const form = document.getElementById("addGarageLeadPanel");
        if (form) form.style.display = "none";
        const add = document.getElementById("showAddGarageLeadBtn");
        if (add) add.style.display = "block";
        return;
      }
      const closeInline = e.target.closest(".garageInlineClose");
      if (closeInline) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const panel = closeInline.closest(".garageInlinePanel");
        const action = panel?.id === "view-customers" ? "contacts" : "leads";
        document.querySelector('#view-garage [data-garage-action="' + action + '"]')?.click();
        return;
      }
      const nav = e.target.closest(".navBtn[data-view]");
      if (nav) {
        closeOther("");
        return;
      }
      const action = e.target.closest("#view-garage [data-garage-action]");
      if (!action) return;
      const name = action.dataset.garageAction;
      if (name === "contacts") {
        closeOther("contacts");
        return;
      }
      if (name === "leads") {
        closeOther("leads");
        return;
      }
      if (name === "addcar") {
        closeOther("addcar");
        return;
      }
      if (name === "tasks") {
        if (closingTask) return;
        closeOther("tasks");
        return;
      }
      if (name === "stats" || name === "what") closeOther("");
    },
    true
  );
  let initQueued = false;
  const observer = new MutationObserver(() => {
    if (initQueued) return;
    initQueued = true;
    requestAnimationFrame(() => {
      initQueued = false;
      addClose(leads);
      addClose(contacts);
    });
  });
  observer.observe(garage, { childList: true, subtree: true });
  const leadObserver = new MutationObserver(() =>
    document
      .querySelector('#view-garage [data-garage-action="leads"]')
      ?.setAttribute("aria-expanded", String(leads.classList.contains("garageInlineOpen")))
  );
  leadObserver.observe(leads, { attributes: true, attributeFilter: ["class"] });
  const contactObserver = new MutationObserver(() =>
    document
      .querySelector('#view-garage [data-garage-action="contacts"]')
      ?.setAttribute("aria-expanded", String(contacts.classList.contains("garageInlineOpen")))
  );
  contactObserver.observe(contacts, { attributes: true, attributeFilter: ["class"] });
})();
