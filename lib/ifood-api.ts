import {HttpError,readBytes} from "./http-policy.ts";
import {parseIfoodStoreLink} from "./menu-source-links.ts";
import type {MenuStoreInfo} from "./menu-store-info.ts";
import {officialIfoodCatalog,officialIfoodStore,officialIfoodItemAvailable} from "./ifood-catalog.ts";

export type IfoodCredentials={clientId:string;clientSecret:string};
export type IfoodCode={userCode:string;verificationUrl:string;verifier:string;expiresIn:number};
export type IfoodAuthorizedImport={status:"imported"|"needs_content";url:string;text:string;count:number;message:string;store?:MenuStoreInfo;warnings:string[]};
const origin="https://merchant-api.ifood.com.br";
export const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
export const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const short=(value:unknown,max=200)=>typeof value==="string"&&value.length<=max?value:"";

/** Only this fixed API origin receives credentials. Responses and time are bounded. */
export async function ifoodApi(path:string,options:{form?:URLSearchParams;token?:string;signal?:AbortSignal;fetcher?:typeof fetch}={}):Promise<unknown>{
 if(!/^\/(?:authentication\/v1\.0\/oauth\/(?:userCode|token)|merchant\/v1\.0\/merchants\/[a-f\d-]{36}(?:\/opening-hours)?|catalog\/v2\.0\/merchants\/[a-f\d-]{36}\/(?:catalogs|categories|catalogs\/[a-zA-Z\d_-]{1,128}\/categories|categories\/[a-zA-Z\d_-]{1,128}\/items|items\/[a-zA-Z\d_-]{1,128}\/flat))(?:\?include_items=true)?$/.test(path))throw new HttpError(400,"Operação iFood não permitida.");
 let response:Response;
 try{response=await (options.fetcher||fetch)(origin+path,{method:options.form?"POST":"GET",headers:{Accept:"application/json",...(options.form?{"Content-Type":"application/x-www-form-urlencoded"}:{}),...(options.token?{Authorization:"Bearer "+options.token}:{})},body:options.form?.toString(),redirect:"manual",signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});}
 catch{throw new HttpError(503,"O iFood não respondeu a tempo. Sua ideia continua guardada.");}
 if(!response.ok){await response.body?.cancel().catch(()=>{});
  if(response.status===429)throw new HttpError(429,"O iFood pediu uma pausa. Aguarde alguns minutos.");
  if(response.status===401)throw new HttpError(401,"Não foi possível validar a autorização do iFood. Confira o código ou inicie uma nova conexão.");
  if(response.status===403)throw new HttpError(403,"O iFood não autorizou a leitura desta loja. Confira a loja e as permissões de Cardápio e Loja.");
  if(response.status===404)throw new HttpError(404,"A loja ou o catálogo não está disponível para esta conexão iFood.");
  throw new HttpError(503,"Não foi possível concluir a leitura no iFood. Tente novamente mais tarde.");
 }
 if(!/^application\/(?:json|[\w.+-]+\+json)(?:\s*;|$)/i.test(response.headers.get("content-type")||"")){await response.body?.cancel().catch(()=>{});throw new HttpError(502,"O iFood retornou uma resposta inesperada.");}
 try{return JSON.parse(new TextDecoder().decode(await readBytes(response,2_000_000)));}
 catch{throw new HttpError(502,"O iFood retornou dados grandes ou inválidos para esta leitura.");}
}
export async function requestIfoodCode(credentials:IfoodCredentials,fetcher?:typeof fetch):Promise<IfoodCode>{
 const value=record(await ifoodApi("/authentication/v1.0/oauth/userCode",{form:new URLSearchParams({clientId:credentials.clientId}),fetcher}));
 const userCode=short(value.userCode,32),verifier=short(value.authorizationCodeVerifier,512),seconds=Number(value.expiresIn);
 let url:URL;try{url=new URL(short(value.verificationUrlComplete,500));}catch{throw new HttpError(502,"O iFood não retornou um endereço de autorização válido.");}
 if(!/^[A-Z\d-]{4,32}$/i.test(userCode)||!verifier||url.origin!=="https://portal.ifood.com.br"||url.username||url.password||url.pathname!=="/apps/code"||url.hash||url.searchParams.get("c")!==userCode||!Number.isInteger(seconds)||seconds<30||seconds>3600)throw new HttpError(502,"O iFood não retornou uma autorização válida.");
 return {userCode,verificationUrl:url.toString(),verifier,expiresIn:Math.min(seconds,600)};
}
export async function exchangeIfoodCode(credentials:IfoodCredentials,code:string,verifier:string,fetcher?:typeof fetch){
 const value=record(await ifoodApi("/authentication/v1.0/oauth/token",{form:new URLSearchParams({grantType:"authorization_code",clientId:credentials.clientId,clientSecret:credentials.clientSecret,authorizationCode:code,authorizationCodeVerifier:verifier}),fetcher}));
 const token=short(value.accessToken,8000),seconds=Number(value.expiresIn);
 if(!/^[a-zA-Z\d._~+\/-]+={0,2}$/.test(token)||!Number.isInteger(seconds)||seconds<45||value.type!==undefined&&String(value.type).toLowerCase()!=="bearer")throw new HttpError(502,"O iFood não retornou acesso válido para a leitura.");
 return token; // Import once; access/refresh tokens never reach browser or storage.
}
export async function importAuthorizedIfood(url:string,token:string,fetcher?:typeof fetch):Promise<IfoodAuthorizedImport>{
 const link=parseIfoodStoreLink(url);if(!link)throw new HttpError(400,"Cole o link completo da loja no iFood.");
 const signal=AbortSignal.timeout(35000),call=(path:string)=>ifoodApi(path,{token,signal,fetcher}),warnings:string[]=[];
 const merchant=record(await call(`/merchant/v1.0/merchants/${link.storeId}`));
 if(merchant.id!==link.storeId)throw new HttpError(403,"A autorização retornou outra loja. Confira o link antes de continuar.");
 let hours:unknown;try{hours=await call(`/merchant/v1.0/merchants/${link.storeId}/opening-hours`);}catch{warnings.push("Os horários não ficaram disponíveis nesta leitura. Você pode preenchê-los depois.");}
 const store=officialIfoodStore(merchant,hours);
 let catalogs:Record<string,unknown>[],categories:unknown[];
 try{
  catalogs=list(await call(`/catalog/v2.0/merchants/${link.storeId}/catalogs`)).map(record);
  const active=catalogs.filter(v=>v.status==="AVAILABLE"&&list(v.context).includes("DEFAULT"));
  if(active.length!==1)throw new HttpError(422,"Não foi possível identificar um único catálogo de delivery ativo.");
  const id=short(active[0].catalogId,128);if(!/^[a-zA-Z\d_-]+$/.test(id))throw new HttpError(502,"O catálogo retornou um identificador inválido.");
  const root=`/catalog/v2.0/merchants/${link.storeId}`;
  const collection=(value:unknown,key:string)=>{if(Array.isArray(value))return value;const v=record(value);if(Array.isArray(v[key]))return v[key] as unknown[];throw new HttpError(502,"O catálogo retornou um formato não reconhecido. Os dados anteriores continuam guardados.");};
  try{categories=collection(await call(`${root}/catalogs/${id}/categories?include_items=true`),"categories");}
  catch(e){
   if(!(e instanceof HttpError)||e.status!==404)throw e;
   // Both routes appear in the official documentation. An unscoped response
   // may only supply categories from this catalog or a single-catalog merchant.
   const all=collection(await call(`${root}/categories?include_items=true`),"categories"),single=catalogs.length===1;
   if(!single&&all.some(v=>record(v).catalogId===undefined))throw new HttpError(422,"O iFood retornou vários catálogos sem identificar as categorias de delivery. Confira por arquivo.");
   categories=all.filter(v=>single||record(v).catalogId===id);
  }
  categories=categories.filter(v=>record(v).catalogId===undefined||record(v).catalogId===id);
  if(categories.length>30)throw new HttpError(422,"O catálogo tem muitas categorias. Importe uma parte por arquivo para conferir todos os itens.");
  for(let i=0;i<categories.length;i++){
   const category=record(categories[i]);if(!officialIfoodItemAvailable(category)||Array.isArray(category.items))continue;
   const categoryId=short(category.id,128);if(!/^[a-zA-Z\d_-]+$/.test(categoryId))throw new HttpError(502,"Uma categoria retornou um identificador inválido.");
   categories[i]={...category,items:collection(await call(`${root}/categories/${categoryId}/items`),"items")};
  }
  const missing=categories.flatMap((v,index)=>list(record(v).items).flatMap((raw,position)=>{
   const graph=record(raw),item=record(graph.item||graph);return officialIfoodItemAvailable(categories[index])&&officialIfoodItemAvailable(item)&&!Array.isArray(graph.products)?[{index,position,id:short(item.id,128)}]:[];
  }));
  if(missing.length>200)throw new HttpError(422,"Há muitos produtos para detalhar de uma vez. Traga uma parte por arquivo.");
  // Four concurrent reads stay within the Workers connection limit.
  for(let start=0;start<missing.length;start+=4)await Promise.all(missing.slice(start,start+4).map(async value=>{
   if(!/^[a-zA-Z\d_-]+$/.test(value.id))throw new HttpError(502,"Um produto retornou um identificador inválido.");
   const graph=record(await call(`${root}/items/${value.id}/flat`)),item=record(graph.item||graph);
   if(item.id!==value.id)throw new HttpError(502,"O iFood retornou detalhes de outro produto.");
   (record(categories[value.index]).items as unknown[])[value.position]=graph;
  }));
 }catch(e){warnings.push(e instanceof HttpError?e.message:"Não foi possível ler o catálogo nesta conexão.");return {status:"needs_content",url:link.url,text:"",count:0,message:"Dados da loja recebidos. O catálogo ainda precisa ser fornecido.",store,warnings};}
 const catalog=officialIfoodCatalog(categories);warnings.push(...catalog.warnings);
 return {status:catalog.count?"imported":"needs_content",url:link.url,text:catalog.text,count:catalog.count,message:catalog.count?`${catalog.count} produtos recebidos da sua conta iFood. Confira antes de usar.`:"Dados da loja recebidos. Confira os avisos para trazer os produtos.",store,warnings:[...new Set(warnings)].slice(0,20)};
}
