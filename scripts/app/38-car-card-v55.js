// Automobilio kortelė (v55): švaresnė antraštė, „Užduotys“ vietoj „Vadybininkas“, be emoji ir tuščių blokų.
// Stilius – 167-car-card-v55.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const __renderCarSheetV55 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV55(car);
  const sheet = document.getElementById("sheet");
  if (!sheet || !car) return;
  sheet.classList.add("carSheetV55");
  // Antraštė: markė ir modelis centre, uždarymas dešinėje.
  const head = sheet.querySelector(".premiumSheetHead");
  if (head && !head.querySelector(".cdHeadSpacerV55"))
    head.insertAdjacentHTML("afterbegin", '<span class="cdHeadSpacerV55"></span>');
  const title = head?.querySelector("h3");
  if (title)
    title.textContent =
      [regPrettyMakeV50(car.regMake), regPrettyModelV50(car.regModel)].filter(Boolean).join(" ") || car.name;
  // Užduotys
  const tasksHead = sheet.querySelector(".carTasksSectionTitle h4");
  if (tasksHead) {
    const total = (car.checklist || []).length,
      done = (car.checklist || []).filter(i => i.done).length;
    tasksHead.innerHTML = `Užduotys${total ? ` <span class="cdCountV55">${done}/${total}</span>` : ""}`;
  }
  // Emoji iš terminų ir išlaidų žymų
  sheet.querySelectorAll(".dueChip, .carTaskReceiptMeta, .carTaskMain .small").forEach(el => {
    for (const n of el.childNodes)
      if (n.nodeType === 3)
        n.textContent = n.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*/gu, "");
  });
  // Nuotraukos: be „MEDIJA“ antraštės; jei nuotraukų nėra – tik pridėjimo mygtukas.
  const media = sheet.querySelector("#carDetailPhotos");
  if (media) {
    media.querySelector(".premiumEyebrow")?.remove();
    const hasPhotos = (car.photos || []).filter(Boolean).length > 0;
    media.classList.toggle("cdNoPhotosV55", !hasPhotos);
    const dl = media.querySelector("#downloadCarPhotos");
    if (dl) dl.textContent = "Atsisiųsti visas";
  }
  sheet.querySelectorAll(".carSellBottomBtn, .carPpBottomBtn, #editCarInfoBtn, #deleteCarBtn").forEach(b => {
    b.textContent = b.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*/gu, "").trim();
  });
};
