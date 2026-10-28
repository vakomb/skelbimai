// Klientai (senasis CRM) ir atsarginė kopija / atkūrimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const customerStages = ["Nauja", "Apžiūra", "Derybos", "Užbaigta"];
let returnFocus = null;
const finiteMoney = v => Number.isFinite(Number(v)) && Number(v) >= 0;
function companyGo(view) {
  state.selectedView = view;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function companyDate(date) {
  if (!date) return "Be termino";
  const d = parseISODateLocal(date);
  return d ? d.toLocaleDateString("lt-LT", { month: "2-digit", day: "2-digit" }) : date;
}
function customerCar(c) {
  return state.cars.find(a => a.id === c.carId)?.name || c.interest || "Automobilis nenurodytas";
}
function renderCustomers() {
  const q = (document.getElementById("customerQuery").value || "").toLocaleLowerCase("lt"),
    stage = document.getElementById("customerFilter").value;
  const all = state.customers || [];
  const rows = all
    .filter(
      c =>
        (stage === "all" || (stage === "active" ? c.stage !== "Užbaigta" : stage === c.stage)) &&
        [c.name, c.phone, c.interest, customerCar(c)].join(" ").toLocaleLowerCase("lt").includes(q)
    )
    .sort((a, b) => (a.followDate || "9999").localeCompare(b.followDate || "9999"));
  document.getElementById("customerSummary").textContent = `Rodoma ${rows.length} iš ${all.length} užklausų`;
  document.getElementById("customerList").innerHTML =
    rows
      .map(
        c =>
          `<article class="companyCustomer"><div class="companyCustomerHead"><div><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(customerCar(c))}</p></div><span class="companyStatus">${escapeHTML(c.stage)}</span></div>${c.phone ? `<p>${escapeHTML(c.phone)}</p>` : ""}${c.budget ? `<p>Biudžetas: ${moneyFmt(c.budget)}</p>` : ""}${c.followDate ? `<p class="${c.followDate <= todayISO() && c.stage !== "Užbaigta" ? "companyDue" : ""}">${companyDate(c.followDate)} · ${escapeHTML(c.nextAction || "Susisiekti")}</p>` : ""}${c.notes ? `<p>${escapeHTML(c.notes)}</p>` : ""}<div class="btnRow"><button class="btn secondary" data-company-customer="${escapeHTML(c.id)}">Redaguoti</button>${c.phone ? `<a class="btn" href="tel:${c.phone.replace(/[^+0-9]/g, "")}">Skambinti</a>` : ""}${c.carId && state.cars.some(a => a.id === c.carId) ? `<button class="btn secondary" data-company-kind="car" data-company-id="${escapeHTML(c.carId)}">Automobilis</button>` : ""}</div></article>`
      )
      .join("") ||
    `<div class="companyEmpty"><strong>${all.length ? "Užklausų pagal šį filtrą nėra" : "Klientų užklausų dar nėra"}</strong>${all.length ? "Pakeiskite paiešką arba būseną." : "Pridėkite kontaktą, dominantį automobilį ir kitą susisiekimo datą."}</div>`;
}
function openCustomer(id) {
  const old = (state.customers || []).find(c => c.id === id),
    c = old || {
      name: "",
      phone: "",
      carId: "",
      interest: "",
      stage: "Nauja",
      budget: "",
      followDate: "",
      nextAction: "",
      notes: ""
    };
  returnFocus = document.activeElement;
  openSheet(
    `<div class="sheetHead"><h3 id="customerDialogTitle">${old ? "Kliento užklausa" : "Nauja užklausa"}</h3><button class="closeBtn" id="closeCustomer" type="button" aria-label="Uždaryti">✕</button></div><form class="companyForm" id="customerForm">\n      <div class="field"><label for="cName">Vardas / įmonė *</label><input class="input" id="cName" required maxlength="120" value="${escapeHTML(c.name)}" autocomplete="name"></div>\n      <div class="grid2"><div class="field"><label for="cPhone">Telefonas</label><input class="input" id="cPhone" type="tel" maxlength="40" value="${escapeHTML(c.phone)}" placeholder="+370" autocomplete="tel"></div><div class="field"><label for="cStage">Būsena</label><select class="input" id="cStage">${customerStages.map(v => `<option${v === c.stage ? " selected" : ""}>${v}</option>`).join("")}</select></div></div>\n      <div class="field"><label for="cCar">Automobilis garaže</label><select class="input" id="cCar"><option value="">Nepasirinktas</option>${state.cars.map(a => `<option value="${escapeHTML(a.id)}"${a.id === c.carId ? " selected" : ""}>${escapeHTML(a.name)}${a.status === "parduotas" ? " (parduotas)" : ""}</option>`).join("")}</select></div>\n      <div class="field"><label for="cInterest">Ko ieško klientas</label><input class="input" id="cInterest" maxlength="200" value="${escapeHTML(c.interest)}" placeholder="Pvz. Toyota RAV4, automatas"></div>\n      <div class="grid2"><div class="field"><label for="cBudget">Biudžetas, €</label><input class="input" id="cBudget" type="number" min="0" step="0.01" value="${escapeHTML(c.budget || "")}"></div><div class="field"><label for="cDate">Susisiekimo data</label><input class="input" id="cDate" type="date" value="${escapeHTML(c.followDate)}"></div></div>\n      <div class="field"><label for="cAction">Kitas veiksmas</label><input class="input" id="cAction" maxlength="200" value="${escapeHTML(c.nextAction)}" placeholder="Pvz. Suderinti apžiūrą"></div>\n      <div class="field"><label for="cNotes">Pastabos</label><textarea class="input" id="cNotes" maxlength="3000">${escapeHTML(c.notes)}</textarea></div><div id="customerError" class="companyFormError" role="alert"></div>\n      <div class="btnRow"><button class="btn" type="submit">Išsaugoti</button><button class="btn secondary" id="cancelCustomer" type="button">Atšaukti</button></div>${old ? '<div class="btnRow"><button class="btn danger" id="deleteCustomer" type="button">Ištrinti užklausą</button></div>' : ""}</form>`
  );
  const sheet = document.getElementById("sheet");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "customerDialogTitle");
  const cancel = () => {
    closeSheet();
    returnFocus?.focus();
  };
  document.getElementById("closeCustomer").onclick = cancel;
  document.getElementById("cancelCustomer").onclick = cancel;
  document.getElementById("cName").focus();
  document.getElementById("customerForm").onsubmit = e => {
    e.preventDefault();
    const val = id => document.getElementById(id).value.trim();
    if (!val("cName")) return;
    if (val("cPhone") && !/^\+?[\d ()-]{5,40}$/.test(val("cPhone"))) {
      document.getElementById("customerError").textContent = "Patikrinkite telefono numerį.";
      return;
    }
    if (!finiteMoney(val("cBudget"))) return;
    const next = {
      id: old?.id || uid(),
      name: val("cName"),
      phone: val("cPhone"),
      carId: val("cCar"),
      interest: val("cInterest"),
      stage: val("cStage"),
      budget: Number(val("cBudget")),
      followDate: val("cDate"),
      nextAction: val("cAction"),
      notes: val("cNotes"),
      createdAt: old?.createdAt || nowLabel(),
      updatedAt: nowLabel()
    };
    const previous = state.customers;
    state.customers = old ? previous.map(x => (x.id === old.id ? next : x)) : [next, ...previous];
    if (!saveState()) {
      state.customers = previous;
      document.getElementById("customerError").textContent =
        "Nepavyko išsaugoti. Atlaisvinkite naršyklės saugyklą.";
      return;
    }
    addHistory(
      old ? "Kliento užklausa atnaujinta" : "Nauja kliento užklausa",
      next.name + " • " + next.stage,
      "👥"
    );
    saveState();
    cancel();
    render();
    toast("Užklausa išsaugota", "✓");
  };
  if (old)
    document.getElementById("deleteCustomer").onclick = () => {
      if (!confirm("Ištrinti kliento „" + old.name + "“ užklausą?")) return;
      state.customers = state.customers.filter(x => x.id !== old.id);
      addHistory("Kliento užklausa ištrinta", old.name, "👥");
      saveState();
      cancel();
      render();
    };
}
document.getElementById("newCustomer").onclick = () => openCustomer();
document.getElementById("customerQuery").oninput = renderCustomers;
document.getElementById("customerFilter").onchange = renderCustomers;
document.addEventListener("click", e => {
  if (e.target.closest("[data-company-addcar]")) {
    companyGo("garage");
    document.getElementById("showAddCarFormBtn").click();
    return;
  }
  if (e.target.closest("[data-company-newcustomer]")) return openCustomer();
  const customer = e.target.closest("[data-company-customer]");
  if (customer) return openCustomer(customer.dataset.companyCustomer);
  const b = e.target.closest("[data-company-kind]");
  if (!b) return;
  if (b.dataset.companyKind === "car") openCar(b.dataset.companyId);
  if (b.dataset.companyKind === "lead") openGarageLeadSheet(b.dataset.companyId);
  if (b.dataset.companyKind === "customer") openCustomer(b.dataset.companyId);
  if (b.dataset.companyKind === "task") {
    state.ui.garageTaskGroups = { autos: false, custom: true };
    companyGo("garage");
  }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Tab" || !document.getElementById("modalBackdrop").classList.contains("show")) return;
  const items = [
    ...document.getElementById("sheet").querySelectorAll("button,a[href],input,select,textarea")
  ].filter(x => !x.disabled && x.getClientRects().length);
  if (!items.length) return;
  const first = items[0],
    last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
["themeToggle", "soundToggle", "vibrateToggle"].forEach(id => {
  const el = document.getElementById(id);
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", el.parentElement.querySelector("strong").textContent);
  el.onkeydown = e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      el.click();
    }
  };
});
async function companyPhotoExport(snapshot) {
  const refs = [
    ...new Set(
      [...snapshot.cars, ...snapshot.leadVariants]
        .flatMap(c => [...(c.photos || []), c.imageSrc || ""])
        .filter(k => k && !k.startsWith("data:"))
    )
  ];
  return Promise.all(
    refs.map(async key => {
      const value = await photoGet(key);
      if (!value) throw Error("Nepavyko nuskaityti vienos nuotraukos. Kopija nesukurta.");
      return { key, value, blob: true };
    })
  );
}
async function clearCompanyPhotos() {
  if (window.indexedDB) {
    const db = await openPhotoDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
      tx.objectStore(PHOTO_STORE_NAME).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  Object.keys(localStorage)
    .filter(k => k.startsWith(PHOTO_FALLBACK_PREFIX))
    .forEach(k => localStorage.removeItem(k));
  Object.keys(photoUrlCache).forEach(k => delete photoUrlCache[k]);
}
document.getElementById("backupCompany").onclick = async () => {
  const b = document.getElementById("backupCompany"),
    status = document.getElementById("backupStatus");
  b.disabled = true;
  status.textContent = "Ruošiama kopija su priedais…";
  try {
    const snapshot = JSON.parse(JSON.stringify(state)),
      photos = await companyPhotoExport(snapshot),
      documents = await exportVehicleDocuments(snapshot);
    const blob = new Blob(
      [
        JSON.stringify({
          app: "visureigiai-uab",
          version: 2,
          createdAt: new Date().toISOString(),
          state: snapshot,
          photos,
          documents
        })
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "Visureigiai-kopija-" + todayISO() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
    status.textContent = "Kopija paruošta. Patikrinkite atsisiuntimų aplanką.";
  } catch (e) {
    status.textContent = "Nepavyko paruošti visos kopijos: " + e.message;
  } finally {
    b.disabled = false;
  }
};
document.getElementById("restoreCompany").onclick = () => document.getElementById("restoreFile").click();
function validateBackup(data) {
  if (
    data.app !== "visureigiai-uab" ||
    ![1, 2].includes(data.version) ||
    !data.state ||
    !Array.isArray(data.photos)
  )
    throw Error("Pasirinkite šios programėlės atsarginę kopiją.");
  const st = data.state;
  for (const k of ["cars", "customers", "leadVariants", "garageTasks", "history", "historyLog"])
    if (!Array.isArray(st[k])) throw Error("Kopijoje trūksta duomenų: " + k);
  if (!st.finances || !["transactions", "debts", "debtLedger"].every(k => Array.isArray(st.finances[k])))
    throw Error("Netinkami finansų duomenys.");
  function check(v, key = "") {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw Error("Netinkamas duomenų laukas.");
    if (typeof v === "number" && !Number.isFinite(v)) throw Error("Netinkamas skaičius.");
    if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => check(x, k));
  }
  check(st);
  for (const list of [st.cars, st.customers, st.leadVariants, st.garageTasks]) {
    const ids = new Set();
    for (const item of list) {
      if (!item || typeof item.id !== "string" || !/^[\w-]+$/.test(item.id) || ids.has(item.id))
        throw Error("Netinkamas arba pasikartojantis įrašo ID.");
      ids.add(item.id);
    }
  }
  const safeRef = v =>
    typeof v === "string" &&
    (!v || /^[\w-]+$/.test(v) || /^data:image\/(png|jpeg|webp|gif);base64,[\w+/=\s]+$/.test(v));
  for (const car of st.cars) {
    if (
      typeof car.name !== "string" ||
      !finiteMoney(car.buyPrice) ||
      !Array.isArray(car.checklist) ||
      !Array.isArray(car.photos) ||
      !car.photos.every(safeRef) ||
      !safeRef(car.imageSrc || "")
    )
      throw Error("Netinkami automobilio duomenys.");
    for (const t of car.checklist)
      if (
        typeof t.id !== "string" ||
        !/^[\w-]+$/.test(t.id) ||
        typeof t.name !== "string" ||
        !finiteMoney(t.expense || 0)
      )
        throw Error("Netinkama automobilio užduotis.");
  }
  for (const c of st.customers)
    if (
      typeof c.name !== "string" ||
      typeof c.phone !== "string" ||
      !customerStages.includes(c.stage) ||
      !finiteMoney(c.budget || 0)
    )
      throw Error("Netinkami kliento duomenys.");
  for (const l of st.leadVariants)
    if (!Array.isArray(l.photos) || !l.photos.every(safeRef)) throw Error("Netinkamos varianto nuotraukos.");
  for (const p of data.photos)
    if (
      typeof p.key !== "string" ||
      !/^[\w-]+$/.test(p.key) ||
      typeof p.value !== "string" ||
      !/^data:image\/(png|jpeg|webp|gif);base64,[\w+/=\s]+$/.test(p.value)
    )
      throw Error("Netinkama nuotraukų kopija.");
  validateVehicleDocuments(data);
  return data;
}
document.getElementById("restoreFile").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  const status = document.getElementById("backupStatus");
  try {
    const data = validateBackup(JSON.parse(await f.text()));
    if (!confirm("Atkurti kopiją? Dabartiniai įmonės įrašai bus pakeisti kopijos duomenimis.")) return;
    const db = await openPhotoDB();
    const remap = new Map(data.photos.map(p => [p.key, "photo_" + uid()]));
    for (const c of [...data.state.cars, ...data.state.leadVariants]) {
      c.photos = (c.photos || []).map(k => remap.get(k) || k);
      if (c.imageSrc) c.imageSrc = remap.get(c.imageSrc) || c.imageSrc;
    }
    const decoded = await Promise.all(
      data.photos.map(async p => ({ key: remap.get(p.key), value: await (await fetch(p.value)).blob() }))
    );
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, "readwrite"),
        store = tx.objectStore(PHOTO_STORE_NAME);
      decoded.forEach(p => store.put(p.value, p.key));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    const documentMap = new Map();
    for (const item of data.documents || []) {
      const blob = await readDocumentFile(await (await fetch(item.value)).blob());
      const key = await putDocument(blob);
      documentMap.set(item.key, key);
    }
    for (const car of data.state.cars) for (const d of car.documents || []) d.key = documentMap.get(d.key);
    const prev = state;
    state = { ...defaultState(), ...data.state, selectedView: "settings" };
    if (!saveState()) {
      state = prev;
      throw Error("Nepakanka saugyklos įrašams atkurti.");
    }
    location.reload();
  } catch (err) {
    status.textContent = "Kopija neatkurta. " + err.message;
  } finally {
    e.target.value = "";
  }
};
