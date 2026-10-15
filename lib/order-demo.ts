import {z} from "zod";
import {calculateOrder,demoRestaurant} from "./domain.ts";
import {ticketOptions} from "./order-ticket.ts";
import type {ManagedOrder,OrderStatus} from "./order-policy.ts";

export type DemoPaymentMode="pix"|"cash";
export const DEMO_ORDER_ID="00000000-0000-4000-8000-000000000001";
export function createDemoOrder(mode:DemoPaymentMode="pix",now=new Date()):ManagedOrder&{restaurantId:string;status:OrderStatus;receiptMime:string|null}{
 const summary=calculateOrder(demoRestaurant(),{requestId:DEMO_ORDER_ID,customer:"Cliente de exemplo",phone:"(11) 99999-9999",method:"delivery",address:"Rua de exemplo, 120 · Centro",payment:mode==="pix"?"Pix":"Dinheiro",note:"Não tocar a campainha",coupon:"",items:[{productIds:["margherita"],size:"g",crustId:"catupiry",quantity:1,note:"Sem manjericão"},{productIds:["refri"],quantity:1,note:""}]});
 return {acceptedAt:null,acceptedEtaMinutes:null,id:DEMO_ORDER_ID,restaurantId:"demo",status:mode==="pix"?"awaiting_payment":"awaiting",paymentStatus:mode==="pix"?"pending":"pay_on_delivery",receiptId:null,receiptMime:null,receiptCount:0,version:1,estimatedAt:null,decisionReason:null,data:JSON.stringify(summary),total:summary.total,customer:summary.customer,phone:"5511999999999",createdAt:now.toISOString(),updatedAt:null,pixSnapshot:mode==="pix"?JSON.stringify({enabled:true,type:"random",key:"DEMONSTRAÇÃO · NÃO PAGAR",recipient:"Casa da Pizza · exemplo"}):null};
}
export const demoTicketOptions=ticketOptions.extend({mode:z.enum(["pix","cash"]).default("pix"),status:z.enum(["awaiting_payment","awaiting","confirmed","preparing","out_for_delivery","delivered","canceled"]).default("confirmed"),paymentStatus:z.enum(["pending","rejected","proof_sent","approved","pay_on_delivery"]).default("approved")}).strict().superRefine((value,ctx)=>{
 const valid=value.mode==="cash"?value.paymentStatus==="pay_on_delivery"&&value.status!=="awaiting_payment":value.paymentStatus!=="pay_on_delivery"&&(value.status==="canceled"||value.status==="awaiting_payment"&&["pending","rejected"].includes(value.paymentStatus)||value.status==="awaiting"&&value.paymentStatus==="proof_sent"||["confirmed","preparing","out_for_delivery","delivered"].includes(value.status)&&value.paymentStatus==="approved");
 if(!valid)ctx.addIssue({code:z.ZodIssueCode.custom,message:"Escolha uma etapa válida da demonstração."});
});
export function demoTicketOrder(options:z.infer<typeof demoTicketOptions>,now=new Date()){
 const order=createDemoOrder(options.mode,now);return {...order,status:options.status,paymentStatus:options.paymentStatus,version:1,updatedAt:now.toISOString()};
}
export function demoTicketUrl(order:Pick<ManagedOrder,"status"|"paymentStatus">,copy:"kitchen"|"delivery"){
 return "/demo/pedidos/comanda?"+new URLSearchParams({copy,mode:order.paymentStatus==="pay_on_delivery"?"cash":"pix",status:order.status,paymentStatus:order.paymentStatus});
}
