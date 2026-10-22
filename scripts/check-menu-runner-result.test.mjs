import test from 'node:test';
import assert from 'node:assert/strict';
import {runnerResultSchema,runnerCaptureForAssistance} from '../lib/menu-runner-result.ts';
import {assistanceToReaderText,assistStats} from '../lib/menu-assistance-policy.ts';
import {readMenuPages,readerItemReady} from '../lib/menu-reader-policy.ts';
import {runnerResultFromCapture} from './menu-runner-result-fixture.mjs';
const store='https://www.ifood.com.br/delivery/teste-rj/loja/123e4567-e89b-42d3-a456-426614174000';
const base=()=>runnerResultFromCapture({sourceUrl:store,storeName:'Loja sintética',capturedAt:new Date().toISOString(),truncated:false,items:[
 {id:'pizza',category:'Pizzas',name:'Margherita',description:'Ingredientes de teste',priceCents:5590,rawPrice:'R$ 55,90',available:true,needsReview:false,imageUrl:'https://static-images.ifood.com.br/fixture.png'},
 {id:'pending',category:'Combos',name:'Combo a conferir',description:'',priceCents:null,rawPrice:'A partir de R$ 75,00',available:true,needsReview:true,imageUrl:null}
]});
test('runner result retains pending products and exact cents without inventing pizza size or private photos',()=>{
 const capture=runnerCaptureForAssistance(base(),store),stats=assistStats(capture);
 assert.equal(capture.items.length,2);assert.equal(stats.approved,1);assert.equal(stats.pending,1);
 assert.equal(capture.items[0].priceCents,5590);assert.equal(capture.items[0].sizeChoice,null);assert.equal(capture.items[0].imageMediaUrl,null);
 assert.equal(capture.items[1].selected,false);
 const read=readMenuPages([{id:'runner',lines:assistanceToReaderText(capture).split('\n').map(text=>({text}))}]);
 assert.equal(read.items[0].name,'Margherita');assert.equal(readerItemReady(read.items[0]),false);
});
test('blocked, empty and non-success HTTP results cannot become an assistance delivery',()=>{
 for(const outcome of ['blocked','empty','unavailable','review_required']){const data=base();data.report.outcome=outcome;assert.equal(runnerResultSchema.safeParse(data).success,false);}
 for(const http of [null,301,401,403,429,500]){const data=base();data.report.documentStatus=http;assert.equal(runnerResultSchema.safeParse(data).success,false);}
});
test('runner import rejects another store, forged source, duplicated IDs and mismatched report counts',()=>{
 assert.throws(()=>runnerCaptureForAssistance(base(),store.replace(/000$/,'001')),/outra loja/);
 for(const mutate of [data=>{data.capture.sourceUrl='https://evil.test/source';},data=>{data.report.storeId=store.split('/').at(-1).replace(/000$/,'001');},
  data=>{data.capture.categories[1].items[0].id='pizza';},data=>{data.report.itemCount=1;},data=>{data.report.exportableCount=2;},
  data=>{data.capture.categories[0].items[0].category='Outra categoria';},data=>{data.capture.truncated=true;},
  data=>{data.capture.categories[0].items[0].priceCents=55.9;},data=>{data.capture.categories[0].items[0].imageMediaUrl='/media/private/forged.png';}
 ]){const data=base();mutate(data);assert.equal(runnerResultSchema.safeParse(data).success,false);}
});
test('unsafe photo credentials and protocols are discarded without losing usable products',()=>{
 for(const source of ['https://user:secret@example.test/image.png','javascript:alert(1)','http://example.test/image.png']){
  const data=base();data.capture.categories[0].items[0].imageUrl=source;
  const capture=runnerCaptureForAssistance(data,store);assert.equal(capture.items[0].imageUrl,null);assert.equal(capture.items[0].priceCents,5590);
 }
});
