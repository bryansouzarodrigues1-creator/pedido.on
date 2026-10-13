import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {demoRestaurant,restaurantSchema,priceLine,calculateOrder,whatsappMessage} from '../lib/domain.ts';
import {promotionCartLine,promotionMessage,bundleVersion,promotionContainsProduct} from '../lib/promotions.ts';
import {addCartLine,drinkSuggestions,reviewCart,restoreCart} from '../lib/menu-sales.ts';
import {fixture} from './test-backend-fixture.mjs';

const now=Date.parse('2026-10-13T19:00:00Z');
const offer=(at=now)=>({id:'bundle-family',kind:'bundle',name:'2 pizzas + refrigerante',price:14000,startsAt:new Date(at-60000).toISOString(),endsAt:new Date(at+300000).toISOString(),enabled:true,items:[{productId:'margherita',size:'g',quantity:2},{productId:'refri',quantity:1}]});
const order=items=>({requestId:crypto.randomUUID(),customer:'Cliente teste',phone:'11999999999',method:'delivery',address:'Rua Teste, 100',payment:'Dinheiro',note:'',coupon:'',items});

test('the reported price case accepts a R$200 offer on a R$20 pizza, equal prices and genuine reductions',()=>{
 for(const price of [1900,2000,20000]){
  const data=demoRestaurant(),p={id:'single',productId:'margherita',size:'m',price,startsAt:new Date(now-60000).toISOString(),endsAt:new Date(now+60000).toISOString(),enabled:true};
  data.products[0].sizes.m=2000;data.promotions=[p];assert.equal(restaurantSchema.safeParse(data).success,true);
  assert.equal(priceLine(data,promotionCartLine(p),now).unitPrice,price);
  const message=promotionMessage(data,p,'https://example.test/p/casa');assert.equal(/de R\$/.test(message),price<2000);
 }
});

test('a bundle buys all configured units for one fixed price and keeps the individual catalog untouched',()=>{
 const p=offer(),data={...demoRestaurant(),promotions:[p]},before=JSON.stringify(data);
 assert.equal(restaurantSchema.safeParse(data).success,true);
 const line=priceLine(data,{...promotionCartLine(p),quantity:3},now);assert.equal(line.unitPrice,14000);assert.equal(line.total,42000);assert.equal(line.promotionId,p.id);
 assert.match(line.detail,/6× Margherita \(G\)/);assert.match(line.detail,/3× Refrigerante 2 L/);assert.equal(JSON.stringify(data),before);
 const summary=calculateOrder(data,order([promotionCartLine(p)]),now);assert.equal(summary.subtotal,14000);assert.equal(summary.total,14600);
 const message=whatsappMessage(data,summary,'TEST');assert.match(message,/2× Margherita/);assert.match(message,/1× Refrigerante/);assert.match(message,/146,00/);
});

test('invalid compositions, sizes, quantities and duplicate identifiers cannot enter a menu',()=>{
 const data=demoRestaurant(),p=offer();
 for(const bad of [{...p,items:[]},{...p,items:[{productId:'margherita',size:'g',quantity:1}]},{...p,items:[{productId:'foreign',quantity:2}]},{...p,items:[{productId:'margherita',quantity:2}]},{...p,items:[{productId:'refri',size:'g',quantity:2}]},{...p,items:[{productId:'refri',quantity:0}]},{...p,items:[{productId:'refri',quantity:1.5}]},{...p,items:[{productId:'refri',quantity:7}]},{...p,items:[p.items[0],p.items[0]]},{...p,price:0},{...p,endsAt:p.startsAt}])assert.equal(restaurantSchema.safeParse({...data,promotions:[bad]}).success,false);
 assert.equal(restaurantSchema.safeParse({...data,promotions:[p,{...p,name:'Other bundle'}]}).success,false);
 assert.equal(promotionContainsProduct(p,'refri'),true);assert.equal(promotionContainsProduct(p,'another'),false);
});

test('forged selections, unsupported customization and old composition references cannot change bundle fulfillment',()=>{
 const p=offer(),data={...demoRestaurant(),promotions:[p]},line=promotionCartLine(p);
 for(const bad of [{...line,productIds:['refri']},{...line,size:'p'},{...line,crustId:'catupiry'},{...line,bundleId:'foreign'},{...line,bundleVersion:'forged'},{...line,bundleVersion:undefined}])assert.throws(()=>calculateOrder(data,order([bad]),now));
 const changed={...p,items:[{productId:'calabresa',size:'m',quantity:2},p.items[1]]};assert.throws(()=>priceLine({...data,promotions:[changed]},line,now),/composição.*mudou/);
 assert.equal(bundleVersion({...p,items:[...p.items].reverse()}),bundleVersion(p));
 assert.equal(priceLine(data,{...line,price:1,promotionId:'forged',label:'fake'},now).unitPrice,14000);
});

test('disabled or expired bundles and unavailable components are visible as invalid cart entries instead of crashing checkout',()=>{
 const p=offer(),data={...demoRestaurant(),promotions:[p]},line=promotionCartLine(p),ordinary={productIds:['calabresa'],size:'g',quantity:1,note:''};
 for(const current of [{...data,promotions:[{...p,enabled:false}]},{...data,promotions:[{...p,endsAt:new Date(now).toISOString()}]},{...data,products:data.products.map(product=>product.id==='refri'?{...product,enabled:false}:product)}]){
  assert.throws(()=>priceLine(current,line,now),/indisponível/);const checked=reviewCart(current,[line,ordinary],now);assert.equal(checked.invalid.length,1);assert.equal(checked.lines.length,1);assert.equal(checked.invalid[0].index,0);const stored=JSON.parse(JSON.stringify([line,ordinary,null,{...ordinary,note:{unsafe:'object'}}]));assert.deepEqual(restoreCart(current,stored,false,now),[line,ordinary]);assert.deepEqual(restoreCart(current,stored,true,now),[ordinary]);
 }
 assert.equal(reviewCart(data,[null],now).invalid.length,1);
 assert.equal(reviewCart(data,[{...ordinary,note:{unsafe:'object'}}],now).invalid.length,1);
});

test('cart consolidation keeps separate bundle identities and respects unit limits; included drinks are not suggested again',()=>{
 const p=offer(),other={...p,id:'second-bundle',name:'Outro combo'},data={...demoRestaurant(),promotions:[p,other]};
 let cart=addCartLine([],promotionCartLine(p));cart=addCartLine(cart,promotionCartLine(p));assert.equal(cart.length,1);assert.equal(cart[0].quantity,2);
 cart=addCartLine(cart,promotionCartLine(other));assert.equal(cart.length,2);assert.throws(()=>addCartLine([{...promotionCartLine(p),quantity:20}],promotionCartLine(p)),/20 unidades/);
 assert.deepEqual(drinkSuggestions(data,[promotionCartLine(p)]),[]);
});

test('coupons remain separate from promotions and a changed individual price does not rewrite the fixed bundle price',()=>{
 const p=offer(),data={...demoRestaurant(),promotions:[p],coupon:{enabled:true,code:'PIZZA10',percent:10,minTotal:0}},input={...order([promotionCartLine(p),{productIds:['refri'],quantity:1,note:''}]),coupon:'PIZZA10'};
 const summary=calculateOrder(data,input,now);assert.equal(summary.subtotal,15400);assert.equal(summary.discount,140);assert.equal(summary.total,15860);
 const changed={...data,products:data.products.map(product=>product.id==='margherita'?{...product,sizes:{...product.sizes,g:9000}}:product)};assert.equal(priceLine(changed,promotionCartLine(p),now).unitPrice,14000);
});

test('actual customer/editor markup shows bundle contents and free prices without advertising a false discount',()=>{
 const f=fixture();try{
  const p=offer(Date.now()),data={...f.data,promotions:[p]},Menu=f.load('components/menu.tsx').default;
  const html=renderToStaticMarkup(createElement(Menu,{data,preview:true}));assert.match(html,/2 pizzas \+ refrigerante/);assert.match(html,/2× Margherita/);assert.match(html,/1× Refrigerante/);assert.doesNotMatch(html,/<del>/);
  const Editor=f.load('components/daily-promotions.tsx').PromotionEditor,value={kind:'bundle',name:p.name,productId:'',size:'g',items:p.items,price:'140',duration:'today',ends:''};
  const editor=renderToStaticMarkup(createElement(Editor,{data,value,onChange:()=>{},onSave:()=>{},onCancel:()=>{},error:''}));assert.match(editor,/Preço do combo/);assert.match(editor,/O que vem no combo/);assert.match(editor,/Quantidade/);assert.match(editor,/Salvar no rascunho/);assert.doesNotMatch(editor,/menor que|Preço normal|inteligência artificial|Horário de Brasília/);
  const Daily=f.load('components/daily-promotions.tsx').default;const compact=renderToStaticMarkup(createElement(Daily,{data:{...f.data,promotions:[]},slug:'pizzaria-a',onChange:()=>{},canShare:false}));assert.match(compact,/>Promoções</);assert.doesNotMatch(compact,/PARA VENDER HOJE|escolha o sabor|sem acumular|mensagem pronta|Preço da oferta|type="datetime-local"/i);
 }finally{f.close();}
});

test('the actual checkout renders an expired combo as a removable-review step without losing the rest of the order',()=>{
 const f=fixture();try{
  const p=offer(Date.now()),data={...f.data,promotions:[{...p,endsAt:new Date(Date.now()-1000).toISOString()}]},Checkout=f.load('components/menu.tsx').Checkout;
  const html=renderToStaticMarkup(createElement(Checkout,{data,slug:'pizzaria-a',cart:[promotionCartLine(p)],demo:true,approvalRequired:false,deliveryAccess:null,pickupOnly:false,initialDetails:{customer:'',phone:'',address:'',method:'delivery',payment:'Dinheiro',note:'',neighborhood:''},onDetailsChange:()=>{},onDone:()=>{},onEditCart:()=>{}}));
  assert.match(html,/Seu pedido precisa de revisão/);assert.match(html,/Voltar ao pedido/);assert.doesNotMatch(html,/Confirmar pedido/);
 }finally{f.close();}
});

test('real order routes quote a changed bundle price, require confirmation and preserve the fulfilled snapshot across later edits',async()=>{
 const f=fixture();try{
  const p=offer(Date.now()),data={...f.data,promotions:[p]};f.db.prepare("UPDATE restaurants SET published_data=? WHERE id='shop-a'").run(JSON.stringify(data));
  const input=f.input({items:[promotionCartLine(p)],expectedTotal:10000});const first=await f.call('create','POST',{slug:'pizzaria-a'},input);assert.equal(first.status,409);const quote=(await first.json()).quote;assert.equal(quote.total,14600);assert.match(quote.items[0].detail,/2× Margherita/);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
  const accepted=await f.call('create','POST',{slug:'pizzaria-a'},{...input,expectedTotal:quote.total});assert.equal(accepted.status,201,await accepted.clone().text());const created=await accepted.json();
  const saved=f.db.prepare('SELECT data,pix_snapshot FROM orders WHERE id=?').get(created.id);assert.equal(JSON.parse(saved.data).total,14600);assert.equal(JSON.parse(saved.pix_snapshot).key,f.data.pix.key);
  f.db.prepare("UPDATE restaurants SET published_data=? WHERE id='shop-a'").run(JSON.stringify({...data,promotions:[{...p,items:[{productId:'calabresa',size:'m',quantity:2},p.items[1]]}]}));
  const repeated=await f.call('create','POST',{slug:'pizzaria-a'},{...input,expectedTotal:quote.total});assert.equal(repeated.status,200);assert.equal((await repeated.json()).id,created.id);assert.equal(f.db.prepare('SELECT data FROM orders WHERE id=?').get(created.id).data,saved.data);
  const customer=await f.call('customer','GET',{id:created.id},undefined,{'x-pedido-order-token':input.trackingToken});assert.equal(customer.status,200);assert.match((await customer.json()).order.summary.items[0].detail,/2× Margherita/);
 }finally{f.close();}
});

test('real routes reject stale compositions and forged bundle selections with zero new orders',async()=>{
 const f=fixture();try{
  const p=offer(Date.now()),line=promotionCartLine(p),changed={...p,items:[{productId:'calabresa',size:'g',quantity:2},p.items[1]]};f.db.prepare("UPDATE restaurants SET published_data=? WHERE id='shop-a'").run(JSON.stringify({...f.data,promotions:[changed]}));
  const stale=await f.call('create','POST',{slug:'pizzaria-a'},f.input({items:[line],expectedTotal:14600}));assert.equal(stale.status,400);assert.match((await stale.json()).error,/composição.*mudou/);
  const forged=await f.call('create','POST',{slug:'pizzaria-a'},f.input({items:[{...promotionCartLine(changed),productIds:['refri'],size:'p'}],expectedTotal:1}));assert.equal(forged.status,400);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
 }finally{f.close();}
});
