// Service worker volontairement minimal : il ne garde AUCUNE page en mémoire (les comptes et les leçons
// restent toujours à jour et privés). Il sert seulement une page d'aide quand il n'y a pas de connexion.
const OFFLINE = '/offline.html';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('ama-offline-v1').then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
