// Service Worker — Skot ERP
// Estrategia: Network First con fallback a caché

const CACHE_NAME = 'skot-erp-v1';
const OFFLINE_URL = '/login';

const PRECACHE_URLS = [
  '/login',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

// Instalación: precachear recursos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network First — si falla, usar caché
self.addEventListener('fetch', (event) => {
  // Solo interceptar requests GET del mismo origen
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  // No interceptar las API routes (deben ir siempre al servidor)
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guardar en caché páginas navegadas exitosamente
        if (response.ok && event.request.destination === 'document') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Sin red: intentar desde caché, fallback a login
        return caches.match(event.request).then(
          (cached) => cached || caches.match(OFFLINE_URL)
        );
      })
  );
});
