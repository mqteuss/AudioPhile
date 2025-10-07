// sw.js

// Define um nome e versão para o nosso cache. Mudar a versão força a atualização do cache.
const CACHE_NAME = 'spobrefy-cache-v22';

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


// Evento 'fetch': Intercepta requisições, serve do cache e adiciona novos itens ao cache dinamicamente.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrar no cache, retorna a resposta do cache.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se não encontrar, faz a requisição à rede.
        return fetch(event.request).then(
          networkResponse => {
            // Verifica se a resposta da rede é válida. (Ex: ignora extensões do Chrome)
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANTE: Clona a resposta. Uma resposta é um "stream"
            // e só pode ser consumida uma vez. Precisamos de um clone para
            // colocar no cache e outro para o navegador renderizar.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Adiciona a nova resposta ao cache para futuras requisições.
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});