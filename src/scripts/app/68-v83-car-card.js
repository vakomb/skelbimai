// v83 → v85: automobilio kortelė – minimalistinė ir interaktyvi. Ankstesni sluoksniai (renderCarSheet grandinė)
// sukuria visus elementus ir jų įvykius, o čia jie tik perdėliojami į naują struktūrą:
//   antraštė (valst. nr. ir dienos garaže) → nuotraukų juosta → „Duomenys“ (visada atidaryti: TA, draudimas, SDK,
//   registracija, rida, variklis, kuras, liudijimas, VIN su kopijavimu) → skaičiai (Pirkta · Išlaidos · Savikaina,
//   po jais kaina ir marža; išskleidus – savikainos sudėtis ir išlaidos pridėjimas vietoje) → pasirengimas
//   pardavimui / dokumentai buhalterei → išskleidžiamos skiltys (užduotys, nuotraukos, dokumentai) →
//   prilimpanti veiksmų juosta (Parduoti, Dokumentai, ⋯).
// v85: skiltys išsiskleidžia sklandžiai (Web Animations – aukštis + turinio išryškėjimas), veiksmai kortelėje jos
// neuždaro (išlaida pridedama vietoje, redagavimas grįžta į kortelę), Regitros patikros pašalintos, tas pats
// stilius – ir varianto kortelėje.
// Esami id ir klasės (#sellCarBtn, .carPpBottomBtn, .carInvBottomBtn, #editCarInfoBtn, #deleteCarBtn, #carAddPhotos,
// #viewVehicledoc_*) išlieka – nuo jų priklauso kiti moduliai. Stilius – styles/192-v83-car-card.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const CC_SVG_V83 = d =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CC_ICON_V83 = {
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  bang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 6.5v7M12 17.5h.01"/></svg>',
  clock: CC_SVG_V83('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  camera: CC_SVG_V83(
    '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/>'
  ),
  doc: CC_SVG_V83(
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'
  ),
  more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  pen: CC_SVG_V83('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  copy: CC_SVG_V83(
    '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"/>'
  ),
  cal: CC_SVG_V83('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/>'),
  gauge: CC_SVG_V83(
    '<path d="M4.5 17a8 8 0 1 1 15 0"/><path d="m12 13 3.5-4"/><circle cx="12" cy="13.5" r="1.4"/>'
  ),
  engine: CC_SVG_V83(
    '<path d="M5 9h3l1.5-2h5L16 9h1.5v2.5H20v4h-2.5V18H8l-2-2H4v-5h1z"/><path d="M9 4.5h4M11 4.5V7"/>'
  ),
  fuel: CC_SVG_V83(
    '<path d="M5 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14M4 20h11M7.5 8h4"/><path d="M14 10h1.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8.5L17.5 6"/>'
  ),
  card: CC_SVG_V83('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M7 10h5M7 14h8"/>'),
  plus: CC_SVG_V83('<path d="M12 5v14M5 12h14"/>'),
  clip: CC_SVG_V83(
    '<path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 6.9"/>'
  )
};
const CC_SECTIONS_V83 = ["tasks", "photos", "docs"];
const CC_EXP_CATS_V85 = [
  "Servisas",
  "Detalės",
  "Kuras",
  "Transportas",
  "Plovimas",
  "Reklama",
  "Mokesčiai",
  "Kita"
];
// Atvirų blokų būsena tarp perpiešimų (pvz. pažymėjus užduotį): savikainos sudėtis ir pasirengimo sąrašas
const ccOpenV83 = { cost: new Set(), ready: new Set() };
let ccReturnCarV83 = "";

// ---------- Duomenys ----------
function ccCarV83(id) {
  return (state.cars || []).find(c => c.id === id) || null;
}
function ccSoldV83(car) {
  return car?.status === "parduotas";
}
function ccStartISOV83(car) {
  return car.createdDateISO || String(car.createdAt || "").slice(0, 10) || "";
}
function ccDaysV83(car) {
  const start = ccStartISOV83(car);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  if (ccSoldV83(car)) {
    const end = car.soldDateISO || String(car.soldAt || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(end) ? { sold: true, days: daysBetweenISO(start, end) } : null;
  }
  return { sold: false, days: daysBetweenISO(start, todayISO()) };
}
function ccDaysWordV83(n) {
  return `${n} d.`;
}
function ccPhotosV83(car) {
  const list = (car.photos || []).filter(Boolean);
  return list.length ? list : car.imageSrc ? [car.imageSrc] : [];
}
function ccTaskStatsV83(car) {
  const list = car.checklist || [];
  const today = todayISO();
  return {
    total: list.length,
    done: list.filter(t => t.done).length,
    late: list.filter(t => !t.done && t.dueDate && t.dueDate < today).length
  };
}
function ccPriceV83(car) {
  const n = Number(car.askingPrice);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function ccSignedMoneyV83(n) {
  const v = Math.round(Number(n) || 0);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${moneyFmt(Math.abs(v))}`;
}
function ccReducedV85() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
// Būsena kaip dabartinėse plytelėse (vehicleStatusState): good/warn – galioja, bad – pasibaigė, neutral – nežinoma
function ccStatusItemV83(car, key, label, status, until) {
  const st = vehicleStatusState(status || "unknown", until || "");
  if (st.cls === "good" || st.cls === "warn")
    return {
      key,
      state: "done",
      label: `${label} galioja`,
      meta: until ? "iki " + String(until).slice(0, 10) : "galioja",
      warn: st.cls === "warn"
    };
  if (st.cls === "bad")
    return {
      key,
      state: "bad",
      label: `${label} ${status === "invalid" ? "negalioja" : "pasibaigęs"}`,
      sub: until ? `pasibaigė ${String(until).slice(0, 10)}` : "negalioja",
      act: "Atnaujinti"
    };
  return { key, state: "todo", label: `${label} galioja`, sub: "Nežinoma", act: "Įrašyti" };
}
// Aktyvaus automobilio pasirengimo punktai (tvarka – prioritetas „Kitam žingsniui“)
function ccReadyItemsV83(car) {
  const items = [];
  const ta = ccStatusItemV83(car, "ta", "TA", car.taStatus, car.taUntil);
  ta.next = ta.state === "bad" ? "Atnaujinti techninę apžiūrą" : "Įrašyti techninę apžiūrą";
  items.push(ta);
  const ins = ccStatusItemV83(car, "insurance", "Draudimas", car.insuranceStatus, car.insuranceUntil);
  ins.next = ins.state === "bad" ? "Atnaujinti draudimą" : "Įrašyti draudimą";
  items.push(ins);
  const sdkCls = sdkClass(car.sdkStatus);
  const sdkOk = sdkCls === "sdkDone" || car.sdkStatus === "submitted";
  const sdkLabel = SDK_STATES.find(x => x[0] === car.sdkStatus)?.[1] || "Nepateiktas";
  items.push(
    sdkOk
      ? { key: "sdk", state: "done", label: "SDK pateiktas", meta: car.sdk || sdkLabel.toLowerCase() }
      : {
          key: "sdk",
          state: "todo",
          label: "SDK pateiktas",
          sub: !car.sdkStatus || car.sdkStatus === "unset" ? "Nepateiktas" : sdkLabel,
          late: sdkCls === "sdkLate",
          act: "Įrašyti",
          next: "Įrašyti SDK"
        }
  );
  // Nuotraukos: užtenka bent vienos – kiek jų reikia, sprendžia pats vartotojas
  const photos = ccPhotosV83(car).length;
  items.push(
    photos
      ? { key: "photos", state: "done", label: "Nuotraukos skelbimui", meta: "pridėtos" }
      : {
          key: "photos",
          state: "todo",
          label: "Nuotraukos skelbimui",
          sub: "Nuotraukų dar nėra",
          act: "Pridėti",
          next: "Pridėti nuotraukų"
        }
  );
  const t = ccTaskStatsV83(car);
  items.push(
    t.done === t.total
      ? {
          key: "tasks",
          state: "done",
          label: "Visos užduotys atliktos",
          meta: t.total ? `${t.done} iš ${t.total}` : "užduočių nėra"
        }
      : {
          key: "tasks",
          state: "todo",
          label: "Visos užduotys atliktos",
          sub: `${t.done} iš ${t.total} atlikta`,
          late: t.late,
          act: "Atlikti",
          next: "Atlikti užduotis"
        }
  );
  const purchase = (car.documents || []).filter(d => d.kind === "purchase").pop();
  items.push(
    purchase
      ? {
          key: "purchase",
          state: "done",
          label: "Pirkimo sutartis prisegta",
          meta: (purchase.name || "").replace(/\.pdf$/i, "").slice(0, 18) || "prisegta"
        }
      : {
          key: "purchase",
          state: "todo",
          label: "Pirkimo sutartis prisegta",
          sub: "Nėra",
          act: "Pridėti",
          next: "Pridėti pirkimo sutartį",
          choice: [
            ["purchase-create", "Sukurti sutartį"],
            ["purchase-upload", "Įkelti failą"]
          ]
        }
  );
  const price = ccPriceV83(car);
  items.push(
    price
      ? { key: "price", state: "done", label: "Kaina nustatyta", meta: moneyFmt(price) }
      : {
          key: "price",
          state: "todo",
          label: "Kaina nustatyta",
          sub: "Nėra",
          act: "Nustatyti",
          next: "Nustatyti kainą"
        }
  );
  return items;
}
// Parduoto automobilio dokumentai buhalterei: trūkstami – tie patys, kaip Buhalterijoje („Laukia pateikimo“)
function ccAccountantItemsV83(car) {
  let missing = [];
  try {
    missing = (window.__aeRequiredDocsV83?.list?.() || []).filter(i => i.carId === car.id);
  } catch (e) {
    missing = [];
  }
  const miss = new Map(missing.map(i => [i.key, i]));
  const items = [];
  const kinds = [
    ["purchase", "Pirkimo sutartis"],
    ["registration", "Registracijos dokumentas"],
    ["sale", "Pardavimo sutartis"]
  ];
  for (const [kind, label] of kinds) {
    const key = `car:${car.id}:${kind}`;
    if (miss.has(key)) {
      items.push({
        key,
        state: "todo",
        label,
        sub: "Automobilio dokumentas",
        act: "Pridėti",
        run: kind === "sale" ? "" : `upload:${kind}`,
        choice:
          kind === "sale"
            ? [
                ["sale-create", "Sukurti sutartį"],
                ["upload:sale", "Įkelti failą"]
              ]
            : null
      });
      miss.delete(key);
    } else if ((car.documents || []).some(d => d.kind === kind))
      items.push({ key, state: "done", label, meta: "prisegta" });
  }
  // Užduoties išlaida: jei ji susieta su operacija, dokumento reikalauja operacija (žemiau), todėl čia – tik
  // trūkstami arba jau su čekiu (tas pats principas kaip Buhalterijoje)
  (car.checklist || [])
    .filter(t => t.done && Number(t.expense || 0) > 0)
    .forEach(t => {
      const key = `task:${car.id}:${t.id}`;
      const label = `Čekis: ${t.name || "užduotis"}`;
      if (miss.has(key)) {
        items.push({
          key,
          state: "todo",
          label,
          sub: moneyFmt(t.expense),
          act: "Pridėti",
          run: `req:${key}`
        });
        miss.delete(key);
      } else if ((t.receipts || []).length)
        items.push({ key, state: "done", label, meta: moneyFmt(t.expense) });
    });
  (state.finances?.transactions || [])
    .filter(tx => tx && tx.type === "expense" && tx.carId === car.id)
    .forEach(tx => {
      const key = `tx:${tx.id}`;
      const label = `Čekis: ${tx.category || tx.title || "išlaida"}`;
      if (miss.has(key)) {
        items.push({
          key,
          state: "todo",
          label,
          sub: moneyFmt(tx.amount),
          act: "Pridėti",
          run: `req:${key}`
        });
        miss.delete(key);
      } else items.push({ key, state: "done", label, meta: moneyFmt(tx.amount) });
    });
  miss.forEach((i, key) =>
    items.push({ key, state: "todo", label: i.label, sub: i.detail || "", act: "Pridėti", run: `req:${key}` })
  );
  items.forEach(i => {
    if (i.state !== "done") i.next = `Pridėti: ${i.label.replace(/^Čekis: /, "čekis – ")}`;
  });
  return items;
}

// ---------- Sklandus išskleidimas (aukštis + turinys) ----------
// Uždarytas blokas turi klasę ccShutV85 (aukštis 0, nematomas). Animacija – Web Animations API: aukštis keičiasi
// nuo dabartinio (net jei ankstesnė animacija dar nesibaigė) iki galutinio, turinys išryškėja ir pasislenka 6 px.
function ccAnimBodyV85(body, open) {
  if (!body) return;
  const inner = body.firstElementChild;
  const from = body.getBoundingClientRect().height;
  body._ccAnim?.cancel();
  body._ccFade?.cancel();
  body.classList.toggle("ccShutV85", !open);
  body.setAttribute("aria-hidden", String(!open));
  if (inner) inner.inert = !open;
  if (ccReducedV85() || !body.animate) return;
  const to = open ? body.getBoundingClientRect().height : 0;
  if (Math.abs(to - from) < 1) return;
  const dur = Math.round(Math.min(380, Math.max(220, 180 + Math.abs(to - from) * 0.22)));
  body._ccAnim = body.animate(
    [
      { height: from + "px", visibility: "visible" },
      { height: to + "px", visibility: "visible" }
    ],
    {
      duration: open ? dur : Math.round(dur * 0.82),
      easing: open ? "cubic-bezier(.2,.8,.2,1)" : "cubic-bezier(.4,0,.2,1)"
    }
  );
  if (inner)
    body._ccFade = inner.animate(
      open
        ? [
            { opacity: 0, transform: "translateY(-6px)" },
            { opacity: 1, transform: "none" }
          ]
        : [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "translateY(-4px)" }
          ],
      { duration: open ? dur : Math.round(dur * 0.6), easing: "ease", fill: open ? "none" : "forwards" }
    );
  body._ccAnim.onfinish = () => {
    body._ccAnim = null;
    if (!open) body._ccFade?.cancel();
  };
}
// Turinio pakeitimas su sklandžiu aukščio perėjimu (pvz. išlaidos forma → atnaujintas sąrašas)
function ccMorphV85(el, mutate) {
  if (!el) return mutate();
  const from = el.getBoundingClientRect().height;
  el._ccMorph?.cancel();
  el = mutate() || el;
  if (ccReducedV85() || !el.animate || !el.isConnected) return;
  const to = el.getBoundingClientRect().height;
  if (Math.abs(to - from) < 1) return;
  el.style.overflow = "hidden";
  el._ccMorph = el.animate([{ height: from + "px" }, { height: to + "px" }], {
    duration: Math.round(Math.min(360, Math.max(200, 160 + Math.abs(to - from) * 0.25))),
    easing: "cubic-bezier(.2,.8,.2,1)"
  });
  el._ccMorph.onfinish = el._ccMorph.oncancel = () => {
    el.style.overflow = "";
  };
}
function ccBodyHTMLV85(open, id, innerAttrs, inner) {
  return `<div class="ccAccBodyV83${open ? "" : " ccShutV85"}"${id ? ` id="${id}"` : ""} aria-hidden="${!open}"><div class="ccAccInnerV83" ${innerAttrs}${open ? "" : " inert"}>${inner}</div></div>`;
}

// ---------- HTML ----------
function ccRowHTMLV83(i) {
  const ico = i.state === "done" ? CC_ICON_V83.check : i.state === "bad" ? CC_ICON_V83.bang : "";
  const sub = i.sub
    ? `<small>${escapeHTML(i.sub)}${i.late ? ` · <em>${typeof i.late === "number" ? `${i.late} vėluoja` : "vėluoja"}</em>` : ""}</small>`
    : "";
  const right =
    i.state === "done"
      ? `<span class="ccRowMetaV83${i.warn ? " warn" : ""}">${escapeHTML(i.meta || "")}</span>`
      : `<button type="button" class="ccPillV83${i.state === "bad" ? " danger" : ""}" data-cc-act="${escapeHTML(i.run || i.key)}"${i.choice ? ` data-cc-choice="${escapeHTML(i.key)}" aria-expanded="false"` : ""}>${escapeHTML(i.act)}${CC_ICON_V83.arrow}</button>`;
  const choice = i.choice
    ? `<div class="ccChoiceV83" data-cc-choice-for="${escapeHTML(i.key)}" hidden>${i.choice
        .map(
          ([act, text]) =>
            `<button type="button" data-cc-act="${escapeHTML(act)}">${escapeHTML(text)}</button>`
        )
        .join("")}</div>`
    : "";
  return `<div class="ccRowV83 ${i.state}" data-cc-row="${escapeHTML(i.key)}"><span class="ccRowIcoV83">${ico}</span><span class="ccRowMainV83"><strong>${escapeHTML(i.label)}</strong>${sub}</span>${right}</div>${choice}`;
}
function ccReadyHTMLV83(car) {
  const sold = ccSoldV83(car);
  const items = sold ? ccAccountantItemsV83(car) : ccReadyItemsV83(car);
  const total = items.length;
  const done = items.filter(i => i.state === "done").length;
  const complete = done === total;
  const open = !complete && ccOpenV83.ready.has(car.id);
  const title = sold ? "Dokumentai buhalterei" : "Pasirengimas pardavimui";
  const todo = [...items.filter(i => i.state === "bad"), ...items.filter(i => i.state === "todo")];
  const next = todo[0];
  const pct = total ? done / total : 1;
  const bad = items.some(i => i.state === "bad");
  // Viena ištisinė juosta (be punktyro): mėlyna – progresas, žalia – viskas paruošta
  const progress = `<span class="ccProgV85${complete ? " all" : ""}${bad ? " bad" : ""}" role="progressbar" aria-label="${escapeHTML(title)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="--p:${pct.toFixed(4)}"></i></span>`;
  const send = sold ? `<div class="ccSendV83${complete ? " ready" : ""}" data-cc-send-slot></div>` : "";
  if (complete || !total)
    return `<section class="ccCardV83 ccRdyV83 is-complete" data-cc-ready><div class="ccRdyHeadV83 static"><span class="ccRdyTopV83"><span class="ccDoneMarkV83">${CC_ICON_V83.check}</span><strong>${sold ? "Viskas paruošta buhalterei" : "Paruoštas parduoti"}</strong><span class="ccRdyCountV83"><b>${done}</b>/${total}</span></span>${progress}</div>${send}</section>`;
  const list = [...todo, ...items.filter(i => i.state === "done")].map(ccRowHTMLV83).join("");
  return `<section class="ccCardV83 ccRdyV83${open ? " is-open" : ""}" data-cc-ready>
    <button type="button" class="ccRdyHeadV83" data-cc-ready-toggle aria-expanded="${open}" aria-controls="ccRdyListV83"><span class="ccRdyTopV83"><strong>${title}</strong><span class="ccRdyCountV83"><b>${done}</b> iš ${total}</span><span class="ccChevV83">${CC_ICON_V83.chev}</span></span>${progress}</button>
    <div class="ccNextV83${next.state === "bad" ? " bad" : ""}"><span><small>Kitas žingsnis</small><b>${escapeHTML(next.next || next.label)}</b></span><button type="button" class="ccPillV83${next.state === "bad" ? " danger" : ""}" data-cc-act="${escapeHTML(next.run || next.key)}" data-cc-next>${escapeHTML(next.act)}${CC_ICON_V83.arrow}</button></div>
    ${ccBodyHTMLV85(open, "ccRdyListV83", "", `<div class="ccRowsV83">${list}</div>${send}`)}
  </section>`;
}
// Skaičiai: Pirkta · Išlaidos · Savikaina (vienoje eilutėje). Išskleidus – savikainos sudėtis, kaina ir marža,
// išlaidos pridėjimas vietoje
function ccNumsHTMLV83(car) {
  const cost = carTotalCost(car);
  const buy = Number(car.buyPrice || 0);
  const open = ccOpenV83.cost.has(car.id);
  return `<section class="ccCardV83 ccNumsV83${open ? " is-open" : ""}" data-cc-nums>
    <button type="button" class="ccNumsRowV85" data-cc-cost aria-expanded="${open}" aria-controls="ccCostV83">
      <span class="ccNumV85"><small>Pirkta</small><b>${moneyFmt(buy)}</b></span>
      <span class="ccNumV85"><small>Išlaidos</small><b>${moneyFmt(cost - buy)}</b></span>
      <span class="ccNumV85 total"><small>Savikaina</small><b>${moneyFmt(cost)}</b></span>
      <span class="ccChevV83">${CC_ICON_V83.chev}</span>
    </button>
    ${ccBodyHTMLV85(open, "ccCostV83", "data-cc-cost-body", ccCostRowsHTMLV83(car))}
  </section>`;
}
// Kaina ir marža (parduoto – pardavimo kaina ir marža)
function ccPriceRowsHTMLV85(car) {
  const cost = carTotalCost(car);
  if (ccSoldV83(car)) {
    const sale = Number(car.soldPrice || 0);
    const m = sale - cost;
    return `<div class="ccNumsFootV85"><span class="ccFootItemV85"><small>Parduota</small><b>${moneyFmt(sale)}</b></span><span class="ccFootItemV85"><small>Marža</small><b class="${m >= 0 ? "pos" : "neg"}" data-cc-margin>${ccSignedMoneyV83(m)}</b></span></div>`;
  }
  const price = ccPriceV83(car);
  const m = price ? price - cost : null;
  return `<div class="ccNumsFootV85"><span class="ccFootItemV85 ccPriceCellV83" data-cc-price-cell><small>Kaina</small>${
    price
      ? `<button type="button" class="ccPriceBtnV83" data-cc-price aria-label="Keisti kainą"><b>${moneyFmt(price)}</b>${CC_ICON_V83.pen}</button>`
      : `<button type="button" class="ccSetPriceV83" data-cc-price>Nustatyti kainą</button>`
  }</span><span class="ccFootItemV85"><small>Marža</small><b class="${m === null ? "none" : m >= 0 ? "pos" : "neg"}" data-cc-margin>${m === null ? "—" : ccSignedMoneyV83(m)}</b></span></div>`;
}
// Savikainos sudėtis – ta pati logika kaip carChecklistExpenses (07-finance.js)
function ccCostRowsHTMLV83(car, flash = "") {
  const rows = [["Pirkimo kaina", Number(car.buyPrice || 0), "Pirkta", false, ""]];
  (car.checklist || [])
    .filter(t => Number(t.expense) > 0)
    .forEach(t =>
      rows.push([
        t.name || "Užduotis",
        Number(t.expense),
        t.done ? "Užduotis" : "Užduotis · planuojama",
        false,
        ""
      ])
    );
  (state.finances?.transactions || [])
    .filter(
      tx =>
        tx &&
        tx.source === "accounting" &&
        tx.carId === car.id &&
        (tx.type === "expense" || tx.type === "income")
    )
    .forEach(tx => {
      const amount = Math.abs(Number(tx.amount) || 0);
      rows.push([
        tx.title || tx.category || (tx.type === "income" ? "Įplauka" : "Išlaida"),
        tx.type === "income" ? -amount : amount,
        `${tx.type === "income" ? "Įplauka" : "Išlaida"}${tx.date ? " · " + String(tx.date).slice(0, 10) : ""}${(tx.attachments || []).length ? " · su čekiu" : ""}`,
        tx.type === "income",
        tx.id
      ]);
    });
  return `<div class="ccCostListV83">${rows
    .map(
      ([label, amount, sub, minus, id]) =>
        `<div class="ccCostRowV83${id && id === flash ? " ccFlashV85" : ""}"><span><strong>${escapeHTML(label)}</strong>${sub ? `<small>${escapeHTML(sub)}</small>` : ""}</span><b class="${minus ? "neg" : ""}">${minus ? "−" + moneyFmt(Math.abs(amount)) : moneyFmt(amount)}</b></div>`
    )
    .join(
      ""
    )}<div class="ccCostRowV83 total"><span><strong>Savikaina</strong></span><b>${moneyFmt(carTotalCost(car))}</b></div></div>${ccPriceRowsHTMLV85(car)}<div class="ccExpSlotV85" data-cc-exp-slot><button type="button" class="ccAddExpV85" data-cc-exp-open>${CC_ICON_V83.plus}Pridėti išlaidą</button></div>`;
}
function ccExpFormHTMLV85(car) {
  return `<form class="ccExpFormV85" data-cc-exp-form novalidate>
    <div class="ccExpHeadV85"><strong>Nauja išlaida</strong><small>${escapeHTML(car.name || "")}</small></div>
    <label class="ccExpAmtV85"><input type="text" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Suma, €" data-cc-exp-amount><i>€</i></label>
    <div class="ccExpCatsV85" role="radiogroup" aria-label="Kategorija">${CC_EXP_CATS_V85.map(
      (c, i) =>
        `<button type="button" role="radio" aria-checked="${i === 0}" class="${i === 0 ? "on" : ""}" data-cc-exp-cat="${escapeHTML(c)}">${escapeHTML(c)}</button>`
    ).join("")}</div>
    <div class="ccExpRowV85">
      <label class="ccExpFieldV85"><small>Data</small><input type="date" value="${todayISO()}" data-cc-exp-date></label>
      <label class="ccExpFileV85">${CC_ICON_V83.clip}<span data-cc-exp-file-label>Čekis</span><input type="file" accept="application/pdf,image/*" multiple data-cc-exp-file></label>
    </div>
    <label class="ccExpFieldV85 wide"><small>Pastaba</small><input type="text" autocomplete="off" placeholder="Nebūtina" data-cc-exp-note></label>
    <div class="ccExpActsV85"><button type="button" class="ghost" data-cc-exp-cancel>Atšaukti</button><button type="submit" class="go">Pridėti išlaidą</button></div>
  </form>`;
}
function ccSecHTMLV83(key, title, summary, open, help = "") {
  return `<section class="ccCardV83 ccSecV83${open ? " is-open" : ""}" data-cc-sec="${key}"><div class="ccSecHeadV83"><button type="button" class="ccSecToggleV83" data-cc-sec-toggle="${key}" aria-expanded="${open}" aria-controls="ccSec-${key}"><span class="ccSecTitleV83">${escapeHTML(title)}</span><span class="ccSecSumV83">${summary}</span><span class="ccChevV83">${CC_ICON_V83.chev}</span></button>${help}</div>${ccBodyHTMLV85(open, "ccSec-" + key, `data-cc-sec-body="${key}"`, "")}</section>`;
}
function ccHeroHTMLV83(car, kind = "car") {
  const photos = ccPhotosV83(car);
  if (!photos.length)
    return kind === "car"
      ? `<button type="button" class="ccHeroEmptyV83" data-cc-act="photos"><span class="ccHeroEmptyIcoV83">${CC_ICON_V83.camera}</span><span><strong>Pridėti nuotraukų</strong><small>Pirmoji nuotrauka taps viršeliu</small></span></button>`
      : "";
  return `<div class="ccHeroV83" data-cc-hero-kind="${kind}"><div class="ccHeroTrackV83">${photos
    .map(
      (_, i) =>
        `<button type="button" class="ccHeroSlideV83" data-cc-photo="${i}" aria-label="Nuotrauka ${i + 1} iš ${photos.length}"><img alt="" decoding="async"${i > 1 ? ' loading="lazy"' : ""}></button>`
    )
    .join(
      ""
    )}</div>${photos.length > 1 ? `<span class="ccHeroCountV83" aria-hidden="true">1/${photos.length}</span>` : ""}</div>`;
}
// „Duomenys“ – visada atidaryti, pačiame viršuje po nuotrauka
function ccStatTileV85(key, name, cls, value, sub) {
  return `<button type="button" class="ccStatV85 ${cls}" data-cc-edit="${key}" aria-label="${escapeHTML(name)}: ${escapeHTML(value)}${sub ? ", " + escapeHTML(sub) : ""}. Keisti"><small>${escapeHTML(name)}</small><b><i aria-hidden="true"></i>${escapeHTML(value)}</b>${sub ? `<em>${escapeHTML(sub)}</em>` : "<em>&nbsp;</em>"}</button>`;
}
function ccStatForV85(key, name, status, until) {
  const st = vehicleStatusState(status || "unknown", until || "");
  const value =
    { good: "Galioja", warn: "Baigiasi", bad: status === "invalid" ? "Negalioja" : "Pasibaigė" }[st.cls] ||
    "Nežinoma";
  const sub = until && status === "valid" ? "iki " + String(until).slice(0, 10) : "";
  return ccStatTileV85(key, name, st.cls, value, sub);
}
function ccDataHTMLV85(car) {
  const sdkLabel =
    !car.sdkStatus || car.sdkStatus === "unset"
      ? "Nepateikta"
      : SDK_STATES.find(x => x[0] === car.sdkStatus)?.[1] || "Nepateikta";
  const sdkTone =
    { sdkDone: "good", sdkLate: "bad", sdkPending: "warn", sdkUnset: "neutral" }[sdkClass(car.sdkStatus)] ||
    "neutral";
  const sdkOk = sdkTone === "good" || car.sdkStatus === "submitted";
  const stats =
    ccStatForV85("ta", "TA", car.taStatus, car.taUntil) +
    ccStatForV85("insurance", "Draudimas", car.insuranceStatus, car.insuranceUntil) +
    ccStatTileV85("sdk", "SDK", sdkOk ? "good" : sdkTone, sdkOk ? "Pateikta" : sdkLabel, car.sdk || "");
  const mileage = Number(car.mileage) > 0 ? `${Number(car.mileage).toLocaleString("lt-LT")} km` : "";
  const engine = [car.engineCc ? `${car.engineCc} cm³` : "", car.powerKw ? `${car.powerKw} kW` : ""]
    .filter(Boolean)
    .join(" · ");
  const specs = [
    [
      "firstRegistrationDate",
      "cal",
      "Pirmoji registracija",
      car.firstRegistrationDate || (car.year ? String(car.year) : "")
    ],
    ["mileage", "gauge", "Rida", mileage],
    ["engineCc", "engine", "Variklis", engine],
    ["fuelType", "fuel", "Kuras", car.fuelType || ""],
    ["registrationDoc", "card", "Liudijimas", car.registrationDoc || car.regDoc || ""]
  ];
  const tiles = specs
    .map(
      ([field, ico, label, value]) =>
        `<button type="button" class="ccSpecV85${value ? "" : " empty"}" data-cc-edit="${field}"><span class="ccSpecIcoV85">${CC_ICON_V83[ico]}</span><span class="ccSpecTxtV85"><small>${escapeHTML(label)}</small><b>${value ? escapeHTML(String(value)) : "Įrašyti"}</b></span></button>`
    )
    .join("");
  const vin = String(car.vin || "").trim();
  const vinRow = vin
    ? `<button type="button" class="ccVinV85" data-cc-copy="${escapeHTML(vin)}" aria-label="Kopijuoti VIN ${escapeHTML(vin)}"><span><small>VIN</small><b>${escapeHTML(vin)}</b></span><span class="ccCopyIcoV85">${CC_ICON_V83.copy}${CC_ICON_V83.check}</span></button>`
    : `<button type="button" class="ccVinV85 empty" data-cc-edit="vin"><span><small>VIN</small><b>Įrašyti</b></span><span class="ccCopyIcoV85">${CC_ICON_V83.pen}</span></button>`;
  const notes = String(car.notes || "").trim();
  return `<section class="ccCardV83 ccDataV85" data-cc-data>
    <div class="ccCardHeadV85"><h4>Duomenys</h4><button type="button" class="ccEditLinkV85" data-cc-edit="all">${CC_ICON_V83.pen}Redaguoti</button></div>
    <div class="ccStatsV85">${stats}</div>
    <div class="ccSpecsV85">${tiles}</div>
    ${vinRow}
    ${notes ? `<p class="ccNotesV85"><small>Pastabos</small>${escapeHTML(notes)}</p>` : ""}
  </section>`;
}

// ---------- Kortelės sudėliojimas ----------
function ccSectionsStateV83() {
  state.ui = state.ui || {};
  if (!state.ui.carSections || typeof state.ui.carSections !== "object") state.ui.carSections = {};
  return state.ui.carSections;
}
function ccBuildV83(sheet, car) {
  const body = sheet.querySelector(".premiumDetailBody");
  const detail = sheet.querySelector(".premiumDetail");
  if (!body || !detail) return;
  sheet.classList.add("ccV83", "ccInstantV83");
  sheet.classList.toggle("ccSoldV83", ccSoldV83(car));
  const sold = ccSoldV83(car);
  // Antraštė: valst. nr. ir dienos
  const title = sheet.querySelector(".premiumSheetTitle");
  if (title && !title.querySelector(".ccSubV83")) {
    const d = ccDaysV83(car);
    const tone = !d ? "" : d.sold ? "sold" : d.days >= 90 ? "red" : d.days >= 45 ? "amber" : "";
    const chip = d
      ? `<span class="ccDaysV83 ${tone}">${CC_ICON_V83.clock}${d.sold ? `Parduota per ${ccDaysWordV83(d.days)}` : `Garaže ${ccDaysWordV83(d.days)}`}</span>`
      : "";
    const plate = car.plate ? lcPlateHTMLV61(car.plate) : "";
    if (plate || chip) title.insertAdjacentHTML("beforeend", `<div class="ccSubV83">${plate}${chip}</div>`);
  }
  // Nuotraukos
  sheet.querySelector(".premiumHero")?.classList.add("ccHiddenV83");
  detail.querySelector(".ccHeroV83, .ccHeroEmptyV83")?.remove();
  body.insertAdjacentHTML("beforebegin", ccHeroHTMLV83(car));
  ccFillHeroV83(sheet, car);
  // Seni blokai, kuriuos pakeičia nauji
  sheet.querySelector("#cdInfoV51")?.classList.add("ccHiddenV83");
  sheet
    .querySelectorAll(".carBottomCostGrid, .premiumResult, .premiumResultGrid, .carAfterTasks")
    .forEach(n => n.classList.add("ccHiddenV83"));
  body.querySelectorAll(":scope > .ccCardV83").forEach(n => n.remove());
  // Duomenys, skaičiai ir pasirengimas
  body.insertAdjacentHTML("afterbegin", ccDataHTMLV85(car) + ccNumsHTMLV83(car) + ccReadyHTMLV83(car));
  // Skiltys
  const st = ccSectionsStateV83();
  const tasks = ccTaskStatsV83(car);
  const photos = ccPhotosV83(car).length;
  const docs = (car.documents || []).length;
  const taskSum = tasks.total
    ? `${tasks.done}/${tasks.total}${tasks.late ? ` · <em>${tasks.late} vėluoja</em>` : ""}`
    : "Nėra";
  const html =
    ccSecHTMLV83(
      "tasks",
      "Užduotys",
      taskSum,
      tasks.late > 0 || !!st.tasks,
      '<span class="ccHelpSlotV83" data-help-slot="uzduotys"></span>'
    ) +
    ccSecHTMLV83("photos", "Nuotraukos", photos ? String(photos) : "Nėra", !!st.photos) +
    ccSecHTMLV83("docs", "Dokumentai", docs ? String(docs) : "Nėra", !!st.docs);
  body.querySelector(":scope > [data-cc-ready]").insertAdjacentHTML("afterend", html);
  const slot = key => body.querySelector(`[data-cc-sec-body="${key}"]`);
  const tasksBlock = sheet.querySelector(".carTasksBlock");
  if (tasksBlock) slot("tasks").appendChild(tasksBlock);
  const photosBlock = sheet.querySelector("#carDetailPhotos");
  if (photosBlock) slot("photos").appendChild(photosBlock);
  const docsBlock = sheet.querySelector("#carDetailDocuments");
  if (docsBlock) {
    docsBlock.open = true;
    slot("docs").appendChild(docsBlock);
  }
  // Parduoto automobilio buhalterijos veiksmai – „Dokumentai buhalterei“ bloke
  const acc = sheet.querySelector(".accountingCarBox");
  const sendSlot = body.querySelector("[data-cc-send-slot]");
  if (acc) {
    acc.classList.add("ccHiddenV83");
    const actions = acc.querySelector(".accountingCarActions");
    if (actions && sendSlot) sendSlot.appendChild(actions);
  }
  // Veiksmų juosta
  ccBuildBarV83(sheet, car, sold);
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.remove("ccInstantV83")));
}
function ccBuildBarV83(sheet, car, sold) {
  const bar = sheet.querySelector(".carBottomActions");
  if (!bar) return;
  bar.classList.add("ccBarV83");
  bar.querySelectorAll(".ccBarBtnV83, .ccMenuV83").forEach(n => n.remove());
  const pp = bar.querySelector(".carPpBottomBtn");
  const inv = bar.querySelector(".carInvBottomBtn");
  const edit = bar.querySelector("#editCarInfoBtn");
  const del = bar.querySelector("#deleteCarBtn");
  bar.insertAdjacentHTML(
    "beforeend",
    `<button type="button" class="ccBarBtnV83 ccDocsBtnV83${sold ? " wide" : ""}" data-cc-menu="docs" aria-haspopup="true" aria-expanded="false">${CC_ICON_V83.doc}<span>Dokumentai</span></button><button type="button" class="ccBarBtnV83 ccMoreBtnV83" data-cc-menu="more" aria-haspopup="true" aria-expanded="false" aria-label="Daugiau veiksmų">${CC_ICON_V83.more}</button><div class="ccMenuV83" data-cc-menu-panel="docs" role="menu" hidden></div><div class="ccMenuV83" data-cc-menu-panel="more" role="menu" hidden></div>`
  );
  const docsMenu = bar.querySelector('[data-cc-menu-panel="docs"]');
  const moreMenu = bar.querySelector('[data-cc-menu-panel="more"]');
  [pp, inv].forEach(b => b && docsMenu.appendChild(b));
  [edit, del].forEach(b => b && moreMenu.appendChild(b));
  if (pp) pp.textContent = "PP sutartis";
  if (inv) inv.textContent = "Sąskaita faktūra";
  if (edit) edit.textContent = "Redaguoti";
  if (del) del.textContent = "Ištrinti";
  // Juosta – paskutinis lango elementas, kad prilimptų apačioje; per visą lango plotį (be šoninių paraščių)
  if (bar.parentElement !== sheet) sheet.appendChild(bar);
  sheet.style.setProperty("--ccPadV83", getComputedStyle(sheet).paddingLeft || "10px");
}
async function ccFillHeroV83(sheet, entity, kind = "car") {
  const hero = sheet.querySelector(".ccHeroV83");
  if (!hero) return;
  const photos = ccPhotosV83(entity);
  const slides = [...hero.querySelectorAll("[data-cc-photo]")];
  slides.forEach((btn, i) => {
    phUrlV67(photos[i]).then(url => {
      const img = btn.querySelector("img");
      if (url && img && img.isConnected && !img.getAttribute("src")) img.src = url;
    });
  });
  const track = hero.querySelector(".ccHeroTrackV83");
  const count = hero.querySelector(".ccHeroCountV83");
  if (!track || !count) return;
  let raf = 0;
  track.addEventListener(
    "scroll",
    () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        count.textContent = `${Math.min(photos.length, i + 1)}/${photos.length}`;
      });
    },
    { passive: true }
  );
}

// ---------- Atnaujinimas be visos kortelės perpiešimo ----------
function ccRefreshTopV83(car, { flash = "" } = {}) {
  const sheet = document.getElementById("sheet");
  const body = sheet?.querySelector(".premiumDetailBody");
  if (!body || sheet.dataset.carV63 !== car.id) return;
  sheet.classList.add("ccInstantV83");
  const nums = body.querySelector("[data-cc-nums]");
  const ready = body.querySelector("[data-cc-ready]");
  const sendActions = ready?.querySelector(".accountingCarActions");
  const prevPct = ready?.querySelector(".ccProgV85 i")?.style.getPropertyValue("--p");
  if (nums)
    ccMorphV85(nums, () => {
      const html = ccNumsHTMLV83(car);
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const fresh = tmp.firstElementChild;
      if (flash) {
        const b = fresh.querySelector("[data-cc-cost-body]");
        if (b) b.innerHTML = ccCostRowsHTMLV83(car, flash);
      }
      nums.replaceWith(fresh);
      return fresh;
    });
  if (ready) {
    const tmp = document.createElement("div");
    tmp.innerHTML = ccReadyHTMLV83(car);
    const fresh = tmp.firstElementChild;
    const bar = fresh.querySelector(".ccProgV85 i");
    const next = bar?.style.getPropertyValue("--p");
    if (bar && prevPct && prevPct !== next) {
      // Juosta pasipildo nuo ankstesnės reikšmės
      bar.style.setProperty("--p", prevPct);
      requestAnimationFrame(() => requestAnimationFrame(() => bar.style.setProperty("--p", next)));
    }
    ready.replaceWith(fresh);
    const slot = body.querySelector("[data-cc-send-slot]");
    if (slot && sendActions) slot.appendChild(sendActions);
  }
  const data = body.querySelector("[data-cc-data]");
  if (data) data.outerHTML = ccDataHTMLV85(car);
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.remove("ccInstantV83")));
}
function ccEditPriceV83(car) {
  const sheet = document.getElementById("sheet");
  if (ccSoldV83(car)) return;
  const nums = sheet?.querySelector("[data-cc-nums]");
  if (!nums) return;
  if (!nums.classList.contains("is-open")) {
    ccToggleV83(nums, true);
    ccOpenV83.cost.add(car.id);
  }
  setTimeout(
    () => nums.scrollIntoView({ block: "nearest", behavior: ccReducedV85() ? "auto" : "smooth" }),
    60
  );
  const cell = nums.querySelector("[data-cc-price-cell]");
  if (!cell || cell.querySelector("input")) return;
  const price = ccPriceV83(car);
  cell.innerHTML = `<small>Kaina</small><label class="ccPriceEditV83"><input type="text" inputmode="numeric" autocomplete="off" aria-label="Kaina, €" value="${price || ""}" placeholder="0"><i>€</i></label>`;
  const input = cell.querySelector("input");
  const marginEl = nums.querySelector("[data-cc-margin]");
  const cost = carTotalCost(car);
  const parse = () => {
    const n = Number(String(input.value).replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const live = () => {
    const n = parse();
    const m = n ? n - cost : null;
    marginEl.className = m === null ? "none" : m >= 0 ? "pos" : "neg";
    marginEl.textContent = m === null ? "—" : ccSignedMoneyV83(m);
  };
  let done = false;
  const finish = save => {
    if (done) return;
    done = true;
    const fresh = ccCarV83(car.id) || car;
    if (save) {
      const n = parse();
      const before = ccPriceV83(fresh);
      if (n !== before) {
        fresh.askingPrice = n || null;
        saveState();
        vibrate(8);
        if (n) toast(`Kaina: ${moneyFmt(n)}`, "✓");
      }
    }
    ccRefreshTopV83(fresh);
  };
  input.addEventListener("input", live);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
  input.focus({ preventScroll: true });
  input.select();
}
function ccToggleV83(section, open) {
  const body = section.querySelector(":scope > .ccAccBodyV83");
  section.classList.toggle("is-open", open);
  section.querySelector(":scope [aria-expanded]")?.setAttribute("aria-expanded", String(open));
  ccAnimBodyV85(body, open);
}
function ccOpenSectionV83(key, scroll = true) {
  const sec = document.querySelector(`#sheet [data-cc-sec="${key}"]`);
  if (!sec) return;
  if (!sec.classList.contains("is-open")) ccToggleV83(sec, true);
  ccSectionsStateV83()[key] = true;
  saveState();
  if (scroll) setTimeout(() => sec.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
}
function ccCloseMenusV83(except = "") {
  document.querySelectorAll("#sheet [data-cc-menu-panel]").forEach(p => {
    if (p.dataset.ccMenuPanel === except) return;
    p.hidden = true;
    p.classList.remove("show");
  });
  document.querySelectorAll("#sheet [data-cc-menu]").forEach(b => {
    if (b.dataset.ccMenu !== except) b.setAttribute("aria-expanded", "false");
  });
}
// Redagavimas: atidaroma esama forma, jos laukas paryškinamas; uždarius ar išsaugojus grįžtama į kortelę
// (35-car-ui-v51.js: „Uždaryti“ → renderCarSheet, „Išsaugoti“ → openCar)
const CC_EDIT_FIELD_V85 = {
  ta: "taStatus",
  insurance: "insuranceStatus",
  sdk: "sdkStatus",
  firstRegistrationDate: "firstRegistrationDate",
  mileage: "mileage",
  engineCc: "engineCc",
  fuelType: "fuelType",
  registrationDoc: "registrationDoc",
  vin: "vin"
};
function ccEditFieldV85(car, key) {
  openCarEditSheet(car.id);
  const field = CC_EDIT_FIELD_V85[key];
  if (!field) return;
  setTimeout(() => {
    const el = document.getElementById("editVehicle" + field);
    if (!el) return;
    const wrap = el.closest(".field, .cfStatusV51, label") || el;
    wrap.scrollIntoView({ block: "center", behavior: ccReducedV85() ? "auto" : "smooth" });
    wrap.classList.add("ccFieldFlashV85");
    setTimeout(() => wrap.classList.remove("ccFieldFlashV85"), 1600);
    setTimeout(() => el.focus({ preventScroll: true }), 350);
  }, 80);
}
function ccCopyV85(btn) {
  const text = btn.dataset.ccCopy;
  const done = () => {
    btn.classList.add("is-copied");
    clearTimeout(btn._ccT);
    btn._ccT = setTimeout(() => btn.classList.remove("is-copied"), 1600);
    vibrate(8);
    toast("VIN nukopijuotas", "✓");
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, done);
  else done();
}
// ---------- Išlaida vietoje ----------
function ccExpOpenV85(car) {
  const nums = document.querySelector("#sheet [data-cc-nums]");
  const slot = nums?.querySelector("[data-cc-exp-slot]");
  if (!slot || slot.querySelector("form")) return;
  const body = nums.querySelector(":scope > .ccAccBodyV83");
  ccMorphV85(body, () => {
    slot.innerHTML = ccExpFormHTMLV85(car);
  });
  const amt = slot.querySelector("[data-cc-exp-amount]");
  setTimeout(() => {
    slot.scrollIntoView({ block: "nearest", behavior: ccReducedV85() ? "auto" : "smooth" });
    amt?.focus({ preventScroll: true });
  }, 60);
}
function ccExpCloseV85() {
  const nums = document.querySelector("#sheet [data-cc-nums]");
  const slot = nums?.querySelector("[data-cc-exp-slot]");
  if (!slot) return;
  ccMorphV85(nums.querySelector(":scope > .ccAccBodyV83"), () => {
    slot.innerHTML = `<button type="button" class="ccAddExpV85" data-cc-exp-open>${CC_ICON_V83.plus}Pridėti išlaidą</button>`;
  });
}
async function ccExpSaveV85(car, form) {
  const amount = Number(
    String(form.querySelector("[data-cc-exp-amount]")?.value || "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "")
  );
  if (!Number.isFinite(amount) || amount <= 0) {
    form.querySelector(".ccExpAmtV85")?.classList.add("bad");
    form.querySelector("[data-cc-exp-amount]")?.focus();
    toast("Įrašykite sumą", "!");
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  const category = form.querySelector("[data-cc-exp-cat].on")?.dataset.ccExpCat || "Kita";
  const date = form.querySelector("[data-cc-exp-date]")?.value || todayISO();
  const note = form.querySelector("[data-cc-exp-note]")?.value.trim() || "";
  const input = form.querySelector("[data-cc-exp-file]");
  let attachments = [];
  try {
    if (typeof ensureAccountingTransactionsV8 === "function") ensureAccountingTransactionsV8();
    ensureFinanceCollections();
    if (input?.files?.length && typeof accountingReadAttachmentsV8 === "function")
      attachments = await accountingReadAttachmentsV8(input, "receipt");
    const entry = {
      id: uid(),
      type: "expense",
      amount: Math.round(Math.abs(amount) * 100) / 100,
      title: category,
      category,
      note,
      date,
      carId: car.id,
      attachments,
      source: "accounting",
      createdAt: nowLabel()
    };
    state.finances.transactions.unshift(entry);
    state.finances.budgetBalance = Number(state.finances.budgetBalance || 0) + financeSignedAmount(entry);
    if (!saveState()) throw Error("Nepavyko išsaugoti išlaidos.");
    addHistory("Išlaida", `${entry.title} · ${car.name} · -${moneyFmt(entry.amount)}`, "💸");
    saveState();
    vibrate(10);
    // Fone atnaujinami kiti ekranai; kortelė lieka atidaryta ir atsinaujina vietoje
    const sheetEl = document.getElementById("sheet");
    const keep = sheetEl?.scrollTop || 0;
    try {
      render();
    } catch (e) {}
    const fresh = ccCarV83(car.id) || car;
    const sheet = document.getElementById("sheet");
    if (sheet?.dataset.carV63 === car.id && sheet.querySelector("[data-cc-nums]")) {
      ccOpenV83.cost.add(car.id);
      ccRefreshTopV83(fresh, { flash: entry.id });
    } else {
      ccOpenV83.cost.add(car.id);
      openCar(car.id);
      requestAnimationFrame(() => {
        const s = document.getElementById("sheet");
        if (s) s.scrollTop = keep;
      });
    }
    toast(`Išlaida pridėta: ${moneyFmt(entry.amount)}`, "✓");
  } catch (e) {
    await Promise.all(attachments.map(a => photoDelete(a.key).catch(() => {})));
    submit.disabled = false;
    toast(e.message || "Nepavyko išsaugoti", "!");
  }
}
function ccRunActionV83(act, car, btn) {
  vibrate(8);
  if (act === "photos") return document.getElementById("carAddPhotos")?.click();
  if (act === "tasks") return ccOpenSectionV83("tasks");
  if (act === "ta" || act === "insurance" || act === "sdk") return ccEditFieldV85(car, act);
  if (act === "price") return ccEditPriceV83(car);
  if (act === "purchase-create" || act === "sale-create") return openContractSheetV52({ carId: car.id });
  if (act === "purchase-upload") return document.getElementById("viewVehicledoc_purchase")?.click();
  if (act.startsWith("upload:")) return document.getElementById("viewVehicledoc_" + act.slice(7))?.click();
  if (act.startsWith("req:")) {
    if (!window.__aeRequiredDocsV83?.open) return;
    ccReturnCarV83 = car.id;
    return window.__aeRequiredDocsV83.open(act.slice(4));
  }
  if (act === "add-expense") {
    const nums = document.querySelector("#sheet [data-cc-nums]");
    if (nums && !nums.classList.contains("is-open")) {
      ccToggleV83(nums, true);
      ccOpenV83.cost.add(car.id);
    }
    return ccExpOpenV85(car);
  }
}

// ---------- Įvykiai ----------
document.addEventListener("click", e => {
  const sheet = document.getElementById("sheet");
  if (!sheet?.classList.contains("ccV83")) return;
  const t = e.target;
  if (!(t instanceof Element)) return;
  // Meniu uždaromi paspaudus kitur
  if (!t.closest(".ccBarV83")) ccCloseMenusV83();
  if (!sheet.contains(t)) return;
  const car = ccCarV83(sheet.dataset.carV63 || "");
  if (!car) return;
  const menuBtn = t.closest("[data-cc-menu]");
  if (menuBtn) {
    const key = menuBtn.dataset.ccMenu;
    const panel = sheet.querySelector(`[data-cc-menu-panel="${key}"]`);
    const open = panel.hidden;
    ccCloseMenusV83(key);
    panel.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) requestAnimationFrame(() => panel.classList.add("show"));
    vibrate(6);
    return;
  }
  if (t.closest(".ccMenuV83 button")) {
    // Pats mygtukas (PP sutartis, Sąskaita faktūra, Redaguoti, Ištrinti) veikia per esamus modulius
    setTimeout(() => ccCloseMenusV83(), 0);
    return;
  }
  const secToggle = t.closest("[data-cc-sec-toggle]");
  if (secToggle) {
    const key = secToggle.dataset.ccSecToggle;
    const sec = secToggle.closest("[data-cc-sec]");
    const open = !sec.classList.contains("is-open");
    ccToggleV83(sec, open);
    ccSectionsStateV83()[key] = open;
    saveState();
    return;
  }
  if (t.closest("[data-cc-ready-toggle]")) {
    const sec = t.closest("[data-cc-ready]");
    const open = !sec.classList.contains("is-open");
    ccToggleV83(sec, open);
    if (open) ccOpenV83.ready.add(car.id);
    else ccOpenV83.ready.delete(car.id);
    return;
  }
  const cost = t.closest("[data-cc-cost]");
  if (cost) {
    const sec = cost.closest("[data-cc-nums]");
    const open = !sec.classList.contains("is-open");
    ccToggleV83(sec, open);
    if (open) ccOpenV83.cost.add(car.id);
    else ccOpenV83.cost.delete(car.id);
    return;
  }
  if (t.closest("[data-cc-exp-open]")) return ccExpOpenV85(car);
  if (t.closest("[data-cc-exp-cancel]")) return ccExpCloseV85();
  const cat = t.closest("[data-cc-exp-cat]");
  if (cat) {
    cat.parentElement.querySelectorAll("[data-cc-exp-cat]").forEach(b => {
      b.classList.toggle("on", b === cat);
      b.setAttribute("aria-checked", String(b === cat));
    });
    vibrate(5);
    return;
  }
  const copy = t.closest("[data-cc-copy]");
  if (copy) return ccCopyV85(copy);
  const edit = t.closest("[data-cc-edit]");
  if (edit) {
    vibrate(6);
    return ccEditFieldV85(car, edit.dataset.ccEdit);
  }
  if (t.closest("[data-cc-price]")) return ccEditPriceV83(car);
  const photo = t.closest("[data-cc-photo]");
  if (photo) return openManagedPhotoGallery("car", car.id, Number(photo.dataset.ccPhoto) || 0);
  const choiceBtn = t.closest("[data-cc-choice]");
  if (choiceBtn && !choiceBtn.hasAttribute("data-cc-next")) {
    const box = sheet.querySelector(`[data-cc-choice-for="${CSS.escape(choiceBtn.dataset.ccChoice)}"]`);
    if (box) {
      const body = choiceBtn.closest(".ccAccBodyV83");
      ccMorphV85(body, () => {
        box.hidden = !box.hidden;
      });
      choiceBtn.setAttribute("aria-expanded", String(!box.hidden));
    }
    return;
  }
  const act = t.closest("[data-cc-act]");
  if (act) {
    let a = act.dataset.ccAct;
    // „Kitas žingsnis“ su pasirinkimu – atveria sąrašą ir pasirinkimą
    if (act.hasAttribute("data-cc-next") && (a === "purchase" || a === "")) {
      const sec = act.closest("[data-cc-ready]");
      const key = a === "purchase" ? "purchase" : `car:${car.id}:sale`;
      const box = sec.querySelector(`[data-cc-choice-for="${CSS.escape(key)}"]`);
      if (box) box.hidden = false;
      if (!sec.classList.contains("is-open")) ccToggleV83(sec, true);
      ccOpenV83.ready.add(car.id);
      return;
    }
    if (a) ccRunActionV83(a, car, act);
  }
});
document.addEventListener("submit", e => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement) || !form.matches("#sheet.ccV83 [data-cc-exp-form]")) return;
  e.preventDefault();
  const car = ccCarV83(document.getElementById("sheet").dataset.carV63 || "");
  if (car) ccExpSaveV85(car, form);
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el instanceof Element && el.matches("#sheet [data-cc-exp-amount]"))
    el.closest(".ccExpAmtV85")?.classList.remove("bad");
});
document.addEventListener(
  "keydown",
  e => {
    if (e.key !== "Escape") return;
    const form = document.querySelector("#sheet.ccV83 [data-cc-exp-form]");
    if (form && form.contains(document.activeElement)) {
      e.preventDefault();
      e.stopPropagation();
      return ccExpCloseV85();
    }
    const open = document.querySelector("#sheet.ccV83 [data-cc-menu-panel]:not([hidden])");
    if (!open) return;
    e.preventDefault();
    e.stopPropagation();
    ccCloseMenusV83();
  },
  true
);
// Pridėjus dokumentą / čekį – po perpiešimo atidaroma atitinkama skiltis, failo vardas – formoje
document.addEventListener(
  "change",
  e => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (el.closest("#sheet.ccV83 .vehicleDocInputs input")) ccSectionsStateV83().docs = true;
    if (el.matches("#sheet [data-cc-exp-file]")) {
      const n = el.files?.length || 0;
      const label = el.closest(".ccExpFileV85");
      label?.classList.toggle("on", n > 0);
      const span = label?.querySelector("[data-cc-exp-file-label]");
      if (span) span.textContent = n ? (n === 1 ? el.files[0].name.slice(0, 18) : `${n} failai`) : "Čekis";
    }
  },
  true
);
// Iš kortelės atidarytas „Pridėti dokumentą“ (Buhalterijos forma) – uždarius grįžtama į kortelę
const __closeSheetV83 = closeSheet;
closeSheet = function () {
  const back = ccReturnCarV83;
  ccReturnCarV83 = "";
  const r = __closeSheetV83.apply(this, arguments);
  if (back && ccCarV83(back)) setTimeout(() => openCar(back), 260);
  return r;
};
const __renderCarSheetV83 = renderCarSheet;
renderCarSheet = function (car) {
  const prev = document.getElementById("sheet");
  const same = prev?.classList.contains("ccV83") && car && prev.dataset.carV63 === car.id;
  const keep = same ? prev.scrollTop : 0;
  const r = __renderCarSheetV83.apply(this, arguments);
  const sheet = document.getElementById("sheet");
  if (sheet && car && sheet.querySelector(".premiumDetailBody")) {
    try {
      ccBuildV83(sheet, car);
      // Perpiešus tą pačią kortelę (pažymėta užduotis, įkeltas dokumentas) – slinkties vieta išlieka
      if (same && keep) sheet.scrollTop = keep;
    } catch (err) {
      console.warn("Kortelė v83", err);
    }
  }
  return r;
};

// ---------- Varianto kortelė – tas pats stilius ----------
const __openGarageLeadSheetV85 = openGarageLeadSheet;
openGarageLeadSheet = function (leadId) {
  const r = __openGarageLeadSheetV85.apply(this, arguments);
  const lead = (state.leadVariants || []).find(v => v.id === leadId);
  const sheet = document.getElementById("sheet");
  const body = sheet?.querySelector(".premiumDetailBody");
  if (!lead || !body || !sheet.classList.contains("leadSheetV62")) return r;
  try {
    sheet.classList.add("ccLeadV85");
    sheet.dataset.leadV85 = lead.id;
    const title = sheet.querySelector(".premiumSheetTitle");
    if (title && !title.querySelector(".ccSubV83")) {
      const bits = [lead.year, lead.fuel, lead.city].filter(Boolean).map(x => escapeHTML(String(x)));
      if (bits.length)
        title.insertAdjacentHTML(
          "beforeend",
          `<div class="ccSubV83"><span class="ccMetaV85">${bits.join(" · ")}</span></div>`
        );
    }
    // Nuotraukų juosta (kaip automobilio)
    const hero = sheet.querySelector(".premiumHero");
    if (ccPhotosV83(lead).length) {
      hero?.classList.add("ccHiddenV83");
      sheet.querySelector(".ccHeroV83")?.remove();
      body.insertAdjacentHTML("beforebegin", ccHeroHTMLV83(lead, "lead"));
      ccFillHeroV83(sheet, lead, "lead");
    }
  } catch (err) {
    console.warn("Varianto kortelė v85", err);
  }
  return r;
};
document.addEventListener("click", e => {
  const photo = e.target instanceof Element ? e.target.closest("#sheet.ccLeadV85 [data-cc-photo]") : null;
  if (!photo) return;
  const id = document.getElementById("sheet")?.dataset.leadV85;
  if (id) openManagedPhotoGallery("lead", id, Number(photo.dataset.ccPhoto) || 0);
});
window.AutoEasierCarCard = { ready: ccReadyItemsV83, accountant: ccAccountantItemsV83, days: ccDaysV83 };
