"use client";
import {displayDate} from "@/lib/display-date";
import AdminStoreVerification from "./admin-store-verification";
import {useState} from "react";
import {ShieldCheck,Loader2} from "lucide-react";
type Access={tier?:string;mode:"normal"|"grant"|"suspended";plan:"essencial"|"profissional"|"rede"|null;expiresAt:number|null;version:number;reason:string;updatedAt:string|null};
type History={tier?:string;action:string;plan:string|null;expiresAt:number|null;reason:string;createdAt:string};
type Api={currentTier?:"free"|"pro";access?:Access;history?:History[];error?:string};
export default function AdminAccessControl({restaurantId}:{restaurantId:string}){
 const [open,setOpen]=useState(false),[loaded,setLoaded]=useState(false),[access,setAccess]=useState<Access|null>(null),[history,setHistory]=useState<History[]>([]);
 const [choice,setChoice]=useState("free"),[currentTier,setCurrentTier]=useState("free"),[duration,setDuration]=useState("30"),[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function load(){
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/admin/access?restaurantId="+encodeURIComponent(restaurantId),{cache:"no-store"});
   const data=await res.json() as Api;if(!res.ok||!data.access)throw Error(data.error||"Não foi possível consultar o acesso.");
   setAccess(data.access);setCurrentTier(data.currentTier||"free");setHistory(data.history||[]);setChoice(data.access.mode==="suspended"?"suspended":data.access.mode==="grant"?data.access.tier==="free"?"free":"pro":data.currentTier||"free");
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
   const payload={restaurantId,mode:choice==="suspended"?"suspended":"grant",...(choice!=="suspended"?{plan:"essencial",tier:choice,durationDays:Number(duration)}:{}),reason:reason.trim(),expectedVersion:access.version};
   const res=await fetch("/api/admin/access",{method:"PATCH",headers:{"Content-Type":"application/json","x-pedido-csrf":csrf},credentials:"same-origin",body:JSON.stringify(payload)});
   const result=await res.json() as Api;if(!res.ok)throw Error(result.error||"Não foi possível salvar.");
   setReason("");setNotice("Acesso atualizado. Histórico registrado.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.");}finally{setBusy(false);}
 }
 const label=access?.mode==="suspended"?"Suspenso":access?.mode==="grant"?access.tier==="free"?"Free":"Pro":currentTier==="pro"?"Pro":"Free";
 return <><AdminStoreVerification restaurantId={restaurantId}/><details className="admin-special-access" onToggle={e=>{const next=e.currentTarget.open;setOpen(next);if(next&&!loaded&&!busy)void load();}}>
  <summary><ShieldCheck size={16}/> Gerenciar plano e acesso {access&&<small>· {label}</small>}</summary>
  {open&&<div className="admin-access-form">
   {busy&&!loaded?<p>Carregando acesso...</p>:<>
    <p className="admin-muted">Escolha Free ou Pro e o prazo. Esta liberação não cria cobranças. Suspender conta impede novos pedidos e preserva o histórico.</p>
    <label>Situação<select value={choice} onChange={e=>setChoice(e.target.value)} disabled={busy}>
     <option value="free">Free</option>
     <option value="pro">Pro</option>
     <option value="suspended">Suspender conta</option>
    </select></label>
    {choice!=="suspended"&&<label>Prazo<select value={duration} onChange={e=>setDuration(e.target.value)} disabled={busy}>
      <option value="10">10 dias</option><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option>
    </select></label>}
    {choice!=="suspended"&&<p className="field-hint">{choice==="pro"?"Pro: divulgação à vontade, criação com IA e até 20 novas imagens por semana.":"Free: cardápio e divulgação, com duas rodadas de sugestões e fotos incluídas no período."}</p>}
    <label>Motivo da decisão<input value={reason} maxLength={400} onChange={e=>setReason(e.target.value)} placeholder="Ex.: teste profissional concedido pelo suporte" disabled={busy}/></label>
    {error&&<p className="field-error" role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    <button className="btn primary small" type="button" onClick={()=>void save()} disabled={busy||reason.trim().length<8}>{busy?<Loader2 size={16} className="spin"/>:null}Confirmar alteração</button>
    {history.length>0&&<details className="admin-access-history"><summary>Histórico de alterações</summary><ol>{history.map((entry,i)=><li key={entry.createdAt+i}><strong>{entry.action==="grant"?"Plano "+(entry.tier==="free"?"Free":"Pro"):entry.action==="suspended"?"Suspensão":"Acesso padrão"}</strong> · {displayDate(entry.createdAt,true)} · {entry.reason}</li>)}</ol></details>}
   </>}
  </div>}
 </details></>;
}
