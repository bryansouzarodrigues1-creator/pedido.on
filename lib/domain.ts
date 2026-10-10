import { z } from "zod";
import {pixSchema,validPixKey} from "./order-policy.ts";
export const themes = [
  {id:"editorial",name:"Artesanal",description:"Elegância, cores quentes e um toque de tradição.",color:"#c64b2e",tag:"Escolha da casa"},
  {id:"classic",name:"Essencial",description:"Leve, direto e feito para escolher sem complicar.",color:"#dc382b",tag:"Minimalista"},
  {id:"dark",name:"Noturno",description:"Contraste marcante para uma marca cheia de atitude.",color:"#bde46c",tag:"Contemporâneo"},
  {id:"playful",name:"Família",description:"Acolhedor, vibrante e com personalidade de sobra.",color:"#e74736",tag:"Divertido"},
] as const;
export type ThemeId = typeof themes[number]["id"];
export const sizeLabels = {p:"Pequena · 4 fatias",m:"Média · 6 fatias",g:"Grande · 8 fatias"};
export type Size = keyof typeof sizeLabels;
const centsSchema = z.number().int().min(0).max(1000000);
const imageSchema = z.string().max(250).refine(v=>v===""||/^\/media\/[a-zA-Z0-9-]+\/[a-zA-Z0-9.-]+$/.test(v)||/^\/assets\/[a-zA-Z0-9.-]+$/.test(v),"Envie uma imagem pelo editor.");
const idSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
export const productSchema = z.object({id:idSchema,categoryId:idSchema,name:z.string().trim().min(2).max(100),description:z.string().trim().max(600),kind:z.enum(["pizza","simple"]),image:imageSchema,price:centsSchema,sizes:z.object({p:centsSchema,m:centsSchema,g:centsSchema}),enabled:z.boolean(),featured:z.boolean()});
export const restaurantSchema = z.object({
  name:z.string().trim().min(2).max(100),tagline:z.string().trim().max(120),description:z.string().trim().max(700),
  whatsapp:z.string().max(25).refine(v=>v===""||/^\+?[\d\s().-]{10,25}$/.test(v),"Confira o WhatsApp com DDD."),
  logo:imageSchema,cover:imageSchema,address:z.string().trim().max(200),city:z.string().trim().max(80),instagram:z.string().trim().max(80).regex(/^@?[a-zA-Z0-9._]*$/,"Informe somente o usuário do Instagram."),hours:z.string().trim().max(300),
  theme:z.enum(["editorial","classic","dark","playful"]),accent:z.string().regex(/^#[a-fA-F0-9]{6}$/),deliveryEnabled:z.boolean(),pickupEnabled:z.boolean(),isOpen:z.boolean(),deliveryFee:centsSchema,minOrder:centsSchema,eta:z.string().trim().min(1).max(60),halfRule:z.enum(["max","average"]),
  payments:z.array(z.enum(["Pix","Dinheiro","Cartão de crédito","Cartão de débito"])).min(1).max(4),categories:z.array(z.object({id:idSchema,name:z.string().trim().min(2).max(60)})).min(1).max(20),products:z.array(productSchema).max(200),crusts:z.array(z.object({id:idSchema,name:z.string().trim().min(2).max(60),price:centsSchema})).max(12),coupon:z.object({code:z.string().trim().max(30).regex(/^[a-zA-Z0-9_-]*$/),percent:z.number().int().min(0).max(50),minTotal:centsSchema,enabled:z.boolean()}),
  pix:pixSchema,
}).superRefine((v,ctx)=>{
  const seen=new Set<string>();
  for(const row of [...v.categories,...v.products,...v.crusts]){if(seen.has(row.id))ctx.addIssue({code:z.ZodIssueCode.custom,message:"Existem identificadores repetidos."});seen.add(row.id);}
  for(const p of v.products)if(!v.categories.some(c=>c.id===p.categoryId))ctx.addIssue({code:z.ZodIssueCode.custom,message:"O produto precisa de uma categoria válida."});
  if(v.coupon.enabled&&(!v.coupon.code||v.coupon.percent<1))ctx.addIssue({code:z.ZodIssueCode.custom,message:"Configure o código e o desconto do cupom."});
  if(v.pix.enabled&&(!v.payments.includes("Pix")||!validPixKey(v.pix.type,v.pix.key)||v.pix.recipient.length<2))ctx.addIssue({code:z.ZodIssueCode.custom,message:"Configure uma chave Pix válida, o titular e habilite Pix nas formas de pagamento."});
});
export type RestaurantData=z.infer<typeof restaurantSchema>;
export type Product=z.infer<typeof productSchema>;
export type RestaurantRecord={id:string;slug:string;name:string;data:string;revision:number;liveRevision:number;published:boolean;plan:string;createdAt:string;updatedAt:string};
export type LineInput={productIds:string[];size?:Size;crustId?:string;quantity:number;note:string};
export type PricedLine=LineInput&{label:string;detail:string;unitPrice:number;total:number};
export const orderInputSchema=z.object({requestId:z.string().uuid(),trackingToken:z.string().regex(/^[a-f0-9]{64}$/).optional(),customer:z.string().trim().min(2).max(80),phone:z.string().trim().regex(/^[\d\s()+.-]{10,25}$/),method:z.enum(["delivery","pickup"]),address:z.string().trim().max(300),payment:z.enum(["Pix","Dinheiro","Cartão de crédito","Cartão de débito"]),note:z.string().trim().max(500),coupon:z.string().trim().max(30),website:z.string().max(0).optional(),items:z.array(z.object({productIds:z.array(idSchema).min(1).max(2),size:z.enum(["p","m","g"]).optional(),crustId:idSchema.optional(),quantity:z.number().int().min(1).max(20),note:z.string().trim().max(300)})).min(1).max(30)});
export type OrderInput=z.infer<typeof orderInputSchema>;
export type OrderSummary={items:PricedLine[];subtotal:number;discount:number;delivery:number;total:number;customer:string;phone:string;method:"delivery"|"pickup";address:string;payment:string;note:string;coupon:string};
export function money(value:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);}
export function asCents(value:string){const n=Number(value.replace(",","."));return Number.isFinite(n)?Math.max(0,Math.round(n*100)):0;}
export function phoneNumber(value:string){const n=value.replace(/\D/g,"");return !value.trim().startsWith("+")&&(n.length===10||n.length===11)?"55"+n:n;}
export function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);}
export const slugSchema=z.string().min(3).max(60).regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/).refine(s=>!["app","api","admin","demo","signin","forno","pedido","pedido-on","conta","configuracao","entrar","cadastro","esqueci-senha","redefinir-senha","confirmar-email","sair","planos","layouts","media","pedido"].includes(s),"Esse endereço é reservado.");
export function priceLine(data:RestaurantData,line:LineInput):PricedLine{
  if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>20)throw new Error("Quantidade inválida.");
  if(line.productIds.length<1||line.productIds.length>2||new Set(line.productIds).size!==line.productIds.length)throw new Error("Escolha um ou dois sabores diferentes.");
  const products=line.productIds.map(id=>data.products.find(p=>p.id===id&&p.enabled));
  if(products.some(p=>!p))throw new Error("Um dos produtos não está disponível. Atualize o cardápio.");
  const ps=products as Product[],first=ps[0];
  if(ps.some(p=>p.kind!==first.kind)||(first.kind==="simple"&&(ps.length!==1||line.size||line.crustId)))throw new Error("Combinação de produtos inválida.");
  let base=first.price;const details:string[]=[];
  if(first.kind==="pizza"){
    if(!line.size||!(line.size in sizeLabels))throw new Error("Escolha o tamanho da pizza.");
    const prices=ps.map(p=>p.sizes[line.size!]);
    if(prices.some(n=>n<=0))throw new Error("Esse tamanho não está disponível para os sabores selecionados.");
    base=data.halfRule==="max"?Math.max(...prices):Math.round(prices.reduce((a,b)=>a+b,0)/prices.length);details.push(sizeLabels[line.size]);if(ps.length===2)details.push("Meio a meio");
  }else if(base<=0)throw new Error("Produto sem preço disponível.");
  if(line.crustId){const crust=data.crusts.find(c=>c.id===line.crustId);if(!crust)throw new Error("A borda escolhida não está disponível.");base+=crust.price;details.push("Borda de "+crust.name);}
  return {...line,label:ps.map(p=>p.name).join(" + "),detail:details.join(" · "),unitPrice:base,total:base*line.quantity};
}
export function calculateOrder(data:RestaurantData,raw:unknown):OrderSummary{
  const input=orderInputSchema.parse(raw);
  if(!data.isOpen)throw new Error("A pizzaria está fechada para pedidos neste momento.");
  if(input.method==="delivery"&&!data.deliveryEnabled||input.method==="pickup"&&!data.pickupEnabled)throw new Error("Essa modalidade não está disponível.");
  if(input.method==="delivery"&&input.address.length<8)throw new Error("Informe o endereço completo para entrega.");
  if(!data.payments.includes(input.payment))throw new Error("Escolha uma forma de pagamento aceita pela pizzaria.");
  const phone=phoneNumber(input.phone);if(phone.length<12||phone.length>15)throw new Error("Confira o seu telefone com DDD.");
  const items=input.items.map(line=>priceLine(data,line)),subtotal=items.reduce((a,b)=>a+b.total,0);
  if(subtotal<data.minOrder)throw new Error("O pedido mínimo é "+money(data.minOrder)+".");
  let discount=0;if(input.coupon){const c=data.coupon;if(!c.enabled||c.code.toUpperCase()!==input.coupon.toUpperCase()||subtotal<c.minTotal)throw new Error("Cupom inválido ou pedido abaixo do mínimo do cupom.");discount=Math.round(subtotal*c.percent/100);}
  const delivery=input.method==="delivery"?data.deliveryFee:0;
  return {items,subtotal,discount,delivery,total:subtotal-discount+delivery,customer:input.customer,phone,method:input.method,address:input.address,payment:input.payment,note:input.note,coupon:input.coupon};
}
export function whatsappMessage(data:RestaurantData,order:OrderSummary,code:string){return [`Olá, ${data.name}! Meu pedido é #${code}.`,"",...order.items.flatMap(item=>[`${item.quantity}x ${item.label} — ${money(item.total)}`,item.detail,...(item.note?["Obs.: "+item.note]:[])]),"",`Subtotal: ${money(order.subtotal)}`,...(order.discount?[`Desconto: −${money(order.discount)}`]:[]),`Entrega: ${money(order.delivery)}`,`TOTAL: ${money(order.total)}`,"",`Nome: ${order.customer}`,`Telefone: ${order.phone}`,order.method==="delivery"?`Entregar em: ${order.address}`:"Retirada no local",order.payment==="Pix"&&data.pix?.enabled?"Pagamento: Pix antecipado · conferência pela pizzaria":`Pagamento na ${order.method==="delivery"?"entrega":"retirada"}: ${order.payment}`,...(order.note?[`Observação: ${order.note}`]:[]),"","Aguardo a confirmação da pizzaria."].filter(Boolean).join("\n");}
export function defaultRestaurant(name:string,theme:ThemeId="editorial"):RestaurantData{return {name,theme,accent:themes.find(t=>t.id===theme)!.color,tagline:"Feita com carinho. Pedida do seu jeito.",description:"",whatsapp:"",logo:"",cover:"",address:"",city:"",instagram:"",hours:"",deliveryEnabled:true,pickupEnabled:false,isOpen:true,deliveryFee:0,minOrder:0,eta:"40–60 min",halfRule:"max",payments:["Pix","Dinheiro","Cartão de crédito"],pix:{enabled:false,type:"random",key:"",recipient:""},categories:[{id:"pizzas",name:"Pizzas"},{id:"doces",name:"Pizzas doces"},{id:"bebidas",name:"Bebidas"},{id:"combos",name:"Combos"}],products:[],crusts:[],coupon:{code:"",percent:10,minTotal:0,enabled:false}};}
export function demoRestaurant(theme:ThemeId="editorial"):RestaurantData{
  const data=defaultRestaurant("Casa da Pizza",theme);
  return {...data,pickupEnabled:true,crusts:[{id:"catupiry",name:"Catupiry",price:800},{id:"cheddar",name:"Cheddar",price:700}],tagline:"Da nossa casa, para a sua.",description:"Massa de fermentação lenta, ingredientes escolhidos com carinho e aquela pizza que reúne todo mundo.",cover:"/assets/pizza.webp",hours:"Terça a domingo · 18h às 23h",city:"São Paulo, SP",address:"Rua dos Sabores, 120 · Centro",deliveryFee:600,minOrder:2500,products:[
    {id:"margherita",categoryId:"pizzas",name:"Margherita",description:"Molho de tomate da casa, mozzarella, manjericão fresco e azeite extravirgem.",image:"/assets/pizza.webp",kind:"pizza",price:0,sizes:{p:3500,m:4900,g:5900},enabled:true,featured:true},
    {id:"calabresa",categoryId:"pizzas",name:"Calabresa especial",description:"Calabresa fatiada, cebola roxa, mozzarella, azeitonas e orégano.",image:"",kind:"pizza",price:0,sizes:{p:3600,m:5100,g:6200},enabled:true,featured:true},
    {id:"quatro-queijos",categoryId:"pizzas",name:"Quatro queijos",description:"Mozzarella, gorgonzola, parmesão e Catupiry em uma combinação cremosa.",image:"",kind:"pizza",price:0,sizes:{p:3900,m:5400,g:6800},enabled:true,featured:false},
    {id:"chocolate",categoryId:"doces",name:"Chocolate & morango",description:"Chocolate ao leite e morangos frescos para fechar a noite.",image:"",kind:"pizza",price:0,sizes:{p:3200,m:4600,g:5800},enabled:true,featured:false},
    {id:"refri",categoryId:"bebidas",name:"Refrigerante 2 L",description:"Bem gelado para acompanhar sua pizza.",image:"",kind:"simple",price:1400,sizes:{p:0,m:0,g:0},enabled:true,featured:false},
    {id:"combo-casa",categoryId:"combos",name:"Noite em família",description:"Uma pizza grande Margherita e um refrigerante de 2 litros.",image:"/assets/pizza.webp",kind:"simple",price:6900,sizes:{p:0,m:0,g:0},enabled:true,featured:true},
  ]};
}
