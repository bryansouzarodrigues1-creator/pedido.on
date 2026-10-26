import test from 'node:test';
import assert from 'node:assert/strict';
import {readBusinessInfo,businessInfoPatch,validateBusinessInfo} from '../lib/business-info-reader.ts';
import {demoRestaurant,restaurantSchema} from '../lib/domain.ts';
import {emptyOwnerIntake,withOwnerAnswers,ownerPreviewDetails} from '../lib/owner-intake.ts';
const page=(text,id='print')=>({id,lines:text.split('\n').map(text=>({text,confidence:95}))});
const one=(result,field)=>result.suggestions.filter(s=>s.field===field);

test('Google-style screenshot yields labelled business data and seven days, not the current status',()=>{
 const result=readBusinessInfo([page('09:48\nPizzaria Forno de Teste\n4,8 (152)\nFechado · Abre às 18:00\nEndereço: Rua das Palmeiras, 42 - Centro\n(22) 99999-1234\nHorários\nsegunda-feira 18:00–23:00\nterça-feira\n18:00–23:00\nquarta-feira 18:00–23:00\nquinta-feira 18:00–23:00\nsexta-feira 18:00–00:00\nsábado 18:00–00:00\ndomingo Fechado\nSugerir novos horários')]);
 assert.equal(one(result,'name')[0].value,'Pizzaria Forno de Teste');
 assert.equal(one(result,'address')[0].value,'Rua das Palmeiras, 42 - Centro');
 assert.equal(one(result,'whatsapp')[0].value,'(22) 99999-1234');
 assert.equal(one(result,'hours').length,1);
 assert.equal(one(result,'hours')[0].value,'Segunda: 18:00–23:00; Terça: 18:00–23:00; Quarta: 18:00–23:00; Quinta: 18:00–23:00; Sexta: 18:00–00:00; Sábado: 18:00–00:00; Domingo: Fechado');
 assert.doesNotMatch(one(result,'hours')[0].value,/Abre às|09:48|4,8/);
 assert.equal(one(result,'hours')[0].uncertain,false);
 assert.match(result.text,/Sugerir novos horários/);
});
test('24 hours, midnight, split periods and today label preserve their explicit day',()=>{
 const result=readBusinessInfo([page('Segunda-feira (hoje) 11:00–14:00, 18:00–23:30\nTerça 18h às 00h\nQuarta-feira\nAberto 24 horas\nSábado Fechado')]);
 assert.equal(one(result,'hours')[0].value,'Segunda: 11:00–14:00, 18:00–23:30; Terça: 18h às 00h; Quarta: 24 horas; Sábado: Fechado');
 assert.doesNotMatch(one(result,'hours')[0].value,/Quinta|Sexta|Domingo/);
});
test('conflicting screenshots offer alternatives instead of blending two businesses',()=>{
 const a=page('Endereço: Rua A, 12\nSegunda 18:00–23:00','a'),b=page('Endereço: Rua B, 34\nSegunda 17:00–22:00','b');
 const result=readBusinessInfo([a,b]);
 assert.equal(one(result,'address').length,2);assert.equal(one(result,'hours').length,2);
 assert.deepEqual(one(result,'hours').map(s=>s.sourceId),['a','b']);
 assert.equal(readBusinessInfo([a,a]).suggestions.filter(s=>s.field==='hours').length,1);
});
test('conflicting rows in one screenshot are not last-write-wins',()=>{
 const result=readBusinessInfo([page('Segunda 18:00–23:00\nSegunda 17:00–22:00')]);
 assert.deepEqual(one(result,'hours').map(s=>s.value),['Segunda: 18:00–23:00','Segunda: 17:00–22:00']);
});
test('impossible times do not become a suggested schedule',()=>{
 for(const text of ['Segunda 25:00–23:00','Terça 18:70–23:00','Horário: 25:00–23:00','Horário: Segunda 18:70–23:00'])assert.equal(one(readBusinessInfo([page(text)]),'hours').length,0,text);
});
test('dated exception and current Google opening/closing status stay in the text, without a permanent schedule',()=>{
 const text='09:48\nFechado · Abre às 18:00\nHorário: 25/12/2026 18h às 23h\nQuinta-feira, 25/12 Fechado\nAniversário da loja: 15/11/2026';
 const result=readBusinessInfo([page(text)]);assert.equal(one(result,'hours').length,0);assert.match(result.text,/15\/11\/2026/);
});
test('plain source with no recognized fields remains available for any manual excerpt',()=>{
 const text='Retirada ao lado da praça\nFesta da loja em 15/11/2026\nConsulte as condições da promoção';
 const result=readBusinessInfo([page(text)]);assert.equal(result.suggestions.length,0);assert.equal(result.text,text);
 assert.deepEqual(businessInfoPatch({description:text},['description'],undefined,true),{description:text});
});
test('explicit labelled hours keep the original range, without inventing individual days',()=>{
 const result=readBusinessInfo([page('Horário de funcionamento: Terça a domingo, das 18h às 23h\nTempo estimado: 30–50 min')]);
 assert.equal(one(result,'hours')[0].value,'Terça a domingo, das 18h às 23h');assert.equal(one(result,'eta')[0].value,'30–50 min');
});
test('uncertain OCR marks the affected suggestion for review',()=>{
 const p=page('Segunda-feira\n18:00–23:00');p.lines[1].confidence=31;
 assert.equal(one(readBusinessInfo([p]),'hours')[0].uncertain,true);
 const p2=page('Endereço: Rua A, 12');p2.lines[0].textUncertain=true;
 assert.equal(one(readBusinessInfo([p2]),'address')[0].uncertain,true);
});
test('applying only selected fields preserves products, Pix, prices, current order state and all other fields',()=>{
 const before=demoRestaurant(),patch=businessInfoPatch({hours:'Segunda: 18:00–23:00',address:'Rua importada, 12'},['hours'],undefined,true);
 const after=restaurantSchema.parse({...before,...patch});assert.deepEqual(after,{...before,hours:'Segunda: 18:00–23:00'});
 assert.deepEqual(patch,{hours:'Segunda: 18:00–23:00'});assert.notEqual(after.address,'Rua importada, 12');
});
test('confirmation, at least one field and the context allowlist are enforced',()=>{
 assert.throws(()=>businessInfoPatch({hours:'18h às 23h'},['hours']),/confirmação/);
 assert.throws(()=>businessInfoPatch({},[],undefined,true),/Selecione/);
 for(const field of ['pix','isOpen','deliveryFee','products','__proto__'])assert.throws(()=>businessInfoPatch({[field]:'texto'},[field],undefined,true),/campo de texto/);
 assert.throws(()=>businessInfoPatch({description:'Outro trecho'},['description'],['name','hours'],true),/campo de texto/);
});
test('guest intake applies reviewed hours and address without replacing the chosen name or visual idea',()=>{
 const old={...emptyOwnerIntake(),answers:{name:'Pizzaria da Ana'},initialMessage:'Quero azul e amarelo.'};
 const patch=businessInfoPatch({name:'Outro negócio',hours:'Sábado: 18:00–23:00',address:'Rua das Flores, 30'},['hours','address'],['name','address','hours','whatsapp'],true);
 const after=withOwnerAnswers(old,patch);assert.equal(after.answers.name,'Pizzaria da Ana');assert.equal(after.initialMessage,old.initialMessage);assert.equal(ownerPreviewDetails(after).hours,patch.hours);
});
test('invalid phones and oversized values are rejected without silently truncating the field',()=>{
 for(const value of ['12345','+1 555 123-4567','(22) abcde-1234'])assert.throws(()=>validateBusinessInfo('whatsapp',value),/WhatsApp/);
 assert.throws(()=>validateBusinessInfo('hours','a'.repeat(301)),/300 caracteres/);assert.throws(()=>validateBusinessInfo('name','x'),/Confira/);
 assert.equal(validateBusinessInfo('whatsapp','+55 (22) 99999-1234'),'+55 (22) 99999-1234');
 assert.equal(validateBusinessInfo('whatsapp','+5522999991234'),'+5522999991234');
});
test('an oversized reading fails explicitly instead of hiding text at the cutoff',()=>{
 assert.throws(()=>readBusinessInfo([page('x'.repeat(30001),'a'),page('y'.repeat(30001),'b')]),/60 mil caracteres/);
});
