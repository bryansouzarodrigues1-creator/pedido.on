import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {fixture} from "./test-backend-fixture.mjs";
import {galleryStyles,galleryReference,suggestedGalleryStyles,galleryDesign,chosenGalleryDraft,galleryStyleId,supportsLocalRefinement} from "../lib/gallery-styles.ts";
import {defaultRestaurant,demoRestaurant,restaurantSchema} from "../lib/domain.ts";
import {saveMenuLaunch,readMenuLaunch,launchKey} from "../lib/menu-launch.ts";
const makeStore=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
test("twelve visual presets provide four distinct compositions in three discovery rounds",()=>{
 assert.equal(galleryStyles.length,12);assert.equal(new Set(galleryStyles.map(x=>x.id)).size,12);
 const result=suggestedGalleryStyles("Quero algo preto, mais delivery, fotos enormes e promoções");
 assert.equal(result.length,12);assert.equal(new Set(result).size,12);
 for(const round of [result.slice(0,4),result.slice(4,8),result.slice(8,12)]){
  assert.equal(round.length,4);
  assert.equal(new Set(round.map(id=>galleryStyles.find(x=>x.id===id).presentation.layout)).size,4);
 }
 assert.ok(result.slice(0,4).includes("noite-premium")||result.slice(0,4).includes("urbano"));
 assert.deepEqual(suggestedGalleryStyles("pizza artesanal"),suggestedGalleryStyles("pizza artesanal"));
 assert.equal(supportsLocalRefinement("Quero fotos grandes e cantos quadrados"),true);
 assert.equal(supportsLocalRefinement("Quero um cardápio giratório em formato tridimensional de lua"),false);
});
test("later refinements replace earlier colours and composition while keeping unrelated choices",()=>{
 const original=demoRestaurant();
 const next=galleryDesign(original,"forno-classico","","Quero verde com cantos arredondados\nAgora azul e uma lista compacta");
 assert.equal(next.accent,"#296bac");
 assert.equal(next.presentation.corners,"soft");
 assert.equal(next.presentation.layout,"compact");
 assert.deepEqual(next.products,original.products);
 assert.equal(supportsLocalRefinement("Crie uma foto de pizza em formato de lua"),false);
 assert.equal(supportsLocalRefinement("Uma animação 3D da pizza"),false);
});
test("a guest can freely refine composition without touching prices or personal data",()=>{
 const original=demoRestaurant("dark"),copy=structuredClone(original);
 const id=galleryStyleId.parse("noite-premium");
 const next=galleryDesign(original,id,"Quero delivery escuro e fotos grandes","Prefiro uma lista elegante com cantos retos e verde");
 assert.equal(next.presentation.layout,"list");assert.equal(next.presentation.corners,"square");assert.equal(next.accent,"#37634a");
 assert.deepEqual(next.products,copy.products);assert.deepEqual(next.promotions,copy.promotions);
 assert.deepEqual(next.pix,copy.pix);assert.deepEqual(next.payments,copy.payments);
 assert.deepEqual(original,copy);
 assert.throws(()=>galleryStyleId.parse("inject-css"));
});
test("the chosen style and feedback remain after signup, are schema-validated and never enter the URL",()=>{
 const store=makeStore(),value={id:crypto.randomUUID(),savedAt:Date.now(),idea:"Minha pizzaria se chama Bella Massa. Quero um visual premium",sourceText:"Bebidas\nSuco R$ 9,00",hasPhotos:false,styleId:"atelier",refinement:"Capa clara, com letras elegantes",brandName:"Bella Massa",previewReady:true,aiRequested:true};
 saveMenuLaunch(store,value);assert.deepEqual(readMenuLaunch(store),value);
 assert.equal(store.getItem(launchKey).includes("Bella Massa"),true);
 assert.throws(()=>saveMenuLaunch(store,{...value,styleId:"evil"}));
 assert.throws(()=>saveMenuLaunch(store,{...value,refinement:"X".repeat(601)}));
 assert.throws(()=>saveMenuLaunch(store,{...value,brandName:"a"}));
 const chosen=chosenGalleryDraft("Bella Massa","atelier",value.idea,value.refinement);
 assert.equal(restaurantSchema.parse(chosen).name,"Bella Massa");
 assert.equal(chosen.presentation.layout,"poster");
});
test("new restaurant route stores the chosen real preset, respects the explicit name and remains unpublished",async()=>{
 const f=fixture();try{
  const value={name:"Pizzaria da Esquina",slug:"pizzaria-da-esquina",theme:"classic",plan:"essencial",vision:"Quero uma pizzaria escura premium com fotos grandes",styleId:"forno-classico",refinement:"Deixe bem compacto com poucos textos"};
  const res=await f.call("restaurants","POST",{},value);
  assert.equal(res.status,201,await res.clone().text());
  const {restaurant}=await res.json(),data=JSON.parse(restaurant.data);
  assert.equal(data.name,"Pizzaria da Esquina");
  assert.equal(data.presentation.layout,"compact");assert.equal(data.presentation.hero,"compact");
  assert.equal(data.products.length,0);assert.equal(data.pix.enabled,false);
  assert.equal(restaurant.published,false);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM studio_jobs").get().n,0);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM image_jobs").get().n,0);
  const bad=await f.call("restaurants","POST",{}, {...value,slug:"outro-nome",styleId:"invalid-script"});
  assert.equal(bad.status,400);
 }finally{f.close();}
});
test("the guest creator has a dedicated entry and public menus link to it before signup",()=>{
 const f=fixture();try{
  const Page=f.load("app/criar/page.tsx").default,html=renderToStaticMarkup(createElement(Page));
  assert.match(html,/id="owner-intake-message"/);assert.match(html,/Anexar cardápio/);
  assert.match(html,/Vamos preparar sua pizzaria juntos/);assert.doesNotMatch(html,/<input[^>]*(?:type="email"|type="password")/);
  const Menu=f.load("components/menu.tsx").default;
  const menu=renderToStaticMarkup(createElement(Menu,{data:demoRestaurant(),slug:"pizza"}));
  assert.match(menu,/\/criar/);
  const Home=f.load("components/saas-landing.tsx").default;
  const landing=renderToStaticMarkup(createElement(Home));assert.match(landing,/id="owner-intake-message"/);assert.doesNotMatch(landing,/id="planos"|Menos complicação/);
 }finally{f.close();}
});
