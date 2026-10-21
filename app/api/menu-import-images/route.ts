import {env} from "cloudflare:workers";
import {bucket,HttpError} from "@/lib/server";
import {errorResponse,readBytes,throttle,privateHeaders} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
export const dynamic="force-dynamic";
const cors=(origin:string|null)=>{
 const allowed=origin&&/^chrome-extension:\/\/[a-p]{32}$/.test(origin)?origin:null;
 return {...privateHeaders,"Vary":"Origin",...(allowed?{"Access-Control-Allow-Origin":allowed,
  "Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization, X-Menu-Item-Id, X-Source-Image-Url"}:{})};
};
export async function OPTIONS(req:Request){const headers=cors(req.headers.get("origin"));
 return "Access-Control-Allow-Origin" in headers?new Response(null,{status:204,headers}):new Response(null,{status:403,headers:privateHeaders});}
export async function POST(request:Request){const headers=cors(request.headers.get("origin"));try{
 if(!("Access-Control-Allow-Origin" in headers))throw new HttpError(403,"Extensão não autorizada.");
 const code=/^Bearer ([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})\.([a-f0-9]{64})$/i.exec(request.headers.get("authorization")||"");
 if(!code)throw new HttpError(401,"Informe o código temporário de importação.");
 await throttle("menu-assistance-photo:"+code[1],110,3600);
 const itemId=request.headers.get("x-menu-item-id")||"";
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(itemId))throw new HttpError(400,"Item inválido.");
 const source=request.headers.get("x-source-image-url")||"";
 let link:URL;
 try{link=new URL(source);}catch{throw new HttpError(400,"Link da fotografia inválido.");}
 if(source.length>1200||link.protocol!=="https:"||link.username||link.password||
   !(link.hostname==="ifood.com.br"||link.hostname.endsWith(".ifood.com.br")))throw new HttpError(400,"A fotografia precisa vir de um endereço público do iFood.");
 const hash=await sha256(code[2]),now=Math.floor(Date.now()/1000);
 const req=await env.DB!.prepare("SELECT restaurant_id AS restaurantId,status,pairing_hash AS tokenHash,pairing_expires_at AS expiresAt FROM menu_import_assistance WHERE id=?")
 .bind(code[1]).first<{restaurantId:string;status:string;tokenHash:string|null;expiresAt:number|null}>();
 if(!req||req.status!=="paired"||req.tokenHash!==hash||!req.expiresAt||req.expiresAt<=now)throw new HttpError(401,"Código expirado ou inválido.");
 const old=await env.DB!.prepare("SELECT media_url AS mediaUrl,source_url AS sourceUrl FROM menu_import_assistance_photos WHERE request_id=? AND item_id=?")
 .bind(code[1],itemId).first<{mediaUrl:string;sourceUrl:string}>();
 if(old){if(old.sourceUrl!==source)throw new HttpError(409,"Esta foto já foi associada a outra origem.");
  return Response.json({url:old.mediaUrl,alreadyStored:true},{headers});}
 const count=await env.DB!.prepare("SELECT COUNT(*) AS total FROM menu_import_assistance_photos WHERE request_id=?").bind(code[1]).first<{total:number}>();
 if((count?.total||0)>=100)throw new HttpError(429,"Limite de 100 fotos por solicitação atingido.");
 const bytes=await readBytes(request,1500000);
 if(!bytes.length)throw new HttpError(400,"Imagem vazia.");
 let type="",ext="";
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){type="image/jpeg";ext="jpg";}
 else if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)){type="image/png";ext="png";}
 else if(new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP"){type="image/webp";ext="webp";}
 else throw new HttpError(415,"Somente imagens JPG, PNG ou WebP.");
 const objectKey=req.restaurantId+"/"+crypto.randomUUID()+"."+ext,mediaUrl="/media/"+objectKey;
 await bucket().put(objectKey,bytes,{httpMetadata:{contentType:type,cacheControl:"public, max-age=86400"}});
 try{await env.DB!.prepare("INSERT INTO menu_import_assistance_photos(id,request_id,item_id,source_url,media_url,size_bytes,created_at) VALUES(?,?,?,?,?,?,?)")
 .bind(crypto.randomUUID(),code[1],itemId,source,mediaUrl,bytes.byteLength,new Date().toISOString()).run();}
 catch(e){await bucket().delete(objectKey).catch(()=>{});throw e;}
 return Response.json({url:mediaUrl,stored:true},{status:201,headers});
}catch(e){const res=errorResponse(e),h=new Headers(res.headers);for(const [k,v] of Object.entries(headers))h.set(k,v);
 return new Response(res.body,{status:res.status,headers:h});}}
