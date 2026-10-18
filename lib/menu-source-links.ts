export type IfoodStoreLink={provider:"ifood";url:string;storeId:string;storeLabel:string;locationLabel:string};
export type MenuSourceText={status:"none"|"ifood"|"multiple"|"unsupported";links:IfoodStoreLink[];menuText:string};

const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const slug=/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
// iFood keeps punctuation as separator runs, e.g. master-pizzas---buzios.
// Validate that public store path without collapsing or rewriting its hyphens.
const storeSlug=/^[\p{L}\p{N}]+(?:-+[\p{L}\p{N}]+)*$/u;
const states=new Set("ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to".split(" "));
const urls=/(?:https?:\/\/|(?:www\.)?ifood\.com\.br\/)[^\s<>"'`]+/gi;
const price=/(?:R\s*\$\s*\d|\b\d+[,.]\d{2}\b)/i;
const shareLine=/^(?:esse lugar e a sua cara[!.]?|use o icone de coracao.*favoritos[!.]?)$/;
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const label=(value:string)=>value.split(/-+/).map(word=>word.charAt(0).toLocaleUpperCase("pt-BR")+word.slice(1)).join(" ");
const captionLabel=(value:string)=>normalize(value).replace(/^esse lugar e a sua cara[!.]?\s*/,"").replace(/^use o icone de coracao.*?favoritos[!.]?\s*/,"").replace(/[-–—\s]+/g," ").trim();

/** Read the public reference only. Slug labels are hints, not verified store data. */
export function parseIfoodStoreLink(input:string):IfoodStoreLink|null{
 if(input.length>2048)return null;
 const value=input.trim().replace(/[)\]},;.!?]+$/g,"");
 const candidate=/^(?:www\.)?ifood\.com\.br\//i.test(value)?"https://"+value:value;
 try{
  const url=new URL(candidate);
  if(url.protocol!=="https:"||!new Set(["ifood.com.br","www.ifood.com.br"]).has(url.hostname)||url.port||url.username||url.password)return null;
  const match=url.pathname.match(/^\/delivery\/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
  if(!match)return null;
  const [city,store,id]=match.slice(1).map(value=>decodeURIComponent(value));
  if(city.length>160||store.length>160||!slug.test(city)||!storeSlug.test(store)||!uuid.test(id))return null;
  const cityParts=city.split("-"),state=cityParts.at(-1)!.toLowerCase();
  if(cityParts.length<2||!states.has(state))return null;
  return {provider:"ifood",url:`https://www.ifood.com.br/delivery/${encodeURIComponent(city)}/${encodeURIComponent(store)}/${id.toLowerCase()}`,storeId:id.toLowerCase(),storeLabel:label(store),locationLabel:label(cityParts.slice(0,-1).join("-"))+" · "+state.toUpperCase()};
 }catch{return null;}
}

/** Strip URLs/share wrappers before they reach the existing product reader. */
export function inspectMenuSourceText(input:string):MenuSourceText{
 const text=input.slice(0,60000),links:IfoodStoreLink[]=[],seen=new Set<string>(),matches=[...text.matchAll(urls)],hasUrls=matches.length>0;
 for(const match of matches){const link=parseIfoodStoreLink(match[0]);if(link&&!seen.has(link.storeId)){seen.add(link.storeId);links.push(link);}}
 const lines=text.split(/\r?\n/),menuText=lines.flatMap((line,index)=>{
  const hasLineUrl=[...line.matchAll(urls)].length>0;
  const clean=line.replace(urls,"").trim();
  const caption=captionLabel(clean);
  const sharedCaption=/-\s*$/.test(clean)&&[...String(lines[index+1]||"").matchAll(urls)].some(match=>{
   const link=parseIfoodStoreLink(match[0]),name=link&&captionLabel(link.storeLabel);return name&&caption&&(name===caption||name.startsWith(caption+" "));
  });
  if(hasLineUrl&&!price.test(clean)||hasUrls&&shareLine.test(normalize(clean))||sharedCaption)return [];
  return [clean];
 }).join("\n").trim();
 return {status:links.length>1?"multiple":links.length?"ifood":hasUrls?"unsupported":"none",links,menuText};
}

/** A share caption is a name suggestion, never a verified catalog fact. */
export function sharedIfoodStoreName(input:string):string|undefined{
 const source=inspectMenuSourceText(input);if(source.links.length!==1)return;
 const match=[...input.slice(0,60000).matchAll(urls)].find(match=>parseIfoodStoreLink(match[0])?.storeId===source.links[0].storeId);if(!match)return;
 const prefix=input.slice(0,match.index),header=/^\s*Esse lugar [ée] a sua cara[!.]?\s*Use o [íi]cone de cora[çc][ãa]o[\s\S]*?Favoritos[!.]?\s*/i;
 if(!header.test(prefix))return;
 const name=prefix.replace(header,"").replace(/\s*[-–—]\s*$/,"").replace(/\s+/g," ").trim();
 if(name.length<2||name.length>100||name.split(/\s+/).length>12||/[<>:{}]|\/\/|R\s*\$/i.test(name))return;
 const caption=captionLabel(name),pathName=captionLabel(source.links[0].storeLabel);
 return caption&&(pathName===caption||pathName.startsWith(caption+" "))?name:undefined;
}

/** Merge a chat handoff after loading the owner's checkpoint, without truncating it. */
export function mergeMenuSourceText(current:string,incoming:string){
 const next=incoming.trim(),source=inspectMenuSourceText(next);
 if(!source.links.length)throw Error("Cole um link completo de loja no iFood.");
 if(current.includes(next))return current;
 const existing=inspectMenuSourceText(current);
 if(!source.menuText&&source.links.every(link=>existing.links.some(old=>old.storeId===link.storeId)))return current;
 const merged=current+(current&&!current.endsWith("\n")?"\n":"")+next;
 if(merged.length>60000)throw Error("Sua leitura está cheia. Importe uma parte ou reduza o texto para acrescentar o link sem cortar o conteúdo guardado.");
 return merged;
}

export function mergeReaderSource(current:string,incoming:string){
 if(inspectMenuSourceText(incoming).links.length)return mergeMenuSourceText(current,incoming);
 const text=incoming.trim();if(!text||current.includes(text))return current;
 const merged=current+(current&&!current.endsWith("\n")?"\n":"")+text;
 if(merged.length>60000)throw Error("Importe uma parte antes de acrescentar mais texto. Sua leitura atual foi mantida.");return merged;
}
