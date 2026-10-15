import {money,type RestaurantData} from "./domain.ts";
import {promotionLabel,bundleDescription,isActivePromotion,type Promotion} from "./promotions.ts";
export function promotionVersion(data:RestaurantData,promotion:Promotion){
 const ids=promotion.kind==="bundle"?promotion.items.map(item=>item.productId):[promotion.productId];
 const offer=[promotion.id,promotion.kind==="bundle"?"bundle":"product",promotion.price,promotion.startsAt,promotion.endsAt,promotion.enabled,promotion.kind==="bundle"?[promotion.name,promotion.items.map(item=>[item.productId,item.size||"",item.quantity])]:[promotion.productId,promotion.size||""]];
 return JSON.stringify([data.name,data.logo,offer,ids.map(id=>{const p=data.products.find(item=>item.id===id);return p?[p.id,p.name,p.enabled,p.kind,p.price,p.sizes.p,p.sizes.m,p.sizes.g]:[id];})]);
}
export function promotionArt(data:RestaurantData,promotion:Promotion,slug:string,now=Date.now()){
 if(!isActivePromotion(data,promotion,now))throw Error("Esta promoção encerrou ou está indisponível. Atualize a oferta antes de divulgar.");
 return {name:data.name,logo:data.logo,title:promotionLabel(data,promotion),detail:promotion.kind==="bundle"?bundleDescription(data,promotion):"",price:money(promotion.price),expires:new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(promotion.endsAt)),menuPath:"/p/"+slug,accent:data.accent,version:promotionVersion(data,promotion)};
}
export type PromotionArt=ReturnType<typeof promotionArt>;
