// Real workerd + D1 + Cache API; all external transports are simulated.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {exampleDataset,restaurantUrl,testToken} from './test-apify-ifood-fixture.mjs';
const require=createRequire(import.meta.url),{Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]})),esbuild=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));

test('workerd integrates the simulated collector, caches positive menus and atomically limits repeated/concurrent paid attempts without touching stores',async()=>{
 const built=await esbuild.build({stdin:{contents:"import {POST} from './app/api/menu-source/route.ts';export default {fetch:POST};",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',external:['cloudflare:workers']});
 let directCalls=0,providerCalls=0,mode='menu';const inputUrls=[];
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-05-15',bindings:{PEDIDO_APIFY_IFOOD_ENABLED:'true',PEDIDO_APIFY_IFOOD_VERIFIED:'true',APIFY_TOKEN:testToken},d1Databases:{DB:'apify-ifood-local'},outboundService:async request=>{
  const endpoint=new URL(request.url);
  if(endpoint.hostname==='www.ifood.com.br'){
   directCalls++;assert.equal(request.method,'GET');for(const h of ['authorization','cookie','x-pedido-csrf'])assert.equal(request.headers.has(h),false);
   if(mode==='public')return new Response('<script type="application/ld+json">'+JSON.stringify({'@type':'Menu',hasMenuSection:{'@type':'MenuSection',name:'Bebidas',hasMenuItem:{'@type':'MenuItem',name:'Suco da casa',offers:{price:'8.00',priceCurrency:'BRL'}}}})+'</script>',{headers:{'content-type':'text/html'}});
   return new Response(null,{status:403});
  }
  assert.equal(endpoint.origin,'https://api.apify.com');assert.match(endpoint.pathname,/\/Dd5SpXWfkz2yqNAuf\/run-sync-get-dataset-items$/);assert.equal(request.method,'POST');assert.equal(request.headers.get('Authorization'),'Bearer '+testToken);assert.equal(request.headers.has('cookie'),false);assert.equal(request.headers.has('x-pedido-csrf'),false);
  const body=await request.json();assert.equal(body.proxyConfiguration.useApifyProxy,false);assert.equal(body.includeReviews,false);assert.equal(body.maxRestaurants,1);assert.equal(body.downloadImages,false);providerCalls++;inputUrls.push(body.restaurantUrls[0]);
  return Response.json(mode==='empty'?exampleDataset({url:body.restaurantUrls[0],menu:[],menuExtractionStatus:'catalog-blocked-or-empty',menuCompletenessStatus:'not-extracted'}):exampleDataset({url:mode==='wrong'?restaurantUrl(99):body.restaurantUrls[0]}));
 }});
 try{
  const db=await mf.getD1Database('DB');await db.exec("CREATE TABLE rate_buckets(id TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL); CREATE TABLE restaurants(id TEXT PRIMARY KEY,data TEXT NOT NULL); INSERT INTO restaurants VALUES('synthetic-store','owner draft must stay intact')");
  const before=(await db.prepare('SELECT * FROM restaurants').all()).results;let ip=1;
  const call=(url=restaurantUrl(),origin='https://pizza.test')=>mf.dispatchFetch('https://pizza.test/api/menu-source',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'203.0.113.'+ip++,cookie:'owner-session=synthetic','x-pedido-csrf':'synthetic'},body:JSON.stringify({url})});
  assert.equal((await call(restaurantUrl(),'https://evil.example')).status,403);assert.equal((await call('https://evil.example/menu')).status,400);assert.equal(providerCalls,0);assert.equal(directCalls,0);
  let response=await call();assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');let result=await response.json();assert.equal(result.status,'imported');assert.equal(result.count,3);assert.equal(result.store,undefined);assert.ok(!JSON.stringify(result).includes(testToken));assert.equal(providerCalls,1);assert.equal(directCalls,1);
  response=await call();assert.equal((await response.json()).count,3);assert.equal(providerCalls,1,'Positive cache avoids another Actor run');assert.equal(directCalls,1);
  mode='empty';result=await (await call(restaurantUrl(2))).json();assert.equal(result.status,'needs_content');assert.equal(result.count,0);assert.equal(providerCalls,2);
  result=await (await call(restaurantUrl(2))).json();assert.equal(result.status,'needs_content');assert.match(result.message,/indisponível/);assert.equal(providerCalls,2,'An empty result is not successful or retried');
  await call(restaurantUrl(2).replace('forno-azul-de-teste','another-slug'));assert.equal(providerCalls,2,'Store cooldown follows UUID across aliases');
  mode='wrong';result=await (await call(restaurantUrl(3))).json();assert.equal(result.count,0);assert.equal(result.status,'needs_content');assert.equal(providerCalls,3);
  mode='public';result=await (await call(restaurantUrl(4))).json();assert.equal(result.count,1);assert.equal(providerCalls,3);assert.equal((await db.prepare("SELECT COUNT(*) n FROM rate_buckets WHERE id LIKE 'menu-source-apify-store:%000000000004:%'").first()).n,0);
  mode='menu';await db.prepare("UPDATE rate_buckets SET hits=4 WHERE id LIKE 'menu-source-apify-day:%'").run();
  const concurrent=await Promise.all([call(restaurantUrl(5)),call(restaurantUrl(6))]);const values=await Promise.all(concurrent.map(v=>v.json()));assert.equal(values.filter(v=>v.status==='imported').length,1);assert.equal(providerCalls,4,'Atomic daily quota admits only the final available run');
  await db.prepare("UPDATE rate_buckets SET hits=20 WHERE id LIKE 'menu-source-apify-period:%'").run();await db.prepare("UPDATE rate_buckets SET hits=0 WHERE id LIKE 'menu-source-apify-day:%'").run();
  result=await (await call(restaurantUrl(7))).json();assert.equal(result.status,'needs_content');assert.equal(providerCalls,4,'Thirty-day budget is enforced independently of the daily quota');
  assert.deepEqual((await db.prepare('SELECT * FROM restaurants').all()).results,before);assert.equal(inputUrls.length,4);assert.ok(inputUrls.every(v=>v.includes('/forno-azul-de-teste/')));
 }finally{await mf.dispose();}
});
