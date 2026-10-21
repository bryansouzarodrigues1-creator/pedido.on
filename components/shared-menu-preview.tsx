"use client";
import {useEffect,useState} from "react";
import type {RestaurantData} from "@/lib/domain";
import {MiniMenu,Spinner} from "./ui";
export default function SharedMenuPreview({id}:{id:string}){
 const [data,setData]=useState<RestaurantData|null>(null),[error,setError]=useState("");
 useEffect(()=>{let alive=true;fetch("/api/guest-previews/"+encodeURIComponent(id),{cache:"no-store"}).then(async r=>{const v=await r.json() as {data?:RestaurantData;error?:string};if(!r.ok||!v.data)throw Error(v.error||"Não foi possível abrir a prévia.");if(alive)setData(v.data);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[id]);
 return <main><div className="shared-preview-banner"><strong>Prévia do cardápio</strong>Este cardápio está em construção e ainda não recebe pedidos.</div>{error?<p role="alert" style={{padding:24}}>{error}</p>:data?<div className="shared-menu-preview"><MiniMenu data={data} large rich/></div>:<p role="status" style={{padding:24}}><Spinner/>Abrindo o cardápio…</p>}</main>;
}
