// Automobilio laukai (VIN, TA, draudimas, SDK), dokumentai ir naujo auto išsaugojimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const SDK_STATES = [
  ["unset", "Nesutvarkyta"],
  ["submitted", "Pateikta"],
  ["seller", "Laukiama pardavėjo"],
  ["buyer", "Laukiama pirkėjo"],
  ["seller-late", "Vėluoja pardavėjas"],
  ["buyer-late", "Vėluoja pirkėjas"],
  ["done", "Sutvarkyta"]
];
const DOC_TYPES = [
  ["purchase", "Pirkimo sutartis"],
  ["sale", "Pardavimo sutartis"],
  ["invoice", "Sąskaitos"],
  ["receipt", "Čekiai / kvitai"],
  ["insurance", "Draudimas"],
  ["inspection", "Techninės apžiūros dokumentas"],
  ["registration", "Registracijos dokumentai"],
  ["repair", "Remonto dokumentai"],
  ["other", "Kiti dokumentai"]
];
const DOCUMENT_LIMIT = 20 * 1024 * 1024;
const fieldValue = (p, k) => document.getElementById(p + k)?.value.trim() || "";
function bindStandaloneStatusDate(statusId, dateId) {
  const status = document.getElementById(statusId),
    date = document.getElementById(dateId);
  if (!status || !date) return;
  const sync = () => {
    const valid = status.value === "valid";
    date.disabled = !valid;
    if (!valid) date.value = "";
  };
  status.onchange = sync;
  sync();
}
function sdkClass(s) {
  return s === "done"
    ? "sdkDone"
    : s?.endsWith("-late")
      ? "sdkLate"
      : s === "unset" || !s
        ? "sdkUnset"
        : "sdkPending";
}
function sdkFields(p, c = {}) {
  return `<div class="vehicleFields sdkFields"><div class="field"><label for="${p}sdk">SDK</label><input class="input" id="${p}sdk" value="${escapeHTML(c.sdk || "")}" maxlength="32" autocomplete="off" autocapitalize="characters"></div><div class="field"><label for="${p}sdkStatus">SDK būsena</label><select class="input ${sdkClass(c.sdkStatus)}" id="${p}sdkStatus">${SDK_STATES.map(([v, t]) => `<option value="${v}"${v === (c.sdkStatus || "unset") ? " selected" : ""}>${t}</option>`).join("")}</select></div></div>`;
}
function vehicleStatusOptions(value = "unknown") {
  return [
    ["unknown", "Nežinoma"],
    ["valid", "Galioja"],
    ["invalid", "Negalioja"]
  ]
    .map(([v, l]) => `<option value="${v}"${v === (value || "unknown") ? " selected" : ""}>${l}</option>`)
    .join("");
}
function listingStatusOptions(value = "not-listed") {
  return [
    ["not-listed", "Neįkeltas"],
    ["listed", "Įkeltas"]
  ]
    .map(([v, l]) => `<option value="${v}"${v === (value || "not-listed") ? " selected" : ""}>${l}</option>`)
    .join("");
}
function vehicleFields(p, c = {}) {
  return `${sdkFields(p, c)}<details class="vehicleDetails"><summary>Daugiau informacijos</summary><div class="vehicleFields">\n      ${[
    ["vin", "VIN", "text", 17],
    ["year", "Metai", "number", 4],
    ["mileage", "Rida, km", "number", 10],
    ["plate", "Valstybinis numeris", "text", 20],
    ["askingPrice", "Planuojama pardavimo kaina, €", "number", 14],
    ["source", "Pasiūlymo kanalas", "text", 160]
  ]
    .map(
      ([k, l, t, max]) =>
        `<div class="field ${k === "vin" || k === "source" ? "vehicleWide" : ""}"><label for="${p + k}">${l}</label><input class="input" id="${p + k}" type="${t}" ${t === "number" ? `min="${k === "year" ? 1886 : 0}" step="${k === "askingPrice" ? "0.01" : 1}"` : `maxlength="${max}"`} value="${escapeHTML(c[k] ?? "")}" ${k === "source" ? 'placeholder="Facebook, telefonas, rekomendacija…"' : ""} ${k === "vin" || k === "plate" ? 'autocapitalize="characters" autocomplete="off"' : ""}></div>`
    )
    .join(
      ""
    )}\n      <div class="field"><label for="${p}taStatus">TA</label><select class="input" id="${p}taStatus">${vehicleStatusOptions(c.taStatus)}</select></div>\n      <div class="field"><label for="${p}taUntil">TA galioja iki</label><input class="input" id="${p}taUntil" type="date" value="${escapeHTML(c.taUntil || "")}"></div>\n      <div class="field"><label for="${p}insuranceStatus">Draudimas</label><select class="input" id="${p}insuranceStatus">${vehicleStatusOptions(c.insuranceStatus)}</select></div>\n      <div class="field"><label for="${p}insuranceUntil">Draudimas galioja iki</label><input class="input" id="${p}insuranceUntil" type="date" value="${escapeHTML(c.insuranceUntil || "")}"></div>\n      <div class="field"><label for="${p}listingStatus">Skelbimas</label><select class="input" id="${p}listingStatus">${listingStatusOptions(c.listingStatus)}</select></div>\n      <div class="field"><label for="${p}listingDate">Skelbimo data</label><input class="input" id="${p}listingDate" type="date" value="${escapeHTML(c.listingDate || "")}"></div>\n      </div></details>`;
}
function readVehicleFields(p) {
  const o = {};
  for (const k of ["sdk", "vin", "plate"]) o[k] = fieldValue(p, k).toUpperCase();
  o.source = fieldValue(p, "source");
  o.sdkStatus = fieldValue(p, "sdkStatus") || "unset";
  for (const k of ["year", "mileage", "askingPrice"]) {
    const v = fieldValue(p, k);
    o[k] = v === "" ? null : Number(v);
    if (v !== "" && (!Number.isFinite(o[k]) || o[k] < 0 || (k !== "askingPrice" && !Number.isInteger(o[k]))))
      throw Error(
        "Patikrinkite lauką „" +
          { year: "Metai", mileage: "Rida", askingPrice: "Planuojama pardavimo kaina" }[k] +
          "“."
      );
  }
  o.taStatus = fieldValue(p, "taStatus") || "unknown";
  o.taUntil = fieldValue(p, "taUntil");
  o.insuranceStatus = fieldValue(p, "insuranceStatus") || "unknown";
  o.insuranceUntil = fieldValue(p, "insuranceUntil");
  o.listingStatus = fieldValue(p, "listingStatus") || "not-listed";
  o.listingDate = fieldValue(p, "listingDate");
  if (o.taStatus === "valid" && !o.taUntil) throw Error("Nurodyk, iki kada galioja TA.");
  if (o.insuranceStatus === "valid" && !o.insuranceUntil) throw Error("Nurodyk, iki kada galioja draudimas.");
  if (o.listingStatus === "listed" && !o.listingDate) o.listingDate = todayISO();
  if (o.year !== null && (o.year < 1886 || o.year > new Date().getFullYear() + 1))
    throw Error("Patikrinkite automobilio metus.");
  if (o.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(o.vin))
    throw Error("VIN turi sudaryti 17 raidžių ir skaitmenų (be I, O, Q).");
  return o;
}
function documentRows(p, c) {
  return (c.documents || [])
    .map(
      d =>
        `<div class="vehicleDocRow" data-doc-row="${escapeHTML(d.id)}"><button type="button" class="vehicleDocDownload" data-doc-download="${escapeHTML(d.id)}"><strong>${escapeHTML(d.name)}</strong><span>${escapeHTML(DOC_TYPES.find(x => x[0] === d.kind)?.[1] || "Dokumentas")} · ${Math.max(1, Math.round(d.size / 1024))} KB</span></button><button type="button" class="vehicleDocRemove" data-doc-remove="${escapeHTML(d.id)}" aria-label="Pašalinti ${escapeHTML(d.name)}">×</button></div>`
    )
    .join("");
}
function documentFields(p, c = {}) {
  return `<details class="vehicleDetails vehicleDocuments"><summary>Dokumentai <span class="vehicleCount">${(c.documents || []).length || ""}</span></summary><div class="vehicleDocList" id="${p}docList">${documentRows(p, c)}</div><div class="vehicleDocInputs">${DOC_TYPES.map(([k, t]) => `<label class="vehicleDocPicker" for="${p}doc_${k}"><span>＋ ${t}</span><input id="${p}doc_${k}" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple><small id="${p}files_${k}" aria-live="polite"></small></label>`).join("")}</div></details>`;
}
async function documentBlob(key) {
  try {
    const db = await openPhotoDB();
    return await new Promise((resolve, reject) => {
      const r = db.transaction(PHOTO_STORE_NAME, "readonly").objectStore(PHOTO_STORE_NAME).get(key);
      r.onsuccess = () =>
        r.result instanceof Blob ? resolve(r.result) : reject(Error("Dokumento nepavyko rasti."));
      r.onerror = () => reject(r.error);
    });
  } catch (error) {
    const remote = await window.AUTOEASIER_WORKSPACE?.downloadMedia?.(key);
    if (remote) return remote;
    throw error;
  }
}
async function putDocument(blob, key = "doc_" + uid()) {
  const db = await openPhotoDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
    tx.objectStore(PHOTO_STORE_NAME).put(blob, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error("Dokumento nepavyko išsaugoti."));
  });
  return key;
}
async function downloadDocument(c, id) {
  try {
    const d = (c.documents || []).find(x => x.id === id);
    if (!d) return;
    const blob = await documentBlob(d.key),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = d.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
  } catch (e) {
    toast(e.message, "!");
  }
}
async function readDocumentFile(f) {
  if (!f.size || f.size > DOCUMENT_LIMIT) throw Error("Dokumentas turi būti ne didesnis nei 20 MB.");
  const a = new Uint8Array(await f.slice(0, 12).arrayBuffer());
  let type = "";
  if (String.fromCharCode(...a.slice(0, 5)) === "%PDF-") type = "application/pdf";
  else if (a[0] === 255 && a[1] === 216 && a[2] === 255) type = "image/jpeg";
  else if (a[0] === 137 && String.fromCharCode(...a.slice(1, 4)) === "PNG") type = "image/png";
  else if (
    String.fromCharCode(...a.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...a.slice(8, 12)) === "WEBP"
  )
    type = "image/webp";
  if (!type) throw Error("Pasirinkite PDF, JPG, PNG arba WebP dokumentą.");
  return new Blob([f], { type });
}
async function collectDocuments(p, c = {}) {
  const existing = (c.documents || []).filter(
    d => !document.querySelector(`[data-doc-row="${d.id}"]`)?.dataset.removed
  );
  const files = DOC_TYPES.flatMap(([kind]) =>
    Array.from(document.getElementById(p + "doc_" + kind)?.files || []).map(file => ({ kind, file }))
  );
  const prepared = await Promise.all(files.map(async x => ({ ...x, blob: await readDocumentFile(x.file) })));
  const added = [];
  try {
    for (const x of prepared) {
      const key = await putDocument(x.blob);
      added.push({
        id: uid(),
        key,
        kind: x.kind,
        name: x.file.name,
        type: x.blob.type,
        size: x.blob.size,
        addedAt: nowLabel(),
        addedDateISO: todayISO()
      });
    }
  } catch (e) {
    await Promise.all(added.map(d => photoDelete(d.key)));
    throw e;
  }
  return [...existing, ...added];
}
function bindVehicleFields(p, c, instant = false) {
  DOC_TYPES.forEach(([kind]) =>
    document.getElementById(p + "doc_" + kind)?.addEventListener("change", e => {
      const label = document.getElementById(p + "files_" + kind);
      if (label)
        label.textContent = Array.from(e.target.files || [])
          .map(f => f.name)
          .join(", ");
    })
  );
  const sel = document.getElementById(p + "sdkStatus");
  if (sel)
    sel.onchange = () => {
      sel.className = "input " + sdkClass(sel.value);
    };
  const bindStatusDate = (statusId, dateId) => {
    const s = document.getElementById(p + statusId),
      d = document.getElementById(p + dateId);
    if (!s || !d) return;
    const sync = () => {
      d.disabled = s.value !== "valid";
      if (s.value !== "valid") d.value = "";
    };
    s.onchange = sync;
    sync();
  };
  bindStatusDate("taStatus", "taUntil");
  bindStatusDate("insuranceStatus", "insuranceUntil");
  const listingSel = document.getElementById(p + "listingStatus"),
    listingDate = document.getElementById(p + "listingDate");
  if (listingSel && listingDate) {
    const sync = () => {
      listingDate.disabled = listingSel.value !== "listed";
      if (listingSel.value === "listed" && !listingDate.value) listingDate.value = todayISO();
      if (listingSel.value !== "listed") listingDate.value = "";
    };
    listingSel.onchange = sync;
    sync();
  }
  const root = document.getElementById(p + "docList");
  if (root) {
    root
      .querySelectorAll("[data-doc-download]")
      .forEach(b => (b.onclick = () => downloadDocument(c, b.dataset.docDownload)));
    root.querySelectorAll("[data-doc-remove]").forEach(
      b =>
        (b.onclick = async () => {
          if (!confirm("Pašalinti šį dokumentą?")) return;
          const row = b.closest("[data-doc-row]");
          if (!instant) {
            row.dataset.removed = "1";
            row.hidden = true;
            return;
          }
          const previous = c.documents;
          c.documents = previous.filter(d => d.id !== b.dataset.docRemove);
          if (!saveState()) {
            c.documents = previous;
            toast("Nepavyko išsaugoti pakeitimo.");
            return;
          }
          renderCarSheet(c);
          document.querySelector("#sheet .vehicleDocuments").open = true;
        })
    );
  }
  if (instant)
    DOC_TYPES.forEach(([kind]) => {
      const input = document.getElementById(p + "doc_" + kind);
      input.onchange = async () => {
        if (!input.files.length) return;
        const inputs = [...document.querySelectorAll("#sheet .vehicleDocInputs input")];
        inputs.forEach(x => (x.disabled = true));
        try {
          const docs = await collectDocuments(p, c),
            old = c.documents;
          c.documents = docs;
          if (!saveState()) {
            c.documents = old;
            throw Error("Nepavyko išsaugoti dokumentų.");
          }
          renderCarSheet(c);
          document.querySelector("#sheet .vehicleDocuments").open = true;
          toast("Dokumentai pridėti", "✓");
        } catch (e) {
          toast(e.message, "!");
        } finally {
          inputs.forEach(x => (x.disabled = false));
        }
      };
    });
}
const baseCarSheet = renderCarSheet;
renderCarSheet = function (c) {
  baseCarSheet(c);
  const body = document.querySelector("#sheet .premiumDetailBody");
  if (!body) return;
  const ta = vehicleStatusState(c.taStatus || "unknown", c.taUntil || "");
  const ins = vehicleStatusState(c.insuranceStatus || "unknown", c.insuranceUntil || "");
  const info = [
    ["VIN", c.vin],
    ["Metai", c.year],
    ["Rida", c.mileage != null ? new Intl.NumberFormat("lt-LT").format(c.mileage) + " km" : ""],
    ["Valstybinis numeris", c.plate],
    ["TA", ta.label],
    ["Draudimas", ins.label],
    [
      "Planuojama pardavimo kaina",
      c.askingPrice != null
        ? new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" }).format(c.askingPrice)
        : ""
    ],
    ["Pasiūlymo kanalas", c.source],
    [
      "Skelbimas",
      c.listingStatus === "listed" ? (c.listingDate ? "Įkeltas " + c.listingDate : "Įkeltas") : "Neįkeltas"
    ]
  ];
  if (c.notes) info.push(["Pastabos", c.notes]);
  const tasks = body.querySelector(".carTasksBlock");
  const extra = `<div class="carAfterTasks">\n      <div class="vehicleSdkDisplay"><div><span>SDK</span><strong>${escapeHTML(c.sdk || "—")}</strong></div><span class="vehicleSdkBadge ${sdkClass(c.sdkStatus)}">${SDK_STATES.find(x => x[0] === (c.sdkStatus || "unset"))?.[1] || "Nesutvarkyta"}</span></div>\n      \n      <details class="vehicleDetails carMoreInfo">\n        <summary>Daugiau informacijos</summary>\n        <div class="carMoreInfoInner">\n          <dl class="vehicleInfo">${info.map(([l, v]) => `<div><dt>${l}</dt><dd>${escapeHTML(v ?? "") || "—"}</dd></div>`).join("")}</dl>\n          <div class="carMorePhotosSlot"></div>\n        </div>\n      </details>\n    </div>`;
  if (tasks) tasks.insertAdjacentHTML("afterend", extra);
  else body.insertAdjacentHTML("afterbegin", extra);
  const media = document.querySelector("#sheet .carMediaSection");
  if (media) {
    media.insertAdjacentHTML("afterend", documentFields("viewVehicle", c));
    const photoSlot = document.querySelector("#sheet .carMorePhotosSlot");
    if (photoSlot) photoSlot.appendChild(media);
  } else {
    body.insertAdjacentHTML("beforeend", documentFields("viewVehicle", c));
  }
  bindVehicleFields("viewVehicle", c, true);
  if (c.status === "parduotas") {
    const actions = document.querySelector("#sheet .carBottomActions");
    if (actions) {
      const queued = accountingQueueHas(c.id),
        sent = !!c.accountingSharedAt;
      actions.insertAdjacentHTML(
        "beforebegin",
        `<section class="accountingCarBox"><div class="accountingCarHead"><strong>Buhalterija</strong><span>${(c.documents || []).length} dok.</span></div><div class="accountingCarActions"><button class="btn" type="button" data-accounting-send-car="${escapeHTML(c.id)}">${sent ? "Teikti dar kartą" : "Teikti buhalterei"}</button><button class="btn secondary" type="button" data-accounting-queue-car="${escapeHTML(c.id)}">${queued ? "Pašalinti iš savaitės" : "Pridėti į savaitės paketą"}</button></div></section>`
      );
    }
  }
};
const baseCarEdit = openCarEditSheet;
openCarEditSheet = function (id) {
  baseCarEdit(id);
  const c = state.cars.find(x => x.id === id);
  if (!c) return;
  document
    .querySelector("#sheet .carEditSection")
    .insertAdjacentHTML("beforeend", vehicleFields("editVehicle", c) + documentFields("editVehicle", c));
  bindVehicleFields("editVehicle", c);
  document.querySelectorAll("#sheet .carSheetEyebrow,#sheet .carSectionEyebrow").forEach(e => e.remove());
  document.getElementById("sheet").scrollTop = 0;
  document.getElementById("saveCarEdit").onclick = async () => {
    const button = document.getElementById("saveCarEdit");
    if (button.disabled) return;
    try {
      const extra = readVehicleFields("editVehicle"),
        name = fieldValue("editCar", "Name"),
        buy = Number(fieldValue("editCar", "BuyPrice")),
        soldEl = document.getElementById("editCarSoldPrice"),
        sold = soldEl ? Number(soldEl.value) : null;
      if (!name || !Number.isFinite(buy) || buy <= 0 || (soldEl && (!Number.isFinite(sold) || sold <= 0)))
        throw Error("Įveskite pavadinimą ir teigiamą kainą.");
      button.disabled = true;
      const docs = await collectDocuments("editVehicle", c),
        photos = [...(c.photos || [])];
      for (const f of Array.from(document.getElementById("editCarPhotos").files || [])) {
        const key = await storeImageFile(f);
        if (!key) throw Error("Nepavyko pridėti nuotraukos.");
        photos.push(key);
        await photoGet(key);
      }
      const old = JSON.parse(JSON.stringify(c)),
        oldBalance = state.finances.budgetBalance;
      Object.assign(c, extra, {
        name,
        buyPrice: buy,
        notes: fieldValue("editCar", "Notes"),
        documents: docs,
        photos,
        imageSrc: photos[0] || ""
      });
      state.finances.budgetBalance += Number(old.buyPrice || 0) - buy;
      if (soldEl) {
        c.soldPrice = sold;
        c.netProfit = carNetProfit(c);
        state.finances.budgetBalance += sold - Number(old.soldPrice || 0);
      }
      if (!saveState()) {
        Object.keys(c).forEach(k => delete c[k]);
        Object.assign(c, old);
        state.finances.budgetBalance = oldBalance;
        throw Error("Nepavyko išsaugoti automobilio.");
      }
      addHistory("Automobilis atnaujintas", c.name, "🚗");
      saveState();
      render();
      openCar(c.id);
      toast("Automobilis atnaujintas", "✓");
    } catch (e) {
      toast(e.message, "!");
    } finally {
      button.disabled = false;
    }
  };
};
document
  .getElementById("addCarBtn")
  .insertAdjacentHTML("beforebegin", vehicleFields("newVehicle") + documentFields("newVehicle"));
bindVehicleFields("newVehicle", {});
bindStandaloneStatusDate("leadTaStatus", "leadTaUntil");
bindStandaloneStatusDate("leadInsuranceStatus", "leadInsuranceUntil");
document.getElementById("addCarBtn").onclick = async () => {
  const b = document.getElementById("addCarBtn");
  if (b.disabled) return;
  try {
    const extra = readVehicleFields("newVehicle"),
      name = fieldValue("car", "Name"),
      buy = Number(fieldValue("car", "BuyPrice"));
    if (!name || !Number.isFinite(buy) || buy <= 0)
      throw Error("Įveskite pavadinimą ir teigiamą pirkimo kainą.");
    b.disabled = true;
    const docs = await collectDocuments("newVehicle"),
      photos = [];
    for (const f of Array.from(document.getElementById("carPhoto").files || [])) {
      const key = await storeImageFile(f);
      if (!key) throw Error("Nepavyko pridėti nuotraukos.");
      photos.push(key);
      await photoGet(key);
    }
    const c = {
      id: uid(),
      name,
      ...extra,
      documents: docs,
      photos,
      imageSrc: photos[0] || "",
      notes: "",
      buyPrice: buy,
      soldPrice: null,
      netProfit: 0,
      soldAt: null,
      soldDateISO: null,
      createdDateISO: todayISO(),
      createdAt: nowLabel(),
      status: "aktyvus",
      checklist: []
    };
    state.cars.unshift(c);
    ensureFinanceCollections();
    state.finances.budgetBalance -= buy;
    if (!saveState()) {
      state.cars = state.cars.filter(x => x !== c);
      state.finances.budgetBalance += buy;
      throw Error("Nepavyko išsaugoti automobilio.");
    }
    addHistory("Automobilis nupirktas", name + " • " + moneyFmt(buy), "🚗", {
      kind: "car",
      id: c.id,
      label: "Atidaryti automobilį"
    });
    saveState();
    document.querySelectorAll("#addCarPanel input").forEach(i => (i.value = ""));
    document.querySelectorAll("#addCarPanel .vehicleDocPicker small").forEach(e => (e.textContent = ""));
    document.getElementById("newVehiclesdkStatus").value = "unset";
    document.getElementById("newVehiclesdkStatus").className = "input sdkUnset";
    const newTa = document.getElementById("newVehicletaStatus"),
      newIns = document.getElementById("newVehicleinsuranceStatus"),
      newListing = document.getElementById("newVehiclelistingStatus");
    if (newTa) {
      newTa.value = "unknown";
      newTa.dispatchEvent(new Event("change"));
    }
    if (newIns) {
      newIns.value = "unknown";
      newIns.dispatchEvent(new Event("change"));
    }
    if (newListing) {
      newListing.value = "not-listed";
      newListing.dispatchEvent(new Event("change"));
    }
    document.querySelectorAll("#addCarPanel details").forEach(d => (d.open = false));
    document.getElementById("addCarPanel").style.display = "none";
    document.getElementById("showAddCarFormBtn").style.display = "block";
    render();
    toast("Automobilis pridėtas", "✓");
  } catch (e) {
    toast(e.message, "!");
  } finally {
    b.disabled = false;
  }
};
async function exportVehicleDocuments(snapshot) {
  return Promise.all(
    snapshot.cars
      .flatMap(c => c.documents || [])
      .map(async d => ({ key: d.key, value: await blobToDataUrl(await documentBlob(d.key)) }))
  );
}
function validateVehicleDocuments(data) {
  data.documents = data.documents || [];
  if (!Array.isArray(data.documents)) throw Error("Netinkama dokumentų kopija.");
  const keys = new Set();
  for (const d of data.documents) {
    if (
      !d ||
      typeof d.key !== "string" ||
      !/^doc_[\w-]+$/.test(d.key) ||
      keys.has(d.key) ||
      typeof d.value !== "string" ||
      !/^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=\s]+$/.test(d.value) ||
      d.value.length > DOCUMENT_LIMIT * 1.4
    )
      throw Error("Netinkamas dokumentas kopijoje.");
    keys.add(d.key);
  }
  for (const c of data.state.cars) {
    if (c.documents !== undefined && !Array.isArray(c.documents))
      throw Error("Netinkamas dokumentų sąrašas.");
    for (const d of c.documents || []) {
      if (
        !d ||
        typeof d.id !== "string" ||
        !/^[-\w]+$/.test(d.id) ||
        !keys.has(d.key) ||
        typeof d.name !== "string" ||
        !DOC_TYPES.some(x => x[0] === d.kind) ||
        !Number.isFinite(d.size) ||
        d.size < 0
      )
        throw Error("Kopijoje trūksta dokumento.");
    }
  }
}
function vehicleStatusState(status, until) {
  const now = todayISO();
  if (status === "invalid") return { label: "Negalioja", cls: "bad" };
  if (status === "valid" && until && until < now) return { label: "Pasibaigė", cls: "bad" };
  if (status === "valid" && until) {
    const days = daysBetweenISO(now, until);
    return { label: "iki " + companyDate(until), cls: days <= 14 ? "warn" : "good" };
  }
  if (status === "valid") return { label: "Galioja", cls: "good" };
  return { label: "Nežinoma", cls: "neutral" };
}
function vehicleStatusChips(entity = {}) {
  const ta = vehicleStatusState(entity.taStatus || "unknown", entity.taUntil || "");
  const ins = vehicleStatusState(entity.insuranceStatus || "unknown", entity.insuranceUntil || "");
  const taLabel = ["good", "warn"].includes(ta.cls) ? "Galioja" : ta.label;
  const insLabel = ["good", "warn"].includes(ins.cls) ? "Galioja" : ins.label;
  return `<span class="vehicleStatusChip ${ta.cls}">TA ${escapeHTML(taLabel)}</span><span class="vehicleStatusChip ${ins.cls}">Draudimas ${escapeHTML(insLabel)}</span>`;
}
function hasCarDocument(car, kind) {
  return !!(car?.documents || []).some(d => d.kind === kind);
}
