import {env} from "cloudflare:workers";
import {HttpError} from "./http-policy.ts";
import {normalizeBrazilWhatsApp} from "./support-whatsapp.ts";
export function restaurantWhatsApp(value:string){if(!value.trim())return "";const phone=normalizeBrazilWhatsApp(value);if(!phone)throw new HttpError(400,"Informe um WhatsApp brasileiro com DDD.");return phone;}
export async function restaurantWhatsAppAvailable(phone:string,exceptId=""){
 if(!phone)return true;
 const row=await env.DB!.prepare("SELECT id FROM restaurant_whatsapp_registry WHERE phone = ? AND id <> ? LIMIT 1").bind(phone,exceptId).first();return !row;
}
