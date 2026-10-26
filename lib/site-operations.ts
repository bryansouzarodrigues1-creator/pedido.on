import {env} from "cloudflare:workers";
export function operationDay(now=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
export async function recordOperationalError(area:string,code:string){if(!env.DB)return;const day=operationDay();await env.DB.prepare("INSERT INTO operation_errors(id,area,code,day,hits,last_at) VALUES(?,?,?,?,1,?) ON CONFLICT(area,code,day) DO UPDATE SET hits=hits+1,last_at=excluded.last_at").bind(crypto.randomUUID(),area,code,day,new Date().toISOString()).run();}
export async function siteOperations(){
 const start=new Date(Date.now()-30*86400000).toISOString(),db=env.DB!;
 const [visits,errors]=await Promise.all([db.prepare("SELECT page,COUNT(*) AS visits,COUNT(DISTINCT visitor_hash) AS sessions,MIN(created_at) AS since FROM site_visits WHERE created_at>=? GROUP BY page ORDER BY visits DESC").bind(start).all<{page:string;visits:number;sessions:number;since:string}>(),db.prepare("SELECT area,code,SUM(hits) AS hits,MAX(last_at) AS lastAt FROM operation_errors WHERE day>=? GROUP BY area,code ORDER BY lastAt DESC LIMIT 20").bind(start.slice(0,10)).all<{area:string;code:string;hits:number;lastAt:string}>()]);
 const total=await db.prepare("SELECT COUNT(DISTINCT visitor_hash) AS sessions,COUNT(*) AS visits,MIN(created_at) AS since FROM site_visits WHERE created_at>=?").bind(start).first<{sessions:number;visits:number;since:string|null}>();
 return {visits:visits.results,errors:errors.results,sessions:Number(total?.sessions||0),views:Number(total?.visits||0),since:total?.since||null};
}
