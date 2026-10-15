import {env} from "cloudflare:workers";
import {ownedRestaurant} from "@/lib/server";
import {privateHeaders,errorResponse,HttpError} from "@/lib/http";
import {restaurantSchema} from "@/lib/domain";
import {promotionArt} from "@/lib/promotion-art";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params,row=await ownedRestaurant(id),promotionId=new URL(request.url).searchParams.get("promotionId");
 const images=(await env.DB!.prepare("SELECT id,result_url AS url,promotion_id AS promotionId,source_version AS version FROM image_jobs WHERE owner_id=? AND restaurant_id=? AND asset='promotion' AND state='completed' ORDER BY created_at DESC,id DESC LIMIT 12").bind(row.ownerId,id).all()).results;
 if(!promotionId)return Response.json({images},{headers:privateHeaders});
 if(!row.published||!row.publishedData)throw new HttpError(409,"Publique o cardápio antes de divulgar a promoção.");
 const data=restaurantSchema.parse(JSON.parse(row.publishedData)),promotion=data.promotions.find(item=>item.id===promotionId);
 if(!promotion)throw new HttpError(409,"Publique a promoção antes de criar a divulgação.");
 let art;try{art=promotionArt(data,promotion,row.slug);}catch(e){throw new HttpError(409,e instanceof Error?e.message:"Confira a promoção.");}
 return Response.json({art,images},{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
