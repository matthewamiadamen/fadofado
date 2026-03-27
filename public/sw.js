const CACHE_NAME = 'lamha-v2';
const MODULE_CACHE = 'lamha-modules-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/isl_abcs.png',
  '/mediapipe/camera_utils.js',
  '/mediapipe/hands/hands.js',
  '/mediapipe/hands/hands.binarypb',
  '/mediapipe/hands/hands_solution_packed_assets.data',
  '/mediapipe/hands/hands_solution_packed_assets_loader.js',
  '/mediapipe/hands/hands_solution_simd_wasm_bin.js',
  '/mediapipe/hands/hands_solution_simd_wasm_bin.wasm',
  '/mediapipe/hands/hands_solution_wasm_bin.js',
  '/mediapipe/hands/hands_solution_wasm_bin.wasm',
  '/mediapipe/hands/hand_landmark_full.tflite',
  '/mediapipe/hands/hand_landmark_lite.tflite',
];

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches (keep MODULE_CACHE)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== MODULE_CACHE)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Listen for messages from the app (e.g., cache last-used module assets)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MODULE_ASSETS') {
    const urls = event.data.urls || [];
    if (urls.length > 0) {
      caches.open(MODULE_CACHE).then((cache) => {
        urls.forEach((url) => {
          cache.add(url).catch(() => {
            // Silently ignore individual cache failures
          });
        });
      });
    }
  }
});

// Fetch handler with per-resource caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Navigation requests (HTML): network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match('/'))
    );
    return;
  }

  // Vite-hashed assets (/assets/*): stale-while-revalidate
  // These have content hashes in filenames so cached versions are safe to serve
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // MediaPipe model files: cache-first (large, rarely change)
  if (url.pathname.startsWith('/mediapipe/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // All other same-origin: cache-first with network update
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
