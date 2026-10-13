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

test("menu imports take priority over photos, prices and ingredients; PDF support is described accurately",()=>{
 for(const input of ["Como importar uma foto do cardápio?","Como importar produtos e preços?","Onde envio o print do iFood com as pizzas?","Como ler meu cardápio por imagem?","Me ensina a importar bordas e bebidas do 99Food"]){
  const answer=assistantAnswer(input);
  assert.equal(answer?.kind,"guide",input);
  assert.equal(answer?.action,"Enviar fotos do cardápio",input);
  assert.match(answer.reply,/até 8 fotos por lote/,input);
 }
 const pdf=assistantAnswer("Como importar um PDF?");
 assert.equal(pdf.action,"Enviar fotos do cardápio");
 assert.match(pdf.reply,/capturas das páginas/);
 assert.equal(assistantAnswer("Como altero a foto do produto?").action,"Abrir Cardápio");
 assert.equal(assistantAnswer("Como mudo o preço no cardápio?").action,"Abrir Cardápio");
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

test("iFood link and CNPJ help describes the local source reference without promising an active connector",()=>{
 const link=assistantAnswer("Como importar o link do iFood com fotos e preços?");
 assert.equal(link.kind,"guide");assert.equal(link.screen,"menu");assert.match(link.reply,/mensagem compartilhada inteira/);assert.match(link.reply,/importação automática ainda não está disponível/);
 const cnpj=assistantAnswer("Como importar pelo CNPJ do iFood?");assert.match(cnpj.reply,/CNPJ sozinho não importa/);assert.match(cnpj.reply,/ainda não está ativa/);
});

test("creating an offer or bundle is local guidance while explicit advertising art keeps its image route",()=>{
 for(const message of ["Crie uma promoção de 2 pizzas e refrigerante por 200 reais","Monte um combo para hoje","Quero criar uma oferta"]){const answer=assistantAnswer(message);assert.equal(answer.kind,"guide");assert.equal(answer.screen,"menu");assert.match(answer.reply,/não precisa custar menos/);}
 assert.equal(assistantAnswer("Crie uma capa para divulgar a promoção"),null);
 assert.equal(assistantAnswer("Quero cores escuras para a promoção").kind,"style");
 assert.equal(assistantAnswer("Crie uma descrição para o combo"),null);
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
