import {z} from "zod";
import {assistedItem,assistedCapture,sanitizeCapture,assistStats,type AssistedCapture} from "./menu-assistance-policy.ts";
import {parseIfoodStoreLink} from "./menu-source-links.ts";

export const RUNNER_RESULT_MAX_BYTES=650000;
const date=z.string().max(60).refine(value=>Number.isFinite(Date.parse(value)),"A data da captura é inválida.");
const count=z.number().int().min(0).max(200);
const observedItem=assistedItem.omit({selected:true,sizeChoice:true,imageMediaUrl:true}).strict();
export const runnerResultSchema=z.object({
 format:z.literal("pizzaria-on-capture-review-v1"),
 report:z.object({
  format:z.literal("pizzaria-on-capture-report-v1"),checkedAt:date,sourceUrl:z.string().max(2048),storeId:z.string().uuid(),
  outcome:z.enum(["captured_for_review","review_required","blocked","empty","unavailable"]),
  documentStatus:z.number().int().min(100).max(599).nullable(),stopReason:z.string().min(1).max(80),
  itemCount:count,exportableCount:count,pendingCount:count,pizzaSizesPending:count,
  scrolls:z.number().int().min(0).max(40),blockedRequests:z.number().int().min(0),truncated:z.boolean(),
  completeness:z.literal("unverified"),partial:z.literal(true),elapsedMs:z.number().int().min(0)
 }).strict(),
 capture:z.object({
  status:z.literal("captured"),sourceUrl:z.string().max(2048),storeName:z.string().max(100),capturedAt:date,
  categories:z.array(z.object({name:z.string().trim().min(2).max(60),items:z.array(observedItem).min(1).max(200)}).strict()).min(1).max(200),
  itemCount:count,truncated:z.boolean(),warning:z.string().max(800).optional()
 }).strict()
}).strict().superRefine((result,context)=>{
 const issue=(message:string)=>context.addIssue({code:z.ZodIssueCode.custom,message});
 const {report,capture}=result,rows=capture.categories.flatMap(group=>group.items);
 const actual=parseIfoodStoreLink(capture.sourceUrl),requested=parseIfoodStoreLink(report.sourceUrl);
 if(report.outcome!=="captured_for_review"||!report.documentStatus||report.documentStatus<200||report.documentStatus>=300)
  issue("Esta tentativa não gerou um catálogo para entregar. Use PDF ou fotos quando o acesso estiver bloqueado.");
 if(!actual||!requested||actual.storeId!==requested.storeId||actual.storeId!==report.storeId)
  issue("A origem do resultado não corresponde à loja do relatório.");
 if(!rows.length||rows.length>200||rows.length!==capture.itemCount||rows.length!==report.itemCount||new Set(rows.map(row=>row.id)).size!==rows.length)
  issue("A quantidade ou os identificadores dos produtos estão inconsistentes.");
 if(capture.categories.some(group=>group.items.some(row=>row.category!==group.name)))issue("A categoria de um produto está inconsistente.");
 const valid=rows.filter(row=>row.available&&!row.needsReview&&row.priceCents!==null);
 if(!valid.length||valid.length!==report.exportableCount||rows.length-valid.length!==report.pendingCount)
  issue("Os produtos com preço disponível não correspondem ao relatório.");
 if(report.truncated!==capture.truncated)issue("O aviso de captura parcial está inconsistente.");
});
export type RunnerResult=z.infer<typeof runnerResultSchema>;

/** Data is still unverified and never carries client-supplied private media. */
export function runnerCaptureForAssistance(value:unknown,expectedStoreUrl:string):AssistedCapture{
 const result=runnerResultSchema.parse(value),source=parseIfoodStoreLink(result.capture.sourceUrl)!,expected=parseIfoodStoreLink(expectedStoreUrl);
 if(!expected||expected.storeId!==source.storeId)throw Error("O resultado pertence a outra loja. Use o link desta solicitação.");
 const safePhoto=(value:string|null|undefined)=>{
  if(!value)return null;
  try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:null;}catch{return null;}
 };
 return sanitizeCapture(assistedCapture.parse({sourceUrl:source.url,storeName:result.capture.storeName,capturedAt:result.capture.capturedAt,
  truncated:result.capture.truncated,items:result.capture.categories.flatMap(group=>group.items.map(item=>({...item,category:group.name,
   selected:item.available&&!item.needsReview&&item.priceCents!==null,sizeChoice:null,imageUrl:safePhoto(item.imageUrl),imageMediaUrl:null
  })))}));
}
export function runnerResultPreview(value:unknown,expectedStoreUrl:string){
 const capture=runnerCaptureForAssistance(value,expectedStoreUrl);
 return {capture,stats:assistStats(capture)};
}
