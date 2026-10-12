import {creationTarget,type CreationTarget} from "./creation-intent.ts";
import type {RestaurantData} from "./domain.ts";

/** Keep the owner's literal prompt on the image route; no paid text pass first. */
export function creationRequest(selected:CreationTarget,message:string,mode:"ai"|"local",snapshot:RestaurantData,requestId:string,productId?:string){
 const resolved=creationTarget(selected,message,mode);
 if(resolved.needsChoice)throw Error("Escolha Logo, Capa, Perfil ou Foto para criar sua imagem.");
 if(resolved.target==="product"&&!snapshot.products.some(p=>p.id===productId))throw Error("Escolha um produto desta pizzaria para a foto.");
 if(resolved.target==="visual")return {path:"studio" as const,target:resolved.target,body:{requestId,mode,message:message.trim(),snapshot,...(productId?{productId}:{}),history:[]}};
 return {path:"ai/images" as const,target:resolved.target,body:{requestId,asset:resolved.target,description:message.trim(),theme:snapshot.theme,accent:snapshot.accent,...(resolved.target==="product"?{productId}:{})}};
}
