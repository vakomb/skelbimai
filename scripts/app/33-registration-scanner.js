// Registracijos liudijimo skeneris (v50, parašytas iš naujo): nuotraukos paruošimas, OCR ir laukų atpažinimas.
// Veikia su naujo (K1234567) ir seno (J 123456) tipo Lietuvos liudijimais, kreivomis ir neryškiomis nuotraukomis.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).
//
// Viešas API:  RegScan.scan(fileOrBlob, { onProgress }) -> Promise<{ values, fields, passes, complete }>
//              RegScan.parse(lines)  (gryna funkcija, naudojama ir testuose)
// `values` raktai: make, model, regDoc, vin, plate, firstRegistrationDate, firstRegistrationLithuaniaDate,
//                  modelYear, engineCc, powerKw, fuelType

const RegScan = (() => {
  // ---------- Žinynai ----------
  const MAKES = [
    ["Alfa Romeo", "ALFA ROMEO", "ALFAROMEO"],
    ["Audi"],
    ["BMW"],
    ["BYD"],
    ["Cadillac"],
    ["Chevrolet"],
    ["Chrysler"],
    ["Citroën", "CITROEN"],
    ["Cupra"],
    ["Dacia"],
    ["Daewoo"],
    ["Daihatsu"],
    ["Dodge"],
    ["DS", "DS AUTOMOBILES"],
    ["Fiat"],
    ["Ford"],
    ["Genesis"],
    ["Honda"],
    ["Hyundai"],
    ["Infiniti"],
    ["Isuzu"],
    ["Iveco"],
    ["Jaguar"],
    ["Jeep"],
    ["Kia"],
    ["Lada", "VAZ"],
    ["Lancia"],
    ["Land Rover", "LAND ROVER", "LANDROVER"],
    ["Lexus"],
    ["Lincoln"],
    ["Maserati"],
    ["Mazda"],
    ["Mercedes-Benz", "MERCEDES BENZ", "MERCEDESBENZ", "MERCEDES"],
    ["MG"],
    ["Mini"],
    ["Mitsubishi"],
    ["Nissan"],
    ["Opel"],
    ["Peugeot"],
    ["Polestar"],
    ["Porsche"],
    ["RAM"],
    ["Renault"],
    ["Rover"],
    ["Saab"],
    ["Seat"],
    ["Škoda", "SKODA"],
    ["Smart"],
    ["SsangYong", "SSANGYONG", "SSANG YONG"],
    ["Subaru"],
    ["Suzuki"],
    ["Tesla"],
    ["Toyota"],
    ["Volkswagen", "VOLKSWAGEN", "VW"],
    ["Volvo"],
    ["Chery"],
    ["Geely"],
    ["Great Wall", "GREAT WALL"],
    ["Haval"],
    ["Hummer"],
    ["GMC"],
    ["Abarth"],
    ["Alpine"],
    ["Aston Martin", "ASTON MARTIN"],
    ["Bentley"],
    ["Ferrari"],
    ["Lamborghini"],
    ["Rolls-Royce", "ROLLS ROYCE"],
    ["MAN"],
    ["DAF"],
    ["Scania"],
    ["Lynk & Co", "LYNK"],
    ["Aixam"],
    ["Microcar"],
    ["Ligier"],
    ["Piaggio"],
    ["Mahindra"],
    ["Tata"],
    ["Proton"],
    ["UAZ"],
    ["GAZ"]
  ].map(([name, ...aliases]) => ({
    name,
    keys: [name, ...aliases].map(k => fold(k).replace(/[^A-Z0-9]/g, ""))
  }));
  const FUELS = [
    ["BENZINAS", "Benzinas"],
    ["DYZELINAS", "Dyzelinas"],
    ["ELEKTRA", "Elektra"],
    ["DUJOS", "Dujos"],
    ["VANDENILIS", "Vandenilis"],
    ["ETANOLIS", "Etanolis"],
    ["HIBRIDAS", "Hibridas"]
  ];

  // ---------- Pagalbinės ----------
  function fold(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase();
  }
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length,
      n = b.length;
    if (!m || !n) return m || n;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++)
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const TO_DIGIT = {
    O: "0",
    D: "0",
    Q: "0",
    U: "0",
    I: "1",
    L: "1",
    T: "1",
    J: "1",
    Z: "2",
    S: "5",
    B: "8",
    G: "6",
    A: "4",
    E: "3"
  };
  const TO_LETTER = { 0: "O", 1: "I", 2: "Z", 4: "A", 5: "S", 6: "G", 7: "T", 8: "B", 3: "E" };
  const asDigits = s => [...s].map(c => (/\d/.test(c) ? c : (TO_DIGIT[c] ?? c))).join("");
  const asLetters = s => [...s].map(c => (/[A-Z]/.test(c) ? c : (TO_LETTER[c] ?? c))).join("");
  const alnum = s => fold(s).replace(/[^A-Z0-9]/g, "");
  const thisYear = () => new Date().getFullYear();

  // ---------- Etikečių atpažinimas (A, B, B.1, D.1, E, P.1 ...) ----------
  // OCR dažnai painioja: D↔0/O, 1↔l/I/|, B↔8, P↔R; skliaustai ir taškai gali dingti.
  const LABELS = [
    ["B.1", /^[B8][.,:]?[1IL|]$/],
    ["B.2", /^[B8][.,:]?2$/],
    ["B", /^[B8]$/],
    ["D.1", /^[D0O][.,:]?[1ILT|]$/],
    ["D.2", /^[D0O][.,:]?2$/],
    ["D.3", /^[D0O][.,:]?[3S]$/],
    ["I.1", /^[I1L|][.,:]?[1IL|]$/],
    ["I", /^[I1L|]$/],
    ["A", /^[A4]$/],
    ["E", /^[E€£]$/],
    ["P.1", /^[PR][.,:]?[1IL|A]$/],
    ["P.2", /^[PR][.,:]?2$/],
    ["P.3", /^[PR][.,:]?3$/],
    ["P.4", /^[PR][.,:]?4$/],
    ["P.5", /^[PR][.,:]?5$/],
    ["F.1", /^F[.,:]?[1IL|]$/],
    ["F.2", /^F[.,:]?2$/],
    ["F.3", /^F[.,:]?3$/],
    ["F.4", /^F[.,:]?4$/],
    ["F.5", /^F[.,:]?5$/],
    ["G", /^G$/],
    ["H", /^H$/],
    ["J", /^J$/],
    ["J.1", /^J[.,:]?[1IL]$/],
    ["J.2", /^J[.,:]?2$/],
    ["K", /^K$/],
    ["K.1", /^K[.,:]?[1IL]$/],
    ["Q", /^Q$/],
    ["R", /^R$/],
    ["S.1", /^[S5][.,:]?[1IL]$/],
    ["S.2", /^[S5][.,:]?2$/],
    ["T", /^T$/],
    ["V.7", /^V[.,:]?7$/],
    ["V.9", /^V[.,:]?9$/],
    ["V.10", /^V[.,:]?10$/],
    ["C.1.1", /^C[.,:]?1[.,:]?[1IL]$/],
    ["C.1.2", /^C[.,:]?1[.,:]?2$/],
    ["C.1.3", /^C[.,:]?1[.,:]?3$/]
  ];
  function labelOf(token) {
    const t = fold(token)
      .replace(/^[()[\]{}'"`’‘“”]+/g, "")
      .replace(/[()[\]{}'"`’‘“”,;:.]+$/g, "")
      .replace(/[)\]]/g, "");
    if (!t || t.length > 6) return null;
    for (const [key, re] of LABELS) if (re.test(t)) return key;
    if (/^[B8][.,:]?[7T!4A]$/.test(t)) return "B.1"; // „(B.1)“ dažnai perskaitomas kaip „(8.7)“ / „(Bt)“ / „(8.4)“
    if (/^[I1L|][.,:]?[7T!]$/.test(t)) return "I.1";
    return null;
  }
  // Eilutę suskaido į segmentus: [{ label, words: [...] }]. Dideli tarpai tarp žodžių reiškia kitą stulpelį
  // arba OCR šiukšles dokumento krašte, todėl ten pradedamas naujas segmentas be etiketės.
  function segmentsOf(line) {
    const words = line.words.filter(w => String(w.text || "").trim());
    const hs = words
      .map(w => (w.bbox ? w.bbox.y1 - w.bbox.y0 : 0))
      .filter(h => h > 0)
      .sort((a, b) => a - b);
    const charH = hs.length ? hs[Math.floor(hs.length / 2)] : 0;
    const segs = [{ label: null, words: [] }];
    let prev = null;
    for (const w0 of words) {
      // „P2135“, „P.12231“ – etiketė suklijuota su reikšme.
      const glued = fold(w0.text).match(/^([PRF])[.,:]?([1-5])(\d{2,4})$/);
      if (glued) {
        segs.push({
          label: (glued[1] === "F" ? "F." : "P.") + glued[2],
          words: [{ ...w0, text: glued[3] }],
          conf: w0.conf
        });
        prev = w0;
        continue;
      }
      const w = w0;
      const key = labelOf(w.text);
      const gap = prev && w.bbox && prev.bbox && charH ? (w.bbox.x0 - prev.bbox.x1) / charH : 0;
      if (key) segs.push({ label: key, words: [], conf: w.conf });
      else if (gap > 5.5) segs.push({ label: null, words: [w], gapSplit: true });
      else segs[segs.length - 1].words.push(w);
      prev = w;
    }
    // Nuimame silpnus pavienius simbolius segmentų galuose.
    for (const s of segs)
      while (
        s.words.length > 1 &&
        Number(s.words[s.words.length - 1].conf) < 35 &&
        alnum(s.words[s.words.length - 1].text).length <= 2
      )
        s.words.pop();
    return segs;
  }

  // ---------- Laukų tvarkymas ----------
  function fixPlate(raw) {
    const t = alnum(raw);
    if (t.length < 6 || t.length > 8) return "";
    // Ieškome 6 simbolių lango „AAA999“ (OCR prie numerio kartais prilipdo šiukšlių).
    for (let i = t.length - 6; i >= 0; i--) {
      const s = t.slice(i, i + 6);
      if (!/\d/.test(s.slice(3)) || (s.slice(0, 3).match(/[A-Z]/g) || []).length < 2) continue;
      const p = asLetters(s.slice(0, 3)) + asDigits(s.slice(3));
      if (/^[A-Z]{3}\d{3}$/.test(p)) return p;
    }
    return "";
  }
  const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
  function vinCheckDigitOk(v) {
    const map = {
      A: 1,
      B: 2,
      C: 3,
      D: 4,
      E: 5,
      F: 6,
      G: 7,
      H: 8,
      J: 1,
      K: 2,
      L: 3,
      M: 4,
      N: 5,
      P: 7,
      R: 9,
      S: 2,
      T: 3,
      U: 4,
      V: 5,
      W: 6,
      X: 7,
      Y: 8,
      Z: 9
    };
    const w = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += (/\d/.test(v[i]) ? Number(v[i]) : map[v[i]] || 0) * w[i];
    const c = sum % 11;
    return v[8] === (c === 10 ? "X" : String(c));
  }
  function fixVin(raw) {
    // Tikras VIN turi bent 5 skaitmenis jau originaliame tekste (kitaip tai žodis, pvz. „REGISTRACIJOS“).
    if ((alnum(raw).match(/\d/g) || []).length < 5) return "";
    let t = alnum(raw).replace(/O/g, "0").replace(/Q/g, "0").replace(/I/g, "1");
    if (t.length < 17) return "";
    // VIN pabaigoje (12–17 pozicijos) beveik visada skaitmenys.
    const fixTail = s => s.slice(0, 12) + asDigits(s.slice(12)).replace(/[^0-9A-Z]/g, "");
    let best = "";
    for (let i = 0; i + 17 <= t.length; i++) {
      const v = fixTail(t.slice(i, i + 17));
      if (VIN_RE.test(v) && /\d/.test(v) && /[A-Z]/.test(v)) {
        best = v;
        break;
      }
    }
    return best;
  }
  function vinScore(v) {
    if (!v) return 0;
    let s = 1;
    if (/^\d{4,6}$/.test(v.slice(-5))) s += 0.3;
    if (vinCheckDigitOk(v)) s += 0.4;
    if (/^(W|V|S|T|Z|Y|X|J|K|L|1|2|3|4|5|6|7|8|9)/.test(v)) s += 0.1;
    return s;
  }
  function fixDate(raw) {
    let t = fold(raw).replace(/[—–_]/g, "-").replace(/\s+/g, "");
    t = t
      .replace(/[OQDCU]/g, "0")
      .replace(/[IL|!T]/g, "1")
      .replace(/S/g, "5")
      .replace(/Z/g, "2")
      .replace(/B/g, "8")
      .replace(/G/g, "6");
    const m = t.match(/((?:19|20)\d{2})[-.,]?(\d{2})[-.,]?(\d{2})/);
    if (!m) return "";
    // OCR šiame šrifte „0“ kartais skaito kaip „9“ / „8“ / „6“: taisome tik jei kitaip data negalima.
    const fixPart = (s, max) => (Number(s) > max && /[986]/.test(s[0]) ? "0" + s[1] : s);
    m[2] = fixPart(m[2], 12);
    m[3] = fixPart(m[3], 31);
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (y < 1950 || y > thisYear() || mo < 1 || mo > 12 || d < 1 || d > 31) return "";
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    const dt = new Date(y, mo - 1, d);
    if (dt.getMonth() !== mo - 1 || dt > new Date()) return "";
    return iso;
  }
  function numberIn(words, min, max) {
    for (const w of words) {
      const t = fold(w.text).replace(/(CM|KW|KG).*$/i, "");
      if (!/\d/.test(t)) continue;
      const d = asDigits(t.replace(/[^A-Z0-9]/g, ""));
      if (!/^\d+$/.test(d)) continue;
      const n = Number(d);
      if (n >= min && n <= max) return n;
    }
    return null;
  }
  function matchMake(text) {
    const words = fold(text)
      .replace(/[^A-Z0-9 &-]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    let best = null;
    // Bandome 1–2 žodžių junginius (LAND ROVER, ALFA ROMEO).
    for (let i = 0; i < words.length; i++) {
      for (const span of [2, 1]) {
        if (i + span > words.length) continue;
        const cand = words
          .slice(i, i + span)
          .join("")
          .replace(/[^A-Z0-9]/g, "");
        if (cand.length < 2) continue;
        for (const mk of MAKES)
          for (const key of mk.keys) {
            const tol = key.length <= 3 ? 0 : key.length <= 6 ? 1 : 2;
            const d = Math.min(lev(cand, key), lev(asLetters(cand), key));
            if (d <= tol && (!best || d < best.d || (d === best.d && key.length > best.len)))
              best = { name: mk.name, d, len: key.length, index: i, span, key };
          }
      }
    }
    return best;
  }
  function prettyModel(raw, make) {
    let words = String(raw || "")
      .replace(/[|_~"“”‘’`]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    // Nuimame markę modelio pradžioje (pvz. „NISSAN MURANO“ -> „MURANO“).
    if (make && words.length > 1) {
      const m = matchMake(words.slice(0, 2).join(" "));
      if (m && m.name === make && m.index === 0) words = words.slice(m.span);
    }
    // Atmetame OCR šiukšles pabaigoje (pavieniai simboliai, skyrybos ženklai).
    while (
      words.length > 1 &&
      /^([^A-Za-z0-9]+|[a-z]{1,2}[:.,]?|.{1}[^A-Za-z0-9]+)$/.test(words[words.length - 1])
    )
      words.pop();
    words = words.map(w => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9)]+$/g, "")).filter(Boolean);
    const allCaps = words.every(w => w === w.toUpperCase());
    const out = words.map((w, i) => {
      if (!allCaps) return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
      return w
        .split("-")
        .map(p => (/^[A-Z]{4,}$/.test(p) ? p.charAt(0) + p.slice(1).toLowerCase() : p))
        .join("-");
    });
    return out.join(" ").slice(0, 60);
  }
  // Modelio pavadinimas: 1–4 žodžiai, be keistų simbolių viduryje, ne ilgesni nei 15 raidžių.
  function plausibleModel(m) {
    if (!m) return false;
    const words = m.split(/\s+/);
    if (words.length > 4 || m.length > 40) return false;
    return words.every(
      w => w.length <= 15 && !/[!?.,;:'"\\]/.test(w.replace(/\.$/, "")) && /[A-Za-z0-9]/.test(w)
    );
  }
  function matchFuel(text, loose = false) {
    const folded = fold(text).replace(/[^A-Z ]/g, " ");
    const toks = folded.split(/\s+/).filter(t => t.length >= 4);
    // Taip pat bandome sujungtus gretimus žodžius („DYZE LINAS“ -> „DYZELINAS“).
    const parts = folded.split(/\s+/).filter(Boolean);
    for (let i = 0; i + 1 < parts.length; i++) toks.push(parts[i] + parts[i + 1]);
    const found = [];
    for (const t of toks)
      for (const [key, name] of FUELS) {
        const tol = key.length >= 8 ? (loose ? 3 : 2) : 1;
        if (
          t.length >= key.length - 2 &&
          t.length <= key.length + 2 &&
          lev(t, key) <= tol &&
          !found.includes(name)
        )
          found.push(name);
      }
    return found.length ? found.join(" / ") : "";
  }

  // ---------- Pagrindinis parseris ----------
  // lines: [{ text, words: [{ text, conf, bbox }], bbox }]
  function parse(lines) {
    lines = (lines || []).filter(l => l && l.words && l.words.length);
    const C = {}; // key -> [{ value, score }]
    const add = (key, value, score) => {
      if (value === "" || value == null || !score) return;
      (C[key] ||= []).push({ value, score });
    };
    const confOf = ws =>
      ws.length ? ws.reduce((s, w) => s + (Number(w.conf) || 0), 0) / ws.length / 100 : 0.5;
    const segLines = lines.map(l => ({ line: l, segs: segmentsOf(l) }));
    let plateLine = -1,
      fuelLine = -1,
      passMake = "";
    const anchors = {};

    segLines.forEach(({ line, segs }, li) => {
      const up = fold(line.text);
      // Liudijimo serija ir numeris: viena raidė + 6 (senas) arba 7 (naujas) skaitmenys, eilutė be kitų laukų.
      const sm = up.replace(/[^A-Z0-9| ]/g, " ").match(/(?:^|\s)([A-Z|]) ?(\d{6,7})(?=\s|$)/);
      if (sm && !/KG|CM|KW|\d{4}-\d{2}/.test(up)) {
        const letter = sm[1] === "|" ? "I" : sm[1];
        add("regDoc", letter + sm[2], 0.8 + 0.2 * confOf(line.words) - li * 0.004);
        if (line.bbox && !anchors.regDoc) anchors.regDoc = line.bbox;
      } else {
        const sm2 = up.match(/^\W{0,3}([1L|])\s+(\d{6})\W{0,3}$/); // „I 810391“ perskaitytas kaip „1 810391“
        if (sm2) add("regDoc", "I" + sm2[2], 0.55);
      }
      for (const seg of segs) {
        if (seg.label && line.bbox && !anchors[seg.label]) anchors[seg.label] = line.bbox;
        const text = seg.words.map(w => w.text).join(" ");
        const conf = confOf(seg.words);
        switch (seg.label) {
          case "A": {
            if (plateLine < 0) plateLine = li;
            const p = fixPlate(seg.words[0]?.text || "");
            if (p) {
              add("plate", p, 1 + conf);
              plateLine = li;
            }
            break;
          }
          case "E": {
            const v = fixVin(text);
            // Ilgesnėje eilutėje OCR galėjo įterpti simbolį – tokį kandidatą vertiname silpniau.
            if (v) add("vin", v, (vinScore(v) + conf) * (alnum(text).length === 17 ? 1 : 0.65));
            break;
          }
          case "D.1": {
            const m = matchMake(text);
            if (m) {
              add("make", m.name, 1.4 - m.d * 0.2 + conf);
              passMake = m.name;
            }
            break;
          }
          case "D.3": {
            const model = prettyModel(text, passMake);
            if (plausibleModel(model)) add("model", model, 1 + conf);
            break;
          }
          case "B": {
            const d = fixDate(text);
            if (d) add("firstRegistrationDate", d, 1.2 + conf);
            break;
          }
          case "B.1": {
            const d = fixDate(text);
            if (d) add("firstRegistrationLithuaniaDate", d, 1.2 + conf);
            break;
          }
          case "B.2": {
            const y = text.match(/\b(19[5-9]\d|20\d{2})\b/);
            if (y && Number(y[1]) <= thisYear() + 1) add("modelYear", Number(y[1]), 1 + conf);
            break;
          }
          case "P.1": {
            const n = numberIn(seg.words, 500, 9999);
            if (n) add("engineCc", n, 1.2 + conf);
            break;
          }
          case "P.2": {
            const n = numberIn(seg.words, 10, 999);
            if (n) add("powerKw", n, 1.2 + conf);
            break;
          }
          case "P.3": {
            const f = matchFuel(text, true);
            if (f) add("fuelType", f, 1.3 + conf);
            break;
          }
        }
      }
      // Datos be aiškių etikečių: seno tipo eilutė „B data (B.1) data (B.2) …“ ir „I data (I.1) data; Nr.“,
      // naujo tipo „A NR I data H“ ir „B data B.1 data B.2“.
      const dates = line.words.map(w => fixDate(w.text)).filter(Boolean);
      if (dates.length >= 2 && !/\d{8}|;/.test(line.text)) {
        add("firstRegistrationDate", dates[0], 0.8);
        add("firstRegistrationLithuaniaDate", dates[1], 0.8);
      }
      // Etikečių nepavykus perskaityti – atpažįstame pagal reikšmių formą.
      for (const w of line.words) {
        const p = fixPlate(w.text);
        if (p && /^[A-Z]{3}\d{3}$/.test(alnum(w.text).replace(/O/g, "0"))) add("plate", p, 0.45);
      }
      // VIN be etiketės: vienas žodis (arba du gretimi, jei OCR perskėlė) be datų ir etikečių.
      for (let i = 0; i < line.words.length; i++) {
        const a = line.words[i].text,
          b = line.words[i + 1]?.text || "";
        if (/\d{4}-\d{2}|[*/]/.test(a) || labelOf(a)) continue;
        const single = alnum(a);
        let v = single.length >= 16 && single.length <= 19 ? fixVin(a) : "";
        let s = single.length === 17 ? 0.7 : 0.45;
        if (!v && b && !labelOf(b) && !/\d{4}-\d{2}/.test(b) && (alnum(a) + alnum(b)).length === 17) {
          v = fixVin(a + b);
          s = 0.4;
        }
        if (v) add("vin", v, vinScore(v) * s);
      }
      const fuel = matchFuel(line.text);
      if (fuel) {
        add("fuelType", fuel, 0.7);
        if (fuelLine < 0) fuelLine = li;
      }
      if (/\bKW\b|KW$/.test(up) || /\bCM\b|CM3|CM³/.test(up)) {
        const ws = line.words;
        for (let i = 0; i < ws.length; i++) {
          const u = fold(ws[i].text);
          if (/^CM/.test(u) && i > 0) {
            const n = numberIn([ws[i - 1]], 500, 9999);
            if (n) add("engineCc", n, 0.9);
          }
          if (/^KW/.test(u) && i > 0) {
            const n = numberIn([ws[i - 1]], 10, 999);
            if (n) add("powerKw", n, 0.9);
          }
        }
      }
    });

    // Variklio eilutė yra tiesiai virš kuro eilutės (P.1 … P.2 …, po to P.3).
    if (fuelLine > 0) {
      const ws = segLines[fuelLine - 1].line.words;
      const nums = ws
        .map(w => asDigits(alnum(w.text).replace(/(CM3?|KW)$/, "")))
        .filter(t => /^\d{2,4}$/.test(t))
        .map(Number);
      const cc = nums.find(n => n >= 500 && n <= 9999);
      const kw = nums.find((n, i) => n >= 10 && n <= 999 && i > nums.indexOf(cc));
      if (cc) add("engineCc", cc, 0.6);
      if (cc && kw) add("powerKw", kw, 0.6);
    }
    // Markė be etiketės: pirmas atpažintas gamintojas po valstybinio numerio eilutės.
    if (!C.make && plateLine >= 0)
      for (let li = plateLine; li < Math.min(segLines.length, plateLine + 8); li++) {
        const m = matchMake(segLines[li].line.text);
        if (m && m.key.length >= 3) {
          add("make", m.name, 0.6);
          break;
        }
      }
    // Modelis be D.3 etiketės: 1–3 eilutės žemiau markės (D.2 eilutę su „/“ praleidžiame).
    if (!C.model) {
      const iD1 = segLines.findIndex(s => s.segs.some(g => g.label === "D.1") && matchMake(s.line.text));
      if (iD1 >= 0)
        for (let li = iD1 + 1; li < Math.min(segLines.length, iD1 + 4); li++) {
          const segs = segLines[li].segs.filter(g => g.words.length && !g.gapSplit);
          const words = (segs.find(g => g.label === "D.3") || segs[segs.length - 1] || { words: [] }).words;
          const text = words.map(w => w.text).join(" ");
          const model = prettyModel(text, passMake);
          if (alnum(text).length >= 2 && !/\/|--/.test(text) && !labelOf(text) && plausibleModel(model)) {
            add("model", model, 0.5);
            break;
          }
        }
    }
    if (fuelLine >= 0 && segLines[fuelLine].line.bbox) anchors.fuel = segLines[fuelLine].line.bbox;
    Object.defineProperty(C, "anchors", { value: anchors, enumerable: false });
    return C;
  }

  // Kelių praėjimų kandidatų sujungimas: laimi reikšmė su didžiausia suminiu balu.
  function merge(candidateSets) {
    const all = {};
    for (const C of candidateSets)
      for (const [k, list] of Object.entries(C))
        for (const c of list) {
          const key = typeof c.value === "string" ? c.value.toUpperCase() : c.value;
          const slot = ((all[k] ||= {})[key] ||= { value: c.value, score: 0, hits: 0 });
          slot.score += c.score;
          slot.hits += 1;
          if (c.score > (slot.best || 0)) {
            slot.best = c.score;
            slot.value = c.value;
          }
        }
    const fields = {};
    for (const [k, byValue] of Object.entries(all)) {
      const ranked = Object.values(byValue).sort((a, b) => b.score - a.score);
      const top = ranked[0];
      const total = ranked.reduce((s, r) => s + r.score, 0);
      fields[k] = {
        value: top.value,
        score: top.score,
        hits: top.hits,
        confidence: Math.min(1, top.score / Math.max(total, 1.5)),
        alternatives: ranked.slice(1, 3).map(r => r.value)
      };
    }
    const values = {};
    const v = k => fields[k]?.value ?? "";
    values.make = v("make");
    values.model = v("model") ? prettyModel(v("model"), values.make) : "";
    values.regDoc = v("regDoc");
    values.vin = v("vin");
    values.plate = v("plate");
    values.firstRegistrationLithuaniaDate = v("firstRegistrationLithuaniaDate");
    values.firstRegistrationDate = v("firstRegistrationDate") || values.firstRegistrationLithuaniaDate;
    values.firstRegistrationSource = v("firstRegistrationDate")
      ? "B"
      : values.firstRegistrationLithuaniaDate
        ? "B.1"
        : "";
    values.modelYear = v("modelYear") || null;
    values.engineCc = v("engineCc") || null;
    values.powerKw = v("powerKw") || null;
    values.fuelType = v("fuelType");
    // Galios ir tūrio santykis turi būti realus (≈15–175 kW litrui), kitaip silpnesnę reikšmę atmetame.
    if (values.engineCc && values.powerKw) {
      const ratio = (values.powerKw / values.engineCc) * 1000;
      if (ratio < 12 || ratio > 175) {
        const drop = (fields.powerKw?.score || 0) < (fields.engineCc?.score || 0) ? "powerKw" : "engineCc";
        values[drop] = null;
        delete fields[drop];
      }
    }
    return { values, fields };
  }
  const REQUIRED = [
    "make",
    "model",
    "regDoc",
    "vin",
    "plate",
    "firstRegistrationDate",
    "engineCc",
    "powerKw",
    "fuelType"
  ];
  function completeness(values) {
    return REQUIRED.filter(k => values[k]).length / REQUIRED.length;
  }

  // =====================================================================================
  // Naršyklės dalis: nuotraukos paruošimas ir OCR (Tesseract.js). Visa vykdoma telefone.
  // =====================================================================================
  const TESSERACT_URLS = [
    "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
    "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js"
  ];
  let tesseractPromise = null,
    workerPromise = null;
  function loadScriptOnce(src, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      const timer = setTimeout(() => {
        s.remove();
        reject(new Error("timeout"));
      }, timeoutMs);
      s.src = src;
      s.async = true;
      s.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      s.onerror = () => {
        clearTimeout(timer);
        s.remove();
        reject(new Error("load"));
      };
      document.head.appendChild(s);
    });
  }
  function loadTesseract() {
    if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
    if (tesseractPromise) return tesseractPromise;
    tesseractPromise = (async () => {
      for (const url of TESSERACT_URLS) {
        try {
          await loadScriptOnce(url);
          if (window.Tesseract?.createWorker) return window.Tesseract;
        } catch (e) {}
      }
      tesseractPromise = null;
      throw new Error("Nepavyko įkelti OCR modulio. Patikrinkite interneto ryšį.");
    })();
    return tesseractPromise;
  }
  function getWorker(onProgress) {
    if (workerPromise) return workerPromise;
    workerPromise = (async () => {
      const T = await loadTesseract();
      const worker = await T.createWorker("eng", 1, {
        logger: m => {
          if (m.status === "recognizing text") onProgressRef.current?.({ ocr: m.progress || 0 });
          else if (/loading|initializ/.test(m.status || "")) onProgressRef.current?.({ loading: m.status });
        }
      });
      return worker;
    })().catch(e => {
      workerPromise = null;
      throw e;
    });
    return workerPromise;
  }
  const onProgressRef = { current: null };

  async function loadImage(file) {
    if (window.createImageBitmap) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (e) {}
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await (img.decode ? img.decode() : new Promise((ok, bad) => ((img.onload = ok), (img.onerror = bad))));
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function drawScaled(src, maxSide) {
    const w = src.width || src.naturalWidth,
      h = src.height || src.naturalHeight;
    const s = Math.min(maxSide / Math.max(w, h), 4);
    const c = makeCanvas(w * s, h * s);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function rotateCanvas(src, deg) {
    if (!deg) return src;
    const r = (deg * Math.PI) / 180,
      cos = Math.abs(Math.cos(r)),
      sin = Math.abs(Math.sin(r));
    const w = src.width,
      h = src.height;
    const c = makeCanvas(w * cos + h * sin, w * sin + h * cos);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = "high";
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(r);
    ctx.drawImage(src, -w / 2, -h / 2);
    return c;
  }
  function boxBlur(a, w, h, r) {
    if (r < 1) return a;
    const tmp = new Float32Array(a.length),
      out = new Float32Array(a.length),
      n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let s = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) s += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = s / n;
        s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = s / n;
        s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }
  // „Tamsumo“ žemėlapis: kiek pikselis tamsesnis už vietinį foną (kiekvienam kanalui atskirai).
  // Tai pašalina spalvotą (žalią / geltoną) foną, šešėlius ir netolygų apšvietimą.
  function darknessMap(canvas) {
    const w = canvas.width,
      h = canvas.height;
    const px = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const sw = Math.max(8, Math.round(w / 22)),
      sh = Math.max(8, Math.round(h / 22));
    const small = makeCanvas(sw, sh),
      sctx = small.getContext("2d", { willReadFrequently: true });
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(canvas, 0, 0, sw, sh);
    const bgc = makeCanvas(w, h),
      bctx = bgc.getContext("2d", { willReadFrequently: true });
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = "high";
    bctx.filter = "none";
    bctx.drawImage(small, 0, 0, w, h);
    const bg = bctx.getImageData(0, 0, w, h).data;
    const mean = new Float32Array(w * h),
      mn = new Float32Array(w * h),
      luma = new Float32Array(w * h);
    for (let i = 0, j = 0; j < mean.length; i += 4, j++) {
      const r0 = Math.min(1.3, px[i] / (bg[i] + 1)),
        r1 = Math.min(1.3, px[i + 1] / (bg[i + 1] + 1)),
        r2 = Math.min(1.3, px[i + 2] / (bg[i + 2] + 1));
      mean[j] = 1 - (r0 + r1 + r2) / 3;
      mn[j] = 1 - Math.min(r0, r1, r2);
      // Šviesis (Y) – JPEG jį saugo pilna raiška, todėl jame mažiausiai spalvinio „muaro“ triukšmo.
      const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const yb = 0.299 * bg[i] + 0.587 * bg[i + 1] + 0.114 * bg[i + 2];
      luma[j] = 1 - Math.min(1.3, y / (yb + 1));
    }
    return { w, h, mean, min: mn, luma };
  }
  function grayFrom(map, { channel = "mean", lo = 0.1, hi = 0.5, blur = 1 }) {
    const { w, h } = map;
    let d = map[channel];
    if (blur) d = boxBlur(boxBlur(d, w, h, blur), w, h, blur);
    const c = makeCanvas(w, h),
      ctx = c.getContext("2d", { willReadFrequently: true });
    const img = ctx.createImageData(w, h),
      o = img.data,
      k = 255 / (hi - lo);
    for (let j = 0, i = 0; j < d.length; j++, i += 4) {
      const v = 255 - Math.max(0, Math.min(255, (d[j] - lo) * k));
      o[i] = o[i + 1] = o[i + 2] = v;
      o[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  // Pasvirimo kampas: tekstinių eilučių projekcijos dispersijos maksimumas.
  function estimateSkew(map) {
    const step = Math.max(1, Math.round(map.w / 700));
    const pts = [];
    for (let y = 0; y < map.h; y += step)
      for (let x = 0; x < map.w; x += step) if (map.mean[y * map.w + x] > 0.28) pts.push(x, y);
    if (pts.length < 400) return { angle: 0, vertical: false };
    const score = (deg, vertical) => {
      const a = (deg * Math.PI) / 180,
        s = Math.sin(a),
        c = Math.cos(a),
        bins = new Map();
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i],
          y = pts[i + 1];
        const v = vertical ? x * c + y * s : y * c - x * s;
        const b = Math.round(v / (step * 2));
        bins.set(b, (bins.get(b) || 0) + 1);
      }
      let sum = 0;
      for (const n of bins.values()) sum += n * n;
      return sum;
    };
    const best = vertical => {
      let bestA = 0,
        bestS = -1;
      for (let a = -20; a <= 20; a += 1) {
        const s = score(a, vertical);
        if (s > bestS) [bestA, bestS] = [a, s];
      }
      for (let a = bestA - 1; a <= bestA + 1; a += 0.2) {
        const s = score(a, vertical);
        if (s > bestS) [bestA, bestS] = [a, s];
      }
      return { angle: bestA, score: bestS };
    };
    // Grąžinamas taisymo kampas (kiek pasukti, kad eilutės taptų horizontalios).
    return { angle: -best(false).angle };
  }
  function linesFromTesseract(data) {
    let lines = data?.lines;
    if (!lines?.length && data?.blocks)
      lines = data.blocks.flatMap(b => (b.paragraphs || []).flatMap(p => p.lines || []));
    return (lines || []).map(l => ({
      text: l.text || "",
      bbox: l.bbox,
      words: (l.words || []).map(w => ({ text: w.text, conf: w.confidence ?? w.conf ?? 0, bbox: w.bbox }))
    }));
  }
  async function recognize(canvas, psm) {
    const worker = await getWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: String(psm),
      preserve_interword_spaces: "1",
      user_defined_dpi: "300"
    });
    const r = await worker.recognize(canvas, {}, { text: true, blocks: true });
    return linesFromTesseract(r?.data);
  }
  function cropCanvas(src, box, scale = 2) {
    const x0 = Math.max(0, Math.floor(box.x0)),
      y0 = Math.max(0, Math.floor(box.y0));
    const x1 = Math.min(src.width, Math.ceil(box.x1)),
      y1 = Math.min(src.height, Math.ceil(box.y1));
    const c = makeCanvas((x1 - x0) * scale + 40, (y1 - y0) * scale + 40),
      ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, 20, 20, (x1 - x0) * scale, (y1 - y0) * scale);
    return c;
  }
  // Paruošimo variantai (parinkti testuojant su tikrais liudijimais): šviesio (Y) kanalas be spalvinio muaro.
  const VARIANTS = [
    { channel: "luma", lo: 0.03, hi: 0.3, blur: 1 },
    { channel: "luma", lo: 0, hi: 0.6, blur: 1 },
    { channel: "luma", lo: 0.03, hi: 0.36, blur: 0 },
    { channel: "luma", lo: 0.08, hi: 0.36, blur: 1 }
  ];
  // Laukai, kuriuos galima tiksliai perskaityti iš vienos eilutės, jei viso puslapio OCR jų nerado.
  const LINE_TARGETS = [
    ["regDoc", ["regDoc"]],
    ["plate", ["A"]],
    ["vin", ["E"]],
    ["make", ["D.1"]],
    ["model", ["D.3"]],
    ["firstRegistrationDate", ["B", "B.1"]],
    ["engineCc", ["P.1", "P.2"]],
    ["powerKw", ["P.2", "P.1"]],
    ["fuelType", ["P.3", "fuel"]]
  ];

  async function scan(file, opts = {}) {
    const progress = opts.onProgress || (() => {});
    onProgressRef.current = p => progress({ stage: "ocr", ...p });
    const started = Date.now(),
      budget = opts.timeBudgetMs || 45000;
    progress({ stage: "prepare", message: "Paruošiama nuotrauka…" });
    const img = await loadImage(file);
    let base = drawScaled(img, 2200);
    let map = darknessMap(base);
    const skew = estimateSkew(map);
    if (Math.abs(skew.angle) >= 0.4) {
      base = rotateCanvas(base, skew.angle);
      map = darknessMap(base);
    }
    progress({ stage: "ocr", message: "Įkeliamas atpažinimo modulis…" });
    await getWorker();
    const sets = [],
      grays = [];
    let result = null,
      flipped = false;
    for (let i = 0; i < VARIANTS.length; i++) {
      progress({
        stage: "ocr",
        pass: i + 1,
        passes: VARIANTS.length,
        message: `Skaitomas dokumentas (${i + 1}/${VARIANTS.length})…`
      });
      const gray = grayFrom(map, VARIANTS[i]);
      const lines = await recognize(gray, 6);
      const C = parse(lines);
      sets.push(C);
      grays.push(gray);
      result = merge(sets);
      // Pasuktas dokumentas (90°, 180°, 270°): po pirmo praėjimo beveik nieko neatpažinta – bandome kitas kryptis.
      if (i === 0 && completeness(result.values) < 0.34 && !flipped) {
        flipped = true;
        let best = { score: completeness(result.values), base, map, C, gray };
        for (const deg of [90, 270, 180]) {
          if (Date.now() - started > budget) break;
          progress({ stage: "ocr", message: "Tikrinama dokumento kryptis…" });
          const b2 = rotateCanvas(base, deg),
            m2 = darknessMap(b2);
          const s2 = estimateSkew(m2);
          const b3 = Math.abs(s2.angle) >= 0.4 ? rotateCanvas(b2, s2.angle) : b2;
          const m3 = b3 === b2 ? m2 : darknessMap(b3);
          const g2 = grayFrom(m3, VARIANTS[0]);
          const C2 = parse(await recognize(g2, 6));
          const sc = completeness(merge([C2]).values);
          if (sc > best.score) best = { score: sc, base: b3, map: m3, C: C2, gray: g2 };
          if (sc >= 0.6) break;
        }
        if (best.base !== base) {
          base = best.base;
          map = best.map;
          sets.length = 0;
          grays.length = 0;
          sets.push(best.C);
          grays.push(best.gray);
          result = merge(sets);
        }
      }
      if (i >= 1 && completeness(result.values) === 1 && minConfidence(result) >= 0.6) break;
      if (Date.now() - started > budget) break;
    }
    // Tikslinis skaitymas iš atskirų eilučių: trūkstami arba abejotini laukai, taip pat VIN / numeris / liudijimo nr.,
    // jei praėjimai nesutarė. Eilutė iškerpama, padidinama 3× ir skaitoma kaip viena eilutė (PSM 7) dviem variantais.
    const needs = LINE_TARGETS.filter(([k]) => {
      const f = result.fields[k];
      if (!result.values[k] || (f?.confidence ?? 0) < 0.45) return true;
      return ["vin", "plate", "regDoc"].includes(k) && (f.alternatives.length > 0 || f.confidence < 0.8);
    });
    for (const [key, labels] of needs) {
      let tries = 0;
      for (let gi = 0; gi < grays.length && tries < 2; gi++) {
        if (Date.now() - started > budget) break;
        const anchors = sets[gi].anchors || {};
        const box = labels.map(l => anchors[l]).find(Boolean);
        if (!box) continue;
        const h = box.y1 - box.y0;
        const band = { x0: 0, x1: grays[gi].width, y0: box.y0 - h * 0.5, y1: box.y1 + h * 0.5 };
        progress({ stage: "refine", message: "Tikslinami laukai…" });
        const lines = await recognize(cropCanvas(grays[gi], band, 3), 7);
        sets.push(parse(lines));
        result = merge(sets);
        tries++;
      }
    }
    result.passes = sets.length;
    result.complete = completeness(result.values) === 1;
    result.ms = Date.now() - started;
    progress({ stage: "done", message: "Baigta" });
    onProgressRef.current = null;
    return result;
  }
  function minConfidence(result) {
    return Math.min(...REQUIRED.map(k => result.fields[k === "model" ? "model" : k]?.confidence ?? 0));
  }

  return {
    scan,
    parse,
    merge,
    completeness,
    REQUIRED,
    VARIANTS,
    _internals: { darknessMap, grayFrom, estimateSkew, rotateCanvas, drawScaled, loadImage },
    _t: { fixPlate, fixVin, fixDate, matchMake, prettyModel, matchFuel, labelOf, vinCheckDigitOk }
  };
})();
