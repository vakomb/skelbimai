// Administratoriaus skydelis (v72): tik autoeasier@gmail.com. Prisegtas mygtukas visuose puslapiuose atidaro apatinį langą:
// Apžvalga (rodikliai, reikia dėmesio), Vartotojai (paieška, filtrai, kortelė su veiksmais), Veikla (audito žurnalas).
// Skaitymas – RPC admin_overview/admin_users/admin_audit_list/admin_orphans, veiksmai – Edge Function „admin-action“.
// Teises tikrina serveris (JWT + ID); čia tik rodymas.
(() => {
  const ADMIN_EMAIL = "autoeasier@gmail.com";
  const AUTH = () => window.AUTOEASIER_AUTH;
  const esc = s =>
    String(s ?? "").replace(
      /[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  const ICON = {
    shield:
      '<path d="M12 3 4.5 6v5.5c0 4.4 3.1 7.9 7.5 9.5 4.4-1.6 7.5-5.1 7.5-9.5V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    back: '<path d="m14 6-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  const svg = (n, s = 20) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
  const MONTHS = [
    "sausio",
    "vasario",
    "kovo",
    "balandžio",
    "gegužės",
    "birželio",
    "liepos",
    "rugpjūčio",
    "rugsėjo",
    "spalio",
    "lapkričio",
    "gruodžio"
  ];
  const dateLT = iso => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d) ? "—" : `${d.getFullYear()} m. ${MONTHS[d.getMonth()]} ${d.getDate()} d.`;
  };
  const dateTimeLT = iso => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const ago = iso => {
    if (!iso) return "niekada";
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 90) return "ką tik";
    if (s < 3600) return `prieš ${Math.round(s / 60)} min.`;
    if (s < 86400) return `prieš ${Math.round(s / 3600)} val.`;
    const d = Math.round(s / 86400);
    return d < 60 ? `prieš ${d} d.` : dateLT(iso);
  };
  const inDays = iso => (iso ? Math.ceil((new Date(iso) - Date.now()) / 864e5) : null);
  const bytes = n => {
    n = Number(n) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
    if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1073741824).toFixed(2)} GB`;
  };
  const eur = n => `${Number(n || 0).toLocaleString("lt-LT")} €`;
  const STATUS = {
    trialing: ["Bandomasis", "info"],
    active: ["Aktyvi", "good"],
    past_due: ["Neapmokėta", "warn"],
    canceled: ["Atšaukta", "bad"],
    unpaid: ["Neapmokėta", "bad"],
    incomplete: ["Nebaigta", "muted"],
    incomplete_expired: ["Pasibaigė", "muted"],
    paused: ["Sustabdyta", "muted"],
    none: ["Be prenumeratos", "muted"]
  };
  const statusOf = u => (u.comped ? ["Nemokama", "good"] : STATUS[u.status] || STATUS.none);
  const ERR = {
    forbidden: "Neturite teisių.",
    auth_required: "Prisijunkite iš naujo.",
    not_on_self: "Šio veiksmo savo paskyrai atlikti negalima.",
    user_not_found: "Vartotojas nerastas.",
    no_subscription: "Vartotojas neturi Stripe prenumeratos.",
    not_trialing: "Prenumerata nebėra bandomojo laikotarpio.",
    confirm_mismatch: "El. paštas nesutampa.",
    stripe_not_configured: "Stripe neprijungtas.",
    stripe_cancel_failed: "Nepavyko atšaukti Stripe prenumeratos – paskyra neištrinta.",
    server_error: "Serverio klaida. Bandykite dar kartą."
  };

  // ---------- Būsena ----------
  const S = {
    open: false,
    tab: "overview",
    loaded: false,
    loading: false,
    o: null,
    users: [],
    audit: [],
    orphans: null,
    q: "",
    filter: "all",
    detail: null,
    err: ""
  };
  let isAdmin = false;

  // ---------- Elementai ----------
  const fab = document.createElement("button");
  fab.id = "aeAdminFabV72";
  fab.type = "button";
  fab.hidden = true;
  fab.setAttribute("aria-label", "Administravimas");
  fab.innerHTML = `${svg("shield", 22)}<span class="adDotV72" hidden></span>`;
  document.body.append(fab);
  const host = document.createElement("div");
  host.id = "aeAdminV72";
  host.className = "adV72";
  host.hidden = true;
  host.innerHTML = `<div class="adScrimV72" data-ad-close></div>
    <section class="adPanelV72" role="dialog" aria-modal="true" aria-label="Administravimas">
      <div class="adGrabV72" aria-hidden="true"></div>
      <header class="adHeadV72">
        <button type="button" class="adIconBtnV72 adBackV72" data-ad-back aria-label="Atgal" hidden>${svg("back")}</button>
        <h3 class="adTitleV72">Administravimas</h3>
        <button type="button" class="adIconBtnV72" data-ad-refresh aria-label="Atnaujinti">${svg("refresh", 19)}</button>
        <button type="button" class="adIconBtnV72" data-ad-close aria-label="Uždaryti">${svg("x")}</button>
      </header>
      <nav class="adTabsV72" role="tablist">
        <button type="button" role="tab" data-ad-tab="overview">Apžvalga</button>
        <button type="button" role="tab" data-ad-tab="users">Vartotojai</button>
        <button type="button" role="tab" data-ad-tab="activity">Veikla</button>
      </nav>
      <div class="adBodyV72"></div>
      <div class="adToastV72" role="status" aria-live="polite" hidden></div>
    </section>`;
  document.body.append(host);
  const panel = host.querySelector(".adPanelV72");
  const body = host.querySelector(".adBodyV72");
  const toastEl = host.querySelector(".adToastV72");
  const titleEl = host.querySelector(".adTitleV72");
  const backBtn = host.querySelector("[data-ad-back]");
  const tabsEl = host.querySelector(".adTabsV72");
  let toastTimer = 0;
  const toast = (text, bad = false) => {
    toastEl.textContent = text;
    toastEl.classList.toggle("is-bad", bad);
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 3200);
  };

  // ---------- Duomenys ----------
  async function rpc(name, args) {
    const c = await AUTH().client();
    const { data, error } = await c.rpc(name, args || {});
    if (error) throw error;
    return data;
  }
  async function act(action, extra = {}) {
    const c = await AUTH().client();
    const { data, error } = await c.functions.invoke("admin-action", { body: { action, ...extra } });
    if (error) {
      let code = "";
      try {
        code = (await error.context?.json?.())?.error || "";
      } catch (e) {}
      throw new Error(ERR[code] || "Veiksmas nepavyko. Bandykite dar kartą.");
    }
    return data;
  }
  async function load(silent) {
    if (S.loading) return;
    S.loading = true;
    S.err = "";
    if (!silent && !S.loaded) paint();
    try {
      const [o, users, audit, orphans] = await Promise.all([
        rpc("admin_overview"),
        rpc("admin_users"),
        rpc("admin_audit_list", { p_limit: 100 }),
        rpc("admin_orphans")
      ]);
      S.o = o;
      S.users = users || [];
      S.audit = audit || [];
      S.orphans = orphans;
      S.loaded = true;
    } catch (e) {
      S.err = "Nepavyko įkelti duomenų. Patikrinkite ryšį ir bandykite dar kartą.";
    }
    S.loading = false;
    paintDot();
    paint();
  }
  const attention = () =>
    S.users.filter(
      u =>
        !u.comped &&
        (u.status === "past_due" ||
          (u.status === "trialing" && inDays(u.trial_end) <= 3) ||
          u.status === "unpaid")
    );
  function paintDot() {
    const dot = fab.querySelector(".adDotV72");
    dot.hidden = !(S.loaded && attention().length);
  }

  // ---------- Piešimas ----------
  const badge = ([label, tone]) => `<span class="adBadgeV72 is-${tone}">${esc(label)}</span>`;
  function kpi(label, value, sub, tone) {
    return `<div class="adKpiV72${tone ? " is-" + tone : ""}"><span>${esc(label)}</span><strong>${value}</strong>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  }
  function userRow(u) {
    const name = u.profile_name || "";
    return `<button type="button" class="adRowV72" data-ad-user="${esc(u.id)}">
      <span class="adAvV72">${esc((u.email || "?")[0].toUpperCase())}</span>
      <span class="adRowMainV72"><strong>${esc(u.email)}</strong><small>${esc(name ? name + " · " : "")}aktyvus ${esc(ago(u.last_sign_in_at))}</small></span>
      <span class="adRowEndV72">${u.banned ? badge(["Užblokuota", "bad"]) : badge(statusOf(u))}</span>
    </button>`;
  }
  function overviewHTML() {
    const o = S.o;
    const att = attention();
    const orphan = S.orphans && S.orphans.files > 0;
    return `<div class="adKpisV72">
        ${kpi("Vartotojai", o.users, `+${o.new_7d} per 7 d.`)}
        ${kpi("Mėnesinės pajamos", eur(o.mrr_eur), `${o.paying} mokančių`, "good")}
        ${kpi("Bandomasis laikotarpis", o.trialing, o.trials_ending ? `${o.trials_ending} baigiasi ≤ 3 d.` : "")}
        ${kpi("Nemokama prieiga", o.comped)}
        ${kpi("Neapmokėta", o.past_due, "", o.past_due ? "warn" : "")}
        ${kpi("Atšaukta", o.canceled)}
      </div>
      <h4 class="adSecV72">Reikia dėmesio</h4>
      <div class="adListV72">${att.length ? att.map(userRow).join("") : '<p class="adEmptyV72">Viskas tvarkoje – dėmesio reikalaujančių paskyrų nėra.</p>'}</div>
      <h4 class="adSecV72">Naudojimas</h4>
      <div class="adCardV72"><dl class="adDlV72">
        <div><dt>Aktyvūs per 7 d.</dt><dd>${o.active_7d} iš ${o.users}</dd></div>
        <div><dt>Nauji per 30 d.</dt><dd>${o.new_30d}</dd></div>
        <div><dt>Be prenumeratos</dt><dd>${o.no_sub}</dd></div>
        <div><dt>Automobiliai sistemoje</dt><dd>${o.cars}</dd></div>
        <div><dt>Saugykla</dt><dd>${o.media_files} failų · ${esc(bytes(o.media_bytes))}</dd></div>
      </dl></div>
      ${orphan ? `<div class="adCardV72 adNoteV72"><div><strong>Likę failai be savininko</strong><small>${S.orphans.files} failų · ${esc(bytes(S.orphans.bytes))} – liko ištrynus paskyras</small></div><button type="button" class="adBtnV72" data-ad-orphans>Išvalyti</button></div>` : ""}`;
  }
  const FILTERS = [
    ["all", "Visi"],
    ["trial", "Bandomasis"],
    ["paid", "Mokantys"],
    ["comped", "Nemokami"],
    ["issue", "Problemos"]
  ];
  function filtered() {
    const q = S.q.trim().toLowerCase();
    return S.users.filter(u => {
      if (q && !`${u.email} ${u.profile_name || ""}`.toLowerCase().includes(q)) return false;
      switch (S.filter) {
        case "trial":
          return !u.comped && u.status === "trialing";
        case "paid":
          return !u.comped && u.status === "active";
        case "comped":
          return u.comped;
        case "issue":
          return (
            u.banned ||
            (!u.comped &&
              ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "none"].includes(
                u.status
              ))
          );
        default:
          return true;
      }
    });
  }
  function usersHTML() {
    return `<div class="adSearchV72">${svg("search", 18)}<input type="search" id="adSearchV72" placeholder="Ieškoti pagal el. paštą ar pavadinimą" value="${esc(S.q)}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div class="adChipsV72" role="group" aria-label="Filtrai">${FILTERS.map(([k, l]) => `<button type="button" class="${S.filter === k ? "is-on" : ""}" data-ad-filter="${k}">${l}</button>`).join("")}</div>
      <div class="adListV72" id="adUserListV72">${userListInner()}</div>`;
  }
  function userListInner() {
    const list = filtered();
    return list.length ? list.map(userRow).join("") : '<p class="adEmptyV72">Nieko nerasta.</p>';
  }
  const ACTION_LT = {
    set_comped: d => (d.value ? "Suteikta nemokama prieiga" : "Nemokama prieiga panaikinta"),
    set_banned: d => (d.value ? "Paskyra užblokuota" : "Paskyra atblokuota"),
    send_reset: () => "Išsiųsta slaptažodžio atkūrimo nuoroda",
    cancel_subscription: d =>
      d.mode === "now" ? "Prenumerata atšaukta iš karto" : "Prenumerata bus atšaukta periodo pabaigoje",
    resume_subscription: () => "Prenumerata atnaujinta",
    extend_trial: d => `Bandomasis pratęstas ${d.days} d.`,
    delete_user: d => `Paskyra ištrinta (failų: ${d.mediaRemoved ?? 0})`,
    cleanup_orphans: d => `Išvalyta failų: ${d.removed ?? 0}`
  };
  function activityHTML() {
    if (!S.audit.length) return '<p class="adEmptyV72">Administratoriaus veiksmų dar nebuvo.</p>';
    return `<div class="adListV72 adLogV72">${S.audit
      .map(a => {
        const f = ACTION_LT[a.action];
        return `<div class="adLogRowV72"><strong>${esc(f ? f(a.detail || {}) : a.action)}</strong><small>${esc(a.target_email || "visa sistema")} · ${esc(dateTimeLT(a.at))}</small></div>`;
      })
      .join("")}</div>`;
  }
  function detailHTML(u) {
    const st = statusOf(u);
    const stripeLink = u.stripe_customer_id
      ? `<a class="adLinkV72" href="https://dashboard.stripe.com/customers/${esc(u.stripe_customer_id)}" target="_blank" rel="noopener">Atidaryti Stripe ${svg("ext", 14)}</a>`
      : "";
    const td = inDays(u.trial_end);
    const rows = [["Būsena", badge(st)]];
    if (u.banned) rows.push(["Paskyra", badge(["Užblokuota", "bad"])]);
    if (!u.comped && u.status === "trialing")
      rows.push([
        "Bandomasis iki",
        `${esc(dateLT(u.trial_end))}${td != null ? ` <small>(${td} d.)</small>` : ""}`
      ]);
    if (!u.comped && u.current_period_end && u.status !== "trialing")
      rows.push([
        u.cancel_at_period_end ? "Galioja iki" : "Kitas mokėjimas",
        esc(dateLT(u.current_period_end))
      ]);
    if (u.cancel_at_period_end && !u.comped) rows.push(["Atnaujinimas", "Išjungtas"]);
    rows.push(["Prieiga", u.access ? "Yra" : "Tik peržiūra"]);
    const subActs = [];
    if (u.stripe_subscription_id) {
      if (u.status === "trialing")
        subActs.push(
          '<button type="button" class="adBtnV72" data-ad-do="extend">Pratęsti bandomąjį +7 d.</button>'
        );
      if (["trialing", "active", "past_due"].includes(u.status)) {
        subActs.push(
          u.cancel_at_period_end
            ? '<button type="button" class="adBtnV72" data-ad-do="resume">Atnaujinti prenumeratą</button>'
            : '<button type="button" class="adBtnV72" data-ad-do="cancel_end">Atšaukti periodo pabaigoje</button>'
        );
        subActs.push(
          '<button type="button" class="adBtnV72 is-danger" data-ad-do="cancel_now">Atšaukti iš karto</button>'
        );
      }
    }
    return `<div class="adHeroV72"><span class="adAvV72 is-lg">${esc((u.email || "?")[0].toUpperCase())}</span>
        <div><strong>${esc(u.profile_name || u.email)}</strong><small>${esc(u.email)}${u.profile_type ? ` · ${u.profile_type === "company" ? "Įmonė" : "Fizinis asmuo"}` : ""}</small></div></div>
      <h4 class="adSecV72">Prenumerata</h4>
      <div class="adCardV72"><dl class="adDlV72">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        <div class="adActsV72">
          <button type="button" class="adBtnV72" data-ad-do="comped">${u.comped ? "Panaikinti nemokamą prieigą" : "Suteikti nemokamą prieigą"}</button>
          ${subActs.join("")}
        </div>${stripeLink ? `<p class="adFootV72">${stripeLink}</p>` : ""}
      </div>
      <h4 class="adSecV72">Naudojimas</h4>
      <div class="adCardV72"><dl class="adDlV72">
        <div><dt>Automobiliai</dt><dd>${u.cars}</dd></div>
        <div><dt>Variantai</dt><dd>${u.leads}</dd></div>
        <div><dt>Failai</dt><dd>${u.media_files} · ${esc(bytes(u.media_bytes))}</dd></div>
        <div><dt>Duomenys atnaujinti</dt><dd>${esc(ago(u.state_updated_at))}</dd></div>
        <div><dt>Registracija</dt><dd>${esc(dateLT(u.created_at))}</dd></div>
        <div><dt>Paskutinis prisijungimas</dt><dd>${esc(dateTimeLT(u.last_sign_in_at))}</dd></div>
        <div><dt>El. paštas patvirtintas</dt><dd>${u.confirmed ? "Taip" : "Ne"}</dd></div>
      </dl></div>
      <h4 class="adSecV72">Paskyra</h4>
      <div class="adCardV72"><div class="adActsV72">
        <button type="button" class="adBtnV72" data-ad-do="reset">Siųsti slaptažodžio atkūrimą</button>
        <button type="button" class="adBtnV72" data-ad-do="ban">${u.banned ? "Atblokuoti paskyrą" : "Užblokuoti paskyrą"}</button>
        <button type="button" class="adBtnV72 is-danger" data-ad-do="delete">Ištrinti paskyrą</button>
      </div><p class="adFootV72">Užblokuotas vartotojas nebegali prisijungti (galiojanti sesija baigiasi per valandą). Ištrynus pašalinami duomenys, failai ir Stripe prenumerata.</p></div>`;
  }
  function paint() {
    if (!S.open) return;
    const inDetail = !!S.detail;
    const u = inDetail ? S.users.find(x => x.id === S.detail) : null;
    if (inDetail && !u) S.detail = null;
    const det = S.detail ? u : null;
    backBtn.hidden = !det;
    tabsEl.hidden = !!det;
    titleEl.textContent = det ? "Vartotojas" : "Administravimas";
    tabsEl.querySelectorAll("[data-ad-tab]").forEach(b => {
      const on = b.dataset.adTab === S.tab;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
    const keepScroll = body.scrollTop;
    let html;
    if (!S.loaded) {
      html = S.err
        ? `<div class="adStateV72"><p>${esc(S.err)}</p><button type="button" class="adBtnV72" data-ad-refresh>Bandyti dar kartą</button></div>`
        : '<div class="adStateV72"><span class="adSpinV72" aria-hidden="true"></span></div>';
    } else if (det) html = detailHTML(det);
    else if (S.tab === "overview") html = overviewHTML();
    else if (S.tab === "users") html = usersHTML();
    else html = activityHTML();
    const searchFocus = document.activeElement?.id === "adSearchV72";
    body.innerHTML = html;
    if (S.tab === "users" && !det && searchFocus) {
      const i = body.querySelector("#adSearchV72");
      i?.focus();
      i?.setSelectionRange(i.value.length, i.value.length);
    }
    body.scrollTop = keepScroll;
  }

  // ---------- Patvirtinimo langas ----------
  function confirmBox({ title, text, label, danger, needEmail, onConfirm }) {
    const box = document.createElement("div");
    box.className = "adConfirmV72";
    box.innerHTML = `<div class="adConfirmCardV72" role="alertdialog" aria-label="${esc(title)}">
      <strong>${esc(title)}</strong><p>${esc(text)}</p>
      ${needEmail ? `<input type="email" class="adInputV72" placeholder="Įrašykite ${esc(needEmail)}" autocomplete="off" autocapitalize="off" spellcheck="false">` : ""}
      <div class="adConfirmActsV72"><button type="button" class="adBtnV72" data-cf-no>Atšaukti</button><button type="button" class="adBtnV72 ${danger ? "is-solid-danger" : "is-solid"}" data-cf-yes ${needEmail ? "disabled" : ""}>${esc(label)}</button></div></div>`;
    panel.append(box);
    const yes = box.querySelector("[data-cf-yes]");
    const inp = box.querySelector("input");
    inp?.addEventListener(
      "input",
      () => (yes.disabled = inp.value.trim().toLowerCase() !== needEmail.toLowerCase())
    );
    box.addEventListener("click", e => {
      if (e.target === box || e.target.closest("[data-cf-no]")) box.remove();
    });
    yes.addEventListener("click", async () => {
      yes.disabled = true;
      yes.textContent = "Vykdoma…";
      try {
        await onConfirm(inp?.value.trim());
        box.remove();
      } catch (e) {
        box.remove();
        toast(e.message || "Veiksmas nepavyko", true);
      }
    });
    setTimeout(() => (inp || yes).focus({ preventScroll: true }), 50);
  }
  async function run(action, extra, okText) {
    await act(action, extra);
    toast(okText);
    await load(true);
  }
  function doAction(kind) {
    const u = S.users.find(x => x.id === S.detail);
    if (!u) return;
    const id = u.id;
    switch (kind) {
      case "comped":
        return confirmBox({
          title: u.comped ? "Panaikinti nemokamą prieigą?" : "Suteikti nemokamą prieigą?",
          text: u.comped
            ? "Vartotojas turės apmokėti prenumeratą, kad galėtų toliau redaguoti."
            : "Vartotojas galės naudotis visomis funkcijomis nemokėdamas.",
          label: u.comped ? "Panaikinti" : "Suteikti",
          danger: u.comped,
          onConfirm: () =>
            run(
              "set_comped",
              { user_id: id, value: !u.comped },
              u.comped ? "Nemokama prieiga panaikinta" : "Nemokama prieiga suteikta"
            )
        });
      case "extend":
        return confirmBox({
          title: "Pratęsti bandomąjį?",
          text: "Bandomasis laikotarpis pratęsiamas 7 dienomis, mokėjimas nukeliamas.",
          label: "Pratęsti",
          onConfirm: () => run("extend_trial", { user_id: id, days: 7 }, "Bandomasis pratęstas 7 d.")
        });
      case "resume":
        return run("resume_subscription", { user_id: id }, "Prenumerata atnaujinta").catch(e =>
          toast(e.message, true)
        );
      case "cancel_end":
        return confirmBox({
          title: "Atšaukti periodo pabaigoje?",
          text: "Prenumerata galios iki apmokėto laikotarpio pabaigos ir toliau neatsinaujins.",
          label: "Atšaukti",
          danger: true,
          onConfirm: () =>
            run(
              "cancel_subscription",
              { user_id: id, mode: "period_end" },
              "Prenumerata bus atšaukta periodo pabaigoje"
            )
        });
      case "cancel_now":
        return confirmBox({
          title: "Atšaukti iš karto?",
          text: "Prenumerata nutraukiama dabar, vartotojas liks tik peržiūros režime. Pinigai negrąžinami.",
          label: "Atšaukti dabar",
          danger: true,
          onConfirm: () => run("cancel_subscription", { user_id: id, mode: "now" }, "Prenumerata atšaukta")
        });
      case "reset":
        return confirmBox({
          title: "Siųsti atkūrimo nuorodą?",
          text: `Laiškas bus išsiųstas į ${u.email}.`,
          label: "Siųsti",
          onConfirm: () => run("send_reset", { user_id: id }, "Nuoroda išsiųsta")
        });
      case "ban":
        return confirmBox({
          title: u.banned ? "Atblokuoti paskyrą?" : "Užblokuoti paskyrą?",
          text: u.banned
            ? "Vartotojas vėl galės prisijungti."
            : "Vartotojas nebegalės prisijungti. Duomenys išlieka.",
          label: u.banned ? "Atblokuoti" : "Užblokuoti",
          danger: !u.banned,
          onConfirm: () =>
            run(
              "set_banned",
              { user_id: id, value: !u.banned },
              u.banned ? "Paskyra atblokuota" : "Paskyra užblokuota"
            )
        });
      case "delete":
        return confirmBox({
          title: "Ištrinti paskyrą?",
          text: "Bus negrįžtamai pašalinti visi vartotojo duomenys, nuotraukos ir Stripe prenumerata. Veiksmo atšaukti negalima.",
          label: "Ištrinti visam laikui",
          danger: true,
          needEmail: u.email,
          onConfirm: async email => {
            await act("delete_user", { user_id: id, confirm_email: email });
            S.detail = null;
            toast("Paskyra ištrinta");
            await load(true);
          }
        });
    }
  }

  // ---------- Atidarymas / uždarymas ----------
  let closeTimer = 0,
    lastFocus = null;
  function open() {
    if (!isAdmin) return;
    clearTimeout(closeTimer);
    S.open = true;
    lastFocus = document.activeElement;
    host.hidden = false;
    document.documentElement.classList.add("aeAdOpenV72");
    paint();
    void panel.offsetHeight;
    host.classList.add("is-open");
    load(S.loaded);
  }
  function close() {
    if (!S.open) return;
    S.open = false;
    host.classList.remove("is-open");
    panel.style.transform = "";
    document.documentElement.classList.remove("aeAdOpenV72");
    panel.querySelectorAll(".adConfirmV72").forEach(n => n.remove());
    closeTimer = setTimeout(() => {
      host.hidden = true;
      body.innerHTML = "";
      lastFocus?.isConnected && lastFocus.focus?.({ preventScroll: true });
    }, 280);
  }
  fab.addEventListener("click", open);
  host.addEventListener("click", e => {
    const t = e.target;
    if (t.closest("[data-ad-close]")) return close();
    if (t.closest("[data-ad-back]")) {
      S.detail = null;
      return paint();
    }
    if (t.closest("[data-ad-refresh]")) {
      load(false);
      return;
    }
    const tab = t.closest("[data-ad-tab]");
    if (tab) {
      S.tab = tab.dataset.adTab;
      S.detail = null;
      body.scrollTop = 0;
      return paint();
    }
    const f = t.closest("[data-ad-filter]");
    if (f) {
      S.filter = f.dataset.adFilter;
      return paint();
    }
    const u = t.closest("[data-ad-user]");
    if (u) {
      S.detail = u.dataset.adUser;
      body.scrollTop = 0;
      return paint();
    }
    const d = t.closest("[data-ad-do]");
    if (d) return doAction(d.dataset.adDo);
    if (t.closest("[data-ad-orphans]"))
      return confirmBox({
        title: "Išvalyti likusius failus?",
        text: "Bus ištrinti failai, kurių savininkų paskyros jau nebeegzistuoja.",
        label: "Išvalyti",
        danger: true,
        onConfirm: async () => {
          const r = await act("cleanup_orphans");
          toast(`Išvalyta failų: ${r?.removed ?? 0}`);
          await load(true);
        }
      });
  });
  host.addEventListener("input", e => {
    if (e.target.id === "adSearchV72") {
      S.q = e.target.value;
      const l = body.querySelector("#adUserListV72");
      if (l) l.innerHTML = userListInner();
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && S.open) {
      const cf = panel.querySelector(".adConfirmV72");
      if (cf) cf.remove();
      else if (S.detail) {
        S.detail = null;
        paint();
      } else close();
    }
  });
  // Braukimas žemyn uždaro langą (tik nuo viršaus)
  let drag = null;
  panel.addEventListener(
    "touchstart",
    e => {
      if (e.target.closest(".adBodyV72") && body.scrollTop > 0) return;
      if (!e.target.closest(".adGrabV72, .adHeadV72, .adTabsV72") && body.scrollTop > 0) return;
      drag = {
        y: e.touches[0].clientY,
        dy: 0,
        t: Date.now(),
        on: !!e.target.closest(".adGrabV72, .adHeadV72, .adTabsV72")
      };
    },
    { passive: true }
  );
  panel.addEventListener(
    "touchmove",
    e => {
      if (!drag || !drag.on) return;
      drag.dy = e.touches[0].clientY - drag.y;
      if (drag.dy > 0) panel.style.transform = `translateY(${drag.dy}px)`;
    },
    { passive: true }
  );
  const endDrag = () => {
    if (!drag) return;
    const v = drag.dy / Math.max(1, Date.now() - drag.t);
    if (drag.on && (drag.dy > 110 || (drag.dy > 40 && v > 0.55))) close();
    else panel.style.transform = "";
    drag = null;
  };
  panel.addEventListener("touchend", endDrag);
  panel.addEventListener("touchcancel", endDrag);

  // ---------- Paskyros įvykiai ----------
  function setAdmin(email) {
    isAdmin = String(email || "").toLowerCase() === ADMIN_EMAIL;
    fab.hidden = !isAdmin;
    if (isAdmin) load(true);
  }
  window.addEventListener("autoeasier:account-ready", e => setAdmin(e.detail?.user?.email));
  window.addEventListener("autoeasier:signed-out", () => {
    isAdmin = false;
    fab.hidden = true;
    S.loaded = false;
    S.users = [];
    S.detail = null;
    close();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isAdmin && S.open) load(true);
  });
  window.AUTOEASIER_ADMIN = { open, close, _state: S, _setAdmin: setAdmin };
})();
