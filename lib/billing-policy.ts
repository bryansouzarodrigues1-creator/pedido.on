export type PaidSubscription={status:string;paidThrough:number;paidPlan:string};
export function paidPlan(subscription:PaidSubscription|null|undefined,now=Math.floor(Date.now()/1000)){
  return subscription&&["active","trialing","past_due"].includes(subscription.status)&&subscription.paidThrough>now&&["essencial","profissional","rede"].includes(subscription.paidPlan)?subscription.paidPlan:null;
}
export function paymentEntitlement(previous:{subscriptionId:string;paidThrough:number;paidPlan:string}|null|undefined,id:string,plan:string,periodEnd:number,invoice:{status:string;lines:{data:{period:{end:number};pricing?:{price_details?:{price:string}};price?:{id:string}}[]}}|null|undefined,priceId:string){
  const retained=previous?.subscriptionId===id?{paidThrough:previous.paidThrough,paidPlan:previous.paidPlan}:{paidThrough:0,paidPlan:""};
  if(invoice?.status!=="paid")return retained;
  const line=invoice.lines?.data.find(l=>(l.pricing?.price_details?.price||l.price?.id)===priceId);
  const end=Math.min(periodEnd,line?.period.end||0);
  return end>0&&end>=retained.paidThrough?{paidThrough:end,paidPlan:plan}:retained;
}
