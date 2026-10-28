import {env} from "cloudflare:workers";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {restaurantSchema} from "./domain";
import {HttpError,readBytes,readJson} from "./http";
import {sha256} from "./auth-policy";
import {recordNotice} from "./account-notices";
import {studioProposal} from "./studio-policy";
import {importedMenu} from "./ai-menu";
import {readCampaigns} from "./trial-campaigns";
import {curatedWelcome} from "./welcome-campaign-seeds";
import {storeVerification} from "./store-verification";
import {supportInput,supportMedia,creativeCursor,type CreativeEntry,type SupportItem} from "./restaurant-support-policy";
import {decodeSupportUpload} from "./support-upload-policy";
const db=()=>env.DB!;
export async function supportRestaurant(id:string){const row=await getDb().select().from(restaurants).where(eq(restaurants.id,id)).get();if(!row)throw new HttpError(404,"Pizzaria não encontrada.");return row;}
export async function readSupport(id:string,all=false){const rows=await db().prepare("SELECT id,kind,actor_role AS actorRole,asset,product_id AS productId,message,url,state,version,created_at AS createdAt,updated_at AS updatedAt FROM restaurant_support WHERE restaurant_id=?"+(all?"":" AND state='available' AND actor_role='admin'")+" ORDER BY created_at DESC,id DESC LIMIT 100").bind(id).all<SupportItem>();return rows.results.map(r=>({...r,url:supportMedia(r.url,id)?r.url:""}));}
export async function readSupportBody(request:Request){
 if((request.headers.get("content-type")||"").startsWith("application/octet-stream")){const bytes=await readBytes(request,5*1024*1024+16000);let decoded;try{decoded=decodeSupportUpload(bytes);}catch{throw new HttpError(400,"O arquivo do envio está incompleto ou inválido.");}return {input:supportInput.parse(decoded.metadata),file:decoded.file};}
 if(!(request.headers.get("content-type")||"").startsWith("multipart/form-data"))return {input:supportInput.parse(await readJson(request,6000)),file:null};
 const bytes=await readBytes(request,5*1024*1024+16000),form=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:bytes as BodyInit}).formData();
 let raw;try{raw=JSON.parse(String(form.get("metadata")||""));}catch{throw new HttpError(400,"Confira os dados do envio.");}const input=supportInput.parse(raw),file=form.get("file");if(!(file instanceof File))throw new HttpError(400,"Escolha uma foto ou arte.");return {input,file};
}
export async function supportFile(file:File,maxBytes=5*1024*1024){
 if(!file.size||file.size>maxBytes)throw new HttpError(413,`Envie uma imagem de até ${Math.floor(maxBytes/1024/1024)} MB.`);const bytes=new Uint8Array(await file.arrayBuffer());let ext="",mime="";
 if(bytes.length>20&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){ext="jpg";mime="image/jpeg";}
 else if(bytes.length>24&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),w=view.getUint32(16),h=view.getUint32(20);if(!w||!h||w*h>40000000)throw new HttpError(400,"Reduza as dimensões da imagem.");ext="png";mime="image/png";}
 else if(bytes.length>20&&new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP"){ext="webp";mime="image/webp";}
 else throw new HttpError(400,"Use uma imagem JPG, PNG ou WebP. SVG e outros arquivos não são aceitos.");
 const hash=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(v=>v.toString(16).padStart(2,"0")).join("");return {bytes,ext,mime,hash};
}
type Save={requestId:string;kind:string;asset:string;productId:string;message:string};
export async function saveSupportItem(row:Awaited<ReturnType<typeof supportRestaurant>>,actorId:string,actorRole:"admin"|"owner",input:Save,file:File|null){
 const data=restaurantSchema.parse(JSON.parse(row.data));if(input.productId&&!data.products.some(p=>p.id===input.productId))throw new HttpError(400,"Escolha um produto desta pizzaria.");
 if(input.kind==="image"&&!file)throw new HttpError(400,"Escolha a foto que será enviada.");if(file&&!["image","promotion"].includes(input.kind))throw new HttpError(400,"Este envio recebe somente texto.");
 const image=file?await supportFile(file,actorRole==="owner"&&input.kind==="promotion"?10*1024*1024:5*1024*1024):null,inputHash=await sha256(JSON.stringify({...input,actorRole,image:image?.hash||""}));
 const existing=await db().prepare("SELECT id,input_hash FROM restaurant_support WHERE restaurant_id=? AND request_id=?").bind(row.id,input.requestId).first<{id:string;input_hash:string}>();if(existing){if(existing.input_hash!==inputHash)throw new HttpError(409,"Este envio já foi usado com outro conteúdo.");return {id:existing.id,reused:true};}
 const id=crypto.randomUUID(),stamp=new Date().toISOString(),url=image?`/media/${row.id}/support-${image.hash}.${image.ext}`:"";
 if(image){if(!env.BUCKET)throw new HttpError(503,"O envio de imagens está temporariamente indisponível.");await env.BUCKET.put(url.slice(7),image.bytes,{httpMetadata:{contentType:image.mime,cacheControl:"private, max-age=3600"}});}
 const result=await db().prepare("INSERT INTO restaurant_support(id,restaurant_id,request_id,input_hash,actor_id,actor_role,kind,asset,product_id,message,url,state,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,'available',1,?,?,?) ON CONFLICT(restaurant_id,request_id) DO NOTHING").bind(id,row.id,input.requestId,inputHash,actorId,actorRole,input.kind,input.asset,input.productId,input.message,url,stamp,stamp,actorId).run();
 if(!result.meta.changes){const other=await db().prepare("SELECT id,input_hash FROM restaurant_support WHERE restaurant_id=? AND request_id=?").bind(row.id,input.requestId).first<{id:string;input_hash:string}>();if(other?.input_hash!==inputHash)throw new HttpError(409,"Outro conteúdo foi salvo nesta tentativa.");return {id:other.id,reused:true};}
 if(actorRole==="admin")await recordNotice(row.ownerId,{event:"support:"+id,title:input.kind==="image"?"Uma imagem preparada para sua loja":input.kind==="text"?"Seu texto de divulgação chegou":"Uma sugestão para suas próximas criações",body:"A equipe deixou conteúdo para você conferir em Criar com IA. Você decide o que usar no cardápio.",path:"/app?loja="+encodeURIComponent(row.id)+"&apoio=1"});
 return {id,reused:false};
}
export async function supportState(restaurantId:string,actorId:string,admin:boolean,input:{id:string;expectedVersion:number;state:string}){
 const current=await db().prepare("SELECT actor_role,kind FROM restaurant_support WHERE id=? AND restaurant_id=?").bind(input.id,restaurantId).first<{actor_role:string;kind:string}>();if(!current)throw new HttpError(404,"Conteúdo não encontrado nesta pizzaria.");if(!admin&&current.kind==="guidance")throw new HttpError(403,"Peça à equipe para atualizar esta orientação.");
 const r=await db().prepare("UPDATE restaurant_support SET state=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND restaurant_id=? AND version=?").bind(input.state,new Date().toISOString(),actorId,input.id,restaurantId,input.expectedVersion).run();if(!r.meta.changes)throw new HttpError(409,"O conteúdo mudou. Atualize antes de decidir.");
}
export async function creativeHistory(row:Awaited<ReturnType<typeof supportRestaurant>>,raw:string|null){
 let cursor:null|import("zod").infer<typeof creativeCursor>=null;if(raw){try{if(raw.length>500)throw Error();cursor=creativeCursor.parse(JSON.parse(atob(raw.replace(/-/g,"+").replace(/_/g,"/"))));}catch{throw new HttpError(400,"Atualize o histórico de criações.");}}
 const union=`SELECT id,'image' source,created_at,state,result_url url,prompt message,asset,'' product_id,NULL result FROM image_jobs WHERE owner_id=? AND restaurant_id=? UNION ALL SELECT id,'studio',created_at,state,'',prompt,'','',result FROM studio_jobs WHERE owner_id=? AND restaurant_id=? AND request_id NOT LIKE 'customer:%' UNION ALL SELECT id,'import',created_at,state,'','','','',result FROM ai_jobs WHERE owner_id=? AND restaurant_id=? UNION ALL SELECT id,'support',created_at,state,url,message,asset,product_id,NULL FROM restaurant_support WHERE restaurant_id=? UNION ALL SELECT id,'campaign',created_at,'prepared','',brief,'','',proposal FROM trial_campaigns WHERE owner_id=? AND restaurant_id=?`;
 const args=[row.ownerId,row.id,row.ownerId,row.id,row.ownerId,row.id,row.id,row.ownerId,row.id];const filter=cursor?" WHERE created_at<? OR (created_at=? AND id<?) OR (created_at=? AND id=? AND source<?)":"";
 type Raw={id:string;source:string;created_at:string;state:string;url:string|null;message:string|null;asset:string;product_id:string;result:string|null};
 const records=(await db().prepare("SELECT * FROM ("+union+")"+filter+" ORDER BY created_at DESC,id DESC,source DESC LIMIT 21").bind(...args,...(cursor?[cursor.at,cursor.at,cursor.id,cursor.at,cursor.id,cursor.source]:[])).all<Raw>()).results;
 const entries:CreativeEntry[]=records.slice(0,20).map(r=>{let result:unknown=null,message=r.message||"";try{if(r.source==="studio"){const p=JSON.parse(message);message=String(p.message||"");}if(r.result)result=r.source==="import"?importedMenu.parse(JSON.parse(r.result)):studioProposal.parse(JSON.parse(r.result));}catch{result=null;}return {id:r.id,source:r.source,createdAt:r.created_at,state:r.state,label:({image:"Imagem com IA",studio:"Texto e visual com IA",import:"Leitura do cardápio com IA",support:r.asset==="archive"?"Divulgação salva":"Conteúdo da equipe",campaign:"Kit de divulgação"} as Record<string,string>)[r.source],message:message.slice(0,8000),url:r.url&&supportMedia(r.url,row.id)?r.url:"",asset:r.asset,productId:r.product_id,result};});
 const last=records[19],nextCursor=records.length>20&&last?btoa(JSON.stringify({at:last.created_at,id:last.id,source:last.source})).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""):null;
 return {entries,nextCursor};
}
export async function adminRestaurantWorkspace(id:string,cursor:string|null=null){
 const row=await supportRestaurant(id),data=restaurantSchema.parse(JSON.parse(row.data)),publishedData=row.publishedData?restaurantSchema.parse(JSON.parse(row.publishedData)):null;
 const [profile,verification,history,support,campaigns]=await Promise.all([db().prepare("SELECT name,email FROM account_profiles WHERE owner_id=?").bind(row.ownerId).first<{name:string;email:string}>(),storeVerification(row),creativeHistory(row,cursor),readSupport(id,true),readCampaigns(row)]);
 return {restaurant:{id:row.id,name:row.name,slug:row.slug,published:row.published,revision:row.revision,liveRevision:row.liveRevision,data,publishedData},profile,verification,history,support,campaigns,curated:[1,2].flatMap(n=>{const kit=curatedWelcome(row.slug,data,n);return kit?[kit]:[];})};
}
export type AdminRestaurantWorkspace=Awaited<ReturnType<typeof adminRestaurantWorkspace>>;
