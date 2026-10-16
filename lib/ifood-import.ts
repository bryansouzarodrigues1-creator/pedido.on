import {parseIfoodStoreLink} from "./menu-source-links.ts";
export type IfoodImportResult={status:"imported"|"needs_content";url:string;text:string;count:number;message:string};
const blocked="O iFood não liberou o catálogo por esse link. Cole o texto completo do cardápio ou envie um arquivo TXT/CSV para continuar. Não é preciso cadastrar os produtos um a um.";
const clean=(s:unknown,max=600)=>typeof s==="string"?s.replace(/<[^>]*>/g," ").replace(/[\r\n]+/g," ").replace(/\s+/g," ").trim().slice(0,max):"";
type Candidate={name:string;category:string;description:string;prices:Set<number>;uncertain:boolean};
const keys=["@graph","hasMenu","hasMenuSection","hasMenuItem","itemListElement","item"];
const hydrationKeys=new Set(["menu","menus","catalog","catalogs","categories","sections","items","products","groups","data"]);
const bridgeKeys=new Set(["props","pageProps","initialState","state","data","payload","dehydratedState","queries","queryData"]);
function exactPrice(value:unknown,currency?:unknown):number|null{
 if(currency!==undefined&&currency!=="BRL")return null;
 const raw=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
 if(raw)return exactPrice(raw.value,raw.currency??raw.priceCurrency??currency);
 const number=typeof value==="number"?value:typeof value==="string"&&/^\d+(?:\.\d{1,2})?$/.test(value)?Number(value):NaN;
 return Number.isFinite(number)&&number>0&&number<=10000&&Math.abs(number*100-Math.round(number*100))<0.000001?Math.round(number*100):null;
}
function complexOptions(v:Record<string,unknown>){
 return ["optionGroups","garnishGroups","options","variants","variations","sizes","priceOptions"].some(key=>Array.isArray(v[key])&&(v[key] as unknown[]).length>0);
}
/** Only parse clear public menu entries. No JavaScript execution, login, third-party redirects, or inferred prices. */
export function structuredIfoodMenu(html:string){
 const candidates=new Map<string,Candidate>(),blockedKeys=new Set<string>();let visited=0;
 function collect(value:Record<string,unknown>,category:string,source:"schema"|"hydration"){
  const name=clean(value.name,100),description=clean(value.description);
  if(name.length<2||!category||/^(?:taxa|frete|entrega|avalia[cç][aã]o)\b/i.test(name))return;
  const key=category.toLocaleLowerCase("pt-BR")+":"+name.toLocaleLowerCase("pt-BR");
  if(complexOptions(value)||["UNAVAILABLE","DISABLED","INACTIVE"].includes(String(value.status||"").toUpperCase())
   ||value.promotionalPrice!==undefined||value.discountedPrice!==undefined||value.discountPrice!==undefined){
   blockedKeys.add(key);return; // A simpler duplicate cannot override a complex or unavailable item.
  }
  let prices:number[]=[];
  if(source==="schema"){
   const offers=Array.isArray(value.offers)?value.offers:[value.offers];
   for(const offer of offers)if(offer&&typeof offer==="object"&&!Array.isArray(offer)){
    const obj=offer as Record<string,unknown>,price=exactPrice(obj.price,obj.priceCurrency);
    if(price!==null)prices.push(price);
   }
  }else{
   const price=exactPrice(value.price,value.priceCurrency);
   if(price!==null)prices.push(price);
  }
  if(!prices.length)return;
  const candidate=candidates.get(key)||{name,category,description,prices:new Set<number>(),uncertain:false};
  for(const price of prices)candidate.prices.add(price);
  if(candidate.description&&description&&candidate.description!==description)candidate.uncertain=true;
  if(!candidate.description)candidate.description=description;
  candidates.set(key,candidate);
 }
 function visitSchema(value:unknown,category="Pizzas",depth=0){
  if(depth>12||++visited>5000||!value||typeof value!=="object")return;
  if(Array.isArray(value)){for(const child of value)visitSchema(child,category,depth+1);return;}
  const v=value as Record<string,unknown>,types=Array.isArray(v["@type"])?v["@type"]:[v["@type"]];
  if(types.includes("MenuSection"))category=clean(v.name,60)||category;
  if(types.includes("MenuItem"))collect(v,category,"schema");
  for(const key of keys)if(v[key])visitSchema(v[key],category,depth+1);
 }
 function visitCatalog(value:unknown,category="",parent="",depth=0){
  if(depth>12||++visited>5000||!value||typeof value!=="object")return;
  if(Array.isArray(value)){for(const item of value)visitCatalog(item,category,parent,depth+1);return;}
  const v=value as Record<string,unknown>;
  if((parent==="categories"||parent==="sections")&&v.name)category=clean(v.name,60);
  if((parent==="items"||parent==="products")&&category)collect(v,category,"hydration");
  for(const key of hydrationKeys)if(v[key])visitCatalog(v[key],category,key,depth+1);
 }
 function findCatalog(value:unknown,depth=0){
  if(depth>10||++visited>5000||!value||typeof value!=="object")return;
  if(Array.isArray(value)){for(const item of value)findCatalog(item,depth+1);return;}
  const v=value as Record<string,unknown>;
  for(const [key,child] of Object.entries(v)){
   if(["catalog","catalogs","menu","menus","categories","sections"].includes(key))visitCatalog(child,"",key);
   else if(bridgeKeys.has(key))findCatalog(child,depth+1);
  }
 }
 let scripts=0;
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(++scripts>150)break;
  const attributes=match[1],body=match[2];
  if(body.length>1100000)continue;
  const isLd=/\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)(?=\s|$)/i.test(attributes);
  const isNext=/\bid\s*=\s*(?:"__NEXT_DATA__"|'__NEXT_DATA__'|__NEXT_DATA__)(?=\s|$)/i.test(attributes);
  if(!isLd&&!isNext)continue;
  try{const value=JSON.parse(body);if(isLd)visitSchema(value);if(isNext)findCatalog(value);}catch{/* Invalid/foreign scripts must not become product data. */}
 }
 const lines:string[]=[];
 for(const candidate of candidates.values()){
  if(blockedKeys.has(candidate.category.toLocaleLowerCase("pt-BR")+":"+candidate.name.toLocaleLowerCase("pt-BR"))||candidate.uncertain||candidate.prices.size!==1)continue;
  const cents=[...candidate.prices][0],price=(cents/100).toFixed(2).replace(".",",");
  const kind=/bebida|refri|suco|cerveja|combo|lanche|hamburg/i.test(candidate.category)?"simple":"pizza";
  lines.push("Categoria: "+candidate.category+" ["+kind+"]",candidate.name+" R$ "+price,...(candidate.description?["Ingredientes: "+candidate.description]:[]));
  if(lines.length>=600)break;
 }
 return {text:lines.join("\n"),count:lines.filter(line=>line.startsWith("Categoria: ")).length};
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
  return menu.count?{status:"imported",url:link.url,...menu,message:menu.count+" produtos encontrados em dados públicos estruturados. Confira os preços, tamanhos e complementos antes de importar; itens complexos podem exigir foto ou texto."}:fallback();
 }catch{return fallback("Não foi possível acessar esse catálogo agora. Você pode colar o texto completo ou enviar um arquivo TXT/CSV.");}
}
