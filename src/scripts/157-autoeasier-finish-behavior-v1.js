(() => {
  const getCount = () => {
    try {
      return Math.max(0, Number(window.__autoEasierWorkCountV1?.()) || 0);
    } catch (e) {
      return 0;
    }
  };
  function syncManagerBadges() {
    const count = getCount();
    document.querySelectorAll(".garageRefWhatIcon").forEach(icon => {
      let badge = icon.querySelector(".managerTaskBadgeV1");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "managerTaskBadgeV1";
        badge.setAttribute("aria-hidden", "true");
        icon.appendChild(badge);
      }
      const label = count > 99 ? "99+" : String(count);
      if (badge.textContent !== label) badge.textContent = label;
      badge.hidden = count === 0;
      const button = icon.closest(".garageRefWhat");
      if (button) {
        const aria = count
          ? "Atidaryti vadybininką · " + count + " paruoštų veiksmų"
          : "Atidaryti vadybininką";
        if (button.getAttribute("aria-label") !== aria) button.setAttribute("aria-label", aria);
        button.title = count ? count + " paruošti veiksmai" : "";
      }
    });
  }
  const scheduleBadges = (() => {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        syncManagerBadges();
      });
    };
  })();
  scheduleBadges();
  if (document.body)
    new MutationObserver(scheduleBadges).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("autoeasier:local-save", scheduleBadges);
  window.addEventListener("pageshow", scheduleBadges);
  function placePpClose() {
    const root = document.getElementById("accountingRoot");
    if (!root) return;
    const close = root.querySelector("[data-accounting-close]");
    if (!close) return;
    const wrap = close.closest(".accountingRefWorkspace");
    if (!wrap) return;
    const workspace = wrap.querySelector(":scope > .accountingWorkspace");
    if (!workspace) return;
    let target = null;
    if (workspace.querySelector("#ppGeneratorCard")) target = workspace.querySelector(".ppGeneratorHead");
    else if (workspace.classList.contains("accountingSourceChooser"))
      target = workspace.querySelector(".accountingSourceTitle");
    if (!target) return;
    if (close.parentElement !== target) target.appendChild(close);
    close.classList.add("accountingPpTopCloseV1");
  }
  const accounting = document.getElementById("accountingRoot");
  if (accounting) {
    placePpClose();
    new MutationObserver(() => requestAnimationFrame(placePpClose)).observe(accounting, {
      childList: true,
      subtree: true
    });
  }
})();
