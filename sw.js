// sw.js

const APP_CACHE_NAME = 'spobrefy-app-shell-cache-v34'; // Mude a versão para forçar a atualização
const MUSIC_CACHE_NAME = 'spobrefy-music-cache-v1';

// Lista de arquivos essenciais do "app shell"
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
    caches.open(APP_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Adicionando App Shell ao cache...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalação concluída.');
        return self.skipWaiting();
      })
  );
});

// Evento 'activate': Limpa caches antigos.
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Deleta tanto caches antigos do app quanto de músicas
          if (cache !== APP_CACHE_NAME && cache !== MUSIC_CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evento 'fetch': Decide como responder a uma requisição.
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignora requisições que não são GET.
  if (request.method !== 'GET') {
    return;
  }
  
  // Estratégia para arquivos de música: Cache First, fallback para Network
  if (request.url.includes('/Musics/')) {
    event.respondWith(
      caches.open(MUSIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        // Se encontrar no cache, retorna.
        if (cachedResponse) {
          // console.log(`SW: Servindo música do cache: ${request.url}`);
          return cachedResponse;
        }
        // Se não, busca na rede.
        try {
          const networkResponse = await fetch(request);
          // Se a resposta da rede for válida, clona, armazena no cache e retorna.
          if (networkResponse && networkResponse.ok) {
            console.log(`SW: Cacheando nova música: ${request.url}`);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.error(`SW: Falha ao buscar música da rede (offline?): ${request.url}`, error);
          // Opcional: retornar uma resposta de erro padrão para áudio.
        }
      })
    );
    return;
  }

  // Estratégia para o App Shell e outros assets: Stale-While-Revalidate
  event.respondWith(
    caches.open(APP_CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        console.warn(`SW: Fetch falhou (offline?): ${request.url}`, err);
      });
      
      // Retorna o cache se disponível, senão espera a rede.
      return cachedResponse || await fetchPromise;
    })
  );
});