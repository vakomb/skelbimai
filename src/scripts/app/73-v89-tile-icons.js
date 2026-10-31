// v89: vienodos, minimalistinės plytelių ikonos Garaže, Buhalterijoje ir Meniu (ir Vadybininko mygtuke).
// Ikonos – 24×24, 1,75 linija, „duotone“ (švelnus užpildas currentColor 14 %), suapvalinti kampai. Įdedamos
// sinchroniškai per MutationObserver (mikroužduotis – prieš piešimą), todėl Buhalterijai persipiešus ikonos ir
// Vadybininko skaičiukas nesumirksi. Senas SVG pakeičiamas, kiti vaikai (ženkleliai) paliekami.
// Stilius – styles/196-v89-pages.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const TI_FILL_V89 = 'fill="currentColor" fill-opacity=".14"';
const TI_V89 = {
  manager: `<circle cx="12" cy="8.6" r="3.7"/><path d="M4.8 19.6c.8-3.9 3.4-6 7.2-6s6.4 2.1 7.2 6"/>`,
  tasks: `<rect x="5" y="4.8" width="14" height="15.7" rx="3" ${TI_FILL_V89} stroke="none"/><rect x="5" y="4.8" width="14" height="15.7" rx="3"/><path d="M9.2 3.5h5.6v2.4a.9.9 0 0 1-.9.9h-3.8a.9.9 0 0 1-.9-.9z"/><path d="m8.9 13.4 2.2 2.2 4.1-4.4"/>`,
  contract: `<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" ${TI_FILL_V89} stroke="none"/><path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5"/><path d="M8.6 11.6h4.6"/><path d="M8.6 16.6c1.1-1.9 2-2 2.4-.6.4 1.2 1.1 1.2 1.9-.1.5-.8 1.1-.9 1.9-.3"/>`,
  leads: `<path d="M3.9 12.5V5.9a2 2 0 0 1 2-2h6.6l7.5 7.5a2 2 0 0 1 0 2.8l-5.8 5.8a2 2 0 0 1-2.8 0z" ${TI_FILL_V89} stroke="none"/><path d="M3.9 12.5V5.9a2 2 0 0 1 2-2h6.6l7.5 7.5a2 2 0 0 1 0 2.8l-5.8 5.8a2 2 0 0 1-2.8 0z"/><circle cx="8.6" cy="8.6" r="1.6"/>`,
  addcar: `<rect x="3.6" y="11" width="16.8" height="6.2" rx="2.2" ${TI_FILL_V89} stroke="none"/><path d="M5.4 11 7 7.1a2 2 0 0 1 1.9-1.3h4.4"/><path d="M18.6 11l-.8-2"/><rect x="3.6" y="11" width="16.8" height="6.2" rx="2.2"/><path d="M6.4 17.2v1.6M17.6 17.2v1.6"/><path d="M7.6 14.1h1.2M15.2 14.1h1.2"/><path d="M18 2.8v5M15.5 5.3h5"/>`,
  finance: `<rect x="3.8" y="7" width="16.4" height="12.2" rx="2.6" ${TI_FILL_V89} stroke="none"/><path d="M5.5 7.1 15.6 4.4a1.4 1.4 0 0 1 1.8 1.3V7"/><rect x="3.8" y="7" width="16.4" height="12.2" rx="2.6"/><path d="M20.2 11.2h-3.4a1.9 1.9 0 0 0 0 3.8h3.4"/>`,
  reports: `<rect x="4" y="4" width="16" height="16" rx="3.6" ${TI_FILL_V89} stroke="none"/><rect x="4" y="4" width="16" height="16" rx="3.6"/><path d="M8.5 16v-3.2M12 16V8.5M15.5 16v-5.3"/>`,
  expense: `<circle cx="12" cy="12" r="8.3" ${TI_FILL_V89} stroke="none"/><circle cx="12" cy="12" r="8.3"/><path d="M8.2 12h7.6"/>`,
  income: `<circle cx="12" cy="12" r="8.3" ${TI_FILL_V89} stroke="none"/><circle cx="12" cy="12" r="8.3"/><path d="M12 8.2v7.6M8.2 12h7.6"/>`,
  invoice: `<path d="M6 3.6h12v16.8l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" ${TI_FILL_V89} stroke="none"/><path d="M6 3.6h12v16.8l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 8.4h6M9 11.8h6M9 15.2h3.6"/>`,
  customers: `<circle cx="9.4" cy="8.4" r="3.3" ${TI_FILL_V89} stroke="none"/><circle cx="9.4" cy="8.4" r="3.3"/><path d="M3.6 19.2c.6-3.5 2.6-5.3 5.8-5.3s5.2 1.8 5.8 5.3"/><path d="M15.4 5.3a3.2 3.2 0 0 1 0 6.2M17.4 14.2c1.7.6 2.7 2.2 3.1 5"/>`,
  history: `<circle cx="12" cy="12" r="7.8" ${TI_FILL_V89} stroke="none"/><path d="M4.4 12a7.6 7.6 0 1 0 2.3-5.4"/><path d="M4.5 3.9v3.4h3.4"/><path d="M12 8.1v4.2l2.8 1.8"/>`,
  stats: `<rect x="3.6" y="4" width="16.8" height="16" rx="3.6" ${TI_FILL_V89} stroke="none"/><rect x="3.6" y="4" width="16.8" height="16" rx="3.6"/><path d="m7.4 15.2 3.1-3.3 2.6 2.1 3.6-4.4"/><path d="M14.3 9.6h2.4V12"/>`,
  settings: `<path d="M12 3.6l1.7 1.8 2.4-.5.7 2.3 2.3.7-.5 2.4 1.8 1.7-1.8 1.7.5 2.4-2.3.7-.7 2.3-2.4-.5L12 20.4l-1.7-1.8-2.4.5-.7-2.3-2.3-.7.5-2.4L3.6 12l1.8-1.7-.5-2.4 2.3-.7.7-2.3 2.4.5z" ${TI_FILL_V89} stroke="none"/><path d="M12 3.6l1.7 1.8 2.4-.5.7 2.3 2.3.7-.5 2.4 1.8 1.7-1.8 1.7.5 2.4-2.3.7-.7 2.3-2.4-.5L12 20.4l-1.7-1.8-2.4.5-.7-2.3-2.3-.7.5-2.4L3.6 12l1.8-1.7-.5-2.4 2.3-.7.7-2.3 2.4.5z"/><circle cx="12" cy="12" r="2.7"/>`
};
// Kuri plytelė – kuri ikona
const TI_MAP_V89 = [
  [".garageRefWhat", ".garageRefWhatIcon", "manager"],
  ['[data-garage-action="tasks"]', ".garageRefTileIcon", "tasks"],
  ['[data-garage-action="contract"]', ".garageRefTileIcon", "contract"],
  ['[data-garage-action="leads"]', ".garageRefTileIcon", "leads"],
  ['[data-garage-action="addcar"]', ".garageRefTileIcon", "addcar"],
  [".accountingRefAction.finance", ".ico", "finance"],
  [".accountingRefAction.reports", ".ico", "reports"],
  [".accountingRefAction.expense", ".ico", "expense"],
  [".accountingRefAction.income", ".ico", "income"],
  [".accountingRefAction.invoice", ".ico", "invoice"],
  ['.menuLink[data-menu-disclosure="customers"]', ".ico", "customers"],
  ['.menuLink[data-menu-disclosure="history"]', ".ico", "history"],
  ['.menuLink[data-menu-disclosure="garage-stats"]', ".ico", "stats"],
  ['.menuLink[data-menu-disclosure="settings"]', ".ico", "settings"]
];
function tiSvgV89(key) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-ti-v89="${key}">${TI_V89[key]}</svg>`;
}
function tiApplyV89(root = document) {
  for (const [tileSel, icoSel, key] of TI_MAP_V89) {
    root.querySelectorAll(tileSel).forEach(tile => {
      const ico = tile.querySelector(`:scope > ${icoSel}`);
      if (!ico) return;
      const cur = ico.querySelector(":scope > svg");
      if (cur?.dataset.tiV89 === key) return;
      const tmp = document.createElement("span");
      tmp.innerHTML = tiSvgV89(key);
      if (cur) cur.replaceWith(tmp.firstChild);
      else ico.prepend(tmp.firstChild);
      ico.classList.add("tiIcoV89");
      tile.classList.add("tiTileV89");
    });
  }
  // Vadybininko skaičiukas – iš karto (ne kitame kadre), kad persipiešus Buhalterijai nesumirksėtų
  const src = document.querySelector(".garageRefWhatIcon .managerTaskBadgeV1");
  if (src)
    root.querySelectorAll(".garageRefWhatIcon").forEach(icon => {
      if (icon.querySelector(".managerTaskBadgeV1")) return;
      const b = src.cloneNode(true);
      icon.appendChild(b);
    });
}
(() => {
  const start = () => {
    tiApplyV89();
    const app = document.querySelector(".app") || document.body;
    let busy = false;
    new MutationObserver(() => {
      if (busy) return;
      busy = true;
      try {
        tiApplyV89();
      } finally {
        busy = false;
      }
    }).observe(app, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-menu-disclosure", "data-garage-action"]
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
