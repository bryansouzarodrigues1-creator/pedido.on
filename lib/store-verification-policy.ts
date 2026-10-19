import {z} from "zod";
import {phoneNumber,type RestaurantData} from "./domain.ts";

export type StoreVerificationStatus="unverified"|"pending"|"approved"|"rejected"|"revoked"|"changed";
export const verificationLabels:Record<StoreVerificationStatus,string>={unverified:"Verificação não solicitada",pending:"Em análise",approved:"Loja verificada",rejected:"Revisão necessária",revoked:"Verificação suspensa",changed:"Dados alterados · nova análise"};
export function verificationIdentity(data:RestaurantData){return {name:data.name.trim(),whatsapp:phoneNumber(data.whatsapp),address:data.address.trim(),city:data.city.trim(),pix:data.pix.enabled?{enabled:true,type:data.pix.type,key:data.pix.key.trim(),recipient:data.pix.recipient.trim()}:{enabled:false}};}
export const verificationRequestSchema=z.object({expectedVersion:z.number().int().min(0),liveRevision:z.number().int().min(0),note:z.string().trim().max(500).default("")}).strict();
export const verificationDecisionSchema=z.object({restaurantId:z.string().min(1).max(100),expectedVersion:z.number().int().positive(),identityHash:z.string().regex(/^[a-f0-9]{64}$/),decision:z.enum(["approved","rejected","revoked"]),reason:z.string().trim().min(8).max(500),confirmedReview:z.literal(true)}).strict();
export const reportCategories={non_delivery:"Pedido não entregue",payment:"Problema com pagamento",impersonation:"Suspeita de loja falsa",other:"Outro problema"} as const;
export const storeReportSchema=z.object({requestId:z.string().uuid(),category:z.enum(["non_delivery","payment","impersonation","other"]),detail:z.string().trim().min(15).max(2000),contact:z.string().trim().max(120).default(""),orderReference:z.string().trim().max(80).default(""),website:z.string().max(0).optional()}).strict();
export const reportDecisionSchema=z.object({id:z.string().uuid(),expectedVersion:z.number().int().positive(),status:z.enum(["resolved","dismissed"]),resolution:z.string().trim().min(8).max(500)}).strict();
