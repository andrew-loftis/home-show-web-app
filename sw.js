// WinnPro Shows Service Worker v7
// Smart caching with reliable updates

const CACHE_VERSION = 'v7';
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

// ==========================================
// Push Notifications Handler
// ==========================================

// Handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[SW] Push received');
  
  let notificationData = {
    title: 'WinnPro Shows',
    body: 'You have a new notification',
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'default',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      console.log('[SW] Push payload:', payload);
      
      // FCM sends notification and data separately
      if (payload.notification) {
        notificationData.title = payload.notification.title || notificationData.title;
        notificationData.body = payload.notification.body || notificationData.body;
        notificationData.icon = payload.notification.icon || notificationData.icon;
        notificationData.badge = payload.notification.badge || notificationData.badge;
        notificationData.tag = payload.notification.tag || notificationData.tag;
      }
      
      // Merge any additional data
      if (payload.data) {
        notificationData.data = payload.data;
      }
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    renotify: true,
    requireInteraction: notificationData.data?.type === 'payment_received' || 
                        notificationData.data?.type === 'invoice_sent' ||
                        notificationData.data?.type === 'new_lead',
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: getNotificationActions(notificationData.data?.type)
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Get contextual actions based on notification type
function getNotificationActions(type) {
  switch (type) {
    case 'payment_received':
    case 'invoice_sent':
      return [
        { action: 'view', title: 'View Details', icon: '/assets/icons/eye.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/icons/close.png' }
      ];
    case 'new_lead':
      return [
        { action: 'view', title: 'View Lead', icon: '/assets/icons/eye.png' },
        { action: 'dismiss', title: 'Later', icon: '/assets/icons/close.png' }
      ];
    case 'vendor_approved':
      return [
        { action: 'view', title: 'Go to Dashboard', icon: '/assets/icons/dashboard.png' }
      ];
    default:
      return [];
  }
}

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Handle specific actions
  if (event.action === 'dismiss') {
    return;
  }
  
  // Determine URL to open
  let targetUrl = '/';
  
  if (event.notification.data) {
    const data = event.notification.data;
    
    // Use the click_action or url from data
    if (data.click_action) {
      targetUrl = data.click_action;
    } else if (data.url) {
      targetUrl = data.url;
    } else {
      // Default URLs based on notification type
      switch (data.type) {
        case 'payment_received':
        case 'invoice_sent':
        case 'vendor_approved':
        case 'booth_assigned':
          targetUrl = '/vendor-dashboard';
          break;
        case 'new_lead':
          targetUrl = '/vendor-leads';
          break;
        case 'schedule_change':
        case 'event_reminder':
          targetUrl = '/schedule';
          break;
        default:
          targetUrl = '/';
      }
    }
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if app is already open
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Navigate to the target URL
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl
            });
            return;
          }
        }
        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close (for analytics if needed)
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed');
});
