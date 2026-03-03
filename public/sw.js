// Service worker for Sonor PWA
// Controls page and start_url for add-to-homescreen, offline, and splash screen support

const CACHE_VERSION = 'portal-v1';
const CACHE_NAME = `portal-${CACHE_VERSION}`;

const START_URL = '/';
const STATIC_ASSETS = [START_URL, '/site.webmanifest', '/favicon.svg', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n.startsWith('portal-') && n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Control the page and start_url: respond to navigation requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  // Navigation (page load and start_url) — network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(START_URL)))
    );
    return;
  }

  // Static assets — cache first
  if (STATIC_ASSETS.some((path) => url.pathname === path || url.pathname === path + '/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }))
    );
  }
});
