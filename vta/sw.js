/* Ventilator Training Academy — service worker
   Cache the app shell so it works offline once installed. */

const CACHE = "vta-pwa-v10";
const ASSETS = [
  "./",
  "./academy.html",
  "./styles.css",
  // Backend sync lives at the repo root, shared with the Field Guide.
  "../amr-backend.js",
  "./figures.js",
  "./figures/ltv-panel.jpg",
  "./figures/course/01-path-of-a-breath.png",
  "./figures/course/02-two-functional-zones.png",
  "./figures/course/03-two-knobs-each.svg",
  "./figures/course/04-dead-space.svg",
  "./figures/course/05-shunt-vs-dead-space.svg",
  "./figures/course/06-compliance-vs-resistance.svg",
  "./figures/course/07-pip-vs-plateau.svg",
  "./figures/course/08-oxyhemoglobin-dissociation-curve.svg",
  "./figures/course/09-type-i-vs-type-ii-respiratory-failure.svg",
  "./figures/course/10-four-capnography-patterns.svg",
  "./figures/course/11-respiratory-failure-progression.svg",
  "./figures/course/12-cpap-vs-bilevel-pressure.svg",
  "./figures/course/13-niv-trial-and-escalation.svg",
  "./figures/course/14-preoxygenation-reservoir.svg",
  "./figures/course/15-predicted-body-weight-and-tidal-volume.svg",
  "./figures/course/16-volume-vs-pressure-targeting.svg",
  "./figures/course/17-ards-baby-lung.png",
  "./figures/course/18-auto-peep-expiratory-flow.svg",
  "./figures/course/19-dope-troubleshooting.svg",
  "./figures/course/20-prehospital-tbi-targets.svg",
  "./figures/course/21-ventilator-transport-readiness.svg",
  "./figures/course/22-ltv1200-circuit-connections.svg",
  "./figures/course/23-ltv1200-internal-battery-indicator.svg",
  "./figures/course/24-ltv1200-alarm-response.svg",
  "./figures/course/25-ltv1200-reading-monitored-data.svg",
  "./figures/course/26-rass-sedation-scale.svg",
  "./figures/course/27-pediatric-ventilation-guardrails.svg",
  "./app.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    // Cache each asset independently: addAll() rejects wholesale if ANY single
    // entry 404s, which would silently leave the app with no offline cache at
    // all. Per-asset puts keep one missing file from breaking the rest.
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
