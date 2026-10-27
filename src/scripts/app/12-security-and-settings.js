// PIN užraktas, nustatymų jungikliai, duomenų trynimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function securityEnabled() {
  return !!(state.security && state.security.enabled && state.security.pinHash);
}
async function pinDigest(pin) {
  const text = "visureigiai-uab:" + String(pin);
  if (window.crypto?.subtle) {
    const payload = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest("SHA-256", payload);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "local-" + (h >>> 0).toString(16).padStart(8, "0");
}
function renderSecuritySettings() {
  state.security = state.security || { enabled: false, pinHash: "" };
  const enabled = securityEnabled(),
    badge = document.getElementById("securityStateBadge"),
    button = document.getElementById("securityPinBtn"),
    lock = document.getElementById("lockNowBtn"),
    status = document.getElementById("securityStatus");
  if (badge) {
    badge.textContent = enabled ? "Įjungta" : "Išjungta";
    badge.classList.toggle("on", enabled);
  }
  if (button) button.textContent = enabled ? "Keisti PIN" : "Nustatyti PIN";
  if (lock) lock.hidden = !enabled;
  if (status)
    status.textContent = enabled
      ? "Užraktas aktyvus. PIN prašomas atidarius programėlę iš naujo."
      : "PIN dar nenustatytas.";
}
function lockApp() {
  if (!securityEnabled()) return;
  const lock = document.getElementById("appLock"),
    pin = document.getElementById("unlockPin"),
    error = document.getElementById("unlockError");
  if (!lock) return;
  if (error) error.textContent = "";
  if (pin) pin.value = "";
  lock.hidden = false;
  lock.setAttribute("aria-hidden", "false");
  document.body.classList.add("appLocked");
  setTimeout(() => pin?.focus(), 80);
}
function unlockApp() {
  const lock = document.getElementById("appLock");
  if (!lock) return;
  lock.hidden = true;
  lock.setAttribute("aria-hidden", "true");
  document.body.classList.remove("appLocked");
}
function openPinSettings() {
  const enabled = securityEnabled();
  openSheet(
    `<div class="sheetHead"><div><span class="securityEyebrow">DUOMENŲ SAUGUMAS</span><h3>${enabled ? "Keisti PIN" : "Nustatyti PIN"}</h3></div><button class="closeBtn" type="button" id="closePinSettings" aria-label="Uždaryti">✕</button></div><form class="companyForm" id="pinSettingsForm" autocomplete="off">${enabled ? '<div class="field"><label for="currentPin">Dabartinis PIN</label><input class="input" id="currentPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required></div>' : ""}<div class="field"><label for="newPin">Naujas PIN</label><input class="input" id="newPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="4–6 skaitmenys" required></div><div class="field"><label for="confirmPin">Pakartokite PIN</label><input class="input" id="confirmPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required></div><p class="pinFormHint">Tai programėlės ekrano užraktas šiame įrenginyje. Jis nepakeičia atsarginės kopijos ar įrenginio apsaugos.</p><div class="companyFormError" id="pinSettingsError" role="alert"></div><button class="btn" type="submit" style="width:100%">${enabled ? "Išsaugoti naują PIN" : "Įjungti PIN užraktą"}</button>${enabled ? '<div class="pinDangerZone"><button class="btn ghost" id="disablePinBtn" type="button" style="width:100%">Išjungti PIN užraktą</button></div>' : ""}</form>`
  );
  document.getElementById("closePinSettings").onclick = closeSheet;
  const form = document.getElementById("pinSettingsForm"),
    error = document.getElementById("pinSettingsError");
  form.onsubmit = async e => {
    e.preventDefault();
    error.textContent = "";
    const current = document.getElementById("currentPin")?.value || "",
      next = document.getElementById("newPin").value,
      confirmPin = document.getElementById("confirmPin").value;
    if (enabled && (await pinDigest(current)) !== state.security.pinHash) {
      error.textContent = "Dabartinis PIN neteisingas.";
      return;
    }
    if (!/^\d{4,6}$/.test(next)) {
      error.textContent = "PIN turi būti 4–6 skaitmenų.";
      return;
    }
    if (next !== confirmPin) {
      error.textContent = "PIN kodai nesutampa.";
      return;
    }
    state.security = { enabled: true, pinHash: await pinDigest(next) };
    if (!saveState()) {
      error.textContent = "Nepavyko išsaugoti nustatymo.";
      return;
    }
    closeSheet();
    renderSecuritySettings();
    toast("PIN užraktas įjungtas", "🔒");
  };
  const disable = document.getElementById("disablePinBtn");
  if (disable)
    disable.onclick = async () => {
      error.textContent = "";
      const current = document.getElementById("currentPin")?.value || "";
      if (!current || (await pinDigest(current)) !== state.security.pinHash) {
        error.textContent = "Įveskite teisingą dabartinį PIN.";
        return;
      }
      state.security = { enabled: false, pinHash: "" };
      saveState();
      closeSheet();
      renderSecuritySettings();
      unlockApp();
      toast("PIN užraktas išjungtas", "🔓");
    };
}
document.getElementById("securityPinBtn").onclick = openPinSettings;
document.getElementById("lockNowBtn").onclick = lockApp;
document.getElementById("unlockForm").onsubmit = async e => {
  e.preventDefault();
  const pin = document.getElementById("unlockPin").value,
    error = document.getElementById("unlockError");
  error.textContent = "";
  if (!/^\d{4,6}$/.test(pin)) {
    error.textContent = "Įveskite 4–6 skaitmenų PIN.";
    return;
  }
  if ((await pinDigest(pin)) !== state.security?.pinHash) {
    error.textContent = "Neteisingas PIN.";
    document.getElementById("unlockPin").select();
    return;
  }
  unlockApp();
};
document.getElementById("themeToggle").onclick = () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  toast(state.theme === "light" ? "Šviesus režimas" : "Tamsus režimas", "🎨");
  saveState();
  render();
};
document.getElementById("soundToggle").onclick = () => {
  state.sound = !state.sound;
  toast(`Garsas ${state.sound ? "įjungtas" : "išjungtas"}`, "🔊");
  saveState();
  render();
};
document.getElementById("vibrateToggle").onclick = () => {
  state.vibrate = !state.vibrate;
  toast(`Vibracija ${state.vibrate ? "įjungta" : "išjungta"}`, "📳");
  saveState();
  render();
};
document.getElementById("resetBtn").onclick = async () => {
  if (
    !window.confirm(
      "Ištrinti visus „Visureigiai, UAB“ įrašus šiame įrenginyje? Prieš tęsdami išsaugokite atsarginę kopiją."
    )
  )
    return;
  try {
    await clearCompanyPhotos();
  } catch (e) {
    toast("Nepavyko ištrinti nuotraukų. Įrašai palikti.");
    return;
  }
  state = defaultState();
  saveState();
  closeSheet();
  render();
  toast("Įmonės įrašai ištrinti");
};
document.getElementById("saveSettingsAccountantEmail").onclick = () => {
  ensureAccounting();
  const input = document.getElementById("settingsAccountantEmail");
  const value = (input?.value || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    toast("Patikrink buhalterės el. paštą", "!");
    input?.focus();
    return;
  }
  state.accounting.email = value;
  saveState();
  toast("Buhalterės el. paštas išsaugotas", "✓");
};
document.getElementById("modalBackdrop").addEventListener("click", e => {
  if (e.target.id === "modalBackdrop") closeSheet();
});
window.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSheet();
});
