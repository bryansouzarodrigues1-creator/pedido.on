import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './test-backend-fixture.mjs';
test('landing explains what a digital menu changes in the order and offers a working demo before signup',()=>{
 const f=fixture();try{const Component=f.load('components/saas-landing.tsx').default,html=renderToStaticMarkup(createElement(Component));assert.match(html,/Seu cardápio em um link/);assert.match(html,/cliente vê sabores e preços/);assert.match(html,/monta o pedido/);assert.match(html,/Por que ter um cardápio digital/);assert.match(html,/Ver um cardápio funcionando/);assert.match(html,/href="\/demo\/editorial"/);assert.match(html,/calculadora gratuita/);assert.match(html,/após verificar sua loja/);assert.doesNotMatch(html,/vendas garantidas|lucro garantido/);}finally{f.close();}
});
