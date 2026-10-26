import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-backend-fixture.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const now=new Date('2026-10-26T15:00:00Z');
function profile(f,id,name){const stamp=now.toISOString();f.db.prepare('INSERT INTO account_profiles(owner_id,name,email,provider,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id,name,id+'@example.test','supabase',stamp,stamp);}
test('authenticated activity binds identity on the server, rejects forged owners and keeps anonymous calculator use anonymous',async()=>{
 const f=fixture();try{const route=f.load('app/api/site-events/route.ts'),send=payload=>route.POST(new Request('https://pedido.example/api/site-events',{method:'POST',headers:{origin:'https://pedido.example','content-type':'application/json'},body:JSON.stringify({session:crypto.randomUUID(),page:'calculadora',kind:'calculator_use',...payload})}));
  assert.equal((await send({ownerId:'owner-b'})).status,400);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM account_activity').get().n,0);
  assert.equal((await send({})).status,204);assert.equal(f.db.prepare('SELECT owner_id,actions FROM account_activity').get().owner_id,'owner-a');
  f.state.user=null;assert.equal((await send({})).status,204);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM account_activity').get().n,1);
  assert.equal((await send({page:'painel'})).status,400);
 }finally{f.close();}
});
test('presence updates last activity without adding calculator actions or creating a fake login',async()=>{
 const f=fixture();try{const {recordAccountActivity}=f.load('lib/account-activity.ts');await recordAccountActivity('owner-a','calculadora','visit',now);await recordAccountActivity('owner-a','calculadora','presence',new Date(now.getTime()+60000));await recordAccountActivity('owner-a','calculadora','calculator_use',new Date(now.getTime()+120000));const rows=f.db.prepare('SELECT * FROM account_activity').all();assert.equal(rows.length,1);assert.equal(rows[0].opens,1);assert.equal(rows[0].actions,1);assert.equal(rows[0].last_at,'2026-10-26T15:02:00.000Z');assert.equal(rows[0].day,'2026-10-26');assert.equal(rows[0].area,'calculadora');}finally{f.close();}
});
test('directory shows each account, actual order counts and calculator-only status without exposing buyer information',async()=>{
 const f=fixture();try{profile(f,'owner-a','Pizzaiola A');profile(f,'owner-b','Pizzaiolo B');profile(f,'calculator-only','Só calculadora');profile(f,'new-account','Sem pizzaria');
  const {recordAccountActivity}=f.load('lib/account-activity.ts');await recordAccountActivity('owner-a','painel','visit',now);await recordAccountActivity('calculator-only','calculadora','calculator_use',now);await recordAccountActivity('owner-a','login','visit',now);
  for(const id of ['one','two'])f.db.prepare('INSERT INTO orders(id,restaurant_id,request_id,customer,phone,data,total,status,payment_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,'shop-a',id,'PRIVATE_BUYER','PRIVATE_PHONE','{"address":"PRIVATE_ADDRESS"}',5000,'delivered','pay_on_delivery',now.toISOString());
  const {adminAccounts}=f.load('lib/admin-accounts.ts'),before=JSON.stringify(f.db.prepare('SELECT * FROM restaurants').all()),data=await adminAccounts('',1,'all',now);assert.equal(data.total,4);const owner=data.items.find(r=>r.id==='owner-a');assert.equal(owner.orders30d,2);assert.equal(owner.ordersTotal,2);assert.equal(owner.shopsCount,1);assert.equal(data.summary.withOrders,1);assert.equal(data.summary.calculatorOnly,1);assert.equal(owner.lastLogin,now.toISOString());assert.equal(JSON.stringify(data).includes('PRIVATE_'),false);assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM restaurants').all()),before);
  const only=await adminAccounts('',1,'calculator',now);assert.deepEqual(only.items.map(r=>r.id),['calculator-only']);const noShop=await adminAccounts('',1,'no_menu',now);assert.deepEqual(noShop.items.map(r=>r.id).sort(),['calculator-only','new-account']);
  const Component=f.load('components/admin-accounts.tsx').default,html=renderToStaticMarkup(createElement(Component,{initial:data}));assert.match(html,/Última atividade no site/);assert.match(html,/Calculadora nos últimos 30 dias/);assert.match(html,/receber o primeiro pedido|levar os preços/);assert.doesNotMatch(html,/PRIVATE_/);
 }finally{f.close();}
});
test('activity days use Brasília at midnight and current logins survive deletion of active session records',async()=>{
 const f=fixture();try{profile(f,'owner-a','Pizzaiola A');await f.load('lib/account-activity.ts').recordAccountActivity('owner-a','login','visit',new Date('2026-10-26T02:30:00Z'));f.db.prepare('DELETE FROM auth_sessions').run();const data=await f.load('lib/admin-accounts.ts').adminAccounts('',1,'all',now);assert.equal(data.items.find(row=>row.id==='owner-a').lastLogin,'2026-10-26T02:30:00.000Z');assert.equal(f.db.prepare('SELECT day FROM account_activity').get().day,'2026-10-25');}finally{f.close();}
});
