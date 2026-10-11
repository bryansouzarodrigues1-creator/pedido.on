"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {MapPin,Phone,Clock,CheckCircle2,Truck,Store,Navigation,RefreshCw} from "lucide-react";
import {Brand} from "./ui";
type RecordCheck={id:string;requestId:string;token:string;phone:string;address:string;latitude?:number;longitude?:number;expiresAt:number};
export type ApprovedDelivery={id:string;token:string;phone:string;address:string};
type Status="new"|"pending"|"approved"|"rejected"|"expired";
export default function DeliveryGate({slug,storeName,pickupAvailable,onApproved,onPickup}:{slug:string;storeName:string;pickupAvailable:boolean;onApproved:(data:ApprovedDelivery)=>void;onPickup:()=>void}){
 const [phone,setPhone]=useState(""),[address,setAddress]=useState(""),[coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);
 const [status,setStatus]=useState<Status>("new"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[record,setRecord]=useState<RecordCheck|null>(null);
 const ready=useRef(onApproved);ready.current=onApproved;
 const storageKey="pedido-delivery-"+slug;
 useEffect(()=>{
  let saved:RecordCheck|null=null;
  try{saved=JSON.parse(localStorage.getItem(storageKey)||"null") as RecordCheck|null;}catch{}
  if(saved&&typeof saved.id==="string"&&/^[a-f0-9-]{36}$/i.test(saved.id)&&/^[a-f0-9]{64}$/.test(saved.token)&&saved.expiresAt>Date.now()/1000){
   setRecord(saved);setPhone(saved.phone);setAddress(saved.address);if(typeof saved.latitude==="number"&&typeof saved.longitude==="number")setCoords({latitude:saved.latitude,longitude:saved.longitude});
   setStatus("pending");
  }
 },[storageKey]);
 useEffect(()=>{
  if(!record||status!=="pending")return;
  let active=true;const controller=new AbortController();
  async function poll(){
   try{
    const res=await fetch(`/api/menu/${encodeURIComponent(slug)}/delivery-check?id=${encodeURIComponent(record!.id)}`,{headers:{"x-pedido-delivery-token":record!.token},cache:"no-store",signal:controller.signal});
    const data=await res.json() as {status?:Status;error?:string};
    if(!res.ok)throw Error(data.error||"Não foi possível conferir sua entrega.");
    if(!active)return;
    if(data.status==="approved"){setStatus("approved");ready.current({id:record!.id,token:record!.token,phone:record!.phone,address:record!.address});}
    else if(data.status==="rejected"||data.status==="expired"){setStatus(data.status);try{localStorage.removeItem(storageKey);}catch{}}
    else if(data.status==="pending")setError("");
   }catch(e){if(active&&!controller.signal.aborted)setError(e instanceof Error?e.message:"Não foi possível consultar a pizzaria.");}
  }
  poll();const timer=setInterval(poll,6500);
  return()=>{active=false;controller.abort();clearInterval(timer);};
 },[record,status,slug,storageKey]);
 function locate(){
  setError("");
  if(!navigator.geolocation){setError("Seu navegador não oferece localização. Digite o endereço completo.");return;}
  navigator.geolocation.getCurrentPosition(pos=>{setCoords({latitude:Number(pos.coords.latitude.toFixed(6)),longitude:Number(pos.coords.longitude.toFixed(6))});},
   ()=>setError("Não foi possível obter o local. Digite rua, número e bairro para continuar."),{enableHighAccuracy:false,timeout:12000,maximumAge:60000});
 }
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError("");
  try{
   const input={requestId:crypto.randomUUID(),token:[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,"0")).join(""),phone:phone.trim(),address:address.trim(),...(coords||{})};
   const response=await fetch(`/api/menu/${encodeURIComponent(slug)}/delivery-check`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
   const data=await response.json() as {id?:string;status?:Status;expiresAt?:number;error?:string};
   if(!response.ok||!data.id||!data.expiresAt)throw Error(data.error||"Não conseguimos solicitar a entrega.");
   const next={...input,id:data.id,expiresAt:data.expiresAt};setRecord(next);setStatus("pending");
   try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{/* still works until page closes */}
  }catch(e){setError(e instanceof Error?e.message:"Confira seu endereço e tente novamente.");}
  finally{setBusy(false);}
 }
 const waiting=status==="pending";
 return <div className="delivery-gate"><header className="delivery-gate-header"><Brand/><span>{storeName}</span></header><main className="delivery-gate-card">
  <span className="eyebrow">ANTES DE ESCOLHER A PIZZA</span>
  <h1>Vamos conferir sua entrega?</h1>
  <p>Informe onde está e seu WhatsApp. A pizzaria vai confirmar se consegue entregar antes de você escolher seus sabores ou fazer Pix.</p>
  {waiting?<div className="delivery-gate-wait"><Clock size={28}/><h2>Aguardando a pizzaria</h2><p>Enviamos seu endereço para análise. Você pode deixar esta página aberta ou voltar depois no mesmo navegador.</p><small>Nenhum Pix foi solicitado.</small><button className="btn outline full" type="button" onClick={()=>location.reload()}><RefreshCw size={17}/> Atualizar consulta</button></div>:status==="approved"?<div className="delivery-gate-wait"><CheckCircle2 size={24}/> Entrega aprovada. Abrindo cardápio...</div>:<>
   {(status==="rejected"||status==="expired")&&<p className="field-error" role="alert">{status==="rejected"?"A pizzaria não confirmou essa entrega. Você pode corrigir o endereço ou escolher retirada.":"A solicitação expirou. Confirme novamente seu endereço."}</p>}
   <form onSubmit={submit}><label className="field"><span><Phone size={16}/> WhatsApp com DDD</span><input type="tel" required minLength={10} maxLength={25} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(21) 99999-9999" autoComplete="tel"/></label>
   <label className="field"><span><MapPin size={16}/> Local de entrega</span><textarea required rows={3} minLength={8} maxLength={300} value={address} onChange={e=>setAddress(e.target.value)} autoComplete="street-address" placeholder="Rua, número, bairro, cidade e referência"/></label>
   <button type="button" className="btn outline full" onClick={locate}><Navigation size={17}/>{coords?"Localização anexada":"Anexar localização atual (opcional)"}</button>
   <p className="field-hint">O endereço escrito é obrigatório mesmo quando você anexa a localização.</p>
   <button className="btn primary full" disabled={busy} type="submit"><Truck size={18}/>{busy?"Enviando...":"Perguntar se entrega aqui"}</button></form>
  </>}
  {pickupAvailable&&<button type="button" className="btn outline full" onClick={onPickup}><Store size={18}/> Vou retirar na pizzaria</button>}
  {error&&<p className="field-error" role="alert">{error}</p>}
  <p className="delivery-gate-privacy">Seu telefone e localização serão vistos apenas pela pizzaria para avaliar a entrega. Nenhum pagamento acontece nesta etapa.</p>
 </main></div>;
}
