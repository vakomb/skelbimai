(() => {
  if (window.__autoeasierTaskCloseV1) return;
  window.__autoeasierTaskCloseV1 = true;
  document.addEventListener(
    "click",
    event => {
      const close = event.target.closest("[data-close-garage-task-hub]");
      if (!close) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const tile = document.querySelector('#view-garage [data-garage-action="tasks"]');
      if (!tile) return;
      if (typeof window.__closeGarageTaskHubV1 === "function") window.__closeGarageTaskHubV1();
      else tile.click();
      const panel = document.getElementById("garageTasksSection");
      if (panel) {
        panel.hidden = true;
        panel.classList.remove("is-open");
        panel.style.setProperty("display", "none", "important");
      }
      tile.setAttribute("aria-expanded", "false");
    },
    true
  );
})();
