import {and,eq,asc,count} from "drizzle-orm";
import {getDb} from "@/db";
import {orderMessages} from "@/db/schema";
import {trackedOrder} from "@/lib/order-server";
import {queueRestaurantNotice} from "@/lib/push";
import {chatInput,CHAT_LIMIT,chatClosed} from "@/lib/order-chat-policy";
import {sameOrigin,readJson,privateHeaders,errorResponse,HttpError,throttle} from "@/lib/http";
export const dynamic="force-dynamic";
type C={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:C){try{
 const {id}=await params;await trackedOrder(request,id);
 const messages=await getDb().select({id:orderMessages.id,sender:orderMessages.sender,body:orderMessages.body,createdAt:orderMessages.createdAt})
 .from(orderMessages).where(eq(orderMessages.orderId,id)).orderBy(asc(orderMessages.createdAt)).limit(CHAT_LIMIT);
 return Response.json({messages},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:C){try{
 sameOrigin(request);const {id}=await params,order=await trackedOrder(request,id);
 if(chatClosed(order.status))throw new HttpError(409,"Este pedido foi encerrado. Use o WhatsApp para continuar.");
 const input=chatInput.parse(await readJson(request,2500));
 await throttle("customer-chat:"+id,15,600);
 const db=getDb(),total=await db.select({n:count()}).from(orderMessages).where(eq(orderMessages.orderId,id)).get();
 if((total?.n||0)>=CHAT_LIMIT)throw new HttpError(429,"Esta conversa atingiu o limite. Use o WhatsApp.");
 const message={id:crypto.randomUUID(),orderId:id,sender:"customer",body:input.text,createdAt:new Date().toISOString()};
 await db.insert(orderMessages).values(message);
 queueRestaurantNotice(order.restaurantId,"message:"+message.id,"messages",order.id);
 return Response.json({message},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
