// Automobiliai: pardavimo langas, pridėjimas, kortelė (renderCarSheet), užduočių sąrašas, sellCar.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function openSaleModal(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car || car.status === "parduotas") return;
  closeSaleModal();
  const modal = document.createElement("div");
  modal.id = "saleModal";
  modal.className = "saleModal";
  modal.innerHTML = `\n      <div class="saleModalCard" role="dialog" aria-modal="true" aria-labelledby="saleModalTitle">\n        <div class="saleModalHead">\n          <div>\n            <span class="saleModalEyebrow">AUTOMOBILIO PARDAVIMAS</span>\n            <h3 id="saleModalTitle">Parduoti automobilį?</h3>\n          </div>\n          <button type="button" class="closeBtn saleModalClose" aria-label="Uždaryti">✕</button>\n        </div>\n        <div class="saleModalCarName">${escapeHTML(car.name || "Automobilis")}</div>\n        <div class="field salePriceField">\n          <label for="saleModalPrice">Pardavimo suma</label>\n          <input class="input" id="saleModalPrice" type="number" min="0.01" step="1" inputmode="decimal" placeholder="Įvesk sumą">\n        </div>\n        <button type="button" class="btn premiumPrimaryBtn saleModalConfirm" id="saleModalConfirm" disabled>Parduoti</button>\n      </div>\n    `;
  document.body.appendChild(modal);
  const input = modal.querySelector("#saleModalPrice");
  const confirm = modal.querySelector("#saleModalConfirm");
  const sync = () => {
    const value = Number(input.value || 0);
    confirm.disabled = !(Number.isFinite(value) && value > 0);
  };
  input.addEventListener("input", sync);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !confirm.disabled) {
      e.preventDefault();
      confirm.click();
    }
  });
  modal.querySelector(".saleModalClose").onclick = closeSaleModal;
  modal.addEventListener("click", e => {
    if (e.target === modal) closeSaleModal();
  });
  confirm.onclick = () => {
    const value = Number(input.value || 0);
    if (!(Number.isFinite(value) && value > 0)) return;
    closeSaleModal();
    sellCar(car.id, value);
  };
  setTimeout(() => input.focus(), 80);
}
function deleteCar(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;
  const ok = window.confirm(`Ištrinti automobilį „${car.name}“ visam laikui?`);
  if (!ok) return;
  const carCost = carTotalCost(car);
  if (car.status === "parduotas") {
    const net = carNetProfit(car);
    state.finances.monthlyRevenue = Math.max(0, state.finances.monthlyRevenue - Number(car.soldPrice || 0));
    state.finances.monthlyExpenses = Math.max(0, state.finances.monthlyExpenses - carCost);
    state.finances.monthlyNetProfit -= net;
    state.finances.lifetimeNetProfit -= net;
    state.stats.carsSold = Math.max(0, state.stats.carsSold - 1);
    ensureFinanceCollections();
    state.finances.budgetBalance -= Number(car.soldPrice || 0);
    state.finances.budgetBalance += carCost;
  } else {
    ensureFinanceCollections();
    state.finances.budgetBalance += carCost;
  }
  state.cars = state.cars.filter(c => c.id !== carId);
  addHistory("Garažas", `Ištrintas automobilis: ${car.name}`, "🗑️");
  toast("Automobilis ištrintas", "🗑️");
  saveState();
  render();
}
function completeCarChecklistItem(carId, itemId, expenseValue = 0) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;
  const item = car.checklist.find(i => i.id === itemId);
  if (!item || item.done) return;
  item.done = true;
  item.expense = Math.max(0, Number(expenseValue) || 0);
  ensureFinanceCollections();
  state.finances.budgetBalance -= item.expense;
  item.doneAt = nowLabel();
  if (car.checklist.every(i => i.done)) {
    car.status = "paruoštas";
    toast("Auto paruoštas pardavimui!", "🏁");
  } else if (car.checklist.filter(i => i.done).length >= Math.ceil(car.checklist.length / 2)) {
    car.status = "beveik paruoštas";
  }
  state.stats.tasksCompleted += 1;
  logTaskCompletion(item.name, "garageCarTask");
  addHistory("Automobilio darbas atliktas", `${car.name} • ${item.name} • ${moneyFmt(item.expense)}`, "✓");
  render();
  saveState();
}
function deleteChecklistItem(carId, itemId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;
  const item = car.checklist.find(i => i.id === itemId);
  if (!item) return;
  const ok = window.confirm(`Ištrinti užduotį „${item.name}“?`);
  if (!ok) return;
  car.checklist = car.checklist.filter(i => i.id !== itemId);
  addHistory("Garažo užduotis", `Ištrinta: ${item.name}`, "🗑️");
  saveState();
  render();
  openCar(carId);
}
function migrateGarageChecklists() {
  (state.cars || []).forEach(car =>
    (car.checklist || []).forEach(item => {
      if (typeof item.dueDate !== "string") item.dueDate = "";
    })
  );
  const ids = ["wash", "photo", "ads", "fix"];
  let changed = false;
  (state.cars || []).forEach(car => {
    if (
      Array.isArray(car.checklist) &&
      car.checklist.length === 4 &&
      car.checklist.every((x, i) => x && x.id === ids[i] && !x.done && !Number(x.expense || 0))
    ) {
      car.checklist = [];
      changed = true;
    }
  });
  if (changed) saveState();
}
function addCar(name, imageSrc, buyPrice) {
  const car = {
    id: uid(),
    name,
    imageSrc,
    photos: imageSrc ? [imageSrc] : [],
    notes: "",
    buyPrice: Number(buyPrice) || 0,
    soldPrice: null,
    netProfit: 0,
    soldAt: null,
    soldDateISO: null,
    createdDateISO: todayISO(),
    createdAt: nowLabel(),
    status: "aktyvus",
    checklist: []
  };
  state.cars.unshift(car);
  ensureFinanceCollections();
  state.finances.budgetBalance -= Number(buyPrice) || 0;
  addHistory("Automobilis nupirktas", `${name} • pirkimo kaina ${moneyFmt(Number(buyPrice) || 0)}`, "🚗", {
    kind: "car",
    id: car.id,
    label: "Atidaryti automobilį"
  });
  toast("Automobilis pridėtas", "🚗");
  saveState();
  render();
}
function openCar(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;
  renderCarSheet(car);
  document.getElementById("modalBackdrop").classList.add("show");
}
function renderCarSheet(car) {
  const doneCount = carDoneCount(car);
  const currentCost = carTotalCost(car);
  const isSold = car.status === "parduotas";
  const soldPrice = Number(car.soldPrice || 0);
  const netProfit = isSold ? carNetProfit(car) : 0;
  const html = `\n      <div class="sheetHead premiumSheetHead">\n        <div class="premiumSheetTitle">\n          <h3>${escapeHTML(car.name)}</h3>\n        </div>\n        <button class="closeBtn premiumClose" id="closeSheet" type="button" aria-label="Uždaryti">✕</button>\n      </div>\n\n      <div class="premiumDetail">\n        <button type="button" class="premiumHero" data-managed-photo-kind="car" data-managed-photo-index="0">\n          ${(car.photos || [])[0] || car.imageSrc ? `<img src="${photoUrlCache[(car.photos || [])[0]] || (car.photos || [])[0] || car.imageSrc || ""}" alt="${escapeHTML(car.name)}">` : `<div class="premiumHeroEmpty">🚗<span>Nuotraukų nėra</span></div>`}\n          <div class="premiumHeroShade"></div>\n        </button>\n\n        <div class="premiumDetailBody">\n\n          <section class="carTasksBlock">\n            <div class="premiumSectionHead carTasksSectionHead">\n              <div class="carTasksSectionTitle"><h4>Vadybininkas</h4></div>\n            </div>\n            <div class="premiumChecklist" id="carChecklist"></div>\n            <button class="btn carTasksAddWide" id="addChecklistBtn" type="button">＋ Užduotis</button>\n          </section>\n\n          ${isSold ? `\n            <div class="premiumResult">\n              <span class="premiumEyebrow">PARDAVIMO REZULTATAS</span>\n              <div class="premiumResultGrid">\n                <div><span>Savikaina</span><strong>${moneyFmt(currentCost)}</strong></div>\n                <div><span>Parduota</span><strong>${moneyFmt(soldPrice)}</strong></div>\n                <div><span>Marža</span><strong class="${netProfit >= 0 ? "positiveText" : "negativeText"}">${netProfit >= 0 ? "+" : ""}${moneyFmt(netProfit)}</strong></div>\n              </div>\n            </div>\n          ` : `\n          `}\n\n          <div class="premiumMedia carMediaSection">\n            <div class="premiumSectionHead">\n              <div><span class="premiumEyebrow">MEDIJA</span><h4>Nuotraukos</h4></div>\n              <span class="premiumCount">${(car.photos || []).length}</span>\n            </div>\n\n            <label class="premiumUpload">\n              <span class="premiumUploadIcon">＋</span>\n              <span><strong>Pridėti nuotraukų</strong></span>\n              <input id="carAddPhotos" type="file" accept="image/*" multiple>\n            </label>\n\n            <div class="premiumThumbGrid carPhotoGrid">\n              ${(car.photos || []).map((ref, i) => `\n                <div class="premiumThumb">\n                  <button type="button" data-managed-photo-kind="car" data-managed-photo-index="${i}">\n                    <img src="${photoUrlCache[ref] || ""}" alt="Nuotrauka ${i + 1}">\n                  </button>\n                </div>`).join("") || `<div class="premiumEmptyMedia carPhotosEmpty">📷<span>Nuotraukų nėra</span></div>`}\n            </div>\n\n            <div class="premiumMediaActions">\n              <button class="btn secondary" type="button" id="downloadCarPhotos">⬇️ Atsisiųsti visas</button>\n            </div>\n          </div>\n\n          <div class="premiumStatGrid carBottomCostGrid">\n            <div class="premiumStat"><span>Pirkimo kaina</span><strong>${moneyFmt(car.buyPrice)}</strong></div>\n            <div class="premiumStat"><span>Savikaina</span><strong>${moneyFmt(currentCost)}</strong></div>\n          </div>\n\n          <div class="carBottomActions">\n            ${!isSold ? `\n            <div class="carSellBottom">\n              <button class="btn secondary carSellBottomBtn" id="sellCarBtn" type="button" data-open-sell="${car.id}">Parduoti automobilį</button>\n            </div>\n            ` : ""}\n            <button class="btn secondary carPpBottomBtn" type="button" data-pp-car="${car.id}">🧾 Generuoti PP sutartį</button>\n            <button class="btn carEditInfoBottomBtn" id="editCarInfoBtn" type="button">✏️ Redaguoti informaciją</button>\n            <button class="carDeleteReal carDeleteBottomBtn" id="deleteCarBtn" type="button" data-delete-car="${car.id}">🗑️ Ištrinti automobilį</button>\n          </div>\n\n        </div>\n      </div>\n    `;
  window.__openCarId = car.id;
  openSheet(html);
  const close = document.getElementById("closeSheet");
  if (close)
    close.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      closeSheet();
    };
  renderCarChecklist(car.id);
  const addBtn = document.getElementById("addChecklistBtn");
  if (addBtn)
    addBtn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      openAddChecklistForm(car.id);
    };
  const deleteBtn = document.getElementById("deleteCarBtn");
  if (deleteBtn)
    deleteBtn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      deleteCar(car.id);
    };
  const sellBtn = document.getElementById("sellCarBtn");
  if (sellBtn)
    sellBtn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      openSaleModal(car.id);
    };
  const download = document.getElementById("downloadCarPhotos");
  if (download)
    download.onclick = async e => {
      e.preventDefault();
      e.stopPropagation();
      await downloadAllEntityPhotos("car", car.id);
    };
  const edit = document.getElementById("editCarInfoBtn");
  if (edit)
    edit.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      openCarEditSheet(car.id);
    };
  document.querySelectorAll("#sheet [data-managed-photo-kind]").forEach(img => {
    img.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      openManagedPhotoGallery(
        img.dataset.managedPhotoKind,
        car.id,
        Number(img.dataset.managedPhotoIndex || 0)
      );
    };
  });
  const carAddPhotos = document.getElementById("carAddPhotos");
  if (carAddPhotos)
    carAddPhotos.onchange = async () => {
      const files = Array.from(carAddPhotos.files || []).filter(f => /^image\//i.test(f.type));
      const added = [];
      for (const file of files) {
        try {
          const key = await storeImageFile(file);
          if (key) {
            added.push(key);
            await photoGet(key);
          }
        } catch (err) {
          console.warn(err);
        }
      }
      if (added.length) {
        car.photos = [...(car.photos || []), ...added];
        car.imageSrc = car.photos[0] || "";
        saveState();
        render();
        openCar(car.id);
        toast(`Pridėta ${added.length} nuotraukų`, "🖼️");
      }
    };
}
function openCarEditSheet(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;
  const refs = Array.isArray(car.photos) ? car.photos : [];
  openSheet(
    `\n      <div class="sheetHead carSheetHead">\n        <div class="carSheetHeading"><span class="carSheetEyebrow">AUTOMOBILIO INFORMACIJA</span><h3>Redaguoti automobilį</h3></div>\n        <button class="closeBtn" id="closeCarEdit" aria-label="Uždaryti">✕</button>\n      </div>\n      <div class="carEditPanel">\n        <div class="carEditSection">\n          <span class="carSectionEyebrow">Pagrindinė informacija</span>\n          <div class="field"><label for="editCarName">Pavadinimas</label><input class="input" id="editCarName" value="${escapeHTML(car.name || "")}" autocomplete="off"></div>\n          <div class="grid2">\n            <div class="field"><label for="editCarBuyPrice">Pirkimo kaina</label><input class="input" id="editCarBuyPrice" type="number" min="0" inputmode="decimal" value="${Number(car.buyPrice || 0)}"></div>\n            ${car.status === "parduotas" ? `<div class="field"><label for="editCarSoldPrice">Pardavimo kaina</label><input class="input" id="editCarSoldPrice" type="number" min="0" inputmode="decimal" value="${Number(car.soldPrice || 0)}"></div>` : `<div class="field"><label>Statusas</label><div class="carReadonlyStatus">${car.status === "paruoštas" ? "Paruoštas" : "Aktyvus"}</div></div>`}\n          </div>\n          <div class="field"><label>Pastabos</label><textarea class="input" id="editCarNotes" rows="4" placeholder="Papildoma informacija apie automobilį...">${escapeHTML(car.notes || "")}</textarea></div>\n        </div>\n\n        <div class="carEditSection">\n          <div class="carSectionTitle"><div><span class="carSectionEyebrow">Nuotraukos</span><h4>Galerija</h4></div><span class="photoCountBadge">${refs.length}</span></div>\n          <label class="carPhotoAddBtn editPhotoAdd">\n            <span>＋</span><span><strong>Pridėti nuotraukų</strong></span>\n            <input id="editCarPhotos" type="file" accept="image/*" multiple>\n          </label>\n          <div class="photoManageGrid carPhotoGrid">\n            ${refs.map((ref, i) => `\n              <div class="photoManageItem carPhotoItem">\n                <button type="button" class="carPhotoPreviewBtn" data-managed-photo-kind="car" data-managed-photo-index="${i}"><img src="${photoUrlCache[ref] || ""}" alt="Nuotrauka ${i + 1}"></button>\n                <button type="button" class="photoX" data-edit-car-photo="${i}" aria-label="Ištrinti nuotrauką">×</button>\n              </div>`).join("") || '<div class="photoManageEmpty carPhotoEmpty" style="grid-column:1/-1">📷<strong>Nuotraukų nėra</strong><span>Pridėk nuotraukų.</span></div>'}\n          </div>\n        </div>\n\n        <div class="carEditActions">\n          <button class="btn" id="saveCarEdit" type="button">Išsaugoti pakeitimus</button>\n          <button class="btn secondary" id="backCarEdit" type="button">Atgal į automobilį</button>\n        </div>\n      </div>\n    `
  );
  document.getElementById("closeCarEdit").onclick = () => renderCarSheet(car);
  document.getElementById("backCarEdit").onclick = () => renderCarSheet(car);
  document
    .querySelectorAll("[data-managed-photo-kind]")
    .forEach(
      img =>
        (img.onclick = () =>
          openManagedPhotoGallery(
            img.dataset.managedPhotoKind,
            car.id,
            Number(img.dataset.managedPhotoIndex || 0)
          ))
    );
  document.querySelectorAll("[data-edit-car-photo]").forEach(
    btn =>
      (btn.onclick = async () => {
        const i = Number(btn.dataset.editCarPhoto),
          ref = (car.photos || [])[i];
        if (!ref || !confirm("Ištrinti šią nuotrauką?")) return;
        car.photos = car.photos.filter((_, x) => x !== i);
        car.imageSrc = car.photos[0] || "";
        await photoDelete(ref);
        saveState();
        render();
        openCarEditSheet(car.id);
      })
  );
  document.getElementById("saveCarEdit").onclick = async () => {
    const name = document.getElementById("editCarName").value.trim();
    if (!name) {
      toast("Įrašyk pavadinimą", "✍️");
      return;
    }
    car.name = name;
    car.buyPrice = Math.max(0, Number(document.getElementById("editCarBuyPrice").value) || 0);
    car.notes = document.getElementById("editCarNotes").value.trim();
    const soldEl = document.getElementById("editCarSoldPrice");
    if (soldEl) {
      const sold = soldEl.value;
      car.soldPrice = sold === "" ? null : Math.max(0, Number(sold) || 0);
    }
    const fs = Array.from(document.getElementById("editCarPhotos").files || []).filter(f =>
      /^image\//i.test(f.type)
    );
    for (const f of fs) {
      try {
        const k = await storeImageFile(f);
        if (k) {
          car.photos = car.photos || [];
          car.photos.push(k);
          await photoGet(k);
        }
      } catch (e) {}
    }
    car.imageSrc = car.photos?.[0] || "";
    saveState();
    render();
    openCar(car.id);
    toast("Automobilis atnaujintas", "✏️");
  };
}
function openAddChecklistForm(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;
  const current = document.getElementById("sheet").innerHTML;
  document.getElementById("sheet").innerHTML =
    `\n      <div class="sheetHead">\n        <h3>Nauja automobilio užduotis</h3>\n        <button class="closeBtn" id="closeAdd">✕</button>\n      </div>\n      <div class="field"><label for="newCheckName">Punktas</label><input class="input" id="newCheckName" placeholder="Pvz. Sutvarkyti saloną" /></div>\n\n      <div class="field"><label>Data, kada reikia atlikti <span class="subtle">(nebūtina)</span></label><input class="input" id="newCheckDueDate" type="date" /></div>\n      <div class="btnRow">\n        <button class="btn" id="saveNewCheck">Pridėti</button>\n        <button class="btn secondary" id="backToCar">Atgal</button>\n      </div>\n    `;
  document.getElementById("closeAdd").onclick = closeSheet;
  document.getElementById("backToCar").onclick = () => renderCarSheet(car);
  document.getElementById("saveNewCheck").onclick = () => {
    const name = document.getElementById("newCheckName").value.trim();
    const xp = 0,
      coins = 0;
    const dueDate = document.getElementById("newCheckDueDate")?.value || "";
    if (!name) {
      toast("Įrašyk punktą", "✍️");
      return;
    }
    car.checklist.push({ id: "custom_" + Date.now(), name, xp, coins, done: false, dueDate });
    addHistory("Garažo punktas", `Pridėtas: ${name}`, "➕");
    saveState();
    renderCarSheet(car);
    toast("Punktas pridėtas", "➕");
  };
}
function renderCarChecklist(carId) {
  const car = state.cars.find(c => c.id === carId);
  const root = document.getElementById("carChecklist");
  if (!root || !car) return;
  const editable = car.status !== "parduotas";
  const checklist = Array.isArray(car.checklist) ? car.checklist : [];
  const required =
    typeof todayRequiredItemsApp === "function"
      ? todayRequiredItemsApp().filter(
          item =>
            item.kind === "car" && item.id === car.id && ["SDK", "TA", "Draudimas"].includes(item.category)
        )
      : [];
  const managerRows = required
    .map(
      item =>
        `<button class="carManagerSystemTask ${item.late ? "late" : ""}" type="button" data-car-manager-edit="${escapeHTML(car.id)}"><span class="carManagerSystemIcon">${escapeHTML(item.icon || "!")}</span><span class="carManagerSystemCopy"><small>${escapeHTML(item.category)}</small><strong>${escapeHTML(item.action)}</strong></span><span class="carManagerSystemDue ${item.late ? "late" : ""}">${item.late ? "Vėluoja" : "Šiandien"}</span></button>`
    )
    .join("");
  const taskRows = checklist
    .map(
      (item, index) =>
        `\n      <div class="listItem carTaskRow">\n        <label>\n          <input type="checkbox" ${item.done ? "checked" : ""} ${editable ? "" : "disabled"} data-car="${car.id}" data-item="${item.id}" />\n          <div class="carTaskMain">\n            <strong><span class="carTaskNumber">${index + 1}.</span> ${escapeHTML(item.name)}</strong>\n            ${item.dueDate ? `<div class="small">${taskDueMarkup(item.dueDate)}</div>` : ""}\n            ${item.done && Number(item.expense || 0) > 0 ? `<div class="small carTaskReceiptMeta">💶 ${moneyFmt(item.expense)}${(item.receipts || []).length ? ` · 📎 ${(item.receipts || []).length}` : ""}</div>` : ""}\n          </div>\n        </label>\n        <div class="carTaskActions">\n          <input class="input carTaskExpenseInput" type="number" min="0" step="0.01" ${item.done || !editable ? "disabled" : ""} value="${Number(item.expense || 0) || ""}" data-expense-for="${item.id}" placeholder="€" aria-label="Išlaidos" />\n          <button class="smallBtn danger" type="button" data-delete-item="${item.id}" ${editable ? "" : "disabled"} aria-label="Ištrinti užduotį">✕</button>\n        </div>\n      </div>\n    `
    )
    .join("");
  root.innerHTML = `${managerRows ? `<div class="carManagerSystemList" aria-label="Vadybininko darbai">${managerRows}</div>` : ""}${taskRows}`;
  root.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.onchange = async () => {
      const car = state.cars.find(c => c.id === cb.dataset.car);
      const item = car?.checklist.find(i => i.id === cb.dataset.item);
      if (!car || !item || item.done) return;
      const expenseInput = root.querySelector(`[data-expense-for="${item.id}"]`);
      const expense = Math.max(0, Number(expenseInput?.value || 0));
      if (expense > 0) {
        cb.checked = false;
        openCarTaskReceiptSheetV24(car, item, expense);
        return;
      }
      await completeCarTaskWithExpenseV24(car, item, 0, []);
      render();
      openCar(car.id);
    };
  });
  root.querySelectorAll("[data-delete-item]").forEach(btn => {
    btn.onclick = () => deleteChecklistItem(car.id, btn.dataset.deleteItem);
  });
  root
    .querySelectorAll("[data-car-manager-edit]")
    .forEach(btn => (btn.onclick = () => openCarEditSheet(car.id)));
}
function sellCar(carId, explicitSellPrice = null) {
  const car = state.cars.find(c => c.id === carId);
  if (!car || car.status === "parduotas") return;
  if (!car.checklist.every(i => i.done)) {
    toast("Visos užduotys turi būti atliktos", "⚠️");
    return;
  }
  const sellPrice = Number(explicitSellPrice ?? document.getElementById("sellPriceInput")?.value ?? 0);
  if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
    toast("Įrašyk pardavimo kainą", "💰");
    return;
  }
  const realCost = carTotalCost(car);
  const netProfit = sellPrice - realCost;
  car.soldPrice = sellPrice;
  car.soldAt = nowLabel();
  car.soldDateISO = todayISO();
  car.status = "parduotas";
  car.netProfit = netProfit;
  state.stats.carsSold += 1;
  state.stats.tasksCompleted += 1;
  state.finances.monthlyRevenue += sellPrice;
  state.finances.monthlyExpenses += realCost;
  ensureFinanceCollections();
  state.finances.budgetBalance += sellPrice;
  state.finances.monthlyNetProfit += netProfit;
  state.finances.lifetimeNetProfit += netProfit;
  addHistory(
    "Automobilis parduotas",
    `${car.name} • savikaina ${moneyFmt(realCost)} • parduota už ${moneyFmt(sellPrice)} • pardavimo marža ${netProfit >= 0 ? "+" : ""}${moneyFmt(netProfit)}`,
    "💸",
    { kind: "car", id: car.id, label: "Atidaryti automobilį" }
  );
  playCashRegisterSound();
  showSaleProfitToast(netProfit, car.name);
  saveState();
  closeSheet();
  render();
}
function openSheet(html) {
  document.getElementById("sheet").innerHTML = html;
  document.getElementById("modalBackdrop").classList.add("show");
}
function closeSheet() {
  document.getElementById("modalBackdrop").classList.remove("show");
  document.getElementById("sheet").innerHTML = "";
}
