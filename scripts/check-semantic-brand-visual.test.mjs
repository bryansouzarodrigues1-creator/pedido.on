import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {brandPaletteFromBriefing} from "../lib/brand-palette.ts";
import {galleryDesign,galleryStyles,supportsLocalRefinement,chosenGalleryDraft} from "../lib/gallery-styles.ts";
import {nameFromBriefing} from "../lib/studio-policy.ts";
import {menuPresentation,presentationSchema} from "../lib/menu-design.ts";
import {demoRestaurant,restaurantSchema} from "../lib/domain.ts";

const briefing="O nome da minha pizzaria é Pizzaria Brasa do Mar e fica em Búzios. Quero amarelo cor de queijo e azul de mar, fotos grandes e letras elegantes.";
test("regression: yellow cheese and sea blue are separate, contrasting roles",()=>{
 const result=brandPaletteFromBriefing(briefing);
 assert.ok(result,"the engine must detect a complete two-tone request");
 assert.equal(result.motif,"sea-cheese");
 assert.equal(result.primary,"#2169AC");
 assert.equal(result.palette.secondary,"#F2BD38");
 assert.equal(result.palette.background,"#FFF2B6");
 assert.notEqual(result.palette.surface,result.palette.background);
 assert.notEqual(result.palette.text,result.palette.surface);
 assert.equal(brandPaletteFromBriefing("Quero só azul"),null);
 assert.equal(brandPaletteFromBriefing("Nada definido ainda"),null);
 assert.equal(supportsLocalRefinement("amarelo-queijo e azul-mar"),true);
});
test("name and location never contaminate the verified store title",()=>{
 assert.equal(nameFromBriefing(briefing),"Pizzaria Brasa do Mar");
 const menu=galleryDesign(demoRestaurant(),"forno-classico",briefing);
 assert.equal(menu.name,"Pizzaria Brasa do Mar");
 assert.ok(!menu.name.includes("Búzios"));
 assert.equal(menu.presentation?.motif,"sea-cheese");
});
test("all 12 identities display primary, secondary and semantic palette while preserving distinct layouts",()=>{
 const base=demoRestaurant();
 const layouts=new Set();
 const phrases=new Set();
 for(const style of galleryStyles){
  const d=galleryDesign(base,style.id,briefing);
  assert.equal(d.accent,"#2169AC");
  assert.equal(d.presentation?.palette?.secondary,"#F2BD38");
  assert.equal(d.presentation?.palette?.background,"#FFF2B6");
  assert.equal(d.presentation?.palette?.text,"#153850");
  assert.equal(d.presentation?.motif,"sea-cheese");
  assert.ok(d.presentation?.identity===style.id);
  assert.equal(presentationSchema.safeParse(d.presentation).success,true,style.id);
  assert.equal(restaurantSchema.safeParse(d).success,true,style.id);
  assert.equal(d.products.length,base.products.length);
  assert.equal(d.deliveryFee,base.deliveryFee);
  assert.deepEqual(d.pix,base.pix);
  layouts.add(menuPresentation(d).layout);
  phrases.add(d.tagline);
 }
 assert.equal(layouts.size,4,"not all 12 should become one identical design");
 assert.ok(phrases.size>=8,"headlines should respond to brand concept instead of always being generic");
});
test("saved preview and published draft use the same 2-tone CSS variables",()=>{
 const preview=readFileSync(new URL("../components/ui.tsx",import.meta.url),"utf8");
 const published=readFileSync(new URL("../components/menu.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../app/menu-design.css",import.meta.url),"utf8");
 const creator=readFileSync(new URL("../components/idea-start.tsx",import.meta.url),"utf8");
 for(const token of ["--menu-bg","--menu-card","--menu-secondary","--menu-text","--menu-muted","--menu-line"]){
  assert.ok(preview.includes(token),token+" not mapped to CSS");
 }
 for(const file of [preview,published])assert.ok(file.includes("has-brand-palette"),"palette must also exist in live cardápio");
 for(const word of [".mini-menu.has-brand-palette",".customer-menu.has-brand-palette",".mini-menu.motif-sea-cheese",".customer-menu.motif-sea-cheese"]){
  assert.ok(css.includes(word),word);
 }
 assert.ok(creator.includes("intake.answers.name?{name:intake.answers.name}"),"validated name must win over cached bad guesses");
 assert.ok(creator.includes("Identidade visual aplicada"),"preview should explain what was interpreted");
 const d=chosenGalleryDraft("Pizzaria Brasa do Mar","forno-classico",briefing);
 assert.equal(d.presentation?.palette?.secondary,"#F2BD38");
 assert.equal(d.name,"Pizzaria Brasa do Mar");
});
test("color corrections can switch a whole palette, with negative instructions ignored",()=>{
 const p=brandPaletteFromBriefing("Quero azul de mar e amarelo de queijo");
 assert.equal(p?.motif,"sea-cheese");
 const q=brandPaletteFromBriefing("Quero vermelho e verde");
 assert.equal(q?.primary,"#346F4D");
 assert.equal(q?.palette.secondary,"#BD3935");
 const denied=brandPaletteFromBriefing("Sem amarelo. Quero azul.");
 assert.equal(denied,null);
});
