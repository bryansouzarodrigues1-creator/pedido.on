"use client";
import {useEffect,useRef,useId,type ReactNode,type CSSProperties} from "react";
import {X,Loader2,Pizza,ArrowUpRight} from "lucide-react";
import {menuPresentation,presentationForTheme} from "@/lib/menu-design";
import {menuIdentityClass} from "@/lib/menu-identity";
import {themes,money,type RestaurantData} from "@/lib/domain";
export function Brand({small=false}:{small?:boolean}){return <a href="/" className={`brand pedido-brand ${small?"small":""}`} aria-label="pizzaria.on, início"><span className="pedido-mark"><img src="/assets/pedido-symbol.png" width="50" height="50" alt=""/></span><span>pizzaria<span className="brand-on">.on</span></span></a>;}
export function Spinner(){return <Loader2 size={18} className="spin"/>;}
export function Modal({open,onClose,title,children,wide=false}:{open:boolean;onClose:()=>void;title:string;children:ReactNode;wide?:boolean}){
  const ref=useRef<HTMLDivElement>(null),close=useRef(onClose),id=useId();close.current=onClose;
  useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow="hidden";const timer=setTimeout(()=>ref.current?.querySelector<HTMLElement>("input,button,select,textarea,a[href]")?.focus(),0);
    const key=(e:KeyboardEvent)=>{const dialogs=document.querySelectorAll("[role=dialog]");if(dialogs[dialogs.length-1]!==ref.current)return;if(e.key==="Escape")close.current();if(e.key==="Tab"){const nodes=ref.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener("keydown",key);return ()=>{clearTimeout(timer);document.body.style.overflow=overflow;document.removeEventListener("keydown",key);previous?.focus();};
  },[open]);
  if(!open)return null;
  return <div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={`modal ${wide?"wide":""}`}><div className="modal-head"><h2 id={id}>{title}</h2><button type="button" className="icon-btn" aria-label="Fechar janela" onClick={onClose}><X size={21}/></button></div><div className="modal-body">{children}</div></div></div>;
}
export function inkOn(color:string){const v=parseInt(color.slice(1),16);const r=v>>16,g=(v>>8)&255,b=v&255;return (0.299*r+0.587*g+0.114*b)>165?"#20231a":"#ffffff";}
export function themeStyle(data:RestaurantData):CSSProperties{return {"--menu-accent":data.accent,"--menu-ink":inkOn(data.accent)} as CSSProperties;}
export function MiniMenu({data,large=false}:{data:RestaurantData;large?:boolean}){
  const presentation=menuPresentation(data);
  const products=data.products.filter(p=>p.enabled).slice(0,large?3:2);
  return <div className={`mini-menu theme-${data.theme} layout-${presentation.layout} hero-${presentation.hero} font-${presentation.font} corners-${presentation.corners}${menuIdentityClass(presentation.identity)} ${large?"large":""}`} style={themeStyle(data)}>
    <div className="mini-top"><span>{data.logo?<img src={data.logo} alt=""/>:<Pizza size={large?23:16}/>}</span><strong>{data.name||"Sua pizzaria"}</strong><span className="mini-open">● Aberto</span></div>
    <div className="mini-cover">{data.cover?<img src={data.cover} alt=""/>:<div className="cover-empty"><Pizza size={50}/></div>}<div><span>FEITA DO SEU JEITO</span><h3>{data.tagline||"Uma boa pizza muda a noite."}</h3></div></div>
    {data.address&&<div className="mini-store-address">⌖ {data.address}{data.city?` · ${data.city}`:""}</div>}
    {data.hours&&<div className="mini-store-hours">◷ {data.hours}</div>}
    <div className="mini-meta"><span>◷ {data.eta}</span><span>Entrega {money(data.deliveryFee)}</span></div>
    <div className="mini-tabs">{data.categories.slice(0,3).map((c,i)=><span key={c.id} className={i===0?"active":""}>{c.name}</span>)}</div>
    <div className="mini-products">{products.length?products.map(p=><div className="mini-product" key={p.id}><div><strong>{p.name}</strong><p>{p.description||"Ingredientes e sabores da sua casa."}</p><b>{money(p.kind==="pizza"?Math.min(...Object.values(p.sizes).filter(n=>n>0))||0:p.price)}</b></div>{(presentation.layout!=="compact"||presentation.identity==="pizza-vinho"||presentation.identity==="trattoria")&&(p.image?<img src={p.image} alt=""/>:<span className="mini-pizza"><Pizza/></span>)}<span className="mini-add">+</span></div>):<div className="mini-empty"><Pizza size={27}/><p>Seus sabores aparecem aqui.</p></div>}</div>
    {large&&<div className="mini-cart"><span>Seu próximo pedido começa aqui</span><ArrowUpRight size={15}/></div>}
  </div>;
}
export function ThemeCards({data,onSelect}:{data:RestaurantData;onSelect:(id:RestaurantData["theme"])=>void}){return <div className="theme-grid">{themes.map(theme=><button key={theme.id} type="button" className={`theme-card ${data.theme===theme.id?"selected":""}`} onClick={()=>onSelect(theme.id)}><MiniMenu data={{...data,theme:theme.id,presentation:presentationForTheme(theme.id),accent:theme.color}}/><div className="theme-card-bottom"><div><strong>{theme.name}</strong><span>{theme.tag}</span></div><span className="selection-dot"/></div></button>)}</div>;}
