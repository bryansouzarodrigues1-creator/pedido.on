import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './test-backend-fixture.mjs';

test('draft previews keep prices while treating service conditions as unconfirmed',()=>{
 const f=fixture();try{
  const Menu=f.load('components/menu.tsx').default;
  const data={...f.data,eta:'99–120 min',deliveryFee:1300,isOpen:true};
  const preview=renderToStaticMarkup(createElement(Menu,{data,preview:true,demo:true}));
  assert.match(preview,/Prazo a confirmar/);assert.match(preview,/Entrega a confirmar/);
  assert.match(preview,/Formas de pagamento a confirmar/);
  assert.doesNotMatch(preview,/99–120 min|Entrega sem taxa|>Aberto</);
  assert.match(preview,/Margherita/);
  const published=renderToStaticMarkup(createElement(Menu,{data,slug:'qa',siteOrderingAllowed:true}));
  assert.match(published,/99–120 min/);assert.match(published,/>Aberto</);
  assert.doesNotMatch(published,/Prazo a confirmar|Entrega a confirmar/);
 }finally{f.close();}
});

test('preview checkout excludes unconfirmed delivery fees and never labels them free',()=>{
 const f=fixture();try{
  const Checkout=f.load('components/menu.tsx').Checkout;
  const props={data:{...f.data,deliveryFee:1300},slug:'',cart:[{productIds:['margherita'],size:'g',quantity:1,note:''}],demo:true,preview:true,approvalRequired:false,deliveryAccess:null,pickupOnly:false,initialDetails:{neighborhood:'',customer:'',phone:'',address:'',method:'delivery',payment:'Dinheiro',note:''},onDetailsChange(){},onDone(){},onEditCart(){}};
  const html=renderToStaticMarkup(createElement(Checkout,props));
  assert.match(html,/Produtos · entrega a confirmar/);assert.match(html,/A confirmar/);
  assert.doesNotMatch(html,/Sem taxa|13,00/);
  assert.match(html,/Nenhum pedido será enviado/);
 }finally{f.close();}
});
