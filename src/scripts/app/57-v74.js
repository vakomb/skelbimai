// v74: Vadybininko stabilumas. Langai nenutraukiami fone, užduotys atidaromos iš apačios išslenkančiuose languose,
// nuotraukos užpildomos po piešimo, „Kita užduotis“ nuveda į užduočių skydelį, piešimas apsaugotas nuo klaidų.
function uiBusyV74() {
  return (
    !!document.getElementById("modalBackdrop")?.classList.contains("show") ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")
  );
}

// Lango uždarymas: vienas įvykis, kad debesies atnaujinimai galėtų tęstis (155-…supabase-auth)
const __closeSheetV74 = closeSheet;
let closingSheetV74 = false;
closeSheet = function () {
  if (closingSheetV74) return;
  closingSheetV74 = true;
  const wasOpen = !!document.getElementById("modalBackdrop")?.classList.contains("show");
  try {
    return __closeSheetV74.apply(this, arguments);
  } finally {
    closingSheetV74 = false;
    if (wasOpen) window.dispatchEvent(new Event("autoeasier:sheet-closed"));
  }
};

// Pasibaigę atidėjimai valomi tik saugant (ne skaitant) ir ne „tik peržiūros“ režimu
const __saveStateV74 = saveState;
saveState = function () {
  if (!window.AUTOEASIER_APP_DATA?.isReadOnly?.()) workCenterPruneV74();
  return __saveStateV74.apply(this, arguments);
};

// Nuotraukos Vadybininke: tuščios vietos užpildomos, kai nuotrauka gauta (photoGet)
const __renderGarageWhatV74 = renderGarageWhatApp;
renderGarageWhatApp = function () {
  const r = __renderGarageWhatV74.apply(this, arguments);
  document.querySelectorAll("#garageWhatRoot [data-ph-ref]").forEach(el => {
    const ref = el.dataset.phRef;
    phUrlV67(ref).then(url => {
      if (!url || !el.isConnected) return;
      el.removeAttribute("data-ph-ref");
      if (el.classList.contains("garageWhatNoPhoto")) {
        el.replaceWith(Object.assign(new Image(), { src: url, alt: "" }));
      } else {
        el.innerHTML = "";
        el.append(Object.assign(new Image(), { src: url, alt: "" }));
      }
    });
  });
  return r;
};

// „Kita užduotis“ → Garažo užduočių skydelis, eilutė parodoma ir paryškinama
function openWhatTaskV74(item) {
  const task = (state.garageTasks || []).find(t => t.id === item.id);
  if (!task) {
    toast("Užduoties nebėra", "!");
    return render();
  }
  state.selectedView = "garage";
  state.ui = state.ui || {};
  saveState();
  Promise.resolve(render()).then(() => {
    openGarageTasks(true);
    tkTabV62 = task.dueDate && task.dueDate <= todayISO() ? "today" : "custom";
    tkRenderV62();
    window.scrollTo({ top: 0 });
    setTimeout(() => {
      const row = document.querySelector(`#garageTasksSection [data-tk-id="${CSS.escape(task.id)}"]`);
      if (!row) return;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("tkFlashV74");
      setTimeout(() => row.classList.remove("tkFlashV74"), 1800);
    }, 120);
  });
}

// Automobilio užduotis Vadybininke: išslenkantis langas (kaina + čekis + „Atlikta“), kaip kortelėje
function openWhatCarTaskV74(item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  const task = car?.checklist?.find(i => i.id === item.taskId);
  if (!car || !task || task.done) return render();
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30 whatTaskSheetV74"><div class="whatQuickTitleV30"><strong>${escapeHTML(task.name || "Automobilio užduotis")}</strong>${item.detail ? `<span>${escapeHTML(item.detail)}</span>` : ""}</div>${tcPanelHTMLV65(car.id, task.id, { openCarLink: true })}</section>`
  );
}
const __openWhatItemV74 = openWhatItemV30;
openWhatItemV30 = function (item) {
  if (item?.actionType === "car-task" && item.kind === "car") return openWhatCarTaskV74(item);
  return __openWhatItemV74.apply(this, arguments);
};
const __tcRefreshV74 = tcRefreshV65;
tcRefreshV65 = function () {
  const inWhat = !!document.querySelector("#sheet .whatTaskSheetV74");
  if (inWhat) closeSheet();
  return __tcRefreshV74.apply(this, arguments);
};

// Piešimas: viena klaida neturi palikti tuščio Vadybininko; jei užduotys nematomos – atsarginis sąrašas
function mgVerifyV74() {
  const check = () => {
    try {
      if (state.selectedView !== "garage-what") return;
      const root = document.getElementById("garageWhatRoot");
      if (!root) return;
      root.querySelector(".mgFallbackV73")?.remove();
      const items = workCenterItems();
      const visible = [...root.querySelectorAll("[data-what-open]")].some(e => e.offsetHeight > 0);
      if (!items.length || visible) return;
      const wrap = document.createElement("div");
      wrap.className = "mgFallbackV73";
      wrap.style.cssText = "display:block;margin:12px 0;opacity:1;visibility:visible;";
      wrap.innerHTML = items
        .slice(0, 20)
        .map(
          it =>
            `<button type="button" data-what-open="${escapeHTML(it.key)}" style="display:block;width:100%;margin:0 0 8px;padding:14px;border:1px solid #dfe5ee;border-radius:16px;background:#fff;text-align:left;opacity:1;visibility:visible;height:auto;position:static"><span style="display:block;font-size:13px;color:#667085">${escapeHTML(it.entity || "")}</span><strong style="display:block;font-size:16px;color:#0f1f3a">${escapeHTML(it.action || "")}</strong></button>`
        )
        .join("");
      (root.querySelector(".garageWhatPage") || root).append(wrap);
    } catch (e) {}
  };
  requestAnimationFrame(() => requestAnimationFrame(check));
  setTimeout(check, 400);
}
const __renderGuardV74 = render;
render = async function () {
  let r;
  try {
    r = await __renderGuardV74.apply(this, arguments);
  } catch (e) {
    window.__aeLastRenderErrorV74 = e;
    console.error("render", e);
  }
  if (state.selectedView === "garage-what") {
    try {
      const root = document.getElementById("garageWhatRoot");
      if (root && !root.querySelector(".garageWhatPage")) renderGarageWhatApp();
    } catch (e) {
      console.error("manager", e);
      const root = document.getElementById("garageWhatRoot");
      if (root)
        root.innerHTML = `<div class="garageWhatPage"><div class="garageWhatHead"><div class="garageWhatHeadTitle"><h2>Vadybininkas</h2></div><button class="garageWhatBack" type="button" data-garage-what-back>Atgal</button></div><div class="garageWhatEmpty"><strong>Nepavyko įkelti</strong><span>${escapeHTML(String(e?.message || e).slice(0, 120))}</span></div></div>`;
    }
    mgVerifyV74();
  }
  window.dispatchEvent(new Event("autoeasier:rendered"));
  return r;
};
