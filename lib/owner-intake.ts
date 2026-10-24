import {inspectMenuSourceText,parseIfoodStoreLink,sharedIfoodStoreName} from "./menu-source-links.ts";
import type {MenuStoreInfo} from "./menu-store-info.ts";
import {z} from "zod";

export const ownerFieldIds=["name","address","whatsapp","hours","menu"] as const;
export type OwnerField=typeof ownerFieldIds[number];
export const ownerIntakeSchema=z.object({
  answers:z.object({
    name:z.string().max(100).optional(),
    address:z.string().max(200).optional(),
    whatsapp:z.string().max(25).optional(),
    hours:z.string().max(300).optional(),
    menu:z.string().max(2000).optional(),
  }).strict(),
  visualChoice:z.enum(["artesanal","moderno","divertido","sugestoes"]).optional(),
  source:z.object({url:z.string().url().max(2048),telephone:z.string().max(25).optional(),sharedName:z.string().min(2).max(100).optional(),catalogStatus:z.enum(["imported","needs_content"]).optional()}).strict().optional(),
  step:z.number().int().min(0).max(5),
  initialMessage:z.string().max(1600).default(""),
}).strict();
export type OwnerIntake=z.infer<typeof ownerIntakeSchema>;
export const emptyOwnerIntake=():OwnerIntake=>({answers:{},step:0,initialMessage:""});
export const ownerQuestions=[
  "Qual é o nome da pizzaria e como você imagina o cardápio? Você pode importar um PDF ou fotos do cardápio.",
  "Onde fica a pizzaria? Informe rua, número, bairro, cidade e estado. Se não tiver endereço para divulgar, responda 'depois'.",
  "Qual WhatsApp os clientes devem usar para fazer pedidos? Inclua o DDD. Pode responder 'depois'.",
  "Qual é o horário de funcionamento? Ex.: terça a domingo, 18h às 23h. Se ainda não definiu, responda 'depois'.",
  "Traga seu cardápio por PDF, TXT ou foto. Também pode colar os produtos com preços aqui.",
] as const;

const simplified=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const skip=(text:string)=>/^(?:depois|pular|nao tenho|ainda nao|sem (?:endereco|cardapio)|prefiro depois|vou cadastrar depois|não tenho|ainda não|ignorar)$/i.test(text.trim());
function clean(text:string){return text.replace(/[\t ]+/g," ").replace(/^[\s"'“”]+|[\s"'“”.,;:]+$/g,"").trim();}
const locationBoundary=/\s+(?:e\s+)?(?:fica\s+(?:em|na|no)|fica\s+localizada?\s+(?:em|na|no)|localizad[ao]\s+(?:em|na|no)|é\s+em|e\s+em|em\s+(?:búzios|buzios|cabo frio|rio de janeiro))\b/i;
// Colour words may be part of the trade name ("Forno Azul", "Casa Verde").
// Split at actual design instructions, not at a colour adjective by itself.
const descriptorBoundary=/\s+(?:e\s+)?(?:quero|gostaria|as cores?|cores?|com\s+(?:as?\s+)?cores?)\b/i;
/** Clipboard tables arrive as Markdown, tabs, or plain label/value rows. */
function labelledOwnerFields(message:string){
 const result:Partial<Record<OwnerField,string>>={};
 for(const line of message.slice(0,6000).split(/\r?\n/)){
  const row=line.trim().replace(/^\|\s*|\s*\|$/g,"").replace(/\*\*/g,"");
  const match=row.match(/^(nome(?: da pizzaria)?|pizzaria|endere[cç]o(?: da (?:loja|pizzaria))?|whatsapp|whats|telefone para pedidos|hor[aá]rios?(?: de funcionamento)?|card[aá]pio)\s*(?:[:=|]\s*|\t+\s*| +)(.+)$/i);
  if(!match)continue;
  if(/^pizzaria$/i.test(match[1])&&!/^pizzaria\s*[:=|\t]/i.test(row))continue;
  if(/^nome$/i.test(match[1])&&/^(?:do|da|dela|dele)\b.*\s(?:é|e|:|=)\s/i.test(match[2]))continue;
  const key=simplified(match[1]),field:OwnerField=/^(nome|pizzaria)/.test(key)?"name":key.startsWith("endereco")?"address":/^(whats|telefone)/.test(key)?"whatsapp":key.startsWith("horario")?"hours":"menu";
  const value=clean(match[2].replace(/\s*\|.*$/,""));if(value&&!result[field])result[field]=value;
 }
 return result;
}
/** Conservative: never display an entire paragraph as a business name. */
export function extractOwnerName(text:string):string|undefined {
 const t=clean(text.slice(0,1600));
 const labelled=labelledOwnerFields(text).name;
 const match=(labelled?["",labelled]:null)||t.match(/\b(?:o\s+)?nome\s+(?:dela|dele|da\s+(?:minha\s+)?pizzaria|do\s+(?:meu\s+)?negócio|da\s+loja)\s*(?:é|e|:|=)\s*(.+)$/im)
  ||t.match(/\b(?:o\s+)?nome\s*(?:é|e|:|=)\s*(.+)$/im)
  ||t.match(/\b(?:ela\s+)?(?:se\s+chama|chama-se)\s+(.+)$/im)
  ||t.match(/^(?:nome|pizzaria)\s*[:=]\s*(.+)$/im)
  ||t.match(/\b(?:a\s+)?(?:minha\s+)?pizzaria\s+(?:se\s+chama|chama-se|chama|é|e)\s+(.+)$/im);
 if(!match)return;
 let value=clean(match[1].split(/[\n!?;]/)[0]).replace(/\s*,?\s+(?:e\s+)?(?:eu\s+)?(?:quero|gostaria|preciso|prefiro|desejo|imagino)\b.*$/i,"");
 // A location or colour sentence is not part of the name.
 value=clean(value.split(locationBoundary)[0].split(descriptorBoundary)[0]);
 if(/\s+(?:localizada?|situada?|endere[cç]o)\b/i.test(value))value=clean(value.split(/\s+(?:localizada?|situada?|endere[cç]o)\b/i)[0]);
 // A phrase describing the business is not its commercial name.
 if(/^(?:uma?|loja|neg[oó]cio|pequen[ao]|artesanal|tradicional|modern[ao]|simples|familiar|nov[ao]|de bairro|muito|escura?|clara?|premium|delivery|italian[ao]|caseir[ao]|especial)\b/i.test(value))return;
 // A sentence without a name is not a valid extraction.
 if(!value||value.length>75||value.split(/\s+/).length>10||/^(?:uma?|fica|em|no|na|aqui|com|de\s+bairro)\b/i.test(value))return;
 // Some owners say "pizzaria e Della Mama": here the 'e' is the verb "é".
 if(/^pizzaria\s+e\s+/i.test(value))value=value.replace(/^pizzaria\s+e\s+/i,"Pizzaria ");
 // Presentation only: preserve intentional casing such as iFood or di Napoli.
 if(value===value.toLowerCase()||/^Pizzaria [a-zà-ÿ ]+$/.test(value)){
   value=value.split(/\s+/).map((word,index)=>index>0&&/^(?:de|da|do|das|dos|e)$/i.test(word)?word.toLowerCase():word.charAt(0).toLocaleUpperCase("pt-BR")+word.slice(1)).join(" ");
 }
 return value.length>=2?value:undefined;
}
export function extractLocationHint(text:string):string|undefined {
 const t=text.slice(0,1600),match=t.match(/\b(?:fica|localizada?|situada?)\s+(?:em|na|no)\s+([^\n.!?;]{5,175})/i)
   ||t.match(/\b(?:é|e)\s+em\s+([^\n.!?;]{5,175})/i);
 if(!match)return;
 const value=clean(match[1].split(descriptorBoundary)[0]);
 return value.length>=5&&value.length<=175?value:undefined;
}
export function validateOwnerAnswer(field:OwnerField,raw:string):{value?:string;error?:string}{
 const text=clean(raw);
 if(field!=="name"&&skip(simplified(text)))return {value:""};
 if(field==="name"){
  const compact=clean(text.split(locationBoundary)[0].split(descriptorBoundary)[0]);
  const genericSentence=/^(?:quero|queria|gostaria|prefiro|preciso|faça|faca|crie|criar|monte|montar|gere|gerar|me ajude|ajude|cores?|fundo|fica|delivery|sem|com|tenho|localiza[cç][ãa]o|endere[cç]o)\b/i.test(compact);
  const name=extractOwnerName(text)||(!genericSentence&&/^[^\n.!?]{2,100}$/.test(compact)&&compact.split(/\s+/).length<=8?compact:undefined);
  if(!name||name.length<2||name.length>100)return {error:"Não consegui identificar o nome. Escreva o nome da pizzaria, por exemplo: Forno Azul."};
  return {value:name};
 }
 if(field==="address")return text.length<6||text.length>200?{error:"Informe o endereço completo ou escreva 'depois'. Evite incluir instruções de design nesse campo."}:{value:text};
 if(field==="whatsapp"){
  const digits=text.replace(/\D/g,"");
  if(!(digits.length===10||digits.length===11||((digits.length===12||digits.length===13)&&digits.startsWith("55"))))return {error:"Informe um WhatsApp brasileiro com DDD (ex.: 22 99999-9999), ou responda 'depois'."};
  return {value:text.slice(0,25)};
 }
 if(field==="hours")return text.length>300||text.length<4?{error:"Informe dias e horários ou escreva 'depois'."}:{value:text};
 if(field==="menu"){
  try{const u=new URL(text);if(!["https:","http:"].includes(u.protocol)||!!u.username||!!u.password||u.hostname==="localhost"||!u.hostname.includes("."))throw Error("url");return {value:u.toString().slice(0,2000)};}
  catch{return {error:"Cole um link http(s) válido do cardápio ou escreva 'depois'. Você também pode anexar foto ou arquivo."};}
 }
 return {error:"Campo desconhecido."};
}
export function ownerAnsweredCount(state:OwnerIntake){return ownerFieldIds.filter(field=>state.answers[field]!==undefined).length;}
/** Advance over facts already provided or explicitly skipped, preserving older checkpoints. */
export function withOwnerAnswers(state:OwnerIntake,patch:Partial<OwnerIntake["answers"]>){
 const answers={...state.answers,...patch},index=ownerFieldIds.findIndex(field=>answers[field]===undefined);
 return ownerIntakeSchema.parse({...state,answers,step:index<0?5:index});
}
export function ownerFacts(message:string):Partial<OwnerIntake["answers"]>{
 const facts:Partial<OwnerIntake["answers"]>={},name=extractOwnerName(message);if(name)facts.name=name;
 const fields=labelledOwnerFields(message);
 for(const field of ["address","whatsapp","hours"] as const){
  const value=fields[field];if(!value)continue;const result=validateOwnerAnswer(field,value);if(!result.error)facts[field]=result.value;
 }
 const source=inspectMenuSourceText(message);if(source.links.length===1)facts.menu=source.links[0].url;
 return facts;
}
export function nextOwnerIntake(state:OwnerIntake,message:string):{state:OwnerIntake;error?:string}{
 if(state.step>=ownerFieldIds.length)return {state};
 const field=ownerFieldIds[state.step],facts=ownerFacts(message);
 const parsed:{value?:string;error?:string}=facts[field]!==undefined?{value:facts[field]}:validateOwnerAnswer(field,message);
 // A visual idea without a name is a valid first turn, not a validation error.
 if(parsed.error&&field==="name"&&message.trim().length>=8&&/\b(?:quero|queria|gostaria|imagino|prefiro|preciso|faça|faca|crie|criar|monte|montar|gere|gerar|ajude|visual|estilo|design|card[aá]pio)\b/i.test(message)&&!inspectMenuSourceText(message).links.length){
  return {state:withOwnerAnswers({...state,initialMessage:state.initialMessage||message.slice(0,1600)},ownerFacts(message))};
 }
 if(parsed.error)return {state,error:parsed.error};
 const patch:Partial<OwnerIntake["answers"]>={};
 for(const field of ownerFieldIds)if(state.answers[field]===undefined&&facts[field]!==undefined)patch[field]=facts[field];
 patch[field]=parsed.value;
 const initialMessage=state.initialMessage||message.slice(0,1600);
 return {state:withOwnerAnswers({...state,initialMessage},patch)};
}
/** Keep the actual shared message even when it contains no explicit owner answer. */
export function ownerWithMenuSource(state:OwnerIntake,message:string){
 const source=inspectMenuSourceText(message);if(source.links.length!==1)return state;
 const url=source.links[0].url,sharedName=sharedIfoodStoreName(message),previous=state.source?.url===url?state.source:{};
 return ownerIntakeSchema.parse({...state,initialMessage:state.initialMessage||message.slice(0,1600),source:{...previous,url,...(sharedName?{sharedName}:{})}});
}
/** Explicit confirmation is required for both a share caption and a URL label. */
export function ownerNameSuggestion(state:OwnerIntake){
 if(state.answers.name&&state.answers.name!=="Sua pizzaria"||!state.source)return;
 const name=state.source.sharedName||parseIfoodStoreLink(state.source.url)?.storeLabel;if(!name)return;
 const checked=validateOwnerAnswer("name",name);if(checked.error||checked.value!==name)return;
 return {name,fromShare:!!state.source.sharedName};
}
/** Supplied files/text replace the missing-content notice; the source stays saved. */
export function ownerWithMenuContent(state:OwnerIntake){
 if(!state.source?.catalogStatus)return state;
 const {catalogStatus,...source}=state.source;return {...state,source};
}
/** Public facts are suggestions until the owner confirms; never overwrite an explicit answer. */
export function ownerFromStore(state:OwnerIntake,url:string,store:MenuStoreInfo={},catalogStatus?:"imported"|"needs_content"){
 const patch:Partial<OwnerIntake["answers"]>={menu:url};
 for(const field of ["name","address","hours"] as const)if(state.answers[field]===undefined&&store[field]){
  const checked=validateOwnerAnswer(field,store[field]!);if(!checked.error)patch[field]=checked.value;
 }
 const telephone=store.telephone&&validateOwnerAnswer("whatsapp",store.telephone).value;
 return withOwnerAnswers({...state,source:{...(state.source?.url===url?state.source:{}),url,...(telephone?{telephone}:{}),...(catalogStatus?{catalogStatus}:{})},initialMessage:state.initialMessage|| (patch.name?`Minha pizzaria se chama ${patch.name}.`:"")},patch);
}
export function intakeFinished(v:OwnerIntake){return v.step>=ownerFieldIds.length&&!!v.answers.name;}
/** Explicit preview action defers the remaining optional business fields. */
export function ownerReadyForPreview(state:OwnerIntake){
 if(intakeFinished(state))return state;
 if(!state.answers.name)return state;
 const patch:Partial<OwnerIntake["answers"]>={};for(const field of ownerFieldIds)if(state.answers[field]===undefined)patch[field]="";
 return withOwnerAnswers(state,patch);
}
/** The first preview accepts an idea; business details can be completed later. */
export function ownerPreviewFromDescription(state:OwnerIntake,message:string){
 const parsed=nextOwnerIntake(state,message),facts=ownerFacts(message);
 let next=parsed.error?withOwnerAnswers({...state,initialMessage:message.slice(0,1600)},facts):parsed.state;
 if(!facts.name&&!state.answers.name&&/madeira|nostalgi|vintage|retr[oô]|visual|estilo|fotos?|cores?|minimal|moderno|artesanal|quero|gostaria/i.test(message)){
  const {name,...answers}=next.answers;next={...next,answers,initialMessage:message.slice(0,1600)};
 }
 return ownerReadyForPreview(withOwnerAnswers(next,{name:next.answers.name||"Sua pizzaria"}));
}
export function ownerPreviewDetails(v:OwnerIntake){
 const a=v.answers;
 const address=a.address||"";
 // We don't invent a city/state from a vague location description.
 return {name:a.name||"Sua pizzaria",address,city:"",whatsapp:a.whatsapp||"",hours:a.hours||""};
}

export const ownerVisualChoices=[{id:"artesanal",label:"Artesanal",prompt:"Quero um cardápio artesanal, com fotos grandes e letras elegantes."},{id:"moderno",label:"Moderno",prompt:"Quero um cardápio moderno, organizado e fácil de ler no celular."},{id:"divertido",label:"Divertido",prompt:"Quero um cardápio alegre, com letras fortes e fotos em destaque."},{id:"sugestoes",label:"Me ajude a escolher",prompt:"Quero sugestões de visual para minha pizzaria."}] as const;
export function ownerVisualBriefing(state:OwnerIntake){
 const choice=ownerVisualChoices.find(c=>c.id===state.visualChoice);
 // A trade name or street is not a request for a colour or a layout.
 // Preserve the original conversation in initialMessage; remove only the first
 // occurrence of each supplied fact so later explicit design requests survive.
 let brief=state.initialMessage;
 for(const field of ["name","address","whatsapp","hours"] as const){const fact=state.answers[field];if(fact)brief=brief.replace(new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"),"");}
 // The product reader intentionally drops URL captions. A first-person design
 // request beside the URL is still part of the owner's visual instructions.
 brief=brief.split(/\r?\n/).map(line=>/\b(?:quero|prefiro|gostaria|desejo)\b/i.test(line)&&inspectMenuSourceText(line).links.length&&!sharedIfoodStoreName(line)?line.replace(/https?:\/\/[^\s<>"']+/gi,"").trim():line).join("\n");
 brief=inspectMenuSourceText(brief).menuText;
 return choice?brief.slice(0,1500)+"\n"+choice.prompt:brief;
}
export function hasOwnerVisualBriefing(state:OwnerIntake){return !!state.visualChoice||/\b(?:quero|prefiro|estilo|visual|design|layout|letras|fotos|cores)\b/i.test(state.initialMessage.replace(state.answers.name||"", ""));}
