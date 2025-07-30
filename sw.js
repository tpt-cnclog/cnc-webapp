// Service Worker for CNC Job Log PWA
const CACHE_NAME = 'cnc-job-log-v3';
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

// Fetch event - serve cached content when offline, with fallback to index.html for navigation
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // For navigation requests, try to fetch, then fallback to index.html
        if (event.request.mode === 'navigate') {
          return fetch(event.request).catch(function() {
            return caches.match('./index.html');
          });
        }
        
        // For other requests, just try to fetch
        return fetch(event.request);
      })
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
