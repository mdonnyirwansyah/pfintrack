// Legacy service worker — replaced by /serwist/sw.js (Next.js 16 + Turbopack migration).
// This stub self-unregisters and clears its caches so existing clients migrate cleanly.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    } catch {
      // best-effort cleanup; ignore failures
    }
  })());
});
