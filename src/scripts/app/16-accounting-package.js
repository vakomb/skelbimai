// Buhalterijos savaitės paketas (ZIP + CSV) ir jo pateikimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function ensureAccounting() {
  state.accounting = state.accounting && typeof state.accounting === "object" ? state.accounting : {};
  if (!state.accounting.email) state.accounting.email = "";
  if (!Array.isArray(state.accounting.queue)) state.accounting.queue = [];
  if (!Array.isArray(state.accounting.history)) state.accounting.history = [];
  const soldIds = new Set(state.cars.filter(c => c.status === "parduotas").map(c => c.id));
  state.accounting.queue = [...new Set(state.accounting.queue)].filter(id => soldIds.has(id));
}
function accountingQueueHas(id) {
  ensureAccounting();
  return state.accounting.queue.includes(id);
}
function toggleAccountingQueue(id) {
  ensureAccounting();
  const c = state.cars.find(x => x.id === id && x.status === "parduotas");
  if (!c) return;
  if (accountingQueueHas(id)) {
    state.accounting.queue = state.accounting.queue.filter(x => x !== id);
    toast("Pašalinta iš savaitės paketo", "−");
  } else {
    state.accounting.queue.push(id);
    toast("Pridėta į savaitės paketą", "✓");
  }
  saveState();
  render();
  if (window.__openCarId === id) openCar(id);
}
function accountingSafeName(value = "") {
  return (
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "automobilis"
  );
}
function accountingSummary(car) {
  const docs = car.documents || [];
  const ta = vehicleStatusState(car.taStatus || "unknown", car.taUntil || "").label;
  const ins = vehicleStatusState(car.insuranceStatus || "unknown", car.insuranceUntil || "").label;
  return [
    window.AutoEasierProfile.upperName() + " — AUTOMOBILIO BUHALTERIJOS SUVESTINĖ",
    "",
    `Automobilis: ${car.name || ""}`,
    `VIN: ${car.vin || "—"}`,
    `Valstybinis nr.: ${car.plate || "—"}`,
    `Pirkimo data: ${car.createdDateISO || "—"}`,
    `Pirkimo kaina: ${moneyFmt(car.buyPrice)}`,
    `Paruošimo išlaidos: ${moneyFmt(carChecklistExpenses(car))}`,
    `Savikaina: ${moneyFmt(carTotalCost(car))}`,
    `Pardavimo data: ${car.soldDateISO || "—"}`,
    `Pardavimo kaina: ${moneyFmt(car.soldPrice)}`,
    `Marža: ${moneyFmt(carNetProfit(car))}`,
    `SDK: ${car.sdk || "—"} · ${SDK_STATES.find(x => x[0] === (car.sdkStatus || "unset"))?.[1] || "Nesutvarkyta"}`,
    `TA: ${ta}`,
    `Draudimas: ${ins}`,
    "",
    `Prisegta dokumentų: ${docs.length}`,
    ...docs.map(
      (d, i) => `${i + 1}. ${DOC_TYPES.find(x => x[0] === d.kind)?.[1] || "Dokumentas"} — ${d.name}`
    )
  ].join("\r\n");
}
function accountingWeekCsv(cars) {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    [
      "Automobilis",
      "VIN",
      "Pirkimo data",
      "Pirkimo kaina",
      "Išlaidos",
      "Savikaina",
      "Pardavimo data",
      "Pardavimo kaina",
      "Marža",
      "Dokumentai"
    ]
  ];
  cars.forEach(c =>
    rows.push([
      c.name,
      c.vin || "",
      c.createdDateISO || "",
      Number(c.buyPrice || 0),
      carChecklistExpenses(c),
      carTotalCost(c),
      c.soldDateISO || "",
      Number(c.soldPrice || 0),
      carNetProfit(c),
      (c.documents || []).length
    ])
  );
  return "\ufeff" + rows.map(r => r.map(q).join(";")).join("\r\n");
}
async function makeZip(entries) {
  if (typeof JSZip === "undefined") throw Error("ZIP modulis neįkeltas. Perkrauk programėlę.");
  const zip = new JSZip();
  for (const entry of entries) {
    const bytes = new Uint8Array(await entry.blob.arrayBuffer());
    zip.file(entry.name, bytes, { binary: true, date: new Date() });
  }
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/zip",
    platform: "DOS"
  });
}
async function buildAccountingPackage(cars, label = "buhalterija") {
  const entries = [];
  cars.forEach((car, index) => {
    const folder = `${String(index + 1).padStart(2, "0")}-${accountingSafeName(car.name)}`;
    entries.push({
      name: `${folder}/suvestine.txt`,
      blob: new Blob([accountingSummary(car)], { type: "text/plain;charset=utf-8" })
    });
  });
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i],
      folder = `${String(i + 1).padStart(2, "0")}-${accountingSafeName(car.name)}`;
    for (let j = 0; j < (car.documents || []).length; j++) {
      const d = car.documents[j],
        type = DOC_TYPES.find(x => x[0] === d.kind)?.[1] || "Dokumentas";
      const ext = (d.name.match(/\.[A-Za-z0-9]+$/) || [""])[0];
      const base = accountingSafeName(d.name.replace(/\.[A-Za-z0-9]+$/, ""));
      entries.push({
        name: `${folder}/dokumentai/${String(j + 1).padStart(2, "0")}-${accountingSafeName(type)}-${base}${ext}`,
        blob: await documentBlob(d.key)
      });
    }
  }
  if (cars.length > 1)
    entries.unshift({
      name: "savaites-suvestine.csv",
      blob: new Blob([accountingWeekCsv(cars)], { type: "text/csv;charset=utf-8" })
    });
  const stamp = todayISO(),
    name = `${window.AutoEasierProfile.fileName()}-${accountingSafeName(label)}-${stamp}.zip`;
  return { blob: await makeZip(entries), name, entries: entries.length };
}
function downloadAccountingBlob(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
async function shareAccountingCars(cars, scope = "automobilis") {
  ensureAccounting();
  if (!cars.length) {
    toast("Pakete nėra automobilių", "!");
    return false;
  }
  const btns = [...document.querySelectorAll("[data-accounting-send-car],#sendAccountingWeek")];
  btns.forEach(b => (b.disabled = true));
  try {
    const pack = await buildAccountingPackage(cars, scope),
      email = state.accounting.email || "";
    const subject = `${profileDisplayNameV57() || "AutoEasier"} — ${scope === "savaite" ? "savaitės buhalterija" : cars[0].name}`;
    const file = new File([pack.blob], pack.name, { type: "application/zip" });
    let shared = false;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(email);
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: subject, text: `Buhalterei: ${email}` });
        shared = true;
      }
    } catch (e) {
      if (e?.name === "AbortError") return false;
    }
    if (!shared) {
      downloadAccountingBlob(pack.blob, pack.name);
      const body = `Paruoštas ${profileDisplayNameV57() || "AutoEasier"} dokumentų paketas: ${pack.name}. Prisegk atsisiųstą ZIP failą prie šio laiško.`;
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast("ZIP paruoštas ir atidarytas laiškas", "✉️");
      state.accounting.history.unshift({
        id: uid(),
        date: todayISO(),
        time: nowLabel(),
        type: scope,
        count: cars.length,
        status: "paruošta"
      });
      state.accounting.history = state.accounting.history.slice(0, 100);
      saveState();
      return false;
    }
    cars.forEach(c => (c.accountingSharedAt = nowLabel()));
    if (scope === "savaite")
      state.accounting.queue = state.accounting.queue.filter(id => !cars.some(c => c.id === id));
    state.accounting.history.unshift({
      id: uid(),
      date: todayISO(),
      time: nowLabel(),
      type: scope,
      count: cars.length,
      status: "pateikta"
    });
    state.accounting.history = state.accounting.history.slice(0, 100);
    addHistory(
      "Buhalterija",
      scope === "savaite"
        ? `Pateiktas savaitės paketas · ${cars.length} auto`
        : `Pateikti ${cars[0].name} dokumentai`,
      "📁"
    );
    saveState();
    render();
    toast("Dokumentų paketas pateiktas", "✓");
    return true;
  } catch (e) {
    console.error(e);
    toast(e.message || "Nepavyko paruošti dokumentų", "⚠️");
    return false;
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
}
function renderAccountingCenter() {
  const root = document.getElementById("accountingRoot");
  if (!root) return;
  ensureAccounting();
  const cars = state.accounting.queue
    .map(id => state.cars.find(c => c.id === id && c.status === "parduotas"))
    .filter(Boolean);
  const docs = cars.reduce((n, c) => n + (c.documents || []).length, 0);
  root.innerHTML = `\n      <section class="accountingPanel">\n        <label class="accountingEmailLabel" for="accountantEmail">Buhalterės el. paštas</label>\n        <div class="accountingEmailRow"><input class="input" id="accountantEmail" type="email" autocomplete="email" value="${escapeHTML(state.accounting.email)}"><button class="btn secondary" id="saveAccountantEmail" type="button">Išsaugoti</button></div>\n      </section>\n      <section class="accountingPanel">\n        <div class="accountingTitleRow"><h3>Savaitės paketas</h3><strong>${cars.length} auto · ${docs} dok.</strong></div>\n        <div class="accountingQueue">${cars.map(c => `<div class="accountingQueueRow"><button type="button" data-accounting-open-car="${escapeHTML(c.id)}"><strong>${escapeHTML(c.name)}</strong><span>${(c.documents || []).length} dok. · ${moneyFmt(c.soldPrice)}</span></button><button class="accountingRemove" type="button" data-accounting-queue-car="${escapeHTML(c.id)}" aria-label="Pašalinti">×</button></div>`).join("") || '<div class="accountingEmpty">Savaitės paketas tuščias.</div>'}</div>\n        <button class="btn accountingSendWeek" id="sendAccountingWeek" type="button" ${cars.length ? "" : "disabled"}>Teikti savaitės paketą</button>\n      </section>\n      <section class="accountingPanel accountingInfo"><strong>Pakete</strong><span>Automobilių suvestinės ir visi prisegti dokumentai. Nuotraukos neįtraukiamos.</span></section>`;
  const save = document.getElementById("saveAccountantEmail");
  if (save)
    save.onclick = () => {
      const input = document.getElementById("accountantEmail"),
        value = (input?.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        toast("Patikrink el. pašto adresą", "!");
        return;
      }
      state.accounting.email = value;
      saveState();
      toast("Buhalterės el. paštas išsaugotas", "✓");
      renderAccountingCenter();
    };
  const send = document.getElementById("sendAccountingWeek");
  if (send) send.onclick = () => shareAccountingCars(cars, "savaite");
  root
    .querySelectorAll("[data-accounting-open-car]")
    .forEach(b => (b.onclick = () => openCar(b.dataset.accountingOpenCar)));
}
document.addEventListener("click", e => {
  const send = e.target.closest("[data-accounting-send-car]");
  if (send) {
    e.preventDefault();
    e.stopPropagation();
    const car = state.cars.find(c => c.id === send.dataset.accountingSendCar);
    if (car) shareAccountingCars([car], "automobilis");
    return;
  }
  const queue = e.target.closest("[data-accounting-queue-car]");
  if (queue) {
    e.preventDefault();
    e.stopPropagation();
    toggleAccountingQueue(queue.dataset.accountingQueueCar);
    return;
  }
});
