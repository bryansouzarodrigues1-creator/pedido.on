import {z} from "zod";
import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {restaurantSchema} from "@/lib/domain";
import {ownedRestaurant,sameOrigin,safeRecord,errorResponse,HttpError,assertMedia} from "@/lib/server";
import {readJson} from "@/lib/http";
export const dynamic="force-dynamic";
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){try{
  sameOrigin(request);const {id}=await params;const row=await ownedRestaurant(id);
  const input=z.object({revision:z.number().int().positive(),data:restaurantSchema}).parse(await readJson(request,300000));assertMedia(input.data,id);
  const updated=await getDb().update(restaurants).set({name:input.data.name,data:JSON.stringify(input.data),revision:row.revision+1,updatedAt:new Date().toISOString()}).where(and(eq(restaurants.id,id),eq(restaurants.ownerId,row.ownerId),eq(restaurants.revision,input.revision))).returning().get();
  if(!updated)throw new HttpError(409,"O cardápio foi alterado em outra aba. Recarregue antes de salvar para evitar perder mudanças.");
  return Response.json({restaurant:safeRecord(updated)});
}catch(e){return errorResponse(e);}}
