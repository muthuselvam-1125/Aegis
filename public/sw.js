const CACHE = "aegis-v1";
const APP_SHELL = ["/", "/alerts", "/map", "/places", "/prepare", "/lite", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // True Offline mode enabled for testing locally
  // if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
  //   return;
  // }

  // Network-first for API + pages so data stays fresh; fall back to cache
  // (last-known data) when the network is degraded or offline.
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/lite").then(lite => lite || new Response('Offline', { status: 503 }))))
    );
    return;
  }
  // Bypass cache completely for Next.js internal / development assets
  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(fetch(request));
    return;
  }

  // Cache-first for other static assets.
  e.respondWith(caches.match(request).then((r) => r || fetch(request)));
});
