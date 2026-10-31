// v86: kelių automobilių pridėjimas vienu metu. „Naujas automobilis“ formoje: „Fotografuoti“, „Iš galerijos“
// (galima pažymėti iki 30 liudijimų); v87 – be „Ranka“ mygtuko (forma pildoma tiesiog žemiau). Pasirinkus 1 liudijimą – veikia kaip anksčiau (vieno automobilio
// forma, 34-registration-ui.js). Pasirinkus 2 ir daugiau – paketo režimas:
//   • skenavimas eilėje po vieną (window.AutoEasierRegScan.scan – testuose pakeičiamas), progresas „Nuskenuota 4 iš 12“,
//     likęs laikas, „Sustabdyti / Tęsti“, ekranas neužmiega (Wake Lock); klaida viename nestabdo kitų;
//   • kiekvienas automobilis – akordeono kortelė (vienu metu atidaryta viena): antraštėje liudijimo miniatiūra,
//     pavadinimas, valst. nr., būsena („Paruošta“ / „Trūksta: …“ / „Nepavyko“) ir eilės numeris; viduje – ta pati
//     forma kaip vieno automobilio (carFormHTMLV51 su prefiksu bv0, bv1…), skenerio laukai pažymėti, „Daugiau duomenų“
//     išskleidžia ridą, TA, draudimą, SDK, nuotraukas ir dokumentus;
//   • „Išsaugoti ir toliau“ (kortelė susiskleidžia, atsidaro kita), „Praleisti“, „Pašalinti“, prilipusi juosta
//     „Išsaugoti visus paruoštus (N)“; dublikatų (VIN / valst. nr.) įspėjimas; saugojimas – lygiai kaip vieno
//     automobilio (biudžetas, istorija, registracijos dokumentas, nuotraukos);
//   • neišsaugoti juodraščiai išlieka perkrovus (IndexedDB „aeBatchV86“, tik šiame įrenginyje).
// Stilius – styles/195-v86-batch-add.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const BV_MAX_V86 = 30;
const BV_ICON_V86 = {
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4h2M15.5 4h2A2.5 2.5 0 0 1 20 6.5v2M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M8.5 20h-2A2.5 2.5 0 0 1 4 17.5v-2"/><path d="M7.5 12h9"/></svg>'
};
const bvV86 = {
  items: [],
  open: "",
  running: false,
  stop: false,
  durations: [],
  seq: 0,
  lock: null,
  saveT: 0,
  savedIds: []
};

// ---------- Paieškos pagalbinės ----------
const bvRootV86 = () => document.getElementById("bvRootV86");
const bvItemV86 = id => bvV86.items.find(i => i.id === id);
function bvScanFnV86() {
  return window.AutoEasierRegScan?.scan || (typeof RegScan !== "undefined" ? RegScan.scan : null);
}
function bvValueV86(item, key) {
  const el = document.getElementById(item.prefix + key);
  if (el) return String(el.value || "").trim();
  if (item.draft && key in item.draft) return String(item.draft[key] || "").trim();
  const f = REG_FIELDS_V50.find(x => x.key === key);
  return f ? String(item.values?.[f.scan] ?? "").trim() : "";
}
function bvTitleV86(item) {
  const t = [bvValueV86(item, "regMake"), bvValueV86(item, "regModel")].filter(Boolean).join(" ");
  return t || `Liudijimas ${bvV86.items.indexOf(item) + 1}`;
}
function bvNormV86(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
function bvDuplicateV86(item) {
  const vin = bvNormV86(bvValueV86(item, "vin"));
  const plate = bvNormV86(bvValueV86(item, "plate"));
  if (!vin && !plate) return null;
  const car = (state.cars || []).find(
    c => (vin && bvNormV86(c.vin) === vin) || (plate && bvNormV86(c.plate) === plate)
  );
  if (car && car.id !== item.carId) return { car };
  const other = bvV86.items.find(
    o =>
      o !== item &&
      o.status !== "removed" &&
      ((vin && bvNormV86(bvValueV86(o, "vin")) === vin) ||
        (plate && bvNormV86(bvValueV86(o, "plate")) === plate))
  );
  return other ? { other } : null;
}
// Būsena: wait | scan | error | ready | missing | saved | skipped
function bvStateV86(item) {
  if (["wait", "scan", "error", "saved", "skipped", "removed"].includes(item.status))
    return { st: item.status };
  const miss = [];
  if (!bvValueV86(item, "regMake") && !bvValueV86(item, "regModel")) miss.push("markė ir modelis");
  if (!(Number(bvValueV86(item, "buyPrice")) > 0)) miss.push("pirkimo kaina");
  const soft = [];
  if (!bvValueV86(item, "vin")) soft.push("VIN");
  if (!bvValueV86(item, "plate")) soft.push("valst. nr.");
  return { st: miss.length ? "missing" : "ready", miss, soft, dup: bvDuplicateV86(item) };
}
function bvBadgeV86(item) {
  const s = bvStateV86(item);
  const map = {
    wait: ["wait", "Laukia"],
    scan: ["scan", "Skenuojama…"],
    error: ["bad", "Nepavyko nuskaityti"],
    saved: ["good", "Pridėta"],
    skipped: ["muted", "Praleista"],
    ready: ["good", "Paruošta"],
    missing: ["warn", "Trūksta: " + (s.miss || []).join(", ")]
  };
  let [cls, text] = map[s.st] || ["muted", ""];
  if (s.dup && (s.st === "ready" || s.st === "missing")) {
    cls = "warn";
    text = s.st === "ready" ? "Gal dublikatas?" : text;
  }
  return `<span class="bvBadgeV86 ${cls}">${s.st === "scan" ? '<i class="bvSpinV86"></i>' : ""}${escapeHTML(text)}</span>`;
}

// ---------- HTML ----------
function bvItemHeadHTMLV86(item) {
  const n = bvV86.items.filter(i => i.status !== "removed");
  const idx = n.indexOf(item) + 1;
  const plate = bvValueV86(item, "plate");
  return `<button type="button" class="bvHeadV86" data-bv-toggle="${item.id}" aria-expanded="${bvV86.open === item.id}">
    <span class="bvThumbV86">${item.thumb ? `<img src="${item.thumb}" alt="">` : BV_ICON_V86.scan}</span>
    <span class="bvHeadTxtV86"><strong>${escapeHTML(bvTitleV86(item))}</strong><span>${plate ? lcPlateHTMLV61(plate) : ""}${bvBadgeV86(item)}</span></span>
    <span class="bvIdxV86">${idx}/${n.length}</span>
    <span class="bvChevV86">${BV_ICON_V86.chev}</span>
  </button>`;
}
function bvItemHTMLV86(item) {
  const s = bvStateV86(item);
  const open = bvV86.open === item.id;
  return `<section class="bvItemV86 is-${s.st}${open ? " is-open" : ""}" data-bv-item="${item.id}">
    ${bvItemHeadHTMLV86(item)}
    <div class="bvBodyV86${open ? "" : " bvShutV86"}" aria-hidden="${!open}"><div class="bvInnerV86" data-bv-body="${item.id}"></div></div>
  </section>`;
}
function bvShellHTMLV86() {
  return `<section class="bvRootV86" id="bvRootV86">
    <div class="bvTopV86">
      <div class="bvTopHeadV86"><strong>Pridedami automobiliai</strong><button type="button" class="bvGhostV86" data-bv-cancel>Atšaukti</button></div>
      <div class="bvProgV86" data-bv-prog>
        <div class="bvProgTxtV86"><b data-bv-count></b><span data-bv-eta></span></div>
        <div class="bvBarV86" role="progressbar" aria-label="Skenavimas" aria-valuemin="0"><i></i></div>
        <div class="bvProgActsV86"><button type="button" class="bvGhostV86" data-bv-stop>Sustabdyti</button></div>
      </div>
      <div class="bvAddMoreV86"><label class="bvMoreBtnV86">${BV_ICON_V86.plus}<span>Pridėti liudijimų</span><input type="file" accept="image/*" multiple data-bv-add></label></div>
    </div>
    <div class="bvListV86" data-bv-list></div>
    <div class="bvFootV86" data-bv-foot>
      <span class="bvFootTxtV86" data-bv-left></span>
      <button type="button" class="bvSaveAllV86" data-bv-save-all>Išsaugoti visus paruoštus</button>
    </div>
  </section>`;
}

// ---------- Atvaizdavimas ----------
function bvRenderListV86() {
  const list = bvRootV86()?.querySelector("[data-bv-list]");
  if (!list) return;
  const live = bvV86.items.filter(i => i.status !== "removed");
  // Esamos kortelės (ir jų formos) išlaikomos – perpiešiamos tik antraštės
  const seen = new Set();
  live.forEach((item, i) => {
    let el = list.querySelector(`[data-bv-item="${item.id}"]`);
    if (!el) {
      list.insertAdjacentHTML("beforeend", bvItemHTMLV86(item));
      el = list.querySelector(`[data-bv-item="${item.id}"]`);
    } else bvRefreshItemV86(item);
    el.style.order = String(i);
    seen.add(item.id);
  });
  list.querySelectorAll("[data-bv-item]").forEach(el => !seen.has(el.dataset.bvItem) && el.remove());
  bvRefreshTopV86();
}
function bvRefreshItemV86(item) {
  const el = bvRootV86()?.querySelector(`[data-bv-item="${item.id}"]`);
  if (!el) return;
  const s = bvStateV86(item);
  el.className = `bvItemV86 is-${s.st}${bvV86.open === item.id ? " is-open" : ""}`;
  const head = el.querySelector(".bvHeadV86");
  const tmp = document.createElement("div");
  tmp.innerHTML = bvItemHeadHTMLV86(item);
  head.replaceWith(tmp.firstElementChild);
  const body = el.querySelector(`[data-bv-body="${item.id}"]`);
  const warn = body?.querySelector("[data-bv-warn]");
  if (warn) warn.innerHTML = bvWarnHTMLV86(item);
  const err = body?.querySelector("[data-bv-error]");
  if (err) {
    err.hidden = item.status !== "error";
    err.innerHTML = item.status === "error" ? bvErrorHTMLV86(item) : "";
  }
}
function bvRefreshTopV86() {
  const root = bvRootV86();
  if (!root) return;
  const live = bvV86.items.filter(i => i.status !== "removed");
  const scanned = live.filter(i => !["wait", "scan"].includes(i.status)).length;
  const prog = root.querySelector("[data-bv-prog]");
  const done = scanned === live.length;
  root.querySelector("[data-bv-count]").textContent = done
    ? `Visi ${live.length} nuskenuoti`
    : `Nuskenuota ${scanned} iš ${live.length}`;
  const avg = bvV86.durations.length
    ? bvV86.durations.reduce((a, b) => a + b, 0) / bvV86.durations.length
    : 0;
  const left = live.filter(i => ["wait", "scan"].includes(i.status)).length;
  const eta = !done && avg && bvV86.running ? Math.ceil((avg * left) / 1000) : 0;
  root.querySelector("[data-bv-eta]").textContent = done
    ? ""
    : !bvV86.running
      ? "Sustabdyta"
      : eta
        ? eta < 60
          ? `liko ~${eta} s`
          : `liko ~${Math.round(eta / 60)} min.`
        : "";
  const bar = root.querySelector(".bvBarV86");
  bar.setAttribute("aria-valuemax", String(live.length));
  bar.setAttribute("aria-valuenow", String(scanned));
  bar.querySelector("i").style.setProperty("--p", live.length ? (scanned / live.length).toFixed(4) : "1");
  prog.classList.toggle("is-done", done);
  const stop = root.querySelector("[data-bv-stop]");
  stop.hidden = done;
  stop.textContent = bvV86.running ? "Sustabdyti" : "Tęsti skenavimą";
  const ready = live.filter(i => bvStateV86(i).st === "ready");
  const pending = live.filter(i => !["saved", "skipped"].includes(i.status));
  const saveAll = root.querySelector("[data-bv-save-all]");
  saveAll.textContent = ready.length
    ? `Išsaugoti visus paruoštus (${ready.length})`
    : "Išsaugoti visus paruoštus";
  saveAll.disabled = !ready.length;
  const savedN = live.filter(i => i.status === "saved").length;
  root.querySelector("[data-bv-left]").textContent = pending.length
    ? `Liko ${pending.length}${savedN ? ` · pridėta ${savedN}` : ""}`
    : `Pridėta ${savedN}`;
  root.querySelector("[data-bv-foot]").hidden = !pending.length;
  if (!pending.length && savedN) bvSummaryV86();
}
function bvWarnHTMLV86(item) {
  const s = bvStateV86(item);
  if (!s.dup) return "";
  const who = s.dup.car
    ? `Automobilis su tokiu ${bvNormV86(bvValueV86(item, "vin")) && bvNormV86(s.dup.car.vin) === bvNormV86(bvValueV86(item, "vin")) ? "VIN" : "valst. nr."} jau garaže: <b>${escapeHTML(s.dup.car.name || "")}</b>`
    : `Tas pats VIN arba valst. nr. kartojasi pakete`;
  return `<div class="bvWarnV86"><span>${who}</span>${
    item.dupOk
      ? "<em>Bus pridėtas vis tiek</em>"
      : `<button type="button" class="bvGhostV86" data-bv-dup-ok="${item.id}">Vis tiek pridėti</button>`
  }</div>`;
}
function bvErrorHTMLV86(item) {
  return `<div class="bvErrV86"><span>${escapeHTML(item.error || "Liudijimo nepavyko nuskaityti.")}</span><div><button type="button" class="bvGhostV86" data-bv-retry="${item.id}">Bandyti dar kartą</button><button type="button" class="bvGhostV86" data-bv-manual="${item.id}">Pildyti ranka</button></div></div>`;
}
// Forma – tik atidarius kortelę pirmą kartą (tie patys laukai kaip vieno automobilio formoje)
function bvEnsureFormV86(item) {
  const body = bvRootV86()?.querySelector(`[data-bv-body="${item.id}"]`);
  if (!body || body.dataset.ready === "1") return body;
  body.dataset.ready = "1";
  body.innerHTML = `<div data-bv-error ${item.status === "error" ? "" : "hidden"}>${item.status === "error" ? bvErrorHTMLV86(item) : ""}</div><div data-bv-warn></div>${carFormHTMLV51(item.prefix, {}, "new")}
    <div class="bvItemActsV86">
      <button type="button" class="bvGhostV86 danger" data-bv-remove="${item.id}">Pašalinti</button>
      <button type="button" class="bvGhostV86" data-bv-skip="${item.id}">Praleisti</button>
      <button type="button" class="bvGoV86" data-bv-save="${item.id}">Išsaugoti ir toliau</button>
    </div>`;
  bindCarFormV51(item.prefix, {}, { nameInputId: "" });
  // „Daugiau duomenų“: registracijos duomenys ir kaina matomi iš karto, kita – išskleidžiama
  const form = body.querySelector(".cfFormV51");
  const cards = [...form.querySelectorAll(":scope > .cfCardV51")];
  const rest = cards.slice(1);
  if (rest.length) {
    const wrap = document.createElement("div");
    wrap.className = "bvMoreBodyV86 bvShutV86";
    wrap.setAttribute("aria-hidden", "true");
    const inner = document.createElement("div");
    inner.className = "bvMoreInnerV86";
    rest.forEach(c => inner.appendChild(c));
    wrap.appendChild(inner);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bvMoreToggleV86";
    btn.dataset.bvMore = item.id;
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `<span>Daugiau duomenų</span><small>Rida, TA, draudimas, SDK, nuotraukos, dokumentai</small>${BV_ICON_V86.chev}`;
    form.append(btn, wrap);
  }
  // Mileage – į pagrindinę dalį (kartu su kaina) jau yra pirmoje kortelėje
  bvFillV86(item);
  bvRestoreDraftV86(item);
  body.addEventListener("input", () => bvOnEditV86(item));
  body.addEventListener("change", () => bvOnEditV86(item));
  bvRefreshItemV86(item);
  return body;
}
function bvFillV86(item) {
  if (!item.values) return;
  const v = item.values;
  for (const f of REG_FIELDS_V50) {
    const input = document.getElementById(item.prefix + f.key);
    const value = v[f.scan];
    if (!input || value === "" || value == null) continue;
    input.value = String(value);
    const field = item.fields?.[f.scan];
    const conf = field?.confidence ?? 1;
    input.closest("[data-reg-field]")?.classList.add(conf < 0.45 ? "regCheckV50" : "regFilledV50");
  }
  // Nuskanuoto liudijimo miniatiūra – registracijos kortelėje
  const status = document.getElementById(item.prefix + "regStatus");
  const prev = document.getElementById(item.prefix + "regPreview");
  if (status && prev && item.thumb) {
    prev.src = item.thumb;
    status.hidden = false;
    const msg = document.getElementById(item.prefix + "regMsg");
    if (msg)
      msg.textContent =
        item.status === "error"
          ? "Nepavyko nuskaityti – pildykite ranka"
          : "Nuskaityta iš liudijimo – patikrinkite";
    const bar = document.getElementById(item.prefix + "regBar");
    if (bar) bar.style.width = "100%";
  }
}
let bvEditT = 0;
function bvOnEditV86(item) {
  clearTimeout(bvEditT);
  bvEditT = setTimeout(() => {
    bvRefreshItemV86(item);
    bvRefreshTopV86();
    bvPersistV86();
  }, 120);
}

// ---------- Sklandus išskleidimas ----------
function bvAnimV86(body, open) {
  if (!body) return;
  const from = body.getBoundingClientRect().height;
  body._a?.cancel();
  body.classList.toggle("bvShutV86", !open);
  body.setAttribute("aria-hidden", String(!open));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !body.animate) return;
  const to = open ? body.getBoundingClientRect().height : 0;
  if (Math.abs(to - from) < 1) return;
  const dur = Math.round(Math.min(420, Math.max(220, 180 + Math.abs(to - from) * 0.18)));
  body._a = body.animate(
    [
      { height: from + "px", visibility: "visible" },
      { height: to + "px", visibility: "visible" }
    ],
    {
      duration: open ? dur : Math.round(dur * 0.8),
      easing: open ? "cubic-bezier(.2,.8,.2,1)" : "cubic-bezier(.4,0,.2,1)"
    }
  );
  body.firstElementChild?.animate(
    open
      ? [
          { opacity: 0, transform: "translateY(-6px)" },
          { opacity: 1, transform: "none" }
        ]
      : [{ opacity: 1 }, { opacity: 0 }],
    { duration: open ? dur : Math.round(dur * 0.5), easing: "ease" }
  );
}
function bvOpenItemV86(id, { scroll = true } = {}) {
  const root = bvRootV86();
  if (!root) return;
  const prev = bvV86.open;
  bvV86.open = prev === id ? "" : id;
  if (prev && prev !== bvV86.open) {
    const el = root.querySelector(`[data-bv-item="${prev}"]`);
    el?.classList.remove("is-open");
    el?.querySelector(".bvHeadV86")?.setAttribute("aria-expanded", "false");
    bvAnimV86(el?.querySelector(".bvBodyV86"), false);
  }
  if (bvV86.open) {
    const item = bvItemV86(bvV86.open);
    bvEnsureFormV86(item);
    const el = root.querySelector(`[data-bv-item="${item.id}"]`);
    el.classList.add("is-open");
    el.querySelector(".bvHeadV86")?.setAttribute("aria-expanded", "true");
    bvAnimV86(el.querySelector(".bvBodyV86"), true);
    if (scroll) aeRevealV87(el, { follow: 520 });
  }
}
function bvNextOpenV86(afterId) {
  const live = bvV86.items.filter(i => !["removed", "saved", "skipped"].includes(i.status));
  const idx = bvV86.items.findIndex(i => i.id === afterId);
  const next =
    live.find(i => bvV86.items.indexOf(i) > idx && i.status !== "wait" && i.status !== "scan") ||
    live.find(i => i.status !== "wait" && i.status !== "scan");
  if (next) bvOpenItemV86(next.id);
  else if (bvV86.open) bvOpenItemV86(bvV86.open);
}

// ---------- Skenavimas ----------
async function bvRunQueueV86() {
  if (bvV86.running) return;
  const scan = bvScanFnV86();
  if (!scan) {
    bvV86.items
      .filter(i => i.status === "wait")
      .forEach(i => ((i.status = "error"), (i.error = "Skeneris nepasiekiamas – pildykite ranka.")));
    bvRenderListV86();
    return;
  }
  bvV86.running = true;
  bvV86.stop = false;
  try {
    bvV86.lock = await navigator.wakeLock?.request?.("screen");
  } catch (e) {}
  bvRefreshTopV86();
  while (!bvV86.stop) {
    const item = bvV86.items.find(i => i.status === "wait");
    if (!item) break;
    item.status = "scan";
    bvRefreshItemV86(item);
    bvRefreshTopV86();
    const t0 = performance.now();
    try {
      const result = await scan(item.file, { onProgress: () => {} });
      item.values = { ...(result?.values || {}) };
      item.fields = result?.fields || {};
      item.status =
        item.values.make || item.values.model || item.values.vin || item.values.plate ? "ready" : "error";
      if (item.status === "error") item.error = "Liudijime neatpažinta duomenų – pildykite ranka.";
    } catch (e) {
      item.status = "error";
      item.error = "Liudijimo nepavyko nuskaityti.";
    }
    bvV86.durations.push(performance.now() - t0);
    const body = bvRootV86()?.querySelector(`[data-bv-body="${item.id}"]`);
    if (body?.dataset.ready === "1") bvFillV86(item);
    bvRefreshItemV86(item);
    bvRefreshTopV86();
    bvPersistV86();
    // Pirmas nuskenuotas – atidaromas iš karto, kad būtų galima pildyti, kol kiti skenuojami
    if (!bvV86.open && item.status !== "wait") bvOpenItemV86(item.id, { scroll: false });
    await new Promise(r =>
      window.requestIdleCallback ? requestIdleCallback(r, { timeout: 120 }) : setTimeout(r, 16)
    );
  }
  bvV86.running = false;
  try {
    await bvV86.lock?.release?.();
  } catch (e) {}
  bvV86.lock = null;
  bvRefreshTopV86();
}

// ---------- Pradžia / pabaiga ----------
function bvStartV86(files, { append = false } = {}) {
  const panel = document.getElementById("addCarPanel");
  if (!panel) return;
  const list = Array.from(files || []).filter(f => /^image\//.test(f.type || "image/"));
  if (!list.length) return;
  if (!bvRootV86()) {
    panel.classList.add("bvModeV86");
    panel.insertAdjacentHTML("beforeend", bvShellHTMLV86());
    const root = bvRootV86();
    root.animate?.(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" }
      ],
      { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }
  const room = BV_MAX_V86 - bvV86.items.filter(i => i.status !== "removed").length;
  if (list.length > room) toast(`Vienu metu – iki ${BV_MAX_V86} automobilių`, "!");
  list.slice(0, Math.max(0, room)).forEach(file => {
    const n = bvV86.seq++;
    bvV86.items.push({
      id: "bv" + n + "-" + Date.now().toString(36),
      prefix: "bv" + n,
      file,
      thumb: URL.createObjectURL(file),
      status: "wait",
      values: null,
      fields: null
    });
  });
  bvRenderListV86();
  bvPersistV86();
  bvRunQueueV86();
  if (!append) aeRevealV87(bvRootV86()?.querySelector(".bvTopV86"), { anchor: "start", delay: 60 });
}
function bvFinishV86({ keepDraft = false } = {}) {
  bvV86.stop = true;
  bvV86.items.forEach(i => i.thumb && URL.revokeObjectURL(i.thumb));
  bvV86.items = [];
  bvV86.open = "";
  bvV86.durations = [];
  bvRootV86()?.remove();
  document.getElementById("addCarPanel")?.classList.remove("bvModeV86");
  if (!keepDraft) bvDraftClearV86();
}
function bvSummaryV86() {
  const root = bvRootV86();
  if (!root || root.querySelector(".bvDoneV86")) return;
  const n = bvV86.items.filter(i => i.status === "saved").length;
  root
    .querySelector("[data-bv-list]")
    .insertAdjacentHTML(
      "beforebegin",
      `<div class="bvDoneV86"><span class="bvDoneIcoV86">${BV_ICON_V86.check}</span><strong>Pridėta ${n} ${n === 1 ? "automobilis" : n < 10 ? "automobiliai" : "automobilių"}</strong><button type="button" class="bvGoV86" data-bv-garage>Į Garažą</button></div>`
    );
  bvDraftClearV86();
}

// ---------- Išsaugojimas (kaip vieno automobilio, 35-car-ui-v51.js) ----------
async function bvSaveItemV86(item, { quiet = false, rerender = true } = {}) {
  bvEnsureFormV86(item);
  const s = bvStateV86(item);
  if (s.st !== "ready") {
    if (!quiet)
      toast(s.st === "missing" ? "Trūksta: " + s.miss.join(", ") : "Automobilis dar neparuoštas", "!");
    return false;
  }
  if (s.dup && !item.dupOk) {
    if (!quiet) {
      toast("Galimas dublikatas – patvirtinkite", "!");
    }
    return false;
  }
  const p = item.prefix;
  try {
    const data = readCarFormV51(p);
    let docs = await collectDocuments(p);
    if (item.file && !docs.some(d => d.kind === "registration"))
      docs = [await regDocumentFromFileV50(item.file, data.registrationDoc), ...docs];
    const photos = [];
    for (const f of Array.from(document.getElementById(p + "photos")?.files || [])) {
      const key = await storeImageFile(f);
      if (!key) throw Error("Nepavyko pridėti nuotraukos.");
      photos.push(key);
    }
    const c = {
      id: uid(),
      ...data,
      source: "",
      listingStatus: "not-listed",
      listingDate: "",
      askingPrice: null,
      documents: docs,
      photos,
      imageSrc: photos[0] || "",
      notes: "",
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
    state.finances.budgetBalance -= c.buyPrice;
    if (!saveState()) {
      state.cars = state.cars.filter(x => x !== c);
      state.finances.budgetBalance += c.buyPrice;
      throw Error("Nepavyko išsaugoti automobilio.");
    }
    addHistory("Automobilis nupirktas", `${c.name} • ${moneyFmt(c.buyPrice)}`, "🚗", {
      kind: "car",
      id: c.id,
      label: "Atidaryti automobilį"
    });
    saveState();
    item.status = "saved";
    item.carId = c.id;
    bvV86.savedIds.push(c.id);
    if (rerender) render();
    bvRefreshItemV86(item);
    bvPersistV86();
    return true;
  } catch (e) {
    if (!quiet) toast(e.message || "Nepavyko išsaugoti", "!");
    else item.lastError = e.message;
    return false;
  }
}

// ---------- Juodraščiai (IndexedDB, tik šiame įrenginyje) ----------
function bvDbV86() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(Error("no idb"));
    const req = indexedDB.open("aeBatchV86", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("drafts");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function bvFormValuesV86(item) {
  const form = document.getElementById(item.prefix + "form");
  if (!form) return item.draft || null;
  const out = {};
  form.querySelectorAll("input[id], select[id], textarea[id]").forEach(el => {
    if (el.type === "file") return;
    out[el.id.slice(item.prefix.length)] = el.value;
  });
  return out;
}
function bvPersistV86() {
  clearTimeout(bvV86.saveT);
  bvV86.saveT = setTimeout(async () => {
    const items = bvV86.items
      .filter(i => !["removed", "saved"].includes(i.status))
      .map(i => ({
        id: i.id,
        prefix: i.prefix,
        file: i.file,
        status: i.status === "scan" ? "wait" : i.status,
        values: i.values,
        fields: i.fields
          ? Object.fromEntries(
              Object.entries(i.fields).map(([k, v]) => [k, { confidence: v?.confidence ?? 1 }])
            )
          : null,
        error: i.error || "",
        draft: bvFormValuesV86(i),
        photos: Array.from(document.getElementById(i.prefix + "photos")?.files || i.photos || [])
      }));
    try {
      const db = await bvDbV86();
      const tx = db.transaction("drafts", "readwrite");
      if (items.length) tx.objectStore("drafts").put({ items, seq: bvV86.seq, at: Date.now() }, "current");
      else tx.objectStore("drafts").delete("current");
    } catch (e) {}
  }, 300);
}
async function bvDraftGetV86() {
  try {
    const db = await bvDbV86();
    return await new Promise(resolve => {
      const req = db.transaction("drafts").objectStore("drafts").get("current");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}
async function bvDraftClearV86() {
  clearTimeout(bvV86.saveT);
  try {
    const db = await bvDbV86();
    db.transaction("drafts", "readwrite").objectStore("drafts").delete("current");
  } catch (e) {}
}
function bvRestoreDraftV86(item) {
  if (!item.draft) return;
  Object.entries(item.draft).forEach(([k, v]) => {
    const el = document.getElementById(item.prefix + k);
    if (!el || el.type === "file") return;
    el.value = v;
    if (el.type === "hidden") {
      const box = el.closest("[data-cf-status]");
      box?.querySelector(`[data-seg-value="${v}"]`)?.click();
    }
  });
  if (item.photos?.length && window.DataTransfer) {
    try {
      const dt = new DataTransfer();
      item.photos.forEach(f => dt.items.add(f));
      const input = document.getElementById(item.prefix + "photos");
      if (input) {
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (e) {}
  }
}
async function bvResumeV86() {
  const d = await bvDraftGetV86();
  if (!d?.items?.length) return;
  const panel = document.getElementById("addCarPanel");
  if (!panel) return;
  bvFinishV86({ keepDraft: true });
  panel.classList.add("bvModeV86");
  panel.insertAdjacentHTML("beforeend", bvShellHTMLV86());
  bvV86.seq = d.seq || d.items.length;
  bvV86.items = d.items.map(i => ({ ...i, thumb: i.file ? URL.createObjectURL(i.file) : "" }));
  bvRenderListV86();
  const first = bvV86.items.find(i => !["wait", "scan"].includes(i.status));
  if (first) bvOpenItemV86(first.id, { scroll: false });
  bvRunQueueV86();
}
// Garaže – priminimas apie nebaigtą pridėjimą
async function bvResumeBannerV86() {
  const d = await bvDraftGetV86();
  const grid = document.getElementById("activeCarGrid");
  let el = document.getElementById("bvResumeV86");
  if (!d?.items?.length || bvRootV86() || !grid) return el?.remove();
  const n = d.items.length;
  const html = `<span><strong>Nebaigtas pridėjimas</strong><small>${n} ${n === 1 ? "automobilis" : n < 10 ? "automobiliai" : "automobilių"} laukia išsaugojimo</small></span><button type="button" class="bvGoV86" data-bv-resume>Tęsti</button><button type="button" class="bvGhostV86" data-bv-discard>Atmesti</button>`;
  if (!el) {
    const anchor = document.getElementById("gsBarV86") || grid;
    anchor.insertAdjacentHTML("beforebegin", `<div class="bvResumeV86" id="bvResumeV86"></div>`);
    el = document.getElementById("bvResumeV86");
  }
  if (el.innerHTML !== html) el.innerHTML = html;
}
function bvShowAddPanelV86() {
  const panel = document.getElementById("addCarPanel");
  if (!panel) return;
  const show = document.getElementById("showAddCarFormBtn");
  if (panel.style.display === "none" || getComputedStyle(panel).display === "none") show?.click();
  if (getComputedStyle(panel).display === "none") panel.style.display = "block";
}

// ---------- Įėjimas: „Iš galerijos“ (kelios) ----------
function bvInstallEntryV86() {
  const gal = document.getElementById("newVehicleregGallery");
  if (!gal || gal.dataset.bvV86 === "1") return;
  gal.dataset.bvV86 = "1";
  gal.multiple = true;
  const label = gal.closest(".regScanBtnV50");
  label?.querySelector("span") && (label.querySelector("span").textContent = "Iš galerijos");
  const btns = gal.closest(".regScanBtnsV50");
  if (btns && !btns.nextElementSibling?.classList.contains("bvHintV86"))
    btns.insertAdjacentHTML(
      "afterend",
      `<p class="bvHintV86">Galite pažymėti kelis liudijimus – automobiliai bus pridėti vienu metu.</p>`
    );
  // Kelios nuotraukos → paketo režimas (prieš esamą vieno failo skenavimą)
  gal.addEventListener(
    "change",
    e => {
      const files = Array.from(gal.files || []);
      if (files.length < 2) return;
      e.stopImmediatePropagation();
      gal.value = "";
      bvStartV86(files);
    },
    true
  );
}
document.addEventListener("click", async e => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest("[data-bv-resume]")) {
    bvShowAddPanelV86();
    document.getElementById("bvResumeV86")?.remove();
    await bvResumeV86();
    aeRevealV87(bvRootV86()?.querySelector(".bvTopV86"), { anchor: "start", delay: 80 });
    return;
  }
  if (t.closest("[data-bv-discard]")) {
    if (!window.confirm("Atmesti nebaigtą automobilių pridėjimą?")) return;
    await bvDraftClearV86();
    document.getElementById("bvResumeV86")?.remove();
    return;
  }
  const root = bvRootV86();
  if (!root || !root.contains(t)) return;
  const tog = t.closest("[data-bv-toggle]");
  if (tog) {
    const item = bvItemV86(tog.dataset.bvToggle);
    if (item && item.status !== "wait" && item.status !== "scan") bvOpenItemV86(item.id);
    else if (item) toast(item.status === "scan" ? "Skenuojama…" : "Laukia eilėje", "•");
    return;
  }
  const more = t.closest("[data-bv-more]");
  if (more) {
    const body = more.nextElementSibling;
    const open = body.classList.contains("bvShutV86");
    more.setAttribute("aria-expanded", String(open));
    more.classList.toggle("is-open", open);
    bvAnimV86(body, open);
    return;
  }
  const save = t.closest("[data-bv-save]");
  if (save) {
    const item = bvItemV86(save.dataset.bvSave);
    save.disabled = true;
    const ok = item && (await bvSaveItemV86(item));
    save.disabled = false;
    if (ok) {
      vibrate(10);
      toast(`Pridėta: ${item.carName || bvTitleV86(item)}`, "✓");
      bvNextOpenV86(item.id);
      bvRefreshTopV86();
    }
    return;
  }
  const skip = t.closest("[data-bv-skip]");
  if (skip) {
    const item = bvItemV86(skip.dataset.bvSkip);
    if (item) {
      item.status = "skipped";
      bvRefreshItemV86(item);
      bvNextOpenV86(item.id);
      bvRefreshTopV86();
      bvPersistV86();
    }
    return;
  }
  const rm = t.closest("[data-bv-remove]");
  if (rm) {
    const item = bvItemV86(rm.dataset.bvRemove);
    if (!item) return;
    const el = root.querySelector(`[data-bv-item="${item.id}"]`);
    const go = () => {
      item.status = "removed";
      if (bvV86.open === item.id) bvV86.open = "";
      bvRenderListV86();
      bvPersistV86();
      if (!bvV86.items.some(i => i.status !== "removed")) bvFinishV86();
      else bvNextOpenV86(item.id);
    };
    if (el?.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      el.animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "translateX(-16px)" }
        ],
        { duration: 200, easing: "ease" }
      ).onfinish = go;
    else go();
    return;
  }
  const retry = t.closest("[data-bv-retry]");
  if (retry) {
    const item = bvItemV86(retry.dataset.bvRetry);
    if (item) {
      item.status = "wait";
      item.error = "";
      if (bvV86.open === item.id) bvOpenItemV86(item.id);
      bvRefreshItemV86(item);
      bvRunQueueV86();
    }
    return;
  }
  const manual = t.closest("[data-bv-manual]");
  if (manual) {
    const item = bvItemV86(manual.dataset.bvManual);
    if (item) {
      item.status = "ready";
      item.error = "";
      bvRefreshItemV86(item);
      document.getElementById(item.prefix + "regMake")?.focus({ preventScroll: true });
    }
    return;
  }
  const dup = t.closest("[data-bv-dup-ok]");
  if (dup) {
    const item = bvItemV86(dup.dataset.bvDupOk);
    if (item) {
      item.dupOk = true;
      bvRefreshItemV86(item);
    }
    return;
  }
  if (t.closest("[data-bv-stop]")) {
    if (bvV86.running) {
      bvV86.stop = true;
      t.closest("[data-bv-stop]").textContent = "Stabdoma…";
    } else bvRunQueueV86();
    return;
  }
  if (t.closest("[data-bv-save-all]")) {
    const btn = t.closest("[data-bv-save-all]");
    btn.disabled = true;
    let n = 0;
    const notReady = [];
    for (const item of bvV86.items) {
      const st = bvStateV86(item).st;
      if (st === "ready") {
        if (await bvSaveItemV86(item, { quiet: true, rerender: false })) n++;
        else notReady.push(item);
      } else if (st === "missing" || st === "error") notReady.push(item);
    }
    render();
    bvRenderListV86();
    if (n) toast(`Pridėta ${n} ${n === 1 ? "automobilis" : n < 10 ? "automobiliai" : "automobilių"}`, "✓");
    if (notReady.length) {
      toast(`Neišsaugota ${notReady.length}: trūksta duomenų arba galimas dublikatas`, "!");
      bvOpenItemV86(notReady[0].id);
    }
    return;
  }
  if (t.closest("[data-bv-cancel]")) {
    const left = bvV86.items.filter(i => !["removed", "saved", "skipped"].includes(i.status)).length;
    if (
      left &&
      !window.confirm(
        `Neišsaugoti ${left} ${left === 1 ? "automobilis bus prarastas" : "automobiliai bus prarasti"}. Atšaukti?`
      )
    )
      return;
    bvFinishV86();
    return;
  }
  if (t.closest("[data-bv-garage]")) {
    const ids = [...bvV86.savedIds];
    bvFinishV86();
    bvV86.savedIds = [];
    if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
    render();
    setTimeout(() => {
      const cards = ids
        .map(id => document.querySelector(`#activeCarGrid [data-open-car="${id}"]`))
        .filter(Boolean);
      cards.forEach(c => c.classList.add("bvNewV86"));
      aeRevealV87(cards[0], { pad: 20 });
      setTimeout(() => cards.forEach(c => c.classList.remove("bvNewV86")), 2600);
    }, 260);
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t instanceof HTMLInputElement && t.matches("#bvRootV86 [data-bv-add]")) {
    const files = Array.from(t.files || []);
    t.value = "";
    if (files.length) bvStartV86(files, { append: true });
  }
});
// Uždarant „Naujas automobilis“ su neišsaugotais – patvirtinimas
document.addEventListener(
  "click",
  e => {
    const t = e.target instanceof Element ? e.target.closest("#cancelAddCarBtn") : null;
    if (!t || !bvRootV86()) return;
    const left = bvV86.items.filter(i => !["removed", "saved", "skipped"].includes(i.status)).length;
    if (
      left &&
      !window.confirm(
        `Neišsaugoti ${left} ${left === 1 ? "automobilis bus prarastas" : "automobiliai bus prarasti"}. Uždaryti?`
      )
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    bvFinishV86();
  },
  true
);

const __renderBvV86 = render;
render = function () {
  const r = __renderBvV86.apply(this, arguments);
  try {
    bvInstallEntryV86();
    bvResumeBannerV86();
  } catch (err) {
    console.warn("Paketinis pridėjimas v86", err);
  }
  return r;
};
bvInstallEntryV86();
window.AutoEasierBatchAdd = { start: files => bvStartV86(files), state: bvV86 };
