(() => {
  const form = document.getElementById("garageTaskForm");
  if (form) {
    form.classList.remove("is-open");
    form.querySelectorAll("[data-close-other-task-form]").forEach(button => button.remove());
    if (!form.querySelector(".garageCreateTaskHead")) {
      const head = document.createElement("div");
      head.className = "garageCreateTaskHead";
      head.innerHTML = "<strong>Pridėti kitą užduotį</strong>";
      form.prepend(head);
    }
  }
  const place = () => {
    const items = [
      ["#garageTasksSection", "[data-close-garage-task-hub]", " :scope > .sectionHead"],
      ["#addCarPanel", "#cancelAddCarBtn", " :scope > .sectionHead"],
      ["#view-garage-leads", ".garageInlineClose", " :scope > .sectionHead"],
      ["#view-customers", ".garageInlineClose", " .contactsHead"],
      [
        "#view-accounting .accountingRefWorkspace>.accountingWorkspace",
        ".accountingWorkspaceClose",
        " .accountingWorkspaceHead"
      ]
    ];
    for (const [rootSelector, closeSelector, headSuffix] of items) {
      const root = document.querySelector(rootSelector);
      if (!root) continue;
      const close = root.querySelector(closeSelector);
      const head = root.querySelector(headSuffix.trim());
      if (close && head && close.parentElement !== head) head.append(close);
    }
  };
  const placeAccounting = () => {
    const ws = document.querySelector("#view-accounting .accountingRefWorkspace>.accountingWorkspace"),
      head = ws?.querySelector(".accountingWorkspaceHead"),
      close = document.querySelector("#view-accounting .accountingRefWorkspace>.accountingWorkspaceClose");
    if (head && close && close.parentElement !== head) head.append(close);
  };
  place();
  placeAccounting();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      place();
      placeAccounting();
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
