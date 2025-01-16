const firebaseConfig = {
  apiKey: "AIzaSyCQcivx48C-jGsHWIOAavZ0uNTwDiAyiEs",
  authDomain: "absensi-a9375.firebaseapp.com",
  projectId: "absensi-a9375",
  storageBucket: "absensi-a9375.firebasestorage.app",
  messagingSenderId: "44035837656",
  appId: "1:44035837656:web:e85d5ad67a8b572ff051ad",
  measurementId: "G-6DPDGCWWZ7"
};

// Deklarasi VAPID_KEY terlebih dahulu
const VAPID_KEY = 'BE4K68MJblb9f01LQXXKiNYDXnbdntuHp-AKDXmGcOcUf1brf4dGjukzWOnH_8JgSXBrXVHw1CWfFVS6QB08Rrs';

// Inisialisasi Firebase dengan konfigurasi service worker
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Konfigurasi messaging dengan service worker kustom
const messaging = firebase.messaging();

let currentDeviceId = localStorage.getItem('deviceId') || '';

// Muat device ID yang tersimpan
if (currentDeviceId) {
  document.getElementById('deviceId').value = currentDeviceId;
}

// Fungsi untuk mendapatkan token FCM
async function getFCMToken() {
  try {
    // Hapus registrasi service worker lama jika ada
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
    }

    // Daftarkan service worker baru
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    // Tunggu sampai service worker aktif
    await navigator.serviceWorker.ready;

    // Minta token baru dengan VAPID key
    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      throw new Error('Tidak bisa mendapatkan token FCM');
    }

    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    throw error;
  }
}

// Fungsi untuk mengecek dan memperbarui permission
async function checkAndUpdatePermission() {
  try {
    // Cek permission saat ini
    let permission = Notification.permission;
    
    // Jika belum diset atau default, minta permission
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    
    // Jika denied, throw error
    if (permission === 'denied') {
      throw new Error('Izin notifikasi ditolak');
    }

    return permission;
  } catch (error) {
    console.error('Error checking permission:', error);
    throw error;
  }
}

// Fungsi untuk mendaftarkan device
async function registerDevice() {
  if (!currentDeviceId) return;

  try {
    // Cek permission dulu
    const permission = await checkAndUpdatePermission();
    if (permission !== 'granted') return;

    // Dapatkan token
    const token = await getFCMToken();
    if (!token) return;

    // Update database
    const devicesRef = db.collection('devices');
    const deviceQuery = await devicesRef.where('deviceId', '==', currentDeviceId).get();

    const deviceData = {
      deviceId: currentDeviceId,
      token: token,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      permission: permission,
      userAgent: navigator.userAgent
    };

    if (deviceQuery.empty) {
      deviceData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
      await devicesRef.add(deviceData);
    } else {
      await deviceQuery.docs[0].ref.update(deviceData);
    }

  } catch (error) {
    console.error('Error registering device:', error);
    throw error;
  }
}

// Event listener untuk register button
document.getElementById('register').addEventListener('click', async () => {
  const deviceId = document.getElementById('deviceId').value;
  if (!deviceId) {
    alert('Masukkan Device ID!');
    return;
  }
  
  currentDeviceId = deviceId;
  localStorage.setItem('deviceId', deviceId);
  
  try {
    await registerDevice();
    alert('Device berhasil didaftarkan!');
  } catch (error) {
    alert('Gagal mendaftarkan device: ' + error.message);
  }
});

// Auto-register saat halaman dimuat
window.addEventListener('load', async () => {
  if (currentDeviceId) {
    try {
      await registerDevice();
    } catch (error) {
      console.error('Error auto-register:', error);
    }
  }
});

// Tambahkan event listener untuk visibility change
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && currentDeviceId) {
    try {
      await checkAndUpdatePermission();
    } catch (error) {
      console.error('Error checking permission on visibility change:', error);
    }
  }
});

// Kirim pesan
document.getElementById('messageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentDeviceId) {
    alert('Silakan daftarkan device terlebih dahulu!');
    return;
  }

  const toDeviceId = document.getElementById('to').value;
  const messageText = document.getElementById('message').value;
  
  try {
    // Dapatkan token tujuan
    const deviceQuery = await db.collection('devices')
      .where('deviceId', '==', toDeviceId)
      .get();

    if (deviceQuery.empty) {
      throw new Error('Device tujuan tidak ditemukan');
    }

    const targetToken = deviceQuery.docs[0].data().token;

    // Simpan pesan ke Firestore
    await db.collection('messages').add({
      from: currentDeviceId,
      to: toDeviceId,
      message: messageText,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Kirim ke server untuk push notification
    const response = await fetch('https://your-php-server.com/send_message.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: targetToken,
        from: currentDeviceId,
        message: messageText
      })
    });

    if (!response.ok) {
      throw new Error('Gagal mengirim notifikasi');
    }
    
    document.getElementById('message').value = '';
    alert('Pesan terkirim!');
  } catch (error) {
    console.error('Error:', error);
    alert('Gagal mengirim pesan: ' + error.message);
  }
});

// Fungsi untuk menampilkan notifikasi
async function showNotification(title, message) {
  if (Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
      body: message,
      icon: '/image/blessLogo-192.png',
      badge: '/image/blessLogo-192.png',
      tag: 'chat-message',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      silent: false
    });
  }
}

// Tampilkan pesan masuk
db.collection('messages')
  .orderBy('timestamp', 'desc')
  .onSnapshot((snapshot) => {
    const messagesDiv = document.getElementById('messages');
    
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (data.to === currentDeviceId) {
          // Tambahkan pesan ke UI
          const messageElement = document.createElement('div');
          messageElement.className = 'message';
          messageElement.innerHTML = `
            <strong>Dari: ${data.from}</strong>
            <p>${data.message}</p>
            <small>${data.timestamp?.toDate().toLocaleString() || 'Waktu tidak tersedia'}</small>
          `;
          messagesDiv.insertBefore(messageElement, messagesDiv.firstChild);

          // Tampilkan notifikasi
          showNotification(
            `Pesan dari ${data.from}`,
            data.message
          );
        }
      }
    });
  });

// Handle pesan di foreground
messaging.onMessage((payload) => {
  showNotification(
    'Pesan Baru',
    payload.data?.message || 'Ada pesan baru'
  );
}); 