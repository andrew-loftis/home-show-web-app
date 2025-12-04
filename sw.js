// HomeShow Service Worker
// Provides offline caching and PWA functionality

const CACHE_NAME = 'homeshow-v1';
const STATIC_CACHE = 'homeshow-static-v1';
const DYNAMIC_CACHE = 'homeshow-dynamic-v1';

// Debug logging (only on localhost)
const DEBUG = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const log = (...args) => DEBUG && console.log('[SW]', ...args);

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/tailwind.css',
  '/css/styles.css',
  '/js/app.js',
  '/js/router.js',
  '/js/store.js',
  '/js/config.js',
  '/js/firebase.js',
  '/js/utils/ui.js',
  '/js/utils/skeleton.js',
  '/js/utils/dom.js',
  '/js/utils/format.js',
  '/js/views/Home.js',
  '/js/views/Vendors.js',
  '/js/views/Cards.js',
  '/js/views/More.js',
  '/js/views/MyCard.js',
  '/assets/splash.svg',
  '/assets/floorplan.svg',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  log('Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        log('Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed for some assets:', err);
        // Don't fail the install if some assets fail
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  log('Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => {
              log('Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Skip Firebase and external API requests (always fetch from network)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('stripe')
  ) {
    return;
  }

  // For navigation requests (HTML), try network first, then cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the new version
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline - serve cached version or offline page
          return caches.match(request)
            .then((cached) => cached || caches.match('/offline.html'));
        })
    );
    return;
  }

  // For static assets, try cache first, then network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          
          return fetch(request)
            .then((response) => {
              // Cache the fetched response
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
              return response;
            });
        })
    );
    return;
  }

  // For other requests, try network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Helper to check if a path is a static asset
function isStaticAsset(pathname) {
  return (
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.json')
  );
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-leads') {
    log('Syncing leads...');
    // Future: sync offline-created leads
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  log('Push notification received');
  
  let data = { title: 'HomeShow', body: 'You have a new notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body || data.notification?.body || 'New notification',
    icon: data.icon || '/assets/icons/icon-192.svg',
    badge: '/assets/icons/icon-192.svg',
    tag: data.tag || 'homeshow-push',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || data.notification?.title || 'HomeShow', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  log('Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open or focus the app
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

log('Service worker loaded');
