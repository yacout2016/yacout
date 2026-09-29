// GRIFFINE Service Worker
// 1) إشعارات Push حقيقية (زي ما كانت)
// 2) تشغيل كتطبيق: تخزين ملفات الواجهة الثابتة + صفحة "غير متصل" لما الإنترنت يقطع
// ملحوظة: طلبات الـ API (ملفات .php) مش بتتخزن أبدًا - البيانات المالية لازم تيجي من السيرفر دايمًا
const VERSION = 'griffine-v99';
const STATIC_ASSETS = [
  '/offline.html',
  '/shell.css?v=99',
  '/shell.js?v=99',
  '/studio.js?v=99',
  '/griffine-logo-light.webp?v=99',
  '/griffine-logo-dark.webp?v=99',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // الإصدار 87: كل ملف لوحده - لو ملف واحد ناقص على السيرفر الإصدار الجديد يتثبّت برضه
  // (قبل كده ملف واحد ناقص كان بيوقف التحديث والمتصفح العادي يفضل على النسخة القديمة)
  event.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(STATIC_ASSETS.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // صفحة الموقع نفسها: دايمًا من الشبكة (أحدث نسخة)، ولو لا يوجد نت نعرض صفحة "غير متصل"
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  // أي ملف PHP (API) - من الشبكة فقط، من غير تخزين
  if (url.pathname.endsWith('.php')) return;

  // الملفات الثابتة (css/js/صور/أيقونات): من التخزين فورًا وتحديثها في الخلفية
  if (/\.(css|js|png|webp|jpg|jpeg|svg|woff2?|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(VERSION).then((cache) => cache.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
});

self.addEventListener('push', function(event) {
  let data = { title: 'GRIFFINE', body: 'وصلك إشعار جديد', url: '/index.php' };
  try { if (event.data) data = event.data.json(); } catch (e) {}
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/index.php' },
    dir: 'rtl',
    lang: 'ar',
  };
  event.waitUntil(self.registration.showNotification(data.title || 'GRIFFINE', options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/index.php';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) { if ('focus' in client) return client.focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
