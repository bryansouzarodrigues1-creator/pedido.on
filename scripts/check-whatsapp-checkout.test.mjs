import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-backend-fixture.mjs';
import {calculateOrder,whatsappCheckoutUrl,money} from '../lib/domain.ts';
import {bundleVersion} from '../lib/promotions.ts';
function publish(f,data){f.db.prepare('UPDATE restaurants SET published_data=? WHERE id=?').run(JSON.stringify(data),'shop-a');}
test('WhatsApp checkout quotes the published catalog and opens the owner number without orders, receipts or messages',async()=>{const f=fixture();try{
 const input=f.input({note:'Entregar no portão & tocar a campainha',expectedTotal:6500});
 const before=f.db.prepare('SELECT COUNT(*) n FROM orders').get().n;
 const response=await f.call('whatsapp','POST',{slug:'pizzaria-a'},input);assert.equal(response.status,200,await response.clone().text());
 const body=await response.json(),url=new URL(body.whatsappUrl),message=url.searchParams.get('text');assert.equal(url.host,'wa.me');assert.equal(url.pathname,'/5511999999999');assert.equal(body.total,6500);assert.match(message,/Margherita/);assert.ok(message.includes(money(6500)));assert.ok(message.includes(input.note));assert.match(message,/aguardo confirmação/);assert.doesNotMatch(message,/#|pago|aprovado|https:/i);
 assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},input)).status,200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,before);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM order_receipts').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM order_messages').get().n,0);
 assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},input,{Origin:'https://other.test'})).status,403);
}finally{f.close();}});
test('WhatsApp requires review after a price change and recalculates coupons, combo quantities and pickup',async()=>{const f=fixture();try{
 const p={id:'combo-teste',kind:'bundle',name:'2 pizzas e refrigerante',items:[{productId:'margherita',size:'g',quantity:2},{productId:'refri',quantity:1}],price:14000,startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),enabled:true};
 const data={...f.data,promotions:[p],coupon:{code:'CASA',percent:10,minTotal:0,enabled:true}};publish(f,data);
 const input=f.input({method:'pickup',items:[{productIds:[],bundleId:p.id,bundleVersion:bundleVersion(p),quantity:2,note:''},{productIds:['refri'],quantity:1,note:''}],coupon:'CASA',expectedTotal:1});
 const changed=await f.call('whatsapp','POST',{slug:'pizzaria-a'},input);assert.equal(changed.status,409);const quote=(await changed.json()).quote;assert.equal(quote.total,29260);assert.equal(quote.discount,140);assert.equal(quote.delivery,0);
 const ready=await f.call('whatsapp','POST',{slug:'pizzaria-a'},{...input,expectedTotal:quote.total});assert.equal(ready.status,200);const text=new URL((await ready.json()).whatsappUrl).searchParams.get('text');assert.match(text,/4× Margherita/);assert.match(text,/Retirada no local/);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
 p.endsAt=new Date(Date.now()-1000).toISOString();p.startsAt=new Date(Date.now()-60000).toISOString();publish(f,data);assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},{...input,expectedTotal:quote.total})).status,400);
}finally{f.close();}});
test('WhatsApp preserves delivery approval and refuses closed, suspended or unconfigured shops',async()=>{const f=fixture();try{
 f.env.PEDIDO_DELIVERY_APPROVAL='true';const config=f.load('lib/delivery-config.ts');if(!config.deliveryApprovalEnabled())f.env.PEDIDO_DELIVERY_APPROVAL_ENABLED='true';
 assert.equal(config.deliveryApprovalEnabled(),true);
 assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},f.input())).status,403);
 publish(f,{...f.data,whatsapp:''});assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},f.input({method:'pickup'}))).status,400);
 publish(f,{...f.data,isOpen:false});assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},f.input({method:'pickup'}))).status,400);
 f.db.prepare("INSERT INTO account_access(owner_id,mode,updated_by,updated_at) VALUES('owner-a','suspended','test',?)").run(new Date().toISOString());assert.equal((await f.call('whatsapp','POST',{slug:'pizzaria-a'},f.input({method:'pickup'}))).status,404);
 assert.equal(whatsappCheckoutUrl({...f.data,whatsapp:''},calculateOrder(f.data,f.input())),null);
}finally{f.close();}});
