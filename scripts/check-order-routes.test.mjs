import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256} from '../lib/auth-policy.ts';
import {fixture,png,csrf} from './test-backend-fixture.mjs';
test('real order routes enforce the complete Pix, proof, owner approval, ETA and delivery flow',async()=>{
 const f=fixture();try{
  const {order,input}=await f.create({...f.input(),total:1});assert.equal(order.total,6500);assert.ok(order.trackingUrl.endsWith('#'+input.trackingToken));
  const replay=await f.call('create','POST',{slug:'pizzaria-a'},input);assert.equal(replay.status,200);assert.equal((await replay.json()).id,order.id);assert.equal(f.db.prepare('select count(*) as n from orders').get().n,1);
  const stolen=await f.call('create','POST',{slug:'pizzaria-a'},{...input,trackingToken:'aa'.repeat(32)});assert.equal(stolen.status,404);
  const token={'x-pedido-order-token':input.trackingToken};
  assert.equal((await f.call('customer','GET',{id:order.id})).status,404);
  assert.equal((await f.call('customer','GET',{id:order.id},undefined,{'x-pedido-order-token':'ff'.repeat(32)})).status,404);
  const before=(await (await f.call('customer','GET',{id:order.id},undefined,token)).json()).order;assert.equal(before.status,'awaiting_payment');
  assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:1,action:'confirm',receivedPix:true,etaMinutes:50})).status,400);
  const uploaded=await f.call('upload','POST',{id:order.id},png,{...token,'Content-Type':'image/png'});assert.equal(uploaded.status,201,await uploaded.clone().text());const proofOrder=(await uploaded.json()).order;assert.equal(proofOrder.status,'awaiting');assert.equal(proofOrder.paymentStatus,'proof_sent');assert.equal(f.objects.size,1);
  assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:2,action:'prepare'})).status,400);
  assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:2,action:'confirm',etaMinutes:50})).status,400);
  const accepted=await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:2,action:'confirm',receivedPix:true,etaMinutes:50});assert.equal(accepted.status,200,await accepted.clone().text());const current=(await accepted.json()).order;
  assert.equal(current.status,'confirmed');assert.equal(current.paymentStatus,'approved');assert.ok(Math.abs(Date.parse(current.estimatedAt)-Date.now()-50*60000)<1000);
  const listing=await (await f.call('admin','GET',{id:'shop-a'})).json();assert.equal(listing.sales.value,6500);assert.ok(!JSON.stringify(listing).includes(input.trackingToken));assert.ok(!JSON.stringify(listing).includes(await sha256(input.trackingToken)));assert.ok(!JSON.stringify(listing).includes('trackingHash'));
  const customer=(await (await f.call('customer','GET',{id:order.id},undefined,token)).json()).order;assert.equal(customer.estimatedAt,current.estimatedAt);assert.equal(customer.status,'confirmed');assert.ok(!JSON.stringify(customer).includes('owner-a'));assert.ok(!JSON.stringify(customer).includes('order-proofs/'));
  f.state.user=null;assert.equal((await f.call('proof','GET',{id:'shop-a',orderId:order.id,receiptId:current.receiptId})).status,401);
  f.state.user={userId:'owner-b',displayName:'Outro dono',email:'other@example.test',fullName:null};assert.equal((await f.call('proof','GET',{id:'shop-a',orderId:order.id,receiptId:current.receiptId})).status,404);assert.equal((await f.call('proof','GET',{id:'shop-b',orderId:order.id,receiptId:current.receiptId})).status,404);
  f.state.user={userId:'owner-a',displayName:'Dono A',email:'owner@example.test',fullName:null};
  const file=await f.call('proof','GET',{id:'shop-a',orderId:order.id,receiptId:current.receiptId});assert.equal(file.status,200);assert.equal(file.headers.get('Content-Type'),'image/png');assert.match(file.headers.get('Cache-Control'),/no-store/);assert.deepEqual(new Uint8Array(await file.arrayBuffer()),png);
  for(const [version,action,status] of [[3,'prepare','preparing'],[4,'dispatch','out_for_delivery'],[5,'complete','delivered']]){const response=await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version,action});assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).order.status,status);}
  assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:6,action:'cancel',reason:'Teste de alteração inválida'})).status,400);
  assert.equal(f.db.prepare('select count(*) as n from order_events').get().n,5);
 }finally{f.close();}
});

test('upload routes reject forged origins, oversized files, disguised scripts and duplicate concurrent proofs',async()=>{
 const f=fixture();try{const {order,input}=await f.create(),headers={'x-pedido-order-token':input.trackingToken,'Content-Type':'image/png'};
  assert.equal((await f.call('upload','POST',{id:order.id},png,{...headers,Origin:'https://evil.example'})).status,403);
  assert.equal((await f.call('upload','POST',{id:order.id},new TextEncoder().encode('<script>not an image</script>'),headers)).status,400);
  assert.equal((await f.call('upload','POST',{id:order.id},new Uint8Array(5*1024*1024+1),headers)).status,413);
  assert.equal(f.objects.size,0);
  const raced=await Promise.all([f.call('upload','POST',{id:order.id},png,headers),f.call('upload','POST',{id:order.id},png,headers)]);assert.deepEqual(raced.map(r=>r.status).sort(),[201,409]);assert.equal(f.objects.size,1);assert.equal(f.db.prepare('select count(*) as n from order_receipts').get().n,1);
  assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:2,action:'confirm',receivedPix:true,etaMinutes:50},{'x-pedido-csrf':'forged'})).status,403);
  const rejected=await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:2,action:'reject_receipt',reason:'Não localizamos o recebimento. Confira os dados.'});assert.equal(rejected.status,200);
  const second=await f.call('upload','POST',{id:order.id},png,headers);assert.equal(second.status,201);assert.equal(f.objects.size,2);
  assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:2,action:'confirm',receivedPix:true,etaMinutes:50})).status,409);
  f.db.prepare('update restaurants set published_data=? where id=?').run(JSON.stringify({...f.data,pix:{...f.data.pix,key:'other@example.test'}}),'shop-a');
  const view=(await (await f.call('customer','GET',{id:order.id},undefined,headers)).json()).order;assert.equal(view.pix.key,'pizza@example.test');assert.equal(view.receiptCount,2);
  // Start a new rate window after the malformed/racing upload scenarios.
  f.db.exec('DELETE FROM rate_buckets');
  for(let version=4;version<=8;version+=2){assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version,action:'reject_receipt',reason:'Comprovante de exemplo ainda incorreto.'})).status,200);assert.equal((await f.call('upload','POST',{id:order.id},png,headers)).status,201);}
  assert.equal(f.db.prepare('select receipt_count as n from orders').get().n,5);
  assert.equal((await f.call('admin','PATCH',{id:'shop-a'},{orderId:order.id,version:10,action:'reject_receipt',reason:'Último comprovante de exemplo recusado.'})).status,200);
  assert.equal((await f.call('upload','POST',{id:order.id},png,headers)).status,400);assert.equal(f.objects.size,5);
 }finally{f.close();}
});

test('email login remains available independently of SMTP, and recovery sessions cannot approve orders',async()=>{
 const f=fixture(),originalFetch=globalThis.fetch,calls=[];try{
  const disabled=await (await f.call('auth','GET',{action:'config'})).json();assert.equal(disabled.enabled,false);assert.equal(disabled.registrationEnabled,false);
  f.env.SUPABASE_URL='https://test.supabase.co';f.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test-fixture';
  const user={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{name:{forged:'metadata'}}},session={access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user};
  globalThis.fetch=async(url,options={})=>{assert.equal(options.redirect,'manual','Worker fetch must use the supported no-follow mode');calls.push({url:String(url),method:options.method});return String(url).includes('/user')?Response.json(user):String(url).includes('/logout')?new Response(null,{status:204}):Response.json(session);};
  const config=await (await f.call('auth','GET',{action:'config'})).json();assert.equal(config.enabled,true);assert.equal(config.registrationEnabled,true);assert.equal(config.recoveryEnabled,false);
  assert.equal((await f.call('auth','POST',{action:'recover'},{email:'owner@example.test'})).status,503);
  assert.equal((await f.call('auth','POST',{action:'resend'},{email:'owner@example.test'})).status,410);assert.equal(calls.length,0);
  const login=await f.call('auth','POST',{action:'login'},{email:'owner@example.test',password:'frase para testar acesso'});assert.equal(login.status,200,await login.clone().text());assert.match(login.headers.get('Set-Cookie'),/HttpOnly/);assert.match(login.headers.get('Set-Cookie'),/Secure/);assert.ok(!JSON.stringify(await login.json()).includes('test-access'));
  f.state.user=null;
  const recovery=await f.call('auth','POST',{action:'confirm-recovery'},{tokenHash:'ab'.repeat(32)});assert.equal(recovery.status,200);const cookie=recovery.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await f.call('admin','GET',{id:'shop-a'},undefined,{Cookie:cookie})).status,401);
  const change=await f.call('auth','POST',{action:'password'},{password:'uma senha nova para testar'},{Cookie:cookie+'; __Host-pedido-csrf='+csrf});assert.equal(change.status,200,await change.clone().text());assert.match(change.headers.get('Set-Cookie'),/Max-Age=0/);assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);assert.ok(calls.some(c=>c.url.endsWith('logout?scope=global')));
 }finally{globalThis.fetch=originalFetch;f.close();}
});

test('an authentication redirect cannot forward credentials or create an application session',async()=>{
 const f=fixture(),originalFetch=globalThis.fetch,calls=[];try{
  f.env.SUPABASE_URL='https://test.supabase.co';f.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test-fixture';
  globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://foreign.example/collect'}});};
  const response=await f.call('auth','POST',{action:'login'},{email:'owner@example.test',password:'frase para testar acesso'});
  assert.equal(response.status,503);assert.equal(calls.length,1);assert.equal(calls[0].url,'https://test.supabase.co/auth/v1/token?grant_type=password');
  assert.equal(f.db.prepare('select count(*) as n from auth_sessions').get().n,0);assert.equal(response.headers.get('Set-Cookie'),null);
 }finally{globalThis.fetch=originalFetch;f.close();}
});
