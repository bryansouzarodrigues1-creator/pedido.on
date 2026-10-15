import {env} from "cloudflare:workers";
import {planCatalog,trialAi,aiCostUnits,aiBetaBudgetUnits,type CatalogPlan} from "./plan-catalog";
import {effectiveAccess,moreGenerousPlan} from "./account-access-policy";
import {monthAfterDueDate} from "./asaas-policy";
import {trialFromStart} from "./trial-policy";

type Kind="image"|"text";
type Window={start:string;end:string;period:string;scope:"trial"|"cycle"|"month"|"unavailable";plan:string;images:number;texts:number};
const iso=(seconds:number)=>new Date(seconds*1000).toISOString();
export function planQuotasEnabled(){return (env as typeof env&{PEDIDO_AI_PLAN_QUOTAS?:string}).PEDIDO_AI_PLAN_QUOTAS==="true";}
function monthWindow(now:Date){return {start:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString(),end:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString()};}

export async function aiEntitlement(ownerId:string,now=new Date()):Promise<Window>{
 const db=env.DB!,seconds=Math.floor(now.getTime()/1000),calendar=monthWindow(now);
 const raw=await db.prepare("SELECT mode,plan,expires_at AS expiresAt,updated_at FROM account_access WHERE owner_id=?").bind(ownerId).first<{mode:string;plan:string|null;expiresAt:number|null;updated_at:string}>(),access=effectiveAccess(raw,seconds);
 const none={...calendar,period:"unavailable",scope:"unavailable" as const,plan:"",images:0,texts:0};
 if(access.mode==="suspended")return none;
 // Only canonical, confirmed production invoices can grant a paid AI allowance.
 const invoices=(await db.prepare(`SELECT s.paid_plan AS plan,p.due_date FROM asaas_subscriptions s JOIN asaas_payments p ON p.subscription_key=s.id
 WHERE s.owner_id=? AND s.environment='production' AND s.paid_through>? AND p.customer_id=s.customer_id
 AND p.status IN ('CONFIRMED','RECEIVED') AND p.amount=CASE s.paid_plan WHEN 'essencial' THEN 4900 WHEN 'profissional' THEN 8900 WHEN 'rede' THEN 14900 ELSE -1 END
 ORDER BY p.due_date DESC`).bind(ownerId,seconds).all<{plan:CatalogPlan;due_date:string}>()).results;
 let paid:Window|null=null;
 for(const invoice of invoices){const end=monthAfterDueDate(invoice.due_date),start=Date.parse(invoice.due_date+"T00:00:00Z")/1000;if(!end||start>seconds||end<=seconds||!Object.hasOwn(planCatalog,invoice.plan))continue;const plan=planCatalog[invoice.plan];if(!paid||moreGenerousPlan(invoice.plan,paid.plan)===invoice.plan&&plan.images>paid.images)paid={start:iso(start),end:iso(end),period:"cycle:"+invoice.due_date,scope:"cycle",plan:invoice.plan,images:plan.images,texts:plan.texts};}
 // Preserve the former Stripe path for accounts that already have a paid period.
 const stripe=await db.prepare("SELECT paid_plan,paid_through,status FROM subscriptions WHERE owner_id=?").bind(ownerId).first<{paid_plan:CatalogPlan;paid_through:number;status:string}>();
 if(stripe&&["active","trialing","past_due"].includes(stripe.status)&&stripe.paid_through>seconds&&Object.hasOwn(planCatalog,stripe.paid_plan)&&(!paid||planCatalog[stripe.paid_plan].images>paid.images))paid={...calendar,period:"paid:"+calendar.start,scope:"cycle",plan:stripe.paid_plan,images:planCatalog[stripe.paid_plan].images,texts:planCatalog[stripe.paid_plan].texts};
 if(access.mode==="grant"&&(!paid||moreGenerousPlan(access.plan,paid.plan)===access.plan)){const plan=planCatalog[access.plan];return {...calendar,period:"month:"+calendar.start,scope:"month",plan:access.plan,images:plan.images,texts:plan.texts};}
 if(paid)return paid;
 const trial=await db.prepare("SELECT started_at FROM account_trials WHERE owner_id=?").bind(ownerId).first<{started_at:number|null}>();
 if(trial){const value=trialFromStart(trial.started_at,seconds);return value.status==="active"?{start:iso(trial.started_at!),end:iso(value.endsAt),period:"trial:"+trial.started_at,scope:"trial",plan:"trial",...trialAi}:none;}
 // Pre-trial accounts keep the former allowance; selecting a plan in a draft grants nothing.
 return {...calendar,period:"legacy:"+calendar.start,scope:"month",plan:"legacy",images:3,texts:20};
}

export async function budgetAllowance(ownerId:string,kind:Kind){
 const window=await aiEntitlement(ownerId),table=kind==="image"?"image_jobs":"studio_jobs",limit=kind==="image"?window.images:window.texts;
 const used=await env.DB!.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE owner_id=? AND created_at>=? AND created_at<? AND state!='cancelled'`).bind(ownerId,window.start,window.end).first<{n:number}>();
 const budget=await env.DB!.prepare("SELECT COALESCE(SUM(CASE WHEN budget_period=? THEN units ELSE 0 END),0) AS monthly,COALESCE(SUM(CASE WHEN cohort='trial' THEN units ELSE 0 END),0) AS trials FROM ai_budget_reservations WHERE state!='refunded'").bind(new Date().toISOString().slice(0,7)).first<{monthly:number;trials:number}>();
 const available=(budget?.monthly||0)+aiCostUnits[kind]<=aiBetaBudgetUnits&&(window.scope!=="trial"||(budget?.trials||0)+aiCostUnits[kind]<=aiBetaBudgetUnits);
 return {used:used?.n||0,limit,period:window.period,scope:window.scope,endsAt:window.end,plan:window.plan,available:available&&limit>0,window};
}

/** Job, owner quota, and estimated platform budget are reserved in one D1 transaction. */
export async function reserveBudgetedJob(ownerId:string,kind:Kind,id:string,insertSql:string,values:(string|number)[]){
 const usage=await budgetAllowance(ownerId,kind),db=env.DB!,stamp=new Date().toISOString(),budgetPeriod=stamp.slice(0,7),table=kind==="image"?"image_jobs":"studio_jobs";
 if(!usage.available||usage.used>=usage.limit)return false;
 const result=await db.batch([
  db.prepare(insertSql+` WHERE (SELECT COUNT(*) FROM ${table} WHERE owner_id=? AND created_at>=? AND created_at<? AND state!='cancelled')<? ON CONFLICT(owner_id,restaurant_id,request_id) DO NOTHING`).bind(...values,ownerId,usage.window.start,usage.window.end,usage.limit),
  db.prepare(`INSERT INTO ai_budget_reservations(id,owner_id,kind,period_key,budget_period,cohort,units,state,created_at)
  SELECT ?,?,?,?,?,?,?,'reserved',? WHERE EXISTS(SELECT 1 FROM ${table} WHERE id=? AND state='queued')
  AND (SELECT COALESCE(SUM(units),0) FROM ai_budget_reservations WHERE budget_period=? AND state!='refunded')+?<=?
  AND (?!='trial' OR (SELECT COALESCE(SUM(units),0) FROM ai_budget_reservations WHERE cohort='trial' AND state!='refunded')+?<=?) ON CONFLICT(id) DO NOTHING`).bind(id,ownerId,kind,usage.period,budgetPeriod,usage.scope,aiCostUnits[kind],stamp,id,budgetPeriod,aiCostUnits[kind],aiBetaBudgetUnits,usage.scope,aiCostUnits[kind],aiBetaBudgetUnits),
  db.prepare(`UPDATE ${table} SET state='cancelled',updated_at=? WHERE id=? AND NOT EXISTS(SELECT 1 FROM ai_budget_reservations WHERE id=?)`).bind(stamp,id,id),
 ]);
 return result[1].meta.changes===1;
}
export async function settleAiBudget(id:string,kind:Kind){
 if(!planQuotasEnabled())return;
 const table=kind==="image"?"image_jobs":"studio_jobs";
 await env.DB!.prepare(`UPDATE ai_budget_reservations SET state=CASE WHEN (SELECT state FROM ${table} WHERE id=?)='cancelled' THEN 'refunded' ELSE 'consumed' END WHERE id=?`).bind(id,id).run();
}
export async function platformAiBudget(now=new Date()){
 if(!planQuotasEnabled())return null;
 const period=now.toISOString().slice(0,7),row=await env.DB!.prepare("SELECT COALESCE(SUM(CASE WHEN budget_period=? AND state!='refunded' THEN units ELSE 0 END),0) AS monthly,COALESCE(SUM(CASE WHEN cohort='trial' AND state!='refunded' THEN units ELSE 0 END),0) AS trials FROM ai_budget_reservations").bind(period).first<{monthly:number;trials:number}>();
 return {period,estimatedCredits:(row?.monthly||0)/1000000,trialCredits:(row?.trials||0)/1000000,limitCredits:aiBetaBudgetUnits/1000000};
}
