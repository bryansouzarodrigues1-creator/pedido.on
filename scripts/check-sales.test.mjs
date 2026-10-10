import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {demoRestaurant,priceLine,calculateOrder} from '../lib/domain.ts';
import {drinkSuggestions,addCartLine} from '../lib/menu-sales.ts';
import {salesDay,salesSummary} from '../lib/sales.ts';
const data=demoRestaurant();
const pizza={productIds:['margherita'],size:'g',quantity:1,note:''};
const drink={productIds:['refri'],quantity:1,note:''};

test('suggestions offer a real available beverage only after a meal is chosen',()=>{
  assert.deepEqual(drinkSuggestions(data,[]),[]);
  assert.deepEqual(drinkSuggestions(data,[drink]),[]);
  assert.deepEqual(drinkSuggestions(data,[pizza]).map(p=>p.id),['refri']);
  assert.deepEqual(drinkSuggestions(data,[pizza,drink]),[]);
  const unavailable={...data,products:data.products.map(p=>p.id==='refri'?{...p,enabled:false}:p)};
  assert.deepEqual(drinkSuggestions(unavailable,[pizza]),[]);
  const noPrice={...data,products:data.products.map(p=>p.id==='refri'?{...p,price:0}:p)};
  assert.deepEqual(drinkSuggestions(noPrice,[pizza]),[]);
});
test('a complete combo does not receive extra suggestions, and suggestions never change the cart',()=>{
  const cart=[{productIds:['combo-casa'],quantity:1,note:''}];
  assert.deepEqual(drinkSuggestions(data,cart),[]);
  assert.equal(cart.length,1);
  assert.deepEqual(cart[0].productIds,['combo-casa']);
  assert.equal(priceLine(data,cart[0]).total,6900);
});
test('adding a suggested drink is explicit and increases the actual server total',()=>{
  const original=[pizza];
  const items=addCartLine(original,drink);
  assert.equal(original.length,1);
  const input={requestId:crypto.randomUUID(),customer:'Cliente',phone:'11999999999',method:'delivery',address:'Rua Teste, 100, Centro',payment:'Pix',note:'',coupon:'',items};
  const summary=calculateOrder(data,input);
  assert.equal(summary.subtotal,7300);
  assert.equal(summary.total,7900);
});
test('repeat additions merge quantities, while distinct flavors and notes remain separate',()=>{
  const first=addCartLine([drink],drink);
  assert.equal(first.length,1);assert.equal(first[0].quantity,2);
  assert.equal(addCartLine(first,{...drink,note:'Sem gelo'}).length,2);
  assert.equal(addCartLine([pizza],{...pizza,crustId:'catupiry'}).length,2);
  assert.throws(()=>addCartLine([{...drink,quantity:20}],drink),/20/);
});
test('the sales day crosses UTC midnight correctly for São Paulo',()=>{
  assert.deepEqual(salesDay(new Date('2026-10-08T02:59:59Z')),{day:'2026-10-07',start:'2026-10-07T03:00:00.000Z',end:'2026-10-08T03:00:00.000Z'});
  assert.deepEqual(salesDay(new Date('2026-10-08T03:00:00Z')),{day:'2026-10-08',start:'2026-10-08T03:00:00.000Z',end:'2026-10-09T03:00:00.000Z'});
  assert.equal(salesDay(new Date('2027-01-01T02:00:00Z')).day,'2026-12-31');
});
test('production sales aggregates exclude pending and canceled orders and include more than the displayed history',()=>{
  // Run the actual production SELECT expressions against SQLite, rather than a copied formula.
  const source=readFileSync(new URL('../app/api/restaurants/[id]/orders/route.ts',import.meta.url),'utf8');
  const fields=[...source.matchAll(/(value|confirmed|pending):sql<number>`([^`]+)`/g)].map(([,name,expression])=>expression.replace(/\$\{orders\.(\w+)\}/g,'$1')+' as '+name);
  assert.equal(fields.length,3);
  const db=new DatabaseSync(':memory:');
  db.exec('create table orders (restaurant_id text, status text, total integer, created_at text)');
  const put=db.prepare('insert into orders values (?,?,?,?)');
  for(let i=0;i<120;i++)put.run('ours','confirmed',5900,'2026-10-08T04:00:00.000Z');
  put.run('ours','preparing',7000,'2026-10-08T05:00:00.000Z');
  put.run('ours','delivered',8000,'2026-10-08T06:00:00.000Z');
  put.run('ours','awaiting',99999,'2026-10-08T04:00:00.000Z');
  put.run('ours','canceled',99999,'2026-10-08T04:00:00.000Z');
  put.run('other','confirmed',99999,'2026-10-08T04:00:00.000Z');
  put.run('ours','confirmed',99999,'2026-10-08T02:59:59.999Z');
  put.run('ours','confirmed',99999,'2026-10-09T03:00:00.000Z');
  const day=salesDay(new Date('2026-10-08T15:00:00Z'));
  const actual=db.prepare(`select ${fields.join(',')} from orders where restaurant_id=? and created_at>=? and created_at<?`).get('ours',day.start,day.end);
  assert.deepEqual({...actual},{value:723000,confirmed:122,pending:1});
  assert.deepEqual(salesSummary(day.day,actual.value,actual.confirmed,actual.pending),{day:'2026-10-08',value:723000,confirmed:122,pending:1,average:5926});
  assert.equal(salesSummary(day.day,0,0,0).average,0);
  db.close();
});
