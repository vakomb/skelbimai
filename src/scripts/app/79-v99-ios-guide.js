// v99: iPhone / iPad įdiegimo gidas. v99b: rodyklė – apačioje dešinėje (Safari „⋯“), žingsniai ⋯ → Bendrinti → Įtraukti. Apple neleidžia puslapiui pačiam pridėti ikonos ar atidaryti „Bendrinti“ meniu,
// todėl parodome tiksliai kur spausti: animuota rodyklė į Safari „Bendrinti“ mygtuką (iPhone – apačioje per vidurį,
// iPad ir Chrome – viršuje dešinėje) ir animuotas „Bendrinti“ meniu pavyzdys, kuris pats nuslenka žemyn iki
// „Įtraukti į pradžios ekraną“ ir parodo „Pridėti“. Kitose platformose – v98 instrukcija.
// Stilius – styles/204-v99-ios-guide.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function iosGuideCloseV99() {
  const el = document.getElementById("aeIosV99");
  if (!el || el.hidden) return;
  el.classList.remove("show");
  setTimeout(() => (el.hidden = true), 280);
}
function iosGuideOpenV99() {
  const pf = instPlatformV98();
  const ua = navigator.userAgent || "";
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const top = iPad || pf === "ios-other"; // iPad Safari ir Chrome iPhone – „Bendrinti“ viršuje dešinėje
  let el = document.getElementById("aeIosV99");
  if (!el) {
    const rows = [
      "Kopijuoti",
      "Įtraukti į skaitinių sąrašą",
      "Pridėti žymę",
      "Pridėti prie mėgstamiausių",
      "Rasti puslapyje",
      "Įtraukti į pradžios ekraną",
      "Žymėti",
      "Spausdinti"
    ];
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="aeIosV99" id="aeIosV99" role="dialog" aria-modal="true" aria-label="Kaip įdiegti AutoEasier" hidden>
        <div class="aeIosBackV99" data-ios-close></div>
        <div class="aeIosCardV99">
          <button class="aeInstXV98" type="button" data-ios-close aria-label="Uždaryti">${INST_ICON_V98.x}</button>
          <h2>Įdiekite AutoEasier</h2>
          <p>Keli paspaudimai – ir AutoEasier bus pradžios ekrane kaip programėlė.</p>
          <div class="aeIosDemoV99" aria-hidden="true">
            <div class="aeIosPhoneV99">
              <div class="aeIosSheetV99">
                <div class="aeIosSheetHeadV99"><img src="@@datauri:assets/icon/icon-180.png@@" alt=""><span><b>AutoEasier</b><small>autoeasier.lt</small></span></div>
                <div class="aeIosListWrapV99"><div class="aeIosListV99">${rows
                  .map(
                    r =>
                      `<div class="aeIosRowV99${r === "Įtraukti į pradžios ekraną" ? " target" : ""}"><span>${r}</span><i>${r === "Įtraukti į pradžios ekraną" ? INST_ICON_V98.addHome : ""}</i></div>`
                  )
                  .join("")}</div></div>
              </div>
              <div class="aeIosConfirmV99"><span>Atšaukti</span><b>Įtraukti</b><img src="@@datauri:assets/icon/icon-180.png@@" alt=""><em>AutoEasier</em></div>
              <span class="aeIosTapV99"></span>
            </div>
          </div>
          <ol class="aeIosStepsV99">
            <li><span class="aeInstIcoV98"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/></svg></span><span>Apačioje dešinėje spauskite <b>⋯</b></span></li>
            <li><span class="aeInstIcoV98">${INST_ICON_V98.share}</span><span>Pasirinkite <b>Bendrinti</b></span></li>
            <li><span class="aeInstIcoV98">${INST_ICON_V98.addHome}</span><span>Slinkite žemyn ir spauskite <b>Įtraukti į pradžios ekraną</b>, tada <b>Įtraukti</b></span></li>
          </ol>
        </div>
        <div class="aeIosArrowV99"><span class="aeIosPillV99">Spauskite čia</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M6 13l6 6 6-6"/></svg></div>
      </div>`
    );
    el = document.getElementById("aeIosV99");
    el.addEventListener("click", e => {
      if (e.target.closest("[data-ios-close]")) iosGuideCloseV99();
    });
    document.addEventListener("keydown", e => e.key === "Escape" && iosGuideCloseV99());
  }
  el.classList.toggle("top", top);
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}
// Perimame „Įdiegti programėlę“ paspaudimą iPhone / iPad (kitur – kaip v98)
document.addEventListener(
  "click",
  e => {
    if (!e.target.closest("#aeInstallBtnV98")) return;
    const pf = instPlatformV98();
    if (pf !== "ios" && pf !== "ios-other") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    iosGuideOpenV99();
  },
  true
);
window.AutoEasierIosGuide = { open: iosGuideOpenV99, close: iosGuideCloseV99 };
