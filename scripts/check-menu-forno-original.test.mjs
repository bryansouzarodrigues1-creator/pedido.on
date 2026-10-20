import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfMenuLines} from '../lib/menu-pdf-layout.ts';
import {readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';

// Representative text spans and prices transcribed from the seven-page
// Forno & Manjericão test PDF, with the original two-column relationships.
// Deliberately separate names, descriptions and prices across baselines.
const width=650,height=850;
function span(str,x,y,w){return {str,width:w??Math.max(24,str.length*6),height:12,transform:[12,0,0,12,x,height-y]};}
function parse(id,spans){const lines=pdfMenuLines(spans,[1,0,0,-1,0,height],1,width,height);return {lines,...readMenuPages([{id,lines}])};}
function at(items,name){return items.find(item=>item.name===name);}

test('real PDF traditional pizzas: independent left/right names, descriptions and M/G prices',()=>{
 const spans=[span('PIZZAS TRADICIONAIS',26,55,225)];
 const pairs=[
  [135,'Muçarela','Muçarela derretida, tomate e orégano.',4500,5900,'Calabresa','Calabresa fatiada, cebola e orégano.',4900,6400],
  [292,'Portuguesa','Presunto, ovos, cebola, ervilha e muçarela.',5700,7400,'Frango com Catupiry','Frango desfiado, requeijão cremoso e milho.',5600,7300],
  [449,'Margherita','Muçarela, rodelas de tomate e manjericão.',5300,6900,'Napolitana','Tomate, parmesão, muçarela e orégano.',5100,6700]
 ];
 for(const [y,left,descLeft,mLeft,gLeft,right,descRight,mRight,gRight] of pairs){
  spans.push(span(left,24,y,235),span(descLeft,24,y+30,252),span(`M R$ ${(mLeft/100).toFixed(2).replace('.',',')}`,24,y+80,95),span(`G R$ ${(gLeft/100).toFixed(2).replace('.',',')}`,148,y+80,100));
  spans.push(span(right,341,y,285),span(descRight,341,y+30,280),span(`M R$ ${(mRight/100).toFixed(2).replace('.',',')}`,341,y+80,102),span(`G R$ ${(gRight/100).toFixed(2).replace('.',',')}`,472,y+80,105));
 }
 const {items,lines}=parse('tradicionais',spans.reverse());
 assert.equal(items.length,6,JSON.stringify(lines));
 for(const [_,left,descLeft,mLeft,gLeft,right,descRight,mRight,gRight] of pairs){
  for(const [name,desc,m,g] of [[left,descLeft,mLeft,gLeft],[right,descRight,mRight,gRight]]){
   const item=at(items,name);assert.ok(item,`Missing ${name}: ${items.map(v=>v.name)}`);
   assert.deepEqual(item.sizes,{p:null,m,g},name);
   assert.equal(item.description,desc,name);
   assert.equal(readerItemReady(item),true,name);
  }
 }
 assert.equal(items.some(v=>/orégano\.|cremoso\./.test(v.name)),false);
});

test('real PDF favourites keep staggered photo captions, descriptions and a price conflict for Margherita',()=>{
 const spans=[span('DESTAQUES',25,48,150),span('CLÁSSICO DA CASA',26,125,198),span('CREMOSA E INTENSA',350,125,237),
  span('Calabresa da Vila',26,165,222),span('Quatro Queijos',350,165,191),
  span('Calabresa defumada, cebola roxa e muçarela',26,202,251),span('gratinada.',26,226,128),
  span('Muçarela, parmesão, gorgonzola e requeijão',350,202,266),span('cremoso.',350,226,115),
  span('M R$ 53',26,264,96),span('G R$ 68',151,264,97),span('M R$ 65',350,264,102),span('G R$ 82',478,264,100),
  span('NOSSA ESSÊNCIA',350,380,178),span('Margherita',350,418,162),
  span('Molho de tomate, muçarela, tomate-cereja, manjericão',350,450,275),span('fresco e azeite.',350,476,157),
  span('M R$ 55',350,525,103),span('G R$ 72',480,525,106)];
 const {items,lines}=parse('favoritas',spans);
 for(const [name,m,g] of [['Calabresa da Vila',5300,6800],['Quatro Queijos',6500,8200],['Margherita',5500,7200]]){
  const item=at(items,name);assert.ok(item,`Missing ${name}: ${JSON.stringify({lines,items})}`);
  assert.equal(item.sizes.m,m);assert.equal(item.sizes.g,g);
 }
 assert.match(at(items,'Margherita').description,/fresco e azeite/);
 const second=readMenuPages([{id:'different-page',lines:[{text:'Pizzas'},{text:'Margherita M R$ 53,00 G R$ 69,00'}]}]).items;
 const merged=readMenuPages([{id:'fav',lines:pdfMenuLines(spans,[1,0,0,-1,0,height],1,width,height)},{id:'different-page',lines:[{text:'Pizzas'},{text:'Margherita M R$ 53,00 G R$ 69,00'}]}]);
 assert.equal(second.length,1);assert.equal(merged.items.filter(v=>v.name==='Margherita').length,2);
 assert.ok(merged.items.filter(v=>v.name==='Margherita').every(v=>v.reviewRequired&&!readerItemReady(v)));
});

test('real PDF entries and combos keep category and value for each column',()=>{
 const spans=[span('ENTRADAS',26,74,125),span('COMBOS',351,74,116),
  span('Pão de alho gratinado',26,151,236),span('Pães crocantes com alho, ervas e queijo.',26,176,250),span('R$ 24,00',26,223,90),
  span('Bruschetta clássica',26,291,213),span('Quatro torradas com tomate e manjericão.',26,315,255),span('R$ 29,00',26,350,89),
  span('Combo Dupla',351,151,186),span('1 pizza grande tradicional + 1 refrigerante 2 L.',351,176,268),span('R$ 84,00',351,239,91),
  span('Noite em Família',351,304,207),span('2 pizzas grandes tradicionais + 1 entrada.',351,331,250),span('R$ 159,00',351,375,112)];
 const {items,lines}=parse('entradas-combos',spans);
 for(const [name,price,category] of [['Pão de alho gratinado',2400,'Entradas'],['Bruschetta clássica',2900,'Entradas'],['Combo Dupla',8400,'Combos'],['Noite em Família',15900,'Combos']]){
  const item=at(items,name);assert.ok(item,`Missing ${name}: ${items.map(v=>v.name)}`);
  assert.equal(item.price,price,`${name}: ${JSON.stringify({item,lines})}`);assert.equal(item.category,category,name);assert.equal(item.kind,'simple');assert.equal(readerItemReady(item),true,`${name}: ${JSON.stringify(item)}`);
 }
});

test('real PDF sweets and drinks occupy independent columns, with their correct categories',()=>{
 const spans=[span('PIZZAS DOCES',356,92,175),
  span('Chocolate & Morango',356,138,222),span('Ganache e morangos frescos.',356,165,230),span('M R$ 48 | G R$ 64',356,199,205),
  span('Banana com Canela',356,269,211),span('Banana, açúcar e canela.',356,296,205),span('M R$ 42 | G R$ 56',356,334,196),
  span('PARA REFRESCAR',24,450,192),span('DOCINHOS EXTRAS',356,450,236),
  span('Água mineral 500 ml',24,493,186),span('R$ 5,00',236,493,76),
  span('Água com gás 500 ml',24,544,191),span('R$ 6,00',236,544,76),
  span('Brownie com sorvete',356,493,234),span('Brownie morno, uma bola de sorvete.',356,518,240),span('R$ 25,00',356,570,90)];
 const {items}=parse('doces-bebidas',spans);
 const chocolate=at(items,'Chocolate & Morango');assert.ok(chocolate,items.map(v=>v.name).join(', '));assert.deepEqual(chocolate.sizes,{p:null,m:4800,g:6400});assert.equal(chocolate.category,'Pizzas doces');
 const water=at(items,'Água mineral 500 ml');assert.ok(water,items.map(v=>v.name).join(', '));assert.equal(water.kind,'simple');assert.equal(water.price,500);assert.equal(water.category,'Bebidas');
 const brownie=at(items,'Brownie com sorvete');assert.ok(brownie,items.map(v=>v.name).join(', '));assert.equal(brownie.kind,'simple');assert.equal(brownie.price,2500);assert.equal(brownie.category,'Sobremesas');
 assert.equal(items.some(item=>item.name==='Ganache e morangos frescos.'),false);
});

test('real PDF filled crusts and additions keep their product names without trailing price symbols',()=>{
 const spans=[span('BORDAS RECHEADAS',27,140,220),span('ADICIONAIS',356,140,177),
  span('Requeijão cremoso',27,200,212),span('+ R$ 10,00',242,200,91),
  span('Cheddar',27,275,131),span('+ R$ 10,00',242,275,91),
  span('Muçarela extra',356,200,182),span('+ R$ 9,00',552,200,83),
  span('Bacon',356,275,144),span('+ R$ 8,00',552,275,83)];
 const {items}=parse('bordas-adicionais',spans);
 for(const [name,kind,price] of [['Requeijão cremoso','crust',1000],['Cheddar','crust',1000],['Muçarela extra','simple',900],['Bacon','simple',800]]){
  const item=at(items,name);assert.ok(item,`Missing ${name}: ${items.map(v=>v.name).join(', ')}`);
  assert.equal(item.kind,kind);assert.equal(item.price,price);assert.equal(readerItemReady(item),true);
 }
});

test('A4 PDF with right column at 51.9 percent splits names and separate M/G rows',()=>{
 const w=1488,h=2105;
 const s=(str,x,y,pixels)=>({str,width:pixels,height:22,transform:[22,0,0,22,x,h-y]});
 const spans=[s('PIZZAS TRADICIONAIS',105,100,260)];
 for(const [y,a,b,ma,ga,mb,gb] of [
  [420,'Muçarela','Calabresa',45,59,49,64],
  [690,'Portuguesa','Frango com Catupiry',57,74,56,73]
 ]){
  spans.push(s(a,110,y,165),s(b,773,y,255),
   s('M',110,y+160,24),s(`R$ ${ma},00`,150,y+160,122),s('G',392,y+160,24),s(`R$ ${ga},00`,435,y+160,122),
   s('M',773,y+160,24),s(`R$ ${mb},00`,813,y+160,122),s('G',1055,y+160,24),s(`R$ ${gb},00`,1098,y+160,122));
 }
 const lines=pdfMenuLines(spans,[1,0,0,-1,0,h],1,w,h);
 const {items}=readMenuPages([{id:'narrow-gutter',lines}]);
 for(const [name,m,g] of [['Muçarela',4500,5900],['Calabresa',4900,6400],['Portuguesa',5700,7400],['Frango com Catupiry',5600,7300]]){
  const item=at(items,name);assert.ok(item,`Missing ${name}: ${JSON.stringify(lines)}`);
  assert.equal(item.sizes.m,m,name);assert.equal(item.sizes.g,g,name);
 }
});

test('drinks priced at the right edge of the left PDF column stay separate from desserts',()=>{
 const w=1488,h=2105;
 const s=(str,x,y,pixels)=>({str,width:pixels,height:24,transform:[24,0,0,24,x,h-y]});
 const spans=[s('PARA REFRESCAR',108,900,265),s('DOCINHOS EXTRAS',773,900,315),
  s('Água mineral 500 ml',108,1050,335),s('R$ 5,00',593,1050,95),
  s('Água com gás 500 ml',108,1170,330),s('R$ 6,00',593,1170,95),
  s('Brownie com sorvete',773,1050,330),s('Brownie morno, uma bola de sorvete.',773,1100,390),s('R$ 25,00',773,1210,110)];
 const lines=pdfMenuLines(spans,[1,0,0,-1,0,h],1,w,h);
 const {items}=readMenuPages([{id:'drinks-desserts',lines}]);
 for(const [name,price] of [['Água mineral 500 ml',500],['Água com gás 500 ml',600],['Brownie com sorvete',2500]]){
  const item=at(items,name);assert.ok(item,`Missing ${name}: ${JSON.stringify({items,lines})}`);
  assert.equal(item.price,price,name);assert.equal(readerItemReady(item),true,name);
 }
});
