// Vadybininkas (v65): aiški antraštė ir suvestinė (darbai / vėluoja / šiandien). Automobilio užduotis
// paspaudus, čia pat išslenka atlikimo skydelis (kaina, čekis, „Atlikta“) – tas pats kaip automobilio kortelėje
// ir Garažo užduotyse (48-task-complete-v65.js), todėl duomenys visur sutampa.
const VD_TASK_RE_V65 = /^car:([^:]+):task:(.+)$/;
const VD_CHECK_V65 =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>';
function vdTaskOfV65(el) {
  const m = VD_TASK_RE_V65.exec(el?.dataset?.whatOpen || "");
  if (!m) return null;
  const car = (state.cars || []).find(c => c.id === m[1]);
  const item = car?.checklist?.find(i => i.id === m[2]);
  return car && item && !item.done ? { car, item } : null;
}
function vdEnhanceV65() {
  const page = document.querySelector("#garageWhatRoot .garageWhatPage");
  if (!page || page.classList.contains("mgPageV72")) return; // v72: naują puslapį piešia 56-manager-v72.js
  page.classList.add("vdV65");
  const all = [...page.querySelectorAll("[data-what-open]")];
  const items = tkItemsV62();
  const now = todayISO();
  const late = items.today.filter(i => i.due < now).length;
  page.querySelector(".vdSumV65")?.remove();
  page
    .querySelector(".garageWhatHead")
    ?.insertAdjacentHTML(
      "afterend",
      `<div class="vdSumV65"><div><b>${all.length}</b><span>Darbai</span></div><div class="${late ? "late" : ""}"><b>${late}</b><span>Vėluoja</span></div><div><b>${items.today.length}</b><span>Šiandien</span></div></div>`
    );
  all.forEach(el => {
    const t = vdTaskOfV65(el);
    if (!t) return;
    el.classList.add("vdTaskV65");
    const side = el.querySelector(".garageWhatSide, .garageWhatHeroBottom > span");
    if (side && !side.querySelector("svg")) side.innerHTML = VD_CHECK_V65;
    if (tcOpenKeyV65 === tcKeyV65(t.car.id, t.item.id)) {
      const wrap = el.closest(".garageWhatRowWrapV30, .garageWhatHeroWrapV30") || el;
      tcOpenKeyV65 = "";
      tcToggleInlineV65(wrap, t.car.id, t.item.id, { openCarLink: true });
    }
  });
}
const __renderGarageWhatAppV65 = renderGarageWhatApp;
renderGarageWhatApp = function () {
  const r = __renderGarageWhatAppV65.apply(this, arguments);
  vdEnhanceV65();
  return r;
};
document.addEventListener(
  "click",
  e => {
    const el = e.target.closest("#garageWhatRoot [data-what-open]");
    if (!el) return;
    const t = vdTaskOfV65(el);
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const wrap = el.closest(".garageWhatRowWrapV30, .garageWhatHeroWrapV30") || el;
    tcToggleInlineV65(wrap, t.car.id, t.item.id, { openCarLink: true });
  },
  true
);
