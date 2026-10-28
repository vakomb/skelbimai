// Konstantos, datų/pinigų pagalbinės funkcijos (todayISO, moneyFmt, uid, escapeHTML, taskDueInfo).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const LEGACY_STORAGE_KEY = "visureigiai_uab_v1";
let STORAGE_KEY = LEGACY_STORAGE_KEY;
const todayISO = () => toISODateLocal(new Date());
const currentMonthKey = () => todayISO().slice(0, 7);
const nowLabel = () =>
  new Date().toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
const escapeHTML = (str = "") =>
  String(str).replace(
    /[&<>"']/g,
    s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[s]
  );
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
// v75: centai rodomi, kai suma nėra sveikas skaičius (anksčiau 4500,55 € buvo rodoma kaip 4 501 €)
// v78: formatuotojai sukuriami vieną kartą (Intl.NumberFormat kūrimas kiekvienai sumai lėtino didelius sąrašus)
const MONEY_FMT_V78 = [
  new Intl.NumberFormat("lt-LT", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  new Intl.NumberFormat("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
];
const moneyFmt = n => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `${MONEY_FMT_V78[Number.isInteger(v) ? 0 : 1].format(v)} €`;
};
const defaultSkills = [];
const defaultStats = () => ({ tasksCompleted: 0, carsSold: 0 });
function parseISODateLocal(iso) {
  if (!iso) return null;
  const parts = String(iso).split("-").map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}
function toISODateLocal(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
function taskDueInfo(iso) {
  if (!iso) return { label: "Be datos", cls: "" };
  const today = todayISO(),
    tomorrow = addDaysISO(today, 1);
  if (iso < today) return { label: `Vėlavo ${Math.abs(daysBetweenISO(iso, today))} d.`, cls: "overdue" };
  if (iso === today) return { label: "Šiandien", cls: "today" };
  if (iso === tomorrow) return { label: "Rytoj", cls: "tomorrow" };
  const d = parseISODateLocal(iso);
  return {
    label: d ? d.toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" }) : iso,
    cls: "future"
  };
}
function taskDueMarkup(iso) {
  if (!iso) return '<span class="dueChip">Be datos</span>';
  const x = taskDueInfo(iso);
  return `<span class="dueChip ${x.cls}">📅 ${escapeHTML(x.label)}</span>`;
}
function addDaysISO(baseISO, days) {
  const base = parseISODateLocal(baseISO || todayISO()) || new Date();
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + Number(days || 0));
  return toISODateLocal(d);
}
function daysBetweenISO(fromISO, toISO) {
  const from = parseISODateLocal(fromISO);
  const to = parseISODateLocal(toISO);
  if (!from || !to) return 0;
  return Math.round((to - from) / 864e5);
}
function garageLeadDaysLeft(lead) {
  return daysBetweenISO(todayISO(), lead?.nextCallDate || todayISO());
}
function garageLeadDaysText(lead) {
  const days = garageLeadDaysLeft(lead);
  if (days < 0) return `${Math.abs(days)} d. vėluoja`;
  if (days === 0) return "Skambinti šiandien";
  if (days === 1) return "1 diena liko";
  return `${days} d. liko`;
}
function garageLeadDueFilterMatch(lead, filter) {
  const days = garageLeadDaysLeft(lead);
  if (filter === "all") return true;
  if (filter === "overdue") return days < 0;
  return days === Number(filter);
}
function garageTaskStatsList() {
  const today = todayISO();
  const weekCutoff = new Date();
  weekCutoff.setDate(weekCutoff.getDate() - 6);
  const weekISO = toISODateLocal(weekCutoff);
  const monthKey = currentMonthKey();
  const carTasksToday = (state.completionLog || []).filter(
    e => e.kind === "garageCarTask" && e.date === today
  ).length;
  const customTasksToday = (state.completionLog || []).filter(
    e => e.kind === "garageCustomTask" && e.date === today
  ).length;
  const carTasksWeek = (state.completionLog || []).filter(
    e => e.kind === "garageCarTask" && e.date >= weekISO
  ).length;
  const customTasksWeek = (state.completionLog || []).filter(
    e => e.kind === "garageCustomTask" && e.date >= weekISO
  ).length;
  const carTasksMonth = (state.completionLog || []).filter(
    e => e.kind === "garageCarTask" && e.date.startsWith(monthKey)
  ).length;
  const customTasksMonth = (state.completionLog || []).filter(
    e => e.kind === "garageCustomTask" && e.date.startsWith(monthKey)
  ).length;
  const soldToday = (state.cars || []).filter(
    c => c.status === "parduotas" && (c.soldDateISO || "").slice(0, 10) === today
  );
  const soldWeek = (state.cars || []).filter(
    c => c.status === "parduotas" && (c.soldDateISO || "") >= weekISO
  );
  const soldMonth = (state.cars || []).filter(
    c => c.status === "parduotas" && (c.soldDateISO || "").slice(0, 7) === monthKey
  );
  const boughtToday = (state.cars || []).filter(c => (c.createdDateISO || "").slice(0, 10) === today).length;
  const boughtWeek = (state.cars || []).filter(c => (c.createdDateISO || "") >= weekISO).length;
  const boughtMonth = (state.cars || []).filter(
    c => (c.createdDateISO || "").slice(0, 7) === monthKey
  ).length;
  const dayRevenue = soldToday.reduce((sum, c) => sum + Number(c.soldPrice || 0), 0);
  const weekRevenue = soldWeek.reduce((sum, c) => sum + Number(c.soldPrice || 0), 0);
  const monthRevenue = soldMonth.reduce((sum, c) => sum + Number(c.soldPrice || 0), 0);
  const dayProfit = soldToday.reduce((sum, c) => sum + Number(c.netProfit || 0), 0);
  const weekProfit = soldWeek.reduce((sum, c) => sum + Number(c.netProfit || 0), 0);
  const monthProfit = soldMonth.reduce((sum, c) => sum + Number(c.netProfit || 0), 0);
  return [
    {
      label: "Diena",
      value: `${moneyFmt(dayRevenue)} / ${moneyFmt(dayProfit)}`,
      hint: `Pardavimai / pardavimo marža • Pirkta ${boughtToday} • Užduočių ${carTasksToday + customTasksToday}`
    },
    {
      label: "Savaitė",
      value: `${moneyFmt(weekRevenue)} / ${moneyFmt(weekProfit)}`,
      hint: `Pirkta ${boughtWeek} • Parduota ${soldWeek.length} • Užduočių ${carTasksWeek + customTasksWeek}`
    },
    {
      label: "Mėnuo",
      value: `${moneyFmt(monthProfit)}`,
      hint: `Pardavimai ${moneyFmt(monthRevenue)} • Pirkta ${boughtMonth} • Užduočių ${carTasksMonth + customTasksMonth}`
    }
  ];
}
