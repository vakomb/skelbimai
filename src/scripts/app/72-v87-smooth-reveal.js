// v87: sklandus „parodymas“ – slinkimas tik ten, kur jo reikia veiksmui (atidarytas blokas, atsiradusi forma,
// sekantis automobilis pakete, rasti parduotuose). aeRevealV87(el) slenka artimiausią slenkantį tėvą (#sheet ar
// puslapį) TIK jei el nėra visas matomas: jei telpa – iki matomos apačios, jei netelpa – viršus prie ekrano viršaus.
// Slinkimas seka bloką, kol jis animuotai išsiskleidžia (rAF, laiku grįstas švelninimas), todėl atrodo kaip vienas
// judesys. Atsižvelgiama į prilipusias juostas (apatinis meniu, kortelės veiksmų juosta, paketo juosta).
// Vartotojui palietus / pasukus ratuką – slinkimas iškart nutraukiamas. Paieškos lauko paspaudimas ar rašymas
// niekada neslenka. aeAnimHeightV87(el, open) – bendras sklandus aukščio išskleidimas (naudoja paieškos skydelis).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const AE_REVEAL_V87 = { raf: 0, stop: null };
const AE_REVEAL_BARS_V87 = ".navWrap, .ccBarV83, .bvFootV86, .gsBarV86";

function aeReducedV87() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function aeScrollerV87(el) {
  for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
  }
  // Puslapis: programėlėje dažnai slenka pats <body> (overflow: auto), kitur – dokumentas
  const se = document.scrollingElement;
  return se && se.scrollHeight > se.clientHeight + 1 ? se : null;
}
function aeViewportV87(scroller, el) {
  const H = window.visualViewport?.height || window.innerHeight;
  let top = 0,
    bottom = H;
  if (scroller && scroller !== document.scrollingElement && scroller !== document.documentElement) {
    const r = scroller.getBoundingClientRect();
    top = Math.max(top, r.top);
    bottom = Math.min(bottom, r.bottom);
  }
  const span = bottom - top;
  document.querySelectorAll(AE_REVEAL_BARS_V87).forEach(bar => {
    if (bar.contains(el) || el.contains(bar) || !bar.offsetParent) return;
    const pos = getComputedStyle(bar).position;
    if (pos !== "fixed" && pos !== "sticky") return;
    if (scroller && pos === "sticky" && !scroller.contains(bar)) return;
    const r = bar.getBoundingClientRect();
    if (r.height < 1 || r.bottom <= top || r.top >= bottom) return;
    if (r.top - top < span * 0.35 && r.bottom < top + span * 0.5) top = Math.max(top, r.bottom);
    else if (bottom - r.bottom < span * 0.35) bottom = Math.min(bottom, r.top);
  });
  return { top, bottom };
}
// Kiek reikia paslinkti, kad el būtų matomas (0 – jau matomas)
function aeRevealDeltaV87(el, scroller, pad, anchor) {
  const { top, bottom } = aeViewportV87(scroller, el);
  const r = el.getBoundingClientRect();
  const vt = top + pad,
    vb = bottom - pad;
  if (anchor === "start" || r.height > vb - vt) return r.top - vt;
  if (r.top < vt) return r.top - vt;
  if (r.bottom > vb) return Math.min(r.bottom - vb, r.top - vt);
  return 0;
}
function aeScrollByV87(scroller, dy) {
  if (scroller) scroller.scrollTop += dy;
  else window.scrollBy(0, dy);
}
function aeRevealStopV87() {
  if (AE_REVEAL_V87.raf) cancelAnimationFrame(AE_REVEAL_V87.raf);
  AE_REVEAL_V87.raf = 0;
  AE_REVEAL_V87.stop?.();
  AE_REVEAL_V87.stop = null;
}
/**
 * Sklandžiai parodo elementą. follow – kiek ms sekti augantį bloką (išskleidimo animacijos trukmė).
 * anchor: "nearest" (numatyta) | "start".
 */
function aeRevealV87(el, { pad = 12, follow = 460, anchor = "nearest", delay = 0 } = {}) {
  if (!(el instanceof Element)) return;
  const run = () => {
    if (!el.isConnected) return;
    aeRevealStopV87();
    const t0 = performance.now();
    let last = t0;
    const cancel = () => aeRevealStopV87();
    const opts = { passive: true, capture: true };
    window.addEventListener("touchstart", cancel, opts);
    window.addEventListener("wheel", cancel, opts);
    AE_REVEAL_V87.stop = () => {
      window.removeEventListener("touchstart", cancel, opts);
      window.removeEventListener("wheel", cancel, opts);
    };
    if (aeReducedV87()) {
      // Be animacijos: palaukiame, kol blokas išsiskleis, ir paslenkame vienu kartu
      setTimeout(() => {
        if (!el.isConnected) return cancel();
        const s = aeScrollerV87(el);
        const d = aeRevealDeltaV87(el, s, pad, anchor);
        if (Math.abs(d) >= 1) aeScrollByV87(s, d);
        cancel();
      }, 20);
      return;
    }
    const step = now => {
      if (!el.isConnected) return cancel();
      const dt = Math.min(48, now - last);
      last = now;
      const s = aeScrollerV87(el);
      const d = aeRevealDeltaV87(el, s, pad, anchor);
      const elapsed = now - t0;
      if (Math.abs(d) < 0.75) {
        if (elapsed > follow) return cancel();
      } else {
        // Laiku grįstas švelninimas: ~90 % kelio per ~280 ms, nepriklausomai nuo kadrų dažnio
        const k = 1 - Math.exp(-dt / 120);
        let move = d * k;
        if (Math.abs(move) < 0.6) move = Math.sign(d) * Math.min(Math.abs(d), 0.6);
        const before = s ? s.scrollTop : window.scrollY;
        aeScrollByV87(s, move);
        const after = s ? s.scrollTop : window.scrollY;
        // Pasiektas kraštas – toliau slinkti nėra kur
        if (Math.abs(after - before) < 0.1 && elapsed > follow) return cancel();
      }
      if (elapsed > follow + 900) return cancel();
      AE_REVEAL_V87.raf = requestAnimationFrame(step);
    };
    AE_REVEAL_V87.raf = requestAnimationFrame(step);
  };
  if (delay) setTimeout(run, delay);
  else run();
}

// Bendras sklandus aukščio išskleidimas: el gauna/praranda [hidden]; aukštis ir turinys animuojami.
function aeAnimHeightV87(el, open, { dur } = {}) {
  if (!el) return;
  const wasHidden = el.hidden;
  const from = wasHidden ? 0 : el.getBoundingClientRect().height;
  el._aeH?.cancel();
  el._aeF?.cancel();
  el.hidden = false;
  const to = open ? el.getBoundingClientRect().height : 0;
  if (!open) el.hidden = false;
  const finish = () => {
    if (!open) el.hidden = true;
  };
  if (aeReducedV87() || !el.animate || Math.abs(to - from) < 1) return finish();
  const d = dur || Math.round(Math.min(340, Math.max(200, 160 + Math.abs(to - from) * 0.25)));
  el.style.overflow = "hidden";
  el._aeH = el.animate([{ height: from + "px" }, { height: to + "px" }], {
    duration: open ? d : Math.round(d * 0.8),
    easing: open ? "cubic-bezier(.2,.8,.2,1)" : "cubic-bezier(.4,0,.2,1)"
  });
  el._aeF = el.animate(
    open
      ? [
          { opacity: 0, transform: "translateY(-4px)" },
          { opacity: 1, transform: "none" }
        ]
      : [{ opacity: 1 }, { opacity: 0 }],
    { duration: open ? d : Math.round(d * 0.5), easing: "ease" }
  );
  el._aeH.onfinish = () => {
    el.style.overflow = "";
    finish();
  };
  el._aeH.oncancel = () => {
    el.style.overflow = "";
  };
}
// v88: slinkimas, sinchronizuotas su aukščio animacija (ta pati trukmė ir kreivė). Naudojama, kai iš anksto
// žinoma, kur turi atsidurti elementas (pvz. pakete: viena kortelė užsidaro, kita atsidaro) – tada nėra
// „vijimosi“, ekranas juda vienu tolygiu judesiu kartu su turiniu.
function aeBezierV88(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx,
    cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x,
        d = dx(t);
      if (Math.abs(e) < 1e-4 || !d) break;
      t -= e / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const AE_EASE_V88 = aeBezierV88(0.32, 0.72, 0, 1);
function aeSyncScrollV88(scroller, dy, dur) {
  aeRevealStopV87();
  if (Math.abs(dy) < 1) return;
  const get = () => (scroller ? scroller.scrollTop : window.scrollY);
  const set = y => (scroller ? (scroller.scrollTop = y) : window.scrollTo(0, y));
  const start = get();
  if (aeReducedV87()) return set(start + dy);
  const t0 = performance.now();
  const cancel = () => aeRevealStopV87();
  const opts = { passive: true, capture: true };
  window.addEventListener("touchstart", cancel, opts);
  window.addEventListener("wheel", cancel, opts);
  // Naršyklės slinkimo „inkaras“ perėjimo metu išjungiamas – kitaip jis taisytų poziciją kartu su mumis
  const anchorEl = scroller || document.scrollingElement;
  const prevAnchor = anchorEl?.style.overflowAnchor ?? "";
  if (anchorEl) anchorEl.style.overflowAnchor = "none";
  AE_REVEAL_V87.stop = () => {
    window.removeEventListener("touchstart", cancel, opts);
    window.removeEventListener("wheel", cancel, opts);
    if (anchorEl) anchorEl.style.overflowAnchor = prevAnchor;
  };
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    set(start + dy * AE_EASE_V88(p));
    if (p < 1) AE_REVEAL_V87.raf = requestAnimationFrame(step);
    else cancel();
  };
  AE_REVEAL_V87.raf = requestAnimationFrame(step);
}
window.AutoEasierReveal = aeRevealV87;
