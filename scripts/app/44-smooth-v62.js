// Sklandumas (v62): Garažo „Variantai“, „Kontaktai“ ir „Užduotys“ atsidaro be viso puslapio perpiešimo
// (render()), todėl puslapis nešokinėja į viršų, o nuotraukos nekraunamos iš naujo. Stilius – 173-polish-v62.css.
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
