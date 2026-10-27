// defaultState, loadState/saveState (localStorage), veiksmų istorija, mėnesio ciklas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const defaultState = () => ({
  theme: "light",
  sound: true,
  vibrate: true,
  security: { enabled: false, pinHash: "" },
  accounting: { email: "info@visureigiai.lt", queue: [], history: [] },
  selectedView: "garage",
  level: 1,
  xp: 0,
  coins: 0,
  streak: 0,
  maxStreak: 0,
  lastActiveDate: todayISO(),
  streakCountedFor: "",
  completedToday: {},
  dailyQuest: null,
  dailyQuestDate: "",
  dailyQuestClaimed: false,
  importantTasks: [],
  completionLog: [],
  finances: {
    monthKey: currentMonthKey(),
    monthlyNetProfit: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    lifetimeNetProfit: 0,
    budgetBalance: 0,
    transactions: [],
    debts: [],
    debtLedger: []
  },
  stats: defaultStats(),
  skills: JSON.parse(JSON.stringify(defaultSkills)),
  unlockedAchievements: {},
  worldsUnlocked: [],
  shopPurchases: [],
  cars: [],
  history: [],
  historyLog: [],
  garageTasks: [],
  customers: [],
  garageTaskLastReset: todayISO(),
  leadVariants: [],
  ui: {
    taskGroups: { Sveikata: false, Produktyvumas: false, Tobulėjimas: false },
    historyOpen: false,
    garageTaskGroups: { autos: false, custom: false },
    leadFilters: { query: "", due: "all", sort: "due" },
    menuSections: { shop: false, stats: false }
  }
});
let state = loadState();
state.selectedView = "garage";
state.ui = state.ui || {};
state.ui.aiChat = Array.isArray(state.ui.aiChat) ? state.ui.aiChat : [];
saveState();
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      finances: {
        ...base.finances,
        ...(parsed.finances || {}),
        transactions: Array.isArray(parsed.finances?.transactions) ? parsed.finances.transactions : [],
        debts: Array.isArray(parsed.finances?.debts) ? parsed.finances.debts : [],
        debtLedger: Array.isArray(parsed.finances?.debtLedger) ? parsed.finances.debtLedger : []
      },
      accounting: {
        ...base.accounting,
        ...(parsed.accounting || {}),
        queue: Array.isArray(parsed.accounting?.queue) ? parsed.accounting.queue : [],
        history: Array.isArray(parsed.accounting?.history) ? parsed.accounting.history : []
      },
      stats: { ...base.stats, ...(parsed.stats || {}) },
      skills:
        Array.isArray(parsed.skills) && parsed.skills.length
          ? parsed.skills
          : JSON.parse(JSON.stringify(defaultSkills)),
      unlockedAchievements: { ...(parsed.unlockedAchievements || {}) },
      worldsUnlocked: Array.isArray(parsed.worldsUnlocked) ? parsed.worldsUnlocked : [],
      shopPurchases: Array.isArray(parsed.shopPurchases) ? parsed.shopPurchases : [],
      cars: Array.isArray(parsed.cars) ? parsed.cars : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      historyLog: Array.isArray(parsed.historyLog) ? parsed.historyLog : [],
      completedToday: parsed.completedToday || {},
      importantTasks: Array.isArray(parsed.importantTasks) ? parsed.importantTasks : [],
      completionLog: Array.isArray(parsed.completionLog) ? parsed.completionLog : [],
      garageTasks: Array.isArray(parsed.garageTasks) ? parsed.garageTasks : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      garageTaskLastReset: parsed.garageTaskLastReset || todayISO(),
      leadVariants: Array.isArray(parsed.leadVariants) ? parsed.leadVariants : [],
      ui: {
        taskGroups: {
          Sveikata: false,
          Produktyvumas: false,
          Tobulėjimas: false,
          ...(parsed.ui?.taskGroups || {})
        },
        historyOpen: !!parsed.ui?.historyOpen,
        garageTaskGroups: { autos: false, custom: false, ...(parsed.ui?.garageTaskGroups || {}) },
        leadFilters: { query: "", due: "all", sort: "due", ...(parsed.ui?.leadFilters || {}) },
        menuSections: { shop: false, stats: false, ...(parsed.ui?.menuSections || {}) },
        soldCarsOpen: !!parsed.ui?.soldCarsOpen
      }
    };
  } catch (e) {
    console.warn("State load failed", e);
    return defaultState();
  }
}
function saveState() {
  try {
    ensurePermanentHistory();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("autoeasier:local-save"));
    return true;
  } catch (err) {
    console.warn("State save failed", err);
    try {
      const clean = JSON.parse(
        JSON.stringify(state, (key, value) => {
          if (typeof value === "string" && value.startsWith("data:image/")) return "";
          return value;
        })
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      window.dispatchEvent(new Event("autoeasier:local-save"));
      return true;
    } catch (err2) {
      console.warn("State emergency save failed", err2);
      return false;
    }
  }
}
function addHistory(title, desc, icon = "⚡", link = null) {
  const entry = {
    id: uid(),
    title: String(title || ""),
    desc: String(desc || ""),
    icon: String(icon || "⚡"),
    time: nowLabel(),
    date: todayISO(),
    link:
      link && typeof link === "object"
        ? {
            kind: String(link.kind || ""),
            id: String(link.id || ""),
            label: String(link.label || "Atidaryti")
          }
        : null
  };
  state.history.unshift(entry);
  state.history = state.history.slice(0, 12);
  if (!Array.isArray(state.historyLog)) state.historyLog = [];
  state.historyLog.unshift({ ...entry });
}
function ensurePermanentHistory() {
  if (!Array.isArray(state.historyLog)) state.historyLog = [];
  if (state.historyLog.length === 0 && Array.isArray(state.history) && state.history.length) {
    state.historyLog = state.history.map(h => ({
      id: h.id || uid(),
      title: h.title || "",
      desc: h.desc || "",
      icon: h.icon || "⚡",
      time: h.time || "",
      date: h.date || todayISO(),
      link: h.link || null
    }));
  }
  state.historyLog = state.historyLog.map(h => ({
    ...h,
    id: h.id || uid(),
    title: String(h.title || ""),
    desc: String(h.desc || ""),
    icon: String(h.icon || "⚡"),
    time: String(h.time || ""),
    date: h.date || todayISO(),
    link: h.link && typeof h.link === "object" ? h.link : null
  }));
}
function logTaskCompletion(label = "užduotis", kind = "task") {
  state.completionLog.unshift({ kind, label, date: todayISO(), time: nowLabel() });
  state.completionLog = state.completionLog.slice(0, 500);
}
function stateDailyTaskCount(s = state) {
  const today = todayISO();
  return (s.completionLog || []).filter(e => e.kind === "task" && e.date === today).length;
}
function stateWeeklyTaskCount(s = state) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffISO = toISODateLocal(cutoff);
  return (s.completionLog || []).filter(e => e.kind === "task" && e.date >= cutoffISO).length;
}
function ensureMonthlyCycle() {
  const mk = currentMonthKey();
  if (!state.finances) state.finances = defaultState().finances;
  if (state.finances.monthKey !== mk) {
    state.finances.monthKey = mk;
    state.finances.monthlyNetProfit = 0;
    state.finances.monthlyRevenue = 0;
    state.finances.monthlyExpenses = 0;
  }
}
