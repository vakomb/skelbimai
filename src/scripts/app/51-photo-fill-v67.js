// Nuotraukų užpildymas (v67): kortelė ar sąrašas kartais nupiešiami anksčiau, nei nuotrauka įkeliama iš
// telefono atminties ar debesies (photoUrlCache dar tuščias) – tada liktų tuščias paveikslėlis. Čia kiekvienas
// tuščias paveikslėlis automobilio / varianto kortelėje ir sąraše užpildomas, kai tik nuotrauka gaunama (photoGet).
async function phUrlV67(ref) {
  if (!ref) return "";
  const s = String(ref);
  if (/^(data:|blob:|https?:)/.test(s)) return s;
  if (photoUrlCache[s]) return photoUrlCache[s];
  try {
    return (await photoGet(s)) || "";
  } catch (e) {
    return "";
  }
}
function phFillImgV67(img, ref) {
  if (!img || !ref || img.getAttribute("src")) return;
  phUrlV67(ref).then(url => {
    if (url && img.isConnected && !img.getAttribute("src")) img.src = url;
  });
}
function phFillSheetV67(entity, kind) {
  const sheet = document.getElementById("sheet");
  if (!sheet || !entity) return;
  const photos = (entity.photos || []).filter(Boolean);
  const sel =
    kind === "car"
      ? '[data-managed-photo-kind="car"][data-managed-photo-index]'
      : "[data-open-gallery-index]";
  sheet.querySelectorAll(sel).forEach(btn => {
    const i = Number(btn.dataset.managedPhotoIndex ?? btn.dataset.openGalleryIndex);
    phFillImgV67(btn.querySelector("img"), photos[i]);
  });
  const heroImg = sheet.querySelector(".premiumHero img");
  phFillImgV67(heroImg, (kind === "car" && entity.imageSrc) || photos[0]);
  // Viršutinė nuotrauka buvo paslėpta (nebuvo įkelta) – parodome, kai tik gauname
  const hero = sheet.querySelector(".premiumHero");
  const ref = (kind === "car" && entity.imageSrc) || photos[0];
  if (hero && ref && hero.querySelector(".premiumHeroEmpty"))
    phUrlV67(ref).then(url => {
      if (!url || !hero.isConnected) return;
      hero.querySelector(".premiumHeroEmpty")?.replaceWith(Object.assign(new Image(), { src: url, alt: "" }));
      hero.hidden = false;
      hero.style.removeProperty("display");
    });
}
function phFillListsV67() {
  document.querySelectorAll("#activeCarGrid [data-open-car], #soldCarGrid [data-open-car]").forEach(card => {
    const car = (state.cars || []).find(c => c.id === card.dataset.openCar);
    const ref = car?.imageSrc || car?.photos?.[0];
    if (!ref) return;
    const img = card.querySelector(".carListPhoto img");
    if (img) return phFillImgV67(img, ref);
    const empty = card.querySelector(".carListPhoto .carListNoPhoto");
    if (empty)
      phUrlV67(ref).then(url => {
        if (url && empty.isConnected)
          empty.replaceWith(Object.assign(new Image(), { src: url, alt: car.name || "" }));
      });
  });
  document.querySelectorAll("#garageLeadRoot [data-open-lead-card]").forEach(card => {
    const lead = (state.leadVariants || []).find(l => l.id === card.dataset.openLeadCard);
    const ref = (lead?.photos || []).filter(Boolean)[0] || lead?.imageSrc;
    if (!ref) return;
    const img = card.querySelector(".garageVariantPhoto img");
    if (img) return phFillImgV67(img, ref);
    const empty = card.querySelector(".garageVariantPhoto .leadNoPhoto");
    if (empty)
      phUrlV67(ref).then(url => {
        if (url && empty.isConnected) empty.replaceWith(Object.assign(new Image(), { src: url, alt: "" }));
      });
  });
}
const __renderCarSheetV67 = renderCarSheet;
renderCarSheet = function (car) {
  __renderCarSheetV67(car);
  phFillSheetV67(car, "car");
};
const __openGarageLeadSheetV67 = openGarageLeadSheet;
openGarageLeadSheet = function (leadId) {
  __openGarageLeadSheetV67(leadId);
  phFillSheetV67(
    (state.leadVariants || []).find(l => l.id === leadId),
    "lead"
  );
};
const __renderPhotoFillV67 = render;
render = function () {
  const r = __renderPhotoFillV67.apply(this, arguments);
  Promise.resolve(r).then(phFillListsV67);
  return r;
};
