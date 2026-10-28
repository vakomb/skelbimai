// Finansai: operacijos, skolos, biudžetas, savikaina ir pelnas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

// v81: Buhalterijoje automobiliui priskirtos operacijos (source "accounting" + carId) keičia jo išlaidas ir savikainą:
// išlaida – didina, įplauka (pvz. grąžinimas už detalę) – mažina. Užduočių išlaidos (source "carTask") jau yra
// checklist'e, todėl antrą kartą neskaičiuojamos. Suvestinė sudaroma kartą per sinchroninį perpiešimą (ne kiekvienai
// kortelei iš naujo) ir išvaloma kitame mikrotaske – pakeitus operacijas, kitas render() mato naujas sumas.
let carAccountingNetCacheV81 = null;
function carAccountingNetV81(car) {
  if (!car || !car.id) return 0;
  const list = Array.isArray(state?.finances?.transactions) ? state.finances.transactions : [];
  const cache = carAccountingNetCacheV81;
  if (!cache || cache.list !== list || cache.length !== list.length) {
    const map = new Map();
    for (const tx of list) {
      if (!tx || tx.source !== "accounting" || !tx.carId) continue;
      const amount = Math.abs(Number(tx.amount) || 0);
      const signed = tx.type === "expense" ? amount : tx.type === "income" ? -amount : 0;
      if (signed) map.set(tx.carId, (map.get(tx.carId) || 0) + signed);
    }
    carAccountingNetCacheV81 = { map, list, length: list.length };
    Promise.resolve().then(() => (carAccountingNetCacheV81 = null));
  }
  return Math.round((carAccountingNetCacheV81.map.get(car.id) || 0) * 100) / 100;
}
function carChecklistExpenses(car) {
  const tasks = (car?.checklist || []).reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
  return Math.round((tasks + carAccountingNetV81(car)) * 100) / 100;
}
function carTotalCost(car) {
  return Number(car?.buyPrice || 0) + carChecklistExpenses(car);
}
function ensureFinanceCollections() {
  if (!state.finances) state.finances = defaultState().finances;
  state.finances.transactions = Array.isArray(state.finances.transactions) ? state.finances.transactions : [];
  state.finances.debts = Array.isArray(state.finances.debts) ? state.finances.debts : [];
  state.finances.debtLedger = Array.isArray(state.finances.debtLedger) ? state.finances.debtLedger : [];
  state.finances.budgetBalance = Number(state.finances.budgetBalance || 0);
}
function financeSignedAmount(entry) {
  const amount = Math.abs(Number(entry?.amount || 0));
  if (entry?.type === "income") return amount;
  if (entry?.type === "expense") return -amount;
  return Number(entry?.delta || 0);
}
function financeDebtSigned(entry) {
  const amount = Math.abs(Number(entry?.amount || 0));
  return entry?.action === "subtract" ? -amount : amount;
}
function financeDebtTotal(list = []) {
  return list.reduce((sum, entry) => sum + financeDebtSigned(entry), 0);
}
function financeTotals() {
  ensureMonthlyCycle();
  ensureFinanceCollections();
  const txNet = state.finances.transactions.reduce((sum, tx) => sum + financeSignedAmount(tx), 0);
  const manualNet = txNet;
  const soldCars = (state.cars || []).filter(c => c.status === "parduotas");
  const carPurchaseCost = (state.cars || []).reduce((sum, car) => sum + Number(car.buyPrice || 0), 0);
  const carRevenue = soldCars.reduce((sum, car) => sum + Number(car.soldPrice || 0), 0);
  const carNet = soldCars.reduce((sum, car) => sum + carNetProfit(car), 0);
  const debtBalance = state.finances.debts.reduce((sum, debt) => sum + financeDebtSigned(debt), 0);
  return {
    txNet,
    carPurchaseCost,
    carRevenue,
    carNet,
    debtBalance,
    budget: Number(state.finances.budgetBalance || 0),
    totalCurrent: Number(state.finances.budgetBalance || 0),
    manualNet
  };
}
function addFinanceTransaction(type, amount, title, note, date) {
  ensureFinanceCollections();
  const entry = {
    id: uid(),
    type,
    amount: Math.abs(Number(amount) || 0),
    title: title || (type === "income" ? "Pajamos" : "Išlaidos"),
    note: note || "",
    date: date || todayISO(),
    createdAt: nowLabel()
  };
  state.finances.transactions.unshift(entry);
  state.finances.budgetBalance += financeSignedAmount(entry);
  state.finances.budgetBalance = Number(state.finances.budgetBalance || 0);
  addHistory(
    "Finansai",
    `${entry.title}: ${financeSignedAmount(entry) >= 0 ? "+" : ""}${moneyFmt(entry.amount)}`,
    type === "income" ? "💰" : "💸"
  );
  saveState();
  render();
}
function addDebtAction(action, person, amount, note, date) {
  ensureFinanceCollections();
  const entry = {
    id: uid(),
    action,
    person: person || "Nežinoma",
    amount: Math.abs(Number(amount) || 0),
    note: note || "",
    date: date || todayISO(),
    createdAt: nowLabel()
  };
  state.finances.debtLedger.unshift(entry);
  state.finances.debts.unshift(entry);
  addHistory(
    "Skola",
    `${entry.person}: ${action === "subtract" ? "-" : "+"}${moneyFmt(entry.amount)}`,
    action === "subtract" ? "↘" : "↗"
  );
  saveState();
  render();
}
function aggregateDebts() {
  ensureFinanceCollections();
  const map = new Map();
  for (const entry of state.finances.debtLedger) {
    const key = String(entry.person || "Nežinoma").trim() || "Nežinoma";
    const current = map.get(key) || { person: key, total: 0, lastDate: "", notes: [], entries: [] };
    current.total += financeDebtSigned(entry);
    current.lastDate = current.lastDate && current.lastDate > entry.date ? current.lastDate : entry.date;
    current.notes.push(entry.note || "");
    current.entries.push(entry);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
function carNetProfit(car) {
  if (!car || car.status !== "parduotas") return 0;
  return Number(car.soldPrice || 0) - carTotalCost(car);
}
function carDoneCount(car) {
  return (car?.checklist || []).filter(i => i.done).length;
}
function carProgress(car) {
  const total = (car?.checklist || []).length || 1;
  return Math.round((carDoneCount(car) / total) * 100);
}
