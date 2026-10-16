"use client";
import {useEffect,useRef,useState,type ChangeEvent,type FormEvent} from "react";
import {ArrowRight,ArrowUpRight,Check,Link2,Paperclip,Sparkles,X,FileText,ImagePlus} from "lucide-react";
import {demoRestaurant,defaultRestaurant,type RestaurantData} from "@/lib/domain";
import {localStudio,proposalPatch} from "@/lib/studio-policy";
import {layoutNames,menuPresentation} from "@/lib/menu-design";
import {readMenuLaunch,saveMenuLaunch,guestReadingKey,launchSignup,type MenuLaunch} from "@/lib/menu-launch";
import {inspectMenuSourceText} from "@/lib/menu-source-links";
import {menuFileText} from "@/lib/menu-file";
import {fetchMenuSource} from "@/lib/menu-source-client";
import {loadReading,saveReading,type Reading} from "@/lib/menu-reader-storage";
import {prepareMenuPhoto,recognizeMenuPhotos} from "@/lib/menu-ocr";
import {applyReaderItems,readMenuPages,readerItemReady,type ReaderPage} from "@/lib/menu-reader-policy";
import {MiniMenu,Spinner} from "./ui";
const ideas=["Artesanal italiano, verde e uma lista elegante","Escuro com fotos grandes e letras fortes","Claro, compacto e sem fotos"];
export default function IdeaStart(){
 const [initialized,setInitialized]=useState(false);
 const [idea,setIdea]=useState(""),[sourceOpen,setSourceOpen]=useState(false),[sourceText,setSourceText]=useState(""),[pages,setPages]=useState<ReaderPage[]>([]),[preview,setPreview]=useState<RestaurantData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[readingLabel,setReadingLabel]=useState(""),[imported,setImported]=useState(0),[saving,setSaving]=useState(false);
 const abort=useRef<AbortController|null>(null),alive=useRef(true),reading=useRef<Reading|null>(null),launch=useRef<MenuLaunch|null>(null);
 useEffect(()=>{alive.current=true;try{const saved=readMenuLaunch(localStorage);if(saved){launch.current=saved;setIdea(saved.idea);setSourceText(saved.sourceText);if(saved.sourceText||saved.hasPhotos)setSourceOpen(true);void loadReading(guestReadingKey(saved.id)).then(v=>{if(alive.current&&v){setPages(v.pages);reading.current=v;}}).catch(()=>{}).finally(()=>{if(alive.current)setInitialized(true);});}else setInitialized(true);}catch{setInitialized(true);}return()=>{alive.current=false;abort.current?.abort();};},[]);
 useEffect(()=>{if(!initialized||!idea&&!sourceText&&!pages.length)return;const timer=setTimeout(()=>{try{const value={id:launch.current?.id||crypto.randomUUID(),savedAt:Date.now(),idea,sourceText,hasPhotos:!!pages.length};saveMenuLaunch(localStorage,value);launch.current=value;}catch{}},350);return()=>clearTimeout(timer);},[idea,sourceText,pages.length,initialized]);
 useEffect(()=>{if(!initialized||!pages.length&&!sourceText)return;const timer=setTimeout(()=>{const value={id:launch.current?.id||crypto.randomUUID(),savedAt:Date.now(),idea,sourceText,hasPhotos:!!pages.length};launch.current=value;try{saveMenuLaunch(localStorage,value);}catch{}const checkpoint={restaurantId:guestReadingKey(value.id),savedAt:Date.now(),pages,items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText};void saveReading(checkpoint).catch(()=>{});},400);return()=>clearTimeout(timer);},[initialized,pages,sourceText]);
 async function files(e:ChangeEvent<HTMLInputElement>){const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setError("");setBusy(true);try{
  const photos=files.filter(f=>f.type.startsWith("image/"));if(pages.length+photos.length>8)throw Error("Envie até oito fotos por vez.");
  const added:ReaderPage[]=[];let text=sourceText;
  for(const file of files){if(file.type.startsWith("image/"))added.push(await prepareMenuPhoto(file));else{if(file.size>240000)throw Error("Envie TXT/CSV com até 60 mil caracteres.");text+=(text?"\n":"")+menuFileText(file.name,await file.text());}}
  if(text.length>60000)throw Error("Importe uma parte por vez, com até 60 mil caracteres.");setPages(old=>[...old,...added]);setSourceText(text);setSourceOpen(true);reading.current=null;setPreview(null);
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir o arquivo.");}finally{setBusy(false);}}
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
   let example=demoRestaurant("editorial");
   if(result.items.length){const base=defaultRestaurant("Sua pizzaria"),items=result.items.map(item=>({...item,selected:item.selected&&readerItemReady(item)}));if(items.some(p=>p.selected))example={...base,...applyReaderItems(base,items)};else example=base;setImported(result.items.length);}
   else setImported(0);
   const proposal=localStudio(idea.trim()||"Cardápio artesanal em lista com verde italiano",example);setPreview({...example,...proposalPatch(proposal,example)});
   if(!launch.current)launch.current={id:crypto.randomUUID(),savedAt:Date.now(),idea,sourceText:text,hasPhotos:!!ready.length};
   reading.current={restaurantId:guestReadingKey(launch.current.id),savedAt:Date.now(),pages:ready,items:result.items,unmatched:result.unmatched,text};
   await saveReading(reading.current).catch(()=>{});
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não foi possível preparar a prévia.");}finally{if(alive.current){setBusy(false);setReadingLabel("");}abort.current=null;}
 }
 async function continueSetup(){
  if(busy||saving)return;setSaving(true);setError("");try{
   const value={id:launch.current?.id||crypto.randomUUID(),savedAt:Date.now(),idea,sourceText,hasPhotos:!!pages.length};saveMenuLaunch(localStorage,value);launch.current=value;
   if(pages.length)await saveReading({...reading.current,restaurantId:guestReadingKey(value.id),savedAt:Date.now(),pages,items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText});
   else if(sourceText)await saveReading({restaurantId:guestReadingKey(value.id),savedAt:Date.now(),pages:[],items:reading.current?.items||[],unmatched:reading.current?.unmatched||[],text:sourceText}).catch(()=>{});
   location.assign(launchSignup);
  }catch{setError("O navegador não conseguiu guardar sua ideia. Libere o armazenamento deste site para levar o conteúdo até o cadastro.");setSaving(false);}
 }
 return <section className="idea-start" id="ideia"><div className="saas-container">
  <div className="idea-intro"><span className="idea-eyebrow"><span/> O SEU PRÓXIMO CARDÁPIO COMEÇA AQUI</span><h1>Sua pizzaria.<br/><em>Do seu jeito.</em></h1><p>Descreva a ideia. Traga seus sabores. Veja o cardápio ganhar a cara da sua marca.</p></div>
  <div className={`idea-workspace ${preview?"has-preview":""}`}><div className="idea-composer-wrap"><form className="idea-composer" onSubmit={generate}>
   <label htmlFor="pizzeria-idea"><Sparkles size={19}/>Como você imagina sua pizzaria?</label>
   <textarea id="pizzeria-idea" rows={4} maxLength={1600} value={idea} onChange={e=>{setIdea(e.target.value);setPreview(null);}} placeholder="Uma pizzaria artesanal, verde italiano, letras elegantes e os sabores em uma lista com fotos ao lado…" disabled={busy||saving||!initialized}/>
   <div className="idea-composer-bottom"><button type="button" className="idea-source-toggle" aria-expanded={sourceOpen} onClick={()=>setSourceOpen(!sourceOpen)}><Paperclip size={17}/>Trazer do iFood</button><button className="btn primary" disabled={busy||saving||!initialized}>{busy?<Spinner/>:<Sparkles size={17}/>} {busy?"Preparando…":"Criar prévia"}<ArrowRight size={17}/></button></div>
  </form>
  <div className="idea-examples" aria-label="Ideias para experimentar">{ideas.map((v,i)=><button key={v} type="button" disabled={busy||saving||!initialized} onClick={()=>{setIdea(v);setPreview(null);setError("");}}>{["Artesanal italiano","Fotos em destaque","Simples e direto"][i]}<ArrowUpRight size={12}/></button>)}</div>
  {sourceOpen&&<div className="idea-source"><div><strong><Link2 size={17}/>Traga o cardápio que você já tem</strong><button className="icon-btn" type="button" aria-label="Recolher importação" onClick={()=>setSourceOpen(false)}><X size={16}/></button></div><label htmlFor="idea-source-text">Link da loja no iFood ou texto dos produtos</label><textarea id="idea-source-text" rows={4} maxLength={60000} value={sourceText} disabled={busy||saving||!initialized} onChange={e=>{setSourceText(e.target.value);setPreview(null);reading.current=null;}} placeholder={'Cole o link do iFood ou os produtos com preços.\nEx.: Calabresa G R$ 49,90'}/><div className="idea-file-actions"><label><ImagePlus size={16}/>Fotos<input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" disabled={busy||saving||!initialized} onChange={files}/></label><label><FileText size={16}/>Arquivo TXT/CSV<input type="file" hidden accept=".txt,.csv,text/plain,text/csv" disabled={busy||saving||!initialized} onChange={files}/></label><a href="/modelo-cardapio.csv" download>Modelo CSV</a></div>{pages.length>0&&<div className="idea-photos">{pages.map(page=><div key={page.id}><img src={page.image} alt={page.name}/><button type="button" disabled={busy||saving||!initialized} aria-label={`Remover ${page.name}`} onClick={()=>{setPages(old=>old.filter(p=>p.id!==page.id));setPreview(null);reading.current=null;}}><X size={13}/></button></div>)}</div>}<small>O link depende do acesso liberado pelo iFood. Texto, arquivo e fotos são lidos aqui, sem geração paga.</small></div>}
  {notice&&<p className="idea-notice" role="status">{notice}</p>}{error&&<p className="idea-error" role="alert">{error}</p>}{busy&&readingLabel&&<p className="idea-notice" role="status">{readingLabel}</p>}
  {preview?<div className="idea-next"><span><Check size={16}/>{imported?`${imported} produtos para conferir no painel`:"Sua direção visual está pronta"}</span><button type="button" className="btn dark" disabled={busy||saving||!initialized} onClick={()=>void continueSetup()}>{saving?<Spinner/>:<>Continuar com esta ideia<ArrowRight size={17}/></>}</button><small>Crie a conta para guardar, ajustar e publicar. Você decide quando colocar no ar.</small></div>:<p className="idea-footnote">Experimente antes de criar a conta. A prévia usa composições prontas; no painel, a IA ajuda a refinar a ideia e os textos.</p>}
  </div>{preview&&<aside className="idea-preview"><header><span className="idea-preview-dot"/><span>{layoutNames[menuPresentation(preview).layout]}</span><small>PRÉVIA</small></header><MiniMenu data={preview} large/><footer>{imported?"Itens e valores sujeitos à sua conferência.":"Produtos e preços de exemplo. Seus sabores entram na importação."}</footer></aside>}</div>
  <div className="idea-proof"><span><Check size={14}/>Cliente pede sem cadastro</span><span><Check size={14}/>Pix direto para a pizzaria</span><span><Check size={14}/>Você confere antes de publicar</span></div>
 </div></section>;
}
