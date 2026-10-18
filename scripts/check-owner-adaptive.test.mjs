import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyOwnerIntake,nextOwnerIntake,ownerFromStore,ownerWithMenuSource,ownerWithMenuContent,ownerNameSuggestion,withOwnerAnswers,intakeFinished,ownerAnsweredCount,ownerPreviewDetails,ownerIntakeSchema,ownerVisualBriefing,hasOwnerVisualBriefing} from '../lib/owner-intake.ts';
import {galleryDesign} from '../lib/gallery-styles.ts';
import {defaultRestaurant} from '../lib/domain.ts';
const f=JSON.parse(readFileSync(new URL('./fixtures/owner-intake-forno-azul.json',import.meta.url)));
const masterUrl='https://www.ifood.com.br/delivery/armacao-dos-buzios-rj/master-pizzas---buzios-sao-jose/cd5f08e7-d71c-4918-9fb4-963192b8a85b';
const shared='Esse lugar é a sua cara! Use o ícone de coração no app pra salvar a loja na sua área de Favoritos. Master Pizzas - Búzios - '+masterUrl+'?UTM_Medium=share';

test('a blocked share resumes with its exact message and name choice, without confirming facts silently',()=>{
 const s=ownerFromStore(ownerWithMenuSource(emptyOwnerIntake(),shared),masterUrl,{},'needs_content');
 const restored=ownerIntakeSchema.parse(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.initialMessage,shared);assert.equal(restored.source.catalogStatus,'needs_content');
 assert.deepEqual(ownerNameSuggestion(restored),{name:'Master Pizzas - Búzios',fromShare:true});assert.equal(restored.answers.name,undefined);assert.equal(restored.answers.address,undefined);assert.equal(restored.answers.hours,undefined);
 const confirmed=nextOwnerIntake(restored,ownerNameSuggestion(restored).name).state;
 assert.equal(confirmed.answers.name,'Master Pizzas - Búzios');assert.equal(confirmed.step,1);assert.equal(ownerNameSuggestion(confirmed),undefined);assert.equal(ownerVisualBriefing(confirmed),'');
});

test('older source-only checkpoints offer an explicitly unverified URL label and remain editable',()=>{
 const legacy=ownerIntakeSchema.parse({answers:{menu:masterUrl},source:{url:masterUrl},step:0,initialMessage:''});
 assert.deepEqual(ownerNameSuggestion(legacy),{name:'Master Pizzas Buzios Sao Jose',fromShare:false});assert.equal(legacy.answers.name,undefined);
 const edited=withOwnerAnswers(legacy,{name:'Nome escolhido pelo dono'});assert.equal(edited.step,1);assert.equal(ownerNameSuggestion(edited),undefined);
 const long=ownerIntakeSchema.parse({...legacy,source:{url:masterUrl.replace('master-pizzas---buzios-sao-jose','a'.repeat(110))}});assert.equal(ownerNameSuggestion(long),undefined,'An unusable URL label must leave the editable name field visible');
});

test('changing stores drops old suggestions and telephone while explicit answers and design survive',()=>{
 let state=nextOwnerIntake(emptyOwnerIntake(),'Minha pizzaria se chama Casa Verde. Quero amarelo e azul.').state;
 state=ownerFromStore(ownerWithMenuSource(state,shared),masterUrl,{telephone:f.whatsapp},'needs_content');
 assert.equal(state.answers.name,'Casa Verde');assert.equal(ownerNameSuggestion(state),undefined);assert.match(ownerVisualBriefing(state),/Quero amarelo e azul/);
 const changed=ownerWithMenuSource(state,f.url);assert.equal(changed.source.url,f.url);assert.equal(changed.source.sharedName,undefined);assert.equal(changed.source.telephone,undefined);assert.equal(changed.source.catalogStatus,undefined);assert.equal(changed.answers.name,'Casa Verde');
});

test('unrecognized and multiple store messages cannot replace a checkpoint source',()=>{
 const state=ownerFromStore(ownerWithMenuSource(emptyOwnerIntake(),shared),masterUrl,{},'needs_content');
 assert.equal(ownerWithMenuSource(state,'https://example.test/loja'),state);assert.equal(ownerWithMenuSource(state,masterUrl+'\n'+f.url),state);
});

test('a successfully supplied menu replaces the blocked notice without losing its source or name choice',()=>{
 const original=ownerFromStore(ownerWithMenuSource(emptyOwnerIntake(),shared),masterUrl,{},'needs_content'),state=ownerWithMenuContent(original);
 assert.equal(state.source.catalogStatus,undefined);assert.equal(original.source.catalogStatus,'needs_content');assert.equal(state.source.url,masterUrl);assert.deepEqual(ownerNameSuggestion(state),{name:'Master Pizzas - Búzios',fromShare:true});assert.equal(state.initialMessage,shared);assert.deepEqual(state.answers,original.answers);assert.deepEqual(ownerIntakeSchema.parse(JSON.parse(JSON.stringify(state))),state);
});
test('trade names and addresses do not override explicit colours in a suggested design',()=>{
 const original='Minha pizzaria se chama Casa Verde. Quero amarelo.\nEndereço: Rua Azul, 18, Cabo Frio - RJ';
 const state=nextOwnerIntake(emptyOwnerIntake(),original).state,brief=ownerVisualBriefing(state);
 assert.equal(state.initialMessage,original);assert.match(brief,/Quero amarelo/);assert.doesNotMatch(brief,/Casa Verde|Rua Azul/);
 assert.equal(galleryDesign(defaultRestaurant('Casa Verde'),'forno-classico',brief).accent,'#dfae28');
 const blue=nextOwnerIntake(emptyOwnerIntake(),'Minha pizzaria se chama Azul. Quero azul e amarelo.').state;
 assert.match(ownerVisualBriefing(blue),/Quero azul e amarelo/);
});
test('a detailed fictitious briefing fills four explicit facts without asking them again',()=>{
 const result=nextOwnerIntake(emptyOwnerIntake(),f.initialMessage);assert.equal(result.error,undefined);
 const s=result.state;assert.equal(s.step,4);assert.equal(ownerAnsweredCount(s),4);
 assert.equal(s.answers.name,f.name);assert.equal(s.answers.address,f.address);assert.equal(s.answers.whatsapp,f.whatsapp);assert.equal(s.answers.hours,'terça a domingo, 18h às 23h30');
 assert.equal(intakeFinished(nextOwnerIntake(s,'depois').state),true);
});
test('confirmed store facts leave only WhatsApp; telephone never silently becomes a WhatsApp',()=>{
 const s=ownerFromStore(emptyOwnerIntake(),f.url,{name:f.name,address:f.address,hours:f.hours,telephone:f.whatsapp});
 assert.equal(s.step,2);assert.equal(s.answers.whatsapp,undefined);assert.equal(s.source.telephone,f.whatsapp);assert.equal(ownerAnsweredCount(s),4);
 const final=nextOwnerIntake(s,f.whatsapp).state;assert.equal(intakeFinished(final),true);assert.equal(final.answers.menu,f.url);
});
test('blocked source keeps its link and asks missing facts without making up the store name or city',()=>{
 const s=ownerFromStore(emptyOwnerIntake(),f.url);assert.equal(s.step,0);assert.equal(s.answers.name,undefined);assert.equal(s.answers.address,undefined);assert.equal(s.answers.menu,f.url);
 let next=nextOwnerIntake(s,'Forno Azul de Teste').state;assert.equal(next.step,1);
 next=nextOwnerIntake(next,'depois').state;next=nextOwnerIntake(next,'depois').state;next=nextOwnerIntake(next,'depois').state;assert.equal(next.step,5);
 assert.equal(ownerPreviewDetails(next).address,'');
});
test('explicit answers, skips, corrections and the original visual briefing survive source confirmation and resume',()=>{
 let s=nextOwnerIntake(emptyOwnerIntake(),'Minha pizzaria se chama Casa Verde. Quero amarelo e azul.').state;
 s=withOwnerAnswers(s,{address:'Rua informada pelo dono, 99',hours:''});
 s=ownerFromStore(s,f.url,{name:'Nome antigo do link',address:f.address,hours:f.hours});
 assert.equal(s.answers.name,'Casa Verde');assert.equal(s.answers.address,'Rua informada pelo dono, 99');assert.equal(s.answers.hours,'');assert.match(s.initialMessage,/amarelo e azul/);
 const resumed=ownerIntakeSchema.parse(JSON.parse(JSON.stringify(s)));assert.deepEqual(resumed,s);
 assert.equal(withOwnerAnswers(s,{address:'Endereço corrigido, 111'}).answers.hours,'');
});

test('a link-only owner gets explicit visual choices while the original briefing and facts remain intact',()=>{
 const state=ownerFromStore(emptyOwnerIntake(),f.url,{name:f.name,address:f.address,hours:f.hours});
 assert.equal(hasOwnerVisualBriefing(state),false);const chosen={...state,visualChoice:'artesanal'};
 assert.equal(hasOwnerVisualBriefing(chosen),true);assert.match(ownerVisualBriefing(chosen),/fotos grandes/);
 assert.equal(chosen.initialMessage,state.initialMessage);assert.deepEqual(chosen.answers,state.answers);
});
