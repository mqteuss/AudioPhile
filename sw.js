// sw.js

// Define um nome e versão para o nosso cache. Mudar a versão força a atualização do cache.
const CACHE_NAME = 'spobrefy-cache-v260';
// NOVO: Define o nome do cache de áudio para referência
const AUDIO_CACHE_NAME = 'spobrefy-audio-cache-v31';

// Lista de arquivos essenciais do "app shell" para serem cacheados na instalação.
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js',
  'icon-192x192.png',
  'icon-512x512.png',
  'icon-maskable-512x512.png'
];

// Evento 'install': Salva os arquivos essenciais no cache.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Adicionando arquivos ao cache...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalação concluída.');
        return self.skipWaiting();
      })
  );
});

// Evento 'activate': Limpa caches antigos se uma nova versão do SW for ativada.
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  // ALTERADO: Lista de caches que queremos manter (o cache do app e o cache de áudios).
  const cacheWhitelist = [CACHE_NAME, AUDIO_CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o nome do cache NÃO estiver na nossa whitelist, ele será deletado.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        return self.clients.claim();
    })
  );
});

// Evento 'fetch' com estratégias mistas.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET.
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // ALTERADO: Estratégia "Cache First" para fontes do Google e CDNs, pois raramente mudam.
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          // Retorna do cache se encontrar, senão busca na rede e salva no cache para a próxima vez.
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
    return; // Encerra aqui para não aplicar a outra estratégia.
  }

  // Estratégia "Stale-While-Revalidate" para o restante (nosso app shell).
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    const fetchPromise = fetch(event.request).then(networkResponse => {
      if (networkResponse && networkResponse.ok) {
        cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(err => {
        console.warn(`Fetch falhou para: ${event.request.url}`, err);
    });
    return cachedResponse || await fetchPromise;
  })());
});