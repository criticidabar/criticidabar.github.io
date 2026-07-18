const CACHE = 'cdb-studio-v0.6.0';
const CORE = [
  './', './index.html', './styles.css?v=0.6.0', './app.js?v=0.6.0', './auth.js?v=0.6.0',
  './manifest.webmanifest?v=0.6.0', './assets/logo.png', './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // File dell'app: rete prima, così gli aggiornamenti non restano bloccati nella vecchia cache.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        throw error;
      }
    })());
    return;
  }

  // Risorse esterne (font): cache dopo il primo caricamento.
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) caches.open(CACHE).then(cache => cache.put(event.request, response.clone())).catch(() => {});
    return response;
  })));
});
