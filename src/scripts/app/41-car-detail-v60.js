// Automobilio kortelės viršus (v60, v61): trys būsenų plytelės (SDK, draudimas, TA) ir ramus duomenų sąrašas
// (pirmoji registracija, rida, variklis, kuras, liudijimas, VIN su kopijavimu). Numerio ženklas – antraštėje (42-…v61.js).
// Pakeičia cdInfoHTMLV51 išvaizdą; id „cdInfoV51“ paliktas, kad veiktų esama tvarka kortelėje. Stilius – 170-car-detail-v60.css.
const CD_ICONS_V60 = {
  copy: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"/></svg>'
};
function cdStatusTileV60(name, tone, value, sub = "") {
  return `<div class="cdStatV60 ${tone}"><span class="cdStatNameV60"><i aria-hidden="true"></i>${escapeHTML(name)}</span><b>${escapeHTML(value)}</b>${sub ? `<small>${escapeHTML(sub)}</small>` : ""}</div>`;
}
// Būsena: trumpa reikšmė („Galioja“, „Baigiasi“, „Pasibaigė“…) ir, jei žinoma, data po ja.
function cdStatusTileForV60(name, status, until) {
  const st = vehicleStatusState(status || "unknown", until || "");
  const value = { good: "Galioja", warn: "Baigiasi", neutral: "Nežinoma" }[st.cls] || st.label || "Nežinoma";
  const sub = status === "valid" && until ? "iki " + String(until).slice(0, 10) : "";
  return cdStatusTileV60(name, st.cls, value, sub);
}
cdInfoHTMLV51 = function (car) {
  const sdkLabel =
    !car.sdkStatus || car.sdkStatus === "unset"
      ? "Nepateikta"
      : SDK_STATES.find(x => x[0] === car.sdkStatus)?.[1] || "Nepateikta";
  const sdkTone =
    { sdkDone: "good", sdkLate: "bad", sdkPending: "warn", sdkUnset: "neutral" }[sdkClass(car.sdkStatus)] ||
    "neutral";
  const mileage =
    car.mileage != null && car.mileage !== "" && Number(car.mileage) > 0
      ? `${Number(car.mileage).toLocaleString("lt-LT")} km`
      : "";
  // Tvarka: SDK, Draudimas, TA
  const status = `<div class="cdStatusV60">${cdStatusTileV60("SDK", sdkTone, sdkLabel)}${cdStatusTileForV60(
    "Draudimas",
    car.insuranceStatus,
    car.insuranceUntil
  )}${cdStatusTileForV60("TA", car.taStatus, car.taUntil)}</div>`;
  const engine = [car.engineCc ? `${car.engineCc} cm³` : "", car.powerKw ? `${car.powerKw} kW` : ""]
    .filter(Boolean)
    .join(" · ");
  const rows = [
    ["Pirmoji registracija", car.firstRegistrationDate || (car.year ? String(car.year) : "")],
    ["Rida", mileage],
    ["Variklis", engine],
    ["Kuras", car.fuelType],
    ["Liudijimas", car.registrationDoc || car.regDoc]
  ].filter(([, v]) => v);
  const vin = String(car.vin || "").trim();
  const specs =
    rows.length || vin
      ? `<dl class="cdSpecsV60">${rows
          .map(([l, v]) => `<div><dt>${escapeHTML(l)}</dt><dd>${escapeHTML(String(v))}</dd></div>`)
          .join("")}${
          vin
            ? `<div class="cdVinV60"><dt>VIN</dt><dd><button type="button" data-cd-copy="${escapeHTML(vin)}" aria-label="Kopijuoti VIN"><span>${escapeHTML(vin)}</span>${CD_ICONS_V60.copy}</button></dd></div>`
            : ""
        }</dl>`
      : "";
  return `<section class="cdInfoV51 cdInfoV60" id="cdInfoV51">${status}${specs}</section>`;
};
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-cd-copy]");
  if (!btn) return;
  e.preventDefault();
  const text = btn.dataset.cdCopy;
  const done = () => toast("VIN nukopijuotas", "✓");
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, done);
  else {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.append(t);
    t.select();
    try {
      document.execCommand("copy");
    } catch (err) {}
    t.remove();
    done();
  }
});
