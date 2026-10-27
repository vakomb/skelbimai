// Kontaktų knyga (grupės, kontaktai).
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function ensureContactBook() {
  if (!state.contactBook || typeof state.contactBook !== "object")
    state.contactBook = { groups: [], contacts: [] };
  if (!Array.isArray(state.contactBook.groups)) state.contactBook.groups = [];
  if (!Array.isArray(state.contactBook.contacts)) state.contactBook.contacts = [];
}
function contactGroupName(id) {
  ensureContactBook();
  return state.contactBook.groups.find(g => g.id === id)?.name || "Kontaktai";
}
function renderContacts() {
  const root = document.getElementById("contactsRoot");
  if (!root) return;
  ensureContactBook();
  const q = (state.ui?.contactsQuery || "").toLocaleLowerCase("lt");
  const groups = state.contactBook.groups,
    contacts = state.contactBook.contacts;
  const cards = groups
    .map((g, gi) => {
      const rows = contacts.filter(
        c => c.groupId === g.id && [c.name, c.phone, c.note].join(" ").toLocaleLowerCase("lt").includes(q)
      );
      if (q && !rows.length) return "";
      return `<section class="contactGroupCard"><div class="contactGroupHead"><div class="contactGroupHeadTitle"><span class="contactGroupIcon">${["🔧", "📞", "🤝", "🏢", "📇"][gi % 5]}</span><div><h3>${escapeHTML(g.name)}</h3><b>${rows.length} kontaktų</b></div></div><div class="contactGroupActions"><button class="contactIconBtn" type="button" data-contact-add="${escapeHTML(g.id)}" aria-label="Pridėti kontaktą">＋</button><button class="contactIconBtn" type="button" data-contact-group-edit="${escapeHTML(g.id)}" aria-label="Keisti temą">✎</button></div></div><div class="contactList">${rows.map(c => `<div class="contactRow"><div><strong>${escapeHTML(c.name)}</strong>${c.phone ? `<span class="phone">${escapeHTML(c.phone)}</span>` : ""}${c.note ? `<span class="note">${escapeHTML(c.note)}</span>` : ""}</div><div class="contactRowActions">${c.phone ? `<a class="contactCall" href="tel:${c.phone.replace(/[^+0-9]/g, "")}" aria-label="Skambinti">📞</a>` : ""}<button class="contactEdit" type="button" data-contact-edit="${escapeHTML(c.id)}" aria-label="Redaguoti">✎</button></div></div>`).join("") || '<div class="accountingEmpty">Kontaktų dar nėra</div>'}</div></section>`;
    })
    .join("");
  const legacy = (state.customers || []).filter(c =>
    [c.name, c.phone, c.interest, c.notes].join(" ").toLocaleLowerCase("lt").includes(q)
  );
  root.innerHTML = `<div class="contactsPage"><div class="contactsHead"><h2>Kontaktai</h2><div class="contactsHeadActions"><button class="btn" type="button" data-contact-new-contact>＋ Pridėti kontaktą</button></div></div><label class="contactsSearch"><span class="ico">⌕</span><input class="input" id="contactsSearchInput" type="search" value="${escapeHTML(state.ui?.contactsQuery || "")}" placeholder="Ieškoti kontaktų"></label>${cards || (!legacy.length ? '<div class="contactsEmpty"><div class="ico">📇</div><strong>Sukurk pirmą kontaktų temą</strong><button class="btn" type="button" data-contact-new-group>＋ Nauja tema</button></div>' : "")}${legacy.length ? `<section class="contactGroupCard"><div class="contactGroupHead"><div class="contactGroupHeadTitle"><span class="contactGroupIcon">👥</span><div><h3>Klientų užklausos</h3><b>${legacy.length}</b></div></div><button class="contactIconBtn" type="button" data-contact-new-client>＋</button></div><div class="contactList">${legacy.map(c => `<div class="contactRow"><div><strong>${escapeHTML(c.name)}</strong>${c.phone ? `<span class="phone">${escapeHTML(c.phone)}</span>` : ""}<span class="note">${escapeHTML(c.interest || c.nextAction || c.stage || "")}</span></div><div class="contactRowActions">${c.phone ? `<a class="contactCall" href="tel:${c.phone.replace(/[^+0-9]/g, "")}">📞</a>` : ""}<button class="contactEdit" type="button" data-contact-client-edit="${escapeHTML(c.id)}">✎</button></div></div>`).join("")}</div></section>` : ""}</div>`;
  const search = document.getElementById("contactsSearchInput");
  if (search)
    search.oninput = () => {
      state.ui = state.ui || {};
      state.ui.contactsQuery = search.value;
      saveState();
      renderContacts();
      requestAnimationFrame(() =>
        document.getElementById("contactsSearchInput")?.focus({ preventScroll: true })
      );
    };
}
function openContactGroup(id = "") {
  ensureContactBook();
  const old = state.contactBook.groups.find(g => g.id === id);
  openSheet(
    `<div class="sheetHead"><h3>${old ? "Keisti temą" : "Nauja kontaktų tema"}</h3><button class="closeBtn" type="button" data-close-contact>✕</button></div><form id="contactGroupForm"><div class="field"><label for="contactGroupName">Pavadinimas</label><input class="input" id="contactGroupName" required maxlength="80" value="${escapeHTML(old?.name || "")}" placeholder="Pvz. Meistrai"></div><button class="btn" type="submit" style="width:100%">Išsaugoti</button>${old ? '<button class="btn danger" id="deleteContactGroup" type="button" style="width:100%;margin-top:10px">Ištrinti temą</button>' : ""}</form>`
  );
  document.getElementById("contactGroupForm").onsubmit = e => {
    e.preventDefault();
    const name = document.getElementById("contactGroupName").value.trim();
    if (!name) return;
    if (old) old.name = name;
    else state.contactBook.groups.push({ id: uid(), name });
    addHistory("Kontaktai", `${old ? "Atnaujinta" : "Sukurta"} tema: ${name}`, "📇");
    saveState();
    closeSheet();
    renderContacts();
  };
  if (old)
    document.getElementById("deleteContactGroup").onclick = () => {
      if (!confirm(`Ištrinti temą „${old.name}“ ir jos kontaktus?`)) return;
      state.contactBook.groups = state.contactBook.groups.filter(g => g.id !== old.id);
      state.contactBook.contacts = state.contactBook.contacts.filter(c => c.groupId !== old.id);
      saveState();
      closeSheet();
      renderContacts();
      toast("Tema ištrinta", "✓");
    };
}
function openContact(groupId, id = "") {
  ensureContactBook();
  const old = state.contactBook.contacts.find(c => c.id === id),
    c = old || { groupId, name: "", phone: "", note: "" };
  const gid = groupId || c.groupId || state.contactBook.groups[0]?.id || "";
  if (!gid) {
    openContactGroup();
    return;
  }
  openSheet(
    `<div class="sheetHead"><h3>${old ? "Kontaktas" : "Naujas kontaktas"}</h3><button class="closeBtn" type="button" data-close-contact>✕</button></div><form id="contactForm"><div class="field"><label>Tema</label><select class="input" id="contactGroupSelect">${state.contactBook.groups.map(g => `<option value="${escapeHTML(g.id)}"${g.id === gid ? " selected" : ""}>${escapeHTML(g.name)}</option>`).join("")}</select></div><div class="field"><label>Pavadinimas / vardas</label><input class="input" id="contactName" required maxlength="120" value="${escapeHTML(c.name)}" placeholder="Pvz. Jonas · BMW meistras"></div><div class="field"><label>Telefonas</label><input class="input" id="contactPhone" type="tel" maxlength="50" value="${escapeHTML(c.phone)}" placeholder="+370"></div><div class="field"><label>Pastaba</label><textarea class="input" id="contactNote" rows="3" maxlength="1000">${escapeHTML(c.note)}</textarea></div><button class="btn" type="submit" style="width:100%">Išsaugoti</button>${old ? '<button class="btn danger" id="deleteContact" type="button" style="width:100%;margin-top:10px">Ištrinti kontaktą</button>' : ""}</form>`
  );
  document.getElementById("contactForm").onsubmit = e => {
    e.preventDefault();
    const next = {
      id: old?.id || uid(),
      groupId: document.getElementById("contactGroupSelect").value,
      name: document.getElementById("contactName").value.trim(),
      phone: document.getElementById("contactPhone").value.trim(),
      note: document.getElementById("contactNote").value.trim()
    };
    if (!next.name) return;
    if (old) Object.assign(old, next);
    else state.contactBook.contacts.unshift(next);
    addHistory("Kontaktai", `${old ? "Atnaujintas" : "Pridėtas"}: ${next.name}`, "📇");
    saveState();
    closeSheet();
    renderContacts();
    toast("Kontaktas išsaugotas", "✓");
  };
  if (old)
    document.getElementById("deleteContact").onclick = () => {
      if (!confirm(`Ištrinti kontaktą „${old.name}“?`)) return;
      state.contactBook.contacts = state.contactBook.contacts.filter(x => x.id !== old.id);
      saveState();
      closeSheet();
      renderContacts();
    };
}
renderCustomers = renderContacts;
document.addEventListener("click", e => {
  if (e.target.closest("[data-contact-new-contact]")) {
    ensureContactBook();
    if (!state.contactBook.groups.length) {
      state.contactBook.groups.push({ id: uid(), name: "Kontaktai" });
      saveState();
    }
    openContact();
    return;
  }
  if (e.target.closest("[data-contact-new-group]")) {
    openContactGroup();
    return;
  }
  const add = e.target.closest("[data-contact-add]");
  if (add) {
    openContact(add.dataset.contactAdd);
    return;
  }
  const ge = e.target.closest("[data-contact-group-edit]");
  if (ge) {
    openContactGroup(ge.dataset.contactGroupEdit);
    return;
  }
  const ce = e.target.closest("[data-contact-edit]");
  if (ce) {
    const c = state.contactBook?.contacts?.find(x => x.id === ce.dataset.contactEdit);
    if (c) openContact(c.groupId, c.id);
    return;
  }
  if (e.target.closest("[data-contact-new-client]")) {
    openCustomer();
    return;
  }
  const le = e.target.closest("[data-contact-client-edit]");
  if (le) {
    openCustomer(le.dataset.contactClientEdit);
    return;
  }
  if (e.target.closest("[data-close-contact]")) {
    closeSheet();
    return;
  }
});
