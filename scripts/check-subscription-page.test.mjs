import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {billingPost} from '../lib/billing-client.ts';
import {planIds,planCatalog,publicPlanCatalog,publicPlanIds} from '../lib/plan-catalog.ts';
import {fixture} from './test-backend-fixture.mjs';

function findBilling(element){
 if(!element||typeof element!=='object')return null;
 if(element.type?.name==='BillingControls')return element;
 for(const child of [element.props?.children].flat(Infinity)){
  const found=findBilling(child);if(found)return found;
 }
 return null;
}

test('only R$49 is purchasable and visible, while old plan catalog stays for historical invoices',async()=>{
 const f=fixture();try{
  const Cards=f.load('components/plan-cards.tsx').default,Page=f.load('app/assinatura/page.tsx').default;
  const html=renderToStaticMarkup(createElement(Cards));
  assert.deepEqual(publicPlanIds,['essencial']);
  assert.equal(publicPlanCatalog.essencial.amount,4900);
  assert.equal(planIds.length,3);
  assert.ok(html.includes('href="/assinatura?plan=essencial"'));
  assert.ok(html.includes("Assinar por R$ 49/mês"));
  assert.ok(!html.includes('href="/assinatura?plan=profissional"'));
  assert.ok(!html.includes('href="/assinatura?plan=rede"'));
  assert.ok(!html.includes('R$ 89')&&!html.includes('R$ 149'));
  f.state.user=null;
  for(const value of ['essencial','profissional','rede']){
   await assert.rejects(Page({searchParams:Promise.resolve({plan:value})}),
     error=>error.location==='/entrar?next='+encodeURIComponent('/assinatura?plan=essencial'));
  }
  f.state.user={userId:'owner-a',displayName:'Dono A',email:'owner@example.test'};
  for(const plan of ['essencial','profissional','rede',undefined,'inexistente',['rede','essencial'],'__proto__']){
   const page=await Page({searchParams:Promise.resolve({plan})});
   assert.equal(findBilling(page).props.initialPlan,'essencial');
   assert.match(renderToStaticMarkup(page),/Um plano de R\$ 49 por mês/);
  }
  assert.equal(planCatalog.profissional.amount,8900);
  assert.equal(planCatalog.rede.amount,14900);
  assert.equal(f.db.prepare('SELECT count(*) n FROM asaas_intents').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM orders').get().n,0);
 }finally{f.close();}
});

test('billing client obtains the session CSRF token before financial POSTs and never retries an ambiguous response',async()=>{
 const original=globalThis.fetch,calls=[],token='ab'.repeat(32);
 try{
  globalThis.fetch=async(path,options={})=>{calls.push({path,options});if(path==='/api/auth/config')return Response.json({csrf:token});return Response.json({error:'Operação ainda não confirmada'},{status:503});};
  const body={plan:'essencial',requestId:crypto.randomUUID(),document:'00012345600'};
  const response=await billingPost('/api/billing/checkout',body);
  assert.equal(response.status,503);assert.equal(calls.length,2);
  assert.equal(calls[0].path,'/api/auth/config');assert.equal(calls[0].options.cache,'no-store');
  assert.equal(calls[1].path,'/api/billing/checkout');assert.equal(calls[1].options.method,'POST');
  assert.equal(calls[1].options.headers['x-pedido-csrf'],token);
  assert.equal(calls[1].options.credentials,'same-origin');assert.deepEqual(JSON.parse(calls[1].options.body),body);
  for(const config of [Response.json({csrf:'invalid'}),Response.json({}),new Response('',{status:401})]){
   calls.length=0;globalThis.fetch=async path=>{calls.push(path);return config;};
   await assert.rejects(billingPost('/api/billing/cancel',{confirm:true}));
   assert.deepEqual(calls,['/api/auth/config']);
  }
 }finally{globalThis.fetch=original;}
});
