import {env} from "cloudflare:workers";
import {sameOrigin,readJson,errorResponse,privateHeaders,throttle,HttpError} from "@/lib/http";
import {assertCsrf,csrfValue} from "@/lib/csrf";
import {sha256} from "@/lib/auth-policy";
import {parseGuestPreview,guestPreviewLifetime} from "@/lib/guest-preview-policy";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{
 sameOrigin(request);assertCsrf(request);if(!env.DB||!env.BUCKET)throw new HttpError(503,"O compartilhamento está temporariamente indisponível.");
 await throttle("guest-preview-ip:"+await sha256(request.headers.get("cf-connecting-ip")||"unknown"),60,3600);
 await throttle("guest-preview-visitor:"+await sha256(csrfValue(request)),10,3600);
 let data;try{data=parseGuestPreview(await readJson(request,6000000));}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,e instanceof Error?e.message:"Confira o cardápio antes de compartilhar.");}
 const id=crypto.randomUUID().replace(/-/g,""),key="guest-previews/"+id+".json",now=Math.floor(Date.now()/1000),expires=now+guestPreviewLifetime;
 await env.BUCKET.put(key,JSON.stringify(data),{httpMetadata:{contentType:"application/json"}});
 try{await env.DB.prepare("INSERT INTO guest_menu_previews(id,object_key,created_at,expires_at) VALUES(?,?,?,?)").bind(id,key,now,expires).run();}catch(e){await env.BUCKET.delete(key);throw e;}
 // Bounded cleanup of expired unlisted previews. Existing restaurants are untouched.
 const expired=await env.DB.prepare("SELECT id,object_key FROM guest_menu_previews WHERE expires_at < ? LIMIT 10").bind(now).all<{id:string;object_key:string}>();
 for(const old of expired.results){try{await env.BUCKET.delete(old.object_key);await env.DB.prepare("DELETE FROM guest_menu_previews WHERE id = ? AND expires_at < ?").bind(old.id,now).run();}catch{/* cleanup can be retried without invalidating the new preview */}}
 return Response.json({id,path:"/v/"+id,expiresAt:new Date(expires*1000).toISOString()},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
