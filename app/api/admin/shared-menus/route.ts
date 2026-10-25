import {env} from "cloudflare:workers";
import {sameOrigin,readJson,errorResponse,privateHeaders,throttle,HttpError} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {sha256} from "@/lib/auth-policy";
import {requirePlatformAdmin,sharedMenuCreate,shareableMenu,sharedMenuView,sharedMenuSelect,type SharedMenuRow} from "@/lib/admin-shared-menus";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
 await requirePlatformAdmin();const params=new URL(request.url).searchParams,q=(params.get("q")||"").trim(),status=params.get("status")||"all",page=Number(params.get("page")||1);
 if(q.length>80||!["all","active","expired","paused"].includes(status)||!Number.isInteger(page)||page<1||page>10000)throw new HttpError(400,"Confira os filtros da lista.");
 const now=Math.floor(Date.now()/1000),where=["label LIKE ? ESCAPE '\\'"],bindings:(string|number)[]=["%"+q.replace(/[\\%_]/g,"\\$&")+"%"];
 if(status==="paused")where.push("disabled_at IS NOT NULL");if(status==="active"){where.push("disabled_at IS NULL AND expires_at>?");bindings.push(now);}if(status==="expired"){where.push("disabled_at IS NULL AND expires_at<=?");bindings.push(now);}
 const clause=" WHERE "+where.join(" AND "),count=await env.DB!.prepare("SELECT COUNT(*) AS total FROM admin_shared_menus"+clause).bind(...bindings).first<{total:number}>(),rows=await env.DB!.prepare(sharedMenuSelect+clause+" ORDER BY created_at DESC,id DESC LIMIT 12 OFFSET ?").bind(...bindings,(page-1)*12).all<SharedMenuRow>();
 return Response.json({items:rows.results.map(sharedMenuView),total:count?.total||0,page,pageSize:12},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);assertCsrf(request);const user=await requirePlatformAdmin();await throttle("admin-share:"+user.userId,30,3600);
 const input=sharedMenuCreate.parse(await readJson(request,6000000)),data=shareableMenu(input.data),contentHash=await sha256(JSON.stringify([input.label,input.days,data]));
 const readPrior=()=>env.DB!.prepare(sharedMenuSelect+" WHERE request_id=?").bind(input.requestId).first<SharedMenuRow>();
 const repeat=await readPrior();if(repeat){if(repeat.created_by!==user.userId||repeat.content_hash!==contentHash)throw new HttpError(409,"Esta tentativa já foi usada para outro cardápio.");return Response.json({item:sharedMenuView(repeat)},{headers:privateHeaders});}
 const id=crypto.randomUUID().replace(/-/g,""),key="admin-shared-menus/"+id+".json",now=Math.floor(Date.now()/1000),expires=now+input.days*86400;
 await env.BUCKET!.put(key,JSON.stringify(data),{httpMetadata:{contentType:"application/json"}});
 let saved;try{saved=await env.DB!.prepare("INSERT INTO admin_shared_menus(id,created_by,request_id,content_hash,label,object_key,created_at,updated_at,expires_at,version) VALUES(?,?,?,?,?,?,?,?,?,1) ON CONFLICT(request_id) DO NOTHING").bind(id,user.userId,input.requestId,contentHash,input.label,key,now,now,expires).run();}catch(e){await env.BUCKET!.delete(key);throw e;}
 if(!saved.meta.changes){await env.BUCKET!.delete(key);const prior=await readPrior();if(!prior||prior.created_by!==user.userId||prior.content_hash!==contentHash)throw new HttpError(409,"Esta tentativa já foi usada para outro cardápio.");return Response.json({item:sharedMenuView(prior)},{headers:privateHeaders});}
 return Response.json({item:sharedMenuView({id,created_by:user.userId,request_id:input.requestId,content_hash:contentHash,label:input.label,object_key:key,created_at:now,updated_at:now,expires_at:expires,disabled_at:null,version:1})},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
