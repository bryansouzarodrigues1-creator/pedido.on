import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRestaurant} from '../lib/domain.ts';
import {readLocalMenuDraft,writeLocalMenuDraft,removeLocalMenuDraft,menuDraftKey} from '../lib/local-menu-draft.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',now=1800000000000;
function storage(){const rows=new Map();return {getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};}
test('draft and incomplete product editor survive a discard without publishing or changing server data',()=>{
 const store=storage(),draft=defaultRestaurant('Pizzaria QA'),original=JSON.stringify(draft),product={id:'qa-new',categoryId:draft.categories[0].id,name:'',description:'Em edição',kind:'pizza',image:'',price:0,sizes:{p:0,m:0,g:4900},enabled:true,featured:false};
 assert.equal(writeLocalMenuDraft(store,id,4,draft,product,now),true);const saved=readLocalMenuDraft(store,id,now);assert.equal(saved.revision,4);assert.equal(saved.product.sizes.g,4900);assert.equal(saved.product.name,'');assert.deepEqual(saved.draft,draft);assert.equal(JSON.stringify(draft),original);assert.equal(readLocalMenuDraft(store,other,now),null);
});
test('draft recovery rejects corrupt, oversized, expired and cross-store payloads',()=>{
 const store=storage(),draft=defaultRestaurant('Pizzaria QA');store.setItem(menuDraftKey(id),'invalid');assert.equal(readLocalMenuDraft(store,id,now),null);
 store.setItem(menuDraftKey(id),'x'.repeat(600001));assert.equal(readLocalMenuDraft(store,id,now),null);
 writeLocalMenuDraft(store,id,2,draft,null,now);assert.equal(readLocalMenuDraft(store,id,now+8*24*60*60*1000),null);assert.equal(readLocalMenuDraft(store,id,now-120000),null);
 store.setItem(menuDraftKey(other),store.getItem(menuDraftKey(id)));assert.equal(readLocalMenuDraft(store,other,now),null);
});
test('blocked storage is reported and removing a saved draft leaves other stores intact',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('full');},removeItem(){throw Error('blocked');}};assert.equal(writeLocalMenuDraft(blocked,id,1,defaultRestaurant('QA'),null,now),false);assert.equal(readLocalMenuDraft(blocked,id,now),null);assert.doesNotThrow(()=>removeLocalMenuDraft(blocked,id));
 const store=storage();for(const shop of [id,other])writeLocalMenuDraft(store,shop,2,defaultRestaurant('QA'),null,now);removeLocalMenuDraft(store,id);assert.equal(readLocalMenuDraft(store,id,now),null);assert.ok(readLocalMenuDraft(store,other,now));
});
test('checkpoint uses the menu schema and drops unrelated data, credentials and customer details',()=>{
 const store=storage(),draft={...defaultRestaurant('Pizzaria QA'),session:'secret',orders:[{customer:'private'}]};writeLocalMenuDraft(store,id,1,draft,null,now);const raw=store.getItem(menuDraftKey(id));assert.doesNotMatch(raw,/secret|private|orders|session/);
 assert.equal(writeLocalMenuDraft(store,id,1,{...draft,cover:'https://evil.test/pixel'},null,now),false);
});
