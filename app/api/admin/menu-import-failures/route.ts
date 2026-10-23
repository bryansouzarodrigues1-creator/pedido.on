import {env} from "cloudflare:workers";
import {z} from "zod";
import {owner,errorResponse,HttpError} from "@/lib/server";
import {sameOrigin,readJson,privateHeaders,throttle} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {failureForAssistance} from "@/lib/menu-capture-failure";
export const dynamic="force-dynamic";

export async function POST(request:Request){try{
 sameOrigin(request);assertCsrf(request);
 const user=await owner();
 if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");
 await throttle("admin-capture-failure:"+user.userId,30,3600);
 const input=z.object({requestId:z.string().uuid(),reviewed:z.literal(true),report:z.unknown()}).strict().parse(await readJson(request,8000));
 const row=await env.DB!.prepare("SELECT store_url AS storeUrl,status FROM menu_import_assistance WHERE id=?")
  .bind(input.requestId).first<{storeUrl:string;status:string}>();
 if(!row)throw new HttpError(404,"Solicitação não encontrada.");
 if(!["requested","paired"].includes(row.status))throw new HttpError(409,"Esta solicitação já foi finalizada ou cancelada.");
 let failure:ReturnType<typeof failureForAssistance>;
 try{failure=failureForAssistance(input.report,row.storeUrl);}
 catch(e){throw new HttpError(409,e instanceof Error?e.message:"Relatório inválido ou de outra loja.");}
 // This is a failure report, never an assisted menu. Invalidate pairing in the
 // same conditional write; no draft, publication or payment is touched.
 const updated=await env.DB!.prepare("UPDATE menu_import_assistance SET status='blocked',capture_json=?,pairing_hash=NULL,pairing_expires_at=NULL,updated_at=? WHERE id=? AND store_url=? AND status IN ('requested','paired')")
  .bind(JSON.stringify(failure),new Date().toISOString(),input.requestId,row.storeUrl).run();
 if(!updated.meta.changes)throw new HttpError(409,"A solicitação mudou durante o envio. Atualize a fila.");
 return Response.json({reported:true,message:"O proprietário verá o bloqueio e poderá continuar pelo PDF, fotos ou suporte. Nenhum produto foi importado."},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
