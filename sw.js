// sw.js

// Define um nome e versão para o nosso cache. Mudar a versão força a atualização do cache.
const CACHE_NAME = 'spobrefy-cache-v34';

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
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        return self.clients.claim();
    })
  );
});

// Evento 'fetch' com a estratégia "Stale-While-Revalidate".
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith((async () => {
    // Abre o cache.
    const cache = await caches.open(CACHE_NAME);

    // 1. Tenta encontrar a resposta no cache.
    const cachedResponse = await cache.match(event.request);

    // 2. Em paralelo, busca a resposta na rede.
    const fetchPromise = fetch(event.request).then(networkResponse => {
      // Se a resposta da rede for bem-sucedida, atualiza o cache.
      if (networkResponse && networkResponse.ok) {
        cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(err => {
        // A rede falhou, o que é esperado quando offline.
        console.warn(`Fetch falhou para: ${event.request.url}`, err);
    });

    // 3. Retorna a resposta do cache imediatamente se ela existir.
    // Se não existir, espera a resposta da rede.
    return cachedResponse || await fetchPromise;
  })());
});