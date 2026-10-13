"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {ArrowRight,Check,Image as ImageIcon,Sparkles,Send,RotateCcw,Download,Palette,Eye} from "lucide-react";
import {localStudio,proposalPatch,studioImagePatch,studioProposal,type StudioProposal} from "@/lib/studio-policy";
import {creationTarget,defaultCreationTarget,imageLabels,type CreationTarget} from "@/lib/creation-intent";
import {creationRequest} from "@/lib/creation-request";
import {themes,type RestaurantData} from "@/lib/domain";
import {MiniMenu,Spinner} from "./ui";
import {z} from "zod";
import SavedCreations from "./saved-creations";
import type {SavedCreation} from "@/lib/creation-history-policy";

type Usage={enabled:boolean;used:number;limit:number};
type Target=CreationTarget;
type Generated={url:string;asset:string;productId?:string};
type Attempt={path:string;body:Record<string,unknown>;base:string;target:Exclude<Target,"image">};
const usageSchema=z.object({enabled:z.boolean(),used:z.number().int().min(0),limit:z.number().int().min(1)});
const options=[{id:"image",label:"Imagem para a pizzaria"},{id:"logo",label:"Logo da pizzaria"},{id:"cover",label:"Capa do cardápio"},{id:"profile",label:"Imagem de perfil"},{id:"product",label:"Foto de um produto"},{id:"visual",label:"Cores e textos do cardápio"}] as const;
const hints:Record<Target,string>={image:"Gere algo marcante de pizza de queijo, com queijo derretido e luz quente.",visual:"Quero um cardápio escuro, com vermelho e descrições mais apetitosas.",logo:"Um logo com forno a lenha, o nome da minha pizzaria e letras fáceis de ler.",cover:"Pizza saindo do forno, luz quente e espaço para o título do cardápio.",profile:"Um símbolo de pizza com fundo escuro, fácil de reconhecer no WhatsApp.",product:"Pizza vista de cima, sobre uma mesa de madeira, com luz natural."};
async function responseBody(r:Response){const raw=await r.json();return raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};}

export default function StudioChat({data,restaurantId,onApply,onClose,onPrepare,demo=false,initialMessage=""}:{data:RestaurantData;restaurantId?:string;onApply?:(patch:Partial<RestaurantData>)=>void;onClose?:()=>void;onPrepare?:()=>Promise<RestaurantData|null>;demo?:boolean;initialMessage?:string}){
 const [message,setMessage]=useState(initialMessage),[target,setTarget]=useState<Target>(demo||!!initialMessage?"visual":defaultCreationTarget),[mode,setMode]=useState<"local"|"ai">("ai"),[usage,setUsage]=useState<Usage|null>(null),[imageUsage,setImageUsage]=useState<Usage|null>(null),[productId,setProductId]=useState(""),[proposal,setProposal]=useState<StudioProposal|null>(null),[base,setBase]=useState(""),[generated,setGenerated]=useState<Generated|null>(null),[resultMode,setResultMode]=useState<"local"|"text"|"image"|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[applied,setApplied]=useState(false),[pending,setPending]=useState(false);
 const attempt=useRef<Attempt|null>(null),current=useRef(data),mounted=useRef(true),modeChosen=useRef(false);current.current=data;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  if(!restaurantId||demo)return;
  const controller=new AbortController();
  for(const [path,setter] of [["studio",setUsage],["ai/images",setImageUsage]] as const){
   fetch(`/api/restaurants/${restaurantId}/${path}`,{cache:"no-store",signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("Não foi possível verificar a IA. Atualize a página.");return usageSchema.parse(await responseBody(r));}).then(value=>{if(!mounted.current)return;setter(value);if(path==="studio"&&!modeChosen.current)setMode(value.enabled?"ai":"local");}).catch(e=>{if(!controller.signal.aborted&&mounted.current)setError(e instanceof Error?e.message:"Não foi possível verificar a IA.");});
  }
  return()=>controller.abort();
 },[restaurantId,demo]);
 const source=base?JSON.parse(base) as RestaurantData:data;
 const patch=proposal?proposalPatch(proposal,source):{};
 const textPreview={...source,...patch};
 const preview={...textPreview,...studioImagePatch(textPreview,generated)};
 const stale=!!base&&JSON.stringify(data)!==base&&!applied;
 const changes=proposal?[proposal.theme&&"Estilo do cardápio",proposal.accent&&"Cor da pizzaria",proposal.tagline!==undefined&&"Frase de destaque",proposal.description!==undefined&&"Apresentação da pizzaria",proposal.productDescriptions.length>0&&"Descrições dos produtos",generated&&options.find(o=>o.id===generated.asset)?.label].filter(Boolean) as string[]:[];
 const {target:resolvedTarget,intent,needsChoice}=creationTarget(target,message,mode);
 const isImage=resolvedTarget!=="visual";
 const allowance=isImage?imageUsage:usage;
 const available=demo?!isImage:!!allowance&&(isImage||mode==="ai"?allowance.enabled:true);
 const limitReached=(isImage||mode==="ai")&&!!allowance&&allowance.used>=allowance.limit;
 async function csrf(){const r=await fetch("/api/auth/config",{cache:"no-store"}),v=await responseBody(r);if(!r.ok||typeof v.csrf!=="string")throw Error("Entre novamente para continuar.");return v.csrf;}
 function choose(value:Target){setTarget(value);setError("");}
 function recover(creation:SavedCreation){if(busy||pending)return;try{const snapshot=current.current;setError("");if(creation.kind==="text"){proposalPatch(creation.proposal,snapshot);setProposal(creation.proposal);setGenerated(null);setResultMode("text");setTarget("visual");}else{if(!restaurantId||!creation.url.startsWith("/media/"+restaurantId+"/"))throw Error("Esta imagem pertence a outra pizzaria.");if(creation.asset==="product"&&!snapshot.products.some(p=>p.id===productId)){setTarget("product");throw Error("Selecione acima o produto que vai receber esta foto e abra a criação novamente.");}const image={url:creation.url,asset:creation.asset,...(creation.asset==="product"?{productId}:{})};studioImagePatch(snapshot,image);setGenerated(image);setProposal({reply:"Criação recuperada. Confira antes de usar no rascunho.",productDescriptions:[]});setResultMode("image");setTarget(creation.asset);}setBase(JSON.stringify(snapshot));setApplied(false);}catch(e){setError(e instanceof Error?e.message:"Esta criação precisa ser conferida.");}}
 async function send(e?:FormEvent,retry=false){
  e?.preventDefault();if(busy)return;
  if(!retry&&needsChoice){setError("Escolha o tipo de imagem acima para criar sua imagem com IA.");return;}
  if(!retry&&message.trim().length<(isImage?10:5))return;
  setBusy(true);setError("");
  try{
   const prepared=!retry&&onPrepare?await onPrepare():current.current;
   if(!prepared)throw Error("Salve as informações da pizzaria antes de criar a imagem.");
   if(!mounted.current)return;
   const snapshot=JSON.stringify(prepared);
   if(demo){const next=localStudio(message.trim(),current.current,productId||undefined);setProposal(next);setBase(snapshot);setGenerated(null);setResultMode("local");setApplied(false);return;}
   if(!restaurantId)throw Error("Escolha sua pizzaria para começar.");
   if(!retry){
    const request=creationRequest(target,message,mode,prepared,crypto.randomUUID(),productId||undefined);
    attempt.current={...request,base:snapshot};
    setProposal(null);setGenerated(null);setResultMode(null);setApplied(false);
   }
   const job=attempt.current;if(!job)throw Error("Escreva uma nova ideia para começar.");
   if(job.base!==snapshot)throw Error("Você mudou o cardápio. Descarte este pedido e crie uma nova ideia.");
   setPending(true);
   const r=await fetch(`/api/restaurants/${restaurantId}/${job.path}`,{method:"POST",headers:{"Content-Type":"application/json","x-pedido-csrf":await csrf()},body:JSON.stringify(job.body),signal:AbortSignal.timeout(job.path==="ai/images"?95000:65000)});
   const v=await responseBody(r);if(!mounted.current)return;
   if(!r.ok){
    if(v.attempt==="cancelled"||v.attempt==="failed"||[400,401,403,422,429].includes(r.status)){attempt.current=null;setPending(false);}
    throw Error(typeof v.error==="string"?v.error:"Não foi possível concluir. Verifique o resultado antes de pedir outra vez.");
   }
   if(job.path==="ai/images"){
    if(typeof v.url!=="string"||!v.url.startsWith(`/media/${restaurantId}/`)||v.asset!==job.target)throw Error("Não recebemos uma imagem válida.");
    setImageUsage(usageSchema.parse(v.usage));setGenerated({url:v.url,asset:job.target,...(job.target==="product"?{productId:String(job.body.productId)}:{})});setProposal({reply:"Sua imagem está pronta. Confira abaixo e use no cardápio se gostar.",productDescriptions:[]});setResultMode("image");
   }else{
    if(v.mode!=="ai"&&v.mode!=="local")throw Error("Não foi possível conferir a origem desta prévia.");
    const next=studioProposal.parse(v.proposal);proposalPatch(next,current.current);setUsage(usageSchema.parse(v.usage));setProposal(next);setGenerated(null);setResultMode(v.mode==="ai"?"text":"local");
   }
   setBase(job.base);setApplied(false);attempt.current=null;setPending(false);
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:"Não conseguimos concluir. Confira o resultado antes de gerar novamente.");}
  finally{
   if(mounted.current){setBusy(false);if(restaurantId&&!demo)for(const [path,setter] of [["studio",setUsage],["ai/images",setImageUsage]] as const){fetch(`/api/restaurants/${restaurantId}/${path}`,{cache:"no-store"}).then(async r=>r.ok?usageSchema.parse(await responseBody(r)):null).then(v=>{if(v&&mounted.current)setter(v);}).catch(()=>{});}}
  }
 }
 function apply(){if(stale){setError("O cardápio mudou. Prepare uma nova ideia antes de usar.");return;}if(!proposal||!changes.length)return;const text=proposalPatch(proposal,current.current);onApply?.({...text,...studioImagePatch({...current.current,...text},generated)});setApplied(true);}
 function readyStyle(theme:typeof themes[number]){if(busy||pending)return;setProposal({reply:"Veja como sua pizzaria fica neste estilo.",theme:theme.id,accent:theme.color,productDescriptions:[]});setBase(JSON.stringify(current.current));setGenerated(null);setResultMode("local");setApplied(false);setError("");}
 function prepareImage(){const brief=proposal?.imageBrief;if(!brief)return;setTarget(brief.asset);setMessage(brief.description);setProductId(brief.productId||"");setError("");}
 return <div className="pizza-studio">
  <section className="creation-form">
   <div className="creation-heading"><span className="creation-icon"><Sparkles size={23}/></span><div><h2>Uma ideia. A cara da sua pizzaria.</h2><p>{isImage?"Descreva a imagem que você quer criar. Confira a arte antes de usar.":"Peça cores, frases e descrições para o cardápio."}</p></div></div>
   <form onSubmit={e=>send(e)}>
    <fieldset disabled={busy||pending}>
     <label className="creation-field">O que você quer criar?<select value={target} onChange={e=>choose(e.target.value as Target)}>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
     {(resolvedTarget==="product"||resolvedTarget==="visual"&&data.products.length>0)&&<label className="creation-field">{resolvedTarget==="product"?"Escolha o produto":"Para qual produto?"}<select value={productId} required={resolvedTarget==="product"} onChange={e=>setProductId(e.target.value)}><option value="">{resolvedTarget==="product"?"Selecione um produto":"Visual geral da pizzaria"}</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
     {resolvedTarget==="product"&&!data.products.length&&<p className="creation-note">Cadastre um produto no Cardápio antes de criar a foto.</p>}
     <label className="creation-field">Conte sua ideia<textarea rows={4} value={message} maxLength={isImage?600:1600} onChange={e=>setMessage(e.target.value)} placeholder={hints[target]} /></label>
     <button className="creation-example" type="button" onClick={()=>setMessage(hints[target])}>Usar esta ideia <ArrowRight size={13}/></button>
     {!isImage&&<label className="creation-mode"><input type="checkbox" checked={mode==="ai"&&!demo} disabled={demo||!usage?.enabled} onChange={e=>{modeChosen.current=true;setMode(e.target.checked?"ai":"local");}}/><span>Usar inteligência artificial<small>{demo?"Aqui você experimenta os estilos prontos.":usage?.enabled?"Sugestões de visual e descrições.":"Os estilos prontos estão disponíveis abaixo."}</small></span></label>}
     {isImage&&(target==="image"||target==="visual"&&intent)&&<p className="creation-note" role="status">{resolvedTarget==="cover"?"Vamos criar uma imagem horizontal que você poderá usar como capa.":`Vamos criar ${imageLabels[resolvedTarget as keyof typeof imageLabels]} com sua ideia.`}</p>}
     {needsChoice&&<p className="creation-note" role="status">Escolha Logo, Capa, Perfil ou Foto em “O que você quer criar?” para gerar sua imagem.</p>}
    </fieldset>
    <div className="creation-submit"><span>{demo?"Prévia gratuita":!allowance?"Verificando disponibilidade…":!isImage&&mode==="local"?"Estilos prontos · sem limite":isImage?"Geração com IA · sujeita à disponibilidade":"Criar com IA · sujeita à disponibilidade"}</span><button className="btn primary" disabled={busy||pending||!available||limitReached||needsChoice||message.trim().length<(isImage?10:5)||isImage&&message.length>600||resolvedTarget==="product"&&!productId}>{busy?<Spinner/>:isImage?<ImageIcon size={17}/>:<Send size={17}/>} {busy?"Criando…":target==="image"?"Criar imagem":resolvedTarget==="logo"?"Criar logo":resolvedTarget==="cover"?"Criar capa":isImage?"Criar imagem":"Criar prévia"}</button></div>
    {isImage&&message.length>600&&<p className="creation-note">Resuma sua ideia em até 600 caracteres.</p>}
   </form>
   {limitReached&&<p className="creation-note">As criações com IA estão temporariamente indisponíveis para sua conta. Os estilos prontos continuam disponíveis.</p>}
   {error&&<div className="creation-error" role="alert"><p>{error}</p>{pending&&<div><button className="btn outline small" disabled={busy} onClick={()=>send(undefined,true)}><RotateCcw size={14}/> Ver resultado</button><button className="text-button" disabled={busy} onClick={()=>{attempt.current=null;setPending(false);setError("");}}>Descartar pedido</button></div>}</div>}
   {restaurantId&&!demo&&<SavedCreations key={restaurantId} restaurantId={restaurantId} onChoose={recover}/>}
   <details className="creation-styles"><summary><Palette size={17}/> Prefere escolher um estilo pronto?</summary><p>Escolha e veja a prévia. Não usa seu limite de IA.</p><div>{themes.map(t=><button type="button" key={t.id} disabled={busy||pending} onClick={()=>readyStyle(t)} aria-pressed={proposal?.theme===t.id}><i style={{background:t.color}}/>{t.name}{proposal?.theme===t.id&&<Check size={14}/>}</button>)}</div></details>
  </section>
  <section className={`creation-result ${proposal?"has-result":""}`} aria-live="polite">
   {!proposal?<div className="creation-empty"><img src="/assets/pizza.webp" alt="Pizza artesanal com mozzarella e manjericão"/><div>{busy?<><Spinner/><h3>{isImage?"Criando sua imagem…":"Preparando sua prévia…"}</h3><p>O resultado aparece aqui quando estiver pronto.</p></>:<><span>FEITO PARA A SUA PIZZARIA</span><h3>Sua próxima ideia<br/>começa aqui.</h3><p>Escreva o que imagina. O resultado aparece aqui para você conferir.</p></>}</div></div>:<>
    <header><span><Eye size={17}/> {resultMode==="image"?"Imagem criada com IA":resultMode==="local"?"Prévia com estilo pronto":"Visual e textos com IA"}</span>{generated&&<a className="text-button" href={generated.url} target="_blank" rel="noopener noreferrer"><Download size={14}/> Abrir imagem</a>}</header>
    {generated?<div className={`creation-image ${generated.asset==="cover"?"is-cover":""}`}><img src={generated.url} alt={options.find(o=>o.id===generated.asset)?.label||"Imagem criada para sua pizzaria"}/></div>:<div className="creation-menu-preview"><MiniMenu data={preview} large/></div>}
    <p className="creation-reply">{proposal.reply}</p>
    {proposal.productDescriptions.map(p=><div className="creation-copy" key={p.id}><b>{source.products.find(item=>item.id===p.id)?.name}</b><p>{p.description}</p></div>)}
    {!generated&&proposal.imageBrief&&<div className="creation-copy"><b>Ideia para {imageLabels[proposal.imageBrief.asset]}</b><p>{proposal.imageBrief.description}</p><button className="text-button" type="button" disabled={busy||pending} onClick={prepareImage}>Usar esta ideia para criar uma imagem <ArrowRight size={14}/></button></div>}
    {changes.length>0&&<div className="creation-changes">{changes.map(c=><span key={c}><Check size={12}/>{c}</span>)}</div>}
    {stale&&<p className="creation-error">Você mudou o cardápio. Crie outra prévia para usar as informações atuais.</p>}
    <footer><p>{generated?.asset==="product"?"Imagem ilustrativa. Confira se representa o produto que você vende.":"Só entra no cardápio depois de você publicar."}</p>{onApply?<button className="btn dark full" type="button" disabled={busy||!changes.length||applied||stale} onClick={apply}>{applied?<><Check size={17}/> Usando no rascunho</>:<>Usar no cardápio <ArrowRight size={17}/></>}</button>:<a className="btn primary" href="/cadastro?next=%2Fapp%3Fnew%3D1">Criar minha pizzaria <ArrowRight size={17}/></a>}{applied&&<small>Agora use Publicar ou Atualizar no painel.</small>}{onClose&&<button className="text-button" onClick={onClose}>Voltar ao painel</button>}</footer>
   </>}
  </section>
 </div>;
}
