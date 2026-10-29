import {env} from "cloudflare:workers";
/** No prompt, token, customer message or image is stored in this financial ledger. */
export async function beginAiReceipt(id:string,endpoint:string){
 const job=await env.DB!.prepare(`SELECT owner_id,restaurant_id,'image' AS kind,CASE WHEN campaign_key!='' OR asset='promotion' THEN 'promotion' ELSE 'image' END AS purpose FROM image_jobs WHERE id=?
 UNION ALL SELECT owner_id,restaurant_id,'text',CASE WHEN json_extract(CASE WHEN json_valid(prompt) THEN prompt ELSE '{}' END,'$.task')='customer-support' THEN 'customer-support' ELSE 'owner-text' END FROM studio_jobs WHERE id=? LIMIT 1`).bind(id,id).first<{owner_id:string;restaurant_id:string;kind:string;purpose:string}>();
 if(!job)throw Error("Missing AI job");
 await env.DB!.prepare("INSERT INTO ai_job_receipts(id,owner_id,restaurant_id,kind,purpose,provider,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,job.owner_id,job.restaurant_id,job.kind,job.purpose,new URL(endpoint).hostname,new Date().toISOString()).run();
}
function count(headers:Headers,key:string){const raw=headers.get(key);if(raw===null||!/^\d{1,12}$/.test(raw))return null;const value=Number(raw);return Number.isSafeInteger(value)?value:null;}
/** Optional authenticated service contract. Absent metadata remains unknown, never zero. */
export async function finishAiReceipt(id:string,response:Response){
 const input=response.ok?count(response.headers,"x-pedido-ai-input-tokens"):null,output=response.ok?count(response.headers,"x-pedido-ai-output-tokens"):null,cost=response.ok?count(response.headers,"x-pedido-ai-cost-microusd"):null;
 const raw=response.headers.get("x-pedido-ai-model"),model=raw&&/^[a-zA-Z0-9_./:-]{1,120}$/.test(raw)?raw:null;
 await env.DB!.prepare("UPDATE ai_job_receipts SET response_status=?,model=?,input_tokens=?,output_tokens=?,cost_microusd=? WHERE id=?").bind(response.status,model,input,output,cost,id).run();
}
