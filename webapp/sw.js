const CACHE_NAME = "transit-krama-modular-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/levels.js",
  "./js/audio.js",
  "./js/engine.js",
  "./js/renderer.js",
  "./js/ui.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-alt-192.png",
  "./icons/icon-alt-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
