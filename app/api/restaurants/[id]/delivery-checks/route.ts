import {and,eq,asc,gt} from "drizzle-orm";
import {getDb} from "@/db";
import {deliveryChecks} from "@/db/schema";
import {ownedRestaurant,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {deliveryApprovalEnabled} from "@/lib/delivery-config";
import {deliveryDecision} from "@/lib/delivery-policy";
import {assertCsrf} from "@/lib/auth";
import {readJson,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{
 const {id}=await params;await ownedRestaurant(id);
 if(!deliveryApprovalEnabled())return Response.json({enabled:false,requests:[]},{headers:privateHeaders});
 const now=Math.floor(Date.now()/1000);
 const requests=await getDb().select({
 id:deliveryChecks.id,phone:deliveryChecks.phone,address:deliveryChecks.address,neighborhood:deliveryChecks.neighborhood,deliveryFee:deliveryChecks.deliveryFee,
 latitude:deliveryChecks.latitude,longitude:deliveryChecks.longitude,
 status:deliveryChecks.status,version:deliveryChecks.version,createdAt:deliveryChecks.createdAt,expiresAt:deliveryChecks.expiresAt,
 }).from(deliveryChecks).where(and(eq(deliveryChecks.restaurantId,id),gt(deliveryChecks.expiresAt,now),eq(deliveryChecks.status,"pending"))).orderBy(asc(deliveryChecks.createdAt)).limit(40);
 return Response.json({enabled:true,requests},{headers:privateHeaders});
 }catch(error){return errorResponse(error);}
}
export async function PATCH(request:Request,{params}:Context){try{
 sameOrigin(request);assertCsrf(request);const {id}=await params;const store=await ownedRestaurant(id);
 if(!deliveryApprovalEnabled())throw new HttpError(503,"Consultas de entrega indisponíveis.");
 const input=deliveryDecision.parse(await readJson(request,2000));
 const stamp=new Date().toISOString(),now=Math.floor(Date.now()/1000),status=input.action==="approve"?"approved":"rejected";
 const fallback=JSON.parse(store.publishedData||store.data) as {deliveryFee:number};
 const updated=await getDb().update(deliveryChecks).set({status,...(status==="approved"?{deliveryFee:input.deliveryFee??fallback.deliveryFee}:{}),version:input.version+1,reviewedAt:stamp})
 .where(and(eq(deliveryChecks.id,input.id),eq(deliveryChecks.restaurantId,id),eq(deliveryChecks.version,input.version),eq(deliveryChecks.status,"pending"),gt(deliveryChecks.expiresAt,now))).returning().get();
 if(!updated)throw new HttpError(409,"Esta solicitação mudou, expirou ou já foi respondida. Atualize o painel.");
 return Response.json({request:{id:updated.id,status:updated.status,version:updated.version}},{headers:privateHeaders});
 }catch(error){return errorResponse(error);}
}
