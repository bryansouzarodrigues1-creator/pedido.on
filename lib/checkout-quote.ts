import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {deliveryChecks} from "@/db/schema";
import {calculateOrder,type RestaurantData,type OrderInput} from "./domain";
import {HttpError} from "./http";
import {sha256} from "./auth-policy";
import {deliveryApprovalEnabled} from "./delivery-config";
import {canUseDeliveryCheck,sameDeliveryContact} from "./delivery-policy";
import {approvedDeliveryFee,neighborhoodKey} from "./delivery-zone-policy";

/** Both checkout channels use the published catalog and the same delivery approval. */
export async function checkoutQuote(restaurantId:string,data:RestaurantData,input:OrderInput,requireDeliveryApproval=true){
 let confirmedFee=data.deliveryFee;
 if(input.method==="delivery"&&requireDeliveryApproval&&deliveryApprovalEnabled()){
  if(!input.deliveryCheckId||!input.deliveryCheckToken)throw new HttpError(403,"Confirme o endereço de entrega antes de finalizar.");
  const check=await getDb().select().from(deliveryChecks).where(and(eq(deliveryChecks.id,input.deliveryCheckId),eq(deliveryChecks.restaurantId,restaurantId),eq(deliveryChecks.tokenHash,await sha256(input.deliveryCheckToken)))).get();
  if(!check||!canUseDeliveryCheck(check)||!sameDeliveryContact(check,{phone:input.phone,address:input.address})||neighborhoodKey(check.neighborhood||"")!==neighborhoodKey(input.neighborhood||""))throw new HttpError(403,"A entrega não foi aprovada para este telefone e endereço. Faça uma nova consulta.");
  try{confirmedFee=approvedDeliveryFee(check,data);}catch(e){throw new HttpError(409,e instanceof Error?e.message:"Consulte a entrega novamente.");}
 }
 let summary;try{summary=calculateOrder({...data,deliveryFee:confirmedFee},input);}catch(e){throw new HttpError(400,e instanceof Error?e.message:"Confira o pedido.");}
 const changed=input.expectedTotal!==undefined?input.expectedTotal!==summary.total:(data.promotions||[]).some(p=>p.enabled)||input.method==="delivery"&&requireDeliveryApproval&&deliveryApprovalEnabled()&&(confirmedFee!==data.deliveryFee||!!input.neighborhood);
 return {summary,changed};
}
