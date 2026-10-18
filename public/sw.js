// FixyStays Service Worker (Option A: Cache-First Static Assets + Network-First Documents)
const CACHE_NAME = 'fixystays-cache-v1';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/logo.png',
  '/manifest.json',
  '/favicon.ico',
];

// 1. Install Event: Pre-cache core shell & take over immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Pre-cache errors shouldn't block SW installation
        console.warn('[SW] Pre-cache warning:', err);
      });
    })
  );
});

// 2. Activate Event: Clean up stale caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intelligent routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // RULE 1: Never intercept non-GET requests (Server Actions, POST/PUT/DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // RULE 2: Never intercept Server Actions or dynamic mutations
  const isServerAction = request.headers.has('next-action') || request.headers.has('x-action');
  if (isServerAction) {
    return;
  }

  // RULE 3: Never cache API routes, Webhooks, or Supabase Auth/REST directly in SW
  const isApiOrAuth = 
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase.co');
  if (isApiOrAuth) {
    return;
  }

  // STRATEGY A: Cache-First for immutable Next.js static assets (_next/static/*)
  // These chunks are content-hashed and immutable. Once cached, they load in 0ms.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // STRATEGY B: Stale-While-Revalidate for images, icons, and fonts
  const isStaticMedia = 
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2|woff|ttf|css)$/i);
  if (isStaticMedia) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // STRATEGY C: Network-First with cache fallback for HTML page navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if network is unavailable/offline
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/');
          });
        })
    );
    return;
  }
});
