// Datos laukai (v53): naudojamas sistemos datos pasirinkimas (telefone – įprastas iOS / Android kalendorius),
// tik visas laukas paspaudžiamas ir vienodai sutvarkytas. Stilius – 165-sheets-v52.css (input[type="date"]).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function dpMarkV53(input) {
  // Tuščiam laukui rodoma užuomina (CSS: .dpEmptyV53::before nepalaikoma input'e, todėl naudojama klasė + spalva).
  input.classList.toggle("dpEmptyV53", !input.value);
}
document.addEventListener(
  "click",
  e => {
    const input = e.target.closest?.('input[type="date"], input[type="time"]');
    if (!input || input.disabled || input.readOnly) return;
    try {
      if (typeof input.showPicker === "function") input.showPicker();
    } catch (err) {}
  },
  true
);
document.addEventListener(
  "input",
  e => e.target?.matches?.('input[type="date"]') && dpMarkV53(e.target),
  true
);
document.addEventListener(
  "change",
  e => e.target?.matches?.('input[type="date"]') && dpMarkV53(e.target),
  true
);
const dpObserverV53 = new MutationObserver(() =>
  document.querySelectorAll('input[type="date"]:not([data-dp-v53])').forEach(i => {
    i.dataset.dpV53 = "1";
    dpMarkV53(i);
  })
);
dpObserverV53.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('input[type="date"]').forEach(i => {
  i.dataset.dpV53 = "1";
  dpMarkV53(i);
});
