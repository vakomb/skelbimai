// v81: Kontekstinė pagalba. Prie pagrindinių funkcijų – mažas „?“ (HelpCircle tipo piktograma). Paspaudus telefone
// iš apačios išslenka pagalbos langas (60–85 % ekrano aukščio, su rankenėle – galima nutempti žemyn), planšetėje ir
// kompiuteryje – centruotas langas dviem stulpeliais. Viduje: „Kaip tai veikia“, „Žingsniai kelyje“ ir gyvas, vien
// CSS sukurtas telefono maketas su tuo pačiu ekranu – paspaudus žingsnį, makete paryškinama tiksli vieta.
// Viešas API: window.AutoEasierHelp.open("sutartys") / .close() / .topics. Mygtukai „?“ įterpiami automatiškai
// (AH_ANCHORS_V81) ir atsiranda iš naujo, kai ekranas perpiešiamas. Pagalbos langas – atskiras sluoksnis virš visko,
// todėl atidarytas langas (pvz. pildoma sutartis) neuždaromas ir duomenys neprarandami.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const AH_SVG_V81 = {
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.25"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4"/><path d="M12 17.2h.01"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h4"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M7.5 12h9"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></svg>',
  minus:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg>',
  tasks:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6.8 1.7 1.7L9 5.2"/><path d="M12.5 7h7.5"/><path d="m4 12.8 1.7 1.7L9 11.2"/><path d="M12.5 13h7.5"/><path d="M5 18.5h3.5M12.5 18.5h7.5"/></svg>',
  zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V13h3v7zM10.5 20V8h3v12zM17 20V4h3v16z"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.2V5a1.5 1.5 0 0 1 1.5-1.5h7.2l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-7.1 7.1a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8.3" cy="8.3" r="1.4"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.6-3.8 3.1-5.8 7-5.8s6.4 2 7 5.8"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2 5 6v5.2c0 4.4 3 7.9 7 9.3 4-1.4 7-4.9 7-9.3V6z"/><path d="M12 8v5M9.5 10.5h5"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/></svg>',
  camera:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 8.5h3l1.5-2h6l1.5 2h3v10h-15z"/><circle cx="12" cy="13.2" r="3.2"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5 12 19.5a5 5 0 0 1-7-7L13.5 4a3.3 3.3 0 0 1 4.7 4.7L10 17a1.7 1.7 0 0 1-2.4-2.4L15 7.4"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 16.5V13l1.7-4.6A2 2 0 0 1 8.6 7h6.8a2 2 0 0 1 1.9 1.4L19 13v3.5"/><path d="M4 13h16v3.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V16h-9v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.8h2.6l1.4 4-1.9 1.3a10.5 10.5 0 0 0 6.3 6.3l1.3-1.9 4 1.4v2.6a1.8 1.8 0 0 1-2 1.8A16 16 0 0 1 4.7 5.8a1.8 1.8 0 0 1 1.8-2z"/></svg>',
  cloud:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 18.5a4.5 4.5 0 0 1-.6-9 5.5 5.5 0 0 1 10.6 1.5 3.8 3.8 0 0 1-.5 7.5z"/></svg>'
};

// ---------- Maketo detalės (mažas telefono ekranas) ----------
const mkHlV81 = hl => (hl ? ` data-hl="${hl}"` : "");
function mkStatusV81() {
  return '<div class="mStat"><b>9:41</b><i></i></div>';
}
function mkSheetHeadV81(title) {
  return `<div class="mSheetHead"><b>${title}</b><span class="mX">${AH_SVG_V81.close}</span></div>`;
}
function mkPanelHeadV81(title, close = "Uždaryti") {
  return `<div class="mPanelHead"><b>${title}</b><span class="mPill">${close}</span></div>`;
}
function mkFieldV81(label, value, hl, cls = "") {
  return `<div class="mField ${cls}"${mkHlV81(hl)}><span>${label}</span><div class="mInput">${value || "&nbsp;"}</div></div>`;
}
function mkSelectV81(label, value, hl, cls = "") {
  return `<div class="mField mSelect ${cls}"${mkHlV81(hl)}><span>${label}</span><div class="mInput">${value}<i></i></div></div>`;
}
function mkSegV81(options, active, hl, label = "") {
  return `<div class="mSegWrap"${mkHlV81(hl)}>${label ? `<span class="mLabel">${label}</span>` : ""}<div class="mSeg">${options
    .map((o, i) => `<span class="${i === active ? "on" : ""}">${o}</span>`)
    .join("")}</div></div>`;
}
function mkBtnV81(text, hl, cls = "") {
  return `<div class="mBtn ${cls}"${mkHlV81(hl)}>${text}</div>`;
}
function mkPlateV81(plate) {
  return `<span class="mPlate"><i>LT</i>${plate}</span>`;
}
function mkTileV81(icon, label, hl, badge = "") {
  return `<div class="mTile"${mkHlV81(hl)}><span class="mTileIco">${icon}</span><b>${label}</b>${
    badge ? `<em class="mBadge">${badge}</em>` : ""
  }<span class="mChev"></span></div>`;
}
function mkCarCardV81({ name, plate, buy, exp, cost, hl = "", delta = "", deltaTone = "", expHl = "" }) {
  return `<div class="mCar"${mkHlV81(hl)}><div class="mCarPhoto">${AH_SVG_V81.car}</div><div class="mCarInfo"><b>${name}</b>${mkPlateV81(
    plate
  )}<div class="mFacts"><div><span>Pirkta</span><b>${buy}</b></div><div${mkHlV81(expHl)}><span>Išlaidos</span><b>${exp}</b></div><div><span>Savikaina</span><b>${cost}</b></div></div>${
    delta ? `<em class="mDelta ${deltaTone}">${delta}</em>` : ""
  }</div></div>`;
}
function mkBannerV81(badge, hl) {
  return `<div class="mBanner"${mkHlV81(hl)}><span class="mBannerIco">${AH_SVG_V81.user}${
    badge ? `<em class="mBadge">${badge}</em>` : ""
  }</span><b>Vadybininkas</b><span class="mChev light"></span></div>`;
}
function mkScreenV81(id, inner, cls = "") {
  return `<div class="mScr ${cls}" data-scr="${id}">${mkStatusV81()}<div class="mBody">${inner}</div></div>`;
}
function mkAppHeadV81() {
  return '<div class="mAppHead"><b>Auto<i>Easier</i></b><span class="mOrg"><i></i>VISUREIGIAI, UAB</span></div>';
}
function mkMoneyFormV81({ title, amount, cat, note, file, hlPrefix = "" }) {
  return `<div class="mCard mWork">${mkPanelHeadV81(title)}
    ${mkFieldV81("Data", "2026-10-28")}
    ${mkFieldV81("Suma, €", amount, `${hlPrefix}amount`)}
    ${mkSelectV81("Kategorija", cat, `${hlPrefix}cat`)}
    ${mkSelectV81("Automobilis", "Nissan X-Trail", `${hlPrefix}car`)}
    ${mkFieldV81("Pastaba", note)}
    <div class="mAttach"${mkHlV81(`${hlPrefix}file`)}>${AH_SVG_V81.clip}<b>${file}</b></div>
    ${mkBtnV81("Išsaugoti", `${hlPrefix}save`)}
  </div>`;
}

// ---------- Temos ----------
const AH_TOPICS_V81 = {
  sutartys: {
    title: "Sutarties generavimas",
    icon: AH_SVG_V81.doc,
    lead: "Pirkimo–pardavimo sutartis oficialia Regitros forma ir abiejų šalių parašai – tiesiai įrenginyje.",
    how: [
      "Programa užpildo oficialią Regitros pirkimo–pardavimo sutarties formą ir sukuria PDF pačiame įrenginyje – nereikia nei interneto, nei kitų programų.",
      "Pasirinkus automobilį iš garažo, markė, modelis, VIN, valstybinis numeris, rida ir SDK paimami iš kortelės. Ko trūksta – įrašote arba nuskenuojate liudijimą.",
      "Kaina žodžiais surašoma automatiškai, pvz., „keturi tūkstančiai penki šimtai eurų 00 ct“.",
      "Pirkėjas ir pardavėjas pasirašo pirštu ar rašikliu ekrane. Parašai įdedami sutartyje dešinėje nuo vardų.",
      "„Siųsti“, „Peržiūrėti“ ir „Atsisiųsti į įrenginį“ atsirakina tik tada, kai abi šalys pasirašė ir parašai patalpinti. Pasirašyta sutartis prisegama prie automobilio kortelės.",
      "„Siųsti“ atveria įrenginio dalinimosi meniu: Viber, WhatsApp, el. paštas ar „Failai“."
    ],
    steps: [
      {
        text: "Garaže spauskite „Generuoti sutartį“ ir pasirinkite automobilį – jo duomenys užsipildys patys.",
        scr: "a",
        hl: "car"
      },
      { text: "Pažymėkite, ar jūsų įmonė automobilį perka, ar parduoda.", scr: "a", hl: "role" },
      { text: "Įrašykite kainą – žodžiais ją surašysime patys.", scr: "a", hl: "price" },
      { text: "Įveskite kitos šalies duomenis ir spauskite „Sukurti sutartį“.", scr: "a", hl: "create" },
      {
        text: "Spauskite „Pasirašyti pirkėjui“ ir „Pasirašyti pardavėjui“ – pasirašius mygtukas pažaliuoja.",
        scr: "b",
        hl: "signs"
      },
      { text: "Spauskite „Patalpinti parašus“ – parašai atsiras sutartyje.", scr: "b", hl: "place" },
      { text: "Spauskite „Siųsti“ ir pasirinkite Viber, WhatsApp arba el. paštą.", scr: "c", hl: "send" }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        `<div class="mSheet">${mkSheetHeadV81("Pirkimo–pardavimo sutartis")}
          <div class="mCard">${mkSelectV81("Automobilis", "Nissan X-Trail · ABC123", "car")}${mkSegV81(["Perka", "Parduoda"], 0, "role", "Mano įmonė")}</div>
          <div class="mCard">${mkFieldV81("Kaina, €", "4 500", "price")}<div class="mGrid2">${mkFieldV81("Data", "2026-10-28")}${mkFieldV81("Laikas", "14:30")}</div></div>
          <div class="mCard">${mkSegV81(["Pildys ranka", "Pildyti dabar"], 1, "", "Pardavėjo duomenys")}${mkFieldV81("Vardas, pavardė", "Jonas Jonaitis")}</div>
          ${mkBtnV81("Sukurti sutartį", "create", "big")}
        </div>`
      ) +
      mkScreenV81(
        "b",
        `<div class="mDim"></div><div class="mDone">
          <span class="mDoneIco mDocIcoV82">${AH_SVG_V81.doc}</span>
          <b>Sutartis sukurta</b><span class="mMuted">PP-20261028-01</span>
          <div class="mPaper"><i></i><i></i><i class="w60"></i><em>keturi tūkstančiai penki šimtai eurų 00 ct</em><i></i><i class="w40"></i></div>
          <div class="mSignRowV82"${mkHlV81("signs")}><span class="mSignV82 on">${AH_SVG_V81.check}Pasirašyti pirkėjui</span><span class="mSignV82 on">${AH_SVG_V81.check}Pasirašyti pardavėjui</span></div>
          <div class="mPlaceV82"${mkHlV81("place")}>Patalpinti parašus</div>
          <div class="mLockedV82">${mkBtnV81("Siųsti", "")}<div class="mGrid2">${mkBtnV81("Peržiūrėti", "", "ghostLine")}${mkBtnV81("Atsisiųsti į įrenginį", "", "ghostLine")}</div></div>
        </div>`
      ) +
      mkScreenV81(
        "c",
        `<div class="mDim"></div><div class="mDone">
          <span class="mDoneIco">${AH_SVG_V81.check}</span>
          <b>Sutartis pasirašyta</b><span class="mMuted">PP-20261028-01 · prisegta prie automobilio</span>
          <div class="mSignRowV82"><span class="mSignV82 on">${AH_SVG_V81.check}Pasirašyti pirkėjui</span><span class="mSignV82 on">${AH_SVG_V81.check}Pasirašyti pardavėjui</span></div>
          <div class="mPlaceV82 done">${AH_SVG_V81.check}Parašai patalpinti</div>
          ${mkBtnV81("Siųsti", "send")}<div class="mGrid2 mFullV82">${mkBtnV81("Peržiūrėti", "", "ghostLine")}${mkBtnV81("Atsisiųsti į įrenginį", "", "ghostLine")}</div>
          <div class="mShare"><span><i class="v">V</i>Viber</span><span><i class="w">W</i>WhatsApp</span><span><i class="m">@</i>Paštas</span><span><i class="f">${AH_SVG_V81.folder}</i>Failai</span></div>
        </div>`
      )
  },
  skeneris: {
    title: "Registracijos liudijimo skeneris",
    icon: AH_SVG_V81.scan,
    lead: "Nufotografuokite registracijos liudijimą – automobilio duomenys užsipildys patys.",
    how: [
      "Tekstas atpažįstamas pačiame telefone – atpažinimui nuotrauka niekur nesiunčiama. Pirmą kartą reikia interneto: atsisiunčiamas atpažinimo modulis.",
      "Atpažįstama: markė, modelis, liudijimo ir valstybinis numeriai, VIN, pirmosios registracijos ir registracijos Lietuvoje datos, modelio metai, variklio tūris, galia (kW) ir kuras.",
      "Veikia su naujo (pvz., K1234567) ir seno tipo Lietuvos liudijimais, net jei nuotrauka šiek tiek kreiva ar ne visai ryški.",
      "Paprastai užtrunka kelias sekundes. Prieš išsaugodami visus laukus galite patikrinti ir pataisyti.",
      "Tas pats skeneris veikia kuriant naują automobilį, redaguojant kortelę ir generuojant sutartį."
    ],
    steps: [
      { text: "Garaže spauskite „Pridėti automobilį“, tada „Fotografuoti“.", scr: "a", hl: "photo" },
      {
        text: "Padėkite liudijimą ant lygaus paviršiaus – kad tilptų visas ir neatspindėtų šviesa.",
        scr: "b",
        hl: "frame"
      },
      { text: "Palaukite kelias sekundes, kol tekstas bus atpažintas.", scr: "b", hl: "progress" },
      { text: "Patikrinkite užpildytus laukus ir, jei reikia, pataisykite.", scr: "c", hl: "fields" },
      { text: "Įrašykite pirkimo kainą ir išsaugokite automobilį.", scr: "c", hl: "save" }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        `${mkAppHeadV81()}<div class="mCard mWork">${mkPanelHeadV81("Pridėti automobilį")}
          <div class="mReg"><div class="mRegHead"><span class="mRegIco">${AH_SVG_V81.doc}</span><b>Registracijos liudijimas</b></div>
          <div class="mGrid2">${mkBtnV81(`${AH_SVG_V81.camera}Fotografuoti`, "photo", "sm")}${mkBtnV81("Iš galerijos", "", "sm ghostLine")}</div></div>
          <div class="mGrid2">${mkFieldV81("Markė", "")}${mkFieldV81("Modelis", "")}</div>
          <div class="mGrid2">${mkFieldV81("Liudijimo nr.", "")}${mkFieldV81("Valst. numeris", "")}</div>
          ${mkFieldV81("VIN", "")}
        </div>`
      ) +
      mkScreenV81(
        "b",
        `<div class="mCam"><div class="mCamFrame"${mkHlV81("frame")}><div class="mCert"><i class="t"></i><i></i><i class="s"></i><i></i><i class="s"></i><i></i></div><span class="c1"></span><span class="c2"></span><span class="c3"></span><span class="c4"></span></div>
        <div class="mScanCard"${mkHlV81("progress")}><span class="mSpin"></span><div><b>Skaitomas liudijimas…</b><div class="mBar"><i></i></div></div></div></div>`,
        "dark"
      ) +
      mkScreenV81(
        "c",
        `${mkAppHeadV81()}<div class="mCard mWork">${mkPanelHeadV81("Pridėti automobilį")}
          <div class="mFilled"${mkHlV81("fields")}>
            <div class="mGrid2">${mkFieldV81("Markė", "NISSAN", "", "ok")}${mkFieldV81("Modelis", "X-TRAIL", "", "ok")}</div>
            <div class="mGrid2">${mkFieldV81("Liudijimo nr.", "K1234567", "", "ok")}${mkFieldV81("Valst. numeris", "ABC123", "", "ok")}</div>
            ${mkFieldV81("VIN", "JN1TANT31U0000001", "", "ok mono")}
            <div class="mGrid2">${mkFieldV81("Pirmoji registracija", "2008-03-14", "", "ok")}${mkFieldV81("Galia, kW", "104", "", "ok")}</div>
            <div class="mGrid2">${mkFieldV81("Tūris, cm³", "1998", "", "ok")}${mkFieldV81("Kuras", "Dyzelinas", "", "ok")}</div>
          </div>
          ${mkFieldV81("Pirkimo kaina, €", "4 500")}
          ${mkBtnV81("Išsaugoti automobilį", "save")}
        </div>`
      )
  },
  pajamos: {
    title: "Įplauka automobiliui",
    icon: AH_SVG_V81.plus,
    lead: "Įplauka, priskirta automobiliui, iš karto pakeičia jo savikainą ir būsimą pelną.",
    how: [
      "Kiekviena įplauka įrašoma į Finansus ir padidina pinigų likutį.",
      "Pasirinkus automobilį, įplauka (pvz., grąžinimas už detalę) sumažina to automobilio išlaidas ir savikainą – pardavus, pelnas bus didesnis.",
      "Pasirinkus „Įmonės“, įplauka lieka bendra ir automobilių neliečia.",
      "Kategorijos: įmonės papildymas, grąžinimas arba kita įplauka.",
      "Prisegtas dokumentas patenka į buhalterijos ZIP ataskaitą kartu su įplauka."
    ],
    steps: [
      { text: "Buhalterijoje spauskite „Pridėti įplauką“ ir įrašykite sumą.", scr: "a", hl: "amount" },
      {
        text: "Pasirinkite kategoriją: Įmonės papildymas, Grąžinimas arba Kita įplauka.",
        scr: "a",
        hl: "cat"
      },
      {
        text: "Lauke „Automobilis“ pasirinkite, kuriam automobiliui priklauso įplauka.",
        scr: "a",
        hl: "car"
      },
      { text: "Prisekite dokumentą, jei jį turite.", scr: "a", hl: "file" },
      { text: "Spauskite „Išsaugoti“.", scr: "a", hl: "save" },
      { text: "Automobilio savikaina sumažėja iš karto – Garaže matysite naują sumą.", scr: "b", hl: "cost" }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        mkMoneyFormV81({
          title: "Pridėti įplauką",
          amount: "120",
          cat: "Grąžinimas",
          note: "Grąžinta už detalę",
          file: "Prisegti dokumentą"
        })
      ) +
      mkScreenV81(
        "b",
        `${mkAppHeadV81()}<span class="mSection">Aktyvūs automobiliai</span>${mkCarCardV81({
          name: "Nissan X-Trail",
          plate: "ABC123",
          buy: "4 500 €",
          exp: "340 €",
          cost: "4 840 €",
          hl: "cost",
          delta: "−120 € savikaina",
          deltaTone: "good"
        })}${mkCarCardV81({ name: "Audi Q5", plate: "LKM220", buy: "9 000 €", exp: "0 €", cost: "9 000 €" })}`
      )
  },
  islaidos: {
    title: "Išlaida automobiliui",
    icon: AH_SVG_V81.minus,
    lead: "Kiekvienas euras, išleistas automobiliui, iš karto patenka į jo savikainą.",
    how: [
      "Kategorijos: kuras, servisas, detalės, transportas, plovimas, reklama, mokesčiai ir kita.",
      "Pasirinkus automobilį, išlaida pridedama prie jo „Išlaidų“ ir savikainos – matote tikrą kainą, kiek automobilis jums kainavo.",
      "Savikaina naudojama visur: automobilio kortelėje, pardavimo pelne, statistikoje ir ataskaitose.",
      "Automobilio užduoties išlaida (pvz., „Plovimas – 25 €“) į savikainą patenka pati – antrą kartą jos vesti nereikia.",
      "Čekį prisekite iš karto – jis pateks į ZIP ataskaitą buhalterei."
    ],
    steps: [
      { text: "Buhalterijoje spauskite „Pridėti išlaidą“ ir įrašykite sumą.", scr: "a", hl: "amount" },
      {
        text: "Pasirinkite kategoriją – kuras, servisas, detalės, transportas, plovimas ir kt.",
        scr: "a",
        hl: "cat"
      },
      { text: "Pasirinkite automobilį – išlaida bus priskirta jam.", scr: "a", hl: "car" },
      { text: "Spauskite „Prisegti čekį / dokumentą“ ir nufotografuokite čekį.", scr: "a", hl: "file" },
      { text: "Spauskite „Išsaugoti“.", scr: "a", hl: "save" },
      { text: "Automobilio išlaidos ir savikaina pasikeičia iš karto.", scr: "b", hl: "cost" }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        mkMoneyFormV81({
          title: "Pridėti išlaidą",
          amount: "120",
          cat: "Transportas",
          note: "Atvežimas iš Kauno",
          file: "Prisegti čekį / dokumentą"
        })
      ) +
      mkScreenV81(
        "b",
        `${mkAppHeadV81()}<span class="mSection">Aktyvūs automobiliai</span>${mkCarCardV81({
          name: "Nissan X-Trail",
          plate: "ABC123",
          buy: "4 500 €",
          exp: "145 €",
          cost: "4 645 €",
          hl: "cost",
          delta: "+120 € savikaina",
          deltaTone: "bad"
        })}${mkCarCardV81({ name: "Audi Q5", plate: "LKM220", buy: "9 000 €", exp: "0 €", cost: "9 000 €" })}`
      )
  },
  uzduotys: {
    title: "Užduotys ir čekiai",
    icon: AH_SVG_V81.tasks,
    lead: "Atlikite užduotį ir prisekite čekį dar prie kasos – nė viena išlaida nepasimes.",
    how: [
      "Kiekvienas automobilis turi savo užduočių sąrašą su terminais. Vėluojančios užduotys pažymimos raudonai.",
      "Paspaudus apskritimą prie užduoties, atsiranda laukai „Kaina“ ir „Prisegti čekį“. Įvedus kainą ir prisegus čekį, užduotis pažymima atlikta pati.",
      "Užduotį su kaina pažymėti atlikta galima tik prisegus čekį – taip nė viena išlaida nelieka be dokumento.",
      "Išlaida su čekiu iš karto patenka į Buhalteriją ir automobilio savikainą.",
      "Kasos čekiai spausdinami ant terminio popieriaus, kuris laikui bėgant blunka. Nuotrauka išsaugo įskaitomą kopiją buhalterei ir mokesčių patikrinimui. Popierinių originalų saugojimą suderinkite su buhaltere."
    ],
    steps: [
      {
        text: "Automobilio kortelėje spauskite „Nauja užduotis“ – įrašykite darbą ir terminą.",
        scr: "a",
        hl: "add"
      },
      { text: "Atlikę darbą, paspauskite apskritimą prie užduoties.", scr: "a", hl: "task" },
      { text: "Įrašykite, kiek kainavo.", scr: "b", hl: "amount" },
      { text: "Spauskite „Prisegti čekį“ ir nufotografuokite jį prie kasos.", scr: "b", hl: "receipt" },
      {
        text: "Užduotis pažymima atlikta, o išlaida su čekiu atsiranda Buhalterijoje ir savikainoje.",
        scr: "c",
        hl: "done"
      }
    ],
    mock: () => {
      const head = `${mkSheetHeadV81("Nissan X-Trail")}<div class="mCard"><div class="mBlockHead"><b>Užduotys</b><em>1/3</em></div><div class="mProg"><i></i></div>`;
      return (
        mkScreenV81(
          "a",
          `<div class="mSheet">${head}
            <div class="mTask late"${mkHlV81("task")}><span class="mCircle"></span><div><b>Stabdžių kaladėlės</b><em>Vėluoja 8 d.</em></div></div>
            <div class="mTask"><span class="mCircle"></span><div><b>Nuotraukos skelbimui</b><em class="today">Šiandien</em></div></div>
            ${mkBtnV81("+ Nauja užduotis", "add", "soft")}</div></div>`
        ) +
        mkScreenV81(
          "b",
          `<div class="mSheet">${head}
            <div class="mTask late open"><span class="mCircle"></span><div><b>Stabdžių kaladėlės</b><em>Vėluoja 8 d.</em></div></div>
            <div class="mDoneForm"><div class="mGrid2"><div class="mAmount"${mkHlV81("amount")}><span>Kaina</span><b>85</b><em>€</em></div><div class="mAttach sm"${mkHlV81("receipt")}>${AH_SVG_V81.clip}<b>Prisegti čekį</b></div></div>
            <span class="mHint">Įvedus kainą ir prisegus čekį – atlikta automatiškai</span>
            <div class="mGrid2">${mkBtnV81("Atšaukti", "", "ghost sm")}${mkBtnV81("Atlikta", "", "sm")}</div></div>
            <div class="mTask"><span class="mCircle"></span><div><b>Nuotraukos skelbimui</b><em class="today">Šiandien</em></div></div></div></div>`
        ) +
        mkScreenV81(
          "c",
          `<div class="mSheet">${mkSheetHeadV81("Nissan X-Trail")}<div class="mCard"><div class="mBlockHead"><b>Užduotys</b><em>2/3</em></div><div class="mProg p2"><i></i></div>
            <div class="mTask"><span class="mCircle"></span><div><b>Nuotraukos skelbimui</b><em class="today">Šiandien</em></div></div>
            <div class="mTask done"${mkHlV81("done")}><span class="mCircle">${AH_SVG_V81.check}</span><div><b>Stabdžių kaladėlės</b><em>85 € · čekis prisegtas</em></div></div></div>
            <div class="mToast">${AH_SVG_V81.check}Atlikta · 85 € į Buhalteriją</div></div>`
        )
      );
    }
  },
  ataskaitos: {
    title: "Ataskaita buhalterei",
    icon: AH_SVG_V81.zip,
    lead: "Vienas ZIP failas su visais laikotarpio įrašais, lentelėmis ir čekiais – buhalterei nebereikia nieko ieškoti.",
    how: [
      "Pasirinkite laikotarpį – į ZIP pateks tik to laikotarpio įrašai, dokumentai ir čekiai.",
      "ZIP faile: suvestinė, išlaidų ir įplaukų lentelė bei automobilių lentelė (CSV, atsidaro Excel), kiekvieno automobilio aplankas su sutartimis bei dokumentais ir visi prisegti čekiai.",
      "Viršuje matote laikotarpio pajamas, išlaidas, įrašų ir čekių skaičių – iš karto aišku, ar nieko netrūksta.",
      "Skiltis „Laukia pateikimo“ rodo, kurių dokumentų dar trūksta prie kiekvieno automobilio.",
      "Telefone ZIP išsiunčiamas per dalinimosi meniu: el. paštu, per Viber arba išsaugomas „Failuose“. Kompiuteryje ZIP atsisiunčiamas ir atsidaro laiškas buhalterei. Buhalterės el. paštą įrašykite Nustatymuose."
    ],
    steps: [
      { text: "Buhalterijoje spauskite „Ataskaitos“ ir pasirinkite laikotarpį.", scr: "a", hl: "period" },
      { text: "Patikrinkite pajamas, išlaidas ir kiek čekių prisegta.", scr: "a", hl: "stats" },
      { text: "Spauskite „Paruošti ZIP ataskaitą“.", scr: "a", hl: "zip" },
      {
        text: "ZIP faile rasite suvestinę, lenteles Excel'iui, automobilių dokumentus ir visus čekius.",
        scr: "b",
        hl: "files"
      },
      { text: "Išsiųskite buhalterei el. paštu arba išsaugokite „Failuose“.", scr: "b", hl: "share" }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        `${mkAppHeadV81()}<div class="mCard mWork">${mkPanelHeadV81("Ataskaitos")}
          <span class="mChip">2026-10-01 – 2026-10-31</span>
          <div class="mPeriod"${mkHlV81("period")}><span>Šiandien</span><span>Ši savaitė</span><span class="on">Šis mėnuo</span><span>Laikotarpis</span></div>
          <div class="mStats"${mkHlV81("stats")}><div><span>Pajamos</span><b>12 400 €</b></div><div><span>Išlaidos</span><b>3 180 €</b></div><div><span>Įrašai</span><b>46</b></div><div><span>Dok. / čekiai</span><b>31</b></div></div>
          <span class="mInfo">Į ZIP bus įtraukti tik šio laikotarpio duomenys ir dokumentai.</span>
          ${mkBtnV81("Paruošti ZIP ataskaitą", "zip", "big")}
        </div>`
      ) +
      mkScreenV81(
        "b",
        `<div class="mCard mZip"${mkHlV81("files")}><div class="mZipHead"><span class="mZipIco">ZIP</span><div><b>Ataskaita-2026-10-01-2026-10-31.zip</b><span class="mMuted">2,4 MB</span></div></div>
          <div class="mFile">${AH_SVG_V81.file}00-Ataskaitos-suvestine.txt</div>
          <div class="mFile">${AH_SVG_V81.file}01-Islaidos-ir-iplaukos.csv</div>
          <div class="mFile">${AH_SVG_V81.file}02-Automobiliai.csv</div>
          <div class="mFile dir">${AH_SVG_V81.folder}Automobiliai</div>
          <div class="mFile dir">${AH_SVG_V81.folder}Finansiniai-dokumentai</div></div>
          <div class="mShareSheet"${mkHlV81("share")}><span class="mGrabber"></span><div class="mShare"><span><i class="m">@</i>Paštas</span><span><i class="v">V</i>Viber</span><span><i class="w">W</i>WhatsApp</span><span><i class="f">${AH_SVG_V81.folder}</i>Failai</span></div></div>`
      )
  },
  variantai: {
    title: "Variantai ir derybos",
    icon: AH_SVG_V81.tag,
    lead: "Visi automobiliai, kuriuos svarstote pirkti, ir priminimas paskambinti tinkamą dieną.",
    how: [
      "Variantas – automobilis, kurį svarstote pirkti: markė, modelis, metai, kuras, telefonas, miestas, TA, draudimas, defektai ir nuotraukos.",
      "Trys kainos: pradinė (ko prašo), mūsų siūlyta ir numatoma pardavimo. Kortelėje iš karto matote „Prašo“, „Siūlome“ ir galimą pelną.",
      "„Po kiek dienų skambinti“ nustato kito skambučio dieną. Paspaudus „Skambinti“, skambutis užregistruojamas, o kitas suplanuojamas po tiek pat dienų.",
      "Atėjus dienai, variantas atsiranda Vadybininke („Paskambinti pardavėjui“), o ant „Variantai“ plytelės – raudonas skaičius.",
      "Taip derėtis lengva: pardavėjas girdi jus reguliariai, o jūs nepamirštate nė vieno varianto."
    ],
    steps: [
      {
        text: "Garaže atidarykite „Variantai“ ir spauskite „Pridėti dominantį variantą“.",
        scr: "a",
        hl: "add"
      },
      { text: "Įrašykite automobilį ir pardavėjo telefoną.", scr: "b", hl: "phone" },
      {
        text: "Nurodykite tris kainas: ko prašo, ką siūlote ir už kiek parduotumėte.",
        scr: "b",
        hl: "prices"
      },
      {
        text: "„Po kiek dienų skambinti“ – pvz., 2. Tiek dienų programa lauks iki kito skambučio.",
        scr: "b",
        hl: "days"
      },
      {
        text: "Defektus ir tai, ką sakė pardavėjas, įrašykite pastabose. Spauskite „Įkelti variantą“.",
        scr: "b",
        hl: "notes"
      },
      {
        text: "Atėjus dienai, Vadybininkas primins. Spauskite „Skambinti“ – kitas skambutis susiplanuos pats.",
        scr: "c",
        hl: "remind"
      }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        `${mkAppHeadV81()}<div class="mCard mWork">${mkPanelHeadV81("Variantai")}
          <div class="mLead"><div class="mCarPhoto">${AH_SVG_V81.car}</div><div class="mCarInfo"><b>Mitsubishi Pajero</b><span class="mCall">${AH_SVG_V81.phone}Skambinti</span>
          <div class="mFacts"><div><span>Prašo</span><b>3 000 €</b></div><div><span>Siūlome</span><b>2 500 €</b></div><div><span>Pelnas</span><b class="good">+1 700 €</b></div></div></div></div>
          ${mkBtnV81("+ Pridėti dominantį variantą", "add", "big")}
        </div>`
      ) +
      mkScreenV81(
        "b",
        `<div class="mCard mWork mTight">${mkPanelHeadV81("Naujas variantas")}
          <div class="mGrid2">${mkFieldV81("Markė", "Toyota")}${mkFieldV81("Modelis", "RAV4")}</div>
          <div class="mGrid2"${mkHlV81("phone")}>${mkFieldV81("Tel. nr.", "+370 600 00000")}${mkFieldV81("Miestas", "Vilnius")}</div>
          <div class="mGrid2"${mkHlV81("prices")}>${mkFieldV81("Pradinė kaina", "6 200")}${mkFieldV81("Mūsų siūlyta kaina", "5 400")}</div>
          <div class="mGrid2">${mkFieldV81("Numatoma pardavimo", "7 500")}${mkFieldV81("Po kiek dienų skambinti", "2", "days")}</div>
          ${mkFieldV81("Defektai ir pastabos", "Kėbulas dažytas, prašo greito sprendimo", "notes", "area")}
          ${mkBtnV81("Įkelti variantą")}
        </div>`
      ) +
      mkScreenV81(
        "c",
        `${mkBannerV81("3")}<div class="mGrid2 mTiles">${mkTileV81(AH_SVG_V81.tasks, "Užduotys")}${mkTileV81(AH_SVG_V81.tag, "Variantai", "", "1")}</div>
        <div class="mRow"${mkHlV81("remind")}><span class="mRowIco">${AH_SVG_V81.phone}</span><div><em>Toyota RAV4</em><b>Paskambinti pardavėjui</b></div><span class="mTag today">Šiandien</span></div>
        <div class="mRow"><span class="mRowIco">${AH_SVG_V81.tasks}</span><div><em>Nissan X-Trail</em><b>Nuotraukos skelbimui</b></div><span class="mTag">Šiandien</span></div>`
      )
  },
  vadybininkas: {
    title: "Vadybininkas",
    icon: AH_SVG_V81.user,
    lead: "Vienas sąrašas, kuris kiekvieną dieną pasako, ką daryti pirmiausia.",
    how: [
      "Vadybininkas surenka darbus iš visos programos: vėluojančias užduotis, skambučius pardavėjams, trūkstamus automobilio duomenis ir dokumentus, TA ir draudimo pabaigą, kainų peržiūrą ir buhalterijos dokumentus.",
      "Darbai surikiuoti pagal svarbą. Vėluojantys ir šiandienos darbai visada viršuje, o kitų užduočių prioritetas – Skubu, Svarbu ar Normalu – nurodo, kuri svarbesnė.",
      "Svarbiausias darbas rodomas didelėje kortelėje „Svarbiausia dabar“.",
      "Raudonas skaičius ant „Vadybininkas“ mygtuko rodo, kiek darbų laukia.",
      "Paspaudus darbą, atsidaro langas, kuriame jį atliksite. „•••“ – atidėti rytojui, 3 dienoms, savaitei arba atmesti."
    ],
    steps: [
      {
        text: "Raudonas skaičius ant „Vadybininkas“ rodo, kiek darbų laukia. Atidarykite jį ryte.",
        scr: "a",
        hl: "badge"
      },
      { text: "Pradėkite nuo „Svarbiausia dabar“ – tai skubiausias darbas.", scr: "b", hl: "hero" },
      {
        text: "Žemiau – kiti darbai pagal svarbą: vėluojantys, šiandienos, tada Skubu, Svarbu ir Normalu.",
        scr: "b",
        hl: "list"
      },
      {
        text: "Paspaudę darbą, atliksite jį iš karto. Jei šiandien negalite – spauskite „•••“.",
        scr: "b",
        hl: "more"
      },
      { text: "Pasirinkite, kada priminti: rytoj, po 3 dienų ar po savaitės.", scr: "c", hl: "snooze" }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        `${mkAppHeadV81()}${mkBannerV81("7", "badge")}<div class="mGrid2 mTiles">${mkTileV81(AH_SVG_V81.tasks, "Užduotys", "", "3")}${mkTileV81(
          AH_SVG_V81.doc,
          "Generuoti sutartį"
        )}${mkTileV81(AH_SVG_V81.tag, "Variantai", "", "1")}${mkTileV81(AH_SVG_V81.plus, "Pridėti automobilį")}</div>
        <span class="mSection">Aktyvūs automobiliai</span>${mkCarCardV81({ name: "Nissan X-Trail", plate: "ABC123", buy: "4 500 €", exp: "25 €", cost: "4 525 €" })}`
      ) +
      mkScreenV81(
        "b",
        `<div class="mBackRow"><span class="mPill">Atgal</span></div>
        <div class="mHero"${mkHlV81("hero")}><span class="mHeroTag">Svarbiausia dabar</span><div class="mHeroPhoto">${AH_SVG_V81.car}<b>Nissan X-Trail</b></div><div class="mHeroBody"><b>Stabdžių kaladėlės</b><span>Vėluojanti automobilio užduotis</span><em>Vėluoja</em></div></div>
        <div class="mList"${mkHlV81("list")}>
          <div class="mRow"><span class="mRowIco">${AH_SVG_V81.phone}</span><div><em>Toyota RAV4</em><b>Paskambinti pardavėjui</b></div><span class="mTag today">Šiandien</span><span class="mMore"${mkHlV81("more")}>•••</span></div>
          <div class="mRow"><span class="mRowIco">${AH_SVG_V81.tasks}</span><div><em>Skambutis · Skubu</em><b>Paskambinti draudimui</b></div><span class="mTag late">Vėluoja</span><span class="mMore">•••</span></div>
          <div class="mRow"><span class="mRowIco">${AH_SVG_V81.doc}</span><div><em>Audi Q5</em><b>Užpildyti duomenis: VIN, rida</b></div><span class="mMore">•••</span></div>
        </div>`
      ) +
      mkScreenV81(
        "c",
        `<div class="mDim"></div><div class="mBottom"${mkHlV81("snooze")}><span class="mGrabber"></span>${mkSheetHeadV81("Toyota RAV4")}<b class="mBottomTitle">Paskambinti pardavėjui</b>
          <div class="mSnooze"><span>Rytoj</span><span>Po 3 d.</span><span>Po savaitės</span></div><span class="mDanger">Atmesti · daugiau nerodyti</span></div>`
      )
  },
  backup_skolos: {
    title: "Atsarginė kopija ir skolos",
    icon: AH_SVG_V81.cloud,
    lead: "Duomenys saugūs debesyje ir jūsų faile, o įmonės skolos partneriams – vienoje vietoje.",
    how: [
      "Prisijungus visi duomenys saugomi jūsų paskyroje debesyje ir sinchronizuojami tarp telefono, planšetės ir kompiuterio.",
      "„Atsarginė kopija“ atsisiunčia failą su visais duomenimis, nuotraukomis ir dokumentais. Laikykite jį saugioje vietoje.",
      "„Atkurti kopiją“ grąžina duomenis iš tokio failo. Dabartiniai įrašai pakeičiami kopijos duomenimis – prieš tai programa paklaus patvirtinimo.",
      "Skolos: įrašykite, kiek įmonė skolinga partneriui. „Pridėti skolą“ sumą didina, „Atimti skolą“ – mažina.",
      "Skolos sugrupuojamos pagal partnerį – matote likutį ir kiekvieno pakeitimo istoriją su data ir pastaba."
    ],
    steps: [
      {
        text: "Nustatymai → Duomenys: duomenys jau saugomi paskyroje ir sinchronizuojami.",
        scr: "a",
        hl: "cloud"
      },
      { text: "Spauskite „Atsarginė kopija“ – failas atsisiųs į jūsų įrenginį.", scr: "a", hl: "backup" },
      { text: "Prireikus spauskite „Atkurti kopiją“ ir pasirinkite failą.", scr: "a", hl: "restore" },
      {
        text: "Buhalterija → Finansai → „Skolos“: pasirinkite „Pridėti skolą“ arba „Atimti skolą“.",
        scr: "b",
        hl: "action"
      },
      { text: "Įrašykite partnerį, sumą ir pastabą, tada išsaugokite.", scr: "b", hl: "person" },
      { text: "Skolų sąraše matote kiekvieno partnerio likutį.", scr: "c", hl: "list" }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        `<div class="mCard mWork">${mkPanelHeadV81("Nustatymai")}<span class="mCaps">Duomenys</span>
          <div class="mInner"><b>Atsarginė kopija</b><span class="mMuted"${mkHlV81("cloud")}>${AH_SVG_V81.cloud}Duomenys saugomi jūsų paskyroje ir sinchronizuojami tarp įrenginių.</span>
          <div class="mGrid2">${mkBtnV81("Atsarginė kopija", "backup", "sm")}${mkBtnV81("Atkurti kopiją", "restore", "sm ghostLine")}</div></div>
          <div class="mInner mRowLine"><b>Ištrinti įmonės duomenis</b><span class="mPill">Ištrinti</span></div></div>`
      ) +
      mkScreenV81(
        "b",
        `<div class="mCard mWork">${mkPanelHeadV81("Finansai")}<div class="mFold"><span class="mFoldIco">€</span><b>Skolos</b></div>
          ${mkSelectV81("Veiksmas", "Pridėti skolą", "action")}
          <div${mkHlV81("person")}>${mkFieldV81("Kam skolinga įmonė", "Petras (kėbulas)")}${mkFieldV81("Suma", "1 000")}</div>
          ${mkFieldV81("Data", "2026-10-02")}${mkFieldV81("Pastaba", "Kėbulo remontas, BMW X5")}
          ${mkBtnV81("Išsaugoti skolos veiksmą")}</div>`
      ) +
      mkScreenV81(
        "c",
        `<div class="mCard mWork">${mkPanelHeadV81("Finansai")}<div class="mBlockHead"><b>Skolos</b><em>2 partneriai</em></div>
          <div class="mDebt"${mkHlV81("list")}><div class="mDebtTop"><b>Petras (kėbulas)</b><b>600 €</b></div><span>+1 000 € · 2026-10-02 · Kėbulo remontas</span><span>−400 € · 2026-10-20 · Sumokėta dalis</span></div>
          <div class="mDebt"><div class="mDebtTop"><b>UAB Detalės</b><b>230 €</b></div><span>+230 € · 2026-10-25 · Stabdžių diskai</span></div></div>`
      )
  },
  prenumerata: {
    title: "Prenumerata",
    icon: AH_SVG_V81.card,
    lead: "7 dienas nemokamai, paprastas mokėjimas ir atšaukimas bet kada.",
    how: [
      "Pirmos 7 dienos nemokamai – visos funkcijos be apribojimų.",
      "Pradedant nurodoma mokėjimo priemonė, bet pinigai nuskaičiuojami tik pasibaigus bandomajam laikotarpiui. Vėliau – 49 € per mėnesį.",
      "Mokama saugiai per Stripe: kortele, Apple Pay, Google Pay arba Revolut Pay. Rodomi tie būdai, kuriuos palaiko jūsų įrenginys.",
      "Atšaukti galima bet kada: Nustatymai → Prenumerata → „Valdyti prenumeratą“ → „Atšaukti prenumeratą“. Prenumerata galioja iki apmokėto laikotarpio pabaigos.",
      "Pasibaigus prenumeratai, duomenys neištrinami: programa veikia peržiūros režimu, kol prenumeratą atnaujinsite."
    ],
    steps: [
      {
        text: "Spauskite „Išbandyti 7 d. nemokamai“ – visos funkcijos atrakinamos iš karto.",
        scr: "a",
        hl: "cta"
      },
      {
        text: "Pasirinkite mokėjimo būdą: Apple Pay, Google Pay, Revolut Pay arba kortelę. Nuskaičiuojama tik po 7 dienų.",
        scr: "b",
        hl: "methods"
      },
      { text: "Nustatymai → Prenumerata: matote būseną ir kito mokėjimo datą.", scr: "c", hl: "status" },
      {
        text: "„Valdyti prenumeratą“ – pakeiskite kortelę ar peržiūrėkite sąskaitas.",
        scr: "c",
        hl: "manage"
      },
      {
        text: "„Atšaukti prenumeratą“ – ji galios iki apmokėto laikotarpio pabaigos.",
        scr: "d",
        hl: "cancel"
      }
    ],
    mock: () =>
      mkScreenV81(
        "a",
        `<div class="mDim light"></div><div class="mBottom tall"><span class="mGrabber"></span><b class="mPlanTitle">Profesionalus</b><span class="mMuted">Visas automobilių prekybos verslas vienoje vietoje.</span>
          <div class="mPlanPrice"><b>49 €</b><span>/ mėn.</span><em>7 d. nemokamai</em></div>
          <div class="mFeat">${AH_SVG_V81.check}Neribotas automobilių skaičius</div><div class="mFeat">${AH_SVG_V81.check}PP sutarčių generatorius</div><div class="mFeat">${AH_SVG_V81.check}Buhalterija ir ataskaitos</div>
          ${mkBtnV81("Išbandyti 7 d. nemokamai", "cta", "big")}<span class="mFine">7 dienas nemokamai, vėliau 49 € per mėn. Atšaukti galima bet kada.</span></div>`
      ) +
      mkScreenV81(
        "b",
        `<div class="mPay"><b class="mPayOrg">AutoEasier</b><span class="mMuted">Profesionalus</span><b class="mPayPrice">7 dienos nemokamai</b><span class="mMuted">Vėliau 49,00 € per mėnesį</span>
          <div class="mPayList"${mkHlV81("methods")}><span class="mPayBtn dark">Apple Pay</span><span class="mPayBtn">Google Pay</span><span class="mPayBtn rev">Revolut Pay</span><span class="mPayOr">arba kortele</span>${mkFieldV81("Kortelės numeris", "•••• •••• •••• 4242")}</div>
          ${mkBtnV81("Pradėti bandomąjį laikotarpį")}</div>`,
        "white"
      ) +
      mkScreenV81(
        "c",
        `<div class="mCard mWork">${mkPanelHeadV81("Nustatymai")}<span class="mCaps">Paskyra</span>
          <div class="mInner"><div class="mSubHead"${mkHlV81("status")}><b>Prenumerata</b><span class="mBadgeSoft">Bandomasis laikotarpis</span></div>
          <div class="mDl"><div><span>Planas</span><b>Profesionalus</b></div><div><span>Nemokamai iki</span><b>2026-11-04</b></div><div><span>Vėliau</span><b>49 € per mėn.</b></div></div>
          ${mkBtnV81("Valdyti prenumeratą", "manage", "sm")}</div></div>`
      ) +
      mkScreenV81(
        "d",
        `<div class="mPay"><b class="mPayOrg">AutoEasier</b><span class="mCaps">Dabartinis planas</span><div class="mInner"><b>Profesionalus</b><span class="mMuted">49,00 € per mėnesį · kitas mokėjimas 2026-11-04</span></div>
          <span class="mPayBtn line">Atnaujinti mokėjimo būdą</span><span class="mPayBtn line">Sąskaitų istorija</span><span class="mPayBtn danger"${mkHlV81("cancel")}>Atšaukti prenumeratą</span></div>`,
        "white"
      )
  }
};

// ---------- „?“ mygtukų vietos ----------
const AH_ANCHORS_V81 = [
  {
    id: "sutartys",
    sel: "#sheet .sheetHead h3",
    when: () => !!document.querySelector("#sheet .ctFormV52:not(.invFormV82)")
  },
  { id: "skeneris", sel: ".regCardHeadV50 strong" },
  { id: "pajamos", sel: "#accountingRoot .accountingWorkspaceHead h3", text: "Pridėti įplauką" },
  { id: "islaidos", sel: "#accountingRoot .accountingWorkspaceHead h3", text: "Pridėti išlaidą" },
  { id: "ataskaitos", sel: "#accountingRoot .accountingWorkspaceHead h3", text: "Ataskaitos" },
  {
    id: "uzduotys",
    sel: "#sheet .carTasksSectionTitle h4",
    when: () => !document.querySelector("#sheet.ccV83")
  },
  { id: "uzduotys", sel: "#sheet .ccHelpSlotV83" },
  { id: "uzduotys", sel: "#garageTasksSection > .sectionHead h2" },
  { id: "variantai", sel: "#view-garage-leads > .sectionHead h2" },
  { id: "vadybininkas", sel: "#view-garage-what .garageWhatHead", before: ".garageWhatBack" },
  { id: "backup_skolos", sel: "#setDataHV71" },
  { id: "backup_skolos", sel: ".financeMobileSectionHead h3", text: "Skolos" },
  { id: "prenumerata", sel: "#aeSubPanelV70 .aeSubHeadV70 strong" }
];
function ahTriggerHTMLV81(id) {
  const t = AH_TOPICS_V81[id];
  return `<button type="button" class="ahTrigV81" data-help="${id}" aria-label="Pagalba: ${t.title}" title="Pagalba">${AH_SVG_V81.help}</button>`;
}
function ahInjectV81() {
  for (const a of AH_ANCHORS_V81) {
    if (a.when && !a.when()) continue;
    document.querySelectorAll(a.sel).forEach(el => {
      if (a.text && el.textContent.trim() !== a.text) return;
      if (a.before) {
        if (el.querySelector(":scope > .ahTrigV81")) return;
        const ref = el.querySelector(`:scope > ${a.before}`);
        el.insertBefore(document.createRange().createContextualFragment(ahTriggerHTMLV81(a.id)), ref || null);
        return;
      }
      if (el.querySelector(":scope > .ahTrigV81")) return;
      el.insertAdjacentHTML("beforeend", ahTriggerHTMLV81(a.id));
    });
  }
}
let ahInjectQueuedV81 = false;
function ahScheduleInjectV81() {
  if (ahInjectQueuedV81) return;
  ahInjectQueuedV81 = true;
  requestAnimationFrame(() => {
    ahInjectQueuedV81 = false;
    try {
      ahInjectV81();
    } catch (err) {
      console.warn("ahInjectV81", err);
    }
  });
}

// ---------- Pagalbos langas ----------
const ahV81 = { root: null, panel: null, id: "", step: 0, timer: 0, auto: true, lastFocus: null, closing: 0 };
function ahReducedMotionV81() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) {
    return false;
  }
}
function ahRichV81(text) {
  return escapeHTML(text).replace(/„([^“]+)“/g, "„<b>$1</b>“");
}
function ahContentHTMLV81(id) {
  const t = AH_TOPICS_V81[id];
  return `<div class="ahGrabV81" data-ah-drag aria-hidden="true"><i></i></div>
    <header class="ahHeadV81" data-ah-drag>
      <span class="ahIcoV81" aria-hidden="true">${t.icon}</span>
      <div class="ahHeadTextV81"><span class="ahEyebrowV81">Pagalba</span><h2 id="ahTitleV81">${escapeHTML(t.title)}</h2></div>
      <button type="button" class="ahCloseV81" data-ah-close aria-label="Uždaryti pagalbą">${AH_SVG_V81.close}</button>
    </header>
    <div class="ahBodyV81" data-ah-scroll>
      <div class="ahTextV81">
        <p class="ahLeadV81">${escapeHTML(t.lead)}</p>
        <section class="ahSecV81" aria-labelledby="ahHowV81"><h3 id="ahHowV81">Kaip tai veikia</h3>
          <ul class="ahHowListV81">${t.how.map(x => `<li>${ahRichV81(x)}</li>`).join("")}</ul></section>
        <section class="ahSecV81" aria-labelledby="ahStepsHV81"><h3 id="ahStepsHV81">Žingsniai kelyje</h3>
          <ol class="ahStepsV81">${t.steps
            .map(
              (s, i) =>
                `<li><button type="button" class="ahStepV81" data-ah-step="${i}" aria-pressed="${i === 0}"><span class="ahNumV81">${
                  i + 1
                }</span><span class="ahStepTextV81">${ahRichV81(s.text)}</span></button></li>`
            )
            .join("")}</ol></section>
      </div>
      <div class="ahDemoV81">
        <div class="ahPhoneV81" aria-hidden="true"><span class="ahIslandV81"></span><div class="ahScreenV81">${t.mock()}</div></div>
        <p class="ahCapV81">Paspauskite žingsnį – makete parodysime, kur spausti.</p>
      </div>
    </div>`;
}
function ahShowStepV81(index, { user = false } = {}) {
  const t = AH_TOPICS_V81[ahV81.id];
  if (!t || !ahV81.panel) return;
  const step = t.steps[(index + t.steps.length) % t.steps.length];
  ahV81.step = t.steps.indexOf(step);
  ahV81.panel.querySelectorAll("[data-ah-step]").forEach(b => {
    const on = Number(b.dataset.ahStep) === ahV81.step;
    b.setAttribute("aria-pressed", String(on));
    b.classList.toggle("on", on);
  });
  ahV81.panel.querySelectorAll(".mScr").forEach(s => s.classList.toggle("on", s.dataset.scr === step.scr));
  ahV81.panel.querySelectorAll("[data-hl]").forEach(el => {
    const on = el.dataset.hl === step.hl && el.closest(".mScr")?.dataset.scr === step.scr;
    el.classList.toggle("mHlOn", on);
  });
  if (user) {
    // Telefone maketas po žingsniais – jei nematomas, priartinamas
    const phone = ahV81.panel.querySelector(".ahPhoneV81");
    const scroller = ahV81.panel.querySelector("[data-ah-scroll]");
    if (phone && scroller && window.matchMedia("(max-width: 767px)").matches) {
      const r = phone.getBoundingClientRect(),
        box = scroller.getBoundingClientRect();
      if (r.bottom > box.bottom || r.top < box.top)
        phone.scrollIntoView({ block: "nearest", behavior: ahReducedMotionV81() ? "auto" : "smooth" });
    }
  }
}
function ahStopAutoV81() {
  ahV81.auto = false;
  clearInterval(ahV81.timer);
  ahV81.timer = 0;
}
function ahStartAutoV81() {
  clearInterval(ahV81.timer);
  if (ahReducedMotionV81()) return;
  ahV81.auto = true;
  ahV81.timer = setInterval(() => {
    if (!ahV81.auto || document.hidden || !ahV81.root?.classList.contains("open")) return;
    ahShowStepV81(ahV81.step + 1);
  }, 3200);
}
function ahFocusablesV81() {
  return [
    ...(ahV81.panel?.querySelectorAll("button, [href], input, [tabindex]:not([tabindex='-1'])") || [])
  ].filter(el => !el.disabled && el.getClientRects().length);
}
function ahEnsureRootV81() {
  if (ahV81.root) return ahV81.root;
  const root = document.createElement("div");
  root.className = "ahRootV81";
  root.hidden = true;
  root.innerHTML = `<div class="ahBackdropV81" data-ah-close></div><div class="ahPanelV81" role="dialog" aria-modal="true" aria-labelledby="ahTitleV81" tabindex="-1"></div>`;
  document.body.appendChild(root);
  ahV81.root = root;
  ahV81.panel = root.querySelector(".ahPanelV81");
  root.addEventListener("click", e => {
    if (e.target.closest("[data-ah-close]")) return ahCloseV81();
    const step = e.target.closest("[data-ah-step]");
    if (step) {
      ahStopAutoV81();
      ahShowStepV81(Number(step.dataset.ahStep), { user: true });
    }
  });
  root.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      e.preventDefault();
      return ahCloseV81();
    }
    if (e.key === "Tab") {
      const list = ahFocusablesV81();
      if (!list.length) return;
      const first = list[0],
        last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && e.target.closest?.("[data-ah-step]")) {
      e.preventDefault();
      ahStopAutoV81();
      ahShowStepV81(ahV81.step + (e.key === "ArrowDown" ? 1 : -1), { user: true });
      ahV81.panel.querySelector(`[data-ah-step="${ahV81.step}"]`)?.focus();
    }
  });
  ahBindDragV81();
  return root;
}
// Telefone langą galima nutempti žemyn už rankenėlės ar antraštės
function ahBindDragV81() {
  const panel = ahV81.panel;
  let start = null;
  panel.addEventListener("pointerdown", e => {
    if (!e.target.closest("[data-ah-drag]") || e.target.closest("button")) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    start = { y: e.clientY, t: performance.now(), id: e.pointerId, dy: 0 };
    panel.setPointerCapture?.(e.pointerId);
    panel.classList.add("dragging");
  });
  panel.addEventListener("pointermove", e => {
    if (!start || e.pointerId !== start.id) return;
    start.dy = Math.max(0, e.clientY - start.y);
    panel.style.transform = `translate3d(0, ${start.dy}px, 0)`;
  });
  const end = e => {
    if (!start || (e && e.pointerId !== start.id)) return;
    const { dy, t } = start;
    const speed = dy / Math.max(1, performance.now() - t);
    start = null;
    panel.classList.remove("dragging");
    panel.style.transform = "";
    if (dy > 110 || (dy > 36 && speed > 0.6)) ahCloseV81();
  };
  panel.addEventListener("pointerup", end);
  panel.addEventListener("pointercancel", end);
}
function ahOpenV81(id) {
  if (!AH_TOPICS_V81[id]) return false;
  const root = ahEnsureRootV81();
  clearTimeout(ahV81.closing);
  ahV81.id = id;
  ahV81.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  ahV81.panel.innerHTML = ahContentHTMLV81(id);
  ahV81.panel.dataset.topic = id;
  root.hidden = false;
  document.documentElement.classList.add("ahLockV81");
  ahShowStepV81(0);
  // Kitame kadre – kad CSS perėjimas prasidėtų nuo pradinės padėties
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.classList.add("open");
      ahV81.panel.querySelector("[data-ah-close].ahCloseV81")?.focus({ preventScroll: true });
    })
  );
  ahStartAutoV81();
  return true;
}
function ahCloseV81() {
  const root = ahV81.root;
  if (!root || root.hidden) return;
  ahStopAutoV81();
  root.classList.remove("open");
  document.documentElement.classList.remove("ahLockV81");
  const focusBack = ahV81.lastFocus;
  ahV81.closing = setTimeout(
    () => {
      root.hidden = true;
      ahV81.panel.innerHTML = "";
      ahV81.id = "";
      if (focusBack && focusBack.isConnected) focusBack.focus({ preventScroll: true });
    },
    ahReducedMotionV81() ? 0 : 300
  );
}

// ---------- Įvykiai ir paleidimas ----------
document.addEventListener(
  "click",
  e => {
    const trig = e.target instanceof Element ? e.target.closest(".ahTrigV81[data-help]") : null;
    if (!trig) return;
    // „?“ yra antraštėse – jų paspaudimas neturi atidaryti ar uždaryti skyriaus
    e.preventDefault();
    e.stopPropagation();
    ahOpenV81(trig.dataset.help);
  },
  true
);
try {
  new MutationObserver(ahScheduleInjectV81).observe(document.body, { childList: true, subtree: true });
} catch (err) {}
ahScheduleInjectV81();
window.AutoEasierHelp = {
  open: ahOpenV81,
  openTutorial: ahOpenV81,
  close: ahCloseV81,
  topics: Object.keys(AH_TOPICS_V81)
};
