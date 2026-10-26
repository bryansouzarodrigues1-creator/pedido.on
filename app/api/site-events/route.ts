import {env} from "cloudflare:workers";
import {z} from "zod";
import {sameOrigin,readJson,errorResponse,privateHeaders,throttle} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {operationDay,recordOperationalError} from "@/lib/site-operations";
import {getAccountUser} from "@/lib/auth";
import {recordAccountActivity} from "@/lib/account-activity";
export const dynamic="force-dynamic";
const event=z.object({session:z.string().uuid(),page:z.enum(["inicio","calculadora","cadastro","entrar","painel","cardapio"]),kind:z.enum(["visit","presence","calculator_use","client_error"])}).strict().refine(v=>v.kind!=="calculator_use"||v.page==="calculadora");
export async function POST(request:Request){try{sameOrigin(request);const input=event.parse(await readJson(request,350)),secret=(env as typeof env&{AUTH_SESSION_KEY?:string}).AUTH_SESSION_KEY;if(!secret)return new Response(null,{status:204,headers:privateHeaders});const source=await sha256(secret+":"+(request.headers.get("cf-connecting-ip")||"anonymous"));await throttle("site-event:"+source,100,3600);
 const day=operationDay();if(input.kind==="client_error")await recordOperationalError(input.page,"javascript_error");else if(input.kind==="visit"){const hash=await sha256(secret+":visit:"+input.session);await env.DB!.prepare("INSERT INTO site_visits(id,visitor_hash,page,day,created_at) VALUES(?,?,?,?,?) ON CONFLICT(visitor_hash,page,day) DO NOTHING").bind(crypto.randomUUID(),hash,input.page,day,new Date().toISOString()).run();}
 if(input.kind!=="client_error"&&(input.page==="painel"||input.page==="calculadora"))try{const user=await getAccountUser();if(user)await recordAccountActivity(user.userId,input.page,input.kind);}catch{/* Analytics never interrupts account access. */}
 return new Response(null,{status:204,headers:privateHeaders});}catch(e){return errorResponse(e);}}
