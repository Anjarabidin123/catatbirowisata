/**
 * Service Worker Pencatatan Agen Biro PWA
 * Mendukung offline caching untuk operasional biro di lapangan
 */

const CACHE_NAME = 'agen-biro-pwa-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/pwa-icon.svg',
  '/placeholder.svg',
  '/borobudur.jpg',
  '/hero-bromo.jpg',
  '/destinations/semarang.jpg'
];

// 1. Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Sebagian aset statis gagal di-precache:', err);
      });
    })
  );
});

// 2. Activate Event: Clean up Old Caches & Take Control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate untuk Aset, Network-First untuk Navigasi
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Abaikan request selain GET (misal POST/PUT/DELETE ke Supabase)
  if (request.method !== 'GET') {
    return;
  }

  // Abaikan skema selain http / https (misal chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Khusus request API Supabase / AI: Network first tanpa caching permanen
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Koneksi offline, gagal memuat data online' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Untuk navigasi halaman (HTML SPA): Network First, Fallback ke /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Untuk aset statis (CSS, JS, Gambar, Font): Cache First dengan Background Update
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache di background
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Jika belum ada di cache, ambil dari network
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      });
    })
  );
});

// Listener untuk manual update skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
