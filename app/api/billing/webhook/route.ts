import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {subscriptions,billingEvents,billingCustomers} from "@/db/schema";
import {billingConfig,stripeRequest,type BillingPlan,type StripeSubscription} from "@/lib/billing";
import {verifyStripeSignature} from "@/lib/stripe-signature";
import {errorResponse,HttpError} from "@/lib/server";
import {paymentEntitlement} from "@/lib/billing-policy";
import {readBody} from "@/lib/http";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{
  const config=billingConfig();if(!config.enabled)throw new HttpError(503,"A cobrança recorrente está desativada.");
  const payload=await readBody(request,1000000);
  if(!await verifyStripeSignature(payload,request.headers.get("stripe-signature")||"",config.webhook))throw new HttpError(400,"Assinatura inválida.");
  const event=JSON.parse(payload) as {id:string;type:string;data:{object:{id:string;subscription?:string;mode?:string;parent?:{subscription_details?:{subscription?:string}}}}};
  if(!/^evt_[a-zA-Z0-9]+$/.test(event.id))throw new HttpError(400,"Evento inválido.");
  const db=getDb();if(await db.select().from(billingEvents).where(eq(billingEvents.id,event.id)).get())return Response.json({received:true});
  const supported=event.type.startsWith("customer.subscription.")||["checkout.session.completed","checkout.session.async_payment_succeeded","invoice.paid","invoice.payment_failed"].includes(event.type);
  if(!supported)return Response.json({received:true});
  const id=event.type.startsWith("customer.subscription.")?event.data.object.id:event.type.startsWith("invoice.")?(event.data.object.parent?.subscription_details?.subscription||event.data.object.subscription):event.data.object.mode==="subscription"?event.data.object.subscription:undefined;
  if(!id||!/^sub_[a-zA-Z0-9]+$/.test(id))return Response.json({received:true});
  // Retrieve the latest subscription state: webhook delivery order is not guaranteed.
  const sub=await stripeRequest<StripeSubscription>(`subscriptions/${encodeURIComponent(id)}?expand[]=latest_invoice`),customerId=typeof sub.customer==="string"?sub.customer:sub.customer.id;
  const account=await db.select().from(billingCustomers).where(eq(billingCustomers.customerId,customerId)).get(),ownerId=account?.ownerId;
  const priceId=sub.items.data[0]?.price.id,plan=(Object.entries(config.prices).find(([,price])=>price===priceId)?.[0]) as BillingPlan|undefined;
  if(!ownerId||!plan)return Response.json({received:true});
  const existing=await db.select().from(subscriptions).where(eq(subscriptions.ownerId,ownerId)).get();
  if(existing&&existing.subscriptionId!==sub.id&&["active","trialing","past_due","unpaid","incomplete"].includes(existing.status))throw new HttpError(409,"Uma segunda assinatura precisa de revisão.");
  const now=new Date().toISOString(),periodEnd=sub.current_period_end||sub.items.data[0]?.current_period_end||0;
  const {paidThrough,paidPlan}=paymentEntitlement(existing,sub.id,plan,periodEnd,typeof sub.latest_invoice==="object"?sub.latest_invoice:null,priceId);
  const record={ownerId,customerId,subscriptionId:sub.id,plan,status:sub.status,periodEnd,paidThrough,paidPlan,updatedAt:now};
  await db.batch([db.insert(billingEvents).values({id:event.id,createdAt:now}).onConflictDoNothing(),db.insert(subscriptions).values(record).onConflictDoUpdate({target:subscriptions.ownerId,set:record})]);
  return Response.json({received:true});
}catch(e){return errorResponse(e);}}
