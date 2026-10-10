import {ownedRestaurant} from "@/lib/server";
import {sameOrigin,readJson,errorResponse,privateHeaders} from "@/lib/http";
import {imageInput} from "@/lib/image-policy";
import {generateImage,imageAllowance} from "@/lib/ai-images";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const {id}=await params,row=await ownedRestaurant(id);return Response.json(await imageAllowance(row.ownerId),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);const {id}=await params,row=await ownedRestaurant(id),input=imageInput.parse(await readJson(request,4096)),data=JSON.parse(row.data) as {name:string};return Response.json(await generateImage(row.ownerId,id,data.name,input),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
