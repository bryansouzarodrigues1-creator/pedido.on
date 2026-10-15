import {env} from "cloudflare:workers";
import {eq,count,and,ne,asc} from "drizzle-orm";
import {getDb} from "@/db";
import {subscriptions,restaurants} from "@/db/schema";
import {HttpError} from "./http";
import {paidPlan} from "./billing-policy";
import {asaasRuntime,asaasPaidAccount} from "./asaas-billing";
import {accountAccess} from "./account-access";
import {moreGenerousPlan} from "./account-access-policy";
import {assertTrialPublication,trialEntitlement} from "./trial";
export {planCatalog as billingPlans} from "./plan-catalog";
import {planCatalog as billingPlans} from "./plan-catalog";
async function publicationLimit(ownerId:string,planName:BillingPlan){
 const now=Math.floor(Date.now()/1000),db=env.DB!;
 const legacy=await db.prepare(`SELECT 1 AS yes FROM asaas_subscriptions s JOIN asaas_intents i ON i.id=s.intent_id WHERE s.owner_id=? AND s.paid_plan=? AND s.environment='production' AND s.paid_through>? AND i.catalog_version=1
 UNION ALL SELECT 1 FROM subscriptions WHERE owner_id=? AND paid_plan=? AND paid_through>?
 UNION ALL SELECT 1 FROM account_access WHERE owner_id=? AND plan=? AND mode='grant' AND catalog_version=1 AND (expires_at IS NULL OR expires_at>?) LIMIT 1`).bind(ownerId,planName,now,ownerId,planName,now,ownerId,planName,now).first();
 return legacy?({essencial:1,profissional:3,rede:10} as const)[planName]:billingPlans[planName].limit;
}
export type BillingPlan=keyof typeof billingPlans;
export type BillingEnv={PEDIDO_BILLING_PROVIDER?:string;PEDIDO_BILLING_ENFORCED?:string;PEDIDO_BILLING_ENABLED?:string;FORNO_BILLING_ENABLED?:string;STRIPE_SECRET_KEY?:string;STRIPE_WEBHOOK_SECRET?:string;STRIPE_PRICE_ESSENCIAL?:string;STRIPE_PRICE_PROFISSIONAL?:string;STRIPE_PRICE_REDE?:string};
export function billingConfig(){const e=env as typeof env&BillingEnv;const a=asaasRuntime(),provider=e.PEDIDO_BILLING_PROVIDER==="asaas"?"asaas" as const:"stripe" as const;return {provider,mode:a.mode,enabled:provider==="asaas"?a.enabled:(e.PEDIDO_BILLING_ENABLED||e.FORNO_BILLING_ENABLED)==="true"&&!!e.STRIPE_SECRET_KEY&&!!e.STRIPE_WEBHOOK_SECRET&&!!e.STRIPE_PRICE_ESSENCIAL&&!!e.STRIPE_PRICE_PROFISSIONAL&&!!e.STRIPE_PRICE_REDE,secret:e.STRIPE_SECRET_KEY||"",webhook:e.STRIPE_WEBHOOK_SECRET||"",prices:{essencial:e.STRIPE_PRICE_ESSENCIAL||"",profissional:e.STRIPE_PRICE_PROFISSIONAL||"",rede:e.STRIPE_PRICE_REDE||""}};}
export async function stripeRequest<T>(path:string,body?:URLSearchParams,idempotency?:string):Promise<T>{const config=billingConfig();if(!config.enabled||config.provider!=="stripe")throw new HttpError(503,"A cobrança Stripe está desativada.");const res=await fetch(`https://api.stripe.com/v1/${path}`,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${config.secret}`,"Stripe-Version":"2026-08-26.dahlia",...(body?{"Content-Type":"application/x-www-form-urlencoded"}:{}),...(idempotency?{"Idempotency-Key":idempotency}:{})},body:body?.toString(),signal:AbortSignal.timeout(15000),redirect:"manual"});if(!res.ok)throw new HttpError(503,"O serviço de assinatura não respondeu. Tente novamente.");return await res.json() as T;}
async function assertPaidPublication(ownerId:string,restaurantId:string){if(!billingEnforced())return;const subscription=await paidAccount(ownerId);if(!paidPlan(subscription))throw new HttpError(402,"Ative uma assinatura nas Configurações para publicar seu cardápio.");const plan=billingPlans[subscription!.paidPlan as BillingPlan];if(!plan)throw new HttpError(402,"O plano da sua conta precisa ser confirmado.");const limit=await publicationLimit(ownerId,subscription!.paidPlan as BillingPlan);const used=await getDb().select({n:count()}).from(restaurants).where(and(eq(restaurants.ownerId,ownerId),eq(restaurants.published,true),ne(restaurants.id,restaurantId))).get();if((used?.n||0)>=limit)throw new HttpError(402,`Seu plano permite ${limit} pizzaria(s) publicada(s). Gerencie a assinatura nas Configurações.`);}
export type StripeSubscription={id:string;customer:string|{id:string};status:string;metadata:{owner_id?:string;plan?:string};current_period_end?:number;latest_invoice?:string|{id:string;status:string;lines:{data:{period:{end:number};pricing?:{price_details?:{price:string}};price?:{id:string}}[]}};items:{data:{current_period_end?:number;price:{id:string}}[]}};

async function paidMenuServing(ownerId:string,restaurantId:string){if(!billingEnforced())return true;const db=getDb(),subscription=await paidAccount(ownerId);if(!paidPlan(subscription))return false;const plan=billingPlans[subscription!.paidPlan as BillingPlan];if(!plan)return false;const rows=await db.select({id:restaurants.id}).from(restaurants).where(and(eq(restaurants.ownerId,ownerId),eq(restaurants.published,true))).orderBy(asc(restaurants.createdAt),asc(restaurants.id)).limit(await publicationLimit(ownerId,subscription!.paidPlan as BillingPlan));return rows.some(r=>r.id===restaurantId);}

async function manualGrantPublication(ownerId:string,restaurantId:string,planName:"essencial"|"profissional"|"rede"){
 const limit=await publicationLimit(ownerId,planName);
 const used=await getDb().select({n:count()}).from(restaurants).where(and(eq(restaurants.ownerId,ownerId),eq(restaurants.published,true),ne(restaurants.id,restaurantId))).get();
 if((used?.n||0)>=limit)throw new HttpError(402,`A condição especial desta conta permite ${limit} pizzaria(s) publicada(s).`);
}
async function manualGrantServing(ownerId:string,restaurantId:string,planName:"essencial"|"profissional"|"rede"){
 const rows=await getDb().select({id:restaurants.id}).from(restaurants).where(and(eq(restaurants.ownerId,ownerId),eq(restaurants.published,true))).orderBy(asc(restaurants.createdAt),asc(restaurants.id)).limit(await publicationLimit(ownerId,planName));
 return rows.some(row=>row.id===restaurantId);
}
export async function assertPublishEntitlement(ownerId:string,restaurantId:string){const access=await accountAccess(ownerId);if(access.mode==="suspended")throw new HttpError(403,"O acesso comercial desta conta foi suspenso. Fale com o suporte.");if(access.mode==="grant"){
 const paid=billingConfig().enabled?await paidAccount(ownerId):null;
 return manualGrantPublication(ownerId,restaurantId,moreGenerousPlan(access.plan,paidPlan(paid)));
}if(billingConfig().enabled){const paid=await paidAccount(ownerId);if(paidPlan(paid))return assertPaidPublication(ownerId,restaurantId);}if(await assertTrialPublication(ownerId,restaurantId))return;return assertPaidPublication(ownerId,restaurantId);}
export async function canServeMenu(ownerId:string,restaurantId:string){const access=await accountAccess(ownerId);if(access.mode==="suspended")return false;if(access.mode==="grant"){
 const paid=billingConfig().enabled?await paidAccount(ownerId):null;
 return manualGrantServing(ownerId,restaurantId,moreGenerousPlan(access.plan,paidPlan(paid)));
}if(billingConfig().enabled){const paid=await paidAccount(ownerId);if(paidPlan(paid))return paidMenuServing(ownerId,restaurantId);}const trial=await trialEntitlement(ownerId,restaurantId);return trial===null?paidMenuServing(ownerId,restaurantId):trial;}

export function billingEnforced(){const c=billingConfig();return c.enabled&&(c.provider==="stripe"||c.mode==="production"&&(env as typeof env&BillingEnv).PEDIDO_BILLING_ENFORCED==="true");}
async function paidAccount(ownerId:string){const legacy=await getDb().select().from(subscriptions).where(eq(subscriptions.ownerId,ownerId)).get(),asaas=billingConfig().provider==="asaas"?await asaasPaidAccount(ownerId):null;if(!asaas)return legacy;if(!paidPlan(legacy))return asaas;return moreGenerousPlan(asaas.paidPlan as BillingPlan,paidPlan(legacy))===asaas.paidPlan?asaas:legacy;}
