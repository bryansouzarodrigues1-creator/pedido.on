import test from 'node:test';
import assert from 'node:assert/strict';
import {arrangeMenuWords,readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';
import {reconcileOcrLine} from '../lib/menu-ocr-refinement.ts';

test('different font sizes share the printed baseline without losing zero or its price',()=>{
 const word=(text,confidence,x0,y0,x1,y1)=>({text,confidence,box:{x0,y0,x1,y1}});
 const words=[word('Bebidas',96,20,0,120,30),word('*',50,10,70,18,90),word('Coca-cola',95,30,64,180,98),word('600ml',90,190,64,280,98),word('zero',96,290,74,350,98),word('R$',40,800,64,830,90),word('9,00',95,840,47,900,92)];
 const result=readMenuPages([{id:'baseline',lines:arrangeMenuWords(words,1000)}]);
 assert.equal(result.items.length,1);assert.equal(result.items[0].name,'Coca-cola 600ml zero');assert.equal(result.items[0].price,900);assert.equal(readerItemReady(result.items[0]),true);
});
test('dark-menu SKU noise is not part of a name or a monetary value and does not select an unsupported size',()=>{
 const result=readMenuPages([{id:'sku',lines:[{text:'Pizzas'},{text:'Média Grande'},{text:'Alho crocante w:151/G:199 R$ 42 R$ 50',confidence:94,priceConfidence:91},{text:'Mussarela v:107/6:201 R$ 42 R$ 47',confidence:93,priceConfidence:89}]}]);
 assert.deepEqual(result.items.map(i=>i.name),['Alho crocante','Mussarela']);
 assert.deepEqual(result.items.map(i=>i.sizes),[{p:null,m:4200,g:5000},{p:null,m:4200,g:4700}]);assert.ok(result.items.every(readerItemReady));
 const ambiguous=readMenuPages([{id:'no-header',lines:[{text:'Pizzas'},{text:'Alho crocante w:151/G:199 R$ 42 R$ 50'}]}]);
 assert.equal(readerItemReady(ambiguous.items[0]),false);
});
test('low-confidence size headings survive detached-noise filtering and restart pizzas after crusts',()=>{
 const w=(text,x,width,confidence=96)=>({text,confidence,box:{x0:x,y0:100,x1:x+width,y1:130}});
 const header=arrangeMenuWords([w('CLÁSSICAS',20,250),w('Média',700,70,46),w('Grande',900,80)],1100);
 const result=readMenuPages([{id:'header',lines:[{text:'Bordas especiais'},...header,{text:'Calabresa R$ 44 R$ 55',confidence:95,priceConfidence:95}]}]);
 assert.equal(result.items[0].kind,'pizza');assert.deepEqual(result.items[0].sizes,{p:null,m:4400,g:5500});assert.equal(readerItemReady(result.items[0]),true);
});
test('a second local reading can confirm equal amounts, never silently choose conflicting prices',()=>{
 const box={x0:1,y0:1,x1:200,y1:40};
 const original={text:'Calabresa G R$ 49,90',confidence:92,priceConfidence:42,box};
 const confirmed=reconcileOcrLine(original,{text:'Calabresa G R$ 49,90',confidence:96,priceConfidence:96});
 assert.equal(readerItemReady(readMenuPages([{id:'confirmed',lines:[confirmed]}]).items[0]),true);
 assert.deepEqual(confirmed.box,box);
 const conflict=reconcileOcrLine(original,{text:'Calabresa G R$ 45,90',confidence:96,priceConfidence:96});
 assert.equal(readerItemReady(readMenuPages([{id:'conflict',lines:[conflict]}]).items[0]),false);
 assert.ok(conflict.priceConfidence<=50);
 assert.equal(reconcileOcrLine(conflict,{...conflict,confidence:99,priceConfidence:99}).priceDisagreement,true);
 assert.equal(reconcileOcrLine(original,{text:'Sem preço legível',confidence:99}),original);
});
