import {z} from "zod";
import type {RestaurantData, Product, Size,LineInput} from "./domain.ts";

const common={
  id:z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  price:z.number().int().min(1).max(1000000),
  startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true}),
  enabled:z.boolean(),
};
export const bundleItemSchema=z.object({productId:z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),size:z.enum(["p","m","g"]).optional(),quantity:z.number().int().min(1).max(6)}).strict();
const single=z.object({...common,kind:z.literal("product").optional(),productId:z.string().min(1).max(80),size:z.enum(["p","m","g"]).optional()}).strict();
const bundle=z.object({...common,kind:z.literal("bundle"),name:z.string().trim().min(2).max(100),items:z.array(bundleItemSchema).min(1).max(6)}).strict().refine(p=>{const count=p.items.reduce((sum,item)=>sum+item.quantity,0);return count>=2&&count<=12&&new Set(p.items.map(item=>item.productId+":"+(item.size||""))).size===p.items.length;},"Monte um combo com 2 a 12 unidades, sem repetir linhas do mesmo produto e tamanho.");
export const promotionSchema=z.union([single,bundle]).refine(p=>Date.parse(p.endsAt)>Date.parse(p.startsAt),"Confira o início e o fim da promoção.");
export type Promotion=z.infer<typeof promotionSchema>;
export type BundlePromotion=Extract<Promotion,{kind:"bundle"}>;
const live=(p:Promotion,now:number)=>p.enabled&&Date.parse(p.startsAt)<=now&&now<Date.parse(p.endsAt)&&p.price>0;
const validItem=(product:Product|undefined,size?:Size)=>!!product&&(product.kind==="pizza"?!!size&&product.sizes[size]>0:!size&&product.price>0);
export function promotionContainsProduct(p:Promotion,id:string){return p.kind==="bundle"?p.items.some(item=>item.productId===id):p.productId===id;}
export function promotionAvailable(data:Pick<RestaurantData,"products">,p:Promotion){
 const items=p.kind==="bundle"?p.items:[p];
 return items.every(item=>{const product=data.products.find(v=>v.id===item.productId);return product?.enabled&&validItem(product,item.size);});
}
export function isActivePromotion(data:Pick<RestaurantData,"products">,p:Promotion,now=Date.now()){return live(p,now)&&promotionAvailable(data,p);}
export function activePromotion(data:Pick<RestaurantData,"promotions">,product:Product,size?:Size,now=Date.now()){
  return (data.promotions||[]).find((p):p is Extract<Promotion,{productId:string}>=>p.kind!=="bundle"&&p.productId===product.id&&p.size===size&&live(p,now)&&product.enabled&&validItem(product,size));
}
export function effectivePrice(data:Pick<RestaurantData,"promotions">,product:Product,size?:Size,now=Date.now()){
  return activePromotion(data,product,size,now)?.price??(product.kind==="pizza"?(size?product.sizes[size]:0):product.price);
}
export function lowestProductPrice(data:Pick<RestaurantData,"promotions">,product:Product,now=Date.now()){
  return product.kind==="pizza"?Math.min(...(["p","m","g"] as const).filter(s=>product.sizes[s]>0).map(s=>effectivePrice(data,product,s,now))):effectivePrice(data,product,undefined,now);
}
export function promotionEndToday(now=new Date()){
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  return new Date(`${day}T23:59:59-03:00`).toISOString();
}
export function bundleVersion(p:BundlePromotion){return JSON.stringify(p.items.map(item=>[item.productId,item.size||"",item.quantity]).sort((a,b)=>{const left=JSON.stringify(a),right=JSON.stringify(b);return left<right?-1:left>right?1:0;}));}
export function promotionLabel(data:Pick<RestaurantData,"products">,p:Promotion){return p.kind==="bundle"?p.name:(data.products.find(v=>v.id===p.productId)?.name||"Produto removido")+(p.size?" · "+p.size.toUpperCase():"");}
export function bundleDescription(data:Pick<RestaurantData,"products">,p:BundlePromotion,quantity=1){return p.items.map(item=>`${item.quantity*quantity}× ${data.products.find(v=>v.id===item.productId)?.name||"Produto indisponível"}${item.size?" ("+{p:"P",m:"M",g:"G"}[item.size]+")":""}`).join(" + ");}
export function promotionBasePrice(data:Pick<RestaurantData,"products"|"promotions">,p:Promotion,now=Date.now()){
 if(p.kind==="bundle")return p.items.reduce((sum,item)=>{const product=data.products.find(v=>v.id===item.productId);return sum+(product?effectivePrice(data,product,item.size,now):0)*item.quantity;},0);
 const product=data.products.find(v=>v.id===p.productId);return product?(product.kind==="pizza"?(p.size?product.sizes[p.size]:0):product.price):0;
}
export function promotionCartLine(p:Promotion):LineInput{return p.kind==="bundle"?{bundleId:p.id,bundleVersion:bundleVersion(p),productIds:[],quantity:1,note:""}:{productIds:[p.productId],...(p.size?{size:p.size}:{}),quantity:1,note:""};}
export function promotionMessage(data:RestaurantData,p:Promotion,menuUrl:string){
  if(!promotionAvailable(data,p))return "";
  const base=promotionBasePrice(data,p);
  const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v/100);
  const ends=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(p.endsAt));
  const value=base>p.price?`de ${money(base)} por ${money(p.price)}`:money(p.price);
  return `${data.name}\n${promotionLabel(data,p)}: ${value}.${p.kind==="bundle"?"\nInclui: "+bundleDescription(data,p)+".":""}\nVálido até ${ends}. Não acumula com cupom.\nPeça pelo cardápio: ${menuUrl}`;
}
