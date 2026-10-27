import {ownedRestaurant,owner} from "@/lib/server";
import {assertCsrf} from "@/lib/auth";
import {sameOrigin,privateHeaders,errorResponse,readBytes,readJson,HttpError,throttle} from "@/lib/http";
import {restaurantSchema} from "@/lib/domain";
import {creativeArchiveInput} from "@/lib/restaurant-support-policy";
import {saveSupportItem} from "@/lib/restaurant-support";
import {sha256} from "@/lib/auth-policy";
import {dailyCampaigns,campaignMessage} from "@/lib/daily-campaigns";
import {trialIdeas,campaignCaption} from "@/lib/trial-campaign-policy";
import {promotionMessage,isActivePromotion} from "@/lib/promotions";
import {readCampaigns} from "@/lib/trial-campaigns";
import {decodeSupportUpload} from "@/lib/support-upload-policy";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(request);assertCsrf(request);const user=await owner(),{id}=await params,row=await ownedRestaurant(id,user.userId);await throttle("creative-archive:"+user.userId,200,86400);
 let input,file:File|null=null;
 if((request.headers.get("content-type")||"").startsWith("application/octet-stream")){const bytes=await readBytes(request,10*1024*1024+16000);let decoded;try{decoded=decodeSupportUpload(bytes);}catch{throw new HttpError(400,"O arquivo da divulgação está incompleto.");}input=creativeArchiveInput.parse(decoded.metadata);file=decoded.file;
 }else if((request.headers.get("content-type")||"").startsWith("multipart/form-data")){const bytes=await readBytes(request,10*1024*1024+16000),form=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:bytes as BodyInit}).formData();let metadata;try{metadata=JSON.parse(String(form.get("metadata")||""));}catch{throw new HttpError(400,"Confira os dados da divulgação.");}input=creativeArchiveInput.parse(metadata);const upload=form.get("file");if(upload instanceof File)file=upload;
 }else input=creativeArchiveInput.parse(await readJson(request,2000));
 if(!row.published||!row.publishedData||row.liveRevision!==input.revision)throw new HttpError(409,"O cardápio publicado mudou. Confira a divulgação novamente.");
 if(input.format!=="text"&&!file||input.format==="text"&&file)throw new HttpError(400,"Envie o formato correto da divulgação.");
 const data=restaurantSchema.parse(JSON.parse(row.publishedData)),link=new URL(request.url).origin+"/p/"+row.slug;let text="";
 if(input.source==="daily"){const idea=dailyCampaigns(data).find(c=>c.id===input.sourceId);if(!idea||idea.kind!=="product")throw new HttpError(409,"Confira a sugestão atual antes de salvar.");text=campaignMessage(data,idea,link,input.textVariant||"whatsapp");}
 else if(input.source==="trial"){const idea=trialIdeas(data,input.round||1).find(c=>c.id===input.sourceId);if(!idea||idea.kind!=="product")throw new HttpError(409,"Confira o produto da rodada.");const kit=(await readCampaigns(row)).records.find(r=>r.round===(input.round||1));text=campaignCaption(data,idea,link,kit?.proposal?.productDescriptions.find(p=>p.id===idea.items[0].productId)?.description||"");}
 else{const promotion=data.promotions.find(p=>p.id===input.sourceId);if(!promotion||!isActivePromotion(data,promotion))throw new HttpError(409,"Confira a promoção publicada antes de salvar.");text=promotionMessage(data,promotion,link);}
 const requestId=await sha256(JSON.stringify([input,text,file?await sha256(String(file.size)+":"+file.type+":"+[...new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()))].join(",")):""]));
 const result=await saveSupportItem(row,user.userId,"owner",{requestId,kind:"promotion",asset:"archive",productId:"",message:`${input.source==="daily"?"Destaque do dia":input.source==="trial"?"Kit Free · rodada "+(input.round||1):"Promoção"} · ${input.format==="text"?"Texto":input.format==="square"?"Feed quadrado":"Story / Status"}\n\n${text}`},file);
 return Response.json(result,{status:201,headers:privateHeaders});
}catch(e){return errorResponse(e);}}
