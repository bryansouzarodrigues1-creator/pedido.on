import {env} from "cloudflare:workers";
import {ownedRestaurant} from "@/lib/server";
import {errorResponse,HttpError,privateHeaders} from "@/lib/http";
import {historyCursor,ownedCreation} from "@/lib/creation-history-policy";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params,store=await ownedRestaurant(id),raw=new URL(request.url).searchParams.get("cursor");let cursor:import("zod").infer<typeof historyCursor>|null=null;if(raw){try{if(raw.length>220)throw Error();cursor=historyCursor.parse(JSON.parse(atob(raw.replace(/-/g,"+").replace(/_/g,"/"))));}catch{throw new HttpError(400,"Atualize a lista de criações.");}}
 const values=[store.ownerId,id,store.ownerId,id],filter=cursor?" WHERE created_at<? OR (created_at=? AND id<?)":"";
 const rows=await env.DB!.prepare("SELECT * FROM (SELECT id,'image' AS kind,created_at,asset,NULL AS result,result_url AS url FROM image_jobs WHERE owner_id=? AND restaurant_id=? AND state='completed' AND asset!='promotion' UNION ALL SELECT id,'text' AS kind,created_at,NULL AS asset,result,NULL AS url FROM studio_jobs WHERE owner_id=? AND restaurant_id=? AND state='completed')"+filter+" ORDER BY created_at DESC,id DESC LIMIT 21").bind(...values,...(cursor?[cursor.at,cursor.at,cursor.id]:[])).all<{id:string;kind:string;created_at:string;asset:string|null;result:string|null;url:string|null}>();
 const visible=rows.results.slice(0,20),last=visible.at(-1),next=rows.results.length>20&&last?btoa(JSON.stringify({at:last.created_at,id:last.id})).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""):null;
 return Response.json({creations:visible.flatMap(row=>{const value=ownedCreation(row,id);return value?[value]:[];}),nextCursor:next},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
