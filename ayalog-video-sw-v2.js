/* AYALOG GREEN REACTOR MARK II — Range-aware video cache
   Scope: same-origin MP4/WebM only. App HTML/JS/CSS are NOT cached here.
*/
const CACHE='ayalog-video-reactor-v2';
const VIDEO='ayalog_green_bg_720p_light.mp4';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    try{
      const r=await fetch(VIDEO,{cache:'reload'});
      if(r.ok) await c.put(VIDEO,r.clone());
    }catch(_){}
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async()=>{
    const ks=await caches.keys();
    await Promise.all(ks.filter(k=>k.startsWith('ayalog-video-reactor-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function rangeResponse(full, rangeHeader){
  const m=/bytes=(\d+)-(\d*)/.exec(rangeHeader||'');
  if(!m) return null;
  return full.arrayBuffer().then(buf=>{
    const size=buf.byteLength;
    const start=Number(m[1]);
    const end=m[2]?Math.min(Number(m[2]),size-1):size-1;
    if(start>=size || start>end){
      return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
    }
    const slice=buf.slice(start,end+1);
    const h=new Headers(full.headers);
    h.set('Content-Range',`bytes ${start}-${end}/${size}`);
    h.set('Content-Length',String(slice.byteLength));
    h.set('Accept-Ranges','bytes');
    h.set('Content-Type',full.headers.get('Content-Type')||'video/mp4');
    return new Response(slice,{status:206,statusText:'Partial Content',headers:h});
  });
}

self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin || !/\.(mp4|webm)$/i.test(u.pathname)) return;

  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    let full=await c.match(u.pathname.split('/').pop(),{ignoreSearch:true});
    if(!full){
      const net=await fetch(new Request(req.url,{method:'GET',headers:{},mode:'same-origin',credentials:'same-origin',cache:'no-store'}));
      if(net.ok){ await c.put(u.pathname.split('/').pop(),net.clone()); full=net; }
      else return net;
    }
    const range=req.headers.get('range');
    if(range){
      const partial=await rangeResponse(full.clone(),range);
      if(partial) return partial;
    }
    return full;
  })());
});
