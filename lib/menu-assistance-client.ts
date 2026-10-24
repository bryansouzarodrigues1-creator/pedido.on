import {inspectMenuSourceText} from "./menu-source-links.ts";
const key="pedido.menu-assistance-link.v1";
/** Accept the normal iFood Share message, then retain only its validated store URL. */
export function assistanceSource(input:string){
 if(input.length>6000)return null;
 const source=inspectMenuSourceText(input);
 return source.links.length===1?source.links[0]:null;
}
export function rememberAssistanceLink(input:string){
 const link=assistanceSource(input);if(!link)throw Error("Cole o link completo ou a mensagem de compartilhamento de uma única loja no iFood.");
 localStorage.setItem(key,link.url);return link;
}
export function pendingAssistanceLink(){try{return assistanceSource(localStorage.getItem(key)||"")?.url||"";}catch{return "";}}
export function clearAssistanceLink(){try{localStorage.removeItem(key);}catch{}}
export const assistanceStatusLabel=(status:string)=>({requested:"Recebida pela equipe",paired:"Em preparação",received:"Pronta para sua revisão",blocked:"Precisamos de outra fonte",cancelled:"Cancelada"})[status]||"Aguardando atualização";
