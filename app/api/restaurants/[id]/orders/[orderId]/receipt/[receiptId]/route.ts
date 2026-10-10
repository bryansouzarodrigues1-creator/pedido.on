import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {orders,orderReceipts} from "@/db/schema";
import {ownedRestaurant,bucket} from "@/lib/server";
import {HttpError,errorResponse,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string;orderId:string;receiptId:string}>}){try{
 const {id,orderId,receiptId}=await params;await ownedRestaurant(id);
 const order=await getDb().select({id:orders.id}).from(orders).where(and(eq(orders.id,orderId),eq(orders.restaurantId,id))).get();if(!order)throw new HttpError(404,"Comprovante não encontrado.");
 const receipt=await getDb().select().from(orderReceipts).where(and(eq(orderReceipts.id,receiptId),eq(orderReceipts.orderId,orderId))).get();if(!receipt)throw new HttpError(404,"Comprovante não encontrado.");
 const object=await bucket().get(receipt.objectKey);if(!object)throw new HttpError(404,"Comprovante não encontrado.");
 const download=receipt.mime==="application/pdf"||new URL(request.url).searchParams.get("download")==="1",ext=receipt.mime==="application/pdf"?"pdf":receipt.mime==="image/jpeg"?"jpg":receipt.mime==="image/png"?"png":"webp";
 return new Response(object.body,{headers:{...privateHeaders,"Content-Type":receipt.mime,"Content-Disposition":`${download?"attachment":"inline"}; filename="comprovante-${orderId.slice(0,8)}.${ext}"`,"Content-Security-Policy":"default-src 'none'; sandbox","X-Frame-Options":"DENY"}});
}catch(e){return errorResponse(e);}}
