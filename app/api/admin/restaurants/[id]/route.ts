import {ownerAssistantOverview,assistantConversationTurns} from "@/lib/customer-assistant";
import {safetyAdministrator} from "@/lib/store-safety-admin";
import {assertCsrf} from "@/lib/auth";
import {sameOrigin,privateHeaders,errorResponse,readJson,throttle} from "@/lib/http";
import {adminRestaurantWorkspace,supportRestaurant,readSupportBody,saveSupportItem,supportState} from "@/lib/restaurant-support";
import {supportDecision} from "@/lib/restaurant-support-policy";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){try{await safetyAdministrator();const {id}=await params,query=new URL(request.url).searchParams;if(query.get("section")==="assistant"){const row=await supportRestaurant(id),conversation=query.get("conversation");return Response.json(conversation?{turns:await assistantConversationTurns(id,conversation)}:await ownerAssistantOverview(id,row.ownerId),{headers:privateHeaders});}return Response.json(await adminRestaurantWorkspace(id,query.get("cursor")),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);assertCsrf(request);const user=await safetyAdministrator();await throttle("admin-restaurant-support:"+user.userId,100,86400);const {id}=await params,row=await supportRestaurant(id),{input,file}=await readSupportBody(request);return Response.json(await saveSupportItem(row,user.userId,"admin",input,file),{status:201,headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function PATCH(request:Request,{params}:Context){try{sameOrigin(request);assertCsrf(request);const user=await safetyAdministrator();await throttle("admin-support-state:"+user.userId,100,3600);const {id}=await params;await supportRestaurant(id);await supportState(id,user.userId,true,supportDecision.parse(await readJson(request,1000)));return Response.json({ok:true},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
