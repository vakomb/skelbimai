(function () {
  const header = document.querySelector(".app>.topbar");
  if (!header) return;
  const mountain =
    '<svg viewBox="0 0 40 28" fill="none" aria-hidden="true"><path d="M2 24 15 9l6 7 5-6 12 14" stroke="#c19a5b" stroke-width="3.1" stroke-linecap="square" stroke-linejoin="miter"/><path d="m10 24 11-12 10 12" stroke="#c19a5b" stroke-width="2.2" opacity=".68"/></svg>';
  header.setAttribute("aria-label", "AutoEasier — Visureigiai, UAB");
  header.innerHTML =
    '<div class="autoEasierHeaderV4"><div class="autoEasierBrandCellV4"><img class="autoEasierWordmarkV4" src="@@datauri:assets/brand-logo.png@@" alt="AutoEasier"></div><span class="autoEasierDividerV4" aria-hidden="true"></span><div class="autoEasierCompanyCellV4"><span class="autoEasierCompanyMarkV4">' +
    mountain +
    '</span><span class="autoEasierCompanyNameV4">Visureigiai, UAB</span></div></div>';
})();
