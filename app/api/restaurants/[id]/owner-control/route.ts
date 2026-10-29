import {ownedRestaurant,assertMedia} from "@/lib/server";
import {assertCsrf} from "@/lib/auth";
import {hasCustomerAssistant as hasProAccess} from "@/lib/customer-assistant";
import {HttpError,sameOrigin,readJson,privateHeaders,errorResponse,throttle} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {ownerControlInput,resolveOwnerCommand,ownerPreview} from "@/lib/owner-control-policy";
import {studioAllowance,runStudio} from "@/lib/studio";
import {studioInput,proposalPatch} from "@/lib/studio-policy";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{
 const row=await ownedRestaurant((await params).id),allowed=await hasProAccess(row.ownerId);
 return Response.json({allowed,aiReady:allowed&&(await studioAllowance(row.ownerId)).enabled},{headers:privateHeaders});
}catch(error){return errorResponse(error);}}
export async function POST(request:Request,{params}:Context){try{
 sameOrigin(request);assertCsrf(request);const row=await ownedRestaurant((await params).id);
 if(!await hasProAccess(row.ownerId))throw new HttpError(403,"O assistente do dono é um benefício do Pro ativo. Você pode continuar usando o editor manual.");
 const input=ownerControlInput.parse(await readJson(request,300000));assertMedia(input.snapshot,row.id);
 await throttle("owner-control:"+await sha256(row.ownerId),60,300);
 let result;try{result=resolveOwnerCommand(input);}catch{throw new HttpError(422,"Confira os valores e os produtos. Nenhuma mudança foi aplicada.");}
 if(result.patch)assertMedia({...input.snapshot,...result.patch},row.id);
 if(result.status!=="creative"||input.mode!=="ai")return Response.json(result,{headers:privateHeaders});
 // Reuse the published editorial model contract. It cannot set prices, payments or orders.
 const chosen=result.form?.selection.productId,prepared=studioInput.parse({requestId:input.requestId,mode:"ai",message:input.message,snapshot:input.snapshot,...(chosen?{productId:chosen}:{}),history:[]});
 const answer=await runStudio(row.ownerId,row.id,prepared),patch=proposalPatch(answer.proposal,input.snapshot);
 const preview=ownerPreview(input.snapshot,patch,"A IA preparou esta sugestão de visual e textos. Confira as mudanças abaixo antes de usar no rascunho.","ai");
 return Response.json(preview,{headers:privateHeaders});
}catch(error){return errorResponse(error);}}
