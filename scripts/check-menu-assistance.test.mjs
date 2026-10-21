import test from "node:test";
import assert from "node:assert/strict";
import {assistedCapture,assistanceToReaderText,assistStats,hasSafeSource} from "../lib/menu-assistance-policy.ts";
import {readMenuPages} from "../lib/menu-reader-policy.ts";
const store="https://www.ifood.com.br/delivery/teste-rj/pizzaria/123e4567-e89b-42d3-a456-426614174000";
const base=()=>({
 sourceUrl:store,storeName:"Pizzaria autorizada",capturedAt:"2026-10-20T22:00:00Z",truncated:false,items:[
  {id:"a",category:"Pizzas",name:"Margherita",description:"Muçarela e manjericão",priceCents:5590,rawPrice:"R$ 55,90",imageUrl:"https://static-images.ifood.com.br/teste.jpg",needsReview:false,available:true,selected:true,sizeChoice:"g"},
  {id:"b",category:"Bebidas",name:"Água mineral",description:"500 ml",priceCents:550,rawPrice:"R$ 5,50",imageUrl:null,needsReview:false,available:true,selected:true,sizeChoice:null},
  {id:"c",category:"Destaques",name:"Combo sob consulta",description:"",priceCents:null,rawPrice:"A partir de R$ 75,00",imageUrl:"https://static-images.ifood.com.br/pendente.jpg",needsReview:true,available:true,selected:false,sizeChoice:null},
  {id:"d",category:"Bebidas",name:"Bebida pausada",description:"",priceCents:600,rawPrice:"R$ 6,00",imageUrl:null,needsReview:true,available:false,selected:false,sizeChoice:null},
 ]});
test("keep every observed item and every photo reference, but send only approved prices to reader",()=>{
 const capture=assistedCapture.parse(base()),stats=assistStats(capture);
 assert.deepEqual(stats,{total:4,approved:2,pending:2,photoReferences:2,uploadedPhotos:0,truncated:false});
 const txt=assistanceToReaderText(capture);
 const result=readMenuPages([{id:"assisted",lines:txt.split("\n").map(text=>({text}))}]);
 assert.deepEqual(result.items.map(i=>[i.name,i.category]),[["Margherita","Pizzas"],["Água mineral","Bebidas"]]);
 assert.equal(result.items[0].sizes.g,5590);assert.equal(result.items[1].price,550);
 assert.doesNotMatch(txt,/Combo|pausada/);
});
test("only the requested exact iFood store UUID may deliver",()=>{
 const capture=assistedCapture.parse(base());
 assert.equal(hasSafeSource(capture,store),true);
 assert.equal(hasSafeSource(capture,store.replace("123e4567-e89b-42d3-a456-426614174000","123e4567-e89b-42d3-a456-426614174001")),false);
 assert.equal(hasSafeSource({...capture,sourceUrl:"https://evil.example/link"},store),false);
});
test("do not allow malformed products or unbounded uploads",()=>{
 const bad=base();bad.items[0].priceCents=5590.5;assert.equal(assistedCapture.safeParse(bad).success,false);
 const large=base();large.items=Array.from({length:201},(_,i)=>({...base().items[0],id:String(i)}));
 assert.equal(assistedCapture.safeParse(large).success,false);
});
