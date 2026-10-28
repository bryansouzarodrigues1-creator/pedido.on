"use client";
import {supportUploadBody} from "./support-upload-client";
type Metadata={source:"daily"|"trial"|"promotion";sourceId:string;round?:1|2;textVariant?:"whatsapp"|"status"|"instagram"|"facebook";format:"text"|"square"|"story";revision:number};
/** Preserve exported artwork and its canonical caption without calling AI.
 * Large files use an optimized archive copy; the original download is unchanged.
 * A recording failure never blocks the merchant's copy/download operation. */
export async function archiveCreative(restaurantId:string,metadata:Metadata,blob?:Blob){
 const config=await fetch("/api/auth/config",{cache:"no-store",signal:AbortSignal.timeout(10000)}),auth=await config.json() as {csrf?:string};if(!config.ok||!auth.csrf)throw Error("Histórico aguardando conexão.");
 let body:BodyInit,headers:Record<string,string>={"x-pedido-csrf":auth.csrf};
 if(blob){body=await supportUploadBody(metadata,blob);headers["Content-Type"]="application/octet-stream";}else{headers["Content-Type"]="application/json";body=JSON.stringify(metadata);}
 const r=await fetch(`/api/restaurants/${restaurantId}/creative-records`,{method:"POST",headers,body,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error("O histórico desta divulgação não foi confirmado. Seu arquivo continua disponível.");
}
