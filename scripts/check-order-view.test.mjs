import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './test-backend-fixture.mjs';
test('the actual customer view renders with simulated storage denial and keeps the valid private-link chat available',async()=>{
 const f=fixture(),previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),previousLocation=Object.getOwnPropertyDescriptor(globalThis,'location'),previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  const {order,input}=await f.create();
  const response=await f.call('customer','GET',{id:order.id},undefined,{'x-pedido-order-token':input.trackingToken});
  const current=(await response.json()).order;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
  Object.defineProperty(globalThis,'location',{configurable:true,value:{hash:'#'+input.trackingToken}});
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('SecurityError: storage denied');}});
  const {CustomerOrderView}=f.load('components/order-tracking.tsx');
  const html=renderToStaticMarkup(createElement(CustomerOrderView,{order:current}));
  assert.match(html,/Pix direto para a pizzaria/);assert.match(html,/Conversa do pedido/);
  assert.doesNotMatch(html,new RegExp(input.trackingToken));
 }finally{
  for(const [name,descriptor] of [['window',previousWindow],['location',previousLocation],['localStorage',previousStorage]])if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  f.close();
 }
});

test('customer chat uses the token restored by tracking without reopening denied permanent storage',async()=>{
 const f=fixture(),previous={};for(const name of ['window','location','localStorage'])previous[name]=Object.getOwnPropertyDescriptor(globalThis,name);
 try{
  const {order,input}=await f.create();const response=await f.call('customer','GET',{id:order.id},undefined,{'x-pedido-order-token':input.trackingToken});const current=(await response.json()).order;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
  for(const name of ['location','localStorage'])Object.defineProperty(globalThis,name,{configurable:true,get(){throw Error('Tracking already restored the token; do not read '+name);}});
  const {CustomerOrderView}=f.load('components/order-tracking.tsx');
  const html=renderToStaticMarkup(createElement(CustomerOrderView,{order:current,token:input.trackingToken}));
  assert.match(html,/Conversa do pedido/);assert.doesNotMatch(html,new RegExp(input.trackingToken));
 }finally{for(const name of Object.keys(previous))if(previous[name])Object.defineProperty(globalThis,name,previous[name]);else delete globalThis[name];f.close();}
});
