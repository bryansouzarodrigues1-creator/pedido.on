"use client";
import {useEffect,useState} from "react";
import {Camera,Check} from "lucide-react";
import {suggestProductCrops,detectProductPhotoCrops,type ProductCrop} from "@/lib/menu-photo-crops";
import type {ReaderPage,ReaderItem,SourceBox} from "@/lib/menu-reader-policy";
type Candidate=ProductCrop&{url:string};
export default function ProductPhotoCrop({page,item,neighbors,restaurantId,onAttach}:{page:ReaderPage;item:ReaderItem;neighbors:SourceBox[];restaurantId:string;onAttach:(url:string)=>void}){
 const [choices,setChoices]=useState<Candidate[]>([]),[selected,setSelected]=useState(-1);
 const [rights,setRights]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let active=true;setChoices([]);setSelected(-1);setRights(false);setError("");
  if(!suggestProductCrops(page.width,page.height,item.box).length)return;
  const image=new Image();
  image.onload=()=>{if(!active)return;
   const sample=document.createElement("canvas"),ratio=Math.min(1,384/Math.max(page.width,page.height));
   sample.width=Math.max(1,Math.round(page.width*ratio));sample.height=Math.max(1,Math.round(page.height*ratio));
   const sampleContext=sample.getContext("2d");if(!sampleContext)return;
   sampleContext.drawImage(image,0,0,sample.width,sample.height);
   const pixels=sampleContext.getImageData(0,0,sample.width,sample.height);
   const regions=detectProductPhotoCrops(page.width,page.height,item.box,pixels,neighbors);
   const result=regions.map(region=>{
    const rect=region.rect,w=rect.x1-rect.x0,h=rect.y1-rect.y0,scale=Math.min(1,640/Math.max(w,h)),canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    const ctx=canvas.getContext("2d");if(!ctx)return null;
    ctx.drawImage(image,rect.x0,rect.y0,w,h,0,0,canvas.width,canvas.height);
    return {...region,url:canvas.toDataURL("image/jpeg",.88)};
   }).filter((v):v is Candidate=>!!v);
   if(active)setChoices(result);
  };
  image.onerror=()=>{if(active)setError("Não foi possível preparar as imagens desta foto.");};
  image.src=page.image;
  return()=>{active=false;image.onload=null;image.onerror=null;};
 },[page.id,page.image,page.width,page.height,item.id,item.box?.x0,item.box?.y0,item.box?.x1,item.box?.y1,neighbors]);
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
  <p>Encontramos uma possível foto ao lado do texto. Confira se ela representa este produto antes de usá-la.</p>
  <div className="reader-crop-choices">{choices.map((choice,index)=><button key={choice.side} className={selected===index?"active":""} type="button" onClick={()=>{setSelected(index);setError("");}} disabled={busy} aria-pressed={selected===index}><img src={choice.url} alt={choice.side==="left"?"Recorte candidato à esquerda do texto":"Recorte candidato à direita do texto"}/><small>{choice.side==="left"?"Imagem à esquerda":"Imagem à direita"}</small></button>)}</div>
  {selected>=0&&<label className="reader-crop-rights"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>Confirmo que a imagem representa este produto e que posso utilizá-la no meu cardápio.</label>}
  {error&&<p className="field-error" role="alert">{error}</p>}
  <button type="button" className="btn outline small" disabled={!rights||selected<0||busy} onClick={()=>void attach()}><Check size={15}/>{busy?"Salvando a foto...":"Usar recorte neste produto"}</button>
  <small>Recorte local, sem geração de IA. Só a imagem escolhida é enviada à sua pizzaria depois de confirmar.</small>
 </section>;
}
