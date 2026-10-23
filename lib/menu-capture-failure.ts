import {z} from "zod";
import {parseIfoodStoreLink} from "./menu-source-links.ts";

export const failureReason=z.enum([
 "http_401","http_403","http_429","verification_required","login_required",
 "redirect_blocked","navigation_failed","http_unavailable","different_store"
]);
export const captureFailureReport=z.object({
 format:z.literal("pizzaria-on-capture-report-v1"),
 checkedAt:z.string().max(60).refine(value=>Number.isFinite(Date.parse(value))),
 sourceUrl:z.string().max(2048),
 storeId:z.string().uuid(),
 outcome:z.enum(["blocked","empty","unavailable"]),
 documentStatus:z.number().int().min(100).max(599).nullable(),
 stopReason:failureReason,
 itemCount:z.literal(0),exportableCount:z.literal(0),pendingCount:z.literal(0),
 pizzaSizesPending:z.literal(0),scrolls:z.number().int().min(0).max(40),
 blockedRequests:z.number().int().min(0),truncated:z.boolean(),
 completeness:z.literal("unverified"),partial:z.literal(true),
 elapsedMs:z.number().int().min(0)
}).strict().superRefine((r,ctx)=>{
 if(r.stopReason.startsWith("http_") && /^http_\d+$/.test(r.stopReason) &&
   r.documentStatus!==Number(r.stopReason.slice(5)))
  ctx.addIssue({code:z.ZodIssueCode.custom,message:"O status HTTP não corresponde ao motivo informado."});
 if(r.outcome==="blocked"&&!["http_401","http_403","http_429","verification_required","login_required","redirect_blocked","different_store"].includes(r.stopReason))
  ctx.addIssue({code:z.ZodIssueCode.custom,message:"O relatório não descreve um bloqueio válido."});
 if(r.outcome!=="blocked"&&["http_401","http_403","http_429","verification_required","login_required","redirect_blocked","different_store"].includes(r.stopReason))
  ctx.addIssue({code:z.ZodIssueCode.custom,message:"O motivo de bloqueio exige o estado bloqueado."});
});
export const savedFailure=z.object({kind:z.literal("ifood-capture-failure-v1"),reason:failureReason}).strict();
export type SavedFailure=z.infer<typeof savedFailure>;
export function failureForAssistance(value:unknown,requestedStoreUrl:string):SavedFailure{
 const report=captureFailureReport.parse(value);
 const actual=parseIfoodStoreLink(report.sourceUrl),requested=parseIfoodStoreLink(requestedStoreUrl);
 if(!actual||!requested||actual.storeId!==requested.storeId||report.storeId!==actual.storeId)
  throw Error("O relatório pertence a outra loja. Não foi enviado ao proprietário.");
 return {kind:"ifood-capture-failure-v1",reason:report.stopReason};
}
export function ownerFailureMessage(reason:SavedFailure["reason"]):string{
 switch(reason){
  case "http_401":return "O iFood exigiu autorização para abrir o cardápio. Não foi possível importar produtos.";
  case "http_403":return "O iFood recusou a leitura do cardápio (HTTP 403). Nenhum produto foi importado.";
  case "http_429":return "O iFood limitou o acesso temporariamente (HTTP 429). Nenhum produto foi importado.";
  case "verification_required":return "A loja exigiu verificação humana. A leitura parou sem importar produtos.";
  case "login_required":return "O acesso ao cardápio exigiu login. Nenhum produto foi importado.";
  case "different_store":return "O link abriu outra loja. A captura foi interrompida para proteger seus dados.";
  default:return "Não foi possível concluir a leitura automática do iFood. Nenhum produto foi importado.";
 }
}
