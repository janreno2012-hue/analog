/* AYALOG Video Reactor v1
   Cache-first ONLY for local MP4/WebM background video.
   HTML/JS/CSS remain network-normal, reducing stale-app risk.
*/
const VIDEO_CACHE = 'ayalog-video-reactor-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('ayalog-video-reactor-') && k !== VIDEO_CACHE)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isVideo = /\.(mp4|webm)$/i.test(url.pathname);
  if (!sameOrigin || !isVideo) return;

  event.respondWith((async () => {
    const cache = await caches.open(VIDEO_CACHE);
    const hit = await cache.match(req, {ignoreSearch:true});
    if (hit) return hit;

    const response = await fetch(req);
    if (response.ok) {
      await cache.put(req, response.clone());
    }
    return response;
  })());
});
