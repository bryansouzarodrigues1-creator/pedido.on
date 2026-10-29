"use client";
import {useEffect,useRef,useState} from "react";
import {takeChunkRecovery} from "@/lib/chunk-recovery";
export default function PageRecovery({error,reset}:{error?:Error;reset:()=>void}){
 const [recovering,setRecovering]=useState(false);
 const granted=useRef(false);
 useEffect(()=>{
  if(!granted.current)try{granted.current=takeChunkRecovery(error,location,navigator.onLine,sessionStorage);}catch{}
  if(!granted.current)return;
  setRecovering(true);
  const timer=window.setTimeout(()=>location.reload(),800);
  return()=>window.clearTimeout(timer);
 },[error]);
 return <main style={{maxWidth:460,margin:"12vh auto",padding:28,fontFamily:"system-ui",lineHeight:1.6}}><h1>{recovering?"Atualizando a página…":"Vamos abrir sua página novamente."}</h1><p role="status">{recovering?"Estamos abrindo a versão atual. Seu acesso será mantido; nenhum pedido ou alteração será enviado novamente.":"Não foi possível carregar esta tela. Confira sua conexão e tente novamente."}</p><button type="button" disabled={recovering} onClick={reset} style={{padding:"14px 20px",border:0,borderRadius:12,background:"#c73726",color:"white",fontWeight:700,fontSize:16}}>Tentar novamente</button><p><button type="button" disabled={recovering} onClick={()=>location.reload()}>Recarregar página</button></p><small>Se já enviou um pedido ou alteração, confira o resultado antes de enviar de novo.</small></main>;
}
