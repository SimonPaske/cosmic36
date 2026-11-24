// Cosmic36 PWA Service Worker

const CACHE_VERSION = "v24"; // bump when the ASSETS list changes
const CACHE_NAME = `cosmic36-${CACHE_VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;

// Every file needed to boot the app offline (the full ES module graph).
const ASSETS = [
    "./",
    "./index.html",
    "./privacy.html",
    "./terms.html",
    "./manifest.webmanifest",
    "./assets/style.css",
    "./assets/app.js",
    "./assets/infoContent.js",
    "./assets/core/constants.js",
    "./assets/core/content.js",
    "./assets/core/cycle.js",
    "./assets/core/store.js",
    "./assets/core/time.js",
    "./assets/features/aside.js",
    "./assets/features/backup.js",
    "./assets/features/layout.js",
    "./assets/features/notes.js",
    "./assets/features/notifications.js",
    "./assets/features/pattern-info.js",
    "./assets/features/progress.js",
    "./assets/features/render.js",
    "./assets/features/review.js",
    "./assets/features/settings-ui.js",
    "./assets/settings/settings.js",
    "./assets/ui/confirm.js",
    "./assets/ui/dialog.js",
    "./assets/ui/dom.js",
    "./assets/ui/toast.js",
    "./assets/ui/tooltip.js",
    "./icons/icon.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/maskable-192.png",
    "./icons/maskable-512.png",
];

async function precache() {
    const cache = await caches.open(CACHE_NAME);
    // Bypass the HTTP cache so a new SW never precaches stale files.
    await cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })));
}

async function cleanupOldCaches() {
    const keys = await caches.keys();
    await Promise.all(
        keys.map((k) => (k.startsWith("cosmic36-") && k !== CACHE_NAME ? caches.delete(k) : null))
    );
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            await precache();
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            await cleanupOldCaches();
            await self.clients.claim();
        })()
    );
});

self.addEventListener("message", (event) => {
    if (!event.data) return;
    if (event.data.type === "SKIP_WAITING") self.skipWaiting();
    if (event.data.type === "CLEAR_CACHES") {
        event.waitUntil(
            (async () => {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
            })()
        );
    }
});

// Network-first with a timeout: the page always gets one consistent version of
// the app when online (no mixing old and new modules), and the cached copy when
// offline or on a very slow connection.
async function networkFirst(req, fallbackUrl) {
    const cache = await caches.open(CACHE_NAME);
    const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
    try {
        const res = await Promise.race([network, timeout]);
        if (res) return res;
    } catch {
        // offline: fall through to cache
    }
    const cached =
        (await cache.match(req, { ignoreSearch: true })) ||
        (fallbackUrl && (await cache.match(fallbackUrl)));
    if (cached) return cached;
    // Timed out with nothing cached: keep waiting for the network.
    try {
        return await network;
    } catch {
        return new Response("Offline", { status: 503, statusText: "Offline" });
    }
}

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (req.mode === "navigate") {
        event.respondWith(networkFirst(req, "./index.html"));
        return;
    }

    const isAppCode =
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".webmanifest") ||
        url.pathname.endsWith(".json");
    if (isAppCode) {
        event.respondWith(networkFirst(req));
        return;
    }

    // Images/icons: cache-first, they rarely change.
    event.respondWith(
        (async () => {
            const cached = await caches.match(req);
            if (cached) return cached;
            const res = await fetch(req);
            if (res.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(req, res.clone());
            }
            return res;
        })()
    );
});

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
