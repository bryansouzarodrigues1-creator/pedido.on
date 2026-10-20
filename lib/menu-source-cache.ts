import type {IfoodImportResult} from "./ifood-import.ts";
import {apifyIfoodLimits} from "./apify-ifood.ts";
import {sha256} from "./auth-policy.ts";
import {parseIfoodStoreLink} from "./menu-source-links.ts";

type SourceCache={match(request:Request):Promise<Response|undefined>;put(request:Request,response:Response):Promise<void>};
const cache=():SourceCache|undefined=>typeof caches==="undefined"?undefined:(caches as CacheStorage&{default?:SourceCache}).default;
async function key(origin:string,url:string){
 const link=parseIfoodStoreLink(url);if(!link)throw Error("Invalid cache source");
 return new Request(new URL(`/__menu-source-cache/v1/${link.storeId}/${await sha256(link.url)}`,origin));
}
// Cache only normalized public catalogue text. No credentials, full provider
// response, owner drafts, sessions, images, reviews or merchant personal data.
export async function cachedMenuSource(origin:string,url:string):Promise<IfoodImportResult|null>{
 try{
  const response=await cache()?.match(await key(origin,url));if(!response||Number(response.headers.get("content-length")||0)>250000)return null;
  const value=await response.json() as Record<string,unknown>,link=parseIfoodStoreLink(url);
  if(!link||value.url!==link.url||typeof value.expiresAt!=="number"||value.expiresAt<=Date.now()||value.expiresAt>Date.now()+apifyIfoodLimits.cacheSeconds*1000
   ||typeof value.text!=="string"||!value.text||value.text.length+link.url.length+1>60000||!Number.isInteger(value.count)||Number(value.count)<1||Number(value.count)>200
   ||typeof value.message!=="string"||value.message.length>500)return null;
  return {status:"imported",url:link.url,text:value.text,count:Number(value.count),message:value.message};
 }catch{return null;}
}
export async function cacheMenuSource(origin:string,result:IfoodImportResult):Promise<void>{
 if(result.status!=="imported"||result.count<1)return;
 try{await cache()?.put(await key(origin,result.url),Response.json({url:result.url,text:result.text,count:result.count,message:result.message,expiresAt:Date.now()+apifyIfoodLimits.cacheSeconds*1000},{headers:{"Cache-Control":`public, max-age=${apifyIfoodLimits.cacheSeconds}`}}));}catch{/* Cache loss must not lose a completed reading. */}
}
