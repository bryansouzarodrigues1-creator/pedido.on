"use client";
import {useState,useEffect,useRef,type FormEvent} from "react";
import {ArrowRight,Bot,Check,MessageCircle,MapPin,Link2} from "lucide-react";
import {intakeFinished,nextOwnerIntake,ownerFieldIds,ownerQuestions,extractLocationHint,validateOwnerAnswer,ownerAnsweredCount,ownerFromStore,withOwnerAnswers,ownerVisualChoices,hasOwnerVisualBriefing,type OwnerField,type OwnerIntake} from "@/lib/owner-intake";
import {inspectMenuSourceText} from "@/lib/menu-source-links";
import {fetchMenuSource} from "@/lib/menu-source-client";
import type {IfoodImportResult} from "@/lib/ifood-import";
import {Spinner} from "./ui";

/** One missing fact at a time. External information always waits for confirmation. */
export default function OwnerIntakeChat({value,onChange,onReady,onSource,onAttach,disabled}:{
 value:OwnerIntake;onChange:(next:OwnerIntake)=>void;onReady:(vision:string)=>void;onSource?:(result:IfoodImportResult)=>void;onAttach?:()=>void;disabled?:boolean;
}){
 const [reply,setReply]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [editing,setEditing]=useState<OwnerField|null>(null),[linkEntry,setLinkEntry]=useState(false),[linkValue,setLinkValue]=useState(""),[reading,setReading]=useState(false);
 const [found,setFound]=useState<{result:IfoodImportResult;base:OwnerIntake}|null>(null);
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const finished=intakeFinished(value),hint=value.step===1?extractLocationHint(value.initialMessage):undefined;
 const blocked=disabled||reading||!!found,field=editing||ownerFieldIds[value.step],count=ownerAnsweredCount(value);
 function acceptAnswer(answer:string){
  const result=nextOwnerIntake(value,answer);if(result.error){setError(result.error);return;}
  setError("");setReply("");onChange(result.state);
 }
 async function lookup(url:string,base:OwnerIntake){
  if(blocked)return;setReading(true);setError("");setNotice("");
  try{
   const result=await fetchMenuSource(url);if(!alive.current)return;
   onSource?.(result);setLinkEntry(false);setLinkValue("");setReply("");
   if(result.store)setFound({result,base});
   else{onChange(ownerFromStore(base,url));setNotice("O link ficou guardado, mas não trouxe nome, endereço ou horários verificáveis. Vou perguntar só os dados que faltam; os produtos podem vir de texto, arquivo ou prints.");}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não consegui consultar o link agora. Você pode continuar preenchendo os dados.");}
  finally{if(alive.current)setReading(false);}
 }
 function submit(e:FormEvent){
  e.preventDefault();if(blocked||(finished&&!editing&&!linkEntry))return;
  const current=(linkEntry?linkValue:reply).trim();
  if(!current){setError("Escreva uma resposta ou escolha uma das opções.");return;}
  if(editing){
   const checked=validateOwnerAnswer(editing,current);if(checked.error){setError(checked.error);return;}
   onChange(withOwnerAnswers(value,{[editing]:checked.value}));setEditing(null);setReply("");setError("");return;
  }
  const links=inspectMenuSourceText(current).links;
  if(linkEntry||links.length){
   if(links.length!==1){setError("Cole o link completo de uma única loja no iFood.");return;}
   let base=value;
   // A detailed first message may already contain explicit answers alongside its URL.
   const initial=linkEntry?reply:current;
   if(value.step===0&&initial.trim()){
    const parsed=nextOwnerIntake(value,initial);if(!parsed.error)base=parsed.state;
   }
   void lookup(links[0].url,base);return;
  }
  acceptAnswer(current);
 }
 function keepSource(useFacts:boolean){
  if(!found)return;onChange(ownerFromStore(found.base,found.result.url,useFacts?found.result.store:{}));
  setNotice(useFacts?"Dados do link confirmados. Vou perguntar apenas o que falta.":"Link guardado. Preencha os dados que quiser usar na sua pizzaria.");setFound(null);
 }
 function attach(){if(blocked)return;onChange(withOwnerAnswers(value,{menu:""}));onAttach?.();}
 return <div className="owner-intake" aria-label="Conversa para criar sua pizzaria">
  <div className="owner-intake-title"><MessageCircle size={19}/><div><strong>Vamos preparar sua pizzaria juntos.</strong><small>Seu cardápio, do seu jeito. Pergunto só o que falta.</small></div></div>
  <div className="owner-intake-progress" aria-label={`${count} de 5 informações organizadas`}><span style={{width:`${count/5*100}%`}}/></div>
  {value.answers.menu===undefined&&!editing&&!linkEntry&&!found&&<div className="owner-start-options"><button type="button" disabled={blocked} onClick={()=>{setLinkEntry(true);setError("");}}><Link2 size={16}/>Tenho um link do iFood</button>{value.step===0&&<button type="button" disabled={blocked} onClick={()=>onChange(withOwnerAnswers(value,{menu:""}))}>Ainda não tenho cardápio</button>}</div>}
  <div className="owner-intake-history" aria-live="polite">
   {count>0&&<details className="owner-known"><summary>{count} informações já organizadas · conferir ou editar</summary>{ownerFieldIds.map(id=>value.answers[id]!==undefined?<div key={id} className="owner-intake-answer"><Check size={15}/><div><small>{({name:"Nome",address:"Endereço",whatsapp:"WhatsApp",hours:"Horários",menu:"Cardápio"})[id]}</small><span>{value.answers[id]||"Vou preencher depois."}</span></div><button type="button" className="owner-intake-edit" disabled={blocked} aria-label={"Alterar "+id} onClick={()=>{setEditing(id);setReply(value.answers[id]||"");setError("");}}>Editar</button></div>:null)}</details>}
   {!found&&!reading&&(!finished||editing)&&!linkEntry&&<p className="owner-intake-question"><Bot size={16} aria-hidden="true"/><span>{ownerQuestions[editing?ownerFieldIds.indexOf(editing):value.step]}</span></p>}
   {hint&&<p className="owner-intake-hint"><MapPin size={15}/>Você mencionou: {hint}. Confirme ou complete o endereço.</p>}
   {found&&<section className="owner-source-confirm" aria-label="Confira os dados encontrados no link"><h3>Encontrei estes dados no link</h3><p>Confira se são da sua loja. Os dados que você já informou serão mantidos.</p><dl>{([['name','Nome'],['address','Endereço'],['hours','Horários'],['telephone','Telefone informado']] as const).map(([key,label])=>found.result.store?.[key]?<div key={key}><dt>{label}</dt><dd>{found.result.store[key]}</dd></div>:null)}</dl><small>O telefone só será usado como WhatsApp se você confirmar na próxima pergunta.</small><div><button type="button" className="btn primary" onClick={()=>keepSource(true)}>Usar dados encontrados<Check size={16}/></button><button type="button" className="text-button" onClick={()=>keepSource(false)}>Prefiro preencher</button></div></section>}
   {notice&&<p className="owner-intake-hint" role="status">{notice}</p>}
   {reading&&<p className="owner-intake-hint" role="status"><Spinner/>Consultando os dados públicos da loja…</p>}
   {finished&&!editing&&!found&&<div className="owner-intake-done" role="status"><Check size={18}/><div><strong>Informações organizadas!</strong><p>Os dados confirmados entram na prévia. Você poderá editar tudo antes de publicar.</p></div></div>}
  </div>
  {(!finished||editing||linkEntry)&&!found?<form className="owner-intake-reply" onSubmit={submit}>
   <label htmlFor="owner-intake-message">{linkEntry?"Link da loja no iFood":editing?"Corrigir informação":"Sua resposta"}</label>
   <textarea id="owner-intake-message" rows={value.step===0?3:2} maxLength={linkEntry?2048:field==="name"?1600:field==="menu"?2000:300} value={linkEntry?linkValue:reply} onChange={e=>{linkEntry?setLinkValue(e.target.value):setReply(e.target.value);setError("");}}
    placeholder={linkEntry?"https://www.ifood.com.br/delivery/…":["Ex.: Minha pizzaria se chama Forno Azul. Quero amarelo de queijo e azul do mar.","Rua, número, bairro, cidade e estado","WhatsApp com DDD","Dias da semana e horários","Link do iFood ou do cardápio"][editing?ownerFieldIds.indexOf(editing):value.step]} disabled={blocked}/>
   {!editing&&!linkEntry&&!reading&&<div className="owner-quick-options" aria-label="Opções de resposta">
    {field==="whatsapp"&&value.source?.telephone&&<button type="button" disabled={blocked} onClick={()=>acceptAnswer(value.source!.telephone!)}>Usar {value.source.telephone} como WhatsApp</button>}
    {field==="hours"&&<><button type="button" disabled={blocked} onClick={()=>acceptAnswer("Terça a domingo, das 18h às 23h")}>Terça a domingo · 18h–23h</button><button type="button" disabled={blocked} onClick={()=>acceptAnswer("Todos os dias, das 18h às 00h")}>Todos os dias · 18h–00h</button></>}
    {field==="menu"&&<button type="button" disabled={blocked} onClick={attach}>Enviar foto ou arquivo</button>}
    {field!=="name"&&<button type="button" disabled={blocked} onClick={()=>acceptAnswer("depois")}>{field==="menu"?"Cadastrar produtos depois":"Preencher depois"}</button>}
   </div>}
   {error&&<p className="owner-intake-error" role="alert">{error}</p>}
   <div className="owner-intake-controls"><small>{editing?"As outras respostas serão preservadas.":linkEntry?"Os dados encontrados precisam da sua confirmação.":field==="name"?"Se já souber endereço e horários, pode contar tudo nesta resposta.":"Escreva sua resposta ou escolha uma opção."}</small><button type="submit" className="btn primary" disabled={blocked||!(linkEntry?linkValue:reply).trim()}>{reading?"Consultando…":linkEntry?"Consultar loja":editing?"Salvar":"Enviar"}<ArrowRight size={17}/></button></div>
   {linkEntry&&<button type="button" className="text-button" disabled={reading} onClick={()=>setLinkEntry(false)}>Continuar sem consultar o link</button>}
  </form>:!found&&<div className="owner-intake-ready">{!hasOwnerVisualBriefing(value)&&<div className="owner-visual-choice"><strong>Que visual combina com sua pizzaria?</strong><div className="owner-quick-options">{ownerVisualChoices.map(choice=><button type="button" key={choice.id} aria-pressed={value.visualChoice===choice.id} disabled={disabled} onClick={()=>onChange({...value,visualChoice:choice.id})}>{choice.label}</button>)}</div></div>}<button className="btn primary" type="button" onClick={()=>onReady(value.initialMessage)} disabled={disabled}>Ver meus 12 modelos personalizados<ArrowRight size={17}/></button><small>Confira como sua pizzaria vai aparecer para os clientes.</small></div>}
 </div>;
}
