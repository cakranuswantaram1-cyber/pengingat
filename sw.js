// sw.js — Pengingat Dokumen (update otomatis)
const CACHE_PREFIX = 'pengingat-dokumen-';
const CACHE_NAME = CACHE_PREFIX + 'v1'; // naikkan (v2, v3, ...) HANYA bila menambah/mengganti file di ASSETS
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Hanya hapus cache lama milik aplikasi ini
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME)
        .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Internet dulu supaya update otomatis terambil; bila offline pakai cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((m) => m || caches.match('./index.html')))
  );
});

// Terima perintah dari halaman untuk menampilkan notifikasi lewat SW.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIF') {
    const opts = data.opts || {};
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: opts.vibrate || [300, 150, 300, 150, 300, 150, 300],
      requireInteraction: opts.requireInteraction !== undefined ? opts.requireInteraction : true,
      tag: opts.tag || data.tag || 'pengingat-dokumen',
      renotify: true
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
