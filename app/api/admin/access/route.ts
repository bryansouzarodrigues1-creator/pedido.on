import {env} from "cloudflare:workers";
import {owner,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {platformAdmin} from "@/lib/platform";
import {assertCsrf} from "@/lib/auth";
import {adminAccessAction,effectiveAccess,grantExpiry} from "@/lib/account-access-policy";
import {readJson,privateHeaders,throttle} from "@/lib/http";
export const dynamic="force-dynamic";
async function admin(){const user=await owner();if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");return user;}
async function accountForShop(restaurantId:string){
 const shop=await env.DB!.prepare("SELECT owner_id AS ownerId FROM restaurants WHERE id=?").bind(restaurantId).first<{ownerId:string}>();
 if(!shop)throw new HttpError(404,"Pizzaria não encontrada.");
 return shop.ownerId;
}
export async function GET(request:Request){try{
 const user=await admin(),restaurantId=new URL(request.url).searchParams.get("restaurantId")||"";
 if(!/^[a-zA-Z0-9_-]{3,100}$/.test(restaurantId))throw new HttpError(400,"Escolha uma pizzaria válida.");
 const ownerId=await accountForShop(restaurantId);
 if(ownerId===user.userId)throw new HttpError(403,"A conta administradora não pode alterar seu próprio acesso.");
 const row=await env.DB!.prepare("SELECT mode,plan,expires_at AS expiresAt,reason,version,updated_at AS updatedAt FROM account_access WHERE owner_id=?").bind(ownerId).first<{mode:string;plan:string|null;expiresAt:number|null;reason:string;version:number;updatedAt:string}>();
 const events=await env.DB!.prepare("SELECT action,plan,expires_at AS expiresAt,reason,created_at AS createdAt FROM account_access_events WHERE owner_id=? ORDER BY created_at DESC,rowid DESC LIMIT 8").bind(ownerId).all();
 return Response.json({access:row?{...effectiveAccess(row),version:row.version,reason:row.reason,updatedAt:row.updatedAt}:{...effectiveAccess(null),version:0,reason:"",updatedAt:null},history:events.results||[]},{headers:privateHeaders});
 }catch(e){return errorResponse(e);}
}
export async function PATCH(request:Request){try{
 sameOrigin(request);assertCsrf(request);const user=await admin();
 await throttle("admin-access:"+user.userId,30,3600);
 const input=adminAccessAction.parse(await readJson(request,3000));
 const ownerId=await accountForShop(input.restaurantId);
 if(ownerId===user.userId)throw new HttpError(403,"Não é possível alterar seu próprio acesso de administrador.");
 const current=await env.DB!.prepare("SELECT version FROM account_access WHERE owner_id=?").bind(ownerId).first<{version:number}>();
 if((current?.version||0)!==input.expectedVersion)throw new HttpError(409,"A situação desta conta mudou. Atualize e confira antes de salvar.");
 const now=Math.floor(Date.now()/1000),expires=input.mode==="grant"?grantExpiry(input.durationDays,now):null,plan=input.mode==="grant"?input.plan!:null;
 const timestamp=new Date(now*1000).toISOString();
 const update=env.DB!.prepare(`INSERT INTO account_access(owner_id,mode,plan,expires_at,reason,updated_by,updated_at,version,catalog_version)
 VALUES(?,?,?,?,?,?,?,1,2)
 ON CONFLICT(owner_id) DO UPDATE SET catalog_version=CASE WHEN account_access.mode='grant' AND account_access.plan=excluded.plan THEN account_access.catalog_version ELSE 2 END,mode=excluded.mode,plan=excluded.plan,expires_at=excluded.expires_at,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at,version=account_access.version+1
 WHERE account_access.version=?`).bind(ownerId,input.mode,plan,expires,input.reason,user.userId,timestamp,input.expectedVersion);
 const audit=env.DB!.prepare(`INSERT INTO account_access_events(id,owner_id,actor_id,action,plan,expires_at,reason,created_at)
 SELECT ?,owner_id,?,mode,plan,expires_at,reason,? FROM account_access WHERE owner_id=? AND version=? AND changes()=1`).bind(crypto.randomUUID(),user.userId,timestamp,ownerId,input.expectedVersion+1);
 const result=await env.DB!.batch([update,audit]);
 if(!result[0]?.meta?.changes)throw new HttpError(409,"Outra alteração foi feita nesta conta. Atualize e confira antes de salvar.");
 const after=await env.DB!.prepare("SELECT mode,plan,expires_at AS expiresAt,version FROM account_access WHERE owner_id=?").bind(ownerId).first<{mode:string;plan:string|null;expiresAt:number|null;version:number}>();
 return Response.json({access:{...effectiveAccess(after),version:after!.version}},{headers:privateHeaders});
 }catch(e){return errorResponse(e);}
}
