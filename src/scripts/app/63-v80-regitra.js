// v80: Regitros įrankiai Meniu – „Draudimo patikra“ ir „SDK paieška“.
// Viešos Regitros API nėra, o eregitra.lt automatinėms užklausoms rodo CAPTCHA, todėl programa pati
// neieško ir patikros neapeina. Ji paruošia duomenis (nukopijuoja ilgiausią lauką), atidaro oficialią
// Regitros paiešką naujame lange, o vartotojas, praėjęs patikrą, grįžta ir vienu paspaudimu įrašo rezultatą:
//   Draudimas → car.insuranceStatus / insuranceUntil / insuranceCompany (naujas, nebūtinas laukas)
//   SDK       → car.sdk (iš jo pildoma ir PP sutartis, 37-contract-v52.js)
// Vieta: Meniu plytelės „SDK paieška“ ir „Draudimo patikra“ (5 ir 6), jas kaip kitus skyrius atidaro
// 147-garage-menu-inline-disclosures-v1.js. Neužbaigta patikra (kol vartotojas Regitroje) saugoma
// sessionStorage – tik šiame įrenginyje ir šioje kortelėje.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const RG_CFG_V80 = {
  ins: {
    root: "menu-tool-ins",
    tile: "insurance",
    url: "https://www.eregitra.lt/services/vehicle-registration/data-search"
  },
  sdk: {
    root: "menu-tool-sdk",
    tile: "sdk",
    url: "https://www.eregitra.lt/services/vehicle-declaration/search"
  }
};
const RG_ICON_V80 = {
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2 5 6v5.2c0 4.4 3 7.9 7 9.3 4-1.4 7-4.9 7-9.3V6z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/></svg>',
  shieldOff:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2 5 6v5.2c0 4.4 3 7.9 7 9.3 4-1.4 7-4.9 7-9.3V6z"/><path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  paste:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.5" y="4.5" width="13" height="16" rx="2.5"/><path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5"/><path d="M9 11h6M9 15h4"/></svg>'
};

// ---------- Būsena (tik šiame įrenginyje) ----------
function rgKeyV80(kind) {
  let account = "";
  try {
    account = window.AUTOEASIER_APP_DATA?.currentStorageKey?.() || "";
  } catch (err) {}
  return `aeRegitraV80:${kind}:${account}`;
}
function rgBlankV80(kind) {
  return kind === "ins"
    ? { step: "idle", carId: "", plate: "", doc: "", result: null }
    : { step: "idle", carId: "", first: "", last: "", vin: "", result: null };
}
function rgLoadV80(kind) {
  try {
    const raw = sessionStorage.getItem(rgKeyV80(kind));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && ["idle", "wait", "done"].includes(parsed.step))
      return { ...rgBlankV80(kind), ...parsed };
  } catch (err) {}
  return rgBlankV80(kind);
}
function rgSaveV80(kind) {
  try {
    sessionStorage.setItem(rgKeyV80(kind), JSON.stringify(rgStateV80[kind]));
  } catch (err) {}
}
const rgStateV80 = { ins: rgLoadV80("ins"), sdk: rgLoadV80("sdk") };

// ---------- Duomenų tvarkymas ir patikra ----------
function rgCodeV80(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[\s\-–.]/g, "");
}
function rgIsVinV80(value) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(value);
}
function rgVinErrorV80(vin) {
  if (!vin) return "Įveskite VIN numerį.";
  if (/[IOQ]/.test(vin)) return "VIN negali turėti raidžių I, O ir Q.";
  if (!/^[A-Z0-9]+$/.test(vin)) return "VIN sudaro tik raidės ir skaičiai.";
  if (vin.length !== 17) return `VIN turi būti 17 simbolių – dabar ${vin.length}.`;
  return "";
}
function rgNameV80(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}
function rgCarV80(id) {
  return id ? (state.cars || []).find(c => c && c.id === id) || null : null;
}
function rgCarLabelV80(car) {
  if (!car) return "";
  return [car.name || "Automobilis", car.plate ? String(car.plate).toUpperCase() : ""]
    .filter(Boolean)
    .join(" · ");
}
function rgCarOptionsV80(kind, selected) {
  const cars = (state.cars || []).filter(c => c && c.id);
  if (!cars.length) return "";
  const id = `rg${kind === "ins" ? "Ins" : "Sdk"}CarV80`;
  const opt = c =>
    `<option value="${escapeHTML(c.id)}"${c.id === selected ? " selected" : ""}>${escapeHTML(rgCarLabelV80(c))}</option>`;
  const active = cars.filter(c => c.status !== "parduotas"),
    sold = cars.filter(c => c.status === "parduotas");
  return `<div class="field"><label for="${id}">Automobilis</label><select class="input" id="${id}" data-rg-car><option value="">Kitas automobilis</option>${
    active.length ? `<optgroup label="Garaže">${active.map(opt).join("")}</optgroup>` : ""
  }${sold.length ? `<optgroup label="Parduoti">${sold.map(opt).join("")}</optgroup>` : ""}</select></div>`;
}
function rgPartyNameV80(car) {
  const party = car?.ppParty;
  if (!party || party.type === "company" || !party.name) return { first: "", last: "" };
  const parts = rgNameV80(party.name).split(" ");
  return { first: parts.shift() || "", last: parts.join(" ") };
}
function rgCurrentInsV80(car) {
  if (!car) return "";
  const s = vehicleStatusState(car.insuranceStatus || "unknown", car.insuranceUntil || "");
  const text =
    car.insuranceStatus === "valid" && car.insuranceUntil
      ? `${car.insuranceUntil < todayISO() ? "pasibaigė" : "galioja iki"} ${car.insuranceUntil}`
      : s.label.toLocaleLowerCase("lt");
  return `<p class="rgNowV80 ${escapeHTML(s.cls)}">Kortelėje: draudimas ${escapeHTML(text)}${
    car.insuranceCompany ? ` · ${escapeHTML(car.insuranceCompany)}` : ""
  }</p>`;
}
function rgCurrentSdkV80(car) {
  if (!car || !car.sdk) return "";
  return `<p class="rgNowV80 good">Kortelėje jau yra SDK: ${escapeHTML(String(car.sdk).toUpperCase())}</p>`;
}

// ---------- Kopijavimas, įklijavimas, Regitros atidarymas ----------
function rgCopyFallbackV80(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (err) {}
  ta.remove();
  return ok;
}
function rgCopyV80(text, label) {
  const value = String(text || "");
  if (!value) return;
  const done = ok =>
    toast(ok ? `Nukopijuota: ${label}` : "Nepavyko nukopijuoti – pažymėkite tekstą ranka", ok ? "✓" : "!");
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(
        () => done(true),
        () => done(rgCopyFallbackV80(value))
      );
      return;
    }
  } catch (err) {}
  done(rgCopyFallbackV80(value));
}
function rgOpenV80(kind) {
  try {
    window.open(RG_CFG_V80[kind].url, "_blank", "noopener,noreferrer");
  } catch (err) {
    location.href = RG_CFG_V80[kind].url;
  }
}

// ---------- Žingsnių HTML ----------
function rgErrorHTMLV80() {
  return `<p class="rgErrV80" data-rg-error role="alert" hidden></p>`;
}
function rgChipV80(key, label, value) {
  return `<button type="button" class="rgChipV80" data-rg-copy="${key}" aria-label="Kopijuoti: ${escapeHTML(label)}"><span><em>${escapeHTML(
    label
  )}</em><b>${escapeHTML(value)}</b></span>${RG_ICON_V80.copy}</button>`;
}
function rgWaitHeadV80(title, text) {
  return `<div class="rgPulseV80" role="status" aria-live="polite"><span class="rgSpinV80" aria-hidden="true"></span><span class="rgPulseTextV80"><strong>${escapeHTML(
    title
  )}</strong><span>${escapeHTML(text)}</span></span></div>`;
}
function rgLinksV80() {
  return `<div class="rgLinksV80"><button type="button" class="rgLinkV80" data-rg-open>${RG_ICON_V80.open}Atidaryti Regitrą dar kartą</button><button type="button" class="rgLinkV80" data-rg-edit>Keisti duomenis</button></div>`;
}
function rgInsHTMLV80() {
  const st = rgStateV80.ins,
    car = rgCarV80(st.carId);
  if (st.step === "wait") {
    const docLabel = rgIsVinV80(st.doc) ? "VIN" : "Liudijimo nr.";
    return `<div class="rgStepV80">
      ${rgWaitHeadV80("Tikrinama Regitroje…", "Praėję patikrą, grįžkite ir pažymėkite rezultatą.")}
      <div class="rgChipsV80">${rgChipV80("plate", "Valst. nr.", st.plate)}${rgChipV80("doc", docLabel, st.doc)}</div>
      <span class="rgLabelV80">Draudimo statusas</span>
      <div class="rgSegV80" role="group" aria-label="Draudimo statusas">
        <button type="button" class="rgSegBtnV80 good" data-rg-ins-pick="valid" aria-pressed="false">${RG_ICON_V80.shield}Galioja</button>
        <button type="button" class="rgSegBtnV80 bad" data-rg-ins-pick="invalid" aria-pressed="false">${RG_ICON_V80.shieldOff}Negalioja</button>
      </div>
      <div class="rgValidV80" data-rg-valid hidden>
        <div class="grid2">
          <div class="field"><label for="rgInsUntilV80">Galioja iki</label><input class="input" id="rgInsUntilV80" type="date" min="${todayISO()}" value="${escapeHTML(
            car?.insuranceStatus === "valid" && car.insuranceUntil >= todayISO() ? car.insuranceUntil : ""
          )}"></div>
          <div class="field"><label for="rgInsCompanyV80">Draudikas</label><input class="input" id="rgInsCompanyV80" maxlength="40" autocomplete="off" placeholder="pvz. BTA" value="${escapeHTML(
            car?.insuranceCompany || ""
          )}"></div>
        </div>
        ${rgErrorHTMLV80()}
        <button type="button" class="btn rgPrimaryV80" data-rg-ins-save>Išsaugoti</button>
      </div>
      ${rgLinksV80()}
    </div>`;
  }
  if (st.step === "done" && st.result) {
    const r = st.result,
      ok = r.status === "valid";
    const facts = [
      ok && r.company ? ["Draudikas", r.company] : null,
      ok && r.until ? ["Galioja iki", r.until] : null,
      ["Valst. nr.", r.plate]
    ].filter(Boolean);
    return `<div class="rgStepV80">
      <div class="rgResultV80 ${ok ? "good" : "bad"}" role="status">
        <span class="rgBadgeV80 ${ok ? "good" : "bad"}">${ok ? RG_ICON_V80.shield : RG_ICON_V80.shieldOff}<span>Civilinis draudimas <b>${
          ok ? "GALIOJA" : "NEGALIOJA"
        }</b></span></span>
        ${ok ? "" : `<p class="rgResultTextV80">Galiojančio privalomojo draudimo nėra.</p>`}
        <dl class="rgFactsV80">${facts
          .map(([k, v]) => `<div><dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd></div>`)
          .join("")}</dl>
        ${r.saved ? `<p class="rgSavedV80">Įrašyta į kortelę: ${escapeHTML(r.carLabel)}</p>` : ""}
      </div>
      <button type="button" class="rgGhostV80" data-rg-new>Nauja patikra</button>
    </div>`;
  }
  return `<form class="rgStepV80 rgFormV80" data-rg-form novalidate>
    ${rgCarOptionsV80("ins", st.carId)}
    ${rgCurrentInsV80(car)}
    <div class="field"><label for="rgInsPlateV80">Valst. numeris</label><input class="input rgCapsV80" id="rgInsPlateV80" name="plate" maxlength="10" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next" placeholder="Lietuviškas valst. nr. (pvz. LLL111)" value="${escapeHTML(
      st.plate
    )}"></div>
    <div class="field"><label for="rgInsDocV80">Liudijimo nr. arba VIN</label><input class="input rgCapsV80" id="rgInsDocV80" name="doc" maxlength="17" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="pvz. K1234567" value="${escapeHTML(
      st.doc
    )}"></div>
    ${rgErrorHTMLV80()}
    <button type="submit" class="btn rgPrimaryV80">${RG_ICON_V80.search}<span>Tikrinti Regitroje</span></button>
  </form>`;
}
function rgSdkHTMLV80() {
  const st = rgStateV80.sdk,
    car = rgCarV80(st.carId);
  if (st.step === "wait") {
    const canPaste = !!navigator.clipboard?.readText;
    return `<div class="rgStepV80">
      ${rgWaitHeadV80("Prašome palaukti, ieškomas SDK…", "Radę kodą Regitroje, įklijuokite jį čia.")}
      <div class="rgChipsV80">${rgChipV80("first", "Vardas", st.first)}${rgChipV80("last", "Pavardė", st.last)}${rgChipV80(
        "vin",
        "VIN",
        st.vin
      )}</div>
      <div class="field"><label for="rgSdkCodeV80">SDK kodas</label><div class="rgPasteRowV80"><input class="input rgCapsV80 rgMonoV80" id="rgSdkCodeV80" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done" placeholder="Įklijuokite kodą">${
        canPaste
          ? `<button type="button" class="rgPasteV80" data-rg-paste>${RG_ICON_V80.paste}Įklijuoti</button>`
          : ""
      }</div></div>
      ${rgErrorHTMLV80()}
      <div class="rgActionsV80"><button type="button" class="btn rgPrimaryV80" data-rg-sdk-save>Išsaugoti</button><button type="button" class="rgGhostV80" data-rg-sdk-none>Nerastas</button></div>
      ${rgLinksV80()}
    </div>`;
  }
  if (st.step === "done" && st.result) {
    const r = st.result;
    if (!r.found)
      return `<div class="rgStepV80">
        <div class="rgResultV80 neutral" role="status">
          <span class="rgBadgeV80 dark">${RG_ICON_V80.search}<span>SDK kodas pagal šiuos duomenis nerastas</span></span>
          <p class="rgResultTextV80">Patikrinkite savininko vardą, pavardę ir VIN.</p>
        </div>
        <button type="button" class="rgGhostV80" data-rg-edit>Bandyti dar kartą</button>
      </div>`;
    return `<div class="rgStepV80">
      <div class="rgSdkCardV80" role="status">
        <span class="rgSdkLabelV80">SDK KODAS</span>
        <strong class="rgSdkCodeV80">${escapeHTML(r.code)}</strong>
        <button type="button" class="rgCopyBtnV80" data-rg-copy="code">${RG_ICON_V80.copy}Kopijuoti</button>
      </div>
      ${r.saved ? `<p class="rgSavedV80">Įrašyta į kortelę: ${escapeHTML(r.carLabel)} · bus sutartyje</p>` : ""}
      <button type="button" class="rgGhostV80" data-rg-new>Nauja paieška</button>
    </div>`;
  }
  const vinLen = rgCodeV80(st.vin).length;
  return `<form class="rgStepV80 rgFormV80" data-rg-form novalidate>
    ${rgCarOptionsV80("sdk", st.carId)}
    ${rgCurrentSdkV80(car)}
    <div class="grid2">
      <div class="field"><label for="rgSdkFirstV80">Vardas</label><input class="input" id="rgSdkFirstV80" name="first" maxlength="40" autocomplete="off" autocapitalize="words" enterkeyhint="next" value="${escapeHTML(
        st.first
      )}"></div>
      <div class="field"><label for="rgSdkLastV80">Pavardė</label><input class="input" id="rgSdkLastV80" name="last" maxlength="60" autocomplete="off" autocapitalize="words" enterkeyhint="next" value="${escapeHTML(
        st.last
      )}"></div>
    </div>
    <div class="field"><label for="rgSdkVinV80" class="rgVinLabelV80"><span>VIN numeris</span><span class="rgCountV80${
      vinLen === 17 ? " ok" : ""
    }" data-rg-count>${vinLen}/17</span></label><input class="input rgCapsV80 rgMonoV80" id="rgSdkVinV80" name="vin" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="17 simbolių" value="${escapeHTML(
      st.vin
    )}"></div>
    ${rgErrorHTMLV80()}
    <button type="submit" class="btn rgPrimaryV80">${RG_ICON_V80.search}<span>Ieškoti Regitroje</span></button>
  </form>`;
}
function rgRenderV80(kind) {
  const root = document.getElementById(RG_CFG_V80[kind].root);
  if (!root) return;
  root.innerHTML = `<div class="rgToolV80" data-rg-kind="${kind}">${kind === "ins" ? rgInsHTMLV80() : rgSdkHTMLV80()}</div>`;
}
function rgErrorV80(root, text, focusEl) {
  // Netinkami duomenys = nepavykęs bandymas: pataisius iš karto galima spausti dar kartą (61-v78.js apsauga)
  if (text) {
    lastGuardedTapV78.failed = true;
    lastSubmitV78.failed = true;
  }
  const el = root.querySelector("[data-rg-error]");
  if (el) {
    el.textContent = text || "";
    el.hidden = !text;
  }
  if (text && focusEl) focusEl.focus();
}

// ---------- Įrašymas į automobilio kortelę ----------
function rgCommitV80(carId, apply, check) {
  const car = rgCarV80(carId);
  if (!car) return false;
  apply(car);
  saveState();
  // Tik peržiūros režime (54-readonly-v70.js) saveState atkuria ankstesnę būseną – tikriname, ar tikrai įrašyta
  const after = rgCarV80(carId);
  const saved = !!(after && check(after));
  try {
    render();
  } catch (err) {}
  return saved;
}
function rgSaveInsV80(root, status) {
  const st = rgStateV80.ins;
  let until = "",
    company = "";
  if (status === "valid") {
    until = root.querySelector("#rgInsUntilV80")?.value || "";
    company = rgNameV80(root.querySelector("#rgInsCompanyV80")?.value).slice(0, 40);
    if (!until)
      return rgErrorV80(
        root,
        "Nurodykite, iki kada galioja draudimas.",
        root.querySelector("#rgInsUntilV80")
      );
    if (until < todayISO())
      return rgErrorV80(
        root,
        "Ši data jau praėjo – pažymėkite „Negalioja“.",
        root.querySelector("#rgInsUntilV80")
      );
  }
  const car = rgCarV80(st.carId);
  let saved = false;
  if (car) {
    const docIsVin = rgIsVinV80(st.doc);
    saved = rgCommitV80(
      car.id,
      c => {
        c.insuranceStatus = status;
        c.insuranceUntil = status === "valid" ? until : "";
        if (status === "valid" && company) c.insuranceCompany = company;
        if (!c.plate && st.plate) c.plate = st.plate;
        if (docIsVin && !c.vin) c.vin = st.doc;
        if (!docIsVin && !c.registrationDoc && st.doc) c.registrationDoc = st.doc;
        addHistory(
          "Draudimo patikra",
          `${rgCarLabelV80(c)} · ${status === "valid" ? `galioja iki ${until}${company ? ` · ${company}` : ""}` : "negalioja"}`,
          "🛡️",
          { kind: "car", id: c.id, label: "Atidaryti automobilį" }
        );
      },
      c => c.insuranceStatus === status && (status !== "valid" || c.insuranceUntil === until)
    );
  }
  st.step = "done";
  st.result = {
    status,
    until,
    company,
    plate: st.plate,
    saved,
    carLabel: car ? rgCarLabelV80(car) : ""
  };
  rgSaveV80("ins");
  rgRenderV80("ins");
  if (saved) toast("Įrašyta į automobilio kortelę", "✓");
}
function rgSaveSdkV80(root, found) {
  const st = rgStateV80.sdk;
  let code = "";
  if (found) {
    const input = root.querySelector("#rgSdkCodeV80");
    code = rgCodeV80(input?.value);
    if (!code) return rgErrorV80(root, "Įveskite arba įklijuokite SDK kodą.", input);
    if (!/^[A-Z0-9]{4,16}$/.test(code))
      return rgErrorV80(root, "SDK kodą sudaro tik raidės ir skaičiai (4–16 simbolių).", input);
  }
  const car = rgCarV80(st.carId);
  let saved = false;
  if (found && car) {
    saved = rgCommitV80(
      car.id,
      c => {
        c.sdk = code;
        if (!c.vin && st.vin) c.vin = st.vin;
        addHistory("SDK įrašytas", rgCarLabelV80(c), "🔑", {
          kind: "car",
          id: c.id,
          label: "Atidaryti automobilį"
        });
      },
      c => String(c.sdk || "").toUpperCase() === code
    );
  }
  st.step = "done";
  st.result = { found, code, saved, carLabel: car ? rgCarLabelV80(car) : "" };
  rgSaveV80("sdk");
  rgRenderV80("sdk");
  if (saved) toast("SDK įrašytas į automobilio kortelę", "✓");
}

// ---------- Formų pateikimas ----------
function rgSubmitV80(kind, form) {
  const st = rgStateV80[kind];
  st.carId = rgCarV80(form.querySelector("[data-rg-car]")?.value || "")?.id || "";
  if (kind === "ins") {
    const plateEl = form.querySelector("#rgInsPlateV80"),
      docEl = form.querySelector("#rgInsDocV80");
    const plate = rgCodeV80(plateEl?.value),
      doc = rgCodeV80(docEl?.value);
    if (!plate) return rgErrorV80(form, "Įveskite valstybinį numerį.", plateEl);
    if (!/^[A-Z0-9]{2,8}$/.test(plate))
      return rgErrorV80(form, "Valstybinį numerį sudaro tik raidės ir skaičiai.", plateEl);
    if (!doc)
      return rgErrorV80(form, "Įveskite liudijimo numerį arba VIN – Regitrai reikia dviejų duomenų.", docEl);
    if (doc.length === 17 && !rgIsVinV80(doc)) return rgErrorV80(form, rgVinErrorV80(doc), docEl);
    if (doc.length !== 17 && !/^[A-Z0-9]{5,12}$/.test(doc))
      return rgErrorV80(form, "Liudijimo numerį sudaro 5–12 raidžių ir skaičių, VIN – 17 simbolių.", docEl);
    Object.assign(st, { plate, doc, step: "wait", result: null });
    rgSaveV80(kind);
    // Kopijuojama prieš atidarant langą – kol šis puslapis dar aktyvus
    rgCopyV80(doc, rgIsVinV80(doc) ? "VIN" : "Liudijimo nr.");
  } else {
    const firstEl = form.querySelector("#rgSdkFirstV80"),
      lastEl = form.querySelector("#rgSdkLastV80"),
      vinEl = form.querySelector("#rgSdkVinV80");
    const first = rgNameV80(firstEl?.value),
      last = rgNameV80(lastEl?.value),
      vin = rgCodeV80(vinEl?.value);
    if (!first) return rgErrorV80(form, "Įveskite savininko vardą.", firstEl);
    if (!last) return rgErrorV80(form, "Įveskite savininko pavardę.", lastEl);
    const vinErr = rgVinErrorV80(vin);
    if (vinErr) return rgErrorV80(form, vinErr, vinEl);
    Object.assign(st, { first, last, vin, step: "wait", result: null });
    rgSaveV80(kind);
    rgCopyV80(vin, "VIN");
  }
  rgOpenV80(kind);
  rgRenderV80(kind);
}
function rgPrefillV80(kind, form, carId) {
  const st = rgStateV80[kind],
    car = rgCarV80(carId);
  st.carId = car ? car.id : "";
  const set = (sel, value) => {
    const el = form.querySelector(sel);
    if (el && value) el.value = value;
  };
  if (car && kind === "ins") {
    set("#rgInsPlateV80", rgCodeV80(car.plate));
    set("#rgInsDocV80", rgCodeV80(car.registrationDoc || car.regDoc || car.vin));
  }
  if (car && kind === "sdk") {
    const party = rgPartyNameV80(car);
    set("#rgSdkFirstV80", party.first);
    set("#rgSdkLastV80", party.last);
    set("#rgSdkVinV80", rgCodeV80(car.vin));
  }
  // Įvesti duomenys išlaikomi, perpiešiama tik būsenos eilutė
  if (kind === "ins") {
    st.plate = rgCodeV80(form.querySelector("#rgInsPlateV80")?.value);
    st.doc = rgCodeV80(form.querySelector("#rgInsDocV80")?.value);
  } else {
    st.first = rgNameV80(form.querySelector("#rgSdkFirstV80")?.value);
    st.last = rgNameV80(form.querySelector("#rgSdkLastV80")?.value);
    st.vin = rgCodeV80(form.querySelector("#rgSdkVinV80")?.value);
  }
  rgSaveV80(kind);
  rgRenderV80(kind);
}
function rgVinCountV80(form) {
  const el = form.querySelector("[data-rg-count]"),
    vin = rgCodeV80(form.querySelector("#rgSdkVinV80")?.value);
  if (!el) return;
  el.textContent = `${vin.length}/17`;
  el.classList.toggle("ok", rgIsVinV80(vin));
}

// ---------- Įvykiai (kiekvienas įrankis – savo šaknyje, todėl kitų Meniu skyrių neliečia) ----------
function rgBindV80(kind) {
  const root = document.getElementById(RG_CFG_V80[kind].root);
  if (!root || root.dataset.rgBound) return;
  root.dataset.rgBound = "1";
  root.addEventListener("submit", e => {
    const form = e.target.closest("[data-rg-form]");
    if (!form) return;
    e.preventDefault();
    rgSubmitV80(kind, form);
  });
  root.addEventListener("change", e => {
    const sel = e.target.closest("[data-rg-car]");
    if (sel) rgPrefillV80(kind, sel.closest("[data-rg-form]"), sel.value);
  });
  root.addEventListener("input", e => {
    const form = e.target.closest("[data-rg-form]");
    if (form && e.target.id === "rgSdkVinV80") rgVinCountV80(form);
    if (form) rgErrorV80(form, "");
    if (e.target.id === "rgSdkCodeV80" || e.target.closest("[data-rg-valid]")) rgErrorV80(root, "");
  });
  root.addEventListener("click", e => {
    const st = rgStateV80[kind];
    const copy = e.target.closest("[data-rg-copy]");
    if (copy) {
      const key = copy.dataset.rgCopy;
      const labels = {
        plate: "Valst. nr.",
        doc: rgIsVinV80(st.doc) ? "VIN" : "Liudijimo nr.",
        first: "Vardas",
        last: "Pavardė",
        vin: "VIN",
        code: "SDK kodas"
      };
      const value = key === "code" ? st.result?.code : st[key];
      return rgCopyV80(value, labels[key] || "Tekstas");
    }
    if (e.target.closest("[data-rg-open]")) return rgOpenV80(kind);
    if (e.target.closest("[data-rg-edit]")) {
      st.step = "idle";
      st.result = null;
      rgSaveV80(kind);
      rgRenderV80(kind);
      return root.querySelector("input")?.focus();
    }
    if (e.target.closest("[data-rg-new]")) {
      rgStateV80[kind] = rgBlankV80(kind);
      rgSaveV80(kind);
      return rgRenderV80(kind);
    }
    const pick = e.target.closest("[data-rg-ins-pick]");
    if (pick) {
      root
        .querySelectorAll("[data-rg-ins-pick]")
        .forEach(b => b.setAttribute("aria-pressed", String(b === pick)));
      if (pick.dataset.rgInsPick === "invalid") return rgSaveInsV80(root, "invalid");
      const box = root.querySelector("[data-rg-valid]");
      if (box) box.hidden = false;
      return root.querySelector("#rgInsUntilV80")?.focus();
    }
    if (e.target.closest("[data-rg-ins-save]")) return rgSaveInsV80(root, "valid");
    if (e.target.closest("[data-rg-sdk-save]")) return rgSaveSdkV80(root, true);
    if (e.target.closest("[data-rg-sdk-none]")) return rgSaveSdkV80(root, false);
    if (e.target.closest("[data-rg-paste]")) {
      const input = root.querySelector("#rgSdkCodeV80");
      navigator.clipboard
        .readText()
        .then(text => {
          const code = rgCodeV80(text);
          if (!code) return toast("Iškarpinė tuščia", "!");
          if (input) input.value = code;
          rgErrorV80(root, "");
        })
        .catch(() => {
          toast("Įklijuokite ranka: palaikykite lauką", "!");
          input?.focus();
        });
    }
  });
  root.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (e.target.id === "rgSdkCodeV80") {
      e.preventDefault();
      rgSaveSdkV80(root, true);
    } else if (e.target.closest("[data-rg-valid]")) {
      e.preventDefault();
      rgSaveInsV80(root, "valid");
    }
  });
}
// Atidarant plytelę – šviežias automobilių sąrašas (galėjo pasikeisti) ir kortelės būsena
document.addEventListener("click", e => {
  const tile = e.target.closest("#view-menu [data-menu-disclosure]");
  if (!tile) return;
  const kind =
    tile.dataset.menuDisclosure === "insurance" ? "ins" : tile.dataset.menuDisclosure === "sdk" ? "sdk" : "";
  if (!kind) return;
  const st = rgStateV80[kind];
  if (st.carId && !rgCarV80(st.carId)) st.carId = "";
  if (st.step === "idle" || st.step === "done") rgRenderV80(kind);
});
["ins", "sdk"].forEach(kind => {
  rgBindV80(kind);
  rgRenderV80(kind);
});
