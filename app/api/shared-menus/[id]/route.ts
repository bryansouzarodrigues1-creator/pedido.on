import {env} from "cloudflare:workers";
import {errorResponse,HttpError,privateHeaders} from "@/lib/http";
import {previewTokenPattern} from "@/lib/guest-preview-policy";
import {findSharedMenu,sharedMenuState,shareableMenu} from "@/lib/admin-shared-menus";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params;if(!previewTokenPattern.test(id))throw new HttpError(404,"Cardápio não encontrado.");const row=await findSharedMenu(id);if(!row)throw new HttpError(404,"Cardápio não encontrado.");
 if(sharedMenuState(row)!=="active")throw new HttpError(410,"Este link está indisponível ou expirou. Peça uma nova prévia a quem enviou.");
 const object=await env.BUCKET!.get(row.object_key);if(!object)throw new HttpError(404,"Cardápio não encontrado.");
 return Response.json({data:shareableMenu(await object.json()),expiresAt:new Date(row.expires_at*1000).toISOString()},{headers:{...privateHeaders,"X-Robots-Tag":"noindex, nofollow, noarchive"}});
}catch(e){return errorResponse(e);}}
