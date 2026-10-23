"use client";
import {useEffect,useState} from "react";
import type {RestaurantData} from "@/lib/domain";
import {creatorVisualPreview} from "@/lib/creator-showcase";
import {galleryStyleId} from "@/lib/gallery-styles";
import {MiniMenu,Spinner} from "./ui";
export default function SharedMenuPreview({id}:{id:string}){
 const [data,setData]=useState<RestaurantData|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setData(null);setError("");fetch("/api/guest-previews/"+encodeURIComponent(id),{cache:"no-store",signal:controller.signal}).then(async r=>{const v=await r.json() as {data?:RestaurantData;error?:string};if(!r.ok||!v.data)throw Error(v.error||"Não foi possível abrir a prévia.");if(!controller.signal.aborted)setData(v.data);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Não foi possível abrir a prévia.");});return()=>controller.abort();},[id,retry]);
 const style=data?galleryStyleId.safeParse(data.presentation?.catalogueId||data.presentation?.identity):null;
 const view=data?creatorVisualPreview(data,style?.success?style.data:"forno-classico"):null;
 return <main><div className="shared-preview-banner"><strong>Prévia do cardápio</strong>Este cardápio está em construção e ainda não recebe pedidos.</div>{error?<div style={{padding:24}}><p role="alert">{error}</p><button type="button" className="btn outline" onClick={()=>setRetry(v=>v+1)}>Tentar abrir novamente</button></div>:data&&view?<><p className="shared-preview-note" role="note">{!data.products.length?"Demonstração do modelo. As pizzas, fotos geradas por IA e preços são exemplos, não são desta pizzaria. Nenhum produto de exemplo será cadastrado.":!data.cover?"Capa ilustrativa gerada por IA. Os produtos e preços vieram do cardápio enviado pela pizzaria.":"Confira os produtos e preços com a pizzaria antes da publicação."}</p><div className="shared-menu-preview"><MiniMenu data={view} large rich/></div></>:<p role="status" style={{padding:24}}><Spinner/>Abrindo o cardápio…</p>}</main>;
}
