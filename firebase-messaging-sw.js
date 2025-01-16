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

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = `Pesan dari ${payload.data.from || 'Unknown'}`;
  const notificationOptions = {
    body: payload.data.message || 'Ada pesan baru',
    icon: '/blessAbsen/image/blessLogo-192.png',
    badge: '/blessAbsen/image/blessLogo-192.png',
    tag: Date.now().toString(), // Tambahkan timestamp sebagai tag unik
    renotify: true, // Paksa notifikasi baru muncul
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: payload.data,
    timestamp: Date.now() // Tambahkan timestamp
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Keep service worker active
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = '/blessAbsen/';

  // Clear other notifications when one is clicked
  self.registration.getNotifications().then(notifications => {
    notifications.forEach(notification => {
      if (notification.tag !== event.notification.tag) {
        notification.close();
      }
    });
  });

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen)) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

// Handle push event directly
self.addEventListener('push', function(event) {
  if (event.data) {
    const payload = event.data.json();
    const notificationTitle = `Pesan dari ${payload.data.from || 'Unknown'}`;
    const notificationOptions = {
      body: payload.data.message || 'Ada pesan baru',
      icon: '/blessAbsen/image/blessLogo-192.png',
      badge: '/blessAbsen/image/blessLogo-192.png',
      tag: Date.now().toString(),
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: payload.data,
      timestamp: Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
}); 