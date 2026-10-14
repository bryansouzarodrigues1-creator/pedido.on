import {z} from "zod";
export const accessMode=z.enum(["normal","grant","suspended"]);
export const accessPlan=z.enum(["essencial","profissional","rede"]);
export const adminAccessAction=z.object({
 restaurantId:z.string().trim().regex(/^[a-zA-Z0-9_-]{3,100}$/),
 mode:accessMode,
 plan:accessPlan.optional(),
 durationDays:z.union([z.literal(7),z.literal(30),z.literal(90),z.null()]).optional(),
 reason:z.string().trim().min(8).max(400),
 expectedVersion:z.number().int().min(0).max(1000000),
}).strict().superRefine((value,ctx)=>{
 if(value.mode==="grant"&&!value.plan)ctx.addIssue({code:"custom",message:"Informe o plano da cortesia."});
 if(value.mode!=="grant"&&(value.plan!==undefined||value.durationDays!==undefined))ctx.addIssue({code:"custom",message:"Não é possível definir um plano para esta ação."});
});
export type AccountAccessRecord={mode:string;plan:string|null;expiresAt:number|null};
export function effectiveAccess(row:AccountAccessRecord|null|undefined,now=Math.floor(Date.now()/1000)){
 if(!row||row.mode==="normal")return {mode:"normal" as const,plan:null,expiresAt:null};
 if(row.mode==="suspended")return {mode:"suspended" as const,plan:null,expiresAt:null};
 if(row.mode==="grant"&&row.plan&&["essencial","profissional","rede"].includes(row.plan)&&(!row.expiresAt||row.expiresAt>now))return {mode:"grant" as const,plan:row.plan as "essencial"|"profissional"|"rede",expiresAt:row.expiresAt};
 return {mode:"normal" as const,plan:null,expiresAt:null};
}
export function grantExpiry(days:7|30|90|null|undefined,now=Math.floor(Date.now()/1000)){
 return days===null?null:now+(days??30)*86400;
}

export function moreGenerousPlan(grant:"essencial"|"profissional"|"rede",paid:string|null){
 const rank={essencial:1,profissional:2,rede:3};
 if(paid==="essencial"||paid==="profissional"||paid==="rede")return rank[paid]>rank[grant]?paid:grant;
 return grant;
}
