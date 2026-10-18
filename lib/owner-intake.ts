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
  step:z.number().int().min(0).max(5),
  initialMessage:z.string().max(1600).default(""),
}).strict();
export type OwnerIntake=z.infer<typeof ownerIntakeSchema>;
export const emptyOwnerIntake=():OwnerIntake=>({answers:{},step:0,initialMessage:""});
export const ownerQuestions=[
  "Olá! Vou montar seu cardápio sem gastar créditos para gerar imagens. Qual é o nome da pizzaria? Pode me contar também o estilo que imagina.",
  "Onde fica a pizzaria? Informe rua, número, bairro, cidade e estado. Se não tiver endereço para divulgar, responda 'depois'.",
  "Qual WhatsApp os clientes devem usar para fazer pedidos? Inclua o DDD. Pode responder 'depois'.",
  "Qual é o horário de funcionamento? Ex.: terça a domingo, 18h às 23h. Se ainda não definiu, responda 'depois'.",
  "Você já tem cardápio? Cole o link do iFood ou do seu cardápio. Também pode enviar foto, TXT ou CSV em 'Anexar cardápio'. Se vai cadastrar os produtos depois, escreva 'depois'.",
] as const;

const simplified=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const skip=(text:string)=>/^(?:depois|pular|nao tenho|ainda nao|sem (?:endereco|cardapio)|prefiro depois|vou cadastrar depois|não tenho|ainda não|ignorar)$/i.test(text.trim());
function clean(text:string){return text.replace(/[\t ]+/g," ").replace(/^[\s"'“”]+|[\s"'“”.,;:]+$/g,"").trim();}
const locationBoundary=/\s+(?:e\s+)?(?:fica\s+(?:em|na|no)|fica\s+localizada?\s+(?:em|na|no)|localizad[ao]\s+(?:em|na|no)|é\s+em|e\s+em|em\s+(?:búzios|buzios|cabo frio|rio de janeiro))\b/i;
const descriptorBoundary=/\s+(?:e\s+)?(?:quero|gostaria|as cores?|cores?|vermelh[ao]|amarel[ao]|azul|verde|escuro|claro|com\s+(?:as?\s+)?cores?)\b/i;
/** Conservative: never display an entire paragraph as a business name. */
export function extractOwnerName(text:string):string|undefined {
 const t=clean(text.slice(0,1600));
 const match=t.match(/\b(?:o\s+)?nome\s+(?:dela|dele|da\s+(?:minha\s+)?pizzaria|do\s+(?:meu\s+)?negócio|da\s+loja)\s*(?:é|e|:|=)\s*(.+)$/i)
  ||t.match(/\b(?:a\s+)?(?:minha\s+)?pizzaria\s+(?:se\s+chama|chama-se|chama|é|e)\s+(.+)$/i);
 if(!match)return;
 let value=clean(match[1].split(/[\n!?;]/)[0]);
 // A location or colour sentence is not part of the name.
 value=clean(value.split(locationBoundary)[0].split(descriptorBoundary)[0]);
 if(/\s+(?:localizada?|situada?|endere[cç]o)\b/i.test(value))value=clean(value.split(/\s+(?:localizada?|situada?|endere[cç]o)\b/i)[0]);
 // A sentence without a name is not a valid extraction.
 if(!value||value.length>75||value.split(/\s+/).length>10||/^(?:uma?|fica|em|no|na|aqui|com|de\s+bairro)\b/i.test(value))return;
 // Some owners say "pizzaria e Della Mama": here the 'e' is the verb "é".
 if(/^pizzaria\s+e\s+/i.test(value))value=value.replace(/^pizzaria\s+e\s+/i,"Pizzaria ");
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
  const name=extractOwnerName(text)||(/^[^\n.!?]{2,100}$/.test(text)&&text.split(/\s+/).length<=8?text:undefined);
  if(!name||name.length<2||name.length>100)return {error:"Não consegui identificar o nome. Escreva só o nome da pizzaria, por exemplo: Pizzaria Della Mama."};
  return {value:name};
 }
 if(field==="address")return text.length<6||text.length>200?{error:"Informe o endereço completo ou escreva 'depois'. Evite incluir instruções de design nesse campo."}:{value:text};
 if(field==="whatsapp"){
  const digits=text.replace(/\D/g,"");
  if(digits.length!==10&&digits.length!==11&&!(digits.length===12||digits.length===13)&&digits.startsWith("55"))return {error:"Informe o WhatsApp com DDD, por exemplo (22) 99999-9999, ou responda 'depois'."};
  if(digits.length<10||digits.length>13)return {error:"Informe um telefone brasileiro com DDD ou responda 'depois'."};
  return {value:text.slice(0,25)};
 }
 if(field==="hours")return text.length>300||text.length<4?{error:"Informe dias e horários ou escreva 'depois'."}:{value:text};
 if(field==="menu"){
  try{const u=new URL(text);if(!["https:","http:"].includes(u.protocol)||!!u.username||!!u.password||u.hostname==="localhost"||!u.hostname.includes("."))throw Error("url");return {value:u.toString().slice(0,2000)};}
  catch{return {error:"Cole um link http(s) válido do cardápio ou escreva 'depois'. Você também pode anexar foto ou arquivo."};}
 }
 return {error:"Campo desconhecido."};
}
export function nextOwnerIntake(state:OwnerIntake,message:string):{state:OwnerIntake;error?:string}{
 if(state.step>=ownerFieldIds.length)return {state};
 const field=ownerFieldIds[state.step];
 const parsed=validateOwnerAnswer(field,message);
 if(parsed.error)return {state,error:parsed.error};
 const next={...state,step:state.step+1,initialMessage:state.step===0?message.slice(0,1600):state.initialMessage,
  answers:{...state.answers,[field]:parsed.value}};
 return {state:ownerIntakeSchema.parse(next)};
}
export function intakeFinished(v:OwnerIntake){return v.step>=ownerFieldIds.length&&!!v.answers.name;}
export function ownerPreviewDetails(v:OwnerIntake){
 const a=v.answers;
 const address=a.address||"";
 // We don't invent a city/state from a vague location description.
 return {name:a.name||"Sua pizzaria",address,city:"",whatsapp:a.whatsapp||"",hours:a.hours||""};
}
