import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {getAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {bucket,errorResponse,HttpError} from "@/lib/server";
import type {RestaurantData} from "@/lib/domain";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string;asset:string}>}){try{
  const {id,asset}=await params;if(!/^[a-zA-Z0-9-]+$/.test(id)||! /^[a-zA-Z0-9.-]+$/.test(asset))throw new HttpError(404,"Imagem não encontrada.");
  const row=await getDb().select().from(restaurants).where(eq(restaurants.id,id)).get();if(!row)throw new HttpError(404,"Imagem não encontrada.");
  const user=await getAccountUser(),path=`/media/${id}/${asset}`;
  if(user?.userId!==row.ownerId&&!(user&&platformAdmin(user))){if(!row.published||!row.publishedData)throw new HttpError(404,"Imagem não encontrada.");const d=JSON.parse(row.publishedData) as RestaurantData;if(![d.logo,d.cover,...d.products.map(p=>p.image)].includes(path))throw new HttpError(404,"Imagem não encontrada.");}
  const object=await bucket().get(`${id}/${asset}`);if(!object)throw new HttpError(404,"Imagem não encontrada.");const headers=new Headers();object.writeHttpMetadata(headers);headers.set("X-Content-Type-Options","nosniff");headers.set("Cache-Control","private, max-age=3600");return new Response(object.body,{headers});
}catch(e){return errorResponse(e);}}
