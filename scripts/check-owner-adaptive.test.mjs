import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyOwnerIntake,nextOwnerIntake,ownerFromStore,withOwnerAnswers,intakeFinished,ownerAnsweredCount,ownerPreviewDetails,ownerIntakeSchema,ownerVisualBriefing,hasOwnerVisualBriefing} from '../lib/owner-intake.ts';
import {galleryDesign} from '../lib/gallery-styles.ts';
import {defaultRestaurant} from '../lib/domain.ts';
const f=JSON.parse(readFileSync(new URL('./fixtures/owner-intake-forno-azul.json',import.meta.url)));
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
