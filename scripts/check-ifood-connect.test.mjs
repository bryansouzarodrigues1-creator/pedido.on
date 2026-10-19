import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,site,csrf} from './test-backend-fixture.mjs';
import {ifoodApi,requestIfoodCode,importAuthorizedIfood} from '../lib/ifood-api.ts';
import {categories,merchantId,storeUrl,officialTransport,largeCategories} from './ifood-official-fixture.mjs';
import {mergeReaderSource} from '../lib/menu-source-links.ts';
import {launchSchema} from '../lib/menu-launch.ts';
import {readMenuPages} from '../lib/menu-reader-policy.ts';
function connection(){const f=fixture();Object.assign(f.env,{PEDIDO_IFOOD_ENABLED:'true',IFOOD_CLIENT_ID:'synthetic-client-id',IFOOD_CLIENT_SECRET:'synthetic-client-secret'});f.state.user=null;const route=f.load('app/api/ifood/import/route.ts');let cookie='__Host-pedido-csrf='+csrf;
 const request=(body,extra={})=>new Request(site+'/api/ifood/import',{method:body?'POST':'GET',headers:{Origin:site,cookie,'x-pedido-csrf':csrf,...(body?{'content-type':'application/json'}:{}),...extra},body:body?JSON.stringify(body.action==='complete'?{url:storeUrl,...body}:body):undefined});
 return {...f,route,request,async call(body,extra){const response=await route[body?'POST':'GET'](request(body,extra));const set=response.headers.get('set-cookie');if(set)cookie='__Host-pedido-csrf='+csrf+'; '+set.split(';')[0];return response;},getCookie:()=>cookie};}
test('authorized guest import uses encrypted pending state, returns review data and never changes either account',async()=>{
 const f=connection(),original=globalThis.fetch,calls=[];globalThis.fetch=officialTransport(calls);const before=f.db.prepare('SELECT * FROM restaurants ORDER BY id').all();
 try{let response=await f.call({action:'start',url:storeUrl});assert.equal(response.status,200);const value=await response.json();assert.equal(value.pending.url,storeUrl);assert.equal(value.pending.userCode,'HJLX-LPSQ');assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Max-Age=600; Secure/);assert.doesNotMatch(JSON.stringify(value)+f.getCookie(),/private-test-verifier|synthetic-client-secret/);
  const status=await (await f.call()).json();assert.equal(status.pending.userCode,'HJLX-LPSQ');assert.equal(status.enabled,true);
  response=await f.call({action:'complete',authorizationCode:'returned-test-code'});assert.equal(response.status,200,await response.clone().text());const result=await response.json();assert.equal(result.count,3);assert.equal(result.status,'imported');assert.match(result.store.address,/240/);assert.match(result.store.hours,/00:30/);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);assert.doesNotMatch(JSON.stringify(result),/private\.access|private-refresh|synthetic-client-secret|verifier/);
  for(const call of calls){assert.equal(new URL(call.url).origin,'https://merchant-api.ifood.com.br');assert.equal(call.options.redirect,'manual');assert.equal(call.options.headers.Cookie,undefined);assert.equal(call.options.headers['x-pedido-csrf'],undefined);if(!call.url.includes('/oauth/')){assert.equal(call.options.method,'GET');assert.equal(call.options.headers.Authorization,'Bearer private.access.token');}}
  const exchange=calls.find(c=>c.url.endsWith('/oauth/token')),form=new URLSearchParams(exchange.options.body);assert.equal(form.get('grantType'),'authorization_code');assert.equal(form.get('authorizationCodeVerifier'),'private-test-verifier');assert.equal(form.get('clientSecret'),'synthetic-client-secret');
  assert.deepEqual(f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),before);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);assert.equal(f.objects.size,0);assert.equal((await f.call()).status,200);assert.equal((await (await f.call()).json()).pending,undefined);
 }finally{globalThis.fetch=original;f.close();}
});
test('origin, CSRF, target and configuration checks stop invalid authorizations before data access',async()=>{
 const f=connection(),original=globalThis.fetch,calls=[];globalThis.fetch=officialTransport(calls,{wrongMerchant:true});
 try{assert.equal((await f.call({action:'start',url:storeUrl},{Origin:'https://evil.example'})).status,403);assert.equal((await f.call({action:'start',url:storeUrl},{'x-pedido-csrf':'forged'})).status,403);assert.equal((await f.call({action:'start',url:'https://127.0.0.1'})).status,400);assert.equal(calls.length,0);
  await f.call({action:'start',url:storeUrl});const cookie=f.getCookie();const req=f.request({action:'complete',authorizationCode:'test-code'},{cookie:cookie.replace(csrf,'ef'.repeat(32)),'x-pedido-csrf':'ef'.repeat(32)});assert.equal((await f.route.POST(req)).status,409);assert.equal(calls.length,1);
  const response=await f.call({action:'complete',authorizationCode:'test-code'});assert.equal(response.status,403);assert.equal(calls.length,3);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
  f.env.PEDIDO_IFOOD_ENABLED='false';assert.equal((await (await f.call()).json()).enabled,false);assert.equal((await f.call({action:'start',url:storeUrl})).status,503);assert.equal(calls.length,3);
 }finally{globalThis.fetch=original;f.close();}
});
test('invalid code stays retryable, cancel clears the authorization and throttles bound abuse',async()=>{
 const f=connection(),original=globalThis.fetch,calls=[],mode={badCode:true};globalThis.fetch=officialTransport(calls,mode);
 try{await f.call({action:'start',url:storeUrl});let response=await f.call({action:'complete',authorizationCode:'wrong-code'});assert.equal(response.status,401);assert.doesNotMatch(await response.text(),/must not leak/);assert.equal(response.headers.has('set-cookie'),false);assert.equal((await (await f.call()).json()).pending.userCode,'HJLX-LPSQ');
  await f.call({action:'cancel'});assert.equal((await f.call({action:'complete',authorizationCode:'test-code'})).status,409);
  for(let i=0;i<4;i++)assert.equal((await f.call({action:'start',url:storeUrl})).status,200);assert.equal((await f.call({action:'start',url:storeUrl})).status,429);assert.equal(calls.filter(c=>c.url.endsWith('/userCode')).length,5);
 }finally{globalThis.fetch=original;f.close();}
});
test('a second tab cannot complete an authorization for a different visible store',async()=>{
 const f=connection(),original=globalThis.fetch,calls=[];globalThis.fetch=officialTransport(calls);
 try{await f.call({action:'start',url:storeUrl});const response=await f.call({action:'complete',url:storeUrl.replace(merchantId,'c3fad304-a342-4898-a12b-80919ae3f599'),authorizationCode:'returned-test-code'});assert.equal(response.status,409);assert.equal((await response.json()).reconnect,true);assert.equal(calls.length,1);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
 }finally{globalThis.fetch=original;f.close();}
});
test('provider redirect, oversized responses and unsafe verification URLs never expose credentials',async()=>{
 let calls=0;await assert.rejects(ifoodApi('/authentication/v1.0/oauth/token',{form:new URLSearchParams({clientSecret:'test-secret'}),fetcher:async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://evil.example'}});}}),e=>e.status===503);assert.equal(calls,1);
 await assert.rejects(ifoodApi('/catalog/v2.0/merchants/'+merchantId+'/catalogs',{fetcher:async()=>new Response('[]',{headers:{'content-type':'application/json','content-length':'2000001'}})}),e=>e.status===502);
 await assert.rejects(requestIfoodCode({clientId:'test',clientSecret:'secret'},async()=>Response.json({userCode:'TEST-CODE',authorizationCodeVerifier:'test',verificationUrlComplete:'https://portal.ifood.com.br.evil.example/apps/code?c=TEST-CODE',expiresIn:600})),e=>e.status===502);
 await assert.rejects(ifoodApi('//evil.example/collect',{fetcher:async()=>{throw Error('must not fetch');}}),e=>e.status===400);
});
test('expired, tampered and different-purpose authorization cookies cannot be exchanged',async()=>{
 const f=connection(),original=globalThis.fetch,calls=[];globalThis.fetch=officialTransport(calls);
 try{await f.call({action:'start',url:storeUrl});const auth=f.load('lib/auth-policy.ts'),connect=f.load('lib/ifood-connect.ts'),pending=await connect.readIfoodPending(f.request()),context='ifood-import:v1:'+await auth.sha256('synthetic-client-id:'+csrf);
  for(const [payload,purpose] of [[{...pending,expiresAt:Math.floor(Date.now()/1000)-1},context],[pending,'another-feature'],[{...pending,url:'https://evil.example'},context]]){
   const sealed=await auth.sealTokens(payload,f.env.AUTH_SESSION_KEY,purpose),request=f.request({action:'complete',authorizationCode:'test-code'},{cookie:'__Host-pedido-csrf='+csrf+'; __Host-pedido-ifood='+sealed});assert.equal((await f.route.POST(request)).status,409);
  }assert.equal(calls.length,1);
 }finally{globalThis.fetch=original;f.close();}
});
test('flat item hydration and controlled category-route fallback preserve exact catalog identity',async()=>{
 const calls=[],transport=officialTransport(calls);let result=await importAuthorizedIfood(storeUrl,'test-token',async(url,options)=>{
  if(url.includes('/catalogs/catalog-test/categories'))return Response.json({}, {status:404});
  if(url.endsWith('/categories?include_items=true'))return Response.json(categories().map(c=>({...c,items:c.items.map(g=>g.item)})));
  if(url.endsWith('/items/pizza-test/flat'))return Response.json(categories()[0].items[0]);if(url.endsWith('/items/water/flat'))return Response.json(categories()[1].items[0]);return transport(url,options);
 });assert.equal(result.count,3);
 result=await importAuthorizedIfood(storeUrl,'test-token',async(url,options)=>url.endsWith('/opening-hours')?Response.json({}, {status:503}):transport(url,options));assert.equal(result.count,3);assert.equal(result.store.hours,undefined);assert.match(result.warnings.join(' '),/horários/);
 result=await importAuthorizedIfood(storeUrl,'test-token',officialTransport([],{noCatalog:true}));assert.equal(result.status,'needs_content');assert.equal(result.count,0);assert.match(result.store.address,/240/);assert.match(result.warnings.join(' '),/permissões/);
});
test('a large authorized catalog fits the real URL handoff, saved idea and review reader',async()=>{
 const transport=officialTransport([]),result=await importAuthorizedIfood(storeUrl,'test-token',async(url,options)=>url.includes('/categories?')?Response.json(largeCategories()):transport(url,options));
 assert.equal(result.status,'imported');assert.equal(result.count,99);assert.match(result.warnings.join(' '),/limite de texto/);
 const sourceText=mergeReaderSource('',result.url+'\n'+result.text);assert.ok(sourceText.length<=60000);assert.ok(sourceText.startsWith(storeUrl+'\n'));
 assert.equal(launchSchema.safeParse({id:merchantId,savedAt:Date.now(),idea:'Cardápio de teste',sourceText}).success,true);
 const read=readMenuPages([{id:'large-authorized-ifood',lines:sourceText.split('\n').map(text=>({text}))}]);
 assert.equal(read.items.length,result.count);assert.ok(read.items.every(item=>item.price===1234));assert.doesNotMatch(sourceText,/Bebida teste 100/);
});
