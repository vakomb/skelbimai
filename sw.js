// AutoEasier – minimalus service worker: leidžia įdiegti programėlę (telefone, planšetėje, kompiuteryje).
// Nieko nekešuoja – visada rodoma naujausia versija iš serverio.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
