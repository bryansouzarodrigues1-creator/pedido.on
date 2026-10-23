"use client";
import {useState} from "react";
import {captureFailureReport,failureForAssistance} from "@/lib/menu-capture-failure";
type FailureReport=ReturnType<typeof captureFailureReport.parse>;
export default function MenuCaptureFailureImport({requestId,storeUrl,disabled,onReported}:{requestId:string;storeUrl:string;disabled:boolean;onReported:()=>void}){
 const [report,setReport]=useState<FailureReport|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function choose(file:File|undefined){
  setReport(null);setConfirmed(false);setError("");
  if(!file)return;
  try{
   if(file.size>8000)throw Error("Relatório grande demais; selecione o report.json da tentativa.");
   const parsed=captureFailureReport.parse(JSON.parse(await file.text()));
   failureForAssistance(parsed,storeUrl);
   setReport(parsed);
  }catch(e){setError(e instanceof Error?e.message:"Relatório inválido.");}
 }
 async function deliver(){
  if(!report||!confirmed||busy||disabled)return;
  setBusy(true);setError("");
  try{
   const config=await fetch("/api/auth/config",{cache:"no-store"});
   const data=await config.json() as {csrf?:string};
   if(!config.ok||!data.csrf)throw Error("Sessão expirada. Atualize a página.");
   const response=await fetch("/api/admin/menu-import-failures",{method:"POST",
    headers:{"Content-Type":"application/json","x-pedido-csrf":data.csrf},
    body:JSON.stringify({requestId,report,reviewed:true})});
   const outcome=await response.json() as {error?:string};
   if(!response.ok)throw Error(outcome.error||"Não foi possível comunicar o bloqueio.");
   setReport(null);setConfirmed(false);onReported();
  }catch(e){setError(e instanceof Error?e.message:"Erro ao comunicar o bloqueio.");}
  finally{setBusy(false);}
 }
 return <details aria-label="Relatar tentativa bloqueada" style={{marginTop:12}}>
  <summary style={{cursor:"pointer",fontWeight:700}}>Informar que o robô não conseguiu ler a loja</summary>
  <p>Use apenas o <strong>report.json</strong> desta loja, gerado pela tentativa real. Não envie capturas sintéticas. O cliente verá uma alternativa por PDF/fotos, sem perder o rascunho.</p>
  <label>Relatório da tentativa<input type="file" accept=".json,application/json" disabled={busy||disabled} onChange={e=>void choose(e.currentTarget.files?.[0])}/></label>
  {report&&<><p role="status">Loja conferida · {report.outcome} · {report.stopReason} · {report.itemCount} produtos.</p>
    <label style={{display:"flex",gap:8,margin:"12px 0"}}><input type="checkbox" checked={confirmed} disabled={busy||disabled} onChange={e=>setConfirmed(e.target.checked)}/>Conferi o relatório real da loja e confirmo que não há itens para importar nesta tentativa.</label>
    <button type="button" className="btn outline" disabled={busy||disabled||!confirmed} onClick={()=>void deliver()}>{busy?"Comunicando…":"Informar bloqueio ao proprietário"}</button>
  </>}
  {error&&<p role="alert" className="field-error">{error}</p>}
 </details>;
}
