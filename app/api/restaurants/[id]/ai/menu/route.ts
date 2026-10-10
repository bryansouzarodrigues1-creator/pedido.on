import {z} from "zod";
import {owner,ownedRestaurant} from "@/lib/server";
import {sameOrigin,readJson,errorResponse,privateHeaders} from "@/lib/http";
import {importWithAi,aiAllowance} from "@/lib/ai";
import {validMenuImage} from "@/lib/ai-policy";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const user=await owner(),{id}=await params;await ownedRestaurant(id,user.userId);return Response.json(await aiAllowance(user.userId),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{
 sameOrigin(request);const user=await owner(),{id}=await params;await ownedRestaurant(id,user.userId);
 const input=z.object({requestId:z.string().uuid(),text:z.string().trim().max(12000),image:z.string().max(4200000).refine(validMenuImage,"Envie uma foto PNG, JPG ou WebP com até 3 MB.").optional()}).refine(v=>v.text.length>=10||!!v.image,"Envie os produtos e preços ou uma foto do cardápio.").parse(await readJson(request,4250000));
 return Response.json(await importWithAi(user.userId,id,input),{headers:privateHeaders});
}catch(e){return errorResponse(e);}}
