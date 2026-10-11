import {env} from "cloudflare:workers";
import {deliveryCheckEnabled} from "./delivery-policy";
export function deliveryApprovalEnabled(){
 return deliveryCheckEnabled((env as typeof env&{PEDIDO_DELIVERY_APPROVAL_ENABLED?:string}).PEDIDO_DELIVERY_APPROVAL_ENABLED);
}
