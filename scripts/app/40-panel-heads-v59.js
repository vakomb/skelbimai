// Vienodos išskleidžiamų skydelių antraštės (v59): kairėje paspausto mygtuko pavadinimas, dešinėje „Uždaryti“.
// Garažo „Pridėti automobilį“ atsidaro ir užsidaro taip pat kaip kiti skydeliai (antras paspaudimas arba „Uždaryti“).
function phAddCarOpenV59() {
  const panel = document.getElementById("addCarPanel");
  return !!panel && panel.style.display !== "none" && panel.getBoundingClientRect().height > 0;
}
function phCloseAddCarV59() {
  if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
  else {
    const panel = document.getElementById("addCarPanel");
    if (panel) panel.style.display = "none";
  }
  const show = document.getElementById("showAddCarFormBtn");
  if (show) show.style.display = "block";
  state.ui = state.ui || {};
  state.ui.garageInlineExpanded = "";
  saveState();
  phNormalizeV59();
}
function phNormalizeV59() {
  // Pridėti automobilį: pavadinimas kaip mygtuko ir „Uždaryti“ dešinėje
  const addHead = document.querySelector("#addCarPanel > .sectionHead");
  if (addHead) {
    let h2 = addHead.querySelector(":scope > h2");
    if (!h2) {
      h2 = document.createElement("h2");
      addHead.prepend(h2);
    }
    if (h2.textContent !== "Pridėti automobilį") h2.textContent = "Pridėti automobilį";
    if (!addHead.querySelector("#cancelAddCarBtn")) {
      const close = document.createElement("button");
      close.type = "button";
      close.id = "cancelAddCarBtn";
      close.className = "appCloseAction";
      close.textContent = "Uždaryti";
      close.setAttribute("aria-label", "Uždaryti automobilio pridėjimą");
      addHead.append(close);
    }
  }
  const tile = document.querySelector('#view-garage [data-garage-action="addcar"]');
  if (tile) {
    const open = String(phAddCarOpenV59());
    if (tile.getAttribute("aria-expanded") !== open) tile.setAttribute("aria-expanded", open);
  }
  // Ataskaitos: laikotarpis po antrašte, antraštėje lieka pavadinimas ir „Uždaryti“
  document.querySelectorAll(".accountingWorkspaceHead > .strictPeriodBadgeV24").forEach(badge => {
    badge.classList.add("phPeriodV59");
    badge.parentElement.after(badge);
  });
  // Garažo kontaktai: antraštėje „Kontaktai“ ir „Uždaryti“, „Pridėti kontaktą“ – po antrašte
  const gc = document.getElementById("view-customers");
  const head = gc?.querySelector(".contactsHead");
  if (head) {
    if (!head.querySelector(":scope > h2")) {
      const h2 = document.createElement("h2");
      h2.textContent = "Kontaktai";
      head.prepend(h2);
    }
    const acts = head.querySelector(":scope > .contactsHeadActions");
    if (acts) {
      acts.classList.add("phActionsV59");
      head.after(acts);
    }
    const close = gc.querySelector(".garageInlineClose");
    if (close && (close.parentElement !== head || head.lastElementChild !== close)) head.append(close);
  }
}
window.addEventListener(
  "click",
  e => {
    if (e.target.closest("#cancelAddCarBtn")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      phCloseAddCarV59();
      return;
    }
    if (e.target.closest('#view-garage [data-garage-action="addcar"]') && phAddCarOpenV59()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      phCloseAddCarV59();
    }
  },
  true
);
{
  let phQueuedV59 = false;
  new MutationObserver(() => {
    if (phQueuedV59) return;
    phQueuedV59 = true;
    requestAnimationFrame(() => {
      phQueuedV59 = false;
      phNormalizeV59();
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  phNormalizeV59();
}
