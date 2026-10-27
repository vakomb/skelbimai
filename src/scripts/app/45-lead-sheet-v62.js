// Varianto kortelė (v62): tvarkinga suvestinė (telefonas, miestas, kitas skambutis, „Skambinti“, trys kainos),
// redagavimo laukai sugrupuoti į korteles (Automobilis, Pardavėjas, Kainos, Būklė, Pastabos), nuotraukų rodomos
// pirmos keturios. Laukų id ir mygtukų veiksmai – tie patys (openGarageLeadSheet). Stilius – 173-polish-v62.css.
const lsPhotosOpenV62 = new Set();
const LS_GROUPS_V62 = [
  [
    "Automobilis",
    [
      ["editLeadMake", "Markė"],
      ["editLeadModel", "Modelis"],
      ["editLeadYear", "Metai"],
      ["editLeadFuel", "Kuras"]
    ]
  ],
  [
    "Pardavėjas",
    [
      ["editLeadPhone", "Telefonas"],
      ["editLeadCity", "Miestas"],
      ["editLeadFollowDays", "Perskambinti po, d."]
    ]
  ],
  [
    "Kainos",
    [
      ["editLeadInitialPrice", "Prašo, €"],
      ["editLeadTargetPrice", "Siūlome, €"],
      ["editLeadExpectedSalePrice", "Parduotume už, €"]
    ]
  ],
  [
    "Būklė",
    [
      ["editLeadTaStatus", "TA"],
      ["editLeadTaUntil", "TA galioja iki"],
      ["editLeadInsuranceStatus", "Draudimas"],
      ["editLeadInsuranceUntil", "Draudimas iki"]
    ]
  ],
  ["Pastabos", [["editLeadNotes", ""]]]
];
function lsPhotosV62(sheet, lead) {
  const media = sheet.querySelector(".premiumMedia");
  const grid = media?.querySelector(".premiumThumbGrid");
  if (!media || !grid) return;
  const count = grid.querySelectorAll(":scope > .premiumThumb").length;
  media.classList.toggle("lsNoPhotosV62", !count);
  const open = lsPhotosOpenV62.has(lead.id);
  grid.classList.toggle("csPhotosCollapsedV61", count > 4 && !open);
  const oldRow = media.querySelector(".csPhotoActionsV61");
  const keep = oldRow?.querySelector("#downloadLeadPhotos");
  if (keep) media.append(keep);
  oldRow?.remove();
  const dl = sheet.querySelector("#downloadLeadPhotos");
  if (!count) {
    if (dl) dl.hidden = true;
    return;
  }
  if (dl) {
    dl.hidden = false;
    dl.textContent = "Atsisiųsti visas";
  }
  const row = document.createElement("div");
  row.className = "csPhotoActionsV61" + (count > 4 ? " two" : "");
  if (count > 4)
    row.innerHTML = `<button type="button" class="csPhotoMoreV61" data-ls-photos-toggle="${escapeHTML(lead.id)}">${open ? "Rodyti mažiau" : `Rodyti visas (${count})`}</button>`;
  if (dl) row.append(dl);
  grid.after(row);
}
const __openGarageLeadSheetV62 = openGarageLeadSheet;
openGarageLeadSheet = function (leadId) {
  __openGarageLeadSheetV62(leadId);
  const lead = (state.leadVariants || []).find(v => v.id === leadId);
  const sheet = document.getElementById("sheet");
  const body = sheet?.querySelector(".premiumDetailBody");
  if (!lead || !body) return;
  sheet.classList.add("leadSheetV62");
  // Antraštė
  sheet.querySelector(".premiumSheetHead .premiumEyebrow")?.remove();
  const h3 = sheet.querySelector(".premiumSheetHead h3");
  if (h3) h3.textContent = `${lead.make || ""} ${lead.model || ""}`.trim() || "Variantas";
  // Nuotrauka viršuje – be ženkliukų; jei nuotraukų nėra – nerodoma
  const hero = sheet.querySelector(".premiumHero");
  hero?.querySelector(".premiumHeroPills")?.remove();
  if (hero?.querySelector(".premiumHeroEmpty")) hero.hidden = true;
  // Senos eilutės
  body
    .querySelectorAll(
      ":scope > .premiumChipRow, :scope > .vehicleStatusRow, :scope > .sheetRecommendation, :scope > .premiumContactCard"
    )
    .forEach(n => (n.hidden = true));
  // Suvestinė
  const phone = String(lead.phone || "").trim();
  const due = lead.nextCallDate ? tkDueV62(lead.nextCallDate) : null;
  const seller = Number(lead.initialPrice || 0),
    ours = Number(lead.targetPrice || lead.initialPrice || 0),
    profit = leadPotentialProfit(lead);
  const meta = [
    lead.city ? `<span>${escapeHTML(lead.city)}</span>` : "",
    lead.year ? `<span>${escapeHTML(String(lead.year))}</span>` : "",
    due ? `<span class="tkDue ${due.cls}">Skambinti: ${escapeHTML(due.text.toLowerCase())}</span>` : ""
  ]
    .filter(Boolean)
    .join("");
  body.insertAdjacentHTML(
    "afterbegin",
    `<section class="lsSumV62">
      <div class="lsContactV62">
        <div class="lsWhoV62"><strong>${escapeHTML(phone || "Telefonas nenurodytas")}</strong>${meta ? `<div class="lsMetaV62">${meta}</div>` : ""}</div>
        ${phone ? `<button type="button" class="lsCallV62" data-ls-call><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Skambinti</button>` : ""}
      </div>
      <div class="lsPricesV62">
        <div><span>Prašo</span><strong>${seller ? moneyFmt(seller) : "—"}</strong></div>
        <div><span>Siūlome</span><strong>${ours ? moneyFmt(ours) : "—"}</strong></div>
        <div><span>Pelnas</span><strong class="${profit != null && profit >= 0 ? "positiveText" : profit != null ? "negativeText" : ""}">${profit != null ? (profit >= 0 ? "+" : "") + moneyFmt(profit) : "—"}</strong></div>
      </div>
    </section>`
  );
  // Redagavimo laukai – grupėmis
  const edit = body.querySelector(".premiumEditSection");
  if (edit) {
    const frag = document.createDocumentFragment();
    LS_GROUPS_V62.forEach(([title, fields]) => {
      const sec = document.createElement("section");
      sec.className = "lsCardV62";
      sec.innerHTML = `<h4>${escapeHTML(title)}</h4><div class="lsGridV62"></div>`;
      const grid = sec.querySelector(".lsGridV62");
      fields.forEach(([id, label]) => {
        const input = document.getElementById(id);
        const field = input?.closest(".field");
        if (!field) return;
        const lab = field.querySelector("label");
        if (lab) {
          if (label) lab.textContent = label;
          else lab.remove();
          lab.htmlFor = id;
        }
        if (id === "editLeadNotes") input.placeholder = "Defektai, derybos, kita…";
        grid.append(field);
      });
      if (grid.children.length) frag.append(sec);
    });
    edit.replaceWith(frag);
  }
  // Nuotraukos
  sheet.querySelector(".premiumMedia .premiumEyebrow")?.remove();
  sheet.querySelector(".premiumMedia .premiumEmptyMedia")?.remove();
  lsPhotosV62(sheet, lead);
  // Veiksmai
  const g2 = sheet.querySelector("#leadGalleryBtn2");
  if (g2) g2.hidden = true;
  const del = sheet.querySelector("#leadDeleteBtn");
  if (del) del.textContent = "Ištrinti variantą";
  const save = sheet.querySelector("#leadSaveBtn");
  if (save) save.textContent = "Išsaugoti";
};
document.addEventListener("click", e => {
  if (e.target.closest("#sheet.leadSheetV62 [data-ls-call]")) {
    document.getElementById("leadCallNowBtn")?.click();
    return;
  }
  const t = e.target.closest("[data-ls-photos-toggle]");
  if (!t) return;
  const id = t.dataset.lsPhotosToggle;
  if (lsPhotosOpenV62.has(id)) lsPhotosOpenV62.delete(id);
  else lsPhotosOpenV62.add(id);
  const lead = (state.leadVariants || []).find(v => v.id === id);
  const sheet = document.getElementById("sheet");
  if (lead && sheet) lsPhotosV62(sheet, lead);
});
