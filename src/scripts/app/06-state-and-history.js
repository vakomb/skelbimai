// defaultState, loadState/saveState (localStorage), veiksmų istorija, mėnesio ciklas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const defaultState = () => ({
  theme: "light",
  sound: true,
  vibrate: true,
  security: { enabled: false, pinHash: "" },
  accounting: { email: "", queue: [], history: [] },
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
// v75: nuotraukų nuorodos į puslapį įterpiamos kaip <img src>; priimamos tik saugios formos (užkerta HTML įterpimą
// per pažeistą atsarginę kopiją ar debesies duomenis).
const SAFE_MEDIA_REF =
  /^(?:(?:photo|doc)_[A-Za-z0-9_-]{1,80}|blob:[^\s"'<>]{1,300}|https:\/\/[^\s"'<>]{1,500}|data:(?:image\/[a-z0-9.+-]{1,20}|application\/pdf);base64,[A-Za-z0-9+\/=]*)$/;
// v78: sąrašai sutvarkomi, kad vienas sugadintas įrašas (null, ne objektas, ne masyvas) nesugriautų
// viso ekrano. Galiojantys duomenys nekeičiami: pašalinami tik null / ne objektai, netinkami vidiniai
// sąrašai paverčiami tuščiais, automobiliui ar variantui be id suteikiamas naujas id.
const isRecordV78 = v => !!v && typeof v === "object" && !Array.isArray(v);
const recordListV78 = v => (Array.isArray(v) ? v.filter(isRecordV78) : []);
function normalizeStateV78(s) {
  if (!isRecordV78(s)) return s;
  ["cars", "customers", "leadVariants", "garageTasks", "history", "historyLog"].forEach(k => {
    if (k in s) s[k] = recordListV78(s[k]);
  });
  // Elementų tipas nežinomas – paliekama viskas, išskyrus tuščias reikšmes
  if ("importantTasks" in s)
    s.importantTasks = Array.isArray(s.importantTasks) ? s.importantTasks.filter(x => x != null) : [];
  let seq = 0;
  const ensureId = (o, prefix) => {
    if (o.id === undefined || o.id === null || o.id === "")
      o.id = `${prefix}-${Date.now().toString(36)}-${++seq}`;
    else if (typeof o.id !== "string") o.id = String(o.id);
  };
  (s.cars || []).forEach(car => {
    ensureId(car, "car");
    if ("checklist" in car) car.checklist = recordListV78(car.checklist);
    if ("documents" in car) car.documents = recordListV78(car.documents);
    if ("photos" in car)
      car.photos = Array.isArray(car.photos) ? car.photos.filter(x => typeof x === "string") : [];
  });
  (s.leadVariants || []).forEach(lead => {
    ensureId(lead, "lead");
    if ("photos" in lead)
      lead.photos = Array.isArray(lead.photos) ? lead.photos.filter(x => typeof x === "string") : [];
  });
  if (isRecordV78(s.finances)) {
    ["transactions", "debts", "debtLedger"].forEach(k => {
      if (k in s.finances) s.finances[k] = recordListV78(s.finances[k]);
    });
    s.finances.transactions?.forEach(tx => {
      if ("attachments" in tx && !Array.isArray(tx.attachments)) tx.attachments = [];
    });
  }
  if (isRecordV78(s.accounting)) {
    // Eilė – automobilių id (tekstas), istorija – įrašai (objektai)
    if ("queue" in s.accounting)
      s.accounting.queue = Array.isArray(s.accounting.queue)
        ? s.accounting.queue
            .filter(id => (typeof id === "string" && id) || typeof id === "number")
            .map(String)
        : [];
    if ("history" in s.accounting) s.accounting.history = recordListV78(s.accounting.history);
  }
  if ("contactBook" in s) {
    if (!isRecordV78(s.contactBook)) s.contactBook = { groups: [], contacts: [] };
    else {
      s.contactBook.groups = recordListV78(s.contactBook.groups);
      s.contactBook.contacts = recordListV78(s.contactBook.contacts);
    }
  }
  return s;
}
function sanitizeMediaRefs(s) {
  normalizeStateV78(s);
  const clean = v => (typeof v === "string" && v && !SAFE_MEDIA_REF.test(v) ? "" : v);
  const fix = o => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o.photos)) o.photos = o.photos.map(clean).filter(Boolean);
    if (typeof o.imageSrc === "string") o.imageSrc = clean(o.imageSrc);
  };
  (s.cars || []).forEach(fix);
  (s.leadVariants || []).forEach(fix);
  (s.customers || []).forEach(fix);
  return s;
}
let state = sanitizeMediaRefs(loadState());
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
    // v78: sugadinta vietinė kopija neperrašoma be pėdsako – pirmiausia išsaugoma atskirai
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && !localStorage.getItem(STORAGE_KEY + ":corrupt"))
        localStorage.setItem(STORAGE_KEY + ":corrupt", raw);
    } catch (err) {}
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
      // v78: telefono atmintis pilna – pakeitimai vis tiek siunčiami į debesį (sinchronizacija ima būseną
      // iš atminties), o vartotojas vieną kartą įspėjamas
      try {
        window.dispatchEvent(new Event("autoeasier:local-save"));
      } catch (err3) {}
      if (!window.__aeStorageWarnedV78) {
        window.__aeStorageWarnedV78 = true;
        try {
          toast("Telefono atmintis pilna – duomenys saugomi debesyje. Atlaisvinkite vietos naršyklėje.", "!");
        } catch (err4) {}
      }
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
