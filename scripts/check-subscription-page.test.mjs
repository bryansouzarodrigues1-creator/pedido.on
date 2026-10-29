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

test('the actual public home offers both canonical paid plans and preserves the free trial',()=>{
 const f=fixture();try{
  const Home=f.load('components/saas-landing.tsx').default,html=renderToStaticMarkup(createElement(Home));
  const essential=html.match(/<article[^>]*data-plan="essencial"[\s\S]*?<\/article>/)?.[0];
  const pro=html.match(/<article[^>]*data-plan="profissional"[\s\S]*?<\/article>/)?.[0];
  assert.ok(essential&&pro,'The home must render both paid plans, not only an unused card component');
  assert.match(essential,/ESSENCIAL/);assert.match(essential,/R\$ 49/);assert.match(essential,/href="\/assinatura\?plan=essencial"/);
  assert.match(pro,/>PRO</);assert.match(pro,/R\$ 89/);assert.doesNotMatch(pro,/R\$ 49/);assert.match(pro,/Atendente de IA no seu cardápio/);assert.match(pro,/Assistente do dono: ajustes de cardápio, textos e promoções/);assert.match(pro,/href="\/assinatura\?plan=profissional"/);
  assert.match(html,/>FREE</);assert.match(html,/10 dias grátis/);assert.match(html,/Duas rodadas de sugestões com modelos prontos/);assert.match(html,/1 imagem promocional de IA com texto no teste/);assert.doesNotMatch(html,/Quatro fotos|20 novas imagens|20 por semana/);assert.match(essential,/Até 3 novas imagens com IA por dia, com legenda/);assert.match(pro,/sem cota mensal fixa/);assert.match(html,/até 3 solicitações por minuto/);
  assert.ok(html.indexOf('owner-intake-message')<html.indexOf('data-plan="essencial"'));
  assert.doesNotMatch(html,/assinatura\?plan=rede|R\$ 149/);
 }finally{f.close();}
});

test('Essencial R$49 and Pro R$89 are purchasable while legacy Divulgação stays historical',async()=>{
 const f=fixture();try{
  const Cards=f.load('components/plan-cards.tsx').default,Page=f.load('app/assinatura/page.tsx').default;
  const html=renderToStaticMarkup(createElement(Cards));
  assert.deepEqual(publicPlanIds,['essencial','profissional']);
  assert.equal(publicPlanCatalog.profissional.amount,8900);
  assert.equal(publicPlanCatalog.essencial.amount,4900);
  assert.equal(planIds.length,3);
  assert.ok(html.includes('href="/assinatura?plan=essencial"'));
  assert.ok(html.includes("Ver assinatura Essencial · R$ 49/mês"));
  assert.ok(html.includes("Começar meus 10 dias grátis"));
  assert.ok(html.includes("10 dias grátis a partir da sua primeira pizzaria"));
  assert.ok(html.includes('href="/cadastro?next=%2Fapp%3Fnew%3D1%26plan%3Dessencial"'));
  assert.ok(html.includes('href="/assinatura?plan=profissional"'));
  assert.ok(html.includes('Atendente de IA no seu cardápio'));
  assert.ok(!html.includes('href="/assinatura?plan=rede"'));
  assert.ok(html.includes('R$ 89')&&!html.includes('R$ 149'));
  f.state.user=null;
  for(const value of ['essencial','profissional','rede']){
   await assert.rejects(Page({searchParams:Promise.resolve({plan:value})}),
     error=>error.location==='/entrar?next='+encodeURIComponent('/assinatura?plan='+(value==='profissional'?'profissional':'essencial')));
  }
  f.state.user={userId:'owner-a',displayName:'Dono A',email:'owner@example.test'};
  for(const plan of ['essencial','profissional','rede',undefined,'inexistente',['rede','essencial'],'__proto__']){
   const page=await Page({searchParams:Promise.resolve({plan})});
   assert.equal(findBilling(page).props.initialPlan,plan==='profissional'?'profissional':'essencial');
   assert.match(renderToStaticMarkup(page),/Essencial por R\$ 49 ou Pro por R\$ 89/);
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
