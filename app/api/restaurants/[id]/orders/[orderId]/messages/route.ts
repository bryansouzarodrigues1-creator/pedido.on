import {and,eq,asc,count} from "drizzle-orm";
import {getDb} from "@/db";
import {orders,orderMessages} from "@/db/schema";
import {ownedRestaurant,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {assertCsrf} from "@/lib/auth";
import {chatInput,CHAT_LIMIT,chatClosed} from "@/lib/order-chat-policy";
import {readJson,privateHeaders,throttle} from "@/lib/http";
export const dynamic="force-dynamic";
type C={params:Promise<{id:string;orderId:string}>};
async function getOrder(id:string,orderId:string){
 await ownedRestaurant(id);
 const order=await getDb().select().from(orders).where(and(eq(orders.id,orderId),eq(orders.restaurantId,id))).get();
 if(!order)throw new HttpError(404,"Pedido não encontrado.");
 return order;
}
export async function GET(_request:Request,{params}:C){try{
 const {id,orderId}=await params;await getOrder(id,orderId);
 const messages=await getDb().select({id:orderMessages.id,sender:orderMessages.sender,body:orderMessages.body,createdAt:orderMessages.createdAt}).from(orderMessages)
 .where(eq(orderMessages.orderId,orderId)).orderBy(asc(orderMessages.createdAt)).limit(CHAT_LIMIT);
 return Response.json({messages},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:C){try{
 sameOrigin(request);assertCsrf(request);
 const {id,orderId}=await params,order=await getOrder(id,orderId);
 if(chatClosed(order.status))throw new HttpError(409,"Este pedido foi encerrado.");
 const input=chatInput.parse(await readJson(request,2500));
 await throttle("owner-chat:"+orderId,30,600);
 const db=getDb(),total=await db.select({n:count()}).from(orderMessages).where(eq(orderMessages.orderId,orderId)).get();
 if((total?.n||0)>=CHAT_LIMIT)throw new HttpError(429,"Esta conversa atingiu o limite.");
 const message={id:crypto.randomUUID(),orderId,sender:"restaurant",body:input.text,createdAt:new Date().toISOString()};
 await db.insert(orderMessages).values(message);
 return Response.json({message},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
