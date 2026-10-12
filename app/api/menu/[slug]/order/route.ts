import {and,eq,gte,count} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants,orders,deliveryChecks} from "@/db/schema";
import {calculateOrder,orderInputSchema,whatsappMessage,phoneNumber,type RestaurantData} from "@/lib/domain";
import {sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {canServeMenu} from "@/lib/billing";
import {readJson,privateHeaders,throttle} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {authConfig} from "@/lib/auth";
import {deliveryApprovalEnabled} from "@/lib/delivery-config";
import {canUseDeliveryCheck,sameDeliveryContact} from "@/lib/delivery-policy";
import {queueOwnerNotice} from "@/lib/push";
import {approvedDeliveryFee,neighborhoodKey} from "@/lib/delivery-zone-policy";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){try{
 sameOrigin(request);const {slug}=await params,db=getDb();
 const row=await db.select().from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();
 if(!row?.publishedData||!await canServeMenu(row.ownerId,row.id))throw new HttpError(404,"Cardápio indisponível.");
 const input=orderInputSchema.parse(await readJson(request,30000));if(!input.trackingToken)throw new HttpError(400,"Atualize o cardápio antes de finalizar seu pedido.");
 const data=JSON.parse(row.publishedData) as RestaurantData,hash=await sha256(input.trackingToken);
 const result=(saved:typeof orders.$inferSelect)=>{
  if(saved.trackingHash!==hash)throw new HttpError(404,"Pedido não encontrado.");
  return {id:saved.id,code:saved.id.slice(0,8).toUpperCase(),total:saved.total,trackingUrl:`/pedido/${saved.id}#${input.trackingToken}`,whatsappUrl:`https://wa.me/${phoneNumber(data.whatsapp)}?text=${encodeURIComponent(whatsappMessage(data,JSON.parse(saved.data),saved.id.slice(0,8).toUpperCase()))}`};
 };
 const existing=await db.select().from(orders).where(and(eq(orders.restaurantId,row.id),eq(orders.requestId,input.requestId))).get();
 if(existing)return Response.json(result(existing),{headers:privateHeaders});
 await throttle("order-ip:"+await sha256(authConfig().seal+":"+(request.headers.get("cf-connecting-ip")||"anonymous")),30,600);
 let confirmedFee=data.deliveryFee;
 if(input.method==="delivery"&&deliveryApprovalEnabled()){
  if(!input.deliveryCheckId||!input.deliveryCheckToken)throw new HttpError(403,"Confirme o endereço de entrega antes de finalizar.");
  const check=await db.select().from(deliveryChecks).where(and(eq(deliveryChecks.id,input.deliveryCheckId),eq(deliveryChecks.restaurantId,row.id),eq(deliveryChecks.tokenHash,await sha256(input.deliveryCheckToken)))).get();
  if(!canUseDeliveryCheck(check)||!check||!sameDeliveryContact(check,{phone:input.phone,address:input.address})||neighborhoodKey(check.neighborhood||"")!==neighborhoodKey(input.neighborhood||""))
   throw new HttpError(403,"A entrega não foi aprovada para este telefone e endereço. Faça uma nova consulta.");
  try{confirmedFee=approvedDeliveryFee(check,data);}catch(e){throw new HttpError(409,e instanceof Error?e.message:"Consulte a entrega novamente.");}
 }
 let summary;try{summary=calculateOrder({...data,deliveryFee:confirmedFee},input);}catch(e){throw new HttpError(400,e instanceof Error?e.message:"Confira o pedido.");}
 // The browser confirms the current total; never create an order with a silently changed offer.
 if(input.expectedTotal!==undefined&&input.expectedTotal!==summary.total||input.expectedTotal===undefined&&((data.promotions||[]).some(p=>p.enabled)||input.method==="delivery"&&deliveryApprovalEnabled()&&(confirmedFee!==data.deliveryFee||!!input.neighborhood)))
  return Response.json({error:"O valor foi atualizado. Confira o novo total antes de confirmar.",quote:summary},{status:409,headers:privateHeaders});
 const recent=await db.select({n:count()}).from(orders).where(and(eq(orders.restaurantId,row.id),eq(orders.phone,summary.phone),gte(orders.createdAt,new Date(Date.now()-600000).toISOString()))).get();
 if((recent?.n||0)>=10)throw new HttpError(429,"Você enviou vários pedidos. Aguarde alguns minutos.");
 const pix=input.payment==="Pix"&&data.pix?.enabled?data.pix:null,stamp=new Date().toISOString();
 await db.insert(orders).values({id:crypto.randomUUID(),restaurantId:row.id,requestId:input.requestId,trackingHash:hash,customer:summary.customer,phone:summary.phone,data:JSON.stringify(summary),total:summary.total,status:pix?"awaiting_payment":"awaiting",paymentStatus:pix?"pending":"pay_on_delivery",pixSnapshot:pix?JSON.stringify(pix):null,createdAt:stamp,updatedAt:stamp}).onConflictDoNothing();
 const saved=await db.select().from(orders).where(and(eq(orders.restaurantId,row.id),eq(orders.requestId,input.requestId))).get();
 if(!saved)throw new HttpError(500,"Não foi possível registrar o pedido.");
 queueOwnerNotice(row.ownerId,"order:"+saved.id,"orders",row.id,saved.id);
 return Response.json(result(saved),{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
