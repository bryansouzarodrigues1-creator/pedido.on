import {getAccountUser,assertCsrf} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {imageConfig} from "@/lib/ai-images";
import {studioConfig} from "@/lib/studio";
import {requestAiProvider} from "@/lib/ai-provider";
import {sameOrigin,throttle,errorResponse,HttpError,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
/**
 * Read-only in cost terms: an intentionally INVALID UUID is rejected by each
 * Lovable handler before claim, before gateway invocation and before billing.
 * This tests actual POST reachability, unlike a GET-only health check.
 * Restricted to platform administrators; never expose provider bodies or keys.
 */
export async function POST(request:Request){
 try{
  sameOrigin(request);
  assertCsrf(request);
  const user=await getAccountUser();
  if(!user||!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");
  await throttle("platform-ai-protocol:"+user.userId,3,300);
  const targets=[{name:"studio",...studioConfig()},{name:"images",...imageConfig()}];
  const checks=await Promise.all(targets.map(async target=>{
   if(!target.enabled)return {name:target.name,connected:false,status:0,reason:"disabled"};
   try{
    const response=await requestAiProvider(target.endpoint,{jobId:"diagnostic-invalid-id",token:"0".repeat(64)},12000);
    const status=response.status;await response.body?.cancel().catch(()=>{});
    return {name:target.name,connected:status===400,status,reason:status===400?"post_reached_validation":status===404?"endpoint_not_found":status===403?"service_rejected_request":status===503?"provider_not_configured":status>=500?"provider_internal_error":status===200?"unexpected_success_no_claim":"unexpected_response"};
   }catch{return {name:target.name,connected:false,status:0,reason:"network_failure"};}
  }));
  return Response.json({checks},{headers:privateHeaders});
 }catch(error){return errorResponse(error);}
}
