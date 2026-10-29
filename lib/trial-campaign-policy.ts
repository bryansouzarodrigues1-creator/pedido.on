import {money,type RestaurantData,type Size} from "./domain.ts";
import {effectivePrice} from "./promotions.ts";
import {brazilDay,type DailyCampaign} from "./daily-campaigns.ts";
import type {StudioProposal} from "./studio-policy.ts";

export function campaignSource(data:RestaurantData){return JSON.stringify([data.name,data.theme,data.accent,data.presentation,data.tagline,data.description,data.cover,data.logo,data.categories,data.products,data.promotions]);}
export function campaignCreativeSource(data:RestaurantData){return JSON.stringify([data.name,data.theme,data.accent,data.presentation,data.tagline,data.description,data.cover,data.logo,data.categories,data.products.map(p=>[p.id,p.name,p.description,p.enabled,p.kind,p.image])]);}
export function trialIdeas(data:RestaurantData,round:number,now=new Date()):DailyCampaign[]{
 const products=data.products.filter(p=>p.enabled&&(p.kind==="pizza"?Object.values(p.sizes).some(price=>price>0):p.price>0));
 const pizzas=products.filter(p=>p.kind==="pizza"),pool=pizzas.length?pizzas:products;if(!pool.length)return [];
 return [0,1].map((slot):DailyCampaign=>{
  const p=pool[((round-1)*2+slot)%pool.length],size=p.kind==="pizza"?(["g","m","p"] as Size[]).find(s=>p.sizes[s]>0):undefined,quantity=pool.length===1&&slot===1?2:1;
  const items=[{productId:p.id,...(size?{size}:{}),quantity}],detail=`${quantity}× ${p.name}${size?" ("+size.toUpperCase()+")":""}`;
  return {id:`welcome-${round}-${slot}`,day:brazilDay(now),headline:slot===0?"A próxima boa pedida da sua noite":"Para dividir bons momentos",title:quantity===2?"Dupla para compartilhar":p.name,detail,items,price:effectivePrice(data,p,size,now.getTime())*quantity,photos:p.image?[p.image]:[],kind:quantity===2?"bundle":"product"};
 }).filter(idea=>idea.price>0&&idea.price<=1000000);
}
/** The model supplies a short call; product, size, amount and link remain verified text. */
export function campaignCaption(data:RestaurantData,idea:DailyCampaign,url:string,copy=""){
 const safe=copy.trim().length<=180&&!/\d|r\$|%|gr[aá]tis|gratuit|descont|entrega|frete|hor[aá]rio|http|@|ganhe|garant/i.test(copy)?copy.trim():"";
 return `${safe||idea.headline} 🍕\n\n${data.name}\n${idea.detail}\n${money(idea.price)}\n\nEscolha pelo cardápio: ${url}\n${data.deliveryEnabled?"Entrega à parte. Consulte a taxa no cardápio.":data.pickupEnabled?"Retirada na loja. Confira o endereço no cardápio.":"Consulte a disponibilidade com a loja."} Preço conferido em ${idea.day.split("-").reverse().join("/")}.`;
}
export function suggestedMenuPatch(data:RestaurantData,proposal:StudioProposal|null,photos:{productId:string;url:string}[]):Partial<RestaurantData>{
 return {presentation:proposal?.presentation||{layout:"poster",hero:"cover",font:"bold",corners:"soft"},...(proposal?.tagline?{tagline:proposal.tagline}:{}),...(!data.cover&&photos[0]?{cover:photos[0].url}:{}),products:data.products.map(product=>{const photo=photos.find(p=>p.productId===product.id);return !product.image&&photo?{...product,image:photo.url}:product;})};
}
export function menuMap(data:RestaurantData){
 const count=data.products.filter(p=>p.enabled).length,missing=data.products.filter(p=>p.enabled&&!p.image).length;
 return {steps:[{title:"Uma abertura com a sua marca",detail:`${data.name}: capa, chamada e acesso direto ao pedido.`},{title:"Duas ofertas em destaque",detail:"Preço e validade conferidos por você antes de publicar."},{title:`Seus ${count} produtos organizados`,detail:data.categories.map(c=>c.name).filter(Boolean).join(" · ")||"Categorias para encontrar o pedido mais rápido."},{title:"Do sabor ao pedido",detail:"Tamanho, quantidade, observações e entrega no fluxo do cardápio."}],checks:[...(missing?[`${missing} produto(s) ainda sem foto. As imagens de IA são ilustrativas e precisam representar o que sua loja vende.`]:[]),...(data.products.some(p=>p.name.length>55)?["Há nomes longos. Separe o nome do sabor e a lista de ingredientes no editor."]:[]),...(!/\d/.test(data.hours||"")?["Confira os horários: informe também as horas de abrir e fechar."]:[])]};
}
