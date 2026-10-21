import {z} from "zod";
import {parseIfoodStoreLink} from "./menu-source-links.ts";

const title=z.string().trim().min(2).max(100);
const photo=z.string().url().max(1200).nullable().optional();
export const assistedItem=z.object({
 id:z.string().min(1).max(100),name:title,category:z.string().trim().min(2).max(60),
 description:z.string().max(600).default(""),priceCents:z.number().int().min(1).max(1000000).nullable(),
 rawPrice:z.string().max(120).default(""),imageUrl:photo,
 needsReview:z.boolean(),available:z.boolean(),selected:z.boolean().default(false),
 sizeChoice:z.enum(["p","m","g","unico"]).nullable().optional(),
}).strict();
export const assistedCapture=z.object({
 sourceUrl:z.string().url().max(2048),storeName:z.string().trim().max(100),
 capturedAt:z.string().max(60),truncated:z.boolean().default(false),
 items:z.array(assistedItem).min(1).max(200)
}).strict();
export type AssistedCapture=z.infer<typeof assistedCapture>;
export function validAssistedSource(url:string){return parseIfoodStoreLink(url);}
const clean=(v:string,max:number)=>v.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const money=(cents:number)=>String(Math.floor(cents/100))+","+String(cents%100).padStart(2,"0");
export function assistStats(capture:AssistedCapture){
 const valid=capture.items.filter(i=>i.selected&&i.available&&!i.needsReview&&i.priceCents!==null);
 return {total:capture.items.length,approved:valid.length,pending:capture.items.length-valid.length,
  photoReferences:capture.items.filter(i=>!!i.imageUrl).length,truncated:capture.truncated};
}
/** Never apply directly to a published menu. All entries remain reviewable. */
export function assistanceToReaderText(capture:AssistedCapture){
 const sections=new Map<string,string[]>();
 for(const item of capture.items){
  if(!item.selected||!item.available||item.needsReview||!item.priceCents)continue;
  const category=clean(item.category,60);
  const pizza=/pizza|sabor/i.test(category)&&!/combo|bebida|sobremesa|lanche/i.test(category);
  const kind=/borda/i.test(category)?"crust":pizza&&item.sizeChoice!=="unico"?"pizza":"simple";
  const key=category+"|"+kind;
  if(!sections.has(key))sections.set(key,[]);
  const size=pizza&&["p","m","g"].includes(item.sizeChoice||"")?" "+item.sizeChoice!.toUpperCase():"";
  const label=clean(item.name,100)+size+" R$ "+money(item.priceCents);
  sections.get(key)!.push(label+(item.description?"\nDescrição: "+clean(item.description,600):""));
 }
 return [...sections].map(([key,lines])=>{
  const index=key.lastIndexOf("|");return "Categoria: "+key.slice(0,index)+" ["+key.slice(index+1)+"]\n"+lines.join("\n");
 }).join("\n\n").slice(0,60000);
}
export function hasSafeSource(capture:AssistedCapture,requestedUrl:string){
 const actual=validAssistedSource(capture.sourceUrl),expected=validAssistedSource(requestedUrl);
 return !!actual&&!!expected&&actual.storeId===expected.storeId;
}
/** Photo URLs are references for owner review, never automatically fetched or rendered. */
export function sanitizeCapture(capture:AssistedCapture):AssistedCapture{
 return {...capture,items:capture.items.map(item=>({...item,
  imageUrl:item.imageUrl&&/^https:\/\//i.test(item.imageUrl)?item.imageUrl:null
 }))};
}
