import {ownedRestaurant,owner} from "@/lib/server";
import {assertCsrf} from "@/lib/auth";
import {sameOrigin,privateHeaders,errorResponse,readJson,throttle} from "@/lib/http";
import {readSupport,supportState} from "@/lib/restaurant-support";
import {supportDecision} from "@/lib/restaurant-support-policy";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const {id}=await params;await ownedRestaurant(id);return Response.json({items:await readSupport(id)},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function PATCH(request:Request,{params}:Context){try{sameOrigin(request);assertCsrf(request);const user=await owner(),{id}=await params;await ownedRestaurant(id,user.userId);await throttle("owner-support-state:"+user.userId,100,3600);await supportState(id,user.userId,false,supportDecision.parse(await readJson(request,1000)));return Response.json({ok:true},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
