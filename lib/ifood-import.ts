import {parseIfoodStoreLink} from "./menu-source-links.ts";
export type IfoodImportResult={status:"imported"|"needs_content";url:string;text:string;count:number;message:string};
const blocked="O iFood não liberou o catálogo por esse link. Cole o texto completo do cardápio ou envie um arquivo TXT/CSV para continuar. Não é preciso cadastrar os produtos um a um.";
const clean=(s:unknown,max=600)=>typeof s==="string"?s.replace(/<[^>]*>/g," ").replace(/[\r\n]+/g," ").replace(/\s+/g," ").trim().slice(0,max):"";
export function structuredIfoodMenu(html:string){
 const lines:string[]=[],seen=new Set<string>();let count=0,visited=0;
 function visit(value:unknown,category="Pizzas",depth=0){
  if(depth>12||++visited>5000||count>=200||!value||typeof value!=="object")return;
  if(Array.isArray(value)){for(const child of value)visit(child,category,depth+1);return;}
  const v=value as Record<string,unknown>,types=Array.isArray(v["@type"])?v["@type"]:[v["@type"]];
  if(types.includes("MenuSection"))category=clean(v.name,60)||category;
  if(types.includes("MenuItem")){
   const name=clean(v.name,100),offers=Array.isArray(v.offers)?v.offers:[v.offers];
   const prices=offers.filter((o):o is Record<string,unknown>=>!!o&&typeof o==="object").filter(o=>o.priceCurrency===undefined||o.priceCurrency==="BRL").map(o=>typeof o.price==="number"?o.price:typeof o.price==="string"&&/^\d+(?:\.\d{1,2})?$/.test(o.price)?Number(o.price):NaN).filter(n=>Number.isFinite(n)&&n>0&&n<=10000);
   const unique=[...new Set(prices)],description=clean(v.description),key=category+":"+name;
   if(name.length>=2&&unique.length===1&&!seen.has(key)){
    const kind=/bebida|refri|suco|cerveja|combo|lanche|hamburg/i.test(category)?"simple":"pizza";
    seen.add(key);lines.push(`Categoria: ${category} [${kind}]`,`${name} R$ ${unique[0].toFixed(2).replace(".",",")}`,...(description?["Ingredientes: "+description]:[]));count++;
   }
  }
  for(const key of ["@graph","hasMenu","hasMenuSection","hasMenuItem","itemListElement","item"])if(v[key])visit(v[key],category,depth+1);
 }
 for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)){try{visit(JSON.parse(match[1]));}catch{}}
 return {text:lines.join("\n"),count};
}
export async function importIfoodLink(raw:string,fetcher:typeof fetch=fetch):Promise<IfoodImportResult>{
 const link=parseIfoodStoreLink(raw);if(!link)throw Error("Cole o link completo da loja no iFood.");
 const fallback=(message=blocked):IfoodImportResult=>({status:"needs_content",url:link.url,text:"",count:0,message});
 try{
  const response=await fetcher(link.url,{redirect:"manual",signal:AbortSignal.timeout(12000),headers:{Accept:"text/html"}});
  // Redirects are intentionally not followed: the submitted store is the only host/path fetched.
  if(!response.ok||!response.headers.get("content-type")?.includes("text/html")){await response.body?.cancel();return fallback();}
  if(Number(response.headers.get("content-length")||0)>1500000){await response.body?.cancel();return fallback();}
  const reader=response.body?.getReader();if(!reader)return fallback();let size=0;const parts:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1500000){await reader.cancel();return fallback();}parts.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  const menu=structuredIfoodMenu(new TextDecoder().decode(bytes));
  return menu.count?{status:"imported",url:link.url,...menu,message:`${menu.count} produtos encontrados na página pública. Confira os preços e os tamanhos antes de importar.`}:fallback();
 }catch{return fallback("Não foi possível acessar esse catálogo agora. Você pode colar o texto completo ou enviar um arquivo TXT/CSV.");}
}
