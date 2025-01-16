const CACHE_NAME = 'blessabsen-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/image/blessLogo-192.png',
  '/image/blessLogo-512.png',
  '/sound/notifikasi.mp3'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache dibuka');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Handler dengan perbaikan untuk respons partial
self.addEventListener('fetch', (event) => {
  // Skip permintaan ke Firebase
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('fcmregistrations.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Periksa apakah respons valid untuk di-cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Salin response untuk cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => console.log('Cache error:', error));

            return response;
          });
      })
  );
});

// Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCQcivx48C-jGsHWIOAavZ0uNTwDiAyiEs",
  authDomain: "absensi-a9375.firebaseapp.com",
  projectId: "absensi-a9375",
  storageBucket: "absensi-a9375.firebasestorage.app",
  messagingSenderId: "44035837656",
  appId: "1:44035837656:web:e85d5ad67a8b572ff051ad",
  measurementId: "G-6DPDGCWWZ7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  return self.registration.showNotification(`Pesan dari ${payload.data.from || 'Unknown'}`, {
    body: payload.data.message || 'Ada pesan baru',
    icon: '/image/blessLogo-192.png',
    badge: '/image/blessLogo-192.png',
    tag: 'chat-message',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: payload.data
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
}); 