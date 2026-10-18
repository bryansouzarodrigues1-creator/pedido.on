"use client";
import {useState,useEffect,useRef,type FormEvent} from "react";
import {ArrowRight,Bot,Check,MessageCircle,MapPin,Link2,Paperclip,ExternalLink} from "lucide-react";
import {intakeFinished,nextOwnerIntake,ownerFieldIds,ownerQuestions,extractLocationHint,validateOwnerAnswer,ownerAnsweredCount,ownerFromStore,withOwnerAnswers,ownerReadyForPreview,ownerVisualChoices,hasOwnerVisualBriefing,type OwnerField,type OwnerIntake} from "@/lib/owner-intake";
import {inspectMenuSourceText} from "@/lib/menu-source-links";
import {fetchMenuSource} from "@/lib/menu-source-client";
import type {IfoodImportResult} from "@/lib/ifood-import";
import {Spinner} from "./ui";

/** One composer accepts a visual idea, clipboard data and a public store URL. */
export default function OwnerIntakeChat({value,onChange,onReady,onSource,onAttach,onText,sourceSuggestion,disabled}:{
 value:OwnerIntake;onChange:(next:OwnerIntake)=>void;onReady:(next:OwnerIntake)=>void;onSource?:(result:IfoodImportResult)=>void;onAttach?:()=>void;onText?:(text:string)=>boolean;sourceSuggestion?:IfoodImportResult|null;disabled?:boolean;
}){
 const [reply,setReply]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [editing,setEditing]=useState<OwnerField|null>(null),[linkHint,setLinkHint]=useState(false),[reading,setReading]=useState(false);
 const [found,setFound]=useState<{result:IfoodImportResult;base:OwnerIntake}|null>(null);
 const input=useRef<HTMLTextAreaElement|null>(null),alive=useRef(true);
 const [blockedSource,setBlockedSource]=useState<string|null>(null);
 const seenSuggestion=useRef<IfoodImportResult|null>(null);
 useEffect(()=>{if(sourceSuggestion?.store&&sourceSuggestion!==seenSuggestion.current){seenSuggestion.current=sourceSuggestion;setFound({result:sourceSuggestion,base:value});}},[sourceSuggestion,value]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const finished=intakeFinished(value),hint=value.step===1?extractLocationHint(value.initialMessage):undefined;
 const blocked=disabled||reading||!!found,field=editing||ownerFieldIds[value.step],count=ownerAnsweredCount(value);
 const first=!value.initialMessage&&!value.answers.name&&!value.source&&!editing;
 function acceptAnswer(answer:string){
  const result=nextOwnerIntake(value,answer);if(result.error){setError(result.error);return;}
  const hasProducts=onText?.(answer);
  const next=hasProducts&&result.state.answers.menu===undefined?withOwnerAnswers(result.state,{menu:""}):result.state;
  setError("");setReply("");setLinkHint(false);onChange(next);
  setNotice(next.step===0&&next.initialMessage?"Sua ideia ficou guardada. Como se chama a pizzaria?":"");
 }
 async function lookup(url:string,base:OwnerIntake){
  if(blocked)return;setReading(true);setError("");setNotice("");
  try{
   const result=await fetchMenuSource(url);if(!alive.current)return;
   onSource?.(result);setReply("");setLinkHint(false);setBlockedSource(null);
   if(result.store)setFound({result,base});
   else{onChange(ownerFromStore(base,url));if(!result.count)setBlockedSource(url);else setNotice(`${result.count} produtos encontrados. Continue com os dados que faltam.`);}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não consegui consultar o link agora. Tente novamente ou continue pela sua ideia.");}
  finally{if(alive.current)setReading(false);}
 }
 function submit(e:FormEvent){
  e.preventDefault();if(blocked||(finished&&!editing))return;
  const current=reply.trim();if(!current){setError("Escreva sua ideia, cole um link ou escolha uma opção.");return;}
  if(editing){
   if(editing==="menu"&&onText?.(current)){onChange(withOwnerAnswers(value,{menu:value.answers.menu||""}));setEditing(null);setReply("");setError("");return;}
   const checked=validateOwnerAnswer(editing,current);if(checked.error){setError(checked.error);return;}
   onChange(withOwnerAnswers(value,{[editing]:checked.value}));setEditing(null);setReply("");setError("");return;
  }
  const source=inspectMenuSourceText(current);
  if(source.status==="multiple"){setError("Consulte o link de uma loja por vez. Sua mensagem continua aqui.");return;}
  if(source.links.length===1){
   let base=value;
   if(value.step===0){const parsed=nextOwnerIntake(value,current);if(!parsed.error)base=parsed.state;}
   onText?.(current);void lookup(source.links[0].url,base);return;
  }
  if(source.status==="unsupported"&&!source.menuText){setError("Esse endereço não é um link completo de loja no iFood. Você também pode colar os produtos com preços ou enviar uma foto.");return;}
  acceptAnswer(current);
 }
 function keepSource(useFacts:boolean){
  if(!found)return;onChange(ownerFromStore(found.base,found.result.url,useFacts?found.result.store:{}));
  setNotice(useFacts?"Dados do link confirmados. Vou perguntar apenas o que falta.":"Link guardado. Use os dados que quiser na sua pizzaria.");setFound(null);
 }
 function previewNow(){
  if(blocked)return;const next=ownerReadyForPreview(value);if(!intakeFinished(next))return;
  if(next!==value)onChange(next);onReady(next);
 }
 function attach(){if(blocked)return;onAttach?.();}
 return <div className="owner-intake owner-intake--composer" aria-label="Conversa para criar sua pizzaria">
  <div className="owner-intake-title"><MessageCircle size={20}/><div><strong>Como você quer seu cardápio?</strong><small>Escreva sua ideia ou traga o cardápio que já usa. Pergunto só o que falta.</small></div></div>
  {count>0&&!first&&<div className="owner-intake-progress" aria-label={`${count} de 5 informações organizadas`}><span style={{width:`${count/5*100}%`}}/></div>}
  <div className="owner-intake-history" aria-live="polite">
   {count>0&&!first&&<details className="owner-known"><summary>Dados já informados</summary>{ownerFieldIds.map(id=>value.answers[id]!==undefined?<div key={id} className="owner-intake-answer"><Check size={15}/><div><small>{({name:"Nome",address:"Endereço",whatsapp:"WhatsApp",hours:"Horários",menu:"Cardápio"})[id]}</small><span>{value.answers[id]||"Vou preencher depois."}</span></div><button type="button" className="owner-intake-edit" disabled={blocked} aria-label={"Alterar "+id} onClick={()=>{setEditing(id);setReply(value.answers[id]||"");setError("");}}>Editar</button></div>:null)}</details>}
   {!first&&!found&&!reading&&(!finished||editing)&&<p className="owner-intake-question"><Bot size={16} aria-hidden="true"/><span>{value.step===0&&!editing?"Qual é o nome da pizzaria?":ownerQuestions[editing?ownerFieldIds.indexOf(editing):value.step]}</span></p>}
   {hint&&<p className="owner-intake-hint"><MapPin size={15}/>Você mencionou: {hint}. Confirme ou complete o endereço.</p>}
   {found&&<section className="owner-source-confirm" aria-label="Confira os dados encontrados no link"><h3>Encontrei estes dados no link</h3><p>Confira se são da sua loja. Os dados que você já informou serão mantidos.</p><dl>{([['name','Nome'],['address','Endereço'],['hours','Horários'],['telephone','Telefone informado']] as const).map(([key,label])=>found.result.store?.[key]?<div key={key}><dt>{label}</dt><dd>{found.result.store[key]}</dd></div>:null)}</dl><small>O telefone só será usado como WhatsApp se você confirmar.</small><div><button type="button" className="btn primary" onClick={()=>keepSource(true)}>Usar dados encontrados<Check size={16}/></button><button type="button" className="text-button" onClick={()=>keepSource(false)}>Prefiro preencher</button></div></section>}
   {notice&&<p className="owner-intake-hint" role="status">{notice}</p>}
   {blockedSource&&<aside className="owner-source-fallback" aria-label="Trazer o cardápio do iFood"><strong>O iFood não liberou os produtos por esse link.</strong><p>Abra sua loja e traga o cardápio como PDF, foto ou texto. Sua ideia continua aqui.</p><div><a href={blockedSource} target="_blank" rel="noopener noreferrer">Abrir loja no iFood<ExternalLink size={15}/></a><button type="button" disabled={blocked} onClick={attach}><Paperclip size={15}/>Enviar PDF ou foto</button><button type="button" disabled={blocked} onClick={()=>{setLinkHint(false);setEditing("menu");input.current?.focus();}}>Colar produtos</button></div><details><summary>Como trazer os produtos?</summary><p>No computador: abra a loja, expanda as categorias e use Imprimir → Salvar como PDF. Também pode salvar a página em HTML ou copiar os nomes e preços. No celular, envie prints ou um PDF do cardápio.</p></details></aside>}
   {reading&&<p className="owner-intake-hint" role="status"><Spinner/>Consultando os dados públicos da loja…</p>}
   {finished&&!editing&&!found&&<div className="owner-intake-done" role="status"><Check size={18}/><div><strong>Já podemos montar sua prévia.</strong><p>Você poderá ajustar o visual e completar os dados antes de publicar.</p></div></div>}
  </div>
  {(!finished||editing)?<form className="owner-intake-reply" onSubmit={submit}>
   <label htmlFor="owner-intake-message">{editing==="menu"?"Cole os produtos com preços":editing?"Corrigir informação":first?"Sua ideia, link ou cardápio":({name:"Nome da pizzaria",address:"Endereço da pizzaria",whatsapp:"WhatsApp de pedidos",hours:"Dias e horários",menu:"Seu cardápio atual"})[field]}</label>
   <textarea ref={input} id="owner-intake-message" rows={first?6:3} maxLength={field==="name"?6000:field==="menu"?6000:600} value={reply}
    onChange={e=>{setReply(e.target.value);setError("");}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}
    placeholder={linkHint?"Cole o link do iFood aqui. Sua ideia pode continuar na mesma mensagem.":first?"Ex.: Minha pizzaria se chama Forno Azul. Quero azul do mar, amarelo de queijo, fotos grandes e um visual artesanal.\n\nJá tem cardápio? Cole o link ou os produtos com preços aqui.":["Nome da pizzaria","Rua, número, bairro, cidade e estado","WhatsApp com DDD","Dias da semana e horários","Link do iFood ou produtos com preços"][editing?ownerFieldIds.indexOf(editing):value.step]} disabled={blocked} aria-invalid={!!error} aria-describedby={error?"owner-composer-error":linkHint?"owner-link-hint":undefined}/>
   {!editing&&!reading&&!found&&<div className="owner-start-options"><button type="button" disabled={blocked} onClick={()=>{setLinkHint(true);setError("");input.current?.focus();}}><Link2 size={16}/>Tenho um link do iFood</button><button type="button" disabled={blocked} onClick={attach}><Paperclip size={16}/>Enviar PDF, foto ou TXT</button>{value.step===0&&value.answers.menu===undefined&&<button type="button" disabled={blocked} onClick={()=>onChange(withOwnerAnswers(value,{menu:""}))}>Ainda não tenho cardápio</button>}</div>}
   {linkHint&&!reading&&!found&&<small className="owner-link-hint" id="owner-link-hint">Pode colar o link neste mesmo campo. Não precisa começar de novo.</small>}
   {!editing&&!reading&&!found&&<div className="owner-quick-options" aria-label="Opções de resposta">
    {field==="whatsapp"&&value.source?.telephone&&<button type="button" disabled={blocked} onClick={()=>acceptAnswer(value.source!.telephone!)}>Usar {value.source.telephone} como WhatsApp</button>}
    {field==="hours"&&<><button type="button" disabled={blocked} onClick={()=>acceptAnswer("Terça a domingo, das 18h às 23h")}>Terça a domingo · 18h–23h</button><button type="button" disabled={blocked} onClick={()=>acceptAnswer("Todos os dias, das 18h às 00h")}>Todos os dias · 18h–00h</button></>}
    {field==="menu"&&<button type="button" disabled={blocked} onClick={attach}>Enviar foto ou arquivo</button>}
    {field!=="name"&&<button type="button" disabled={blocked} onClick={()=>acceptAnswer("depois")}>{field==="menu"?"Cadastrar produtos depois":"Preencher depois"}</button>}
   </div>}
   {error&&<p className="owner-intake-error" id="owner-composer-error" role="alert">{error}</p>}
   <div className="owner-intake-controls"><small>{editing?"As outras respostas serão preservadas.":first?"Pode escrever naturalmente ou colar uma tabela.":"Você pode completar os outros dados depois."}</small><button type="submit" className="btn primary" disabled={blocked||!reply.trim()}>{reading?"Consultando…":editing?"Salvar":first?"Preparar meu cardápio":field==="name"?"Usar este nome":field==="menu"?"Ler cardápio":"Salvar e continuar"}<ArrowRight size={17}/></button></div>
   {!!value.answers.name&&!editing&&!found&&!reading&&!reply.trim()&&<button type="button" className="owner-preview-shortcut" disabled={blocked} onClick={previewNow}>Ver prévia agora e completar depois<ArrowRight size={16}/></button>}
  </form>:!found&&<div className="owner-intake-ready">{!hasOwnerVisualBriefing(value)&&<div className="owner-visual-choice"><strong>Que visual combina com sua pizzaria?</strong><div className="owner-quick-options">{ownerVisualChoices.map(choice=><button type="button" key={choice.id} aria-pressed={value.visualChoice===choice.id} disabled={disabled} onClick={()=>onChange({...value,visualChoice:choice.id})}>{choice.label}</button>)}</div></div>}<button className="btn primary" type="button" onClick={previewNow} disabled={disabled}>Criar minha prévia<ArrowRight size={17}/></button><small>Confira o cardápio antes de criar sua conta.</small></div>}
 </div>;
}
