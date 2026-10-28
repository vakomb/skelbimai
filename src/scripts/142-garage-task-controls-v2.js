(() => {
  // v78: viena automobilių nuotraukų lentelė vienam praėjimui (anksčiau kiekvienai užduočiai –
  // atskira visų kortelių paieška; su šimtais automobilių tai lėtino Garažą kelias sekundes)
  function imageMap() {
    const map = new Map();
    document.querySelectorAll("#activeCarGrid [data-open-car],#soldCarGrid [data-open-car]").forEach(card => {
      const id = card.dataset.openCar;
      if (!map.has(id)) map.set(id, card.querySelector("img")?.getAttribute("src") || "");
    });
    return map;
  }
  let dueCacheRaw = null,
    dueCacheCount = 0;
  function dueVariantCount() {
    try {
      const raw =
        localStorage.getItem(window.AUTOEASIER_APP_DATA?.currentStorageKey?.() || "visureigiai_uab_v1") ||
        "{}";
      if (raw === dueCacheRaw) return dueCacheCount;
      dueCacheRaw = raw;
      const s = JSON.parse(raw);
      const d = s.state || s;
      const d0 = new Date(),
        today =
          d0.getFullYear() +
          "-" +
          String(d0.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d0.getDate()).padStart(2, "0");
      dueCacheCount = (d.leadVariants || []).filter(
        v => v && v.nextCallDate && v.nextCallDate <= today
      ).length;
      return dueCacheCount;
    } catch (e) {
      return 0;
    }
  }
  function init() {
    const section = document.getElementById("garageTasksSection");
    if (!section) return;
    const head = section.querySelector(":scope > .sectionHead");
    if (head && !section.querySelector("[data-close-garage-task-hub]")) {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "garageTaskClose";
      x.dataset.closeGarageTaskHub = "";
      x.textContent = "Uždaryti";
      section.append(x);
    }
    const other = Array.from(section.querySelectorAll(".garageUnifiedSection")).find(x =>
      x.querySelector("#garageCustomBody")
    );
    const oh = other?.querySelector(".garageUnifiedSectionHead");
    if (oh && !oh.querySelector("[data-toggle-other-task-form]")) {
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "garageAddTaskToggle";
      plus.dataset.toggleOtherTaskForm = "";
      plus.setAttribute("aria-label", "Pridėti kitą užduotį");
      plus.setAttribute("aria-expanded", "false");
      plus.textContent = "+";
      oh.append(plus);
    }
    const plusControl = oh?.querySelector("[data-toggle-other-task-form]"),
      label = oh?.querySelector(".garageUnifiedSectionLabel"),
      title = label?.querySelector(".garageUnifiedSectionTitle");
    if (plusControl && label && title && plusControl.parentElement !== label) title.after(plusControl);
    const form = document.getElementById("garageTaskForm");
    if (section.dataset.controlsBound !== "1") {
      section.dataset.controlsBound = "1";
      section.addEventListener("click", e => {
        if (e.target.closest("[data-toggle-other-task-form]")) {
          const f = document.getElementById("garageTaskForm");
          if (!f) return;
          const show = !f.classList.contains("is-open");
          f.classList.toggle("is-open", show);
          section.querySelector("[data-toggle-other-task-form]")?.setAttribute("aria-expanded", String(show));
        }
        if (e.target.closest("[data-close-garage-task-hub]"))
          document.querySelector("#view-garage [data-garage-action=tasks]")?.click();
      });
    }
    const carRows = section.querySelectorAll(".garageUnifiedTask[data-company-kind=car]"),
      carCards = section.querySelectorAll("#garageAutoTasksRoot .garageCarTaskCard"),
      images = carRows.length || carCards.length ? imageMap() : new Map(),
      imageFor = id => images.get(id) || "";
    carRows.forEach(row => {
      const mark = row.querySelector(".garageUnifiedTaskMark"),
        src = imageFor(row.dataset.companyId);
      if (mark && src && !mark.querySelector("img")) {
        mark.innerHTML = "";
        const img = document.createElement("img");
        img.className = "garageUnifiedTaskPhoto";
        img.src = src;
        img.alt = "Automobilis";
        img.loading = "lazy";
        mark.append(img);
      }
    });
    carCards.forEach(card => {
      const id = card.querySelector("[data-open-car]")?.dataset.openCar,
        src = id && imageFor(id),
        h = card.querySelector(".garageCarTaskHead");
      if (src && h && !h.querySelector(".garageCarTaskThumb")) {
        const img = document.createElement("img");
        img.className = "garageCarTaskThumb";
        img.src = src;
        img.alt = "Automobilis";
        img.loading = "lazy";
        h.prepend(img);
      }
    });
    const n = dueVariantCount(),
      vb = document.querySelector("#view-garage [data-garage-action=leads]");
    if (vb) {
      let slot = vb.querySelector(".garageVariantBadgeSlot");
      if (!slot) {
        slot = document.createElement("span");
        slot.className = "garageVariantBadgeSlot";
        vb.append(slot);
      }
      const badgeHtml = n ? '<span class="garageTaskUrgentBadge">' + n + "</span>" : "";
      if (slot.innerHTML !== badgeHtml) slot.innerHTML = badgeHtml;
    }
  }
  init();
  let initQueued = false;
  const garageRoot = document.getElementById("view-garage");
  if (garageRoot)
    new MutationObserver(() => {
      if (initQueued) return;
      initQueued = true;
      requestAnimationFrame(() => {
        initQueued = false;
        init();
      });
    }).observe(garageRoot, { childList: true, subtree: true });
})();
