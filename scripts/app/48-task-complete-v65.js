// Automobilio užduoties atlikimas (v65) – vienas skydelis visur (automobilio kortelė, Garažo užduotys,
// Vadybininkas): „Kaina, €“ + „Prisegti čekį“ + „Atlikta“. Įvedus kainą ir prisegus čekį, užduotis
// pažymima atlikta automatiškai; be kainos – paspaudus „Atlikta“. Išlaida su čekiu patenka į Buhalteriją
// (completeCarTaskWithExpenseV24), visi sąrašai atnaujinami iš tų pačių duomenų. Stilius – 176-v65.css.
let tcOpenKeyV65 = "";
function tcKeyV65(carId, itemId) {
  return `${carId}:${itemId}`;
}
function tcPanelHTMLV65(carId, itemId, { openCarLink = false } = {}) {
  const car = (state.cars || []).find(c => c.id === carId);
  const item = car?.checklist?.find(i => i.id === itemId);
  if (!car || !item || item.done) return "";
  const k = escapeHTML(tcKeyV65(carId, itemId));
  return `<div class="tcPanelV65" data-tc-car="${escapeHTML(carId)}" data-tc-item="${escapeHTML(itemId)}">
    <div class="tcFieldsV65">
      <label class="tcAmountV65"><span>Kaina</span><input type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" data-tc-amount aria-label="Kaina, €"><em>€</em></label>
      <label class="tcFileV65"><input type="file" accept="image/*,application/pdf" multiple data-tc-file><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10.2 17.7a1.7 1.7 0 0 1-2.4-2.4L15.5 7.6"/></svg><span data-tc-file-label>Prisegti čekį</span></label>
    </div>
    <p class="tcHintV65" data-tc-hint>Įvedus kainą ir prisegus čekį – atlikta automatiškai</p>
    <div class="tcActionsV65">
      ${openCarLink ? `<button type="button" class="tcLinkV65" data-tc-open-car="${escapeHTML(carId)}">Atidaryti kortelę</button>` : `<button type="button" class="tcLinkV65" data-tc-cancel="${k}">Atšaukti</button>`}
      <button type="button" class="tcDoneV65" data-tc-done>Atlikta</button>
    </div>
  </div>`;
}
function tcRefreshV65(carId) {
  const sheet = document.getElementById("sheet");
  const car = (state.cars || []).find(c => c.id === carId);
  const backdrop = document.getElementById("modalBackdrop");
  if (car && sheet?.dataset.carV63 === carId && backdrop?.classList.contains("show")) {
    const top = sheet.scrollTop;
    renderCarSheet(car);
    sheet.scrollTop = top;
  }
  render();
}
async function tcCompleteV65(panel) {
  if (!panel || panel.dataset.busy) return;
  const car = (state.cars || []).find(c => c.id === panel.dataset.tcCar);
  const item = car?.checklist?.find(i => i.id === panel.dataset.tcItem);
  if (!car || !item || item.done) return;
  const amount = Math.max(0, Number(panel.querySelector("[data-tc-amount]")?.value || 0));
  const fileInput = panel.querySelector("[data-tc-file]");
  const hasFile = !!fileInput?.files?.length;
  if (amount > 0 && !hasFile) {
    const hint = panel.querySelector("[data-tc-hint]");
    if (hint) {
      hint.textContent = "Išlaidai reikia čekio – prisekite jį";
      hint.classList.add("warn");
    }
    fileInput?.click();
    return;
  }
  panel.dataset.busy = "1";
  const done = panel.querySelector("[data-tc-done]");
  if (done) done.textContent = "Saugoma…";
  let attachments = [];
  try {
    if (hasFile) attachments = await accountingReadAttachmentsV8(fileInput, "receipt");
    // v74: po laukimo automobilį ir užduotį imame iš naujo (state galėjo būti atnaujintas iš debesies)
    const liveCar = (state.cars || []).find(c => c.id === car.id);
    const liveItem = liveCar?.checklist?.find(i => i.id === item.id);
    if (!liveCar || !liveItem || liveItem.done) {
      throw new Error("Įrašas pasikeitė kitame įrenginyje – atidarykite iš naujo");
    }
    await completeCarTaskWithExpenseV24(liveCar, liveItem, amount, attachments);
    saveState();
    tcOpenKeyV65 = "";
    tkExpenseOpenV62 = "";
    panel.classList.add("isDone");
    await new Promise(r => setTimeout(r, 220));
    tcRefreshV65(car.id);
    toast(amount > 0 ? `Atlikta · ${moneyFmt(amount)} į Buhalteriją` : "Užduotis atlikta", "✓");
  } catch (e) {
    await Promise.all(attachments.map(a => photoDelete(a.key).catch(() => {})));
    delete panel.dataset.busy;
    if (done) done.textContent = "Atlikta";
    toast(e?.message || "Nepavyko išsaugoti", "!");
  }
}
// Įvykiai
document.addEventListener(
  "change",
  e => {
    const panel = e.target.closest?.(".tcPanelV65");
    if (!panel) return;
    if (e.target.matches("[data-tc-file]")) {
      const n = e.target.files?.length || 0;
      const label = panel.querySelector("[data-tc-file-label]");
      if (label) label.textContent = n ? (n === 1 ? e.target.files[0].name : `${n} failai`) : "Prisegti čekį";
      panel.classList.toggle("hasFile", !!n);
      const amount = Number(panel.querySelector("[data-tc-amount]")?.value || 0);
      if (n && amount > 0) tcCompleteV65(panel);
      else if (n) panel.querySelector("[data-tc-amount]")?.focus({ preventScroll: true });
    }
    if (e.target.matches("[data-tc-amount]")) {
      const amount = Number(e.target.value || 0);
      if (amount > 0 && panel.querySelector("[data-tc-file]")?.files?.length) tcCompleteV65(panel);
    }
  },
  true
);
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Enter" && e.target.matches?.(".tcPanelV65 [data-tc-amount]")) {
      e.preventDefault();
      tcCompleteV65(e.target.closest(".tcPanelV65"));
    }
  },
  true
);
document.addEventListener(
  "click",
  e => {
    const panel = e.target.closest(".tcPanelV65");
    if (!panel) return;
    if (e.target.closest("[data-tc-done]")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      tcCompleteV65(panel);
      return;
    }
    const open = e.target.closest("[data-tc-open-car]");
    if (open) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openCar(open.dataset.tcOpenCar);
      return;
    }
    if (e.target.closest("[data-tc-cancel]")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      tcOpenKeyV65 = "";
      tcToggleInlineV65(null);
      return;
    }
    // Kiti paspaudimai skydelyje neturi atidaryti kortelės ar pažymėti eilutės
    e.stopPropagation();
  },
  true
);
// Skydelio įterpimas po bet kurios eilutės (automobilio kortelė, Vadybininkas)
function tcToggleInlineV65(anchor, carId, itemId, opts) {
  document.querySelectorAll(".tcPanelV65.inlineV65").forEach(p => p.remove());
  document.querySelectorAll(".tcOpenV65").forEach(n => n.classList.remove("tcOpenV65"));
  if (!anchor) return;
  const key = tcKeyV65(carId, itemId);
  if (tcOpenKeyV65 === key && anchor.dataset.tcWasOpen === "1") {
    tcOpenKeyV65 = "";
    anchor.dataset.tcWasOpen = "";
    return;
  }
  const html = tcPanelHTMLV65(carId, itemId, opts);
  if (!html) return;
  tcOpenKeyV65 = key;
  document.querySelectorAll("[data-tc-was-open]").forEach(n => (n.dataset.tcWasOpen = ""));
  anchor.dataset.tcWasOpen = "1";
  anchor.classList.add("tcOpenV65");
  anchor.insertAdjacentHTML("afterend", html);
  const panel = anchor.nextElementSibling;
  panel.classList.add("inlineV65");
  panel.querySelector("[data-tc-amount]")?.focus({ preventScroll: true });
}
// Automobilio kortelė: varnelė ar eilutė atidaro skydelį (nebeperjungiama iš karto)
document.addEventListener(
  "click",
  e => {
    const row = e.target.closest("#sheet .carTasksBlock.ctV63 .ctRowV63:not(.isDone)");
    if (!row || e.target.closest(".carTaskActions")) return;
    const cb = row.querySelector('input[type="checkbox"]');
    if (!cb || cb.disabled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    tcToggleInlineV65(row, cb.dataset.car, cb.dataset.item, {});
  },
  true
);
