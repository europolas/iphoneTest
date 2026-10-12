'use strict';

// Publikavimo metu pakeičiama pagal visų programėlės failų turinį.
const cacheName = 'iphoneTest-__BUILD_VERSION__';
const assets = ['./', './index.html', './style.css', './viewport.js', './app.js', './reminders.js', './auth.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName)
    .then(cache => cache.addAll(assets.map(path => new Request(
      new URL(path, self.registration.scope), { cache: 'reload' }
    ))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('iphoneTest-') && key !== cacheName)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === 'navigate') {
        const page = await cache.match(new URL('./index.html', self.registration.scope));
        if (page) return page;
      }
      throw error;
    }
  }));
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Rodomas bendras pranešimas. */ }
  const message = data.message || {};
  const home = self.registration.scope;
  event.waitUntil(self.registration.showNotification(message.title || 'Mano Demo', {
    body: message.message || 'Gavai naują pranešimą.',
    icon: new URL('./icon-192.png', home).href,
    image: new URL('./icon-512.png', home).href,
    tag: message.id || 'demo-reminder',
    data: { url: new URL('./?reminder=1', home).href }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL('./?reminder=1', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  }));
});
