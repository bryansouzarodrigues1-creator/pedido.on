import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {detailedDemoRestaurant} from "../lib/demo-rich.ts";
import {demoRestaurant,restaurantSchema,calculateOrder} from "../lib/domain.ts";
import {galleryStyles,galleryDesign} from "../lib/gallery-styles.ts";

test("complete demo has four categories and many illustrated products, not persisted to new owner",()=>{
 const sample=detailedDemoRestaurant();
 const before=demoRestaurant();
 const parsed=restaurantSchema.parse(sample);
 assert.equal(parsed.name,"Sua pizzaria");
 assert.deepEqual(before.products.map(x=>x.id),["margherita","calabresa","quatro-queijos","chocolate","refri","combo-casa"]);
 assert.ok(parsed.products.length>=16);
 assert.equal(new Set(parsed.products.map(x=>x.id)).size,parsed.products.length);
 for(const category of parsed.categories)assert.ok(parsed.products.filter(x=>x.categoryId===category.id).length>=3,category.name);
 assert.ok(parsed.products.every(x=>x.enabled));
 assert.ok(parsed.products.every(x=>x.kind!=="pizza"||x.sizes.g>0));
 assert.ok(parsed.products.every(x=>x.kind!=="simple"||x.price>0));
 assert.equal(before.products.length,6,"Default owner samples remain unchanged");
});

test("12 demonstration styles share the full catalog, preserving item prices and cart",()=>{
 const baseline=detailedDemoRestaurant();
 for(const style of galleryStyles){
  const data=restaurantSchema.parse(galleryDesign(detailedDemoRestaurant(style.theme),style.id,""));
  assert.equal(data.products.length,baseline.products.length,style.id);
  assert.deepEqual(data.products,baseline.products,style.id);
  assert.equal(data.presentation?.identity,style.id);
  const cart=calculateOrder(data,{
   requestId:"11111111-1111-4111-8111-111111111111",
   customer:"Cliente demonstração",phone:"11999990000",method:"pickup",address:"",
   payment:"Dinheiro",note:"",coupon:"",items:[{productIds:["margherita","calabresa"],size:"g",quantity:1,note:"",crustId:"catupiry"}]
  });
  assert.equal(cart.total,7000,style.id);
 }
});
test("chosen design hides secondary actions while preserving the test and customizations",()=>{
 const code=readFileSync(new URL("../components/idea-start.tsx",import.meta.url),"utf8");
 assert.match(code,/<details className="ai-selected-more">/);
 assert.match(code,/Testar meu cardápio completo/);
 assert.match(code,/FullMenu data={design\(styleId\)} demo preview/);
 assert.match(code,/detailedDemoRestaurant\("editorial"\)/);
 assert.match(code,/Usar este modelo/);
 assert.match(code,/Ver imagem de referência/);
 assert.match(code,/Ajustar cores, fotos e textos/);
 assert.doesNotMatch(code,/Continuar com este cardápio/);
});
