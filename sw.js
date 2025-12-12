// Winn-Pro Service Worker v3
// Smart caching with reliable updates

const CACHE_VERSION = 'v3';
const CACHE_NAME = 'winnpro-' + CACHE_VERSION;

const PRECACHE_ASSETS = ['/offline.html'];

self.addEventListener('install', function(event) {
  console.log('[SW] Installing:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(PRECACHE_ASSETS); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key.startsWith('winnpro-') && key !== CACHE_NAME;
        }).map(function(key) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);
  
  if (request.method !== 'GET') return;
  if (url.hostname.includes('firebase')) return;
  if (url.hostname.includes('googleapis')) return;
  
  if (request.destination === 'document' || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(request).catch(function() {
        if (request.destination === 'document') {
          return caches.match('/offline.html');
        }
      })
    );
    return;
  }
  
  if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
