import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-backend-fixture.mjs';

function harness(mode='production'){const f=fixture();Object.assign(f.env,{PEDIDO_BILLING_ENABLED:'true',PEDIDO_BILLING_PROVIDER:'asaas',ASAAS_ENV:mode,ASAAS_API_KEY:mode==='sandbox'?'$aact_hmlg_fixture_not_a_real_key':'$aact_prod_fixture_not_a_real_key',ASAAS_WEBHOOK_TOKEN:'webhook-fixture-'.repeat(4)});const customer=new Map(),subscriptions=new Map(),payments=new Map(),calls=[];const original=globalThis.fetch;let pauseCustomer=null,loseSubscriptionResponse=false,redirect=false;
 globalThis.fetch=async(url,options={})=>{const u=new URL(url),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;calls.push({path:u.pathname,method,body,query:u.search,options});assert.equal(options.headers.access_token,f.env.ASAAS_API_KEY);assert.equal(options.redirect,'manual');if(redirect)return new Response('',{status:302,headers:{Location:'https://attacker.example'}});const path=u.pathname.replace('/v3/','');
 if(path==='customers'&&method==='GET')return Response.json({data:[...customer.values()].filter(c=>c.externalReference===u.searchParams.get('externalReference')),hasMore:false});
 if(path==='customers'&&method==='POST'){if(pauseCustomer)await pauseCustomer;const value={...body,id:'cus_fixture_'+(customer.size+1)};customer.set(value.id,value);return Response.json(value);}
 if(path==='subscriptions'&&method==='GET')return Response.json({data:[...subscriptions.values()].filter(s=>s.externalReference===u.searchParams.get('externalReference')),hasMore:false});
 if(path==='subscriptions'&&method==='POST'){const value={...body,id:'sub_fixture_'+(subscriptions.size+1),status:'ACTIVE',deleted:false};subscriptions.set(value.id,value);const p={id:'pay_fixture_'+(payments.size+1),customer:value.customer,subscription:value.id,status:'PENDING',value:value.value,dueDate:body.nextDueDate,invoiceUrl:mode==='sandbox'?'https://sandbox.asaas.com/i/fatura-fixture':'https://asaas.com/000/i/fatura-fixture'};payments.set(p.id,p);if(loseSubscriptionResponse){loseSubscriptionResponse=false;throw Error('ambiguous timeout after provider creation');}return Response.json(value);}
 if(/^subscriptions\/[^/]+\/payments$/.test(path))return Response.json({data:[...payments.values()].filter(p=>p.subscription===path.split('/')[1]&&p.status!=='DELETED'),hasMore:false});
 if(/^subscriptions\/[^/]+$/.test(path)){const value=subscriptions.get(path.split('/')[1]);if(!value)return new Response('',{status:404});if(method==='DELETE'){value.deleted=true;for(const p of payments.values())if(p.subscription===value.id&&['PENDING','OVERDUE'].includes(p.status))p.status='DELETED';return Response.json({deleted:true,id:value.id});}return Response.json(value);}
 if(/^payments\/[^/]+$/.test(path))return Response.json(payments.get(path.split('/')[1]));throw Error('Unexpected provider request '+method+' '+path);};
 const input=(patch={})=>({requestId:crypto.randomUUID(),plan:'essencial',document:'00012345600',...patch});
 const webhook=async(id='evt_fixture',event='PAYMENT_RECEIVED',paymentId=[...payments.keys()][0])=>f.call('asaasWebhook','POST',{}, {id,event,payment:{id:paymentId}},{'asaas-access-token':f.env.ASAAS_WEBHOOK_TOKEN});
 return {...f,calls,customer,subscriptions,payments,input,webhook,setPause:p=>{pauseCustomer=p;},loseNextSubscription:()=>{loseSubscriptionResponse=true;},setRedirect:()=>{redirect=true;},close(){globalThis.fetch=original;f.close();}};
}

test('financial mutations reject absent or mismatched CSRF before changing records or calling Asaas',async()=>{
 const f=harness();try{
  for(const route of ['billingCheckout','billingCancel','billingSync','billingPortal']){
   for(const headers of [{'x-pedido-csrf':'wrong'},{Cookie:''}]){
    const response=await f.call(route,'POST',{},f.input(),headers);
    assert.equal(response.status,403,route);assert.match(response.headers.get('Cache-Control'),/no-store/);
   }
  }
  assert.equal(f.calls.length,0);assert.equal(f.db.prepare('SELECT count(*) n FROM asaas_intents').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM asaas_subscriptions').get().n,0);
  const portal=await f.call('billingPortal','POST',{},{});assert.equal(portal.status,200);
  assert.equal((await portal.json()).url,'/assinatura');assert.equal(f.calls.length,0);
 }finally{f.close();}
});

test('new Asaas checkout offers Essencial R$49 and rejects retired Divulgação',async()=>{
 const f=harness();try{
  for(const plan of ['rede']){
   const response=await f.call('billingCheckout','POST',{},f.input({plan}));
   assert.equal(response.status,400,plan);
   assert.equal(f.calls.length,0,'the Asaas API must not be called for retired tiers');
  }
  const response=await f.call('billingCheckout','POST',{},f.input({plan:'essencial'}));
  assert.equal(response.status,200);
  const url=(await response.json()).url;
  assert.match(url,/^https:\/\/asaas.com\//);
  const remote=[...f.subscriptions.values()][0];
  assert.equal(remote.value,49);
  assert.equal(remote.cycle,'MONTHLY');
  const status=await (await f.call('billingStatus','GET')).json();
  assert.deepEqual(Object.keys(status.plans),['essencial','profissional']);
  assert.equal(status.subscription.plan,'essencial');
  assert.equal(status.subscription.status,'pending');
  assert.equal(status.invoices[0].amount,4900);
  assert.equal(status.subscription.paidThrough,0);
 }finally{f.close();}
});

test('Pro charges exactly R$89 and the customer assistant is granted only after confirmed payment',async()=>{
 const f=harness();try{const input=f.input({plan:'profissional'}),response=await f.call('billingCheckout','POST',{},input);assert.equal(response.status,200,await response.clone().text());assert.equal([...f.subscriptions.values()][0].value,89);assert.equal([...f.subscriptions.values()][0].cycle,'MONTHLY');assert.equal(await f.load('lib/customer-assistant.ts').hasCustomerAssistant('owner-a'),false);const p=[...f.payments.values()][0];p.status='RECEIVED';await f.webhook('evt_pro');assert.equal(await f.load('lib/customer-assistant.ts').hasCustomerAssistant('owner-a'),true);assert.equal((await (await f.call('billingStatus','GET')).json()).subscription.paidPlan,'profissional');p.status='REFUNDED';await f.webhook('evt_pro_refund','PAYMENT_REFUNDED');assert.equal(await f.load('lib/customer-assistant.ts').hasCustomerAssistant('owner-a'),false);}finally{f.close();}
});

test('Asaas checkout uses fixed server prices, hosted invoice and durable reuse without releasing an unpaid plan',async()=>{const f=harness();try{const input=f.input(),before=f.db.prepare('SELECT data,published_data FROM restaurants').all();const first=await f.call('billingCheckout','POST',{},input);assert.equal(first.status,200,await first.clone().text());assert.match((await first.json()).url,/^https:\/\/asaas.com\/000\/i\//);assert.equal(f.customer.size,1);assert.equal(f.subscriptions.size,1);assert.equal([...f.subscriptions.values()][0].value,49);assert.equal([...f.subscriptions.values()][0].billingType,'UNDEFINED');assert.equal([...f.subscriptions.values()][0].description,'pizzaria.on · essencial');assert.match([...f.subscriptions.values()][0].externalReference,/^pedido-on:production:/);assert.equal(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through,0);assert.equal(f.load('lib/billing.ts').billingEnforced(),false);
 const retry=await f.call('billingCheckout','POST',{},input);assert.equal(retry.status,200);const otherTab=await f.call('billingCheckout','POST',{},f.input());assert.equal(otherTab.status,200);assert.equal(f.calls.filter(c=>c.path.endsWith('/subscriptions')&&c.method==='POST').length,1);assert.equal(f.calls.filter(c=>c.path.endsWith('/customers')&&c.method==='POST').length,1);assert.deepEqual(f.db.prepare('SELECT data,published_data FROM restaurants').all(),before);assert.equal(f.db.prepare('SELECT count(*) n FROM subscriptions').get().n,0);
 const status=await (await f.call('billingStatus','GET')).json();assert.equal(status.subscription.status,'pending');assert.equal(status.invoices.length,1);assert.equal(status.provider,'asaas');assert.doesNotMatch(JSON.stringify(status),/00012345600|document_hash|aact_prod|webhook-fixture/);
 }finally{f.close();}});

test('two simultaneous checkout requests issue one creation and return the durable pending operation',async()=>{const f=harness();try{let release;f.setPause(new Promise(r=>{release=r;}));const input=f.input(),a=f.call('billingCheckout','POST',{},input);for(let i=0;i<20&&!f.calls.some(c=>c.path.endsWith('/customers')&&c.method==='POST');i++)await new Promise(r=>setImmediate(r));const b=await f.call('billingCheckout','POST',{},f.input());assert.equal(b.status,202);release();assert.equal((await a).status,200);assert.equal(f.customer.size,1);assert.equal(f.subscriptions.size,1);}finally{f.close();}});

test('an early confirmed invoice preserves the trial, includes a full paid month and has its renewal aligned at the provider',async()=>{
 const f=harness();try{const now=Math.floor(Date.now()/1000),ends=now+6*86400+3700;f.db.prepare('INSERT INTO account_trials(owner_id,registered_at,started_at,ends_at) VALUES(?,?,?,?)').run('owner-a',new Date().toISOString(),now-4*86400,ends);
  const before=f.db.prepare('SELECT * FROM account_trials').all(),input=f.input();const response=await f.call('billingCheckout','POST',{},input);assert.equal(response.status,200,await response.clone().text());
  const sub=[...f.subscriptions.values()][0],payment=[...f.payments.values()][0],firstMidnight=Date.parse(sub.nextDueDate+'T00:00:00-03:00')/1000;assert.ok(firstMidnight>=ends);assert.ok(firstMidnight-ends<86400);assert.equal(payment.dueDate,sub.nextDueDate);assert.equal(sub.cycle,'MONTHLY');
  const pending=await (await f.call('billingStatus','GET')).json();assert.equal(pending.offer.preservesTrial,true);assert.equal(pending.subscription.paidThrough,0);
  payment.status='RECEIVED';assert.equal((await f.webhook('evt_early')).status,200);const paid=await (await f.call('billingStatus','GET')).json();assert.equal(paid.subscription.paidThrough,paid.offer.paidThrough);assert.ok(paid.subscription.paidThrough>ends+27*86400);assert.deepEqual(f.db.prepare('SELECT * FROM account_trials').all(),before);
  f.env.PEDIDO_AI_PLAN_QUOTAS='true';assert.equal((await f.load('lib/ai-budget.ts').budgetAllowance('owner-a','image')).limit,3,'confirmed early payment activates Essential now, without taking away the bonus trial period');
  const calls=f.calls.filter(c=>c.method==='POST').length;assert.equal((await f.call('billingCheckout','POST',{},input)).status,200);assert.equal(f.calls.filter(c=>c.method==='POST').length,calls);assert.equal((await f.webhook('evt_early')).status,200);assert.equal((await (await f.call('billingStatus','GET')).json()).subscription.paidThrough,paid.subscription.paidThrough);
  payment.status='REFUNDED';assert.equal((await f.webhook('evt_early_refund','PAYMENT_REFUNDED')).status,200);assert.equal((await (await f.call('billingStatus','GET')).json()).subscription.paidThrough,0);assert.deepEqual(f.db.prepare('SELECT * FROM account_trials').all(),before);
 }finally{f.close();}
});

test('a lost subscription response is reconciled by reference and never repeated as another POST',async()=>{const f=harness();try{const input=f.input();f.loseNextSubscription();const first=await f.call('billingCheckout','POST',{},input);assert.equal(first.status,503);assert.equal(f.subscriptions.size,1);assert.equal(f.db.prepare('SELECT state FROM asaas_intents').get().state,'subscription_creating');const next=await f.call('billingCheckout','POST',{},input);assert.equal(next.status,200,await next.clone().text());assert.equal(f.subscriptions.size,1);assert.equal(f.calls.filter(c=>c.path.endsWith('/subscriptions')&&c.method==='POST').length,1);}finally{f.close();}});

test('payments require authenticated current-provider confirmation, are atomic and duplicated events are harmless',async()=>{const f=harness();try{await f.call('billingCheckout','POST',{},f.input());const p=[...f.payments.values()][0];p.status='RECEIVED';const invalid=await f.call('asaasWebhook','POST',{}, {id:'evt_fake',event:'PAYMENT_RECEIVED',payment:{id:p.id}},{'asaas-access-token':'wrong'});assert.equal(invalid.status,401);assert.equal(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through,0);
 const real=await f.webhook();assert.equal(real.status,200,await real.clone().text());const paid=f.db.prepare('SELECT paid_through,paid_plan FROM asaas_subscriptions').get();assert.equal(paid.paid_plan,'essencial');assert.ok(paid.paid_through>Date.now()/1000);const count=f.calls.length;assert.equal((await f.webhook()).status,200);assert.equal(f.calls.length,count);assert.equal(f.db.prepare('SELECT count(*) n FROM asaas_events').get().n,1);
 Object.assign(f.env,{PEDIDO_BILLING_ENFORCED:'true'});assert.equal(await f.load('lib/billing.ts').canServeMenu('owner-a','shop-a'),true);assert.equal(await f.load('lib/billing.ts').canServeMenu('owner-b','shop-b'),false);
 p.status='REFUNDED';f.db.exec("CREATE TRIGGER fail_billing_event BEFORE INSERT ON asaas_events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");assert.equal((await f.webhook('evt_refund')).status,500);assert.deepEqual(f.db.prepare('SELECT paid_through,paid_plan FROM asaas_subscriptions').get(),paid);assert.equal(f.db.prepare('SELECT status FROM asaas_payments').get().status,'RECEIVED');f.db.exec('DROP TRIGGER fail_billing_event');assert.equal((await f.webhook('evt_refund')).status,200);assert.equal(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through,0);
 }finally{f.close();}});

test('official compound webhook IDs are processed once without relaxing resource IDs',async()=>{const f=harness();try{
 await f.call('billingCheckout','POST',{},f.input());const payment=[...f.payments.values()][0];payment.status='RECEIVED';
 const eventId='evt_05b708f961d739ea7eba7e4db318f621&368604920';
 const response=await f.webhook(eventId);assert.equal(response.status,200,await response.clone().text());
 assert.ok(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through>Date.now()/1000);
 assert.equal(f.db.prepare('SELECT id FROM asaas_events').get().id,'production:'+eventId);
 const calls=f.calls.length;assert.equal((await f.webhook(eventId)).status,200);assert.equal(f.calls.length,calls);
 assert.equal(f.db.prepare('SELECT count(*) n FROM asaas_events').get().n,1);
 for(const invalid of ['evt_bad\nvalue','evt_bad value','x'.repeat(121)])assert.equal((await f.webhook(invalid)).status,400);
 assert.equal((await f.webhook('evt_valid','PAYMENT_RECEIVED','pay_invalid&123')).status,400);assert.equal(f.calls.length,calls);
}finally{f.close();}});

test('a refunded old month keeps a later paid renewal and stale notifications read the actual refund state',async()=>{const f=harness();try{await f.call('billingCheckout','POST',{},f.input());const first=[...f.payments.values()][0];first.status='RECEIVED';f.db.prepare("UPDATE asaas_intents SET first_due_date=''").run();first.dueDate='2026-09-13';assert.equal((await f.webhook('evt_old')).status,200);const later={...first,id:'pay_renewal',dueDate:'2026-10-13'};f.payments.set(later.id,later);assert.equal((await f.webhook('evt_new','PAYMENT_RECEIVED',later.id)).status,200);const through=f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through;first.status='REFUNDED';assert.equal((await f.webhook('evt_refund_old','PAYMENT_REFUNDED',first.id)).status,200);assert.equal(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through,through);assert.equal((await f.webhook('evt_out_of_order','PAYMENT_RECEIVED',first.id)).status,200);assert.equal(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through,through);assert.equal(f.db.prepare('SELECT status FROM asaas_payments WHERE remote_id=?').get(first.id).status,'REFUNDED');}finally{f.close();}});

test('cancel requires explicit confirmation, is owner-bound and preserves paid history and access',async()=>{const f=harness();try{await f.call('billingCheckout','POST',{},f.input());const p=[...f.payments.values()][0];p.status='RECEIVED';await f.webhook();const sub=[...f.subscriptions.values()][0],through=f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through;assert.equal((await f.call('billingCancel','POST',{}, {subscriptionId:sub.id})).status,400);f.state.user={userId:'owner-b',displayName:'Outra conta',email:'b@example.test'};assert.equal((await f.call('billingCancel','POST',{}, {subscriptionId:sub.id,confirm:true})).status,404);const hidden=await (await f.call('billingStatus','GET')).json();assert.equal(hidden.subscription,null);assert.deepEqual(hidden.invoices,[]);f.state.user={userId:'owner-a',displayName:'Dono A',email:'owner@example.test'};const done=await f.call('billingCancel','POST',{}, {subscriptionId:sub.id,confirm:true});assert.equal(done.status,200);assert.equal(sub.deleted,true);assert.equal(f.db.prepare('SELECT status FROM asaas_subscriptions').get().status,'CANCELED');assert.equal(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through,through);assert.equal(f.db.prepare('SELECT active_key FROM asaas_intents').get().active_key,null);assert.equal((await f.call('billingCancel','POST',{}, {subscriptionId:sub.id,confirm:true})).status,200);assert.equal(f.calls.filter(c=>c.method==='DELETE').length,1);assert.equal((await (await f.call('billingStatus','GET')).json()).subscription.status,'canceled');
 await f.call('billingCheckout','POST',{},f.input());const history=await (await f.call('billingStatus','GET')).json();assert.equal(history.invoices.length,2);assert.ok(history.invoices.some(i=>i.id===p.id&&i.status==='RECEIVED'));assert.equal((await f.load('lib/asaas-billing.ts').asaasPaidAccount('owner-a')).paidThrough,through);
 }finally{f.close();}});

test('requests cannot forge a plan amount, steal another intent or bypass CSRF and suspension',async()=>{const f=harness();try{assert.equal((await f.call('billingCheckout','POST',{},f.input({amount:1}))).status,400);assert.equal(f.calls.length,0);assert.equal((await f.call('billingCheckout','POST',{},f.input(),{Origin:'https://other.example'})).status,403);const input=f.input();await f.call('billingCheckout','POST',{},input);const count=f.calls.length;f.state.user={userId:'owner-b',displayName:'Outra',email:'b@example.test'};assert.equal((await f.call('billingCheckout','POST',{},input)).status,409);assert.equal(f.calls.length,count);f.db.prepare("INSERT INTO account_access(owner_id,mode,updated_by,updated_at) VALUES ('owner-b','suspended','admin',?)").run(new Date().toISOString());assert.equal((await f.call('billingCheckout','POST',{},f.input())).status,403);f.state.user=null;assert.equal((await f.call('billingStatus','GET')).status,401);}finally{f.close();}});

test('disabled, mismatched sandbox keys and redirects do not enable billing or forward credentials',async()=>{const f=harness();try{f.env.PEDIDO_BILLING_ENABLED='false';assert.equal((await f.call('billingCheckout','POST',{},f.input())).status,503);assert.equal(f.calls.length,0);f.env.PEDIDO_BILLING_ENABLED='true';f.env.ASAAS_ENV='sandbox';assert.equal((await f.call('billingCheckout','POST',{},f.input())).status,503);assert.equal(f.calls.length,0);f.env.ASAAS_API_KEY='$aact_hmlg_fixture_not_a_real_key';assert.equal(f.load('lib/asaas-billing.ts').asaasRuntime().enabled,true);assert.equal(await f.load('lib/asaas-billing.ts').asaasPaidAccount('owner-a'),null);f.setRedirect();assert.equal((await f.call('billingCheckout','POST',{},f.input())).status,503);assert.equal(f.calls.length,1);assert.equal(f.calls[0].path,'/v3/customers');}finally{f.close();}});

test('wrong customer, altered fee and unsafe invoice links cannot confer entitlement or redirect a payer',async()=>{const f=harness();try{await f.call('billingCheckout','POST',{},f.input());const p=[...f.payments.values()][0];p.status='RECEIVED';p.value=1;await f.webhook('evt_wrong_amount');assert.equal(f.db.prepare('SELECT paid_through FROM asaas_subscriptions').get().paid_through,0);p.value=49;p.invoiceUrl='https://attacker.example/i/steal';await f.webhook('evt_bad_link');const view=await (await f.call('billingStatus','GET')).json();assert.equal(view.invoices[0].url,null);p.customer='cus_other_owner';const response=await f.webhook('evt_wrong_customer');assert.equal(response.status,503);assert.equal(f.db.prepare("SELECT count(*) n FROM asaas_events WHERE id LIKE '%evt_wrong_customer'").get().n,0);}finally{f.close();}});

test('sandbox-only QA accounts exercise pending, verified payment, duplicate webhook, cancellation and refund without granting another owner',async()=>{
 const f=harness('sandbox');try{
  Object.assign(f.env,{PEDIDO_BILLING_SANDBOX_ONLY:'true',PEDIDO_BILLING_SANDBOX_TEST_OWNERS:'owner-a,owner-b'});
  const billing=f.load('lib/billing.ts');
  assert.equal(billing.billingEnforced('owner-a'),true);
  assert.equal(billing.billingEnforced('owner-b'),true);
  assert.equal(billing.billingEnforced('owner-c'),false);
  assert.equal(await billing.canServeMenu('owner-a','shop-a'),false);
  assert.equal(await billing.canServeMenu('owner-b','shop-b'),false);
  const checkout=await f.call('billingCheckout','POST',{},f.input());assert.equal(checkout.status,200,await checkout.clone().text());
  assert.match((await checkout.json()).url,/^https:\/\/sandbox\.asaas\.com\/i\//);
  const payment=[...f.payments.values()][0],sub=[...f.subscriptions.values()][0];
  assert.equal(await billing.canServeMenu('owner-a','shop-a'),false,'creating an invoice never grants access');
  const wrong=await f.call('asaasWebhook','POST',{}, {id:'evt_wrong',event:'PAYMENT_RECEIVED',payment:{id:payment.id}},{'asaas-access-token':'wrong'});assert.equal(wrong.status,401);
  assert.equal((await f.webhook('evt_unpaid')).status,200);assert.equal(await billing.canServeMenu('owner-a','shop-a'),false,'the signed payload cannot override the provider status');
  payment.status='RECEIVED';assert.equal((await f.webhook('evt_qa_paid')).status,200);
  const count=f.calls.length;assert.equal((await f.webhook('evt_qa_paid')).status,200);assert.equal(f.calls.length,count);
  assert.equal(await billing.canServeMenu('owner-a','shop-a'),true);
  assert.equal(await billing.canServeMenu('owner-b','shop-b'),false);
  f.state.user={userId:'owner-b',displayName:'QA B',email:'b@example.test'};
  assert.equal((await f.call('billingCancel','POST',{}, {subscriptionId:sub.id,confirm:true})).status,404);
  assert.equal((await (await f.call('billingStatus','GET')).json()).subscription,null);
  f.state.user={userId:'owner-a',displayName:'QA A',email:'a@example.test'};
  assert.equal((await f.call('billingCancel','POST',{}, {subscriptionId:sub.id,confirm:true})).status,200);
  assert.equal(await billing.canServeMenu('owner-a','shop-a'),true,'paid access survives canceled renewal');
  payment.status='REFUNDED';assert.equal((await f.webhook('evt_qa_refunded','PAYMENT_REFUNDED')).status,200);
  assert.equal(await billing.canServeMenu('owner-a','shop-a'),false);
  assert.equal((await f.webhook('evt_qa_stale','PAYMENT_RECEIVED')).status,200);
  assert.equal(await billing.canServeMenu('owner-a','shop-a'),false,'a stale notification never restores a refunded invoice');
  f.env.ASAAS_ENV='production';f.env.ASAAS_API_KEY='$aact_prod_fixture';
  const before=f.calls.length;assert.equal((await f.call('billingCheckout','POST',{},f.input())).status,503);assert.equal(f.calls.length,before);
  f.env.PEDIDO_BILLING_PROVIDER='stripe';assert.equal(billing.billingConfig().enabled,false);assert.equal(billing.billingConfig().provider,'asaas');
 }finally{f.close();}
});

test('canonical provider financial data records net value and date without inventing a fixed fee; refunds remove confirmed revenue',async()=>{
 const f=harness();try{
  assert.equal((await f.call('billingCheckout','POST',{},f.input())).status,200);const payment=[...f.payments.values()][0];payment.status='RECEIVED';payment.paymentDate=new Date().toISOString().slice(0,10);
  assert.equal((await f.webhook('evt_finance_missing')).status,200);let row=f.db.prepare('SELECT net_amount,payment_date FROM asaas_payments').get();assert.equal(row.net_amount,null);assert.equal(row.payment_date,payment.paymentDate);
  payment.netValue=47.01;assert.equal((await f.webhook('evt_finance_measured')).status,200);assert.equal((await f.webhook('evt_finance_measured')).status,200);row=f.db.prepare('SELECT amount,net_amount FROM asaas_payments').get();assert.equal(row.amount,4900);assert.equal(row.net_amount,4701);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM asaas_payments').get().n,1);
  const finance=()=>f.load('lib/admin-finance.ts').adminFinance('2000-01-01',new Date().toISOString(),'2000-01-01','2099-01-01');let report=await finance();assert.equal(report.payments[0].gross,4900);assert.equal(report.payments[0].knownFees,199);assert.equal(report.payments[0].knownNet,4701);
  const before=f.calls.length;await finance();assert.equal(f.calls.length,before,'admin does not call a provider');payment.status='REFUNDED';assert.equal((await f.webhook('evt_finance_refund','PAYMENT_REFUNDED')).status,200);report=await finance();assert.equal(report.payments.length,0);
 }finally{f.close();}
});
