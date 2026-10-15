import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {billingPost} from '../lib/billing-client.ts';
import {planIds,planCatalog} from '../lib/plan-catalog.ts';
import {fixture} from './test-backend-fixture.mjs';

function findBilling(element){
 if(!element||typeof element!=='object')return null;
 if(element.type?.name==='BillingControls')return element;
 for(const child of [element.props?.children].flat(Infinity)){
  const found=findBilling(child);if(found)return found;
 }
 return null;
}

test('each public paid plan opens the authenticated subscription page with the same plan; anonymous access preserves it',async()=>{
 const f=fixture();try{
  const Cards=f.load('components/plan-cards.tsx').default,Page=f.load('app/assinatura/page.tsx').default;
  const html=renderToStaticMarkup(createElement(Cards));
  for(const plan of planIds){
   assert.ok(html.includes(`href="/assinatura?plan=${plan}"`));
   assert.ok(html.includes(`Assinar ${planCatalog[plan].name}`));
   f.state.user=null;
   await assert.rejects(Page({searchParams:Promise.resolve({plan})}),error=>error.location==='/entrar?next='+encodeURIComponent('/assinatura?plan='+plan));
   f.state.user={userId:'owner-a',displayName:'Dono A',email:'owner@example.test'};
   const page=await Page({searchParams:Promise.resolve({plan})});
   assert.equal(findBilling(page).props.initialPlan,plan);
   assert.match(renderToStaticMarkup(page),/Sua assinatura/);
  }
  for(const value of [undefined,'inexistente',['rede','essencial'],'__proto__']){
   const page=await Page({searchParams:Promise.resolve({plan:value})});
   assert.equal(findBilling(page).props.initialPlan,'essencial');
  }
  assert.equal(f.db.prepare('SELECT count(*) n FROM asaas_intents').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM orders').get().n,0);
 }finally{f.close();}
});

test('billing client obtains the session CSRF token before financial POSTs and never retries an ambiguous response',async()=>{
 const original=globalThis.fetch,calls=[],token='ab'.repeat(32);
 try{
  globalThis.fetch=async(path,options={})=>{calls.push({path,options});if(path==='/api/auth/config')return Response.json({csrf:token});return Response.json({error:'Operação ainda não confirmada'},{status:503});};
  const body={plan:'profissional',requestId:crypto.randomUUID(),document:'00012345600'};
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
