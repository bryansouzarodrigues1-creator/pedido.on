// Actual workerd, D1, R2, application login/session and order routes.
// Only Supabase transport is simulated. All storage is disposable; no external financial/model calls.
import test from 'node:test';
import {createHash} from 'node:crypto';
import {verificationIdentity} from '../lib/store-verification-policy.ts';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {demoRestaurant,money} from '../lib/domain.ts';
import {bundleVersion} from '../lib/promotions.ts';
const require=createRequire(import.meta.url);
const {Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]}));
const esbuild=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const origin='https://ticket.test',password='local-only-disposable-password';
const identities={a:{id:'11111111-1111-4111-8111-111111111111',email:'a@example.test'},b:{id:'22222222-2222-4222-8222-222222222222',email:'b@example.test'}};
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64'));
let bundle;
async function runtime(){
 bundle??=esbuild.build({stdin:{contents:`
 import {requestContext} from 'ticket-test-context';
 import * as auth from './app/api/auth/[action]/route.ts';
 import * as create from './app/api/menu/[slug]/order/route.ts';
 import * as whatsapp from './app/api/menu/[slug]/whatsapp/route.ts';
 import * as admin from './app/api/restaurants/[id]/orders/route.ts';
 import * as ticket from './app/api/restaurants/[id]/orders/[orderId]/print/route.ts';
 import * as upload from './app/api/orders/[id]/receipt/route.ts';
 import * as customer from './app/api/orders/[id]/route.ts';
 import * as verification from './app/api/restaurants/[id]/verification/route.ts';
 import * as verificationAdmin from './app/api/admin/store-verifications/route.ts';
 import * as report from './app/api/menu/[slug]/report/route.ts';
 import * as reportAdmin from './app/api/admin/store-reports/route.ts';
 const routes=[[/^\\/api\\/auth\\/([^/]+)$/,auth,['action']],[/^\\/api\\/menu\\/([^/]+)\\/order$/,create,['slug']],[/^\\/api\\/menu\\/([^/]+)\\/whatsapp$/,whatsapp,['slug']],[/^\\/api\\/restaurants\\/([^/]+)\\/orders\\/([^/]+)\\/print$/,ticket,['id','orderId']],[/^\\/api\\/restaurants\\/([^/]+)\\/orders$/,admin,['id']],[/^\\/api\\/orders\\/([^/]+)\\/receipt$/,upload,['id']],[/^\\/api\\/orders\\/([^/]+)$/,customer,['id']]];
 export default {fetch(request){return requestContext.run(request,()=>{const path=new URL(request.url).pathname;const segments=path.split('/');if(path==='/api/admin/store-verifications')return verificationAdmin[request.method](request);if(path==='/api/admin/store-reports')return reportAdmin[request.method](request);if(segments[1]==='api'&&segments[2]==='restaurants'&&segments[4]==='verification')return verification[request.method](request,{params:Promise.resolve({id:segments[3]})});if(segments[1]==='api'&&segments[2]==='menu'&&segments[4]==='report')return report[request.method](request,{params:Promise.resolve({slug:segments[3]})});for(const [pattern,route,keys] of routes){const match=path.match(pattern);if(match){const fn=route[request.method];return fn?fn(request,{params:Promise.resolve(Object.fromEntries(keys.map((k,i)=>[k,match[i+1]])))}):new Response(null,{status:405});}}return new Response(null,{status:404});});}};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',external:['cloudflare:workers','node:async_hooks'],plugins:[{name:'ticket-framework-context',setup(build){
  build.onResolve({filter:/^(ticket-test-context|next\/headers|next\/navigation|@\/app\/chatgpt-auth)$/},a=>({path:a.path,namespace:'ticket-context'}));
  build.onLoad({filter:/.*/,namespace:'ticket-context'},a=>({loader:'js',contents:a.path==='ticket-test-context'?"import {AsyncLocalStorage} from 'node:async_hooks';export const requestContext=new AsyncLocalStorage();":a.path==='next/headers'?"import {requestContext} from 'ticket-test-context';export async function headers(){return requestContext.getStore().headers;}":a.path==='next/navigation'?"export function redirect(){throw Error('Unexpected redirect');}":"export async function getChatGPTUser(){return null;}"}));
 }}]});
 const outbound=[];
 const mf=new Miniflare({modules:true,script:(await bundle).outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'ticket-local'},d1Persist:false,r2Buckets:{BUCKET:'ticket-local'},r2Persist:false,bindings:{PLATFORM_ADMIN_ACCOUNT_ID:'supabase:'+identities.b.id,AUTH_SESSION_KEY:'ab'.repeat(32),SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',PEDIDO_AUTH_MODE:'open'},outboundService:async request=>{
  const url=new URL(request.url);outbound.push(url.origin+url.pathname);assert.equal(url.host,'fixture.supabase.co','financial/model requests are forbidden');
  if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'){
   const input=await request.json(),entry=Object.entries(identities).find(([,u])=>u.email===input.email);if(!entry||input.password!==password)return Response.json({error:'Invalid credentials'},{status:400});
   const [key,user]=entry;return Response.json({access_token:'fixture-access-'+key,refresh_token:'fixture-refresh-'+key,expires_in:3600,user:{...user,email_confirmed_at:new Date().toISOString(),user_metadata:{name:'Pessoa fictícia '+key}}});
  }
  if(url.pathname==='/auth/v1/user'){
   const key=request.headers.get('authorization')?.replace('Bearer fixture-access-',''),user=identities[key];return user?Response.json({...user,email_confirmed_at:new Date().toISOString(),user_metadata:{name:'Pessoa fictícia '+key}}):Response.json({error:'Invalid token'},{status:401});
  }
  if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
  throw Error('Unexpected provider operation');
 }});
 try{
  const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
  for(const file of readdirSync('drizzle').filter(v=>v.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+file,'utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const data={...demoRestaurant(),whatsapp:'(11) 99999-9999',pix:{enabled:true,type:'email',key:'pix@example.test',recipient:'Pizzaria fictícia'}};
  for(const key of ['a','b']){const stamp=new Date().toISOString();await db.prepare('INSERT INTO restaurants(id,owner_id,slug,name,data,published_data,published,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)').bind('shop-'+key,'supabase:'+identities[key].id,'pizzaria-'+key,'Pizzaria fictícia',JSON.stringify(data),JSON.stringify(data),stamp,stamp).run();}
  async function verifyStore(id='shop-a'){
   const row=await db.prepare('SELECT published_data FROM restaurants WHERE id=?').bind(id).first(),identity=JSON.stringify(verificationIdentity(JSON.parse(row.published_data))),hash=createHash('sha256').update(identity).digest('hex'),stamp=new Date().toISOString();
   await db.prepare("INSERT INTO store_verifications(restaurant_id,status,identity_hash,identity_json,request_note,requested_at,reason,version,updated_at) VALUES(?,'approved',?,?,'Synthetic approved fixture',?,'Synthetic approved fixture',1,?) ON CONFLICT(restaurant_id) DO UPDATE SET status='approved',identity_hash=excluded.identity_hash,identity_json=excluded.identity_json,version=store_verifications.version+1,updated_at=excluded.updated_at").bind(id,hash,identity,stamp,stamp).run();
  }
  await verifyStore('shop-a');await verifyStore('shop-b');
  async function call(path,{method='GET',body,jar,headers={}}={}){
   const h={origin,...(jar?{cookie:Object.entries(jar.cookies).map(([k,v])=>k+'='+v).join('; '),'x-pedido-csrf':jar.csrf}:{}),...headers};
   if(body!==undefined&&!ArrayBuffer.isView(body))h['content-type']='application/json';
   const response=await mf.dispatchFetch(origin+path,{method,headers:h,...(body===undefined?{}:{body:ArrayBuffer.isView(body)?body:JSON.stringify(body)})});
   if(jar){for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],i=pair.indexOf('=');jar.cookies[pair.slice(0,i)]=pair.slice(i+1);}}
   return response;
  }
  async function login(key){const jar={cookies:{},csrf:''},config=await call('/api/auth/config',{jar});assert.equal(config.status,200);jar.csrf=(await config.json()).csrf;const response=await call('/api/auth/login',{method:'POST',jar,body:{email:identities[key].email,password}});assert.equal(response.status,200,await response.clone().text());assert.match(response.headers.get('set-cookie'),/HttpOnly/);return jar;}
  const input=(patch={})=>({requestId:crypto.randomUUID(),trackingToken:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),customer:'Cliente fictício',phone:'(11) 99999-9999',method:'delivery',address:'Rua Exemplo, 100, Centro',payment:'Pix',note:'Não tocar a campainha',coupon:'',items:[{productIds:['margherita','calabresa'],size:'g',crustId:'catupiry',quantity:2,note:'Sem cebola'}],...patch});
  async function create(patch={}){const value=input(patch),response=await call('/api/menu/pizzaria-a/order',{method:'POST',body:value});assert.equal(response.status,201,await response.clone().text());return {order:await response.json(),input:value};}
  const print=(id,jar,copy='kitchen',extra='')=>call('/api/restaurants/shop-a/orders/'+id+'/print?copy='+copy+extra,{jar});
  const action=(id,jar,body)=>call('/api/restaurants/shop-a/orders',{method:'PATCH',jar,body:{orderId:id,...body}});
  const orderRow=id=>db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  return {mf,db,bucket,data,outbound,verifyStore,call,login,input,create,print,action,orderRow,close:()=>mf.dispose()};
 }catch(e){await mf.dispose();throw e;}
}

test('workerd/D1/R2: merchant request, admin review, WhatsApp cart, report and revocation use real route storage',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),admin=await f.login('b');await f.db.prepare("DELETE FROM store_verifications WHERE restaurant_id='shop-a'").run();
  const input=f.input(),create=()=>f.call('/api/menu/pizzaria-a/order',{method:'POST',body:input});
  assert.equal((await create()).status,403);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,0);
  const whatsapp=await f.call('/api/menu/pizzaria-a/whatsapp',{method:'POST',body:input});assert.equal(whatsapp.status,200);const message=new URL((await whatsapp.json()).whatsappUrl).searchParams.get('text');assert.match(message,/2x Margherita \+ Calabresa especial/);assert.match(message,/A combinar/);assert.doesNotMatch(message,/Pix antecipado|pix@example.test/);
  const request=await f.call('/api/restaurants/shop-a/verification',{method:'POST',jar:owner,body:{expectedVersion:0,liveRevision:0,note:'Solicitação fictícia no runtime Workers.'}});assert.equal(request.status,201,await request.clone().text());const pending=(await request.json()).verification;
  const decision={restaurantId:'shop-a',expectedVersion:pending.version,identityHash:pending.identityHash,decision:'approved',reason:'Verificação fictícia de vínculo e titular no D1 local.',confirmedReview:true};
  assert.equal((await f.call('/api/admin/store-verifications',{method:'PATCH',jar:owner,body:decision})).status,403);
  const approve=await f.call('/api/admin/store-verifications',{method:'PATCH',jar:admin,body:decision});assert.equal(approve.status,200,await approve.clone().text());const verified=(await approve.json()).verification;
  const created=await create();assert.equal(created.status,201,await created.clone().text());const order=await created.json(),token={'x-pedido-order-token':input.trackingToken};
  assert.equal((await (await f.call('/api/orders/'+order.id,{headers:token})).json()).order.pix.key,'pix@example.test');
  const report={requestId:crypto.randomUUID(),category:'payment',detail:'Relato fictício no teste D1 de revisão e denúncia.'};assert.equal((await f.call('/api/menu/pizzaria-a/report',{method:'POST',body:report})).status,201);assert.equal((await f.call('/api/menu/pizzaria-a/report',{method:'POST',body:report})).status,200);
  assert.equal((await f.call('/api/admin/store-verifications',{jar:owner})).status,403);const queue=await (await f.call('/api/admin/store-verifications',{jar:admin})).json();assert.equal(queue.reports.length,1);
  const resolution=await f.call('/api/admin/store-reports',{method:'PATCH',jar:admin,body:{id:queue.reports[0].id,expectedVersion:1,status:'resolved',resolution:'Relato de teste conferido e evidência preservada.'}});assert.equal(resolution.status,200);
  const revoke=await f.call('/api/admin/store-verifications',{method:'PATCH',jar:admin,body:{...decision,expectedVersion:verified.version,decision:'revoked'}});assert.equal(revoke.status,200,await revoke.clone().text());
  const tracking=await (await f.call('/api/orders/'+order.id,{headers:token})).json();assert.equal(tracking.order.pix,null);assert.equal(tracking.order.siteOrderingAllowed,false);
  assert.equal((await f.call('/api/orders/'+order.id+'/receipt',{method:'POST',body:png,headers:{...token,'content-type':'image/png'}})).status,403);assert.equal((await f.bucket.list()).objects.length,0);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM order_receipts').first()).n,0);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM store_verification_events').first()).n,3);
  assert.equal((await f.db.prepare('PRAGMA foreign_key_check').all()).results.length,0);assert.ok(f.outbound.every(url=>url.startsWith('https://fixture.supabase.co/')));
 }finally{await f.close();}
});

test('workerd/D1/R2: application login, Pix proof, owner confirmation and ticket preserve the original order',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),{order,input}=await f.create();
  assert.equal((await f.print(order.id,owner,'delivery')).status,409);
  assert.equal((await f.action(order.id,owner,{version:1,action:'accept',etaMinutes:40})).status,200);
  const upload=await f.call('/api/orders/'+order.id+'/receipt',{method:'POST',body:png,headers:{'content-type':'image/png','x-pedido-order-token':input.trackingToken}});assert.equal(upload.status,201,await upload.clone().text());
  assert.equal((await f.bucket.list()).objects.length,1);assert.equal((await f.print(order.id,owner,'delivery')).status,409);
  assert.equal((await f.action(order.id,owner,{version:3,action:'verify_payment',etaMinutes:40,receivedPix:false})).status,400);
  assert.equal((await f.action(order.id,owner,{version:3,action:'verify_payment',etaMinutes:40,receivedPix:true})).status,200);
  const before=await f.orderRow(order.id),events=(await f.db.prepare('SELECT * FROM order_events WHERE order_id=? ORDER BY version').bind(order.id).all()).results;
  const response=await f.print(order.id,owner,'delivery'),html=await response.text();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
  for(const text of [input.customer,input.address,'2× Margherita + Calabresa especial','Meio a meio','Borda de Catupiry','Sem cebola','Não tocar a campainha','Nada a cobrar',money(order.total)])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/pix@example.test|fixture-access|order-proofs|sb_publishable|trackingHash/);assert.ok(!html.includes(input.trackingToken));
  assert.deepEqual(await (await f.print(order.id,owner,'delivery','&format=json')).json(),{version:4});
  const kitchen=await (await f.print(order.id,owner)).text();assert.doesNotMatch(kitchen,/Rua Exemplo|Telefone:|Total do pedido/);assert.match(kitchen,/Sem cebola/);
  assert.deepEqual(await f.orderRow(order.id),before);assert.deepEqual((await f.db.prepare('SELECT * FROM order_events WHERE order_id=? ORDER BY version').bind(order.id).all()).results,events);
  assert.equal((await f.db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 }finally{await f.close();}
});

test('workerd: actual cookie sessions isolate tickets and logout removes print access',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),other=await f.login('b'),{order}=await f.create();
  assert.equal((await f.print(order.id)).status,401);assert.equal((await f.print(order.id,other)).status,404);
  assert.equal((await f.call('/api/restaurants/shop-b/orders/'+order.id+'/print',{jar:other})).status,404);
  assert.equal((await f.print(order.id,{...owner,cookies:{...owner.cookies,'__Host-pedido-session':'ff'.repeat(32)}})).status,401);
  assert.equal((await f.print(order.id,owner,'kitchen','&format=json')).status,200);
  assert.equal((await f.call('/api/auth/logout',{method:'POST',jar:owner})).status,200);
  assert.equal((await f.print(order.id,owner)).status,401);
 }finally{await f.close();}
});

test('workerd: idempotent order submission, competing owner updates and audit failure cannot duplicate or partially change an order',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),input=f.input({payment:'Dinheiro'}),responses=await Promise.all(Array.from({length:4},()=>f.call('/api/menu/pizzaria-a/order',{method:'POST',body:input})));
  assert.ok(responses.every(r=>[200,201].includes(r.status)));const bodies=await Promise.all(responses.map(r=>r.json())),id=bodies[0].id;assert.ok(bodies.every(v=>v.id===id));assert.equal((await f.db.prepare('SELECT count(*) n FROM orders').first()).n,1);
  assert.equal((await f.action(id,owner,{version:1,action:'accept',etaMinutes:40})).status,200);
  const race=await Promise.all([30,50].map(etaMinutes=>f.action(id,owner,{version:2,action:'eta',etaMinutes})));assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);assert.equal((await f.orderRow(id)).version,3);assert.equal((await f.db.prepare('SELECT count(*) n FROM order_events WHERE order_id=? AND version=3').bind(id).first()).n,1);
  const before=await f.orderRow(id);await f.db.prepare("CREATE TRIGGER ticket_test_audit_failure BEFORE INSERT ON order_events BEGIN SELECT RAISE(ABORT,'fixture audit failure'); END").run();
  assert.equal((await f.action(id,owner,{version:3,action:'prepare'})).status,500);assert.deepEqual(await f.orderRow(id),before);await f.db.prepare('DROP TRIGGER ticket_test_audit_failure').run();
  const json=await (await f.print(id,owner,'delivery','&format=json')).json();assert.equal(json.version,3);
 }finally{await f.close();}
});

test('workerd: cash/card/Pix on delivery, pickup, cancellation and completed orders show the correct collection instruction',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),withoutPix={...f.data,payments:['Pix','Dinheiro','Cartão de crédito','Cartão de débito'],pix:{...f.data.pix,enabled:false}};await f.db.prepare('UPDATE restaurants SET published_data=? WHERE id=?').bind(JSON.stringify(withoutPix),'shop-a').run();await f.verifyStore();
  for(const payment of ['Dinheiro','Cartão de crédito','Cartão de débito','Pix']){
   const {order}=await f.create({payment});assert.equal((await f.action(order.id,owner,{version:1,action:'accept',etaMinutes:35})).status,200);
   const html=await (await f.print(order.id,owner,'delivery')).text();assert.ok(html.includes('Cobrar na entrega · '+payment));assert.ok(html.includes(money(order.total)));assert.doesNotMatch(html,/Nada a cobrar|Pix conferido/);
   for(const [action,version] of [['prepare',2],['dispatch',3],['complete',4]])assert.equal((await f.action(order.id,owner,{version,action})).status,200);
   const history=await (await f.print(order.id,owner,'delivery')).text();assert.match(history,/VIA HISTÓRICA/);assert.doesNotMatch(history,/class="amount"/);
  }
  const pickup=await f.create({payment:'Dinheiro',method:'pickup'});assert.equal((await f.print(pickup.order.id,owner,'delivery')).status,409);
  const cancelled=await f.create({payment:'Dinheiro'});await f.action(cancelled.order.id,owner,{version:1,action:'cancel',reason:'Cancelamento fictício para teste'});assert.equal((await f.print(cancelled.order.id,owner,'delivery')).status,409);assert.match(await (await f.print(cancelled.order.id,owner)).text(),/CANCELADO · NÃO PREPARAR OU ENTREGAR/);
 }finally{await f.close();}
});

test('workerd: WhatsApp handoff does not create an order or unlock any ticket',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),response=await f.call('/api/menu/pizzaria-a/whatsapp',{method:'POST',body:f.input({payment:'Dinheiro'})});assert.equal(response.status,200,await response.clone().text());
  const result=await response.json();assert.match(result.whatsappUrl,/^https:\/\/wa\.me\//);assert.equal((await f.db.prepare('SELECT count(*) n FROM orders').first()).n,0);assert.equal((await f.bucket.list()).objects.length,0);
  assert.equal((await f.print(crypto.randomUUID(),owner)).status,404);
 }finally{await f.close();}
});

test('workerd: bundle composition, original prices and coupon totals survive catalog edits and invalid totals block printing',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),promotion={id:'combo-d1',kind:'bundle',name:'2 pizzas + refrigerante',items:[{productId:'margherita',size:'g',quantity:2},{productId:'refri',quantity:1}],price:14000,enabled:true,startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString()},data={...f.data,promotions:[promotion],coupon:{code:'CASA',enabled:true,percent:10,minTotal:0}};
  await f.db.prepare('UPDATE restaurants SET published_data=? WHERE id=?').bind(JSON.stringify(data),'shop-a').run();
  const {order}=await f.create({payment:'Dinheiro',expectedTotal:29860,coupon:'CASA',items:[{productIds:[],bundleId:promotion.id,bundleVersion:bundleVersion(promotion),quantity:2,note:'Não cortar a segunda pizza'},{productIds:['refri'],quantity:1,note:''}]});
  await f.action(order.id,owner,{version:1,action:'accept',etaMinutes:40});
  await f.db.prepare('UPDATE restaurants SET published_data=? WHERE id=?').bind(JSON.stringify({...f.data,products:[],deliveryFee:9999}),'shop-a').run();
  const response=await f.print(order.id,owner,'delivery','&paper=a4'),html=await response.text();assert.equal(response.status,200);
  for(const value of ['4× Margherita','2× Refrigerante 2 L','Não cortar a segunda pizza',money(29860),money(140),money(600)])assert.ok(html.includes(value),value);
  assert.equal((await f.orderRow(order.id)).total,29860);assert.ok(!html.includes(money(9999)));
  await f.db.prepare('UPDATE orders SET total=1 WHERE id=?').bind(order.id).run();assert.equal((await f.print(order.id,owner,'delivery')).status,409);assert.equal((await f.print(order.id,owner,'delivery','&format=json')).status,409);
 }finally{await f.close();}
});

test('workerd: recovery/expired sessions cannot print and an invalid CSRF cannot advance the order',async()=>{
 const f=await runtime();try{
  const owner=await f.login('a'),{order}=await f.create({payment:'Dinheiro'}),before=await f.orderRow(order.id);
  assert.equal((await f.call('/api/restaurants/shop-a/orders',{method:'PATCH',jar:owner,headers:{'x-pedido-csrf':'forged'},body:{orderId:order.id,version:1,action:'accept',etaMinutes:40}})).status,403);assert.deepEqual(await f.orderRow(order.id),before);
  await f.db.prepare("UPDATE auth_sessions SET scope='recovery' WHERE owner_id=?").bind('supabase:'+identities.a.id).run();assert.equal((await f.print(order.id,owner)).status,401);
  await f.db.prepare("UPDATE auth_sessions SET scope='account',expires_at=0 WHERE owner_id=?").bind('supabase:'+identities.a.id).run();assert.equal((await f.print(order.id,owner)).status,401);assert.equal((await f.db.prepare('SELECT count(*) n FROM auth_sessions').first()).n,0);assert.deepEqual(await f.orderRow(order.id),before);
 }finally{await f.close();}
});
