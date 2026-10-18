import {z} from "zod";
import {sameOrigin,readJson,throttle,errorResponse,HttpError,privateHeaders} from "@/lib/http";
import {assertCsrf,csrfValue} from "@/lib/csrf";
import {sha256} from "@/lib/auth-policy";
import {parseIfoodStoreLink} from "@/lib/menu-source-links";
import {requestIfoodCode,exchangeIfoodCode,importAuthorizedIfood} from "@/lib/ifood-api";
import {ifoodConfig,createIfoodPending,readIfoodPending,publicIfoodPending,ifoodCookie} from "@/lib/ifood-connect";
export async function GET(request:Request){
 const enabled=ifoodConfig().enabled;let pending=null;
 if(enabled&&csrfValue(request)&&request.headers.get("x-pedido-csrf")===csrfValue(request))pending=await readIfoodPending(request);
 return Response.json({enabled,...(pending?{pending:publicIfoodPending(pending)}:{})},{headers:privateHeaders});
}
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("start"),url:z.string().max(2048).refine(v=>!!parseIfoodStoreLink(v),"Cole o link completo da loja no iFood.")}).strict(),
 z.object({action:z.literal("complete"),authorizationCode:z.string().trim().min(4,"Cole o código recebido no Portal do Parceiro.").max(512).regex(/^[a-zA-Z\d._~-]+$/,"Confira o código recebido no Portal do Parceiro.")}).strict(),
 z.object({action:z.literal("cancel")}).strict()
]);
export async function POST(request:Request){let consumed=false;try{
 sameOrigin(request);assertCsrf(request);const body=schema.parse(await readJson(request,4096));
 if(body.action==="cancel")return Response.json({cancelled:true},{headers:{...privateHeaders,"Set-Cookie":ifoodCookie(request,"")}});
 const config=ifoodConfig();if(!config.enabled)throw new HttpError(503,"A conexão oficial com o iFood está sendo configurada. Você pode continuar por PDF, foto ou texto.");
 await throttle("ifood-import-ip:"+body.action+":"+await sha256(config.seal+":"+(request.headers.get("cf-connecting-ip")||"unknown")),body.action==="start"?5:12,600);
 await throttle("ifood-import-global:"+body.action,100,3600);
 if(body.action==="start"){
  const link=parseIfoodStoreLink(body.url)!;const code=await requestIfoodCode(config),state=await createIfoodPending(request,link.url,code);
  return Response.json({pending:publicIfoodPending(state.pending)},{headers:{...privateHeaders,"Set-Cookie":state.cookie}});
 }
 const pending=await readIfoodPending(request);if(!pending)throw new HttpError(409,"Essa autorização expirou ou começou em outro navegador. Conecte sua loja novamente.");
 const token=await exchangeIfoodCode(config,body.authorizationCode,pending.verifier);consumed=true;
 return Response.json(await importAuthorizedIfood(pending.url,token),{headers:{...privateHeaders,"Set-Cookie":ifoodCookie(request,"")}});
 }catch(error){const response=errorResponse(error);if(consumed||error instanceof HttpError&&error.status===409)return Response.json({...await response.json() as {error:string},reconnect:true},{status:response.status,headers:{...privateHeaders,"Set-Cookie":ifoodCookie(request,"")}});return response;}
}
