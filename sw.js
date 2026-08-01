const CACHE_NAME = "sydney-course-finder-app-v65";
const ROUTE_FALLBACKS = {
  "/": "/index.html",
  "/index": "/index.html",
  "/tools": "/tools.html",
  "/help": "/help.html",
  "/tafe-tools": "/tafe-tools.html",
  "/guide": "/guide.html",
  "/pathways": "/pathways.html",
  "/no-atar": "/pathways.html",
  "/atar-calculator": "/atar-calculator.html",
  "/calculator": "/calculator.html",
  "/subject-helper": "/subject-helper.html",
  "/subjects": "/subjects.html",
  "/advisor": "/advisor.html",
  "/my-plan": "/my-plan.html",
  "/plan": "/my-plan.html"
};
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/theme.js",
  "/asset-refresh-v64.js",
  "/course-details.js",
  "/app.js",
  "/tools.html",
  "/tools-page.js",
  "/help.html",
  "/help.js",
  "/tafe-tools.html",
  "/tafe-tools.js",
  "/uac-courses-lite.js",
  "/tafe-courses.js",
  "/manifest.webmanifest",
  "/assets/logo-light.svg",
  "/assets/logo-dark.svg",
  "/assets/favicon-light.svg",
  "/assets/favicon-dark.svg",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/app-icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationCacheFirstExact(request, navigationFallback(url)));
    return;
  }

  if (isAppShellAsset(url)) {
    event.respondWith(cacheFirstThenRefresh(request));
    event.waitUntil(refreshCache(request).catch(() => undefined));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function isAppShellAsset(url) {
  return [".html", ".js", ".css", ".json", ".webmanifest"].some((extension) => url.pathname.endsWith(extension));
}

function navigationFallback(url) {
  if (ROUTE_FALLBACKS[url.pathname]) return ROUTE_FALLBACKS[url.pathname];
  if (url.pathname.endsWith(".html")) {
    const cleanPath = url.pathname.replace(/\.html$/, "") || "/";
    return ROUTE_FALLBACKS[cleanPath] || (APP_SHELL.includes(url.pathname) ? url.pathname : "/index.html");
  }
  return APP_SHELL.includes(url.pathname) ? url.pathname : "/index.html";
}

async function cacheFirstThenRefresh(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const fallback = fallbackUrl ? await cache.match(fallbackUrl) : undefined;
  if (fallback) return fallback;

  try {
    return await refreshCache(request);
  } catch {
    return new Response("This page is not available offline yet.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const fallback = fallbackUrl ? await cache.match(fallbackUrl) : undefined;
    if (fallback) return fallback;
    return new Response("This page is not available offline yet.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function navigationCacheFirstExact(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    refresh.catch(() => undefined);
    return cached;
  }

  const fresh = await refresh;
  if (fresh) return fresh;
  const fallback = fallbackUrl ? await cache.match(fallbackUrl, { ignoreSearch: true }) : undefined;
  if (fallback) return fallback;
  return new Response("This page is not available offline yet.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}

async function refreshCache(request) {
  const cache = await caches.open(CACHE_NAME);
  const fresh = await fetch(request);
  if (fresh && fresh.ok) await cache.put(request, fresh.clone());
  return fresh;
}
