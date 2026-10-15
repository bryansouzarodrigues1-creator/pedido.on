import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {subscriptions} from "@/db/schema";
import {owner,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {stripeRequest,billingConfig} from "@/lib/billing";
import {assertCsrf} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{sameOrigin(request);assertCsrf(request);const user=await owner();if(billingConfig().provider==="asaas")return Response.json({url:"/assinatura"},{headers:{"Cache-Control":"private, no-store"}});const row=await getDb().select().from(subscriptions).where(eq(subscriptions.ownerId,user.userId)).get();if(!row)throw new HttpError(404,"Sua conta ainda não tem uma assinatura.");const session=await stripeRequest<{url:string}>("billing_portal/sessions",new URLSearchParams({customer:row.customerId,return_url:`${new URL(request.url).origin}/app`}));if(!session.url.startsWith("https://billing.stripe.com/"))throw new HttpError(503,"Não foi possível abrir a gestão da assinatura.");return Response.json({url:session.url});}catch(e){return errorResponse(e);}}
