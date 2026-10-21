import {restaurantSchema,type RestaurantData} from "./domain.ts";
const imagePath=/^(?:\/assets\/[a-zA-Z0-9._/-]+|\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)$/;
export function previewImage(value:unknown):string{
 if(value==="")return "";
 if(typeof value!=="string"||value.length>1400000)throw Error("Reduza o tamanho das imagens antes de compartilhar.");
 if(imagePath.test(value)&&!value.includes(".."))return value;
 const match=value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/);if(!match)throw Error("Use imagens JPG, PNG ou WebP no seu cardápio.");
 const bytes=atob(match[2].slice(0,32)),valid=match[1]==="jpeg"?bytes.charCodeAt(0)===255&&bytes.charCodeAt(1)===216:match[1]==="png"?bytes.startsWith("\x89PNG\r\n\x1a\n"):bytes.startsWith("RIFF")&&bytes.slice(8,12)==="WEBP";
 if(!valid)throw Error("Uma das imagens não pôde ser conferida.");return value;
}
export function parseGuestPreview(raw:unknown):RestaurantData{
 if(!raw||typeof raw!=="object")throw Error("Confira os dados do cardápio.");
 const v=raw as Record<string,unknown>;if(!Array.isArray(v.products))throw Error("Confira os produtos do cardápio.");
 const images=v.products.map(p=>previewImage((p as {image?:unknown}).image||""));
 const data=restaurantSchema.parse({...v,logo:"",cover:"",products:v.products.map(p=>({...p as object,image:""}))});
 return {...data,logo:previewImage(v.logo||""),cover:previewImage(v.cover||""),products:data.products.map((p,i)=>({...p,image:images[i]}))};
}
export const previewTokenPattern=/^[a-f0-9]{32}$/;
export const guestPreviewLifetime=7*86400;
