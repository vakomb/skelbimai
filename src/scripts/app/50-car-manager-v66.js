// Automobilio kortelė (v66): pirmiausia rodomos naudotojo užduotys, o Vadybininko darbai šiam automobiliui
// (trūkstami duomenys, dokumentai, SDK/TA/draudimas, buhalterija…) – po mygtuku „Vadybininko užduotys“.
// Paspaudus darbą, iš apačios atsidaro tas pats sutvarkymo langas kaip Vadybininko puslapyje (openWhatItemV30),
// o jį uždarius ar išsaugojus grįžtama į tą pačią automobilio kortelę. Stilius – 177-v66.css.
let cmReturnCarV66 = "";
const cmOpenV66 = new Set();
const CM_CHEV_V66 =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
function cmItemsV66(car) {
  try {
    return workCenterItems().filter(
      it => it && it.kind === "car" && it.id === car.id && !/:task:/.test(it.key || "")
    );
  } catch (e) {
    return [];
  }
}
function cmRenderV66(sheet, car) {
  const block = sheet.querySelector(".carTasksBlock");
  if (!block) return;
  block.querySelectorAll(".carManagerSystemList").forEach(n => (n.hidden = true));
  block.querySelector(".cmBoxV66")?.remove();
  if (car.status === "parduotas" && !cmItemsV66(car).length) return;
  const items = cmItemsV66(car);
  if (!items.length) return;
  const open = cmOpenV66.has(car.id);
  const late = items.filter(i => i.late).length;
  const box = document.createElement("div");
  box.className = "cmBoxV66";
  box.innerHTML = `<button type="button" class="cmToggleV66" data-cm-toggle="${escapeHTML(car.id)}" aria-expanded="${open}" aria-label="Vadybininkas · ${items.length}">
      <span class="cmIcoV66" aria-hidden="true"><svg viewBox="0 0 48 48" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="15" r="7"/><path d="M10 39c.9-7.2 5.5-11 14-11s13.1 3.8 14 11"/></svg><b class="cmBadgeV66">${items.length}</b></span>
      <span class="cmTitleV66">Vadybininkas</span>
      <svg class="cmArrowV66" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div class="cmListV66" ${open ? "" : "hidden"}>${items
      .map(
        it => `<button type="button" class="cmRowV66 ${it.late ? "late" : ""}" data-cm-open="${escapeHTML(it.key)}">
          <i aria-hidden="true"></i>
          <span class="cmCopyV66"><strong>${escapeHTML(it.action || "Sutvarkyti")}</strong>${it.detail ? `<small>${escapeHTML(it.detail)}</small>` : ""}</span>
          <span class="cmChevV66">${CM_CHEV_V66}</span>
        </button>`
      )
      .join(
        ""
      )}<button type="button" class="cmAllV74" data-cm-all>Visos Vadybininko užduotys<span aria-hidden="true">›</span></button></div>`;
  block.append(box);
}
const __renderCarSheetV66 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV66(car);
  const sheet = document.getElementById("sheet");
  if (sheet && car) cmRenderV66(sheet, car);
};
const __openCarV66 = openCar;
openCar = function (carId) {
  if (cmReturnCarV66 === carId) cmReturnCarV66 = "";
  return __openCarV66.apply(this, arguments);
};
const __closeSheetV66 = closeSheet;
closeSheet = function () {
  const back = cmReturnCarV66;
  const r = __closeSheetV66.apply(this, arguments);
  if (back && (state.cars || []).some(c => c.id === back)) {
    cmReturnCarV66 = "";
    openCar(back);
  }
  return r;
};
document.addEventListener(
  "click",
  e => {
    const all = e.target.closest("#sheet [data-cm-all]");
    if (all) {
      e.preventDefault();
      closeSheet();
      document.querySelector('[data-garage-action="what"]')?.click();
      return;
    }
    const t = e.target.closest("#sheet [data-cm-toggle]");
    if (t) {
      e.preventDefault();
      const id = t.dataset.cmToggle;
      const open = !cmOpenV66.has(id);
      if (open) cmOpenV66.add(id);
      else cmOpenV66.delete(id);
      t.setAttribute("aria-expanded", String(open));
      const list = t.parentElement.querySelector(".cmListV66");
      if (list) list.hidden = !open;
      return;
    }
    const row = e.target.closest("#sheet [data-cm-open]");
    if (!row) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const carId = document.getElementById("sheet")?.dataset.carV63 || "";
    const item = workCenterItems().find(it => it.key === row.dataset.cmOpen);
    if (!item) return;
    if (typeof garageWhatCacheV30 !== "undefined" && !garageWhatCacheV30.some(x => x.key === item.key))
      garageWhatCacheV30 = [...garageWhatCacheV30, item];
    cmReturnCarV66 = carId;
    openWhatItemV30(item);
    // Jei veiksmas atidarė pačią kortelę – grįžimo nebereikia
    if (document.getElementById("sheet")?.dataset.carV63 === carId) cmReturnCarV66 = "";
  },
  true
);
