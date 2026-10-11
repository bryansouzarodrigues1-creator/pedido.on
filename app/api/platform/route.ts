import {billingConfig,billingPlans} from "@/lib/billing";
import {imageConfig} from "@/lib/ai-images";
import {studioConfig} from "@/lib/studio";
import {requestAiProvider} from "@/lib/ai-provider";
import {throttle,errorResponse,readBytes} from "@/lib/http";
import {sha256} from "@/lib/auth-policy";
import {providerFailure} from "@/lib/provider-diagnostics";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(new URL(request.url).searchParams.get("check")!=="ai")return Response.json({billingEnabled:billingConfig().enabled,plans:billingPlans},{headers:{"Cache-Control":"no-store"}});
 try{
  await throttle("ai-health:"+await sha256(request.headers.get("cf-connecting-ip")||"anonymous"),6,60);
  const checks=await Promise.all(([studioConfig(),imageConfig()] as const).map(async(config)=>{
   if(!config.enabled)return {enabled:false,connected:false};
   try{const r=await requestAiProvider(config.endpoint);if(!r.ok||!r.headers.get("content-type")?.startsWith("application/json"))return {enabled:true,connected:false};const bytes=await readBytes(new Request("https://ai-health.invalid",{method:"POST",body:r.body,duplex:"half"} as RequestInit),4096),value=JSON.parse(new TextDecoder().decode(bytes)) as {configured?:boolean};return {enabled:true,connected:value.configured===true};}
   catch(error){console.error("[pedido.on] AI connection check",providerFailure(error,[]));return {enabled:true,connected:false};}
  }));
  return Response.json({studio:checks[0],images:checks[1]},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return errorResponse(error);}
}
