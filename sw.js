// Simple Service Worker for PWA
const CACHE_NAME = 'cnc-job-log-v5';
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
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the new service worker takes control immediately
  return self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // For Google Apps Script API calls, always fetch from network
  if (url.hostname.includes('script.google.com') || 
      url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For JavaScript files, use network-first strategy to get updates quickly
  if (event.request.url.includes('.js') || 
      event.request.url.includes('backend.js') ||
      event.request.url.includes('/scripts/')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // If we got a response, cache it and return it
          if (response) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseClone);
              });
            return response;
          }
        })
        .catch(function() {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other files, use cache-first strategy
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
