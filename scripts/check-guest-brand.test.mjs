import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {brandImage,saveBrandAssets,loadBrandAssets,removeBrandAssets} from "../lib/guest-brand-assets.ts";
import {saveMenuLaunch,readMenuLaunch,guestReadingKey} from "../lib/menu-launch.ts";
import {adoptMenuLaunch} from "../lib/menu-launch-storage.ts";
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const fixture={name:"logo.png",type:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=="};
test("validated logo and cover are separate from menu OCR and cannot be replaced by unsafe asset data",async()=>{
 const key="brand-"+crypto.randomUUID();try{
  assert.equal(brandImage.parse(fixture).name,"logo.png");
  await saveBrandAssets({key,logo:fixture});
  assert.deepEqual((await loadBrandAssets(key)).logo,fixture);
  await saveBrandAssets({key,logo:fixture,cover:{...fixture,name:"cover.png"}});
  const restored=await loadBrandAssets(key);assert.equal(restored.cover.name,"cover.png");
  assert.throws(()=>saveBrandAssets({key,logo:{...fixture,data:"javascript:alert(1)"}}));
  assert.throws(()=>saveBrandAssets({key,cover:{...fixture,name:"x",type:"image/svg+xml"}}));
  assert.equal((await loadBrandAssets(key)).logo.data,fixture.data);
 }finally{await removeBrandAssets(key);assert.equal(await loadBrandAssets(key),null);}
});
test("guest logo is transferred after login only when durable; another restaurant never receives it",async()=>{
 const id=crypto.randomUUID(),store=storage(),launch={id,savedAt:Date.now(),idea:"Uma pizzaria com azul escuro",sourceText:"",hasPhotos:false,hasAssets:true,styleId:"noite-premium",refinement:"Cantos retos",previewReady:true},key=guestReadingKey(id);
 saveMenuLaunch(store,launch);
 await saveBrandAssets({key,logo:fixture});
 try{
  const target="brand-shop-a-"+crypto.randomUUID(),other="brand-shop-b-"+crypto.randomUUID();
  const adoption=await adoptMenuLaunch(launch,target,store);
  assert.deepEqual(adoption,{hasSource:false,sourceText:""});
  assert.equal(readMenuLaunch(store),null);assert.equal((await loadBrandAssets(target)).logo.name,"logo.png");
  assert.equal(await loadBrandAssets(other),null);assert.equal(await loadBrandAssets(key),null);
  await removeBrandAssets(target);
 }finally{await removeBrandAssets(key);}
});
test("a missing referenced logo blocks adoption without destroying the guest session",async()=>{
 const store=storage(),launch={id:crypto.randomUUID(),savedAt:Date.now(),idea:"Pizzaria",sourceText:"",hasPhotos:false,hasAssets:true};
 saveMenuLaunch(store,launch);await assert.rejects(adoptMenuLaunch(launch,"no-logo",store),/imagens iniciais/);
 assert.deepEqual(readMenuLaunch(store),launch);
});
