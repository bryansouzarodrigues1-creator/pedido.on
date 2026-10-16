"use client";
import {useEffect,useState} from "react";
import {ImagePlus,Upload,X} from "lucide-react";
import {loadBrandAssets,saveBrandAssets,type BrandAssets,type BrandImage} from "@/lib/guest-brand-assets";
export default function GuestBrandPanel({restaurantId,onApply}:{restaurantId:string;onApply:(kind:"logo"|"cover",url:string)=>void}){
 const [assets,setAssets]=useState<BrandAssets|null>(null),[busy,setBusy]=useState<"logo"|"cover"|null>(null),[error,setError]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{let alive=true;setAssets(null);void loadBrandAssets(restaurantId).then(v=>{if(alive)setAssets(v);}).catch(()=>{});return()=>{alive=false;};},[restaurantId]);
 async function apply(kind:"logo"|"cover"){
  const asset=assets?.[kind];if(!asset||busy)return;setBusy(kind);setError("");setMessage("");
  try{
   const bytes=Uint8Array.from(atob(asset.data.slice(asset.data.indexOf(",")+1)),char=>char.charCodeAt(0));
   const file=new File([bytes],asset.name,{type:asset.type});const form=new FormData();form.append("file",file);
   const response=await fetch("/api/restaurants/"+encodeURIComponent(restaurantId)+"/media",{method:"POST",body:form});
   const body=await response.json() as {url?:string;error?:string};
   if(!response.ok||!body.url||!/^\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(body.url))throw Error(body.error||"Não foi possível aplicar a imagem.");
   onApply(kind,body.url);setMessage((kind==="logo"?"Logo":"Capa")+" adicionado ao rascunho. Salve e publique quando estiver pronto.");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar a imagem.");}finally{setBusy(null);}
 }
 async function discard(kind:"logo"|"cover"){if(!assets||busy)return;try{const next={...assets,[kind]:undefined};await saveBrandAssets(next);setAssets(next);setMessage("Referência descartada deste aparelho.");}catch{setError("Não foi possível remover esta referência agora.");}}
 if(!assets?.logo&&!assets?.cover)return null;
 return <section className="panel-card guest-brand-panel" aria-label="Imagens anexadas antes do cadastro"><div className="subsection-title"><h2><ImagePlus size={19}/>Arquivos trazidos na criação</h2><p>Estas imagens ficaram guardadas neste aparelho. Escolha se deseja aplicar cada uma ao rascunho.</p></div><div className="guest-brand-list">{(["logo","cover"] as const).map(kind=>{const value=assets[kind];if(!value)return null;return <article key={kind}><img src={value.data} alt={kind==="logo"?"Logo anexado":"Capa ou referência anexada"}/><div><strong>{kind==="logo"?"Logo":"Capa / referência"}</strong><small>{value.name}</small></div><button type="button" className="btn outline small" disabled={!!busy} onClick={()=>void apply(kind)}>{busy===kind?"Enviando…":<><Upload size={14}/>Aplicar {kind==="logo"?"logo":"capa"}</>}</button><button type="button" className="icon-btn" aria-label={"Descartar "+(kind==="logo"?"logo":"capa")} onClick={()=>void discard(kind)} disabled={!!busy}><X size={15}/></button></article>;})}</div>{error&&<p className="field-error" role="alert">{error}</p>}{message&&<p role="status" className="guest-brand-status">{message}</p>}</section>;
}
