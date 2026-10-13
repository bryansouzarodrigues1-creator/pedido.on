import test from "node:test";
import assert from "node:assert/strict";
import {assistantAnswer} from "../lib/assistant-help.ts";
import {proposalPatch} from "../lib/studio-policy.ts";
import {defaultRestaurant} from "../lib/domain.ts";

test("common product questions get truthful local directions without any model call",()=>{
 for(const [input,screen] of [
  ["Como configuro a taxa de entrega?","store"],
  ["Como adiciono uma borda?","menu"],
  ["Cadê a promoção do dia?","menu"],
  ["Como altero o preço dessa pizza?","menu"],
  ["Onde vejo meus pedidos?","overview"],
  ["Como importar uma foto do cardápio?","menu"],
  ["Como funciona o Pix?","store"],
  ["Como crio uma capa com IA?","studio"]
 ]){
  const answer=assistantAnswer(input);
  assert.equal(answer?.kind,"guide",input);
  assert.equal(answer?.screen,screen,input);
  assert.ok(answer.reply.length>25,input);
 }
});

test("renaming the shop is a local preview validated by existing restaurant rules",()=>{
 const shop=defaultRestaurant("Pizza Exemplo");
 const found=assistantAnswer("Troque meu título para Bella Pizza Artesanal");
 assert.deepEqual(found,{kind:"rename",name:"Bella Pizza Artesanal"});
 const proposed=proposalPatch({name:found.name,reply:"Confira a mudança",productDescriptions:[]},shop);
 assert.equal(proposed.name,"Bella Pizza Artesanal");
 assert.equal(shop.name,"Pizza Exemplo");
 assert.equal(assistantAnswer("Troque o nome para A").kind,"guide");
 assert.equal(assistantAnswer("Troque meu título para "+ "a".repeat(110)).kind,"guide");
});

test("visual tweaks are local while paid image requests and creative description remain in their established route",()=>{
 assert.equal(assistantAnswer("Quero meu cardápio preto e vermelho")?.kind,"style");
 assert.equal(assistantAnswer("Mude a cor dos botões para #cc2244")?.kind,"style");
 assert.equal(assistantAnswer("Crie uma capa para minha pizzaria"),null);
 assert.equal(assistantAnswer("Gere a foto de uma pizza de queijo"),null);
 assert.equal(assistantAnswer("Melhore a descrição da pizza Margherita"),null);
 assert.equal(assistantAnswer(""),null);
 assert.equal(assistantAnswer("a".repeat(1601)),null);
});
