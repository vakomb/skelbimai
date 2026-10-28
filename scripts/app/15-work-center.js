// Rekomendacijos ir Vadybininko darbų sąrašas (workCenterItems, workScore).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function daysBetweenISO(from, to = todayISO()) {
  const a = parseISODateLocal(from),
    b = parseISODateLocal(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.floor((b - a) / 864e5));
}
function carPotentialProfit(car) {
  const sale = Number(car?.askingPrice || 0),
    cost = carTotalCost(car);
  return sale > 0 ? sale - cost : null;
}
function leadPotentialProfit(lead) {
  const sale = Number(lead?.expectedSalePrice || 0),
    buy = Number(lead?.targetPrice || lead?.initialPrice || 0);
  return sale > 0 && buy > 0 ? sale - buy : null;
}
function carRecommendation(car) {
  const profit = carPotentialProfit(car),
    sdk = car.sdkStatus || "unset";
  if (car.status === "parduotas") {
    if (car.accountingSharedAt) return { text: "Dokumentai pateikti", profit: null, base: 15 };
    if (accountingQueueHas(car.id)) return { text: "Savaitės pakete", profit: null, base: 40 };
    return { text: "Teikti buhalterei", profit: null, base: 85 };
  }
  if (sdk.endsWith("-late")) return { text: "Sutvarkyti vėluojantį SDK", profit, base: 125, late: true };
  if (!hasCarDocument(car, "purchase")) return { text: "Prisegti pirkimo sutartį", profit, base: 98 };
  if (!["unset", "done"].includes(sdk)) return { text: "Užbaigti SDK", profit, base: 94 };
  const ta = vehicleStatusState(car.taStatus || "unknown", car.taUntil || "");
  if (ta.cls === "bad") return { text: "Sutvarkyti techninę apžiūrą", profit, base: 90 };
  const ins = vehicleStatusState(car.insuranceStatus || "unknown", car.insuranceUntil || "");
  if (ins.cls === "bad") return { text: "Patikrinti draudimą", profit, base: 72 };
  const undone = (car.checklist || [])
    .filter(x => !x.done)
    .slice()
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  if (undone.length) {
    const task = undone[0],
      late = !!(task.dueDate && task.dueDate < todayISO());
    return { text: `Užbaigti: ${task.name}`, profit, base: late ? 112 : 76, late, due: task.dueDate || "" };
  }
  if ((car.listingStatus || "not-listed") !== "listed") return { text: "Įkelti skelbimą", profit, base: 105 };
  const listedDays = daysBetweenISO(car.listingDate || car.createdDateISO);
  if (listedDays >= 14) return { text: `Peržiūrėti kainą · stovi ${listedDays} d.`, profit, base: 82 };
  return { text: "Stebėti pirkėjų reakciją", profit, base: 35 };
}
function leadRecommendation(lead) {
  const profit = leadPotentialProfit(lead),
    now = todayISO();
  if (lead.nextCallDate && lead.nextCallDate <= now)
    return {
      text: "Paskambinti pardavėjui",
      profit,
      base: 112,
      late: lead.nextCallDate < now,
      due: lead.nextCallDate
    };
  if (!Number(lead.targetPrice || 0)) return { text: "Pateikti savo kainą", profit, base: 90 };
  if (profit != null && profit < 800) return { text: "Peržiūrėti kainą · marža maža", profit, base: 72 };
  if (lead.nextCallDate)
    return {
      text: `Paskambinti ${companyDate(lead.nextCallDate)}`,
      profit,
      base: 52,
      due: lead.nextCallDate
    };
  return { text: "Įvertinti variantą", profit, base: 48 };
}
function workScore(base = 0, due = "", late = false, profit = null) {
  let score = Number(base) || 0;
  const now = todayISO();
  if (late || (due && due < now)) {
    score += 65 + Math.min(60, daysBetweenISO(due) * 7);
  } else if (due === now) score += 42;
  else if (due) {
    const days = daysBetweenISO(now, due);
    if (days <= 2) score += 20;
  }
  if (profit != null && profit > 0) score += Math.min(65, profit / 80);
  return score;
}
function ensureWorkCenterPrefsV30() {
  if (!state.workCenterPrefs || typeof state.workCenterPrefs !== "object") state.workCenterPrefs = {};
  if (!state.workCenterPrefs.dismissed || typeof state.workCenterPrefs.dismissed !== "object")
    state.workCenterPrefs.dismissed = {};
  if (!state.workCenterPrefs.snoozed || typeof state.workCenterPrefs.snoozed !== "object")
    state.workCenterPrefs.snoozed = {};
  return state.workCenterPrefs;
}
function workCenterVisibleV30(item) {
  const p = ensureWorkCenterPrefsV30(),
    key = item.key || "";
  if (!key) return true;
  if (p.dismissed[key]) return false;
  const until = p.snoozed[key] || "";
  if (until && until > todayISO()) return false;
  return true; // v74: pasibaigę atidėjimai valomi tik saugant (workCenterPruneV74), skaitymas būsenos nekeičia
}
function workCenterPruneV74() {
  const p = state?.workCenterPrefs?.snoozed;
  if (!p || typeof p !== "object") return;
  const now = todayISO();
  Object.keys(p).forEach(k => {
    if (p[k] && p[k] <= now) delete p[k];
  });
}
function workCenterSnoozeV30(key, days = 3) {
  if (!key) return;
  const p = ensureWorkCenterPrefsV30();
  delete p.dismissed[key];
  p.snoozed[key] = addDaysISO(todayISO(), Math.max(1, Number(days) || 3));
  saveState();
  render();
}
function workCenterDismissV30(key) {
  if (!key) return;
  const p = ensureWorkCenterPrefsV30();
  p.dismissed[key] = nowLabel();
  delete p.snoozed[key];
  saveState();
  render();
}
function workCenterMissingFieldsV30(car) {
  const fields = [];
  const val = v => String(v ?? "").trim();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(val(car.vin).toUpperCase())) fields.push({ key: "vin", label: "VIN" });
  if (car.mileage == null || !Number.isFinite(Number(car.mileage)) || Number(car.mileage) < 0)
    fields.push({ key: "mileage", label: "rida" });
  if (!val(car.sdk)) fields.push({ key: "sdk", label: "SDK" });
  if (!val(car.plate)) fields.push({ key: "plate", label: "valst. numeris" });
  if (!val(car.registrationDoc || car.regDoc))
    fields.push({ key: "registrationDoc", label: "registracijos liudijimo nr." });
  if (
    !Number.isInteger(Number(car.year)) ||
    Number(car.year) < 1886 ||
    Number(car.year) > new Date().getFullYear() + 1
  )
    fields.push({ key: "year", label: "metai" });
  if (!car.taStatus || car.taStatus === "unknown") fields.push({ key: "taStatus", label: "TA" });
  if (!car.insuranceStatus || car.insuranceStatus === "unknown")
    fields.push({ key: "insuranceStatus", label: "draudimas" });
  if (!Number.isFinite(Number(car.buyPrice)) || Number(car.buyPrice) <= 0)
    fields.push({ key: "buyPrice", label: "pirkimo kaina" });
  return fields;
}
function workCenterMissingDocsV30(car) {
  const out = [];
  if (!hasCarDocument(car, "purchase")) out.push({ kind: "purchase", label: "pirkimo sutartis" });
  if (!hasCarDocument(car, "registration"))
    out.push({ kind: "registration", label: "registracijos dokumentas" });
  return out;
}
function workCenterItemV30(data) {
  const item = { profit: null, due: "", late: false, icon: "✓", base: 60, ...data };
  item.score = workScore(item.base, item.due, item.late, item.profit);
  return item;
}
function workCenterItems() {
  const items = [],
    now = todayISO();
  (state.cars || [])
    .filter(c => c.status !== "parduotas")
    .forEach(car => {
      const missing = workCenterMissingFieldsV30(car);
      const docs = workCenterMissingDocsV30(car);
      const profit = carPotentialProfit(car);
      (car.checklist || [])
        .filter(t => !t.done && t.dueDate && t.dueDate <= now)
        .forEach(task => {
          const late = task.dueDate < now;
          items.push(
            workCenterItemV30({
              key: `car:${car.id}:task:${task.id}`,
              kind: "car",
              id: car.id,
              entity: car.name,
              action: task.name || "Automobilio užduotis",
              detail: late ? "Vėluojanti automobilio užduotis" : "Terminas šiandien",
              actionType: "car-task",
              taskId: task.id,
              icon: "✓",
              due: task.dueDate,
              late,
              base: late ? 150 : 136,
              profit,
              cta: late ? "Vėluoja" : "Atidaryti užduotis"
            })
          );
        });
      const sdk = car.sdkStatus || "unset";
      if (sdk.endsWith("-late"))
        items.push(
          workCenterItemV30({
            key: `car:${car.id}:sdk-late`,
            kind: "car",
            id: car.id,
            entity: car.name,
            action: "Sutvarkyti vėluojantį SDK",
            detail: "SDK procesas vėluoja",
            actionType: "open-car",
            icon: "▤",
            late: true,
            base: 146,
            profit,
            cta: "Atidaryti automobilį"
          })
        );
      else if (car.sdk && !["unset", "done"].includes(sdk))
        items.push(
          workCenterItemV30({
            key: `car:${car.id}:sdk-progress`,
            kind: "car",
            id: car.id,
            entity: car.name,
            action: "Užbaigti SDK",
            detail: "SDK dar nepažymėtas kaip sutvarkytas",
            actionType: "open-car",
            icon: "▤",
            base: 108,
            profit,
            cta: "Atidaryti automobilį"
          })
        );
      if (missing.length)
        items.push(
          workCenterItemV30({
            key: `car:${car.id}:missing-data`,
            kind: "car",
            id: car.id,
            entity: car.name,
            action: `Užpildyti automobilio duomenis: ${missing.map(x => x.label).join(", ")}`,
            detail: "Tik trūkstami laukai · kad PP būtų paruošta generuoti",
            actionType: "missing-data",
            fields: missing,
            icon: "✎",
            base: 128,
            profit,
            cta: "Užpildyti dabar"
          })
        );
      if (docs.length)
        items.push(
          workCenterItemV30({
            key: `car:${car.id}:missing-docs`,
            kind: "car",
            id: car.id,
            entity: car.name,
            action: `Prisegti dokumentus: ${docs.map(x => x.label).join(", ")}`,
            detail: "Dokumentai bus saugomi prie šio automobilio",
            actionType: "missing-docs",
            missingDocs: docs,
            icon: "▤",
            base: 116,
            profit,
            cta: "Prisegti dabar"
          })
        );
      const ta = vehicleStatusState(car.taStatus || "unknown", car.taUntil || "");
      if (ta.cls === "bad")
        items.push(
          workCenterItemV30({
            key: `car:${car.id}:ta-problem`,
            kind: "car",
            id: car.id,
            entity: car.name,
            action: "Sutvarkyti techninės apžiūros būseną",
            detail: ta.label,
            actionType: "status",
            statusKind: "ta",
            icon: "⌖",
            due: car.taUntil || "",
            late: !!(car.taUntil && car.taUntil < now),
            base: 122,
            profit,
            cta: "Atnaujinti TA"
          })
        );
      const ins = vehicleStatusState(car.insuranceStatus || "unknown", car.insuranceUntil || "");
      if (ins.cls === "bad")
        items.push(
          workCenterItemV30({
            key: `car:${car.id}:insurance-problem`,
            kind: "car",
            id: car.id,
            entity: car.name,
            action: "Sutvarkyti draudimo būseną",
            detail: ins.label,
            actionType: "status",
            statusKind: "insurance",
            icon: "◈",
            due: car.insuranceUntil || "",
            late: !!(car.insuranceUntil && car.insuranceUntil < now),
            base: 120,
            profit,
            cta: "Atnaujinti draudimą"
          })
        );
      if ((car.listingStatus || "not-listed") !== "listed")
        items.push(
          workCenterItemV30({
            key: `car:${car.id}:listing`,
            kind: "car",
            id: car.id,
            entity: car.name,
            action: "Kodėl automobilis dar ne skelbime?",
            detail: "Pažymėk būseną arba susidėk darbus iki skelbimo",
            actionType: "listing",
            icon: "◎",
            base: 92,
            profit,
            cta: "Atsakyti"
          })
        );
      else {
        const listedDays = daysBetweenISO(car.listingDate || car.createdDateISO);
        if (listedDays >= 14)
          items.push(
            workCenterItemV30({
              key: `car:${car.id}:price-review`,
              kind: "car",
              id: car.id,
              entity: car.name,
              action: `Peržiūrėti kainą · skelbime ${listedDays} d.`,
              detail: "Gal verta koreguoti planuojamą pardavimo kainą",
              actionType: "price-review",
              icon: "€",
              base: 78,
              profit,
              cta: "Peržiūrėti kainą"
            })
          );
      }
    });
  (state.leadVariants || [])
    .filter(l => l.nextCallDate && l.nextCallDate <= now)
    .forEach(l => {
      const name = [l.make, l.model].filter(Boolean).join(" ") || "Pirkimo variantas",
        late = l.nextCallDate < now;
      items.push(
        workCenterItemV30({
          key: `lead:${l.id}:callback`,
          kind: "lead",
          id: l.id,
          entity: name,
          action: "Paskambinti pardavėjui",
          detail: late
            ? `Skambutis vėluoja nuo ${companyDate(l.nextCallDate)}`
            : `Skambutis suplanuotas šiandien`,
          actionType: "lead",
          icon: "☎",
          due: l.nextCallDate,
          late,
          base: 126,
          profit: leadPotentialProfit(l),
          cta: "Atidaryti variantą"
        })
      );
    });
  (state.garageTasks || [])
    .filter(x => !x.done && x.dueDate && x.dueDate <= now)
    .forEach(x => {
      const late = x.dueDate < now;
      items.push(
        workCenterItemV30({
          key: `task:${x.id}`,
          kind: "task",
          id: x.id,
          entity: x.category || "Kita užduotis",
          action: x.title,
          detail: late ? "Vėluojanti užduotis" : "Terminas šiandien",
          actionType: "task",
          icon: "✓",
          due: x.dueDate,
          late,
          base: x.priority === "urgent" ? 142 : x.priority === "important" ? 128 : 108,
          cta: late ? "Vėluoja" : "Atidaryti"
        })
      );
    });
  (state.customers || [])
    .filter(c => c.stage !== "Užbaigta" && c.followDate && c.followDate <= now)
    .forEach(c => {
      const inspection = c.stage === "Apžiūra",
        late = c.followDate < now;
      items.push(
        workCenterItemV30({
          key: `customer:${c.id}:follow`,
          kind: "customer",
          id: c.id,
          entity: c.name || "Klientas",
          action: inspection ? "Atlikti apžiūrą" : c.nextAction || "Susisiekti su klientu",
          detail: c.stage || "Klientas",
          actionType: "customer",
          icon: inspection ? "⌖" : "☎",
          due: c.followDate,
          late,
          base: inspection ? 124 : 114,
          cta: "Atidaryti klientą"
        })
      );
    });
  (state.cars || [])
    .filter(c => c.status === "parduotas" && !c.accountingSharedAt)
    .forEach(car => {
      const queued = accountingQueueHas(car.id);
      items.push(
        workCenterItemV30({
          key: `car:${car.id}:accounting`,
          kind: "car",
          id: car.id,
          entity: car.name,
          action: queued
            ? "Pateikti buhalterei · savaitės pakete"
            : "Pateikti automobilio dokumentus buhalterei",
          detail: `${(car.documents || []).length} dokumentai`,
          actionType: "accounting",
          icon: "📁",
          due: car.soldDateISO || "",
          late: false,
          base: queued ? 82 : 104,
          cta: "Buhalterija"
        })
      );
    });
  return items
    .filter(workCenterVisibleV30)
    .sort((a, b) => b.score - a.score || (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31"));
}
window.__autoEasierWorkCountV1 = () => workCenterItems().length;
