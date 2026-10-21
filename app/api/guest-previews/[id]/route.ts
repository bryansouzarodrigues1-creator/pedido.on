import {env} from "cloudflare:workers";
import {errorResponse,HttpError,privateHeaders} from "@/lib/http";
import {parseGuestPreview,previewTokenPattern} from "@/lib/guest-preview-policy";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params;if(!previewTokenPattern.test(id))throw new HttpError(404,"Prévia não encontrada.");
 const row=await env.DB!.prepare("SELECT object_key,expires_at FROM guest_menu_previews WHERE id = ?").bind(id).first<{object_key:string;expires_at:number}>();
 if(!row)throw new HttpError(404,"Prévia não encontrada.");if(row.expires_at<=Math.floor(Date.now()/1000))throw new HttpError(410,"Esta prévia expirou. Peça um novo link à pizzaria.");
 const object=await env.BUCKET!.get(row.object_key);if(!object)throw new HttpError(404,"Prévia não encontrada.");
 return Response.json({data:parseGuestPreview(await object.json()),expiresAt:new Date(row.expires_at*1000).toISOString()},{headers:{...privateHeaders,"X-Robots-Tag":"noindex, nofollow, noarchive"}});
}catch(e){return errorResponse(e);}}
