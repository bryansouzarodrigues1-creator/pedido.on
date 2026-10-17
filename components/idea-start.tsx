"use client";
import {useEffect,useRef,useState,type ChangeEvent,type FormEvent} from "react";
import {ArrowRight,Check,Link2,Paperclip,Sparkles,X,FileText,ImagePlus,RefreshCw} from "lucide-react";
import {demoRestaurant,defaultRestaurant,type RestaurantData} from "@/lib/domain";
import type {ReaderItem} from "@/lib/menu-reader-policy";
import {galleryDesign,galleryStyle,suggestedGalleryStyles,supportsLocalRefinement,type GalleryStyleId} from "@/lib/gallery-styles";

import {guestReadingKey,type MenuLaunch} from "@/lib/menu-launch";
import {loadLaunchCheckpoint,saveLaunchCheckpoint} from "@/lib/menu-launch-checkpoint";
import {menuLaunchAccountPath} from "@/lib/menu-launch-client";
import {inspectMenuSourceText} from "@/lib/menu-source-links";
import {menuFileText} from "@/lib/menu-file";
import {fetchMenuSource} from "@/lib/menu-source-client";
import {loadReading,saveReading,type Reading} from "@/lib/menu-reader-storage";
import {prepareMenuPhoto,recognizeMenuPhotos} from "@/lib/menu-ocr";
import {applyReaderItems,readMenuPages,readerItemReady,type ReaderPage} from "@/lib/menu-reader-policy";
import {MiniMenu,Spinner} from "./ui";
import {imageFromFile,loadBrandAssets,saveBrandAssets,type BrandAssets} from "@/lib/guest-brand-assets";
import {nameFromBriefing} from "@/lib/studio-policy";

function makePreview(items:ReaderItem[]):RestaurantData{const sample=demoRestaurant("editorial");if(!items.length)return sample;const base=defaultRestaurant("Sua pizzaria");const ready=items.map(item=>({...item,selected:item.selected&&readerItemReady(item)}));return ready.some(item=>item.selected)?{...base,...applyReaderItems(base,ready)}:base;}
export default function IdeaStart(){
 const [initialized,setInitialized]=useState(false),[brandAssets,setBrandAssets]=useState<BrandAssets|null>(null),[brandName,setBrandName]=useState(""),[storageError,setStorageError]=useState("");
 const [styleId,setStyleId]=useState<GalleryStyleId|null>(null),[round,setRound]=useState(0),[refinement,setRefinement]=useState(""),[feedback,setFeedback]=useState(""),[localFeedbackNote,setLocalFeedbackNote]=useState(""),[chatOpen,setChatOpen]=useState(false);
 const [idea,setIdea]=useState(""),[sourceOpen,setSourceOpen]=useState(false),[sourceText,setSourceText]=useState(""),[pages,setPages]=useState<ReaderPage[]>([]),[preview,setPreview]=useState<RestaurantData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[readingLabel,setReadingLabel]=useState(""),[imported,setImported]=useState(0),[saving,setSaving]=useState(false);
 const abort=useRef<AbortController|null>(null),alive=useRef(true),reading=useRef<Reading|null>(null),launch=useRef<MenuLaunch|null>(null),galleryRef=useRef<HTMLElement|null>(null),styleGridRef=useRef<HTMLDivElement|null>(null),scrollToResult=useRef(false);
 useEffect(()=>{alive.current=true;void loadLaunchCheckpoint().then(async saved=>{if(!saved||!alive.current)return;launch.current=saved;setIdea(saved.idea);setSourceText(saved.sourceText);setBrandName(saved.brandName||"");if(saved.sourceText||saved.hasPhotos||saved.hasAssets)setSourceOpen(true);setStyleId(saved.styleId||null);setRefinement(saved.refinement||"");const [v,images]=await Promise.all([loadReading(guestReadingKey(saved.id)).catch(()=>null),loadBrandAssets(guestReadingKey(saved.id)).catch(()=>null)]);if(!alive.current)return;if(v){setPages(v.pages);reading.current=v;setImported(v.items.length);}if(images)setBrandAssets(images);if(saved.hasPhotos&&!v?.pages.length||saved.hasAssets&&!images?.logo&&!images?.cover)setNotice("Sua ideia foi recuperada, mas alguns anexos não estão disponíveis. Envie esses arquivos novamente antes de continuar.");if(saved.previewReady)setPreview(makePreview(v?.items||[]));}).catch(()=>{if(alive.current)setStorageError("Não foi possível recuperar o projeto deste aparelho.");}).finally(()=>{if(alive.current)setInitialized(true);});return()=>{alive.current=false;abort.current?.abort();};},[]);
 useEffect(()=>{if(!initialized||!idea&&!brandName&&!sourceText&&!pages.length&&!brandAssets&&!preview)return;const value:MenuLaunch={id:launch.current?.id||crypto.randomUUID(),savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,sourceText,hasPhotos:!!pages.length,hasAssets:!!(brandAssets?.logo||brandAssets?.cover),styleId:styleId||undefined,refinement,previewReady:!!preview};launch.current=value;void saveLaunchCheckpoint(value).then(()=>{if(alive.current)setStorageError("");}).catch(e=>{if(alive.current)setStorageError(e instanceof Error?e.message:"Não foi possível guardar sua ideia.");});},[idea,brandName,sourceText,pages.length,brandAssets,styleId,refinement,preview,initialized]);
 useEffect(()=>{if(preview&&scrollToResult.current){scrollToResult.current=false;requestAnimationFrame(()=>galleryRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));}},[preview]);
 useEffect(()=>{if(!initialized||!launch.current||!pages.length&&!sourceText)return;const id=launch.current.id,timer=setTimeout(()=>{const checkpoint={restaurantId:guestReadingKey(id),savedAt:Date.now(),pages,items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText};void saveReading(checkpoint).catch(()=>{if(alive.current&&pages.length)setNotice("As fotos estão nesta página, mas o navegador não conseguiu guardá-las. Libere o armazenamento antes de continuar.");});},400);return()=>clearTimeout(timer);},[initialized,pages,sourceText]);
 async function files(e:ChangeEvent<HTMLInputElement>){const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setError("");setBusy(true);try{
  const photos=files.filter(f=>f.type.startsWith("image/"));if(pages.length+photos.length>8)throw Error("Envie até oito fotos por vez.");
  const added:ReaderPage[]=[];let text=sourceText;
  for(const file of files){if(file.type.startsWith("image/"))added.push(await prepareMenuPhoto(file));else{if(file.size>240000)throw Error("Envie TXT/CSV com até 60 mil caracteres.");text+=(text?"\n":"")+menuFileText(file.name,await file.text());}}
  if(text.length>60000)throw Error("Importe uma parte por vez, com até 60 mil caracteres.");setPages(old=>[...old,...added]);setSourceText(text);setSourceOpen(true);reading.current=null;setPreview(null);
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir o arquivo.");}finally{setBusy(false);}}
 async function uploadBrand(e:ChangeEvent<HTMLInputElement>,kind:"logo"|"cover"){const file=e.target.files?.[0];e.target.value="";if(!file||busy||saving)return;setBusy(true);setError("");try{
   const image=await imageFromFile(file),id=launch.current?.id||crypto.randomUUID(),value:MenuLaunch={id,savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,sourceText,hasPhotos:!!pages.length,hasAssets:true,styleId:styleId||undefined,refinement,previewReady:!!preview};
   const old=brandAssets||{key:guestReadingKey(id)},next={...old,key:guestReadingKey(id),[kind]:image};
   await saveBrandAssets(next);await saveLaunchCheckpoint(value);launch.current=value;setBrandAssets(next);setSourceOpen(true);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível guardar a imagem da marca.");}finally{setBusy(false);}}
 async function generate(e?:FormEvent){
  e?.preventDefault();if(busy)return;setError("");setNotice("");setBusy(true);const controller=new AbortController();abort.current=controller;
  try{
   let text=sourceText,source=inspectMenuSourceText(text),ready=pages;
   if(source.links.length===1&&!source.menuText&&!pages.length){
    setReadingLabel("Consultando o link do iFood…");const result=await fetchMenuSource(source.links[0].url);setNotice(result.message);if(result.text){text=source.links[0].url+"\n"+result.text;setSourceText(text);source=inspectMenuSourceText(text);}else setSourceOpen(true);
   }
   const missing=pages.filter(p=>!p.lines.length);
   if(missing.length){const scanned=await recognizeMenuPhotos(missing,controller.signal,(_,label)=>{if(alive.current)setReadingLabel(label);});ready=pages.map(p=>scanned.find(s=>s.id===p.id)||p);if(!alive.current)return;setPages(ready);}
   const input=ready.map(p=>({id:p.id,lines:p.lines}));if(source.menuText.trim())input.push({id:"text",lines:source.menuText.split("\n").map(text=>({text}))});
   const result=input.length?readMenuPages(input):{items:[],unmatched:[]};
   if(input.length&&!result.items.length)setNotice("A fonte não trouxe produtos com preço legível. Cole o texto com os preços ou tente uma imagem mais nítida.");
   scrollToResult.current=true;setPreview(makePreview(result.items));setChatOpen(false);setImported(result.items.length);
   if(!launch.current)launch.current={id:crypto.randomUUID(),savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,sourceText:text,hasPhotos:!!ready.length};
   reading.current={restaurantId:guestReadingKey(launch.current.id),savedAt:Date.now(),pages:ready,items:result.items,unmatched:result.unmatched,text};
   await saveReading(reading.current).catch(()=>{});
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não foi possível preparar a prévia.");}finally{if(alive.current){setBusy(false);setReadingLabel("");}abort.current=null;}
 }
 async function removeBrand(kind:"logo"|"cover"){if(!brandAssets||busy||saving)return;setBusy(true);setError("");try{const next={...brandAssets,[kind]:undefined};await saveBrandAssets(next);setBrandAssets(next);}catch{setError("Não foi possível remover esta imagem. Tente novamente.");}finally{setBusy(false);}}
 async function continueSetup(requestAi=false){
  if(busy||saving)return;setSaving(true);setError("");try{
   if(!styleId&&!requestAi){setError("Escolha um dos modelos antes de continuar.");setSaving(false);return;}
   const selected=styleId||styles[0];
   const value:MenuLaunch={id:launch.current?.id||crypto.randomUUID(),savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,sourceText,hasPhotos:!!pages.length,hasAssets:!!(brandAssets?.logo||brandAssets?.cover),styleId:selected,refinement,previewReady:true,aiRequested:requestAi};await saveLaunchCheckpoint(value);launch.current=value;
   if(pages.length)await saveReading({...reading.current,restaurantId:guestReadingKey(value.id),savedAt:Date.now(),pages,items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText});
   else if(sourceText)await saveReading({restaurantId:guestReadingKey(value.id),savedAt:Date.now(),pages:[],items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText}).catch(()=>{});
   location.assign(await menuLaunchAccountPath());
  }catch{setError("O navegador não conseguiu guardar sua ideia. Libere o armazenamento deste site para levar o conteúdo até o cadastro.");setSaving(false);}
 }
 const styles=suggestedGalleryStyles(idea,refinement),visible=styles.slice(round*4,round*4+4);
 const explicitName=nameFromBriefing(idea);
 const design=(id:GalleryStyleId)=>{const data=galleryDesign(preview!,id,idea,refinement);return {...data,...(brandName.trim().length>=2?{name:brandName.trim()}:{}),...(brandAssets?.logo?{logo:brandAssets.logo.data}:{}),...(brandAssets?.cover?{cover:brandAssets.cover.data}:{})};};
 function refine(e:FormEvent){e.preventDefault();if(!feedback.trim()){setError("Descreva com suas palavras o que você quer mudar.");return;}
  const combined=(refinement?refinement+"\n":"")+feedback.trim();
  if(combined.length>600){setError("Resuma as mudanças em até 600 caracteres.");return;}
  setRefinement(combined);setFeedback("");setError("");setChatOpen(false);
  setLocalFeedbackNote(supportsLocalRefinement(feedback)?"Pronto! Veja como seus ajustes ficaram.":"Não consegui aplicar essa mudança com os modelos locais. Seu pedido está guardado para o Estúdio de IA.");
  if(!styleId)setRound(0);
 }
 return <section className={"idea-start ai-landing "+(preview?"has-results":"waiting-prompt")} id="ideia"><div className="saas-container">
   <div className={"idea-workspace"+(preview?" has-gallery":"")}><div className="idea-composer-wrap">
     <form className="idea-composer" onSubmit={generate}><label htmlFor="pizzeria-idea"><Sparkles size={19}/>Descreva sua pizzaria. A gente cria as opções.</label>
       <textarea id="pizzeria-idea" rows={4} maxLength={1600} value={idea} onChange={e=>{setIdea(e.target.value);setPreview(null);setStyleId(null);}} placeholder="Ex.: Minha pizzaria se chama Sapore di Napoli. Quero um cardápio italiano, elegante, com fotos grandes e verde escuro…" disabled={busy||saving||!initialized}/>
       <div className="idea-composer-bottom"><button type="button" className="idea-source-toggle" aria-expanded={sourceOpen} onClick={()=>setSourceOpen(!sourceOpen)}><Paperclip size={17}/>Anexar cardápio / iFood {pages.length>0?"("+pages.length+")":""}</button><button className="btn primary" disabled={busy||saving||!initialized}>{busy?<Spinner/>:<Sparkles size={17}/>} {busy?"Preparando…":preview?"Atualizar modelos":"Criar 8 modelos"}<ArrowRight size={17}/></button></div>
     </form>
     {sourceOpen&&<div className="idea-source"><div><strong><Link2 size={17}/>Seu cardápio atual</strong><button className="icon-btn" type="button" aria-label="Recolher importação" onClick={()=>setSourceOpen(false)}><X size={16}/></button></div><label htmlFor="idea-source-text">Link do iFood ou texto dos produtos</label>
       <textarea id="idea-source-text" rows={4} maxLength={60000} value={sourceText} disabled={busy||saving||!initialized} onChange={e=>{setSourceText(e.target.value);setPreview(null);reading.current=null;}} placeholder={"Cole o link do iFood ou os nomes e preços dos produtos.\nCalabresa P R$ 29,90 · G R$ 49,90"}/>
       <div className="idea-file-actions"><label><ImagePlus size={16}/>Fotos do cardápio<input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" disabled={busy||saving||!initialized} onChange={files}/></label><label><FileText size={16}/>TXT / CSV<input type="file" hidden accept=".txt,.csv,text/plain,text/csv" disabled={busy||saving||!initialized} onChange={files}/></label><label><ImagePlus size={16}/>Logo<input type="file" hidden accept="image/jpeg,image/png,image/webp" disabled={busy||saving||!initialized} onChange={e=>void uploadBrand(e,"logo")}/></label><label><ImagePlus size={16}/>Capa / referência<input type="file" hidden accept="image/jpeg,image/png,image/webp" disabled={busy||saving||!initialized} onChange={e=>void uploadBrand(e,"cover")}/></label><a href="/modelo-cardapio.csv" download>Modelo CSV</a></div>
       {(brandAssets?.logo||brandAssets?.cover)&&<div className="idea-brand-previews">{brandAssets.logo&&<figure><img src={brandAssets.logo.data} alt="Logo anexado"/><figcaption>Logo</figcaption><button type="button" aria-label="Remover logo" disabled={busy||saving} onClick={()=>void removeBrand("logo")}><X size={15}/></button></figure>}{brandAssets.cover&&<figure><img src={brandAssets.cover.data} alt="Capa ou referência anexada"/><figcaption>Capa / referência</figcaption><button type="button" aria-label="Remover capa" disabled={busy||saving} onClick={()=>void removeBrand("cover")}><X size={15}/></button></figure>}</div>}
       {pages.length>0&&<div className="idea-photos">{pages.map(page=><div key={page.id}><img src={page.image} alt={page.name}/><button type="button" disabled={busy||saving||!initialized} aria-label={"Remover "+page.name} onClick={()=>{setPages(old=>old.filter(p=>p.id!==page.id));setPreview(null);reading.current=null;}}><X size={13}/></button></div>)}</div>}
       <small>Leitura de fotos e arquivos sem consumo de geração paga. Preços e tamanhos precisam de conferência antes de publicar. Logo e capa ficam guardados neste aparelho até a criação da conta, separados do OCR. Depois você pode aplicá-los no painel.</small>
     </div>}
     {storageError&&<p className="idea-error" role="status">{storageError}</p>}{notice&&<p className="idea-notice" role="status">{notice}</p>}{error&&<p className="idea-error" role="alert">{error}</p>}{busy&&readingLabel&&<p className="idea-notice" role="status">{readingLabel}</p>}
   </div>
   {preview&&<section ref={galleryRef} className="ai-gallery" aria-label="Escolha o visual do seu cardápio">
     <div className="ai-gallery-heading"><div><h2>{styleId?"Seu modelo":"8 modelos para sua pizzaria"}</h2><p>{imported?imported+" itens identificados. ":""}Escolha o que mais combina com você.</p></div><span className="ai-round-count">{styleId?"ESCOLHIDO":round===0?"1–4 DE 8":"5–8 DE 8"}</span></div>
     {!explicitName&&styleId&&<label className="ai-brand-name"><span>Como se chama sua pizzaria? <small>Opcional por enquanto</small></span><input type="text" autoComplete="organization" maxLength={100} value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Nome da sua pizzaria" disabled={busy||saving}/></label>}
     {preview.products.some(item=>item.id==="margherita"&&item.name==="Margherita")&&imported===0&&<p className="ai-gallery-sample" role="note">Sabores e preços ilustrativos para visualizar o design. Nenhum valor de exemplo será cadastrado na sua loja.</p>}
     {styleId?<div className="ai-selected"><div className="ai-selected-bar"><div><strong>{galleryStyle(styleId).title}</strong><small>{galleryStyle(styleId).summary}</small></div><button type="button" onClick={()=>{setStyleId(null);setChatOpen(false);}}>Escolher outro</button></div><div className="ai-selected-preview"><MiniMenu data={design(styleId)} large/></div><div className="ai-selected-actions"><button type="button" className="btn primary" disabled={busy||saving} onClick={()=>void continueSetup()}>{saving?<Spinner/>:<><Check size={17}/>Continuar com este cardápio</>}</button><button type="button" className="btn outline" onClick={()=>setChatOpen(true)}>Quero ajustar o design</button></div></div>:
       <><p className="ai-swipe-hint">Arraste para o lado · {round===0?"modelos 1 a 4":"modelos 5 a 8"}</p><div ref={styleGridRef} className="ai-style-grid">{visible.map(id=>{const style=galleryStyle(id);return <article key={id} className="ai-style-card"><div className="ai-style-screen"><MiniMenu data={design(id)} large/></div><div className="ai-style-footer"><div><strong>{style.title}</strong><span>{style.summary}</span></div><button type="button" disabled={busy||saving} onClick={()=>{setStyleId(id);setChatOpen(false);}} aria-label={"Escolher "+style.title}>Escolher<ArrowRight size={16}/></button></div></article>;})}</div><div className="ai-gallery-commands"><button type="button" onClick={()=>{setRound(round===0?1:0);styleGridRef.current?.scrollTo({left:0,behavior:"auto"});setChatOpen(false);}}><RefreshCw size={16}/>{round===0?"Ver mais 4 modelos":"Ver os primeiros 4"}</button><button type="button" onClick={()=>setChatOpen(true)}><Sparkles size={16}/>Gerar outro modelo</button></div></>}
     {localFeedbackNote.includes("Estúdio")&&<div className="ai-personalize"><p>Seu pedido ficou guardado. A personalização avançada exige uma conta.</p><button className="btn dark" type="button" disabled={saving||busy} onClick={()=>void continueSetup(true)}><Sparkles size={16}/>Continuar com IA <ArrowRight size={15}/></button></div>}
     {chatOpen&&<form className="ai-refine" onSubmit={refine}><label htmlFor="gallery-feedback">O que você quer diferente?</label><textarea id="gallery-feedback" required rows={3} maxLength={600} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Escreva livremente como você quer o design, as cores, a geometria, o tamanho das fotos e os textos."/><div><small>Ajustes disponíveis nos oito modelos são gratuitos. Ideias fora dessas estruturas podem precisar do Estúdio de IA após o cadastro.</small><button type="submit" className="btn dark">Aplicar meu pedido <ArrowRight size={15}/></button></div></form>}
     {localFeedbackNote&&<p className="ai-gallery-feedback" role="status">{localFeedbackNote}</p>}
     
   </section>}
   </div>
   
 </div></section>;
}
