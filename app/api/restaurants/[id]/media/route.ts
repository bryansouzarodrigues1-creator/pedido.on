import {ownedRestaurant,sameOrigin,bucket,errorResponse,HttpError} from "@/lib/server";
import {readBytes,throttle} from "@/lib/http";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
  sameOrigin(request);const {id}=await params;const row=await ownedRestaurant(id);await throttle("upload-owner:"+row.ownerId,100,86400);
  if(Number(request.headers.get("content-length")||0)>2300000)throw new HttpError(413,"Envie uma imagem de até 2 MB.");
  const body=await readBytes(request,2300000);const form=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")||""},body:body as BodyInit}).formData(),file=form.get("file");if(!(file instanceof File)||file.size===0||file.size>2097152)throw new HttpError(400,"Envie uma imagem de até 2 MB.");
  const bytes=new Uint8Array(await file.arrayBuffer());let ext="",type="";
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff){ext="jpg";type="image/jpeg";}
  else if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)){ext="png";type="image/png";}
  else if(new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP"){ext="webp";type="image/webp";}
  else throw new HttpError(400,"Use uma imagem JPG, PNG ou WebP.");
  const key=`${id}/${crypto.randomUUID()}.${ext}`;await bucket().put(key,bytes,{httpMetadata:{contentType:type,cacheControl:"public, max-age=86400"}});return Response.json({url:`/media/${key}`},{status:201});
}catch(e){return errorResponse(e);}}
