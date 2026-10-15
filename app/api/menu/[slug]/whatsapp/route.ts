import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {orderInputSchema,whatsappCheckoutUrl,type RestaurantData} from "@/lib/domain";
import {sameOrigin,errorResponse,HttpError} from "@/lib/server";
import {canServeMenu} from "@/lib/billing";
import {checkoutQuote} from "@/lib/checkout-quote";
import {readJson,privateHeaders,throttle} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {authConfig} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){try{
 sameOrigin(request);
 await throttle("whatsapp-quote:"+await sha256(authConfig().seal+":"+(request.headers.get("cf-connecting-ip")||"anonymous")),30,600);
 const {slug}=await params,row=await getDb().select().from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();
 if(!row?.publishedData||!await canServeMenu(row.ownerId,row.id))throw new HttpError(404,"Cardápio indisponível.");
 const data=JSON.parse(row.publishedData) as RestaurantData,input=orderInputSchema.parse(await readJson(request,30000));
 const {summary,changed}=await checkoutQuote(row.id,data,input);
 if(changed)return Response.json({error:"O valor foi atualizado. Confira o novo total antes de confirmar.",quote:summary},{status:409,headers:privateHeaders});
 const whatsappUrl=whatsappCheckoutUrl(data,summary);
 if(!whatsappUrl)throw new HttpError(400,"O WhatsApp da pizzaria não está disponível. Finalize pelo site.");
 // A draft conversation is not an order, a payment, or a notification to the merchant.
 return Response.json({whatsappUrl,total:summary.total},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
