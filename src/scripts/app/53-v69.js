// v69: automobilio kortelė – kainos (Pirkimo kaina / Išlaidos / Savikaina), dokumentų rodomas pirmas, kiti –
// „Rodyti visus“; Buhalterija – „Laukia pateikimo“ sugrupuota pagal automobilį. Stilius – 178-v69.css.
const dcOpenV69 = new Set();
function dcCollapseV69(sheet, car) {
  const list = sheet.querySelector("#carDetailDocuments .vehicleDocList");
  if (!list) return;
  const rows = [...list.querySelectorAll(":scope > .vehicleDocRow")];
  list.parentElement.querySelector(".dcMoreV69")?.remove();
  const open = dcOpenV69.has(car.id);
  rows.forEach((r, i) => r.classList.toggle("dcHiddenV69", i > 0 && !open));
  if (rows.length > 1)
    list.insertAdjacentHTML(
      "afterend",
      `<button type="button" class="dcMoreV69" data-dc-toggle="${escapeHTML(car.id)}" aria-expanded="${open}"><span>${
        open ? "Rodyti mažiau" : `Rodyti visus (${rows.length})`
      }</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`
    );
}
function mnCostsV69(sheet, car) {
  const grid = sheet.querySelector(".carBottomCostGrid");
  if (!grid || grid.querySelector(".mnExpV69")) return;
  const stats = grid.querySelectorAll(":scope > .premiumStat");
  if (stats.length !== 2) return;
  const expenses = Math.max(0, Number(carTotalCost(car) || 0) - Number(car.buyPrice || 0));
  stats[0].insertAdjacentHTML(
    "afterend",
    `<div class="premiumStat mnExpV69"><span>Išlaidos</span><strong>${moneyFmt(expenses)}</strong></div>`
  );
  grid.classList.add("mnThreeV69");
}
const __renderCarSheetV69 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV69(car);
  const sheet = document.getElementById("sheet");
  if (!sheet || !car) return;
  mnCostsV69(sheet, car);
  dcCollapseV69(sheet, car);
};
document.addEventListener(
  "click",
  e => {
    const t = e.target.closest("#sheet [data-dc-toggle]");
    if (t) {
      const id = t.dataset.dcToggle;
      if (dcOpenV69.has(id)) dcOpenV69.delete(id);
      else dcOpenV69.add(id);
      const car = (state.cars || []).find(c => c.id === id);
      if (car) dcCollapseV69(document.getElementById("sheet"), car);
      return;
    }
    const g = e.target.closest("#accountingRoot [data-aw-more]");
    if (g) {
      awOpenAllV69 = !awOpenAllV69;
      awGroupV69();
    }
  },
  true
);

// ---------- Buhalterija: „Laukia pateikimo“ pagal automobilį ----------
let awOpenAllV69 = false;
const AW_GROUP_LIMIT_V69 = 3;
function awCarOfV69(key) {
  const m = /^car:([^:]+):/.exec(key || "");
  if (m) return m[1];
  const t = /^tx:(.+)$/.exec(key || "");
  if (t) return (state.finances?.transactions || []).find(x => x.id === t[1])?.carId || "";
  return "";
}
function awGroupV69() {
  const list = document.querySelector("#accountingRoot .accountingRefWaitList");
  if (!list) return;
  const rows = [...list.querySelectorAll(".accountingRequiredRowV1")];
  if (!rows.length) return;
  const groups = new Map();
  rows.forEach(r => {
    const id = awCarOfV69(r.dataset.accountingRequiredDoc);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(r);
    // Eilutė: be nuotraukos, antraštė + trumpa detalė, dešinėje „Pridėti“
    if (!r.dataset.awV69) {
      r.dataset.awV69 = "1";
      const st = r.querySelector(".accountingRefWaitStatus");
      if (st) {
        const parts = st.textContent.split(" · ");
        st.textContent = parts.length > 1 ? parts.slice(1).join(" · ") : st.textContent;
        if (/^Automobilio dokumentai$/.test(st.textContent)) st.textContent = "Automobilio dokumentas";
      }
      const arrow = r.querySelector(".accountingRefWaitArrow");
      if (arrow) arrow.textContent = "Pridėti";
    }
  });
  const ordered = [...groups.entries()].sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1));
  const frag = document.createDocumentFragment();
  ordered.forEach(([carId, items], gi) => {
    const car = (state.cars || []).find(c => c.id === carId);
    const raw = car?.imageSrc || (car?.photos || [])[0] || "";
    const media = raw ? photoUrlCache[raw] || (/^(data:|blob:|https?:)/.test(raw) ? raw : "") : "";
    const sec = document.createElement("section");
    sec.className = "awGroupV69" + (!awOpenAllV69 && gi >= AW_GROUP_LIMIT_V69 ? " awHiddenV69" : "");
    sec.innerHTML = `<header class="awHeadV69"><span class="awThumbV69">${
      media
        ? `<img src="${escapeHTML(media)}" alt="">`
        : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${car ? '<path d="M5 16H3.5a.5.5 0 0 1-.5-.5V13l2-5.2A1.5 1.5 0 0 1 6.4 7h11.2a1.5 1.5 0 0 1 1.4.8L21 13v2.5a.5.5 0 0 1-.5.5H19"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/>' : '<path d="M4 21V5a2 2 0 0 1 2-2h8l6 6v12z"/><path d="M14 3v6h6"/>'}</svg>`
    }</span><span class="awTitleV69"><strong>${escapeHTML(car ? car.name || "Automobilis" : "Įmonė")}</strong>${
      car?.plate ? lcPlateHTMLV61(car.plate) : ""
    }</span><b>${items.length}</b></header><div class="awRowsV69"></div>`;
    if (!media && raw) {
      const thumb = sec.querySelector(".awThumbV69");
      phUrlV67(raw).then(url => {
        if (url && thumb.isConnected) thumb.innerHTML = `<img src="${escapeHTML(url)}" alt="">`;
      });
    }
    const box = sec.querySelector(".awRowsV69");
    items.forEach(r => box.append(r));
    frag.append(sec);
  });
  list.querySelectorAll(".awGroupV69, .awMoreV69").forEach(n => n.remove());
  list.prepend(frag);
  list.classList.add("awListV69");
  if (ordered.length > AW_GROUP_LIMIT_V69)
    list.insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="awMoreV69" data-aw-more aria-expanded="${awOpenAllV69}"><span>${
        awOpenAllV69 ? "Rodyti mažiau" : `Rodyti visus (${ordered.length})`
      }</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`
    );
}
const __renderAccountingCenterV69 = renderAccountingCenter;
renderAccountingCenter = function () {
  const r = __renderAccountingCenterV69.apply(this, arguments);
  awGroupV69();
  return r;
};
