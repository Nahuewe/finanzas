// Service worker: deja la app disponible sin conexión.
// - Páginas: red primero (para recibir actualizaciones), caché si no hay conexión.
// - Archivos de la app, librerías y fuentes: caché primero, actualizando en segundo plano.
// - Datos públicos (inflación, dólar): red primero, último dato guardado si no hay conexión.
const CACHE = 'mis-finanzas-v1';
const SHELL = ['./', 'favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

const put = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) caches.open(CACHE).then((c) => c.put(req, res.clone()));
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const networkFirst = req.mode === 'navigate' || url.hostname === 'api.argentinadatos.com';

  if (networkFirst) {
    e.respondWith(fetch(req).then((res) => put(req, res)).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => put(req, res)).catch(() => hit);
      return hit || fresh;
    })
  );
});
