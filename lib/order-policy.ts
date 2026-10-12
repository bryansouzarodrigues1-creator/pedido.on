import {z} from "zod";
import type {OrderSummary} from "./domain";
export const orderStatuses={awaiting_payment:"Aguardando Pix",awaiting:"Aguardando aprovação",confirmed:"Pedido confirmado",preparing:"Em preparo",out_for_delivery:"Saiu para entrega",delivered:"Concluído",canceled:"Cancelado"} as const;
export type OrderStatus=keyof typeof orderStatuses;
export type PaymentStatus="pay_on_delivery"|"pending"|"proof_sent"|"approved"|"rejected";
export const pixSchema=z.object({enabled:z.boolean().default(false),type:z.enum(["cpf","cnpj","email","phone","random"]).default("random"),key:z.string().trim().max(160).default(""),recipient:z.string().trim().max(100).default("")}).default({enabled:false,type:"random",key:"",recipient:""});
export type PixDetails=z.infer<typeof pixSchema>;
export function validPixKey(type:PixDetails["type"],key:string){
 const digits=key.replace(/\D/g,"");
 if(type==="email")return key.length<=77&&key===key.toLowerCase()&&z.string().email().safeParse(key).success;
 if(type==="phone")return /^\+[1-9]\d{1,14}$/.test(key);
 if(type==="random")return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key);
 if(type==="cnpj"&&/[a-z]/i.test(key))return /^[a-z0-9]{14}$/i.test(key.replace(/[./-]/g,""));
 const size=type==="cpf"?11:14;
 if(digits.length!==size||/^(\d)\1+$/.test(digits)||!/^[\d./-]+$/.test(key))return false;
 const check=(body:string,weights:number[])=>{const sum=[...body].reduce((n,c,i)=>n+Number(c)*weights[i],0),rem=sum%11;return rem<2?0:11-rem;};
 const first=type==="cpf"?[10,9,8,7,6,5,4,3,2]:[5,4,3,2,9,8,7,6,5,4,3,2],second=type==="cpf"?[11,10,9,8,7,6,5,4,3,2]:[6,...first];
 return check(digits.slice(0,-2),first)===Number(digits.at(-2))&&check(digits.slice(0,-1),second)===Number(digits.at(-1));
}
export type ManagedOrder={acceptedAt?:string|null;acceptedEtaMinutes?:number|null;id:string;status:string;paymentStatus:string;receiptId:string|null;receiptCount:number;version:number;estimatedAt:string|null;decisionReason:string|null;data:string;total:number;customer:string;phone:string;createdAt:string;updatedAt:string|null;pixSnapshot:string|null};
export const orderActionSchema=z.object({orderId:z.string().uuid(),version:z.number().int().positive(),action:z.enum(["accept","verify_payment","confirm","reject_receipt","prepare","dispatch","complete","cancel","eta"]),etaMinutes:z.number().int().min(5).max(240).optional(),receivedPix:z.boolean().optional(),reason:z.string().trim().min(3).max(300).optional()});
export type OrderAction=z.infer<typeof orderActionSchema>;
export function decideOrder(order:ManagedOrder,input:OrderAction,now=new Date()){
 if(input.version!==order.version)throw new Error("O pedido mudou. Confira a versão atual antes de decidir.");
 if(["delivered","canceled"].includes(order.status))throw new Error("Este pedido já foi finalizado.");
 const update:{acceptedAt?:string;acceptedEtaMinutes?:number;status?:string;paymentStatus?:string;estimatedAt?:string;decisionReason?:string|null;approvedAt?:string}= {};
 const estimate=()=>{if(!Number.isInteger(input.etaMinutes)||!input.etaMinutes||input.etaMinutes<5||input.etaMinutes>240)throw new Error("Informe o prazo entre 5 e 240 minutos.");return new Date(now.getTime()+input.etaMinutes*60000).toISOString();};
 if(input.action==="accept"){
  if(!["awaiting","awaiting_payment"].includes(order.status)||order.acceptedAt)throw new Error("Este pedido já foi aceito ou mudou de etapa.");
  estimate();update.acceptedAt=now.toISOString();update.acceptedEtaMinutes=input.etaMinutes!;update.decisionReason=null;
  if(order.paymentStatus==="pay_on_delivery"){update.status="confirmed";update.estimatedAt=estimate();update.approvedAt=now.toISOString();}
 }else if(input.action==="verify_payment"){
  if(!order.acceptedAt||order.status!=="awaiting"||order.paymentStatus!=="proof_sent"||!order.receiptId)throw new Error("Aceite o pedido e confira o comprovante antes de confirmar o Pix.");
  if(input.receivedPix!==true)throw new Error("Confirme que o valor entrou na conta bancária da pizzaria.");
  update.paymentStatus="approved";update.status="confirmed";update.estimatedAt=estimate();update.approvedAt=now.toISOString();update.decisionReason=null;
 }else if(input.action==="confirm"){
  if(order.status!=="awaiting")throw new Error("Este pedido ainda não pode ser aprovado.");
  if(order.paymentStatus!=="pay_on_delivery"){
   if(order.paymentStatus!=="proof_sent"||!order.receiptId)throw new Error("Confira o comprovante antes de aprovar.");
   if(input.receivedPix!==true)throw new Error("Confirme que o valor entrou na conta bancária da pizzaria.");
   update.paymentStatus="approved";
  }
  update.status="confirmed";update.estimatedAt=estimate();update.approvedAt=now.toISOString();update.decisionReason=null;
 }else if(input.action==="reject_receipt"){
  if(order.status!=="awaiting"||order.paymentStatus!=="proof_sent")throw new Error("Não há um comprovante aguardando conferência.");
  if(!input.reason)throw new Error("Explique por que o comprovante foi recusado.");
  update.status="awaiting_payment";update.paymentStatus="rejected";update.decisionReason=input.reason;
 }else if(input.action==="cancel"){
  if(!input.reason)throw new Error("Informe o motivo do cancelamento.");update.status="canceled";update.decisionReason=input.reason;
 }else if(input.action==="eta"){
  if(!["confirmed","preparing","out_for_delivery"].includes(order.status))throw new Error("Aprove o pedido antes de atualizar o prazo.");update.estimatedAt=estimate();
 }else{
  const method=(JSON.parse(order.data) as OrderSummary).method;
  if(input.action==="prepare"&&order.status==="confirmed")update.status="preparing";
  else if(input.action==="dispatch"&&order.status==="preparing"&&method==="delivery")update.status="out_for_delivery";
  else if(input.action==="complete"&&(order.status==="out_for_delivery"||order.status==="preparing"&&method==="pickup"))update.status="delivered";
  else throw new Error("Essa etapa não está disponível para o pedido.");
 }
 return {...update,version:order.version+1,updatedAt:now.toISOString()};
}
export const MAX_PROOF_BYTES=5*1024*1024;
export const MAX_PROOFS=5;
export function receiptType(bytes:Uint8Array,type:string){
 if(bytes.length<12||bytes.length>MAX_PROOF_BYTES)return null;
 const head=new TextDecoder('latin1').decode(bytes.slice(0,12));
 if(type==="image/png"&&bytes[0]===137&&head.slice(1,8)==="PNG\r\n\x1a\n")return {type,ext:"png"};
 if(type==="image/jpeg"&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {type,ext:"jpg"};
 if(type==="image/webp"&&head.slice(0,4)==="RIFF"&&head.slice(8,12)==="WEBP")return {type,ext:"webp"};
 if(type==="application/pdf"&&head.startsWith("%PDF-"))return {type,ext:"pdf"};
 return null;
}
export function trackingToken(header:string|null){return header&&/^[a-f0-9]{64}$/.test(header)?header:"";}
export function trackingAlive(createdAt:string,now=Date.now()){const created=Date.parse(createdAt);return Number.isFinite(created)&&created<=now&&now-created<30*86400000;}
export const receiptSql={
 insert:`INSERT INTO order_receipts (id, order_id, object_key, mime, size, created_at) SELECT ?, id, ?, ?, ?, ? FROM orders WHERE id = ? AND version = ? AND status = 'awaiting_payment' AND payment_status IN ('pending','rejected') AND receipt_count < 5`,
 attach:`UPDATE orders SET receipt_id = ?, receipt_count = receipt_count + 1, payment_status = 'proof_sent', status = 'awaiting', decision_reason = NULL, version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND status = 'awaiting_payment' AND EXISTS (SELECT 1 FROM order_receipts WHERE id = ? AND order_id = orders.id)`,
};
