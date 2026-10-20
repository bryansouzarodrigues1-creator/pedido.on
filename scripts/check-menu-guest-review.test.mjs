import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshGuestMenuReading} from '../lib/menu-guest-review.ts';
import {readMenuPages} from '../lib/menu-reader-policy.ts';

test('guest reload rebuilds obsolete product names from retained PDF text without changing the source or restaurant',()=>{
 const pages=[{id:'pdf-page',name:'menu.pdf · 2',image:'data:image/jpeg;base64,AAAA',width:650,height:850,
  lines:[{text:'Pizzas'},{text:'Margherita'},{text:'molho especial e manjericão R$ 55,00'},{text:'Calabresa G R$ 64,00'}]}];
 const stale={restaurantId:'guest-only',savedAt:1,pages,text:'',items:readMenuPages([{id:'old',lines:[{text:'Bebidas'},{text:'Nome antigo incorreto R$ 55,00'}]}]).items,unmatched:[]};
 const original=structuredClone(stale),fresh=refreshGuestMenuReading(stale);
 assert.deepEqual(fresh.items.map(item=>item.name),['Margherita','Calabresa']);
 assert.equal(fresh.items[0].price,5500);assert.equal(fresh.items[1].sizes.g,6400);
 assert.equal(fresh.items[0].kind,'pizza');assert.equal(fresh.items[0].sizes.g,null,'Never invent a missing size');
 assert.equal(fresh.pages,stale.pages);assert.deepEqual(stale,original);
 assert.equal(fresh.restaurantId,'guest-only');
});

test('guest refresh preserves an unavailable source for recovery and strips shared iFood prose before parsing products',()=>{
 const saved={restaurantId:'guest',savedAt:1,pages:[],items:[],unmatched:[],text:''};
 assert.equal(refreshGuestMenuReading(saved),saved);
 const text='https://www.ifood.com.br/delivery/cabo-frio-rj/forno-azul/900caad5-258e-4bf7-9458-353cb0bffe60\nBebidas\nÁgua mineral R$ 5,50';
 const fresh=refreshGuestMenuReading({...saved,text});
 assert.deepEqual(fresh.items.map(item=>[item.name,item.price]),[['Água mineral',550]]);
 assert.equal(fresh.text,text);
});
