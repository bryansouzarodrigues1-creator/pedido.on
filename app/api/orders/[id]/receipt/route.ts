import {env} from "cloudflare:workers";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {orders} from "@/db/schema";
import {trackedOrder,customerOrder} from "@/lib/order-server";
import {queueRestaurantNotice} from "@/lib/push";
import {receiptType,MAX_PROOF_BYTES,MAX_PROOFS,receiptSql} from "@/lib/order-policy";
import {bucket} from "@/lib/server";
import {sameOrigin,readBytes,HttpError,errorResponse,privateHeaders,throttle} from "@/lib/http";
import {verifiedRestaurant,verificationWriteGuard,verificationGuardArgs} from "@/lib/store-verification";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);const {id}=await params,row=await trackedOrder(request,id);
 const verification=await verifiedRestaurant(row.restaurantId);
 if(row.status!=="awaiting_payment"||!["pending","rejected"].includes(row.paymentStatus))throw new HttpError(409,"O pedido já mudou. Atualize antes de enviar um comprovante.");
 if(row.receiptCount>=MAX_PROOFS)throw new HttpError(400,"O limite de comprovantes foi atingido. Fale com a pizzaria.");
 await throttle("receipt:"+id,6,600);
 const bytes=await readBytes(request,MAX_PROOF_BYTES),file=receiptType(bytes,request.headers.get("content-type")||"");
 if(!file)throw new HttpError(400,"Envie um comprovante JPG, PNG, WebP ou PDF de até 5 MB.");
 const receiptId=crypto.randomUUID(),key=`order-proofs/${row.restaurantId}/${id}/${receiptId}.${file.ext}`,stamp=new Date().toISOString(),storage=bucket();
 await storage.put(key,bytes,{httpMetadata:{contentType:file.type,cacheControl:"private, no-store"}});
 try{
  const results=await env.DB!.batch([
   env.DB!.prepare(receiptSql.insert+" AND "+verificationWriteGuard).bind(receiptId,key,file.type,bytes.length,stamp,id,row.version,...verificationGuardArgs(verification)),
   env.DB!.prepare(receiptSql.attach).bind(receiptId,stamp,id,row.version,receiptId),
   env.DB!.prepare("INSERT INTO order_events (id, order_id, version, action, message, created_at) SELECT ?, id, version, 'receipt', 'Comprovante enviado. A pizzaria vai conferir o recebimento.', ? FROM orders WHERE id = ? AND receipt_id = ? AND version = ?").bind(crypto.randomUUID(),stamp,id,receiptId,row.version+1),
  ]);
  if(!results[1].meta.changes)throw new HttpError(409,"O pedido mudou durante o envio. Atualize para conferir.");
 }catch(e){await storage.delete(key).catch(()=>{});throw e;}
 const updated=await getDb().select().from(orders).where(eq(orders.id,id)).get();if(!updated)throw new HttpError(404,"Pedido não encontrado.");
 queueRestaurantNotice(row.restaurantId,"receipt:"+receiptId,"orders",row.id);
 return Response.json({order:await customerOrder(updated)},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
