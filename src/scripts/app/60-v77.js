// v77: sklandus apatinių langų atsidarymas (įvažiavimas iš apačios, fonas patamsėja palaipsniui).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).
//
// Uždarymas lieka momentinis: closeSheet() iš karto išvalo langą, nes daug kodo iškart po jo tikrina
// „#sheet …“ turinį arba atidaro kitą langą. Animuojamas tik atidarymas – logika nesikeičia.
function reducedMotionV77() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) {
    return false;
  }
}
const __openSheetV77 = openSheet;
openSheet = function () {
  const back = document.getElementById("modalBackdrop");
  const wasOpen = !!back?.classList.contains("show");
  const result = __openSheetV77.apply(this, arguments);
  const sheet = document.getElementById("sheet");
  // Įvažiuoja tik naujai atidarytas langas; perpiešiant tą patį (pvz. pažymėjus užduotį) – be animacijos
  if (sheet && back && !wasOpen && !reducedMotionV77()) {
    // Langas ką tik tapo matomas (display: none → flex), todėl animacija prasideda iš naujo savaime
    sheet.classList.add("aeSheetInV77");
    back.classList.add("aeBackInV77");
  }
  return result;
};
const __closeSheetV77 = closeSheet;
closeSheet = function () {
  const result = __closeSheetV77.apply(this, arguments);
  const back = document.getElementById("modalBackdrop");
  if (back && !back.classList.contains("show")) {
    back.classList.remove("aeBackInV77");
    document.getElementById("sheet")?.classList.remove("aeSheetInV77");
  }
  return result;
};

// ---------- Automobilio kortelė: būsena per pusę sekundės ----------
// Aktyvus automobilis: SDK / TA / draudimo taškai (žalia – tvarkoje, geltona – reikia dėmesio,
// raudona – problema, pilka – nežinoma), trūkstamų dokumentų skaičius ir kiek dienų stovi.
// Parduotas: pardavimo data ir per kiek dienų parduotas.
// Pastaba: render() kviečiamas dar prieš šio failo vykdymą, todėl ribos – funkcijos viduje (ne const viršuje).
function carStockDaysV77(car) {
  const from = car?.createdDateISO || String(car?.createdAt || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return null;
  const to =
    car?.status === "parduotas" ? car.soldDateISO || String(car.soldAt || "").slice(0, 10) : todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const a = parseISODateLocal(from),
    b = parseISODateLocal(to);
  if (!a || !b) return null;
  return Math.max(0, Math.round((b - a) / 864e5));
}
function carStatusDotsV77(car) {
  const sdkTone = { sdkDone: "good", sdkLate: "bad", sdkPending: "warn", sdkUnset: "neutral" }[
    sdkClass(car.sdkStatus)
  ];
  const sdkLabel =
    !car.sdkStatus || car.sdkStatus === "unset"
      ? "Nepateikta"
      : SDK_STATES.find(x => x[0] === car.sdkStatus)?.[1] || "Nepateikta";
  const ta = vehicleStatusState(car.taStatus || "unknown", car.taUntil || "");
  const ins = vehicleStatusState(car.insuranceStatus || "unknown", car.insuranceUntil || "");
  return [
    ["SDK", sdkTone || "neutral", sdkLabel],
    ["TA", ta.cls, ta.label],
    ["Draudimas", ins.cls, ins.label]
  ];
}
function carCardFooterHTMLV77(car) {
  if (!car) return "";
  const days = carStockDaysV77(car);
  if (car.status === "parduotas") {
    const sold = car.soldDateISO || String(car.soldAt || "").slice(0, 10);
    return `<div class="lcFootV77 sold"><span class="lcSoldV77">${sold ? `Parduota ${escapeHTML(sold)}` : "Parduota"}</span>${
      days != null ? `<span class="lcAgeV77">per ${days} d.</span>` : ""
    }</div>`;
  }
  const dots = carStatusDotsV77(car)
    .map(
      ([name, tone, label]) =>
        `<span class="lcDotV77 ${escapeHTML(tone)}" title="${escapeHTML(`${name}: ${label}`)}"><i aria-hidden="true"></i>${escapeHTML(name)}<span class="lcSrV77">: ${escapeHTML(label)}</span></span>`
    )
    .join("");
  const missing = (workCenterMissingDocsV30(car) || []).length;
  const STOCK_WARN_DAYS = 45,
    STOCK_BAD_DAYS = 90;
  const ageTone = days == null ? "" : days >= STOCK_BAD_DAYS ? "bad" : days >= STOCK_WARN_DAYS ? "warn" : "";
  return `<div class="lcFootV77"><span class="lcDotsV77">${dots}</span><span class="lcRightV77">${
    missing ? `<span class="lcDocsV77">Trūksta ${missing} dok.</span>` : ""
  }${
    days != null
      ? `<span class="lcAgeV77 ${ageTone}" title="Garaže ${days} d."><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>${days} d.<span class="lcSrV77"> garaže</span></span>`
      : ""
  }</span></div>`;
}
