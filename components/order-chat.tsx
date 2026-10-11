"use client";
import {useEffect,useState,type FormEvent} from "react";
import {MessageCircle,Send} from "lucide-react";
import {CHAT_POLL_MS} from "@/lib/order-chat-policy";
type Message={id:string;sender:string;body:string;createdAt:string};
export default function OrderChat({orderId,restaurantId,token,closed=false}:{orderId:string;restaurantId?:string;token?:string|null;closed?:boolean}){
 const [messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(""),[error,setError]=useState(""),[sending,setSending]=useState(false);
 const owner=!!restaurantId;
 const endpoint=owner?`/api/restaurants/${restaurantId}/orders/${orderId}/messages`:`/api/orders/${orderId}/messages`;
 useEffect(()=>{if(!owner&&!token)return;let active=true;
  async function refresh(){try{if(document.visibilityState!=="visible")return;
   const response=await fetch(endpoint,{headers:owner?{}:{"x-pedido-order-token":token!},cache:"no-store"});
   if(!response.ok)throw Error("Não foi possível atualizar a conversa.");
   const result=await response.json() as {messages:Message[]};if(active){setMessages(result.messages);setError("");}
  }catch(e){if(active)setError(e instanceof Error?e.message:"Falha de conexão.");}}
  refresh();const timer=setInterval(refresh,CHAT_POLL_MS);
  const onVisible=()=>{if(document.visibilityState==="visible")refresh();};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);};
 },[orderId,endpoint,owner,token]);
 async function send(e:FormEvent){e.preventDefault();if(!text.trim()||sending||closed)return;setSending(true);setError("");
  try{
   const csrf=owner?await fetch("/api/auth/config",{cache:"no-store"}).then(r=>r.json() as Promise<{csrf:string}>).then(v=>v.csrf):"";
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",...(owner?{"x-pedido-csrf":csrf}:{"x-pedido-order-token":token||""})},body:JSON.stringify({text:text.trim()})});
   const result=await response.json() as {message?:Message;error?:string};if(!response.ok||!result.message)throw Error(result.error||"Não foi possível enviar.");
   setMessages(old=>old.some(m=>m.id===result.message!.id)?old:[...old,result.message!]);setText("");
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível enviar.");}finally{setSending(false);}
 }
 return <section className="order-chat" aria-label="Conversa sobre o pedido">
  <div className="order-chat-heading"><MessageCircle size={19}/><div><strong>Conversa do pedido</strong><small>Direto com {owner?"o cliente":"a pizzaria"}, sem sair do pedido.</small></div></div>
  <div className="order-chat-messages" role="log" aria-live="polite">
   {messages.length===0?<p className="order-chat-empty">Nenhuma mensagem ainda. Escreva para começar.</p>:messages.map(m=><div key={m.id} className={`order-chat-bubble ${m.sender===(owner?"restaurant":"customer")?"mine":"other"}`}><p>{m.body}</p><small>{m.sender==="restaurant"?"Pizzaria":"Cliente"} · {new Date(m.createdAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small></div>)}
  </div>
  {error&&<p role="alert" className="field-error">{error}</p>}
  {closed?<p className="order-chat-closed">Este pedido foi encerrado. Para continuar, use o WhatsApp.</p>:<form onSubmit={send} className="order-chat-form"><input aria-label="Mensagem" value={text} onChange={e=>setText(e.target.value)} maxLength={1000} placeholder="Escreva sua mensagem..." disabled={sending}/><button className="btn primary small" disabled={sending||!text.trim()} type="submit"><Send size={16}/> Enviar</button></form>}
 </section>;
}
