// v76: „premium“ dizainas – simbolių ir emoji ženkliukai pakeičiami vienodomis linijinėmis piktogramomis.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).
const ICONS_V76 = {
  task: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="m8.6 12.2 2.4 2.4 4.5-4.9"/>',
  doc: '<path d="M7 3.5h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M14 3.5v4h4M9 12.5h6M9 16h4"/>',
  edit: '<path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-4-4l-10 10z"/><path d="m13 7 4 4"/>',
  inspect:
    '<path d="M12 3.5 5.5 6v5.3c0 4 2.8 7.4 6.5 8.7 3.7-1.3 6.5-4.7 6.5-8.7V6z"/><path d="m9.2 12 2 2 3.8-4"/>',
  insurance: '<path d="M12 3.5 5.5 6v5.3c0 4 2.8 7.4 6.5 8.7 3.7-1.3 6.5-4.7 6.5-8.7V6z"/>',
  listing:
    '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 4.5-4 3.5 3 2.5-2 4.5 3.5"/>',
  price: '<path d="M16.5 6.6a6.5 6.5 0 1 0 0 10.8"/><path d="M5 10.5h8M5 13.5h8"/>',
  phone:
    '<path d="M7 3.8h2.6l1.4 3.8-1.9 1.3a10.6 10.6 0 0 0 6 6l1.3-1.9 3.8 1.4V17a2.2 2.2 0 0 1-2.4 2.2C10.6 18.6 5.4 13.4 4.8 6.2A2.2 2.2 0 0 1 7 3.8z"/>',
  folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  list: '<path d="M5 7.5h14M5 12h14M5 16.5h9"/>',
  car: '<path d="M5 16.5V13l1.7-4.6A2 2 0 0 1 8.6 7h6.8a2 2 0 0 1 1.9 1.4L19 13v3.5"/><path d="M4 13h16v3.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V16h-9v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>'
};
const GLYPH_ICON_V76 = {
  "✓": "task",
  "▤": "doc",
  "✎": "edit",
  "⌖": "inspect",
  "◈": "insurance",
  "◎": "listing",
  "€": "price",
  "☎": "phone",
  "📁": "folder",
  "≡": "list"
};
function iconSvgV76(name) {
  return `<svg class="aeIcoV76" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS_V76[name]}</svg>`;
}
function iconizeV76(root = document) {
  // Vadybininko sąrašas ir Buhalterijos „Naujausios operacijos“
  root.querySelectorAll(".garageWhatThumb, .accountingRefOpsFoldIconV1").forEach(el => {
    if (el.querySelector("img, svg")) return;
    const name = GLYPH_ICON_V76[el.textContent.trim()];
    if (name) el.innerHTML = iconSvgV76(name);
  });
  // Vadybininko pagrindinė kortelė be nuotraukos
  root.querySelectorAll(".garageWhatNoPhoto").forEach(el => {
    const t = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (t && !el.querySelector(".aeIcoV76")) {
      const span = document.createElement("span");
      span.className = "aeNoPhotoIcoV76";
      span.innerHTML = iconSvgV76("car");
      el.replaceChild(span, t);
    }
  });
  // Finansų rodikliai: be emoji pavadinimuose
  root.querySelectorAll(".smallStatBox .label").forEach(el => {
    if (el.dataset.v76) return;
    const clean = el.textContent.replace(/^[^\p{L}\p{N}]+/u, "").trim();
    if (clean && clean !== el.textContent) el.textContent = clean;
    el.dataset.v76 = "1";
  });
}
const __renderIconsV76 = render;
render = function () {
  const r = __renderIconsV76.apply(this, arguments);
  try {
    iconizeV76();
  } catch (err) {}
  return r;
};
// Langai (#sheet) ir vėliau perpiešiamos dalys
try {
  let iconQueuedV76 = false;
  new MutationObserver(() => {
    if (iconQueuedV76) return;
    iconQueuedV76 = true;
    requestAnimationFrame(() => {
      iconQueuedV76 = false;
      try {
        iconizeV76();
      } catch (err) {}
    });
  }).observe(document.body, { childList: true, subtree: true });
} catch (err) {}
iconizeV76();
