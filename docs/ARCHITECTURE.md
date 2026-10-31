# Architektūra

## Kaip surenkamas failas

`src/index.html` yra šablonas. `tools/build.mjs` pakeičia jame tik tris nurodymų tipus:

| Nurodymas | Rezultatas |
|---|---|
| `<!-- @include partials/x.html -->` | įterpia HTML failą |
| `<!-- @inline <style id="a"> styles/x.css -->` | `<style id="a">…failas…</style>` |
| `<!-- @inline <script> scripts/app/ iife -->` | visi `scripts/app/*.js` pagal pavadinimą, apgaubti vienu `(() => { … })();` |
| `"@@datauri:assets/x.png@@"` bet kuriame faile | `data:image/png;base64,…` |

Blokų tvarka šablone yra kaskados ir vykdymo tvarka. Numeris `NNN` failo pavadinime rodo tą pačią vietą (stiliai ir skriptai numeruojami bendrai).

## Paleidimo seka

1. `<head>`: ~130 CSS blokų, JSZip (`vendor/`), keli ankstyvi skriptai.
2. `<body>` markup (`partials/`): prisijungimo ekranas, `.app` su visais `view-*`, overlays (toast, modal `#sheet`, PIN užraktas), apatinė navigacija.
3. `assets/autoeasier-document-assets.js` (išorinis failas hostinge).
4. **Pagrindinė programa** `scripts/app/01…32` (vienas scope). Ji sukuria `state`, prijungia įvykius, o pabaigoje paskelbia `window.AUTOEASIER_APP_DATA` ir iškviečia `render()`.
5. Papildomi skriptai `133…160`: buhalterijos eksportai (v16, v25), antraštė, Garažo skydelių atidarymas/uždarymas, užduočių valdikliai.
6. `155-autoeasier-supabase-auth-v1.js`: prisijungimas ir debesies sinchronizacija.

## Duomenys

Visa būsena yra vienas objektas `state` (`06-state-and-history.js → defaultState`). Jis saugomas `localStorage`:

- `visureigiai_uab_v1`: be prisijungimo (senasis raktas)
- `visureigiai_uab_v1:user:<supabase user id>`: prisijungus (`AUTOEASIER_APP_DATA.switchAccount`)

Pagrindiniai laukai:

| Laukas | Turinys |
|---|---|
| `cars[]` | automobilis: `buyPrice`, `status` (`aktyvus` → `beveik paruoštas` → `paruoštas` → `parduotas`), `checklist[]` (užduotys su `expense`, `dueDate`, `receipts`), `vin`, `plate`, `year`, `mileage`, `askingPrice`, `taStatus/taUntil`, `insuranceStatus/Until`, `sdk/sdkStatus`, `listingStatus`, `documents[]`, `photos[]` |
| `garageTasks[]` | kitos (asmeninės) užduotys: `priority`, `category`, `dueDate`, `done` |
| `leadVariants[]` | dominantys variantai (pirkimo kandidatai) |
| `contactBook` | kontaktų grupės ir kontaktai (`customers[]` yra senasis CRM) |
| `finances` | `transactions[]` (pajamos/išlaidos, gali turėti `carId`, `source:"carTask"`, `attachments`), `debts[]`, `debtLedger[]`, `budgetBalance`, mėnesio sumos |
| `accounting` | buhalterės `email`, savaitės paketo `queue[]` (parduotų auto id), `history[]` |
| `historyLog[]`, `completionLog[]` | veiksmų istorija ir atliktų darbų žurnalas |
| `workCenterPrefs` | Vadybininko atidėti / paslėpti darbai |
| `security` | PIN (`pinHash`), nesinchronizuojamas |
| `level, xp, coins, streak, skills, shop…` | senojo žaidybinimo likučiai, UI nebenaudoja |

Nuotraukos ir dokumentai **nėra** `state`. Jie saugomi IndexedDB (`03-photo-storage.js`, raktai `photo_…`), o `state` laiko tik raktus.

### Debesis (Supabase), `155-autoeasier-supabase-auth-v1.js`

- Prisijungimas el. paštu ir slaptažodžiu (Supabase Auth). SDK kraunamas iš CDN.
- Būsena: RPC `account_save_state(p_expected_revision, p_payload)`, skaitymas iš lentelės `user_app_state`, atsarginės kopijos `account_list_backups` ir `account_restore_backup`.
- Konfliktai sprendžiami trijų pusių sulyginimu `mergeThreeWay(base, local, remote)`.
- Media keliama į Storage bucket `user-media`.
- Nesinchronizuojama: `security`, `selectedView`, `ui`, `theme`, `sound`, `vibrate`.

## Pagrindiniai srautai

- **Naujas auto**: `14-vehicle-fields-documents` (`addCarBtn`). Jį papildo `28-new-car-smart-add-v29` (rankinis arba skenavimas) ir registracijos OCR `29–31` (Tesseract.js). `addCar()` atima pirkimo kainą iš `budgetBalance`.
- **Užduotis atlikta**: `completeCarChecklistItem` / `completeCarTaskWithExpenseV24` užrašo išlaidą, sukuria finansinę operaciją ir atnaujina auto būseną.
- **Pardavimas**: `openSaleModal`, tada `sellCar`. Tai leidžiama tik kai visos užduotys atliktos. Skaičiuojama savikaina = pirkimas + užduočių išlaidos, o marža = pardavimas − savikaina.
- **PP sutartis**: `18–19` užpildo PDF formą (pdf-lib iš CDN) arba naudoja „offline overlay“. Įmonės duomenys yra `PP_COMPANY`.
- **Buhalterija**: savaitės paketas (`16`), ataskaitos pagal laikotarpį ZIP su CSV ir dokumentais (`25`, `134`, `135`), dalinimasis per Web Share arba atsisiuntimas.
- **Vadybininkas**: `15-work-center` (`workCenterItems`, `workScore`) ir `23-garage-what-manager` (kortelės, veiksmų langai).

## Registracijos liudijimo skeneris (v50)

Nuo v50 skenavimas parašytas iš naujo, dviem failais:

- `src/scripts/app/33-registration-scanner.js` – variklis `RegScan` (be priklausomybių nuo programėlės):
  1. nuotrauka sumažinama iki 2200 px, ištaisomas pasvirimas (projekcijos metodu, ±20°);
  2. sukuriamas „tamsumo“ žemėlapis pagal šviesį (Y) lyginant su vietiniu fonu, todėl dingsta žalias / geltonas fonas, raštas, šešėliai;
  3. Tesseract.js (CDN, `eng`) skaito 4 kontrasto variantus, kiekvieno rezultatą parseris paverčia kandidatais;
  4. kandidatai sujungiami balsavimu, o trūkstami laukai papildomai skaitomi iš atskirų eilučių (2× padidinta);
  5. jei pirmas praėjimas beveik nieko neranda, bandomos 90°, 270° ir 180° kryptys.
  Parseris atpažįsta etiketes (A, B, B.1, D.1, D.3, E, P.1, P.2, P.3) su OCR klaidomis (D↔0, 1↔l, B↔8…) ir pagal reikšmių formą, kai etiketės nematyti. Jis tikrina VIN (17 simbolių, be I/O/Q), numerį (AAA999), datas, galios ir tūrio santykį.
- `src/scripts/app/34-registration-ui.js` – kortelė „Registracijos liudijimas“ (fotografuoti / iš galerijos + laukai) ir prijungimas prie: naujo automobilio formos, automobilio redagavimo, Vadybininko „Užpildyti trūkstamus duomenis“, PP sutarties generatoriaus ir automobilio kortelės peržiūros.

Automobilio laukai iš liudijimo: `regMake` (D.1), `regModel` (D.3), `registrationDoc` (serija ir nr., pvz. `K1281961` arba `J016663`), `vin` (E), `plate` (A), `firstRegistrationDate` (B; jei B nenurodyta – B.1), `engineCc` (P.1), `powerKw` (P.2), `fuelType` (P.3). Pavadinimas = markė + modelis.

Senieji OCR moduliai `28–31` vis dar įkeliami (kiti moduliai naudoja jų pagalbines funkcijas), bet skenavimą jau perima v50.

**Testavimas** (`tools/regscan/`): `test-regscan.mjs` paleidžia tikrą variklį Chromium naršyklėje, o OCR vietoje Tesseract.js atlieka vietinis `tesseract`. `grid-regscan.mjs` ir `score-grid.mjs` padeda parinkti paruošimo variantus, `test-ui.mjs` tikrina visą formą. Tikrų liudijimų nuotraukose yra asmens duomenų, todėl jos **nelaikomos repozitorijoje** – testams nurodomas aplankas už jo ribų.

## Automobilio formos ir kortelė (v51)

`src/scripts/app/35-car-ui-v51.js` + `src/styles/164-car-ui-v51.css`:

- **Nauja forma ir redagavimas** naudoja vieną komponentą `carFormHTMLV51(p, car, "new"|"edit")`. Jame yra registracijos liudijimo kortelė (skenavimas ir laukai), pirkimo kaina, rida, TA ir draudimas (pasirinkimas „Galioja / Negalioja / Nežinoma“, o data atsiranda tik pasirinkus „Galioja“), SDK. Naujame automobilyje dar yra nuotraukos ir dokumentai, redagavime – pastabos.
- Nuskaitymą atlieka `readCarFormV51(p)`. Pavadinimas visada = markė + modelis, `year` gaunamas iš pirmosios registracijos datos.
- Laukai **planuojama pardavimo kaina, pasiūlymo kanalas, skelbimas / skelbimo data, pagaminimo metai, pavadinimas** formose nerodomi. Esamų automobilių šios reikšmės lieka nepakeistos, nes forma grąžina tik savo laukus.
- **Kortelė** (`renderCarSheet` apvalkalas): viršuje rodomas informacijos blokas (numeris, TA, draudimo ir SDK būsenos, pagrindiniai faktai, VIN), po jo pinigai, užduotys, nuotraukos, dokumentai ir veiksmai. Senas „Daugiau informacijos“ blokas paslėptas, bet DOM'e paliktas suderinamumui. Nuotraukas ir dokumentus tvarko pati kortelė, todėl redagavimo formoje jų nėra.

Testas: `node tools/test-car-forms.mjs` (forma, TA data, redagavimas, duomenų išsaugojimas, biudžetas).

## Datos laukai ir sutartys (v53)

- `36-datepicker-v52.js`: datos laukai yra sistemos (`<input type="date">`), todėl telefone atsidaro įprastas iOS / Android kalendorius. Laukas platus, su ikonėle, ir paspaudžiamas visas (`showPicker()`). Stilius – `165-sheets-v52.css`.
- `37-contract-v52.js`: pildo **oficialią Regitros pirkimo–pardavimo sutarties formą** (3 psl.). Formos fonas – `src/public/assets/pp/regitra-pp-{1,2,3}.jpg` (200 DPI, iš originalaus PDF), o laukų koordinatės yra `CT_FORM_V53`, paimtos iš originalaus PDF formos laukų (y pastumta +7,83 pt dėl CropBox). Užpildoma: data, laikas, valstybė; abi šalys (kodas langeliuose, vardas, telefonas, el. paštas, adresas); SDK, markė ir modelis, valst. nr., rida, VIN, liudijimas; TA varnelė; „buvo/nebuvo“ ir „žinomi/nežinomi“ išbraukimai; trūkumų varnelės; įvykių informacija; kaina skaičiais ir žodžiais; atsiskaitymo būdas ir momentas; draudimo perdavimas; papildoma informacija; vardai prie parašų. Nutraukimo susitarimas lieka tuščias.
- PDF sudedamas be bibliotekų (`ctPdfFromCanvasesV52`). Formos paveikslėliai kraunami iš `./assets/pp/`, kuriuos build nukopijuoja šalia `index.html` (`src/public/**`).
- `165-sheets-v52.css`: vienodas visų iššokančių langų stilius.

Testai: `node tools/test-contract.mjs` (per vietinį HTTP serverį, sukuria `.verify/contract.pdf`), `node tools/sheet-gallery.mjs`.

## Dizaino sistema (v54)

`src/styles/166-design-system-v54.css` yra **paskutinis** CSS sluoksnis ir vienintelė vieta, kur keičiama bendra išvaizda: spalvų ir dydžių tokenai (`--ds-*`), šriftų minimumai (tekstas ≥ 12 px, laukai 16 px, etiketės 13 px), laukai (48 px, apvalumas 13 px), mygtukai (48 px; pagrindinis – mėlynas gradientas, antrinis – baltas su rėmeliu), atidaromi skydeliai (Užduotys, Variantai, Kontaktai, Naujas auto, Buhalterija, Meniu) kaip vienodos kortelės su vienoda antrašte ir ramiu „Uždaryti“, ženkleliai, iššokantys langai.

Visos taisyklės turi prefiksą `html:not(#ae):not(#af) body:not(#ae):not(#af)` (+4 ID specifiškumo), kad laimėtų prieš ~160 senų sluoksnių. Bendrose taisyklėse **nenustatoma `display`**, nes daug elementų slepiami `style="display:none"`.

Įrankiai: `node tools/screens.mjs` (visų 24 ekranų ir langų nuotraukos), `node tools/ui-audit.mjs` (per mažas tekstas ir maži mygtukai), `python3 tools/contact-sheet.py` (nuotraukų suvestinė).

Vadybininkas nebesiūlo „Kodėl dar ne skelbime?“ ir kainos peržiūros pagal skelbimo dienas, nes skelbimo laukas pašalintas (`35-car-ui-v51.js`).

## PP langas ir automobilio kortelė (v55)

- **PP langas** (`37-contract-v52.js`, `openContractSheetV52`): pasirinkus automobilį rodoma jo santrauka ir **tik trūkstami laukai** (`CT_CAR_FIELDS_V55`: markė, modelis, numeris, VIN, liudijimas, rida, SDK, o TA – jei nežinoma). Ranka įvesti trūkę duomenys išsaugomi automobilio kortelėje. Kita šalis numatytai „Pildys ranka“, todėl sutartyje jos laukai lieka tušti. Įvykiai, trūkumai, atsiskaitymo būdas ir momentas, draudimo perdavimas formoje nerodomi ir PDF'e nežymimi, jie pildomi ranka.
- **Automobilio kortelė** (`38-car-card-v55.js`, `167-car-card-v55.css`): antraštė „markė modelis“ centre, ✕ dešinėje; sekcija „Užduotys“ su skaitikliu (pvz. 1/3); visos sekcijos vienodos baltos kortelės; kainos vienoje kortelėje; be emoji; nuotraukų sekcija be tuščio laukelio.
- Tinkleliai (`cfGridV51`, `grid2`, datų eilutės) naudoja `minmax(0,1fr)`, todėl datos ir laiko laukai neišlenda už kortelės.

## Naudotojo duomenys (v57)

`39-profile-onboarding-v57.js`: kai programėlė tampa matoma (prisijungimo ir PIN langai uždaryti), o `state.profile` neužpildytas, atidaromas privalomas langas „Jūsų duomenys“. Jame pasirenkama „Fizinis asmuo“ (vardas, asmens kodas, telefonas, el. paštas, adresas) arba „Įmonė“ (dar įmonės kodas ir atstovas). Langas neužsidaro, kol duomenys neišsaugoti. Profilis sinchronizuojamas į `state.accounting.pp.company` (PP sutartis) ir atgal, o antraštėje dešinėje rodomas vardas arba pavadinimas (kitiems nei Visureigiai – inicialai vietoj logotipo). Nustatymuose yra mygtukas „Mano duomenys“. Testas: `node tools/test-profile.mjs`.

## Išskleidžiami skydeliai (v59)

`40-panel-heads-v59.js` ir `169-panel-heads-v59.css`: visų išskleidžiamų skydelių (Garažas: Užduotys, Kontaktai, Variantai, Pridėti automobilį; Buhalterija: įplauka, išlaida, ataskaitos; Meniu: statistika, finansai, kontaktai, istorija, nustatymai) antraštė vienoda. Kairėje paspausto mygtuko pavadinimas (19 px), dešinėje „Uždaryti“ (96×36 px). Po antrašte eina linija, skydelio vidinis tarpas 12 px. Papildomi elementai („Pridėti kontaktą“, ataskaitų laikotarpis) perkeliami po antrašte. „Pridėti automobilį“ gavo `#cancelAddCarBtn`, o antras plytelės paspaudimas skydelį suskleidžia. `phNormalizeV59()` paleidžiama per MutationObserver po kiekvieno perpiešimo. Testas: `node tools/test-panels.mjs`.

## Sąrašų kortelės ir automobilio kortelės viršus (v60)

- **Sąrašų kortelės** (`168-list-cards-v60.css`): aktyvūs, parduoti automobiliai ir variantai. Kairėje didelė nuotrauka (38 %, 4:3; be nuotraukos rodomas pilkas automobilio ženkliukas). Dešinėje pavadinimas, būsenos ir trys skaičiai su plonais skirtukais. Apačioje tamsus mygtukas „Atidaryti ›“ per visą plotį, o variantuose greta jo „Skambinti“. Nerodoma: rekomendacijos, nuotraukų skaičius, nežinomos TA ir draudimo būsenos, o parduotiems – ir TA bei draudimas. Variantų skaičiai pavadinti „Prašo / Siūlome / Pelnas“ (`10-render.js`).
- **Automobilio kortelės viršus** (`41-car-detail-v60.js` perrašo `cdInfoHTMLV51`; stilius – `170-car-detail-v60.css`):
  - numerio ženklas (LT) ir rida;
  - trys būsenų plytelės: TA, Draudimas ir SDK (spalva pagal būseną, po ja data „iki …“);
  - duomenų sąrašas: pirmoji registracija, variklis, kuras, liudijimas ir VIN (VIN paspaudus nukopijuojamas).

## Kortelės (v61)

- **Sąrašų kortelės** dabar visos vienodos (kaip parduotų automobilių): nuotrauka, pavadinimas, numerio ženklas (`lcPlateHTMLV61`) ir trys skaičiai. Nėra „Atidaryti“ mygtuko, nes paspaudžiama visa kortelė, ir nėra datų. Variantuose po pavadinimu yra kompaktiškas žalias „Skambinti“, o metai, miestas ir „liko dienų“ nerodomi. Šablonai yra `10-render.js`, stilius – `168-list-cards-v60.css` (v61 blokas failo gale).
- **Automobilio kortelė** (`42-car-sheet-v61.js`, `171-car-sheet-v61.css`):
  - antraštėje kairėje yra numerio ženklas;
  - būsenų tvarka: SDK, Draudimas, TA;
  - rida perkelta į duomenų sąrašą (`41-car-detail-v60.js`);
  - nuotraukų rodomos pirmos trys, o mygtukas „Rodyti visas (N)“ atskleidžia likusias;
  - dokumentai visada atidaryti; vienas „Pridėti dokumentą“ atskleidžia tipų pasirinkimą.
- **Klaida ištaisyta:** formose (`35-car-ui-v51.js`) pasirinkus „Galioja“, TA ir draudimo datos laukas likdavo išjungtas. Senas surišimas `14-vehicle-fields-documents.js` jį išjungdavo ir laukdavo `change` įvykio, o paslėptas laukas to įvykio negauna.

## Užduotys, varianto kortelė ir sklandumas (v62)

- **Užduočių skydelis** (`43-tasks-hub-v62.js`, `172-tasks-hub-v62.css`):
  - skirtukai „Šiandien / Auto / Kitos“ su skaičiais;
  - eilutės su apvaliu žymėjimu ir terminu („Vėluoja N d.“, „Šiandien“, „Rytoj“, data);
  - automobilių užduotys sugrupuotos pagal automobilį (su numeriu);
  - atliekant automobilio užduotį klausiama išlaidų (> 0 € atidaro čekio langą `openCarTaskReceiptSheetV24`);
  - „Nauja užduotis“ kviečia `addGarageTask`;
  - senos `.garageUnifiedSection` paslėptos.
  - Testas: `node tools/test-tasks.mjs`.
- **Varianto kortelė** (`45-lead-sheet-v62.js`): suvestinė (telefonas, miestas, metai, kitas skambutis, žalias „Skambinti“, centruotos kainos Prašo / Siūlome / Pelnas). Laukai sugrupuoti į korteles Automobilis, Pardavėjas, Kainos, Būklė ir Pastabos (id nepakeisti). Nuotraukų rodomos pirmos trys.
- **Sklandumas** (`44-smooth-v62.js`):
  - Garažo „Variantai“, „Kontaktai“ ir „Užduotys“ atsidaro be viso `render()`, todėl puslapis nešokinėja, o nuotraukos nekraunamos iš naujo;
  - juostos šriftas visada 12 px / 650, keičiasi tik spalva.
- **Kita** (`173-polish-v62.css`):
  - automobilio kortelės antraštė: numeris ir pavadinimas kairėje;
  - SDK plytelė balta su dokumento ženklu;
  - kainų skaičiai centruoti;
  - aktyvių automobilių kortelėse nebėra „Tikslas“.

## Puslapių perjungimas ir užduotys (v63)

- **Apačios juosta** (`46-nav-v63.js`): paspaudus Garažas, Buhalterija ar Meniu, visas `render()` nebekviečiamas. Anksčiau jis perpiešdavo visus ekranus, nuotraukas ir juostos ikonas (`homeReferenceNavV12`), todėl ekranas mirksėjo. Dabar perjungiamas tik `.view.active` ir juostos būsena, o slinkimo vieta nekeičiama. Patikrinta, kad turinys sutampa su pilno `render()` rezultatu.
- **Sąrašų kortelės:** aktyviuose – Pirkta, Išlaidos, Savikaina (`carTotalCost`). Visų kortelių skaičiai centruoti.
- **Užduočių skydelis:**
  - atidarius visada rodomas „Šiandien“;
  - viršuje pažangos žiedas (atlikta šiandien iš visų šiandienos) ir „N vėluoja“;
  - automobilio užduotyse – numeris ir markė bei modelis;
  - „Nauja užduotis“ (tik ne automobilio) rodoma tik skiltyje „Kitos“.
- **Automobilio kortelės užduotys** (`47-car-tasks-v63.js`, `174-car-tasks-v63.css`):
  - pažangos juosta, apvalūs žymėjimai, terminai spalva;
  - atliktos sudėtos į suskleidžiamą „Atlikta“;
  - nauja užduotis įvedama čia pat;
  - `openCar` tos pačios kortelės slinkimo vietą išlaiko.

## Planšetė ir kompiuteris (v64)

`175-responsive-v64.css`: telefono vaizdas (iki 767 px) nepakeistas (patikrinta pikselis į pikselį). Visos taisyklės yra tik `@media (min-width: …)` blokuose, o ekranas parenkamas automatiškai pagal plotį.

- **Planšetė (768–1099 px):**
  - turinys iki 900 px;
  - plytelės – 4 stulpeliai, meniu – 3;
  - automobiliai, variantai ir dokumentų eilė – 2 stulpeliais;
  - juosta apačioje plaukioja centre (iki 520 px);
  - kortelės – 680 px pločio.
- **Kompiuteris (nuo 1100 px):**
  - šoninis meniu 256 px kairėje, viršuje logotipas ir įmonė (`.topbar` fiksuotas; `.app` gauna `isolation: auto`);
  - turinys iki 1220 px (nuo 1560 px – 1320 px);
  - automobiliai tinklelyje `auto-fill, minmax(360px, 1fr)`;
  - automobilio ir varianto kortelės bei formos atsidaro skydelyje dešinėje (600 px);
  - nuo 1400 px „Vadybininkas“ ir plytelės vienoje eilėje;
  - užvedus pele – švelnus pakėlimas.
- Testas: `node tools/test-responsive.mjs`.

## Užduoties atlikimas, Vadybininkas ir smulkūs patobulinimai (v65)

- **Vienas atlikimo skydelis** (`48-task-complete-v65.js`). Jis rodomas automobilio kortelėje (paspaudus varnelę ar eilutę), Garažo užduotyse ir Vadybininke. Skydelyje yra „Kaina, €“, „Prisegti čekį“ ir „Atlikta“.
  - Kai kaina > 0 ir čekis prisegtas, užduotis atliekama automatiškai.
  - Be kainos užduotis atliekama mygtuku „Atlikta“.
  - Kaina be čekio neleidžiama – rodomas priminimas.
  - Išsaugoma per `accountingReadAttachmentsV8` ir `completeCarTaskWithExpenseV24` (išlaida su čekiu patenka į Buhalteriją). Po to atnaujinama kortelė (`renderCarSheet`, išlaikant slinkimą) ir `render()`.
- **Vadybininkas** (`49-manager-v65.js`): antraštė ir suvestinė (Darbai / Vėluoja / Šiandien). Automobilio užduoties eilutė (`car:<id>:task:<id>`) atidaro atlikimo skydelį su nuoroda „Atidaryti kortelę“.
- **Automobilio kortelė:**
  - antraštėje centre markė ir modelis (21 px);
  - numeris perkeltas į duomenų sąrašą („Valstybinis numeris“);
  - užduotys didesnės, be išlaidų laukelio eilutėje;
  - nuotraukos 4:3, „Pridėti nuotraukų“ didesnis ir apačioje.
- **Parduoti automobiliai** atsidaro be `render()` (vėliavėlė `soldLiteV65` faile `46-nav-v63.js`).
- **Kita** (`176-v65.css`):
  - visų skilčių ir skydelių pavadinimai 21 px;
  - mažose kortelėse pavadinimai kairėje, sumos centre;
  - telefono apačios juostos matmenys vienodi visuose puslapiuose.

## Kortelių nuotraukos ir Vadybininko užduotys kortelėje (v66)

- **Mažos kortelės:** skaičių pavadinimai ir sumos lygiuojami kairėje (`177-v66.css`).
- **Nuotraukos automobilio ir varianto kortelėse:**
  - po 4 eilutėje, kvadratinės; „Rodyti visas (N)“ atskleidžia likusias;
  - „Atsisiųsti visas“ visada lieka (prieš perkuriant eilutę mygtukas grąžinamas į sekciją);
  - „Pridėti nuotraukų“ – punktyrinis, virš šių mygtukų.
- **Vadybininko užduotys kortelėje** (`50-car-manager-v66.js`):
  - pirmiausia rodomos naudotojo užduotys, Vadybininko darbai šiam automobiliui – po mygtuku „Vadybininko užduotys“ (senas `.carManagerSystemList` paslėptas);
  - paspaudus darbą, atidaromas `openWhatItemV30` langas, o jį uždarius (`closeSheet`) grįžtama į tą pačią kortelę (`cmReturnCarV66`).

## Nuotraukų užpildymas (v67)

`51-photo-fill-v67.js`: kortelių ir sąrašų šablonai naudoja `photoUrlCache[ref] || ""`. Jei kortelė atidaroma anksčiau, nei nuotrauka įkeliama iš IndexedDB ar debesies, paveikslėlis likdavo tuščias. Dabar po `renderCarSheet`, `openGarageLeadSheet` ir `render()` kiekvienas tuščias paveikslėlis (miniatiūros, viršutinė nuotrauka, sąrašų kortelės) užpildomas per `photoGet`. Patikrinta dirbtinai sulėtinus IndexedDB. Automobilio kortelėje nebėra užrašo „Užduočių dar nėra“.

## Miniatiūros ir suspaudimas (v68)

- **Kortelių nuotraukų miniatiūros** (`177-v66.css`, v68 blokas): kvadratas sudaromas `::before { padding-top: 100% }` būdu, o mygtukas ir paveikslėlis išdėstomi absoliučiai. „Safari“ neperskaičiuodavo 100 % aukščio `aspect-ratio` dėžutėje, todėl nuotraukos būdavo nematomos.
- **Suspaudimas** (`52-compress-v68.js`):
  - **nuotraukos** (`compressPhoto`): iki 2400 px, WebP 0,86 (jei naršyklė nesukuria WebP – JPEG); originalas paliekamas, jei suspaustas failas nebūtų bent 10 % mažesnis. Pavyzdys: 3,3 MB → 215 KB, 2400×1800;
  - **dokumentai** (`readDocumentFile`): JPG ir WebP perkoduojami tuo pačiu formatu (0,88), pavadinimas išlieka. Pavyzdys: 3,3 MB → 468 KB;
  - PDF ir PNG nekeičiami.

## Kortelės blokai, juosta ir „Laukia pateikimo“ (v69)

- **Nuotraukų blokas** (`phLayoutV69` faile `42-car-sheet-v61.js`, naudoja ir variantai):
  - antraštėje dešinėje „Atsisiųsti“;
  - po nuotraukomis viena eilutė: punktyrinis „＋ Pridėti nuotraukų“ ir „Visos (N)“ / „Mažiau“.
- **Automobilio kortelė** (`53-v69.js`, `178-v69.css`):
  - rodomas pirmas dokumentas, kiti – „Rodyti visus (N)“;
  - kainos trimis stulpeliais: Pirkimo kaina / Išlaidos / Savikaina;
  - antraštė neprilipdyta;
  - visų blokų pavadinimai 19 px, kaip „Užduotys“.
- **Buhalterija:** „Laukia pateikimo“ sugrupuota pagal automobilį (nuotrauka, pavadinimas, numeris, skaičius). Eilutėse rodomas dokumento pavadinimas ir mygtukas „Pridėti“. Rodomos 3 grupės, kitos – „Rodyti visus“. Planšetėje ir kompiuteryje – 2 stulpeliai.
- **Telefono apačios juosta:** nepermatomas baltas fonas iki pat ekrano apačios, viršuje plona linija.

## Prenumerata – SaaS (v70)

- **Prisijungimo ekranas:** apatinis mygtukas „Išbandyti 7 d. nemokamai“ atidaro plano skydelį (`180-billing-v70.js`, stilius `179-billing-v70.css`). Planai aprašyti masyve `PLANS` (dabar vienas – „Profesionalus“). Kad atsirastų daugiau planų, pakanka pridėti įrašą į masyvą ir kainą Stripe su savo `lookup_key`.
- **Skydelis** (`#aeBillV70`) gyvena už `.app` ribų, todėl veikia ir prisijungimo ekrane. Jis uždaromas su X, Escape, fono paspaudimu ir braukimu žemyn. Telefone jis išslenka iš apačios, planšetėje ir kompiuteryje rodomas kaip centruotas langas.
- **Srautas:** CTA → (nėra paskyros: registracija, ketinimas `autoeasier-trial-intent-v70`) → Edge Function `create-checkout-session` → Stripe Checkout (7 d. bandomasis, kortelė privaloma, `locale: lt`) → `?checkout=success` → `account_subscription()` tikrinamas kas 2 s, kol prieiga suteikiama → pasisveikinimo langas.
- **Serveris (Supabase):** lentelė `public.subscriptions` (RLS: vartotojas gali tik skaityti savo įrašą, rašo tik `stripe-webhook` per service role). Prieigos taisyklė yra vienoje vietoje, `subscription_access_for()`: suteikiama, jei `comped`, `trialing` arba `active`, taip pat `past_due` ≤ 3 d. Rašymą be prieigos blokuoja `account_save_state`, `account_restore_backup` ir `user-media` įkėlimo politika. Migracija: `supabase/migrations/20261028_subscriptions_saas_v1.sql`. Esamoms paskyroms suteikta `comped` (nemokama) prieiga.
- **Edge Functions** (`supabase/functions/`): `create-checkout-session`, `create-portal-session`, `stripe-webhook`. Pastaroji tikrina parašą (`STRIPE_WEBHOOK_SECRET`), o būseną visada perskaito iš Stripe API. Jei paslaptis neįvesta, įvykis tikrinamas `events.retrieve`. Priminimas apie bandomojo laikotarpio pabaigą siunčiamas per Resend gavus `trial_will_end` (Stripe šį įvykį siunčia likus 3 d.).
- **Stripe:** produktas „AutoEasier Profesionalus“, kaina 49 EUR / mėn. (`lookup_key: autoeasier_pro_monthly`, su PVM, jei taikomas), Customer Portal (atšaukimas laikotarpio pabaigoje, kortelė, sąskaitos), webhook į `…/functions/v1/stripe-webhook`. Kainos ID kode nėra.
- **Tik peržiūra** (`app/54-readonly-v70.js`): kai `access === false`, `saveState` grąžina paskutinę išsaugotą būseną ir atidaro „Atnaujinkite prenumeratą“. Vietiniai laukai (`ui`, `selectedView`, tema…) išsaugomi kaip įprasta, failų pasirinkimas blokuojamas, į debesį nerašoma (`window.__autoEasierReadOnly`).
- **Garažo juosta** `#aeBarV70` (po `.garageRefBrandRow`) rodoma tik esant bandomajam laikotarpiui, mokėjimo klaidai, atšaukimui laikotarpio pabaigoje arba tik peržiūros režimui. Comped ir aktyviems vartotojams Garažas lieka pikselis į pikselį toks pat.
- **Nustatymai → Prenumerata** (`#aeSubPanelV70`, Meniu → Nustatymai) rodo būseną, datas ir „Valdyti prenumeratą“ (Stripe portalas). Ten taip pat yra Paslaugų teikimo sąlygų ir Privatumo politikos nuorodos (`#salygos`, `#privatumas` – veikia ir neprisijungus).
- **Testas:** `node tools/test-subscription.mjs` (375 / 430 / 834 / 1440).

## Prieigos užraktas, nuotraukos, Nustatymai (v71)

- **Prieigos užraktas.** `bootstrapWorkspace` (155) po `account_subscription()`: jei `status in (none, incomplete, incomplete_expired)` ir nėra `comped`/`access`, programėlė **neatidaroma** ir duomenys nekraunami: `body.autoeasier-paywall`, programos mazgai `inert`, siunčiamas `autoeasier:paywall`. `180-billing-v70.js` piešia visą ekraną `#aePaywallV71` (planas, „Išbandyti 7 d. nemokamai“, Atsijungti). Grįžus iš Stripe (`?checkout=success`) rodoma „Aktyvuojama…“, kol `account_subscription` grąžina `access`, tada `AUTOEASIER_AUTH.enter()` atidaro programėlę be perkrovimo. `canceled`/`unpaid` lieka „tik peržiūra“ (v70).
- **Nuotraukos.** `app/55-photo-preload-v71.js`: `AUTOEASIER_APP_DATA.preloadPhotos`. Prieš `showApp` palaukiama viršelių (≤ 2,5 s), likusios kraunamos fone; po pakrovimo daromas `render()` (jei nėra atidaryto lango / fokuso). `downloadMedia` nebeįsimena nepavykusių atsisiuntimų.
- **Duomenų langas.** `profileCheckV57` nebeatidaro privalomo lango, o rodo priminimą `#pfRemindV71` (atidedamas 3 d., raktas `autoeasier_profile_snooze_v71`); Nustatymuose – ženkliukas „Neužpildyta“ (`html.pfIncompleteV71`).
- **Nustatymai.** `view-settings.html` suskirstyta į grupes: Paskyra (Prenumerata `#aeSubPanelV70`, Mano duomenys, el. paštas + Atsijungti `#setAccountSlotV71`), Sauga, Buhalterija, Programėlė, Duomenys. Meniu eilė: Kontaktai, Finansai, Pardavimų statistika, Veiksmų istorija, Nustatymai (ta pati eilė `147-…js` apibrėžimuose).
- **Apatinė juosta.** `styles/181-v71.css`: mažesni vertikalūs tarpai (mygtukų dydis tas pats), fonas vientisas iki apačios. Literalus `\n` tarp skriptų `src/index.html` pašalintas.
- **Nauji vartotojai be „Visureigiai“ (v71).** Numatytieji Visureigiai rekvizitai (PP_COMPANY, buhalterės el. paštas, kodas ataskaitose, antraštė) pašalinti. Pavadinimas rodomas tik užpildžius „Mano duomenys“ (`html.pfNamedV71`, `window.AutoEasierProfile.name/code/htmlName`); Nustatymuose – eilutė „Mano duomenys“ su būsena.
- Testai: `tools/test-subscription.mjs` (užraktas), `tools/test-photos.mjs`, `tools/test-profile.mjs` (priminimas).

## Admin skydelis (v72)

- Tik `autoeasier@gmail.com` (ID `7d06aa84-…`). Prisegtas mygtukas `#aeAdminFabV72` (visuose puslapiuose, dešinėje virš juostos) atidaro apatinį langą `#aeAdminV72`: **Apžvalga** (rodikliai, MRR, „reikia dėmesio“, saugykla, likusių failų valymas), **Vartotojai** (paieška, filtrai, kortelė su veiksmais), **Veikla** (audito žurnalas). Kodas: `scripts/182-admin-v72.js`, `styles/182-admin-v72.css`.
- **Serveris.** Skaitymas – `public.admin_overview/admin_users/admin_audit_list/admin_orphans` (SECURITY DEFINER, tikrina `is_platform_admin()`: JWT ID + el. paštas). Veiksmai – Edge Function `admin-action` (service role; tikrina tą patį): `set_comped`, `set_banned`, `send_reset`, `cancel_subscription` (iš karto / periodo pabaigoje), `resume_subscription`, `extend_trial`, `delete_user` (atšaukia Stripe, ištrina failus per Storage API, tada vartotoją; reikia įrašyti el. paštą), `cleanup_orphans`. Visi veiksmai rašomi į `public.admin_audit`. Migracija: `supabase/migrations/20261029_admin_panel_v1.sql`.
- Administratorius mato tik skaičius (automobilių, failų), o ne vartotojų verslo duomenis. Stripe veiksmai naudoja `STRIPE_SECRET_KEY` (gyvas režimas).
- Testas: `tools/test-admin.mjs` (imituoja RPC ir Edge Function).

## Perrašymų grandinės (svarbu!)

Programa augo sluoksniais: nauja versija **perrašo** seną funkciją (`render = async function () { await __renderPP(); … }`). Todėl:

- funkcija gali būti apibrėžta 2–9 kartus, o galioja paskutinė versija;
- `renderAccountingCenter` turi 9 versijas, `render` 5, `renderCarSheet` 5.

Pilnas sąrašas yra [`OVERRIDES.md`](OVERRIDES.md) (`npm run check` jį atnaujina). Prieš keisdamas funkciją, rask jos paskutinę versiją.

Tas pats su CSS: 148 blokai, daug `!important`. Vėlesnis blokas laimi, todėl elemento išvaizdą dažnai lemia vienas iš paskutinių failų (pvz., `151+`).

## Žinomi dalykai, kurie palikti tyčia (kad niekas nepasikeistų)

- Du `function` dublikatai tame pačiame scope: `daysBetweenISO` (01 ir 15), `downloadAllEntityPhotos` (05 du kartus). Dėl hoisting galioja paskutinė versija.
- Pasikartojantys `id`: `<style id="final-app-polish">` yra du kartus, `garage-inline-disclosures-v1` naudoja ir style, ir script.
- `src/index.html` gale, tarp skriptų, yra du pažodiniai tekstai `\n`. Jie buvo originale.
- `#view-home` paslėptas, todėl programa visada startuoja nuo Garažo.
- Supabase publishable raktas yra kode. Tai normalu, jei DB įjungtas RLS.

## v73

- Vadybininkas grąžintas į senąjį vaizdą (hero „Svarbiausia dabar“ + eilutės su „•••“), be suvestinės; tekstai sutrumpinti (`app/56-v73.js`, apgaubia `workCenterItems`): „Užpildyti duomenis“ su detale „PP sutarčiai trūksta: …“, „Prisegti dokumentus“.
- `openCar` visada atveria kortelę nuo viršaus; grįžus į programą po >20 s – Garažas (`visibilitychange`).
- `styles/183-v73.css`: nuo 600 px pločio apatinė juosta be `backdrop-filter` ir šešėlio aplink.

## v75 (taisymai ant v73f)

- „Ištrinti duomenis“ (`12-security-and-settings.js`): ištrina tik įmonės įrašus; nustatymai (tema, garsas, PIN), profilis ir buhalterės rekvizitai paliekami; visi vidiniai laukai (`reportingRange`, `ui`) sukuriami iš naujo. `renderGarageStatsPage` papildomai apsaugotas nuo trūkstamo `reportingRange`. Testas: `tools/test-reset.mjs`.
- XSS: `sanitizeMediaRefs` (`06-state-and-history.js`) nuvalo nesaugias nuotraukų nuorodas įkeliant būseną (loadState, debesies atnaujinimas). Testas: `tools/test-xss.mjs` (užnuodija visus tekstinius laukus ir atidaro ekranus).
- `155-…supabase-auth-v1.js`: supabase-js kraunamas fiksuota versija, jei nepasiekiama – atsarginis `@2`.
- `vercel.json`: saugumo antraštės (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- v75 (2): klientui suprantami prisijungimo/registracijos klaidų tekstai (`friendlyAuthError`), teisinė eilutė prisijungimo ekrane, `moneyFmt` rodo centus, kai suma nėra sveikas skaičius, SEO/OG meta žymos ir ikona `src/index.html`.

## v75 (3): pradžios būsena, paskyros trynimas, meniu perdėliojimas

- `app/58-v75.js`: tuščios pradžios kortelė („Pridėkite pirmą automobilį“), mygtukas „Pildyti duomenis“ antraštėje (rodomas tik kol profilis neužpildytas), „Ištrinti paskyrą“ langas (Edge Function `delete-account`), Finansai Buhalterijos viduje, Garažo „Generuoti sutartį“ atidaro Buhalterijos PP pasirinkimą.
- `styles/184-v75.css`: visi šių elementų stiliai.
- Meniu mygtukų eilė: Kontaktai, Veiksmų istorija, Pardavimų statistika, Nustatymai (`147-…js` `definitions` turi sutapti pagal indeksą su `view-menu.html`).
- Bandomojo laikotarpio juostos viršuje nebėra (`180-billing-v70.js` `barModel`); informacija – Nustatymuose.
- Ataskaitų antraštės, failų pavadinimai ir užrakto ekranas naudoja `AutoEasierProfile.upperName()/fileName()` (atsarginė reikšmė „AutoEasier“), o ne „Visureigiai, UAB“. Atsarginės kopijos žymė `app: "visureigiai-uab"` paliekama (atkūrimo suderinamumui).
- `supabase/functions/delete-account`: JWT + el. pašto patvirtinimas, nutraukia Stripe prenumeratą, trina `user-media/<uid>` ir paskyrą (FK CASCADE).

## v75 (4): sinchronizacija tarp įrenginių

- `155-…js`: `mergeThreeWay` nebemeta klaidų (tas pats laukas – laimi vietinis, o prisijungiant be bazinės kopijos – debesies; sąrašai be `id` sujungiami; ištrynimas nepergalėja kitur pakeisto įrašo).
- Prisijungiant, jei šiame įrenginyje yra neįkeltų pakeitimų, jie sujungiami su debesies versija (anksčiau debesies versija viską perrašydavo). Bazinė sinchronizuota kopija saugoma `autoeasier-sync-base-v1:<uid>`.
- Nepavykus įkelti, bandoma iš naujo savaime (iki 8 kartų); `cloudConflict` nebeužblokuoja sinchronizacijos. Nepakitę duomenys nebeįkeliami (mažiau revizijų). Debesies tikrinimas kas 15 s ir grįžus į langą.
- Testas: `tools/test-sync.mjs` (du įrenginiai su dirbtiniu Supabase).

## v76: „premium“ dizaino sluoksnis

- `styles/185-v76-premium.css` – paskutinis CSS blokas (prefiksas su 5 ID, stipresnis už visus ankstesnius). Paletė ir matmenys išmatuoti iš Garažo pavyzdžio (430 px): fonas `#f3f6fa`, prekės ženklo mėlyna `#284ca2` (vientisa, be gradientų), tekstas `#0f1626`, rėmeliai `#e3e6ec`, piktogramų fonas `#edf1f7`.
- Tas pats failas perrašo senus `--ds-*` tokenus, todėl ankstesni sluoksniai (166 ir kt.) naudoja tą pačią paletę.
- Vienodi komponentai: Vadybininko juosta (79 px, r 28), plytelės Garaže / Buhalterijoje / Meniu (84 px, r 24, piktograma 42 px), kortelės ir išskleidimai (r 24), mygtukai (50 px, r 16; pagrindiniai 54–58 px, r 18), laukai (50 px, r 14), langai (#sheet viršus r 28), aktyvios būsenos – vientisa mėlyna, prisijungimo ir prenumeratos langai.
- Išdėstymo taisyklės (kraštai 12 px, antraštė, apatinė juosta) – tik `max-width: 767px`; kompiuterio išdėstymas nekeičiamas.
- `app/59-v76.js`: simboliai ir emoji (✓ ▤ ✎ ☎ 📁 🚗 …) Vadybininko sąraše, „Naujausios operacijos“ ir Finansų rodikliuose pakeičiami linijinėmis SVG piktogramomis (po `render()` ir per `MutationObserver`).

## v77: paleidimas, taktilumas, kortelės, sinchronizacijos pataisa

- **Sinchronizacija (svarbu):** `bootstrapWorkspace` žymę ir bazinę kopiją (`autoeasier-sync-base-v1:<uid>`) nuskaito PRIEŠ `applySharedPayload` (ši jas perrašo). v75–v76 versijoje bazė sutapdavo su debesimi, todėl naujame įrenginyje sujungimas galėjo laimėti tuščią vietinę būseną. Regresijos testas – `tools/test-sync.mjs` („naujas įrenginys …“).
- Paskyros duomenys ir prenumeratos būsena gaunami lygiagrečiai (`Promise.allSettled`), nuotraukų viršelių laukimas – iki 1,5 s.
- **Paleidimas be šokinėjimo:** `styles/000-boot-v77.css` (head) slepia `body`, kol `scripts/190-ready-v77.js` (dokumento gale) neuždeda `html.aeStyledV77`; atsarginis laikmatis – `scripts/000-boot-v77.js` (2,5 s). Paleidimo CLS ~0.
- Grįžtantis vartotojas (išsaugota sesija `autoeasier-auth-v1`) mato „Jungiamasi prie paskyros…“, o ne formą (`gate.aeRestoringV77`, 155-…js). Klaida ar sesijos nebuvimas – forma grąžinama.
- `app/60-v77.js`: apatinių langų įvažiavimas (`aeSheetInV77`, tik naujai atidarytam langui; uždarymas momentinis, nes kodas iškart tikrina `#sheet …`), automobilio kortelės apačia `carCardFooterHTMLV77` (SDK / TA / draudimo taškai, trūkstami dokumentai, dienos garaže; parduotam – data ir per kiek dienų parduotas). Kviečiama iš `10-render.js` šablonų.
- `styles/186-v77.css`: paspaudimo atsakas (scale), `touch-action: manipulation`, fokuso žiedas, `prefers-reduced-motion`, langų slinkimas be „persipylimo“, sąrašai be sunkių rėmų (Finansų operacijos – viena kortelė su plonomis linijomis), skaičiai `tabular-nums`.
- Testai: `tools/test-boot.mjs` (naujas), `test-reset.mjs` per http (file:// režime Chromium kartais prarasdavo localStorage – tai buvo testo, ne programos klaida).

## v78 – patikimumo auditas ir Garažo patobulinimai

- **Duomenų tvarkymas įkeliant** (`06-state-and-history.js`, `normalizeStateV78`): iš sąrašų išmetami `null`/ne objektai (cars, customers, leadVariants, garageTasks, history, historyLog, finances, contactBook), id paverčiami tekstu, `accounting.queue` paliekamas kaip automobilių id tekstų sąrašas. Laukai nepervadinami ir nepridedami. Sugadintas JSON išsaugomas `STORAGE_KEY + ":corrupt"`. Pilna atmintis – sinchronizacija vis tiek paleidžiama, rodomas įspėjimas.
- **`61-v78.js`**: dvigubų paspaudimų apsauga (tik tikri paspaudimai, 800 ms, po klaidos leidžia kartoti), klaidų ribotuvas (`AUTOEASIER_DIAGNOSTICS`, render atkūrimas, niekada tuščias ekranas), `storage` įvykis (keli skirtukai), skaičių pritaikymas (canvas + kalibravimas pagal Range, rAF), paslėptų buhalterijos ekranų piešimas atidedamas (`staleV78`).
- **`62-v78-tasks.js` + `187-v78.css`**: užduotys grupuojamos pagal automobilį (pavadinimas, valst. nr., skaičius, vėluoja, maža nuotrauka dešinėje), „Kitos užduotys“ – atskirai. Vadybininko atidarymo animacija, sutarties lango stilius.
- **Sutartis iš Garažo** (`58-v75.js`): atidaro veikiantį generatorių `openContractSheetV52({})` Garaže (nebeperkelia į Buhalteriją). Naujos piktogramos: Užduotys – sąrašas su varnelėmis, sutartis – dokumentas su parašu.
- **Greitis**: `142` nuotraukų žemėlapis vietoj O(n²) ir teisingas paskyros raktas variantų ženkleliui, `01` talpinami formatuotojai, `53` Map, parduotų sąrašas piešiamas tik atidarius (`10-render`, `46-nav-v63`).
- **Testai**: `tools/test-hardening.mjs` (sugadinti duomenys, dublikatai, pilna atmintis, keli skirtukai, didelės sumos 320–430 px, užduočių grupės, 300 automobilių).

## v79 – fonas ir blokai pagal pavyzdį

- `styles/188-v79.css` (paskutinis dizaino sluoksnis): fonas `#f3f7fa`, blokų rėmelis `#e3e5ea`, švelnūs šešėliai, kampai (plytelės 16 px, kortelės 18 px, Vadybininkas 20 px). Langų (`#sheet`) fonas švelnus, blokai jame – baltos kortelės. Telefone kraštai 9 px.
- Automobilio kortelės apatinė juosta (SDK/TA/draudimo taškai, dokumentai, dienos) pašalinta (`10-render.js`, `60-v77.js`, `186-v77.css`).
- Teksto laukai be papildomo fokuso kontūro (`186-v77.css`).

## v80 – Regitros įrankiai Meniu („SDK paieška“, „Draudimo patikra“)

- Viešos Regitros API nėra, eregitra.lt automatinėms užklausoms rodo CAPTCHA, o cab.lt paieška skirta tik eismo įvykio dalyviams (reikia patvirtinti dalyvavimą). Todėl automatinio „scraperio“ nėra: programa paruošia duomenis, nukopijuoja ilgiausią lauką, atidaro oficialią Regitros paiešką (`vehicle-registration/data-search` – draudimas, `vehicle-declaration/search` – SDK), o vartotojas, praėjęs patikrą, įrašo rezultatą vienu paspaudimu.
- `app/63-v80-regitra.js`: būsenos `idle → wait → done`, automobilio pasirinkimas užpildo laukus (valst. nr., liudijimo nr. / VIN, savininko vardas iš `car.ppParty`). Rezultatas įrašomas į kortelę: `insuranceStatus`, `insuranceUntil`, `insuranceCompany` (naujas, nebūtinas), `sdk` (iš jo pildoma PP sutartis). Tuščius `plate` / `vin` / `registrationDoc` papildo įvestais. Nebaigta patikra – `sessionStorage` (`aeRegitraV80:<rūšis>:<paskyros raktas>`). Tik peržiūros režime (`54-readonly-v70.js`) įrašymas patikrinamas ir „Įrašyta į kortelę“ nerodoma.
- Meniu plytelės 5–6 (`partials/view-menu.html`), atidaromos per `147-garage-menu-inline-disclosures-v1.js` (sąraše `definitions` – `sdk`, `insurance`). Stilius – `styles/189-v80-regitra.css` (taip pat atšaukia seną „5-a plytelė per visą plotį“ taisyklę).
- Testas: `tools/test-regitra.mjs`.

## v81 – kontekstinė pagalba ir automobiliui priskirtos operacijos

- `app/64-v81-help.js` + `styles/190-v81-help.css`: „?“ mygtukai (be teksto, `aria-label`) įterpiami į antraštes pagal `AH_ANCHORS_V81` – MutationObserver + rAF juos atkuria po perpiešimo. Temos (`AH_TOPICS_V81`): sutartys, skeneris, pajamos, islaidos, uzduotys, ataskaitos, variantai, vadybininkas, backup_skolos, prenumerata. Kiekviena: įžanga, „Kaip tai veikia“, „Žingsniai kelyje“ ir CSS telefono maketas (`.mScr` ekranai, žingsnis → `scr` + `hl` paryškinimas, automatinis perjungimas kas 3,2 s, kol vartotojas nepaspaudžia žingsnio).
- Langas – atskiras sluoksnis (`.ahRootV81`, z-index 150000) virš `#modalBackdrop`, todėl atidarytas programos langas (pvz. pildoma sutartis) lieka. Telefone – iš apačios (60–85 % aukščio, rankenėlė, nutempus žemyn uždaromas), nuo 768 px – centruotas dviejų stulpelių langas. Escape, fonas, X uždaro; fokusas grąžinamas. API: `window.AutoEasierHelp.open(id)` / `.openTutorial(id)` / `.close()`.
- `app/07-finance.js` → `carChecklistExpenses()`: prie užduočių išlaidų pridedamos Buhalterijoje automobiliui priskirtos operacijos (`source: "accounting"`, `carId`): išlaida didina, įplauka mažina išlaidas ir savikainą (`carTotalCost`), todėl keičiasi ir pardavimo pelnas, statistika, ataskaitos. `carTask` operacijos neskaičiuojamos (jos jau checklist'e). Suvestinė talpinama vienam sinchroniniam perpiešimui.
- Testas: `tools/test-help.mjs` (visos temos 430 ir 1280 px, uždarymas, sutarties duomenys neprarandami, savikainos skaičiavimas).

## v82 – sutarčių ir sąskaitų faktūrų pasirašymas, sąskaitos faktūros generatorius

- **Parašo langas** (`app/65-v82-signpad.js`, `spOpenV82`): iššoka iš apačios, canvas su keliais brūkšniais (pirštas atitraukiamas ir tęsiama). Taškai – iš `getCoalescedEvents`, piešiama per `requestAnimationFrame` (tik nauji segmentai, ne daugiau kaip kartą per kadrą), klausytojai `passive`, slinkimą išjungia CSS `touch-action: none`. Linijos storis priklauso nuo greičio (rašiklio – nuo spaudimo). „Kartoti“ išvalo be išdėstymo poslinkio, „Atlikta“ (neaktyvus tuščiam laukui) grąžina permatomą, iki rašalo ribų apkarpytą PNG (`{ png, w, h, img }`); linijos storis suderintas su parašo dydžiu (~4,5 % aukščio), kad sumažintas dokumente parašas neišbluktų. `spPlaceOnLineV82` deda parašą ant linijos dešinėje nuo spausdinto vardo, ~2,1 vardo šrifto (9,5 pt) aukščio, apatiniame sluoksnyje (piešiamas prieš vardą), neužlipa ant užrašo po linija.
- **Dokumento langas** (`app/66-v82-docsign.js`, `dsSessionV82`): bendras sutarčiai ir sąskaitai. „Pasirašyti pirkėjui“ / „Pasirašyti pardavėjui“ (mėlyna → žalia `#4b8c71`), „Patalpinti parašus“ (aktyvus tik su abiem parašais) perpiešia puslapius su parašais ir iš naujo sudeda PDF. Iki tol „Siųsti“, „Peržiūrėti“, „Atsisiųsti į įrenginį“ ir miniatiūra užrakinti (`disabled`, `opacity: .5`, `pointer-events: none`). Po patalpinimo parašai užfiksuojami, `onPlaced` prisega PDF prie automobilio. Sesija laiko parašus – langą galima uždaryti ir atidaryti vėl (mygtukas lange).
- **Sutartis** (`app/37-contract-v52.js`): vardas, telefonas, el. paštas, adresas (abi šalys), valstybė ir kaina žodžiais – centruoti lauke horizontaliai ir vertikaliai (didžiųjų raidžių aukštis centre, uodegėlės neužlipa ant linijos), 11 pt vietoj 9,5 pt. Sutartis prisegama prie automobilio tik po „Patalpinti parašus“ (anksčiau – iškart). PDF puslapiai koduojami `toDataURL` (Chrome `toBlob` koduoja tik laisvu metu ir vykstant animacijoms kiekvienas puslapis laukdavo ~1 s), puslapių canvas – `willReadFrequently`. `window.AutoEasierContract` papildytas formos geometrija (`form`, `yoff`, `pagePt`) testams.
- **Sąskaita faktūra** (`app/67-v82-invoice.js`, `openInvoiceSheetV82`): langas kaip sutarties (tos pačios klasės `cfFormV51 ctFormV52` + `invFormV82`). Duomenys: automobilis (trūkstami laukai), serija ir numeris (numatyta „AE“, numeriai `state.accounting.invoice.seq`, išrašyti – `issued`, dublikatas kitame lange neleidžiamas, tame pačiame lange – pataisymas), išrašymo data, apmokėti iki, PVM režimas, suma (galutinė), mokėjimo būdas, pirkėjas (fizinis asmuo / įmonė, PVM kodas), mano rekvizitai (`state.accounting.pp.company` + nauji `vatCode`, `bank`, `iban`; „Sąskaitą išrašė“ – `accounting.invoice.issuer`). PVM režimai: „PVM 21 %“ (suma be PVM, PVM, iš viso), „Maržos schema“ (PVMĮ 106–110 str.: PVM nenurodomas, įrašas „Maržos apmokestinimo schema. Naudotos prekės.“), „Be PVM“ (antraštė „SĄSKAITA FAKTŪRA“). Tikrinama: PVM kodas (LT + 9/12 skaitmenų), IBAN (mod 97), VIN.
- **SF blankas** (`invRenderV82`, A4, 200 DPI, spalvos kaip Regitros formos `#23336e` / `#ebebeb`): antraštė, serija / numeris / data langeliuose, pardavėjas (pavadinimas, kodas, PVM kodas, adresas, bankas, sąskaita), pirkėjas, prekių lentelė, transporto priemonės duomenys (markė D.1, modelis D.3, VIN E, valst. nr. A, pirmoji registracija B, rida), mokėjimo būdas, sumos, suma žodžiais, „Sąskaitą išrašė“ / „Sąskaitą gavo“ su parašais. Centruoti ir didesni: serija ir numeris, pavadinimai, kodai, PVM kodai, markė, modelis, VIN, kainos, PVM, sumos, suma žodžiais.
- **Įėjimai**: automobilio kortelėje „Sąskaita faktūra“ šalia „PP sutartis“ (`renderCarSheet` apvalkalas), Buhalterijoje – plytelė per visą plotį (`renderAccountingCenter` apvalkalas). Pasirašyta sąskaita prisegama kaip `kind: "invoice"` („Sąskaitos“). API: `window.AutoEasierInvoice`.
- „?“ tema „sutartys“ (`64-v81-help.js`) papildyta pasirašymu, žodis „telefonas“ (įrenginio prasme) pakeistas „įrenginys“; sąskaitos lange sutarties „?“ nerodomas.
- Stilius: `styles/191-v82-sign.css`. Testai: `tools/test-contract.mjs` (parašai, užraktas, prisegimas, centravimas, šriftas, parašo vieta), `tools/test-invoice.mjs`.

## v83 – nauja automobilio kortelė

- `src/scripts/app/68-v83-car-card.js` apgaubia `renderCarSheet` ir perdėlioja esamus elementus (ID ir klasės lieka): antraštė su numeriu ir „Garaže N d.“ / „Parduota per N d.“, nuotraukų juosta su skaitikliu, skaičių kortelė (Savikaina · Kaina · Marža, kaina redaguojama vietoje → `askingPrice`, savikainos išskaidymas), pasirengimo juosta „N iš 7 paruošta“ su „Kitas žingsnis“ (parduotam – „Dokumentai buhalterei“ pagal `accountingRequiredDocumentsV1`, pasiekiama per `window.__aeRequiredDocsV83`), akordeonai Užduotys / Nuotraukos / Dokumentai / Duomenys (būsena `state.ui.carSections`) ir prilipusi juosta Parduoti · Dokumentai (PP sutartis, Sąskaita faktūra) · ⋯ (Redaguoti, Ištrinti).
- Stilius: `src/styles/192-v83-car-card.css` (prefiksas su `:not(#ah)`, kad perrašytų 185-v76).
- Testas: `tools/test-car-card.mjs` (430 ir 1280 px).

## v84 – „Ką moka AutoEasier“ (funkcijų vitrina prisijungimo ekrane)

- Mygtukas `#aeFtEntryV84` po „Išbandyti 7 d. nemokamai“ (`src/partials/login.html`).
- `src/scripts/app/69-v84-features.js`: telefone langas iš apačios (88 %, nutempiamas žemyn, „Atgal“ uždaro detalę, po to langą), kompiuteryje – centruotas langas dviem stulpeliais (sąrašas | detalė), planšetėje detalė vienu stulpeliu. 9 funkcijos (`FT_LIST_V84`), kiekviena su nauda, gyvu CSS/SVG maketu (`FT_MOCK_V84`: `data-on/off/hot/cls/num`, „pirštas“ taikosi į `data-t`), 3–4 žingsniais (automatinis grojimas 3,2 s, pauzė palietus, braukimas, rodyklės), „Seniau / Su AutoEasier“, 3 ženkleliais ir „Kita funkcija“. CTA spaudžia esamą `#autoEasierSubscription` (v70 prenumeratos langas). DOM kuriamas tik atidarius. API: `window.AutoEasierFeatures.open(id?) / close() / list`.
- Stilius: `src/styles/193-v84-features.css` (prefiksas su `#aeFtV84`; globalus `small { font-size … !important }` perrašomas `!important`). Mažiau judesio – be automatinio grojimo ir slinkimo.
- Testas: `tools/test-features.mjs` (430 / 1280 px, reduced-motion). `verify-browser` žingsnis `features`.

## v85 – automobilio kortelė: sklandumas, „Duomenys“, išlaida vietoje; Regitros patikros pašalintos

- `app/68-v83-car-card.js` (tas pats failas):
  - **„Duomenys“** (`ccDataHTMLV85`) – visada atidaryti, pirmas blokas po nuotrauka: TA / Draudimas / SDK plytelės, pirmoji registracija, rida, variklis, kuras, liudijimas, VIN su kopijavimu. Paspaudus – redagavimo forma, paryškinamas tas laukas; uždarius ar išsaugojus grįžtama į kortelę.
  - **Skaičiai** – viena eilutė „Pirkta · Išlaidos · Savikaina“. Išskleidus: savikainos sudėtis, kaina (keičiama vietoje) ir marža, **„Pridėti išlaidą“ forma tiesiai kortelėje** (suma, kategorija, data, čekis, pastaba). Įrašas – kaip Buhalterijoje (`source: "accounting"`, `carId`), kortelė neuždaroma ir atsinaujina vietoje.
  - **Pasirengimas** – viena ištisinė progreso juosta, nuotraukoms užtenka bent vienos.
  - **Išskleidimas** – Web Animations API (`ccAnimBodyV85`, `ccMorphV85`): aukštis + turinio išryškėjimas, uždarytas blokas `ccShutV85`. Perpiešus tą pačią kortelę slinkties vieta išlieka.
  - Varianto kortelė (`openGarageLeadSheet`) – tas pats stilius (nuotraukų juosta, kortelės, 12 px tarpai).
- Regitros įrankiai pašalinti: `app/63-v80-regitra.js` ir `styles/189-v80-regitra.css` palikti tušti (galima ištrinti), Meniu plytelės ir skyriai išimti (`partials/view-menu.html`, `147-…`), v84 vitrinoje – 8 funkcijos. `tools/test-regitra.mjs` tikrina, kad jų neliko.
- Stilius – `styles/192-v83-car-card.css`. Testas – `tools/test-car-card.mjs`.

## v86 – daug automobilių: momentinė paieška Garaže ir kelių automobilių pridėjimas

- `app/70-v86-garage-search.js` + `styles/194-v86-garage-search.css`: paieškos juosta virš `#activeCarGrid` (prilimpanti). Indeksas kiekvienam automobiliui (markė, modelis, pavadinimas, valst. nr., VIN, metai, kuras, liudijimas; be diakritikų, valst. nr./VIN be tarpų), visi užklausos žodžiai turi atitikti, rikiuojama pagal tinkamumą. Rašant kortelės neperpiešiamos – slepiamos / rikiuojamos (CSS `order`), paryškinama `<mark>`. Filtrai (vėluoja, be nuotraukų, be kainos, TA/draudimas baigiasi, > 60 d.), rikiavimas `state.ui.garageSort`, rodoma po 30 (likę – slenkant), „rasti parduotuose“, Escape / Enter / „/“. Užklausa – `sessionStorage`. API: `window.AutoEasierGarageSearch`.
- `app/71-v86-batch-add.js` + `styles/195-v86-batch-add.css`: „Iš galerijos“ – kelios nuotraukos (iki 30) → paketo režimas: eilinis skenavimas per `window.AutoEasierRegScan.scan`, progresas, Sustabdyti/Tęsti, Wake Lock; akordeono kortelės su `carFormHTMLV51` (prefiksai `bv0`, `bv1`…), „Daugiau duomenų“, „Išsaugoti ir toliau“, „Praleisti“, „Pašalinti“, „Išsaugoti visus paruoštus“, dublikatų įspėjimas, saugojimas kaip vieno automobilio. Juodraščiai – IndexedDB `aeBatchV86` (Garaže „Nebaigtas pridėjimas · Tęsti“).
- Automobilio kortelė: `.premiumDetail` stulpelis `minmax(0, 1fr)` – siauruose telefonuose ir su ilgais pavadinimais niekas neišeina už ekrano.
- Testai: `tools/test-garage-search.mjs` (500 automobilių), `tools/test-batch-add.mjs` (netikras skeneris).
- v86b: automobilio kortelėje šriftai ir skaičiai – kaip iki atnaujinimų (Duomenys – eilutės per visą plotį); pašalintas automatinis slinkimas (paspaudus laukelį, paiešką, skiltį ar išsaugojus – puslapis pats nebeslenka).

## v87 – slinkimas tik kur reikia, minimalistinė Garažo paieška, platesnis paketo blokas

- `src/scripts/app/72-v87-smooth-reveal.js`: `aeRevealV87(el, {pad, follow, anchor, delay})` – sklandžiai parodo elementą tik jei jis ne visas matomas; seka išsiskleidžiantį bloką (rAF, laiku grįstas švelninimas), paiso prilipusių juostų (`.navWrap`, `.ccBarV83`, `.bvFootV86`, `.gsBarV86`), nutraukiamas palietus / ratuku. `aeAnimHeightV87(el, open)` – bendras aukščio išskleidimas (`[hidden]`).
- Kur slenkama: automobilio kortelėje atidarius bloką (Užduotys, Nuotraukos, Dokumentai, Pasirengimas, Pirkta·Išlaidos·Savikaina), „Pridėti išlaidą“ forma, kainos redagavimas, lauko redagavimas; pakete – pradžia, kitas automobilis, „Tęsti“, „Į Garažą“ (pirma nauja kortelė); paieškoje – „rasti parduotuose“. Paieškos lauko paspaudimas / rašymas niekada neslenka.
- Garažo paieška (`70-v86-garage-search.js`, `194-v86-garage-search.css`): viena eilutė – laukas („Ieškoti“, be pavyzdžių) + filtrų mygtukas `#gsSortBtnV86` su ženkleliu; skydelis `#gsSortMenuV86` (Rodyti: filtrai `#gsChipsV86`, Rikiuoti: `#gsSortsV86`, Atstatyti / Gerai); aktyvūs filtrai – žymos `#gsActiveV86`, rezultatų skaičius `#gsMetaV86`.
- Pridėjimas: be „Ranka“ mygtuko (kaip anksčiau – Fotografuoti / Iš galerijos, galerijoje galima žymėti kelis). Paketo režime skydelis permatomas – kortelės per visą plotį, būsenos juostelė kairėje, didesnė miniatiūra, eilės numerio ženklelis, 48 px laukai ir mygtukai.

## v88 – automobilio kortelės plytelės, sklandus paketo perėjimas

- Kortelė (`68-v83-car-card.js`, `192-v83-car-card.css`): Užduotys · Nuotraukos · Dokumentai – plytelės kaip Garaže (`.ccHubV88` → `.ccTilesV88` → `.ccTileV88[data-cc-sec-toggle]`, vėluojančių užduočių ženklelis). Vienu metu atidaryta viena (`ccPaneSetV88`): turinys – kortelė `.ccPaneCardV88` su snapeliu į plytelę; sukeitimas – abi animacijos ta pačia trukme ir kreive (`ccAnimBodyV85(body, open, fixedDur)`). Būsena – `state.ui.carSections` (atidaryta tik viena reikšmė true). Duomenų eilutės ir VIN – su ikonėlėmis.
- Paketas (`71-v86-batch-add.js`): `bvOpenItemV86` – viena kortelė užsidaro, kita atsidaro vienu judesiu; slinkimas sinchronizuotas (`aeSyncScrollV88`, 420 ms, `cubic-bezier(.32,.72,0,1)`): paspausta antraštė lieka vietoje, „Išsaugoti ir toliau“ – kita kortelė atplaukia į viršų. `.bvShutV86` be `!important` (anksčiau uždarymas neanimuodavo). Spalvotos juostelės kairėje pašalintos.
- `72-v87-smooth-reveal.js`: puslapio slinkiklis – ir `<body>`/`document.scrollingElement` (anksčiau Garaže slinkimas neveikė); perėjimo metu `overflow-anchor: none`.
