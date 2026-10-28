import {publicAssistant,visitorHistory,answerCustomer} from "@/lib/customer-assistant";
import {customerAssistantInput} from "@/lib/customer-assistant-policy";
import {sameOrigin,readJson,errorResponse,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
type Context={params:Promise<{slug:string}>};
export async function GET(request:Request,{params}:Context){try{const shop=await publicAssistant((await params).slug),id=request.headers.get("x-assistant-conversation"),token=request.headers.get("x-assistant-token");return Response.json({name:shop.data.assistant.name,greeting:shop.data.assistant.greeting,turns:id&&token?await visitorHistory(shop.row.id,id,token):[]},{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);const shop=await publicAssistant((await params).slug),input=customerAssistantInput.parse(await readJson(request,6000));return Response.json(await answerCustomer(request,shop,input),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
