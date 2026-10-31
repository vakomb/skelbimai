// v86: Garažo momentinė paieška, filtrai ir rikiavimas – patogu ir su šimtais automobilių.
// Paieškos juosta – „Aktyvūs automobiliai“ skyriaus viršuje (prilimpanti). v87: viena eilutė (laukas + filtrų
// mygtukas su ženkleliu); filtrai ir rikiavimas – sklandžiai išsiskleidžiančiame skydelyje, aktyvūs filtrai –
// žymos po lauku. Rezultatai keičiasi rašant (≤ 1 kadras):
// kiekvienas automobilis turi paruoštą indeksą (markė, modelis, pavadinimas, valst. nr., VIN, metai, kuras,
// liudijimas), užklausa skaidoma į žodžius (visi turi atitikti), be diakritikų ir tarpų valst. nr. / VIN.
// Rašant sąrašas neperpiešiamas: esamos kortelės tik paslepiamos / parodomos ir perrikiuojamos (CSS order),
// paryškinama atitikusi dalis. Filtrai (vėluoja, be nuotraukų, be kainos, TA/draudimas baigiasi, > 60 d.) ir
// rikiavimas (state.ui.garageSort). Daug automobilių – rodoma po 30, likę – slenkant (IntersectionObserver).
// Užklausa ir filtrai – sessionStorage (nesinchronizuojama). Stilius – styles/194-v86-garage-search.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const GS_KEY_V86 = "aeGarageSearchV86";
const GS_PAGE_V86 = 30;
const GS_SORTS_V86 = [
  ["new", "Naujausi"],
  ["days", "Ilgiausiai garaže"],
  ["price", "Kaina"],
  ["cost", "Savikaina"],
  ["margin", "Marža"],
  ["az", "A–Ž"]
];
const GS_FILTERS_V86 = [
  ["late", "Vėluoja užduotys"],
  ["nophoto", "Be nuotraukų"],
  ["noprice", "Be kainos"],
  ["expiring", "TA / draudimas baigiasi"],
  ["old", "Garaže > 60 d."]
];
const GS_ICON_V86 = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/></svg>',
  sliders:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
};
const gsV86 = {
  q: "",
  filters: new Set(),
  shown: GS_PAGE_V86,
  index: new WeakMap(),
  io: null,
  raf: 0,
  lastKey: ""
};
try {
  const saved = JSON.parse(sessionStorage.getItem(GS_KEY_V86) || "{}");
  gsV86.q = String(saved.q || "");
  (saved.f || []).forEach(f => gsV86.filters.add(f));
} catch (e) {}
function gsSaveV86() {
  try {
    sessionStorage.setItem(GS_KEY_V86, JSON.stringify({ q: gsV86.q, f: [...gsV86.filters] }));
  } catch (e) {}
}

// ---------- Normalizavimas ir indeksas ----------
function gsNormV86(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function gsCompactV86(s) {
  return gsNormV86(s).replace(/\s+/g, "");
}
function gsIndexV86(car) {
  const fields = [
    car.regMake,
    car.regModel,
    car.name,
    car.plate,
    car.vin,
    car.year || (car.firstRegistrationDate ? String(car.firstRegistrationDate).slice(0, 4) : ""),
    car.fuelType,
    car.registrationDoc || car.regDoc
  ];
  const key = fields.join("\u0001");
  const hit = gsV86.index.get(car);
  if (hit && hit.key === key) return hit;
  const make = gsNormV86(car.regMake || String(car.name || "").split(/\s+/)[0]);
  const words = gsNormV86(fields.join(" "));
  const entry = {
    key,
    words: " " + words + " ",
    compact: words.replace(/\s+/g, ""),
    plate: gsCompactV86(car.plate),
    vin: gsCompactV86(car.vin),
    head: " " + gsNormV86([car.regMake, car.regModel, car.name].join(" ")) + " ",
    make
  };
  gsV86.index.set(car, entry);
  return entry;
}
// Užklausa → žodžiai. Visi turi atitikti; grąžina tinkamumo balą arba -1
function gsScoreV86(entry, tokens) {
  let score = 0;
  for (const t of tokens) {
    if (entry.plate && entry.plate === t) score += 120;
    else if (entry.vin && (entry.vin === t || (t.length >= 6 && entry.vin.endsWith(t)))) score += 110;
    else if (entry.plate && t.length >= 2 && entry.plate.startsWith(t)) score += 60;
    else if (entry.head.includes(" " + t)) score += 30;
    else if (entry.words.includes(" " + t)) score += 15;
    else if (entry.words.includes(t)) score += 5;
    else if (t.length >= 3 && entry.compact.includes(t)) score += 4;
    else return -1;
  }
  return score;
}
function gsTokensV86(q) {
  return gsNormV86(q).split(" ").filter(Boolean);
}

// ---------- Filtrai ir rikiavimas ----------
function gsDaysV86(car) {
  const start = car.createdDateISO || String(car.createdAt || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(start) ? daysBetweenISO(start, todayISO()) : 0;
}
function gsExpiringV86(status, until) {
  if (status === "invalid") return true;
  if (status !== "valid" || !until) return false;
  return daysBetweenISO(todayISO(), String(until).slice(0, 10)) <= 30;
}
const GS_TEST_V86 = {
  late: car => {
    const today = todayISO();
    return (car.checklist || []).some(t => !t.done && t.dueDate && t.dueDate < today);
  },
  nophoto: car => !(car.photos || []).filter(Boolean).length && !car.imageSrc,
  noprice: car => !(Number(car.askingPrice) > 0),
  expiring: car =>
    gsExpiringV86(car.taStatus, car.taUntil) || gsExpiringV86(car.insuranceStatus, car.insuranceUntil),
  old: car => gsDaysV86(car) > 60
};
function gsSortKeyV86() {
  const s = state.ui?.garageSort;
  return GS_SORTS_V86.some(x => x[0] === s) ? s : "new";
}
function gsCompareV86(sort) {
  const created = c => c.createdDateISO || String(c.createdAt || "");
  const price = c => Number(c.askingPrice) || 0;
  if (sort === "days") return (a, b) => created(a).localeCompare(created(b));
  if (sort === "price") return (a, b) => price(b) - price(a);
  if (sort === "cost") return (a, b) => carTotalCost(b) - carTotalCost(a);
  if (sort === "margin")
    return (a, b) =>
      (price(b) ? price(b) - carTotalCost(b) : -Infinity) -
      (price(a) ? price(a) - carTotalCost(a) : -Infinity);
  if (sort === "az") return (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "lt");
  return (a, b) => created(b).localeCompare(created(a));
}

// ---------- Juosta ----------
function gsBarHTMLV86() {
  return `<div class="gsBarV86" id="gsBarV86" role="search">
    <div class="gsRowV86">
      <div class="gsFieldV86">
        <span class="gsIcoV86">${GS_ICON_V86.search}</span>
        <input id="gsInputV86" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Ieškoti" aria-label="Ieškoti automobilio">
        <button type="button" class="gsClearV86" id="gsClearV86" aria-label="Išvalyti paiešką" hidden>${GS_ICON_V86.x}</button>
      </div>
      <button type="button" class="gsToolV86" id="gsSortBtnV86" aria-controls="gsSortMenuV86" aria-expanded="false" aria-label="Filtrai ir rikiavimas">${GS_ICON_V86.sliders}<i class="gsBadgeV86" id="gsBadgeV86" hidden></i></button>
    </div>
    <div class="gsPanelV86" id="gsSortMenuV86" hidden>
      <div class="gsPanelInV86">
        <div class="gsGroupV86" id="gsFilterGroupV86"><small>Rodyti</small><div class="gsChipsV86" id="gsChipsV86" role="group" aria-label="Filtrai"></div></div>
        <div class="gsGroupV86"><small>Rikiuoti</small><div class="gsChipsV86" id="gsSortsV86" role="radiogroup" aria-label="Rikiavimas"></div></div>
        <div class="gsPanelFootV86"><button type="button" class="gsTextBtnV86" data-gs-clear-all>Atstatyti</button><button type="button" class="gsDoneV86" data-gs-done>Gerai</button></div>
      </div>
    </div>
    <div class="gsInfoV86" id="gsInfoV86" hidden>
      <div class="gsActiveV86" id="gsActiveV86"></div>
      <div class="gsMetaV86" id="gsMetaV86" aria-live="polite"></div>
    </div>
  </div>`;
}
function gsEnsureBarV86() {
  const grid = document.getElementById("activeCarGrid");
  if (!grid) return null;
  let bar = document.getElementById("gsBarV86");
  if (!bar) {
    grid.insertAdjacentHTML("beforebegin", gsBarHTMLV86());
    bar = document.getElementById("gsBarV86");
    const input = bar.querySelector("#gsInputV86");
    input.value = gsV86.q;
    gsBindV86(bar);
  } else if (bar.nextElementSibling !== grid) grid.before(bar);
  return bar;
}
function gsChipsHTMLV86(cars) {
  return GS_FILTERS_V86.map(([key, label]) => {
    const n = cars.filter(GS_TEST_V86[key]).length;
    const on = gsV86.filters.has(key);
    if (!n && !on) return "";
    return `<button type="button" class="gsChipV86${on ? " on" : ""}" data-gs-filter="${key}" aria-pressed="${on}">${on ? GS_ICON_V86.check : ""}<span>${escapeHTML(label)}</span><b>${n}</b></button>`;
  }).join("");
}
function gsSortsHTMLV86() {
  const cur = gsSortKeyV86();
  return GS_SORTS_V86.map(
    ([k, l]) =>
      `<button type="button" role="radio" aria-checked="${k === cur}" class="gsChipV86${k === cur ? " on" : ""}" data-gs-sort="${k}">${k === cur ? GS_ICON_V86.check : ""}<span>${escapeHTML(l)}</span></button>`
  ).join("");
}
function gsActiveHTMLV86() {
  return GS_FILTERS_V86.filter(([k]) => gsV86.filters.has(k))
    .map(
      ([k, l]) =>
        `<button type="button" class="gsTagV86" data-gs-filter="${k}" aria-label="Pašalinti filtrą ${escapeHTML(l)}"><span>${escapeHTML(l)}</span>${GS_ICON_V86.x}</button>`
    )
    .join("");
}

// ---------- Pritaikymas ----------
function gsMarkV86(text, tokens) {
  const raw = String(text || "");
  if (!tokens.length || !raw) return escapeHTML(raw);
  // Žymime pagal normalizuotą tekstą, bet rodome originalų (tos pačios raidės, be diakritikų palyginimui)
  const norm = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (norm.length !== raw.length) return escapeHTML(raw);
  const marks = new Array(raw.length).fill(false);
  for (const t of tokens) {
    let i = norm.indexOf(t);
    while (i !== -1) {
      for (let k = i; k < i + t.length; k++) marks[k] = true;
      i = norm.indexOf(t, i + t.length);
    }
  }
  let out = "",
    open = false;
  for (let i = 0; i < raw.length; i++) {
    if (marks[i] && !open) {
      out += "<mark>";
      open = true;
    } else if (!marks[i] && open) {
      out += "</mark>";
      open = false;
    }
    out += escapeHTML(raw[i]);
  }
  return out + (open ? "</mark>" : "");
}
function gsHighlightV86(card, tokens) {
  const title = card.querySelector(".carListTitle");
  if (title) {
    if (title.dataset.gsText == null) title.dataset.gsText = title.textContent;
    const html = gsMarkV86(title.dataset.gsText, tokens);
    if (title.innerHTML !== html) title.innerHTML = html;
  }
  const plate = card.querySelector(".lcPlateV61 b");
  if (plate) {
    if (plate.dataset.gsText == null) plate.dataset.gsText = plate.textContent;
    const compact = tokens
      .map(t => t.replace(/\s+/g, ""))
      .filter(t => gsCompactV86(plate.dataset.gsText).includes(t));
    const html = compact.length ? gsMarkV86(plate.dataset.gsText, compact) : escapeHTML(plate.dataset.gsText);
    if (plate.innerHTML !== html) plate.innerHTML = html;
  }
}
function gsMatchListV86(cars, tokens, useFilters) {
  const out = [];
  for (const car of cars) {
    if (useFilters) {
      let ok = true;
      for (const f of gsV86.filters) if (GS_TEST_V86[f] && !GS_TEST_V86[f](car)) ok = false;
      if (!ok) continue;
    }
    const score = tokens.length ? gsScoreV86(gsIndexV86(car), tokens) : 0;
    if (score >= 0) out.push({ car, score });
  }
  return out;
}
function gsApplyV86({ resetPage = false } = {}) {
  const grid = document.getElementById("activeCarGrid");
  const bar = gsEnsureBarV86();
  if (!grid || !bar) return;
  if (resetPage) gsV86.shown = GS_PAGE_V86;
  const active = (state.cars || []).filter(c => c.status !== "parduotas");
  const tokens = gsTokensV86(gsV86.q);
  const searching = tokens.length > 0 || gsV86.filters.size > 0;
  // Filtrai: rodomi tik turintys automobilių; neaktualūs išjungiami
  gsV86.filters.forEach(f => {
    if (!active.some(GS_TEST_V86[f] || (() => false))) gsV86.filters.delete(f);
  });
  const chips = bar.querySelector("#gsChipsV86");
  const chipsHTML = active.length > 3 ? gsChipsHTMLV86(active) : "";
  if (chips.innerHTML !== chipsHTML) chips.innerHTML = chipsHTML;
  bar.querySelector("#gsFilterGroupV86").hidden = !chipsHTML;
  const sorts = bar.querySelector("#gsSortsV86");
  const sortsHTML = gsSortsHTMLV86();
  if (sorts.innerHTML !== sortsHTML) sorts.innerHTML = sortsHTML;
  bar.hidden = active.length < 2 && !searching;
  const sort = gsSortKeyV86();
  const cmp = gsCompareV86(sort);
  const list = gsMatchListV86(active, tokens, true);
  list.sort((a, b) => (tokens.length ? b.score - a.score : 0) || cmp(a.car, b.car));
  const cards = new Map();
  grid.querySelectorAll(":scope > [data-open-car]").forEach(el => cards.set(el.dataset.openCar, el));
  const limit = gsV86.shown;
  const visible = new Set();
  list.forEach(({ car }, i) => {
    const el = cards.get(car.id);
    if (!el) return;
    el.style.order = String(i);
    const show = i < limit;
    el.classList.toggle("gsHideV86", !show);
    if (show) {
      visible.add(car.id);
      gsHighlightV86(el, tokens);
    }
  });
  cards.forEach((el, id) => {
    if (!list.some(x => x.car.id === id)) {
      el.classList.add("gsHideV86");
      el.style.order = "";
    }
  });
  grid.classList.toggle("gsSearchingV86", searching);
  // Tuščia būsena ir parduotuose rasti
  const soldMatches = tokens.length
    ? gsMatchListV86(
        (state.cars || []).filter(c => c.status === "parduotas"),
        tokens,
        false
      ).length
    : 0;
  let empty = grid.querySelector(":scope > .gsEmptyV86");
  if (searching && !list.length) {
    const q = gsV86.q.trim();
    const html = `<div class="gsEmptyIcoV86">${GS_ICON_V86.search}</div><strong>${q ? `Nieko nerasta pagal „${escapeHTML(q)}“` : "Pagal pasirinktus filtrus automobilių nėra"}</strong>${
      soldMatches
        ? `<button type="button" class="gsLinkV86" data-gs-sold>${soldMatches === 1 ? "1 rastas parduotuose" : `${soldMatches} rasti parduotuose`}</button>`
        : q
          ? `<button type="button" class="gsLinkV86" data-gs-sold>Ieškoti ir parduotuose</button>`
          : ""
    }${gsV86.filters.size ? `<button type="button" class="gsLinkV86 muted" data-gs-reset>Išvalyti filtrus</button>` : ""}`;
    if (!empty) {
      grid.insertAdjacentHTML("beforeend", `<div class="gsEmptyV86" style="order:-1"></div>`);
      empty = grid.querySelector(":scope > .gsEmptyV86");
    }
    if (empty.innerHTML !== html) empty.innerHTML = html;
  } else empty?.remove();
  // Bazinė tuščio garažo būsena (be automobilių) – kai ieškoma, nerodoma
  grid
    .querySelectorAll(":scope > :not([data-open-car]):not(.gsEmptyV86):not(.gsMoreV86)")
    .forEach(n => n.classList.toggle("gsHideV86", searching));
  // Daugiau rezultatų – slenkant
  let more = grid.querySelector(":scope > .gsMoreV86");
  const rest = list.length - limit;
  if (rest > 0) {
    if (!more) {
      grid.insertAdjacentHTML("beforeend", `<button type="button" class="gsMoreV86" data-gs-more></button>`);
      more = grid.querySelector(":scope > .gsMoreV86");
    }
    more.style.order = String(list.length + 1);
    more.textContent = `Rodyti dar ${Math.min(rest, GS_PAGE_V86)} (liko ${rest})`;
    gsObserveMoreV86(more);
  } else more?.remove();
  // Rezultatų eilutė
  const meta = bar.querySelector("#gsMetaV86");
  const metaText = searching
    ? list.length
      ? `Rasta ${list.length} iš ${active.length}${soldMatches ? ` · ${soldMatches} parduotuose` : ""}`
      : ""
    : "";
  if (meta.textContent !== metaText) meta.textContent = metaText;
  meta.hidden = !metaText;
  const tags = bar.querySelector("#gsActiveV86");
  const tagsHTML = gsActiveHTMLV86();
  if (tags.innerHTML !== tagsHTML) tags.innerHTML = tagsHTML;
  tags.hidden = !tagsHTML;
  bar.querySelector("#gsInfoV86").hidden = !metaText && !tagsHTML;
  bar.querySelector("#gsClearV86").hidden = !gsV86.q;
  bar.querySelector("#gsSortBtnV86")?.classList.toggle("on", sort !== "new" || gsV86.filters.size > 0);
  const badge = bar.querySelector("#gsBadgeV86");
  const nb = gsV86.filters.size + (sort !== "new" ? 1 : 0);
  if (badge.textContent !== String(nb || "")) badge.textContent = nb ? String(nb) : "";
  badge.hidden = !nb;
  bar.querySelector("[data-gs-clear-all]").hidden = !nb;
  gsV86.lastCount = list.length;
  gsV86.lastIds = list.map(x => x.car.id);
  // Parduotų sąrašas – ta pati paieška, kai jis atidarytas
  gsApplySoldV86(tokens);
}
function gsApplySoldV86(tokens) {
  const grid = document.getElementById("soldCarGrid");
  if (!grid || !grid.children.length) return;
  const sold = (state.cars || []).filter(c => c.status === "parduotas");
  const ids = new Map(gsMatchListV86(sold, tokens, false).map(({ car, score }) => [car.id, score]));
  const order = [...ids.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  grid.querySelectorAll(":scope > [data-open-car]").forEach(el => {
    const hit = !tokens.length || ids.has(el.dataset.openCar);
    el.classList.toggle("gsHideV86", !hit);
    el.style.order = tokens.length && hit ? String(order.indexOf(el.dataset.openCar)) : "";
    if (hit) gsHighlightV86(el, tokens);
  });
}
function gsObserveMoreV86(el) {
  if (!("IntersectionObserver" in window)) return;
  if (!gsV86.io)
    gsV86.io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          gsV86.shown += GS_PAGE_V86;
          gsApplyV86();
        }
      },
      { rootMargin: "600px 0px" }
    );
  gsV86.io.disconnect();
  gsV86.io.observe(el);
}
function gsScheduleV86(opts) {
  if (gsV86.raf) cancelAnimationFrame(gsV86.raf);
  gsV86.raf = requestAnimationFrame(() => {
    gsV86.raf = 0;
    gsApplyV86(opts);
  });
}
function gsSortMenuV86(open) {
  const menu = document.getElementById("gsSortMenuV86");
  const btn = document.getElementById("gsSortBtnV86");
  if (!menu || !btn) return;
  if (!!open === (btn.getAttribute("aria-expanded") === "true")) return;
  btn.setAttribute("aria-expanded", String(!!open));
  menu.classList.toggle("show", !!open);
  aeAnimHeightV87(menu, !!open);
}
function gsBindV86(bar) {
  const input = bar.querySelector("#gsInputV86");
  input.addEventListener("input", () => {
    gsV86.q = input.value;
    gsSaveV86();
    gsScheduleV86({ resetPage: true });
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Escape" && !input.value) gsSortMenuV86(false);
    if (e.key === "Escape" && input.value) {
      e.preventDefault();
      e.stopPropagation();
      input.value = "";
      gsV86.q = "";
      gsSaveV86();
      gsApplyV86({ resetPage: true });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (gsV86.lastCount === 1 && gsV86.lastIds?.[0]) {
        input.blur();
        openCar(gsV86.lastIds[0]);
      } else input.blur();
    }
  });
  bar.addEventListener("click", e => {
    const t = e.target;
    if (t.closest("#gsClearV86")) {
      input.value = "";
      gsV86.q = "";
      gsSaveV86();
      gsApplyV86({ resetPage: true });
      input.focus({ preventScroll: true });
      return;
    }
    if (t.closest("#gsSortBtnV86")) {
      gsSortMenuV86(document.getElementById("gsSortBtnV86").getAttribute("aria-expanded") !== "true");
      return;
    }
    if (t.closest("[data-gs-done]")) {
      gsSortMenuV86(false);
      return;
    }
    if (t.closest("[data-gs-clear-all]")) {
      gsV86.filters.clear();
      state.ui = state.ui || {};
      if (state.ui.garageSort && state.ui.garageSort !== "new") {
        state.ui.garageSort = "new";
        saveState();
      }
      gsSaveV86();
      vibrate(6);
      gsApplyV86({ resetPage: true });
      return;
    }
    const sortBtn = t.closest("[data-gs-sort]");
    if (sortBtn) {
      state.ui = state.ui || {};
      state.ui.garageSort = sortBtn.dataset.gsSort;
      saveState();
      vibrate(6);
      gsApplyV86({ resetPage: true });
      return;
    }
    const chip = t.closest("[data-gs-filter]");
    if (chip) {
      const k = chip.dataset.gsFilter;
      if (gsV86.filters.has(k)) gsV86.filters.delete(k);
      else gsV86.filters.add(k);
      gsSaveV86();
      vibrate(6);
      gsApplyV86({ resetPage: true });
    }
  });
}
document.addEventListener("click", e => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.isConnected && !t.closest("#gsBarV86")) {
    if (document.getElementById("gsSortBtnV86")?.getAttribute("aria-expanded") === "true")
      gsSortMenuV86(false);
  }
  if (t.closest("#activeCarGrid [data-gs-more]")) {
    gsV86.shown += GS_PAGE_V86;
    gsApplyV86();
    return;
  }
  if (t.closest("#activeCarGrid [data-gs-reset]")) {
    gsV86.filters.clear();
    gsSaveV86();
    gsApplyV86({ resetPage: true });
    return;
  }
  if (t.closest("#activeCarGrid [data-gs-sold]")) {
    state.ui = state.ui || {};
    if (!state.ui.soldCarsOpen) document.getElementById("toggleSoldCarsBtn")?.click();
    setTimeout(() => {
      gsApplyV86();
      aeRevealV87(document.getElementById("soldCarsSection"), { anchor: "start", follow: 300 });
    }, 120);
  }
});
document.addEventListener("keydown", e => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
  const el = document.activeElement;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
  const input = document.getElementById("gsInputV86");
  if (!input || !input.offsetParent || document.getElementById("modalBackdrop")?.classList.contains("show"))
    return;
  e.preventDefault();
  input.focus({ preventScroll: true });
});

const __renderV86 = render;
render = function () {
  const r = __renderV86.apply(this, arguments);
  try {
    gsApplyV86();
  } catch (err) {
    console.warn("Garažo paieška v86", err);
  }
  return r;
};
window.AutoEasierGarageSearch = {
  score: (car, q) => gsScoreV86(gsIndexV86(car), gsTokensV86(q)),
  apply: () => gsApplyV86(),
  set: q => {
    gsV86.q = String(q || "");
    const input = document.getElementById("gsInputV86");
    if (input) input.value = gsV86.q;
    gsSaveV86();
    gsApplyV86({ resetPage: true });
  }
};
