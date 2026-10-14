// Import workflow + actual route code; external identity and D1/R2 adapters are simulated.
import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {fixture} from './test-backend-fixture.mjs';
import {readMenuPages,importReaderItems} from '../lib/menu-reader-policy.ts';
import {saveReading,loadReading,removeReading} from '../lib/menu-reader-storage.ts';
const sources=()=>readMenuPages([{id:'text',lines:['Bebidas','Suco Beta R$ 8,00','Água Beta R$ 5,00'].map(text=>({text}))}]).items;
test('a reviewed import waits for draft acknowledgement, saves only selected products and preserves the public menu, Pix and remaining checkpoint',async()=>{
 const f=fixture();try{
  const before=f.db.prepare("SELECT * FROM restaurants WHERE id='shop-a'").get(),items=sources().map((item,i)=>({...item,selected:i===0}));
  const reading={restaurantId:'shop-a',savedAt:Date.now(),pages:[],items,unmatched:[],text:'original text'};await saveReading(reading);
  let acknowledge,completed=false;const ack=new Promise(resolve=>{acknowledge=resolve;});
  const operation=importReaderItems(f.data,items,async patch=>{
   await ack;
   const response=await f.call('restaurant','PUT',{id:'shop-a'},{data:{...f.data,...patch},revision:1});
   assert.equal(response.status,200,await response.clone().text());
  });
  void operation.then(()=>{completed=true;});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(completed,false);assert.equal(f.db.prepare("SELECT data FROM restaurants WHERE id='shop-a'").get().data,before.data);
  assert.equal((await loadReading('shop-a')).items.length,2);
  acknowledge();const result=await operation;
  const after=f.db.prepare("SELECT * FROM restaurants WHERE id='shop-a'").get(),data=JSON.parse(after.data);
  assert.equal(after.revision,2);assert.equal(after.published_data,before.published_data);assert.deepEqual(data.pix,f.data.pix);
  assert.equal(data.products.filter(p=>p.name==='Suco Beta').length,1);assert.equal(data.products.filter(p=>p.name==='Água Beta').length,0);
  await saveReading({...reading,items:result.remaining});assert.equal((await loadReading('shop-a')).items[0].name,'Água Beta');
 }finally{await removeReading('shop-a');f.close();}
});
test('revision conflict and another owner cannot acknowledge an import or erase the original reading',async()=>{
 const f=fixture();try{
  const items=sources(),reading={restaurantId:'shop-a',savedAt:Date.now(),pages:[],items,unmatched:[]};await saveReading(reading);
  const before=f.db.prepare("SELECT data,published_data FROM restaurants WHERE id='shop-a'").get();
  f.db.prepare("UPDATE restaurants SET revision=2 WHERE id='shop-a'").run();
  const persist=async patch=>{
   const response=await f.call('restaurant','PUT',{id:'shop-a'},{data:{...f.data,...patch},revision:1});
   if(!response.ok)throw Error((await response.json()).error);
  };
  await assert.rejects(importReaderItems(f.data,items,persist),/outra aba/);
  assert.equal((await loadReading('shop-a')).items.length,2);
  f.state.user={userId:'owner-b',displayName:'Other owner',email:'other@example.test',fullName:null};
  await assert.rejects(importReaderItems(f.data,items,persist),/não encontrada/);
  assert.equal((await loadReading('shop-a')).items.length,2);
  assert.deepEqual(f.db.prepare("SELECT data,published_data FROM restaurants WHERE id='shop-a'").get(),before);
 }finally{await removeReading('shop-a');f.close();}
});
