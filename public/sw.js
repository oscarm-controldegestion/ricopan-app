// Service Worker - Ricopan
// Versión: se actualiza con cada deploy
const CACHE_VERSION = 'ricopan-v5';
const CACHE_NAME = CACHE_VERSION;

// Al instalar: toma control inmediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Al activar: elimina cachés viejos y toma control de todas las pestañas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Network First para HTML, Cache First para assets estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo manejar requests del mismo origen
  if (url.origin !== location.origin) return;

  // Para HTML: siempre intentar red primero (para obtener nueva versión)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Para assets JS/CSS/imágenes: cache first con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
