const CACHE_NAME = 'savvyowl-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/logo-192.png',
  '/logo-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET, OAuth routes, and auth callbacks
  if (request.method !== 'GET' || request.url.includes('/~oauth') || request.url.includes('/auth/callback')) return;

  // Navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Other requests: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

