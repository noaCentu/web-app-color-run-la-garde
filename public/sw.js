const CACHE_NAME = 'centurio-cache-v33';

// Les fichiers vitaux de base (toujours pré-chargés)
const urlsToCache = [
  '/',
  '/index.html',
  '/defis.html',
  '/contact.html',
  '/reglement.html',
  '/style.css',
  '/script.js',
  '/centurio-logo.png',
  '/centurio-gaming-zone-bg.jpg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ PWA : Téléchargement des fichiers de base (v33)...');
      return Promise.all(
        urlsToCache.map(url => cache.add(url).catch(err => console.log('⚠️ Fichier ignoré :', url)))
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // 1. On ignore toujours les requêtes vers la base de données et WebSockets (le réseau en direct)
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) {
    return;
  }

  // 2. LA MAGIE DU CACHE DYNAMIQUE
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      
      // Si on l'a déjà en mémoire (ex: le fichier du générateur de QR Code), on le donne instantanément !
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si on ne l'a pas en mémoire, on va le chercher sur Internet...
      return fetch(event.request).then(networkResponse => {
        // ... ET ON LE SAUVEGARDE SECRÈTEMENT EN MÉMOIRE POUR LA PROCHAINE FOIS (si on n'a plus de Wi-Fi) !
        if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
        
      }).catch(() => {
        // FILET DE SÉCURITÉ : Si Internet est coupé et qu'on cherche une page Web, on renvoie l'accueil
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
