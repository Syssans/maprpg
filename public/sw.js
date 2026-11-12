// Réseau d'abord, copie locale à défaut : le joueur a toujours la dernière version
// quand il est en ligne, et la dernière vue quand il ne l'est pas.
const CACHE = 'sanctuaire';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const opts = { ignoreSearch: true, ignoreVary: true };
        const hit = await caches.match(req, opts);
        if (hit) return hit;
        // Seule une page peut retomber sur l'accueil ; un script manquant doit échouer franchement.
        return (req.mode === 'navigate' && (await caches.match('./', opts))) || Response.error();
      }),
  );
});
