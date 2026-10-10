import {env} from "cloudflare:workers";
import {and,eq,desc,gte,lt,sql,getTableColumns} from "drizzle-orm";
import {getDb} from "@/db";
import {orders,orderReceipts} from "@/db/schema";
import {ownedRestaurant,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {salesDay,salesSummary} from "@/lib/sales";
import {readJson,privateHeaders} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {orderActionSchema,decideOrder} from "@/lib/order-policy";
import {safeManagedOrder} from "@/lib/order-server";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params;await ownedRestaurant(id);const db=getDb(),day=salesDay();
 const rows=await db.select({...getTableColumns(orders),receiptMime:orderReceipts.mime}).from(orders).leftJoin(orderReceipts,eq(orderReceipts.id,orders.receiptId)).where(eq(orders.restaurantId,id)).orderBy(desc(orders.createdAt)).limit(100);
 const totals=await db.select({
  value:sql<number>`coalesce(sum(case when ${orders.status} in ('confirmed','preparing','out_for_delivery','delivered') then ${orders.total} else 0 end),0)`,
  confirmed:sql<number>`coalesce(sum(case when ${orders.status} in ('confirmed','preparing','out_for_delivery','delivered') then 1 else 0 end),0)`,
  pending:sql<number>`coalesce(sum(case when ${orders.status} in ('awaiting','awaiting_payment') then 1 else 0 end),0)`,
 }).from(orders).where(and(eq(orders.restaurantId,id),gte(orders.createdAt,day.start),lt(orders.createdAt,day.end))).get();
 return Response.json({orders:rows.map(row=>({...safeManagedOrder(row),receiptMime:row.receiptMime})),sales:salesSummary(day.day,Number(totals?.value||0),Number(totals?.confirmed||0),Number(totals?.pending||0))},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);assertCsrf(request);const {id}=await params,store=await ownedRestaurant(id),input=orderActionSchema.parse(await readJson(request));
 const row=await getDb().select().from(orders).where(and(eq(orders.id,input.orderId),eq(orders.restaurantId,id))).get();
 if(!row)throw new HttpError(404,"Pedido não encontrado.");
 let changes;try{changes=decideOrder(row,input);}catch(e){throw new HttpError(input.version!==row.version?409:400,e instanceof Error?e.message:"Confira o pedido.");}
 const columns={status:"status",paymentStatus:"payment_status",estimatedAt:"estimated_at",decisionReason:"decision_reason",approvedAt:"approved_at",version:"version",updatedAt:"updated_at"};
 const pairs=Object.entries(changes),statement=`UPDATE orders SET ${pairs.map(([key])=>columns[key as keyof typeof columns]+" = ?").join(", ")} WHERE id = ? AND restaurant_id = ? AND version = ?`;
 const message=input.action==="confirm"?"Pedido aprovado pela pizzaria. Prazo de "+input.etaMinutes+" minutos.":input.action==="reject_receipt"?"Comprovante recusado: "+input.reason:input.action==="cancel"?"Pedido cancelado: "+input.reason:input.action==="eta"?"Prazo atualizado para "+input.etaMinutes+" minutos.":input.action==="prepare"?"A pizzaria começou a preparar seu pedido.":input.action==="dispatch"?"Seu pedido saiu para entrega.":"Pedido concluído pela pizzaria.";
 const results=await env.DB!.batch([
  env.DB!.prepare(statement).bind(...pairs.map(([,value])=>value),row.id,id,input.version),
  env.DB!.prepare("INSERT INTO order_events (id, order_id, version, actor_id, action, message, created_at) SELECT ?, id, version, ?, ?, ?, ? FROM orders WHERE id = ? AND restaurant_id = ? AND version = ? AND updated_at = ? ON CONFLICT(order_id, version) DO NOTHING").bind(crypto.randomUUID(),store.ownerId,input.action,message,changes.updatedAt,row.id,id,changes.version,changes.updatedAt),
 ]);
 if(!results[0].meta.changes)throw new HttpError(409,"O pedido mudou em outra tela. Atualize e confira antes de decidir.");
 const updated=await getDb().select({...getTableColumns(orders),receiptMime:orderReceipts.mime}).from(orders).leftJoin(orderReceipts,eq(orderReceipts.id,orders.receiptId)).where(eq(orders.id,row.id)).get();
 if(!updated)throw new HttpError(404,"Pedido não encontrado.");
 return Response.json({order:{...safeManagedOrder(updated),receiptMime:updated.receiptMime}},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
