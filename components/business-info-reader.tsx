"use client";
import {useEffect,useMemo,useRef,useState,type ChangeEvent} from "react";
import {Camera,Check,Copy,FileImage,RotateCw,Trash2} from "lucide-react";
import {Modal,Spinner} from "./ui";
import {prepareMenuPhoto,recognizeMenuPhotos,rotateMenuPhoto} from "@/lib/menu-ocr";
import {loadReading,removeReading,saveReading,type Reading} from "@/lib/menu-reader-storage";
import {businessInfoFields,businessInfoLabels,businessInfoLimits,businessInfoPatch,readBusinessInfo,type BusinessInfoField,type BusinessInfoSuggestion,type BusinessInfoValues} from "@/lib/business-info-reader";
import type {ReaderPage} from "@/lib/menu-reader-policy";

/** A local document reader, shared by first-time setup and the owner's store editor. */
export default function BusinessInfoReader({storageKey,values,onApply,fields=businessInfoFields,disabled=false,onActivityChange}:{storageKey:string;values:BusinessInfoValues;onApply:(patch:BusinessInfoValues)=>void|Promise<void>;fields?:readonly BusinessInfoField[];disabled?:boolean;onActivityChange?:(active:boolean)=>void}){
 const [open,setOpen]=useState(false),[pages,setPages]=useState<ReaderPage[]>([]),[text,setText]=useState("");
 const [suggestions,setSuggestions]=useState<BusinessInfoSuggestion[]>([]),[edits,setEdits]=useState<BusinessInfoValues>({}),[selected,setSelected]=useState<BusinessInfoField[]>([]),[confirmed,setConfirmed]=useState(false);
 const [manualField,setManualField]=useState<BusinessInfoField>(fields.includes("hours")?"hours":fields[0]),[manualText,setManualText]=useState("");
 const [busy,setBusy]=useState(false),[initialized,setInitialized]=useState(false),[error,setError]=useState(""),[status,setStatus]=useState(""),[storageNote,setStorageNote]=useState("");
 const alive=useRef(true),working=useRef(false),clearing=useRef(false),abort=useRef<AbortController|null>(null),latest=useRef<Reading|null>(null),current=useRef(values);current.current=values;
 latest.current=initialized&&!clearing.current?{restaurantId:storageKey,savedAt:Date.now(),pages,items:[],unmatched:[],text}:null;
 const groups=useMemo(()=>Object.fromEntries(fields.map(field=>[field,suggestions.filter(s=>s.field===field)])) as Record<BusinessInfoField,BusinessInfoSuggestion[]>,[suggestions,fields]);
 useEffect(()=>{alive.current=true;void loadReading(storageKey).then(saved=>{if(!alive.current||!saved)return;setPages(saved.pages);setText(saved.text||"");setStatus("Imagem e texto guardados recuperados. Confira e selecione os campos novamente.");}).catch(()=>{if(alive.current)setStorageNote("Não foi possível recuperar a leitura deste aparelho.");}).finally(()=>{if(alive.current)setInitialized(true);});return()=>{alive.current=false;abort.current?.abort();const saved=latest.current;if(saved&&(saved.pages.length||saved.text?.trim()))void saveReading(saved).catch(()=>{});};},[storageKey]);
 useEffect(()=>{onActivityChange?.(open||busy);return()=>onActivityChange?.(false);},[open,busy,onActivityChange]);
 useEffect(()=>{if(!initialized)return;const save=()=>{const saved=latest.current;if(!clearing.current&&saved&&(saved.pages.length||saved.text?.trim()))void saveReading(saved).catch(()=>{if(alive.current)setStorageNote("A leitura está aberta, mas não foi possível guardá-la neste aparelho.");});};const timer=setTimeout(save,300);const hidden=()=>{if(document.hidden)save();};window.addEventListener("pagehide",save);document.addEventListener("visibilitychange",hidden);return()=>{clearTimeout(timer);window.removeEventListener("pagehide",save);document.removeEventListener("visibilitychange",hidden);};},[initialized,storageKey,pages,text]);
 function review(result:ReturnType<typeof readBusinessInfo>){
  setSuggestions(result.suggestions);setEdits(Object.fromEntries(fields.flatMap(field=>{const choices=result.suggestions.filter(s=>s.field===field);return choices.length===1?[[field,choices[0].value]]:[];})));setSelected([]);setConfirmed(false);
 }
 async function pick(event:ChangeEvent<HTMLInputElement>){
  const files=Array.from(event.target.files||[]);event.target.value="";if(!files.length||working.current||disabled)return;
  if(pages.length+files.length>8){setError("Envie até 8 imagens por leitura.");return;}
  working.current=true;setBusy(true);setError("");const controller=new AbortController();abort.current=controller;
  try{const added:ReaderPage[]=[];for(const file of files){added.push(await prepareMenuPhoto(file));controller.signal.throwIfAborted();}if(alive.current){setPages(old=>[...old,...added]);setConfirmed(false);setStatus("Imagens recebidas. Use Extrair texto para conferir as informações.");}}
  catch(e){if(alive.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:"Não foi possível abrir a imagem.");}
  finally{working.current=false;abort.current=null;if(alive.current)setBusy(false);}
 }
 async function read(){
  if(working.current||disabled||!pages.length)return;working.current=true;setBusy(true);setError("");setConfirmed(false);const controller=new AbortController();abort.current=controller;
  try{
   const missing=pages.filter(page=>!page.lines.length),scanned=missing.length?await recognizeMenuPhotos(missing,controller.signal,(_,label)=>{if(alive.current)setStatus(label);},undefined,{content:"information"}):[];
   controller.signal.throwIfAborted();const ready=pages.map(page=>scanned.find(p=>p.id===page.id)||page),result=readBusinessInfo(ready);
   if(!alive.current)return;setPages(ready);setText(result.text);review(result);setStatus(result.text?"Texto extraído. Escolha as informações que quer usar e confira com a imagem.":"Não consegui ler texto nesta imagem. Tente um print mais nítido ou digite o trecho abaixo.");
  }catch(e){if(alive.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:"Não foi possível ler a imagem. Tente outra ou digite o texto.");}
  finally{working.current=false;abort.current=null;if(alive.current)setBusy(false);}
 }
 async function rotate(id:string){if(working.current||disabled)return;working.current=true;setBusy(true);setError("");try{const page=pages.find(p=>p.id===id);if(!page)return;const rotated=await rotateMenuPhoto(page);if(alive.current){setPages(old=>old.map(p=>p.id===id?rotated:p));setConfirmed(false);setStatus("Imagem girada. Extraia o texto novamente para conferir.");}}catch{if(alive.current)setError("Não foi possível girar esta imagem.");}finally{working.current=false;if(alive.current)setBusy(false);}}
 async function apply(){
  if(working.current||disabled)return;setError("");let patch:BusinessInfoValues;
  try{patch=businessInfoPatch(edits,selected,fields,confirmed);}catch(e){setError(e instanceof Error?e.message:"Confira as informações.");return;}
  working.current=true;setBusy(true);
  try{await onApply(patch);if(alive.current){setSelected([]);setConfirmed(false);setStatus("Informações usadas no rascunho. A versão dos clientes só muda depois de publicar.");setOpen(false);}}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:"Não foi possível aplicar. Sua leitura foi mantida.");}
  finally{working.current=false;if(alive.current)setBusy(false);}
 }
 async function discard(){if(working.current)return;working.current=true;clearing.current=true;latest.current=null;setBusy(true);try{await removeReading(storageKey);if(alive.current){setPages([]);setText("");setSuggestions([]);setEdits({});setManualText("");setSelected([]);setConfirmed(false);setStatus("Leitura removida deste aparelho. Os dados já usados na pizzaria foram mantidos.");setError("");}}catch{if(alive.current)setError("Não foi possível remover a leitura. Tente novamente.");}finally{working.current=false;clearing.current=false;if(alive.current)setBusy(false);}}
 const blocked=busy||disabled,hasReading=pages.length>0||!!text.trim();
 return <section className="business-info-entry" aria-label="Dados da pizzaria por imagem">
  <div><strong>Já tem essas informações em uma imagem?</strong><p>Traga horários do Google, endereço ou outros textos de um print, foto ou conversa.</p></div>
  <button type="button" className="btn outline small" disabled={!initialized||disabled} onClick={()=>{setOpen(true);setError("");}}> <FileImage size={17}/>Preencher dados com imagem</button>
  {!open&&hasReading&&<small>Há uma leitura guardada neste aparelho para conferir.</small>}
  {!open&&status.startsWith("Informações usadas")&&<p role="status">{status}</p>}
  <Modal open={open} onClose={()=>{abort.current?.abort();setOpen(false);}} title="Trazer informações de uma imagem" wide>
   <div className="business-info-reader">
    <p>Envie um print do Google, WhatsApp, rede social ou outra fonte. Confira o texto com a imagem e escolha onde quer usá-lo.</p>
    <p className="field-hint">A leitura acontece neste aparelho. Estas imagens não são enviadas a um serviço de IA. Imagem e texto podem ficar guardados aqui por até 7 dias; você pode removê-los abaixo.</p>
    {storageNote&&<p role="status" className="reader-note">{storageNote}</p>}
    <div className="business-info-actions"><label className="btn outline small"><FileImage size={17}/>Escolher imagens<input aria-label="Imagens com informações da pizzaria" hidden type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={blocked} onChange={pick}/></label><label className="btn outline small"><Camera size={17}/>Tirar foto<input aria-label="Fotografar informações da pizzaria" hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={blocked} onChange={pick}/></label><small>JPG, PNG ou WebP · até 15 MB por imagem · até 8 imagens.</small></div>
    {pages.length>0&&<div className="business-info-photos">{pages.map(page=><figure key={page.id}><img src={page.image} alt={page.name}/><details><summary>Ampliar imagem</summary><img src={page.image} alt={"Conferir "+page.name}/></details><figcaption>{page.name}</figcaption><button type="button" className="text-button" disabled={blocked} aria-label={"Girar "+page.name} onClick={()=>void rotate(page.id)}><RotateCw size={16}/>Girar</button><button type="button" className="text-button" disabled={blocked} aria-label={"Remover imagem "+page.name} onClick={()=>{setPages(old=>old.filter(p=>p.id!==page.id));setConfirmed(false);setStatus("Imagem removida. O texto extraído continua abaixo para conferência.");}}><Trash2 size={16}/>Remover</button></figure>)}</div>}
    {pages.length>0&&<button type="button" className="btn primary" disabled={blocked} onClick={()=>void read()}>{busy?<Spinner/>:<FileImage size={17}/>}Extrair texto das imagens</button>}
    {busy&&<button type="button" className="text-button" disabled={!abort.current} onClick={()=>{abort.current?.abort();setStatus("Leitura cancelada. Seus dados já preenchidos foram mantidos.");}}>Cancelar leitura</button>}
    {status&&<p role="status" className="reader-note">{status}</p>}
    <label className="field"><span>Texto da imagem para conferir</span><textarea rows={7} maxLength={60000} disabled={blocked} value={text} onChange={e=>{setText(e.target.value);setConfirmed(false);}} placeholder="O texto extraído aparece aqui. Você também pode colar ou corrigir qualquer trecho."/></label>
    <div className="business-info-actions"><button type="button" className="btn outline small" disabled={blocked||!text.trim()} onClick={()=>{review(readBusinessInfo([{id:"reviewed-text",lines:text.split("\n").map(text=>({text}))}]));setStatus("Sugestões reorganizadas. Confira e marque somente os campos que quer usar.");}}>Organizar sugestões do texto</button><button type="button" className="text-button" disabled={blocked||!text.trim()} onClick={()=>{if(!navigator.clipboard){setError("Selecione e copie o trecho manualmente neste navegador.");return;}void navigator.clipboard.writeText(text).then(()=>setStatus("Texto copiado."),()=>setError("Não foi possível copiar. Selecione e copie o trecho manualmente."));}}><Copy size={16}/>Copiar todo o texto</button></div>
    {fields.some(field=>groups[field]?.length||edits[field]!==undefined)&&<div className="business-info-fields" aria-label="Confira as informações encontradas">{fields.map(field=>{
     const choices=groups[field]||[];if(!choices.length&&edits[field]===undefined)return null;
     return <fieldset key={field}><legend>{businessInfoLabels[field]}</legend><label className="reader-select-all"><input type="checkbox" aria-label={"Usar "+businessInfoLabels[field]} checked={selected.includes(field)} disabled={blocked} onChange={e=>{setSelected(old=>e.target.checked?[...old,field]:old.filter(f=>f!==field));setConfirmed(false);}}/>Usar este campo{current.current[field]?.trim()?" e substituir o valor atual":""}</label>
      {current.current[field]?.trim()&&<p className="field-hint">Atual: {current.current[field]}</p>}
      {field==="whatsapp"&&<p className="field-hint">Um telefone do Google pode não ser WhatsApp. Confirme o número de pedidos.</p>}
      {choices.length>1&&<div className="business-info-alternatives"><p>Há versões diferentes. Escolha ou escreva a informação correta.</p>{choices.map((choice,index)=><button type="button" className="btn outline small" key={index} disabled={blocked} onClick={()=>{setEdits(old=>({...old,[field]:choice.value}));setConfirmed(false);}}>{choice.value}</button>)}</div>}
      {choices.some(choice=>choice.uncertain)&&<p className="field-hint">A leitura deste trecho é incerta. Confira na imagem.</p>}
      <textarea aria-label={"Conferir "+businessInfoLabels[field]} rows={field==="hours"?4:2} maxLength={businessInfoLimits[field]} disabled={blocked} value={edits[field]||""} onChange={e=>{setEdits(old=>({...old,[field]:e.target.value}));setConfirmed(false);}}/>
      <small>{(edits[field]||"").length}/{businessInfoLimits[field]}</small>
      {choices.length>0&&<details><summary>Ver trecho de origem</summary>{choices.map((choice,index)=><pre key={index}>{choice.evidence}</pre>)}</details>}
     </fieldset>;
    })}</div>}
    <details className="business-info-manual" open={!suggestions.some(s=>fields.includes(s.field))&&!!text.trim()}><summary>Usar outro trecho ou informação</summary><p>Para um texto que não foi identificado, escolha o campo e copie somente o trecho que quer usar. Datas e horários especiais precisam manter seu contexto.</p><label className="field"><span>Onde usar o trecho?</span><select aria-label="Campo para outro trecho" value={manualField} disabled={blocked} onChange={e=>setManualField(e.target.value as BusinessInfoField)}>{fields.map(field=><option value={field} key={field}>{businessInfoLabels[field]}</option>)}</select></label><label className="field"><span>Trecho que quero usar</span><textarea rows={3} maxLength={businessInfoLimits[manualField]} disabled={blocked} value={manualText} onChange={e=>setManualText(e.target.value)}/></label><button type="button" className="btn outline small" disabled={blocked||!manualText.trim()} onClick={()=>{try{const patch=businessInfoPatch({[manualField]:manualText},[manualField],fields,true);setEdits(old=>({...old,...patch}));setSelected(old=>[...new Set([...old,manualField])]);setConfirmed(false);setError("");setManualText("");}catch(e){setError(e instanceof Error?e.message:"Confira o trecho.");}}}>Preparar este campo</button></details>
    {error&&<p role="alert" className="field-error">{error}</p>}
    <label className="reader-select-all"><input type="checkbox" aria-label="Conferi as informações da imagem" checked={confirmed} disabled={blocked||!selected.length} onChange={e=>setConfirmed(e.target.checked)}/>Conferi as informações e quero usar somente os campos selecionados.</label>
    <p className="field-hint">Horários importados são informativos: abrir e fechar pedidos continua sob seu controle.</p>
    <div className="business-info-actions"><button type="button" className="btn primary" disabled={blocked||!confirmed||!selected.length} onClick={()=>void apply()}><Check size={17}/>Usar informações no rascunho</button>{hasReading&&<button type="button" className="text-button" disabled={blocked} onClick={()=>void discard()}><Trash2 size={16}/>Remover leitura deste aparelho</button>}</div>
   </div>
  </Modal>
 </section>;
}
