"use client";
import {useEffect,useState} from "react";
import {ArrowRight} from "lucide-react";
import type {RestaurantData} from "@/lib/domain";
import {creatorVisualPreview} from "@/lib/creator-showcase";
import {galleryStyleId} from "@/lib/gallery-styles";
import {Brand,Spinner} from "./ui";
import Menu from "./menu";
export default function SharedMenuPreview({id,managed=false}:{id:string;managed?:boolean}){
 const [data,setData]=useState<RestaurantData|null>(null),[expiresAt,setExpiresAt]=useState(''),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setData(null);setError("");fetch((managed?"/api/shared-menus/":"/api/guest-previews/")+encodeURIComponent(id),{cache:"no-store",signal:controller.signal}).then(async r=>{const v=await r.json() as {data?:RestaurantData;error?:string;expiresAt?:string};if(!r.ok||!v.data)throw Error(v.error||"Não foi possível abrir a prévia.");if(!controller.signal.aborted){setData(v.data);setExpiresAt(v.expiresAt||'');}}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Não foi possível abrir a prévia.");});return()=>controller.abort();},[id,managed,retry]);
 const style=data?galleryStyleId.safeParse(data.presentation?.catalogueId||data.presentation?.identity):null;
 const view=data?creatorVisualPreview(data,style?.success?style.data:"forno-classico"):null;
 return <div className="shared-preview-page"><header className="shared-preview-header"><Brand/><a className="btn create-menu-red" href="/criar">Criar meu cardápio <ArrowRight size={17}/></a></header><main><div className="shared-preview-banner"><strong>Uma apresentação do seu cardápio</strong><span>Confira os produtos, fotos e preços. Esta prévia permite testar o carrinho e ainda não recebe pedidos.</span>{expiresAt&&<small>Link válido até {new Date(expiresAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}.</small>}</div>{error?<div className="shared-preview-error"><h1>Esta prévia está indisponível.</h1><p role="alert">{error}</p><button type="button" className="btn outline" onClick={()=>setRetry(v=>v+1)}>Tentar abrir novamente</button></div>:data&&view?<><p className="shared-preview-note" role="note">{!data.products.length?"Demonstração do modelo. As pizzas, fotos geradas por IA e preços são exemplos, não são desta pizzaria. Nenhum produto de exemplo será cadastrado.":!data.cover?"Capa ilustrativa gerada por IA. Os produtos e preços vieram do cardápio enviado pela pizzaria.":"Produtos, fotos e preços preparados para conferência antes da publicação."}</p><Menu key={id+retry} data={view} preview/></>:<p role="status" className="shared-preview-loading"><Spinner/>Abrindo o cardápio…</p>}</main><footer className="shared-preview-footer"><strong>Seu cardápio também pode ficar assim.</strong><a className="btn create-menu-red" href="/criar">Criar meu cardápio <ArrowRight size={17}/></a></footer></div>;
}
