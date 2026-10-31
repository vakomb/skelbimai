// v84: „Ką moka AutoEasier“ – funkcijų vitrina prisijungimo ekrane (prieš prenumeratą).
// Mygtukas po „Išbandyti 7 d. nemokamai“ (src/partials/login.html, #aeFtEntryV84). Telefone iš apačios išslenka
// langas (88 % aukščio, nutempiamas žemyn), planšetėje ir kompiuteryje – centruotas langas dviem stulpeliais.
// 1 lygis – funkcijų sąrašas, 2 lygis – funkcijos detalė: nauda, gyvas CSS/SVG maketas su „pirštu“, kuris
// atlieka 3–4 žingsnius (automatiškai groja, sustoja palietus, galima braukti, spausti žingsnius, rodyklės),
// „Seniau / Su AutoEasier“ palyginimas, 3 naudos ženkleliai, „Kita funkcija“ ir prilipęs CTA, kuris atidaro
// esamą v70 prenumeratos langą (to paties mygtuko #autoEasierSubscription paspaudimas – naujo mokėjimo kodo nėra).
// Veikia be prisijungimo ir be interneto. DOM kuriamas tik pirmą kartą atidarius, maketas – tik matomai funkcijai.
// Naršyklės „Atgal“ uždaro detalę, po to langą. Viešas API: window.AutoEasierFeatures.open(id?) / .close() / .list.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const FT_ICO_V84 = {
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
  scan: '<path d="M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4h2M15.5 4h2A2.5 2.5 0 0 1 20 6.5v2M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M8.5 20h-2A2.5 2.5 0 0 1 4 17.5v-2"/><path d="M7.5 12h9"/>',
  garage: '<path d="M3.5 10.2 12 4.5l8.5 5.7V19.5h-17z"/><path d="M7.5 19.5v-5.5h9v5.5M7.5 16.8h9"/>',
  euro: '<path d="M17.5 7.2A6.5 6.5 0 1 0 17.5 16.8"/><path d="M4.5 10.2h8.5M4.5 13.8h8.5"/>',
  tasks:
    '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="m4 6.5 1.3 1.3L7.6 5.5M4 12l1.3 1.3L7.6 11M4 17.5l1.3 1.3 2.3-2.3"/>',
  photo:
    '<rect x="3.5" y="5" width="17" height="14" rx="2.6"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 15.5-4.6-4.6-8.4 8.1"/>',
  sign: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5"/><path d="M8.5 16.2c1.4-1.9 2.4-1.9 2.9 0 .5 1.7 1.7 1.5 2.9-.4"/>',
  shield:
    '<path d="M12 3.5 5.5 6v5c0 4.3 2.8 7.6 6.5 9.5 3.7-1.9 6.5-5.2 6.5-9.5V6z"/><path d="m9.2 12 1.9 1.9 3.7-3.7"/>',
  folder:
    '<path d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2h7.2a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M8.5 13h7"/>',
  sync: '<rect x="2.5" y="4.5" width="13" height="9" rx="1.6"/><path d="M5.5 17.5h7"/><rect x="16.5" y="8" width="5" height="11.5" rx="1.4"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  back: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  chev: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  check: '<path d="m5.5 12.5 4.2 4.2 8.8-9.4"/>',
  x: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  bolt: '<path d="M13 3.5 6 13.5h5l-1 7 7-10h-5z"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  doc: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M8.5 12.5h7M8.5 16h5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  device: '<rect x="7" y="3.5" width="10" height="17" rx="2.2"/><path d="M11 17.5h2"/>'
};
const ftSvgV84 = (k, cls = "") =>
  `<svg class="ftIcV84 ${cls}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">${FT_ICO_V84[k] || ""}</svg>`;
const ftEurV84 = (v, signed) =>
  (signed && v > 0 ? "+" : v < 0 ? "−" : "") +
  Math.abs(Math.round(v))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ") +
  " €";
const ftFmtV84 = (v, fmt) =>
  fmt === "eur" ? ftEurV84(v) : fmt === "signed" ? ftEurV84(v, true) : String(Math.round(v));
// Skaičius, kuris maketo žingsniuose keičiasi: reikšmės pagal žingsnį (0 – pradinė būsena)
const ftNumV84 = (vals, fmt, attrs = "") =>
  `<b data-num="${vals.join("|")}" data-fmt="${fmt}" ${attrs}>${ftFmtV84(vals[0], fmt)}</b>`;
const FT_CAR_V84 =
  '<svg class="fmCarV84" viewBox="0 0 64 40" aria-hidden="true"><path d="M5 28.5c0-3 2-5.2 5-5.7l7.4-1.5 7.2-6.6c1.6-1.4 3.5-2.2 5.6-2.2h9.6c2.4 0 4.7 1.1 6.2 2.9l4.9 5.9 4.4 1c2.7.6 4.6 3 4.6 5.7V31H5z"/><circle cx="17.5" cy="31" r="4.6"/><circle cx="46.5" cy="31" r="4.6"/></svg>';
const FT_GRAD_V84 = [
  "linear-gradient(140deg,#dfe8f3,#a9bfda)",
  "linear-gradient(140deg,#e6ebf1,#b9c4d2)",
  "linear-gradient(140deg,#d9e6f6,#8fadd3)",
  "linear-gradient(140deg,#e9eef4,#c3cfdd)",
  "linear-gradient(140deg,#dce4ee,#9cb0c8)",
  "linear-gradient(140deg,#e2eaf5,#b0c6e2)"
];
const ftThumbV84 = (i = 0, cls = "") =>
  `<span class="fmThumbV84 ${cls}" style="--g:${FT_GRAD_V84[i % 6]}">${FT_CAR_V84}</span>`;
const FT_STATUS_V84 =
  '<div class="fmStatusV84"><span>9:41</span><i class="fmIslandV84"></i><span class="fmSigV84"><i></i><i></i><i></i></span></div>';

// ---------- Maketai (supaprastinta programėlės ekranų kopija) ----------
// data-on="n" – atsiranda po n-ojo žingsnio, data-off="n" – dingsta, data-hot="n" – paryškinamas n-ajame žingsnyje,
// data-cls="n:klasė" – klasė nuo n-ojo žingsnio, data-num – skaičius pagal žingsnį, data-t – „piršto“ taikinys.
const FT_MOCK_V84 = {
  pridejimas: () => {
    const labels = ["Markė", "Modelis", "VIN", "Pirma registracija", "Kuras"];
    const vals = ["Toyota", "RAV4", "JTMW1RFV0KD•••••", "2019-04-12", "Hibridas"];
    return `<div class="fmLayerV84">
      <div class="fmTitleV84">Naujas automobilis</div>
      <div class="fmCardV84 fmFormV84">${labels.map(l => `<div class="fmFieldV84"><span>${l}</span><i></i></div>`).join("")}</div>
      <div class="fmBtnV84 ghost" data-t="scan">${ftSvgV84("scan")}Skenuoti liudijimą</div>
      <div class="fmHintV84">arba įveskite ranka</div>
    </div>
    <div class="fmLayerV84 fmCamV84" data-on="1" data-off="3">
      <div class="fmCamTopV84">Registracijos liudijimas</div>
      <div class="fmDocV84"><span class="fmDocHV84"></span>${'<span class="fmDocLV84"></span>'.repeat(6)}<i class="fmScanV84" data-on="2"></i><b class="c1"></b><b class="c2"></b><b class="c3"></b><b class="c4"></b></div>
      <div class="fmStackV84 fmCamCapV84"><span data-off="2">Laikykite dokumentą rėmelyje</span><span data-on="2">Nuskaitoma…</span></div>
      <div class="fmShutterV84" data-t="shutter"></div>
    </div>
    <div class="fmLayerV84" data-on="3">
      <div class="fmTitleV84">Naujas automobilis <em class="fmPillV84 good">Nuskaityta</em></div>
      <div class="fmCardV84 fmFormV84">${labels
        .map(
          (l, k) =>
            `<div class="fmFieldV84 filled"><span>${l}</span><b data-on="3" style="--d:${120 + k * 110}ms">${vals[k]}</b></div>`
        )
        .join("")}</div>
      <div class="fmBtnV84" data-t="save">Išsaugoti</div>
    </div>
    <div class="fmToastV84" data-on="4">${ftSvgV84("check")}Automobilis pridėtas į garažą</div>`;
  },
  garazas: () => `<div class="fmLayerV84">
      <div class="fmTitleV84">Garažas <small class="fmMutedV84">3 auto</small></div>
      <div class="fmCarRowV84" data-t="car1">${ftThumbV84(0)}<span><b>Toyota RAV4</b><small>KLM 482</small></span><em class="fmPillV84 blue">12 d.</em></div>
      <div class="fmCarRowV84">${ftThumbV84(1)}<span><b>VW Passat</b><small>HTR 105</small></span><em class="fmPillV84 warn">47 d.</em></div>
      <div class="fmCarRowV84">${ftThumbV84(2)}<span><b>Audi A4</b><small>BNE 771</small></span><em class="fmPillV84 bad" data-hot="1">93 d.</em></div>
    </div>
    <div class="fmLayerV84" data-on="2">
      <div class="fmHeroV84" style="--g:${FT_GRAD_V84[0]}">${FT_CAR_V84}</div>
      <div class="fmTitleV84">Toyota RAV4</div>
      <div class="fmSubRowV84"><span class="fmPlateV84">KLM 482</span><em class="fmPillV84 blue">Garaže 12 d.</em></div>
      <div class="fmCardV84 fmReadyV84" data-hot="3">
        <div class="fmRowV84"><b>Pasirengimas</b><span>${ftNumV84([5, 5, 5, 5, 6], "plain")} iš 7</span></div>
        <div class="fmSegsV84">${'<i class="done"></i>'.repeat(5)}<i><u data-on="4"></u></i><i></i></div>
        <div class="fmNextV84"><span><small>Kitas žingsnis</small><span class="fmStackV84"><b data-off="4">Patikrinti draudimą</b><b data-on="4">Įkelti pirkimo sutartį</b></span></span><em class="fmBtnV84 sm" data-t="next">Patikrinti</em></div>
      </div>
    </div>`,
  marza: () => `<div class="fmLayerV84">
      <div class="fmTitleV84">Toyota RAV4</div>
      <div class="fmSubRowV84"><span class="fmPlateV84">KLM 482</span></div>
      <div class="fmCardV84 fmNumsV84">
        <div><small>Savikaina</small>${ftNumV84([5200, 5200, 5450, 5450], "eur")}</div>
        <div data-t="price" data-hot="3"><small>Kaina</small>${ftNumV84([6900, 6900, 6900, 7200], "eur")}</div>
        <div><small>Marža</small>${ftNumV84([1700, 1700, 1450, 1750], "signed", 'class="pos"')}</div>
      </div>
      <div class="fmCardV84 fmListV84">
        <div class="fmRowV84"><span>Pirkimas</span><b>${ftEurV84(4600)}</b></div>
        <div class="fmRowV84"><span>Remontas</span><b>${ftEurV84(600)}</b></div>
        <div class="fmRowV84 fmGrowV84 fmNewV84" data-on="2"><span>Padangos</span><b>${ftEurV84(250)}</b></div>
      </div>
      <div class="fmBtnV84 ghost" data-t="add">+ Išlaida</div>
    </div>
    <div class="fmDimV84" data-on="1" data-off="2"></div>
    <div class="fmSheetV84" data-on="1" data-off="2">
      <i class="fmGripV84"></i><b>Nauja išlaida</b>
      <div class="fmFieldV84 filled"><span>Pavadinimas</span><b>Padangos</b></div>
      <div class="fmFieldV84 filled"><span>Suma</span><b>${ftEurV84(250)}</b></div>
      <div class="fmBtnV84" data-t="addok">Pridėti</div>
    </div>`,
  uzduotys: () => `<div class="fmLayerV84">
      <div class="fmTitleV84">Užduotys <em class="fmPillV84 bad" data-off="3">1 vėluoja</em></div>
      <div class="fmGroupV84">${ftThumbV84(0, "sm")}<span><b>Toyota RAV4</b><small>KLM 482</small></span></div>
      <div class="fmCardV84 fmTasksV84">
        <div class="fmTaskV84"><i class="fmChkV84"></i><span><b>Poliravimas</b><small>iki 11-02</small></span></div>
        <div class="fmTaskV84 late" data-hot="2" data-cls="3:is-done"><i class="fmChkV84" data-t="chk"><u data-on="3">${ftSvgV84("check")}</u></i><span><b>Techninė apžiūra</b><small class="fmStackV84"><em class="bad" data-off="3">vėluoja 2 d.</em><em class="good" data-on="3">atlikta · ${ftEurV84(45)} į savikainą</em></small></span></div>
        <div class="fmTaskV84 fmGrowV84 fmNewV84" data-on="1"><i class="fmChkV84"></i><span><b>Padangų keitimas</b><small>iki 11-05</small></span></div>
      </div>
      <div class="fmBtnV84 ghost" data-t="addtask">+ Užduotis</div>
    </div>`,
  nuotraukos: () => `<div class="fmLayerV84">
      <div class="fmTitleV84">Toyota RAV4</div>
      <div class="fmCardV84">
        <div class="fmRowV84"><b>Nuotraukos</b><span class="fmMutedV84">${ftNumV84([0, 6, 6, 6], "plain")} nuotr.</span></div>
        <div class="fmStackV84">
          <div class="fmGridV84">${[0, 1, 2, 3, 4, 5]
            .map(
              k =>
                `<span class="fmTileV84" data-on="1" style="--d:${k * 90}ms;--g:${FT_GRAD_V84[k]}"${k === 1 ? ' data-t="tile"' : ""}>${FT_CAR_V84}</span>`
            )
            .join("")}</div>
          <div class="fmEmptyV84" data-off="1">${ftSvgV84("photo")}Dar nėra nuotraukų</div>
        </div>
        <div class="fmStackV84 fmPhFootV84">
          <span class="fmProgV84" data-on="1" data-off="2"><small>Suspaudžiama…</small><i><u></u></i></span>
          <em class="fmPillV84 good" data-on="2">${ftSvgV84("cloud")}Išsaugota debesyje</em>
        </div>
      </div>
      <div class="fmBtnV84 ghost" data-t="addph" data-off="1">+ Pridėti nuotraukų</div>
    </div>
    <div class="fmLayerV84 fmGalV84" data-on="3">
      <span class="fmGalCntV84">2/6</span>
      <span class="fmGalImgV84" style="--g:${FT_GRAD_V84[1]}">${FT_CAR_V84}</span>
      <span class="fmGalDotsV84"><i></i><i class="on"></i><i></i><i></i><i></i><i></i></span>
    </div>`,
  sutartys: () => {
    const rows = [
      ["Pardavėjas", "Jūsų įmonė"],
      ["Pirkėjas", "Jonas Jonaitis"],
      ["Automobilis", "Toyota RAV4"],
      ["VIN", "JTMW1RFV0KD•••••"],
      ["Kaina", ftEurV84(6900)]
    ];
    return `<div class="fmLayerV84">
      <div class="fmTitleV84">Toyota RAV4</div>
      <div class="fmSubRowV84"><span class="fmPlateV84">KLM 482</span><em class="fmPillV84 good">Parduodama</em></div>
      <div class="fmCardV84 fmMenuV84"><small class="fmLblV84">Dokumentai</small>
        <div class="fmMenuItemV84" data-t="pp">${ftSvgV84("doc")}PP sutartis</div>
        <div class="fmMenuItemV84">${ftSvgV84("doc")}Sąskaita faktūra</div>
      </div>
    </div>
    <div class="fmLayerV84 fmPaperBgV84" data-on="1">
      <div class="fmPaperV84">
        <b class="fmPaperTV84">Automobilio pirkimo–pardavimo sutartis</b>
        ${rows.map((r, k) => `<div class="fmPRowV84" data-on="1" style="--d:${200 + k * 90}ms"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("")}
        <div class="fmSignsV84">
          <div class="fmSignV84"><svg class="fmInkV84" data-on="2" viewBox="0 0 120 44"><path pathLength="1" d="M6 30c8-14 14-20 18-14s-6 18 2 16 10-20 16-16-2 14 6 12 8-10 14-8 6 6 14 2 12-6 18-4"/></svg><small>Pardavėjas</small></div>
          <div class="fmSignV84"><svg class="fmInkV84" data-on="2" style="--d:650ms" viewBox="0 0 120 44"><path pathLength="1" d="M8 28c6-6 10-16 16-12s-4 16 4 14 6-12 12-10 4 10 10 8 10-14 16-10-4 12 6 10 14-8 22-6"/></svg><small>Pirkėjas</small></div>
        </div>
      </div>
      <div class="fmBtnV84" data-t="place">Patalpinti parašus</div>
    </div>
    <div class="fmToastV84" data-on="3">${ftSvgV84("check")}Prisegta prie automobilio</div>`;
  },
  buhalterija: () => `<div class="fmLayerV84">
      <div class="fmTitleV84">Buhalterija</div>
      <div class="fmCardV84">
        <div class="fmRowV84"><b>Spalis</b><span>${ftNumV84([11, 11, 12, 12], "plain")} iš 12 dok.</span></div>
        <div class="fmSegsV84 thin">${'<i class="done"></i>'.repeat(11)}<i><u data-on="2"></u></i></div>
      </div>
      <div class="fmCardV84 fmListV84">
        <div class="fmRowV84"><span><b>Toyota RAV4</b><small>Pardavimo sutartis</small></span><em class="fmPillV84 good">Yra</em></div>
        <div class="fmRowV84" data-hot="1"><span><b>VW Passat</b><small>Pirkimo sutartis</small></span><span class="fmStackV84 fmEndV84"><em class="fmPillV84 bad" data-off="2">Trūksta</em><em class="fmPillV84 good" data-on="2">Prisegta</em></span><em class="fmBtnV84 xs" data-t="up" data-off="2">Įkelti</em></div>
        <div class="fmRowV84"><span><b>Audi A4</b><small>Sąskaita faktūra</small></span><em class="fmPillV84 good">Yra</em></div>
      </div>
      <div class="fmBtnV84" data-t="send">Teikti buhalterei</div>
    </div>
    <div class="fmToastV84" data-on="3">${ftSvgV84("check")}Paketas pateiktas buhalterei</div>`,
  sinchronizacija: () => `<div class="fmDevV84">
      <div class="fmLaptopV84"><div class="fmLScrV84">
        <div class="fmLBarV84"><i></i><i></i><i></i></div>
        <div class="fmLRowV84 head"><span>Automobilis</span><span>Kaina</span></div>
        <div class="fmLRowV84" data-hot="3"><span>Toyota RAV4</span>${ftNumV84([6900, 6900, 6900, 7200], "eur")}</div>
        <div class="fmLRowV84"><span>VW Passat</span><b>${ftEurV84(8400)}</b></div>
        <div class="fmLRowV84"><span>Audi A4</span><b>${ftEurV84(5900)}</b></div>
      </div><i class="fmLBaseV84"></i></div>
      <div class="fmPathV84"><i class="fmCloudV84">${ftSvgV84("cloud")}</i><span class="fmFlowV84" data-on="2"><i></i><i></i><i></i></span></div>
      <div class="fmMiniV84"><i class="fmIslandV84"></i>
        <small>Toyota RAV4</small>
        <span class="fmMiniCardV84" data-t="ph"><small>Kaina</small>${ftNumV84([6900, 7200, 7200, 7200], "eur")}</span>
        <em class="fmPillV84 good" data-on="3">${ftSvgV84("check")}Sinchronizuota</em>
      </div>
    </div>`
};

// ---------- Funkcijos ir tekstai ----------
const FT_LIST_V84 = [
  {
    id: "pridejimas",
    ico: "scan",
    title: "Automobilio pridėjimas",
    sub: "Nuotrauka vietoj perrašinėjimo",
    head: "Automobilis sistemoje – vos nufotografavus liudijimą",
    how: "Programa nuskaito registracijos liudijimą ir pati užpildo markę, modelį, VIN ir datas.",
    old: "VIN perrašote ranka, o klaida išlenda tik sutartyje.",
    now: "Viena nuotrauka – ir duomenys teisingi visur.",
    chips: [
      ["scan", "Be perrašinėjimo"],
      ["check", "Mažiau klaidų"],
      ["doc", "Seni ir nauji liudijimai"]
    ],
    steps: [
      "Spaudžiate „Skenuoti liudijimą“",
      "Nufotografuojate dokumentą",
      "Laukai užsipildo patys",
      "Išsaugote – automobilis garaže"
    ],
    taps: ["scan", "shutter", null, "save"]
  },
  {
    id: "garazas",
    ico: "garage",
    title: "Garažas ir kortelė",
    sub: "Dienos garaže ir kitas žingsnis",
    head: "Matote, kas stovi per ilgai, ir žinote, ką daryti toliau",
    how: "Kortelė skaičiuoja dienas garaže ir rodo, kiek automobilis paruoštas pardavimui.",
    old: "Automobilis stovi trečią mėnesį, nes kažkas pamiršo TA.",
    now: "Ilgai stovintys pažymėti, kitas žingsnis – vienu paspaudimu.",
    chips: [
      ["clock", "Dienos garaže"],
      ["layers", "Pasirengimas „N iš 7“"],
      ["chev", "Kitas žingsnis"]
    ],
    steps: [
      "Ilgai stovintys – matomi iš karto",
      "Atidarote automobilio kortelę",
      "Matote, ko dar trūksta",
      "Atlikta – juosta pasipildo"
    ],
    taps: [null, "car1", null, "next"]
  },
  {
    id: "marza",
    ico: "euro",
    title: "Savikaina ir marža",
    sub: "Išlaidos ir pelnas realiu laiku",
    head: "Žinote, ar uždirbsite – dar prieš parduodant",
    how: "Pirkimas, remontas ir kitos išlaidos sumuojasi į savikainą, o marža persiskaičiuoja iš karto.",
    old: "Kvitai stalčiuje, o marža – spėjimas mėnesio gale.",
    now: "Savikaina ir marža matomos visada, tiksliai iki euro.",
    chips: [
      ["euro", "Be skaičiuoklės"],
      ["bolt", "Matote iš karto"],
      ["check", "Kaina – vienu paspaudimu"]
    ],
    steps: [
      "Spaudžiate „+ Išlaida“",
      "Įvedate sumą – savikaina ir marža persiskaičiuoja",
      "Keičiate kainą – marža vėl tiksli"
    ],
    taps: ["add", "addok", "price"]
  },
  {
    id: "uzduotys",
    ico: "tasks",
    title: "Užduotys",
    sub: "Ką, kuriam auto ir iki kada",
    head: "Niekas nepasimiršta – vėluojančios užduotys matomos iš karto",
    how: "Užduotys sugrupuotos pagal automobilį, su terminu ir išlaidomis, kurios patenka į savikainą.",
    old: "Darbai – sąsiuvinyje ir galvoje, terminai praeina nepastebėti.",
    now: "Kiekviena užduotis turi terminą, vėluojančios išsiskiria.",
    chips: [
      ["garage", "Pagal automobilį"],
      ["clock", "Terminai"],
      ["euro", "Išlaidos – į savikainą"]
    ],
    steps: [
      "Pridedate užduotį su terminu",
      "Vėluojanti išsiskiria",
      "Pažymite atlikta – išlaidos į savikainą"
    ],
    taps: ["addtask", null, "chk"]
  },
  {
    id: "nuotraukos",
    ico: "photo",
    title: "Nuotraukos",
    sub: "Suspaustos ir visada po ranka",
    head: "Visos automobilio nuotraukos – vienoje vietoje, bet kuriame įrenginyje",
    how: "Nuotraukos suspaudžiamos be akimi matomo kokybės praradimo ir saugomos debesyje.",
    old: "Nuotraukos išmėtytos telefone, pokalbiuose ir laiškuose.",
    now: "Prie automobilio, tvarkingai, pasiekiamos visur.",
    chips: [
      ["layers", "Mažesni failai"],
      ["cloud", "Saugoma debesyje"],
      ["photo", "Galerija"]
    ],
    steps: ["Pridedate nuotraukas", "Suspaudžiama ir išsaugoma debesyje", "Galerija – braukite"],
    taps: ["addph", null, "tile"]
  },
  {
    id: "sutartys",
    ico: "sign",
    title: "Sutartys ir sąskaitos",
    sub: "Pasirašomos tiesiai telefone",
    head: "Sutartis pasirašyta ekrane – be spausdintuvo ir skenerio",
    how: "Duomenys paimami iš automobilio kortelės ir profilio, abi pusės pasirašo pirštu.",
    old: "Pildote ranka, spausdinate, skenuojate, siunčiate.",
    now: "Sugeneruota, pasirašyta ir prisegta prie automobilio.",
    chips: [
      ["doc", "PP sutartis"],
      ["euro", "Sąskaita faktūra"],
      ["sign", "Parašas ekrane"]
    ],
    steps: [
      "Spaudžiate „PP sutartis“ – duomenys užpildyti",
      "Abi pusės pasirašo pirštu",
      "Dokumentas prisegtas prie automobilio"
    ],
    taps: ["pp", null, "place"]
  },
  {
    id: "buhalterija",
    ico: "folder",
    title: "Buhalterija",
    sub: "Paketas buhalterei vienu mygtuku",
    head: "Mėnesio pabaiga be dokumentų medžioklės",
    how: "Programa rodo, kurių dokumentų trūksta, ir paruošia savaitės ar mėnesio paketą buhalterei.",
    old: "Ieškote sutarčių ir kvitų, siunčiate po vieną per „Messenger“.",
    now: "Trūkstami dokumentai pažymėti, paketas – vienu mygtuku.",
    chips: [
      ["search", "Trūkstami dokumentai"],
      ["clock", "Savaitės ir mėnesio paketas"],
      ["check", "Buhalterei – paruošta"]
    ],
    steps: [
      "Trūkstamas dokumentas – pažymėtas",
      "Įkeliate jį vienu paspaudimu",
      "Spaudžiate „Teikti buhalterei“"
    ],
    taps: [null, "up", "send"]
  },
  {
    id: "sinchronizacija",
    ico: "sync",
    title: "Visuose įrenginiuose",
    sub: "Telefonas, planšetė, kompiuteris",
    head: "Pradedate telefone, tęsiate kompiuteryje",
    how: "Duomenys sinchronizuojami debesyje, todėl visi jūsų įrenginiai rodo tą patį.",
    old: "Excel failas biure, o jūs – aikštelėje.",
    now: "Pakeitimas telefone – po akimirkos ir kompiuteryje.",
    chips: [
      ["cloud", "Debesyje"],
      ["device", "Visi įrenginiai"],
      ["lock", "Asmeninė paskyra"]
    ],
    steps: ["Keičiate kainą telefone", "Duomenys keliauja į debesį", "Kompiuteryje – jau nauja kaina"],
    taps: ["ph", null, null],
    kind: "devices"
  }
];

// ---------- Būsena ----------
const ftV84 = {
  host: null,
  open: false,
  detail: null,
  depth: 0,
  ignorePop: false,
  afterPop: null,
  lastFocus: null,
  step: 0,
  playing: false,
  timer: 0,
  tapT: 0,
  cmpT: 0,
  cmpTouched: false,
  firstOpen: true
};
const ftDesktopV84 = () => matchMedia("(min-width: 760px)").matches;
const ftReducedV84 = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ftFindV84 = id => FT_LIST_V84.find(f => f.id === id);

function ftRowsHTMLV84() {
  return FT_LIST_V84.map(
    (f, i) =>
      `<li><button type="button" class="ftRowV84" data-ft-open="${f.id}" aria-controls="ftDetailV84" style="--i:${i}"><span class="ftIcoV84">${ftSvgV84(f.ico)}</span><span class="ftRowTxtV84"><b>${escapeHTML(f.title)}</b><small>${escapeHTML(f.sub)}</small></span>${ftSvgV84("chev", "ftRowChevV84")}</button></li>`
  ).join("");
}
function ftDetailHTMLV84(f) {
  const n = f.steps.length;
  const idx = FT_LIST_V84.indexOf(f);
  const next = FT_LIST_V84[(idx + 1) % FT_LIST_V84.length];
  const frame = f.kind === "devices" ? "ftSceneV84" : "ftPhoneV84";
  return `<article class="ftDV84" data-ft-id="${f.id}">
    <h3 class="ftDHeadV84" id="ftDHeadV84" tabindex="-1">${escapeHTML(f.head)}</h3>
    <p class="ftDHowV84">${escapeHTML(f.how)}</p>
    <div class="ftDemoV84">
      <div class="ftStageV84" aria-hidden="true"><div class="${frame}"><div class="fmScrV84" data-step="0">${f.kind === "devices" ? "" : FT_STATUS_V84}${FT_MOCK_V84[f.id]()}<span class="fmFingerV84"></span></div></div></div>
      <div class="ftStepsV84">
        <div class="ftSegsV84" role="group" aria-label="Pamokos žingsniai">${f.steps
          .map(
            (s, i) =>
              `<button type="button" class="ftSegV84" data-ft-step="${i}" aria-label="Žingsnis ${i + 1} iš ${n}: ${escapeHTML(s)}"><i></i></button>`
          )
          .join("")}</div>
        <div class="ftCapRowV84"><p class="ftCapV84"><b>1/${n}</b><span>${escapeHTML(f.steps[0])}</span></p><button type="button" class="ftReplayV84" data-ft-replay hidden>${ftSvgV84("replay")}<span>Pakartoti</span></button></div>
        <ol class="ftSrV84">${f.steps.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ol>
        <p class="ftSrV84" aria-live="polite" data-ft-live></p>
      </div>
    </div>
    <div class="ftCmpV84" data-cmp="old">
      <div class="ftSegCtlV84" role="group" aria-label="Palyginimas"><span class="ftThumbV84" aria-hidden="true"></span><button type="button" data-ft-cmp="old" aria-pressed="true">Seniau</button><button type="button" data-ft-cmp="new" aria-pressed="false">Su AutoEasier</button></div>
      <div class="ftCmpBoxV84"><p class="old">${ftSvgV84("x")}<span>${escapeHTML(f.old)}</span></p><p class="new">${ftSvgV84("check")}<span>${escapeHTML(f.now)}</span></p></div>
    </div>
    <ul class="ftChipsV84">${f.chips.map(c => `<li>${ftSvgV84(c[0])}<span>${escapeHTML(c[1])}</span></li>`).join("")}</ul>
    <button type="button" class="ftNextV84" data-ft-open="${next.id}" data-ft-next><span><small>Kita funkcija</small><b>${escapeHTML(next.title)}</b></span>${ftSvgV84("chev")}</button>
  </article>`;
}

function ftBuildV84() {
  if (ftV84.host) return ftV84.host;
  const host = document.createElement("div");
  host.className = "ftV84";
  host.id = "aeFtV84";
  host.hidden = true;
  host.innerHTML = `<div class="ftScrimV84" data-ft-close></div>
    <section class="ftPanelV84" role="dialog" aria-modal="true" aria-labelledby="ftTitleV84" tabindex="-1">
      <div class="ftGrabV84">
        <span class="ftHandleV84" aria-hidden="true"></span>
        <div class="ftTopV84">
          <button type="button" class="ftBackV84" data-ft-back>${ftSvgV84("back")}<span>Visos funkcijos</span></button>
          <span class="ftBrandV84">AutoEasier</span>
          <button type="button" class="ftXV84" data-ft-close aria-label="Uždaryti">${ftSvgV84("close")}</button>
        </div>
      </div>
      <div class="ftPageV84 ftListPageV84" data-ft-page="list">
        <header class="ftHeadV84"><span class="ftKickerV84">AutoEasier</span><h2 id="ftTitleV84">Visa auto prekyba – viename telefone</h2><p>Nuo automobilio pridėjimo iki ataskaitos buhalterei. Be popierių ir Excel.</p></header>
        <ul class="ftListV84">${ftRowsHTMLV84()}</ul>
      </div>
      <div class="ftPageV84 ftDetailPageV84" data-ft-page="detail" id="ftDetailV84"><div class="ftDetailInnerV84"></div></div>
      <footer class="ftCtaV84"><button type="button" class="ftCtaBtnV84" data-ft-cta>Išbandyti 7 d. nemokamai</button><p>Vėliau 49 € / mėn. Atšaukti galima bet kada.</p></footer>
    </section>`;
  document.body.appendChild(host);
  ftV84.host = host;
  ftBindV84(host);
  return host;
}
const ftPanelV84 = () => ftV84.host?.querySelector(".ftPanelV84");
const ftArticleV84 = () => ftV84.host?.querySelector(".ftDV84");

// Puslapių pasiekiamumas: telefone nematomas puslapis – inert (fokusas ir ekrano skaitytuvas jo nemato)
function ftSyncPagesV84() {
  const host = ftV84.host;
  if (!host) return;
  const desk = ftDesktopV84();
  const det = host.classList.contains("is-detail");
  host.querySelector(".ftListPageV84").inert = !desk && det;
  host.querySelector(".ftDetailPageV84").inert = !desk && !det;
}

// ---------- Maketo žingsniai ----------
function ftApplyV84(scr, sn) {
  scr.dataset.step = String(sn);
  scr.querySelectorAll("[data-on]").forEach(e => e.classList.toggle("is-on", sn >= +e.dataset.on));
  scr.querySelectorAll("[data-off]").forEach(e => e.classList.toggle("is-off", sn >= +e.dataset.off));
  scr.querySelectorAll("[data-hot]").forEach(e => e.classList.toggle("is-hot", sn === +e.dataset.hot));
  scr.querySelectorAll("[data-cls]").forEach(e =>
    e.dataset.cls.split(" ").forEach(p => {
      const [k, c] = p.split(":");
      e.classList.toggle(c, sn >= +k);
    })
  );
  scr.querySelectorAll("[data-num]").forEach(e => {
    const vals = e.dataset.num.split("|").map(Number);
    ftCountV84(e, vals[Math.min(sn, vals.length - 1)]);
  });
}
function ftCountV84(el, to) {
  const from = el._ftV ?? +el.dataset.num.split("|")[0];
  el._ftV = to;
  cancelAnimationFrame(el._ftRaf || 0);
  if (from === to || ftReducedV84()) {
    el.textContent = ftFmtV84(to, el.dataset.fmt);
    return;
  }
  const t0 = performance.now();
  const tick = t => {
    const k = Math.min(1, (t - t0) / 650);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = ftFmtV84(from + (to - from) * e, el.dataset.fmt);
    if (k < 1) el._ftRaf = requestAnimationFrame(tick);
  };
  el._ftRaf = requestAnimationFrame(tick);
}
function ftFingerV84(scr, target) {
  const fg = scr.querySelector(".fmFingerV84");
  if (!fg) return;
  if (!target || ftReducedV84()) {
    fg.classList.remove("is-on");
    return;
  }
  const a = scr.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const k = a.width / (scr.offsetWidth || a.width || 1);
  const x = (r.left - a.left + r.width / 2) / k;
  const y = (r.top - a.top + r.height / 2) / k;
  fg.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  fg.classList.add("is-on");
}
function ftStepV84(i, { manual = false } = {}) {
  const art = ftArticleV84();
  const f = art && ftFindV84(art.dataset.ftId);
  if (!f) return;
  const n = f.steps.length;
  i = Math.max(0, Math.min(n - 1, i));
  ftV84.step = i;
  clearTimeout(ftV84.tapT);
  const scr = art.querySelector(".fmScrV84");
  art.querySelectorAll(".ftSegV84").forEach((s, k) => {
    s.classList.toggle("is-done", k < i);
    s.classList.toggle("is-cur", k === i);
    s.classList.remove("is-run");
    if (k === i) s.setAttribute("aria-current", "step");
    else s.removeAttribute("aria-current");
  });
  const cap = art.querySelector(".ftCapV84");
  if (cap) {
    cap.classList.remove("is-swap");
    void cap.offsetWidth;
    cap.classList.add("is-swap");
    cap.innerHTML = `<b>${i + 1}/${n}</b><span>${escapeHTML(f.steps[i])}</span>`;
  }
  if (manual) {
    const live = art.querySelector("[data-ft-live]");
    if (live) live.textContent = `Žingsnis ${i + 1} iš ${n}: ${f.steps[i]}`;
  }
  const sn = i + 1;
  ftApplyV84(scr, sn - 1);
  const tk = f.taps[i];
  const target = tk ? scr.querySelector(`[data-t="${tk}"]`) : null;
  if (target && !ftReducedV84()) {
    ftFingerV84(scr, target);
    ftV84.tapT = setTimeout(() => {
      const fg = scr.querySelector(".fmFingerV84");
      fg?.classList.remove("is-tap");
      void fg?.offsetWidth;
      fg?.classList.add("is-tap");
      target.classList.add("is-press");
      ftV84.tapT = setTimeout(() => {
        target.classList.remove("is-press");
        ftApplyV84(scr, sn);
      }, 170);
    }, 560);
  } else {
    ftFingerV84(scr, null);
    ftApplyV84(scr, sn);
  }
  if (ftV84.playing) {
    const seg = art.querySelectorAll(".ftSegV84")[i];
    void seg?.offsetWidth;
    seg?.classList.add("is-run");
  }
  ftReplayStateV84();
}
function ftReplayStateV84() {
  const art = ftArticleV84();
  const btn = art?.querySelector("[data-ft-replay]");
  if (!btn) return;
  const f = ftFindV84(art.dataset.ftId);
  const end = ftV84.step >= f.steps.length - 1;
  btn.hidden = ftV84.playing;
  btn.querySelector("span").textContent = end ? "Pakartoti" : "Tęsti";
  art.classList.toggle("is-playing", ftV84.playing);
}
function ftScheduleV84() {
  clearTimeout(ftV84.timer);
  if (!ftV84.playing) return;
  ftV84.timer = setTimeout(() => {
    const art = ftArticleV84();
    const f = art && ftFindV84(art.dataset.ftId);
    if (!f || !ftV84.open) return ftPauseV84();
    if (ftV84.step >= f.steps.length - 1) {
      ftV84.playing = false;
      art.querySelectorAll(".ftSegV84").forEach(s => s.classList.remove("is-run"));
      ftReplayStateV84();
      return;
    }
    ftStepV84(ftV84.step + 1);
    ftScheduleV84();
  }, 3200);
}
function ftPlayV84(from) {
  if (ftReducedV84()) return ftStepV84(from ?? ftV84.step, { manual: true });
  ftV84.playing = true;
  ftStepV84(from ?? ftV84.step);
  ftScheduleV84();
}
function ftPauseV84() {
  ftV84.playing = false;
  clearTimeout(ftV84.timer);
  ftArticleV84()
    ?.querySelectorAll(".ftSegV84")
    .forEach(s => s.classList.remove("is-run"));
  ftReplayStateV84();
}
function ftStopAllV84() {
  ftV84.playing = false;
  clearTimeout(ftV84.timer);
  clearTimeout(ftV84.tapT);
  clearTimeout(ftV84.cmpT);
}
function ftCmpV84(art, which) {
  const box = art?.querySelector(".ftCmpV84");
  if (!box) return;
  box.dataset.cmp = which;
  box
    .querySelectorAll("[data-ft-cmp]")
    .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ftCmp === which)));
}

// ---------- Detalė ----------
function ftStartDetailV84() {
  const art = ftArticleV84();
  if (!art) return;
  ftV84.cmpTouched = false;
  ftV84.playing = false;
  ftV84.step = 0;
  if (ftReducedV84()) {
    ftStepV84(0);
    ftReplayStateV84();
  } else {
    // Pradinė ekrano būsena, po akimirkos „pirštas“ pradeda pamoką („Tęsti“ mygtukas kol kas nerodomas)
    ftApplyV84(art.querySelector(".fmScrV84"), 0);
    art.querySelector(".ftSegV84")?.setAttribute("aria-current", "step");
    ftV84.timer = setTimeout(() => ftPlayV84(0), 380);
    // Pirmą kartą parodžius – „Seniau“ po akimirkos persijungia į „Su AutoEasier“ (parodo perjungiklį ir baigia nauda)
    ftV84.cmpT = setTimeout(() => !ftV84.cmpTouched && ftCmpV84(ftArticleV84(), "new"), 2600);
  }
}
function ftOpenDetailV84(id, { push = true, focus = true } = {}) {
  const f = ftFindV84(id);
  const host = ftV84.host;
  if (!f || !host) return;
  try {
    navigator.vibrate?.(8);
  } catch {}
  const inner = host.querySelector(".ftDetailInnerV84");
  const desk = ftDesktopV84();
  const shown = desk ? !!ftV84.detail : host.classList.contains("is-detail");
  ftStopAllV84();
  const render = () => {
    inner.innerHTML = ftDetailHTMLV84(f);
    host.querySelector(".ftDetailPageV84").scrollTop = 0;
    ftStartDetailV84();
  };
  if (shown && ftV84.detail !== id && !ftReducedV84()) {
    inner.classList.add("is-out");
    setTimeout(() => {
      render();
      inner.classList.remove("is-out");
      inner.classList.add("is-in");
      void inner.offsetWidth;
      inner.classList.remove("is-in");
    }, 130);
  } else render();
  ftV84.detail = id;
  host.querySelectorAll(".ftRowV84").forEach(r => {
    if (r.dataset.ftOpen === id) r.setAttribute("aria-current", "true");
    else r.removeAttribute("aria-current");
  });
  if (!desk) {
    host.classList.add("is-detail");
    if (push && ftV84.depth === 1) {
      history.pushState({ aeFtV84: 2 }, "");
      ftV84.depth = 2;
    }
  }
  ftSyncPagesV84();
  if (focus && !desk)
    setTimeout(() => host.querySelector(".ftDHeadV84")?.focus({ preventScroll: true }), 300);
}
function ftCloseDetailV84({ fromPop = false } = {}) {
  const host = ftV84.host;
  if (!host || !host.classList.contains("is-detail")) return;
  ftStopAllV84();
  const id = ftV84.detail;
  host.classList.remove("is-detail");
  ftV84.detail = null;
  ftSyncPagesV84();
  if (!fromPop && ftV84.depth === 2) {
    ftV84.ignorePop = true;
    ftV84.afterPop = null;
    ftV84.depth = 1;
    history.back();
  }
  setTimeout(
    () => host.querySelector(`.ftRowV84[data-ft-open="${id}"]`)?.focus({ preventScroll: true }),
    280
  );
}

// ---------- Langas ----------
function ftOpenV84(id) {
  const host = ftBuildV84();
  if (ftV84.open) {
    if (id) ftOpenDetailV84(id);
    return;
  }
  ftV84.lastFocus = document.activeElement;
  ftV84.open = true;
  host.classList.remove("is-detail");
  host.classList.toggle("is-first", ftV84.firstOpen && !ftReducedV84());
  host.hidden = false;
  void host.offsetHeight; // pradinė padėtis užfiksuojama prieš animaciją
  host.classList.add("is-open");
  document.documentElement.classList.add("ftLockV84");
  history.pushState({ aeFtV84: 1 }, "");
  ftV84.depth = 1;
  if (ftV84.firstOpen) setTimeout(() => host.classList.remove("is-first"), 1100);
  ftV84.firstOpen = false;
  const list = host.querySelector(".ftListPageV84");
  list.scrollTop = 0;
  if (id) ftOpenDetailV84(id, { focus: false });
  else if (ftDesktopV84()) ftOpenDetailV84(FT_LIST_V84[0].id, { push: false, focus: false });
  ftSyncPagesV84();
  setTimeout(() => ftPanelV84()?.focus({ preventScroll: true }), 60);
}
function ftCloseV84({ fromPop = false, then = null } = {}) {
  const host = ftV84.host;
  if (!host || !ftV84.open) return;
  ftV84.open = false;
  ftStopAllV84();
  const panel = ftPanelV84();
  panel.classList.remove("is-drag");
  panel.style.removeProperty("--ftDrag");
  host.style.removeProperty("--ftScrimK");
  host.classList.remove("is-open");
  document.documentElement.classList.remove("ftLockV84");
  setTimeout(() => {
    if (ftV84.open) return;
    host.hidden = true;
    host.classList.remove("is-detail");
    ftV84.detail = null;
    host.querySelector(".ftDetailInnerV84").innerHTML = "";
  }, 340);
  const done = () => {
    if (then) setTimeout(then, 40);
    else ftV84.lastFocus?.focus?.({ preventScroll: true });
  };
  if (!fromPop && ftV84.depth > 0) {
    const d = ftV84.depth;
    ftV84.depth = 0;
    ftV84.ignorePop = true;
    ftV84.afterPop = done;
    history.go(-d);
    setTimeout(() => {
      if (ftV84.afterPop === done) {
        ftV84.afterPop = null;
        ftV84.ignorePop = false;
        done();
      }
    }, 700);
  } else {
    ftV84.depth = 0;
    done();
  }
}
window.addEventListener("popstate", e => {
  if (ftV84.ignorePop) {
    ftV84.ignorePop = false;
    const f = ftV84.afterPop;
    ftV84.afterPop = null;
    f?.();
    return;
  }
  if (!ftV84.open) return;
  const lvl = e.state?.aeFtV84 || 0;
  if (lvl < 2 && ftV84.depth === 2) {
    ftV84.depth = 1;
    ftCloseDetailV84({ fromPop: true });
  }
  if (lvl < 1) {
    ftV84.depth = 0;
    ftCloseV84({ fromPop: true });
  }
});

// ---------- Įvykiai ----------
function ftBindV84(host) {
  const panel = host.querySelector(".ftPanelV84");
  host.addEventListener("click", e => {
    const t = e.target;
    if (t.closest("[data-ft-close]")) return ftCloseV84();
    if (t.closest("[data-ft-back]")) return ftCloseDetailV84();
    if (t.closest("[data-ft-cta]"))
      return ftCloseV84({ then: () => document.getElementById("autoEasierSubscription")?.click() });
    const open = t.closest("[data-ft-open]");
    if (open)
      return ftOpenDetailV84(open.dataset.ftOpen, { focus: !!open.dataset.ftNext || !ftDesktopV84() });
    const seg = t.closest("[data-ft-step]");
    if (seg) {
      ftPauseV84();
      return ftStepV84(+seg.dataset.ftStep, { manual: true });
    }
    if (t.closest("[data-ft-replay]")) {
      const f = ftFindV84(ftArticleV84()?.dataset.ftId);
      const end = f && ftV84.step >= f.steps.length - 1;
      return ftPlayV84(end ? 0 : ftV84.step + 1);
    }
    const cmp = t.closest("[data-ft-cmp]");
    if (cmp) {
      ftV84.cmpTouched = true;
      clearTimeout(ftV84.cmpT);
      return ftCmpV84(ftArticleV84(), cmp.dataset.ftCmp);
    }
  });
  // Maketas: palietus – pauzė, braukiant – kitas / ankstesnis žingsnis
  let sw = null;
  host.addEventListener("pointerdown", e => {
    if (e.target.closest(".ftStageV84")) sw = { x: e.clientX, y: e.clientY };
  });
  host.addEventListener("pointerup", e => {
    if (!sw || !e.target.closest(".ftStageV84")) return (sw = null);
    const dx = e.clientX - sw.x,
      dy = e.clientY - sw.y;
    sw = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
      ftPauseV84();
      ftStepV84(ftV84.step + (dx < 0 ? 1 : -1), { manual: true });
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      if (ftV84.playing) ftPauseV84();
      else {
        const f = ftFindV84(ftArticleV84()?.dataset.ftId);
        ftPlayV84(f && ftV84.step >= f.steps.length - 1 ? 0 : ftV84.step + 1);
      }
    }
  });
  // Tempimas žemyn (telefone): už rankenėlės / viršutinės juostos
  const grab = host.querySelector(".ftGrabV84");
  let dr = null;
  grab.addEventListener("pointerdown", e => {
    if (ftDesktopV84() || e.target.closest("button")) return;
    dr = { y: e.clientY, py: e.clientY, pt: performance.now(), v: 0, h: panel.offsetHeight, dy: 0 };
    grab.setPointerCapture?.(e.pointerId);
    panel.classList.add("is-drag");
  });
  grab.addEventListener("pointermove", e => {
    if (!dr) return;
    const now = performance.now();
    dr.v = (e.clientY - dr.py) / Math.max(1, now - dr.pt);
    dr.py = e.clientY;
    dr.pt = now;
    dr.dy = Math.max(0, e.clientY - dr.y);
    panel.style.setProperty("--ftDrag", dr.dy + "px");
    host.style.setProperty("--ftScrimK", String(Math.max(0, 1 - dr.dy / dr.h)));
  });
  const end = () => {
    if (!dr) return;
    const { dy, v, h } = dr;
    dr = null;
    panel.classList.remove("is-drag");
    if (dy > h * 0.3 || (v > 0.5 && dy > 12)) return ftCloseV84();
    panel.classList.add("is-spring");
    panel.style.setProperty("--ftDrag", "0px");
    host.style.removeProperty("--ftScrimK");
    setTimeout(() => panel.classList.remove("is-spring"), 420);
  };
  grab.addEventListener("pointerup", end);
  grab.addEventListener("pointercancel", end);
  // Klaviatūra: Escape, fokuso spąstai, rodyklės žingsniams
  document.addEventListener("keydown", e => {
    if (!ftV84.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      return ftCloseV84();
    }
    if (e.key === "Tab") {
      const els = [...panel.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")].filter(
        el => !el.disabled && !el.hidden && !el.closest("[inert]") && el.getClientRects().length
      );
      if (!els.length) return;
      const first = els[0],
        last = els[els.length - 1];
      if (!panel.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && ftArticleV84()) {
      const det = ftDesktopV84() || ftV84.host.classList.contains("is-detail");
      if (!det || e.target.closest?.("[data-ft-cmp]")) return;
      e.preventDefault();
      ftPauseV84();
      ftStepV84(ftV84.step + (e.key === "ArrowRight" ? 1 : -1), { manual: true });
    }
  });
  document.addEventListener("visibilitychange", () => document.hidden && ftV84.playing && ftPauseV84());
  matchMedia("(min-width: 760px)").addEventListener?.("change", () => {
    if (!ftV84.open) return;
    if (ftDesktopV84()) {
      ftV84.host.classList.remove("is-detail");
      if (!ftV84.detail) ftOpenDetailV84(FT_LIST_V84[0].id, { push: false, focus: false });
    } else if (ftV84.detail) ftV84.host.classList.add("is-detail");
    ftSyncPagesV84();
  });
}

// ---------- Įėjimas prisijungimo ekrane ----------
document.getElementById("aeFtEntryV84")?.addEventListener("click", e => {
  e.preventDefault();
  ftOpenV84();
});

window.AutoEasierFeatures = {
  open: id => ftOpenV84(id),
  close: () => ftCloseV84(),
  list: FT_LIST_V84.map(f => ({ id: f.id, title: f.title, sub: f.sub }))
};
