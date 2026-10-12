import {env} from "cloudflare:workers";
import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants,deliveryChecks} from "@/db/schema";
import {canServeMenu} from "@/lib/billing";
import {deliveryApprovalEnabled} from "@/lib/delivery-config";
import {deliveryCheckRequest,DELIVERY_SECONDS,normalizedDeliveryPhone} from "@/lib/delivery-policy";
import {sameOrigin,readJson,privateHeaders,throttle,errorResponse,HttpError} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {queueOwnerNotice} from "@/lib/push";
export const dynamic="force-dynamic";
type Context={params:Promise<{slug:string}>};
async function published(slug:string){
 const row=await getDb().select().from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();
 if(!row?.publishedData||!await canServeMenu(row.ownerId,row.id))throw new HttpError(404,"Pizzaria indisponível.");
 if(!deliveryApprovalEnabled())throw new HttpError(503,"A consulta de entrega ainda não está ativada.");
 const data=JSON.parse(row.publishedData) as {deliveryEnabled?:boolean};
 if(!data.deliveryEnabled)throw new HttpError(400,"Esta pizzaria não realiza entregas.");
 return row;
}
export async function POST(request:Request,{params}:Context){try{
 sameOrigin(request);
 const {slug}=await params,row=await published(slug);
 const input=deliveryCheckRequest.parse(await readJson(request,4000));
 const tokenHash=await sha256(input.token);
 const previous=await getDb().select().from(deliveryChecks).where(and(eq(deliveryChecks.restaurantId,row.id),eq(deliveryChecks.requestId,input.requestId))).get();
 if(previous){
  if(previous.tokenHash!==tokenHash||previous.phone!==normalizedDeliveryPhone(input.phone)||previous.address!==input.address)throw new HttpError(409,"Esta consulta já foi utilizada. Inicie outra.");
  return Response.json({id:previous.id,status:previous.expiresAt>Date.now()/1000?previous.status:"expired",expiresAt:previous.expiresAt},{headers:privateHeaders});
 }
 const seal=(env as typeof env&{AUTH_SESSION_KEY?:string}).AUTH_SESSION_KEY||"";
 const ip=request.headers.get("cf-connecting-ip")||"unknown";
 await throttle("delivery-check-ip:"+await sha256(seal+ip),8,900);
 await throttle("delivery-check-phone:"+await sha256(seal+normalizedDeliveryPhone(input.phone)),5,3600);
 const created=new Date(),expiresAt=Math.floor(created.getTime()/1000)+DELIVERY_SECONDS;
 const id=crypto.randomUUID();
 await getDb().insert(deliveryChecks).values({
  id,restaurantId:row.id,requestId:input.requestId,tokenHash,
  phone:normalizedDeliveryPhone(input.phone),address:input.address,
  latitude:input.latitude??null,longitude:input.longitude??null,
  status:"pending",version:1,createdAt:created.toISOString(),expiresAt,
 }).onConflictDoNothing();
 const saved=await getDb().select().from(deliveryChecks).where(and(eq(deliveryChecks.restaurantId,row.id),eq(deliveryChecks.requestId,input.requestId))).get();
 if(!saved||saved.tokenHash!==tokenHash)throw new HttpError(409,"Consulta em andamento. Atualize para acompanhar.");
 queueOwnerNotice(row.ownerId,"delivery:"+saved.id,"delivery",row.id);
 return Response.json({id:saved.id,status:saved.status,expiresAt:saved.expiresAt},{status:201,headers:privateHeaders});
 }catch(error){return errorResponse(error);}
}
export async function GET(request:Request,{params}:Context){try{
 const {slug}=await params,row=await published(slug),url=new URL(request.url);
 const id=url.searchParams.get("id")||"",token=request.headers.get("x-pedido-delivery-token")||"";
 if(!/^[a-f0-9-]{36}$/i.test(id)||!/^[a-f0-9]{64}$/.test(token))throw new HttpError(404,"Consulta não encontrada.");
 const check=await getDb().select({status:deliveryChecks.status,expiresAt:deliveryChecks.expiresAt}).from(deliveryChecks).where(and(eq(deliveryChecks.id,id),eq(deliveryChecks.restaurantId,row.id),eq(deliveryChecks.tokenHash,await sha256(token)))).get();
 if(!check)throw new HttpError(404,"Consulta não encontrada.");
 return Response.json({status:check.expiresAt>Date.now()/1000?check.status:"expired",expiresAt:check.expiresAt},{headers:privateHeaders});
 }catch(error){return errorResponse(error);}
}
