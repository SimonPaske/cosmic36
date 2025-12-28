/* Cosmic 36 — simple offline-first PWA */
const CACHE_NAME = "cosmic36-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./service-worker.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/maskable-192.png",
    "./icons/maskable-512.png"
];

// Install: pre-cache
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
        )
    );
    self.clients.claim();
});

// Fetch: cache-first for local assets, network-first for others
self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) return;

    // Cache-first
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req)
                .then((res) => {
                    // Save new GET responses
                    if (req.method === "GET" && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match("./index.html"));
        })
    );
});