import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-backend-fixture.mjs';
import {demoRestaurant} from '../lib/domain.ts';
import {proposalPatch,studioImagePatch,studioEndpoint,localStudio,studioLimits,studioPrompt,studioInput} from '../lib/studio-policy.ts';
const endpoint='https://pedido-on-imagens.lovable.app/api/pedido-on/studio';
const suggestion={reply:'Prévia preparada. Confira antes de aplicar.',theme:'dark',accent:'#dc3828',productDescriptions:[{id:'margherita',description:'Molho de tomate, mozzarella e manjericão.'}]};
const input=(data,patch={})=>({requestId:crypto.randomUUID(),mode:'ai',message:'Cardápio escuro e textos mais claros.',snapshot:data,history:[],...patch});
function enable(f){f.env.PEDIDO_STUDIO_ENABLED='true';f.env.PEDIDO_STUDIO_ENDPOINT=endpoint;}
test('studio proposals only update identity and descriptions, preserving products and Pix',()=>{
 const data={...demoRestaurant(),pix:{enabled:true,type:'email',key:'protected@example.test',recipient:'Nome'}};
 const p=proposalPatch(suggestion,data),merged={...data,...p};assert.deepEqual(merged.pix,data.pix);assert.deepEqual(merged.products.map(p=>p.prices),data.products.map(p=>p.prices));assert.deepEqual(merged.products.map(p=>p.name),data.products.map(p=>p.name));
 for(const bad of [{...suggestion,prices:{g:1}},{...suggestion,accent:'url(evil)'},{...suggestion,productDescriptions:[{id:'other-shop',description:'x'}]},{...suggestion,productDescriptions:[suggestion.productDescriptions[0],suggestion.productDescriptions[0]]}])assert.throws(()=>proposalPatch(bad,data));
 const photo=studioImagePatch(merged,{asset:'product',productId:'margherita',url:'/media/shop-a/pizza.png'});assert.equal(photo.products[0].description,'Molho de tomate, mozzarella e manjericão.');assert.deepEqual(photo.products[0].prices,data.products[0].prices);assert.throws(()=>studioImagePatch(data,{asset:'product',productId:'other-shop',url:'/media/shop-a/pizza.png'}));assert.throws(()=>studioImagePatch(data,{asset:'logo',url:'javascript:alert(1)'}));
});
test('local styles are honest and the AI prompt excludes payment and customer data',()=>{
 const data=demoRestaurant(),s=localStudio('Cardápio escuro, vermelho. Slogan: Sua noite pede pizza.',data);assert.equal(s.theme,'dark');assert.equal(s.accent,'#dc3828');assert.equal(s.tagline,'Sua noite pede pizza.');assert.ok(s.reply.includes('estilos prontos'));
 const photo=localStudio('Foto ilustrativa da minha pizza, sem alterar os ingredientes.',data,'margherita');assert.equal(photo.imageBrief.asset,'product');assert.equal(photo.imageBrief.productId,'margherita');
 const prompt=studioPrompt(studioInput.parse(input({...data,whatsapp:'(11) 99999-1234',pix:{enabled:true,type:'email',key:'private@example.test',recipient:'private-recipient'}})));for(const secret of ['(11) 99999-1234','private@example.test','private-recipient'])assert.equal(prompt.includes(secret),false);
 assert.equal(studioEndpoint(endpoint),endpoint);for(const url of ['http://a.lovable.app/api/pedido-on/studio','https://evil.test/api/pedido-on/studio',endpoint+'?redirect=evil','https://a.lovable.app:444/api/pedido-on/studio'])assert.equal(studioEndpoint(url),'');
});
test('local styles work with AI disabled; disabled AI, foreign shops and cross-origin never call providers',async()=>{
 const f=fixture(),original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 try{const local=await f.call('studio','POST',{id:'shop-a'},input(f.data,{mode:'local'}));assert.equal(local.status,200,await local.clone().text());assert.equal((await local.json()).mode,'local');assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data))).status,503);enable(f);assert.equal((await f.call('studio','POST',{id:'shop-b'},input(f.data))).status,404);assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data),{Origin:'https://evil.test'})).status,403);assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data,{model:'expensive'}))).status,400);assert.equal(calls,0);}finally{globalThis.fetch=original;f.close();}
});
test('single-use studio claims and identical requests reuse one proposal without editing the shop',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,endpoint);assert.equal(options.redirect,'manual');const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body).sort(),['jobId','token']);const claim=await f.call('studioClaim','POST',{},body);assert.equal(claim.status,200);const c=await claim.json();assert.equal(c.protocol,'pedido-studio-v1');assert.equal(c.prompt.includes(f.data.pix.key),false);assert.equal((await f.call('studioClaim','POST',{},body)).status,401);return Response.json(suggestion);};
 try{const body=input(f.data),before=f.db.prepare('SELECT data,published_data FROM restaurants WHERE id=?').get('shop-a'),r=await f.call('studio','POST',{id:'shop-a'},body);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).usage.used,1);assert.equal((await f.call('studio','POST',{id:'shop-a'},body)).status,200);assert.equal(calls,1);assert.equal((await f.call('studio','POST',{id:'shop-a'},{...body,message:'Outra mensagem completamente diferente.'})).status,409);assert.deepEqual(f.db.prepare('SELECT data,published_data FROM restaurants WHERE id=?').get('shop-a'),before);assert.equal(f.objects.size,0);}finally{globalThis.fetch=original;f.close();}
});
test('monthly studio quota spans stores owned by the same account and failed claimed attempts remain counted',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;f.db.prepare('UPDATE restaurants SET owner_id=? WHERE id=?').run('owner-a','shop-b');
 globalThis.fetch=async(_url,options)=>{calls++;assert.equal((await f.call('studioClaim','POST',{},JSON.parse(options.body))).status,200);return new Response('unavailable',{status:502});};
 try{const now=new Date().toISOString();for(let i=0;i<studioLimits.monthly-1;i++)f.db.prepare("INSERT INTO studio_jobs(id,owner_id,restaurant_id,request_id,input_hash,token_hash,prompt,state,period_key,created_at,expires_at,updated_at) VALUES (?,?,?,?,?,?,?,'failed',?,?,?,?)").run(crypto.randomUUID(),'owner-a','shop-a',crypto.randomUUID(),'hash','hash','{}',now.slice(0,7),'2026-01-01',now,now);
 assert.equal((await f.call('studio','POST',{id:'shop-b'},input(f.data))).status,503);assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data))).status,429);assert.equal(calls,1);assert.equal((await (await f.call('studio','GET',{id:'shop-a'})).json()).used,20);}finally{globalThis.fetch=original;f.close();}
});
test('empty-balance rejections refund, invalid/expired claims deny and invalid proposals never reach drafts',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);
 try{globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);assert.equal((await f.call('studioClaim','POST',{},{...body,token:'bc'.repeat(32)})).status,401);assert.equal((await f.call('studioClaim','POST',{},body)).status,200);return new Response('no credits',{status:402});};assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data))).status,503);assert.equal((await (await f.call('studio','GET',{id:'shop-a'})).json()).used,0);
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);f.db.prepare("UPDATE studio_jobs SET expires_at='2000-01-01' WHERE id=?").run(body.jobId);assert.equal((await f.call('studioClaim','POST',{},body)).status,401);return new Response('expired',{status:401});};assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data))).status,503);assert.equal((await (await f.call('studio','GET',{id:'shop-a'})).json()).used,0);
 globalThis.fetch=async(_url,options)=>{assert.equal((await f.call('studioClaim','POST',{},JSON.parse(options.body))).status,200);return Response.json({...suggestion,pix:{key:'hacked'}});};assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data))).status,502);assert.equal(JSON.parse(f.db.prepare('SELECT data FROM restaurants WHERE id=?').get('shop-a').data).pix.key,f.data.pix.key);}finally{globalThis.fetch=original;f.close();}
});
test('concurrent repeats reserve once and an unclaimed response is never trusted',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;
 globalThis.fetch=async(_url,options)=>{calls++;assert.equal((await f.call('studioClaim','POST',{},JSON.parse(options.body))).status,200);return Response.json(suggestion);};
 try{const body=input(f.data),responses=await Promise.all([f.call('studio','POST',{id:'shop-a'},body),f.call('studio','POST',{id:'shop-a'},body)]);assert.ok(responses.every(r=>[200,409].includes(r.status)));assert.ok(responses.some(r=>r.status===200));assert.equal(calls,1);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM studio_jobs').get().n,1);
 globalThis.fetch=async()=>Response.json(suggestion);assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data))).status,502);assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM studio_jobs WHERE state='completed'").get().n,1);}finally{globalThis.fetch=original;f.close();}
});
test('studio remains bound to the selected product and cannot propose a different photo or text',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);
 globalThis.fetch=async(_url,options)=>{assert.equal((await f.call('studioClaim','POST',{},JSON.parse(options.body))).status,200);return Response.json({...suggestion,productDescriptions:[],imageBrief:{asset:'product',productId:f.data.products[1].id,description:'Foto ilustrativa somente deste produto.'}});};
 try{assert.equal((await f.call('studio','POST',{id:'shop-a'},input(f.data,{productId:'margherita'}))).status,502);}finally{globalThis.fetch=original;f.close();}
});

test('studio connection failures before claim return an accurate uncharged result',async()=>{
 const f=fixture(),original=globalThis.fetch;enable(f);let calls=0;
 globalThis.fetch=async()=>{calls++;throw new TypeError('Provider connection failed');};
 try{const body=input(f.data),r=await f.call('studio','POST',{id:'shop-a'},body),v=await r.json();assert.equal(r.status,502);assert.equal(v.attempt,'cancelled');assert.match(v.error,/Nenhuma sugestão foi descontada/);assert.equal((await (await f.call('studio','GET',{id:'shop-a'})).json()).used,0);const retry=await f.call('studio','POST',{id:'shop-a'},body);assert.equal(retry.status,409);assert.equal((await retry.json()).attempt,'cancelled');assert.equal(calls,1);}finally{globalThis.fetch=original;f.close();}
});
