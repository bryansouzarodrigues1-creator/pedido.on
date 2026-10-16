import test from 'node:test';
import assert from 'node:assert/strict';
import {menuAmount,readMenuPages,prepareReaderItems,applyReaderItems,readerItemReady,arrangeMenuWords,reconcileReaderReview} from '../lib/menu-reader-policy.ts';
import {demoRestaurant,defaultRestaurant,restaurantSchema,calculateOrder} from '../lib/domain.ts';
const read=text=>readMenuPages([{id:'photo',lines:text.split('\n').map(text=>({text,confidence:94,box:{x0:10,y0:20,x1:600,y1:70}}))}]);
test('OCR rows preserve actual ingredients, sized prices, beverage and crust destinations',()=>{
 const result=read('Pizzas\nP M G\nCalabresa 29,90 39,90 49,90\nMolho, muçarela, calabresa e cebola\nBebidas\nRefrigerante 2L R$ 12,00\nBordas recheadas\nCatupiry R$ 8,00');
 assert.equal(result.items.length,3);assert.deepEqual(result.items[0].sizes,{p:2990,m:3990,g:4990});assert.match(result.items[0].description,/calabresa e cebola/);assert.deepEqual(result.items[0].box,{x0:10,y0:20,x1:600,y1:70});
 assert.equal(result.items[1].kind,'simple');assert.equal(result.items[1].price,1200);assert.equal(result.items[2].kind,'crust');
 let id=0;const initial=defaultRestaurant('Teste');const updated={...initial,...applyReaderItems(initial,result.items,()=>`item-${++id}`)};
 assert.equal(updated.products.length,2);assert.equal(updated.crusts.length,1);assert.ok(restaurantSchema.safeParse(updated).success);
 const summary=calculateOrder(updated,{requestId:crypto.randomUUID(),customer:'Cliente',phone:'11999999999',method:'delivery',address:'Rua Teste, 100',payment:'Dinheiro',note:'',coupon:'',items:[{productIds:[updated.products[0].id],size:'g',crustId:updated.crusts[0].id,quantity:1,note:''}]});assert.equal(summary.total,5790);
});
test('an unsized single price is never silently assigned to a large pizza',()=>{const item=read('Pizzas\nCalabresa R$ 49,90').items[0];assert.equal(item.price,4990);assert.deepEqual(item.sizes,{p:null,m:null,g:null});assert.equal(readerItemReady(item),false);assert.throws(()=>applyReaderItems(defaultRestaurant('Teste'),[item]),/preços e tamanhos/);});
test('explicit sized lines and shared category price are read without guessing',()=>{const first=read('Pizzas\nCalabresa P R$ 29,90 M R$ 39,90 G R$ 49,90').items[0];assert.deepEqual(first.sizes,{p:2990,m:3990,g:4990});const shared=read('Pizzas\nTodas as pizzas G R$ 50,00\nCalabresa\nMolho, queijo, calabresa\nFrango\nMolho, frango, catupiry');assert.equal(shared.items.length,2);assert.equal(shared.items[1].sizes.g,5000);});
test('more than 35 rows and more than one source do not truncate recognized products',()=>{const pages=Array.from({length:2},(_,i)=>({id:`page-${i}`,lines:['Bebidas',...Array.from({length:24},(_,n)=>`Bebida ${i}-${n} R$ 12,00`)].map(text=>({text}))}));const result=readMenuPages(pages);assert.equal(result.items.length,48);assert.equal(result.pages,2);assert.equal(new Set(result.items.map(v=>v.id)).size,48);});
test('unsupported sizes and private/contact/footer text remain visible for review',()=>{const result=read('Pizzas\nCalabresa GG R$ 79,90\nWhatsApp 11 99999-9999\nTaxa de entrega R$ 7,00\nPromoção do dia R$ 39,90');assert.equal(result.items.length,1);assert.equal(result.items[0].selected,false);assert.match(result.items[0].issues.join(' '),/P\/M\/G/);assert.equal(result.unmatched.length,3);});
test('duplicate imports default to unselected and update only after explicit selection',()=>{const data=demoRestaurant(),before=JSON.stringify(data),raw=read('Pizzas\nMargherita G R$ 55,00').items;const prepared=prepareReaderItems(raw,data);assert.equal(prepared[0].selected,false);assert.equal(prepared[0].existingId,'margherita');assert.throws(()=>applyReaderItems(data,prepared),/Escolha/);const patch=applyReaderItems(data,prepared.map(v=>({...v,selected:true})));assert.equal(patch.products.length,data.products.length);assert.equal(patch.products[0].sizes.g,5500);assert.equal(patch.products[0].image,data.products[0].image);assert.deepEqual(patch.products.slice(1),data.products.slice(1));assert.equal(JSON.stringify(data),before);assert.equal(patch.pix,undefined);});
test('BRL parsing rejects invented or malformed values and preserves cents',()=>{for(const [text,expected] of [['R$ 1.234,56',123456],['49,90',4990],['49.90',4990],['12',1200],['R$ 0,00',null],['-39,90',null],['I2,OO',null],['12,9',null],['1e3',null]])assert.equal(menuAmount(text),expected,text);});
test('disconnected OCR price blocks rejoin the correct row, even when the engine returns a different order',()=>{const word=(text,x,y)=>({text,confidence:94,box:{x0:x,y0:y,x1:x+70,y1:y+25}});const words=[word('49,90',850,100),word('P',550,50),word('Calabresa',50,100),word('G',850,50),word('29,90',550,100),word('M',700,50),word('39,90',700,100),word('PIZZAS',50,10)];const lines=arrangeMenuWords(words,1100);const items=readMenuPages([{id:'geometry',lines}]).items;assert.equal(items.length,1);assert.equal(items[0].name,'Calabresa');assert.deepEqual(items[0].sizes,{p:2990,m:3990,g:4990});});

test('detached photo noise cannot rename the product or expand its box; uncertain prices and names remain for review',()=>{
 const word=(text,x,confidence=94)=>({text,confidence,box:{x0:x,y0:100,x1:x+60,y1:125}});
 for(const words of [[word('EA',20,15),word('Calabresa',300),word('G',370),word('R$',440),word('49,90',510)], [word('Calabresa',20),word('G',90),word('R$',160),word('49,90',230),word('EA',850,15)]]){
  const [line]=arrangeMenuWords(words,1100);assert.equal(line.text,'Calabresa G R$ 49,90');
  assert.ok(line.box.x0>=20&&line.box.x1<=570);
 }
 const [price]=arrangeMenuWords([word('Calabresa',20,40),word('G',90),word('49,90',850,30)],1100);
 assert.equal(price.text,'Calabresa G 49,90');
 const [uncertain]=arrangeMenuWords([word('Frango',20,30),word('52,90',300,35)],1100);
 assert.equal(uncertain.text,'Frango 52,90');
});

test('reading again preserves owner corrections only for unchanged source text and uses the new source geometry',()=>{
 const data=defaultRestaurant('Teste'),original=read('Pizzas\nCalabresa G R$ 499,00').items;
 const previous=original.map(item=>({...item,name:'Calabresa da casa',sizes:{p:null,m:null,g:4990},image:'/media/shop-a/approved.jpg'}));
 const recognized=original.map(item=>({...item,box:{x0:300,y0:400,x1:600,y1:460}}));
 const [kept]=reconcileReaderReview(previous,recognized,data);
 assert.equal(kept.name,'Calabresa da casa');assert.equal(kept.sizes.g,4990);assert.equal(kept.image,'/media/shop-a/approved.jpg');assert.deepEqual(kept.box,recognized[0].box);
 const changed=recognized.map(item=>({...item,sourceText:'Calabresa G R$ 59,90',sizes:{p:null,m:null,g:5990}}));
 const [fresh]=reconcileReaderReview(previous,changed,data);
 assert.equal(fresh.name,'Calabresa');assert.equal(fresh.sizes.g,5990);assert.equal(fresh.image,undefined);
});


test('real menu pattern: pizza variant catalog codes never become the product name or prices',()=>{
 const rows='PIZZAS SALGADAS\nMédia Grande\nDois queijos M: 118 | G: 218 R$ 42 R$ 47\nMussarela M:101 | G:201 R$ 42 R$ 47';
 const result=read(rows);
 assert.deepEqual(result.items.map(i=>i.name),['Dois queijos','Mussarela']);
 assert.ok(result.items.every(i=>i.category==='Pizzas'&&i.kind==='pizza'));
 assert.deepEqual(result.items[0].sizes,{p:null,m:4200,g:4700});
 assert.deepEqual(result.items[1].sizes,{p:null,m:4200,g:4700});
 assert.ok(result.items.every(readerItemReady));
 assert.ok(result.items.every(i=>i.sourceText.includes('M:')));
});
test('size SKU IDs may precede a detached price row but a bare amount cannot be invented',()=>{
 const parsed=read('PIZZAS\nDois queijos M:118 | G:218\nR$ 42 R$ 47\nMussarela M:101 | G:201\nR$ 42 R$ 47');
 assert.equal(parsed.items.length,2);
 assert.deepEqual(parsed.items.map(i=>i.name),['Dois queijos','Mussarela']);
 assert.deepEqual(parsed.items[0].sizes,{p:null,m:4200,g:4700});
 assert.ok(parsed.items.every(readerItemReady));
 const noPrice=read('PIZZAS\nDois queijos M:118 | G:218');
 assert.equal(noPrice.items.filter(readerItemReady).length,0);
 assert.equal(noPrice.items.some(i=>i.sizes.m===11800||i.sizes.g===21800),false);
});
test('unsupported GG SKU and ambiguous amount remain pending rather than inventing a size',()=>{
 const result=read('PIZZAS\nCalabresa M:102 | GG:202 R$ 44 R$ 55');
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].name,'Calabresa');
 assert.equal(result.items[0].sizes.m,4400);
 assert.equal(result.items[0].sizes.g,null);
 assert.equal(readerItemReady(result.items[0]),false);
 assert.match(result.items[0].issues.join(' '),/P\/M\/G/);
 const unlabeled=read('PIZZAS\nCalabresa R$ 44 R$ 55');
 assert.equal(readerItemReady(unlabeled.items[0]),false);
});


test('OCR flags a missing decimal separator in an implausibly high drink value',()=>{
 const [drink]=read('Bebidas\nRefrigerante Coca cola Lt R$ 1150').items;
 assert.equal(drink.price,115000);
 assert.equal(drink.reviewRequired,true);
 assert.equal(drink.selected,false);
 assert.equal(readerItemReady(drink),false);
 assert.match(drink.issues.join(' '),/separador decimal/);
 assert.throws(()=>applyReaderItems(defaultRestaurant('QA'),[drink]),/Escolha pelo menos um item/i);
});
test('a truly high price with explicit cents remains supported; ordinary integer prices stay valid',()=>{
 const data=read('Bebidas\nVinho premium R$ 150,00\nÁgua 350ml R$ 9\nPizzas\nFrango da casa R$ 350,00');
 const wine=data.items.find(i=>i.name==='Vinho premium'),water=data.items.find(i=>i.name==='Água 350ml');
 assert.equal(wine.price,15000);assert.equal(wine.reviewRequired,undefined);assert.equal(readerItemReady(wine),true);
 assert.equal(water.price,900);assert.equal(water.reviewRequired,undefined);assert.equal(readerItemReady(water),true);
 const pizza=data.items.find(i=>i.name==='Frango da casa');assert.equal(pizza.price,35000);assert.equal(pizza.reviewRequired,undefined);assert.equal(readerItemReady(pizza),false);
});
test('a high pizza price without cents needs review without inventing a decimal',()=>{
 const [pizza]=read('Pizzas\nCalabresa G R$ 550').items;
 assert.equal(pizza.sizes.g,55000);assert.equal(pizza.selected,false);
 assert.match(pizza.issues.join(' '),/separador decimal/);
});
