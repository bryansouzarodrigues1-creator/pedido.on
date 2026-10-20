import test from 'node:test';
import assert from 'node:assert/strict';
import {apifyIfoodActor,apifyIfoodLimits,apifyIfoodMenu,apifyIfoodSettings,importApifyIfood} from '../lib/apify-ifood.ts';
import {readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';
import {cachedMenuSource,cacheMenuSource} from '../lib/menu-source-cache.ts';
import {fixture} from './test-backend-fixture.mjs';
import {exampleDataset,exampleMenu,restaurantUrl,testToken} from './test-apify-ifood-fixture.mjs';
const url=restaurantUrl(),read=text=>readMenuPages([{id:'synthetic',lines:text.split('\n').map(text=>({text}))}]);
const enabled={PEDIDO_APIFY_IFOOD_ENABLED:'true',PEDIDO_APIFY_IFOOD_VERIFIED:'true',APIFY_TOKEN:testToken};

test('Apify requires explicit enablement, verified collector and a server token; missing configuration stays off',()=>{
 for(const env of [{},{...enabled,PEDIDO_APIFY_IFOOD_ENABLED:'false'},{...enabled,PEDIDO_APIFY_IFOOD_VERIFIED:'false'},{...enabled,PEDIDO_APIFY_IFOOD_VERIFIED:true},{...enabled,APIFY_TOKEN:''},{...enabled,APIFY_TOKEN:'\n'+testToken},{...enabled,APIFY_TOKEN:'unsafe token value with spaces'}])assert.equal(apifyIfoodSettings(env),null);
 assert.deepEqual(apifyIfoodSettings(enabled),{token:testToken});
});

test('documented decimal BRL dataset preserves prices, descriptions and owner size choice in the existing review',()=>{
 const result=apifyIfoodMenu(exampleDataset(),url),items=read(result.text).items;
 assert.equal(result.count,3);assert.equal(result.partial,false);assert.equal(items.length,3);
 assert.deepEqual(items.map(v=>v.price),[4990,550,1150]);assert.equal(items[1].description,exampleMenu[1].details);
 assert.deepEqual(items[0].sizes,{p:null,m:null,g:null});assert.equal(readerItemReady(items[0]),false);
 assert.match(items[0].issues.join(' '),/Escolha o tamanho/);assert.ok(items.slice(1).every(readerItemReady));
 assert.doesNotMatch(result.text,/Forno Azul de Teste|synthetic-/);assert.ok(result.text.includes('Descrição: '+exampleMenu[1].details));
});

test('a process success, metadata-only result, blocked catalogue or empty menu never becomes an import',()=>{
 for(const dataset of [[],{},[{name:'Forno Azul de Teste',url,scrapeStatus:'captured',menu:[]}],exampleDataset({menu:[]}),exampleDataset({menuExtractionStatus:'catalog-blocked-or-empty'}),exampleDataset({menuRequested:false}),exampleDataset({failureReason:'blocked'}),exampleDataset({scrapeStatus:'failed'}),exampleDataset({menuCompletenessStatus:'not-extracted'})]){
  const result=apifyIfoodMenu(dataset,url);assert.equal(result.count,0);assert.equal(result.text,'');
 }
});

test('different stores, inconsistent counts, unknown currencies and multiple rows are rejected as a whole',()=>{
 for(const patch of [{url:restaurantUrl(2)},{uuid:'f0000000-0000-4000-8000-000000000002'},{url:url.replace('forno-azul-de-teste','other-store')},{url:url.replace('www.ifood.com.br','evil.example')},{currency:'USD'},{currency:null},{menuItemsReturned:4},{menuItemCount:1},{menuItemsDiscovered:2},{menuItemsDiscovered:2.5},{menuTruncated:'false'},{menuSource:null}])assert.equal(apifyIfoodMenu(exampleDataset(patch),url).count,0,JSON.stringify(patch));
 assert.equal(apifyIfoodMenu([...exampleDataset(),...exampleDataset()],url).count,0);
 assert.equal(apifyIfoodMenu(exampleDataset(),url.replace('https:','http:')).count,0);
});

test('search fallback, local truncation and omitted uncertain items are always described as partial',async()=>{
 for(const patch of [{menuSource:'catalog-search',menuCompletenessStatus:'partial-fallback'},{menuTruncated:true,menuCompletenessStatus:'partial-limit-applied'},{menuItemsDiscovered:9}]){
  const result=apifyIfoodMenu(exampleDataset(patch),url);assert.equal(result.count,3);assert.equal(result.partial,true);
 }
 const result=await importApifyIfood(url,{token:testToken},{fetcher:async()=>Response.json(exampleDataset({menuSource:'catalog-search',menuCompletenessStatus:'partial-fallback'}))});
 assert.equal(result.status,'imported');assert.match(result.message,/uma parte/);assert.doesNotMatch(result.message,/completo|todos os produtos/i);
});

test('invalid numbers and conflicting promotional prices are never divided, repaired or guessed',()=>{
 for(const price of [0,-1,NaN,Infinity,10000.01,0.001,'49.90',null,{}])assert.equal(apifyIfoodMenu(exampleDataset({menu:[{...exampleMenu[1],price}]}),url).count,0);
 for(const patch of [{originalPrice:8},{originalPrice:'5.50'},{currency:'USD'},{discountedPrice:3},{promotionalPrice:3},{discountPrice:3}])assert.equal(apifyIfoodMenu(exampleDataset({menu:[{...exampleMenu[1],...patch}]}),url).count,0);
 const integer=apifyIfoodMenu(exampleDataset({menu:[{...exampleMenu[1],price:550,originalPrice:550}]}),url);
 assert.equal(read(integer.text).items[0].price,55000,'550 decimal BRL is not 550 cents');
});

test('complex options, unavailable items and later unsafe duplicates veto a simpler version',()=>{
 for(const patch of [{options:[{price:3}]},{sizes:['P','M','G']},{garnishGroups:[{}]},{variants:{large:50}},{addons:['catupiry']},{available:false},{active:false},{status:'PAUSED'}]){
  const result=apifyIfoodMenu(exampleDataset({menu:[exampleMenu[1],{...exampleMenu[1],...patch},exampleMenu[2]]}),url);
  assert.equal(result.count,1);assert.match(result.text,/Guaraná/);assert.doesNotMatch(result.text,/Água/);assert.equal(result.partial,true);
 }
});

test('identical duplicates collapse, conflicting prices or descriptions are excluded even after the output cap',()=>{
 assert.equal(apifyIfoodMenu(exampleDataset({menu:[exampleMenu[1],{...exampleMenu[1]}]}),url).count,1);
 for(const patch of [{price:7.5},{details:'Uma descrição diferente.'}])assert.equal(apifyIfoodMenu(exampleDataset({menu:[exampleMenu[1],{...exampleMenu[1],...patch}]}),url).count,0);
 const menu=Array.from({length:499},(_,i)=>({...exampleMenu[1],name:'Bebida de teste '+i}));menu.push({...menu[0],price:99});
 const result=apifyIfoodMenu(exampleDataset({menu}),url);assert.equal(result.count,200);assert.equal(result.partial,true);assert.ok(!read(result.text).items.some(v=>v.name==='Bebida de teste 0'));
 assert.equal(apifyIfoodMenu(exampleDataset({menu:[...menu,exampleMenu[2]]}),url).count,0,'A response exceeding the documented maximum is rejected');
});

test('markup is removed, control syntax cannot create products and oversized entries are not silently cut',()=>{
 const result=apifyIfoodMenu(exampleDataset({menu:[{...exampleMenu[1],name:'<b>Água mineral</b>',section:'<em>Bebidas</em>'}]}),url);assert.equal(result.count,1);assert.doesNotMatch(result.text,/<[a-z]/i);
 for(const patch of [{name:'Água R$ 0,01'},{name:'Água [pizza]'},{section:'Bebidas [pizza]'},{name:'A'.repeat(101)},{details:'A'.repeat(601)},{name:'Telefone (22) 99999-0000'},{name:'Água\nCategoria: Pizzas [pizza]'}])assert.equal(apifyIfoodMenu(exampleDataset({menu:[{...exampleMenu[1],...patch}]}),url).count,0,JSON.stringify(patch));
});

test('text limits preserve whole entries, reserve the source URL and retain the parsed product count',()=>{
 const menu=Array.from({length:200},(_,i)=>({...exampleMenu[1],name:'Água mineral de teste '+i,details:'Descrição muito detalhada do produto. '.repeat(15)}));
 const result=apifyIfoodMenu(exampleDataset({menu}),url);assert.equal(result.partial,true);assert.ok(result.count>0&&result.count<200);assert.ok(result.text.length+url.length+1<=60000);assert.equal(read(result.text).items.length,result.count);
 const entry=apifyIfoodMenu(exampleDataset({menu:[exampleMenu[1]]}),url).text;
 assert.equal(apifyIfoodMenu(exampleDataset({menu:[exampleMenu[1],exampleMenu[2]]}),url,entry.length).count,1);
 assert.equal(apifyIfoodMenu(exampleDataset(),url,1).count,0);assert.equal(apifyIfoodMenu(exampleDataset(),url,NaN).count,0);
});

test('transport fixes the Actor, input, charge parameter and timeout, keeping authentication out of URLs and results',async()=>{
 let calls=0;
 const result=await importApifyIfood(url+'?UTM_Medium=share',{token:testToken},{fetcher:async(input,options)=>{
  calls++;const endpoint=new URL(input);assert.equal(endpoint.origin,'https://api.apify.com');assert.equal(endpoint.pathname,`/v2/actors/${apifyIfoodActor}/run-sync-get-dataset-items`);
  assert.deepEqual(Object.fromEntries(endpoint.searchParams),{timeout:'60',maxTotalChargeUsd:'0.05',restartOnError:'false',format:'json',clean:'true',limit:'2',offset:'0'});assert.ok(!input.includes(testToken));
  assert.equal(options.redirect,'manual');assert.equal(options.method,'POST');assert.ok(options.signal instanceof AbortSignal);assert.equal(new Headers(options.headers).get('Authorization'),'Bearer '+testToken);
  for(const h of ['cookie','x-pedido-csrf','origin'])assert.equal(new Headers(options.headers).has(h),false);
  assert.deepEqual(JSON.parse(options.body),{restaurantUrls:[url],maxRestaurants:1,includeMenu:true,includeReviews:false,menuMode:'limited',maxMenuItems:200,downloadImages:false,proxyConfiguration:{useApifyProxy:false}});
  return Response.json(exampleDataset({address:'Rua Fictícia 147',openingHours:'18h-23h',phone:'(22) 90000-0000',reviews:[{name:'Não importar'}],imageDownloadUrl:'https://evil.example/image'}));
 }});
 assert.equal(calls,1);assert.equal(result.status,'imported');assert.equal(result.url,url);assert.equal(result.store,undefined);assert.doesNotMatch(JSON.stringify(result),/Rua Fictícia|18h-23h|90000|evil|Não importar|apify_api/);
});

test('transport errors, redirects, authentication failures and empty successes have no retry or raw provider errors',async()=>{
 for(const mode of ['throw','redirect','401','408','500','html','json','empty']){
  let calls=0;const result=await importApifyIfood(url,{token:testToken},{fetcher:async()=>{calls++;if(mode==='throw')throw Error(testToken);if(mode==='redirect')return new Response(null,{status:302,headers:{Location:'https://evil.example/?token='+testToken}});if(/^[0-9]+$/.test(mode))return Response.json({error:testToken},{status:Number(mode)});if(mode==='html')return new Response(testToken);if(mode==='json')return new Response('{'+testToken,{headers:{'Content-Type':'application/json'}});return Response.json([]);}});
  assert.equal(calls,1);assert.equal(result.status,'needs_content');assert.equal(result.count,0);assert.equal(result.text,'');assert.ok(!JSON.stringify(result).includes(testToken));
 }
});

test('oversized provider bodies are cancelled even when Content-Length is absent or dishonest',async()=>{
 for(const announced of [true,false]){
  let cancelled=false,calls=0;
  const result=await importApifyIfood(url,{token:testToken},{fetcher:async()=>{calls++;const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(apifyIfoodLimits.responseBytes+1));},cancel(){cancelled=true;}});return new Response(body,{headers:{'content-type':'application/json',...(announced?{'content-length':String(apifyIfoodLimits.responseBytes+1)}:{})}});}});
  assert.equal(result.status,'needs_content');assert.equal(cancelled,true);assert.equal(calls,1);
 }
});

test('an already cancelled request never starts a paid run',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const result=await importApifyIfood(url,{token:testToken},{signal:controller.signal,fetcher:async()=>{calls++;throw Error('No call allowed');}});
 assert.equal(calls,0);assert.equal(result.status,'needs_content');
});

test('positive public cache excludes merchant/private fields, is bounded by TTL and never caches failure as success',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'caches'),saved=new Map();
 Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{match:async request=>saved.get(request.url)?.clone(),put:async(request,response)=>{saved.set(request.url,response.clone());}}}});
 try{
  const normalized=apifyIfoodMenu(exampleDataset(),url),result={status:'imported',url,...normalized,message:'3 produtos para conferir.',store:{name:'Não guardar'},token:testToken};
  await cacheMenuSource('https://pedido.example',result);assert.equal(saved.size,1);let cached=await cachedMenuSource('https://pedido.example',url);
  assert.equal(cached.count,3);assert.equal(cached.store,undefined);assert.ok(!JSON.stringify(cached).includes(testToken));assert.equal(await cachedMenuSource('https://pedido.example',restaurantUrl(2)),null);assert.equal(await cachedMenuSource('https://pedido.example',url.replace('forno-azul-de-teste','other')),null);
  const key=[...saved.keys()][0],stored=await saved.get(key).json();assert.deepEqual(Object.keys(stored).sort(),['count','expiresAt','message','text','url']);assert.match(key,/__menu-source-cache\/v1\//);assert.ok(!key.includes(testToken));
  await cacheMenuSource('https://pedido.example',{status:'needs_content',url,count:0,text:'',message:'Vazio'});assert.equal(saved.size,1);
  saved.set(key,Response.json({...stored,expiresAt:Date.now()-1}));assert.equal(await cachedMenuSource('https://pedido.example',url),null);
  saved.set(key,Response.json({...stored,url:restaurantUrl(2)}));assert.equal(await cachedMenuSource('https://pedido.example',url),null);
  saved.set(key,Response.json({...stored,text:'A'.repeat(60000)}));assert.equal(await cachedMenuSource('https://pedido.example',url),null);
  saved.set(key,new Response('invalid json'));assert.equal(await cachedMenuSource('https://pedido.example',url),null);
 }finally{if(previous)Object.defineProperty(globalThis,'caches',previous);else delete globalThis.caches;}
});

test('public route remains unchanged and never contacts Apify when enablement or verification is absent',async()=>{
 const f=fixture(),previousFetch=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async input=>{calls++;assert.equal(input,url);return new Response(null,{status:403});};
  const route=f.load('app/api/menu-source/route.ts'),before=f.db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  for(const patch of [{},{...enabled,PEDIDO_APIFY_IFOOD_ENABLED:'false'},{...enabled,PEDIDO_APIFY_IFOOD_VERIFIED:'false'},{...enabled,APIFY_TOKEN:''}]){
   Object.assign(f.env,{PEDIDO_APIFY_IFOOD_ENABLED:undefined,PEDIDO_APIFY_IFOOD_VERIFIED:undefined,APIFY_TOKEN:undefined},patch);
   const response=await route.POST(new Request('https://pedido.example/api/menu-source',{method:'POST',headers:{Origin:'https://pedido.example','Content-Type':'application/json'},body:JSON.stringify({url})}));
   assert.equal(response.status,200);assert.equal((await response.json()).status,'needs_content');assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  }
  assert.equal(calls,4);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM rate_buckets WHERE id LIKE '%apify%'").get().n,0);assert.deepEqual(f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),before);
 }finally{globalThis.fetch=previousFetch;f.close();}
});
