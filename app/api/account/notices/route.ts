import {env} from "cloudflare:workers";
import {z} from "zod";
import {owner} from "@/lib/server";
import {sameOrigin,privateHeaders,readJson,errorResponse} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner();const rows=await env.DB!.prepare("SELECT id,title,body,path,created_at AS createdAt,read_at AS readAt FROM account_notices WHERE owner_id=? ORDER BY created_at DESC LIMIT 30").bind(user.userId).all();const unread=await env.DB!.prepare("SELECT COUNT(*) AS n FROM account_notices WHERE owner_id=? AND read_at IS NULL").bind(user.userId).first<number>("n");return Response.json({items:rows.results,unread:unread||0},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function PATCH(request:Request){try{sameOrigin(request);assertCsrf(request);const user=await owner(),input=z.object({id:z.string().uuid()}).strict().parse(await readJson(request,200));await env.DB!.prepare("UPDATE account_notices SET read_at=COALESCE(read_at,?) WHERE owner_id=? AND id=?").bind(new Date().toISOString(),user.userId,input.id).run();return Response.json({ok:true},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
