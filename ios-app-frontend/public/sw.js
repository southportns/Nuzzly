const CACHE_VERSION = 'v3'
const CACHE_NAME = `nuzzly-${CACHE_VERSION}`

// 安装时：跳过等待，立即激活
self.addEventListener('install', () => {
  self.skipWaiting()
})

// 激活时：清除旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// 请求拦截：Network First 策略（优先网络，离线用缓存）
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return

  // 跳过 API 请求和 WebSocket
  if (event.request.url.includes('/api/') || event.request.url.includes('ws://')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 网络成功：更新缓存
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // 网络失败：返回缓存
        return caches.match(event.request)
      })
  )
})
