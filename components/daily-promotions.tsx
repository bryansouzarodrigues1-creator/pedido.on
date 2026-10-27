"use client";
import {useState,useEffect} from "react";
import {Copy,Trash2,Check,Plus,Pencil} from "lucide-react";
import DailyCampaigns from "./daily-campaigns";
import type {DailyCampaign} from "@/lib/daily-campaigns";
import {campaignPromotion} from "@/lib/daily-campaigns";
import {Modal} from "./ui";
import {money,restaurantSchema,type RestaurantData,type Size} from "@/lib/domain";
import {availableProduct} from "@/lib/menu-sales";
import {menuAmount} from "@/lib/menu-reader-policy";
import {promotionEndToday,promotionMessage,promotionLabel,promotionAvailable,type Promotion} from "@/lib/promotions";

type Part={productId:string;size?:Size;quantity:number};
export type PromotionEditorValue={kind:"product"|"bundle";name:string;productId:string;size:Size;items:Part[];price:string;duration:"today"|"week"|"custom";ends:string};
const fresh=():PromotionEditorValue=>({kind:"product",name:"",productId:"",size:"g",items:[{productId:"",quantity:2}],price:"",duration:"today",ends:""});
const bestSize=(data:RestaurantData,id:string)=>(["g","m","p"] as const).find(size=>(data.products.find(p=>p.id===id)?.sizes[size]||0)>0)||"g";
const dateLabel=(date:string)=>new Date(date).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});

export function PromotionEditor({data,value,onChange,onSave,onCancel,error}:{data:RestaurantData;value:PromotionEditorValue;onChange:(value:PromotionEditorValue)=>void;onSave:()=>void;onCancel:()=>void;error:string}){
 const available=data.products.filter(availableProduct),product=data.products.find(p=>p.id===value.productId);
 const patch=(change:Partial<PromotionEditorValue>)=>onChange({...value,...change});
 function part(index:number,change:Partial<Part>){patch({items:value.items.map((item,i)=>i===index?{...item,...change}:item)});}
 return <form className="promotion-editor" onSubmit={event=>{event.preventDefault();onSave();}}>
  <div className="promotion-type" role="group" aria-label="Tipo de promoção">{([['product','Produto'],['bundle','Combo']] as const).map(([kind,label])=><button type="button" key={kind} aria-pressed={value.kind===kind} className={value.kind===kind?"active":""} onClick={()=>patch({kind})}>{label}</button>)}</div>
  {value.kind==="product"?<div className="promotion-fields"><label>Produto<select value={value.productId} onChange={event=>patch({productId:event.target.value,size:bestSize(data,event.target.value)})}><option value="">Escolha o produto</option>{available.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>{product?.kind==="pizza"&&<label>Tamanho<select value={value.size} onChange={event=>patch({size:event.target.value as Size})}>{(["p","m","g"] as const).filter(size=>product.sizes[size]>0).map(size=><option key={size} value={size}>{size.toUpperCase()}</option>)}</select></label>}</div>:<>
   <label>Nome do combo<input value={value.name} maxLength={100} onChange={event=>patch({name:event.target.value})} placeholder="Ex.: 2 pizzas + refrigerante"/></label>
   <fieldset className="bundle-items"><legend>O que vem no combo</legend>{value.items.map((item,index)=>{const product=data.products.find(p=>p.id===item.productId);return <div className="bundle-item" key={index}>
    <label className="bundle-product">Produto {index+1}<select value={item.productId} onChange={event=>{const product=data.products.find(p=>p.id===event.target.value);part(index,{productId:event.target.value,size:product?.kind==="pizza"?bestSize(data,event.target.value):undefined});}}><option value="">Escolha o produto</option>{available.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {product?.kind==="pizza"&&<label className="bundle-size">Tamanho<select value={item.size||bestSize(data,item.productId)} onChange={event=>part(index,{size:event.target.value as Size})}>{(["p","m","g"] as const).filter(size=>product.sizes[size]>0).map(size=><option key={size} value={size}>{size.toUpperCase()}</option>)}</select></label>}
    <label className="bundle-quantity">Quantidade<input type="number" min={1} max={6} step={1} value={item.quantity} onChange={event=>part(index,{quantity:Number(event.target.value)})}/></label>
    <button type="button" className="icon-btn bundle-remove" aria-label={`Remover produto ${index+1} do combo`} disabled={value.items.length===1} onClick={()=>patch({items:value.items.filter((_,i)=>i!==index)})}><Trash2 size={17}/></button>
   </div>;})}<button type="button" className="text-button" disabled={value.items.length>=6} onClick={()=>patch({items:[...value.items,{productId:"",quantity:1}]})}><Plus size={16}/>Adicionar item</button></fieldset>
  </>}
  <div className="promotion-fields"><label>{value.kind==="bundle"?"Preço do combo · R$":"Preço da oferta · R$"}<input inputMode="decimal" value={value.price} maxLength={14} onChange={event=>patch({price:event.target.value})} placeholder="Ex.: 89,90"/></label><label>Validade<select value={value.duration} onChange={event=>patch({duration:event.target.value as PromotionEditorValue['duration']})}><option value="today">Hoje, até 23h59</option><option value="week">7 dias</option><option value="custom">Escolher data</option></select></label></div>
  {value.duration==="custom"&&<label>Encerra em<input type="datetime-local" lang="pt-BR" value={value.ends} onChange={event=>patch({ends:event.target.value})}/><small>Horário de Brasília</small></label>}
  {error&&<p className="field-error" role="alert">{error}</p>}
  <div className="promotion-form-actions"><button type="button" className="text-button" onClick={onCancel}>Cancelar</button><button type="submit" className="btn primary small"><Check size={16}/>Salvar no rascunho</button></div>
 </form>;
}

export default function DailyPromotions({data,slug,onChange,canShare,onActivityChange,suggestionsOnly=false,incomingCampaign,onCampaignReceived}:{incomingCampaign?:{id:string;idea:DailyCampaign}|null;onCampaignReceived?:()=>void;data:RestaurantData;slug:string;onChange:(patch:Partial<RestaurantData>)=>void;canShare:boolean;onActivityChange?:(active:boolean)=>void;suggestionsOnly?:boolean}){
 const [editing,setEditing]=useState(false),[editingId,setEditingId]=useState<string|null>(null),[value,setValue]=useState(fresh),[error,setError]=useState(""),[copied,setCopied]=useState(""),[copyText,setCopyText]=useState("");
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{onActivityChange?.(editing);return()=>onActivityChange?.(false);},[editing,onActivityChange]);
 function start(p?:Promotion){setError("");setCopyText("");setEditingId(p?.id||null);setValue(p?{kind:p.kind==="bundle"?"bundle":"product",name:p.kind==="bundle"?p.name:"",productId:p.kind==="bundle"?"":p.productId,size:p.kind==="bundle"?"g":p.size||"g",items:p.kind==="bundle"?p.items.map(item=>({...item})):[{productId:"",quantity:2}],price:(p.price/100).toFixed(2).replace(".",","),duration:"custom",ends:new Date(Date.parse(p.endsAt)-3*3600000).toISOString().slice(0,16)}:fresh());setEditing(true);}
 function close(){setEditing(false);setError("");}
 useEffect(()=>{if(!incomingCampaign)return;start(campaignPromotion(incomingCampaign.idea));setEditingId(null);setValue(old=>({...old,duration:"today",ends:""}));onCampaignReceived?.();},[incomingCampaign?.id]);
 function add(){try{
  const cents=menuAmount(value.price);if(!cents)throw Error("Informe um preço maior que zero.");
  const prior=data.promotions.find(p=>p.id===editingId),stamp=new Date(),unchangedEnd=prior&&value.duration==="custom"&&value.ends===new Date(Date.parse(prior.endsAt)-3*3600000).toISOString().slice(0,16);
  const end=unchangedEnd?new Date(prior.endsAt):value.duration==="custom"?new Date(value.ends+":00-03:00"):new Date(promotionEndToday(new Date(stamp.getTime()+(value.duration==="week"?6*86400000:0))));
  if(!Number.isFinite(end.getTime())||end.getTime()<=stamp.getTime())throw Error("Escolha um horário de encerramento futuro.");
  const common={id:editingId||crypto.randomUUID(),price:cents,startsAt:prior&&Date.parse(prior.endsAt)>stamp.getTime()?prior.startsAt:stamp.toISOString(),endsAt:end.toISOString(),enabled:prior?.enabled??true};
  let p:Promotion;
  if(value.kind==="bundle"){if(value.items.some(item=>!item.productId))throw Error("Escolha os produtos do combo.");if(value.name.trim().length<2)throw Error("Dê um nome ao combo.");const total=value.items.reduce((sum,item)=>sum+item.quantity,0);if(value.items.some(item=>!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>6)||total<2||total>12)throw Error("Use de 2 a 12 unidades no combo, até 6 por item.");if(new Set(value.items.map(item=>item.productId+":"+(item.size||""))).size!==value.items.length)throw Error("Para repetir o mesmo produto e tamanho, aumente a quantidade na própria linha.");p={...common,kind:"bundle",name:value.name.trim(),items:value.items};}
  else{const product=data.products.find(p=>p.id===value.productId);if(!product)throw Error("Escolha o produto da oferta.");p={...common,productId:product.id,...(product.kind==="pizza"?{size:value.size}:{})};}
  const promotions=[...data.promotions.filter(p=>p.id!==editingId),p],checked=restaurantSchema.safeParse({...data,promotions});
  if(!checked.success)throw Error(checked.error.issues[0]?.message||"Confira a promoção.");
  onChange({promotions:checked.data.promotions});close();
 }catch(error){setError(error instanceof Error?error.message:"Confira a promoção.");}}
 async function copy(p:Promotion){const text=promotionMessage(data,p,`${location.origin}/p/${slug}`);try{await navigator.clipboard.writeText(text);setCopied(p.id);setCopyText("");setTimeout(()=>setCopied(""),2500);}catch{setCopyText(text);}}
 const active=data.promotions.filter(p=>Date.parse(p.endsAt)>now),expired=data.promotions.filter(p=>Date.parse(p.endsAt)<=now);
 const row=(p:Promotion)=><article className="promotion-row" key={p.id}><div><b>{promotionLabel(data,p)}</b><span>{money(p.price)} · {!p.enabled?"Pausada":Date.parse(p.endsAt)<=now?"Encerrada":!promotionAvailable(data,p)?"Item indisponível":"Até "+dateLabel(p.endsAt)}</span></div><button type="button" className="icon-btn" disabled={!canShare||Date.parse(p.endsAt)<=now||!p.enabled||!promotionAvailable(data,p)} aria-label={`Copiar divulgação de ${promotionLabel(data,p)}`} title={canShare?"Copiar divulgação":"Atualize o cardápio para divulgar"} onClick={()=>void copy(p)}>{copied===p.id?<Check size={17}/>:<Copy size={17}/>}</button><button type="button" className="icon-btn" aria-label={`Editar ${promotionLabel(data,p)}`} onClick={()=>start(p)}><Pencil size={17}/></button><button type="button" className="icon-btn" aria-label={`Remover ${promotionLabel(data,p)}`} onClick={()=>onChange({promotions:data.promotions.filter(v=>v.id!==p.id)})}><Trash2 size={17}/></button></article>;
 return <section className="daily-promotions panel-card"><DailyCampaigns data={data} slug={slug} canShare={canShare} onPrepare={campaign=>{start(campaignPromotion(campaign));setEditingId(null);setValue(old=>({...old,duration:"today",ends:""}));}}/>{!suggestionsOnly&&<><div className="promotion-heading"><h2>Promoções</h2><button type="button" className="btn outline small" disabled={!data.products.some(availableProduct)||data.promotions.length>=12} onClick={()=>start()}><Plus size={16}/>Criar</button></div>
  {active.map(row)}{expired.length>0&&<details className="promotion-archive"><summary>Encerradas · {expired.length}</summary>{expired.map(row)}</details>}
  {data.promotions.length>0&&!canShare&&<small>Atualize o cardápio para mostrar as ofertas.</small>}
  {copyText&&<textarea className="promotion-copy" readOnly rows={5} aria-label="Divulgação para copiar" value={copyText}/>}
  </>}<Modal open={editing} onClose={close} title={editingId?"Editar promoção":"Nova promoção"}><PromotionEditor data={data} value={value} onChange={setValue} onSave={add} onCancel={close} error={error}/></Modal>
 </section>;
}
