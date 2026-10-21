const CACHE='jus-cubing-v1';
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);const files=await(await fetch('/precache.json')).json();await c.addAll(files);await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;e.respondWith((async()=>{const c=await caches.open(CACHE);const cached=await c.match(e.request);if(cached)return cached;const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r})())});
