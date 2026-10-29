"use client";
import {useEffect,useState} from "react";
import {creationUsageLabel,imageFairUse,type CreationUsage} from "@/lib/ai-offer-policy";
type Usage=CreationUsage&{enabled:boolean};
export default function AiAllowance(){
 const [usage,setUsage]=useState<{images:Usage;studio:Usage}|null>(null);
 useEffect(()=>{let active=true;fetch("/api/account",{cache:"no-store"}).then(async response=>{if(!response.ok)return;const value=await response.json() as {creations:{images:Usage;studio:Usage}};if(active)setUsage(value.creations);}).catch(()=>{});return()=>{active=false;};},[]);
 if(!usage)return null;
 return <div className="account-ai-allowance"><h2>Suas criações</h2><div><span><b>{creationUsageLabel(usage.images)}</b></span><span>{usage.studio.limit===null||usage.studio.limit>=1000000?<b>Textos para divulgar à vontade</b>:<><b>{usage.studio.used} / {usage.studio.limit}</b> criações de texto no teste</>}</span></div><small>Logo, capa, fotos e fundos compartilham o limite da conta. Textos prontos e artes com fotos salvas podem ser reutilizados à vontade; baixar novamente não consome IA. {usage.images.scope==="trial"?"A franquia do teste vale por todo o período e por todas as lojas; não renova ao entrar novamente.":""}</small>{usage.images.limit===null&&<details><summary>Como funciona o uso justo</summary><p>{imageFairUse}</p></details>}{!usage.images.enabled&&<p>Novas imagens estão temporariamente indisponíveis. Suas fotos e modelos prontos continuam disponíveis.</p>}</div>;
}
