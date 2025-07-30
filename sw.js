// Service Worker for CNC Job Log PWA
const CACHE_NAME = 'cnc-job-log-v4';
const urlsToCache = [
  '/cnc-webapp/',
  '/cnc-webapp/index.html',
  '/cnc-webapp/styles/main.css',
  '/cnc-webapp/styles/components.css',
  '/cnc-webapp/styles/responsive.css',
  '/cnc-webapp/scripts/app.js',
  '/cnc-webapp/scripts/ui-manager.js',
  '/cnc-webapp/scripts/form-handlers.js',
  '/cnc-webapp/scripts/data-validators.js',
  '/cnc-webapp/scripts/qr-scanner.js',
  '/cnc-webapp/scripts/api-service.js',
  '/cnc-webapp/scripts/config.js',
  '/cnc-webapp/JOBLOG LOGO.png',
  '/cnc-webapp/logo2024-Black.png',
  '/cnc-webapp/manifest.json'
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
            return caches.match('/cnc-webapp/index.html');
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
