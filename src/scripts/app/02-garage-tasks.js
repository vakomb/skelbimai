// Garažo (asmeninės) užduotys: pridėti / atlikti / ištrinti, variantų formos reikšmės.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function completeGarageTask(taskId) {
  const task = state.garageTasks.find(t => t.id === taskId);
  if (!task || task.done) return;
  task.done = true;
  task.doneDate = todayISO();
  task.completedAt = nowLabel();
  state.stats.tasksCompleted += 1;
  logTaskCompletion(task.title, "garageCustomTask");
  addHistory("Užduotis atlikta", task.title, "✓");
  saveState();
  render();
  toast("Užduotis atlikta", "✓");
}
function addGarageTask(title, xp, coins, dueDate = "", priority = "normal", category = "Bendra", notes = "") {
  const task = {
    id: uid(),
    title: String(title || "").trim(),
    xp: Math.max(0, Number(xp) || 0),
    coins: Math.max(0, Number(coins) || 0),
    dueDate: String(dueDate || ""),
    priority: ["urgent", "important", "normal"].includes(priority) ? priority : "normal",
    category: String(category || "Bendra").trim() || "Bendra",
    notes: String(notes || "").trim(),
    done: false,
    doneDate: "",
    createdAt: nowLabel(),
    completedAt: null
  };
  if (!task.title) return false;
  state.garageTasks.unshift(task);
  addHistory("Užduotis", `Pridėta: ${task.title}`, "➕");
  toast("Užduotis pridėta", "➕");
  saveState();
  render();
  return true;
}
document.querySelectorAll("[data-open-history]").forEach(
  btn =>
    (btn.onclick = () => {
      const el = document.getElementById("menu-history");
      if (!el) return;
      const open = !el.classList.contains("open");
      el.classList.toggle("open", open);
      if (open) el.scrollIntoView({ behavior: "smooth", block: "start" });
    })
);
document.querySelectorAll("[data-open-personal-tasks]").forEach(
  btn =>
    (btn.onclick = () => {
      const el = document.getElementById("menu-personal-tasks");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    })
);
function deleteGarageTask(taskId) {
  const task = state.garageTasks.find(t => t.id === taskId);
  if (!task) return;
  const ok = window.confirm(`Ištrinti garažo užduotį „${task.title}“?`);
  if (!ok) return;
  state.garageTasks = state.garageTasks.filter(t => t.id !== taskId);
  addHistory("Garažo užduotis", `Ištrinta: ${task.title}`, "🗑️");
  toast("Garažo užduotis ištrinta", "🗑️");
  saveState();
  render();
}
function garageLeadFromFormValues() {
  const make = document.getElementById("leadMake")?.value.trim();
  const model = document.getElementById("leadModel")?.value.trim();
  const year = Number(document.getElementById("leadYear")?.value || 0);
  const fuel = document.getElementById("leadFuel")?.value.trim();
  const phone = document.getElementById("leadPhone")?.value.trim();
  const city = document.getElementById("leadCity")?.value.trim();
  const initialPrice = Number(document.getElementById("leadInitialPrice")?.value || 0);
  const targetPrice = Number(document.getElementById("leadTargetPrice")?.value || 0);
  const expectedSalePrice = Number(document.getElementById("leadExpectedSalePrice")?.value || 0);
  const followDays = Math.max(0, Number(document.getElementById("leadFollowDays")?.value || 0));
  const taStatus = document.getElementById("leadTaStatus")?.value || "unknown";
  const taUntil = document.getElementById("leadTaUntil")?.value || "";
  const insuranceStatus = document.getElementById("leadInsuranceStatus")?.value || "unknown";
  const insuranceUntil = document.getElementById("leadInsuranceUntil")?.value || "";
  const notes = document.getElementById("leadNotes")?.value.trim();
  const files = Array.from(document.getElementById("leadPhotos")?.files || []);
  if (taStatus === "valid" && !taUntil) throw new Error("Nurodyk, iki kada galioja TA.");
  if (insuranceStatus === "valid" && !insuranceUntil) throw new Error("Nurodyk, iki kada galioja draudimas.");
  return {
    make,
    model,
    year,
    fuel,
    phone,
    city,
    initialPrice,
    targetPrice,
    expectedSalePrice,
    followDays,
    taStatus,
    taUntil,
    insuranceStatus,
    insuranceUntil,
    notes,
    files
  };
}
