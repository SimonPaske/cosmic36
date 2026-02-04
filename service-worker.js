// service-worker.js
// Cosmic36 PWA Service Worker — paste whole file

const CACHE_VERSION = "v23"; // ✅ BUMP THIS EVERY DEPLOY
const CACHE_NAME = `cosmic36-${CACHE_VERSION}`;

const ASSETS = [
    "./",
    "./index.html",
    "./privacy.html",
    "./terms.html",
    "./manifest.webmanifest",
    "./service-worker.js",
    "./assets/style.css",
    "./assets/app.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/maskable-192.png",
    "./icons/maskable-512.png",
];

// --- Helpers ---
async function precache() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
}

async function cleanupOldCaches() {
    const keys = await caches.keys();
    await Promise.all(
        keys.map((k) => (k.startsWith("cosmic36-") && k !== CACHE_NAME ? caches.delete(k) : null))
    );
}

// --- Lifecycle ---
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            await precache();
            await self.skipWaiting(); // activate ASAP
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            await cleanupOldCaches();
            await self.clients.claim(); // take control ASAP
        })()
    );
});

// Allow the page to tell SW to activate immediately
self.addEventListener("message", (event) => {
    if (!event.data) return;

    if (event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }

    // Optional: allow clearing caches from the app if you ever need it
    if (event.data.type === "CLEAR_CACHES") {
        event.waitUntil(
            (async () => {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
            })()
        );
    }
});

// --- Fetch strategy ---
// 1) HTML navigations: Network-first (keeps app fresh)
// 2) Static assets (css/js/icons): Stale-while-revalidate (fast + updates in background)
// 3) Other same-origin: Cache-first fallback
self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) return;

    // Network-first for navigations (index.html etc.)
    if (req.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const networkResp = await fetch(req, { cache: "no-store" });
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(req, networkResp.clone());
                    return networkResp;
                } catch (err) {
                    const cached =
                        (await caches.match(req)) ||
                        (await caches.match("./index.html")) ||
                        (await caches.match("./"));
                    if (cached) return cached;
                    throw err;
                }
            })()
        );
        return;
    }

    const isStaticAsset =
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".webmanifest") ||
        url.pathname.endsWith(".json");

    if (isStaticAsset && req.method === "GET") {
        // Stale-while-revalidate
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                const cached = await cache.match(req);

                const fetchPromise = fetch(req)
                    .then((res) => {
                        if (res && res.ok) cache.put(req, res.clone());
                        return res;
                    })
                    .catch(() => null);

                // Return cached immediately if present; otherwise wait for network
                return cached || (await fetchPromise) || (await caches.match("./index.html"));
            })()
        );
        return;
    }

    // Default: cache-first, then network, then offline fallback
    event.respondWith(
        (async () => {
            const cached = await caches.match(req);
            if (cached) return cached;

            try {
                const res = await fetch(req);
                if (req.method === "GET" && res.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(req, res.clone());
                }
                return res;
            } catch {
                return (await caches.match("./index.html")) || new Response("Offline", { status: 503 });
            }
        })()
    );
});

// Notifications (keep if you use them)
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        (async () => {
            const allClients = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });

            for (const client of allClients) {
                if ("focus" in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow("./");
        })()
    );
});