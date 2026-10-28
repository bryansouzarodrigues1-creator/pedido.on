import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {restaurantSchema,slugSchema} from "@/lib/domain";
import {hasCustomerAssistant} from "@/lib/customer-assistant";
import {canServeMenu} from "@/lib/billing";
import {deliveryApprovalEnabled} from "@/lib/delivery-config";
import {storeVerification} from "@/lib/store-verification";
import {errorResponse,HttpError,privateHeaders} from "@/lib/http";
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){try{
 const {slug}=await params;slugSchema.parse(slug);
 const row=await getDb().select().from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();
 if(!row?.publishedData||!await canServeMenu(row.ownerId,row.id))throw new HttpError(404,"Cardápio não encontrado.");
 const data=restaurantSchema.parse(JSON.parse(row.publishedData)),{siteOrderingAllowed}=await storeVerification(row);
 return Response.json({data:{...data,pix:{...data.pix,enabled:siteOrderingAllowed&&!!data.pix?.enabled,key:"",recipient:""}},assistantAvailable:data.assistant.enabled&&await hasCustomerAssistant(row.ownerId),siteOrderingAllowed,approvalRequired:siteOrderingAllowed&&deliveryApprovalEnabled()},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
