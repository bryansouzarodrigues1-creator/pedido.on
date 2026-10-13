"use client";
import {useState,useEffect,useRef,useMemo,type ChangeEvent} from "react";
import {Upload,Camera,ArrowRight,Check,Trash2,RotateCw,FileText,AlertCircle,Eye} from "lucide-react";
import {Modal,Spinner} from "./ui";
import Menu from "./menu";
import {money,type RestaurantData,type Size} from "@/lib/domain";
import {readMenuPages,prepareReaderItems,applyReaderItems,readerItemReady,menuAmount,importReaderItems,reconcileReaderReview,type ReaderItem,type ReaderPage} from "@/lib/menu-reader-policy";
import {loadReading,saveReading,removeReading,type Reading} from "@/lib/menu-reader-storage";
import {prepareMenuPhoto,recognizeMenuPhotos,rotateMenuPhoto} from "@/lib/menu-ocr";
import ProductPhotoCrop from "./product-photo-crop";
import MenuSourceLink from "./menu-source-link";
import {inspectMenuSourceText,mergeMenuSourceText} from "@/lib/menu-source-links";

export default function AiImport({restaurantId,draft,onImport,onActivityChange,incomingSource,onSourceReceived}:{restaurantId:string;draft:RestaurantData;onImport:(patch:Partial<RestaurantData>)=>void|Promise<void>;onActivityChange?:(active:boolean)=>void;incomingSource?:{requestId:string;text:string}|null;onSourceReceived?:(requestId:string)=>void}){
  const [open,setOpen]=useState(false),[pages,setPages]=useState<ReaderPage[]>([]),[items,setItems]=useState<ReaderItem[]>([]),[unmatched,setUnmatched]=useState<{sourceId:string;text:string}[]>([]);
  const [showSources,setShowSources]=useState(false),[text,setText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[progress,setProgress]=useState(0),[label,setLabel]=useState(""),[restored,setRestored]=useState(false),[confirmed,setConfirmed]=useState(false),[preview,setPreview]=useState(false),[source,setSource]=useState<ReaderItem|null>(null),[storageNote,setStorageNote]=useState(""),[initialized,setInitialized]=useState(false);
  const controller=useRef<AbortController|null>(null),mounted=useRef(true),current=useRef(draft);current.current=draft;
  const sourceNeighbors=useMemo(()=>readMenuPages(pages.filter(page=>page.id===source?.sourceId).map(page=>({id:page.id,lines:page.lines}))).items.flatMap(item=>item.box?[item.box]:[]),[pages,source?.sourceId]);
  const sourceText=useMemo(()=>inspectMenuSourceText(text),[text]);
  const receivedSource=useRef("");
  const latestReading=useRef<Reading|null>(null),applying=useRef(false);
  latestReading.current=initialized?{restaurantId,savedAt:Date.now(),pages,items,unmatched,text}:null;
  useEffect(()=>()=>{const value=latestReading.current;if(value&&(value.pages.length||value.items.length||value.text?.trim()))void saveReading(value).catch(()=>{});},[restaurantId]);
  useEffect(()=>{onActivityChange?.(open||busy||preview||!!source);return()=>onActivityChange?.(false);},[onActivityChange,open,busy,preview,source?.id]);
  useEffect(()=>{mounted.current=true;void loadReading(restaurantId).then(value=>{if(!value||!mounted.current)return;setPages(value.pages);setItems(prepareReaderItems(value.items,current.current,{preserveSelection:true}));setText(value.text||"");setUnmatched(value.unmatched||[]);setRestored(true);}).catch(()=>{if(mounted.current)setStorageNote("A leitura ficará disponível enquanto esta tela estiver aberta.");}).finally(()=>{if(mounted.current)setInitialized(true);});return()=>{mounted.current=false;controller.current?.abort();};},[restaurantId]);
  // Queue cleanup of an empty restored reading before accepting a chat source.
  useEffect(()=>{if(!initialized)return;if(!pages.length&&!items.length&&!text.trim()){void removeReading(restaurantId).catch(()=>{});return;}const timer=setTimeout(()=>{void saveReading({restaurantId,savedAt:Date.now(),pages,items,unmatched,text}).catch(()=>{if(mounted.current)setStorageNote("Não foi possível guardar a leitura neste aparelho. Confira antes de sair.");});},500);return()=>clearTimeout(timer);},[pages,items,unmatched,text,restaurantId,initialized]);
  useEffect(()=>{
    if(!initialized||busy||!incomingSource||receivedSource.current===incomingSource.requestId)return;
    setOpen(true);setShowSources(true);setConfirmed(false);
    try{const merged=mergeMenuSourceText(text,incomingSource.text),value={restaurantId,savedAt:Date.now(),pages,items,unmatched,text:merged};latestReading.current=value;receivedSource.current=incomingSource.requestId;setText(merged);setError("");void saveReading(value).catch(()=>{if(mounted.current)setStorageNote("Não foi possível guardar a referência neste aparelho. Confira antes de sair.");});onSourceReceived?.(incomingSource.requestId);}
    catch(error){setError(error instanceof Error?error.message:"Não foi possível acrescentar a referência. Sua leitura foi mantida.");}
  },[initialized,busy,incomingSource,onSourceReceived,text,restaurantId,pages,items,unmatched]);
  function patch(id:string,value:Partial<ReaderItem>){setConfirmed(false);setItems(old=>old.map(v=>v.id===id?{...v,...value}:v));}
  async function files(event:ChangeEvent<HTMLInputElement>){const list=Array.from(event.target.files||[]);event.target.value="";if(!list.length)return;if(pages.length+list.length>8){setError("Envie até 8 fotos por leitura. Você pode importar outra parte depois.");return;}setBusy(true);setError("");try{const added:ReaderPage[]=[];for(const file of list)added.push(await prepareMenuPhoto(file));if(mounted.current){setPages(old=>[...old,...added]);setShowSources(true);setConfirmed(false);}}catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir a foto.");}finally{if(mounted.current)setBusy(false);}}
  async function read(){
    if(busy)return;setBusy(true);setError("");setConfirmed(false);setProgress(0);const abort=new AbortController();controller.current=abort;
    try{
      let ready=pages;const missing=pages.filter(p=>!p.lines.length);
      if(missing.length){const scanned=await recognizeMenuPhotos(missing,abort.signal,(amount,note)=>{if(mounted.current){setProgress(amount);setLabel(note);}},async page=>{ready=ready.map(p=>p.id===page.id?page:p);if(mounted.current)setPages(ready);await saveReading({restaurantId,savedAt:Date.now(),pages:ready,items,unmatched,text}).catch(()=>{});});ready=pages.map(p=>scanned.find(v=>v.id===p.id)||p);}
      const input=ready.map(p=>({id:p.id,lines:p.lines}));if(sourceText.menuText)input.push({id:"text",lines:sourceText.menuText.split("\n").map(value=>({text:value}))});
      if(!input.length&&sourceText.status!=="none")throw Error("Para importar os produtos desse link, envie prints ou cole o texto do cardápio com os preços.");
      const result=readMenuPages(input);if(result.items.length>500)throw Error("A leitura tem muitos trechos. Envie uma parte do cardápio por vez.");
      if(!result.items.length)throw Error("Não encontramos os produtos. Tente uma foto mais próxima e reta, ou cole o texto.");
      if(!mounted.current)return;setPages(ready);setItems(reconcileReaderReview(items,result.items,current.current));setShowSources(false);setUnmatched(result.unmatched);setRestored(false);
    }catch(e){if(!abort.signal.aborted&&mounted.current)setError(e instanceof Error?e.message:"Não foi possível ler essa foto. Tente uma foto mais nítida ou cole o texto.");}
    finally{if(mounted.current){setBusy(false);setLabel("");}controller.current=null;}
  }
  function assignSize(size:Size){setConfirmed(false);setItems(old=>old.map(v=>v.kind==="pizza"&&v.price?{...v,price:null,sizes:{...v.sizes,[size]:v.price},issues:v.issues.filter(s=>!s.includes("tamanho desse preço"))}:v));}
  const selected=items.filter(v=>v.selected),pending=items.filter(v=>!readerItemReady(v));
  let previewData:RestaurantData|null=null;try{let n=0;previewData={...draft,...applyReaderItems(draft,items,()=>`import-preview-${++n}`)};}catch{}
  async function apply(){
    if(applying.current)return;applying.current=true;setBusy(true);
    try{
      if(!confirmed)throw Error("Confira os preços e marque a confirmação.");
      const {remaining}=await importReaderItems(current.current,items,onImport);
      if(!mounted.current)return;
      setConfirmed(false);setItems(remaining);setRestored(remaining.length>0);setOpen(false);
      latestReading.current={restaurantId,savedAt:Date.now(),pages:remaining.length?pages:[],items:remaining,unmatched:remaining.length?unmatched:[],text:remaining.length?text:""};
      if(remaining.length)await saveReading(latestReading.current).catch(()=>{});
      else{setPages([]);setText("");setUnmatched([]);await removeReading(restaurantId).catch(()=>{});}
    }catch(e){setError(e instanceof Error?e.message:"Confira os produtos selecionados.");}
    finally{applying.current=false;if(mounted.current)setBusy(false);}
  }
  async function discard(){
    if(busy||!window.confirm("Descartar esta leitura guardada? Os produtos já adicionados ao rascunho continuam no cardápio."))return;
    latestReading.current=null;setPages([]);setItems([]);setText("");setUnmatched([]);setConfirmed(false);setRestored(false);setSource(null);setShowSources(false);setError("");
    await removeReading(restaurantId).catch(()=>{if(mounted.current)setStorageNote("Não foi possível remover a cópia guardada neste aparelho.");});
  }
  function closeReading(){
    if(busy)return;const value=latestReading.current;
    if(value&&(value.pages.length||value.items.length||value.text?.trim()))void saveReading(value).catch(()=>{if(mounted.current)setStorageNote("Não foi possível guardar a leitura neste aparelho.");});
    setOpen(false);
  }
  const photo=pages.find(p=>p.id===source?.sourceId);
  return <><section className="menu-reader-entry"><div><span className="menu-reader-symbol"><Camera size={25}/></span><h3>{draft.products.length?"Traga outra parte do cardápio":"Seu cardápio começa com uma foto"}</h3><p>{restored?"Você tem uma leitura guardada neste aparelho.":"Envie a foto, confira os preços e adicione os sabores."}</p><small>Leitura no aparelho · sem créditos de IA</small></div><button type="button" className="btn primary" disabled={!initialized} onClick={()=>{setOpen(true);setError("");}}>{restored?"Continuar leitura":"Enviar foto do cardápio"}<ArrowRight size={18}/></button></section>
    <Modal open={open} onClose={closeReading} title={items.length&&!showSources?"Confira seu cardápio":"Envie seu cardápio"} wide>
      {storageNote&&<p role="status" className="reader-note">{storageNote}</p>}{(pages.length>0||items.length>0||text.trim())&&<button type="button" className="text-button" disabled={busy} onClick={()=>void discard()}>Descartar leitura guardada</button>}
      <MenuSourceLink source={sourceText}/>
      {items.length&&!showSources?<div className="menu-reader-review">
        <div className="reader-review-heading"><div><b>{items.length} itens reconhecidos</b><p>{pending.length?`${pending.length} precisam de preço ou tamanho. Você pode resolver agora ou importar os demais.`:"Confira os preços. Os produtos vão para o rascunho."}</p></div><button type="button" className="text-button" disabled={busy} onClick={()=>{setShowSources(true);setConfirmed(false);}}>Fotos e texto</button></div>
        <label className="reader-select-all"><input type="checkbox" checked={items.some(v=>readerItemReady(v)&&!v.existingId)&&items.filter(v=>readerItemReady(v)&&!v.existingId).every(v=>v.selected)} onChange={e=>{setConfirmed(false);setItems(old=>old.map(v=>({...v,selected:e.target.checked&&readerItemReady(v)&&!v.existingId})));}}/>Selecionar itens novos com preço</label>
        {items.some(v=>v.kind==="pizza"&&v.price)&&<label className="reader-size-group">Os preços sem tamanho são de qual pizza?<select defaultValue="" onChange={e=>{if(e.target.value)assignSize(e.target.value as Size);}}><option value="">Escolha para preencher de uma vez</option><option value="p">Pequena</option><option value="m">Média</option><option value="g">Grande</option></select><small>Use somente se esses preços forem do mesmo tamanho.</small></label>}
        <div className="reader-item-list">{items.map(item=><article key={item.id} className={`reader-item ${item.selected?"":"unselected"}`}>
          <div className="reader-item-summary"><input type="checkbox" checked={item.selected} aria-label={`Importar ${item.name}`} onChange={e=>patch(item.id,{selected:e.target.checked})}/><div><b>{item.name}</b><small>{item.kind==="crust"?"Borda":item.category}{item.existingId?" · já cadastrado":""}</small>{item.description&&<p>{item.description}</p>}</div><div className="reader-price-summary">{item.kind==="pizza"?(["p","m","g"] as const).filter(s=>item.sizes[s]).map(s=><span key={s}>{s.toUpperCase()} <b>{money(item.sizes[s]!)}</b></span>):item.price?<b>{money(item.price)}</b>:null}{item.kind==="pizza"&&item.price&&<span>Sem tamanho <b>{money(item.price)}</b></span>}{!readerItemReady(item)&&<span className="reader-pending"><AlertCircle size={14}/>Conferir preço</span>}</div></div>
          {item.issues.length>0&&<p className="reader-issues">{[...new Set(item.issues)].join(" ")}</p>}
          <details className="reader-edit"><summary>Conferir ou ajustar <Eye size={14}/></summary><div className="reader-edit-grid"><label>Nome<input value={item.name} maxLength={100} onChange={e=>patch(item.id,{name:e.target.value})}/></label><label>Tipo<select value={item.kind} onChange={e=>patch(item.id,{kind:e.target.value as ReaderItem["kind"]})}><option value="pizza">Pizza</option><option value="simple">Bebida ou combo</option><option value="crust">Borda</option></select></label><label>Categoria<input value={item.category} maxLength={60} onChange={e=>patch(item.id,{category:e.target.value})}/></label><label className="reader-description">Ingredientes / descrição<input value={item.description} maxLength={600} onChange={e=>patch(item.id,{description:e.target.value})}/></label>{item.kind==="pizza"?(["p","m","g"] as const).map(s=><label key={s}>{s.toUpperCase()} · R$<input inputMode="decimal" defaultValue={item.sizes[s]?(item.sizes[s]!/100).toFixed(2).replace(".",","):""} key={`${item.id}-${s}-${item.sizes[s]}`} placeholder="Sem este tamanho" onBlur={e=>patch(item.id,{sizes:{...item.sizes,[s]:e.target.value.trim()?menuAmount(e.target.value):null}})}/></label>):<label>Preço · R$<input inputMode="decimal" defaultValue={item.price?(item.price/100).toFixed(2).replace(".",","):""} placeholder="Informe o preço" onBlur={e=>patch(item.id,{price:menuAmount(e.target.value)})}/></label>}</div>{item.image&&<p className="reader-crop-confirmed"><Check size={14}/>Foto do print vinculada para conferência</p>}<button type="button" className="text-button" onClick={()=>setSource(item)}><Eye size={15}/>Ver trecho original / aproveitar foto</button></details>
        </article>)}</div>
        {unmatched.length>0&&<details className="reader-unmatched"><summary>{unmatched.length} outros trechos da fonte</summary><p>Confira se há alguma borda, tamanho ou oferta para cadastrar manualmente.</p>{unmatched.map((v,i)=><p key={i}>{v.text}</p>)}</details>}
        <label className="check-option reader-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Conferi os nomes, os tamanhos e os preços selecionados.</label>
        {error&&<p role="alert" className="field-error">{error}</p>}
        <div className="reader-footer"><button type="button" className="btn outline" disabled={!previewData} onClick={()=>setPreview(true)}><Eye size={17}/>Ver cardápio</button><button type="button" className="btn primary" disabled={busy||!confirmed||!selected.length||selected.some(v=>!readerItemReady(v))} onClick={()=>void apply()}><Check size={17}/>Adicionar {selected.length} ao rascunho</button></div><small>Se você selecionar um item já cadastrado, seus textos e preços serão atualizados após a confirmação. Publique depois para os clientes verem.</small>
      </div>:<div className="menu-reader-source">
        <p>Fotografe de frente, com boa luz e preços legíveis. Se houver mais páginas, envie uma foto de cada.</p>{items.length>0&&<><p>Você pode ler novamente. Os ajustes dos trechos que não mudaram serão mantidos.</p><button type="button" className="text-button" disabled={busy} onClick={()=>setShowSources(false)}>Voltar aos itens já lidos</button></>}
        <div className="reader-upload-actions"><label className="btn primary"><Camera size={18}/>Tirar foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden disabled={busy} onChange={files}/></label><label className="btn outline"><Upload size={18}/>Escolher fotos<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={files}/></label></div>
        {pages.length>0&&<div className="reader-photo-list">{pages.map(page=><article key={page.id}><img src={page.image} alt={page.name}/><small>{page.name}</small><div><button type="button" className="icon-btn" disabled={busy} aria-label={`Girar ${page.name}`} onClick={()=>{void rotateMenuPhoto(page).then(rotated=>{setPages(old=>old.map(v=>v.id===page.id?rotated:v));setItems(old=>old.map(item=>item.sourceId===page.id?{...item,box:undefined}:item));setConfirmed(false);}).catch(()=>setError("Não foi possível girar a foto."));}}><RotateCw size={16}/></button><button type="button" className="icon-btn" disabled={busy} aria-label={`Remover ${page.name}`} onClick={()=>{setPages(old=>old.filter(v=>v.id!==page.id));setItems(old=>old.filter(item=>item.sourceId!==page.id));setConfirmed(false);}}><Trash2 size={16}/></button></div></article>)}</div>}
        <details className="reader-text-source"><summary><FileText size={16}/>Colar texto ou link da loja</summary><textarea aria-label="Texto do cardápio ou mensagem com o link da loja" rows={7} maxLength={60000} disabled={busy} value={text} onChange={e=>{setText(e.target.value);setConfirmed(false);}} placeholder={'Cole os produtos e preços ou a mensagem com o link da loja no iFood.\n\nPizzas\nP M G\nCalabresa 29,90 39,90 49,90\nMolho, muçarela, calabresa e cebola\nBebidas\nRefrigerante 2L R$ 12,00'}/></details>
        {error&&<p role="alert" className="field-error">{error}</p>}
        {busy&&<div className="reader-progress" role="status"><Spinner/><span>{label||"Preparando a foto…"}</span><progress max={1} value={progress}/></div>}
        <button type="button" className="btn primary full" disabled={busy||(!pages.length&&sourceText.menuText.length<5)} onClick={()=>void read()}>{busy?<Spinner/>:<ArrowRight size={18}/>}Ler e conferir cardápio</button>{busy&&<button type="button" className="text-button" onClick={()=>controller.current?.abort()}>Cancelar leitura</button>}
        <small>Até 8 fotos · JPG, PNG ou WebP · 15 MB por foto. A primeira leitura carrega o leitor. A leitura pode ser retomada neste aparelho por até 7 dias; nenhum modelo pago é chamado.</small>
      </div>}
    </Modal>
    <Modal open={preview} onClose={()=>setPreview(false)} title="Assim fica seu cardápio" wide>{previewData&&<Menu data={previewData} preview/>}</Modal>
    <Modal open={!!source} onClose={()=>setSource(null)} title="Trecho original" wide>{photo?<div className="reader-source-photo"><div style={{position:"relative"}}><img src={photo.image} alt="Foto original do cardápio"/>{source?.box&&<svg viewBox={`0 0 ${photo.width} ${photo.height}`} aria-hidden="true"><rect x={source.box.x0} y={source.box.y0} width={source.box.x1-source.box.x0} height={source.box.y1-source.box.y0}/></svg>}</div><p>{source?.sourceText}</p>{source&&<ProductPhotoCrop key={source.id} page={photo} item={source} neighbors={sourceNeighbors} restaurantId={restaurantId} onAttach={url=>{patch(source.id,{image:url});setSource(null);setStorageNote("Foto aproveitada desta captura. Ela será associada ao produto quando você confirmar a importação.");}}/>}</div>:<p>{source?.sourceText}</p>}</Modal>
  </>;
}
