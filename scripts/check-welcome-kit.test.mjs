import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,png,site} from './test-backend-fixture.mjs';
import {firstSubscriptionDueDate,subscriptionOffer} from '../lib/trial-billing-policy.ts';
import {proWeek} from '../lib/pro-week-policy.ts';
import {trialIdeas,campaignCaption,suggestedMenuPatch,campaignCreativeSource} from '../lib/trial-campaign-policy.ts';
import {demoRestaurant} from '../lib/domain.ts';
import {restaurantSchema} from '../lib/domain.ts';
import {curatedWelcome} from '../lib/welcome-campaign-seeds.ts';
const second=()=>Math.floor(Date.now()/1000);
function enable(f,start=second()-6*86400){Object.assign(f.env,{PEDIDO_AI_PLAN_QUOTAS:'true',PEDIDO_IMAGE_ENABLED:'true',PEDIDO_IMAGE_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/image',PEDIDO_STUDIO_ENABLED:'true',PEDIDO_STUDIO_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/studio'});f.db.prepare('INSERT INTO account_trials(owner_id,registered_at,started_at,ends_at) VALUES(?,?,?,?)').run('owner-a',new Date(start*1000).toISOString(),start,start+10*86400);f.db.prepare("UPDATE account_trials SET offer_version=2").run();}
const request=(action,round=1,patch={})=>({action,round,revision:1,brief:'Quero uma imagem marcante com a minha cor.',...patch});
function mockedProvider(f){let images=0,texts=0;const original=globalThis.fetch;globalThis.fetch=async(url,init)=>{
 assert.ok(url.startsWith('https://pedido-on-imagens.lovable.app/api/pedido-on/'));
 const body=JSON.parse(init.body),image=url.endsWith('/image'),claim=await f.call(image?'imageClaim':'studioClaim','POST',{},body);assert.equal(claim.status,200,await claim.clone().text());const payload=await claim.json();assert.equal(JSON.stringify(payload).includes(f.data.pix.key),false);
 if(image){images++;return new Response(png,{headers:{'content-type':'image/png'}});}texts++;const prompt=JSON.parse(payload.prompt);return Response.json({reply:'Uma abertura marcante e os sabores em destaque, com leitura fácil.',presentation:{layout:'poster',hero:'cover',font:'bold',corners:'soft'},productDescriptions:prompt.products.map(p=>({id:p.id,description:'Uma boa pedida para reunir quem você gosta.'}))});
 };return {counts:()=>({images,texts}),close:()=>{globalThis.fetch=original;}};}

test('calendar billing preserves every trial second across Brasília midnight, month ends and leap years',()=>{
 const now=new Date('2026-10-27T01:00:00Z'),end=Date.parse('2026-11-02T22:31:00Z')/1000;
 assert.equal(firstSubscriptionDueDate(end,now),'2026-11-03');assert.equal(firstSubscriptionDueDate(Date.parse('2026-11-03T03:00:00Z')/1000,now),'2026-11-03');
 const offer=subscriptionOffer(end,now);assert.equal(offer.preservesTrial,true);assert.equal(new Date(offer.paidThrough*1000).toISOString(),'2026-12-03T03:00:00.000Z');
 assert.equal(firstSubscriptionDueDate(0,now),'2026-10-26');assert.equal(firstSubscriptionDueDate(Number.NaN,now),'2026-10-26');assert.equal(subscriptionOffer(end,now,'').preservesTrial,false);
 const leap=subscriptionOffer(Date.parse('2028-01-31T03:00:00Z')/1000,new Date('2028-01-25T00:00:00Z'));assert.equal(new Date(leap.paidThrough*1000).toISOString(),'2028-02-29T03:00:00.000Z');
});
test('Pro week renews only on Monday 00:00 Brasília and catalog ideas invent no product or discount',()=>{
 assert.equal(proWeek(new Date('2026-11-02T02:59:59Z')).start,'2026-10-26T03:00:00.000Z');assert.equal(proWeek(new Date('2026-11-02T03:00:00Z')).start,'2026-11-02T03:00:00.000Z');
 const data=demoRestaurant(),ideas=trialIdeas(data,1);assert.equal(ideas.length,2);for(const idea of ideas){const p=data.products.find(p=>p.id===idea.items[0].productId);assert.ok(p);assert.equal(idea.price,p.sizes[idea.items[0].size]);}
 const caption=campaignCaption(data,ideas[0],site+'/p/teste','Entrega grátis por R$ 1');assert.doesNotMatch(caption,/grátis|R\$ 1\b/);assert.ok(caption.includes('Entrega à parte'));
 const patch=suggestedMenuPatch(data,null,[{productId:ideas[0].items[0].productId,url:'/media/shop-a/test.png'}]);assert.deepEqual(patch.products.map(p=>[p.id,p.price,p.sizes]),data.products.map(p=>[p.id,p.price,p.sizes]));assert.equal(patch.whatsapp,undefined);assert.equal(patch.pix,undefined);assert.equal(patch.promotions,undefined);
 assert.equal(campaignCreativeSource({...data,products:data.products.map(p=>({...p,sizes:{...p.sizes,g:p.sizes.g+1}}))}),campaignCreativeSource(data));
});
test('campaign preparation is owner-bound, CSRF-protected, shared by account and never publishes or calls a provider',async()=>{
 const f=fixture(),original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No provider expected');};try{enable(f,second()-600);const before=f.db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  assert.equal((await f.call('trialCampaigns','POST',{id:'shop-b'},request('prepare'))).status,404);
  assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('prepare'),{'x-pedido-csrf':'bad'})).status,403);
  assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('prepare',2))).status,403);
  for(let n=0;n<2;n++)assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('prepare'))).status,200);
  assert.equal(f.db.prepare('SELECT count(*) n FROM trial_campaigns').get().n,1);assert.equal(calls,0);assert.deepEqual(f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),before);
  const view=await (await f.call('trialCampaigns','GET',{id:'shop-a'})).json();assert.doesNotMatch(JSON.stringify(view),/text_request|image_requests|snapshot|owner-a|private|pizza@example/);
  f.db.prepare("UPDATE restaurants SET owner_id='owner-a' WHERE id='shop-b'").run();assert.equal((await f.call('trialCampaigns','POST',{id:'shop-b'},request('prepare'))).status,403);
 }finally{globalThis.fetch=original;f.close();}
});
test('both real campaign rounds reuse one-use text/image claims, reserve four included photos and preserve the complete menu',async()=>{
 const f=fixture();enable(f);const provider=mockedProvider(f);try{
  const before=f.db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  for(const round of [1,2])for(const action of ['prepare','text','image1','image2']){f.db.prepare("DELETE FROM rate_buckets WHERE id LIKE 'image-owner:%'").run();const r=await f.call('trialCampaigns','POST',{id:'shop-a'},request(action,round));assert.equal(r.status,200,await r.clone().text());}
  assert.deepEqual(provider.counts(),{images:4,texts:2});assert.equal(f.objects.size,4);
  const budget=f.load('lib/ai-budget.ts');assert.equal((await budget.budgetAllowance('owner-a','image')).used,0);assert.equal((await budget.budgetAllowance('owner-a','image','campaign')).used,4);assert.equal((await budget.budgetAllowance('owner-a','image','campaign')).limit,4);
  for(const action of ['text','image1','image2'])assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request(action))).status,200);
  assert.deepEqual(provider.counts(),{images:4,texts:2});assert.deepEqual(f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),before);
  f.db.prepare("UPDATE account_trials SET ends_at=? WHERE owner_id='owner-a'").run(second()-1);assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('image1'))).status,403);assert.equal((await (await f.call('trialCampaigns','GET',{id:'shop-a'})).json()).records.length,2);
 }finally{provider.close();f.close();}
});
test('two tabs cannot pay twice for a campaign; only an explicitly refunded attempt can be retried',async()=>{
 const f=fixture();enable(f);const provider=mockedProvider(f);try{
  await f.call('trialCampaigns','POST',{id:'shop-a'},request('prepare'));
  const responses=await Promise.all([f.call('trialCampaigns','POST',{id:'shop-a'},request('image1')),f.call('trialCampaigns','POST',{id:'shop-a'},request('image1'))]);assert.ok(responses.every(r=>[200,409].includes(r.status)));assert.equal(provider.counts().images,1);
  assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('retryImage1'))).status,409);
  provider.close();globalThis.fetch=async()=>{throw Error('Connection failed before claim');};assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('image2'))).status,503);
  f.db.prepare("DELETE FROM rate_buckets WHERE id LIKE 'image-owner:%'").run();
  assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('retryImage2'))).status,200);const next=mockedProvider(f);try{assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('image2'))).status,200);assert.equal(next.counts().images,1);}finally{next.close();}
 }finally{provider.close();f.close();}
});
test('Free and Pro grants have distinct quotas, all four durations work and suspension denies campaigns',async()=>{
 const f=fixture();enable(f);try{f.env.PLATFORM_ADMIN_ACCOUNT_ID='owner-b';f.state.user={userId:'owner-b',displayName:'Admin',email:'admin@example.test'};const before=f.db.prepare('SELECT * FROM restaurants ORDER BY id').all();let version=0;
  for(const tier of ['free','pro'])for(const durationDays of [10,30,60,90]){const r=await f.call('adminAccess','PATCH',{}, {restaurantId:'shop-a',mode:'grant',plan:'essencial',tier,durationDays,reason:'Plano liberado pelo administrador.',expectedVersion:version});assert.equal(r.status,200,await r.clone().text());version++;const quota=await f.load('lib/ai-budget.ts').budgetAllowance('owner-a','image');assert.equal(quota.limit,tier==='pro'?null:1);assert.equal(quota.scope,tier==='pro'?'fair_use':'trial');}
  const audit=f.db.prepare('SELECT tier FROM account_access_events ORDER BY rowid').all();assert.deepEqual(audit.map(r=>r.tier),['free','free','free','free','pro','pro','pro','pro']);assert.deepEqual(f.db.prepare('SELECT * FROM restaurants ORDER BY id').all(),before);
  const blocked=await f.call('adminAccess','PATCH',{}, {restaurantId:'shop-a',mode:'suspended',reason:'Conta pausada para análise.',expectedVersion:version});assert.equal(blocked.status,200);f.state.user={userId:'owner-a',displayName:'Dono',email:'owner@example.test'};assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},request('prepare'))).status,403);
 }finally{f.close();}
});
test('admin initiates review from a customer without approving silently; explicit current-data approval is audited',async()=>{
 const f=fixture({verified:false});try{f.env.PLATFORM_ADMIN_ACCOUNT_ID='owner-b';f.state.user={userId:'owner-b',displayName:'Admin',email:'admin@example.test'};const req=new Request(site+'/api/admin/store-verifications?restaurantId=shop-a');const read=await f.dispatch('verificationAdmin','GET',req),store=(await read.json()).store;assert.equal(store.status,'unverified');
  const start=await f.call('verificationAdmin','POST',{}, {restaurantId:'shop-a',expectedVersion:store.version,identityHash:store.identityHash});assert.equal(start.status,200,await start.clone().text());const pending=(await start.json()).verification;assert.equal(pending.status,'pending');assert.equal(pending.siteOrderingAllowed,false);
  const body={restaurantId:'shop-a',expectedVersion:pending.version,identityHash:pending.identityHash,decision:'approved',reason:'Vínculo e recebedor conferidos por contato cadastrado.',confirmedReview:true};
  assert.equal((await f.call('verificationAdmin','PATCH',{}, {...body,confirmedReview:false})).status,400);const approved=await f.call('verificationAdmin','PATCH',{},body);assert.equal(approved.status,200,await approved.clone().text());assert.equal((await approved.json()).verification.siteOrderingAllowed,true);assert.deepEqual(f.db.prepare('SELECT action FROM store_verification_events ORDER BY rowid').all().map(r=>r.action),['pending','approved']);
  f.state.user={userId:'owner-a',displayName:'Dono',email:'owner@example.test'};assert.equal((await f.call('verificationAdmin','POST',{}, {restaurantId:'shop-a',expectedVersion:2,identityHash:store.identityHash})).status,403);
 }finally{f.close();}
});

test('Pro has no monthly quota; one active generation is shared across shops and grant renewal preserves usage',async()=>{
 const f=fixture();enable(f);const provider=mockedProvider(f);try{
  const stamp=new Date().toISOString();f.db.prepare("INSERT INTO account_access(owner_id,mode,tier,plan,expires_at,updated_by,updated_at) VALUES('owner-a','grant','pro','essencial',?,'admin',?)").run(second()+10*86400,stamp);f.db.prepare("UPDATE restaurants SET owner_id='owner-a' WHERE id='shop-b'").run();
  const body=()=>({requestId:crypto.randomUUID(),asset:'logo',description:'Marca de forno e pizza para este ensaio.',theme:'editorial',accent:'#bd391d'});
  const responses=await Promise.all(Array.from({length:8},(_,i)=>f.call('images','POST',{id:i%2?'shop-a':'shop-b'},body())));assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(provider.counts().images,1);
  const budget=f.load('lib/ai-budget.ts'),before=await budget.budgetAllowance('owner-a','image');assert.equal(before.used,1);assert.equal(before.limit,null);assert.equal(before.scope,'fair_use');
  f.db.prepare("UPDATE account_access SET expires_at=?,updated_at=? WHERE owner_id='owner-a'").run(second()+90*86400,new Date().toISOString());const after=await budget.budgetAllowance('owner-a','image');assert.equal(after.period,before.period);assert.equal(after.used,1);assert.equal(after.limit,null);
 }finally{provider.close();f.close();}
});

test('curated business concepts require the exact public store/catalog match and remain a valid optional draft patch',()=>{
 const names=['Pizza calabresa molho mussarela calabresa cebola azeitonas orégano','Frango catupirry.molho frango desfiado mussarela catupirry orégano azeitonas','Mussarela. Molho mussarela orégano azeitonas','Pizza presunto.molho mussarela presunto orégano azeitonas'];
 const data={...demoRestaurant(),name:'EFATA PIZZARIA',cover:'',products:names.map((name,i)=>({...demoRestaurant().products[0],id:'synthetic-'+i,name,image:''}))};const first=curatedWelcome('efata-pizzaria',data,1),second=curatedWelcome('efata-pizzaria',data,2);assert.equal(first.images.length,2);assert.equal(second.images.length,2);assert.equal(curatedWelcome('another-store',data,1),null);assert.equal(curatedWelcome('efata-pizzaria',{...data,name:'Other'},1),null);assert.equal(curatedWelcome('efata-pizzaria',{...data,products:data.products.map((p,i)=>i? p:{...p,name:p.name+' ingrediente diferente'})},1),null);
 assert.equal(restaurantSchema.safeParse({...data,...suggestedMenuPatch(data,first.proposal,first.images)}).success,true);
});
