// Real route/policy logic on a disposable DB. External models are simulated.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-backend-fixture.mjs';
import {demoRestaurant,restaurantSchema} from '../lib/domain.ts';
import {ownerControlInput,resolveOwnerCommand} from '../lib/owner-control-policy.ts';
const now=new Date('2026-10-29T18:30:00Z');
function data(){const d=demoRestaurant();d.products=d.products.map((p,i)=>({...p,name:i===0?'Margherita':p.name}));return d;}
function input(message,selection={},snapshot=data(),patch={}){return ownerControlInput.parse({requestId:crypto.randomUUID(),message,snapshot,selection,...patch});}
function grant(f){f.db.prepare("INSERT INTO account_access(owner_id,mode,tier,plan,expires_at,updated_by,updated_at,catalog_version) VALUES('owner-a','grant','pro','profissional',?,'test',?,3)").run(Math.floor(Date.now()/1000)+86400,new Date().toISOString());}
function enable(f){Object.assign(f.env,{PEDIDO_AI_PLAN_QUOTAS:'true',PEDIDO_STUDIO_ENABLED:'true',PEDIDO_STUDIO_ENDPOINT:'https://pedido-on-imagens.lovable.app/api/pedido-on/studio'});}
const snapshot=f=>JSON.stringify(['restaurants','orders','asaas_payments','account_access','store_verifications'].map(t=>f.db.prepare('SELECT * FROM '+t).all()));
test('a specific promotion is a local, exact-price preview with Brasília validity and unchanged catalog',()=>{
 const d=data(),before=JSON.stringify(d),r=resolveOwnerCommand(input('Coloque a Margherita grande na promoção por R$ 39,90 hoje',{},d),now);
 assert.equal(r.status,'preview');assert.equal(r.source,'direct');assert.equal(r.patch.promotions.length,1);const p=r.patch.promotions[0];assert.equal(p.price,3990);assert.equal(p.productId,d.products[0].id);assert.equal(p.size,'g');assert.equal(p.endsAt,'2026-10-30T03:00:00.000Z');assert.equal(p.startsAt,now.toISOString());assert.equal(JSON.stringify(d),before);assert.equal(r.patch.products,undefined);assert.equal(r.patch.pix,undefined);assert.ok(r.changes[0].after.includes('39,90'));assert.equal(restaurantSchema.safeParse({...d,...r.patch}).success,true);
});
test('an incomplete request asks only for product, size, price and validity and never invents an offer',()=>{
 const d=data(),message='Coloque uma pizza na promoção';let r=resolveOwnerCommand(input(message,{},d),now);assert.equal(r.status,'clarify');assert.equal(r.patch,undefined);assert.equal(r.form.kind,'promotion');
 r=resolveOwnerCommand(input(message,{productId:d.products[0].id},d),now);assert.match(r.reply,/tamanho/);assert.equal(r.patch,undefined);
 r=resolveOwnerCommand(input(message,{productId:d.products[0].id,size:'g'},d),now);assert.match(r.reply,/preço/);
 r=resolveOwnerCommand(input(message,{productId:d.products[0].id,size:'g',price:3990},d),now);assert.match(r.reply,/quando/);
 r=resolveOwnerCommand(input(message,{productId:d.products[0].id,size:'g',price:3990,endsAt:'2026-10-30T03:00:00Z'},d),now);assert.equal(r.status,'preview');assert.equal(r.patch.promotions[0].price,3990);
});
test('similar names, contradictory selection and unavailable sizes cannot silently target another product',()=>{
 const d=data(),first=d.products[0];d.products=[{...first,name:'Calabresa molho da casa'},{...first,id:'second',name:'Calabresa. Receita especial'}];
 const r=resolveOwnerCommand(input('Mude o preço da calabresa grande para R$ 39,90',{},d),now);assert.equal(r.status,'clarify');assert.match(r.reply,/mais de um/);assert.equal(r.form.products.length,2);
 assert.throws(()=>resolveOwnerCommand(input('Pause a calabresa',{productId:'foreign'},d),now));
 const normal=data(),chosen=normal.products.find(p=>p.id!==normal.products[0].id);assert.equal(resolveOwnerCommand(input('Mude o preço da Margherita grande para 39,90',{productId:chosen.id},normal),now).status,'clarify');
 const one=data();one.products[0].sizes={p:0,m:0,g:5900};const single=resolveOwnerCommand(input('Mude o preço da Margherita para 39,90',{},one),now);assert.equal(single.patch.products[0].sizes.g,3990);assert.equal(single.patch.products[0].sizes.p,0);
});
test('promotion and delivery amounts are kept separate; ambiguous or malformed amounts need clarification',()=>{
 assert.equal(resolveOwnerCommand(input('Coloque Margherita grande na promoção por R$ 39,90 hoje com entrega R$ 8,00'),now).patch.promotions[0].price,3990);
 assert.equal(resolveOwnerCommand(input('Coloque Margherita grande na promoção R$ 39,90 e R$ 29,90 hoje'),now).status,'clarify');
 for(const value of ['R$ -9','R$ 39,999','R$ 1.000,00','R$ 0'])assert.equal(resolveOwnerCommand(input('Mude o preço da Margherita grande para '+value),now).status,'clarify',value);
});
test('percentage offers, renewal and ending an offer preserve identifiers and original prices',()=>{
 const d=data(),first=resolveOwnerCommand(input('Coloque Margherita grande na promoção com 10% de desconto hoje',{},d),now),p=first.patch.promotions[0];assert.equal(p.price,Math.round(d.products[0].sizes.g*.9));
 const updated={...d,...first.patch},next=resolveOwnerCommand(input('Coloque Margherita grande na promoção por R$ 40,99 hoje',{},updated),now);assert.equal(next.patch.promotions.length,1);assert.equal(next.patch.promotions[0].id,p.id);assert.equal(next.patch.promotions[0].price,4099);
 const ended=resolveOwnerCommand(input('Tire Margherita grande da promoção',{},updated),now);assert.equal(ended.patch.promotions[0].enabled,false);assert.equal(ended.patch.promotions[0].id,p.id);assert.equal(ended.patch.products,undefined);
});
test('an expired end time and a paused product never become an active offer by inference',()=>{
 assert.equal(resolveOwnerCommand(input('Coloque Margherita grande na promoção por R$ 39,90 até 10h'),now).status,'clarify');
 const d=data();d.products[0].enabled=false;const r=resolveOwnerCommand(input('Coloque Margherita grande na promoção por R$ 39,90 hoje',{},d),now);assert.equal(r.status,'clarify');assert.match(r.reply,/pausado/);assert.equal(r.patch,undefined);
 const tomorrow=resolveOwnerCommand(input('Coloque Margherita grande na promoção por R$ 39,90 amanhã'),now).patch.promotions[0];assert.equal(tomorrow.startsAt,'2026-10-30T03:00:00.000Z');assert.equal(tomorrow.endsAt,'2026-10-31T03:00:00.000Z');
});
test('bulk repricing rounds cents, preserves unavailable sizes, drinks, Pix, coupons and promotions',()=>{
 const d=data();d.products[0].sizes.p=0;const before=JSON.stringify(d),r=resolveOwnerCommand(input('Aumente todas as pizzas em 10%',{},d),now);
 assert.equal(r.status,'preview');for(const p of r.patch.products){const old=d.products.find(v=>v.id===p.id);if(p.kind==='pizza')for(const size of ['p','m','g'])assert.equal(p.sizes[size],old.sizes[size]>0?Math.round(old.sizes[size]*1.1):0);else assert.deepEqual(p,old);}
 assert.equal(r.patch.pix,undefined);assert.equal(r.patch.coupon,undefined);assert.equal(r.patch.promotions,undefined);assert.equal(JSON.stringify(d),before);
 assert.equal(resolveOwnerCommand(input('Reduza todas as pizzas em 100%'),now).status,'clarify');
});
test('explicit shop facts, status, delivery, literal texts and product availability use no generative interpretation',()=>{
 const d=data();
 for(const [message,key,value] of [['Mude o horário para Segunda à quinta, 18h às 23h','hours','Segunda à quinta, 18h às 23h'],['Mude a cidade para São José','city','São José'],['Mude a taxa de entrega para R$ 8,00','deliveryFee',800],['Mude o pedido mínimo para 35,00','minOrder',3500],['Feche a loja','isOpen',false],['Ative a entrega','deliveryEnabled',true],['Desative a retirada','pickupEnabled',false],['Slogan: Feita com carinho.','tagline','Feita com carinho.'],['Descrição da loja: Ofertas da casa, sem pressa.','description','Ofertas da casa, sem pressa.']]){const r=resolveOwnerCommand(input(message,{},d),now);assert.equal(r.status,'preview',message);assert.equal(r.patch[key],value,message);}
 const paused=resolveOwnerCommand(input('Pause a Margherita',{},d),now);assert.equal(paused.patch.products[0].enabled,false);
 const copy=resolveOwnerCommand(input('Mude a descrição da Margherita para Disponível na nossa oferta artesanal.',{},d),now);assert.equal(copy.patch.products[0].description,'Disponível na nossa oferta artesanal.');assert.equal(copy.patch.promotions,undefined);
});
test('questions, negation, compound uncertainty, account settings and images never create commercial changes',()=>{
 for(const message of ['Como faço uma promoção?','Não coloque a Margherita na promoção','Mude a senha','Troque a chave Pix para minha conta','Coloque duas pizzas na promoção por 59,90 hoje','Mude o preço e pause outro sabor','Crie uma imagem da promoção','Crie uma legenda para WhatsApp']){const r=resolveOwnerCommand(input(message),now);assert.equal(r.status,'clarify',message);assert.equal(r.patch,undefined,message);}
 assert.equal(resolveOwnerCommand(input('Mude o nome para Forno da Vila'),now).patch.name,'Forno da Vila');
 assert.equal(resolveOwnerCommand(input('Quero um visual escuro para o cardápio'),now).source,'direct');
 assert.equal(resolveOwnerCommand(input('Reescreva a descrição da Margherita com um texto apetitoso'),now).status,'creative');
});
test('explicit new products get only the owner-provided name, size and price, without invented ingredients or photos',()=>{
 const d=data(),r=resolveOwnerCommand(input('Adicione pizza Pepperoni grande por R$ 59,90',{},d),now),p=r.patch.products.at(-1);
 assert.equal(p.name,'Pepperoni');assert.equal(p.sizes.g,5990);assert.equal(p.sizes.p,0);assert.equal(p.description,'');assert.equal(p.image,'');assert.equal(d.products.some(p=>p.name==='Pepperoni'),false);assert.ok(r.changes.some(c=>c.after.includes('59,90')));assert.equal(restaurantSchema.safeParse({...d,...r.patch}).success,true);
 assert.equal(resolveOwnerCommand(input('Adicione pizza Pepperoni',{},d),now).status,'clarify');assert.equal(resolveOwnerCommand(input('Adicione pizza Margherita grande por 39,90',{},d),now).status,'clarify');
 const drink=resolveOwnerCommand(input('Adicione bebida Água mineral por R$ 6,00',{},d),now).patch.products.at(-1);assert.equal(drink.kind,'simple');assert.equal(drink.price,600);
});
test('owner control is owner-bound, Pro-only, private and CSRF-protected before any model request',async()=>{
 const f=fixture(),original=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('No external call');};try{
  f.state.user=null;assert.equal((await f.call('ownerControl','GET',{id:'shop-a'})).status,401);f.state.user={userId:'owner-a',displayName:'Owner',email:'test@example.test'};
  const body=input('Mude o preço da Margherita grande para 39,90',{},f.data);
  assert.equal((await f.call('ownerControl','GET',{id:'shop-b'})).status,404);const free=await f.call('ownerControl','GET',{id:'shop-a'});assert.equal((await free.json()).allowed,false);assert.equal((await f.call('ownerControl','POST',{id:'shop-a'},body)).status,403);
  grant(f);assert.equal((await f.call('ownerControl','POST',{id:'shop-a'},body,{'x-pedido-csrf':'wrong'})).status,403);
  assert.equal((await f.call('ownerControl','POST',{id:'shop-b'},body)).status,404);const ok=await f.call('ownerControl','POST',{id:'shop-a'},body);assert.equal(ok.status,200,await ok.clone().text());assert.match(ok.headers.get('Cache-Control'),/no-store/);assert.equal(calls,0);
  f.db.prepare("UPDATE account_access SET mode='suspended'").run();assert.equal((await f.call('ownerControl','POST',{id:'shop-a'},body)).status,403);
 }finally{globalThis.fetch=original;f.close();}
});
test('simple previews do not mutate drafts, publication, orders, subscription, verification or AI budgets',async()=>{
 const f=fixture(),original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Direct operations must never call the provider');};try{enable(f);grant(f);const before=snapshot(f),message='Coloque a Margherita grande na promoção por R$ 39,90 hoje',body=input(message,{},f.data);
  for(const mode of ['smart','ai']){const r=await f.call('ownerControl','POST',{id:'shop-a'},{...body,mode});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).source,'direct');}
  assert.equal(snapshot(f),before);for(const table of ['studio_jobs','image_jobs','ai_budget_reservations','ai_job_receipts'])assert.equal(f.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0,table);
  const foreign={...body,snapshot:{...body.snapshot,logo:'/media/shop-b/foreign.png'}};assert.equal((await f.call('ownerControl','POST',{id:'shop-a'},foreign)).status,400);
 }finally{globalThis.fetch=original;f.close();}
});
test('creative AI reuses the existing one-use text job, sends selected context and never generates an image or repeats a paid request',async()=>{
 const f=fixture(),original=globalThis.fetch;try{enable(f);grant(f);const message='Reescreva a descrição da Margherita com um texto mais apetitoso',body=input(message,{},f.data,{mode:'ai'}),before=snapshot(f);let calls=0;
  globalThis.fetch=async(url,init)=>{calls++;assert.ok(url.endsWith('/studio'));const claim=await f.call('studioClaim','POST',{},JSON.parse(init.body));assert.equal(claim.status,200);const prompt=JSON.parse((await claim.json()).prompt);assert.equal(prompt.products.length,1);assert.equal(prompt.products[0].id,f.data.products[0].id);assert.doesNotMatch(JSON.stringify(prompt),/token_hash|sealed_tokens/);return Response.json({reply:'Confira o texto da pizza.',productDescriptions:[{id:f.data.products[0].id,description:'Os ingredientes da casa em uma boa pedida.'}]});};
  const r=await f.call('ownerControl','POST',{id:'shop-a'},body);assert.equal(r.status,200,await r.clone().text());const result=await r.json();assert.equal(result.source,'ai');assert.equal(result.patch.products[0].description,'Os ingredientes da casa em uma boa pedida.');assert.equal((await f.call('ownerControl','POST',{id:'shop-a'},body)).status,200);assert.equal(calls,1);assert.equal(snapshot(f),before);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM image_jobs').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ai_job_receipts').get().n,1);
 }finally{globalThis.fetch=original;f.close();}
});
test('model output cannot smuggle a price or Pix change; ambiguous failures are not repeated',async()=>{
 const f=fixture(),original=globalThis.fetch;try{enable(f);grant(f);const body=input('Reescreva a descrição da Margherita com um texto mais apetitoso',{},f.data,{mode:'ai'}),before=snapshot(f);let calls=0;
  globalThis.fetch=async(url,init)=>{calls++;assert.equal((await f.call('studioClaim','POST',{},JSON.parse(init.body))).status,200);return Response.json({reply:'Tudo mudou.',productDescriptions:[],pix:{enabled:true},price:1});};
  assert.equal((await f.call('ownerControl','POST',{id:'shop-a'},body)).status,502);assert.equal((await f.call('ownerControl','POST',{id:'shop-a'},body)).status,409);assert.equal(calls,1);assert.equal(snapshot(f),before);assert.equal(f.db.prepare('SELECT state FROM studio_jobs').get().state,'failed');
 }finally{globalThis.fetch=original;f.close();}
});
