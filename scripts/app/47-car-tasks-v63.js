// Automobilio kortelės užduotys (v63): pažangos juosta, apvalūs žymėjimai, aiškūs terminai,
// neatliktos viršuje (pagal terminą), atliktos – suskleidžiamoje „Atlikta“ grupėje, nauja užduotis įvedama
// čia pat (be atskiro lango). Ta pati kortelė atidaroma iš naujo neprarandant slinkimo vietos.
// Stilius – 174-car-tasks-v63.css.
const ctDoneOpenV63 = new Set();
const CT_X_V63 =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
function ctTasksPolishV63(sheet, car) {
  const block = sheet.querySelector(".carTasksBlock");
  const list = block?.querySelector(".premiumChecklist");
  if (!block || !list) return;
  block.classList.add("ctV63");
  const items = car.checklist || [];
  const total = items.length,
    done = items.filter(i => i.done).length;
  // Pažangos juosta po antrašte
  block.querySelector(".ctBarV63")?.remove();
  if (total)
    block
      .querySelector(".carTasksSectionHead")
      ?.insertAdjacentHTML(
        "afterend",
        `<div class="ctBarV63${done === total ? " full" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${Math.round((done / total) * 100)}%"></i></div>`
      );
  const rows = [...list.querySelectorAll(":scope > .carTaskRow")];
  const pending = [],
    finished = [];
  rows.forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    const item = items.find(i => i.id === cb?.dataset.item);
    if (!item) return;
    row.classList.add("ctRowV63");
    row.querySelector(".carTaskNumber")?.remove();
    const main = row.querySelector(".carTaskMain");
    main?.querySelectorAll(":scope > .small").forEach(n => n.remove());
    let meta;
    if (item.done) {
      const when = String(item.doneDateISO || item.doneAt || "").slice(0, 10);
      const exp = Number(item.expense || 0);
      meta = `<span class="ctMetaV63 done">Atlikta${when ? " " + escapeHTML(when.slice(5).replace("-", "-")) : ""}${exp > 0 ? ` · ${moneyFmt(exp)}` : ""}</span>`;
      row.classList.add("isDone");
      finished.push(row);
    } else {
      const due = tkDueV62(item.dueDate || "");
      meta = `<span class="ctMetaV63 tkDue ${due.cls}">${escapeHTML(due.text)}</span>`;
      row.classList.add(due.cls);
      row.dataset.due = item.dueDate || "9999-99-99";
      pending.push(row);
    }
    main?.insertAdjacentHTML("beforeend", meta);
    const del = row.querySelector("[data-delete-item]");
    if (del && !del.querySelector("svg")) del.innerHTML = CT_X_V63;
  });
  pending.sort((a, b) => a.dataset.due.localeCompare(b.dataset.due));
  pending.forEach(r => list.append(r));
  list.querySelector(".ctDoneToggleV63")?.remove();
  if (finished.length) {
    const open = ctDoneOpenV63.has(car.id) || !pending.length;
    const t = document.createElement("button");
    t.type = "button";
    t.className = "ctDoneToggleV63";
    t.dataset.ctDoneToggle = car.id;
    t.setAttribute("aria-expanded", String(open));
    t.innerHTML = `<span>Atlikta</span><b>${finished.length}</b><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
    list.append(t);
    finished.forEach(r => {
      r.hidden = !open;
      list.append(r);
    });
  }
  // Nauja užduotis – čia pat
  const add = block.querySelector("#addChecklistBtn");
  if (add && car.status !== "parduotas" && !block.querySelector(".ctFormV63")) {
    add.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Nauja užduotis</span>';
    add.insertAdjacentHTML(
      "afterend",
      `<form class="ctFormV63" hidden><input class="input" id="ctNewNameV63" maxlength="160" placeholder="Pvz. Sutvarkyti saloną" autocomplete="off"><div class="ctFormRowV63"><input class="input" id="ctNewDueV63" type="date" aria-label="Terminas"><button type="submit" class="btn">Pridėti</button></div></form>`
    );
  }
  if (add && car.status === "parduotas") add.hidden = true;
}
const __openSheetV63 = openSheet;
openSheet = function () {
  const sheet = document.getElementById("sheet");
  if (sheet) delete sheet.dataset.carV63;
  return __openSheetV63.apply(this, arguments);
};
const __renderCarSheetV63 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV63(car);
  const sheet = document.getElementById("sheet");
  if (!sheet || !car) return;
  sheet.dataset.carV63 = car.id;
  ctTasksPolishV63(sheet, car);
};
// Ta pati kortelė atidaroma iš naujo (pvz. pažymėjus užduotį) – slinkimo vieta išlieka
const __openCarV63 = openCar;
openCar = function (carId) {
  const sheet = document.getElementById("sheet");
  const backdrop = document.getElementById("modalBackdrop");
  const same = sheet && sheet.dataset.carV63 === carId && backdrop?.classList.contains("show");
  const top = same ? sheet.scrollTop : 0;
  const r = __openCarV63.apply(this, arguments);
  if (same && top)
    requestAnimationFrame(() => {
      sheet.scrollTop = top;
    });
  return r;
};
document.addEventListener(
  "click",
  e => {
    const toggle = e.target.closest("#sheet [data-ct-done-toggle]");
    if (toggle) {
      const id = toggle.dataset.ctDoneToggle;
      const open = !ctDoneOpenV63.has(id);
      if (open) ctDoneOpenV63.add(id);
      else ctDoneOpenV63.delete(id);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.parentElement.querySelectorAll(".ctRowV63.isDone").forEach(r => (r.hidden = !open));
      return;
    }
    const add = e.target.closest("#sheet .carTasksBlock.ctV63 #addChecklistBtn");
    if (add) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const form = add.parentElement.querySelector(".ctFormV63");
      if (!form) return;
      form.hidden = !form.hidden;
      add.setAttribute("aria-expanded", String(!form.hidden));
      if (!form.hidden) form.querySelector("input")?.focus({ preventScroll: true });
    }
  },
  true
);
document.addEventListener(
  "submit",
  e => {
    const form = e.target.closest?.("#sheet .ctFormV63");
    if (!form) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const sheet = document.getElementById("sheet");
    const car = state.cars.find(c => c.id === sheet?.dataset.carV63);
    const name = form.querySelector("#ctNewNameV63").value.trim();
    if (!car) return;
    if (!name) {
      toast("Įrašykite užduotį", "!");
      return;
    }
    const dueDate = form.querySelector("#ctNewDueV63").value || "";
    car.checklist = Array.isArray(car.checklist) ? car.checklist : [];
    car.checklist.push({ id: "custom_" + Date.now(), name, xp: 0, coins: 0, done: false, dueDate });
    addHistory("Garažo punktas", `Pridėtas: ${name}`, "➕");
    saveState();
    const top = sheet.scrollTop;
    renderCarSheet(car);
    sheet.scrollTop = top;
    render();
    toast("Užduotis pridėta", "✓");
  },
  true
);
