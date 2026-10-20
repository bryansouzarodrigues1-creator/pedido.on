"use client";
import {lazy,Suspense,useEffect,useRef,useState,type ChangeEvent,type FormEvent} from "react";
import {ArrowRight,Check,Link2,Paperclip,Sparkles,X,FileText,ImagePlus,RefreshCw} from "lucide-react";
import {money,type RestaurantData} from "@/lib/domain";
import {detailedDemoRestaurant} from "@/lib/demo-rich";
import type {ReaderItem} from "@/lib/menu-reader-policy";
import {galleryDesign,galleryStyle,galleryReference,suggestedGalleryStyles,supportsLocalRefinement,type GalleryStyleId} from "@/lib/gallery-styles";
import {resolveBrandPalette} from "@/lib/brand-palette";

import {guestReadingKey,type MenuLaunch} from "@/lib/menu-launch";
import {loadLaunchCheckpoint,saveLaunchCheckpoint} from "@/lib/menu-launch-checkpoint";
import {menuLaunchAccountPath} from "@/lib/menu-launch-client";
import {inspectMenuSourceText,mergeReaderSource} from "@/lib/menu-source-links";
import {readMenuAttachment} from "@/lib/menu-attachment";
import type {IfoodImportResult} from "@/lib/ifood-import";
import {fetchMenuSource} from "@/lib/menu-source-client";
import {loadReading,saveReading,type Reading} from "@/lib/menu-reader-storage";
import {prepareMenuPhoto,recognizeMenuPhotos} from "@/lib/menu-ocr";
import {readMenuPages,readerItemReady,type ReaderPage} from "@/lib/menu-reader-policy";
import {previewMenuWithReaderItems} from "@/lib/menu-preview";
import {previewMenuPhotos} from "@/lib/menu-photo-preview";
import {refreshGuestMenuReading} from "@/lib/menu-guest-review";
import {retainedMenuPages,hasLegacyMenuPdf,legacyPdfNotice} from "@/lib/menu-pdf-source";
import {MiniMenu,Spinner,Modal} from "./ui";
import {imageFromFile,loadBrandAssets,saveBrandAssets,type BrandAssets} from "@/lib/guest-brand-assets";
import {nameFromBriefing} from "@/lib/studio-policy";
import OwnerIntakeChat from "./owner-intake-chat";
import {emptyOwnerIntake,intakeFinished,ownerPreviewDetails,withOwnerAnswers,ownerWithMenuContent,ownerVisualBriefing,ownerFacts,type OwnerIntake} from "@/lib/owner-intake";

const FullMenu=lazy(()=>import("./menu"));
function pendingMenuNotice(items:ReaderItem[]){const count=items.filter(item=>!readerItemReady(item)).length;return count?`${count} ${count===1?"produto precisa":"produtos precisam"} de conferência antes de entrar à venda. Os valores que o arquivo mostra ficam disponíveis para revisão.`:"";}
function makePreview(items:ReaderItem[],hasSource:boolean,photos:Record<string,string>={}):RestaurantData{return hasSource?previewMenuWithReaderItems(items,photos):detailedDemoRestaurant("editorial");}
export default function IdeaStart(){
 const sourceLookup=useRef<IfoodImportResult|null>(null);
 const [sourceSuggestion,setSourceSuggestion]=useState<IfoodImportResult|null>(null);
 const sourcePane=useRef<HTMLDivElement|null>(null);
 function openAttachments(){setSourceOpen(true);requestAnimationFrame(()=>sourcePane.current?.scrollIntoView({behavior:"smooth",block:"center"}));}
 const [intake,setIntake]=useState<OwnerIntake>(emptyOwnerIntake);
 const [initialized,setInitialized]=useState(false),[brandAssets,setBrandAssets]=useState<BrandAssets|null>(null),[brandName,setBrandName]=useState(""),[storageError,setStorageError]=useState("");
 const [referenceId,setReferenceId]=useState<GalleryStyleId|null>(null);
 const [fullPreview,setFullPreview]=useState(false);
 const [templatesOpen,setTemplatesOpen]=useState(false);
 const fullPreviewRef=useRef<HTMLDivElement|null>(null);
 const [styleId,setStyleId]=useState<GalleryStyleId|null>(null),[round,setRound]=useState(0),[refinement,setRefinement]=useState(""),[feedback,setFeedback]=useState(""),[localFeedbackNote,setLocalFeedbackNote]=useState(""),[chatOpen,setChatOpen]=useState(false);
 const [idea,setIdea]=useState(""),[sourceOpen,setSourceOpen]=useState(false),[sourceText,setSourceText]=useState(""),[pages,setPages]=useState<ReaderPage[]>([]),[preview,setPreview]=useState<RestaurantData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[readingLabel,setReadingLabel]=useState(""),[imported,setImported]=useState(0),[saving,setSaving]=useState(false);
 const abort=useRef<AbortController|null>(null),alive=useRef(true),reading=useRef<Reading|null>(null),launch=useRef<MenuLaunch|null>(null),galleryRef=useRef<HTMLElement|null>(null),styleGridRef=useRef<HTMLDivElement|null>(null),scrollToResult=useRef(false);
 useEffect(()=>{alive.current=true;void loadLaunchCheckpoint().then(async saved=>{if(!saved||!alive.current)return;launch.current=saved;setIntake(saved.ownerIntake||emptyOwnerIntake());setIdea(saved.idea);setSourceText(saved.sourceText);setBrandName(saved.brandName||"");if(saved.sourceText||saved.hasPhotos||saved.hasAssets)setSourceOpen(true);setStyleId(saved.styleId||null);setTemplatesOpen(!saved.styleId);setRefinement(saved.refinement||"");const [storedReading,images]=await Promise.all([loadReading(guestReadingKey(saved.id)).catch(()=>null),loadBrandAssets(guestReadingKey(saved.id)).catch(()=>null)]);if(!alive.current)return;const v=storedReading?refreshGuestMenuReading(storedReading):null;if(v&&JSON.stringify(v.items)!==JSON.stringify(storedReading?.items))await saveReading(v).catch(()=>{});if(v){setPages(v.pages);reading.current=v;setImported(v.items.length);setNotice([hasLegacyMenuPdf(v.pages)?legacyPdfNotice:"",pendingMenuNotice(v.items)].filter(Boolean).join(" "));}if(images)setBrandAssets(images);if(saved.hasPhotos&&!v?.pages.length||saved.hasAssets&&!images?.logo&&!images?.cover)setNotice("Sua ideia foi recuperada, mas alguns anexos não estão disponíveis. Envie esses arquivos novamente antes de continuar.");if(saved.previewReady&&saved.ownerIntake&&intakeFinished(saved.ownerIntake)){const hasSource=!!(saved.sourceText||v?.pages.length);const photos=v?.pages.length?await previewMenuPhotos(v.pages,v.items).catch(()=>({})):{};if(alive.current)setPreview(makePreview(v?.items||[],hasSource,photos));}}).catch(()=>{if(alive.current)setStorageError("Não foi possível recuperar o projeto deste aparelho.");}).finally(()=>{if(alive.current)setInitialized(true);});return()=>{alive.current=false;abort.current?.abort();};},[]);
 useEffect(()=>{if(!initialized||!idea&&!brandName&&!sourceText&&!pages.length&&!brandAssets&&!preview&&!intake.step)return;const value:MenuLaunch={id:launch.current?.id||crypto.randomUUID(),savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,ownerIntake:intake,sourceText,hasPhotos:!!pages.length,hasAssets:!!(brandAssets?.logo||brandAssets?.cover),styleId:styleId||undefined,refinement,previewReady:!!preview};launch.current=value;void saveLaunchCheckpoint(value).then(()=>{if(alive.current)setStorageError("");}).catch(e=>{if(alive.current)setStorageError(e instanceof Error?e.message:"Não foi possível guardar sua ideia.");});},[idea,brandName,intake,sourceText,pages.length,brandAssets,styleId,refinement,preview,initialized]);
 useEffect(()=>{if(preview&&scrollToResult.current){scrollToResult.current=false;requestAnimationFrame(()=>galleryRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));}},[preview]);
 useEffect(()=>{if(!fullPreview)return;const previous=document.activeElement as HTMLElement|null,scroll=document.body.style.overflow;document.body.style.overflow="hidden";
  requestAnimationFrame(()=>fullPreviewRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
  const key=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;const dialogs=document.querySelectorAll("[role=dialog]");if(dialogs[dialogs.length-1]===fullPreviewRef.current)setFullPreview(false);};
  document.addEventListener("keydown",key);return()=>{document.body.style.overflow=scroll;document.removeEventListener("keydown",key);previous?.focus();};
 },[fullPreview]);
 useEffect(()=>{if(!initialized||!launch.current||!pages.length&&!sourceText)return;const id=launch.current.id,timer=setTimeout(()=>{const checkpoint={restaurantId:guestReadingKey(id),savedAt:Date.now(),pages,items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText};void saveReading(checkpoint).catch(()=>{if(alive.current&&pages.length)setNotice("As fotos estão nesta página, mas o navegador não conseguiu guardá-las. Libere o armazenamento antes de continuar.");});},400);return()=>clearTimeout(timer);},[initialized,pages,sourceText]);
 async function files(e:ChangeEvent<HTMLInputElement>){const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setError("");setBusy(true);try{
  const retained=retainedMenuPages(pages,files),photos=files.filter(f=>f.type.startsWith("image/"));if(retained.length+photos.length>8)throw Error("Envie até oito fotos por vez.");
  const added:ReaderPage[]=[];let text=sourceText;
  let suggestion:IfoodImportResult|undefined;
  for(const file of files){if(file.type.startsWith("image/"))added.push(await prepareMenuPhoto(file));else{const result=await readMenuAttachment(file,8-retained.length-added.length,setReadingLabel);added.push(...result.pages);if(result.text)text=mergeReaderSource(text,result.text);if(result.source)suggestion=result.source;}}
  if(text.length>60000)throw Error("Importe uma parte por vez, com até 60 mil caracteres.");setPages([...retained,...added]);setSourceText(text);
  const facts=ownerFacts(text+"\n"+added.flatMap(page=>page.lines.map(line=>line.text)).join("\n"));
  setIntake(old=>ownerWithMenuContent(withOwnerAnswers(old,{...Object.fromEntries(Object.entries(facts).filter(([key])=>old.answers[key as keyof typeof old.answers]===undefined)),...(old.answers.menu===undefined?{menu:""}:{})})));setSourceOpen(true);reading.current=null;setPreview(null);
  if(suggestion)setSourceSuggestion(suggestion);
  setNotice(added.some(page=>!page.lines.length)?"Arquivo recebido. As páginas em imagem serão lidas ao preparar a prévia.":"Cardápio recebido. Os produtos serão organizados na sua prévia.");
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir o arquivo.");}finally{setBusy(false);setReadingLabel("");}}
 async function uploadBrand(e:ChangeEvent<HTMLInputElement>,kind:"logo"|"cover"){const file=e.target.files?.[0];e.target.value="";if(!file||busy||saving)return;setBusy(true);setError("");try{
   const image=await imageFromFile(file),id=launch.current?.id||crypto.randomUUID(),value:MenuLaunch={id,savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,ownerIntake:intake,sourceText,hasPhotos:!!pages.length,hasAssets:true,styleId:styleId||undefined,refinement,previewReady:!!preview};
   const old=brandAssets||{key:guestReadingKey(id)},next={...old,key:guestReadingKey(id),[kind]:image};
   await saveBrandAssets(next);await saveLaunchCheckpoint(value);launch.current=value;setBrandAssets(next);setSourceOpen(true);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível guardar a imagem da marca.");}finally{setBusy(false);}}
 async function generate(nextIntake:OwnerIntake=intake){
  if(!intakeFinished(nextIntake)){setError("Informe o nome da pizzaria para preparar sua prévia.");return;}
  if(busy)return;const nextIdea=ownerVisualBriefing(nextIntake);setIdea(nextIdea);setError("");setNotice("");setBusy(true);const controller=new AbortController();abort.current=controller;
  try{
   let text=sourceText,source=inspectMenuSourceText(text),ready=pages;
   if(source.links.length===1&&!source.menuText&&!pages.length){
    setReadingLabel("Consultando o link do cardápio…");
    try{
      const result=sourceLookup.current?.url===source.links[0].url?sourceLookup.current:await fetchMenuSource(source.links[0].url);
      if(result.count||result.store)setNotice(result.message);
      if(result.text){text=source.links[0].url+"\n"+result.text;setSourceText(text);source=inspectMenuSourceText(text);}
    }catch{
      setNotice("O link não trouxe produtos. Você pode enviar PDF, TXT ou fotos para completar o cardápio.");
    }
   }
   const missing=pages.filter(p=>!p.lines.length);
   if(missing.length){const scanned=await recognizeMenuPhotos(missing,controller.signal,(_,label)=>{if(alive.current)setReadingLabel(label);});ready=pages.map(p=>scanned.find(s=>s.id===p.id)||p);if(!alive.current)return;setPages(ready);}
   const input=ready.map(p=>({id:p.id,lines:p.lines}));if(source.menuText.trim())input.push({id:"text",lines:source.menuText.split("\n").map(text=>({text}))});
   const result=input.length?readMenuPages(input):{items:[],unmatched:[]};
   if(input.length&&!result.items.length)setNotice("A fonte não trouxe produtos com preço legível. Cole o texto com os preços ou tente uma imagem mais nítida.");
   const pending=pendingMenuNotice(result.items);
   const collected=source.links.length===1&&sourceLookup.current?.url===source.links[0].url?sourceLookup.current:null;
   if(collected?.count||pending)setNotice([collected?.count?collected.message:"",pending].filter(Boolean).join(" "));
   const photos=ready.length?await previewMenuPhotos(ready,result.items).catch(()=>({})):{};
   if(!alive.current||controller.signal.aborted)return;
   scrollToResult.current=true;setTemplatesOpen(!styleId);setPreview(makePreview(result.items,input.length>0,photos));setChatOpen(false);setImported(result.items.length);
   if(!launch.current)launch.current={id:crypto.randomUUID(),savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,sourceText:text,hasPhotos:!!ready.length};
   reading.current={restaurantId:guestReadingKey(launch.current.id),savedAt:Date.now(),pages:ready,items:result.items,unmatched:result.unmatched,text};
   await saveReading(reading.current).catch(()=>{});
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não foi possível preparar a prévia.");}finally{if(alive.current){setBusy(false);setReadingLabel("");}abort.current=null;}
 }
 function captureProductText(message:string){
  if(!/(?:R\s*\$\s*\d|\b\d+[,.]\d{2}\b)/i.test(message))return false;
  const text=inspectMenuSourceText(message).menuText.split("\n").filter(line=>!/^\s*\|?\s*(?:campo|nome(?: da pizzaria)?|endere[cç]o|whats(?:app)?|hor[aá]rios?|card[aá]pio|exemplo)(?:\s|[:=|])/i.test(line)).join("\n");
  const parsed=readMenuPages([{id:"message",lines:text.split("\n").map(text=>({text}))}]);
  if(!parsed.items.length)return false;
  try{const merged=mergeReaderSource(sourceText,text);setSourceText(merged);reading.current=null;return true;}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível acrescentar os produtos. Sua leitura anterior foi preservada.");return false;}
 }
 async function removeBrand(kind:"logo"|"cover"){if(!brandAssets||busy||saving)return;setBusy(true);setError("");try{const next={...brandAssets,[kind]:undefined};await saveBrandAssets(next);setBrandAssets(next);}catch{setError("Não foi possível remover esta imagem. Tente novamente.");}finally{setBusy(false);}}
 async function continueSetup(requestAi=false){
  if(busy||saving)return;setSaving(true);setError("");try{
   if(!intakeFinished(intake)){setError("Responda às perguntas principais antes de criar o cardápio.");setSaving(false);return;}
   if(!styleId&&!requestAi){setError("Escolha um dos modelos antes de continuar.");setSaving(false);return;}
   const selected=styleId||styles[0];
   const value:MenuLaunch={id:launch.current?.id||crypto.randomUUID(),savedAt:Date.now(),idea,brandName:brandName.trim().length>=2?brandName.trim():undefined,ownerIntake:intake,sourceText,hasPhotos:!!pages.length,hasAssets:!!(brandAssets?.logo||brandAssets?.cover),styleId:selected,refinement,previewReady:true,aiRequested:requestAi};await saveLaunchCheckpoint(value);launch.current=value;
   if(pages.length)await saveReading({...reading.current,restaurantId:guestReadingKey(value.id),savedAt:Date.now(),pages,items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText});
   else if(sourceText)await saveReading({restaurantId:guestReadingKey(value.id),savedAt:Date.now(),pages:[],items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText}).catch(()=>{});
   location.assign(await menuLaunchAccountPath());
  }catch{setError("O navegador não conseguiu guardar sua ideia. Libere o armazenamento deste site para levar o conteúdo até o cadastro.");setSaving(false);}
 }
 const styles=suggestedGalleryStyles(idea,refinement),visible=styles.slice(round*4,round*4+4),rounds=Math.ceil(styles.length/4);
 const pendingProducts=reading.current?.items.filter(item=>!readerItemReady(item))||[];
 const explicitName=intake.answers.name||nameFromBriefing(idea);
 const design=(id:GalleryStyleId)=>{const data=galleryDesign(preview!,id,idea,refinement);return {...data,...ownerPreviewDetails(intake),...(intake.answers.name?{name:intake.answers.name}:brandName.trim().length>=2?{name:brandName.trim()}:{}),...(brandAssets?.logo?{logo:brandAssets.logo.data}:{}),...(brandAssets?.cover?{cover:brandAssets.cover.data}:{})};};
 const interpretedPalette=resolveBrandPalette(idea,refinement);
 function refine(e:FormEvent){e.preventDefault();if(!feedback.trim()){setError("Descreva com suas palavras o que você quer mudar.");return;}
  const combined=(refinement?refinement+"\n":"")+feedback.trim();
  if(combined.length>600){setError("Resuma as mudanças em até 600 caracteres.");return;}
  setRefinement(combined);setFeedback("");setError("");setChatOpen(false);
  const changed=!!preview&&JSON.stringify(galleryDesign(preview,styleId||styles[0],idea,refinement))!==JSON.stringify(galleryDesign(preview,styleId||styles[0],idea,combined));
  setLocalFeedbackNote(changed?"Prévia atualizada. Confira o resultado; seu pedido completo ficou guardado.":supportsLocalRefinement(feedback)?"Esse pedido não mudou o visual atual. Tente outra cor, organização ou tamanho das fotos.":"Essa personalização precisa do Estúdio de IA. Seu pedido ficou guardado para continuar com sua conta.");
  if(!styleId)setRound(0);
 }
 return <section className={"idea-start ai-landing creator-flow "+(preview?"has-results":"waiting-prompt")} id="ideia"><div className="saas-container">
   {!preview&&<div className="creator-intro"><span>SEU CARDÁPIO. DO SEU JEITO.</span><h1>Sua pizzaria começa<br/>com uma ideia.</h1><p>Conte como você imagina. Traga seu cardápio e veja tudo ganhar forma.</p></div>}
   <div className={"idea-workspace"+(preview?" has-gallery":"")}><div className="idea-composer-wrap">
     <details className="creator-briefing" open={!preview}><summary>Sua ideia e dados da pizzaria <span>Conferir ou editar</span></summary>
     <div className="idea-conversation">
       <OwnerIntakeChat value={intake} disabled={busy||saving||!initialized}
        onChange={next=>{
          setIntake(next);setPreview(null);if(next.visualChoice!==intake.visualChoice)setStyleId(null);setRound(0);
          if(next.initialMessage!==intake.initialMessage||next.visualChoice!==intake.visualChoice)setIdea(ownerVisualBriefing(next));
          if(next.answers.name!==intake.answers.name)setBrandName(next.answers.name||"");
          if(next.answers.menu!==intake.answers.menu)setSourceText(old=>old&&old!==intake.answers.menu?old:next.answers.menu||"");
        }}
        onSource={result=>{sourceLookup.current=result;setPreview(null);setSourceText(old=>mergeReaderSource(old,result.url+(result.text?"\n"+result.text:"")));}}
        onText={captureProductText}
        sourceSuggestion={sourceSuggestion}
        onAttach={openAttachments}
        onReady={next=>{void generate(next);}}/>
       {intakeFinished(intake)&&<div className="idea-composer-bottom idea-conversation-attachments"><button type="button" className="idea-source-toggle" aria-expanded={sourceOpen} onClick={()=>sourceOpen?setSourceOpen(false):openAttachments()}><Paperclip size={17}/>Enviar cardápio ou imagens {pages.length>0?"("+pages.length+")":""}</button></div>}
     </div>
     {sourceOpen&&<div ref={sourcePane} className="idea-source"><div><strong><Paperclip size={17}/>Envie seu cardápio</strong><button className="icon-btn" type="button" aria-label="Recolher importação" onClick={()=>setSourceOpen(false)}><X size={16}/></button></div><p>PDF, TXT, CSV, fotos ou uma página salva do iFood. Até 8 páginas por leitura.</p>
       <div className="idea-file-actions"><label><ImagePlus size={16}/>Fotos do cardápio<input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" disabled={busy||saving||!initialized} onChange={files}/></label><label><FileText size={16}/>PDF, TXT ou CSV<input type="file" hidden accept=".pdf,.txt,.csv,.html,.htm,application/pdf,text/plain,text/csv,text/html" disabled={busy||saving||!initialized} onChange={files}/></label><label><ImagePlus size={16}/>Logo<input type="file" hidden accept="image/jpeg,image/png,image/webp" disabled={busy||saving||!initialized} onChange={e=>void uploadBrand(e,"logo")}/></label><label><ImagePlus size={16}/>Capa / referência<input type="file" hidden accept="image/jpeg,image/png,image/webp" disabled={busy||saving||!initialized} onChange={e=>void uploadBrand(e,"cover")}/></label><a href="/modelo-cardapio.csv" download>Modelo CSV</a></div>
       <details className="idea-source-review"><summary>Conferir ou corrigir o texto importado</summary><label htmlFor="idea-source-text">Produtos e preços</label><textarea id="idea-source-text" rows={4} maxLength={60000} value={sourceText} disabled={busy||saving||!initialized} onChange={e=>{setSourceText(e.target.value);setPreview(null);reading.current=null;}} placeholder={"Calabresa P R$ 29,90 · G R$ 49,90"}/></details>
       {(brandAssets?.logo||brandAssets?.cover)&&<div className="idea-brand-previews">{brandAssets.logo&&<figure><img src={brandAssets.logo.data} alt="Logo anexado"/><figcaption>Logo</figcaption><button type="button" aria-label="Remover logo" disabled={busy||saving} onClick={()=>void removeBrand("logo")}><X size={15}/></button></figure>}{brandAssets.cover&&<figure><img src={brandAssets.cover.data} alt="Capa ou referência anexada"/><figcaption>Capa / referência</figcaption><button type="button" aria-label="Remover capa" disabled={busy||saving} onClick={()=>void removeBrand("cover")}><X size={15}/></button></figure>}</div>}
       {pages.length>0&&<div className="idea-photos">{pages.map(page=><div key={page.id}><img src={page.image} alt={page.name}/><button type="button" disabled={busy||saving||!initialized} aria-label={"Remover "+page.name} onClick={()=>{setPages(old=>old.filter(p=>p.id!==page.id));setPreview(null);reading.current=null;}}><X size={13}/></button></div>)}</div>}
       <small>Confira os preços e tamanhos antes de publicar. Logo e capa ficam guardados neste aparelho até você aplicá-los no painel.</small>
     </div>}
     </details>
     {storageError&&<p className="idea-error" role="status">{storageError}</p>}{notice&&<p className="idea-notice" role="status">{notice}</p>}{error&&<p className="idea-error" role="alert">{error}</p>}{busy&&readingLabel&&<p className="idea-notice" role="status">{readingLabel}</p>}
   </div>
   {preview&&<section ref={galleryRef} className="ai-gallery" aria-label="Escolha o visual do seu cardápio">
     <div className="ai-gallery-heading"><div><h2>{styleId?"Sua pizzaria está ganhando forma.":"Escolha o visual do seu cardápio."}</h2><p>{imported?imported+" itens identificados. ":""}{styleId?"Confira a prévia e ajuste do seu jeito.":"Veja quatro modelos diferentes e escolha o que combina com sua pizzaria."}</p></div><span className="ai-round-count">{styleId?"PRÉVIA":"ESCOLHA"}</span></div>
     {pendingProducts.length>0&&<details className="ai-review-pending" open={pendingProducts.length>=2}><summary>{pendingProducts.length} produtos precisam de revisão antes de publicar — veja nomes e valores</summary><p>Estes valores foram encontrados no arquivo, mas ainda dependem de confirmação. Não inventamos tamanhos nem colocamos preços duvidosos à venda.</p><ul>{pendingProducts.slice(0,24).map(item=><li key={item.id}><strong>{item.name}</strong><span>{item.price?`Sem tamanho · ${money(item.price)}`:(['p','m','g'] as const).filter(size=>item.sizes[size]).map(size=>`${size.toUpperCase()} ${money(item.sizes[size]!)}`).join(' · ')||"Preço a conferir"}</span></li>)}</ul>{pendingProducts.length>24&&<small>Os outros itens continuam guardados para revisão no painel.</small>}</details>}
     {reading.current?.pages.length&&preview.products.some(product=>product.image.startsWith("data:image/jpeg;base64,"))?<p className="ai-photo-note">Fotos sugeridas a partir do PDF, apenas nesta prévia local. Confirme cada associação e o direito de uso no painel antes de publicar.</p>:null}
     {pages.length>0&&<details className="ai-source-pages" open={!preview.products.some(product=>product.image)}><summary>Fotos e textos originais: {pages.length} páginas preservadas</summary><p>As imagens do arquivo permanecem aqui. Fotografias sem associação segura a um produto podem ser conferidas e recortadas no painel; nenhuma imagem é inventada.</p><div>{pages.map(page=><figure key={page.id}><img src={page.image} alt={page.name}/><figcaption>{page.name}</figcaption></figure>)}</div></details>}
     {interpretedPalette&&<div className="ai-visual-summary" aria-live="polite"><div><strong>Identidade visual aplicada</strong><small>{interpretedPalette.motif==="sea-cheese"?"Azul do mar + amarelo-queijo · cabeçalho, destaques, fundos e fotos com composição adaptada":"Duas cores combinadas em superfícies, navegação, botões e conteúdo"}</small></div><span className="ai-palette-swatches" aria-label="Cores da identidade"><i title="Cor principal" style={{background:interpretedPalette.primary}}/><i title="Cor secundária" style={{background:interpretedPalette.palette.secondary}}/><i title="Fundo do cardápio" style={{background:interpretedPalette.palette.background}}/></span></div>}
     {!explicitName&&styleId&&<label className="ai-brand-name"><span>Como se chama sua pizzaria? <small>Opcional por enquanto</small></span><input type="text" autoComplete="organization" maxLength={100} value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Nome da sua pizzaria" disabled={busy||saving}/></label>}
     {preview.products.some(item=>item.id==="margherita"&&item.name==="Margherita")&&imported===0&&<p className="ai-gallery-sample" role="note">Sabores e preços ilustrativos para visualizar o design. Nenhum valor de exemplo será cadastrado na sua loja.</p>}
     {styleId&&<div className="ai-selected"><div className="ai-selected-bar"><div><strong>Prévia da sua pizzaria</strong><small>{galleryStyle(styleId).summary}</small></div><button type="button" onClick={()=>{setTemplatesOpen(true);setChatOpen(false);requestAnimationFrame(()=>galleryRef.current?.querySelector(".ai-template-options")?.scrollIntoView({behavior:"smooth",block:"start"}));}}>Escolher outro</button></div><div className="ai-selected-preview" role="region" aria-label="Prévia dos produtos e preços" tabIndex={0}><MiniMenu data={design(styleId)} large rich/></div><p className="ai-preview-scroll-hint">Role dentro da prévia para conferir os produtos e preços.</p><div className="ai-selected-actions">
       <button type="button" className="btn outline" onClick={()=>setFullPreview(true)} aria-label={"Testar o cardápio completo personalizado "+galleryStyle(styleId).title}>Testar meu cardápio completo <ArrowRight size={15}/></button>
       <button type="button" className="btn primary" disabled={busy||saving} onClick={()=>void continueSetup()}>{saving?<Spinner/>:<><Check size={17}/>Usar este modelo</>}</button>
      </div><details className="ai-selected-more"><summary>Mais opções de personalização</summary><div>
       <button type="button" className="btn outline" onClick={()=>setReferenceId(styleId)}>Ver imagem de referência</button>
       <button type="button" className="btn outline" aria-expanded={chatOpen} aria-controls="gallery-feedback" onClick={()=>setChatOpen(true)}>Ajustar cores, fotos e textos</button>
      </div></details></div>}
       <details className="ai-template-options" open={templatesOpen} onToggle={e=>setTemplatesOpen(e.currentTarget.open)}><summary>{styleId?"Trocar o modelo selecionado":"Escolha um dos modelos abaixo"} <span>12 opções</span></summary>
       <p className="ai-swipe-hint">Arraste para o lado · {`modelos ${round*4+1} a ${Math.min(round*4+4,styles.length)}`}</p><div ref={styleGridRef} className="ai-style-grid">{visible.map(id=>{const style=galleryStyle(id);return <article key={id} className="ai-style-card"><div className="ai-style-screen"><MiniMenu data={design(id)} large/></div><div className="ai-style-footer"><div><strong>{style.title}</strong><span>{style.summary}</span><button type="button" className="ai-reference-link" aria-label={"Ver referência de "+style.title} onClick={()=>setReferenceId(id)}>Ver referência</button></div><button type="button" disabled={busy||saving} onClick={()=>{setStyleId(id);setTemplatesOpen(false);setChatOpen(false);galleryRef.current?.scrollIntoView({behavior:"smooth",block:"start"});}} aria-label={"Escolher "+style.title}>Escolher<ArrowRight size={16}/></button></div></article>;})}</div><div className="ai-gallery-commands"><button type="button" onClick={()=>{setRound((round+1)%rounds);styleGridRef.current?.scrollTo({left:0,behavior:"auto"});setChatOpen(false);}}><RefreshCw size={16}/>{round<rounds-1?"Ver mais 4 modelos":"Ver os primeiros 4"}</button><button type="button" onClick={()=>setChatOpen(true)}><Sparkles size={16}/>Pedir um ajuste</button></div></details>
     {localFeedbackNote.includes("Estúdio")&&<div className="ai-personalize"><p>Seu pedido ficou guardado. A personalização avançada exige uma conta.</p><button className="btn dark" type="button" disabled={saving||busy} onClick={()=>void continueSetup(true)}><Sparkles size={16}/>Continuar com IA <ArrowRight size={15}/></button></div>}
     {chatOpen&&<form className="ai-refine" onSubmit={refine}><label htmlFor="gallery-feedback">O que você quer diferente?</label><textarea id="gallery-feedback" required rows={3} maxLength={600} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Escreva livremente como você quer o design, as cores, a geometria, o tamanho das fotos e os textos."/><div><small>Peça mudanças de cores, fotos, letras e composição. Confira o resultado antes de aplicar.</small><button type="submit" className="btn dark">Aplicar meu pedido <ArrowRight size={15}/></button></div></form>}
     {localFeedbackNote&&<p className="ai-gallery-feedback" role="status">{localFeedbackNote}</p>}
     
   </section>}
   </div>
   
   {fullPreview&&styleId&&preview&&<div ref={fullPreviewRef} className="ai-full-preview" role="dialog" aria-modal="true" aria-label="Teste do cardápio personalizado">
      <div className="ai-full-preview-top"><div><strong>Teste do seu cardápio completo</strong><small>Com suas cores, nome e produtos. Simulação: não envia pedidos nem cobra.</small></div><button type="button" className="btn outline" onClick={()=>setFullPreview(false)} aria-label="Fechar teste e voltar aos modelos"><X size={18}/>Voltar aos modelos</button></div>
      <Suspense fallback={<p className="ai-full-preview-loading" role="status">Preparando seu cardápio completo…</p>}><FullMenu data={design(styleId)} demo preview/></Suspense>
     </div>}
   <Modal open={!!referenceId} onClose={()=>setReferenceId(null)} title={referenceId?galleryStyle(referenceId).title:"Referência visual"} wide>
    {referenceId&&<div className="ai-reference-view"><p>Referência de estilo. Na prévia, usamos o nome, os produtos e as imagens da sua pizzaria. Valores da imagem são ilustrativos.</p><img src={galleryReference(referenceId)} width={768} height={1152} alt={"Referência visual de "+galleryStyle(referenceId).title}/><div><a className="btn outline" href={"/demo/"+referenceId} target="_blank" rel="noopener noreferrer">Testar cardápio</a><button type="button" className="btn primary" onClick={()=>{setStyleId(referenceId);setReferenceId(null);setChatOpen(false);}}>Escolher este estilo</button></div></div>}
   </Modal>
 </div></section>;
}
