const CACHE = 'carton-cache-v1'
const STATIC = ['/styles.css', '/manifest.json', '/icon.svg']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // API calls: network only
  if (url.pathname.startsWith('/api/')) return

  // Static assets: cache first
  if (STATIC.some(p => url.pathname === p)) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    )
    return
  }

  // HTML pages: network first, cache fallback
  e.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(request, clone))
        return res
      })
      .catch(() => caches.match(request))
  )
})
