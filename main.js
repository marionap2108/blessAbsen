import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js';
import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging.js';
import firebaseConfig from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

let currentDeviceId = '';

// Handle foreground messages
messaging.onMessage((payload) => {
  console.log('Pesan diterima:', payload);
  
  if (Notification.permission === 'granted') {
    const notification = new Notification(payload.data.fromId || 'Pesan Baru', {
      body: payload.data.message || 'Ada pesan baru untuk Anda',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'message-notification'
    });

    notification.onclick = function() {
      window.focus();
      this.close();
    };
  }
});

// Register device
document.getElementById('register').addEventListener('click', async () => {
  const deviceId = document.getElementById('deviceId').value;
  if (!deviceId) {
    alert('Masukkan Device ID!');
    return;
  }
  
  currentDeviceId = deviceId;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Izin notifikasi ditolak');
    }

    const vapidKey = 'BPVvFKWGYrYZGj-YBm9V8L5OyXkGK8O6kUVrUZlKF9Qz5GxUxz_UxW9WcHHxdVNPJVbHxaFPxGDmZPQe3xV8Vxc';
    const token = await getToken(messaging, { vapidKey });

    if (!token) {
      throw new Error('Tidak bisa mendapatkan token FCM');
    }

    await addDoc(collection(db, 'devices'), {
      deviceId: deviceId,
      token: token,
      timestamp: new Date()
    });

    localStorage.setItem('deviceId', deviceId);
    alert('Device berhasil didaftarkan!');
  } catch (error) {
    console.error('Error:', error);
    alert(`Gagal mendaftarkan device: ${error.message}`);
  }
});

// Send message
document.getElementById('messageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentDeviceId) {
    alert('Silakan daftarkan device terlebih dahulu!');
    return;
  }

  const toDeviceId = document.getElementById('to').value;
  const messageText = document.getElementById('message').value;
  
  try {
    await addDoc(collection(db, 'messages'), {
      from: currentDeviceId,
      to: toDeviceId,
      message: messageText,
      timestamp: new Date()
    });
    
    document.getElementById('message').value = '';
    alert('Pesan terkirim!');
  } catch (error) {
    console.error('Error:', error);
    alert('Gagal mengirim pesan: ' + error.message);
  }
});

// Load messages
const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
onSnapshot(q, (snapshot) => {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.to === currentDeviceId) {
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      messageElement.innerHTML = `
        <strong>Dari: ${data.from}</strong>
        <p>${data.message}</p>
        <small>${data.timestamp.toDate().toLocaleString()}</small>
      `;
      messagesDiv.appendChild(messageElement);
    }
  });
});

// Load saved deviceId
const savedDeviceId = localStorage.getItem('deviceId');
if (savedDeviceId) {
  document.getElementById('deviceId').value = savedDeviceId;
  currentDeviceId = savedDeviceId;
}
  