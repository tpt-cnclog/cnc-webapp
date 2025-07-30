// Service Worker for CNC Job Log PWA
const CACHE_NAME = 'cnc-job-log-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles/main.css',
  './styles/components.css',
  './styles/responsive.css',
  './scripts/app.js',
  './scripts/ui-manager.js',
  './scripts/form-handlers.js',
  './scripts/data-validators.js',
  './scripts/qr-scanner.js',
  './scripts/api-service.js',
  './scripts/config.js',
  './JOBLOG LOGO.png',
  './logo2024-Black.png',
  './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
