import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import 'fake-indexeddb/auto';
import {parseIfoodStoreLink,inspectMenuSourceText,mergeMenuSourceText,sharedIfoodStoreName} from '../lib/menu-source-links.ts';
import {assistantAnswer} from '../lib/assistant-help.ts';
import {creationRequest} from '../lib/creation-request.ts';
import {readMenuPages,prepareReaderItems,importReaderItems} from '../lib/menu-reader-policy.ts';
import {defaultRestaurant} from '../lib/domain.ts';
import {saveReading,loadReading,removeReading} from '../lib/menu-reader-storage.ts';
import {fixture} from './test-backend-fixture.mjs';

const id='900caad5-258e-4bf7-9458-353cb0bffe60';
const url=`https://www.ifood.com.br/delivery/cabo-frio-rj/aione-pizzas-jardim-pero/${id}`;
const shared=`Esse lugar é a sua cara! Use o ícone de coração no app pra salvar a loja na sua área de Favoritos. Aione Pizzas - ${url}?UTM_Medium=share`;
const masterUrl='https://www.ifood.com.br/delivery/armacao-dos-buzios-rj/master-pizzas---buzios-sao-jose/cd5f08e7-d71c-4918-9fb4-963192b8a85b';
const masterShared='Esse lugar é a sua cara! Use o ícone de coração no app pra salvar a loja na sua área de Favoritos. Master Pizzas - Búzios - '+masterUrl+'?UTM_Medium=share';
const read=value=>readMenuPages([{id:'text',lines:inspectMenuSourceText(value).menuText.split('\n').map(text=>({text}))}]);

test('a real share caption preserves its accented commercial name as a suggestion',()=>{
 for(const input of [masterShared,masterShared.replace(' - '+masterUrl,' -\n'+masterUrl),masterShared.replace('! Use','!\nUse').replace('Favoritos. Master','Favoritos.\nMaster')])assert.equal(sharedIfoodStoreName(input),'Master Pizzas - Búzios');
 assert.equal(sharedIfoodStoreName(shared),'Aione Pizzas');
});

test('URL labels, unrelated captions, multiple stores and malformed references are not shared commercial names',()=>{
 for(const input of [masterUrl,'Master Pizzas - Búzios - '+masterUrl,masterShared.replace('Master Pizzas - Búzios','Outra pizzaria'),masterShared+'\n'+url,masterShared.replace('www.ifood.com.br','ifood.com.br.evil.test'),masterShared.replace('Master Pizzas - Búzios','<script>alert(1)</script>')])assert.equal(sharedIfoodStoreName(input),undefined,input);
});

test('the exact reported Master Pizzas share accepts triple hyphens and preserves the real store path',()=>{
 const source=inspectMenuSourceText(masterShared);assert.equal(source.status,'ifood');assert.equal(source.links.length,1);assert.equal(source.menuText,'');
 const parsed=source.links[0];assert.equal(parsed.url,masterUrl);assert.equal(parsed.storeId,'cd5f08e7-d71c-4918-9fb4-963192b8a85b');assert.equal(parsed.storeLabel,'Master Pizzas Buzios Sao Jose');assert.equal(parsed.locationLabel,'Armacao Dos Buzios · RJ');assert.equal(read(masterShared).items.length,0);
 for(const separators of ['--','---','----']){const candidate=masterUrl.replace('---',separators);assert.equal(parseIfoodStoreLink(candidate).url,candidate);}
 for(const input of [masterUrl,masterUrl+'?UTM_Medium=share',masterUrl.replace('https://',''),masterShared.replace(' - '+masterUrl,' -\n'+masterUrl),'Esse lugar é a sua cara!\nUse o ícone de coração no app pra salvar a loja na sua área de Favoritos.\nMaster Pizzas - Búzios -\n'+masterUrl]){
  const result=inspectMenuSourceText(input);assert.equal(result.status,'ifood');assert.equal(result.links[0].url,masterUrl);assert.equal(result.menuText,'');
 }
});

test('separator runs do not relax host, credential, path, state or UUID checks',()=>{
 for(const candidate of [masterUrl.replace('www.ifood.com.br','www.ifood.com.br.evil.test'),masterUrl.replace('www.ifood.com.br','user:pass@www.ifood.com.br'),masterUrl.replace('www.ifood.com.br','www.ifood.com.br:8443'),masterUrl.replace('master-pizzas---buzios','master-pizzas%2F..%2Fbuzios'),masterUrl.replace('master-pizzas---buzios','-master-pizzas---buzios'),masterUrl.replace('-sao-jose/','-sao-jose-/'),masterUrl.replace('buzios-rj','buzios-xx'),masterUrl.replace('cd5f08e7-d71c-4918-9fb4-963192b8a85b','invalid-id')])assert.equal(parseIfoodStoreLink(candidate),null,candidate);
});

test('the real source route accepts the reported canonical path and returns an upstream block without calling it invalid',async()=>{
 const f=fixture(),previous=globalThis.fetch;let called=[];
 globalThis.fetch=async(target,options)=>{called.push(target);assert.equal(options.redirect,'manual');return new Response('blocked',{status:403});};
 try{
  const route=f.load('app/api/menu-source/route.ts');
  const result=await route.POST(new Request('https://pedido.example/api/menu-source',{method:'POST',headers:{Origin:'https://pedido.example','Content-Type':'application/json','cf-connecting-ip':'203.0.113.20'},body:JSON.stringify({url:masterUrl})}));
  assert.equal(result.status,200);const body=await result.json();assert.equal(body.url,masterUrl);assert.equal(body.status,'needs_content');assert.equal(body.count,0);assert.deepEqual(called,[masterUrl]);
 }finally{globalThis.fetch=previous;f.close();}
});

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
  assert.match(html,/Link do iFood reconhecido/);assert.match(html,/Aione Pizzas Jardim Pero/);assert.match(html,/referência do endereço/);assert.match(html,/consultar o catálogo público/);assert.match(html,/iFood não liberar os produtos/);
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
