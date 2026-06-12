// =============================================================================
// LIGATURE PWA SERVICE WORKER — v0.49.0
// =============================================================================
// Strategy: NETWORK-FIRST for everything.
//
// Why network-first? Because Ligature is a regulatory platform where stale data
// is worse than no data. We use the cache purely as a fallback for when the
// network is unavailable, not as a performance optimization.
//
// Cache strategy:
//   - Navigation requests: Network first, cache fallback to offline page
//   - Static assets (JS/CSS/images): Network first, cache for offline use
//   - API requests: Network only, never cached
//   - Everything else: Network first
//
// Update strategy:
//   - skipWaiting() + clients.claim() for immediate activation
//   - Version-keyed caches for clean upgrades
//   - Old caches deleted on activation
// =============================================================================

const CACHE_VERSION = 'ligature-v0.69.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = '/offline.html';

// Assets to precache for offline shell
const PRECACHE_URLS = [
  OFFLINE_URL,
];

// Patterns that should NEVER be cached
const NEVER_CACHE = [
  /\/api\//,           // API routes
  /\/_next\/data\//,   // Next.js data fetches
  /\/supabase/,        // Supabase calls
  /hotUpdate/,         // HMR in development
  /\.hot-update\./,    // HMR files
  /localhost/,         // Dev server
  /chrome-extension/,  // Browser extensions
];

// Static asset patterns (safe to cache for offline use)
const STATIC_ASSET = /\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot)(\?.*)?$/;

// ============================================================================
// INSTALL — Precache offline page
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v0.67.11');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ============================================================================
// ACTIVATE — Clean old caches, claim clients
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v0.67.11');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================================
// FETCH — Network-first with cache fallback
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip requests that should never be cached
  if (NEVER_CACHE.some(pattern => pattern.test(url.href))) return;

  // Skip cross-origin requests (except CDN assets)
  if (url.origin !== self.location.origin && !url.href.includes('cdnjs.cloudflare.com')) return;

  // Navigation requests — network first, offline page fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets — network first, cache fallback, update cache on success
  if (STATIC_ASSET.test(url.pathname)) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Everything else — network first, no caching
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ============================================================================
// Network-first strategy with cache update
// ============================================================================
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    // Only cache successful responses
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      // Don't await the cache put — return response immediately
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

// ============================================================================
// MESSAGE — Handle skip-waiting from client
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
