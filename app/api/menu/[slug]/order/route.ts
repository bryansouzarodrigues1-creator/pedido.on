import {and,eq,gte,count} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants,orders} from "@/db/schema";
import {restaurantSchema,orderInputSchema,whatsappMessage,phoneNumber,type RestaurantData} from "@/lib/domain";
import {sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {canServeMenu} from "@/lib/billing";
import {readJson,privateHeaders,throttle} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {authConfig} from "@/lib/auth";
import {checkoutQuote} from "@/lib/checkout-quote";
import {queueOwnerNotice} from "@/lib/push";
import {env} from "cloudflare:workers";
import {assertStoreVerified,verificationWriteGuard,verificationGuardArgs} from "@/lib/store-verification";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){try{
 sameOrigin(request);const {slug}=await params,db=getDb();
 const row=await db.select().from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();
 if(!row?.publishedData||!await canServeMenu(row.ownerId,row.id))throw new HttpError(404,"Cardápio indisponível.");
 const verification=await assertStoreVerified(row);
 const input=orderInputSchema.parse(await readJson(request,30000));if(!input.trackingToken)throw new HttpError(400,"Atualize o cardápio antes de finalizar seu pedido.");
 const data=restaurantSchema.parse(JSON.parse(row.publishedData)),hash=await sha256(input.trackingToken);
 const result=(saved:typeof orders.$inferSelect)=>{
  if(saved.trackingHash!==hash)throw new HttpError(404,"Pedido não encontrado.");
  return {id:saved.id,code:saved.id.slice(0,8).toUpperCase(),total:saved.total,trackingUrl:`/pedido/${saved.id}#${input.trackingToken}`,whatsappUrl:`https://wa.me/${phoneNumber(data.whatsapp)}?text=${encodeURIComponent(whatsappMessage(data,JSON.parse(saved.data),saved.id.slice(0,8).toUpperCase()))}`};
 };
 const existing=await db.select().from(orders).where(and(eq(orders.restaurantId,row.id),eq(orders.requestId,input.requestId))).get();
 if(existing)return Response.json(result(existing),{headers:privateHeaders});
 await throttle("order-ip:"+await sha256(authConfig().seal+":"+(request.headers.get("cf-connecting-ip")||"anonymous")),30,600);
 const {summary,changed}=await checkoutQuote(row.id,data,input);
 if(changed)return Response.json({error:"O valor foi atualizado. Confira o novo total antes de confirmar.",quote:summary},{status:409,headers:privateHeaders});
 const recent=await db.select({n:count()}).from(orders).where(and(eq(orders.restaurantId,row.id),eq(orders.phone,summary.phone),gte(orders.createdAt,new Date(Date.now()-600000).toISOString()))).get();
 if((recent?.n||0)>=10)throw new HttpError(429,"Você enviou vários pedidos. Aguarde alguns minutos.");
 const pix=input.payment==="Pix"&&data.pix?.enabled?data.pix:null,stamp=new Date().toISOString();
 const inserted=await env.DB!.prepare(`INSERT INTO orders(id,restaurant_id,request_id,tracking_hash,customer,phone,data,total,status,payment_status,pix_snapshot,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${verificationWriteGuard} ON CONFLICT DO NOTHING`).bind(crypto.randomUUID(),row.id,input.requestId,hash,summary.customer,summary.phone,JSON.stringify(summary),summary.total,pix?"awaiting_payment":"awaiting",pix?"pending":"pay_on_delivery",pix?JSON.stringify(pix):null,stamp,stamp,...verificationGuardArgs(verification)).run();
 const saved=await db.select().from(orders).where(and(eq(orders.restaurantId,row.id),eq(orders.requestId,input.requestId))).get();
 if(!saved)throw new HttpError(inserted.meta.changes?500:403,"A liberação da loja mudou. Atualize o cardápio e envie o carrinho pelo WhatsApp.");
 queueOwnerNotice(row.ownerId,"order:"+saved.id,"orders",row.id,saved.id);
 return Response.json(result(saved),{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
