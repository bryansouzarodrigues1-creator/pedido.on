import test from 'node:test';
import assert from 'node:assert/strict';
import {readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';
import {previewMenuWithReaderItems,previewReviewedMenu} from '../lib/menu-preview.ts';
import {defaultRestaurant,restaurantSchema} from '../lib/domain.ts';
import {applyReaderItems,prepareReaderItems} from '../lib/menu-reader-policy.ts';

const scan=(rows)=>readMenuPages([{id:'pdf-1',lines:rows.map(text=>({text}))}]);

test('owner preview shows only confirmed selected local photos without uploading or changing the validated draft',()=>{
 const data=defaultRestaurant('Forno de teste'),{items}=scan(['Bebidas','Água mineral R$ 5,00','Suco natural R$ 12,00']);
 const original=structuredClone({data,items}),photo='data:image/jpeg;base64,AAAA';
 const photos=Object.fromEntries(items.map(item=>[item.id,photo]));
 const approved={[items[0].id]:true};
 const preview=previewReviewedMenu(data,items,photos,approved);
 assert.deepEqual(preview.products.map(product=>[product.name,product.image]),[['Água mineral',photo],['Suco natural','']]);
 assert.deepEqual({data,items},original);
 const patch=applyReaderItems(data,items);assert.equal(patch.products.every(product=>product.image===''),true);
 restaurantSchema.parse({...data,...patch});
 assert.equal(previewReviewedMenu(data,items,photos,{}).products.every(product=>product.image===''),true);
 items[0].selected=false;
 assert.deepEqual(previewReviewedMenu(data,items,photos,approved).products.map(product=>product.name),['Suco natural']);
});

test('review preview keeps existing photos and rejects remote or malformed suggestions',()=>{
 const data=defaultRestaurant('Forno de teste'),{items}=scan(['Bebidas','Água mineral R$ 5,00']);
 data.products=applyReaderItems(data,items).products;data.products[0].image='/media/shop/existing.jpg';
 const [item]=prepareReaderItems(items,data);item.selected=true;
 const original=structuredClone(data);
 for(const photo of ['https://external.invalid/image.jpg','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,not valid']){
  const preview=previewReviewedMenu(data,[item],{[item.id]:photo},{[item.id]:true});
  assert.equal(preview.products[0].image,'/media/shop/existing.jpg');
 }
 item.image='/media/shop/already-confirmed.jpg';
 assert.equal(previewReviewedMenu(data,[item],{[item.id]:'data:image/jpeg;base64,AAAA'},{[item.id]:true}).products[0].image,item.image);
 assert.deepEqual(data,original);
});

test('PDF descriptions on separate lines do not become products with the next price',()=>{
 const parsed=scan(['Pizzas','Margherita R$ 55,00','fresco e azeite.','Chocolate R$ 48,00','Ganache e morangos frescos.']);
 assert.deepEqual(parsed.items.map(item=>item.name),['Margherita','Chocolate']);
 assert.match(parsed.items[0].description,/fresco e azeite/);
 assert.match(parsed.items[1].description,/Ganache e morangos/);
});

test('description followed by a same-line price extends the preceding product',()=>{
 const parsed=scan(['Pizzas','Margherita','molho especial e manjericão R$ 55,00','Calabresa R$ 49,00']);
 assert.deepEqual(parsed.items.map(item=>item.name),['Margherita','Calabresa']);
 assert.equal(parsed.items[0].price,5500);
 assert.match(parsed.items[0].description,/molho especial/);
});

test('prices without pizza size are shown in guest layout previews, never given an invented size',()=>{
 const parsed=scan(['Pizzas','Margherita R$ 55,00','Calabresa R$ 49,90']);
 assert.equal(parsed.items.length,2);
 assert.equal(parsed.items.every(item=>!readerItemReady(item)),true);
 const visual=previewMenuWithReaderItems(parsed.items);
 assert.deepEqual(visual.products.map(item=>[item.name,item.price,item.kind]),[['Margherita',5500,'simple'],['Calabresa',4990,'simple']]);
 assert.equal(visual.products.every(item=>Object.values(item.sizes).every(amount=>amount===0)),true);
 assert.match(visual.products[0].description,/tamanho a confirmar/);
 assert.equal(parsed.items.every(item=>item.selected),true,'The original review is not mutated');
});

test('uncertain PDF amounts never gain a trusted price merely to fill the layout',()=>{
 const parsed=scan(['Bebidas','Água sem gás R$ 5,50']);
 parsed.items[0].reviewRequired=true;
 const visual=previewMenuWithReaderItems(parsed.items);
 assert.equal(visual.products.length,0);
});

test('a bare ingredient sentence with a price is not a standalone product',()=>{
 const parsed=scan(['Pizzas','Molho fresco e azeite. R$ 55,00','Calabresa R$ 49,90']);
 assert.deepEqual(parsed.items.map(item=>item.name),['Calabresa']);
 assert.equal(parsed.unmatched.length,1);
});

test('successive priced toppings stay distinct despite ingredient-like names',()=>{
 const parsed=readMenuPages([{id:'toppings',lines:[
  {text:'ADICIONAIS'},
  {text:'Bacon + R$ 8,00'},
  {text:'Tomate-cereja + R$ 6,00'},
  {text:'Molho da casa + R$ 4,00'}
 ]}]);
 assert.deepEqual(parsed.items.map(item=>[item.name,item.price]),[
  ['Bacon',800],['Tomate-cereja',600],['Molho da casa',400]
 ]);
 assert.equal(parsed.items.every(readerItemReady),true);
});

test('distant editorial note and decorative headings are never added as products',()=>{
 const box=(x0,y0,x1,y1)=>({x0,y0,x1,y1});
 const parsed=readMenuPages([{id:'editorial',lines:[
  {text:'Pizzas',box:box(10,10,150,30)},
  {text:'Clássicas, do seu jeito',box:box(10,80,280,105)},
  {text:'Calabresa',box:box(10,140,150,165)},
  {text:'M R$ 49,00 G R$ 64,00',box:box(10,185,270,208)},
  {text:'Combos válidos somente no exemplo fictício.',box:box(10,230,350,255)},
  {text:'Sugestão do forno: combine com uma entrada para compartilhar.',box:box(10,520,490,550)}
 ]}]);
 assert.deepEqual(parsed.items.map(item=>item.name),['Calabresa']);
 assert.equal(parsed.items[0].description,'');
 assert.ok(parsed.unmatched.some(item=>item.text.startsWith('Sugestão do forno')));
});
