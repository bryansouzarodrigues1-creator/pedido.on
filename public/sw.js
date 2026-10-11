/* pedido.on: PWA conservador; nunca guardar pedidos, login, comprovantes ou API em cache. */
const CACHE="pedido-on-static-v1";
const STATIC=["/assets/pedido-symbol.png","/favicon.svg"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).catch(()=>{}));
 self.skipWaiting();
});
self.addEventListener("activate",event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("pedido-on-static-")&&key!==CACHE).map(key=>caches.delete(key)))),
  self.clients.claim()
 ]));
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 const path=new URL(req.url).pathname;
 if(!STATIC.includes(path))return; // all app pages, authenticated requests and API stay network only
 event.respondWith(caches.match(req).then(saved=>saved||fetch(req)));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target="/app";
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{
  const existing=clients.find(client=>new URL(client.url).origin===self.location.origin&&new URL(client.url).pathname.startsWith("/app"));
  if(existing)return existing.focus();
  return self.clients.openWindow(target);
 }));
});
