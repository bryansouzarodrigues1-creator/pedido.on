import {env} from "cloudflare:workers";
import {operationDay} from "./site-operations";
export async function recordAccountActivity(ownerId:string,area:"painel"|"calculadora"|"login",kind:"visit"|"presence"|"calculator_use"="visit",now=new Date()){
 const stamp=now.toISOString();await env.DB!.prepare("INSERT INTO account_activity(id,owner_id,area,day,opens,actions,first_at,last_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,area,day) DO UPDATE SET opens=opens+excluded.opens,actions=actions+excluded.actions,last_at=MAX(last_at,excluded.last_at)").bind(crypto.randomUUID(),ownerId,area,operationDay(now),kind==="visit"?1:0,kind==="calculator_use"?1:0,stamp,stamp).run();
}
