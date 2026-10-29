// v82: dokumento langas po sukūrimo (pirkimo–pardavimo sutartis, sąskaita faktūra) su dviejų šalių parašais.
// Eiga: „Pasirašyti pirkėjui“ / „Pasirašyti pardavėjui“ (mėlyna → žalia) → „Patalpinti parašus“ (parašai
// įpiešiami į dokumentą, PDF sukuriamas iš naujo) → tik tada atrakinami „Siųsti“, „Peržiūrėti“, „Atsisiųsti į įrenginį“.
// Sesija (dsSessionV82) laiko parašus ir galutinį PDF, todėl langą galima uždaryti ir atidaryti vėl.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const DS_SVG_V82 = {
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20c3.5 0 4.5-6 7.5-6 2 0 1.2 4 3.5 4 1.6 0 2.4-2 4-2 .9 0 1.6.6 3 1.4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
  seal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2 5 6v5.2c0 4.4 3 7.9 7 9.3 4-1.4 7-4.9 7-9.3V6z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/></svg>'
};

/**
 * o = {
 *   domId, number, fileName, title, doneTitle, placedToast, pages (canvas[]), blob (PDF be parašų),
 *   thumbPage (kurio puslapio miniatiūra), signers: [{ key, label, padTitle, name }],
 *   render: async sigs => canvas[], onPlaced: async ({ blob, pages, sigs }) => pastaba | ""
 * }
 */
function dsSessionV82(o) {
  const s = { o, sigs: {}, placed: false, busy: false, pages: o.pages, blob: o.blob, note: "", thumb: "" };
  s.open = () => dsOpenV82(s);
  s.allSigned = () => o.signers.every(sg => !!s.sigs[sg.key]);
  return s;
}
function dsThumbV82(s) {
  if (!s.thumb) {
    const page = s.pages[Math.min(s.o.thumbPage || 0, s.pages.length - 1)];
    s.thumb = page ? page.toDataURL("image/jpeg", 0.72) : "";
  }
  return s.thumb;
}
function dsUpdateV82(ov, s) {
  const o = s.o,
    all = s.allSigned(),
    locked = !s.placed;
  ov.querySelector("#dsTitleV82").textContent = s.placed ? o.doneTitle : o.title;
  ov.querySelector(".dsMetaV82").textContent = [o.number, s.note].filter(Boolean).join(" · ");
  const ico = ov.querySelector(".dsHeadIcoV82");
  ico.classList.toggle("is-done", s.placed);
  ico.innerHTML = s.placed ? DS_SVG_V82.seal : DS_SVG_V82.doc;
  const img = ov.querySelector(".ctThumbV56 img");
  const src = dsThumbV82(s);
  if (img.getAttribute("src") !== src) img.setAttribute("src", src);
  ov.querySelectorAll("[data-ds-sign]").forEach(btn => {
    const signed = !!s.sigs[btn.dataset.dsSign];
    btn.classList.toggle("is-signed", signed);
    btn.setAttribute("aria-pressed", String(signed));
    btn.disabled = s.placed || s.busy;
    const i = btn.querySelector(".dsSignIcoV82");
    const want = signed ? "check" : "pen";
    if (i.dataset.ico !== want) {
      i.dataset.ico = want;
      i.innerHTML = DS_SVG_V82[want];
    }
  });
  const place = ov.querySelector("[data-ds-place]");
  place.disabled = !all || s.placed || s.busy;
  place.classList.toggle("is-ready", all && !s.placed);
  place.classList.toggle("is-done", s.placed);
  place.classList.toggle("is-busy", s.busy);
  place.querySelector(".dsPlaceTxtV82").textContent = s.busy
    ? "Talpinama…"
    : s.placed
      ? "Parašai patalpinti"
      : "Patalpinti parašus";
  place.querySelector(".dsPlaceIcoV82").innerHTML = s.placed ? DS_SVG_V82.check : DS_SVG_V82.seal;
  const status = ov.querySelector(".dsStatusV82");
  status.classList.toggle("is-done", s.placed);
  status.innerHTML = `${s.placed ? DS_SVG_V82.check : DS_SVG_V82.lock}<span>${
    s.placed
      ? "Dokumentas paruoštas – galite siųsti ir atsisiųsti."
      : all
        ? "Abi šalys pasirašė – patalpinkite parašus į dokumentą."
        : "Pasirašykite abiem šalims ir patalpinkite parašus."
  }</span>`;
  const actions = ov.querySelector(".dsActionsV82");
  actions.classList.toggle("dsLockedV82", locked);
  actions.setAttribute("aria-disabled", String(locked));
  actions.querySelectorAll("button").forEach(b => {
    b.disabled = locked;
    b.setAttribute("aria-disabled", String(locked));
    b.tabIndex = locked ? -1 : 0;
  });
  const thumb = ov.querySelector(".ctThumbV56");
  thumb.classList.toggle("dsLockedV82", locked);
  thumb.tabIndex = locked ? -1 : 0;
  thumb.setAttribute("aria-disabled", String(locked));
}
function dsOpenV82(s) {
  const o = s.o;
  document.getElementById(o.domId)?.remove();
  const ov = document.createElement("div");
  ov.id = o.domId;
  ov.className = "ctOverlayV56 dsOverlayV82";
  ov.innerHTML = `<div class="ctPanelV56 dsPanelV82" role="dialog" aria-modal="true" aria-labelledby="dsTitleV82">
    <div class="ctDoneIcoV56 dsHeadIcoV82"></div>
    <h3 id="dsTitleV82"></h3>
    <p class="dsMetaV82"></p>
    <button type="button" class="ctThumbV56" data-ds-view aria-label="Peržiūrėti dokumentą"><img alt="Dokumento peržiūra"></button>
    <div class="dsSignGridV82" role="group" aria-label="Parašai">${o.signers
      .map(
        sg =>
          `<button type="button" class="dsSignBtnV82" data-ds-sign="${sg.key}" aria-pressed="false"><span class="dsSignIcoV82"></span><span class="dsSignTxtV82">${escapeHTML(sg.label)}</span></button>`
      )
      .join("")}</div>
    <button type="button" class="dsPlaceBtnV82" data-ds-place disabled><span class="dsPlaceIcoV82"></span><span class="dsPlaceTxtV82">Patalpinti parašus</span></button>
    <p class="dsStatusV82" aria-live="polite"></p>
    <div class="ctActionsV56 dsActionsV82">
      <button type="button" class="ctBtnV56 primary" data-ds-send>Siųsti</button>
      <button type="button" class="ctBtnV56" data-ds-view>Peržiūrėti</button>
      <button type="button" class="ctBtnV56" data-ds-download>Atsisiųsti į įrenginį</button>
    </div>
    <button type="button" class="ctBtnV56 ghost dsCloseV82" data-ds-close>Uždaryti</button>
  </div>`;
  document.body.appendChild(ov);
  dsUpdateV82(ov, s);
  requestAnimationFrame(() => ov.classList.add("show"));
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    ov.classList.remove("show");
    setTimeout(() => ov.remove(), 220);
  };
  const onKey = e => {
    if (e.key !== "Escape" || document.getElementById("spRootV82") || document.getElementById("ctViewerV56"))
      return;
    if (!document.body.contains(ov)) return document.removeEventListener("keydown", onKey, true);
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  document.addEventListener("keydown", onKey, true);
  ov.addEventListener("click", async e => {
    if (e.target === ov || e.target.closest("[data-ds-close]")) return close();
    const signBtn = e.target.closest("[data-ds-sign]");
    if (signBtn) {
      if (s.placed || s.busy) return;
      const sg = o.signers.find(x => x.key === signBtn.dataset.dsSign);
      const sig = await spOpenV82({ title: sg.padTitle, name: sg.name });
      if (sig && document.body.contains(ov)) {
        s.sigs[sg.key] = sig;
        dsUpdateV82(ov, s);
      } else if (sig) s.sigs[sg.key] = sig;
      return;
    }
    if (e.target.closest("[data-ds-place]")) {
      if (!s.allSigned() || s.placed || s.busy) return;
      s.busy = true;
      dsUpdateV82(ov, s);
      try {
        await Promise.all(o.signers.map(sg => spImageReadyV82(s.sigs[sg.key])));
        const pages = await o.render(s.sigs);
        const blob = await ctPdfFromCanvasesV52(pages);
        s.pages = pages;
        s.blob = blob;
        s.thumb = "";
        s.placed = true;
        let note = "";
        try {
          note = (await o.onPlaced?.({ blob, pages, sigs: s.sigs })) || "";
        } catch (err) {
          console.warn("Dokumento prisegimas", err);
          note = "nepavyko prisegti prie automobilio";
        }
        s.note = note;
        vibrate([10, 40, 14]);
        toast(o.placedToast || "Parašai patalpinti", "✓");
      } catch (err) {
        toast(err?.message || "Nepavyko patalpinti parašų", "!");
      } finally {
        s.busy = false;
        if (document.body.contains(ov)) dsUpdateV82(ov, s);
      }
      return;
    }
    if (!s.placed) return;
    if (e.target.closest("[data-ds-view]")) return ctOpenViewerV56(s.pages, o.number);
    if (e.target.closest("[data-ds-download]")) return ctDownloadV56(s.blob, o.fileName);
    if (e.target.closest("[data-ds-send]")) {
      const file = new File([s.blob], o.fileName, { type: "application/pdf" });
      if (!ctShareSupportedV56(file)) {
        ctDownloadV56(s.blob, o.fileName);
        toast("Šiame įrenginyje siuntimas nepalaikomas – failas atsisiųstas", "↓");
        return;
      }
      // Sistemos meniu: el. paštas, žinutės, WhatsApp, Viber, „Įrašyti į Failus“ ir kt.
      try {
        await navigator.share({ files: [file], title: o.number });
      } catch (err) {
        if (err && err.name !== "AbortError") ctDownloadV56(s.blob, o.fileName);
      }
    }
  });
  return ov;
}
