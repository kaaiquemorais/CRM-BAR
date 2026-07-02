const CACHE = 'barcrm-v1';
const PRECACHE = [
  '/login.html',
  '/dashboard.html',
  '/pedidos.html',
  '/estoque.html',
  '/contas.html',
  '/fiados.html',
  '/css/style.css',
  '/js/auth.js',
  '/js/data.js',
  '/js/nav.js',
  '/js/reauth.js',
  '/logo.png',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: sempre tenta buscar versão nova, cai no cache se offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') return caches.match('/login.html');
      })
    )
  );
});
