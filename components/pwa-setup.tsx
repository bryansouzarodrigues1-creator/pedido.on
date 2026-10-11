"use client";
import {useEffect,useState} from "react";
import {Download,WifiOff,X} from "lucide-react";
type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
export default function PwaSetup(){
 const [pending,setPending]=useState<InstallPromptEvent|null>(null);
 const [installed,setInstalled]=useState(false),[offline,setOffline]=useState(false),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{
  if("serviceWorker" in navigator&&location.protocol==="https:"){
   navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{});
  }
  const handle=(e:Event)=>{e.preventDefault();setPending(e as InstallPromptEvent);};
  const done=()=>{setPending(null);setInstalled(true);};
  const sync=()=>setOffline(!navigator.onLine);
  window.addEventListener("beforeinstallprompt",handle);
  window.addEventListener("appinstalled",done);
  window.addEventListener("online",sync);window.addEventListener("offline",sync);sync();
  const display=window.matchMedia("(display-mode: standalone)");
  setInstalled(display.matches);
  return()=>{window.removeEventListener("beforeinstallprompt",handle);window.removeEventListener("appinstalled",done);window.removeEventListener("online",sync);window.removeEventListener("offline",sync);};
 },[]);
 async function install(){if(!pending)return;await pending.prompt();const result=await pending.userChoice.catch(()=>null);if(result?.outcome==="accepted"){setInstalled(true);}setPending(null);}
 return <>
  {offline&&<div role="status" className="pwa-offline"><WifiOff size={15}/> Sem internet. Pedidos e informações precisam de conexão para atualizar.</div>}
  {!installed&&!!pending&&!dismissed&&<div className="pwa-install" role="status"><span><strong>pedido.on no celular</strong><small>Instale o painel para abrir como aplicativo.</small></span><button type="button" className="btn primary small" onClick={install}><Download size={16}/> Instalar</button><button type="button" aria-label="Dispensar instalação" className="pwa-dismiss" onClick={()=>setDismissed(true)}><X size={16}/></button></div>}
 </>;
}
