"use client";
import {useState,useEffect,useRef,useMemo,type ChangeEvent} from "react";
import {Upload,Camera,ArrowRight,Check,Trash2,RotateCw,FileText,AlertCircle,Eye} from "lucide-react";
import {Modal,Spinner} from "./ui";
import Menu from "./menu";
import {money,type RestaurantData,type Size} from "@/lib/domain";
import {readMenuPages,prepareReaderItems,readerItemReady,menuAmount,importReaderItems,reconcileReaderReview,type ReaderItem,type ReaderPage} from "@/lib/menu-reader-policy";
import {loadReading,saveReading,removeReading,type Reading} from "@/lib/menu-reader-storage";
import {prepareMenuPhoto,recognizeMenuPhotos,rotateMenuPhoto} from "@/lib/menu-ocr";
import ProductPhotoCrop from "./product-photo-crop";
import MenuSourceLink from "./menu-source-link";
import MenuAssistanceOwner from "./menu-assistance-owner";
import {assistanceReadingState,buildAssistanceReview} from "@/lib/menu-assistance-review";
import type {AssistedCapture} from "@/lib/menu-assistance-policy";
import {readMenuAttachment} from "@/lib/menu-attachment";
import {previewMenuPhotos} from "@/lib/menu-photo-preview";
import {attachApprovedMenuPhotos} from "@/lib/menu-photo-upload";
import {previewReviewedMenu} from "@/lib/menu-preview";
import {retainedMenuPages,hasLegacyMenuPdf,legacyPdfNotice} from "@/lib/menu-pdf-source";
import {inspectMenuSourceText,mergeReaderSource} from "@/lib/menu-source-links";

export default function AiImport({restaurantId,draft,onImport,onActivityChange,incomingSource,onSourceReceived,autoOpen=false,assistanceOpen=false}:{restaurantId:string;draft:RestaurantData;onImport:(patch:Partial<RestaurantData>)=>void|Promise<void>;onActivityChange?:(active:boolean)=>void;incomingSource?:{requestId:string;text:string}|null;onSourceReceived?:(requestId:string)=>void;autoOpen?:boolean;assistanceOpen?:boolean}){
  const [notice,setNotice]=useState("");
  const [open,setOpen]=useState(false),[pages,setPages]=useState<ReaderPage[]>([]),[items,setItems]=useState<ReaderItem[]>([]),[unmatched,setUnmatched]=useState<{sourceId:string;text:string}[]>([]);
  const [photoSuggestions,setPhotoSuggestions]=useState<Record<string,string>>({});
  const [assistanceRequestId,setAssistanceRequestId]=useState<string|undefined>();
  const [approvedPhotos,setApprovedPhotos]=useState<Record<string,boolean>>({});
  const [showSources,setShowSources]=useState(false),[text,setText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[progress,setProgress]=useState(0),[label,setLabel]=useState(""),[restored,setRestored]=useState(false),[confirmed,setConfirmed]=useState(false),[preview,setPreview]=useState(false),[source,setSource]=useState<ReaderItem|null>(null),[storageNote,setStorageNote]=useState(""),[initialized,setInitialized]=useState(false);
  const controller=useRef<AbortController|null>(null),mounted=useRef(true),current=useRef(draft);current.current=draft;
  const sourceNeighbors=useMemo(()=>readMenuPages(pages.filter(page=>page.id===source?.sourceId).map(page=>({id:page.id,lines:page.lines}))).items.flatMap(item=>item.box?[item.box]:[]),[pages,source?.sourceId]);
  const sourceText=useMemo(()=>inspectMenuSourceText(text),[text]);
  const receivedSource=useRef("");
  const latestReading=useRef<Reading|null>(null),applying=useRef(false);
  const savedPhotos=useMemo(()=>Object.fromEntries(Object.entries(photoSuggestions).filter(([,url])=>url.startsWith("/media/"+restaurantId+"/"))),[photoSuggestions,restaurantId]);
  latestReading.current=initialized?{restaurantId,savedAt:Date.now(),pages,items,unmatched,text,assistanceRequestId,photoSuggestions:savedPhotos}:null;
  useEffect(()=>()=>{const value=latestReading.current;if(value&&(value.pages.length||value.items.length||value.text?.trim()))void saveReading(value).catch(()=>{});},[restaurantId]);
  useEffect(()=>{onActivityChange?.(open||busy||preview||!!source);return()=>onActivityChange?.(false);},[onActivityChange,open,busy,preview,source?.id]);
  useEffect(()=>{mounted.current=true;void loadReading(restaurantId).then(async value=>{if(!value||!mounted.current)return;setPages(value.pages);setItems(prepareReaderItems(value.items,current.current,{preserveSelection:true}));setText(value.text||"");setAssistanceRequestId(value.assistanceRequestId);setUnmatched(value.unmatched||[]);setRestored(true);if(hasLegacyMenuPdf(value.pages))setStorageNote(legacyPdfNotice);if(autoOpen)setOpen(true);const suggestions=await previewMenuPhotos(value.pages,value.items).catch(()=>({}));if(mounted.current)setPhotoSuggestions({...suggestions,...value.photoSuggestions});}).catch(()=>{if(mounted.current)setStorageNote("A leitura ficará disponível enquanto esta tela estiver aberta.");}).finally(()=>{if(mounted.current)setInitialized(true);});return()=>{mounted.current=false;controller.current?.abort();};},[restaurantId]);
  // Queue cleanup of an empty restored reading before accepting a chat source.
  useEffect(()=>{if(!initialized)return;if(!pages.length&&!items.length&&!text.trim()){void removeReading(restaurantId).catch(()=>{});return;}const timer=setTimeout(()=>{void saveReading({restaurantId,savedAt:Date.now(),pages,items,unmatched,text,assistanceRequestId,photoSuggestions:savedPhotos}).catch(()=>{if(mounted.current)setStorageNote("Não foi possível guardar a leitura neste aparelho. Confira antes de sair.");});},500);return()=>clearTimeout(timer);},[pages,items,unmatched,text,restaurantId,initialized,assistanceRequestId,savedPhotos]);
  useEffect(()=>{
    if(!initialized||busy||!incomingSource||receivedSource.current===incomingSource.requestId)return;
    setOpen(true);setShowSources(true);setConfirmed(false);
    try{const merged=mergeReaderSource(text,incomingSource.text),value={restaurantId,savedAt:Date.now(),pages,items,unmatched,text:merged};latestReading.current=value;receivedSource.current=incomingSource.requestId;setText(merged);setError("");void saveReading(value).catch(()=>{if(mounted.current)setStorageNote("Não foi possível guardar a referência neste aparelho. Confira antes de sair.");});onSourceReceived?.(incomingSource.requestId);}
    catch(error){setError(error instanceof Error?error.message:"Não foi possível acrescentar a referência. Sua leitura foi mantida.");}
  },[initialized,busy,incomingSource,onSourceReceived,text,restaurantId,pages,items,unmatched]);
  function patch(id:string,value:Partial<ReaderItem>){setConfirmed(false);setApprovedPhotos(old=>({...old,[id]:false}));setItems(old=>old.map(v=>v.id===id?{...v,...value}:v));}
  async function files(event:ChangeEvent<HTMLInputElement>){const list=Array.from(event.target.files||[]);event.target.value="";if(!list.length)return;if(pages.length+list.length>8){setError("Envie até 8 fotos por leitura. Você pode importar outra parte depois.");return;}setBusy(true);setError("");try{const added:ReaderPage[]=[];for(const file of list)added.push(await prepareMenuPhoto(file));if(mounted.current){setPages(old=>[...old,...added]);setShowSources(true);setConfirmed(false);}}catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir a foto.");}finally{if(mounted.current)setBusy(false);}}
  async function textFile(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];event.target.value="";if(!file||busy)return;setError("");setBusy(true);try{const retained=retainedMenuPages(pages,[file]),result=await readMenuAttachment(file,8-retained.length,setLabel),merged=mergeReaderSource(text,result.text);if(!mounted.current)return;setText(merged);setPages([...retained,...result.pages]);setStorageNote("");setShowSources(true);setConfirmed(false);}catch(e){if(mounted.current)setError(e instanceof Error?e.message:"Não foi possível abrir o arquivo.");}finally{if(mounted.current){setBusy(false);setLabel("");}}}
  async function read(){
    if(busy)return;setBusy(true);setError("");setConfirmed(false);setProgress(0);const abort=new AbortController();controller.current=abort;
    try{
      let ready=pages;const missing=pages.filter(p=>!p.lines.length);
      if(missing.length){const scanned=await recognizeMenuPhotos(missing,abort.signal,(amount,note)=>{if(mounted.current){setProgress(amount);setLabel(note);}},async page=>{ready=ready.map(p=>p.id===page.id?page:p);if(mounted.current)setPages(ready);await saveReading({restaurantId,savedAt:Date.now(),pages:ready,items,unmatched,text}).catch(()=>{});});ready=pages.map(p=>scanned.find(v=>v.id===p.id)||p);}
      let content=sourceText;
      if(!content.menuText&&content.links.length&&!ready.length)throw Error("Para trazer o cardápio pelo link, feche o leitor e use Solicitar trazer meu cardápio via link. A equipe fará a importação para você.");
      const input=ready.map(p=>({id:p.id,lines:p.lines}));if(content.menuText)input.push({id:"text",lines:content.menuText.split("\n").map(value=>({text:value}))});
      if(!input.length&&sourceText.status!=="none")throw Error("Cole o texto do cardápio ou envie PDF, TXT, CSV ou fotos para importar os produtos.");
      const result=readMenuPages(input);if(result.items.length>500)throw Error("A leitura tem muitos trechos. Envie uma parte do cardápio por vez.");
      if(!result.items.length)throw Error("Não encontramos os produtos. Tente uma foto mais próxima e reta, ou cole o texto.");
      const suggestions=await previewMenuPhotos(ready,result.items).catch(()=>({}));
      if(!mounted.current||abort.signal.aborted)return;setPages(ready);setItems(reconcileReaderReview(items,result.items,current.current));setPhotoSuggestions(suggestions);setApprovedPhotos({});setShowSources(false);setUnmatched(result.unmatched);setRestored(false);
    }catch(e){if(!abort.signal.aborted&&mounted.current)setError(e instanceof Error?e.message:"Não foi possível ler essa foto. Tente uma foto mais nítida ou cole o texto.");}
    finally{if(mounted.current){setBusy(false);setLabel("");}controller.current=null;}
  }
  function receiveAssisted(requestId:string,capture:AssistedCapture){
    if(busy||!initialized)return false;
    const state=assistanceReadingState(latestReading.current,requestId);
    setOpen(true);setConfirmed(false);setError("");
    if(state==="resume"){setShowSources(false);setNotice("Sua revisão guardada foi retomada. Confira os preços e aprove cada foto antes de adicionar.");return true;}
    if(state==="occupied"){setShowSources(!items.length);setError("Conclua ou descarte a leitura guardada antes de receber outro catálogo. Seus produtos e fotos foram preservados.");return false;}
    try{
      const value=buildAssistanceReview(requestId,capture,restaurantId,current.current);
      latestReading.current=value;setPages(value.pages);setItems(value.items);setUnmatched(value.unmatched);setText(value.text||"");setAssistanceRequestId(requestId);setPhotoSuggestions(value.photoSuggestions||{});setApprovedPhotos({});setShowSources(false);setRestored(false);
      setNotice("Catálogo recebido para revisão. Preços do iFood podem incluir acréscimos e taxas: confira os valores que deseja cobrar e aprove cada foto antes de adicionar.");
      void saveReading(value).catch(()=>{if(mounted.current)setStorageNote("Não foi possível guardar esta revisão no aparelho. Confira antes de sair.");});
      return true;
    }catch(error){setError(error instanceof Error?error.message:"Não foi possível abrir a revisão recebida.");return false;}
  }
  function assignSize(size:Size){setConfirmed(false);setItems(old=>old.map(v=>v.kind==="pizza"&&v.price?{...v,price:null,sizes:{...v.sizes,[size]:v.price},issues:v.issues.filter(s=>!s.includes("tamanho desse preço"))}:v));}
  const selected=items.filter(v=>v.selected),pending=items.filter(v=>!readerItemReady(v));
  let previewData:RestaurantData|null=null;try{previewData=previewReviewedMenu(draft,items,photoSuggestions,approvedPhotos);}catch{}
  async function apply(){
    if(applying.current)return;applying.current=true;setBusy(true);
    try{
      if(!confirmed)throw Error("Confira os preços e marque a confirmação.");
      // Explicit approval belongs to each suggested photo. Upload only for
      // selected, sellable products during their confirmed draft import.
      if(items.some(item=>item.selected&&approvedPhotos[item.id]&&!item.image))setLabel("Salvando as fotos conferidas antes de adicionar os produtos…");
      const withPhotos=await attachApprovedMenuPhotos(items,photoSuggestions,approvedPhotos,restaurantId,(id,url)=>{
        setItems(old=>old.map(value=>value.id===id?{...value,image:url}:value));
      });
      const {remaining}=await importReaderItems(current.current,withPhotos,onImport);
      if(!mounted.current)return;
      setConfirmed(false);setItems(remaining);setPhotoSuggestions(old=>Object.fromEntries(Object.entries(old).filter(([key])=>remaining.some(item=>item.id===key))));setApprovedPhotos({});setRestored(remaining.length>0);setOpen(false);
      latestReading.current={restaurantId,savedAt:Date.now(),pages:remaining.length?pages:[],items:remaining,unmatched:remaining.length?unmatched:[],text:remaining.length?text:"",...(remaining.length?{assistanceRequestId,photoSuggestions:Object.fromEntries(Object.entries(savedPhotos).filter(([key])=>remaining.some(item=>item.id===key)))}:{})};
      if(remaining.length)await saveReading(latestReading.current).catch(()=>{});
      else{setPages([]);setText("");setUnmatched([]);setAssistanceRequestId(undefined);await removeReading(restaurantId).catch(()=>{});}
    }catch(e){setError(e instanceof Error?e.message:"Confira os produtos selecionados.");}
    finally{applying.current=false;if(mounted.current){setBusy(false);setLabel("");}}
  }
  async function discard(){
    if(busy||!window.confirm("Descartar esta leitura guardada? Os produtos já adicionados ao rascunho continuam no cardápio."))return;
    latestReading.current=null;setPages([]);setItems([]);setPhotoSuggestions({});setApprovedPhotos({});setAssistanceRequestId(undefined);setText("");setUnmatched([]);setConfirmed(false);setRestored(false);setSource(null);setShowSources(false);setError("");
    await removeReading(restaurantId).catch(()=>{if(mounted.current)setStorageNote("Não foi possível remover a cópia guardada neste aparelho.");});
  }
  function closeReading(){
    if(busy)return;const value=latestReading.current;
    if(value&&(value.pages.length||value.items.length||value.text?.trim()))void saveReading(value).catch(()=>{if(mounted.current)setStorageNote("Não foi possível guardar a leitura neste aparelho.");});
    setOpen(false);
  }
  const photo=pages.find(p=>p.id===source?.sourceId);
  return <><section className="menu-reader-entry"><div><span className="menu-reader-symbol"><FileText size={25}/></span><h3>{draft.products.length?"Importar mais produtos":"Traga seu cardápio"}</h3><p>Envie o PDF do cardápio ou fotos, sem cadastrar produto por produto. Os valores serão conferidos antes da publicação.</p></div><div className="menu-import-choices"><button type="button" className="btn primary" disabled={!initialized} onClick={()=>{setOpen(true);setShowSources(true);setError("");}}> <FileText size={18}/>Importar PDF ou fotos</button>{restored&&<button type="button" className="text-button" disabled={!initialized} onClick={()=>{setOpen(true);setShowSources(false);setError("");}}>Continuar leitura guardada<ArrowRight size={16}/></button>}</div></section>
    <MenuAssistanceOwner startOpen={assistanceOpen} initialUrl={sourceText.links[0]?.url} initialContact={draft.whatsapp} restaurantId={restaurantId} disabled={!initialized||busy} onReceive={receiveAssisted}/>
    <Modal open={open} onClose={closeReading} title={items.length&&!showSources?"Confira os produtos":"Importar cardápio"} wide>
      {storageNote&&<p role="status" className="reader-note">{storageNote}</p>}{(pages.length>0||items.length>0||text.trim())&&<button type="button" className="text-button" disabled={busy} onClick={()=>void discard()}>Descartar leitura guardada</button>}
      <MenuSourceLink source={sourceText}/>{notice&&<p className="reader-note" role="status">{notice}</p>}

      {items.length&&!showSources?<div className="menu-reader-review">
        <div className="reader-review-heading"><div><b>{items.length} itens reconhecidos</b><p>{pending.length?`${pending.length} precisam de revisão. Confira os valores e os tamanhos ou importe os demais.`:"Confira os preços. Os produtos vão para o rascunho."}</p></div><button type="button" className="text-button" disabled={busy} onClick={()=>{setShowSources(true);setConfirmed(false);}}>Fotos e texto</button></div>
        <label className="reader-select-all"><input type="checkbox" checked={items.some(v=>readerItemReady(v)&&!v.existingId)&&items.filter(v=>readerItemReady(v)&&!v.existingId).every(v=>v.selected)} onChange={e=>{setConfirmed(false);setItems(old=>old.map(v=>({...v,selected:e.target.checked&&readerItemReady(v)&&!v.existingId})));}}/>Selecionar itens novos com preço</label>
        {Object.keys(photoSuggestions).length>0&&<p className="reader-photo-batch-note">As fotos encontradas na fonte aparecem com os produtos. Confira cada uma e marque as correspondentes: as imagens aprovadas serão vinculadas ao rascunho junto com os produtos, sem gerar novas fotos por IA.</p>}
        {items.some(v=>v.kind==="pizza"&&v.price)&&<label className="reader-size-group">Os preços sem tamanho são de qual pizza?<select defaultValue="" onChange={e=>{if(e.target.value)assignSize(e.target.value as Size);}}><option value="">Escolha para preencher de uma vez</option><option value="p">Pequena</option><option value="m">Média</option><option value="g">Grande</option></select><small>Use somente se esses preços forem do mesmo tamanho.</small></label>}
        <div className="reader-item-list">{items.map(item=><article key={item.id} className={`reader-item ${item.selected?"":"unselected"}`}>
          <div className="reader-item-summary"><input type="checkbox" checked={item.selected} disabled={!!item.reviewRequired} aria-label={`Importar ${item.name}`} onChange={e=>patch(item.id,{selected:e.target.checked})}/><div><b>{item.name}</b><small>{item.kind==="crust"?"Borda":item.category}{item.existingId?" · já cadastrado":""}</small>{item.description&&<p>{item.description}</p>}</div><div className="reader-price-summary">{item.kind==="pizza"?(["p","m","g"] as const).filter(s=>item.sizes[s]).map(s=><span key={s}>{s.toUpperCase()} <b>{money(item.sizes[s]!)}</b></span>):item.price?<b>{money(item.price)}</b>:null}{item.kind==="pizza"&&item.price&&<span>Sem tamanho <b>{money(item.price)}</b></span>}{!readerItemReady(item)&&<span className="reader-pending"><AlertCircle size={14}/>{item.reviewRequired?"Revisar leitura":"Conferir preço / tamanho"}</span>}</div></div>
          {photoSuggestions[item.id]&&!item.image&&<div className="reader-photo-approval"><button type="button" className="reader-photo-suggestion" onClick={()=>setSource(item)}><img src={photoSuggestions[item.id]} alt={`Possível foto de ${item.name}`}/><span>Ver foto sugerida e trecho original <ArrowRight size={14}/></span></button><label><input type="checkbox" checked={!!approvedPhotos[item.id]} disabled={!item.selected||!readerItemReady(item)||busy} onChange={e=>{setConfirmed(false);setApprovedPhotos(old=>({...old,[item.id]:e.target.checked}));}}/>Conferi: esta foto representa {item.name} e tenho autorização para usá-la.</label></div>}
          {item.issues.length>0&&<p className="reader-issues">{[...new Set(item.issues)].join(" ")}</p>}
          {item.reviewRequired&&<label className="reader-confirm-item"><input type="checkbox" checked={false} onChange={()=>patch(item.id,{reviewRequired:false,selected:false})}/>Revisei este produto e o preço que vou praticar.</label>}
          <details className="reader-edit"><summary>Conferir ou ajustar <Eye size={14}/></summary><div className="reader-edit-grid"><label>Nome<input value={item.name} maxLength={100} onChange={e=>patch(item.id,{name:e.target.value})}/></label><label>Tipo<select value={item.kind} onChange={e=>patch(item.id,{kind:e.target.value as ReaderItem["kind"]})}><option value="pizza">Pizza</option><option value="simple">Produto, bebida ou combo</option><option value="crust">Borda</option></select></label><label>Categoria<input value={item.category} maxLength={60} onChange={e=>patch(item.id,{category:e.target.value})}/></label><label className="reader-description">Ingredientes / descrição<input value={item.description} maxLength={600} onChange={e=>patch(item.id,{description:e.target.value})}/></label>{item.kind==="pizza"?(["p","m","g"] as const).map(s=><label key={s}>{s.toUpperCase()} · R$<input inputMode="decimal" defaultValue={item.sizes[s]?(item.sizes[s]!/100).toFixed(2).replace(".",","):""} key={`${item.id}-${s}-${item.sizes[s]}`} placeholder="Sem este tamanho" onBlur={e=>patch(item.id,{sizes:{...item.sizes,[s]:e.target.value.trim()?menuAmount(e.target.value):null}})}/></label>):<label>Preço · R$<input inputMode="decimal" defaultValue={item.price?(item.price/100).toFixed(2).replace(".",","):""} placeholder="Informe o preço" onBlur={e=>patch(item.id,{price:menuAmount(e.target.value)})}/></label>}</div>{item.image&&<p className="reader-crop-confirmed"><Check size={14}/>Foto do print vinculada para conferência</p>}<button type="button" className="text-button" onClick={()=>setSource(item)}><Eye size={15}/>Ver trecho original / aproveitar foto</button></details>
        </article>)}</div>
        {unmatched.length>0&&<details className="reader-unmatched"><summary>{unmatched.length} outros trechos da fonte</summary><p>Confira se há alguma borda, tamanho ou oferta para cadastrar manualmente.</p>{unmatched.map((v,i)=><p key={i}>{v.text}</p>)}</details>}
        <label className="check-option reader-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Conferi os produtos, tamanhos e preços que quero cobrar diretamente (os valores do iFood podem ser diferentes).</label>
        {error&&<p role="alert" className="field-error">{error}</p>}
        {busy&&label&&<p className="reader-note" role="status">{label}</p>}
        <div className="reader-footer"><button type="button" className="btn outline" disabled={!previewData} onClick={()=>setPreview(true)}><Eye size={17}/>Ver cardápio</button><button type="button" className="btn primary" disabled={busy||!confirmed||!selected.length||selected.some(v=>!readerItemReady(v))} onClick={()=>void apply()}><Check size={17}/>Adicionar {selected.length} ao rascunho{Object.values(approvedPhotos).some(Boolean)?" com fotos aprovadas":""}</button></div><small>Se você selecionar um item já cadastrado, seus textos e preços serão atualizados após a confirmação. Publique depois para os clientes verem.</small>
      </div>:<div className="menu-reader-source">
        <p>Traga os produtos de uma vez. Você confere os preços antes de adicionar ao cardápio.</p>{items.length>0&&<><p>Você pode ler novamente. Os ajustes dos trechos que não mudaram serão mantidos.</p><button type="button" className="text-button" disabled={busy} onClick={()=>setShowSources(false)}>Voltar aos itens já lidos</button></>}
        <div className="reader-upload-actions"><label className="btn outline"><FileText size={18}/>PDF, TXT ou CSV<input type="file" accept=".pdf,.txt,.csv,.html,.htm,application/pdf,text/plain,text/csv,text/html" hidden disabled={busy} onChange={textFile}/></label><a href="/modelo-cardapio.csv" download className="text-button">Modelo CSV</a><label className="btn outline"><Camera size={18}/>Tirar foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden disabled={busy} onChange={files}/></label><label className="btn outline"><Upload size={18}/>Escolher fotos<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={files}/></label></div>
        {pages.length>0&&<div className="reader-photo-list">{pages.map(page=><article key={page.id}><img src={page.image} alt={page.name}/><small>{page.name}</small><div><button type="button" className="icon-btn" disabled={busy} aria-label={`Girar ${page.name}`} onClick={()=>{void rotateMenuPhoto(page).then(rotated=>{setPages(old=>old.map(v=>v.id===page.id?rotated:v));setItems(old=>old.map(item=>item.sourceId===page.id?{...item,box:undefined}:item));setConfirmed(false);}).catch(()=>setError("Não foi possível girar a foto."));}}><RotateCw size={16}/></button><button type="button" className="icon-btn" disabled={busy} aria-label={`Remover ${page.name}`} onClick={()=>{setPages(old=>old.filter(v=>v.id!==page.id));setItems(old=>old.filter(item=>item.sourceId!==page.id));setConfirmed(false);}}><Trash2 size={16}/></button></div></article>)}</div>}
        <div className="reader-text-source"><label htmlFor="reader-menu-text"><FileText size={16}/>Texto do cardápio</label><textarea id="reader-menu-text" aria-label="Texto do cardápio" rows={7} maxLength={60000} disabled={busy} value={text} onChange={e=>{setText(e.target.value);setConfirmed(false);}} placeholder={'Cole os produtos e preços. Para solicitar por link, use o atendimento fora deste leitor.\n\nPizzas\nP M G\nCalabresa 29,90 39,90 49,90\nMolho, muçarela, calabresa e cebola\nBebidas\nRefrigerante 2L R$ 12,00'}/></div>
        {error&&<p role="alert" className="field-error">{error}</p>}
        {busy&&<div className="reader-progress" role="status"><Spinner/><span>{label||"Preparando a foto…"}</span><progress max={1} value={progress}/></div>}
        <button type="button" className="btn primary full" disabled={busy||(!pages.length&&sourceText.menuText.length<5&&!sourceText.links.length)} onClick={()=>void read()}>{busy?<Spinner/>:<ArrowRight size={18}/>}Ler e conferir produtos</button>{busy&&<button type="button" className="text-button" onClick={()=>controller.current?.abort()}>Cancelar leitura</button>}
        <small>Até 8 fotos · JPG, PNG ou WebP · 15 MB por foto. Sua leitura fica guardada neste aparelho por até 7 dias.</small>
      </div>}
    </Modal>
    <Modal open={preview} onClose={()=>setPreview(false)} title="Assim fica seu cardápio" wide>{previewData&&<Menu data={previewData} preview/>}</Modal>
    <Modal open={!!source} onClose={()=>setSource(null)} title="Trecho original" wide>{photo?<div className="reader-source-photo"><div style={{position:"relative"}}><img src={photo.image} alt="Foto original do cardápio"/>{source?.box&&<svg viewBox={`0 0 ${photo.width} ${photo.height}`} aria-hidden="true"><rect x={source.box.x0} y={source.box.y0} width={source.box.x1-source.box.x0} height={source.box.y1-source.box.y0}/></svg>}</div><p>{source?.sourceText}</p>{source&&<ProductPhotoCrop key={source.id} page={photo} item={source} neighbors={sourceNeighbors} restaurantId={restaurantId} onAttach={url=>{patch(source.id,{image:url});setSource(null);setStorageNote("Foto aproveitada desta captura. Ela será associada ao produto quando você confirmar a importação.");}}/>}</div>:<>{source&&photoSuggestions[source.id]&&<img src={photoSuggestions[source.id]} alt={`Foto recebida de ${source.name}`} style={{maxWidth:"100%",maxHeight:500,objectFit:"contain"}}/>}<p>{source?.sourceText}</p></>}</Modal>
  </>;
}
