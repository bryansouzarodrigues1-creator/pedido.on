// Disposable DB and simulated providers only. Never spends AI or billing credits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,png} from './test-backend-fixture.mjs';
import {brasiliaDay,creationLimitReached} from '../lib/ai-offer-policy.ts';
const stamp=()=>new Date().toISOString(),seconds=()=>Math.floor(Date.now()/1000);
function enable(f){Object.assign(f.env,{PEDIDO_AI_PLAN_QUOTAS:'true',PEDIDO_IMAGE_ENABLED:'true',PEDIDO_IMAGE_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/image',PEDIDO_STUDIO_ENABLED:'true',PEDIDO_STUDIO_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/studio'});}
function trial(f){f.db.prepare('INSERT INTO account_trials(owner_id,registered_at,started_at,ends_at,offer_version) VALUES(?,?,?,?,3)').run('owner-a',stamp(),seconds()-6*86400,seconds()+4*86400);}
function grant(f,plan){f.db.prepare("INSERT INTO account_access(owner_id,mode,tier,plan,expires_at,updated_by,updated_at,catalog_version) VALUES('owner-a','grant',?,?,?,'test',?,3)").run(plan==='profissional'?'pro':'',plan,seconds()+30*86400,stamp());}
const input=()=>({requestId:crypto.randomUUID(),asset:'logo',description:'Forno artesanal e pizza da minha loja.',theme:'editorial',accent:'#bd391d'});
function job(f,id,date=stamp(),shop='shop-a',campaign=''){f.db.prepare("INSERT INTO image_jobs(id,owner_id,restaurant_id,request_id,input_hash,token_hash,prompt,asset,state,period_key,created_at,expires_at,updated_at,campaign_key) VALUES(?,'owner-a',?,?, 'hash','token','PRIVATE_PROMPT','product','completed',?,?,?,?,?)").run(id,shop,id,date.slice(0,7),date,date,date,campaign);}
test('daily entitlement turns over at Brasília midnight, including leap days; unlimited UI never treats null as zero',()=>{
 assert.equal(brasiliaDay(new Date('2026-10-29T02:59:59Z')).period,'day:2026-10-28');
 assert.equal(brasiliaDay(new Date('2026-10-29T03:00:00Z')).start,'2026-10-29T03:00:00.000Z');
 assert.equal(brasiliaDay(new Date('2028-02-29T04:00:00Z')).end,'2028-03-01T03:00:00.000Z');
 assert.equal(creationLimitReached({used:500,limit:null}),false);assert.equal(creationLimitReached({used:3,limit:3}),true);
});
test('new trial kit and studio share exactly one image and one AI text; replay cannot create another expense',async()=>{
 const f=fixture(),original=globalThis.fetch;try{enable(f);trial(f);let images=0,texts=0;
 globalThis.fetch=async(url,init)=>{const image=url.endsWith('/image'),claim=await f.call(image?'imageClaim':'studioClaim','POST',{},JSON.parse(init.body));assert.equal(claim.status,200);if(image){images++;return new Response(png,{headers:{'content-type':'image/png'}});}texts++;return Response.json({reply:'Sabores da casa para reunir quem você gosta.',productDescriptions:[]});};
 const req=action=>({round:1,action,revision:1,brief:'Uma foto apetitosa com a cor da marca.'});
 for(const action of ['prepare','text','image1']){const r=await f.call('trialCampaigns','POST',{id:'shop-a'},req(action));assert.equal(r.status,200,await r.clone().text());}
 assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},req('image1'))).status,200);
 assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},req('image2'))).status,403);
 assert.equal((await f.call('trialCampaigns','POST',{id:'shop-a'},{...req('image1'),round:2})).status,403);
 assert.equal((await f.call('images','POST',{id:'shop-a'},input())).status,429);
 const budget=f.load('lib/ai-budget.ts');assert.equal((await budget.budgetAllowance('owner-a','image')).used,1);assert.equal((await budget.budgetAllowance('owner-a','text')).used,1);
 assert.deepEqual([images,texts],[1,1]);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ai_job_receipts').get().n,2);
 const row=f.db.prepare('SELECT * FROM ai_job_receipts LIMIT 1').get();assert.equal(row.input_tokens,null);assert.equal(row.cost_microusd,null);assert.doesNotMatch(JSON.stringify(row),/PRIVATE_PROMPT|token_hash|brief/);
 }finally{globalThis.fetch=original;f.close();}
});
test('Essential daily allowance counts campaign and ordinary jobs across all shops, but excludes yesterday and refunds',async()=>{
 const f=fixture();try{enable(f);grant(f,'essencial');f.db.prepare("UPDATE restaurants SET owner_id='owner-a' WHERE id='shop-b'").run();const day=brasiliaDay();
 job(f,'yesterday',new Date(Date.parse(day.start)-1).toISOString());job(f,'first',stamp(),'shop-a','welcome');job(f,'second',stamp(),'shop-b');job(f,'third');job(f,'returned');f.db.prepare("UPDATE image_jobs SET state='cancelled' WHERE id='returned'").run();
 const usage=await f.load('lib/ai-budget.ts').budgetAllowance('owner-a','image');assert.equal(usage.limit,3);assert.equal(usage.used,3);assert.equal(usage.scope,'day');assert.equal((await f.call('images','POST',{id:'shop-b'},input())).status,429);
 f.db.prepare("UPDATE account_access SET updated_at=?,expires_at=? WHERE owner_id='owner-a'").run(stamp(),seconds()+90*86400);assert.equal((await f.load('lib/ai-budget.ts').budgetAllowance('owner-a','image')).used,3);
 }finally{f.close();}
});
test('Pro passes the former twenty-image ceiling while global estimated budget and suspension still stop new expenses',async()=>{
 const f=fixture(),original=globalThis.fetch;try{enable(f);grant(f,'profissional');for(let n=0;n<21;n++)job(f,'old-'+n);let calls=0;
 globalThis.fetch=async(url,init)=>{calls++;assert.equal((await f.call('imageClaim','POST',{},JSON.parse(init.body))).status,200);return new Response(png,{headers:{'content-type':'image/png','x-pedido-ai-model':'simulated/model','x-pedido-ai-input-tokens':'10','x-pedido-ai-output-tokens':'20','x-pedido-ai-cost-microusd':'6000'}});};
 const r=await f.call('images','POST',{id:'shop-a'},input());assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).usage.limit,null);assert.equal(calls,1);
 const receipt=f.db.prepare('SELECT * FROM ai_job_receipts').get();assert.equal(receipt.cost_microusd,6000);assert.equal(receipt.input_tokens,10);
 f.db.prepare("INSERT INTO ai_budget_reservations VALUES('global','other','image','old',?,'month',20000000,'consumed',?)").run(stamp().slice(0,7),stamp());assert.equal((await f.call('images','POST',{id:'shop-a'},input())).status,429);assert.equal(calls,1);
 f.db.prepare("UPDATE account_access SET mode='suspended'").run();assert.equal((await f.load('lib/ai-budget.ts').budgetAllowance('owner-a','image')).available,false);
 }finally{globalThis.fetch=original;f.close();}
});
test('financial report distinguishes missing receipts, measured tokens and partial costs; it makes no external calls',async()=>{
 const f=fixture(),original=globalThis.fetch;try{globalThis.fetch=()=>{throw Error('No external request permitted');};job(f,'known');job(f,'unknown');
 f.db.prepare("INSERT INTO ai_job_receipts(id,owner_id,restaurant_id,kind,purpose,provider,input_tokens,output_tokens,cost_microusd,created_at) VALUES('known','owner-a','shop-a','image','image','simulated',10,20,6000,?)").run(stamp());
 const report=await f.load('lib/admin-finance.ts').adminFinance('2000-01-01',stamp(),'2000-01-01','2099-01-01');const row=report.runtime[0];assert.equal(row.attempts,2);assert.equal(row.costReports,1);assert.equal(row.costMicrousd,6000);assert.equal(row.tokenReports,1);assert.equal(row.inputTokens,10);assert.equal(report.payments.length,0);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_PROMPT|owner-a|token_hash/);
 }finally{globalThis.fetch=original;f.close();}
});
