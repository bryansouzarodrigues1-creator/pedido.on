import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './test-backend-fixture.mjs';
import {defaultRestaurant,demoRestaurant,restaurantSchema} from '../lib/domain.ts';
import {menuPresentation,designFromMessage,presentationForTheme} from '../lib/menu-design.ts';
import {localStudio,proposalPatch,normalizeStudioResponse,studioInput,nameFromBriefing} from '../lib/studio-policy.ts';

test('design commands change composition, typography and hero while preserving selling data',()=>{
 const data=demoRestaurant(),before=structuredClone(data);
 for(const [message,layout,hero] of [['Lista artesanal verde italiano com letras elegantes','list','split'],['Escuro, fotos grandes e letras fortes','poster','cover'],['Claro, compacto e sem fotos','compact','compact'],['Colorido com cartões e cantos suaves','cards','split']]){
  const proposal=localStudio(message,data),patch=proposalPatch(proposal,data),next=restaurantSchema.parse({...data,...patch});
  assert.equal(next.presentation.layout,layout);assert.equal(next.presentation.hero,hero);assert.deepEqual(next.products,before.products);assert.deepEqual(next.pix,before.pix);assert.deepEqual(next.promotions,before.promotions);
 }
 assert.equal(designFromMessage('Lista elegante com cantos retos',data).presentation.corners,'square');assert.equal(designFromMessage('Lista elegante',data).presentation.font,'serif');
 assert.deepEqual(data,before);assert.throws(()=>proposalPatch({reply:'x',presentation:{...presentationForTheme('dark'),css:'url(evil)'},productDescriptions:[]},data));
});
test('old published menus without presentation keep the old composition',()=>{const data=demoRestaurant('dark');delete data.presentation;const parsed=restaurantSchema.parse(data);assert.equal(parsed.presentation,undefined);assert.deepEqual(menuPresentation(parsed),{layout:'cards',hero:'split',font:'modern',corners:'soft'});});
test('the published menu renders different product structures and keeps cart and pizza choices',()=>{
 const f=fixture();try{const Menu=f.load('components/menu.tsx').default,Product=f.load('components/menu-product.tsx').default;
  for(const theme of ['editorial','classic','dark','playful']){const data=demoRestaurant(theme),layout=data.presentation.layout,html=renderToStaticMarkup(createElement(Menu,{data,preview:true}));assert.match(html,new RegExp('layout-'+layout));assert.match(html,/Margherita/);assert.match(html,/Seu pedido/);const productHtml=renderToStaticMarkup(createElement(Product,{data,product:data.products[0],onChoose(){}}));if(layout==='compact')assert.doesNotMatch(productHtml,/<img/);else if(layout==='poster')assert.match(productHtml,/menu-product-poster/);else if(layout==='list')assert.match(productHtml,/menu-product-list/);else assert.match(productHtml,/product-card/);}
 }finally{f.close();}
});
test('the public home starts with an idea textarea and imports before asking for an account',()=>{const f=fixture();try{const Home=f.load('components/saas-landing.tsx').default,html=renderToStaticMarkup(createElement(Home));assert.match(html,/id="pizzeria-idea"/);assert.match(html,/cardápio \/ iFood/);assert.match(html,/Criar 12 modelos/);assert.doesNotMatch(html,/<input[^>]*(?:type="email"|type="password")/);assert.doesNotMatch(html,/id="planos"|Sua pizza está dando lucro|Menos complicação/);}finally{f.close();}});
test('a malformed optional product photo does not discard the valid visual proposal for a new shop',()=>{
 const snapshot=defaultRestaurant('Nova loja'),input=studioInput.parse({requestId:crypto.randomUUID(),message:'Cor de mussarela que lembre a Itália cores fotos',snapshot});
 const raw={reply:'Identidade italiana com letras elegantes.',theme:'editorial',accent:'#37634a',productDescriptions:[],imageBrief:{asset:'product',description:'Foto de pizza italiana, queijo e manjericão.'}};
 const p=normalizeStudioResponse(raw,input);assert.equal(p.imageBrief,undefined);assert.equal(p.presentation.layout,'list');assert.match(p.reply,/depois de escolher um produto/);assert.equal(proposalPatch(p,snapshot).accent,'#37634a');
 assert.throws(()=>normalizeStudioResponse({...raw,pix:{key:'bad'}},input));assert.throws(()=>normalizeStudioResponse({...raw,imageBrief:{...raw.imageBrief,productId:'foreign'}},input));
 const selected=studioInput.parse({...input,snapshot:demoRestaurant(),productId:'margherita'});assert.equal(normalizeStudioResponse(raw,selected).imageBrief.productId,'margherita');
});
test('real studio route tolerates only the incomplete optional photo, reuses the job and preserves the draft',async()=>{
 const f=fixture(),original=globalThis.fetch;f.env.PEDIDO_STUDIO_ENABLED='true';f.env.PEDIDO_STUDIO_ENDPOINT='https://pedido-on-estudio.lovable.app/api/pedido-on/studio';let calls=0;
 globalThis.fetch=async(_url,options)=>{calls++;assert.equal((await f.call('studioClaim','POST',{},JSON.parse(options.body))).status,200);return Response.json({reply:'Visual italiano preparado.',theme:'editorial',productDescriptions:[],imageBrief:{asset:'product',description:'Foto italiana de uma pizza.'}});};
 try{const data=defaultRestaurant('Nova loja'),body={requestId:crypto.randomUUID(),mode:'ai',message:'Itália, cores e fotos',snapshot:data,history:[]},before=f.db.prepare('SELECT data,published_data FROM restaurants WHERE id=?').get('shop-a'),response=await f.call('studio','POST',{id:'shop-a'},body);assert.equal(response.status,200,await response.clone().text());const result=await response.json();assert.equal(result.proposal.imageBrief,undefined);assert.equal(result.proposal.presentation.layout,'list');assert.equal(result.usage.used,1);assert.equal((await f.call('studio','POST',{id:'shop-a'},body)).status,200);assert.equal(calls,1);assert.deepEqual(f.db.prepare('SELECT data,published_data FROM restaurants WHERE id=?').get('shop-a'),before);}finally{globalThis.fetch=original;f.close();}
});
test('creating from the idea saves its design without requiring WhatsApp or creating AI jobs',async()=>{const f=fixture();try{const response=await f.call('restaurants','POST',{}, {name:'Forno das Ideias',slug:'forno-das-ideias',theme:'editorial',plan:'essencial',vision:'Quero um cardápio escuro com fotos grandes e letras fortes'});assert.equal(response.status,201,await response.clone().text());const {restaurant}=await response.json(),data=JSON.parse(restaurant.data);assert.equal(data.presentation.layout,'poster');assert.equal(data.presentation.font,'bold');assert.equal(data.whatsapp,'');assert.deepEqual(data.products,[]);assert.equal(data.pix.enabled,false);assert.equal(restaurant.published,false);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM studio_jobs').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM image_jobs').get().n,0);}finally{f.close();}});

test('an explicit pizzeria name reaches the free preview and is reusable at signup without inventing a brand',()=>{
 const cases=[
  ['Minha pizzaria se chama Forno da Vila, quero fotos grandes','Forno da Vila'],
  ['A pizzaria se chama Bella Roma e quero um cardápio escuro','Bella Roma'],
  ['Nome da pizzaria: Sabor & Arte','Sabor & Arte'],
  ['Nome da minha pizzaria é Massa Fina','Massa Fina'],
  ['O nome da minha pizzaria e Sapore dinapoli','Sapore dinapoli'],
  ['O nome da minha pizzaria é Sapore di Napoli','Sapore di Napoli'],
  ['Minha pizzaria é Forno Bello e quero fotos grandes','Forno Bello'],
  ['A minha pizzaria chama Bella Massa e gostaria de algo premium','Bella Massa'],
  ['Minha pizzaria se chama Bella Roma, quero um layout compacto','Bella Roma'],
  ['Quero um cardápio artesanal vermelho para minha pizzaria',undefined],
  ['Minha pizzaria é pequena e quero vermelho',undefined],
  ['Minha pizzaria é artesanal e quero verde',undefined],
  ['Tenho uma pizzaria de bairro com foco em delivery',undefined],
 ];
 const data=demoRestaurant();
 for(const [brief,name] of cases){
  assert.equal(nameFromBriefing(brief),name);
  const proposal=localStudio(brief,data),patch=proposalPatch(proposal,data);
  assert.equal(patch.name,name);
  assert.deepEqual(data.products.map(p=>p.prices),demoRestaurant().products.map(p=>p.prices));
 }
 assert.equal(localStudio(cases[0][0],data).presentation.layout,'poster');
});

test('design descriptions and verb prefixes never become an invented pizzeria name',()=>{
 for(const brief of [
  'Quero uma pizzaria elegante com fotos grandes',
  'Quero uma pizzaria escura e moderna',
  'Uma pizzaria especial para famílias',
  'Minha pizzaria é artesanal com forno a lenha',
  'Minha pizzaria e pequena com delivery rápido',
 ])assert.equal(nameFromBriefing(brief),undefined,brief);
 for(const [brief,name] of [
  ['O nome da minha pizzaria é Estação da Pizza','Estação da Pizza'],
  ['Minha pizzaria e Estação da Pizza','Estação da Pizza'],
  ['Minha pizzaria se chama Artesanal da Vila','Artesanal da Vila'],
  ['Nome do meu negócio é Forno da Vila','Forno da Vila'],
 ])assert.equal(nameFromBriefing(brief),name,brief);
});
