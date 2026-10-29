import {env} from "cloudflare:workers";
/** Read-only, from local canonical records. This report never calls an AI or billing API. */
export async function adminFinance(start:string,end:string,firstDay:string,lastDay:string){
 const db=env.DB!;
 const runtime=(await db.prepare(`WITH jobs AS (
 SELECT id,owner_id,restaurant_id,'image' AS kind,CASE WHEN asset='promotion' OR campaign_key!='' THEN 'promotion' ELSE 'image' END AS purpose,state,created_at FROM image_jobs
 UNION ALL SELECT id,owner_id,restaurant_id,'text',CASE WHEN json_extract(CASE WHEN json_valid(prompt) THEN prompt ELSE '{}' END,'$.task')='customer-support' THEN 'customer-support' ELSE 'owner-text' END,state,created_at FROM studio_jobs)
 SELECT j.owner_id AS ownerId,j.restaurant_id AS restaurantId,r.name,r.slug,j.purpose,COUNT(*) AS attempts,
 SUM(CASE WHEN j.state='completed' THEN 1 ELSE 0 END) AS completed,
 SUM(CASE WHEN j.state='failed' THEN 1 ELSE 0 END) AS failed,
 SUM(CASE WHEN m.input_tokens IS NOT NULL AND m.output_tokens IS NOT NULL THEN 1 ELSE 0 END) AS tokenReports,
 SUM(m.input_tokens) AS inputTokens,SUM(m.output_tokens) AS outputTokens,
 COUNT(m.cost_microusd) AS costReports,SUM(m.cost_microusd) AS costMicrousd,
 COALESCE(SUM(CASE WHEN b.state!='refunded' THEN b.units ELSE 0 END),0) AS estimatedUnits
 FROM jobs j JOIN restaurants r ON r.id=j.restaurant_id AND r.owner_id=j.owner_id
 LEFT JOIN ai_job_receipts m ON m.id=j.id AND m.owner_id=j.owner_id AND m.restaurant_id=j.restaurant_id
 LEFT JOIN ai_budget_reservations b ON b.id=j.id AND b.owner_id=j.owner_id
 WHERE j.created_at>=? AND j.created_at<=? AND j.state!='cancelled'
 GROUP BY j.owner_id,j.restaurant_id,j.purpose ORDER BY estimatedUnits DESC,r.name,j.purpose LIMIT 250`).bind(start,end).all<{ownerId:string;restaurantId:string;name:string;slug:string;purpose:string;attempts:number;completed:number;failed:number;tokenReports:number;inputTokens:number|null;outputTokens:number|null;costReports:number;costMicrousd:number|null;estimatedUnits:number}>()).results;
 const payments=(await db.prepare(`SELECT s.owner_id AS ownerId,COALESCE((SELECT MIN(name) FROM restaurants r WHERE r.owner_id=s.owner_id),'Conta sem loja') AS name,
 COUNT(*) AS invoices,SUM(p.amount) AS gross,COUNT(p.net_amount) AS netReports,SUM(p.net_amount) AS knownNet,
 SUM(CASE WHEN p.net_amount IS NOT NULL THEN p.amount-p.net_amount END) AS knownFees
 FROM asaas_payments p JOIN asaas_subscriptions s ON s.id=p.subscription_key
 WHERE s.environment='production' AND p.customer_id=s.customer_id AND p.status IN ('CONFIRMED','RECEIVED')
 AND p.payment_date>=? AND p.payment_date<=? GROUP BY s.owner_id ORDER BY gross DESC,s.owner_id LIMIT 250`).bind(firstDay,lastDay).all<{ownerId:string;name:string;invoices:number;gross:number;netReports:number;knownNet:number|null;knownFees:number|null}>()).results;
 const undated=await db.prepare("SELECT COUNT(*) AS n FROM asaas_payments p JOIN asaas_subscriptions s ON s.id=p.subscription_key WHERE s.environment='production' AND p.customer_id=s.customer_id AND p.status IN ('CONFIRMED','RECEIVED') AND p.payment_date IS NULL").first<number>("n");
 const direct=await db.prepare("SELECT COUNT(*) AS n FROM assistant_turns WHERE created_at>=? AND created_at<=? AND state='completed' AND source='local'").bind(start,end).first<number>("n");
 return {runtime:runtime.map(({ownerId,...row})=>row),payments:payments.map(({ownerId,...row})=>row),undatedPayments:undated||0,directAnswers:direct||0,possiblyTruncated:runtime.length===250||payments.length===250};
}
export type AdminFinance=Awaited<ReturnType<typeof adminFinance>>;
