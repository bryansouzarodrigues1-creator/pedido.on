"use client";
import {frameSupportUpload} from "./support-upload-policy";
/** Keep the authenticated upload below the existing 5 MB public gateway limit.
 * Normal images remain byte-for-byte intact. Only large files get a WebP copy;
 * the merchant's original PNG download is kept separately and unchanged. */
export async function supportUploadBody(metadata:unknown,source:Blob){
 let image=source;
 if(image.size>4*1024*1024){const bitmap=await createImageBitmap(image);try{const scale=Math.min(1,2600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext("2d");if(!ctx)throw Error("Não foi possível preparar a imagem.");ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);for(const quality of [.94,.86,.76]){image=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Não foi possível preparar o arquivo.")),"image/webp",quality));if(image.size<=4*1024*1024)break;}}finally{bitmap.close();}}
 if(image.size>4*1024*1024)throw Error("Reduza o tamanho da imagem antes de enviar.");return frameSupportUpload(metadata,image);
}
