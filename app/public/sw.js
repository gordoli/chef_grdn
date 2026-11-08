// Retire the previous app-shell cache when migrating from the Vite build.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith('workbox-')).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});
