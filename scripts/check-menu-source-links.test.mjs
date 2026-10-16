import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import 'fake-indexeddb/auto';
import {parseIfoodStoreLink,inspectMenuSourceText,mergeMenuSourceText} from '../lib/menu-source-links.ts';
import {structuredIfoodMenu,importIfoodLink} from '../lib/ifood-import.ts';
import {assistantAnswer} from '../lib/assistant-help.ts';
import {creationRequest} from '../lib/creation-request.ts';
import {readMenuPages,prepareReaderItems,importReaderItems} from '../lib/menu-reader-policy.ts';
import {defaultRestaurant} from '../lib/domain.ts';
import {saveReading,loadReading,removeReading} from '../lib/menu-reader-storage.ts';
import {fixture} from './test-backend-fixture.mjs';

const id='900caad5-258e-4bf7-9458-353cb0bffe60';
const url=`https://www.ifood.com.br/delivery/cabo-frio-rj/aione-pizzas-jardim-pero/${id}`;
const shared=`Esse lugar é a sua cara! Use o ícone de coração no app pra salvar a loja na sua área de Favoritos. Aione Pizzas - ${url}?UTM_Medium=share`;
const read=value=>readMenuPages([{id:'text',lines:inspectMenuSourceText(value).menuText.split('\n').map(text=>({text}))}]);

test('the owner-provided Aione link is a local reference; tracking and fragments do not become store facts',()=>{
 const parsed=parseIfoodStoreLink(url+'?UTM_Medium=share&price=999,99#secret');
 assert.deepEqual(parsed,{provider:'ifood',url,storeId:id,storeLabel:'Aione Pizzas Jardim Pero',locationLabel:'Cabo Frio · RJ'});
 assert.equal('cnpj' in parsed,false);assert.equal('products' in parsed,false);
 assert.equal(parseIfoodStoreLink(url.replace('https://www.ifood.com.br','')),null,'A path alone does not identify its platform');
 assert.equal(parseIfoodStoreLink(url.replace('https://','')).url,url);
 assert.equal(parseIfoodStoreLink(url.replace('www.','')).url,url);
 assert.equal(parseIfoodStoreLink(url.replace(id,id.toUpperCase())+'/').url,url);
});

test('shared messages and multiline wrappers never become menu products or price rows',()=>{
 for(const value of [shared,url,url+'?fake=49,90',`Esse lugar é a sua cara!\nUse o ícone de coração no app pra salvar a loja na sua área de Favoritos.\nAione Pizzas -\n${url}`]){
  const source=inspectMenuSourceText(value);assert.equal(source.status,'ifood');assert.equal(source.links.length,1);assert.equal(source.menuText,'');assert.equal(read(value).items.length,0);
 }
});

test('real pasted products retain sizes, prices and ingredients when mixed with a shared reference',()=>{
 const menu='Pizzas\nP M G\nCalabresa 29,90 39,90 49,90\nMolho, muçarela e calabresa\nBebidas\nRefrigerante 2L R$ 12,00';
 const source=inspectMenuSourceText(shared+'\n'+menu);assert.equal(source.menuText,menu);
 const result=read(shared+'\n'+menu);assert.deepEqual(result.items.map(v=>v.name),['Calabresa','Refrigerante 2L']);
 assert.deepEqual(result.items[0].sizes,{p:2990,m:3990,g:4990});assert.equal(result.items[0].description,'Molho, muçarela e calabresa');assert.equal(result.items[1].price,1200);
 assert.equal(inspectMenuSourceText('Bebidas\nSuco R$ 8,00 '+url).menuText,'Bebidas\nSuco R$ 8,00');
 assert.equal(inspectMenuSourceText(shared+'\nCalabresa -').menuText,'Calabresa -','An unresolved product ending in a dash must remain reviewable');
});

test('look-alike hosts, credential URLs, unexpected routes and invalid identifiers cannot create external anchors',()=>{
 for(const value of [url.replace('www.ifood.com.br','www.ifood.com.br.example.org'),url.replace('www.ifood.com.br','ifood.com.br@evil.example'),url.replace('www.ifood.com.br','owner:password@www.ifood.com.br'),url.replace('www.ifood.com.br','www.ifood.com.br:8443'),url.replace('https:','http:'),'javascript:'+url,url.replace('/delivery/','/other/'),url.replace(id,'not-a-store'),url.replace('/aione-pizzas-jardim-pero/','/aione%2Fsecret/'),url.replace('/aione-pizzas-jardim-pero/','/%3Cscript%3E/'),url.replace('cabo-frio-rj','cabo-frio-xx'),url+'?q='+'a'.repeat(2100)]){
  assert.equal(parseIfoodStoreLink(value),null,value);
 }
 const unknown=inspectMenuSourceText('https://evil.example/menu?price=49,90');assert.equal(unknown.status,'unsupported');assert.equal(unknown.menuText,'');assert.equal(read('https://evil.example/menu?price=49,90').items.length,0);
});

test('duplicate references are consolidated while different stores stay explicitly separate',()=>{
 const duplicate=inspectMenuSourceText(url+'\n'+url+'?UTM_Medium=share');assert.equal(duplicate.status,'ifood');assert.equal(duplicate.links.length,1);
 const second=url.replace(id,'100caad5-258e-4bf7-9458-353cb0bffe60').replace('aione-pizzas-jardim-pero','outra-pizzaria');
 const multiple=inspectMenuSourceText(url+'\n'+second+'\nBebidas\nSuco R$ 8,00');assert.equal(multiple.status,'multiple');assert.equal(multiple.links.length,2);assert.equal(read(multiple.menuText).items.length,1);
 assert.equal(inspectMenuSourceText('Bebidas\nSuco R$ 8,00').status,'none');
});

test('references with Unicode slugs are canonical HTTPS paths and their labels remain only source hints',()=>{
 const source=url.replace('aione-pizzas-jardim-pero',encodeURIComponent('pizzaria-são-joão'));
 const parsed=parseIfoodStoreLink(source);assert.equal(parsed.storeLabel,'Pizzaria São João');assert.equal(parsed.url,source);
 assert.equal(parseIfoodStoreLink(url.replace('aione-pizzas-jardim-pero','pizzaria-%E0%A4%A')),null);
 assert.equal(parseIfoodStoreLink(url.replace('aione-pizzas-jardim-pero','a'.repeat(161))),null);
});

test('the reference UI exposes canonical public URLs and explains the public lookup and content fallback',()=>{
 const f=fixture();try{
  const View=f.load('components/menu-source-link.tsx').default;
  const html=renderToStaticMarkup(createElement(View,{source:inspectMenuSourceText(shared)}));
  assert.match(html,/Link do iFood reconhecido/);assert.match(html,/Aione Pizzas Jardim Pero/);assert.match(html,/referência do endereço/);assert.match(html,/consultar o catálogo público/);assert.match(html,/iFood bloquear o acesso/);
  assert.ok(html.includes(`href="${url}"`));assert.match(html,/rel="noopener noreferrer"/);assert.doesNotMatch(html,/UTM_Medium|secret|cnpj|Loja encontrada/i);
  const unsafe=renderToStaticMarkup(createElement(View,{source:inspectMenuSourceText('https://evil.example/menu')}));assert.doesNotMatch(unsafe,/href=/);assert.match(unsafe,/Use o link da loja ou o texto/);
  const plain=renderToStaticMarkup(createElement(View,{source:inspectMenuSourceText('Bebidas\nSuco R$ 8,00')}));assert.equal(plain,'');
 }finally{f.close();}
});

test('shared-source recognition survives reopening, partial import and re-review without any network/model call',async()=>{
 const previousFetch=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('This local import must never contact iFood or a model');};
 const restaurantId='ifood-reference-reader';
 try{
  const text=shared+'\nBebidas\nSuco R$ 8,00\nÁgua R$ 5,00',data=defaultRestaurant('Pizzaria teste'),items=prepareReaderItems(read(text).items,data).map((item,index)=>({...item,selected:index===0}));
  await saveReading({restaurantId,savedAt:Date.now(),pages:[],items,unmatched:[],text});
  const restored=await loadReading(restaurantId);assert.equal(inspectMenuSourceText(restored.text).links[0].storeId,id);
  let saved;const imported=await importReaderItems(data,restored.items,patch=>{saved={...data,...patch};},()=> 'imported-suco');
  assert.deepEqual(saved.products.map(p=>p.name),['Suco']);assert.deepEqual(imported.remaining.map(p=>p.name),['Água']);
  await saveReading({...restored,items:imported.remaining});const remaining=await loadReading(restaurantId);assert.equal(inspectMenuSourceText(remaining.text).links[0].url,url);assert.equal(remaining.items[0].price,500);
  assert.equal(calls,0);
 }finally{globalThis.fetch=previousFetch;await removeReading(restaurantId);}
});

test('a shared link in the Studio is local guidance, carries its literal message and cannot fall through to a paid request',()=>{
 for(const message of [url,shared,'Importe o cardápio dessa loja: '+url]){
  const answer=assistantAnswer(message);assert.equal(answer.kind,'guide');assert.equal(answer.screen,'menu');assert.equal(answer.sourceText,message);assert.match(answer.reply,/consultar o catálogo público/);assert.match(answer.reply,/bloquear o acesso/);
  for(const target of ['image','visual','product'])assert.throws(()=>creationRequest(target,message,'ai',defaultRestaurant('Pizzaria teste'),'test-request'),/leitor do cardápio/);
 }
 assert.equal(assistantAnswer('Crie uma capa com pizza artesanal e '+url),null,'An explicit creative image request keeps the established generation route');
});

test('chat handoff preserves saved products and owner edits, consolidates repeated references and refuses silent truncation',async()=>{
 const restaurantId='ifood-handoff-reader',text='Bebidas\nSuco R$ 8,00',items=read(text).items.map(item=>({...item,name:'Suco corrigido pelo dono',selected:false}));
 try{
  await saveReading({restaurantId,savedAt:Date.now(),pages:[],items,unmatched:[],text});const restored=await loadReading(restaurantId);
  const merged=mergeMenuSourceText(restored.text,shared);assert.ok(merged.startsWith(text+'\n'));
  await saveReading({...restored,text:merged});const after=await loadReading(restaurantId);assert.deepEqual(after.items,items);assert.equal(after.text,merged);
  assert.equal(mergeMenuSourceText(merged,url+'?UTM_Medium=again'),merged);assert.equal(mergeMenuSourceText(merged,shared),merged);
  assert.throws(()=>mergeMenuSourceText('a'.repeat(60000),shared),/sem cortar/);assert.throws(()=>mergeMenuSourceText(text,'https://evil.example'),/link completo/);
  assert.equal((await loadReading(restaurantId)).text,merged);
 }finally{await removeReading(restaurantId);}
});

test('both real AI routes reject links and local-help questions before reserving jobs, quota or provider calls',async()=>{
 const f=fixture(),originalFetch=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('An import reference must not call providers');};
 try{
  const before=f.db.prepare("SELECT data,published_data FROM restaurants WHERE id='shop-a'").get();
  for(const message of [url,shared,'Como importar pelo CNPJ do iFood?','Como funciona o Pix?','https://evil.example/menu','Crie uma promoção com 2 pizzas e refrigerante']){
   const text=await f.call('studio','POST',{id:'shop-a'},{requestId:crypto.randomUUID(),mode:'ai',message,snapshot:f.data,history:[]});
   assert.equal(text.status,422,await text.clone().text());assert.match((await text.json()).error,/Nenhuma sugestão de IA foi usada/);
   const image=await f.call('images','POST',{id:'shop-a'},{requestId:crypto.randomUUID(),asset:'cover',description:message,theme:f.data.theme,accent:f.data.accent});
   assert.equal(image.status,422,await image.clone().text());assert.match((await image.json()).error,/Nenhuma imagem de IA foi usada/);
  }
  assert.equal(calls,0);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM studio_jobs').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM image_jobs').get().n,0);assert.equal(f.objects.size,0);
  assert.deepEqual(f.db.prepare("SELECT data,published_data FROM restaurants WHERE id='shop-a'").get(),before);
 }finally{globalThis.fetch=originalFetch;f.close();}
});

test('public iFood Next hydration yields only simple categorical items for owner review',()=>{
 const catalog={props:{pageProps:{initialState:{catalog:{categories:[
  {name:'Pizzas',items:[
   {name:'Calabresa',price:{value:49.9,currency:'BRL'},description:'Muçarela e calabresa'},
   {name:'Quatro queijos',price:{value:55},optionGroups:[{name:'Tamanho',options:['P','G']}]},
   {name:'Mussarela promoção',price:49,discountedPrice:39},
  ]},
  {name:'Bebidas',items:[
   {name:'Refrigerante lata',price:8.5,status:'AVAILABLE'},
   {name:'Taxa de entrega',price:5},
   {name:'Suco importado',price:{value:10,currency:'USD'}},
   {name:'Água indisponível',price:5,status:'UNAVAILABLE'},
  ]}
 ]}}}}};
 const html='<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify(catalog)+'</script>';
 const result=structuredIfoodMenu(html);
 assert.equal(result.count,2);assert.match(result.text,/Calabresa R\$ 49,90/);assert.match(result.text,/Refrigerante lata R\$ 8,50/);
 for(const forbidden of ['Quatro queijos','Mussarela promoção','Taxa de entrega','Suco importado','Água indisponível'])assert.equal(result.text.includes(forbidden),false);
 const parsed=readMenuPages([{id:'text',lines:result.text.split('\n').map(text=>({text}))}]);
 assert.deepEqual(parsed.items.map(i=>i.name),['Calabresa','Refrigerante lata']);
 assert.equal(parsed.items[0].sizes.g,0,'A pizza must not silently inherit the single known price as size G');
 assert.equal(parsed.items[1].price,850);
});

test('hydration ignores arbitrary app/cart metadata and does not execute initial-state JavaScript',()=>{
 const fake={props:{pageProps:{initialState:{orders:{items:[{name:'Cart item',price:1}]},profile:{name:'Customer',price:55},catalog:{categories:[{name:'Bebidas',items:[{name:'Água',price:5.5}]}]}}}}};
 const content='<script type="application/json" id="__NEXT_DATA__">'+JSON.stringify(fake)+'</script>'+
  '<script>window.__INITIAL_STATE__ = {items:[{name:"Injected",price:0.01}]};</script>';
 const result=structuredIfoodMenu(content);assert.equal(result.count,1);assert.match(result.text,/Água R\$ 5,50/);assert.doesNotMatch(result.text,/Cart item|Customer|Injected/);
 assert.equal(structuredIfoodMenu('<script id="__NEXT_DATA__" type="application/json">{bad</script>').count,0);
});
test('conflicting prices for the same public item are rejected instead of choosing a random offer',()=>{
 const schema=(price)=>JSON.stringify({'@type':'Menu',hasMenuSection:{'@type':'MenuSection',name:'Bebidas',hasMenuItem:{'@type':'MenuItem',name:'Suco',offers:{price,priceCurrency:'BRL'}}}});
 const html='<script type="application/ld+json">'+schema('8.00')+'</script><script type="application/ld+json">'+schema('12.00')+'</script>';
 assert.equal(structuredIfoodMenu(html).count,0);
 const ok='<script data-x="foo" type="application/ld+json">'+schema('8.00')+'</script>';
 assert.match(structuredIfoodMenu(ok).text,/Suco R\$ 8,00/);
 const double='<script type="application/ld+json">'+JSON.stringify({'@type':'MenuItem',name:'Suco',offers:[{price:8},{price:12}]})+'</script>';
 assert.equal(structuredIfoodMenu(double).count,0);
});
test('public importer remains read-only: no bypass of 403, no redirects, no authenticated network',async()=>{
 const html='<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{menu:{categories:[{name:'Bebidas',items:[{name:'Suco',price:8}]}]}}}})+'</script>';
 let requests=0;
 const fetcher=async(target,options)=>{requests++;assert.equal(target,url);assert.equal(options.redirect,'manual');assert.equal(options.headers.Accept,'text/html');return new Response(html,{status:200,headers:{'content-type':'text/html'}});};
 const success=await importIfoodLink(url,fetcher);assert.equal(success.status,'imported');assert.equal(success.count,1);assert.match(success.text,/Suco/);
 const block=await importIfoodLink(url,async()=>new Response('Access denied',{status:403}));assert.equal(block.status,'needs_content');assert.equal(block.count,0);assert.equal(block.text,'');
 const redirect=await importIfoodLink(url,async()=>new Response(null,{status:302,headers:{Location:'https://outside.example'}}));assert.equal(redirect.status,'needs_content');assert.equal(requests,1);
});
