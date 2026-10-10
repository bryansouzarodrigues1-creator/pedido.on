import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {subscriptions} from "@/db/schema";
import {owner,errorResponse} from "@/lib/server";
import {billingConfig,billingPlans} from "@/lib/billing";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner(),row=await getDb().select().from(subscriptions).where(eq(subscriptions.ownerId,user.userId)).get();return Response.json({enabled:billingConfig().enabled,plans:billingPlans,subscription:row?{plan:row.plan,status:row.status,periodEnd:row.periodEnd,paidThrough:row.paidThrough,paidPlan:row.paidPlan}:null},{headers:{"Cache-Control":"no-store"}});}catch(e){return errorResponse(e);}}
