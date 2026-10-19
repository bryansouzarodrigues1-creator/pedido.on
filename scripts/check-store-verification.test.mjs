import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture,png} from './test-backend-fixture.mjs';
const adminId='platform-reviewer';
async function state(f){const r=await f.call('verification','GET',{id:'shop-a'});assert.equal(r.status,200,await r.clone().text());return (await r.json()).verification;}
async function request(f,patch={}){const before=await state(f);return f.call('verification','POST',{id:'shop-a'},{expectedVersion:before.version,liveRevision:before.liveRevision,note:'Loja fictícia para ensaiar a revisão manual.',...patch});}
async function decide(f,decision='approved',patch={}){
 const before=await state(f),old=f.state.user;f.env.PLATFORM_ADMIN_ACCOUNT_ID=adminId;f.state.user={...old,userId:adminId};
 try{return await f.call('verificationAdmin','PATCH',{}, {restaurantId:'shop-a',expectedVersion:before.version,identityHash:before.identityHash,decision,reason:'Conferência fictícia de vínculo e recebedor.',confirmedReview:true,...patch});}finally{f.state.user=old;}
}
const count=(f,table)=>f.db.prepare('SELECT count(*) n FROM '+table).get().n;

test('unverified legacy stores cannot accept site orders, even with forged client approval fields',async()=>{const f=fixture({verified:false});try{
 assert.equal((await state(f)).status,'unverified');
 for(const payment of ['Pix','Dinheiro','Cartão de crédito']){const r=await f.call('create','POST',{slug:'pizzaria-a'},f.input({payment,verified:true,siteOrderingAllowed:true}));assert.equal(r.status,403,await r.clone().text());assert.match((await r.json()).error,/WhatsApp/);}
 assert.equal(count(f,'orders'),0);assert.equal(count(f,'order_events'),0);assert.equal(f.objects.size,0);
}finally{f.close();}});

test('unverified cart goes to WhatsApp with quantities, notes and server prices, without Pix or delivery-approval records',async()=>{const f=fixture({verified:false});try{
 f.env.PEDIDO_DELIVERY_APPROVAL_ENABLED='true';
 const r=await f.call('whatsapp','POST',{slug:'pizzaria-a'},f.input({expectedTotal:17600,items:[{productIds:['calabresa'],size:'g',quantity:2,note:'Sem cebola'},{productIds:['refri'],quantity:1,note:''}]}));
 // A client-supplied total must be reviewed before the WhatsApp handoff.
 if(r.status===409){const b=await r.json();assert.equal(b.quote.payment,'A combinar com a pizzaria pelo WhatsApp');assert.notEqual(b.quote.total,17600);}
 else assert.equal(r.status,200,await r.clone().text());
 const quote=await f.call('whatsapp','POST',{slug:'pizzaria-a'},f.input({items:[{productIds:['calabresa'],size:'g',quantity:2,note:'Sem cebola'},{productIds:['refri'],quantity:1,note:''}]}));assert.equal(quote.status,200,await quote.clone().text());
 const b=await quote.json(),text=new URL(b.whatsappUrl).searchParams.get('text');assert.match(text,/2x Calabresa especial/);assert.match(text,/1x Refrigerante 2 L/);assert.match(text,/Sem cebola/);assert.match(text,/A combinar.*WhatsApp/);assert.doesNotMatch(text,/pizza@example.test|Pix antecipado|comprovante|recebimento aprovado/);assert.equal(new URL(b.whatsappUrl).pathname,'/5511999999999');
 assert.equal(count(f,'orders'),0);assert.equal(count(f,'delivery_checks'),0);assert.equal(count(f,'order_events'),0);assert.equal(f.objects.size,0);
 assert.equal((await f.call('delivery','POST',{slug:'pizzaria-a'},{})).status,403);
}finally{f.close();}});

test('owner verification request requires ownership, CSRF, publication and a current version; duplicate clicks are idempotent',async()=>{const f=fixture({verified:false});try{
 assert.equal((await f.call('verification','GET',{id:'shop-b'})).status,404);
 assert.equal((await f.call('verification','POST',{id:'shop-b'},{})).status,404);
 assert.equal((await f.call('verification','POST',{id:'shop-a'},{expectedVersion:0,liveRevision:1},{'x-pedido-csrf':'00'.repeat(32)})).status,403);
 f.db.prepare('UPDATE restaurants SET published=0 WHERE id=?').run('shop-a');assert.equal((await request(f)).status,400);assert.equal(count(f,'store_verifications'),0);
 f.db.prepare('UPDATE restaurants SET published=1 WHERE id=?').run('shop-a');assert.equal((await request(f,{expectedVersion:99})).status,409);assert.equal((await request(f,{status:'approved'})).status,400);
 const first=await request(f);assert.equal(first.status,201,await first.clone().text());assert.equal((await first.json()).verification.status,'pending');assert.equal((await request(f)).status,200);assert.equal(count(f,'store_verification_events'),1);assert.equal((await f.call('create','POST',{slug:'pizzaria-a'},f.input())).status,403);
}finally{f.close();}});

test('only an authenticated administrator with CSRF and explicit manual review can approve a current request',async()=>{const f=fixture({verified:false});try{
 await request(f);const current=await state(f),payload={restaurantId:'shop-a',expectedVersion:current.version,identityHash:current.identityHash,decision:'approved',reason:'Conferência local de teste.',confirmedReview:true};
 assert.equal((await f.call('verificationAdmin','GET')).status,403);assert.equal((await f.call('verificationAdmin','PATCH',{},payload)).status,403);
 f.env.PLATFORM_ADMIN_ACCOUNT_ID=adminId;f.state.user={...f.state.user,userId:adminId};
 assert.equal((await f.call('verificationAdmin','PATCH',{},payload,{'x-pedido-csrf':'00'.repeat(32)})).status,403);
 assert.equal((await f.call('verificationAdmin','PATCH',{}, {...payload,confirmedReview:false})).status,400);
 assert.equal((await f.call('verificationAdmin','PATCH',{}, {...payload,expectedVersion:99})).status,409);
 const approved=await f.call('verificationAdmin','PATCH',{},payload);assert.equal(approved.status,200,await approved.clone().text());assert.equal((await approved.json()).verification.siteOrderingAllowed,true);
 const order=await f.create();assert.equal(order.order.total,6500);assert.equal(count(f,'store_verification_events'),2);assert.equal((await f.call('verificationAdmin','PATCH',{},payload)).status,409);
}finally{f.close();}});

test('rejection keeps WhatsApp available and an owner can resubmit without approving their own store',async()=>{const f=fixture({verified:false});try{
 await request(f);assert.equal((await decide(f,'rejected')).status,200);assert.equal((await state(f)).status,'rejected');assert.equal((await request(f)).status,201);assert.equal((await state(f)).status,'pending');assert.equal((await f.call('create','POST',{slug:'pizzaria-a'},f.input())).status,403);
 assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},f.input())).status,200);assert.equal(count(f,'store_verification_events'),3);
}finally{f.close();}});

test('identity and Pix edits invalidate approval; product, opening-hours and style edits preserve it',async()=>{const f=fixture();try{
 const update=data=>f.db.prepare('UPDATE restaurants SET published_data=? WHERE id=?').run(JSON.stringify(data),'shop-a');
 for(const patch of [{name:'Outra loja'},{address:'Outro endereço, 200'},{city:'Outra Cidade, RJ'},{whatsapp:'(22) 99999-9999'},{pix:{...f.data.pix,key:'another@example.test'}},{pix:{...f.data.pix,recipient:'Outro titular'}}]){update({...f.data,...patch});assert.equal((await state(f)).status,'changed');assert.equal((await f.call('create','POST',{slug:'pizzaria-a'},f.input())).status,403);}
 update({...f.data,hours:'Segunda, das 18h às 23h',products:f.data.products.map(p=>({...p,description:'Nova descrição'})),accent:'#123456'});assert.equal((await state(f)).status,'approved');await f.create();
}finally{f.close();}});

test('revoking a store hides Pix on existing private links and denies proof uploads without touching D1/R2',async()=>{const f=fixture();try{
 const {order,input}=await f.create(),headers={'x-pedido-order-token':input.trackingToken};assert.equal((await decide(f,'revoked')).status,200);
 const current=(await (await f.call('customer','GET',{id:order.id},undefined,headers)).json()).order;assert.equal(current.siteOrderingAllowed,false);assert.equal(current.pix,null);assert.equal(JSON.stringify(current).includes('pizza@example.test'),false);
 const before=f.db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);assert.equal((await f.call('upload','POST',{id:order.id},png,{...headers,'Content-Type':'image/png'})).status,403);assert.equal(count(f,'order_receipts'),0);assert.equal(f.objects.size,0);assert.deepEqual(f.db.prepare('SELECT * FROM orders WHERE id=?').get(order.id),before);
 assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:1,action:'accept',etaMinutes:30})).status,403);
 assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:1,action:'cancel',reason:'Pedido cancelado para resolver o atendimento.'})).status,200);
}finally{f.close();}});

test('concurrent revocation at order insertion fails closed without creating an order',async()=>{const f=fixture();try{
 const prepare=f.env.DB.prepare;f.env.DB.prepare=sql=>{if(sql.startsWith('INSERT INTO orders('))f.db.prepare("UPDATE store_verifications SET status='revoked',version=version+1 WHERE restaurant_id='shop-a'").run();return prepare(sql);};
 assert.equal((await f.call('create','POST',{slug:'pizzaria-a'},f.input())).status,403);assert.equal(count(f,'orders'),0);
}finally{f.close();}});

test('concurrent revocation during an R2 upload removes the orphan proof and preserves the order',async()=>{const f=fixture();try{
 const {order,input}=await f.create(),put=f.env.BUCKET.put,before=f.db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);
 f.env.BUCKET.put=async(...args)=>{await put(...args);f.db.prepare("UPDATE store_verifications SET status='revoked',version=version+1 WHERE restaurant_id='shop-a'").run();};
 const r=await f.call('upload','POST',{id:order.id},png,{'x-pedido-order-token':input.trackingToken,'Content-Type':'image/png'});assert.equal(r.status,409,await r.clone().text());assert.equal(f.objects.size,0);assert.equal(count(f,'order_receipts'),0);assert.deepEqual(f.db.prepare('SELECT * FROM orders WHERE id=?').get(order.id),before);
}finally{f.close();}});

test('a failed review audit rolls back approval rather than opening the checkout',async()=>{const f=fixture({verified:false});try{
 await request(f);f.db.exec("CREATE TRIGGER fail_review_audit BEFORE INSERT ON store_verification_events BEGIN SELECT RAISE(ABORT,'local audit failure'); END");assert.equal((await decide(f)).status,500);assert.equal((await state(f)).status,'pending');assert.equal(count(f,'store_verification_events'),1);assert.equal((await f.call('create','POST',{slug:'pizzaria-a'},f.input())).status,403);
}finally{f.close();}});

test('a pending request cannot be approved after the published identity changes',async()=>{const f=fixture({verified:false});try{
 await request(f);f.db.prepare('UPDATE restaurants SET published_data=? WHERE id=?').run(JSON.stringify({...f.data,whatsapp:'(22) 99999-9999'}),'shop-a');assert.equal((await decide(f)).status,409);assert.equal((await state(f)).status,'changed');assert.equal((await request(f)).status,201);assert.equal((await decide(f)).status,200);
}finally{f.close();}});

test('buyer reports are private, bounded, rate-limited and idempotent; they do not auto-approve or suspend stores',async()=>{const f=fixture({verified:false});try{
 f.state.user=null;const body={requestId:crypto.randomUUID(),category:'non_delivery',detail:'Pedido fictício não foi entregue no endereço combinado.',contact:'cliente@example.test',orderReference:'TESTE123'};
 const r=await f.call('storeReport','POST',{slug:'pizzaria-a'},body);assert.equal(r.status,201,await r.clone().text());const response=await r.json();assert.match(response.protocol,/^[A-F0-9]{8}$/);assert.deepEqual(Object.keys(response),['protocol']);
 assert.equal((await f.call('storeReport','POST',{slug:'pizzaria-a'},body)).status,200);assert.equal(count(f,'store_reports'),1);assert.equal(count(f,'store_verifications'),0);
 const saved=f.db.prepare('SELECT * FROM store_reports').get();assert.equal(saved.detail,body.detail);assert.equal(saved.contact,body.contact);assert.match(saved.reporter_hash,/^[a-f0-9]{64}$/);assert.equal(saved.status,'open');
 assert.equal((await f.call('storeReport','POST',{slug:'pizzaria-a'},{...body,website:'bot'})).status,400);assert.equal((await f.call('storeReport','POST',{slug:'missing'},body)).status,404);
 for(let i=0;i<2;i++)assert.equal((await f.call('storeReport','POST',{slug:'pizzaria-a'},{...body,requestId:crypto.randomUUID()})).status,201);
 assert.equal((await f.call('storeReport','POST',{slug:'pizzaria-a'},{...body,requestId:crypto.randomUUID()})).status,429);
 assert.equal((await f.call('reportAdmin','PATCH',{},{})).status,401);
}finally{f.close();}});

test('report details require platform administration; resolving a report needs CSRF and version, and preserves evidence',async()=>{const f=fixture();try{
 await f.call('storeReport','POST',{slug:'pizzaria-a'},{requestId:crypto.randomUUID(),category:'impersonation',detail:'Suspeita fictícia de nome ou endereço de outra loja.'});const report=f.db.prepare('SELECT * FROM store_reports').get();
 const payload={id:report.id,expectedVersion:1,status:'resolved',resolution:'Análise fictícia concluída e contato conferido.'};assert.equal((await f.call('reportAdmin','PATCH',{},payload)).status,403);
 f.env.PLATFORM_ADMIN_ACCOUNT_ID=adminId;f.state.user={...f.state.user,userId:adminId};const queue=await f.call('verificationAdmin','GET');assert.equal(queue.status,200);const data=await queue.json();assert.equal(data.reports[0].id,report.id);assert.equal(JSON.stringify(data).includes('reporterHash'),false);
 assert.equal((await f.call('reportAdmin','PATCH',{},payload,{'x-pedido-csrf':'00'.repeat(32)})).status,403);assert.equal((await f.call('reportAdmin','PATCH',{},payload)).status,200);assert.equal((await f.call('reportAdmin','PATCH',{},payload)).status,409);assert.equal(f.db.prepare('SELECT detail FROM store_reports').get().detail,report.detail);assert.equal(f.db.prepare('SELECT status FROM store_verifications WHERE restaurant_id=?').get('shop-a').status,'approved');
}finally{f.close();}});

test('public unverified menu and suspended order view render no Pix instructions and expose a reporting action',async()=>{const f=fixture();try{
 const Menu=f.load('components/menu.tsx').default,html=renderToStaticMarkup(createElement(Menu,{data:{...f.data,pix:{...f.data.pix,enabled:false,key:'',recipient:''}},slug:'pizzaria-a',siteOrderingAllowed:false}));assert.match(html,/loja ainda não verificada/);assert.match(html,/Denunciar loja/);assert.doesNotMatch(html,/Pix antecipado com comprovante|pizza@example.test|Pedidos pelo site liberados/);
 const {order,input}=await f.create();await decide(f,'revoked');const tracked=(await (await f.call('customer','GET',{id:order.id},undefined,{'x-pedido-order-token':input.trackingToken})).json()).order;
 const View=f.load('components/order-tracking.tsx').CustomerOrderView,view=renderToStaticMarkup(createElement(View,{order:tracked}));assert.doesNotMatch(view,/Copiar chave Pix|Já paguei|pizza@example.test|Faça o Pix/);assert.match(view,/pagamentos e comprovantes desta loja estão suspensos/);assert.match(view,/Denunciar loja/);
}finally{f.close();}});
