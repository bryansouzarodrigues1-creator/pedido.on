import {env} from "cloudflare:workers";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {eq} from "drizzle-orm";
import {sameOrigin,readJson,privateHeaders,errorResponse,HttpError,throttle} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {safetyAdministrator,storeSafetyQueue} from "@/lib/store-safety-admin";
import {verificationDecisionSchema} from "@/lib/store-verification-policy";
import {storeVerification} from "@/lib/store-verification";
export const dynamic="force-dynamic";
export async function GET(){try{await safetyAdministrator();return Response.json(await storeSafetyQueue(),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function PATCH(request:Request){try{
 sameOrigin(request);assertCsrf(request);const user=await safetyAdministrator();await throttle("admin-store-verification:"+user.userId,60,3600);
 const input=verificationDecisionSchema.parse(await readJson(request,3000)),row=await getDb().select().from(restaurants).where(eq(restaurants.id,input.restaurantId)).get();
 if(!row)throw new HttpError(404,"Pizzaria não encontrada.");
 const state=await storeVerification(row);
 if(state.version!==input.expectedVersion||state.identityHash!==input.identityHash)throw new HttpError(409,"Os dados ou a análise mudaram. Atualize antes de decidir.");
 if(!state.version)throw new HttpError(400,"A loja precisa solicitar a verificação primeiro.");
 if(input.decision==="approved"&&(!row.published||!row.publishedData||state.status!=="pending"))throw new HttpError(409,"A aprovação exige uma solicitação atual com os mesmos dados publicados.");
 const stamp=new Date().toISOString();
 const results=await env.DB!.batch([
  env.DB!.prepare(`UPDATE store_verifications SET status=?,reviewed_at=?,reviewed_by=?,reason=?,version=version+1,updated_at=? WHERE restaurant_id=? AND version=? AND EXISTS (SELECT 1 FROM restaurants WHERE id=? AND published_data IS ?)`)
   .bind(input.decision,stamp,user.userId,input.reason,stamp,row.id,input.expectedVersion,row.id,row.publishedData),
  env.DB!.prepare("INSERT INTO store_verification_events(id,restaurant_id,actor_id,action,reason,identity_hash,version,created_at) SELECT ?,restaurant_id,?,status,reason,identity_hash,version,? FROM store_verifications WHERE restaurant_id=? AND version=? AND changes()=1").bind(crypto.randomUUID(),user.userId,stamp,row.id,input.expectedVersion+1),
 ]);
 if(!results[0].meta.changes)throw new HttpError(409,"Outra alteração ocorreu durante a análise. Atualize antes de decidir.");
 return Response.json({verification:await storeVerification(row)},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
