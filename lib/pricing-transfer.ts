import {z} from "zod";
export const PRICING_TRANSFER_KEY="pedido-on:calculator:menu-transfer:v1";
export const pricingTransferSchema=z.object({version:z.literal(1),name:z.string().trim().min(2).max(80),price:z.number().int().min(1).max(100000000),createdAt:z.number().int().positive()}).strict();
export function validPricingTransfer(raw:unknown,now=Date.now()){const p=pricingTransferSchema.safeParse(raw);return p.success&&p.data.createdAt<=now&&now-p.data.createdAt<86400000?p.data:null;}
