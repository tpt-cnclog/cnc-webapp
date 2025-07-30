// Simple Service Worker for PWA
const CACHE_NAME = 'cnc-job-log-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
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
  './logo2024-Black.png'
];

// Install event
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request);
      }
    )
  );
});
