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
