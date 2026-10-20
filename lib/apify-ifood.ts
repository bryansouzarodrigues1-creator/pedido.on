import type {IfoodImportResult} from "./ifood-import.ts";
import {parseIfoodStoreLink} from "./menu-source-links.ts";
import {normalizeMenuText,readMenuPages} from "./menu-reader-policy.ts";

// Server-only adapter. A connected chat app does not supply this site's token.
export const apifyIfoodActor="Dd5SpXWfkz2yqNAuf";
export const apifyIfoodLimits={timeoutSeconds:60,maxTotalChargeUsd:0.05,maxMenuItems:200,responseBytes:1500000,cacheSeconds:900} as const;
export type ApifyIfoodSettings={token:string};
export function apifyIfoodSettings(env:Record<string,unknown>):ApifyIfoodSettings|null{
 if(env.PEDIDO_APIFY_IFOOD_ENABLED!=="true"||env.PEDIDO_APIFY_IFOOD_VERIFIED!=="true")return null;
 const token=env.APIFY_TOKEN;
 return typeof token==="string"&&/^[A-Za-z0-9._~-]{20,256}$/.test(token)?{token}:null;
}
type Obj=Record<string,unknown>;
const record=(v:unknown):Obj|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Obj:null;
const clean=(v:unknown,max:number)=>{
 if(typeof v!=="string"||v.length>3000)return "";
 const value=v.normalize("NFC").replace(/<[^>]*>/g," ").replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g," ").replace(/\s+/g," ").trim();
 return value.length<=max?value:"";
};
function cents(v:unknown):number|null{
 return typeof v==="number"&&Number.isFinite(v)&&v>0&&v<=10000&&Math.abs(v*100-Math.round(v*100))<0.000001?Math.round(v*100):null;
}
function complex(v:Obj){
 return ["optionGroups","garnishGroups","optionGroupIds","garnishGroupIds","options","variants","variations","sizes","priceOptions","prices","priceRange","addons","addOns"].some(key=>{
  const value=v[key];return Array.isArray(value)?value.length>0:record(value)?Object.keys(value as Obj).length>0:typeof value==="string"?!!value.trim():value===true||typeof value==="number"&&value>0;
 });
}
function unavailable(v:Obj){
 return ["available","isAvailable","enabled","active","availability"].some(key=>v[key]===false)||["UNAVAILABLE","DISABLED","INACTIVE","PAUSED","SUSPENDED","DELETED","OUT_OF_STOCK"].includes(String(v.status||"").toUpperCase());
}
type Candidate={name:string;category:string;description:string;price:number;kind:"pizza"|"simple"|"crust"};
const empty=()=>({text:"",count:0,partial:false});

/** Accept the documented dataset contract, never a successful run status alone.
 * Prices are decimal BRL in this Actor. Names, images, hours and addresses are
 * not proof of verified merchant facts, and are not imported as store details.
 */
export function apifyIfoodMenu(dataset:unknown,url:string,textLimit?:number){
 const link=parseIfoodStoreLink(url);
 if(!link||!Array.isArray(dataset)||dataset.length!==1)return empty();
 const row=record(dataset[0]),returnedLink=row&&typeof row.url==="string"?parseIfoodStoreLink(row.url):null;
 if(!row||returnedLink?.url!==link.url||row.uuid!==undefined&&row.uuid!==link.storeId
  ||row.currency!=="BRL"||row.menuRequested!==true||row.menuExtractionStatus!=="captured"
  ||/blocked|failed|error|empty|metadata-only/i.test(String(row.scrapeStatus||""))||row.failureReason!=null
  ||!["catalog","catalog-search"].includes(String(row.menuSource))
  ||!["complete-relative-to-source-response","partial-limit-applied","partial-fallback"].includes(String(row.menuCompletenessStatus))
  ||typeof row.menuTruncated!=="boolean"||!Array.isArray(row.menu)||!row.menu.length||row.menu.length>500)return empty();
 const menu=row.menu;
 if(row.menuItemsReturned!==menu.length||row.menuItemCount!==menu.length
  ||!Number.isInteger(row.menuItemsDiscovered)||Number(row.menuItemsDiscovered)<menu.length)return empty();
 const budget=Number.isFinite(textLimit??60000)?Math.max(0,Math.min(Math.floor(textLimit??60000),60000-link.url.length-1)):0;
 const candidates=new Map<string,Candidate>(),blocked=new Set<string>();
 let partial=row.menuSource!=="catalog"||row.menuCompletenessStatus!=="complete-relative-to-source-response"||row.menuTruncated||Number(row.menuItemsDiscovered)>menu.length;
 // Scan the whole response before applying output limits: a later conflicting
 // duplicate must invalidate the earlier item even beyond the local cap.
 for(const raw of menu){
  const v=record(raw);if(!v){partial=true;continue;}
  const name=clean(v.name,100),category=clean(v.section,60),description=clean(v.details,600),price=cents(v.price);
  if(name.length<3||category.length<2){partial=true;continue;}
  const key=normalizeMenuText(category)+":"+normalizeMenuText(name);
  if(price===null||complex(v)||unavailable(v)||v.currency!==undefined&&v.currency!=="BRL"
   ||v.originalPrice!=null&&cents(v.originalPrice)!==price
   ||["promotionalPrice","discountedPrice","discountPrice"].some(k=>v[k]!=null)
   ||v.details!=null&&(typeof v.details!=="string"||v.details.trim()&&!description)
   ||/[{}<>*=|\[\]]|R\s*\$|\d+[.,]\d{2}/i.test(name+" "+category)){
   blocked.add(key);partial=true;continue;
  }
  const section=normalizeMenuText(category),kind=/borda/.test(section)?"crust":/pizza|sabor|salgada|doce/.test(section)&&!/sobremesa|bebida|combo|lanche|hamburg/.test(section)?"pizza":"simple";
  const candidate:Candidate={name,category,description,price,kind},old=candidates.get(key);
  if(old&&(old.price!==price||old.description!==description)){blocked.add(key);partial=true;}
  else candidates.set(key,candidate);
 }
 const entries:string[]=[];let count=0,length=0;
 for(const [key,candidate] of candidates){
  if(blocked.has(key))continue;
  const {name,category,description,price,kind}=candidate;
  const entry=[`Categoria: ${category} [${kind}]`,`${name} R$ ${(price/100).toFixed(2).replace(".",",")}`,...(description?["Descrição: "+description]:[])].join("\n");
  // The existing review reader must preserve this exact product and price.
  // Ambiguous names, UI labels and inferred size changes require a file instead.
  const reading=readMenuPages([{id:"apify",lines:entry.split("\n").map(text=>({text}))}]);
  const item=reading.items[0];
  if(reading.items.length!==1||!item||item.name!==name||item.category!==category||item.kind!==kind||item.price!==price||Object.values(item.sizes).some(v=>v!==null)||item.description!==description){partial=true;continue;}
  const size=entry.length+(entries.length?1:0);
  if(count>=apifyIfoodLimits.maxMenuItems||length+size>budget){partial=true;break;}
  entries.push(entry);length+=size;count++;
 }
 return {text:entries.join("\n"),count,partial};
}

export async function importApifyIfood(url:string,settings:ApifyIfoodSettings,options:{fetcher?:typeof fetch;signal?:AbortSignal}={}):Promise<IfoodImportResult>{
 const link=parseIfoodStoreLink(url);if(!link)throw Error("Cole o link completo da loja no iFood.");
 const fallback=():IfoodImportResult=>({status:"needs_content",url:link.url,text:"",count:0,message:"Não recebemos produtos verificáveis dessa loja. Continue com PDF, TXT/CSV ou fotos do cardápio; seus dados continuam guardados."});
 const endpoint=new URL(`https://api.apify.com/v2/actors/${apifyIfoodActor}/run-sync-get-dataset-items`);
 endpoint.search=new URLSearchParams({timeout:String(apifyIfoodLimits.timeoutSeconds),maxTotalChargeUsd:String(apifyIfoodLimits.maxTotalChargeUsd),restartOnError:"false",format:"json",clean:"true",limit:"2",offset:"0"}).toString();
 try{
  const timeout=AbortSignal.timeout(65000),signal=options.signal?AbortSignal.any([options.signal,timeout]):timeout;
  signal.throwIfAborted();
  const response=await (options.fetcher||fetch)(endpoint.toString(),{method:"POST",redirect:"manual",signal,headers:{Accept:"application/json","Content-Type":"application/json",Authorization:"Bearer "+settings.token},body:JSON.stringify({restaurantUrls:[link.url],maxRestaurants:1,includeMenu:true,includeReviews:false,menuMode:"limited",maxMenuItems:apifyIfoodLimits.maxMenuItems,downloadImages:false,proxyConfiguration:{useApifyProxy:false}})});
  if(!response.ok||!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type")||"")||Number(response.headers.get("content-length")||0)>apifyIfoodLimits.responseBytes){await response.body?.cancel();return fallback();}
  const reader=response.body?.getReader();if(!reader)return fallback();let size=0;const parts:Uint8Array[]=[];
  try{while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>apifyIfoodLimits.responseBytes){await reader.cancel();return fallback();}parts.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  const menu=apifyIfoodMenu(JSON.parse(new TextDecoder().decode(bytes)),link.url);
  return menu.count?{status:"imported",url:link.url,text:menu.text,count:menu.count,message:`${menu.partial?"Trouxemos uma parte do catálogo: ":""}${menu.count} produtos para conferir. Revise preços, tamanhos e complementos antes de adicionar.`}:fallback();
 }catch{
  // A disconnected sync call may still finish remotely. Never retry it here,
  // expose provider errors/tokens, or treat an unknown outcome as a free run.
  return fallback();
 }
}
