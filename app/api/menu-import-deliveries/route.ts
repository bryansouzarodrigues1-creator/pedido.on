import {env} from "cloudflare:workers";
import {assistedCapture,hasSafeSource,sanitizeCapture,assistStats} from "@/lib/menu-assistance-policy";
import {sha256} from "@/lib/auth-policy";
import {queueOwnerNotice} from "@/lib/push";
import {readJson,privateHeaders,errorResponse,HttpError,throttle} from "@/lib/http";
export const dynamic="force-dynamic";
function cors(origin:string|null){
 const accepted=origin&&/^chrome-extension:\/\/[a-p]{32}$/.test(origin)?origin:null;
 return {...privateHeaders,"Vary":"Origin",...(accepted?{"Access-Control-Allow-Origin":accepted,
 "Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization"}:{})};
}
export async function OPTIONS(request:Request){
 const origin=request.headers.get("origin"),headers=cors(origin);
 if(!("Access-Control-Allow-Origin" in headers))return new Response(null,{status:403,headers:privateHeaders});
 return new Response(null,{status:204,headers});
}
export async function POST(request:Request){const headers=cors(request.headers.get("origin"));try{
 if(!("Access-Control-Allow-Origin" in headers))throw new HttpError(403,"Use a extensão instalada no navegador autorizado.");
 const authorization=request.headers.get("authorization")||"";
 const token=/^Bearer ([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})\.([a-f0-9]{64})$/i.exec(authorization);
 if(!token)throw new HttpError(401,"Informe o código temporário criado pela administração.");
 await throttle("menu-assisted-delivery:"+token[1],15,3600);
 const parsed=assistedCapture.parse(await readJson(request,400000));
 const row=await env.DB!.prepare("SELECT store_url AS storeUrl,restaurant_id AS restaurantId,owner_id AS ownerId,notify_when_ready AS notifyWhenReady,status,pairing_hash AS pairingHash,pairing_expires_at AS expiresAt FROM menu_import_assistance WHERE id=?")
 .bind(token[1]).first<{storeUrl:string;restaurantId:string;ownerId:string;notifyWhenReady:number;status:string;pairingHash:string|null;expiresAt:number|null}>();
 const hash=await sha256(token[2]),nowSeconds=Math.floor(Date.now()/1000);
 if(!row||row.status!=="paired"||row.pairingHash!==hash||!row.expiresAt||row.expiresAt<=nowSeconds)throw new HttpError(401,"Código expirado, já utilizado ou inválido. Gere outro no painel.");
 if(!hasSafeSource(parsed,row.storeUrl))throw new HttpError(409,"O cardápio aberto não corresponde ao link solicitado pela pizzaria.");
 const raw=sanitizeCapture(parsed);
 const saved=await env.DB!.prepare("SELECT item_id AS itemId,source_url AS sourceUrl,media_url AS mediaUrl FROM menu_import_assistance_photos WHERE request_id=?").bind(token[1]).all<{itemId:string;sourceUrl:string;mediaUrl:string}>();
 const photos=new Map((saved.results||[]).map(entry=>[entry.itemId,entry]));
 const capture={...raw,items:raw.items.map(item=>{
  const record=photos.get(item.id);
  return {...item,imageMediaUrl:record&&record.sourceUrl===item.imageUrl?record.mediaUrl:null};
 })};
 const updated=await env.DB!.prepare("UPDATE menu_import_assistance SET status='received',capture_json=?,pairing_hash=NULL,pairing_expires_at=NULL,received_at=?,updated_at=? WHERE id=? AND status='paired' AND pairing_hash=? AND pairing_expires_at>?")
 .bind(JSON.stringify(capture),new Date().toISOString(),new Date().toISOString(),token[1],hash,nowSeconds).run();
 if(!updated.meta.changes)throw new HttpError(409,"A importação já foi recebida ou o código expirou.");
 // O aviso é opcional e não altera nem reverte o cardápio já recebido.
 if(row.notifyWhenReady===1)queueOwnerNotice(row.ownerId,"menu-ready:"+token[1],"menu",row.restaurantId);
 return Response.json({received:true,stats:assistStats(capture),message:"Dados enviados para revisão do dono. Nenhum produto foi publicado."},{headers});
}catch(e){
 const response=errorResponse(e),h=new Headers(response.headers);
 for(const [name,value] of Object.entries(headers))h.set(name,value);
 return new Response(response.body,{status:response.status,headers:h});
}}
