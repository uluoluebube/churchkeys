const CACHE = 'churchkeys-v0.4.0';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./assets/favicon.svg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => { if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return; event.respondWith(fetch(event.request).then(res => { if(res.ok && new URL(event.request.url).pathname.endsWith('/index.html')) { const copy=res.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); } return res; }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))); });
