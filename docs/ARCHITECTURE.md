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
