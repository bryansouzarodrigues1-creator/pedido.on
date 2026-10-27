import type {RestaurantData} from "./domain.ts";
/** One-time creative delivery requested by the platform owner. Public business
 * names only; no customer contact, prices, account ID or credentials. */
export function curatedWelcome(slug:string|undefined,data:RestaurantData,round:number){
 if(slug!=="efata-pizzaria"||data.name.trim().toUpperCase()!=="EFATA PIZZARIA")return null;
 const normalized=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const expected=["pizza calabresa molho mussarela calabresa cebola azeitonas oregano","frango catupirry molho frango desfiado mussarela catupirry oregano azeitonas","mussarela molho mussarela oregano azeitonas","pizza presunto molho mussarela presunto oregano azeitonas"];
 const products=data.products.filter(p=>p.enabled&&p.kind==="pizza");if(expected.some((name,i)=>normalized(products[i]?.name||"")!==name))return null;
 const selected=products.slice((round-1)*2,round*2),files=round===1?["calabresa","frango"]:["mussarela","presunto"];
 const lines=round===1?["Calabresa e bons momentos combinam com a sua noite.","Frango com catupiry para dar sabor ao encontro."]:["Queijo derretido e uma boa conversa. Peça na EFATA.","Presunto e mussarela: uma combinação para compartilhar."];
 return {round,id:"curated-efata-"+round,stale:false,brief:"Conceitos preparados para a EFATA a partir dos ingredientes do cardápio público. Luz quente, tons de forno e fotos em destaque.",textState:"completed",proposal:{reply:"EFATA PIZZARIA com mais presença: foto de abertura em destaque, duas ideias para divulgar e sabores organizados para escolher sem se perder. O nome, a cor e os preços da loja permanecem seus; confira as imagens ilustrativas antes de usar.",tagline:"Da EFATA para a sua mesa.",presentation:{layout:"poster" as const,hero:"cover" as const,font:"bold" as const,corners:"soft" as const},productDescriptions:selected.map((p,i)=>({id:p.id,description:lines[i]}))},images:selected.map((p,i)=>({productId:p.id,state:"completed",url:`/assets/efata-${files[i]}-v1.webp`}))};
}
