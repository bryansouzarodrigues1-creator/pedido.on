import {asaasStatus} from "@/lib/asaas-billing";
import {asaasSandboxTestOwner} from "@/lib/asaas-billing";
import {billingEnforced} from "@/lib/billing";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {subscriptions} from "@/db/schema";
import {owner,errorResponse} from "@/lib/server";
import {billingConfig} from "@/lib/billing";
import {publicPlanCatalog} from "@/lib/plan-catalog";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner(),config=billingConfig();if(config.provider==="asaas")return Response.json({enabled:config.enabled,provider:"asaas",mode:config.mode,enforced:billingEnforced(user.userId),sandboxOnly:config.sandboxOnly,testAccess:asaasSandboxTestOwner(user.userId),plans:publicPlanCatalog,...await asaasStatus(user.userId)},{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});const row=await getDb().select().from(subscriptions).where(eq(subscriptions.ownerId,user.userId)).get();return Response.json({enabled:billingConfig().enabled,plans:publicPlanCatalog,subscription:row?{plan:row.plan,status:row.status,periodEnd:row.periodEnd,paidThrough:row.paidThrough,paidPlan:row.paidPlan}:null},{headers:{"Cache-Control":"no-store"}});}catch(e){return errorResponse(e);}}
