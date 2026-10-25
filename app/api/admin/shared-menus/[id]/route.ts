import {env} from "cloudflare:workers";
import {sameOrigin,readJson,errorResponse,privateHeaders,throttle,HttpError} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {previewTokenPattern} from "@/lib/guest-preview-policy";
import {requirePlatformAdmin,sharedMenuEdit,findSharedMenu,sharedMenuView} from "@/lib/admin-shared-menus";
export const dynamic="force-dynamic";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);assertCsrf(request);const user=await requirePlatformAdmin();await throttle("admin-share-edit:"+user.userId,60,3600);
 const {id}=await params;if(!previewTokenPattern.test(id))throw new HttpError(404,"Link não encontrado.");const input=sharedMenuEdit.parse(await readJson(request,2000)),row=await findSharedMenu(id);if(!row)throw new HttpError(404,"Link não encontrado.");
 const now=Math.floor(Date.now()/1000),expires=input.action==="renew"?now+(input.days||30)*86400:row.expires_at,disabled=input.action==="pause"?now:input.action==="restore"?null:row.disabled_at;
 const changed=await env.DB!.prepare("UPDATE admin_shared_menus SET expires_at=?,disabled_at=?,updated_at=?,version=version+1 WHERE id=? AND version=?").bind(expires,disabled,now,id,input.version).run();if(!changed.meta.changes)throw new HttpError(409,"O link mudou em outra aba. Atualize a lista antes de continuar.");
 return Response.json({item:sharedMenuView({...row,expires_at:expires,disabled_at:disabled,updated_at:now,version:row.version+1})},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
