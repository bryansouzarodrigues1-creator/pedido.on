import type {IfoodImportResult} from "./ifood-import.ts";
import {rememberAssistanceLink} from "./menu-assistance-client.ts";
import {parseIfoodStoreLink} from "./menu-source-links.ts";
/** Kept for older callers: no catalog request, crawler or paid provider is invoked. */
export async function fetchMenuSource(url:string):Promise<IfoodImportResult>{
 const link=parseIfoodStoreLink(url);if(!link)throw Error("Cole um link completo da loja no iFood.");
 try{rememberAssistanceLink(link.url);}catch{}
 return {url:link.url,status:"needs_content",text:"",count:0,message:"Link guardado como referência. Use Solicitar trazer meu cardápio via link para enviar à equipe. Você acompanha a entrega pelo painel; nenhum produto foi importado automaticamente."};
}
