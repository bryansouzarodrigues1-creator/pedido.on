import {money,type RestaurantData,type Size} from "./domain.ts";
import {effectivePrice,promotionEndToday,type Promotion} from "./promotions.ts";
export type DailyCampaign={id:string;day:string;headline:string;title:string;detail:string;items:{productId:string;size?:Size;quantity:number}[];price:number;photos:string[];kind:"product"|"bundle"};
export function brazilDay(now=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
export function dailyCampaigns(data:RestaurantData,now=new Date()):DailyCampaign[]{
 const day=brazilDay(now),seed=[...day].reduce((n,c)=>n+c.charCodeAt(0),0);
 const pizzas=data.products.filter(p=>p.enabled&&p.kind==="pizza"&&(["g","m","p"] as const).some(s=>p.sizes[s]>0)).sort((a,b)=>a.id.localeCompare(b.id));
 if(!pizzas.length)return [];
 const ordered=pizzas.map((_,i)=>pizzas[(seed+i)%pizzas.length]);
 const size=(id:string)=>(["g","m","p"] as const).find(s=>(data.products.find(p=>p.id===id)?.sizes[s]||0)>0)!;
 const part=(id:string,quantity=1)=>({productId:id,size:size(id),quantity});
 const make=(items:DailyCampaign["items"],kind:DailyCampaign["kind"],headline:string,index:number):DailyCampaign=>{
  const detail=items.map(item=>{const p=data.products.find(p=>p.id===item.productId)!;return `${item.quantity}× ${p.name}${item.size?" ("+item.size.toUpperCase()+")":""}`;}).join(" + ");
  const price=items.reduce((n,item)=>n+effectivePrice(data,data.products.find(p=>p.id===item.productId)!,item.size,now.getTime())*item.quantity,0);
  const photos=[...new Set(items.map(item=>data.products.find(p=>p.id===item.productId)!.image).filter(url=>/^\/media\/|^\/assets\/|^data:image\/(jpeg|png|webp);base64,/.test(url)))];
  return {id:day+"-"+index,day,headline,title:kind==="bundle"?"Para compartilhar hoje":data.products.find(p=>p.id===items[0].productId)!.name,detail,items,price,photos,kind};
 };
 const suggestions=[make([part(ordered[0].id)],"product",["Hoje tem pizza de verdade","Seu jantar pede uma pizza","Uma boa pedida para hoje"][seed%3],0)];
 if(ordered[1])suggestions.push(make([part(ordered[1].id)],"product",["Seu próximo sabor favorito","Pizza e bons momentos","Escolha o sabor da sua noite"][seed%3],1));
 const drink=data.products.find(p=>p.enabled&&p.kind==="simple"&&p.price>0&&/bebida|refrigerante|guaraná|coca|suco|água/i.test(p.name+" "+data.categories.find(c=>c.id===p.categoryId)?.name));
 const combo=[part(ordered[0].id,ordered[1]?1:2),...(ordered[1]?[part(ordered[1].id)]:[]),...(drink?[{productId:drink.id,quantity:1}]:[])];
 suggestions.push(make(combo,"bundle","Ideia de combo · confira sua margem",2));
 return suggestions.filter(idea=>idea.price<=1000000);
}
/** Only catalog prices, no invented discount, margin, delivery promise or model call. */
export function campaignMessage(data:RestaurantData,campaign:DailyCampaign,menuUrl:string,format:"whatsapp"|"status"="whatsapp"){
 if(campaign.kind==="bundle")throw Error("Confira o preço, salve e publique o combo antes de divulgar.");
 const price=money(campaign.price),day=campaign.day.split("-").reverse().slice(0,2).join("/");
 return format==="status"?`${campaign.headline} 🍕\n${campaign.detail}\n${price} · ${day}\n${data.name}\nPeça aqui: ${menuUrl}\nEntrega à parte.`:`${campaign.headline} 🍕\n\nNa ${data.name}, a pedida de hoje é ${campaign.detail}: ${price}.\n\nVeja o cardápio e monte seu pedido: ${menuUrl}\nPreço conferido em ${day}. Entrega à parte; consulte a disponibilidade no cardápio.`;
}
export function campaignPromotion(campaign:DailyCampaign,now=new Date()):Promotion{
 const common={id:crypto.randomUUID(),price:campaign.price,startsAt:now.toISOString(),endsAt:promotionEndToday(now),enabled:true};
 return campaign.kind==="bundle"?{...common,kind:"bundle",name:campaign.title,items:campaign.items}:{...common,productId:campaign.items[0].productId,size:campaign.items[0].size};
}

export function campaignFingerprint(data:RestaurantData,campaign:DailyCampaign){return JSON.stringify([data.name,data.accent,campaign]);}
