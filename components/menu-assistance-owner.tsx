"use client";
import {useEffect,useRef,useState} from "react";
import {normalizeBrazilWhatsApp,supportWhatsAppLink} from "@/lib/support-whatsapp";
import type {AssistedCapture} from "@/lib/menu-assistance-policy";
type RequestInfo={id:string;storeUrl:string;status:string;requestedAt:string;contactWhatsApp?:string;notifyWhenReady?:boolean;stats?:{total:number;approved:number;pending:number;photoReferences:number;uploadedPhotos:number;truncated:boolean};menuText?:string;capture?:AssistedCapture};
async function csrf(){const r=await fetch("/api/auth/config",{cache:"no-store"});const d=await r.json() as {csrf?:string};if(!r.ok||!d.csrf)throw Error("Atualize a sessão e tente novamente.");return d.csrf;}
export default function MenuAssistanceOwner({restaurantId,onReceive,disabled=false}:{restaurantId:string;onReceive:(requestId:string,capture:AssistedCapture)=>boolean;disabled?:boolean}){
 const [info,setInfo]=useState<RequestInfo|null>(null),[url,setUrl]=useState(""),[note,setNote]=useState(""),[confirmed,setConfirmed]=useState(false),[contactWhatsApp,setContactWhatsApp]=useState(""),[contactPermission,setContactPermission]=useState(false),[notifyWhenReady,setNotifyWhenReady]=useState(false);
 const [support,setSupport]=useState<{number:string;display:string}|null>(null);
 const detailsRef=useRef<HTMLDetailsElement|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function refresh(){const r=await fetch("/api/restaurants/"+encodeURIComponent(restaurantId)+"/import-assistance",{cache:"no-store"});const data=await r.json() as {request?:RequestInfo;supportWhatsApp?:{number:string;display:string}|null;error?:string};
 if(!r.ok)throw Error(data.error||"Não foi possível consultar sua solicitação.");setInfo(data.request||null);setSupport(data.supportWhatsApp||null);}
 useEffect(()=>{setInfo(null);void refresh().catch(e=>setError(e.message));},[restaurantId]);
 useEffect(()=>{if(info?.status==="requested"||info?.status==="paired"){
  const interval=setInterval(()=>{void refresh().catch(()=>{});},45000);
  return ()=>clearInterval(interval);
 }},[restaurantId,info?.status]);
 useEffect(()=>{if(info?.status==="received")detailsRef.current?.setAttribute("open","");},[info?.status]);
 async function action(method:"POST"|"DELETE"){if(busy||disabled)return;setBusy(true);setError("");setNotice("");
 try{const token=await csrf(),r=await fetch("/api/restaurants/"+encodeURIComponent(restaurantId)+"/import-assistance",{
  method,headers:{"Content-Type":"application/json","x-pedido-csrf":token},
  ...(method==="POST"?{body:JSON.stringify({storeUrl:url,ownerNote:note,notifyWhenReady,authorized:confirmed,contactWhatsApp,contactPermission})}:{})});
 const data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error||"Não foi possível concluir.");
 await refresh();setNotice(method==="POST"?"Solicitação enviada. O operador fará a leitura apenas após sua autorização.":"Solicitação cancelada.");
 }catch(e){setError(e instanceof Error?e.message:"Falha ao solicitar ajuda.");}finally{setBusy(false);}}
 const waiting=info?.status==="requested"||info?.status==="paired";
 return <><section aria-label="Atendimento pelo WhatsApp" className="account-card" style={{marginTop:12,padding:14}}>
  <strong>Precisa de ajuda com seu cardápio?</strong>
  {support?<><p>Suporte oficial Pizzaria.on: <strong>{support.display}</strong>. Este é o número usado para responder às solicitações de ajuda.</p>
  <a className="btn outline" href={supportWhatsAppLink(support.number,"Olá! Preciso de ajuda com meu cardápio no Pizzaria.on.")||"#"} target="_blank" rel="noreferrer noopener">Falar com o suporte no WhatsApp</a></>
  :<p>Deixe seu WhatsApp na solicitação abaixo para receber atendimento sobre o seu cardápio.</p>}
 </section>
 <details ref={detailsRef} className="account-card" aria-label="Importação assistida do iFood" style={{marginTop:12,padding:14}}>
  <summary style={{cursor:"pointer",fontWeight:700}}>{info?.status==="received"?"Seu cardápio está pronto para revisar":waiting?"Solicitação de cardápio em andamento":"Não tem PDF? Solicitar que tragam meu cardápio"}</summary>
  <p>Se tiver um PDF ou fotos do seu cardápio, prefira a importação por arquivo acima. Caso contrário, solicite ajuda com a sua loja do iFood. Nenhum produto será publicado antes de sua revisão.</p>
  {waiting?<><p role="status">Solicitação registrada · {info.status==="paired"?"operador preparando a leitura":"aguardando atendimento"}.</p>
    <p><small>Loja: {info.storeUrl}</small></p><p><small>WhatsApp informado: {info.contactWhatsApp?`+${info.contactWhatsApp}`:"—"}</small></p>
    <button type="button" className="btn outline" disabled={busy} onClick={()=>void action("DELETE")}>Cancelar solicitação</button>
  </>:info?.status==="received"?<><p role="status">Dados recebidos para conferência: {info.stats?.total||0} identificados, {info.stats?.approved||0} marcados como válidos, {info.stats?.pending||0} pendentes, {info.stats?.uploadedPhotos||0} fotos guardadas, {info.stats?.photoReferences||0} links de origem.</p>
    {info.stats?.truncated&&<p>O catálogo ultrapassou o limite de 200 itens. Será necessária uma segunda conferência.</p>}
    <p>As fotos guardadas no servidor podem ser vinculadas após sua confirmação individual. Os preços do iFood podem incluir acréscimos e taxas: ajuste todos os valores para os que deseja cobrar diretamente. Links inacessíveis ficam apenas como referência.</p>
    {(info.stats?.pending||0)>0&&<details><summary>Ver registros pendentes de conferência</summary><p>Esses registros permanecem disponíveis aqui e não entram como produtos com preço confirmado.</p>{info.capture?.items.filter(item=>!item.selected||!item.available||item.needsReview||!item.priceCents).map(item=><p key={item.id}><strong>{item.name}</strong> · {item.category} · {item.rawPrice||"Preço não confirmado"}{!item.available?" · indisponível na origem":""}</p>)}</details>}
    <button type="button" className="btn primary" disabled={disabled||!info.capture||!info.menuText} onClick={()=>{if(info.capture&&onReceive(info.id,info.capture))setNotice("Dados e fotos disponíveis no leitor. Confira nomes, preços, tamanhos e cada foto.");}}>Levar produtos ao leitor para revisar</button>
  </>:<><label htmlFor="assistant-ifood-contact">Seu WhatsApp com DDD (para respondermos à solicitação)</label>
    <input id="assistant-ifood-contact" type="tel" autoComplete="tel" inputMode="tel" placeholder="(DDD) 9XXXX-XXXX" value={contactWhatsApp} onChange={e=>setContactWhatsApp(e.target.value)} maxLength={27} disabled={busy} required />
    <p><small>Usaremos este número somente para responder à sua solicitação. {support?`O atendimento será feito pelo WhatsApp ${support.display}.`:"O suporte entrará em contato pelo WhatsApp que você informar."}</small></p>
    <label htmlFor="assistant-ifood-url">Link da sua loja no iFood</label>
    <input id="assistant-ifood-url" type="url" inputMode="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.ifood.com.br/delivery/…" maxLength={2048} disabled={busy}/>
    <label htmlFor="assistant-ifood-note">Observação (opcional)</label><textarea id="assistant-ifood-note" rows={2} maxLength={350} value={note} onChange={e=>setNote(e.target.value)} disabled={busy} placeholder="Ex.: conferir também os adicionais e os tamanhos das pizzas."/>
    <label style={{display:"flex",gap:8,alignItems:"flex-start",margin:"8px 0"}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>Confirmo que sou responsável por esta loja e autorizo a leitura do cardápio acessível.</label>
    <label style={{display:"flex",gap:8,alignItems:"flex-start",margin:"8px 0"}}><input type="checkbox" checked={contactPermission} onChange={e=>setContactPermission(e.target.checked)} disabled={busy}/>Autorizo o suporte do Pizzaria.on a entrar em contato comigo pelo WhatsApp informado para tratar desta solicitação.</label>
    <label style={{display:"flex",gap:8,alignItems:"flex-start",margin:"8px 0"}}><input type="checkbox" checked={notifyWhenReady} onChange={e=>setNotifyWhenReady(e.target.checked)} disabled={busy}/>Quero receber uma notificação quando os produtos estiverem prontos para revisão, se as notificações do Pizzaria.on estiverem ativadas nos seus aparelhos.</label>
    <button type="button" className="btn primary" disabled={disabled||!confirmed||!contactPermission||!normalizeBrazilWhatsApp(contactWhatsApp)||!url.trim()||busy} onClick={()=>void action("POST")}>Solicitar que tragam meu cardápio</button></>}
  <button type="button" className="text-button" disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>Atualizar andamento</button>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="field-error">{error}</p>}
 </details></>;
}
