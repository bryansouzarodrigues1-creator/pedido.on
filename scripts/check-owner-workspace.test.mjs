import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './test-backend-fixture.mjs';
import {defaultRestaurant} from '../lib/domain.ts';

test('an existing unpublished empty account enters its own menu, with PDF-first import, an optional iFood action and no repeated creation flow',()=>{
 const f=fixture();try{
  const data=defaultRestaurant('Pizzaria existente');
  // Legacy record deliberately has no new presentation fields.
  delete data.presentation;
  const record={id:'shop-a',slug:'pizzaria-existente',name:data.name,data:JSON.stringify(data),revision:7,liveRevision:0,published:false,plan:'essencial',createdAt:'2026-10-01',updatedAt:'2026-10-01'};
  const before=JSON.stringify(record),Dashboard=f.load('components/dashboard.tsx').default;
  const html=renderToStaticMarkup(createElement(Dashboard,{initialRestaurants:[record],user:{name:'Tester',email:'tester@example.test'},signOutUrl:'/sair'}));
  assert.match(html,/Importar PDF ou fotos/);assert.match(html,/Tentar link do iFood/);assert.match(html,/Não tem PDF\? Solicitar que tragam meu cardápio/);assert.match(html,/Ver prévia/);
  assert.match(html,/aria-label="Editar cardápio"/);assert.match(html,/>Aparência</);assert.match(html,/>Ofertas</);
  assert.doesNotMatch(html,/Três passos para começar|Sua assistente para montar|quatro estilos prontos|Criar prévia|Criar com IA/);
  assert.equal(JSON.stringify(record),before);
  const nav=html.match(/<nav aria-label="Painel da pizzaria">([\s\S]*?)<\/nav>/)[1];
  assert.equal((nav.match(/<button/g)||[]).length,3);
 }finally{f.close();}
});

test('an already published legacy account keeps its public URL and products instead of being sent through onboarding',()=>{
 const f=fixture();try{
  const data={...f.data,name:'Minha pizzaria ativa'},record={id:'shop-a',slug:'minha-pizzaria-ativa',name:data.name,data:JSON.stringify(data),revision:3,liveRevision:2,published:true,plan:'essencial',createdAt:'2026-10-01',updatedAt:'2026-10-01'};
  const Dashboard=f.load('components/dashboard.tsx').default;
  const html=renderToStaticMarkup(createElement(Dashboard,{initialRestaurants:[record],user:{name:'Tester',email:'tester@example.test'},signOutUrl:'/sair'}));
  assert.match(html,/href="\/p\/minha-pizzaria-ativa"/);assert.match(html,/Ver online/);assert.match(html,/Pedidos/);
  assert.doesNotMatch(html,/Três passos para começar|Seu cardápio está em preparação|Criar meu cardápio/);
  assert.deepEqual(JSON.parse(record.data).products,data.products);
 }finally{f.close();}
});
