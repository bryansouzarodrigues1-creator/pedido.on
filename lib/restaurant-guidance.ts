import {env} from "cloudflare:workers";
/** Creative context only. Reading support never reserves credits or runs a model. */
export async function aiTeamGuidance(id:string){
 const rows=await env.DB!.prepare("SELECT message FROM restaurant_support WHERE restaurant_id=? AND kind='guidance' AND state='available' ORDER BY created_at DESC,id DESC LIMIT 4").bind(id).all<{message:string}>();
 return rows.results.reverse().map(r=>r.message.slice(0,800)).join("\n").slice(0,2200);
}
