const CACHE = 'amrkc-2026-v12';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-193.png', './icon-512.png',
  './educator.jpg', './protocols-2026.pdf',
  // Caregiver Signature Form PDF: letterhead + Calibri-metric font subset
  './amr-logo.png', './fonts/KCFormSans-Bold.ttf',
  // Shared signature pad — the caregiver form cannot be signed without it
  './sigpad.js', './sigpad.css',
  // Backend sync — must be cached, or a learner who opens an academy offline
  // loses the outbox that would have carried their completion up later
  './amr-backend.js',
  // Alaris pump training — small, and it gets opened at a bedside handoff
  // where a crew may have no signal and has never opened the page before
  './alaris-pump.html',
  // Medication math — same reason: it gets opened to check a dose, not to browse
  './med-math.html'
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

  // Never cache backend traffic. Writes are POSTs and already skipped above,
  // but auth and REST reads must not be served from a stale cache either —
  // a cached token response or query result would be wrong the moment it
  // was replayed. amr-backend.js handles its own offline behaviour.
  const url = new URL(e.request.url);
  if (/\.supabase\.(co|in)$/.test(url.hostname)) return;

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
