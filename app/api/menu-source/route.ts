import {z} from "zod";
import {env} from "cloudflare:workers";
import {sameOrigin,readJson,throttle,errorResponse} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {parseIfoodStoreLink} from "@/lib/menu-source-links";
import {importIfoodLink} from "@/lib/ifood-import";
import {apifyIfoodSettings,importApifyIfood} from "@/lib/apify-ifood";
import {cachedMenuSource,cacheMenuSource} from "@/lib/menu-source-cache";
export async function POST(request:Request){try{
 sameOrigin(request);const {url}=z.object({url:z.string().max(2048).refine(v=>!!parseIfoodStoreLink(v),"Cole o link completo da loja no iFood.")}).strict().parse(await readJson(request,4096));
 await throttle("menu-source-ip:"+await sha256(request.headers.get("cf-connecting-ip")||"unknown"),6,600);
 await throttle("menu-source-global",120,3600);
 const settings=apifyIfoodSettings(env as unknown as Record<string,unknown>),link=parseIfoodStoreLink(url)!,origin=new URL(request.url).origin;
 const answer=(value:unknown)=>Response.json(value,{headers:{"Cache-Control":"private, no-store"}});
 if(settings){const cached=await cachedMenuSource(origin,link.url);if(cached)return answer(cached);}
 const result=await importIfoodLink(link.url);
 if(!settings||result.status==="imported"||request.signal.aborted)return answer(result);
 try{
  // Fixed D1 buckets: no paid retry on refresh, double-click, provider failure
  // or uncertain sync outcome. These reservations are intentionally not refunded.
  await throttle("menu-source-apify-store:"+link.storeId,1,600);
  await throttle("menu-source-apify-day",5,86400);
  await throttle("menu-source-apify-period",20,2592000);
 }catch{return answer({...result,message:"A consulta automática está indisponível neste momento. Continue com PDF, TXT/CSV ou fotos; seus dados continuam guardados."});}
 const collected=await importApifyIfood(link.url,settings,{signal:request.signal});
 if(collected.status==="imported")await cacheMenuSource(origin,collected);
 return answer({...collected,...(result.store?{store:result.store}:{})});
 }catch(error){return errorResponse(error);}}
