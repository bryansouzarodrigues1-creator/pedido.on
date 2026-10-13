import {z} from "zod";

export const adminQuerySchema=z.object({
 days:z.enum(["7","30","90"]).default("30"),
 page:z.coerce.number().int().min(1).max(10000).default(1),
 q:z.string().trim().max(80).default(""),
 filter:z.enum(["all","published","draft","with_orders","without_orders"]).default("all"),
 sort:z.enum(["orders","value","recent"]).default("orders"),
});
export type AdminQuery=z.infer<typeof adminQuerySchema>;
export const ADMIN_PAGE_SIZE=25;
export function readAdminQuery(params:URLSearchParams){return adminQuerySchema.parse(Object.fromEntries(["days","page","q","filter","sort"].filter(key=>params.has(key)).map(key=>[key,params.get(key)])));}
export function adminPeriod(days:number,now=new Date()){
 if(![7,30,90].includes(days)||!Number.isFinite(now.getTime()))throw Error("Invalid analytics period");
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now),part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=`${part("year")}-${part("month")}-${part("day")}`,midnight=Date.parse(`${today}T00:00:00-03:00`),start=midnight-(days-1)*86400000;
 return {days,timeZone:"America/Sao_Paulo",start:new Date(start).toISOString(),end:now.toISOString(),previousStart:new Date(start-days*86400000).toISOString(),dayKeys:Array.from({length:days},(_,i)=>new Date(start+i*86400000-3*3600000).toISOString().slice(0,10))};
}
export function searchPattern(q:string){return "%"+q.replace(/[\\%_]/g,char=>"\\"+char)+"%";}
export function changePercent(current:number,previous:number){return previous>0?Math.round((current-previous)/previous*100):null;}
