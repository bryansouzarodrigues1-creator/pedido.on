import {ownedRestaurant} from "@/lib/server";
import {sameOrigin,readJson,errorResponse,privateHeaders} from "@/lib/http";
import {imageInput} from "@/lib/image-policy";
import {restaurantSchema} from "@/lib/domain";
import {studioConfig} from "@/lib/studio";
import {HttpError} from "@/lib/http";
import {generateImage,imageAllowance} from "@/lib/ai-images";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const {id}=await params,row=await ownedRestaurant(id);return Response.json(await imageAllowance(row.ownerId),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);const {id}=await params,row=await ownedRestaurant(id),input=imageInput.parse(await readJson(request,4096)),data=restaurantSchema.parse(JSON.parse(row.data));const product=input.asset==="product"?data.products.find(p=>p.id===input.productId):undefined;if(input.asset==="product"&&!product)throw new HttpError(400,"Escolha um produto desta pizzaria.");if(input.asset==="product"&&!studioConfig().enabled)throw new HttpError(503,"As fotos de produtos aguardam a ativação da IA do estúdio.");return Response.json(await generateImage(row.ownerId,id,data.name,input,product),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
