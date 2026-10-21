import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {extractIfoodDOM} from "../tools/ifood-import-extension/extractor.js";
import {makeMenuText,makeMenuJSON,selectedRows} from "../tools/ifood-import-extension/format.js";
import {readMenuPages,readerItemReady} from "../lib/menu-reader-policy.ts";

const manifest=JSON.parse(readFileSync(new URL("../tools/ifood-import-extension/manifest.json",import.meta.url)));
const element=(txt,src)=>({innerText:txt,textContent:txt,currentSrc:src,src});
function card(name,price,description="",disabled=false) {
 const map={"h3.dish-card__description":element(name),"[data-test-id='dish-card-price']":element(price),".dish-card__details":element(description)};
 return {innerText:`${name} ${description} ${price}`,className:disabled?"dish-card--unavailable":"dish-card",getAttribute:()=>null,matches:()=>false,querySelector:s=>map[s]||null};
}
function setup(groups=[],url="https://www.ifood.com.br/delivery/teste-rj/pizzaria/123e4567-e89b-42d3-a456-426614174000") {
 globalThis.location={href:url};
 const nodes=groups.map(group=>({querySelector:s=>s==="h2.restaurant-menu-group__title"?element(group.name):null,querySelectorAll:()=>group.items}));
 globalThis.document={querySelector:s=>s==="header h1"?element("Loja de teste"):null,querySelectorAll:s=>s===".restaurant-menu-group"?nodes:[]};
}
test("extension has no broad host/background permissions",()=>{
 assert.equal(manifest.manifest_version,3);
 assert.deepEqual([...manifest.permissions].sort(),["activeTab","scripting"].sort());
 assert.equal(manifest.host_permissions,undefined);
 assert.equal(manifest.background,undefined);
});
test("reads two categories, exact cents and text for the existing menu reader",()=>{
 setup([{name:"Pizzas",items:[card("Margherita","R$ 55,90","Muçarela e manjericão")]},{name:"Bebidas",items:[card("Água mineral","R$ 5,50","500 ml")]}]);
 const result=extractIfoodDOM();
 assert.equal(result.status,"captured");assert.equal(result.itemCount,2);
 const items=result.categories.flatMap(c=>c.items);
 assert.deepEqual(items.map(i=>i.priceCents),[5590,550]);
 const selected=new Set(items.map(i=>i.id)),txt=makeMenuText(result,selected);
 assert.match(txt,/Categoria: Pizzas \[pizza\]/);
 assert.match(txt,/Margherita R\$ 55,90/);
 assert.match(txt,/Descrição: Muçarela e manjericão/);
 assert.match(txt,/Água mineral R\$ 5,50/);
 assert.equal(JSON.parse(makeMenuJSON(result,selected)).products.length,2);
});
test("never exports variable, unavailable or ambiguous prices as confirmed items",()=>{
 setup([{name:"Combos",items:[card("Promoção","A partir de R$ 48,00"),card("Pausado","R$ 50,00","",true),card("Seguro","R$ 84,00"),card("Ambíguo","R$ 90,00 R$ 70,00")]}]);
 const result=extractIfoodDOM(),items=result.categories[0].items,chosen=new Set(items.map(i=>i.id));
 assert.equal(items[0].needsReview,true);assert.equal(items[1].available,false);
 assert.equal(items[3].priceCents,null);
 assert.deepEqual(selectedRows(result,chosen).map(i=>i.name),["Seguro"]);
});
test("rejects foreign and empty pages and warns about truncated 200-item catalogs",()=>{
 setup([],"https://other.example/delivery/x");assert.equal(extractIfoodDOM().status,"unsupported");
 setup([]);assert.equal(extractIfoodDOM().status,"empty");
 setup([{name:"Bebidas",items:Array.from({length:205},(_,i)=>card("Produto "+i,"R$ 5,00"))}]);
 const result=extractIfoodDOM();assert.equal(result.itemCount,200);assert.equal(result.truncated,true);
});

test("decimal prices are not truncated and incomplete prices stay pending",()=>{
 setup([{name:"Bebidas",items:[card("Água","R$ 5.50"),card("Guaraná","R$ 6,50"),card("Item estranho","R$ 5,5"),card("Item fracionário","R$ 25,009"),card("Item milhares","R$ 1.234,56"),card("Item ambíguo","R$ 1.234")]}]);
 const rows=extractIfoodDOM().categories[0].items;
 assert.deepEqual(rows.map(item=>item.priceCents),[550,650,null,null,123456,null]);
 assert.deepEqual(rows.map(item=>item.needsReview),[false,false,true,true,false,true]);
});

test("size selection keeps the original price and the exported text is read by the actual menu reader",()=>{
 setup([{name:"Pizzas",items:[card("Margherita","R$ 55,90","Manjericão"),card("Calabresa","R$ 60,00","Cebola"),card("Individual","R$ 20,00")]},{name:"Bebidas",items:[card("Água mineral","R$ 5,50")]}]);
 const capture=extractIfoodDOM(),all=capture.categories.flatMap(c=>c.items),selected=new Set(all.map(i=>i.id));
 const choices={[all[0].id]:"g",[all[1].id]:"m",[all[2].id]:"unico"};
 const text=makeMenuText(capture,selected,choices);
 assert.match(text,/Margherita G R\$ 55,90/);
 assert.match(text,/Calabresa M R\$ 60,00/);
 assert.match(text,/Categoria: Pizzas \[simple\]\nIndividual R\$ 20,00/);
 assert.match(text,/Categoria: Bebidas \[simple\]/);
 const parsed=readMenuPages([{id:"extension-text",lines:text.split("\n").map(line=>({text:line}))}]);
 assert.equal(parsed.items.length,4,JSON.stringify(parsed.unmatched));
 const pizza=parsed.items.find(item=>item.name==="Margherita");
 assert.equal(pizza?.sizes.g,5590);
 assert.equal(readerItemReady(pizza),true);
 const drink=parsed.items.find(item=>item.name==="Água mineral");
 assert.equal(drink?.price,550);
 assert.equal(readerItemReady(drink),true);
 assert.equal(JSON.parse(makeMenuJSON(capture,selected,choices)).products[0].sizeChoice,"g");
});
