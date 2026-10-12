import {z} from "zod";
import type {RestaurantData, Product, Size} from "./domain.ts";

export const promotionSchema=z.object({
  id:z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  productId:z.string().min(1).max(80),size:z.enum(["p","m","g"]).optional(),
  price:z.number().int().min(1).max(1000000),
  startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true}),
  enabled:z.boolean(),
}).strict().refine(p=>Date.parse(p.endsAt)>Date.parse(p.startsAt),"Confira o início e o fim da promoção.");
export type Promotion=z.infer<typeof promotionSchema>;
export function activePromotion(data:Pick<RestaurantData,"promotions">,product:Product,size?:Size,now=Date.now()){
  return (data.promotions||[]).find(p=>p.enabled&&p.productId===product.id&&p.size===size&&Date.parse(p.startsAt)<=now&&now<Date.parse(p.endsAt)&&p.price>0&&p.price<(product.kind==="pizza"?(size?product.sizes[size]:0):product.price));
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
export function promotionMessage(data:RestaurantData,p:Promotion,menuUrl:string){
  const product=data.products.find(v=>v.id===p.productId);
  if(!product)return "";
  const base=product.kind==="pizza"&&p.size?product.sizes[p.size]:product.price;
  const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v/100);
  const ends=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(p.endsAt));
  const size=p.size?` · ${{p:"Pequena",m:"Média",g:"Grande"}[p.size]}`:"";
  return `${data.name}\n${product.name}${size}: de ${money(base)} por ${money(p.price)}.\nVálido até ${ends}. ${product.kind==="pizza"?"Pizza inteira; sem acumular cupom.":"Sem acumular cupom."}\nPeça pelo cardápio: ${menuUrl}`;
}
