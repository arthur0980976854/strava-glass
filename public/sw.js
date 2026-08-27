/* Plan's — service worker (PWA).
 * Minimal: enables installability, keeps the app usable on flaky networks
 * by caching successful same-origin GETs and falling back to the cache.
 * API calls (/api/*) are intentionally not cached. */
const CACHE = "plans-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(request);
        if (fresh.ok && fresh.type === "basic") cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(request);
        return cached || Response.error();
      }
    })(),
  );
});
