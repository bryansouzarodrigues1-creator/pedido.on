import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueStyles} from '../lib/menu-catalogue.ts';
import {allGalleryStyles,suggestedGalleryStyles,galleryDesign,galleryStyleId} from '../lib/gallery-styles.ts';
import {emptyOwnerIntake,ownerPreviewFromDescription,ownerVisualBriefing,intakeFinished} from '../lib/owner-intake.ts';
import {defaultRestaurant,demoRestaurant,restaurantSchema} from '../lib/domain.ts';
import {parseGuestPreview,previewImage} from '../lib/guest-preview-policy.ts';
import {assistanceRuntime,shopA,shopB} from './menu-assistance-worker-fixture.mjs';

test('240 catalogue compositions plus 12 originals are distinct, validated and preserve all products',()=>{
 assert.equal(catalogueStyles.length,240);assert.equal(allGalleryStyles.length,252);
 assert.equal(new Set(allGalleryStyles.map(x=>x.id)).size,252);
 const original=demoRestaurant(),before=structuredClone(original);
 const signatures=new Set();
 for(const style of catalogueStyles){
  const data=restaurantSchema.parse(galleryDesign(original,galleryStyleId.parse(style.id),''));
  assert.deepEqual(data.products,before.products);assert.deepEqual(data.pix,before.pix);
  assert.equal(data.presentation.catalogueId,style.id);
  const {catalogueId,...composition}=style.presentation;signatures.add(JSON.stringify([style.texture,style.theme,style.accent,composition]));
 }
 assert.equal(signatures.size,240);assert.deepEqual(original,before);
});

test('wood and nostalgia immediately choose a matching texture without requiring business details',()=>{
 for(const text of ['Quero madeira e nostalgia, como a casa da minha avó','madeira e nostalgia','Minha pizzaria se chama Forno da Vila. Quero madeira, nostalgia e fotos grandes.']){
  const state=ownerPreviewFromDescription(emptyOwnerIntake(),text);
  assert.equal(intakeFinished(state),true);assert.equal(state.answers.whatsapp,'');
  assert.match(suggestedGalleryStyles(ownerVisualBriefing(state))[0],/^madeira-nostalgica-/);
 }
 const state=ownerPreviewFromDescription(emptyOwnerIntake(),'');
 assert.equal(state.answers.name,'Sua pizzaria');assert.equal(state.answers.menu,'');
 assert.equal(defaultRestaurant(state.answers.name).products.length,0);
});

test('preview image policy rejects scripts, SVG, external tracking and path traversal',()=>{
 for(const image of ['javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=','https://evil.test/photo.jpg','/assets/../secret','data:image/png;base64,PHNjcmlwdD4='])assert.throws(()=>previewImage(image));
 assert.equal(previewImage('/assets/pizza.webp'),'/assets/pizza.webp');
 assert.throws(()=>parseGuestPreview({products:[null]}));
});

const create=(name,whatsapp)=>({name,slug:name.toLowerCase().replaceAll(' ','-'),theme:'editorial',plan:'essencial',whatsapp});
test('real D1 uniqueness normalizes Brazilian formats, preserves legacy duplicates and serializes competing inserts',async()=>{
 const f=await assistanceRuntime({legacyPhone:'(11) 99999-9999'});try{
  const before=(await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all()).results;
  assert.equal(before.length,2);
  let r=await f.call('/api/creator/availability',{method:'POST',actor:'',body:{whatsapp:'(11) 99999-9999'}});assert.deepEqual(await r.json(),{available:false});
  r=await f.call('/api/restaurants',{method:'POST',body:create('Duplicate Shop','+55 (11) 99999-9999')});assert.equal(r.status,409,await r.clone().text());
  assert.deepEqual((await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all()).results,before);
  const races=await Promise.all(['Nova Um','Nova Dois'].map(name=>f.call('/api/restaurants',{method:'POST',body:create(name,'(22) 98765-4321')})));
  assert.deepEqual(races.map(v=>v.status).sort(),[201,409]);
  assert.equal((await f.db.prepare("SELECT count(*) n FROM restaurant_whatsapp_registry WHERE phone='5522987654321'").first()).n,1);
  const row=before.find(x=>x.id===shopA),data=JSON.parse(row.data);
  r=await f.call('/api/restaurants/'+shopA,{method:'PUT',body:{revision:row.revision,data:{...data,tagline:'Nova chamada'}}});assert.equal(r.status,200,await r.clone().text());
  const other=before.find(x=>x.id===shopB);
  r=await f.call('/api/restaurants/'+shopB,{method:'PUT',actor:'owner-b',body:{revision:other.revision,data:{...JSON.parse(other.data),whatsapp:'5522987654321'}}});assert.equal(r.status,409,await r.clone().text());
  assert.equal((await f.db.prepare('SELECT data FROM restaurants WHERE id=?').bind(shopB).first()).data,other.data);
 }finally{await f.close();}
});

test('anonymous real D1/R2 preview survives a fresh visitor, stores no account and expires',async()=>{
 const f=await assistanceRuntime();try{
  const before=(await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all()).results;
  const data=galleryDesign(demoRestaurant(),'madeira-nostalgica-mel-editorial','');data.name='Prévia da Vila';
  data.products=Array.from({length:200},(_,i)=>({...data.products[0],id:'product-'+i,name:'Pizza '+i}));
  let r=await f.call('/api/guest-previews',{method:'POST',actor:'',body:data});assert.equal(r.status,201,await r.clone().text());const saved=await r.json();assert.match(saved.path,/^\/v\/[a-f0-9]{32}$/);
  r=await f.mf.dispatchFetch('https://local.test/api/guest-previews/'+saved.id);assert.equal(r.status,200,await r.clone().text());
  const restored=await r.json();assert.equal(restored.data.name,data.name);assert.equal(restored.data.products.length,200);assert.equal(restored.data.presentation.catalogueId,'madeira-nostalgica-mel-editorial');assert.match(r.headers.get('x-robots-tag'),/noindex/);
  assert.deepEqual((await f.db.prepare('SELECT * FROM restaurants ORDER BY id').all()).results,before);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM auth_sessions').first()).n,0);
  await f.db.prepare('UPDATE guest_menu_previews SET expires_at=1 WHERE id=?').bind(saved.id).run();
  assert.equal((await f.mf.dispatchFetch('https://local.test/api/guest-previews/'+saved.id)).status,410);
 }finally{await f.close();}
});

test('anonymous preview rejects cross origin, missing CSRF, unsafe content and excessive creation',async()=>{
 const f=await assistanceRuntime();try{
  const data=defaultRestaurant('Loja de teste');
  for(const headers of [{origin:'https://evil.test'},{'x-pedido-csrf':''}])assert.equal((await f.call('/api/guest-previews',{method:'POST',actor:'',body:data,headers})).status,403);
  assert.equal((await f.call('/api/guest-previews',{method:'POST',actor:'',body:{...data,logo:'data:image/svg+xml;base64,PHN2Zz4='}})).status,400);
  for(let i=0;i<9;i++)assert.equal((await f.call('/api/guest-previews',{method:'POST',actor:'',body:data})).status,201);
  assert.equal((await f.call('/api/guest-previews',{method:'POST',actor:'',body:data})).status,429);
 }finally{await f.close();}
});
