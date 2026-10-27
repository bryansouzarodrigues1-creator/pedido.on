import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,png,site,csrf} from './test-backend-fixture.mjs';
import {supportImagePatch,supportMedia} from '../lib/restaurant-support-policy.ts';
import {dailyCampaigns,campaignMessage} from '../lib/daily-campaigns.ts';
const adminUser={userId:'admin-support',displayName:'Equipe QA',email:'support@example.test',fullName:null};
function admin(f){f.env.PLATFORM_ADMIN_ACCOUNT_ID=adminUser.userId;f.state.user={...adminUser};}
function owner(f,id='owner-a'){f.state.user={userId:id,displayName:'Dono QA',email:id+'@example.test',fullName:null};}
function form(input,bytes=png,type='image/png'){const body=new FormData();body.set('metadata',JSON.stringify(input));body.set('file',new File([bytes],'foto.png',{type}));return body;}
const input=(patch={})=>({requestId:crypto.randomUUID(),kind:'text',message:'Uma boa pizza para reunir quem você gosta.',...patch});
async function send(f,value,file=null){return f.call('adminRestaurant','POST',{id:'shop-a'},file?form(value,file):value);}
function image(f,id,state='completed',url='/media/shop-a/qa.png',at='2026-10-27T09:00:00.000Z'){
 f.db.prepare('INSERT INTO image_jobs(id,owner_id,restaurant_id,request_id,input_hash,token_hash,prompt,asset,state,period_key,result_url,created_at,expires_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'owner-a','shop-a',crypto.randomUUID(),'private-input-hash','private-token-hash','Foto de calabresa com luz de forno.','product',state,'2026-10',url,at,'2027-01-01T00:00:00.000Z',at);
}
test('customer workspace is admin-only, private, restaurant-scoped and never returns capability secrets',async()=>{
 const f=fixture();try{
  assert.equal((await f.call('adminRestaurant','GET',{id:'shop-a'})).status,403);f.state.user=null;assert.equal((await f.call('adminRestaurant','GET',{id:'shop-a'})).status,401);admin(f);
  image(f,crypto.randomUUID());const response=await f.call('adminRestaurant','GET',{id:'shop-a'});assert.equal(response.status,200,await response.clone().text());assert.match(response.headers.get('cache-control'),/no-store/);const body=await response.json();assert.equal(body.restaurant.data.products.length,f.data.products.length);assert.deepEqual(body.restaurant.publishedData,f.data);assert.equal(body.history.entries.length,1);assert.doesNotMatch(JSON.stringify(body),/private-token-hash|private-input-hash|sealed_tokens|token_hash|AUTH_SESSION_KEY/);
  assert.equal((await f.call('adminRestaurant','GET',{id:'missing'})).status,404);assert.equal((await f.call('adminRestaurant','POST',{id:'shop-a'},input(),{'x-pedido-csrf':'bad'})).status,403);
  assert.equal((await f.call('adminRestaurant','POST',{id:'shop-a'},input(),{Origin:'https://foreign.example'})).status,403);owner(f);assert.equal((await f.call('ownerSupport','GET',{id:'shop-b'})).status,404);
 }finally{f.close();}
});
test('manual image delivery is idempotent, keeps menu/quotas/sessions intact and remains private to owner and admin',async()=>{
 const f=fixture(),original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('A manual delivery must not call a provider');};try{admin(f);const before=f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),value=input({kind:'image',asset:'product',productId:f.data.products[0].id,message:'Foto ilustrativa para conferir.'});
  const first=await send(f,value,png);assert.equal(first.status,201,await first.clone().text());const result=await first.json();assert.equal(result.reused,false);assert.equal((await (await send(f,value,png)).json()).reused,true);assert.equal(f.objects.size,1);assert.equal(f.db.prepare('SELECT count(*) n FROM image_jobs').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM studio_jobs').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM ai_budget_reservations').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM account_notices').get().n,1);assert.deepEqual(f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),before);
  owner(f);const delivered=await (await f.call('ownerSupport','GET',{id:'shop-a'})).json();assert.equal(delivered.items.length,1);const url=delivered.items[0].url,asset=url.split('/').at(-1);assert.ok(supportMedia(url,'shop-a'));
  for(const role of ['owner','admin','other','anonymous']){if(role==='admin')admin(f);else if(role==='anonymous')f.state.user=null;else owner(f,role==='other'?'owner-b':'owner-a');const r=await f.call('mediaRead','GET',{id:'shop-a',asset});assert.equal(r.status,['owner','admin'].includes(role)?200:404);if(r.status===200)assert.deepEqual(new Uint8Array(await r.arrayBuffer()),png);}
 }finally{globalThis.fetch=original;f.close();}
});
test('uploads reject wrong types, foreign products, mismatched idempotency and oversized input',async()=>{
 const f=fixture();try{admin(f);const value=input({kind:'image',asset:'cover'});assert.equal((await send(f,value,new TextEncoder().encode('<svg onload="alert(1)"/>'))).status,400);assert.equal((await send(f,{...value,productId:'not-this-store'},png)).status,400);assert.equal((await send(f,{...value,asset:'product'},png)).status,400);
  assert.equal((await send(f,value,png)).status,201);assert.equal((await send(f,{...value,message:'Outro conteúdo na mesma solicitação.'},png)).status,409);
  assert.equal((await send(f,input({kind:'image'}),new Uint8Array(5*1024*1024+1))).status,413);assert.equal(f.db.prepare('SELECT count(*) n FROM restaurant_support').get().n,1);
 }finally{f.close();}
});
test('guidance can be paused with a version check and is included only in new, bounded, one-use model claims',async()=>{
 const f=fixture(),original=globalThis.fetch;let calls=0,seen=[];
 try{admin(f);const value=input({kind:'guidance',message:'Use luz de forno e mantenha somente os ingredientes da loja.'});const r=await send(f,value);assert.equal(r.status,201);const {id}=await r.json();owner(f);
  Object.assign(f.env,{PEDIDO_IMAGE_ENABLED:'true',PEDIDO_IMAGE_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/image',PEDIDO_STUDIO_ENABLED:'true',PEDIDO_STUDIO_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/studio'});
  globalThis.fetch=async(url,init)=>{calls++;const image=url.endsWith('/image'),job=JSON.parse(init.body),claim=await f.call(image?'imageClaim':'studioClaim','POST',{},job);assert.equal(claim.status,200);const body=await claim.json();seen.push(body.prompt);if(image){assert.ok(body.prompt.length<=3000);return new Response(png,{headers:{'content-type':'image/png'}});}assert.equal(JSON.parse(body.prompt).teamGuidance,value.message);return Response.json({reply:'Visual claro com os sabores em destaque.',productDescriptions:[]});};
  const studio={requestId:crypto.randomUUID(),mode:'ai',message:'Quero um visual mais claro e organizado para a loja.',snapshot:f.data},photo={requestId:crypto.randomUUID(),asset:'product',productId:f.data.products[0].id,description:'Foto ilustrativa com os ingredientes cadastrados.',theme:f.data.theme,accent:f.data.accent};
  assert.equal((await f.call('studio','POST',{id:'shop-a'},studio)).status,200);assert.equal((await f.call('images','POST',{id:'shop-a'},photo)).status,200);assert.ok(seen.every(p=>p.includes(value.message)));assert.equal(calls,2);
  admin(f);assert.equal((await f.call('adminRestaurant','PATCH',{id:'shop-a'},{id,expectedVersion:1,state:'archived'})).status,200);assert.equal((await f.call('adminRestaurant','PATCH',{id:'shop-a'},{id,expectedVersion:1,state:'available'})).status,409);owner(f);
  assert.equal((await f.call('images','POST',{id:'shop-a'},photo)).status,200);assert.equal(calls,2);assert.equal((await f.call('images','POST',{id:'shop-a'},{...photo,requestId:crypto.randomUUID()})).status,200);assert.equal(calls,3);assert.ok(!seen.at(-1).includes(value.message));
 }finally{globalThis.fetch=original;f.close();}
});
test('guidance with many quotes stays below the existing 3000-character image service contract',async()=>{
 const f=fixture(),original=globalThis.fetch;try{admin(f);for(let i=0;i<4;i++)assert.equal((await send(f,input({kind:'guidance',message:'Luz "quente" e marca. '.repeat(100)}))).status,201);owner(f);Object.assign(f.env,{PEDIDO_IMAGE_ENABLED:'true',PEDIDO_IMAGE_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/image',PEDIDO_STUDIO_ENABLED:'true',PEDIDO_STUDIO_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/studio'});
  globalThis.fetch=async(url,init)=>{const claim=await f.call('imageClaim','POST',{},JSON.parse(init.body));const body=await claim.json();assert.ok(body.prompt.length<=3000);return new Response(png,{headers:{'content-type':'image/png'}});};
  const r=await f.call('images','POST',{id:'shop-a'},{requestId:crypto.randomUUID(),asset:'product',productId:f.data.products[0].id,description:'Foto ilustrativa com luz de forno, natural e apetitosa.',theme:f.data.theme,accent:f.data.accent});assert.equal(r.status,200,await r.clone().text());
 }finally{globalThis.fetch=original;f.close();}
});
test('the owner applies a delivered image only to their draft fields and cannot alter guidance or foreign assets',async()=>{
 const f=fixture();try{admin(f);const value=input({kind:'image',asset:'product',productId:f.data.products[0].id});const posted=await send(f,value,png);assert.equal(posted.status,201);owner(f);const {items}=await (await f.call('ownerSupport','GET',{id:'shop-a'})).json(),patch=supportImagePatch(f.data,items[0],'shop-a');assert.ok(patch.products[0].image.startsWith('/media/shop-a/'));assert.deepEqual(patch.products.map(p=>[p.id,p.sizes,p.price]),f.data.products.map(p=>[p.id,p.sizes,p.price]));assert.equal(patch.pix,undefined);assert.equal(patch.whatsapp,undefined);assert.equal(patch.promotions,undefined);assert.throws(()=>supportImagePatch(f.data,{...items[0],url:'/media/shop-b/private.png'},'shop-a'));assert.throws(()=>supportImagePatch(f.data,{...items[0],productId:'deleted'},'shop-a'));assert.equal(supportMedia('/media/shop-a/..','shop-a'),false);
  admin(f);const {id}=await (await send(f,input({kind:'guidance'}))).json();owner(f);assert.equal((await f.call('ownerSupport','PATCH',{id:'shop-a'},{id,expectedVersion:1,state:'archived'})).status,403);assert.equal((await f.call('ownerSupport','PATCH',{id:'shop-b'},{id:items[0].id,expectedVersion:1,state:'archived'})).status,404);assert.equal((await f.call('ownerSupport','PATCH',{id:'shop-a'},{id:items[0].id,expectedVersion:1,state:'archived'})).status,200);
 }finally{f.close();}
});
test('creative history pages through all sources without leaking another restaurant or capability hashes',async()=>{
 const f=fixture();try{admin(f);for(let i=0;i<25;i++)image(f,crypto.randomUUID(),i%2?'completed':'failed',i===0?'/media/shop-b/foreign.png':'/media/shop-a/qa.png');await send(f,input({kind:'text'}));let cursor='',seen=new Set(),pages=0;
  do{const request=new Request(site+'/api/test'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{headers:{Cookie:'__Host-pedido-csrf='+csrf}}),r=await f.dispatch('adminRestaurant','GET',request,{id:'shop-a'});assert.equal(r.status,200,await r.clone().text());const body=await r.json();for(const e of body.history.entries){const key=e.source+e.id;assert.ok(!seen.has(key));seen.add(key);assert.notEqual(e.url,'/media/shop-b/foreign.png');}assert.doesNotMatch(JSON.stringify(body),/private-token-hash|private-input-hash/);cursor=body.history.nextCursor;pages++;}while(cursor&&pages<10);assert.equal(seen.size,26);assert.equal(pages,2);
  const bad=await f.dispatch('adminRestaurant','GET',new Request(site+'/api/test?cursor=broken'),{id:'shop-a'});assert.equal(bad.status,400);
 }finally{f.close();}
});
test('the exact locally exported image and current caption are archived without an AI charge or published menu mutation',async()=>{
 const f=fixture(),original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Archive must be local');};try{f.db.prepare('UPDATE restaurants SET live_revision=1 WHERE id=?').run('shop-a');const idea=dailyCampaigns(f.data).find(c=>c.kind==='product'),metadata={source:'daily',sourceId:idea.id,format:'square',revision:1},before=f.db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  const first=await f.call('creativeArchive','POST',{id:'shop-a'},form(metadata));assert.equal(first.status,201,await first.clone().text());assert.equal((await (await f.call('creativeArchive','POST',{id:'shop-a'},form(metadata))).json()).reused,true);assert.equal(f.objects.size,1);assert.equal(f.db.prepare('SELECT count(*) n FROM image_jobs').get().n,0);assert.deepEqual(f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),before);
  admin(f);const body=await (await f.call('adminRestaurant','GET',{id:'shop-a'})).json(),entry=body.history.entries.find(e=>e.source==='support');assert.ok(entry.url);assert.ok(entry.message.includes(campaignMessage(f.data,idea,site+'/p/pizzaria-a')));assert.deepEqual([...f.objects.values()][0].bytes,png);
  owner(f);assert.equal((await f.call('creativeArchive','POST',{id:'shop-b'},form(metadata))).status,404);assert.equal((await f.call('creativeArchive','POST',{id:'shop-a'},form({...metadata,revision:2}))).status,409);assert.equal((await f.call('creativeArchive','POST',{id:'shop-a'},form({...metadata,sourceId:'old-day'}))).status,409);assert.equal((await f.call('creativeArchive','POST',{id:'shop-a'},form(metadata),{'x-pedido-csrf':'wrong'})).status,403);
 }finally{globalThis.fetch=original;f.close();}
});
test('status and WhatsApp captions are distinct and text recording never uploads an image',async()=>{
 const f=fixture();try{f.db.prepare('UPDATE restaurants SET live_revision=1 WHERE id=?').run('shop-a');const idea=dailyCampaigns(f.data).find(c=>c.kind==='product');for(const textVariant of ['whatsapp','status']){const r=await f.call('creativeArchive','POST',{id:'shop-a'},{source:'daily',sourceId:idea.id,format:'text',textVariant,revision:1});assert.equal(r.status,201,await r.clone().text());}const rows=f.db.prepare('SELECT message FROM restaurant_support').all();assert.equal(rows.length,2);assert.notEqual(rows[0].message,rows[1].message);assert.ok(rows.some(r=>r.message.includes(campaignMessage(f.data,idea,site+'/p/pizzaria-a','status'))));assert.equal(f.objects.size,0);
 }finally{f.close();}
});
test('verification can be clearly renewed from rejected, revoked and changed states, with a versioned audit',async()=>{
 const f=fixture({verified:false});try{admin(f);const before=f.db.prepare('SELECT * FROM account_access').all();
  async function current(){return (await (await f.dispatch('verificationAdmin','GET',new Request(site+'/api/test?restaurantId=shop-a'),{})).json()).store;}
  async function review(){const s=await current(),r=await f.call('verificationAdmin','POST',{}, {restaurantId:'shop-a',expectedVersion:s.version,identityHash:s.identityHash});assert.equal(r.status,200);return (await r.json()).verification;}
  async function decide(s,decision){return f.call('verificationAdmin','PATCH',{}, {restaurantId:'shop-a',expectedVersion:s.version,identityHash:s.identityHash,decision,reason:'Conferência explícita dos dados sintéticos.',confirmedReview:true});}
  let s=await review();assert.equal((await decide(s,'rejected')).status,200);s=await review();assert.equal((await decide(s,'approved')).status,200);s=await current();assert.equal((await decide(s,'revoked')).status,200);s=await review();assert.equal((await decide(s,'approved')).status,200);
  const old=await current(),changed={...f.data,city:'Outra cidade sintética'};f.db.prepare('UPDATE restaurants SET data=?,published_data=? WHERE id=?').run(JSON.stringify(changed),JSON.stringify(changed),'shop-a');assert.equal((await decide(old,'approved')).status,409);s=await review();assert.equal((await decide(s,'approved')).status,200);assert.deepEqual(f.db.prepare('SELECT * FROM account_access').all(),before);assert.ok(f.db.prepare('SELECT count(*) n FROM store_verification_events').get().n>=8);
 }finally{f.close();}
});
