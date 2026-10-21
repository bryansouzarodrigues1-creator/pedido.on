import {sameOrigin,readJson,errorResponse,privateHeaders,throttle} from "@/lib/http";
import {assertCsrf} from "@/lib/csrf";
import {restaurantWhatsApp,restaurantWhatsAppAvailable} from "@/lib/restaurant-whatsapp";
import {z} from "zod";
import {sha256} from "@/lib/auth-policy";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{
 sameOrigin(request);assertCsrf(request);const data=z.object({whatsapp:z.string().max(30)}).strict().parse(await readJson(request));
 await throttle("phone-check:"+await sha256(request.headers.get("cf-connecting-ip")||"unknown"),180,3600);
 const phone=restaurantWhatsApp(data.whatsapp);return Response.json({available:await restaurantWhatsAppAvailable(phone)},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
