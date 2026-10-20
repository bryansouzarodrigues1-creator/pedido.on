import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {galleryStyles,galleryDesign,galleryReference,chosenGalleryDraft} from "../lib/gallery-styles.ts";
import {demoRestaurant,restaurantSchema} from "../lib/domain.ts";
import {saveMenuLaunch,readMenuLaunch} from "../lib/menu-launch.ts";
import {fixture} from "./test-backend-fixture.mjs";

test("each approved reference is a real, optimized WebP and never a remote tracking URL",()=>{
 for(const {id} of galleryStyles){
  const url=galleryReference(id);assert.match(url,/^\/assets\/style-references\/[a-z-]+\.webp$/);
  const bytes=readFileSync(new URL("../public"+url,import.meta.url));
  assert.equal(bytes.toString("ascii",0,4),"RIFF");assert.equal(bytes.toString("ascii",8,12),"WEBP");
  assert.ok(bytes.length>10000&&bytes.length<220000,id);
 }
});
test("all twelve identities survive schema and checkpoint round trips without mutating selling data",()=>{
 const original=demoRestaurant(),before=structuredClone(original);
 for(const {id} of galleryStyles){
  const next=restaurantSchema.parse(galleryDesign(original,id,"Minha pizzaria se chama Bella Massa"));
  assert.equal(next.presentation.identity,id);assert.equal(next.name,"Bella Massa");
  for(const key of ["products","crusts","promotions","pix","payments","coupon","deliveryFee","deliveryZones","whatsapp"])assert.deepEqual(next[key],before[key],id+" / "+key);
  const values=new Map(),store={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  saveMenuLaunch(store,{id:crypto.randomUUID(),savedAt:Date.now(),idea:"Minha pizzaria se chama Bella Massa",sourceText:"",hasPhotos:false,styleId:id,previewReady:true});
  const restored=readMenuLaunch(store),draft=chosenGalleryDraft("Bella Massa",restored.styleId,restored.idea);
  assert.equal(draft.presentation.identity,id);assert.deepEqual(draft.products,[]);assert.equal(draft.pix.enabled,false);
 }
 assert.deepEqual(original,before);
 assert.throws(()=>restaurantSchema.parse({...original,presentation:{...original.presentation,identity:"url(evil)"}}));
});
test("live menus and miniatures use the selected identity while legacy menus have no implicit identity",()=>{
 const f=fixture();try{
  const Menu=f.load("components/menu.tsx").default,Mini=f.load("components/ui.tsx").MiniMenu;
  for(const {id} of galleryStyles){
   const data=galleryDesign(demoRestaurant(),id,"");
   for(const [component,props] of [[Menu,{data,demo:true}],[Mini,{data,large:true}]]){
    const html=renderToStaticMarkup(createElement(component,props));assert.match(html,new RegExp("identity-"+id));assert.match(html,/Margherita/);
   }
  }
  assert.doesNotMatch(renderToStaticMarkup(createElement(Menu,{data:demoRestaurant(),demo:true})),/identity-/);
 }finally{f.close();}
});
test("all twelve layouts keep a confirmed product photo and exact price visible, including compact styles",()=>{
 const f=fixture();try{
  const Menu=f.load("components/menu.tsx").default,Mini=f.load("components/ui.tsx").MiniMenu;
  for(const {id} of galleryStyles){
   const data=galleryDesign(demoRestaurant(),id,"");
   const product=data.products[0];product.image='/media/test-product/photo.jpg';product.price=2900;
   if(product.kind==='pizza')product.sizes={p:2900,m:4500,g:5900};
   for(const [component,props] of [[Menu,{data,preview:true}],[Mini,{data,large:true}]]){
    const html=renderToStaticMarkup(createElement(component,props));
    assert.match(html,/\/media\/test-product\/photo.jpg/,id);
    assert.match(html,/R\$[\s\u00a0]*29,00/,id);
   }
  }
 }finally{f.close();}
});
test("each newly added style reaches the private restaurant record without examples or AI jobs",async()=>{
 for(const styleId of ["forno-brasa","napoli-rua","fatia-pop","pizza-vinho"]){
  const f=fixture();try{
   const response=await f.call("restaurants","POST",{}, {name:"Pizzaria da Esquina",slug:"teste-"+styleId,theme:"classic",plan:"essencial",vision:"Minha pizzaria se chama Pizzaria da Esquina",styleId});
   assert.equal(response.status,201,await response.clone().text());
   const row=(await response.json()).restaurant,data=JSON.parse(row.data);
   assert.equal(row.published,false);assert.equal(data.presentation.identity,styleId);assert.deepEqual(data.products,[]);assert.equal(data.pix.key,"");
   assert.equal(f.db.prepare("SELECT COUNT(*) n FROM studio_jobs").get().n,0);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM image_jobs").get().n,0);
  }finally{f.close();}
 }
});
