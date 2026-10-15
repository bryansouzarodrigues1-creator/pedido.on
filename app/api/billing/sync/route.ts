import {owner} from "@/lib/server";
import {sameOrigin,errorResponse,privateHeaders,throttle} from "@/lib/http";
import {syncAsaasAccount} from "@/lib/asaas-billing";
import {assertCsrf} from "@/lib/auth";
export async function POST(request:Request){try{sameOrigin(request);assertCsrf(request);const user=await owner();await throttle("billing-sync:"+user.userId,8,300);return Response.json(await syncAsaasAccount(user),{headers:privateHeaders});}catch(error){return errorResponse(error);}}
