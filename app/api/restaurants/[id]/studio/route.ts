import {ownedRestaurant,assertMedia} from "@/lib/server";
import {sameOrigin,readJson,errorResponse,privateHeaders,HttpError} from "@/lib/http";
import {studioInput} from "@/lib/studio-policy";
import {studioAllowance,runStudio} from "@/lib/studio";
import {assistantAnswer} from "@/lib/assistant-help";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const {id}=await params,row=await ownedRestaurant(id);return Response.json(await studioAllowance(row.ownerId),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);const {id}=await params,row=await ownedRestaurant(id),input=studioInput.parse(await readJson(request,300000));const guide=assistantAnswer(input.message);if(guide?.kind==="guide")throw new HttpError(422,"Use a ajuda local do Estúdio. Para importar, abra o leitor do cardápio e envie prints ou texto com preços. Nenhuma sugestão de IA foi usada.");assertMedia(input.snapshot,id);if(input.productId&&!input.snapshot.products.some(p=>p.id===input.productId))throw new HttpError(400,"Escolha um produto deste cardápio.");return Response.json(await runStudio(row.ownerId,id,input),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
