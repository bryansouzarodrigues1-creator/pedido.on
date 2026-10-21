"use client";
import {useEffect,useState} from "react";
type RequestInfo={id:string;storeUrl:string;status:string;requestedAt:string;stats?:{total:number;approved:number;pending:number;photoReferences:number;uploadedPhotos:number;truncated:boolean};menuText?:string;capture?:{items:{name:string;category:string;needsReview:boolean;selected:boolean;priceCents:number|null;imageUrl?:string|null;imageMediaUrl?:string|null}[]}};
async function csrf(){const r=await fetch("/api/auth/config",{cache:"no-store"});const d=await r.json() as {csrf?:string};if(!r.ok||!d.csrf)throw Error("Atualize a sessão e tente novamente.");return d.csrf;}
export default function MenuAssistanceOwner({restaurantId,onReceive}:{restaurantId:string;onReceive:(text:string,photos:{name:string;category:string;url:string}[])=>void}){
 const [info,setInfo]=useState<RequestInfo|null>(null),[url,setUrl]=useState(""),[note,setNote]=useState(""),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function refresh(){const r=await fetch("/api/restaurants/"+encodeURIComponent(restaurantId)+"/import-assistance",{cache:"no-store"});const data=await r.json() as {request?:RequestInfo;error?:string};
 if(!r.ok)throw Error(data.error||"Não foi possível consultar sua solicitação.");setInfo(data.request||null);}
 useEffect(()=>{setInfo(null);void refresh().catch(e=>setError(e.message));},[restaurantId]);
 async function action(method:"POST"|"DELETE"){if(busy)return;setBusy(true);setError("");setNotice("");
 try{const token=await csrf(),r=await fetch("/api/restaurants/"+encodeURIComponent(restaurantId)+"/import-assistance",{
  method,headers:{"Content-Type":"application/json","x-pedido-csrf":token},
  ...(method==="POST"?{body:JSON.stringify({storeUrl:url,ownerNote:note,authorized:confirmed})}:{})});
 const data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error||"Não foi possível concluir.");
 await refresh();setNotice(method==="POST"?"Solicitação enviada. O operador fará a leitura apenas após sua autorização.":"Solicitação cancelada.");
 }catch(e){setError(e instanceof Error?e.message:"Falha ao solicitar ajuda.");}finally{setBusy(false);}}
 const waiting=info?.status==="requested"||info?.status==="paired";
 return <section className="account-card" aria-label="Importação assistida do iFood" style={{marginTop:12,padding:14}}>
  <h3>Solicitar que tragam meu cardápio</h3>
  <p>Se o link do iFood não funcionar automaticamente, você pode solicitar ajuda. Sua loja precisa estar autorizada; nenhum produto é publicado sem sua revisão.</p>
  {waiting?<><p role="status">Solicitação registrada · {info.status==="paired"?"operador preparando a leitura":"aguardando atendimento"}.</p>
    <p><small>Loja: {info.storeUrl}</small></p>
    <button type="button" className="btn outline" disabled={busy} onClick={()=>void action("DELETE")}>Cancelar solicitação</button>
  </>:info?.status==="received"?<><p role="status">Dados recebidos para conferência: {info.stats?.total||0} identificados, {info.stats?.approved||0} marcados como válidos, {info.stats?.pending||0} pendentes, {info.stats?.uploadedPhotos||0} fotos guardadas, {info.stats?.photoReferences||0} links de origem.</p>
    {info.stats?.truncated&&<p>O catálogo ultrapassou o limite de 200 itens. Será necessária uma segunda conferência.</p>}
    <p>As fotos guardadas no servidor podem ser vinculadas após sua confirmação individual no leitor; links inacessíveis ficam apenas como referência.</p>
    <button type="button" className="btn primary" disabled={!info.menuText} onClick={()=>{if(info.menuText){onReceive(info.menuText,(info.capture?.items||[]).filter(item=>item.imageMediaUrl&&item.selected).map(item=>({name:item.name,category:item.category,url:item.imageMediaUrl!})));setNotice("Dados e fotos disponíveis no leitor. Confira nomes, preços, tamanhos e cada foto.");}}}>Levar produtos ao leitor para revisar</button>
  </>:<><label htmlFor="assistant-ifood-url">Link da sua loja no iFood</label>
    <input id="assistant-ifood-url" type="url" inputMode="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.ifood.com.br/delivery/…" maxLength={2048} disabled={busy}/>
    <label htmlFor="assistant-ifood-note">Observação (opcional)</label><textarea id="assistant-ifood-note" rows={2} maxLength={350} value={note} onChange={e=>setNote(e.target.value)} disabled={busy} placeholder="Ex.: conferir também os adicionais e os tamanhos das pizzas."/>
    <label style={{display:"flex",gap:8,alignItems:"flex-start",margin:"8px 0"}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>Confirmo que sou responsável por esta loja e autorizo a leitura do cardápio acessível.</label>
    <button type="button" className="btn primary" disabled={!confirmed||!url.trim()||busy} onClick={()=>void action("POST")}>Solicitar importação assistida</button></>}
  <button type="button" className="text-button" disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>Atualizar andamento</button>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="field-error">{error}</p>}
 </section>;
}
