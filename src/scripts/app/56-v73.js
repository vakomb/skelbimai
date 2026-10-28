// v73: paleidimas į Garažą, kortelė visada atsidaro nuo viršaus.
// Kortelė visada atsidaro nuo viršaus
const __openCarV73 = openCar;
openCar = function () {
  const sheet = document.getElementById("sheet");
  const back = document.getElementById("modalBackdrop");
  const r = __openCarV73.apply(this, arguments);
  [sheet, back].forEach(el => el && (el.scrollTop = 0));
  requestAnimationFrame(() => [sheet, back].forEach(el => el && el.scrollTo({ top: 0, behavior: "smooth" })));
  return r;
};

// Grįžus į programą po pertraukos – visada Garažas
let mgHiddenAtV73 = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    mgHiddenAtV73 = Date.now();
    return;
  }
  if (!mgHiddenAtV73 || Date.now() - mgHiddenAtV73 < 20000) return;
  mgHiddenAtV73 = 0;
  if (document.getElementById("modalBackdrop")?.classList.contains("show")) closeSheet();
  if (state.selectedView !== "garage") {
    state.selectedView = "garage";
    render();
  }
  window.scrollTo({ top: 0 });
});

// Vadybininkas visada nupiešiamas, net jei kuris nors ankstesnis piešimo žingsnis nulūžtų
// (anksčiau tuomet matydavosi tuščias puslapis, nors ant mygtuko rodomas užduočių skaičius).
const __renderGuardV73 = render;
render = async function () {
  let r;
  try {
    r = await __renderGuardV73.apply(this, arguments);
  } catch (e) {
    window.__aeLastRenderErrorV73 = e;
    console.error("render", e);
  }
  if (state.selectedView === "garage-what") {
    try {
      const root = document.getElementById("garageWhatRoot");
      if (root && !root.querySelector(".garageWhatPage")) renderGarageWhatApp();
    } catch (e) {
      window.__aeLastRenderErrorV73 = e;
      console.error("manager", e);
      const root = document.getElementById("garageWhatRoot");
      if (root)
        root.innerHTML = `<div class="garageWhatPage"><div class="garageWhatHead"><div class="garageWhatHeadTitle"><h2>Vadybininkas</h2></div><button class="garageWhatBack" type="button" data-garage-what-back>Atgal</button></div><div class="garageWhatEmpty"><strong>Nepavyko įkelti</strong><span>${escapeHTML(String(e?.message || e).slice(0, 120))}</span></div></div>`;
    }
  }
  return r;
};

// Patikra: jei užduotys yra, bet ekrane nematomos (pvz., paslėptos stiliaus), parodomas paprastas atsarginis sąrašas.
function mgVerifyV73() {
  const check = () => {
    try {
      if (state.selectedView !== "garage-what") return;
      const root = document.getElementById("garageWhatRoot");
      if (!root) return;
      const items = workCenterItems();
      root.querySelector(".mgFallbackV73")?.remove();
      const visible = [...root.querySelectorAll("[data-what-open]")].some(e => e.offsetHeight > 0);
      if (!items.length || visible) return;
      const page = root.querySelector(".garageWhatPage") || root;
      const wrap = document.createElement("div");
      wrap.className = "mgFallbackV73";
      wrap.style.cssText = "display:block;margin:12px 0;padding:0;opacity:1;visibility:visible;";
      wrap.innerHTML = items
        .slice(0, 20)
        .map(
          it =>
            `<button type="button" data-what-open="${escapeHTML(it.key)}" style="display:block;width:100%;margin:0 0 8px;padding:14px;border:1px solid #dfe5ee;border-radius:16px;background:#fff;text-align:left;opacity:1;visibility:visible;height:auto;position:static"><span style="display:block;font-size:13px;color:#667085">${escapeHTML(it.entity || "")}</span><strong style="display:block;font-size:16px;color:#0f1f3a">${escapeHTML(it.action || "")}</strong></button>`
        )
        .join("");
      page.append(wrap);
    } catch (e) {}
  };
  requestAnimationFrame(() => requestAnimationFrame(check));
  setTimeout(check, 400);
}
const __renderVerifyV73 = render;
render = async function () {
  const r = await __renderVerifyV73.apply(this, arguments);
  if (state.selectedView === "garage-what") mgVerifyV73();
  return r;
};
