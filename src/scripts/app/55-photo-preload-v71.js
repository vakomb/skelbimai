// Nuotraukų pakrovimas iš anksto (v71): iškart po prisijungimo visos paskyros nuotraukos užpildo photoUrlCache,
// todėl Garažas, Vadybininkas, Buhalterija ir kortelės jas rodo be perėjimų tarp ekranų.
// Pirmiausia kraunami viršeliai (matomi sąraše), po to likusios; kraunama ribotu lygiagrečiu kiekiu.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).
const PRELOAD_RE_V71 = /^photo_[A-Za-z0-9_-]{4,}$/;
let preloadRunV71 = 0;
function preloadRefsV71() {
  const cover = [];
  const rest = [];
  const seen = new Set();
  const add = (list, ref) => {
    const k = String(ref || "");
    if (!PRELOAD_RE_V71.test(k) || seen.has(k) || photoUrlCache[k]) return;
    seen.add(k);
    list.push(k);
  };
  const cars = state.cars || [];
  const leads = state.leadVariants || [];
  cars.forEach(c => add(cover, c.imageSrc || (c.photos || [])[0]));
  leads.forEach(l => add(cover, (l.photos || []).filter(Boolean)[0] || l.imageSrc));
  cars.forEach(c => (c.photos || []).forEach(r => add(rest, r)));
  leads.forEach(l => (l.photos || []).forEach(r => add(rest, r)));
  // Visos kitos nuotraukų nuorodos (pvz., kiti dokumentai su nuotraukomis)
  const walk = (v, depth) => {
    if (typeof v === "string") return add(rest, v);
    if (!v || typeof v !== "object" || depth > 6) return;
    (Array.isArray(v) ? v : Object.values(v)).forEach(x => walk(x, depth + 1));
  };
  walk(state.accounting, 0);
  walk(state.customers, 0);
  return { cover, rest };
}
async function preloadPoolV71(refs, run, limit = 6) {
  let loaded = 0;
  let i = 0;
  const worker = async () => {
    while (i < refs.length && run === preloadRunV71) {
      const ref = refs[i++];
      try {
        if (await photoGet(ref)) loaded++;
      } catch (e) {}
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, refs.length) }, worker));
  return loaded;
}
function preloadSafeRenderV71() {
  const busy =
    document.getElementById("modalBackdrop")?.classList.contains("show") ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
  if (busy) return;
  try {
    render();
  } catch (e) {}
}
// covers: tik viršeliai (laukiama prieš rodant programėlę); visa: viršeliai + likusios fone
async function preloadPhotosV71({ coversOnly = false } = {}) {
  const run = ++preloadRunV71;
  const { cover, rest } = preloadRefsV71();
  if (!cover.length && !rest.length) return 0;
  const n1 = await preloadPoolV71(cover, run);
  if (n1) preloadSafeRenderV71();
  if (coversOnly) {
    // likusios – fone, nelaukiant
    if (run === preloadRunV71 && rest.length)
      setTimeout(() => {
        if (run === preloadRunV71) preloadPoolV71(rest, run).then(n => n && preloadSafeRenderV71());
      }, 0);
    return n1;
  }
  const n2 = await preloadPoolV71(rest, run);
  if (n2) preloadSafeRenderV71();
  return n1 + n2;
}
window.AUTOEASIER_APP_DATA.preloadPhotos = preloadPhotosV71;
// Naujos nuotraukos iš kito įrenginio / vietinių pakeitimų – užkraunamos fone (tik trūkstamos)
let preloadTimerV71 = 0;
function preloadSoonV71() {
  clearTimeout(preloadTimerV71);
  preloadTimerV71 = setTimeout(() => {
    if (document.getElementById("autoEasierLogin")?.hidden === false) return;
    preloadPhotosV71();
  }, 600);
}
window.addEventListener("autoeasier:local-save", preloadSoonV71);
window.addEventListener("autoeasier:account-ready", preloadSoonV71);
