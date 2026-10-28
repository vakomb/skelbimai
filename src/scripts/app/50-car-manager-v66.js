// Automobilio kortelė (v73): Vadybininko darbų kortelėje nebėra – visi jie rodomi ir atliekami tik Vadybininko
// puslapyje (mėlynas mygtukas). Kortelėje lieka tik naudotojo užduotys.
const __renderCarSheetV66 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV66(car);
  document
    .querySelectorAll("#sheet .carTasksBlock .carManagerSystemList, #sheet .cmBoxV66")
    .forEach(n => n.remove());
};
