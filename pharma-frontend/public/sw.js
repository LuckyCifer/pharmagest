// Service worker minimal : met en cache le "shell" de l'application (JS/CSS/HTML
// construits par Vite) pour que l'interface continue de se charger même sans
// réseau. Les appels à /api/ ne sont jamais interceptés — les données restent
// gérées par la file d'attente IndexedDB côté application (voir src/offline/).

const CACHE_NAME = 'pharmagest-shell-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/']))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached || caches.match('/'))
      return cached || network
    })
  )
})
