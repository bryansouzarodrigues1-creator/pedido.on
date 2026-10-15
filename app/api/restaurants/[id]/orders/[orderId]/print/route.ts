import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {orders} from "@/db/schema";
import {ownedRestaurant} from "@/lib/server";
import {HttpError,errorResponse,privateHeaders} from "@/lib/http";
import {buildOrderTicket,renderOrderTicket,ticketOptions} from "@/lib/order-ticket";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string;orderId:string}>}){try{
 const {id,orderId}=await params,store=await ownedRestaurant(id);
 if(!/^[a-f\d-]{36}$/i.test(orderId))throw new HttpError(404,"Pedido não encontrado.");
 const url=new URL(request.url),options=ticketOptions.parse({copy:url.searchParams.get("copy")||undefined,paper:url.searchParams.get("paper")||undefined,format:url.searchParams.get("format")||undefined});
 const order=await getDb().select().from(orders).where(and(eq(orders.id,orderId),eq(orders.restaurantId,id))).get();if(!order)throw new HttpError(404,"Pedido não encontrado.");
 let ticket;try{ticket=buildOrderTicket(store.name,order,options.copy);}catch(e){throw new HttpError(409,e instanceof Error?e.message:"Confira o pedido antes de imprimir.");}
 if(options.format==="json")return Response.json({version:ticket.version},{headers:privateHeaders});
 return new Response(renderOrderTicket(ticket,options.paper,request.url),{headers:{...privateHeaders,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'","X-Robots-Tag":"noindex, nofollow, noarchive","X-Frame-Options":"DENY"}});
}catch(e){return errorResponse(e);}}
