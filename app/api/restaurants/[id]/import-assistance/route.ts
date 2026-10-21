import {env} from "cloudflare:workers";
import {z} from "zod";
import {ownedRestaurant,sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {readJson,privateHeaders,throttle} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {normalizeBrazilWhatsApp} from "@/lib/support-whatsapp";
import {supportContactWhatsApp} from "@/lib/platform";
import {validAssistedSource,assistanceToReaderText,assistStats,assistedCapture} from "@/lib/menu-assistance-policy";
export const dynamic="force-dynamic";
const requestInput=z.object({storeUrl:z.string().max(2048),ownerNote:z.string().trim().max(350).default(""),authorized:z.literal(true),notifyWhenReady:z.boolean().default(false),contactWhatsApp:z.string().min(10).max(27),contactPermission:z.literal(true)});
type Row={id:string;restaurant_id:string;store_url:string;owner_note:string;status:string;notify_when_ready:number;contact_whatsapp:string;capture_json:string|null;created_at:string;updated_at:string;received_at:string|null};
const sql="SELECT id,restaurant_id,store_url,owner_note,status,notify_when_ready,contact_whatsapp,capture_json,created_at,updated_at,received_at FROM menu_import_assistance WHERE restaurant_id=? AND owner_id=? ORDER BY created_at DESC LIMIT 1";
function view(row:Row|null){
 if(!row)return null;
 const capture=row.capture_json?assistedCapture.parse(JSON.parse(row.capture_json)):null;
 return {id:row.id,storeUrl:row.store_url,ownerNote:row.owner_note,status:row.status,
  requestedAt:row.created_at,updatedAt:row.updated_at,receivedAt:row.received_at,notifyWhenReady:row.notify_when_ready===1,contactWhatsApp:row.contact_whatsapp,
  ...(capture?{stats:assistStats(capture),capture,menuText:assistanceToReaderText(capture)}:{})};
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params,row=await ownedRestaurant(id);
 const item=await env.DB!.prepare(sql).bind(id,row.ownerId).first<Row>();
 return Response.json({request:view(item),supportWhatsApp:supportContactWhatsApp()},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);assertCsrf(request);const {id}=await params,row=await ownedRestaurant(id);
 await throttle("menu-assist-owner:"+row.ownerId,8,86400);
 const input=requestInput.parse(await readJson(request,3200)),source=validAssistedSource(input.storeUrl);
 if(!source)throw new HttpError(400,"Cole um link completo da loja no iFood.");
 const active=await env.DB!.prepare("SELECT id,status FROM menu_import_assistance WHERE restaurant_id=? AND owner_id=? AND status IN ('requested','paired') LIMIT 1").bind(id,row.ownerId).first();
 if(active)throw new HttpError(409,"Já existe uma solicitação aguardando atendimento para esta pizzaria.");
 const contactWhatsApp=normalizeBrazilWhatsApp(input.contactWhatsApp);
 if(!contactWhatsApp)throw new HttpError(400,"Informe um WhatsApp brasileiro com DDD para receber nosso contato.");
 const now=new Date().toISOString(),idNew=crypto.randomUUID();
 await env.DB!.prepare("INSERT INTO menu_import_assistance (id,restaurant_id,owner_id,store_url,owner_note,notify_when_ready,contact_whatsapp,contact_consent_at,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'requested',?,?)")
 .bind(idNew,id,row.ownerId,source.url,input.ownerNote,Number(input.notifyWhenReady),contactWhatsApp,now,now,now).run();
 const item=await env.DB!.prepare(sql).bind(id,row.ownerId).first<Row>();
 return Response.json({request:view(item)},{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);assertCsrf(request);const {id}=await params,row=await ownedRestaurant(id);
 const result=await env.DB!.prepare("UPDATE menu_import_assistance SET status='cancelled',contact_whatsapp='',contact_consent_at='',pairing_hash=NULL,pairing_expires_at=NULL,updated_at=? WHERE restaurant_id=? AND owner_id=? AND status IN ('requested','paired')")
 .bind(new Date().toISOString(),id,row.ownerId).run();
 if(!result.meta.changes)throw new HttpError(409,"Não há solicitação em andamento para cancelar.");
 return Response.json({cancelled:true},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
