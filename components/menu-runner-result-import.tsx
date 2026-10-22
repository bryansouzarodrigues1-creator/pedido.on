"use client";
import {useEffect,useRef,useState} from "react";
import {RUNNER_RESULT_MAX_BYTES,runnerResultSchema,runnerResultPreview,type RunnerResult} from "@/lib/menu-runner-result";
type Preview=ReturnType<typeof runnerResultPreview>;
export default function MenuRunnerResultImport({requestId,storeUrl,disabled,onDelivered}:{requestId:string;storeUrl:string;disabled:boolean;onDelivered:()=>void}){
 const [result,setResult]=useState<RunnerResult|null>(null),[preview,setPreview]=useState<Preview|null>(null),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[]);
 async function read(file:File|undefined){const task=++generation.current;setResult(null);setPreview(null);setReviewed(false);setError("");if(!file)return;
  try{if(file.size>RUNNER_RESULT_MAX_BYTES)throw Error("O arquivo é grande demais. Use um resultado com até 200 produtos.");
   const parsed=runnerResultSchema.parse(JSON.parse(await file.text())),checked=runnerResultPreview(parsed,storeUrl);
   if(task===generation.current){setResult(parsed);setPreview(checked);}
  }catch(e){if(task===generation.current)setError(e instanceof SyntaxError?"Este arquivo não é um resultado JSON válido.":e&&typeof e==="object"&&"issues" in e?(e as {issues:{message:string}[]}).issues[0]?.message||"Confira o arquivo.":e instanceof Error?e.message:"Não foi possível ler o arquivo.");}
 }
 async function deliver(){if(!result||!reviewed||busy||disabled)return;setBusy(true);setError("");
  try{const config=await fetch("/api/auth/config",{cache:"no-store"}),{csrf}=await config.json() as {csrf?:string};if(!config.ok||!csrf)throw Error("Atualize a sessão e tente novamente.");
   const response=await fetch("/api/admin/menu-import-results",{method:"POST",headers:{"Content-Type":"application/json","x-pedido-csrf":csrf},body:JSON.stringify({requestId,result,reviewed:true})});
   const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error||"Não foi possível entregar o resultado.");
   setResult(null);setPreview(null);setReviewed(false);onDelivered();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao entregar o resultado.");}finally{setBusy(false);}
 }
 return <details aria-label="Resultado do robô" style={{marginTop:12}}><summary style={{cursor:"pointer",fontWeight:700}}>Enviar resultado do robô</summary>
  <p>Escolha o arquivo <strong>resultado-importacao.json</strong> gerado pela captura. Ele será entregue somente à revisão do dono desta solicitação.</p>
  <label>Arquivo da captura<input type="file" accept=".json,application/json" disabled={busy||disabled} onChange={e=>void read(e.currentTarget.files?.[0])}/></label>
  {preview&&<><p role="status"><strong>{preview.capture.storeName||"Loja sem nome na origem"}</strong> · {preview.stats.total} produtos · {preview.stats.approved} com preço para conferência · {preview.stats.pending} pendentes.</p>
   <p><small>As fotos permanecem como referências. Os tamanhos das pizzas e os preços de venda direta precisam da revisão do proprietário. A captura pode estar incompleta.</small></p>
   <details><summary>Conferir produtos do resultado</summary><div style={{maxHeight:300,overflow:"auto"}}>{preview.capture.items.map(item=><p key={item.id}><strong>{item.name}</strong> · {item.category} · {item.selected&&item.priceCents?`R$ ${(item.priceCents/100).toFixed(2).replace(".",",")}`:item.rawPrice||"Preço pendente"}{!item.available?" · indisponível":""}</p>)}</div></details>
   <label style={{display:"flex",gap:8,margin:"12px 0"}}><input type="checkbox" disabled={busy||disabled} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Conferi a loja e autorizo entregar este resultado para revisão do dono.</label>
   <button type="button" className="btn primary" disabled={busy||disabled||!reviewed} onClick={()=>void deliver()}>{busy?"Entregando…":"Entregar para revisão do dono"}</button>
  </>}{error&&<p role="alert" className="field-error">{error}</p>}
 </details>;
}
