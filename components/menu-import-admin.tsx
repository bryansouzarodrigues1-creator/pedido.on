"use client";
import {useEffect,useState} from "react";
import {formatBrazilWhatsApp,supportWhatsAppLink} from "@/lib/support-whatsapp";
type Item={id:string;restaurantId:string;restaurantName:string;storeUrl:string;ownerNote:string;contactWhatsApp:string;status:string;requestedAt:string;receivedAt:string|null;pairingExpiresAt:number|null};
async function csrf(){const r=await fetch("/api/auth/config",{cache:"no-store"});const d=await r.json() as {csrf?:string};if(!r.ok||!d.csrf)throw Error("Sessão expirada.");return d.csrf;}
export default function MenuImportAdmin(){
 const [items,setItems]=useState<Item[]>([]),[code,setCode]=useState(""),[pairedId,setPairedId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function load(){const r=await fetch("/api/admin/menu-import-assistance",{cache:"no-store"}),data=await r.json() as {requests?:Item[];error?:string};if(!r.ok)throw Error(data.error||"Falha ao consultar pedidos.");setItems(data.requests||[]);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 async function pair(requestId:string){if(busy)return;setBusy(true);setCode("");setPairedId("");setError("");setNotice("");
 try{const token=await csrf(),r=await fetch("/api/admin/menu-import-assistance",{method:"POST",headers:{"Content-Type":"application/json","x-pedido-csrf":token},body:JSON.stringify({requestId})});
 const data=await r.json() as {pairingCode?:string;message?:string;error?:string};if(!r.ok||!data.pairingCode)throw Error(data.error||"Não foi possível gerar a autorização.");
 setCode(data.pairingCode);setPairedId(requestId);setNotice(data.message||"Código temporário gerado.");await load();
 }catch(e){setError(e instanceof Error?e.message:"Falha ao gerar código.");}finally{setBusy(false);}}
 return <section className="account-card" aria-label="Solicitações de cardápio assistido">
 <h2>Solicitações de importação do iFood</h2><p>Responda manualmente pelo WhatsApp informado e autorizado pelo cliente; nenhuma mensagem automática é enviada. O cliente autoriza pelo painel. Abra o mesmo cardápio na extensão, confira os produtos e use um código temporário. Nenhuma loja é alterada automaticamente.</p>
 <button className="btn outline" disabled={busy} type="button" onClick={()=>void load().catch(e=>setError(e.message))}>Atualizar solicitações</button>
 {items.length===0?<p>Nenhuma solicitação encontrada.</p>:<div style={{display:"grid",gap:12,marginTop:16}}>{items.map(item=>
 <section key={item.id} style={{padding:12,border:"1px solid #b8b8b8",borderRadius:10}}>
  <strong>{item.restaurantName}</strong><p>Estado: {item.status} · {new Date(item.requestedAt).toLocaleString("pt-BR")}</p>
  <p><a href={item.storeUrl} target="_blank" rel="noreferrer noopener">Abrir cardápio solicitado</a></p>
  {item.ownerNote&&<p>Observação do dono: {item.ownerNote}</p>}
  {item.contactWhatsApp&&<p>WhatsApp autorizado do cliente: <strong>{formatBrazilWhatsApp(item.contactWhatsApp)||item.contactWhatsApp}</strong>. <a href={supportWhatsAppLink(item.contactWhatsApp,`Olá! Aqui é o suporte do Pizzaria.on. Recebemos sua solicitação sobre o cardápio da ${item.restaurantName}. Como podemos ajudar?`)||"#"} target="_blank" rel="noreferrer noopener">Responder pelo WhatsApp</a></p>}
  {(item.status==="requested"||item.status==="paired")&&<button type="button" className="btn primary" disabled={busy} onClick={()=>void pair(item.id)}>Gerar novo código para a extensão</button>}
  {pairedId===item.id&&code&&<div><label htmlFor="pairing-code">Código de pareamento — uso único e válido por 30 minutos</label><textarea id="pairing-code" readOnly value={code} rows={3} onFocus={e=>e.currentTarget.select()}/><button type="button" className="btn outline" onClick={()=>void navigator.clipboard.writeText(code).then(()=>setNotice("Código copiado.")).catch(()=>setError("Selecione e copie manualmente."))}>Copiar código</button></div>}
  {item.status==="received"&&<p>Catálogo entregue para revisão do proprietário. Nenhum preço ou foto foi publicado.</p>}
 </section>)}</div>}
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
