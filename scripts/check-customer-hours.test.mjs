import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './test-backend-fixture.mjs';
import {demoRestaurant,restaurantSchema} from '../lib/domain.ts';

test('o horário informado aparece diretamente no cardápio, sem expandir detalhes',()=>{
 const f=fixture();
 try{
  const Menu=f.load('components/menu.tsx').default;
  const hours='Terça a domingo, das 18h às 23h';
  const data=restaurantSchema.parse({...demoRestaurant(),hours});
  const html=renderToStaticMarkup(createElement(Menu,{data,preview:true}));
  assert.match(html,/class="menu-public-hours"/);
  assert.match(html,/Horário de funcionamento/);
  assert.match(html,/Terça a domingo, das 18h às 23h/);
  assert.match(html,/Endereço e pagamento/);
  assert.match(html,/<details class="restaurant-info"/);
 }finally{f.close();}
});

test('um cardápio sem horário informado não inventa dias, horas ou estado de funcionamento',()=>{
 const f=fixture();
 try{
  const Menu=f.load('components/menu.tsx').default;
  const html=renderToStaticMarkup(createElement(Menu,{data:restaurantSchema.parse({...demoRestaurant(),hours:''}),preview:true}));
  assert.doesNotMatch(html,/menu-public-hours|Horário de funcionamento/);
  assert.match(html,/Endereço e pagamento/);
 }finally{f.close();}
});

test('o dono encontra um atalho nos pedidos e o campo esclarece o efeito sobre os pedidos',()=>{
 const source=readFileSync(new URL('../components/dashboard.tsx',import.meta.url),'utf8');
 assert.match(source,/Configurar horários/);
 assert.match(source,/Horário de funcionamento/);
 assert.match(source,/não abre nem fecha pedidos automaticamente/);
 assert.match(source,/onChange=\{e => change\(\{ hours: e.target.value \}\)\}/);
});
