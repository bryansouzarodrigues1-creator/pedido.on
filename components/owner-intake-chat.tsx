"use client";
import {useState,type FormEvent} from "react";
import {ArrowRight,Bot,Check,MessageCircle,MapPin} from "lucide-react";
import {emptyOwnerIntake,intakeFinished,nextOwnerIntake,ownerFieldIds,ownerQuestions,extractLocationHint,type OwnerIntake} from "@/lib/owner-intake";

/** Structured chat: one short question at a time, no billing/API/image generation. */
export default function OwnerIntakeChat({value,onChange,onReady,disabled}:{
 value:OwnerIntake;onChange:(next:OwnerIntake)=>void;onReady:(vision:string)=>void;disabled?:boolean;
}){
 const [reply,setReply]=useState(""),[error,setError]=useState("");
 const finished=intakeFinished(value),hint=value.step===1?extractLocationHint(value.initialMessage):undefined;
 function submit(e:FormEvent){
  e.preventDefault();if(disabled||finished)return;
  const current=reply.trim();
  if(!current){setError("Escreva uma resposta ou digite 'depois' quando o campo for opcional.");return;}
  const result=nextOwnerIntake(value,current);
  if(result.error){setError(result.error);return;}
  setError("");setReply("");onChange(result.state);
 }
 return <div className="owner-intake" aria-label="Conversa para criar sua pizzaria">
  <div className="owner-intake-title"><MessageCircle size={19}/><div><strong>Vamos preparar sua pizzaria juntos.</strong><small>5 perguntas rápidas · nenhum crédito gasto para montar os modelos</small></div></div>
  <div className="owner-intake-progress" aria-label={`Etapa ${Math.min(value.step+1,5)} de 5`}><span style={{width:`${Math.round(value.step/5*100)}%`}}/></div>
  <div className="owner-intake-history" aria-live="polite">
   {ownerFieldIds.map((field,index)=>{
    if(index>value.step)return null;
    const answer=value.answers[field];
    return <div key={field} className="owner-intake-turn">
      <p className="owner-intake-question"><Bot size={16} aria-hidden="true"/><span>{ownerQuestions[index]}</span></p>
      {index<value.step&&<p className="owner-intake-answer"><Check size={15} aria-hidden="true"/>{answer||"Vou preencher depois."}</p>}
    </div>;
   })}
   {hint&&<p className="owner-intake-hint"><MapPin size={15}/> Você mencionou: {hint}. Confirme e complete o endereço; não vou inventar número ou localização.</p>}
   {finished&&<div className="owner-intake-done" role="status"><Check size={18}/><div><strong>Informações organizadas!</strong><p>Vou usar nome, endereço, WhatsApp e horários nos modelos reutilizáveis. Você ainda poderá editar tudo antes de publicar.</p></div></div>}
  </div>
  {!finished?<form className="owner-intake-reply" onSubmit={submit}>
   <label htmlFor="owner-intake-message">Sua resposta</label>
   <textarea id="owner-intake-message" rows={value.step===0?3:2} maxLength={value.step===0?1600:value.step===4?2000:300} value={reply} onChange={e=>{setReply(e.target.value);setError("");}}
    placeholder={["Ex.: O nome dela é Pizzaria Della Mama, fica em Tucuns, Búzios. Quero amarelo e vermelho.",
      "Ex.: Rua Guilhermina, 120, Tucuns, Armação dos Búzios - RJ",
      "Ex.: (22) 99999-9999", "Ex.: terça a domingo, 18h às 23h",
      "https://www.ifood.com.br/... ou depois"][value.step]} disabled={disabled}/>
   {error&&<p className="owner-intake-error" role="alert">{error}</p>}
   <div className="owner-intake-controls"><small>{value.step===0?"Pode falar naturalmente. Vou separar nome do restante do texto.":"Se não souber, escreva “depois” e complete pelo painel."}</small><button type="submit" className="btn primary" disabled={disabled||!reply.trim()}>Enviar <ArrowRight size={17}/></button></div>
  </form>:<div className="owner-intake-ready"><button className="btn primary" type="button" onClick={()=>onReady(value.initialMessage)} disabled={disabled}>Ver meus 12 modelos personalizados <ArrowRight size={17}/></button><small>Fotos de pizza reaproveitadas; todos os textos são editáveis na interface.</small></div>}
 </div>;
}
