const CACHE='moneytrace-release-v25';
const ASSETS=['./','./index.html','./pdfjs-config.js','./styles.css','./app.js','./features.js','./moneytrace-six-features.js','./coach-2.2.js','./business-mode.js','./profile-settings.js','./moneytrace-4.0-security.js','./moneytrace-security-center.js','./supabase-config.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(ASSETS.map(async path=>{try{const response=await fetch(path,{cache:'no-store'});if(response.ok)await cache.put(path,response);}catch(error){}}));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('moneytrace-release-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(req,{cache:'no-store'});
   if(response.ok){const copy=response.clone();await cache.put(req,copy);}
   return response;
  }catch(error){
   const cached=await cache.match(req);
   if(cached)return cached;
   if(req.mode==='navigate')return (await cache.match('./index.html'))||Response.error();
   return Response.error();
  }
 })());
});
