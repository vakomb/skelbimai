// Vadybininkas (Ką daryti?): darbų kortelės ir veiksmų langai.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function garageWhatMediaApp(item) {
  if (item.kind === "car") {
    const c = (state.cars || []).find(x => x.id === item.id),
      raw = c?.imageSrc || (c?.photos || [])[0] || "";
    return photoSrcSafe(raw);
  }
  if (item.kind === "lead") {
    const l = (state.leadVariants || []).find(x => x.id === item.id),
      raw = (l?.photos || [])[0] || l?.imageSrc || "";
    return photoSrcSafe(raw);
  }
  return "";
}
// Nuotraukos nuoroda (photo_…), kurią galima užpildyti vėliau (data-ph-ref)
function garageWhatRefApp(item) {
  if (item.kind === "car") {
    const c = (state.cars || []).find(x => x.id === item.id);
    return c?.imageSrc || (c?.photos || [])[0] || "";
  }
  if (item.kind === "lead") {
    const l = (state.leadVariants || []).find(x => x.id === item.id);
    return (l?.photos || [])[0] || l?.imageSrc || "";
  }
  return "";
}
// Šviežias įrašas pagal id (langai gali būti atidaryti, kol debesies sinchronizacija pakeitė state)
function whatFreshV74(list, id) {
  const found = (state[list] || []).find(o => o.id === id);
  if (!found) {
    toast("Įrašas pasikeitė kitame įrenginyje – atidarykite iš naujo", "!");
    closeSheet();
  }
  return found || null;
}
function garageWhatKindApp(x) {
  if (x.actionType === "missing-data") return "Trūksta duomenų";
  if (x.actionType === "missing-docs") return "Trūksta dokumentų";
  if (x.actionType === "listing") return "Skelbimas";
  if (x.actionType === "accounting") return "Buhalterija";
  if (x.kind === "car") return "Automobilis";
  if (x.kind === "lead") return "Variantas";
  if (x.kind === "customer") return "Klientas";
  return "Užduotis";
}
let garageWhatCacheV30 = [];
function garageWhatItemV30(key) {
  return garageWhatCacheV30.find(x => x.key === key) || null;
}
function garageWhatCtaV30(item) {
  return item.cta || (item.late ? "Vėluoja" : item.due === todayISO() ? "Terminas šiandien" : "Atidaryti");
}
function renderGarageWhatApp() {
  const root = document.getElementById("garageWhatRoot");
  if (!root) return;
  const items = workCenterItems().slice(0, 20);
  garageWhatCacheV30 = items;
  const top = items[0],
    rest = items.slice(1);
  const manage = key =>
    `<button class="garageWhatManageV30" type="button" data-what-manage="${escapeHTML(key)}" aria-label="Atidėti arba atmesti">•••</button>`;
  const hero = top
    ? `<div class="garageWhatHeroWrapV30"><button class="garageWhatHero garageWhatHeroMainV30" type="button" data-what-open="${escapeHTML(top.key)}"><div class="garageWhatHeroMedia">${garageWhatMediaApp(top) ? `<img src="${garageWhatMediaApp(top)}" alt="${escapeHTML(top.entity)}">` : `<div class="garageWhatNoPhoto" ${garageWhatRefApp(top) ? `data-ph-ref="${escapeHTML(garageWhatRefApp(top))}"` : ""}>🚗<span>Nuotraukos nėra</span></div>`}<span class="garageWhatRank">Svarbiausia dabar</span><strong class="garageWhatHeroEntity">${escapeHTML(top.entity)}</strong></div><div class="garageWhatHeroBody"><span>${escapeHTML(garageWhatKindApp(top))}</span><strong>${escapeHTML(top.action)}</strong>${top.detail ? `<small class="garageWhatDetailV30">${escapeHTML(top.detail)}</small>` : ""}<div class="garageWhatHeroBottom"><b>${escapeHTML(garageWhatCtaV30(top))}</b><span>→</span></div></div></button>${manage(top.key)}</div>`
    : `<div class="garageWhatEmpty"><span class="ico">✓</span><strong>Šiuo metu viskas sutvarkyta</strong><span>Nėra aktualių veiksmų.</span></div>`;
  const rows = rest.length
    ? `<div class="garageWhatList">${rest
        .map(x => {
          const media = garageWhatMediaApp(x);
          return `<div class="garageWhatRowWrapV30"><button class="garageWhatRow" type="button" data-what-open="${escapeHTML(x.key)}"><span class="garageWhatThumb" ${!media && garageWhatRefApp(x) ? `data-ph-ref="${escapeHTML(garageWhatRefApp(x))}"` : ""}>${media ? `<img src="${media}" alt="${escapeHTML(x.entity)}">` : x.icon || "✓"}</span><span class="garageWhatCopy"><b>${escapeHTML(x.entity)}</b><strong>${escapeHTML(x.action)}</strong>${x.detail ? `<small class="garageWhatRowDetailV30">${escapeHTML(x.detail)}</small>` : ""}</span><span class="garageWhatSide ${x.late ? "late" : ""}">${x.late ? "Vėluoja" : "→"}</span></button>${manage(x.key)}</div>`;
        })
        .join("")}</div>`
    : "";
  root.innerHTML = `<div class="garageWhatPage"><div class="garageWhatHead"><div class="garageWhatHeadTitle"><h2>Vadybininkas</h2></div><button class="garageWhatBack" type="button" data-garage-what-back>Atgal</button></div>${hero}${rows}</div>`;
}
function openWhatMissingDataV30(item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  if (!car) return;
  const fields = workCenterMissingFieldsV30(car);
  if (!fields.length) {
    render();
    return;
  }
  const input = f => {
    if (f.key === "taStatus")
      return `<div class="field"><label>TA</label><select class="input" id="what_taStatus">${vehicleStatusOptions(car.taStatus || "unknown")}</select></div>`;
    if (f.key === "insuranceStatus")
      return `<div class="field"><label>Draudimas</label><select class="input" id="what_insuranceStatus">${vehicleStatusOptions(car.insuranceStatus || "unknown")}</select></div>`;
    const cfg = {
      vin: ["VIN", "text", "17"],
      mileage: ["Rida, km", "number", ""],
      sdk: ["SDK", "text", "32"],
      plate: ["Valstybinis numeris", "text", "20"],
      registrationDoc: ["Registracijos liudijimo serija ir nr.", "text", "12"],
      year: ["Metai", "number", "4"],
      buyPrice: ["Pirkimo kaina, €", "number", ""]
    }[f.key];
    const value = f.key === "registrationDoc" ? car.registrationDoc || car.regDoc || "" : (car[f.key] ?? "");
    const numeric = cfg[1] === "number";
    return `<div class="field ${["vin", "registrationDoc", "sdk"].includes(f.key) ? "whatWideV30" : ""}"><label>${cfg[0]}</label><input class="input" id="what_${f.key}" type="${cfg[1]}" value="${escapeHTML(value)}" ${cfg[2] ? `maxlength="${cfg[2]}"` : ""} ${numeric ? 'min="0" inputmode="numeric"' : ""} ${["vin", "plate", "registrationDoc", "sdk"].includes(f.key) ? 'autocapitalize="characters" autocomplete="off"' : ""}></div>`;
  };
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Užpildyti trūkstamus duomenis</strong><span>Rodomi tik laukai, kurių dabar trūksta.</span></div><div class="whatQuickGridV30">${fields.map(input).join("")}</div><button class="btn whatPrimaryV30" id="whatSaveMissingV30" type="button">Išsaugoti</button></section>`
  );
  document.getElementById("whatSaveMissingV30").onclick = () => {
    try {
      const oldBuy = Number(car.buyPrice || 0);
      let newBuy = oldBuy;
      for (const f of fields) {
        const el = document.getElementById("what_" + f.key);
        if (!el) continue;
        let v = String(el.value ?? "").trim();
        if (f.key === "vin") {
          v = v.toUpperCase();
          if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) throw Error("VIN turi būti 17 simbolių.");
          car.vin = v;
        } else if (f.key === "mileage") {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0) throw Error("Patikrink ridą.");
          car.mileage = n;
        } else if (f.key === "sdk") {
          v = v.toUpperCase();
          if (!v) throw Error("Įrašyk SDK.");
          car.sdk = v;
          if (!car.sdkStatus || car.sdkStatus === "unset") car.sdkStatus = "done";
        } else if (f.key === "plate") {
          v = v.toUpperCase();
          if (!v) throw Error("Įrašyk valstybinį numerį.");
          car.plate = v;
        } else if (f.key === "registrationDoc") {
          v = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (!/^[A-Z][0-9]{5,8}$/.test(v)) throw Error("Patikrink registracijos liudijimo numerį.");
          car.registrationDoc = v;
        } else if (f.key === "year") {
          const n = Number(v),
            max = new Date().getFullYear() + 1;
          if (!Number.isInteger(n) || n < 1886 || n > max) throw Error("Patikrink metus.");
          car.year = n;
        } else if (f.key === "taStatus") {
          if (!["valid", "invalid"].includes(v)) throw Error("Pasirink TA būseną.");
          car.taStatus = v;
        } else if (f.key === "insuranceStatus") {
          if (!["valid", "invalid"].includes(v)) throw Error("Pasirink draudimo būseną.");
          car.insuranceStatus = v;
        } else if (f.key === "buyPrice") {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) throw Error("Įrašyk pirkimo kainą.");
          newBuy = n;
          car.buyPrice = n;
        }
      }
      if (newBuy !== oldBuy) {
        ensureFinanceCollections();
        state.finances.budgetBalance += oldBuy - newBuy;
      }
      if (!saveState()) throw Error("Nepavyko išsaugoti.");
      addHistory("Automobilio duomenys papildyti", car.name, "✎", {
        kind: "car",
        id: car.id,
        label: "Atidaryti automobilį"
      });
      saveState();
      closeSheet();
      render();
      toast("Automobilio duomenys išsaugoti", "✓");
    } catch (e) {
      toast(e.message || "Patikrink duomenis", "!");
    }
  };
}
function openWhatDocsV30(item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  if (!car) return;
  const missing = workCenterMissingDocsV30(car);
  if (!missing.length) {
    render();
    return;
  }
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Prisegti trūkstamus dokumentus</strong></div><div class="whatDocInputsV30">${missing.map(d => `<label class="whatDocPickerV30" for="what_doc_${d.kind}"><span>＋</span><strong>${escapeHTML(d.label)}</strong><small id="what_doc_name_${d.kind}"></small><input id="what_doc_${d.kind}" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple></label>`).join("")}</div><button class="btn whatPrimaryV30" id="whatSaveDocsV30" type="button">Išsaugoti dokumentus</button></section>`
  );
  missing.forEach(d => {
    const input = document.getElementById("what_doc_" + d.kind);
    if (input)
      input.onchange = () => {
        const n = document.getElementById("what_doc_name_" + d.kind);
        if (n)
          n.textContent = Array.from(input.files || [])
            .map(f => f.name)
            .join(", ");
      };
  });
  document.getElementById("whatSaveDocsV30").onclick = async () => {
    const car = whatFreshV74("cars", item.id);
    if (!car) return;
    const selected = missing.flatMap(d =>
      Array.from(document.getElementById("what_doc_" + d.kind)?.files || []).map(file => ({
        kind: d.kind,
        file
      }))
    );
    if (!selected.length) {
      toast("Pasirink bent vieną dokumentą", "!");
      return;
    }
    const btn = document.getElementById("whatSaveDocsV30");
    btn.disabled = true;
    btn.textContent = "Išsaugoma…";
    const added = [];
    try {
      for (const x of selected) {
        const blob = await readDocumentFile(x.file),
          key = await putDocument(blob);
        added.push({
          id: uid(),
          key,
          kind: x.kind,
          name: x.file.name,
          type: blob.type,
          size: blob.size,
          addedAt: nowLabel(),
          addedDateISO: todayISO()
        });
      }
      car.documents = [...(car.documents || []), ...added];
      if (!saveState()) throw Error("Nepavyko išsaugoti dokumentų.");
      addHistory("Dokumentai pridėti", `${car.name} · ${added.length}`, "▤", {
        kind: "car",
        id: car.id,
        label: "Atidaryti automobilį"
      });
      saveState();
      closeSheet();
      render();
      toast("Dokumentai pridėti", "✓");
    } catch (e) {
      await Promise.all(added.map(d => photoDelete(d.key).catch(() => {})));
      toast(e.message || "Nepavyko išsaugoti", "!");
      btn.disabled = false;
      btn.textContent = "Išsaugoti dokumentus";
    }
  };
}
function openWhatListingV30(item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  if (!car) return;
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Kodėl automobilis dar ne skelbime?</strong></div><div class="whatChoiceListV30"><button type="button" data-what-listing-listed><b>✓</b><span><strong>Jau įkeltas į skelbimą</strong></span></button><button type="button" data-what-listing-tasks><b>＋</b><span><strong>Dar neparuoštas</strong><small>Atidaryti automobilį ir susidėti užduotis</small></span></button><button type="button" data-what-listing-later><b>⌛</b><span><strong>Vėliau</strong><small>Priminti po 3 dienų</small></span></button><button class="dangerSoftV30" type="button" data-what-listing-dismiss><b>×</b><span><strong>Nerodyti daugiau</strong></span></button></div></section>`
  );
  document.querySelector("[data-what-listing-listed]").onclick = () => {
    const car = whatFreshV74("cars", item.id);
    if (!car) return;
    car.listingStatus = "listed";
    car.listingDate = todayISO();
    saveState();
    closeSheet();
    render();
    toast("Pažymėta: skelbimas įkeltas", "✓");
  };
  document.querySelector("[data-what-listing-tasks]").onclick = () => {
    closeSheet();
    openCar(car.id);
  };
  document.querySelector("[data-what-listing-later]").onclick = () => {
    closeSheet();
    workCenterSnoozeV30(item.key, 3);
    toast("Primins po 3 dienų", "✓");
  };
  document.querySelector("[data-what-listing-dismiss]").onclick = () => {
    closeSheet();
    workCenterDismissV30(item.key);
    toast("Šis pasiūlymas daugiau nebus rodomas", "✓");
  };
}
function openWhatStatusV30(item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  if (!car) return;
  const isTa = item.statusKind === "ta",
    statusKey = isTa ? "taStatus" : "insuranceStatus",
    dateKey = isTa ? "taUntil" : "insuranceUntil",
    label = isTa ? "TA" : "Draudimas";
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Atnaujinti: ${label}</strong></div><div class="field"><label>Būsena</label><select class="input" id="whatStatusV30">${vehicleStatusOptions(car[statusKey] || "unknown")}</select></div><div class="field"><label>Galioja iki</label><input class="input" id="whatStatusDateV30" type="date" value="${escapeHTML(car[dateKey] || "")}"></div><button class="btn whatPrimaryV30" id="whatSaveStatusV30" type="button">Išsaugoti</button></section>`
  );
  document.getElementById("whatSaveStatusV30").onclick = () => {
    const car = whatFreshV74("cars", item.id);
    if (!car) return;
    const st = document.getElementById("whatStatusV30").value,
      date = document.getElementById("whatStatusDateV30").value;
    if (st === "unknown") {
      toast("Pasirink būseną", "!");
      return;
    }
    car[statusKey] = st;
    car[dateKey] = st === "valid" ? date : "";
    saveState();
    closeSheet();
    render();
    toast(`${label} atnaujinta`, "✓");
  };
}
function openWhatPriceV30(item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  if (!car) return;
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Peržiūrėti pardavimo kainą</strong></div><div class="field"><label>Planuojama pardavimo kaina, €</label><input class="input" id="whatPriceV30" type="number" min="0" step="1" value="${escapeHTML(car.askingPrice ?? "")}"></div><button class="btn whatPrimaryV30" id="whatSavePriceV30" type="button">Išsaugoti</button></section>`
  );
  document.getElementById("whatSavePriceV30").onclick = () => {
    const car = whatFreshV74("cars", item.id);
    if (!car) return;
    const n = Number(document.getElementById("whatPriceV30").value);
    if (!Number.isFinite(n) || n <= 0) {
      toast("Įrašyk kainą", "!");
      return;
    }
    car.askingPrice = n;
    saveState();
    closeSheet();
    render();
    toast("Kaina atnaujinta", "✓");
  };
}
function openWhatAccountingV30(item) {
  const car = (state.cars || []).find(c => c.id === item.id);
  if (!car) return;
  const queued = accountingQueueHas(car.id);
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(car.name)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Buhalterija</strong><span>${(car.documents || []).length} dokumentai</span></div><div class="whatChoiceListV30"><button type="button" data-what-accounting-send><b>↗</b><span><strong>Teikti buhalterei dabar</strong></span></button><button type="button" data-what-accounting-queue><b>▤</b><span><strong>${queued ? "Pašalinti iš savaitės paketo" : "Pridėti į savaitės paketą"}</strong></span></button><button type="button" data-what-accounting-later><b>⌛</b><span><strong>Vėliau</strong><small>Priminti po 3 dienų</small></span></button></div></section>`
  );
  document.querySelector("[data-what-accounting-send]").onclick = async () => {
    const car = whatFreshV74("cars", item.id);
    if (!car) return;
    closeSheet();
    await shareAccountingCars([car], "automobilis");
  };
  document.querySelector("[data-what-accounting-queue]").onclick = () => {
    closeSheet();
    toggleAccountingQueue(item.id);
  };
  document.querySelector("[data-what-accounting-later]").onclick = () => {
    closeSheet();
    workCenterSnoozeV30(item.key, 3);
    toast("Primins po 3 dienų", "✓");
  };
}
function openWhatLeadV30(item) {
  const lead = (state.leadVariants || []).find(l => l.id === item.id);
  if (!lead) return;
  const phone = String(lead.phone || "").trim(),
    tel = phone.replace(/[^+0-9]/g, "");
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(item.entity)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>Paskambinti pardavėjui</strong>${phone ? `<span>${escapeHTML(phone)}</span>` : "<span>Telefono numerio nėra.</span>"}</div><div class="whatChoiceListV30">${phone ? `<a class="whatCallLinkV30" href="tel:${escapeHTML(tel)}" data-what-lead-call><b>☎</b><span><strong>Skambinti dabar</strong></span></a>` : ""}<button type="button" data-what-lead-open><b>›</b><span><strong>Atidaryti variantą</strong></span></button><button type="button" data-what-lead-later><b>⌛</b><span><strong>Vėliau</strong><small>Priminti po 3 dienų</small></span></button></div></section>`
  );
  const call = document.querySelector("[data-what-lead-call]");
  if (call)
    call.onclick = () => {
      const lead = whatFreshV74("leadVariants", item.id);
      if (!lead) return;
      lead.calls = Number(lead.calls || 0) + 1;
      lead.lastCalledAt = nowLabel();
      lead.updatedAt = nowLabel();
      lead.nextCallDate = addDaysISO(todayISO(), lead.followUpDays || 2);
      addHistory("Skambutis variantui", item.entity, "📞");
      saveState();
      setTimeout(() => {
        closeSheet();
        render();
      }, 120);
    };
  document.querySelector("[data-what-lead-open]").onclick = () => {
    closeSheet();
    openGarageLeadSheet(lead.id);
  };
  document.querySelector("[data-what-lead-later]").onclick = () => {
    closeSheet();
    workCenterSnoozeV30(item.key, 3);
    toast("Primins po 3 dienų", "✓");
  };
}
function openWhatManageV30(item) {
  if (!item) return;
  openSheet(
    `<div class="sheetHead"><h3>${escapeHTML(item.entity)}</h3><button class="closeBtn" type="button" data-what-close>✕</button></div><section class="whatQuickSheetV30"><div class="whatQuickTitleV30"><strong>${escapeHTML(item.action)}</strong></div><div class="whatSnoozeGridV30"><button type="button" data-what-snooze-days="1">Rytoj</button><button type="button" data-what-snooze-days="3">Po 3 d.</button><button type="button" data-what-snooze-days="7">Po savaitės</button></div><button class="whatDismissForeverV30" type="button" data-what-dismiss-forever>Atmesti · daugiau nerodyti</button></section>`
  );
  document.querySelectorAll("[data-what-snooze-days]").forEach(
    b =>
      (b.onclick = () => {
        closeSheet();
        workCenterSnoozeV30(item.key, Number(b.dataset.whatSnoozeDays));
        toast("Pasiūlymas atidėtas", "✓");
      })
  );
  document.querySelector("[data-what-dismiss-forever]").onclick = () => {
    closeSheet();
    workCenterDismissV30(item.key);
    toast("Pasiūlymas atmestas", "✓");
  };
}
function openWhatItemV30(item) {
  if (!item) return;
  if (item.actionType === "missing-data") return openWhatMissingDataV30(item);
  if (item.actionType === "missing-docs") return openWhatDocsV30(item);
  if (item.actionType === "listing") return openWhatListingV30(item);
  if (item.actionType === "status") return openWhatStatusV30(item);
  if (item.actionType === "price-review") return openWhatPriceV30(item);
  if (item.actionType === "accounting") return openWhatAccountingV30(item);
  if (item.kind === "car") return openCar(item.id);
  if (item.kind === "lead") return openWhatLeadV30(item);
  if (item.kind === "customer") return openCustomer(item.id);
  if (item.kind === "task") return openWhatTaskV74(item);
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-garage-what-back]")) {
    companyGo("garage");
    return;
  }
  if (e.target.closest("[data-what-close]")) {
    closeSheet();
    return;
  }
  const manage = e.target.closest("[data-what-manage]");
  if (manage) {
    e.preventDefault();
    e.stopPropagation();
    openWhatManageV30(garageWhatItemV30(manage.dataset.whatManage));
    return;
  }
  const open = e.target.closest("[data-what-open]");
  if (open) {
    e.preventDefault();
    openWhatItemV30(garageWhatItemV30(open.dataset.whatOpen));
    return;
  }
});
