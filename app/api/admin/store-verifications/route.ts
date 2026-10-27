import {env} from "cloudflare:workers";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {eq} from "drizzle-orm";
import {sameOrigin,readJson,privateHeaders,errorResponse,HttpError,throttle} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {safetyAdministrator,storeSafetyQueue} from "@/lib/store-safety-admin";
import {verificationDecisionSchema} from "@/lib/store-verification-policy";
import {storeVerification} from "@/lib/store-verification";
import {verificationIdentity} from "@/lib/store-verification-policy";
import {restaurantSchema} from "@/lib/domain";
import {z} from "zod";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{await safetyAdministrator();const id=new URL(request.url).searchParams.get("restaurantId");if(id){const row=await getDb().select().from(restaurants).where(eq(restaurants.id,id)).get();if(!row)throw new HttpError(404,"Pizzaria não encontrada.");return Response.json({store:{restaurantId:row.id,slug:row.slug,published:row.published,identity:verificationIdentity(restaurantSchema.parse(JSON.parse(row.publishedData||row.data))),...await storeVerification(row)}},{headers:privateHeaders});}return Response.json(await storeSafetyQueue(),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
/** An administrator can initiate a review from the customer card; approval remains a separate, versioned decision. */
export async function POST(request:Request){try{
 sameOrigin(request);assertCsrf(request);const user=await safetyAdministrator();await throttle("admin-store-review:"+user.userId,60,3600);
 const input=z.object({restaurantId:z.string().min(1).max(100),expectedVersion:z.number().int().min(0),identityHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(await readJson(request,1000));
 const row=await getDb().select().from(restaurants).where(eq(restaurants.id,input.restaurantId)).get();if(!row)throw new HttpError(404,"Pizzaria não encontrada.");if(!row.published||!row.publishedData)throw new HttpError(409,"Publique o cardápio antes de verificar a loja.");
 const state=await storeVerification(row);if(state.version!==input.expectedVersion||state.identityHash!==input.identityHash)throw new HttpError(409,"Os dados mudaram. Confira novamente antes de verificar.");
 if(state.status==="approved"||state.status==="pending")return Response.json({verification:state},{headers:privateHeaders});
 const stamp=new Date().toISOString(),identity=JSON.stringify(verificationIdentity(restaurantSchema.parse(JSON.parse(row.publishedData))));
 const result=await env.DB!.batch([
  env.DB!.prepare(`INSERT INTO store_verifications(restaurant_id,status,identity_hash,identity_json,request_note,requested_at,version,updated_at) SELECT ?,'pending',?,?,'Revisão iniciada pela administração',?,1,? WHERE EXISTS(SELECT 1 FROM restaurants WHERE id=? AND published=1 AND published_data IS ?) ON CONFLICT(restaurant_id) DO UPDATE SET status='pending',identity_hash=excluded.identity_hash,identity_json=excluded.identity_json,request_note=excluded.request_note,requested_at=excluded.requested_at,reason='',reviewed_at=NULL,reviewed_by=NULL,version=store_verifications.version+1,updated_at=excluded.updated_at WHERE store_verifications.version=?`).bind(row.id,state.identityHash,identity,stamp,stamp,row.id,row.publishedData,state.version),
  env.DB!.prepare("INSERT INTO store_verification_events(id,restaurant_id,actor_id,action,reason,identity_hash,version,created_at) SELECT ?,restaurant_id,?,'pending','Revisão iniciada pela administração',identity_hash,version,? FROM store_verifications WHERE restaurant_id=? AND version=? AND changes()=1").bind(crypto.randomUUID(),user.userId,stamp,row.id,state.version+1),
 ]);if(!result[0].meta.changes)throw new HttpError(409,"Outra análise começou. Atualize e confira.");return Response.json({verification:await storeVerification(row)},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
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
