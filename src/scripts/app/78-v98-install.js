// v98: „Įdiegti programėlę“ prisijungimo ekrane. AutoEasier įdiegiama kaip programėlė (PWA): atsidaro visu ekranu,
// su ikona pradžios ekrane / darbalaukyje. Chrome, Edge, Android, Samsung – sisteminis įdiegimo langas
// (beforeinstallprompt); iPhone / iPad (Safari, Chrome), Mac Safari, Firefox – trumpa instrukcija su ikonomis.
// Jau įdiegtoje programėlėje mygtukas nerodomas. Failai: /manifest.webmanifest, /sw.js, /icon-*.png (šaknyje).
// Stilius – styles/203-v98-install.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const INST_V98 = { prompt: null };
const INST_ICON_V98 = {
  share:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.5V3.8M8.3 7.3 12 3.6l3.7 3.7"/><path d="M8.5 10.5H7a2 2 0 0 0-2 2v6.3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.3a2 2 0 0 0-2-2h-1.5"/></svg>',
  addHome:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5.5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18.5" r="1.8"/></svg>',
  install:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="12.5" rx="2.5"/><path d="M12 7.8v5.4M9.6 11 12 13.4l2.4-2.4M8.5 20h7"/></svg>',
  dock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="15" width="18" height="5" rx="2"/><rect x="9" y="4" width="6" height="6" rx="1.6"/><path d="M12 10v3"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>'
};
function instStandaloneV98() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    matchMedia("(display-mode: fullscreen)").matches ||
    navigator.standalone === true
  );
}
function instPlatformV98() {
  const ua = navigator.userAgent || "";
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || iPadOS;
  if (ios) return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-other" : "ios";
  if (/Android/.test(ua)) return /Firefox/.test(ua) ? "android-firefox" : "android";
  if (/Firefox/.test(ua)) return "firefox";
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return "mac-safari";
  return "desktop";
}
function instStepsV98(pf) {
  const i = INST_ICON_V98;
  if (pf === "ios")
    return [
      [i.share, "Apačioje spauskite <b>Bendrinti</b>"],
      [i.addHome, "Pasirinkite <b>Į pradžios ekraną</b>"],
      [i.check, "Spauskite <b>Pridėti</b> – ikona atsiras pradžios ekrane"]
    ];
  if (pf === "ios-other")
    return [
      [i.share, "Adreso juostoje spauskite <b>Bendrinti</b>"],
      [i.addHome, "Pasirinkite <b>Į pradžios ekraną</b>"],
      [i.check, "Spauskite <b>Pridėti</b>"]
    ];
  if (pf === "android" || pf === "android-firefox")
    return [
      [i.dots, "Atidarykite naršyklės meniu <b>⋮</b>"],
      [i.addHome, "Pasirinkite <b>Įdiegti programą</b> arba <b>Pridėti prie pradžios ekrano</b>"],
      [i.check, "Patvirtinkite – AutoEasier atsiras tarp programėlių"]
    ];
  if (pf === "mac-safari")
    return [
      [i.dock, "Meniu juostoje pasirinkite <b>Failas → Pridėti prie Dock</b>"],
      [i.check, "Spauskite <b>Pridėti</b> – AutoEasier atsiras Dock juostoje"]
    ];
  if (pf === "firefox")
    return [
      [
        i.install,
        "Firefox kompiuteryje programėlių nediegia – atidarykite AutoEasier per <b>Chrome</b>, <b>Edge</b> arba <b>Safari</b>"
      ]
    ];
  return [
    [i.install, "Adreso juostoje spauskite <b>Įdiegti</b> ikoną"],
    [i.dots, "arba meniu <b>⋮</b> → <b>Įdiegti AutoEasier</b>"],
    [i.check, "AutoEasier atsidarys atskirame lange ir atsiras darbalaukyje"]
  ];
}
function instSheetV98() {
  let el = document.getElementById("aeInstV98");
  if (el) return el;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="aeInstV98" id="aeInstV98" role="dialog" aria-modal="true" aria-labelledby="aeInstTitleV98" hidden>
      <div class="aeInstBackV98" data-inst-close></div>
      <div class="aeInstCardV98">
        <button class="aeInstXV98" type="button" data-inst-close aria-label="Uždaryti">${INST_ICON_V98.x}</button>
        <img class="aeInstIconV98" src="@@datauri:assets/icon/icon-180.png@@" alt="" width="72" height="72">
        <h2 id="aeInstTitleV98">Įdiekite AutoEasier</h2>
        <p>Atsidarys kaip programėlė – visu ekranu, be naršyklės juostų, su ikona pradžios ekrane.</p>
        <ol class="aeInstStepsV98"></ol>
        <button class="aeInstOkV98" type="button" data-inst-close>Supratau</button>
      </div>
    </div>`
  );
  el = document.getElementById("aeInstV98");
  el.addEventListener("click", e => {
    if (e.target.closest("[data-inst-close]")) instCloseV98();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !el.hidden) instCloseV98();
  });
  return el;
}
function instOpenV98() {
  const el = instSheetV98();
  el.querySelector(".aeInstStepsV98").innerHTML = instStepsV98(instPlatformV98())
    .map(
      ([ico, t], k) =>
        `<li><span class="aeInstNumV98">${k + 1}</span><span class="aeInstIcoV98">${ico}</span><span>${t}</span></li>`
    )
    .join("");
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => el.querySelector(".aeInstOkV98")?.focus({ preventScroll: true }), 260);
}
function instCloseV98() {
  const el = document.getElementById("aeInstV98");
  if (!el || el.hidden) return;
  el.classList.remove("show");
  setTimeout(() => (el.hidden = true), 260);
  document.getElementById("aeInstallBtnV98")?.focus({ preventScroll: true });
}
function instSyncV98() {
  const btn = document.getElementById("aeInstallBtnV98");
  if (!btn) return;
  btn.hidden = instStandaloneV98();
}
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  INST_V98.prompt = e;
  instSyncV98();
});
window.addEventListener("appinstalled", () => {
  INST_V98.prompt = null;
  const btn = document.getElementById("aeInstallBtnV98");
  if (btn) btn.hidden = true;
  instCloseV98();
  try {
    toast("AutoEasier įdiegta", "✓");
  } catch (e) {}
});
document.addEventListener("click", async e => {
  if (!e.target.closest("#aeInstallBtnV98")) return;
  e.preventDefault();
  const p = INST_V98.prompt;
  if (p) {
    INST_V98.prompt = null;
    try {
      await p.prompt();
      await p.userChoice;
    } catch (err) {
      instOpenV98();
    }
    return;
  }
  instOpenV98();
});
(() => {
  instSyncV98();
  if ("serviceWorker" in navigator && location.protocol === "https:")
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
})();
window.AutoEasierInstall = { open: instOpenV98, platform: instPlatformV98 };
