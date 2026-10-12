import {z} from "zod";
export const DELIVERY_SECONDS=2*60*60;
export const deliveryCheckRequest=z.object({
 requestId:z.string().uuid(),
 token:z.string().regex(/^[a-f0-9]{64}$/),
 phone:z.string().trim().min(10).max(25).regex(/^[\d\s()+.-]+$/),
 address:z.string().trim().min(8).max(300),
 neighborhood:z.string().trim().max(70).optional(),
 latitude:z.number().finite().min(-90).max(90).optional(),
 longitude:z.number().finite().min(-180).max(180).optional(),
}).strict().refine(x=>(x.latitude===undefined)===(x.longitude===undefined),"Informe latitude e longitude juntas.");
export const deliveryDecision=z.object({id:z.string().uuid(),version:z.number().int().positive(),action:z.enum(["approve","reject"]),deliveryFee:z.number().int().min(0).max(100000).optional()}).strict();
export const deliveryAccess=z.object({deliveryCheckId:z.string().uuid().optional(),deliveryCheckToken:z.string().regex(/^[a-f0-9]{64}$/).optional()});
export function deliveryCheckEnabled(value?:string){return value==="true";}
export function normalizedDeliveryPhone(phone:string){
 const digits=phone.replace(/\D/g,"");
 return digits.length===11||digits.length===10?"55"+digits:digits;
}
export function sameDeliveryContact(a:{phone:string;address:string},b:{phone:string;address:string}){
 return normalizedDeliveryPhone(a.phone)===normalizedDeliveryPhone(b.phone)
  && a.address.trim().replace(/\s+/g," ").toLocaleLowerCase("pt-BR")===b.address.trim().replace(/\s+/g," ").toLocaleLowerCase("pt-BR");
}
export function canUseDeliveryCheck(check:{status:string;expiresAt:number}|null|undefined,now=Math.floor(Date.now()/1000)){
 return !!check&&check.status==="approved"&&check.expiresAt>now;
}
