"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {ArrowRight,Check,Image as ImageIcon,Sparkles,Send,RotateCcw,Download,Palette,Eye} from "lucide-react";
import {localStudio,proposalPatch,studioImagePatch,studioProposal,type StudioProposal} from "@/lib/studio-policy";
import {creationTarget,defaultCreationTarget,imageLabels,type CreationTarget} from "@/lib/creation-intent";
import {creationRequest} from "@/lib/creation-request";
import {assistantAnswer,type AssistantScreen} from "@/lib/assistant-help";
import {presentationForTheme,menuPresentation,layoutNames,type MenuPresentation} from "@/lib/menu-design";
import {themes,type RestaurantData} from "@/lib/domain";
import {galleryStyles,galleryDesign,type GalleryStyleId} from "@/lib/gallery-styles";
import {MiniMenu,Spinner} from "./ui";
import {z} from "zod";
import PromotionStudio from "./promotion-studio";
import SavedCreations from "./saved-creations";
import type {SavedCreation} from "@/lib/creation-history-policy";

type Usage={enabled:boolean;used:number;limit:number};
type Target=CreationTarget;
type Generated={url:string;asset:string;productId?:string};
type Attempt={path:string;body:Record<string,unknown>;base:string;target:Exclude<Target,"image">};
const usageSchema=z.object({enabled:z.boolean(),used:z.number().int().min(0),limit:z.number().int().min(0)});
const options=[{id:"visual",label:"Design e textos do cardápio"},{id:"image",label:"Imagem para a pizzaria"},{id:"logo",label:"Logo da pizzaria"},{id:"cover",label:"Capa do cardápio"},{id:"profile",label:"Imagem de perfil"},{id:"product",label:"Foto de um produto"}] as const;
const hints:Record<Target,string>={image:"Gere algo marcante de pizza de queijo, com queijo derretido e luz quente.",visual:"Quero uma lista artesanal, com letras elegantes, verde italiano e fotos ao lado dos sabores.",logo:"Um logo com forno a lenha, o nome da minha pizzaria e letras fáceis de ler.",cover:"Pizza saindo do forno, luz quente e espaço para o título do cardápio.",profile:"Um símbolo de pizza com fundo escuro, fácil de reconhecer no WhatsApp.",product:"Pizza vista de cima, sobre uma mesa de madeira, com luz natural."};
async function responseBody(r:Response){const raw=await r.json();return raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};}

export default function StudioChat({data,restaurantId,restaurantSlug,onApply,onClose,onPrepare,onNavigate,demo=false,initialMessage=""}:{data:RestaurantData;restaurantId?:string;restaurantSlug?:string;onApply?:(patch:Partial<RestaurantData>)=>void;onClose?:()=>void;onPrepare?:()=>Promise<RestaurantData|null>;onNavigate?:(screen:AssistantScreen,sourceText?:string)=>void;demo?:boolean;initialMessage?:string}){
 const [guide,setGuide]=useState<{reply:string;screen?:AssistantScreen;action?:string;sourceText?:string}|null>(null);
 const [message,setMessage]=useState(initialMessage),[target,setTarget]=useState<Target>("visual"),[mode,setMode]=useState<"local"|"ai">("ai"),[usage,setUsage]=useState<Usage|null>(null),[imageUsage,setImageUsage]=useState<Usage|null>(null),[productId,setProductId]=useState(""),[proposal,setProposal]=useState<StudioProposal|null>(null),[base,setBase]=useState(""),[generated,setGenerated]=useState<Generated|null>(null),[resultMode,setResultMode]=useState<"local"|"text"|"image"|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[applied,setApplied]=useState(false),[pending,setPending]=useState(false);
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
 useEffect(()=>{if(!initialMessage.trim())return;try{const next=localStudio(initialMessage,current.current);setProposal(next);setBase(JSON.stringify(current.current));setGenerated(null);setResultMode("local");setApplied(false);}catch{}},[initialMessage]);
 const source=base?JSON.parse(base) as RestaurantData:data;
 const patch=proposal?proposalPatch(proposal,source):{};
 const textPreview={...source,...patch};
 const preview={...textPreview,...studioImagePatch(textPreview,generated)};
 const stale=!!base&&JSON.stringify(data)!==base&&!applied;
 const changes=proposal?[proposal.name&&"Nome da pizzaria",proposal.theme&&"Estilo do cardápio",proposal.accent&&"Cor da pizzaria",proposal.presentation&&"Composição, letras e formato",proposal.tagline!==undefined&&"Frase de destaque",proposal.description!==undefined&&"Apresentação da pizzaria",proposal.productDescriptions.length>0&&"Descrições dos produtos",generated&&options.find(o=>o.id===generated.asset)?.label].filter(Boolean) as string[]:[];
 const quickAnswer=assistantAnswer(message);
 const {target:resolvedTarget,intent,needsChoice}=creationTarget(target,message,mode);
 const isImage=resolvedTarget!=="visual";
 const messageLimit=isImage?600:1600,messageTooLong=message.trim().length>messageLimit;
 const allowance=isImage?imageUsage:usage;
 const available=demo?!isImage:!!allowance&&(isImage||mode==="ai"?allowance.enabled:true);
 const limitReached=(isImage||mode==="ai")&&!!allowance&&allowance.used>=allowance.limit;
 async function csrf(){const r=await fetch("/api/auth/config",{cache:"no-store"}),v=await responseBody(r);if(!r.ok||typeof v.csrf!=="string")throw Error("Entre novamente para continuar.");return v.csrf;}
 function choose(value:Target){setTarget(value);setError("");}
 function recover(creation:SavedCreation){if(busy||pending)return;try{const snapshot=current.current;setError("");if(creation.kind==="text"){proposalPatch(creation.proposal,snapshot);setProposal(creation.proposal);setGenerated(null);setResultMode("text");setTarget("visual");}else{if(!restaurantId||!creation.url.startsWith("/media/"+restaurantId+"/"))throw Error("Esta imagem pertence a outra pizzaria.");if(creation.asset==="product"&&!snapshot.products.some(p=>p.id===productId)){setTarget("product");throw Error("Selecione acima o produto que vai receber esta foto e abra a criação novamente.");}const image={url:creation.url,asset:creation.asset,...(creation.asset==="product"?{productId}:{})};studioImagePatch(snapshot,image);setGenerated(image);setProposal({reply:"Criação recuperada. Confira antes de usar no rascunho.",productDescriptions:[]});setResultMode("image");setTarget(creation.asset);}setBase(JSON.stringify(snapshot));setApplied(false);}catch(e){setError(e instanceof Error?e.message:"Esta criação precisa ser conferida.");}}
 async function send(e?:FormEvent,retry=false){
  e?.preventDefault();if(busy||(pending&&!retry))return;
  if(!retry&&!quickAnswer&&messageTooLong){setError(`Sua ideia foi mantida. Resuma o pedido em até ${messageLimit===1600?"1.600":"600"} caracteres antes de criar.`);return;}
  if(!retry&&quickAnswer){
   setError("");setGuide(null);setPending(false);attempt.current=null;
   if(quickAnswer.kind==="guide"){
    setGuide(quickAnswer);setProposal(null);setGenerated(null);setBase("");setResultMode(null);setApplied(false);
   }else{
    try{
     const next=quickAnswer.kind==="rename"?
      {reply:"Veja o novo nome da pizzaria na prévia. A mudança só entra no rascunho se você confirmar.",name:quickAnswer.name,productDescriptions:[]}:
      localStudio(quickAnswer.message,current.current,productId||undefined);
     proposalPatch(next,current.current);
     setProposal(next);setGenerated(null);setBase(JSON.stringify(current.current));setResultMode("local");setApplied(false);
    }catch(error){setError(error instanceof Error?error.message:"Não consegui preparar essa alteração.");}
   }
   return;
  }
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
    setGuide(null);
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
 function readyStyle(id:GalleryStyleId){if(busy||pending)return;const next=galleryDesign(current.current,id,"");setGuide(null);setProposal({reply:"Veja como sua pizzaria fica neste estilo.",theme:next.theme,accent:next.accent,presentation:next.presentation,productDescriptions:[]});setBase(JSON.stringify(current.current));setGenerated(null);setResultMode("local");setApplied(false);setError("");}
 function adjustPresentation(value:Partial<MenuPresentation>){if(busy||pending||stale)return;setProposal(old=>({...old,reply:old?.reply||"Confira a composição do seu cardápio.",productDescriptions:old?.productDescriptions||[],presentation:{...menuPresentation(preview),...value}}));if(!base)setBase(JSON.stringify(current.current));setApplied(false);setResultMode(resultMode||"local");}
 function prepareImage(){const brief=proposal?.imageBrief;if(!brief)return;setTarget(brief.asset);setMessage(brief.description);setProductId(brief.productId||"");setError("");}
 return <><div className="pizza-studio">
  <section className="creation-form">
   <div className="creation-heading"><span className="creation-icon"><Sparkles size={23}/></span><div><h2>Sua assistente para montar a pizzaria.</h2><p>{quickAnswer?"Esta dúvida ou alteração simples pode ser resolvida aqui, sem consumir créditos.":isImage?"Descreva a imagem que você quer criar. Confira a arte antes de usar.":"Peça outro layout, fotos maiores, uma lista mais simples, letras e cores."}</p></div></div>
   <form onSubmit={e=>send(e)}>
    <fieldset disabled={busy||pending}>
     <label className="creation-field">O que você quer criar?<select value={target} onChange={e=>choose(e.target.value as Target)}>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
     {!quickAnswer&&(resolvedTarget==="product"||resolvedTarget==="visual"&&data.products.length>0)&&<label className="creation-field">{resolvedTarget==="product"?"Escolha o produto":"Para qual produto?"}<select value={productId} required={resolvedTarget==="product"} onChange={e=>setProductId(e.target.value)}><option value="">{resolvedTarget==="product"?"Selecione um produto":"Visual geral da pizzaria"}</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
     {!quickAnswer&&resolvedTarget==="product"&&!data.products.length&&<p className="creation-note">Cadastre um produto no Cardápio antes de criar a foto.</p>}
     <label className="creation-field">Conte sua ideia<textarea rows={4} value={message} maxLength={quickAnswer?1600:isImage?600:1600} onChange={e=>setMessage(e.target.value)} placeholder={hints[target]} /></label>
     <button className="creation-example" type="button" onClick={()=>setMessage(hints[target])}>Usar esta ideia <ArrowRight size={13}/></button>
     {!isImage&&<label className="creation-mode"><input type="checkbox" checked={mode==="ai"&&!demo} disabled={demo||!usage?.enabled} onChange={e=>{modeChosen.current=true;setMode(e.target.checked?"ai":"local");}}/><span>Usar inteligência artificial<small>{demo?"Aqui você experimenta os estilos prontos.":usage?.enabled?"Interpretação da ideia e descrições com IA.":"Os estilos prontos estão disponíveis abaixo."}</small></span></label>}
     {!quickAnswer&&isImage&&(target==="image"||target==="visual"&&intent)&&<p className="creation-note" role="status">{resolvedTarget==="cover"?"Vamos criar uma imagem horizontal que você poderá usar como capa.":`Vamos criar ${imageLabels[resolvedTarget as keyof typeof imageLabels]} com sua ideia.`}</p>}
     {!quickAnswer&&needsChoice&&<p className="creation-note" role="status">Escolha Logo, Capa, Perfil ou Foto em “O que você quer criar?” para gerar sua imagem.</p>}
    </fieldset>
    <div className="creation-submit"><span>{demo?"Prévia gratuita":quickAnswer?"Orientação ou ajuste local · sem créditos":!allowance?"Verificando disponibilidade…":!isImage&&mode==="local"?"Estilos prontos · sem limite":`Usa 1 ${isImage?"imagem":"criação de texto"} da cota · ${Math.max(0,allowance.limit-allowance.used)} disponíveis`}</span><button className="btn primary" disabled={busy||pending||(!quickAnswer&&!available)||(!quickAnswer&&limitReached)||(!quickAnswer&&needsChoice)||message.trim().length<(quickAnswer?2:isImage?10:5)||(!quickAnswer&&messageTooLong)||(!quickAnswer&&resolvedTarget==="product"&&!productId)}>{busy?<Spinner/>:isImage?<ImageIcon size={17}/>:<Send size={17}/>} {busy?"Criando…":quickAnswer?.kind==="guide"?"Explicar":quickAnswer?"Preparar prévia":target==="image"?"Criar imagem":resolvedTarget==="logo"?"Criar logo":resolvedTarget==="cover"?"Criar capa":isImage?"Criar imagem":"Criar prévia"}</button></div>
    {messageTooLong&&!quickAnswer&&<p className="creation-note" role="status">Sua ideia completa continua aqui. Resuma o pedido em até {messageLimit===1600?"1.600":"600"} caracteres antes de criar.</p>}
   </form>
   {limitReached&&<p className="creation-note">As criações com IA estão temporariamente indisponíveis para sua conta. Os estilos prontos continuam disponíveis.</p>}
   {error&&<div className="creation-error" role="alert"><p>{error}</p>{pending&&<div><button className="btn outline small" disabled={busy} onClick={()=>send(undefined,true)}><RotateCcw size={14}/> Ver resultado</button><button className="text-button" disabled={busy} onClick={()=>{attempt.current=null;setPending(false);setError("");}}>Descartar pedido</button></div>}</div>}
   {restaurantId&&!demo&&<SavedCreations key={restaurantId} restaurantId={restaurantId} onChoose={recover}/>}
   <details className="creation-styles"><summary><Palette size={17}/> Prefere escolher um estilo pronto?</summary><p>Escolha e veja a prévia. Não usa seu limite de IA.</p><div>{galleryStyles.map(t=><button type="button" key={t.id} disabled={busy||pending} onClick={()=>readyStyle(t.id)} aria-pressed={proposal?.presentation?.identity===t.id}><i style={{background:t.accent}}/>{t.title}{proposal?.presentation?.identity===t.id&&<Check size={14}/>}</button>)}</div></details>
  </section>
  {guide&&<section className="creation-help" role="status"><strong>Ajuda da pizzaria.on · sem créditos</strong><p>{guide.reply}</p>{guide.screen&&onNavigate&&<button type="button" className="btn outline small" onClick={()=>onNavigate(guide.screen!,guide.sourceText)}>{guide.action||"Abrir função"} <ArrowRight size={15}/></button>}</section>}
  <section className={`creation-result ${proposal?"has-result":""}`} aria-live="polite">
   {!proposal?<div className="creation-empty"><img src="/assets/pizza.webp" alt="Pizza artesanal com mozzarella e manjericão"/><div>{busy?<><Spinner/><h3>{isImage?"Criando sua imagem…":"Preparando sua prévia…"}</h3><p>O resultado aparece aqui quando estiver pronto.</p></>:<><span>FEITO PARA A SUA PIZZARIA</span><h3>Sua próxima ideia<br/>começa aqui.</h3><p>Escreva o que imagina. O resultado aparece aqui para você conferir.</p></>}</div></div>:<>
    <header><span><Eye size={17}/> {resultMode==="image"?"Imagem criada com IA":resultMode==="local"?"Prévia com estilo pronto":"Visual e textos com IA"}</span>{generated&&<a className="text-button" href={generated.url} target="_blank" rel="noopener noreferrer"><Download size={14}/> Abrir imagem</a>}</header>
    {generated?<div className={`creation-image ${generated.asset==="cover"?"is-cover":""}`}><img src={generated.url} alt={options.find(o=>o.id===generated.asset)?.label||"Imagem criada para sua pizzaria"}/></div>:<div className="creation-menu-preview"><MiniMenu data={preview} large/></div>}
    {!generated&&<details className="creation-layout-options"><summary>Ajustar composição</summary><div className="creation-layout-buttons">{(Object.keys(layoutNames) as MenuPresentation["layout"][]).map(layout=><button type="button" key={layout} disabled={busy||pending||stale} aria-pressed={menuPresentation(preview).layout===layout} onClick={()=>adjustPresentation({layout,hero:layout==="poster"?"cover":layout==="compact"?"compact":"split"})}>{layoutNames[layout]}</button>)}</div><div className="creation-layout-fields"><label>Letras<select value={menuPresentation(preview).font} disabled={busy||pending||stale} onChange={e=>adjustPresentation({font:e.target.value as MenuPresentation["font"]})}><option value="modern">Modernas</option><option value="serif">Elegantes</option><option value="bold">Fortes</option></select></label><label>Cantos<select value={menuPresentation(preview).corners} disabled={busy||pending||stale} onChange={e=>adjustPresentation({corners:e.target.value as MenuPresentation["corners"]})}><option value="soft">Suaves</option><option value="square">Retos</option></select></label></div></details>}
    <p className="creation-reply">{proposal.reply}</p>
    {proposal.productDescriptions.map(p=><div className="creation-copy" key={p.id}><b>{source.products.find(item=>item.id===p.id)?.name}</b><p>{p.description}</p></div>)}
    {!generated&&proposal.imageBrief&&<div className="creation-copy"><b>Ideia para {imageLabels[proposal.imageBrief.asset]}</b><p>{proposal.imageBrief.description}</p><button className="text-button" type="button" disabled={busy||pending} onClick={prepareImage}>Usar esta ideia para criar uma imagem <ArrowRight size={14}/></button></div>}
    {changes.length>0&&<div className="creation-changes">{changes.map(c=><span key={c}><Check size={12}/>{c}</span>)}</div>}
    {stale&&<p className="creation-error">Você mudou o cardápio. Crie outra prévia para usar as informações atuais.</p>}
    <footer><p>{generated?.asset==="product"?"Imagem ilustrativa. Confira se representa o produto que você vende.":"Só entra no cardápio depois de você publicar."}</p>{onApply?<button className="btn dark full" type="button" disabled={busy||!changes.length||applied||stale} onClick={apply}>{applied?<><Check size={17}/> Usando no rascunho</>:<>Usar no cardápio <ArrowRight size={17}/></>}</button>:<a className="btn primary" href="/cadastro?next=%2Fapp%3Fnew%3D1">Criar minha pizzaria <ArrowRight size={17}/></a>}{applied&&<small>Agora use Publicar ou Atualizar no painel.</small>}{onClose&&<button className="text-button" onClick={onClose}>Voltar ao painel</button>}</footer>
   </>}
  </section>
 </div>{restaurantId&&!demo&&data.products.length>0&&<div className="pizza-studio-promotion"><PromotionStudio data={data} restaurantId={restaurantId} slug={restaurantSlug||""} onPrepare={onPrepare} onMenu={()=>onNavigate?.("menu")}/></div>}</>;
}
