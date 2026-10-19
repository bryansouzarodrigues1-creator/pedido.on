import {env} from "cloudflare:workers";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {and,eq} from "drizzle-orm";
import {sameOrigin,readJson,privateHeaders,errorResponse,HttpError,throttle} from "@/lib/http";
import {authConfig} from "@/lib/auth";
import {sha256} from "@/lib/auth-policy";
import {storeReportSchema} from "@/lib/store-verification-policy";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){try{
 sameOrigin(request);const {slug}=await params,row=await getDb().select({id:restaurants.id}).from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();
 if(!row)throw new HttpError(404,"Pizzaria não encontrada.");
 const input=storeReportSchema.parse(await readJson(request,12000));
 const reporterHash=await sha256(authConfig().seal+":store-report:"+(request.headers.get("cf-connecting-ip")||"unknown"));
 const previous=await env.DB!.prepare("SELECT id FROM store_reports WHERE restaurant_id=? AND reporter_hash=? AND request_id=?").bind(row.id,reporterHash,input.requestId).first<{id:string}>();
 if(previous)return Response.json({protocol:previous.id.slice(0,8).toUpperCase()},{headers:privateHeaders});
 await throttle("store-report:"+reporterHash,3,3600);
 const id=crypto.randomUUID();
 await env.DB!.prepare("INSERT INTO store_reports(id,restaurant_id,request_id,reporter_hash,category,detail,contact,order_reference,status,created_at,resolution,version) VALUES(?,?,?,?,?,?,?,?,'open',?,'',1) ON CONFLICT(restaurant_id,reporter_hash,request_id) DO NOTHING").bind(id,row.id,input.requestId,reporterHash,input.category,input.detail,input.contact,input.orderReference,new Date().toISOString()).run();
 const saved=await env.DB!.prepare("SELECT id FROM store_reports WHERE restaurant_id=? AND reporter_hash=? AND request_id=?").bind(row.id,reporterHash,input.requestId).first<{id:string}>();
 if(!saved)throw new HttpError(409,"Não foi possível registrar. Tente novamente.");
 return Response.json({protocol:saved.id.slice(0,8).toUpperCase()},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
