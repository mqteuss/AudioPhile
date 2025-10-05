// sw.js

// Define um nome e versão para o nosso cache. Mudar a versão força a atualização do cache.
const CACHE_NAME = 'spobrefy-cache-v10';

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
  'icon-512x512.png'
  // Adicione aqui outros arquivos estáticos importantes, como um arquivo CSS se você criar um.
];

// Evento 'install': Salva os arquivos essenciais no cache.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // O navegador espera essa operação terminar.
  event.waitUntil(
    // Abre o cache com o nome que definimos.
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Adicionando arquivos ao cache...');
        // Adiciona todos os nossos arquivos da lista ao cache.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalação concluída.');
        // Força o novo service worker a se tornar ativo imediatamente.
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
        // Assume o controle da página imediatamente.
        return self.clients.claim();
    })
  );
});


// Evento 'fetch': Intercepta as requisições e serve do cache se possível.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // 1. Tenta encontrar a requisição no cache.
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrar no cache, retorna a resposta do cache.
        if (cachedResponse) {
          // console.log('Service Worker: Servindo do cache:', event.request.url);
          return cachedResponse;
        }
        // 2. Se não encontrar, faz a requisição à rede.
        // console.log('Service Worker: Buscando da rede:', event.request.url);
        return fetch(event.request);
      })
  );
});
