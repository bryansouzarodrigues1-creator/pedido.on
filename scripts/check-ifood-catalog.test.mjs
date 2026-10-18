import test from 'node:test';
import assert from 'node:assert/strict';
import {officialIfoodCatalog,officialIfoodHours,officialIfoodStore} from '../lib/ifood-catalog.ts';
import {readMenuPages} from '../lib/menu-reader-policy.ts';
import {categories,hours,merchant,pizza} from './ifood-official-fixture.mjs';
const convert=graph=>officialIfoodCatalog([{id:'pizza',name:'Pizzas',status:'AVAILABLE',items:[graph]}]);
test('official pizza size plus flavor prices round-trip through the actual review reader',()=>{
 const result=officialIfoodCatalog(categories());assert.equal(result.count,3);assert.deepEqual(result.warnings,[]);
 const read=readMenuPages([{id:'official-ifood',lines:result.text.split('\n').map(text=>({text}))}]);assert.equal(read.items.length,3);
 assert.deepEqual(read.items[0].sizes,{p:2500,m:3200,g:4200});assert.deepEqual(read.items[1].sizes,{p:2700,m:3400,g:4400});assert.equal(read.items[2].price,890);assert.equal(read.items[0].name,'Calabresa de Teste');
});
test('delivery overrides apply; paused items and another sales channel do not leak prices',()=>{
 const data=categories();data[1].items[0].item.contextModifiers=[{catalogContext:'WHITELABEL',price:{value:1}},{catalogContext:'DEFAULT',price:{value:9.5}}];let result=officialIfoodCatalog(data);assert.match(result.text,/Água mineral R\$ 9,50/);
 data[1].items[0].item.contextModifiers[1].status='UNAVAILABLE';result=officialIfoodCatalog(data);assert.equal(result.count,2);assert.doesNotMatch(result.text,/Água/);
});
test('ambiguous prices, mandatory paid crusts, missing sizes and combo options require manual review',()=>{
 let graph=pizza();graph.options.push({...graph.options.find(o=>o.id==='calabresa'),id:'calabresa-duplicate',price:{value:4}});graph.optionGroups[3].optionIds.push('calabresa-duplicate');let result=convert(graph);assert.equal(result.count,1);assert.match(result.warnings.join(' '),/inequívoco/);
 graph=pizza();graph.options.find(o=>o.id==='crust-free').price.value=3;result=convert(graph);assert.equal(result.count,0);assert.match(result.warnings.join(' '),/sem opção gratuita/);
 graph=pizza();graph.products.find(p=>p.id==='size-g').name='Gigante';result=convert(graph);assert.equal(result.count,2);assert.doesNotMatch(result.text,/G R\$/);assert.match(result.warnings.join(' '),/fora de P\/M\/G/);
 const data=categories();data[1].items[0].optionGroups=[{id:'required-addon'}];result=officialIfoodCatalog(data);assert.equal(result.count,2);assert.match(result.warnings.join(' '),/adicionais ou combo/);
});
test('conflicting catalog prices remove the ambiguous product; invalid currency never becomes reais',()=>{
 const data=categories(),other=structuredClone(data[1]);other.items[0].item.price.value=7;data.push(other);let result=officialIfoodCatalog(data);assert.equal(result.count,2);assert.match(result.warnings.join(' '),/divergentes/);
 data[1].items[0].item.price={value:9,currency:'USD'};result=officialIfoodCatalog(data.slice(0,2));assert.equal(result.count,2);
});
test('a paused size-specific flavor never falls back to the generic available flavor price',()=>{
 const graph=pizza();graph.options.push({id:'calabresa-m',productId:'calabresa',parentCustomizationOptionId:'m',status:'UNAVAILABLE',price:{value:5}});graph.optionGroups[3].optionIds.push('calabresa-m');const result=convert(graph),read=readMenuPages([{id:'official',lines:result.text.split('\n').map(text=>({text}))}]);assert.deepEqual(read.items[0].sizes,{p:2500,m:null,g:4200});
});
test('overnight hours and validated address need no invented local facts',()=>{
 const store=officialIfoodStore(merchant,hours);assert.equal(store.name,'Forno Azul de Teste');assert.equal(store.address,'Rua do Forno Azul, 240, Bairro de Teste, Cabo Frio - RJ');assert.equal(store.hours,'terça a domingo, 18:00 às 00:30 (dia seguinte)');assert.equal(store.telephone,'(22) 99999-0147');assert.equal('whatsapp' in store,false);
 assert.equal(officialIfoodHours([{shifts:[{dayOfWeek:'MONDAY',start:'18:00:00',duration:0}]}]),'');
 assert.equal(officialIfoodHours([{shifts:[{dayOfWeek:'MONDAY',start:'23:00:00',duration:120},{dayOfWeek:'TUESDAY',start:'00:30:00',duration:120}]}]),'');
 assert.equal(officialIfoodStore({...merchant,address:{...merchant.address,state:'RJ-invalid'}},hours).address,undefined);
 assert.equal(officialIfoodHours([{operation:'TAKEOUT',shifts:hours[0].shifts}]),'');
});
