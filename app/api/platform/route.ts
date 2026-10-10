import {billingConfig,billingPlans} from "@/lib/billing";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({billingEnabled:billingConfig().enabled,plans:billingPlans},{headers:{"Cache-Control":"no-store"}});}
