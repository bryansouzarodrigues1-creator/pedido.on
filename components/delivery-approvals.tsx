"use client";
import {asCents} from "@/lib/domain";
import {useEffect,useState} from "react";
import {MapPin,Phone,Check,Truck,X,RefreshCw} from "lucide-react";
type RequestRow={neighborhood?:string|null;deliveryFee?:number|null;id:string;phone:string;address:string;latitude:number|null;longitude:number|null;status:string;version:number;createdAt:string;expiresAt:number};
type Result={enabled:boolean;requests:RequestRow[];error?:string};
export default function DeliveryApprovals({restaurantId,defaultFee=0}:{restaurantId:string;defaultFee?:number}){
 const [enabled,setEnabled]=useState(false),[rows,setRows]=useState<RequestRow[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState("");
 const [fees,setFees]=useState<Record<string,string>>({});
 async function load(){
  const res=await fetch(`/api/restaurants/${restaurantId}/delivery-checks`,{cache:"no-store"});
  const result=await res.json() as Result;
  if(!res.ok)throw Error(result.error||"Não conseguimos consultar as solicitações.");
  setEnabled(result.enabled);setRows(result.requests);

 }
 useEffect(()=>{let active=true;
  const sync=async()=>{try{if(!active)return;await load();if(active)setError("");}catch(e){if(active)setError(e instanceof Error?e.message:"Conexão indisponível.");}};
  sync();const timer=setInterval(sync,8000);
  return()=>{active=false;clearInterval(timer);};
 },[restaurantId]);
 async function decide(row:RequestRow,action:"approve"|"reject"){
  if(busy)return;setBusy(row.id);setError("");
  try{
   if(action==="approve"&&fees[row.id]!==undefined&&!/^(?:R\$\s*)?\d+(?:[.,]\d{1,2})?$/.test(fees[row.id].trim()))throw Error("Informe uma taxa válida. Use 0 para entrega grátis.");
   const csrfResponse=await fetch("/api/auth/config",{cache:"no-store"});
   if(!csrfResponse.ok)throw Error("Entre novamente.");
   const csrf=(await csrfResponse.json() as {csrf:string}).csrf;
   const res=await fetch(`/api/restaurants/${restaurantId}/delivery-checks`,{method:"PATCH",headers:{"Content-Type":"application/json","x-pedido-csrf":csrf},body:JSON.stringify({id:row.id,version:row.version,action,...(action==="approve"?{deliveryFee:fees[row.id]===undefined?defaultFee:asCents(fees[row.id])}:{})})});
   const value=await res.json() as {error?:string};
   if(!res.ok)throw Error(value.error||"Não foi possível responder.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}
  finally{setBusy("");}
 }
 if(!enabled)return null;
 const pending=rows.filter(row=>row.status==="pending");
 if(!pending.length&&!error)return null;
 return <section className="panel-card delivery-approvals"><div className="delivery-approvals-title"><div><span className="eyebrow">CONFIRMAR ANTES DO PIX</span><h2><Truck size={21}/> Verificar locais de entrega {pending.length>0&&<b>{pending.length}</b>}</h2><p>O cliente já montou o carrinho. Confirme o endereço e a taxa antes do Pix.</p></div><button className="btn outline small" type="button" onClick={()=>load().catch(()=>setError("Não foi possível atualizar."))}><RefreshCw size={15}/>Atualizar</button></div>
  {error&&<p className="field-error" role="alert">{error}</p>}
  {pending.length===0?<p className="delivery-approvals-empty">Nenhum endereço aguardando resposta.</p>:pending.map(row=><article key={row.id} className="delivery-approval-item">
   <strong><MapPin size={16}/>{row.address}</strong>{row.neighborhood&&<span>Bairro: {row.neighborhood}</span>}<label className="field"><span>Taxa para esta entrega</span><input inputMode="decimal" value={fees[row.id]??(defaultFee/100).toFixed(2).replace(".",",")} onChange={e=>setFees(old=>({...old,[row.id]:e.target.value}))}/></label>
   <a href={`https://wa.me/${row.phone}`} target="_blank" rel="noopener noreferrer"><Phone size={15}/> {row.phone}</a>
   {row.latitude!==null&&row.longitude!==null&&<a href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`} target="_blank" rel="noopener noreferrer">Ver localização enviada</a>}
   <small>Solicitado às {new Date(row.createdAt).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"})}</small>
   <div className="delivery-approval-actions"><button className="btn primary small" type="button" disabled={!!busy} onClick={()=>decide(row,"approve")}><Check size={15}/>Aceitar entrega</button><button className="btn outline small" type="button" disabled={!!busy} onClick={()=>decide(row,"reject")}><X size={15}/>Não atendemos</button></div>
  </article>)}
 </section>;
}
