import {env} from "cloudflare:workers";
import {z} from "zod";
import {owner,errorResponse,HttpError} from "@/lib/server";
import {sameOrigin,readJson,privateHeaders,throttle} from "@/lib/http";
import {platformAdmin} from "@/lib/platform";
import {assertCsrf} from "@/lib/auth";
import {sha256,randomToken} from "@/lib/auth-policy";
export const dynamic="force-dynamic";
async function admin(){
 const user=await owner();
 if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");
 return user;
}
export async function GET(){try{
 await admin();
 const rows=await env.DB!.prepare("SELECT q.id,q.restaurant_id AS restaurantId,r.name AS restaurantName,q.store_url AS storeUrl,q.owner_note AS ownerNote,q.status,q.created_at AS requestedAt,q.updated_at AS updatedAt,q.received_at AS receivedAt,q.pairing_expires_at AS pairingExpiresAt FROM menu_import_assistance q JOIN restaurants r ON r.id=q.restaurant_id ORDER BY q.created_at DESC LIMIT 60").all();
 return Response.json({requests:rows.results||[]},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);assertCsrf(request);const user=await admin();
 await throttle("admin-menu-assistance:"+user.userId,50,3600);
 const {requestId}=z.object({requestId:z.string().uuid()}).parse(await readJson(request,2000));
 const existing=await env.DB!.prepare("SELECT id,status FROM menu_import_assistance WHERE id=?").bind(requestId).first<{id:string;status:string}>();
 if(!existing)throw new HttpError(404,"Solicitação não encontrada.");
 if(existing.status!=="requested"&&existing.status!=="paired")throw new HttpError(409,"Esta solicitação já foi finalizada ou cancelada.");
 const secret=randomToken(),hash=await sha256(secret),expiresAt=Math.floor(Date.now()/1000)+1800;
 const changed=await env.DB!.prepare("UPDATE menu_import_assistance SET status='paired',pairing_hash=?,pairing_expires_at=?,updated_at=? WHERE id=? AND status IN ('requested','paired')")
 .bind(hash,expiresAt,new Date().toISOString(),requestId).run();
 if(!changed.meta.changes)throw new HttpError(409,"A solicitação mudou. Recarregue a fila.");
 return Response.json({pairingCode:requestId+"."+secret,expiresAt,message:"Código válido por 30 minutos e utilizável uma única vez. Não compartilhe com o cliente."},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
