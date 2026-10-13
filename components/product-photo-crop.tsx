"use client";
import {useEffect,useState} from "react";
import {Camera,Check} from "lucide-react";
import {suggestProductCrops,type ProductCrop} from "@/lib/menu-photo-crops";
import type {ReaderPage,ReaderItem} from "@/lib/menu-reader-policy";
type Candidate=ProductCrop&{url:string};
export default function ProductPhotoCrop({page,item,restaurantId,onAttach}:{page:ReaderPage;item:ReaderItem;restaurantId:string;onAttach:(url:string)=>void}){
 const [choices,setChoices]=useState<Candidate[]>([]),[selected,setSelected]=useState(-1);
 const [rights,setRights]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let active=true;setChoices([]);setSelected(-1);setRights(false);setError("");
  const regions=suggestProductCrops(page.width,page.height,item.box);
  if(!regions.length)return;
  const image=new Image();
  image.onload=()=>{if(!active)return;
   const result=regions.map(region=>{
    const rect=region.rect,size=Math.min(640,rect.x1-rect.x0),canvas=document.createElement("canvas");
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext("2d");if(!ctx)return null;
    ctx.drawImage(image,rect.x0,rect.y0,rect.x1-rect.x0,rect.y1-rect.y0,0,0,size,size);
    return {...region,url:canvas.toDataURL("image/jpeg",.88)};
   }).filter((v):v is Candidate=>!!v);
   if(active)setChoices(result);
  };
  image.onerror=()=>{if(active)setError("Não foi possível preparar as imagens desta foto.");};
  image.src=page.image;
  return()=>{active=false;image.onload=null;image.onerror=null;};
 },[page.id,page.image,page.width,page.height,item.id,item.box?.x0,item.box?.y0,item.box?.x1,item.box?.y1]);
 async function attach(){
  const selectedPhoto=choices[selected];if(!selectedPhoto||!rights||busy)return;
  setBusy(true);setError("");
  try{
   const blob=await (await fetch(selectedPhoto.url)).blob();
   if(blob.size>2*1024*1024)throw Error("O recorte ultrapassou 2 MB. Escolha uma foto menor.");
   const form=new FormData();form.append("file",new File([blob],"foto-do-cardapio.jpg",{type:"image/jpeg"}));
   const response=await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/media`,{method:"POST",body:form});
   const result=await response.json() as {url?:string;error?:string};
   if(!response.ok||!result.url||!result.url.startsWith(`/media/${restaurantId}/`))throw Error(result.error||"Não foi possível guardar a foto.");
   onAttach(result.url);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível guardar a foto.");}
  finally{setBusy(false);}
 }
 if(item.kind==="crust"||!choices.length)return <p className="reader-crop-info">Sem recorte seguro para este trecho. Você poderá enviar a fotografia do produto diretamente no editor, depois de importar.</p>;
 return <section className="reader-crop" aria-label="Foto do produto na imagem">
  <h3><Camera size={17}/> Aproveitar fotografia desta captura?</h3>
  <p>O OCR encontrou texto nesta região. A foto pode estar ao lado, mas a associação é apenas uma sugestão. Confira a imagem antes de usá-la.</p>
  <div className="reader-crop-choices">{choices.map((choice,index)=><button key={choice.side} className={selected===index?"active":""} type="button" onClick={()=>{setSelected(index);setError("");}} disabled={busy} aria-pressed={selected===index}><img src={choice.url} alt={choice.side==="left"?"Recorte candidato à esquerda do texto":"Recorte candidato à direita do texto"}/><small>{choice.side==="left"?"Imagem à esquerda":"Imagem à direita"}</small></button>)}</div>
  {selected>=0&&<label className="reader-crop-rights"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>Confirmo que a imagem representa este produto e que posso utilizá-la no meu cardápio.</label>}
  {error&&<p className="field-error" role="alert">{error}</p>}
  <button type="button" className="btn outline small" disabled={!rights||selected<0||busy} onClick={()=>void attach()}><Check size={15}/>{busy?"Salvando a foto...":"Usar recorte neste produto"}</button>
  <small>Recorte local, sem geração de IA. Só a imagem escolhida é enviada à sua pizzaria depois de confirmar.</small>
 </section>;
}
