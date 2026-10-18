import {menuFileText} from "./menu-file.ts";
import type {ReaderPage} from "./menu-reader-policy.ts";
import {structuredIfoodMenu,type IfoodImportResult} from "./ifood-import.ts";
import {structuredMenuStore} from "./menu-store-info.ts";
import {parseIfoodStoreLink} from "./menu-source-links.ts";

const entities:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",aacute:"á",agrave:"à",acirc:"â",atilde:"ã",eacute:"é",ecirc:"ê",iacute:"í",oacute:"ó",ocirc:"ô",otilde:"õ",uacute:"ú",ccedil:"ç"};
function decode(value:string){return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(original,key:string)=>{if(key.startsWith("#")){const n=key[1].toLowerCase()==="x"?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):"";}const v=entities[key.toLowerCase()];return v?(key[0]===key[0].toUpperCase()&&v.length===1?v.toUpperCase():v):original;});}
/** Saved pages are data: never mount their HTML, execute scripts, or load their URLs. */
export function savedMenuPage(raw:string):{text:string;source?:IfoodImportResult}{
 if(raw.length>1500000)throw Error("Envie uma página salva de até 1,5 MB, ou salve o cardápio em PDF.");
 const urls=new Set<string>();
 for(const tag of raw.matchAll(/<(?:link|meta)\b[^>]*>/gi)){
  const attrs=Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),decode(m[2])]));
  const candidate=attrs.rel?.toLowerCase()==="canonical"?attrs.href:attrs.property?.toLowerCase()==="og:url"?attrs.content:undefined;
  const link=candidate?parseIfoodStoreLink(candidate):null;if(link)urls.add(link.url);
 }
 const url=urls.size===1?[...urls][0]:undefined,menu=structuredIfoodMenu(raw),store=url?structuredMenuStore(raw,url):undefined;
 const plain=decode(raw.replace(/<(script|style|head|noscript|svg|iframe|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi," ").replace(/<\s*br\b[^>]*>|<\/(?:p|div|li|tr|section|h[1-6])\s*>/gi,"\n").replace(/<[^>]*>/g," ")).split("\n").map(line=>line.replace(/[\t ]+/g," ").trim()).filter(Boolean).join("\n");
 const text=menu.count?menu.text:plain;
 if(text.length>60000)throw Error("Esta página tem texto demais. Salve só o cardápio em PDF ou cole uma parte por vez.");
 if(!text.trim())throw Error("A página salva não contém os produtos. Abra a loja e salve em PDF ou envie prints.");
 return {text,...(url?{source:{status:menu.count?"imported":"needs_content",url,count:menu.count,text:menu.text,...(store?{store}:{}),message:"Página salva lida. Confira os dados e os preços."} satisfies IfoodImportResult}:{})};
}
export async function readMenuAttachment(file:File,remaining=8,onProgress?:(label:string)=>void):Promise<{text:string;pages:ReaderPage[];source?:IfoodImportResult}>{
 if(/\.pdf$/i.test(file.name)||file.type==="application/pdf"){
  const {prepareMenuPdf}=await import("./menu-pdf.ts");return {text:"",pages:await prepareMenuPdf(file,remaining,onProgress)};
 }
 if(/\.html?$/i.test(file.name)){
  if(file.size>1500000)throw Error("Envie uma página salva de até 1,5 MB, ou salve o cardápio em PDF.");
  return {...savedMenuPage(await file.text()),pages:[]};
 }
 if(file.size>240000)throw Error("Envie TXT/CSV com até 60 mil caracteres.");
 const bytes=await file.arrayBuffer();let raw:string;
 try{raw=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{raw=new TextDecoder("windows-1252").decode(bytes);}
 return {text:menuFileText(file.name,raw),pages:[]};
}
