import {z} from "zod";
import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {restaurantSchema,phoneNumber} from "@/lib/domain";
import {ownedRestaurant,sameOrigin,safeRecord,errorResponse,HttpError} from "@/lib/server";
import {assertPublishEntitlement} from "@/lib/billing";
import {readJson} from "@/lib/http";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
  sameOrigin(request);const {id}=await params;const row=await ownedRestaurant(id);
  const input=z.object({revision:z.number().int().positive(),published:z.boolean()}).parse(await readJson(request));
  if(row.revision!==input.revision)throw new HttpError(409,"Salve ou recarregue as últimas alterações antes de publicar.");
  if(input.published){await assertPublishEntitlement(row.ownerId,id);const data=restaurantSchema.parse(JSON.parse(row.data));const phone=phoneNumber(data.whatsapp);if(phone.length<12||phone.length>15)throw new HttpError(400,"Cadastre o WhatsApp da pizzaria com DDD antes de publicar.");if(!data.deliveryEnabled&&!data.pickupEnabled)throw new HttpError(400,"Habilite entrega ou retirada antes de publicar.");if(data.pickupEnabled&&!data.address)throw new HttpError(400,"Informe o endereço para retirada antes de publicar.");if(!data.products.some(p=>p.enabled&&(p.kind==="pizza"?Object.values(p.sizes).some(v=>v>0):p.price>0)))throw new HttpError(400,"Cadastre pelo menos um produto disponível com preço antes de publicar.");}
  const updated=await getDb().update(restaurants).set({published:input.published,publishedData:input.published?row.data:row.publishedData,liveRevision:input.published?row.revision:row.liveRevision,updatedAt:new Date().toISOString()}).where(and(eq(restaurants.id,id),eq(restaurants.ownerId,row.ownerId),eq(restaurants.revision,input.revision))).returning().get();
  if(!updated)throw new HttpError(409,"O cardápio mudou durante a publicação. Tente novamente.");return Response.json({restaurant:safeRecord(updated),url:`/p/${row.slug}`});
}catch(e){return errorResponse(e);}}
