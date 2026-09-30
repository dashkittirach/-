// Harvest Ledger service worker: notifications + offline copy.
// The app itself is always fetched from the network first (so updates stay live);
// the cached copy is only used when there is no connection.
const CACHE = 'harvest-ledger-v2';
const PINNED = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\//; // versioned, never changes

const T = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
const PRECACHE = ['./', 'manifest.webmanifest', 'icon-192.png', T + 'build/three.module.min.js',
  ...['postprocessing/EffectComposer', 'postprocessing/RenderPass', 'postprocessing/UnrealBloomPass', 'postprocessing/OutputPass', 'postprocessing/ShaderPass', 'postprocessing/MaskPass', 'postprocessing/Pass',
    'effects/OutlineEffect', 'shaders/CopyShader', 'shaders/LuminosityHighPassShader', 'shaders/OutputShader'].map((f) => T + 'examples/jsm/' + f + '.js')];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // best effort: the first visit is then already available offline
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (PINNED.test(req.url)) { // cache-first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return res; })));
    return;
  }
  if (url.origin !== location.origin) return; // GitHub sync, fonts: straight to the network
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') { const c = res.clone(); caches.open(CACHE).then((x) => x.put(req.mode === 'navigate' ? url.pathname : req, c)); }
      return res;
    } catch (err) {
      const hit = (await caches.match(req.mode === 'navigate' ? url.pathname : req, { ignoreSearch: true })) || (req.mode === 'navigate' && (await caches.match(url.pathname.replace(/[^/]*$/, ''))));
      if (hit) return hit;
      throw err;
    }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./'))));
});
