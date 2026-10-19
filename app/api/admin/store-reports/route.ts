import {env} from "cloudflare:workers";
import {sameOrigin,readJson,privateHeaders,errorResponse,HttpError} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {safetyAdministrator} from "@/lib/store-safety-admin";
import {reportDecisionSchema} from "@/lib/store-verification-policy";
export const dynamic="force-dynamic";
export async function PATCH(request:Request){try{
 sameOrigin(request);assertCsrf(request);const user=await safetyAdministrator(),input=reportDecisionSchema.parse(await readJson(request,3000));
 const result=await env.DB!.prepare("UPDATE store_reports SET status=?,resolution=?,reviewed_by=?,reviewed_at=?,version=version+1 WHERE id=? AND version=? AND status='open'").bind(input.status,input.resolution,user.userId,new Date().toISOString(),input.id,input.expectedVersion).run();
 if(!result.meta.changes)throw new HttpError(409,"A denúncia já foi analisada ou mudou. Atualize para conferir.");
 return Response.json({saved:true},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
