// AutoEasier prenumerata (v70): „Išbandyti 7 d. nemokamai“ prisijungimo ekrane, plano pasirinkimo skydelis,
// Stripe Checkout / Customer Portal per Supabase Edge Functions, juosta Garaže (liko d., mokėjimo klaida,
// tik peržiūra), skiltis „Prenumerata“ Nustatymuose, Paslaugų teikimo sąlygos ir Privatumo politika.
// Kainų ir prieigos tiesa – serveryje (public.subscriptions + account_subscription()). Stilius – 179-billing-v70.css.
(() => {
  const AUTH = () => window.AUTOEASIER_AUTH;
  const INTENT_KEY = "autoeasier-trial-intent-v70";
  const WELCOME_KEY = "autoeasier-welcome-v70";
  const PLANS = [
    {
      id: "pro",
      name: "Profesionalus",
      tagline: "Visas automobilių prekybos verslas vienoje vietoje.",
      price: 49,
      trialDays: 7,
      features: [
        ["car", "Neribotas automobilių skaičius"],
        ["tasks", "Užduotys ir Vadybininkas – niekas nepasimiršta"],
        ["cloud", "Nuotraukos ir dokumentai saugiai debesyje"],
        ["sign", "PP sutarčių generatorius"],
        ["calc", "Buhalterija ir ataskaitos buhalteriui"],
        ["devices", "Sinchronizacija telefone, planšetėje ir kompiuteryje"],
        ["shield", "Automatinės atsarginės kopijos"]
      ]
    }
  ];
  const ICONS = {
    car: '<path d="M5 16H3.5a.5.5 0 0 1-.5-.5V13l2-5.2A1.5 1.5 0 0 1 6.4 7h11.2a1.5 1.5 0 0 1 1.4.8L21 13v2.5a.5.5 0 0 1-.5.5H19"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/><path d="M9 16.5h6"/>',
    tasks: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>',
    cloud:
      '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/><path d="M12 11v5M9.8 13.2 12 11l2.2 2.2"/>',
    sign: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 17c1.2-1.6 2-1.6 2.6 0s1.4 1.6 2.4 0 1.8-1.3 2.5 0"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7h7M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
    devices:
      '<rect x="2.5" y="5" width="13" height="10" rx="1.6"/><path d="M6 18.5h6M9 15v3.5"/><rect x="17" y="8" width="4.5" height="11" rx="1.2"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'
  };
  const svg = (name, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const esc = s =>
    String(s ?? "").replace(
      /[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  const dateLT = iso =>
    iso ? new Date(iso).toLocaleDateString("lt-LT", { year: "numeric", month: "long", day: "numeric" }) : "";
  const daysLeft = iso => (iso ? Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5)) : 0);
  const dayWord = n =>
    n % 10 === 1 && n % 100 !== 11
      ? "diena"
      : n % 10 >= 2 && n % 10 <= 9 && (n % 100 < 11 || n % 100 > 19)
        ? "dienos"
        : "dienų";

  let sub = null; // paskutinė žinoma prenumeratos būsena (iš serverio)
  let signedIn = false;

  // ---------- Skydelis (bottom sheet) ----------
  const host = document.createElement("div");
  host.id = "aeBillV70";
  host.className = "bsV70";
  host.hidden = true;
  host.innerHTML = `<div class="bsScrimV70" data-bs-close></div>
    <section class="bsPanelV70" role="dialog" aria-modal="true" aria-labelledby="bsTitleV70">
      <div class="bsGrabV70" aria-hidden="true"></div>
      <header class="bsHeadV70"><h3 id="bsTitleV70"></h3><button type="button" class="bsXV70" data-bs-close aria-label="Uždaryti">${svg("x", 20)}</button></header>
      <div class="bsBodyV70"></div>
    </section>`;
  document.body.append(host);
  const panel = host.querySelector(".bsPanelV70");
  const body = host.querySelector(".bsBodyV70");
  const title = host.querySelector("#bsTitleV70");
  let closeTimer = 0,
    lastFocus = null,
    sheetKind = "";

  function openSheet(kind, heading, html) {
    clearTimeout(closeTimer);
    sheetKind = kind;
    title.textContent = heading;
    body.innerHTML = html;
    body.scrollTop = 0;
    panel.style.transform = "";
    host.dataset.kind = kind;
    if (host.hidden) {
      lastFocus = document.activeElement;
      host.hidden = false;
      document.documentElement.classList.add("aeBsOpenV70");
      void panel.offsetHeight; // pradinė padėtis užfiksuojama prieš animaciją – be šokinėjimo
      host.classList.add("is-open");
      if (matchMedia("(hover: hover) and (pointer: fine)").matches)
        setTimeout(() => panel.querySelector(".bsXV70")?.focus({ preventScroll: true }), 320);
    }
  }
  function closeSheet() {
    if (host.hidden) return;
    host.classList.remove("is-open");
    panel.style.transform = "";
    document.documentElement.classList.remove("aeBsOpenV70");
    closeTimer = setTimeout(() => {
      host.hidden = true;
      body.innerHTML = "";
      sheetKind = "";
      if (lastFocus && lastFocus.isConnected) lastFocus.focus?.({ preventScroll: true });
    }, 280);
    if (/^#(privatumas|salygos)$/.test(location.hash))
      history.replaceState(null, "", location.pathname + location.search);
  }
  host.addEventListener("click", e => {
    if (e.target.closest("[data-bs-close]")) closeSheet();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !host.hidden) closeSheet();
  });
  // Braukimas žemyn uždaro (tik kai turinys pačiame viršuje)
  let drag = null;
  panel.addEventListener(
    "touchstart",
    e => {
      if (e.touches.length !== 1) return;
      const onHead = !!e.target.closest(".bsHeadV70, .bsGrabV70");
      if (!onHead && body.scrollTop > 0) return;
      drag = { y: e.touches[0].clientY, t: Date.now(), dy: 0, active: false, onHead };
    },
    { passive: true }
  );
  panel.addEventListener(
    "touchmove",
    e => {
      if (!drag) return;
      const dy = e.touches[0].clientY - drag.y;
      if (!drag.active) {
        if (dy < 6) {
          if (dy < -6) drag = null;
          return;
        }
        if (!drag.onHead && body.scrollTop > 0) {
          drag = null;
          return;
        }
        drag.active = true;
        panel.classList.add("is-dragging");
      }
      drag.dy = Math.max(0, dy);
      panel.style.transform = `translate3d(0, ${drag.dy}px, 0)`;
      e.preventDefault();
    },
    { passive: false }
  );
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    panel.classList.remove("is-dragging");
    if (!d.active) return;
    const v = d.dy / Math.max(1, Date.now() - d.t);
    if (d.dy > 110 || (d.dy > 40 && v > 0.55)) closeSheet();
    else panel.style.transform = "";
  };
  panel.addEventListener("touchend", endDrag);
  panel.addEventListener("touchcancel", endDrag);

  // ---------- Turinys ----------
  const finePrint = plan =>
    `<p class="bsFineV70">${plan.trialDays} dienas nemokamai, vėliau ${plan.price} € per mėn. Atšaukti galima bet kada.</p>`;
  const legalLine = verb =>
    `<p class="bsLegalV70">${verb} sutinkate su <a href="#salygos" data-legal="salygos">Paslaugų teikimo sąlygomis</a> ir <a href="#privatumas" data-legal="privatumas">Privatumo politika</a>.</p>`;
  function planCard(plan, selected) {
    return `<article class="bsPlanV70${selected ? " is-selected" : ""}" data-plan="${esc(plan.id)}" aria-current="${selected}">
      <div class="bsPlanTopV70"><div><h4>${esc(plan.name)}</h4><p>${esc(plan.tagline)}</p></div><span class="bsBadgeV70">${plan.trialDays} d. nemokamai</span></div>
      <ul class="bsFeatV70">${plan.features
        .map(([ic, text]) => `<li><span class="bsIcoV70">${svg(ic, 19)}</span><span>${esc(text)}</span></li>`)
        .join("")}</ul>
    </article>`;
  }
  function plansHTML({ cta, lead } = {}) {
    const plan = PLANS[0];
    const trial = !(sub && sub.trial_used);
    const label = cta || (trial ? `Išbandyti ${plan.trialDays} d. nemokamai` : "Atnaujinti prenumeratą");
    return `${lead ? `<p class="bsLeadV70">${esc(lead)}</p>` : ""}
      <div class="bsPlansV70">${PLANS.map((p, i) => planCard(p, i === 0)).join("")}</div>
      <div class="bsCtaWrapV70">
        <button type="button" class="bsCtaV70" data-bill-start="${esc(plan.id)}"><span>${esc(label)}</span></button>
        ${trial ? finePrint(plan) : `<p class="bsFineV70">${plan.price} € per mėn. Atšaukti galima bet kada.</p>`}
        <p class="bsSecureV70">${svg("lock", 15)}<span>Saugus apmokėjimas per Stripe</span></p>
        ${legalLine(trial ? "Pradėdami bandomąjį laikotarpį" : "Tęsdami")}
        <p class="bsErrV70" role="alert" hidden></p>
      </div>`;
  }
  function openPlans(opts = {}) {
    openSheet("plans", opts.heading || "Pasirinkite planą", plansHTML(opts));
  }
  function busyHTML(text, sub2) {
    return `<div class="bsBusyV70"><span class="bsSpinV70" aria-hidden="true"></span><strong>${esc(text)}</strong>${
      sub2 ? `<p>${esc(sub2)}</p>` : ""
    }</div>`;
  }
  function welcomeHTML() {
    const t = sub?.trial_end && sub.status === "trialing";
    return `<div class="bsDoneV70"><span class="bsDoneIcoV70">${svg("check", 30)}</span>
      <strong>${t ? "Nemokamas laikotarpis prasidėjo" : "Prenumerata aktyvi"}</strong>
      <p>${
        t
          ? `Visos funkcijos atrakintos iki ${esc(dateLT(sub.trial_end))}. Priminsime prieš pirmą mokėjimą.`
          : "Ačiū! Visos funkcijos atrakintos."
      }</p>
      <button type="button" class="bsCtaV70" data-bs-close><span>Pradėti darbą</span></button></div>`;
  }
  function showError(text) {
    if (!pw.hidden && host.hidden) {
      pwIdle(text);
      return;
    }
    const el = body.querySelector(".bsErrV70");
    if (el) {
      el.textContent = text;
      el.hidden = false;
    } else
      openSheet(
        "error",
        "Nepavyko",
        `<p class="bsLeadV70">${esc(text)}</p><div class="bsCtaWrapV70"><button type="button" class="bsCtaV70" data-bs-close><span>Gerai</span></button></div>`
      );
  }

  // ---------- Serveris ----------
  async function client() {
    const a = AUTH();
    if (!a) throw new Error("auth");
    return a.client();
  }
  async function refreshSub() {
    try {
      const c = await client();
      const { data, error } = await c.rpc("account_subscription");
      if (error) throw error;
      sub = data || null;
      window.__autoEasierSubscription = sub;
    } catch (e) {}
    paint();
    return sub;
  }
  const ERRORS = {
    stripe_not_configured: "Mokėjimai dar ruošiami. Bandykite po kelių minučių.",
    price_not_found: "Planas laikinai nepasiekiamas. Bandykite vėliau.",
    auth_required: "Prisijunkite iš naujo ir bandykite dar kartą.",
    no_customer: "Prenumeratos dar nėra – pradėkite nemokamą laikotarpį."
  };
  async function callFn(name) {
    const c = await client();
    const { data, error } = await c.functions.invoke(name, { body: {} });
    if (error) {
      let code = "";
      try {
        code = (await error.context?.json?.())?.error || "";
      } catch (e) {}
      throw new Error(
        ERRORS[code] || "Nepavyko prisijungti prie mokėjimų. Patikrinkite ryšį ir bandykite dar kartą."
      );
    }
    if (!data?.url) throw new Error("Nepavyko gauti apmokėjimo nuorodos.");
    return data.url;
  }
  async function goCheckout(btn) {
    if (btn) {
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.querySelector("span").textContent = "Ruošiama…";
    }
    try {
      const url = await callFn("create-checkout-session");
      location.assign(url);
    } catch (e) {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("is-busy");
        btn.querySelector("span").textContent = sub?.trial_used
          ? "Atnaujinti prenumeratą"
          : "Išbandyti 7 d. nemokamai";
        showError(e.message);
      } else showError(e.message);
    }
  }
  async function goPortal(btn) {
    const label = btn?.querySelector("span")?.textContent || "";
    if (btn) {
      btn.disabled = true;
      btn.querySelector("span").textContent = "Atidaroma…";
    }
    try {
      location.assign(await callFn("create-portal-session"));
    } catch (e) {
      if (btn) {
        btn.disabled = false;
        btn.querySelector("span").textContent = label;
      }
      showError(e.message);
    }
  }
  async function startTrial(btn) {
    let session = null;
    try {
      session = signedIn ? await AUTH()?.session() : null;
    } catch (e) {}
    if (!session) {
      // Pirmiausia paskyra – po prisijungimo automatiškai tęsiama į apmokėjimą
      try {
        localStorage.setItem(INTENT_KEY, String(Date.now()));
      } catch (e) {}
      closeSheet();
      const a = AUTH();
      if (a) {
        if (a.mode !== "signup") a.setMode("signup");
        a.setMessage(
          "Sukurkite paskyrą – po to pateksite į saugų apmokėjimą. Pirmos 7 dienos nemokamai.",
          true
        );
        setTimeout(() => a.focusEmail(), 300);
      }
      return;
    }
    if (sub?.access && !["none", "canceled"].includes(sub.status)) {
      closeSheet();
      return;
    }
    goCheckout(btn);
  }
  document.addEventListener("click", e => {
    const start = e.target.closest("#aeBillV70 [data-bill-start], #aePaywallV71 [data-bill-start]");
    if (start) {
      e.preventDefault();
      startTrial(start);
      return;
    }
    const legal = e.target.closest("[data-legal]");
    if (legal) {
      e.preventDefault();
      openLegal(legal.dataset.legal);
      return;
    }
    const act = e.target.closest("[data-bill-action]");
    if (act) {
      e.preventDefault();
      const a = act.dataset.billAction;
      if (a === "portal") goPortal(act);
      else if (a === "plans") openPlans();
      else if (a === "settings") openSettings();
    }
  });

  // ---------- Prisijungimo ekranas ----------
  const loginBtn = document.getElementById("autoEasierSubscription");
  if (loginBtn) {
    loginBtn.addEventListener("click", e => {
      e.preventDefault();
      openPlans();
    });
  }

  // ---------- Garažo juosta ----------
  function barModel() {
    if (!sub || sub.comped) return null;
    if (window.__autoEasierReadOnly || sub.access === false)
      return {
        tone: "bad",
        text: sub.trial_used ? "Prenumerata neaktyvi – tik peržiūra" : "Pradėkite 7 d. nemokamą laikotarpį",
        btn: sub.trial_used ? "Atnaujinti" : "Pradėti",
        action: "plans"
      };
    if (sub.status === "past_due")
      return {
        tone: "warn",
        text: `Mokėjimas nepavyko – atnaujinkite kortelę iki ${dateLT(sub.grace_until)}`,
        btn: "Atnaujinti",
        action: "portal"
      };
    if (sub.status === "trialing") {
      const n = daysLeft(sub.trial_end);
      return {
        tone: n <= 2 ? "warn" : "soft",
        text:
          n > 0
            ? `Nemokamas laikotarpis · liko ${n} ${dayWord(n)}`
            : "Nemokamas laikotarpis baigiasi šiandien",
        btn: "Valdyti",
        action: "settings"
      };
    }
    if (sub.cancel_at_period_end && sub.current_period_end)
      return {
        tone: "soft",
        text: `Prenumerata baigsis ${dateLT(sub.current_period_end)}`,
        btn: "Valdyti",
        action: "portal"
      };
    return null;
  }
  function paintBar() {
    const anchor = document.querySelector("#view-garage .garageRefBrandRow");
    let bar = document.getElementById("aeBarV70");
    const m = signedIn ? barModel() : null;
    if (!m || !anchor) {
      bar?.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "aeBarV70";
      anchor.insertAdjacentElement("afterend", bar);
    }
    const html = `<span class="aeBarDotV70" aria-hidden="true"></span><span class="aeBarTextV70">${esc(m.text)}</span><button type="button" data-bill-action="${m.action}"><span>${esc(m.btn)}</span></button>`;
    if (bar.dataset.html !== html) {
      bar.innerHTML = html;
      bar.dataset.html = html;
    }
    bar.className = `aeBarV70 is-${m.tone}`;
  }

  // ---------- Nustatymai → Prenumerata ----------
  const STATUS_LT = {
    trialing: ["Bandomasis laikotarpis", "soft"],
    active: ["Aktyvi", "good"],
    past_due: ["Mokėjimas nepavyko", "warn"],
    canceled: ["Neaktyvi", "bad"],
    unpaid: ["Neapmokėta", "bad"],
    incomplete: ["Nebaigta", "bad"],
    incomplete_expired: ["Neaktyvi", "bad"],
    paused: ["Sustabdyta", "warn"],
    none: ["Neaktyvi", "bad"]
  };
  function settingsHTML() {
    const plan = PLANS[0];
    const s = sub || { status: "none" };
    const [label, tone] = s.comped ? ["Nemokama prieiga", "good"] : STATUS_LT[s.status] || STATUS_LT.none;
    const rows = [["Planas", plan.name]];
    if (s.comped) rows.push(["Kaina", "Nemokamai (ankstyvasis vartotojas)"]);
    else if (s.status === "trialing") {
      rows.push(["Nemokamai iki", dateLT(s.trial_end)]);
      rows.push(["Vėliau", s.cancel_at_period_end ? "Neatnaujinama" : `${plan.price} € per mėn.`]);
    } else if (s.status === "active" || s.status === "past_due") {
      rows.push([s.cancel_at_period_end ? "Galioja iki" : "Kitas mokėjimas", dateLT(s.current_period_end)]);
      rows.push(["Kaina", `${plan.price} € per mėn.`]);
    } else rows.push(["Kaina", `${plan.price} € per mėn.`]);
    let btn = "";
    if (!s.comped) {
      if (s.has_customer && ["trialing", "active", "past_due", "unpaid", "paused"].includes(s.status))
        btn = `<button type="button" class="btn" data-bill-action="portal"><span>Valdyti prenumeratą</span></button>`;
      else
        btn = `<button type="button" class="btn" data-bill-action="plans"><span>${
          s.trial_used ? "Atnaujinti prenumeratą" : "Išbandyti 7 d. nemokamai"
        }</span></button>`;
    }
    return `<div class="aeSubHeadV70"><strong>Prenumerata</strong><span class="aeSubBadgeV70 is-${tone}">${esc(label)}</span></div>
      <dl class="aeSubRowsV70">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v || "—")}</dd></div>`).join("")}</dl>
      ${btn ? `<div class="aeSubActV70">${btn}</div>` : ""}
      <p class="aeSubLinksV70"><a href="#salygos" data-legal="salygos">Paslaugų teikimo sąlygos</a><span aria-hidden="true">·</span><a href="#privatumas" data-legal="privatumas">Privatumo politika</a></p>`;
  }
  function paintSettings() {
    const view = document.getElementById("view-settings");
    const head = view?.querySelector("#setAccountHV71") || view?.querySelector(":scope > .sectionHead");
    let box = document.getElementById("aeSubPanelV70");
    if (!signedIn || !sub || !head) {
      box?.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.id = "aeSubPanelV70";
      box.className = "panel pad aeSubPanelV70";
      head.insertAdjacentElement("afterend", box);
    }
    const html = settingsHTML();
    if (box.dataset.html !== html) {
      box.innerHTML = html;
      box.dataset.html = html;
    }
  }
  function openSettings() {
    // Nustatymai atsidaro Meniu puslapyje kaip išskleidžiamas blokas
    document.querySelector('.navWrap [data-view="menu"]')?.click();
    setTimeout(() => {
      const link = document.querySelector('#view-menu .menuLink[data-menu-disclosure="settings"]');
      if (link && link.getAttribute("aria-expanded") !== "true") link.click();
      else if (!link) document.querySelector('[data-open-view="settings"]')?.click();
      paintSettings();
      setTimeout(
        () =>
          document.getElementById("aeSubPanelV70")?.scrollIntoView({ block: "center", behavior: "smooth" }),
        80
      );
    }, 60);
  }
  function paint() {
    paintBar();
    paintSettings();
  }
  window.addEventListener("autoeasier:local-save", () => requestAnimationFrame(paint));
  document.addEventListener("click", e => {
    if (e.target.closest(".navWrap button, [data-open-view]")) setTimeout(paint, 30);
  });

  // ---------- Tik peržiūra: bandymas keisti ----------
  window.addEventListener("autoeasier:readonly-blocked", () => {
    if (!host.hidden) return;
    const unpaid = sub?.has_customer && ["past_due", "unpaid"].includes(sub.status);
    if (unpaid) {
      openSheet(
        "paywall",
        "Atnaujinkite mokėjimą",
        `<p class="bsLeadV70">Paskutinis mokėjimas nepavyko. Jūsų duomenys saugūs – atnaujinkite kortelę ir galėsite toliau dirbti.</p>
        <div class="bsCtaWrapV70"><button type="button" class="bsCtaV70" data-bill-action="portal"><span>Atnaujinti kortelę</span></button><p class="bsErrV70" role="alert" hidden></p></div>`
      );
      return;
    }
    openPlans({
      heading: sub?.trial_used ? "Atnaujinkite prenumeratą" : "Pradėkite nemokamai",
      lead: sub?.trial_used
        ? "Jūsų duomenys saugūs ir matomi. Norėdami vėl pridėti ir keisti, atnaujinkite prenumeratą."
        : "Norėdami pridėti ir keisti duomenis, pradėkite 7 dienų nemokamą laikotarpį."
    });
  });

  // ---------- Grįžimas iš Stripe ----------
  const params = new URLSearchParams(location.search);
  let returnFlag = params.get("checkout") || params.get("billing") || "";
  function cleanUrl() {
    if (!returnFlag) return;
    returnFlag = "";
    params.delete("checkout");
    params.delete("billing");
    const q = params.toString();
    history.replaceState(null, "", location.pathname + (q ? `?${q}` : "") + location.hash);
  }
  async function waitForAccess() {
    openSheet(
      "activating",
      "Aktyvuojama",
      busyHTML("Aktyvuojama prenumerata…", "Tai užtrunka kelias sekundes.")
    );
    const until = Date.now() + 45e3;
    while (Date.now() < until) {
      await refreshSub();
      if (sub?.access) {
        cleanUrl();
        if (window.__autoEasierReadOnly) {
          // Duomenų saugykla paruošiama iš naujo su prieiga
          try {
            sessionStorage.setItem(WELCOME_KEY, "1");
          } catch (e) {}
          location.reload();
          return;
        }
        openSheet("welcome", "Sveiki prisijungę", welcomeHTML());
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    cleanUrl();
    showError("Mokėjimas gautas, bet patvirtinimas dar vėluoja. Atnaujinkite puslapį po minutės.");
  }

  // ---------- Prieigos užraktas (v71): visas ekranas, kol nepradėtas bandomasis laikotarpis ----------
  const pw = document.createElement("div");
  pw.id = "aePaywallV71";
  pw.className = "pwV71";
  pw.hidden = true;
  document.body.append(pw);
  let pwEmail = "",
    pwBusy = false;
  const pwHead = () =>
    `<header class="pwHeadV71"><span class="pwBrandV71">AutoEasier</span><div class="pwUserV71"><span>${esc(pwEmail)}</span><button type="button" data-pw-signout>Atsijungti</button></div></header>`;
  function pwRender(inner) {
    pw.innerHTML = `${pwHead()}<main class="pwMainV71">${inner}</main>`;
    pw.scrollTop = 0;
  }
  function pwShow() {
    if (pw.hidden) {
      pw.hidden = false;
      document.documentElement.classList.add("aePaywallOnV71");
      requestAnimationFrame(() => pw.classList.add("is-in"));
    }
  }
  function pwHide() {
    pw.classList.remove("is-in");
    pw.hidden = true;
    pw.innerHTML = "";
    pwBusy = false;
    document.documentElement.classList.remove("aePaywallOnV71");
  }
  function pwIdle(err) {
    pwBusy = false;
    pwRender(`<h1 class="pwTitleV71">Pradėkite nemokamai</h1>
      <p class="pwLeadV71">7 dienas naudokitės visomis funkcijomis. Pirmą kartą nuskaičiuosime tik pasibaigus bandomajam laikotarpiui.</p>
      ${plansHTML({})}`);
    if (err) {
      const el = pw.querySelector(".bsErrV70");
      if (el) {
        el.textContent = err;
        el.hidden = false;
      }
    }
    pwShow();
  }
  function pwWorking(text, sub2) {
    pwBusy = true;
    pwRender(busyHTML(text, sub2));
    pwShow();
  }
  async function pwActivate() {
    if (pwBusy && pw.dataset.act === "1") return;
    pw.dataset.act = "1";
    pwWorking("Aktyvuojama prenumerata…", "Tai užtrunka kelias sekundes.");
    const until = Date.now() + 60e3;
    while (Date.now() < until) {
      await refreshSub();
      if (sub?.access) {
        cleanUrl();
        try {
          sessionStorage.setItem(WELCOME_KEY, "1");
        } catch (e) {}
        let ok = false;
        try {
          ok = await AUTH().enter();
        } catch (e) {}
        pw.dataset.act = "";
        if (ok) pwHide();
        else location.reload();
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    cleanUrl();
    pw.dataset.act = "";
    pwRender(`<div class="bsBusyV70"><strong>Patvirtinimas dar vėluoja</strong>
      <p>Jei mokėjimas atliktas, prenumerata aktyvuosis per minutę. Patikrinkite dar kartą.</p></div>
      <div class="bsCtaWrapV70"><button type="button" class="bsCtaV70" data-pw-recheck><span>Patikrinti dar kartą</span></button></div>`);
  }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-pw-signout]")) {
      e.preventDefault();
      AUTH()?.signOut?.();
    } else if (e.target.closest("[data-pw-recheck]")) {
      e.preventDefault();
      pwActivate();
    }
  });
  window.addEventListener("autoeasier:paywall", e => {
    signedIn = true;
    sub = e.detail?.subscription || null;
    pwEmail = e.detail?.user?.email || "";
    window.__autoEasierSubscription = sub;
    closeSheet();
    let intent = 0;
    try {
      intent = Number(localStorage.getItem(INTENT_KEY) || 0);
      localStorage.removeItem(INTENT_KEY);
    } catch (err) {}
    if (returnFlag === "success") return pwActivate();
    if (returnFlag === "cancel") {
      cleanUrl();
      return pwIdle("Apmokėjimas nebuvo užbaigtas. Galite bandyti dar kartą.");
    }
    if (returnFlag) cleanUrl();
    if (intent && Date.now() - intent < 3600e3) {
      pwWorking("Nukreipiama į saugų apmokėjimą…", "Stripe – patikimas mokėjimų partneris.");
      return goCheckout(null);
    }
    pwIdle();
  });

  // ---------- Paskyros įvykiai ----------
  window.addEventListener("autoeasier:account-ready", async e => {
    signedIn = true;
    sub = e.detail?.subscription || null;
    if (!sub) await refreshSub();
    else paint();
    let welcome = false;
    try {
      welcome = sessionStorage.getItem(WELCOME_KEY) === "1";
      sessionStorage.removeItem(WELCOME_KEY);
    } catch (err) {}
    if (welcome) {
      openSheet("welcome", "Sveiki prisijungę", welcomeHTML());
      return;
    }
    if (returnFlag === "success") {
      waitForAccess();
      return;
    }
    if (returnFlag === "manage") {
      cleanUrl();
      if (sub?.has_customer) goPortal();
      else openSettings();
      return;
    }
    if (returnFlag === "cancel") {
      cleanUrl();
      if (!sub?.access) openPlans();
      return;
    }
    if (returnFlag) cleanUrl();
    let intent = 0;
    try {
      intent = Number(localStorage.getItem(INTENT_KEY) || 0);
      localStorage.removeItem(INTENT_KEY);
    } catch (err) {}
    const needs = !sub || (!sub.comped && !sub.access);
    if (intent && Date.now() - intent < 3600e3 && needs) {
      openSheet(
        "redirect",
        "Apmokėjimas",
        busyHTML("Nukreipiama į saugų apmokėjimą…", "Stripe – patikimas mokėjimų partneris.")
      );
      goCheckout(null);
      return;
    }
    // Nauja paskyra be prenumeratos – vieną kartą parodomas planas
    if (sub && !sub.comped && sub.status === "none" && !sub.trial_used) openPlans();
  });
  window.addEventListener("autoeasier:signed-out", () => {
    pwHide();
    signedIn = false;
    sub = null;
    paint();
    if (sheetKind && sheetKind !== "legal" && sheetKind !== "plans") closeSheet();
  });
  // Grįžus į programėlę (pvz., iš Stripe portalo kitame lange) – būsena atnaujinama
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && signedIn)
      refreshSub().then(() => {
        if (!pw.hidden && sub?.access) pwActivate();
      });
  });

  // ---------- Teisiniai tekstai ----------
  const PROVIDER = "Vako Group, MB";
  const CONTACT = "autoeasier@gmail.com";
  const LEGAL = {
    salygos: [
      "Paslaugų teikimo sąlygos",
      `<p class="bsDocMetaV70">Galioja nuo 2026 m. spalio 28 d.</p>
      <h5>1. Paslauga</h5><p>AutoEasier – internetinė programėlė automobilių prekybos verslui valdyti: automobiliai, užduotys, dokumentai, sutartys, buhalterija ir ataskaitos. Paslaugą teikia ${PROVIDER} (toliau – Teikėjas).</p>
      <h5>2. Paskyra</h5><p>Paskyrai sukurti reikia el. pašto adreso ir slaptažodžio. Už prisijungimo duomenų saugumą ir paskyroje atliekamus veiksmus atsakote jūs.</p>
      <h5>3. Nemokamas laikotarpis ir kaina</h5><p>Pirmos 7 dienos – nemokamai. Pradedant bandomąjį laikotarpį nurodoma mokėjimo kortelė, tačiau nuskaičiuojama tik jam pasibaigus. Vėliau prenumerata kainuoja 49 € per mėnesį ir atnaujinama automatiškai kas mėnesį, kol jos neatšaukiate. Nemokamas laikotarpis suteikiamas vieną kartą paskyrai.</p>
      <h5>4. Atšaukimas</h5><p>Prenumeratą galite atšaukti bet kada: Nustatymai → Prenumerata → „Valdyti prenumeratą“. Atšaukus ji galioja iki apmokėto laikotarpio pabaigos, vėliau mokėjimai nebeimami. Atšaukus bandomojo laikotarpio metu – mokėjimas nebus nuskaičiuotas.</p>
      <h5>5. Teisė atsisakyti per 14 dienų</h5><p>Jei esate vartotojas (fizinis asmuo, sudarantis sutartį ne verslo tikslais), turite teisę atsisakyti sutarties per 14 dienų nuo jos sudarymo nenurodydami priežasties. Pradėdami naudotis paslauga šiuo laikotarpiu prašote ją teikti iš karto; atsisakius grąžinama nepanaudotą laikotarpį atitinkanti sumokėtos kainos dalis. Atsisakymą pateikite el. paštu ${CONTACT}.</p>
      <h5>6. Mokėjimo nesėkmė</h5><p>Jei mokėjimas nepavyksta, 3 dienas paslauga veikia įprastai, kad galėtumėte atnaujinti kortelę. Vėliau paskyra veikia tik peržiūros režimu, kol mokėjimas bus atnaujintas.</p>
      <h5>7. Jūsų duomenys</h5><p>Programėlėje įvesti duomenys priklauso jums. Prenumeratai pasibaigus jie nėra ištrinami – galite juos peržiūrėti ir atsisiųsti atsarginę kopiją. Paskyrą ir duomenis ištriname jūsų prašymu.</p>
      <h5>8. Atsakomybė</h5><p>Paslauga teikiama tokia, kokia yra. Stengiamės užtikrinti nepertraukiamą veikimą ir reguliarias atsargines kopijas, tačiau neatsakome už netiesioginius nuostolius ar už programėlėje sugeneruotų dokumentų turinį – prieš naudodami juos peržiūrėkite. Teikėjo atsakomybė ribojama per paskutinius 12 mėnesių sumokėta suma.</p>
      <h5>9. Pakeitimai</h5><p>Apie sąlygų ar kainos pakeitimus informuosime el. paštu ne vėliau kaip prieš 30 dienų. Nesutikdami galite prenumeratą atšaukti.</p>
      <h5>10. Kontaktai</h5><p>${PROVIDER}, el. paštas <a href="mailto:${CONTACT}">${CONTACT}</a>. Ginčams taikoma Lietuvos Respublikos teisė.</p>`
    ],
    privatumas: [
      "Privatumo politika",
      `<p class="bsDocMetaV70">Galioja nuo 2026 m. spalio 28 d.</p>
      <h5>Duomenų valdytojas</h5><p>${PROVIDER}, el. paštas <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
      <h5>Kokius duomenis tvarkome</h5><p>Paskyros duomenis (el. paštą), programėlėje jūsų įvestus duomenis (automobilius, klientų kontaktus, dokumentus, nuotraukas, finansinius įrašus) ir prenumeratos informaciją (būseną, mokėjimų datas). Mokėjimo kortelės duomenis tvarko tik Stripe – mes jų nematome ir nesaugome.</p>
      <h5>Kodėl</h5><p>Kad galėtume teikti paslaugą ir sinchronizuoti duomenis tarp jūsų įrenginių (sutarties vykdymas), administruoti prenumeratą ir apmokėjimą, siųsti su paslauga susijusius pranešimus (pvz., priminimą apie bandomojo laikotarpio pabaigą) bei vykdyti teisines prievoles (apskaita).</p>
      <h5>Kas gauna duomenis</h5><p>Tik paslaugai būtini tvarkytojai: Supabase (duomenų saugykla ir prisijungimas), Vercel (programėlės talpinimas), Stripe (mokėjimai), Resend (el. laiškai). Duomenų neparduodame ir nenaudojame reklamai.</p>
      <h5>Kiek laiko saugome</h5><p>Kol turite paskyrą. Ištrynus paskyrą, duomenys ir atsarginės kopijos pašalinami per 30 dienų, išskyrus apskaitos dokumentus, kuriuos privalome saugoti pagal įstatymus.</p>
      <h5>Klientų duomenys programėlėje</h5><p>Jei programėlėje saugote savo klientų asmens duomenis, jų valdytojas esate jūs, o mes – tvarkytojas, tvarkantis juos tik jūsų nurodymu ir tik paslaugai teikti.</p>
      <h5>Jūsų teisės</h5><p>Galite prašyti susipažinti su duomenimis, juos ištaisyti, ištrinti, apriboti tvarkymą ar gauti juos perkeliamu formatu – parašykite <a href="mailto:${CONTACT}">${CONTACT}</a>. Taip pat turite teisę pateikti skundą Valstybinei duomenų apsaugos inspekcijai (vdai.lrv.lt).</p>
      <h5>Saugumas</h5><p>Duomenys perduodami šifruotu ryšiu, kiekvienos paskyros duomenys atskirti serverio lygmeniu, daromos automatinės atsarginės kopijos.</p>
      <h5>Slapukai</h5><p>Naudojame tik būtiną naršyklės saugyklą prisijungimui ir programėlės nustatymams išlaikyti. Reklaminių ir sekimo slapukų nenaudojame.</p>`
    ]
  };
  function openLegal(key) {
    const doc = LEGAL[key];
    if (!doc) return;
    const back = sheetKind === "plans" || sheetKind === "paywall";
    openSheet(
      "legal",
      doc[0],
      `<div class="bsDocV70">${doc[1]}</div>${
        back
          ? `<div class="bsCtaWrapV70"><button type="button" class="bsBackV70" data-bill-action="plans"><span>Grįžti į planą</span></button></div>`
          : ""
      }`
    );
  }
  const hashLegal = () => {
    const k = location.hash.replace(/^#/, "");
    if (LEGAL[k]) openLegal(k);
  };
  window.addEventListener("hashchange", hashLegal);
  hashLegal();

  // Testams ir kitiems moduliams
  window.AUTOEASIER_BILLING = {
    openPlans,
    openLegal,
    close: closeSheet,
    refresh: refreshSub,
    get state() {
      return sub;
    },
    _set(next, opts = {}) {
      sub = next;
      signedIn = opts.signedIn ?? signedIn;
      paint();
    }
  };
})();
