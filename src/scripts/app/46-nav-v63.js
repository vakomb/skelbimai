// Puslapių perjungimas be mirksėjimo (v63): paspaudus apačios juostos mygtuką, visas render() nebekviečiamas
// (jis perpiešdavo visus ekranus, nuotraukas ir net juostos ikonas). Visų ekranų turinys jau paruoštas
// paskutinio render() metu, todėl perjungiame tik aktyvų ekraną ir juostos būseną. Slinkimo vieta nekeičiama.
let navTargetV63 = "";
function navActiveViewV63(v) {
  if (v === "garage-what" || v === "garage-leads" || v === "garage-stats") return "garage";
  if (v === "settings" || v === "customers" || v === "finance") return "menu";
  return v;
}
function navSwitchV63() {
  const v = state.selectedView;
  const active = navActiveViewV63(v);
  document.querySelectorAll(".navBtn").forEach(btn => {
    const on = btn.dataset.view === active;
    if (btn.classList.contains("active") !== on) btn.classList.toggle("active", on);
    if (btn.dataset.view === v) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  const target = document.getElementById(`view-${v}`) || document.getElementById("view-garage");
  target.classList.add("active");
  document.querySelectorAll(".view.active").forEach(x => {
    if (x !== target) x.classList.remove("active");
  });
  const contacts = document.getElementById("view-customers");
  if (contacts?.classList.contains("garageInlinePanel")) {
    const open = v === "garage" && state.ui?.garageInlineExpanded === "contacts";
    if (contacts.classList.contains("garageInlineOpen") !== open)
      contacts.classList.toggle("garageInlineOpen", open);
  }
  saveState();
}
window.addEventListener(
  "click",
  e => {
    const btn = e.target.closest(".navBtn[data-view]");
    if (!btn) return;
    navTargetV63 = btn.dataset.view;
    setTimeout(() => (navTargetV63 = ""), 0);
  },
  true
);
const __renderNavV63 = render;
render = function () {
  if (navTargetV63 && state.selectedView === navTargetV63 && state.selectedView !== "home") {
    navTargetV63 = "";
    navSwitchV63();
    return Promise.resolve();
  }
  return __renderNavV63.apply(this, arguments);
};
