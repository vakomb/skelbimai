// v91: tikslus ekrano aukštis telefone. iPhone (ypač programėlė pradžios ekrane) po klaviatūros ar Safari juostos
// pasikeitimo palieka pasenusius vh/dvh – tada lango apačia (mygtukas „Sukurti sutartį“ ir pan.) atsiduria per žemai,
// o perkrovus vėl viskas gerai. Čia --ae-vh = tikras matomas aukštis (innerHeight), atnaujinamas pasikeitus dydžiui,
// pasukus, grįžus į programą ir paslėpus klaviatūrą; tada ir puslapis grąžinamas į vietą (slenka tik <body>).
// Stilius – styles/198-v91-sheets.css.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

function aeSetVhV91() {
  const h = Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
  if (!h) return;
  const v = h + "px";
  const root = document.documentElement;
  if (root.style.getPropertyValue("--ae-vh") !== v) root.style.setProperty("--ae-vh", v);
}
function aeResetPageScrollV91() {
  // Slenka tik <body>; jei iOS po klaviatūros paliko pasislinkusį patį langą – grąžiname į 0
  const se = document.scrollingElement;
  if (window.scrollY && se && se !== document.body && se.scrollHeight <= window.innerHeight + 2)
    window.scrollTo(0, 0);
}
(() => {
  aeSetVhV91();
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      aeSetVhV91();
    });
  };
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(schedule, 250), { passive: true });
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", () => !document.hidden && setTimeout(schedule, 60));
  // Klaviatūra paslėpta (laukas prarado fokusą, o naujas laukas jo negavo)
  document.addEventListener("focusout", () =>
    setTimeout(() => {
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      aeSetVhV91();
      aeResetPageScrollV91();
    }, 260)
  );
})();
