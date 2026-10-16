import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {saveLaunchCheckpoint,loadLaunchCheckpoint,clearLaunchCheckpoint} from '../lib/menu-launch-checkpoint.ts';
import {readMenuLaunch} from '../lib/menu-launch.ts';
import {adoptMenuLaunch} from '../lib/menu-launch-storage.ts';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const blocked={getItem(){throw Error('SecurityError');},setItem(){throw Error('SecurityError');},removeItem(){throw Error('SecurityError');}};
const launch=patch=>({id:crypto.randomUUID(),savedAt:Date.now(),idea:'Minha pizzaria se chama Fogo Azul',sourceText:'',hasPhotos:false,styleId:'atelier',refinement:'Cantos suaves\nAgora azul',...patch});
test('a guest project survives unavailable localStorage through an independent durable checkpoint',async()=>{
 const value=launch();await saveLaunchCheckpoint(value,blocked);
 assert.deepEqual(await loadLaunchCheckpoint(blocked),value);
 await clearLaunchCheckpoint(value.id,blocked);assert.equal(await loadLaunchCheckpoint(blocked),null);
});
test('a text project survives unavailable IndexedDB when localStorage remains available',async()=>{
 const store=storage(),value=launch(),db=globalThis.indexedDB;globalThis.indexedDB=undefined;
 try{await saveLaunchCheckpoint(value,store);assert.deepEqual(await loadLaunchCheckpoint(store),value);await clearLaunchCheckpoint(value.id,store);assert.equal(await loadLaunchCheckpoint(store),null);}finally{globalThis.indexedDB=db;}
});
test('blocked storage is an explicit failure, never a false successful handoff',async()=>{
 const db=globalThis.indexedDB;globalThis.indexedDB=undefined;
 try{await assert.rejects(saveLaunchCheckpoint(launch(),blocked),/não permite guardar/);}finally{globalThis.indexedDB=db;}
});
test('an adopted project is not resurrected when localStorage deletion fails',async()=>{
 const store=storage(),value=launch();await saveLaunchCheckpoint(value,store);
 const failing={...store,removeItem(){throw Error('blocked delete');}};
 await clearLaunchCheckpoint(value.id,failing);
 assert.equal(readMenuLaunch(store).id,value.id);
 assert.equal(await loadLaunchCheckpoint(failing),null);
});
test('queued saves and cleanup preserve a newer unrelated project',async()=>{
 const store=storage(),first=launch(),second=launch({savedAt:Date.now()+1});
 const a=saveLaunchCheckpoint(first,store),b=saveLaunchCheckpoint(second,store),c=clearLaunchCheckpoint(first.id,store);
 await Promise.all([a,b,c]);assert.deepEqual(await loadLaunchCheckpoint(store),second);
 await clearLaunchCheckpoint(second.id,store);
});
test('a failed handoff retains its existing restaurant instead of moving attachments into another draft',async()=>{
 const store=storage(),target=crypto.randomUUID(),value=launch({targetRestaurantId:target});
 await saveLaunchCheckpoint(value,store);
 assert.equal((await loadLaunchCheckpoint(store)).targetRestaurantId,target);
 await assert.rejects(adoptMenuLaunch(value,crypto.randomUUID(),store),/outro rascunho/);
 assert.deepEqual(await loadLaunchCheckpoint(store),value);
 await adoptMenuLaunch(value,target,store);assert.equal(await loadLaunchCheckpoint(store),null);
});
