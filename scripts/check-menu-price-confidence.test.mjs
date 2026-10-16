import test from 'node:test';
import assert from 'node:assert/strict';
import {readMenuPages,arrangeMenuWords,readerItemReady,applyReaderItems} from '../lib/menu-reader-policy.ts';
import {defaultRestaurant} from '../lib/domain.ts';
const read=text=>readMenuPages([{id:'source',lines:text.split('\n').map(text=>({text,confidence:96}))}]);

test('conflicting prices for one size never silently overwrite or revive on a later line',()=>{
 const [item]=read('Pizzas\nCalabresa G R$ 45,00\nG R$ 55,00\nG R$ 45,00').items;
 assert.equal(item.sizes.g,null);assert.equal(item.reviewRequired,true);assert.equal(item.selected,false);assert.equal(readerItemReady(item),false);
 assert.match(item.issues.join(' '),/conflitantes/i);assert.match(item.sourceText,/55,00/);
 assert.throws(()=>applyReaderItems(defaultRestaurant('QA'),[{...item,selected:true}]),/Confira/);
});
test('equal repeated prices are harmless and a different size is preserved',()=>{
 const [item]=read('Pizzas\nCalabresa P R$ 25,00 G R$ 45,00\nG R$ 45,00').items;
 assert.deepEqual(item.sizes,{p:2500,m:null,g:4500});assert.equal(readerItemReady(item),true);
});
test('conflicts in a beverage or crust cannot silently choose the last price',()=>{
 for(const section of ['Bebidas','Bordas recheadas']){
  const [item]=read(section+'\nItem da casa R$ 8,00\nR$ 10,00\nR$ 8,00').items;
  assert.equal(item.price,null);assert.equal(item.reviewRequired,true);assert.equal(item.selected,false);
 }
});
test('multiple prices without size labels require individual review',()=>{
 for(const section of ['Bebidas','Pizzas']){
  const [item]=read(section+'\nProduto da casa R$ 40,00 R$ 35,00').items;
  assert.equal(item.reviewRequired,true);assert.equal(item.selected,false);assert.equal(readerItemReady(item),false);
 }
});
test('an unsupported size cannot shift known size prices through a previous header',()=>{
 const [item]=read('Pizzas\nP M G\nCalabresa P R$ 20,00 G R$ 40,00 GG R$ 50,00').items;
 assert.deepEqual(item.sizes,{p:2000,m:null,g:4000});assert.equal(item.reviewRequired,true);assert.equal(item.selected,false);assert.equal(readerItemReady(item),false);
});
test('a table keeps unknown size slots instead of assigning GG to G',()=>{
 const [item]=read('Pizzas\nP GG G\nCalabresa 20,00 50,00 40,00').items;
 assert.deepEqual(item.sizes,{p:2000,m:null,g:4000});assert.equal(item.reviewRequired,true);assert.equal(readerItemReady(item),false);
});
test('a weak price cannot hide behind many high-confidence words',()=>{
 const words=[['Pizza',95],['da',95],['casa',95],['G',95],['R$',95],['49,90',28]].map(([text,confidence],i)=>({text,confidence,box:{x0:10+i*90,y0:100,x1:85+i*90,y1:130}}));
 const lines=arrangeMenuWords(words,1100);assert.ok(lines[0].confidence>75);
 const [item]=readMenuPages([{id:'geometry',lines}]).items;
 assert.equal(item.sizes.g,4990);assert.equal(item.reviewRequired,true);assert.equal(item.selected,false);assert.equal(readerItemReady(item),false);
});
test('delivery fees, phone status and ordering controls never become products',()=>{
 const result=read('Bebidas\nÁgua mineral R$ 4,00\nFrete R$ 5,00\nEntrega grátis R$ 0,00\n18:19\nVer mais R$ 8,00\nPedido mínimo R$ 20,00');
 assert.deepEqual(result.items.map(v=>v.name),['Água mineral']);assert.equal(readerItemReady(result.items[0]),true);
});
test('overlapping photos do not preselect the same product twice',()=>{
 const result=readMenuPages(['a','b'].map(id=>({id,lines:[{text:'Pizzas'},{text:'Calabresa G R$ 45,00'}]})));
 assert.equal(result.items.length,2);assert.equal(result.items.filter(readerItemReady).length,1);
 assert.equal(result.items[1].selected,false);assert.match(result.items[1].issues.join(' '),/duplicado/i);
 assert.equal(applyReaderItems(defaultRestaurant('QA'),result.items).products.length,1);
});
test('a clear duplicate can be imported once without approving the uncertain copy',()=>{
 const result=readMenuPages([32,96].map((confidence,i)=>({id:String(i),lines:[{text:'Bebidas'},{text:'Suco R$ 8,00',confidence}]})));
 assert.equal(result.items[0].selected,false);assert.equal(readerItemReady(result.items[0]),false);
 assert.equal(result.items[1].selected,true);assert.equal(readerItemReady(result.items[1]),true);
 assert.equal(applyReaderItems(defaultRestaurant('QA'),result.items).products.length,1);
});
test('different prices across photos require a choice before importing either version',()=>{
 const result=readMenuPages([4500,5500].map((price,i)=>({id:String(i),lines:[{text:'Pizzas'},{text:'Calabresa G R$ '+(price/100).toFixed(2).replace('.',',')}]})));
 assert.equal(result.items.length,2);assert.ok(result.items.every(v=>v.reviewRequired&&!v.selected&&!readerItemReady(v)));
 assert.equal(result.items[0].sizes.g,4500);assert.equal(result.items[1].sizes.g,5500);
});
test('negative or incomplete currency values never become a positive truncated price',()=>{
 for(const value of ['R$ -49,90','-49,90','R$ −49,90','−49,90','R$ 49,9','R$ 12345678,90','R$ 2L','49,90ml']){
  const [item]=read('Pizzas\nCalabresa G '+value).items;
  assert.ok(!item||!readerItemReady(item),value);assert.ok(!item||Object.values(item.sizes).every(v=>v===null),value);
 }
});
test('a detached uncertain minus sign is preserved and requires review',()=>{
 const parts=[['Calabresa',20,110,95],['G',170,20,95],['R$',220,40,95],['-',320,15,22],['49,90',500,100,95]];
 const lines=arrangeMenuWords(parts.map(([text,x,width,confidence])=>({text,confidence,box:{x0:x,y0:100,x1:x+width,y1:130}})),1100);
 assert.match(lines[0].text,/-/);
 const [item]=readMenuPages([{id:'signed',lines}]).items;
 assert.equal(item.reviewRequired,true);assert.equal(readerItemReady(item),false);assert.equal(item.sizes.g,null);
});
test('staggered category headings still preserve two menu columns and their own prices',()=>{
 const word=(text,x,y,width=90)=>({text,confidence:96,box:{x0:x,y0:y,x1:x+width,y1:y+26}});
 const words=[word('Pizzas',40,10),word('Bebidas',650,45)];
 for(const [y,name,price,drink,drinkPrice] of [[120,'Calabresa','49,90','Água mineral','5,00'],[220,'Frango','54,90','Suco natural','8,00']])words.push(word(name,40,y,150),word('G',350,y,20),word(price,440,y,80),word(drink,650,y,180),word(drinkPrice,1000,y,80));
 const lines=arrangeMenuWords(words.reverse(),1200),result=readMenuPages([{id:'columns',lines}]);
 assert.deepEqual(result.items.map(v=>v.name),['Calabresa','Frango','Água mineral','Suco natural']);
 assert.deepEqual(result.items.map(v=>v.kind),['pizza','pizza','simple','simple']);
 assert.deepEqual(result.items.slice(0,2).map(v=>v.sizes.g),[4990,5490]);assert.deepEqual(result.items.slice(2).map(v=>v.price),[500,800]);
 assert.ok(result.items.slice(0,2).every(v=>v.box.x1<650));assert.ok(result.items.slice(2).every(v=>v.box.x0>=650));
});
test('price gaps in a P/M/G table do not split a product into multiple columns',()=>{
 const word=(text,x,y)=>({text,confidence:96,box:{x0:x,y0:y,x1:x+70,y1:y+25}}),words=[word('Pizzas',40,10),word('P',500,60),word('M',700,60),word('G',900,60)];
 for(const [y,name] of [[120,'Calabresa'],[220,'Frango']])words.push(word(name,40,y),word('29,90',500,y),word('39,90',700,y),word('49,90',900,y));
 const result=readMenuPages([{id:'table',lines:arrangeMenuWords(words,1100)}]);
 assert.equal(result.items.length,2);assert.ok(result.items.every(v=>readerItemReady(v)&&v.sizes.p===2990&&v.sizes.m===3990&&v.sizes.g===4990));
});
test('a single mixed row cannot use a table header to turn another product into a size price',()=>{
 const [item]=read('Pizzas\nP G\nCalabresa 49,90 Água mineral 5,00').items;
 assert.equal(readerItemReady(item),false);assert.equal(item.reviewRequired,true);assert.deepEqual(item.sizes,{p:null,m:null,g:null});
});
test('columns remain independent when only one pair of products shares a baseline',()=>{
 const word=(text,x,y,w=110)=>({text,confidence:96,box:{x0:x,y0:y,x1:x+w,y1:y+26}});
 const product=(name,x,y,price)=>[word(name,x,y,150),word('R$',x+190,y,40),word(price,x+240,y,90)];
 const words=[word('Pizzas',60,20),word('Bebidas',1010,70),
  word('Calabresa',60,120,160),word('G',240,120,20),word('R$',280,120,40),word('49,90',340,120,90),
  ...product('Refrigerante 2L',1010,155,'12,00'),word('Molho, queijo e calabresa',60,190,400),
  word('Frango',60,300,130),word('G',220,300,20),word('R$',270,300,40),word('52,90',330,300,90),
  ...product('Suco',1010,300,'8,00'),word('Molho, queijo e frango',60,360,360),word('Bordas',1010,420),...product('Catupiry',1010,480,'8,00')];
 const result=readMenuPages([{id:'staggered-browser',lines:arrangeMenuWords(words,1700)}]);
 assert.deepEqual(result.items.map(v=>v.name),['Calabresa','Frango','Refrigerante 2L','Suco','Catupiry']);
 assert.deepEqual(result.items.map(v=>v.kind),['pizza','pizza','simple','simple','crust']);
 assert.deepEqual(result.items.slice(0,2).map(v=>v.sizes.g),[4990,5290]);
 assert.deepEqual(result.items.slice(2).map(v=>v.price),[1200,800,800]);
 assert.match(result.items[0].description,/calabresa/);assert.equal(result.items[2].description,'');
 assert.ok(result.items.every(readerItemReady));
});
test('one mixed baseline without repeated named price evidence does not invent columns',()=>{
 const word=(text,x,y)=>({text,confidence:96,box:{x0:x,y0:y,x1:x+80,y1:y+25}});
 const words=[word('Pizzas',30,10),word('P',450,60),word('G',850,60),word('Calabresa',30,120),word('49,90',250,120),word('Suco',700,120),word('8,00',900,120),word('29,90',700,180)];
 const result=readMenuPages([{id:'uncertain-columns',lines:arrangeMenuWords(words,1200)}]);
 assert.ok(result.items.every(item=>!readerItemReady(item)&&!item.selected));
});
