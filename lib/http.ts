import {env} from "cloudflare:workers";
import {HttpError,privateHeaders} from "./http-policy";
export {HttpError,privateHeaders,sameOrigin,readBody,readBytes,readJson} from "./http-policy";
export function errorResponse(e:unknown){
  if(e instanceof Error&&/whatsapp_already_registered/i.test(e.message+String(e.cause||"")))return Response.json({error:"Já existe uma pizzaria com este WhatsApp. Entre na conta existente ou use outro número."},{status:409,headers:privateHeaders});
  if(e instanceof HttpError)return Response.json({error:e.message,...(e.attempt?{attempt:e.attempt}:{})},{status:e.status,headers:privateHeaders});
  if(e&&typeof e==="object"&&"issues" in e){const issues=(e as {issues:{message:string}[]}).issues;return Response.json({error:issues[0]?.message||"Confira os campos."},{status:400,headers:privateHeaders});}
  console.error("Request failed",e instanceof Error?e.name:"unknown");return Response.json({error:"Não foi possível concluir. Tente novamente."},{status:500,headers:privateHeaders});
}
export async function throttle(key:string,limit:number,seconds:number){
  if(!env.DB)throw new HttpError(503,"Serviço temporariamente indisponível.");const now=Math.floor(Date.now()/1000),slot=Math.floor(now/seconds),expires=(slot+1)*seconds;
  const result=await env.DB.prepare("INSERT INTO rate_buckets (id, hits, expires_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET hits = rate_buckets.hits + 1 RETURNING hits").bind(key+":"+slot,expires).first<{hits:number}>();
  if(!result||result.hits>limit)throw new HttpError(429,"Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  await env.DB.prepare("DELETE FROM rate_buckets WHERE expires_at < ?").bind(now).run();
}

