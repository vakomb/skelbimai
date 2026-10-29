// v82: parašo piešimo langas (sutartims ir sąskaitoms faktūroms). Iššoka iš apačios, canvas su keliais brūkšniais.
// Sklandumas: taškai renkami iš getCoalescedEvents, piešiama per requestAnimationFrame (ne daugiau kaip kartą per
// kadrą, tik nauji segmentai), klausytojai pasyvūs – slinkimą ir mastelį išjungia CSS touch-action: none.
// „Atlikta“ grąžina permatomą, iki parašo ribų apkarpytą PNG (data URL) ir jo matmenis.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const SP_INK_V82 = "#13285e";
const SP_SVG_V82 = {
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20c3.5 0 4.5-6 7.5-6 2 0 1.2 4 3.5 4 1.6 0 2.4-2 4-2 .9 0 1.6.6 3 1.4"/></svg>'
};

// Brūkšnio geometrija: taškas { x, y, t, w } (CSS px). Segmentai – kvadratinės kreivės per vidurio taškus.
function spMidV82(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function spDotV82(c, p) {
  c.beginPath();
  c.arc(p.x, p.y, p.w / 2, 0, Math.PI * 2);
  c.fill();
}
function spSegV82(c, pts, i) {
  const a = i === 1 ? pts[0] : spMidV82(pts[i - 2], pts[i - 1]);
  const ctl = pts[i - 1];
  const b = spMidV82(pts[i - 1], pts[i]);
  c.lineWidth = (ctl.w + pts[i].w) / 2;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.quadraticCurveTo(ctl.x, ctl.y, b.x, b.y);
  c.stroke();
}
function spTailV82(c, pts) {
  const n = pts.length;
  if (n < 2) return;
  const a = spMidV82(pts[n - 2], pts[n - 1]);
  c.lineWidth = pts[n - 1].w;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(pts[n - 1].x, pts[n - 1].y);
  c.stroke();
}
function spStyleV82(c) {
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = SP_INK_V82;
  c.fillStyle = SP_INK_V82;
}
// Visas parašas iš naujo (keičiant dydį ir eksportuojant)
function spRenderAllV82(c, strokes) {
  spStyleV82(c);
  for (const s of strokes) {
    const p = s.pts;
    if (!p.length) continue;
    spDotV82(c, p[0]);
    for (let i = 1; i < p.length; i++) spSegV82(c, p, i);
    if (s.ended) spTailV82(c, p);
    s.dot = true;
    s.drawn = p.length;
    s.tail = !!s.ended;
  }
}
// Tik nauji segmentai nuo paskutinio kadro
function spRenderNewV82(c, strokes) {
  for (const s of strokes) {
    const p = s.pts;
    if (!p.length) continue;
    if (!s.dot) {
      spDotV82(c, p[0]);
      s.dot = true;
    }
    for (let i = Math.max(1, s.drawn); i < p.length; i++) spSegV82(c, p, i);
    s.drawn = Math.max(s.drawn, p.length);
    if (s.ended && !s.tail) {
      spTailV82(c, p);
      s.tail = true;
    }
  }
}
function spInkLengthV82(strokes) {
  let len = 0;
  for (const s of strokes)
    for (let i = 1; i < s.pts.length; i++)
      len += Math.hypot(s.pts[i].x - s.pts[i - 1].x, s.pts[i].y - s.pts[i - 1].y);
  return len;
}
// Permatomas PNG, apkarpytas iki rašalo ribų; piešiamas didesne raiška, kad PDF'e būtų ryškus.
// Dokumente parašas sumažinamas iki ~2 vardo šrifto aukščių, todėl linijos storis suderinamas su parašo dydžiu
// (~4,5 % parašo aukščio, kaip tušinuko linija): mažinant parašas neišblunka iki plauko storio linijos.
function spExportV82(strokes) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    sumW = 0,
    n = 0;
  for (const s of strokes)
    for (const p of s.pts) {
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
      sumW += p.w;
      n++;
    }
  const avgW = n ? sumW / n : 2;
  const k = Math.min(3.2, Math.max(1, (0.045 * Math.max(1, y1 - y0)) / avgW));
  const thick = strokes.map(s => ({ pts: s.pts.map(p => ({ x: p.x, y: p.y, w: p.w * k })), ended: true }));
  const pad = (avgW * k * 1.6) / 2 + 2;
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  const w = Math.max(1, x1 - x0),
    h = Math.max(1, y1 - y0);
  const scale = Math.min(4, 1600 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * scale));
  c.height = Math.max(1, Math.ceil(h * scale));
  const g = c.getContext("2d");
  g.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
  spRenderAllV82(g, thick);
  return { png: c.toDataURL("image/png"), w: c.width, h: c.height };
}
// Atidaro parašo langą. Grąžina Promise: { png, w, h, img } arba null (atšaukta).
function spOpenV82({ title = "Parašas", name = "" } = {}) {
  return new Promise(resolve => {
    document.getElementById("spRootV82")?.remove();
    const prevFocus = document.activeElement;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const root = document.createElement("div");
    root.id = "spRootV82";
    root.className = "spRootV82";
    root.innerHTML = `<div class="spScrimV82" data-sp-cancel></div>
      <div class="spDrawerV82" role="dialog" aria-modal="true" aria-labelledby="spTitleV82" tabindex="-1">
        <div class="spGrabV82" aria-hidden="true"></div>
        <div class="spHeadV82">
          <span class="spIcoV82">${SP_SVG_V82.pen}</span>
          <div class="spHeadTxtV82"><h3 id="spTitleV82">${escapeHTML(title)}</h3><p>${escapeHTML(name || "Pasirašykite pirštu arba rašikliu")}</p></div>
          <button type="button" class="spCloseV82" data-sp-cancel aria-label="Uždaryti">${SP_SVG_V82.close}</button>
        </div>
        <div class="spPadV82">
          <canvas class="spCanvasV82" aria-label="Parašo laukas" role="img"></canvas>
          <div class="spGuideV82" aria-hidden="true"><span>×</span><i></i></div>
          <div class="spHintV82" aria-hidden="true">Pasirašykite čia</div>
        </div>
        <p class="spNoteV82">Galite atitraukti pirštą ir tęsti – parašas gali būti iš kelių brūkšnių.</p>
        <div class="spBarV82">
          <button type="button" class="spBtnV82" data-sp-clear>Kartoti</button>
          <button type="button" class="spBtnV82 primary" data-sp-done disabled>Atlikta</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const drawer = root.querySelector(".spDrawerV82");
    const canvas = root.querySelector(".spCanvasV82");
    const doneBtn = root.querySelector("[data-sp-done]");
    const ctx = canvas.getContext("2d");
    const strokes = [];
    const MIN_W = 1.3,
      MAX_W = 3.6;
    let active = null,
      pointerId = null,
      rect = canvas.getBoundingClientRect(),
      dpr = 1,
      cssW = 0,
      cssH = 0,
      raf = 0,
      closed = false;

    const setup = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      rect = r;
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(r.width * dpr),
        h = Math.round(r.height * dpr);
      if (canvas.width === w && canvas.height === h && cssW === r.width && cssH === r.height) return;
      cssW = r.width;
      cssH = r.height;
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      spRenderAllV82(ctx, strokes);
    };
    const frame = () => {
      raf = 0;
      spStyleV82(ctx);
      spRenderNewV82(ctx, strokes);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const inked = spInkLengthV82(strokes) >= 12 || strokes.filter(s => s.pts.length).length >= 2;
      doneBtn.disabled = !inked;
      root.classList.toggle(
        "spInkedV82",
        strokes.some(s => s.pts.length)
      );
    };
    const addPoint = ev => {
      const x = ev.clientX - rect.left,
        y = ev.clientY - rect.top,
        t = ev.timeStamp || performance.now();
      const pts = active.pts,
        last = pts[pts.length - 1];
      const pen = ev.pointerType === "pen" && ev.pressure > 0;
      const pressureW = pen
        ? MIN_W + (MAX_W - MIN_W) * Math.pow(Math.min(1, Math.max(0.05, ev.pressure)), 0.7)
        : 0;
      if (!last) {
        pts.push({ x, y, t, w: pen ? pressureW : (MIN_W + MAX_W) / 2 + 0.3 });
        return;
      }
      const d = Math.hypot(x - last.x, y - last.y);
      if (d < 0.7) return;
      const v = d / Math.max(1, t - last.t);
      const speedW = MAX_W - (MAX_W - MIN_W) * Math.min(1, v / 2.4);
      const target = pen ? pressureW * 0.7 + speedW * 0.3 : speedW;
      pts.push({ x, y, t, w: last.w * 0.68 + target * 0.32 });
    };

    const onDown = e => {
      if (pointerId !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      pointerId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nebūtina */
      }
      rect = canvas.getBoundingClientRect();
      active = { pts: [], drawn: 0, dot: false, tail: false, ended: false };
      strokes.push(active);
      addPoint(e);
      root.classList.add("spInkedV82");
      schedule();
    };
    const onMove = e => {
      if (e.pointerId !== pointerId || !active) return;
      const list = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
      if (list && list.length) for (const ev of list) addPoint(ev);
      else addPoint(e);
      schedule();
    };
    const onEnd = e => {
      if (e.pointerId !== pointerId) return;
      if (active) active.ended = true;
      active = null;
      pointerId = null;
      schedule();
      sync();
    };
    canvas.addEventListener("pointerdown", onDown, { passive: true });
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerup", onEnd, { passive: true });
    canvas.addEventListener("pointercancel", onEnd, { passive: true });
    canvas.addEventListener("lostpointercapture", onEnd, { passive: true });

    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => setup()) : null;
    ro?.observe(canvas);

    const close = result => {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      document.removeEventListener("keydown", onKey, true);
      root.classList.remove("show");
      resolve(result);
      setTimeout(() => root.remove(), reduce ? 0 : 300);
      try {
        prevFocus?.focus?.({ preventScroll: true });
      } catch (err) {
        /* elementas galėjo dingti */
      }
    };
    const onKey = e => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close(null);
    };
    document.addEventListener("keydown", onKey, true);
    root.addEventListener("click", e => {
      if (e.target.closest("[data-sp-cancel]")) return close(null);
      if (e.target.closest("[data-sp-clear]")) {
        strokes.length = 0;
        active = null;
        pointerId = null;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        sync();
        return;
      }
      if (e.target.closest("[data-sp-done]")) {
        if (doneBtn.disabled) return;
        const out = spExportV82(strokes.filter(s => s.pts.length));
        const img = new Image();
        img.src = out.png;
        vibrate(12);
        close({ ...out, img });
      }
    });

    requestAnimationFrame(() => {
      setup();
      root.classList.add("show");
      drawer.focus({ preventScroll: true });
    });
  });
}
// Paveikslėlio paruošimas piešimui (data URL → įkeltas Image)
function spImageReadyV82(sig) {
  if (!sig?.img) return Promise.resolve(null);
  if (sig.img.complete && sig.img.naturalWidth) return Promise.resolve(sig.img);
  return (sig.img.decode ? sig.img.decode() : new Promise(r => (sig.img.onload = r)))
    .then(() => sig.img)
    .catch(() => null);
}
// Parašas ant parašo linijos: dešinėje nuo spausdinto vardo, ~2,1 karto vardo šrifto aukščio, apatiniame sluoksnyje
// (piešiamas prieš vardą). Matmenys taškais (pt); S – px/pt (jei kontekstas jau pastumtas į pt, S = 1).
function spPlaceOnLineV82(c, img, { x, lineY, maxX, fontPt, S = 1 }) {
  if (!img || !img.naturalWidth) return;
  const aspect = img.naturalWidth / img.naturalHeight;
  let h = fontPt * 2.1,
    w = h * aspect;
  const room = Math.max(24, maxX - x);
  const maxW = Math.min(room, fontPt * 16);
  if (w > maxW) {
    w = maxW;
    h = w / aspect;
  }
  // Labai aukštas, siauras parašas neturi užlipti ant teksto viršuje
  if (h > fontPt * 2.6) {
    h = fontPt * 2.6;
    w = h * aspect;
  }
  const bottom = lineY + Math.min(1.6, h * 0.08);
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(img, x * S, (bottom - h) * S, w * S, h * S);
  c.restore();
}
