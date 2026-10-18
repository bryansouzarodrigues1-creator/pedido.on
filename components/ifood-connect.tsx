"use client";
import {useEffect,useId,useRef,useState} from "react";
import {ExternalLink,Link2,Check} from "lucide-react";
import {parseIfoodStoreLink} from "@/lib/menu-source-links";
import {ifoodConnectionRequest,type IfoodConnectionStatus,type PublicIfoodConnection,type IfoodAuthorizedImport} from "@/lib/ifood-connect-client";
import {Spinner} from "./ui";
/** A one-time import; the responsible merchant grants access in their own portal. */
export default function IfoodConnect({url,onResult,disabled,onBusyChange}:{url:string;onResult:(result:IfoodAuthorizedImport)=>void;disabled?:boolean;onBusyChange?:(busy:boolean)=>void}){
 const [enabled,setEnabled]=useState(false),[pending,setPending]=useState<PublicIfoodConnection|null>(null),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[now,setNow]=useState(()=>Date.now());
 const alive=useRef(true),id=useId(),canonical=parseIfoodStoreLink(url)?.url||"";
 useEffect(()=>{alive.current=true;void ifoodConnectionRequest<IfoodConnectionStatus>().then(status=>{if(!alive.current)return;setEnabled(status.enabled);setPending(status.pending?.url===canonical?status.pending:null);}).catch(()=>{});return()=>{alive.current=false;};},[canonical]);
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
 useEffect(()=>{if(!pending)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[pending]);
 const expired=!!pending&&pending.expiresAt*1000<=now;
 async function start(){if(busy||disabled||!canonical)return;setBusy(true);setError("");try{const result=await ifoodConnectionRequest<{pending:PublicIfoodConnection}>({action:"start",url:canonical});if(alive.current){setPending(result.pending);setCode("");setNow(Date.now());}}catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não foi possível iniciar a conexão.");}finally{if(alive.current)setBusy(false);}}
 async function complete(){if(busy||disabled||expired||!code.trim())return;setBusy(true);setError("");try{const result=await ifoodConnectionRequest<IfoodAuthorizedImport>({action:"complete",authorizationCode:code.trim()});if(alive.current){setPending(null);setCode("");onResult(result);}}catch(e){if(alive.current){if(e instanceof Error&&(e as Error&{reconnect?:boolean}).reconnect){setPending(null);setCode("");}setError(e instanceof Error?e.message:"Não foi possível ler sua loja.");}}finally{if(alive.current)setBusy(false);}}
 async function cancel(){if(busy||disabled)return;setBusy(true);setError("");try{await ifoodConnectionRequest({action:"cancel"});if(alive.current){setPending(null);setCode("");}}catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não foi possível encerrar a autorização.");}finally{if(alive.current)setBusy(false);}}
 if(!enabled||!canonical)return null;
 return <section className="ifood-connect" aria-label="Conectar loja no iFood"><h3>Traga os dados da sua loja</h3><p>O responsável autoriza no Portal do Parceiro. Depois, confira produtos, endereço e horários aqui.</p>
  {!pending||expired?<>{expired&&<p role="status">Essa autorização expirou. Sua ideia e sua leitura continuam guardadas.</p>}<button type="button" className="btn primary" disabled={disabled||busy} onClick={()=>void start()}>{busy?<Spinner/>:<Link2 size={17}/>}Conectar minha loja no iFood</button></>:<>
   <div className="ifood-code"><span>Código para autorizar</span><strong>{pending.userCode}</strong><small>Disponível por {Math.max(1,Math.ceil((pending.expiresAt*1000-now)/60000))} min.</small></div>
   <a className="btn outline" href={pending.verificationUrl} target="_blank" rel="noopener noreferrer">Autorizar no Portal do Parceiro<ExternalLink size={16}/></a>
   <label htmlFor={id}>Depois de autorizar, cole o código de retorno</label><input id={id} type="text" autoComplete="off" spellCheck={false} maxLength={512} value={code} disabled={disabled||busy} onChange={e=>setCode(e.target.value)} placeholder="Código exibido pelo iFood"/>
   <button type="button" className="btn primary" disabled={disabled||busy||!code.trim()} onClick={()=>void complete()}>{busy?<Spinner/>:<Check size={17}/>} {busy?"Recebendo dados da loja…":"Receber dados e cardápio"}</button><button type="button" className="text-button" disabled={disabled||busy} onClick={()=>void cancel()}>Cancelar autorização</button>
  </>}{error&&<p className="field-error" role="alert">{error}</p>}
 </section>;
}
