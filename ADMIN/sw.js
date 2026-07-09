// Dai un nome alla tua cache. Se in futuro aggiorni l'app, cambia 'v1' in 'v2' per forzare l'aggiornamento
const CACHE_NAME = 'delapp-cache-v1';

// I file essenziali che permetteranno all'app di caricarsi anche offline
const urlsToCache = [
    '/'
];

// FASE 1: Installazione (Il Service Worker scarica e salva i file)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aperta con successo');
                return cache.addAll(urlsToCache);
            })
    );
});

// FASE 2: Attivazione (Elimina eventuali vecchie cache se hai cambiato CACHE_NAME)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Elimino vecchia cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// FASE 3: Fetch (Intercetta le richieste di rete)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se il file è nella cache (es. sei offline), restituiscilo
                if (response) {
                    return response;
                }
                // Altrimenti, fai normalmente la richiesta a internet
                return fetch(event.request);
            })
    );
});
