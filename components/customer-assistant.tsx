"use client";
import {useState,useEffect,useRef,type FormEvent} from "react";
import {MessageCircle,Send,Sparkles,ArrowUpRight,RotateCcw} from "lucide-react";
import {money,phoneNumber,type RestaurantData} from "@/lib/domain";
import {localCustomerAnswer,type CustomerAnswer} from "@/lib/customer-assistant-policy";
import {Modal,Spinner} from "./ui";
type Turn={id:string;question:string;answer:CustomerAnswer;createdAt?:string};
type Session={id:string;token:string;expiresAt:number;pending?:{message:string;requestId:string}};
function newSession():Session{return {id:crypto.randomUUID(),token:[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,"0")).join(""),expiresAt:Date.now()+29*86400000};}
export default function CustomerAssistant({data,slug,preview=false,onProduct}:{data:RestaurantData;slug:string;preview?:boolean;onProduct?:(id:string)=>void}){
 const [open,setOpen]=useState(false),[message,setMessage]=useState(""),[turns,setTurns]=useState<Turn[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[memoryOnly,setMemoryOnly]=useState(false);
 const session=useRef<Session|null>(null),end=useRef<HTMLDivElement>(null),loaded=useRef(false),live=useRef(true);
 const storageKey="pizzaria-on:customer-assistant:v1:"+slug;
 function remember(){if(preview)return;try{localStorage.setItem(storageKey,JSON.stringify(session.current));}catch{setMemoryOnly(true);}}
 function current(){if(!session.current){if(preview){session.current=newSession();return session.current;}try{const value=JSON.parse(localStorage.getItem(storageKey)||"null");if(value&&/^[a-f0-9-]{36}$/.test(value.id)&&/^[a-f0-9]{64}$/.test(value.token)&&value.expiresAt>Date.now())session.current=value;}catch{setMemoryOnly(true);}session.current??=newSession();remember();}return session.current;}
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(!open||preview||loaded.current)return;loaded.current=true;setLoading(true);const value=current();void fetch(`/api/menu/${encodeURIComponent(slug)}/assistant`,{cache:"no-store",headers:{"x-assistant-conversation":value.id,"x-assistant-token":value.token},signal:AbortSignal.timeout(15000)}).then(async res=>{const body=await res.json() as {error?:string;turns?:Turn[]};if(!res.ok)throw Error(body.error||"Não foi possível abrir o atendimento.");if(live.current)setTurns(body.turns||[]);}).catch(e=>{if(live.current)setError(e instanceof Error?e.message:"Confira sua conexão.");}).finally(()=>{if(live.current)setLoading(false);});},[open,preview,slug]);
 useEffect(()=>{if(open)end.current?.scrollIntoView({block:"nearest",behavior:"smooth"});},[turns,busy,open]);
 async function send(text:string,retry=false){
  if(busy||loading||!text.trim())return;setError("");
  const value=current();if(value.pending&&!retry){setError("Confira a resposta da pergunta anterior antes de enviar outra.");return;}
  const pending=retry&&value.pending?value.pending:{message:text.trim(),requestId:crypto.randomUUID()};value.pending=pending;remember();setBusy(true);
  try{
   let turn:Turn;
   if(preview){const answer=localCustomerAnswer(data,pending.message,true)||{text:"Na conversa real, a IA interpreta perguntas mais abertas usando os dados publicados da sua loja. Esta prévia demonstra os fatos conhecidos, sem consumir créditos.",source:"local" as const,handoff:false,products:[]};turn={id:pending.requestId,question:pending.message,answer};}
   else{const res=await fetch(`/api/menu/${encodeURIComponent(slug)}/assistant`,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversationId:value.id,token:value.token,...pending}),signal:AbortSignal.timeout(65000)}),body=await res.json() as Turn&{error?:string};if(!res.ok)throw Error(body.error||"A resposta não foi confirmada. Confira antes de tentar novamente.");turn=body;}
   if(live.current){setTurns(old=>old.some(t=>t.id===turn.id)?old:[...old,turn]);setMessage("");}delete value.pending;remember();
  }catch(e){if(live.current)setError(e instanceof Error?e.message:"A conexão caiu. Confira a resposta antes de repetir.");}finally{if(live.current)setBusy(false);}
 }
 function submit(event:FormEvent){event.preventDefault();void send(message);}
 function restart(){if(busy)return;session.current=newSession();remember();setTurns([]);setError("");setMessage("");}
 const phone=phoneNumber(data.whatsapp),contact=/^[1-9]\d{9,14}$/.test(phone)?"https://wa.me/"+phone:undefined;
 return <><button type="button" className={preview?"btn outline assistant-preview-button":"customer-assistant-launch"} onClick={()=>setOpen(true)}><MessageCircle size={20}/><span>{preview?"Experimentar sem gastar créditos":"Dúvidas? Fale com a IA"}</span>{!preview&&<Sparkles size={15}/>}</button>
  <Modal open={open} onClose={()=>setOpen(false)} title={data.assistant.name}><div className="customer-assistant-chat">
   <div className="assistant-shop-line"><span><Sparkles size={16}/>Assistente de IA · {data.name}</span>{preview&&<b>PRÉVIA</b>}</div>
   <p className="assistant-privacy">Esta conversa pode ser vista pela pizzaria por até 30 dias. Não envie senhas, documentos ou comprovantes. O pedido é feito pelo cardápio.</p>
   <div className="assistant-transcript" role="log" aria-label="Conversa com o assistente" aria-live="polite">
    <div className="assistant-bubble">{data.assistant.greeting}</div>
    {turns.map(turn=><div className="assistant-turn" key={turn.id}><div className="assistant-question">{turn.question}</div><div className="assistant-bubble"><p>{turn.answer.text}</p>{turn.answer.products.map(product=><button type="button" className="assistant-product" key={product.id} onClick={()=>{onProduct?.(product.id);setOpen(false);}}><span><b>{product.name}</b><small>{product.description}</small></span><strong>A partir de {money(product.price)}<ArrowUpRight size={15}/></strong></button>)}{turn.answer.handoff&&contact&&<a className="assistant-contact" href={contact} target="_blank" rel="noopener noreferrer">Falar com a pizzaria <ArrowUpRight size={15}/></a>}</div></div>)}
    {loading&&<p role="status"><Spinner/>Abrindo a conversa…</p>}{busy&&<div className="assistant-bubble" role="status"><Spinner/>Conferindo as informações da loja…</div>}<div ref={end}/>
   </div>
   {!turns.length&&<div className="assistant-quick-questions">{["Como faço meu pedido?","Qual o horário?","Quanto custa a entrega?","Quais as promoções?"].map(text=><button type="button" disabled={busy||loading} key={text} onClick={()=>void send(text)}>{text}</button>)}</div>}
   {error&&<p className="field-error" role="alert">{error}</p>}{session.current?.pending&&!busy&&<button className="text-button" type="button" onClick={()=>void send(session.current!.pending!.message,true)}>Conferir resposta anterior</button>}
   <form className="assistant-composer" onSubmit={submit}><label className="sr-only" htmlFor={preview?"assistant-preview-message":"assistant-message"}>Sua pergunta para a pizzaria</label><input id={preview?"assistant-preview-message":"assistant-message"} autoComplete="off" maxLength={700} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Pergunte sobre sabores, entrega…" disabled={busy||loading}/><button type="submit" className="btn primary" disabled={busy||loading||!message.trim()} aria-label="Enviar pergunta">{busy?<Spinner/>:<Send size={19}/>}</button></form>
   <div className="assistant-chat-footer"><button className="text-button" type="button" disabled={busy} onClick={restart}><RotateCcw size={13}/>Nova conversa</button>{contact&&<a href={contact} target="_blank" rel="noopener noreferrer">Falar com a loja <ArrowUpRight size={13}/></a>}</div>{memoryOnly&&<small>A conversa fica aberta nesta página. Este navegador não permitiu guardar o acesso para depois.</small>}
  </div></Modal>
 </>;
}
