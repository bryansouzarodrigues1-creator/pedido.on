import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {saveReading,loadReading,removeReading} from '../lib/menu-reader-storage.ts';
import {readMenuPages} from '../lib/menu-reader-policy.ts';
const item=readMenuPages([{id:'photo',lines:[{text:'Bebidas'},{text:'Suco R$ 8,00'}]}]).items[0];
test('readings resume from IndexedDB and stay separated by restaurant',async()=>{const reading={restaurantId:'shop-reader-a',savedAt:Date.now(),pages:[],items:[item],unmatched:[]};await saveReading(reading);assert.deepEqual(await loadReading(reading.restaurantId),reading);assert.equal(await loadReading('shop-reader-b'),null);await removeReading(reading.restaurantId);assert.equal(await loadReading(reading.restaurantId),null);});
test('expired or malformed readings cannot bypass re-review or restore unsafe images',async()=>{for(const reading of [{restaurantId:'expired',savedAt:Date.now()-8*86400000,pages:[],items:[item],unmatched:[]},{restaurantId:'invalid-price',savedAt:Date.now(),pages:[],items:[{...item,price:-500}],unmatched:[]},{restaurantId:'invalid-photo',savedAt:Date.now(),pages:[{id:'photo',image:'data:image/svg+xml,<svg onload="danger"/>',width:100,height:100,lines:[]}],items:[item],unmatched:[]}]){await saveReading(reading);assert.equal(await loadReading(reading.restaurantId),null);await removeReading(reading.restaurantId);}});
