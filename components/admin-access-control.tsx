"use client";
import {useState} from "react";
import {ShieldCheck,Loader2} from "lucide-react";
type Access={mode:"normal"|"grant"|"suspended";plan:"essencial"|"profissional"|"rede"|null;expiresAt:number|null;version:number;reason:string;updatedAt:string|null};
type History={action:string;plan:string|null;expiresAt:number|null;reason:string;createdAt:string};
type Api={access?:Access;history?:History[];error?:string};
export default function AdminAccessControl({restaurantId}:{restaurantId:string}){
 const [open,setOpen]=useState(false),[loaded,setLoaded]=useState(false),[access,setAccess]=useState<Access|null>(null),[history,setHistory]=useState<History[]>([]);
 const [choice,setChoice]=useState("normal"),[duration,setDuration]=useState("30"),[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function load(){
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/admin/access?restaurantId="+encodeURIComponent(restaurantId),{cache:"no-store"});
   const data=await res.json() as Api;if(!res.ok||!data.access)throw Error(data.error||"Não foi possível consultar o acesso.");
   setAccess(data.access);setHistory(data.history||[]);setChoice(data.access.mode==="grant"?data.access.plan||"profissional":data.access.mode);
   setLoaded(true);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar.");}finally{setBusy(false);}
 }
 async function save(){
  if(busy||!access)return;
  if(reason.trim().length<8){setError("Informe o motivo com pelo menos oito caracteres.");return;}
  if(choice==="suspended"&&!window.confirm("Suspender o acesso comercial desta conta? Seus cardápios deixarão de aceitar novos pedidos até a reativação."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const config=await fetch("/api/auth/config",{cache:"no-store"});if(!config.ok)throw Error("Entre novamente antes de salvar.");
   const {csrf}=await config.json() as {csrf:string};
   const payload={restaurantId,mode:choice==="normal"?"normal":choice==="suspended"?"suspended":"grant",...(choice!=="normal"&&choice!=="suspended"?{plan:choice,durationDays:duration==="never"?null:Number(duration)}:{}),reason:reason.trim(),expectedVersion:access.version};
   const res=await fetch("/api/admin/access",{method:"PATCH",headers:{"Content-Type":"application/json","x-pedido-csrf":csrf},credentials:"same-origin",body:JSON.stringify(payload)});
   const result=await res.json() as Api;if(!res.ok)throw Error(result.error||"Não foi possível salvar.");
   setReason("");setNotice("Acesso atualizado. Histórico registrado.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.");}finally{setBusy(false);}
 }
 const label=access?.mode==="suspended"?"Suspenso":access?.mode==="grant"?`Cortesia ${access.plan==="profissional"?"Pro":access.plan==="rede"?"Rede":"Essencial"}`:"Padrão";
 return <details className="admin-special-access" onToggle={e=>{const next=e.currentTarget.open;setOpen(next);if(next&&!loaded&&!busy)void load();}}>
  <summary><ShieldCheck size={16}/> Gerenciar plano e acesso {access&&<small>· {label}</small>}</summary>
  {open&&<div className="admin-access-form">
   {busy&&!loaded?<p>Carregando acesso...</p>:<>
    <p className="admin-muted">Uma decisão por conta. A cortesia não gera cobrança nem altera pagamentos anteriores. A suspensão bloqueia novos pedidos, preservando dados e histórico.</p>
    <label>Situação<select value={choice} onChange={e=>setChoice(e.target.value)} disabled={busy}>
     <option value="normal">Padrão — seguir assinatura e trial</option>
     <option value="profissional">Liberar Pro (cortesia)</option>
     <option value="rede">Liberar Rede (cortesia)</option>
     <option value="essencial">Liberar Essencial (cortesia)</option>
     <option value="suspended">Suspender acesso comercial</option>
    </select></label>
    {!["normal","suspended"].includes(choice)&&<label>Prazo da cortesia<select value={duration} onChange={e=>setDuration(e.target.value)} disabled={busy}>
      <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="never">Até revogação</option>
    </select></label>}
    <label>Motivo da decisão<input value={reason} maxLength={400} onChange={e=>setReason(e.target.value)} placeholder="Ex.: teste profissional concedido pelo suporte" disabled={busy}/></label>
    {error&&<p className="field-error" role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    <button className="btn primary small" type="button" onClick={()=>void save()} disabled={busy||reason.trim().length<8}>{busy?<Loader2 size={16} className="spin"/>:null}Confirmar alteração</button>
    {history.length>0&&<details className="admin-access-history"><summary>Histórico de alterações</summary><ol>{history.map((entry,i)=><li key={entry.createdAt+i}><strong>{entry.action==="grant"?"Cortesia "+entry.plan:entry.action==="suspended"?"Suspensão":"Acesso padrão"}</strong> · {new Date(entry.createdAt).toLocaleString("pt-BR")} · {entry.reason}</li>)}</ol></details>}
   </>}
  </div>}
 </details>;
}
