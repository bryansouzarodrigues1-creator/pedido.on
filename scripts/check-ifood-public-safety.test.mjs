import test from 'node:test';
import assert from 'node:assert/strict';
import {structuredIfoodMenu,importIfoodLink} from '../lib/ifood-import.ts';
import {readMenuPages} from '../lib/menu-reader-policy.ts';
const next=categories=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{catalog:{categories}}}})+'</script>';
const items=products=>structuredIfoodMenu(next([{name:'Bebidas',items:products}]));
test('public inactive flags and paused statuses cannot import unavailable products',()=>{
 for(const flag of [{available:false},{isAvailable:false},{enabled:false},{active:false},{status:'PAUSED'},{status:'OUT_OF_STOCK'},{availability:'https://schema.org/OutOfStock'}])assert.equal(items([{name:'Suco',price:8.5,...flag}]).count,0,JSON.stringify(flag));
 assert.equal(items([{name:'Suco',price:8.5,available:true,status:'AVAILABLE'}]).count,1);
});
test('an unavailable category cannot be revived by a simpler schema duplicate',()=>{
 const schema='<script type="application/ld+json">'+JSON.stringify({'@type':'MenuSection',name:'Bebidas',hasMenuItem:{'@type':'MenuItem',name:'Suco',offers:{price:8.5,priceCurrency:'BRL'}}})+'</script>';
 assert.equal(structuredIfoodMenu(schema+next([{name:'Bebidas',available:false,items:[{name:'Suco',price:8.5}]}])).count,0);
});
test('object modifiers and option references remain complex instead of becoming flat products',()=>{
 for(const extra of [{optionGroups:{flavour:[{name:'Menta'}]}},{garnishGroupIds:['group-a']},{optionGroupIds:['group-b']},{options:'choose-a-size'},{variants:{small:8.5,large:10}}])assert.equal(items([{name:'Suco',price:8.5,...extra}]).count,0,JSON.stringify(extra));
 assert.equal(items([{name:'Suco',price:8.5,optionGroups:[]}]).count,1);
});
test('unknown price units, alternate values and conflicting currency metadata are never inferred',()=>{
 for(const price of [{value:850,currency:'BRL',unit:'cents'},{value:850,currency:'BRL',scale:100},{value:8.5,originalValue:10,currency:'BRL'},{value:8.5,currency:'BRL',priceCurrency:'USD'}])assert.equal(items([{name:'Suco',price}]).count,0,JSON.stringify(price));
 assert.match(items([{name:'Suco',price:{value:8.5,currency:'BRL'}}]).text,/8,50/);
});
test('public output is bounded by product count and the existing 60000-character source limit',()=>{
 const result=items(Array.from({length:400},(_,i)=>({name:'Bebida '+i,price:8.5})));
 assert.equal(result.count,200);assert.ok(result.text.length<=60000);
 const verbose=items(Array.from({length:200},(_,i)=>({name:'Bebida '+i,price:8.5,description:'Ingredientes da casa. '.repeat(40)})));
 assert.ok(verbose.count>0&&verbose.count<200);assert.ok(verbose.text.length<=60000);assert.equal(readMenuPages([{id:'public',lines:verbose.text.split('\n').map(text=>({text}))}]).items.length,verbose.count);
});
test('a clear public crust keeps its operational type for review instead of requiring a pizza size',()=>{
 const result=structuredIfoodMenu(next([{name:'Bordas recheadas',items:[{name:'Catupiry',price:8}]}]));
 const [item]=readMenuPages([{id:'public',lines:result.text.split('\n').map(text=>({text}))}]).items;
 assert.equal(item.kind,'crust');assert.equal(item.price,800);
});
test('a large import reserves room for the source link and explains that the result is partial',async()=>{
 const url='https://www.ifood.com.br/delivery/cabo-frio-rj/aione-pizzas-jardim-pero/900caad5-258e-4bf7-9458-353cb0bffe60';
 const html=next([{name:'Bebidas',items:Array.from({length:200},(_,i)=>({name:'Bebida '+i,price:8.5,description:'Ingredientes da casa. '.repeat(40)}))}]);
 const result=await importIfoodLink(url,async()=>new Response(html,{headers:{'content-type':'text/html'}}));
 assert.equal(result.status,'imported');assert.ok((result.url+'\n'+result.text).length<=60000);assert.match(result.message,/parte do catálogo/);
});
