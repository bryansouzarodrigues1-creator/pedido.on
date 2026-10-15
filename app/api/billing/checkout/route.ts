import {asaasCheckout,asaasCheckoutSchema} from "@/lib/asaas-billing";
import {accountAccess} from "@/lib/account-access";
import {throttle,privateHeaders} from "@/lib/http";
import {z} from "zod";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {subscriptions,billingCustomers} from "@/db/schema";
import {owner,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {billingConfig,billingPlans,stripeRequest} from "@/lib/billing";
import {readJson} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{
  sameOrigin(request);assertCsrf(request);const user=await owner(),raw=await readJson(request);
  if(billingConfig().provider==="asaas"){const access=await accountAccess(user.userId);if(access.mode==="suspended")throw new HttpError(403,"Esta conta está suspensa. Fale com o suporte antes de assinar.");await throttle("billing-checkout:"+user.userId,8,300);const result=await asaasCheckout(user,asaasCheckoutSchema.parse(raw));return Response.json(result,{status:result.pending?202:200,headers:privateHeaders});}
  const input=z.object({plan:z.enum(["essencial","profissional","rede"]),requestId:z.string().uuid()}).parse(raw);
  const config=billingConfig();if(!config.enabled)throw new HttpError(503,"A cobrança ainda não foi ativada. Você pode montar seu cardápio no pré-lançamento.");
  const existing=await getDb().select().from(subscriptions).where(eq(subscriptions.ownerId,user.userId)).get();if(existing&&["active","trialing","past_due","unpaid","incomplete"].includes(existing.status))throw new HttpError(409,"Sua conta já possui uma assinatura. Use Gerenciar assinatura para alterar o plano ou pagamento.");
  const price=await stripeRequest<{active:boolean;currency:string;unit_amount:number;recurring:{interval:string;interval_count:number}|null}>(`prices/${encodeURIComponent(config.prices[input.plan])}`);
  if(!price.active||price.currency!=="brl"||price.unit_amount!==billingPlans[input.plan].amount||price.recurring?.interval!=="month"||price.recurring.interval_count!==1)throw new HttpError(503,"O preço da assinatura precisa ser revisado pela plataforma.");
  let customer=await getDb().select().from(billingCustomers).where(eq(billingCustomers.ownerId,user.userId)).get();
  if(!customer){const created=await stripeRequest<{id:string}>("customers",new URLSearchParams({email:user.email,name:user.displayName}),`pedido-on-customer:${user.userId}`);if(!/^cus_[a-zA-Z0-9]+$/.test(created.id))throw new HttpError(503,"Não foi possível preparar a assinatura.");await getDb().insert(billingCustomers).values({ownerId:user.userId,customerId:created.id,createdAt:new Date().toISOString()}).onConflictDoNothing();customer=await getDb().select().from(billingCustomers).where(eq(billingCustomers.ownerId,user.userId)).get();}
  if(!customer)throw new HttpError(503,"Não foi possível preparar a assinatura.");
  const origin=new URL(request.url).origin,body=new URLSearchParams({mode:"subscription",integration_identifier:"pedido-on-subscription-"+[...input.requestId.replaceAll("-","").slice(0,8)].map(c=>String.fromCharCode(97+parseInt(c,16))).join(""),"line_items[0][price]":config.prices[input.plan],"line_items[0][quantity]":"1",success_url:`${origin}/app?billing=success`,cancel_url:`${origin}/app?billing=canceled`,client_reference_id:user.userId,"metadata[owner_id]":user.userId,"metadata[plan]":input.plan,"subscription_data[metadata][owner_id]":user.userId,"subscription_data[metadata][plan]":input.plan});
  body.set("customer",customer.customerId);
  const session=await stripeRequest<{url:string}>("checkout/sessions",body,`pedido-on:${user.userId}:${input.requestId}`);if(!session.url?.startsWith("https://checkout.stripe.com/"))throw new HttpError(503,"Não foi possível abrir o checkout.");return Response.json({url:session.url});
}catch(e){return errorResponse(e);}}
