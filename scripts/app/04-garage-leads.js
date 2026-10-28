// Dominantys variantai (leads): pridėti, redaguoti, skambinti, ištrinti; Garažo vidinių skydelių atidarymas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

let garageLeadSubmitting = false;
function addGarageLead() {
  if (garageLeadSubmitting) return;
  let data;
  try {
    data = garageLeadFromFormValues();
  } catch (e) {
    toast(e.message || "Patikrink laukus", "⚠️");
    return;
  }
  if (!data.make || !data.model) {
    toast("Įrašyk markę ir modelį", "✍️");
    return;
  }
  garageLeadSubmitting = true;
  const submitButton = document.getElementById("addGarageLeadBtn");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
  }
  const finishSubmit = () => {
    garageLeadSubmitting = false;
    const button = document.getElementById("addGarageLeadBtn");
    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };
  const lead = {
    id: uid(),
    make: data.make,
    model: data.model,
    year: data.year || "",
    fuel: data.fuel,
    phone: data.phone,
    city: data.city,
    initialPrice: data.initialPrice || 0,
    targetPrice: data.targetPrice || 0,
    expectedSalePrice: data.expectedSalePrice || 0,
    taStatus: data.taStatus || "unknown",
    taUntil: data.taUntil || "",
    insuranceStatus: data.insuranceStatus || "unknown",
    insuranceUntil: data.insuranceUntil || "",
    notes: data.notes,
    defects: "",
    followUpDays: data.followDays,
    createdAt: nowLabel(),
    createdDateISO: todayISO(),
    lastCalledAt: "",
    nextCallDate: addDaysISO(todayISO(), data.followDays || 0),
    photos: [],
    calls: 0,
    status: "aktyvus"
  };
  state.leadVariants.unshift(lead);
  addHistory(
    "Dominantis variantas įkeltas",
    `${lead.make} ${lead.model} • pradinė ${moneyFmt(lead.initialPrice)} • mūsų kaina ${moneyFmt(lead.targetPrice)} • tel. ${lead.phone || "—"}`,
    "📋",
    { kind: "lead", id: lead.id, label: "Atidaryti variantą" }
  );
  toast("Variantas įkeltas", "📋");
  saveState();
  render();
  const savedLeadPanel = document.getElementById("addGarageLeadPanel");
  const savedLeadOpen = document.getElementById("showAddGarageLeadBtn");
  if (savedLeadPanel) savedLeadPanel.style.display = "none";
  if (savedLeadOpen) savedLeadOpen.style.display = "block";
  const files = data.files.slice();
  [
    "leadMake",
    "leadModel",
    "leadYear",
    "leadFuel",
    "leadPhone",
    "leadCity",
    "leadInitialPrice",
    "leadTargetPrice",
    "leadExpectedSalePrice",
    "leadFollowDays",
    "leadTaStatus",
    "leadTaUntil",
    "leadInsuranceStatus",
    "leadInsuranceUntil",
    "leadNotes",
    "leadPhotos"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "file") el.value = "";
    else if (id === "leadFollowDays") el.value = "2";
    else if (id === "leadTaStatus" || id === "leadInsuranceStatus") el.value = "unknown";
    else el.value = "";
  });
  if (!files.length) {
    finishSubmit();
    return;
  }
  (async () => {
    try {
      const photos = await leadPhotosToDataUrls(files);
      if (!photos.length) {
        toast("Variantas pridėtas, bet nuotraukų nepavyko išsaugoti", "⚠️");
        return;
      }
      lead.photos = photos;
      saveState();
      await render();
    } catch (e) {
      console.warn("Variant photo processing failed", e);
      toast("Variantas pridėtas, bet nuotraukų nepavyko išsaugoti", "⚠️");
    } finally {
      finishSubmit();
    }
  })();
}
function callGarageLead(leadId, shouldRender = true) {
  const lead = state.leadVariants.find(v => v.id === leadId);
  if (!lead) return;
  lead.calls = Number(lead.calls || 0) + 1;
  lead.lastCalledAt = nowLabel();
  lead.updatedAt = nowLabel();
  lead.nextCallDate = addDaysISO(todayISO(), lead.followUpDays || 0);
  addHistory(
    "Skambutis dėl varianto",
    `${lead.make} ${lead.model} • tel. ${lead.phone || "—"} • kitas skambutis po ${lead.followUpDays || 0} d.`,
    "📞",
    { kind: "lead", id: lead.id, label: "Atidaryti variantą" }
  );
  saveState();
  toast(`Paskambinta. Kitas skambutis po ${lead.followUpDays || 0} d.`, "📞");
  if (shouldRender) render();
}
function deleteGarageLead(leadId) {
  const lead = state.leadVariants.find(v => v.id === leadId);
  if (!lead) return;
  const ok = window.confirm(`Ištrinti variantą „${lead.make} ${lead.model}“?`);
  if (!ok) return;
  state.leadVariants = state.leadVariants.filter(v => v.id !== leadId);
  addHistory("Dominantis variantas", `Ištrintas: ${lead.make} ${lead.model}`, "🗑️");
  toast("Variantas ištrintas", "🗑️");
  saveState();
  render();
}
function updateGarageLead(leadId, data, photos = []) {
  const lead = state.leadVariants.find(v => v.id === leadId);
  if (!lead) return false;
  lead.make = (data.make || "").trim();
  lead.model = (data.model || "").trim();
  lead.year = data.year || "";
  lead.fuel = (data.fuel || "").trim();
  lead.phone = (data.phone || "").trim();
  lead.city = (data.city || "").trim();
  lead.initialPrice = Math.max(0, Number(data.initialPrice) || 0);
  lead.targetPrice = Math.max(0, Number(data.targetPrice) || 0);
  lead.expectedSalePrice = Math.max(0, Number(data.expectedSalePrice) || 0);
  lead.taStatus = data.taStatus || "unknown";
  lead.taUntil = data.taUntil || "";
  lead.insuranceStatus = data.insuranceStatus || "unknown";
  lead.insuranceUntil = data.insuranceUntil || "";
  lead.followUpDays = Math.max(0, Number(data.followUpDays) || 0);
  lead.notes = (data.notes || "").trim();
  lead.defects = "";
  if (Array.isArray(photos) && photos.length) {
    lead.photos = [...(lead.photos || []), ...photos];
  }
  lead.updatedAt = nowLabel();
  lead.nextCallDate = addDaysISO(todayISO(), lead.followUpDays || 0);
  return true;
}
function openGarageLeadsPage() {
  state.ui = state.ui || {};
  const panel = document.getElementById("view-garage-leads");
  const isOpen = panel?.classList.contains("garageInlineOpen");
  document
    .querySelector('#view-garage [data-garage-action="leads"]')
    ?.setAttribute("aria-expanded", String(!isOpen));
  state.selectedView = "garage";
  state.ui.garageInlineExpanded = isOpen ? "" : "leads";
  state.ui.garageTaskHubOpen = false;
  state.ui.garageTaskGroups = { autos: false, custom: false };
  state.ui.soldCarsOpen = false;
  document.getElementById("garageTaskForm")?.classList.remove("is-open");
  document.querySelector("[data-toggle-other-task-form]")?.setAttribute("aria-expanded", "false");
  const addPanel = document.getElementById("addCarPanel");
  if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
  else if (addPanel) addPanel.style.display = "none";
  const addButton = document.getElementById("showAddCarFormBtn");
  if (addButton) addButton.style.display = "block";
  if (isOpen) {
    const leadForm = document.getElementById("addGarageLeadPanel");
    if (leadForm) leadForm.style.display = "none";
    const leadAdd = document.getElementById("showAddGarageLeadBtn");
    if (leadAdd) leadAdd.style.display = "block";
  }
  saveState();
  render();
  requestAnimationFrame(() => {
    const p = document.getElementById("view-garage-leads");
    p?.classList.toggle("garageInlineOpen", !isOpen);
  });
}
function openGarageContacts(forceOpen = false) {
  state.ui = state.ui || {};
  const panel = document.getElementById("view-customers");
  if (!panel) return;
  const isOpen = panel.classList.contains("garageInlineOpen");
  const open = forceOpen || !isOpen;
  const button = document.querySelector('#view-garage [data-garage-action="contacts"]');
  button?.setAttribute("aria-expanded", String(open));
  state.selectedView = "garage";
  state.ui.garageInlineExpanded = open ? "contacts" : "";
  state.ui.garageTaskHubOpen = false;
  state.ui.garageTaskGroups = { autos: false, custom: false };
  state.ui.soldCarsOpen = false;
  document.getElementById("garageTaskForm")?.classList.remove("is-open");
  document.querySelector("[data-toggle-other-task-form]")?.setAttribute("aria-expanded", "false");
  document.getElementById("view-garage-leads")?.classList.remove("garageInlineOpen");
  const addPanel = document.getElementById("addCarPanel");
  if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
  else if (addPanel) addPanel.style.display = "none";
  const addButton = document.getElementById("showAddCarFormBtn");
  if (addButton) addButton.style.display = "block";
  saveState();
  render();
  requestAnimationFrame(() => panel.classList.toggle("garageInlineOpen", open));
}
function openGarageTasks(forceOpen) {
  state.ui = state.ui || {};
  document.getElementById("view-garage-leads")?.classList.remove("garageInlineOpen");
  const addPanel = document.getElementById("addCarPanel");
  if (typeof window.__garageHideAddCarSmooth === "function") window.__garageHideAddCarSmooth();
  else if (addPanel) addPanel.style.display = "none";
  const addButton = document.getElementById("showAddCarFormBtn");
  if (addButton) addButton.style.display = "block";
  state.ui.garageInlineExpanded = "";
  state.ui.soldCarsOpen = false;
  state.ui.garageTaskHubOpen = typeof forceOpen === "boolean" ? forceOpen : !state.ui.garageTaskHubOpen;
  const open = !!state.ui.garageTaskHubOpen;
  document.getElementById("garageTaskForm")?.classList.remove("is-open");
  document.querySelector("[data-toggle-other-task-form]")?.setAttribute("aria-expanded", "false");
  state.ui.garageTaskGroups = { today: false, autos: false, custom: false };
  saveState();
  render();
}
window.__closeGarageTaskHubV1 = () => openGarageTasks(false);
function openGarageAddCar() {
  state.ui = state.ui || {};
  state.ui.garageTaskHubOpen = false;
  state.ui.garageTaskGroups = { autos: false, custom: false };
  state.ui.garageInlineExpanded = "";
  state.ui.soldCarsOpen = false;
  document.getElementById("garageTaskForm")?.classList.remove("is-open");
  document.querySelector("[data-toggle-other-task-form]")?.setAttribute("aria-expanded", "false");
  document.getElementById("view-garage-leads")?.classList.remove("garageInlineOpen");
  const btn = document.getElementById("showAddCarFormBtn");
  if (btn) btn.click();
}
function openGarageStats() {
  state.selectedView = "garage-stats";
  saveState();
  render();
}
function openFinancePage() {
  state.selectedView = "finance";
  saveState();
  render();
}
