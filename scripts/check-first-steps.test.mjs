import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRestaurant,restaurantSchema,demoRestaurant} from '../lib/domain.ts';
import {emptyFirstSteps,firstSale,studySignature,deliverySignature,firstStepsProgress,starterStoreReady,readFirstSteps,writeFirstSteps} from '../lib/first-steps.ts';
import {galleryDesign} from '../lib/gallery-styles.ts';

test('R$20 sold for R$40 leaves R$20 before missing costs, never a guaranteed net result',()=>{
 const study={...emptyFirstSteps(),cost:'20,00',price:'40,00'};
 const quote=firstSale(study);
 assert.deepEqual(quote,{cost:2000,price:4000,extras:0,fixed:0,fees:0,remaining:2000,costShare:50});
 assert.equal(firstStepsProgress(defaultRestaurant('Loja'),false,study)[1],false);
 const confirmed={...study,costReview:studySignature(study)};
 assert.equal(firstStepsProgress(defaultRestaurant('Loja'),false,confirmed)[1],true);
 assert.equal(firstStepsProgress(defaultRestaurant('Loja'),false,{...confirmed,cost:'21'})[1],false);
});
test('delivery cost, selling fees and fixed share are charged once and a loss stays negative',()=>{
 const quote=firstSale({...emptyFirstSteps(),cost:'20',price:'40',extras:'2',fees:'10',fixed:'3'});
 assert.equal(quote.fees,400);assert.equal(quote.remaining,1100);
 assert.equal(firstSale({...emptyFirstSteps(),cost:'20',price:'10'}).remaining,-1000);
 const rounded=firstSale({...emptyFirstSteps(),cost:'10,01',price:'23,95',fees:'3,5'});
 assert.equal(rounded.fees,84);assert.equal(rounded.remaining,1310);
});
test('incomplete, unbounded and invalid cost data cannot appear as a completed study',()=>{
 for(const patch of [{cost:''},{price:'0'},{cost:'-1'},{price:'infinito'},{cost:'20x'},{price:'10001'},{extras:'-1'},{fixed:'-0,01'},{fees:'91'},{fees:'-1'}])assert.equal(firstSale({...emptyFirstSteps(),cost:'20',price:'40',...patch}),null,JSON.stringify(patch));
 assert.equal(firstSale({...emptyFirstSteps(),cost:'1.234,56',price:'2.000,00'}).remaining,76544);
});
test('progress uses saved products and explicit delivery review; changed settings require another review',()=>{
 const saved=defaultRestaurant('Loja'),study=emptyFirstSteps();
 assert.deepEqual(firstStepsProgress(saved,false,study),[false,false,false,false]);
 const configured=restaurantSchema.parse({...demoRestaurant(),whatsapp:'11999999999'});
 assert.equal(starterStoreReady(configured),true);
 assert.deepEqual(firstStepsProgress(configured,true,study),[true,false,false,true]);
 const reviewed={...study,deliveryReview:deliverySignature(configured)};
 assert.equal(firstStepsProgress(configured,true,reviewed)[2],true);
 for(const patch of [{deliveryFee:900},{hours:'Quarta 18h–22h'},{pickupEnabled:false},{whatsapp:'11888888888'}])assert.equal(firstStepsProgress({...configured,...patch},true,reviewed)[2],false);
 assert.equal(starterStoreReady({...configured,pickupEnabled:true,address:''}),false);
 assert.equal(starterStoreReady({...configured,deliveryEnabled:false,pickupEnabled:false}),false);
 assert.equal(firstStepsProgress({...configured,hours:''},true,{...study,deliveryReview:deliverySignature({...configured,hours:''})})[2],false);
});
test('study storage is private to a shop key, bounded, survives a later visit and reports unavailable storage',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const study={...emptyFirstSteps(),step:2,cost:'20',price:'40'};
 writeFirstSteps(storage,'shop-one',study);
 assert.deepEqual(readFirstSteps(storage,'shop-one'),study);
 assert.deepEqual(readFirstSteps(storage,'shop-two'),emptyFirstSteps());
 assert.throws(()=>writeFirstSteps(storage,'../other',study));
 assert.throws(()=>writeFirstSteps(storage,'shop-one',{...study,cost:'9'.repeat(25)}));
 assert.throws(()=>readFirstSteps({getItem:()=>{throw Error('blocked');}},'shop-one'),/blocked/);
 assert.throws(()=>writeFirstSteps({setItem:()=>{throw Error('blocked');}},'shop-one',study),/blocked/);
 values.set('pizzaria-on:first-steps:v1:shop-one',JSON.stringify({...study,step:99}));
 assert.deepEqual(readFirstSteps(storage,'shop-one'),emptyFirstSteps());
});
test('selecting a ready model or removing its optional cover preserves the design and every selling value',()=>{
 const source=restaurantSchema.parse({...demoRestaurant(),whatsapp:'11999999999'}),before=structuredClone(source);
 const visual=galleryDesign(source,'noite-premium','');
 const next=restaurantSchema.parse({...source,theme:visual.theme,accent:visual.accent,presentation:visual.presentation,cover:'/assets/pizza.webp'});
 const withoutPhoto=restaurantSchema.parse({...next,cover:''});
 for(const field of ['products','categories','pix','payments','deliveryFee','whatsapp','tagline','description','promotions'])assert.deepEqual(withoutPhoto[field],before[field],field);
 assert.deepEqual(withoutPhoto.presentation,next.presentation);assert.equal(withoutPhoto.theme,next.theme);assert.equal(withoutPhoto.accent,next.accent);
 assert.deepEqual(source,before);
});
