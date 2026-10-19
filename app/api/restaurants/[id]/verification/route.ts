import {env} from "cloudflare:workers";
import {ownedRestaurant,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {assertCsrf} from "@/lib/auth";
import {readJson,privateHeaders,throttle} from "@/lib/http";
import {verificationRequestSchema,verificationIdentity} from "@/lib/store-verification-policy";
import {storeVerification} from "@/lib/store-verification";
import type {RestaurantData} from "@/lib/domain";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const {id}=await params,row=await ownedRestaurant(id);return Response.json({verification:await storeVerification(row)},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{
 sameOrigin(request);assertCsrf(request);const {id}=await params,row=await ownedRestaurant(id);
 const input=verificationRequestSchema.parse(await readJson(request,2000)),state=await storeVerification(row);
 if(!row.published||!row.publishedData)throw new HttpError(400,"Publique seu cardápio antes de solicitar a verificação. Ele já pode receber carrinhos pelo WhatsApp.");
 if(state.version!==input.expectedVersion||row.liveRevision!==input.liveRevision)throw new HttpError(409,"Os dados da loja mudaram. Atualize antes de solicitar a verificação.");
 if(state.status==="approved"||state.status==="pending")return Response.json({verification:state},{headers:privateHeaders});
 await throttle("store-verification:"+row.ownerId,6,3600);
 const stamp=new Date().toISOString(),snapshot=JSON.stringify(verificationIdentity(JSON.parse(row.publishedData) as RestaurantData));
 const results=await env.DB!.batch([
  env.DB!.prepare(`INSERT INTO store_verifications(restaurant_id,status,identity_hash,identity_json,request_note,requested_at,reason,version,updated_at)
   SELECT id,'pending',?,?,?,?, '',1,? FROM restaurants WHERE id=? AND published=1 AND published_data=?
   ON CONFLICT(restaurant_id) DO UPDATE SET status='pending',identity_hash=excluded.identity_hash,identity_json=excluded.identity_json,request_note=excluded.request_note,requested_at=excluded.requested_at,reason='',reviewed_at=NULL,reviewed_by=NULL,version=store_verifications.version+1,updated_at=excluded.updated_at WHERE store_verifications.version=?`).bind(state.identityHash,snapshot,input.note,stamp,stamp,id,row.publishedData,input.expectedVersion),
  env.DB!.prepare("INSERT INTO store_verification_events(id,restaurant_id,actor_id,action,reason,identity_hash,version,created_at) SELECT ?,restaurant_id,?,'requested',request_note,identity_hash,version,? FROM store_verifications WHERE restaurant_id=? AND version=? AND changes()=1").bind(crypto.randomUUID(),row.ownerId,stamp,id,input.expectedVersion+1),
 ]);
 if(!results[0].meta.changes)throw new HttpError(409,"A loja mudou durante a solicitação. Atualize e confira.");
 return Response.json({verification:await storeVerification(row)},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
