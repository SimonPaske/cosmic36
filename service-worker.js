const CACHE_NAME = "cosmic36-v21"; // ✅ bump this every deploy

const ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./service-worker.js",
    "./assets/style.css",
    "./assets/app.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/maskable-192.png",
    "./icons/maskable-512.png"
];

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(ASSETS);
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // ✅ Network-first for navigations (keeps index.html fresh)
    if (req.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const networkResp = await fetch(req);
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(req, networkResp.clone());
                    return networkResp;
                } catch {
                    return (
                        (await caches.match(req)) ||
                        (await caches.match("./index.html")) ||
                        (await caches.match("./"))
                    );
                }
            })()
        );
        return;
    }

    // ✅ Cache-first for static assets
    event.respondWith(
        (async () => {
            const cached = await caches.match(req);
            if (cached) return cached;

            try {
                const res = await fetch(req);
                if (req.method === "GET" && res.ok) {
                    const copy = res.clone();
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(req, copy);
                }
                return res;
            } catch {
                return caches.match("./index.html");
            }
        })()
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        (async () => {
            const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            for (const client of allClients) {
                if ("focus" in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow("./");
        })()
    );
});
