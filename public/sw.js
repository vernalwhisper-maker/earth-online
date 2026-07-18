const CACHE_NAME = "earth-online-v1";

// Cache key assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/manifest.json",
      ]);
    })
  );
});

// Serve cached content when offline (stale-while-revalidate)
self.addEventListener("fetch", (event) => {
  // 只缓存 GET 静态资源，不缓存 API 请求
  if (event.request.method !== "GET" || event.request.url.includes("/api/") || event.request.url.includes("localhost")) {
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});