import test from "node:test";
import assert from "node:assert/strict";
import {creatorGalleryIds,suggestedCreatorStyles,creatorVisualPreview,showcasePhoto} from "../lib/creator-showcase.ts";
import {galleryStyle,galleryStyleId} from "../lib/gallery-styles.ts";
import {defaultRestaurant,demoRestaurant,restaurantSchema} from "../lib/domain.ts";
import {extractOwnerName} from "../lib/owner-intake.ts";
test("curated collection offers 80 valid editable models with balanced compositions and keeps old IDs",()=>{
 assert.equal(creatorGalleryIds.length,80);assert.equal(new Set(creatorGalleryIds).size,80);
 for(const id of creatorGalleryIds)galleryStyleId.parse(id);
 for(const layout of ["list","poster","cards","compact"])assert.equal(creatorGalleryIds.filter(id=>galleryStyle(id).presentation.layout===layout).length,20);
 assert.equal(galleryStyleId.parse("madeira-nostalgica-ameixa-editorial"),"madeira-nostalgica-ameixa-editorial");
 assert.deepEqual(suggestedCreatorStyles("madeira e nostalgia"),suggestedCreatorStyles("madeira e nostalgia"));
 assert.match(suggestedCreatorStyles("madeira e nostalgia")[0],/^madeira-nostalgica-/);
 assert.equal(new Set(creatorGalleryIds.map(showcasePhoto)).size,4);
});
test("empty visual preview has photos and prices but its save data remains empty",()=>{
 const draft=defaultRestaurant("Forno Azul"),before=structuredClone(draft),view=creatorVisualPreview(draft,"forno-classico");
 assert.equal(view.name,"Forno Azul");assert.equal(view.products.length,3);
 assert.ok(view.products.every(p=>p.image.startsWith("/assets/pizza-demo-")&&p.sizes.g>0));
 restaurantSchema.parse(view);assert.deepEqual(draft,before);assert.equal(draft.products.length,0);assert.equal(draft.cover,"");
});
test("real product prices and photos always replace showcase food",()=>{
 const draft=demoRestaurant(),before=structuredClone(draft),view=creatorVisualPreview(draft,"familia");
 assert.deepEqual(view.products,before.products);assert.equal(view.cover,draft.cover);assert.deepEqual(draft,before);
});
test("natural name confirmations do not swallow the requested design",()=>{
 for(const [message,name] of [["O nome é Della Mama e eu quero fotos grandes","Della Mama"],["Ela se chama Forno Azul e gostaria de madeira","Forno Azul"],["Minha pizzaria se chama Casa Verde, eu quero amarelo e azul","Casa Verde"]])assert.equal(extractOwnerName(message),name);
 assert.equal(extractOwnerName("Quero um cardápio azul com pizzas grandes"),undefined);
});
