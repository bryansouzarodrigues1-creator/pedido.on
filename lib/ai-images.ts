import {env} from "cloudflare:workers";
import {randomToken,sha256} from "./auth-policy";
import {HttpError,readBytes,throttle} from "./http";
import {imageEndpoint,imageLimits,imagePrompt,imageFormat,imageProtocol,imageInput} from "./image-policy";
import {planQuotasEnabled,budgetAllowance,reserveBudgetedJob,settleAiBudget} from "./ai-budget";
import {requestAiProvider} from "./ai-provider";
import {providerFailure} from "./provider-diagnostics";
import type {z} from "zod";
type ImageEnv={PEDIDO_IMAGE_ENABLED?:string;PEDIDO_IMAGE_ENDPOINT?:string};
type Job={id:string;input_hash:string;state:string;result_url:string|null;asset:string};
export function imageConfig(){const e=env as typeof env&ImageEnv,endpoint=imageEndpoint(e.PEDIDO_IMAGE_ENDPOINT);return {enabled:e.PEDIDO_IMAGE_ENABLED==="true"&&!!endpoint,endpoint};}
export async function imageAllowance(ownerId:string){if(planQuotasEnabled()){const {window,...usage}=await budgetAllowance(ownerId,"image");return {...usage,enabled:imageConfig().enabled&&usage.available,dailyLimit:0};}const period=new Date().toISOString().slice(0,7),row=await env.DB!.prepare("SELECT COUNT(*) AS used FROM image_jobs WHERE owner_id=? AND period_key=? AND state!='cancelled'").bind(ownerId,period).first<{used:number}>();return {enabled:imageConfig().enabled,used:row?.used||0,limit:imageLimits.monthly,dailyLimit:imageLimits.daily,period};}
export async function claimImage(jobId:string,token:string){
 if(!imageConfig().enabled)throw new HttpError(503,"A geração de imagens está em configuração.");
 const hash=await sha256(token),now=new Date().toISOString();
 const claimed=await env.DB!.prepare("UPDATE image_jobs SET state='claimed',updated_at=? WHERE id=? AND token_hash=? AND state='queued' AND expires_at>? RETURNING prompt,asset").bind(now,jobId,hash,now).first<{prompt:string;asset:string}>();
 if(!claimed)throw new HttpError(401,"Solicitação de imagem inválida ou já utilizada.");
 return {prompt:claimed.prompt,asset:claimed.asset==="promotion"?"product":claimed.asset,ratio:claimed.asset==="cover"?"16:9":"1:1",protocol:imageProtocol};
}
export async function generateImage(ownerId:string,restaurantId:string,name:string,input:z.infer<typeof imageInput>,product?:{name:string;description:string}){
 const config=imageConfig();if(!config.enabled)throw new HttpError(503,"A IA de imagens está em configuração. Você pode usar os modelos prontos.");
 const hash=await sha256(JSON.stringify({...input,requestId:undefined,name,product}));
 const find=()=>env.DB!.prepare("SELECT id,input_hash,state,result_url,asset FROM image_jobs WHERE owner_id=? AND restaurant_id=? AND request_id=?").bind(ownerId,restaurantId,input.requestId).first<Job>();
 const existing=await find();
 function resume(job:Job){if(job.input_hash!==hash)throw new HttpError(409,"Esta solicitação já foi utilizada com outra descrição.");if(job.state==="completed"&&job.result_url)return {url:job.result_url,asset:job.asset};throw new HttpError(409,job.state==="queued"||job.state==="claimed"?"Sua imagem está sendo preparada. Aguarde.":"Este pedido terminou sem imagem. Você pode criar outro.",job.state==="queued"||job.state==="claimed"?"pending":job.state==="cancelled"?"cancelled":"failed");}
 if(existing)return {...resume(existing),usage:await imageAllowance(ownerId)};
 await throttle("image-owner:"+await sha256(ownerId),planQuotasEnabled()?30:10,86400);
 const now=new Date(),stamp=now.toISOString(),day=stamp.slice(0,10),period=stamp.slice(0,7),id=crypto.randomUUID(),token=randomToken(),tokenHash=await sha256(token),expires=new Date(now.getTime()+120000).toISOString();
 const insert=`INSERT INTO image_jobs (id,owner_id,restaurant_id,request_id,input_hash,token_hash,prompt,asset,promotion_id,source_version,state,period_key,created_at,expires_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,'queued',?,?,?,?`;
 const values=[id,ownerId,restaurantId,input.requestId,hash,tokenHash,imagePrompt(name,input,product),input.asset,input.promotionId||"",input.promotionVersion||"",period,stamp,expires,stamp];
 const reserved=planQuotasEnabled()?await reserveBudgetedJob(ownerId,"image",id,insert,values):(await env.DB!.prepare(insert+` WHERE (SELECT COUNT(*) FROM image_jobs WHERE owner_id=? AND period_key=? AND state!='cancelled')<? AND (SELECT COUNT(*) FROM image_jobs WHERE created_at>=? AND state!='cancelled')<? ON CONFLICT(owner_id,restaurant_id,request_id) DO NOTHING`).bind(...values,ownerId,period,imageLimits.monthly,day,imageLimits.daily).run()).meta.changes===1;
 if(!reserved){const duplicate=await find();if(duplicate&&duplicate.id!==id)return {...resume(duplicate),usage:await imageAllowance(ownerId)};throw new HttpError(429,"As criações com IA estão indisponíveis neste período. Confira sua franquia em Minha conta ou use suas próprias fotos.");}
 let phase="connect";
 try{
  const response=await requestAiProvider(config.endpoint,{jobId:id,token},90000);
  if(!response.ok)console.error("[pedido.on] ai-images provider response",{status:response.status,phase:"provider_post",contentType:response.headers.get("content-type"),requestId:response.headers.get("cf-ray")||response.headers.get("x-request-id")});
  if(response.status===402){await env.DB!.prepare("UPDATE image_jobs SET state='cancelled',updated_at=? WHERE id=? AND state IN ('queued','claimed')").bind(new Date().toISOString(),id).run();throw new HttpError(503,"O serviço de IA está sem saldo disponível. Sua tentativa foi devolvida. Você pode usar os modelos prontos.");}
  if(!response.ok)throw new HttpError(503,response.status===401?"A autorização da geração falhou entre os serviços.":response.status===404?"O serviço de imagens não foi encontrado.":response.status===429?"O serviço de imagens está temporariamente limitado.":response.status>=500?"O gerador respondeu com erro. Confira a conexão e tente mais tarde.":"A IA não concluiu a imagem. Confira seu limite antes de tentar novamente.");
  phase="read";
  const bytes=await readBytes(new Request("https://image.invalid",{method:"POST",body:response.body,headers:{"content-length":response.headers.get("content-length")||""},duplex:"half"} as RequestInit),imageLimits.maxBytes),format=imageFormat(bytes,response.headers.get("content-type")||"");
  const state=await env.DB!.prepare("SELECT state FROM image_jobs WHERE id=?").bind(id).first<{state:string}>();if(state?.state!=="claimed")throw new HttpError(502,"A geração não foi autorizada pela pizzaria.on.");
  phase="store";
  const key=`${restaurantId}/${crypto.randomUUID()}.${format.ext}`,url=`/media/${key}`;
  await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:format.mime,cacheControl:"public, max-age=86400"}});
  const completed=await env.DB!.prepare("UPDATE image_jobs SET state='completed',result_url=?,updated_at=? WHERE id=? AND state='claimed'").bind(url,new Date().toISOString(),id).run();
  if(!completed.meta.changes){await env.BUCKET!.delete(key);throw new HttpError(409,"A tentativa foi encerrada. Confira o painel antes de gerar novamente.");}
  return {url,asset:input.asset,usage:await imageAllowance(ownerId)};
 }catch(error){
  // Refund only before a capability was claimed. Ambiguous billed calls remain counted.
  console.error("[pedido.on] image generation failed",{phase,...providerFailure(error,[token,input.description,name,product])});
  await env.DB!.prepare("UPDATE image_jobs SET state=CASE WHEN state='queued' THEN 'cancelled' ELSE 'failed' END,updated_at=? WHERE id=? AND state IN ('queued','claimed')").bind(new Date().toISOString(),id).run();
  const state=await env.DB!.prepare("SELECT state FROM image_jobs WHERE id=?").bind(id).first<{state:string}>();
  const attempt=state?.state==="cancelled"?"cancelled":"failed";
  throw new HttpError(error instanceof HttpError?error.status:503,attempt==="cancelled"?(error instanceof HttpError&&error.message.includes("devolvida")?error.message:"Não conseguimos conectar à IA. Nenhuma imagem foi descontada. Você pode tentar novamente."):(error instanceof HttpError?error.message:"A IA recebeu seu pedido, mas não devolveu a imagem. Uma nova geração usa outra imagem do seu limite."),attempt);
 }finally{await settleAiBudget(id,"image");}
}
