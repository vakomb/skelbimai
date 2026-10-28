// ZIP formavimas be bibliotekų (crc32), nuotraukų atsisiuntimas ir galerijos.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function crc32(bytes) {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (3988292384 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
function u16(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255]);
}
function u32(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
}
function concatBytes(parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const part of parts) {
    out.set(part, off);
    off += part.length;
  }
  return out;
}
async function downloadAllEntityPhotos(kind, id) {
  const entity =
    kind === "car" ? state.cars.find(c => c.id === id) : state.leadVariants.find(v => v.id === id);
  if (!entity) return;
  const refs =
    Array.isArray(entity.photos) && entity.photos.length
      ? entity.photos.filter(Boolean)
      : entity.imageSrc
        ? [entity.imageSrc]
        : [];
  if (!refs.length) {
    toast("Šiame įraše nėra nuotraukų", "🖼️");
    return;
  }
  try {
    const db = await openPhotoDB();
    const files = [];
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      let blob = null;
      if (typeof ref === "string" && ref.startsWith("photo_")) {
        blob = await new Promise((resolve, reject) => {
          const req = db.transaction(PHOTO_STORE_NAME, "readonly").objectStore(PHOTO_STORE_NAME).get(ref);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      } else if (typeof ref === "string" && ref.startsWith("data:image/")) {
        blob = await fetch(ref).then(r => r.blob());
      } else if (typeof ref === "string" && (ref.startsWith("blob:") || ref.startsWith("http"))) {
        blob = await fetch(ref).then(r => r.blob());
      }
      if (blob) files.push({ name: `nuotrauka-${String(i + 1).padStart(2, "0")}.jpg`, blob });
    }
    if (!files.length) {
      toast("Nuotraukų atsisiųsti nepavyko", "⚠️");
      return;
    }
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const encoder = new TextEncoder();
    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = new Uint8Array(await file.blob.arrayBuffer());
      const crc = crc32(data);
      const local = concatBytes([
        new Uint8Array([80, 75, 3, 4]),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        name,
        data
      ]);
      localParts.push(local);
      const central = concatBytes([
        new Uint8Array([80, 75, 1, 2]),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name
      ]);
      centralParts.push(central);
      offset += local.length;
    }
    const central = concatBytes(centralParts);
    const local = concatBytes(localParts);
    const end = concatBytes([
      new Uint8Array([80, 75, 5, 6]),
      u16(0),
      u16(0),
      u16(files.length),
      u16(files.length),
      u32(central.length),
      u32(local.length),
      u16(0)
    ]);
    const zip = new Blob([local, central, end], { type: "application/zip" });
    const safeName =
      String(kind === "car" ? entity.name : `${entity.make} ${entity.model}`)
        .replace(/[^a-zA-Z0-9À-ž0-9 _-]+/g, "")
        .trim() || "nuotraukos";
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}-nuotraukos.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
    toast(`Atsisiųsta ${files.length} nuotraukų viename ZIP`, "⬇️");
  } catch (e) {
    console.error("Photo ZIP failed", e);
    toast("Nepavyko paruošti nuotraukų atsisiuntimo", "⚠️");
  }
}
async function openEntityPhotoGallery(kind, id, startIndex = 0) {
  const entity =
    kind === "car" ? state.cars.find(c => c.id === id) : state.leadVariants.find(v => v.id === id);
  if (!entity) return;
  const refs =
    Array.isArray(entity.photos) && entity.photos.length
      ? entity.photos.filter(Boolean)
      : entity.imageSrc
        ? [entity.imageSrc]
        : [];
  if (!refs.length) return;
  const urls = await photoRefsToUrls(refs);
  const idx = clamp(Number(startIndex) || 0, 0, urls.length - 1);
  const title = kind === "car" ? entity.name : `${entity.make} ${entity.model}`;
  openSheet(
    `\n      <div class="sheetHead">\n        <h3>${escapeHTML(title)} • ${urls.length} nuotrauk${urls.length === 1 ? "a" : "os"}</h3>\n        <button class="closeBtn" id="closeEntityGallery">✕</button>\n      </div>\n      <div class="gallerySheet">\n        <div class="galleryMain" style="${photoCssUrl(urls[idx] || "")}"></div>\n        <div class="galleryThumbs">\n          ${urls.map((src, i) => `<button type="button" data-entity-gallery-index="${i}"><div class="img" style="${photoCssUrl(src)}"></div></button>`).join("")}\n        </div>\n        <button class="btn secondary" type="button" id="downloadEntityPhotos" style="width:100%;margin-top:10px">⬇️ Atsisiųsti visas nuotraukas</button>\n      </div>\n    `
  );
  document.getElementById("closeEntityGallery").onclick = closeSheet;
  document.getElementById("downloadEntityPhotos").onclick = () => downloadAllEntityPhotos(kind, id);
  document.querySelectorAll("[data-entity-gallery-index]").forEach(btn => {
    btn.onclick = () => openEntityPhotoGallery(kind, id, Number(btn.dataset.entityGalleryIndex));
  });
}
function z16(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255]);
}
function z32(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
}
function zcat(a) {
  const n = a.reduce((s, x) => s + x.length, 0),
    o = new Uint8Array(n);
  let p = 0;
  a.forEach(x => {
    o.set(x, p);
    p += x.length;
  });
  return o;
}
function zcrc(b) {
  let c = 0 ^ -1;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (3988292384 & -(c & 1));
  }
  return (c ^ -1) >>> 0;
}
async function storedPhotoBlob(ref) {
  if (!ref) return null;
  if (ref.startsWith("photo_")) {
    const db = await openPhotoDB();
    return await new Promise((res, rej) => {
      const q = db.transaction(PHOTO_STORE_NAME, "readonly").objectStore(PHOTO_STORE_NAME).get(ref);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => rej(q.error);
    });
  }
  try {
    return await fetch(ref).then(r => r.blob());
  } catch (e) {
    return null;
  }
}
async function downloadAllEntityPhotos(kind, id) {
  const e = kind === "car" ? state.cars.find(x => x.id === id) : state.leadVariants.find(x => x.id === id);
  if (!e) return;
  const refs = Array.isArray(e.photos) && e.photos.length ? e.photos : e.imageSrc ? [e.imageSrc] : [];
  if (!refs.length) {
    toast("Nuotraukų nėra", "🖼️");
    return;
  }
  const enc = new TextEncoder(),
    ls = [],
    cs = [];
  let off = 0,
    count = 0;
  for (let i = 0; i < refs.length; i++) {
    const b = await storedPhotoBlob(refs[i]);
    if (!b) continue;
    const d = new Uint8Array(await b.arrayBuffer()),
      n = enc.encode(`nuotrauka-${String(i + 1).padStart(2, "0")}.jpg`),
      c = zcrc(d);
    const l = zcat([
      new Uint8Array([80, 75, 3, 4]),
      z16(20),
      z16(0),
      z16(0),
      z16(0),
      z16(0),
      z32(c),
      z32(d.length),
      z32(d.length),
      z16(n.length),
      z16(0),
      n,
      d
    ]);
    const ce = zcat([
      new Uint8Array([80, 75, 1, 2]),
      z16(20),
      z16(20),
      z16(0),
      z16(0),
      z16(0),
      z16(0),
      z16(0),
      z32(c),
      z32(d.length),
      z32(d.length),
      z16(n.length),
      z16(0),
      z16(0),
      z16(0),
      z16(0),
      z32(0),
      z32(off),
      n
    ]);
    ls.push(l);
    cs.push(ce);
    off += l.length;
    count++;
  }
  if (!count) {
    toast("Nuotraukų atsisiųsti nepavyko", "⚠️");
    return;
  }
  const l = zcat(ls),
    c = zcat(cs),
    end = zcat([
      new Uint8Array([80, 75, 5, 6]),
      z16(0),
      z16(0),
      z16(count),
      z16(count),
      z32(c.length),
      z32(l.length),
      z16(0)
    ]),
    url = URL.createObjectURL(new Blob([l, c, end], { type: "application/zip" })),
    a = document.createElement("a");
  a.href = url;
  a.download = ((kind === "car" ? e.name : `${e.make}-${e.model}`) || "nuotraukos") + "-nuotraukos.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
  toast(`Atsisiųsta ${count} nuotraukų`, "⬇️");
}
async function openManagedPhotoGallery(kind, id, startIndex = 0) {
  const e = kind === "car" ? state.cars.find(x => x.id === id) : state.leadVariants.find(x => x.id === id);
  if (!e) return;
  const refs = Array.isArray(e.photos) && e.photos.length ? e.photos : e.imageSrc ? [e.imageSrc] : [];
  if (!refs.length) return;
  const urls = await photoRefsToUrls(refs),
    idx = clamp(Number(startIndex) || 0, 0, urls.length - 1);
  const title = kind === "car" ? e.name : `${e.make} ${e.model}`;
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(title)} • ${urls.length} nuotrauk${urls.length === 1 ? "a" : "os"}</h3><button class="closeBtn" id="closeManagedGallery">✕</button></div><div class="gallerySheet"><div class="galleryMain"><img src="${urls[idx] || ""}" alt="Nuotrauka ${idx + 1}"></div><div class="galleryThumbs">${urls.map((u, i) => `<button type="button" data-managed-gallery-index="${i}"><img class="img" src="${u || ""}" alt="Nuotrauka ${i + 1}"></button>`).join("")}</div><button class="btn secondary" type="button" id="managedDownloadAll" style="width:100%">⬇️ Atsisiųsti visas</button></div>`
  );
  document.getElementById("closeManagedGallery").onclick = closeSheet;
  document.getElementById("managedDownloadAll").onclick = () => downloadAllEntityPhotos(kind, id);
  document
    .querySelectorAll("[data-managed-gallery-index]")
    .forEach(
      btn => (btn.onclick = () => openManagedPhotoGallery(kind, id, Number(btn.dataset.managedGalleryIndex)))
    );
}
function openGarageLeadSheet(leadId) {
  const lead = state.leadVariants.find(v => v.id === leadId);
  if (!lead) return;
  const photos = lead.photos || [];
  const html = `\n      <div class="sheetHead premiumSheetHead">\n        <div class="premiumSheetTitle">\n          <span class="premiumEyebrow">VARIANTAS</span>\n          <h3>${escapeHTML(lead.make)} ${escapeHTML(lead.model)}${lead.year ? " " + escapeHTML(String(lead.year)) : ""}</h3>\n        </div>\n        <button class="closeBtn premiumClose" id="closeLeadSheet" type="button" aria-label="Uždaryti">✕</button>\n      </div>\n\n      <div class="premiumDetail">\n        <button type="button" class="premiumHero" id="leadGalleryBtn">\n          ${photos[0] ? `<img src="${photoUrlCache[photos[0]] || photos[0]}" alt="${escapeHTML(lead.make)} ${escapeHTML(lead.model)}">` : `<div class="premiumHeroEmpty">📷<span>Nuotraukų nėra</span></div>`}\n          <div class="premiumHeroShade"></div>\n          <div class="premiumHeroPills">\n            <span class="premiumStatus">${escapeHTML(lead.city || "Be miesto")}</span>\n            <span class="premiumStatus dark">${photos.length} foto</span>\n          </div>\n        </button>\n\n        <div class="premiumDetailBody">\n          <div class="premiumChipRow">\n            <span class="premiumChip good">Pradinė ${moneyFmt(lead.initialPrice)}</span>\n            <span class="premiumChip">Mūsų kaina ${moneyFmt(lead.targetPrice)}</span>\n            ${Number(lead.expectedSalePrice || 0) > 0 ? `<span class="premiumChip">Pardavimas ${moneyFmt(lead.expectedSalePrice)}</span>` : ""}\n          </div>\n          <div class="vehicleStatusRow">${vehicleStatusChips(lead)}</div>\n          <div class="cardRecommendation sheetRecommendation"><span>Dabar</span><strong>${escapeHTML(leadRecommendation(lead).text)}</strong></div>\n\n          <div class="premiumContactCard">\n            <div><span>Telefonas</span><strong>${escapeHTML(lead.phone || "Nenurodytas")}</strong></div>\n            <button class="btn premiumCallBtn" id="leadCallNowBtn" type="button">📞 Skambinti</button>\n          </div>\n\n          <div class="premiumEditSection">\n            <div class="premiumSectionHead"><div><span class="premiumEyebrow">INFORMACIJA</span><h4>Variantas</h4></div></div>\n            <div class="premiumFieldsGrid">\n              <div class="field"><label for="editLeadMake">Markė</label><input class="input" id="editLeadMake" value="${escapeHTML(lead.make || "")}"></div>\n              <div class="field"><label for="editLeadModel">Modelis</label><input class="input" id="editLeadModel" value="${escapeHTML(lead.model || "")}"></div>\n              <div class="field"><label for="editLeadYear">Metai</label><input class="input" id="editLeadYear" type="number" min="1900" step="1" value="${escapeHTML(String(lead.year || ""))}"></div>\n              <div class="field"><label for="editLeadFuel">Kuras</label><input class="input" id="editLeadFuel" value="${escapeHTML(lead.fuel || "")}"></div>\n              <div class="field"><label for="editLeadPhone">Tel. nr.</label><input class="input" id="editLeadPhone" value="${escapeHTML(lead.phone || "")}"></div>\n              <div class="field"><label for="editLeadCity">Miestas</label><input class="input" id="editLeadCity" value="${escapeHTML(lead.city || "")}"></div>\n              <div class="field"><label for="editLeadInitialPrice">Pradinė kaina</label><input class="input" id="editLeadInitialPrice" type="number" min="0" step="1" value="${Number(lead.initialPrice || 0)}"></div>\n              <div class="field"><label for="editLeadTargetPrice">Mūsų kaina</label><input class="input" id="editLeadTargetPrice" type="number" min="0" step="1" value="${Number(lead.targetPrice || 0)}"></div>\n              <div class="field"><label for="editLeadExpectedSalePrice">Numatoma pardavimo kaina</label><input class="input" id="editLeadExpectedSalePrice" type="number" min="0" step="1" value="${Number(lead.expectedSalePrice || 0) || ""}"></div>\n              <div class="field"><label for="editLeadFollowDays">Skambinti po dienų</label><input class="input" id="editLeadFollowDays" type="number" min="0" step="1" value="${Number(lead.followUpDays || 0)}"></div>\n              <div class="field"><label for="editLeadTaStatus">TA</label><select class="input" id="editLeadTaStatus">${vehicleStatusOptions(lead.taStatus)}</select></div>\n              <div class="field"><label for="editLeadTaUntil">TA galioja iki</label><input class="input" id="editLeadTaUntil" type="date" value="${escapeHTML(lead.taUntil || "")}"></div>\n              <div class="field"><label for="editLeadInsuranceStatus">Draudimas</label><select class="input" id="editLeadInsuranceStatus">${vehicleStatusOptions(lead.insuranceStatus)}</select></div>\n              <div class="field"><label for="editLeadInsuranceUntil">Draudimas galioja iki</label><input class="input" id="editLeadInsuranceUntil" type="date" value="${escapeHTML(lead.insuranceUntil || "")}"></div>\n              <div class="field full"><label>Defektai ir pastabos</label><textarea class="input" id="editLeadNotes" rows="3">${escapeHTML((lead.notes || lead.defects || "").trim())}</textarea></div>\n            </div>\n          </div>\n\n          <div class="premiumMedia">\n            <div class="premiumSectionHead"><div><span class="premiumEyebrow">MEDIJA</span><h4>Nuotraukos</h4></div><span class="premiumCount">${photos.length}</span></div>\n            <label class="premiumUpload">\n              <span class="premiumUploadIcon">＋</span><span><strong>Pridėti nuotraukų</strong></span>\n              <input id="editLeadPhotos" type="file" accept="image/*" multiple>\n            </label>\n            <div class="premiumThumbGrid">\n              ${photos.map((ref, i) => `\n                <div class="premiumThumb">\n                  <button type="button" data-open-gallery-index="${i}"><img src="${photoUrlCache[ref] || ""}" alt="Nuotrauka ${i + 1}"></button>\n                  <button type="button" class="premiumThumbDelete" data-lead-photo-delete="${i}" aria-label="Ištrinti nuotrauką">×</button>\n                </div>`).join("") || `<div class="premiumEmptyMedia">📷<span>Nuotraukų nėra</span></div>`}\n            </div>\n            <button class="btn secondary premiumWideBtn" type="button" id="downloadLeadPhotos">⬇️ Atsisiųsti visas</button>\n          </div>\n\n          <div class="premiumActionStack">\n            <button class="btn premiumPrimaryBtn" id="leadSaveBtn" type="button">Išsaugoti pakeitimus</button>\n            <button class="btn secondary" id="leadGalleryBtn2" type="button">Peržiūrėti visas nuotraukas</button>\n            <button class="btn danger premiumDeleteBtn" id="leadDeleteBtn" type="button">Ištrinti variantą</button>\n          </div>\n        </div>\n      </div>\n    `;
  openSheet(html);
  bindStandaloneStatusDate("editLeadTaStatus", "editLeadTaUntil");
  bindStandaloneStatusDate("editLeadInsuranceStatus", "editLeadInsuranceUntil");
  document.getElementById("closeLeadSheet").onclick = closeSheet;
  document
    .querySelectorAll("[data-managed-photo-kind]")
    .forEach(
      img =>
        (img.onclick = () =>
          openManagedPhotoGallery("lead", lead.id, Number(img.dataset.managedPhotoIndex || 0)))
    );
  document.getElementById("leadSaveBtn").onclick = async () => {
    const make = document.getElementById("editLeadMake").value.trim();
    const model = document.getElementById("editLeadModel").value.trim();
    if (!make || !model) {
      toast("Įrašyk markę ir modelį", "✍️");
      return;
    }
    const taStatus = document.getElementById("editLeadTaStatus").value || "unknown";
    const taUntil = document.getElementById("editLeadTaUntil").value || "";
    const insuranceStatus = document.getElementById("editLeadInsuranceStatus").value || "unknown";
    const insuranceUntil = document.getElementById("editLeadInsuranceUntil").value || "";
    if (taStatus === "valid" && !taUntil) {
      toast("Nurodyk, iki kada galioja TA.", "⚠️");
      return;
    }
    if (insuranceStatus === "valid" && !insuranceUntil) {
      toast("Nurodyk, iki kada galioja draudimas.", "⚠️");
      return;
    }
    const files = Array.from(document.getElementById("editLeadPhotos").files || []);
    const photos = files.length ? await leadPhotosToDataUrls(files) : [];
    const ok = updateGarageLead(
      lead.id,
      {
        make,
        model,
        year: Number(document.getElementById("editLeadYear").value || 0) || "",
        fuel: document.getElementById("editLeadFuel").value.trim(),
        phone: document.getElementById("editLeadPhone").value.trim(),
        city: document.getElementById("editLeadCity").value.trim(),
        initialPrice: Number(document.getElementById("editLeadInitialPrice").value || 0),
        targetPrice: Number(document.getElementById("editLeadTargetPrice").value || 0),
        expectedSalePrice: Number(document.getElementById("editLeadExpectedSalePrice").value || 0),
        taStatus,
        taUntil,
        insuranceStatus,
        insuranceUntil,
        followUpDays: Number(document.getElementById("editLeadFollowDays").value || 0),
        notes: document.getElementById("editLeadNotes").value.trim()
      },
      photos
    );
    if (!ok) return;
    addHistory("Dominantis variantas", `${make} ${model} atnaujintas`, "✏️");
    toast("Pakeitimai išsaugoti", "✏️");
    saveState();
    render();
    openGarageLeadSheet(lead.id);
  };
  document.getElementById("leadCallNowBtn").onclick = () => {
    callGarageLead(lead.id);
    openGarageLeadSheet(lead.id);
  };
  document.getElementById("leadDeleteBtn").onclick = () => {
    deleteGarageLead(lead.id);
    closeSheet();
  };
  const galleryBtn = document.getElementById("leadGalleryBtn");
  const galleryBtn2 = document.getElementById("leadGalleryBtn2");
  if (galleryBtn) galleryBtn.onclick = () => openLeadGallery(lead.id, 0);
  if (galleryBtn2) galleryBtn2.onclick = () => openLeadGallery(lead.id, 0);
  const downloadLeadPhotos = document.getElementById("downloadLeadPhotos");
  if (downloadLeadPhotos) downloadLeadPhotos.onclick = () => downloadAllEntityPhotos("lead", lead.id);
  document.querySelectorAll("[data-lead-photo-delete]").forEach(
    btn =>
      (btn.onclick = async () => {
        const i = Number(btn.dataset.leadPhotoDelete),
          ref = (lead.photos || [])[i];
        if (!ref || !confirm("Ištrinti šią nuotrauką?")) return;
        lead.photos = lead.photos.filter((_, x) => x !== i);
        await photoDelete(ref);
        saveState();
        render();
        openGarageLeadSheet(lead.id);
      })
  );
  document
    .querySelectorAll("[data-open-gallery-index]")
    .forEach(
      btn => (btn.onclick = () => openLeadGallery(lead.id, Number(btn.dataset.openGalleryIndex || 0)))
    );
  document
    .querySelectorAll('[data-download-photos="lead:${lead.id}"]')
    .forEach(btn => (btn.onclick = () => downloadAllEntityPhotos("lead", lead.id)));
  document
    .querySelectorAll('[data-entity-photo^="lead:${lead.id}:"]')
    .forEach(
      btn =>
        (btn.onclick = () =>
          openEntityPhotoGallery("lead", lead.id, Number(btn.dataset.entityPhoto.split(":").pop())))
    );
}
async function openLeadGallery(leadId, startIndex = 0) {
  const lead = state.leadVariants.find(v => v.id === leadId);
  if (!lead) return;
  const photos = (lead.photos || []).filter(Boolean);
  if (!photos.length) {
    toast("Nuotraukų nėra", "📷");
    return;
  }
  let photoUrls = [];
  try {
    photoUrls = await photoRefsToUrls(photos);
  } catch (e) {
    console.warn("Lead gallery load failed", e);
  }
  const usable = photoUrls.map((u, i) => u || photos[i] || "");
  let idx = clamp(Number(startIndex) || 0, 0, usable.length - 1);
  const html = `\n      <div class="sheetHead">\n        <h3>${escapeHTML(lead.make)} ${escapeHTML(lead.model)}${lead.year ? " " + escapeHTML(String(lead.year)) : ""}</h3>\n        <button class="closeBtn" id="closeGallerySheet" type="button">✕</button>\n      </div>\n      <div class="gallerySheet mobileGallery">\n        <div class="galleryMain">\n          <img id="leadGalleryMainImg" src="${usable[idx] || ""}" alt="Nuotrauka ${idx + 1}">\n        </div>\n        <div class="galleryCounter" id="leadGalleryCounter">${idx + 1} / ${photos.length}</div>\n        <div class="garageLeadTags">\n          <span class="garageLeadTag good">${photos.length} nuotraukos</span>\n          <span class="garageLeadTag">${escapeHTML(lead.city || "Be miesto")}</span>\n        </div>\n        <div class="galleryThumbs" id="leadGalleryThumbs">\n          ${usable.map((src, i) => `\n            <button type="button" data-lead-gallery-index="${i}" class="${i === idx ? "active" : ""}">\n              <img class="img" src="${src || ""}" alt="Nuotrauka ${i + 1}">\n            </button>\n          `).join("")}\n        </div>\n      </div>\n    `;
  openSheet(html);
  document.getElementById("closeGallerySheet").onclick = closeSheet;
  const mainImg = document.getElementById("leadGalleryMainImg");
  const counter = document.getElementById("leadGalleryCounter");
  document.querySelectorAll("[data-lead-gallery-index]").forEach(btn => {
    btn.onclick = () => {
      idx = clamp(Number(btn.dataset.leadGalleryIndex) || 0, 0, usable.length - 1);
      if (mainImg) mainImg.src = usable[idx] || "";
      if (counter) counter.textContent = `${idx + 1} / ${photos.length}`;
      document.querySelectorAll("[data-lead-gallery-index]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
}
