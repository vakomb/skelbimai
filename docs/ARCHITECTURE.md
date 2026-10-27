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
