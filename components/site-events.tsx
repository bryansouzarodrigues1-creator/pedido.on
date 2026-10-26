"use client";
import {useEffect} from "react";
export default function SiteEvents(){useEffect(()=>{
 const path=location.pathname,page=path==="/"?"inicio":path==="/calculadora"?"calculadora":path==="/cadastro"?"cadastro":path==="/entrar"?"entrar":path==="/app"?"painel":/^\/p\//.test(path)?"cardapio":null;
 if(!page)return;let session="";try{session=sessionStorage.getItem("pizzaria-visit-session")||crypto.randomUUID();sessionStorage.setItem("pizzaria-visit-session",session);}catch{return;}
 let reported=false;const send=(kind:"visit"|"client_error")=>{void fetch("/api/site-events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session,page,kind}),keepalive:true}).catch(()=>{});};send("visit");const error=()=>{if(!reported){reported=true;send("client_error");}};window.addEventListener("error",error);window.addEventListener("unhandledrejection",error);return()=>{window.removeEventListener("error",error);window.removeEventListener("unhandledrejection",error);};
 },[]);return null;}
