// Kill Switch Service Worker
// This SW immediately unregisters itself and clears all caches

self.addEventListener('install', function(event) {
  console.log('[SW-Kill] Installing kill switch...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW-Kill] Activating - clearing all caches...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[SW-Kill] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.navigate(client.url);
      });
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
