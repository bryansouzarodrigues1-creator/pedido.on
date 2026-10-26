import type {ReaderPage} from "./menu-reader-policy.ts";

export const businessInfoFields=["name","address","city","whatsapp","hours","description","eta"] as const;
export type BusinessInfoField=typeof businessInfoFields[number];
export type BusinessInfoValues=Partial<Record<BusinessInfoField,string>>;
export const businessInfoLabels:Record<BusinessInfoField,string>={name:"Nome da pizzaria",address:"Endereço",city:"Cidade e estado",whatsapp:"WhatsApp de pedidos",hours:"Horários de funcionamento",description:"Descrição da pizzaria",eta:"Tempo estimado"};
export const businessInfoLimits:Record<BusinessInfoField,number>={name:100,address:200,city:80,whatsapp:25,hours:300,description:700,eta:60};
export type BusinessInfoSuggestion={field:BusinessInfoField;value:string;evidence:string;sourceId:string;uncertain:boolean};
type SourcePage=Pick<ReaderPage,"id"|"lines">;
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const clean=(s:string)=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/g,"").trim();
const dayNames=["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const dayPattern="(?:segunda(?:[ -]feira)?|terca(?:[ -]feira)?|quarta(?:[ -]feira)?|quinta(?:[ -]feira)?|sexta(?:[ -]feira)?|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)";
const dayRow=new RegExp("^("+dayPattern+")(?=\\s|$|[,:·])(?:\\s*\\(hoje\\))?\\s*[:,·]?\\s*(.*)$");
const dayIndex=(s:string)=>["seg","ter","qua","qui","sex","sab","dom"].indexOf(s.slice(0,3));
const time="(?<![\\d:])(?:[01]?\\d|2[0-3])(?::[0-5]\\d|h(?:[0-5]\\d)?)?(?![\\d:h])";
const interval=time+"\\s*(?:[-–—]|as?|ate)\\s*"+time;
const periods=new RegExp("^(?:"+interval+")(?:\\s*(?:,|e|/|;|\\|)\\s*"+interval+"){0,2}$");
const hasDate=/\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b/;
function hoursTail(value:string){
 const text=clean(value),norm=normalize(text).replace(/\s+/g," ");
 if(/^(?:fechado|fechada|nao abre|nao funciona)$/.test(norm))return "Fechado";
 if(/^(?:aberto\s+)?24\s*(?:h|horas)$/.test(norm))return "24 horas";
 return periods.test(norm)?text:undefined;
}
export function validateBusinessInfo(field:BusinessInfoField,raw:string){
 const value=clean(raw);
 if(!value||(field==="name"&&value.length<2))throw Error(`Confira o campo ${businessInfoLabels[field]}.`);
 if(value.length>businessInfoLimits[field])throw Error(`${businessInfoLabels[field]} aceita até ${businessInfoLimits[field]} caracteres. Escolha um trecho menor.`);
 if(field==="whatsapp"&&(!/^\+?[\d\s().-]+$/.test(value)||value.startsWith("+")&&!/^\+55/.test(value)||! /^(?:[1-9]\d{9,10}|55[1-9]\d{9,10})$/.test(value.replace(/\D/g,""))))throw Error("Confira o WhatsApp com DDD. Um telefone da imagem pode não ser WhatsApp.");
 return value;
}
/** Explicitly selected, confirmed text fields only. Never change Pix, prices or order state. */
export function businessInfoPatch(values:BusinessInfoValues,selected:readonly string[],allowed:readonly BusinessInfoField[]=businessInfoFields,confirmed=false):BusinessInfoValues{
 if(!confirmed)throw Error("Confira os campos e marque a confirmação.");
 if(!selected.length)throw Error("Selecione ao menos uma informação para usar.");
 const patch:BusinessInfoValues={};
 for(const field of selected){
  if(!businessInfoFields.includes(field as BusinessInfoField)||!allowed.includes(field as BusinessInfoField))throw Error("Escolha um campo de texto disponível nesta tela.");
  const key=field as BusinessInfoField;if(typeof values[key]!=="string")throw Error("Confira o texto selecionado.");
  patch[key]=validateBusinessInfo(key,values[key]!);
 }
 return patch;
}
/** Read supplied pixels/text only. All results remain suggestions, including phone numbers. */
export function readBusinessInfo(pages:SourcePage[]):{text:string;suggestions:BusinessInfoSuggestion[]}{
 const suggestions:BusinessInfoSuggestion[]=[],texts:string[]=[];
 for(const page of pages.slice(0,8)){
  const lines=page.lines.slice(0,5000).flatMap(line=>line.text.split(/\r?\n/).map(text=>({...line,text:clean(text)}))).filter(line=>line.text);
  texts.push(lines.map(line=>line.text).join("\n"));
  const add=(field:BusinessInfoField,value:string,evidence:string,index:number)=>{
   try{value=validateBusinessInfo(field,value);}catch{return;}
   if(suggestions.some(s=>s.field===field&&s.value===value))return;
   const l=lines[index];suggestions.push({field,value,evidence:evidence.slice(0,1500),sourceId:page.id,uncertain:!!(l.textUncertain||l.layoutUncertain||(l.confidence!==undefined&&l.confidence<75))});
  };
  const weekly:{day:number;hours:string;line:number;evidence:string}[]=[];
  for(let i=0;i<lines.length;i++){
   const value=lines[i].text,norm=normalize(value),next=lines[i+1]?.text||"";
   const labelled=value.match(/^(nome(?: da pizzaria)?|pizzaria|endere[cç]o|cidade(?: e estado)?|whats(?:app)?|telefone|hor[aá]rios?(?: de funcionamento)?|descri[cç][aã]o(?: da pizzaria)?|tempo(?: estimado)?(?: de entrega)?)\s*[:=]\s*(.+)$/i);
   if(labelled){
    const label=normalize(labelled[1]),field:BusinessInfoField=/^(nome|pizzaria)/.test(label)?"name":label.startsWith("endereco")?"address":label.startsWith("cidade")?"city":/^(whats|telefone)/.test(label)?"whatsapp":label.startsWith("horario")?"hours":label.startsWith("descricao")?"description":"eta";
    // A dated exception or the current Google status is not a weekly schedule.
    if(field!=="hours"||!hasDate.test(labelled[2])&&new RegExp(interval+"|(?:"+dayPattern+").*\\bfechad[oa]\\b|24\\s*(?:h|horas)").test(normalize(labelled[2])))add(field,labelled[2],value,i);
   }
   if(/^(?:endere[cç]o|address)\s*:?$/i.test(value)&&/^(?:rua|r\.|avenida|av\.|travessa|estrada|rodovia|praça|alameda)\b/i.test(next))add("address",next,value+"\n"+next,i+1);
   if(/^(?:rua|r\.|avenida|av\.|travessa|estrada|rodovia|praça|alameda)\s/i.test(value)&&/\d/.test(value))add("address",value,value,i);
   if(/^pizzaria\s+[\p{L}\d][\p{L}\d .&'-]{2,70}$/iu.test(value)&&!/^pizzaria\s+(?:aberta|fechada|delivery|perto de|em )/i.test(value))add("name",value,value,i);
   if(/^\+?(?:55\s*)?(?:\(\d{2}\)|\d{2})\s*\d{4,5}[- ]\d{4}$/.test(value))add("whatsapp",value,value,i);
   if(hasDate.test(value))continue;
   const day=norm.match(dayRow);if(!day)continue;
   const inline=hoursTail(value.slice(value.length-day[2].length)),following=day[2]?undefined:hoursTail(next),hours=inline||following;
   if(hours)weekly.push({day:dayIndex(day[1]),hours,line:i,evidence:value+(following?"\n"+next:"")});
  }
  if(weekly.length){
   const days=new Map<number,Set<string>>();for(const row of weekly)days.set(row.day,new Set([...(days.get(row.day)||[]),row.hours]));
   // Conflicting rows stay visible as separate alternatives, never silently last-write-wins.
   if([...days.values()].every(values=>values.size===1)){
    const rows=[...days].sort(([a],[b])=>a-b).map(([day,values])=>`${dayNames[day]}: ${[...values][0]}`);
    add("hours",rows.join("; "),weekly.map(row=>row.evidence).join("\n"),weekly[0].line);
    const last=suggestions.at(-1);if(last?.field==="hours"&&last.sourceId===page.id)last.uncertain ||= weekly.some(row=>lines[row.line].confidence!==undefined&&lines[row.line].confidence!<75||lines[row.line+1]?.confidence!==undefined&&lines[row.line+1].confidence!<75);
   }else for(const row of weekly)add("hours",`${dayNames[row.day]}: ${row.hours}`,row.evidence,row.line);
  }
 }
 const text=texts.join("\n\n");if(text.length>60000)throw Error("O texto ultrapassou 60 mil caracteres. Leia menos imagens por vez para manter a conferência completa.");
 return {text,suggestions};
}
