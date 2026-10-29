import {readAsaasConfig,type AsaasConfigInput} from "./asaas-policy.ts";
export const resetTables=["ai_job_receipts","assistant_turns","assistant_conversations","account_activity","account_notices","site_visits","operation_errors","order_events","order_messages","order_receipts","orders","delivery_checks","push_deliveries","push_subscriptions","menu_import_assistance_photos","menu_import_assistance","store_reports","store_verification_events","store_verifications","restaurant_support","trial_campaigns","image_jobs","studio_jobs","ai_budget_reservations","ai_jobs","ai_usage","asaas_payments","asaas_subscriptions","asaas_intents","asaas_events","asaas_accounts","subscriptions","billing_events","billing_customers","admin_shared_menus","guest_menu_previews","restaurants","account_access_events","account_access","account_trials","auth_sessions","account_profiles","rate_buckets"] as const;
export type MaintenanceEnv=AsaasConfigInput&{DB?:D1Database;BUCKET?:R2Bucket;PEDIDO_RESET_ID?:string;PEDIDO_RESET_UNTIL?:string;PEDIDO_RESET_CUTOFF?:string;PEDIDO_BILLING_ENFORCED?:string};
export function maintenanceActive(e:MaintenanceEnv,now=Math.floor(Date.now()/1000)){
 const until=Number(e.PEDIDO_RESET_UNTIL),cutoff=Date.parse(e.PEDIDO_RESET_CUTOFF||"");
 return /^[a-f0-9-]{36}$/.test(e.PEDIDO_RESET_ID||"")&&Number.isSafeInteger(until)&&until>now&&until<=now+86400&&Number.isFinite(cutoff)&&cutoff<=now*1000&&cutoff>=(now-86400)*1000;
}
/** Completion is authoritative even if a host retains an old reset binding. */
export async function maintenanceBlocksAuthentication(e:MaintenanceEnv){
 if(!maintenanceActive(e))return false;
 if(!e.DB)return true;
 const run=await e.DB.prepare("SELECT status FROM platform_maintenance_runs WHERE id=?").bind(e.PEDIDO_RESET_ID!).first<{status:string}>();
 return run?.status!=="done";
}
async function asaasHealth(e:MaintenanceEnv,fetcher:typeof fetch){
 const c=readAsaasConfig(e);const report={configured:c.enabled,mode:c.mode,enforced:e.PEDIDO_BILLING_ENFORCED==="true",apiStatus:0,webhookStatus:0,webhookConfigured:false,webhookEnabled:false,webhookPaused:false};
 if(!c.enabled||!c.baseUrl)return report;
 const get=(path:string)=>fetcher(c.baseUrl+path,{method:"GET",redirect:"manual",headers:{access_token:e.ASAAS_API_KEY||"","User-Agent":"pizzaria-on/billing-check"},signal:AbortSignal.timeout(10000)});
 try{const r=await get("/customers?limit=1");report.apiStatus=r.status;await r.body?.cancel();}catch{}
 try{const r=await get("/webhooks?limit=100");report.webhookStatus=r.status;if(r.ok){const body=await r.json() as {data?:{url?:string;enabled?:boolean;interrupted?:boolean}[]};const hook=body.data?.find(h=>{try{const u=new URL(h.url||"");return u.protocol==="https:"&&["pizzaria-on.netlify.app","forno-cardapios.waves4845.chatgpt.site"].includes(u.hostname)&&u.pathname==="/api/billing/asaas/webhook";}catch{return false;}});report.webhookConfigured=!!hook;report.webhookEnabled=hook?.enabled===true;report.webhookPaused=hook?.interrupted===true;}else await r.body?.cancel();}catch{}
 return report;
}
/** Owner-armed, expiring maintenance only. No request-supplied SQL, keys or target IDs. */
export async function runPlatformMaintenance(e:MaintenanceEnv,fetcher:typeof fetch=fetch){
 if(!maintenanceActive(e))return;
 const db=e.DB,bucket=e.BUCKET;if(!db||!bucket)throw Error("Maintenance bindings unavailable");
 const now=Math.floor(Date.now()/1000),id=e.PEDIDO_RESET_ID!,cutoff=Date.parse(e.PEDIDO_RESET_CUTOFF!);
 await db.prepare("INSERT INTO platform_maintenance_runs(id,status,created_at) VALUES (?,'pending',?) ON CONFLICT(id) DO NOTHING").bind(id,new Date().toISOString()).run();
 const lock=await db.prepare("UPDATE platform_maintenance_runs SET lease_until=? WHERE id=? AND status!='done' AND lease_until<? RETURNING id").bind(now+180,id,now).first();
 if(!lock)return;
 try{
  const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{name:string}>()).results.map(r=>r.name).filter(n=>!n.startsWith("_")&&n!=="sqlite_sequence"&&n!=="d1_migrations"&&n!=="platform_maintenance_runs");
  if(names.some(n=>!resetTables.includes(n as typeof resetTables[number]))||resetTables.some(n=>!names.includes(n)))throw Error("Maintenance schema changed");
  const counts:Record<string,number>={};for(const table of resetTables)counts[table]=Number((await db.prepare('SELECT count(*) AS n FROM "'+table+'"').first<{n:number}>())?.n||0);
  let cursor=(await db.prepare("SELECT cursor FROM platform_maintenance_runs WHERE id=?").bind(id).first<{cursor:string}>())?.cursor||undefined;
  do{
   const listed=await bucket.list({limit:100,...(cursor?{cursor}:{})});
   const keys=listed.objects.filter(o=>o.uploaded.getTime()<=cutoff).map(o=>o.key);
   if(keys.length)await bucket.delete(keys);
   cursor=listed.truncated?listed.cursor:undefined;
   await db.prepare("UPDATE platform_maintenance_runs SET cursor=?,media_deleted=media_deleted+? WHERE id=?").bind(cursor||"",keys.length,id).run();
  }while(cursor);
  const billing=await asaasHealth(e,fetcher);
  // Children precede parents; D1 commits the erasure and completion marker atomically.
  await db.batch([...resetTables.map(table=>db.prepare('DELETE FROM "'+table+'"')),db.prepare("UPDATE platform_maintenance_runs SET status='done',lease_until=0,completed_at=?,report_json=? WHERE id=?").bind(new Date().toISOString(),JSON.stringify({rowCounts:counts,billing}),id)]);
 }catch(error){await db.prepare("UPDATE platform_maintenance_runs SET lease_until=0,status='retry' WHERE id=?").bind(id).run();throw error;}
}
