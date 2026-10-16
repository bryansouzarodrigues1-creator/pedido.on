import {creationTarget,type CreationTarget} from "./creation-intent.ts";
import type {RestaurantData} from "./domain.ts";
import {assistantAnswer} from "./assistant-help.ts";

/** Keep the owner's literal prompt on the image route; no paid text pass first. */
export function creationRequest(selected:CreationTarget,message:string,mode:"ai"|"local",snapshot:RestaurantData,requestId:string,productId?:string){
 const guide=assistantAnswer(message);
 if(guide?.kind==="guide")throw Error(guide.sourceText?"Abra este link no leitor do cardápio. Nenhuma geração de IA é necessária para importar produtos.":"Use a ajuda local do Estúdio para essa dúvida. Nenhuma geração de IA é necessária.");
 const resolved=creationTarget(selected,message,mode);
 if(resolved.needsChoice)throw Error("Escolha Logo, Capa, Perfil ou Foto para criar sua imagem.");
 const limit=resolved.target==="visual"?1600:600;
 if(message.trim().length>limit)throw Error(`Sua ideia foi mantida. Resuma o pedido em até ${limit===1600?"1.600":"600"} caracteres antes de criar.`);
 if(resolved.target==="product"&&!snapshot.products.some(p=>p.id===productId))throw Error("Escolha um produto desta pizzaria para a foto.");
 if(resolved.target==="visual")return {path:"studio" as const,target:resolved.target,body:{requestId,mode,message:message.trim(),snapshot,...(productId?{productId}:{}),history:[]}};
 return {path:"ai/images" as const,target:resolved.target,body:{requestId,asset:resolved.target,description:message.trim(),theme:snapshot.theme,accent:snapshot.accent,...(resolved.target==="product"?{productId}:{})}};
}
