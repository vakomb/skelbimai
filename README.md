# AutoEasier — Visureigiai, UAB

Platforma auto prekybininkams: automobilių pridėjimas, užduotys, dominantys variantai, kontaktai, finansai, buhalterija ir ataskaitos buhalterei.

Programėlė yra **vienas savarankiškas HTML failas** (`dist/index.html`). Šiame repozitorijuje jis išskaidytas į tvarkingus šaltinio failus, o build sujungia juos atgal į tą patį vieną failą.

## Greitas startas

```bash
npm install          # tik įrankiams (prettier, acorn, playwright); programėlei priklausomybių nereikia
npm run build        # src/ -> dist/index.html
```

Atidaryk `dist/index.html` naršyklėje arba įkelk į hostingą vietoje senojo `index.html`.

> ⚠️ Šalia `index.html` hostinge turi būti failas `assets/autoeasier-document-assets.js` (PP sutarties šablonas ir dokumentų resursai). Jo nebuvo projekte, todėl jo čia nėra – palik tą, kurį jau turi serveryje.

## Struktūra

```
src/
  index.html            šablonas: <head>, apvalkalas ir include/inline nurodymai (tvarka = kaskados tvarka)
  partials/             HTML markup: login, kiekvienas ekranas (view-*.html), overlays, nav
  styles/NNN-*.css      148 CSS blokai; NNN = vieta faile, vėlesnis perrašo ankstesnį
  scripts/NNN-*.js      atskiri <script> blokai (auth/sinchronizacija, buhalterija v25, UI elgsena…)
  scripts/app/NN-*.js   pagrindinė programa, išskaidyta į 32 temines dalis (vienas bendras scope)
  vendor/jszip.min.js   JSZip (neformatuojamas)
  assets/brand-logo.png AutoEasier logotipas (build įdeda kaip data: URI)
tools/
  build.mjs             surinkimas į dist/index.html (be priklausomybių)
  check.mjs             sintaksės patikra + docs/OVERRIDES.md generavimas
  verify-ast.mjs        įrodo, kad JS/CSS kodas lygiavertis (AST / CSS tokenai)
  verify-browser.mjs    naršyklės testas: ekranai, DOM, CSSOM, išsaugota būsena, konsolės klaidos
  fixtures/demo-state.json  testiniai duomenys naršyklės testui
reference/index.original.html  originalus failas prieš tvarkymą (palyginimui)
docs/ARCHITECTURE.md    kaip veikia programa (duomenys, srautai, moduliai)
docs/OVERRIDES.md       funkcijų perrašymų grandinės (generuojama)
CLAUDE.md               taisyklės dirbant su Claude
```

## Darbo eiga

```bash
npm run baseline        # prieš pakeitimą: išsaugo dabartinį build kaip atskaitos tašką
# ... keiti failus src/ ...
npm run format          # suformatuoja JS/CSS
npm run verify          # check + kodo palyginimas + naršyklės palyginimas su baseline
npm run build           # galutinis dist/index.html
```

`verify` po **refaktoringo** turi būti visiškai žalias. Po **funkcinio pakeitimo** jis parodo, kurie ekranai, DOM ar būsena pasikeitė. Taip matai, kad pasikeitė tik tai, ką norėjai pakeisti.

`npm run verify:original` palygina su originaliu failu iš `reference/`. Jis žalias, kol nepradėti funkciniai pakeitimai.
