// Buhalterija v3: PP pasirinkimas, registracijos duomenys, renderAccountingCenter perrašymai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function accountingDerivedSummaryApp(car) {
  const bought = car.createdDateISO || "",
    sold = car.soldDateISO || todayISO(),
    days = bought ? daysBetweenISO(bought, sold) : 0,
    total = carTotalCost(car),
    sale = Number(car.soldPrice || 0),
    margin = carNetProfit(car),
    pct = sale ? (margin / sale) * 100 : null;
  return (
    accountingSummary(car) +
    `\r\n\r\nIŠVESTINIAI DUOMENYS\r\nLaikymo dienos: ${Math.max(0, days)}\r\nBendra savikaina: ${moneyFmt(total)}\r\nGrynoji marža: ${moneyFmt(margin)}\r\nMarža nuo pardavimo: ${pct == null ? "—" : pct.toFixed(1) + " %"}\r\n`
  );
}
accountingDirectEntries = async function (cars, scope = "automobilis") {
  const entries = [],
    label = accountingScopeLabel(scope, cars);
  if (cars.length > 1 || ["week", "month", "queue"].includes(scope))
    entries.push({
      path: `00-${accountingSafeName(label)}.csv`,
      blob: new Blob([accountingWeekCsv(cars)], { type: "text/csv;charset=utf-8" })
    });
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i],
      folder = `${String(i + 1).padStart(2, "0")}-${accountingSafeName(car.name)}`;
    entries.push({
      path: `${folder}/Isvestines-ir-suvestine.txt`,
      blob: new Blob([accountingDerivedSummaryApp(car)], { type: "text/plain;charset=utf-8" })
    });
    for (let j = 0; j < (car.documents || []).length; j++) {
      const d = car.documents[j],
        type = DOC_TYPES.find(x => x[0] === d.kind)?.[1] || "Dokumentas",
        ext = (d.name.match(/\.[A-Za-z0-9]+$/) || [""])[0],
        base = accountingSafeName(d.name.replace(/\.[A-Za-z0-9]+$/, ""));
      entries.push({
        path: `${folder}/Dokumentai/${String(j + 1).padStart(2, "0")}-${accountingSafeName(type)}-${base}${ext}`,
        blob: await documentBlob(d.key)
      });
    }
  }
  return entries;
};
async function buildAccountingZipApp(cars, scope = "automobilis") {
  const entries = await accountingDirectEntries(cars, scope),
    label = accountingScopeLabel(scope, cars),
    zipEntries = entries.map(e => ({ name: e.path, blob: e.blob }));
  return {
    blob: await makeZip(zipEntries),
    name: `${window.AutoEasierProfile.fileName()}-${accountingSafeName(label)}-${todayISO()}.zip`,
    entries: entries.length
  };
}
shareAccountingCars = async function (cars, scope = "automobilis") {
  ensureAccounting();
  if (!cars.length) {
    toast("Šiam pateikimui nėra automobilių", "!");
    return false;
  }
  const btns = [
    ...document.querySelectorAll("[data-accounting-action],#sendAccountingQueue,[data-accounting-send-car]")
  ];
  btns.forEach(b => (b.disabled = true));
  try {
    const pack = await buildAccountingZipApp(cars, scope),
      email = state.accounting.email || "",
      label = accountingScopeLabel(scope, cars),
      subject = `${profileDisplayNameV57() || "AutoEasier"} — ${label}`,
      file = new File([pack.blob], pack.name, { type: "application/zip" });
    if (navigator.clipboard?.writeText)
      try {
        await navigator.clipboard.writeText(email);
      } catch (e) {}
    let shared = false;
    if (navigator.share) {
      try {
        const payload = { files: [file], title: subject, text: `Buhalterei: ${email}` };
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          shared = true;
        }
      } catch (e) {
        if (e?.name === "AbortError") return false;
        console.warn("share zip", e);
      }
    }
    if (!shared) {
      downloadAccountingBlob(pack.blob, pack.name);
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Paruoštas ZIP failas ${pack.name}. Kiekvienam automobiliui jame yra atskiras aplankas su dokumentais ir TXT su suvestine bei išvestiniais duomenimis.`)}`;
      toast("ZIP paruoštas · atidarytas laiškas", "✉️");
    } else toast("ZIP paruoštas dalinimuisi", "✓");
    cars.forEach(c => (c.accountingSharedAt = nowLabel()));
    if (scope === "queue")
      state.accounting.queue = state.accounting.queue.filter(id => !cars.some(c => c.id === id));
    state.accounting.history = Array.isArray(state.accounting.history) ? state.accounting.history : [];
    state.accounting.history.unshift({
      id: uid(),
      date: todayISO(),
      time: nowLabel(),
      type: scope,
      count: cars.length,
      status: shared ? "pateikta" : "paruošta"
    });
    state.accounting.history = state.accounting.history.slice(0, 100);
    addHistory("Buhalterija", `${label} · ZIP · ${cars.length} auto`, "📦");
    saveState();
    render();
    return shared;
  } catch (e) {
    console.error(e);
    toast(e.message || "Nepavyko paruošti ZIP", "⚠️");
    return false;
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
};
const __renderAccountingZipApp = renderAccountingCenter;
renderAccountingCenter = function () {
  __renderAccountingZipApp();
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  const hero = root.querySelector(".accountingHero");
  if (hero)
    hero.innerHTML =
      '<h3>Vienas ZIP buhalterei</h3><strong>Kiekvienam automobiliui — atskiras aplankas</strong><div class="accountingZipNote">Aplanke: visi tos auto dokumentai ir atskiras TXT su suvestine bei išvestiniais duomenimis.</div>';
  const send = document.getElementById("sendAccountingQueue");
  if (send) send.textContent = "Paruošti ZIP ir teikti";
  document.getElementById("saveAccountingFolders")?.remove();
  const queue = root.querySelector("#accountingQueueBlock .accountingBlockTitle");
  if (queue && !queue.querySelector(".accountingZipBadge"))
    queue.insertAdjacentHTML("beforeend", '<span class="accountingZipBadge">📦 ZIP</span>');
};
renderAccountingCenter = function () {
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  ensureAccounting();
  state.ui = state.ui || {};
  const panel = state.ui.accountingPanel || "";
  const queued = state.accounting.queue
    .map(id => state.cars.find(c => c.id === id && c.status === "parduotas"))
    .filter(Boolean);
  const week = accountingPeriodCars("week"),
    month = accountingPeriodCars("month");
  const qDocs = queued.reduce((n, c) => n + (c.documents || []).length, 0);
  const selectedCars = panel === "week" ? week : panel === "month" ? month : panel === "queue" ? queued : [];
  const selectedLabel =
    panel === "week"
      ? "Savaitės ataskaita"
      : panel === "month"
        ? "Mėnesio ataskaita"
        : panel === "queue"
          ? "Dokumentų eilė"
          : "";
  const selectedScope = panel === "week" ? "week" : panel === "month" ? "month" : "queue";
  const rows = selectedCars
    .map(
      c =>
        `<div class="accountingCleanRow"><button type="button" data-accounting-open-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><span>${(c.documents || []).length} dok. · ${moneyFmt(c.soldPrice)}</span></button>${panel === "queue" ? `<button class="accountingCleanRemove" type="button" data-accounting-queue-car="${escapeHTML(c.id)}" aria-label="Pašalinti">×</button>` : ""}</div>`
    )
    .join("");
  let workspace = "";
  if (panel === "pp") workspace = `<section class="accountingWorkspace show">${ppGeneratorHtml()}</section>`;
  else if (panel === "week" || panel === "month" || panel === "queue")
    workspace = `<section class="accountingWorkspace show"><div class="accountingWorkspaceHead"><div><span>${panel === "queue" ? "DOKUMENTAI" : "ATASKAITA"}</span><h3>${selectedLabel}</h3></div><b>${selectedCars.length} auto</b></div><div class="accountingCleanRows">${rows || `<div class="accountingCleanEmpty">${panel === "queue" ? "Dokumentų eilė tuščia." : "Šiam laikotarpiui parduotų automobilių nėra."}</div>`}</div><button class="btn accountingWorkspaceAction" id="accountingWorkspaceSend" type="button" ${selectedCars.length ? "" : "disabled"}>${panel === "queue" ? "Paruošti ZIP ir teikti" : "Paruošti ZIP"}</button></section>`;
  root.innerHTML = `<div class="accountingCleanHub">\n      <div class="accountingCleanActions">\n        <button type="button" class="accountingCleanAction ${panel === "pp" ? "active" : ""}" data-accounting-panel="pp"><span class="ico">🧾</span><span><strong>Generuoti PP</strong><small>Pirkimo / pardavimo sutartis</small></span><b>›</b></button>\n        <button type="button" class="accountingCleanAction ${panel === "week" ? "active" : ""}" data-accounting-panel="week"><span class="ico">7</span><span><strong>Savaitės ataskaita</strong><small>${week.length} auto</small></span><b>›</b></button>\n        <button type="button" class="accountingCleanAction ${panel === "month" ? "active" : ""}" data-accounting-panel="month"><span class="ico">30</span><span><strong>Mėnesio ataskaita</strong><small>${month.length} auto</small></span><b>›</b></button>\n        <button type="button" class="accountingCleanAction ${panel === "queue" ? "active" : ""}" data-accounting-panel="queue"><span class="ico">📁</span><span><strong>Dokumentai buhalterei</strong><small>${queued.length} auto · ${qDocs} dok.</small></span><b>›</b></button>\n      </div>\n      ${workspace}\n      <details class="accountingEmailFold"><summary><span>✉️</span><strong>Buhalterės el. paštas</strong><b>›</b></summary><div class="accountingEmailFoldBody"><input class="input" id="accountantEmail" type="email" autocomplete="email" value="${escapeHTML(state.accounting.email || "")}"><button class="btn secondary" id="saveAccountantEmail" type="button">Išsaugoti</button></div></details>\n    </div>`;
  root.querySelectorAll("[data-accounting-panel]").forEach(
    b =>
      (b.onclick = () => {
        state.ui.accountingPanel =
          state.ui.accountingPanel === b.dataset.accountingPanel ? "" : b.dataset.accountingPanel;
        saveState();
        renderAccountingCenter();
      })
  );
  root
    .querySelectorAll("[data-accounting-open-car]")
    .forEach(b => (b.onclick = () => openCar(b.dataset.accountingOpenCar)));
  document
    .getElementById("accountingWorkspaceSend")
    ?.addEventListener("click", () => shareAccountingCars(selectedCars, selectedScope));
  document.getElementById("saveAccountantEmail")?.addEventListener("click", () => {
    const input = document.getElementById("accountantEmail"),
      value = (input?.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast("Patikrink el. pašto adresą", "!");
      return;
    }
    state.accounting.email = value;
    saveState();
    toast("El. paštas išsaugotas", "✓");
  });
  if (panel === "pp") bindPpGenerator();
};
function registrationDataFieldsV3(p, c = {}) {
  const regNo = c.registrationDoc || c.regDoc || "";
  const regMake = c.regMake || "";
  const regModel = c.regModel || "";
  return `<details class="vehicleRegData" id="${p}registrationData"><summary><span class="regIco">📄</span><span class="regTitle"><strong>＋ Dokumento duomenys</strong></span><span class="regChev">›</span></summary><div class="vehicleRegBody"><div class="vehicleRegGrid"><div class="field"><label for="${p}regMake">Markė (D.1)</label><input class="input" id="${p}regMake" value="${escapeHTML(regMake)}" autocapitalize="characters" autocomplete="off"></div><div class="field"><label for="${p}regModel">Modelis (D.3)</label><input class="input" id="${p}regModel" value="${escapeHTML(regModel)}" autocapitalize="characters" autocomplete="off"></div><div class="field wide"><label for="${p}registrationDoc">Registracijos liudijimo serija ir numeris</label><input class="input" id="${p}registrationDoc" maxlength="12" value="${escapeHTML(regNo)}" placeholder="Pvz. Y407932" autocapitalize="characters" autocomplete="off"></div></div></div></details>`;
}
function injectNewRegistrationDataV3() {
  const btn = document.getElementById("addCarBtn");
  if (!btn || document.getElementById("newVehicleregistrationData")) return;
  btn.insertAdjacentHTML("beforebegin", registrationDataFieldsV3("newVehicle", {}));
}
const __readVehicleFieldsV3 = readVehicleFields;
readVehicleFields = function (p) {
  const o = __readVehicleFieldsV3(p);
  const regDoc = (document.getElementById(p + "registrationDoc")?.value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const regMake = (document.getElementById(p + "regMake")?.value || "").trim().toUpperCase();
  const regModel = (document.getElementById(p + "regModel")?.value || "").trim().toUpperCase();
  if (regDoc && !/^[A-Z][0-9]{5,8}$/.test(regDoc))
    throw Error("Patikrink registracijos liudijimo seriją ir numerį, pvz. Y407932.");
  return { ...o, registrationDoc: regDoc, regMake, regModel };
};
const __vehicleFieldsV3 = vehicleFields;
vehicleFields = function (p, c = {}) {
  return __vehicleFieldsV3(p, c) + registrationDataFieldsV3(p, c);
};
injectNewRegistrationDataV3();
const __ppParseRegistrationTextV3 = ppParseRegistrationText;
ppParseRegistrationText = function (text = "") {
  const d = __ppParseRegistrationTextV3(text) || {};
  const up = ppNormalizeOcr(text);
  const lines = up
    .split("\n")
    .map(x => x.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const top = lines.slice(0, 24);
  let serial = "";
  for (const line of top) {
    let m = line.match(/^([A-Z])\s*[- ]?\s*([0-9]{6,7})$/);
    if (
      m &&
      !["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "P", "Q", "R", "S", "T", "V"].includes(m[1])
    ) {
      serial = m[1] + m[2];
      break;
    }
    m = line.match(/(?:^|\s)([A-Z])\s+([0-9]{6,7})(?:\s|$)/);
    if (
      m &&
      !["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "P", "Q", "R", "S", "T", "V"].includes(m[1])
    ) {
      serial = m[1] + m[2];
      break;
    }
  }
  if (serial) d.regDoc = serial;
  return d;
};
ppPrefillFromCar = function (car) {
  if (!car) return;
  ppSourceCarId = car.id;
  const parts = String(car.name || "")
      .trim()
      .split(/\s+/),
    fallbackMake = parts.shift() || "",
    fallbackModel = parts.join(" ");
  ppApplyVehicleData({
    vin: car.vin || "",
    make: car.regMake || fallbackMake,
    model: car.regModel || fallbackModel,
    plate: car.plate || "",
    regDoc: car.registrationDoc || car.regDoc || ""
  });
  const m = document.getElementById("ppMileage");
  if (m && car.mileage != null) m.value = car.mileage;
  const sdk = document.getElementById("ppSdk");
  if (sdk) sdk.value = car.sdk || "";
  const p = document.getElementById("ppPrice");
  if (p) p.value = car.status === "parduotas" ? Number(car.soldPrice || 0) : Number(car.buyPrice || 0);
  const ta = document.getElementById("ppTa");
  if (ta && car.taStatus)
    ta.value = car.taStatus === "valid" ? "valid" : car.taStatus === "invalid" ? "invalid" : "";
  const ctx = document.getElementById("ppSourceContextV3");
  if (ctx) ctx.innerHTML = `Naudojami automobilio duomenys<b>${escapeHTML(car.name)}</b>`;
};
function accountingPpChooserV3() {
  const mode = state.ui?.accountingPpMode || "";
  const carId = state.ui?.accountingPpCarId || "";
  const car = state.cars.find(c => c.id === carId);
  if (!mode)
    return `<section class="accountingWorkspace show accountingSourceChooser"><div class="accountingSourceTitle"><h3>Kaip generuoti PP?</h3><span>Pasirink šaltinį</span></div><div class="accountingSourceGrid"><button class="accountingSourceTile" type="button" data-pp-source-mode="car"><span class="ico">🚗</span><strong>Iš esamos auto</strong><small>Naudoti kortelėje išsaugotus duomenis</small></button><button class="accountingSourceTile" type="button" data-pp-source-mode="camera"><span class="ico">📷</span><strong>Fotografuoti</strong><small>Nuskaityti registracijos liudijimą dabar</small></button><button class="accountingSourceTile" type="button" data-pp-source-mode="gallery"><span class="ico">🖼️</span><strong>Iš galerijos</strong><small>Pasirinkti jau turimą dokumento foto</small></button></div></section>`;
  if (mode === "car" && !car)
    return `<section class="accountingWorkspace show accountingSourceChooser"><button class="accountingBackSource" type="button" data-pp-source-back>← Kitas būdas</button><div class="accountingSourceTitle"><h3>Pasirink automobilį</h3><span>${state.cars.length} auto</span></div><div class="accountingCarPicker">${state.cars.map(c => `<button class="accountingCarPick" type="button" data-pp-pick-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><span>${escapeHTML(c.registrationDoc || "")}</span></button>`).join("") || '<div class="accountingCleanEmpty">Automobilių dar nėra</div>'}</div></section>`;
  const sourceText = car
    ? `<div class="ppSourceContext" id="ppSourceContextV3">Naudojami automobilio duomenys<b>${escapeHTML(car.name)}</b></div>`
    : mode === "camera"
      ? '<div class="ppSourceContext">Šaltinis<b>Fotografuok registracijos liudijimą</b></div>'
      : '<div class="ppSourceContext">Šaltinis<b>Pasirink registracijos liudijimo nuotrauką</b></div>';
  return `<section class="accountingWorkspace show"><button class="accountingBackSource" type="button" data-pp-source-back>← Kitas būdas</button>${sourceText}${ppGeneratorHtml()}</section>`;
}
renderAccountingCenter = function () {
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  ensureAccounting();
  state.ui = state.ui || {};
  const panel = state.ui.accountingPanel || "";
  const queued = state.accounting.queue
      .map(id => state.cars.find(c => c.id === id && c.status === "parduotas"))
      .filter(Boolean),
    week = accountingPeriodCars("week"),
    month = accountingPeriodCars("month");
  const qDocs = queued.reduce((n, c) => n + (c.documents || []).length, 0);
  let workspace = "";
  let selectedCars = [],
    selectedScope = "queue";
  if (panel === "pp") workspace = accountingPpChooserV3();
  else if (panel === "week" || panel === "month" || panel === "queue") {
    selectedCars = panel === "week" ? week : panel === "month" ? month : queued;
    selectedScope = panel === "week" ? "week" : panel === "month" ? "month" : "queue";
    const label =
      panel === "week"
        ? "Savaitės ataskaita"
        : panel === "month"
          ? "Mėnesio ataskaita"
          : "Dokumentai buhalterei";
    workspace = `<section class="accountingWorkspace show"><div class="accountingWorkspaceHead"><div><span>${panel === "queue" ? "DOKUMENTAI" : "ATASKAITA"}</span><h3>${label}</h3></div><b>${selectedCars.length} auto</b></div><div class="accountingCleanRows">${selectedCars.map(c => `<div class="accountingCleanRow"><button type="button" data-accounting-open-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><span>${(c.documents || []).length} dok. · ${moneyFmt(c.soldPrice)}</span></button>${panel === "queue" ? `<button class="accountingCleanRemove" type="button" data-accounting-queue-car="${escapeHTML(c.id)}">×</button>` : ""}</div>`).join("") || '<div class="accountingCleanEmpty">Šiuo metu įrašų nėra.</div>'}</div><button class="btn accountingWorkspaceAction" id="accountingWorkspaceSend" type="button" ${selectedCars.length ? "" : "disabled"}>${panel === "queue" ? "Paruošti ZIP ir teikti" : "Paruošti ZIP"}</button></section>`;
  }
  root.innerHTML = `<div class="accountingCleanHub"><div class="accountingCleanActions"><button type="button" class="accountingCleanAction ${panel === "pp" ? "active" : ""}" data-accounting-panel="pp"><span class="ico">🧾</span><span><strong>Generuoti PP</strong><small>Sutartis</small></span><b>›</b></button><button type="button" class="accountingCleanAction ${panel === "week" ? "active" : ""}" data-accounting-panel="week"><span class="ico">7</span><span><strong>Savaitės ataskaita</strong><small>${week.length} auto</small></span><b>›</b></button><button type="button" class="accountingCleanAction ${panel === "month" ? "active" : ""}" data-accounting-panel="month"><span class="ico">30</span><span><strong>Mėnesio ataskaita</strong><small>${month.length} auto</small></span><b>›</b></button><button type="button" class="accountingCleanAction ${panel === "queue" ? "active" : ""}" data-accounting-panel="queue"><span class="ico">📁</span><span><strong>Dokumentai buhalterei</strong><small>${queued.length} auto · ${qDocs} dok.</small></span><b>›</b></button></div>${workspace}<details class="accountingEmailFold"><summary><span>✉️</span><strong>Buhalterės el. paštas</strong><b>›</b></summary><div class="accountingEmailFoldBody"><input class="input" id="accountantEmail" type="email" value="${escapeHTML(state.accounting.email || "")}"><button class="btn secondary" id="saveAccountantEmail" type="button">Išsaugoti</button></div></details></div>`;
  root.querySelectorAll("[data-accounting-panel]").forEach(
    b =>
      (b.onclick = () => {
        const next = b.dataset.accountingPanel;
        state.ui.accountingPanel = state.ui.accountingPanel === next ? "" : next;
        if (next !== "pp") {
          state.ui.accountingPpMode = "";
          state.ui.accountingPpCarId = "";
        }
        saveState();
        renderAccountingCenter();
      })
  );
  root.querySelectorAll("[data-pp-source-mode]").forEach(
    b =>
      (b.onclick = () => {
        state.ui.accountingPpMode = b.dataset.ppSourceMode;
        state.ui.accountingPpCarId = "";
        saveState();
        renderAccountingCenter();
      })
  );
  root.querySelectorAll("[data-pp-source-back]").forEach(
    b =>
      (b.onclick = () => {
        state.ui.accountingPpMode = "";
        state.ui.accountingPpCarId = "";
        saveState();
        renderAccountingCenter();
      })
  );
  root.querySelectorAll("[data-pp-pick-car]").forEach(
    b =>
      (b.onclick = () => {
        state.ui.accountingPpCarId = b.dataset.ppPickCar;
        saveState();
        renderAccountingCenter();
      })
  );
  root
    .querySelectorAll("[data-accounting-open-car]")
    .forEach(b => (b.onclick = () => openCar(b.dataset.accountingOpenCar)));
  document
    .getElementById("accountingWorkspaceSend")
    ?.addEventListener("click", () => shareAccountingCars(selectedCars, selectedScope));
  document.getElementById("saveAccountantEmail")?.addEventListener("click", () => {
    const input = document.getElementById("accountantEmail"),
      value = (input?.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast("Patikrink el. pašto adresą", "!");
      return;
    }
    state.accounting.email = value;
    saveState();
    toast("El. paštas išsaugotas", "✓");
  });
  if (panel === "pp" && state.ui.accountingPpMode) {
    bindPpGenerator(state.ui.accountingPpCarId || null);
    if (state.ui.accountingPpCarId)
      ppPrefillFromCar(state.cars.find(c => c.id === state.ui.accountingPpCarId));
  }
};
openPpGeneratorForCar = function (carId) {
  state.ui = state.ui || {};
  state.ui.accountingPanel = "pp";
  state.ui.accountingPpMode = "car";
  state.ui.accountingPpCarId = carId;
  saveState();
  closeSheet();
  companyGo("accounting");
  setTimeout(() => {
    renderAccountingCenter();
    document.getElementById("ppGeneratorCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
};
renderCompanyHome = function () {
  const root = document.getElementById("companyHome");
  if (!root) return;
  state.ui = state.ui || {};
  state.ui.homeGroups = state.ui.homeGroups || { cars: false, other: false };
  const must = todayRequiredItemsApp();
  const carGroups = homeCarTaskGroupsApp(),
    carTaskCount = carGroups.reduce((n, g) => n + g.tasks.length, 0),
    other = homeOtherTasksApp();
  const dateLabel = new Date()
    .toLocaleDateString("lt-LT", { weekday: "short", month: "short", day: "numeric" })
    .replaceAll(".", "");
  const todayRow = t =>
    `<button class="homeTodayTask ${t.late ? "late" : ""}" type="button" data-company-kind="${t.kind}" data-company-id="${escapeHTML(t.id)}"><span class="homeTodayTaskMain"><strong>${escapeHTML(t.action)}</strong><b>${escapeHTML(t.entity)}</b></span><span class="homeTodayTaskStatus">${t.late ? "Vėluoja" : "Šiandien"}</span></button>`;
  root.innerHTML = `\n      <div class="homeDashHead"><h2>Pagrindinis</h2><span class="homeDashDate">${escapeHTML(dateLabel)}</span></div>\n      <section class="homeTodayPanel">\n        <div class="homeTodayHead"><span class="homeFoldIcon">✓</span><span class="homeFoldTitle"><strong>Šiandienos užduotys</strong></span><span class="homeTodayCount">${must.length}</span></div>\n        <div class="homeTodayBody">${must.length ? must.map(todayRow).join("") : '<div class="homeTodayEmpty"><span>✓</span><strong>Viskas atlikta</strong></div>'}</div>\n      </section>\n      <div class="homeTaskStacks">\n        <details class="homeTaskFold" data-home-group="cars" ${state.ui.homeGroups.cars ? "open" : ""}>\n          <summary><span class="homeFoldIcon">🚗</span><span class="homeFoldTitle"><strong>Automobilių užduotys</strong></span><span class="homeFoldCount">${carTaskCount}</span><span class="homeFoldChevron">›</span></summary>\n          <div class="homeFoldBody">${
    carGroups.length
      ? carGroups
          .map(
            g =>
              `<section class="homeCarBlock"><div class="homeCarHead"><strong>${escapeHTML(g.car.name)}</strong><span>${g.tasks.length}</span></div><div class="homeFoldList">${g.tasks
                .map(t => {
                  const due = homeTaskDueApp(t.dueDate || "");
                  return `<button class="homeFoldTask" type="button" data-company-kind="car" data-company-id="${escapeHTML(g.car.id)}"><strong>${escapeHTML(t.name)}</strong><span class="homeFoldDue ${due.cls}">${escapeHTML(due.label)}</span></button>`;
                })
                .join("")}</div></section>`
          )
          .join("")
      : '<div class="homeFoldEmpty">Užduočių nėra</div>'
  }</div>\n        </details>\n        <details class="homeTaskFold" data-home-group="other" ${state.ui.homeGroups.other ? "open" : ""}>\n          <summary><span class="homeFoldIcon">✓</span><span class="homeFoldTitle"><strong>Kitos užduotys</strong></span><span class="homeFoldCount">${other.length}</span><span class="homeFoldChevron">›</span></summary>\n          <div class="homeFoldBody"><div class="homeFoldList" style="padding-top:12px">${
    other.length
      ? other
          .map(t => {
            const due = homeTaskDueApp(t.dueDate || "");
            return `<button class="homeFoldTask" type="button" data-company-kind="task" data-company-id="${escapeHTML(t.id)}"><strong>${escapeHTML(t.title)}</strong><span class="homeFoldDue ${due.cls}">${escapeHTML(due.label)}</span></button>`;
          })
          .join("")
      : '<div class="homeFoldEmpty">Užduočių nėra</div>'
  }</div></div>\n        </details>\n      </div>`;
  root.querySelectorAll("details[data-home-group]").forEach(el =>
    el.addEventListener("toggle", () => {
      state.ui.homeGroups[el.dataset.homeGroup] = el.open;
      saveState();
    })
  );
  document.querySelectorAll(".navBtn").forEach(b => {
    if (b.dataset.view === state.selectedView) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
};
accountingPpChooserV3 = function () {
  const mode = state.ui?.accountingPpMode || "";
  const carId = state.ui?.accountingPpCarId || "";
  const car = state.cars.find(c => c.id === carId);
  if (!mode)
    return `<section class="accountingWorkspace show accountingSourceChooser"><div class="accountingSourceTitle"><h3>Pasirink šaltinį</h3></div><div class="accountingSourceGrid"><button class="accountingSourceTile" type="button" data-pp-source-mode="car"><span class="ico">🚗</span><strong>Iš esamos auto</strong></button><button class="accountingSourceTile" type="button" data-pp-source-mode="camera"><span class="ico">📷</span><strong>Fotografuoti</strong></button><button class="accountingSourceTile" type="button" data-pp-source-mode="gallery"><span class="ico">🖼️</span><strong>Iš galerijos</strong></button></div></section>`;
  if (mode === "car" && !car)
    return `<section class="accountingWorkspace show accountingSourceChooser"><button class="accountingBackSource" type="button" data-pp-source-back>← Atgal</button><div class="accountingSourceTitle"><h3>Pasirink automobilį</h3></div><div class="accountingCarPicker">${state.cars.map(c => `<button class="accountingCarPick" type="button" data-pp-pick-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong>${c.registrationDoc ? `<span>${escapeHTML(c.registrationDoc)}</span>` : ""}</button>`).join("") || '<div class="accountingCleanEmpty">Automobilių nėra</div>'}</div></section>`;
  const sourceText = car
    ? `<div class="ppSourceContext" id="ppSourceContextV3"><b>${escapeHTML(car.name)}</b></div>`
    : "";
  return `<section class="accountingWorkspace show"><button class="accountingBackSource" type="button" data-pp-source-back>← Atgal</button>${sourceText}${ppGeneratorHtml()}</section>`;
};
renderAccountingCenter = function () {
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  ensureAccounting();
  state.ui = state.ui || {};
  const panel = state.ui.accountingPanel || "";
  const queued = state.accounting.queue
      .map(id => state.cars.find(c => c.id === id && c.status === "parduotas"))
      .filter(Boolean),
    week = accountingPeriodCars("week"),
    month = accountingPeriodCars("month");
  let workspace = "",
    selectedCars = [],
    selectedScope = "queue";
  if (panel === "pp") workspace = accountingPpChooserV3();
  else if (panel === "week" || panel === "month" || panel === "queue") {
    selectedCars = panel === "week" ? week : panel === "month" ? month : queued;
    selectedScope = panel === "week" ? "week" : panel === "month" ? "month" : "queue";
    const label =
      panel === "week"
        ? "Savaitės ataskaita"
        : panel === "month"
          ? "Mėnesio ataskaita"
          : "Dokumentai buhalterei";
    workspace = `<section class="accountingWorkspace show"><div class="accountingWorkspaceHead"><h3>${label}</h3><b>${selectedCars.length}</b></div><div class="accountingCleanRows">${selectedCars.map(c => `<div class="accountingCleanRow"><button type="button" data-accounting-open-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><span>${(c.documents || []).length} dok. · ${moneyFmt(c.soldPrice)}</span></button>${panel === "queue" ? `<button class="accountingCleanRemove" type="button" data-accounting-queue-car="${escapeHTML(c.id)}" aria-label="Pašalinti">×</button>` : ""}</div>`).join("") || '<div class="accountingCleanEmpty">Įrašų nėra</div>'}</div><button class="btn accountingWorkspaceAction" id="accountingWorkspaceSend" type="button" ${selectedCars.length ? "" : "disabled"}>${panel === "queue" ? "Paruošti ZIP ir teikti" : "Paruošti ZIP"}</button></section>`;
  }
  root.innerHTML = `<div class="accountingCleanHub"><div class="accountingCleanActions"><button type="button" class="accountingCleanAction ${panel === "pp" ? "active" : ""}" data-accounting-panel="pp"><span class="ico">🧾</span><strong>Generuoti PP</strong><b>›</b></button><button type="button" class="accountingCleanAction ${panel === "week" ? "active" : ""}" data-accounting-panel="week"><span class="ico">7</span><strong>Savaitės ataskaita</strong><b>›</b></button><button type="button" class="accountingCleanAction ${panel === "month" ? "active" : ""}" data-accounting-panel="month"><span class="ico">30</span><strong>Mėnesio ataskaita</strong><b>›</b></button><button type="button" class="accountingCleanAction ${panel === "queue" ? "active" : ""}" data-accounting-panel="queue"><span class="ico">📁</span><strong>Dokumentai buhalterei</strong><b>›</b></button></div>${workspace}<details class="accountingEmailFold"><summary><span>✉️</span><strong>Buhalterės el. paštas</strong><b>›</b></summary><div class="accountingEmailFoldBody"><input class="input" id="accountantEmail" type="email" value="${escapeHTML(state.accounting.email || "")}"><button class="btn secondary" id="saveAccountantEmail" type="button">Išsaugoti</button></div></details></div>`;
  root.querySelectorAll("[data-accounting-panel]").forEach(
    b =>
      (b.onclick = () => {
        const next = b.dataset.accountingPanel;
        state.ui.accountingPanel = state.ui.accountingPanel === next ? "" : next;
        if (next !== "pp") {
          state.ui.accountingPpMode = "";
          state.ui.accountingPpCarId = "";
        }
        saveState();
        renderAccountingCenter();
      })
  );
  root.querySelectorAll("[data-pp-source-mode]").forEach(
    b =>
      (b.onclick = () => {
        state.ui.accountingPpMode = b.dataset.ppSourceMode;
        state.ui.accountingPpCarId = "";
        saveState();
        renderAccountingCenter();
      })
  );
  root.querySelectorAll("[data-pp-source-back]").forEach(
    b =>
      (b.onclick = () => {
        state.ui.accountingPpMode = "";
        state.ui.accountingPpCarId = "";
        saveState();
        renderAccountingCenter();
      })
  );
  root.querySelectorAll("[data-pp-pick-car]").forEach(
    b =>
      (b.onclick = () => {
        state.ui.accountingPpCarId = b.dataset.ppPickCar;
        saveState();
        renderAccountingCenter();
      })
  );
  root
    .querySelectorAll("[data-accounting-open-car]")
    .forEach(b => (b.onclick = () => openCar(b.dataset.accountingOpenCar)));
  document
    .getElementById("accountingWorkspaceSend")
    ?.addEventListener("click", () => shareAccountingCars(selectedCars, selectedScope));
  document.getElementById("saveAccountantEmail")?.addEventListener("click", () => {
    const input = document.getElementById("accountantEmail"),
      value = (input?.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast("Patikrink el. pašto adresą", "!");
      return;
    }
    state.accounting.email = value;
    saveState();
    toast("El. paštas išsaugotas", "✓");
  });
  if (panel === "pp" && state.ui.accountingPpMode) {
    bindPpGenerator(state.ui.accountingPpCarId || null);
    if (state.ui.accountingPpCarId)
      ppPrefillFromCar(state.cars.find(c => c.id === state.ui.accountingPpCarId));
  }
};
const __renderProMax = render;
render = async function () {
  const r = await __renderProMax();
  renderContacts();
  renderOtherTasksPro();
  renderGarageWhatApp();
  return r;
};
vehicleFields = function (p, c = {}) {
  let html = __vehicleFieldsV3(p, c);
  const reg = (c.registrationDoc || c.regDoc || "").toUpperCase();
  const field = `<div class="field vehicleWide vehicleRegistrationInline"><label for="${p}registrationDoc">Registracijos liudijimo serija ir nr.</label><input class="input" id="${p}registrationDoc" maxlength="12" value="${escapeHTML(reg)}" placeholder="Y407932" autocapitalize="characters" autocomplete="off"></div>`;
  const needle = `<div class="field"><label for="${p}taStatus">TA</label>`;
  return html.includes(needle)
    ? html.replace(needle, field + needle)
    : html.replace("</div></details>", field + "</div></details>");
};
readVehicleFields = function (p) {
  const o = __readVehicleFieldsV3(p);
  const reg = (document.getElementById(p + "registrationDoc")?.value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (reg && !/^[A-Z][0-9]{5,8}$/.test(reg))
    throw Error("Patikrink registracijos liudijimo seriją ir nr., pvz. Y407932.");
  return { ...o, registrationDoc: reg };
};
function patchNewVehicleRegistrationApp() {
  document.getElementById("newVehicleregistrationData")?.remove();
  if (document.getElementById("newVehicleregistrationDoc")) return;
  const ta = document.getElementById("newVehicletaStatus");
  const holder = ta?.closest(".field");
  if (holder)
    holder.insertAdjacentHTML(
      "beforebegin",
      `<div class="field vehicleWide vehicleRegistrationInline"><label for="newVehicleregistrationDoc">Registracijos liudijimo serija ir nr.</label><input class="input" id="newVehicleregistrationDoc" maxlength="12" placeholder="Y407932" autocapitalize="characters" autocomplete="off"></div>`
    );
}
patchNewVehicleRegistrationApp();
const __renderCarSheetV8 = renderCarSheet;
renderCarSheet = function (c) {
  __renderCarSheetV8(c);
  const body = document.querySelector("#sheet .premiumDetailBody");
  if (!body) return;
  document.querySelectorAll('#sheet [id$="registrationData"]').forEach(x => x.remove());
  const infoDetails = [...body.querySelectorAll(".vehicleDetails")].find(d =>
    d.querySelector(".vehicleInfo")
  );
  if (infoDetails) {
    infoDetails.id = "carDetailInfo";
    const dl = infoDetails.querySelector(".vehicleInfo");
    if (dl && !dl.querySelector("[data-registration-view]"))
      dl.insertAdjacentHTML(
        "beforeend",
        `<div data-registration-view><dt>Registracijos liudijimo serija ir nr.</dt><dd>${escapeHTML(c.registrationDoc || c.regDoc || "—")}</dd></div>`
      );
  }
  const checklist = body.querySelector(".premiumChecklist");
  if (checklist) {
    const sec = checklist.closest(".premiumDetailBody") ? checklist : checklist.parentElement;
    checklist.id = "carDetailTasks";
  }
  const media = body.querySelector(".carMediaSection");
  if (media) media.id = "carDetailPhotos";
  const docs = body.querySelector(".vehicleDocuments");
  if (docs) docs.id = "carDetailDocuments";
  body.querySelector(".carDetailQuick")?.remove();
};
