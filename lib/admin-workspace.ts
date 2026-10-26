import {siteOperations} from "./site-operations";
import {env} from "cloudflare:workers";
export async function adminWorkspaceOverview(){
 const now=Math.floor(Date.now()/1000),db=env.DB!;
 const [queue,billing]=await Promise.all([
  db.prepare(`SELECT (SELECT COUNT(*) FROM menu_import_assistance WHERE status IN ('requested','paired')) AS imports,(SELECT COUNT(*) FROM menu_import_assistance WHERE status='blocked') AS blocked,(SELECT COUNT(*) FROM store_verifications WHERE status='pending') AS reviews,(SELECT COUNT(*) FROM store_reports WHERE status='open') AS reports,(SELECT COUNT(*) FROM admin_shared_menus WHERE disabled_at IS NULL AND expires_at>?) AS shared`).bind(now).first<Record<string,number>>(),
  db.prepare(`SELECT s.environment,COUNT(p.id) AS invoices,COALESCE(SUM(CASE WHEN p.status IN ('CONFIRMED','RECEIVED') THEN p.amount ELSE 0 END),0) AS received,COALESCE(SUM(CASE WHEN p.status IN ('PENDING','OVERDUE') THEN p.amount ELSE 0 END),0) AS pending,COALESCE(SUM(CASE WHEN p.status='OVERDUE' THEN 1 ELSE 0 END),0) AS overdue FROM asaas_subscriptions s LEFT JOIN asaas_payments p ON p.subscription_key=s.id GROUP BY s.environment`).all<{environment:string;invoices:number;received:number;pending:number;overdue:number}>()
 ]);
 return {operations:await siteOperations(),checkedAt:new Date().toISOString(),queue:{imports:Number(queue?.imports||0),blocked:Number(queue?.blocked||0),reviews:Number(queue?.reviews||0),reports:Number(queue?.reports||0),shared:Number(queue?.shared||0)},billing:billing.results.filter(row=>['production','sandbox'].includes(row.environment))};
}
export type AdminWorkspaceOverview=Awaited<ReturnType<typeof adminWorkspaceOverview>>;
