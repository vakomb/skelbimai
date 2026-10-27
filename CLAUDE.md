# Instrukcijos Claude (ir žmonėms)

Kalba su vartotoju: **lietuvių**. Programėlė skirta telefonui (iPhone 15 Pro Max, 430 px pločio).

## Nekeičiamos taisyklės

1. **Niekada neredaguok `dist/index.html`**. Keisk tik `src/`, tada `npm run build`.
2. **Prieš bet kokį pakeitimą** paleisk `npm run baseline`. **Po jo** paleisk `npm run verify`. Refaktoringas turi likti visiškai žalias. Funkcinis pakeitimas turi keisti tik tai, kas prašyta, ir tai turi būti matyti iš `verify:browser` rezultato.
3. Nekeisk `src/vendor/` ir `reference/`.
4. `src/scripts/app/*.js` yra **vienas bendras scope**, sujungtas eilės tvarka. Nėra `import/export`. Kintamieji ir funkcijos iš 01–31 matomi visur. Naujas failas gauna kitą numerį (`33-…js`), nes eilė svarbi. Faile negali būti `return` aukščiausiame lygyje.
5. Prieš keisdamas funkciją, pažiūrėk [`docs/OVERRIDES.md`](docs/OVERRIDES.md). Daug funkcijų perrašomos vėlesniuose failuose, o galioja **paskutinė** versija. Pakeitimas ankstyvoje versijoje dažnai nieko nekeičia.
6. Bendras stilius (šriftai, mygtukai, laukai, kortelės) keičiamas tik `src/styles/166-design-system-v54.css` su jo prefiksu. Jame nenustatyk `display` bendroms klasėms. Po pakeitimų paleisk `node tools/screens.mjs` ir peržiūrėk nuotraukas.
7. CSS: blokų tvarka yra kaskada. Norėdamas pakeisti išvaizdą, rask, kuris **vėliausias** blokas nustato tą savybę (`grep -n "selektorius" src/styles/*.css | tail`), ir keisk ten. Neįdėk naujo bloko anksčiau už tą, kurį nori perrašyti.
7. Literalus `</style>` ar `</script>` šaltinio faile sulaužytų puslapį. Build tai patikrina ir sustoja.
8. Duomenų struktūra (`state`) yra sinchronizuojama su Supabase ir saugoma vartotojų telefonuose. **Nepervadink ir netrink laukų**. Naujus laukus pridėk su numatyta reikšme `defaultState()` ir `loadState()` (`06-state-and-history.js`).
9. Po kodo pakeitimų paleisk `npm run format`.
10. Registracijos liudijimo skenavimas yra tik `33-registration-scanner.js` (variklis) ir `34-registration-ui.js` (formos). Senų OCR modulių `28–31` neplėsk. Po variklio pakeitimų paleisk `node tools/regscan/test-regscan.mjs <nuotraukų aplankas> <truth.json>`. Nuotraukos su asmens duomenimis neturi patekti į repozitoriją.
11. Repozitorija viešai matoma GitHub'e, o Vercel diegia iš `main` šakos per `vercel.json` (`node tools/build.mjs --out index.html`). Šakninis `index.html` ir `dist/` yra surinkimo rezultatas.

## Kur ką rasti

- Ekranų HTML: `src/partials/view-*.html`. Dalį turinio vėliau perpiešia JS (`render*` funkcijos).
- Pagrindinė logika: `src/scripts/app/` (aprašas kiekvieno failo pirmoje eilutėje).
- Prisijungimas ir sinchronizacija: `src/scripts/155-autoeasier-supabase-auth-v1.js`.
- Detali architektūra: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Komandos

```bash
npm run build          # surinkti
npm run check          # sintaksė + OVERRIDES.md
npm run baseline       # atskaitos taškas prieš keitimą
npm run verify         # check + kodo + naršyklės palyginimas su baseline
npm run verify:original  # palyginimas su originaliu failu (žalias tik kol nebuvo funkcinių pakeitimų)
```

Naršyklės testas naudoja `tools/fixtures/demo-state.json`, sustabdytą laikrodį (2026-10-27) ir išjungtą internetą. Jei pridedi naują ekraną ar veiksmą, papildyk `STEPS` faile `tools/verify-browser.mjs`.
