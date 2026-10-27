// Sklandumas (v62): Garažo „Variantai“, „Kontaktai“ ir „Užduotys“ atsidaro be viso puslapio perpiešimo
// (render()), todėl puslapis nešokinėja į viršų, o nuotraukos nekraunamos iš naujo. Puslapių perjungimas
// apačios juostoje – švelnus įėjimas ir slinkimas į viršų. Stilius – 173-polish-v62.css.
function smPanelToggleV62(panelId, action, expandedKey) {
  const panel = document.getElementById(panelId);
  if (!panel) return false;
  const open = !panel.classList.contains("garageInlineOpen");
  state.ui = state.ui || {};
  state.selectedView = "garage";
  state.ui.garageInlineExpanded = open ? expandedKey : "";
  state.ui.garageTaskHubOpen = false;
  state.ui.soldCarsOpen = false;
  saveState();
  panel.classList.toggle("garageInlineOpen", open);
  document
    .querySelector(`#view-garage [data-garage-action="${action}"]`)
    ?.setAttribute("aria-expanded", String(open));
  if (typeof renderUnifiedGarageTasks === "function") renderUnifiedGarageTasks();
  return open;
}
openGarageLeadsPage = function () {
  const open = smPanelToggleV62("view-garage-leads", "leads", "leads");
  if (!open) {
    const form = document.getElementById("addGarageLeadPanel");
    if (form) form.style.display = "none";
    const add = document.getElementById("showAddGarageLeadBtn");
    if (add) add.style.display = "block";
  }
};
openGarageContacts = function (forceOpen = false) {
  const panel = document.getElementById("view-customers");
  if (forceOpen && panel?.classList.contains("garageInlineOpen")) return;
  smPanelToggleV62("view-customers", "contacts", "contacts");
};
openGarageTasks = function (forceOpen) {
  state.ui = state.ui || {};
  state.ui.garageInlineExpanded = "";
  state.ui.soldCarsOpen = false;
  state.ui.garageTaskHubOpen = typeof forceOpen === "boolean" ? forceOpen : !state.ui.garageTaskHubOpen;
  state.ui.garageTaskGroups = { today: false, autos: false, custom: false };
  saveState();
  if (typeof renderUnifiedGarageTasks === "function") renderUnifiedGarageTasks();
  tkRenderV62();
};
window.__closeGarageTaskHubV1 = () => openGarageTasks(false);

// Puslapių perjungimas
window.addEventListener(
  "click",
  e => {
    const btn = e.target.closest(".navBtn[data-view]");
    if (!btn) return;
    const before = document.querySelector(".view.active")?.id;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const view = document.querySelector(".view.active");
        if (!view || view.id === before) return;
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        view.classList.remove("pgInV62");
        void view.offsetWidth;
        view.classList.add("pgInV62");
        view.addEventListener("animationend", () => view.classList.remove("pgInV62"), { once: true });
      })
    );
  },
  true
);

// Nuotraukos dekoduojamos fone – sąrašai neužstringa
new MutationObserver(list => {
  for (const m of list)
    m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      (n.tagName === "IMG" ? [n] : n.querySelectorAll?.("img") || []).forEach(img => {
        if (!img.hasAttribute("decoding")) img.decoding = "async";
      });
    });
}).observe(document.body, { childList: true, subtree: true });
