import {env} from "cloudflare:workers";
import {z} from "zod";
import {owner,errorResponse,HttpError} from "@/lib/server";
import {sameOrigin,readJson,privateHeaders,throttle} from "@/lib/http";
import {platformAdmin} from "@/lib/platform";
import {assertCsrf} from "@/lib/auth";
import {runnerResultSchema,runnerCaptureForAssistance} from "@/lib/menu-runner-result";
import {assistedCapture,assistStats} from "@/lib/menu-assistance-policy";
import {queueOwnerNotice} from "@/lib/push";
import {menuProgressNotice} from "@/lib/account-notices";
export const dynamic="force-dynamic";

export async function POST(request:Request){try{
 sameOrigin(request);assertCsrf(request);const user=await owner();
 if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");
 await throttle("admin-runner-result:"+user.userId,30,3600);
 const input=z.object({requestId:z.string().uuid(),reviewed:z.literal(true),result:runnerResultSchema}).strict().parse(await readJson(request,700000));
 const row=await env.DB!.prepare("SELECT store_url AS storeUrl,restaurant_id AS restaurantId,owner_id AS ownerId,notify_when_ready AS notifyWhenReady,status FROM menu_import_assistance WHERE id=?")
  .bind(input.requestId).first<{storeUrl:string;restaurantId:string;ownerId:string;notifyWhenReady:number;status:string}>();
 if(!row)throw new HttpError(404,"Solicitação não encontrada.");
 if(!["requested","paired"].includes(row.status))throw new HttpError(409,"Esta solicitação já foi recebida ou cancelada. Atualize a fila.");
 let incoming:ReturnType<typeof runnerCaptureForAssistance>;
 try{incoming=runnerCaptureForAssistance(input.result,row.storeUrl);}catch(e){throw new HttpError(409,e instanceof Error?e.message:"Confira a origem da captura.");}
 const raw=JSON.stringify(incoming),stamp=new Date().toISOString();
 // One write arbitrates against cancellation and extension delivery. Private
 // photos may only come from this request's previously completed uploads.
 const updated=await env.DB!.prepare(`UPDATE menu_import_assistance SET status='received',
  capture_json=json_set(?, '$.items', json((SELECT json_group_array(json_set(item.value,'$.imageMediaUrl',
   (SELECT photo.media_url FROM menu_import_assistance_photos photo WHERE photo.request_id=?
    AND photo.item_id=json_extract(item.value,'$.id') AND photo.source_url=json_extract(item.value,'$.imageUrl'))))
   FROM json_each(?, '$.items') item))),
  pairing_hash=NULL,pairing_expires_at=NULL,received_at=?,updated_at=?
  WHERE id=? AND store_url=? AND status IN ('requested','paired') RETURNING capture_json AS captureJson`)
  .bind(raw,input.requestId,raw,stamp,stamp,input.requestId,row.storeUrl).first<{captureJson:string}>();
 if(!updated)throw new HttpError(409,"A solicitação mudou durante o envio. Atualize a fila.");
 const capture=assistedCapture.parse(JSON.parse(updated.captureJson));
 await menuProgressNotice(row.ownerId,input.requestId,row.restaurantId,"received");
 if(row.notifyWhenReady===1)queueOwnerNotice(row.ownerId,"menu-ready:"+input.requestId,"menu",row.restaurantId);
 return Response.json({received:true,stats:assistStats(capture),message:"Resultado entregue para conferência do dono. Nenhum produto foi publicado."},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
