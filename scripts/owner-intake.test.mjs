import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {emptyOwnerIntake,extractOwnerName,extractLocationHint,nextOwnerIntake,intakeFinished,ownerPreviewDetails,ownerQuestions,validateOwnerAnswer,ownerVisualBriefing,withOwnerAnswers} from "../lib/owner-intake.ts";
import {resolveBrandPalette} from "../lib/brand-palette.ts";
import {nameFromBriefing} from "../lib/studio-policy.ts";
import {launchSchema} from "../lib/menu-launch.ts";

const sample="o nome dela e pizzaria e della mama e em buzios tucuns em frente a igreja na guilhermina amarela e vermelha";
test("design instructions beside an iFood link survive import without treating a share caption as a color request",()=>{
 const url="https://www.ifood.com.br/delivery/cabo-frio-rj/forno-azul-de-teste/900caad5-258e-4bf7-9458-353cb0bffe60",state=withOwnerAnswers({...emptyOwnerIntake(),initialMessage:"Quero um visual artesanal azul e amarelo. "+url},{name:"Forno Azul de Teste"});
 const brief=ownerVisualBriefing(state),palette=resolveBrandPalette(brief);assert.match(brief,/azul e amarelo/);assert.doesNotMatch(brief,/https?:/);assert.deepEqual(new Set([palette.primary,palette.palette.secondary]),new Set(["#2169AC","#F2BD38"]));
 const shared="Esse lugar é a sua cara! Use o ícone de coração no app pra salvar a loja na sua área de Favoritos. Forno Azul de Teste - "+url;assert.equal(ownerVisualBriefing({...state,initialMessage:shared}),"");assert.equal(resolveBrandPalette(ownerVisualBriefing({...state,initialMessage:url})),null);
});

test("real reported bug: user free message yields only restaurant name, never full address",()=>{
 assert.equal(extractOwnerName(sample),"Pizzaria Della Mama");
 assert.equal(nameFromBriefing(sample),"Pizzaria Della Mama");
 const location=extractLocationHint(sample);
 assert.ok(location?.toLowerCase().includes("tucuns"));
 assert.ok(!extractOwnerName(sample)?.toLowerCase().includes("buzios"));
});
test("natural Portuguese, punctuation, names and minimal/no input",()=>{
 assert.equal(extractOwnerName('Minha pizzaria se chama "Forno do Bairro". Quero azul'),"Forno do Bairro");
 assert.equal(extractOwnerName('Minha pizzaria se chama Forno Azul. Quero amarelo cor de queijo e azul do mar, com letras elegantes e fotos grandes.'),"Forno Azul");
 assert.equal(validateOwnerAnswer("name",'Minha pizzaria se chama Casa Verde e quero cores claras').value,"Casa Verde");
 assert.equal(extractOwnerName("Minha pizzaria é uma loja pequena"),undefined);
 assert.equal(extractOwnerName("Gostaria de fundo preto"),undefined);
 assert.equal(validateOwnerAnswer("name","Della Mama").value,"Della Mama");
 assert.ok(validateOwnerAnswer("name","Quero cores amarelas e vermelhas, fica em Búzios e faz delivery").error);
});
test("guided flow demands only known facts and asks one question at a time",()=>{
 let state=emptyOwnerIntake();
 assert.equal(state.step,0);
 for(const value of [sample,"Rua Guilhermina, 123, Tucuns, Armação dos Búzios - RJ","(22) 99999-9999","terça a domingo, 18h às 23h","depois"]){
  const r=nextOwnerIntake(state,value);assert.equal(r.error,undefined);state=r.state;
 }
 assert.equal(state.step,5);
 assert.equal(intakeFinished(state),true);
 assert.deepEqual(ownerPreviewDetails(state),{
  name:"Pizzaria Della Mama",address:"Rua Guilhermina, 123, Tucuns, Armação dos Búzios - RJ",
  city:"",whatsapp:"(22) 99999-9999",hours:"terça a domingo, 18h às 23h"
 });
 assert.equal(state.answers.menu,"");
 assert.equal(ownerQuestions.length,5);
});
test("menu only accepts a usable web link or skip; not arbitrary content injected into URLs",()=>{
 assert.ok(validateOwnerAnswer("menu","javascript:alert(1)").error);
 assert.ok(validateOwnerAnswer("menu","https://user:pass@example.com").error);
 assert.ok(validateOwnerAnswer("menu","http://localhost/admin").error);
 assert.equal(validateOwnerAnswer("menu","https://www.ifood.com.br/delivery/pizzaria-exemplo").value,"https://www.ifood.com.br/delivery/pizzaria-exemplo");
 assert.equal(validateOwnerAnswer("menu","depois").value,"");
 assert.equal(validateOwnerAnswer("address","depois").value,"");
});
test("invalid answers do not advance the workflow or create imaginary addresses or prices",()=>{
 const state=nextOwnerIntake(emptyOwnerIntake(),"Della Mama").state;
 assert.ok(nextOwnerIntake(state,"x").error);
 assert.equal(nextOwnerIntake(state,"x").state.step,1);
 assert.equal(ownerPreviewDetails(state).address,"");
 assert.equal(intakeFinished(state),false);
});
test("owner intake is persisted via validated launch schema, no secrets or extra fields",()=>{
 const s=emptyOwnerIntake();const n=nextOwnerIntake(s,"Pizzaria Della Mama").state;
 const stored=launchSchema.parse({id:"123e4567-e89b-42d3-a456-426614174000",savedAt:Date.now(),idea:"Pizzaria Della Mama",ownerIntake:n,sourceText:"",hasPhotos:false});
 assert.equal(stored.ownerIntake?.answers.name,"Pizzaria Della Mama");
 assert.equal(launchSchema.safeParse({...stored,ownerIntake:{...n,token:"should not persist"}}).success,false);
});
test("text and hours live in the UI, never baked into a new generated image",()=>{
 const view=readFileSync(new URL("../components/idea-start.tsx",import.meta.url),"utf8");
 const menu=readFileSync(new URL("../components/ui.tsx",import.meta.url),"utf8");
 const panel=readFileSync(new URL("../components/dashboard.tsx",import.meta.url),"utf8");
 assert.ok(view.includes("<OwnerIntakeChat"));
 assert.ok(view.includes("ownerPreviewDetails(intake)"));
 assert.ok(menu.includes("mini-store-address")&&menu.includes("mini-store-hours"));
 assert.ok(panel.includes("launch?.ownerIntake?.answers"));
 assert.ok(panel.includes('"PUT",{data:patch,revision:restaurant.revision}'));
});
