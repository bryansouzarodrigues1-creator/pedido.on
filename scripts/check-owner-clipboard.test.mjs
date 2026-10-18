import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyOwnerIntake,nextOwnerIntake,ownerReadyForPreview,intakeFinished,ownerPreviewDetails,ownerIntakeSchema} from '../lib/owner-intake.ts';

const rows=[['Campo','Dados de teste'],['Nome','Forno Azul de Teste'],['Endereço','Rua Fornalha de Teste, 137, Bairro Fictício, Armação dos Búzios — RJ'],['WhatsApp','(22) 90000-0000'],['Horários','Terça a domingo, 18h às 23h30'],['Cardápio','Oito pizzas em P/M/G e três bebidas'],['Exemplo','Margherita: R$32,90 / R$42,90 / R$52,90']];
for(const [format,render] of [['copied table',r=>r.join('\t')],['Markdown table',r=>'| '+r.join(' | ')+' |'],['plain table',r=>r.join('  ')]]){
 test('reported screenshot: '+format+' recognizes actual facts without treating the whole table as the name',()=>{
  const input=rows.map(render).join('\n'),result=nextOwnerIntake(emptyOwnerIntake(),input);assert.equal(result.error,undefined);
  assert.equal(result.state.answers.name,'Forno Azul de Teste');assert.equal(result.state.answers.address,rows[2][1]);assert.equal(result.state.answers.hours,rows[4][1]);assert.equal(result.state.answers.whatsapp,rows[3][1]);
  assert.equal(result.state.answers.menu,undefined);assert.equal(result.state.step,4);
  const started=nextOwnerIntake(emptyOwnerIntake(),'Pizzaria do Dono').state;
  const later=nextOwnerIntake(started,input);assert.equal(later.error,undefined);assert.equal(later.state.answers.name,'Pizzaria do Dono');assert.equal(later.state.answers.address,rows[2][1]);assert.equal(later.state.answers.whatsapp,rows[3][1]);
 });
}
test('a genuine trade name beginning with Pizzaria preserves that word',()=>{
 assert.equal(nextOwnerIntake(emptyOwnerIntake(),'Pizzaria Brasa do Mar').state.answers.name,'Pizzaria Brasa do Mar');
});
test('a visual idea without a trade name is accepted and retained while the flow asks for its name',()=>{
 const input='Quero um cardápio artesanal, azul e amarelo, fotos grandes e letras elegantes.';
 let result=nextOwnerIntake(emptyOwnerIntake(),input);assert.equal(result.error,undefined);assert.equal(result.state.step,0);assert.equal(result.state.initialMessage,input);
 result=nextOwnerIntake(result.state,'Forno da Praia');assert.equal(result.error,undefined);assert.equal(result.state.answers.name,'Forno da Praia');assert.equal(result.state.initialMessage,input);
});
test('ordinary create, build and help instructions are never saved as a fictitious trade name',()=>{
 for(const input of ['Crie um cardápio azul e amarelo','Faça uma lista artesanal','Monte um cardápio moderno','Me ajude a escolher um visual']){
  const result=nextOwnerIntake(emptyOwnerIntake(),input);assert.equal(result.error,undefined);assert.equal(result.state.answers.name,undefined);assert.equal(result.state.step,0);assert.equal(result.state.initialMessage,input);
 }
});
test('an explicit preview action defers optional fields without inventing store facts, and survives checkpoints',()=>{
 const first=nextOwnerIntake(emptyOwnerIntake(),'Minha pizzaria se chama Forno Azul. Quero um visual artesanal.').state;
 const ready=ownerReadyForPreview(first);assert.equal(intakeFinished(ready),true);assert.equal(first.answers.address,undefined);
 assert.deepEqual(ownerPreviewDetails(ready),{name:'Forno Azul',address:'',city:'',whatsapp:'',hours:''});assert.deepEqual(ownerIntakeSchema.parse(JSON.parse(JSON.stringify(ready))),ready);
 assert.equal(intakeFinished(ownerReadyForPreview(emptyOwnerIntake())),false);
});
