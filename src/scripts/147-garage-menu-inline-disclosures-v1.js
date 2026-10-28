(() => {
  const garage = document.getElementById("view-garage"),
    menu = document.getElementById("view-menu");
  const links = menu?.querySelector(".menuLinks"),
    intro = menu?.querySelector(".menuIntro");
  if (!garage || !menu || !links || !intro) return;
  const definitions = [
    { key: "customers", title: "Kontaktai", id: "view-customers" },
    { key: "finance", title: "Finansai", id: "view-finance" },
    { key: "garage-stats", title: "Pardavimų statistika", id: "view-garage-stats" },
    { key: "history", title: "Veiksmų istorija", id: "menu-history" },
    { key: "settings", title: "Nustatymai", id: "view-settings" }
  ];
  const records = new Map();
  definitions.forEach(item => {
    const node = document.getElementById(item.id);
    if (!node) return;
    const marker = document.createComment("menu-inline-return:" + item.id);
    node.parentNode?.insertBefore(marker, node);
    records.set(item.key, { node, marker, baseClass: node.className.replace(/\bactive\b/g, "").trim() });
  });
  let activeKey = "";
  let panel = menu.querySelector("#menuInlineDisclosure");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "menuDisclosure";
    panel.id = "menuInlineDisclosure";
    panel.hidden = true;
    panel.innerHTML =
      '<div class="menuDisclosureHead"><strong></strong><button class="menuDisclosureClose" type="button" data-menu-disclosure-close>Uždaryti</button></div><div class="menuDisclosureContent" id="menuInlineDisclosureContent"></div>';
    intro.insertAdjacentElement("afterend", panel);
  }
  const panelTitle = panel.querySelector(".menuDisclosureHead strong"),
    panelContent = panel.querySelector(".menuDisclosureContent");
  function restore(key) {
    const r = records.get(key);
    if (!r?.node) return;
    if (r.marker?.parentNode) r.marker.parentNode.insertBefore(r.node, r.marker);
    r.node.className = r.baseClass;
    r.node.removeAttribute("aria-hidden");
    r.node.style.removeProperty("display");
  }
  function closeDisclosure() {
    if (!activeKey) return;
    if (activeKey === "history") document.getElementById("menu-history")?.classList.remove("open");
    restore(activeKey);
    const old = Array.from(links.querySelectorAll("[data-menu-disclosure]")).find(
      b => b.dataset.menuDisclosure === activeKey
    );
    old?.setAttribute("aria-expanded", "false");
    activeKey = "";
    panel.hidden = true;
    panelTitle.textContent = "";
    panelContent.replaceChildren();
  }
  function openDisclosure(item, button) {
    if (activeKey === item.key) {
      closeDisclosure();
      return;
    }
    closeDisclosure();
    const r = records.get(item.key);
    if (!r?.node) return;
    const node = r.node;
    node.classList.remove(
      "view",
      "active",
      "garageInlinePanel",
      "garageContactsInlinePanel",
      "garageInlineOpen"
    );
    node.classList.add("menuInlineModule");
    node.setAttribute("aria-hidden", "false");
    node.style.removeProperty("display");
    panelTitle.textContent = item.title;
    panelContent.replaceChildren(node);
    panel.hidden = false;
    activeKey = item.key;
    button.setAttribute("aria-expanded", "true");
    if (item.key === "history") node.classList.add("open");
  }
  const manager = garage.querySelector(".garageRefWhat");
  if (manager && !menu.querySelector(".menuManagerWrap")) {
    const wrap = document.createElement("div");
    wrap.className = "menuManagerWrap";
    const clone = manager.cloneNode(true);
    clone.classList.add("menuManagerButton");
    clone.setAttribute("aria-label", "Atidaryti vadybininką");
    menu.querySelector(":scope > .sectionHead")?.insertAdjacentElement("afterend", wrap);
    wrap.append(clone);
  }
  links.querySelectorAll(".menuLink").forEach((button, index) => {
    const item = definitions[index];
    if (!item) return;
    button.removeAttribute("data-open-view");
    button.removeAttribute("data-open-history");
    button.onclick = null;
    button.dataset.menuDisclosure = item.key;
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "menuInlineDisclosure");
    button.addEventListener("click", event => {
      event.preventDefault();
      openDisclosure(item, button);
    });
  });
  panel.querySelector("[data-menu-disclosure-close]")?.addEventListener("click", closeDisclosure);
  document.addEventListener(
    "click",
    event => {
      const menuButton = event.target.closest("#view-menu .menuLink[data-menu-disclosure]");
      if (menuButton) return;
      const nav = event.target.closest(".navBtn[data-view]");
      const moduleNav = event.target.closest(
        ".menuDisclosureContent [data-open-view],.menuDisclosureContent [data-garage-action],.menuDisclosureContent [data-menu-jump]"
      );
      if (nav || moduleNav) closeDisclosure();
    },
    true
  );
  function placeCloseActions() {
    const tasks = document.getElementById("garageTasksSection"),
      taskHead = tasks?.querySelector(":scope > .sectionHead"),
      taskClose = tasks?.querySelector("[data-close-garage-task-hub]");
    if (taskHead && taskClose && taskClose.parentElement !== taskHead) taskHead.append(taskClose);
    const form = document.getElementById("garageTaskForm"),
      formClose = form?.querySelector("[data-close-other-task-form]");
    if (form && formClose) {
      if (!form.querySelector(".garageCreateTaskHead")) {
        const h = document.createElement("div");
        h.className = "garageCreateTaskHead";
        h.innerHTML = "<strong>Pridėti kitą užduotį</strong>";
        form.prepend(h);
      }
      const h = form.querySelector(".garageCreateTaskHead");
      if (h && formClose.parentElement !== h) h.append(formClose);
    }
    const addCar = document.getElementById("addCarPanel"),
      addHead = addCar?.querySelector(":scope > .sectionHead"),
      addClose = addCar?.querySelector("#cancelAddCarBtn");
    if (addHead && addClose && addClose.parentElement !== addHead) addHead.append(addClose);
    ["view-garage-leads", "view-customers"].forEach(id => {
      const root = document.getElementById(id),
        head =
          id === "view-customers"
            ? root?.querySelector(".contactsHead")
            : root?.querySelector(":scope > .sectionHead"),
        close = root?.querySelector(".garageInlineClose");
      if (head && close && close.parentElement !== head) head.append(close);
    });
    const ws = document.querySelector("#view-accounting .accountingRefWorkspace>.accountingWorkspace"),
      head = ws?.querySelector(".accountingWorkspaceHead"),
      close = document.querySelector("#view-accounting .accountingRefWorkspace>.accountingWorkspaceClose");
    if (head && close && close.parentElement !== head) head.append(close);
  }
  placeCloseActions();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      placeCloseActions();
    });
  }).observe(document.body, { childList: true, subtree: true });
  const custom = Array.from(document.querySelectorAll("#garageTasksSection .garageUnifiedSection")).find(s =>
    s.querySelector("#garageCustomBody")
  );
  if (custom) {
    custom.classList.add("garageOtherTasksSection");
    const head = custom.querySelector(".garageUnifiedSectionHead"),
      count = head?.querySelector("b"),
      title = head?.querySelector(":scope > div"),
      plus = head?.querySelector("[data-toggle-other-task-form]");
    if (head && plus && title && count) {
      head.insertBefore(plus, count);
    }
  }
})();
