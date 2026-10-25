"use client";

import {useEffect,useState} from "react";
import {ArrowRight,Download,FilePenLine,ShieldCheck} from "lucide-react";
import styles from "./registration-access-card.module.css";
import {buildRegistrationCardSvg} from "@/lib/registration-card-svg";

async function localImageAsDataUrl(path:string):Promise<string>{
  try{
    const response=await fetch(path,{cache:"force-cache"});
    if(!response.ok)throw new Error("asset unavailable");
    const blob=await response.blob();
    if(!blob.type.startsWith("image/"))return "";
    return await new Promise<string>(resolve=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(typeof reader.result==="string"?reader.result:"");
      reader.onerror=()=>resolve("");
      reader.readAsDataURL(blob);
    });
  }catch{return "";}
}

function saveBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}

async function asPng(svg:string):Promise<Blob>{
  const svgBlob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
  const uri=URL.createObjectURL(svgBlob);
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{
      image.onload=()=>resolve();
      image.onerror=()=>reject(new Error("Não foi possível montar a imagem."));
      image.src=uri;
    });
    const canvas=document.createElement("canvas");
    canvas.width=image.naturalWidth;
    canvas.height=image.naturalHeight;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Seu navegador não permitiu criar a imagem.");
    ctx.drawImage(image,0,0);
    return await new Promise<Blob>((resolve,reject)=>{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Não foi possível salvar a imagem.")),"image/png");
    });
  }finally{URL.revokeObjectURL(uri);}
}

export default function RegistrationAccessCard({email,name,password,onContinue}:{email:string;name:string;password:string;onContinue:()=>void}){
  const [domain,setDomain]=useState("pizzaria.on");
  const [includePassword,setIncludePassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>setDomain(window.location.host),[]);
  async function download(format:"png"|"svg"){
    setBusy(true);setError("");
    try{
      const [pizzaDataUrl,logoDataUrl]=await Promise.all([
        localImageAsDataUrl("/assets/pizza.webp"),
        localImageAsDataUrl("/assets/pedido-symbol.png")
      ]);
      if(!pizzaDataUrl||!logoDataUrl)throw new Error("Não foi possível carregar as imagens oficiais da Pizzaria.on. Tente novamente.");
      const svg=buildRegistrationCardSvg({name,email,password,domain,includePassword,pizzaDataUrl,logoDataUrl});
      const filename="pizzaria-on-meu-acesso."+(format==="png"?"png":"svg");
      saveBlob(format==="png"?await asPng(svg):new Blob([svg],{type:"image/svg+xml;charset=utf-8"}),filename);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível gerar sua imagem.");}
    finally{setBusy(false);}
  }
  return <main className={styles.page}>
    <header className={styles.header}><span className={styles.wordmark}>pizzaria<span>.on</span></span><span>Cadastro concluído</span></header>
    <section className={styles.panel} aria-label="Salvar dados de acesso">
      <div className={styles.preview} role="img" aria-label="Prévia do cartão Pizzaria.on">
        <div className={styles.previewText}>
          <span className={styles.micro}>SEU CARDÁPIO, SUA IDENTIDADE</span>
          <h1>Meu acesso</h1>
          <p>Conta de {name}</p>
          <span className={styles.fieldTitle}>MEU E-MAIL</span><strong>{email}</strong>
          <span className={styles.fieldTitle}>MINHA SENHA</span>
          <strong className={styles.secret}>{includePassword?password:"••••••••••••"}</strong>
          <span className={styles.safeNote}>{includePassword?"Imagem com senha: não compartilhe.":"Senha protegida. Não exibida na imagem."}</span>
          <span className={styles.website}>Acesse: {domain}</span>
        </div>
        <img src="/assets/pizza.webp" alt="" className={styles.pizza}/>
      </div>
      <div className={styles.details}>
        <div className={styles.verified}><ShieldCheck size={18}/> Conta criada com sucesso</div>
        <h2>Guarde seu acesso à Pizzaria.on</h2>
        <p>Preparamos um cartão personalizado com o seu e-mail, a nossa marca e o endereço para entrar no site.</p>
        <label className={styles.option}>
          <input type="checkbox" checked={includePassword} onChange={event=>setIncludePassword(event.target.checked)}/>
          <span>Incluir minha senha na imagem</span>
        </label>
        <p className={styles.warning}>{includePassword?"Atenção: qualquer pessoa que veja ou receba essa imagem poderá entrar na sua conta. Guarde em local privado.":"Mais seguro: deixe esta opção desligada e salve a senha no gerenciador de senhas do navegador ou do celular."}</p>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} type="button" disabled={busy} onClick={()=>void download("png")}><Download size={18}/>{busy?"Gerando imagem…":"Baixar meu cartão (PNG)"}</button>
        <button className={styles.secondary} type="button" disabled={busy} onClick={()=>void download("svg")}><FilePenLine size={18}/>Baixar versão editável (SVG)</button>
        <button className={styles.continue} type="button" disabled={busy} onClick={onContinue}>Ir para meu painel <ArrowRight size={17}/></button>
      </div>
    </section>
  </main>;
}
