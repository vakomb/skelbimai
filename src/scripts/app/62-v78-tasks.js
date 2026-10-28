// v78: Užduočių skydelis – užduotys sugrupuotos pagal automobilį visuose skirtukuose.
// Grupės viršuje: automobilis (pavadinimas, valst. nr., užduočių skaičius, kiek vėluoja) ir maža nuotrauka
// dešinėje; po juo – to automobilio užduotys. Kitos (ne automobilio) užduotys – atskira grupė „Kitos užduotys“.
// Eilutės ir veiksmai (pažymėti atlikta, išlaidos, atidaryti automobilį, ištrinti) – tie patys (43-tasks-hub-v62.js).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).
const TK_GROUP_ICON_V78 = {
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 16.5V13l1.7-4.6A2 2 0 0 1 8.6 7h6.8a2 2 0 0 1 1.9 1.4L19 13v3.5"/><path d="M4 13h16v3.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V16h-9v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',
  other:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6.8 1.7 1.7L9 5.2"/><path d="M12.5 7h7.5"/><path d="m4 12.8 1.7 1.7L9 11.2"/><path d="M12.5 13h7.5"/><path d="M5 18.5h3.5M12.5 18.5h7.5"/></svg>'
};
function tkCountTextV78(n) {
  const last = n % 10,
    lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return `${n} užduotis`;
  if (last >= 2 && last <= 9 && (lastTwo < 10 || lastTwo >= 20)) return `${n} užduotys`;
  return `${n} užduočių`;
}
function tkCarPhotoRefV78(car) {
  return car?.imageSrc || (Array.isArray(car?.photos) ? car.photos.find(Boolean) : "") || "";
}
function tkCarThumbHTMLV78(car) {
  const ref = tkCarPhotoRefV78(car);
  const ready = ref ? photoUrlCache[ref] || (/^(data:image\/|blob:|https:)/.test(ref) ? ref : "") : "";
  const img = ref
    ? `<img alt="" loading="lazy" decoding="async" data-tk-photo="${escapeHTML(ref)}"${ready ? ` src="${escapeHTML(ready)}"` : ""}>`
    : "";
  return `<span class="tkThumbV78${ref ? " hasPhoto" : ""}">${TK_GROUP_ICON_V78.car}${img}</span>`;
}
function tkCarGroupHTMLV78(car, rows) {
  const today = todayISO();
  const late = rows.filter(i => i.due && i.due < today).length;
  const name = tkCarNameV63(car);
  return `<section class="tkGroupV62 tkGroupV78">
    <button type="button" class="tkGroupHeadV62 tkHeadV78" data-tk-car-open="${escapeHTML(car.id)}" aria-label="Atidaryti ${escapeHTML(name)}">
      <span class="tkHeadTextV78">
        <strong>${escapeHTML(name)}</strong>
        <span class="tkHeadMetaV78">${lcPlateHTMLV61(car.plate)}<em>${escapeHTML(tkCountTextV78(rows.length))}</em>${late ? `<em class="late">${late} vėluoja</em>` : ""}</span>
      </span>
      ${tkCarThumbHTMLV78(car)}
    </button>
    <div class="tkRowsV78">${rows.map(i => tkRowV62(i, { showCar: false })).join("")}</div>
  </section>`;
}
function tkOtherGroupHTMLV78(rows) {
  const today = todayISO();
  const late = rows.filter(i => i.due && i.due < today).length;
  return `<section class="tkGroupV62 tkGroupV78 tkOtherV78">
    <div class="tkGroupHeadV62 tkHeadV78">
      <span class="tkHeadTextV78">
        <strong>Kitos užduotys</strong>
        <span class="tkHeadMetaV78"><em>${escapeHTML(tkCountTextV78(rows.length))}</em>${late ? `<em class="late">${late} vėluoja</em>` : ""}</span>
      </span>
      <span class="tkThumbV78 tkIconOnlyV78">${TK_GROUP_ICON_V78.other}</span>
    </div>
    <div class="tkRowsV78">${rows.map(i => tkRowV62(i)).join("")}</div>
  </section>`;
}
// Automobilių grupės – ta tvarka, kuria pasirodo skubiausia jų užduotis
function tkGroupedHTMLV78(list) {
  const order = [];
  const byCar = new Map();
  const other = [];
  list.forEach(item => {
    if (item.kind === "car" && item.car) {
      if (!byCar.has(item.carId)) {
        byCar.set(item.carId, []);
        order.push({ type: "car", id: item.carId });
      }
      byCar.get(item.carId).push(item);
    } else {
      if (!other.length) order.push({ type: "other" });
      other.push(item);
    }
  });
  return order
    .map(g =>
      g.type === "car"
        ? tkCarGroupHTMLV78(byCar.get(g.id)[0].car, byCar.get(g.id))
        : tkOtherGroupHTMLV78(other)
    )
    .join("");
}
tkListHTMLV62 = function (tab, items) {
  if (tab === "today")
    return items.today.length ? tkGroupedHTMLV78(items.today) : tkEmptyV62("Šiandien viskas atlikta");
  if (tab === "custom")
    return items.custom.length ? tkOtherGroupHTMLV78(items.custom) : tkEmptyV62("Kitų užduočių nėra");
  return items.auto.length ? tkGroupedHTMLV78(items.auto) : tkEmptyV62("Automobilių užduočių nėra");
};
// Nuotraukos, kurių dar nėra atmintyje, įkeliamos po perpiešimo (be laukimo ir be tuščių vietų)
function tkFillThumbsV78() {
  document.querySelectorAll("#garageTasksSection img[data-tk-photo]:not([src])").forEach(img => {
    phUrlV67(img.dataset.tkPhoto).then(url => {
      if (url && img.isConnected && !img.getAttribute("src")) img.src = url;
    });
  });
}
const __tkRenderV78 = tkRenderV62;
tkRenderV62 = function () {
  const result = __tkRenderV78.apply(this, arguments);
  try {
    tkFillThumbsV78();
  } catch (err) {}
  return result;
};
