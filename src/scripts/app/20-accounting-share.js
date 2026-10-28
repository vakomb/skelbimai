// Buhalterijos dokumentų aplankai ir dalinimasis.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

async function accountingDirectEntries(cars, scope = "automobilis") {
  const entries = [];
  if (cars.length > 1)
    entries.push({
      path: "00-Savaites-suvestine.csv",
      blob: new Blob([accountingWeekCsv(cars)], { type: "text/csv;charset=utf-8" })
    });
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i],
      folder = `${String(i + 1).padStart(2, "0")}-${accountingSafeName(car.name)}`;
    entries.push({
      path: `${folder}/Suvestine.txt`,
      blob: new Blob([accountingSummary(car)], { type: "text/plain;charset=utf-8" })
    });
    for (let j = 0; j < (car.documents || []).length; j++) {
      const d = car.documents[j],
        type = DOC_TYPES.find(x => x[0] === d.kind)?.[1] || "Dokumentas";
      const ext = (d.name.match(/\.[A-Za-z0-9]+$/) || [""])[0],
        base = accountingSafeName(d.name.replace(/\.[A-Za-z0-9]+$/, ""));
      entries.push({
        path: `${folder}/Dokumentai/${String(j + 1).padStart(2, "0")}-${accountingSafeName(type)}-${base}${ext}`,
        blob: await documentBlob(d.key)
      });
    }
  }
  return entries;
}
function accountingShareFileName(path) {
  return path.replace(/\//g, "__");
}
async function accountingDirectFiles(cars, scope = "automobilis") {
  const entries = await accountingDirectEntries(cars, scope);
  return {
    entries,
    files: entries.map(
      e =>
        new File([e.blob], accountingShareFileName(e.path), {
          type: e.blob.type || "application/octet-stream"
        })
    )
  };
}
async function saveAccountingFolders(cars, scope = "savaite") {
  if (!cars.length) {
    toast("Nėra ką išsaugoti", "!");
    return false;
  }
  if (!window.showDirectoryPicker) {
    toast(
      "Šiame įrenginyje aplankų kūrimas nepalaikomas. Naudok „Teikti buhalterei“ — failai bus siunčiami tiesiogiai.",
      "📁"
    );
    return false;
  }
  try {
    const picked = await window.showDirectoryPicker({ mode: "readwrite" });
    const root = await picked.getDirectoryHandle(
      `${window.AutoEasierProfile.fileName()}-${accountingSafeName(scope)}-${todayISO()}`,
      { create: true }
    );
    const entries = await accountingDirectEntries(cars, scope);
    for (const e of entries) {
      const parts = e.path.split("/");
      let dir = root;
      for (let i = 0; i < parts.length - 1; i++)
        dir = await dir.getDirectoryHandle(parts[i], { create: true });
      const fh = await dir.getFileHandle(parts.at(-1), { create: true }),
        w = await fh.createWritable();
      await w.write(e.blob);
      await w.close();
    }
    toast("Buhalterijos aplankai išsaugoti", "✓");
    return true;
  } catch (e) {
    if (e?.name !== "AbortError") {
      console.error(e);
      toast("Nepavyko išsaugoti aplankų", "⚠️");
    }
    return false;
  }
}
async function downloadAccountingFiles(files) {
  for (let i = 0; i < files.length; i++) {
    downloadAccountingBlob(files[i], files[i].name);
    if (i && i % 5 === 0) await new Promise(r => setTimeout(r, 120));
  }
}
shareAccountingCars = async function (cars, scope = "automobilis") {
  ensureAccounting();
  if (!cars.length) {
    toast("Nėra dokumentų pateikimui", "!");
    return false;
  }
  const btns = [
    ...document.querySelectorAll("[data-accounting-send-car],#sendAccountingWeek,#saveAccountingFolders")
  ];
  btns.forEach(b => (b.disabled = true));
  try {
    const pack = await accountingDirectFiles(cars, scope),
      email = state.accounting.email || "",
      subject = `${profileDisplayNameV57() || "AutoEasier"} — ${scope === "savaite" ? "savaitės buhalterija" : cars[0].name}`;
    if (navigator.clipboard?.writeText)
      try {
        await navigator.clipboard.writeText(email);
      } catch (e) {}
    let shared = false;
    if (navigator.share) {
      try {
        const payload = { files: pack.files, title: subject, text: `Buhalterei: ${email}` };
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          shared = true;
        }
      } catch (e) {
        if (e?.name === "AbortError") return false;
        console.warn("share files", e);
      }
    }
    if (!shared) {
      await downloadAccountingFiles(pack.files);
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("Dokumentai paruošti atskirais failais pagal automobilį. Prisegkite ką tik atsisiųstus failus prie šio laiško.")}`;
      toast("Failai atsisiųsti atskirai · atidarytas laiškas", "✉️");
    } else toast("Dokumentai paruošti dalinimuisi be ZIP", "✓");
    cars.forEach(c => (c.accountingSharedAt = nowLabel()));
    if (scope === "savaite")
      state.accounting.queue = state.accounting.queue.filter(id => !cars.some(c => c.id === id));
    state.accounting.history.unshift({
      id: uid(),
      date: todayISO(),
      time: nowLabel(),
      type: scope,
      count: cars.length,
      status: shared ? "pateikta" : "paruošta"
    });
    state.accounting.history = state.accounting.history.slice(0, 100);
    saveState();
    render();
    return shared;
  } catch (e) {
    console.error(e);
    toast(e.message || "Nepavyko paruošti dokumentų", "⚠️");
    return false;
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
};
const __renderAccountingFinal = renderAccountingCenter;
renderAccountingCenter = function () {
  __renderAccountingFinal();
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  const cars = state.accounting.queue
    .map(id => state.cars.find(c => c.id === id && c.status === "parduotas"))
    .filter(Boolean);
  const title = [...root.querySelectorAll(".accountingTitleRow h3")].find(x =>
    x.textContent.includes("Savait")
  );
  if (title) title.textContent = "Savaitės dokumentai";
  const send = document.getElementById("sendAccountingWeek");
  if (send) send.textContent = "Teikti buhalterei";
  const panel = send?.closest(".accountingPanel");
  if (panel && !panel.querySelector("#saveAccountingFolders")) {
    const wrap = document.createElement("div");
    wrap.className = "accountingFolderActions";
    send.replaceWith(wrap);
    wrap.appendChild(send);
    const save = document.createElement("button");
    save.className = "btn secondary";
    save.id = "saveAccountingFolders";
    save.type = "button";
    save.textContent = "Išsaugoti aplankus";
    save.disabled = !cars.length;
    save.onclick = () => saveAccountingFolders(cars, "savaite");
    wrap.appendChild(save);
  }
  const info = root.querySelector(".accountingInfo");
  if (info) info.innerHTML = '<strong class="accountingDirectBadge">📎 Be ZIP · tiesioginiai failai</strong>';
};
document.addEventListener("focusin", e => {
  if (e.target.matches("input,select,textarea"))
    document.documentElement.style.setProperty("--focus-lock", "1");
});
document.addEventListener("focusout", () => document.documentElement.style.removeProperty("--focus-lock"));
function proWeekStartISO() {
  const d = parseISODateLocal(todayISO()) || new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toISODateLocal(d);
}
function accountingPeriodCars(scope) {
  const sold = (state.cars || []).filter(c => c.status === "parduotas" && c.soldDateISO);
  if (scope === "week")
    return sold.filter(c => c.soldDateISO >= proWeekStartISO() && c.soldDateISO <= todayISO());
  if (scope === "month") return sold.filter(c => (c.soldDateISO || "").startsWith(currentMonthKey()));
  return [];
}
function accountingScopeLabel(scope, cars = []) {
  if (scope === "week") return "Savaitės ataskaita";
  if (scope === "month") return "Mėnesio ataskaita";
  if (scope === "queue") return "Dokumentų eilė";
  return cars[0]?.name || "Automobilis";
}
accountingDirectEntries = async function (cars, scope = "automobilis") {
  const entries = [],
    label = accountingScopeLabel(scope, cars);
  if (cars.length > 1 || scope === "week" || scope === "month" || scope === "queue")
    entries.push({
      path: `00-${accountingSafeName(label)}.csv`,
      blob: new Blob([accountingWeekCsv(cars)], { type: "text/csv;charset=utf-8" })
    });
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i],
      folder = `${String(i + 1).padStart(2, "0")}-${accountingSafeName(car.name)}`;
    entries.push({
      path: `${folder}/Suvestine.txt`,
      blob: new Blob([accountingSummary(car)], { type: "text/plain;charset=utf-8" })
    });
    for (let j = 0; j < (car.documents || []).length; j++) {
      const d = car.documents[j],
        type = DOC_TYPES.find(x => x[0] === d.kind)?.[1] || "Dokumentas";
      const ext = (d.name.match(/\.[A-Za-z0-9]+$/) || [""])[0],
        base = accountingSafeName(d.name.replace(/\.[A-Za-z0-9]+$/, ""));
      entries.push({
        path: `${folder}/Dokumentai/${String(j + 1).padStart(2, "0")}-${accountingSafeName(type)}-${base}${ext}`,
        blob: await documentBlob(d.key)
      });
    }
  }
  return entries;
};
shareAccountingCars = async function (cars, scope = "automobilis") {
  ensureAccounting();
  if (!cars.length) {
    toast("Šiam laikotarpiui nėra parduotų automobilių", "!");
    return false;
  }
  const btns = [
    ...document.querySelectorAll("[data-accounting-action],#sendAccountingQueue,#saveAccountingFolders")
  ];
  btns.forEach(b => (b.disabled = true));
  try {
    const pack = await accountingDirectFiles(cars, scope),
      email = state.accounting.email || "",
      label = accountingScopeLabel(scope, cars),
      subject = `${profileDisplayNameV57() || "AutoEasier"} — ${label}`;
    if (navigator.clipboard?.writeText)
      try {
        await navigator.clipboard.writeText(email);
      } catch (e) {}
    let shared = false;
    if (navigator.share) {
      try {
        const payload = { files: pack.files, title: subject, text: `Buhalterei: ${email}` };
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          shared = true;
        }
      } catch (e) {
        if (e?.name === "AbortError") return false;
        console.warn("share files", e);
      }
    }
    if (!shared) {
      await downloadAccountingFiles(pack.files);
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("Dokumentai paruošti atskirais failais. Prisekite ką tik atsisiųstus failus prie šio laiško.")}`;
      toast("Dokumentai atsisiųsti · atidarytas laiškas", "✉️");
    } else toast("Dokumentai paruošti siuntimui", "✓");
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
    addHistory("Buhalterija", `${label} · ${cars.length} auto`, "📁");
    saveState();
    render();
    return shared;
  } catch (e) {
    console.error(e);
    toast(e.message || "Nepavyko paruošti dokumentų", "⚠️");
    return false;
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
};
const __ppGeneratorHtmlGallery = ppGeneratorHtml;
ppGeneratorHtml = function () {
  let html = __ppGeneratorHtmlGallery();
  html = html.replace(
    /<label class="ppScanDrop" for="ppTechPhoto">[\s\S]*?<\/label>/,
    `<div class="ppSourceChoice"><label class="ppSourceBtn" for="ppTechPhoto"><span class="ico">📷</span><strong>Fotografuoti</strong><input id="ppTechPhoto" type="file" accept="image/*" capture="environment"></label><label class="ppSourceBtn gallery" for="ppTechPhotoGallery"><span class="ico">🖼️</span><strong>Iš galerijos</strong><input id="ppTechPhotoGallery" type="file" accept="image/*"></label></div>`
  );
  return html;
};
const __bindPpGallery = bindPpGenerator;
bindPpGenerator = function (carId = null) {
  __bindPpGallery(carId);
  const gallery = document.getElementById("ppTechPhotoGallery");
  if (gallery)
    gallery.onchange = async () => {
      const f = gallery.files?.[0];
      if (!f) return;
      const img = document.getElementById("ppScanImage"),
        wrap = document.getElementById("ppScanPreview");
      if (img) img.src = URL.createObjectURL(f);
      if (wrap) wrap.classList.add("show");
      await ppScanRegistration(f);
    };
};
renderAccountingCenter = function () {
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  ensureAccounting();
  const queued = state.accounting.queue
      .map(id => state.cars.find(c => c.id === id && c.status === "parduotas"))
      .filter(Boolean),
    week = accountingPeriodCars("week"),
    month = accountingPeriodCars("month");
  const qDocs = queued.reduce((n, c) => n + (c.documents || []).length, 0);
  root.innerHTML = `<div class="accountingHub">\n      <section class="accountingHero"><h3>Dokumentai vienoje vietoje</h3><strong>${queued.length} auto paruošta buhalterijai</strong></section>\n      <section class="accountingActionGrid">\n        <button class="accountingActionTile" type="button" data-accounting-action="pp"><span class="ico">🧾</span><strong>Generuoti PP</strong><b>Pirkimas / pardavimas</b></button>\n        <button class="accountingActionTile week" type="button" data-accounting-action="week"><span class="ico">7</span><strong>Savaitės ataskaita</strong><b>${week.length} auto</b></button>\n        <button class="accountingActionTile month" type="button" data-accounting-action="month"><span class="ico">30</span><strong>Mėnesio ataskaita</strong><b>${month.length} auto</b></button>\n        <button class="accountingActionTile queue" type="button" data-accounting-action="queue"><span class="ico">📁</span><strong>Dokumentų eilė</strong><b>${queued.length} auto · ${qDocs} dok.</b></button>\n      </section>\n      <section class="accountingBlock"><div class="accountingBlockTitle"><h3>Buhalterės el. paštas</h3></div><div class="accountingEmailRowPro"><input class="input" id="accountantEmail" type="email" autocomplete="email" value="${escapeHTML(state.accounting.email || "")}"><button class="btn secondary" id="saveAccountantEmail" type="button">Išsaugoti</button></div></section>\n      <section class="accountingBlock" id="accountingQueueBlock"><div class="accountingBlockTitle"><h3>Dokumentų eilė</h3><b>${queued.length} auto</b></div><div class="accountingQueuePro">${queued.map(c => `<div class="accountingQueueProRow"><button type="button" data-accounting-open-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><b>${(c.documents || []).length} dok. · ${moneyFmt(c.soldPrice)}</b></button><button class="remove" type="button" data-accounting-queue-car="${escapeHTML(c.id)}" aria-label="Pašalinti">×</button></div>`).join("") || '<div class="accountingEmpty">Eilė tuščia</div>'}</div><div class="accountingPeriodActions"><button class="btn" id="sendAccountingQueue" type="button" ${queued.length ? "" : "disabled"}>Teikti buhalterei</button><button class="btn secondary" id="saveAccountingFolders" type="button" ${queued.length ? "" : "disabled"}>Išsaugoti aplankus</button></div></section>\n      ${ppGeneratorHtml()}\n    </div>`;
  document
    .getElementById("sendAccountingQueue")
    ?.addEventListener("click", () => shareAccountingCars(queued, "queue"));
  document
    .getElementById("saveAccountingFolders")
    ?.addEventListener("click", () => saveAccountingFolders(queued, "dokumentai"));
  root
    .querySelectorAll("[data-accounting-open-car]")
    .forEach(b => (b.onclick = () => openCar(b.dataset.accountingOpenCar)));
  bindPpGenerator();
};
document.addEventListener("click", e => {
  const a = e.target.closest("[data-accounting-action]");
  if (!a) return;
  const action = a.dataset.accountingAction;
  if (action === "pp") {
    document.getElementById("ppGeneratorCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "queue") {
    document.getElementById("accountingQueueBlock")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const cars = accountingPeriodCars(action);
  if (!cars.length) {
    toast(action === "week" ? "Šią savaitę pardavimų nėra" : "Šį mėnesį pardavimų nėra", "!");
    return;
  }
  shareAccountingCars(cars, action);
});
