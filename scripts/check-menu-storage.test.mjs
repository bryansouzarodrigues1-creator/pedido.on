import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {saveReading,loadReading,removeReading} from '../lib/menu-reader-storage.ts';
import {readMenuPages,prepareReaderItems,remainingReaderItems,applyReaderItems} from '../lib/menu-reader-policy.ts';
import {defaultRestaurant,demoRestaurant} from '../lib/domain.ts';
const item=readMenuPages([{id:'photo',lines:[{text:'Bebidas'},{text:'Suco R$ 8,00'}]}]).items[0];
test('readings resume from IndexedDB and stay separated by restaurant',async()=>{const reading={restaurantId:'shop-reader-a',savedAt:Date.now(),pages:[],items:[item],unmatched:[],text:''};await saveReading(reading);assert.deepEqual(await loadReading(reading.restaurantId),reading);assert.equal(await loadReading('shop-reader-b'),null);await removeReading(reading.restaurantId);assert.equal(await loadReading(reading.restaurantId),null);});
test('weak price confidence survives reload so another OCR pass cannot silently approve it',async()=>{
 const source={id:'photo',name:'Photo',image:'data:image/jpeg;base64,AA==',width:100,height:100,lines:[{text:'Bebidas'},{text:'Suco R$ 8,00',confidence:95,priceConfidence:24}]};
 const reading={restaurantId:'weak-price-reader',savedAt:Date.now(),pages:[source],items:readMenuPages([source]).items,unmatched:[]};
 await saveReading(reading);const restored=await loadReading(reading.restaurantId);
 assert.equal(restored.pages[0].lines[1].priceConfidence,24);
 const [item]=readMenuPages(restored.pages).items;assert.equal(item.reviewRequired,true);assert.equal(item.selected,false);
 await removeReading(reading.restaurantId);
});
test('expired or malformed readings cannot bypass re-review or restore unsafe images',async()=>{for(const reading of [{restaurantId:'expired',savedAt:Date.now()-8*86400000,pages:[],items:[item],unmatched:[]},{restaurantId:'invalid-price',savedAt:Date.now(),pages:[],items:[{...item,price:-500}],unmatched:[]},{restaurantId:'invalid-photo',savedAt:Date.now(),pages:[{id:'photo',image:'data:image/svg+xml,<svg onload="danger"/>',width:100,height:100,lines:[]}],items:[item],unmatched:[]}]){await saveReading(reading);assert.equal(await loadReading(reading.restaurantId),null);await removeReading(reading.restaurantId);}});

test('pasted text survives a text-only checkpoint and older checkpoints without text remain readable',async()=>{
 const reading={restaurantId:'text-reader',savedAt:Date.now(),pages:[],items:[],unmatched:[],text:'Bebidas\nSuco R$ 8,00\nRefrigerante 2L R$ 12,00'};
 await saveReading(reading);const restored=await loadReading(reading.restaurantId);assert.equal(restored.text,reading.text);
 assert.equal(readMenuPages([{id:'text',lines:restored.text.split('\n').map(text=>({text}))}]).items.length,2);
 const legacy={...reading,restaurantId:'legacy-reader'};delete legacy.text;await saveReading(legacy);
 assert.equal((await loadReading(legacy.restaurantId)).text,'');
});

test('partial import preserves valid skipped items and unresolved prices for a later import',async()=>{
 const data=defaultRestaurant('Pizzaria teste'),items=readMenuPages([{id:'text',lines:['Bebidas','Suco R$ 8,00','Refrigerante 2L R$ 12,00','Água'].map(text=>({text}))}]).items.map((item,i)=>({...item,selected:i===0}));
 let id=0;const patch=applyReaderItems(data,items,()=>`first-${++id}`),after={...data,...patch},remaining=remainingReaderItems(items,after);
 assert.deepEqual(remaining.map(v=>v.name),['Refrigerante 2L','Água']);assert.equal(remaining[0].price,1200);assert.equal(remaining[1].price,null);
 const reading={restaurantId:'partial-reader',savedAt:Date.now(),pages:[],items:remaining,unmatched:[],text:'original text'};
 await saveReading(reading);const restored=await loadReading(reading.restaurantId);
 const second=applyReaderItems(after,restored.items.map((item,i)=>({...item,selected:i===0})),()=>`second-${++id}`);
 assert.deepEqual(second.products.map(v=>v.name),['Suco','Refrigerante 2L']);assert.equal(after.products.length,1);
});

test('reopening an explicitly selected update repeatedly preserves its selection and does not invalidate its checkpoint',async()=>{
 const data=demoRestaurant(),raw=readMenuPages([{id:'text',lines:[{text:'Margherita G R$ 55,00'}]}]).items;
 let items=prepareReaderItems(raw,data);assert.equal(items[0].selected,false);items[0].selected=true;
 for(let i=0;i<30;i++){
  items=prepareReaderItems(items,data,{preserveSelection:true});
  await saveReading({restaurantId:'reopen-reader',savedAt:Date.now(),pages:[],items,unmatched:[]});
  const reading=await loadReading('reopen-reader');assert.ok(reading);items=reading.items;
 }
 assert.equal(items[0].selected,true);assert.equal(items[0].issues.length,1);assert.equal(items[0].sizes.g,5500);
 assert.equal(prepareReaderItems(raw,data,{preserveSelection:true})[0].selected,false,'A newly encountered duplicate still needs explicit approval');
 const missing={...items[0],existingId:'deleted-product'};
 const safe=prepareReaderItems([missing],data,{preserveSelection:true})[0];assert.equal(safe.selected,false);assert.equal(safe.existingId,'deleted-product');
 assert.throws(()=>applyReaderItems(data,[{...safe,selected:true}]),/mudou durante/);
});

test('ordered autosaves and deletion cannot resurrect old work; a failed write does not poison the next checkpoint',async()=>{
 const reading={restaurantId:'ordered-reader',savedAt:Date.now(),pages:[],items:[item],unmatched:[]};
 const saves=[saveReading({...reading,text:'first'}),saveReading({...reading,text:'second'}),removeReading(reading.restaurantId)];
 await Promise.all(saves);assert.equal(await loadReading(reading.restaurantId),null);
 const failed=saveReading({...reading,items:[{...item,uncloneable:()=>{}}]});const rejection=assert.rejects(failed);
 await saveReading({...reading,text:'after failure'});await rejection;
 assert.equal((await loadReading(reading.restaurantId)).text,'after failure');
});

test('malformed restored geometry, source lines, oversized text and impossible timestamps are rejected without crashing',async()=>{
 const reading={restaurantId:'malformed-reader',savedAt:Date.now(),pages:[],items:[item],unmatched:[]},source={id:'photo',name:'Photo',image:'data:image/jpeg;base64,AA==',width:100,height:100,lines:[]};
 for(const invalid of [{...reading,text:'a'.repeat(60001)},{...reading,savedAt:Date.now()+86400000},{...reading,pages:[{...source,width:999999}]},{...reading,pages:[{...source,lines:{unexpected:true}}]},{...reading,pages:[{...source,lines:[{text:'Suco',box:{x0:10,y0:10,x1:110,y1:20}}]}]},{...reading,unmatched:null}]){
  await saveReading(invalid);assert.equal(await loadReading(reading.restaurantId),null);
 }
});
