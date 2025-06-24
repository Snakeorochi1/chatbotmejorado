const CACHE_NAME = 'nutrikick-ai-cache-v3'; // Incremented cache version
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './env-config.js',
  './main.js', // Compiled application code
  './favicon.svg',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdn.tailwindcss.com', // External asset
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', // External asset
  // esm.sh URLs for react, react-dom, @google/genai will be cached at runtime by the fetch handler.
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache. Caching pre-cache assets for version:', CACHE_NAME);
        const promises = PRECACHE_ASSETS.map(url => {
          return cache.add(url).catch(error => {
            console.warn(`Failed to precache ${url}:`, error);
          });
        });
        return Promise.all(promises);
      })
      .then(() => {
        console.log('All pre-cache assets processed for version:', CACHE_NAME);
        return self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      console.log('Old caches cleaned. Service worker activated for version:', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

// Fetch event: Serve cached content or fetch from network
self.addEventListener('fetch', (event) => {
  // Always bypass cache for any googleapis.com calls (covers Gemini, Firestore, etc.)
  if (event.request.url.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first strategy for all other GET requests.
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          if (networkResponse && networkResponse.status === 200) {
            if (responseToCache.type === 'basic' || responseToCache.type === 'default' || responseToCache.type === 'cors') {
                 caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
          }
          return networkResponse;
        }).catch(error => {
          console.warn('Fetching failed for:', event.request.url, error);
          // Optional: return offline page for navigation requests if cache miss and network error
          // if (event.request.mode === 'navigate') { return caches.match('./offline.html'); }
        });
      })
    );
  } else {
    // For non-GET requests, just fetch from network
    event.respondWith(fetch(event.request));
  }
});