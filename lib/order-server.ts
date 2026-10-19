import {and,eq,desc} from "drizzle-orm";
import {getDb} from "@/db";
import {orders,restaurants,orderEvents} from "@/db/schema";
import {HttpError} from "./http";
import {sha256} from "./auth-policy";
import {trackingToken,trackingAlive,type PixDetails,type ManagedOrder} from "./order-policy";
import type {OrderSummary} from "./domain";
import {storeVerification} from "./store-verification";
export function safeManagedOrder(row:typeof orders.$inferSelect){const {trackingHash,requestId,...rest}=row;return rest;}
export async function trackedOrder(request:Request,id:string){
 const token=trackingToken(request.headers.get("x-pedido-order-token"));
 if(!/^[a-f0-9-]{36}$/i.test(id)||!token)throw new HttpError(404,"Pedido não encontrado. Abra o link recebido ao finalizar.");
 const row=await getDb().select().from(orders).where(and(eq(orders.id,id),eq(orders.trackingHash,await sha256(token)))).get();
 if(!row||!trackingAlive(row.createdAt))throw new HttpError(404,"O link deste pedido não está disponível.");return row;
}
export async function customerOrder(row:typeof orders.$inferSelect){
 const store=await getDb().select().from(restaurants).where(eq(restaurants.id,row.restaurantId)).get();
 const siteOrderingAllowed=store?(await storeVerification(store)).siteOrderingAllowed:false;
 const settings=JSON.parse(store?.publishedData||store?.data||"{}") as {whatsapp?:string};
 const events=await getDb().select({action:orderEvents.action,message:orderEvents.message,createdAt:orderEvents.createdAt}).from(orderEvents).where(eq(orderEvents.orderId,row.id)).orderBy(desc(orderEvents.version)).limit(20);
 return {id:row.id,code:row.id.slice(0,8).toUpperCase(),restaurant:store?.name||"Sua pizzaria",slug:store?.slug||"",whatsapp:settings.whatsapp||"",siteOrderingAllowed,acceptedAt:row.acceptedAt,status:row.status as ManagedOrder["status"],paymentStatus:row.paymentStatus,receiptCount:row.receiptCount,hasReceipt:!!row.receiptId,version:row.version,estimatedAt:row.estimatedAt,decisionReason:row.decisionReason,createdAt:row.createdAt,updatedAt:row.updatedAt,pix:siteOrderingAllowed&&row.pixSnapshot?JSON.parse(row.pixSnapshot) as PixDetails:null,summary:JSON.parse(row.data) as OrderSummary,events};
}
export type CustomerOrder=Awaited<ReturnType<typeof customerOrder>>;
