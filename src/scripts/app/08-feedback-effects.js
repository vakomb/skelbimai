// Grįžtamasis ryšys: toast, garsas, vibracija, pardavimo pelno pranešimas.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function toast(msg, icon = "•") {
  const wrap = document.getElementById("toastWrap");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span>${escapeHTML(msg)}</span><strong>${escapeHTML(icon)}</strong>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(10px) scale(.98)";
  }, 1600);
  setTimeout(() => el.remove(), 2e3);
}
function pulse(sel) {
  const el = typeof sel === "string" ? document.querySelector(sel) : sel;
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
  setTimeout(() => el.classList.remove("pulse"), 560);
}
function spark(emoji = "✨") {
  const count = 8;
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight * 0.52;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "spark";
    s.textContent = emoji;
    s.style.left = startX + (Math.random() * 240 - 120) + "px";
    s.style.top = startY + (Math.random() * 100 - 50) + "px";
    s.style.animationDelay = Math.random() * 0.12 + "s";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}
function vibrate(pattern) {
  if (!state.vibrate || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}
let audioCtx;
function playTone(freq = 440, dur = 0.09) {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
function closeSaleModal() {
  const modal = document.getElementById("saleModal");
  if (modal) modal.remove();
}
function playCashRegisterSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(1e-4, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
    master.gain.exponentialRampToValueAtTime(1e-4, now + 0.48);
    master.connect(ctx.destination);
    [520, 740, 1040, 1380].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 3 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.075);
      gain.gain.setValueAtTime(1e-4, now + i * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.24, now + i * 0.075 + 0.01);
      gain.gain.exponentialRampToValueAtTime(1e-4, now + i * 0.075 + 0.13);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.15);
    });
    setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, 700);
  } catch (e) {}
}
function showSaleProfitToast(profit, carName) {
  const old = document.getElementById("saleProfitToast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.id = "saleProfitToast";
  el.className = "saleProfitToast";
  const positive = Number(profit || 0) >= 0;
  el.innerHTML = `\n      <div class="saleToastCard">\n        <div class="saleToastIcon">💰</div>\n        <div class="saleToastTitle">PARDUOTA</div>\n        <div class="saleToastCar">${escapeHTML(carName || "Automobilis")}</div>\n        <div class="saleToastProfit ${positive ? "positive" : "negative"}">${positive ? "+" : ""}${moneyFmt(profit)}</div>\n        <div class="saleToastCaption">pardavimo marža</div>\n      </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("hide"), 3400);
  setTimeout(() => el.remove(), 3850);
}
