const CACHE = 'amrkc-2026-v3';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-193.png', './icon-512.png',
  './protocols-2026.pdf'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Network-first: always try network, fall back to cache if offline
  e.respondWith(
    fetch(e.request).then(res => {
      // Update cache with fresh response (same-origin + CDN cors responses)
      if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => {
      // Offline fallback — serve from cache; only fall back to the app
      // shell for page navigations, never for scripts/styles/assets
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});

// Notify all open tabs when a new version is available
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
