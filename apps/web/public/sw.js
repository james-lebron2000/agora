/**
 * Agora Service Worker
 * Provides offline caching and performance optimizations
 * @version 1.0.0
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `agora-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `agora-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `agora-images-${CACHE_VERSION}`;

// Resources to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/assets/css/',
  '/assets/js/',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, then network for static assets
  cacheFirst: async (request, cacheName) => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      // Return cached version immediately
      // Then update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {});
      
      return cached;
    }
    
    // Not in cache, fetch and cache
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  },

  // Network first, then cache for dynamic content
  networkFirst: async (request, cacheName, timeout = 5000) => {
    const cache = await caches.open(cacheName);
    
    try {
      // Try network with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Cache successful responses
        cache.put(request, response.clone());
        return response;
      }
    } catch (error) {
      console.log('[SW] Network failed, trying cache:', request.url);
    }
    
    // Return cached version if available
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    throw new Error('Network and cache both failed');
  },

  // Stale while revalidate for images
  staleWhileRevalidate: async (request, cacheName) => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    // Always fetch new version in background
    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => cached);
    
    // Return cached immediately if available
    if (cached) {
      return cached;
    }
    
    // Otherwise wait for fetch
    return fetchPromise;
  }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !name.includes(CACHE_VERSION))
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except for our API)
  if (!url.origin.includes(self.location.origin) && 
      !url.href.includes('45.32.219.241')) {
    return;
  }

  // Handle different resource types
  if (isStaticAsset(url)) {
    // Cache-first for static assets
    event.respondWith(
      CACHE_STRATEGIES.cacheFirst(request, STATIC_CACHE)
        .catch(() => fallbackResponse(request))
    );
  } else if (isImage(request)) {
    // Stale-while-revalidate for images
    event.respondWith(
      CACHE_STRATEGIES.staleWhileRevalidate(request, IMAGE_CACHE)
        .catch(() => fallbackResponse(request))
    );
  } else if (isAPI(request)) {
    // Network-first with timeout for API calls
    event.respondWith(
      CACHE_STRATEGIES.networkFirst(request, DYNAMIC_CACHE, 3000)
        .catch(() => fallbackResponse(request))
    );
  } else {
    // Default: try network, fallback to cache
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            // Cache successful responses
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cached => cached || fallbackResponse(request));
        })
    );
  }
});

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|html|json|svg|woff2?|ttf)$/) ||
         url.pathname.includes('/assets/');
}

function isImage(request) {
  return request.destination === 'image' ||
         request.headers.get('Accept')?.startsWith('image/');
}

function isAPI(request) {
  return request.url.includes('/relay') ||
         request.url.includes('45.32.219.241') ||
         request.url.includes('/api/');
}

// Fallback response for offline
async function fallbackResponse(request) {
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    const cache = await caches.open(STATIC_CACHE);
    const offlinePage = await cache.match('/index.html');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // Return offline image for image requests
  if (isImage(request)) {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f1f5f9" width="100" height="100"/></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  // Return JSON error for API requests
  if (isAPI(request)) {
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Generic error
  return new Response('Offline', { status: 503 });
}

// Background sync for deferred actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Process any queued requests
  console.log('[SW] Background sync triggered');
}

// Push notifications (prepared for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'agora-notification',
    requireInteraction: false,
    actions: data.actions || [],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Agora', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  let url = '/';
  
  if (notificationData?.url) {
    url = notificationData.url;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  console.log('[SW] Periodic sync triggered');
  // Update cached content in background
}

console.log('[SW] Service Worker loaded');
