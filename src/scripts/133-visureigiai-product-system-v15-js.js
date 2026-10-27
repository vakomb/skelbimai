(function () {
  const logo = `<svg class="productRefLogo" viewBox="0 0 40 28" fill="none" aria-hidden="true"><path d="M2 24 15 9l6 7 5-6 12 14" stroke="#c19a5b" stroke-width="3.1" stroke-linecap="square" stroke-linejoin="miter"/><path d="m10 24 11-12 10 12" stroke="#c19a5b" stroke-width="2.2" opacity=".68"/></svg>`;
  const calendar = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17"/></svg>`;
  function dateLabel() {
    try {
      if (typeof homeReferenceDateV12 === "function") return homeReferenceDateV12();
    } catch (e) {}
    const d = new Date(),
      days = ["sk", "pr", "an", "tr", "kt", "pn", "št"];
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}, ${days[d.getDay()]}`;
  }
  function brandRow() {
    return `<div class="productRefBrandRow" data-product-ref-brand><div class="productRefBrand">${logo}<span>Visureigiai, UAB</span></div><div class="productRefDate">${calendar}<span>${dateLabel()}</span></div></div>`;
  }
  function ensureChrome() {
    const ids = [
      "view-finance",
      "view-menu",
      "view-customers",
      "view-settings",
      "view-garage-leads",
      "view-garage-stats",
      "view-garage-what"
    ];
    ids.forEach(id => {
      const v = document.getElementById(id);
      if (!v) return;
      if (!v.querySelector(":scope > [data-product-ref-brand]"))
        v.insertAdjacentHTML("afterbegin", brandRow());
      const d = v.querySelector(":scope > [data-product-ref-brand] .productRefDate span");
      if (d) d.textContent = dateLabel();
    });
    try {
      if (typeof homeReferenceNavV12 === "function") homeReferenceNavV12();
    } catch (e) {}
  }
  const priorRender = typeof render === "function" ? render : null;
  if (priorRender) {
    render = function () {
      const out = priorRender.apply(this, arguments);
      Promise.resolve(out).finally(() => requestAnimationFrame(ensureChrome));
      return out;
    };
  }
  document.addEventListener("click", () => requestAnimationFrame(ensureChrome), true);
  window.addEventListener("pageshow", ensureChrome);
  setTimeout(ensureChrome, 0);
})();
