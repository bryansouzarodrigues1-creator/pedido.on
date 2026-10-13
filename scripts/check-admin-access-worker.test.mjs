// Real workerd/D1; only the external identity provider is replaced by test identities.
// No production resources, model calls or payment requests are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {demoRestaurant} from '../lib/domain.ts';
const require=createRequire(import.meta.url);
const {Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]}));
const esbuild=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const origin='https://local.test',csrf='ac'.repeat(32),reason='Cortesia local para validar a pizzaria.';
let bundle;
async function runtime({billing=false,migrate=true}={}){
 bundle??=esbuild.build({stdin:{contents:`
  import {requestContext} from 'test-request-context';
  import * as access from './app/api/admin/access/route.ts';
  import {canServeMenu,assertPublishEntitlement} from './lib/billing.ts';
  import {errorResponse} from './lib/http.ts';
  export default {fetch(request){return requestContext.run(request,async()=>{
   const url=new URL(request.url);
   if(url.pathname==='/serve')return Response.json({available:await canServeMenu(url.searchParams.get('owner'),url.searchParams.get('shop'))});
   if(url.pathname==='/publish'){try{await assertPublishEntitlement(url.searchParams.get('owner'),url.searchParams.get('shop'));return Response.json({allowed:true});}catch(e){return errorResponse(e);}}
   return access[request.method](request);
  });}};`,resolveDir:process.cwd(),sourcefile:'local-admin-access.ts',loader:'ts'},bundle:true,write:false,platform:'neutral',format:'esm',external:['cloudflare:workers','node:async_hooks'],plugins:[{
  name:'local-auth-context',setup(build){
   build.onResolve({filter:/^(test-request-context|next\/headers|next\/navigation|@\/app\/chatgpt-auth)$/},args=>({path:args.path,namespace:'test-auth'}));
   build.onLoad({filter:/.*/,namespace:'test-auth'},args=>({loader:'js',contents:args.path==='test-request-context'?`import {AsyncLocalStorage} from 'node:async_hooks';export const requestContext=new AsyncLocalStorage();`:args.path==='next/headers'?`import {requestContext} from 'test-request-context';export async function headers(){return requestContext.getStore().headers;}`:args.path==='next/navigation'?`export function redirect(){throw Error('Unexpected navigation in API test');}`:`import {headers} from 'next/headers';export async function getChatGPTUser(){const id=(await headers()).get('x-local-owner');return id?{userId:id,displayName:'Local test',email:id+'@example.test',fullName:null}:null;}`}));
  }
 }]});
 const script=(await bundle).outputFiles[0].text;
 const billingBindings=billing?{PEDIDO_BILLING_ENABLED:'true',STRIPE_SECRET_KEY:'test-unused',STRIPE_WEBHOOK_SECRET:'test-unused',STRIPE_PRICE_ESSENCIAL:'test-unused',STRIPE_PRICE_PROFISSIONAL:'test-unused',STRIPE_PRICE_REDE:'test-unused'}:{};
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'admin-access-local'},d1Persist:false,bindings:{PLATFORM_ADMIN_ACCOUNT_ID:'owner-admin',AUTH_SESSION_KEY:'ab'.repeat(32),...billingBindings},outboundService:()=>{throw Error('External calls are forbidden in this test');}});
 const db=await mf.getD1Database('DB');
 async function migration(file){for(const sql of readFileSync(path.join('drizzle',file),'utf8').split(';').map(v=>v.trim()).filter(Boolean))await db.prepare(sql).run();}
 try{
  for(const file of readdirSync('drizzle').filter(name=>name.endsWith('.sql')&&!name.startsWith('0012')).sort())await migration(file);
  const stamp='2026-10-13T12:00:00.000Z',menu=JSON.stringify(demoRestaurant());
  for(const [id,owner] of [['shop-admin','owner-admin'],['shop-a','owner-a'],...Array.from({length:4},(_,i)=>['shop-b-'+(i+1),'owner-b'])])await db.prepare('INSERT INTO restaurants(id,owner_id,slug,name,data,published_data,published,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)').bind(id,owner,id,'Local D1 shop',menu,menu,stamp,stamp).run();
  await db.prepare('INSERT INTO orders(id,restaurant_id,request_id,customer,phone,data,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('old-order','shop-b-1','local-order','Test customer','test-phone','{}',4900,'awaiting_payment',stamp).run();
  await db.prepare('INSERT INTO account_profiles(owner_id,name,email,provider,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind('owner-b','Local test','local@example.test','chatgpt',stamp,stamp).run();
  await db.prepare('INSERT INTO auth_sessions(id,owner_id,email,display_name,scope,sealed_tokens,token_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('local-session','owner-b','local@example.test','Local test','account','test-sealed-sentinel',2000000000,2000000000,stamp).run();
  await db.prepare('INSERT INTO account_trials(owner_id,registered_at,started_at,ends_at) VALUES(?,?,?,?)').bind('owner-b',stamp,1700000000,1700604800).run();
  if(migrate)await migration('0012_admin_account_access.sql');
  const call=(method='PATCH',body,owner='owner-admin',extra={})=>mf.dispatchFetch(origin+'/api/admin/access?restaurantId=shop-b-1',{method,headers:{origin,'x-local-owner':owner,cookie:'__Host-pedido-csrf='+csrf,'x-pedido-csrf':csrf,...(body?{'content-type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});
  const action=(mode,version=0,extra={})=>({restaurantId:'shop-b-1',mode,reason,expectedVersion:version,...extra});
  const serve=async(owner,shop)=>(await (await mf.dispatchFetch(origin+`/serve?owner=${owner}&shop=${shop}`)).json()).available;
  const publish=(owner,shop)=>mf.dispatchFetch(origin+`/publish?owner=${owner}&shop=${shop}`);
  return {mf,db,migration,call,action,serve,publish,close:()=>mf.dispose()};
 }catch(error){await mf.dispose();throw error;}
}
async function legacySnapshot(db){
 const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'account_access%' ORDER BY name").all()).results;
 const result={};for(const {name} of tables)result[name]=(await db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()).results;
 return result;
}
test('migration 0012 preserves all 19 existing tables and populated business/session/trial rows in real D1',async()=>{
 const f=await runtime({migrate:false});try{
  const before=await legacySnapshot(f.db);assert.equal(Object.keys(before).length,19);
  // This proves the new code must not precede the additive schema.
  assert.equal((await f.call('GET')).status,500);
  await f.migration('0012_admin_account_access.sql');
  assert.deepEqual(await legacySnapshot(f.db),before);
  assert.equal((await f.call('GET')).status,200);
  assert.deepEqual((await f.db.prepare('SELECT * FROM account_access_events').all()).results,[]);
  await f.migration('0012_admin_account_access.sql');
  assert.deepEqual(await legacySnapshot(f.db),before);
  assert.equal((await f.db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 }finally{await f.close();}
});
test('real D1 admin routes reject unauthorized writes, audit only the winning version and roll back audit failures',async()=>{
 const f=await runtime();try{
  for(const [owner,status] of [['',401],['owner-b',403],['owner-a',403]]){
   assert.equal((await f.call('GET',undefined,owner)).status,status);
   assert.equal((await f.call('PATCH',f.action('suspended'),owner)).status,status);
  }
  assert.equal((await f.call('PATCH',{...f.action('suspended'),restaurantId:'shop-admin'})).status,403);
  assert.equal((await f.call('PATCH',f.action('suspended'),'owner-admin',{'x-pedido-csrf':''})).status,403);
  assert.equal((await f.call('PATCH',f.action('suspended'),'owner-admin',{origin:'https://other.test'})).status,403);
  const results=await Promise.all([f.call('PATCH',f.action('grant',0,{plan:'profissional',durationDays:30})),f.call('PATCH',f.action('grant',0,{plan:'profissional',durationDays:30}))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const events=(await f.db.prepare('SELECT * FROM account_access_events').all()).results;
  assert.equal(events.length,1);assert.equal(events[0].action,'grant');assert.equal(events[0].actor_id,'owner-admin');
  assert.equal(await f.serve('owner-b','shop-b-1'),true);assert.equal(await f.serve('owner-b','shop-b-4'),false);
  assert.equal((await f.publish('owner-b','shop-b-4')).status,402);
  assert.equal((await f.call('PATCH',f.action('suspended',1))).status,200);
  assert.equal(await f.serve('owner-b','shop-b-1'),false);assert.equal(await f.serve('owner-a','shop-a'),true);
  assert.equal((await f.publish('owner-b','shop-b-1')).status,403);
  assert.equal((await f.db.prepare("SELECT status FROM orders WHERE id='old-order'").first()).status,'awaiting_payment');
  assert.equal((await f.call('PATCH',f.action('normal',2))).status,200);
  assert.equal(await f.serve('owner-b','shop-b-4'),true); // Enforcement remains off.
  await f.db.prepare("UPDATE account_access_events SET created_at='2026-10-13T12:00:00.000Z'").run();
  const history=await f.call('GET');assert.match(history.headers.get('cache-control'),/private, no-store/);
  assert.deepEqual((await history.json()).history.map(v=>v.action),['normal','suspended','grant']);
  const state=await f.db.prepare("SELECT * FROM account_access WHERE owner_id='owner-b'").first();
  await f.db.prepare("CREATE TRIGGER local_audit_failure BEFORE INSERT ON account_access_events WHEN NEW.reason='Force local audit failure' BEGIN SELECT RAISE(ABORT,'local audit failure'); END").run();
  assert.equal((await f.call('PATCH',{...f.action('suspended',3),reason:'Force local audit failure'})).status,500);
  assert.deepEqual(await f.db.prepare("SELECT * FROM account_access WHERE owner_id='owner-b'").first(),state);
  assert.equal((await f.db.prepare('SELECT count(*) AS n FROM account_access_events').first()).n,3);
  assert.equal((await f.db.prepare('SELECT count(*) AS n FROM subscriptions').first()).n,0);
 }finally{await f.close();}
});
test('courtesy expiry returns to the current policy and a lower courtesy does not downgrade a paid Rede plan in real D1',async()=>{
 const f=await runtime({billing:true});try{
  const end=Math.floor(Date.now()/1000)+86400;
  await f.db.prepare('INSERT INTO subscriptions(owner_id,customer_id,subscription_id,plan,paid_plan,status,period_end,paid_through,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('owner-b','local-customer','local-subscription','rede','rede','active',end,end,new Date().toISOString()).run();
  const subscription=await f.db.prepare('SELECT * FROM subscriptions').first();
  assert.equal((await f.call('PATCH',f.action('grant',0,{plan:'essencial',durationDays:7}))).status,200);
  assert.equal(await f.serve('owner-b','shop-b-4'),true);
  assert.equal((await f.publish('owner-b','shop-b-4')).status,200);
  await f.db.prepare("UPDATE account_access SET expires_at=? WHERE owner_id='owner-b'").bind(Math.floor(Date.now()/1000)-1).run();
  assert.equal((await (await f.call('GET')).json()).access.mode,'normal');
  assert.equal(await f.serve('owner-b','shop-b-4'),true);
  assert.deepEqual(await f.db.prepare('SELECT * FROM subscriptions').first(),subscription);
  assert.equal((await f.call('PATCH',f.action('suspended',1))).status,200);
  assert.equal(await f.serve('owner-b','shop-b-4'),false);
  assert.deepEqual(await f.db.prepare('SELECT * FROM subscriptions').first(),subscription);
 }finally{await f.close();}
});
