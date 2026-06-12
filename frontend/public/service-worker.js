// v0.45.5 SELF-DESTRUCT — This service worker exists only to kill itself
// and clear all caches left behind by the v0.42.0 SW.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  // Delete every cache
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  // Unregister this service worker
  await self.registration.unregister();
  // Force all tabs to reload with clean network requests
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.navigate(client.url));
});
